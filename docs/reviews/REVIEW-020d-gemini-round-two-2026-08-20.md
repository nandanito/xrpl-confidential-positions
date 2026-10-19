# REVIEW-020d — Gemini leg, round two (reviewing the fixes)

- **Date:** 2026-08-20
- **Subject:** commit `6e66e05` against `0e6b625` — the round-one fixes and the sentences written about them
- **Run:** `agy --effort high`, no tools, packet-only
- **Verbatim below.** Dispositions are in `REVIEW-020f`.

---

# REVIEW-020 ROUND TWO — Adjudication of Fixes (Commit `6e66e05`)

This review examines the round-one fixes across `signer/src/confirm.rs`, `signer/src/keygen.rs`, `signer/src/main.rs`, `signer/src/onboarding.rs`, and their accompanying test suites (`tests/falsifier.rs`, `tests/keygen_interop.rs`, `tests/onboarding.rs`), along with the disposition claims in `REVIEW-020c`.

---

## 1. FINDINGS

### Finding 1: LOW — Misstatement of `try_from_parts` validation semantics in docstring and test commentary
* **File and Symbol:** [`signer/src/keygen.rs::DerivedKey::into_keypair`](file://$HOME/signer/src/keygen.rs#L183-L200), [`signer/tests/keygen_interop.rs::the_derived_secret_survives_its_source_being_zeroized`](file://$HOME/signer/tests/keygen_interop.rs#L277-L300), and `REVIEW-020c` §3 (R-1)
* **What is wrong:**
  The docstring added to `into_keypair`, the test commentary in `keygen_interop.rs`, and the disposition note in `REVIEW-020c` state:
  > *"if the handed-out value were an alias rather than a copy the keypair would leave that function holding thirty-two zero bytes — and `try_from_parts` would not save it, because it validates whatever it is given."*

  This sentence misstates what `try_from_parts` does. `ElGamalKeypair::try_from_parts(sk, pk)` recomputes `sk · G` and asserts `sk · G == pk`. If `try_from_parts` were handed thirty-two zero bytes while `pk` is the non-zero derived public key, `0 · G` would not equal `pk`, and `try_from_parts` would reject it with an `Err` (causing `.expect(...)` in `into_keypair` to panic).

  The actual reason `try_from_parts` cannot protect against zeroization in an aliasing bug is **temporal**: `try_from_parts` runs *synchronously before* `into_keypair` returns—it validates the secret while `self` is still alive. If `self.sk` were an aliased buffer, `self`'s destructor would wipe that memory *after* `try_from_parts` has already validated and returned. Saying `try_from_parts` "validates whatever it is given" inaccurately portrays it as an unvalidating pass-through constructor.
* **Concrete failure scenario:**
  A future maintainer reading this comment may believe `try_from_parts` does not perform public key derivation validation or scalar checks, leading them to either add redundant pre-validation checks or avoid relying on `try_from_parts`'s invariant guarantees elsewhere.
* **Recommended change:**
  Clarify the docstring and test comments:
  ```rust
  /// ...if the value handed out were an alias, the keypair would be zeroized when
  /// `self` drops upon return — after `try_from_parts` has already validated it.
  ```

---

### Finding 2: LOW — Category error and protocol conflation in rotation banner
* **File and Symbol:** [`signer/src/main.rs::main`](file://$HOME/signer/src/main.rs#L186-L195)
* **What is wrong:**
  In the `KeySource::DerivedFromMasterSeed` banner in `main.rs`, the fix updated the warning text to:
  ```rust
  eprintln!("    permanently. Neither key can be ROTATED: XLS-0096 has no rotation");
  eprintln!("    and no recovery, at any level.");
  ```
  "Neither key" refers to (1) the XRPL account signing key / master key and (2) the XLS-0096 ElGamal encryption key.
  
  Attributing the inability to rotate both keys to *"XLS-0096 has no rotation and no recovery, at any level"* is a category error:
  1. XLS-0096 defines and governs **only** the Confidential MPT encryption key (`registers_encryption_key`), not XRPL account keys.
  2. On XRPL, signing keys **can** be rotated via `SetRegularKey` / `DisableMaster` (which is the very mechanism triggering condition 2 / `RETIRED_MASTER_KEY_WARNING` in this repository).
  3. The master seed's permanence is a core XRPL protocol invariant, whereas the encryption key's non-rotatability is an XLS-0096 rule (`tecDUPLICATE`).
* **Concrete failure scenario:**
  An operator or auditor reading the startup banner will be misled into believing XLS-0096 somehow governs account signing keys or forbids XRPL regular key rotation, contradicting the ledger security assessment displayed in onboarding.
* **Recommended change:**
  Attribute the constraints to their respective layers:
  ```rust
  eprintln!("    permanently. The ElGamal key cannot be ROTATED: XLS-0096 has no rotation");
  eprintln!("    and no recovery, at any level. The master seed is fixed to this account.");
  ```

---

## 2. TEST-BY-TEST AUDIT: "What would this test do if the property it names were false?"

Each test introduced or modified in commit `6e66e05` was evaluated against its failure conditions:

### 1. `signer/tests/falsifier.rs::a_registering_convert_says_on_the_confirmation_that_it_registers_a_key`
* **Test operation:** Asserts presence of `"never be changed or rotated"`, `"tecDUPLICATE"`, `"if the matching secret is ever unreachable"`, and `"no second chance"`, and explicitly asserts `!flat.contains("never be recovered")`.
* **What would this test do if the property it names were false?**
  - If a regression reintroduced `"never be recovered"` into `confirm.rs`, the negative assertion `assert!(!flat.contains("never be recovered"))` would fail immediately with a descriptive message.
  - If the new wording softening the recovery claim (`"if the matching secret is ever unreachable"`) were omitted or altered, the loop assertion would fail.
* **Verdict:** True pass.

---

### 2. `signer/tests/keygen_interop.rs::the_derived_secret_survives_its_source_being_zeroized`
* **Test operation:** Derives a key, consumes it via `into_keypair()`, checks `kp.secret() != [0u8; 32]`, checks `kp.public() == &pk`, and performs an end-to-end `encrypt` and `decrypt` cycle of value `31337` with range `[0, 40_000]`.
* **What would this test do if the property it names were false?**
  - If `into_keypair` handed out an aliased slice that was zeroed upon `self`'s drop, `kp.secret()` would hold zeros. `assert_ne!(kp.secret(), &[0u8; 32])` and `prover::decrypt(...)` would both fail.
  - If the secret or public key were corrupted during the copy, `prover::decrypt` would fail to recover `31337`.
* **Verdict:** True pass.

---

### 3. `signer/tests/keygen_interop.rs::the_derived_key_decrypts_this_accounts_amounts_and_only_this_accounts`
* **Test operation:** Derives two distinct keypairs (`mine`, `theirs`), encrypts `amount = 4321` under both public keys with identical ephemeral scalar `r`, verifies `mine.secret()` decrypts `to_me`, verifies `mine.secret()` returns `Err` for `to_them`, and verifies `theirs.secret()` decrypts `to_them`.
* **What would this test do if the property it names were false?**
  - If `sk_A` could decrypt a counterparty's ciphertext under the same blinding `r`, `prover::decrypt(&to_them, mine.secret(), 0, 9_000).is_err()` would fail.
  - If decryption under one's own key failed, `prover::decrypt(&to_me, mine.secret(), ...)` would fail.
  - If the decryptor were broken and returned `Err` unconditionally, the third assertion (`theirs.secret()` decrypting `to_them`) would fail as a control.
* **Verdict:** True pass.

---

### 4. `signer/tests/onboarding.rs::every_required_disclosure_is_shown_before_the_seed_is_asked_for`
* **Test operation:** Drives onboarding scripts for both `"clean"` and `"retired master"` accounts. For each case, takes the transcript slice strictly prior to `ask_secret` (`shown_before_the_seed()`) and asserts every disclosure in `assessment.required_disclosures()` is present. Asserts `s.secret_asked_at.len() == 1`, controls against vacuity by asserting `!before.contains("pk_A")`, and controls against duplicate test cases by asserting `!clean().required_disclosures().contains(&RETIRED_MASTER_KEY_WARNING)`.
* **What would this test do if the property it names were false?**
  - If `RETIRED_MASTER_KEY_WARNING` was moved after the seed prompt or omitted for a retired master account, `before.contains(d)` would fail for the `"retired master"` case.
  - If `shown_before_the_seed()` erroneously captured the full transcript, `!before.contains("pk_A")` would fail.
  - If `clean` and `retired master` produced identical disclosure sets, the final control assertion would fail.
* **Verdict:** True pass.

---

### 5. `signer/tests/onboarding.rs::the_standalone_path_shows_its_secret_once_and_names_the_cost`
* **Test operation:** Runs standalone onboarding, formats `sk_hex`, and asserts `shown.matches(&sk_hex).count() == 1`. Validates that the public key, warning banner, and keypair mathematical correspondence (`try_from_parts`) all hold.
* **What would this test do if the property it names were false?**
  - If `sk_hex` were printed twice (as in round one) or omitted from the profile snippet, `count() == 1` would fail.
  - If the standalone keypair generator returned a mismatched secret and public key, `try_from_parts` would fail.
* **Verdict:** True pass.

---

## 3. WHAT WAS CHECKED AND FOUND CORRECT

1. **U-1 Fix (`confirm.rs` & `falsifier.rs`):**
   The confirmation text in `render` cleanly removes `"never be recovered"` and replaces it with a conditional statement regarding unreachability (`"if the matching secret is ever unreachable, so is every one of those amounts"`). This preserves `CLAIMS.md` P-10 (XLS-0096 protocol does not support recovery) while not misleading holders who derive keys from an existing backup.

2. **U-2 Fix (`onboarding.rs` & `tests/onboarding.rs`):**
   In `standalone(...)`, the standalone secret `sk` is formatted exactly once inside the profile fragment. Positional placeholders in `io.tell(&format!(...))` match the arguments (4 positional arguments matching 4 format specifiers).

3. **U-3 Fix (`tests/onboarding.rs`):**
   `every_required_disclosure_is_shown_before_the_seed_is_asked_for` properly differentiates clean accounts from accounts with retired master keys. The test commentary transparently documents the dual-route disclosure path without overclaiming single-route pinning.

4. **No abort path in key derivation:**
   The total reduction `sk = (X mod (n - 1)) + 1` remains untouched and total. No abort or rejection paths were introduced.

5. **Memory zeroization safety:**
   `DerivedKey::into_keypair` relies on `[u8; 32]` copy semantics to safely transfer the secret out of `Zeroizing<[u8; 32]>` before `self` drops. The secret is validated via `try_from_parts` and remains fully functional in the destination `ElGamalKeypair`.
