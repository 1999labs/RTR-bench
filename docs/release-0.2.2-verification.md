# Release 0.2.2 verification

## Completed

- All eleven final runs independently verified offline: 1936/1980 valid outcomes; terminal failures retain zero scores. All declared targets are complete.
- Every completed run resumed with model-network access forbidden, without changing its saved report.
- All 64 tests passed. The final packaged CLI is byte-identical to that tested build; isolated synthetic Predict/Learn/control checks passed.
- Three charts visually reviewed; table and findings generated from verified metrics.
- Campaign reported charges: $1.94494979 (lower bound). Ledger accounted: $3.47962945, including 27 unresolved-charge reservations, within $10.
- GitHub result/source commit: `7a8cab7e`; Hugging Face package commit: `0794c8a8`.
- Hugging Face published and verified: [`4cd62fac70fc4cb55602686c4ca7bc42c63bbe84`](https://huggingface.co/datasets/noahmclaughlin/RTR-bench/commit/4cd62fac70fc4cb55602686c4ca7bc42c63bbe84). All 19 package files matched, and the remote dataset loaded all 165 rows.

## npm status

**Prepared; maintainer will publish manually.** The maintainer chose to complete npm publication themselves after the authentication handoff. Registry `latest` was still 0.2.1 after the attempted publication. npm required browser authentication; that authorization expired, and the existing session subsequently returned HTTP 401. A fresh interactive login is required. No account security settings were changed.

Reviewed tarball: `rtr-bench-0.2.2.tgz` (27 files, 411242 bytes). It contains no credentials or raw evaluation responses.

SHA-1: `65423f9442acd99e6307d2fa97417e331e37e5a9`

Integrity: `sha512-SUyW42m1gF265SWzX1CqVvNqoPV7Mucok7DoAG3yM/JP4ZpPy8U6E2ucRHDzB2ChQPmDPdbePdq/qxZDjtGQuw==`

On the maintainer's machine, the reviewed artifact is `/tmp/rtr-release-final/rtr-bench-0.2.2.tgz`:

```bash
npm login
npm publish /tmp/rtr-release-final/rtr-bench-0.2.2.tgz --access public
npm view rtr-bench@latest version
npm view rtr-bench@0.2.2 dist.integrity
```

The registry integrity must match the reviewed artifact above. If rebuilding later, run the checks in [npm release instructions](npm-release.md) and review the new tarball before publishing it.
