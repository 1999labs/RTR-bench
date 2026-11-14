import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {buildLearnRoomReport} from '../../../../src/tracks/learn-room/report.ts';
import {distributionError,scoreFromError,QUADRANTS} from '../../../../src/shared/distribution.ts';

// Offline diagnostic only: no prompts, model runs, or benchmark scores change.
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const analysis=JSON.parse(fs.readFileSync(path.join(here,'analysis.json')));
const reports=analysis.runs.map(run=>{
  const dir=path.join(root,run.directory);
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'report.json')));
  assert.deepEqual(buildLearnRoomReport(dir),saved);
  return saved;
});
const stats=analysis.strategies.find(s=>s.strategy==='agent').targets;
const helped=stats.filter(t=>t.pairedGains.min>0).sort((a,b)=>b.pairedGains.mean-a.pairedGains.mean);
const harmed=stats.filter(t=>t.pairedGains.max<0).sort((a,b)=>a.pairedGains.mean-b.pairedGains.mean).slice(0,5);
assert.equal(helped.length,5);assert.equal(harmed.length,5);
const mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
const meanPrediction=predictions=>Object.fromEntries(QUADRANTS.map(q=>[q,mean(predictions.map(p=>p[q]))]));
const axes=p=>({performed:p['performed+uniting']+p['performed+dividing'],dividing:p['performed+dividing']+p['honest+dividing']});
const cases=[...helped,...harmed].map(t=>{
  const runs=reports.map((r,i)=>{
    const row=r.rows.find(x=>x.strategy==='agent'&&x.day===t.day);
    const none=r.rows.find(x=>x.strategy==='none'&&x.day===t.day);
    const evidence=row.trace.filter(t=>t.action?.type==='inspect_example'&&t.observation?.ok).map(t=>({id:t.observation.id,prompt:t.observation.prompt,distribution:t.observation.distribution,submissions:t.observation.submissions}));
    assert.equal(new Set(evidence.map(e=>e.id)).size,evidence.length);
    const referenceAverage=meanPrediction(evidence.map(e=>e.distribution));
    assert(Math.abs(scoreFromError(distributionError(row.outcome.prediction,row.observed))-row.outcome.score)<1e-10);
    return {runId:r.manifest.id,replicate:r.manifest.config.replicate??'initial',directory:analysis.runs[i].directory,observed:row.observed,noExamples:{prediction:none.outcome.prediction,score:none.outcome.score},agent:{prediction:row.outcome.prediction,score:row.outcome.score,inspections:row.outcome.inspections},evidence,referenceAverageDiagnostic:{prediction:referenceAverage,score:scoreFromError(distributionError(referenceAverage,row.observed))},gain:row.outcome.score-none.outcome.score};
  });
  const none=meanPrediction(runs.map(r=>r.noExamples.prediction));
  const agent=meanPrediction(runs.map(r=>r.agent.prediction));
  return {day:t.day,word:t.word,direction:t.pairedGains.min>0?'helped in all runs':'harmed in all runs',meanGain:mean(runs.map(r=>r.gain)),gainRange:[t.pairedGains.min,t.pairedGains.max],meanScores:{noExamples:mean(runs.map(r=>r.noExamples.score)),agent:mean(runs.map(r=>r.agent.score)),referenceAverageDiagnostic:mean(runs.map(r=>r.referenceAverageDiagnostic.score))},observed:runs[0].observed,meanPredictions:{noExamples:none,agent},marginals:{observed:axes(runs[0].observed),noExamples:axes(none),agent:axes(agent)},runs};
});
const audit={scope:'Post-hoc audit of all five consistently helped targets and the five largest mean losses among consistently harmed targets, over three 4000-token development runs.',limitations:['No-example responses are separate conversations, not the agent’s recorded pre-evidence beliefs.','Actions, observations, and final probabilities do not establish the causal reason for a model decision.','Reference averaging is an untuned descriptive diagnostic, not a new official score or a measure of semantic relevance.','Target labels are used only in this offline audit and never supplied as new model evidence.'],verification:{savedReportsReplay:true,caseCount:cases.length,episodesReviewed:cases.reduce((s,c)=>s+c.runs.length,0),newApiCalls:0,finalEvaluationTargetsUsed:false},cases};
fs.writeFileSync(path.join(here,'audit.json'),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({verification:audit.verification,cases:cases.map(({day,word,direction,meanGain,meanScores,marginals})=>({day,word,direction,meanGain,meanScores,marginals}))},null,2));
