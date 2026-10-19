# REVIEW-020b — Codex leg, architecture §6 step 6 (round one)

- **Date:** 2026-08-20
- **Subject:** commit `0e6b625`, real ElGamal key generation and onboarding
- **Run:** `codex exec --sandbox read-only --skip-git-repo-check`
- **Verbatim below.** Dispositions are in `REVIEW-020c`.

---

**Findings**

**HIGH — `signer/src/keygen.rs`, `DerivedKey::into_keypair`**

The implementation tries to move the raw array out of `self.sk.0`, but `Zeroizing<N>` implements `Drop`. Rust does not allow moving a field out of a type that implements `Drop`. This is not a runtime cryptographic defect; it is a build-breaking defect.

Concrete scenario: any build that compiles `keygen.rs` reaches:

```rust
crate::prover::ElGamalKeypair::try_from_parts(self.sk.0, self.pk)
```

and fails to compile with the usual “cannot move out of type … which implements the `Drop` trait” error. That means the new derived-key path cannot ship.

What I would change: add an explicit consuming method on `Zeroizing` that copies the bytes out before drop, or make `into_keypair` copy:

```rust
let sk = self.sk.0;
```

will still hit the same move rule if taken directly from the field; use a method like `fn bytes(&self) -> [u8; N] { self.0 }`, then allow `self` to drop and zeroize its original storage.

**MEDIUM — `signer/src/onboarding.rs`, `PERMANENT_DECRYPTION_CREDENTIAL`**

The disclosure overstates what the master seed decrypts: it says the seed decrypts “every confidential amount this account ever holds, sends or receives.” The ruling’s accepted cost is decryption of the holder’s confidential history insofar as amounts are encrypted to the holder’s registered key. In a confidential send, the sender’s and destination’s amount ciphertexts are under their own keys; a holder’s `sk_A` does not decrypt counterparties’ ciphertexts merely because the account sent to them or received from them.

Concrete scenario: Alice derives her key from her master seed and sends 10 to Bob. Alice’s compromised master seed lets the attacker decrypt Alice’s balance/update ciphertexts encrypted to Alice’s key, but not Bob’s recipient ciphertext encrypted to Bob’s key. The onboarding text tells Alice a strictly broader thing than the protocol does, which can mislead later threat analysis and operator decisions.

What I would change: narrow the sentence to “every confidential balance/history ciphertext encrypted to this account’s HolderEncryptionKey” or equivalent. Keep the retroactive/no-rotation warning, but do not imply it decrypts other participants’ ciphertexts.

**LOW — `signer/src/onboarding.rs`, `standalone` / test `the_standalone_path_shows_its_secret_once_and_names_the_cost`**

The UI says “THIS IS THE ONLY TIME THE SECRET IS SHOWN,” but the implementation prints the standalone secret twice in the same output: once as `sk_A` and once again in the profile fragment. The test even encodes this contradiction by expecting two occurrences while its name says “once.”

Concrete scenario: an operator is screen-recording or copying terminal output into an issue. They reasonably interpret “shown once” as one exposure point, but the same secret appears twice in the transcript, increasing the chance it is copied or retained. This is not catastrophic because the standalone path intentionally displays the secret for backup, but the wording is false.

What I would change: either print it once and refer to the same value in the profile fragment without repeating it, or change the text to “this is the only onboarding session in which the secret is shown.”

**What Checked Correct**

`keygen.rs` matches the ruling’s §2 structure: labels, framed lengths, seed type binding, seed bytes, AccountID binding, HKDF-Extract/Expand order, and total reduction as `(X mod (n-1)) + 1`. I did not find a `mod n`, retry, or zero-abort defect.

The AccountID mismatch refusal is present in `derive_from_master_seed`, and the onboarding path passes the ledger/account-derived expected AccountID before deriving.

The onboarding flow shows disclosures before asking for the seed, requires typed acknowledgement for the derived path, and adds a second acknowledgement when overriding the standalone recommendation for retired-master accounts. It warns/offers rather than refusing, matching the ruling.

The holder profile behavior is conservative: absent `elgamal_key_source` remains standalone, derived profiles refuse stray ElGamal key fields, and standalone profiles validate `sk·G == pk`.
