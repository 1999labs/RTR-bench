#!/bin/bash
# Sequential pinned runs for the second batch. Each model gets a main pass and a
# cleanup pass that retries error calls and calls that produced no usable answer.
cd "$(dirname "$0")/.." || exit 1
set -u

run() {
  local model="$1" provider="$2" conc="$3"
  echo ""
  echo "########## $model @ $provider ##########"
  node src/cli.ts run --models "$model" --provider "$provider" --concurrency "$conc" || echo "MAIN PASS FAILED $model"
  node src/cli.ts run --models "$model" --provider "$provider" --concurrency 4 || echo "CLEANUP FAILED $model"
}

run tencent/hy3 Tencent 16
run xiaomi/mimo-v2.6-flash GMICloud 16
# gpt-6-luna deferred: new-account 20 rpm cap on this model
run anthropic/claude-haiku-5.5 "Claude Platform on AWS" 16
# gemini deferred: new-account 20 rpm cap
run thinkingmachines/inkling-small DeepInfra 16

echo ""
echo "########## BATCH DONE ##########"
