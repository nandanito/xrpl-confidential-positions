//! `CLAIMS.md` **B-14** — the transaction's ECDSA nonce, ruled 2026-08-20.
//!
//! # What was ruled, and why it is not symmetry for its own sake
//!
//! Issue #1 ruled that **a hostile process on the holder's own machine, as the
//! holder's own user, is in the threat model.** That ruling is what made the
//! sigma-protocol nonces hedged (`WCONF_HEDGE=1`). The transaction signature's
//! `k` had the same shape — a nonce derived deterministically from a long-lived
//! secret — and the opposite treatment, with nothing written down.
//!
//! `REVIEW-018`, two independent legs, **both ruled that issue #1 extends
//! here**, and neither found a principled distinction. The reason it matters is
//! not the amount: **`k` protects the account key**, and under the ruled keygen
//! construction that key is also the input the ElGamal decryption key is
//! derived from. A repeated or biased `k` is a spending failure *and* a
//! confidentiality failure.
//!
//! # The cost, paid deliberately
//!
//! `ripple-keypairs` is deterministic, so the **default path can no longer be
//! pinned byte-for-byte against it.** `tests/xrpl_vectors.rs` now pins the
//! deterministic arm. Both legs said that is sound **only** if the arm is the
//! same signing implementation with one input varied — a separate signer would
//! pin the wrong binary.
//!
//! ⚠ This said *"`one_implementation_not_two` below is what holds that"*, and
//! that test **is gone** — `REVIEW-024` §4d established it could not hold it,
//! and the sentence outlived the test by one commit (`REVIEW-025`, Codex leg).
//! **What holds it is `xrpl::AccountKey::sign_with_aux` being private and being
//! the only place either algorithm signs**, which is structure rather than an
//! assertion.
//!
//! # ⚠ B-14: both halves are BUILT and EXECUTED as of 2026-08-27
//!
//! ~~Ed25519 is deterministic by construction and **this is the live path**…
//! Tracked as **B-16**.~~ **B-16 was ruled on 2026-08-27 (`REVIEW-024`, three
//! independent legs) and built in the session that read this comment.** Codex's
//! B-14 instruction — *"Do not mark B-14 closed by fixing only secp256k1"* — is
//! now satisfied rather than pending.
//!
//! The ed25519 half is below, under `ED25519`. It is a different construction at
//! a different layer — the RFC 8032 nonce **prefix**, masked by
//! `SHA512(DST ‖ aux)`, rather than RFC 6979 additional data — so it gets its
//! own tests rather than a parameter on these.
//!
//! ⚠ **`REVIEW-024` §6 lists eight things that must execute before anything says
//! "the signer hedges ed25519".** Items 1-6 and 8 are in this file and in
//! `tests/xrpl_vectors.rs`; **item 7 is a Devnet transaction on the default path
//! with `SigningPubKey` decoded out of the submitted blob**, which no test can
//! stand in for — `tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts`, with
//! its receipt at `docs/runs/`.
//!
//! ⚠ **All eight have run, and §7 item 4 — two adversarial rounds — is now
//! COMPLETE.** `REVIEW-025c` is round one (eleven findings, none the
//! construction); `REVIEW-026c` is round two, and what it found was that round
//! one's adjudication had **overstated its own fixes** (E-168), which is exactly
//! what a second round is for. All four of `REVIEW-024` §7's conditions are met.
//!
//! ⚠ This comment read *"has not finished … `REVIEW-025` is round one"* for one
//! commit after round two landed. **A statement that is true when written is
//! false by the end of the same session** — the twenty-second instance, and this
//! is the twenty-third.

use wconf_signer::xrpl::{self, AccountKey, Hedge};

/// The first vector seed, a published constant derived from 16 zero bytes.
const SECP_SEED: &str = "sp6JS7f14BuwFY8Mw6bTtLKWauoUs";

fn probe() -> Vec<u8> {
    xrpl::unhex("5354580012005821000000022200000000").unwrap()
}

/// **The default path is hedged.** Two signatures over identical bytes with
/// the identical key differ.
///
/// ⚠ This said *"the whole ruling in one assertion"* — and so did its ed25519
/// twin, which `REVIEW-025`'s Codex leg named and which was corrected while
/// **this copy was left standing**. It is not: any nondeterminism passes it,
/// including nondeterminism arriving for the wrong reason. What says the
/// nondeterminism is RFC 6979-plus-additional-data is
/// `the_deterministic_arm_repeats_itself_exactly` beside it, and
/// `the_hedged_signature_still_verifies` is what catches signing becoming a
/// no-op.
///
/// ⚠ **Two identical sentences, one fixed.** `CLAUDE.md`: *apply a fix against
/// the FINDING's own citation list, not the adjudication's summary of it* —
/// found in round two by sweeping for the corrected phrase rather than for the
/// line number.
#[test]
fn the_default_path_does_not_repeat_itself() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();

    let mut seen = std::collections::HashSet::new();
    for _ in 0..16 {
        let sig = key.sign_message(&msg).unwrap();
        assert!(!sig.is_empty());
        seen.insert(sig);
    }
    assert_eq!(
        seen.len(),
        16,
        "sixteen signatures over identical bytes produced {} distinct values; the default \
         path is not hedged",
        seen.len()
    );
}

/// ...and the deterministic arm **does** repeat itself, exactly.
///
/// The control. Without it the test above passes on an implementation that had
/// simply become nondeterministic for the wrong reason.
#[test]
fn the_deterministic_arm_repeats_itself_exactly() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();
    let first = key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap();
    for _ in 0..8 {
        assert_eq!(
            key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
            first,
            "the arm the vectors are pinned against is not deterministic"
        );
    }
}

/// A hedged signature is a **valid** signature. Randomising `k` must not have
/// broken the thing being signed.
///
/// Verified with `k256`'s own verifier against the public key this signer
/// publishes in `SigningPubKey`, over the same digest rule the signer uses.
#[test]
fn the_hedged_signature_still_verifies() {
    use k256::ecdsa::signature::hazmat::PrehashVerifier;
    use k256::ecdsa::{Signature, VerifyingKey};

    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let vk = VerifyingKey::from_sec1_bytes(key.public()).expect("public key");
    let msg = probe();

    for _ in 0..8 {
        let der = key.sign_message(&msg).unwrap();
        let sig = Signature::from_der(&der).expect("the signer emitted non-DER bytes");
        vk.verify_prehash(&xrpl::sha512half(&msg), &sig)
            .expect("a hedged signature did not verify against this signer's own public key");
    }
}

/// Low-`S` normalisation survives hedging.
///
/// rippled rejects a high-`S` signature. `k` changes every time now, so roughly
/// half of the raw signatures would be high-`S` without normalisation — which
/// makes this a test that would fail *often* rather than never if the
/// normalisation were dropped on the hedged path.
#[test]
fn every_hedged_signature_is_low_s() {
    use k256::ecdsa::Signature;
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();
    for i in 0..32 {
        let der = key.sign_message(&msg).unwrap();
        let sig = Signature::from_der(&der).expect("non-DER");
        assert!(
            sig.normalize_s().is_none(),
            "signature {i} is high-S and rippled would reject it"
        );
    }
}

/// **The two secp256k1 arms are semantically compatible** — same key, same
/// message, same digest, same encoding, both verifying, both low-`S`.
///
/// ⚠ **This test was called `one_implementation_not_two` and could NOT establish
/// that property.** `REVIEW-024`'s Codex leg found it and it is verified: two
/// independently written correct signers pass every assertion in this body, so
/// the name promised a check no black-box test can make. Both `REVIEW-018` legs
/// had made the single-implementation property the condition on which the
/// deterministic arm was acceptable **at all**, and it was held by inspection
/// and by nothing else. `CLAIMS.md` E-161.
///
/// **The property is now structural**, per `REVIEW-024` §7 item 1:
/// `AccountKey::sign_with_aux` is private, takes `Option<Zeroizing<[u8; 32]>>`,
/// and is the only place either algorithm signs — `sign_message` and `sign_message_with`
/// both call it and there is no third path. That is enforced by the module, not
/// asserted here.
///
/// What is left in this body is the weaker property it actually establishes,
/// under a name that says so. It is still worth having: a nonce change that
/// broke the digest choice or the DER encoding would show up here.
#[test]
fn both_secp256k1_arms_are_semantically_compatible() {
    use k256::ecdsa::signature::hazmat::PrehashVerifier;
    use k256::ecdsa::{Signature, VerifyingKey};

    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let vk = VerifyingKey::from_sec1_bytes(key.public()).unwrap();
    let msg = probe();
    let digest = xrpl::sha512half(&msg);

    let det = key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap();
    let hedged = key.sign_message(&msg).unwrap();

    assert_ne!(det, hedged, "the hedged arm reproduced the deterministic one");
    for (name, der) in [("deterministic", &det), ("hedged", &hedged)] {
        let sig = Signature::from_der(der).unwrap_or_else(|_| panic!("{name} is not DER"));
        vk.verify_prehash(&digest, &sig)
            .unwrap_or_else(|_| panic!("{name} does not verify under the same key and digest"));
        assert!(sig.normalize_s().is_none(), "{name} is high-S");
    }
}

/// ⚠ **Entropy failure DEGRADES here. It does not refuse — and the two are not
/// interchangeable.**
///
/// Architecture §4 keeps three randomness rules side by side because they are
/// genuinely different. `r`/`ρ` **refuse to sign** on entropy failure, because
/// entropy *is* the source there and `r` is published on chain. Sigma nonces
/// **degrade**, because entropy is a hedge over a deterministic core that is
/// safe on its own. `k` has the second shape, so it degrades to the standard
/// RFC 6979 construction — which is exactly where this project was before the
/// ruling, and is not a downgrade below it.
///
/// `REVIEW-018`'s Codex leg said refuse. **That is the merge `CLAUDE.md` warns
/// against by name**, and the adjudication rejected it — recorded here rather
/// than in a note nobody re-reads (`CLAIMS.md` E-93's precedent).
#[test]
fn entropy_failure_degrades_to_the_standard_construction() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();

    wconf_signer::store::fail_next_entropy_draw_for_test();
    let under_failure = key
        .sign_message(&msg)
        .expect("entropy failure must not stop a transaction signature; k is a hedge here");

    assert_eq!(
        under_failure,
        key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
        "an entropy failure produced something other than the standard RFC 6979 construction"
    );
}

/// Signatures do not collide across a large run.
///
/// ⚠ **This test was called `aux_is_exactly_one_field_of_entropy` and could not
/// check that.** If the auxiliary RNG recycled its 32 bytes to satisfy a larger
/// request, every signature would *still* differ — so no black-box test over
/// signature outputs can see recycling, and the name promised a check the body
/// never made.
///
/// The real check moved into `xrpl.rs`, where `OneShotAux` **panics** rather
/// than recycling, with unit tests either side of the boundary. What is left
/// here is the weaker property this body actually establishes, under a name
/// that says so.
#[test]
fn signatures_do_not_collide_across_a_long_run() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();
    let mut seen = std::collections::HashSet::new();
    for _ in 0..200 {
        seen.insert(key.sign_message(&msg).unwrap());
    }
    assert_eq!(seen.len(), 200, "signatures collided across 200 draws");
}

// ===========================================================================
// ED25519 — `CLAIMS.md` B-16, ruled 2026-08-27 (`REVIEW-024`) and built here
// ===========================================================================
//
// ⚠ `ed25519_is_still_deterministic_and_that_is_a_tracked_gap` **was here and is
// gone deliberately.** Its own panic message said what to do: *"this may be the
// B-16 build arriving rather than a defect … Close B-16 deliberately; do not
// delete this test to make the suite green."* The build landed, the register
// entry is closed, and what replaces it is not one assertion but `REVIEW-024`
// §6's list. Everything the old test established — that the selector has an
// effect, that the arms are distinguishable — is asserted below in the opposite
// direction.

/// The 29 ruled bytes of the domain separator, **written out here rather than
/// imported from the code under test** — and then compared *to* the code under
/// test, which is the half that was missing.
///
/// ⚠ **This constant existed and was compared to the same literal**, because
/// `xrpl::ED25519_NONCE_HEDGE_DST` was `pub(crate)` and an integration test
/// cannot see it. So `the_dst_is_the_ruled_bytes` was a tautology, under a doc
/// comment in `xrpl.rs` asserting it *"pins all 29 of them"*. Found
/// independently by `REVIEW-025`'s self leg and its Codex leg. The constant is
/// `pub` now and the test reaches it.
const RULED_DST: &[u8] = b"WCONF/ed25519-nonce-hedge/v1\0";

fn ed_msg(tag: u8) -> Vec<u8> {
    let mut m = xrpl::unhex("53545800120058210000000222000000").unwrap();
    m.push(tag);
    m
}

/// The verifying key a conforming verifier would use: the 32 bytes after the
/// `0xED` prefix in what this signer publishes as `SigningPubKey`.
fn verifying_key(key: &AccountKey) -> ed25519_dalek::VerifyingKey {
    let pk = key.public();
    assert_eq!(pk.len(), 33, "an ed25519 SigningPubKey is 0xED followed by 32 bytes");
    assert_eq!(pk[0], 0xED, "an ed25519 SigningPubKey must start 0xED");
    ed25519_dalek::VerifyingKey::from_bytes(pk[1..].try_into().unwrap())
        .expect("the signer published a public key that is not a valid ed25519 point")
}

/// ⚠ **`REVIEW-024` §6 item 6, and the strictest verifier available.**
///
/// `verify_strict` rejects a non-canonical `R` and small-order public keys,
/// which the permissive `verify` accepts. Ed25519 verifiers genuinely diverge on
/// canonicality and cofactor handling, and the ruling says so; an honestly
/// generated signature sits in the intersection of every accept set, so the
/// strict one is the right check here.
fn assert_canonical(key: &AccountKey, msg: &[u8], sig: &[u8], what: &str) {
    assert_eq!(sig.len(), 64, "{what}: an ed25519 signature is 64 bytes, got {}", sig.len());
    let parsed = ed25519_dalek::Signature::from_slice(sig).expect("64 bytes");
    verifying_key(key)
        .verify_strict(msg, &parsed)
        .unwrap_or_else(|e| panic!("{what}: strict verification failed under this signer's own published public key: {e}"));
}

// ---------------------------------------------------------------------------
// §6 item 1 — the deterministic arm is byte-identical RFC 8032
// ---------------------------------------------------------------------------

/// ⚠ **The claim `REVIEW-024` §5 flagged as a PREDICTION rather than a
/// measurement, measured.**
///
/// The ruling said the unmasked arm *"follows from `raw_sign` with an unmodified
/// prefix being the same expression `SigningKey::sign` evaluates"* and that §6
/// item 1 is what turns that into evidence. This is that: the same key and
/// message through `ed25519_dalek::SigningKey::sign` — the crate's ordinary,
/// non-`hazmat` API, which this signer no longer calls — and through the new
/// code path, compared byte for byte.
///
/// `tests/xrpl_vectors.rs::each_algorithm_signs_what_ripple_keypairs_signs` is
/// the other half: it pins the same arm against `ripple-keypairs@2.0.0`, an
/// implementation neither this project nor `ed25519-dalek` wrote.
#[test]
fn the_unmasked_arm_is_byte_identical_to_the_crates_own_rfc_8032() {
    use ed25519_dalek::Signer;
    for i in 0..8u8 {
        let entropy = [i.wrapping_mul(37).wrapping_add(3); 16];
        let key = AccountKey::ed25519_from_entropy(&entropy).unwrap();
        let msg = ed_msg(i);

        let plain = ed25519_dalek::SigningKey::from_bytes(&xrpl::sha512half(&entropy));
        assert_eq!(
            key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
            plain.sign(&msg).to_bytes().to_vec(),
            "the unmasked arm is not the crate's own RFC 8032 signature at i={i}"
        );
    }
}

// ---------------------------------------------------------------------------
// §6 item 2 — a test-only fixed-aux input, and it drives the construction
// ---------------------------------------------------------------------------

/// **Two distinct fixed `aux` values give distinct `R`, and both verify.**
///
/// `R` rather than "the signature differs": `R = encode(r·B)` is the first 32
/// bytes and is the *only* part the nonce determines directly. Comparing whole
/// signatures would also pass if `s` alone moved, which would be a different and
/// much worse bug.
#[test]
fn two_fixed_aux_values_give_two_nonces() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);

    let a = key.sign_message_with(Hedge::FixedAux([0x11; 32]), &msg).unwrap();
    let b = key.sign_message_with(Hedge::FixedAux([0x22; 32]), &msg).unwrap();

    assert_ne!(a[..32], b[..32], "two different aux values produced the same R; the mask has no effect");
    assert_canonical(&key, &msg, &a, "fixed aux 0x11");
    assert_canonical(&key, &msg, &b, "fixed aux 0x22");
}

/// The fixed-`aux` arm is **reproducible**, which is what makes every equality
/// in this section an equality rather than a "did something change".
#[test]
fn a_fixed_aux_reproduces_itself_exactly() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);
    let first = key.sign_message_with(Hedge::FixedAux([0x5A; 32]), &msg).unwrap();
    for _ in 0..8 {
        assert_eq!(key.sign_message_with(Hedge::FixedAux([0x5A; 32]), &msg).unwrap(), first);
    }
}

// ---------------------------------------------------------------------------
// §6 item 3 — a successful draw of thirty-two zero bytes stays HEDGED
// ---------------------------------------------------------------------------

/// ⚠ **`Some([0u8; 32])` is not the no-mask arm, and this is the distinction
/// B-14 got wrong in the mirror direction.**
///
/// `REVIEW-018`'s Gemini leg wrote *"aux_rand = 0³² (or is omitted)"* as though
/// the two were interchangeable for secp256k1; they are not, and following it
/// would have broken the vector pinning. Here the same pair must stay distinct
/// in the **opposite** direction: a zero draw is a *successful* draw, so the
/// mask `SHA512(DST ‖ 0³²)[0..32]` is applied, and the result is a hedged
/// signature that is nothing like RFC 8032.
///
/// Codex named this in `REVIEW-024` without being prompted. A session that
/// assumes zeros recover RFC 8032 writes a test that passes for the wrong
/// reason.
#[test]
fn zero_aux_is_hedged_not_a_fallback() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);

    let zeros = key.sign_message_with(Hedge::FixedAux([0u8; 32]), &msg).unwrap();
    let unmasked = key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap();

    assert_ne!(
        zeros, unmasked,
        "a successful draw of 32 zero bytes reproduced the unmasked arm. Only a REPORTED \
         entropy failure omits the mask — REVIEW-024 section 4b"
    );
    assert_canonical(&key, &msg, &zeros, "aux = 32 zero bytes");
}

/// ⚠ **The same claim at the site that actually decides it, and this test exists
/// because a revert PASSED without it.**
///
/// `zero_aux_is_hedged_not_a_fallback` above drives `Hedge::FixedAux([0u8; 32])`
/// — which never reaches `xrpl::fresh_aux`, the function that turns a
/// `store::getrandom` result into `Some`/`None`. Reverting *that* function to
/// treat a successful all-zero draw as an omission left the entire suite green.
///
/// **A test named for a property, sitting one layer away from where the property
/// can break, is this project's most frequent defect** — `one_implementation_not_two`
/// and `aux_is_exactly_one_field_of_entropy` are the same shape, and
/// `REVIEW-024` §6 item 8's *"revert each fix and watch its test fail"* is what
/// found this one. The revert is now item 8 of that sweep and it fails here.
///
/// The distinction, stated once more because `REVIEW-018` §4a got its mirror
/// wrong: a draw that **succeeds** and yields 32 zero bytes is a hedged
/// signature. Only a draw that **reports failure** omits the mask.
#[test]
fn a_successful_all_zero_draw_still_hedges() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);

    wconf_signer::store::next_entropy_draw_returns_for_test([0u8; 32]);
    let drawn_zeros = key.sign_message(&msg).unwrap();

    assert_eq!(
        drawn_zeros,
        key.sign_message_with(Hedge::FixedAux([0u8; 32]), &msg).unwrap(),
        "a successful all-zero draw did not take the masked path"
    );
    assert_ne!(
        drawn_zeros,
        key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
        "a successful all-zero draw produced the UNMASKED signature. Only a REPORTED entropy \
         failure omits the mask — REVIEW-024 sections 4b and 6 item 3"
    );
    assert_canonical(&key, &msg, &drawn_zeros, "successful zero draw");
}

/// The secp256k1 arm has the same site and the same distinction, and it is the
/// one `REVIEW-018` §4a got wrong in the mirror direction: there, empty
/// additional data and 32 zero bytes of it were treated as interchangeable, and
/// they seed the HMAC-DRBG differently.
#[test]
fn a_successful_all_zero_draw_still_hedges_secp256k1() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();

    wconf_signer::store::next_entropy_draw_returns_for_test([0u8; 32]);
    let drawn_zeros = key.sign_message(&msg).unwrap();

    assert_eq!(drawn_zeros, key.sign_message_with(Hedge::FixedAux([0u8; 32]), &msg).unwrap());
    assert_ne!(
        drawn_zeros,
        key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
        "32 zero bytes of RFC 6979 additional data produced the same k as omitting it"
    );
}

// ---------------------------------------------------------------------------
// §6 item 4 — a reported entropy failure degrades, and it degrades to RFC 8032
// ---------------------------------------------------------------------------

/// **Degrade, not refuse — demonstrated rather than asserted.**
///
/// ⚠ **The self leg of `REVIEW-024` had this wrong** and both external legs
/// corrected it: it had ruled that entropy failure lands on a *third* fixed
/// construction, `H(tag ‖ p ‖ 0³²)`, reasoning by analogy from an observation
/// about the sigma hedge. The ruling adopted the external answer — omit the mask
/// and land on **byte-identical RFC 8032** — and one of its three reasons was
/// that it makes this test an equality against an arm something outside this
/// repository can check. `REVIEW-024` §4b.
#[test]
fn ed25519_entropy_failure_degrades_to_rfc_8032() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);

    wconf_signer::store::fail_next_entropy_draw_for_test();
    let under_failure = key
        .sign_message(&msg)
        .expect("entropy failure must not stop a transaction signature; the nonce prefix is a hedge here");

    assert_eq!(
        under_failure,
        key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
        "an entropy failure produced something other than the standard RFC 8032 construction"
    );
    assert_canonical(&key, &msg, &under_failure, "degraded signature");
}

// ---------------------------------------------------------------------------
// §6 item 5 — message separation under a stuck RNG
// ---------------------------------------------------------------------------

/// ⚠ **What says the mask did not REPLACE the message in the nonce preimage.**
///
/// `r = reduce(H(q ‖ M))`. An implementation that computed `r` from `q` alone —
/// or that folded the message into the mask instead of the preimage — would pass
/// every other test in this file and would reuse a nonce across two different
/// messages under a stuck RNG. That is the exact precondition §2 of the ruling
/// describes: two signatures sharing `r` under two challenges give
/// `a = (s₁ − s₂)·(k₁ − k₂)⁻¹`, the secret scalar by one subtraction and one
/// inversion.
///
/// So: the same fixed `aux` over two different messages must give different `R`,
/// and over the same message must reproduce exactly.
#[test]
fn one_aux_over_two_messages_does_not_reuse_the_nonce() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let aux = Hedge::FixedAux([0x01; 32]);

    let m1 = ed_msg(1);
    let m2 = ed_msg(2);
    let s1 = key.sign_message_with(aux, &m1).unwrap();
    let s2 = key.sign_message_with(aux, &m2).unwrap();

    assert_ne!(
        s1[..32],
        s2[..32],
        "the same aux over two different messages produced the same R. The message has left \
         the nonce preimage and two signatures now share a nonce — REVIEW-024 section 2"
    );
    assert_eq!(s1, key.sign_message_with(aux, &m1).unwrap(), "same aux and same message did not reproduce");

    // The empty message is the degenerate case of the same property.
    let empty = key.sign_message_with(aux, &[]).unwrap();
    assert_ne!(empty[..32], s1[..32]);
    assert_canonical(&key, &[], &empty, "empty message");
}

// ---------------------------------------------------------------------------
// §6 item 6 — invariants
// ---------------------------------------------------------------------------

/// **The default path is hedged**, for the arm every account this project holds
/// actually uses.
///
/// ⚠ This said *"the whole ruling in one assertion"*. It is not: **any**
/// nondeterminism passes it, including nondeterminism arriving for the wrong
/// reason. `REVIEW-025`, Codex leg. What says the nondeterminism is *this*
/// construction is `the_construction_matches_a_second_model`; what says it is
/// still a valid signature is `assert_canonical` on every draw below.
#[test]
fn the_default_ed25519_path_does_not_repeat_itself() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);
    let mut seen = std::collections::HashSet::new();
    for _ in 0..64 {
        let sig = key.sign_message(&msg).unwrap();
        assert_canonical(&key, &msg, &sig, "default path");
        seen.insert(sig);
    }
    assert_eq!(seen.len(), 64, "64 signatures over identical bytes gave {} distinct values", seen.len());
}

/// **Both modes carry the identical public key**, and it is the one the signer
/// publishes in `SigningPubKey`.
///
/// ⚠ This is the invariant that makes hedging invisible on the wire. The mask
/// touches `hash_prefix` only; `a` is untouched, so `A = a·B` is untouched, so
/// a verifier cannot tell the arms apart and rippled's account-key check is
/// unaffected. If the mask ever reached the scalar, every signature would still
/// verify under a *different* key and every transaction would be rejected — or,
/// worse, `A` and the scalar would disagree and the signature would leak.
#[test]
fn both_modes_publish_and_verify_under_the_same_key() {
    for i in 0..4u8 {
        let entropy = [i.wrapping_mul(53).wrapping_add(11); 16];
        let key = AccountKey::ed25519_from_entropy(&entropy).unwrap();
        let msg = ed_msg(i);
        let published = verifying_key(&key);

        for (what, sig) in [
            ("default", key.sign_message(&msg).unwrap()),
            ("unmasked", key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap()),
            ("fixed aux", key.sign_message_with(Hedge::FixedAux([0xA5; 32]), &msg).unwrap()),
            ("zero aux", key.sign_message_with(Hedge::FixedAux([0u8; 32]), &msg).unwrap()),
        ] {
            assert_canonical(&key, &msg, &sig, what);
            // ...and under nothing else. A signature that verifies under a key
            // the signer did not publish is the verifying-key-mismatch failure
            // the hazmat warning is about.
            let other = AccountKey::ed25519_from_entropy(&[i.wrapping_add(1); 16]).unwrap();
            let parsed = ed25519_dalek::Signature::from_slice(&sig).unwrap();
            assert!(
                verifying_key(&other).verify_strict(&msg, &parsed).is_err(),
                "{what}: verified under an unrelated key"
            );
            assert_ne!(published.to_bytes(), verifying_key(&other).to_bytes());
        }
    }
}

/// ⚠ **This test was called `..._and_no_caller_can_choose_it`, and its own doc
/// comment said it could not see that clause.** Both `REVIEW-025` external legs
/// named the contradiction. A name that asserts what the body cannot establish
/// is the defect `REVIEW-024` §4d found in `one_implementation_not_two`, and
/// leaving it in place while quoting that finding two paragraphs up is worse
/// than not knowing.
///
/// ⚠ **`REVIEW-024` §7 item 2 is STRUCTURAL and this test cannot see it.**
///
/// *"The verifying key is derived inside that helper. It is never a parameter
/// this signer accepts."* What enforces that is the **signature of
/// `AccountKey::sign_with_aux`**, which takes `Option<Zeroizing<[u8; 32]>>` and a
/// message and nothing else — there is no `VerifyingKey` for a caller to get wrong. A
/// black-box test cannot distinguish "derived internally" from "supplied
/// correctly by every caller so far", which is precisely the trap
/// `one_implementation_not_two` fell into (`REVIEW-024` §4d).
///
/// What IS checkable, and is the observable consequence: the key a signature
/// verifies under is exactly the key the signer publishes, over many keys.
///
/// ⚠ This ended *"if a caller-supplied verifying key were ever threaded in, this
/// is what would move"* — **which overstates it in exactly the way the sentence
/// above disclaims.** A caller threading in the *correct* seed-derived key would
/// be invisible here. This test moves when the key is **wrong**, not when it
/// becomes a parameter. `REVIEW-026`, Codex leg.
#[test]
fn every_signature_verifies_under_the_seed_derived_published_key() {
    for i in 0..16u8 {
        let key = AccountKey::ed25519_from_entropy(&[i; 16]).unwrap();
        let msg = ed_msg(i);
        let sig = key.sign_message(&msg).unwrap();
        let parsed = ed25519_dalek::Signature::from_slice(&sig).unwrap();
        let derived = ed25519_dalek::SigningKey::from_bytes(&xrpl::sha512half(&[i; 16])).verifying_key();

        assert_eq!(derived.to_bytes()[..], key.public()[1..], "published key drifted from the seed at i={i}");
        derived.verify_strict(&msg, &parsed).expect("did not verify under the key derived from the seed");
    }
}

// ---------------------------------------------------------------------------
// The construction itself, against a SECOND MODEL — see the caveat below on
// which half of it a third party actually controls
// ---------------------------------------------------------------------------

/// **The production constant, pinned against a literal written out here.**
///
/// ⚠ The equality that matters is `xrpl::ED25519_NONCE_HEDGE_DST == RULED_DST`.
/// Without it this test compared `RULED_DST` to the identical literal and could
/// not have noticed any edit to `xrpl.rs` at all.
#[test]
fn the_dst_is_the_ruled_bytes() {
    assert_eq!(RULED_DST.len(), 29, "REVIEW-024 section 3 fixes the DST at 29 bytes");
    assert_eq!(RULED_DST[28], 0x00, "the trailing NUL is part of the tag");
    assert_eq!(
        &xrpl::ED25519_NONCE_HEDGE_DST[..],
        RULED_DST,
        "the domain separator in xrpl.rs is not the one REVIEW-024 section 3 ruled"
    );
}

/// ⚠ **The KAT, and it is what makes every test above more than self-consistent.**
///
/// Everything else in this file checks the signer against itself: that two arms
/// differ, that one reproduces, that the output verifies. **All of it would pass
/// on a wrong-but-consistent construction** — a mask over the wrong 32 bytes of
/// the SHA-512 output, a DST concatenated in the other order, `q ‖ M` written
/// `M ‖ q`.
///
/// `tools/spike-b16-2026-08-27/t-ed25519-hedge-construction.ts` implements
/// `REVIEW-024` §3 from the prose, in TypeScript, against `@noble/curves@1.9.7`
/// — a different curve library by a different author — writing out the scalar
/// arithmetic rather than calling anything that already knows RFC 8032. Its own
/// control is that with the mask omitted it reproduces `@noble`'s `ed25519.sign`
/// byte for byte, which is a **third** implementation, and it refuses to emit a
/// vector if that fails.
///
/// This is the discipline `tests/keygen_kat.rs` and `tests/r_and_rho_kat.rs`
/// apply to the other ruled derivations, for the reason `CLAIMS.md` E-72
/// records: the value written from recollection was the *test*, not the code.
///
/// ⚠ **Called `..._an_independent_implementation` for one commit, and that was
/// an overclaim.** `REVIEW-025`'s Codex leg: the curve library is external, but
/// **the model and its vectors were written by this project, in this change**.
/// It is cross-implementation *consistency*, not independent authorship and not
/// an independent review. The name says "a second model" now.
///
/// ⚠ **And the two arms are not equally defended, which nothing said.** The
/// generator's control establishes the *arithmetic*, because `@noble`'s own
/// `ed25519.sign` is a genuine third implementation of RFC 8032. **No third
/// third-party implementation of this combiner is present in the evidence
/// checked** — ⚠ **narrowed under P-12 in round two.** It said *"no third party
/// computes a W-CONF-hedged signature"*, justified as a deduction from the
/// combiner having been defined here on 2026-08-27. **Originating somewhere does
/// not prove absent everywhere**, and P-12 governs the claim whichever way it is
/// argued (`REVIEW-026`, Codex leg). What is checked: the packages this
/// repository depends on. That is why the mask rests on two readings of the same
/// prose — one in Rust, one in TypeScript, both this
/// project's. A shared arithmetic error is ruled out; a shared misreading of §3
/// is not. The revert sweep breaking byte order, concatenation order and
/// hash-half individually is what narrows that, and it is not the same as an
/// outside check.
///
/// If the vectors file is missing this **fails**. It does not skip.
#[test]
fn the_construction_matches_a_second_model() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../tools/spike-b16-2026-08-27/ed25519-hedge-vectors.json");
    let raw = std::fs::read_to_string(&path).unwrap_or_else(|e| {
        panic!(
            "cannot read {}: {e}\n\
             Regenerate with: bun run tools/spike-b16-2026-08-27/t-ed25519-hedge-construction.ts\n\
             This test does not skip when its evidence is missing.",
            path.display()
        )
    });
    let v: serde_json::Value = serde_json::from_str(&raw).expect("vectors are not valid JSON");

    assert_eq!(
        v["dst_hex"].as_str().unwrap(),
        xrpl::hex(RULED_DST),
        "the independent implementation used a different domain separator"
    );

    let vectors = v["vectors"].as_array().expect("no vectors array");
    assert!(vectors.len() >= 8, "expected at least 8 vectors, got {}", vectors.len());

    let mut masked = 0usize;
    let mut unmasked = 0usize;
    for vec in vectors {
        let name = vec["name"].as_str().unwrap();
        let entropy = xrpl::unhex(vec["entropy"].as_str().unwrap()).unwrap();
        let message = xrpl::unhex(vec["message"].as_str().unwrap()).unwrap();
        let key = AccountKey::ed25519_from_entropy(&entropy).unwrap();

        assert_eq!(
            xrpl::hex(&key.public()[1..]),
            vec["public_key"].as_str().unwrap(),
            "{name}: public key"
        );

        let hedge = match vec["aux"].as_str() {
            None => {
                unmasked += 1;
                Hedge::DeterministicForVectors
            }
            Some(a) => {
                masked += 1;
                let mut aux = [0u8; 32];
                aux.copy_from_slice(&xrpl::unhex(a).unwrap());
                Hedge::FixedAux(aux)
            }
        };

        let sig = key.sign_message_with(hedge, &message).unwrap();
        assert_eq!(xrpl::hex(&sig), vec["signature"].as_str().unwrap(), "{name}: signature (second model)");
        assert_eq!(xrpl::hex(&sig[..32]), vec["R"].as_str().unwrap(), "{name}: R");
        assert_canonical(&key, &message, &sig, name);
    }

    // ⚠ A vectors file of eight unmasked cases would pass every assertion above
    // and would check nothing about the hedge. Both arms must be present.
    assert!(masked >= 4, "only {masked} masked vectors; the hedge is barely covered");
    assert!(unmasked >= 1, "no unmasked vector; the RFC 8032 claim is not covered");
    // ⚠ Named here as well as in the doc: what this compares against is a SECOND
    // MODEL written by this project, not an independent implementation. Only the
    // unmasked arm has a third-party control (`@noble`). REVIEW-025 and -026.
}

// ---------------------------------------------------------------------------
// `CLAIMS.md` B-19 — decided 2026-08-27, and NOT for the nonce ruling's reasons
// ---------------------------------------------------------------------------

/// ⚠⚠ **THIS DOC SAID ITS ONLY JOB WAS TO FAIL TO COMPILE IF THE MANIFEST LINE
/// WAS REVERTED. THAT IS FALSE — `CLAIMS.md` E-171.**
///
/// Reverting `features = [.., "zeroize"]` **compiles**, because `std` implies
/// `alloc` and `alloc` lists `"zeroize/alloc"` without the `?` sigil that
/// `serde?/alloc` beside it carries. The feature was never off, so this test
/// never depended on the word B-19 added.
///
/// **What this test does, and it is worth having:** it asserts the two types
/// really are `ZeroizeOnDrop` in the build that ships. That is the property
/// anyone cares about. What it is **not** is a check on B-19's edit, and it was
/// documented as one in three places for a day — `CLAIMS.md` E-167, the decision
/// document, and here. **A test named for a property, one layer away from where
/// the property is decided** (E-161, E-164), at the manifest layer.
///
/// The feature-resolution check is `tools/check-zeroize-bounds.py` part 1, which
/// builds a scratch crate at four feature sets and requires the empty one to
/// FAIL — without that control "it compiles" says nothing.
///
/// ~~`ed25519-dalek`'s `default-features = false, features = ["std"]` left
/// `zeroize` off — a crate default — so `ExpandedSecretKey` and `SigningKey` were
/// not wiped on drop while `hazmat.rs:39` promised unconditionally that they
/// were.~~ ⚠⚠ **FALSE — E-171, and this paragraph sat DIRECTLY BELOW the banner
/// that corrects it for one whole round.** `["std"]` resolves to
/// `alloc,std,zeroize`. `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`
/// made an already-enabled feature explicit.
///
/// The `ZeroizeOnDrop` impls exist **only** under that feature
/// (`hazmat.rs:75-76`, `signing.rs:665-666`), so naming the bound is what says
/// the feature is on — ⚠ **it does not say which manifest line turned it on**,
/// and that distinction is the whole of E-171.
///
/// ⚠ **A runtime "is the buffer zero now?" assertion was considered and
/// rejected**: reading freed stack memory is undefined behaviour and would pass
/// or fail for reasons unrelated to the feature. `CLAIMS.md` E-108's rule — *a
/// revert that does not compile proves nothing* — inverts for a `Drop`-carrying
/// type, because the compile failure IS the proof. ⚠ **But only if somebody
/// produces one.** `make check-zeroize-bounds` produces it for B-21's three
/// locals; for B-19 it produces the opposite, which is E-171.
///
/// ⚠ **Renamed from `ed25519_secret_material_is_zeroized_on_drop`**, which
/// overstated it: this proves the two types implement the marker trait, and the
/// memory effect follows from the crate's `Drop` impls rather than from anything
/// this test observes. `REVIEW-025`, Codex leg.
///
/// ⚠ It does **not** claim the secret is unrecoverable. §4 of that decision says
/// what it does not buy: the crate's own `From<&SecretKey>` leaves an unwiped
/// SHA-512 local, the curve temporaries are outside any `Drop`, and an adversary
/// with code execution reads the scalar while it is live regardless.
/// ⚠ **B-21's locals are NOT checked here** — `sha512_zeroizing`, `fresh_aux`
/// and `OneShotAux` are all private, so their bounds are named in
/// `xrpl::aux_tests::the_wiping_helpers_return_types_wipe_on_drop`, in-crate,
/// and reverted for real by `make check-zeroize-bounds` part 2.
///
/// ⚠ **That test checks the TYPES, not that the signing path uses them** —
/// `check-zeroize-bounds` **part 3** is what catches the signing helper
/// dropping the call — ⚠ **a known-spelling regression check, not a guarantee
/// about the call sites, and this sentence claimed the latter for one round
/// (E-175)** — and it
/// exists because both `REVIEW-027` external legs found parts 1 and 2 blind to
/// them (E-173). ⚠ This sentence named the pre-rename test for one commit,
/// which is `REVIEW-026` finding 12's shape — *renamed the test, not its
/// references* — caught here by grepping for the phrase rather than the line.
#[test]
fn ed25519_secret_types_implement_zeroize_on_drop() {
    fn requires_zeroize_on_drop<T: zeroize::ZeroizeOnDrop>() {}
    requires_zeroize_on_drop::<ed25519_dalek::hazmat::ExpandedSecretKey>();
    requires_zeroize_on_drop::<ed25519_dalek::SigningKey>();
}
