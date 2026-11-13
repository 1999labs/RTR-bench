import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Script } from 'node:vm';
import { packageRoot } from '../../src/shared/dataset.ts';
import { readJson,writeJson } from '../../src/shared/run-records.ts';
import { runLearnRoom,type EpisodeRecord,type RoomManifest } from '../../src/tracks/learn-room/run.ts';
import { buildLearnRoomReport,learnRoomHtml } from '../../src/tracks/learn-room/report.ts';
const fixture=path.join(packageRoot(),'tests/fixtures/learn-room-pilot.json');
const temp=(t:any)=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-room-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;};

test('fixture comparison scores failures, records evidence and paired gains, and resumes without API calls',async t=>{
  const output=temp(t), noNetwork=async()=>{throw new Error('No network allowed');};
  const {dir,report}=await runLearnRoom({fixture,limit:5,output},noNetwork);
  assert.equal(report.rows.length,10);assert.equal(report.complete,true);
  const [none,random]=report.summaries;
  assert.deepEqual([none.valid,none.invalid,none.missing,none.inspections,none.apiCalls],[3,1,1,0,0]);
  assert.deepEqual([random.valid,random.invalid,random.missing,random.inspections,random.apiCalls],[4,0,1,15,0]);
  assert.ok(Math.abs(report.comparison!.scoreGain-(random.score!-none.score!))<1e-12);
  assert.ok(Math.abs(report.comparison!.scoreGain-50*report.comparison!.errorReduction)<1e-12);
  const before=fs.readFileSync(path.join(dir,'episodes/random/100.json'),'utf8');
  assert.equal((await runLearnRoom({fixture,limit:5,output},noNetwork)).dir,dir);
  assert.equal(fs.readFileSync(path.join(dir,'episodes/random/100.json'),'utf8'),before);
  const smaller=await runLearnRoom({fixture,limit:1,output},noNetwork);
  assert.notEqual(smaller.dir,dir);
  assert.deepEqual(smaller.report.rows[1].trace,report.rows[5].trace);
  assert.notEqual((await runLearnRoom({fixture,limit:1,seed:8,output},noNetwork)).dir,smaller.dir);
  const broken={...report,rows:[{...report.rows[0],word:'</script><script>alert(1)</script>'}]};
  const html=learnRoomHtml(broken);assert.ok(!html.includes('</script><script>alert(1)'));
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)![1]);
  fs.unlinkSync(path.join(dir,'episodes/random/100.json'));
  const partial=buildLearnRoomReport(dir);assert.equal(partial.complete,false);assert.equal(partial.summaries[1].score,null);assert.equal(partial.comparison,null);
  assert.equal(partial.rows.find(r=>r.day===100&&r.strategy==='random')!.trace.length,0);
  assert.equal(partial.summaries[1].inspections,12);
});

test('report replays saved evidence and rejects tampered traces; raw response controls score',async t=>{
  const {dir}=await runLearnRoom({fixture,limit:1,output:temp(t)});
  const file=path.join(dir,'episodes/random/100.json'),record=readJson<EpisodeRecord>(file);
  record.outcome!.score=100;writeJson(file,record);
  assert.notEqual(buildLearnRoomReport(dir).rows[1].outcome!.score,100);
  (record.trace[1].observation as any).submissions=999999;writeJson(file,record);
  assert.throws(()=>buildLearnRoomReport(dir),/trace differs/);
});

test('recovering saved response adds no calls; exhausted attempts keep unknown usage and zero score',async t=>{
  const output=temp(t), {dir}=await runLearnRoom({fixture,limit:1,strategy:'none',output});
  const file=path.join(dir,'episodes/none/100.json'),rec=readJson<EpisodeRecord>(file);
  rec.terminal=false;rec.outcome=null;rec.trace=[];writeJson(file,rec);
  const noNetwork=async()=>{throw new Error('No network allowed');};
  const recovered=await runLearnRoom({fixture,limit:1,strategy:'none',output},noNetwork);
  assert.equal(recovered.report.summaries[0].attempts,1);
  rec.attempts=Array.from({length:3},(_,i)=>({...rec.attempts[0],index:i+1,status:'started' as const,raw:'',usage:null}));writeJson(file,rec);
  const exhausted=await runLearnRoom({fixture,limit:1,strategy:'none',output},noNetwork);
  assert.equal(exhausted.report.summaries[0].score,0);assert.equal(exhausted.report.summaries[0].costUsd.unknownAttempts,3);
  fs.writeFileSync(path.join(dir,'run.lock'),'test');
  await assert.rejects(runLearnRoom({fixture,limit:1,strategy:'none',output}),/locked/);
});

test('validation rejects unsupported strategies, budgets, seeds, and incomplete fixtures',async t=>{
  const output=temp(t);
  await assert.rejects(runLearnRoom({fixture,budget:4,output}),/budget/);
  await assert.rejects(runLearnRoom({fixture,seed:-1,output}),/seed/);
  await assert.rejects(runLearnRoom({fixture,strategy:'agent' as any,output}),/strategy/);
  await assert.rejects(runLearnRoom({fixture,limit:6,output}),/Fixture/);
  await assert.rejects(runLearnRoom({fixture,limit:1,provider:'Test',output}),/provider/);
});

test('API adapter retry accounting is bounded and malformed predictions are not rerolled (mock only)',async t=>{
  const output=temp(t),old=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='mock-only';
  t.after(()=>{if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old;});
  let calls=0;
  const {dir,report}=await runLearnRoom({model:'mock/model',provider:'Mock',strategy:'random',limit:1,output},async request=>{
    calls++;assert.deepEqual(request.provider,{order:['Mock'],allow_fallbacks:false});
    assert.ok(request.messages[1].content.includes('Historical examples'));
    return {status:calls===1?'error':'response',finishedAt:new Date().toISOString(),raw:calls===1?'':'invalid json',response:{},provider:'Mock',usage:{cost:.01,total_tokens:10},error:calls===1?'HTTP 429':null,retriable:calls===1};
  });
  assert.equal(calls,2);assert.equal(report.summaries[0].costUsd.known,.02);assert.equal(report.summaries[0].tokens.known,20);assert.equal(report.summaries[0].invalid,1);assert.equal(report.summaries[0].inspections,3);
  const resumed=await runLearnRoom({model:'mock/model',provider:'Mock',strategy:'random',limit:1,output},async()=>{throw new Error('must not reroll');});
  assert.equal(resumed.dir,dir);assert.equal(resumed.report.summaries[0].attempts,2);
});
