//! Known-answer tests for the ruled ElGamal key derivation.
//!
//! **Condition 5 of `REVIEW-012-RULING-keygen-2026-08-18.md`:** *"A derivation
//! KAT, distinct from upstream's interop vectors. `test_pok_sk`, `test_elgamal`
//! and `test_elgamal_verify` establish that a keypair is well-formed and
//! interoperates — a constant `sk_A = 1` passes all three. They establish
//! nothing about whether the key was derived correctly."* That claim is not
//! taken on trust either; `tests/keygen_interop.rs` runs `sk_A = 1` through all
//! three and watches them pass.
//!
//! # What makes these vectors evidence
//!
//! `signer/src/keygen.rs` was written from the ruling's **prose**. The vectors
//! below come from `tools/spike-keygen-2026-08-18/t-keygen-construction.ts`,
//! which is a **different implementation in a different language written in a
//! different session**, and which itself agrees with a second path through
//! `@noble`'s `hkdf()`. Three implementations of one prose specification
//! agreeing on two vectors is evidence. One implementation agreeing with itself
//! is not, and a REVIEW-010 leg shipped fabricated vectors that were
//! structurally self-consistent enough to be dangerous (`CLAIMS.md` E-62).
//!
//! ⚠ **`CLAIMS.md` P-8 does not apply here** — these are correctness vectors,
//! not benchmark numbers.

use hmac::{Hmac, Mac};
use sha2::Sha512;
use wconf_signer::keygen::{self, KeygenError};
use wconf_signer::prover::hex;
use wconf_signer::xrpl::KeyAlgorithm;

type HmacSha512 = Hmac<Sha512>;

struct Vector {
    name: &'static str,
    family_seed: &'static str,
    seed_type: KeyAlgorithm,
    account_id: &'static str,
    ikm_len: usize,
    prk: &'static str,
    okm: &'static str,
    sk: &'static str,
    pk: &'static str,
}

/// Verbatim from `REVIEW-012-RULING-keygen-2026-08-18.md` §6. The line
/// wrapping in that document is presentational; `PRK` and `OKM64` are 64 bytes
/// each and are unwrapped here.
const VECTORS: &[Vector] = &[
    Vector {
        name: "V1 secp256k1",
        family_seed: "sp6JdwovBCsiwnMhXuvZGZtPUoGVj",
        seed_type: KeyAlgorithm::Secp256k1,
        account_id: "7F0BBA382512C0A00A1630506AE44EBE8AC20D27",
        ikm_len: 80,
        prk: "8A26F1B7BFC755769AEADFA7D0A45A0D023036928C6E628639AA88DB15FEFBFA\
              EEE1BC77E72F36D553DE22DF9D4773E0A82694949FD2C30840883BE51744F2BA",
        okm: "DCAA926637AEBD02488FBE27C6DD7DE96BF97329FFA70F496A50AFD25F3CB34C\
              C784161154F3DA9CCB996D4012005C4D01D92A8758FC9D012C1DB48AEB1615E3",
        sk: "D1CE6CB547E3010BEE0DE614330D745A2ADE751C8BD16A66962616EFE7453964",
        pk: "02295AD17728DBD75FAB16EE3A38E7D1ED96908DD7E530C90BD8965AF0A7E71246",
    },
    Vector {
        name: "V2 ed25519",
        family_seed: "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n",
        seed_type: KeyAlgorithm::Ed25519,
        account_id: "A8683DC013F856ACCDD629E0730E9FBB707D0D1B",
        ikm_len: 78,
        prk: "81055659C9DEF2D99E78D7AFFACBADF6A0121800CA707DF25B987E4539EFA34C\
              15D36DD41BC9A30DCDE537B41D8795AB72A8704717334E33CE914B9E3725394C",
        okm: "2D6B093FFF62DECFE39223786E68B329C73C252FB82A8895E1099391149254F7\
              3FFD650EF16813BA78F25E9012A1E1F094246D7ADCCA25576219F2E53E6A13E9",
        sk: "601AF0DF8C25B04441802E2E6A5B69D93AD56343CA6556885A2B0F75CBE295EA",
        pk: "02763AF7208A6D7557F638D5959CD65C6BA0C3BF320A84CCA36E4A55E7B099877B",
    },
];

/// The published vectors, end to end.
#[test]
fn the_ruling_s_vectors_reproduce_exactly() {
    for v in VECTORS {
        let (algo, account_id, ikm_len, prk, okm) = keygen::intermediates_for_test(v.family_seed)
            .unwrap_or_else(|e| panic!("{}: {e}", v.name));
        assert_eq!(algo, v.seed_type, "{} seed type", v.name);
        assert_eq!(hex(&account_id), v.account_id, "{} account_id", v.name);
        assert_eq!(ikm_len, v.ikm_len, "{} IKM length", v.name);
        assert_eq!(hex(&prk), unwrap(v.prk), "{} PRK", v.name);
        assert_eq!(hex(&okm), unwrap(v.okm), "{} OKM64", v.name);

        let key = keygen::derive_from_master_seed(v.family_seed, None)
            .unwrap_or_else(|e| panic!("{}: {e}", v.name));
        assert_eq!(hex(key.public()), v.pk, "{} pk_A", v.name);
        assert_eq!(key.address(), address_of(v.account_id), "{} address", v.name);
    }
}

/// ⚠ **The OTHER public entry point, on BOTH vectors — which is the coverage
/// `REVIEW-032b` found missing.** `derive_from_master_seed_with_account` had
/// exactly one caller (`holder.rs`) and exactly one test reaching it, and that
/// test's profile carries a **secp256k1** seed. **An ed25519 wiring regression
/// in the new wrapper was pinned by nothing.** `CLAIMS.md` B-25.
///
/// ⚠ It asserts the returned `AccountKey` too, not just the `DerivedKey`.
/// Handing back that account is the whole reason the function exists — it is
/// what removed `holder.rs`'s second decode — so it is what a test has to check.
#[test]
fn both_entry_points_agree_on_both_vectors() {
    for v in VECTORS {
        let plain = keygen::derive_from_master_seed(v.family_seed, None)
            .unwrap_or_else(|e| panic!("{}: {e}", v.name));
        let (with_acct, account) = keygen::derive_from_master_seed_with_account(v.family_seed)
            .unwrap_or_else(|e| panic!("{}: {e}", v.name));

        assert_eq!(hex(with_acct.public()), v.pk, "{} pk_A via the account form", v.name);
        assert_eq!(with_acct.public(), plain.public(), "{} the two entry points diverged", v.name);
        assert_eq!(with_acct.account_id(), plain.account_id(), "{} account_id diverged", v.name);
        assert_eq!(with_acct.seed_type(), plain.seed_type(), "{} seed_type diverged", v.name);

        // The handed-back AccountKey is the point of the function.
        assert_eq!(hex(&account.account_id()), v.account_id, "{} returned AccountKey", v.name);
        assert_eq!(
            &account.account_id(),
            with_acct.account_id(),
            "{}: the returned account is not the one the derivation used",
            v.name
        );
    }
}

/// `sk_A` is not exposed by the module — deliberately, because nothing outside
/// the prover has any business holding it. It is checked here through the one
/// public consequence that determines it: `pk_A = sk_A·G`, recomputed from the
/// published `sk_A` with a library that knows nothing about this derivation.
#[test]
fn the_published_sk_produces_the_published_pk() {
    use k256::elliptic_curve::sec1::ToEncodedPoint;
    for v in VECTORS {
        let sk = unhex(v.sk);
        let secret = k256::SecretKey::from_slice(&sk).expect("published sk_A is in range");
        assert_eq!(
            hex(secret.public_key().to_encoded_point(true).as_bytes()),
            v.pk,
            "{}: the published sk_A and pk_A do not correspond",
            v.name
        );
    }
}

/// The same 16 bytes of entropy under two seed types must give two different
/// accounts and two different keys.
///
/// That is the whole reason `seed_type` is a framed field of the preimage,
/// and the two published vectors share entropy `000102…0F` precisely so this
/// is checkable.
#[test]
fn one_entropy_under_two_seed_types_diverges_everywhere() {
    let a = keygen::derive_from_master_seed(VECTORS[0].family_seed, None).expect("V1");
    let b = keygen::derive_from_master_seed(VECTORS[1].family_seed, None).expect("V2");
    assert_ne!(a.account_id(), b.account_id(), "same account from two seed types");
    assert_ne!(a.public(), b.public(), "same pk_A from two seed types");
    assert_ne!(a.seed_type(), b.seed_type());
}

/// Every element of the framing changes the output.
///
/// This one **reimplements §2.2 with each element parameterised**, because the
/// module hard-codes them and a test that could only call the module could not
/// vary them. The reference arm reproducing V1's `OKM64` is what says the
/// reimplementation is the same construction — without it, six "changing X
/// changes the output" assertions would pass against any hash of anything.
#[test]
fn every_framing_element_is_load_bearing() {
    let (_, account_id, _, _, _) = keygen::intermediates_for_test(VECTORS[0].family_seed).unwrap();
    let (seed, _) = wconf_signer::xrpl::decode_family_seed(VECTORS[0].family_seed).unwrap();

    let okm = |label: &[u8], salt: &[u8], expand: &[u8], role: &[u8], stype: &[u8], acct: &[u8]| {
        let mut e = HmacSha512::new_from_slice(salt).unwrap();
        e.update(label);
        e.update(&(stype.len() as u32).to_be_bytes());
        e.update(stype);
        e.update(&16u32.to_be_bytes());
        e.update(&seed[..]);
        e.update(&20u32.to_be_bytes());
        e.update(acct);
        let prk: [u8; 64] = e.finalize().into_bytes().into();

        let mut x = HmacSha512::new_from_slice(&prk).unwrap();
        x.update(expand);
        x.update(&(role.len() as u32).to_be_bytes());
        x.update(role);
        x.update(&[0x01]);
        let okm: [u8; 64] = x.finalize().into_bytes().into();
        hex(&okm)
    };

    const L: &[u8] = b"WCONF-ELGAMAL-KEYGEN-v1";
    const S: &[u8] = b"WCONF-ELGAMAL-KEYGEN-v1/HKDF-Extract-salt";
    const E: &[u8] = b"WCONF-ELGAMAL-KEYGEN-v1/HKDF-Expand";
    const R: &[u8] = b"secp256k1-scalar";
    const T: &[u8] = b"secp256k1";

    let reference = okm(L, S, E, R, T, &account_id);
    assert_eq!(
        reference,
        unwrap(VECTORS[0].okm),
        "the parameterised reimplementation is not the same construction, so nothing \
         else in this test means anything"
    );

    let mut wrong_acct = account_id;
    wrong_acct[0] ^= 0xFF;
    let variants: &[(&str, String)] = &[
        ("LABEL", okm(b"WCONF-ELGAMAL-KEYGEN-v2", S, E, R, T, &account_id)),
        ("SALT", okm(L, b"WCONF-ELGAMAL-KEYGEN-v1/HKDF-Extract-SALT", E, R, T, &account_id)),
        ("EXPAND", okm(L, S, b"WCONF-ELGAMAL-KEYGEN-v1/HKDF-expand", R, T, &account_id)),
        ("ROLE", okm(L, S, E, b"secp256k1-Scalar", T, &account_id)),
        ("seed_type", okm(L, S, E, R, b"ed25519", &account_id)),
        ("account_id", okm(L, S, E, R, T, &wrong_acct)),
    ];
    for (what, got) in variants {
        assert_ne!(got, &reference, "changing {what} did not change OKM64");
    }
}

/// §2.1's refusals, all of which happen **before anything is hashed**.
#[test]
fn malformed_input_is_refused_before_any_derivation() {
    assert!(
        matches!(
            keygen::derive_from_master_seed("not-a-seed", None),
            Err(KeygenError::Seed(_))
        ),
        "a non-seed string was accepted"
    );
    assert!(
        matches!(
            keygen::derive_from_master_seed("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh", None),
            Err(KeygenError::Seed(_))
        ),
        "an AccountID-shaped string was accepted as a seed"
    );
}

/// The expected-AccountID binding, which is §2.1's fourth refusal **and** the
/// mechanical half of §7 condition 2's "the master family seed for the account
/// being registered, and nothing else".
///
/// A regular key's seed is just another family seed. Nothing about it looks
/// wrong; it simply derives a different account. Binding the expected AccountID
/// is the only thing that catches it, which is why every caller in this crate
/// passes one.
#[test]
fn a_seed_for_a_different_account_is_refused_by_the_account_binding() {
    let other = unhex(VECTORS[1].account_id);
    let mut want = [0u8; 20];
    want.copy_from_slice(&other);

    let err = keygen::derive_from_master_seed(VECTORS[0].family_seed, Some(&want))
        .expect_err("a seed deriving the wrong account was accepted");
    match &err {
        KeygenError::AccountIdMismatch { derived, expected } => {
            assert_eq!(derived, &address_of(VECTORS[0].account_id));
            assert_eq!(expected, &address_of(VECTORS[1].account_id));
        }
        other => panic!("wrong error: {other:?}"),
    }
    // The message has to say what a holder can act on, not just "mismatch".
    let text = format!("{err}");
    assert!(text.contains("MASTER"), "the refusal does not say which seed is required: {text}");

    // The control: the matching AccountID is accepted.
    let mut ok = [0u8; 20];
    ok.copy_from_slice(&unhex(VECTORS[0].account_id));
    keygen::derive_from_master_seed(VECTORS[0].family_seed, Some(&ok))
        .expect("the matching account was refused");
}

/// The reduction is total, driven through the **whole** derivation rather than
/// through `reduce_wide_total` alone.
///
/// There is no input to `derive_from_master_seed` that makes it fail for a
/// cryptographic reason: every error it returns is §2.1 input validation. This
/// walks a spread of real seeds and asserts that none of them abort and none of
/// them produce a key outside the range, because "total" is a claim about all
/// inputs and one vector is not a spread.
#[test]
fn the_derivation_never_aborts_over_a_spread_of_seeds() {
    use k256::elliptic_curve::sec1::ToEncodedPoint;
    for i in 0u8..64 {
        let entropy = [i; 16];
        for prefix in ["secp256k1", "ed25519"] {
            let seed = encode_seed(&entropy, prefix);
            let k = keygen::derive_from_master_seed(&seed, None)
                .unwrap_or_else(|e| panic!("seed {seed} ({prefix}) aborted: {e}"));
            // pk parses, so sk was a valid scalar in [1, n−1].
            let pk = k256::PublicKey::from_sec1_bytes(k.public())
                .unwrap_or_else(|_| panic!("seed {seed} produced a pk that is not a point"));
            assert_eq!(
                pk.to_encoded_point(true).as_bytes(),
                k.public(),
                "pk_A is not canonical compressed SEC1"
            );
        }
    }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/// Strip the presentational line-continuation whitespace out of a vector.
fn unwrap(s: &str) -> String {
    s.chars().filter(|c| !c.is_whitespace()).collect()
}

fn unhex(s: &str) -> Vec<u8> {
    (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap()).collect()
}

fn address_of(account_id_hex: &str) -> String {
    let mut a = [0u8; 20];
    a.copy_from_slice(&unhex(account_id_hex));
    wconf_signer::xrpl::encode_address(&a)
}

/// base58check-encode 16 bytes of entropy as a family seed of the named type.
///
/// Written here rather than exported from `xrpl` because nothing in the signer
/// needs to *create* a seed — it only ever reads one.
fn encode_seed(entropy: &[u8; 16], kind: &str) -> String {
    use sha2::Digest;
    let mut body: Vec<u8> = match kind {
        "ed25519" => vec![0x01, 0xE1, 0x4B],
        _ => vec![0x21],
    };
    body.extend_from_slice(entropy);
    let c = sha2::Sha256::digest(sha2::Sha256::digest(&body));
    body.extend_from_slice(&c[..4]);
    b58(&body)
}

fn b58(input: &[u8]) -> String {
    let alphabet = wconf_signer::xrpl::ALPHABET;
    let mut digits: Vec<u8> = vec![0];
    for &b in input {
        let mut carry = b as u32;
        for d in digits.iter_mut() {
            carry += (*d as u32) << 8;
            *d = (carry % 58) as u8;
            carry /= 58;
        }
        while carry > 0 {
            digits.push((carry % 58) as u8);
            carry /= 58;
        }
    }
    let zeros = input.iter().take_while(|&&b| b == 0).count();
    let mut out: Vec<u8> = vec![alphabet[0]; zeros];
    out.extend(digits.iter().rev().map(|&d| alphabet[d as usize]));
    String::from_utf8(out).expect("the alphabet is ASCII")
}
