//! The confirmation the holder actually sees.
//!
//! `ARCHITECTURE-2026-08-18.md` §3 item 1: *"Confirm every transaction in the
//! signer's own UI, rendering what the signer is about to sign — destination,
//! issuance, amount — parsed from the transaction it built, **never** echoing
//! what the client claimed to ask for."*
//!
//! [`render`] takes `&ParsedTransaction` and nothing else. `Intent` is not
//! imported into this module, so a client string cannot reach the holder's
//! screen without someone first widening a function signature.

use crate::txn::{AmountView, ParsedTransaction, TxType};
use std::io::{BufRead, Write};

/// Where a confirmation is asked and answered.
///
/// A trait so tests can drive it, **not** so it can be delegated over IPC.
/// `REVIEW-013c` §3a B-III: a reset — and by the same argument a confirmation —
/// that can be acknowledged over the socket lets a hostile local process
/// approve its own request. The only implementation wired into the daemon is
/// [`TerminalConfirmer`], which reads the signer process's own stdin.
pub trait Confirmer {
    fn confirm(&mut self, rendered: &str) -> bool;
}

pub fn render(tx: &ParsedTransaction) -> String {
    let mut s = String::new();
    s.push_str("\n");
    s.push_str("  ┌────────────────────────────────────────────────────────────┐\n");
    s.push_str("  │  W-CONF SIGNER — CONFIRM                                   │\n");
    s.push_str("  │  Devnet only. This is a research artifact, not a wallet.   │\n");
    s.push_str("  └────────────────────────────────────────────────────────────┘\n");
    s.push_str("\n");
    s.push_str("  Everything below was parsed back out of the transaction this\n");
    s.push_str("  signer built. None of it came from the application.\n");
    s.push_str("\n");
    s.push_str(&format!("    operation    {}\n", tx.tx_type.as_str()));
    s.push_str(&format!("    from         {}\n", tx.account));
    match &tx.destination {
        Some(d) => s.push_str(&format!("    to           {}\n", d)),
        None => s.push_str("    to           — (no counterparty; this moves your own balance)\n"),
    }
    s.push_str(&format!("    issuance     {}\n", tx.issuance_id));
    s.push_str(&format!("    amount       {}\n", amount_line(&tx.amount)));
    s.push_str(&format!("    fee          {} drops\n", tx.fee_drops));
    s.push_str(&format!("    sequence     {}\n", tx.sequence));
    s.push_str(&format!("    expires      ledger {}\n", tx.last_ledger_sequence));
    s.push_str(&format!("    network      {}\n", network_line(&tx.network_id)));
    s.push_str(&format!("    proof        {} bytes\n", tx.proof_len));
    if tx.has_auditor {
        s.push_str("    auditor      PRESENT — a third party can decrypt this amount too\n");
    }
    // ⚠ The most irreversible thing this screen can be asked to approve.
    if let Some(k) = &tx.registers_encryption_key {
        s.push_str(&format!("    REGISTERS    {}\n", crate::prover::hex(k)));
        s.push_str("                 ⚠ THIS TRANSACTION REGISTERS YOUR ENCRYPTION KEY.\n");
        s.push_str("                   It can never be changed or rotated — a second attempt\n");
        s.push_str("                   is refused with tecDUPLICATE. Every confidential amount\n");
        s.push_str("                   this account ever holds is encrypted to it, and if the\n");
        s.push_str("                   matching secret is ever unreachable, so is every one of\n");
        s.push_str("                   those amounts. There is no second chance.\n");
    }
    s.push_str("\n");
    s.push_str(&format!("  {}\n", disclosure(tx.tx_type)));
    s.push_str("\n");
    s
}

/// How the amount is described, and where it came from.
///
/// A `ConfidentialMPTSend` carries **no plaintext amount** — that is the
/// scheme. So the number here is decrypted out of the transaction's own
/// ciphertext with the holder's key, and the line says so. Echoing the
/// client's integer instead is exactly the defect REVIEW-003b found, and it
/// would be invisible: the number would look right.
///
/// [`AmountView::NotRecovered`] renders as a refusal to guess. A confirmation
/// that showed an amount it could not read would be worse than one that shows
/// none.
fn amount_line(a: &AmountView) -> String {
    match a {
        AmountView::Decrypted(v) => {
            format!("{v}  (decrypted from this transaction's own ciphertext)")
        }
        AmountView::Public(v) => format!("{v}  (PUBLIC — in the clear on the wire)"),
        AmountView::NotRecovered { searched_to } => format!(
            "*** COULD NOT BE READ *** — no value in 0..={searched_to} decrypts this \n\
             \x20                transaction's ciphertext. DO NOT CONFIRM unless you \n\
             \x20                know why."
        ),
        AmountView::Unrecovered => {
            "*** NOT RECOVERED *** — nothing decrypted this. DO NOT CONFIRM.".to_string()
        }
    }
}

/// The network, or an honest statement that it is not in the transaction.
///
/// Networks at or below ID 1024 must omit `NetworkID` — Devnet rejects a
/// transaction that carries it. So on Devnet there is no network field to
/// render, and printing the signer's own configured network here would be
/// printing something that did not come out of these bytes. That is the exact
/// habit architecture §6 step 1 exists to prevent, and it does not get an
/// exception for a field that seems harmless.
fn network_line(n: &Option<u32>) -> String {
    match n {
        Some(v) => format!("{v}  (in the transaction)"),
        None => "not in this transaction — networks at or below 1024, Devnet included, \n\
                 \x20                must omit NetworkID"
            .to_string(),
    }
}

/// What each operation discloses publicly.
///
/// `CLAIMS.md` P-4 and P-11: this system hides amounts, and hides neither
/// identities nor timing. A confirmation that says only "confidential" invites
/// the holder to believe the opposite of what is true. E-63 is why the Convert
/// line names the blinding factor specifically — `r` is published on-chain in
/// `BlindingFactor` for Convert and ConvertBack.
fn disclosure(t: TxType) -> &'static str {
    match t {
        TxType::Convert => {
            // ⚠ **"this amount" is not decoration and it was MISSING until
            // 2026-08-25.** `MPTAmount` is a plaintext field on a Convert
            // (XLS-0096 §7.2) and is the single most consequential thing the
            // transaction publishes — yet this line listed the *blinding
            // factor* as public and not the amount. `CLAIMS.md` **E-136**, and
            // it is **F-24's shape one layer down**: F-24 was the same omission
            // in the facility walkthrough, about ConvertBack. The tell was the
            // asymmetry — ConvertBack's line below names its amount and this
            // one did not, while both types publish one.
            "PUBLIC: that you converted, when, for which issuance — and this \
             amount, which is in the clear on the wire forever, along with the \
             blinding factor. HIDDEN: the resulting balance."
        }
        TxType::Send => {
            "PUBLIC: that you sent, to whom, when, and for which issuance. \
             HIDDEN: the amount. The issuer can decrypt it regardless."
        }
        TxType::ConvertBack => {
            "PUBLIC: that you converted back, when, for which issuance — and this \
             amount, which becomes a public balance. HIDDEN: whatever confidential \
             balance remains after it. The issuer can decrypt that regardless."
        }
    }
}

pub struct TerminalConfirmer;

impl Confirmer for TerminalConfirmer {
    fn confirm(&mut self, rendered: &str) -> bool {
        let mut out = std::io::stdout();
        let _ = out.write_all(rendered.as_bytes());
        let _ = out.write_all(
            format!(
                "  Type CONFIRM within {}s to sign, anything else to refuse: ",
                crate::store::CONFIRMATION_TIMEOUT_SECS
            )
            .as_bytes(),
        );
        let _ = out.flush();

        // **A8(a): the confirmation must not outlive the reservation's lease**,
        // or a startup sweep promotes a live reservation and the signing path
        // reads its own reservation as a collision. The read happens on a
        // worker so the timeout is real rather than advisory.
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let mut line = String::new();
            let ok = std::io::stdin().lock().read_line(&mut line).is_ok();
            let _ = tx.send(if ok { line } else { String::new() });
        });

        match rx.recv_timeout(std::time::Duration::from_secs(
            crate::store::CONFIRMATION_TIMEOUT_SECS,
        )) {
            // A typed word, not a keypress. `REVIEW-013c` §3a B-III: a bare
            // OK/Cancel is what alert fatigue eats.
            Ok(line) => line.trim() == "CONFIRM",
            Err(_) => {
                let _ = out.write_all(b"\n  timed out; refused.\n");
                let _ = out.flush();
                false
            }
        }
    }
}

// ---------------------------------------------------------------------------
// A6 — acknowledging a randomness-store fault
// ---------------------------------------------------------------------------

/// Proof that a human acknowledged a store fault **in the signer's own window**.
///
/// `REVIEW-013c` §3a B-III: if a reset can be acknowledged over IPC, a hostile
/// local process corrupts the store and then acknowledges its own reset. So the
/// only constructor is [`acknowledge_store_fault`], which reads this process's
/// own stdin. There is no `From<Request>`, no deserialisation, and no public
/// field — a request cannot produce one, whatever it contains.
pub struct HumanAcknowledgement {
    transcript: String,
}

impl HumanAcknowledgement {
    pub fn transcript(&self) -> &str {
        &self.transcript
    }
}

/// Ask the holder to acknowledge a store fault, in this process's own window.
///
/// A6 item 2 requires the prompt to state what was detected, what is lost, and
/// what the concrete consequence is — not a generic "continue?". A6 item 3
/// requires a **typed** confirmation rather than a click, because induced
/// corruption plus a click is alert fatigue.
pub fn acknowledge_store_fault(
    account: &str,
    detected: &str,
    last_verified: Option<(u32, u64)>,
) -> Option<HumanAcknowledgement> {
    let phrase = format!("{account} RESET RANDOMNESS LEDGER");
    let mut out = std::io::stdout();
    let mut msg = String::new();
    msg.push_str("\n");
    msg.push_str("  ┌────────────────────────────────────────────────────────────┐\n");
    msg.push_str("  │  RANDOMNESS LEDGER FAULT — the signer will not sign        │\n");
    msg.push_str("  └────────────────────────────────────────────────────────────┘\n\n");
    msg.push_str(&format!("    detected     {detected}\n"));
    match last_verified {
        Some((gen, seq)) => {
            msg.push_str(&format!("    last good    generation {gen}, sequence {seq}\n"))
        }
        None => msg.push_str("    last good    nothing verifiable — no trustworthy header\n"),
    }
    msg.push_str("\n");
    msg.push_str("  What this means, stated plainly:\n\n");
    msg.push_str("    - Duplicate detection across the gap is GONE. The signer cannot\n");
    msg.push_str("      tell whether a randomness value used before the fault is being\n");
    msg.push_str("      used again.\n");
    msg.push_str("    - If an encryption randomness value does repeat, a passive\n");
    msg.push_str("      observer holding NO keys can recover the difference between two\n");
    msg.push_str("      confidential amounts. This has been executed; it is not theory.\n");
    msg.push_str("    - Fresh entropy per attempt still applies and is the primary\n");
    msg.push_str("      defence. This ledger is the check on it.\n");
    msg.push_str("    - A record of this gap is written to a separate audit log so a\n");
    msg.push_str("      later review knows the window exists.\n\n");
    msg.push_str(&format!("  To start a fresh ledger, type exactly:\n\n    {phrase}\n\n  > "));
    let _ = out.write_all(msg.as_bytes());
    let _ = out.flush();

    let mut line = String::new();
    if std::io::stdin().lock().read_line(&mut line).is_err() {
        return None;
    }
    if line.trim() != phrase {
        return None;
    }
    Some(HumanAcknowledgement { transcript: phrase })
}

/// **For tests only**, and gated behind the `test-support` feature so a
/// release build can drop it entirely (`make signer-release`).
///
/// It is not reachable from a request path even when compiled in: nothing in
/// [`crate::protocol`] deserialises into it and [`crate::session`] never calls
/// it. A6 item 1 is about where an acknowledgement can *come from*, and a
/// request cannot produce one.
#[doc(hidden)]
#[cfg(feature = "test-support")]
pub fn acknowledgement_for_test(transcript: &str) -> HumanAcknowledgement {
    HumanAcknowledgement { transcript: transcript.to_string() }
}
