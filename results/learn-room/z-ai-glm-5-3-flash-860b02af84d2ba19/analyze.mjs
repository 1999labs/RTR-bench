import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {buildLearnRoomReport} from '../../../src/tracks/learn-room/report.ts';
import {AGENT_SYSTEM,getAgentPolicy} from '../../../src/tracks/learn-room/agent.ts';

// Offline comparison. Three old runs on the same targets are not 90 independent tasks.
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(dir);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const oldAnalysis=read(path.join(root,'comparisons/glm-5-3-flash-4000-repeats/analysis.json'));
const audit=read(path.join(root,'comparisons/glm-5-3-flash-4000-repeats/audit.json'));
const old=oldAnalysis.runs.map(r=>read(path.join(root,r.directory,'report.json')));
const current=read(path.join(dir,'report.json'));
assert.equal(current.complete,true);
assert.deepEqual(buildLearnRoomReport(dir),current);
for(let i=0;i<old.length;i++)assert.deepEqual(buildLearnRoomReport(path.join(root,oldAnalysis.runs[i].directory)),old[i]);
const expected=structuredClone(old[0].manifest.config);
expected.spending.limitUsd=.125;
expected.agentPolicy='transfer-check-v1';
expected.agentPromptHash=getAgentPolicy('transfer-check-v1').promptHash;
assert.deepEqual(current.manifest.config,expected);
const row=(r,strategy,day)=>r.rows.find(x=>x.strategy===strategy&&x.day===day);
const mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
const summary=xs=>({values:xs,mean:mean(xs),min:Math.min(...xs),max:Math.max(...xs)});
const evidence=r=>r.trace.filter(t=>t.action?.type==='inspect_example'&&t.observation?.ok).map(t=>({id:t.observation.id,prompt:t.observation.prompt,distribution:t.observation.distribution}));
for(const r of current.rows){
  for(const baseline of old){
    const before=row(baseline,r.strategy,r.day);
    const request=structuredClone(r.request);
    if(r.strategy==='agent'){
      assert.equal(request.messages[0].content,getAgentPolicy('transfer-check-v1').system);
      request.messages[0].content=AGENT_SYSTEM;
    } else assert.deepEqual(evidence(r),evidence(before));
    assert.deepEqual(request,before.request);
  }
}
const strategies=current.summaries.map(s=>{
  const oldScores=old.map(r=>r.summaries.find(x=>x.strategy===s.strategy).score);
  const oldGains=old.map(r=>r.summaries.find(x=>x.strategy===s.strategy).score-r.summaries.find(x=>x.strategy==='none').score);
  const gain=s.score-current.summaries.find(x=>x.strategy==='none').score;
  const targets=current.manifest.config.targets.map(day=>{
    const r=row(current,s.strategy,day),control=row(current,'none',day);
    const before=old.map(b=>row(b,s.strategy,day).outcome.score);
    const beforeGains=old.map(b=>row(b,s.strategy,day).outcome.score-row(b,'none',day).outcome.score);
    return {day,word:r.word,observed:r.observed,newPrediction:r.outcome.prediction,newScore:r.outcome.score,oldScores:summary(before),scoreDelta:r.outcome.score-mean(before),newGain:r.outcome.score-control.outcome.score,oldGains:summary(beforeGains),gainDelta:r.outcome.score-control.outcome.score-mean(beforeGains),newEvidence:s.strategy==='agent'?evidence(r):undefined,oldEvidence:s.strategy==='agent'?old.map(b=>evidence(row(b,'agent',day))):undefined};
  });
  assert(Math.abs(mean(targets.map(t=>t.scoreDelta))-(s.score-mean(oldScores)))<1e-10);
  return {strategy:s.strategy,oldScores:summary(oldScores),newScore:s.score,scoreDelta:s.score-mean(oldScores),oldGains:summary(oldGains),newGain:gain,gainDelta:gain-mean(oldGains),targetsImprovedAgainstOldMean:targets.filter(t=>t.scoreDelta>0).length,targetsWorsenedAgainstOldMean:targets.filter(t=>t.scoreDelta<0).length,targetsImprovedAgainstCurrentControl:targets.filter(t=>t.newGain>0).length,targets};
});
const agent=strategies.find(s=>s.strategy==='agent');
const auditGroups=['helped in all runs','harmed in all runs'].map(direction=>{
  const selected=audit.cases.filter(c=>c.direction===direction).map(c=>agent.targets.find(t=>t.day===c.day));
  return {direction,targetCount:selected.length,meanScoreDelta:mean(selected.map(t=>t.scoreDelta)),meanGainDelta:mean(selected.map(t=>t.gainDelta)),newMeanGain:mean(selected.map(t=>t.newGain)),targets:selected.map(({day,word,newScore,oldScores,scoreDelta,newGain,oldGains,gainDelta})=>({day,word,newScore,oldScores,scoreDelta,newGain,oldGains,gainDelta}))};
});
const ledger=read(path.join(dir,'spending.json'));
const attempts=current.rows.flatMap(r=>r.attempts.map(a=>({strategy:r.strategy,day:r.day,word:r.word,status:a.status,error:a.error,completionTokens:a.usage?.completion_tokens,finishReason:a.response?.choices?.[0]?.finish_reason})));
const accounting=ledger.entries.reduce((s,e)=>s+(e.chargedUnits??e.reservedUnits),0)/1e9;
assert(accounting<=.125);assert.equal(attempts.length,ledger.entries.length);
const result={sourceCommit:'3a179de26b6ee994d238bd42ce8721c7754ab05f',runId:current.manifest.id,baselineRunIds:old.map(r=>r.manifest.id),verification:{offlineReplayMatches:true,baselineRequestsAndEvidenceMatch:true,agentInitialRequestDiffersOnlyInSystemPrompt:true,configurationChangesOnlyAgentPolicyPromptAndSpendingCap:true,finalEvaluationTargetsUsed:false},limitations:['One new-policy run versus three historical default-policy runs; differences do not establish a causal or repeatable improvement.','Audit cases were chosen from the historical development results; report all 30 targets to avoid evaluating only those cases.','Agent-selected examples may change under the new prompt, so full-agent comparisons combine selection and evidence-use effects.'],spending:{limitUsd:.125,reportedUsd:current.summaries.reduce((s,x)=>s+x.costUsd.known,0),accountedUsd:accounting,unknownCostRequests:ledger.entries.filter(e=>e.chargedUnits===null).length,httpAttempts:attempts.length},reliability:{summaries:current.summaries,errors:attempts.filter(a=>a.status!=='response'),lengthStops:attempts.filter(a=>a.finishReason==='length'),over2000Tokens:attempts.filter(a=>a.completionTokens>2000),earlySubmissions:current.rows.filter(r=>r.strategy==='agent'&&r.outcome.inspections<3).map(r=>({day:r.day,word:r.word,inspections:r.outcome.inspections,turns:r.agentCalls.length}))},withinRunComparisons:current.comparisons,strategies,auditGroups};
fs.writeFileSync(path.join(dir,'comparison.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({verification:result.verification,spending:result.spending,strategies:strategies.map(({targets,...rest})=>rest),auditGroups,reliability:{valid:current.summaries.reduce((s,x)=>s+x.valid,0),errors:result.reliability.errors,lengthStops:result.reliability.lengthStops,agent:current.summaries.find(s=>s.strategy==='agent'),earlySubmissions:result.reliability.earlySubmissions}},null,2));
