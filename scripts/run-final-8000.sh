#!/usr/bin/env bash
# Paid final evaluation: 11 models, individual caps totaling $10.
# Run only after approval of docs/final-run-plan-8000.md.
# Stops on the first command error; identical reruns resume saved records.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

# z-ai/glm-5.3-flash — $0.25 cap
node src/cli.ts read-the-room z-ai/glm-5.3-flash --controls --provider relace/fp4 --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 0.25 --output results/final-8000/z-ai__glm-5.3-flash

# z-ai/glm-5.3 — $0.25 cap
node src/cli.ts read-the-room z-ai/glm-5.3 --controls --provider wafer/us --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 0.25 --output results/final-8000/z-ai__glm-5.3

# minimax/minimax-m3.1-flash — $0.5 cap
node src/cli.ts read-the-room minimax/minimax-m3.1-flash --controls --provider inferact-vllm/nvfp4 --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 0.5 --output results/final-8000/minimax__minimax-m3.1-flash

# xiaomi/mimo-v2.6-flash — $0.5 cap
node src/cli.ts read-the-room xiaomi/mimo-v2.6-flash --controls --provider xiaomi/fp8 --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 0.5 --output results/final-8000/xiaomi__mimo-v2.6-flash

# deepseek/deepseek-v4.1-flash-1017 — $0.5 cap
node src/cli.ts read-the-room deepseek/deepseek-v4.1-flash-1017 --controls --provider sail-research/fp4/us --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 0.5 --output results/final-8000/deepseek__deepseek-v4.1-flash-1017

# tencent/hy3 — $1 cap
node src/cli.ts read-the-room tencent/hy3 --controls --provider gmicloud/bf16 --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 1 --output results/final-8000/tencent__hy3

# google/gemini-3.8-flash — $3.5 cap
node src/cli.ts read-the-room google/gemini-3.8-flash --controls --provider google-ai-studio --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 3.5 --output results/final-8000/google__gemini-3.8-flash

# openai/gpt-6-luna — $0.5 cap
node src/cli.ts read-the-room openai/gpt-6-luna --controls --provider openai --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 0.5 --output results/final-8000/openai__gpt-6-luna

# anthropic/claude-haiku-5.5 — $1.5 cap
node src/cli.ts read-the-room anthropic/claude-haiku-5.5 --controls --provider anthropic --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 1.5 --output results/final-8000/anthropic__claude-haiku-5.5

# thinkingmachines/inkling-small — $1.25 cap
node src/cli.ts read-the-room thinkingmachines/inkling-small --controls --provider deepinfra/fp4 --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 1.25 --output results/final-8000/thinkingmachines__inkling-small

# openai/gpt-oss-120b — $0.25 cap
node src/cli.ts read-the-room openai/gpt-oss-120b --controls --provider primeintellect/fp4 --split evaluation --limit 45 --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 --agent-policy transfer-check-v1 --max-usd 0.25 --output results/final-8000/openai__gpt-oss-120b
