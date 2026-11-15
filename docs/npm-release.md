# Publishing RTR-bench 0.2.2

Version 0.2.2 supports providers that advertise UTC time-of-day pricing, including Tencent HY3. Spending reservations use the highest advertised token rate; settled charges use reported usage. This patch also updates the eleven-model Predict/Learn results, charts, and dataset documentation. The frozen data, prompt policies, evidence rules, score formula, and 8,000-token public-command default are unchanged. Node.js 22.18 or newer is required.

Publishing to npm is separate from pushing GitHub and uploading the Hugging Face dataset. These commands are for the package maintainer.

## Prepare and verify

```bash
npm ci
npm test
npm pack --dry-run
npm pack
```

Both `package.json` and `package-lock.json` must identify version `0.2.2`. Packing builds the bundled CLI through `prepack`. Inspect the tarball, extract it to a temporary directory, and run its synthetic fixture commands before publishing that exact artifact.

The package includes the bundled CLI, frozen dataset/split, protocols, synthetic fixtures, and published result summaries/charts. It must exclude `.env`, API keys, local credentials, `node_modules`, and raw evaluation responses. Packing and synthetic checks make no paid model calls.

## Publish the reviewed artifact

```bash
npm whoami
npm publish ./rtr-bench-0.2.2.tgz --access public
```

If npm requests authentication, finish its sign-in or two-factor prompt. A published name/version cannot be overwritten. Publishing the package does not start a model evaluation.

## Verify the registry

```bash
npm view rtr-bench@latest version
npm view rtr-bench@0.2.2 dist.integrity
npx --yes rtr-bench@0.2.2 --help
```

The latest version should be `0.2.2`, and the published integrity should match the reviewed tarball. Users can pin `npx rtr-bench@0.2.2 read-the-room ...` with the model, provider, split, and spending limit described in the Quickstart.
