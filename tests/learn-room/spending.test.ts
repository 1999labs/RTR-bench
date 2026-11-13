import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openSpendingLedger,spendingProvider,SpendingLimitError,type SpendingPolicy} from '../../src/shared/spending.ts';
import {runLearnRoom} from '../../src/tracks/learn-room/run.ts';
import {uniform} from '../../src/shared/distribution.ts';
const policy:SpendingPolicy={version:'reserved-context-v1',limitUsd:.025,providerTag:'mock/endpoint',contextTokens:262000,inputUsdPerToken:.000000075,outputUsdPerToken:.00000025};
const temp=(t:any)=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-spend-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;};
const request={model:'mock/model',messages:[],temperature:0,max_tokens:2000,usage:{include:true},provider:spendingProvider(policy)};

test('reserve before dispatch, persist unknown costs across resumes, and enforce exact provider price ceilings',t=>{
  const file=path.join(temp(t),'spending.json'),ledger=openSpendingLedger(file,policy);
  ledger.reserve(request);
  assert.equal(ledger.summary().accountedUsd,.02015);
  assert.throws(()=>ledger.reserve(request),SpendingLimitError);
  const resumed=openSpendingLedger(file,policy);assert.equal(resumed.summary().unknownCostRequests,1);
  assert.throws(()=>resumed.reserve(request),SpendingLimitError);
  resumed.settle(0,{cost:.0001});assert.equal(resumed.summary().accountedUsd,.0001);
  resumed.reserve(request);assert.equal(resumed.summary().requests,2);
  assert.throws(()=>resumed.reserve({...request,provider:{order:['other'],allow_fallbacks:true}}),/pinned provider/);
});

test('budget rejects oversize requests and stops after a provider exceeds its reservation',t=>{
  const ledger=openSpendingLedger(path.join(temp(t),'spending.json'),policy);
  assert.throws(()=>ledger.reserve({...request,messages:[{role:'user',content:'x'.repeat(262000)}]}),SpendingLimitError);
  assert.equal(ledger.summary().requests,0);
  const id=ledger.reserve(request);
  assert.throws(()=>ledger.settle(id,{cost:.03}),/exceeded/);
  assert.throws(()=>ledger.reserve(request),SpendingLimitError);
});

test('runner stops before a disallowed paid call and can report incomplete agent work (mock only)',async t=>{
  const output=temp(t),old=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='mock-only';
  t.after(()=>{if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old;});
  let calls=0;
  const client=async()=>{calls++;return {status:'response' as const,finishedAt:new Date().toISOString(),raw:JSON.stringify(uniform()),response:{},provider:'Mock',usage:null,error:null,retriable:false};};
  await assert.rejects(runLearnRoom({model:'mock/model',provider:'Mock',strategy:'none',limit:2,spending:policy,output},client),SpendingLimitError);
  assert.equal(calls,1);
  await assert.rejects(runLearnRoom({model:'mock/model',provider:'Mock',strategy:'none',limit:2,spending:policy,output},client),SpendingLimitError);
  assert.equal(calls,1);
  const zero={...policy,limitUsd:.001};
  await assert.rejects(runLearnRoom({model:'mock/model',provider:'Mock',strategy:'agent',limit:1,spending:zero,output},client),SpendingLimitError);
  assert.equal(calls,1);
});

test('only explicit unbilled rate-limit rejections release unknown reservations',t=>{
  const ledger=openSpendingLedger(path.join(temp(t),'spending.json'),policy);
  const id=ledger.reserve(request);
  const error={index:1,startedAt:'test',status:'error' as const,httpStatus:429,raw:'',response:{error:{code:429,metadata:{provider_error_code:'rate_limit_exceeded'}}},provider:null,usage:null,error:'HTTP 429',retriable:true};
  ledger.settle(id,null,error);assert.equal(ledger.summary().accountedUsd,0);
  const next=ledger.reserve(request);
  ledger.settle(next,null,{...error,response:{...error.response,id:'generation-started'}});
  assert.equal(ledger.summary().unknownCostRequests,1);
});

test('retry delay honors provider hints instead of using a shorter backoff',async()=>{
  const {retryDelayMs,requestCompletion}=await import('../../src/shared/model-client.ts');
  const result=await requestCompletion(request,'mock',async()=>new Response(JSON.stringify({error:{code:429}}),{status:429,headers:{'Retry-After':'15'}}));
  assert.equal(result.retryAfterMs,15000);
  assert.equal(retryDelayMs({...result,index:1,startedAt:'test'},1),15000);
});
