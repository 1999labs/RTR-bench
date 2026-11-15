// Offline replay and comparison; this script cannot make model or catalog calls.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildLearnRoomReport} from '../../src/tracks/learn-room/report.ts';
import {runLearnRoom} from '../../src/tracks/learn-room/run.ts';
import {loadDistributionData} from '../../src/shared/dataset.ts';
import {meanCI} from '../../src/shared/distribution.ts';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const read=f=>JSON.parse(fs.readFileSync(f));
const execution=read(path.join(here,'execution.json'));
const planRaw=fs.readFileSync(path.join(root,execution.plan));
assert.equal(createHash('sha256').update(planRaw).digest('hex'),execution.planHash);
const plan=JSON.parse(planRaw),data=loadDistributionData();
const never=async()=>{throw new Error('Network forbidden during offline analysis');};globalThis.fetch=never;
assert.equal(execution.status,'complete');assert.equal(execution.runs.length,2);
assert.equal(plan.datasetHash,data.datasetHash);assert.equal(plan.splitHash,data.splitHash);
const reports=[],results=[];
for(const [i,run] of execution.runs.entries()){
 const expected=plan.runs[i];assert.equal(run.condition,expected.condition);assert.equal(run.exitCode,0);
 const dir=path.join(root,run.directory),report=buildLearnRoomReport(dir),c=report.manifest.config;
 assert.ok(report.complete);assert.equal(c.mode,'api');assert.equal(c.model,plan.model);assert.equal(c.provider,plan.provider);
 assert.equal(c.partition,'development');assert.deepEqual(c.targets,plan.targets.map(t=>t.day));assert.deepEqual(c.reference,plan.reference);
 assert.deepEqual(c.strategies,['agent']);assert.equal(c.budget,expected.inspectionBudget);assert.equal(c.maxActions,plan.maxActions);assert.equal(c.maxModelCalls,plan.maxModelCalls);assert.equal(c.seed,plan.seed);
 assert.equal(c.agentPolicy,plan.agentPolicy);assert.equal(c.agentPromptHash,plan.agentPromptHash);
 assert.equal(c.settings.maxTokens,plan.maxTokens);assert.equal(c.settings.temperature,plan.temperature);assert.equal(c.settings.maxAttempts,plan.maxAttempts);assert.equal(c.settings.timeoutMs,plan.timeoutMs);
 assert.equal(c.spending.limitUsd,expected.capUsd);assert.equal(c.spending.providerTag,plan.provider);
 assert.equal(c.spending.contextTokens,plan.providerSnapshot.contextTokens);assert.equal(c.spending.inputUsdPerToken,plan.providerSnapshot.inputUsdPerToken);assert.equal(c.spending.outputUsdPerToken,plan.providerSnapshot.outputUsdPerToken);
 const ledger=read(path.join(dir,'spending.json')),attempts=report.rows.flatMap(r=>r.attempts),s=report.summaries[0];
 assert.equal(ledger.entries.length,attempts.length);assert.deepEqual([...attempts.map(a=>a.spendingReservation)].sort((a,b)=>a-b),ledger.entries.map((_,i)=>i));
 assert.ok(attempts.every(a=>a.status!=='started'));
 for(const row of report.rows){
  const w=data.windows.find(w=>w.day===row.day),keys=['performed+uniting','honest+uniting','performed+dividing','honest+dividing'],q=['tl','tr','bl','br'];
  const independent=row.outcome.status==='valid'?100*(1-keys.reduce((e,key,j)=>e+(row.outcome.prediction[key]-w.counts[q[j]]/w.n)**2,0)/2):0;
  assert.ok(Math.abs(independent-row.outcome.score)<1e-10);
  if(expected.inspectionBudget===0){
   assert.equal(row.outcome.inspections,0);
   for(const t of row.trace){assert.ok(!('distribution' in t.observation));assert.ok(!('submissions' in t.observation));}
  }
 }
 const accountedUsd=ledger.entries.reduce((sum,e)=>sum+(e.chargedUnits??e.reservedUnits),0)/1e9;
 assert.ok(accountedUsd<=expected.capUsd);
 const saved=fs.readFileSync(path.join(dir,'report.json'),'utf8');assert.deepEqual(JSON.parse(saved),report);
 const resumed=await runLearnRoom({model:plan.model,provider:plan.provider,partition:'development',limit:10,strategy:'agent',budget:expected.inspectionBudget,seed:plan.seed,maxModelCalls:plan.maxModelCalls,maxTokens:plan.maxTokens,agentPolicy:plan.agentPolicy,maxUsd:expected.capUsd,output:path.dirname(dir)},never);
 assert.equal(resumed.dir,dir);assert.equal(fs.readFileSync(path.join(dir,'report.json'),'utf8'),saved);
 const result={condition:run.condition,directory:run.directory,...s,baseline:report.baselines.constantScore,vsBaseline:s.score-report.baselines.constantScore,accountedUsd,unknownReservations:ledger.entries.filter(e=>e.chargedUnits===null).length,unknownReservedUsd:ledger.entries.filter(e=>e.chargedUnits===null).reduce((sum,e)=>sum+e.reservedUnits,0)/1e9,apiErrors:attempts.filter(a=>a.status==='error').length,lengthStops:attempts.filter(a=>a.response?.choices?.some(c=>c.finish_reason==='length')).length,maxCompletionTokens:Math.max(...attempts.map(a=>a.usage?.completion_tokens??0)),offlineResumeVerified:true};
 results.push(result);reports.push(report);
}
const configs=reports.map(r=>{const c=structuredClone(r.manifest.config);delete c.budget;return c;});assert.deepEqual(configs[0],configs[1]);
const pairs=reports[0].rows.map(before=>{
 const after=reports[1].rows.find(r=>r.day===before.day);assert.ok(after);assert.equal(before.group,after.group);
 const a=structuredClone(before.request),b=structuredClone(after.request),aj=JSON.parse(a.messages[1].content),bj=JSON.parse(b.messages[1].content);
 delete aj.inspectionBudget;delete bj.inspectionBudget;a.messages[1].content=JSON.stringify(aj);b.messages[1].content=JSON.stringify(bj);assert.deepEqual(a,b);
 return {day:before.day,prompt:before.word,group:before.group,withoutExamples:before.outcome.score,withExamples:after.outcome.score,gain:after.outcome.score-before.outcome.score,withoutStatus:before.outcome.status,withStatus:after.outcome.status,inspectedExamples:after.trace.filter(t=>t.action?.type==='inspect_example'&&t.observation.ok).map(t=>({id:t.observation.id,prompt:t.observation.prompt}))};
});
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const gain=mean(pairs.map(p=>p.gain));assert.ok(Math.abs(gain-(results[1].score-results[0].score))<1e-10);
const accountedUsd=results.reduce((sum,r)=>sum+r.accountedUsd,0);assert.ok(accountedUsd<=plan.totalCapUsd);
const validPairs=pairs.filter(p=>p.withoutStatus==='valid'&&p.withStatus==='valid');
const analysis={protocol:plan.protocol,model:plan.model,provider:plan.provider,scope:'exploratory development comparison, not a final evaluation',results,baselines:reports[0].baselines,comparison:{gain,paired95Interval:meanCI(pairs.map(p=>p.gain),pairs.map(p=>p.group)),better:pairs.filter(p=>p.gain>0).length,worse:pairs.filter(p=>p.gain<0).length,tied:pairs.filter(p=>p.gain===0).length,matchedValidTargets:validPairs.length,matchedValidGain:validPairs.length?mean(validPairs.map(p=>p.gain)):null,pairs},reportedCostUsd:results.reduce((sum,r)=>sum+r.costUsd.known,0),accountedUsd,unknownReservations:results.reduce((sum,r)=>sum+r.unknownReservations,0),unknownReservedUsd:results.reduce((sum,r)=>sum+r.unknownReservedUsd,0),capUsd:plan.totalCapUsd,elapsedMinutes:(Date.parse(execution.finishedAt)-Date.parse(execution.startedAt))/60000};
fs.writeFileSync(path.join(here,'analysis.json'),JSON.stringify(analysis,null,2)+'\n');
console.log(JSON.stringify({scores:results.map(r=>({condition:r.condition,score:r.score,valid:r.valid,cost:r.costUsd.known})),gain,interval:analysis.comparison.paired95Interval,accountedUsd}));
