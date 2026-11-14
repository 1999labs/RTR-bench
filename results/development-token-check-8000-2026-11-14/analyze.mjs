import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const output=fileURLToPath(new URL('./',import.meta.url));
const plan=JSON.parse(fs.readFileSync(path.join(output,'plan.json')));
const {buildLearnRoomReport}=await import(path.join(root,'src/tracks/learn-room/report.ts'));
const {runLearnRoom}=await import(path.join(root,'src/tracks/learn-room/run.ts'));
const never=async()=>{throw new Error('Network forbidden during offline verification');};globalThis.fetch=never;
const results=[];
const normalizeConfig=c=>{const {spending,...rest}=structuredClone(c);delete rest.settings.maxTokens;return rest;};
const normalizeRequest=r=>{const copy=structuredClone(r);delete copy.max_tokens;if(copy.provider)delete copy.provider.max_price;return copy;};
function metrics(report){
 const attempts=report.rows.flatMap(r=>r.attempts);
 const timings=attempts.filter(a=>a.finishedAt).map(a=>(Date.parse(a.finishedAt)-Date.parse(a.startedAt))/1000);
 return {complete:report.complete,valid:report.summaries.reduce((n,s)=>n+s.valid,0),total:report.rows.length,apiCalls:attempts.length,costUsd:report.summaries.reduce((n,s)=>n+s.costUsd.known,0),lengthStops:attempts.filter(a=>a.response?.choices?.some(c=>c.finish_reason==='length')).length,apiErrors:attempts.filter(a=>a.status==='error').map(a=>({httpStatus:a.httpStatus,errorType:a.response?.error?.metadata?.error_type??a.response?.error?.metadata?.provider_error_code??null})),maxCompletionTokens:Math.max(...attempts.map(a=>a.usage?.completion_tokens??0)),responsesAbove4000:attempts.filter(a=>(a.usage?.completion_tokens??0)>4000).length,maxRequestSeconds:Math.max(...timings),conditions:report.summaries.map(s=>({strategy:s.strategy,valid:s.valid,invalid:s.invalid,missing:s.missing,pending:s.pending})),rows:report.rows.map(r=>({day:r.day,strategy:r.strategy,status:r.outcome?.status??'pending',lengthStops:r.attempts.filter(a=>a.response?.choices?.some(c=>c.finish_reason==='length')).length,maxCompletionTokens:Math.max(0,...r.attempts.map(a=>a.usage?.completion_tokens??0))}))};
}
for(const m of plan.models){
 const modelRoot=path.join(output,m.model.replace('/','__'));
 const dirs=fs.readdirSync(modelRoot).filter(f=>fs.existsSync(path.join(modelRoot,f,'manifest.json')));assert.equal(dirs.length,1);
 const dir=path.join(modelRoot,dirs[0]),report=buildLearnRoomReport(dir),before=buildLearnRoomReport(path.join(root,m.previousDirectory));
 assert.equal(report.manifest.config.settings.maxTokens,8000);assert.equal(before.manifest.config.settings.maxTokens,4000);
 assert.deepEqual(normalizeConfig(report.manifest.config),normalizeConfig(before.manifest.config));
 assert.deepEqual(report.manifest.config.spending,m.spending);
 for(const row of report.rows){const old=before.rows.find(r=>r.day===row.day&&r.strategy===row.strategy);assert.deepEqual(normalizeRequest(row.request),normalizeRequest(old.request));}
 const ledger=JSON.parse(fs.readFileSync(path.join(dir,'spending.json')));
 const current=metrics(report),previous=metrics(before);
 assert.equal(ledger.entries.length,current.apiCalls);
 const accountedUsd=ledger.entries.reduce((n,e)=>n+(e.chargedUnits??e.reservedUnits),0)/1e9;assert.ok(accountedUsd<=m.capUsd);
 let offlineResumeVerified=false;
 if(report.complete){
  const saved=fs.readFileSync(path.join(dir,'report.json'),'utf8');
  const resumed=await runLearnRoom({model:m.model,provider:m.provider,partition:'development',limit:3,strategy:'all',budget:3,seed:7,maxModelCalls:8,maxTokens:8000,agentPolicy:'transfer-check-v1',maxUsd:m.capUsd,output:modelRoot},never);
  assert.equal(resumed.dir,dir);assert.equal(fs.readFileSync(path.join(dir,'report.json'),'utf8'),saved);offlineResumeVerified=true;
 }
 results.push({model:m.model,provider:m.provider,previous,current,accountedUsd,capUsd:m.capUsd,unknownReservations:ledger.entries.filter(e=>e.chargedUnits===null).length,unbilledRateLimits:ledger.entries.filter(e=>e.costBasis?.startsWith('unbilled-rate-limit')).length,offlineResumeVerified,directory:path.relative(root,dir)});
}
const analysis={results,reportedCostUsd:results.reduce((n,r)=>n+r.current.costUsd,0),accountedUsd:results.reduce((n,r)=>n+r.accountedUsd,0),capUsd:plan.capUsd,totalCalls:results.reduce((n,r)=>n+r.current.apiCalls,0),allComplete:results.every(r=>r.current.complete),allValid:results.every(r=>r.current.valid===12)};
fs.writeFileSync(path.join(output,'analysis.json'),JSON.stringify(analysis,null,2)+'\n');
console.log(JSON.stringify({...analysis,results:results.map(r=>({model:r.model,previousValid:r.previous.valid,currentValid:r.current.valid,lengthStops:r.current.lengthStops,maxCompletionTokens:r.current.maxCompletionTokens,responsesAbove4000:r.current.responsesAbove4000,unknownReservations:r.unknownReservations,offlineResumeVerified:r.offlineResumeVerified}))},null,2));
