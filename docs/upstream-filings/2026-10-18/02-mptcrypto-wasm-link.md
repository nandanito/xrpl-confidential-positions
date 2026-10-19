TITLE: [Build] build-wasm.sh links C++ with emcc, which fails with emsdk 6.0.6, 6.0.10 and 6.0.12
REPO: XRPLF/mpt-crypto

---

`build-wasm.sh` compiles `src/utility/mpt_utility.cpp` as C++, then links the module with plain `emcc`. From emsdk 6.0.6, `emcc` no longer links the C++ runtime by default, so the link fails with the C++ runtime missing. CI did not catch it because it pins emsdk 6.0.2, and the WASM job [passed at `3baaaac`](https://github.com/XRPLF/mpt-crypto/actions/runs/32380884181). The script's own prerequisites line names no version. On macOS arm64, every emsdk I tried from 6.0.6 on fails. The changelog entry names no platform.

**Suggested fix:** link with `em++` on the three link lines. Emscripten's changelog says `em++` is now required when linking C++.

**Cause**

Emscripten's [ChangeLog for 6.0.6](https://github.com/emscripten-core/emscripten/blob/6.0.6/ChangeLog.md#L23-L25):

> `DEFAULT_TO_CXX` is now disabled by default. This means that `em++` is now required when linking C++ programs, matching the behavior of clang and gcc. The old behavior is still available using `-sDEFAULT_TO_CXX`. (#11121)

At `3baaaac`, the C++ object is compiled with `em++` ([line 272](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/.github/scripts/build-wasm.sh#L272)) and linked with `emcc` ([lines 363, 365 and 374](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/.github/scripts/build-wasm.sh#L363-L374)). CI pins [emsdk 6.0.2](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/.github/workflows/build-wasm.yml#L38-L43), and the script asks only for [*"Emscripten SDK (emcc, em++, emcmake, emmake) on PATH"*](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/.github/scripts/build-wasm.sh#L19).

**What I ran**

`./.github/scripts/build-wasm.sh` at `3baaaac`, then `test-wasm.sh` where the table says so. Each build used a fresh source tree and its own emsdk. macOS arm64, 2026-10-18. I did not run Linux.

```text
emsdk                as shipped          em++ on the 3 link lines     -sDEFAULT_TO_CXX on the 3 link lines
6.0.2                builds, tests pass  builds, tests pass,          builds, tests pass,
                                         output byte-identical        output byte-identical
6.0.3, 6.0.4, 6.0.5  builds, tests pass  not run                      not run
6.0.6                fails at line 363   builds, tests pass           builds, tests pass
6.0.10               fails at line 363   builds, tests pass           builds, tests pass
6.0.12 (newest)      fails at line 363   builds, tests pass           builds, tests pass
```

The failure at 6.0.6 and 6.0.10 is below. At 6.0.12 the list also has `__cxa_guard_acquire` and `__cxa_guard_release`.

```text
wasm-ld: error: …/mpt_crypto.wasm.lto.o: undefined symbol: operator new(unsigned long)
  (and 7 more: operator delete, __cxa_allocate_exception, __cxa_throw,
   typeinfo / vtable / ~length_error for std::length_error, std::logic_error::logic_error)
emcc: warning: link failed with undefined C++ symbols. Try linking with 'em++' or passing '-sDEFAULT_TO_CXX'
```

All three lines need the change. With only lines 363 and 365 changed, 6.0.6 still fails at line 374.

<details>
<summary>Searches for an existing report</summary>

```text
# 2026-10-18. Open and closed, issues and PRs.
gh search issues "DEFAULT_TO_CXX"   --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "undefined symbol" --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "__cxa_throw"      --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "6.0.6"            --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "emsdk"            --repo XRPLF/mpt-crypto --include-prs   # 2: #135 adds the pin, #145 an export
gh search issues "DEFAULT_TO_CXX"   --owner XRPLF --include-prs             # 0

# Audits
Trail of Bits, April 2026 report: no mention of WebAssembly, emsdk or Emscripten.
  https://github.com/trailofbits/publications/blob/master/reviews/2026-04-ripple-labs-xrp-ledger-confidential-transfer-securityreview.pdf
  I could not obtain the June 2026 revision.
Sherlock XRP Ledger Attackathon: full findings report not found. Its public trail:
  gh search issues Attackathon --owner XRPLF --include-prs --limit 500
  gh search issues Sherlock    --owner XRPLF --include-prs --limit 500
  gh pr list -R XRPLF/rippled --state all --base ripple/attackathon-april-2026
  Bodies, comments and PR review comments read. None concerns the WebAssembly build.
  Grepping them for emsdk, Emscripten, WASM, DEFAULT_TO_CXX, em++, libc++ and __cxa
  matched one item: this project's own filing, mpt-crypto#148.
Zellic scan of mpt-crypto@3baaaac: report not found.
  gh search issues Zellic --owner XRPLF --include-prs   # 1: mpt-crypto#147
  #147 cites DEFI-1108, -1109 and -1110. None concerns the WebAssembly build.
```

</details>

---

*Disclosure: prepared with AI assistance. The builds above were run on 2026-10-18 at mpt-crypto `3baaaac`, and every link was checked the same day. `build-wasm.sh` and `build-wasm.yml` are unchanged at today's `main` (`c60a60c`).*
