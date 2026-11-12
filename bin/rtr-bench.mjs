#!/usr/bin/env node
// Thin launcher so `rtr-bench` can be run as a command after npm install.
// Node 22 runs the TypeScript sources directly by stripping types.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const args = process.argv.slice(2);
const res = spawnSync(process.execPath, [cli, ...args], { stdio: "inherit" });
process.exit(res.status ?? 1);
