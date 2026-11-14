import fs from "node:fs";
import { readJson, writeJson } from "./run-records.ts";
import type { Request, Attempt } from "./model-client.ts";

const units=(usd:number)=>Math.ceil(usd*1e9);
type SpendingBounds={limitUsd:number;providerTag:string;contextTokens:number;inputUsdPerToken:number;outputUsdPerToken:number};
export type SpendingPolicy=SpendingBounds & ({version:"reserved-context-v1"}|{
  version:"reserved-text-v2";model:string;temperatureSupported:boolean;maxCompletionTokens:number;pricing:Record<string,unknown>;
});
type Entry={reservedUnits:number;chargedUnits:number|null;at:string;costBasis?:string;requestKey?:string};
type Ledger={policy:SpendingPolicy;entries:Entry[]};
export class SpendingLimitError extends Error {}

const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const rate=(value:unknown)=>{
  if((typeof value!=="number"&&typeof value!=="string")||(typeof value==="string"&&!value.trim())) throw new Error("Invalid catalog rate");
  const n=Number(value);
  if(!Number.isFinite(n)||n<0) throw new Error("Invalid catalog rate");
  return n;
};

// Only text token charges can be incurred by the v2 request shape below. Cache
// writes are conservatively covered even though explicit caching is not enabled.
function textPrices(pricing:unknown) {
  if(!record(pricing)) throw new Error("Invalid catalog pricing");
  const {overrides=[],...base}=pricing;
  if(!Array.isArray(overrides)) throw new Error("Invalid pricing tiers");
  const tiers=[base,...overrides.map(tier=>{
    if(!record(tier)||!Number.isSafeInteger(tier.min_prompt_tokens)||Number(tier.min_prompt_tokens)<0||"overrides" in tier) throw new Error("Invalid pricing tier");
    const {min_prompt_tokens,...prices}=tier;
    return {...base,...prices};
  })];
  const known=new Set(["prompt","completion","input_cache_read","input_cache_write","input_cache_write_1h","internal_reasoning","discount","request","image","audio","input_audio_cache","web_search"]);
  let input=0,output=0;
  for(const tier of tiers) {
    for(const [key,value] of Object.entries(tier)) {
      const n=rate(value);
      if((!known.has(key)||key==="request")&&n!==0) throw new Error("Unbudgeted catalog charge");
    }
    if(rate(tier.prompt)<=0||rate(tier.completion)<=0) throw new Error("Missing token prices");
    input=Math.max(input,...["prompt","input_cache_read","input_cache_write","input_cache_write_1h"].map(k=>rate(tier[k]??0)));
    // Reasoning is part of output usage, not a second copy of those tokens.
    output=Math.max(output,rate(tier.completion),rate(tier.internal_reasoning??0));
  }
  return {inputUsdPerToken:input,outputUsdPerToken:output};
}

// Catalog object ordering must not create a new run instead of resuming it.
function orderedPricing(pricing:Record<string,unknown>):Record<string,unknown> {
  return Object.fromEntries(Object.keys(pricing).sort().map(key=>[key,key==="overrides"
    ? (pricing[key] as Record<string,unknown>[]).map(orderedPricing).sort((a,b)=>Number(a.min_prompt_tokens)-Number(b.min_prompt_tokens)||JSON.stringify(a).localeCompare(JSON.stringify(b)))
    : pricing[key]]));
}

export async function discoverSpendingPolicy(model:string,provider:string,limitUsd:number,fetcher:typeof fetch=fetch):Promise<SpendingPolicy> {
  if(!Number.isFinite(limitUsd)||limitUsd<=0) throw new Error("--max-usd must be positive");
  if(!provider) throw new Error("--max-usd requires --provider");
  const response=await fetcher(`https://openrouter.ai/api/v1/models/${model}/endpoints`);
  if(!response.ok) throw new Error(`Provider catalog HTTP ${response.status}`);
  const json=await response.json();
  if(!Array.isArray(json?.data?.endpoints)) throw new Error("Invalid provider catalog");
  const endpoints=json.data.endpoints.filter((e:any)=>e.status===0&&(e.provider_name?.toLowerCase()===provider.toLowerCase()||e.tag===provider));
  const suitable=endpoints.flatMap((e:any)=>{
    const p=e.pricing;
    if(!Number.isSafeInteger(e.context_length)||e.context_length<1||typeof e.tag!=="string"||!e.tag||!Array.isArray(e.supported_parameters)||!e.supported_parameters.includes("max_tokens")) return [];
    try {
      const prices=textPrices(p),temperatureSupported=e.supported_parameters.includes("temperature");
      const common={limitUsd,providerTag:e.tag,contextTokens:e.context_length};
      const legacy=temperatureSupported&&Number(p.input_cache_read??0)<=Number(p.prompt)&&Object.entries(p).every(([key,value])=>["prompt","completion","input_cache_read","discount"].includes(key)||Number(value)===0);
      if(legacy) return [{version:"reserved-context-v1",...common,inputUsdPerToken:Number(p.prompt),outputUsdPerToken:Number(p.completion)} as SpendingPolicy];
      const maxCompletionTokens=e.max_completion_tokens??e.context_length;
      if(!Number.isSafeInteger(maxCompletionTokens)||maxCompletionTokens<1) return [];
      return [{version:"reserved-text-v2",...common,...prices,model,temperatureSupported,maxCompletionTokens,pricing:orderedPricing(p)} as SpendingPolicy];
    } catch { return []; }
  }).sort((a:SpendingPolicy,b:SpendingPolicy)=>a.inputUsdPerToken-b.inputUsdPerToken||a.providerTag.localeCompare(b.providerTag));
  if(!suitable.length) throw new Error("No suitable text endpoint supports the spending guard");
  return suitable[0];
}

export function spendingProvider(policy:SpendingPolicy,requireParameters=false) {
  return {order:[policy.providerTag],allow_fallbacks:false,max_price:{prompt:policy.inputUsdPerToken*1e6,completion:policy.outputUsdPerToken*1e6,request:0},...(requireParameters?{require_parameters:true as const}:{})};
}

// The caller holds the run lock. Persist before dispatch and retain the entire
// reservation when a request's cost is unknown, including interrupted calls.
export function openSpendingLedger(file:string,policy:SpendingPolicy) {
  if(!["reserved-context-v1","reserved-text-v2"].includes(policy.version)||!Number.isFinite(policy.limitUsd)||policy.limitUsd<=0||!Number.isSafeInteger(policy.contextTokens)||policy.contextTokens<1||!policy.providerTag||[policy.inputUsdPerToken,policy.outputUsdPerToken].some(p=>!Number.isFinite(p)||p<=0)) throw new Error("Invalid spending policy");
  if(policy.version==="reserved-text-v2") {
    const prices=textPrices(policy.pricing);
    if(!policy.model||typeof policy.temperatureSupported!=="boolean"||!Number.isSafeInteger(policy.maxCompletionTokens)||policy.maxCompletionTokens<1||prices.inputUsdPerToken!==policy.inputUsdPerToken||prices.outputUsdPerToken!==policy.outputUsdPerToken) throw new Error("Invalid text spending policy");
  }
  const ledger=fs.existsSync(file)?readJson<Ledger>(file):{policy,entries:[]};
  if(JSON.stringify(ledger.policy)!==JSON.stringify(policy)) throw new Error("Spending ledger policy mismatch");
  if(!Array.isArray(ledger.entries)||ledger.entries.some(e=>!Number.isSafeInteger(e.reservedUnits)||e.reservedUnits<0||(e.chargedUnits!==null&&(!Number.isSafeInteger(e.chargedUnits)||e.chargedUnits<0)))) throw new Error("Invalid spending ledger entries");
  const accounted=()=>ledger.entries.reduce((s,e)=>s+(e.chargedUnits??e.reservedUnits),0);
  const save=()=>writeJson(file,ledger);
  save();
  return {
    reserve(request:Request,requestKey?:string) {
      if(ledger.entries.some(e=>e.chargedUnits!==null&&e.chargedUnits>e.reservedUnits)) throw new SpendingLimitError("A saved provider charge exceeded its reservation; stopping for review");
      if(JSON.stringify(request.provider)!==JSON.stringify(spendingProvider(policy,request.provider?.require_parameters===true))) throw new Error("Request must use the budget's pinned provider and price ceiling");
      if(!Number.isSafeInteger(request.max_tokens)||request.max_tokens<=0) throw new Error("Budgeted requests require a finite output limit");
      if(policy.version==="reserved-text-v2") {
        const allowed=["model","messages","temperature","max_tokens","usage","provider"];
        if(Object.keys(request).some(k=>!allowed.includes(k))||request.model!==policy.model||!Array.isArray(request.messages)||request.messages.some(m=>!record(m)||Object.keys(m).some(k=>!["role","content"].includes(k))||!["system","user","assistant"].includes(m.role)||typeof m.content!=="string")||!record(request.usage)||Object.keys(request.usage).some(k=>k!=="include")||request.usage.include!==true) throw new Error("Budgeted v2 requests must use plain text without tools, plugins, caching controls, or extra parameters");
        if(!policy.temperatureSupported&&"temperature" in request) throw new Error("Endpoint does not support temperature");
        if(request.max_tokens>policy.maxCompletionTokens) throw new Error("Output limit exceeds the endpoint maximum");
      }
      // Reject oversized messages before relying on the endpoint context bound.
      if(Buffer.byteLength(JSON.stringify(request.messages),"utf8")+1024*request.messages.length>policy.contextTokens) throw new SpendingLimitError("Request is too large for the conservative spending guard");
      const reservedUnits=units(policy.contextTokens*policy.inputUsdPerToken+request.max_tokens*policy.outputUsdPerToken);
      if(!Number.isSafeInteger(reservedUnits)) throw new SpendingLimitError("Reservation exceeds safe accounting precision");
      if(accounted()+reservedUnits>Math.floor(policy.limitUsd*1e9)) throw new SpendingLimitError("Spending limit reached; next request was not sent");
      if(requestKey&&ledger.entries.some(e=>e.requestKey===requestKey)) throw new SpendingLimitError("Saved reservation has no matching attempt; stopping for review");
      ledger.entries.push({reservedUnits,chargedUnits:null,at:new Date().toISOString(),...(requestKey?{requestKey}:{})});save();return ledger.entries.length-1;
    },
    settle(index:number,usage:Record<string,unknown>|null,attempt?:Attempt,requestKey?:string) {
      const entry=ledger.entries[index];
      if(!Number.isSafeInteger(index)||!entry||(requestKey!==undefined&&entry.requestKey!==requestKey)) throw new Error("Spending reservation does not match saved attempt");
      const response=attempt?.response as any;
      const rejected=attempt?.httpStatus===429&&response?.error?.code===429&&response?.error?.metadata?.provider_error_code==="rate_limit_exceeded"&&!response?.id&&!response?.choices;
      // OpenRouter pricing: failed model-token attempts are unbilled. Only
      // explicit pre-generation rate-limit rejections qualify, never timeouts
      // or empty successful responses. Preserve the basis in the audit ledger.
      const cost=usage?.cost??usage?.total_cost??(rejected?0:null);
      if(typeof cost==="number"&&Number.isFinite(cost)&&cost>=0) {
        const chargedUnits=units(cost);
        if(!Number.isSafeInteger(chargedUnits)||(entry.chargedUnits!==null&&entry.chargedUnits!==chargedUnits)) throw new Error("Conflicting or invalid saved charge");
        entry.chargedUnits=chargedUnits;entry.costBasis=typeof usage?.cost==="number"||typeof usage?.total_cost==="number"?"reported-cost":"unbilled-rate-limit: https://openrouter.ai/pricing";save();
        if(entry.chargedUnits>entry.reservedUnits) throw new SpendingLimitError("Provider cost exceeded its reservation; stopping for review");
      }
    },
    summary() {return {limitUsd:policy.limitUsd,accountedUsd:accounted()/1e9,knownCostUsd:ledger.entries.reduce((s,e)=>s+(e.chargedUnits??0),0)/1e9,unknownCostRequests:ledger.entries.filter(e=>e.chargedUnits===null).length,requests:ledger.entries.length};},
  };
}
