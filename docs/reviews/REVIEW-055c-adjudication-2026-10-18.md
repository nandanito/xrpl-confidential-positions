# REVIEW-055c — adjudication: F-12, two rounds, filed as mpt-crypto#154

- **Subject:** the F-12 draft: `build-wasm.sh` links C++ with `emcc`, which fails from emsdk 6.0.6.
- **Evidence:** the 2026-09-28 build logs were lost with the temporary directories, so the experiment was re-run on 2026-10-18 and its 57 logs are committed under `docs/evidence/f12-emsdk-2026-10-18/`. 16 builds and 12 test runs at `3baaaac`, one emsdk clone per version, 6.0.2 to 6.0.12. New since September: 6.0.12 lists two more undefined symbols.
- **Rounds:** two isolated Codex legs on 2026-10-18, with network, recorded in `REVIEW-055-packets/`. **Round one re-ran the builds itself**, on its own emsdk installs, and reproduced the failure at 6.0.6, 6.0.10 and 6.0.12 and both fixes.
- **Filed:** 2026-10-18 as [mpt-crypto#154](https://github.com/XRPLF/mpt-crypto/issues/154). Archived at `docs/upstream-filings/2026-10-18/02-mptcrypto-wasm-link.md`.

**Round one:** three wording findings upheld (narrow the corpus sentence, state macOS arm64, collapse the source bullets); one rejected (marking the reviewer's own re-run coverage in the filing, since every table cell is the author's logged run). The prerequisites quotation was made exact while fixing.

**Round two:** one finding, upheld: *"the changelog describes the change for all platforms"* went beyond the evidence. The title now names the versions tested to fail, and the opening says only that the changelog entry names no platform, which is checkable at the `6.0.6` tag. No third round.

**Filing day:** a second model changed *"recommends"* to the changelog's own word, *required*, and repaired a sentence fragment.
