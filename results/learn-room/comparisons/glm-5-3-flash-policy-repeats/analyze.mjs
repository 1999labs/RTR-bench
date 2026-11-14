import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {buildLearnRoomReport} from '../../../../src/tracks/learn-room/report.ts';
import {getAgentPolicy,AGENT_SYSTEM} from '../../../../src/tracks/learn-room/agent.ts';

// Offline comparison: each group contains three runs of the same 30 targets.
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const directories={default:[
  'z-ai-glm-5-3-flash-f6c4db5666d1639d',
  'z-ai-glm-5-3-flash-b9ee92442023a58f',
  'z-ai-glm-5-3-flash-f2d8814acf8f60fa',
],transfer:[
  'z-ai-glm-5-3-flash-860b02af84d2ba19',
  'z-ai-glm-5-3-flash-0b4ca88301445300',
  'z-ai-glm-5-3-flash-53445f782b4d4c0c',
]};
const reports=Object.fromEntries(Object.entries(directories).map(([policy,dirs])=>[policy,dirs.map(d=>{
  const saved=read(path.join(root,d,'report.json'));
  assert.equal(saved.complete,true);
  assert.deepEqual(buildLearnRoomReport(path.join(root,d)),saved);
  assert.equal(saved.manifest.config.agentPolicy??'default',policy==='default'?'default':'transfer-check-v1');
  return saved;
})]));
const mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
const describe=xs=>({values:xs,mean:mean(xs),min:Math.min(...xs),max:Math.max(...xs),sampleSD:Math.sqrt(xs.reduce((s,x)=>s+(x-mean(xs))**2,0)/(xs.length-1))});
const row=(r,s,d)=>r.rows.find(x=>x.strategy===s&&x.day===d);
const baseline=reports.default[0];
const normalize=c=>{const x=structuredClone(c);delete x.replicate;delete x.agentPolicy;delete x.agentPromptHash;delete x.spending.limitUsd;return x;};
const references=r=>r.trace.filter(t=>t.action?.type==='inspect_example'&&t.observation?.ok).map(t=>t.observation);
for(const r of Object.values(reports).flat()){
  assert.deepEqual(normalize(r.manifest.config),normalize(baseline.manifest.config));
  assert.equal(r.manifest.config.partition,'development');assert.equal(r.manifest.config.targets.length,30);
  assert.equal(r.manifest.config.settings.maxTokens,4000);
  assert.equal(r.manifest.config.agentPromptHash,getAgentPolicy(r.manifest.config.agentPolicy).promptHash);
  for(const item of r.rows){
    const old=row(baseline,item.strategy,item.day),request=structuredClone(item.request);
    if(item.strategy==='agent')request.messages[0].content=AGENT_SYSTEM;
    else assert.deepEqual(references(item),references(old));
    assert.deepEqual(request,old.request);
  }
}
const runs=Object.entries(reports).flatMap(([policy,items])=>items.map((r,i)=>{
  const directory=directories[policy][i],ledger=read(path.join(root,directory,'spending.json'));
  const attempts=r.rows.flatMap(x=>x.attempts.map(a=>({strategy:x.strategy,day:x.day,word:x.word,status:a.status,error:a.error,finishReason:a.response?.choices?.[0]?.finish_reason})));
  const accountedUsd=ledger.entries.reduce((s,e)=>s+(e.chargedUnits??e.reservedUnits),0)/1e9;
  assert(accountedUsd<=ledger.policy.limitUsd);assert.equal(attempts.length,ledger.entries.length);
  return {policy,directory,runId:r.manifest.id,replicate:r.manifest.config.replicate??'initial',createdAt:r.manifest.createdAt,completedAt:r.manifest.completedAt,summaries:r.summaries,comparisons:r.comparisons.map(({pairs,...rest})=>rest),cost:{capUsd:ledger.policy.limitUsd,reportedUsd:r.summaries.reduce((s,x)=>s+x.costUsd.known,0),accountedUsd,unknownRequests:ledger.entries.filter(e=>e.chargedUnits===null).length},httpAttempts:attempts.length,errors:attempts.filter(a=>a.status!=='response'),lengthStops:attempts.filter(a=>a.finishReason==='length'),earlySubmissions:r.rows.filter(x=>x.strategy==='agent'&&x.outcome.inspections<3).map(x=>({day:x.day,word:x.word,inspections:x.outcome.inspections}))};
}));
const strategies=baseline.manifest.config.strategies.map(strategy=>{
  const group=policy=>{
    const rs=reports[policy],scores=rs.map(r=>r.summaries.find(s=>s.strategy===strategy).score);
    const gains=rs.map(r=>r.summaries.find(s=>s.strategy===strategy).score-r.summaries.find(s=>s.strategy==='none').score);
    return {scores:describe(scores),gains:describe(gains)};
  };
  const old=group('default'),updated=group('transfer');
  const targets=baseline.manifest.config.targets.map(day=>{
    const forGroup=policy=>({scores:describe(reports[policy].map(r=>row(r,strategy,day).outcome.score)),gains:describe(reports[policy].map(r=>row(r,strategy,day).outcome.score-row(r,'none',day).outcome.score))});
    const a=forGroup('default'),b=forGroup('transfer');
    return {day,word:row(baseline,strategy,day).word,default:a,transfer:b,scoreDelta:b.scores.mean-a.scores.mean,gainDelta:b.gains.mean-a.gains.mean};
  });
  const scoreDelta=updated.scores.mean-old.scores.mean,gainDelta=updated.gains.mean-old.gains.mean;
  assert(Math.abs(scoreDelta-mean(targets.map(t=>t.scoreDelta)))<1e-10);
  return {strategy,default:old,transfer:updated,scoreDelta,gainDelta,targetsImproved:targets.filter(t=>t.scoreDelta>0).length,targetsWorsened:targets.filter(t=>t.scoreDelta<0).length,newPositiveGainsInEveryRun:targets.filter(t=>t.transfer.gains.min>0).length,newNegativeGainsInEveryRun:targets.filter(t=>t.transfer.gains.max<0).length,targets};
});
const agent=strategies.find(s=>s.strategy==='agent');
const audit=read(path.join(root,'comparisons/glm-5-3-flash-4000-repeats/audit.json'));
const auditGroups=['helped in all runs','harmed in all runs'].map(direction=>{
  const targets=audit.cases.filter(c=>c.direction===direction).map(c=>agent.targets.find(t=>t.day===c.day));
  return {direction,targets,meanScoreDelta:mean(targets.map(t=>t.scoreDelta)),meanGainDelta:mean(targets.map(t=>t.gainDelta)),newMeanGain:mean(targets.map(t=>t.transfer.gains.mean))};
});
const fresh=runs.filter(r=>r.policy==='transfer'&&r.replicate!=='initial');
assert.equal(fresh.reduce((s,r)=>s+r.cost.capUsd,0),.25);
const result={verification:{allReportsReplay:true,configurationMatchesExceptPolicyReplicateAndCaps:true,baselineRequestsAndEvidenceMatch:true,agentInitialRequestDiffersOnlyInSystemPrompt:true,finalEvaluationTargetsUsed:false},limitations:['Three runs per policy on the same 30 development targets; repeated outputs do not create independent targets.','Observed ranges and sample standard deviations are descriptive, not confidence intervals.','Policy groups were run sequentially, not randomly interleaved; temporal/provider variation may affect comparisons.','Full-agent comparisons include selection changes and evidence-use changes.','The policy was motivated by these development outcomes; final evaluation remains untouched.'],runs,strategies,auditGroups,freshSpending:{authorizedUsd:.25,reportedUsd:fresh.reduce((s,r)=>s+r.cost.reportedUsd,0),accountedUsd:fresh.reduce((s,r)=>s+r.cost.accountedUsd,0),unknownRequests:fresh.reduce((s,r)=>s+r.cost.unknownRequests,0),httpAttempts:fresh.reduce((s,r)=>s+r.httpAttempts,0)}};
fs.writeFileSync(path.join(here,'analysis.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({runs:runs.map(({summaries,comparisons,...rest})=>({...rest,scores:summaries.map(s=>({strategy:s.strategy,score:s.score,valid:s.valid,inspections:s.inspections,modelCalls:s.modelCalls}))})),strategies:strategies.map(({targets,...rest})=>rest),auditGroups,freshSpending:result.freshSpending},null,2));
