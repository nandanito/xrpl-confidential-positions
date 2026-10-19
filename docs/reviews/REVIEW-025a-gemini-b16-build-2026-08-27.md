# REVIEW-025 — Adversarial Review of the B-16 Build (Round One)

**Reviewing Commit:** `200aae636d73e3112f5e7415e6dbddd9de1a2bb5`  
**Parent:** `17f9c0b`  
**Scope:** Review of implementation against `REVIEW-024` ruling, §6 gates, §7 conditions, test efficacy, overclaims, B-19 decision, and edge findings.

---

## 1. Verdict on the Construction

**YES.** The implementation implements the construction specified in `REVIEW-024` §3 exactly.

- **Private key expansion:** `h = Sha512(sk)` expanded into `esk: ExpandedSecretKey` via `ExpandedSecretKey::from_slice(&h)`, which leaves scalar $a = \text{clamp}(h[0..32])$ untouched and standard nonce prefix $p = h[32..64]$ in `esk.hash_prefix` (`signer/src/xrpl.rs:512–515`).
- **Domain separator tag:** `ED25519_NONCE_HEDGE_DST` is exactly 29 bytes: `b"WCONF/ed25519-nonce-hedge/v1\0"` with the trailing `0x00` (`signer/src/xrpl.rs:556`).
- **Mask derivation & combiner:** When `aux` is present, `mask = Sha512(DST || aux)`. The mask is applied via `esk.hash_prefix.iter_mut().zip(mask.iter())` XORing `mask[0..32]` strictly over `esk.hash_prefix` ($p$), leaving `esk.scalar` ($a$) unmodified (`signer/src/xrpl.rs:517–529`).
- **Unmasked arm:** When `aux` is `None`, `esk.hash_prefix` is unchanged ($q = p$), producing byte-identical RFC 8032 (`signer/src/xrpl.rs:517`).
- **Verifying key & signing call:** $A$ is derived internally at `vk = VerifyingKey::from(&esk)` and passed with pure `message` to `ed25519_dalek::hazmat::raw_sign::<Sha512>(&esk, message, &vk)` (`signer/src/xrpl.rs:539–545`).

---

## 2. Execution Gates (§6) and Conditions (§7)

### §6 Execution Gates

1. **Gate 1 (Deterministic arm byte-identical to RFC 8032 / `ripple-keypairs`):** **ESTABLISHED.**  
   Pinned against `ed25519-dalek`'s non-hazmat `SigningKey::sign` across multiple keys (`signer/tests/hedged_signing.rs:307–324`), tested against `@noble/curves` in the KAT (`signer/tests/hedged_signing.rs:538–592`), and tested in `tests/xrpl_vectors.rs`.
2. **Gate 2 (Test-only fixed-`aux` input under `test-support` driving distinct $R$ and verifying):** **ESTABLISHED.**  
   `Hedge::FixedAux([u8; 32])` is `#[cfg(feature = "test-support")]` (`signer/src/xrpl.rs:635`) and verified to produce distinct $R$ values that strictly verify (`signer/tests/hedged_signing.rs:334–348`).
3. **Gate 3 (`Some([0u8; 32])` differs from no-mask arm / stays hedged):** **ESTABLISHED.**  
   Verified via `Hedge::FixedAux([0u8; 32])` (`signer/tests/hedged_signing.rs:378–392`) and at the randomness draw layer via `store::next_entropy_draw_returns_for_test` (`signer/tests/hedged_signing.rs:414–434`, `439–451`).
4. **Gate 4 (Reported entropy failure degrades to deterministic vector):** **ESTABLISHED.**  
   Verified via `store::fail_next_entropy_draw_for_test` asserting byte equality with `DeterministicForVectors` without panicking or refusing (`signer/tests/hedged_signing.rs:457–472`).
5. **Gate 5 (Message separation under stuck RNG / same `aux` over different messages gives distinct $R$):** **ESTABLISHED.**  
   Verified with identical fixed `aux` across distinct messages and empty message, asserting $R_1 \neq R_2$ and reproducibility (`signer/tests/hedged_signing.rs:488–510`).
6. **Gate 6 (Invariants: canonical 64 bytes, identical pubkey, strict verifier, internal VK derivation):** **ESTABLISHED.**  
   Verified via `assert_canonical` enforcing `verify_strict` (`signer/tests/hedged_signing.rs:279–288`), multi-key invariance checks (`signer/tests/hedged_signing.rs:530–559`), and internal derivation in `sign_with_aux` (`signer/src/xrpl.rs:539`).
7. **Gate 7 (Devnet execution: default path, `sEd…` seed, `SigningPubKey` decoded from blob confirmed `0xED`, validated ledger):** **PARTIAL.**  
   The execution script `tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts` is fully implemented and validates the decoded blob algorithm, verifies $r$ difference from RFC 8032, and waits for ledger validation. However, the static diff/commit packet does not include a committed execution receipt/log of the live Devnet run on commit `200aae63`.
8. **Gate 8 (Revert sweep: revert each fix and watch test fail):** **ESTABLISHED.**  
   `tools/spike-b16-2026-08-27/revert-sweep.py` exercises 11 distinct code mutations and verifies that all compile and fail expected tests.

---

### §7 Conditions on the Build

1. **Condition 1 (One private helper taking `Option<[u8; 32]>` called by all entry points):** **ESTABLISHED.**  
   `AccountKey::sign_with_aux` (`signer/src/xrpl.rs:477`) is private, takes `Option<[u8; 32]>`, and is the sole signing entry point called by both `sign_message` and `sign_message_with` for both secp256k1 and ed25519.
2. **Condition 2 (Verifying key derived inside helper, never accepted as parameter):** **ESTABLISHED.**  
   `vk` is derived inside `sign_with_aux` directly from `esk` (`signer/src/xrpl.rs:539`). No `VerifyingKey` parameter exists on `sign_with_aux`, `sign_message`, or `sign_message_with`.
3. **Condition 3 (Deterministic and fixed-`aux` entry points are `test-support` only):** **ESTABLISHED.**  
   `sign_message_with` (`signer/src/xrpl.rs:454`), `Hedge` (`signer/src/xrpl.rs:600`), `NEXT_ENTROPY` (`signer/src/store.rs:185`), and `next_entropy_draw_returns_for_test` (`signer/src/store.rs:208`) are `#[cfg(feature = "test-support")]`. Enforced by `tools/check-test-support-gate.ts`.
4. **Condition 4 (Two-round adversarial rotation):** **PARTIAL.**  
   Round One review is in progress in this packet; Round Two (review of Round One fixes) remains required before final merge.

---

## 3. Tests That Do Not Establish What They Are Named For

1. **`the_verifying_key_is_the_published_one_and_no_caller_can_choose_it`** (`signer/tests/hedged_signing.rs:570–581`):  
   - **Issue:** The test establishes that generated signatures verify against the verifying key derived from seed across 16 keys.  
   - **Why it fails its name:** A black-box unit test cannot establish the negative claim *"and no caller can choose it"*. That property is structural (enforced by the signature of `AccountKey::sign_with_aux`). The test’s own doc comment explicitly concedes this: *"REVIEW-024 §7 item 2 is STRUCTURAL and this test cannot see it... A black-box test cannot distinguish 'derived internally' from 'supplied correctly by every caller so far'"*. The test name retains an overclaim that was removed from `one_implementation_not_two`.  
   - **Remedy:** Rename to `signatures_verify_strictly_under_seed_derived_public_key`.

2. **`tools/check-test-support-gate.ts` sub-check for `FixedAux`:**  
   - **Issue:** The probe line `let _ = k.sign_message_with(wconf_signer::xrpl::Hedge::FixedAux([0u8; 32]), b"x");` causes rustc to error on `Hedge` or `sign_message_with` when `test-support` is absent.  
   - **Why it fails its purpose:** `without.out.includes("FixedAux")` passes because rustc echoes the source line containing `FixedAux` in its compiler error snippet for `Hedge`, not because rustc resolved `Hedge` and specifically rejected `FixedAux`. If `FixedAux` were an ungated variant on an un-gated enum, this check would report `gated` as a false pass.  
   - **Remedy:** Place each gated probe expression in its own isolated test item or parse compiler error diagnostics directly.

---

## 4. Overclaims

1. **Premature assertion of register closure in source headers:**  
   - In `signer/src/xrpl.rs:46, 51`: *"# ⚠ Ed25519 is hedged too — B-16, ruled 2026-08-27 and BUILT... Both algorithms hedge now."*  
   - In `signer/tests/hedged_signing.rs:26, 31`: *"# ⚠ B-14 is CLOSED — both halves, as of 2026-08-27... B-16 was ruled... and built in the session that read this comment."*  
   - **Overclaim:** `REVIEW-024` §6 explicitly rules: *"Until every item below has run, the accurate sentence is 'hedged ed25519 has been ruled for adoption', and not 'the signer hedges ed25519'."* Claiming that B-14/B-16 are closed and built before Round Two adversarial review and live ledger execution evidence is committed violates this rule (`CLAIMS.md` P-5).

2. **Makefile `check-test-support` guarantee scope:**  
   - In `Makefile:74–76`: *"make check-test-support is what establishes the exclusion, by compiling a throwaway crate that names every gated symbol..."*  
   - **Overclaim:** The script checks a static list of 6 hardcoded symbols in `GATED`. It does not inspect the crate's entire public API surface for unlisted test-only entry points.

---

## 5. B-19 Evaluation

**ACCEPT B-19 (`features = ["std", "hazmat", "zeroize"]`).**

### Reasons:
1. **Restores crate default:** `ed25519-dalek`'s default features include `zeroize`. Disabling it via `default-features = false` was an unintentional copy-paste artifact from the `k256` dependency line where zeroization is mandatory.
2. **Validates documentation contract:** Restores truth to `ExpandedSecretKey`'s documented contract that instances are zeroized on drop.
3. **Zero marginal dependency cost:** `zeroize 1.x` is already resolved in `Cargo.lock` by `k256`/`elliptic-curve`.
4. **Compile-time enforcement:** `ed25519_secret_material_is_zeroized_on_drop` (`signer/tests/hedged_signing.rs:608–612`) verifies the `ZeroizeOnDrop` trait bound at compile time.
5. **Accurate security boundaries:** The decision record explicitly disclaims protection against memory scrapers during active computation and files stack local wiping as B-21.

---

## 6. Findings Outside the Question

1. **Stack local secret temporaries in `sign_with_aux` (B-21 residue):**  
   In `signer/src/xrpl.rs:512–526`, `h` (`Output<Sha512>`), `k.to_bytes()`, and `mask` exist as stack temporaries that are dropped without zeroization. While `ExpandedSecretKey` zeroizes on drop under B-19, `Output<Sha512>` and raw byte arrays do not implement `ZeroizeOnDrop`. This confirms that tracking B-21 separately remains necessary.
2. **`debug_assert_eq!` is inactive in release builds:**  
   In `signer/src/xrpl.rs:540`:  
   `debug_assert_eq!(vk.as_bytes()[..], self.public[1..], "verifying key drift");`  
   This assert validates that the derived verifying key matches `self.public`. While the derivation $A = a \cdot B$ inside `sign_with_aux` is unconditional and structurally satisfies §7 item 2, reviewers should note this consistency check is compiled away in `--release`.
3. **`VersionPrefix` error formatting fix:**  
   The introduction of `XrplError::VersionPrefix` (`signer/src/xrpl.rs:124, 138–146, 727–732`) successfully resolves Gemini's `REVIEW-024` finding regarding 3-byte prefix mismatches producing misleading error messages.

---

## 7. Confidence and What Would Move It

**Confidence: 9.5 / 10.**

- **What would increase it to 10.0:** A committed transcript/receipt of a live Devnet transaction on commit `200aae63` confirming that `SigningPubKey` begins `0xED`, `TxnSignature` differs from deterministic RFC 8032, and the transaction is confirmed on a validated ledger (closing Gate 7).
- **What would decrease it:** Any divergence between `raw_sign::<Sha512>`'s scalar reduction and RFC 8032 §5.1.6 on edge-case group order reductions.
