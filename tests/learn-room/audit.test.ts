import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {digest,loadDistributionData} from '../../src/shared/dataset.ts';
import {requestCompletion,isSetupFailure,RunSetupError,type Request} from '../../src/shared/model-client.ts';
import {openSpendingLedger,spendingProvider,SpendingLimitError,type SpendingPolicy} from '../../src/shared/spending.ts';
import {readJson,writeJson} from '../../src/shared/run-records.ts';
import {runLearnRoom,prepareEpisode,type RoomManifest,type EpisodeRecord} from '../../src/tracks/learn-room/run.ts';
import {buildLearnRoomReport} from '../../src/tracks/learn-room/report.ts';
import {agentRequest,applyAgentCall} from '../../src/tracks/learn-room/agent.ts';

const prediction={'performed+uniting':.1,'honest+uniting':.2,'performed+dividing':.3,'honest+dividing':.4};
const raw=JSON.stringify(prediction);
const response=(content=raw)=>({status:'response' as const,finishedAt:'2026-11-14T00:00:00Z',raw:content,response:{},provider:'Mock',usage:{cost:.001},error:null,retriable:false});
const policy:SpendingPolicy={version:'reserved-context-v1',limitUsd:1,providerTag:'mock/endpoint',contextTokens:10000,inputUsdPerToken:1e-6,outputUsdPerToken:1e-6};
const request:Request={model:'mock/model',messages:[],temperature:0,max_tokens:4000,usage:{include:true},provider:spendingProvider(policy)};
const temp=(t:any)=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-audit-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;};
const mockKey=(t:any)=>{const old=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='mock-only';t.after(()=>{if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old;});};
const never=async()=>{throw new Error('No inference expected');};

test('identical budgeted commands resume frozen pricing even when the catalog changes or is unavailable',async t=>{
  mockKey(t);let calls=0,catalogCalls=0,price='0.000001';
  t.mock.method(globalThis,'fetch',async()=>{
    catalogCalls++;
    return new Response(JSON.stringify({data:{endpoints:[{tag:'mock/endpoint',provider_name:'Mock',status:0,context_length:10000,pricing:{prompt:price,completion:'0.000001'},supported_parameters:['max_tokens','temperature']}]}}));
  });
  const options={model:'mock/price',provider:'Mock',maxUsd:1,strategy:'none' as const,limit:2,output:temp(t)};
  await assert.rejects(runLearnRoom(options,async()=>{if(++calls===2)throw new Error('Interruption');return response();}),/Interruption/);
  price='0.000002';
  const resumed=await runLearnRoom(options,async()=>{calls++;return response();});
  assert.equal(calls,3);assert.equal(catalogCalls,1);assert.equal(resumed.report.complete,true);
  assert.equal(resumed.report.manifest.config.spending!.inputUsdPerToken,1e-6);
  t.mock.method(globalThis,'fetch',never);
  assert.equal((await runLearnRoom(options,never)).dir,resumed.dir);
  assert.equal(fs.readdirSync(options.output).length,1);
  await assert.rejects(runLearnRoom({...options,maxUsd:NaN},never),/max-usd/);
});

test('older completed runs are reused; older incomplete runs cannot silently become fresh paid runs',async t=>{
  mockKey(t);const output=temp(t),options={model:'mock/old',provider:'Mock',strategy:'none' as const,limit:1,output};
  const result=await runLearnRoom({...options,spending:policy},async()=>response());
  const manifest=readJson<RoomManifest>(path.join(result.dir,'manifest.json'));
  manifest.config.version='learn-room-runner-v3';manifest.id=digest(JSON.stringify(manifest.config));
  const rec=readJson<EpisodeRecord>(path.join(result.dir,'episodes/none/100.json'));
  delete rec.request.provider!.require_parameters;
  writeJson(path.join(result.dir,'episodes/none/100.json'),rec);
  writeJson(path.join(result.dir,'manifest.json'),manifest);
  const oldDir=path.join(output,`mock-old-${manifest.id.slice(0,16)}`);fs.renameSync(result.dir,oldDir);
  t.mock.method(globalThis,'fetch',never);
  assert.equal((await runLearnRoom({...options,maxUsd:1},never)).dir,oldDir);
  manifest.status='incomplete';writeJson(path.join(oldDir,'manifest.json'),manifest);
  await assert.rejects(runLearnRoom({...options,maxUsd:1},never),/older runner/);
  assert.equal(fs.readdirSync(output).length,1);
});

test('API setup errors stop at the first affected target and resume within the original attempt budget',async t=>{
  mockKey(t);
  for(const strategy of ['none','random','similar','agent'] as const) {
    const options={model:'mock/auth',provider:'Mock',strategy,limit:2,output:temp(t)};
    let calls=0;
    await assert.rejects(runLearnRoom(options,async()=>{
      calls++;return {status:'error' as const,httpStatus:401,raw:'',response:{error:{code:401}},provider:null,usage:{cost:0},error:'Invalid key',retriable:false};
    }),RunSetupError);
    assert.equal(calls,1);
    const dir=path.join(options.output,fs.readdirSync(options.output)[0]);
    const pending=buildLearnRoomReport(dir);
    assert.equal(pending.complete,false);assert.equal(pending.summaries[0].score,null);assert.equal(pending.summaries[0].pending,2);
    assert.match(pending.manifest.stopReason!,/API setup/);
    const resumed=await runLearnRoom(options,async()=>{calls++;return response(strategy==='agent'?JSON.stringify({type:'submit_prediction',prediction}):raw);});
    assert.equal(calls,3);assert.equal(resumed.report.complete,true);assert.equal(resumed.report.summaries[0].valid,2);
    assert.equal(resumed.report.summaries[0].apiCalls,3);assert.equal(resumed.report.manifest.stopReason,undefined);
  }
});

test('repeated setup failures stay pending at three attempts instead of producing a zero-score result',async t=>{
  mockKey(t);const options={model:'mock/auth-exhausted',strategy:'agent' as const,limit:1,output:temp(t)};
  let calls=0;const client=async()=>{calls++;return {status:'error' as const,httpStatus:402,raw:'',response:{error:{code:402}},provider:null,usage:null,error:'Insufficient credits',retriable:false};};
  for(let i=0;i<4;i++)await assert.rejects(runLearnRoom(options,client),RunSetupError);
  assert.equal(calls,3);
  const report=buildLearnRoomReport(path.join(options.output,fs.readdirSync(options.output)[0]));
  assert.equal(report.summaries[0].pending,1);assert.equal(report.summaries[0].score,null);
});

test('HTTP 200 error envelopes and typed errors receive the right retry/setup policy',async()=>{
  for(const code of [429,500,502,503,504]) {
    const attempt=await requestCompletion(request,'mock',async()=>new Response(JSON.stringify({error:{code,message:'Unavailable'}})));
    assert.equal(attempt.status,'error');assert.equal(attempt.httpStatus,200);assert.equal(attempt.retriable,true);
  }
  for(const type of ['refusal','content_policy_violation','max_tokens_exceeded']) {
    const attempt=await requestCompletion(request,'mock',async()=>new Response(JSON.stringify({error:{code:400,metadata:{error_type:type}}})));
    assert.equal(attempt.retriable,false);assert.equal(isSetupFailure(attempt),false);
  }
  const permission=await requestCompletion(request,'mock',async()=>new Response(JSON.stringify({error:{code:403,metadata:{error_type:'permission_denied'}}})));
  assert.equal(isSetupFailure(permission),true);
  const busy=await requestCompletion(request,'mock',async()=>new Response(JSON.stringify({error:{code:400,metadata:{error_type:'provider_overloaded'}}})));
  assert.equal(busy.retriable,true);assert.equal(isSetupFailure(busy),false);
});

test('overcharge stops persist after reopening, and orphan reservations cannot be silently reused',t=>{
  const file=path.join(temp(t),'ledger.json'),ledger=openSpendingLedger(file,policy);
  const index=ledger.reserve(request,'none/100/0/1');
  assert.throws(()=>ledger.settle(index,{cost:.1}),SpendingLimitError);
  assert.throws(()=>openSpendingLedger(file,policy).reserve(request),/saved provider charge/);
  const orphan=openSpendingLedger(path.join(temp(t),'ledger.json'),policy);
  orphan.reserve(request,'none/100/0/1');
  assert.throws(()=>orphan.reserve(request,'none/100/0/1'),/no matching attempt/);
});

test('saved responses settle outstanding reservations without another model call; missing ledgers fail closed',async t=>{
  mockKey(t);
  for(const strategy of ['none','agent'] as const) {
    const options={model:'mock/crash',provider:'Mock',spending:policy,strategy,limit:1,output:temp(t)};
    const result=await runLearnRoom(options,async()=>response(strategy==='agent'?JSON.stringify({type:'submit_prediction',prediction}):raw));
    const file=path.join(result.dir,'spending.json'),ledger=readJson<any>(file);
    ledger.entries[0].chargedUnits=null;delete ledger.entries[0].costBasis;writeJson(file,ledger);
    await runLearnRoom(options,never);
    assert.equal(readJson<any>(file).entries[0].chargedUnits,1000000);
    fs.unlinkSync(file);
    await assert.rejects(runLearnRoom(options,never),/ledger is missing/);
    assert.equal(fs.existsSync(file),false);
  }
});

test('corrupt completed episodes are detected before continuing another target',async t=>{
  mockKey(t);const options={model:'mock/tamper',strategy:'agent' as const,limit:2,output:temp(t)};let calls=0;
  await assert.rejects(runLearnRoom(options,async()=>{if(++calls===2)throw new Error('Stop');return response(JSON.stringify({type:'submit_prediction',prediction}));}),/Stop/);
  const dir=path.join(options.output,fs.readdirSync(options.output)[0]),file=path.join(dir,'episodes/agent/100.json');
  const rec=readJson<EpisodeRecord>(file);rec.agentCalls![0].request.messages[0].content='corrupt';writeJson(file,rec);
  await assert.rejects(runLearnRoom(options,never),/request or episode order/);
});

test('all 45 targets and all four strategies agree with independent scoring and keep hidden labels out of requests',async t=>{
  const data=loadDistributionData(),output=temp(t),fixture=path.join(output,'all-targets.json');
  const payload:any={};
  for(const s of ['none','random','similar','agent']) {
    payload[s]=Object.fromEntries(data.split.evaluation.map((day,i)=>[day,s==='agent'
      ? [JSON.stringify({type:'submit_prediction',prediction:i===0?{}:prediction})]
      : i===0?'invalid JSON':raw]));
  }
  writeJson(fixture,payload);
  const {report}=await runLearnRoom({fixture,strategy:'all',partition:'evaluation',limit:45,maxTokens:4000,agentPolicy:'transfer-check-v1',output},never);
  const keys=Object.keys(prediction) as (keyof typeof prediction)[];
  const targetWindows=data.split.evaluation.map(id=>data.windows.find(w=>w.day===id)!);
  const expected=targetWindows.reduce((sum,w,i)=>sum+(i===0?0:100*(1-[w.counts.tl,w.counts.tr,w.counts.bl,w.counts.br].reduce((err,n,j)=>err+(prediction[keys[j]]-n/w.n)**2,0)/2)),0)/45;
  assert.equal(report.rows.length,180);assert.equal(report.complete,true);
  for(const summary of report.summaries) {
    assert.equal(summary.valid,44);assert.equal(summary.invalid,1);assert.ok(Math.abs(summary.score!-expected)<1e-10);
  }
  for(const comparison of report.comparisons)assert.equal(comparison.scoreGain,0);
  const changed=structuredClone(data);
  for(const w of changed.windows.filter(w=>!data.split.reference.includes(w.day))) {w.n=100;w.counts={tl:100,tr:0,bl:0,br:0};}
  const config=report.manifest.config;
  for(const day of config.targets) for(const s of config.strategies) {
    const a=prepareEpisode(config,s,day,data),b=prepareEpisode(config,s,day,changed);
    assert.deepEqual(a.request,b.request);
    if(s!=='agent')continue;
    const am=structuredClone(a.request.messages),bm=structuredClone(b.request.messages);
    for(const action of [{type:'list_examples'},...config.reference.slice(0,3).map(id=>({type:'inspect_example',id})),{type:'submit_prediction',prediction}]) {
      const call={request:agentRequest(config,am),applied:false,attempts:[{index:1,startedAt:'mock',...response(JSON.stringify(action))}]};
      applyAgentCall(a.episode,am,call);applyAgentCall(b.episode,bm,call);
      assert.deepEqual(agentRequest(config,am),agentRequest(config,bm));
    }
  }
});
