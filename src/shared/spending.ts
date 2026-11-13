import fs from "node:fs";
import { readJson, writeJson } from "./run-records.ts";
import type { Request, Attempt } from "./model-client.ts";

const units=(usd:number)=>Math.ceil(usd*1e9);
export type SpendingPolicy={version:"reserved-context-v1";limitUsd:number;providerTag:string;contextTokens:number;inputUsdPerToken:number;outputUsdPerToken:number};
type Entry={reservedUnits:number;chargedUnits:number|null;at:string;costBasis?:string};
type Ledger={policy:SpendingPolicy;entries:Entry[]};
export class SpendingLimitError extends Error {}

export async function discoverSpendingPolicy(model:string,provider:string,limitUsd:number):Promise<SpendingPolicy> {
  if(!Number.isFinite(limitUsd)||limitUsd<=0) throw new Error("--max-usd must be positive");
  if(!provider) throw new Error("--max-usd requires --provider");
  const response=await fetch(`https://openrouter.ai/api/v1/models/${model}/endpoints`);
  if(!response.ok) throw new Error(`Provider catalog HTTP ${response.status}`);
  const json=await response.json();
  const endpoints=json.data.endpoints.filter((e:any)=>e.status===0&&(e.provider_name?.toLowerCase()===provider.toLowerCase()||e.tag===provider));
  const suitable=endpoints.filter((e:any)=>{
    const p=e.pricing;
    return Number.isInteger(e.context_length)&&e.context_length>0&&Number(p?.prompt)>0&&Number(p?.completion)>0&&
      Number(p?.input_cache_read??0)<=Number(p.prompt)&&Number(p?.request??0)===0&&
      Object.entries(p??{}).every(([key,value])=>["prompt","completion","input_cache_read","discount"].includes(key)||Number(value)===0)&&
      e.supported_parameters?.includes("max_tokens")&&e.supported_parameters?.includes("temperature");
  }).sort((a:any,b:any)=>Number(a.pricing.prompt)-Number(b.pricing.prompt)||String(a.tag).localeCompare(String(b.tag)));
  const endpoint=suitable[0];
  if(!endpoint?.tag) throw new Error("No suitable fixed-price endpoint supports the spending guard");
  return {version:"reserved-context-v1",limitUsd,providerTag:endpoint.tag,contextTokens:endpoint.context_length,inputUsdPerToken:Number(endpoint.pricing.prompt),outputUsdPerToken:Number(endpoint.pricing.completion)};
}

export function spendingProvider(policy:SpendingPolicy) {
  return {order:[policy.providerTag],allow_fallbacks:false,max_price:{prompt:policy.inputUsdPerToken*1e6,completion:policy.outputUsdPerToken*1e6,request:0}};
}

// The caller holds the run lock. Persist before dispatch and retain the entire
// reservation when a request's cost is unknown, including interrupted calls.
export function openSpendingLedger(file:string,policy:SpendingPolicy) {
  if(policy.version!=="reserved-context-v1"||!Number.isFinite(policy.limitUsd)||policy.limitUsd<=0||!Number.isInteger(policy.contextTokens)||policy.contextTokens<1||!policy.providerTag||[policy.inputUsdPerToken,policy.outputUsdPerToken].some(p=>!Number.isFinite(p)||p<=0)) throw new Error("Invalid spending policy");
  const ledger=fs.existsSync(file)?readJson<Ledger>(file):{policy,entries:[]};
  if(JSON.stringify(ledger.policy)!==JSON.stringify(policy)) throw new Error("Spending ledger policy mismatch");
  const accounted=()=>ledger.entries.reduce((s,e)=>s+(e.chargedUnits??e.reservedUnits),0);
  const save=()=>writeJson(file,ledger);
  save();
  return {
    reserve(request:Request) {
      if(JSON.stringify(request.provider)!==JSON.stringify(spendingProvider(policy))) throw new Error("Request must use the budget's pinned provider and price ceiling");
      if(!Number.isInteger(request.max_tokens)||request.max_tokens<=0) throw new Error("Budgeted requests require a finite output limit");
      // Reject oversized messages before relying on the endpoint context bound.
      if(Buffer.byteLength(JSON.stringify(request.messages),"utf8")+1024*request.messages.length>policy.contextTokens) throw new SpendingLimitError("Request is too large for the conservative spending guard");
      const reservedUnits=units(policy.contextTokens*policy.inputUsdPerToken+request.max_tokens*policy.outputUsdPerToken);
      if(accounted()+reservedUnits>Math.floor(policy.limitUsd*1e9)) throw new SpendingLimitError("Spending limit reached; next request was not sent");
      ledger.entries.push({reservedUnits,chargedUnits:null,at:new Date().toISOString()});save();return ledger.entries.length-1;
    },
    settle(index:number,usage:Record<string,unknown>|null,attempt?:Attempt) {
      const response=attempt?.response as any;
      const rejected=attempt?.httpStatus===429&&response?.error?.code===429&&response?.error?.metadata?.provider_error_code==="rate_limit_exceeded"&&!response?.id&&!response?.choices;
      // OpenRouter pricing: failed model-token attempts are unbilled. Only
      // explicit pre-generation rate-limit rejections qualify, never timeouts
      // or empty successful responses. Preserve the basis in the audit ledger.
      const cost=usage?.cost??usage?.total_cost??(rejected?0:null);
      if(typeof cost==="number"&&Number.isFinite(cost)&&cost>=0) {
        const entry=ledger.entries[index];
        entry.chargedUnits=units(cost);entry.costBasis=typeof usage?.cost==="number"||typeof usage?.total_cost==="number"?"reported-cost":"unbilled-rate-limit: https://openrouter.ai/pricing";save();
        if(entry.chargedUnits>entry.reservedUnits) throw new SpendingLimitError("Provider cost exceeded its reservation; stopping for review");
      }
    },
    summary() {return {limitUsd:policy.limitUsd,accountedUsd:accounted()/1e9,knownCostUsd:ledger.entries.reduce((s,e)=>s+(e.chargedUnits??0),0)/1e9,unknownCostRequests:ledger.entries.filter(e=>e.chargedUnits===null).length,requests:ledger.entries.length};},
  };
}
