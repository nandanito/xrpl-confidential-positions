//! W-CONF signer daemon. **Devnet only. Never mainnet, at any phase.**

use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::time::Duration;
use wconf_signer::confirm::{self, TerminalConfirmer};
use wconf_signer::holder::HolderProfile;
use wconf_signer::onboarding::{self, KeySource};
use wconf_signer::ipc;
use wconf_signer::ledger::{JsonRpcSource, LedgerReader};
use wconf_signer::session::{Balance, Session};
use wconf_signer::store::{self, LocalKey, Store, StoreFault};

fn main() -> std::io::Result<()> {
    let socket = std::env::var_os("WCONF_SIGNER_SOCKET")
        .map(PathBuf::from)
        .unwrap_or_else(ipc::default_socket_path);

    // The holder profile: **secrets and policy only.** ~~and the ledger state
    // the signer was last told about~~ — architecture §6 step 2 is built as of
    // 2026-08-19, and every ledger value that used to live in this file is now
    // read from a node. The file is still read from disk rather than accepted
    // over the socket, so a client cannot choose it.
    let profile_path = match std::env::var_os("WCONF_SIGNER_PROFILE") {
        Some(p) => PathBuf::from(p),
        None => {
            eprintln!(
                "WCONF_SIGNER_PROFILE is not set.\n\n\
                 The signer needs a holder profile: an XRPL family seed (or the literal\n\
                 \"prompt\"), an `elgamal_key_source`, which issuance it is for, and where to\n\
                 read the ledger. `cargo run --bin onboard` produces the key-source lines.\n\
                 See tools/spike-step6-2026-08-20/README.md.\n\n\
                 It will not invent one, and it does not accept one over the socket."
            );
            std::process::exit(2);
        }
    };
    // ⚠ `load_with`, not `load`. A profile whose `account_seed` is the literal
    // `"prompt"` asks for the seed **in this window**, which is the only
    // arrangement in this project where no secret is on disk at all: with the
    // derived key source there is nothing else to store. Ruling §5 item 3 and
    // §4. The closure reads this process's own stdin and nothing else can
    // supply it — there is no socket open yet.
    let holder = match HolderProfile::load_with(&profile_path, prompt_for_seed) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("[signer] {e}");
            std::process::exit(2);
        }
    };

    // The randomness ledger. A fault here stops signing until a human
    // acknowledges it in THIS window — amendment A6.
    let dir = std::env::var_os("WCONF_SIGNER_STORE")
        .map(PathBuf::from)
        .unwrap_or_else(|| socket.parent().unwrap_or(&socket).join("randomness"));
    let store = match open_or_acknowledge(&dir, &holder.address()) {
        Some(s) => s,
        None => {
            eprintln!("[signer] the randomness ledger was not made usable. Refusing to run.");
            std::process::exit(2);
        }
    };

    // Architecture §6 step 2. `WCONF_LEDGER_ENDPOINT` overrides the profile's
    // own — a convenience for pointing a signer at a local node, and no more
    // of a hole than the profile path already is: anything that can set this
    // process's environment already has code execution as this user, which the
    // issue #1 ruling puts in scope and the confirmation, not the transport, is
    // the boundary against.
    let endpoint = std::env::var("WCONF_LEDGER_ENDPOINT")
        .unwrap_or_else(|_| holder.ledger_endpoint.clone());
    let source = match JsonRpcSource::new(&endpoint, Duration::from_secs(20)) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[signer] {e}");
            std::process::exit(2);
        }
    };

    let mut listener = ipc::Listener::bind(&socket)?;
    let issuance_hex = wconf_signer::prover::hex(&holder.issuance_id);
    let address = holder.address();
    let search_to = holder.amount_search_to;
    let network_id = holder.network_id;
    let randomness = format!("generation {}, {} identifiers", store.generation_id(), store.len());
    let key_source = holder.key_source;
    let seed_was_prompted = holder.seed_was_prompted;
    let elgamal_pk = wconf_signer::prover::hex(holder.elgamal.public());
    let mut session = Session::new(holder, LedgerReader::new(Box::new(source)), store);

    eprintln!("W-CONF signer {}", env!("CARGO_PKG_VERSION"));
    eprintln!("  socket    {}", listener.path().display());
    eprintln!("  account   {address}");
    eprintln!("  issuance  {issuance_hex}");
    eprintln!("  endpoint  {endpoint}");
    eprintln!("  network   Devnet ({network_id}). Never mainnet, at any phase.");
    eprintln!("  randomness ledger  {randomness}");
    eprintln!("  ElGamal key source {}", key_source.as_str());
    eprintln!("  ElGamal pk         {elgamal_pk}");

    // **The first ledger read happens here**, so the banner reports state the
    // signer actually read rather than state it was handed. A failure is not
    // fatal — the endpoint may come back — but every `prepare` refuses with
    // `REFUSED_LEDGER_UNAVAILABLE` until one succeeds, because this signer
    // builds nothing against state it has not read.
    match session.refresh() {
        Ok(()) => {
            let view = session.view().expect("refresh sets the view");
            eprintln!(
                "  read at   ledger {} ({})",
                view.snapshot.ledger_index, view.snapshot.ledger_hash
            );
            eprintln!("  Sequence  {}", view.snapshot.sequence);
            eprintln!(
                "  balance   {}",
                match view.balance {
                    Balance::Known(b) => format!("{b}  (decrypted from ConfidentialBalanceSpending)"),
                    Balance::Absent => "no ConfidentialBalanceSpending — nothing converted yet".into(),
                    Balance::Unreadable =>
                        format!("*** COULD NOT BE READ *** within amount_search_to = {search_to}"),
                }
            );
            eprintln!(
                "  holder key {}",
                match view.snapshot.mptoken.holder_encryption_key {
                    Some(_) => "registered on the ledger",
                    None => "not registered — the next Convert will register it",
                }
            );

            // The one local anchor against a node that lies about the ledger.
            if session.own_key_matches_ledger() == Some(false) {
                eprintln!();
                eprintln!("  ⛔ THE LEDGER'S HolderEncryptionKey FOR THIS ACCOUNT IS NOT THIS");
                eprintln!("     SIGNER'S KEY. Either this profile is for a different holder, or");
                eprintln!("     the endpoint is not telling the truth. Nothing will be signed.");
            }

            // Issue #11 / keygen ruling condition 2.
            //
            // ⚠ ~~Groundwork for step 6 … nothing is derived from a seed
            // today.~~ **Both halves became false on 2026-08-20**, which is
            // this milestone. The warning is no longer about what a future
            // step will do; for a `derived-from-master-seed` profile it is
            // about what this process did at start.
            //
            // The text is in `onboarding`, as constants with an asserted
            // wording — these were inline here, where nothing checked them, and
            // `REVIEW-020` round two found a false sentence among them.
            if view.snapshot.security.master_seed_is_not_spending_authority() {
                eprintln!();
                eprintln!(
                    "  ⚠ {} on this account.",
                    view.snapshot.security.conditions().join(", ")
                );
                eprintln!("    The master seed is NOT this account's spending authority.");
                eprintln!();
                let block = match key_source {
                    KeySource::DerivedFromMasterSeed => onboarding::DERIVED_ON_RETIRED_MASTER,
                    KeySource::Standalone => onboarding::STANDALONE_ON_RETIRED_MASTER,
                };
                for line in block.lines() {
                    eprintln!("  {line}");
                }
            }
        }
        Err(e) => {
            eprintln!();
            eprintln!("  ⚠ THE LEDGER COULD NOT BE READ: {e}");
            eprintln!("    The daemon is running and will refuse every prepare with");
            eprintln!("    REFUSED_LEDGER_UNAVAILABLE until a read succeeds.");
        }
    }

    eprintln!();
    // ⚠ ~~"The ElGamal key came from the library's own generator, not from the
    // ruled derivation"~~ — **struck 2026-08-20**: it depends on the source,
    // and saying otherwise would be the tenth instance of this project's
    // recurring failure rather than a description of the binary.
    let banner: &[&str] = match (key_source, seed_was_prompted) {
        (KeySource::DerivedFromMasterSeed, false) => {
            &[onboarding::DERIVED_SOURCE_BANNER, onboarding::DERIVED_SEED_ON_DISK]
        }
        (KeySource::DerivedFromMasterSeed, true) => {
            &[onboarding::DERIVED_SOURCE_BANNER, onboarding::DERIVED_SEED_PROMPTED]
        }
        (KeySource::Standalone, _) => &[onboarding::STANDALONE_SOURCE_BANNER],
    };
    for block in banner {
        for line in block.lines() {
            eprintln!("  {line}");
        }
    }
    eprintln!("  Devnet throwaway accounts. Nothing here should ever hold value.");
    eprintln!();
    eprintln!("  ⚠ This signs; it does not submit. Whoever receives the blob submits it.");
    // `CLAIMS.md` B-15, ruled 2026-08-20: one endpoint is accepted as a named
    // risk acceptance, and saying so where the operator sees it is a condition
    // of the ruling rather than a courtesy.
    eprintln!();
    if session.ledger_is_loopback() {
        eprintln!("  ✓ The ledger source is loopback — your own node. B-15's trust");
        eprintln!("    assumption reduces to trusting your own machine.");
    } else {
        for line in wconf_signer::ledger::REMOTE_SOURCE_DISCLOSURE.lines() {
            eprintln!("  {line}");
        }
    }
    eprintln!();
    eprintln!("  Every transaction is confirmed HERE, in this window, from fields parsed");
    eprintln!("  out of the transaction this process built — with the amount DECRYPTED");
    eprintln!("  from that transaction's own ciphertext. What the application displays is");
    eprintln!("  not what you are approving.");
    eprintln!();

    let mut confirmer = TerminalConfirmer;

    loop {
        let (stream, conn, cred) = match listener.accept() {
            Ok(v) => v,
            Err(e) => {
                eprintln!("[signer] accept failed: {e}");
                continue;
            }
        };
        eprintln!("[signer] connection {} from uid {}", conn.0, cred.uid);

        let reader = BufReader::new(match stream.try_clone() {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[signer] could not clone stream: {e}");
                continue;
            }
        });
        let mut writer = stream;

        // One JSON object per line.
        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("[signer] read error on connection {}: {e}", conn.0);
                    break;
                }
            };
            if line.trim().is_empty() {
                continue;
            }
            let response = session.handle(line.as_bytes(), conn, &mut confirmer);
            let mut out = serde_json::to_vec(&response).unwrap_or_else(|_| {
                br#"{"status":"refused","code":"REFUSED_MALFORMED","detail":"could not encode response"}"#.to_vec()
            });
            out.push(b'\n');
            if writer.write_all(&out).is_err() {
                break;
            }
        }

        // Authority does not outlive the connection.
        session.grants.drop_connection(conn);
        eprintln!("[signer] connection {} closed; its grants are revoked", conn.0);
    }
}

/// Open the randomness ledger, or take amendment A6's path.
///
/// **A6:** every fault routes to an acknowledgement typed into *this* window,
/// which writes a gap record to a separate append-only audit log and starts a
/// new generation. Never a silent continue, never a permanent refusal, and
/// never something a request can trigger.
fn open_or_acknowledge(dir: &std::path::Path, account: &str) -> Option<Store> {
    let key_path = dir.join("k_local.bin");
    let key = if key_path.exists() {
        // ⚠ **Fail closed, loudly, and do NOT generate a replacement.** A new
        // `k_local` would compute different identifiers for the same scalars,
        // so every recorded identifier would silently stop matching and the
        // reuse check would be dead while appearing healthy. That is worse
        // than refusing to start. `REVIEW-015a` found this path exiting with a
        // generic message; it now says what happened and what it means.
        let b = match std::fs::read(&key_path) {
            Ok(b) if b.len() == 32 => b,
            Ok(b) => {
                eprintln!(
                    "[signer] {} is {} bytes, not 32. The randomness ledger's key is unusable.\n\
                     \x20         The signer will NOT generate a new one: a different key computes\n\
                     \x20         different identifiers, so every record already written would stop\n\
                     \x20         matching and the reuse check would be dead while looking healthy.\n\
                     \x20         Restore the file from backup, or move the whole directory aside\n\
                     \x20         and accept that duplicate detection across the gap is gone.",
                    key_path.display(),
                    b.len()
                );
                return None;
            }
            Err(e) => {
                eprintln!("[signer] cannot read {}: {e}", key_path.display());
                return None;
            }
        };
        LocalKey::from_bytes(b.try_into().expect("length checked above"))
    } else {
        // ⚠ Beside the signer's other key material, and therefore readable by
        // anything that can read `sk_A`. Keyed storage is an offline
        // file-copy and backup-hygiene defence and that is the whole claim
        // (`REVIEW-013c` §3a B-IV).
        let k = LocalKey::generate().ok()?;
        std::fs::create_dir_all(dir).ok()?;
        std::fs::write(&key_path, k_bytes(&k)).ok()?;
        k
    };

    match Store::open(dir, key.clone()) {
        Ok(mut s) => {
            // A2/A5/A8: promote anything stale, without touching a live lease.
            //
            // ⚠ **A failure here is a ledger fault, not a warning.** It was
            // `let _ = …`, which meant a store that could not be written kept
            // the daemon running with stale reservations still `pending`
            // (`REVIEW-015b`). If the ledger cannot be maintained, the reuse
            // check it exists to provide is not being provided.
            if let Err(e) = s.promote_expired_pending(store::LEDGER_LEASE_SECS, now()) {
                eprintln!(
                    "[signer] the randomness ledger opened but could not be maintained: {e}\n\
                     \x20         Expired reservations could not be promoted, so the ledger is\n\
                     \x20         not in a state this signer will sign against."
                );
                return None;
            }
            Some(s)
        }
        Err(StoreFault::Missing) => Store::create(dir, key).ok(),
        Err(fault) => {
            let ack = confirm::acknowledge_store_fault(account, &format!("{fault:?}"), None)?;
            Store::fresh_start(dir, key, &fault, &ack, now()).ok()
        }
    }
}

/// Read the family seed from **this process's own terminal**, for a profile
/// that declines to store one.
///
/// Ruling §5 item 3. Echo is suppressed where the OS provides it, and when
/// stdin is not a terminal the holder is told that it is not — a tool that
/// implied a protection it was not providing would be worse than one that
/// provides none.
/// ⚠ **`Zeroizing<String>` — `CLAIMS.md` B-23.** The return value is the
/// holder's master family seed as typed. It is handed straight to
/// `HolderProfile::load_with`, which moves it into its own wiping buffer; this
/// signature is what stops the intermediate from being a bare `String` that
/// nothing wipes.
fn prompt_for_seed() -> Option<zeroize::Zeroizing<String>> {
    use wconf_signer::onboarding::{OnboardingIo, TerminalIo};
    let mut io = TerminalIo;
    io.tell(
        "\n  This profile stores no seed. Enter the account's family seed; it is read by\n  \
         THIS process, from its own terminal — never over the socket, never from a\n  \
         client, never from argv.",
    );
    io.ask_secret("  family seed> ")
}

fn k_bytes(k: &LocalKey) -> Vec<u8> {
    // `LocalKey` deliberately exposes no accessor for its bytes; this is the
    // one place that needs to persist it, and it round-trips through the same
    // fixed-size representation `from_bytes` accepts.
    k.expose_for_persistence().to_vec()
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}
