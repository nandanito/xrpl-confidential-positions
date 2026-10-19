//! Transaction construction, and the one-way door the confirmation depends on.
//!
//! # The property this module exists to enforce
//!
//! `ARCHITECTURE-2026-08-18.md` §6 step 1 names the falsifier for the signer
//! skeleton:
//!
//! > *Falsified if: the confirmation renders client-supplied strings rather
//! > than fields parsed from the transaction the signer itself built.*
//!
//! That is enforced structurally rather than by discipline:
//!
//! * [`BuiltTransaction`] is produced only by [`build`], from an intent plus
//!   signer-side state. Its fields are private.
//! * [`ParsedTransaction`] has exactly one constructor, [`ParsedTransaction::parse`],
//!   which takes bytes. There is no `From<BuiltTransaction>`, no `Clone` from
//!   the intent, and no field-by-field copy.
//! * The confirmation renderer accepts `&ParsedTransaction` and nothing else,
//!   so it *cannot* see an [`Intent`] — the type is not in scope for it.
//!
//! A future change that breaks the property has to delete a type boundary to do
//! it, which is visible in review. A comment saying "don't do that" is not.
//!
//! # ~~What the encoding here is, and is not~~ — struck 2026-08-18
//!
//! ~~This is NOT XRPL binary serialisation and must never be submitted to a
//! network.~~ **It is now.** [`serialize`] produces canonical XRPL bytes
//! through [`crate::xrpl`], pinned byte-for-byte against
//! `ripple-binary-codec@2.9.0` by `tests/xrpl_vectors.rs`. The length-framed
//! placeholder is gone, and with it the `WCONF-SKEL-TXN-v1` magic.
//!
//! # The amount is not on the wire, and that changes the confirmation
//!
//! A `ConfidentialMPTSend` carries no plaintext amount — that is the point of
//! the scheme. So the confirmation cannot render one out of the bytes, and
//! echoing the client's integer is exactly what REVIEW-003b forbids.
//!
//! [`ParsedTransaction::recover_amount`] resolves it the only honest way: it
//! **decrypts `SenderEncryptedAmount` from the transaction itself**, with the
//! holder's own ElGamal key. What the holder confirms is the number the
//! ciphertext actually encrypts, not the number anybody claimed. If it does not
//! decrypt within the bounded search range the confirmation says so, loudly,
//! and never guesses.

use crate::mpt::sizes as mpt_sizes;
use crate::protocol::{Intent, Refusal};
use crate::xrpl::{self, TxBuilder, XrplError};

/// Transaction types this signer will build. From the ruled `r`/`ρ`
/// construction's `tx_type` domain (REVIEW-010 Deliverable A).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TxType {
    Convert,
    Send,
    ConvertBack,
}

impl TxType {
    pub fn parse(s: &str) -> Option<TxType> {
        match s {
            "ConfidentialMPTConvert" => Some(TxType::Convert),
            "ConfidentialMPTSend" => Some(TxType::Send),
            "ConfidentialMPTConvertBack" => Some(TxType::ConvertBack),
            _ => None,
        }
    }
    pub fn as_str(&self) -> &'static str {
        match self {
            TxType::Convert => "ConfidentialMPTConvert",
            TxType::Send => "ConfidentialMPTSend",
            TxType::ConvertBack => "ConfidentialMPTConvertBack",
        }
    }
    pub fn wire_code(&self) -> u16 {
        match self {
            TxType::Convert => xrpl::tx_type::CONFIDENTIAL_MPT_CONVERT,
            TxType::Send => xrpl::tx_type::CONFIDENTIAL_MPT_SEND,
            TxType::ConvertBack => xrpl::tx_type::CONFIDENTIAL_MPT_CONVERT_BACK,
        }
    }
    pub fn from_wire_code(c: u16) -> Option<TxType> {
        match c {
            xrpl::tx_type::CONFIDENTIAL_MPT_CONVERT => Some(TxType::Convert),
            xrpl::tx_type::CONFIDENTIAL_MPT_SEND => Some(TxType::Send),
            xrpl::tx_type::CONFIDENTIAL_MPT_CONVERT_BACK => Some(TxType::ConvertBack),
            _ => None,
        }
    }
    /// Whether this type carries a destination. A Convert moves a holder's own
    /// public balance into their own confidential balance; there is no
    /// counterparty, and rendering one would be a lie.
    pub fn has_destination(&self) -> bool {
        matches!(self, TxType::Send)
    }
}

/// Signer-side state the client does not control.
///
/// Every field here is either the signer's own identity or a value read from
/// the ledger. Nothing in a request reaches it.
#[derive(Debug, Clone)]
pub struct SignerContext {
    pub account: String,
    pub account_id: [u8; 20],
    pub sequence: u32,
    pub network_id: u32,
    pub fee_drops: u64,
    pub last_ledger_sequence: u32,
    /// `ConfidentialBalanceVersion` from the holder's `MPToken`. It is part of
    /// the Send and ConvertBack context hashes, so a stale read produces a
    /// proof bound to the wrong statement.
    pub balance_version: u32,
}

impl SignerContext {
    /// Build a context from a **checksum-validated** classic address.
    pub fn new(
        address: &str,
        sequence: u32,
        network_id: u32,
        fee_drops: u64,
        last_ledger_sequence: u32,
        balance_version: u32,
    ) -> Result<SignerContext, XrplError> {
        Ok(SignerContext {
            account_id: xrpl::decode_address(address)?,
            account: address.to_string(),
            sequence,
            network_id,
            fee_drops,
            last_ledger_sequence,
            balance_version,
        })
    }
}

/// Built by the signer, from the signer's own state. Fields are private on
/// purpose: nothing outside this module reads them, and in particular the
/// confirmation renderer cannot.
#[derive(Debug)]
pub struct BuiltTransaction {
    tx_type: TxType,
    account_id: [u8; 20],
    destination_id: Option<[u8; 20]>,
    // The string forms of the account, destination and issuance are
    // deliberately NOT kept. They were, and were never read: the bytes are
    // what the transaction carries, and the confirmation reads its strings
    // back out of those bytes. A field nobody reads is a field somebody
    // later reads by accident.
    issuance_bytes: [u8; 24],
    amount: u64,
    sequence: u32,
    network_id: u32,
    fee_drops: u64,
    last_ledger_sequence: u32,
    balance_version: u32,
}

impl BuiltTransaction {
    pub fn tx_type(&self) -> TxType {
        self.tx_type
    }
    pub fn account_id(&self) -> &[u8; 20] {
        &self.account_id
    }
    pub fn destination_id(&self) -> Option<&[u8; 20]> {
        self.destination_id.as_ref()
    }
    pub fn issuance_bytes(&self) -> &[u8; 24] {
        &self.issuance_bytes
    }
    pub fn amount(&self) -> u64 {
        self.amount
    }
    pub fn sequence(&self) -> u32 {
        self.sequence
    }
    pub fn balance_version(&self) -> u32 {
        self.balance_version
    }
}

/// Validate an intent and build a transaction from it.
///
/// Every value that reaches the output is either re-derived from signer state
/// or *normalised* from the intent — never copied through. The amount is the
/// clearest case: `"0100"` and `"100"` are the same transaction, and the
/// confirmation shows the number the signer will sign, not the string the
/// client typed.
pub fn build(intent: &Intent, ctx: &SignerContext) -> Result<BuiltTransaction, Refusal> {
    let tx_type = TxType::parse(&intent.operation)
        .ok_or_else(|| Refusal::Malformed { reason: format!("unknown operation `{}`", intent.operation) })?;

    let issuance_id = normalise_hex(&intent.issuance_id, 24).map_err(|e| Refusal::Malformed {
        reason: format!("issuance_id: {e}"),
    })?;
    let issuance_bytes: [u8; 24] = xrpl::unhex(&issuance_id)
        .map_err(|e| Refusal::Malformed { reason: format!("issuance_id: {e}") })?
        .try_into()
        .map_err(|_| Refusal::Malformed { reason: "issuance_id: not 24 bytes".into() })?;

    let amount: u64 = intent.amount.parse().map_err(|_| Refusal::Malformed {
        reason: format!("amount `{}` is not a base-10 unsigned integer", intent.amount),
    })?;
    if amount == 0 {
        return Err(Refusal::Malformed { reason: "amount must be greater than zero".into() });
    }

    let destination = match (tx_type.has_destination(), intent.destination.as_deref()) {
        (true, Some(d)) => Some(normalise_account(d).map_err(|e| Refusal::Malformed {
            reason: format!("destination: {e}"),
        })?),
        (true, None) => {
            return Err(Refusal::Malformed { reason: "a Send requires a destination".into() })
        }
        // A destination supplied for a type that has none is a refusal, not a
        // silent drop: the client believes it is sending somewhere.
        (false, Some(_)) => {
            return Err(Refusal::Malformed {
                reason: format!("{} carries no destination, but one was supplied", tx_type.as_str()),
            })
        }
        (false, None) => None,
    };

    // The checksum, not just the shape. `normalise_account` above is the weaker
    // check and says so; this is the one the bytes depend on.
    let destination_id = match &destination {
        Some(d) => Some(xrpl::decode_address(d).map_err(|e| Refusal::Malformed {
            reason: format!("destination: {e}"),
        })?),
        None => None,
    };

    Ok(BuiltTransaction {
        tx_type,
        account_id: ctx.account_id,
        destination_id,
        issuance_bytes,
        amount,
        sequence: ctx.sequence,
        network_id: ctx.network_id,
        fee_drops: ctx.fee_drops,
        last_ledger_sequence: ctx.last_ledger_sequence,
        balance_version: ctx.balance_version,
    })
}

fn normalise_hex(s: &str, want_bytes: usize) -> Result<String, String> {
    let t = s.trim();
    if t.len() != want_bytes * 2 {
        return Err(format!("expected {} hex characters, got {}", want_bytes * 2, t.len()));
    }
    if !t.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("contains a non-hex character".into());
    }
    Ok(t.to_ascii_uppercase())
}

/// The XRPL base58 alphabet. Note it excludes `0`, `O`, `I` and `l`.
const XRPL_B58: &str = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";

/// Whether a string passes the **shape and alphabet** check only.
///
/// Exposed so `tests/xrpl_vectors.rs` can demonstrate the gap this check
/// leaves: it accepts an address whose base58check checksum is wrong, and
/// [`crate::xrpl::decode_address`] is what closes it. Two checks, two
/// strengths, and the weaker one is not allowed to look like the stronger.
pub fn shape_of_account_is_plausible(s: &str) -> bool {
    normalise_account(s).is_ok()
}

fn normalise_account(s: &str) -> Result<String, String> {
    let t = s.trim();
    // Shape and alphabet only — **not** a checksum. The checksum check is
    // `xrpl::decode_address`, which `build` calls immediately after this. The
    // alphabet check was added after a review leg noted that
    // `is_ascii_alphanumeric` accepts `0`, `O`, `I` and `l`, which XRPL base58
    // excludes (REVIEW-014a).
    if !t.starts_with('r') || t.len() < 25 || t.len() > 35 {
        return Err(format!("`{t}` is not shaped like an XRPL classic address"));
    }
    if let Some(bad) = t.chars().find(|c| !XRPL_B58.contains(*c)) {
        return Err(format!("contains `{bad}`, which is not in the XRPL base58 alphabet"));
    }
    Ok(t.to_string())
}

// ---------------------------------------------------------------------------
// The one-way door
// ---------------------------------------------------------------------------

/// The cryptographic fields a transaction carries, produced by
/// [`crate::prover`] from the **ruled** scalars.
///
/// A transaction cannot be serialised without one. That is deliberate: while
/// this module could serialise from the intent alone, a "transaction" with no
/// proof in it would be a thing the confirmation could render and the ledger
/// could never accept.
pub enum WireFields {
    Send {
        sender_encrypted_amount: [u8; 66],
        destination_encrypted_amount: [u8; 66],
        issuer_encrypted_amount: [u8; 66],
        /// Present exactly when the issuance carries an `AuditorEncryptionKey`.
        ///
        /// ⚠ **Omitting it silently is a CRITICAL defect and this field exists
        /// because the first version of this enum did.** `prover::prepare_send`
        /// builds a **four-participant** proof when an auditor key is
        /// configured; a transaction carrying only three ciphertexts cannot
        /// satisfy it, and every such Send would have been rejected. It was
        /// invisible on Devnet only because the test issuance has no auditor.
        /// Found by `REVIEW-015a`.
        auditor_encrypted_amount: Option<[u8; 66]>,
        amount_commitment: [u8; 33],
        balance_commitment: [u8; 33],
        proof: Vec<u8>,
    },
    Convert {
        /// **Required when initialising, FORBIDDEN when a key is already
        /// registered** — XLS-0096 §7.2, and `tecDUPLICATE` if you get it
        /// wrong. `ZKProof` follows it exactly: required when this is present,
        /// and *"MUST be absent"* when it is not.
        holder_encryption_key: Option<[u8; 33]>,
        holder_encrypted_amount: [u8; 66],
        issuer_encrypted_amount: [u8; 66],
        /// Same rule as a Send's: **required** when the issuance carries an
        /// `AuditorEncryptionKey`, or the transaction fails `tecNO_PERMISSION`
        /// (XLS-0096 §7.3.2 item 1).
        ///
        /// ⚠ A review leg proposed *removing* auditor support from Convert as
        /// the fix for a permissiveness finding. The spec says the opposite.
        /// **A review finding is evidence, not an instruction.**
        auditor_encrypted_amount: Option<[u8; 66]>,
        /// **`r`, published in the clear.** REVIEW-010 §7 requires the signer to
        /// check this equals `scalar32(r)` before signing; `prover::
        /// assert_published_blinding_factor` is that check.
        blinding_factor: [u8; 32],
        /// Present exactly when `holder_encryption_key` is.
        proof: Option<[u8; 64]>,
    },
    /// XLS-0096 §10.3, read at source rather than inherited from Convert.
    ///
    /// ⚠ **Three fields differ from a Convert and every one of them was wrong
    /// when this type shared Convert's arm** (`REVIEW-015` round three): the
    /// `ZKProof` is **required** and 816 bytes rather than optional and 64,
    /// there is **no `HolderEncryptionKey` field at all** — a ConvertBack
    /// cannot register a key, and the holder must already have one — and
    /// `BalanceCommitment` is **required**, which Convert has no notion of.
    ConvertBack {
        holder_encrypted_amount: [u8; 66],
        issuer_encrypted_amount: [u8; 66],
        /// **Required** when the issuance carries an `AuditorEncryptionKey`
        /// (§10.4.2 item 4), or `tecNO_PERMISSION`. The same conditional rule
        /// as Convert's and Send's, and it is conditional in all three.
        auditor_encrypted_amount: Option<[u8; 66]>,
        /// **`r`, published in the clear**, and checked against the derived
        /// scalar before signing exactly as a Convert's is.
        blinding_factor: [u8; 32],
        /// `pc_b` — the commitment to the confidential balance the remainder
        /// range proof is taken over.
        balance_commitment: [u8; 33],
        /// 816 bytes: a 128-byte compact sigma proof over `(b, ρ, sk_A)` and a
        /// 688-byte single Bulletproof over `b − m`.
        proof: Vec<u8>,
    },
}

/// Canonical XRPL serialisation of the transaction, **unsigned**.
pub fn serialize(tx: &BuiltTransaction, fields: &WireFields) -> Result<Vec<u8>, XrplError> {
    let b = builder(tx, fields)?;
    b.serialize(false)
}

/// The same transaction as a [`TxBuilder`], so the signing path can add
/// `TxnSignature` without re-deriving anything.
pub fn builder(tx: &BuiltTransaction, fields: &WireFields) -> Result<TxBuilder, XrplError> {
    let mut b = TxBuilder::new()
        .u16(xrpl::TRANSACTION_TYPE, tx.tx_type.wire_code())
        .account(xrpl::ACCOUNT, &tx.account_id)
        .hash(xrpl::MPT_ISSUANCE_ID, &tx.issuance_bytes)
        .u32(xrpl::SEQUENCE, tx.sequence)
        .u32(xrpl::FLAGS, 0)
        .u32(xrpl::LAST_LEDGER_SEQUENCE, tx.last_ledger_sequence)
        .drops(xrpl::FEE, tx.fee_drops);

    // **`NetworkID` is omitted below the threshold, and that is not optional.**
    // Devnet is network 2, and a transaction carrying an explicit `NetworkID`
    // there is rejected with `telNETWORK_ID_MAKES_TX_NON_CANONICAL` — observed,
    // not inferred, on 2026-08-18. Networks above the threshold require it.
    // A signer therefore cannot treat the field as always-safe-to-include, and
    // the consequence reaches the confirmation: on Devnet the network is **not
    // in the bytes**, so the confirmation must say that rather than print a
    // number it got from somewhere else.
    if tx.network_id > xrpl::NETWORK_ID_OMIT_AT_OR_BELOW {
        b = b.u32(xrpl::NETWORK_ID, tx.network_id);
    }

    match (tx.tx_type, fields) {
        (TxType::Send, WireFields::Send {
            sender_encrypted_amount,
            destination_encrypted_amount,
            issuer_encrypted_amount,
            auditor_encrypted_amount,
            amount_commitment,
            balance_commitment,
            proof,
        }) => {
            let dest = tx.destination_id.ok_or_else(|| {
                XrplError::Field("a Send reached serialisation without a destination".into())
            })?;
            b = b
                .account(xrpl::DESTINATION, &dest)
                .blob(xrpl::SENDER_ENCRYPTED_AMOUNT, sender_encrypted_amount)
                .blob(xrpl::DESTINATION_ENCRYPTED_AMOUNT, destination_encrypted_amount)
                .blob(xrpl::ISSUER_ENCRYPTED_AMOUNT, issuer_encrypted_amount)
                .blob(xrpl::AMOUNT_COMMITMENT, amount_commitment)
                .blob(xrpl::BALANCE_COMMITMENT, balance_commitment)
                .blob(xrpl::ZK_PROOF, proof);
            if let Some(ct) = auditor_encrypted_amount {
                b = b.blob(xrpl::AUDITOR_ENCRYPTED_AMOUNT, ct);
            }
        }
        (TxType::Convert, WireFields::Convert {
            holder_encryption_key,
            holder_encrypted_amount,
            issuer_encrypted_amount,
            auditor_encrypted_amount,
            blinding_factor,
            proof,
        }) => {
            b = b
                .u64(xrpl::MPT_AMOUNT, tx.amount)
                .blob(xrpl::HOLDER_ENCRYPTED_AMOUNT, holder_encrypted_amount)
                .blob(xrpl::ISSUER_ENCRYPTED_AMOUNT, issuer_encrypted_amount)
                .hash(xrpl::BLINDING_FACTOR, blinding_factor);
            // The two travel together or not at all.
            match (holder_encryption_key, proof) {
                (Some(k), Some(p)) => {
                    b = b.blob(xrpl::HOLDER_ENCRYPTION_KEY, k).blob(xrpl::ZK_PROOF, p);
                }
                (None, None) => {}
                _ => {
                    return Err(XrplError::Field(
                        "a Convert must carry HolderEncryptionKey and ZKProof together or \
                         neither; the spec forbids one without the other"
                            .into(),
                    ))
                }
            }
            if let Some(ct) = auditor_encrypted_amount {
                b = b.blob(xrpl::AUDITOR_ENCRYPTED_AMOUNT, ct);
            }
        }
        (TxType::ConvertBack, WireFields::ConvertBack {
            holder_encrypted_amount,
            issuer_encrypted_amount,
            auditor_encrypted_amount,
            blinding_factor,
            balance_commitment,
            proof,
        }) => {
            // Field order does not matter here — `TxBuilder::serialize` sorts
            // canonically by (type code, field code) — but the SET does, and
            // it is §10.3's, not §7.2's.
            b = b
                .u64(xrpl::MPT_AMOUNT, tx.amount)
                .blob(xrpl::HOLDER_ENCRYPTED_AMOUNT, holder_encrypted_amount)
                .blob(xrpl::ISSUER_ENCRYPTED_AMOUNT, issuer_encrypted_amount)
                .hash(xrpl::BLINDING_FACTOR, blinding_factor)
                .blob(xrpl::BALANCE_COMMITMENT, balance_commitment)
                .blob(xrpl::ZK_PROOF, proof);
            if let Some(ct) = auditor_encrypted_amount {
                b = b.blob(xrpl::AUDITOR_ENCRYPTED_AMOUNT, ct);
            }
        }
        (t, _) => {
            return Err(XrplError::Field(format!(
                "{} was given wire fields of a different shape",
                t.as_str()
            )))
        }
    }
    Ok(b)
}

/// What the confirmation knows about the amount.
///
/// There is no variant that carries a number supplied by a caller. That is the
/// point.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AmountView {
    /// Nothing has been recovered yet. Rendering this says so.
    Unrecovered,
    /// Decrypted from a ciphertext **in this transaction**, with the holder's
    /// own key.
    Decrypted(u64),
    /// On the wire in the clear — `MPTAmount`, for Convert and ConvertBack.
    Public(u64),
    /// The bounded search did not find it. **Never a guess.**
    NotRecovered { searched_to: u64 },
}

/// A transaction recovered from bytes. **The only thing the confirmation sees.**
///
/// There is exactly one way to obtain one of these, and it is [`Self::parse`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedTransaction {
    pub tx_type: TxType,
    pub account: String,
    pub destination: Option<String>,
    pub issuance_id: String,
    pub sequence: u32,
    pub fee_drops: u64,
    pub last_ledger_sequence: u32,
    /// `None` when the transaction carries no `NetworkID`, which is the
    /// **correct and required** state on Devnet. The confirmation says so
    /// rather than substituting a number from signer state — a number that did
    /// not come out of these bytes has no business on that screen.
    pub network_id: Option<u32>,
    pub amount: AmountView,
    /// `SenderEncryptedAmount` for a Send, `HolderEncryptedAmount` for a
    /// Convert. The ciphertext the amount is recovered from.
    pub own_ciphertext: [u8; 66],
    /// `C₁` shared by every encrypted amount in this transaction. For a
    /// correctly built transaction it is `r·G`.
    pub c1: [u8; 33],
    /// Present on Convert and ConvertBack: `r`, published in the clear.
    pub published_blinding_factor: Option<[u8; 32]>,
    /// Whether this transaction carries an `AuditorEncryptedAmount`.
    ///
    /// **The confirmation says so out loud.** A third party who can decrypt
    /// every amount is not something a holder should have to infer from the
    /// issuance's configuration — and a comment in a test claimed the
    /// confirmation already did this when it did not (`REVIEW-015` round two).
    pub has_auditor: bool,
    /// The `HolderEncryptionKey` this transaction **registers**, when it does.
    ///
    /// ⚠ **Added at step 6, and it is the most irreversible field the
    /// confirmation ever renders.** Registration happens exactly once — a
    /// second attempt is `tecDUPLICATE` — the key can never be rotated
    /// (`CLAIMS.md` P-10), and every confidential amount this account ever
    /// holds is encrypted to it. A Convert that carries this is not the same
    /// transaction as a Convert that does not, and until 2026-08-20 the
    /// confirmation showed them identically.
    pub registers_encryption_key: Option<[u8; 33]>,
    pub proof_len: usize,
}

impl ParsedTransaction {
    /// Fields a transaction of each type is allowed to carry.
    ///
    /// **Anything outside this set is a parse error, not a shrug.** The doc
    /// comment on `parse` claimed that from the start and the code did not do
    /// it — it queried the fields it wanted and ignored the rest, so a
    /// `DestinationTag`, or a `MPTAmount` on a Send, rode along unrendered and
    /// unconfirmed. Found by both `REVIEW-015` legs.
    fn permitted_fields(t: TxType) -> Vec<xrpl::FieldDef> {
        let mut v = vec![
            xrpl::TRANSACTION_TYPE,
            xrpl::ACCOUNT,
            xrpl::MPT_ISSUANCE_ID,
            xrpl::SEQUENCE,
            xrpl::FLAGS,
            xrpl::LAST_LEDGER_SEQUENCE,
            xrpl::FEE,
            xrpl::ZK_PROOF,
            xrpl::SIGNING_PUB_KEY,
            xrpl::TXN_SIGNATURE,
        ];
        match t {
            TxType::Send => v.extend_from_slice(&[
                xrpl::DESTINATION,
                xrpl::SENDER_ENCRYPTED_AMOUNT,
                xrpl::DESTINATION_ENCRYPTED_AMOUNT,
                xrpl::ISSUER_ENCRYPTED_AMOUNT,
                xrpl::AUDITOR_ENCRYPTED_AMOUNT,
                xrpl::AMOUNT_COMMITMENT,
                xrpl::BALANCE_COMMITMENT,
            ]),
            TxType::Convert => v.extend_from_slice(&[
                xrpl::MPT_AMOUNT,
                xrpl::HOLDER_ENCRYPTION_KEY,
                xrpl::HOLDER_ENCRYPTED_AMOUNT,
                xrpl::ISSUER_ENCRYPTED_AMOUNT,
                xrpl::AUDITOR_ENCRYPTED_AMOUNT,
                xrpl::BLINDING_FACTOR,
            ]),
            // ⚠ **XLS-0096 §10.3, read at source.** This list used to be
            // Convert's, shared, and every one of the three differences was a
            // defect: `HolderEncryptionKey` is **not a ConvertBack field** and
            // is absent below, `BalanceCommitment` is **required** and was
            // missing, and the `ZKProof` in the common list above is required
            // here rather than optional — which `parse` enforces separately,
            // because an allowlist says what *may* appear and not what must.
            TxType::ConvertBack => v.extend_from_slice(&[
                xrpl::MPT_AMOUNT,
                xrpl::HOLDER_ENCRYPTED_AMOUNT,
                xrpl::ISSUER_ENCRYPTED_AMOUNT,
                xrpl::AUDITOR_ENCRYPTED_AMOUNT,
                xrpl::BLINDING_FACTOR,
                xrpl::BALANCE_COMMITMENT,
            ]),
        }
        v
    }

    /// Parse **canonical XRPL bytes**.
    ///
    /// Refuses a transaction carrying a field that is not part of **that
    /// transaction type's field set**, rather than ignoring it: an unshown
    /// field is an unconfirmed field.
    ///
    /// ⚠ **`ConvertBack` was refused outright until 2026-08-24, and the reason
    /// it was refused is the reason it is now decoded from §10.3 rather than
    /// from Convert's arm.** `REVIEW-015` round three found it inheriting
    /// Convert's field set, which the specification contradicts in three
    /// places; refusing by name was the honest stop while nothing had ever
    /// been exercised against a real one. Architecture §6 step 7 needs the
    /// facility's exit, so the field table was read at source and implemented,
    /// and `tests/convert_back.rs` is what fails if the three differences are
    /// ever collapsed back together.
    pub fn parse(bytes: &[u8]) -> Result<ParsedTransaction, String> {
        let d = xrpl::decode(bytes).map_err(|e| e.to_string())?;
        let tx_type = d
            .u16(xrpl::TRANSACTION_TYPE)
            .and_then(TxType::from_wire_code)
            .ok_or("missing or unrecognised TransactionType")?;

        // **Devnet only**, and networks at or below the threshold must omit
        // `NetworkID`. Checked BEFORE the allowlist so the specific message
        // fires rather than a generic "field not permitted" — a review leg
        // pointed out the block below the loop was unreachable.
        if let Some(n) = d.u32(xrpl::NETWORK_ID) {
            return Err(format!(
                "the transaction carries NetworkID {n}; networks at or below {} must omit it, \
                 and this signer is Devnet-only",
                xrpl::NETWORK_ID_OMIT_AT_OR_BELOW
            ));
        }

        // Before any field is read for display.
        let permitted: Vec<(u16, u16)> = Self::permitted_fields(tx_type)
            .iter()
            .map(|f| (xrpl::type_code_of(f.kind), f.nth))
            .collect();
        for key in d.keys() {
            if !permitted.contains(&key) {
                return Err(format!(
                    "the transaction carries field (type {}, code {}), which a {} may not carry. \
                     A field the confirmation does not render is a field the holder does not \
                     approve",
                    key.0,
                    key.1,
                    tx_type.as_str()
                ));
            }
        }


        let account = xrpl::encode_address(
            &d.account(xrpl::ACCOUNT).ok_or("missing Account")?,
        );
        let destination = d.account(xrpl::DESTINATION).map(|a| xrpl::encode_address(&a));
        if destination.is_some() != tx_type.has_destination() {
            return Err("destination presence does not match transaction type".into());
        }

        let issuance = d.get(xrpl::MPT_ISSUANCE_ID).ok_or("missing MPTokenIssuanceID")?;
        let sequence = d.u32(xrpl::SEQUENCE).ok_or("missing Sequence")?;
        let network_id = d.u32(xrpl::NETWORK_ID);
        let fee_drops = d.drops(xrpl::FEE).ok_or("missing Fee")?;
        let last_ledger_sequence =
            d.u32(xrpl::LAST_LEDGER_SEQUENCE).ok_or("missing LastLedgerSequence")?;
        // **Three types, three different rules about `ZKProof`, and merging
        // any two of them is how a valid transaction gets rejected.**
        //
        // * A **Send** always carries one (§8.2).
        // * A **Convert** carries one *exactly when* it registers a
        //   `HolderEncryptionKey` — §7.2 makes each required by the other and
        //   §7.3.1 items 2 and 3 are `temMALFORMED` for either alone.
        // * A **ConvertBack** always carries one and can never carry a
        //   `HolderEncryptionKey` at all (§10.3). The allowlist already refuses
        //   the key; this is what refuses a **missing** proof, which an
        //   allowlist cannot express.
        let proof_len = match (tx_type, d.get(xrpl::ZK_PROOF), d.get(xrpl::HOLDER_ENCRYPTION_KEY)) {
            (TxType::Send, Some(p), _) => p.len(),
            (TxType::Send, None, _) => return Err("a Send must carry a ZKProof".into()),
            (TxType::ConvertBack, Some(p), _) => p.len(),
            (TxType::ConvertBack, None, _) => {
                return Err("a ConvertBack must carry a ZKProof; XLS-0096 §10.3 makes it \
                            required, and it is the proof that the remaining balance is \
                            non-negative"
                    .into())
            }
            (TxType::Convert, Some(p), Some(_)) => p.len(),
            (TxType::Convert, None, None) => 0,
            (TxType::Convert, Some(_), None) => {
                return Err("a ConfidentialMPTConvert carries a ZKProof without a \
                            HolderEncryptionKey; the spec forbids one without the other"
                    .into())
            }
            (TxType::Convert, None, Some(_)) => {
                return Err(
                    "a ConfidentialMPTConvert registers a HolderEncryptionKey with no ZKProof"
                        .into(),
                )
            }
        };

        // ⚠ **§10.3's REQUIRED fields, at their FIXED sizes — and an allowlist
        // cannot express either.**
        //
        // The allowlist says what a transaction *may* carry. It says nothing
        // about what it *must*, and nothing about length. `REVIEW-021`'s Codex
        // leg found this: a ConvertBack with no `MPTAmount`, no
        // `BlindingFactor`, no `BalanceCommitment`, or a `ZKProof` of any
        // length at all reached the confirmation screen.
        //
        // ⚠ ~~**The typed builder cannot currently produce one.**~~ **FALSE, and
        // struck 2026-08-25.** `WireFields::ConvertBack` is `pub` and carries
        // `proof: Vec<u8>`; [`builder`] is `pub` and serialises that vector
        // without checking its length. A caller holding a valid
        // `BuiltTransaction` can put a 40-byte proof through the typed API. What
        // is true is narrower: **the `session`/`prover` path** cannot, because
        // `prepare_convert_back` checks for 816 bytes.
        //
        // ⚠ **The false sentence mis-rated the severity of the very defect it
        // was excusing**, and it was written to explain a fix — which is the
        // category a second review round exists for. `REVIEW-021` round two,
        // `CLAIMS.md` E-144.
        //
        // The reason the check belongs here is unchanged and does not depend on
        // that claim: the whole point of parsing back is that the confirmation
        // trusts the *bytes* rather than the construction, so a check that
        // relies on the construction being right defeats the boundary it is part
        // of. `CLAIMS.md` E-138.
        if tx_type == TxType::ConvertBack {
            if d.u64(xrpl::MPT_AMOUNT).is_none() {
                return Err("a ConvertBack must carry MPTAmount; §10.3 makes it required and \
                            it is the public amount credited to the holder's balance"
                    .into());
            }
            match d.get(xrpl::BLINDING_FACTOR) {
                None => {
                    return Err("a ConvertBack must carry BlindingFactor; §10.3 makes it \
                                required, and validators use it to check the ciphertexts \
                                against the plaintext MPTAmount"
                        .into())
                }
                Some(b) if b.len() != mpt_sizes::BLINDING_FACTOR => {
                    return Err(format!(
                        "BlindingFactor is {} bytes; §10.3 fixes it at {}",
                        b.len(),
                        mpt_sizes::BLINDING_FACTOR
                    ))
                }
                Some(_) => {}
            }
            match d.get(xrpl::BALANCE_COMMITMENT) {
                None => {
                    return Err("a ConvertBack must carry BalanceCommitment; §10.3 makes it \
                                required, and it is the commitment the remainder range proof \
                                is taken over"
                        .into())
                }
                Some(b) if b.len() != mpt_sizes::PEDERSEN_COMMIT => {
                    return Err(format!(
                        "BalanceCommitment is {} bytes; §10.3 fixes it at {}",
                        b.len(),
                        mpt_sizes::PEDERSEN_COMMIT
                    ))
                }
                Some(_) => {}
            }
            if proof_len != mpt_sizes::CONVERT_BACK_PROOF {
                return Err(format!(
                    "a ConvertBack's ZKProof is {proof_len} bytes; §10.3 fixes it at {} — a \
                     compact sigma proof of 128 and a single Bulletproof of 688",
                    mpt_sizes::CONVERT_BACK_PROOF
                ));
            }
        }

        let (own, others): (&[u8], Vec<&[u8]>) = match tx_type {
            TxType::Send => (
                d.get(xrpl::SENDER_ENCRYPTED_AMOUNT).ok_or("missing SenderEncryptedAmount")?,
                {
                    let mut v = vec![
                        d.get(xrpl::DESTINATION_ENCRYPTED_AMOUNT)
                            .ok_or("missing DestinationEncryptedAmount")?,
                        d.get(xrpl::ISSUER_ENCRYPTED_AMOUNT)
                            .ok_or("missing IssuerEncryptedAmount")?,
                    ];
                    // Optional by protocol, but if it is there it is part of
                    // the same ciphertext set and must share the same C1.
                    if let Some(a) = d.get(xrpl::AUDITOR_ENCRYPTED_AMOUNT) {
                        v.push(a);
                    }
                    v
                },
            ),
            TxType::Convert | TxType::ConvertBack => (
                d.get(xrpl::HOLDER_ENCRYPTED_AMOUNT).ok_or("missing HolderEncryptedAmount")?,
                {
                    let mut v = vec![d
                        .get(xrpl::ISSUER_ENCRYPTED_AMOUNT)
                        .ok_or("missing IssuerEncryptedAmount")?];
                    // A Convert may carry one too, and when it does it is part
                    // of the same ciphertext set. A review leg thought the fix
                    // was to forbid it here; XLS-0096 §7.2 requires it.
                    if let Some(a) = d.get(xrpl::AUDITOR_ENCRYPTED_AMOUNT) {
                        v.push(a);
                    }
                    v
                },
            ),
        };
        let own_ciphertext: [u8; 66] =
            own.try_into().map_err(|_| "an encrypted amount is not 66 bytes")?;
        let mut c1 = [0u8; 33];
        c1.copy_from_slice(&own_ciphertext[..33]);

        // REVIEW-010 §7's *shared C1* rule, re-checked on the bytes rather than
        // on the values the prover was handed. The prover already refused a
        // mismatch; this catches one introduced after that point.
        for other in others {
            if other.len() != 66 {
                return Err("an encrypted amount is not 66 bytes".into());
            }
            if other[..33] != c1 {
                return Err(
                    "the encrypted amounts in this transaction do not share one C1; \
                     a repeated or mismatched C1 is what lets an observer recover \
                     the difference between two hidden amounts"
                        .into(),
                );
            }
        }

        let published_blinding_factor = match d.get(xrpl::BLINDING_FACTOR) {
            Some(b) => Some(b.try_into().map_err(|_| "BlindingFactor is not 32 bytes")?),
            None => None,
        };

        // **Only the types that actually publish an amount may report one.**
        // A Send carrying `MPTAmount` is refused above; but even so, deriving
        // the view from the *transaction type* rather than from field presence
        // means a Send can never render a plaintext number, which is the whole
        // property. `REVIEW-015b` found the field-presence version and named
        // the failure exactly: the confirmation would render `1 (PUBLIC)` for a
        // ciphertext encrypting 9999.
        let amount = match tx_type {
            TxType::Send => AmountView::Unrecovered,
            TxType::Convert | TxType::ConvertBack => match d.u64(xrpl::MPT_AMOUNT) {
                Some(v) => AmountView::Public(v),
                None => AmountView::Unrecovered,
            },
        };

        Ok(ParsedTransaction {
            tx_type,
            account,
            destination,
            issuance_id: xrpl::hex(issuance),
            sequence,
            network_id,
            fee_drops,
            last_ledger_sequence,
            amount,
            own_ciphertext,
            c1,
            published_blinding_factor,
            has_auditor: d.get(xrpl::AUDITOR_ENCRYPTED_AMOUNT).is_some(),
            registers_encryption_key: match d.get(xrpl::HOLDER_ENCRYPTION_KEY) {
                Some(k) => {
                    Some(k.try_into().map_err(|_| "HolderEncryptionKey is not 33 bytes")?)
                }
                None => None,
            },
            proof_len,
        })
    }

    /// Recover the amount **from this transaction's own ciphertext**, with the
    /// holder's ElGamal secret.
    ///
    /// This is what makes the confirmation honest under a scheme whose whole
    /// point is that the amount is not on the wire. The holder is shown what
    /// the bytes encrypt, not what anybody said they encrypt.
    ///
    /// ⚠ The search is a **bounded discrete log** and costs a fixed number of
    /// iterations over `[0, search_to]` regardless of the answer — upstream's
    /// mitigation for the `RIPCTXR-1` timing channel. Keep `search_to` small
    /// enough that a human is not left waiting.
    pub fn recover_amount(&mut self, sk: &[u8; 32], search_to: u64) {
        // A Send's amount is never public, whatever the field set says.
        if self.tx_type != TxType::Send && matches!(self.amount, AmountView::Public(_)) {
            return;
        }
        self.amount = match crate::prover::decrypt(&self.own_ciphertext, sk, 0, search_to) {
            Ok(v) => AmountView::Decrypted(v),
            Err(_) => AmountView::NotRecovered { searched_to: search_to },
        };
    }
}
