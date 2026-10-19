//! The tests architecture §6 step 1 names, plus the ones §3 obliges.
//!
//! `CLAUDE.md`: *"Every capability claim needs a test that fails if the claim
//! is false."* Each test below states the claim it falsifies.
//!
//! **Rewritten 2026-08-18 against the real signing path.** Every `prepare`
//! here now generates a real proof through the vendored prover, reserves
//! identifiers in the A4–A9 randomness ledger, serialises canonical XRPL bytes
//! and produces a real ECDSA signature. The step 1 property did not change; the
//! thing it is asserted against did, and got harder to fake.

use std::time::Duration;
use wconf_signer::confirm::{self, Confirmer};
use wconf_signer::grant::{ConnectionId, GrantStore, MAX_TTL};
use wconf_signer::protocol::{Intent, Refusal};
use wconf_signer::txn::{self, AmountView, ParsedTransaction, TxType};

#[path = "support/mod.rs"]
mod support;
use support::*;

// ---------------------------------------------------------------------------
// THE named falsifier — architecture §6 step 1
//
//   "Falsified if: the confirmation renders client-supplied strings rather than
//    fields parsed from the transaction the signer itself built."
// ---------------------------------------------------------------------------

#[test]
fn confirmation_never_renders_what_the_client_claimed() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    // The attack REVIEW-003b describes: the application shows the holder one
    // thing and asks the signer for another.
    let req = serde_json::json!({
        "type": "prepare",
        "grant": grant,
        "operation": "ConfidentialMPTSend",
        "issuance_id": ISSUANCE,
        "destination": DEST_ADDRESS,
        "amount": "9999",
        "claimed": {
            "destination": "rPZMFStS23VctxSdKEKvoSKcnaKivWVC4i",
            "amount": "1",
            "issuance_id": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            "label": "Send 1 unit to Alice, routine settlement"
        }
    });

    let mut c = Recorder::approving();
    let resp = f.session.handle(req.to_string().as_bytes(), CONN, &mut c);
    let shown = c.last();

    for poison in [
        "rPZMFStS23VctxSdKEKvoSKcnaKivWVC4i",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "Send 1 unit to Alice",
        "routine settlement",
    ] {
        assert!(
            !shown.contains(poison),
            "the confirmation rendered a client-supplied string: {poison:?}\n--- shown ---\n{shown}"
        );
    }

    assert!(shown.contains(DEST_ADDRESS), "real destination missing:\n{shown}");
    assert!(shown.contains(ISSUANCE), "real issuance missing:\n{shown}");

    let amount_line = shown.lines().find(|l| l.trim_start().starts_with("amount")).unwrap();
    assert!(amount_line.contains("9999"), "amount line shows the wrong value: {amount_line}");
    assert_ne!(amount_line.split_whitespace().nth(1), Some("1"), "the claimed amount was rendered");

    let v = serde_json::to_value(&resp).unwrap();
    assert_eq!(v["status"], "signed", "{v}");
}

/// The amount is **not on the wire** in a Send, so the confirmation cannot read
/// it out of the fields. It decrypts the transaction's own ciphertext instead.
///
/// This is the sharpest form of the step 1 property: a signer that echoed the
/// request would show the same number here, and would show it even if the
/// ciphertext encrypted something else entirely. This test builds a
/// transaction, decrypts what it actually carries, and asserts *that* is what
/// the holder saw.
#[test]
fn the_confirmed_amount_is_decrypted_from_the_transaction_not_echoed() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "4321", &mut c);
    assert_eq!(v["status"], "signed", "{v}");

    // Take the signed blob apart independently and check what it encrypts.
    let blob = wconf_signer::xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = wconf_signer::xrpl::decode(&blob).unwrap();
    let sender_ct: [u8; 66] =
        d.get(wconf_signer::xrpl::SENDER_ENCRYPTED_AMOUNT).unwrap().try_into().unwrap();
    let recovered =
        wconf_signer::prover::decrypt(&sender_ct, f.session.holder().elgamal.secret(), 0, 5000)
            .unwrap();
    assert_eq!(recovered, 4321, "the ciphertext does not encrypt what was confirmed");

    let shown = c.last();
    assert!(shown.contains("4321"), "{shown}");
    assert!(
        shown.contains("decrypted from this transaction"),
        "the confirmation does not say where the amount came from:\n{shown}"
    );
}

/// The destination's ciphertext must **decrypt, under the destination's own
/// key**, to the amount the holder confirmed.
///
/// It previously only checked that the destination's and issuer's ciphertexts
/// differed, which is true of almost any bug (`REVIEW-015b`). Now it decrypts
/// both.
#[test]
fn the_destination_receives_the_amount_the_holder_confirmed() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "777", &mut c);

    let blob = wconf_signer::xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = wconf_signer::xrpl::decode(&blob).unwrap();
    let dest_ct: [u8; 66] =
        d.get(wconf_signer::xrpl::DESTINATION_ENCRYPTED_AMOUNT).unwrap().try_into().unwrap();
    let issuer_ct: [u8; 66] =
        d.get(wconf_signer::xrpl::ISSUER_ENCRYPTED_AMOUNT).unwrap().try_into().unwrap();

    assert_eq!(
        wconf_signer::prover::decrypt(&dest_ct, f.destination.secret(), 0, 2000).unwrap(),
        777,
        "the destination's ciphertext does not encrypt the confirmed amount"
    );

    // ⚠ `CLAIMS.md` P-9: the issuer mirror is not optional and no configuration
    // removes it. It is asserted here — and asserted to DECRYPT — because
    // pretending otherwise is the claim this repository exists to refuse.
    assert_eq!(
        wconf_signer::prover::decrypt(&issuer_ct, f.issuer.secret(), 0, 2000).unwrap(),
        777,
        "the issuer cannot decrypt the amount; P-9 says it always can"
    );
    assert_ne!(dest_ct, issuer_ct);
    assert!(c.last().contains("777"));
}

/// A four-participant Send: the auditor's ciphertext must be **on the wire**,
/// share the same `C₁`, and decrypt under the auditor's own key.
///
/// **Both `REVIEW-015` legs found this independently.** The proof was built
/// over four participants and the transaction carried three, so every Send on
/// an auditor-enabled issuance would have been unverifiable. It was invisible
/// because the Devnet test issuance has no auditor and no test had one either.
#[test]
fn an_auditor_enabled_issuance_puts_the_auditor_ciphertext_on_the_wire() {
    let mut f = fixture_with_auditor();
    let auditor = f.auditor.as_ref().expect("this fixture has an auditor").secret().to_owned();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "321", &mut c);
    assert_eq!(v["status"], "signed", "{v}");

    let blob = wconf_signer::xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = wconf_signer::xrpl::decode(&blob).unwrap();
    let aud_ct: [u8; 66] = d
        .get(wconf_signer::xrpl::AUDITOR_ENCRYPTED_AMOUNT)
        .expect("the auditor ciphertext is missing from the transaction")
        .try_into()
        .unwrap();
    let sender_ct = d.get(wconf_signer::xrpl::SENDER_ENCRYPTED_AMOUNT).unwrap();

    assert_eq!(&aud_ct[..33], &sender_ct[..33], "the auditor ciphertext has a different C1");
    assert_eq!(
        wconf_signer::prover::decrypt(&aud_ct, &auditor, 0, 2000).unwrap(),
        321,
        "the auditor cannot decrypt the amount"
    );

    // ⚠ And the confirmation must SAY so, which this test previously only
    // claimed in a comment while asserting that the blob re-parsed. Both
    // round-two legs called that a false pass, and they were right: nothing
    // rendered the auditor at all.
    let parsed = ParsedTransaction::parse(&blob).expect("the four-field Send does not re-parse");
    assert!(parsed.has_auditor, "the parsed transaction does not record the auditor");
    let shown = c.last();
    assert!(
        shown.contains("auditor"),
        "the confirmation does not mention the auditor:\n{shown}"
    );
    assert!(
        shown.to_lowercase().contains("third party can decrypt"),
        "the confirmation does not say what the auditor can do:\n{shown}"
    );
}

/// The same disclosure must be **absent** when there is no auditor.
///
/// A line that always appears carries no information, and would make the
/// assertion above pass for a signer that printed it unconditionally.
#[test]
fn a_send_without_an_auditor_does_not_claim_one() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    let blob = wconf_signer::xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    assert!(!ParsedTransaction::parse(&blob).unwrap().has_auditor);
    assert!(!c.last().to_lowercase().contains("third party can decrypt"), "{}", c.last());
}

/// A `Convert` on an auditor-enabled issuance must carry the auditor's
/// ciphertext too.
///
/// XLS-0096 §7.3.2 item 1: without it the transaction fails `tecNO_PERMISSION`.
/// ⚠ **A review leg proposed forbidding the field on Convert** as the fix for a
/// permissiveness finding. The spec requires it. A review finding is evidence,
/// not an instruction.
#[test]
fn a_convert_on_an_auditor_enabled_issuance_carries_the_auditor_ciphertext() {
    let mut f = fixture_with_auditor();
    let auditor = f.auditor.as_ref().unwrap().secret().to_owned();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTConvert", None, "60", &mut c);
    assert_eq!(v["status"], "signed", "{v}");

    let blob = wconf_signer::xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = wconf_signer::xrpl::decode(&blob).unwrap();
    let aud: [u8; 66] = d
        .get(wconf_signer::xrpl::AUDITOR_ENCRYPTED_AMOUNT)
        .expect("a Convert on an auditor-enabled issuance carries no auditor ciphertext")
        .try_into()
        .unwrap();
    assert_eq!(wconf_signer::prover::decrypt(&aud, &auditor, 0, 200).unwrap(), 60);
    assert!(c.last().to_lowercase().contains("third party can decrypt"));

    // ⚠ **The shared-`C₁` invariant, asserted directly.** Decrypting to the
    // right amount does NOT establish it: an auditor ciphertext built with
    // independent randomness decrypts to 60 perfectly well, and would leave the
    // proof unsatisfiable and — far worse — hand a passive observer the
    // difference between two amounts if that randomness ever repeated. The test
    // could have passed with the parser having forgotten the auditor entirely
    // (`REVIEW-015` round three).
    let parsed = ParsedTransaction::parse(&blob).unwrap();
    assert_eq!(&aud[..33], &parsed.c1[..], "the auditor ciphertext has its own C1");
}

/// And the parser must **reject** an auditor ciphertext whose `C₁` differs.
///
/// This is the half the test above cannot show by construction: poison the
/// field and check the refusal actually fires. Without it, "the parser includes
/// the auditor in the shared-`C₁` set" is a claim about code nobody exercised.
#[test]
fn an_auditor_ciphertext_with_a_different_c1_is_refused() {
    use wconf_signer::xrpl;

    let mut f = fixture_with_auditor();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "12", &mut c);
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = xrpl::decode(&blob).unwrap();
    assert!(ParsedTransaction::parse(&blob).is_ok());

    // Flip one byte of the auditor ciphertext's C1 half.
    let mut poisoned_aud = d.get(xrpl::AUDITOR_ENCRYPTED_AMOUNT).unwrap().to_vec();
    poisoned_aud[1] ^= 0x01;

    let poisoned = rebuilt_without_mpt_amount(&d)
        .blob(xrpl::AUDITOR_ENCRYPTED_AMOUNT, &poisoned_aud)
        .serialize(false)
        .unwrap();
    let err = ParsedTransaction::parse(&poisoned).unwrap_err();
    assert!(err.contains("do not share one C1"), "the refusal is not about C1: {err}");
}

/// XLS-0096 §7.2: `HolderEncryptionKey` is **required when initialising and
/// forbidden once registered** (`tecDUPLICATE`), and `ZKProof` is present
/// exactly when it is.
///
/// The signer always emitted both, so it could register a holder once and would
/// have failed on every Convert after that.
#[test]
fn a_convert_registers_the_key_once_and_never_again() {
    use wconf_signer::xrpl;

    // Not yet registered: key and proof present.
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTConvert", None, "10", &mut c);
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = xrpl::decode(&blob).unwrap();
    assert!(d.get(xrpl::HOLDER_ENCRYPTION_KEY).is_some(), "an initialising Convert omits the key");
    assert_eq!(d.get(xrpl::ZK_PROOF).map(|p| p.len()), Some(64));
    assert!(ParsedTransaction::parse(&blob).is_ok());

    // Already registered: BOTH absent.
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTConvert", None, "10", &mut c);
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = xrpl::decode(&blob).unwrap();
    assert!(
        d.get(xrpl::HOLDER_ENCRYPTION_KEY).is_none(),
        "a registered holder's Convert re-registers the key; the ledger answers tecDUPLICATE"
    );
    assert!(d.get(xrpl::ZK_PROOF).is_none(), "ZKProof must be absent when the key is");
    assert!(ParsedTransaction::parse(&blob).is_ok(), "a registered-holder Convert does not parse");
}

/// ⚠ **Architecture §6 step 6.** A Convert that *registers* the encryption key
/// is the single most irreversible transaction this signer builds, and until
/// 2026-08-20 the confirmation rendered it identically to one that does not.
///
/// The key can never be changed, never be rotated and never be recovered
/// (`CLAIMS.md` P-10), and every confidential amount this account ever holds is
/// encrypted to it. A holder approving that is approving something different
/// from a routine Convert, and the screen has to say so.
#[test]
fn a_registering_convert_says_on_the_confirmation_that_it_registers_a_key() {
    use wconf_signer::xrpl;

    // Not yet registered — the transaction carries the key.
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTConvert", None, "10", &mut c);
    assert_eq!(v["status"], "signed", "{v}");
    let shown = c.last().to_string();

    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let parsed = ParsedTransaction::parse(&blob).unwrap();
    let key = parsed.registers_encryption_key.expect("an initialising Convert registers a key");

    assert!(shown.contains("REGISTERS"), "the confirmation does not say it registers:\n{shown}");
    assert!(
        shown.contains(&wconf_signer::prover::hex(&key)),
        "the confirmation does not show WHICH key is being registered:\n{shown}"
    );
    // Flattened, so the assertion is about the sentence rather than about
    // where the line happens to wrap.
    let flat = shown.split_whitespace().collect::<Vec<_>>().join(" ");
    for phrase in [
        "never be changed or rotated",
        "tecDUPLICATE",
        "if the matching secret is ever unreachable",
        "no second chance",
    ] {
        assert!(flat.contains(phrase), "the confirmation omits `{phrase}`:\n{shown}");
    }
    // ⚠ **And it must NOT say the key can never be recovered.** `REVIEW-020`'s
    // Gemini leg caught that sentence contradicting the one thing deriving from
    // the master seed buys: under the ruled derivation the key IS reconstructible
    // from a backup the holder already keeps. `CLAIMS.md` P-10 forbids claiming
    // the *protocol* supports rotation or recovery — it supports neither — and
    // that is a different sentence from this one. A holder told at the approval
    // step that their derived key is unrecoverable has been told the opposite of
    // why they chose it.
    assert!(
        !flat.contains("never be recovered"),
        "the confirmation says a registered key can never be recovered, which contradicts \
         the derived key source:\n{shown}"
    );
    // And the key shown is the signer's own, parsed back out of the bytes —
    // not a value from anywhere else.
    assert_eq!(
        &key,
        f.session.holder().elgamal.public(),
        "a key that is not this signer's was shown"
    );

    // ⚠ The control. A Convert on an already-registered holder carries no key,
    // and must NOT carry the warning — a screen that says "this registers your
    // key forever" on every transaction is a screen nobody reads.
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTConvert", None, "10", &mut c);
    assert_eq!(v["status"], "signed", "{v}");
    let shown = c.last().to_string();
    assert!(!shown.contains("REGISTERS"), "a non-registering Convert claims to register:\n{shown}");
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    assert!(ParsedTransaction::parse(&blob).unwrap().registers_encryption_key.is_none());
}

/// A field the confirmation does not render is a field the holder does not
/// approve, so parsing must refuse it.
///
/// The doc comment claimed this from the start and the code did not do it
/// (`REVIEW-015a` F-03, `REVIEW-015b`).
/// Rebuild a complete `ConfidentialMPTSend` from a decoded one, so a test can
/// add exactly one poisoned field and nothing else differs.
fn rebuilt_without_mpt_amount(d: &wconf_signer::xrpl::Decoded) -> wconf_signer::xrpl::TxBuilder {
    use wconf_signer::xrpl;
    xrpl::TxBuilder::new()
        .u16(xrpl::TRANSACTION_TYPE, xrpl::tx_type::CONFIDENTIAL_MPT_SEND)
        .account(xrpl::ACCOUNT, &d.account(xrpl::ACCOUNT).unwrap())
        .account(xrpl::DESTINATION, &d.account(xrpl::DESTINATION).unwrap())
        .hash(xrpl::MPT_ISSUANCE_ID, d.get(xrpl::MPT_ISSUANCE_ID).unwrap())
        .u32(xrpl::SEQUENCE, d.u32(xrpl::SEQUENCE).unwrap())
        .u32(xrpl::FLAGS, 0)
        .u32(xrpl::LAST_LEDGER_SEQUENCE, d.u32(xrpl::LAST_LEDGER_SEQUENCE).unwrap())
        .drops(xrpl::FEE, d.drops(xrpl::FEE).unwrap())
        .blob(xrpl::SENDER_ENCRYPTED_AMOUNT, d.get(xrpl::SENDER_ENCRYPTED_AMOUNT).unwrap())
        .blob(xrpl::DESTINATION_ENCRYPTED_AMOUNT, d.get(xrpl::DESTINATION_ENCRYPTED_AMOUNT).unwrap())
        .blob(xrpl::ISSUER_ENCRYPTED_AMOUNT, d.get(xrpl::ISSUER_ENCRYPTED_AMOUNT).unwrap())
        .blob(xrpl::AMOUNT_COMMITMENT, d.get(xrpl::AMOUNT_COMMITMENT).unwrap())
        .blob(xrpl::BALANCE_COMMITMENT, d.get(xrpl::BALANCE_COMMITMENT).unwrap())
        .blob(xrpl::ZK_PROOF, d.get(xrpl::ZK_PROOF).unwrap())
        .blob(xrpl::SIGNING_PUB_KEY, d.get(xrpl::SIGNING_PUB_KEY).unwrap())
}

#[test]
fn a_transaction_carrying_a_field_this_type_may_not_have_is_refused() {
    use wconf_signer::xrpl;
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    assert!(ParsedTransaction::parse(&blob).is_ok());

    // `MPTAmount` on a Send. Before the fix this parsed, and the confirmation
    // rendered it as a PUBLIC amount rather than decrypting the ciphertext —
    // a plaintext number on the screen of a scheme whose whole point is that
    // there is no plaintext number.
    let d = xrpl::decode(&blob).unwrap();
    // The unpoisoned rebuild must itself parse, or the assertion below would
    // pass for whatever the rebuild got wrong rather than for the poison.
    assert!(ParsedTransaction::parse(&rebuilt_without_mpt_amount(&d).serialize(false).unwrap()).is_ok());
    let poisoned = rebuilt_without_mpt_amount(&d).u64(xrpl::MPT_AMOUNT, 1).serialize(false).unwrap();
    let err = ParsedTransaction::parse(&poisoned).unwrap_err();
    assert!(err.contains("may not carry"), "{err}");

    // And `NetworkID`, which Devnet rejects outright.
    //
    // ⚠ This half used to build a transaction with **only** TransactionType and
    // NetworkID, so it failed for a completely different reason — the missing
    // mandatory fields — and never reached the NetworkID branch at all. Both
    // round-two legs caught it. It now poisons a COMPLETE transaction and
    // asserts the specific message.
    let with_net = rebuilt_without_mpt_amount(&d).u32(xrpl::NETWORK_ID, 2).serialize(false).unwrap();
    let err = ParsedTransaction::parse(&with_net).unwrap_err();
    assert!(err.contains("NetworkID"), "the refusal is not about NetworkID: {err}");
    assert!(err.contains("Devnet-only"), "{err}");
}

#[test]
fn confirmation_shows_the_normalised_amount_not_the_typed_string() {
    // A sharper form of the same property, using the client's own number
    // re-spelled: an echo would show "0000009999"; a decryption shows 9999.
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "0000009999", &mut c);
    assert!(!c.last().contains("0000009999"), "the confirmation echoed the intent string");
    assert!(c.last().contains("9999"));
}

#[test]
fn render_only_ever_sees_a_parsed_transaction() {
    // The structural half: a ParsedTransaction is reachable only through
    // `parse`, so `render` has no path to client data.
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "77", &mut c);

    let blob = wconf_signer::xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let parsed = ParsedTransaction::parse(&blob).expect("parse");
    assert_eq!(parsed.destination.as_deref(), Some(DEST_ADDRESS));
    assert_eq!(parsed.account, TEST_ADDRESS);
    assert_eq!(parsed.sequence, 41);
    // A freshly parsed transaction knows nothing about the amount until a key
    // is applied to it. That is the point of the type.
    assert_eq!(parsed.amount, AmountView::Unrecovered);
    assert!(confirm::render(&parsed).contains("NOT RECOVERED"));
}

/// A confirmation that cannot read the amount must say so rather than show a
/// number.
///
/// ⚠ **This used to drive the property through `prepare`, and it no longer
/// can.** Architecture §6 step 2 decrypts the balance from the ledger with the
/// same bounded search, and a Send enforces `amount <= balance`, so
/// `amount <= balance <= amount_search_to` — the amount is now *always* inside
/// the search range on a Send, and a Convert reads its amount from the
/// plaintext `MPTAmount` field rather than by decrypting. **The
/// `COULD NOT BE READ` branch is unreachable from `prepare`.**
///
/// That is a strictly better outcome — the refusal moved earlier, before a
/// proof exists, and has its own test below. But *unreachable from one caller*
/// is not *dead*, and the branch must still be honest, so the claim is now
/// tested where it lives: on a real transaction this signer built, re-parsed,
/// with a bound too small to read it. Deleting the test instead would have
/// removed the only check that `render` never guesses.
#[test]
fn an_amount_outside_the_search_range_is_never_guessed() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "9999", &mut c);
    assert_eq!(v["status"], "signed", "{v}");

    // The same bytes the holder approved, re-read with a search bound that
    // cannot reach 9999.
    let blob = wconf_signer::xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let mut parsed = ParsedTransaction::parse(&blob).expect("parse");
    parsed.recover_amount(f.session.holder().elgamal.secret(), 50);
    let shown = confirm::render(&parsed);
    assert!(shown.contains("COULD NOT BE READ"), "{shown}");
    assert!(shown.contains("DO NOT CONFIRM"), "{shown}");
    assert!(!shown.contains("9999"), "a number was shown that was never decrypted:\n{shown}");

    // ...and the control: the same bytes with a bound that CAN reach it show
    // the real number. Without this the assertions above would pass on a
    // `render` that had simply stopped printing amounts.
    let mut parsed = ParsedTransaction::parse(&blob).expect("parse");
    parsed.recover_amount(f.session.holder().elgamal.secret(), SEARCH_TO);
    assert!(confirm::render(&parsed).contains("9999"));
}

/// The Send half of the same bound: a balance the signer could not read is not
/// a balance it will check an amount against.
///
/// It refuses **before** drawing entropy, so a request that was always going to
/// fail does not burn a randomness identifier on its way out — the ordering
/// `REVIEW-015b` found wrong once already.
#[test]
fn a_send_against_a_balance_that_did_not_decrypt_is_refused_before_any_proof() {
    let mut f = fixture_with(100_000, 50);
    let before = ledger_len(&store_of(&f));
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "10", &mut c);

    assert_eq!(v["status"], "refused", "{v}");
    assert_eq!(v["code"], "REFUSED_BALANCE_UNREADABLE", "{v}");
    assert!(
        v["detail"].as_str().unwrap().contains("50"),
        "the refusal must name the bound that was too small: {v}"
    );
    assert!(c.seen.is_empty(), "a human was asked to confirm a transaction that was refused");
    assert_eq!(
        ledger_len(&store_of(&f)),
        before,
        "a refusal decidable before entropy burned a randomness identifier"
    );
}

// ---------------------------------------------------------------------------
// Architecture §3 item 5 — never accept caller-supplied randomness
// ---------------------------------------------------------------------------

#[test]
fn every_forbidden_field_is_refused_by_name() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    for field in wconf_signer::protocol::FORBIDDEN_FIELDS {
        let mut req = serde_json::json!({
            "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
            "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5"
        });
        req.as_object_mut().unwrap().insert((*field).to_string(), serde_json::json!("deadbeef"));

        let mut c = Recorder::approving();
        let resp = f.session.handle(req.to_string().as_bytes(), CONN, &mut c);
        let v = serde_json::to_value(&resp).unwrap();
        assert_eq!(v["status"], "refused", "field `{field}` was not refused");
        assert_eq!(
            v["code"], "REFUSED_CALLER_RANDOMNESS",
            "field `{field}` got the wrong code; a generic code is what a client swallows"
        );
        assert!(
            v["detail"].as_str().unwrap().contains(field),
            "the refusal for `{field}` does not name the field"
        );
        assert!(c.seen.is_empty(), "field `{field}` reached the confirmation before being refused");
    }
}

#[test]
fn forbidden_fields_are_refused_when_nested() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
        "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5",
        "claimed": { "label": "ok", "blinding_factor": "00ff" }
    });
    let mut c = Recorder::approving();
    let v = serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();
    assert_eq!(v["code"], "REFUSED_CALLER_RANDOMNESS");
}

#[test]
fn forbidden_field_names_are_matched_case_insensitively() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    for name in ["Rho", "BLINDING_FACTOR", "Entropy64", "SK_A"] {
        let mut req = serde_json::json!({
            "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
            "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5"
        });
        req.as_object_mut().unwrap().insert(name.into(), serde_json::json!("x"));
        let mut c = Recorder::approving();
        let v = serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();
        assert_eq!(v["code"], "REFUSED_CALLER_RANDOMNESS", "`{name}` slipped through");
    }
}

// ---------------------------------------------------------------------------
// Architecture §3 items 2 and 3 — short-lived, scoped, non-bearer authority
// ---------------------------------------------------------------------------

#[test]
fn a_grant_does_not_cover_an_operation_it_did_not_name() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    assert_eq!(v["code"], "REFUSED_UNAUTHORIZED");
    assert!(c.seen.is_empty(), "an unauthorized request reached the confirmation");
}

#[test]
fn a_grant_is_not_a_bearer_token() {
    let mut store = GrantStore::new();
    let g = store.issue(ConnectionId(1), vec!["ConfidentialMPTSend".into()], Duration::from_secs(60), "h".into());
    assert!(store.authorize(&g.handle, ConnectionId(1), "ConfidentialMPTSend").is_ok());
    assert!(
        store.authorize(&g.handle, ConnectionId(2), "ConfidentialMPTSend").is_err(),
        "a grant was accepted from a connection it was not issued to"
    );
}

#[test]
fn a_handle_leaked_to_another_connection_is_indistinguishable_from_a_bad_one() {
    let mut store = GrantStore::new();
    let g = store.issue(ConnectionId(1), vec!["ConfidentialMPTSend".into()], Duration::from_secs(60), "h".into());
    let wrong_conn = store.authorize(&g.handle, ConnectionId(2), "ConfidentialMPTSend").unwrap_err();
    let no_such = store.authorize("not-a-handle", ConnectionId(2), "ConfidentialMPTSend").unwrap_err();
    assert_eq!(wrong_conn, no_such, "the error distinguishes an existing grant from a missing one");
}

#[test]
fn ttl_is_capped_regardless_of_what_the_client_asks_for() {
    let mut store = GrantStore::new();
    let g = store.issue(
        ConnectionId(1), vec!["ConfidentialMPTSend".into()],
        Duration::from_secs(365 * 24 * 3600), "h".into(),
    );
    let ttl = g.expires_unix - wconf_signer::grant::now_unix();
    assert!(ttl <= MAX_TTL.as_secs(), "a client asked for a year and got {ttl}s");
}

#[test]
fn closing_a_connection_revokes_its_grants() {
    let mut store = GrantStore::new();
    store.issue(ConnectionId(1), vec!["ConfidentialMPTSend".into()], Duration::from_secs(60), "a".into());
    store.issue(ConnectionId(2), vec!["ConfidentialMPTSend".into()], Duration::from_secs(60), "b".into());
    store.drop_connection(ConnectionId(1));
    assert!(store.authorize("a", ConnectionId(1), "ConfidentialMPTSend").is_err());
    assert!(store.authorize("b", ConnectionId(2), "ConfidentialMPTSend").is_ok());
}

#[test]
fn an_expired_grant_does_not_authorize() {
    let mut store = GrantStore::new();
    store.issue(ConnectionId(1), vec!["ConfidentialMPTSend".into()], Duration::from_secs(0), "a".into());
    assert!(store.authorize("a", ConnectionId(1), "ConfidentialMPTSend").is_err());
    assert!(store.is_empty(), "an expired grant was not reaped");
}

// ---------------------------------------------------------------------------
// Architecture §3 item 1 — the holder's decision is the boundary
// ---------------------------------------------------------------------------

#[test]
fn declining_produces_a_distinguishable_refusal() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::declining();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    assert_eq!(v["status"], "refused");
    assert_eq!(v["code"], "REFUSED_DECLINED_BY_HOLDER");
    assert!(v.get("tx_blob").is_none(), "a declined request still returned a blob");
}

#[test]
fn every_refusal_code_is_distinct() {
    // REVIEW-013c §3a B-VII: a client can only decline to collapse errors it
    // can tell apart.
    let codes = [
        Refusal::CallerSuppliedRandomness { field: "r".into() }.code(),
        Refusal::Malformed { reason: "x".into() }.code(),
        Refusal::Unauthorized { reason: "x".into() }.code(),
        Refusal::DeclinedByHolder.code(),
        Refusal::RandomnessReuse { which: "r".into() }.code(),
        Refusal::RandomnessLedgerFault { detail: "x".into() }.code(),
        Refusal::EntropyUnavailable { detail: "x".into() }.code(),
    ];
    let mut sorted = codes.to_vec();
    sorted.sort_unstable();
    sorted.dedup();
    assert_eq!(sorted.len(), codes.len(), "two refusals share a code");
}

// ---------------------------------------------------------------------------
// Honesty of the confirmation text — CLAIMS.md P-4, P-5, P-9, P-11
// ---------------------------------------------------------------------------

fn confirmation_for(op: &str, dest: Option<&str>) -> String {
    // ⚠ **A ConvertBack needs a registered `HolderEncryptionKey`** — XLS-0096
    // §10.4.2 item 3 — so it cannot be driven from the unregistered fixture the
    // other two use. Getting this wrong shows up as a refusal, not as a wrong
    // screen, which is the good failure.
    let mut f = if op == "ConfidentialMPTConvertBack" { fixture_registered() } else { fixture() };
    let grant = pair(&mut f.session, &[op]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, op, dest, "5", &mut c);
    assert_eq!(v["status"], "signed", "{op}: {v}");
    c.last().to_string()
}

#[test]
fn the_confirmation_never_claims_more_than_is_delivered() {
    for (op, dest) in [
        ("ConfidentialMPTConvert", None),
        ("ConfidentialMPTSend", Some(DEST_ADDRESS)),
        ("ConfidentialMPTConvertBack", None),
    ] {
        let out = confirmation_for(op, dest).to_lowercase();
        for banned in ["anonymous", "untraceable", "secure", "private from", "non-custodial", "trustless"] {
            assert!(!out.contains(banned), "{op}: confirmation contains `{banned}`");
        }
        assert!(out.contains("public:"), "{op}: confirmation does not say what is public");
        assert!(out.contains("hidden:"), "{op}: confirmation does not say what is hidden");
    }
}

/// ⚠ **Every transaction type that publishes a plaintext amount must SAY SO in
/// the disclosure line, and this test exists because one of them did not.**
///
/// `Convert` and `ConvertBack` both carry `MPTAmount` in the clear (XLS-0096
/// §7.2 and §10.3). Until 2026-08-25 the Convert disclosure listed the
/// *blinding factor* as public and **not the amount** — the most consequential
/// thing it publishes — while ConvertBack's named its own. The test above
/// passed throughout, because it only asserted that the words *"public:"* and
/// *"hidden:"* appeared, and it did not drive ConvertBack at all.
///
/// `CLAIMS.md` **E-136**. This is **F-24's shape one layer down**: the same
/// omission, in the code rather than in the explainer, and found by the same
/// route — noticing that two things which should read alike did not.
///
/// ⚠ **The Send case is the negative half and it is the load-bearing one.** A
/// Send's amount is *not* on the wire, so its disclosure must **never** say an
/// amount is public. Only a negative assertion catches that sentence being
/// copied across by a later edit that is trying to make the three consistent.
#[test]
fn every_type_that_publishes_an_amount_says_so_and_the_one_that_does_not_never_does() {
    for op in ["ConfidentialMPTConvert", "ConfidentialMPTConvertBack"] {
        let out = confirmation_for(op, None);
        let line = out
            .lines()
            .find(|l| l.contains("PUBLIC:"))
            .unwrap_or_else(|| panic!("{op}: no disclosure line"));
        assert!(
            line.contains("this amount"),
            "{op} carries a plaintext MPTAmount and its disclosure does not name it. \
             The amount is the most consequential thing this transaction publishes.\n{line}"
        );
        assert!(
            line.contains("in the clear") || line.contains("public balance"),
            "{op}: the disclosure names the amount without saying it is public:\n{line}"
        );
    }

    // **The negative.** A Send's amount is encrypted; saying otherwise would be
    // the opposite lie, and it is the one a consistency-minded edit would make.
    let send = confirmation_for("ConfidentialMPTSend", Some(DEST_ADDRESS));
    let line = send.lines().find(|l| l.contains("PUBLIC:")).unwrap();
    assert!(
        !line.contains("this amount"),
        "a Send's amount is NOT on the wire and its disclosure must not say it is:\n{line}"
    );
    assert!(
        line.contains("HIDDEN: the amount"),
        "a Send's disclosure must say the amount is hidden:\n{line}"
    );
}

#[test]
fn a_send_confirmation_says_the_issuer_can_decrypt() {
    // CLAIMS.md P-9: no configuration removes the issuer's mirror.
    let out = confirmation_for("ConfidentialMPTSend", Some(DEST_ADDRESS)).to_lowercase();
    assert!(out.contains("issuer can decrypt"), "the Send confirmation omits the issuer mirror:\n{out}");
}

#[test]
fn a_convert_confirmation_says_the_blinding_factor_is_published() {
    // E-63: `r` is published on-chain in `BlindingFactor` for Convert.
    let out = confirmation_for("ConfidentialMPTConvert", None).to_lowercase();
    assert!(out.contains("blinding factor"), "{out}");
    // And the amount really is public for a Convert, so the line must say so
    // rather than implying it was decrypted.
    assert!(out.contains("public — in the clear"), "{out}");
}

// ---------------------------------------------------------------------------
// Construction and parsing
// ---------------------------------------------------------------------------

fn intent(op: &str, dest: Option<&str>, amount: &str, issuance: &str) -> Intent {
    Intent {
        grant: "g".into(),
        operation: op.into(),
        issuance_id: issuance.into(),
        destination: dest.map(Into::into),
        amount: amount.into(),
        claimed: None,
    }
}

fn ctx() -> txn::SignerContext {
    txn::SignerContext::new(TEST_ADDRESS, 41, 2, 5000, 9_000_000, 3).unwrap()
}

#[test]
fn a_send_without_a_destination_is_refused() {
    assert!(txn::build(&intent("ConfidentialMPTSend", None, "5", ISSUANCE), &ctx()).is_err());
}

#[test]
fn a_destination_on_a_type_that_has_none_is_refused_not_dropped() {
    // Silently dropping it would let a client believe it sent somewhere.
    assert!(txn::build(
        &intent("ConfidentialMPTConvert", Some(DEST_ADDRESS), "5", ISSUANCE),
        &ctx()
    )
    .is_err());
}

#[test]
fn zero_and_non_numeric_amounts_are_refused() {
    for bad in ["0", "-1", "1.5", "", "0x10", "999999999999999999999999"] {
        assert!(
            txn::build(&intent("ConfidentialMPTSend", Some(DEST_ADDRESS), bad, ISSUANCE), &ctx())
                .is_err(),
            "amount `{bad}` was accepted"
        );
    }
}

#[test]
fn a_malformed_issuance_id_is_refused() {
    let z = "Z".repeat(48);
    let short = "0".repeat(47);
    for bad in ["", "00", z.as_str(), short.as_str()] {
        assert!(
            txn::build(&intent("ConfidentialMPTSend", Some(DEST_ADDRESS), "5", bad), &ctx())
                .is_err(),
            "issuance `{bad}` was accepted"
        );
    }
}

/// A destination whose base58check does not verify is refused **at build
/// time**, not discovered by the ledger.
#[test]
fn a_destination_with_a_broken_checksum_is_refused() {
    let mut chars: Vec<char> = DEST_ADDRESS.chars().collect();
    let last = chars.len() - 1;
    chars[last] = if chars[last] == 'K' { 'L' } else { 'K' };
    let broken: String = chars.into_iter().collect();
    assert!(txn::shape_of_account_is_plausible(&broken), "the weaker check should still pass it");
    assert!(
        txn::build(&intent("ConfidentialMPTSend", Some(&broken), "5", ISSUANCE), &ctx()).is_err(),
        "an address with a bad checksum was accepted"
    );
}

/// ~~bad magic~~ — the placeholder encoding had one; canonical XRPL bytes do
/// not. What replaces it is stronger: a decoder that rejects truncation,
/// trailing bytes, non-canonical field order, and any type this signer does not
/// itself emit.
#[test]
fn parsing_rejects_truncation_trailing_bytes_and_unknown_types() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    let bytes = wconf_signer::xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();

    assert!(ParsedTransaction::parse(&bytes).is_ok());
    assert!(
        ParsedTransaction::parse(&bytes[..bytes.len() - 1]).is_err(),
        "a truncated final field was accepted"
    );
    let mut extra = bytes.clone();
    extra.push(0x11); // UInt16 field 1: a field this signer never emits
    assert!(ParsedTransaction::parse(&extra).is_err(), "trailing bytes accepted");

    // Out-of-order fields: rippled would reject these, so the signer must too.
    let mut reordered = bytes.clone();
    reordered.swap(0, 1);
    assert!(ParsedTransaction::parse(&reordered).is_err(), "a reordered field was accepted");
}

#[test]
fn the_round_trip_is_exact_for_send_and_convert() {
    for (op, dest, ty) in [
        ("ConfidentialMPTConvert", None, TxType::Convert),
        ("ConfidentialMPTSend", Some(DEST_ADDRESS), TxType::Send),
    ] {
        let mut f = fixture();
        let grant = pair(&mut f.session, &[op]);
        let mut c = Recorder::approving();
        let v = prepare(&mut f.session, &grant, op, dest, "1234", &mut c);
        assert_eq!(v["status"], "signed", "{op}: {v}");
        let bytes = wconf_signer::xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
        let p = ParsedTransaction::parse(&bytes).unwrap();
        assert_eq!(p.tx_type, ty);
        assert_eq!(p.destination.as_deref(), dest);
        assert_eq!(p.issuance_id, ISSUANCE);
        assert_eq!(p.network_id, None, "Devnet transactions must not carry NetworkID");
        assert_eq!(p.account, TEST_ADDRESS);
    }
}

/// ~~`parse_refuses_convert_back_rather_than_guessing_its_field_set`~~ —
/// **struck 2026-08-24: ConvertBack is built.** What the refusal was protecting
/// is now protected by `tests/convert_back.rs`, which asserts each of XLS-0096
/// §10.3's three differences from Convert **negatively**, against the field
/// table read at source rather than against Convert's arm.
///
/// What survives here is the property that outlived it: a transaction of a type
/// with **no fields at all** is still refused rather than rendered as an empty
/// screen.
#[test]
fn parse_refuses_a_convert_back_carrying_none_of_its_required_fields() {
    use wconf_signer::xrpl;
    let bytes = xrpl::TxBuilder::new()
        .u16(xrpl::TRANSACTION_TYPE, xrpl::tx_type::CONFIDENTIAL_MPT_CONVERT_BACK)
        .account(xrpl::ACCOUNT, &xrpl::decode_address(TEST_ADDRESS).unwrap())
        .serialize(false)
        .unwrap();
    let err = ParsedTransaction::parse(&bytes).unwrap_err();
    // It fails on the first required field it looks for, which is the issuance
    // — the assertion is that it fails, not *where*. `tests/convert_back.rs`
    // removes one field at a time from an otherwise valid transaction, which is
    // what pins the individual rules.
    assert!(
        err.contains("missing MPTokenIssuanceID"),
        "a ConvertBack carrying nothing but a type and an account parsed: {err}"
    );
}

/// ~~`a_profile_that_omits_the_registration_flag_is_refused`~~ — **the flag is
/// gone.** Architecture §6 step 2 reads whether the key is registered from the
/// presence of `HolderEncryptionKey` on the ledger, which is the thing rippled
/// itself checks, so there is no longer a boolean to omit.
///
/// The claim that replaces it is stronger and is the one that matters now: a
/// profile carrying **any** value that has moved to the ledger must fail to
/// load, **by name**. Silently ignoring it would leave an operator believing a
/// stale local number is in force — which is precisely the gap step 2 closed,
/// reopened by a config file.
#[test]
fn a_profile_carrying_ledger_state_is_refused_by_name() {
    let base = serde_json::json!({
        "account_seed": TEST_SEED,
        // ⚠ A **corresponding** pair, and it has to be: since 2026-08-20
        // `try_from_parts` recomputes sk·G and refuses a pair that does not
        // match, because a registered key whose secret nobody holds makes
        // every balance encrypted to it permanently unreachable. These two
        // values are the keygen ruling's own Vector 1.
        "elgamal_sk": "D1CE6CB547E3010BEE0DE614330D745A2ADE751C8BD16A66962616EFE7453964",
        "elgamal_pk": "02295AD17728DBD75FAB16EE3A38E7D1ED96908DD7E530C90BD8965AF0A7E71246",
        "issuance_id": ISSUANCE,
        "fee_drops": 10u64,
        "network_id": 2u32,
    });
    // The whole set that used to live in the file, with a plausible value each.
    let moved: &[(&str, serde_json::Value)] = &[
        ("balance", serde_json::json!(1u64)),
        ("balance_ciphertext", serde_json::json!("00".repeat(66))),
        ("balance_version", serde_json::json!(3u32)),
        ("holder_key_registered", serde_json::json!(true)),
        ("issuer_encryption_key", serde_json::json!("02".to_string() + &"00".repeat(32))),
        ("auditor_encryption_key", serde_json::json!("02".to_string() + &"00".repeat(32))),
        ("sequence", serde_json::json!(1u32)),
        ("last_ledger_sequence", serde_json::json!(2u32)),
        ("destination_keys", serde_json::json!({})),
    ];

    for (field, value) in moved {
        let mut p = base.clone();
        p.as_object_mut().unwrap().insert((*field).into(), value.clone());
        let err = wconf_signer::holder::HolderProfile::from_json(&p.to_string())
            .expect_err(&format!("a profile carrying `{field}` was accepted"));
        let text = format!("{err}");
        assert!(text.contains(field), "the refusal does not name `{field}`: {text}");
        assert!(
            text.contains("ledger"),
            "the refusal does not say where the value comes from now: {text}"
        );
    }

    // And the base, with nothing that moved, still loads.
    wconf_signer::holder::HolderProfile::from_json(&base.to_string())
        .expect("a profile carrying only secrets and policy must still load");
}

/// ~~`convert_back_is_refused_as_not_implemented`~~ — **struck 2026-08-24.**
/// ConvertBack is built; `tests/convert_back.rs` drives it end to end and
/// `tests/prover_pristine.rs` puts its 816-byte proof in front of the pristine
/// upstream verifier.
///
/// ⚠ **Building it made `REFUSED_NOT_IMPLEMENTED` unreachable — it was that
/// code's only producer — and the variant was removed rather than left as a
/// refusal a client can never receive** (`CLAIMS.md` E-130). What replaces this
/// test is the property that outlived it: an operation this signer does not
/// build is refused **before any grant exists for it**, so the operation name
/// never reaches the signing path at all.
///
/// `ConfidentialMPTMergeInbox` and `ConfidentialMPTClawback` are real XLS-0096
/// transactions this signer does not build.
#[test]
fn an_operation_this_signer_does_not_build_cannot_even_be_granted() {
    for op in ["ConfidentialMPTMergeInbox", "ConfidentialMPTClawback"] {
        let mut f = fixture();
        let req = serde_json::json!({ "type": "pair", "operations": [op], "ttl_secs": 300u64 });
        let mut c = Recorder::approving();
        let v = serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c))
            .unwrap();
        assert_eq!(v["code"], "REFUSED_MALFORMED", "{op} was granted: {v}");
        assert!(
            v["detail"].as_str().unwrap().contains(op),
            "the refusal does not name the operation: {v}"
        );
        assert!(c.seen.is_empty(), "an ungrantable operation reached the confirmation");
    }
}

// ---------------------------------------------------------------------------
// What this signer must NOT claim
// ---------------------------------------------------------------------------

/// ~~`status_states_plainly_that_no_keys_are_loaded`~~ — **struck.** Keys are
/// loaded now. What has to stay true is that the status says what kind.
#[test]
fn status_states_plainly_that_the_keys_are_throwaway_devnet_keys() {
    let mut f = fixture();
    let mut c = Recorder::approving();
    let v = serde_json::to_value(f.session.handle(br#"{"type":"status"}"#, CONN, &mut c)).unwrap();
    assert_eq!(v["keys_loaded"], true);
    let note = v["note"].as_str().unwrap().to_lowercase();
    assert!(note.contains("throwaway"), "the status does not say the keys are throwaway: {note}");
    assert!(note.contains("devnet"), "the status does not name the network: {note}");
}

#[test]
fn no_response_variant_can_carry_key_material() {
    // If a future change adds a field named like a secret to any response,
    // this fails.
    let samples = vec![
        serde_json::to_value(wconf_signer::protocol::Response::Status {
            version: "0".into(), keys_loaded: false, note: String::new(),
        }).unwrap(),
        serde_json::to_value(wconf_signer::protocol::Response::Signed {
            summary: String::new(), tx_blob: String::new(), hash: String::new(),
        }).unwrap(),
        serde_json::to_value(wconf_signer::protocol::Response::Paired {
            grant: "g".into(), expires_unix: 0, operations: vec![],
        }).unwrap(),
    ];
    for v in samples {
        for k in v.as_object().unwrap().keys() {
            let lowered = k.to_ascii_lowercase();
            assert!(
                !wconf_signer::protocol::FORBIDDEN_FIELDS.contains(&lowered.as_str()),
                "a response carries the field `{k}`"
            );
        }
    }
}

/// The signed blob must never contain a secret. It is handed to a client, which
/// hands it to a network.
#[test]
fn the_signed_blob_carries_no_secret() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    let blob = v["tx_blob"].as_str().unwrap().to_string();
    let sk = wconf_signer::prover::hex(f.session.holder().elgamal.secret());
    assert!(!blob.contains(&sk), "the ElGamal secret is in the signed blob");
    // The ElGamal *public* key is on the wire for a Convert and that is correct.
    // The XRPL signing public key is too. Neither is a secret.
}
