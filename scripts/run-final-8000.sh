#!/usr/bin/env bash
# Resume the authorized campaign using its shared $10 ceiling.
# The prior individual-cap script is preserved in Git history.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
exec node scripts/run-final-campaign.mjs --run
