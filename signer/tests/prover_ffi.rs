//! The FFI boundary itself — architecture §6 step 3.
//!
//! These tests do not check that a proof is *correct*; `prover_pristine.rs`
//! does that, against the pristine upstream verifier. These check the things
//! that are silently wrong when they are wrong:
//!
//! * the C struct layouts this crate declares match the vendored header's,
//! * the library actually linked is the **patched** one,
//! * the context hashes a Rust caller computes match the ones a C caller
//!   computes for the same inputs.
//!
//! The third matters because `account_id` and `mpt_issuance_id` are passed
//! **by value** across the boundary. If Rust and C disagreed about how a
//! 20-byte aggregate is passed, both the prover and our own verifier would use
//! the same wrong hash and agree with each other perfectly.

use std::process::Command;
use wconf_signer::mpt;
use wconf_signer::prover;
use wconf_signer::scalar::reduce_wide;

fn tool() -> String {
    std::env::var("WCONF_MPTOOL").unwrap_or_else(|_| "/tmp/wconf/mptool-patched".into())
}

fn mptool(args: &[&str]) -> Vec<String> {
    let out = Command::new(tool())
        .args(args)
        .output()
        .unwrap_or_else(|e| panic!("cannot run {}: {e}. Run tools/spike-2026-08-18/build.sh", tool()));
    assert!(
        out.status.success(),
        "mptool {args:?} failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    String::from_utf8_lossy(&out.stdout).trim().lines().map(|s| s.to_string()).collect()
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/// Compile a C probe against the **vendored header** and compare its
/// `sizeof`/`offsetof` against Rust's.
///
/// Hand-written expected numbers would be exactly the fabricated-constant
/// failure this project has already committed once. The C compiler is the
/// independent tool here.
#[test]
fn the_c_struct_layouts_match_the_vendored_header() {
    let src = std::env::var("WCONF_MPT_SRC").unwrap_or_else(|_| "/tmp/wconf/mpt-crypto".into());
    let secp = std::env::var("WCONF_SECP256K1").unwrap_or_else(|_| "/tmp/wconf/secp256k1".into());
    let dir = std::env::temp_dir().join("wconf-layout-probe");
    std::fs::create_dir_all(&dir).unwrap();
    let c = dir.join("probe.c");
    std::fs::write(
        &c,
        r#"
#include <stddef.h>
#include <stdio.h>
#include <utility/mpt_utility.h>
int main(void) {
  printf("participant_size %zu\n", sizeof(mpt_confidential_participant));
  printf("participant_pubkey %zu\n", offsetof(mpt_confidential_participant, pubkey));
  printf("participant_ciphertext %zu\n", offsetof(mpt_confidential_participant, ciphertext));
  printf("params_size %zu\n", sizeof(mpt_pedersen_proof_params));
  printf("params_commitment %zu\n", offsetof(mpt_pedersen_proof_params, pedersen_commitment));
  printf("params_amount %zu\n", offsetof(mpt_pedersen_proof_params, amount));
  printf("params_ciphertext %zu\n", offsetof(mpt_pedersen_proof_params, ciphertext));
  printf("params_blinding %zu\n", offsetof(mpt_pedersen_proof_params, blinding_factor));
  printf("account_size %zu\n", sizeof(account_id));
  printf("issuance_size %zu\n", sizeof(mpt_issuance_id));
  return 0;
}
"#,
    )
    .unwrap();
    let bin = dir.join("probe");
    let st = Command::new("clang")
        .args([
            "-I",
            &format!("{src}/include"),
            "-I",
            &format!("{secp}/include"),
            c.to_str().unwrap(),
            "-o",
            bin.to_str().unwrap(),
        ])
        .status()
        .expect("clang is a prerequisite of the vendored build");
    assert!(st.success(), "the layout probe did not compile");

    let out = Command::new(&bin).output().unwrap();
    let text = String::from_utf8_lossy(&out.stdout).to_string();
    let get = |k: &str| -> usize {
        text.lines()
            .find(|l| l.starts_with(&format!("{k} ")))
            .unwrap_or_else(|| panic!("probe did not print {k}"))
            .split_whitespace()
            .nth(1)
            .unwrap()
            .parse()
            .unwrap()
    };

    use std::mem::{align_of, size_of};
    assert_eq!(get("participant_size"), size_of::<mpt::mpt_confidential_participant>());
    assert_eq!(get("params_size"), size_of::<mpt::mpt_pedersen_proof_params>());
    assert_eq!(get("account_size"), size_of::<mpt::account_id>());
    assert_eq!(get("issuance_size"), size_of::<mpt::mpt_issuance_id>());

    // offsetof, computed the same way on the Rust side.
    let p = mpt::mpt_confidential_participant::default();
    let base = &p as *const _ as usize;
    assert_eq!(get("participant_pubkey"), (&p.pubkey as *const _ as usize) - base);
    assert_eq!(get("participant_ciphertext"), (&p.ciphertext as *const _ as usize) - base);

    let q = mpt::mpt_pedersen_proof_params::default();
    let base = &q as *const _ as usize;
    assert_eq!(get("params_commitment"), (&q.pedersen_commitment as *const _ as usize) - base);
    assert_eq!(get("params_amount"), (&q.amount as *const _ as usize) - base);
    assert_eq!(get("params_ciphertext"), (&q.ciphertext as *const _ as usize) - base);
    assert_eq!(get("params_blinding"), (&q.blinding_factor as *const _ as usize) - base);

    // The uint64_t is what forces the interior padding; if this ever became 1
    // the struct would be packed and the offsets above would be meaningless.
    assert_eq!(align_of::<mpt::mpt_pedersen_proof_params>(), 8);
}

// ---------------------------------------------------------------------------
// Which library did we link?
// ---------------------------------------------------------------------------

/// `secp256k1_mpt_scalar_reduce64` exists only in the **patched** tree, so this
/// test linking at all is the discriminator. What it then asserts is that the
/// C reduction and [`wconf_signer::scalar::reduce_wide`] — written in Rust from
/// REVIEW-010's prose — agree.
#[test]
fn the_patched_wide_reduction_agrees_with_the_rust_one() {
    // Deterministic inputs, including the two that matter: a value below n and
    // a value above it. Nothing here is a recalled constant; both sides are
    // computed.
    let mut cases: Vec<[u8; 64]> = vec![[0x00; 64], [0xFF; 64], [0x01; 64]];
    let mut v = [0u8; 64];
    for (i, b) in v.iter_mut().enumerate() {
        *b = (i as u8).wrapping_mul(7).wrapping_add(3);
    }
    cases.push(v);
    // A wide value whose low 256 bits are exactly n: the reduction must not
    // return zero-padded garbage for it.
    let mut n_wide = [0u8; 64];
    n_wide[32..].copy_from_slice(&[
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFE, 0xBA, 0xAE, 0xDC, 0xE6, 0xAF, 0x48, 0xA0, 0x3B, 0xBF, 0xD2, 0x5E, 0x8C, 0xD0, 0x36,
        0x41, 0x41,
    ]);
    cases.push(n_wide);

    for (i, case) in cases.iter().enumerate() {
        let c = prover::reduce_wide_via_c(case);
        match reduce_wide(case) {
            Ok(rust) => assert_eq!(
                &c,
                rust.as_bytes(),
                "case {i}: the patched C reduction and the Rust one disagree"
            ),
            Err(_) => assert_eq!(c, [0u8; 32], "case {i}: Rust said zero, C did not"),
        }
    }
}

// ---------------------------------------------------------------------------
// Passing structs by value
// ---------------------------------------------------------------------------

/// The context hash a Rust caller gets must equal the one a C caller gets.
///
/// `account_id` is a 20-byte aggregate passed by value. A Rust/C ABI
/// disagreement here would be invisible end-to-end, because our prover and our
/// verifier would both use the same wrong value.
#[test]
fn context_hashes_match_a_c_caller_for_the_same_inputs() {
    let acc: [u8; 20] = [
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
        0x10, 0x11, 0x12, 0x13, 0x14,
    ];
    let dest: [u8; 20] = [0xAA; 20];
    let iss: [u8; 24] = [
        0x00, 0x00, 0x00, 0x2A, 0xF1, 0xE2, 0xD3, 0xC4, 0xB5, 0xA6, 0x97, 0x88, 0x79, 0x6A, 0x5B,
        0x4C, 0x3D, 0x2E, 0x1F, 0x00, 0x11, 0x22, 0x33, 0x44,
    ];
    let acc_h = prover::hex(&acc);
    let dest_h = prover::hex(&dest);
    let iss_h = prover::hex(&iss);

    let rust = prover::convert_context_hash(&acc, &iss, 12345).unwrap();
    let c = &mptool(&["convert-ctx", &acc_h, &iss_h, "12345"])[0];
    assert_eq!(prover::hex(&rust), *c, "convert context hash differs between Rust and C callers");

    let rust = prover::send_context_hash(&acc, &iss, 777, &dest, 3).unwrap();
    let c = &mptool(&["send-ctx", &acc_h, &iss_h, "777", &dest_h, "3"])[0];
    assert_eq!(prover::hex(&rust), *c, "send context hash differs between Rust and C callers");
}

/// The canonical `EncZero` a Rust caller computes must equal a C caller's.
///
/// ⚠ `CLAIMS.md` F-1: this value is public and recomputable by anyone, so a
/// balance equal to it is publicly known to be exactly zero.
#[test]
fn canonical_encrypted_zero_matches_a_c_caller() {
    let kp = prover::ElGamalKeypair::generate().unwrap();
    let acc: [u8; 20] = [0x5A; 20];
    let iss: [u8; 24] = [0x7C; 24];
    let rust = prover::canonical_encrypted_zero(kp.public(), &acc, &iss).unwrap();
    let c = &mptool(&["enczero", &prover::hex(kp.public()), &prover::hex(&acc), &prover::hex(&iss)])[0];
    assert_eq!(prover::hex(&rust), *c);
}

/// Encryption under a scalar this crate derived must match a C caller given the
/// same scalar, and must decrypt back to the amount.
#[test]
fn encrypt_and_decrypt_round_trip_and_match_a_c_caller() {
    let kp = prover::ElGamalKeypair::generate().unwrap();
    let r = reduce_wide(&[0x42u8; 64]).unwrap();
    let ct = prover::encrypt(1234, kp.public(), &r).unwrap();
    let c = &mptool(&["encrypt", "1234", &prover::hex(kp.public()), &r.to_hex_upper()])[0];
    assert_eq!(prover::hex(&ct), *c);
    assert_eq!(prover::decrypt(&ct, kp.secret(), 0, 5000).unwrap(), 1234);
}
