//! Wire protocol between the thin client and the signer.
//!
//! Two rules from `ARCHITECTURE-2026-08-18.md` §3 are enforced here rather than
//! left to callers:
//!
//! * **§3.5 — never accept caller-supplied randomness.** Any request carrying a
//!   scalar, blinding factor, nonce or entropy field is refused by name, before
//!   the request is interpreted at all. A generic "unknown field" would be
//!   swallowed by a client as a validation error; this must be loud.
//! * **§3.2 — authority is scoped and short-lived.** Every operation names the
//!   grant it is exercised under. There is no ambient authority.
//!
//! Note what is *absent*: **no request accepts key material, a seed, a
//! passphrase or a signature.** That is not enforced by a check, it is enforced
//! by there being no such field in any type in this file.
//!
//! ⚠ ~~and no response returns any~~ — **that half became false on 2026-08-18**
//! and is corrected rather than deleted. [`Response::Signed`] returns a signed
//! transaction blob, and that blob contains a `TxnSignature`. It is a signature
//! **over public bytes, made to be broadcast**, and it is not key material —
//! but "no response returns a signature" is the kind of sentence that stays in
//! a file long after it stopped being true. What holds is the narrower and
//! still-useful claim: **no response carries a secret**, and
//! `tests/falsifier.rs::the_signed_blob_carries_no_secret` is what fails if it
//! does.

use serde::{Deserialize, Serialize};

/// Field names a signing path must never accept from a caller.
///
/// From REVIEW-010c §1 and the ruled `r`/`ρ` construction: `r` is published
/// on-chain in `BlindingFactor`, and a caller who chooses it can force the
/// reuse that E-63 executed — a passive observer recovering the difference
/// between two confidential amounts. The signer draws its own entropy or it
/// does not sign.
pub const FORBIDDEN_FIELDS: &[&str] = &[
    "r",
    "rho",
    "blinding_factor",
    "blindingfactor",
    "entropy",
    "entropy64",
    "nonce",
    "nonces",
    "k",
    "scalar",
    "randomness",
    "seed",
    "secret",
    "sk",
    "sk_a",
    "private_key",
    "privatekey",
    "passphrase",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Refusal {
    /// A forbidden field was present. Named, not generic.
    CallerSuppliedRandomness { field: String },
    /// Malformed request.
    Malformed { reason: String },
    /// No grant, expired grant, or grant that does not cover this operation.
    Unauthorized { reason: String },
    /// The human declined in the signer's own UI.
    DeclinedByHolder,
    // ~~`NotImplemented { what: String }`~~ — **removed 2026-08-24.**
    //
    // ⚠ **`ConfidentialMPTConvertBack` was its only producer, and building
    // ConvertBack made this code unreachable from every path in the crate.**
    // The README documents these codes as *"distinct by design"* so a client
    // *"can only decline to collapse errors it can tell apart"* — which is a
    // claim about refusals a client can actually receive. A code nothing
    // produces is not a distinction; it is a client carrying handling for an
    // answer that never arrives, and its `detail()` still said *"not
    // implemented in the skeleton"* when there has been no skeleton since step
    // 3 (`CLAIMS.md` E-130).
    //
    // An operation this signer does not build is refused by `TxType::parse`
    // as an **unknown operation**, which is `REFUSED_MALFORMED`. If a future
    // milestone needs to distinguish *"a real XLS-0096 transaction we have not
    // built"* from *"a word we do not recognise"*, that is a new variant with
    // a producer, not this one revived.
    /// The randomness ledger already holds this identifier. **A8(b): loud and
    /// distinguishable**, because this is the E-63 condition.
    RandomnessReuse { which: String },
    /// The OS CSPRNG failed, or the derivation produced a zero scalar.
    ///
    /// **REVIEW-010c §2c: this refuses to sign. It does not degrade.** For `r`
    /// and `ρ` entropy *is* the source rather than a hedge over a secret-derived
    /// core, and `r` is published on chain in `BlindingFactor`, so synthesising
    /// it from a long-lived key is forbidden. That is the opposite of the
    /// sigma-nonce rule and both are correct — architecture §4 has all three
    /// side by side.
    EntropyUnavailable { detail: String },
    /// The randomness ledger is missing, corrupt, truncated or rolled back.
    /// **The signer refuses until a human acknowledges it in the signer's own
    /// window** — it must not be retried by a client.
    RandomnessLedgerFault { detail: String },
    /// The XRPL ledger could not be read, for a reason that may pass.
    ///
    /// Architecture §6 step 2: the signer builds nothing against state it did
    /// not read. **Distinct from `REFUSED_RANDOMNESS_LEDGER_FAULT`** — the
    /// randomness ledger is a local append-only file and a fault there needs a
    /// human; this one is a network condition and is retryable.
    LedgerUnavailable { detail: String },
    /// The endpoint is not one this signer will build against, and retrying
    /// changes nothing.
    ///
    /// ⚠ **Split out after `REVIEW-016`.** Wrong network, a plaintext
    /// non-loopback endpoint and a malformed answer were all reported as
    /// `REFUSED_LEDGER_UNAVAILABLE`, whose text says *"Retryable"* — so a
    /// client was told to retry a misconfiguration that will never resolve.
    /// That is the same failure `REVIEW-013c` §3a B-VII found, one level down:
    /// a loud refusal rendered as "please try again".
    LedgerNotUsable { detail: String },
    /// This account's master key is disabled, so nothing this signer produces
    /// can be authorised.
    ///
    /// rippled `Transactor.cpp:1039-1045`: a signature from the master key of
    /// an account carrying `lsfDisableMaster` is answered `tefMASTER_DISABLED`.
    /// This signer holds a family seed and signs as the account itself, so
    /// **every** transaction it builds for such an account is dead on arrival.
    /// It says so instead of producing them.
    MasterKeyDisabled { account: String },
    /// The ledger moved, or does not say what it said, between the read the
    /// transaction was built against and the read taken before signing.
    ///
    /// **Not retryable by simply resubmitting the same request** — the client
    /// must build a new intent against the new state, which is what it will do
    /// anyway. Distinguishable from a transport failure because the two mean
    /// very different things.
    LedgerMoved { detail: String },
    /// A confidential balance is on the ledger and did not decrypt within the
    /// configured search bound, so the signer cannot check an amount against
    /// it. It refuses rather than guessing.
    BalanceUnreadable { search_to: u64 },
}

impl Refusal {
    /// A stable machine-readable code.
    ///
    /// Distinguishable codes are a requirement, not a nicety: `REVIEW-013c`
    /// §3a B-VII found that a signer returning a generic error lets the web
    /// client render "transaction failed, please retry", which makes a loud
    /// refusal quiet. A client cannot collapse what it can tell apart.
    pub fn code(&self) -> &'static str {
        match self {
            Refusal::CallerSuppliedRandomness { .. } => "REFUSED_CALLER_RANDOMNESS",
            Refusal::Malformed { .. } => "REFUSED_MALFORMED",
            Refusal::Unauthorized { .. } => "REFUSED_UNAUTHORIZED",
            Refusal::DeclinedByHolder => "REFUSED_DECLINED_BY_HOLDER",
            Refusal::RandomnessReuse { .. } => "REFUSED_RANDOMNESS_REUSE",
            Refusal::RandomnessLedgerFault { .. } => "REFUSED_RANDOMNESS_LEDGER_FAULT",
            Refusal::EntropyUnavailable { .. } => "REFUSED_ENTROPY_UNAVAILABLE",
            Refusal::LedgerUnavailable { .. } => "REFUSED_LEDGER_UNAVAILABLE",
            Refusal::LedgerNotUsable { .. } => "REFUSED_LEDGER_NOT_USABLE",
            Refusal::MasterKeyDisabled { .. } => "REFUSED_MASTER_KEY_DISABLED",
            Refusal::LedgerMoved { .. } => "REFUSED_LEDGER_MOVED",
            Refusal::BalanceUnreadable { .. } => "REFUSED_BALANCE_UNREADABLE",
        }
    }

    pub fn detail(&self) -> String {
        match self {
            Refusal::CallerSuppliedRandomness { field } => format!(
                "request carried the field `{field}`; this signer never accepts \
                 caller-supplied randomness or key material on any path that can sign"
            ),
            Refusal::Malformed { reason } => reason.clone(),
            Refusal::Unauthorized { reason } => reason.clone(),
            Refusal::DeclinedByHolder => {
                "the holder declined this transaction in the signer's own UI".into()
            }
            Refusal::RandomnessReuse { which } => format!(
                "the randomness ledger already holds this {which}; signing would risk the \
                 reuse that lets a passive observer recover the difference between two \
                 confidential amounts. This is not retryable"
            ),
            Refusal::EntropyUnavailable { detail } => format!(
                "this signer could not obtain fresh entropy ({detail}). It will not fall back \
                 to a derived value: r is published on chain, and a blinding factor \
                 synthesised from a long-lived key is forbidden. Not retryable by a client"
            ),
            Refusal::RandomnessLedgerFault { detail } => format!(
                "the randomness ledger is unusable ({detail}). The signer will not sign until \
                 a human acknowledges this in the signer's own window. Do not retry"
            ),
            Refusal::LedgerUnavailable { detail } => format!(
                "the XRPL ledger could not be read ({detail}). This signer builds nothing \
                 against state it has not read. Retryable"
            ),
            Refusal::LedgerNotUsable { detail } => format!(
                "the configured ledger endpoint is not one this signer will build against \
                 ({detail}). **Not retryable** — an operator must change something"
            ),
            Refusal::MasterKeyDisabled { account } => format!(
                "the account {account} carries lsfDisableMaster, so a signature from its master \
                 key is answered tefMASTER_DISABLED. This signer holds a family seed and signs \
                 as the account itself, so every transaction it could build for {account} is \
                 dead on arrival. It will not build them. Not retryable"
            ),
            Refusal::LedgerMoved { detail } => format!(
                "the ledger state this transaction was built against is no longer current \
                 ({detail}). Build a new intent against the new state; resubmitting this one \
                 changes nothing"
            ),
            Refusal::BalanceUnreadable { search_to } => format!(
                "the confidential balance on the ledger did not decrypt within the configured \
                 search bound of {search_to}. The signer will not check an amount against a \
                 balance it could not read, and it will not guess one. Raise amount_search_to \
                 in the holder profile"
            ),
        }
    }
}

/// Scan raw request bytes for forbidden field names before interpreting them.
///
/// Deliberately operates on the parsed JSON tree rather than on the typed
/// request, and recurses: a forbidden field nested inside an object a future
/// request type adds would otherwise pass unnoticed.
/// Lowercase and strip separators, so `skA`, `sk_a`, `sk-a` and `SKA` all
/// collapse to the same string.
///
/// Matching was previously exact-after-lowercasing, and `skA` and `entropy_64`
/// walked straight through (REVIEW-014a). A denylist that only catches the
/// spellings its author happened to think of is a denylist with a hole in it.
pub fn normalise_field_name(k: &str) -> String {
    k.chars()
        .filter(|c| *c != '_' && *c != '-' && *c != ' ')
        .flat_map(|c| c.to_lowercase())
        .collect()
}

pub fn scan_for_forbidden(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::Object(map) => {
            for (k, v) in map {
                let lowered = normalise_field_name(k);
                if FORBIDDEN_FIELDS.iter().any(|f| normalise_field_name(f) == lowered) {
                    return Some(k.clone());
                }
                if let Some(found) = scan_for_forbidden(v) {
                    return Some(found);
                }
            }
            None
        }
        serde_json::Value::Array(items) => items.iter().find_map(scan_for_forbidden),
        _ => None,
    }
}

/// What the client asks for. **Advisory in every part.**
///
/// The `claimed` block exists because a real web UI wants to show a preview
/// before the signer is reached. It is carried, logged and then **ignored**:
/// nothing in it reaches the confirmation the holder sees. That is the whole
/// point of REVIEW-003b's finding — a value-shaped interface whose confirmation
/// echoes the client's own words confirms nothing.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Intent {
    pub grant: String,
    pub operation: String,
    pub issuance_id: String,
    pub destination: Option<String>,
    pub amount: String,
    /// The client's own rendering. **Never displayed. Never trusted.**
    #[serde(default)]
    pub claimed: Option<ClaimedSummary>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ClaimedSummary {
    #[serde(default)]
    pub destination: Option<String>,
    #[serde(default)]
    pub amount: Option<String>,
    #[serde(default)]
    pub issuance_id: Option<String>,
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Request {
    /// Establish scoped, short-lived authority. Nothing is persisted in the
    /// browser.
    ///
    /// ⚠ **This does NOT currently require a human in the signer's own UI**, and
    /// an earlier version of this comment said it did — an aspiration written
    /// as a fact (REVIEW-014b). Authority is bounded by scope, by TTL and by
    /// the connection, and **the per-transaction confirmation is what a human
    /// actually gates.** Requiring a human at pairing time as well is a
    /// reasonable hardening and is not implemented.
    Pair { operations: Vec<String>, ttl_secs: u64 },
    /// Build a transaction, confirm it, and (once keys exist) sign it.
    Prepare(Intent),
    /// Signer-local status. Needs no grant and touches no secret.
    ///
    /// ⚠ **This read `"Public ledger read"` until 2026-08-28 and that was
    /// false — it reads no ledger at all.** `session.rs`'s handler returns the
    /// crate version, a `keys_loaded` literal and a note carrying the holder's
    /// address, the randomness ledger's generation id and its entry count.
    /// *Touches no secret* is the half that is true and the half that matters.
    ///
    /// ⚠ **It was corrected because architecture §6 step 8's D1 rests on it.**
    /// The web tier may send this request and no other, so a sentence
    /// describing what it does is load-bearing for that ruling — and a comment
    /// that misdescribes a call is how `CLAIMS.md` E-200's secret went
    /// unwiped. **What it discloses is activity metadata, which P-4 and P-11
    /// already say this system does not hide**; the defect was the
    /// description, not the disclosure (`CLAIMS.md` E-205).
    Status,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum Response {
    Paired { grant: String, expires_unix: u64, operations: Vec<String> },
    /// ~~`Prepared`~~ — **struck 2026-08-18.** The skeleton returned a summary
    /// and a non-cryptographic digest because nothing signed. Something signs
    /// now, and the response carries the signed blob and the transaction hash
    /// rippled will report for it.
    ///
    /// ⚠ **The blob is signed, not submitted.** ~~This signer does not talk to
    /// a network — architecture §6 step 2, the ledger path, is not built~~ —
    /// **struck 2026-08-25: step 2 was built on 2026-08-19 and this signer has
    /// opened an outbound read-only JSON-RPC connection ever since.** The
    /// sentence that survives is the narrower one architecture §1 calls
    /// load-bearing in both halves: **it reads the ledger and it still does not
    /// write to it.** Whoever receives this blob is what submits it — and per
    /// `CLAIMS.md` B-15's step-7 ruling, whatever submits sets `tapFailHard`,
    /// which this signer cannot do because it does not submit.
    Signed { summary: String, tx_blob: String, hash: String },
    Status { version: String, keys_loaded: bool, note: String },
    Refused { code: String, detail: String },
}

impl From<Refusal> for Response {
    fn from(r: Refusal) -> Self {
        Response::Refused { code: r.code().into(), detail: r.detail() }
    }
}
