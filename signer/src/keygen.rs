//! The ruled ElGamal key derivation. **Architecture §6 step 6.**
//!
//! **Source of truth:
//! `docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md`, §2.** That document
//! is the *only* copy of this construction; this file is an implementation of
//! its prose and must not be treated as the specification. Where the two
//! disagree, the ruling wins and this file is the defect.
//!
//! Written from the ruling's prose rather than from
//! `tools/spike-keygen-2026-08-18/t-keygen-construction.ts`, then checked
//! against that spike's published vectors — which is the point of having
//! vectors at all, and is the method `CLAIMS.md` E-62 and E-75 credit. Two
//! implementations agreeing on two vectors is evidence; one agreeing with
//! itself is not.
//!
//! # ⚠ The reduction is TOTAL. It has no abort path, and adding one is a defect
//!
//! [`crate::scalar::reduce_wide_total`] carries the argument. In one sentence:
//! the sigma-nonce and `r`/`ρ` rulings abort on a zero scalar because their
//! input is fresh entropy and an abort costs one transaction, while keygen's
//! input is a **fixed seed**, so an abort would be deterministic and permanent
//! — that holder could never participate. Architecture §4 has all four
//! randomness rules side by side and all four are correct.
//!
//! # ⚠ What deriving from the master seed costs
//!
//! `pk_A = sk_A·G` is published permanently and welded to the account by the
//! registration proof of knowledge. Seed compromise therefore yields
//! **retroactive decryption of the holder's entire confidential history**, with
//! no rotation and no recovery (`CLAIMS.md` P-10). The ruling accepts that cost
//! in exchange for the one recovery mechanism the protocol otherwise lacks —
//! **conditionally**, and [`crate::onboarding`] is where the two load-bearing
//! conditions are discharged. Deriving without disclosing is not the ruling.
//!
//! # What this module does not do
//!
//! It does not decide **whether** to derive. That is
//! [`crate::onboarding::Assessment`], which needs a ledger read this module
//! deliberately cannot perform: the derivation must be refused as the *default*
//! for an account whose master key has been retired, and this file cannot tell.

use crate::scalar::reduce_wide_total;
use crate::xrpl::{self, KeyAlgorithm};
use hmac::{Hmac, Mac};
use sha2::Sha512;

type HmacSha512 = Hmac<Sha512>;

/// §2's constants, byte-for-byte. The lengths are asserted in
/// `tests/keygen_kat.rs` against the ruling's stated sizes rather than
/// recounted here, because a comment that says "(23 bytes)" is not a check.
const LABEL: &[u8] = b"WCONF-ELGAMAL-KEYGEN-v1";
const SALT: &[u8] = b"WCONF-ELGAMAL-KEYGEN-v1/HKDF-Extract-salt";
const EXPAND: &[u8] = b"WCONF-ELGAMAL-KEYGEN-v1/HKDF-Expand";
const ROLE: &[u8] = b"secp256k1-scalar";

/// The two seed types §2.1 permits, as the exact strings that go into the
/// preimage.
///
/// ⚠ **These strings are part of the derivation**, not a display convenience.
/// Changing `"secp256k1"` to `"Secp256k1"` changes every holder's key, and
/// §3's version rule makes that a **fork rather than a rollout** — a registered
/// holder cannot migrate, because the key cannot be rotated.
fn seed_type_bytes(algo: KeyAlgorithm) -> &'static [u8] {
    match algo {
        KeyAlgorithm::Secp256k1 => b"secp256k1",
        KeyAlgorithm::Ed25519 => b"ed25519",
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum KeygenError {
    /// The string is not an XRPL family seed at all, or decodes to something
    /// other than 16 bytes of entropy. §2.1: refused **before** anything is
    /// hashed.
    Seed(String),
    /// A supplied expected AccountID does not equal the one the seed derives.
    ///
    /// §2.1's fourth refusal, and the mechanical half of §7 condition 2's
    /// "the derivation root is the AccountRoot **master** family seed for the
    /// account being registered, and nothing else": a regular-key seed derives
    /// a *different* account, so binding the expected AccountID is what turns
    /// that sentence into a check.
    AccountIdMismatch { derived: String, expected: String },
}

impl std::fmt::Display for KeygenError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            KeygenError::Seed(s) => write!(f, "family seed: {s}"),
            KeygenError::AccountIdMismatch { derived, expected } => write!(
                f,
                "this seed derives account {derived}, not {expected}. The ElGamal key is \
                 derived from the AccountRoot MASTER family seed of the account being \
                 registered and from nothing else — a regular-key seed or a signer-list \
                 member's seed derives a different account and is refused here"
            ),
        }
    }
}

/// A buffer that is overwritten when it goes out of scope.
///
/// ⚠ **What this claims and what it does not.** It writes zeros over its own
/// bytes with a volatile store, so the compiler may not elide the write, and it
/// covers exactly the bytes it owns. It does **not** cover copies the compiler
/// or the allocator made elsewhere, it does **not** pin the page against swap
/// — `mlock` is named as a gap rather than claimed — and it does **nothing at
/// all** against an adversary with code execution on this machine, who reads
/// the value while it is still live (architecture §3, ruling §8 item 2).
/// `CLAIMS.md` P-5 forbids calling any of it secure.
pub struct Zeroizing<const N: usize>(pub [u8; N]);

impl<const N: usize> Zeroizing<N> {
    /// Overwrite the bytes. Called by [`Drop`]; public so it can be tested on
    /// a **live** value rather than through a dangling pointer, which is what
    /// the obvious version of that test does.
    pub fn zeroize(&mut self) {
        for b in self.0.iter_mut() {
            // SAFETY: `b` is a live, aligned `u8` this value owns.
            unsafe { std::ptr::write_volatile(b, 0) };
        }
        std::sync::atomic::compiler_fence(std::sync::atomic::Ordering::SeqCst);
    }
}

impl<const N: usize> Drop for Zeroizing<N> {
    fn drop(&mut self) {
        self.zeroize();
    }
}

/// Wipe a `Copy` array that was copied INTO a [`Zeroizing`], leaving the source live.
///
/// ⚠ **This exists because of a real defect, not for symmetry.** `let seed =
/// Zeroizing(entropy)` on a `[u8; 16]` copies rather than moves, so the wrapper
/// wipes its own copy and the original binding is untouched. Named so the call
/// site says *why* it is there — a bare `.zeroize()` would read as belt-and-braces.
pub trait ZeroizeSourceCopy {
    fn zeroize_source_copy(&mut self);
}

impl<const N: usize> ZeroizeSourceCopy for [u8; N] {
    fn zeroize_source_copy(&mut self) {
        for b in self.iter_mut() {
            // SAFETY: `b` is a live, aligned `u8` this value owns.
            unsafe { std::ptr::write_volatile(b, 0) };
        }
        std::sync::atomic::compiler_fence(std::sync::atomic::Ordering::SeqCst);
    }
}

impl<const N: usize> std::fmt::Debug for Zeroizing<N> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Zeroizing<{N}>(<redacted>)")
    }
}

/// The output of the derivation: a keypair, and the facts that produced it.
///
/// `sk` is behind [`Zeroizing`], so this value overwrites its own secret when
/// it is dropped.
pub struct DerivedKey {
    sk: Zeroizing<32>,
    pk: [u8; 33],
    account_id: [u8; 20],
    algo: KeyAlgorithm,
}

impl std::fmt::Debug for DerivedKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DerivedKey")
            .field("pk", &crate::prover::hex(&self.pk))
            .field("sk", &"<redacted>")
            .field("account", &self.address())
            .field("seed_type", &self.algo)
            .finish()
    }
}

impl DerivedKey {
    pub fn public(&self) -> &[u8; 33] {
        &self.pk
    }

    /// The AccountID this seed derives, which is bound into the preimage.
    pub fn account_id(&self) -> &[u8; 20] {
        &self.account_id
    }

    pub fn address(&self) -> String {
        xrpl::encode_address(&self.account_id)
    }

    pub fn seed_type(&self) -> KeyAlgorithm {
        self.algo
    }

    /// Hand the secret to the prover.
    ///
    /// [`crate::prover::ElGamalKeypair::try_from_parts`] recomputes `sk·G` and
    /// refuses a pair that does not correspond. That is redundant here — this
    /// module computed `pk` from `sk` a moment ago — and it is deliberately not
    /// skipped: the check is cheap, and a keypair that reaches the prover
    /// unvalidated is how a holder encrypts a balance to a key nobody holds.
    ///
    /// ⚠ **`self.sk.0` is a COPY, not a move**, because `[u8; 32]` is `Copy`.
    /// Rust's rule against moving a field out of a `Drop` type therefore does
    /// not apply. A `REVIEW-020` leg reported this line as unable to compile and
    /// built its only HIGH finding on that; it is a matter of record that every
    /// build of this crate is the counterexample.
    ///
    /// The worry underneath the wrong claim is real, so it has a test rather
    /// than a note: `self` is dropped at the end of this function and its
    /// `Zeroizing` overwrites the original buffer, so if the value handed out
    /// were an **alias** the keypair would leave here holding zeros.
    ///
    /// ⚠ **And `try_from_parts` would not catch that, for a reason that is
    /// temporal rather than about what it checks.** It does check — it
    /// recomputes `sk·G` and refuses a mismatch — but it runs *while `self` is
    /// still alive*, so an aliased buffer would validate correctly and then be
    /// wiped by the destructor on the way out. An earlier version of this
    /// comment said it *"validates whatever it is given"*, which describes it as
    /// an unvalidating pass-through and is simply wrong; `REVIEW-020` round two
    /// caught it. `tests/keygen_interop.rs::the_derived_secret_survives_its_source_being_zeroized`.
    pub fn into_keypair(self) -> crate::prover::ElGamalKeypair {
        crate::prover::ElGamalKeypair::try_from_parts(self.sk.0, self.pk)
            .expect("a derived key is pk = sk·G by construction")
    }
}

/// §2.2, in full. The intermediates are returned so a known-answer test can
/// check `PRK` and `OKM64`, which are the values the ruling publishes.
fn derive_raw(
    family_seed: &str,
    expected_account_id: Option<&[u8; 20]>,
) -> Result<(KeyAlgorithm, xrpl::AccountKey, usize, Zeroizing<64>, Zeroizing<64>), KeygenError> {
    // ---- §2.1 Inputs, and what must be rejected before anything is hashed ---
    let (seed, algo) =
        xrpl::decode_family_seed(family_seed).map_err(|e| KeygenError::Seed(e.to_string()))?;
    // ⚠⚠ **THIS WAS `let seed = Zeroizing(entropy); entropy.zeroize_source_copy();`
    // AND B-24 DELETED BOTH LINES.** They existed because `decode_family_seed`
    // returned a bare `[u8; 16]`, which is `Copy`, so wrapping it left the source
    // live — E-178, `REVIEW-029c` condition 5, and the defect this session hit
    // four times.
    //
    // ⚠ **The decoder now returns a wiping type, so there is no bare source to
    // wipe and the whole dance is gone.** `seed` is a MOVE of a value that was
    // built inside its own wiping buffer. **Fixing the producer deleted the
    // hazard at every consumer instead of adding a guard at each one** — which is
    // why `REVIEW-031` chose the return type over four call-site wipes.
    //
    // ⚠ **`zeroize_source_copy` is still needed elsewhere and is NOT dead** —
    // `derive_from_master_seed`'s `*sk.as_bytes()` is a genuine `Copy` source
    // with no producer to fix. `CLAIMS.md` B-24.

    // `decode_family_seed` returns exactly 16 bytes or an error, so
    // `len(seed_bytes) != 16` cannot reach here. The type is the check.
    //
    // ⚠⚠ **THIS CALLED `from_family_seed`, WHICH DECODES THE SEED A SECOND
    // TIME.** `from_family_seed` is `decode_family_seed` followed by exactly the
    // dispatch below, so the base58 decode ran twice and a second heap buffer
    // holding the master seed was allocated for no reason. `REVIEW-029a`
    // finding 3; `CLAIMS.md` B-23.
    //
    // ⚠⚠ **THIS SAID "B-22 had already made both buffers wipe, so this was never
    // residue" AND THAT WAS FALSE — `REVIEW-031b` found it.** `from_family_seed`
    // took `decode_family_seed`'s returned `[u8; 16]` into a bare local with no
    // `Drop`, so the second decode left **16 bytes of master-seed entropy
    // unwiped on the stack**, every time. It was residue, and the sentence
    // saying otherwise was written in the commit that removed the call.
    //
    // ⚠ **B-24 fixed the producer** — `decode_family_seed` now returns a wiping
    // array — **so the claim is true today for a reason that did not exist when
    // it was written.** A sentence that becomes true later is not a sentence
    // that was right. `CLAIMS.md` E-194.
    //
    // What removing the call buys is *one fewer buffer and a shorter window*,
    // not *a leak closed*. P-5.
    //
    // ⚠ **The dispatch is duplicated from `from_family_seed`, and that is the
    // cost.** The alternative — decoding once and passing entropy in — is what
    // this is; the risk is the two dispatches drifting apart.
    // `the_two_seed_dispatches_agree` is the test that fails if they do.
    let account = match algo {
        xrpl::KeyAlgorithm::Ed25519 => xrpl::AccountKey::ed25519_from_entropy(&seed[..]),
        xrpl::KeyAlgorithm::Secp256k1 => xrpl::AccountKey::from_entropy(&seed[..]),
    }
    .map_err(|e| KeygenError::Seed(e.to_string()))?;
    let account_id = account.account_id();

    if let Some(want) = expected_account_id {
        if &account_id != want {
            return Err(KeygenError::AccountIdMismatch {
                derived: xrpl::encode_address(&account_id),
                expected: xrpl::encode_address(want),
            });
        }
    }

    // ---- §2.2 Derivation ---------------------------------------------------
    let seed_type = seed_type_bytes(algo);

    // IKM = LABEL ‖ u32be(len(seed_type)) ‖ seed_type
    //            ‖ u32be(16) ‖ seed_bytes
    //            ‖ u32be(20) ‖ account_id
    let ikm_len = LABEL.len() + 4 + seed_type.len() + 4 + 16 + 4 + 20;

    let mut extract = HmacSha512::new_from_slice(SALT).expect("HMAC accepts any key length");
    extract.update(LABEL);
    extract.update(&u32be(seed_type.len()));
    extract.update(seed_type);
    extract.update(&u32be(16));
    extract.update(&seed[..]);
    extract.update(&u32be(20));
    extract.update(&account_id);
    let prk = Zeroizing::<64>(extract.finalize().into_bytes().into());

    // INFO = EXPAND ‖ u32be(len(ROLE)) ‖ ROLE
    // OKM64 = HMAC-SHA-512(key = PRK, msg = INFO ‖ 0x01)
    let mut expand = HmacSha512::new_from_slice(&prk.0).expect("HMAC accepts any key length");
    expand.update(EXPAND);
    expand.update(&u32be(ROLE.len()));
    expand.update(ROLE);
    expand.update(&[0x01]);
    let okm = Zeroizing::<64>(expand.finalize().into_bytes().into());

    // ⚠ **The `AccountKey` is RETURNED, not discarded, and that is B-24's second
    // half.** It was built here from the seed and thrown away, so `holder.rs` had
    // to call `from_family_seed` itself — **decoding the same master seed a
    // second time, which is the exact defect this function was corrected for one
    // milestone earlier** (`REVIEW-029a` finding 3). `REVIEW-031a` found the
    // duplicate had simply moved one file up. `CLAIMS.md` B-24.
    Ok((algo, account, ikm_len, prk, okm))
}

/// Derive the ElGamal key **and hand back the XRPL account key the derivation
/// already built**, from ONE decode of the seed.
///
/// ⚠ **This exists because `holder.rs` was decoding the master seed twice** —
/// once through `AccountKey::from_family_seed` for the account, once through
/// this module for the ElGamal key — **which is the identical defect B-23
/// removed from `derive_raw` itself, relocated one file up** (`REVIEW-031a`;
/// `CLAIMS.md` B-24, E-195).
///
/// ⚠ **There is no `expected_account_id` parameter and that is deliberate, not
/// an omission.** The account comes OUT of this call, so checking it against
/// itself is tautological — which is what `holder.rs`'s own comment said about
/// the `Some(&account.account_id())` it used to pass, backed by a revert.
/// [`derive_from_master_seed`] keeps the parameter because **onboarding** is
/// where the binding does real work: there the holder types a seed and the
/// account comes from the ledger.
///
/// ⚠ **The cost is that the two callers no longer share one call shape**, which
/// `holder.rs` previously cited as the reason to keep the tautological check.
/// B-23's subject is avoidable copies of the master seed, so the decode wins —
/// but the property that was given up is named rather than quietly dropped.
pub fn derive_from_master_seed_with_account(
    family_seed: &str,
) -> Result<(DerivedKey, xrpl::AccountKey), KeygenError> {
    let (algo, account, _ikm_len, _prk, okm) = derive_raw(family_seed, None)?;
    Ok((finish(&okm, account.account_id(), algo), account))
}

/// `X = OS2IP(OKM64); sk_A = (X mod (n − 1)) + 1`, into a wiping buffer.
///
/// ⚠ **ONE PRODUCER, AND THE GATE IS WHY.** Both public derivation entry points
/// need this, and a first version of B-24 copy-pasted it — which duplicated
/// `sk_bytes.zeroize_source_copy()`, **a security-critical wipe, into two
/// places that could drift.** `check-zeroize-bounds` part 5 pins that line with
/// a `!= 1` rule and **reported it MISSING for being AMBIGUOUS rather than
/// absent** — the same refusal that caught the two identical closures in B-22.
/// ⚠ **A gate that refuses ambiguity found a duplication a reviewer would have
/// had to notice.** `CLAIMS.md` B-24.
fn finish(okm: &Zeroizing<64>, account_id: [u8; 20], algo: KeyAlgorithm) -> DerivedKey {
    let sk = reduce_wide_total(&okm.0);
    let pk = compressed_public_key(sk.as_bytes());
    // ⚠ **`*sk.as_bytes()` is a `[u8; 32]`, which is `Copy`** — so this wraps a
    // COPY and leaves the dereferenced temporary live (E-178, `REVIEW-030b`).
    // The temporary is bound so it can be wiped rather than left anonymous.
    // ⚠⚠ **THIS SAID *"there is no producer to fix here: `sk` is a `k256` type
    // this crate does not own"* AND BOTH HALVES WERE FALSE.** `sk` is
    // [`crate::scalar::Scalar`] — **this crate's own type**, `scalar.rs:133` —
    // and it was `Copy` with no `Drop`, so **the derived ElGamal secret sat on
    // this stack frame unwiped** while the comment explained that it could not
    // be helped. `grep -n Zeroize signer/src/scalar.rs` returned nothing.
    //
    // ⚠ **The `k256` in the sentence belongs to `compressed_public_key`, eight
    // lines down.** The neighbouring function's dependency was read into this
    // one's comment, and the comment then answered *"why is this not wiped?"*
    // for every later reader — including two passes by `REVIEW-032`'s own self
    // leg. Found by `REVIEW-032b`. `CLAIMS.md` E-200.
    //
    // ⚠ **There WAS a producer, and fixing it cost nothing**: `Scalar` is now
    // `ZeroizeOnDrop`, so `sk` wipes when this frame ends — and so do `r`, `ρ`
    // and every blinding factor in the crate, none of which anyone had asked
    // about. **E-181's shape, and the fix is B-24's own lesson applied to the
    // finding B-24 created.** `CLAIMS.md` B-25.
    let mut sk_bytes = *sk.as_bytes();
    let wrapped = Zeroizing(sk_bytes);
    sk_bytes.zeroize_source_copy();
    DerivedKey { sk: wrapped, pk, account_id, algo }
}

/// Derive this account's ElGamal keypair from its **master** family seed.
///
/// `expected_account_id` is the account the key is being registered for. Pass
/// it whenever it is known — it is the only mechanical defence against
/// deriving from the wrong seed, and [`crate::onboarding`] always passes it.
///
/// **Total once the input checks pass.** Every error this returns comes from
/// §2.1's input validation; the derivation itself cannot fail.
///
/// ⚠ **This doc comment spent one commit attached to
/// [`derive_from_master_seed_with_account`], which has no `expected_account_id`
/// parameter** — so it told callers to pass an argument that did not exist and
/// left this function undocumented. `REVIEW-032b`; `CLAIMS.md` B-25. **A
/// function extracted from another takes the doc comment with it unless someone
/// looks.**
pub fn derive_from_master_seed(
    family_seed: &str,
    expected_account_id: Option<&[u8; 20]>,
) -> Result<DerivedKey, KeygenError> {
    let (algo, account, _ikm_len, _prk, okm) = derive_raw(family_seed, expected_account_id)?;
    Ok(finish(&okm, account.account_id(), algo))
}

/// `pk_A = compressed_SEC1(sk_A · G)`.
///
/// `sk_A` is in `[1, n−1]` by construction, so the scalar is non-zero and the
/// multiplication cannot produce the identity.
fn compressed_public_key(sk: &[u8; 32]) -> [u8; 33] {
    use k256::elliptic_curve::sec1::ToEncodedPoint;
    let scalar = k256::SecretKey::from_slice(sk).expect("sk_A is in [1, n−1] by construction");
    let point = scalar.public_key().to_encoded_point(true);
    let mut out = [0u8; 33];
    out.copy_from_slice(point.as_bytes());
    out
}

fn u32be(v: usize) -> [u8; 4] {
    (v as u32).to_be_bytes()
}

/// The published intermediates, for the known-answer test in
/// `tests/keygen_kat.rs`.
///
/// Behind `test-support`, which is **not a default feature**, for the same
/// reason [`crate::confirm::acknowledgement_for_test`] is: a release binary
/// should have no way to hand out `PRK`, from which `sk_A` follows in one
/// HMAC. Nothing in [`crate::protocol`] deserialises into these types and
/// [`crate::session`] never calls this.
#[doc(hidden)]
#[cfg(feature = "test-support")]
pub fn intermediates_for_test(
    family_seed: &str,
) -> Result<(KeyAlgorithm, [u8; 20], usize, [u8; 64], [u8; 64]), KeygenError> {
    let (algo, account, ikm_len, prk, okm) = derive_raw(family_seed, None)?;
    Ok((algo, account.account_id(), ikm_len, prk.0, okm.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The ruling states these lengths in §2 and derives `IKM length 80` /
    /// `78` from them. A miscounted constant would change every key silently,
    /// so the sizes are checked rather than commented.
    #[test]
    fn the_labels_are_the_lengths_the_ruling_states() {
        assert_eq!(LABEL.len(), 23, "LABEL");
        assert_eq!(SALT.len(), 41, "SALT");
        assert_eq!(EXPAND.len(), 35, "EXPAND");
        assert_eq!(ROLE.len(), 16, "ROLE");
        assert_eq!(seed_type_bytes(KeyAlgorithm::Secp256k1).len(), 9);
        assert_eq!(seed_type_bytes(KeyAlgorithm::Ed25519).len(), 7);
    }

    /// `WCONF-ELGAMAL-KEYGEN-v1` must not be a prefix of, or prefixed by, the
    /// `r`/`ρ` label. §3's whole purpose is that the two domains are disjoint,
    /// and the ruling had to correct that table once already because it named
    /// a label family that did not exist.
    #[test]
    fn the_keygen_domain_is_disjoint_from_the_randomness_domain() {
        let others: &[&[u8]] = &[
            b"WCONF-RANDOM-SCALAR-v1",
            b"WCONF-RANDOM-SCALAR-v1/HKDF-Extract-salt",
            b"WCONF-RANDOM-SCALAR-v1/HKDF-Expand",
            b"WCONF-NONCE-v1",
        ];
        for ours in [LABEL, SALT, EXPAND] {
            for other in others {
                assert!(
                    !ours.starts_with(other) && !other.starts_with(ours),
                    "{} and {} are not disjoint",
                    String::from_utf8_lossy(ours),
                    String::from_utf8_lossy(other)
                );
            }
        }
    }

    /// ⚠ **The defect this is named for: wrapping a `Copy` array in `Zeroizing`
    /// COPIES it, and the source stays live and unwiped.**
    ///
    /// `REVIEW-029` self leg; `REVIEW-029c` condition 5; `CLAIMS.md` B-22. The
    /// first half asserts the defect **still exists** — if `[u8; 16]` ever
    /// stopped being `Copy` this test should fail rather than quietly pass and
    /// leave `zeroize_source_copy` looking like belt-and-braces.
    ///
    /// ⚠ This tests the WIPE, on a live value. It does not and cannot test that
    /// no copy survives elsewhere — P-5, and `sha512_zeroizing`'s note 3.
    #[test]
    fn wrapping_a_copy_array_leaves_the_source_and_the_helper_wipes_it() {
        let mut entropy = [0xCDu8; 16];
        let wrapped = Zeroizing(entropy);

        // The wrapper holds its own copy; the source is untouched by the wrap.
        assert_eq!(wrapped.0, [0xCDu8; 16]);
        assert_eq!(entropy, [0xCDu8; 16], "the wrap moved rather than copied — re-read the call site");

        entropy.zeroize_source_copy();
        assert_eq!(entropy, [0u8; 16], "the source copy was not wiped");
        assert_eq!(wrapped.0, [0xCDu8; 16], "wiping the source must not disturb the wrapper");
    }

    /// The overwrite itself, on a live value.
    #[test]
    fn zeroize_overwrites_every_byte() {
        let mut z = Zeroizing([0xABu8; 32]);
        z.zeroize();
        assert_eq!(z.0, [0u8; 32], "zeroize left bytes behind");
    }

    /// And that `Drop` performs it.
    ///
    /// ⚠ The obvious version of this test — drop a value, then read the stack
    /// slot it occupied — is a use-after-free, and a test that is undefined
    /// behaviour proves nothing about anything. `ManuallyDrop` keeps the
    /// **storage** alive and owned by this frame while letting the destructor
    /// run over it, so the bytes read afterwards are bytes this function still
    /// owns.
    #[test]
    fn dropping_zeroizes() {
        let mut held = std::mem::ManuallyDrop::new(Zeroizing([0xABu8; 32]));
        let storage: *const u8 = (&*held as *const Zeroizing<32>).cast();
        // SAFETY: `held` owns 32 bytes that are live for this frame.
        assert_eq!(unsafe { std::ptr::read_volatile(storage) }, 0xAB, "setup is wrong");

        // SAFETY: `held` has not been dropped before now and is not used as a
        // `Zeroizing` again afterwards — only its raw bytes are read.
        unsafe { std::mem::ManuallyDrop::drop(&mut held) };

        for i in 0..32 {
            // SAFETY: as above; the storage is still owned by this frame.
            let b = unsafe { std::ptr::read_volatile(storage.add(i)) };
            assert_eq!(b, 0, "byte {i} survived Drop");
        }
    }
}
