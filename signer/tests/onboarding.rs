//! Architecture §6 step 6's **falsifiers**.
//!
//! > *Falsified if: `tools/spike-keygen-2026-08-18/t-keygen-construction.ts`
//! > fails, or onboarding does not warn when the account carries
//! > `lsfDisableMaster`, a regular key or a signer list.*
//!
//! The first half is `tests/keygen_kat.rs`, which reproduces that spike's
//! vectors from a Rust implementation written from the ruling's prose. This
//! file is the second half, plus the parts of condition 2 that "warn" is
//! shorthand for.
//!
//! # ⚠ Why these tests are shaped the way they are
//!
//! `CLAIMS.md` E-113: a test written the same hour, guarding the ruling it was
//! written for, **could not check the thing its name promised** — it asserted
//! that two signatures differed, and recycled entropy still produces differing
//! signatures. The question that catches that is *what would this test do if
//! the property were false?*
//!
//! So these do not assert that "a warning appeared". They assert that the
//! **exact disclosure text** the ruling requires reached the holder, that it
//! reached them **before the seed was asked for**, and that a holder who does
//! not acknowledge it gets **no key at all**. Each has a control that fails if
//! the assertion could pass vacuously.

use wconf_signer::keygen;
use wconf_signer::ledger::{AccountSecurity, MpTokenState};
use wconf_signer::onboarding::*;
use wconf_signer::prover::hex;
use wconf_signer::xrpl;

/// The keygen ruling's Vector 1: a seed and the account it derives.
const SEED: &str = "sp6JdwovBCsiwnMhXuvZGZtPUoGVj";
const ACCOUNT_ID: [u8; 20] = [
    0x7F, 0x0B, 0xBA, 0x38, 0x25, 0x12, 0xC0, 0xA0, 0x0A, 0x16, 0x30, 0x50, 0x6A, 0xE4, 0x4E, 0xBE,
    0x8A, 0xC2, 0x0D, 0x27,
];

/// Vector 2's seed — a different account, for the mismatch case.
const OTHER_SEED: &str = "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n";

// ---------------------------------------------------------------------------
// A scripted holder
// ---------------------------------------------------------------------------

struct Script {
    answers: Vec<String>,
    secrets: Vec<String>,
    /// Everything the holder was shown, in order, tagged by how it was shown.
    /// Prompts count: a prompt is text on the holder's screen.
    transcript: Vec<String>,
    /// How many times a seed was asked for, and at which transcript position.
    secret_asked_at: Vec<usize>,
}

impl Script {
    fn new(answers: &[&str], secrets: &[&str]) -> Script {
        Script {
            answers: answers.iter().rev().map(|s| s.to_string()).collect(),
            secrets: secrets.iter().rev().map(|s| s.to_string()).collect(),
            transcript: Vec::new(),
            secret_asked_at: Vec::new(),
        }
    }

    fn shown(&self) -> String {
        self.transcript.join("\n")
    }

    /// Everything shown before the first time a seed was asked for.
    fn shown_before_the_seed(&self) -> String {
        match self.secret_asked_at.first() {
            Some(&i) => self.transcript[..i].join("\n"),
            None => self.shown(),
        }
    }
}

impl OnboardingIo for Script {
    fn tell(&mut self, text: &str) {
        self.transcript.push(text.to_string());
    }
    fn ask(&mut self, prompt: &str) -> Option<String> {
        self.transcript.push(prompt.to_string());
        self.answers.pop()
    }
    fn ask_secret(&mut self, prompt: &str) -> Option<zeroize::Zeroizing<String>> {
        self.secret_asked_at.push(self.transcript.len());
        self.transcript.push(prompt.to_string());
        self.secrets.pop().map(zeroize::Zeroizing::new)
    }
}

fn address() -> String {
    xrpl::encode_address(&ACCOUNT_ID)
}

fn clean() -> Assessment {
    Assessment::of(&AccountSecurity::default(), &MpTokenState::default())
}

fn with_security(s: AccountSecurity) -> Assessment {
    Assessment::of(&s, &MpTokenState::default())
}

fn registered(key: [u8; 33]) -> Assessment {
    Assessment::of(
        &AccountSecurity::default(),
        &MpTokenState { holder_encryption_key: Some(key), ..Default::default() },
    )
}

// ---------------------------------------------------------------------------
// Issue #11's three conditions
// ---------------------------------------------------------------------------

/// Each of the three, on its own, must flip the recommendation and add the
/// warning. **On its own** matters: `disable_master` also refuses in
/// `preflight`, so testing only that one would leave the two conditions that
/// branch nowhere else untested — which is the state the repository was in
/// until this milestone.
#[test]
fn each_of_issue_elevens_three_conditions_flips_the_recommendation_by_itself() {
    let cases: &[(&str, AccountSecurity)] = &[
        (
            "lsfDisableMaster is set",
            AccountSecurity { disable_master: true, ..Default::default() },
        ),
        (
            "a regular key is set",
            AccountSecurity { regular_key: Some("rSomeRegularKey".into()), ..Default::default() },
        ),
        ("a signer list is present", AccountSecurity { signer_lists: 1, ..Default::default() }),
    ];

    for (named, security) in cases {
        let a = with_security(security.clone());
        assert!(a.master_seed_is_retired(), "{named}: not detected");
        assert_eq!(
            a.recommended_source(),
            KeySource::Standalone,
            "{named}: the recommendation did not flip"
        );
        assert!(
            a.retired_master_conditions.contains(named),
            "{named}: not named individually; got {:?}",
            a.retired_master_conditions
        );
        assert!(
            a.required_disclosures().contains(&RETIRED_MASTER_KEY_WARNING),
            "{named}: the retired-master warning is not required"
        );
    }

    // The control. A clean account must NOT trigger any of it, or the three
    // assertions above would pass for a function that always says yes.
    let a = clean();
    assert!(!a.master_seed_is_retired(), "a clean account was reported as retired");
    assert_eq!(a.recommended_source(), KeySource::DerivedFromMasterSeed);
    assert!(!a.required_disclosures().contains(&RETIRED_MASTER_KEY_WARNING));
}

/// The disclosures reach the holder **before the seed is asked for**.
///
/// Ordering is the property, not presence. A warning shown after a holder has
/// typed their master seed into a process is not a warning; it is a receipt.
#[test]
fn every_required_disclosure_is_shown_before_the_seed_is_asked_for() {
    let addr = address();

    // ⚠ **Both a clean and a retired-master account.** A review leg pointed out
    // that driving only `clean()` leaves `RETIRED_MASTER_KEY_WARNING` — the one
    // disclosure the ruling's condition 2 is actually about — outside the
    // ordering assertion, because it is not in a clean account's required set.
    // A refactor that moved it after the seed prompt would have passed.
    let cases: Vec<(&str, Assessment, Vec<String>)> = vec![
        ("clean", clean(), vec!["derived-from-master-seed".into(), derived_phrase(&addr)]),
        (
            "retired master",
            with_security(AccountSecurity { regular_key: Some("rKey".into()), ..Default::default() }),
            vec![
                "derived-from-master-seed".into(),
                retired_override_phrase(&addr),
                derived_phrase(&addr),
            ],
        ),
    ];

    for (name, a, answers) in cases {
        let refs: Vec<&str> = answers.iter().map(String::as_str).collect();
        let mut s = Script::new(&refs, &[SEED]);
        let out = run(&mut s, &addr, &ACCOUNT_ID, &a);
        assert!(matches!(out, Outcome::Chosen { .. }), "{name}: {out:?}");

        let before = s.shown_before_the_seed();
        for d in a.required_disclosures() {
            assert!(
                before.contains(d),
                "{name}: a required disclosure was not shown before the seed was asked \
                 for:\n{d}"
            );
        }
        assert_eq!(s.secret_asked_at.len(), 1, "{name}: the seed was asked for more than once");

        // The control: `shown_before_the_seed` is not simply the whole
        // transcript, or every assertion above is vacuous.
        assert!(
            !before.contains("pk_A"),
            "{name}: the 'before' slice includes the result"
        );
    }

    // And the retired case's required set really does differ from the clean
    // one, or the loop above ran the same assertion twice.
    assert!(
        !clean().required_disclosures().contains(&RETIRED_MASTER_KEY_WARNING),
        "the two cases have the same required set"
    );
}

// ⚠ **What the test above pins, stated because a revert check made the answer
// less flattering than it looked.**
//
// On the derived-retired path the warning reaches the holder by **two**
// independent routes: `run`'s disclosure loop, and `derived`'s override block,
// which reprints it immediately before demanding the second phrase. Removing
// either one alone leaves the property standing, and the revert check showed
// exactly that — a single-edit revert of each did **not** fail this test.
// Removing **both** does fail it, which is what was actually verified.
//
// The duplication is deliberate: a holder overriding a recommendation should see
// what they are overriding at the moment they override it. But "two routes"
// means neither route is individually pinned here, and the honest place to say so
// is next to the test rather than in a session note nobody reads.
// `each_of_issue_elevens_three_conditions_flips_the_recommendation_by_itself` is
// what fails if the warning stops being *required*.

/// Every disclosure says the specific thing the ruling requires it to say.
///
/// ⚠ Asserting on wording rather than on presence, the way
/// `ledger::REMOTE_SOURCE_DISCLOSURE` is asserted. A disclosure that a later
/// edit can quietly soften into "your key is derived from your seed" is not a
/// disclosure, and nothing else in this file would notice.
#[test]
fn the_disclosures_say_what_the_ruling_requires() {
    let required: &[(&str, &str, &[&str])] = &[
        (
            "PERMANENT_DECRYPTION_CREDENTIAL",
            PERMANENT_DECRYPTION_CREDENTIAL,
            &[
                "PERMANENT DECRYPTION CREDENTIAL",
                "ENTIRE confidential history",
                "retroactively",
                "CANNOT BE UNDONE",
                "CANNOT BE ROTATED",
                "You will not know when a seed backup has been copied",
            ],
        ),
        (
            "RETIRED_MASTER_KEY_WARNING",
            RETIRED_MASTER_KEY_WARNING,
            &[
                "the master seed is NOT its spending authority",
                "FALSE for this account",
                "the confidentiality loss is the WHOLE loss",
                "recommended source for this account is a standalone",
            ],
        ),
        (
            "STANDALONE_SEED_OFFER",
            STANDALONE_SEED_OFFER,
            &["SECOND THING TO LOSE", "no rotation and no recovery"],
        ),
        (
            "THIRD_PARTY_WALLET_NOTICE",
            THIRD_PARTY_WALLET_NOTICE,
            &[
                // ⚠ The FIRST half of the sentence issue #10's Leg A drafted was
                // never pinned — only the second half was — so it could be
                // softened without failing anything. It names the derivation and
                // it names the condition; both are load-bearing.
                "If you choose the derived key source",
                "deterministically derived from your XRPL seed under the W-CONF derivation",
                "restore your public account but NOT your confidential balance",
                "REVIEW-012-RULING-keygen-2026-08-18.md",
                "NOT a published standard",
                // The other source, because this is shown before either is chosen.
                "no wallet recovers it, including this one",
            ],
        ),
        (
            "REGISTRATION_IS_IRREVERSIBLE",
            REGISTRATION_IS_IRREVERSIBLE,
            &["tecDUPLICATE", "locks its reserve", "IN PLAINTEXT"],
        ),
        (
            "WHAT_IS_NOT_HIDDEN",
            WHAT_IS_NOT_HIDDEN,
            &[
                "It hides the amount of a confidential TRANSFER, and your balance",
                "CONVERTING IN OR OUT PUBLISHES THE AMOUNT",
                "publicly recognisable as EXACTLY\n    ZERO",
                "issuer can decrypt every one of your balances",
                "No configuration removes that",
                "Devnet only",
            ],
        ),
    ];

    // Matching against whitespace-flattened text: the assertion is about the
    // sentence, not about where the line happens to wrap. A phrase that only
    // matched at one wrapping would break on every reflow and teach the next
    // reader to weaken the phrase instead of keeping it.
    let flat = |s: &str| s.split_whitespace().collect::<Vec<_>>().join(" ");
    for (name, text, phrases) in required {
        let body = flat(text);
        for p in *phrases {
            assert!(body.contains(&flat(p)), "{name} no longer says \"{p}\"");
        }
    }

    // And the standing prohibitions: no disclosure may claim what `CLAIMS.md`
    // P-5 forbids.
    for (name, text, _) in required {
        let lower = text.to_lowercase();
        for banned in ["secure", "audited", "production-ready", "non-custodial"] {
            if lower.contains(banned) {
                assert!(
                    lower.contains(&format!("not {banned}"))
                        || lower.contains(&format!("nothing here is {banned}"))
                        || lower.contains("nothing here is secure"),
                    "{name} uses \"{banned}\" outside a denial"
                );
            }
        }
    }
}

/// ⚠ **A disclosure shown before the choice may not assert the choice.**
///
/// `required_disclosures()` is emitted BEFORE the holder picks a key source, so
/// every sentence in it has to be true whichever source they go on to pick.
/// `THIRD_PARTY_WALLET_NOTICE` opened with *"Your confidential balance access is
/// deterministically derived from your XRPL seed"* — an accomplished fact about a
/// decision not yet made, false for the standalone source, on the exact screen
/// where the belief forms. `PERMANENT_DECRYPTION_CREDENTIAL` sat eight lines away
/// in the same file already saying "If you choose the derived key source".
///
/// The wording test above pins the corrected sentence. This pins the *shape*, so
/// that a disclosure added later cannot reintroduce it somewhere else.
/// `CLAIMS.md` E-159.
#[test]
fn a_pre_choice_disclosure_may_not_assert_a_source_that_is_not_chosen_yet() {
    // Phrases that assert the DERIVED source is in effect. Each is a claim about
    // an outcome, not about an option — so each must be conditioned.
    const ASSERTS_DERIVED: &[&str] = &[
        "derived from your XRPL seed",
        "derived from your master seed",
        "your master seed becomes",
        "your XRPL master seed becomes",
    ];
    const CONDITIONAL: &[&str] = &["If you choose", "if you choose"];

    let flat = |s: &str| s.split_whitespace().collect::<Vec<_>>().join(" ");

    for assessment in [
        clean(),
        with_security(AccountSecurity { disable_master: true, ..Default::default() }),
    ] {
        for d in assessment.required_disclosures() {
            let body = flat(d);
            for claim in ASSERTS_DERIVED {
                if !body.contains(&flat(claim)) {
                    continue;
                }
                assert!(
                    CONDITIONAL.iter().any(|c| body.contains(*c)),
                    "a disclosure shown BEFORE the key source is chosen asserts \
                     \"{claim}\" without conditioning it. It is false for a holder \
                     who goes on to choose the standalone source, and this screen is \
                     where they decide:\n\n{d}"
                );
            }
        }
    }
}


/// A holder who does not type the acknowledgement gets **no key**.
///
/// The three refusal points are separate: the key-source question, the
/// retired-master override, and the permanence phrase. Each is driven, and each
/// must end with nothing derived.
#[test]
fn nothing_is_derived_without_the_typed_acknowledgement() {
    let addr = address();

    // Wrong phrase at the permanence step.
    let mut s = Script::new(&["derived-from-master-seed", "yes"], &[SEED]);
    match run(&mut s, &addr, &ACCOUNT_ID, &clean()) {
        Outcome::Declined(why) => assert!(why.contains("permanence"), "{why}"),
        other => panic!("a wrong acknowledgement produced {other:?}"),
    }
    assert!(s.secret_asked_at.is_empty(), "the seed was asked for after a refused acknowledgement");

    // An unknown key source.
    let mut s = Script::new(&["whatever"], &[SEED]);
    match run(&mut s, &addr, &ACCOUNT_ID, &clean()) {
        Outcome::Declined(why) => assert!(why.contains("not a key source"), "{why}"),
        other => panic!("an unknown key source produced {other:?}"),
    }
    assert!(s.secret_asked_at.is_empty());

    // Input ends.
    let mut s = Script::new(&[], &[]);
    match run(&mut s, &addr, &ACCOUNT_ID, &clean()) {
        Outcome::Declined(why) => assert!(why.contains("input ended"), "{why}"),
        other => panic!("ended input produced {other:?}"),
    }

    // The control: the same script with the right phrase does produce a key.
    let mut s = Script::new(&["derived-from-master-seed", &derived_phrase(&addr)], &[SEED]);
    assert!(matches!(run(&mut s, &addr, &ACCOUNT_ID, &clean()), Outcome::Chosen { .. }));
}

/// Overriding the recommendation for a retired-master account costs a **second**
/// typed sentence, and that sentence is asked for **before** the seed.
#[test]
fn deriving_on_a_retired_master_account_costs_a_second_acknowledgement() {
    let addr = address();
    let a = with_security(AccountSecurity { signer_lists: 2, ..Default::default() });

    // Without the override: declined, and no seed asked for.
    let mut s = Script::new(&["derived-from-master-seed", "no"], &[SEED]);
    match run(&mut s, &addr, &ACCOUNT_ID, &a) {
        Outcome::Declined(why) => assert!(why.contains("retired-master-key override"), "{why}"),
        other => panic!("{other:?}"),
    }
    assert!(s.secret_asked_at.is_empty(), "the seed was asked for before the override");
    assert!(
        s.shown().contains(RETIRED_MASTER_KEY_WARNING),
        "the retired-master warning was not shown"
    );

    // With it: allowed, because the ruling says warn and offer, not refuse.
    let mut s = Script::new(
        &[
            "derived-from-master-seed",
            &retired_override_phrase(&addr),
            &derived_phrase(&addr),
        ],
        &[SEED],
    );
    match run(&mut s, &addr, &ACCOUNT_ID, &a) {
        Outcome::Chosen { source, .. } => assert_eq!(source, KeySource::DerivedFromMasterSeed),
        other => panic!("the override was not honoured: {other:?}"),
    }
    // Both phrases were demanded, and both were demanded before the seed.
    let before = s.shown_before_the_seed();
    assert!(before.contains(&retired_override_phrase(&addr)));
    assert!(before.contains(&derived_phrase(&addr)));
}

/// The derived path must not echo the seed the holder typed, or the secret it
/// produced.
#[test]
fn the_derived_path_never_echoes_the_seed_or_the_secret() {
    let addr = address();
    let mut s = Script::new(&["derived-from-master-seed", &derived_phrase(&addr)], &[SEED]);
    let out = run(&mut s, &addr, &ACCOUNT_ID, &clean());
    let pk = match out {
        Outcome::Chosen { public_key, standalone_secret, source } => {
            assert_eq!(source, KeySource::DerivedFromMasterSeed);
            assert!(standalone_secret.is_none(), "the derived path returned a raw secret");
            public_key
        }
        other => panic!("{other:?}"),
    };

    let shown = s.shown();
    assert!(!shown.contains(SEED), "the seed the holder typed was echoed back to the screen");

    // And the secret itself. It is not exposed by any API, so this is checked
    // against the one value that determines it: derive it independently and
    // look for its hex.
    let key = keygen::derive_from_master_seed(SEED, Some(&ACCOUNT_ID)).unwrap();
    let kp = key.into_keypair();
    assert!(!shown.contains(&hex(kp.secret())), "sk_A reached the screen");

    // Controls, so "contains nothing" is not passing for the wrong reason.
    assert!(shown.contains(&hex(&pk)), "pk_A was not shown, so the search above is vacuous");
    assert!(shown.contains(&addr), "the account was not shown");
    assert_eq!(&pk, kp.public(), "the flow derived a different key from the same seed");
}

/// The standalone path shows the secret **once**, and says what it costs.
#[test]
fn the_standalone_path_shows_its_secret_once_and_names_the_cost() {
    let addr = address();
    let mut s = Script::new(&["standalone", &standalone_phrase(&addr)], &[]);
    let (pk, sk) = match run(&mut s, &addr, &ACCOUNT_ID, &clean()) {
        Outcome::Chosen { source, public_key, standalone_secret } => {
            assert_eq!(source, KeySource::Standalone);
            (public_key, standalone_secret.expect("the standalone path returned no secret"))
        }
        other => panic!("{other:?}"),
    };
    assert!(s.secret_asked_at.is_empty(), "the standalone path asked for a master seed");

    let shown = s.shown();
    let sk_hex = hex(&sk);
    // ⚠ **Exactly once.** The screen says "this is the only time the secret is
    // shown", and an earlier draft printed it twice while saying so — caught by
    // a review leg, not by reading. The count is the assertion, because the
    // sentence is only true if the count is one.
    assert_eq!(
        shown.matches(&sk_hex).count(),
        1,
        "the standalone secret is shown {} times, and the screen says it is shown once",
        shown.matches(&sk_hex).count()
    );
    assert!(shown.contains(&hex(&pk)));
    assert!(shown.contains("ONLY TIME THE SECRET IS SHOWN"));
    assert!(shown.contains("SECOND THING TO LOSE"));
    // The generated pair must correspond, or the holder backs up a secret for a
    // key they are not registering.
    wconf_signer::prover::ElGamalKeypair::try_from_parts(sk, pk)
        .expect("the standalone path generated a mismatched keypair");
}

// ---------------------------------------------------------------------------
// Issue #10's benefit, executed rather than described
// ---------------------------------------------------------------------------

/// ADR-0001 §(e)'s **only** benefit: the key is recoverable from a backup the
/// holder already keeps. This runs it — seed in, registered key out, compared
/// against what the ledger holds.
#[test]
fn recovery_reproduces_a_registered_key_from_the_seed_alone() {
    let addr = address();
    let expected = *keygen::derive_from_master_seed(SEED, Some(&ACCOUNT_ID)).unwrap().public();

    let mut s = Script::new(&[], &[SEED]);
    match run(&mut s, &addr, &ACCOUNT_ID, &registered(expected)) {
        Outcome::Recovered { public_key } => assert_eq!(public_key, expected),
        other => panic!("recovery failed: {other:?}"),
    }
    let shown = s.shown();
    assert!(shown.contains("RECOVERED"));
    assert!(
        shown.contains(THIRD_PARTY_WALLET_NOTICE),
        "recovery did not say that other wallets will not do this"
    );
    // Enrolment must not have been offered — the key cannot be re-registered.
    assert!(!shown.contains("Which key source"), "a registered account was offered a choice");
}

/// And a seed that does not derive the registered key reports a **mismatch**,
/// not a success.
///
/// This is the arm that would silently pass if the comparison were dropped, so
/// it exists for the same reason `prover_pristine.rs` corrupts a nibble: a
/// checker that answers OK to everything makes the positive case vacuous.
#[test]
fn recovery_reports_a_mismatch_rather_than_a_success() {
    let addr = address();
    // A key that is registered but is not the derived one — which is exactly
    // what a standalone-source holder has.
    let standalone = *wconf_signer::prover::ElGamalKeypair::generate().unwrap().public();

    let mut s = Script::new(&[], &[SEED]);
    match run(&mut s, &addr, &ACCOUNT_ID, &registered(standalone)) {
        Outcome::RecoveryMismatch { registered: r, derived: d } => {
            assert_eq!(r, standalone);
            assert_ne!(d, standalone);
        }
        other => panic!("a mismatched seed produced {other:?}"),
    }
    assert!(s.shown().contains("MISMATCH"));

    // A seed for a *different account* is refused earlier still, by the
    // AccountID binding, rather than being reported as a mismatch.
    let mut s = Script::new(&[], &[OTHER_SEED]);
    match run(&mut s, &addr, &ACCOUNT_ID, &registered(standalone)) {
        Outcome::Refused(why) => assert!(why.contains("MASTER"), "{why}"),
        other => panic!("a seed for another account produced {other:?}"),
    }

    // Skipping recovery derives nothing.
    let mut s = Script::new(&[], &[""]);
    match run(&mut s, &addr, &ACCOUNT_ID, &registered(standalone)) {
        Outcome::Declined(why) => assert!(why.contains("skipped"), "{why}"),
        other => panic!("{other:?}"),
    }
}

/// The key-source token that goes into a holder profile round-trips.
#[test]
fn the_key_source_names_round_trip() {
    for s in [KeySource::DerivedFromMasterSeed, KeySource::Standalone] {
        assert_eq!(KeySource::parse(s.as_str()), Some(s));
    }
    assert_eq!(KeySource::parse("derived"), None);
    assert_eq!(KeySource::parse(""), None);
}

// ---------------------------------------------------------------------------
// The holder profile's two key sources
// ---------------------------------------------------------------------------
//
// A choice made in the flow above is only real if the signer can be configured
// to use it, so the profile carries it and these are the tests for that.

use wconf_signer::holder::{HolderProfile, PROMPT_FOR_SEED};

const ISSUANCE_HEX: &str = "004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8";

fn profile(extra: serde_json::Value) -> String {
    let mut base = serde_json::json!({
        "account_seed": SEED,
        "issuance_id": ISSUANCE_HEX,
        "fee_drops": 10u64,
        "network_id": 2u32,
    });
    for (k, v) in extra.as_object().unwrap() {
        base.as_object_mut().unwrap().insert(k.clone(), v.clone());
    }
    base.to_string()
}

/// The derived source takes its key from `account_seed`, and the profile holds
/// **no ElGamal secret at all**.
#[test]
fn a_derived_profile_carries_no_elgamal_secret_and_still_produces_the_right_key() {
    let expected = *keygen::derive_from_master_seed(SEED, Some(&ACCOUNT_ID)).unwrap().public();

    let p = HolderProfile::from_json(&profile(
        serde_json::json!({ "elgamal_key_source": "derived-from-master-seed" }),
    ))
    .expect("a derived profile must load");

    assert_eq!(p.key_source, KeySource::DerivedFromMasterSeed);
    assert_eq!(p.elgamal.public(), &expected, "the profile derived a different key");
    assert_eq!(p.account.account_id(), ACCOUNT_ID);
    assert!(!p.seed_was_prompted);

    // And it must refuse to also carry a secret: a profile that declares the
    // derived source while carrying `elgamal_sk` is one whose author believed
    // something the signer would not do, and both values are valid-looking hex.
    for stray in ["elgamal_sk", "elgamal_pk"] {
        let mut extra = serde_json::json!({ "elgamal_key_source": "derived-from-master-seed" });
        extra.as_object_mut().unwrap().insert(stray.into(), serde_json::json!("00".repeat(33)));
        let err = HolderProfile::from_json(&profile(extra))
            .expect_err(&format!("a derived profile carrying `{stray}` was accepted"));
        let text = format!("{err}");
        assert!(text.contains("derived-from-master-seed"), "{text}");
        assert!(text.contains("remove them"), "{text}");
    }
}

/// The standalone source needs both halves, and they must correspond.
#[test]
fn a_standalone_profile_needs_a_corresponding_pair() {
    let kp = wconf_signer::prover::ElGamalKeypair::generate().unwrap();
    let good = serde_json::json!({
        "elgamal_key_source": "standalone",
        "elgamal_sk": hex(kp.secret()),
        "elgamal_pk": hex(kp.public()),
    });
    let p = HolderProfile::from_json(&profile(good)).expect("a standalone profile must load");
    assert_eq!(p.key_source, KeySource::Standalone);
    assert_eq!(p.elgamal.public(), kp.public());

    // ⚠ The failure this check exists for. A pk that is not sk·G makes the
    // holder register a key nobody holds the secret for and then encrypt their
    // whole balance to it — permanently, because there is no rotation.
    let other = wconf_signer::prover::ElGamalKeypair::generate().unwrap();
    let mismatched = serde_json::json!({
        "elgamal_key_source": "standalone",
        "elgamal_sk": hex(kp.secret()),
        "elgamal_pk": hex(other.public()),
    });
    let err = HolderProfile::from_json(&profile(mismatched))
        .expect_err("a mismatched keypair was accepted");
    let text = format!("{err}");
    assert!(text.contains("not sk·G"), "{text}");
    assert!(text.contains("permanently unreachable"), "{text}");

    // And half a pair is refused by name rather than by serde's field list.
    let half = serde_json::json!({
        "elgamal_key_source": "standalone",
        "elgamal_sk": hex(kp.secret()),
    });
    let err = HolderProfile::from_json(&profile(half)).expect_err("half a pair was accepted");
    assert!(format!("{err}").contains("not derived from anything"), "{err}");
}

/// A profile written before step 6 has no `elgamal_key_source`. It is read as
/// `standalone` — which is what it always was — and **not** silently upgraded.
#[test]
fn a_profile_with_no_declared_source_is_standalone_not_derived() {
    let kp = wconf_signer::prover::ElGamalKeypair::generate().unwrap();
    let p = HolderProfile::from_json(&profile(serde_json::json!({
        "elgamal_sk": hex(kp.secret()),
        "elgamal_pk": hex(kp.public()),
    })))
    .expect("a pre-step-6 profile must still load");
    assert_eq!(p.key_source, KeySource::Standalone);
    assert_eq!(p.elgamal.public(), kp.public(), "an undeclared profile's key was replaced");
}

/// An unrecognised source name is refused, not guessed at.
#[test]
fn an_unknown_key_source_is_refused_by_name() {
    let err = HolderProfile::from_json(&profile(
        serde_json::json!({ "elgamal_key_source": "derived" }),
    ))
    .expect_err("an unknown key source was accepted");
    let text = format!("{err}");
    assert!(text.contains("\"derived\""), "{text}");
    assert!(text.contains("derived-from-master-seed"), "{text}");
}

/// `"account_seed": "prompt"` asks the caller for the seed. With the derived
/// source that leaves **no secret on disk at all**, which is the only
/// arrangement in this project where the ruling's §4 actually holds.
#[test]
fn a_prompted_seed_keeps_every_secret_off_disk() {
    let json = profile(serde_json::json!({
        "account_seed": PROMPT_FOR_SEED,
        "elgamal_key_source": "derived-from-master-seed",
    }));
    // Not a secret anywhere in the file.
    assert!(!json.contains(SEED), "the profile fixture still contains a seed");

    let p = HolderProfile::from_json_with(&json, || Some(zeroize::Zeroizing::new(SEED.to_string())))
        .expect("a prompted profile must load when the caller can prompt");
    assert!(p.seed_was_prompted);
    assert_eq!(p.account.account_id(), ACCOUNT_ID);
    assert_eq!(
        p.elgamal.public(),
        keygen::derive_from_master_seed(SEED, Some(&ACCOUNT_ID)).unwrap().public()
    );

    // A caller that cannot prompt is told so rather than inventing a seed.
    let err = HolderProfile::from_json(&json).expect_err("a prompted profile loaded with no seed");
    assert!(format!("{err}").contains("its own terminal"), "{err}");

    // An empty answer is not a seed.
    let err = HolderProfile::from_json_with(&json, || Some(zeroize::Zeroizing::new("   ".into())))
        .expect_err("an empty answer was accepted as a seed");
    assert!(format!("{err}").contains("its own terminal"), "{err}");
}

// ---------------------------------------------------------------------------
// The daemon's own banner
// ---------------------------------------------------------------------------

/// ⚠ **These constants exist because a false sentence lived where nothing
/// checked it.**
///
/// The daemon's key-source banner was six inline `eprintln!` lines in `main.rs`,
/// and `REVIEW-020` round two found a category error in them: *"neither key can
/// be ROTATED: XLS-0096 has no rotation and no recovery, at any level."* XLS-0096
/// governs the ElGamal key and says nothing about XRPL account keys, and an
/// XRPL account's spending authority very much can be moved — `SetRegularKey`
/// and `lsfDisableMaster` are the mechanism, and **detecting them is what this
/// milestone built**. The banner contradicted the warning printed a few lines
/// below it.
///
/// Every other disclosure in this project is a constant with a wording test.
/// This is that test.
#[test]
fn the_daemon_banner_attributes_each_rule_to_the_layer_that_makes_it() {
    let flat = |s: &str| s.split_whitespace().collect::<Vec<_>>().join(" ");

    let derived = flat(DERIVED_SOURCE_BANNER);
    // The ElGamal key's rule, attributed to XLS-0096.
    assert!(
        derived.contains("The ELGAMAL key cannot be rotated: XLS-0096 has no rotation and no recovery"),
        "the derived banner no longer attributes non-rotation to the ElGamal key"
    );
    // The benefit, attributed to the W-CONF derivation and conditioned on #10.
    assert!(derived.contains("RECONSTRUCTED from this seed under the W-CONF derivation"));
    assert!(derived.contains("only where that derivation is reachable (issue #10)"));
    // The account key's rule, which is a different rule.
    assert!(
        derived.contains("What an XRPL account CAN move is its spending authority"),
        "the derived banner no longer says an account's spending authority can move"
    );

    // ⚠ **The negative.** Only this catches the sentence coming back, and a
    // positive assertion never would have.
    for banner in [DERIVED_SOURCE_BANNER, STANDALONE_SOURCE_BANNER, DERIVED_ON_RETIRED_MASTER] {
        let f = flat(banner);
        assert!(
            !f.contains("Neither key can be ROTATED") && !f.contains("neither key can be rotated"),
            "a banner attributes both keys' rules to one layer again:\n{banner}"
        );
    }

    // The standalone source's difference from the derived one is the whole
    // reason there are two, so it is asserted rather than assumed.
    let standalone = flat(STANDALONE_SOURCE_BANNER);
    assert!(standalone.contains("NOTHING reconstructs it"));
    assert!(standalone.contains("second thing to lose"));
    assert!(
        !standalone.contains("RECONSTRUCTED"),
        "the standalone banner claims reconstruction, which nothing provides for it"
    );

    // The seed-on-disk pair say opposite things, and both name §4.
    assert!(flat(DERIVED_SEED_ON_DISK).contains("section 4 forbids that for anything real"));
    // ⚠ The prompted line must claim what this PROGRAM does, not what the
    // machine does. `claims-check` caught the stronger sentence — "No secret is
    // on disk for this holder" — which nothing here can support: `mlock` is not
    // implemented, so the OS may page a seed out by a route this program does
    // not control.
    let prompted = flat(DERIVED_SEED_PROMPTED);
    assert!(prompted.contains("the profile carries no secret"));
    assert!(prompted.contains("This program writes no secret to disk"));
    assert!(prompted.contains("mlock is not implemented"));
    assert!(
        !prompted.contains("No secret is on disk"),
        "the prompted line claims more than mlock-less zeroization supports:\n{DERIVED_SEED_PROMPTED}"
    );
    assert!(
        flat(DERIVED_SEED_ON_DISK).contains("in the profile file, in plaintext"),
        "the on-disk line no longer says where the seed is"
    );

    // And no banner may claim what P-5 forbids.
    for banner in [
        DERIVED_SOURCE_BANNER,
        STANDALONE_SOURCE_BANNER,
        DERIVED_ON_RETIRED_MASTER,
        STANDALONE_ON_RETIRED_MASTER,
        DERIVED_SEED_ON_DISK,
        DERIVED_SEED_PROMPTED,
    ] {
        let lower = banner.to_lowercase();
        for banned in ["is secure", "audited", "production-ready", "non-custodial"] {
            assert!(!lower.contains(banned), "a banner says `{banned}`:\n{banner}");
        }
    }
}

/// ⚠ **`onboard` refuses to start if any argument decodes as a family seed**,
/// and that refusal is a claim, so it gets a falsifier.
///
/// argv is visible to every process on the machine — the issue #1 threat model
/// puts one there — and a pasted seed lands in the shell's history file, where
/// it outlives the session. Under the ruled derivation that seed is a permanent
/// decryption credential, so the exposure does not expire either.
///
/// The check lives in `onboarding` rather than in the binary's `main` precisely
/// so this test can exist: a refusal inside a `fn main` is a claim with no
/// falsifier, which is what the README used to describe.
#[test]
fn a_family_seed_on_argv_is_recognised_and_ordinary_arguments_are_not() {
    // Both seed types, because catching only one is worse than catching none.
    for seed in [SEED, OTHER_SEED] {
        assert!(looks_like_a_family_seed(seed), "a real family seed was not recognised: {seed}");
    }

    // ⚠ The controls, and they are the point. A shape heuristic on a leading
    // `s` plus a length refuses the first of these and this must not.
    for ordinary in [
        "s3.example.com/rpc-endpoint-for-devnet",
        "https://s.devnet.rippletest.net:51234/",
        &address(),
        "004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8",
        "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4m", // one character off — checksum fails
        "",
        "prompt",
    ] {
        assert!(
            !looks_like_a_family_seed(ordinary),
            "an ordinary argument was refused as a seed: {ordinary}"
        );
    }
}
