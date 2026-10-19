//! A signer with throwaway keys and a real randomness ledger, for tests.
//!
//! Everything here is what architecture §6 step 3 wired in: the FFI prover,
//! the ruled `r`/`ρ` derivation, the A4–A9 ledger, real XRPL serialisation and
//! a real ECDSA signature. **No part of it is a stub.** A fixture that faked
//! any of them would make the falsifier vacuous, which is the failure mode
//! `REVIEW-009` §8 found in `t-nbound.c`.

#![allow(dead_code)]

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use wconf_signer::confirm::Confirmer;
use wconf_signer::grant::ConnectionId;
use wconf_signer::holder::HolderProfile;
use wconf_signer::ledger::{LedgerError, LedgerReader, LedgerSource};
use wconf_signer::prover::{self, ElGamalKeypair};
use wconf_signer::scalar::reduce_wide;
use wconf_signer::session::Session;
use wconf_signer::store::{self, LocalKey, Store};

/// A published constant, not a key anybody should fund. It is the first seed in
/// `tools/spike-step3-2026-08-18/xrpl-vectors.json`, derived from 16 zero
/// bytes.
pub const TEST_SEED: &str = "sp6JS7f14BuwFY8Mw6bTtLKWauoUs";
pub const TEST_ADDRESS: &str = "rGCkuB7PBr5tNy68tPEABEtcdno4hE6Y7f";
/// The second vector seed's address — a real, checksum-valid destination.
pub const DEST_ADDRESS: &str = "rPV7gv7mxunHkt5wHniAmZZsiTH9CDdVZK";
pub const ISSUANCE: &str = "0000006DCA9D4EFB0E2B39E2E9F8B44BEEEB33FC3CD16A08";

/// ⚠ **Bounded by `SEARCH_TO`, and that is new.**
///
/// It was 100_000 while the balance was a number declared in a profile file.
/// Architecture §6 step 2 decrypts it from `ConfidentialBalanceSpending`
/// instead, and the decryption is the same bounded discrete log the
/// confirmation uses — so a balance above `SEARCH_TO` is a balance the signer
/// refuses to check an amount against. That is a real consequence of the step,
/// not a test compromise.
pub const BALANCE: u64 = 10_000;
/// Bounded so a test suite is not held hostage by a linear discrete log. The
/// falsifier's own attack uses 9999, so the bound has to exceed it.
pub const SEARCH_TO: u64 = 12_000;

pub const CONN: ConnectionId = ConnectionId(1);

static COUNTER: AtomicU64 = AtomicU64::new(0);

pub fn scratch(tag: &str) -> PathBuf {
    let n = COUNTER.fetch_add(1, Ordering::SeqCst);
    let p = std::env::temp_dir()
        .join("wconf-signer-tests")
        .join(format!("{tag}-{}-{n}", std::process::id()));
    let _ = std::fs::remove_dir_all(&p);
    std::fs::create_dir_all(&p).expect("scratch dir");
    p
}

/// Records what it was shown, so a test can inspect the exact bytes that
/// reached the holder's screen.
pub struct Recorder {
    pub seen: Vec<String>,
    pub answer: bool,
}

impl Confirmer for Recorder {
    fn confirm(&mut self, rendered: &str) -> bool {
        self.seen.push(rendered.to_string());
        self.answer
    }
}

impl Recorder {
    pub fn approving() -> Recorder {
        Recorder { seen: vec![], answer: true }
    }
    pub fn declining() -> Recorder {
        Recorder { seen: vec![], answer: false }
    }
    pub fn last(&self) -> &str {
        self.seen.last().expect("nothing was ever confirmed")
    }
}

// ---------------------------------------------------------------------------
// A ledger that answers in rippled's own shapes.
//
// ⚠ **This is a SOURCE, not a bypass.** Architecture §6 step 2 is falsified if
// the signer builds against state it did not read, so the fixture does not
// hand `Session` a pre-made snapshot — it makes the signer perform the same
// reads, through the same parsing, that `JsonRpcSource` performs against
// Devnet. The JSON below is the shape a live 3.3.0 node returned on
// 2026-08-19, transcribed field for field.
//
// `tests/ledger_devnet.rs` is what says the transcription is honest: it runs
// the same code against a real node.
// ---------------------------------------------------------------------------

#[derive(Clone, Debug)]
pub struct FakeMpToken {
    pub holder_key: Option<String>,
    pub spending: Option<String>,
    pub version: u32,
}

#[derive(Clone, Debug)]
pub struct FakeLedger {
    pub network_id: u32,
    pub ledger_index: u32,
    pub age: u64,
    pub server_state: String,
    pub sequence: u32,
    pub disable_master: bool,
    pub regular_key: Option<String>,
    pub signer_lists: usize,
    pub issuer_key: Option<String>,
    pub auditor_key: Option<String>,
    /// `sfConfidentialOutstandingAmount` on the issuance. XLS-0096 §10.4.2
    /// item 5 refuses a ConvertBack that would take it below zero.
    pub confidential_outstanding: u64,
    pub mptokens: HashMap<String, FakeMpToken>,
    /// Every call fails as a transport error.
    pub offline: bool,
    /// Counted so a test can assert the signer read again rather than reusing.
    pub reads: usize,
    /// Answer every pinned read from THIS index instead of the one asked for.
    ///
    /// A node that says one thing in `server_info` and answers from another
    /// ledger. `Some(i)` makes it do so.
    pub answer_from: Option<u32>,
    /// Return `signer_lists` at the top level, as rippled does from
    /// `apiVersion` 2 onwards (`AccountInfo.cpp:236`).
    pub signer_lists_at_top_level: bool,
    /// Return `signer_lists` in neither place, which rippled never does when
    /// it was asked for.
    pub omit_signer_lists: bool,
    /// Answer an `MPToken` read with a node belonging to this account instead.
    pub mptoken_says_account: Option<String>,
    /// Answer an `MPToken` read with a node of this `LedgerEntryType` instead.
    pub mptoken_says_type: Option<String>,
    /// Answer an `MPToken` read with a node for this issuance instead.
    pub mptoken_says_issuance: Option<String>,
    /// Every call, in order, with the parameters it carried.
    ///
    /// Recorded so a test can assert what the signer *asked for* — in
    /// particular that every read after `server_info` pinned a numeric
    /// `ledger_index` rather than asking for `"validated"` again. Two
    /// `"validated"` reads seconds apart land in different ledgers, and a
    /// snapshot assembled from both is a state that never existed.
    pub calls: Vec<(String, serde_json::Value)>,
}

pub type Ledger = Arc<Mutex<FakeLedger>>;

pub struct FakeSource(pub Ledger);

impl LedgerSource for FakeSource {
    fn call(
        &self,
        command: &str,
        params: serde_json::Value,
    ) -> Result<serde_json::Value, LedgerError> {
        let mut l = self.0.lock().unwrap();
        if l.offline {
            return Err(LedgerError::Transport("the fake ledger is offline".into()));
        }
        l.reads += 1;
        l.calls.push((command.to_string(), params.clone()));
        let index = l.ledger_index;
        // What a pinned read is answered from. Equal to `index` unless a test
        // is making the node lie about which ledger it consulted.
        let answered = l.answer_from.unwrap_or(index);
        Ok(match command {
            "server_info" => serde_json::json!({
                "info": {
                    "build_version": "3.3.0",
                    "network_id": l.network_id,
                    "server_state": l.server_state,
                    "validated_ledger": {
                        "seq": index,
                        "hash": format!("{index:064X}"),
                        "age": l.age,
                    }
                }
            }),
            "account_info" => {
                let lists = vec![serde_json::json!({}); l.signer_lists];
                let mut data = serde_json::json!({
                    "Account": params["account"],
                    "Sequence": l.sequence,
                    "Flags": 0,
                    "LedgerEntryType": "AccountRoot",
                    "RegularKey": l.regular_key,
                });
                let mut out = serde_json::json!({
                    "account_flags": { "disableMasterKey": l.disable_master },
                    "ledger_index": answered,
                    "validated": true,
                });
                if !l.omit_signer_lists {
                    if l.signer_lists_at_top_level {
                        out["signer_lists"] = serde_json::json!(lists);
                    } else {
                        data["signer_lists"] = serde_json::json!(lists);
                    }
                }
                out["account_data"] = data;
                out
            }
            "ledger_entry" => {
                if params.get("mpt_issuance").is_some() {
                    let mut node = serde_json::json!({
                        "LedgerEntryType": "MPTokenIssuance",
                        "mpt_issuance_id": params["mpt_issuance"],
                    });
                    if let Some(k) = &l.issuer_key {
                        node["IssuerEncryptionKey"] = serde_json::json!(k);
                    }
                    if let Some(k) = &l.auditor_key {
                        node["AuditorEncryptionKey"] = serde_json::json!(k);
                    }
                    // ⚠ **A string, as rippled serialises every `UINT64`.**
                    // A reader that used the numeric helper would see it as
                    // absent rather than as wrong, so the fixture must not
                    // quietly emit a number here.
                    node["ConfidentialOutstandingAmount"] =
                        serde_json::json!(l.confidential_outstanding.to_string());
                    serde_json::json!({ "node": node, "ledger_index": answered, "validated": true })
                } else {
                    let account = params["mptoken"]["account"].as_str().unwrap_or("");
                    match l.mptokens.get(account) {
                        None => serde_json::json!({
                            "error": "entryNotFound",
                            "error_code": 98,
                            "error_message": "Entry not found.",
                            "ledger_index": answered,
                            "validated": true,
                        }),
                        Some(t) => {
                            let mut node = serde_json::json!({
                                "LedgerEntryType": "MPToken",
                                "Account": account,
                                "MPTokenIssuanceID": params["mptoken"]["mpt_issuance_id"],
                                "Flags": 0,
                            });
                            if let Some(k) = &t.holder_key {
                                node["HolderEncryptionKey"] = serde_json::json!(k);
                            }
                            if let Some(c) = &t.spending {
                                node["ConfidentialBalanceSpending"] = serde_json::json!(c);
                            }
                            // `SoeDefault`: rippled omits it when it is zero,
                            // and the reader must read the absence as zero.
                            if t.version != 0 {
                                node["ConfidentialBalanceVersion"] = serde_json::json!(t.version);
                            }
                            if let Some(a) = &l.mptoken_says_account {
                                node["Account"] = serde_json::json!(a);
                            }
                            if let Some(t) = &l.mptoken_says_type {
                                node["LedgerEntryType"] = serde_json::json!(t);
                            }
                            if let Some(i) = &l.mptoken_says_issuance {
                                node["MPTokenIssuanceID"] = serde_json::json!(i);
                            }
                            serde_json::json!({
                                "node": node, "ledger_index": answered, "validated": true
                            })
                        }
                    }
                }
            }
            other => serde_json::json!({
                "error": "unknownCmd",
                "error_message": format!("the fake ledger does not implement `{other}`"),
            }),
        })
    }

    fn describe(&self) -> String {
        "fake://ledger".into()
    }
}

pub struct Fixture {
    pub session: Session,
    pub dir: PathBuf,
    /// The ledger the session reads. Mutate it to move the ledger under a
    /// transaction that has already been built.
    pub ledger: Ledger,
    /// The destination's **keypair**, not just its public key.
    ///
    /// It was the public key alone, and
    /// `the_destination_receives_the_amount_the_holder_confirmed` could
    /// therefore not decrypt what the destination was sent — the test asserted
    /// its own name rather than its claim (`REVIEW-015b`). A regression that
    /// encrypted the destination's amount under the wrong key, or to a
    /// different value, would have passed.
    pub destination: ElGamalKeypair,
    pub issuer: ElGamalKeypair,
    /// The auditor key, present in [`fixture_with_auditor`] only.
    pub auditor: Option<ElGamalKeypair>,
}

/// A signer holding throwaway keys, with a fresh randomness ledger.
pub fn fixture() -> Fixture {
    fixture_with(BALANCE, SEARCH_TO)
}

pub fn fixture_with(balance: u64, search_to: u64) -> Fixture {
    build_fixture(balance, search_to, false, false)
}

/// An issuance carrying an `AuditorEncryptionKey` — a **four-participant**
/// Send.
///
/// This shape had no test, and the auditor's ciphertext was being generated for
/// the proof and then dropped before serialisation. Both `REVIEW-015` legs
/// found it independently, which is the strongest signal in that round.
pub fn fixture_with_auditor() -> Fixture {
    build_fixture(BALANCE, SEARCH_TO, true, false)
}

/// A holder whose `HolderEncryptionKey` is **already on the ledger**.
///
/// XLS-0096 §7.2 forbids re-registering it, so a Convert for this holder must
/// omit both the key and the `ZKProof`.
pub fn fixture_registered() -> Fixture {
    build_fixture(BALANCE, SEARCH_TO, false, true)
}

fn build_fixture(balance: u64, search_to: u64, with_auditor: bool, registered: bool) -> Fixture {
    let dir = scratch("session");
    let holder_eg = ElGamalKeypair::generate().unwrap();
    let dest_eg = ElGamalKeypair::generate().unwrap();
    let issuer_eg = ElGamalKeypair::generate().unwrap();
    let auditor_eg = if with_auditor { Some(ElGamalKeypair::generate().unwrap()) } else { None };

    // The on-ledger balance ciphertext. Any scalar produced it; ours is not the
    // one that did, on a real ledger.
    let bal_r = reduce_wide(&[0x5Cu8; 64]).unwrap();
    let balance_ciphertext = prover::encrypt(balance, holder_eg.public(), &bal_r).unwrap();

    let profile = serde_json::json!({
        "account_seed": TEST_SEED,
        "elgamal_sk": prover::hex(holder_eg.secret()),
        "elgamal_pk": prover::hex(holder_eg.public()),
        "issuance_id": ISSUANCE,
        "fee_drops": 5000,
        "network_id": 2,
        "amount_search_to": search_to,
    });
    let holder = HolderProfile::from_json(&profile.to_string()).expect("profile");

    let key = LocalKey::from_bytes([0x9Au8; 32]);
    let store = Store::create(&dir.join("randomness"), key).expect("store");

    // Everything the profile used to declare, now on a ledger the signer reads.
    let mut mptokens = HashMap::new();
    mptokens.insert(
        TEST_ADDRESS.to_string(),
        FakeMpToken {
            holder_key: registered.then(|| prover::hex(holder_eg.public())),
            spending: Some(prover::hex(&balance_ciphertext)),
            version: 3,
        },
    );
    mptokens.insert(
        DEST_ADDRESS.to_string(),
        FakeMpToken {
            holder_key: Some(prover::hex(dest_eg.public())),
            spending: None,
            version: 0,
        },
    );
    let ledger: Ledger = Arc::new(Mutex::new(FakeLedger {
        network_id: 2,
        ledger_index: 4_600_000,
        age: 2,
        server_state: "full".into(),
        sequence: 41,
        disable_master: false,
        regular_key: None,
        signer_lists: 0,
        confidential_outstanding: balance,
        issuer_key: Some(prover::hex(issuer_eg.public())),
        auditor_key: auditor_eg.as_ref().map(|k| prover::hex(k.public())),
        mptokens,
        offline: false,
        reads: 0,
        answer_from: None,
        signer_lists_at_top_level: false,
        omit_signer_lists: false,
        mptoken_says_account: None,
        mptoken_says_type: None,
        mptoken_says_issuance: None,
        calls: Vec::new(),
    }));

    Fixture {
        session: Session::new(
            holder,
            LedgerReader::new(Box::new(FakeSource(ledger.clone()))),
            store,
        ),
        dir,
        ledger,
        destination: dest_eg,
        issuer: issuer_eg,
        auditor: auditor_eg,
    }
}

pub fn pair(session: &mut Session, ops: &[&str]) -> String {
    let req = serde_json::json!({ "type": "pair", "operations": ops, "ttl_secs": 300u64 });
    let mut c = Recorder::approving();
    let resp = session.handle(req.to_string().as_bytes(), CONN, &mut c);
    let v = serde_json::to_value(&resp).unwrap();
    assert_eq!(v["status"], "paired", "pairing failed: {v}");
    v["grant"].as_str().unwrap().to_string()
}

/// Drive one `prepare` and return the response as JSON.
pub fn prepare(
    session: &mut Session,
    grant: &str,
    op: &str,
    dest: Option<&str>,
    amount: &str,
    c: &mut Recorder,
) -> serde_json::Value {
    let mut req = serde_json::json!({
        "type": "prepare", "grant": grant, "operation": op,
        "issuance_id": ISSUANCE, "amount": amount
    });
    if let Some(d) = dest {
        req.as_object_mut().unwrap().insert("destination".into(), serde_json::json!(d));
    }
    serde_json::to_value(session.handle(req.to_string().as_bytes(), CONN, c)).unwrap()
}

/// Everything the store needs to be asked about directly.
pub fn store_of(f: &Fixture) -> PathBuf {
    f.dir.join("randomness")
}

pub fn ledger_len(dir: &std::path::Path) -> usize {
    Store::open(dir, LocalKey::from_bytes([0x9Au8; 32])).expect("reopen").len()
}

pub fn getrandom_is_available() -> bool {
    let mut b = [0u8; 8];
    store::getrandom(&mut b).is_ok()
}
