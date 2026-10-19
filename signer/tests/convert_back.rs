//! `ConfidentialMPTConvertBack` — the facility's exit, architecture §6 step 7.
//!
//! # Why this file exists at all, and why it is not part of `falsifier.rs`
//!
//! Until 2026-08-24 this signer **refused ConvertBack by name**, and the
//! refusal was the right call for as long as it stood. `REVIEW-015` round three
//! found `parse` handing ConvertBack *Convert's* field set, and XLS-0096 §10.3
//! contradicts that in three places:
//!
//! | | Convert (§7.2) | ConvertBack (§10.3) |
//! |---|---|---|
//! | `ZKProof` | **optional**, 64 bytes, required only with a key | **required**, 816 bytes |
//! | `HolderEncryptionKey` | optional — this is how a key is registered | **not a field of this transaction** |
//! | `BalanceCommitment` | not a field | **required**, 33 bytes |
//!
//! A valid ConvertBack would have been rejected twice over — once for carrying
//! a `BalanceCommitment` the allowlist omitted, once for carrying a `ZKProof`
//! without a `HolderEncryptionKey` — and an invalid one, carrying a key this
//! transaction cannot register, accepted.
//!
//! So the tests here are **negative first**. Each of the three differences gets
//! an assertion that fails if the two field sets are ever collapsed back
//! together, because that is the mistake that has actually been made once.
//! `CLAIMS.md` E-96.
//!
//! # What is NOT established here
//!
//! Acceptance by this project's own library says nothing about acceptance by
//! the ledger. `tests/prover_pristine.rs` puts the 816-byte proof in front of
//! the **pristine upstream** verifier, and Devnet is what says the wire format
//! is right. Neither of those lives in this file.

use wconf_signer::txn::{AmountView, ParsedTransaction, TxType};
use wconf_signer::xrpl;

#[path = "support/mod.rs"]
mod support;
use support::*;

const CB: &str = "ConfidentialMPTConvertBack";

/// Drive a ConvertBack through the whole signing path and hand back the decoded
/// blob. `fixture_registered` because §10.4.2 item 3 requires a registered key.
fn signed_convert_back(amount: &str) -> (serde_json::Value, Vec<u8>, Recorder) {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, amount, &mut c);
    assert_eq!(v["status"], "signed", "{v}");
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    (v, blob, c)
}

// ---------------------------------------------------------------------------
// The field set, against §10.3 rather than against Convert
// ---------------------------------------------------------------------------

/// Every field §10.3 requires is present, and the two Convert carries that
/// §10.3 does not are absent.
#[test]
fn a_convert_back_carries_exactly_the_fields_section_10_3_requires() {
    let (_, blob, _) = signed_convert_back("250");
    let d = xrpl::decode(&blob).unwrap();

    assert_eq!(d.u64(xrpl::MPT_AMOUNT), Some(250), "MPTAmount is required and public");
    assert_eq!(d.get(xrpl::HOLDER_ENCRYPTED_AMOUNT).map(<[u8]>::len), Some(66));
    assert_eq!(d.get(xrpl::ISSUER_ENCRYPTED_AMOUNT).map(<[u8]>::len), Some(66));
    assert_eq!(d.get(xrpl::BLINDING_FACTOR).map(<[u8]>::len), Some(32));

    // **The field the allowlist omitted.** Required by §10.3 and absent from
    // Convert entirely, so sharing Convert's arm rejected a valid transaction.
    assert_eq!(
        d.get(xrpl::BALANCE_COMMITMENT).map(<[u8]>::len),
        Some(33),
        "BalanceCommitment is REQUIRED on a ConvertBack — this is the field the shared \
         allowlist left out"
    );

    // **816, not 64.** A Convert's ZKProof is a Schnorr PoK; this one is a
    // 128-byte compact sigma proof plus a 688-byte single Bulletproof.
    assert_eq!(
        d.get(xrpl::ZK_PROOF).map(<[u8]>::len),
        Some(816),
        "the ZKProof is not 816 bytes; §10.3 fixes the size"
    );

    // **Negative.** A ConvertBack cannot register a key, and a transaction that
    // carried one would be a transaction this signer has no business building.
    assert!(
        d.get(xrpl::HOLDER_ENCRYPTION_KEY).is_none(),
        "a ConvertBack carries no HolderEncryptionKey — §10.3 has no such field"
    );
    // A ConvertBack has no counterparty. `AmountCommitment` is a Send field.
    assert!(d.get(xrpl::DESTINATION).is_none(), "a ConvertBack has no Destination");
    assert!(d.get(xrpl::AMOUNT_COMMITMENT).is_none(), "AmountCommitment is a Send field");
}

/// `parse` refuses a ConvertBack carrying a `HolderEncryptionKey`.
///
/// This is difference 1, as a **negative assertion**: only those catch a field
/// set coming back. Under Convert's allowlist this transaction parsed fine.
#[test]
fn parse_refuses_a_convert_back_that_carries_a_holder_encryption_key() {
    let (_, blob, _) = signed_convert_back("100");
    let d = xrpl::decode(&blob).unwrap();
    let mut b = rebuild(&d);
    b = b.blob(xrpl::HOLDER_ENCRYPTION_KEY, &[2u8; 33]);
    let err = ParsedTransaction::parse(&b.serialize(false).unwrap()).unwrap_err();
    assert!(
        err.contains("may not carry"),
        "a ConvertBack carrying a HolderEncryptionKey was accepted: {err}"
    );
}

/// Difference 2: the `ZKProof` is **required**, which an allowlist cannot say.
#[test]
fn parse_refuses_a_convert_back_with_no_zk_proof() {
    let (_, blob, _) = signed_convert_back("100");
    let d = xrpl::decode(&blob).unwrap();
    let bytes = rebuild_without(&d, xrpl::ZK_PROOF).serialize(false).unwrap();
    let err = ParsedTransaction::parse(&bytes).unwrap_err();
    assert!(
        err.contains("must carry a ZKProof"),
        "a ConvertBack with no proof was accepted: {err}"
    );
}

/// ⚠ **§10.3's REQUIRED fields, one removed at a time — and the fixed sizes.**
///
/// An allowlist says what a transaction *may* carry. It cannot say what it
/// *must*, and it cannot say how long. `REVIEW-021`'s Codex leg found that a
/// ConvertBack with no `MPTAmount`, no `BlindingFactor`, no `BalanceCommitment`
/// or a `ZKProof` of any length reached the confirmation screen
/// (`CLAIMS.md` E-138).
///
/// ⚠ **The typed builder cannot produce one today**, which is exactly why this
/// needed a test rather than an argument: the parse-back boundary exists so the
/// confirmation trusts the **bytes** and not the construction, and a boundary
/// that relies on the construction being right is not one.
#[test]
fn parse_refuses_a_convert_back_missing_any_field_section_10_3_requires() {
    let (_, blob, _) = signed_convert_back("100");
    let d = xrpl::decode(&blob).unwrap();

    for (field, expect) in [
        (xrpl::MPT_AMOUNT, "must carry MPTAmount"),
        (xrpl::BLINDING_FACTOR, "must carry BlindingFactor"),
        (xrpl::BALANCE_COMMITMENT, "must carry BalanceCommitment"),
        (xrpl::ZK_PROOF, "must carry a ZKProof"),
    ] {
        let bytes = rebuild_without(&d, field).serialize(false).unwrap();
        let err = ParsedTransaction::parse(&bytes).unwrap_err();
        assert!(
            err.contains(expect),
            "a ConvertBack with no {:?} parsed, or failed for the wrong reason: {err}",
            expect
        );
    }
}

/// The **sizes**, which are the half an allowlist can never express.
#[test]
fn parse_refuses_a_convert_back_whose_fixed_size_fields_are_the_wrong_length() {
    let (_, blob, _) = signed_convert_back("100");
    let d = xrpl::decode(&blob).unwrap();

    // A 40-byte proof is not an 816-byte bundle, and a confirmation that
    // rendered `proof 40 bytes` would tell a holder nothing was wrong.
    let short = rebuild_without(&d, xrpl::ZK_PROOF).blob(xrpl::ZK_PROOF, &[7u8; 40]);
    let err = ParsedTransaction::parse(&short.serialize(false).unwrap()).unwrap_err();
    assert!(err.contains("816"), "a 40-byte ZKProof was accepted: {err}");

    let long = rebuild_without(&d, xrpl::BALANCE_COMMITMENT)
        .blob(xrpl::BALANCE_COMMITMENT, &[7u8; 34]);
    let err = ParsedTransaction::parse(&long.serialize(false).unwrap()).unwrap_err();
    assert!(err.contains("33"), "a 34-byte BalanceCommitment was accepted: {err}");
}

/// Difference 3, from the other side: a `BalanceCommitment` on a **Convert** is
/// still refused. The allowlists must not converge in either direction.
#[test]
fn a_convert_may_still_not_carry_a_balance_commitment() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTConvert", None, "100", &mut c);
    assert_eq!(v["status"], "signed", "{v}");
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = xrpl::decode(&blob).unwrap();
    let b = rebuild(&d).blob(xrpl::BALANCE_COMMITMENT, &[3u8; 33]);
    let err = ParsedTransaction::parse(&b.serialize(false).unwrap()).unwrap_err();
    assert!(err.contains("may not carry"), "a Convert carrying a BalanceCommitment parsed: {err}");
}

// ---------------------------------------------------------------------------
// What the transaction actually encrypts
// ---------------------------------------------------------------------------

/// The holder can read the amount out of the transaction's own ciphertext with
/// `sk_A`, and every ciphertext shares one `C₁`.
///
/// ⚠ **`BlindingFactor` is checked HERE only for presence and length.** The
/// check that matters — that the published `r` reconstructs every ciphertext
/// from the plaintext `MPTAmount`, which is what rippled runs at §10.4.2 item 6
/// — needs `r` as a [`wconf_signer::scalar::Scalar`], and there is deliberately
/// **no way to build one from bytes**: a `Scalar` exists only as the output of
/// a reduction, which is what stops a caller supplying one. So that assertion
/// lives in `tests/prover_pristine.rs`, where `r` is a real derived scalar,
/// rather than being bought here by widening a type boundary for a test.
#[test]
fn the_holder_can_decrypt_the_amount_out_of_the_convert_back_it_signed() {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, "321", &mut c);
    assert_eq!(v["status"], "signed", "{v}");
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = xrpl::decode(&blob).unwrap();

    let holder_ct: [u8; 66] = d.get(xrpl::HOLDER_ENCRYPTED_AMOUNT).unwrap().try_into().unwrap();
    let issuer_ct: [u8; 66] = d.get(xrpl::ISSUER_ENCRYPTED_AMOUNT).unwrap().try_into().unwrap();
    assert_eq!(
        wconf_signer::prover::decrypt(&holder_ct, f.session.holder().elgamal.secret(), 0, 1000)
            .unwrap(),
        321
    );
    assert_eq!(
        &holder_ct[..33],
        &issuer_ct[..33],
        "the ciphertexts do not share one C1; a mismatched C1 is what lets an observer \
         recover the difference between two hidden amounts"
    );
    assert_eq!(d.get(xrpl::BLINDING_FACTOR).unwrap().len(), 32);
}

/// ⚠ `CLAIMS.md` **P-9**: the issuer mirror is not optional and no
/// configuration removes it. Asserted by **decrypting** it, because a test that
/// only checked the field was present would pass on a ciphertext under the
/// wrong key — which is the failure `REVIEW-015b` found on the Send side.
#[test]
fn the_issuer_can_decrypt_a_convert_back_it_was_never_party_to() {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, "654", &mut c);
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = xrpl::decode(&blob).unwrap();
    let issuer_ct: [u8; 66] = d.get(xrpl::ISSUER_ENCRYPTED_AMOUNT).unwrap().try_into().unwrap();
    assert_eq!(
        wconf_signer::prover::decrypt(&issuer_ct, f.issuer.secret(), 0, 1000).unwrap(),
        654,
        "the issuer's mirror ciphertext does not decrypt to the amount"
    );
}

/// An issuance with an `AuditorEncryptionKey` makes the auditor's ciphertext
/// **required** (§10.4.2 item 4).
///
/// ⚠ This is the shape that had no coverage on the Send side and hid a CRITICAL
/// defect there — a four-participant proof serialised with three ciphertexts,
/// found independently by both `REVIEW-015` legs. It gets a test here on the
/// first day rather than after a review finds it.
#[test]
fn an_auditor_issuance_puts_a_decryptable_auditor_ciphertext_on_the_convert_back() {
    let mut f = fixture_with_auditor();
    // The auditor fixture is not registered by default; a ConvertBack needs a
    // key on the ledger, so put this holder's own key there.
    let pk = wconf_signer::prover::hex(f.session.holder().elgamal.public());
    f.ledger.lock().unwrap().mptokens.get_mut(TEST_ADDRESS).unwrap().holder_key = Some(pk);

    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, "99", &mut c);
    assert_eq!(v["status"], "signed", "{v}");
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = xrpl::decode(&blob).unwrap();
    let auditor_ct: [u8; 66] = d
        .get(xrpl::AUDITOR_ENCRYPTED_AMOUNT)
        .expect("an auditor issuance REQUIRES AuditorEncryptedAmount — tecNO_PERMISSION without it")
        .try_into()
        .unwrap();
    let auditor = f.auditor.as_ref().unwrap();
    assert_eq!(wconf_signer::prover::decrypt(&auditor_ct, auditor.secret(), 0, 1000).unwrap(), 99);

    assert!(
        c.last().contains("auditor      PRESENT"),
        "the confirmation does not tell the holder a third party can decrypt this:\n{}",
        c.last()
    );
}

// ---------------------------------------------------------------------------
// The confirmation
// ---------------------------------------------------------------------------

/// The amount is **public** on a ConvertBack, and the confirmation says which
/// kind of number it is showing.
///
/// ⚠ **This is the opposite of a Send and the difference is the disclosure.** A
/// Send's amount is decrypted out of a ciphertext; a ConvertBack's is on the
/// wire in the clear and becomes a public balance. Rendering them identically
/// would tell a holder that a public withdrawal is confidential.
#[test]
fn the_confirmation_says_the_convert_back_amount_is_public() {
    let (_, _, c) = signed_convert_back("250");
    let shown = c.last();
    let line = shown.lines().find(|l| l.trim_start().starts_with("amount")).unwrap();
    assert!(line.contains("250"), "{line}");
    assert!(line.contains("PUBLIC"), "the amount line does not say it is public: {line}");
    assert!(
        !line.contains("decrypted from"),
        "a ConvertBack's amount is NOT decrypted from a ciphertext: {line}"
    );
    assert!(
        shown.contains("this amount, which becomes a public balance"),
        "the disclosure does not say the amount becomes public:\n{shown}"
    );
    // A ConvertBack has no counterparty, and saying it has one would be a lie.
    assert!(shown.contains("no counterparty"), "{shown}");
    // **Negative**: a ConvertBack registers nothing, so the registration
    // warning must not appear. A screen that shouts on every transaction is a
    // screen nobody reads.
    assert!(
        !shown.contains("REGISTERS YOUR ENCRYPTION KEY"),
        "the registration warning appeared on a transaction that registers nothing:\n{shown}"
    );
}

// ---------------------------------------------------------------------------
// Refusals — every one of them before entropy is drawn
// ---------------------------------------------------------------------------

/// §10.4.2 item 3: a holder with no registered `HolderEncryptionKey` has
/// nothing to prove ownership against.
///
/// ⚠ **This is the one condition a ConvertBack has that a Send never reaches.**
/// `holder_key_is` answers `None` when nothing is registered, and `None` is a
/// *pass* — correctly, because the initialising Convert is exactly that state.
/// Without the check below, a ConvertBack would inherit that pass.
#[test]
fn a_convert_back_from_an_account_with_no_registered_key_is_refused() {
    let mut f = fixture(); // unregistered
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, "10", &mut c);
    assert_eq!(v["code"], "REFUSED_MALFORMED", "{v}");
    assert!(
        v["detail"].as_str().unwrap().contains("no HolderEncryptionKey is registered"),
        "{v}"
    );
    assert!(c.seen.is_empty(), "a refused ConvertBack reached the confirmation");
    assert_eq!(ledger_len(&store_of(&f)), 0, "a refusal before entropy must reserve nothing");
}

/// Over the balance. The range proof is over the **remainder**, and there is no
/// non-negative remainder to prove.
#[test]
fn a_convert_back_above_the_confidential_balance_is_refused_before_entropy() {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, &(BALANCE + 1).to_string(), &mut c);
    assert_eq!(v["code"], "REFUSED_MALFORMED", "{v}");
    assert!(v["detail"].as_str().unwrap().contains("exceeds the confidential balance"), "{v}");
    assert_eq!(ledger_len(&store_of(&f)), 0, "a refusal before entropy must reserve nothing");
}

/// Exactly the balance is allowed. The remainder is zero, and zero is in range.
#[test]
fn a_convert_back_of_the_entire_balance_is_allowed() {
    let (_, blob, _) = signed_convert_back(&BALANCE.to_string());
    let d = xrpl::decode(&blob).unwrap();
    assert_eq!(d.u64(xrpl::MPT_AMOUNT), Some(BALANCE));
}

/// §10.4.2 item 5: the issuance's public `ConfidentialOutstandingAmount` is
/// decremented, and the ledger answers `tecINSUFFICIENT_FUNDS` if it would go
/// negative.
#[test]
fn a_convert_back_above_the_issuance_confidential_outstanding_is_refused() {
    let mut f = fixture_registered();
    f.ledger.lock().unwrap().confidential_outstanding = 5;
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, "6", &mut c);
    assert_eq!(v["code"], "REFUSED_MALFORMED", "{v}");
    assert!(
        v["detail"].as_str().unwrap().contains("ConfidentialOutstandingAmount"),
        "the refusal does not name the field it checked: {v}"
    );
    assert_eq!(ledger_len(&store_of(&f)), 0);
}

/// ⚠ **`ConfidentialOutstandingAmount` is a JSON string, and reading it as a
/// number sees every value as zero.**
///
/// The control for the test above: with the same amount and an *adequate*
/// outstanding, the transaction signs. Without this, a reader that parsed the
/// field as absent would make the refusal above fire for the wrong reason and
/// look like a working check.
#[test]
fn the_confidential_outstanding_check_is_not_reading_every_value_as_zero() {
    let mut f = fixture_registered();
    f.ledger.lock().unwrap().confidential_outstanding = 6;
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, "6", &mut c);
    assert_eq!(v["status"], "signed", "an adequate outstanding amount was read as insufficient: {v}");
}

/// A zero-amount ConvertBack is `temBAD_AMOUNT` (§10.4.1 item 5) — unlike a
/// Convert, where zero is the opt-in, and unlike a Send, where zero is the
/// proposed cover traffic. Three transaction types, three answers about zero.
#[test]
fn a_zero_amount_convert_back_is_refused() {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, "0", &mut c);
    assert_eq!(v["code"], "REFUSED_MALFORMED", "{v}");
}

/// A ConvertBack has no counterparty, and a client that supplies one is
/// **refused** rather than quietly ignored: it believes it is sending somewhere.
#[test]
fn a_convert_back_with_a_destination_is_refused() {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, Some(DEST_ADDRESS), "10", &mut c);
    assert_eq!(v["code"], "REFUSED_MALFORMED", "{v}");
    assert!(v["detail"].as_str().unwrap().contains("carries no destination"), "{v}");
}

/// The grant is scoped, and a Send grant does not authorise a ConvertBack.
#[test]
fn a_send_grant_does_not_authorise_a_convert_back() {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, CB, None, "10", &mut c);
    assert_eq!(v["code"], "REFUSED_UNAUTHORIZED", "{v}");
}

/// A declined confirmation **burns** the reservation rather than clearing it —
/// amendment A7, on the newest path.
#[test]
fn a_declined_convert_back_burns_its_reservation() {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &[CB]);
    let mut c = Recorder::declining();
    let v = prepare(&mut f.session, &grant, CB, None, "10", &mut c);
    assert_eq!(v["code"], "REFUSED_DECLINED_BY_HOLDER", "{v}");
    assert!(ledger_len(&store_of(&f)) > 0, "a declined attempt recorded nothing");
}

/// Two ConvertBacks in a byte-identical context still draw different
/// randomness. The KDF binds fresh entropy, so an identical context is not an
/// identical scalar — and `r` is **published**, so a repeat is E-63.
#[test]
fn two_convert_backs_never_share_a_c1() {
    let mut seen = std::collections::HashSet::new();
    for _ in 0..3 {
        let (_, blob, _) = signed_convert_back("7");
        let d = xrpl::decode(&blob).unwrap();
        let ct = d.get(xrpl::HOLDER_ENCRYPTED_AMOUNT).unwrap();
        assert!(seen.insert(ct[..33].to_vec()), "two ConvertBacks published the same C1");
    }
}

/// The parsed view of a ConvertBack, as the confirmation sees it.
#[test]
fn a_parsed_convert_back_reports_a_public_amount_and_no_registration() {
    let (_, blob, _) = signed_convert_back("55");
    let p = ParsedTransaction::parse(&blob).unwrap();
    assert_eq!(p.tx_type, TxType::ConvertBack);
    assert_eq!(p.amount, AmountView::Public(55));
    assert_eq!(p.destination, None);
    assert_eq!(p.registers_encryption_key, None);
    assert_eq!(p.proof_len, 816);
    assert!(p.published_blinding_factor.is_some());
    assert_eq!(p.network_id, None, "Devnet transactions must not carry NetworkID");
}

// ---------------------------------------------------------------------------
// Rebuilding a decoded transaction so a field can be added or removed.
// ---------------------------------------------------------------------------

fn rebuild(d: &xrpl::Decoded) -> xrpl::TxBuilder {
    rebuild_inner(d, None)
}

fn rebuild_without(d: &xrpl::Decoded, drop: xrpl::FieldDef) -> xrpl::TxBuilder {
    rebuild_inner(d, Some(drop))
}

/// ⚠ **`TxnSignature` is dropped deliberately.** These tests hand the result to
/// `parse`, which does not verify signatures, and re-signing a mutated
/// transaction would be testing the mutation rather than the parser.
///
/// ⚠ **This list must cover EVERY field the signer can emit, and the assertion
/// below is what enforces it.** The first version hard-coded a list and
/// silently skipped anything absent from it — so on a Send it dropped
/// `Destination`, `SenderEncryptedAmount`, `DestinationEncryptedAmount` and
/// `AmountCommitment`, and a test built on it would have been asserting a
/// parser refusal caused by the *missing* fields rather than by the field under
/// test. A helper that quietly drops input is the `t-nbound.c` failure mode
/// `REVIEW-009` §8 found: every assertion built on it becomes vacuous while
/// looking fully exercised. **Found by `REVIEW-021`'s round-one self-check and
/// by neither leg** (`CLAIMS.md` E-135).
const REBUILDABLE: [xrpl::FieldDef; 20] = [
    xrpl::TRANSACTION_TYPE,
    xrpl::ACCOUNT,
    xrpl::DESTINATION,
    xrpl::MPT_ISSUANCE_ID,
    xrpl::SEQUENCE,
    xrpl::FLAGS,
    xrpl::LAST_LEDGER_SEQUENCE,
    xrpl::FEE,
    xrpl::MPT_AMOUNT,
    xrpl::HOLDER_ENCRYPTED_AMOUNT,
    xrpl::ISSUER_ENCRYPTED_AMOUNT,
    xrpl::AUDITOR_ENCRYPTED_AMOUNT,
    xrpl::SENDER_ENCRYPTED_AMOUNT,
    xrpl::DESTINATION_ENCRYPTED_AMOUNT,
    xrpl::AMOUNT_COMMITMENT,
    xrpl::BLINDING_FACTOR,
    xrpl::BALANCE_COMMITMENT,
    xrpl::ZK_PROOF,
    xrpl::HOLDER_ENCRYPTION_KEY,
    xrpl::SIGNING_PUB_KEY,
];

fn rebuild_inner(d: &xrpl::Decoded, drop: Option<xrpl::FieldDef>) -> xrpl::TxBuilder {
    let key = |f: xrpl::FieldDef| (xrpl::type_code_of(f.kind), f.nth);
    let dropped = drop.map(key);
    let sig = key(xrpl::TXN_SIGNATURE);

    // **Refuse to drop anything silently.** Everything in the input must be
    // either rebuildable, the signature, or the field this call is removing on
    // purpose.
    for k in d.keys() {
        let known = REBUILDABLE.iter().any(|f| key(*f) == k) || k == sig;
        assert!(
            known,
            "rebuild cannot reproduce field (type {}, code {}), so it would drop it silently \
             and every assertion built on the result would be vacuous. Add it to REBUILDABLE.",
            k.0, k.1
        );
    }

    let mut b = xrpl::TxBuilder::new();
    for f in REBUILDABLE {
        if dropped == Some(key(f)) {
            continue;
        }
        let Some(raw) = d.get(f) else { continue };
        b = match f.kind {
            xrpl::Kind::UInt16 => b.u16(f, d.u16(f).unwrap()),
            xrpl::Kind::UInt32 => b.u32(f, d.u32(f).unwrap()),
            xrpl::Kind::UInt64 => b.u64(f, d.u64(f).unwrap()),
            xrpl::Kind::Amount => b.drops(f, d.drops(f).unwrap()),
            xrpl::Kind::AccountId => b.account(f, &d.account(f).unwrap()),
            xrpl::Kind::Hash(_) => b.hash(f, raw),
            xrpl::Kind::Blob => b.blob(f, raw),
        };
    }
    b
}

/// ⚠ **A test helper that silently drops a field makes every test using it
/// vacuous** — the `t-nbound.c` failure `REVIEW-009` §8 found.
///
/// `rebuild` must reproduce the transaction it was given, exactly. Without
/// this, `parse_refuses_a_convert_back_that_carries_a_holder_encryption_key`
/// could be passing because the rebuilt bytes are *missing* something rather
/// than because the forbidden field was added.
#[test]
fn the_rebuild_helper_round_trips_and_is_not_quietly_dropping_fields() {
    for (op, dest) in [(CB, None), ("ConfidentialMPTSend", Some(DEST_ADDRESS))] {
        // Both arms need a registered key: ConvertBack requires one, and a Send
        // is unaffected by having one. This read as a ternary with two
        // identical branches, which implied a divergence that does not exist —
        // `REVIEW-021` round two, Gemini finding 3.
        let mut f = fixture_registered();
        let grant = pair(&mut f.session, &[op]);
        let mut c = Recorder::approving();
        let v = prepare(&mut f.session, &grant, op, dest, "17", &mut c);
        assert_eq!(v["status"], "signed", "{op}: {v}");
        let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
        let original = ParsedTransaction::parse(&blob).unwrap();

        let rebuilt = rebuild(&xrpl::decode(&blob).unwrap()).serialize(false).unwrap();
        let back = ParsedTransaction::parse(&rebuilt)
            .unwrap_or_else(|e| panic!("{op}: the rebuild helper produced bytes that do not parse: {e}"));

        // Every field the confirmation renders must survive the round trip.
        assert_eq!(back.tx_type, original.tx_type, "{op}");
        assert_eq!(back.account, original.account, "{op}");
        assert_eq!(back.destination, original.destination, "{op}");
        assert_eq!(back.issuance_id, original.issuance_id, "{op}");
        assert_eq!(back.amount, original.amount, "{op}");
        assert_eq!(back.own_ciphertext, original.own_ciphertext, "{op}");
        assert_eq!(back.c1, original.c1, "{op}");
        assert_eq!(back.published_blinding_factor, original.published_blinding_factor, "{op}");
        assert_eq!(back.has_auditor, original.has_auditor, "{op}");
        assert_eq!(back.proof_len, original.proof_len, "{op}");
        assert_eq!(back.sequence, original.sequence, "{op}");
        assert_eq!(back.fee_drops, original.fee_drops, "{op}");
        assert_eq!(back.last_ledger_sequence, original.last_ledger_sequence, "{op}");
        assert_eq!(back.network_id, original.network_id, "{op}");

        // ⚠ **The VALUES of every surviving field, not just the field names.**
        // This compared only the key SET while its comment said *"And the
        // BYTES"* — so a helper that kept every field and changed one of their
        // values would have passed. `REVIEW-021` round two, `CLAIMS.md` E-144.
        let d0 = xrpl::decode(&blob).unwrap();
        let d1 = xrpl::decode(&rebuilt).unwrap();
        let mut k0: Vec<(u16, u16)> = d0.keys();
        let sig = (xrpl::type_code_of(xrpl::TXN_SIGNATURE.kind), xrpl::TXN_SIGNATURE.nth);
        k0.retain(|k| *k != sig);
        let mut k1: Vec<(u16, u16)> = d1.keys();
        k0.sort_unstable();
        k1.sort_unstable();
        assert_eq!(k0, k1, "{op}: rebuild changed the FIELD SET, so every test using it is suspect");

        for key in &k0 {
            assert_eq!(
                d0.fields_at(*key),
                d1.fields_at(*key),
                "{op}: rebuild changed the VALUE of field (type {}, code {}) — the field set \
                 matching is not enough, and this test claimed byte equality it was not checking",
                key.0,
                key.1
            );
        }
    }
}
