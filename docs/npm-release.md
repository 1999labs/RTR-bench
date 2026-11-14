# Publishing RTR-bench 0.2.0

This release adds the public `read-the-room`, `predict`, and `learn` commands to the npm package, along with the frozen dataset, reports, and spending controls. It includes compatibility for tiered text pricing and records when a provider does not support temperature control. Node.js 22.18 or newer is required.

Publishing to npm is separate from committing and pushing to GitHub. These instructions are for the package maintainer, using an npm account with permission to publish `rtr-bench`.

## Prepare and check

From the repository folder:

```bash
git pull --ff-only
npm ci
npm test
npm pack --dry-run
```

The package version in both `package.json` and `package-lock.json` must be `0.2.0`. `npm pack --dry-run` builds the bundled CLI and lists what would be included without publishing anything. The existing `prepack` script runs `npm run build` automatically for both packing and publishing.

The package includes `dist/cli.js`, the dataset and frozen split, protocol documentation, and synthetic fixtures. API keys, `.env`, local evaluation outputs, and `node_modules` must not be included. Tests and synthetic runs make no paid model calls.

## Publish

```bash
npm login
npm publish --access public
```

Follow npm's browser sign-in and any authentication prompts. The second command publishes version 0.2.0 to the public registry and makes it the default `latest` release. An already-published name/version cannot be overwritten. See npm's [login](https://docs.npmjs.com/cli/v11/commands/npm-login/) and [publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/) documentation.

## Verify

```bash
npm view rtr-bench@latest version
```

This should print `0.2.0` once the registry has updated. Users can then run `npx rtr-bench@0.2.0 read-the-room ...` using the model, provider, split, and spending limit described in the README. A real model evaluation requires an OpenRouter key and incurs API charges; publishing the package does not start an evaluation.
