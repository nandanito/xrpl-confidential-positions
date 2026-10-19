//! B-23 replaced the profile's parse MECHANISM. These pin what it preserved —
//! **and one thing it did not.**
//!
//! `holder.rs` used to parse the profile twice: once into a `serde_json::Value`
//! to name a stale field, once into `RawProfile`. The first parse built a heap
//! AST holding the seed as a `String` that `Zeroize` cannot reach, so B-23
//! **deleted** it — the stale-field check reads field NAMES, and
//! `BTreeMap<String, IgnoredAny>` gets those without allocating any value.
//!
//! ⚠⚠ **THE SWAP IS NOT FULLY BEHAVIOUR-PRESERVING, AND THIS FILE CLAIMED IT WAS
//! (`REVIEW-031b`).** The old `Value` parse *validated* every value as it built
//! it; `IgnoredAny` skips values without validating them. So a **stale** field
//! carrying a JSON value serde_json would reject — `1e999`, or a lone surrogate
//! `"\uD800"` — used to produce `ProfileError::Json` and now produces
//! `ProfileError::Stale`. **Both still refuse the profile**, so the change is in
//! *which* error, not in what is accepted. `the_stale_field_now_wins_over_a_bad_value`
//! pins the new behaviour rather than letting this file keep asserting the old.
//!
//! ⚠ **A mechanism swap that MOSTLY preserves behaviour is exactly the kind of
//! change nothing else here would catch.** Every other B-23 check is about *memory* —
//! `check-zeroize-bounds` part 6 pins the source line, and the reverts measure
//! what breaks. **None of them would notice if the new parse stopped detecting a
//! stale field, or started reporting a different error for a non-object.** The
//! tests below are that falsifier, and they were written against the behaviour
//! **before** the swap was reasoned about rather than after.
//!
//! ⚠ **This said *"These four tests"* and there were five — B-24 added the fifth
//! and rewrote the paragraph two lines above the number without touching it
//! (`REVIEW-032b`, `CLAIMS.md` E-201).** The count is gone rather than
//! corrected: **a number no one can derive is a claim with no falsifier**, and
//! this file has no way to count its own `#[test]` attributes.
//!
//! A second difference, this one benign: a map parse REFUSES `[1,2]` where
//! `Value` accepted it and returned `None` from `as_object()`. Both paths then
//! fall through to `RawProfile` and produce the same error, which is what
//! `a_non_object_still_reaches_the_same_error` exists to hold. ⚠ **That test can
//! itself false-pass if the map scan is ever made fail-fast** — it would return
//! its own `Json` error without `RawProfile` being reached — so it asserts the
//! `RawProfile`-specific message, not just the variant (`REVIEW-031b`).

use wconf_signer::holder::{HolderProfile, ProfileError};

fn base(extra: &str) -> String {
    format!(r#"{{"account_seed":"sp6JdwovBCsiwnMhXuvZGZtPUoGVj","elgamal_key_source":"derived-from-master-seed","issuance_id":"{}","network_id":2,"fee_drops":10{}}}"#,
        "aa".repeat(24), extra)
}

/// ⚠⚠ **THE FIRST VERSION OF THIS TEST FALSE-PASSED, AND BREAKING THE CODE IS
/// THE ONLY REASON ANYONE KNOWS.** It asserted on SUBSTRINGS — that the message
/// contained `"balance"` and `"ledger"`. Disabling the stale-field scan entirely
/// left it GREEN, because `deny_unknown_fields` then produces
///
///   `unknown field `balance`, expected one of `account_seed`, ...,
///    `ledger_endpoint`, ...`
///
/// which contains `"balance"` (serde names the unknown field) **and contains
/// `"ledger"` — inside `ledger_endpoint`, one of the EXPECTED-field names serde
/// lists.** Two assertions, both satisfied, neither touching the property.
///
/// ⚠ **`CLAIMS.md` E-164's shape, and the substring is what made it possible.**
/// The check is now on the ERROR VARIANT, which has exactly one producer. It was
/// re-verified by re-applying the same break: the variant assertion FAILS.
/// `CLAIMS.md` E-193.
#[test]
fn a_stale_field_is_still_named_after_the_parse_changed() {
    let err = HolderProfile::from_json(&base(r#","balance":7"#)).expect_err("stale accepted");
    match err {
        ProfileError::Stale { field, now } => {
            assert_eq!(field, "balance", "named the wrong field");
            assert!(now.contains("ConfidentialBalanceSpending"), "wrong replacement: {now}");
        }
        other => panic!(
            "a stale field produced {other:?}, not ProfileError::Stale. The field-name scan \
             is not running - serde's `deny_unknown_fields` is catching it instead, and the \
             operator loses the sentence saying WHERE the value moved to"
        ),
    }
}

#[test]
fn a_missing_seed_is_still_refused() {
    let j = base("").replace(r#""account_seed":"sp6JdwovBCsiwnMhXuvZGZtPUoGVj","#, "");
    let err = HolderProfile::from_json(&j).expect_err("missing account_seed accepted");
    // Variant, then content. `Json` has one producer here: serde's missing-field error.
    match err {
        ProfileError::Json(ref m) => assert!(m.contains("account_seed"), "{m}"),
        ref other => panic!("expected ProfileError::Json, got {other:?}"),
    }
}

#[test]
fn a_non_object_still_reaches_the_same_error() {
    // ⚠ **Two shapes, because ONE of them cannot tell the two parses apart.**
    //
    // `[1,2]`: `Value` accepted it and `as_object()` gave `None`; the map scan
    // refuses it. Both fall through to `RawProfile` — ⚠ **and serde
    // deserialises a struct from a SEQUENCE positionally**, so the error is
    // about field 0 (`account_seed`, a string) and never names `RawProfile`.
    // A first version of this test asserted `contains("RawProfile")` here and
    // FAILED for that reason; the discriminator is the map scan's own wording.
    //
    // `"hello"`: not a sequence, so `RawProfile` is named outright.
    for (raw, must_name_struct) in [("[1,2]", false), (r#""hello""#, true)] {
        let err = HolderProfile::from_json(raw).expect_err("{raw} accepted");
        match err {
            ProfileError::Json(ref m) => {
                assert!(m.contains("invalid type"), "{raw}: {m}");
                // ⚠ The keys-only scan says "expected a map". If that reaches the
                // caller, `RawProfile` was never tried and this test would
                // otherwise pass on the wrong parse's error (`REVIEW-031b`).
                assert!(
                    !m.contains("expected a map"),
                    "{raw}: the map scan's error escaped; RawProfile was never reached: {m}"
                );
                if must_name_struct {
                    assert!(m.contains("RawProfile"), "{raw}: {m}");
                }
            }
            ref other => panic!("{raw}: expected ProfileError::Json, got {other:?}"),
        }
    }
}

/// ⚠ **The one thing the swap did NOT preserve, pinned so it cannot drift back
/// into being described as preserved.** `REVIEW-031b`; `CLAIMS.md` E-197.
///
/// `IgnoredAny` skips a value without validating it, so a stale field whose value
/// serde_json would reject now reports `Stale` where it once reported `Json`.
/// **Both refuse the profile** — this is about which error the operator sees, and
/// `Stale` is arguably the more useful one because it names where the field went.
/// **It is still a behaviour change and it was claimed as none.**
#[test]
fn the_stale_field_now_wins_over_a_bad_value() {
    for extra in [r#","balance":1e999"#, r#","balance":"\uD800""#] {
        let err = HolderProfile::from_json(&base(extra)).expect_err("accepted");
        match err {
            ProfileError::Stale { field, .. } => assert_eq!(field, "balance"),
            other => panic!(
                "{extra} gave {other:?}. Under the pre-B-23 `serde_json::Value` parse this \
                 was ProfileError::Json; this file's header records the change. If it is \
                 Json again, the parse mechanism moved back and the header is stale"
            ),
        }
    }
}

#[test]
fn invalid_json_is_still_a_json_error() {
    let err = HolderProfile::from_json("{oops").expect_err("garbage accepted");
    assert!(matches!(err, ProfileError::Json(_)), "expected ProfileError::Json, got {err:?}");
}

/// ⚠ **B-24's OWN unnamed behaviour change, pinned for the same reason
/// `the_stale_field_now_wins_over_a_bad_value` pins B-23's.** `REVIEW-032s`;
/// `CLAIMS.md` B-25, E-201.
///
/// B-24 moved `AccountKey::from_family_seed` out from above the `key_source`
/// match into the standalone arm, to stop the derived path decoding the seed
/// twice. **The seed is therefore no longer validated before the branch**, so a
/// malformed seed reports whatever the branch reports. Before B-24 all four of
/// these were `ProfileError::Field("account_seed: …")`.
///
/// ⚠ **All four still REFUSE the profile.** This is about which error the
/// operator sees. It is recorded because B-24's comment listed what the change
/// gave up and did not list this — the same omission `REVIEW-031` found in
/// B-23's `IgnoredAny` swap, one milestone later.
#[test]
fn a_malformed_seed_reports_the_branch_s_error_not_the_seed_s() {
    fn err(src: &str, extra: &str) -> String {
        let j = format!(
            r#"{{"account_seed":"NOT-A-SEED","elgamal_key_source":"{src}","issuance_id":"00000000000000000000000000000000000000000000000A","network_id":2,"fee_drops":10{extra}}}"#
        );
        format!("{:?}", HolderProfile::from_json(&j).expect_err("a malformed seed was accepted"))
    }

    for (src, extra, want) in [
        ("derived-from-master-seed", "", "Keygen"),
        ("standalone", "", "KeySourceFields"),
        ("bogus-source", "", "UnknownKeySource"),
        ("derived-from-master-seed", r#","elgamal_sk":"00""#, "KeySourceFields"),
    ] {
        let e = err(src, extra);
        assert!(
            e.starts_with(want),
            "`{src}`{extra} gave {e}, expected {want}. Before B-24 every one of these was \
             Field(\"account_seed: …\") because the decode ran above the key_source match. \
             If this is Field again, the decode moved back and the derived path is \
             decoding the seed twice — which is the defect B-24 exists to remove"
        );
    }
}
