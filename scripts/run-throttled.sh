#!/bin/bash
# Models capped at 20 rpm for new accounts. 18 rpm leaves headroom.
cd "$(dirname "$0")/.." || exit 1
set -u
run_slow() {
  local model="$1" provider="$2"
  echo ""
  echo "########## $model @ $provider (throttled 18 rpm) ##########"
  node src/cli.ts run --models "$model" --provider "$provider" --concurrency 8 --rpm 18 || echo "MAIN PASS FAILED $model"
  node src/cli.ts run --models "$model" --provider "$provider" --concurrency 8 --rpm 18 || echo "CLEANUP FAILED $model"
}
run_slow openai/gpt-6-luna OpenAI
run_slow google/gemini-3.8-flash "Google AI Studio"
echo ""
echo "########## THROTTLED BATCH DONE ##########"
