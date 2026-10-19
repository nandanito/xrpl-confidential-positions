//! `ledger-read` — print exactly what architecture §6 step 2 reads.
//!
//! ```
//! cargo run --bin ledger-read -- <account> <MPTokenIssuanceID> [endpoint]
//! ```
//!
//! The counterpart to `store-check`: that one checks the randomness ledger
//! against the public ledger, this one shows the public ledger the signer
//! builds against. It takes **no secret on argv** and therefore cannot decrypt
//! the balance — the ciphertext is printed, the amount is not, which is what a
//! full-ledger observer sees anyway.
//!
//! ⚠ **This is a read of amounts-hidden state, not a confidentiality claim.**
//! `CLAIMS.md` P-4, P-9, P-11: identities, counterparties, timing and frequency
//! are public, and the issuer can decrypt every balance.

use std::time::Duration;
use wconf_signer::ledger::{JsonRpcSource, LedgerReader, DEFAULT_ENDPOINT};
use wconf_signer::xrpl;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.len() < 2 {
        eprintln!(
            "usage: ledger-read <account> <MPTokenIssuanceID (48 hex)> [endpoint]\n\
             \n\
             Prints the snapshot the signer would build against. Devnet only."
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
    let endpoint = args.get(2).map(String::as_str).unwrap_or(DEFAULT_ENDPOINT);

    let source = match JsonRpcSource::new(endpoint, Duration::from_secs(20)) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{e}");
            std::process::exit(1);
        }
    };
    let mut reader = LedgerReader::new(Box::new(source));
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let snap = match reader.read(account, &issuance, now) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{e}");
            std::process::exit(1);
        }
    };

    println!("endpoint   {endpoint}");
    println!("network    Devnet ({})", snap.network_id);
    println!("ledger     {}  {}", snap.ledger_index, snap.ledger_hash);
    println!();
    println!("account    {}", snap.account);
    println!("  Sequence                   {}", snap.sequence);
    println!("  lsfDisableMaster           {}", snap.security.disable_master);
    println!(
        "  RegularKey                 {}",
        snap.security.regular_key.as_deref().unwrap_or("(none)")
    );
    println!("  signer lists               {}", snap.security.signer_lists);
    if snap.security.master_seed_is_not_spending_authority() {
        println!();
        println!(
            "  ⚠ {} — the master seed is NOT this account's spending authority.",
            snap.security.conditions().join(", ")
        );
        println!(
            "    Deriving an ElGamal key from it makes a credential the holder was told\n\
             \x20   they could retire into a permanent decryption key. Keygen ruling\n\
             \x20   condition 2; architecture §6 step 6; issue #11."
        );
    }
    println!();
    println!("MPToken    {}", xrpl::hex(&issuance));
    if !snap.mptoken.exists {
        println!("  (this account holds no MPToken for that issuance)");
    } else {
        println!(
            "  HolderEncryptionKey        {}",
            snap.mptoken
                .holder_encryption_key
                .map(|k| xrpl::hex(&k))
                .unwrap_or_else(|| "(not registered)".into())
        );
        println!("  ConfidentialBalanceVersion {}", snap.mptoken.balance_version);
        println!(
            "  ConfidentialBalanceSpending {}",
            snap.mptoken
                .balance_ciphertext
                .map(|c| xrpl::hex(&c))
                .unwrap_or_else(|| "(absent)".into())
        );
    }
    println!();
    println!("issuance");
    println!(
        "  IssuerEncryptionKey        {}",
        xrpl::hex(&snap.issuance.issuer_encryption_key)
    );
    println!(
        "  AuditorEncryptionKey       {}",
        snap.issuance
            .auditor_encryption_key
            .map(|k| xrpl::hex(&k))
            .unwrap_or_else(|| "(none)".into())
    );
    println!();
    println!("LastLedgerSequence a transaction would carry: {}", snap.last_ledger_sequence());
    println!();
    println!(
        "⚠ Amounts are hidden here; identities, counterparties, timing and frequency are\n\
         \x20 not, and the issuer holds a key that decrypts every balance. CLAIMS.md P-4,\n\
         \x20 P-9, P-11."
    );
}
