export type Message = { role: "system" | "user" | "assistant"; content: string };
export type Request = {
  model: string; messages: Message[]; temperature?: number;
  max_tokens: number; usage: { include: boolean };
  provider?: { order: string[]; allow_fallbacks: boolean; max_price?: {prompt:number;completion:number;request:number}; require_parameters?:true };
};
export type Attempt = {
  index: number; startedAt: string; finishedAt?: string;
  status: "started" | "response" | "error"; httpStatus?: number;
  raw: string; response: unknown; provider: string | null;
  usage: Record<string, unknown> | null; error: string | null; retriable: boolean;
  retryAfterMs?:number;
  spendingReservation?:number;
};
export const API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MAX_ATTEMPTS = 3;
export const TIMEOUT_MS = 60_000;

function errorCode(response:any,httpStatus?:number) {
  const code=Number(response?.error?.code);
  return Number.isInteger(code)&&code>=400&&code<=599?code:httpStatus;
}

// Setup failures stop a run; refusals and exhausted output budgets remain model
// outcomes. Typed errors take precedence over lossy HTTP status mappings.
export function isSetupFailure(attempt:Pick<Attempt,"status"|"response"|"httpStatus">) {
  if(attempt.status!=="error") return false;
  const type=(attempt.response as any)?.error?.metadata?.error_type;
  if(["refusal","content_policy_violation","max_tokens_exceeded","rate_limit_exceeded","provider_overloaded","provider_unavailable","server","timeout"].includes(type)) return false;
  if(["authentication","permission_denied","payment_required","invalid_request","invalid_prompt","not_found","precondition_failed","payload_too_large","unprocessable","context_length_exceeded","string_too_long","token_limit_exceeded"].includes(type)) return true;
  return [400,401,402,404,413,422].includes(errorCode(attempt.response,attempt.httpStatus)??0);
}
export class RunSetupError extends Error {}

export function retryDelayMs(attempt:Attempt|undefined, previousAttempts:number):number {
  const metadata=(attempt?.response as any)?.error?.metadata;
  const seconds=Number(metadata?.retry_after_seconds);
  const hint=attempt?.retryAfterMs??(Number.isFinite(seconds)&&seconds>0?seconds*1000:0);
  return Math.max(1000*2**(previousAttempts-1),hint);
}

// One request per invocation. The runner persists an attempt before calling
// this and after receiving its response, including every transient failure.
export async function requestCompletion(body: Request, apiKey: string, fetcher: typeof fetch = fetch): Promise<Omit<Attempt,"index" | "startedAt">> {
  try {
    const res = await fetcher(API_URL, {
      method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://mixedmessages.fyi", "X-Title": "RTR-bench distribution" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let response: any;
    try { response = JSON.parse(text); } catch { response = { unparsedBody: text }; }
    const content = response?.choices?.[0]?.message?.content;
    const error = !res.ok || response?.error
      ? `HTTP ${res.status}: ${JSON.stringify(response?.error ?? response).slice(0,500)}` : null;
    const retryHeader=res.headers.get("retry-after");
    const retryAfterMs=retryHeader ? (Number.isFinite(Number(retryHeader))?Math.max(0,Number(retryHeader)*1000):Math.max(0,Date.parse(retryHeader)-Date.now())) : 0;
    const errorType=response?.error?.metadata?.error_type;
    const retryableError=errorType
      ? ["rate_limit_exceeded","provider_overloaded","provider_unavailable","server","timeout"].includes(errorType)
      : [429,500,502,503,504].includes(errorCode(response,res.status)??0);
    return {
      status: error ? "error" : "response", finishedAt: new Date().toISOString(), httpStatus: res.status,
      raw: typeof content === "string" ? content : "", response,
      provider: typeof response?.provider === "string" ? response.provider : null,
      usage: response?.usage && typeof response.usage === "object" ? response.usage : null,
      error, retriable: !!error&&retryableError,
      ...(Number.isFinite(retryAfterMs)&&retryAfterMs>0?{retryAfterMs}:{}),
    };
  } catch (e) {
    return { status: "error", finishedAt: new Date().toISOString(), raw: "", response: null, provider: null, usage: null, error: String(e), retriable: true };
  }
}
