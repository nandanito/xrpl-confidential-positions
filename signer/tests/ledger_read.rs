//! Architecture §6 step 2 — **the ledger read path, and its falsifiers.**
//!
//! > *Falsified if:* the signer builds a transaction against ledger state it
//! > did not read, or a stale read is indistinguishable from a fresh one.
//!
//! Both halves are driven here. The first is tested **positively** — change the
//! ledger, and the next transaction changes with it — because the negative form
//! ("it did not read") is not observable from outside. The second is tested by
//! moving the ledger *while a human is looking at the confirmation*, which is
//! where the window actually is.
//!
//! ⚠ The step's own third clause — *"also falsified if it implies amounts are
//! visible or identities hidden"* — is a claim about **language**, not about
//! behaviour, and is checked by `tools/` and by `CLAIMS.md` rather than by a
//! test. Said here so that a reader does not take this file for the whole
//! falsifier.

mod support;

use support::*;
use wconf_signer::confirm::Confirmer;
use wconf_signer::ledger::{AccountSecurity, LedgerError, LedgerReader, LedgerSnapshot};
use wconf_signer::prover;
use wconf_signer::session::Balance;
use wconf_signer::xrpl;

fn blob_of(v: &serde_json::Value) -> Vec<u8> {
    xrpl::unhex(v["tx_blob"].as_str().unwrap_or_else(|| panic!("not signed: {v}"))).unwrap()
}

// ---------------------------------------------------------------------------
// Falsifier 1 — the transaction carries what the ledger said, not what a file
// said. Every value below used to come from `HolderProfile`.
// ---------------------------------------------------------------------------

/// `Sequence` comes off the ledger, and changes when the ledger changes.
#[test]
fn the_sequence_in_the_transaction_is_the_sequence_on_the_ledger() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    for expected in [41u32, 42, 1000] {
        f.ledger.lock().unwrap().sequence = expected;
        let mut c = Recorder::approving();
        let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
        let d = xrpl::decode(&blob_of(&v)).unwrap();
        assert_eq!(
            d.u32(xrpl::SEQUENCE),
            Some(expected),
            "the transaction did not carry the Sequence the ledger reported"
        );
    }
}

/// `LastLedgerSequence` is derived from the validated index that was read.
///
/// It was an absolute number in the profile — 9_000_000 — which went stale the
/// moment it was written and would have been silently wrong forever.
#[test]
fn last_ledger_sequence_follows_the_validated_index_that_was_read() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    for index in [4_600_000u32, 4_700_123] {
        f.ledger.lock().unwrap().ledger_index = index;
        let mut c = Recorder::approving();
        let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
        let d = xrpl::decode(&blob_of(&v)).unwrap();
        let lls = d.u32(xrpl::LAST_LEDGER_SEQUENCE).expect("LastLedgerSequence");
        assert!(
            lls > index && lls <= index + 64,
            "LastLedgerSequence {lls} is not a window after the read index {index}"
        );
    }
}

/// `ConfidentialBalanceVersion` is **not on the wire** — it is bound into the
/// proof through the transaction context hash. So the check is that the proof
/// verifies under the version the ledger reported and **fails** under any
/// other.
///
/// This is the sharp one. A signer that read the version and then proved
/// against a remembered value would produce a transaction rippled rejects with
/// `tecBAD_PROOF` and no explanation — REVIEW-005c's context drift, which is
/// fatal and silent.
#[test]
fn the_proof_is_bound_to_the_balance_version_that_was_read() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    for version in [3u32, 4, 77] {
        f.ledger
            .lock()
            .unwrap()
            .mptokens
            .get_mut(TEST_ADDRESS)
            .unwrap()
            .version = version;

        let mut c = Recorder::approving();
        let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
        let blob = blob_of(&v);
        let d = xrpl::decode(&blob).unwrap();

        let account = d.account(xrpl::ACCOUNT).unwrap();
        let dest = d.account(xrpl::DESTINATION).unwrap();
        let issuance: [u8; 24] = d.get(xrpl::MPT_ISSUANCE_ID).unwrap().try_into().unwrap();
        let sequence = d.u32(xrpl::SEQUENCE).unwrap();

        let participants: Vec<prover::Participant> = [
            (f.session.holder().elgamal.public(), xrpl::SENDER_ENCRYPTED_AMOUNT),
            (f.destination.public(), xrpl::DESTINATION_ENCRYPTED_AMOUNT),
            (f.issuer.public(), xrpl::ISSUER_ENCRYPTED_AMOUNT),
        ]
        .into_iter()
        .map(|(pk, field)| prover::Participant {
            pubkey: *pk,
            ciphertext: d.get(field).unwrap().try_into().unwrap(),
        })
        .collect();

        let balance_ct: [u8; 66] = xrpl::unhex(
            f.ledger.lock().unwrap().mptokens[TEST_ADDRESS].spending.as_ref().unwrap(),
        )
        .unwrap()
        .try_into()
        .unwrap();
        let amount_c: [u8; 33] = d.get(xrpl::AMOUNT_COMMITMENT).unwrap().try_into().unwrap();
        let balance_c: [u8; 33] = d.get(xrpl::BALANCE_COMMITMENT).unwrap().try_into().unwrap();
        let proof = d.get(xrpl::ZK_PROOF).unwrap();

        let verify_at = |ver: u32| {
            let ctx =
                prover::send_context_hash(&account, &issuance, sequence, &dest, ver).unwrap();
            prover::verify_send_proof(proof, &participants, &balance_ct, &amount_c, &balance_c, &ctx)
        };

        assert!(verify_at(version), "the proof does not verify at the version the ledger reported");
        assert!(
            !verify_at(version.wrapping_add(1)),
            "the proof verifies at a version the ledger never reported, so it is not bound to it \
             and this test proves nothing"
        );
    }
}

/// The issuer's key is read from the issuance, not declared in a file — and the
/// ciphertext the issuer can decrypt is encrypted to the key that was read.
#[test]
fn the_issuer_ciphertext_uses_the_key_read_from_the_issuance() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    // A second issuer key, put on the ledger between two otherwise identical
    // requests.
    let rotated = prover::ElGamalKeypair::generate().unwrap();
    f.ledger.lock().unwrap().issuer_key = Some(prover::hex(rotated.public()));

    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "321", &mut c);
    let d = xrpl::decode(&blob_of(&v)).unwrap();
    let ct: [u8; 66] = d.get(xrpl::ISSUER_ENCRYPTED_AMOUNT).unwrap().try_into().unwrap();

    assert_eq!(
        prover::decrypt(&ct, rotated.secret(), 0, SEARCH_TO).unwrap(),
        321,
        "the issuer ciphertext is not readable by the key the ledger carries"
    );
    assert!(
        prover::decrypt(&ct, f.issuer.secret(), 0, SEARCH_TO).is_err(),
        "the issuer ciphertext is still under the key the fixture started with, so it came from \
         somewhere other than the ledger"
    );
}

/// The destination's `HolderEncryptionKey` is read from **the destination's own
/// `MPToken`**, not from a hand-maintained map.
#[test]
fn the_destination_key_comes_from_the_destinations_own_mptoken() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    let rotated = prover::ElGamalKeypair::generate().unwrap();
    f.ledger
        .lock()
        .unwrap()
        .mptokens
        .get_mut(DEST_ADDRESS)
        .unwrap()
        .holder_key = Some(prover::hex(rotated.public()));

    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "44", &mut c);
    let d = xrpl::decode(&blob_of(&v)).unwrap();
    let ct: [u8; 66] = d.get(xrpl::DESTINATION_ENCRYPTED_AMOUNT).unwrap().try_into().unwrap();

    assert_eq!(prover::decrypt(&ct, rotated.secret(), 0, SEARCH_TO).unwrap(), 44);
    assert!(prover::decrypt(&ct, f.destination.secret(), 0, SEARCH_TO).is_err());
}

/// A destination that has never opted in has no `MPToken` at all, and the
/// refusal says so rather than inventing a key.
#[test]
fn a_destination_with_no_mptoken_is_refused_rather_than_invented() {
    let mut f = fixture();
    f.ledger.lock().unwrap().mptokens.remove(DEST_ADDRESS);
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);

    assert_eq!(v["status"], "refused", "{v}");
    assert!(v["detail"].as_str().unwrap().contains("HolderEncryptionKey"), "{v}");
    assert!(c.seen.is_empty(), "a human was asked to confirm an unbuildable transaction");
}

/// Whether the holder's key is registered is **the presence of the field on the
/// ledger**, not a boolean an operator maintained.
///
/// XLS-0096 §7.2: `HolderEncryptionKey` is required when initialising and
/// forbidden once registered (`tecDUPLICATE`), and `ZKProof` is tied to it
/// exactly. E-95 found the signer emitting both unconditionally; the fix put a
/// flag in the profile, and this replaces the flag with the ledger.
#[test]
fn registration_is_read_from_the_ledger_not_declared() {
    // Unregistered on the ledger: both present.
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTConvert", None, "10", &mut c);
    let d = xrpl::decode(&blob_of(&v)).unwrap();
    assert!(d.get(xrpl::HOLDER_ENCRYPTION_KEY).is_some(), "the initialising Convert omitted the key");
    assert!(d.get(xrpl::ZK_PROOF).is_some());

    // Register it on the ledger under the same session. Nothing else changes.
    let pk = prover::hex(f.session.holder().elgamal.public());
    f.ledger.lock().unwrap().mptokens.get_mut(TEST_ADDRESS).unwrap().holder_key = Some(pk);

    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTConvert", None, "10", &mut c);
    let d = xrpl::decode(&blob_of(&v)).unwrap();
    assert!(
        d.get(xrpl::HOLDER_ENCRYPTION_KEY).is_none(),
        "the Convert re-registered a key the ledger already carries; rippled answers tecDUPLICATE"
    );
    assert!(d.get(xrpl::ZK_PROOF).is_none(), "ZKProof must be absent when the key is");
}

/// The balance is decrypted from the ledger's own ciphertext, with `sk_A`.
#[test]
fn the_balance_is_decrypted_from_the_ledger_ciphertext() {
    let mut f = fixture();
    f.session.refresh().expect("read");
    assert_eq!(f.session.view().unwrap().balance, Balance::Known(BALANCE));

    // Replace the ciphertext with one that encrypts a different number.
    let sk = *f.session.holder().elgamal.secret();
    let pk = *f.session.holder().elgamal.public();
    let _ = sk;
    let r = wconf_signer::scalar::reduce_wide(&[0x31u8; 64]).unwrap();
    let ct = prover::encrypt(4321, &pk, &r).unwrap();
    f.ledger.lock().unwrap().mptokens.get_mut(TEST_ADDRESS).unwrap().spending =
        Some(prover::hex(&ct));

    f.session.refresh().expect("read");
    assert_eq!(
        f.session.view().unwrap().balance,
        Balance::Known(4321),
        "the balance did not follow the ledger's ciphertext"
    );
}

/// An account holding no `MPToken` at all is a state the signer must start in —
/// it is the state before the initialising Convert.
#[test]
fn an_account_with_no_mptoken_reads_as_absent_rather_than_failing() {
    let mut f = fixture();
    f.ledger.lock().unwrap().mptokens.remove(TEST_ADDRESS);
    f.session.refresh().expect("a holder who has not opted in is not an error");

    let view = f.session.view().unwrap();
    assert!(!view.snapshot.mptoken.exists);
    assert_eq!(view.balance, Balance::Absent);
    assert_eq!(view.snapshot.mptoken.balance_version, 0);
    assert_eq!(view.snapshot.mptoken.holder_encryption_key, None);

    // And a Send says why rather than proving against nothing.
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "1", &mut c);
    assert_eq!(v["status"], "refused", "{v}");
    assert!(v["detail"].as_str().unwrap().contains("ConfidentialBalanceSpending"), "{v}");
}

/// `sfConfidentialBalanceVersion` is `SoeDefault`, so rippled omits it when it
/// is zero — and rippled itself reads the absence as zero
/// (`ConfidentialMPTSend.cpp:127`, `.value_or(0)`).
#[test]
fn an_absent_balance_version_reads_as_zero() {
    let mut f = fixture();
    f.ledger.lock().unwrap().mptokens.get_mut(TEST_ADDRESS).unwrap().version = 0;
    f.session.refresh().expect("read");
    assert_eq!(f.session.view().unwrap().snapshot.mptoken.balance_version, 0);
}

// ---------------------------------------------------------------------------
// Falsifier 2 — a stale read is DISTINGUISHABLE from a fresh one.
// ---------------------------------------------------------------------------

/// A confirmer that moves the ledger while the human is looking at the screen.
///
/// This is not a contrived race. A human takes seconds to minutes over a
/// confirmation, and `Sequence` and `ConfidentialBalanceVersion` move whenever
/// anything else touches the account.
struct MovesTheLedger {
    ledger: Ledger,
    mutate: Box<dyn Fn(&mut FakeLedger)>,
    seen: usize,
}

impl Confirmer for MovesTheLedger {
    fn confirm(&mut self, _rendered: &str) -> bool {
        self.seen += 1;
        (self.mutate)(&mut self.ledger.lock().unwrap());
        true
    }
}

fn moving(ledger: &Ledger, mutate: impl Fn(&mut FakeLedger) + 'static) -> MovesTheLedger {
    MovesTheLedger { ledger: ledger.clone(), mutate: Box::new(mutate), seen: 0 }
}

#[test]
fn a_sequence_that_moves_during_confirmation_is_detected_and_nothing_is_signed() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = moving(&f.ledger, |l| l.sequence += 1);

    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
        "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5"
    });
    let v: serde_json::Value =
        serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();

    assert_eq!(c.seen, 1, "the human was never asked, so the race was never entered");
    assert_eq!(v["status"], "refused", "a transaction was signed against a stale Sequence: {v}");
    assert_eq!(v["code"], "REFUSED_LEDGER_MOVED", "{v}");
    assert!(v["detail"].as_str().unwrap().contains("Sequence"), "{v}");
    assert!(v["tx_blob"].is_null(), "a blob was returned on a refusal");
}

#[test]
fn a_balance_version_that_moves_during_confirmation_is_detected() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = moving(&f.ledger, |l| {
        l.mptokens.get_mut(TEST_ADDRESS).unwrap().version += 1;
    });

    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
        "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5"
    });
    let v: serde_json::Value =
        serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();

    assert_eq!(v["code"], "REFUSED_LEDGER_MOVED", "{v}");
    assert!(
        v["detail"].as_str().unwrap().contains("ConfidentialBalanceVersion"),
        "the refusal does not name the field that moved: {v}"
    );
}

/// ⚠ **The same race, on a `ConfidentialMPTConvertBack`, which had NO drift
/// coverage at all until `REVIEW-021`.**
///
/// Every test above drives a Send. A ConvertBack binds
/// `ConfidentialBalanceVersion` into its context hash exactly as a Send does —
/// `prover::convert_back_context_hash` takes it, and `Convert`'s does not — so
/// the same staleness window exists and the same refusal must fire. The code
/// path is shared (`recheck` → `binding_differs`), which is precisely why a
/// whole transaction type could sit here with no coverage **looking fully
/// exercised**: that is the shape both `REVIEW-015` legs found on the auditor
/// branch. A round-one leg asserted this property held; nothing was checking it
/// (`CLAIMS.md` E-135).
#[test]
fn a_balance_version_that_moves_during_a_convert_back_confirmation_is_detected() {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvertBack"]);
    let mut c = moving(&f.ledger, |l| {
        l.mptokens.get_mut(TEST_ADDRESS).unwrap().version += 1;
    });

    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTConvertBack",
        "issuance_id": ISSUANCE, "amount": "5"
    });
    let v: serde_json::Value =
        serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();

    assert_eq!(c.seen, 1, "the human was never asked, so the race was never entered");
    assert_eq!(v["code"], "REFUSED_LEDGER_MOVED", "{v}");
    assert!(
        v["detail"].as_str().unwrap().contains("ConfidentialBalanceVersion"),
        "the refusal does not name the field that moved: {v}"
    );
    assert!(v["tx_blob"].is_null(), "a blob was returned on a refusal");
}

/// ⚠ **And the balance CIPHERTEXT, which matters more for a ConvertBack than
/// for a Send.**
///
/// A ConvertBack's sigma proof is taken directly over the on-ledger
/// `ConfidentialBalanceSpending` — `params->ciphertext` in
/// `mpt_get_convert_back_proof` — so a ciphertext that moves under the
/// confirmation leaves a proof about a balance the ledger no longer holds.
#[test]
fn a_balance_ciphertext_that_moves_during_a_convert_back_confirmation_is_detected() {
    let mut f = fixture_registered();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvertBack"]);
    let mut c = moving(&f.ledger, |l| {
        let t = l.mptokens.get_mut(TEST_ADDRESS).unwrap();
        // A different ciphertext of the same shape. Not a valid re-encryption —
        // it does not need to be; the check is that the bytes moved.
        let mut ct = t.spending.clone().unwrap();
        ct.replace_range(0..2, if ct.starts_with("02") { "03" } else { "02" });
        t.spending = Some(ct);
    });

    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTConvertBack",
        "issuance_id": ISSUANCE, "amount": "5"
    });
    let v: serde_json::Value =
        serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();

    assert_eq!(v["code"], "REFUSED_LEDGER_MOVED", "{v}");
    assert!(
        v["detail"].as_str().unwrap().contains("ConfidentialBalanceSpending"),
        "the refusal does not name the field that moved: {v}"
    );
}

/// **`CLAIMS.md` F-23.** The destination's key is swapped after the human has
/// approved and before the signature exists.
///
/// This is the attack that is not merely a rejected transaction: rippled
/// verifies the proof against `(*sleDestinationMPToken)[sfHolderEncryptionKey]`
/// and answers `tecBAD_PROOF` — a `tec`, which is **applied to the ledger**. So
/// the ciphertext encrypted under the substituted key is published and stays
/// published. Refusing to sign is the only outcome that does not leak.
#[test]
fn a_destination_key_swapped_after_confirmation_is_detected_and_nothing_is_signed() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let attacker = prover::ElGamalKeypair::generate().unwrap();
    let attacker_pk = prover::hex(attacker.public());
    let mut c = moving(&f.ledger, move |l| {
        l.mptokens.get_mut(DEST_ADDRESS).unwrap().holder_key = Some(attacker_pk.clone());
    });

    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
        "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5"
    });
    let v: serde_json::Value =
        serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();

    assert_eq!(c.seen, 1);
    assert_eq!(v["code"], "REFUSED_LEDGER_MOVED", "{v}");
    assert!(v["tx_blob"].is_null(), "the transaction was signed anyway: {v}");
}

/// The control for all of the above: a ledger that merely **closes ledgers**
/// while the human reads does not fire the check.
///
/// Without this, `REFUSED_LEDGER_MOVED` could be a signer that refuses
/// everything, and every assertion above would be vacuous — `REVIEW-009` §8's
/// `t-nbound.c` failure mode.
#[test]
fn a_ledger_that_merely_advances_during_confirmation_does_not_fire_the_check() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = moving(&f.ledger, |l| l.ledger_index += 7);

    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
        "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5"
    });
    let v: serde_json::Value =
        serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();

    assert_eq!(v["status"], "signed", "an ordinary ledger close was treated as drift: {v}");
}

/// The ledger is read **again** before signing, not remembered.
#[test]
fn the_ledger_is_read_again_before_signing() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    f.ledger.lock().unwrap().calls.clear();

    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    assert_eq!(v["status"], "signed", "{v}");

    let calls = f.ledger.lock().unwrap().calls.clone();
    let server_infos = calls.iter().filter(|(c, _)| c == "server_info").count();
    assert!(
        server_infos >= 2,
        "one prepare made {server_infos} server_info calls; the state was read once and reused \
         across the confirmation, which is exactly the staleness this step must not have"
    );
}

// ---------------------------------------------------------------------------
// The reads themselves
// ---------------------------------------------------------------------------

/// Everything after the index is pinned reads **that numeric index**, never
/// `"validated"` a second time.
///
/// Observed live on 2026-08-19: `account_objects` answered at 4596692 and
/// `account_info` at 4596693, seconds apart. A snapshot built from both is a
/// state that never existed on any ledger.
#[test]
fn every_read_after_the_first_pins_one_numeric_ledger_index() {
    let mut f = fixture();
    f.ledger.lock().unwrap().calls.clear();
    f.session.refresh().expect("read");
    let index = f.session.view().unwrap().snapshot.ledger_index;

    let calls = f.ledger.lock().unwrap().calls.clone();
    assert_eq!(calls[0].0, "server_info", "the network guard did not run first");
    for (command, params) in &calls[1..] {
        assert_eq!(
            params.get("ledger_index").and_then(serde_json::Value::as_u64),
            Some(index as u64),
            "`{command}` did not pin the snapshot's index: {params}"
        );
    }
    assert!(calls.len() >= 4, "a snapshot was assembled from {} calls", calls.len());
}

/// **The network guard runs before anything else is read.**
///
/// Not "is checked somewhere" — nothing else is read at all.
#[test]
fn a_network_that_is_not_devnet_is_refused_before_anything_else_is_read() {
    for network in [0u32, 1, 21337] {
        let mut f = fixture();
        {
            let mut l = f.ledger.lock().unwrap();
            l.network_id = network;
            l.calls.clear();
            l.reads = 0;
        }
        let err = f.session.refresh().expect_err("a non-Devnet endpoint was accepted");
        assert!(matches!(err, LedgerError::NotDevnet { .. }), "{err}");
        assert!(format!("{err}").contains("Devnet"), "{err}");

        let l = f.ledger.lock().unwrap();
        assert_eq!(
            l.reads, 1,
            "{} calls were made to a non-Devnet endpoint; only `server_info` may be",
            l.reads
        );
    }
}

/// A validated index that moves **backwards** is a lying or lagging node.
/// Validated ledgers do not reorganise.
#[test]
fn a_validated_index_that_moves_backwards_is_refused() {
    let mut f = fixture();
    f.session.refresh().expect("first read");
    f.ledger.lock().unwrap().ledger_index -= 1;
    let err = f.session.refresh().expect_err("a backwards validated index was accepted");
    assert!(matches!(err, LedgerError::Regressed { .. }), "{err}");
}

/// A node that is up but not keeping up returns state that is internally
/// consistent and wrong.
#[test]
fn a_node_that_is_not_synced_is_refused() {
    let mut f = fixture();
    f.ledger.lock().unwrap().age = 600;
    assert!(matches!(f.session.refresh(), Err(LedgerError::NotSynced { .. })));

    let mut f = fixture();
    f.ledger.lock().unwrap().server_state = "connected".into();
    assert!(matches!(f.session.refresh(), Err(LedgerError::NotSynced { .. })));
}

/// A ledger that cannot be reached refuses **distinguishably** from the
/// randomness ledger's own fault, which needs a human and must not be retried.
#[test]
fn an_unreachable_ledger_refuses_distinguishably_and_signs_nothing() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    f.ledger.lock().unwrap().offline = true;

    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    assert_eq!(v["code"], "REFUSED_LEDGER_UNAVAILABLE", "{v}");
    assert_ne!(v["code"], "REFUSED_RANDOMNESS_LEDGER_FAULT");
    assert!(c.seen.is_empty());
    assert_eq!(
        ledger_len(&store_of(&f)),
        0,
        "an unreachable ledger burned a randomness identifier"
    );
}

/// The one local anchor: the ledger's registered key for **this** account must
/// be the key this signer holds.
#[test]
fn a_holder_key_on_the_ledger_that_is_not_ours_is_refused() {
    let mut f = fixture();
    let other = prover::ElGamalKeypair::generate().unwrap();
    f.ledger.lock().unwrap().mptokens.get_mut(TEST_ADDRESS).unwrap().holder_key =
        Some(prover::hex(other.public()));

    f.session.refresh().expect("read");
    assert_eq!(f.session.own_key_matches_ledger(), Some(false));

    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    assert_eq!(v["code"], "REFUSED_LEDGER_MOVED", "{v}");
    assert!(c.seen.is_empty());

    // The control: our own key matches, and nothing is refused.
    let mut f = fixture_registered();
    f.session.refresh().expect("read");
    assert_eq!(f.session.own_key_matches_ledger(), Some(true));
}

/// An issuance with no `IssuerEncryptionKey` is not a confidential issuance,
/// and the signer says so rather than proving to a key it invented.
#[test]
fn an_issuance_with_no_issuer_key_is_refused() {
    let mut f = fixture();
    f.ledger.lock().unwrap().issuer_key = None;
    let err = f.session.refresh().expect_err("a non-confidential issuance was accepted");
    assert!(format!("{err}").contains("IssuerEncryptionKey"), "{err}");
}

// ---------------------------------------------------------------------------
// Issue #11 — the ledger facts step 6's onboarding branches on.
//
// ⚠ Step 6 is NOT built. These assert that step 2 **reads** the conditions, not
// that onboarding does anything with them. Saying otherwise would be a claim
// about work that does not exist.
// ---------------------------------------------------------------------------

#[test]
fn the_three_conditions_issue_11_names_are_read_from_the_account() {
    let cases: [(&str, Box<dyn Fn(&mut FakeLedger)>); 3] = [
        ("lsfDisableMaster is set", Box::new(|l: &mut FakeLedger| l.disable_master = true)),
        ("a regular key is set", Box::new(|l: &mut FakeLedger| l.regular_key = Some("rXYZ".into()))),
        ("a signer list is present", Box::new(|l: &mut FakeLedger| l.signer_lists = 1)),
    ];

    for (named, apply) in cases {
        let mut f = fixture();
        apply(&mut f.ledger.lock().unwrap());
        f.session.refresh().expect("read");
        let s = &f.session.view().unwrap().snapshot.security;
        assert!(
            s.master_seed_is_not_spending_authority(),
            "`{named}` was not read off the account"
        );
        assert!(s.conditions().contains(&named), "{:?} does not name it", s.conditions());
    }

    // The control: a plain account triggers none of them.
    let mut f = fixture();
    f.session.refresh().expect("read");
    let s = &f.session.view().unwrap().snapshot.security;
    assert!(!s.master_seed_is_not_spending_authority());
    assert!(s.conditions().is_empty());
}

// ---------------------------------------------------------------------------
// `binding_differs` in isolation — the comparison the recheck depends on.
// ---------------------------------------------------------------------------

fn snap(sequence: u32, ledger_index: u32) -> LedgerSnapshot {
    LedgerSnapshot {
        network_id: 2,
        ledger_index,
        ledger_hash: format!("{ledger_index:064X}"),
        read_at_unix: 1_000,
        account: TEST_ADDRESS.into(),
        sequence,
        security: AccountSecurity::default(),
        mptoken: Default::default(),
        issuance: wconf_signer::ledger::IssuanceState {
            issuer_encryption_key: [2u8; 33],
            auditor_encryption_key: None,
        },
        confidential_outstanding: 1_000,
    }
}

/// Every field a transaction binds to, changed one at a time.
///
/// ⚠ **This is the closest thing to a structural check that `binding_differs`
/// is complete**, and it is not one: a field added to `LedgerSnapshot` and left
/// out of the comparison is invisible here too. What it does buy is that
/// removing a comparison that exists today fails a test, and that the list of
/// what "binding" means is written down somewhere a reader will find it.
#[test]
fn each_binding_field_is_compared() {
    let base = snap(41, 100);

    let mut sequence = base.clone();
    sequence.sequence = 42;

    let mut version = base.clone();
    version.mptoken.balance_version = 1;

    let mut holder_key = base.clone();
    holder_key.mptoken.holder_encryption_key = Some([3u8; 33]);

    let mut spending = base.clone();
    spending.mptoken.balance_ciphertext = Some([7u8; 66]);

    let mut issuer = base.clone();
    issuer.issuance.issuer_encryption_key = [3u8; 33];

    let mut auditor = base.clone();
    auditor.issuance.auditor_encryption_key = Some([3u8; 33]);

    for (name, moved) in [
        ("Sequence", sequence),
        ("ConfidentialBalanceVersion", version),
        ("HolderEncryptionKey", holder_key),
        ("ConfidentialBalanceSpending", spending),
        ("IssuerEncryptionKey", issuer),
        ("AuditorEncryptionKey", auditor),
    ] {
        assert!(
            base.binding_differs(&moved).is_some(),
            "a change to {name} was not treated as drift"
        );
    }
}

#[test]
fn binding_differs_ignores_the_clock_and_the_index() {
    let a = snap(41, 100);
    let b = snap(41, 4_000_000);
    assert_eq!(
        a.binding_differs(&b),
        None,
        "a later read of the same state was treated as drift"
    );
    assert!(a.binding_differs(&snap(42, 100)).is_some());
}

#[test]
fn last_ledger_sequence_is_a_window_after_the_read() {
    let s = snap(1, 4_600_000);
    assert!(s.last_ledger_sequence() > s.ledger_index);
    assert_eq!(s.age_secs(1_030), 30);
    assert_eq!(s.age_secs(900), 0, "a clock that went backwards must not read as negative age");
}

/// A reader with no source is not a thing that can exist, and a `LedgerReader`
/// reports which endpoint it is bound to — for a log line, never for a
/// confirmation screen.
///
/// ⚠ The endpoint deliberately does **not** appear on the confirmation. A
/// number or a string that did not come out of the transaction's own bytes has
/// no business there; `CLAIMS.md` F-21 is the same rule for `NetworkID`.
#[test]
fn the_reader_names_its_endpoint_for_logs_only() {
    let f = fixture();
    let reader = LedgerReader::new(Box::new(FakeSource(f.ledger.clone())));
    assert_eq!(reader.describe(), "fake://ledger");
    assert_eq!(reader.last_index(), None);
}

// ---------------------------------------------------------------------------
// REVIEW-016 — what two independent legs found, and what one of them got wrong.
//
// Every test below fails if its fix is reverted. Two of them exist to pin a
// finding that was WRONG, because `CLAIMS.md` E-93's lesson is that a rejected
// review claim belongs in a test rather than in a disposition note nobody reads.
// ---------------------------------------------------------------------------

/// **Codex leg, HIGH.** A host that merely *looks* like loopback is a remote
/// host, and accepting plaintext to it is F-23's whole attack over the wire.
#[test]
fn a_host_that_only_resembles_loopback_is_refused_plaintext() {
    use std::time::Duration;
    use wconf_signer::ledger::JsonRpcSource;
    let t = Duration::from_secs(1);

    // Refused: the label begins with `127.` but the host is remote.
    for bad in [
        "http://127.attacker.example/",
        "http://127.0.0.1.attacker.example/",
        // Userinfo. The host is what follows the LAST `@`, not what precedes
        // the first `:` — this connects to attacker.example.
        "http://127.0.0.1@attacker.example/",
        "http://localhost@attacker.example/",
        "http://[::1]@attacker.example/",
        // Round two: an authority with no closing bracket is not a URL, and
        // must fail the check rather than yield the host `::1`.
        "http://[::1",
        "http://[::1]evil.example/",
        "http://[",
    ] {
        match JsonRpcSource::new(bad, t) {
            Err(LedgerError::InsecureEndpoint(_)) => {}
            Err(e) => panic!("`{bad}` refused for the wrong reason: {e}"),
            Ok(_) => panic!("`{bad}` was accepted as loopback; it is a remote host"),
        }
    }

    // The control. Without it the assertions above would pass on an
    // implementation that refused every plaintext endpoint, including the
    // local node the rule exists to permit.
    for good in [
        "http://127.0.0.1:5005/",
        "http://127.0.0.53:5005/",
        "http://localhost:5005/",
        "http://LocalHost:5005/",
        "http://[::1]:5005/",
        "http://user:pass@127.0.0.1:5005/",
    ] {
        assert!(JsonRpcSource::new(good, t).is_ok(), "`{good}` is loopback and was refused");
    }
}

/// **Codex leg, HIGH.** `as u32` truncates, and the truncated value walks
/// through a guard this project describes as absolute.
#[test]
fn a_network_id_that_truncates_to_devnet_is_refused_not_truncated() {
    let mut f = fixture();
    // 2^32 + 2. `as u32` gives 2.
    f.ledger.lock().unwrap().network_id = 2;
    f.session.refresh().expect("the control: plain 2 is Devnet and must pass");

    // The fake stores a u32, so drive the reader through a source that answers
    // with the oversized number directly.
    struct Oversized;
    impl wconf_signer::ledger::LedgerSource for Oversized {
        fn call(
            &self,
            command: &str,
            _p: serde_json::Value,
        ) -> Result<serde_json::Value, LedgerError> {
            assert_eq!(command, "server_info", "nothing else may be read first");
            Ok(serde_json::json!({
                "info": {
                    "network_id": 4_294_967_298u64,
                    "server_state": "full",
                    "validated_ledger": { "seq": 4_600_000, "hash": "AA", "age": 1 }
                }
            }))
        }
        fn describe(&self) -> String {
            "oversized".into()
        }
    }
    let mut r = LedgerReader::new(Box::new(Oversized));
    let iss = [0u8; 24];
    let err = r.read(TEST_ADDRESS, &iss, 0).expect_err("a truncating network_id was accepted");
    assert!(
        matches!(err, LedgerError::Malformed(_)),
        "expected a malformed-value refusal, got {err}"
    );
    assert!(format!("{err}").contains("32 bits"), "{err}");
}

/// **Codex leg, MEDIUM.** Asking for a pinned index is not checking that the
/// answer came from it.
#[test]
fn an_answer_from_a_different_ledger_than_the_one_asked_for_is_refused() {
    let mut f = fixture();
    f.ledger.lock().unwrap().answer_from = Some(4_599_999);
    let err = f.session.refresh().expect_err("a torn read was assembled and accepted");
    assert!(format!("{err}").contains("never existed"), "{err}");

    // Control: answering from the index it was asked for is fine.
    let mut f = fixture();
    f.session.refresh().expect("an honest answer must pass");
}

/// **Codex leg, MEDIUM.** The destination-key read is the one with no local
/// anchor, so a node answering with somebody else's `MPToken` matters most
/// there.
#[test]
fn an_mptoken_for_the_wrong_account_or_type_is_refused() {
    let mut f = fixture();
    f.ledger.lock().unwrap().mptoken_says_account = Some("rSOMEBODYELSE".into());
    let err = f.session.refresh().expect_err("another account's MPToken was accepted");
    assert!(format!("{err}").contains("MPToken was requested for"), "{err}");

    let mut f = fixture();
    f.ledger.lock().unwrap().mptoken_says_type = Some("MPTokenIssuance".into());
    let err = f.session.refresh().expect_err("the wrong object type was accepted");
    // ⚠ Asserting `contains("MPToken")` here would pass on **both** names —
    // `MPToken` is a substring of `MPTokenIssuance` — so it could not tell a
    // type-mismatch message from any other. Round two of `REVIEW-016` caught
    // that, and it is the kind of assertion that looks like a check.
    assert!(
        format!("{err}").contains("returned a `MPTokenIssuance`"),
        "the message does not identify the type that came back: {err}"
    );

    // The third field `mptoken_is_the_one_asked_for` checks, and it had no
    // test: an MPToken for the right account and the wrong issuance.
    let mut f = fixture();
    f.ledger.lock().unwrap().mptoken_says_issuance = Some("00".repeat(24));
    let err = f.session.refresh().expect_err("another issuance's MPToken was accepted");
    assert!(format!("{err}").contains("issuance"), "{err}");
}

/// Every field `u32_field` guards, not just the one the first test drove.
///
/// ⚠ Round two of `REVIEW-016`: `a_network_id_that_truncates_to_devnet_…`
/// pinned only `server_info.network_id`. `validated_ledger.seq`,
/// `account_data.Sequence` and `ConfidentialBalanceVersion` use the same helper
/// and could each have regressed to `as u32` with every test still passing —
/// a truncated `Sequence` is a transaction built for the wrong sequence number.
#[test]
fn every_u32_the_reader_takes_from_a_node_refuses_to_truncate() {
    // 2^32 + 41. `as u32` gives 41, which is this fixture's real sequence.
    const OVERSIZED: u64 = 4_294_967_337;

    struct Oversized(&'static str);
    impl wconf_signer::ledger::LedgerSource for Oversized {
        fn call(
            &self,
            command: &str,
            _p: serde_json::Value,
        ) -> Result<serde_json::Value, LedgerError> {
            let big = serde_json::json!(OVERSIZED);
            Ok(match command {
                "server_info" => serde_json::json!({ "info": {
                    "network_id": 2,
                    "server_state": "full",
                    "validated_ledger": {
                        "seq": if self.0 == "seq" { big } else { serde_json::json!(4_600_000) },
                        "hash": "AA", "age": 1
                    }
                }}),
                "account_info" => serde_json::json!({
                    "account_data": {
                        "Account": TEST_ADDRESS,
                        "Sequence": if self.0 == "Sequence" { big } else { serde_json::json!(41) },
                        "signer_lists": [],
                    },
                    "account_flags": { "disableMasterKey": false },
                    "ledger_index": 4_600_000, "validated": true,
                }),
                // ⚠ **Only the selected field is oversized.** It was `big`
                // here unconditionally, so the `Sequence` case errored on the
                // *version* instead and passed with the Sequence conversion
                // reverted — a test that could not fail for its own reason.
                // Caught by spot-checking the revert, which is the only thing
                // that catches this.
                _ => serde_json::json!({
                    "node": {
                        "LedgerEntryType": "MPToken",
                        "Account": TEST_ADDRESS,
                        "MPTokenIssuanceID": ISSUANCE,
                        "ConfidentialBalanceVersion": if self.0 == "ConfidentialBalanceVersion" {
                            big
                        } else {
                            serde_json::json!(3)
                        },
                        "IssuerEncryptionKey": "02".to_string() + &"00".repeat(32),
                    },
                    "ledger_index": 4_600_000, "validated": true,
                }),
            })
        }
        fn describe(&self) -> String {
            "oversized".into()
        }
    }

    let iss: [u8; 24] = xrpl::unhex(ISSUANCE).unwrap().try_into().unwrap();
    for field in ["seq", "Sequence", "ConfidentialBalanceVersion"] {
        let mut r = LedgerReader::new(Box::new(Oversized(field)));
        let err = r
            .read(TEST_ADDRESS, &iss, 0)
            .expect_err(&format!("an oversized `{field}` was truncated instead of refused"));
        assert!(
            format!("{err}").contains("32 bits"),
            "`{field}` was refused for the wrong reason: {err}"
        );
    }
}

/// ⚠ **A defect INTRODUCED by a round-one fix**, found by round two.
///
/// `came_from` returned `Malformed`, and `Malformed` classifies as a permanent
/// misconfiguration — so a cluster host answering one ledger behind, which
/// `CLAIMS.md` E-103 records as the ordinary transient condition of a public
/// endpoint, told the client *"Not retryable — an operator must change
/// something"*. That contradicted this project's own README one file over.
#[test]
fn a_lagging_cluster_host_is_retryable_not_a_misconfiguration() {
    let mut f = fixture();
    f.ledger.lock().unwrap().answer_from = Some(4_599_999);
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);

    assert_eq!(
        v["code"], "REFUSED_LEDGER_UNAVAILABLE",
        "a node that is behind is a retryable condition, not a misconfiguration: {v}"
    );
    assert!(v["detail"].as_str().unwrap().contains("Retryable"), "{v}");

    // The control: a genuinely permanent condition is still permanent.
    let mut f = fixture();
    f.ledger.lock().unwrap().network_id = 21337;
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    assert_eq!(v["code"], "REFUSED_LEDGER_NOT_USABLE", "{v}");
}

/// A `not found` is an answer, and must say which ledger said so.
///
/// Round two of `REVIEW-016`: this path returned `None` without checking, which
/// put an exception inside *"every answer must say it came from the ledger that
/// was asked for"*. The consequence was liveness rather than a leak — a false
/// `not found` refuses a Send — but the sentence was wrong either way.
#[test]
fn a_not_found_from_the_wrong_ledger_is_refused_too() {
    // ⚠ **Every other read must be honest**, or the error comes from one of
    // them and this test passes without the fix. It did: setting `answer_from`
    // globally made the *holder's* mptoken read fail first, and the assertion
    // could not tell which read had objected. Caught by spot-checking the
    // revert.
    struct OnlyTheNotFoundLies;
    impl wconf_signer::ledger::LedgerSource for OnlyTheNotFoundLies {
        fn call(
            &self,
            command: &str,
            p: serde_json::Value,
        ) -> Result<serde_json::Value, LedgerError> {
            Ok(match command {
                "server_info" => serde_json::json!({ "info": {
                    "network_id": 2, "server_state": "full",
                    "validated_ledger": { "seq": 4_600_000, "hash": "AA", "age": 1 }
                }}),
                "account_info" => serde_json::json!({
                    "account_data": { "Account": TEST_ADDRESS, "Sequence": 41, "signer_lists": [] },
                    "account_flags": { "disableMasterKey": false },
                    "ledger_index": 4_600_000, "validated": true,
                }),
                _ if p.get("mpt_issuance").is_some() => serde_json::json!({
                    "node": {
                        "LedgerEntryType": "MPTokenIssuance",
                        "IssuerEncryptionKey": "02".to_string() + &"00".repeat(32),
                    },
                    "ledger_index": 4_600_000, "validated": true,
                }),
                // The only dishonest answer in the whole snapshot, and it is a
                // `not found` — the path that used to skip the check entirely.
                _ => serde_json::json!({
                    "error": "entryNotFound",
                    "error_message": "Entry not found.",
                    "ledger_index": 4_599_999,
                    "validated": true,
                }),
            })
        }
        fn describe(&self) -> String {
            "only-the-not-found-lies".into()
        }
    }

    let iss: [u8; 24] = xrpl::unhex(ISSUANCE).unwrap().try_into().unwrap();
    let mut r = LedgerReader::new(Box::new(OnlyTheNotFoundLies));
    let err = r
        .read(TEST_ADDRESS, &iss, 0)
        .expect_err("a `not found` from another ledger was taken as an answer");
    assert!(
        format!("{err}").contains("4599999") && format!("{err}").contains("ledger_entry"),
        "the refusal does not identify the read that answered from elsewhere: {err}"
    );
}

/// **Codex leg, LOW / named gap — and the source made it sharper.**
///
/// rippled `AccountInfo.cpp:230-237` puts `signer_lists` under `account_data`
/// at `apiVersion == 1` and at the **top level** from version 2. Reading only
/// one place makes issue #11's third condition read as zero, silently.
#[test]
fn signer_lists_are_read_under_both_api_versions() {
    for at_top in [false, true] {
        let mut f = fixture();
        {
            let mut l = f.ledger.lock().unwrap();
            l.signer_lists = 1;
            l.signer_lists_at_top_level = at_top;
        }
        f.session.refresh().expect("read");
        let s = &f.session.view().unwrap().snapshot.security;
        assert_eq!(
            s.signer_lists, 1,
            "a signer list at {} was read as absent",
            if at_top { "the top level (apiVersion >= 2)" } else { "account_data (apiVersion 1)" }
        );
        assert!(s.master_seed_is_not_spending_authority());
    }
}

/// ...and absent from **both** places is a malformed answer, not zero.
///
/// rippled assigns the array whether or not a list exists once `signer_lists`
/// was requested, so absence cannot mean "none".
#[test]
fn signer_lists_missing_from_both_places_is_refused_not_read_as_zero() {
    let mut f = fixture();
    f.ledger.lock().unwrap().omit_signer_lists = true;
    let err = f.session.refresh().expect_err("a missing signer_lists was read as zero");
    assert!(format!("{err}").contains("neither documented place"), "{err}");
}

/// **BOTH legs, independently — the strongest signal in the round.**
///
/// `LastLedgerSequence` is fixed when the transaction is built and
/// `binding_differs` ignores the ledger index by design, so nothing noticed
/// that the transaction had expired while the human read the confirmation.
#[test]
fn a_transaction_that_expired_during_confirmation_is_not_signed() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    // Past the window, whatever the window is.
    let mut c = moving(&f.ledger, |l| l.ledger_index += 10_000);

    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
        "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5"
    });
    let v: serde_json::Value =
        serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();

    assert_eq!(c.seen, 1, "the human was never asked, so the race was never entered");
    assert_eq!(v["code"], "REFUSED_LEDGER_MOVED", "{v}");
    assert!(v["detail"].as_str().unwrap().contains("expired"), "{v}");
    assert!(v["tx_blob"].is_null(), "an expired transaction was signed: {v}");
}

/// The window must outlive its own confirmation timeout, or the check above
/// fires on the ordinary case instead of the broken one.
///
/// It was 20 ledgers — borrowed from `xrpl.js`'s `autofill`, which runs at
/// submit time with no human in the middle — against a 120-second timeout.
#[test]
fn the_last_ledger_window_outlives_the_confirmation_timeout() {
    // Devnet closes a ledger every ~3-4s. The window must cover the longest a
    // human may legitimately take, plus the submission that follows.
    let ledgers = wconf_signer::ledger::LAST_LEDGER_SEQUENCE_WINDOW as u64;
    let timeout = wconf_signer::store::CONFIRMATION_TIMEOUT_SECS;
    let fastest_plausible_close_secs = 3;
    assert!(
        ledgers * fastest_plausible_close_secs > timeout,
        "the transaction ({ledgers} ledgers ~ {}s at {fastest_plausible_close_secs}s/ledger) \
         expires before the confirmation it is waiting on ({timeout}s)",
        ledgers * fastest_plausible_close_secs
    );
}

/// **Gemini leg, and the remedy is narrower than it proposed.**
///
/// `lsfDisableMaster` already set means every blob this signer returns is
/// answered `tefMASTER_DISABLED`. It is not a warning.
#[test]
fn an_account_whose_master_key_is_disabled_gets_nothing_signed() {
    let mut f = fixture();
    f.ledger.lock().unwrap().disable_master = true;
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);

    assert_eq!(v["code"], "REFUSED_MASTER_KEY_DISABLED", "{v}");
    assert!(c.seen.is_empty(), "a human was asked to confirm a transaction that cannot be applied");
    assert_eq!(ledger_len(&store_of(&f)), 0, "a dead transaction burned a randomness identifier");
}

/// ...and the same flag arriving mid-confirmation.
#[test]
fn disable_master_set_during_confirmation_is_detected() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = moving(&f.ledger, |l| l.disable_master = true);

    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
        "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5"
    });
    let v: serde_json::Value =
        serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();
    assert_eq!(v["code"], "REFUSED_LEDGER_MOVED", "{v}");
    assert!(v["detail"].as_str().unwrap().contains("lsfDisableMaster"), "{v}");
}

/// A regular key or a signer list appearing mid-confirmation does **not** fire.
///
/// ⚠ **This is the half of the Gemini leg's remedy that was rejected**, and it
/// is pinned rather than written down in a disposition note. rippled
/// `Transactor.cpp:1039-1045`: with the master key enabled and
/// `idAccount == idSigner`, the answer is `tesSUCCESS` whatever else the
/// account carries. Refusing here would refuse valid transactions for a reason
/// that belongs to issue #11's keygen question, not to signing.
#[test]
fn a_regular_key_or_signer_list_arriving_mid_confirmation_does_not_refuse() {
    for (name, mutate) in [
        ("a regular key", Box::new(|l: &mut FakeLedger| l.regular_key = Some("rXYZ".into()))
            as Box<dyn Fn(&mut FakeLedger)>),
        ("a signer list", Box::new(|l: &mut FakeLedger| l.signer_lists = 1)),
    ] {
        let mut f = fixture();
        let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
        let mut c = moving(&f.ledger, mutate);
        let req = serde_json::json!({
            "type": "prepare", "grant": grant, "operation": "ConfidentialMPTSend",
            "issuance_id": ISSUANCE, "destination": DEST_ADDRESS, "amount": "5"
        });
        let v: serde_json::Value =
            serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c))
                .unwrap();
        assert_eq!(
            v["status"], "signed",
            "{name} arriving mid-confirmation refused a transaction rippled would have applied: {v}"
        );
    }
}

/// **Codex leg, LOW.** A permanent misconfiguration must not be reported with
/// a code whose text says "Retryable".
#[test]
fn permanent_and_transient_ledger_failures_are_different_codes() {
    // Permanent: the endpoint is on the wrong network.
    let mut f = fixture();
    f.ledger.lock().unwrap().network_id = 21337;
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    assert_eq!(v["code"], "REFUSED_LEDGER_NOT_USABLE", "{v}");
    assert!(!v["detail"].as_str().unwrap().contains("Retryable"), "{v}");

    // Transient: the node is unreachable.
    let mut f = fixture();
    f.ledger.lock().unwrap().offline = true;
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "5", &mut c);
    assert_eq!(v["code"], "REFUSED_LEDGER_UNAVAILABLE", "{v}");
    assert!(v["detail"].as_str().unwrap().contains("Retryable"), "{v}");
}

/// ⚠ **A rejected review claim, pinned by a test rather than by a note.**
///
/// `REVIEW-016`'s Gemini leg reported that `RawProfile` lacks
/// `#[serde(deny_unknown_fields)]` and called the module doc that says
/// otherwise "False", building two overclaim findings on top of it. The
/// attribute is present, one line above the struct. This is the fourth time in
/// this project that a leg's diagnosis has been wrong in a way that would have
/// been expensive to act on — `CLAIMS.md` E-93 is the precedent for pinning
/// rather than annotating.
#[test]
fn a_profile_carrying_an_unknown_field_is_refused() {
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
    wconf_signer::holder::HolderProfile::from_json(&base.to_string())
        .expect("the control: the base profile must load");

    for junk in ["ledger_url", "fee", "destination_key", "amountsearchto", "typo"] {
        let mut p = base.clone();
        p.as_object_mut().unwrap().insert(junk.into(), serde_json::json!("x"));
        let err = wconf_signer::holder::HolderProfile::from_json(&p.to_string())
            .expect_err(&format!("a profile carrying the unknown field `{junk}` was accepted"));
        assert!(
            format!("{err}").contains(junk),
            "the refusal does not name `{junk}`: {err}"
        );
    }
}

// ---------------------------------------------------------------------------
// `CLAIMS.md` B-15, ruled 2026-08-20 (`REVIEW-019`).
//
// One endpoint is accepted for this research artifact as a **named risk
// acceptance**, not because it is safe. Both legs made the disclosure a
// condition of the ruling rather than a courtesy, so it is tested like one.
// ---------------------------------------------------------------------------

/// The disclosure says the three things the ruling requires it to say.
///
/// ⚠ Asserting on the wording rather than on its presence is deliberate. A
/// disclosure that survives as an empty string, or that gets softened into
/// "note: remote endpoint", satisfies "it is printed" and satisfies nothing
/// else. `CLAIMS.md` P-5 forbids claiming more security than is delivered, and
/// this is the sentence that stops the single-endpoint design reading as a
/// decision made on security grounds.
#[test]
fn the_remote_disclosure_says_what_the_ruling_requires() {
    let d = wconf_signer::ledger::REMOTE_SOURCE_DISCLOSURE;
    for required in [
        // 1. that the node is trusted, in those words
        "TRUSTED FOR AMOUNT CONFIDENTIALITY",
        // 2. why TLS does not help
        "does not authenticate the ledger",
        "no Merkle proof",
        // 3. the executed consequence, not a hypothetical one
        "tecBAD_PROOF",
        "PERMANENTLY PUBLISHES",
        "F-23",
        // 4. the way out
        "localhost",
    ] {
        assert!(
            d.contains(required),
            "the remote-source disclosure no longer says `{required}`:\n{d}"
        );
    }
}

/// Loopback and remote are told apart, and a source that does not know is
/// treated as remote.
#[test]
fn loopback_is_distinguished_from_remote_and_unknown_defaults_to_remote() {
    use std::time::Duration;
    use wconf_signer::ledger::{JsonRpcSource, LedgerSource};
    let t = Duration::from_secs(1);

    for local in ["http://127.0.0.1:5005/", "http://localhost:5005/", "https://[::1]:5005/"] {
        assert!(JsonRpcSource::new(local, t).unwrap().is_loopback(), "{local}");
    }
    for remote in ["https://s.devnet.rippletest.net:51234/", "https://127.attacker.example/"] {
        assert!(!JsonRpcSource::new(remote, t).unwrap().is_loopback(), "{remote}");
    }

    // ⚠ The fake source does not override `is_loopback`, so it takes the
    // trait's default — and the default must be `false`. A source that does not
    // know is not loopback: the failure that matters is a remote source being
    // reported as local, which would suppress the disclosure.
    let f = fixture();
    assert!(!f.session.ledger_is_loopback());
}
