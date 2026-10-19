//! Architecture §6 step 2 against **a real Devnet node**.
//!
//! ```
//! cargo test --test ledger_devnet -- --ignored --nocapture
//! ```
//!
//! # Why these are `#[ignore]` and not silently skipped
//!
//! `tests/ledger_read.rs` drives every property of the read path through a fake
//! [`LedgerSource`](wconf_signer::ledger::LedgerSource) whose JSON was
//! transcribed from a live rippled 3.3.0. **A transcription can be wrong**, and
//! a test suite that only ever reads its own transcription would never find
//! out. These tests are what says the transcription is honest.
//!
//! They need the network, so they cannot be part of `cargo test`. They are
//! **`#[ignore]`d rather than made to skip on a missing environment variable**:
//! an ignored test is counted and printed on every run, and a skip that reports
//! `ok` is the false-pass mode `REVIEW-009` §8 found in `t-nbound.c` and that
//! `xrpl_vectors.rs` refuses for the same reason.
//!
//! ⚠ **Devnet only.** Every assertion here is a read. Nothing in this file
//! submits anything, and `network_id` 2 is checked before any of it.

use std::time::Duration;
use wconf_signer::ledger::{JsonRpcSource, LedgerError, LedgerReader, DEFAULT_ENDPOINT};
use wconf_signer::xrpl;

/// The clean holder from `CLAIMS.md` E-85, whose every confidential
/// transaction came from `signer/`.
///
/// ⚠ Its seeds were in `/tmp/wconf/state.json` and are **gone** (E-97). The
/// account and its history stay verifiable on Devnet; the ability to drive it
/// does not. That is exactly the right shape for a read-path test.
const ACCOUNT: &str = "rnU7af8QRAgE2Qp7qeAYJLgeMmmTcbvX81";
const ISSUANCE_HEX: &str = "00453A78D67EB7E60002C33AAD59E7F544C136A8D30F5D52";

/// ⚠ **Pinned because keys cannot be rotated** — `CLAIMS.md` P-10, E-9, E-10.
/// A registered `HolderEncryptionKey` is permanent, so this is a fact about the
/// ledger and not a snapshot of a moving value. If it ever changes, something
/// is wrong with the read, not with the ledger.
const HOLDER_KEY: &str = "02923CCB1FF1DC018D36C2A2DEBF3B566C3F2D9D469F469720BC961C4A5503E3BB";
const ISSUER_KEY: &str = "02634A4F8D485FAD7D213996864B5AE572FCBD6442736DD7D5E53E7C4B69C92913";

fn issuance() -> [u8; 24] {
    xrpl::unhex(ISSUANCE_HEX).unwrap().try_into().unwrap()
}

fn endpoint() -> String {
    std::env::var("WCONF_LEDGER_ENDPOINT").unwrap_or_else(|_| DEFAULT_ENDPOINT.to_string())
}

fn reader() -> LedgerReader {
    LedgerReader::new(Box::new(
        JsonRpcSource::new(&endpoint(), Duration::from_secs(30)).expect("endpoint"),
    ))
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[test]
#[ignore = "reads live Devnet; run with --ignored"]
fn a_real_devnet_read_produces_the_snapshot_the_signer_builds_against() {
    let mut r = reader();
    let s = r.read(ACCOUNT, &issuance(), now()).expect("the read failed");

    assert_eq!(s.network_id, 2, "this is not Devnet");
    assert!(s.ledger_index > 4_500_000, "implausible validated index {}", s.ledger_index);
    assert_eq!(s.ledger_hash.len(), 64, "no ledger hash: {:?}", s.ledger_hash);
    assert_eq!(s.account, ACCOUNT);
    assert!(s.sequence > 0, "an account with no Sequence");

    // The MPToken. Every one of these was a line in a profile file.
    assert!(s.mptoken.exists, "{ACCOUNT} holds no MPToken for {ISSUANCE_HEX}");
    assert_eq!(
        s.mptoken.holder_encryption_key.map(|k| xrpl::hex(&k)).as_deref(),
        Some(HOLDER_KEY),
        "the registered HolderEncryptionKey is not the one recorded. Keys cannot be rotated \
         (P-10), so this is a defect in the read, not a change on the ledger"
    );
    let ct = s.mptoken.balance_ciphertext.expect("no ConfidentialBalanceSpending");
    assert_eq!(ct.len(), 66);
    assert!(
        s.mptoken.balance_version >= 6,
        "ConfidentialBalanceVersion went backwards: {}",
        s.mptoken.balance_version
    );

    // The issuance.
    assert_eq!(xrpl::hex(&s.issuance.issuer_encryption_key), ISSUER_KEY);
    assert_eq!(s.issuance.auditor_encryption_key, None, "this issuance has no auditor");

    // Issue #11's three conditions, read off a real AccountRoot.
    assert!(
        !s.security.master_seed_is_not_spending_authority(),
        "this account is not supposed to carry any of them: {:?}",
        s.security.conditions()
    );

    println!(
        "read at ledger {} ({}), Sequence {}, ConfidentialBalanceVersion {}",
        s.ledger_index, s.ledger_hash, s.sequence, s.mptoken.balance_version
    );

    // ⚠ Amounts are hidden; identities, counterparties, timing and frequency
    // are not, and the issuer decrypts everything. CLAIMS.md P-4, P-9, P-11.
}

/// Two consecutive reads against a public cluster, which hands out **different
/// hosts** — observed live on 2026-08-19, `server_info` answering as `FUSS`
/// then as `JUTE`.
///
/// The monotonicity check must survive that. If it fires here it means the
/// cluster put us behind a lagging node, which is a real condition an operator
/// needs to know about, and the refusal says so.
#[test]
#[ignore = "reads live Devnet; run with --ignored"]
fn two_reads_in_a_row_do_not_regress() {
    let mut r = reader();
    let a = r.read(ACCOUNT, &issuance(), now()).expect("first read");
    let b = r.read(ACCOUNT, &issuance(), now()).expect(
        "the second read regressed. Against a public cluster that means a lagging node, not a \
         bug — but it is exactly what the check exists to surface",
    );
    assert!(b.ledger_index >= a.ledger_index);
    assert_eq!(a.binding_differs(&b), None, "the account moved between two reads seconds apart");
}

/// The destination-key read, which is the one with **no local anchor** and
/// whose substitution is a confidentiality break rather than a rejection
/// (`CLAIMS.md` F-23).
#[test]
#[ignore = "reads live Devnet; run with --ignored"]
fn the_holder_key_read_is_the_same_one_the_snapshot_carries() {
    let mut r = reader();
    let s = r.read(ACCOUNT, &issuance(), now()).expect("read");
    let direct = r
        .holder_encryption_key(ACCOUNT, &issuance(), s.ledger_index)
        .expect("the destination-key read failed");
    assert_eq!(
        direct, s.mptoken.holder_encryption_key,
        "the same field read two ways disagreed"
    );

    // An account that holds no MPToken for this issuance is `None`, not an
    // error — the issuer itself is a convenient real example.
    let issuer_account = "rLZ9Qbe9VU7bgk5WwrZwfYesHCnfsdn5Fs";
    assert_eq!(
        r.holder_encryption_key(issuer_account, &issuance(), s.ledger_index).expect("read"),
        None
    );
}

/// A plaintext endpoint to a real remote host is refused before a packet is
/// sent.
#[test]
#[ignore = "run with --ignored alongside the others"]
fn plaintext_to_a_real_remote_host_is_refused() {
    match JsonRpcSource::new("http://s.devnet.rippletest.net:51234/", Duration::from_secs(5)) {
        Err(LedgerError::InsecureEndpoint(_)) => {}
        Err(other) => panic!("refused for the wrong reason: {other}"),
        Ok(_) => panic!("a plaintext remote endpoint was accepted"),
    }
}
