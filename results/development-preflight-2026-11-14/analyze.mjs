import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const {fileURLToPath}=await import('node:url');
const root=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const {buildLearnRoomReport}=await import(root+'/src/tracks/learn-room/report.ts');
const {runLearnRoom}=await import(root+'/src/tracks/learn-room/run.ts');
const plan=JSON.parse(fs.readFileSync(root+'/docs/development-pilot-2026-11-14.json'));
const output=path.join(root,plan.output);const results=[];
const never=async()=>{throw new Error('Unexpected network request during offline resume verification');};
globalThis.fetch=never;
for(const model of plan.models){
 const modelRoot=path.join(output,model.model.replace('/','__'));
 const directories=fs.existsSync(modelRoot)?fs.readdirSync(modelRoot).filter(f=>fs.existsSync(path.join(modelRoot,f,'manifest.json'))):[];
 assert.equal(directories.length,1,model.model+' has no unique run');
 const dir=path.join(modelRoot,directories[0]),report=buildLearnRoomReport(dir),config=report.manifest.config;
 assert.deepEqual(config.targets,[100,101,102]);assert.equal(config.partition,'development');assert.equal(config.settings.maxTokens,4000);assert.equal(config.agentPolicy,'transfer-check-v1');assert.equal(config.spending.limitUsd,model.capUsd);assert.equal(config.provider,model.provider);
 const attempts=report.rows.flatMap(r=>r.attempts);
 const ledger=JSON.parse(fs.readFileSync(path.join(dir,'spending.json')));
 assert.equal(ledger.entries.length,attempts.length);
 const expectedPolicy=model.spending;
 const pricingMatchesPlan=JSON.stringify(config.spending)===JSON.stringify(expectedPolicy);
 if(!pricingMatchesPlan){
  const {inputUsdPerToken:actualInput,outputUsdPerToken:actualOutput,...actualRest}=config.spending;
  const {inputUsdPerToken:plannedInput,outputUsdPerToken:plannedOutput,...plannedRest}=expectedPolicy;
  assert.deepEqual(actualRest,plannedRest,'Non-price provider configuration changed');
  assert.ok(actualInput<=plannedInput&&actualOutput<=plannedOutput,'Actual price ceiling exceeds the plan');
 }
 const result={model:model.model,provider:model.provider,pricingMatchesPlan,actualSpendingPolicy:config.spending,complete:report.complete,valid:report.summaries.reduce((n,s)=>n+s.valid,0),total:12,attempts:attempts.length,errors:attempts.filter(a=>a.status==='error').length,lengthStops:attempts.filter(a=>a.response?.choices?.some(c=>c.finish_reason==='length')).length,costUsd:report.summaries.reduce((n,s)=>n+s.costUsd.known,0),accountedUsd:ledger.entries.reduce((n,e)=>n+(e.chargedUnits??e.reservedUnits),0)/1e9,unknownReservations:ledger.entries.filter(e=>e.chargedUnits===null).length,unbilledRateLimits:ledger.entries.filter(e=>e.costBasis?.startsWith('unbilled-rate-limit')).length,capUsd:model.capUsd,actualProviders:[...new Set(attempts.flatMap(a=>a.provider?[a.provider]:[]))],conditions:report.summaries.map(s=>({strategy:s.strategy,valid:s.valid,invalid:s.invalid,missing:s.missing,pending:s.pending})),directory:path.relative(root,dir)};
 if(report.complete){
  const before=fs.readFileSync(path.join(dir,'report.json'),'utf8');
  const resumed=await runLearnRoom({model:model.model,provider:model.provider,partition:'development',limit:3,strategy:'all',budget:3,seed:7,maxModelCalls:8,maxTokens:4000,agentPolicy:'transfer-check-v1',maxUsd:model.capUsd,output:modelRoot},never);
  assert.equal(resumed.dir,dir);assert.equal(fs.readFileSync(path.join(dir,'report.json'),'utf8'),before);result.offlineResumeVerified=true;
 }
 results.push(result);
}
const result={plan:'docs/development-pilot-2026-11-14.json',results,totalCalls:results.reduce((n,r)=>n+r.attempts,0),reportedCostUsd:results.reduce((n,r)=>n+r.costUsd,0),accountedUsd:results.reduce((n,r)=>n+r.accountedUsd,0),capUsd:plan.capUsd,allComplete:results.every(r=>r.complete),allValid:results.every(r=>r.valid===12)};
fs.writeFileSync(path.join(output,'analysis.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
