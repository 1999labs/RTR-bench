export type Message = { role: "system" | "user" | "assistant"; content: string };
export type Request = {
  model: string; messages: Message[]; temperature: number;
  max_tokens: number; usage: { include: boolean };
  provider?: { order: string[]; allow_fallbacks: boolean; max_price?: {prompt:number;completion:number;request:number} };
};
export type Attempt = {
  index: number; startedAt: string; finishedAt?: string;
  status: "started" | "response" | "error"; httpStatus?: number;
  raw: string; response: unknown; provider: string | null;
  usage: Record<string, unknown> | null; error: string | null; retriable: boolean;
  retryAfterMs?:number;
};
export const API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MAX_ATTEMPTS = 3;
export const TIMEOUT_MS = 60_000;

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
    return {
      status: error ? "error" : "response", finishedAt: new Date().toISOString(), httpStatus: res.status,
      raw: typeof content === "string" ? content : "", response,
      provider: typeof response?.provider === "string" ? response.provider : null,
      usage: response?.usage && typeof response.usage === "object" ? response.usage : null,
      error, retriable: [429,500,502,503,504].includes(res.status),
      ...(Number.isFinite(retryAfterMs)&&retryAfterMs>0?{retryAfterMs}:{}),
    };
  } catch (e) {
    return { status: "error", finishedAt: new Date().toISOString(), raw: "", response: null, provider: null, usage: null, error: String(e), retriable: true };
  }
}
