import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {digest,loadDistributionData,packageRoot} from '../../src/shared/dataset.ts';
import {uniform} from '../../src/shared/distribution.ts';
import {readJson,writeJson} from '../../src/shared/run-records.ts';
import {AGENT_SYSTEM,AGENT_PROMPT_HASH,getAgentPolicy,agentRequest,applyAgentCall,type AgentCall} from '../../src/tracks/learn-room/agent.ts';
import {runLearnRoom,prepareEpisode,type EpisodeRecord,type RoomManifest} from '../../src/tracks/learn-room/run.ts';
import {buildLearnRoomReport,learnRoomHtml,learnRoomMarkdown} from '../../src/tracks/learn-room/report.ts';

const fixture=path.join(packageRoot(),'tests/fixtures/learn-room-four-strategies.json');
const noNetwork=async()=>{throw new Error('No network allowed');};
const temp=(t:any)=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-policy-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;};

test('policy CLI changes only agent instructions; defaults, baseline requests, and fixture outcomes stay compatible',async t=>{
  const output=temp(t),options={fixture,strategy:'all' as const,limit:5,maxTokens:4000,output};
  const baseline=await runLearnRoom(options,noNetwork);
  const explicit=await runLearnRoom({...options,agentPolicy:'default'},noNetwork);
  assert.equal(baseline.dir,explicit.dir);
  assert.equal(Object.hasOwn(explicit.report.manifest.config,'agentPolicy'),false);
  // This immutable legacy prompt hash protects replay of existing API runs.
  assert.equal(AGENT_PROMPT_HASH,'bab9e54f315f62c67fa8e28d9a5e096fc9353aeb3bbe2d2c8125f006dec5f6bf');
  execFileSync(process.execPath,['src/cli.ts','learn-room','--fixture',fixture,'--strategy','all','--limit','5','--max-tokens','4000','--output',output,'--agent-policy','transfer-check-v1'],{cwd:packageRoot(),stdio:'pipe'});
  const dir=fs.readdirSync(output).map(p=>path.join(output,p)).find(p=>p!==baseline.dir)!;
  const report=buildLearnRoomReport(dir),policy=getAgentPolicy('transfer-check-v1');
  assert.notEqual(dir,baseline.dir);
  assert.equal(report.manifest.config.agentPolicy,policy.name);
  assert.equal(report.manifest.config.agentPromptHash,policy.promptHash);
  assert.notEqual(policy.promptHash,AGENT_PROMPT_HASH);
  const {agentPolicy,agentPromptHash,...rest}=report.manifest.config;
  const {agentPromptHash:oldHash,...old}=baseline.report.manifest.config;
  assert.deepEqual(rest,old);
  for(let i=0;i<report.rows.length;i++){
    const row=report.rows[i],before=baseline.report.rows[i];
    assert.deepEqual(row.outcome,before.outcome);assert.deepEqual(row.trace,before.trace);
    if(row.strategy!=='agent')assert.deepEqual(row.request,before.request);
    else {
      const normalized=structuredClone(row.request);normalized.messages[0].content=AGENT_SYSTEM;
      assert.deepEqual(normalized,before.request);
      for(let j=0;j<row.agentCalls.length;j++){
        const request=structuredClone(row.agentCalls[j].request);
        assert.equal(request.messages[0].content,policy.system);
        request.messages[0].content=AGENT_SYSTEM;
        assert.deepEqual(request,before.agentCalls[j].request);
      }
    }
  }
  assert.equal(report.summaries.reduce((sum,s)=>sum+s.apiCalls,0),0);
  assert.match(learnRoomMarkdown(report),/Agent policy: transfer-check-v1/);
  assert.match(learnRoomHtml(report),/Agent policy transfer-check-v1/);
  assert.deepEqual(report.summaries,baseline.report.summaries);
});

test('new policy resumes a saved unapplied action without rerolling and retains the model-turn limit',async t=>{
  const options={fixture,strategy:'agent' as const,agentPolicy:'transfer-check-v1' as const,limit:1,output:temp(t)};
  const {dir,report}=await runLearnRoom(options,noNetwork);
  const file=path.join(dir,'episodes/agent/100.json'),before=fs.readFileSync(file,'utf8');
  const rec=readJson<EpisodeRecord>(file);
  rec.agentCalls!.at(-1)!.applied=false;rec.trace.pop();rec.outcome=null;rec.terminal=false;writeJson(file,rec);
  const resumed=await runLearnRoom(options,noNetwork);
  assert.equal(resumed.dir,dir);assert.deepEqual(resumed.report,report);
  assert.equal(fs.readFileSync(file,'utf8'),before);
  const limited=await runLearnRoom({...options,maxModelCalls:2},noNetwork);
  assert.equal(limited.report.rows[0].agentCalls.length,2);
  assert.equal(limited.report.rows[0].outcome!.status,'missing');
  assert.equal(limited.report.rows[0].outcome!.inspections,1);
});

test('invalid policy selection and mismatched saved prompt fingerprints are rejected',async t=>{
  const options={fixture,strategy:'agent' as const,limit:1,output:temp(t)};
  await assert.rejects(runLearnRoom({...options,agentPolicy:'unknown' as any},noNetwork),/agent-policy/);
  await assert.rejects(runLearnRoom({...options,strategy:'none',agentPolicy:'transfer-check-v1'},noNetwork),/requires --strategy/);
  const {dir}=await runLearnRoom({...options,agentPolicy:'transfer-check-v1'},noNetwork);
  const file=path.join(dir,'manifest.json'),original=readJson<RoomManifest>(file);
  for(const change of [
    {agentPolicy:'unknown' as any},
    {agentPolicy:undefined},
    {agentPromptHash:AGENT_PROMPT_HASH},
  ]){
    const changed=structuredClone(original);Object.assign(changed.config,change);
    changed.id=digest(JSON.stringify(changed.config));writeJson(file,changed);
    assert.throws(()=>buildLearnRoomReport(dir),/agent-policy|Agent protocol mismatch/);
  }
  writeJson(file,original);assert.equal(buildLearnRoomReport(dir).complete,true);
});

test('hidden target labels cannot affect new-policy requests, catalog, or inspected observations',async t=>{
  const {report}=await runLearnRoom({fixture,strategy:'agent',agentPolicy:'transfer-check-v1',limit:1,output:temp(t)},noNetwork);
  const config=report.manifest.config,data=loadDistributionData(),changed=structuredClone(data);
  const target=changed.windows.find(w=>w.day===100)!;
  target.n=100;target.counts={tl:100,tr:0,bl:0,br:0};
  const a=prepareEpisode(config,'agent',100,data),b=prepareEpisode(config,'agent',100,changed);
  assert.deepEqual(a.request,b.request);
  const am=structuredClone(a.request.messages),bm=structuredClone(b.request.messages);
  for(const action of [{type:'list_examples'},{type:'inspect_example',id:config.reference[0]},{type:'submit_prediction',prediction:uniform()}]){
    assert.deepEqual(agentRequest(config,am),agentRequest(config,bm));
    const call:AgentCall={request:agentRequest(config,am),applied:false,attempts:[{index:1,startedAt:'fixture',status:'response',raw:JSON.stringify(action),response:{fixture:true},provider:null,usage:{cost:0},error:null,retriable:false}]};
    applyAgentCall(a.episode,am,call);applyAgentCall(b.episode,bm,call);
    assert.deepEqual(am,bm);
  }
  assert.notEqual(a.episode.evaluator.outcome()!.score,b.episode.evaluator.outcome()!.score);
});
