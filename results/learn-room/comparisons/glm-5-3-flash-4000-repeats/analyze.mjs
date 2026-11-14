import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {buildLearnRoomReport} from '../../../../src/tracks/learn-room/report.ts';

// Offline only. Recompute from the three frozen runs, preserving target pairing.
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const directories=[
  'z-ai-glm-5-3-flash-f6c4db5666d1639d',
  'z-ai-glm-5-3-flash-b9ee92442023a58f',
  'z-ai-glm-5-3-flash-f2d8814acf8f60fa',
];
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const reports=directories.map(d=>{
  const r=read(path.join(root,d,'report.json'));
  assert.equal(r.complete,true);
  assert.deepEqual(buildLearnRoomReport(path.join(root,d)),r);
  return r;
});
const configs=reports.map(r=>{
  const c=structuredClone(r.manifest.config);delete c.replicate;delete c.spending.limitUsd;return c;
});
configs.forEach(c=>assert.deepEqual(c,configs[0]));
assert.equal(configs[0].partition,'development');
assert.equal(configs[0].settings.maxTokens,4000);
assert.equal(configs[0].targets.length,30);
for(const r of reports)for(const row of r.rows){
  const first=reports[0].rows.find(x=>x.day===row.day&&x.strategy===row.strategy);
  assert.deepEqual(row.request,first.request);
  if(row.strategy!=='agent'){
    const inspections=trace=>trace.filter(t=>t.action?.type==='inspect_example');
    assert.deepEqual(inspections(row.trace),inspections(first.trace));
  }
}
const mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
const describe=xs=>({values:xs,mean:mean(xs),min:Math.min(...xs),max:Math.max(...xs),sampleSD:Math.sqrt(xs.reduce((s,x)=>s+(x-mean(xs))**2,0)/(xs.length-1))});
const rowFor=(r,strategy,day)=>r.rows.find(x=>x.strategy===strategy&&x.day===day);
const runs=reports.map((r,i)=>{
  const ledger=read(path.join(root,directories[i],'spending.json'));
  const attempts=r.rows.flatMap(row=>row.attempts);
  const accountedUsd=ledger.entries.reduce((s,e)=>s+(e.chargedUnits??e.reservedUnits),0)/1e9;
  assert(accountedUsd<=ledger.policy.limitUsd);
  assert.equal(attempts.length,ledger.entries.length);
  return {directory:directories[i],runId:r.manifest.id,replicate:r.manifest.config.replicate??'initial',createdAt:r.manifest.createdAt,completedAt:r.manifest.completedAt,summaries:r.summaries,comparisons:r.comparisons.map(({pairs,...rest})=>rest),spending:{limitUsd:ledger.policy.limitUsd,reportedUsd:r.summaries.reduce((s,x)=>s+x.costUsd.known,0),accountedUsd,unknownCostRequests:ledger.entries.filter(e=>e.chargedUnits===null).length},httpAttempts:attempts.length,transportErrors:attempts.filter(a=>a.status!=='response').length,lengthStops:attempts.filter(a=>a.response?.choices?.[0]?.finish_reason==='length').length,over2000Tokens:attempts.filter(a=>a.usage?.completion_tokens>2000).length,earlySubmissions:r.rows.filter(row=>row.strategy==='agent'&&row.outcome.inspections<3).map(row=>({day:row.day,word:row.word,inspections:row.outcome.inspections}))};
});
const strategies=configs[0].strategies.map(strategy=>{
  const scores=reports.map(r=>r.summaries.find(s=>s.strategy===strategy).score);
  const gains=reports.map(r=>r.summaries.find(s=>s.strategy===strategy).score-r.summaries.find(s=>s.strategy==='none').score);
  const targets=configs[0].targets.map(day=>{
    const rows=reports.map(r=>rowFor(r,strategy,day));
    const pairedGains=rows.map((row,i)=>row.outcome.score-rowFor(reports[i],'none',day).outcome.score);
    return {day,word:rows[0].word,scores:describe(rows.map(row=>row.outcome.score)),pairedGains:describe(pairedGains),predictionIdenticalAcrossAllRuns:rows.every(row=>JSON.stringify(row.outcome.prediction)===JSON.stringify(rows[0].outcome.prediction))};
  });
  return {strategy,scores:describe(scores),pairedGains:describe(gains),runsWithPositiveGain:gains.filter(g=>g>0).length,targetsImprovedInAllRuns:targets.filter(t=>t.pairedGains.min>0).length,targetsWorsenedInAllRuns:targets.filter(t=>t.pairedGains.max<0).length,targetsWithIdenticalPredictions:targets.filter(t=>t.predictionIdenticalAcrossAllRuns).length,meanWithinTargetScoreSD:mean(targets.map(t=>t.scores.sampleSD)),targets};
});
const selected=row=>row.trace.filter(t=>t.action?.type==='inspect_example'&&t.observation?.ok).map(t=>t.action.id);
const agentEvidence=configs[0].targets.map(day=>{
  const sequences=reports.map(r=>selected(rowFor(r,'agent',day)));
  return {day,word:rowFor(reports[0],'agent',day).word,sequences,identicalAcrossAllRuns:sequences.every(s=>JSON.stringify(s)===JSON.stringify(sequences[0]))};
});
const newRuns=runs.slice(1);
assert.equal(newRuns.reduce((s,r)=>s+r.spending.limitUsd,0),.25);
const analysis={protocol:'learn-room 4000-token development repeatability',verification:{offlineReplayMatches:true,requestsMatch:true,automaticEvidenceMatches:true,configurationDifferencesOnlyReplicateAndSpendingCap:true,finalEvaluationTargetsUsed:false},interpretation:'Three runs on the same 30 targets. Ranges and sample SDs describe observed repeatability, not population confidence intervals. Repeated predictions do not add independent targets. The 2000-token run is excluded.',runs,strategies,agentEvidence,newRunsSpending:{authorizedUsd:.25,reportedUsd:newRuns.reduce((s,r)=>s+r.spending.reportedUsd,0),accountedUsd:newRuns.reduce((s,r)=>s+r.spending.accountedUsd,0),unknownCostRequests:newRuns.reduce((s,r)=>s+r.spending.unknownCostRequests,0),httpAttempts:newRuns.reduce((s,r)=>s+r.httpAttempts,0)}};
fs.writeFileSync(path.join(here,'analysis.json'),JSON.stringify(analysis,null,2)+'\n');
console.log(JSON.stringify({runs:runs.map(r=>({replicate:r.replicate,scores:r.summaries.map(s=>({strategy:s.strategy,score:s.score,valid:s.valid})),spending:r.spending,httpAttempts:r.httpAttempts,transportErrors:r.transportErrors,lengthStops:r.lengthStops,earlySubmissions:r.earlySubmissions})),strategies:strategies.map(({targets,...rest})=>rest),agentEvidenceIdentical:agentEvidence.filter(x=>x.identicalAcrossAllRuns).length,newRunsSpending:analysis.newRunsSpending},null,2));
