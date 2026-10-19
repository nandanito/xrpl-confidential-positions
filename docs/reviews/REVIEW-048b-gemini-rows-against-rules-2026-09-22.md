## FINDINGS, most serious first

1. **[HIGH] [overreach] — E-299**
   - **Quoted sentence:** `"Three of the five mpt-crypto re-checks are readings, not runs. F-7 and F-12 still hold at upstream HEAD, and F-18 is overtaken."` (specifically `"F-7 and F-12 still hold at upstream HEAD"`).
   - **What the evidence cell actually establishes:** The evidence establishes only that `.github/scripts/build-wasm.sh` lines `:269-272` and `:363,365,374` contain `emcc` invocations without `-sDEFAULT_TO_CXX` and that CI pins `6.0.2`. The evidence explicitly admits: `"It was not re-run, because no emsdk is installed here."` and the grade is `"A, read at source; F-12 not re-run"`. A static reading of a shell script does not establish that a linking failure dynamically reproduces at `1.0.5` under Emscripten.
   - **Defensible version:** `"On reading source at upstream HEAD, F-7's window parameter is unchanged, F-12's build-wasm.sh link invocation remains unadjusted (not re-run), and F-18 is overtaken."`

2. **[HIGH] [unrecorded negative] — E-304**
   - **Quoted sentence:** `"That makes an erratum the likelier reading, but no upstream text says which was intended."`
   - **What the evidence cell actually establishes:** The evidence searches `XRPLF/mpt-crypto` issues for *transmitted*, *C1*, and *paper*, searches XLS-0096, and checks the Trail of Bits report. It records no search across `XRPLF/rippled` issues, PR discussions, commit messages, or `XRPL-Standards` repository discussions where the rationale for the transaction wire layout and separate 66-byte ciphertext serialization was debated.
   - **Defensible version:** `"That makes an erratum the likelier reading, though neither XLS-0096 nor the searched mpt-crypto issues state whether the discrepancy was deliberate."`

3. **[MEDIUM] [count] — E-299**
   - **Quoted sentence:** `"Three of the five mpt-crypto re-checks are readings, not runs."`
   - **What the evidence cell actually establishes:** E-299's evidence cell supplies evidence only for three findings: F-7, F-12, and F-18 (all three are readings). It neither enumerates what "the five" mpt-crypto re-checks are nor establishes why only three are readings. Across the register, five mpt-crypto findings were read (F-19, F-8, F-7, F-12, F-18) and two were executed (F-9, F-15). The count "three of the five" is an ungrounded assertion in E-299.
   - **Defensible version:** `"The three mpt-crypto re-checks evaluated in this row (F-7, F-12, F-18) are readings, not runs."`

4. **[MEDIUM] [residual] — E-299**
   - **Quoted sentence:** `Not checked: whether the natives tarball 0.1.0 downloads still matches its BUNDLE_SHA256`
   - **What the evidence cell actually establishes:** The row evaluates F-12 (a build/link failure) purely on source reading without executing the build toolchain. However, the `Not checked:` list omits the primary gap of the row: executing `build-wasm.sh` under `emsdk`.
   - **Defensible version:** `Not checked: executing build-wasm.sh under emsdk 6.0.2 / HEAD, and whether the natives tarball 0.1.0 downloads still matches its BUNDLE_SHA256`

5. **[LOW] [unrecorded negative] — E-296**
   - **Quoted sentence:** `"The one header sentence added since the fix review documents NULL as allowed, on secp256k1_compact_standard_prove only."`
   - **What the evidence cell actually establishes:** The evidence traces `include/secp256k1_mpt.h:319` and dates it to commit `12186cc`, but records no search across the remaining headers in `include/` (e.g. `git diff f196bdb..HEAD include/` or `git grep -i "null" include/`) to prove no other function documentation mentions `NULL` as allowed.
   - **Defensible version:** `"A header sentence added since the fix review (include/secp256k1_mpt.h:319) documents NULL as allowed on secp256k1_compact_standard_prove."`

6. **[LOW] [residual] — E-303**
   - **Quoted sentence:** `Not checked: the May 2026 revision (B-13)`
   - **What the evidence cell actually establishes:** The claim notes that Devnet runs unread version `3.4.0-rc5` while public tags stop at `3.4.0-rc1`. Unlike E-305 and E-307, E-303 omits the unread source of `3.4.0-rc5` from its `Not checked:` disclosure.
   - **Defensible version:** `Not checked: the source of 3.4.0-rc5 (which has no public tag), and the May 2026 revision (B-13)`

---

## NEGATIVES WITHOUT A RECORDED SEARCH

1. **E-304 (Claim cell):**
   - **Sentence:** `"That makes an erratum the likelier reading, but no upstream text says which was intended."`
   - **Missing search:** A corpus-wide search across `XRPLF/rippled` issues, PR descriptions/comments, and `XRPL-Standards` discussions (e.g. `gh search issues --repo XRPLF/rippled "ciphertext"`, `"ConfidentialMPTSend"`, `"C1"`, `"shared"`) to determine whether maintainers explicitly documented or discussed why separate 66-byte ciphertexts were chosen for ledger serialization.

2. **E-296 (Claim cell):**
   - **Sentence:** `"The one header sentence added since the fix review documents NULL as allowed, on secp256k1_compact_standard_prove only."`
   - **Missing search:** A search/diff across all header files between the reviewed commit and HEAD (e.g. `git diff f196bdb..3baaaac -- include/` or `git grep -i "null" include/`) proving that no other header doc comment permits `NULL`.

---

## NUMBERS, and whether they are re-derivable

### E-296
- **`April 2026` / `2026-04`**: Re-derivable (report filename `2026-04-ripple-labs-...`).
- **`17`** ("17 numbered findings"): Re-derivable (evidence quotes *"the 17 issues described in this report"*).
- **`neither`** (2 items: App B and App D): Re-derivable (searched Appendix F for *NULL* and *Appendix D* with 0 matches).
- **`three`** ("three files F-19 cites"): Re-derivable (diffed `src/proof_pok_sk.c`, `include/secp256k1_mpt.h`, `src/utility/mpt_utility.cpp`).
- **`three`** ("three compact-proof files"): Re-derivable (`proof_compact_standard.c`, `proof_compact_convertback.c`, `proof_compact_clawback.c`).
- **`one`** ("The one header sentence"): **Not re-derivable** as an exclusive count without a complete header diff.
- **`one`** ("consequence for this one proof"): Re-derivable (refers to `proof_pok_sk.c`).

### E-297
- **`1.0.5`**, **`0.4.0-rc4`**, **`1.0.4`**: Re-derivable (verified by git tags and commit hashes in evidence).
- **`Both` / `two`** ("Both comments F-8 quotes" / "those two comments"): Re-derivable (`include/secp256k1_mpt.h:73`, `src/elgamal.c:279`).
- **`one`** ("one short"): Re-derivable (grep found 3 matches vs 2 expected; 1 extra at `tests/test_mpt_utility.cpp:165`).
- **`40`**, **`54`**, **`512`** ("40 bits by default and 54 with a 512 MB table"): Re-derivable (cited from `include/bsgs_dlp.h:13-84`).

### E-298
- **`2026-09-14`**, **`#7`**, **`#611`**, **`2026-08-26`**: Re-derivable (session date, `gh issue view 7`, `XRPL-Standards#611`).
- **`three`** ("three rows"): Re-derivable (F-19, F-8, F-18 in `UPSTREAM-FEEDBACK.md`).
- **`12`** ("E-288's 12"): Re-derivable (total findings tracked from E-288).
- **`nine`** ("nine now have neither a filing nor a recorded decision"): Re-derivable ($12 - 3 = 9$; F-7, F-9, F-11, F-12, F-13, F-15, F-16, F-17, F-21).
- **`Four`** ("Four were ruled later"): Re-derivable (F-7, F-15, F-9, F-12).

### E-299
- **`Three` and `five`** ("Three of the five mpt-crypto re-checks"): **Not re-derivable** from E-299's evidence cell alone (evidence only mentions F-7, F-12, F-18).
- **`1000000`**: Re-derivable (`git grep -n 1000000 -- src include`).
- **`three` and `two`** ("three link lines rather than two"): Re-derivable (`.github/scripts/build-wasm.sh:363,365,374`).
- **`6.0.2`**: Re-derivable (`.github/workflows/build-wasm.yml:40-43`).
- **`0.1.0`**, **`2026-08-18`**, **`1.0.4`**: Re-derivable (crates.io API, cargo metadata).
- **`one`** ("one-commit release-1.3.0 branch"): Re-derivable (commit `2f2deb9`).
- **`four`** ("four tag-generations behind"): Re-derivable (quoted from old F-18 text).

### E-300
- **`3.6.2`**, **`3.6.3`**, **`36f92686`**: Re-derivable (Conan recipes and lockfile lines in evidence).
- **`three`** ("resolves all three recipes"): Re-derivable (evidence logs all three downloaded from `conan.ripplex.io`).
- **`2026-08-16`**, **`§5`**: Re-derivable (cited benchmark document).

### E-301
- **`0.1.0`**, **`0.1.1`**, **`2026-08-24`**, **`1.0.5`**: Re-derivable (package versions and `MPT_CRYPTO_VERSION`).
- **`seven`** ("seven-wide window"): Re-derivable (window $[V-3, V+3]$ contains 7 discrete integers: $-3, -2, -1, 0, 1, 2, 3$).
- **`1,000,000,000,007`**: Re-derivable (test value in script output).
- **`0`** ("fixes the floor at 0"): Re-derivable (`packages/mpt-crypto/src/primitives.ts:21` sets `DECRYPT_RANGE_LOW = 0n`).

### E-302
- **`four`** ("four more of E-288's 12"): Re-derivable (F-7, F-15, F-9, F-12).
- **`Five`** ("Five of the 12 now have neither..."): Re-derivable ($12 - 3 - 4 = 5$; F-11, F-13, F-16, F-17, F-21).
- **`five`** ("All five were re-checked..."): Re-derivable (E-303, E-304, E-305, E-306, E-307).

### E-303
- **`3.3.0`**, **`3.4.0-rc1`**, **`3.4.0-rc5`**: Re-derivable (git tags, `develop` commits, Devnet RPC).
- **`six`** ("six internal-error returns"): Re-derivable (commit `6f5de9067` diff adds six `UNREACHABLE` blocks).
- **`one`** ("its one finding on that file is TOB-RIPCTX-11"): Re-derivable (verified in report scope p. 9 and p. 36).

### E-304
- **`1177` / `1177 B`**: Re-derivable (`cmpt-compact-sigma.tex` lines `:1017`, `:1049`, `:1633`).
- **`three`** ("three tables"): Re-derivable (cited lines `:1017`, `:1049`, `:1633`).
- **`66`** ("66-byte ciphertext"): Re-derivable (`mpt_protocol.h:28-30`).
- **`33`** ("first 33 bytes"): Re-derivable (`mpt_protocol.h:28-30`, `:35`).
- **`1276` / `1276 B`** and **`1210` / `1210 B`**: Re-derivable ($1177 + 3 \times 33 = 1276\text{ B}$; $1177 + 33 = 1210\text{ B}$).
- **`66`** ("A 66-byte ElGamal ciphertext"): Re-derivable (XLS-0096 `:242-246`).
- **`one`** ("a week after"): Re-derivable (PR merged 2026-04-09 vs fix review ended 2026-04-02: 7 days = 1 week).

### E-305
- **`#8162`**, **`3.4.0-rc1`**, **`3.4.0-rc5`**, **`2.11.0`**, **`5.2.0`**: Re-derivable (PR, git tags, RPC, npm versions).
- **`two`** ("differed... in two ways"): Re-derivable (1. Asset was XRP; 2. Vault was closed-ended).
- **`12 s`**, **`5305214`**: Re-derivable (transaction timeout and validated ledger index).

### E-306
- **`6.1`** (Remark 6.1): Re-derivable (`cmpt-compact-sigma.tex:844-857`).
- **`two`** ("two findings upstream cites"): Re-derivable (baseline count in B-13).
- **`seven`** ("seven more"): Re-derivable (9 total findings cited in 20 issues: TOB-RIPCTXR-1, 3, 5, 6, 9, 10, 11, 12, 14; $9 - 2 = 7$).
- **`three`** ("three of its appendices"): Re-derivable (Appendices C, G, H).
- **`nine`** ("all nine of its *nonce* matches"): Re-derivable (PDF text search in evidence).
- **`20`** / **`21`**: Re-derivable (20 issues in `XRPLF/mpt-crypto` + `rippled#7535` = 21).

### E-307
- **`1024`** ("1024 or less"): Re-derivable (`Transactor.cpp:73-94`).
- **`two`** ("two weeks before"): Re-derivable (2026-08-04 commit vs 2026-08-18 observation = 14 days).
- **`946`** ("946-byte proof"): Re-derivable (Send proof length in test script).

---

## THE FOUR FILINGS — is each row enough, and the strongest maintainer objection

### 1. F-9 (E-300) — Broken OpenSSL resolution via README instructions
- **Is the evidence enough?** **Yes.** It provides an executed Conan 2.32.0 reproduction in a clean environment showing exit code 1 with `conan.xrplf.org` and exit code 0 with `conan.ripplex.io`, corroborated by Artifactory REST revision queries.
- **Strongest maintainer objection:** *"The lockfile is designed to be regenerated and resolved using `conan/lockfile/regenerate.sh` (which explicitly points to `conan.ripplex.io`), not `rippled`'s `init.sh`."*
- **Does the row answer it?** **Yes.** The row explicitly notes that `conan.ripplex.io` works anonymously and resolves all recipes, and reframes the defect precisely around the broken setup link in the README.

### 2. F-12 (E-299) — Missing `-sDEFAULT_TO_CXX` in WASM build script
- **Is the evidence enough?** **No.** The row relies entirely on a text reading of `build-wasm.sh`. The build was explicitly not executed at `1.0.5` (`"F-12 not re-run"`, no `emsdk` installed).
- **Strongest maintainer objection:** *"Our GitHub Actions CI (`build-wasm.yml`) is green on Emscripten 6.0.2. Plain `emcc` links our C++ object without issues in the supported toolchain. Please provide a compiler/linker error log reproducing this on 1.0.5."*
- **Does the row answer it?** **No.** The row cannot answer whether the build actually fails at `1.0.5` because it was not built or run.

### 3. F-13 (E-304) — Discrepancy in ciphertext wire layout between Paper ($C_1$ sent once) and Ledger/Spec (separate 66-byte ciphertexts)
- **Is the evidence enough?** **Yes.** Line-by-line evidence from the LaTeX paper, `rippled` transactors, `mpt_protocol.h`, and XLS-0096 establishes that the paper claims $C_1$ is transmitted once (1177 B total), whereas `rippled` and XLS-0096 mandate full 66-byte ciphertexts per party (1210/1276 B), with `mpt-crypto` enforcing equality of the redundant 33-byte prefixes.
- **Strongest maintainer objection:** *"The paper describes the optimal theoretical protocol; XLS-0096 and `rippled` intentionally chose decoupled 66-byte ciphertext fields for clean STObject deserialization. The ledger design trades off 33–99 bytes of wire overhead for parser simplicity."*
- **Does the row answer it?** **Partially.** The row establishes the exact byte costs and proves that `mpt-crypto` checks equality of the extra bytes. However, because it lacks searches in `rippled` discussions, it cannot conclusively rule out an intentional protocol design choice over a paper erratum.

### 4. F-17 (E-306) — Flawed rationale for nonce uniqueness in Compact Sigma paper Remark 6.1
- **Is the evidence enough?** **Yes.** It verifies that Remark 6.1 in `cmpt-compact-sigma.tex` states that including the full witness ensures unique nonces per transaction, whereas statement relation $x$ omits `TransactionContextID` (meaning identical witnesses across transactions would yield identical nonces under the paper's formula). It also confirms that the C implementation (`proof_compact_standard.c:240`) correctly hashes `context_id`, preventing nonce reuse.
- **Strongest maintainer objection:** *"This is an informal remark in an accompanying LaTeX document that does not affect the security or correctness of the C library implementation, which already includes `context_id`."*
- **Does the row answer it?** **Yes.** The row's headline and claim explicitly state that the C implementation is not affected and that the finding is strictly an erratum in the paper's explanatory text.

---

## MOST LIKELY TO BE FOUND FALSE

**Quoted sentence:** `"F-7 and F-12 still hold at upstream HEAD, and F-18 is overtaken."` (specifically: **`"F-12 still holds at upstream HEAD"`** in E-299).

**Reason:** F-12 claims that `build-wasm.sh` suffers from a linking failure because it invokes `emcc` without `-sDEFAULT_TO_CXX`. However, E-299 did not run or build the code at tag `1.0.5` (`"It was not re-run, because no emsdk is installed here."`). If upstream's CI workflow (`build-wasm.yml` pinning Emscripten `6.0.2`) is currently passing on GitHub Actions, the assertion that the build failure "still holds" at HEAD is factually false.

---

## CHECKED AND CORRECT

1. **Standing Prohibitions (P-1 to P-11):**
   - **P-1, P-2, P-4, P-9, P-11:** No claims of quantum resistance, identity hiding, issuer privacy, or transaction timing/graph concealment.
   - **P-3:** Amendment status on Devnet (`fixCleanup3_4_0`, `LendingProtocol`, `LendingProtocolV1_1`) was verified using dated live RPC `feature` calls.
   - **P-5, P-6:** No assertions of production readiness, regulatory compliance, or audit soundness.
   - **P-8:** Benchmark timings in E-301 explicitly disclaimed as single-run indicative measurements rather than formal benchmarks.
   - **P-10:** No claims regarding key rotation or recovery.

2. **Negative Claim Falsifiers (P-12):**
   - E-296 correctly recorded searches for *NULL*, *context*, and *Appendix D* in Appendix F.
   - E-297 correctly executed and recorded `git grep -n -i bsgs` across tags `0.4.0-rc4`, `1.0.4`, and `1.0.5`.
   - E-299 correctly recorded `git grep -n 1000000 -- src include`.
   - E-303 correctly recorded `git grep` for `PSEUDO_ACCOUNT` and `isPseudoAccount`, and text search in the Trail of Bits PDF for *pseudo*.
   - E-304 correctly recorded searches in `sfields.macro` and case-insensitive searches in XLS-0096 for `C1` / `C_1`.
   - E-305 correctly recorded searches in the Trail of Bits PDF for *LoanSet* and *lending*.
   - E-306 correctly recorded comprehensive GitHub issue searches across `XRPLF/mpt-crypto` and `rippled` for RIPCTXR findings, *witness*, *nonce*, *paper*, *remark*, and *6.1*.
   - E-307 correctly recorded searches in `definitions.json` and the Trail of Bits report for *NetworkID*.

3. **Execution Validity:**
   - E-300 (Conan lockfile resolution), E-301 (WASM decryption via `loadWasmModule`), E-305 (Devnet signature prefix enforcement under `fixCleanup3_4_0`), and E-307 (Devnet `NetworkID` rejection in `preflight0`) provide rigorous, reproducible command lines, scripts, transaction hashes, account addresses, and ledger sequence numbers.

4. **Grades:**
   - All twelve grades (`A, read at source`, `A, executed`, `A, recorded`, with execution qualifiers) accurately reflect the operational method executed in each row.
