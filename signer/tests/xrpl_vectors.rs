//! Known-answer tests for XRPL serialisation, addressing and signing.
//!
//! Architecture §6 step 3. Every expected value in
//! `tools/spike-step3-2026-08-18/xrpl-vectors.json` is produced by
//! `ripple-binary-codec@2.9.0`, `ripple-keypairs@2.0.0` and
//! `ripple-address-codec@5.0.1` — implementations this project did not write —
//! and the generator is committed beside them under **P-8**.
//!
//! This is the same discipline `tests/r_and_rho_kat.rs` applies to the ruled
//! derivation, for the same reason: **a value written from recollection rather
//! than computed is a defect this project has already shipped once**, and it
//! was the test that was wrong while the implementation was right.
//!
//! If the vectors file is missing this test **fails**. It does not skip. A test
//! that quietly passes when its evidence is absent is a false-pass mode, which
//! is precisely what `REVIEW-009` §8 found in `t-nbound.c`.

use serde_json::Value;
use wconf_signer::xrpl::{self, *};

fn vectors() -> Value {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../tools/spike-step3-2026-08-18/xrpl-vectors.json");
    let raw = std::fs::read_to_string(&path).unwrap_or_else(|e| {
        panic!(
            "cannot read {}: {e}\n\
             Regenerate with: bun tools/spike-step3-2026-08-18/xrpl-vectors.ts --write\n\
             This test does not skip when its evidence is missing.",
            path.display()
        )
    });
    serde_json::from_str(&raw).expect("the vectors file is not valid JSON")
}

fn s(v: &Value, k: &str) -> String {
    v[k].as_str().unwrap_or_else(|| panic!("vector has no string `{k}`")).to_string()
}

// ---------------------------------------------------------------------------
// Addressing and key derivation
// ---------------------------------------------------------------------------

#[test]
fn family_seed_derivation_matches_ripple_keypairs() {
    let v = vectors();
    let keys = v["keys"].as_array().unwrap();
    assert!(!keys.is_empty(), "the vectors carry no keys");
    for k in keys {
        let key = AccountKey::from_family_seed(&s(k, "seed")).unwrap();
        assert_eq!(hex(key.public()), s(k, "public_key"), "public key for {}", s(k, "seed"));
        assert_eq!(hex(&key.account_id()), s(k, "account_id"));
        assert_eq!(key.address(), s(k, "address"));

        // The same seed reached through raw entropy.
        let entropy = unhex(&s(k, "entropy")).unwrap();
        let by_entropy = match s(k, "algorithm").as_str() {
            "ed25519" => AccountKey::ed25519_from_entropy(&entropy).unwrap(),
            _ => AccountKey::from_entropy(&entropy).unwrap(),
        };
        assert_eq!(hex(by_entropy.public()), s(k, "public_key"));
    }
    assert!(
        keys.iter().any(|k| k["algorithm"] == "ed25519"),
        "the vectors cover no ed25519 key, and every account this project holds on Devnet is one"
    );
}

/// The two algorithms sign **different things**, and the vectors are what says
/// which.
///
/// secp256k1 signs `SHA512Half(message)`; ed25519 signs `message`. Reasoning
/// about that is how it gets written backwards, so both are pinned against
/// `ripple-keypairs` signing the same probe.
///
/// ⚠ **On the DETERMINISTIC ARM — `CLAIMS.md` B-14 (2026-08-20) and B-16
/// (2026-08-27).** The default signing path is hedged on **both** algorithms
/// now, so neither can be pinned against `ripple-keypairs`, which is
/// deterministic:
///
/// * **secp256k1** — RFC 6979 with 32 bytes of fresh entropy as additional data.
/// * **ed25519** — the RFC 8032 nonce prefix XORed with `SHA512(DST ‖ aux)`.
///
/// ⚠ This paragraph described the secp256k1 half only, and went on to discuss
/// low-`S` and DER, while the loop below signs **every** vector key including
/// the ed25519 one. `REVIEW-026`, Codex leg.
///
/// **What this still pins is what it was ever really for:** the digest choice,
/// the serialisation, the low-`S` normalisation and the DER encoding, against
/// an implementation this project did not write. What it no longer covers —
/// that the *default* path produces valid signatures — is covered by
/// `tests/hedged_signing.rs`, which is not optional and is why this arm is not
/// a hole.
#[test]
fn each_algorithm_signs_what_ripple_keypairs_signs() {
    let v = vectors();
    let probe = unhex("5354580012005821000000022200000000").unwrap();
    for k in v["keys"].as_array().unwrap() {
        let key = AccountKey::from_family_seed(&s(k, "seed")).unwrap();
        assert_eq!(
            hex(&key.sign_message_with(Hedge::DeterministicForVectors, &probe).unwrap()),
            s(k, "signature_over_probe"),
            "{} signature for {}",
            s(k, "algorithm"),
            s(k, "address")
        );
    }
}

#[test]
fn address_encoding_round_trips_and_verifies_its_checksum() {
    let v = vectors();
    for k in v["keys"].as_array().unwrap() {
        let addr = s(k, "address");
        let id = decode_address(&addr).unwrap();
        assert_eq!(hex(&id), s(k, "account_id"));
        assert_eq!(encode_address(&id), addr);
    }
}

/// `txn::normalise_account` checks shape and alphabet only, and its doc comment
/// says so. This is the checksum check the signing path actually uses, and it
/// has to reject what the shape check accepts.
#[test]
fn a_shape_valid_address_with_a_broken_checksum_is_rejected() {
    let v = vectors();
    let addr = s(&v["keys"][0], "address");
    let mut chars: Vec<char> = addr.chars().collect();
    let last = chars.len() - 1;
    chars[last] = if chars[last] == 'r' { 'p' } else { 'r' };
    let broken: String = chars.into_iter().collect();
    assert!(wconf_signer::txn::shape_of_account_is_plausible(&broken), "the shape check should still accept it");
    assert_eq!(decode_address(&broken), Err(XrplError::Checksum));
}

/// ⚠ **A seed whose three-byte prefix is wrong must say WHICH bytes are wrong.**
///
/// `decode_ed25519_seed` compares a three-byte prefix and reported the
/// single-byte `XrplError::Version { want: VER[0], got: body[0] }`, so a body
/// beginning `01 00 00` — first byte correct, second and third not — produced
/// *"expected 0x01, got 0x01"*. The decode failed correctly and the message
/// described a mismatch that had not happened.
///
/// Found by `REVIEW-024`'s Gemini leg, outside what that packet asked about,
/// and confirmed at source before being fixed.
///
/// The base58check encoder below is written here rather than reused from the
/// crate under test, so the input is not built by the code being checked.
#[test]
fn a_wrong_seed_prefix_names_the_bytes_that_are_wrong() {
    use sha2::{Digest, Sha256};

    fn b58check(body: &[u8]) -> String {
        let c = Sha256::digest(Sha256::digest(body));
        let mut full = body.to_vec();
        full.extend_from_slice(&c[..4]);
        let zeros = full.iter().take_while(|b| **b == 0).count();
        let mut n = full.iter().fold(num_big(), |acc, b| add_byte(acc, *b));
        let mut out = Vec::new();
        while !n.is_empty() {
            let (q, r) = div_mod58(&n);
            out.push(xrpl::ALPHABET[r as usize]);
            n = q;
        }
        for _ in 0..zeros {
            out.push(xrpl::ALPHABET[0]);
        }
        out.reverse();
        String::from_utf8(out).unwrap()
    }
    // Big-endian byte-vector arithmetic, enough for a 23-byte value.
    fn num_big() -> Vec<u8> {
        Vec::new()
    }
    fn add_byte(mut n: Vec<u8>, b: u8) -> Vec<u8> {
        n.push(b);
        while n.first() == Some(&0) {
            n.remove(0);
        }
        n
    }
    fn div_mod58(n: &[u8]) -> (Vec<u8>, u8) {
        let mut out = Vec::with_capacity(n.len());
        let mut rem: u16 = 0;
        for b in n {
            let cur = rem * 256 + *b as u16;
            out.push((cur / 58) as u8);
            rem = cur % 58;
        }
        while out.first() == Some(&0) {
            out.remove(0);
        }
        (out, rem as u8)
    }

    // First prefix byte correct (0x01), second and third wrong.
    let mut body = vec![0x01u8, 0x00, 0x00];
    body.extend_from_slice(&[0x11u8; 16]);
    let seed = b58check(&body);

    match decode_ed25519_seed(&seed) {
        Err(XrplError::VersionPrefix { what, want, got }) => {
            assert_eq!(what, "ed25519 seed");
            assert_eq!(want, vec![0x01, 0xE1, 0x4B]);
            assert_eq!(got, vec![0x01, 0x00, 0x00]);
            let msg = XrplError::VersionPrefix { what, want, got }.to_string();
            assert!(msg.contains("01e14b"), "the message does not name the expected prefix: {msg}");
            assert!(msg.contains("010000"), "the message does not name the prefix seen: {msg}");
        }
        other => panic!("a wrong three-byte prefix produced {other:?}"),
    }
}

// ---------------------------------------------------------------------------
// Field metadata
// ---------------------------------------------------------------------------

/// The signer's own field table against the codec's.
///
/// A wrong `nth` or type code changes the encoding and would be caught by the
/// transaction vectors too — but only for the fields those transactions carry.
/// This covers every field the signer can emit.
#[test]
fn every_field_code_matches_the_codec_definitions() {
    let v = vectors();
    let ours: Vec<FieldDef> = vec![
        TRANSACTION_TYPE, NETWORK_ID, FLAGS, SEQUENCE, LAST_LEDGER_SEQUENCE, MPT_AMOUNT,
        BLINDING_FACTOR, FEE, SIGNING_PUB_KEY, TXN_SIGNATURE, HOLDER_ENCRYPTION_KEY, ZK_PROOF,
        HOLDER_ENCRYPTED_AMOUNT, ISSUER_ENCRYPTED_AMOUNT, SENDER_ENCRYPTED_AMOUNT,
        DESTINATION_ENCRYPTED_AMOUNT, AUDITOR_ENCRYPTED_AMOUNT, AMOUNT_COMMITMENT,
        BALANCE_COMMITMENT, ACCOUNT, DESTINATION, MPT_ISSUANCE_ID,
    ];
    let theirs = v["fields"].as_array().unwrap();
    assert_eq!(ours.len(), theirs.len(), "the signer declares a different number of fields");

    for def in &ours {
        let t = theirs
            .iter()
            .find(|f| f["name"] == def.name)
            .unwrap_or_else(|| panic!("the codec has no field `{}`", def.name));
        assert_eq!(t["nth"].as_u64().unwrap() as u16, def.nth, "nth for {}", def.name);
        assert_eq!(
            t["type_code"].as_u64().unwrap() as u16,
            xrpl::type_code_of(def.kind),
            "type code for {}",
            def.name
        );
        assert_eq!(
            t["is_signing_field"].as_bool().unwrap(),
            def.signing,
            "isSigningField for {}",
            def.name
        );
    }
}

#[test]
fn transaction_type_codes_match_the_codec() {
    let v = vectors();
    let t = &v["tx_types"];
    assert_eq!(t["ConfidentialMPTConvert"].as_u64().unwrap() as u16, tx_type::CONFIDENTIAL_MPT_CONVERT);
    assert_eq!(t["ConfidentialMPTMergeInbox"].as_u64().unwrap() as u16, tx_type::CONFIDENTIAL_MPT_MERGE_INBOX);
    assert_eq!(t["ConfidentialMPTConvertBack"].as_u64().unwrap() as u16, tx_type::CONFIDENTIAL_MPT_CONVERT_BACK);
    assert_eq!(t["ConfidentialMPTSend"].as_u64().unwrap() as u16, tx_type::CONFIDENTIAL_MPT_SEND);
}

#[test]
fn the_variable_length_prefix_matches_the_codec_at_every_boundary() {
    let v = vectors();
    for c in v["vl"].as_array().unwrap() {
        let len = c["len"].as_u64().unwrap() as usize;
        assert_eq!(hex(&vl_prefix(len).unwrap()), s(c, "prefix"), "VL prefix for {len} bytes");
    }
    assert!(vl_prefix(918_745).is_err(), "the VL maximum must be enforced");
}

// ---------------------------------------------------------------------------
// Whole transactions
// ---------------------------------------------------------------------------

/// Rebuild each vector transaction with [`TxBuilder`] and compare all four
/// artefacts: unsigned bytes, signing bytes, signature and signed blob.
#[test]
fn transactions_serialise_and_sign_byte_for_byte_like_the_codec() {
    let v = vectors();
    for t in v["transactions"].as_array().unwrap() {
        let name = s(t, "name");
        let tx = &t["tx"];
        let (b, seed) = build_from_vector(&v, tx);

        assert_eq!(
            hex(&b.serialize(false).unwrap()),
            s(t, "unsigned_hex"),
            "{name}: unsigned serialisation"
        );

        let mut signing = 0x5354_5800u32.to_be_bytes().to_vec();
        signing.extend_from_slice(&b.serialize(true).unwrap());
        assert_eq!(hex(&signing), s(t, "signing_hex"), "{name}: signing serialisation");

        let key = AccountKey::from_family_seed(&seed).unwrap();
        // Deterministic arm — see `each_algorithm_signs_what_ripple_keypairs_signs`.
        let sig = key
            .sign_message_with(Hedge::DeterministicForVectors, &b.signing_message().unwrap())
            .unwrap();
        assert_eq!(hex(&sig), s(t, "signature"), "{name}: signature");

        let signed = b.blob(TXN_SIGNATURE, &sig);
        assert_eq!(hex(&signed.serialize(false).unwrap()), s(t, "signed_hex"), "{name}: signed blob");
    }
}

/// The transaction hash rippled reports.
///
/// The vectors do not carry it — `ripple-binary-codec` does not expose one —
/// so this checks the property that makes it useful: it changes when the blob
/// changes, and it is the documented `SHA512Half("TXN\0" ‖ blob)`.
#[test]
fn the_transaction_hash_is_over_the_signed_blob_with_its_prefix() {
    let v = vectors();
    let blob = unhex(&s(&v["transactions"][0], "signed_hex")).unwrap();
    let want = {
        let mut m = b"TXN\0".to_vec();
        m.extend_from_slice(&blob);
        sha512half(&m)
    };
    assert_eq!(transaction_hash(&blob), want);

    let mut altered = blob.clone();
    let last = altered.len() - 1;
    altered[last] ^= 0xFF;
    assert_ne!(transaction_hash(&altered), want);
}

/// Turn a vector's JSON transaction into a [`TxBuilder`], returning the seed
/// that signs it.
fn build_from_vector(v: &Value, tx: &Value) -> (TxBuilder, String) {
    let ty = tx["TransactionType"].as_str().unwrap();
    let code = v["tx_types"][ty].as_u64().unwrap() as u16;
    let account = tx["Account"].as_str().unwrap();
    let seed = v["keys"]
        .as_array()
        .unwrap()
        .iter()
        .find(|k| k["address"] == account)
        .expect("the signing key for this vector is not in the vectors file")["seed"]
        .as_str()
        .unwrap()
        .to_string();

    let mut b = TxBuilder::new()
        .u16(TRANSACTION_TYPE, code)
        .account(ACCOUNT, &decode_address(account).unwrap())
        .hash(MPT_ISSUANCE_ID, &unhex(tx["MPTokenIssuanceID"].as_str().unwrap()).unwrap())
        .u32(SEQUENCE, tx["Sequence"].as_u64().unwrap() as u32)
        .u32(FLAGS, tx["Flags"].as_u64().unwrap() as u32)
        .u32(LAST_LEDGER_SEQUENCE, tx["LastLedgerSequence"].as_u64().unwrap() as u32)
        .u32(NETWORK_ID, tx["NetworkID"].as_u64().unwrap() as u32)
        .drops(FEE, tx["Fee"].as_str().unwrap().parse().unwrap())
        .blob(SIGNING_PUB_KEY, &unhex(tx["SigningPubKey"].as_str().unwrap()).unwrap())
        .blob(ZK_PROOF, &unhex(tx["ZKProof"].as_str().unwrap()).unwrap());

    let opt_blob = |b: TxBuilder, def: FieldDef, key: &str| -> TxBuilder {
        match tx[key].as_str() {
            Some(h) => b.blob(def, &unhex(h).unwrap()),
            None => b,
        }
    };
    b = opt_blob(b, SENDER_ENCRYPTED_AMOUNT, "SenderEncryptedAmount");
    b = opt_blob(b, DESTINATION_ENCRYPTED_AMOUNT, "DestinationEncryptedAmount");
    b = opt_blob(b, ISSUER_ENCRYPTED_AMOUNT, "IssuerEncryptedAmount");
    b = opt_blob(b, AUDITOR_ENCRYPTED_AMOUNT, "AuditorEncryptedAmount");
    b = opt_blob(b, HOLDER_ENCRYPTED_AMOUNT, "HolderEncryptedAmount");
    b = opt_blob(b, HOLDER_ENCRYPTION_KEY, "HolderEncryptionKey");
    b = opt_blob(b, AMOUNT_COMMITMENT, "AmountCommitment");
    b = opt_blob(b, BALANCE_COMMITMENT, "BalanceCommitment");
    if let Some(d) = tx["Destination"].as_str() {
        b = b.account(DESTINATION, &decode_address(d).unwrap());
    }
    if let Some(h) = tx["BlindingFactor"].as_str() {
        b = b.hash(BLINDING_FACTOR, &unhex(h).unwrap());
    }
    if let Some(a) = tx["MPTAmount"].as_str() {
        b = b.u64(MPT_AMOUNT, a.parse().unwrap());
    }
    (b, seed)
}

// ---------------------------------------------------------------------------
// Two findings a review round raised that turned out to be wrong.
//
// Both are pinned rather than argued. A refuted finding whose refutation lives
// only in a disposition note is a finding somebody re-raises next round, and
// the second time nobody re-derives the argument.
// ---------------------------------------------------------------------------

/// **`REVIEW-015a` F-07, REFUTED.** A leg claimed a zero XRP Amount must
/// serialise as eight zero bytes, and that setting bit 62 produces
/// non-canonical output.
///
/// It does not: `ripple-binary-codec` encodes `Fee: "0"` as
/// `4000000000000000`, positive bit set, exactly as for any other drops value.
/// Checked against the codec, not reasoned about.
#[test]
fn a_zero_drops_amount_keeps_the_positive_bit() {
    let b = TxBuilder::new().drops(FEE, 0);
    let bytes = b.serialize(false).unwrap();
    // Field header for Amount(6) field 8 is one byte, 0x68.
    assert_eq!(hex(&bytes), "684000000000000000");

    // And a large but legal value still round-trips.
    let b = TxBuilder::new().drops(FEE, 5000);
    assert_eq!(hex(&b.serialize(false).unwrap()), "684000000000001388");
}

/// **`REVIEW-015b`, UPHELD.** An unbounded drops value would set bits the
/// format reserves.
#[test]
fn a_drops_value_above_the_total_supply_is_refused() {
    assert!(TxBuilder::new().drops(FEE, MAX_DROPS).serialize(false).is_ok());
    assert!(TxBuilder::new().drops(FEE, MAX_DROPS + 1).serialize(false).is_err());
    assert!(TxBuilder::new().drops(FEE, u64::MAX).serialize(false).is_err());
}

/// **`REVIEW-015a` F-02, REFUTED — but only a test settles it.**
///
/// A leg claimed `b58_encode`'s trailing cleanup strips legitimate payload
/// digits that happen to equal the zero character, corrupting addresses. The
/// argument against it is that the most significant base-58 digit of a non-zero
/// value can never be zero, so the cleanup can only ever fire on an all-zero
/// payload — where it is correct.
///
/// That argument is right, and it is exactly the kind of argument that is
/// wrong one time in twenty. So this brute-forces the round trip over a wide
/// spread of payloads, **including** every shape the finding named: leading
/// zero bytes, all-zero payloads, and values whose top digit is small.
#[test]
fn base58check_round_trips_over_a_wide_spread_of_payloads() {
    let mut cases: Vec<Vec<u8>> = vec![
        vec![0u8; 20],
        vec![0xFFu8; 20],
        {
            let mut v = vec![0u8; 20];
            v[19] = 1;
            v
        },
    ];
    // Every count of leading zero bytes, with a varying tail.
    for lead in 0..20usize {
        let mut v = vec![0u8; 20];
        for i in lead..20 {
            v[i] = ((i * 37 + lead * 11 + 1) & 0xFF) as u8;
        }
        cases.push(v);
    }
    // A deterministic spread, so a failure reproduces.
    let mut state: u64 = 0x9E37_79B9_7F4A_7C15;
    for _ in 0..2000 {
        let mut v = vec![0u8; 20];
        for b in v.iter_mut() {
            state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            *b = (state >> 33) as u8;
        }
        cases.push(v);
    }

    for v in &cases {
        let id: [u8; 20] = v.as_slice().try_into().unwrap();
        let addr = encode_address(&id);
        assert!(addr.starts_with('r'), "address does not start with r: {addr}");
        assert_eq!(
            decode_address(&addr).unwrap(),
            id,
            "round trip failed for payload {}",
            hex(&id)
        );
    }
}

/// The same, against the **vectors** — so the encoder is not merely
/// self-consistent. `ripple-address-codec` produced every address in the file.
#[test]
fn base58check_agrees_with_the_reference_codec_on_every_vector_key() {
    let v = vectors();
    for k in v["keys"].as_array().unwrap() {
        let id: [u8; 20] = unhex(&s(k, "account_id")).unwrap().try_into().unwrap();
        assert_eq!(encode_address(&id), s(k, "address"));
    }
}
