import { digest } from "../../shared/dataset.ts";
import type { Message } from "../../shared/model-client.ts";

export const PROMPT_VERSION = "distribution-prompt-v1";
export const SYSTEM = "Predict the distribution of responses from participants in Mixed Messages, a generative art project. These are this audience's interpretations, not objective labels. Reply with a single JSON object only. No prose or code fences.";
export const INSTRUCTIONS = `Estimate the share of this audience's submissions in each quadrant:
performed+uniting: creating false unity among us
honest+uniting: bringing us together, authentically
performed+dividing: exploiting our divisions, deliberately
honest+dividing: fracturing us, truthfully

Return exactly these four keys with numeric probabilities between 0 and 1 that sum to 1 (not percentages). Use at least three decimal places when needed. A sum differing from 1 by at most 0.001 will be normalized. Do not include confidence, explanations, or any other keys.
{"performed+uniting": <probability>, "honest+uniting": <probability>, "performed+dividing": <probability>, "honest+dividing": <probability>}`;
export const PROMPT_HASH = digest(JSON.stringify({ SYSTEM, INSTRUCTIONS, targetFormat: "WORD: <JSON string>" }));
export function buildDistributionMessages(word: string): Message[] {
  return [{ role: "system", content: SYSTEM }, { role: "user", content: `WORD: ${JSON.stringify(word)}\n\n${INSTRUCTIONS}` }];
}
