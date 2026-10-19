# REVIEW-004b — Gemini leg, verbatim

- **Date:** 2026-08-17
- **Reviewer:** Google Antigravity CLI (`agy` 1.1.13), headless `--print`, `--mode plan`, `--output-format json`, `--print-timeout 10m`. **`--dangerously-skip-permissions` was not passed** — that omission is the safety boundary, so every file-read the model might attempt was auto-denied.
- **Model / effort:** `agy` defaults. **Neither `--model` nor `--effort` was passed, and the JSON envelope carries no `model` field, so the exact model behind this review is not recoverable.** Recorded as a limitation, not a value.
- **Target:** `git diff --text 8d6758a...HEAD` — 20 files, 1588 insertions, 10 deletions. Same base as the Codex leg.
- **Access:** **none beyond the diff.** The prompt carried the diff inline (166 191 B, under the 256 KB guard) and the model read nothing from disk. **This is the material difference from the Codex leg**, which had the full repository and the scratchpad. Anything outside the diff — the unchanged bulk of `CLAIMS.md`, `TASK-ZERO-2026-08-13.md` §9, the upstream mpt-crypto tree — was invisible, and the focus block said so and told it to mark such findings unverified.
- **Prompt:** the skill's adversarial prompt, **adapted**. REVIEW-003a recorded that the stock prompts are code-shaped and the target was prose; this diff is ~40% prose and ~60% single-use harness code, so the code-attack axes were narrowed to "only where they could have corrupted a measurement" and the bulk was redirected onto claims-versus-evidence. The adaptation is recorded because it is not the skill's default text.
- **Focus given:** seven numbered questions derived from the REVIEW-004 packet, plus inlined context the model could not read (what the project is, the CLAIMS grading scale, the standing prohibitions). **The Codex leg's findings were deliberately withheld** so this leg is independent rather than anchored — the method REVIEW-001 set.
- **Verdict returned:** `fix-before-merge`.
- **Run:** 61.9 s, 1 turn, 75 877 input / 20 386 thinking / 24 914 output tokens.

**Verbatim below. Not adjudicated. Not re-graded. Nothing here has been applied.**

---

# Adversarial Review: Session 3 Proof Generation & Measurement Spike

**Target:** Unified diff against `8d6758a` (`CLAIMS.md`, `UPSTREAM-FEEDBACK.md`, `docs/reviews/REVIEW-004*`, `docs/task-zero/`, `tools/spike-2026-08-17/`).  
**Review Mode:** Hostile, adversarial, zero-trust epistemic audit based strictly on the provided diff.

---

## Priority Focus Assessment

### Q1 — E-22 "Survived Four Falsification Checks"
**Verdict: Defective and unsupported.** The phrase *"survived four falsification checks"* is an epistemic overclaim that masks a confounded, single-pass experiment:
1. **Confounded baseline in Check 4:** The non-zero control transaction was proven against a starting balance of **250** and version **1**; both zero sends were proven against balance **150** and versions **2 and 3** (`send.ts:64-122`). Comparing transactions that differ in three variables simultaneously (amount, sender balance, version) cannot isolate amount-invariance.
2. **$n=1$ on the non-zero control:** Exactly one non-zero send (`nz = await doSend("NON-ZERO SEND", 100)`) was executed. A single sample cannot demonstrate baseline stability across varying ledger pre-states.
3. **Check 4 fee dimension was argued, not measured:** All three transactions were submitted with a hardcoded `Fee: "5000"` (`send.ts:67,99`). The minimum fee scaling for zero vs. non-zero transfers was never tested dynamically against node fee mechanics; it was deduced via economic assumption (`vault.ts:82-87`).
4. **Double-counting Check 1:** Check 1 ("validity") is claim E-22(a) itself. Counting transaction acceptance as one of four "indistinguishability checks" is circular bookkeeping.

### Q2 — $C_1$-Sharing: Protocol Invariant vs. Harness Artifact (E-4, F-13)
**Verdict: Harness artifact presented as a protocol property.**
In `send.ts:69-71`, the harness generates a single random scalar `r32` and passes it to three distinct calls to `mptool encrypt` (`ctA`, `ctB`, `ctI`). Because $C_1 = r \cdot G$, $C_1$ is identical across all three ciphertexts by construction. `verify.ts:28-36` then reads these exact local strings from `state.sendResults` and declares $C_1$-sharing verified.
This does **not** prove that `rippled 3.3.0` requires $C_1$-sharing or that a conforming client cannot submit distinct blinding factors per participant.
*What would settle it:* (1) A negative control on Devnet submitting a `ConfidentialMPTSend` with distinct blinding factors ($r_A \neq r_B \neq r_I$) to test whether `ConfidentialMPTSend.cpp` rejects it; (2) Source verification of the validator's deserializer in `ConfidentialMPTSend.cpp` to check whether it parses separate $C_1$ values or enforces equivalence.

### Q3 — Sample-Size Range & Generalization Defects
**Verdict: Multiple instances identified.**
- **E-47 / U-28:** Claims WASM build *"does not build on emsdk newer than its CI pin"*, generalizing a range from a single failure on 6.0.6 vs 6.0.2.
- **E-56:** Claims Conan lockfile defect F-9 is *"not a blocker"* based on a single macOS/clang/Homebrew environment using an ad-hoc shell script.
- **E-53:** Declares the JS client path is *"complete with no patching, no vendoring and no build step"* based on executing `Convert` alone. `Send`, `ConvertBack`, `Clawback`, and `MergeInbox` were never executed via npm on Devnet.
- **E-51:** Asserts a static metadata size of 1219 B across all sends from 3 sample transactions on a single issuance.

### Q4 — Grep-Based Negative Claims
**Verdict: Methodologically weak.**
`U-30` / `E-48` asserts *"no test asserts distinct nonces across identical statements"* based on grepping for the token `nonce` in `tests/`. This fails to catch tests written under alternative terminology (`salt`, `random`, `seed`, `entropy`, `deterministic`, `same_statement`) or integration tests where proof uniqueness is checked implicitly.
*What is needed:* AST-level call-graph traversal or dynamic execution tracing showing that `generate_deterministic_nonces` is never called twice with identical `(witness, statement)` tuples in the test suite.

### Q5 — Neutral Observation vs. Endorsement in Nonce Section
**Verdict: Slips into editorial endorsement and omits critical failure modes.**
While `DEVNET-CONVERT-2026-08-17.md` §8 labels the nonce write-up as "input for the Cryptography Reviewer", `UPSTREAM-FEEDBACK.md:119` (U-29) explicitly endorses it: *"the construction looks like the right one."*
Furthermore, §8 entirely omits the operational downsides of hedged nonces:
- Destroys deterministic test reproducibility and test vectors.
- Incompatible with air-gapped HSMs and deterministic hardware signers requiring verifiable audit trails without live host entropy.
- In host environments with broken or low-entropy RNGs (e.g. flawed browser `crypto.getRandomValues`), hedging can degrade unpredictably.

### Q6 — Consistency of the "Stranded" Result Correction
**Verdict: Partially corrected in narrative, but downstream strategy documents remain stale.**
The retraction of the "stranded" claim in `CLAIMS.md` E-50, `DEVNET-CONVERT-2026-08-17.md` §7, and `XLS-66-INVESTIGATION-2026-08-16.md` GAP-9 is explicit and well-evidenced by `post-vault-send.ts`. However:
- `TASK-ZERO-2026-08-13.md:262-266` (§9) was never updated and still asserts that zero-value sends are established as indistinguishable to justify the cover-traffic domain defense.
- `CLAIMS.md` F-10 still asserts that the confidential balance is *"unreachable from every vault and lending transaction"*, which blurs the distinction between vault deposit refusal and overall asset spendability.

### Q7 — Measured vs. Computed Numbers & Additional Defects
- In `verify.ts:36-40`, on-wire payload sizes (1210 B, 1276 B, 1177 B) are computed via arithmetic formulas in JS rather than extracted from raw transaction stream bytes.
- In `npm-e2e-convert.ts:71`, `decryptAmount` is called with invalid argument arity (4 arguments instead of 3), passing `0n` into `rangeHigh` and breaking the claimed on-ledger decryption validation.

---

## Findings Ranked by Severity

### CRITICAL
*No findings in this bucket (no active cryptographic exploits or live key leaks).*

---

### HIGH

#### [HIGH-01] Uncontrolled Baseline and Untested Fee Invariant in E-22 Indistinguishability Claims
- **Files:** [`tools/spike-2026-08-17/send.ts#L64-L122`](file:///tools/spike-2026-08-17/send.ts#L64-L122), [`CLAIMS.md#L60`](file:///CLAIMS.md#L60) (E-22), [`docs/task-zero/DEVNET-CONVERT-2026-08-17.md#L73-L95`](file:///docs/task-zero/DEVNET-CONVERT-2026-08-17.md#L73-L95) (§4), [`docs/task-zero/TASK-ZERO-2026-08-13.md#L262-L266`](file:///docs/task-zero/TASK-ZERO-2026-08-13.md#L262-L266) (§9)
- **Problem:** E-22(b) asserts that zero-amount confidential sends "survived four falsification checks". In reality:
  1. The single non-zero control transaction (`amount = 100`) was proven against balance `250` at version `1`. Both zero sends (`amount = 0`) were proven against balance `150` at versions `2` and `3`. The comparison varied three independent parameters at once.
  2. The control sample size is $n=1$.
  3. The fee indistinguishability check was never executed: all transactions passed a static fee of `5000` drops.
  4. `TASK-ZERO-2026-08-13.md` §9 relies on this unproven indistinguishability to keep scheduled cover traffic as its primary compliance recommendation.
- **Fix:**
  1. Regrade E-22(b) to unverified / pending.
  2. Update `send.ts` to execute a controlled run: prove both zero and non-zero transfers against identical starting balances, identical account sequence baselines, and test dynamic base-fee thresholds.
  3. Rewrite `TASK-ZERO-2026-08-13.md` §9 to treat cover traffic as an unverified theoretical proposal.

#### [HIGH-02] Invalid Argument Arity in `npm-e2e-convert.ts` Corrupts Decryption Verification
- **File:** [`tools/spike-2026-08-17/npm-e2e-convert.ts#L71`](file:///tools/spike-2026-08-17/npm-e2e-convert.ts#L71)
- **Problem:** Line 71 attempts to verify on-ledger decryption of the 321-unit convert transaction using `@xrplf/mpt-crypto@0.1.0`:
  ```ts
  console.log(`    inbox decrypts (npm decryptAmount) -> ${await mpt.decryptAmount(m.ConfidentialBalanceInbox, sk, 0n, 1000n)}`);
  ```
  The published TypeScript wrapper signature is `decryptAmount(ciphertext, privateKey, rangeHigh)`. Passing 4 arguments assigns `0n` to `rangeHigh` and discards `1000n`. The function brute-forces the window `[0, 0]`, failing to decrypt the true value `321`. This measurement code failed to test what it claimed to test, yet E-53 cites it as proof of end-to-end execution.
- **Fix:**
  Change line 71 to pass the correct 3-argument signature:
  ```ts
  await mpt.decryptAmount(m.ConfidentialBalanceInbox, sk, 1000n)
  ```
  Add an explicit assertion verifying that the decrypted return value strictly equals `321n`.

#### [HIGH-03] Circular Local Verification of Wire $C_1$-Sharing (E-4, F-13)
- **Files:** [`tools/spike-2026-08-17/verify.ts#L28-L36`](file:///tools/spike-2026-08-17/verify.ts#L28-L36), [`tools/spike-2026-08-17/send.ts#L69-L71`](file:///tools/spike-2026-08-17/send.ts#L69-L71), [`CLAIMS.md#L41`](file:///CLAIMS.md#L41) (E-4), [`CLAIMS.md#L147`](file:///CLAIMS.md#L147) (F-13)
- **Problem:** E-4 and F-13 conclude that $C_1$ is shared across all participants by protocol mandate and that the published paper is wrong about wire format sizes. However, `send.ts` explicitly generated `ctA`, `ctB`, and `ctI` using the identical scalar `r32`. `verify.ts` then compared those exact cached client objects from `state.json`. This proves only that the client passed the same blinding factor to all three encryptions, not that the XRPL consensus protocol or `rippled` verifier requires it.
- **Fix:**
  1. Regrade E-4 and F-13 from Grade A to Grade B/C.
  2. Implement an explicit negative test on Devnet: attempt to submit a `ConfidentialMPTSend` constructed with independent blinding factors $r_A, r_B, r_I$. If rejected by `rippled`, cite the validator rejection engine code as the primary source.

---

### MEDIUM

#### [MEDIUM-01] E-47 and U-28 Reintroduce Overgeneralized Toolchain Range Claim
- **Files:** [`CLAIMS.md#L93`](file:///CLAIMS.md#L93) (E-47), [`UPSTREAM-FEEDBACK.md#L118`](file:///UPSTREAM-FEEDBACK.md#L118) (U-28)
- **Problem:** While F-12 was narrowed to state that Emscripten 6.0.6 failed and 6.0.2 succeeded, E-47 still asserts as Grade A that the WASM build *"does not build on emsdk newer than its CI pin"*, and U-28 asserts *"does not build on an emsdk newer than the CI pin"*. Testing a single newer point release (6.0.6) does not establish failure across all versions $> 6.0.2$.
- **Fix:**
  Update E-47 and U-28 to match F-12:
  ```markdown
  fails on emsdk 6.0.6 while succeeding on 6.0.2; intermediate and subsequent versions untested
  ```

#### [MEDIUM-02] Premature Claim of Complete JS Client Path in E-53 & Task-Zero Milestone 1
- **Files:** [`CLAIMS.md#L100`](file:///CLAIMS.md#L100) (E-53), [`docs/task-zero/TASK-ZERO-2026-08-13.md#L140-L149`](file:///docs/task-zero/TASK-ZERO-2026-08-13.md#L140-L149)
- **Problem:** E-53 and `TASK-ZERO-2026-08-13.md` declare that the JS client path is complete across three published packages with zero build steps, and that Milestone 1 is 100% complete. In reality, only `ConfidentialMPTConvert` was executed end-to-end using `@xrplf/mpt-crypto`. `Send`, `ConvertBack`, `Clawback`, and `MergeInbox` were generated exclusively using the C `mptool` binary.
- **Fix:**
  Scope E-53's Grade A execution strictly to `ConfidentialMPTConvert`. Mark JS client support for `Send`, `ConvertBack`, and `Clawback` as PENDING execution.

#### [MEDIUM-03] Overgeneralized Severity Downgrade of Conan Lockfile Defect F-9 (E-56)
- **Files:** [`CLAIMS.md#L103`](file:///CLAIMS.md#L103) (E-56), [`docs/task-zero/DEVNET-CONVERT-2026-08-17.md#L28-L30`](file:///docs/task-zero/DEVNET-CONVERT-2026-08-17.md#L28-L30) (§1)
- **Problem:** E-56 asserts that F-9 is *"not a blocker"* (Grade A) because a custom shell script compiled the source on a single developer machine with Homebrew OpenSSL and local symlinks. This does not justify downgrading the defect severity for standard contributors, CI pipelines, Linux distributions, or downstream CFFI packages that rely on standard build tools.
- **Fix:**
  Rephrase E-56 to state: *"F-9 was bypassed for local macOS compilation via direct clang invocation; remains blocking for standard Conan workflows and downstream package builds."*

#### [MEDIUM-04] Section 8 Nonce Write-Up Omits Critical Security Downsides
- **Files:** [`docs/task-zero/DEVNET-CONVERT-2026-08-17.md#L120-L147`](file:///docs/task-zero/DEVNET-CONVERT-2026-08-17.md#L120-L147) (§8), [`UPSTREAM-FEEDBACK.md#L119`](file:///UPSTREAM-FEEDBACK.md#L119) (U-29)
- **Problem:** U-29 contains subjective praise (*"the construction looks like the right one"*), while DEVNET-CONVERT §8 presents hedged nonces without documenting their severe cryptographic trade-offs: loss of deterministic verification/test repeatability, incompatibility with air-gapped HSMs, and vulnerability to degraded host CSPRNGs.
- **Fix:**
  Remove editorial phrasing from U-29. Add an explicit "Cryptographic Downsides & Trade-offs" subsection to DEVNET-CONVERT §8 detailing test non-reproducibility and hardware signer constraints before submitting to the Cryptography Reviewer.

---

### LOW

#### [LOW-01] Negative Test Assertion Relies on Naive Grep Token Search (U-30, E-48)
- **Files:** [`CLAIMS.md#L95`](file:///CLAIMS.md#L95) (E-48), [`UPSTREAM-FEEDBACK.md#L120`](file:///UPSTREAM-FEEDBACK.md#L120) (U-30)
- **Problem:** The claim that upstream has zero tests checking proof uniqueness over identical inputs relies solely on grepping `tests/` for `nonce`. Tests checking proof output variance under alternative naming schemes would not be caught.
- **Fix:**
  In U-30, specify the exact search query used (`grep -rn "nonce" tests/`) and state that semantic/AST test inspection has not been performed.

#### [LOW-02] Uninformative Vanity Metric in Claims Register (E-45)
- **File:** [`CLAIMS.md#L91`](file:///CLAIMS.md#L91) (E-45)
- **Problem:** Claim E-45 includes the phrase *"Accepted on the first submission, no retries."* This is narrative commentary that provides no technical capability assurance.
- **Fix:**
  Remove *"Accepted on the first submission, no retries"* from `CLAIMS.md` E-45.

#### [LOW-03] Misleading Flag Constant Comment in `vault.ts`
- **File:** [`tools/spike-2026-08-17/vault.ts#L46`](file:///tools/spike-2026-08-17/vault.ts#L46)
- **Problem:** Line 46 contains a comment stating `(128 = CanHoldConfidentialBalance)`. However, the actual bitflag for `tfMPTSetCanHoldConfidentialBalance` used in `convert.ts:164` and the XRPL spec is `256` (`0x00000100`).
- **Fix:**
  Correct the inline comment in `vault.ts` to `(256 = CanHoldConfidentialBalance)`.

---

## Final Verdict

**Verdict:** `fix-before-merge`
---

## Recording notes — observations about the leg, not adjudication

Kept separate from the verbatim text above. Spot-checks below establish only whether a finding points at real text; they do **not** decide it.

1. **Two findings land on exactly what the Codex leg found, independently and with no knowledge of it.** MEDIUM-01 (E-47/U-28 reintroduce the narrowed F-12 range) and MEDIUM-03 (E-56 downgrades F-9 from a one-host result) are the same two defects, at the same rows. **Two legs, different access, no shared prompt, same findings** — the strongest signal available from this rotation.
2. **Q1 point 4 is new to both the packet and the Codex leg, and it is the sharpest thing in this review.** *"Counting transaction acceptance as one of four indistinguishability checks is circular bookkeeping"* — check 1 is E-22(a) itself, so the phrase "survived four checks" counts the validity claim as evidence for the indistinguishability claim. Neither self-review nor Codex noticed. It also raises the count problem: with check 1 removed and check 4's fee dimension unexecuted, the arithmetic behind "four" needs restating.
3. **HIGH-03 answers packet Q3, which the Codex leg left open.** It reaches the same conclusion the packet feared — that `C₁`-sharing may be an artifact of the harness passing one `tx_blinding_factor` — and proposes a concrete settling experiment: submit a Send with independent per-participant blinding factors and see whether rippled rejects it. **That experiment has not been run.**
4. **HIGH-02 is correct and is a real defect in committed evidence code.** `npm-e2e-convert.ts:71` does call `decryptAmount` with four arguments against a three-argument signature. It threw at runtime during the session, which is how the `range_low` behaviour behind F-15 was found in the first place. Two things need separating in adjudication that this finding merges: the **transaction** in that script was accepted and validated before the throw, so E-53's end-to-end claim does not rest on the broken line; and decryption via the npm package **was** verified separately in `npm-decrypt-window.ts`. What is true is that a committed evidence file contains a call that cannot work.
5. **LOW-03 is a false positive, verified against the specification.** `vault.ts:46` prints the *ledger-state* `Flags` of the created share issuance and annotates it with `lsfMPTCanHoldConfidentialBalance`, which XLS-0096 §6.2 gives as `0x00000080` = **128**. The 256 the finding cites is `tfMPTSetCanHoldConfidentialBalance` from §12.3 — a *transaction* flag on a different field, used correctly elsewhere in `convert.ts`. The comment is right as written; the finding conflates `lsf` with `tf`.
6. **Q7's first bullet is partly wrong and the distinction matters for E-4.** `send.ts` decodes the actual signed blob with `ripple-binary-codec`'s `decode()` and measures each field's length from the decoded wire bytes — the per-field sizes are measurements, not formulas. Only the 1210 / 1276 totals in `verify.ts` are arithmetic, and they are arithmetic *over measured fields*. E-4 already discloses that the 1276 auditor figure is computed. The finding reads as though the field sizes themselves were invented, which the diff does not support.
7. **MEDIUM-02 is a finding the packet should have contained and did not.** E-53 and the TASK ZERO §5 rewrite generalise from one executed transaction: only `ConfidentialMPTConvert` was run through the npm package. `Send`, `ConvertBack`, `Clawback` and `MergeInbox` used the native `mptool`. That is the same Q3/Q4 sample-size shape applied to the claim this session was most pleased about — **which is exactly where §5 of the packet predicted the bias would be**.
8. **Q5 was answered where the Codex leg was silent**, and it found a specific line rather than a general worry: `U-29`'s *"the construction looks like the right one"* is editorial endorsement sitting inside the upstream register. It also names three downsides of hedged nonces that §8 omits entirely — test non-reproducibility, air-gapped/HSM incompatibility, and behaviour under a degraded host CSPRNG. The third is directly relevant to E-55, which recorded that browser entropy is host-supplied without drawing any consequence from it.
9. **Q6's second bullet needs care in adjudication.** F-10 says the confidential balance is unreachable *from vault and lending transactions*, which the post-vault Send does not contradict — that Send is a confidential transaction, not a vault one. Whether the wording nonetheless blurs "cannot enter the vault" into "cannot be spent" is a fair question about phrasing, not a demonstrated error.
10. **No finding was raised against E-45's core claim, E-46, E-49, E-50, E-52 or F-15.** E-45 drew only LOW-02, on the "first submission, no retries" phrasing — which the packet itself asked about as Q8, and which both the packet and this leg now agree should go.
