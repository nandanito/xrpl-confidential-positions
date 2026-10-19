//! Raw FFI declarations for the **vendored, patched** mpt-crypto.
//!
//! Architecture §6 step 3; issue #2 path A. These declarations are written
//! against `include/secp256k1_mpt.h`, `include/mpt_protocol.h` and
//! `include/utility/mpt_utility.h` at `85dbac73d033241b73f0565ae7cce86d07005c70`
//! (tag `1.0.4`), whose SHA-256 digests `build.rs` pins. Change a declaration
//! here without changing the digest there and the build still passes and the
//! signer is wrong — so the digests are the thing that must move first.
//!
//! # Why not `mpt-crypto-sys`
//!
//! `0.1.0-beta.1` pins `0.3.0-rc2` and declares seven functions that no longer
//! exist at `1.0.4` (`CLAIMS.md` F-18, `UPSTREAM-FEEDBACK.md` U-36). Pointed at a
//! current library it fails loudly; left alone it silently links an old prover.
//! Neither is acceptable in a signer. `0.1.0`, published 2026-08-18, pins `1.0.4`
//! instead (`CLAIMS.md` E-299), and this reason has not been re-weighed.
//!
//! # What is deliberately NOT declared here
//!
//! **`mpt_generate_blinding_factor`.** It is upstream's source of `r` and `ρ`,
//! and REVIEW-010's ruling replaced it: the signer derives both from
//! [`crate::randomness`], from fresh entropy bound to the transaction context.
//! Binding it would put the superseded source one keystroke away, and E-76
//! already records that `tools/` still calls it. There is nothing to gain by
//! having it reachable from the signer.
//!
//! **Everything issuer-side.** `mpt_get_clawback_proof` and the clawback
//! context hash belong to the issuer, not the holder. The holder's signer has
//! no use for them and declaring them would suggest otherwise.
//!
//! # Safety
//!
//! Every function here is `unsafe` and every buffer length is fixed by the
//! header. [`crate::prover`] is the only module that calls them, wraps each in
//! a sized Rust type, and is the boundary at which the unsafety stops.

#![allow(non_camel_case_types)]

/// Opaque `secp256k1_context`.
#[repr(C)]
pub struct secp256k1_context {
    _private: [u8; 0],
}

/// `secp256k1_pubkey` — an opaque 64-byte internal representation. **Not** a
/// serialised point; use `mpt_serialize_ec_pair` or the library's own parse.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct secp256k1_pubkey {
    pub data: [u8; 64],
}

impl Default for secp256k1_pubkey {
    fn default() -> Self {
        secp256k1_pubkey { data: [0u8; 64] }
    }
}

/// `struct account_id { uint8_t bytes[20]; }` — passed **by value**.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct account_id {
    pub bytes: [u8; 20],
}

/// `struct mpt_issuance_id { uint8_t bytes[24]; }` — passed **by value**.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct mpt_issuance_id {
    pub bytes: [u8; 24],
}

/// `struct mpt_confidential_participant` — 33-byte compressed pubkey plus the
/// 66-byte ElGamal ciphertext addressed to it.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct mpt_confidential_participant {
    pub pubkey: [u8; 33],
    pub ciphertext: [u8; 66],
}

impl Default for mpt_confidential_participant {
    fn default() -> Self {
        mpt_confidential_participant { pubkey: [0u8; 33], ciphertext: [0u8; 66] }
    }
}

/// `struct mpt_pedersen_proof_params`.
///
/// ⚠ Field **order** matters and so does the `uint64_t`, which forces 8-byte
/// alignment and interior padding. `tests/prover_ffi.rs` compares this layout
/// against a C program compiled from the vendored header rather than asserting
/// numbers written by hand.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct mpt_pedersen_proof_params {
    pub pedersen_commitment: [u8; 33],
    pub amount: u64,
    pub ciphertext: [u8; 66],
    pub blinding_factor: [u8; 32],
}

impl Default for mpt_pedersen_proof_params {
    fn default() -> Self {
        mpt_pedersen_proof_params {
            pedersen_commitment: [0u8; 33],
            amount: 0,
            ciphertext: [0u8; 66],
            blinding_factor: [0u8; 32],
        }
    }
}

/// `kMPT_*` sizes from `mpt_protocol.h`.
pub mod sizes {
    pub const HALF_SHA: usize = 32;
    pub const PUBKEY: usize = 33;
    pub const PRIVKEY: usize = 32;
    pub const BLINDING_FACTOR: usize = 32;
    pub const ELGAMAL_TOTAL: usize = 66;
    pub const PEDERSEN_COMMIT: usize = 33;
    pub const SCHNORR_PROOF: usize = 64;
    pub const ACCOUNT_ID: usize = 20;
    pub const ISSUANCE_ID: usize = 24;
    /// 192-byte compact sigma proof + 754-byte aggregated Bulletproof.
    pub const SEND_PROOF: usize = 946;
    /// 128-byte compact sigma proof + 688-byte single Bulletproof.
    pub const CONVERT_BACK_PROOF: usize = 816;
    pub const POK_SK_PROOF: usize = 64;
}

extern "C" {
    // --- utility layer (mpt_utility.h) -----------------------------------
    pub fn mpt_secp256k1_context() -> *mut secp256k1_context;

    pub fn mpt_get_convert_context_hash(
        account: account_id,
        iss: mpt_issuance_id,
        sequence: u32,
        out_hash: *mut u8,
    ) -> core::ffi::c_int;

    pub fn mpt_get_convert_back_context_hash(
        acc: account_id,
        iss: mpt_issuance_id,
        seq: u32,
        ver: u32,
        out_hash: *mut u8,
    ) -> core::ffi::c_int;

    pub fn mpt_get_send_context_hash(
        acc: account_id,
        iss: mpt_issuance_id,
        seq: u32,
        dest: account_id,
        ver: u32,
        out_hash: *mut u8,
    ) -> core::ffi::c_int;

    pub fn mpt_generate_keypair(out_privkey: *mut u8, out_pubkey: *mut u8) -> core::ffi::c_int;

    pub fn mpt_encrypt_amount(
        amount: u64,
        pubkey: *const u8,
        blinding_factor: *const u8,
        out_ciphertext: *mut u8,
    ) -> core::ffi::c_int;

    pub fn mpt_decrypt_amount(
        ciphertext: *const u8,
        privkey: *const u8,
        out_amount: *mut u64,
        range_low: u64,
        range_high: u64,
    ) -> core::ffi::c_int;

    pub fn mpt_get_convert_proof(
        pubkey: *const u8,
        privkey: *const u8,
        ctx_hash: *const u8,
        out_proof: *mut u8,
    ) -> core::ffi::c_int;

    pub fn mpt_get_pedersen_commitment(
        amount: u64,
        blinding_factor: *const u8,
        out_commitment: *mut u8,
    ) -> core::ffi::c_int;

    pub fn mpt_get_confidential_send_proof(
        priv_: *const u8,
        pub_: *const u8,
        amount: u64,
        participants: *const mpt_confidential_participant,
        n_participants: usize,
        tx_blinding_factor: *const u8,
        context_hash: *const u8,
        amount_commitment: *const u8,
        balance_params: *const mpt_pedersen_proof_params,
        out_proof: *mut u8,
        out_len: *mut usize,
    ) -> core::ffi::c_int;

    pub fn mpt_get_convert_back_proof(
        priv_: *const u8,
        pub_: *const u8,
        context_hash: *const u8,
        amount: u64,
        params: *const mpt_pedersen_proof_params,
        out_proof: *mut u8,
    ) -> core::ffi::c_int;

    pub fn mpt_verify_convert_proof(
        proof: *const u8,
        pubkey: *const u8,
        context_hash: *const u8,
    ) -> core::ffi::c_int;

    /// ⚠ **The holder's own `ConfidentialBalanceSpending` ciphertext, not the
    /// transaction's `HolderEncryptedAmount`.** The proof links the balance
    /// ciphertext to `pc_b` through `sk_A`; the transaction's ciphertexts are
    /// checked separately, by `BlindingFactor` against the plaintext
    /// `MPTAmount` (XLS-0096 §10.4.2 item 6).
    pub fn mpt_verify_convert_back_proof(
        proof: *const u8,
        pubkey: *const u8,
        ciphertext: *const u8,
        balance_commitment: *const u8,
        amount: u64,
        context_hash: *const u8,
    ) -> core::ffi::c_int;

    pub fn mpt_verify_send_proof(
        proof: *const u8,
        participants: *const mpt_confidential_participant,
        n_participants: u8,
        sender_balance: *const u8,
        amount_commitment: *const u8,
        balance_commitment: *const u8,
        context_hash: *const u8,
    ) -> core::ffi::c_int;

    pub fn mpt_verify_revealed_amount(
        amount: u64,
        blinding_factor: *const u8,
        holder: *const mpt_confidential_participant,
        issuer: *const mpt_confidential_participant,
        auditor: *const mpt_confidential_participant,
    ) -> core::ffi::c_int;

    pub fn mpt_make_ec_pair(
        buffer: *const u8,
        out1: *mut secp256k1_pubkey,
        out2: *mut secp256k1_pubkey,
    ) -> bool;

    pub fn mpt_serialize_ec_pair(
        in1: *const secp256k1_pubkey,
        in2: *const secp256k1_pubkey,
        out: *mut u8,
    ) -> bool;

    // --- core layer (secp256k1_mpt.h) ------------------------------------
    pub fn generate_canonical_encrypted_zero(
        ctx: *const secp256k1_context,
        enc_zero_c1: *mut secp256k1_pubkey,
        enc_zero_c2: *mut secp256k1_pubkey,
        pubkey: *const secp256k1_pubkey,
        account_id: *const u8,
        mpt_issuance_id: *const u8,
    ) -> core::ffi::c_int;

    pub fn secp256k1_ec_pubkey_parse(
        ctx: *const secp256k1_context,
        pubkey: *mut secp256k1_pubkey,
        input: *const u8,
        inputlen: usize,
    ) -> core::ffi::c_int;

    /// **Registration proof of knowledge of `sk`.**
    ///
    /// ⚠ `context_id` may be NULL at the C level, and a NULL context emits an
    /// account-unbound, replayable proof (`CLAIMS.md` F-19). rippled cannot
    /// reach that path; this signer can, so [`crate::prover`] never exposes it.
    pub fn secp256k1_mpt_pok_sk_prove(
        ctx: *const secp256k1_context,
        proof: *mut u8,
        pk: *const secp256k1_pubkey,
        sk: *const u8,
        context_id: *const u8,
    ) -> core::ffi::c_int;

    /// The wide reduction the **W-CONF patch adds**. It does not exist upstream
    /// at `85dbac7`, which makes it the link-time discriminator: a signer
    /// accidentally pointed at the pristine control library fails to link
    /// rather than silently proving with upstream's biased 32-byte reduction.
    pub fn secp256k1_mpt_scalar_reduce64(out32: *mut u8, in64: *const u8);
}
