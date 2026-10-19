//! The safe boundary over the vendored prover — architecture §6 step 3.
//!
//! Everything `unsafe` stops here. [`crate::mpt`] declares the C surface; this
//! module wraps each entry point in a sized Rust type, checks every return
//! code, and is the only module the rest of the signer calls.
//!
//! # Where the randomness comes from, and where it does not
//!
//! **`r` and `ρ` are arguments to this module, never drawn inside it.** They
//! come from [`crate::randomness`], which implements REVIEW-010's ruled
//! derivation from fresh entropy bound to the transaction context. The
//! library's own `mpt_generate_blinding_factor` is deliberately not bound
//! (see [`crate::mpt`]).
//!
//! # What is thrown away, and what that means
//!
//! [`ElGamalKeypair::generate`] calls `mpt_generate_keypair`, the library's own
//! CSPRNG path. ~~**That is step 3's explicit instruction and it is not the
//! ruled keygen** — REVIEW-012's derivation is architecture §6 step 6 and still
//! owes issues #10 and #11.~~ **Half struck 2026-08-20: step 6 is built.**
//!
//! It is still not the ruled derivation, and it is now the **named** source
//! [`crate::onboarding::KeySource::Standalone`] rather than an unlabelled
//! default — an independent secret with its own backup, which is the honest
//! option for a holder whose master key has been retired, and **a second thing
//! to lose**. The ruled derivation is [`crate::keygen`].
//!
//! ⚠ **Issue #10 is still open**: the derivation is specified in one repository
//! document and is not a published standard. Every account this project holds is
//! a Devnet throwaway and nothing in this file should ever hold value.

use crate::mpt;
use crate::scalar::Scalar;
use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum ProverError {
    /// The library returned a failure code. Carries the entry point, because
    /// upstream's codes do not say which of several proofs failed
    /// (`UPSTREAM-FEEDBACK.md`).
    Failed { call: &'static str, rc: i32 },
    /// A length the library requires was not met by a caller in this crate.
    Length { what: &'static str, want: usize, got: usize },
    /// §7's pre-sign consistency rule refused. **Not retryable.**
    Inconsistent(String),
}

impl fmt::Display for ProverError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProverError::Failed { call, rc } => write!(f, "{call} returned {rc}"),
            ProverError::Length { what, want, got } => {
                write!(f, "{what}: expected {want} bytes, got {got}")
            }
            ProverError::Inconsistent(d) => write!(f, "pre-sign consistency check failed: {d}"),
        }
    }
}

type R<T> = Result<T, ProverError>;

fn ok(rc: core::ffi::c_int, call: &'static str) -> R<()> {
    if rc == 0 {
        Ok(())
    } else {
        Err(ProverError::Failed { call, rc: rc as i32 })
    }
}

/// An ElGamal keypair.
///
/// Two sources reach this type: [`Self::generate`], the library's CSPRNG, which
/// is [`crate::onboarding::KeySource::Standalone`]; and
/// [`crate::keygen::DerivedKey::into_keypair`], the ruled derivation. Both go
/// through [`Self::try_from_parts`], which recomputes `sk·G`.
///
/// ⚠ **Not the ruled keygen.** See the module note.
pub struct ElGamalKeypair {
    sk: [u8; 32],
    pk: [u8; 33],
}

/// A declared ElGamal keypair whose halves do not correspond.
#[derive(Debug, PartialEq, Eq)]
pub struct KeypairMismatch {
    pub reason: String,
}

impl fmt::Display for KeypairMismatch {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.reason)
    }
}

/// The secret is overwritten when the keypair goes out of scope.
///
/// Same claim and same limits as [`crate::keygen::Zeroizing`]: it covers the
/// bytes this value owns and nothing else, and it does nothing against an
/// adversary with code execution, who reads the key while it is live.
impl Drop for ElGamalKeypair {
    fn drop(&mut self) {
        for b in self.sk.iter_mut() {
            // SAFETY: `b` is a live, aligned `u8` this value owns.
            unsafe { std::ptr::write_volatile(b, 0) };
        }
        std::sync::atomic::compiler_fence(std::sync::atomic::Ordering::SeqCst);
    }
}

impl fmt::Debug for ElGamalKeypair {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ElGamalKeypair")
            .field("pk", &hex(&self.pk))
            .field("sk", &"<redacted>")
            .finish()
    }
}

impl ElGamalKeypair {
    pub fn generate() -> R<ElGamalKeypair> {
        let mut sk = [0u8; 32];
        let mut pk = [0u8; 33];
        let rc = unsafe { mpt::mpt_generate_keypair(sk.as_mut_ptr(), pk.as_mut_ptr()) };
        ok(rc, "mpt_generate_keypair")?;
        Ok(ElGamalKeypair { sk, pk })
    }

    /// Build a keypair from parts, **checking that they correspond**.
    ///
    /// ⚠ **This used to be `from_parts`, which checked nothing**, and the
    /// failure mode it allowed is the worst one available in this protocol: a
    /// profile whose `elgamal_pk` is not `elgamal_sk·G` makes the holder
    /// register a key nobody holds the secret for, and then encrypt their
    /// entire balance to it. There is no rotation and no recovery
    /// (`CLAIMS.md` P-10), so that balance is gone permanently — and every
    /// step of it succeeds, because rippled verifies the proof against the key
    /// on the ledger and the ledger's key is the wrong one.
    ///
    /// The check is one scalar multiplication, once, at load.
    pub fn try_from_parts(sk: [u8; 32], pk: [u8; 33]) -> Result<ElGamalKeypair, KeypairMismatch> {
        use k256::elliptic_curve::sec1::ToEncodedPoint;
        let secret = k256::SecretKey::from_slice(&sk).map_err(|_| KeypairMismatch {
            reason: "the ElGamal secret is not a valid secp256k1 scalar in [1, n−1]".into(),
        })?;
        let computed = secret.public_key().to_encoded_point(true);
        if computed.as_bytes() != pk {
            return Err(KeypairMismatch {
                reason: format!(
                    "the ElGamal public key is not sk·G. Declared {}, computed {}",
                    hex(&pk),
                    hex(computed.as_bytes())
                ),
            });
        }
        Ok(ElGamalKeypair { sk, pk })
    }

    pub fn public(&self) -> &[u8; 33] {
        &self.pk
    }

    /// The secret. Callers pass it straight into the prover and drop it.
    pub fn secret(&self) -> &[u8; 32] {
        &self.sk
    }
}

// ---------------------------------------------------------------------------
// Context hashes — the bytes every proof is bound to
// ---------------------------------------------------------------------------

/// ⚠ **REVIEW-005c's lesson, and REVIEW-010 Deliverable D's last item:** if the
/// signer computes a context differently from the value it hands the prover,
/// every downstream construction faithfully binds to the wrong one. There is
/// exactly one computation of each context in this crate, and it is here.
pub fn convert_context_hash(account: &[u8; 20], issuance: &[u8; 24], sequence: u32) -> R<[u8; 32]> {
    let mut out = [0u8; 32];
    let rc = unsafe {
        mpt::mpt_get_convert_context_hash(
            mpt::account_id { bytes: *account },
            mpt::mpt_issuance_id { bytes: *issuance },
            sequence,
            out.as_mut_ptr(),
        )
    };
    ok(rc, "mpt_get_convert_context_hash")?;
    Ok(out)
}

pub fn convert_back_context_hash(
    account: &[u8; 20],
    issuance: &[u8; 24],
    sequence: u32,
    version: u32,
) -> R<[u8; 32]> {
    let mut out = [0u8; 32];
    let rc = unsafe {
        mpt::mpt_get_convert_back_context_hash(
            mpt::account_id { bytes: *account },
            mpt::mpt_issuance_id { bytes: *issuance },
            sequence,
            version,
            out.as_mut_ptr(),
        )
    };
    ok(rc, "mpt_get_convert_back_context_hash")?;
    Ok(out)
}

pub fn send_context_hash(
    account: &[u8; 20],
    issuance: &[u8; 24],
    sequence: u32,
    destination: &[u8; 20],
    version: u32,
) -> R<[u8; 32]> {
    let mut out = [0u8; 32];
    let rc = unsafe {
        mpt::mpt_get_send_context_hash(
            mpt::account_id { bytes: *account },
            mpt::mpt_issuance_id { bytes: *issuance },
            sequence,
            mpt::account_id { bytes: *destination },
            version,
            out.as_mut_ptr(),
        )
    };
    ok(rc, "mpt_get_send_context_hash")?;
    Ok(out)
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/// ElGamal-encrypt `amount` to `pubkey` under the **ruled** blinding scalar.
pub fn encrypt(amount: u64, pubkey: &[u8; 33], r: &Scalar) -> R<[u8; 66]> {
    let mut out = [0u8; 66];
    let rc = unsafe {
        mpt::mpt_encrypt_amount(amount, pubkey.as_ptr(), r.as_bytes().as_ptr(), out.as_mut_ptr())
    };
    ok(rc, "mpt_encrypt_amount")?;
    Ok(out)
}

/// Decrypt with a bounded discrete-log search.
///
/// ⚠ The search is **linear in `high - low`** and runs a fixed iteration count
/// regardless of the answer. Upstream's header estimates the cost; **that
/// figure is not repeated here** — `CLAIMS.md` P-8 forbids a benchmark number
/// without hardware, parameter set and methodology, and it is not a number this
/// project measured.
///
/// It is also the timing side channel Trail of Bits recorded as `RIPCTXR-1`. Do
/// not call it on a path whose latency an untrusted party can observe.
pub fn decrypt(ciphertext: &[u8; 66], sk: &[u8; 32], low: u64, high: u64) -> R<u64> {
    let mut amount: u64 = 0;
    let rc = unsafe {
        mpt::mpt_decrypt_amount(ciphertext.as_ptr(), sk.as_ptr(), &mut amount, low, high)
    };
    ok(rc, "mpt_decrypt_amount")?;
    Ok(amount)
}

/// `PC = amount·G + blinding·H`.
pub fn pedersen_commitment(amount: u64, blinding: &Scalar) -> R<[u8; 33]> {
    let mut out = [0u8; 33];
    let rc = unsafe {
        mpt::mpt_get_pedersen_commitment(amount, blinding.as_bytes().as_ptr(), out.as_mut_ptr())
    };
    ok(rc, "mpt_get_pedersen_commitment")?;
    Ok(out)
}

/// The canonical `EncZero` for one holder's position.
///
/// ⚠ `CLAIMS.md` **F-1**: this value is computable by anyone from three public
/// inputs, so a balance equal to it is **publicly known to be exactly zero**.
/// It is here because the observer harness needs it, not because it hides
/// anything.
pub fn canonical_encrypted_zero(
    pubkey: &[u8; 33],
    account: &[u8; 20],
    issuance: &[u8; 24],
) -> R<[u8; 66]> {
    unsafe {
        let ctx = mpt::mpt_secp256k1_context();
        let mut pk = mpt::secp256k1_pubkey::default();
        if mpt::secp256k1_ec_pubkey_parse(ctx, &mut pk, pubkey.as_ptr(), 33) != 1 {
            return Err(ProverError::Failed { call: "secp256k1_ec_pubkey_parse", rc: 0 });
        }
        let mut c1 = mpt::secp256k1_pubkey::default();
        let mut c2 = mpt::secp256k1_pubkey::default();
        if mpt::generate_canonical_encrypted_zero(
            ctx,
            &mut c1,
            &mut c2,
            &pk,
            account.as_ptr(),
            issuance.as_ptr(),
        ) != 1
        {
            return Err(ProverError::Failed { call: "generate_canonical_encrypted_zero", rc: 0 });
        }
        let mut out = [0u8; 66];
        if !mpt::mpt_serialize_ec_pair(&c1, &c2, out.as_mut_ptr()) {
            return Err(ProverError::Failed { call: "mpt_serialize_ec_pair", rc: 0 });
        }
        Ok(out)
    }
}

/// The **patched** wide reduction, called through the FFI.
///
/// Its only caller is `tests/prover_ffi.rs`, which checks it against
/// [`crate::scalar::reduce_wide`] — a second implementation of the same rule,
/// written in Rust from REVIEW-010's prose. Two implementations agreeing is
/// evidence; one agreeing with itself is not.
///
/// It is also the link-time discriminator: this symbol does not exist in
/// upstream `85dbac7`, so a build pointed at the pristine control library fails
/// to link rather than silently using upstream's biased 32-byte reduction.
pub fn reduce_wide_via_c(input: &[u8; 64]) -> [u8; 32] {
    let mut out = [0u8; 32];
    unsafe { mpt::secp256k1_mpt_scalar_reduce64(out.as_mut_ptr(), input.as_ptr()) };
    out
}

// ---------------------------------------------------------------------------
// Proofs
// ---------------------------------------------------------------------------

/// Schnorr proof of key possession for `ConfidentialMPTConvert`.
pub fn convert_proof(pubkey: &[u8; 33], privkey: &[u8; 32], context: &[u8; 32]) -> R<[u8; 64]> {
    let mut out = [0u8; 64];
    let rc = unsafe {
        mpt::mpt_get_convert_proof(
            pubkey.as_ptr(),
            privkey.as_ptr(),
            context.as_ptr(),
            out.as_mut_ptr(),
        )
    };
    ok(rc, "mpt_get_convert_proof")?;
    Ok(out)
}

pub fn verify_convert_proof(proof: &[u8; 64], pubkey: &[u8; 33], context: &[u8; 32]) -> bool {
    unsafe { mpt::mpt_verify_convert_proof(proof.as_ptr(), pubkey.as_ptr(), context.as_ptr()) == 0 }
}

/// The library's own check that a set of ciphertexts encrypts one revealed
/// amount under one blinding factor — upstream's non-ZKP validation, and the
/// `test_elgamal_verify` half of what `CLAUDE.md` requires a new keypair be
/// validated against.
///
/// ⚠ **Necessary and not sufficient**, which is the whole point of saying so.
/// It establishes that a keypair is well-formed and interoperates; a constant
/// `sk_A = 1` passes it. `tests/keygen_interop.rs` runs that control.
pub fn verify_revealed_amount(
    amount: u64,
    blinding: &Scalar,
    holder: &Participant,
    issuer: &Participant,
    auditor: Option<&Participant>,
) -> bool {
    let h = c_participant(holder);
    let i = c_participant(issuer);
    let a = auditor.map(c_participant);
    unsafe {
        mpt::mpt_verify_revealed_amount(
            amount,
            blinding.as_bytes().as_ptr(),
            &h,
            &i,
            a.as_ref().map_or(std::ptr::null(), |p| p as *const _),
        ) == 0
    }
}

fn c_participant(p: &Participant) -> mpt::mpt_confidential_participant {
    let mut c = mpt::mpt_confidential_participant::default();
    c.pubkey = p.pubkey;
    c.ciphertext = p.ciphertext;
    c
}

/// One recipient of a Send's encrypted amount: sender, destination, issuer, and
/// optionally an auditor.
#[derive(Clone, Copy)]
pub struct Participant {
    pub pubkey: [u8; 33],
    pub ciphertext: [u8; 66],
}

impl Participant {
    /// `C₁`, the first point of the ElGamal pair. **Public on chain**, and equal
    /// to `r·G` for a correctly formed ciphertext.
    pub fn c1(&self) -> [u8; 33] {
        let mut c = [0u8; 33];
        c.copy_from_slice(&self.ciphertext[..33]);
        c
    }
}

/// The sender's balance witness: `(pc_b, balance, b1‖b2, ρ)`.
pub struct BalanceWitness<'a> {
    pub commitment: [u8; 33],
    pub balance: u64,
    pub ciphertext: [u8; 66],
    pub rho: &'a Scalar,
}

/// Generate the 946-byte `ConfidentialMPTSend` proof.
///
/// **§7's pre-sign detection rule runs first**, in [`assert_shared_c1`]: every
/// participant ciphertext must carry the same `C₁`, and that `C₁` must be
/// `r·G` for the `r` this signer derived. A caller that got either wrong is
/// refused rather than proved for.
#[allow(clippy::too_many_arguments)]
pub fn send_proof(
    sk: &[u8; 32],
    pk: &[u8; 33],
    amount: u64,
    participants: &[Participant],
    r: &Scalar,
    context: &[u8; 32],
    amount_commitment: &[u8; 33],
    balance: &BalanceWitness<'_>,
) -> R<Vec<u8>> {
    if participants.len() < 3 || participants.len() > 4 {
        return Err(ProverError::Length {
            what: "participants (sender, destination, issuer, optional auditor)",
            want: 3,
            got: participants.len(),
        });
    }
    assert_shared_c1(participants, r)?;

    let mut c_parts = [mpt::mpt_confidential_participant::default(); 4];
    for (i, p) in participants.iter().enumerate() {
        c_parts[i].pubkey = p.pubkey;
        c_parts[i].ciphertext = p.ciphertext;
    }

    let bp = mpt::mpt_pedersen_proof_params {
        pedersen_commitment: balance.commitment,
        amount: balance.balance,
        ciphertext: balance.ciphertext,
        blinding_factor: *balance.rho.as_bytes(),
    };

    let mut out = vec![0u8; mpt::sizes::SEND_PROOF];
    let mut len = out.len();
    let rc = unsafe {
        mpt::mpt_get_confidential_send_proof(
            sk.as_ptr(),
            pk.as_ptr(),
            amount,
            c_parts.as_ptr(),
            participants.len(),
            r.as_bytes().as_ptr(),
            context.as_ptr(),
            amount_commitment.as_ptr(),
            &bp,
            out.as_mut_ptr(),
            &mut len,
        )
    };
    ok(rc, "mpt_get_confidential_send_proof")?;
    if len != mpt::sizes::SEND_PROOF {
        return Err(ProverError::Length {
            what: "send proof",
            want: mpt::sizes::SEND_PROOF,
            got: len,
        });
    }
    out.truncate(len);
    Ok(out)
}

/// Verify a Send proof with the **linked** library.
///
/// ⚠ This is our own patched library verifying our own prover, which
/// establishes internal consistency and nothing about the ledger. The claim
/// that matters is made by `tests/prover_pristine.rs`, which puts the proof in
/// front of the **pristine upstream** verifier built from `85dbac7` — the
/// falsifier architecture §6 step 3 names.
pub fn verify_send_proof(
    proof: &[u8],
    participants: &[Participant],
    sender_balance: &[u8; 66],
    amount_commitment: &[u8; 33],
    balance_commitment: &[u8; 33],
    context: &[u8; 32],
) -> bool {
    if proof.len() != mpt::sizes::SEND_PROOF || participants.is_empty() || participants.len() > 4 {
        return false;
    }
    let mut c_parts = [mpt::mpt_confidential_participant::default(); 4];
    for (i, p) in participants.iter().enumerate() {
        c_parts[i].pubkey = p.pubkey;
        c_parts[i].ciphertext = p.ciphertext;
    }
    unsafe {
        mpt::mpt_verify_send_proof(
            proof.as_ptr(),
            c_parts.as_ptr(),
            participants.len() as u8,
            sender_balance.as_ptr(),
            amount_commitment.as_ptr(),
            balance_commitment.as_ptr(),
            context.as_ptr(),
        ) == 0
    }
}

/// Generate the 816-byte `ConfidentialMPTConvertBack` proof.
///
/// ⚠ **The witness is the BALANCE, not the amount** — `(b, ρ, sk_A)`, in that
/// order, which is what `vendor-verify.sh` asserts by checking that
/// `proof_compact_convertback.c` passes `sk_offset=64` while every other
/// compact proof passes `0`. `amount` is the **public** `m` being withdrawn,
/// and the single Bulletproof is a range proof over the *remainder* `b − m`
/// under the same `ρ`, because `pc_rem = pc_b − m·G` keeps `pc_b`'s blinding.
///
/// The library refuses `m > b` itself; [`prepare_convert_back`] refuses it
/// first, with a message that says which number was bigger.
pub fn convert_back_proof(
    sk: &[u8; 32],
    pk: &[u8; 33],
    context: &[u8; 32],
    amount: u64,
    balance: &BalanceWitness<'_>,
) -> R<Vec<u8>> {
    let params = mpt::mpt_pedersen_proof_params {
        pedersen_commitment: balance.commitment,
        amount: balance.balance,
        ciphertext: balance.ciphertext,
        blinding_factor: *balance.rho.as_bytes(),
    };
    let mut out = vec![0u8; mpt::sizes::CONVERT_BACK_PROOF];
    let rc = unsafe {
        mpt::mpt_get_convert_back_proof(
            sk.as_ptr(),
            pk.as_ptr(),
            context.as_ptr(),
            amount,
            &params,
            out.as_mut_ptr(),
        )
    };
    ok(rc, "mpt_get_convert_back_proof")?;
    Ok(out)
}

/// Verify a ConvertBack proof with the **linked** library.
///
/// ⚠ Same limit as [`verify_send_proof`]: this is our own patched library
/// verifying our own prover, which establishes internal consistency and nothing
/// about the ledger. `tests/prover_pristine.rs` is what puts it in front of the
/// **pristine upstream** verifier.
pub fn verify_convert_back_proof(
    proof: &[u8],
    pk: &[u8; 33],
    balance_ciphertext: &[u8; 66],
    balance_commitment: &[u8; 33],
    amount: u64,
    context: &[u8; 32],
) -> bool {
    if proof.len() != mpt::sizes::CONVERT_BACK_PROOF {
        return false;
    }
    unsafe {
        mpt::mpt_verify_convert_back_proof(
            proof.as_ptr(),
            pk.as_ptr(),
            balance_ciphertext.as_ptr(),
            balance_commitment.as_ptr(),
            amount,
            context.as_ptr(),
        ) == 0
    }
}

/// REVIEW-010 §7's pre-sign rule for Send, in one place.
///
/// > *"the signer must additionally verify before signing that every
/// > encrypted-amount field it is about to sign has the same `C1 == r_commit`,
/// > and that the equality occurs only within that one transaction."*
///
/// The second half — *only within that one transaction* — is
/// [`crate::store`]'s job and cannot be checked here; the first half is.
///
/// E-63 is why: a passive observer recovered the difference between two hidden
/// amounts from a repeated `C₁`, and rippled accepted both transactions.
pub fn assert_shared_c1(participants: &[Participant], r: &Scalar) -> R<()> {
    let expect = crate::store::compressed_r_g(r);
    for (i, p) in participants.iter().enumerate() {
        if p.c1() != expect {
            return Err(ProverError::Inconsistent(format!(
                "participant {i}'s ciphertext carries C1 = {}, but the derived r gives r·G = {}. \
                 Every encrypted amount in one Send must share the C1 this signer derived",
                hex(&p.c1()),
                hex(&expect)
            )));
        }
    }
    Ok(())
}

/// REVIEW-010 §7's pre-sign rule for Convert and ConvertBack.
///
/// > *"the signer must verify before signing that the transaction's
/// > `BlindingFactor` field is exactly `scalar32(r)`."*
///
/// `BlindingFactor` is **published on chain**, which is the whole reason `r`
/// may not be derived from a long-lived secret.
pub fn assert_published_blinding_factor(field: &[u8; 32], r: &Scalar) -> R<()> {
    if field != r.as_bytes() {
        return Err(ProverError::Inconsistent(format!(
            "the BlindingFactor field is {}, but this signer derived r = {}. \
             Convert and ConvertBack publish r on chain and it must be the derived value",
            hex(field),
            hex(r.as_bytes())
        )));
    }
    Ok(())
}

pub fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02X}")).collect()
}

// ---------------------------------------------------------------------------
// Assembling a Send
// ---------------------------------------------------------------------------

/// Everything a `ConfidentialMPTSend` proof needs that is **not** randomness.
///
/// The ruled scalars are separate arguments to [`prepare_send`] so that no
/// caller can supply them inside this struct and no field name here can be
/// mistaken for one. Architecture §3 item 5.
pub struct SendInputs<'a> {
    pub sk: &'a [u8; 32],
    pub pk: &'a [u8; 33],
    pub amount: u64,
    /// The sender's current confidential spending balance, in the clear. The
    /// signer knows it because it just decrypted it with `sk_A`.
    pub balance: u64,
    /// The on-ledger `ConfidentialBalanceSpending` ciphertext, `b1‖b2`.
    pub balance_ciphertext: [u8; 66],
    pub destination_pk: [u8; 33],
    /// **Not optional and no configuration removes it** (`CLAIMS.md` P-9). The
    /// issuer can decrypt every holder's amount.
    pub issuer_pk: [u8; 33],
    /// Present when the issuance carries an `AuditorEncryptionKey`. A third
    /// party who can also decrypt every amount.
    pub auditor_pk: Option<[u8; 33]>,
    pub context: [u8; 32],
}

/// The fields a `ConfidentialMPTSend` carries, all derived here.
pub struct SendMaterial {
    pub sender_ciphertext: [u8; 66],
    pub destination_ciphertext: [u8; 66],
    pub issuer_ciphertext: [u8; 66],
    pub auditor_ciphertext: Option<[u8; 66]>,
    pub amount_commitment: [u8; 33],
    pub balance_commitment: [u8; 33],
    pub proof: Vec<u8>,
}

impl SendMaterial {
    pub fn participants(&self, inputs: &SendInputs<'_>) -> Vec<Participant> {
        let mut v = vec![
            Participant { pubkey: *inputs.pk, ciphertext: self.sender_ciphertext },
            Participant { pubkey: inputs.destination_pk, ciphertext: self.destination_ciphertext },
            Participant { pubkey: inputs.issuer_pk, ciphertext: self.issuer_ciphertext },
        ];
        if let (Some(pk), Some(ct)) = (inputs.auditor_pk, self.auditor_ciphertext) {
            v.push(Participant { pubkey: pk, ciphertext: ct });
        }
        v
    }
}

/// Encrypt to every participant under one `r`, commit, and prove.
///
/// `pc_m` is committed with **`r`, not an independent scalar** — the compact
/// sigma proof binds `PC_m` to the ciphertext randomness, and upstream's header
/// says so explicitly. Drawing a separate scalar here produces a proof that
/// fails verification, loudly, which is the good failure.
pub fn prepare_send(inputs: &SendInputs<'_>, r: &Scalar, rho: &Scalar) -> R<SendMaterial> {
    let sender_ciphertext = encrypt(inputs.amount, inputs.pk, r)?;
    let destination_ciphertext = encrypt(inputs.amount, &inputs.destination_pk, r)?;
    let issuer_ciphertext = encrypt(inputs.amount, &inputs.issuer_pk, r)?;
    let auditor_ciphertext = match inputs.auditor_pk {
        Some(pk) => Some(encrypt(inputs.amount, &pk, r)?),
        None => None,
    };

    let amount_commitment = pedersen_commitment(inputs.amount, r)?;
    let balance_commitment = pedersen_commitment(inputs.balance, rho)?;

    let material = SendMaterial {
        sender_ciphertext,
        destination_ciphertext,
        issuer_ciphertext,
        auditor_ciphertext,
        amount_commitment,
        balance_commitment,
        proof: Vec::new(),
    };
    let participants = material.participants(inputs);

    let balance_witness = BalanceWitness {
        commitment: balance_commitment,
        balance: inputs.balance,
        ciphertext: inputs.balance_ciphertext,
        rho,
    };

    let proof = send_proof(
        inputs.sk,
        inputs.pk,
        inputs.amount,
        &participants,
        r,
        &inputs.context,
        &amount_commitment,
        &balance_witness,
    )?;

    Ok(SendMaterial { proof, ..material })
}

// ---------------------------------------------------------------------------
// Assembling a ConvertBack
// ---------------------------------------------------------------------------

/// Everything a `ConfidentialMPTConvertBack` proof needs that is **not**
/// randomness. Same rule as [`SendInputs`]: the ruled scalars are separate
/// arguments so no caller can smuggle one in through this struct.
///
/// ⚠ **There is no destination and there never is one.** A ConvertBack moves
/// the holder's own confidential balance into their own public balance; the
/// counterparty is the ledger's own supply accounting.
pub struct ConvertBackInputs<'a> {
    pub sk: &'a [u8; 32],
    pub pk: &'a [u8; 33],
    /// `m` — the **public** amount, in the clear in `MPTAmount`.
    pub amount: u64,
    /// `b` — the confidential spending balance, decrypted with `sk_A`.
    pub balance: u64,
    /// The on-ledger `ConfidentialBalanceSpending` ciphertext, `b1‖b2`.
    ///
    /// ⚠ **Its randomness is not ours and is not the witness.** The proof links
    /// it to `pc_b` through `sk_A` — `b2 − b·G = sk_A·b1` — which is the same
    /// fact ADR-0001 §(a) rests on, and is why the historical blinding of a
    /// balance never has to be kept.
    pub balance_ciphertext: [u8; 66],
    /// **Not optional and no configuration removes it** (`CLAIMS.md` P-9).
    pub issuer_pk: [u8; 33],
    /// Present when the issuance carries an `AuditorEncryptionKey`. XLS-0096
    /// §10.4.2 item 4 makes the matching ciphertext **required** then, exactly
    /// as §7.3.2 does for a Convert.
    pub auditor_pk: Option<[u8; 33]>,
    pub context: [u8; 32],
}

/// The fields a `ConfidentialMPTConvertBack` carries, all derived here.
pub struct ConvertBackMaterial {
    pub holder_ciphertext: [u8; 66],
    pub issuer_ciphertext: [u8; 66],
    pub auditor_ciphertext: Option<[u8; 66]>,
    pub balance_commitment: [u8; 33],
    /// `r`, published in the clear in `BlindingFactor`.
    pub blinding_factor: [u8; 32],
    pub proof: Vec<u8>,
}

impl ConvertBackMaterial {
    /// The ciphertext set, as participants, so [`assert_shared_c1`] can be run
    /// over it. There is no `n_participants` argument to a ConvertBack proof —
    /// the library takes one balance witness — so this is **not** what upstream
    /// consumes. It is the §7 pre-sign check, and it is the reason a
    /// ConvertBack gets the same treatment a Send does.
    pub fn participants(&self, inputs: &ConvertBackInputs<'_>) -> Vec<Participant> {
        let mut v = vec![
            Participant { pubkey: *inputs.pk, ciphertext: self.holder_ciphertext },
            Participant { pubkey: inputs.issuer_pk, ciphertext: self.issuer_ciphertext },
        ];
        if let (Some(pk), Some(ct)) = (inputs.auditor_pk, self.auditor_ciphertext) {
            v.push(Participant { pubkey: pk, ciphertext: ct });
        }
        v
    }
}

/// Encrypt the public amount to every party under one `r`, commit to the
/// balance under `ρ`, and prove.
///
/// The two scalars do different jobs and it matters which is which:
///
/// * **`r`** encrypts `m` to the holder, the issuer and any auditor, and is
///   **published on chain** in `BlindingFactor` so validators can recheck that
///   the ciphertexts encrypt the plaintext `MPTAmount` (§10.4.2 item 6). That
///   is why REVIEW-010 forbids deriving it from any long-lived secret.
/// * **`ρ`** blinds `pc_b`, the commitment to the balance, and stays secret.
pub fn prepare_convert_back(
    inputs: &ConvertBackInputs<'_>,
    r: &Scalar,
    rho: &Scalar,
) -> R<ConvertBackMaterial> {
    // The library returns a bare -1 for this, which would reach the holder as
    // "mpt_get_convert_back_proof returned -1". Refuse it here, where the two
    // numbers are still in hand. `UPSTREAM-FEEDBACK.md` is where the underlying
    // observation lives.
    if inputs.amount > inputs.balance {
        return Err(ProverError::Inconsistent(format!(
            "a ConvertBack of {} exceeds the confidential balance {}; the range proof is over \
             the remainder and there is no non-negative remainder to prove",
            inputs.amount, inputs.balance
        )));
    }

    let holder_ciphertext = encrypt(inputs.amount, inputs.pk, r)?;
    let issuer_ciphertext = encrypt(inputs.amount, &inputs.issuer_pk, r)?;
    let auditor_ciphertext = match inputs.auditor_pk {
        Some(pk) => Some(encrypt(inputs.amount, &pk, r)?),
        None => None,
    };
    let balance_commitment = pedersen_commitment(inputs.balance, rho)?;

    let material = ConvertBackMaterial {
        holder_ciphertext,
        issuer_ciphertext,
        auditor_ciphertext,
        balance_commitment,
        blinding_factor: *r.as_bytes(),
        proof: Vec::new(),
    };

    // §7's pre-sign rules, both of them, before a proof exists. A ConvertBack
    // publishes `r` **and** carries a ciphertext set, so both apply — the
    // Convert path only ever had the second.
    assert_shared_c1(&material.participants(inputs), r)?;
    assert_published_blinding_factor(&material.blinding_factor, r)?;

    let witness = BalanceWitness {
        commitment: balance_commitment,
        balance: inputs.balance,
        ciphertext: inputs.balance_ciphertext,
        rho,
    };
    let proof =
        convert_back_proof(inputs.sk, inputs.pk, &inputs.context, inputs.amount, &witness)?;
    if proof.len() != mpt::sizes::CONVERT_BACK_PROOF {
        return Err(ProverError::Length {
            what: "convert-back proof",
            want: mpt::sizes::CONVERT_BACK_PROOF,
            got: proof.len(),
        });
    }

    Ok(ConvertBackMaterial { proof, ..material })
}
