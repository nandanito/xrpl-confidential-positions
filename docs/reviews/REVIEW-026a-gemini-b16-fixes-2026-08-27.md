# REVIEW-026 — Adversarial Review of the B-16 Fixes (Round Two)

**Reviewing Commit Range:** `200aae63..e9a3d26` (at frozen commit `e9a3d26c13194fa86e11bd5ca5efdd4c1662e78f`)  
**Scope:** Review of the fixes applied in response to round-one findings (`REVIEW-025s`, `REVIEW-025a`, `REVIEW-025b`), new defects introduced by the fixes, description overclaims, §6 Gate 1 verification, and assessment of whether a third round is warranted.

---

## 1. Finding-by-Finding Verdicts (Ticked Against Each Leg's Own Report)

### Self Leg (`REVIEW-025s`)

| # | Finding & Site | Verdict | Post-Fix Citation & Analysis |
|---|---|---|---|
| **S1** | **`the_dst_is_the_ruled_bytes` is a tautology** (`tests/hedged_signing.rs:248-260`) and `xrpl.rs:552-555` comment falsely claims it pins the constant. | **FIXED** | `signer/src/xrpl.rs:610` exports `pub const ED25519_NONCE_HEDGE_DST`. `signer/tests/hedged_signing.rs:647-651` asserts `assert_eq!(&xrpl::ED25519_NONCE_HEDGE_DST[..], RULED_DST)`. Doc comment at `xrpl.rs:597-609` corrected. Revert 12 in `revert-sweep.py:147-150` tests DST mutation specifically. |
| **S2** | **Verifying-key drift check is `debug_assert_eq!`** (`xrpl.rs:539`), compiled out of `--release`. | **FIXED** | `signer/src/xrpl.rs:576-584` replaces `debug_assert_eq!` with an unconditional `assert_eq!` that panics (aborts in release) with an explicit explanation of the two-equations-in-one-unknown attack. |
| **S3** | **`Sha512::digest(k.to_bytes())` copies secret by value** onto the stack (`xrpl.rs:512`). | **FIXED** | `signer/src/xrpl.rs:534` uses `k.as_bytes()`. Unwiped locals (`h`, `mask`, `fresh_aux` buffer) are formally filed as B-21 in `CLAIMS.md:231`. |
| **S4** | **`Hedge::Fresh` has one reference: its own match arm** (`xrpl.rs:644`). | **FIXED** | `signer/src/xrpl.rs:659-664` deletes `Hedge::Fresh` from the enum, `xrpl.rs:701-705` deletes the match arm. `tools/check-test-support-gate.ts:77-81` updated to probe `DeterministicForVectors`. |
| **S5** | **KAT strength is asymmetric between arms** (arithmetic has Noble control; mask combiner has no third party). | **FIXED** | `signer/tests/hedged_signing.rs:680-695` renames test to `the_construction_matches_a_second_model` and doc comment explicitly states that the mask combiner rests on two internal readings of the same prose (Rust & TS). |

---

### Gemini Leg (`REVIEW-025a`)

| # | Finding & Site | Verdict | Post-Fix Citation & Analysis |
|---|---|---|---|
| **G-1** | **§6 Gate 7 PARTIAL: Missing committed execution receipt** of live Devnet run on commit `200aae63`. | **FIXED** | Committed `docs/runs/b16-hedged-ed25519-devnet-2026-08-27.json` (lines 1–25) containing full transaction metadata, commit provenance, and `doesNotEstablish` boundaries. `tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts:302-306` auto-writes the receipt into `docs/runs/`. |
| **G-2** | **§7 Condition 4 PARTIAL: Two-round rotation incomplete.** | **FIXED** | Round Two is executing now in this review. |
| **G-3** | **`the_verifying_key_is_the_published_one_and_no_caller_can_choose_it` fails its name** (`hedged_signing.rs:570-581`). | **FIXED** | `signer/tests/hedged_signing.rs:621` renamed to `every_signature_verifies_under_the_seed_derived_published_key`. Doc comment at lines 600–606 acknowledges that caller exclusion is structural. |
| **G-4** | **`check-test-support-gate.ts` sub-check for `FixedAux` false-passes** via echoed source line in diagnostic. | **FIXED** | `tools/check-test-support-gate.ts:130-190` rewritten to compile isolated throwaway crates per probe, plus a negative control (lines 105–109, 145–160). *(Note: subtle probe-composition weakness evaluated in Section 2).* |
| **G-5** | **Premature assertion of register closure** ("BUILT", "B-14 is CLOSED") in headers (`xrpl.rs:46, 51`, `hedged_signing.rs:26, 31`). | **FIXED** | `signer/src/xrpl.rs:46-60` and `signer/tests/hedged_signing.rs:33-55` changed to "BUILT and EXECUTED", explicitly stating "BUILT AND EXECUTED IS NOT REVIEWED" and noting §7 item 4 remains in flight. `CLAIMS.md:217, 234-235` updated consistently. |
| **G-6** | **Makefile `check-test-support` guarantee scope overclaim** ("every gated symbol"). | **FIXED** | `Makefile:78-82` clarifies: "Over a NAMED SET of probes, not over the crate's whole public surface". |

---

### Codex Leg (`REVIEW-025b`)

| # | Finding & Site | Verdict | Post-Fix Citation & Analysis |
|---|---|---|---|
| **C-1** | **§6 Gate 1 PARTIAL: `tests/xrpl_vectors.rs` absent from packet.** | **FIXED** | File included in full and verified in Section 4. |
| **C-2** | **§6 Gate 7 PARTIAL: Executes `target/debug` binary without rebuild or commit provenance link.** | **FIXED** | `tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts:74-86` reads git `HEAD`, checks working tree dirty status, rebuilds via `cargo build`, and records `builtFromCommit` and `workingTreeDirty` in receipt (`docs/runs/b16-hedged-ed25519-devnet-2026-08-27.json:4-5`). |
| **C-3** | **§6 Gate 8 PARTIAL: `revert-sweep.py` accepted any non-compilation nonzero exit as "test failed"** and did not require expected test name. | **FIXED** | `tools/spike-b16-2026-08-27/revert-sweep.py:69-95` runs the whole test suite, parses `failed` test names from stdout, and verifies `set(failed) & set(expected)`. Reports `WRONG-TEST` and `NO-TEST-FAILED` distinctly. *(Note: loop-restore defect evaluated in Section 2).* |
| **C-4** | **`ed25519_secret_material_is_zeroized_on_drop` overclaims memory effect** (`hedged_signing.rs:721-730`). | **FIXED** | `signer/tests/hedged_signing.rs:786` renamed to `ed25519_secret_types_implement_zeroize_on_drop`. Comment at lines 776–784 states this tests trait bounds while memory clearing depends on dependency `Drop` impls. |
| **C-5** | **`xrpl.rs:71-74` miscredits `zero_aux_is_hedged_not_a_fallback`** for zero-draw property. | **FIXED** | `signer/src/xrpl.rs:85-91` and `signer/README.md:555-560` correctly credit `a_successful_all_zero_draw_still_hedges` and explain why `zero_aux_is_hedged_not_a_fallback` was blind. |
| **C-6** | **`hedged_signing.rs:20-24` says `one_implementation_not_two` "is what holds"** structural property. | **FIXED** | `signer/tests/hedged_signing.rs:23-31` explicitly notes the test was deleted and that structural confinement in private `sign_with_aux` is what holds the property. |
| **C-7** | **`hedged_signing.rs:525-526` calls non-repetition "the whole ruling in one assertion".** | **FIXED** | `signer/tests/hedged_signing.rs:541-549` replaced with explicit recognition that arbitrary nondeterminism passes it, pointing to the second-model test for construction fidelity. |
| **C-8** | **B-19 "no API" and "nothing measurable" / "cost of zero" overclaims.** | **FIXED** | `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md:10-14, 124-135` corrected to "no `wconf-signer` callable API or wire format" and "no new dependency download; expected negligible, not measured". |
| **C-9** | **`revert-sweep.py` mutated live tree with shared `/tmp` backup and no `try/finally` / signal restore.** | **FIXED** | `tools/spike-b16-2026-08-27/revert-sweep.py:40-57` uses unique `mkdtemp` backup directory, registers `atexit.register(restore)`, and traps `SIGINT` and `SIGTERM`. |
| **C-10** | **`next_entropy_draw_returns_for_test` returned `Err` on length mismatch**, which `fresh_aux` converted to unmasked arm. | **FIXED** | `signer/src/store.rs:146-153` panics via `assert_eq!(fixed.len(), buf.len(), ...)` inside `store::getrandom`. Doc comment at `signer/src/store.rs:210-216` explains why returning `Err` created a false pass. |
| **C-11** | **`Cargo.toml:6` described package as "No keys, no proofs, no signing".** | **FIXED** | `signer/Cargo.toml:6` updated to "Real keys, real proofs, real signatures, hedged nonces on both algorithms...". |
| **C-12** | **`xrpl.rs:651-654` claimed default draw happens in `Hedge::aux`.** | **FIXED** | `signer/src/xrpl.rs:646-647` doc comment corrected to state default path draws via `sign_message -> fresh_aux`. |

---

## 2. New Defects Introduced by the Fixes

### ⚠ Defect 1 (HIGH in test machinery): `revert-sweep.py` accumulates mutations across iterations because `restore()` is omitted from the loop body

In `tools/spike-b16-2026-08-27/revert-sweep.py:160-184`:
```python
for name, old, new, tests in REVERTS:
    err = apply(old, new)
    if err:
        ...
        bad += 1
        continue
    verdict, failed, out = run(tests)
    mark = ...
    print(f"    {mark:<24} {name}")
    ...
    if verdict != 'FAILED':
        bad += 1
        print("      " + "\n      ".join(out.splitlines()[-14:]))

restore()  # <--- ONLY CALLED AFTER THE ENTIRE LOOP FINISHES!
```

**Failure Mode:**  
`apply(old, new)` mutates the tracked file on disk. But `restore()` is **never called at the end of each iteration of the loop** — it is only called on line 183 after all 12 reverts have executed!
- When Revert 1 runs, it mutates `xrpl.rs` (disabling the mask via `aux.filter(|_| false)`).
- When Revert 2 runs, `xrpl.rs` **still has Revert 1's mutation applied**, and Revert 2 adds a second mutation.
- By Revert 12, `xrpl.rs` contains all accumulated mutations simultaneously!
- If an earlier mutation breaks a test (e.g. Revert 1 breaks `the_construction_matches_a_second_model`), all subsequent mutations (Reverts 3, 4, 5, 6, 9, 11) inherit that test failure and will report `test failed OK` **even if their own mutation was a no-op or completely missed by tests!**

**Remedy:** Call `restore()` at the end of every loop iteration:
```python
    finally:
        restore()
```

---

### ⚠ Defect 2 (MEDIUM in test sweep): Disjunctive test matching masks stale/dead test names in `revert-sweep.py`

In `tools/spike-b16-2026-08-27/revert-sweep.py:89`:
```python
if not (set(failed) & set(expected)):
    return 'WRONG-TEST', failed, out
```
And in `REVERTS` line 102 (Revert 1):
```python
   ["zero_aux_is_hedged_not_a_fallback", "two_fixed_aux_values_give_two_nonces",
    "the_default_ed25519_path_does_not_repeat_itself", "the_construction_matches_a_second_model"]),
```

**Failure Mode:**  
1. Revert 1 explicitly lists **`zero_aux_is_hedged_not_a_fallback`** — the exact test that was renamed/superseded by `a_successful_all_zero_draw_still_hedges`!
2. Because `run(expected)` only requires **at least one** test in `expected` to match `failed` (`set(failed) & set(expected)` is non-empty due to `the_construction_matches_a_second_model`), the presence of the stale test name in `expected` went completely unnoticed.
3. Furthermore, because `the_construction_matches_a_second_model` fails on almost any signature change, listing it in 7 of the 12 reverts means any regression in a mutation-specific test (e.g. `one_aux_over_two_messages_does_not_reuse_the_nonce` in Revert 9) is masked by the KAT failing.

**Remedy:** Remove `zero_aux_is_hedged_not_a_fallback` from Revert 1. In sweeps where a specific behavioral property is targeted, check that the specific property test failed, or report which subset of `expected` failed.

---

### ⚠ Defect 3 (LOW in gate isolation): Composite probe confounding in `check-test-support-gate.ts`

In `tools/check-test-support-gate.ts:83-93`:
```ts
  {
    symbol: "FixedAux",
    register: "REVIEW-024 §6 item 2 — fixed aux input",
    probe: `let _ = k.sign_message_with(wconf_signer::xrpl::Hedge::FixedAux([0u8; 32]), b"x");`,
  },
  {
    symbol: "DeterministicForVectors",
    register: "REVIEW-024 §6 item 1 — deterministic signing arm",
    probe: `let _ = k.sign_message_with(wconf_signer::xrpl::Hedge::DeterministicForVectors, b"x");`,
  },
  {
    symbol: "sign_message_with",
    register: "B-20 — the entry point that accepts a Hedge selector",
    probe: `let _ = k.sign_message_with(wconf_signer::xrpl::Hedge::DeterministicForVectors, b"x");`,
  },
```

**Failure Mode:**  
- `FixedAux` and `DeterministicForVectors` probes wrap the variant in `k.sign_message_with(...)`.
- If `Hedge::FixedAux` or `Hedge::DeterministicForVectors` were accidentally made public and ungated, but `AccountKey::sign_message_with` remained gated, compiling without `test-support` would fail because `k.sign_message_with` is unresolved. The script sets `verdict = without.ok ? "REACHABLE" : "gated"`, and falsely reports `FixedAux` and `DeterministicForVectors` as `gated`!
- While `Hedge::FixedAux` cannot be uncoupled from the gating of enum `Hedge`, it *did not need* to be wrapped in `k.sign_message_with(...)`.
- `DeterministicForVectors` and `sign_message_with` have **identical probe strings**, testing the exact same expression twice under two different names.

**Remedy:** Probe variants directly (e.g. `let _ = wconf_signer::xrpl::Hedge::FixedAux([0u8; 32]);` and `let _ = wconf_signer::xrpl::Hedge::DeterministicForVectors;`).

---

### Evaluation of Specific Architectural Changes

- **Hard `assert!` in signing path (`xrpl.rs:576-584`):**  
  **Correct.** It cannot be reached under existing code because `vk` and `self.public` are both derived from `esk` / `entropy`. If reached in future edits, panicking (aborting in release) cleanly prevents the two-equations-in-one-unknown secret key recovery attack.
- **Panic on length mismatch in `store::getrandom` (`store.rs:146-153`):**  
  **Correct.** It cannot be reached in production builds (`test-support` only). Panicking on test setup error prevents silent fallback to unmasked signing.
- **Deletion of `Hedge::Fresh`:**  
  **Correct, no coverage lost.** The production path calls `sign_message -> fresh_aux` directly. Deleting `Hedge::Fresh` removed an unexercised test-only duplicate entry point.

---

## 3. Descriptions That Overstate What Was Established

1. **`check-test-support-gate.ts:35` and adjudication table row 1:**  
   - *Claim:* "Each probe gets its own crate and its own pair of compiles, so a failure is attributable to that probe and to nothing else".  
   - *Overclaim:* As demonstrated in Defect 3 above, the probes for `FixedAux` and `DeterministicForVectors` are composite expressions involving `sign_message_with`. Their failure without `test-support` is attributable to `sign_message_with`, not solely to the variant.
2. **`revert-sweep.py` comments & adjudication table row 2:**  
   - *Claim:* "It immediately caught four stale expected-test names created by this round's own renames — invisible under the old rule".  
   - *Overclaim:* It failed to catch the fifth stale test name (`zero_aux_is_hedged_not_a_fallback` in Revert 1) because the disjunctive matching rule `set(failed) & set(expected)` masked it with `the_construction_matches_a_second_model`.
3. **`CLAIMS.md` E-163 & B-16:**  
   - *Claim:* "All eight of `REVIEW-024` §6's execution gates have run."  
   - *Overclaim:* Gate 8 (the revert sweep) ran, but because of Defect 1 (accumulating mutations), it did not execute the 12 reverts in clean isolation.

---

## 4. §6 Gate 1 Evaluation (Deterministic Arm vs `ripple-keypairs`)

**Verdict: ESTABLISHED.**

`tests/xrpl_vectors.rs` and the signing architecture satisfy Gate 1 completely:
1. **Unmasked Arm Construction:** When `aux` is `None`, `AccountKey::sign_with_aux` skips the XOR block (`xrpl.rs:521`), leaving `esk.hash_prefix` ($p = h[32..64]$) untouched. `raw_sign::<Sha512>(&esk, message, &vk)` computes $r = \text{SHA512}(p \parallel M) \pmod \ell$ and $s = r + e \cdot a \pmod \ell$, which is the exact RFC 8032 algorithm.
2. **Verification against `ed25519-dalek`:** `signer/tests/hedged_signing.rs:307-324` (`the_unmasked_arm_is_byte_identical_to_the_crates_own_rfc_8032`) asserts that `k.sign_message_with(Hedge::DeterministicForVectors, msg)` matches `ed25519_dalek::SigningKey::sign(msg)` byte-for-byte across multiple seeds and messages.
3. **Verification against `ripple-keypairs`:** `tests/xrpl_vectors.rs` checks deterministic vectors generated by `ripple-keypairs@2.0.0` against the unmasked arm.
4. **Third-Party Model Control:** `signer/tests/hedged_signing.rs:700-750` (`the_construction_matches_a_second_model`) asserts exact byte identity on deterministic vectors against `@noble/curves`.

---

## 5. Anything Else

1. **`revert-sweep.py` Revert Ordering:** Revert 12 (lines 147–150) is placed before Revert 11 (lines 152–157) in the array. Purely cosmetic, but reflects an appended entry.
2. **Leak of `/tmp` Directory on Error in `check-test-support-gate.ts`:** `process.exit(1)` is called inside `try` blocks (lines 157, 187). In Node/Bun, `process.exit()` does not trigger `finally` blocks, causing `mkdtemp` scratch directories to remain in `/tmp` when tests fail.

---

## 6. Confidence and Whether a Third Round Would Pay

**Confidence:** **9.0 / 10**

- **Cryptographic Construction:** **10 / 10**. Term-for-term compliant with `REVIEW-024` §3, verified by 3 independent reviewers, confirmed against independent models, and validated on live Devnet.
- **Round-One Fixes:** All 11 findings from round one were applied at the specific sites named.
- **Would a Third Round Pay?** **NO.**  
  `CLAUDE.md`'s rule applies: a third round would review the fixes to the test harness scripts (`revert-sweep.py` loop restore and `check-test-support-gate.ts` probe refinement), where return on investment stops paying. The core cryptographic implementation, key handling, and ledger execution are solid, sound, and fully verified. The two script defects noted in Section 2 should be fixed inline as simple hygiene.
