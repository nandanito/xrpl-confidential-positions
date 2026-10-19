//! `store-check` — does the randomness ledger hold the identifiers for the
//! `C₁` values a transaction actually published?
//!
//! `r_entry` commits to `compressed(r·G)`, and `C₁ = r·G` is **on the wire**.
//! So anyone holding `k_local` — the holder, or an auditor the holder chose to
//! hand it to — can take transactions off the public ledger and confirm that
//! the randomness they published is the randomness this signer recorded.
//!
//! That closes a loop the in-process tests cannot: `tests/signing_path.rs`
//! checks it against a blob the test itself produced, and this checks it
//! against whatever the ledger says.
//!
//! ```text
//! store-check <store-dir> <C1-hex> [<C1-hex> ...]
//! ```
//!
//! ⚠ **What a PASS means and does not mean.** It means each `C₁` given has a
//! matching, committed identifier. It says nothing about transactions not
//! given to it, and it is not a confidentiality claim — `observer-harness.ts`
//! is what shows what an observer sees, and `CLAIMS.md` P-4, P-9 and P-11
//! bound what any of this establishes.

use wconf_signer::store::{self, LocalKey, Status, Store};
use wconf_signer::xrpl;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.len() < 2 {
        eprintln!("usage: store-check <store-dir> <C1-hex> [<C1-hex> ...]");
        std::process::exit(2);
    }
    let dir = std::path::PathBuf::from(&args[0]);

    let key_bytes = match std::fs::read(dir.join("k_local.bin")) {
        Ok(b) if b.len() == 32 => b,
        Ok(b) => {
            eprintln!("k_local.bin is {} bytes, expected 32", b.len());
            std::process::exit(2);
        }
        Err(e) => {
            eprintln!("cannot read {}/k_local.bin: {e}", dir.display());
            std::process::exit(2);
        }
    };
    let key = LocalKey::from_bytes(key_bytes.try_into().unwrap());

    // Opening verifies the whole chain, the header MAC and the audit log. A
    // truncated, rolled-back or altered store fails here rather than answering.
    let s: Store = match Store::open(&dir, key.clone()) {
        Ok(s) => s,
        Err(fault) => {
            eprintln!("the randomness ledger does not verify: {fault:?}");
            eprintln!("no answer about any C1 is meaningful against a store in this state.");
            std::process::exit(1);
        }
    };
    println!(
        "ledger verified: generation {}, {} records",
        s.generation_id(),
        s.len()
    );

    let mut bad = 0;
    for hexstr in &args[1..] {
        let bytes = match xrpl::unhex(hexstr) {
            Ok(b) if b.len() == 33 => b,
            _ => {
                println!("  {hexstr}  MALFORMED — a C1 is 33 bytes of hex");
                bad += 1;
                continue;
            }
        };
        let mut c1 = [0u8; 33];
        c1.copy_from_slice(&bytes);
        let id = store::r_entry_from_c1(&key, &c1);
        match s.status_of(&id) {
            Some(Status::Committed) => println!("  {}…  RECORDED, committed", &hexstr[..16]),
            Some(Status::Pending) => {
                println!("  {}…  RECORDED but still pending — an attempt that never finished", &hexstr[..16]);
                bad += 1;
            }
            None => {
                println!("  {}…  *** NOT IN THE LEDGER ***", &hexstr[..16]);
                bad += 1;
            }
        }
    }

    if bad == 0 {
        println!("\nPASS: every C1 given was published by randomness this ledger recorded.");
    } else {
        println!("\nFAIL: {bad} of {} did not check out.", args.len() - 1);
    }
    std::process::exit(if bad == 0 { 0 } else { 1 });
}
