import type { Window } from "../../score.ts";
import { groupKey } from "../../shared/dataset.ts";
import { QUADRANTS, validatePrediction, observed, distributionError, scoreFromError, winnerCredit, FAILURE_ERROR, type Distribution } from "../../shared/distribution.ts";

export const ENVIRONMENT_VERSION = "learn-room-env-v1";
export const MAX_ACTIONS = 8;
export type Action = { type: "list_examples" } | { type: "inspect_example"; id: number } | { type: "submit_prediction"; prediction: unknown };
export type TraceEntry = { index: number; action: unknown; observation: unknown };
export type Outcome = { status: "valid" | "invalid" | "missing"; prediction: Distribution | null; originalSum: number | null; failure: string | null; error: number; score: number; winnerCredit: number; inspections: number; actions: number };

// Only the agent capability object is handed to a policy. Scoring and hidden
// labels remain in the evaluator closure; observations never include rewards.
export function createEpisode(target: Window, reference: Window[], options: { budget?: number; maxActions?: number; aliases?: Record<string,string> } = {}) {
  const budget = options.budget ?? 3, maxActions = options.maxActions ?? MAX_ACTIONS;
  if (!Number.isInteger(budget) || budget < 0 || budget > reference.length) throw new Error("Inspection budget must be an integer within the reference pool size");
  if (!Number.isInteger(maxActions) || maxActions < 1) throw new Error("Action limit must be a positive integer");
  const group = (w: Window) => options.aliases?.[groupKey(w.word)] ?? groupKey(w.word);
  for (const w of [target,...reference]) {
    const counts=[w.counts.tl,w.counts.tr,w.counts.bl,w.counts.br];
    if (!Number.isInteger(w.day)||typeof w.word!=="string"||!Number.isInteger(w.n)||w.n<=0||counts.some(n=>!Number.isInteger(n)||n<0)||counts.reduce((a,b)=>a+b,0)!==w.n) throw new Error("Invalid episode window counts or identifier");
  }
  const pool = new Map<number, Window>();
  for (const input of reference) {
    if (input.day >= target.day || group(input) === group(target) || pool.has(input.day)) throw new Error("Reference pool contains target, repeated target entity, future window, or duplicate ID");
    pool.set(input.day, structuredClone(input));
  }
  const hidden = structuredClone(target), inspected = new Set<number>(), trace: TraceEntry[] = [];
  let outcome: Outcome | null = null;
  const end = (prediction: Distribution | null, failure: string | null, status: Outcome["status"], originalSum: number | null = null) => {
    const error = prediction ? distributionError(prediction,observed(hidden)) : FAILURE_ERROR;
    outcome = {status,prediction,originalSum,failure,error,score:scoreFromError(error),winnerCredit:prediction ? winnerCredit(prediction,hidden) : 0,inspections:inspected.size,actions:trace.length+1};
  };
  function act(input: unknown) {
    if (outcome) return {ok:false,error:"Episode has ended",ended:true};
    let observation: any;
    const a = input as any;
    const keys = input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input).sort().join(",") : "";
    if (a?.type === "list_examples" && keys === "type") {
      observation = {ok:true,examples:[...pool.values()].map(w=>({id:w.day,prompt:w.word}))};
    } else if (a?.type === "inspect_example" && keys === "id,type" && Number.isInteger(a.id)) {
      const w = pool.get(a.id);
      if (!w) observation = {ok:false,error:"Example is not in the reference catalog"};
      else if (!inspected.has(a.id) && inspected.size >= budget) observation = {ok:false,error:"Inspection budget exhausted"};
      else {
        const cached = inspected.has(a.id);
        inspected.add(a.id);
        observation = {ok:true,id:w.day,prompt:w.word,distribution:observed(w),submissions:w.n,cached};
      }
    } else if (a?.type === "submit_prediction" && keys === "prediction,type") {
      const result = validatePrediction(a.prediction);
      end(result.prediction,result.error,result.prediction ? "valid" : "invalid",result.originalSum);
      observation = {ok:!!result.prediction,accepted:!!result.prediction,error:result.error};
    } else observation = {ok:false,error:"Invalid action; use list_examples, inspect_example with integer id, or submit_prediction with prediction"};
    if (!outcome && trace.length+1 >= maxActions) end(null,"Action limit reached without a final prediction","missing");
    observation = {...observation,remainingInspections:budget-inspected.size,remainingActions:maxActions-trace.length-1,ended:!!outcome};
    trace.push({index:trace.length+1,action:structuredClone(input),observation:structuredClone(observation)});
    return structuredClone(observation);
  }
  return {
    agent: Object.freeze({
      observe: () => ({target:{id:hidden.day,prompt:hidden.word},quadrants:[...QUADRANTS],inspectionBudget:budget,maxActions}),
      act,
    }),
    evaluator: Object.freeze({
      outcome: () => structuredClone(outcome),
      trace: () => structuredClone(trace),
      abort: (reason: string) => {
        if (outcome) return;
        end(null,reason,"missing");
        trace.push({index:trace.length+1,action:{type:"evaluator_abort"},observation:{ended:true,error:reason}});
        // Host termination is logged, but is not an action taken by the policy.
        outcome!.actions = trace.length-1;
      },
    }),
  };
}
