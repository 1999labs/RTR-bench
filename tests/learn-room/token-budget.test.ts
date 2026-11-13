import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {packageRoot} from '../../src/shared/dataset.ts';
import {uniform} from '../../src/shared/distribution.ts';
import {requestCompletion} from '../../src/shared/model-client.ts';
import {runLearnRoom} from '../../src/tracks/learn-room/run.ts';
import {buildLearnRoomReport} from '../../src/tracks/learn-room/report.ts';
import {SpendingLimitError,type SpendingPolicy} from '../../src/shared/spending.ts';

const temp=(t:any)=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-tokens-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;};
const fixture=path.join(packageRoot(),'tests/fixtures/learn-room-four-strategies.json');
const mockKey=(t:any)=>{const old=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='mock-only';t.after(()=>{if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old;});};

test('CLI output allowance reaches every strategy and agent turn, has a distinct identity, and resumes',async t=>{
  const output=temp(t);
  const baseline=await runLearnRoom({fixture,strategy:'all',limit:1,output});
  const explicit=await runLearnRoom({fixture,strategy:'all',limit:1,maxTokens:2000,output});
  assert.equal(baseline.dir,explicit.dir);
  execFileSync(process.execPath,['src/cli.ts','learn-room','--fixture',fixture,'--strategy','all','--limit','1','--output',output,'--max-tokens','4000'],{cwd:packageRoot(),stdio:'pipe'});
  const dir=fs.readdirSync(output).map(n=>path.join(output,n)).find(p=>p!==baseline.dir)!;
  const report=buildLearnRoomReport(dir);
  assert.equal(report.manifest.config.settings.maxTokens,4000);
  assert.equal(report.complete,true);
  for(const row of report.rows){
    assert.equal(row.request.max_tokens,4000);
    for(const call of row.agentCalls)assert.equal(call.request.max_tokens,4000);
  }
  const before=fs.readFileSync(path.join(dir,'episodes/agent/100.json'),'utf8');
  const resumed=await runLearnRoom({fixture,strategy:'all',limit:1,maxTokens:4000,output},async()=>{throw new Error('No network allowed');});
  assert.equal(resumed.dir,dir);
  assert.equal(fs.readFileSync(path.join(dir,'episodes/agent/100.json'),'utf8'),before);
  for(const maxTokens of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
    await assert.rejects(runLearnRoom({fixture,limit:1,maxTokens,output}),/max-tokens/);
  }
});

test('recorded length-stop response is not rerolled; an agent can recover on its next bounded turn',async t=>{
  mockKey(t);
  const output=temp(t),prediction=JSON.stringify(uniform());
  let responses=0;
  const client=(request:any)=>requestCompletion(request,'mock',async(_url,init)=>{
    const body=JSON.parse(String(init?.body));assert.equal(body.max_tokens,4000);
    responses++;
    return new Response(JSON.stringify({provider:'Mock',choices:[{finish_reason:'length',message:{role:'assistant',content:null}}],usage:{completion_tokens:4000,cost:.001}}),{status:200});
  });
  const options={model:'mock/model',strategy:'none' as const,limit:1,maxTokens:4000,output};
  const first=await runLearnRoom(options,client);
  assert.equal(first.report.summaries[0].missing,1);
  assert.equal(first.report.summaries[0].score,0);
  await runLearnRoom(options,client);assert.equal(responses,1);
  let turns=0;
  const agent=await runLearnRoom({...options,strategy:'agent'},request=>{
    if(turns++===0)return client(request);
    assert.equal(request.max_tokens,4000);
    return requestCompletion(request,'mock',async()=>new Response(JSON.stringify({provider:'Mock',choices:[{finish_reason:'stop',message:{role:'assistant',content:`{"type":"submit_prediction","prediction":${prediction}}`}}],usage:{completion_tokens:50,cost:.0001}}),{status:200}));
  });
  assert.equal(turns,2);assert.equal(agent.report.summaries[0].valid,1);
  assert.equal(agent.report.summaries[0].rejectedActions,1);
  assert.equal(agent.report.rows[0].agentCalls[0].attempts.length,1);
  assert.deepEqual(buildLearnRoomReport(agent.dir),agent.report);
});

test('larger output allowance increases reservations and blocks dispatch when the cap is insufficient',async t=>{
  mockKey(t);
  const output=temp(t),spending:SpendingPolicy={version:'reserved-context-v1',limitUsd:.0204,providerTag:'mock/endpoint',contextTokens:262000,inputUsdPerToken:.000000075,outputUsdPerToken:.00000025};
  let calls=0;
  const client=async()=>{calls++;return {status:'response' as const,finishedAt:new Date().toISOString(),raw:JSON.stringify(uniform()),response:{},provider:'Mock',usage:null,error:null,retriable:false};};
  const options={model:'mock/model',provider:'Mock',strategy:'none' as const,limit:1,spending,output};
  const baseline=await runLearnRoom(options,client);
  assert.equal(calls,1);
  const ledger=JSON.parse(fs.readFileSync(path.join(baseline.dir,'spending.json'),'utf8'));
  assert.equal(ledger.entries[0].reservedUnits,20150000);
  await assert.rejects(runLearnRoom({...options,maxTokens:4000},client),SpendingLimitError);
  assert.equal(calls,1);
  const larger=await runLearnRoom({...options,maxTokens:4000,spending:{...spending,limitUsd:.021}},client);
  const updated=JSON.parse(fs.readFileSync(path.join(larger.dir,'spending.json'),'utf8'));
  assert.equal(updated.entries[0].reservedUnits,20650000);
  assert.equal(updated.entries[0].chargedUnits,null);
});
