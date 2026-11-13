import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Script } from 'node:vm';
import { packageRoot } from '../../src/shared/dataset.ts';
import { readJson,writeJson } from '../../src/shared/run-records.ts';
import { uniform } from '../../src/shared/distribution.ts';
import { rankSimilar } from '../../src/tracks/learn-room/strategies.ts';
import { runLearnRoom,type EpisodeRecord } from '../../src/tracks/learn-room/run.ts';
import { buildLearnRoomReport,learnRoomHtml,learnRoomMarkdown } from '../../src/tracks/learn-room/report.ts';
const fixture=path.join(packageRoot(),'tests/fixtures/learn-room-four-strategies.json');
const temp=(t:any)=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-agent-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;};
const noNetwork=async()=>{throw new Error('No network allowed');};

test('similarity uses reference text only, is stable across catalog ordering, and breaks zero-overlap ties by ID',()=>{
  const catalog=[{id:2,prompt:'SOLAR POWER'},{id:1,prompt:'SOLAR ENERGY'},{id:3,prompt:'DOG FOOD'}];
  const ranked=rankSimilar(catalog,'solar energy');assert.equal(ranked[0].id,1);assert.ok(ranked[0].similarity>.999999);
  assert.deepEqual(rankSimilar([...catalog].reverse(),'solar energy'),ranked);
  assert.deepEqual(rankSimilar(catalog,'𐍈𐍈𐍈').map(r=>r.id),[1,2,3]);
  assert.deepEqual(rankSimilar(catalog.map(e=>({...e,counts:{secret:999}})),'solar energy'),ranked);
});

test('all four strategies share targets and yield scores, five paired comparisons, traces, and usage',async t=>{
  const {report}=await runLearnRoom({fixture,strategy:'all',limit:5,output:temp(t)},noNetwork);
  assert.equal(report.rows.length,20);assert.equal(report.comparisons.length,5);assert.equal(report.complete,true);
  assert.deepEqual(report.summaries.map(s=>s.strategy),['none','random','similar','agent']);
  const agent=report.summaries[3];assert.deepEqual([agent.valid,agent.invalid,agent.missing,agent.inspections],[3,1,1,5]);
  assert.equal(agent.modelCalls,23);assert.equal(agent.apiCalls,0);
  for(const comparison of report.comparisons) assert.ok(Math.abs(comparison.scoreGain-50*comparison.errorReduction)<1e-10);
  const early=report.rows.find(r=>r.strategy==='agent'&&r.day===101)!;
  assert.equal(early.agentCalls.length,1);assert.equal(early.outcome!.inspections,0);
  const invalid=report.rows.find(r=>r.strategy==='agent'&&r.day===102)!;
  assert.equal(invalid.outcome!.status,'valid');assert.equal(invalid.outcome!.inspections,3);
  assert.ok(invalid.trace.some(t=>(t.observation as any).error==='Inspection budget exhausted'));
  const maxed=report.rows.find(r=>r.strategy==='agent'&&r.day===103)!;
  assert.equal(maxed.outcome!.score,0);assert.equal(maxed.outcome!.actions,8);
  const html=learnRoomHtml(report);new Script(html.match(/<script>([\s\S]*?)<\/script>/)![1]);
  assert.ok(html.includes('<option>agent</option>'));assert.ok(learnRoomMarkdown(report).includes('agent vs similar'));
});

test('agent turn limit is distinct from action limit, and invalid submissions end immediately',async t=>{
  const output=temp(t);
  const limited=await runLearnRoom({fixture,strategy:'agent',limit:1,maxModelCalls:2,output},noNetwork);
  const row=limited.report.rows[0];assert.equal(row.agentCalls.length,2);assert.equal(row.outcome!.status,'missing');assert.match(row.outcome!.failure!,/Model-turn limit/);assert.equal(row.outcome!.actions,2);
  await assert.rejects(runLearnRoom({fixture,strategy:'agent',limit:1,maxModelCalls:9,output}),/max-model-calls/);
});

test('resume applies a durably saved response exactly once without spending',async t=>{
  const output=temp(t),options={fixture,strategy:'agent' as const,limit:1,output};
  const {dir,report}=await runLearnRoom(options,noNetwork);
  const file=path.join(dir,'episodes/agent/100.json'),rec=readJson<EpisodeRecord>(file);
  rec.agentCalls![2].applied=false;rec.trace=rec.trace.slice(0,2);rec.outcome=null;rec.terminal=false;writeJson(file,rec);
  const resumed=await runLearnRoom(options,noNetwork);
  assert.deepEqual(resumed.report.rows[0].trace,report.rows[0].trace);assert.equal(resumed.report.rows[0].agentCalls.length,3);
  const corrupt=readJson<EpisodeRecord>(file);corrupt.agentCalls![1].request.messages[0].content='tampered';writeJson(file,corrupt);
  assert.throws(()=>buildLearnRoomReport(dir),/request or episode order/);
});

test('interrupted HTTP attempt consumes retry budget, not another agent action; feedback drives next choice (mock only)',async t=>{
  const output=temp(t),old=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='mock-only';
  t.after(()=>{if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old;});
  const options={model:'mock/agent',provider:'Mock',strategy:'agent' as const,limit:1,output};
  let calls=0;
  const client=async(request:any)=>{
    calls++;
    if(calls===1) throw new Error('simulate interruption');
    assert.deepEqual(request.provider,{order:['Mock'],allow_fallbacks:false});
    const feedback=JSON.parse(request.messages.at(-1).content);
    assert.equal('score' in feedback,false);assert.equal('observed' in feedback,false);
    let action:any;
    if(feedback.target) {assert.deepEqual(Object.keys(feedback.target).sort(),['id','prompt']);action={type:'list_examples'};}
    else if(feedback.examples) {assert.ok(feedback.examples.every((e:any)=>!('distribution' in e)));action={type:'inspect_example',id:feedback.examples[0].id};}
    else {assert.ok(feedback.distribution);action={type:'submit_prediction',prediction:feedback.distribution};}
    return {status:'response' as const,finishedAt:new Date().toISOString(),raw:JSON.stringify(action),response:{},provider:'Mock',usage:{total_tokens:10,cost:.01},error:null,retriable:false};
  };
  await assert.rejects(runLearnRoom(options,client),/simulate interruption/);
  const {report}=await runLearnRoom(options,client);
  const summary=report.summaries[0];assert.equal(summary.modelCalls,3);assert.equal(summary.apiCalls,4);assert.equal(summary.costUsd.known,.03);assert.equal(summary.costUsd.unknownAttempts,1);assert.equal(summary.inspections,1);assert.equal(report.rows[0].outcome!.actions,3);
});

test('exhausted HTTP retries abort without inventing an action; old checkpoint reports still replay',async t=>{
  const output=temp(t),options={fixture,strategy:'agent' as const,limit:1,output};
  const {dir}=await runLearnRoom(options,noNetwork),file=path.join(dir,'episodes/agent/100.json'),rec=readJson<EpisodeRecord>(file);
  const first=rec.agentCalls![0];first.applied=false;
  first.attempts=Array.from({length:3},(_,i)=>({...first.attempts[0],index:i+1,status:'started' as const,usage:null,raw:''}));
  rec.agentCalls=[first];rec.attempts=first.attempts;rec.trace=[];rec.outcome=null;rec.terminal=false;writeJson(file,rec);
  const resumed=await runLearnRoom(options,noNetwork);assert.equal(resumed.report.summaries[0].missing,1);assert.equal(resumed.report.summaries[0].costUsd.unknownAttempts,3);assert.equal(resumed.report.rows[0].outcome!.actions,0);
  const old=buildLearnRoomReport(path.join(packageRoot(),'results/learn-room/fixture-synthetic-5169ab87498e34cd'));assert.equal(old.summaries.length,2);assert.equal(old.complete,true);
});
