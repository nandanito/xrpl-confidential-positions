# REVIEW-021e — Gemini leg, ROUND TWO: the fixes

- **Date:** 2026-08-25
- **Tool:** `agy --effort high`, no tools, from a non-repo working directory.
- **Verdict: one MEDIUM and two LOW — including a defect introduced BY a round-one fix.**

> ## ⚠ This leg is the argument for round one's own structural correction
>
> **Round one this leg reported nothing on seven questions and self-scored
> 10/10**, while two other readers found eight defects between them. Round one's
> adjudication diagnosed the cause as the packet rather than the leg: *"a
> self-contained packet bounds what a leg can find to what the packet chose to
> show, and the packet's choices are the adjudicator's blind spots."*
>
> **The correction was applied and it worked.** This packet carried the
> **complete text** of every file the fixes touched rather than a diff, and the
> same leg came back with the single most valuable finding of the whole review —
> a gate reporting `PASS` while its own headline guarantee was disabled.
>
> ⚠ **The literal recommendation could NOT be applied.** Round one said *"give
> both legs repository access"*; `agy` is denied shell permission in
> non-interactive use and aborts if it tries. A copy of the tree was placed in
> its working directory and it could not read it. **What worked was enriching
> the packet, not granting access** — worth knowing before the next round
> repeats the recommendation as written.
>
> ⚠ **One of its counts is wrong** — see `REVIEW-021g` §2. It calls `mptool.c`
> a definition site; `mptool.c:54` is `mpt_generate_blinding_factor(r)`, a call.
> *A review finding is evidence, not an instruction*, for the sixth time.

---

## Verbatim output

### Verdict

The round-one fixes in commit `4cc3ae1` successfully resolve the primary protocol and test vulnerabilities (enforcing §10.3 required fields and lengths in `ParsedTransaction::parse`, preventing silent field drops in `rebuild_inner`, correcting the `ConfidentialMPTConvert` disclosure, and migrating `devnet-send-our-nonces.ts`). However, the newly introduced gate `tools/check-blinding-sources.ts` contains a **defect introduced by the fix** (Kind 1) and creates a **false statement about the fixes** (Kind 3): `tools/wconf-randomness.ts` is listed in `EXEMPT` even though it contains zero call sites, and its resulting "stale exemption" failure was masked by hardcoding a bypass in the stale-checker loop. Furthermore, the widely repeated claim of *"nine call sites reaching the unruled generator"* is false: the count of 9 reported by the gate is an artifact of 1 gate self-match (`check-blinding-sources.ts`), 1 C symbol definition (`mptool.c`), and 7 actual caller harnesses. Beyond this, all 6 newly added test suites pass for their stated reasons (Kind 2 checked clean), the parse-time protocol checks match XLS-0096 §10.3, and recording B-17 as a named gap was the correct protocol boundary choice.

---

### Findings

#### Finding 1 (MEDIUM) — `check-blinding-sources.ts` contains a dead exemption entry masked by a hardcoded stale-check bypass, producing a false exemption count.
* **Defect:** `tools/check-blinding-sources.ts` lists `tools/wconf-randomness.ts` in `EXEMPT` despite it having 0 pattern matches, and suppresses the resulting stale-exemption failure via a hardcoded `if (stale === ...)` bypass, while reporting an exemption count of 9 that counts its own regex definition and `mptool.c`.
* **Primary Source:** `tools/check-blinding-sources.ts` lines 76–80, 114–137, 155–160; `signer/README.md` line 221; `tools/wconf-randomness.ts` lines 23–28.
* **What Concretely Breaks:**
  1. `wconf-randomness.ts` does not contain any of `ROUTES`' patterns (`hits.length === 0`). It is never deleted from `unusedExemptions`.
  2. To avoid failing on `wconf-randomness.ts`, line 157 explicitly hardcodes:
     ```ts
     if (stale === "tools/check-blinding-sources.ts" || stale === "tools/wconf-randomness.ts") continue;
     ```
     This bypasses the stale-exemption check for `wconf-randomness.ts`, defeating the gate's core guarantee that every listed exemption corresponds to an active, necessary violation.
  3. `check-blinding-sources.ts` matches its own regex string (`_mpt_generate_blinding_factor`), incrementing `exemptSeen` to 1.
  4. The reported count of "9 deliberate exemptions" (`PASS: 9 deliberate exemptions`) consists of: 1 self-match (`check-blinding-sources.ts`), 1 C implementation definition (`mptool.c`), and 7 actual test/spike caller harnesses (`reuse-r-setup.ts`, `adj-c1-verify.ts`, `adj-c1-shared-blinding.ts`, `wasm-test.ts`, `npm-package-test.ts`, `nonce-crosscheck.ts`, `npm-e2e-convert.ts`). `wconf-randomness.ts` sits as an uncounted 10th key in `EXEMPT`.
* **Severity:** MEDIUM
* **Remedy:** Remove `"tools/wconf-randomness.ts"` from `EXEMPT` and remove `stale === "tools/wconf-randomness.ts"` from the stale loop in `tools/check-blinding-sources.ts`. Update the documentation in `signer/README.md` and `tools/wconf-randomness.ts` to state that there are 7 exempt caller harnesses (or 9 exempt files if counting `mptool.c` and `check-blinding-sources.ts`).

---

#### Finding 2 (LOW) — `tools/check-blinding-sources.ts` ignores shell scripts (`.sh`) and array-based invocation arguments.
* **Defect:** `tools/check-blinding-sources.ts` restricts its directory walker to `/\.(ts|js|c|h|rs)$/` and requires open parentheses in `/\(\s*["']blinding["']\s*\)/`, missing shell scripts and array-passed process arguments.
* **Primary Source:** `tools/check-blinding-sources.ts` lines 56, 122.
* **What Concretely Breaks:** Any shell script in `tools/` (e.g. `rebuild-env.sh`, `vendor-verify.sh`, `build.sh`) that invokes `mptool blinding`, or any TypeScript script passing arguments as an array (e.g., `spawn(["mptool", "blinding"])` or `["blinding"]`), is completely invisible to the gate.
* **Severity:** LOW
* **Remedy:** Add `sh` to the extension matcher (`/\.(ts|js|c|h|rs|sh)$/`) and extend the `ROUTES` regex to match array argument patterns like `/[\[\s,]["']blinding["'][\]\s,]/`.

---

#### Finding 3 (LOW) — Redundant ternary condition in `the_rebuild_helper_round_trips_and_is_not_quietly_dropping_fields`.
* **Defect:** `signer/tests/convert_back.rs` contains a no-op ternary condition where both branches call `fixture_registered()`.
* **Primary Source:** `signer/tests/convert_back.rs` line 570.
* **What Concretely Breaks:** The code reads `let mut f = if op == CB { fixture_registered() } else { fixture_registered() };`. While functionally benign (both `ConvertBack` and `Send` execute against a registered fixture), the dead conditional misleads future maintainers into thinking divergent fixture setups were intended.
* **Severity:** LOW
* **Remedy:** Replace with `let mut f = fixture_registered();`.

---

### Per-Question Responses

#### Q1. Did any fix introduce a defect?
* **(a) `tools/check-blinding-sources.ts`:**
  * **Pattern sufficiency:** The regexes miss `.sh` scripts entirely (excluded in `walk()`) and miss argument array invocations like `["blinding"]` due to the mandatory open paren `\(`.
  * **Scope:** Walking only `tools/` is acceptable for script harnesses, but `signer/`'s exclusion of `mpt_generate_blinding_factor` is assumed rather than gated by this script.
  * **Stale Exemption Hole:** A concrete defect exists (Finding 1): `wconf-randomness.ts` has 0 matches, is listed in `EXEMPT`, and is explicitly ignored in the stale-exemption check to force the script to pass.
* **(b) Protocol-facing §10.3 checks in `signer/src/txn.rs`:**
  * **Sizes:** Exact against §10.3: `BLINDING_FACTOR` is 32 bytes (`UINT256`), `BALANCE_COMMITMENT` is 33 bytes (`PEDERSEN_COMMIT`), `ZKProof` is 816 bytes (`CONVERT_BACK_PROOF` = 128-byte sigma + 688-byte Bulletproof).
  * **`MPTAmount` Presence vs §10.4.1 item 5:** Checking `d.u64(xrpl::MPT_AMOUNT).is_none()` correctly enforces the required presence of the field. A zero amount is encoded as `Some(0)` (which passes presence check and is rejected on-ledger as `temBAD_AMOUNT`).
  * **Rejection of valid transactions:** No valid XRPL `ConvertBack` transaction is rejected; all checks reflect mandatory schema constraints from XLS-0096 §10.3.
* **(c) Disclosure change in `signer/src/confirm.rs`:**
  * The updated text for `TxType::Convert` states: *"PUBLIC: that you converted, when, for which issuance — and this amount, which is in the clear on the wire forever, along with the blinding factor. HIDDEN: the resulting balance."*
  * This is completely true against XLS-0096 §7.2: `MPTAmount` and `BlindingFactor` are both plaintext on the wire for a Convert, while the resulting balance is encrypted.

---

#### Q2. Did any test written for a round-one finding pass for the WRONG reason?
Every test was evaluated against its failure modes:
1. `parse_refuses_a_convert_back_missing_any_field_section_10_3_requires`: Passes for the exact right reason. It asserts that the specific error message for each dropped field is returned (`"must carry MPTAmount"`, `"must carry BlindingFactor"`, `"must carry BalanceCommitment"`, `"must carry a ZKProof"`), proving failure is caused by that specific missing field, not a general parse collapse.
2. `parse_refuses_a_convert_back_whose_fixed_size_fields_are_the_wrong_length`: Passes for the right reason. Explicitly checks for `"816"` on a 40-byte proof and `"33"` on a 34-byte commitment.
3. `the_rebuild_helper_round_trips_and_is_not_quietly_dropping_fields`: Passes for the right reason. Compares decoded key sets `k0 == k1` excluding only `TxnSignature`, and verifies round-trip fidelity for all 10 rendered transaction properties across both `ConvertBack` and `Send`.
4. `every_type_that_publishes_an_amount_says_so_and_the_one_that_does_not_never_does`: Passes for the right reason. Pins `"this amount"` and `"in the clear"` / `"public balance"` for `Convert` and `ConvertBack`, while strictly asserting `!line.contains("this amount")` and `HIDDEN: the amount` for `Send`.
5. `a_balance_version_that_moves_during_a_convert_back_confirmation_is_detected` & `a_balance_ciphertext_that_moves_during_a_convert_back_confirmation_is_detected`: Both pass for the right reason. `c.seen == 1` confirms the confirmation UI was reached, and the returned error detail specifically names `ConfidentialBalanceVersion` and `ConfidentialBalanceSpending` respectively.

---

#### Q3. Is any sentence written ABOUT a fix false?
* **False sentence found (Kind 3):** `signer/README.md` line 221 (*"NINE call sites still reach it deliberately"*) and `tools/wconf-randomness.ts` line 23 (*"NINE files reach upstream's generator deliberately"*) are false. As proven in Finding 1, there are only 7 caller harnesses; the number 9 includes `check-blinding-sources.ts` matching its own regex and `mptool.c` defining the C symbol, while `wconf-randomness.ts` is an uncalled dead exemption.
* **`txn.rs` claim:** *"the typed builder cannot currently produce one"* — **True.** The typed builder constructs `ConvertBack` with a 64-bit integer amount, 32-byte blinding factor, 33-byte commitment, and 816-byte proof.
* **`rebuild-env.sh` header:** Distinguishing "reconstruct" (impossible for ephemeral Devnet keys) from "restore" (from `$BACKUP`) is completely accurate against lines 120–133 of the script.
* **`CLAIMS.md` E-135 through E-140 and B-17:** All evidence citations support the corresponding claims.

---

#### Q4. Is the count of nine exemptions right, and is each reason true?
* **Verification of count:** The dictionary contains **10 entries**. 1 entry (`wconf-randomness.ts`) has 0 hits. 1 entry (`check-blinding-sources.ts`) matches itself. 1 entry (`mptool.c`) is the implementation file. The remaining **7 entries** are actual caller harnesses. The claimed count of "9 call sites" conflates the test gate and C definitions with callers.
* **`npm-e2e-convert.ts` on Devnet:** The exemption reason accurately states its purpose: verifying that proof material generated by `@xrplf/mpt-crypto` off npm submits successfully to Devnet (E-53). While this publishes an `r` from upstream's CSPRNG on Devnet, upstream's CSPRNG scalar is statistically uniform and does not leak keys. The project accepted E-53's integration guarantee over E-76's purity constraint for this single external-package harness.
* **`mptool.c`:** Exempting `mptool.c` is a category error resulting from the regex matching C function signatures in source files rather than just call sites.

---

#### Q5. Was recording B-17 rather than fixing it the right call?
* **The decision was correct.** `terFROZEN` is an engine-level provisional failure (`ter`), not a fee-claiming ledger failure (`tec`).
* If a frozen account submits, no transaction is applied to the ledger, no fee is deducted, and **no ciphertext or metadata is published**.
* Implementing freeze preflighting without the `rippled` 3.3.0 source or exact flag precedence rules would substitute speculation for specification, violating `CLAUDE.md`. Recording B-17 as a liveness boundary gap with clear settlement criteria is the sound engineering choice.

---

#### Q6. Free hunt on the fixes
* All other changes in commit `4cc3ae1` (including the context hash reordering in `devnet-send-our-nonces.ts` and the docstring corrections in `signer/README.md`) are verified clean.

---

### Sections of Packet Reasoned From (Audit Trail)

* **For Q1:** §6 (`tools/check-blinding-sources.ts`, `signer/src/txn.rs`, `signer/src/confirm.rs`), §7 (XLS-0096 §10.3 & §10.4 verbatim), and §8 (`THE-FIXES.diff`).
* **For Q2:** §6 (`signer/tests/convert_back.rs`, `signer/tests/falsifier.rs`, `signer/tests/ledger_read.rs`) and §8 (`THE-FIXES.diff`).
* **For Q3:** §6 (`signer/README.md`, `tools/wconf-randomness.ts`, `tools/rebuild-env.sh`, `signer/src/txn.rs`), §8 (`THE-FIXES.diff`), and §9 (`REVIEW-021c`).
* **For Q4:** §6 (`tools/check-blinding-sources.ts`, `signer/README.md`, `tools/wconf-randomness.ts`) and §8 (`THE-FIXES.diff`).
* **For Q5:** §7 (XLS-0096 §10.4.2 item 9) and §9 (`REVIEW-021c` §2 B-17).
* **For Q6:** §6 (all files in full) and §8 (`THE-FIXES.diff`).
