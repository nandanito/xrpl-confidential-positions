//! Request handling — the part that is testable without a socket.
//!
//! Kept separate from [`crate::ipc`] so the whole decision path can be driven
//! by tests directly, including the falsifier for architecture §6 step 1.
//!
//! # The signing path, in the order the rulings require
//!
//! ~~`session` does not call `store` or `randomness` on any path.~~ **It does
//! now** — architecture §6 step 4 said the wiring *is* step 3, and both
//! `REVIEW-014` legs noted the gap. The order below is not an implementation
//! preference; each step is somebody's ruling.
//!
//! 0. **Read the ledger**, at one pinned validated index, before anything is
//!    built. Architecture §6 step 2. ~~Sequence numbers, balances, balance
//!    versions and other holders' encryption keys come from a profile file.~~
//!    **They come from the ledger as of 2026-08-19** ([`crate::ledger`]).
//! 1. **Authorise** the grant. Scoped, short-lived, connection-bound.
//! 2. **Build and validate** the transaction plan from the intent plus signer
//!    state. Nothing from the client survives un-normalised.
//! 3. **Draw 64 bytes of fresh entropy**, once per signing *attempt*. A failure
//!    here **refuses to sign** — REVIEW-010c §2c, and the opposite of the
//!    sigma-nonce rule, and both are correct.
//! 4. **Derive `r` and `ρ`** from that entropy bound to the transaction
//!    context. A zero scalar aborts the attempt and is never retried.
//! 5. **Reserve both identifiers** in the randomness ledger *before* proof
//!    generation (§7 steps 4–6). A collision is a loud, non-retryable refusal.
//! 6. **Generate the proof**, which re-checks §7's shared-`C₁` rule.
//! 7. **Serialise, then parse back**, and render the confirmation from the
//!    parsed bytes — recovering the amount by *decrypting the transaction's own
//!    ciphertext*, never by echoing the request.
//! 8. **Sign** on confirmation — after **re-reading the ledger** and refusing
//!    if anything the transaction binds to moved — or **burn** the reservation
//!    on refusal. Amendment A7: a cancelled confirmation burns, it does not
//!    clear.

use crate::confirm::{self, Confirmer};
use crate::grant::{ConnectionId, GrantStore};
use crate::holder::HolderProfile;
use crate::ledger::{LedgerError, LedgerReader, LedgerSnapshot};
use crate::protocol::{scan_for_forbidden, Refusal, Request, Response};
use crate::prover::{self, ConvertBackInputs, SendInputs};
use crate::randomness::{self, Inputs, TxKind};
use crate::store::{self, ReserveError, Store};
use crate::txn::{self, SignerContext, TxType, WireFields};
use crate::xrpl::{self, TXN_SIGNATURE};
use std::time::Duration;

/// The result of [`Session::preflight`] — what the checks established, carried
/// forward so `wire_fields` cannot re-derive it differently.
enum Preflight {
    Send {
        destination_pk: [u8; 33],
        /// Kept so the pre-signing re-read can check that the key the proof
        /// was built against is still the key on the ledger. A substituted
        /// destination key is not a rejection, it is a **confidentiality
        /// break** — `CLAIMS.md` F-23.
        destination_address: String,
    },
    Convert,
    ConvertBack,
}

/// The confidential spending balance, and the three ways it can fail to be a
/// number.
///
/// It used to be a `u64` in a profile file. It is now decrypted from
/// `ConfidentialBalanceSpending` with `sk_A`, and *none* of these cases is
/// representable as a number — which is why the type has them instead of a
/// default.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Balance {
    /// The ledger carries no `ConfidentialBalanceSpending` for this holder.
    /// Nothing has been converted yet.
    Absent,
    /// Decrypted from the ledger's own ciphertext.
    Known(u64),
    /// A ciphertext is present and did not decrypt within `amount_search_to`.
    ///
    /// ⚠ Not an error in the ciphertext. The search is bounded by policy, and
    /// **the signer refuses rather than guessing** — the same rule the
    /// confirmation screen follows when it prints `*** COULD NOT BE READ ***`.
    Unreadable,
}

/// One ledger read, plus what only the holder's own key can add to it.
pub struct LedgerView {
    pub snapshot: LedgerSnapshot,
    pub balance: Balance,
    ctx: SignerContext,
}

pub struct Session {
    pub grants: GrantStore,
    holder: HolderProfile,
    reader: LedgerReader,
    /// The last read. `None` until one succeeds — **there is no default and no
    /// fallback**, which is the whole of architecture §6 step 2.
    view: Option<LedgerView>,
    store: Store,
    next_handle: u64,
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Which refusal a [`LedgerError`] deserves.
///
/// ⚠ **`REVIEW-016`, Codex leg.** Everything used to become
/// `REFUSED_LEDGER_UNAVAILABLE`, whose text ends *"Retryable"* — so a wrong
/// `network_id`, a plaintext endpoint and a malformed answer all told the
/// client to try again. None of them will ever resolve on their own.
fn refusal_for(e: LedgerError) -> Refusal {
    match e {
        // An operator must change something. Retrying cannot help.
        LedgerError::NotDevnet { .. }
        | LedgerError::InsecureEndpoint(_)
        | LedgerError::Malformed(_) => Refusal::LedgerNotUsable { detail: e.to_string() },
        // A node that is down, behind, or answering an error may not be next
        // time — a public endpoint is a cluster and the next call may reach a
        // different host.
        //
        // ⚠ `Desynchronised` belongs HERE and was in the other arm until round
        // two of `REVIEW-016`. A public endpoint is a cluster; E-103 records
        // two back-to-back calls landing in different ledgers. That is the
        // definition of retryable, and calling it a misconfiguration told the
        // client to give up on the one condition most likely to clear itself.
        LedgerError::Transport(_)
        | LedgerError::NotSynced { .. }
        | LedgerError::Regressed { .. }
        | LedgerError::Desynchronised { .. }
        | LedgerError::Rpc { .. } => Refusal::LedgerUnavailable { detail: e.to_string() },
    }
}

impl Session {
    pub fn new(holder: HolderProfile, reader: LedgerReader, store: Store) -> Session {
        Session { grants: GrantStore::new(), holder, reader, view: None, store, next_handle: 1 }
    }

    pub fn holder(&self) -> &HolderProfile {
        &self.holder
    }

    /// The last snapshot read, for a status line or a test. Never a substitute
    /// for [`Self::refresh`] on a signing path.
    pub fn view(&self) -> Option<&LedgerView> {
        self.view.as_ref()
    }

    /// Is the ledger source the operator's own machine? `CLAIMS.md` B-15.
    pub fn ledger_is_loopback(&self) -> bool {
        self.reader.is_loopback()
    }

    /// Read the ledger and rebuild everything derived from it.
    ///
    /// Called at the top of every `prepare`, so the state a transaction is
    /// built against is at most one round trip old. The balance is re-decrypted
    /// **only when the ciphertext changed** — the search is a fixed-iteration
    /// discrete log over `[0, amount_search_to]` and re-running it every
    /// request would make the bound a per-request latency cost.
    pub fn refresh(&mut self) -> Result<(), LedgerError> {
        let snapshot = self.reader.read(
            &self.holder.address(),
            &self.holder.issuance_id,
            now_unix(),
        )?;

        let balance = match snapshot.mptoken.balance_ciphertext {
            None => Balance::Absent,
            Some(ct) => {
                let cached = self.view.as_ref().and_then(|v| {
                    match (v.snapshot.mptoken.balance_ciphertext, v.balance) {
                        (Some(prev), b) if prev == ct => Some(b),
                        _ => None,
                    }
                });
                match cached {
                    Some(b) => b,
                    None => match prover::decrypt(
                        &ct,
                        self.holder.elgamal.secret(),
                        0,
                        self.holder.amount_search_to,
                    ) {
                        Ok(v) => Balance::Known(v),
                        Err(_) => Balance::Unreadable,
                    },
                }
            }
        };

        let ctx = SignerContext::new(
            &snapshot.account,
            snapshot.sequence,
            self.holder.network_id,
            self.holder.fee_drops,
            snapshot.last_ledger_sequence(),
            snapshot.mptoken.balance_version,
        )
        .map_err(|e| LedgerError::Malformed(e.to_string()))?;

        self.view = Some(LedgerView { snapshot, balance, ctx });
        Ok(())
    }

    /// The ledger's registered key for **this** account against the key this
    /// signer holds — the one local anchor there is against a lying node.
    ///
    /// `None` when nothing is registered yet, which is the pre-Convert state.
    pub fn own_key_matches_ledger(&self) -> Option<bool> {
        self.view.as_ref().and_then(|v| v.snapshot.holder_key_is(self.holder.elgamal.public()))
    }

    /// Handle one raw request.
    ///
    /// Takes **bytes**, not a typed request, so that the forbidden-field scan
    /// (architecture §3 item 5) runs against what the client actually sent
    /// rather than against what deserialisation chose to keep.
    pub fn handle(
        &mut self,
        raw: &[u8],
        conn: ConnectionId,
        confirmer: &mut dyn Confirmer,
    ) -> Response {
        let value: serde_json::Value = match serde_json::from_slice(raw) {
            Ok(v) => v,
            Err(e) => return Refusal::Malformed { reason: format!("not JSON: {e}") }.into(),
        };

        // Before anything is interpreted. A request carrying randomness is
        // refused by the name of the field it carried, so the refusal is
        // legible in a log and cannot be mistaken for a validation error.
        if let Some(field) = scan_for_forbidden(&value) {
            return Refusal::CallerSuppliedRandomness { field }.into();
        }

        let req: Request = match serde_json::from_value(value) {
            Ok(r) => r,
            Err(e) => return Refusal::Malformed { reason: format!("unrecognised request: {e}") }.into(),
        };

        match req {
            Request::Status => Response::Status {
                version: env!("CARGO_PKG_VERSION").into(),
                keys_loaded: true,
                note: format!(
                    "throwaway Devnet keys for {}. Devnet only. Randomness ledger generation {}, \
                     {} identifiers.",
                    self.holder.address(),
                    self.store.generation_id(),
                    self.store.len()
                ),
            },

            Request::Pair { operations, ttl_secs } => {
                if operations.is_empty() {
                    return Refusal::Malformed { reason: "a grant must name at least one operation".into() }.into();
                }
                if let Some(bad) = operations.iter().find(|o| txn::TxType::parse(o).is_none()) {
                    return Refusal::Malformed { reason: format!("unknown operation `{bad}`") }.into();
                }
                let handle = self.mint_handle();
                let g = self.grants.issue(
                    conn,
                    operations,
                    Duration::from_secs(ttl_secs),
                    handle,
                );
                Response::Paired {
                    grant: g.handle,
                    expires_unix: g.expires_unix,
                    operations: g.operations,
                }
            }

            Request::Prepare(intent) => {
                if let Err(reason) = self.grants.authorize(&intent.grant, conn, &intent.operation) {
                    return Refusal::Unauthorized { reason }.into();
                }
                match self.prepare(&intent, confirmer) {
                    Ok(r) => r,
                    Err(refusal) => refusal.into(),
                }
            }
        }
    }

    fn prepare(
        &mut self,
        intent: &crate::protocol::Intent,
        confirmer: &mut dyn Confirmer,
    ) -> Result<Response, Refusal> {
        // 0. **Read the ledger first.** Architecture §6 step 2. Nothing below
        // this line may use a value that came from a file.
        self.refresh().map_err(refusal_for)?;
        let view = self.view.as_ref().expect("refresh sets the view or returns Err");
        let snapshot = view.snapshot.clone();
        let balance = view.balance;
        let ctx = view.ctx.clone();

        // 2. Build from the intent plus the state just read.
        let built = txn::build(intent, &ctx)?;

        // 2b. **Everything checkable, checked BEFORE any entropy is drawn.**
        //
        // This used to live inside `wire_fields`, which runs *after* the
        // reservation — so a request that was always going to be refused
        // (wrong issuance, over the balance, destination with no registered
        // key) burned two identifiers on its way to being refused. The
        // identifiers are append-only, so nothing recovers them, and a hostile
        // local process could grow the ledger without ever reaching a human.
        // Found by `REVIEW-015b`, which also noted that a test had codified the
        // bad order.
        let preflight = self.preflight(&built, &snapshot, balance)?;

        // The context every downstream construction binds to. Computed once,
        // here, and passed to both the KDF and the prover — REVIEW-005c's
        // lesson is that a second computation is a second chance to disagree.
        let context = self.context_hash(&built)?;

        // 3. Fresh entropy, once per attempt. Failure refuses to sign.
        let mut entropy = [0u8; 64];
        store::getrandom(&mut entropy).map_err(|e| Refusal::EntropyUnavailable {
            detail: e.to_string(),
        })?;

        // 4. The ruled derivation.
        let kind = match built.tx_type() {
            TxType::Convert => TxKind::Convert,
            TxType::Send => TxKind::Send,
            TxType::ConvertBack => TxKind::ConvertBack,
        };
        let (r, rho) = randomness::derive_pair(&Inputs {
            tx_kind: kind,
            account_id: built.account_id(),
            mpt_issuance_id: built.issuance_bytes(),
            tx_context_id: &context,
            entropy64: &entropy,
        })
        .map_err(|_| Refusal::EntropyUnavailable {
            detail: "the derivation produced a zero scalar; this attempt is aborted and is \
                     not retried with the same entropy"
                .into(),
        })?;

        // 5. Reserve BEFORE proving. §7 steps 4-6.
        let r_entry = store::r_entry(self.store_key(), &r);
        let rho_entry = store::rho_entry(self.store_key(), &rho);
        let reservation = self
            .store
            .reserve(r_entry, rho_entry, now_unix())
            .map_err(|e| match e {
                ReserveError::AlreadyUsed { kind } => Refusal::RandomnessReuse {
                    which: match kind {
                        store::EntryKind::R => "encryption randomness r".into(),
                        store::EntryKind::Rho => "balance blinding rho".into(),
                    },
                },
                ReserveError::Io(d) => Refusal::RandomnessLedgerFault { detail: d },
            })?;

        // From here on, every exit must dispose of the reservation. A7: a
        // cancelled confirmation or a failed proof BURNS it — the scalars were
        // derived from entropy belonging to this attempt alone, so burning them
        // costs nothing and deleting them could permit a reuse.
        let outcome = self.prove_confirm_and_sign(
            &built, &preflight, &snapshot, balance, &context, &r, &rho, confirmer,
        );
        if let Err(e) = self.store.commit(reservation, now_unix()) {
            // The transaction may already be signed at this point. Say so
            // rather than pretending the failure was clean.
            return Err(Refusal::RandomnessLedgerFault {
                detail: format!(
                    "the reservation could not be committed after the attempt finished: {e}. \
                     **No signed blob is returned on this path** — the attempt is abandoned. \
                     But the identifiers may or may not be recorded, so the signer no longer \
                     knows whether its own reuse check is intact. Not retryable"
                ),
            });
        }
        outcome
    }

    /// Steps 6-8. Separated so that [`Self::prepare`] can dispose of the
    /// reservation on every path out of it, including the error paths.
    fn prove_confirm_and_sign(
        &mut self,
        built: &txn::BuiltTransaction,
        preflight: &Preflight,
        snapshot: &LedgerSnapshot,
        balance: Balance,
        context: &[u8; 32],
        r: &crate::scalar::Scalar,
        rho: &crate::scalar::Scalar,
        confirmer: &mut dyn Confirmer,
    ) -> Result<Response, Refusal> {
        // 6. The proof, and with it §7's shared-C1 check.
        let fields = self.wire_fields(built, preflight, snapshot, balance, context, r, rho)?;

        // 7. The one-way door. Everything downstream sees bytes.
        //
        // `SigningPubKey` goes in HERE, before anything is serialised, because
        // it is a **signing field**: adding it after the digest was computed
        // produces a signature over a serialisation the blob does not contain,
        // and rippled rejects that. It was added afterwards in the first draft
        // of this function and `tests/signing_path.rs::
        // the_signature_verifies_over_the_blob_that_carries_it` is what found
        // it — which is the whole reason that test verifies against the blob
        // rather than against the bytes this function happened to hold.
        let builder = txn::builder(built, &fields)
            .map_err(|e| Refusal::Malformed { reason: format!("serialisation: {e}") })?
            .blob(xrpl::SIGNING_PUB_KEY, self.holder.account.public());
        let bytes = builder
            .serialize(false)
            .map_err(|e| Refusal::Malformed { reason: format!("serialisation: {e}") })?;

        let mut parsed = txn::ParsedTransaction::parse(&bytes).map_err(|e| Refusal::Malformed {
            reason: format!("the signer could not re-parse its own transaction: {e}"),
        })?;

        // The amount comes out of the ciphertext in the transaction, decrypted
        // with the holder's own key. Not out of the request.
        parsed.recover_amount(self.holder.elgamal.secret(), self.holder.amount_search_to);

        // `render` takes only `&ParsedTransaction`. `intent` is not in scope in
        // this function at all, and `built` is deliberately not passed.
        let rendered = confirm::render(&parsed);
        if !confirmer.confirm(&rendered) {
            return Err(Refusal::DeclinedByHolder);
        }

        // 7b. **The ledger is read AGAIN, and the answer is compared.**
        //
        // Architecture §6 step 2 is falsified if *"a stale read is
        // indistinguishable from a fresh one"*. Bounding the age of the first
        // read does not do that — it makes staleness *unlikely*. Re-reading
        // and comparing makes it **detected**, and this is where the window
        // actually is: a human can sit on a confirmation for as long as they
        // like, and `Sequence` and `ConfidentialBalanceVersion` do not wait.
        //
        // Only the fields the transaction binds to are compared, so a ledger
        // simply closing does not fire it. See `LedgerSnapshot::binding_differs`.
        //
        // The expiry bound is read out of `parsed` — the bytes that will carry
        // the signature — rather than out of a value this function is holding.
        // `tests/signing_path.rs::the_signature_verifies_over_the_blob_that_carries_it`
        // exists because a weaker version of exactly that distinction shipped a
        // defect once already.
        self.recheck(snapshot, preflight, parsed.last_ledger_sequence)?;

        // 8. Sign. The message, not a digest — secp256k1 and ed25519 disagree
        // about what is hashed and `AccountKey` owns that difference.
        let message = builder
            .signing_message()
            .map_err(|e| Refusal::Malformed { reason: format!("signing serialisation: {e}") })?;
        let signature = self
            .holder
            .account
            .sign_message(&message)
            .map_err(|e| Refusal::Malformed { reason: format!("signing: {e}") })?;
        let signed = builder
            .blob(TXN_SIGNATURE, &signature)
            .serialize(false)
            .map_err(|e| Refusal::Malformed { reason: format!("signed serialisation: {e}") })?;

        Ok(Response::Signed {
            summary: rendered,
            tx_blob: xrpl::hex(&signed),
            hash: xrpl::hex(&xrpl::transaction_hash(&signed)),
        })
    }

    /// The one computation of the transaction context in this crate.
    fn context_hash(&self, built: &txn::BuiltTransaction) -> Result<[u8; 32], Refusal> {
        let map = |e: prover::ProverError| Refusal::Malformed { reason: e.to_string() };
        match built.tx_type() {
            TxType::Convert => prover::convert_context_hash(
                built.account_id(),
                built.issuance_bytes(),
                built.sequence(),
            )
            .map_err(map),
            TxType::Send => {
                let dest = built.destination_id().ok_or(Refusal::Malformed {
                    reason: "a Send reached the prover without a destination".into(),
                })?;
                prover::send_context_hash(
                    built.account_id(),
                    built.issuance_bytes(),
                    built.sequence(),
                    dest,
                    built.balance_version(),
                )
                .map_err(map)
            }
            // ⚠ **The version is in this context and not in Convert's**, and
            // that asymmetry is the specification's: a ConvertBack is proved
            // against a *balance*, so it binds to the balance version exactly
            // as a Send does. `binding_differs` is what refuses a signature
            // once that version has moved under the confirmation.
            TxType::ConvertBack => prover::convert_back_context_hash(
                built.account_id(),
                built.issuance_bytes(),
                built.sequence(),
                built.balance_version(),
            )
            .map_err(map),
        }
    }

    /// Everything about a request that can be decided **without** randomness.
    ///
    /// Separated so that `prepare` can refuse before drawing entropy or
    /// reserving an identifier. Anything that lands here must be a pure
    /// function of the plan and the signer's own state.
    /// Re-read the ledger after the human has confirmed, and refuse if
    /// anything the transaction binds to moved.
    ///
    /// ⚠ **This runs after the reservation, so a refusal here burns it** —
    /// amendment A7, and correct: the scalars belong to an attempt that is now
    /// abandoned.
    fn recheck(
        &mut self,
        before: &LedgerSnapshot,
        preflight: &Preflight,
        last_ledger_sequence: u32,
    ) -> Result<(), Refusal> {
        self.refresh().map_err(refusal_for)?;
        let after = &self.view.as_ref().expect("refresh sets the view").snapshot;

        // ⚠ **The transaction may have EXPIRED while the human was reading it,
        // and both `REVIEW-016` legs found this independently.**
        //
        // `LastLedgerSequence` is fixed when the transaction is built.
        // `binding_differs` deliberately ignores the ledger index — an ordinary
        // close is not drift — so nothing else here would notice that the index
        // has passed the bound. Signing anyway produces a blob rippled answers
        // with `tefMAX_LEDGER`: no fee, nothing recorded, and a client left
        // holding something that can never be submitted, with no reason given.
        //
        // The window was also too small for its own confirmation timeout; see
        // `ledger::LAST_LEDGER_SEQUENCE_WINDOW`. **Widening it makes this rare;
        // this check is what makes it detected.**
        if after.ledger_index >= last_ledger_sequence {
            return Err(Refusal::LedgerMoved {
                detail: format!(
                    "this transaction is only valid up to ledger {last_ledger_sequence} and the \
                     validated ledger is now {}. It expired while it was being confirmed, and \
                     signing it would produce a blob no validator can apply. It is not signed",
                    after.ledger_index
                ),
            });
        }
        if let Some(what) = before.binding_differs(after) {
            return Err(Refusal::LedgerMoved {
                detail: format!(
                    "{what}. The transaction was built against ledger {} and the ledger is now \
                     at {}. It is not signed",
                    before.ledger_index, after.ledger_index
                ),
            });
        }
        // The destination's key is not in our own snapshot, so `binding_differs`
        // cannot see it — and it is the field whose substitution is a
        // confidentiality break rather than a rejection (`CLAIMS.md` F-23).
        if let Preflight::Send { destination_pk, destination_address } = preflight {
            let ledger_index = after.ledger_index;
            let now = self
                .reader
                .holder_encryption_key(destination_address, &self.holder.issuance_id, ledger_index)
                .map_err(refusal_for)?;
            if now.as_ref() != Some(destination_pk) {
                return Err(Refusal::LedgerMoved {
                    detail: format!(
                        "the HolderEncryptionKey registered for {destination_address} is not the \
                         key this transaction encrypts to. The amount would be readable by \
                         whoever holds the key it was encrypted under, and a failed confidential \
                         transaction is still recorded on the ledger. It is not signed"
                    ),
                });
            }
        }
        Ok(())
    }

    fn preflight(
        &self,
        built: &txn::BuiltTransaction,
        snapshot: &LedgerSnapshot,
        balance: Balance,
    ) -> Result<Preflight, Refusal> {
        // The fee comes from the profile, not from a request, so this is a
        // misconfiguration rather than an attack — but it is **deterministic
        // and knowable now**, and `serialize` refusing it later would burn
        // identifiers for a transaction that could never have been built. Both
        // round-two legs pointed out that leaving it there contradicted this
        // function's own claim to check everything checkable.
        if self.holder.fee_drops > xrpl::MAX_DROPS {
            return Err(Refusal::Malformed {
                reason: format!(
                    "the configured fee is {} drops, above the {} drop total supply",
                    self.holder.fee_drops,
                    xrpl::MAX_DROPS
                ),
            });
        }
        if built.issuance_bytes() != &self.holder.issuance_id {
            return Err(Refusal::Malformed {
                reason: "this signer holds no position in that issuance".into(),
            });
        }

        // ⚠ **Nothing this signer builds for this account can be authorised.**
        //
        // rippled `Transactor.cpp:1039-1045`: `idAccount == idSigner` with the
        // master key disabled is `tefMASTER_DISABLED`. This signer holds a
        // family seed and signs as the account itself, so the condition is not
        // a warning — it is a guarantee that every blob it returns is dead.
        //
        // `REVIEW-016`'s Gemini leg found the *drift* case (the flag being set
        // mid-confirmation) and missed this one, which is worse: the flag being
        // already set is persistent, and the daemon merely printed a warning
        // about it on startup and signed anyway.
        if snapshot.security.disable_master {
            return Err(Refusal::MasterKeyDisabled { account: snapshot.account.clone() });
        }

        // The one anchor there is against a node that lies. It covers this
        // account's own key and nothing else — see `ledger`'s module header.
        if let Some(false) = snapshot.holder_key_is(self.holder.elgamal.public()) {
            return Err(Refusal::LedgerMoved {
                detail: format!(
                    "the HolderEncryptionKey registered on the ledger for {} is not the key \
                     this signer holds. Either this profile is for a different holder, or the \
                     endpoint is not telling the truth about the ledger",
                    snapshot.account
                ),
            });
        }

        match built.tx_type() {
            TxType::Send => {
                self.spendable(built, snapshot, balance)?;
                let dest_addr = built
                    .destination_id()
                    .map(|id| xrpl::encode_address(id))
                    .ok_or(Refusal::Malformed { reason: "a Send requires a destination".into() })?;

                // ⚠ Read from the ledger, **at this snapshot's index**, not
                // from a hand-maintained map in a file. Reading it at
                // `"validated"` instead would be the torn read `ledger`
                // exists to prevent.
                let destination_pk = self
                    .reader
                    .holder_encryption_key(
                        &dest_addr,
                        &self.holder.issuance_id,
                        snapshot.ledger_index,
                    )
                    .map_err(refusal_for)?
                    .ok_or_else(|| Refusal::Malformed {
                        reason: format!(
                            "no registered HolderEncryptionKey for {dest_addr} at ledger {}. \
                             The destination must have opted in and registered a key before it \
                             can receive a confidential amount",
                            snapshot.ledger_index
                        ),
                    })?;
                Ok(Preflight::Send { destination_pk, destination_address: dest_addr })
            }
            TxType::Convert => Ok(Preflight::Convert),
            TxType::ConvertBack => {
                self.spendable(built, snapshot, balance)?;

                // ⚠ **XLS-0096 §10.4.2 item 3 — and this is the one condition
                // a ConvertBack has that a Send does not reach.** A Send from
                // an unregistered account cannot be built at all, because
                // there is no balance to send. A ConvertBack could: the
                // `holder_key_is` check above answers `None` when nothing is
                // registered, which is a *pass* rather than a mismatch, and
                // that is correct for the initialising Convert and wrong here.
                if snapshot.mptoken.holder_encryption_key.is_none() {
                    return Err(Refusal::Malformed {
                        reason: format!(
                            "no HolderEncryptionKey is registered for {} in this issuance at \
                             ledger {}. A ConvertBack proves ownership of a confidential \
                             balance against a registered key; without one there is nothing \
                             to prove against and the ledger answers tecNO_PERMISSION",
                            snapshot.account, snapshot.ledger_index
                        ),
                    });
                }

                // §10.4.2 item 5: the issuance's public
                // `sfConfidentialOutstandingAmount` is decremented by
                // `MPTAmount`, and the ledger refuses `tecINSUFFICIENT_FUNDS`
                // if it would go negative. It is a public aggregate, so
                // checking it here costs nothing and leaks nothing.
                //
                // ⚠ **This can only fire on a ledger that already disagrees
                // with itself** — a holder's confidential balance is part of
                // that aggregate — which is exactly why it is worth having:
                // reaching it means a read is wrong, and F-23's lesson is that
                // a wrong read is not a harmless one.
                if built.amount() > snapshot.confidential_outstanding {
                    return Err(Refusal::Malformed {
                        reason: format!(
                            "amount {} exceeds the issuance's ConfidentialOutstandingAmount at \
                             ledger {} ({}). Either this signer's balance and the issuance's \
                             aggregate disagree, which they cannot honestly do, or the node is \
                             not describing one ledger",
                            built.amount(),
                            snapshot.ledger_index,
                            snapshot.confidential_outstanding
                        ),
                    });
                }
                Ok(Preflight::ConvertBack)
            }
        }
    }

    /// The confidential spending balance an amount is checked against, for the
    /// two operations that spend one.
    ///
    /// Shared between `Send` and `ConvertBack` because the three failures are
    /// identical and were about to be typed out twice — and a second copy of a
    /// balance check is a second chance for one of them to drift.
    fn spendable(
        &self,
        built: &txn::BuiltTransaction,
        snapshot: &LedgerSnapshot,
        balance: Balance,
    ) -> Result<u64, Refusal> {
        let available = match balance {
            Balance::Known(b) => b,
            Balance::Absent => {
                return Err(Refusal::Malformed {
                    reason: format!(
                        "the ledger carries no ConfidentialBalanceSpending for {} in this \
                         issuance at ledger {}. Nothing has been converted, so there is no \
                         confidential balance to spend from",
                        snapshot.account, snapshot.ledger_index
                    ),
                })
            }
            Balance::Unreadable => {
                return Err(Refusal::BalanceUnreadable {
                    search_to: self.holder.amount_search_to,
                })
            }
        };
        if built.amount() > available {
            return Err(Refusal::Malformed {
                reason: format!(
                    "amount {} exceeds the confidential balance this signer read from ledger \
                     {} ({available}). A proof over an over-spend is rejected by the ledger",
                    built.amount(),
                    snapshot.ledger_index
                ),
            });
        }
        Ok(available)
    }

    /// Proof material, from **the snapshot passed in**.
    ///
    /// ⚠ `snapshot` is a parameter and not `self.view` on purpose. `recheck`
    /// replaces `self.view` with a later read, and this function must use the
    /// state the plan, the context hash and the balance check were all built
    /// from. Reading `self.view` here happened to be correct given the current
    /// call order and would have become silently wrong the first time anyone
    /// moved the re-read — `REVIEW-005c`'s lesson is that a second computation
    /// is a second chance to disagree, and a second *lookup* is the same thing
    /// wearing different clothes.
    fn wire_fields(
        &self,
        built: &txn::BuiltTransaction,
        preflight: &Preflight,
        snapshot: &LedgerSnapshot,
        balance: Balance,
        context: &[u8; 32],
        r: &crate::scalar::Scalar,
        rho: &crate::scalar::Scalar,
    ) -> Result<WireFields, Refusal> {
        let map = |e: prover::ProverError| Refusal::Malformed { reason: e.to_string() };
        let issuance = &snapshot.issuance;
        match (built.tx_type(), preflight) {
            (TxType::Send, Preflight::Send { destination_pk, .. }) => {
                let destination_pk = *destination_pk;
                // Both halves of the balance witness come from ONE snapshot,
                // handed down from `prepare`: the number `preflight` checked
                // the amount against and the ciphertext the proof commits to.
                // Decrypting again here would cost a second fixed-iteration
                // discrete log and add nothing, and *looking either up again*
                // is the thing this function no longer does.
                let balance_ciphertext =
                    snapshot.mptoken.balance_ciphertext.ok_or_else(|| Refusal::Malformed {
                        reason: "a Send reached proof material with no ConfidentialBalanceSpending"
                            .into(),
                    })?;
                let Balance::Known(balance) = balance else {
                    return Err(Refusal::Malformed {
                        reason: "a Send reached proof material without a readable balance".into(),
                    });
                };

                let inputs = SendInputs {
                    sk: self.holder.elgamal.secret(),
                    pk: self.holder.elgamal.public(),
                    amount: built.amount(),
                    balance,
                    balance_ciphertext,
                    destination_pk,
                    issuer_pk: issuance.issuer_encryption_key,
                    auditor_pk: issuance.auditor_encryption_key,
                    context: *context,
                };
                let m = prover::prepare_send(&inputs, r, rho).map_err(map)?;
                Ok(WireFields::Send {
                    sender_encrypted_amount: m.sender_ciphertext,
                    destination_encrypted_amount: m.destination_ciphertext,
                    issuer_encrypted_amount: m.issuer_ciphertext,
                    auditor_encrypted_amount: m.auditor_ciphertext,
                    amount_commitment: m.amount_commitment,
                    balance_commitment: m.balance_commitment,
                    proof: m.proof,
                })
            }
            (TxType::Convert, Preflight::Convert) => {
                let amount = built.amount();
                let holder_ct =
                    prover::encrypt(amount, self.holder.elgamal.public(), r).map_err(map)?;
                let issuer_ct =
                    prover::encrypt(amount, &issuance.issuer_encryption_key, r).map_err(map)?;
                // XLS-0096 §7.3.2: **required** when the issuance has an
                // auditor key, or `tecNO_PERMISSION`. Same rule as a Send's.
                let auditor_ct = match issuance.auditor_encryption_key {
                    Some(pk) => Some(prover::encrypt(amount, &pk, r).map_err(map)?),
                    None => None,
                };

                // Registration happens exactly once. §7.2 forbids the key on a
                // Convert once one is registered (`tecDUPLICATE`), and ties
                // `ZKProof` to it: present together or absent together.
                //
                // ⚠ This used to be `holder_key_registered` in the profile —
                // a boolean an operator maintained by hand, whose being wrong
                // walked straight into the `tecDUPLICATE` it existed to
                // prevent. It is now **the presence of the field on the
                // ledger**, which is the thing rippled itself checks.
                let (holder_key, proof) = if snapshot.mptoken.holder_encryption_key.is_some() {
                    (None, None)
                } else {
                    let p = prover::convert_proof(
                        self.holder.elgamal.public(),
                        self.holder.elgamal.secret(),
                        context,
                    )
                    .map_err(map)?;
                    (Some(*self.holder.elgamal.public()), Some(p))
                };

                // §7's rule for the types that PUBLISH r on chain.
                let blinding_factor = *r.as_bytes();
                prover::assert_published_blinding_factor(&blinding_factor, r).map_err(map)?;

                Ok(WireFields::Convert {
                    holder_encryption_key: holder_key,
                    holder_encrypted_amount: holder_ct,
                    issuer_encrypted_amount: issuer_ct,
                    auditor_encrypted_amount: auditor_ct,
                    blinding_factor,
                    proof,
                })
            }
            (TxType::ConvertBack, Preflight::ConvertBack) => {
                // Both halves of the witness come from ONE snapshot, handed
                // down from `prepare`, for the same reason the Send arm says:
                // a second lookup is a second chance to disagree.
                let balance_ciphertext =
                    snapshot.mptoken.balance_ciphertext.ok_or_else(|| Refusal::Malformed {
                        reason: "a ConvertBack reached proof material with no \
                                 ConfidentialBalanceSpending"
                            .into(),
                    })?;
                let Balance::Known(balance) = balance else {
                    return Err(Refusal::Malformed {
                        reason: "a ConvertBack reached proof material without a readable balance"
                            .into(),
                    });
                };

                let inputs = ConvertBackInputs {
                    sk: self.holder.elgamal.secret(),
                    pk: self.holder.elgamal.public(),
                    amount: built.amount(),
                    balance,
                    balance_ciphertext,
                    issuer_pk: issuance.issuer_encryption_key,
                    auditor_pk: issuance.auditor_encryption_key,
                    context: *context,
                };
                let m = prover::prepare_convert_back(&inputs, r, rho).map_err(map)?;
                Ok(WireFields::ConvertBack {
                    holder_encrypted_amount: m.holder_ciphertext,
                    issuer_encrypted_amount: m.issuer_ciphertext,
                    auditor_encrypted_amount: m.auditor_ciphertext,
                    blinding_factor: m.blinding_factor,
                    balance_commitment: m.balance_commitment,
                    proof: m.proof,
                })
            }
            // `preflight` has already matched the shapes, so this is a
            // mismatch between two matches rather than a real branch.
            (t, _) => Err(Refusal::Malformed {
                reason: format!("{} reached proof material with a mismatched preflight", t.as_str()),
            }),
        }
    }

    fn store_key(&self) -> &store::LocalKey {
        self.store.key()
    }

    /// Grant handles.
    ///
    /// ⚠ **A counter, not a secret.** It is sufficient here only because
    /// [`GrantStore`] binds every grant to the connection that requested it, so
    /// guessing a handle gains nothing. If a grant ever becomes usable from a
    /// second connection, this must become CSPRNG output first.
    fn mint_handle(&mut self) -> String {
        let n = self.next_handle;
        self.next_handle += 1;
        format!("grant-{n:08}")
    }
}
