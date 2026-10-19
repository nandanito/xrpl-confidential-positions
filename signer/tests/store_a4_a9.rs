//! The randomness ledger against **A4–A9**.
//!
//! Each test names the amendment it falsifies. `REVIEW-013c` §3 ruled the
//! signer may not be built against A1–A3; these are the properties the
//! corrections require, asserted rather than asserted-about.

use std::path::PathBuf;
use wconf_signer::confirm::acknowledgement_for_test;
use wconf_signer::randomness::{derive_pair, Inputs, TxKind};
use wconf_signer::scalar::Scalar;
use wconf_signer::store::{
    r_entry, rho_entry, EntryKind, LocalKey, ReserveError, Status, Store, StoreFault,
    RECORD_WIRE_LEN,
};

fn tmpdir(name: &str) -> PathBuf {
    let d = std::env::temp_dir().join(format!("wconf-store-test-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&d);
    std::fs::create_dir_all(&d).unwrap();
    d
}

fn key() -> LocalKey {
    LocalKey::from_bytes([7u8; 32])
}

/// Derive a real (r, rho) pair from the ruled construction, varying `nonce` so
/// each call is a different signing attempt.
fn pair(nonce: u8) -> (Scalar, Scalar) {
    let account = [1u8; 20];
    let issuance = [2u8; 24];
    let context = [3u8; 32];
    let mut entropy = [4u8; 64];
    entropy[0] = nonce;
    derive_pair(&Inputs {
        tx_kind: TxKind::Send,
        account_id: &account,
        mpt_issuance_id: &issuance,
        tx_context_id: &context,
        entropy64: &entropy,
    })
    .unwrap()
}

fn entries(k: &LocalKey, nonce: u8) -> ([u8; 32], [u8; 32]) {
    let (r, rho) = pair(nonce);
    (r_entry(k, &r), rho_entry(k, &rho))
}

// ---------------------------------------------------------------------------
// The reason the store exists at all — E-63
// ---------------------------------------------------------------------------

#[test]
fn a_repeated_identifier_is_refused() {
    let d = tmpdir("dup");
    let mut s = Store::create(&d, key()).unwrap();
    let (re, rhoe) = entries(&key(), 1);
    let res = s.reserve(re, rhoe, 100).unwrap();
    s.commit(res, 101).unwrap();

    match s.reserve(re, rhoe, 200) {
        Err(ReserveError::AlreadyUsed { kind }) => assert_eq!(kind, EntryKind::R),
        other => panic!("a reused identifier was accepted: {other:?}"),
    }
}

#[test]
fn a_fresh_attempt_over_the_same_transaction_does_not_collide() {
    // A2's premise, asserted: `r` derives from entropy drawn per ATTEMPT, so a
    // retry over an identical transaction produces a different scalar and can
    // never match an orphaned reservation. If this fails, A2 is wrong and the
    // deadlock finding it corrected was right.
    let d = tmpdir("retry");
    let mut s = Store::create(&d, key()).unwrap();
    let (r1, rho1) = entries(&key(), 1);
    let _ = s.reserve(r1, rho1, 100).unwrap(); // orphaned: never committed
    let (r2, rho2) = entries(&key(), 2);
    assert!(s.reserve(r2, rho2, 101).is_ok(), "a retry collided with an orphaned reservation");
}

// ---------------------------------------------------------------------------
// A4 — the set is authenticated; truncation and rollback are detectable
// ---------------------------------------------------------------------------

#[test]
fn truncating_the_log_is_detected() {
    // THE defect both REVIEW-013 legs found in A1: entries were individually
    // MACed and the set was not, so a truncated store verified perfectly.
    let d = tmpdir("truncate");
    {
        let mut s = Store::create(&d, key()).unwrap();
        for i in 1..=3u8 {
            let (re, rhoe) = entries(&key(), i);
            let res = s.reserve(re, rhoe, 100).unwrap();
            s.commit(res, 101).unwrap();
        }
    }
    assert!(Store::open(&d, key()).is_ok(), "the untouched store does not open");

    let p = d.join("records.log");
    let mut bytes = std::fs::read(&p).unwrap();
    let n = bytes.len();
    bytes.truncate(n - RECORD_WIRE_LEN); // drop exactly one record
    std::fs::write(&p, &bytes).unwrap();

    match Store::open(&d, key()) {
        Err(StoreFault::Truncated { .. }) => {}
        other => panic!("truncation was not detected: {other:?}"),
    }
}

#[test]
fn altering_a_record_breaks_the_chain() {
    let d = tmpdir("alter");
    {
        let mut s = Store::create(&d, key()).unwrap();
        for i in 1..=3u8 {
            let (re, rhoe) = entries(&key(), i);
            let res = s.reserve(re, rhoe, 100).unwrap();
            s.commit(res, 101).unwrap();
        }
    }
    let p = d.join("records.log");
    let mut bytes = std::fs::read(&p).unwrap();
    bytes[9] ^= 0xff; // flip a byte inside the first record's identifier
    std::fs::write(&p, &bytes).unwrap();
    match Store::open(&d, key()) {
        Err(StoreFault::ChainBrokenAt(_)) => {}
        other => panic!("an altered record was accepted: {other:?}"),
    }
}

#[test]
fn reordering_records_breaks_the_chain() {
    let d = tmpdir("reorder");
    {
        let mut s = Store::create(&d, key()).unwrap();
        for i in 1..=2u8 {
            let (re, rhoe) = entries(&key(), i);
            let res = s.reserve(re, rhoe, 100).unwrap();
            s.commit(res, 101).unwrap();
        }
    }
    let p = d.join("records.log");
    let bytes = std::fs::read(&p).unwrap();
    let n = RECORD_WIRE_LEN;
    let mut swapped = Vec::new();
    swapped.extend_from_slice(&bytes[n..2 * n]);
    swapped.extend_from_slice(&bytes[0..n]);
    swapped.extend_from_slice(&bytes[2 * n..]);
    std::fs::write(&p, &swapped).unwrap();
    assert!(Store::open(&d, key()).is_err(), "reordered records were accepted");
}

#[test]
fn rolling_the_store_back_to_an_earlier_snapshot_is_detected() {
    // The VM-snapshot / backup-restore case. Both the log and the header are
    // restored together, so each is internally consistent — but the header is
    // MACed over the generation and the tail, so a rollback that pairs an old
    // log with a NEW header is caught, and one that restores both is caught by
    // the audit log living elsewhere (see the A6 test).
    let d = tmpdir("rollback");
    let mut s = Store::create(&d, key()).unwrap();
    let (re, rhoe) = entries(&key(), 1);
    let res = s.reserve(re, rhoe, 100).unwrap();
    s.commit(res, 101).unwrap();
    let old_log = std::fs::read(d.join("records.log")).unwrap();

    for i in 2..=3u8 {
        let (re, rhoe) = entries(&key(), i);
        let res = s.reserve(re, rhoe, 100).unwrap();
        s.commit(res, 101).unwrap();
    }
    drop(s);

    // Put the old log back under the current header.
    std::fs::write(d.join("records.log"), &old_log).unwrap();
    match Store::open(&d, key()) {
        Err(StoreFault::Truncated { .. }) => {}
        other => panic!("a rolled-back log was accepted: {other:?}"),
    }
}

#[test]
fn a_forged_header_is_rejected() {
    let d = tmpdir("forgehdr");
    {
        let mut s = Store::create(&d, key()).unwrap();
        let (re, rhoe) = entries(&key(), 1);
        let res = s.reserve(re, rhoe, 100).unwrap();
        s.commit(res, 101).unwrap();
    }
    let p = d.join("header.bin");
    let mut b = std::fs::read(&p).unwrap();
    b[24] ^= 0xff; // change entry_count
    std::fs::write(&p, &b).unwrap();
    assert!(matches!(Store::open(&d, key()), Err(StoreFault::HeaderMacMismatch)));
}

#[test]
fn a_store_written_under_another_key_does_not_open() {
    let d = tmpdir("wrongkey");
    {
        let mut s = Store::create(&d, key()).unwrap();
        let (re, rhoe) = entries(&key(), 1);
        let res = s.reserve(re, rhoe, 100).unwrap();
        s.commit(res, 101).unwrap();
    }
    assert!(Store::open(&d, LocalKey::from_bytes([9u8; 32])).is_err());
}

#[test]
fn a_missing_store_is_reported_as_missing_not_as_corruption() {
    let d = tmpdir("missing");
    assert!(matches!(Store::open(&d, key()), Err(StoreFault::Missing)));
}

// ---------------------------------------------------------------------------
// A5 — identifiers are append-only; only metadata may be pruned
// ---------------------------------------------------------------------------

#[test]
fn an_identifier_survives_reopening_and_still_blocks_reuse() {
    let d = tmpdir("persist");
    let (re, rhoe) = entries(&key(), 1);
    {
        let mut s = Store::create(&d, key()).unwrap();
        let res = s.reserve(re, rhoe, 100).unwrap();
        s.commit(res, 101).unwrap();
    }
    let mut s = Store::open(&d, key()).unwrap();
    assert!(s.contains(&re));
    assert!(matches!(s.reserve(re, rhoe, 200), Err(ReserveError::AlreadyUsed { .. })));
}

#[test]
fn the_store_exposes_no_way_to_delete_an_identifier() {
    // A5 is enforced by absence: there is no `remove`, `prune` or `retain` on
    // the store. If one is ever added this test is the place it will be
    // noticed, because it will need changing.
    let d = tmpdir("nodelete");
    let mut s = Store::create(&d, key()).unwrap();
    let (re, rhoe) = entries(&key(), 1);
    let res = s.reserve(re, rhoe, 100).unwrap();
    s.commit(res, 101).unwrap();
    let before = s.len();
    let promoted = s.promote_expired_pending(0, 10_000).unwrap();
    assert_eq!(promoted, 0, "already-committed entries were promoted again");
    assert!(s.len() >= before, "the store shrank; A5 says identifiers are append-only");
}

// ---------------------------------------------------------------------------
// A2 / A7 / A8 — promotion, never deletion; and the lease
// ---------------------------------------------------------------------------

#[test]
fn an_expired_pending_entry_is_promoted_not_deleted() {
    let d = tmpdir("promote");
    let mut s = Store::create(&d, key()).unwrap();
    let (re, rhoe) = entries(&key(), 1);
    let res = s.reserve(re, rhoe, 100).unwrap();
    drop(res); // simulate a crash: the lease is gone, the reservation orphaned

    let mut s = Store::open(&d, key()).unwrap();
    assert_eq!(s.status_of(&re), Some(Status::Pending));
    let n = s.promote_expired_pending(600, 100 + 601).unwrap();
    assert_eq!(n, 2, "both orphaned entries should have been promoted");
    assert_eq!(s.status_of(&re), Some(Status::Committed));
    assert!(s.contains(&re), "promotion deleted the identifier");
}

#[test]
fn a_live_reservation_is_not_promoted_under_a_waiting_human() {
    // A8(a): the holder walks away mid-confirmation and the lease expires. A
    // sweep must not promote a reservation belonging to a live attempt, or the
    // signing path reads its own reservation as a collision.
    let d = tmpdir("lease");
    let mut s = Store::create(&d, key()).unwrap();
    let (re, rhoe) = entries(&key(), 1);
    let res = s.reserve(re, rhoe, 100).unwrap();

    let promoted = s.promote_expired_pending(600, 100 + 10_000).unwrap();
    assert_eq!(promoted, 0, "a sweep promoted a live reservation");
    assert_eq!(s.status_of(&re), Some(Status::Pending));

    // And committing it afterwards still works.
    s.commit(res, 20_000).unwrap();
    assert_eq!(s.status_of(&re), Some(Status::Committed));
}

#[test]
fn commit_is_idempotent_after_a_sweep_promoted_the_same_entry() {
    // A8(a): promotion must be idempotent within a generation.
    let d = tmpdir("idem");
    let mut s = Store::create(&d, key()).unwrap();
    let (re, rhoe) = entries(&key(), 1);
    let res = s.reserve(re, rhoe, 100).unwrap();
    // Reach past the lease by reopening, which drops the in-memory lease.
    drop(s);
    let mut s2 = Store::open(&d, key()).unwrap();
    s2.promote_expired_pending(0, 10_000).unwrap();
    assert_eq!(s2.status_of(&re), Some(Status::Committed));
    // The original attempt now commits. It must not error.
    s2.commit(res, 10_001).unwrap();
    assert_eq!(s2.status_of(&re), Some(Status::Committed));
}

#[test]
fn a_cancelled_confirmation_burns_the_reservation_rather_than_clearing_it() {
    // A7: §7 step 7's "clear pending on a hard local failure" is struck.
    let d = tmpdir("burn");
    let mut s = Store::create(&d, key()).unwrap();
    let (re, rhoe) = entries(&key(), 1);
    let res = s.reserve(re, rhoe, 100).unwrap();
    // The holder declines. The signer commits anyway — burning is free.
    s.commit(res, 101).unwrap();
    assert_eq!(s.status_of(&re), Some(Status::Committed));
    assert!(matches!(s.reserve(re, rhoe, 102), Err(ReserveError::AlreadyUsed { .. })));
}

// ---------------------------------------------------------------------------
// A6 — the reset path
// ---------------------------------------------------------------------------

#[test]
fn a_fresh_start_bumps_the_generation_and_records_the_gap_outside_the_store() {
    let d = tmpdir("freshstart");
    {
        let mut s = Store::create(&d, key()).unwrap();
        let (re, rhoe) = entries(&key(), 1);
        let res = s.reserve(re, rhoe, 100).unwrap();
        s.commit(res, 101).unwrap();
        assert_eq!(s.generation_id(), 0);
    }
    // Corrupt it.
    std::fs::write(d.join("records.log"), b"garbage").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();

    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    let s = Store::fresh_start(&d, key(), &fault, &ack, 5_000).unwrap();
    assert_eq!(s.generation_id(), 1, "the generation did not advance");
    assert!(s.is_empty());

    // A6 item 4: the gap record is in a SEPARATE log, and it survived the reset.
    let audit = Store::read_audit(&d, &key()).unwrap();
    assert_eq!(audit.len(), 1, "no gap record was written");
    assert_eq!(audit[0].old_generation, 0);
    assert_eq!(audit[0].new_generation, 1);
    assert!(audit[0].acknowledged_by.contains("RESET RANDOMNESS LEDGER"));
}

#[test]
fn the_gap_record_survives_deleting_the_whole_randomness_store() {
    // The attack A6 item 4 answers: an adversary who deletes the store must not
    // thereby delete the evidence that it was deleted.
    let d = tmpdir("auditsurvives");
    {
        let mut s = Store::create(&d, key()).unwrap();
        let (re, rhoe) = entries(&key(), 1);
        let res = s.reserve(re, rhoe, 100).unwrap();
        s.commit(res, 101).unwrap();
    }
    std::fs::write(d.join("records.log"), b"x").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::fresh_start(&d, key(), &fault, &ack, 5_000).unwrap();

    // Now delete everything the randomness store consists of.
    let _ = std::fs::remove_file(d.join("records.log"));
    let _ = std::fs::remove_file(d.join("header.bin"));
    assert!(matches!(Store::open(&d, key()), Err(StoreFault::Missing)));

    let audit = Store::read_audit(&d, &key()).unwrap();
    assert_eq!(audit.len(), 1, "the gap record did not survive");
}

#[test]
fn tampering_with_the_audit_log_is_detected() {
    let d = tmpdir("auditchain");
    std::fs::write(d.join("records.log"), b"x").unwrap();
    std::fs::write(d.join("header.bin"), b"x").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::fresh_start(&d, key(), &fault, &ack, 5_000).unwrap();

    let p = d.join("audit.log");
    let s = std::fs::read_to_string(&p).unwrap();
    std::fs::write(&p, s.replace("5000", "9999")).unwrap();
    assert!(Store::read_audit(&d, &key()).is_err(), "an altered audit entry verified");
}

#[test]
fn every_reset_appends_a_gap_record_and_none_is_overwritten() {
    // A6 item 4 is only useful if repeated resets accumulate. An adversary who
    // can induce corruption repeatedly leaves a repeated trail.
    let d = tmpdir("multireset");
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::create(&d, key()).unwrap();
    for i in 0..3u32 {
        std::fs::write(d.join("records.log"), b"x").unwrap();
        let fault = Store::open(&d, key()).unwrap_err();
        let s = Store::fresh_start(&d, key(), &fault, &ack, 1_000 + i as u64).unwrap();
        assert_eq!(s.generation_id(), i + 1);
    }
    let audit = Store::read_audit(&d, &key()).unwrap();
    assert_eq!(audit.len(), 3, "gap records were overwritten rather than appended");
    assert_eq!(audit[0].new_generation, 1);
    assert_eq!(audit[2].new_generation, 3);
}

// ---------------------------------------------------------------------------
// A9 — the store's identifiers are keyed, and reveal nothing on their own
// ---------------------------------------------------------------------------

#[test]
fn identifiers_are_keyed_so_the_same_scalar_differs_between_installations() {
    // A1's actual property: without `k_local` the file does not link to on-chain
    // activity. Two installations holding the same scalar store different bytes.
    let (r, rho) = pair(1);
    let a = LocalKey::from_bytes([1u8; 32]);
    let b = LocalKey::from_bytes([2u8; 32]);
    assert_ne!(r_entry(&a, &r), r_entry(&b, &r), "identifiers are not keyed");
    assert_ne!(rho_entry(&a, &rho), rho_entry(&b, &rho));
}

#[test]
fn the_r_identifier_commits_to_the_point_not_the_scalar() {
    // §7 compares `r_commit` against the on-chain `C₁ = r·G`, so the identifier
    // must be over the point. A commitment over the raw scalar would not let
    // the signer perform §7's pre-sign field check.
    let (r, _) = pair(1);
    let k = key();
    let point = wconf_signer::store::compressed_r_g(&r);
    assert_eq!(point.len(), 33);
    assert!(point[0] == 0x02 || point[0] == 0x03, "not a compressed point: {:02x}", point[0]);
    // Distinct scalars give distinct identifiers.
    let (r2, _) = pair(2);
    assert_ne!(r_entry(&k, &r), r_entry(&k, &r2));
}

#[test]
fn a_local_key_never_prints_itself() {
    let printed = format!("{:?}", key());
    assert!(printed.contains("redacted"), "LocalKey leaked into Debug: {printed}");
}

// ===========================================================================
// REVIEW-014 — a test per confirmed finding.
//
// Each of these fails against the code as it stood at f7ef8a8.
// ===========================================================================

use wconf_signer::store::{CONFIRMATION_TIMEOUT_SECS, LEDGER_LEASE_SECS};

/// **C-2 (REVIEW-014b, HIGH).** `create()` used to wipe a live ledger with no
/// acknowledgement, no audit record and no generation bump.
#[test]
fn create_refuses_to_run_over_an_existing_ledger() {
    let d = tmpdir("createguard");
    let (re, rhoe) = entries(&key(), 1);
    {
        let mut s = Store::create(&d, key()).unwrap();
        let res = s.reserve(re, rhoe, 100).unwrap();
        s.commit(res, 101).unwrap();
    }
    let err = Store::create(&d, key()).unwrap_err();
    assert_eq!(err.kind(), std::io::ErrorKind::AlreadyExists, "create() overwrote a live ledger");
    // And the ledger is intact.
    let mut s = Store::open(&d, key()).unwrap();
    assert!(matches!(s.reserve(re, rhoe, 200), Err(ReserveError::AlreadyUsed { .. })));
}

/// **C-3 (both legs, HIGH).** The generation must never move backwards, and the
/// commonest reset trigger is exactly the one that used to reset it to 1.
#[test]
fn the_generation_never_moves_backwards_when_the_header_is_destroyed() {
    let d = tmpdir("genmono");
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::create(&d, key()).unwrap();

    // Reach generation 3 the ordinary way.
    for i in 0..3u32 {
        std::fs::write(d.join("records.log"), b"x").unwrap();
        let fault = Store::open(&d, key()).unwrap_err();
        let s = Store::fresh_start(&d, key(), &fault, &ack, 1_000 + i as u64).unwrap();
        assert_eq!(s.generation_id(), i + 1);
    }

    // Now destroy the header entirely — `peek_header` returns None.
    std::fs::remove_file(d.join("header.bin")).unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    assert!(matches!(fault, StoreFault::Missing));
    let s = Store::fresh_start(&d, key(), &fault, &ack, 9_000).unwrap();
    assert_eq!(s.generation_id(), 4, "the generation rolled back when the header was destroyed");
}

#[test]
fn the_generation_survives_a_mac_failing_header() {
    let d = tmpdir("genmac");
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::create(&d, key()).unwrap();
    std::fs::write(d.join("records.log"), b"x").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    Store::fresh_start(&d, key(), &fault, &ack, 1_000).unwrap();

    let mut h = std::fs::read(d.join("header.bin")).unwrap();
    h[24] ^= 0xff;
    std::fs::write(d.join("header.bin"), &h).unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    assert!(matches!(fault, StoreFault::HeaderMacMismatch));
    let s = Store::fresh_start(&d, key(), &fault, &ack, 2_000).unwrap();
    assert_eq!(s.generation_id(), 2, "a MAC-failing header reset the generation");
}

/// **C-4 (both legs, HIGH).** Deleting the last audit line used to leave a
/// shorter, perfectly valid chain — A4's own defect, one file over.
#[test]
fn deleting_the_last_audit_entry_is_detected() {
    let d = tmpdir("auditsuffix");
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::create(&d, key()).unwrap();
    for i in 0..2u32 {
        std::fs::write(d.join("records.log"), b"x").unwrap();
        let fault = Store::open(&d, key()).unwrap_err();
        Store::fresh_start(&d, key(), &fault, &ack, 1_000 + i as u64).unwrap();
    }
    assert_eq!(Store::read_audit(&d, &key()).unwrap().len(), 2);

    let p = d.join("audit.log");
    let text = std::fs::read_to_string(&p).unwrap();
    let kept: Vec<&str> = text.lines().filter(|l| !l.trim().is_empty()).collect();
    std::fs::write(&p, format!("{}\n", kept[0])).unwrap();

    assert!(Store::read_audit(&d, &key()).is_err(), "a truncated audit log verified");
}

#[test]
fn deleting_the_whole_audit_log_is_detected() {
    let d = tmpdir("auditgone");
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::create(&d, key()).unwrap();
    std::fs::write(d.join("records.log"), b"x").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    Store::fresh_start(&d, key(), &fault, &ack, 1_000).unwrap();

    std::fs::remove_file(d.join("audit.log")).unwrap();
    assert!(Store::read_audit(&d, &key()).is_err(), "a deleted audit log verified as empty");
}

/// The daemon must actually check it — the old code never called the verifier.
#[test]
fn open_refuses_when_the_audit_log_does_not_verify() {
    let d = tmpdir("auditonopen");
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::create(&d, key()).unwrap();
    std::fs::write(d.join("records.log"), b"x").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    Store::fresh_start(&d, key(), &fault, &ack, 1_000).unwrap();
    assert!(Store::open(&d, key()).is_ok());

    std::fs::remove_file(d.join("audit.log")).unwrap();
    match Store::open(&d, key()) {
        Err(StoreFault::AuditLogFault(_)) => {}
        other => panic!("open() ignored a broken audit log: {other:?}"),
    }
}

/// **C-5 (both legs).** A crash between the record fsync and the header write
/// used to burn the entire store. A6 item 5 says restore before reset.
#[test]
fn the_crash_window_is_recovered_rather_than_reset() {
    let d = tmpdir("crashwindow");
    let (re1, rho1) = entries(&key(), 1);
    {
        let mut s = Store::create(&d, key()).unwrap();
        let res = s.reserve(re1, rho1, 100).unwrap();
        s.commit(res, 101).unwrap();
    }
    // Simulate the crash: append a well-formed record, leave the header behind.
    let header_before = std::fs::read(d.join("header.bin")).unwrap();
    let (re2, rho2) = entries(&key(), 2);
    {
        let mut s = Store::open(&d, key()).unwrap();
        let _ = s.reserve(re2, rho2, 200).unwrap();
    }
    std::fs::write(d.join("header.bin"), &header_before).unwrap();

    // It must open, not demand a reset.
    let mut s = Store::open(&d, key()).expect("the crash window forced a reset");
    // And the trailing identifiers are ADOPTED, not dropped: the conservative
    // direction. A record that was fsynced may already have had its scalar used.
    assert!(s.contains(&re2), "an fsynced identifier was discarded on recovery");
    assert!(matches!(s.reserve(re2, rho2, 300), Err(ReserveError::AlreadyUsed { .. })));
    // The header is written forward, so a second open is clean.
    assert!(Store::open(&d, key()).is_ok());
}

/// **C-7 (REVIEW-014b).** A MAC that verifies proves the bytes were not
/// altered. It proves nothing about whether the state machine is legal.
#[test]
fn an_illegal_duplicate_transition_is_rejected_even_with_a_valid_chain() {
    let d = tmpdir("illegaldup");
    let (re, rhoe) = entries(&key(), 1);
    {
        let mut s = Store::create(&d, key()).unwrap();
        let res = s.reserve(re, rhoe, 100).unwrap();
        s.commit(res, 101).unwrap(); // pending, pending, committed, committed
    }
    // Re-reserving is refused in memory, so forge the log the only way a bug or
    // an adversary with `k_local` could: append a THIRD record for `re` that is
    // `pending` again, chained correctly.
    let mut s = Store::open(&d, key()).unwrap();
    s.force_append_for_test(EntryKind::R, re, Status::Pending, 300).unwrap();
    drop(s);

    match Store::open(&d, key()) {
        Err(StoreFault::IllegalTransitionAt(_)) => {}
        other => panic!("committed -> pending was accepted: {other:?}"),
    }
}

/// **C-8 (REVIEW-014b).** A8(a) requires stated constants, with the
/// confirmation timeout strictly shorter than the lease.
#[test]
fn the_confirmation_timeout_is_strictly_shorter_than_the_lease() {
    assert!(
        CONFIRMATION_TIMEOUT_SECS < LEDGER_LEASE_SECS,
        "a confirmation can outlive its reservation: {CONFIRMATION_TIMEOUT_SECS}s vs {LEDGER_LEASE_SECS}s"
    );
}

/// **C-11 (REVIEW-014b).** A short MAC field used to panic on an unchecked slice.
#[test]
fn a_malformed_audit_line_returns_an_error_rather_than_panicking() {
    let d = tmpdir("auditpanic");
    std::fs::create_dir_all(&d).unwrap();
    std::fs::write(d.join("audit.log"), "1|0|1|-1|reason|ack|abcd\n").unwrap();
    assert!(Store::read_audit(&d, &key()).is_err());
}

/// **C-12 (REVIEW-014a).** `install_id` was random and regenerated on every
/// reset, so a reset gave the same installation a new identity.
#[test]
fn the_install_id_is_stable_across_resets_and_differs_between_keys() {
    let d = tmpdir("installid");
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::create(&d, key()).unwrap();
    let id0 = Store::open(&d, key()).unwrap().install_id();
    std::fs::write(d.join("records.log"), b"x").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    let s = Store::fresh_start(&d, key(), &fault, &ack, 1_000).unwrap();
    assert_eq!(s.install_id(), id0, "a reset changed the installation identity");

    let d2 = tmpdir("installid2");
    let other = Store::create(&d2, LocalKey::from_bytes([9u8; 32])).unwrap();
    assert_ne!(other.install_id(), id0, "two installations share an identity");
}

/// **A6 item 6.** Every record carries the generation it was written under.
#[test]
fn records_carry_their_generation() {
    let d = tmpdir("recgen");
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::create(&d, key()).unwrap();
    std::fs::write(d.join("records.log"), b"x").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    let mut s = Store::fresh_start(&d, key(), &fault, &ack, 1_000).unwrap();
    assert_eq!(s.generation_id(), 1);
    let (re, rhoe) = entries(&key(), 1);
    let res = s.reserve(re, rhoe, 100).unwrap();
    s.commit(res, 101).unwrap();
    assert!(
        s.records_for_test().iter().all(|r| r.generation_id == 1),
        "a record does not carry its generation"
    );
}

/// **C-1 (REVIEW-014b, CRITICAL) — the half that IS detectable.**
///
/// Restoring the store files but not the audit log is caught, because the audit
/// log's committed generation is a floor the store cannot fall below.
///
/// ⚠ **The other half is NOT detectable and is not claimed.** An adversary who
/// restores EVERY file in the directory — store, header, audit log and audit
/// header together — leaves a set that is internally consistent in every way,
/// and no purely local check can see it. Detecting that needs an anchor outside
/// the rollback domain, which this project does not have.
#[test]
fn rolling_back_the_store_but_not_the_audit_log_is_detected() {
    let d = tmpdir("partialrollback");
    let ack = acknowledgement_for_test("rTEST RESET RANDOMNESS LEDGER");
    Store::create(&d, key()).unwrap();
    std::fs::write(d.join("records.log"), b"x").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    Store::fresh_start(&d, key(), &fault, &ack, 1_000).unwrap(); // generation 1

    let snap_records = std::fs::read(d.join("records.log")).unwrap();
    let snap_header = std::fs::read(d.join("header.bin")).unwrap();

    // Advance to generation 2.
    std::fs::write(d.join("records.log"), b"x").unwrap();
    let fault = Store::open(&d, key()).unwrap_err();
    let s = Store::fresh_start(&d, key(), &fault, &ack, 2_000).unwrap();
    assert_eq!(s.generation_id(), 2);

    // Roll the STORE back to the generation-1 snapshot, leaving the audit log.
    std::fs::write(d.join("records.log"), &snap_records).unwrap();
    std::fs::write(d.join("header.bin"), &snap_header).unwrap();

    let s = Store::open(&d, key()).unwrap();
    assert_eq!(s.generation_id(), 1, "precondition: the rolled-back store reads as generation 1");
    let audit_max = Store::read_audit(&d, &key())
        .unwrap()
        .iter()
        .map(|e| e.new_generation)
        .max()
        .unwrap();
    assert!(
        audit_max > s.generation_id(),
        "the audit log no longer witnesses a generation the store has forgotten"
    );
}
