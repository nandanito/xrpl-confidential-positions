# F-12 evidence: mpt-crypto WASM link step and emsdk 6.0.6+

Re-run of the F-12 experiment on 2026-10-18. The run logs are timestamped from 00:57:24 to 01:07:10 UTC. Setup started at 00:49 UTC, and the evidence checks ran until about 01:15 UTC. The earlier run of 2026-09-28 lost its logs. This directory holds the logs of this run (`logs/`) and this summary. Every number below was copied or generated from those logs. The logs were committed on 2026-10-18, after `make check-no-secrets`, with one change: `tools/scrub-personal-data.ts` replaced the home directory with `$HOME` and the macOS per-user temp root with `$USER_TMP`, in the logs and in this file. No other byte changed. Three recorded script hashes no longer reproduce from the scrubbed text because of it; `docs/evidence/secret-sweep-2026-10-18/README.md` says which. Anything not executed is listed under NOT RUN.

Working directory: `$USER_TMP/T/f12b.epIe0s`. It holds the source trees, emsdk installs and build outputs, none of which were copied here.

## Claim under test

`.github/scripts/build-wasm.sh` in XRPLF/mpt-crypto compiles `src/utility/mpt_utility.cpp` with `em++` (line 272) but links with plain `emcc` on lines 363, 365 and 374 at commit `3baaaac`. Emscripten 6.0.6 disabled `DEFAULT_TO_CXX` by default. So the link fails from 6.0.6 on, and switching the three link lines to `em++` or adding `-sDEFAULT_TO_CXX` fixes it.

## Differences from the claim

1. At the newest emsdk, 6.0.12, the unpatched build still fails at line 363. But it reports 10 undefined symbols, not 8. The two extra symbols are `__cxa_guard_acquire` and `__cxa_guard_release`, and they print before the claim's 8. At 6.0.6 and 6.0.10 the set is exactly the claim's 8. The sorted symbol list hashes the same in all three 8-symbol logs: 6.0.6 unpatched, 6.0.10 unpatched and 6.0.6 partial (`logs/08-gen-tables-and-symbol-sets.log`). Why 6.0.12 adds two was not investigated. 6.0.11 was not run.
2. At 6.0.10 and 6.0.12 every link also prints `WASM_BIGINT is deprecated`, because the script passes `-sWASM_BIGINT=1`. It appears once on a failed build and three times on a successful one. It does not fail the build. The deprecation is listed under 6.0.8 in the 6.0.12 ChangeLog (line 97).
3. The ChangeLog shipped inside the 6.0.6 install heads that section `6.0.6 (in development)` (line 21). The entry is at lines 23-25. The dated header `6.0.6 - 08/05/26` only appears in later installs, at line 120 in the 6.0.12 file. A citation should name which file it quotes.
4. Every other part of the claim reproduced: the 6.0.2 control, the builds at 6.0.3 to 6.0.5, the 6.0.6 and 6.0.10 failures at line 363 (warning text included), both fixes at 6.0.2, 6.0.6, 6.0.10 and 6.0.12, byte identity at 6.0.2, and the partial patch failing at line 374.
5. Platform: this ran on macOS arm64 with bash 3.2, not on CI's `ubuntu-latest`. See the environment section.

## Environment record

From `logs/02-environment.log` and the per-run logs.

| Item | Value |
|---|---|
| OS | macOS 26.6.2 (build 25G83), Darwin 25.6.0, `arm64` |
| CPU / RAM | 12 logical CPUs (`hw.ncpu`), 19327352832 bytes (`hw.memsize`) |
| `cmake --version` | cmake version 4.4.2 (`/opt/homebrew/bin/cmake`) |
| `python3 --version` | Python 3.14.5 (`/opt/homebrew/bin/python3`). emsdk sets `EMSDK_PYTHON` to its own bundled python 3.13.3 in every install |
| `node --version` | v22.23.2 on the default PATH. The runs used v22.22.3 (`$HOME/.nvm/versions/node/v22.22.3/bin`), put first on PATH after sourcing emsdk. emsdk's bundled node 24.19.0 is `EMSDK_NODE` in every install |
| `git --version` | git version 2.50.1 (Apple Git-155) |
| bash | `/bin/bash`, GNU bash 3.2.57. This is what the script's `#!/usr/bin/env bash` resolved to |
| Other tools the script calls | perl 5.34.1, curl 8.7.1, GNU Make 3.81, bsdtar 3.5.3, `sha256sum` at `/sbin/sha256sum`, `nproc` at `/opt/homebrew/bin/nproc` |
| `require_cmd` tools | `emcc`, `em++`, `emcmake`, `emmake`, all resolved per run from `$W/emsdk-<v>/upstream/emscripten/` (paths in each run log under `---- which`) |
| Emscripten env vars and global config | none. An `env` grep for `EM_`, `EMSDK`, `EMCC`, `CC=`, `CFLAGS` and similar matched nothing, and `~/.emscripten` and `~/.emscripten_cache` do not exist. The grep ran before the builds too, but only the post-run check was saved (`logs/02b-environment-vars.log`). Each emsdk used its own embedded `.emscripten` |

How this differs from CI (`.github/workflows/build-wasm.yml` at `3baaaac`):

- CI runs on `ubuntu-latest`. This run used macOS arm64.
- CI installs emsdk with `mymindstorm/setup-emsdk@v14` (`version: 6.0.2`). This run cloned emsdk (main at `1c9a998ee5dd2e38aec0c5abbf23dffdb8f10d57`, 2026-10-16) once per version and ran `./emsdk install <v>` and `./emsdk activate <v>`.
- CI's `actions/setup-node` gives the newest Node 22. This run used 22.22.3.
- CI uses the runner's bash 5. This run used bash 3.2.
- The CI steps "Package WASM bundle" and "Upload bundle" were not run.

## Source record

From `logs/01-source.log` and `logs/04-worktrees.log`.

- `git clone https://github.com/XRPLF/mpt-crypto.git`, at 2026-10-18T00:49Z.
- `origin/main` today: `c60a60cc82eac5f7446480e0363105b8ace44631` (2026-10-01, "feat(rotate): ElGamal key-rotation proofs (9 of 9) (#142)").
- Commit under test: `3baaaac33dadec3e649846e487f452c5b6b2d825` (2026-08-20, "ci: emit a browser-only ESM glue (mpt_crypto.web.mjs) (#139)"). It is an ancestor of `origin/main`, with one commit between them.
- `git diff --stat 3baaaac origin/main -- .github/scripts/build-wasm.sh .github/workflows/build-wasm.yml .github/scripts/test-wasm.sh` is empty. The three files are unchanged at `origin/main`, but only `3baaaac` was built.
- Each run used its own `git worktree add --detach` at `3baaaac`. Every run log records `git rev-parse HEAD` = `3baaaac33dadec3e649846e487f452c5b6b2d825`, plus `git status` and `git diff`.

## emsdk installs

From `logs/03-emsdk-tags.log` and `logs/emsdk-install-<v>.log`. The newest tag on 2026-10-18 was 6.0.12. The full first line of `emcc --version` is `emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) <version> (<hash>)`.

| emsdk | emsdk tag commit (`git ls-remote`) | `emcc --version` version and hash | install / activate exit |
|---|---|---|---|
| 6.0.2 | `ca38f487f28b7c3c16f8f70cd0e012099ac4b7e2` | 6.0.2 (7a2d97d627ff4945eae28847ce0387ac52b92c09) | 0 / 0 |
| 6.0.3 | `db04e88298d9916fc51fcd3743045ca3eb695127` | 6.0.3 (283e2d130132859fde6a4e4c87fd254b38127651) | 0 / 0 |
| 6.0.4 | `224ec5f9f2f72f09f9ce0e26d66bae7dbd8b692f` | 6.0.4 (fe5be6afdff43ad58860d821fcc8572a23f92d19) | 0 / 0 |
| 6.0.5 | `dfb9d1a46c3bb8f52e1e6324be23123b9d73c190` | 6.0.5 (1db513782be24469589d7cb8a1f1834e9a33f271) | 0 / 0 |
| 6.0.6 | `9981799f744be74ac67b1c1813ff172f63be0630` | 6.0.6 (ce75e06884093bcefb86a6b8fd56a5d62a4cc245) | 0 / 0 |
| 6.0.10 | `a2b92777574c2feda07994cd4f1079a3dfc151f8` | 6.0.10 (d6c521a7f05449857c76bd99e396895583cf2083) | 0 / 0 |
| 6.0.12 | `35ff8a6d150541276abbc6bae512ca90bcfbe220` | 6.0.12 (5488e0871d46d19a3209988190fa6a653126256f) | 0 / 0 |

## Results

Generated from the run logs by `gen-tables.py`, which is reproduced under Exact commands and saved in `logs/08-gen-tables-and-symbol-sets.log`. "Step reached" for failed builds comes from the diagnostic `bash -x` re-run (`<label>-xtrace.log`, with `PS4` printing the script line number). The primary log agrees independently. A line-363 failure leaves `emcc_out/` empty. The line-374 failure leaves `mpt_crypto.js`, `mpt_crypto.mjs` and `mpt_crypto.wasm`, and its `wasm-ld` errors name the `mktemp -d` directory that only line 374 writes to.

| Run label | emsdk | Variant | `emcc --version` (version and hash) | Build exit | Step reached / error | Sizes in bytes: js / mjs / web.mjs / wasm | Tests (ctest; glue smoke) | sha256 vs 6.0.2 unpatched |
|---|---|---|---|---|---|---|---|---|
| `v6.0.2-unpatched` | 6.0.2 | unpatched | 6.0.2 (7a2d97d627ff4945eae28847ce0387ac52b92c09) | 0 | all five steps; `==> Done!` | 64186 / 64211 / 63138 / 2110544 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | (baseline) |
| `v6.0.2-empp` | 6.0.2 | `em++` on 363/365/374 | 6.0.2 (7a2d97d627ff4945eae28847ce0387ac52b92c09) | 0 | all five steps; `==> Done!` | 64186 / 64211 / 63138 / 2110544 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | identical, all 4 files |
| `v6.0.2-dcxx` | 6.0.2 | `-sDEFAULT_TO_CXX` on 363/365/374 | 6.0.2 (7a2d97d627ff4945eae28847ce0387ac52b92c09) | 0 | all five steps; `==> Done!` | 64186 / 64211 / 63138 / 2110544 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | identical, all 4 files |
| `v6.0.3-unpatched` | 6.0.3 | unpatched | 6.0.3 (283e2d130132859fde6a4e4c87fd254b38127651) | 0 | all five steps; `==> Done!` | 65186 / 65211 / 64138 / 2110518 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | n/a (different emsdk) |
| `v6.0.4-unpatched` | 6.0.4 | unpatched | 6.0.4 (fe5be6afdff43ad58860d821fcc8572a23f92d19) | 0 | all five steps; `==> Done!` | 65242 / 65267 / 64194 / 2110687 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | n/a (different emsdk) |
| `v6.0.5-unpatched` | 6.0.5 | unpatched | 6.0.5 (1db513782be24469589d7cb8a1f1834e9a33f271) | 0 | all five steps; `==> Done!` | 65242 / 65267 / 64194 / 2110673 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | n/a (different emsdk) |
| `v6.0.6-unpatched` | 6.0.6 | unpatched | 6.0.6 (ce75e06884093bcefb86a6b8fd56a5d62a4cc245) | 1 | link at line 363 (`emcc`) failed: 8 `undefined symbol` errors + the `em++`/`-sDEFAULT_TO_CXX` warning | absent / absent / absent / absent | not run (build failed) | n/a (different emsdk) |
| `v6.0.6-empp` | 6.0.6 | `em++` on 363/365/374 | 6.0.6 (ce75e06884093bcefb86a6b8fd56a5d62a4cc245) | 0 | all five steps; `==> Done!` | 65211 / 65236 / 64163 / 2110620 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | n/a (different emsdk) |
| `v6.0.6-dcxx` | 6.0.6 | `-sDEFAULT_TO_CXX` on 363/365/374 | 6.0.6 (ce75e06884093bcefb86a6b8fd56a5d62a4cc245) | 0 | all five steps; `==> Done!` | 65211 / 65236 / 64163 / 2110620 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | n/a (different emsdk) |
| `v6.0.6-partial` | 6.0.6 | `em++` on 363/365 only | 6.0.6 (ce75e06884093bcefb86a6b8fd56a5d62a4cc245) | 1 | link at line 374 (`emcc`) failed: 8 `undefined symbol` errors + the `em++`/`-sDEFAULT_TO_CXX` warning | 65211 / 65236 / absent / 2110620 | not run (build failed) | n/a (different emsdk) |
| `v6.0.10-unpatched` | 6.0.10 | unpatched | 6.0.10 (d6c521a7f05449857c76bd99e396895583cf2083) | 1 | link at line 363 (`emcc`) failed: 8 `undefined symbol` errors + the `em++`/`-sDEFAULT_TO_CXX` warning | absent / absent / absent / absent | not run (build failed) | n/a (different emsdk) |
| `v6.0.10-empp` | 6.0.10 | `em++` on 363/365/374 | 6.0.10 (d6c521a7f05449857c76bd99e396895583cf2083) | 0 | all five steps; `==> Done!` | 65295 / 65320 / 64247 / 2110515 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | n/a (different emsdk) |
| `v6.0.10-dcxx` | 6.0.10 | `-sDEFAULT_TO_CXX` on 363/365/374 | 6.0.10 (d6c521a7f05449857c76bd99e396895583cf2083) | 0 | all five steps; `==> Done!` | 65295 / 65320 / 64247 / 2110515 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | n/a (different emsdk) |
| `v6.0.12-unpatched` | 6.0.12 | unpatched | 6.0.12 (5488e0871d46d19a3209988190fa6a653126256f) | 1 | link at line 363 (`emcc`) failed: 10 `undefined symbol` errors + the `em++`/`-sDEFAULT_TO_CXX` warning | absent / absent / absent / absent | not run (build failed) | n/a (different emsdk) |
| `v6.0.12-empp` | 6.0.12 | `em++` on 363/365/374 | 6.0.12 (5488e0871d46d19a3209988190fa6a653126256f) | 0 | all five steps; `==> Done!` | 65314 / 65340 / 64283 / 2109106 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | n/a (different emsdk) |
| `v6.0.12-dcxx` | 6.0.12 | `-sDEFAULT_TO_CXX` on 363/365/374 | 6.0.12 (5488e0871d46d19a3209988190fa6a653126256f) | 0 | all five steps; `==> Done!` | 65314 / 65340 / 64283 / 2109106 | 100% tests passed out of 12; 3/3 glue OK; exit 0 | n/a (different emsdk) |

Test counts come from CI's "Test WASM module" step. It runs `GLUE_DIR=<worktree>/output ./.github/scripts/test-wasm.sh` after CI's "Stage WASM bundle" copy into `output/`. ctest ran 12 tests (`test_elgamal`, `test_elgamal_verify`, `test_pok_sk`, `test_commitments`, `test_ipa`, `test_bulletproof_agg`, `test_mpt_utility`, `test_compact_standard`, `test_compact_clawback`, `test_compact_convertback`, `test_ct_tweak_mul`, `test_bsgs_dlp`). The glue smoke test checks the three glues. The tests at 6.0.3, 6.0.4 and 6.0.5 unpatched, and every `-sDEFAULT_TO_CXX` run at 6.0.10, are extras beyond the requested set.

The 6.0.2 unpatched control built and passed, so the run is not INCONCLUSIVE.

### Error lines from the failed builds

Copied from the primary logs, with the absolute path before `mpt_crypto.wasm.lto.o` replaced by `<...>`. Each failed build then prints one `emcc: error: '<...>/wasm-ld ...' failed (returned 1)` line, kept in full in the logs.

```
== v6.0.6-unpatched
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: operator new(unsigned long)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: operator delete(void*, unsigned long)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_allocate_exception
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: typeinfo for std::length_error
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: std::length_error::~length_error()
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_throw
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: std::logic_error::logic_error(char const*)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: vtable for std::length_error
emcc: warning: link failed with undefined C++ symbols. Try linking with 'em++' or passing '-sDEFAULT_TO_CXX'
== v6.0.10-unpatched
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: operator new(unsigned long)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: operator delete(void*, unsigned long)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_allocate_exception
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: typeinfo for std::length_error
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: std::length_error::~length_error()
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_throw
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: std::logic_error::logic_error(char const*)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: vtable for std::length_error
emcc: warning: link failed with undefined C++ symbols. Try linking with 'em++' or passing '-sDEFAULT_TO_CXX'
== v6.0.12-unpatched
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_guard_acquire
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_guard_release
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: operator new(unsigned long)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: operator delete(void*, unsigned long)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_allocate_exception
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: typeinfo for std::length_error
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: std::length_error::~length_error()
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_throw
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: std::logic_error::logic_error(char const*)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: vtable for std::length_error
emcc: warning: link failed with undefined C++ symbols. Try linking with 'em++' or passing '-sDEFAULT_TO_CXX'
== v6.0.6-partial
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: operator new(unsigned long)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: operator delete(void*, unsigned long)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_allocate_exception
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: typeinfo for std::length_error
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: std::length_error::~length_error()
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: __cxa_throw
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: std::logic_error::logic_error(char const*)
wasm-ld: error: <...>/mpt_crypto.wasm.lto.o: undefined symbol: vtable for std::length_error
emcc: warning: link failed with undefined C++ symbols. Try linking with 'em++' or passing '-sDEFAULT_TO_CXX'
```

## Byte identity at 6.0.2

From `logs/07-byte-identity.log`. `shasum -a 256` and `cmp` over `emcc_out/` and the staged `output/` of each run.

| File | unpatched sha256 | `em++` | `-sDEFAULT_TO_CXX` |
|---|---|---|---|
| `mpt_crypto.js` | `2d568a94344685d53712593678230f56696f1483f5e5859a32ce266c10fc8af2` | identical (cmp exit 0) | identical (cmp exit 0) |
| `mpt_crypto.mjs` | `8ae3ad22a8c706ffec63d5d90066d5a2379d3c8f449da8537b05d9e66ab67a1b` | identical (cmp exit 0) | identical (cmp exit 0) |
| `mpt_crypto.web.mjs` | `d3a8aad8ce2547e6b17c8ef1abd13c69eda8ae7b77f89ce602adbdcb1efbac4d` | identical (cmp exit 0) | identical (cmp exit 0) |
| `mpt_crypto.wasm` | `68ddb99a0e70f99d88bbf82ba135e8a8f75817a630d774f1f5798e8c37ff6c86` | identical (cmp exit 0) | identical (cmp exit 0) |

All four files are byte-identical across the three variants (`cmp` exit 0 for all eight comparisons). The three runs used different worktree paths, so the outputs do not embed the worktree path. Two more comparisons, not requested: at 6.0.6, 6.0.10 and 6.0.12 the `em++` and `-sDEFAULT_TO_CXX` outputs are byte-identical to each other. The 6.0.6 partial run's `mpt_crypto.js`, `.mjs` and `.wasm` (from lines 363 and 365) are byte-identical to the 6.0.6 `em++` run's.

## Cause

From `logs/05-cause-changelog.log`. `upstream/emscripten/ChangeLog.md` in the 6.0.6 install (sha256 `57d5fe6b8fdbdab64d7e9ead2913759d026c037f66f9046eb9ffa3955933d843`), with file line numbers:

```
21	6.0.6 (in development)
22	----------------------
23	- `DEFAULT_TO_CXX` is now disabled by default. This means that `em++` is now
24	  required when linking C++ programs, matching the behavior of clang and gcc.
25	  The old behavior is still available using `-sDEFAULT_TO_CXX`. (#11121)
```

The ChangeLog in the 6.0.5 install has no such entry. Its only `DEFAULT_TO_CXX` match is an older note at line 1171. The 6.0.12 install carries the same entry at lines 122-124, under the header `6.0.6 - 08/05/26` at line 120 (`logs/05b-cause-changelog-6.0.12-context.log`).

Identifiers for matching 6.0.6:

- emsdk tag `6.0.6` resolves to commit `9981799f744be74ac67b1c1813ff172f63be0630`.
- `emcc --version` prints `6.0.6 (ce75e06884093bcefb86a6b8fd56a5d62a4cc245)`.
- emsdk's `emscripten-releases-tags.json` maps `"6.0.6"` to `833aa203ba2283fc2b6adb504a79a3a0d692df81`.

## Exact commands

Shell for the driver commands: zsh. Every build, test and trace ran under `/bin/bash` through the scripts below. Each run's output went to its own log through `> "$W/logs/<label>.log" 2>&1`, then `exit <code>` was appended. No running build was piped through `tail`, `grep` or `head`.

```
W=$(mktemp -d "${TMPDIR%/}/f12b.XXXXXX")    # $USER_TMP/T/f12b.epIe0s
mkdir -p "$W/logs" "$W/scripts" "$W/wt"
git clone https://github.com/XRPLF/mpt-crypto.git "$W/mpt-crypto" > "$W/logs/00-clone.log" 2>&1
git ls-remote --tags https://github.com/emscripten-core/emsdk.git      # into logs/03-emsdk-tags.log

# emsdk: one clone per version, all seven in parallel
for v in 6.0.2 6.0.3 6.0.4 6.0.5 6.0.6 6.0.10 6.0.12; do
  ( /bin/bash "$W/scripts/install-emsdk.sh" "$W" "$v" > "$W/logs/emsdk-install-$v.log" 2>&1
    printf '%s\n' "exit $?" >> "$W/logs/emsdk-install-$v.log" ) &
done; wait

# one detached worktree per run, created sequentially (logs/04-worktrees.log)
for label in v6.0.2-unpatched v6.0.2-empp v6.0.2-dcxx v6.0.3-unpatched v6.0.4-unpatched v6.0.5-unpatched \
             v6.0.6-unpatched v6.0.6-empp v6.0.6-dcxx v6.0.6-partial v6.0.10-unpatched v6.0.10-empp v6.0.10-dcxx \
             v6.0.12-unpatched v6.0.12-empp v6.0.12-dcxx; do
  git -C "$W/mpt-crypto" worktree add --detach "$W/wt/$label" 3baaaac33dadec3e649846e487f452c5b6b2d825
done

# runs: groups ran concurrently (five background shells); runs inside a group ran in sequence
/bin/bash "$W/scripts/run-group.sh" "$W" 6.0.2  unpatched empp dcxx         > "$W/logs/group-6.0.2.log" 2>&1
/bin/bash "$W/scripts/run-group.sh" "$W" 6.0.6  unpatched empp dcxx partial > "$W/logs/group-6.0.6.log" 2>&1
/bin/bash "$W/scripts/run-group.sh" "$W" 6.0.10 unpatched empp dcxx         > "$W/logs/group-6.0.10.log" 2>&1
/bin/bash "$W/scripts/run-group.sh" "$W" 6.0.12 unpatched empp dcxx         > "$W/logs/group-6.0.12.log" 2>&1
for v in 6.0.3 6.0.4 6.0.5; do
  /bin/bash "$W/scripts/run-group.sh" "$W" "$v" unpatched > "$W/logs/group-$v.log" 2>&1
done
```

The build step inside `run-build.sh` is CI's own invocation, `./.github/scripts/build-wasm.sh`, run from the worktree root. The test step inside `run-test.sh` is CI's `GLUE_DIR=<worktree>/output ./.github/scripts/test-wasm.sh`. The patch commands (BSD `sed`, line-addressed):

```
# em++
sed -i '' -e '363s/^emcc "/em++ "/' -e '365s/^emcc "/em++ "/' -e '374s/^emcc "/em++ "/' .github/scripts/build-wasm.sh
# -sDEFAULT_TO_CXX
sed -i '' -e '363s/^emcc "/emcc -sDEFAULT_TO_CXX "/' -e '365s/^emcc "/emcc -sDEFAULT_TO_CXX "/' -e '374s/^emcc "/emcc -sDEFAULT_TO_CXX "/' .github/scripts/build-wasm.sh
# partial
sed -i '' -e '363s/^emcc "/em++ "/' -e '365s/^emcc "/em++ "/' .github/scripts/build-wasm.sh
```

The scripts, verbatim except for the scrub (also in `logs/06-runner-scripts.log` with their sha256). `run-build.sh`, `run-test.sh` and `run-xtrace.sh` each had the home directory on their `NODE22=` line, now `$HOME`, so their recorded sha256 is over the unscrubbed text and does not reproduce from these copies. The other two still reproduce.

`install-emsdk.sh`:

```bash
#!/bin/bash
# install-emsdk.sh <W> <version>: one emsdk clone per version, CI-style install+activate.
set -u
W="$1"; v="$2"; d="$W/emsdk-$v"
printf '%s\n' "==== emsdk install $v  start $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git clone https://github.com/emscripten-core/emsdk.git "$d"; printf '%s\n' "clone exit $?"
printf '%s\n' "---- emsdk clone HEAD (main at clone time)"
git -C "$d" log -1 --format='%H %ci %s'
printf '%s\n' "---- emsdk tag $v resolves to"
git -C "$d" rev-parse "refs/tags/$v^{commit}"
cd "$d" || exit 99
./emsdk install "$v"; rc=$?; printf '%s\n' "install exit $rc"
[ $rc -eq 0 ] || exit $rc
./emsdk activate "$v"; rc=$?; printf '%s\n' "activate exit $rc"
[ $rc -eq 0 ] || exit $rc
printf '%s\n' "---- .emscripten (embedded config)"
cat "$d/.emscripten"
. "$d/emsdk_env.sh"
printf '%s\n' "---- emcc --version"; emcc --version
printf '%s\n' "---- emsdk list (installed)"; ./emsdk list 2>&1 | grep -E 'INSTALLED|\*' | head -n 40
printf '%s\n' "---- emscripten-version.txt"; cat "$d/upstream/emscripten/emscripten-version.txt"
printf '%s\n' "==== emsdk install $v  end $(date -u +%Y-%m-%dT%H:%M:%SZ)"
exit 0
```

`run-group.sh`:

```bash
#!/bin/bash
# run-group.sh <W> <emsdk-version> <variant>...: sequential runs for one emsdk version.
set -u
W="$1"; v="$2"; shift 2
for variant in "$@"; do
  label="v${v}-${variant}"
  log="$W/logs/${label}.log"
  /bin/bash "$W/scripts/run-build.sh" "$W" "$label" "$v" "$variant" > "$log" 2>&1
  rc=$?
  printf 'exit %s\n' "$rc" >> "$log"
  printf '%s\n' "$label build exit $rc"
  if [ "$rc" -eq 0 ]; then
    tlog="$W/logs/${label}-test.log"
    /bin/bash "$W/scripts/run-test.sh" "$W" "$label" "$v" > "$tlog" 2>&1
    trc=$?
    printf 'exit %s\n' "$trc" >> "$tlog"
    printf '%s\n' "$label test exit $trc"
  else
    xlog="$W/logs/${label}-xtrace.log"
    /bin/bash "$W/scripts/run-xtrace.sh" "$W" "$label" "$v" > "$xlog" 2>&1
    xrc=$?
    printf 'exit %s\n' "$xrc" >> "$xlog"
    printf '%s\n' "$label xtrace exit $xrc"
  fi
done
```

`run-build.sh`:

```bash
#!/bin/bash
# run-build.sh <W> <label> <emsdk-version> <variant>
# variant: unpatched | empp | dcxx | partial
set -u
W="$1"; label="$2"; v="$3"; variant="$4"
R="$W/mpt-crypto"; WT="$W/wt/$label"; E="$W/emsdk-$v"
COMMIT=3baaaac33dadec3e649846e487f452c5b6b2d825
NODE22=$HOME/.nvm/versions/node/v22.22.3/bin
S=.github/scripts/build-wasm.sh
printf '%s\n' "==== run $label  (emsdk $v, variant $variant)  start $(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [ -d "$WT" ]; then printf '%s\n' "worktree pre-created (see 04-worktrees.log): $WT"; else git -C "$R" worktree add --detach "$WT" "$COMMIT"; printf '%s\n' "worktree add exit $?"; fi
printf '%s\n' "---- git worktree list entry"; git -C "$R" worktree list --porcelain | grep -A2 "/wt/$label\$"
cd "$WT" || exit 98
case "$variant" in
  unpatched) ;;
  empp)    sed -i '' -e '363s/^emcc "/em++ "/' -e '365s/^emcc "/em++ "/' -e '374s/^emcc "/em++ "/' "$S" ;;
  dcxx)    sed -i '' -e '363s/^emcc "/emcc -sDEFAULT_TO_CXX "/' -e '365s/^emcc "/emcc -sDEFAULT_TO_CXX "/' -e '374s/^emcc "/emcc -sDEFAULT_TO_CXX "/' "$S" ;;
  partial) sed -i '' -e '363s/^emcc "/em++ "/' -e '365s/^emcc "/em++ "/' "$S" ;;
  *) printf '%s\n' "unknown variant $variant"; exit 97 ;;
esac
printf '%s\n' "---- git rev-parse HEAD"; git rev-parse HEAD
printf '%s\n' "---- git status"; git status
printf '%s\n' "---- git diff --numstat"; git diff --numstat
printf '%s\n' "---- git diff"; git diff
printf '%s\n' "---- link lines in $S now (grep -nE '^(emcc|em\+\+) ')"; grep -nE '^(emcc|em\+\+) ' "$S"
. "$E/emsdk_env.sh"
export PATH="$NODE22:$PATH"
printf '%s\n' "---- PATH"; printf '%s\n' "$PATH"
printf '%s\n' "---- which"; command -v emcc em++ emcmake emmake node cmake bash
printf '%s\n' "---- emcc --version"; emcc --version
printf '%s\n' "---- em++ --version"; em++ --version
printf '%s\n' "---- node --version"; node --version
printf '%s\n' "---- cmake --version"; cmake --version
printf '%s\n' "==== BUILD: ./.github/scripts/build-wasm.sh  start $(date -u +%Y-%m-%dT%H:%M:%SZ)"
./.github/scripts/build-wasm.sh
rc=$?
printf '%s\n' "==== BUILD EXIT: $rc  end $(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '%s\n' "---- emcc_out listing"; ls -la emcc_out
printf '%s\n' "---- emcc_out sizes (wc -c)"; wc -c emcc_out/* 2>&1
printf '%s\n' "---- emcc_out sha256"; shasum -a 256 emcc_out/* 2>&1
if [ "$rc" -eq 0 ]; then
  printf '%s\n' "---- Stage WASM bundle (CI step: mkdir -p output; cp emcc_out/{js,mjs,web.mjs,wasm} output/)"
  mkdir -p output && cp emcc_out/mpt_crypto.js emcc_out/mpt_crypto.mjs emcc_out/mpt_crypto.web.mjs emcc_out/mpt_crypto.wasm output/
  printf '%s\n' "stage exit $?"
  printf '%s\n' "---- output sha256"; shasum -a 256 output/*
fi
printf '%s\n' "---- git status after build"; git status --short
printf '%s\n' "==== run $label  end $(date -u +%Y-%m-%dT%H:%M:%SZ)  build-exit $rc"
exit "$rc"
```

`run-test.sh`:

```bash
#!/bin/bash
# run-test.sh <W> <label> <emsdk-version>: CI's "Test WASM module" step against the staged bundle.
set -u
W="$1"; label="$2"; v="$3"; WT="$W/wt/$label"; E="$W/emsdk-$v"
NODE22=$HOME/.nvm/versions/node/v22.22.3/bin
printf '%s\n' "==== test $label (emsdk $v)  start $(date -u +%Y-%m-%dT%H:%M:%SZ)"
cd "$WT" || exit 98
printf '%s\n' "---- git rev-parse HEAD"; git rev-parse HEAD
printf '%s\n' "---- git status"; git status --short
printf '%s\n' "---- git diff --numstat"; git diff --numstat
. "$E/emsdk_env.sh"
export PATH="$NODE22:$PATH"
printf '%s\n' "---- emcc --version"; emcc --version
printf '%s\n' "---- node"; command -v node; node --version
export GLUE_DIR="$WT/output"
printf '%s\n' "---- GLUE_DIR=$GLUE_DIR"; ls -la "$GLUE_DIR"
printf '%s\n' "==== TEST: GLUE_DIR=\$WT/output ./.github/scripts/test-wasm.sh  start $(date -u +%Y-%m-%dT%H:%M:%SZ)"
./.github/scripts/test-wasm.sh
rc=$?
printf '%s\n' "==== TEST EXIT: $rc  end $(date -u +%Y-%m-%dT%H:%M:%SZ)"
exit "$rc"
```

`run-xtrace.sh`:

```bash
#!/bin/bash
# run-xtrace.sh <W> <label> <emsdk-version>: DIAGNOSTIC re-run of a failed build in its own
# worktree with bash -x and line numbers, to identify the failing line. Deps/objects are reused.
set -u
W="$1"; label="$2"; v="$3"; WT="$W/wt/$label"; E="$W/emsdk-$v"
NODE22=$HOME/.nvm/versions/node/v22.22.3/bin
printf '%s\n' "==== DIAGNOSTIC xtrace re-run of $label (emsdk $v)  start $(date -u +%Y-%m-%dT%H:%M:%SZ)"
cd "$WT" || exit 98
printf '%s\n' "---- git rev-parse HEAD"; git rev-parse HEAD
printf '%s\n' "---- git diff --numstat"; git diff --numstat
. "$E/emsdk_env.sh"
export PATH="$NODE22:$PATH"
printf '%s\n' "---- emcc --version"; emcc --version
export PS4='+ ${BASH_SOURCE}:${LINENO}: '
/bin/bash -x ./.github/scripts/build-wasm.sh
rc=$?
printf '%s\n' "==== XTRACE BUILD EXIT: $rc  end $(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '%s\n' "---- emcc_out listing"; ls -la emcc_out
exit "$rc"
```

`gen-tables.py`:

```python
import os, re, sys
W = sys.argv[1]; L = os.path.join(W, "logs")
runs = [("6.0.2","unpatched"),("6.0.2","empp"),("6.0.2","dcxx"),("6.0.3","unpatched"),("6.0.4","unpatched"),
        ("6.0.5","unpatched"),("6.0.6","unpatched"),("6.0.6","empp"),("6.0.6","dcxx"),("6.0.6","partial"),
        ("6.0.10","unpatched"),("6.0.10","empp"),("6.0.10","dcxx"),("6.0.12","unpatched"),("6.0.12","empp"),("6.0.12","dcxx")]
vname = {"unpatched":"unpatched","empp":"`em++` on 363/365/374","dcxx":"`-sDEFAULT_TO_CXX` on 363/365/374","partial":"`em++` on 363/365 only"}
files = ["mpt_crypto.js","mpt_crypto.mjs","mpt_crypto.web.mjs","mpt_crypto.wasm"]
def rd(p):
    return open(p, encoding="utf-8", errors="replace").read() if os.path.exists(p) else None
base = {}
out_main, out_hash = [], []
out_main.append("| Run label | emsdk | Variant | `emcc --version` (version and hash) | Build exit | Step reached / error | Sizes in bytes: js / mjs / web.mjs / wasm | Tests (ctest; glue smoke) | sha256 vs 6.0.2 unpatched |")
out_main.append("|---|---|---|---|---|---|---|---|---|")
for v, var in runs:
    lab = f"v{v}-{var}"; s = rd(os.path.join(L, lab + ".log"))
    ver = re.search(r"^emcc \(Emscripten gcc/clang-like replacement \+ linker emulating GNU ld\) (\S+ \([0-9a-f]+\))", s, re.M).group(1)
    bexit = re.search(r"^==== BUILD EXIT: (\d+)", s, re.M).group(1)
    fexit = re.findall(r"^exit (\d+)$", s, re.M)[-1]
    assert bexit == fexit, lab
    sizes = dict((m.group(2), m.group(1)) for m in re.finditer(r"^\s+(\d+) emcc_out/(\S+)$", s, re.M))
    hashes = dict((m.group(2), m.group(1)) for m in re.finditer(r"^([0-9a-f]{64})  emcc_out/(\S+)$", s, re.M))
    nund = len(re.findall(r"undefined symbol", s))
    if bexit == "0":
        step = "all five steps; `==> Done!`" if "==> Done!" in s else "?"
    else:
        x = rd(os.path.join(L, lab + "-xtrace.log"))
        lines = re.findall(r"^\+ \./\.github/scripts/build-wasm\.sh:(\d+): (emcc|em\+\+) ", x, re.M)
        last = lines[-1] if lines else ("?","?")
        step = f"link at line {last[0]} (`{last[1]}`) failed: {nund} `undefined symbol` errors + the `em++`/`-sDEFAULT_TO_CXX` warning"
    sz = " / ".join(sizes.get(f, "absent") for f in files)
    t = rd(os.path.join(L, lab + "-test.log"))
    if t is None:
        tests = "not run (build failed)"
    else:
        cs = re.search(r"^(\d+% tests passed[^\n]*)$", t, re.M).group(1)
        smoke = len(re.findall(r"^  mpt_crypto\S* +\(\w+\) OK$", t, re.M))
        texit = re.findall(r"^exit (\d+)$", t, re.M)[-1]
        tests = f"{cs}; {smoke}/3 glue OK; exit {texit}"
    if v == "6.0.2" and var == "unpatched":
        base = hashes; ident = "(baseline)"
    elif v == "6.0.2":
        ident = "identical, all 4 files" if all(hashes.get(f) == base.get(f) for f in files) else "DIFFERS"
    else:
        ident = "n/a (different emsdk)"
    out_main.append(f"| `{lab}` | {v} | {vname[var]} | {ver} | {bexit} | {step} | {sz} | {tests} | {ident} |")
    if hashes:
        for f in files:
            if f in hashes:
                out_hash.append(f"| `{lab}` | `{f}` | `{hashes[f]}` |")
open(os.path.join(W, "readme-parts", "table-results.md"), "w").write("\n".join(out_main) + "\n")
open(os.path.join(W, "readme-parts", "table-hashes.md"), "w").write("| Run label | File | sha256 |\n|---|---|---|\n" + "\n".join(out_hash) + "\n")
print("\n".join(out_main))
```

## Patch diffs

Taken from the run logs. Every `em++` run at every version had the same diff, and so did every `-sDEFAULT_TO_CXX` run. Each log shows `git diff --numstat` = `3	3	.github/scripts/build-wasm.sh` for the two full patches and `2	2` for the partial one. The `grep -n` that follows in each log lists the three link lines after patching.

`em++` on lines 363, 365 and 374 (identical in all four `em++` runs), from `logs/v6.0.2-empp.log`. `git diff --numstat`: `3	3	.github/scripts/build-wasm.sh`.

```diff
diff --git a/.github/scripts/build-wasm.sh b/.github/scripts/build-wasm.sh
index 3daa027..5175210 100755
--- a/.github/scripts/build-wasm.sh
+++ b/.github/scripts/build-wasm.sh
@@ -360,9 +360,9 @@ LINK_FLAGS=(
 # Both ESM glues use `new URL('mpt_crypto.wasm', import.meta.url)` so bundlers
 # auto-emit the .wasm as an asset instead of a runtime read. Keep the three links in
 # lockstep — they must wrap the byte-identical module.
-emcc "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
+em++ "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
 wasm_sha_cjs="$(sha256_of "${OUT_DIR}/mpt_crypto.wasm")"
-emcc "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
+em++ "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
 wasm_sha_esm="$(sha256_of "${OUT_DIR}/mpt_crypto.wasm")"
 # Browser-only glue. -sENVIRONMENT=web,worker (overriding web,node) drops the Node
 # code path and its `node:` imports. Emscripten names the .wasm after the -o basename,
@@ -371,7 +371,7 @@ wasm_sha_esm="$(sha256_of "${OUT_DIR}/mpt_crypto.wasm")"
 # mpt_crypto.web.mjs would emit and reference a separate mpt_crypto.web.wasm.
 web_tmp="$(mktemp -d)"
 trap 'rm -rf "${web_tmp}"' EXIT
-emcc "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -sENVIRONMENT=web,worker -o "${web_tmp}/mpt_crypto.mjs"
+em++ "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -sENVIRONMENT=web,worker -o "${web_tmp}/mpt_crypto.mjs"
 wasm_sha_web="$(sha256_of "${web_tmp}/mpt_crypto.wasm")"
 mv "${web_tmp}/mpt_crypto.mjs" "${OUT_DIR}/mpt_crypto.web.mjs"
 
```

Link lines after patching (`grep -nE '^(emcc|em\+\+) '`):

```
363:em++ "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
365:em++ "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
374:em++ "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -sENVIRONMENT=web,worker -o "${web_tmp}/mpt_crypto.mjs"
```

`-sDEFAULT_TO_CXX` on lines 363, 365 and 374 (identical in all four `-sDEFAULT_TO_CXX` runs), from `logs/v6.0.2-dcxx.log`. `git diff --numstat`: `3	3	.github/scripts/build-wasm.sh`.

```diff
diff --git a/.github/scripts/build-wasm.sh b/.github/scripts/build-wasm.sh
index 3daa027..5c5b851 100755
--- a/.github/scripts/build-wasm.sh
+++ b/.github/scripts/build-wasm.sh
@@ -360,9 +360,9 @@ LINK_FLAGS=(
 # Both ESM glues use `new URL('mpt_crypto.wasm', import.meta.url)` so bundlers
 # auto-emit the .wasm as an asset instead of a runtime read. Keep the three links in
 # lockstep — they must wrap the byte-identical module.
-emcc "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
+emcc -sDEFAULT_TO_CXX "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
 wasm_sha_cjs="$(sha256_of "${OUT_DIR}/mpt_crypto.wasm")"
-emcc "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
+emcc -sDEFAULT_TO_CXX "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
 wasm_sha_esm="$(sha256_of "${OUT_DIR}/mpt_crypto.wasm")"
 # Browser-only glue. -sENVIRONMENT=web,worker (overriding web,node) drops the Node
 # code path and its `node:` imports. Emscripten names the .wasm after the -o basename,
@@ -371,7 +371,7 @@ wasm_sha_esm="$(sha256_of "${OUT_DIR}/mpt_crypto.wasm")"
 # mpt_crypto.web.mjs would emit and reference a separate mpt_crypto.web.wasm.
 web_tmp="$(mktemp -d)"
 trap 'rm -rf "${web_tmp}"' EXIT
-emcc "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -sENVIRONMENT=web,worker -o "${web_tmp}/mpt_crypto.mjs"
+emcc -sDEFAULT_TO_CXX "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -sENVIRONMENT=web,worker -o "${web_tmp}/mpt_crypto.mjs"
 wasm_sha_web="$(sha256_of "${web_tmp}/mpt_crypto.wasm")"
 mv "${web_tmp}/mpt_crypto.mjs" "${OUT_DIR}/mpt_crypto.web.mjs"
 
```

Link lines after patching (`grep -nE '^(emcc|em\+\+) '`):

```
363:emcc -sDEFAULT_TO_CXX "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
365:emcc -sDEFAULT_TO_CXX "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
374:emcc -sDEFAULT_TO_CXX "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -sENVIRONMENT=web,worker -o "${web_tmp}/mpt_crypto.mjs"
```

partial: `em++` on lines 363 and 365 only, from `logs/v6.0.6-partial.log`. `git diff --numstat`: `2	2	.github/scripts/build-wasm.sh`.

```diff
diff --git a/.github/scripts/build-wasm.sh b/.github/scripts/build-wasm.sh
index 3daa027..a70be83 100755
--- a/.github/scripts/build-wasm.sh
+++ b/.github/scripts/build-wasm.sh
@@ -360,9 +360,9 @@ LINK_FLAGS=(
 # Both ESM glues use `new URL('mpt_crypto.wasm', import.meta.url)` so bundlers
 # auto-emit the .wasm as an asset instead of a runtime read. Keep the three links in
 # lockstep — they must wrap the byte-identical module.
-emcc "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
+em++ "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
 wasm_sha_cjs="$(sha256_of "${OUT_DIR}/mpt_crypto.wasm")"
-emcc "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
+em++ "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
 wasm_sha_esm="$(sha256_of "${OUT_DIR}/mpt_crypto.wasm")"
 # Browser-only glue. -sENVIRONMENT=web,worker (overriding web,node) drops the Node
 # code path and its `node:` imports. Emscripten names the .wasm after the -o basename,
```

Link lines after patching (`grep -nE '^(emcc|em\+\+) '`):

```
363:em++ "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
365:em++ "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
374:emcc "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -sENVIRONMENT=web,worker -o "${web_tmp}/mpt_crypto.mjs"
```

## sha256 of every output file

| Run label | File | sha256 |
|---|---|---|
| `v6.0.2-unpatched` | `mpt_crypto.js` | `2d568a94344685d53712593678230f56696f1483f5e5859a32ce266c10fc8af2` |
| `v6.0.2-unpatched` | `mpt_crypto.mjs` | `8ae3ad22a8c706ffec63d5d90066d5a2379d3c8f449da8537b05d9e66ab67a1b` |
| `v6.0.2-unpatched` | `mpt_crypto.web.mjs` | `d3a8aad8ce2547e6b17c8ef1abd13c69eda8ae7b77f89ce602adbdcb1efbac4d` |
| `v6.0.2-unpatched` | `mpt_crypto.wasm` | `68ddb99a0e70f99d88bbf82ba135e8a8f75817a630d774f1f5798e8c37ff6c86` |
| `v6.0.2-empp` | `mpt_crypto.js` | `2d568a94344685d53712593678230f56696f1483f5e5859a32ce266c10fc8af2` |
| `v6.0.2-empp` | `mpt_crypto.mjs` | `8ae3ad22a8c706ffec63d5d90066d5a2379d3c8f449da8537b05d9e66ab67a1b` |
| `v6.0.2-empp` | `mpt_crypto.web.mjs` | `d3a8aad8ce2547e6b17c8ef1abd13c69eda8ae7b77f89ce602adbdcb1efbac4d` |
| `v6.0.2-empp` | `mpt_crypto.wasm` | `68ddb99a0e70f99d88bbf82ba135e8a8f75817a630d774f1f5798e8c37ff6c86` |
| `v6.0.2-dcxx` | `mpt_crypto.js` | `2d568a94344685d53712593678230f56696f1483f5e5859a32ce266c10fc8af2` |
| `v6.0.2-dcxx` | `mpt_crypto.mjs` | `8ae3ad22a8c706ffec63d5d90066d5a2379d3c8f449da8537b05d9e66ab67a1b` |
| `v6.0.2-dcxx` | `mpt_crypto.web.mjs` | `d3a8aad8ce2547e6b17c8ef1abd13c69eda8ae7b77f89ce602adbdcb1efbac4d` |
| `v6.0.2-dcxx` | `mpt_crypto.wasm` | `68ddb99a0e70f99d88bbf82ba135e8a8f75817a630d774f1f5798e8c37ff6c86` |
| `v6.0.3-unpatched` | `mpt_crypto.js` | `485bb723374618c2b7d4411adb9fc19b186f50100c8d90901b7d3a7e38e46101` |
| `v6.0.3-unpatched` | `mpt_crypto.mjs` | `94822899122dc9a2b6dbf307967b2892c6e29104b910ef947fc346c391554924` |
| `v6.0.3-unpatched` | `mpt_crypto.web.mjs` | `67fe61f6f3c2973acdef48eadf8e3db1ebbe05c1be25dee0173c8465d5bb15f2` |
| `v6.0.3-unpatched` | `mpt_crypto.wasm` | `130208bbae24955914e0d9ad3887cb7e04ea7de902a87845cda3b8279baa88d6` |
| `v6.0.4-unpatched` | `mpt_crypto.js` | `666f5627ea3c7ddb976ef63343811af37ce96ada488bd5ceb91ff498fb88792a` |
| `v6.0.4-unpatched` | `mpt_crypto.mjs` | `e265d4de72ed79e40dc5d7766c34c43e49e41d8f73396a50c7ede9ce9e72abfd` |
| `v6.0.4-unpatched` | `mpt_crypto.web.mjs` | `2fcd40e5748a6fe30fa0665c61d646f220f1f5b6b34033eabfb978d12ff1a8bb` |
| `v6.0.4-unpatched` | `mpt_crypto.wasm` | `83379df3eb8100f230b73d7af04fcb3c4540971aa8debeb092e3831711ef5d89` |
| `v6.0.5-unpatched` | `mpt_crypto.js` | `666f5627ea3c7ddb976ef63343811af37ce96ada488bd5ceb91ff498fb88792a` |
| `v6.0.5-unpatched` | `mpt_crypto.mjs` | `e265d4de72ed79e40dc5d7766c34c43e49e41d8f73396a50c7ede9ce9e72abfd` |
| `v6.0.5-unpatched` | `mpt_crypto.web.mjs` | `2fcd40e5748a6fe30fa0665c61d646f220f1f5b6b34033eabfb978d12ff1a8bb` |
| `v6.0.5-unpatched` | `mpt_crypto.wasm` | `9b9c5c1f06f3823bba0157e4199e83017b6f5aefa40153b70e5aef36f1f553b2` |
| `v6.0.6-empp` | `mpt_crypto.js` | `ef20b8fcc76d937b16f8cba80bf7068e4d47f38c71d0f5948a4b4c9d44c64bf5` |
| `v6.0.6-empp` | `mpt_crypto.mjs` | `58242ca1e0cb86a8b541e58bf0072921a66ba07bc189c6c7ca0a45c734376a6c` |
| `v6.0.6-empp` | `mpt_crypto.web.mjs` | `a682dff648bc0fe63868c78ba82d916bc468baaf8f6fb5cb37d9bfbec7767636` |
| `v6.0.6-empp` | `mpt_crypto.wasm` | `84f24e5df5c14c3ac05ca432853b66be3d660e012660a8c91727ec419cd0066f` |
| `v6.0.6-dcxx` | `mpt_crypto.js` | `ef20b8fcc76d937b16f8cba80bf7068e4d47f38c71d0f5948a4b4c9d44c64bf5` |
| `v6.0.6-dcxx` | `mpt_crypto.mjs` | `58242ca1e0cb86a8b541e58bf0072921a66ba07bc189c6c7ca0a45c734376a6c` |
| `v6.0.6-dcxx` | `mpt_crypto.web.mjs` | `a682dff648bc0fe63868c78ba82d916bc468baaf8f6fb5cb37d9bfbec7767636` |
| `v6.0.6-dcxx` | `mpt_crypto.wasm` | `84f24e5df5c14c3ac05ca432853b66be3d660e012660a8c91727ec419cd0066f` |
| `v6.0.6-partial` | `mpt_crypto.js` | `ef20b8fcc76d937b16f8cba80bf7068e4d47f38c71d0f5948a4b4c9d44c64bf5` |
| `v6.0.6-partial` | `mpt_crypto.mjs` | `58242ca1e0cb86a8b541e58bf0072921a66ba07bc189c6c7ca0a45c734376a6c` |
| `v6.0.6-partial` | `mpt_crypto.wasm` | `84f24e5df5c14c3ac05ca432853b66be3d660e012660a8c91727ec419cd0066f` |
| `v6.0.10-empp` | `mpt_crypto.js` | `e759672f42dcab283ac1d6da2c747a66a813fc9eaa4ccb5a950159b4525ea031` |
| `v6.0.10-empp` | `mpt_crypto.mjs` | `62a698afe1b7f9388805ea360a0ad702efe79d720c7c62348e91acede6ea83bd` |
| `v6.0.10-empp` | `mpt_crypto.web.mjs` | `b7628e83f6adbea3c5471ea6bdceb2954522827ec6f04d50decea42f49f37e53` |
| `v6.0.10-empp` | `mpt_crypto.wasm` | `c25ce8a2d178d056e428c1e2e19b9352dc78a1a851684aeaae4cfdc303d9f2ff` |
| `v6.0.10-dcxx` | `mpt_crypto.js` | `e759672f42dcab283ac1d6da2c747a66a813fc9eaa4ccb5a950159b4525ea031` |
| `v6.0.10-dcxx` | `mpt_crypto.mjs` | `62a698afe1b7f9388805ea360a0ad702efe79d720c7c62348e91acede6ea83bd` |
| `v6.0.10-dcxx` | `mpt_crypto.web.mjs` | `b7628e83f6adbea3c5471ea6bdceb2954522827ec6f04d50decea42f49f37e53` |
| `v6.0.10-dcxx` | `mpt_crypto.wasm` | `c25ce8a2d178d056e428c1e2e19b9352dc78a1a851684aeaae4cfdc303d9f2ff` |
| `v6.0.12-empp` | `mpt_crypto.js` | `8c1fc3ee8a6b0d5fe85bd2e1a0245772666e41b3178986682f4b48df3ba9563b` |
| `v6.0.12-empp` | `mpt_crypto.mjs` | `6db0706bd2a230eb0906550d44813ddf803bcd310ad40a87869e5c7ad960d35d` |
| `v6.0.12-empp` | `mpt_crypto.web.mjs` | `4668fa3eba87b1bbee8fd27b296aa78a959410e68d2cb5f1db572acdf6ba349a` |
| `v6.0.12-empp` | `mpt_crypto.wasm` | `6f2889e6c6c72a5363ce87b9528d9b4002ac7c4a6f3cab9a4d31f3d5d8724ad0` |
| `v6.0.12-dcxx` | `mpt_crypto.js` | `8c1fc3ee8a6b0d5fe85bd2e1a0245772666e41b3178986682f4b48df3ba9563b` |
| `v6.0.12-dcxx` | `mpt_crypto.mjs` | `6db0706bd2a230eb0906550d44813ddf803bcd310ad40a87869e5c7ad960d35d` |
| `v6.0.12-dcxx` | `mpt_crypto.web.mjs` | `4668fa3eba87b1bbee8fd27b296aa78a959410e68d2cb5f1db572acdf6ba349a` |
| `v6.0.12-dcxx` | `mpt_crypto.wasm` | `6f2889e6c6c72a5363ce87b9528d9b4002ac7c4a6f3cab9a4d31f3d5d8724ad0` |

## NOT RUN

- emsdk 6.0.7, 6.0.8, 6.0.9 and 6.0.11: not installed, not built. So the run does not establish which version between 6.0.10 and 6.0.12 added the two `__cxa_guard_*` symbols.
- The cause of the two extra symbols at 6.0.12: not investigated.
- The `em++` and `-sDEFAULT_TO_CXX` variants at 6.0.3, 6.0.4 and 6.0.5: not run.
- The partial variant at any version other than 6.0.6: not run.
- The test step after a failed build (6.0.6, 6.0.10 and 6.0.12 unpatched, 6.0.6 partial): not run, as in CI, where the test step follows the build step.
- GitHub Actions, or any Linux host: not run. No run used `ubuntu-latest`, bash 5 or `mymindstorm/setup-emsdk`.
- CI's "Package WASM bundle" and "Upload bundle" steps: not run.
- A build of `origin/main` (`c60a60c`): not run. Only `3baaaac` was built. `git diff --stat` between the two is empty for `build-wasm.sh`, `test-wasm.sh` and `build-wasm.yml`.
- A repeat of an identical configuration in a fresh worktree: not run. Determinism at 6.0.2 is inferred only from the three variants matching across three worktree paths.
- The xtrace re-runs are diagnostic only. They reused the dependencies and objects their primary run had built, so they are not fresh builds.
- Browser loading of `mpt_crypto.web.mjs`: not run. Only the Node smoke test in `test-wasm.sh` exercised it.
- The 2026-09-28 run's records: not consulted.

## Log index

| File | Content |
|---|---|
| `00-clone.log` | mpt-crypto clone |
| `01-source.log` | `origin/main`, the target commit, ancestry, diff stat of the three CI files |
| `02-environment.log` | OS, hardware, tool versions, PATH before emsdk |
| `02b-environment-vars.log` | post-run check of emscripten-related env vars and `~/.emscripten`, and each emsdk's embedded `.emscripten` |
| `03-emsdk-tags.log` | `git ls-remote --tags` of emsdk |
| `04-worktrees.log` | creation of the 16 worktrees |
| `05-cause-changelog.log` | ChangeLog excerpts from the 6.0.5, 6.0.6 and 6.0.12 installs, tag commits, `emcc --version` per install |
| `05b-cause-changelog-6.0.12-context.log` | the 6.0.7 to 6.0.12 ChangeLog context, and the `WASM_BIGINT` deprecation |
| `06-runner-scripts.log` | the five runner scripts, verbatim, with sha256 |
| `07-byte-identity.log` | sha256 and `cmp` of outputs |
| `08-gen-tables-and-symbol-sets.log` | the table generator, its output, and the undefined-symbol lists with their set hashes |
| `emsdk-install-<v>.log` | emsdk clone, install, activate and `emcc --version` per version |
| `group-<v>.log` | per-group summary of build, test and xtrace exit codes |
| `v<v>-<variant>.log` | primary build log: worktree, `git rev-parse HEAD`, `git status`, `git diff`, tool versions, full build output, `BUILD EXIT`, output sizes and sha256, final `exit` |
| `v<v>-<variant>-test.log` | CI's test step against the staged `output/` |
| `v<v>-<variant>-xtrace.log` | diagnostic `bash -x` re-run of a failed build, with script line numbers |
