//! `onboard` — architecture §6 step 6's onboarding flow, in its own window.
//!
//! ```
//! cargo run --bin onboard -- <account> <MPTokenIssuanceID> [endpoint]
//! ```
//!
//! It **reads the ledger first**, because issue #11's whole point is that
//! onboarding branches on ledger state: `lsfDisableMaster`, a regular key and a
//! signer list each mean the master seed is not this account's spending
//! authority, and for those holders the keygen ruling's argument for deriving
//! from it does not hold.
//!
//! # ⚠ What it takes and what it refuses to take
//!
//! **No secret on argv.** The family seed is read from this process's own
//! stdin, with terminal echo off where the OS provides it — ruling §5 item 3:
//! *"Seed entry happens only in the signer's own local UI, never through the
//! browser client and never over IPC."* There is no socket here at all.
//!
//! # ⚠ What it does not do
//!
//! It does not submit, and it does not write a file. Registration is a
//! `ConfidentialMPTConvert` built by the daemon and submitted by whoever
//! receives the blob. The profile lines it prints are for a human to place,
//! because writing a plaintext secret to disk is something the ruling's §4
//! forbids for anything real and a tool that did it silently would be the worst
//! of both.

use std::time::Duration;
use wconf_signer::ledger::{JsonRpcSource, LedgerReader, DEFAULT_ENDPOINT};
use wconf_signer::onboarding::{self, Assessment, Outcome, TerminalIo};
use wconf_signer::xrpl;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.len() < 2 || args.iter().any(|a| a == "-h" || a == "--help") {
        eprintln!(
            "usage: onboard <account> <MPTokenIssuanceID (48 hex)> [endpoint]\n\
             \n\
             Chooses an ElGamal key source for one account, after reading what the\n\
             ledger says about it. Devnet only. Never mainnet, at any phase.\n\
             \n\
             ⚠ Takes NO secret on argv. A family seed, if one is needed, is typed into\n\
             \x20 this process's own terminal."
        );
        std::process::exit(2);
    }

    // ⚠ Not a courtesy. A seed pasted into a shell lands in that shell's
    // history file, and the derivation makes it a permanent decryption
    // credential.
    if args.iter().any(|a| onboarding::looks_like_a_family_seed(a)) {
        eprintln!(
            "⛔ One of these arguments looks like a family seed.\n\n   \
             This tool NEVER takes a seed on the command line: argv is visible to every\n   \
             process on this machine and lands in your shell's history file. Under the\n   \
             ruled derivation that seed is a permanent decryption credential for every\n   \
             confidential amount this account will ever hold.\n\n   \
             Pass the ACCOUNT ADDRESS. The seed is typed in when it is asked for."
        );
        std::process::exit(2);
    }

    let account = &args[0];
    let issuance: [u8; 24] = match xrpl::unhex(&args[1]).ok().and_then(|b| b.try_into().ok()) {
        Some(v) => v,
        None => {
            eprintln!("the MPTokenIssuanceID must be 48 hex characters (24 bytes)");
            std::process::exit(2);
        }
    };
    let account_id = match xrpl::decode_address(account) {
        Ok(a) => a,
        Err(e) => {
            eprintln!("`{account}` is not an XRPL address: {e}");
            std::process::exit(2);
        }
    };
    let endpoint = args.get(2).map(String::as_str).unwrap_or(DEFAULT_ENDPOINT);

    let source = match JsonRpcSource::new(endpoint, Duration::from_secs(20)) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{e}");
            std::process::exit(1);
        }
    };
    let loopback = {
        use wconf_signer::ledger::LedgerSource;
        source.is_loopback()
    };
    let mut reader = LedgerReader::new(Box::new(source));
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let snap = match reader.read(account, &issuance, now) {
        Ok(s) => s,
        Err(e) => {
            eprintln!(
                "the ledger could not be read, and this tool will not guess what it says: {e}"
            );
            std::process::exit(1);
        }
    };

    // `CLAIMS.md` B-15, ruled 2026-08-20: one remote endpoint is a **named risk
    // acceptance**, and printing the disclosure is a condition of the ruling.
    // It applies here for the same reason it applies to the daemon: what the
    // node says about `lsfDisableMaster`, a regular key and a signer list is
    // what this whole flow branches on.
    eprintln!("  read at ledger {} ({})", snap.ledger_index, snap.ledger_hash);
    if loopback {
        eprintln!("  ✓ the ledger source is loopback — your own node");
    } else {
        for line in wconf_signer::ledger::REMOTE_SOURCE_DISCLOSURE.lines() {
            eprintln!("  {line}");
        }
        eprintln!(
            "  ⚠ AND IT MATTERS PARTICULARLY HERE: whether this account's master key has\n    \
             been retired is read from that node, and it is what the recommendation\n    \
             below is based on."
        );
    }

    let assessment = Assessment::of(&snap.security, &snap.mptoken);
    let mut io = TerminalIo;
    match onboarding::run(&mut io, account, &account_id, &assessment) {
        Outcome::Chosen { source, .. } => {
            eprintln!("\n  key source chosen: {}", source.as_str());
            eprintln!("  Nothing has been registered. That happens on the first Convert.");
        }
        Outcome::Recovered { .. } => std::process::exit(0),
        Outcome::RecoveryMismatch { .. } => std::process::exit(1),
        Outcome::Declined(why) => {
            eprintln!("\n  declined: {why}");
            std::process::exit(1);
        }
        Outcome::Refused(why) => {
            eprintln!("\n  refused: {why}");
            std::process::exit(1);
        }
    }
}
