import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {discoverSpendingPolicy,openSpendingLedger,spendingProvider,SpendingLimitError} from '../../src/shared/spending.ts';
import {requestCompletion,type Request} from '../../src/shared/model-client.ts';
import {runLearnRoom} from '../../src/tracks/learn-room/run.ts';
import {learnRoomMarkdown,learnRoomHtml} from '../../src/tracks/learn-room/report.ts';
import {uniform} from '../../src/shared/distribution.ts';

const snapshots=JSON.parse(fs.readFileSync(new URL('../fixtures/provider-pricing-2026-11-14.json',import.meta.url),'utf8')).models;
const catalog=(endpoint:any):typeof fetch=>async()=>new Response(JSON.stringify({data:{endpoints:[endpoint]}}));
const temp=(t:any)=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-provider-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;};
const discover=(row:any)=>discoverSpendingPolicy(row.model,row.endpoint.tag,3,catalog(row.endpoint));

test('catalog snapshots support Gemini, Luna, and Haiku with conservative tier/cache/reasoning bounds',async()=>{
  const expected=[{input:7.5e-7,output:3.75e-6,temperature:true},{input:2.5e-7,output:7.5e-7,temperature:false},{input:1e-6,output:2.5e-6,temperature:false}];
  for(const [i,row] of snapshots.entries()) {
    const p=await discover(row);
    assert.equal(p.version,'reserved-text-v2');
    if(p.version!=='reserved-text-v2')throw new Error('Expected v2');
    assert.equal(p.inputUsdPerToken,expected[i].input);
    assert.equal(p.outputUsdPerToken,expected[i].output);
    assert.equal(p.temperatureSupported,expected[i].temperature);
    assert.equal(p.providerTag,row.endpoint.tag);
    assert.deepEqual(p.pricing,row.endpoint.pricing);
    assert.deepEqual(spendingProvider(p),{order:[row.endpoint.tag],allow_fallbacks:false,max_price:{prompt:expected[i].input*1e6,completion:expected[i].output*1e6,request:0}});
  }
});

test('fixed-price policies retain their exact persisted shape',async()=>{
  const endpoint={tag:'relace/fp4',provider_name:'Relace',status:0,context_length:1048576,supported_parameters:['temperature','max_tokens'],pricing:{prompt:'0.0000000399',completion:'0.0000000784',input_cache_read:'0.0000000399',discount:0}};
  const p=await discoverSpendingPolicy('z-ai/glm-5.3-flash','Relace',.25,catalog(endpoint));
  assert.equal(JSON.stringify(p),JSON.stringify({version:'reserved-context-v1',limitUsd:.25,providerTag:'relace/fp4',contextTokens:1048576,inputUsdPerToken:3.99e-8,outputUsdPerToken:7.84e-8}));
});

test('catalog key ordering preserves run identity and higher reasoning rates remain covered',async()=>{
  const row=snapshots[1],original=await discover(row);
  const pricing=Object.fromEntries(Object.entries(row.endpoint.pricing).reverse());
  pricing.overrides=(pricing.overrides as any[]).map(tier=>Object.fromEntries(Object.entries(tier).reverse()));
  assert.equal(JSON.stringify(await discover({...row,endpoint:{...row.endpoint,pricing}})),JSON.stringify(original));
  const gemini=snapshots[0];
  const higher=await discover({...gemini,endpoint:{...gemini.endpoint,pricing:{...gemini.endpoint.pricing,internal_reasoning:'0.00001'}}});
  assert.equal(higher.outputUsdPerToken,.00001);
});

test('unsupported charges, invalid tiers and nonfinite rates fail closed before inference',async()=>{
  const row=snapshots[1];
  const patches=[{request:'0.01'},{new_surcharge:'0.1'},{prompt:'Infinity'},{completion:'NaN'},{input_cache_read:-1},{discount:null},{overrides:{}},{overrides:[{min_prompt_tokens:-1,prompt:'0.1'}]},{overrides:[{min_prompt_tokens:100,completion:'Infinity'}]},{overrides:[{min_prompt_tokens:100,new_surcharge:'0.1'}]},{overrides:[{min_prompt_tokens:100,overrides:[]}]}];
  for(const patch of patches) {
    await assert.rejects(discoverSpendingPolicy(row.model,row.endpoint.tag,1,catalog({...row.endpoint,pricing:{...row.endpoint.pricing,...patch}})),/No suitable text endpoint/);
  }
  for(const patch of [{status:1},{supported_parameters:['temperature']},{context_length:Infinity},{max_completion_tokens:-1}]) {
    await assert.rejects(discoverSpendingPolicy(row.model,row.endpoint.tag,1,catalog({...row.endpoint,...patch})),/No suitable text endpoint/);
  }
});

test('v2 reservations cover the highest tier and persist unknown charges; unsafe request shapes cannot dispatch',async t=>{
  const p=await discover(snapshots[2]);
  if(p.version!=='reserved-text-v2')throw new Error('Expected v2');
  const file=path.join(temp(t),'spending.json');
  const limited={...p,limitUsd:1.1};
  const ledger=openSpendingLedger(file,limited);
  const request:Request={model:p.model,messages:[{role:'user',content:'test'}],max_tokens:4000,usage:{include:true},provider:spendingProvider(p)};
  const mutations=[{tools:[]},{plugins:[]},{cache_control:{}},{modalities:['audio']},{n:2},{model:'another/model'},{temperature:0},{max_tokens:p.maxCompletionTokens+1},{messages:[{role:'user',content:[{type:'image_url',image_url:{url:'test'}}]}]},{messages:[{role:'user',content:'test',cache_control:{type:'ephemeral'}}]},{usage:{include:true,extra:true}}];
  for(const mutation of mutations)assert.throws(()=>ledger.reserve({...request,...mutation} as Request));
  assert.equal(ledger.summary().requests,0);
  const index=ledger.reserve(request);
  assert.equal(ledger.summary().accountedUsd,1.01);
  assert.throws(()=>ledger.reserve(request),SpendingLimitError);
  const resumed=openSpendingLedger(file,limited);
  assert.throws(()=>resumed.reserve(request),SpendingLimitError);
  resumed.settle(index,{cost:.001});
  resumed.reserve(request);
  assert.equal(resumed.summary().requests,2);
  assert.throws(()=>openSpendingLedger(path.join(temp(t),'tampered.json'),{...p,inputUsdPerToken:1e-9}),/Invalid text spending policy/);
});

test('every strategy and agent turn uses endpoint temperature support, records the exception, and resumes offline',async t=>{
  const old=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='mock-only';
  t.after(()=>{if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old;});
  const output=temp(t);
  for(const row of snapshots) {
    const spending=await discover(row);
    if(spending.version!=='reserved-text-v2')throw new Error('Expected v2');
    let calls=0;
    const client=(request:Request)=>requestCompletion(request,'mock-only',async(_url,init)=>{
      const body=JSON.parse(String(init?.body));calls++;
      assert.equal(Object.hasOwn(body,'temperature'),spending.temperatureSupported);
      if(spending.temperatureSupported)assert.equal(body.temperature,0);
      assert.equal(body.max_tokens,4000);
      assert.deepEqual(body.provider,spendingProvider(spending));
      const raw=calls<=3?JSON.stringify(uniform()):calls===4?'{"type":"list_examples"}':JSON.stringify({type:'submit_prediction',prediction:uniform()});
      return new Response(JSON.stringify({choices:[{message:{content:raw}}],usage:{cost:.001},provider:row.endpoint.provider_name}));
    });
    const options={model:row.model,provider:row.endpoint.tag,spending,strategy:'all' as const,limit:1,maxTokens:4000,agentPolicy:'transfer-check-v1' as const,output};
    const result=await runLearnRoom(options,client);
    assert.equal(calls,5);
    assert.equal(result.report.complete,true);
    assert.equal(result.report.manifest.config.settings.temperature,spending.temperatureSupported?0:null);
    assert.equal(result.report.manifest.config.agentPolicy,'transfer-check-v1');
    assert.equal(learnRoomMarkdown(result.report).includes('provider default'),!spending.temperatureSupported);
    assert.equal(learnRoomHtml(result.report).includes('provider default'),!spending.temperatureSupported);
    const resumed=await runLearnRoom(options,async()=>{throw new Error('Resume must not call a model');});
    assert.equal(resumed.dir,result.dir);
    assert.deepEqual(resumed.report,result.report);
    const insufficient={...spending,limitUsd:.00001};
    await assert.rejects(runLearnRoom({...options,spending:insufficient},async()=>{throw new Error('Budget must block dispatch');}),SpendingLimitError);
  }
});
