import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Script } from 'node:vm';
import { QUADRANTS, validatePrediction, parsePrediction, distributionError, scoreFromError, uniform, observed, constantBaseline, winnerCredit } from '../../src/shared/distribution.ts';
import { loadDistributionData, validateSplit, packageRoot } from '../../src/shared/dataset.ts';
import { requestCompletion } from '../../src/shared/model-client.ts';
import { runDistribution } from '../../src/tracks/distribution/run.ts';
import { buildDistributionReport, distributionHtml } from '../../src/tracks/distribution/report.ts';
import { readJson, writeJson } from '../../src/shared/run-records.ts';
import type { Manifest, Record } from '../../src/tracks/distribution/run.ts';

const fixture = path.join(packageRoot(),'tests/fixtures/distribution-pilot.json');
const prediction = (...values: number[]) => Object.fromEntries(QUADRANTS.map((q,i)=>[q,values[i]]));
const temp = (t: any) => { const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-distribution-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); return dir; };

test('strict probabilities accept rounding but reject missing, invalid, coerced, or extra values',()=>{
  for (const value of [null, [], {}, prediction(.2,.2,.2,.2),prediction(-.1,.4,.4,.3),prediction(NaN,.3,.3,.4),prediction(Infinity,0,0,0),{...uniform(),extra:0},{...uniform(),'honest+uniting':'0.25'}]) assert.equal(validatePrediction(value).prediction,null);
  const normalized=validatePrediction(prediction(.333,.333,.333,0));
  assert.ok(normalized.prediction);
  assert.ok(Math.abs(Object.values(normalized.prediction).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.equal(parsePrediction('```json\n'+JSON.stringify(uniform())+'\n```').prediction,null);
  assert.equal(parsePrediction('').error,'Missing response');
});

test('error endpoints, failure scale, equal-window baseline, and tie credit',()=>{
  const data=loadDistributionData(), w=data.windows[0];
  const p=validatePrediction(prediction(1,0,0,0)).prediction!, q=validatePrediction(prediction(0,1,0,0)).prediction!;
  assert.equal(distributionError(p,p),0); assert.equal(distributionError(p,q),2);
  assert.equal(scoreFromError(0),100); assert.equal(scoreFromError(2),0); assert.equal(scoreFromError(.2),90);
  const a={...w,n:1000,counts:{tl:1000,tr:0,bl:0,br:0}}, b={...w,n:10,counts:{tl:0,tr:10,bl:0,br:0}};
  assert.deepEqual(constantBaseline([a,b]),prediction(.5,.5,0,0));
  assert.equal(winnerCredit(uniform(),a),.25);
  assert.equal(winnerCredit(p,{...w,n:10,counts:{tl:5,tr:5,bl:0,br:0}}),1);
  assert.equal(winnerCredit(uniform(),{...w,n:10,counts:{tl:5,tr:5,bl:0,br:0}}),.5);
  assert.equal(distributionError(observed(a),p),0);
});

test('split pins dataset, preserves entity groups and chronology, and covers all windows',()=>{
  const {windows,split,datasetHash}=loadDistributionData();
  assert.deepEqual([split.reference.length,split.development.length,split.evaluation.length],[90,30,45]);
  assert.ok(split.reference.includes(30) && split.reference.includes(99));
  assert.throws(()=>validateSplit(windows,split,'changed'),/fingerprint/);
  const crossed=structuredClone(split); crossed.reference=crossed.reference.filter(d=>d!==30); crossed.development.push(30);
  assert.throws(()=>validateSplit(windows,crossed,datasetHash),/Entity crosses/);
  const missing=structuredClone(split); missing.evaluation.pop();
  assert.throws(()=>validateSplit(windows,missing,datasetHash),/cover every/);
  const duplicate=structuredClone(split); duplicate.evaluation.push(split.reference[0]);
  assert.throws(()=>validateSplit(windows,duplicate,datasetHash),/duplicate/);
});

test('fixture pipeline retains failures, isolates tracks, resumes without calls, and hides incomplete headline',async t=>{
  const output=temp(t);
  const {dir,report}=await runDistribution({fixture,limit:5,output},async()=>{throw new Error('must not call API');});
  assert.deepEqual([report.summary.valid,report.summary.invalid,report.summary.missing],[3,1,1]);
  assert.equal(report.summary.total,5); assert.equal(report.summary.apiCalls,0); assert.equal(report.summary.knownCostUsd,0);
  assert.equal(report.summary.meanError,report.rows.reduce((s,r)=>s+r.error,0)/5);
  assert.equal(report.rows[3].error,2); assert.equal(report.rows[4].score,0);
  assert.ok(report.rows.every(r=>!JSON.stringify(r.request?.messages).includes('counts')));
  const before=fs.readFileSync(path.join(dir,'records/100.json'),'utf8');
  const resumed=await runDistribution({fixture,limit:5,output});
  assert.equal(resumed.dir,dir); assert.equal(fs.readFileSync(path.join(dir,'records/100.json'),'utf8'),before);
  assert.equal(resumed.report.summary.attempts,5);
  const smaller=await runDistribution({fixture,limit:2,output}); assert.notEqual(smaller.dir,dir);
  const changed=path.join(output,'fixture.json'); const payload=JSON.parse(fs.readFileSync(fixture,'utf8')); payload['100']=JSON.stringify(uniform()); writeJson(changed,payload);
  assert.notEqual((await runDistribution({fixture:changed,limit:5,output})).dir,dir);
  fs.unlinkSync(path.join(dir,'records/100.json'));
  const partial=buildDistributionReport(dir); assert.equal(partial.summary.complete,false); assert.equal(partial.summary.score,null); assert.equal(partial.summary.pending,1);
  const html=distributionHtml({...report,rows:[{...report.rows[0],word:'</script><script>alert(1)</script>'}]});
  assert.ok(!html.includes('</script><script>alert(1)'));
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)![1]);
});

test('client preserves provider, usage, raw failures, and retriable status without network',async()=>{
  const request={model:'test/model',messages:[],temperature:0,max_tokens:2000,usage:{include:true}};
  const ok=await requestCompletion(request,'test',async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(uniform())}}],provider:'Test',usage:{total_tokens:12,cost:.01}}),{status:200}));
  assert.equal(ok.provider,'Test'); assert.equal(ok.usage?.cost,.01); assert.equal(ok.status,'response');
  const busy=await requestCompletion(request,'test',async()=>new Response('{"error":"busy"}',{status:429}));
  assert.equal(busy.retriable,true); assert.equal(busy.status,'error');
  const bad=await requestCompletion(request,'test',async()=>new Response('bad request',{status:400}));
  assert.equal(bad.retriable,false);
});

test('runner logs retries and costs, does not reroll malformed output, and recovers saved responses',async t=>{
  const output=temp(t), old=process.env.OPENROUTER_API_KEY; process.env.OPENROUTER_API_KEY='test-only';
  t.after(()=>{if(old===undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY=old;});
  let calls=0;
  const {dir,report}=await runDistribution({model:'test/model',provider:'Test',limit:1,output},async request=>{
    calls++; assert.deepEqual(request.provider,{order:['Test'],allow_fallbacks:false});
    return {status:calls===1?'error':'response',finishedAt:new Date().toISOString(),raw:calls===1?'':'not json',response:{},provider:'Test',usage:{cost:.01,total_tokens:10},error:calls===1?'HTTP 429':null,retriable:calls===1};
  });
  assert.equal(calls,2); assert.equal(report.summary.attempts,2); assert.equal(report.summary.knownCostUsd,.02); assert.equal(report.summary.invalid,1);
  await runDistribution({model:'test/model',provider:'Test',limit:1,output},async()=>{throw new Error('must not reroll');});
  const recordPath=path.join(dir,'records/100.json'); const rec=readJson<Record>(recordPath); rec.terminal=false; rec.validation=null; writeJson(recordPath,rec);
  const manifestPath=path.join(dir,'manifest.json'); const manifest=readJson<Manifest>(manifestPath); manifest.status='incomplete'; writeJson(manifestPath,manifest);
  await runDistribution({model:'test/model',provider:'Test',limit:1,output},async()=>{throw new Error('must recover saved response');});
  assert.equal(readJson<Record>(recordPath).terminal,true);
});

test('argument and fixture validation fails before requests',async t=>{
  const output=temp(t);
  await assert.rejects(runDistribution({fixture,limit:0,output}),/positive integer/);
  await assert.rejects(runDistribution({fixture,limit:6,output}),/every selected target/);
  await assert.rejects(runDistribution({fixture,limit:1,provider:'Test',output}),/cannot specify/);
});

test('interrupted attempts exhaust the fixed budget and retain unknown cost; locks block concurrent runs',async t=>{
  const output=temp(t);
  const {dir}=await runDistribution({fixture,limit:1,output});
  const file=path.join(dir,'records/100.json'), rec=readJson<Record>(file);
  rec.attempts=Array.from({length:3},(_,i)=>({...rec.attempts[0],index:i+1,status:'started' as const,finishedAt:undefined,raw:'',response:null,usage:null}));
  rec.terminal=false; rec.validation=null; writeJson(file,rec);
  const {report}=await runDistribution({fixture,limit:1,output},async()=>{throw new Error('budget must prevent another request');});
  assert.equal(report.summary.missing,1); assert.equal(report.summary.score,0);
  assert.equal(report.summary.unknownCostAttempts,3);
  assert.equal(report.summary.unknownTokenAttempts,3);
  fs.writeFileSync(path.join(dir,'run.lock'),'test lock');
  await assert.rejects(runDistribution({fixture,limit:1,output}),/Run is locked/);
});
