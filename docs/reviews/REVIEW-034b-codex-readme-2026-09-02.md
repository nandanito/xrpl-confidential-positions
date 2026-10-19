# REVIEW-034b — Codex leg, round three: the README

- **Date:** 2026-09-02
- **Access:** full repository, read-only, at frozen commit `b197315`.
- ⚠ **Known contamination:** this leg can read `CLAIMS.md` E-222 and therefore knows what rounds one and two found. Accepted deliberately — its job is source-agreement, not discovery.

---

# Round-three report

Reviewed the clean tree at `b197315b3acb4459b4f077cb960e53b1ed988309` on `review/readme-rewrite`. No files were modified.

## Findings

### 1. P1 — The holder-only custody claim contradicts the executed facility

> “**Who can spend a holder's balance. Only that holder. Keys are generated and held on the holder's own machine**, and the proof for a `ConfidentialMPTSend` cannot be produced without the sender's secret key (E-33)…”

[README.md:141]($REPO/README.md:141)

Contradicted by [facility/src/facility.ts:38]($REPO/facility/src/facility.ts:38), which says one process plays every party and “therefore holds every seed.” The state actually stores all parties and the issuer secret in [facility/run-facility.ts:95]($REPO/facility/run-facility.ts:95), and each signer profile derives its ElGamal key from the centrally supplied master seed in [facility/src/signer.ts:120]($REPO/facility/src/signer.ts:120).

Correct sentence:

> At protocol level, spending requires the holder’s ElGamal secret. The intended architecture places that secret on the holder’s machine, but the executed facility does not demonstrate holder-only custody: one process holds every party’s seed and can derive every holder key.

### 2. P2 — The irreversible reserve warning is false and cites a superseded row

> “It permanently blocks deletion of the holder's `MPToken` and locks its reserve, **even after the balance returns to zero** (E-18).”

[README.md:160]($REPO/README.md:160)

E-18 records only the specification wording. The later source verification in [CLAIMS.md:381]($REPO/CLAIMS.md:381) says the opposite for the holder-unauthorize path: when issuance-wide confidential outstanding is zero, deletion succeeds, and upstream tests deliberately pin that behavior. [UPSTREAM-FEEDBACK.md:142]($REPO/UPSTREAM-FEEDBACK.md:142) repeats that the reserve is not permanently locked.

Correct sentence:

> XLS-0096 §7.4 describes the deletion blocker as permanent, but rippled deliberately permits holder unauthorization/deletion once issuance-wide confidential outstanding is zero; the reserve is therefore not permanently locked (F-29).

### 3. P3 — The failure-to-ledger statement incorrectly covers every failure class

> “That is the submission parameter which tells a node to discard a failing transaction instead of applying it — and **a confidential transaction that fails still lands on the ledger carrying its ciphertexts**…”

[README.md:107]($REPO/README.md:107)

The repository evidence is specifically about `tecBAD_PROOF`: [CLAIMS.md:361]($REPO/CLAIMS.md:361). Other failure classes do not necessarily land; for example, B-17 explicitly says `terFROZEN` is not applied in [CLAIMS.md:312]($REPO/CLAIMS.md:312).

Correct sentence:

> A confidential transaction that fails with an applied `tec` result—such as the substituted-key `tecBAD_PROOF` case—can land carrying its ciphertexts unless the submitter sets `fail_hard`; `tem`, `ter`, and `tel` failures must not be generalized that way.

### 4. P2 — `check-web-readonly` is described more broadly than it operates

> “`tools/check-web-readonly.ts` asserts that **no file under `web/` constructs `Pair` or `Prepare`** … and that **exactly one named file** touches the socket at all.”

[README.md:115]($REPO/README.md:115)

The Pair/Prepare scan covers only `apiSrc`, not all `web/`, at [tools/check-web-readonly.ts:463]($REPO/tools/check-web-readonly.ts:463). The socket check requires one dynamically discovered file somewhere under `web/api/`; it does not pin a named filename: [tools/check-web-readonly.ts:567]($REPO/tools/check-web-readonly.ts:567). The gate itself admits that it cannot prove behavioral request exclusivity at [tools/check-web-readonly.ts:607]($REPO/tools/check-web-readonly.ts:607).

Correct sentence:

> The gate checks that `web/api` constructs `Status` and not `Pair` or `Prepare`; it scans the whole web tier for named signing, secret, decryption, and subprocess patterns; and it requires exactly one socket-client file somewhere under `web/api/`. It does not pin that filename or prove the client’s runtime behavior.

The actual source currently conforms: [web/api/signer-status.ts:103]($REPO/web/api/signer-status.ts:103) constructs only `Status`.

### 5. P2 — The prerequisites misidentify the component that compiles C and omit required tooling/endpoints

> “**You need:** a Rust toolchain (edition 2021), Bun, `make`, and a C toolchain — `signer/build.rs` **compiles** a vendored, patched fork of `mpt-crypto` and links it. Network access to `wss://s.devnet.rippletest.net:51233`.”

[README.md:181]($REPO/README.md:181)

`build.rs` only locates, validates, and links an already-built library: [signer/build.rs:69]($REPO/signer/build.rs:69) and [signer/build.rs:88]($REPO/signer/build.rs:88). Compilation occurs in [tools/spike-2026-08-18/build.sh:38]($REPO/tools/spike-2026-08-18/build.sh:38). The rebuild also requires Git, CMake, clang/clang++, Homebrew and `openssl@3`: [tools/rebuild-env.sh:86]($REPO/tools/rebuild-env.sh:86), [tools/rebuild-env.sh:106]($REPO/tools/rebuild-env.sh:106), and [tools/spike-2026-08-18/build.sh:9]($REPO/tools/spike-2026-08-18/build.sh:9).

The signer’s default ledger endpoint is HTTPS port 51234, not the quoted WebSocket: [signer/src/ledger.rs:73]($REPO/signer/src/ledger.rs:73).

Correct sentence:

> You need Rust, Bun, make, Git, CMake, clang/clang++, Homebrew `openssl@3`, and network access for the pinned GitHub clones. `tools/rebuild-env.sh` compiles the patched library; `signer/build.rs` validates and links it. Signer/facility ledger reads use `https://s.devnet.rippletest.net:51234/`; amendment checks use WebSocket port 51233.

### 6. P2 ⚠ — Round two’s vendor-verification fix still overclaims its instrument

> “The patch is committed and `make vendor-verify` **checks the restoration byte for byte, which bounds what a tampered tree could hide**…”

[README.md:188]($REPO/README.md:188)

The gate permits arbitrary content differences in its allowed tracked files; it checks only their names: [vendor-verify.sh:51]($REPO/tools/spike-2026-08-18/vendor-verify.sh:51). It uses `git diff --name-only`, so untracked files are invisible, while the build compiles every `src/*.c`, including an untracked one: [build.sh:48]($REPO/tools/spike-2026-08-18/build.sh:48). Its tag-to-tag byte comparison can also print `SKIP` and still succeed when tags are unavailable: [vendor-verify.sh:107]($REPO/tools/spike-2026-08-18/vendor-verify.sh:107).

Correct sentence:

> The rebuild script checks out the pin and applies the committed patch. `vendor-verify` checks the pin, confines tracked differences to an allowlist, checks selected nonce/witness-offset patterns, and—when both tags are available—compares upstream `src/` and `include/` between the two tags. It does not byte-compare allowed changes to the committed patch or detect untracked build inputs.

This is the clear defect introduced by the attempted round-two repair recorded in E-222.

### 7. P2 — The blanket description of all eight gates is false

> “**Each is lexical and over a named set** … so **every one now carries controls that run through the same detector the real check calls**…”

[README.md:212]($REPO/README.md:212)

`check-test-support` compiles probe crates rather than performing a lexical scan: [tools/check-test-support-gate.ts:142]($REPO/tools/check-test-support-gate.ts:142). `check-personas` dynamically enumerates files and performs byte comparisons, with no injected detector controls: [tools/check-personas.ts:49]($REPO/tools/check-personas.ts:49). `check-blinding-sources` likewise has no detector self-test/control section: [tools/check-blinding-sources.ts:192]($REPO/tools/check-blinding-sources.ts:192).

Correct sentence:

> Several source gates are lexical and operate over named patterns; `check-test-support` compiles probes and `check-personas` compares canonical and generated files byte-for-byte. Several, but not all, gates carry synthetic detector controls; consult each gate’s own scope statement.

The number eight itself is sound.

### 8. P2 — The amendment requirement is for an unbuilt milestone, not the current application

> “**Three amendments must be enabled on the same network, not one:** `ConfidentialTransfer`, `PermissionedDomains` and `SingleAssetVault`…”

[README.md:258]($REPO/README.md:258)

The current facility explicitly does not create a permissioned domain or set `sfDomainID`: [facility/src/facility.ts:42]($REPO/facility/src/facility.ts:42) and [facility/run-facility.ts:370]($REPO/facility/run-facility.ts:370). E-19 establishes only the conditional dependency when `sfDomainID` is written.

Correct sentence:

> The current build requires `ConfidentialTransfer`; it does not exercise XLS-70/XLS-80 or write `sfDomainID`. A future credentialled Permissioned Domain milestone would additionally require the relevant Credentials, PermissionedDomains and SingleAssetVault features.

### 9. P3 — The glossary describes the Send proof as universal

> “**The two proofs a confidential transaction carries.** The Bulletproof shows an amount is in range; the **192-byte compact sigma** ties the ciphertexts to the sender's key.”

[README.md:29]($REPO/README.md:29)

That composition describes `Send` only. `ConvertBack` uses a 128-byte sigma plus a 688-byte Bulletproof: [signer/src/mpt.rs:124]($REPO/signer/src/mpt.rs:124). `Convert` carries a 64-byte Schnorr key-possession proof: [signer/src/prover.rs:333]($REPO/signer/src/prover.rs:333). `MergeInbox` carries no proof: [facility/README.md:155]($REPO/facility/README.md:155).

Correct sentence:

> A `Send` carries a 192-byte compact sigma proof plus a 754-byte aggregated Bulletproof. `Convert` carries a 64-byte Schnorr proof; `ConvertBack` carries a 128-byte compact sigma proof plus a 688-byte Bulletproof; `MergeInbox` carries no proof.

### 10. P3 — The stale-status citation points to the wrong rows

> “The same applies to this document's prose: its status block asserted that no implementation existed for ten days after the signer was running (**E-159, E-204**).”

[README.md:68]($REPO/README.md:68)

E-159 concerns a pre-choice key-source disclosure, not this status claim: [CLAIMS.md:218]($REPO/CLAIMS.md:218). E-204 concerns the absent architecture step 8: [CLAIMS.md:264]($REPO/CLAIMS.md:264). E-222 is the row that records the historical getting-started document’s stale “application logic cannot start” statement.

Correct sentence:

> The historical getting-started status block continued to say application logic could not start after the application existed (E-222); E-204 is an analogous stale-scope incident, not the evidence for this exact statement.

### 11. P3 — The benchmark examples do not bracket 2.49 µs

> “The measured cost is about **2.49 µs per unit of range** …; **the two timings above bracket it at 2.54 and 2.50 µs respectively**…”

[README.md:171]($REPO/README.md:171)

The precise value-42 timing is 2589.6 ms over 1,000,001 iterations, approximately 2.590 µs—not 2.50: [benchmarks-2026-08-16.md:115]($REPO/docs/task-zero/benchmarks-2026-08-16.md:115). The 5.09 ms/2001 example is approximately 2.544 µs: [benchmarks-2026-08-16.md:121]($REPO/docs/task-zero/benchmarks-2026-08-16.md:121). Both are above 2.49; neither brackets it. The 2.49 result comes from a separate width sweep at [benchmarks-2026-08-16.md:123]($REPO/docs/task-zero/benchmarks-2026-08-16.md:123).

The missing-sublinear-fallback claim also belongs to F-8, not F-7 alone.

Correct sentence:

> A separate sweep across widths 1,000–50,000 measured about 2.49 µs per iteration. The nearby examples imply approximately 2.54 and 2.59 µs and neither derive nor bracket that result. No sublinear fallback is shipped (F-7, F-8).

### 12. P3 — Companion hard-rule replacement overclaims nonexistence

> “`CLAIMS.md` E-26: ‘**There is no dedicated Confidential Devnet**’…”

[CLAUDE.md:7]($REPO/CLAUDE.md:7)

Striking the old rule was correct: standard Devnet is the target. But the primary investigation explicitly says no dedicated network was searched for because it was unnecessary: [amendments-2026-08-16.md:57]($REPO/docs/task-zero/amendments-2026-08-16.md:57). The README’s narrower formulation at line 272 is accurate.

Correct sentence:

> No dedicated Confidential Devnet is needed or used by this project; standard Devnet is the target. Whether a separate network still exists was not searched.

`GETTING-STARTED-CLAUDE-CODE.md`’s new historical-record header is otherwise accurate.

### 13. P3 — E-222’s own citation count is stale

> “Every register id re-verified to exist (**41 checked**, 0 missing)…”

[CLAIMS.md:296]($REPO/CLAIMS.md:296)

The committed README cites 46 distinct tokens that correspond to live `CLAIMS.md` rows. All 46 exist; zero are missing. The incidental date-shaped token `E-2026` was excluded.

Correct sentence:

> Every register id re-verified to exist (46 checked, 0 missing).

## Claims checked and found sound

- **Devnet evidence:** All four table hashes match repository evidence. The Send hash and signer attribution are in [CLAIMS.md:133]($REPO/CLAIMS.md:133); the Convert hash is validated in [b26-scalar-diff-wipe-devnet-2026-08-28.json:16]($REPO/docs/runs/b26-scalar-diff-wipe-devnet-2026-08-28.json:16), and its driver fixes `AMOUNT = 30`; both ConvertBack hashes and amounts 95/191 are in [CLAIMS.md:184]($REPO/CLAIMS.md:184). E-222 supports the 2026-09-01 re-query and `MPTAmount` observations. `docs/runs/` itself is silent on three hashes and on the Convert’s transaction body. Live re-query was attempted but outbound DNS was blocked.
- **Architecture wiring:** `Request` has Pair/Prepare/Status as described; the facility sends Pair and Prepare at [facility/src/signer.ts:223]($REPO/facility/src/signer.ts:223), while `web/api` constructs only Status at [web/api/signer-status.ts:109]($REPO/web/api/signer-status.ts:109).
- **Loopback binding:** `web/api` explicitly binds `127.0.0.1` at [web/api/server.ts:177]($REPO/web/api/server.ts:177).
- **XLS-70/XLS-80:** The README is correct that neither is exercised; no `sfDomainID` is built and the facility prints that fact.
- **Issuer view:** `web/api` holds no issuer key and reads a curated snapshot at [web/api/issuer.ts:107]($REPO/web/api/issuer.ts:107). The route is unauthenticated at [web/api/server.ts:134]($REPO/web/api/server.ts:134), and E-222 records the observed plaintext `75`.
- **Counts:** E-222 supports 279 signer tests, 207 TypeScript tests across nine files, and a clean type-check. Four ignored live tests exist in [signer/tests/ledger_devnet.rs:66]($REPO/signer/tests/ledger_devnet.rs:66).
- **Gate count:** The README invokes exactly eight repository gates; `check-filing` is the ninth per-document gate. `vendor-verify` and the amendment reader are correctly excluded from that count.
- **Amendment snapshot:** The timestamp and Devnet/Testnet/Mainnet states match `docs/task-zero/amendments-2026-09-01.json`.
- **Citation coverage:** All 46 actual row IDs exist. Apart from E-18’s supersession, the E-159/E-204 drift, and F-8’s omission noted above, the cited rows support the surrounding claims.
