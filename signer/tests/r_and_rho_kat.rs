//! Known-answer test for the ruled `r`/`ρ` derivation.
//!
//! **The vectors are REVIEW-010 Deliverable B's**, published in
//! `tools/spike-randomness-2026-08-18/t-r-and-rho-construction.ts` and asserted
//! there against an independent TypeScript implementation over Node's
//! `crypto.createHmac`.
//!
//! This file is the cross-implementation check the ruling asks for: the Rust
//! was written from the ruling's **prose**, not from the TypeScript control
//! flow, and must reproduce every vector byte for byte. Two implementations
//! agreeing on nine vectors is evidence; one implementation agreeing with
//! itself is not.
//!
//! A leg of REVIEW-010 shipped **fabricated** vectors — every asserted value
//! wrong, and structurally self-consistent enough to be dangerous. That is why
//! vectors are recomputed by a second implementation before being trusted.

use wconf_signer::randomness::{derive, Inputs, Role, TxKind};

fn seq(len: usize) -> Vec<u8> {
    (0..len).map(|i| (i & 0xff) as u8).collect()
}
fn pat(byte: u8, len: usize) -> Vec<u8> {
    vec![byte; len]
}

struct Vector {
    name: &'static str,
    tx_kind: TxKind,
    role: Role,
    account: Vec<u8>,
    issuance: Vec<u8>,
    context: Vec<u8>,
    entropy: Vec<u8>,
    expected: &'static str,
}

fn vectors() -> Vec<Vector> {
    let base_account = seq(20);
    let base_issuance = pat(0x42, 24);
    let base_context = pat(0xa1, 32);
    let base_entropy = seq(64);

    let mut ctx_changed = pat(0xa1, 31);
    ctx_changed.push(0xa0);
    let mut ent_changed = seq(63);
    ent_changed.push(0xbf);

    vec![
        Vector {
            name: "send r",
            tx_kind: TxKind::Send, role: Role::ElgamalR,
            account: base_account.clone(), issuance: base_issuance.clone(),
            context: base_context.clone(), entropy: base_entropy.clone(),
            expected: "3D1F32A8397999734FAE3068DD3C5BB595760441812DCA2C59F7623637C0E574",
        },
        Vector {
            name: "send rho",
            tx_kind: TxKind::Send, role: Role::BalanceRho,
            account: base_account.clone(), issuance: base_issuance.clone(),
            context: base_context.clone(), entropy: base_entropy.clone(),
            expected: "410444D77C876FCF0A76B23B6C29424DC8ADC90FCD68D7B1D665272387A9EEDD",
        },
        Vector {
            name: "send r, one context byte changed",
            tx_kind: TxKind::Send, role: Role::ElgamalR,
            account: base_account.clone(), issuance: base_issuance.clone(),
            context: ctx_changed, entropy: base_entropy.clone(),
            expected: "7A9299AFE6FE3A556D636224EE0605D199904734D83DA95BD7746B33B8AC6484",
        },
        Vector {
            name: "send r, one entropy byte changed",
            tx_kind: TxKind::Send, role: Role::ElgamalR,
            account: base_account.clone(), issuance: base_issuance.clone(),
            context: base_context.clone(), entropy: ent_changed,
            expected: "542839218E14ED94DC81534DBBA1D6C78A3A12D6CE31B68912588D810E3A5291",
        },
        Vector {
            name: "convert r, same account/issuance/context/entropy",
            tx_kind: TxKind::Convert, role: Role::ElgamalR,
            account: base_account.clone(), issuance: base_issuance.clone(),
            context: base_context.clone(), entropy: base_entropy.clone(),
            expected: "6F37E0F43B07E14DEF5BB775C8D8EF5CDE9ED1D632F26138E389C2E8109F833F",
        },
        Vector {
            name: "convertback r, same account/issuance/context/entropy",
            tx_kind: TxKind::ConvertBack, role: Role::ElgamalR,
            account: base_account.clone(), issuance: base_issuance.clone(),
            context: base_context.clone(), entropy: base_entropy.clone(),
            expected: "95A2F938AD598E70FC9E964AF5EBF429D70FBAB9A1BC0CE4D16B302C587527F1",
        },
        Vector {
            name: "convertback rho, same account/issuance/context/entropy",
            tx_kind: TxKind::ConvertBack, role: Role::BalanceRho,
            account: base_account.clone(), issuance: base_issuance.clone(),
            context: base_context.clone(), entropy: base_entropy.clone(),
            expected: "96C5FCD8098C37E44AB1DC38FBB0520CB6356F28BE5A20137B106C0E59EF8CCC",
        },
        Vector {
            name: "send r, different account",
            tx_kind: TxKind::Send, role: Role::ElgamalR,
            account: pat(0x19, 20), issuance: base_issuance.clone(),
            context: base_context.clone(), entropy: base_entropy.clone(),
            expected: "2A72A3A127B28E1E8CBAE32AF3DAA945E04670322A38C8A490B83F8331DC9730",
        },
        Vector {
            name: "send r, different issuance",
            tx_kind: TxKind::Send, role: Role::ElgamalR,
            account: base_account, issuance: pat(0x43, 24),
            context: base_context, entropy: base_entropy,
            expected: "D113B7211EE89D09CA4A6AE58A6521C16BEF9BD3E4DE8E96171D3FF1AEE62D79",
        },
    ]
}

fn run(v: &Vector) -> String {
    let account: [u8; 20] = v.account.clone().try_into().unwrap();
    let issuance: [u8; 24] = v.issuance.clone().try_into().unwrap();
    let context: [u8; 32] = v.context.clone().try_into().unwrap();
    let entropy: [u8; 64] = v.entropy.clone().try_into().unwrap();
    let inputs = Inputs {
        tx_kind: v.tx_kind,
        account_id: &account,
        mpt_issuance_id: &issuance,
        tx_context_id: &context,
        entropy64: &entropy,
    };
    derive(&inputs, v.role).expect("derivation").to_hex_upper()
}

#[test]
fn every_published_vector_reproduces_byte_for_byte() {
    for v in vectors() {
        assert_eq!(run(&v), v.expected, "vector `{}` does not reproduce", v.name);
    }
}

#[test]
fn changing_any_single_input_changes_the_output() {
    // Separation, asserted rather than assumed: nine vectors that all matched
    // would still be consistent with an implementation that ignored an input.
    let all: Vec<String> = vectors().iter().map(run).collect();
    let mut sorted = all.clone();
    sorted.sort();
    sorted.dedup();
    assert_eq!(sorted.len(), all.len(), "two different inputs produced the same scalar");
}

#[test]
fn r_and_rho_differ_for_the_same_transaction() {
    let account = [7u8; 20];
    let issuance = [8u8; 24];
    let context = [9u8; 32];
    let entropy = [10u8; 64];
    let inputs = Inputs {
        tx_kind: TxKind::Send,
        account_id: &account,
        mpt_issuance_id: &issuance,
        tx_context_id: &context,
        entropy64: &entropy,
    };
    let r = derive(&inputs, Role::ElgamalR).unwrap();
    let rho = derive(&inputs, Role::BalanceRho).unwrap();
    assert_ne!(r.as_bytes(), rho.as_bytes(), "the role string is not separating");
}

#[test]
fn derive_pair_agrees_with_two_separate_derivations() {
    let account = [1u8; 20];
    let issuance = [2u8; 24];
    let context = [3u8; 32];
    let entropy = [4u8; 64];
    let inputs = Inputs {
        tx_kind: TxKind::Convert,
        account_id: &account,
        mpt_issuance_id: &issuance,
        tx_context_id: &context,
        entropy64: &entropy,
    };
    let (r, rho) = wconf_signer::randomness::derive_pair(&inputs).unwrap();
    assert_eq!(r.as_bytes(), derive(&inputs, Role::ElgamalR).unwrap().as_bytes());
    assert_eq!(rho.as_bytes(), derive(&inputs, Role::BalanceRho).unwrap().as_bytes());
}

#[test]
fn a_scalar_never_prints_itself() {
    // A derived scalar is secret. `Debug` must not leak it into a log line.
    let account = [1u8; 20];
    let issuance = [2u8; 24];
    let context = [3u8; 32];
    let entropy = [4u8; 64];
    let inputs = Inputs {
        tx_kind: TxKind::Send, account_id: &account, mpt_issuance_id: &issuance,
        tx_context_id: &context, entropy64: &entropy,
    };
    let r = derive(&inputs, Role::ElgamalR).unwrap();
    let printed = format!("{r:?}");
    assert!(printed.contains("redacted"), "Debug leaked a scalar: {printed}");
    assert!(!printed.contains(&r.to_hex_upper()[..8]), "Debug leaked scalar bytes");
}

// ---------------------------------------------------------------------------
// The reduction itself
//
// A wrong group order is correct for small inputs and wrong for most others,
// which is exactly the defect this file caught while being written: the second
// 64-bit word of `n` was FFFF instead of FFFE. Every vector above failed, which
// is the good outcome — a bug that only some vectors catch is one that ships.
// ---------------------------------------------------------------------------

use wconf_signer::scalar::reduce_wide;

fn wide_from_hex(hex: &str) -> [u8; 64] {
    let mut out = [0u8; 64];
    let bytes: Vec<u8> = (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).unwrap())
        .collect();
    assert!(bytes.len() <= 64);
    out[64 - bytes.len()..].copy_from_slice(&bytes);
    out
}

const N_HEX: &str = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141";

#[test]
fn a_value_below_n_reduces_to_itself() {
    for v in ["01", "FF", "0123456789ABCDEF", &N_HEX[..62]] {
        let wide = wide_from_hex(v);
        let expected = format!("{:0>64}", v.to_uppercase());
        assert_eq!(reduce_wide(&wide).unwrap().to_hex_upper(), expected, "input {v}");
    }
}

#[test]
fn n_itself_reduces_to_zero_and_is_refused() {
    // n mod n == 0. The abort path, exercised on the one input that reaches it
    // deterministically.
    assert!(reduce_wide(&wide_from_hex(N_HEX)).is_err(), "n did not reduce to zero");
}

#[test]
fn n_plus_one_reduces_to_one() {
    let n = u128::from_str_radix(&N_HEX[32..], 16).unwrap();
    let mut hex = N_HEX[..32].to_string();
    hex.push_str(&format!("{:032X}", n + 1));
    assert_eq!(
        reduce_wide(&wide_from_hex(&hex)).unwrap().to_hex_upper(),
        format!("{:0>64}", "1")
    );
}

#[test]
fn two_n_reduces_to_zero_and_is_refused() {
    let mut wide = [0u8; 64];
    let n_bytes = wide_from_hex(N_HEX);
    // 2n, computed by doubling n as a big-endian byte string.
    let mut carry = 0u16;
    for i in (0..64).rev() {
        let v = (n_bytes[i] as u16) * 2 + carry;
        wide[i] = (v & 0xff) as u8;
        carry = v >> 8;
    }
    assert!(reduce_wide(&wide).is_err(), "2n did not reduce to zero");
}

#[test]
fn all_ones_reduces_to_the_known_value() {
    // (2^512 - 1) mod n. An independent check on the wide path: the value is
    // large enough that a reduction working only on small inputs cannot pass.
    //
    // ⚠ **The first version of this assertion was a fabricated constant** —
    // written from recollection rather than computed, and wrong. The
    // implementation was right and the test was wrong, which is the reverse of
    // the usual failure and is exactly what REVIEW-010's leg A shipped: values
    // that look structurally plausible and are invented. Recomputed with an
    // independent tool before being trusted:
    //
    //   python3 -c "n=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
    //               print(format((2**512-1)%n,'064X'))"
    let wide = [0xffu8; 64];
    let got = reduce_wide(&wide).unwrap().to_hex_upper();
    assert_eq!(got, "9D671CD581C69BC5E697F5E45BCD07C6741496C20E7CF878896CF21467D7D13F");
}

// ---------------------------------------------------------------------------
// Differential check on `reduce_wide` — REVIEW-014b's request.
//
// Codex noted, correctly, that KAT vectors are good evidence but not a
// falsifier for all carry/borrow paths: nine vectors exercise nine paths.
//
// These 64 expected values were computed by **Python's arbitrary-precision
// integers**, an implementation with nothing in common with the limb arithmetic
// under test:
//
//   python3 -c "import hashlib
//   n=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
//   for i in range(64):
//       w=hashlib.sha512(f'wconf-reduce-differential-{i}'.encode()).digest()
//       print(format(int.from_bytes(w,'big')%n,'064X'))"
//
// The inputs are SHA-512 of a fixed string, so the test regenerates them rather
// than storing them, and any of the 64 can be reproduced by hand.
// ---------------------------------------------------------------------------

const DIFFERENTIAL_EXPECTED: [&str; 64] = [
    "B8232742F0C954CF87AD7CA3D3281576ABC9B2CD1A40E3A06251300D0651B709",
    "BD668B5AB1EC6CC14260CC7005B274114C699E21152C08F9696FAFE78415CB48",
    "C733230092B2EB9CCD50DE2807C1B79C96679ED26DD42E27EB75ED44009BC43E",
    "056BC21F876EB608AF2F2917E03504A6DB5748473B9D80958E8643DCDD34408C",
    "922B848D2F2ABEE644ABBA75AF47B2219331B0671CD2B3AC6331DD9723498041",
    "8E5A8B6797619EA9E34452F57D20480D0E357B9F6DADCAB265EA6505E1E16345",
    "7AB55025889DEF5896C62CB29900FC520699EACD75C5ED0A4D270842EE15045E",
    "7C9F13AA754844667F33EF1443305C994FE87030B0C391E6265541D03771B0F6",
    "1619D1B57DC80C90E0EF2836DE05A32E96E294FAE2B1B826DD61E6426289F67C",
    "766AD4C23042CC20EF735D281BB43BAD23446E446FDC000B6483D4E3446809BA",
    "2BA03BE4FE881AED4AE9D74464F709106D6C944B6F04452F94C54E58E166C8CD",
    "D8EA33B3EC629BD5EE45E03B75E345D1C1AF7A998E952B9B70E91124317FCFFC",
    "8EBE74292B573381C56110E09BE8C2C5BC764E05A5A5FFC84978D59E69696E66",
    "FB579FA69126879521F7385FA8052E4A245DA5F3940126E6FD9355ABC73F878A",
    "714E86DD6F4975AA391A1D3B08D68F8968ED7CAAD4A652B013AA42333CC8B855",
    "C95B659ADFCBD9A6A613C7138309096D19A9F7AD58A0E8B6DE2C25AF14A8B9C1",
    "9B62E9208060945DB13375E587C2B6B9BFB138A3663A12E1357927028631E717",
    "EFDF6F8AA43A4D39EA31114181E8792662711EE5217E065752F7BF2223ED2AD1",
    "52C719477D9123E9F70E67643A1B3F60DE5E38F023F51980E9446B5C49D0293B",
    "83BE892FB573D9244E47F3D3415E7F8A086237F9002AE42924579BAF140713E8",
    "36B3174A35F5262396E7BF5F132671D248B4892AF35F86D2C966DD888ABABDD5",
    "1A6ACD9AF0AF3D4E1EBB893482CE559268CA97895A3325BD742EDBB2FAAF6C2D",
    "E5C5DD268173626E788DA5AAB85EED8F43CE725A6A935A20BAC2F722D56E532C",
    "69DDFC6BE0BFD86E1223FF03F41D71211CD4F64F86DDF74F2F21BC53804BA929",
    "2645C151CE9FA39FEF1D1002FB3E3A9565553B8FDDC9D8F0624AD6F824B378B1",
    "E146B3ACBB2E94DDA7A6866F6FDD60B51DBA0C34E67C396E2C52AC24C504F8AD",
    "810C69A0E65E5306D184C90B4991B37831AC9CC169022E9276907F802EA0E845",
    "1D32C16E9072FE104894D55549BA86DA8858AE09D65A35AD7532DE80F6266068",
    "B2E5F2012F9C14B116B68A4279EF1B91CE7A84935D754E568A60C26A2D74DC70",
    "E235DC41B74DB9F56CB46B485B54128D3BBF5B3AD409B3EDDFBCE847ACF5A507",
    "252D2172119E9995A493DADE97F96135EC264E663FA2AE2AFC4F3E62AB6E7DA7",
    "DF1A3B431A910529914FDE4088FD487F4E15FD9C244B6B9C92C8A9C723F672B5",
    "DFB4A70FF8FA5A1340BAE03CE519A7D1A54D7BC3F1AADBCE282B5454BFEB2785",
    "9DF01B8BB105394C6B1930DF77703607D128A2CB0D2CDC9C93026E72600B137A",
    "D89C7820911E4881D24DF8DFA34DB5777CD1CC966C76ED630CBCF71BB64299B7",
    "0BE099D7EC5EB37D7BFCCF73AA4BC9837952AFE3D869C0F1872C8254025ED7B5",
    "6029A594FF15F8293DFA724FDFD871C7DCBB03C0390C024295938C42CB968299",
    "1891CF7D5F824F7803B7AE9C1A81E4354FB5D30B81766731AF4E343186DBF87A",
    "82B8E231328832A1869FA41E37012BA47F045CB9EFC89E9B54D23EC7CA76900C",
    "4F849D8CEBFD6B04C888D0F1DE79D5AF160DA838BFF957DB6984B06DDAD94B56",
    "E48240CBF2FAA16486C39F70F16B18C8FCC930B209DAD4AE260E9846A11A78BE",
    "D4486A0B5FF4EC69279C67CC86D98FDB4F8D92595B9CF5122C1AFE0F3680F1B9",
    "8A0E13FED32971201AA3F7062945ECA66CA3B016856A4A3C4BD557A82BDD5E86",
    "F33C2DDB573659595387932FA365D529A78C5833976C8E1EC7AAB45DC8C1DF45",
    "7ACC8486180EC916742E7ADDE71D64DC3993A86C5D30516C082F2E6F06CDE2F1",
    "F6D64E732C527EDE6007B50A5CB0B887D72A1EA24C020E7A62916704460D3755",
    "72446F7BAF3F7E5B272DA52C5D026BAC79FF02BAFD462F281F473D1BDEA34049",
    "90A6E9F6E69C3BC6D878D20C3FA3763B059B75D3479EA294E5CD28645D324917",
    "6E1827AD8A3F12A16EE43254F69F3105F500446E578F35C0FD5F4B8A0CBBBD84",
    "38263B05E42C5A448E61280B10A61B90ACAE97E38ECC0252F0D745F5F5652498",
    "FC0CBAC7D12C709DE2C3F8464760118D24AE7F5CD27A56DD4E427E8A4FA80962",
    "B7595A12A3A05E5AF3DBCEE1A57CF2D47E67B514B2EA00262381FB92B7537A05",
    "FC5A32F0275BC96475B34B87937E260662F0F60828F2C20136F282CCF0D5F966",
    "9EFA73E2BF26C624FD16014721FB0EB128B92B0C3BC2942B62E9C04682BDA4C9",
    "C7C7549BD35E72BA2015E75485A2D005F7EBE7FAD462A3056EECAED8DB7241D2",
    "6F88C9C7A6D5D0E8D539606EA586F3F8CCE0C394C9AE3F935CFD9297C5A57C85",
    "D496535949FC18D8BF3CD82F91DFECE7F3BC8B96B27036E3610BFCD1A8658A92",
    "3C519BAC5373BD2183CA867B17C0B46F3758ED507F5050800CEAC02DC977ED0D",
    "ECEBC0FEB5A2AFAA0BB9E417E7F13959E524D547259930960A08651DCE29A84D",
    "5941AFA452CA98567D4B878C063B6E8F00A3C002DE9CEE98BF8F87D5C1D0B0B5",
    "60738AF924F77EB7021858F9ECB6F4DE2C0BED5281E44128CB4167D4BE040A95",
    "EE61ECBDC63F6851AA908F11B8CF59385CE917BDFEAF36E42476C471D3BECC80",
    "6BD78DA316573CA8D5CF02A8E83AF8205C082C5191B60286E1C54E6D1175778B",
    "CF93E457EE3C642F968EC62F9B4BC0332B13A94EF8F6D79D83F216720EC7CECF",
];

#[test]
fn reduce_wide_agrees_with_an_independent_bigint_over_64_inputs() {
    use sha2::{Digest, Sha512};
    for (i, expected) in DIFFERENTIAL_EXPECTED.iter().enumerate() {
        let mut h = Sha512::new();
        h.update(format!("wconf-reduce-differential-{i}").as_bytes());
        let wide: [u8; 64] = h.finalize().into();
        let got = reduce_wide(&wide).expect("none of these reduce to zero").to_hex_upper();
        assert_eq!(&got, expected, "input {i} disagrees with the independent reduction");
    }
}
