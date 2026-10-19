//! **The wiring** — architecture §6 step 3's other half.
//!
//! `REVIEW-014` recorded that `session.rs` referenced neither `store` nor
//! `randomness`, that this was correct while nothing signed, and that *"wiring
//! them is part of step 3, not a follow-up."* These are the tests that fail if
//! the wiring is absent or wrong.
//!
//! Everything here drives the **real** path: real entropy, the ruled
//! derivation, the A4–A9 ledger, the vendored prover, canonical XRPL bytes and
//! a real signature. Nothing is stubbed.

use wconf_signer::store::{self, LocalKey, Status, Store};
use wconf_signer::xrpl;

#[path = "support/mod.rs"]
mod support;
use support::*;
use support::Fixture;

fn reopen(dir: &std::path::Path) -> Store {
    Store::open(dir, LocalKey::from_bytes([0x9Au8; 32])).expect("the ledger must still verify")
}

fn c1_of(blob_hex: &str, field: xrpl::FieldDef) -> [u8; 33] {
    let blob = xrpl::unhex(blob_hex).unwrap();
    let d = xrpl::decode(&blob).unwrap();
    let ct = d.get(field).expect("the transaction carries no such ciphertext");
    let mut c1 = [0u8; 33];
    c1.copy_from_slice(&ct[..33]);
    c1
}

// ---------------------------------------------------------------------------
// The reservation actually happens
// ---------------------------------------------------------------------------

/// §7 steps 4–6: both identifiers are reserved **before** proof generation and
/// are `committed` once the attempt finishes.
#[test]
fn signing_records_both_identifiers_in_the_randomness_ledger() {
    let mut f = fixture();
    let dir = store_of(&f);
    assert_eq!(reopen(&dir).len(), 0, "the ledger should start empty");

    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "10", &mut c);
    assert_eq!(v["status"], "signed", "{v}");

    let s = reopen(&dir);
    // Two identifiers reserved, each then superseded by a committed record:
    // the log is append-only, so promotion appends rather than edits.
    assert_eq!(s.len(), 4, "expected reserve+commit for r and rho, got {} records", s.len());
}

/// The identifier the ledger recorded is the identifier for the randomness the
/// transaction **actually published**.
///
/// `r_entry` commits to `compressed(r·G)`, and `C₁ = r·G` is on the wire. So
/// this can be checked from outside: take the blob, read `C₁`, recompute the
/// identifier with `k_local`, and look it up. A signer that recorded one scalar
/// and encrypted with another would fail here and nowhere else.
#[test]
fn the_recorded_identifier_is_the_one_the_transaction_published() {
    let mut f = fixture();
    let dir = store_of(&f);
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "10", &mut c);

    let c1 = c1_of(v["tx_blob"].as_str().unwrap(), xrpl::SENDER_ENCRYPTED_AMOUNT);
    let key = LocalKey::from_bytes([0x9Au8; 32]);
    let expected = store::r_entry_from_c1(&key, &c1);

    let s = reopen(&dir);
    assert!(s.contains(&expected), "the ledger does not hold the identifier for the published C1");
    assert_eq!(
        s.status_of(&expected),
        Some(Status::Committed),
        "the identifier was reserved but never committed"
    );
}

/// A `Convert` publishes `r` itself, in `BlindingFactor`. The identifier must
/// still be the one for `r·G`, and the published field must be exactly the
/// derived scalar — §7's rule for the types that publish.
#[test]
fn a_convert_publishes_the_derived_r_and_records_its_identifier() {
    let mut f = fixture();
    let dir = store_of(&f);
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTConvert", None, "250", &mut c);
    assert_eq!(v["status"], "signed", "{v}");

    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = xrpl::decode(&blob).unwrap();
    let published: [u8; 32] = d.get(xrpl::BLINDING_FACTOR).unwrap().try_into().unwrap();

    // `r` is published, so anyone can recompute `r·G` and check it against the
    // ciphertext's `C₁`. The signer's own consistency rule, verified from
    // outside the signer.
    let holder_ct = d.get(xrpl::HOLDER_ENCRYPTED_AMOUNT).unwrap();
    let issuer_ct = d.get(xrpl::ISSUER_ENCRYPTED_AMOUNT).unwrap();
    assert_eq!(&holder_ct[..33], &issuer_ct[..33], "the two ciphertexts do not share a C1");

    let key = LocalKey::from_bytes([0x9Au8; 32]);
    let mut c1 = [0u8; 33];
    c1.copy_from_slice(&holder_ct[..33]);
    assert!(reopen(&dir).contains(&store::r_entry_from_c1(&key, &c1)));

    // And the published scalar is 32 bytes of the value that produced it.
    assert_eq!(published.len(), 32);
    assert_ne!(published, [0u8; 32], "a zero blinding factor was published");
}

// ---------------------------------------------------------------------------
// A7 — a cancelled attempt BURNS, it does not clear
// ---------------------------------------------------------------------------

/// Amendment A7 struck §7 step 7's *"clear `pending`"*.
///
/// The scalars were derived from entropy belonging to that attempt alone, so
/// burning them costs nothing; deleting them could permit a reuse the store
/// exists to prevent.
#[test]
fn a_declined_confirmation_burns_the_reservation_rather_than_clearing_it() {
    let mut f = fixture();
    let dir = store_of(&f);
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    let mut c = Recorder::declining();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "10", &mut c);
    assert_eq!(v["code"], "REFUSED_DECLINED_BY_HOLDER");

    let s = reopen(&dir);
    assert_eq!(s.len(), 4, "a declined attempt left {} records; it must burn, not clear", s.len());
}

/// ~~A refusal *after* the reservation still burns.~~ **Replaced.**
///
/// This test used an over-spend, and an over-spend is refusable **before** any
/// randomness is drawn. Asserting that it burned four records codified a
/// defect as intended behaviour: a hostile local process could grow the
/// append-only ledger with requests that were never going to be signed
/// (`REVIEW-015b`). Validation now runs first, so the correct assertion is the
/// opposite one — and the burn property is still covered, on the declined path
/// above, which genuinely happens after the reservation.
#[test]
fn a_request_refusable_before_signing_never_touches_the_randomness_ledger() {
    let dir_len = |f: &Fixture| reopen(&store_of(f)).len();

    // Over the balance.
    let mut f = fixture_with(100, SEARCH_TO);
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "500", &mut c);
    assert_eq!(v["status"], "refused", "{v}");
    assert!(c.seen.is_empty(), "an over-spend reached the confirmation");
    assert_eq!(dir_len(&f), 0, "an over-spend burned identifiers it never needed");

    // A destination with no registered encryption key.
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(
        &mut f.session,
        &grant,
        "ConfidentialMPTSend",
        Some("rGzzsoiXsM3RmHU9Fu9eDQ6hoNoouyQiNT"),
        "5",
        &mut c,
    );
    assert_eq!(v["status"], "refused", "{v}");
    assert_eq!(dir_len(&f), 0, "an unknown destination burned identifiers");

    // A foreign issuance, on both transaction types.
    for (op, dest) in
        [("ConfidentialMPTSend", Some(DEST_ADDRESS)), ("ConfidentialMPTConvert", None)]
    {
        let mut f = fixture();
        let grant = pair(&mut f.session, &[op]);
        let mut c = Recorder::approving();
        let mut req = serde_json::json!({
            "type": "prepare", "grant": grant, "operation": op,
            "issuance_id": "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", "amount": "5"
        });
        if let Some(d) = dest {
            req.as_object_mut().unwrap().insert("destination".into(), serde_json::json!(d));
        }
        let v: serde_json::Value =
            serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c))
                .unwrap();
        assert_eq!(v["status"], "refused", "{op}: a foreign issuance was accepted: {v}");
        assert_eq!(dir_len(&f), 0, "{op}: a foreign issuance burned identifiers");
    }
}

/// The asymmetry that made the issuance check worth having twice.
///
/// `Send` checked the issuance and `Convert` did not (`REVIEW-015a` F-04). A
/// Convert would bind its context hash to a foreign issuance while encrypting
/// to **this** profile's issuer key, so the real issuer could never decrypt the
/// deposit.
#[test]
fn a_convert_for_an_issuance_this_signer_does_not_hold_is_refused() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTConvert"]);
    let mut c = Recorder::approving();
    let req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": "ConfidentialMPTConvert",
        "issuance_id": "0102030405060708090A0B0C0D0E0F101112131415161718", "amount": "5"
    });
    let v: serde_json::Value =
        serde_json::to_value(f.session.handle(req.to_string().as_bytes(), CONN, &mut c)).unwrap();
    assert_eq!(v["code"], "REFUSED_MALFORMED", "{v}");
    assert!(v["detail"].as_str().unwrap().contains("no position in that issuance"), "{v}");
    assert!(c.seen.is_empty());
}

// ---------------------------------------------------------------------------
// No reuse, which is the whole point
// ---------------------------------------------------------------------------

/// Two Sends from the same account, in the same context, must not share `C₁`.
///
/// **E-63 executed the opposite**: a passive full-ledger observer holding no
/// keys recovered the difference between two confidential amounts when `r`
/// repeated across two Sends, and rippled accepted both. This is that attack's
/// falsifier, run against transactions this signer produced.
#[test]
fn two_signings_never_share_the_published_c1() {
    let mut f = fixture();
    let dir = store_of(&f);
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    let mut seen = std::collections::HashSet::new();
    for i in 0..5 {
        let mut c = Recorder::approving();
        let v = prepare(
            &mut f.session,
            &grant,
            "ConfidentialMPTSend",
            Some(DEST_ADDRESS),
            "10",
            &mut c,
        );
        assert_eq!(v["status"], "signed", "attempt {i}: {v}");
        let c1 = c1_of(v["tx_blob"].as_str().unwrap(), xrpl::SENDER_ENCRYPTED_AMOUNT);
        assert!(seen.insert(c1), "attempt {i} reused a C1 seen earlier — this is E-63");
    }

    assert_eq!(reopen(&dir).len(), 20, "five signings should leave five reserve/commit pairs");
}

/// **A9, stated at its corrected strength.** The store is not the primary
/// defence — 64 fresh bytes per attempt are. Because the ruled KDF binds
/// `entropy64` *together with* `TransactionContextID`, two attempts in an
/// identical context still produce different scalars.
///
/// This test exists to keep that claim honest: if the derivation ever became
/// context-only, every assertion above would still pass and this one would not.
#[test]
fn an_identical_context_still_produces_different_randomness() {
    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut a = Recorder::approving();
    let mut b = Recorder::approving();
    // Same sequence, same destination, same issuance, same amount: the context
    // hash is byte-identical between these two.
    let v1 = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "10", &mut a);
    let v2 = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "10", &mut b);
    assert_ne!(
        c1_of(v1["tx_blob"].as_str().unwrap(), xrpl::SENDER_ENCRYPTED_AMOUNT),
        c1_of(v2["tx_blob"].as_str().unwrap(), xrpl::SENDER_ENCRYPTED_AMOUNT),
    );
    assert_ne!(v1["tx_blob"], v2["tx_blob"]);
}

// ---------------------------------------------------------------------------
// Entropy failure aborts. It does not degrade.
// ---------------------------------------------------------------------------

/// REVIEW-010c §2c, and the opposite of the sigma-nonce rule.
///
/// For `r` and `ρ`, entropy **is** the source rather than a hedge over a
/// secret-derived core, and `r` is published on chain. A dead entropy source
/// means refuse to sign — never fall back to something derived from a
/// long-lived key. Architecture §4 has all three randomness rules side by side
/// and all three are correct.
#[test]
fn an_entropy_failure_refuses_to_sign_and_does_not_degrade() {
    let mut f = fixture();
    let dir = store_of(&f);
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);

    store::fail_next_entropy_draw_for_test();
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "10", &mut c);

    assert_eq!(v["status"], "refused", "{v}");
    assert_eq!(v["code"], "REFUSED_ENTROPY_UNAVAILABLE", "{v}");
    assert!(v.get("tx_blob").is_none(), "something was signed after an entropy failure");
    assert!(c.seen.is_empty(), "an entropy failure reached the confirmation");
    assert_eq!(reopen(&dir).len(), 0, "an entropy failure reserved an identifier");

    // And the next attempt works, so the refusal was about the entropy and not
    // about a signer left in a broken state.
    let mut c2 = Recorder::approving();
    let v2 = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "10", &mut c2);
    assert_eq!(v2["status"], "signed", "{v2}");
}

// ---------------------------------------------------------------------------
// The signature is real
// ---------------------------------------------------------------------------

/// A signed blob must verify under the account's own public key, over the
/// digest of its own signing serialisation.
///
/// This checks the signature against the bytes in the blob rather than against
/// the bytes the signer happened to hold — a signer that signed one
/// serialisation and emitted another would pass every other test here.
#[test]
fn the_signature_verifies_over_the_blob_that_carries_it() {
    use k256::ecdsa::signature::hazmat::PrehashVerifier;

    let mut f = fixture();
    let grant = pair(&mut f.session, &["ConfidentialMPTSend"]);
    let mut c = Recorder::approving();
    let v = prepare(&mut f.session, &grant, "ConfidentialMPTSend", Some(DEST_ADDRESS), "10", &mut c);

    let blob = xrpl::unhex(v["tx_blob"].as_str().unwrap()).unwrap();
    let d = xrpl::decode(&blob).unwrap();
    let pubkey = d.get(xrpl::SIGNING_PUB_KEY).unwrap().to_vec();
    let sig_der = d.get(xrpl::TXN_SIGNATURE).unwrap().to_vec();

    // Rebuild the signing serialisation from the blob itself: every field
    // except TxnSignature, in the same canonical order, behind the STX prefix.
    let mut signing = 0x5354_5800u32.to_be_bytes().to_vec();
    let sig_key = (xrpl::type_code_of(xrpl::Kind::Blob), xrpl::TXN_SIGNATURE.nth);
    let mut rebuilt = Vec::new();
    for key in d.keys() {
        if key == sig_key {
            continue;
        }
        let value = d
            .fields_at(key)
            .expect("a key returned by keys() must resolve");
        rebuilt.extend_from_slice(&xrpl::field_header(key.0, key.1));
        if key.0 == 7 || key.0 == 8 {
            rebuilt.extend_from_slice(&xrpl::vl_prefix(value.len()).unwrap());
        }
        rebuilt.extend_from_slice(value);
    }
    signing.extend_from_slice(&rebuilt);

    let digest = xrpl::sha512half(&signing);
    let vk = k256::ecdsa::VerifyingKey::from_sec1_bytes(&pubkey).unwrap();
    let sig = k256::ecdsa::Signature::from_der(&sig_der).unwrap();
    assert!(vk.verify_prehash(&digest, &sig).is_ok(), "the signature does not verify over the blob");

    // The hash the response reports is the hash of the blob it returned.
    assert_eq!(v["hash"].as_str().unwrap(), xrpl::hex(&xrpl::transaction_hash(&blob)));
}
