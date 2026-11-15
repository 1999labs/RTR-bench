// Approved eleven-model campaign. Sequential allocation of the shared remainder
// lets each model use available funds without exceeding the overall ceiling.
import '../src/env.ts';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {runLearnRoom} from '../src/tracks/learn-room/run.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const file='results/final-8000/shared-campaign.json',lock=file+'.lock';
const planFile=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)).plan:'docs/final-campaign-shared-budget.json';
assert.ok(['docs/final-campaign-shared-budget.json','docs/final-campaign-price-amendment.json','docs/final-campaign-provider-amendment.json'].includes(planFile));
const planRaw=fs.readFileSync(planFile),plan=JSON.parse(planRaw);
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const totalUnits=Math.floor(plan.limitUsd*1e9);
const ledgerUnits=p=>{const entries=read(p).entries;assert.ok(entries.every(e=>Number.isSafeInteger(e.reservedUnits)&&e.reservedUnits>=0&&(e.chargedUnits===null||Number.isSafeInteger(e.chargedUnits)&&e.chargedUnits>=0)));return entries.reduce((s,e)=>s+(e.chargedUnits??e.reservedUnits),0);};
const frozenUnits=()=>plan.closedRuns.reduce((sum,r)=>{const p=path.join(r.directory,'spending.json');assert.equal(hash(fs.readFileSync(p)),r.ledgerSha256,'Closed run changed');assert.equal(ledgerUnits(p),r.accountedUnits);return sum+r.accountedUnits;},0);
assert.equal(plan.limitUsd,10);assert.equal(plan.authorizedModels.length,11);assert.equal(new Set(plan.remaining.map(m=>m.model)).size,plan.remaining.length);
assert.ok(process.argv.slice(2).every(a=>a==='--run'||a==='--check'),'Use --check or --run');
assert.equal(plan.protocol.maxTokens,8000);assert.equal(plan.protocol.budget,3);assert.equal(plan.protocol.maxModelCalls,8);
if(!process.argv.includes('--run')){
 const state=fs.existsSync(file)?read(file):{runs:[]};
 const currentUnits=frozenUnits()+state.runs.reduce((sum,r)=>{
  const dirs=r.directory?[r.directory]:fs.existsSync(r.output)?fs.readdirSync(r.output).map(d=>path.join(r.output,d)).filter(d=>fs.existsSync(path.join(d,'manifest.json'))&&read(path.join(d,'manifest.json')).config.spending?.limitUsd===r.limitUsd&&read(path.join(d,'manifest.json')).config.provider===r.provider):[];
  assert.ok(dirs.length<=1);return sum+(dirs.length?ledgerUnits(path.join(dirs[0],'spending.json')):0);
 },0);
 assert.ok(currentUnits<=totalUnits);
 console.log(JSON.stringify({limitUsd:plan.limitUsd,openingAccountedUsd:frozenUnits()/1e9,currentAccountedUsd:currentUnits/1e9,remainingUsd:(totalUnits-currentUnits)/1e9,remainingModels:plan.remaining.filter(m=>!state.runs.some(r=>r.model===m.model&&r.complete)).map(m=>m.model),mode:'offline check; no requests'},null,2));
 process.exit(0);
}
const fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));
try{
 const state=fs.existsSync(file)?read(file):{version:plan.version,plan:planFile,planSha256:hash(planRaw),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),limitUsd:plan.limitUsd,startedAt:new Date().toISOString(),status:'running',runs:[]};
 assert.equal(state.planSha256,hash(planRaw));
 const save=()=>{fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
 const folder=r=>{
  const matches=fs.existsSync(r.output)?fs.readdirSync(r.output).map(d=>path.join(r.output,d)).filter(d=>fs.existsSync(path.join(d,'manifest.json'))&&read(path.join(d,'manifest.json')).config.spending?.limitUsd===r.limitUsd&&read(path.join(d,'manifest.json')).config.provider===r.provider):[];
  assert.ok(matches.length<=1,'Ambiguous saved campaign run');return matches[0];
 };
 const spent=r=>{const d=folder(r);if(!d)return 0;assert.ok(fs.existsSync(path.join(d,'spending.json')),'Saved campaign ledger missing');return ledgerUnits(path.join(d,'spending.json'));};
 state.status='running';delete state.error;save();
 for(const item of plan.remaining){
  assert.ok(plan.authorizedModels.includes(item.model));
  let r=state.runs.find(r=>r.model===item.model);
  if(r?.complete){assert.equal(hash(fs.readFileSync(path.join(r.directory,'spending.json'))),r.ledgerSha256);continue;}
  const otherUnits=frozenUnits()+state.runs.filter(x=>x!==r).reduce((s,x)=>s+spent(x),0);
  if(!r){
   assert.ok(otherUnits<totalUnits,'Shared budget exhausted');
   r={model:item.model,provider:item.provider,quantization:item.quantization,output:item.output,limitUsd:(totalUnits-otherUnits)/1e9,allocatedAfterAccountedUsd:otherUnits/1e9,spending:{...item.snapshot.spending,limitUsd:(totalUnits-otherUnits)/1e9},startedAt:new Date().toISOString(),complete:false};state.runs.push(r);save();
  }
  assert.ok(otherUnits+Math.floor(r.limitUsd*1e9)<=totalUnits,'Shared budget overallocated');
  assert.ok(otherUnits+spent(r)<=totalUnits,'Shared budget exceeded');
  state.currentModel=r.model;save();console.log('START',r.model,'shared remaining allowance',r.limitUsd);
  try{
   const {dir,report}=await runLearnRoom({model:r.model,provider:r.provider,partition:'evaluation',limit:45,strategy:'all',budget:3,seed:7,maxModelCalls:8,maxTokens:8000,agentPolicy:'transfer-check-v1',spending:r.spending,output:r.output});
   assert.ok(report.complete);r.directory=dir;r.complete=true;r.finishedAt=new Date().toISOString();r.ledgerSha256=hash(fs.readFileSync(path.join(dir,'spending.json')));r.summaries=report.summaries;
   state.accountedUsd=(frozenUnits()+state.runs.reduce((s,x)=>s+spent(x),0))/1e9;assert.ok(state.accountedUsd<=plan.limitUsd);save();console.log('COMPLETE',r.model,'campaign accounted',state.accountedUsd);
  }catch(error){r.directory=folder(r);state.status='stopped-for-review';state.error=String(error);state.stoppedAt=new Date().toISOString();save();throw error;}
 }
 state.status='complete';state.finishedAt=new Date().toISOString();delete state.currentModel;save();console.log('CAMPAIGN COMPLETE');
}finally{fs.closeSync(fd);fs.unlinkSync(lock);}
