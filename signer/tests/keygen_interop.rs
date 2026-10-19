//! Does a **derived** key actually work with the library the ledger uses?
//!
//! `CLAUDE.md`: *"When keygen is written, validate it against mpt-crypto's own
//! test vectors — `test_pok_sk`, `test_elgamal`, `test_elgamal_verify` — before
//! trusting it."* Those three are C programs over **randomly generated** keys,
//! so they cannot be run against ours as they stand. What is portable is the
//! set of properties they establish, driven here with a derived key in place of
//! the random one:
//!
//! | upstream test | property | here |
//! |---|---|---|
//! | `test_elgamal` | keypair generates, encrypts, and decrypts back | [`a_derived_key_encrypts_and_decrypts_through_the_library`] |
//! | `test_elgamal_verify` | ciphertexts verify against a revealed amount | [`a_derived_key_passes_the_libraries_revealed_amount_check`] |
//! | `test_pok_sk` | a registration proof of knowledge verifies, and its negatives are rejected | [`a_derived_key_produces_a_registration_proof_the_library_accepts`] |
//!
//! # ⚠ And the sentence that matters more than any of them
//!
//! The same `CLAUDE.md` paragraph continues: *"**Necessary, not sufficient:**
//! those establish that a keypair is well-formed and interoperates, and a
//! constant `sk_A = 1` passes all three."* That is a claim, so it gets a test
//! that would fail if it were false —
//! [`a_constant_sk_of_one_passes_every_upstream_check`] runs `sk_A = 1` through
//! all three and asserts they **pass**, which is what makes
//! `tests/keygen_kat.rs` load-bearing rather than decorative.
//!
//! Requires the vendored patched library. `tools/rebuild-env.sh`.

use wconf_signer::keygen;
use wconf_signer::prover::{self, ElGamalKeypair, Participant};
use wconf_signer::scalar::{reduce_wide, Scalar};

/// The keygen ruling's Vector 1.
const V1_SEED: &str = "sp6JdwovBCsiwnMhXuvZGZtPUoGVj";
/// The keygen ruling's Vector 2 — an `sEd…` seed, which is what every account
/// this project holds on Devnet actually is.
const V2_SEED: &str = "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n";

const ISSUANCE: [u8; 24] = [
    0x00, 0x46, 0x25, 0xC9, 0xF2, 0xDD, 0xC3, 0xE6, 0x52, 0x07, 0x1A, 0x9F, 0xFA, 0x07, 0x50, 0x7F,
    0x21, 0x51, 0xFE, 0xE3, 0x32, 0xCB, 0x25, 0xE8,
];

fn blinding(tag: u8) -> Scalar {
    let mut wide = [0u8; 64];
    wide[63] = tag;
    wide[0] = 0x11;
    reduce_wide(&wide).expect("a fixed non-zero test blinding factor")
}

/// `test_elgamal`'s round trip, with a derived key.
#[test]
fn a_derived_key_encrypts_and_decrypts_through_the_library() {
    for seed in [V1_SEED, V2_SEED] {
        let kp = keygen::derive_from_master_seed(seed, None).expect(seed).into_keypair();
        let r = blinding(7);
        for amount in [0u64, 1, 1001, 65_535] {
            let ct = prover::encrypt(amount, kp.public(), &r)
                .unwrap_or_else(|e| panic!("{seed}: encrypting {amount}: {e}"));
            let got = prover::decrypt(&ct, kp.secret(), 0, 70_000)
                .unwrap_or_else(|e| panic!("{seed}: decrypting {amount}: {e}"));
            assert_eq!(got, amount, "{seed}: the round trip changed the amount");
        }

        // The negative that stops the positives being vacuous: another key's
        // secret must NOT decrypt it.
        let other = keygen::derive_from_master_seed(V2_SEED, None).unwrap().into_keypair();
        if other.public() != kp.public() {
            let ct = prover::encrypt(4242, kp.public(), &r).unwrap();
            assert!(
                prover::decrypt(&ct, other.secret(), 0, 10_000).is_err(),
                "{seed}: a different key decrypted this ciphertext"
            );
        }
    }
}

/// `test_elgamal_verify`'s check, with a derived key on both sides of a
/// two-participant set.
#[test]
fn a_derived_key_passes_the_libraries_revealed_amount_check() {
    let holder_kp = keygen::derive_from_master_seed(V1_SEED, None).unwrap().into_keypair();
    let issuer_kp = ElGamalKeypair::generate().expect("the library's own generator");
    let r = blinding(9);
    let amount = 500u64;

    let holder = Participant {
        pubkey: *holder_kp.public(),
        ciphertext: prover::encrypt(amount, holder_kp.public(), &r).unwrap(),
    };
    let issuer = Participant {
        pubkey: *issuer_kp.public(),
        ciphertext: prover::encrypt(amount, issuer_kp.public(), &r).unwrap(),
    };

    assert!(
        prover::verify_revealed_amount(amount, &r, &holder, &issuer, None),
        "the library rejected ciphertexts it produced from a derived key"
    );

    // A verifier that says OK to everything makes every other assertion here
    // vacuous — `REVIEW-009` §8 found exactly that in `t-nbound.c`.
    assert!(
        !prover::verify_revealed_amount(amount + 1, &r, &holder, &issuer, None),
        "the revealed-amount check accepted the wrong amount"
    );
    assert!(
        !prover::verify_revealed_amount(amount, &blinding(10), &holder, &issuer, None),
        "the revealed-amount check accepted the wrong blinding factor"
    );
}

/// `test_pok_sk`, with a derived key and the **account-bound** context this
/// signer always supplies.
#[test]
fn a_derived_key_produces_a_registration_proof_the_library_accepts() {
    let key = keygen::derive_from_master_seed(V1_SEED, None).unwrap();
    let account = *key.account_id();
    let kp = key.into_keypair();

    let context = prover::convert_context_hash(&account, &ISSUANCE, 42).unwrap();
    let proof = prover::convert_proof(kp.public(), kp.secret(), &context)
        .expect("the library refused a derived key's registration proof");

    assert!(
        prover::verify_convert_proof(&proof, kp.public(), &context),
        "the library rejected its own registration proof"
    );

    // Upstream's own three negatives.
    let mut wrong_context = context;
    wrong_context[0] ^= 0xFF;
    assert!(
        !prover::verify_convert_proof(&proof, kp.public(), &wrong_context),
        "the registration proof verified under the wrong context"
    );

    let mut corrupted = proof;
    corrupted[63] ^= 0x01;
    assert!(
        !prover::verify_convert_proof(&corrupted, kp.public(), &context),
        "a corrupted registration proof verified"
    );

    let other = ElGamalKeypair::generate().unwrap();
    assert!(
        !prover::verify_convert_proof(&proof, other.public(), &context),
        "the registration proof verified under the wrong public key"
    );
}

/// `CLAIMS.md` **F-19**, as a property rather than a note: the registration
/// proof this signer emits is **bound to the account it is for**.
///
/// The library accepts a NULL `context_id` and then emits an account-unbound,
/// freely replayable registration proof. rippled cannot reach that path; this
/// signer links the library directly and could. Ruling §5 item 4 says to assert
/// non-NULL at the call site — here that assertion is a **type**:
/// [`prover::convert_proof`] takes `&[u8; 32]`, which cannot be null in safe
/// Rust, and `mpt::secp256k1_mpt_pok_sk_prove` is declared but never re-exported
/// through `prover`.
///
/// What is testable is the consequence, and this is it: a proof made for one
/// account's context does not verify for another's. If the context ever stopped
/// binding the account — a NULL, a constant, a hash that forgot to include the
/// AccountID — this test fails.
#[test]
fn the_registration_proof_does_not_transfer_to_another_account() {
    let a = keygen::derive_from_master_seed(V1_SEED, None).unwrap();
    let b = keygen::derive_from_master_seed(V2_SEED, None).unwrap();
    let (acct_a, acct_b) = (*a.account_id(), *b.account_id());
    assert_ne!(acct_a, acct_b, "the two vectors must be different accounts");

    let kp = a.into_keypair();
    let ctx_a = prover::convert_context_hash(&acct_a, &ISSUANCE, 1).unwrap();
    let ctx_b = prover::convert_context_hash(&acct_b, &ISSUANCE, 1).unwrap();
    assert_ne!(ctx_a, ctx_b, "two accounts produced the same convert context hash");

    let proof = prover::convert_proof(kp.public(), kp.secret(), &ctx_a).unwrap();
    assert!(prover::verify_convert_proof(&proof, kp.public(), &ctx_a), "the control failed");
    assert!(
        !prover::verify_convert_proof(&proof, kp.public(), &ctx_b),
        "a registration proof made for one account verified for another — this is F-19's \
         harm, and it is what a NULL context_id produces"
    );

    // The same account at a different sequence is also a different context, so
    // a registration proof cannot be lifted from one transaction into another.
    let ctx_a2 = prover::convert_context_hash(&acct_a, &ISSUANCE, 2).unwrap();
    assert!(
        !prover::verify_convert_proof(&proof, kp.public(), &ctx_a2),
        "a registration proof verified at a different sequence"
    );
}

/// ⚠ **The control that makes `tests/keygen_kat.rs` necessary.**
///
/// `sk_A = 1` is the degenerate key: its public key is the generator itself,
/// and anyone can decrypt everything encrypted to it. It is also a perfectly
/// well-formed secp256k1 keypair, so **every check in this file passes for
/// it**. That is asserted here rather than asserted about, because
/// "necessary but not sufficient" is a claim and this project's rule is that a
/// claim needs a test that fails if it is false.
///
/// The consequence: interop tests say nothing about whether a key was derived
/// correctly. Only the known-answer vectors do.
#[test]
fn a_constant_sk_of_one_passes_every_upstream_check() {
    use k256::elliptic_curve::sec1::ToEncodedPoint;
    let mut sk = [0u8; 32];
    sk[31] = 1;
    // Computed, not recalled. `CLAIMS.md` E-95: an expected value written from
    // recollection is the exact defect this project has already shipped once.
    let pk_point = k256::SecretKey::from_slice(&sk).unwrap().public_key().to_encoded_point(true);
    let mut pk = [0u8; 33];
    pk.copy_from_slice(pk_point.as_bytes());
    let degenerate = ElGamalKeypair::try_from_parts(sk, pk).expect("sk = 1 is a valid keypair");

    // test_elgamal — round trip.
    let r = blinding(3);
    let ct = prover::encrypt(777, degenerate.public(), &r).expect("encrypt under sk = 1");
    assert_eq!(
        prover::decrypt(&ct, degenerate.secret(), 0, 1000).expect("decrypt under sk = 1"),
        777,
        "sk = 1 failed the round trip, so this control proves nothing"
    );

    // test_elgamal_verify — revealed amount.
    let issuer = ElGamalKeypair::generate().unwrap();
    let holder_p = Participant { pubkey: pk, ciphertext: ct };
    let issuer_p = Participant {
        pubkey: *issuer.public(),
        ciphertext: prover::encrypt(777, issuer.public(), &r).unwrap(),
    };
    assert!(
        prover::verify_revealed_amount(777, &r, &holder_p, &issuer_p, None),
        "sk = 1 failed the revealed-amount check"
    );

    // test_pok_sk — registration proof.
    let context = prover::convert_context_hash(&[9u8; 20], &ISSUANCE, 1).unwrap();
    let proof = prover::convert_proof(&pk, &sk, &context).expect("PoK under sk = 1");
    assert!(
        prover::verify_convert_proof(&proof, &pk, &context),
        "sk = 1 failed the registration proof"
    );

    // Every one of those passed. And it is not the derived key:
    let derived = keygen::derive_from_master_seed(V1_SEED, None).unwrap();
    assert_ne!(
        derived.public(),
        &pk,
        "the derivation produced sk = 1, which would make the control meaningless"
    );
}

/// A derived key must survive the trip through the profile loader, which
/// recomputes `sk·G` and refuses a pair that does not correspond.
#[test]
fn a_derived_key_is_accepted_by_the_keypair_validator_and_a_mismatched_one_is_not() {
    let key = keygen::derive_from_master_seed(V1_SEED, None).unwrap();
    let pk = *key.public();
    let kp = key.into_keypair();
    assert_eq!(kp.public(), &pk);

    // Swap in another key's public half — the failure mode that permanently
    // loses a balance, because everything downstream succeeds.
    let other = *ElGamalKeypair::generate().unwrap().public();
    let err = ElGamalKeypair::try_from_parts(*kp.secret(), other)
        .expect_err("a mismatched keypair was accepted");
    assert!(
        err.reason.contains("not sk·G"),
        "the refusal does not say what is wrong: {}",
        err.reason
    );
}

// ---------------------------------------------------------------------------
// Two REVIEW-020 findings that were wrong, pinned by tests rather than by
// disposition notes (`CLAIMS.md` E-93, E-106)
// ---------------------------------------------------------------------------

/// ⚠ **A rejected review claim.** `REVIEW-020`'s Codex leg reported, as its only
/// HIGH, that `DerivedKey::into_keypair` *"cannot compile"* — because it reads
/// `self.sk.0` out of a `Zeroizing<32>`, and Rust forbids moving a field out of
/// a type implementing `Drop`. Its stated consequence was that *"the new derived
/// key path cannot ship."*
///
/// The premise is false. `[u8; 32]` is `Copy`, so `self.sk.0` is a **copy**, not
/// a move, and the restriction does not apply. Every build of this crate is a
/// counterexample.
///
/// But the worry underneath it is real and is worth a test rather than a note:
/// *does the secret survive its source being zeroized?* `self` is dropped at the
/// end of `into_keypair`, which overwrites the original buffer. If the handed-out
/// value were an alias rather than a copy, the keypair would leave that function
/// holding thirty-two zero bytes.
///
/// ⚠ **And `try_from_parts` would not catch that**, though not for the reason an
/// earlier version of this comment gave. It *does* validate — it recomputes
/// `sk·G` — but it runs while the source is still alive, so an aliased buffer
/// validates correctly and is wiped afterwards, on the way out. The check is
/// synchronous; the zeroization is not. `REVIEW-020` round two caught the
/// mis-description.
#[test]
fn the_derived_secret_survives_its_source_being_zeroized() {
    let key = keygen::derive_from_master_seed(V1_SEED, None).unwrap();
    let pk = *key.public();

    // `key` is consumed and its `Zeroizing<32>` runs its destructor here.
    let kp = key.into_keypair();

    assert_ne!(kp.secret(), &[0u8; 32], "the secret was zeroized on the way out");
    assert_eq!(kp.public(), &pk, "the public key changed across into_keypair");

    // The property that actually matters: the secret still decrypts what the
    // public key encrypts. A zeroed or truncated copy fails here.
    let r = blinding(11);
    let ct = prover::encrypt(31337, kp.public(), &r).expect("encrypt");
    assert_eq!(
        prover::decrypt(&ct, kp.secret(), 0, 40_000).expect("decrypt"),
        31337,
        "the surviving secret does not match the surviving public key"
    );
}

/// ⚠ **A second rejected review claim.** The same leg reported that
/// `onboarding::PERMANENT_DECRYPTION_CREDENTIAL` overstates the harm when it
/// says the master seed becomes a decryption credential *"for every confidential
/// amount this account ever holds, sends or receives"* — reading it as a claim
/// that `sk_A` decrypts **counterparties'** ciphertexts.
///
/// It is not that claim, and the sentence as written is true. Every confidential
/// amount this account is party to carries a ciphertext encrypted **to this
/// account's own key**: a Send it makes carries `SenderEncryptedAmount` under the
/// sender's key, and a Send it receives carries `DestinationEncryptedAmount`
/// under the destination's. So all three verbs hold, for this account's amounts,
/// under this account's `sk_A`.
///
/// The narrower thing the leg was reaching for is also true — `sk_A` does **not**
/// decrypt a counterparty's own ciphertext — and both halves are asserted here,
/// because a disclosure this project has to defend is worth one test.
#[test]
fn the_derived_key_decrypts_this_accounts_amounts_and_only_this_accounts() {
    let mine = keygen::derive_from_master_seed(V1_SEED, None).unwrap().into_keypair();
    let theirs = keygen::derive_from_master_seed(V2_SEED, None).unwrap().into_keypair();
    assert_ne!(mine.public(), theirs.public(), "the two vectors must differ");

    // One Send's ciphertext set, as `ConfidentialMPTSend` carries it: the same
    // `r` for every participant, one ciphertext per key.
    let r = blinding(13);
    let amount = 4321u64;
    let to_me = prover::encrypt(amount, mine.public(), &r).unwrap();
    let to_them = prover::encrypt(amount, theirs.public(), &r).unwrap();

    // "holds, sends or receives" — in each case there is a ciphertext under this
    // account's key, and the derived secret reads it.
    assert_eq!(prover::decrypt(&to_me, mine.secret(), 0, 9_000).unwrap(), amount);

    // And the boundary: the counterparty's own ciphertext is not ours to read,
    // even though it encrypts the same number under the same `r`.
    assert!(
        prover::decrypt(&to_them, mine.secret(), 0, 9_000).is_err(),
        "this account's secret decrypted a counterparty's ciphertext"
    );
    // The control, so the refusal above is not simply a broken decryptor.
    assert_eq!(prover::decrypt(&to_them, theirs.secret(), 0, 9_000).unwrap(), amount);
}

/// B-23: the two seed dispatches must agree.
///
/// ⚠ **This test exists because a duplicate was REMOVED.** `keygen::derive_raw`
/// used to reach the account key through `xrpl::AccountKey::from_family_seed`,
/// which decodes the seed a second time (`REVIEW-029a` finding 3). B-23 decodes
/// once and dispatches on the algorithm itself — which duplicates the two-arm
/// `match` that lives inside `from_family_seed`.
///
/// **The cost of removing a call is a copy of its body, and the risk is drift.**
/// This is the falsifier for that drift: both seed types, through both paths,
/// must produce the same AccountID. It fails if either dispatch gains an arm the
/// other lacks, or if the arms are ever swapped.
///
/// ⚠ **It is a real falsifier and that was checked by breaking it**, not
/// asserted — swapping the two arms in `derive_raw` makes it fail. `CLAIMS.md`
/// B-23.
#[test]
fn the_two_seed_dispatches_agree() {
    // secp256k1 and ed25519 — the only two the decoder produces.
    for seed in ["sp6JdwovBCsiwnMhXuvZGZtPUoGVj", "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n"] {
        let via_from_family_seed = wconf_signer::xrpl::AccountKey::from_family_seed(seed)
            .expect("a published seed must decode");

        // `derive_from_master_seed` carries `derive_raw`'s dispatch, and it
        // returns the AccountID that dispatch produced.
        let derived = wconf_signer::keygen::derive_from_master_seed(seed, None)
            .expect("the derivation is total once the input checks pass");

        assert_eq!(
            &via_from_family_seed.account_id(),
            derived.account_id(),
            "the two seed dispatches disagree for {seed}: keygen's own `match` on \
             `algo` has drifted from `AccountKey::from_family_seed`'s"
        );
    }
}
