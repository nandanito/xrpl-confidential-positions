//! Architecture §6 step 2 — **the ledger read path.**
//!
//! Until 2026-08-19 the signer took sequence numbers, the confidential balance
//! and its ciphertext, `ConfidentialBalanceVersion`, the issuer key, the
//! auditor key, other holders' `HolderEncryptionKey` and whether its own key
//! was registered from a **profile file an operator pointed it at**. That file
//! was trusted input and everything downstream inherited it. This module
//! replaces it with a read.
//!
//! # ⚠ The read is load-bearing for CONFIDENTIALITY, not only for liveness
//!
//! The obvious failure of a wrong read is a rejected transaction. That is not
//! the worst one, and the worst one is not obvious.
//!
//! A `ConfidentialMPTSend` encrypts the amount to the **destination's**
//! `HolderEncryptionKey` and to the **issuer's** `IssuerEncryptionKey`, both of
//! which are read from the ledger. rippled verifies the proof against the keys
//! *it* holds — `ConfidentialMPTSend.cpp:132` takes
//! `(*sleDestinationMPToken)[sfHolderEncryptionKey]` — so a substituted key
//! makes the proof fail. **It fails with `tecBAD_PROOF`**
//! (`ConfidentialTransfer.cpp:451`), and a `tec` is *applied to the ledger*:
//! the transaction, and every ciphertext in it, is recorded permanently.
//!
//! So an adversary who controls what this module reads does not merely stop a
//! payment. They get the holder to **publish the amount encrypted under a key
//! the adversary holds**, and it stays on chain after the transaction fails.
//! `CLAIMS.md` F-23.
//!
//! Two things follow, and neither is optional:
//!
//! * **TLS is required for any non-loopback endpoint.** [`JsonRpcSource::new`]
//!   refuses `http://` unless the host is loopback, where the operator is
//!   running their own node and there is no network to be on-path in.
//! * **TLS is not enough and this module does not pretend it is.** It
//!   authenticates the *channel to a node the operator chose*, not the ledger
//!   data. A hostile or compromised node lies just as well over TLS. The one
//!   local anchor that exists is checked — [`LedgerSnapshot::holder_key_is`]
//!   compares the ledger's registered key for *this* account against the key
//!   this signer actually holds — and there is **no such anchor for the
//!   destination's key or the issuer's**. That is a named gap.
//!
//! # Torn reads
//!
//! A snapshot is read at **one pinned numeric ledger index**, never at
//! `"validated"` per call. Two `"validated"` calls seconds apart land in
//! different ledgers — observed live, `account_objects` at 4596692 and
//! `account_info` at 4596693 — and a snapshot assembled from both is a state
//! that never existed.
//!
//! # Staleness
//!
//! Architecture §6 step 2 is falsified if *"a stale read is indistinguishable
//! from a fresh one"*. Three things answer that, and only the third is strong:
//!
//! 1. Every snapshot carries the ledger index it was read at and the wall clock
//!    time it was read.
//! 2. A snapshot whose validated index moved **backwards** is refused
//!    ([`LedgerReader::read`]). Validated ledgers do not reorganise, so that is
//!    a lying or desynchronised node.
//! 3. The signing path **re-reads after the human confirms** and refuses if any
//!    field the transaction binds to changed
//!    ([`LedgerSnapshot::binding_differs`]). Staleness is not bounded, it is
//!    *detected*.

use crate::xrpl;
use serde_json::{json, Value};
use std::time::Duration;

/// Devnet. Never mainnet, at any phase, for any reason.
pub const DEVNET_NETWORK_ID: u32 = 2;

/// The public Devnet JSON-RPC cluster. Overridable per profile.
pub const DEFAULT_ENDPOINT: &str = "https://s.devnet.rippletest.net:51234/";

/// How far ahead of the read `LastLedgerSequence` is set.
///
/// ⚠ **It was 20, borrowed from `xrpl.js`'s `autofill`, and 20 was wrong here.**
/// `autofill` runs at *submit* time; this signer builds a transaction, then a
/// **human reads a confirmation for up to `CONFIRMATION_TIMEOUT_SECS`** (120),
/// and only then is it signed and handed to something else to submit. 20
/// ledgers is roughly 60–80 seconds on Devnet — **shorter than the confirmation
/// timeout** — so a holder who took ninety seconds got a transaction that was
/// already dead, and the signer signed it anyway.
///
/// Found independently by **both** `REVIEW-016` legs, which is the strongest
/// signal available. 60 ledgers is ~3 minutes at Devnet close times, which
/// covers the timeout with room for the submission that follows.
///
/// **Widening the window is not the fix on its own** — it makes the failure
/// rarer, not detectable. [`crate::session::Session::recheck`] refuses an
/// expired transaction outright, and that is the fix. This constant stops the
/// refusal firing on the ordinary case.
pub const LAST_LEDGER_SEQUENCE_WINDOW: u32 = 60;

/// The oldest validated ledger this signer will build against, in seconds.
///
/// `server_info` reports `validated_ledger.age`; a node that is up but not
/// keeping up produces state that is internally consistent and wrong.
pub const MAX_VALIDATED_LEDGER_AGE_SECS: u64 = 90;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LedgerError {
    /// The endpoint could not be reached, or the body was not readable.
    Transport(String),
    /// The node answered, and the answer was an error.
    Rpc { command: String, error: String, message: String },
    /// The node answered something this module cannot interpret.
    Malformed(String),
    /// **Refused before anything else is read.**
    NotDevnet { observed: u32 },
    /// The node is not synced far enough to be believed.
    NotSynced { state: String, age_secs: u64 },
    /// The validated ledger index moved backwards between two reads.
    Regressed { previous: u32, observed: u32 },
    /// A pinned read was answered from a different ledger, or from one the node
    /// does not call validated.
    ///
    /// ⚠ **A separate variant, and round two of `REVIEW-016` is why.** This was
    /// a `Malformed`, and `Malformed` classifies as a permanent
    /// misconfiguration — so the exact condition E-103 records as **transient**
    /// (a public endpoint is a cluster, and the next call reaches a different
    /// host) was reported to the client as *"Not retryable — an operator must
    /// change something"*, contradicting this project's own README one file
    /// over. A fix that introduces a defect is what a second round is for.
    Desynchronised { command: String, asked: u32, answered: Option<u32> },
    /// A plaintext endpoint that is not loopback.
    InsecureEndpoint(String),
}

impl std::fmt::Display for LedgerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LedgerError::Transport(s) => write!(f, "the ledger endpoint could not be reached: {s}"),
            LedgerError::Rpc { command, error, message } => {
                write!(f, "`{command}` returned `{error}`: {message}")
            }
            LedgerError::Malformed(s) => write!(f, "the node's answer could not be read: {s}"),
            LedgerError::NotDevnet { observed } => write!(
                f,
                "the endpoint reports network_id {observed}. This signer refuses every network \
                 but Devnet ({DEVNET_NETWORK_ID}), at any phase, for any reason"
            ),
            LedgerError::NotSynced { state, age_secs } => write!(
                f,
                "the node is in state `{state}` with a validated ledger {age_secs}s old \
                 (limit {MAX_VALIDATED_LEDGER_AGE_SECS}s). State read from a node that is not \
                 keeping up is internally consistent and wrong"
            ),
            LedgerError::Regressed { previous, observed } => write!(
                f,
                "the validated ledger index moved backwards, {previous} -> {observed}. \
                 Validated ledgers do not reorganise, so this is a node that is lying or one \
                 that is behind the node the previous read reached"
            ),
            LedgerError::Desynchronised { command, asked, answered } => match answered {
                Some(a) => write!(
                    f,
                    "`{command}` was asked for ledger {asked} and answered from {a}. A snapshot \
                     assembled from two ledgers is a state that never existed. Against a public \
                     endpoint this is usually a cluster host that is behind, and the next call \
                     may reach a different one"
                ),
                None => write!(
                    f,
                    "`{command}` answered from a ledger it does not call validated, when asked \
                     for {asked}"
                ),
            },
            LedgerError::InsecureEndpoint(e) => write!(
                f,
                "`{e}` is plaintext and not loopback. A network adversary who rewrites a \
                 HolderEncryptionKey makes this signer publish the amount encrypted under \
                 their own key, and the failed transaction keeps it on chain forever \
                 (CLAIMS.md F-23). Use https://, or run a node on localhost"
            ),
        }
    }
}

/// One XRPL JSON-RPC command.
///
/// A trait rather than a concrete client so the whole read path is drivable
/// from a test without a network — and, more importantly, so that **there is no
/// second way in**. Ledger state reaches [`crate::session::Session`] through
/// this trait or not at all; the profile file no longer carries any of it.
pub trait LedgerSource {
    fn call(&self, command: &str, params: Value) -> Result<Value, LedgerError>;
    /// For logs and refusal messages. Must not contain a secret.
    fn describe(&self) -> String;
    /// Is this source the operator's own machine?
    ///
    /// **`CLAIMS.md` B-15, ruled 2026-08-20.** A remote endpoint is trusted for
    /// amount confidentiality, and both `REVIEW-019` legs made saying so out
    /// loud a condition of the ruling. Defaults to `false`: a source that does
    /// not know is not loopback, because the failure that matters is a remote
    /// source being treated as local.
    fn is_loopback(&self) -> bool {
        false
    }
}

/// What must be said out loud when the ledger source is remote.
///
/// **`CLAIMS.md` B-15.** One endpoint is accepted for this research artifact as
/// a named risk acceptance, **not** because it is safe. Both review legs
/// required the trust statement to appear where an operator sees it, and one
/// of them supplied most of this wording.
///
/// ⚠ Do not soften this. `CLAIMS.md` P-5 forbids calling any of this secure,
/// and the whole point of the ruling was to stop the single-endpoint design
/// reading as a decision that had been made on security grounds.
pub const REMOTE_SOURCE_DISCLOSURE: &str = "⚠ THE LEDGER SOURCE IS REMOTE, AND IT IS TRUSTED FOR AMOUNT CONFIDENTIALITY.

  TLS authenticates the channel to this node.
  It does not authenticate the ledger.

  rippled's ledger_entry returns no Merkle proof, so this signer CANNOT
  cryptographically verify the destination's or the issuer's encryption key.

  If this node lies about either key, this signer will build a transaction
  that FAILS with tecBAD_PROOF and, because a tec is applied to the ledger,
  PERMANENTLY PUBLISHES the amount encrypted under the liar's key. That is
  executed, not theoretical: CLAIMS.md F-23.

  Run your own rippled on localhost to remove this trust.";

// ---------------------------------------------------------------------------
// The real one.
// ---------------------------------------------------------------------------

pub struct JsonRpcSource {
    endpoint: String,
    loopback: bool,
    agent: ureq::Agent,
}

/// The host of an `http://…` or `https://…` URL, with userinfo and port
/// removed.
///
/// ⚠ **Hand-written because getting it wrong is how the plaintext rule gets
/// bypassed.** `REVIEW-016`'s Codex leg found the previous version accepting
/// `http://127.attacker.example/` (it began with `127.`) and
/// `http://127.0.0.1@attacker.example/` (the userinfo was read as the host). A
/// URL's authority is `[userinfo@]host[:port]`, and **the host is what follows
/// the LAST `@`**, not what precedes the first `:`.
fn host_of(authority: &str) -> &str {
    let after_userinfo = match authority.rfind('@') {
        Some(i) => &authority[i + 1..],
        None => authority,
    };
    // An IPv6 literal is bracketed and contains colons of its own.
    //
    // ⚠ **The closing bracket is required.** Round two of `REVIEW-016` found
    // that `http://[::1` — no closing bracket, not a URL at all — yielded the
    // host `::1` and was accepted as plaintext loopback. A malformed authority
    // must fail the check, not pass it: this parser exists to decide whether
    // plaintext is safe, and it does not get to assume a later parser will
    // reject what it waved through.
    if let Some(rest) = after_userinfo.strip_prefix('[') {
        return match rest.split_once(']') {
            // Nothing may follow the bracket except a port.
            Some((host, after)) if after.is_empty() || after.starts_with(':') => host,
            _ => "",
        };
    }
    after_userinfo.split(':').next().unwrap_or("")
}

/// True only for a host that genuinely is this machine.
///
/// `localhost` by exact name, or **any address the standard library calls
/// loopback** — which covers the whole `127.0.0.0/8` block and `::1` without
/// this file deciding what that block is. A name that merely *starts with*
/// `127.` is a remote host with a misleading label and is refused.
fn is_loopback_host(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") {
        return true;
    }
    host.parse::<std::net::IpAddr>().map(|ip| ip.is_loopback()).unwrap_or(false)
}

impl JsonRpcSource {
    /// Build a source, refusing a plaintext non-loopback endpoint.
    pub fn new(endpoint: &str, timeout: Duration) -> Result<JsonRpcSource, LedgerError> {
        let rest = if let Some(r) = endpoint.strip_prefix("https://") {
            let _ = r;
            None
        } else if let Some(r) = endpoint.strip_prefix("http://") {
            Some(r)
        } else {
            return Err(LedgerError::Malformed(format!(
                "`{endpoint}` is not an http:// or https:// URL"
            )));
        };
        if let Some(rest) = rest {
            let authority = rest.split(['/', '?', '#']).next().unwrap_or("");
            if !is_loopback_host(host_of(authority)) {
                return Err(LedgerError::InsecureEndpoint(endpoint.to_string()));
            }
        }

        let authority = endpoint
            .split_once("://")
            .map(|(_, r)| r.split(['/', '?', '#']).next().unwrap_or(""))
            .unwrap_or("");
        let loopback = is_loopback_host(host_of(authority));

        let config = ureq::Agent::config_builder()
            .timeout_global(Some(timeout))
            .max_redirects(0)
            .build();
        Ok(JsonRpcSource { endpoint: endpoint.to_string(), loopback, agent: config.into() })
    }
}

impl LedgerSource for JsonRpcSource {
    fn call(&self, command: &str, params: Value) -> Result<Value, LedgerError> {
        let body = json!({ "method": command, "params": [params] }).to_string();
        let mut response = self
            .agent
            .post(&self.endpoint)
            .content_type("application/json")
            .send(body.as_str())
            .map_err(|e| LedgerError::Transport(e.to_string()))?;
        let text = response
            .body_mut()
            .read_to_string()
            .map_err(|e| LedgerError::Transport(e.to_string()))?;
        let value: Value =
            serde_json::from_str(&text).map_err(|e| LedgerError::Malformed(e.to_string()))?;
        let result = value.get("result").cloned().ok_or_else(|| {
            LedgerError::Malformed(format!("`{command}` returned no `result` object"))
        })?;
        Ok(result)
    }

    fn describe(&self) -> String {
        self.endpoint.clone()
    }

    fn is_loopback(&self) -> bool {
        self.loopback
    }
}

// ---------------------------------------------------------------------------
// What a read produces.
// ---------------------------------------------------------------------------

/// The account-level facts issue #11's onboarding branches on.
///
/// Read here rather than in step 6 because **detecting them IS a ledger read**,
/// which is why step 2 precedes step 6 rather than following it.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct AccountSecurity {
    /// `lsfDisableMaster`, 0x00100000 — rippled 3.3.0
    /// `include/xrpl/protocol/LedgerFormats.h:142`, read here through
    /// `account_info`'s own decoded `account_flags.disableMasterKey`
    /// (`AccountInfo.cpp:127`) rather than by asserting the constant.
    pub disable_master: bool,
    /// `sfRegularKey` on the `AccountRoot`, present only when one is set.
    pub regular_key: Option<String>,
    /// How many signer lists the account carries. Non-zero is the third of
    /// issue #11's three conditions.
    pub signer_lists: usize,
}

impl AccountSecurity {
    /// True when the master seed is **not** this account's spending authority.
    ///
    /// The keygen ruling's condition 2: for these holders, deriving the ElGamal
    /// key from the master seed turns a credential they were told they could
    /// retire into a permanent decryption key. Warning is mandatory; it is not
    /// cosmetic (`CLAIMS.md` E-69).
    pub fn master_seed_is_not_spending_authority(&self) -> bool {
        self.disable_master || self.regular_key.is_some() || self.signer_lists > 0
    }

    /// Every condition that holds, for a message.
    pub fn conditions(&self) -> Vec<&'static str> {
        let mut v = Vec::new();
        if self.disable_master {
            v.push("lsfDisableMaster is set");
        }
        if self.regular_key.is_some() {
            v.push("a regular key is set");
        }
        if self.signer_lists > 0 {
            v.push("a signer list is present");
        }
        v
    }
}

/// The holder's `MPToken` for one issuance, or its absence.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct MpTokenState {
    /// False before the holder has opted in at all. Not an error: the
    /// initialising `ConfidentialMPTConvert` is what creates it.
    pub exists: bool,
    /// `sfHolderEncryptionKey`, `SoeOptional` — absent until registered.
    /// **Its presence is what `holder_key_registered` used to assert from a
    /// file**, and XLS-0096 §7.2 makes re-registering it `tecDUPLICATE`.
    pub holder_encryption_key: Option<[u8; 33]>,
    /// `sfConfidentialBalanceSpending`, `SoeOptional`.
    pub balance_ciphertext: Option<[u8; 66]>,
    /// `sfConfidentialBalanceVersion`, `SoeDefault` — **absent means zero**,
    /// which is exactly what rippled does with it:
    /// `(*sleSenderMPToken)[~sfConfidentialBalanceVersion].value_or(0)`,
    /// `ConfidentialMPTSend.cpp:127`.
    pub balance_version: u32,
}

/// The issuance-level keys every ciphertext on a Send is also encrypted to.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IssuanceState {
    pub issuer_encryption_key: [u8; 33],
    pub auditor_encryption_key: Option<[u8; 33]>,
}

/// One internally consistent view of the ledger, at one index.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LedgerSnapshot {
    pub network_id: u32,
    pub ledger_index: u32,
    pub ledger_hash: String,
    /// Wall clock at the moment the read completed. Carried so that a stale
    /// snapshot can be *named* as stale rather than inferred to be fresh.
    pub read_at_unix: u64,
    pub account: String,
    pub sequence: u32,
    pub security: AccountSecurity,
    pub mptoken: MpTokenState,
    pub issuance: IssuanceState,
    /// `sfConfidentialOutstandingAmount` on the issuance — the **public**
    /// aggregate of everything held confidentially in it.
    ///
    /// ⚠ **Deliberately NOT a field of [`IssuanceState`].** `binding_differs`
    /// compares that struct whole, and this number moves whenever *any* holder
    /// converts in or out — none of which a transaction of ours binds to. Put
    /// here it is available to `preflight`, where XLS-0096 §10.4.2 item 5 needs
    /// it, and cannot make a re-read look like drift.
    pub confidential_outstanding: u64,
}

impl LedgerSnapshot {
    pub fn age_secs(&self, now: u64) -> u64 {
        now.saturating_sub(self.read_at_unix)
    }

    /// `LastLedgerSequence` for a transaction built against this snapshot.
    pub fn last_ledger_sequence(&self) -> u32 {
        self.ledger_index.saturating_add(LAST_LEDGER_SEQUENCE_WINDOW)
    }

    /// Does the ledger's registered key for **this** account match the key this
    /// signer holds?
    ///
    /// The only anchor this module has against a lying node, and it covers
    /// exactly one field. `None` means nothing is registered yet, which is the
    /// pre-Convert state and not a mismatch.
    pub fn holder_key_is(&self, ours: &[u8; 33]) -> Option<bool> {
        self.mptoken.holder_encryption_key.map(|k| &k == ours)
    }

    /// The fields a built transaction binds to, and therefore the fields that
    /// make a re-read *different* rather than merely *later*.
    ///
    /// A ledger closing does not change any of these. `Sequence` moves only
    /// when this account submits; `ConfidentialBalanceVersion` moves only when
    /// a confidential transaction touches this `MPToken`; the registration
    /// state moves once, ever. So comparing them is a check that fires on real
    /// drift and never on the clock.
    pub fn binding_differs(&self, other: &LedgerSnapshot) -> Option<String> {
        if self.sequence != other.sequence {
            return Some(format!(
                "the account Sequence moved from {} to {}",
                self.sequence, other.sequence
            ));
        }
        if self.mptoken.balance_version != other.mptoken.balance_version {
            return Some(format!(
                "ConfidentialBalanceVersion moved from {} to {} — the proof is bound to it \
                 through the transaction context hash, so it would no longer verify",
                self.mptoken.balance_version, other.mptoken.balance_version
            ));
        }
        if self.mptoken.holder_encryption_key != other.mptoken.holder_encryption_key {
            return Some("this account's HolderEncryptionKey changed on the ledger".into());
        }
        if self.mptoken.balance_ciphertext != other.mptoken.balance_ciphertext {
            return Some(
                "ConfidentialBalanceSpending changed on the ledger — the proof is over the \
                 balance ciphertext that was read"
                    .into(),
            );
        }
        if self.issuance != other.issuance {
            return Some(
                "the issuance's IssuerEncryptionKey or AuditorEncryptionKey changed".into(),
            );
        }
        // ⚠ **`lsfDisableMaster` only, not all of `AccountSecurity`.**
        //
        // `REVIEW-016`'s Gemini leg proposed comparing the whole struct. The
        // diagnosis is right and the remedy is too broad, and the difference is
        // load-bearing: rippled `Transactor.cpp:1039-1045` returns
        // `tefMASTER_DISABLED` for a master-key signature **only** when the
        // master key is disabled. Setting a regular key or adding a signer list
        // does not invalidate a master-key signature — `idAccount == idSigner`
        // with `!isMasterDisabled` returns `tesSUCCESS` regardless.
        //
        // Those two matter for **issue #11's keygen onboarding**, which is a
        // different question about a different key, and folding them in here
        // would refuse valid transactions for a reason that does not apply to
        // them. This project has one rule about not merging distinct rules
        // because they look alike, and it applies.
        if self.security.disable_master != other.security.disable_master {
            return Some(
                "lsfDisableMaster changed on this account. A master-key signature is answered \
                 with tefMASTER_DISABLED once it is set"
                    .into(),
            );
        }
        None
    }
}

// ---------------------------------------------------------------------------
// Reading.
// ---------------------------------------------------------------------------

fn rpc_error(command: &str, result: &Value) -> Option<LedgerError> {
    result.get("error").and_then(Value::as_str).map(|e| LedgerError::Rpc {
        command: command.to_string(),
        error: e.to_string(),
        message: result
            .get("error_message")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
    })
}

/// A `u32` from JSON, **refusing anything that does not fit**.
///
/// ⚠ `as u32` truncates. `REVIEW-016`'s Codex leg found that a `network_id` of
/// `4294967298` truncates to `2` and walks straight through a guard this file
/// describes as absolute — *"refuses every network but Devnet, at any phase,
/// for any reason"*. The same truncation applied to the ledger index, the
/// account sequence and the balance version, each of which would have produced
/// a transaction built against a number the node never sent.
fn u32_field(v: Option<&Value>, name: &str) -> Result<u32, LedgerError> {
    let n = v
        .and_then(Value::as_u64)
        .ok_or_else(|| LedgerError::Malformed(format!("`{name}` is missing or not a number")))?;
    u32::try_from(n).map_err(|_| {
        LedgerError::Malformed(format!(
            "`{name}` is {n}, which does not fit in 32 bits. This is not truncated to make it \
             fit: a truncated value is a different number that looks valid"
        ))
    })
}

/// A `UINT64` ledger field, which rippled serialises to JSON as a **string**.
///
/// ⚠ **`as_u64` on these returns `None`, not the number**, so a reader that
/// used the numeric helper here would see every amount as absent rather than
/// as wrong — the failure mode that hides. `SoeDefault`: absent means zero,
/// which is what rippled does with `sfConfidentialOutstandingAmount`.
fn u64_amount_field(node: &Value, name: &str) -> Result<u64, LedgerError> {
    let Some(v) = node.get(name) else { return Ok(0) };
    match v {
        Value::String(s) => s.parse::<u64>().map_err(|_| {
            LedgerError::Malformed(format!("`{name}` is {s:?}, which is not a base-10 u64"))
        }),
        Value::Number(n) => n.as_u64().ok_or_else(|| {
            LedgerError::Malformed(format!("`{name}` is {n}, which is not a non-negative integer"))
        }),
        other => Err(LedgerError::Malformed(format!(
            "`{name}` is {other}, which is neither a string nor a number"
        ))),
    }
}

fn field_hex<const N: usize>(node: &Value, name: &str) -> Result<Option<[u8; N]>, LedgerError> {
    let Some(v) = node.get(name) else { return Ok(None) };
    let s = v
        .as_str()
        .ok_or_else(|| LedgerError::Malformed(format!("{name} is not a string")))?;
    let b = xrpl::unhex(s).map_err(|e| LedgerError::Malformed(format!("{name}: {e}")))?;
    let n = b.len();
    let arr: [u8; N] = b.try_into().map_err(|_| {
        LedgerError::Malformed(format!("{name}: expected {N} bytes, the ledger returned {n}"))
    })?;
    Ok(Some(arr))
}

/// A reader bound to one source, remembering the last validated index it saw.
pub struct LedgerReader {
    source: Box<dyn LedgerSource>,
    last_index: Option<u32>,
}

impl LedgerReader {
    pub fn new(source: Box<dyn LedgerSource>) -> LedgerReader {
        LedgerReader { source, last_index: None }
    }

    pub fn describe(&self) -> String {
        self.source.describe()
    }

    /// Is the ledger source the operator's own machine? See
    /// [`REMOTE_SOURCE_DISCLOSURE`].
    pub fn is_loopback(&self) -> bool {
        self.source.is_loopback()
    }

    pub fn last_index(&self) -> Option<u32> {
        self.last_index
    }

    /// Read one internally consistent snapshot.
    ///
    /// Order matters: **the network guard runs before anything else is read**,
    /// and the index is pinned before any state is fetched.
    pub fn read(
        &mut self,
        account: &str,
        issuance_id: &[u8; 24],
        now: u64,
    ) -> Result<LedgerSnapshot, LedgerError> {
        // 1. Network, sync state, and the index everything else pins to.
        let info = self.source.call("server_info", json!({}))?;
        if let Some(e) = rpc_error("server_info", &info) {
            return Err(e);
        }
        let info = info
            .get("info")
            .ok_or_else(|| LedgerError::Malformed("server_info returned no `info`".into()))?;

        let network_id = u32_field(info.get("network_id"), "server_info.network_id")?;
        if network_id != DEVNET_NETWORK_ID {
            return Err(LedgerError::NotDevnet { observed: network_id });
        }

        let validated = info.get("validated_ledger").ok_or_else(|| {
            LedgerError::Malformed(
                "server_info returned no `validated_ledger`; this node has no validated ledger \
                 to read"
                    .into(),
            )
        })?;
        let ledger_index = u32_field(validated.get("seq"), "validated_ledger.seq")?;
        let ledger_hash = validated
            .get("hash")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        let age = validated.get("age").and_then(Value::as_u64).unwrap_or(0);
        let state = info.get("server_state").and_then(Value::as_str).unwrap_or("");
        if age > MAX_VALIDATED_LEDGER_AGE_SECS || !matches!(state, "full" | "validating" | "proposing")
        {
            return Err(LedgerError::NotSynced { state: state.to_string(), age_secs: age });
        }

        if let Some(previous) = self.last_index {
            if ledger_index < previous {
                return Err(LedgerError::Regressed { previous, observed: ledger_index });
            }
        }

        // 2. Everything else at the pinned index. Never at "validated".
        let sequence_and_security = self.account_info(account, ledger_index)?;
        let mptoken = self.mptoken(account, issuance_id, ledger_index)?;
        let (issuance, confidential_outstanding) = self.issuance(issuance_id, ledger_index)?;

        self.last_index = Some(ledger_index);
        Ok(LedgerSnapshot {
            network_id,
            ledger_index,
            ledger_hash,
            read_at_unix: now,
            account: account.to_string(),
            sequence: sequence_and_security.0,
            security: sequence_and_security.1,
            mptoken,
            issuance,
            confidential_outstanding,
        })
    }

    /// Every answer must say it came from the ledger that was asked for.
    ///
    /// ⚠ **Asking is not checking.** `REVIEW-016`'s Codex leg found this file
    /// claiming *"one pinned numeric ledger index"* while verifying only that
    /// `ledger_entry` called itself validated — so a node could answer
    /// `account_info` from one ledger and `ledger_entry` from another, and the
    /// torn read this module exists to prevent would be assembled and labelled
    /// with the first index.
    fn came_from(&self, command: &str, r: &Value, ledger_index: u32) -> Result<(), LedgerError> {
        if r.get("validated").and_then(Value::as_bool) != Some(true) {
            return Err(LedgerError::Desynchronised {
                command: command.into(),
                asked: ledger_index,
                answered: None,
            });
        }
        let answered = u32_field(r.get("ledger_index"), &format!("{command}.ledger_index"))?;
        if answered != ledger_index {
            return Err(LedgerError::Desynchronised {
                command: command.into(),
                asked: ledger_index,
                answered: Some(answered),
            });
        }
        Ok(())
    }

    fn account_info(
        &self,
        account: &str,
        ledger_index: u32,
    ) -> Result<(u32, AccountSecurity), LedgerError> {
        let r = self.source.call(
            "account_info",
            json!({ "account": account, "ledger_index": ledger_index, "signer_lists": true }),
        )?;
        if let Some(e) = rpc_error("account_info", &r) {
            return Err(e);
        }
        self.came_from("account_info", &r, ledger_index)?;
        let data = r
            .get("account_data")
            .ok_or_else(|| LedgerError::Malformed("account_info returned no `account_data`".into()))?;
        // The answer must be about the account that was asked for.
        if data.get("Account").and_then(Value::as_str) != Some(account) {
            return Err(LedgerError::Malformed(format!(
                "account_info was asked about {account} and answered about {:?}",
                data.get("Account")
            )));
        }
        let sequence = u32_field(data.get("Sequence"), "account_data.Sequence")?;

        // `account_flags` is rippled's own decoding of the raw `Flags` word
        // (`AccountInfo.cpp:127`). Reading it rather than masking 0x00100000
        // here means the bit is asserted by the node that owns the definition,
        // not by a constant in this file that nothing would catch going stale.
        let flags = r.get("account_flags").ok_or_else(|| {
            LedgerError::Malformed(
                "account_info returned no `account_flags`. This signer reads lsfDisableMaster \
                 from the node's own decoding rather than masking the raw Flags word, and will \
                 not guess it"
                    .into(),
            )
        })?;
        let disable_master = flags
            .get("disableMasterKey")
            .and_then(Value::as_bool)
            .ok_or_else(|| {
                LedgerError::Malformed("account_flags has no `disableMasterKey`".into())
            })?;

        let regular_key =
            data.get("RegularKey").and_then(Value::as_str).map(str::to_string);

        // ⚠ **`signer_lists` moves between API versions and this must read
        // both.** rippled `AccountInfo.cpp:230-237`: at `apiVersion == 1` it
        // goes under `account_data`, and from version 2 onwards at the top
        // level — the comment there says the old placement was the undocumented
        // one. Reading only `account_data` makes issue #11's *"a signer list is
        // present"* condition read as **zero** against a version-2 endpoint,
        // silently, and the keygen ruling's condition 2 is not cosmetic.
        //
        // The array is assigned **whether or not a list exists** when
        // `signer_lists` was requested (line 232 appends only if `sleSigners`,
        // then assigns either way), so absent from *both* places is a malformed
        // answer, not an empty list. Refusing beats reading zero.
        let signer_lists = match r
            .get("signer_lists")
            .or_else(|| data.get("signer_lists"))
            .and_then(Value::as_array)
        {
            Some(a) => a.len(),
            None => {
                return Err(LedgerError::Malformed(
                    "account_info was asked for `signer_lists` and returned it in neither \
                     documented place. It is NOT read as zero: issue #11 must know whether this \
                     account carries a signer list, and a silent zero is the wrong answer that \
                     looks like a right one"
                        .into(),
                ))
            }
        };

        Ok((sequence, AccountSecurity { disable_master, regular_key, signer_lists }))
    }

    fn mptoken(
        &self,
        account: &str,
        issuance_id: &[u8; 24],
        ledger_index: u32,
    ) -> Result<MpTokenState, LedgerError> {
        let node = match self.ledger_entry(
            json!({
                "mptoken": { "mpt_issuance_id": xrpl::hex(issuance_id), "account": account },
                "ledger_index": ledger_index
            }),
            ledger_index,
            "MPToken",
            true,
        )? {
            Some(n) => n,
            // Not opted in. The initialising Convert is what creates it, so
            // this is a state the signer must be able to start in.
            None => return Ok(MpTokenState::default()),
        };
        Self::mptoken_is_the_one_asked_for(&node, account, issuance_id)?;

        Ok(MpTokenState {
            exists: true,
            holder_encryption_key: field_hex::<33>(&node, "HolderEncryptionKey")?,
            balance_ciphertext: field_hex::<66>(&node, "ConfidentialBalanceSpending")?,
            // `SoeDefault`: absent means zero, which is what rippled does
            // with it. Present means it must fit — see `u32_field`.
            balance_version: match node.get("ConfidentialBalanceVersion") {
                None => 0,
                some => u32_field(some, "MPToken.ConfidentialBalanceVersion")?,
            },
        })
    }

    fn issuance(
        &self,
        issuance_id: &[u8; 24],
        ledger_index: u32,
    ) -> Result<(IssuanceState, u64), LedgerError> {
        let node = self
            .ledger_entry(
                json!({ "mpt_issuance": xrpl::hex(issuance_id), "ledger_index": ledger_index }),
                ledger_index,
                "MPTokenIssuance",
                false,
            )?
            .expect("tolerate_missing is false, so a missing entry is an error");

        let issuer_encryption_key = field_hex::<33>(&node, "IssuerEncryptionKey")?.ok_or_else(|| {
            LedgerError::Malformed(
                "the issuance carries no IssuerEncryptionKey, so it is not a confidential \
                 issuance and no confidential transaction can be built against it"
                    .into(),
            )
        })?;
        Ok((
            IssuanceState {
                issuer_encryption_key,
                auditor_encryption_key: field_hex::<33>(&node, "AuditorEncryptionKey")?,
            },
            u64_amount_field(&node, "ConfidentialOutstandingAmount")?,
        ))
    }

    /// Read the destination's registered `HolderEncryptionKey`.
    ///
    /// ⚠ **Pinned to the caller's snapshot index deliberately.** A Send is
    /// proved against one ledger state; reading the destination's key at a
    /// different one is the torn read this module exists to prevent.
    ///
    /// ⚠ **There is no local anchor on this value.** See the module header:
    /// a substituted key here is a confidentiality break, not a rejection.
    pub fn holder_encryption_key(
        &self,
        account: &str,
        issuance_id: &[u8; 24],
        ledger_index: u32,
    ) -> Result<Option<[u8; 33]>, LedgerError> {
        let Some(node) = self.ledger_entry(
            json!({
                "mptoken": { "mpt_issuance_id": xrpl::hex(issuance_id), "account": account },
                "ledger_index": ledger_index
            }),
            ledger_index,
            "MPToken",
            true,
        )?
        else {
            return Ok(None);
        };
        // ⚠ **The identity check matters most HERE.** This is the destination's
        // key, the field with no local anchor and the one whose substitution
        // leaks the amount rather than failing the transaction (F-23). A node
        // answering with some other account's `MPToken` would otherwise be
        // indistinguishable from an honest answer.
        Self::mptoken_is_the_one_asked_for(&node, account, issuance_id)?;
        field_hex::<33>(&node, "HolderEncryptionKey")
    }

    /// The returned `MPToken` must be **this account's, for this issuance**.
    fn mptoken_is_the_one_asked_for(
        node: &Value,
        account: &str,
        issuance_id: &[u8; 24],
    ) -> Result<(), LedgerError> {
        if node.get("Account").and_then(Value::as_str) != Some(account) {
            return Err(LedgerError::Malformed(format!(
                "an MPToken was requested for {account} and one for {:?} was returned",
                node.get("Account")
            )));
        }
        let want = xrpl::hex(issuance_id);
        let got = node.get("MPTokenIssuanceID").and_then(Value::as_str).unwrap_or("");
        if !got.eq_ignore_ascii_case(&want) {
            return Err(LedgerError::Malformed(format!(
                "an MPToken was requested for issuance {want} and one for `{got}` was returned"
            )));
        }
        Ok(())
    }

    fn ledger_entry(
        &self,
        params: Value,
        ledger_index: u32,
        expect_type: &str,
        tolerate_missing: bool,
    ) -> Result<Option<Value>, LedgerError> {
        let r = self.source.call("ledger_entry", params)?;
        if let Some(e) = rpc_error("ledger_entry", &r) {
            if tolerate_missing {
                if let LedgerError::Rpc { error, .. } = &e {
                    if error == "entryNotFound" {
                        // ⚠ **`not found` is an answer, and it is checked like
                        // one.** Round two of `REVIEW-016` found this path
                        // returning `None` without ever asking which ledger
                        // said so — which made the module's *"every answer must
                        // say it came from the ledger that was asked for"* a
                        // sentence with an exception in it. rippled carries
                        // `ledger_index` and `validated` on the error response;
                        // the live Devnet test drives this path.
                        self.came_from("ledger_entry", &r, ledger_index)?;
                        return Ok(None);
                    }
                }
            }
            return Err(e);
        }
        self.came_from("ledger_entry", &r, ledger_index)?;
        let node = r
            .get("node")
            .cloned()
            .ok_or_else(|| LedgerError::Malformed("ledger_entry returned no `node`".into()))?;
        // The node must be the kind of object that was asked for. Without this
        // a node could return an `MPTokenIssuance` where an `MPToken` was
        // requested, and `field_hex` would read whichever fields happened to
        // have the right names and lengths.
        let kind = node.get("LedgerEntryType").and_then(Value::as_str).unwrap_or("");
        if kind != expect_type {
            return Err(LedgerError::Malformed(format!(
                "ledger_entry was asked for a {expect_type} and returned a `{kind}`"
            )));
        }
        Ok(Some(node))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plaintext_is_refused_unless_it_is_loopback() {
        let t = Duration::from_secs(1);
        assert!(matches!(
            JsonRpcSource::new("http://s.devnet.rippletest.net:51234/", t),
            Err(LedgerError::InsecureEndpoint(_))
        ));
        assert!(JsonRpcSource::new("http://127.0.0.1:5005/", t).is_ok());
        assert!(JsonRpcSource::new("http://localhost:5005/", t).is_ok());
        assert!(JsonRpcSource::new("http://[::1]:5005/", t).is_ok());
        assert!(JsonRpcSource::new("https://s.devnet.rippletest.net:51234/", t).is_ok());
        assert!(matches!(
            JsonRpcSource::new("ws://127.0.0.1:6006/", t),
            Err(LedgerError::Malformed(_))
        ));
    }

    #[test]
    fn a_host_that_merely_starts_with_localhost_is_not_loopback() {
        // `http://localhost.example.com/` is a remote host.
        assert!(matches!(
            JsonRpcSource::new("http://localhost.example.com/", Duration::from_secs(1)),
            Err(LedgerError::InsecureEndpoint(_))
        ));
    }

    #[test]
    fn security_conditions_are_named_individually() {
        let s = AccountSecurity {
            disable_master: true,
            regular_key: Some("rXYZ".into()),
            signer_lists: 1,
        };
        assert!(s.master_seed_is_not_spending_authority());
        assert_eq!(s.conditions().len(), 3);
        assert!(!AccountSecurity::default().master_seed_is_not_spending_authority());
    }
}
