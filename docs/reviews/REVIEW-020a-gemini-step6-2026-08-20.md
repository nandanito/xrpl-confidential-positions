# REVIEW-020a — Gemini leg, architecture §6 step 6 (round one)

- **Date:** 2026-08-20
- **Subject:** commit `0e6b625`, real ElGamal key generation and onboarding
- **Run:** `agy --effort high`, no tools, packet-only
- **Verbatim below.** Dispositions are in `REVIEW-020c`.

---

# REVIEW-020: Adversarial Review — Architecture §6 Step 6

This review evaluates commit `0e6b625` implementing real ElGamal key generation and onboarding under the specifications of [`REVIEW-012-RULING-keygen-2026-08-18.md`](file:///docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md).

---

## Findings

### 1. Contradictory and inaccurate recovery claim on the transaction confirmation screen
- **Severity:** MEDIUM
- **File and Symbol:** [`signer/src/confirm.rs`](file:///signer/src/confirm.rs#L50-L62), `render()` (also reflected in [`signer/src/main.rs`](file:///signer/src/main.rs#L188))
- **What is wrong:** 
  When rendering a transaction that registers an encryption key (`registers_encryption_key.is_some()`), [`confirm.rs`](file:///signer/src/confirm.rs#L55-L59) outputs:
  ```
  ⚠ THIS TRANSACTION REGISTERS YOUR ENCRYPTION KEY.
    It can never be changed, never be rotated and never
    be recovered.
  ```
  Similarly, the daemon startup banner in [`main.rs`](file:///signer/src/main.rs#L188) states for a derived key:
  ```
  "...permanently, and neither key can be rotated or recovered."
  ```
  This claim directly contradicts ADR-0001 §(e), the ruling's §1, §7 Condition 1, and the onboarding flow itself ([`onboarding.rs`](file:///signer/src/onboarding.rs#L77-L83)). The entire rationale for deriving the ElGamal key from the XRPL master seed is that **the key is deterministically recoverable from a backup the holder already keeps**. 
  
  What is unrecoverable is:
  1. A standalone key if lost without its separate backup.
  2. Account confidentiality if an encryption key is registered whose secret nobody holds (or if the master seed is permanently lost).
  3. The on-ledger registration slot itself (a second registration is `tecDUPLICATE`).
- **Concrete failure scenario:** 
  An operator who chose `derived-from-master-seed` during onboarding explicitly because they were informed: *"the ElGamal key is recoverable from a backup you already keep"* proceeds to sign their first `ConfidentialMPTConvert`. At the critical approval step, the confirmation warning tells them the key can *"never be recovered"*. Believing they made a mistake, that the key is not derived/recoverable, or that their seed backup is useless for confidential recovery, the operator aborts the transaction.
- **Remedy:** 
  Clarify the phrasing on the confirmation screen and banner to distinguish between key recoverability (which holds for derived keys) and protocol irrevocability/non-rotatability:
  ```rust
  s.push_str("                 ⚠ THIS TRANSACTION REGISTERS YOUR ENCRYPTION KEY.\n");
  s.push_str("                   It is permanently bound to this account on-ledger and cannot\n");
  s.push_str("                   be changed or rotated. If you lose access to the underlying\n");
  s.push_str("                   secret, confidential balances encrypted to it cannot be\n");
  s.push_str("                   recovered. A second registration attempt is refused with\n");
  s.push_str("                   tecDUPLICATE. There is no second chance.\n");
  ```

---

### 2. Incomplete test coverage for `RETIRED_MASTER_KEY_WARNING` ordering in onboarding
- **Severity:** LOW
- **File and Symbol:** [`signer/tests/onboarding.rs`](file:///signer/tests/onboarding.rs#L169-L194), `every_required_disclosure_is_shown_before_the_seed_is_asked_for`
- **What is wrong:** 
  The ordering test `every_required_disclosure_is_shown_before_the_seed_is_asked_for` runs against `clean()`, where `master_seed_is_retired()` is false. Consequently, `a.required_disclosures()` in that test only contains the baseline 5 disclosures and excludes `RETIRED_MASTER_KEY_WARNING`. 
  
  While `deriving_on_a_retired_master_account_costs_a_second_acknowledgement` asserts that `retired_override_phrase` appears before the seed prompt, no test asserts that `RETIRED_MASTER_KEY_WARNING` itself appears in the `shown_before_the_seed()` transcript slice when `master_seed_is_retired()` is true.
- **Concrete failure scenario:** 
  If a future refactoring inadvertently moved the retired master warning printing inside or after the secret prompt during the retired override flow, `every_required_disclosure_is_shown_before_the_seed_is_asked_for` would still pass because it only tests a clean account.
- **Remedy:** 
  Add an explicit test case or parameterize `every_required_disclosure_is_shown_before_the_seed_is_asked_for` to test both a clean account and an account with `master_seed_is_retired() == true`, asserting `s.shown_before_the_seed().contains(RETIRED_MASTER_KEY_WARNING)`.

---

## Verification and Areas Found Correct

1. **Cryptographic Construction & Ruling §2 Adherence ([`keygen.rs`](file:///signer/src/keygen.rs), [`scalar.rs`](file:///signer/src/scalar.rs)):**
   - **Preimage framing and ordering:** `LABEL ‖ u32be(len(seed_type)) ‖ seed_type ‖ u32be(16) ‖ seed_bytes ‖ u32be(20) ‖ account_id` is byte-exact.
   - **Label and Domain Separation:** Constants (`LABEL`, `SALT`, `EXPAND`, `ROLE`) exactly match the byte lengths and values specified in §2.
   - **Total Reduction:** `(X mod (n - 1)) + 1` is implemented without branching in [`reduce_wide_total`](file:///signer/src/scalar.rs#L231-L235). Modulus `N_MINUS_1` matches `n - 1` with the low nibble ending in `0x...4140`. The output scalar is guaranteed to be in `[1, n - 1]` with no abort paths.
   - **SEC1 Point Compression:** Public key derivation properly computes `sk · G` and compresses to 33 bytes.

2. **Input Refusals & Pre-hashing Checks (§2.1):**
   - [`decode_family_seed`](file:///signer/src/xrpl.rs#L564-L574) rejects any seed entropy length $\ne 16$ bytes and restricts types strictly to `"secp256k1"` and `"ed25519"`.
   - The expected `AccountID` binding in [`derive_raw`](file:///signer/src/keygen.rs#L200-L224) rejects mismatching seeds (preventing regular-key seeds or signer-list seeds from silently deriving keys for unassociated accounts).

3. **Onboarding Enforcement and Sequencing ([`onboarding.rs`](file:///signer/src/onboarding.rs)):**
   - Ledger state evaluation properly identifies `lsfDisableMaster`, regular keys, and signer lists individually via [`Assessment::of`](file:///signer/src/onboarding.rs#L210-L217).
   - Recommended source flips to `KeySource::Standalone` whenever any retired master condition is met.
   - Disclosures are emitted prior to prompting for choices or seeds.
   - Verbatim typed phrases are required for derived enrollment, standalone generation, and overriding a retired master warning. A refusal or mismatch aborts before any secret is read.
   - Standalone key generation displays the secret exactly once and warns of the backup requirement.

4. **Profile Management & Security Boundaries ([`holder.rs`](file:///signer/src/holder.rs), [`main.rs`](file:///signer/src/main.rs), [`prover.rs`](file:///signer/src/prover.rs)):**
   - Profiles declaring `derived-from-master-seed` strictly reject the presence of `elgamal_sk` or `elgamal_pk`.
   - Profiles declaring `standalone` strictly validate that `elgamal_pk == elgamal_sk · G` via [`ElGamalKeypair::try_from_parts`](file:///signer/src/prover.rs#L127-L143), preventing unrecoverable blackhole registrations.
   - `"account_seed": "prompt"` allows ephemeral terminal entry without persisting secrets to non-volatile storage.
   - Secret buffers (`Zeroizing<N>` and `ElGamalKeypair`) implement volatile zeroization on drop.

5. **Test Vectors and Interoperability ([`tests/keygen_kat.rs`](file:///signer/tests/keygen_kat.rs), [`tests/keygen_interop.rs`](file:///signer/tests/keygen_interop.rs)):**
   - Vectors 1 and 2 from §6 are reproduced exactly against intermediate `PRK`, `OKM64`, `sk_A`, and `pk_A` values.
   - Parameterized mutation tests confirm that every component of the framing is load-bearing.
   - `a_constant_sk_of_one_passes_every_upstream_check` successfully establishes the control that upstream interop tests are necessary but not sufficient, demonstrating why KAT vectors are mandatory.
