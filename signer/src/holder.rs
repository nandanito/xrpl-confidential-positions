//! What the signer knows about the holder **that a node cannot tell it**.
//!
//! # ⚠ This file used to carry ledger state. It does not any more
//!
//! Until 2026-08-19 this profile held the sequence number, the confidential
//! balance and its ciphertext, `ConfidentialBalanceVersion`, the issuer key,
//! the auditor key, whether this holder's key was registered, and a
//! hand-maintained map of other holders' `HolderEncryptionKey`. All of it was
//! **trusted input from a file**, and everything downstream inherited that
//! trust. Architecture §6 step 2 replaced every one of those with a read
//! ([`crate::ledger`]).
//!
//! What is left is what a ledger read cannot produce:
//!
//! * **Secrets.** An XRPL family seed and an ElGamal keypair. These have no
//!   business coming from a node and never will.
//! * **Which position.** `issuance_id` says what this signer is for.
//! * **Policy.** The fee it is willing to pay and how far it will search when
//!   recovering an amount from a ciphertext. A node does not get to choose
//!   either — a fee read from a hostile node is a way to drain XRP, and a
//!   search bound read from one is a way to make the confirmation unreadable.
//! * **Where to read.** The endpoint, which is the operator's trust decision.
//!
//! **There is no longer any path by which ledger state reaches the signer from
//! a file.** [`crate::ledger::LedgerSource`] is the only way in, and
//! `deny_unknown_fields` below means an old profile fails loudly rather than
//! having its stale ledger fields quietly ignored.
//!
//! # ⚠ Devnet keys only
//!
//! ~~Both keys here are Devnet throwaways. The ElGamal key comes from
//! `mpt_generate_keypair`, which is **not** the ruled keygen — that is
//! REVIEW-012c, architecture §6 step 6.~~ **Half struck 2026-08-20: step 6 is
//! built.** The ElGamal key now comes from one of **two named sources**
//! ([`crate::onboarding::KeySource`]), and the ruled derivation is one of them.
//! What is unchanged is that every account this project holds is a Devnet
//! throwaway and `CLAIMS.md` P-5 forbids calling any of it secure. Nothing
//! loaded through this module should ever hold value.
//!
//! # The two key sources, and what each one costs
//!
//! * **`derived-from-master-seed`** — REVIEW-012c's construction, applied to
//!   `account_seed`. The profile carries **no ElGamal secret at all**, and with
//!   `"account_seed": "prompt"` it carries no secret of any kind: the seed is
//!   read by the daemon in its own window at start. That is the only
//!   arrangement in this project where the ruling's §4 — *plaintext seed and
//!   `sk_A` are never written to non-volatile storage* — actually holds.
//! * **`standalone`** — an independent ElGamal secret in `elgamal_sk` /
//!   `elgamal_pk`. This is what every profile before 2026-08-20 was, unnamed.
//!   It is the honest source for a holder whose master key has been retired,
//!   and it is **a second thing to lose**.
//!
//! An absent `elgamal_key_source` is read as `standalone`, because that is what
//! those profiles already were. It is not silently upgraded.
//!
//! # ⚠ The seed's residue in this file — `CLAIMS.md` B-23
//!
//! This module is where a plaintext family seed **enters the process**, and
//! until 2026-08-27 every copy it made was dropped unwiped. B-23 is the second
//! half of B-22's ruled unit — *the seed's owned lifetime* — and the sites were
//! named by `REVIEW-029c` before any of this was written:
//!
//! * `raw`, the whole profile as read from disk. Now `Zeroizing`.
//! * The `serde_json::Value` AST. ⚠ **Deleted, not wiped** — the stale-field
//!   check reads names, so the values are skipped and the seed is never
//!   allocated a second time.
//! * [`RawProfile::account_seed`]. Now `Zeroizing<String>`, wrapped inside the
//!   deserialiser so no caller can bind it bare.
//! * The `seed` local. Now `Zeroizing<String>`, **moved** out of the profile on
//!   the file path rather than cloned.
//!
//! ⚠ **What is NOT covered, named rather than argued away:** `serde_json`'s own
//! escape-decoding scratch buffer is owned by that crate and is unreachable from
//! here — the same species of residual as B-21's SHA-512 block buffer, with the
//! same recorded search. `CLAIMS.md` P-5 governs what may be claimed for any of
//! it: this narrows a window, it removes no channel.
//!
//! ⚠ **Not scoped by profile regime, and both `REVIEW-029` legs rejected doing
//! so independently.** A file-based profile already has the seed on disk — that
//! is a *disclosed* residual, and it is not a reason to keep an *avoidable*
//! memory one. Conditioning cryptographic hygiene on an application config mode
//! breaks the layering besides.

use crate::keygen;
use crate::onboarding::KeySource;
use crate::prover::ElGamalKeypair;
use crate::xrpl::{self, AccountKey};
use serde::Deserialize;
use std::path::Path;
use zeroize::Zeroizing;

/// The literal `account_seed` value that means *ask me at start*.
///
/// Ruling §5 item 3: seed entry happens only in the signer's own local UI. A
/// profile file is neither the browser nor IPC, so it does not violate that
/// sentence — but it does put a plaintext seed on disk, which §4 forbids. This
/// sentinel is the way out, and it is opt-in because the Devnet drivers run the
/// daemon without a terminal.
pub const PROMPT_FOR_SEED: &str = "prompt";

/// Devnet. `network_id` 2. Never mainnet, at any phase, for any reason.
pub const DEVNET_NETWORK_ID: u32 = 2;

/// Fields this profile used to carry and no longer does.
///
/// Named individually so that loading an old profile says *why* rather than
/// producing serde's "unknown field" list and leaving the operator to guess
/// whether the value was dropped or renamed.
const MOVED_TO_THE_LEDGER: &[(&str, &str)] = &[
    ("balance", "decrypted from ConfidentialBalanceSpending"),
    ("balance_ciphertext", "MPToken.ConfidentialBalanceSpending"),
    ("balance_version", "MPToken.ConfidentialBalanceVersion"),
    ("holder_key_registered", "presence of MPToken.HolderEncryptionKey"),
    ("issuer_encryption_key", "MPTokenIssuance.IssuerEncryptionKey"),
    ("auditor_encryption_key", "MPTokenIssuance.AuditorEncryptionKey"),
    ("sequence", "AccountRoot.Sequence"),
    ("last_ledger_sequence", "the validated ledger index plus a window"),
    ("destination_keys", "the destination's own MPToken.HolderEncryptionKey"),
];

#[derive(Debug)]
pub enum ProfileError {
    Io(String),
    Json(String),
    Field(String),
    /// The profile named a network that is not Devnet. **Refused.**
    NotDevnet(u32),
    /// The profile carries a field that is now read from the ledger.
    Stale { field: &'static str, now: &'static str },
    /// `elgamal_key_source` is not one of the two names.
    UnknownKeySource(String),
    /// The declared key source and the fields present do not agree.
    KeySourceFields { source: &'static str, detail: &'static str },
    /// `account_seed` is `"prompt"` and this caller cannot prompt.
    SeedPromptUnavailable,
    /// The derivation refused the seed.
    Keygen(String),
    /// `elgamal_pk` is not `elgamal_sk·G`.
    KeypairMismatch(String),
}

impl std::fmt::Display for ProfileError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProfileError::Io(s) => write!(f, "reading the holder profile: {s}"),
            ProfileError::Json(s) => write!(f, "parsing the holder profile: {s}"),
            ProfileError::Field(s) => write!(f, "holder profile: {s}"),
            ProfileError::NotDevnet(n) => write!(
                f,
                "the profile names network_id {n}. This signer refuses every network but \
                 Devnet ({DEVNET_NETWORK_ID}), at any phase, for any reason"
            ),
            ProfileError::UnknownKeySource(s) => write!(
                f,
                "holder profile: `elgamal_key_source` is \"{s}\". It must be \
                 \"derived-from-master-seed\" or \"standalone\""
            ),
            ProfileError::KeySourceFields { source, detail } => write!(
                f,
                "holder profile: `elgamal_key_source` is \"{source}\", and {detail}"
            ),
            ProfileError::SeedPromptUnavailable => write!(
                f,
                "holder profile: `account_seed` is \"{PROMPT_FOR_SEED}\", which asks this \
                 process to read the seed from its own terminal — and this caller has no \
                 way to do that. Run the daemon, or put the seed in the file"
            ),
            ProfileError::Keygen(e) => write!(f, "holder profile: deriving the ElGamal key: {e}"),
            ProfileError::KeypairMismatch(e) => write!(
                f,
                "holder profile: {e}. A registered key whose secret nobody holds makes every \
                 confidential balance encrypted to it permanently unreachable — there is no \
                 rotation and no recovery"
            ),
            ProfileError::Stale { field, now } => write!(
                f,
                "the profile carries `{field}`, which this signer no longer accepts from a \
                 file. Architecture §6 step 2: it is read from the ledger, as {now}. Remove \
                 the field. **It is not being ignored** — a signer that silently preferred a \
                 stale local value to the ledger would be the gap step 2 exists to close"
            ),
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RawProfile {
    /// XRPL family seed, `s…`. Devnet faucet output — or the literal
    /// [`PROMPT_FOR_SEED`], which asks the daemon for it at start instead.
    ///
    /// ⚠ **`Zeroizing<String>`, and the wrapper is applied INSIDE the
    /// deserialiser** ([`de_zeroizing_string`]) rather than by the caller.
    /// `CLAIMS.md` B-23. serde constructs the `String` and this crate never
    /// sees it unwrapped, so there is no bare binding for a caller to forget —
    /// which is the shape B-22's `Copy` defect kept taking, one type-system
    /// layer up.
    ///
    /// ⚠ **A `String` moved into `Zeroizing` is a MOVE, not the copy E-178
    /// records.** `String` is not `Copy`; the heap buffer is not duplicated and
    /// there is no source binding left live. The distinction is the whole of
    /// B-22's first lesson and it lands the other way here.
    #[serde(deserialize_with = "de_zeroizing_string")]
    account_seed: Zeroizing<String>,
    /// Which of the two key sources this holder uses. Absent is read as
    /// `standalone`, which is what every profile written before 2026-08-20 was.
    elgamal_key_source: Option<String>,
    /// 32-byte ElGamal secret, hex. **Standalone source only.**
    elgamal_sk: Option<String>,
    /// 33-byte ElGamal public key, hex. **Standalone source only.**
    elgamal_pk: Option<String>,
    /// Which confidential position this signer is for.
    issuance_id: String,
    /// Declared, and cross-checked against what the endpoint reports.
    ///
    /// ⚠ **Deliberately redundant.** [`crate::ledger`] refuses any network but
    /// Devnet on its own, before it reads anything. Keeping the declaration
    /// here means a profile written for one network cannot be pointed at
    /// another endpoint by changing one environment variable.
    network_id: u32,
    /// Policy, not ledger state. See the module header.
    fee_drops: u64,
    /// Where to read the ledger. Plaintext is refused unless it is loopback.
    #[serde(default = "default_endpoint")]
    ledger_endpoint: String,
    /// Bound on the confirmation's discrete-log search. See
    /// [`HolderProfile::amount_search_to`].
    #[serde(default = "default_search_to")]
    amount_search_to: u64,
}

/// Deserialize a `String` and hand it straight to `Zeroizing`.
///
/// ⚠ **Three lines instead of `zeroize`'s `serde` feature, deliberately.** That
/// feature would provide `Deserialize for Zeroizing<Z>` and pull `serde` into
/// `zeroize`'s own build; this needs no feature, and a feature this crate does
/// not ask for is a feature that can resolve differently — which is the
/// manifest note beside `zeroize` and `CLAIMS.md` E-167.
///
/// ⚠ **What it does NOT reach: serde_json's own scratch buffer.** A JSON string
/// containing escapes is decoded through a `Vec<u8>` owned by the deserialiser,
/// and that buffer is outside this crate. A family seed is base58 and carries no
/// escape, so the reachable path copies the input slice directly — but the
/// residual is named rather than argued away, in the same species as B-21's
/// SHA-512 block buffer. `CLAIMS.md` B-23.
fn de_zeroizing_string<'de, D>(d: D) -> Result<Zeroizing<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    // `String::deserialize` then MOVE. Nothing binds the bare value.
    String::deserialize(d).map(Zeroizing::new)
}

fn default_search_to() -> u64 {
    100_000
}

fn default_endpoint() -> String {
    crate::ledger::DEFAULT_ENDPOINT.to_string()
}

pub struct HolderProfile {
    pub account: AccountKey,
    pub elgamal: ElGamalKeypair,
    /// Where [`Self::elgamal`] came from. The daemon banner says it out loud,
    /// because "which key source" is the question step 6 exists to answer and
    /// a signer that does not say which one it used is not answering it.
    pub key_source: KeySource,
    /// True when the seed was typed into this process rather than read from
    /// the profile file — so the banner can say whether a secret is on disk.
    pub seed_was_prompted: bool,
    pub issuance_id: [u8; 24],
    pub network_id: u32,
    pub fee_drops: u64,
    pub ledger_endpoint: String,
    /// How far the confirmation will search when recovering an amount from a
    /// ciphertext.
    ///
    /// The search runs a **fixed** iteration count over `[0, this]` whatever
    /// the answer is — upstream's mitigation for the `RIPCTXR-1` timing
    /// channel — so this is a latency budget, not a best case. Set it to the
    /// smallest value that covers the amounts expected.
    ///
    /// ⚠ Upstream's header estimates the cost. **That figure is deliberately
    /// not repeated here**: `CLAIMS.md` P-8 forbids a benchmark number without
    /// hardware, parameter set and methodology, and it is not a number this
    /// project measured.
    ///
    /// ⚠ It also bounds the **balance**, which is now decrypted from the
    /// ledger rather than declared in this file. A balance above the bound
    /// does not decrypt, and the signer refuses to build a Send it cannot
    /// check against a balance it could read.
    pub amount_search_to: u64,
}

impl std::fmt::Debug for HolderProfile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("HolderProfile")
            .field("address", &self.account.address())
            .field("elgamal_pk", &crate::prover::hex(self.elgamal.public()))
            .field("key_source", &self.key_source.as_str())
            .field("issuance_id", &crate::prover::hex(&self.issuance_id))
            .field("network_id", &self.network_id)
            .field("ledger_endpoint", &self.ledger_endpoint)
            .finish()
    }
}

fn fixed<const N: usize>(hexstr: &str, what: &str) -> Result<[u8; N], ProfileError> {
    let b = xrpl::unhex(hexstr).map_err(|e| ProfileError::Field(format!("{what}: {e}")))?;
    b.try_into().map_err(|_| {
        ProfileError::Field(format!("{what}: expected {N} bytes, got {}", hexstr.len() / 2))
    })
}

impl HolderProfile {
    /// Load a profile that carries its own seed.
    ///
    /// Errors with [`ProfileError::SeedPromptUnavailable`] if the profile asks
    /// to be prompted. Use [`Self::load_with`] from anything that can prompt.
    pub fn load(path: &Path) -> Result<HolderProfile, ProfileError> {
        Self::load_with(path, || None)
    }

    /// Load a profile, asking `ask_seed` for the family seed when the profile
    /// says [`PROMPT_FOR_SEED`].
    ///
    /// ⚠ `ask_seed` must read this process's own terminal. It is a closure so
    /// that tests can drive it — **not** so that it can be delegated over IPC,
    /// which ruling §5 item 3 forbids. Nothing in [`crate::protocol`] can
    /// produce one.
    pub fn load_with<F: FnOnce() -> Option<Zeroizing<String>>>(
        path: &Path,
        ask_seed: F,
    ) -> Result<HolderProfile, ProfileError> {
        // ⚠ **`raw` IS THE WHOLE PROFILE, SEED IN PLAINTEXT.** With a file-based
        // profile this is the seed's first appearance in this process's memory,
        // and until B-23 it was dropped unwiped. `CLAIMS.md` B-23.
        //
        // ⚠ **`Zeroizing` around an existing binding has NO COMPILE-TIME
        // FALSIFIER — measured, not assumed (E-179).** `Zeroizing<T>` derefs to
        // `T`, so `from_json_with(&raw, ..)` compiles identically with the
        // wrapper removed. Nothing here breaks if this line is reverted, which
        // is why `check-zeroize-bounds` part 5 checks it at SOURCE and says so
        // rather than pretending a revert would catch it.
        //
        // ⚠ **What it does not reach: `read_to_string`'s growth.** The buffer is
        // sized from the file's metadata and normally allocated once, but a file
        // that grows during the read reallocates and the old buffer is freed
        // unwiped. Named, not argued away. `CLAIMS.md` P-5.
        let raw = Zeroizing::new(
            std::fs::read_to_string(path).map_err(|e| ProfileError::Io(e.to_string()))?,
        );
        Self::from_json_with(&raw, ask_seed)
    }

    pub fn from_json(raw: &str) -> Result<HolderProfile, ProfileError> {
        Self::from_json_with(raw, || None)
    }

    pub fn from_json_with<F: FnOnce() -> Option<Zeroizing<String>>>(
        raw: &str,
        ask_seed: F,
    ) -> Result<HolderProfile, ProfileError> {
        // Named before serde's generic "unknown field" so the operator is told
        // the value moved to the ledger rather than left to wonder whether it
        // was renamed or silently accepted.
        //
        // ⚠⚠ **THE PROFILE USED TO BE PARSED TWICE, AND THE FIRST PARSE BUILT A
        // `serde_json::Value` HOLDING THE SEED AS A `String`.** `serde_json`
        // does not implement `Zeroize` and cannot be made to, so that copy was
        // unreachable residue for as long as the AST lived. ⚠ **The B-22
        // decision request's own site list missed it** — `CLAIMS.md` E-177 —
        // and both `REVIEW-029` legs are why B-23 names it.
        //
        // ⚠ **It is DELETED rather than wiped, and that is the stronger fix.**
        // This check reads FIELD NAMES; it never needed the values. Asking for
        // `IgnoredAny` makes serde skip every value in place — the seed is
        // never allocated a second time, so there is no second buffer to wipe,
        // to forget to wipe, or to write a gate about. **B-22's first lesson,
        // generalised: the copy you do not make cannot leak.**
        //
        // ⚠ **"Skips in place" is READ AT SOURCE, not assumed.** `from_str` uses
        // `StrRead`, whose `ignore_str` delegates to `SliceRead::ignore_str`
        // (`serde_json-1.0.151/src/read.rs:348`): it advances an index to the
        // closing quote and **builds no buffer, even for a string carrying
        // escapes**. ⚠ **The KEYS are still allocated** — they are field names,
        // which are public, and `MOVED_TO_THE_LEDGER` is a list of them.
        //
        // ⚠ **A non-object still falls through to `RawProfile`, unchanged.** A
        // map parse REFUSES `[1,2]` where `Value` accepted it and returned
        // `None` from `as_object()`; both paths then reach the same
        // `RawProfile` parse and produce the same error. Checked by probe
        // before this was written, not reasoned about after.
        let keys: Result<std::collections::BTreeMap<String, serde::de::IgnoredAny>, _> =
            serde_json::from_str(raw);
        if let Ok(obj) = keys {
            for (field, now) in MOVED_TO_THE_LEDGER {
                if obj.contains_key(*field) {
                    return Err(ProfileError::Stale { field, now });
                }
            }
        }

        let p: RawProfile =
            serde_json::from_str(raw).map_err(|e| ProfileError::Json(e.to_string()))?;

        // Before anything else is interpreted.
        if p.network_id != DEVNET_NETWORK_ID {
            return Err(ProfileError::NotDevnet(p.network_id));
        }

        // The seed: from the file, or from this process's own terminal.
        //
        // ⚠ **`Zeroizing<String>` on both arms, and the file arm MOVES rather
        // than clones.** `p.account_seed.clone()` duplicated the seed's heap
        // buffer and left the original in `p` to be dropped unwiped; the field
        // is now moved out, so exactly one DESERIALISED SEED allocation exists
        // and it wipes. ⚠ **Not "exactly one buffer" — that was the wording and
        // `REVIEW-031b` was right to call it false**: on the file path `raw`
        // still holds the whole profile, seed included, until this function
        // returns. Both wipe; there are two.
        // `RawProfile` has no `Drop` impl, which is what permits the partial
        // move. `CLAIMS.md` B-23.
        let seed_was_prompted = p.account_seed.as_str() == PROMPT_FOR_SEED;
        let seed: Zeroizing<String> = if seed_was_prompted {
            // Trimming allocates a SECOND buffer, so both the line as typed
            // and the trimmed copy exist for a moment and both must wipe.
            //
            // ⚠⚠ **THE MECHANISM IS `ask_seed`'s RETURN TYPE, NOT THIS
            // BINDING, AND A FIRST VERSION OF THIS COMMENT SAID OTHERWISE.**
            // It claimed that writing `ask_seed()?.trim().to_string()` would
            // **leave the untrimmed original unwiped**. That is false: the
            // temporary is a `Zeroizing<String>`, and Rust drops it at the end
            // of the statement — which wipes it. ⚠ **The first correction
            // quoted the old claim as "wipe the copy and drop the original",
            // which does not say *unwiped* and so read as contradicting the very
            // next sentence.** `REVIEW-031a` finding 4. **A correction whose
            // quotation is ambiguous is a correction that has to be read twice.** Once the return type carries
            // `Zeroizing`, every form here is covered — and if it did NOT,
            // no binding would help.
            //
            // ⚠ **So `typed` is legibility, not mechanism, and saying so is
            // the point.** A comment that credits a binding with a defence it
            // does not provide is exactly what `REVIEW-030` found covering a
            // real gap in B-22 (E-181), pointing the other way. Caught by
            // re-reading this diff against what the type system actually does.
            // `CLAIMS.md` E-192.
            let typed = match ask_seed() {
                Some(s) if !s.trim().is_empty() => s,
                _ => return Err(ProfileError::SeedPromptUnavailable),
            };
            Zeroizing::new(typed.trim().to_string())
        } else {
            p.account_seed
        };

        let key_source = match p.elgamal_key_source.as_deref() {
            // Absent means what every profile written before step 6 already
            // was. It is read as `standalone`, not silently upgraded.
            None => KeySource::Standalone,
            Some(s) => {
                KeySource::parse(s).ok_or_else(|| ProfileError::UnknownKeySource(s.to_string()))?
            }
        };

        // ⚠⚠ **THE ACCOUNT KEY IS PRODUCED BY WHICHEVER PATH RUNS, AND THAT IS
        // WHAT REMOVED A SECOND DECODE OF THE MASTER SEED.** This used to be one
        // `AccountKey::from_family_seed(&seed)` above the match — so the DERIVED
        // path decoded the seed **twice**: once there, once inside
        // `derive_from_master_seed`. ⚠ **That is the identical defect B-23
        // removed from `keygen::derive_raw`, sitting one file up, and B-23 did
        // not look for it** (`REVIEW-031a`; `CLAIMS.md` B-24, E-195).
        //
        // ⚠ **What was given up: the tautological `expected_account_id` check
        // and the "one call shape" argument that justified it.** The old comment
        // said the check *"cannot fail"* here and cited a revert proving it — so
        // the decode is the only thing it cost. **Onboarding still passes the
        // expected AccountID, and there it does real work.** ⚠ `REVIEW-032`
        // checked this three ways and upheld it: the two dispatches are the same
        // `match algo` over the same constructors, `the_two_seed_dispatches_agree`
        // fails if they drift, and `a_prompted_seed_keeps_every_secret_off_disk`
        // pins this path's account against a constant.
        //
        // ⚠⚠ **AND SOMETHING ELSE WAS GIVEN UP THAT B-24 DID NOT NAME: the seed
        // is no longer decoded ABOVE this match, so a malformed seed now reports
        // a DIFFERENT ERROR.** Measured — all four were `Field("account_seed:
        // …")` before, because the decode ran first:
        //
        //   derived + bad seed              -> `Keygen`
        //   standalone + bad seed           -> `KeySourceFields`
        //   unknown key_source + bad seed   -> `UnknownKeySource`
        //   derived + `elgamal_sk` + bad    -> `KeySourceFields`
        //
        // ⚠ **All four still REFUSE the profile**, so the change is in which
        // error the operator sees, not in what is accepted — **the identical
        // shape as E-197, one file away, in the fix rather than the thing
        // fixed.** `REVIEW-032s`; `CLAIMS.md` B-25.
        let (account, elgamal) = match key_source {
            KeySource::DerivedFromMasterSeed => {
                // ⚠ The two must not both be present. A profile that declares
                // the derived source *and* carries a secret is a profile whose
                // author believed one thing and whose signer would do another,
                // and the disagreement would be invisible: both keys are
                // 33 bytes of valid-looking hex.
                if p.elgamal_sk.is_some() || p.elgamal_pk.is_some() {
                    return Err(ProfileError::KeySourceFields {
                        source: "derived-from-master-seed",
                        detail: "the profile also carries `elgamal_sk` or `elgamal_pk`. The \
                                 derived source takes its key from `account_seed` and from \
                                 nothing else — remove them, or declare `standalone`",
                    });
                }
                // ONE decode. The account key comes out of the derivation that
                // already built it.
                let (derived, account) = keygen::derive_from_master_seed_with_account(&seed)
                    .map_err(|e| ProfileError::Keygen(e.to_string()))?;
                (account, derived.into_keypair())
            }
            KeySource::Standalone => {
                let (sk, pk) = match (&p.elgamal_sk, &p.elgamal_pk) {
                    (Some(sk), Some(pk)) => (sk, pk),
                    _ => {
                        return Err(ProfileError::KeySourceFields {
                            source: "standalone",
                            detail: "the profile does not carry both `elgamal_sk` and \
                                     `elgamal_pk`. A standalone key is not derived from \
                                     anything, so there is nowhere else for it to come from",
                        })
                    }
                };
                // The standalone path has no derivation to take an account
                // from, so it decodes the seed here — ONCE.
                let account = AccountKey::from_family_seed(&seed)
                    .map_err(|e| ProfileError::Field(format!("account_seed: {e}")))?;
                let keypair = ElGamalKeypair::try_from_parts(
                    fixed::<32>(sk, "elgamal_sk")?,
                    fixed::<33>(pk, "elgamal_pk")?,
                )
                .map_err(|e| ProfileError::KeypairMismatch(e.to_string()))?;
                (account, keypair)
            }
        };

        Ok(HolderProfile {
            account,
            elgamal,
            key_source,
            seed_was_prompted,
            issuance_id: fixed::<24>(&p.issuance_id, "issuance_id")?,
            network_id: p.network_id,
            fee_drops: p.fee_drops,
            ledger_endpoint: p.ledger_endpoint,
            amount_search_to: p.amount_search_to,
        })
    }

    pub fn address(&self) -> String {
        self.account.address()
    }
}
