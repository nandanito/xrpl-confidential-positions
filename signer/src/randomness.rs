//! The ruled derivation of `r` and `ρ`.
//!
//! **Source of truth: `docs/reviews/REVIEW-010-RULING-r-and-rho-2026-08-18.md`,
//! Deliverable A.** This file is an implementation of that prose and must not
//! be treated as the specification. Where the two disagree, the ruling wins and
//! this file is the defect.
//!
//! Written from the ruling's prose rather than from the TypeScript reference,
//! then checked against that reference's published vectors — which is the point
//! of having vectors at all. `tests/r_and_rho_kat.rs`.
//!
//! # Why this construction and not something simpler
//!
//! **E-63, executed:** a passive full-ledger observer holding no keys recovered
//! the difference between two confidential amounts when `r` was reused across
//! two Sends. `C₁ = r·G` repeats on chain and is visible; subtracting the two
//! `C₂` values annihilates the shared `r·pk` term, leaving `(m − m′)·G`, and a
//! bounded discrete-log search returns the difference. **Both bad Sends were
//! accepted by the ledger.** There is no ledger-side defence.
//!
//! # Entropy failure aborts. It does not degrade.
//!
//! REVIEW-010c §2c: for `r` and `ρ`, entropy **is** the source rather than a
//! hedge over a secret-derived core, and `r` is *published on chain* in
//! `BlindingFactor`. Synthesising a published blinding value from a long-lived
//! key is forbidden, so a dead entropy source means **refuse to sign**. That is
//! the opposite of the sigma-nonce rule and both are correct.

use crate::scalar::{reduce_wide, Scalar, ZeroScalar};
use hmac::{Hmac, Mac};
use sha2::Sha512;

type HmacSha512 = Hmac<Sha512>;

const LABEL: &[u8] = b"WCONF-RANDOM-SCALAR-v1";
const SALT: &[u8] = b"WCONF-RANDOM-SCALAR-v1/HKDF-Extract-salt";
const EXPAND: &[u8] = b"WCONF-RANDOM-SCALAR-v1/HKDF-Expand";

/// Which scalar is being derived. The role string is part of the `INFO`, so
/// `r` and `ρ` for one transaction are independent.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    /// The ElGamal encryption randomness. **Published on chain** for Convert
    /// and ConvertBack, in `BlindingFactor`.
    ElgamalR,
    /// The Pedersen balance blinding.
    BalanceRho,
}

impl Role {
    fn as_bytes(&self) -> &'static [u8] {
        match self {
            Role::ElgamalR => b"elgamal-r",
            Role::BalanceRho => b"balance-rho",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TxKind {
    Convert,
    Send,
    ConvertBack,
}

impl TxKind {
    fn as_bytes(&self) -> &'static [u8] {
        match self {
            TxKind::Convert => b"ConfidentialMPTConvert",
            TxKind::Send => b"ConfidentialMPTSend",
            TxKind::ConvertBack => b"ConfidentialMPTConvertBack",
        }
    }
}

/// Every input the ruling requires, at its exact length.
///
/// The lengths are in the **types**, so a caller cannot pass a short context or
/// a 32-byte entropy buffer. The ruling's *"missing context is a caller error
/// and must abort"* is enforced by there being no way to express it: unlike the
/// sigma-nonce patch there is no NULL-context case here.
pub struct Inputs<'a> {
    pub tx_kind: TxKind,
    /// XRPL AccountID of the signing account.
    pub account_id: &'a [u8; 20],
    pub mpt_issuance_id: &'a [u8; 24],
    /// The same `TransactionContextID` passed to mpt-crypto proof generation.
    ///
    /// ⚠ REVIEW-005c's lesson: context drift is fatal. If the signer computes
    /// this differently from the value it hands the prover, this KDF will
    /// faithfully bind to the wrong one.
    pub tx_context_id: &'a [u8; 32],
    /// **64 bytes from the OS CSPRNG, drawn once per signing ATTEMPT** — not
    /// per transaction. A retry draws fresh entropy, which is why a retry
    /// cannot collide with an orphaned reservation (amendment A2).
    pub entropy64: &'a [u8; 64],
}

#[derive(Debug, PartialEq, Eq)]
pub enum DeriveError {
    /// The reduction produced zero. **Abort the attempt. Do not retry.**
    ZeroScalar,
}

impl From<ZeroScalar> for DeriveError {
    fn from(_: ZeroScalar) -> Self {
        DeriveError::ZeroScalar
    }
}

fn u32be(v: usize) -> [u8; 4] {
    (v as u32).to_be_bytes()
}

/// `PRK = HMAC-SHA512(key = SALT, msg = IKM)`.
fn extract(inputs: &Inputs<'_>) -> [u8; 64] {
    let tx_type = inputs.tx_kind.as_bytes();
    let mut mac = HmacSha512::new_from_slice(SALT).expect("HMAC accepts any key length");
    mac.update(LABEL);
    mac.update(&u32be(tx_type.len()));
    mac.update(tx_type);
    mac.update(&u32be(20));
    mac.update(inputs.account_id);
    mac.update(&u32be(24));
    mac.update(inputs.mpt_issuance_id);
    mac.update(&u32be(32));
    mac.update(inputs.tx_context_id);
    mac.update(&u32be(64));
    mac.update(inputs.entropy64);
    mac.finalize().into_bytes().into()
}

/// `OKM64 = HMAC-SHA512(key = PRK, msg = INFO ‖ 0x01)`.
fn expand(prk: &[u8; 64], tx_kind: TxKind, role: Role) -> [u8; 64] {
    let tx_type = tx_kind.as_bytes();
    let role_b = role.as_bytes();
    let mut mac = HmacSha512::new_from_slice(prk).expect("HMAC accepts any key length");
    mac.update(EXPAND);
    mac.update(&u32be(tx_type.len()));
    mac.update(tx_type);
    mac.update(&u32be(role_b.len()));
    mac.update(role_b);
    mac.update(&[0x01]);
    mac.finalize().into_bytes().into()
}

/// Derive one scalar.
pub fn derive(inputs: &Inputs<'_>, role: Role) -> Result<Scalar, DeriveError> {
    let prk = extract(inputs);
    let okm = expand(&prk, inputs.tx_kind, role);
    Ok(reduce_wide(&okm)?)
}

/// Derive both scalars for one signing attempt, sharing the extract step.
///
/// ⚠ **B-25 gave `Scalar` a destructor, and this is the one function where that
/// changed control flow rather than only storage — so it is argued here rather
/// than left to be rediscovered.** If `rho`'s reduction returns `ZeroScalar`,
/// the already-bound `r` is now **dropped and wiped** on the way out of the `?`;
/// before B-25 it was `Copy` with no `Drop` and nothing ran. `REVIEW-033a`
/// graded that a data-dependent timing difference and `REVIEW-033c` **rejected
/// it**, with `REVIEW-033b` reaching the same conclusion independently:
///
/// * the branch is `reduce_wide`'s zero case, which architecture §4 **already
///   rules** as a permitted secret-dependent branch;
/// * its outcome is **externally visible** — the signer refuses to sign and
///   reports `EntropyUnavailable` — so ⚠ **a timing difference on a path that
///   announces itself is not a channel**;
/// * `scalar.rs`'s constant-time claim is scoped to `reduce_wide_mod`'s control
///   flow, where no `Scalar` exists and nothing was added.
///
/// ⚠ **The wipe is the correct behaviour, not a cost.** `r` is a live secret
/// that used to be abandoned on this path. `CLAIMS.md` B-26.
pub fn derive_pair(inputs: &Inputs<'_>) -> Result<(Scalar, Scalar), DeriveError> {
    let prk = extract(inputs);
    let r = reduce_wide(&expand(&prk, inputs.tx_kind, Role::ElgamalR))?;
    let rho = reduce_wide(&expand(&prk, inputs.tx_kind, Role::BalanceRho))?;
    Ok((r, rho))
}
