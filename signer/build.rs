//! Link the **vendored, patched** mpt-crypto into the signer — architecture
//! §6 step 3, issue #2 path A.
//!
//! # Why this file exists rather than a crate dependency
//!
//! `mpt-crypto-sys@0.1.0-beta.1` pins `MPT_CRYPTO_VERSION = "0.3.0-rc2"`, four
//! tag-generations behind the `0.4.0-rc4` in rippled 3.3.0, and its vendored
//! header declares seven functions that no longer exist at `1.0.4`
//! (`CLAIMS.md` F-18). Binding to it would silently link an old prover or fail
//! loudly against a current one. The signer therefore declares its own
//! `extern "C"` surface against the header of the commit it actually links.
//! That describes `0.1.0-beta.1`: `mpt-crypto-sys@0.1.0`, published 2026-08-18,
//! pins `1.0.4` (`CLAIMS.md` E-299), and this reason has not been re-weighed.
//!
//! # What this file checks, and why each check is here
//!
//! 1. **The headers are the pinned commit's.** Three SHA-256 digests, computed
//!    from `85dbac7`'s `include/` (which the W-CONF patch does not touch — the
//!    six patched files are all under `src/`). If upstream moves, or the tree
//!    is not the pinned one, the build stops with the two digests printed. This
//!    is F-18's failure mode caught at build time instead of at runtime.
//! 2. **The library is the PATCHED one.** `secp256k1_mpt_scalar_reduce64` is
//!    the wide reduction the W-CONF patch adds; it does not exist upstream.
//!    Linking the pristine control library therefore fails at link time rather
//!    than producing proofs with upstream's biased 32-byte reduction.
//!
//! Neither check replaces `tools/spike-2026-08-18/vendor-verify.sh`, which is
//! the authority on what differs from upstream. These are the two properties a
//! *build* can enforce.

use std::path::{Path, PathBuf};
use std::process::exit;

/// SHA-256 of the three public headers at `85dbac73d033241b73f0565ae7cce86d07005c70`.
///
/// Computed with `shasum -a 256` over the pristine tree extracted from the
/// pinned commit's git object store, and re-checked against the patched tree —
/// they are identical, because the patch touches only `src/`.
const PINNED_HEADERS: &[(&str, &str)] = &[
    (
        "include/secp256k1_mpt.h",
        "ee1a061db0bae3c1b9259aee21a989ff2a5df3e15f5267eb8f54ff6eba054a03",
    ),
    (
        "include/mpt_protocol.h",
        "341b4dd4c9ac01d45bcbce7d5de4c9354773eb83ee5caf6a54bc8065f92dadc5",
    ),
    (
        "include/utility/mpt_utility.h",
        "909a063bb3643ceef2ffdc988fc112a4b99d46e32223b865dd58302ffe413fc3",
    ),
];

const PIN: &str = "85dbac73d033241b73f0565ae7cce86d07005c70";

fn die(msg: &str) -> ! {
    eprintln!("\n─── signer/build.rs ───────────────────────────────────────────");
    eprintln!("{msg}");
    eprintln!("───────────────────────────────────────────────────────────────\n");
    exit(1)
}

fn env_path(key: &str, default: &str) -> PathBuf {
    println!("cargo:rerun-if-env-changed={key}");
    PathBuf::from(std::env::var(key).unwrap_or_else(|_| default.to_string()))
}

fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    let src = env_path("WCONF_MPT_SRC", "/tmp/wconf/mpt-crypto");
    let lib = env_path("WCONF_MPT_LIB", "/tmp/wconf/native");
    let secp = env_path("WCONF_SECP256K1", "/tmp/wconf/secp256k1");

    if !src.is_dir() || !lib.join("libmpt-crypto.a").is_file() {
        die(&format!(
            "the vendored prover is not built.\n\n\
             expected  {}  (patched checkout of XRPLF/mpt-crypto at {PIN})\n\
             expected  {}\n\n\
             build it with:\n\
             \x20   tools/spike-2026-08-18/vendor-verify.sh /tmp/wconf/mpt-crypto\n\
             \x20   tools/spike-2026-08-18/build.sh\n\n\
             Override the locations with WCONF_MPT_SRC, WCONF_MPT_LIB, WCONF_SECP256K1.\n\
             The prover is architecture §6 step 3 and the signer no longer builds without it.",
            src.display(),
            lib.join("libmpt-crypto.a").display(),
        ));
    }

    check_headers(&src);

    let secp_lib = secp.join("build/lib/libsecp256k1.a");
    if !secp_lib.is_file() {
        die(&format!(
            "missing built secp256k1 at {}\n\
             expected v0.7.1 at 1a53f4961f337b4d166c25fce72ef0dc88806618, built.",
            secp_lib.display()
        ));
    }

    println!("cargo:rustc-link-search=native={}", lib.display());
    println!("cargo:rustc-link-search=native={}", secp.join("build/lib").display());
    println!("cargo:rustc-link-lib=static=mpt-crypto");
    println!("cargo:rustc-link-lib=static=secp256k1");

    // mpt_utility.cpp is C++ and the library calls OpenSSL for HMAC and
    // RAND_bytes. Both are dynamic; neither is vendored.
    println!("cargo:rustc-link-lib=dylib=c++");
    let openssl = openssl_prefix();
    println!("cargo:rustc-link-search=native={}", openssl.join("lib").display());
    println!("cargo:rustc-link-lib=dylib=crypto");

    println!("cargo:rerun-if-changed={}", lib.join("libmpt-crypto.a").display());
}

fn check_headers(src: &Path) {
    for (rel, want) in PINNED_HEADERS {
        let p = src.join(rel);
        let bytes = match std::fs::read(&p) {
            Ok(b) => b,
            Err(e) => die(&format!("cannot read {}: {e}", p.display())),
        };
        let got = sha256_hex(&bytes);
        if got != *want {
            die(&format!(
                "{} is not the header this signer's FFI declarations were written against.\n\n\
                 expected  {want}\n\
                 got       {got}\n\n\
                 The pinned commit is {PIN} (tag 1.0.4). A different header means the\n\
                 `extern \"C\"` block in src/mpt.rs may no longer describe the library being\n\
                 linked — which is CLAIMS.md F-18's failure mode, and it is silent at runtime.\n\
                 Re-check the tree with tools/spike-2026-08-18/vendor-verify.sh before\n\
                 updating these digests.",
                p.display()
            ));
        }
    }
}

fn openssl_prefix() -> PathBuf {
    println!("cargo:rerun-if-env-changed=WCONF_OPENSSL");
    if let Ok(p) = std::env::var("WCONF_OPENSSL") {
        return PathBuf::from(p);
    }
    let out = std::process::Command::new("brew").args(["--prefix", "openssl@3"]).output();
    match out {
        Ok(o) if o.status.success() => {
            PathBuf::from(String::from_utf8_lossy(&o.stdout).trim().to_string())
        }
        _ => die(
            "cannot locate OpenSSL 3. Install `brew install openssl@3`, or set WCONF_OPENSSL\n\
             to a prefix containing lib/libcrypto.",
        ),
    }
}

// ---------------------------------------------------------------------------
// SHA-256. Build scripts cannot use the crate's own dependencies, so this is a
// self-contained implementation whose only job is to compare against the three
// constants above. It is checked by the fact that a wrong digest fails the
// build against known-good headers.
// ---------------------------------------------------------------------------

fn sha256_hex(data: &[u8]) -> String {
    let h = sha256(data);
    h.iter().map(|b| format!("{b:02x}")).collect()
}

fn sha256(data: &[u8]) -> [u8; 32] {
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let mut msg = data.to_vec();
    let bitlen = (data.len() as u64) * 8;
    msg.push(0x80);
    while msg.len() % 64 != 56 {
        msg.push(0);
    }
    msg.extend_from_slice(&bitlen.to_be_bytes());

    for chunk in msg.chunks(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([chunk[4 * i], chunk[4 * i + 1], chunk[4 * i + 2], chunk[4 * i + 3]]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let t1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = s0.wrapping_add(maj);
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(t1);
            d = c;
            c = b;
            b = a;
            a = t1.wrapping_add(t2);
        }
        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }
    let mut out = [0u8; 32];
    for i in 0..8 {
        out[4 * i..4 * i + 4].copy_from_slice(&h[i].to_be_bytes());
    }
    out
}
