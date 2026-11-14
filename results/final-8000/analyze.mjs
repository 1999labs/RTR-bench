// Offline verification of completed runs only. Active runs are left untouched.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));const output=fileURLToPath(new URL('./',import.meta.url));
const plan=JSON.parse(fs.readFileSync(path.join(root,'docs/final-run-plan-8000.json')));
const {buildLearnRoomReport}=await import(path.join(root,'src/tracks/learn-room/report.ts'));
const {runLearnRoom}=await import(path.join(root,'src/tracks/learn-room/run.ts'));
const {loadDistributionData}=await import(path.join(root,'src/shared/dataset.ts'));const data=loadDistributionData();
const never=async()=>{throw new Error('Network forbidden during offline verification');};globalThis.fetch=never;
const results=[];
for(const m of plan.models){
 const modelRoot=path.join(output,m.model.replace('/','__'));if(!fs.existsSync(modelRoot))continue;
 const dirs=fs.readdirSync(modelRoot).filter(f=>fs.existsSync(path.join(modelRoot,f,'manifest.json')));assert.equal(dirs.length,1,'Multiple run identities need review');
 const dir=path.join(modelRoot,dirs[0]);const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
 if(manifest.status!=='complete'){console.log('Skipping incomplete',m.model);continue;}
 const report=buildLearnRoomReport(dir),c=report.manifest.config;
 assert.equal(report.complete,true);assert.equal(c.mode,'api');assert.equal(c.model,m.model);assert.equal(c.provider,m.provider);
 assert.equal(c.partition,'evaluation');assert.deepEqual(c.targets,plan.protocol.targets);assert.deepEqual(c.reference,plan.protocol.reference);
 assert.equal(c.datasetHash,plan.protocol.datasetHash);assert.equal(c.splitHash,plan.protocol.splitHash);assert.equal(c.version,plan.runnerVersion);
 assert.deepEqual(c.strategies,plan.protocol.strategies);assert.equal(c.budget,3);assert.equal(c.seed,7);assert.equal(c.maxModelCalls,8);assert.equal(c.maxActions,8);assert.equal(c.agentPolicy,'transfer-check-v1');
 assert.equal(c.settings.maxTokens,8000);assert.equal(c.settings.maxAttempts,3);assert.equal(c.settings.timeoutMs,60000);assert.equal(c.settings.temperature,m.temperatureSupported?0:null);
 assert.equal(c.spending.limitUsd,m.capUsd);assert.equal(c.spending.providerTag,m.provider);
 assert.equal(report.rows.length,180);
 const summaries=report.summaries.map(s=>{
  const rows=report.rows.filter(r=>r.strategy===s.strategy);
  const independent=rows.reduce((n,r)=>{if(r.outcome.status!=='valid')return n;const w=data.windows.find(w=>w.day===r.day);const p=r.outcome.prediction;const keys=['performed+uniting','honest+uniting','performed+dividing','honest+dividing'];const positions=['tl','tr','bl','br'];return n+100*(1-keys.reduce((e,key,i)=>e+(p[key]-w.counts[positions[i]]/w.n)**2,0)/2);},0)/45;
  assert.ok(Math.abs(independent-s.score)<1e-10);return {strategy:s.strategy,score:s.score,scoreCI:s.scoreCI,valid:s.valid,invalid:s.invalid,missing:s.missing,pending:s.pending,costUsd:s.costUsd,apiCalls:s.apiCalls,modelCalls:s.modelCalls,inspections:s.inspections};
 });
 const comparison=report.comparisons.find(c=>c.strategy==='agent'&&c.control==='none');assert.ok(comparison);
 const none=summaries.find(s=>s.strategy==='none'),agent=summaries.find(s=>s.strategy==='agent');assert.ok(Math.abs(comparison.scoreGain-(agent.score-none.score))<1e-10);
 const attempts=report.rows.flatMap(r=>r.attempts),ledger=JSON.parse(fs.readFileSync(path.join(dir,'spending.json')));assert.equal(ledger.entries.length,attempts.length);
 const accountedUsd=ledger.entries.reduce((n,e)=>n+(e.chargedUnits??e.reservedUnits),0)/1e9;assert.ok(accountedUsd<=m.capUsd);
 const originalReport=fs.readFileSync(path.join(dir,'report.json'),'utf8');assert.deepEqual(JSON.parse(originalReport),report);
 const resumed=await runLearnRoom({model:m.model,provider:m.provider,partition:'evaluation',limit:45,strategy:'all',budget:3,seed:7,maxModelCalls:8,maxTokens:8000,agentPolicy:'transfer-check-v1',maxUsd:m.capUsd,output:modelRoot},never);
 assert.equal(resumed.dir,dir);assert.equal(fs.readFileSync(path.join(dir,'report.json'),'utf8'),originalReport);
 const start=Math.min(...attempts.map(a=>Date.parse(a.startedAt))),end=Math.max(...attempts.filter(a=>a.finishedAt).map(a=>Date.parse(a.finishedAt)));
 const result={model:m.model,provider:m.provider,quantization:m.quantization,directory:path.relative(root,dir),summaries,learnGain:comparison.scoreGain,learnGainCI:comparison.scoreGainCI,baselines:report.baselines,valid:summaries.reduce((n,s)=>n+s.valid,0),total:180,apiCalls:attempts.length,reportedCostUsd:summaries.reduce((n,s)=>n+s.costUsd.known,0),accountedUsd,capUsd:m.capUsd,unknownReservations:ledger.entries.filter(e=>e.chargedUnits===null).length,unbilledRateLimits:ledger.entries.filter(e=>e.costBasis?.startsWith('unbilled-rate-limit')).length,apiErrors:attempts.filter(a=>a.status==='error').length,lengthStops:attempts.filter(a=>a.response?.choices?.some(c=>c.finish_reason==='length')).length,maxCompletionTokens:Math.max(...attempts.map(a=>a.usage?.completion_tokens??0)),actualProviders:[...new Set(attempts.flatMap(a=>a.provider?[a.provider]:[]))],elapsedMinutes:(end-start)/60000,offlineResumeVerified:true};
 results.push(result);console.log(m.model,'verified',result.valid+'/180','cost',result.reportedCostUsd);
}
fs.writeFileSync(path.join(output,'verified-results.json'),JSON.stringify({protocol:plan.protocol,results},null,2)+'\n');
