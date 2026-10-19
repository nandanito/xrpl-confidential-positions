> ⚠⚠ **HISTORICAL RECORD — DO NOT CORRECT THIS FILE.**
>
> This packet reproduces `signer/Cargo.toml` and `signer/src/xrpl.rs` **as they
> stood at `d8eb7a3`**, and those copies contain the false B-19 premise that
> `CLAIMS.md` E-171 corrects — *"B-19 turned the `ed25519-dalek` feature on"*,
> *"`default-features = false` turned it off by accident"*. A round-two leg
> flagged them, correctly, as copies of a false claim.
>
> **They stay.** A review packet is the record of what a leg was shown; editing
> it after the fact makes the round unreviewable and would be a worse defect
> than the one it removes. The same rule protects `docs/reviews/` generally.
> The live sites are fixed — see E-172 and E-175.

# REVIEW-027 — REQUEST: B-21's build, and E-171's correction of B-19

**Date:** 2026-08-27. **Frozen commit:** `d8eb7a35ddf80302eaae4029d3a5936858c2de6e`, branch
`build/b21-wipe-signing-locals`. **Round:** one of two.

You are one of three independent legs. The other two are another model and the
session's own self leg. Do not assume the others agree with you; a clean leg is
not corroboration (`CLAIMS.md`'s own finding).

---

## ⚠ READ THIS BEFORE ANYTHING ELSE

**Do not use tools. Do not fetch anything. Everything you need is in this
document.** If something you need is missing, say so as a finding — *"the packet
did not contain X"* is a correct output and has cost this project a grade before
(round one of `REVIEW-025` omitted a test file and a leg correctly graded a
condition PARTIAL as a result).

⚠ **Do not excerpt a file for yourself and then reason from the excerpt.** On
2026-08-27 a leg graded a HIGH defect that does not exist — it said `restore()`
was missing from a loop where it is the first statement — working from its own
excerpt of a file this packet supplied **in full**. That is `CLAIMS.md` E-170.
Every file below is complete.

⚠ **A finding is evidence, not an instruction.** Nine times in this project's
history a remedy proposed by a leg would have edited code that already did the
thing, or would have introduced a defect. State what you observe and why it is
wrong. Propose a remedy, but mark it as *proposed*, and expect it to be checked
against the source before it is applied.

⚠ **The point beneath a false premise can still be right.** If two of your three
reasons for a finding turn out wrong, the finding may still be worth keeping.
Say which parts you are confident in and which you are not.

---

## What changed, in one paragraph

**B-21** wipes the signing helper's secret stack locals. `zeroize` becomes a
direct `wconf-signer` dependency; a new private helper `sha512_zeroizing` returns
a `Zeroizing<[u8; 64]>` and explicitly wipes the `Output<Sha512>` it copied out
of; `fresh_aux` returns `Option<Zeroizing<[u8; 32]>>`; and `OneShotAux` holds its
32 bytes in a `Zeroizing`. A new gate, `tools/check-zeroize-bounds.py`, reverts
each of those to a bare array and requires the build to break.

**E-171** is what building that gate found: **`ed25519-dalek`'s `zeroize` feature
was never off**, so the previous session's B-19 decision — and the `CLAIMS.md`
row and test doc comment that describe it — were false. That correction is part
of the subject of this review and is the part you should be hardest on.

---

## THE QUESTIONS

Answer each explicitly. Number your answers.

**1. ⚠ Is E-171 CORRECT? Re-derive it yourself; do not accept our account.**
The claim is that `default-features = false, features = ["std"]` on
`ed25519-dalek 2.2.0` results in the crate's `zeroize` feature being **enabled**,
because `std = ["alloc", ..]` and `alloc = [.., "zeroize/alloc", ..]` where that
entry lacks the `?` sigil that `serde?/alloc` beside it carries. The crate's
complete `Cargo.toml` is in this packet. **If we are wrong about this, the
correction we just published against our own previous session is itself a false
finding, which would be considerably worse than the original error.**

**2. Does B-21 change the signing construction in any way?** The claim is that it
does not — that the bytes are identical and only their `Drop` behaviour changed.
`signer/src/xrpl.rs` and `signer/tests/hedged_signing.rs` are both complete here.

**3. Can `check-zeroize-bounds.py` false-pass, and in which direction?** This
project has built three gates and **two of them false-passed before they
worked** — one certified a literal `0u8` as a "gated symbol"; one accepted any
nonzero exit as a failing test, and then accepted an already-failing test as
proof of a mutation. Assume this gate has the same defect until you have looked
for it. Consider in particular: what happens if the scratch crate fails to build
for a reason unrelated to the feature? What does `(type)` vs `(bound)` actually
establish?

**4. Are the two new tests real falsifiers, or one layer away from what they are
named for?** `the_signing_helpers_secret_locals_wipe_on_drop` and
`the_wiping_hash_is_sha512_over_its_parts_in_order`, both in `xrpl::aux_tests`.
**This is this repository's most frequent defect** — three instances so far, each
a test named for a property whose decision point is one function away
(`aux_is_exactly_one_field_of_entropy`, `one_implementation_not_two`,
`zero_aux_is_hedged_not_a_fallback`).

**5. Is anything claimed for B-21 overstated?** The governing prohibition is
**P-5**: *never claim anything here is trustless, non-custodial, decentralised,
audited, production-ready or secure*. The intended claim is *"this narrows a
window and removes no channel"*. Check every place the change is described —
the manifest comments, the doc comments, the register rows, the gate's own
output — and say where the wording exceeds what is delivered.

**6. Did the corrections to B-19 reach EVERY copy of the false sentence?** The
project's `CLAIMS.md` E-168 is precisely this failure: a fix applied to the
instance the adjudicator was looking at rather than to the phrase, missing four
second copies. The false claim appeared in at least three places. Find any it
did not reach.

**7. What secret material in the signing path is STILL unwiped that B-21 should
have covered?** Three residues are named deliberately in `sha512_zeroizing`'s
doc comment and are not claimed fixed. **Separately and disclosed here rather
than discovered by you:** the session noticed that `sha512half` is used both for
public transaction digests and for *secret* key derivation
(`ed25519_from_entropy` at the `SHA512Half(entropy)` line, and `from_entropy`'s
two closures), and that its `full` local and its returned `[u8; 32]` are unwiped
there too. That was left **out of scope** on the grounds that B-21's registered
subject is the signing helper. **Say whether that was the right call**, and
whether anything else was missed.

**8. Is removing the `zeroize` dev-dependency correct?** It was removed on the
reasoning that a `[dependencies]` entry is already available to integration test
targets. Is that true, and does anything break subtly as a result?

**9. Anything else.** Including anything about this packet itself.

---

## ⚠ ONE DECLARED BOUND ON THIS PACKET

`CLAIMS.md` is **279 KB** and is not included in full. The four rows relevant to
this review — **E-167, E-171, B-19, B-21** — are reproduced complete and verbatim
below. **This is an excerpt and it is declared as one**, because this project's
rule is that an excerpt is a diff by another name and the person making it owns
what it cut. If your finding needs a different row, say so.

Everything else below is a **complete file**.

---


## CLAIMS.md — the four relevant rows, complete and verbatim

(Table headers: the E rows are `| # | Claim | Evidence |`; the B rows are `| # | Claim | What it needs |`.)

```
| E-167 | ⚠⚠ **THIS ROW'S HEADLINE IS FALSE AND E-171 IS WHY. `zeroize` WAS NEVER OFF.** `std = ["alloc", ..]` and `alloc` lists `"zeroize/alloc"` **without the `?` sigil** the `serde?/alloc` entry beside it carries, so the historical line resolved to `alloc,std,zeroize`. Proved by scratch-crate probe in `tools/check-zeroize-bounds.py`, with an empty-feature control that fails. **Everything below about the ACCIDENT is still true and is still worth having — the line was copied from `k256` and meant nothing by it — but its CONSEQUENCE was nil.** The row now reads: ~~**B-19 decided and applied: `ed25519-dalek`'s `zeroize` was OFF, by accident, for nine days.**~~ `git log -S'ed25519-dalek = '` returns exactly one commit — `16e2e58`, architecture §6 step 3 — whose hunk copies `default-features = false` from the `k256` line directly above it. ⚠ **A first draft of this row said *"no commit message, review, ADR or ruling in this repository mentions `zeroize`"* — FALSE, and P-12's falsifier caught it before it was committed: `git log -S'zeroize' --all` returns ELEVEN commits.** ⚠ **And the truth is a worse finding.** `REVIEW-005a` (2026-08-17) required *"`#[derive(Zeroize, ZeroizeOnDrop)]`"* on key types and `REVIEW-012-RULING` §4 (2026-08-18) made *"zeroized on drop"* a **condition of the keygen ruling** — and both were honoured where a session wrote the code by hand (`keygen.rs:118-129`, with `zeroize_overwrites_every_byte`). **So the ElGamal key got hand-rolled zeroization and a test, while the XRPL ACCOUNT KEY — the input its derivation takes — silently did not, because a dependency default was switched off in a manifest that no review read for nine days.** What nothing mentions before `REVIEW-024` §9 is `ed25519-dalek`'s `zeroize` **feature**. ⚠ **And the idiom is HARMLESS on the line it was copied from, which is why nobody noticed**: `elliptic-curve-0.13.8` declares `zeroize` as a **mandatory** dependency — no `optional = true`, no feature gate — and `secret_key.rs:318` is a bare `impl<C> ZeroizeOnDrop for SecretKey<C>`. **The same two words have opposite consequences on two adjacent lines, and the difference is invisible from the manifest.** So `SigningKey` and `ExpandedSecretKey` were not wiped on drop while `hazmat.rs:39` promised unconditionally that they were | **`docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.** Enabled; `fast` deliberately left off. ⚠ **Decided on hygiene, NOT on the nonce ruling's threat model** — `REVIEW-024` §9 required that separation and it is what keeps B-19 and B-16 separable: with `zeroize` off, an honest B-16 would have had to wipe expanded secret material by hand, inside a nonce commit. ~~The check is a `ZeroizeOnDrop` **trait bound**, so reverting the manifest line fails to **compile** — E-108's rule inverted, because there the compile failure IS the proof.~~ ⚠ **FALSE, and nobody ran it for a day — E-171.** Reverting the manifest line **compiles**, because `std` already implies the feature. The trait bound is real and `ExpandedSecretKey`/`SigningKey` genuinely are `ZeroizeOnDrop`; what it does **not** do is depend on the word this decision added. E-108's rule inverts for a `Drop` type only if somebody produces the compile failure, and *asserting* one is the same act as asserting a gate works. ⚠ **Accepted by all three `REVIEW-025` legs, and its wording corrected by two**: *"no callable API or wire-format change"* rather than "no API", and *"no new download; expected negligible, NOT MEASURED"* rather than "nothing measurable" — **an unmeasured number is not a number, and this project says so about everyone else's**. The remaining unwiped stack locals are **B-21** | A, executed |

| E-171 | ⚠⚠ **B-19's PREMISE AND B-19's GATE WERE BOTH FALSE, AND THE THING THAT FOUND IT WAS BUILDING THE GATE B-19 SAID IT HAD.** E-167 said `ed25519-dalek`'s `zeroize` feature *"was OFF, by accident, for nine days"*; the decision said *"reverting the manifest line fails to COMPILE"*. **Neither is true.** The historical line at `16e2e58` — `default-features = false, features = ["std"]` — resolves to **`alloc,std,zeroize`**, because `std = ["alloc", ..]` and `alloc = [.., "zeroize/alloc", ..]` **omits the `?` sigil** that the `serde?/alloc` entry two lines above it carries. `ExpandedSecretKey` and `SigningKey` were wiped on drop the whole time, and removing the word `zeroize` from our manifest **still builds today**. ⚠ **`alloc` is the switch, not `std`** — probed separately. ⚠ **THE SHAPE, AND IT IS THIS PROJECT'S OWN, LANDING ON ITS OWN GATE-BUILDING RULE:** E-165 and E-168 both say *verify a gate by breaking it*, and B-19's gate was **asserted in three documents and never once executed** — the register row, the decision, and a test doc comment all describing a compile failure nobody had produced. ⚠ **Three `REVIEW-025` legs and a `REVIEW-026` round accepted it**, because **reading a manifest is not running one**, and a feature-resolution claim has no falsifier that reading can supply. ⚠⚠ **AND ROUND TWO LOOKED STRAIGHT AT IT.** `REVIEW-026c` finding 10 is *"the B-19 decision gave the feature list as `["std", "zeroize"]` — the manifest has **`hazmat`** too"*. **A leg read that exact list, counted its members, corrected an omission in it, and never asked what `std` pulls in.** There is no stronger demonstration that the question was unaskable from the text: the word that made the whole row false was on the line being corrected. ⚠ **E-167's first draft was ALSO false and P-12's falsifier caught it; the corrected row was false on a different premise, and no falsifier existed for that one.** ⚠ **What survives: B-19 was still worth doing.** An implied feature made explicit is legible, and it is now pinned by a probe rather than by a sentence. ⚠ **What does NOT survive: the nine-day story.** Nothing was unwiped, nothing was at risk, and E-167's *"the truth is a worse finding"* was a worse finding about a thing that had not happened | **`tools/check-zeroize-bounds.py`, `make check-zeroize-bounds`.** Part 1 probes the feature in a scratch crate at four feature sets — `[]` **must fail** (the control), `["std"]`, `["alloc"]` and today's line must all compile. Part 2 reverts each of B-21's three locals and requires the build to break, with a comment-edit control that must not. ⚠ **B-19's own revert is deliberately NOT in the revert list** — it belongs to the probe table, as a thing that compiles. ⚠ **Found while building B-21, which is B-19's continuation**; the gate was written to test B-21 and the B-19 arm was included because the decision claimed it. It reported `STILL BUILDS FALSE` on its first run |

| B-19 | ~~**`ed25519-dalek` is configured `default-features = false, features = ["std"]`, so `zeroize` is OFF.**~~ ⚠⚠ **THAT PREMISE IS FALSE — E-171, 2026-08-27.** `["std"]` resolves to `alloc,std,zeroize`. The row's subject never existed; what B-19 actually did was make an implied feature explicit, which is worth having and is not what it said. **DECIDED AND APPLIED 2026-08-27 → E-167.** The omission was accidental — one commit, the idiom copied from the `k256` line above, where the same two words are harmless because `elliptic-curve` makes `zeroize` **mandatory** rather than a default feature. ⚠ **`fast` is still off, deliberately**: a speed trade with no security content, and re-enabling it was not that decision | **CLOSED → `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.** Decided on **hygiene, not on the nonce ruling's threat model**, which `REVIEW-024` §9 required and which is what kept it separable from B-16. Accepted by all three `REVIEW-025` legs; two corrected its wording. ~~The check is a `ZeroizeOnDrop` trait bound, so a revert fails to **compile**.~~ ⚠ **FALSE → E-171**: the revert compiles, because `std → alloc → "zeroize/alloc"` already enabled the feature. **The decision is still right and is now merely EXPLICIT rather than corrective** — and it was accepted by three `REVIEW-025` legs and a `REVIEW-026` round on a premise none of them ran. ⚠ **The remaining unwiped stack locals — the SHA-512 output, the mask, `fresh_aux`'s buffer — are B-21 and were NOT closed by this.** **B-21 is now BUILT (2026-08-27)** and closed them, plus `OneShotAux`, which this row's list did not name. |

| B-21 | ~~**Secret material on the stack is not wiped: the SHA-512 expansion, the nonce mask, and `fresh_aux`'s 32-byte buffer.**~~ **BUILT 2026-08-27.** `zeroize` is a direct `wconf-signer` dependency; `sha512_zeroizing` returns a `Zeroizing<[u8; 64]>` and wipes the `Output<Sha512>` it copied out of, `fresh_aux` returns `Option<Zeroizing<[u8; 32]>>`, and `OneShotAux` holds its bytes in a `Zeroizing`. ⚠ **`OneShotAux` was NOT in this row's list and is the longest-lived of the four** — it holds the drawn entropy for the whole of `sign_prehash_with_rng`. Fixed here rather than filed as a fourth item, and said out loud rather than folded in, because a widened scope recorded as the original is how a fix comes to claim more than it did. ⚠ **The wipe goes through `zeroize`'s `impl Zeroize for [Z]`, NOT `GenericArray`'s own** — `generic-array`'s `zeroize` feature is on in this graph only because `k256` pulls it in transitively, and resting a security property on a feature no line of our manifest declares is E-171's mistake repeated | **CLOSED as a build. `make check-zeroize-bounds` is the falsifier**, and it is a COMPILE-time one: `REVIEW-025` rejected a runtime *"is the buffer zero now?"* assertion because reading a dead stack frame is undefined behaviour. ⚠ **P-5 GOVERNS WHAT THIS MAY EVER CLAIM, and the wording has not moved: it narrows a window and removes NO channel.** ⚠ **Three residues are named at `signer/src/xrpl.rs::sha512_zeroizing` and are NOT fixed**: the `Sha512` hasher's own block buffer, which holds the 32-byte secret input — ⚠ **P-12: `grep -rn "zeroize\|Zeroize\|impl.*Drop"` over the vendored sources AND manifests of `sha2 0.10.9`, `digest 0.10.7`, `crypto-common 0.1.6` and `block-buffer 0.10.4` returns ZERO hits, run 2026-08-27, so there is no feature to enable**, **the source of every move** (a Rust move is a bitwise copy that does not run `Drop` on its source), and anything the optimiser spills. A fourth is `ExpandedSecretKey::from_slice`'s own `bytes.try_into()` into an unwiped `[u8; 64]` (`hazmat.rs:108-117`), which is the crate's and unreachable from here |
```


## FILE (complete): `ed25519-dalek 2.2.0 — Cargo.toml — THE SUBJECT OF QUESTION 1`

```toml
# THIS FILE IS AUTOMATICALLY GENERATED BY CARGO
#
# When uploading crates to the registry Cargo will automatically
# "normalize" Cargo.toml files for maximal compatibility
# with all versions of Cargo and also rewrite `path` dependencies
# to registry (e.g., crates.io) dependencies.
#
# If you are reading this file be aware that the original Cargo.toml
# will likely look very different (and much more reasonable).
# See Cargo.toml.orig for the original contents.

[package]
edition = "2021"
rust-version = "1.81"
name = "ed25519-dalek"
version = "2.2.0"
authors = [
    "isis lovecruft <redacted@example.invalid>",
    "Tony Arcieri <redacted@example.invalid>",
    "Michael Rosenberg <redacted@example.invalid>",
]
build = false
exclude = [
    ".gitignore",
    "TESTVECTORS",
    "VALIDATIONVECTORS",
    "res/*",
]
autolib = false
autobins = false
autoexamples = false
autotests = false
autobenches = false
description = "Fast and efficient ed25519 EdDSA key generations, signing, and verification in pure Rust."
homepage = "https://github.com/dalek-cryptography/curve25519-dalek"
documentation = "https://docs.rs/ed25519-dalek"
readme = "README.md"
keywords = [
    "cryptography",
    "ed25519",
    "curve25519",
    "signature",
    "ECC",
]
categories = [
    "cryptography",
    "no-std",
]
license = "BSD-3-Clause"
repository = "https://github.com/dalek-cryptography/curve25519-dalek/tree/main/ed25519-dalek"

[package.metadata.docs.rs]
features = [
    "batch",
    "digest",
    "hazmat",
    "pem",
    "serde",
]
rustdoc-args = [
    "--html-in-header",
    "docs/assets/rustdoc-include-katex-header.html",
    "--cfg",
    "docsrs",
]

[features]
alloc = [
    "curve25519-dalek/alloc",
    "ed25519/alloc",
    "serde?/alloc",
    "zeroize/alloc",
]
asm = ["sha2/asm"]
batch = [
    "alloc",
    "merlin",
    "rand_core",
]
default = [
    "fast",
    "std",
    "zeroize",
]
digest = ["signature/digest"]
fast = ["curve25519-dalek/precomputed-tables"]
hazmat = []
legacy_compatibility = ["curve25519-dalek/legacy_compatibility"]
pem = [
    "alloc",
    "ed25519/pem",
    "pkcs8",
]
pkcs8 = ["ed25519/pkcs8"]
rand_core = ["dep:rand_core"]
serde = [
    "dep:serde",
    "ed25519/serde",
]
std = [
    "alloc",
    "ed25519/std",
    "serde?/std",
    "sha2/std",
]
zeroize = [
    "dep:zeroize",
    "curve25519-dalek/zeroize",
]

[lib]
name = "ed25519_dalek"
path = "src/lib.rs"

[[test]]
name = "ed25519"
path = "tests/ed25519.rs"

[[test]]
name = "pkcs8"
path = "tests/pkcs8.rs"

[[test]]
name = "validation_criteria"
path = "tests/validation_criteria.rs"

[[test]]
name = "x25519"
path = "tests/x25519.rs"

[[bench]]
name = "ed25519_benchmarks"
path = "benches/ed25519_benchmarks.rs"
harness = false
required-features = ["rand_core"]

[dependencies.curve25519-dalek]
version = "4"
features = ["digest"]
default-features = false

[dependencies.ed25519]
version = ">=2.2, <2.3"
default-features = false

[dependencies.merlin]
version = "3"
optional = true
default-features = false

[dependencies.rand_core]
version = "0.6.4"
optional = true
default-features = false

[dependencies.serde]
version = "1.0"
optional = true
default-features = false

[dependencies.sha2]
version = "0.10"
default-features = false

[dependencies.signature]
version = ">=2.0, <2.3"
optional = true
default-features = false

[dependencies.subtle]
version = "2.3.0"
default-features = false

[dependencies.zeroize]
version = "1.5"
optional = true
default-features = false

[dev-dependencies.bincode]
version = "1.0"

[dev-dependencies.blake2]
version = "0.10"

[dev-dependencies.criterion]
version = "0.5"
features = ["html_reports"]

[dev-dependencies.curve25519-dalek]
version = "4"
features = [
    "digest",
    "rand_core",
]
default-features = false

[dev-dependencies.hex]
version = "0.4"

[dev-dependencies.hex-literal]
version = "0.4"

[dev-dependencies.rand]
version = "0.8"

[dev-dependencies.rand_core]
version = "0.6.4"
default-features = false

[dev-dependencies.serde]
version = "1.0"
features = ["derive"]

[dev-dependencies.serde_json]
version = "1.0"

[dev-dependencies.sha3]
version = "0.10"

[dev-dependencies.toml]
version = "0.7"

[dev-dependencies.x25519-dalek]
version = "2"
features = ["static_secrets"]
default-features = false

```


## FILE (complete): `ed25519-dalek 2.2.0 — src/hazmat.rs`

```rust
//! Low-level interfaces to ed25519 functions
//!
//! # ⚠️ Warning: Hazmat
//!
//! These primitives are easy-to-misuse low-level interfaces.
//!
//! If you are an end user / non-expert in cryptography, **do not use any of these functions**.
//! Failure to use them correctly can lead to catastrophic failures including **full private key
//! recovery.**

// Permit dead code because 1) this module is only public when the `hazmat` feature is set, and 2)
// even without `hazmat` we still need this module because this is where `ExpandedSecretKey` is
// defined.
#![allow(dead_code)]

use core::fmt::Debug;

use crate::{InternalError, SignatureError};

use curve25519_dalek::scalar::{clamp_integer, Scalar};

use subtle::{Choice, ConstantTimeEq};
#[cfg(feature = "zeroize")]
use zeroize::{Zeroize, ZeroizeOnDrop};

// These are used in the functions that are made public when the hazmat feature is set
use crate::{Signature, VerifyingKey};
use curve25519_dalek::digest::{generic_array::typenum::U64, Digest};

/// Contains the secret scalar and domain separator used for generating signatures.
///
/// This is used internally for signing.
///
/// In the usual Ed25519 signing algorithm, `scalar` and `hash_prefix` are defined such that
/// `scalar || hash_prefix = H(sk)` where `sk` is the signing key and `H` is SHA-512.
/// **WARNING:** Deriving the values for these fields in any other way can lead to full key
/// recovery, as documented in [`raw_sign`] and [`raw_sign_prehashed`].
///
/// Instances of this secret are automatically overwritten with zeroes when they fall out of scope.
pub struct ExpandedSecretKey {
    /// The secret scalar used for signing
    pub scalar: Scalar,
    /// The domain separator used when hashing the message to generate the pseudorandom `r` value
    pub hash_prefix: [u8; 32],
}

impl Debug for ExpandedSecretKey {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.debug_struct("ExpandedSecretKey").finish_non_exhaustive() // avoids printing secrets
    }
}

impl ConstantTimeEq for ExpandedSecretKey {
    fn ct_eq(&self, other: &Self) -> Choice {
        self.scalar.ct_eq(&other.scalar) & self.hash_prefix.ct_eq(&other.hash_prefix)
    }
}

impl PartialEq for ExpandedSecretKey {
    fn eq(&self, other: &Self) -> bool {
        self.ct_eq(other).into()
    }
}

impl Eq for ExpandedSecretKey {}

#[cfg(feature = "zeroize")]
impl Drop for ExpandedSecretKey {
    fn drop(&mut self) {
        self.scalar.zeroize();
        self.hash_prefix.zeroize()
    }
}

#[cfg(feature = "zeroize")]
impl ZeroizeOnDrop for ExpandedSecretKey {}

// Some conversion methods for `ExpandedSecretKey`. The signing methods are defined in
// `signing.rs`, since we need them even when `not(feature = "hazmat")`
impl ExpandedSecretKey {
    /// Construct an `ExpandedSecretKey` from an array of 64 bytes. In the spec, the bytes are the
    /// output of a SHA-512 hash. This clamps the first 32 bytes and uses it as a scalar, and uses
    /// the second 32 bytes as a domain separator for hashing.
    pub fn from_bytes(bytes: &[u8; 64]) -> Self {
        // TODO: Use bytes.split_array_ref once it’s in MSRV.
        let mut scalar_bytes: [u8; 32] = [0u8; 32];
        let mut hash_prefix: [u8; 32] = [0u8; 32];
        scalar_bytes.copy_from_slice(&bytes[00..32]);
        hash_prefix.copy_from_slice(&bytes[32..64]);

        // For signing, we'll need the integer, clamped, and converted to a Scalar. See
        // PureEdDSA.keygen in RFC 8032 Appendix A.
        let scalar = Scalar::from_bytes_mod_order(clamp_integer(scalar_bytes));

        ExpandedSecretKey {
            scalar,
            hash_prefix,
        }
    }

    /// Construct an `ExpandedSecretKey` from a slice of 64 bytes.
    ///
    /// # Returns
    ///
    /// A `Result` whose okay value is an EdDSA `ExpandedSecretKey` or whose error value is an
    /// `SignatureError` describing the error that occurred, namely that the given slice's length
    /// is not 64.
    pub fn from_slice(bytes: &[u8]) -> Result<Self, SignatureError> {
        // Try to coerce bytes to a [u8; 64]
        bytes.try_into().map(Self::from_bytes).map_err(|_| {
            InternalError::BytesLength {
                name: "ExpandedSecretKey",
                length: 64,
            }
            .into()
        })
    }
}

impl TryFrom<&[u8]> for ExpandedSecretKey {
    type Error = SignatureError;

    fn try_from(bytes: &[u8]) -> Result<Self, Self::Error> {
        Self::from_slice(bytes)
    }
}

/// Compute an ordinary Ed25519 signature over the given message. `CtxDigest` is the digest used to
/// calculate the pseudorandomness needed for signing. According to the Ed25519 spec, `CtxDigest =
/// Sha512`.
///
/// # ⚠️  Cryptographically Unsafe
///
/// Do NOT use this function unless you absolutely must. Using the wrong values in
/// `ExpandedSecretKey` can leak your signing key. See
/// [here](https://github.com/MystenLabs/ed25519-unsafe-libs) for more details on this attack.
pub fn raw_sign<CtxDigest>(
    esk: &ExpandedSecretKey,
    message: &[u8],
    verifying_key: &VerifyingKey,
) -> Signature
where
    CtxDigest: Digest<OutputSize = U64>,
{
    esk.raw_sign::<CtxDigest>(message, verifying_key)
}

/// Compute a signature over the given prehashed message, the Ed25519ph algorithm defined in
/// [RFC8032 §5.1][rfc8032]. `MsgDigest` is the digest function used to hash the signed message.
/// `CtxDigest` is the digest function used to calculate the pseudorandomness needed for signing.
/// According to the Ed25519 spec, `MsgDigest = CtxDigest = Sha512`.
///
/// # ⚠️  Cryptographically Unsafe
//
/// Do NOT use this function unless you absolutely must. Using the wrong values in
/// `ExpandedSecretKey` can leak your signing key. See
/// [here](https://github.com/MystenLabs/ed25519-unsafe-libs) for more details on this attack.
///
/// # Inputs
///
/// * `esk` is the [`ExpandedSecretKey`] being used for signing
/// * `prehashed_message` is an instantiated hash digest with 512-bits of
///   output which has had the message to be signed previously fed into its
///   state.
/// * `verifying_key` is a [`VerifyingKey`] which corresponds to this secret key.
/// * `context` is an optional context string, up to 255 bytes inclusive,
///   which may be used to provide additional domain separation.  If not
///   set, this will default to an empty string.
///
/// `scalar` and `hash_prefix` are usually selected such that `scalar || hash_prefix = H(sk)` where
/// `sk` is the signing key
///
/// # Returns
///
/// A `Result` whose `Ok` value is an Ed25519ph [`Signature`] on the
/// `prehashed_message` if the context was 255 bytes or less, otherwise
/// a `SignatureError`.
///
/// [rfc8032]: https://tools.ietf.org/html/rfc8032#section-5.1
#[cfg(feature = "digest")]
#[allow(non_snake_case)]
pub fn raw_sign_prehashed<CtxDigest, MsgDigest>(
    esk: &ExpandedSecretKey,
    prehashed_message: MsgDigest,
    verifying_key: &VerifyingKey,
    context: Option<&[u8]>,
) -> Result<Signature, SignatureError>
where
    MsgDigest: Digest<OutputSize = U64>,
    CtxDigest: Digest<OutputSize = U64>,
{
    esk.raw_sign_prehashed::<CtxDigest, MsgDigest>(prehashed_message, verifying_key, context)
}

/// Compute an ordinary Ed25519 signature, with the message contents provided incrementally by
/// updating a digest instance.
///
/// The `msg_update` closure provides the message content, updating a hasher argument. It will be
/// called twice. This closure MUST leave its hasher in the same state (i.e., must hash the same
/// values) after both calls. Otherwise it will produce an invalid signature.
///
/// `CtxDigest` is the digest used to calculate the pseudorandomness needed for signing. According
/// to the Ed25519 spec, `CtxDigest = Sha512`.
///
/// # ⚠️  Cryptographically Unsafe
///
/// Do NOT use this function unless you absolutely must. Using the wrong values in
/// `ExpandedSecretKey` can leak your signing key. See
/// [here](https://github.com/MystenLabs/ed25519-unsafe-libs) for more details on this attack.
pub fn raw_sign_byupdate<CtxDigest, F>(
    esk: &ExpandedSecretKey,
    msg_update: F,
    verifying_key: &VerifyingKey,
) -> Result<Signature, SignatureError>
where
    CtxDigest: Digest<OutputSize = U64>,
    F: Fn(&mut CtxDigest) -> Result<(), SignatureError>,
{
    esk.raw_sign_byupdate::<CtxDigest, F>(msg_update, verifying_key)
}

/// The ordinary non-batched Ed25519 verification check, rejecting non-canonical R
/// values.`CtxDigest` is the digest used to calculate the pseudorandomness needed for signing.
/// According to the Ed25519 spec, `CtxDigest = Sha512`.
pub fn raw_verify<CtxDigest>(
    vk: &VerifyingKey,
    message: &[u8],
    signature: &ed25519::Signature,
) -> Result<(), SignatureError>
where
    CtxDigest: Digest<OutputSize = U64>,
{
    vk.raw_verify::<CtxDigest>(message, signature)
}

/// The batched Ed25519 verification check, rejecting non-canonical R values. `MsgDigest` is the
/// digest used to hash the signed message. `CtxDigest` is the digest used to calculate the
/// pseudorandomness needed for signing. According to the Ed25519 spec, `MsgDigest = CtxDigest =
/// Sha512`.
#[cfg(feature = "digest")]
#[allow(non_snake_case)]
pub fn raw_verify_prehashed<CtxDigest, MsgDigest>(
    vk: &VerifyingKey,
    prehashed_message: MsgDigest,
    context: Option<&[u8]>,
    signature: &ed25519::Signature,
) -> Result<(), SignatureError>
where
    MsgDigest: Digest<OutputSize = U64>,
    CtxDigest: Digest<OutputSize = U64>,
{
    vk.raw_verify_prehashed::<CtxDigest, MsgDigest>(prehashed_message, context, signature)
}

#[cfg(test)]
mod test {
    #![allow(clippy::unwrap_used)]

    use super::*;

    use rand::{rngs::OsRng, CryptoRng, RngCore};

    // Pick distinct, non-spec 512-bit hash functions for message and sig-context hashing
    type CtxDigest = blake2::Blake2b512;
    type MsgDigest = sha3::Sha3_512;

    impl ExpandedSecretKey {
        // Make a random expanded secret key for testing purposes. This is NOT how you generate
        // expanded secret keys IRL. They're the hash of a seed.
        fn random<R: RngCore + CryptoRng>(mut rng: R) -> Self {
            let mut bytes = [0u8; 64];
            rng.fill_bytes(&mut bytes);
            ExpandedSecretKey::from_bytes(&bytes)
        }
    }

    // Check that raw_sign and raw_verify work when a non-spec CtxDigest is used
    #[test]
    fn sign_verify_nonspec() {
        // Generate the keypair
        let rng = OsRng;
        let esk = ExpandedSecretKey::random(rng);
        let vk = VerifyingKey::from(&esk);

        let msg = b"Then one day, a piano fell on my head";

        // Sign and verify
        let sig = raw_sign::<CtxDigest>(&esk, msg, &vk);
        raw_verify::<CtxDigest>(&vk, msg, &sig).unwrap();
    }

    // Check that raw_sign_prehashed and raw_verify_prehashed work when distinct, non-spec
    // MsgDigest and CtxDigest are used
    #[cfg(feature = "digest")]
    #[test]
    fn sign_verify_prehashed_nonspec() {
        use curve25519_dalek::digest::Digest;

        // Generate the keypair
        let rng = OsRng;
        let esk = ExpandedSecretKey::random(rng);
        let vk = VerifyingKey::from(&esk);

        // Hash the message
        let msg = b"And then I got trampled by a herd of buffalo";
        let mut h = MsgDigest::new();
        h.update(msg);

        let ctx_str = &b"consequences"[..];

        // Sign and verify prehashed
        let sig = raw_sign_prehashed::<CtxDigest, MsgDigest>(&esk, h.clone(), &vk, Some(ctx_str))
            .unwrap();
        raw_verify_prehashed::<CtxDigest, MsgDigest>(&vk, h, Some(ctx_str), &sig).unwrap();
    }

    #[test]
    fn sign_byupdate() {
        // Generate the keypair
        let rng = OsRng;
        let esk = ExpandedSecretKey::random(rng);
        let vk = VerifyingKey::from(&esk);

        let msg = b"realistic";
        // signatures are deterministic so we can compare with a good one
        let good_sig = raw_sign::<CtxDigest>(&esk, msg, &vk);

        let sig = raw_sign_byupdate::<CtxDigest, _>(
            &esk,
            |h| {
                h.update(msg);
                Ok(())
            },
            &vk,
        );
        assert!(sig.unwrap() == good_sig, "sign byupdate matches");

        let sig = raw_sign_byupdate::<CtxDigest, _>(
            &esk,
            |h| {
                h.update(msg);
                Err(SignatureError::new())
            },
            &vk,
        );
        assert!(sig.is_err(), "sign byupdate failure propagates");

        let sig = raw_sign_byupdate::<CtxDigest, _>(
            &esk,
            |h| {
                h.update(&msg[..1]);
                h.update(&msg[1..]);
                Ok(())
            },
            &vk,
        );
        assert!(sig.unwrap() == good_sig, "sign byupdate two part");
    }
}

```


## FILE (complete): `signer/Cargo.toml`

```toml
[package]
name = "wconf-signer"
version = "0.0.1"
edition = "2021"
publish = false
description = "W-CONF holder signer. Real keys, real proofs, real signatures, hedged nonces on both algorithms. Devnet only. (This read 'skeleton. No keys, no proofs, no signing' until 2026-08-27, nine days after it stopped being true — REVIEW-025, Codex leg.)"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
libc = "0.2"
hmac = "0.12"
sha2 = "0.10"
k256 = { version = "0.13", default-features = false, features = ["arithmetic", "ecdsa"] }
ripemd = "0.1"
# `hazmat` — **B-16**, `REVIEW-024` 2026-08-27. It is what makes
# `ExpandedSecretKey`'s `hash_prefix` field and `hazmat::raw_sign` reachable, and
# hedging the RFC 8032 nonce prefix is one assignment to that field. ⚠ **This is
# a project-wide guardrail removal for one call site** — all three legs named it
# as the strongest argument against the change, and the ruling's §7 item 2 is
# what contains it: the verifying key is derived inside the signing helper and is
# never a parameter this signer accepts. It costs no compile time and no binary
# size: `src/lib.rs:268-271` compiles the module either way and the feature gates
# only its publicity.
#
# `zeroize` — **B-19**, decided 2026-08-27, and **not** for B-16's reasons. It is
# a crate DEFAULT (`default = ["fast", "std", "zeroize"]`) that
# `default-features = false` turned off by accident, copied from the `k256` line
# above where the same two words are harmless because `elliptic-curve` makes
# `zeroize` mandatory rather than default. Without it `ExpandedSecretKey` and
# `SigningKey` are not wiped on drop, while `hazmat.rs:39` promises
# unconditionally that they are. ⚠ **`fast` stays off** — a speed trade with no
# security content, and re-enabling it is not that decision.
# `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.
ed25519-dalek = { version = "2", default-features = false, features = ["std", "hazmat", "zeroize"] }
# `zeroize` as a DIRECT dependency — **B-21**, 2026-08-27. B-19 turned the
# `ed25519-dalek` feature on, which gives `SigningKey` and `ExpandedSecretKey`
# real `Drop` impls (`hazmat.rs:67-76`, verified at source). That reaches the
# crate's *types* and nothing else: the SHA-512 expansion this signer computes
# itself, the nonce mask, the auxiliary entropy buffer and the ECDSA aux RNG are
# plain locals in `xrpl.rs` that no `Drop` touches. Both `REVIEW-025` legs
# confirmed the residue independently.
#
# ⚠ **`default-features = false`** — the default is `alloc`, and `Zeroizing` is a
# `core` type. Nothing here zeroizes a heap collection.
#
# ⚠ **What this buys is bounded and P-5 governs the claim**: it narrows the
# window in which secret bytes sit in a stack frame that is later reused. It
# removes **no channel** — an adversary with code execution reads the scalar
# while it is live, Rust leaves the source of a move unwiped, and the curve
# arithmetic's temporaries are outside all of it.
zeroize = { version = "1", default-features = false }
ureq = { version = "3.4.0", default-features = false, features = ["rustls"] }

[features]
# Exposes `confirm::acknowledgement_for_test`, which fabricates the
# HumanAcknowledgement that A6 otherwise requires come from the signer's own
# window.
#
# NOT a default feature. It was one, and the README then claimed "a release
# build drops it" — false, because a plain `cargo build --release` keeps default
# features (REVIEW-014a/b). The dev-dependency on this crate below turns it on
# for tests only, so `cargo test` needs no flags AND a release binary genuinely
# cannot construct a HumanAcknowledgement.
test-support = []

# Self dev-dependency: enables `test-support` for the test targets only.
[dev-dependencies]
sha2 = "0.10"
# ⚠ **The `zeroize` dev-dependency is GONE and that is not an omission.** It was
# here for exactly one assertion — `hedged_signing.rs`'s
# `ed25519_secret_types_implement_zeroize_on_drop`, which names the
# `ZeroizeOnDrop` bound so reverting B-19's manifest line fails to COMPILE — and
# its comment said *"the signer itself does not depend on `zeroize`"*. **B-21
# made that false**, and a `[dependencies]` entry is already on the test targets'
# extern prelude, so keeping both would have been a duplicate carrying a stale
# reason. `CLAIMS.md`'s twenty-two-instance lesson, caught by grepping for what
# this commit contradicts.
wconf-signer = { path = ".", features = ["test-support"] }

[profile.release]
panic = "abort"

```


## FILE (complete): `signer/src/xrpl.rs`

```rust
//! XRPL binary serialisation, address handling and transaction signing.
//!
//! Architecture §6 step 3. This replaces the length-framed placeholder that
//! `txn.rs` used while nothing signed, and it is the first code in this
//! repository that produces bytes intended for a network. **Devnet only.**
//!
//! # How this is checked, because "it looked right" is not a check
//!
//! Every claim this module makes is pinned by
//! `tests/xrpl_vectors.rs` against vectors generated by
//! `ripple-binary-codec@2.9.0`, `ripple-keypairs@2.0.0` and
//! `ripple-address-codec@5.0.1` — three independently written implementations
//! this project did not author. The generator is committed at
//! `tools/spike-step3-2026-08-18/xrpl-vectors.ts` under standing prohibition
//! **P-8**: a value whose generator is unavailable is not checkable. The codec
//! itself is verified against a live node's `server_definitions` across all 381
//! fields (`CLAIMS.md` E-46).
//!
//! An expected value written from recollection rather than computed is the
//! exact defect this project shipped once already. Nothing here is recalled.
//!
//! # ⚠ The ECDSA signing nonce is a fifth randomness site, and it is RULED
//!
//! ~~and no packet has covered it. This module uses RFC 6979 deterministic
//! `k` … that is a defensible default and it is not a ruling.~~ **Struck
//! 2026-08-20 — `REVIEW-018` ruled `k`, and this header outlived it by a day.**
//! It described the module as using pure RFC 6979 while the code below had
//! already been changed to hedge, which is the ninth instance of the failure
//! `lib.rs` keeps a running record of: *a statement that is true when written
//! is false by the end of the same session.*
//!
//! What holds now: sigma nonces (REVIEW-005c), `r` and `ρ` (REVIEW-010c),
//! ElGamal keygen (REVIEW-012c) and the transaction's ECDSA `k` (REVIEW-018)
//! all have rulings; the Bulletproof's internal scalars are issue #8 and are
//! **open**. This module signs secp256k1 with **hedged RFC 6979** — the
//! deterministic construction plus 32 bytes of fresh entropy as additional
//! data — because the issue #1 ruling extends here and neither leg found a
//! principled distinction from the sigma nonces.
//!
//! ⚠ **Entropy failure DEGRADES to pure RFC 6979; it does not refuse.** That is
//! the sigma-nonce rule, and importing `r`/`ρ`'s "refuse to sign" here was
//! recommended by a leg and rejected. ~~⚠ **Ruled for secp256k1 only** —
//! ed25519 is deterministic by construction, it is the live path for every
//! account this project holds, and it is `CLAIMS.md` **B-16**, open.~~
//!
//! # ⚠ Ed25519 is hedged too — B-16, ruled 2026-08-27, BUILT and EXECUTED
//!
//! ~~**B-16 IS RULED … AND THIS FILE DOES NOT IMPLEMENT IT.**~~ **Struck
//! 2026-08-27, in the session that built it.** Three independent legs
//! (`REVIEW-024`) ruled that the issue #1 extension holds for the ed25519 nonce
//! and that the residual is **not** accepted. Both algorithms hedge now.
//!
//! ⚠ **BUILT AND EXECUTED IS NOT REVIEWED, and they are different things** — the
//! distinction `REVIEW-024` §6 drew between *ruled* and *built*, one step along.
//! All eight of §6's execution gates have run, including the Devnet transaction,
//! so *"the signer hedges ed25519"* is the accurate sentence. §7 item 4 —
//! **two adversarial rounds, the second reviewing the fixes** — is what is still
//! in flight; `REVIEW-025` is round one and both external legs said not to
//! write "closed" before round two. They were right and this paragraph is the
//! correction.
//!
//! The construction is normative in
//! `docs/reviews/REVIEW-024-RULING-ed25519-nonce-2026-08-27.md` §3 — **where
//! this file and the ruling disagree, the ruling wins**:
//!
//! ```text
//!   h   := SHA512(sk)          p := h[32..64]          a := clamp(h[0..32])
//!   DST := b"WCONF/ed25519-nonce-hedge/v1\0"          (29 bytes, fixed)
//!   q   := p XOR SHA512(DST ‖ aux)[0..32]     when the mask is applied
//!   q   := p                                  when it is not
//! ```
//!
//! and then **exactly RFC 8032 with `q` in place of `p`**, evaluated by
//! `ed25519_dalek::hazmat::raw_sign::<Sha512>`. The scalar, its clamping, the
//! public key, the base point, the challenge transcript `R ‖ A ‖ M` and the
//! encodings are untouched; **this project writes no elliptic-curve
//! arithmetic**. Nothing auxiliary goes on the wire — the signature is 64
//! ordinary bytes and any conforming verifier accepts it.
//!
//! ⚠ **A successful draw of thirty-two ZERO bytes stays hedged.** Only a
//! *reported* entropy failure omits the mask, and then the output is
//! byte-identical RFC 8032. `REVIEW-018` §4a got the mirror of this wrong and it
//! cost a round.
//!
//! ⚠ **`a_successful_all_zero_draw_still_hedges` is what holds that**, and this
//! comment credited `zero_aux_is_hedged_not_a_fallback` for one commit —
//! **which is the test that cannot see it**, because it enters at
//! `sign_with_aux` and the decision is made one function earlier in
//! [`fresh_aux`]. Reverting `fresh_aux` left all 263 tests green. Found by the
//! §6 item 8 revert sweep, not by reading; the miscredit was found by
//! `REVIEW-025`'s Codex leg.
//!
//! ⚠ **`hazmat` is enabled crate-wide for one call site**, and all three legs
//! named that as the strongest argument against the change. What contains it is
//! [`AccountKey::sign_with_aux`]: the verifying key is **derived inside that
//! helper** from the same expanded key and is never a parameter this signer
//! accepts. A caller-supplied verifying key is the one input to `raw_sign` that
//! enters the challenge without entering the scalar arithmetic — the
//! two-equations-one-unknown shape that recovers the secret key, and what the
//! crate's warning is really about.
//!
//! ⚠ **One private helper, one varied input — and that is now STRUCTURAL.**
//! [`AccountKey::sign_with_aux`] takes `Option<Zeroizing<[u8; 32]>>` and is the
//! only place either algorithm signs. ⚠ It read `Option<[u8; 32]>` until B-21
//! wrapped the auxiliary entropy; the property is the *one helper*, not the
//! parameter's spelling, but a doc naming a type has to name the type. `REVIEW-024` §4d: `one_implementation_not_two`
//! asserted a property no black-box test can see, because two separately written
//! correct signers pass every assertion it made.

use k256::ecdsa::{
    signature::hazmat::{PrehashSigner, RandomizedPrehashSigner},
    Signature, SigningKey,
};
use ripemd::Ripemd160;
use sha2::{Digest, Sha256, Sha512};
use zeroize::{Zeroize, Zeroizing};

/// XRPL's base58 alphabet. Note the absent `0`, `O`, `I` and `l`.
pub const ALPHABET: &[u8] = b"rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";

const VER_ACCOUNT_ID: u8 = 0x00;
const VER_FAMILY_SEED: u8 = 0x21;

/// The three-byte version prefix of an `sEd…` ed25519 seed.
///
/// Determined by base58-decoding a real Devnet faucet seed and reading the
/// bytes before the 16-byte entropy, **not** from recollection. A wrong prefix
/// here would decode a valid seed into a different key, silently.
const VER_ED25519_SEED: [u8; 3] = [0x01, 0xE1, 0x4B];

#[derive(Debug, PartialEq, Eq)]
pub enum XrplError {
    Base58(String),
    Checksum,
    Version { want: u8, got: u8 },
    /// A multi-byte base58 version prefix that did not match.
    ///
    /// ⚠ **Separate from [`XrplError::Version`] because reusing it lied.**
    /// `decode_ed25519_seed` compares a **three**-byte prefix and reported
    /// `Version { want: VER[0], got: body[0] }`, so a seed whose first byte
    /// matched and whose second or third did not produced *"expected 0x01, got
    /// 0x01"* — an error message that hides its own cause. Found by
    /// `REVIEW-024`'s Gemini leg, outside what that packet asked about.
    VersionPrefix { what: &'static str, want: Vec<u8>, got: Vec<u8> },
    Length { what: &'static str, want: usize, got: usize },
    Field(String),
    Key(String),
}

impl std::fmt::Display for XrplError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            XrplError::Base58(s) => write!(f, "base58: {s}"),
            XrplError::Checksum => write!(f, "base58check checksum mismatch"),
            XrplError::Version { want, got } => {
                write!(f, "wrong base58 version byte: expected {want:#04x}, got {got:#04x}")
            }
            XrplError::VersionPrefix { what, want, got } => {
                let hex = |b: &[u8]| b.iter().map(|x| format!("{x:02x}")).collect::<String>();
                write!(
                    f,
                    "{what}: wrong base58 version prefix: expected {}, got {}",
                    hex(want),
                    hex(got)
                )
            }
            XrplError::Length { what, want, got } => {
                write!(f, "{what}: expected {want} bytes, got {got}")
            }
            XrplError::Field(s) => write!(f, "field: {s}"),
            XrplError::Key(s) => write!(f, "key: {s}"),
        }
    }
}

type R<T> = Result<T, XrplError>;

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/// XRPL's `SHA512Half`: the first 32 bytes of SHA-512.
pub fn sha512half(data: &[u8]) -> [u8; 32] {
    let full = Sha512::digest(data);
    let mut out = [0u8; 32];
    out.copy_from_slice(&full[..32]);
    out
}

/// SHA-512 into a buffer that wipes itself, leaving no unwiped digest behind.
///
/// **`CLAIMS.md` B-21.** `Sha512::digest(..)` returns an `Output<Sha512>` — a
/// `GenericArray` that implements no `Drop` — so over secret input it leaves 64
/// bytes in a stack frame that the next call reuses. B-19 gave `SigningKey` and
/// `ExpandedSecretKey` real `Drop` impls (`hazmat.rs:67-76`, read at source);
/// it reached the crate's *types* and nothing this signer hashes itself.
///
/// The `Output` is copied out and then **explicitly zeroized**, through
/// `zeroize`'s `impl Zeroize for [Z]` rather than `GenericArray`'s own. That is
/// deliberate: `generic-array`'s `zeroize` feature is on in this graph, and
/// `cargo tree -e features -i generic-array` (2026-08-27) attributes it to
/// **`elliptic-curve v0.13.8`** — the `k256` branch, not ours. Resting a
/// security property on a feature **no line of our manifest declares** is
/// precisely E-171's mistake, where `std` silently implied `zeroize` and three
/// documents described a consequence that never happened. Wiping through a
/// slice needs no feature at all.
///
/// ⚠ **What this does NOT wipe, stated because the alternative is a false
/// guarantee:**
///
/// 1. The `Sha512` **hasher's own block buffer**, which holds the last partial
///    block of input — for a 32-byte secret, all of it. ⚠ **P-12, so the search
///    is recorded rather than the absence asserted:** `grep -rn
///    "zeroize\|Zeroize\|impl.*Drop"` over the vendored sources of
///    `sha2 0.10.9`, `digest 0.10.7`, `crypto-common 0.1.6` and
///    `block-buffer 0.10.4` — sources **and** manifests — returns **zero hits**
///    (run 2026-08-27). There is no feature to enable and nothing here can reach
///    inside `CoreWrapper`.
/// 2. The **source of a move**. Rust moves are bitwise copies and do not run
///    `Drop` on the source, so returning this buffer leaves a copy behind.
/// 3. Anything the optimiser spills to a second stack slot or a register.
///
/// So this narrows a window and **removes no channel** — P-5, and the same
/// sentence `CLAIMS.md` B-21 carries.
fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
    let mut hasher = Sha512::new();
    for part in parts {
        hasher.update(part);
    }
    let mut digest = hasher.finalize();
    let mut out = Zeroizing::new([0u8; 64]);
    out.copy_from_slice(digest.as_slice());
    digest.as_mut_slice().zeroize();
    out
}

/// `RIPEMD160(SHA256(x))` — the AccountID of a public key.
pub fn account_id_of(pubkey: &[u8; 33]) -> [u8; 20] {
    let sha = Sha256::digest(pubkey);
    let rip = Ripemd160::digest(sha);
    let mut out = [0u8; 20];
    out.copy_from_slice(&rip);
    out
}

// ---------------------------------------------------------------------------
// base58check
// ---------------------------------------------------------------------------

pub fn base58check_encode(version: u8, payload: &[u8]) -> String {
    let mut v = Vec::with_capacity(1 + payload.len() + 4);
    v.push(version);
    v.extend_from_slice(payload);
    let c = Sha256::digest(Sha256::digest(&v));
    v.extend_from_slice(&c[..4]);
    b58_encode(&v)
}

pub fn base58check_decode(s: &str, want_version: u8) -> R<Vec<u8>> {
    let raw = b58_decode(s)?;
    if raw.len() < 5 {
        return Err(XrplError::Base58("too short".into()));
    }
    let (body, check) = raw.split_at(raw.len() - 4);
    let c = Sha256::digest(Sha256::digest(body));
    if check != &c[..4] {
        return Err(XrplError::Checksum);
    }
    if body[0] != want_version {
        return Err(XrplError::Version { want: want_version, got: body[0] });
    }
    Ok(body[1..].to_vec())
}

fn b58_encode(data: &[u8]) -> String {
    let mut digits: Vec<u8> = vec![0];
    for byte in data {
        let mut carry = *byte as u32;
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
    let leading = data.iter().take_while(|b| **b == 0).count();
    let mut out = String::new();
    for _ in 0..leading {
        out.push(ALPHABET[0] as char);
    }
    for d in digits.iter().rev() {
        out.push(ALPHABET[*d as usize] as char);
    }
    // A leading zero byte already contributed a digit above; strip the extra.
    if leading > 0 && out.len() > leading {
        let extra = out.chars().skip(leading).take_while(|c| *c == ALPHABET[0] as char).count();
        if extra > 0 {
            out = out[..leading].to_string() + &out[leading + extra..];
        }
    }
    out
}

fn b58_decode(s: &str) -> R<Vec<u8>> {
    let mut bytes: Vec<u8> = vec![0];
    for ch in s.chars() {
        let idx = ALPHABET
            .iter()
            .position(|c| *c as char == ch)
            .ok_or_else(|| XrplError::Base58(format!("`{ch}` is not in the XRPL alphabet")))?;
        let mut carry = idx as u32;
        for b in bytes.iter_mut() {
            carry += (*b as u32) * 58;
            *b = (carry & 0xFF) as u8;
            carry >>= 8;
        }
        while carry > 0 {
            bytes.push((carry & 0xFF) as u8);
            carry >>= 8;
        }
    }
    let leading = s.chars().take_while(|c| *c == ALPHABET[0] as char).count();
    let mut out = vec![0u8; leading];
    out.extend(bytes.iter().rev().skip_while(|b| **b == 0).copied());
    if out.len() == leading {
        out.push(0);
        out.truncate(leading.max(1));
    }
    Ok(out)
}

/// `r…` classic address from an AccountID.
pub fn encode_address(account_id: &[u8; 20]) -> String {
    base58check_encode(VER_ACCOUNT_ID, account_id)
}

/// AccountID from an `r…` classic address, **checksum verified**.
///
/// `txn::normalise_account` checks shape and alphabet only, and says so. This
/// is the real thing, and it is what the signing path uses.
pub fn decode_address(addr: &str) -> R<[u8; 20]> {
    let v = base58check_decode(addr, VER_ACCOUNT_ID)?;
    if v.len() != 20 {
        return Err(XrplError::Length { what: "AccountID", want: 20, got: v.len() });
    }
    let mut out = [0u8; 20];
    out.copy_from_slice(&v);
    Ok(out)
}

// ---------------------------------------------------------------------------
// Account keys
// ---------------------------------------------------------------------------

/// Which signature algorithm an account key uses.
///
/// XRPL supports both, and Devnet's faucet hands out **ed25519** — every
/// account in this project's own Devnet state has an `sEd…` seed. A signer
/// that only spoke secp256k1 could not sign for any of them.
///
/// ⚠ **The two sign different things.** secp256k1 signs `SHA512Half` of the
/// signing serialisation; ed25519 signs those bytes **directly**, because
/// Ed25519 hashes internally. Getting that backwards produces a signature that
/// verifies against nothing, and it is pinned by vectors rather than reasoned
/// about.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyAlgorithm {
    Secp256k1,
    Ed25519,
}

/// A secp256k1 XRPL account key, derived from a family seed.
///
/// ⚠ **Devnet keys only.** ~~Architecture §6 step 6 owns real key handling and
/// still owes issues #10 and #11.~~ **Step 6 is built as of 2026-08-20**, and
/// what it changed for this type is that the seed below may now also be the
/// ElGamal derivation input. Issue #10 remains open. Nothing that reaches this
/// type should ever hold value.
///
/// ⚠ **The master seed is also the ElGamal derivation input under REVIEW-012c**,
/// so a holder who has retired their master key — `lsfDisableMaster`, a regular
/// key, a signer list — is in the case that ruling's condition 2 requires a
/// warning for. This type does not know about the ledger and cannot check it;
/// step 6's onboarding must.
pub struct AccountKey {
    inner: Inner,
    public: [u8; 33],
}

enum Inner {
    Secp256k1(SigningKey),
    Ed25519(Box<ed25519_dalek::SigningKey>),
}

impl std::fmt::Debug for AccountKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AccountKey")
            .field("public", &hex(&self.public))
            .field("secret", &"<redacted>")
            .field("address", &self.address())
            .field("algorithm", &self.algorithm())
            .finish()
    }
}

impl AccountKey {
    /// XRPL's secp256k1 family-seed derivation.
    ///
    /// Two stages, both `SHA512Half` with a rejection loop on an out-of-range
    /// candidate:
    ///
    /// 1. **root** — `candidate(i) = SHA512Half(seed16 ‖ u32be(i))`, first
    ///    valid scalar wins.
    /// 2. **account** — `intermediate(i) = SHA512Half(rootpub33 ‖ u32be(0) ‖ u32be(i))`,
    ///    and the account key is `root + intermediate mod n`.
    ///
    /// ⚠ **Unrelated to the ElGamal keygen ruling.** That derivation is
    /// REVIEW-012's, lives in its ruling document only, and is step 6.
    pub fn from_family_seed(seed: &str) -> R<AccountKey> {
        let (entropy, algo) = decode_family_seed(seed)?;
        match algo {
            KeyAlgorithm::Ed25519 => Self::ed25519_from_entropy(&entropy),
            KeyAlgorithm::Secp256k1 => Self::from_entropy(&entropy),
        }
    }

    /// XRPL's ed25519 derivation: the private key is `SHA512Half(entropy)`, and
    /// the public key is that key's Ed25519 point with a leading `0xED` so the
    /// 33-byte field can carry either algorithm.
    pub fn ed25519_from_entropy(entropy: &[u8]) -> R<AccountKey> {
        if entropy.len() != 16 {
            return Err(XrplError::Length { what: "ed25519 seed", want: 16, got: entropy.len() });
        }
        let sk = ed25519_dalek::SigningKey::from_bytes(&sha512half(entropy));
        let mut public = [0u8; 33];
        public[0] = 0xED;
        public[1..].copy_from_slice(sk.verifying_key().as_bytes());
        Ok(AccountKey { inner: Inner::Ed25519(Box::new(sk)), public })
    }

    pub fn algorithm(&self) -> KeyAlgorithm {
        match self.inner {
            Inner::Secp256k1(_) => KeyAlgorithm::Secp256k1,
            Inner::Ed25519(_) => KeyAlgorithm::Ed25519,
        }
    }

    pub fn from_entropy(entropy: &[u8]) -> R<AccountKey> {
        let root = derive_scalar(|i| {
            let mut m = entropy.to_vec();
            m.extend_from_slice(&(i as u32).to_be_bytes());
            sha512half(&m)
        })?;
        let root_pub = {
            use k256::elliptic_curve::sec1::ToEncodedPoint;
            k256::PublicKey::from_secret_scalar(&root).to_encoded_point(true).as_bytes().to_vec()
        };

        let intermediate = derive_scalar(|i| {
            let mut m = root_pub.clone();
            m.extend_from_slice(&0u32.to_be_bytes());
            m.extend_from_slice(&(i as u32).to_be_bytes());
            sha512half(&m)
        })?;

        let sum: k256::Scalar = *root.as_ref() + *intermediate.as_ref();
        let signing = SigningKey::from_bytes(&sum.to_bytes())
            .map_err(|e| XrplError::Key(format!("account scalar is not a valid key: {e}")))?;
        let pubkey = signing.verifying_key().to_encoded_point(true);
        let mut public = [0u8; 33];
        public.copy_from_slice(pubkey.as_bytes());
        Ok(AccountKey { inner: Inner::Secp256k1(signing), public })
    }

    pub fn public(&self) -> &[u8; 33] {
        &self.public
    }

    pub fn account_id(&self) -> [u8; 20] {
        account_id_of(&self.public)
    }

    pub fn address(&self) -> String {
        encode_address(&self.account_id())
    }

    /// Sign the **signing serialisation**, including its `STX\0` prefix.
    ///
    /// This takes the message rather than a digest because the two algorithms
    /// disagree about what is hashed, and letting a caller pick would be
    /// letting a caller get it wrong:
    ///
    /// * **secp256k1** — ECDSA over `SHA512Half(message)`, DER-encoded, low-`S`
    ///   normalised, with **hedged** RFC 6979 `k` — deterministic plus fresh
    ///   auxiliary entropy, per `REVIEW-018`.
    /// * **ed25519** — a raw 64-byte signature over `message` itself, with a
    ///   **hedged** RFC 8032 nonce prefix, per `REVIEW-024`. Ed25519 hashes
    ///   internally; pre-hashing would produce a signature over the wrong
    ///   thing.
    ///
    /// **Both arms draw their auxiliary entropy here and nowhere else**, and
    /// both degrade to their standard deterministic construction when the draw
    /// reports a failure. This is the only signing entry point that exists in a
    /// build without `test-support`.
    pub fn sign_message(&self, message: &[u8]) -> R<Vec<u8>> {
        self.sign_with_aux(fresh_aux(), message)
    }

    /// Sign, choosing where the nonce's auxiliary entropy comes from.
    ///
    /// ⚠ **`test-support` only, as of the B-16 build — `CLAIMS.md` B-20.** This
    /// was `pub` in an ordinary release build with only a doc comment saying the
    /// deterministic arm was for vectors; every caller was a test and nothing
    /// enforced it. Found by `REVIEW-024`'s Codex leg, and it is the same shape
    /// `REVIEW-014` found when the README claimed a release build dropped
    /// `test-support`. Gated the way `confirm::acknowledgement_for_test` is.
    #[doc(hidden)]
    #[cfg(feature = "test-support")]
    pub fn sign_message_with(&self, hedge: Hedge, message: &[u8]) -> R<Vec<u8>> {
        // ⚠ **The wrapper goes on HERE, not inside `Hedge`.** `Hedge` is `Copy`
        // and its bytes are a test's own literal rather than drawn entropy, so
        // wrapping the enum would buy nothing and cost its `Copy`. What matters
        // is that everything reaching `sign_with_aux` wipes on drop, and B-21's
        // subject is the signing helper. `Hedge::aux`'s own returned copy is
        // **not** covered and is named as such at that function.
        self.sign_with_aux(hedge.aux().map(Zeroizing::new), message)
    }

    /// **The one signing implementation.** Both entry points call this and
    /// nothing else signs.
    ///
    /// ⚠ **This is the property `REVIEW-018`'s two legs made the deterministic
    /// arm conditional on, and until 2026-08-27 it was true by inspection and
    /// enforced by nothing.** `tests/hedged_signing.rs::one_implementation_not_two`
    /// was named for it and could not see it: it asserted both arms are DER,
    /// low-`S` and verify under the same key, and **two independently written
    /// correct signers pass all of that** (`REVIEW-024` §4d, `CLAIMS.md` E-161).
    /// A private helper taking the varied input is the structural form, and it
    /// is a condition on the B-16 build (`REVIEW-024` §7 item 1) — for **both**
    /// algorithms, not only the one the ruling was about.
    ///
    /// `aux` is `Some` when the nonce is hedged and `None` when it is not.
    /// `None` reaches here two ways and they must stay distinguishable from the
    /// caller's side: the deterministic vector arm asks for it, and a *reported*
    /// entropy failure degrades to it. ⚠ **`Some([0u8; 32])` is neither** — it
    /// is a successful draw and it is hedged.
    ///
    /// ⚠ **`Zeroizing` is B-21 and changes no construction.** The bytes inside
    /// are the same bytes; the wrapper only gives them a `Drop`. Every KAT and
    /// every cross-implementation vector in `tests/` is unchanged and green,
    /// which is what says the refactor was a refactor.
    fn sign_with_aux(&self, aux: Option<Zeroizing<[u8; 32]>>, message: &[u8]) -> R<Vec<u8>> {
        match &self.inner {
            Inner::Secp256k1(k) => {
                let prehash = sha512half(message);
                let sig: Signature = match aux {
                    // RFC 6979 §3.6: 32 bytes of fresh entropy as the
                    // additional data `k` is derived over.
                    Some(aux) => k
                        .sign_prehash_with_rng(&mut OneShotAux::new(aux), &prehash)
                        .map_err(|e| XrplError::Key(format!("signing failed: {e}")))?,
                    // ⚠ **Empty additional data, NOT thirty-two zero bytes.**
                    // `rfc6979::generate_k` seeds an HMAC-DRBG with
                    // `key ‖ h1 ‖ ad`, so zeros are *data* and produce a
                    // different `k` from omitting it. `REVIEW-018`'s Gemini leg
                    // wrote "aux_rand = 0^32 (or is omitted)" as though the two
                    // were the same; following that literally would have broken
                    // the vector pinning the arm exists for.
                    None => k
                        .sign_prehash(&prehash)
                        .map_err(|e| XrplError::Key(format!("signing failed: {e}")))?,
                };
                Ok(sig.normalize_s().unwrap_or(sig).to_der().as_bytes().to_vec())
            }
            Inner::Ed25519(k) => {
                use ed25519_dalek::hazmat::{raw_sign, ExpandedSecretKey};
                use ed25519_dalek::VerifyingKey;

                // `h := SHA512(sk)`, then `ExpandedSecretKey::from_bytes` splits
                // it exactly as RFC 8032 Appendix A does: `clamp(h[0..32])` as
                // the scalar, `h[32..64]` as the nonce prefix. This is
                // byte-for-byte what `SigningKey::try_sign` computes —
                // `signing.rs:566-569` is
                // `ExpandedSecretKey::from(&secret_key).raw_sign::<Sha512>(msg, &vk)`
                // — which is why the unmasked arm below is not an approximation
                // of RFC 8032 but the same expression.
                // ⚠ `as_bytes`, not `to_bytes`: `to_bytes` returns the secret
                // **by value** (`signing.rs:114`) and that copy is a stack local
                // no `Drop` reaches — in the same commit that enabled `zeroize`
                // so secret material would be wiped. `REVIEW-025`, self leg.
                //
                // ⚠ **`h` and `mask` were the same class and are now wiped —
                // B-21, 2026-08-27.** [`sha512_zeroizing`] returns a buffer with
                // a `Drop`, and wipes the `Output<Sha512>` it copied out of. Read
                // that function for the three residues it does **not** reach; one
                // of them is inside `from_slice` on the very next line, which does
                // `bytes.try_into()` into an unwiped `[u8; 64]` before
                // `from_bytes` consumes it (`hazmat.rs:108-117`). That copy is
                // the crate's and this signer cannot reach it.
                let h = sha512_zeroizing(&[k.as_bytes()]);
                let mut esk = ExpandedSecretKey::from_slice(&h[..])
                    .map_err(|e| XrplError::Key(format!("expanding the ed25519 key failed: {e}")))?;

                if let Some(aux) = aux {
                    // `q := p XOR SHA512(DST ‖ aux)[0..32]`.
                    //
                    // ⚠ The mask covers **only** `hash_prefix`. `esk.scalar` is
                    // untouched, so `A`, the signature equation and every byte a
                    // verifier checks are exactly RFC 8032's.
                    //
                    // ⚠ **The mask is secret material too, and it is not
                    // obviously so.** It is `SHA512(DST ‖ aux)` over a public
                    // constant and 32 bytes of fresh entropy — but `q = p XOR
                    // mask` is the nonce prefix, so anyone holding the mask and
                    // one signature recovers `p`. B-21 wipes it for the same
                    // reason it wipes `h`.
                    let mask = sha512_zeroizing(&[ED25519_NONCE_HEDGE_DST, &aux[..]]);
                    for (b, m) in esk.hash_prefix.iter_mut().zip(mask.iter()) {
                        *b ^= *m;
                    }
                }

                // ⚠ **`REVIEW-024` §7 item 2, and it is what contains enabling
                // `hazmat` at all.** `A` is derived here, from this same
                // expanded key, and is never a parameter this signer accepts. It
                // is the one input to `raw_sign` that enters the challenge
                // `H(R ‖ A ‖ M)` without entering `s = r + k·a`; supplying a
                // mismatched one gives an attacker two equations in one unknown
                // and recovers the secret scalar. That is the attack the crate's
                // hazmat warning points at.
                let vk = VerifyingKey::from(&esk);
                // ⚠ **A hard assert, and it was `debug_assert_eq!` for one
                // commit — compiled out of the only binary that signs real
                // transactions.** `REVIEW-025`, self leg and Gemini leg. It sat
                // directly under the comment above, so a reader took it for the
                // guard against the attack that comment describes, and
                // `make signer-release` did not have it. That is `REVIEW-014`'s
                // shape again: present in the build you test, absent from the
                // build you ship.
                //
                // The condition cannot be false today — `vk` comes from the same
                // expanded key three lines up and `self.public` from the same
                // seed — so this guards a *future* edit, which is exactly the
                // kind that survives to release. `OneShotAux`'s precedent
                // applies: stopping beats continuing with weakened crypto, and
                // `[profile.release] panic = "abort"` makes it a clean stop.
                assert_eq!(
                    vk.as_bytes()[..],
                    self.public[1..],
                    "the verifying key derived for signing is not the one this signer publishes \
                     as SigningPubKey. A is the one input that enters the challenge H(R || A || M) \
                     without entering s = r + k*a, so a mismatch makes every signature this key \
                     emits inconsistent with the key a verifier checks against, and is the \
                     precondition the ed25519-unsafe-libs key-recovery attacks build on. \
                     Refusing to continue"
                );

                // ⚠ Pure Ed25519 over `message` itself, NOT Ed25519ph. Ed25519
                // hashes internally and pre-hashing would sign the wrong thing.
                Ok(raw_sign::<Sha512>(&esk, message, &vk).to_bytes().to_vec())
            }
        }
    }
}

/// The fixed 29-byte domain separator the ed25519 nonce mask is tagged under.
///
/// `REVIEW-024` §3, normative and not to be regenerated from a description of
/// it. The trailing `0x00` is part of the tag, not a C string terminator.
///
/// ⚠ **`pub` so that a test can actually reach it.** It was `pub(crate)`, and
/// `the_dst_is_the_ruled_bytes` — an integration test, which cannot see
/// `pub(crate)` — therefore compared a literal to the same literal while this
/// comment claimed it *"pins all 29 of them"*. **A tautology under a sentence
/// asserting it was not one.** Found by `REVIEW-025`'s self leg and its Codex
/// leg independently. Publishing a constant removes no capability.
///
/// What pins it now: `the_dst_is_the_ruled_bytes` compares **this constant** to
/// a literal written out in the test, and
/// `the_construction_matches_a_second_model` pins it behaviourally, because the
/// vectors were produced under the ruled DST by a separate implementation.
pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1\0";

/// Draw the auxiliary entropy for a hedged nonce, or report that the draw
/// failed.
///
/// ⚠ **Degrade, do not refuse — and the two are not interchangeable.**
/// Architecture §4 keeps the randomness rules side by side because they differ:
/// `r`/`ρ` **refuse to sign**, because entropy *is* the source there and `r` is
/// published on chain; sigma nonces **degrade**, because entropy is a hedge over
/// a deterministic core that is safe on its own. Both signing nonces have the
/// second shape, so both degrade to their standard construction — RFC 6979 and
/// RFC 8032 respectively — rather than declining to sign.
///
/// `REVIEW-018`'s Codex leg said refuse. That would import the `r`/`ρ` rule into
/// a site with the sigma-nonce shape, which is the merge `CLAUDE.md` warns
/// against by name, and it was rejected. `REVIEW-024` reached the same answer
/// for ed25519 and **corrected its own self leg**, which had ruled that failure
/// should land on a third fixed construction.
///
/// ⚠ **A successful draw of thirty-two zero bytes returns `Some([0u8; 32])`.**
/// That is a hedged signature. Only the `Err` arm below returns `None`.
///
/// ⚠ **`Zeroizing` is B-21 and does not change the draw.** The buffer is filled
/// by the same `getrandom` and carries the same bytes; the wrapper gives it a
/// `Drop`. `a_successful_all_zero_draw_still_hedges` is unchanged and still
/// green, which is what says so — the `Some`/`None` distinction lives in the
/// match arms here and the wrapper is outside it.
///
/// ⚠ **Returning it still leaves a copy.** `Some(b)` moves the buffer, and a
/// Rust move is a bitwise copy that does not run `Drop` on its source. What is
/// bounded is the lifetime of every *named binding* along the way, not every
/// byte the compiler ever wrote down. Boxing would fix this one site and was not
/// taken: it trades an allocation on the signing path for a residue that
/// `sha512_zeroizing`'s note 2 says is unfixable in general anyway.
fn fresh_aux() -> Option<Zeroizing<[u8; 32]>> {
    let mut b = Zeroizing::new([0u8; 32]);
    match crate::store::getrandom(&mut b[..]) {
        Ok(()) => Some(b),
        Err(_) => None,
    }
}

/// Where a signing nonce's auxiliary entropy comes from.
///
/// ⚠ **`test-support` only — `CLAIMS.md` B-20.** The default path does not go
/// through this type at all: [`AccountKey::sign_message`] calls [`fresh_aux`]
/// and then the same private helper this does. A release build cannot ask for a
/// deterministic signature or supply its own auxiliary bytes.
///
/// ⚠ Its doc used to say the default draw happens in `Hedge::aux`. It does not,
/// and has not since the §7 item 1 restructure — `REVIEW-025`, Codex leg.
///
/// **`CLAIMS.md` B-14, ruled 2026-08-20 (`REVIEW-018`); B-16, ruled 2026-08-27
/// (`REVIEW-024`).** The issue #1 ruling — a hostile same-host process is in the
/// threat model — is what made the sigma nonces hedged. It extends to both
/// signing nonces: they protect the **account key**, and under the ruled keygen
/// construction that key is also the input the ElGamal decryption key is derived
/// from, so a nonce failure is a confidentiality failure as well as a spending
/// one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[cfg(feature = "test-support")]
pub enum Hedge {
    // ⚠ **A `Fresh` variant was here and is gone.** It had exactly one
    // reference in the repository — its own match arm — because
    // `sign_message` calls `fresh_aux` directly and does not go through this
    // type at all. That made it *a second, unexercised entry to fresh
    // entropy*, which is a small version of the problem §7 item 1 exists to
    // solve. `REVIEW-025`, self leg. `sign_message` is what `Fresh` was.
    /// No mask — **for cross-implementation vectors only.**
    ///
    /// `ripple-keypairs` is deterministic, so byte-for-byte pinning is only
    /// possible on this arm. For secp256k1 it is pure RFC 6979; for ed25519 it
    /// is **byte-identical RFC 8032**, because an unmasked `hash_prefix` makes
    /// `raw_sign` the same expression `SigningKey::sign` evaluates. It pins the
    /// serialisation, the digest choice, the low-`S` normalisation and the DER
    /// encoding, which is what that test was ever really for.
    ///
    /// ⚠ This is also where a **reported entropy failure** lands, which is what
    /// makes that failure testable by equality rather than by a third pinned
    /// construction (`REVIEW-024` §4b).
    DeterministicForVectors,
    /// A caller-chosen mask — **for driving the construction in tests.**
    ///
    /// `REVIEW-024` §6 item 2: the hedge has to be *drivable* rather than only
    /// observable, or the only checkable property is "the output changed". With
    /// a fixed `aux` the mask is reproducible, so message separation, `R`
    /// distinctness and the KAT against a second model all become equalities.
    /// ⚠ *"an independent implementation"* here for one commit — the curve
    /// library is external, the model is this project's (`REVIEW-025`).
    ///
    /// ⚠ **`FixedAux([0u8; 32])` is a HEDGED signature and differs from
    /// [`Self::DeterministicForVectors`].** `REVIEW-018` §4a got the mirror of
    /// this wrong for secp256k1 — treating `aux = 0³²` and *omitted* as
    /// interchangeable, which would have broken the vector pinning. Here the
    /// same pair must stay distinct in the opposite direction.
    ///
    /// ⚠ Architecture §3 rule 5 forbids caller-supplied randomness on anything
    /// that can sign, which is why this variant does not exist in a release
    /// build rather than merely being discouraged in one.
    FixedAux([u8; 32]),
}

#[cfg(feature = "test-support")]
impl Hedge {
    /// ⚠ **Not `Zeroizing`, deliberately — B-21 does not cover this copy.**
    /// `Hedge` is `Copy`, its bytes are a test's own literal rather than drawn
    /// entropy, and this arm does not exist in a release build at all. The
    /// wrapper goes on at [`AccountKey::sign_message_with`], which is where the
    /// value enters the helper B-21 is about. Saying "the aux bytes are wiped"
    /// without this sentence would be the overstatement `REVIEW-026` found round
    /// one making about its own fixes.
    fn aux(self) -> Option<[u8; 32]> {
        match self {
            Hedge::DeterministicForVectors => None,
            Hedge::FixedAux(a) => Some(a),
        }
    }
}

/// Feeds exactly the bytes it was given, once.
///
/// `sign_prehash_with_rng` wants an RNG; this project wants to choose the
/// entropy source and to know when it failed. So the draw happens in
/// [`fresh_aux`] — through the same `getrandom` every other site uses — and this
/// hands those bytes over.
///
/// ⚠ This said the draw happens in `Hedge::aux`, which stopped being true at the
/// §7 item 1 restructure. `REVIEW-025`'s Codex leg named the staleness and round
/// one annotated **a different occurrence of it**, leaving this one standing.
///
/// ⚠ **`bytes` is `Zeroizing` — B-21, and this one was NOT in B-21's registered
/// list.** The row named the SHA-512 expansion, the mask and `fresh_aux`'s
/// buffer; this holds the same 32 drawn bytes for the whole of
/// `sign_prehash_with_rng`, which is the longest any of them is live. It is the
/// same class at the same helper, so it is fixed here rather than filed as a
/// fourth thing — and it is called out rather than folded in silently, because
/// a widened scope recorded as if it were the original is how a fix comes to
/// claim more than it did.
struct OneShotAux {
    bytes: Zeroizing<[u8; 32]>,
    used: usize,
}

impl OneShotAux {
    fn new(bytes: Zeroizing<[u8; 32]>) -> OneShotAux {
        OneShotAux { bytes, used: 0 }
    }
}

impl k256::elliptic_curve::rand_core::RngCore for OneShotAux {
    fn next_u32(&mut self) -> u32 {
        let mut b = [0u8; 4];
        self.fill_bytes(&mut b);
        u32::from_le_bytes(b)
    }
    fn next_u64(&mut self) -> u64 {
        let mut b = [0u8; 8];
        self.fill_bytes(&mut b);
        u64::from_le_bytes(b)
    }
    fn fill_bytes(&mut self, dest: &mut [u8]) {
        // ⚠ **Over-drawing PANICS rather than repeating.**
        //
        // This held 32 bytes and wrapped with `% 32` if asked for more, on the
        // reasoning that `sign_prehash_with_rng` asks for exactly the field
        // size. That is true at `ecdsa 0.16.9` and it is not a property this
        // code controls — and the test that claimed to guard it
        // (`aux_is_exactly_one_field_of_entropy`) could not: repeated entropy
        // still produces distinct signatures, so the assertion passed either
        // way. **A test that cannot see the thing it is named for is the
        // failure mode this project keeps finding**, so the check moved here,
        // where it is enforced rather than asserted.
        //
        // Continuing with recycled entropy would silently weaken a nonce
        // derivation, which is worse than stopping.
        assert!(
            self.used + dest.len() <= 32,
            "the ECDSA nonce's auxiliary entropy was drawn beyond one field element \
             ({} + {} > 32). Recycling it would silently weaken the nonce, so this stops \
             instead. A crate upgrade changed how much `sign_prehash_with_rng` asks for; \
             CLAIMS.md B-14",
            self.used,
            dest.len()
        );
        dest.copy_from_slice(&self.bytes[self.used..self.used + dest.len()]);
        self.used += dest.len();
    }
    fn try_fill_bytes(
        &mut self,
        dest: &mut [u8],
    ) -> Result<(), k256::elliptic_curve::rand_core::Error> {
        self.fill_bytes(dest);
        Ok(())
    }
}

impl k256::elliptic_curve::rand_core::CryptoRng for OneShotAux {}

/// Decode an `sEd…` seed to its 16 bytes of entropy, checksum verified.
pub fn decode_ed25519_seed(seed: &str) -> R<[u8; 16]> {
    let raw = b58_decode(seed)?;
    if raw.len() != 3 + 16 + 4 {
        return Err(XrplError::Length { what: "ed25519 seed", want: 23, got: raw.len() });
    }
    let (body, check) = raw.split_at(raw.len() - 4);
    let c = Sha256::digest(Sha256::digest(body));
    if check != &c[..4] {
        return Err(XrplError::Checksum);
    }
    if body[..3] != VER_ED25519_SEED {
        return Err(XrplError::VersionPrefix {
            what: "ed25519 seed",
            want: VER_ED25519_SEED.to_vec(),
            got: body[..3].to_vec(),
        });
    }
    let mut out = [0u8; 16];
    out.copy_from_slice(&body[3..]);
    Ok(out)
}

/// Decode a family seed to its **16 bytes of entropy and its type**.
///
/// The keygen ruling's §2.1 needs both — `seed_type` and `seed_bytes` are
/// separate framed fields of the derivation preimage, so the same 16 bytes
/// under two seed types must produce two different keys. Splitting the decoder
/// out of [`AccountKey::from_family_seed`] means there is one decoder rather
/// than two that can disagree about what a seed is.
///
/// **Exactly 16 bytes or an error.** `len(seed_bytes) != 16` is one of §2.1's
/// refusals and it is enforced here, in the type the caller receives, rather
/// than re-checked downstream.
pub fn decode_family_seed(seed: &str) -> R<([u8; 16], KeyAlgorithm)> {
    if seed.starts_with("sEd") {
        return Ok((decode_ed25519_seed(seed)?, KeyAlgorithm::Ed25519));
    }
    let entropy = base58check_decode(seed, VER_FAMILY_SEED)?;
    if entropy.len() != 16 {
        return Err(XrplError::Length { what: "family seed", want: 16, got: entropy.len() });
    }
    let mut out = [0u8; 16];
    out.copy_from_slice(&entropy);
    Ok((out, KeyAlgorithm::Secp256k1))
}

/// The rejection loop both derivation stages share: increment until the
/// candidate is a valid non-zero scalar below the group order.
fn derive_scalar<F: Fn(u32) -> [u8; 32]>(f: F) -> R<k256::NonZeroScalar> {
    for i in 0u32..=u32::MAX {
        let candidate = f(i);
        if let Ok(sk) = k256::SecretKey::from_slice(&candidate) {
            return Ok(sk.to_nonzero_scalar());
        }
    }
    Err(XrplError::Key("no valid scalar in 2^32 candidates".into()))
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

/// How a field's bytes are laid out.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    UInt16,
    UInt32,
    UInt64,
    /// Fixed-width hash, length in bytes. `Hash192` is `MPTokenIssuanceID`.
    Hash(usize),
    /// XRP drops. `Amount` in the definitions; only the XRP form is produced.
    Amount,
    /// Variable-length, VL-prefixed.
    Blob,
    /// 20 bytes, VL-prefixed like a Blob.
    AccountId,
}

impl Kind {
    fn type_code(&self) -> u16 {
        match self {
            Kind::UInt16 => 1,
            Kind::UInt32 => 2,
            Kind::UInt64 => 3,
            Kind::Hash(32) => 5,
            Kind::Hash(24) => 21,
            Kind::Hash(n) => panic!("no type code for a {n}-byte hash in this table"),
            Kind::Amount => 6,
            Kind::Blob => 7,
            Kind::AccountId => 8,
        }
    }
    fn vl_encoded(&self) -> bool {
        matches!(self, Kind::Blob | Kind::AccountId)
    }
}

/// The wire type code for a [`Kind`], exposed so `tests/xrpl_vectors.rs` can
/// compare it against the codec's `TYPES` table.
pub fn type_code_of(kind: Kind) -> u16 {
    kind.type_code()
}

/// One field of a transaction.
///
/// The `nth` codes come from `ripple-binary-codec@2.9.0`'s `definitions.json`,
/// which `CLAIMS.md` E-46 records as verified against a live node's
/// `server_definitions` across all 381 fields. `tests/xrpl_vectors.rs` fails if
/// any of them is wrong, because a wrong code changes the encoding.
#[derive(Debug, Clone, Copy)]
pub struct FieldDef {
    pub name: &'static str,
    pub kind: Kind,
    pub nth: u16,
    /// `false` only for `TxnSignature`, which is excluded from the signing
    /// serialisation by definition.
    pub signing: bool,
}

pub const TRANSACTION_TYPE: FieldDef =
    FieldDef { name: "TransactionType", kind: Kind::UInt16, nth: 2, signing: true };
pub const NETWORK_ID: FieldDef =
    FieldDef { name: "NetworkID", kind: Kind::UInt32, nth: 1, signing: true };
pub const FLAGS: FieldDef = FieldDef { name: "Flags", kind: Kind::UInt32, nth: 2, signing: true };
pub const SEQUENCE: FieldDef =
    FieldDef { name: "Sequence", kind: Kind::UInt32, nth: 4, signing: true };
pub const LAST_LEDGER_SEQUENCE: FieldDef =
    FieldDef { name: "LastLedgerSequence", kind: Kind::UInt32, nth: 27, signing: true };
pub const MPT_AMOUNT: FieldDef =
    FieldDef { name: "MPTAmount", kind: Kind::UInt64, nth: 26, signing: true };
pub const BLINDING_FACTOR: FieldDef =
    FieldDef { name: "BlindingFactor", kind: Kind::Hash(32), nth: 40, signing: true };
pub const FEE: FieldDef = FieldDef { name: "Fee", kind: Kind::Amount, nth: 8, signing: true };
pub const SIGNING_PUB_KEY: FieldDef =
    FieldDef { name: "SigningPubKey", kind: Kind::Blob, nth: 3, signing: true };
pub const TXN_SIGNATURE: FieldDef =
    FieldDef { name: "TxnSignature", kind: Kind::Blob, nth: 4, signing: false };
pub const HOLDER_ENCRYPTION_KEY: FieldDef =
    FieldDef { name: "HolderEncryptionKey", kind: Kind::Blob, nth: 36, signing: true };
pub const ZK_PROOF: FieldDef = FieldDef { name: "ZKProof", kind: Kind::Blob, nth: 37, signing: true };
pub const HOLDER_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "HolderEncryptedAmount", kind: Kind::Blob, nth: 38, signing: true };
pub const ISSUER_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "IssuerEncryptedAmount", kind: Kind::Blob, nth: 39, signing: true };
pub const SENDER_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "SenderEncryptedAmount", kind: Kind::Blob, nth: 40, signing: true };
pub const DESTINATION_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "DestinationEncryptedAmount", kind: Kind::Blob, nth: 41, signing: true };
/// ⚠ **nth 43, not 42.** 42 is `AuditorEncryptedBalance`, a different field on
/// a different object. A review leg proposed 42 for this and it would have
/// produced a transaction that encodes cleanly and means something else.
pub const AUDITOR_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "AuditorEncryptedAmount", kind: Kind::Blob, nth: 43, signing: true };
pub const AMOUNT_COMMITMENT: FieldDef =
    FieldDef { name: "AmountCommitment", kind: Kind::Blob, nth: 45, signing: true };
pub const BALANCE_COMMITMENT: FieldDef =
    FieldDef { name: "BalanceCommitment", kind: Kind::Blob, nth: 46, signing: true };
pub const ACCOUNT: FieldDef =
    FieldDef { name: "Account", kind: Kind::AccountId, nth: 1, signing: true };
pub const DESTINATION: FieldDef =
    FieldDef { name: "Destination", kind: Kind::AccountId, nth: 3, signing: true };
pub const MPT_ISSUANCE_ID: FieldDef =
    FieldDef { name: "MPTokenIssuanceID", kind: Kind::Hash(24), nth: 1, signing: true };

/// Networks at or below this ID must **omit** `NetworkID`; above it, they
/// require it.
///
/// Devnet is 2. A `ConfidentialMPTSend` carrying `NetworkID: 2` was rejected on
/// Devnet with `telNETWORK_ID_MAKES_TX_NON_CANONICAL` on 2026-08-18 —
/// observed, not read off a document.
pub const NETWORK_ID_OMIT_AT_OR_BELOW: u32 = 1024;

/// `TRANSACTION_TYPES` from the same definitions.
pub mod tx_type {
    pub const CONFIDENTIAL_MPT_CONVERT: u16 = 85;
    pub const CONFIDENTIAL_MPT_MERGE_INBOX: u16 = 86;
    pub const CONFIDENTIAL_MPT_CONVERT_BACK: u16 = 87;
    pub const CONFIDENTIAL_MPT_SEND: u16 = 88;
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

/// A field with its value, ready to serialise.
pub struct Field {
    def: FieldDef,
    value: Vec<u8>,
}

/// An `STObject` under construction. Fields may be added in any order; the
/// canonical order is imposed at serialisation time.
/// 100 billion XRP, in drops — the total supply, and the largest value an XRPL
/// native Amount can express.
pub const MAX_DROPS: u64 = 100_000_000_000 * 1_000_000;

#[derive(Default)]
pub struct TxBuilder {
    fields: Vec<Field>,
    /// Set by [`TxBuilder::drops`] when a value exceeds [`MAX_DROPS`], so the
    /// refusal happens at `serialize` where it can be returned.
    overflowed_drops: Option<(&'static str, u64)>,
}

impl TxBuilder {
    pub fn new() -> TxBuilder {
        TxBuilder { fields: Vec::new(), overflowed_drops: None }
    }

    pub fn u16(mut self, def: FieldDef, v: u16) -> Self {
        self.fields.push(Field { def, value: v.to_be_bytes().to_vec() });
        self
    }
    pub fn u32(mut self, def: FieldDef, v: u32) -> Self {
        self.fields.push(Field { def, value: v.to_be_bytes().to_vec() });
        self
    }
    pub fn u64(mut self, def: FieldDef, v: u64) -> Self {
        self.fields.push(Field { def, value: v.to_be_bytes().to_vec() });
        self
    }
    /// XRP drops. Bit 62 marks a positive amount; bit 63 (the "is issued
    /// currency" flag) stays clear for drops.
    ///
    /// ⚠ **Zero is `0x4000000000000000`, not zero.** The positive bit is set
    /// for a zero drops amount too — checked against `ripple-binary-codec`,
    /// not assumed, after a review leg claimed the opposite.
    ///
    /// ⚠ **Bounded.** `MAX_DROPS` is the total XRP supply in drops; anything
    /// above it would set bits the format reserves and produce an Amount that
    /// means something else. An unbounded `|` was the original, and a bad
    /// profile fee of `u64::MAX` would have been signed (`REVIEW-015b`).
    pub fn drops(mut self, def: FieldDef, v: u64) -> Self {
        // Recorded rather than silently clamped: `serialize` refuses it.
        self.fields.push(Field { def, value: (v | 0x4000_0000_0000_0000).to_be_bytes().to_vec() });
        if v > MAX_DROPS {
            self.overflowed_drops = Some((def.name, v));
        }
        self
    }
    pub fn blob(mut self, def: FieldDef, v: &[u8]) -> Self {
        self.fields.push(Field { def, value: v.to_vec() });
        self
    }
    pub fn hash(mut self, def: FieldDef, v: &[u8]) -> Self {
        self.fields.push(Field { def, value: v.to_vec() });
        self
    }
    pub fn account(mut self, def: FieldDef, v: &[u8; 20]) -> Self {
        self.fields.push(Field { def, value: v.to_vec() });
        self
    }

    pub fn has(&self, name: &str) -> bool {
        self.fields.iter().any(|f| f.def.name == name)
    }

    /// Canonical XRPL serialisation.
    ///
    /// Fields sort by `(type code, field code)`, and each is preceded by its
    /// header and, where the type is variable-length, a VL prefix.
    /// `for_signing` drops every field whose `signing` flag is false — which is
    /// `TxnSignature` and nothing else.
    pub fn serialize(&self, for_signing: bool) -> R<Vec<u8>> {
        if let Some((name, v)) = self.overflowed_drops {
            return Err(XrplError::Field(format!(
                "{name} is {v} drops, above the {MAX_DROPS} drop total supply. An Amount that \
                 large sets bits the format reserves and would mean something else"
            )));
        }
        let mut fields: Vec<&Field> =
            self.fields.iter().filter(|f| !for_signing || f.def.signing).collect();
        fields.sort_by_key(|f| (f.def.kind.type_code(), f.def.nth));

        let mut out = Vec::new();
        for f in fields {
            if let Kind::Hash(n) = f.def.kind {
                if f.value.len() != n {
                    return Err(XrplError::Length { what: "hash field", want: n, got: f.value.len() });
                }
            }
            if f.def.kind == Kind::AccountId && f.value.len() != 20 {
                return Err(XrplError::Length {
                    what: "AccountID",
                    want: 20,
                    got: f.value.len(),
                });
            }
            out.extend_from_slice(&field_header(f.def.kind.type_code(), f.def.nth));
            if f.def.kind.vl_encoded() {
                out.extend_from_slice(&vl_prefix(f.value.len())?);
            }
            out.extend_from_slice(&f.value);
        }
        Ok(out)
    }

    /// `"STX\0" ‖ signing serialisation` — the message an account key signs.
    ///
    /// Not a digest, because ed25519 and secp256k1 hash differently and the
    /// choice belongs to [`AccountKey`].
    pub fn signing_message(&self) -> R<Vec<u8>> {
        let mut m = 0x5354_5800u32.to_be_bytes().to_vec();
        m.extend_from_slice(&self.serialize(true)?);
        Ok(m)
    }

    /// `SHA512Half` of [`Self::signing_message`] — what **secp256k1** signs.
    pub fn signing_digest(&self) -> R<[u8; 32]> {
        Ok(sha512half(&self.signing_message()?))
    }
}

/// The field header: a nibble each for type and field code, with a zero nibble
/// meaning "the real code is in the next byte".
pub fn field_header(type_code: u16, field_code: u16) -> Vec<u8> {
    let mut out = Vec::with_capacity(3);
    if type_code < 16 && field_code < 16 {
        out.push(((type_code << 4) as u8) | field_code as u8);
    } else if type_code < 16 {
        out.push((type_code << 4) as u8);
        out.push(field_code as u8);
    } else if field_code < 16 {
        out.push(field_code as u8);
        out.push(type_code as u8);
    } else {
        out.push(0);
        out.push(type_code as u8);
        out.push(field_code as u8);
    }
    out
}

/// XRPL's three-range variable-length prefix.
pub fn vl_prefix(len: usize) -> R<Vec<u8>> {
    if len <= 192 {
        Ok(vec![len as u8])
    } else if len <= 12480 {
        let l = len - 193;
        Ok(vec![193 + (l >> 8) as u8, (l & 0xFF) as u8])
    } else if len <= 918744 {
        let l = len - 12481;
        Ok(vec![241 + (l >> 16) as u8, ((l >> 8) & 0xFF) as u8, (l & 0xFF) as u8])
    } else {
        Err(XrplError::Field(format!("{len} bytes exceeds the VL maximum of 918744")))
    }
}

/// The transaction hash rippled reports: `SHA512Half("TXN\0" ‖ signed blob)`.
pub fn transaction_hash(signed_blob: &[u8]) -> [u8; 32] {
    let mut m = 0x5458_4E00u32.to_be_bytes().to_vec();
    m.extend_from_slice(signed_blob);
    sha512half(&m)
}

pub fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02X}")).collect()
}

pub fn unhex(s: &str) -> R<Vec<u8>> {
    if s.len() % 2 != 0 {
        return Err(XrplError::Field("odd-length hex".into()));
    }
    (0..s.len() / 2)
        .map(|i| {
            u8::from_str_radix(&s[2 * i..2 * i + 2], 16)
                .map_err(|_| XrplError::Field(format!("`{}` is not hex", &s[2 * i..2 * i + 2])))
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/// A field recovered from bytes, keyed by `(type code, field code)`.
///
/// The decoder exists for one reason: architecture §6 step 1's property —
/// *"the confirmation renders fields parsed back out of the transaction the
/// signer built"* — is only real if something actually parses. While the
/// serialisation was a placeholder, a hand-rolled round trip was enough. Now
/// that the bytes are the ones going to a network, the parse has to be of
/// those bytes.
///
/// It decodes **only the field types this signer emits**. An unknown type is an
/// error, not a skip: a decoder that silently ignores what it does not
/// understand would let a field the confirmation never shows ride along.
pub struct Decoded {
    fields: Vec<((u16, u16), Vec<u8>)>,
}

impl Decoded {
    pub fn get(&self, def: FieldDef) -> Option<&[u8]> {
        let key = (def.kind.type_code(), def.nth);
        self.fields.iter().find(|(k, _)| *k == key).map(|(_, v)| v.as_slice())
    }

    pub fn u16(&self, def: FieldDef) -> Option<u16> {
        self.get(def).and_then(|b| b.try_into().ok()).map(u16::from_be_bytes)
    }
    pub fn u32(&self, def: FieldDef) -> Option<u32> {
        self.get(def).and_then(|b| b.try_into().ok()).map(u32::from_be_bytes)
    }
    pub fn u64(&self, def: FieldDef) -> Option<u64> {
        self.get(def).and_then(|b| b.try_into().ok()).map(u64::from_be_bytes)
    }
    /// XRP drops, with the type bit stripped.
    pub fn drops(&self, def: FieldDef) -> Option<u64> {
        self.u64(def).map(|v| v & 0x3FFF_FFFF_FFFF_FFFF)
    }
    pub fn account(&self, def: FieldDef) -> Option<[u8; 20]> {
        self.get(def).and_then(|b| b.try_into().ok())
    }
    pub fn count(&self) -> usize {
        self.fields.len()
    }
    /// Every `(type, field)` pair present, in wire order. Used to assert that
    /// nothing rode along that the confirmation does not show.
    pub fn keys(&self) -> Vec<(u16, u16)> {
        self.fields.iter().map(|(k, _)| *k).collect()
    }

    /// The value at a raw `(type, field)` key, for callers walking [`Self::keys`].
    pub fn fields_at(&self, key: (u16, u16)) -> Option<&[u8]> {
        self.fields.iter().find(|(k, _)| *k == key).map(|(_, v)| v.as_slice())
    }
}

/// Decode a canonical XRPL serialisation.
///
/// Rejects trailing bytes, truncation, a non-canonical field order, and any
/// type this signer does not itself emit.
pub fn decode(bytes: &[u8]) -> R<Decoded> {
    let mut i = 0usize;
    let mut fields: Vec<((u16, u16), Vec<u8>)> = Vec::new();
    let mut last: Option<(u16, u16)> = None;

    while i < bytes.len() {
        let b0 = bytes[i];
        i += 1;
        let hi = (b0 >> 4) as u16;
        let lo = (b0 & 0x0F) as u16;
        let (type_code, field_code) = match (hi, lo) {
            (0, 0) => {
                let t = *bytes.get(i).ok_or(XrplError::Field("truncated type code".into()))? as u16;
                let f =
                    *bytes.get(i + 1).ok_or(XrplError::Field("truncated field code".into()))? as u16;
                i += 2;
                (t, f)
            }
            (0, f) => {
                let t = *bytes.get(i).ok_or(XrplError::Field("truncated type code".into()))? as u16;
                i += 1;
                (t, f)
            }
            (t, 0) => {
                let f =
                    *bytes.get(i).ok_or(XrplError::Field("truncated field code".into()))? as u16;
                i += 1;
                (t, f)
            }
            (t, f) => (t, f),
        };

        // Canonical order is part of the encoding, so a decoder that accepts
        // any order accepts bytes rippled would reject.
        if let Some(prev) = last {
            if (type_code, field_code) <= prev {
                return Err(XrplError::Field(format!(
                    "field ({type_code},{field_code}) is out of canonical order after \
                     ({},{})",
                    prev.0, prev.1
                )));
            }
        }
        last = Some((type_code, field_code));

        let len = match type_code {
            1 => 2,
            2 => 4,
            3 => 8,
            5 => 32,
            6 => 8, // XRP drops only; an issued amount is 48 and this signer emits none
            21 => 24,
            7 | 8 => {
                let (n, used) = read_vl(&bytes[i..])?;
                i += used;
                n
            }
            other => {
                return Err(XrplError::Field(format!(
                    "type code {other} is not one this signer emits; refusing to skip it"
                )))
            }
        };
        if type_code == 6 && bytes.get(i).map(|b| b & 0x80 != 0).unwrap_or(false) {
            return Err(XrplError::Field(
                "an issued-currency Amount was found; this signer emits XRP drops only".into(),
            ));
        }
        let end = i.checked_add(len).ok_or(XrplError::Field("length overflow".into()))?;
        if end > bytes.len() {
            return Err(XrplError::Field(format!(
                "field ({type_code},{field_code}) claims {len} bytes; only {} remain",
                bytes.len() - i
            )));
        }
        fields.push(((type_code, field_code), bytes[i..end].to_vec()));
        i = end;
    }

    Ok(Decoded { fields })
}

fn read_vl(b: &[u8]) -> R<(usize, usize)> {
    let b0 = *b.first().ok_or(XrplError::Field("truncated VL prefix".into()))? as usize;
    if b0 <= 192 {
        Ok((b0, 1))
    } else if b0 <= 240 {
        let b1 = *b.get(1).ok_or(XrplError::Field("truncated VL prefix".into()))? as usize;
        Ok((193 + ((b0 - 193) << 8) + b1, 2))
    } else if b0 <= 254 {
        let b1 = *b.get(1).ok_or(XrplError::Field("truncated VL prefix".into()))? as usize;
        let b2 = *b.get(2).ok_or(XrplError::Field("truncated VL prefix".into()))? as usize;
        Ok((12481 + ((b0 - 241) << 16) + (b1 << 8) + b2, 3))
    } else {
        Err(XrplError::Field(format!("{b0} is not a valid first VL byte")))
    }
}

#[cfg(test)]
mod aux_tests {
    use super::*;
    use k256::elliptic_curve::rand_core::RngCore;

    /// The auxiliary RNG hands over exactly what it was given, in order.
    #[test]
    fn one_shot_aux_yields_its_bytes_once_and_in_order() {
        let mut src = [0u8; 32];
        for (i, b) in src.iter_mut().enumerate() {
            *b = i as u8;
        }
        let mut rng = OneShotAux::new(Zeroizing::new(src));
        let mut out = [0u8; 32];
        rng.fill_bytes(&mut out);
        assert_eq!(out, src, "the aux RNG did not yield the entropy it was given");
    }

    /// ...and refuses to yield more than one field element.
    ///
    /// **This is the check `aux_is_exactly_one_field_of_entropy` could not
    /// make.** Repeated entropy still produces distinct signatures, so no
    /// black-box test over signature outputs can see recycling.
    #[test]
    #[should_panic(expected = "beyond one field element")]
    fn one_shot_aux_refuses_to_recycle() {
        let mut rng = OneShotAux::new(Zeroizing::new([7u8; 32]));
        let mut out = [0u8; 33];
        rng.fill_bytes(&mut out);
    }

    /// **B-21's falsifier, and it is a COMPILE-TIME one on purpose.**
    ///
    /// `REVIEW-025` considered a runtime *"is the buffer zero now?"* assertion
    /// for B-19 and **rejected it**: reading a stack slot after its frame is
    /// gone is undefined behaviour, and the test would pass or fail for reasons
    /// unrelated to the change. E-108's rule — *a revert that does not compile
    /// proves nothing* — inverts for a `Drop`-carrying type, because the compile
    /// failure IS the proof.
    ///
    /// So this names the bound on the **actual return types of the actual
    /// private functions**, not on `Zeroizing` in the abstract. Reverting any of
    /// the three to a bare array fails to compile here. A test that asserted
    /// `Zeroizing::<[u8; 32]>::new(..)` is `ZeroizeOnDrop` would pass forever
    /// while the signer used plain arrays — that is `check-test-support-gate`'s
    /// own false-pass shape (E-165), one layer along.
    ///
    /// ⚠ **It proves the types wipe on drop. It does not prove the secret is
    /// unrecoverable**, and B-21 never claimed that: see `sha512_zeroizing` for
    /// the three residues that remain, and P-5 for why an adversary with code
    /// execution is unaffected either way.
    #[test]
    fn the_signing_helpers_secret_locals_wipe_on_drop() {
        fn wipes_on_drop<T: zeroize::ZeroizeOnDrop>(_: &T) {}

        // `sha512_zeroizing` — the ed25519 expansion `h` and the nonce mask.
        wipes_on_drop(&sha512_zeroizing(&[b"probe"]));

        // `fresh_aux` — the drawn auxiliary entropy.
        //
        // ⚠ **`expect`, not `if let Some`.** The first draft skipped the check
        // when the draw reported a failure, which is a test that passes by not
        // running — the exact shape E-164 and E-161 are about, written into the
        // test whose whole subject is B-21. No hook is armed here, so a `None`
        // is a real entropy failure and this stops instead of certifying
        // nothing.
        let aux = fresh_aux().expect("the entropy draw failed, so this test checked nothing");
        wipes_on_drop(&aux);

        // `OneShotAux` — the same drawn bytes, held for the whole ECDSA sign.
        let rng = OneShotAux::new(Zeroizing::new([0u8; 32]));
        wipes_on_drop(&rng.bytes);
    }

    /// The wiping helper computes **SHA-512** and not something adjacent to it.
    ///
    /// ⚠ **This is the half a trait bound cannot see.** B-21 moved two live
    /// hashes onto a new function; if that function hashed its parts in the
    /// wrong order, or dropped one, every `ZeroizeOnDrop` bound above would
    /// still be satisfied and the nonce construction would have silently
    /// changed. The end-to-end KATs in `tests/hedged_signing.rs` would catch it
    /// — this catches it at the unit that changed, and pins concatenation order
    /// explicitly, which the KATs only do implicitly.
    #[test]
    fn the_wiping_hash_is_sha512_over_its_parts_in_order() {
        assert_eq!(
            sha512_zeroizing(&[b"abc"])[..],
            Sha512::digest(b"abc")[..],
            "the wiping helper is not plain SHA-512"
        );
        assert_eq!(
            sha512_zeroizing(&[b"ab", b"c"])[..],
            Sha512::digest(b"abc")[..],
            "the wiping helper does not concatenate its parts"
        );
        assert_ne!(
            sha512_zeroizing(&[b"a", b"bc"])[..],
            sha512_zeroizing(&[b"bc", b"a"])[..],
            "the wiping helper is order-insensitive, so DST || aux is not pinned"
        );
    }

    /// Two draws that together stay inside the budget are fine; the one that
    /// crosses it is not. Pins the boundary rather than only the far side.
    #[test]
    fn the_budget_is_thirty_two_bytes_in_total_not_per_call() {
        let mut rng = OneShotAux::new(Zeroizing::new([3u8; 32]));
        let mut a = [0u8; 16];
        let mut b = [0u8; 16];
        rng.fill_bytes(&mut a);
        rng.fill_bytes(&mut b);
        assert_eq!(a, [3u8; 16]);
        assert_eq!(b, [3u8; 16]);

        let mut rng = OneShotAux::new(Zeroizing::new([3u8; 32]));
        let mut a = [0u8; 24];
        rng.fill_bytes(&mut a);
        assert!(
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let mut c = [0u8; 16];
                rng.fill_bytes(&mut c);
            }))
            .is_err(),
            "24 + 16 bytes were drawn from a 32-byte budget without stopping"
        );
    }
}

```


## FILE (complete): `signer/src/store.rs`

```rust
//! The durable randomness ledger — REVIEW-010 §7 as amended by **A4–A9**.
//!
//! ⚠ **Built against A4–A9, not A1–A3.** `REVIEW-013c` §3 ruled that both
//! review legs found the signer may **not** be built against A1–A3 as they
//! stood: the set was unauthenticated so truncation and rollback were
//! undetectable (A4), A1's pruning contradicted A2's promote-never-delete (A5),
//! A3's reset was acknowledgeable over IPC and its gap record lived inside the
//! store being reset (A6), §7 step 7 contradicted A2 outright (A7), and the
//! reservation could expire under a waiting human (A8).
//!
//! # What this store is for, stated at its corrected strength (A9)
//!
//! **The primary defence against reuse is 64 bytes of fresh entropy per signing
//! attempt.** This store is not that. Because the ruled KDF binds `entropy64`
//! *together with* `TransactionContextID`, repeated entropy across *different*
//! contexts does not produce a repeated scalar. What the store actually catches
//! is **exact-context repeats** — a retry path that reuses a buffer — plus
//! **rollback**, and **implementation bugs** in the derivation or in context
//! computation.
//!
//! Describing it as "defence-in-depth against a CSPRNG that silently repeats"
//! is overstating it, and A9 exists because a review packet did exactly that.
//!
//! # What it does not protect against
//!
//! `k_local` lives beside the signer's other key material, so the hostile
//! same-host process that motivated keying the entries **can read `k_local`
//! too**. Keyed storage is an **offline file-copy and backup-hygiene defence**
//! (A1 as scoped by `REVIEW-013c` §3a B-IV). It is worth having and it is not
//! what its first write-up claimed.
//!
//! The store also still reveals, to a local reader, **how many** signing
//! attempts occurred and **when**. Amount, counterparty and issuance are not in
//! it. Say that in the README rather than implying the store is opaque.

use crate::scalar::Scalar;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};

type HmacSha256 = Hmac<Sha256>;

const STORE_VERSION: u32 = 2;

/// **A8(a): stated constants, not implementation choices**, with the
/// confirmation timeout strictly shorter than the lease.
///
/// A reservation is taken *before* proof generation and a human confirmation.
/// If the confirmation could outlive the lease, a startup sweep would promote a
/// live reservation and the signing path would read its own reservation as a
/// collision. Asserted in `tests/store_a4_a9.rs`.
pub const LEDGER_LEASE_SECS: u64 = 600;
pub const CONFIRMATION_TIMEOUT_SECS: u64 = 120;
const D_R: &[u8] = b"WCONF-RANDOM-SCALAR-v1/store/r";
const D_RHO: &[u8] = b"WCONF-RANDOM-SCALAR-v1/store/rho";
const D_CHAIN: &[u8] = b"WCONF-RANDOM-SCALAR-v1/store/chain";
const D_HEADER: &[u8] = b"WCONF-RANDOM-SCALAR-v1/store/header";
const D_AUDIT: &[u8] = b"WCONF-RANDOM-SCALAR-v1/store/audit";

/// The per-installation store key. 32 bytes, generated once, never exported.
///
/// ⚠ Held beside `sk_A`, and therefore readable by anything that can read
/// `sk_A`. See the module note.
#[derive(Clone)]
pub struct LocalKey([u8; 32]);

impl LocalKey {
    pub fn from_bytes(b: [u8; 32]) -> LocalKey {
        LocalKey(b)
    }

    /// The installation identifier, derived rather than drawn.
    ///
    /// It was previously random and regenerated by `create()`, so a reset gave
    /// the same installation a new identity (REVIEW-014a). Deriving it from
    /// `k_local` makes it genuinely per-installation, stable across
    /// generations, and needs no separate persistence.
    fn install_id(&self) -> [u8; 16] {
        let mut mac = HmacSha256::new_from_slice(&self.0).expect("any key length");
        mac.update(b"WCONF-RANDOM-SCALAR-v1/store/install-id");
        let full: [u8; 32] = mac.finalize().into_bytes().into();
        let mut out = [0u8; 16];
        out.copy_from_slice(&full[..16]);
        out
    }
    /// The raw bytes, **for persistence only**.
    ///
    /// Named so that a call site reads as what it is. There is exactly one
    /// caller — the daemon writing `k_local.bin` — and any second one should
    /// have to justify itself in review. The key is not a secret from the
    /// same-host adversary in any case (`REVIEW-013c` §3a B-IV); it protects
    /// against an offline copy of the store directory alone.
    pub fn expose_for_persistence(&self) -> &[u8; 32] {
        &self.0
    }

    /// Fresh from the OS CSPRNG.
    pub fn generate() -> std::io::Result<LocalKey> {
        let mut b = [0u8; 32];
        getrandom(&mut b)?;
        Ok(LocalKey(b))
    }
}

impl std::fmt::Debug for LocalKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("LocalKey(<redacted>)")
    }
}

/// Read from the OS CSPRNG, or fail. **Never a fallback.**
///
/// REVIEW-010c §2c: for `r` and `ρ` entropy *is* the source rather than a hedge,
/// and `r` is published on chain, so a dead entropy source means refuse to sign.
pub fn getrandom(buf: &mut [u8]) -> std::io::Result<()> {
    // Compiled out entirely without `test-support`, which is not a default
    // feature. The claim *"entropy failure refuses to sign"* needs a test that
    // fails if it is false, and inducing a real `/dev/urandom` failure is not
    // something a test can do. This is the smallest hook that makes the claim
    // falsifiable, and a release binary does not contain the branch.
    #[cfg(feature = "test-support")]
    if FAIL_ENTROPY.with(|f| f.replace(false)) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "entropy source failure induced by test-support",
        ));
    }
    // ⚠ **The successful-draw counterpart, and it exists because a revert
    // PASSED.** `REVIEW-024` §6 item 3 requires that a successful draw of 32
    // zero bytes stays hedged and only a *reported* failure omits the mask.
    // Reverting `fresh_aux` to treat a zero draw as an omission left the whole
    // suite green: the test written for that item drove
    // `Hedge::FixedAux([0u8; 32])`, which never reaches this function, so it
    // could not see the site where the mistake actually lives. Inducing the
    // failure was hookable; inducing a *successful* all-zero draw was not.
    #[cfg(feature = "test-support")]
    if let Some(fixed) = NEXT_ENTROPY.with(|f| f.take()) {
        // ⚠ **PANIC, do not return `Err`.** Returning an error here would be
        // indistinguishable from a *reported entropy failure*, and `fresh_aux`
        // turns that into the **unmasked** arm — so a test that supplied the
        // wrong number of bytes would sign with no mask, pass, and be reported
        // as evidence for the hedge. Found by `REVIEW-025`'s Codex leg. A
        // malformed test setup must be loud; it is not a runtime condition.
        assert_eq!(
            fixed.len(),
            buf.len(),
            "test-support supplied {} bytes for a {}-byte draw. Returning an error here would \
             look exactly like an entropy failure and would silently take the UNMASKED arm",
            fixed.len(),
            buf.len()
        );
        buf.copy_from_slice(&fixed);
        return Ok(());
    }
    use std::io::Read;
    let mut f = std::fs::File::open("/dev/urandom")?;
    f.read_exact(buf)
}

/// ⚠ **Thread-local, not a global.**
///
/// It was a `static AtomicBool`, and `cargo test` runs the tests in a binary on
/// **parallel threads** — so the induced failure landed in whichever test
/// happened to draw entropy next, not in the one that asked for it. Two tests
/// failed nondeterministically and several earlier green runs were luck. A
/// thread-local scopes the injection to the test that set it, because the whole
/// signing path is synchronous on the calling thread.
#[cfg(feature = "test-support")]
thread_local! {
    static FAIL_ENTROPY: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
}

/// Make the **next** call to [`getrandom`] **on this thread** fail. Test builds
/// only.
///
/// One-shot rather than sticky: a sticky flag would leave the thread unable to
/// draw entropy for every later call, and the failure would look like a
/// different bug.
#[doc(hidden)]
#[cfg(feature = "test-support")]
pub fn fail_next_entropy_draw_for_test() {
    FAIL_ENTROPY.with(|f| f.set(true));
}

/// Thread-local, one-shot, for the same reasons [`FAIL_ENTROPY`] is.
#[cfg(feature = "test-support")]
thread_local! {
    static NEXT_ENTROPY: std::cell::RefCell<Option<Vec<u8>>> =
        const { std::cell::RefCell::new(None) };
}

/// Make the next entropy draw **succeed** and return exactly these bytes.
///
/// ⚠ **Not a fallback and not a source — a test hook, and it is `test-support`
/// only**, verified by `tools/check-test-support-gate.ts` rather than asserted
/// in a comment. Architecture §3 rule 5 forbids caller-supplied randomness on
/// anything that can sign, which is why this does not exist in a release build
/// rather than merely being discouraged in one.
///
/// It exists because `REVIEW-024` §6 item 3's claim — *a successful draw of 32
/// zero bytes stays hedged; only a reported failure omits the mask* — was
/// otherwise unfalsifiable at the site that decides it. `xrpl::fresh_aux` sees
/// only what this function returns, so a test that cannot force a *successful*
/// zero draw cannot check the distinction there at all.
///
/// One-shot rather than sticky: a sticky value would make every later draw on
/// this thread a constant, and the failure would look like a different bug.
///
/// ⚠ **Takes `[u8; 32]`, not a slice** — `REVIEW-025`'s Codex leg offered two
/// remedies and round one took the weaker one. A fixed-size parameter makes the
/// caller-side mistake unconstructible; the panic below is the backstop for the
/// case it cannot cover, which is a draw of a *different size* arriving first.
///
/// ⚠ **A size mismatch PANICS inside [`getrandom`] rather than returning an
/// error**, because an error here is indistinguishable from a real entropy
/// failure and would send the signer down the *unmasked* arm — a test could then
/// pass having exercised the exact thing it was written to rule out.
/// `REVIEW-025`, Codex leg.
///
/// ⚠ **The draw it feeds is the process-wide one, so it reaches `r`/`ρ` too, and
/// a test that sets this and then builds a proof gets a CHOSEN `r`.** One-shot
/// is what bounds that; do not make it sticky.
///
/// ⚠ This said `r`/`ρ` *"are not affected by a successful draw"* one sentence
/// before admitting they are. `REVIEW-026`, Codex leg. What is true is narrower:
/// their **refuse-on-failure** rule is untouched by this hook, because this hook
/// only ever makes a draw *succeed*.
#[doc(hidden)]
#[cfg(feature = "test-support")]
pub fn next_entropy_draw_returns_for_test(bytes: [u8; 32]) {
    NEXT_ENTROPY.with(|f| *f.borrow_mut() = Some(bytes.to_vec()));
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EntryKind {
    R,
    Rho,
}

impl EntryKind {
    fn tag(&self) -> u8 {
        match self {
            EntryKind::R => 1,
            EntryKind::Rho => 2,
        }
    }
    fn from_tag(t: u8) -> Option<EntryKind> {
        match t {
            1 => Some(EntryKind::R),
            2 => Some(EntryKind::Rho),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Status {
    Pending,
    Committed,
}

impl Status {
    fn tag(&self) -> u8 {
        match self {
            Status::Pending => 1,
            Status::Committed => 2,
        }
    }
    fn from_tag(t: u8) -> Option<Status> {
        match t {
            1 => Some(Status::Pending),
            2 => Some(Status::Committed),
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Record {
    pub seq: u64,
    /// **A6 item 6:** every record carries the generation it was written under,
    /// bound into the chain, so a record can never be read as belonging to a
    /// different generation than the one that produced it.
    pub generation_id: u32,
    pub kind: EntryKind,
    pub entry: [u8; 32],
    pub status: Status,
    pub created_at: u64,
    /// Chain MAC over this record and every record before it.
    pub chain: [u8; 32],
}

/// Everything wrong a store can be. All of it routes to [`Store::fresh_start`],
/// which is A6's path — **never a silent continue, never a permanent refusal.**
#[derive(Debug, PartialEq, Eq)]
pub enum StoreFault {
    Missing,
    HeaderUnreadable(String),
    HeaderMacMismatch,
    /// The chain broke at this sequence number: a record was altered, removed,
    /// reordered or inserted.
    ChainBrokenAt(u64),
    /// The header says there are more records than the log holds. **This is the
    /// truncation and rollback case A4 exists to catch**, and the case that was
    /// invisible under A1's per-entry MACs.
    Truncated { header_count: u64, found: u64 },
    /// Fewer records claimed than found — a rolled-back header.
    HeaderBehindLog { header_count: u64, found: u64 },
    RecordUnreadable(String),
    /// A duplicate identifier that is not a legal `pending -> committed`
    /// supersession. The bytes verify; the state machine they describe does not.
    IllegalTransitionAt(u64),
    /// The audit log is missing, short, or does not verify. Because the audit
    /// log is what proves a *previous* fault was acknowledged, this is itself a
    /// fault (REVIEW-014a/b).
    AuditLogFault(String),
}

/// Why a reservation was refused.
///
/// **A8(b):** these must reach the caller as *distinguishable* codes and render
/// in the signer's own window. `REVIEW-013c` §3a B-VII: a generic error is what
/// a web client turns into "transaction failed, please retry".
#[derive(Debug, PartialEq, Eq)]
pub enum ReserveError {
    /// The identifier is already present. **This is the whole point of the
    /// store** — E-63's executed attack is what it prevents.
    AlreadyUsed { kind: EntryKind },
    Io(String),
}

/// Handed back by [`Store::reserve`] and required by [`Store::commit`].
///
/// **A8(a):** while this is alive the reservation is leased in memory, so a
/// startup sweep cannot promote it out from under a human who is still reading
/// the confirmation.
#[derive(Debug)]
pub struct Reservation {
    r_entry: [u8; 32],
    rho_entry: [u8; 32],
    r_seq: u64,
    rho_seq: u64,
    generation_id: u32,
}

/// Redacts. A store's `Debug` must not print `k_local`, and a test that
/// asserts on `Result<Store, _>` will otherwise print the whole struct.
impl std::fmt::Debug for Store {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Store")
            .field("generation_id", &self.generation_id)
            .field("records", &self.records.len())
            .field("key", &"<redacted>")
            .finish()
    }
}

pub struct Store {
    dir: PathBuf,
    key: LocalKey,
    generation_id: u32,
    install_id: [u8; 16],
    records: Vec<Record>,
    /// entry -> index into `records`, for O(1) duplicate detection.
    ///
    /// **A5:** identifiers are append-only for the installation lifetime and
    /// are never pruned, so this index only grows. At 32 bytes an identifier
    /// the volume is negligible; the *access pattern* is what A5 requires be
    /// indexed rather than scanned.
    index: HashMap<[u8; 32], usize>,
    /// Reservations held by a live in-memory lease (A8a).
    leased: Vec<u64>,
}

// ---------------------------------------------------------------------------
// Entry identifiers — A1, as amended
// ---------------------------------------------------------------------------

/// `r_entry = HMAC-SHA-256(k_local, ".../store/r" ‖ compressed(r·G))`.
///
/// Committing to the **point** rather than the scalar is deliberate: §7 also
/// requires the signer to check, before signing, that every encrypted-amount
/// field it is about to sign carries the same `C₁`, and `C₁ = r·G` is exactly
/// this value. Without the key it links to nothing on chain.
pub fn r_entry(key: &LocalKey, r: &Scalar) -> [u8; 32] {
    r_entry_from_c1(key, &compressed_r_g(r))
}

/// The same identifier, computed from the `C₁` that is **on the wire**.
///
/// This exists because it is checkable: `C₁` is public, so a test — or an
/// auditor holding `k_local` — can take a transaction this signer produced and
/// confirm that the identifier the ledger recorded is the identifier for the
/// randomness that transaction actually published. Committing to the scalar
/// instead would make that impossible.
pub fn r_entry_from_c1(key: &LocalKey, c1: &[u8; 33]) -> [u8; 32] {
    let mut mac = HmacSha256::new_from_slice(&key.0).expect("any key length");
    mac.update(D_R);
    mac.update(c1);
    mac.finalize().into_bytes().into()
}

/// `rho_entry = HMAC-SHA-256(k_local, ".../store/rho" ‖ scalar32(ρ))`.
///
/// A1 keyed this too: §7's original used a **bare** SHA-256, and an unkeyed
/// hash of a secret is a needless offer.
pub fn rho_entry(key: &LocalKey, rho: &Scalar) -> [u8; 32] {
    let mut mac = HmacSha256::new_from_slice(&key.0).expect("any key length");
    mac.update(D_RHO);
    mac.update(rho.as_bytes());
    mac.finalize().into_bytes().into()
}

/// `compressed(r·G)` on secp256k1 — the value broadcast on chain as `C₁`.
pub fn compressed_r_g(r: &Scalar) -> [u8; 33] {
    use k256::elliptic_curve::sec1::ToEncodedPoint;
    let sk = k256::SecretKey::from_slice(r.as_bytes())
        .expect("a Scalar is in [1, n-1] by construction");
    let pt = sk.public_key().to_projective().to_encoded_point(true);
    let mut out = [0u8; 33];
    out.copy_from_slice(pt.as_bytes());
    out
}

// ---------------------------------------------------------------------------
// Chaining — A4
// ---------------------------------------------------------------------------

/// The bytes a record contributes to its own chain MAC. Fixed width, so no
/// framing ambiguity is possible.
fn record_body(install_id: &[u8; 16], r: &Record) -> Vec<u8> {
    let mut b = Vec::with_capacity(16 + 4 + 4 + 1 + 32 + 1 + 8);
    b.extend_from_slice(&STORE_VERSION.to_be_bytes());
    b.extend_from_slice(install_id);
    b.extend_from_slice(&r.generation_id.to_be_bytes());
    b.push(r.kind.tag());
    b.extend_from_slice(&r.entry);
    b.push(r.status.tag());
    b.extend_from_slice(&r.created_at.to_be_bytes());
    b
}

fn chain_next(
    key: &LocalKey,
    install_id: &[u8; 16],
    prev: &[u8; 32],
    rec: &Record,
) -> [u8; 32] {
    let mut mac = HmacSha256::new_from_slice(&key.0).expect("any key length");
    mac.update(D_CHAIN);
    mac.update(prev);
    mac.update(&rec.seq.to_be_bytes());
    mac.update(&record_body(install_id, rec));
    mac.finalize().into_bytes().into()
}

#[derive(Debug, Clone)]
struct Header {
    install_id: [u8; 16],
    generation_id: u32,
    entry_count: u64,
    tail_seq: u64,
    tail_chain: [u8; 32],
}

impl Header {
    fn body(&self) -> Vec<u8> {
        let mut b = Vec::new();
        b.extend_from_slice(&STORE_VERSION.to_be_bytes());
        b.extend_from_slice(&self.install_id);
        b.extend_from_slice(&self.generation_id.to_be_bytes());
        b.extend_from_slice(&self.entry_count.to_be_bytes());
        b.extend_from_slice(&self.tail_seq.to_be_bytes());
        b.extend_from_slice(&self.tail_chain);
        b
    }
    fn mac(&self, key: &LocalKey) -> [u8; 32] {
        let mut mac = HmacSha256::new_from_slice(&key.0).expect("any key length");
        mac.update(D_HEADER);
        mac.update(&self.body());
        mac.finalize().into_bytes().into()
    }
}

// ---------------------------------------------------------------------------

/// Exported so tests cannot drift from it. A test that hardcoded `82` broke
/// silently when `generation_id` widened the record to 86 — it failed loudly
/// here only because the truncation it performed stopped being a truncation.
pub const RECORD_WIRE_LEN: usize = 8 + 4 + 1 + 32 + 1 + 8 + 32; // seq,gen,kind,entry,status,created,chain

impl Store {
    fn records_path(dir: &Path) -> PathBuf {
        dir.join("records.log")
    }
    fn header_path(dir: &Path) -> PathBuf {
        dir.join("header.bin")
    }
    /// **A6 item 4:** the gap record lives in a *separate* append-only log, so
    /// an adversary who deletes the randomness store does not thereby delete
    /// the evidence that it was deleted.
    fn audit_path(dir: &Path) -> PathBuf {
        dir.join("audit.log")
    }

    /// Create a store that has never existed. Generation 0.
    ///
    /// **Refuses if either file already exists.** It was previously possible to
    /// call this on a live ledger and silently wipe every identifier — no
    /// acknowledgement, no audit record, no generation bump, which is exactly
    /// the outcome A6 exists to prevent (REVIEW-014b). **Every reset path goes
    /// through [`Self::fresh_start`].**
    pub fn create(dir: &Path, key: LocalKey) -> std::io::Result<Store> {
        std::fs::create_dir_all(dir)?;
        set_private(dir)?;
        for p in [Self::records_path(dir), Self::header_path(dir)] {
            if p.exists() {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::AlreadyExists,
                    format!(
                        "{} already exists; use Store::open, or Store::fresh_start after an \
                         acknowledged fault. Creating over a live ledger would destroy every \
                         identifier in it",
                        p.display()
                    ),
                ));
            }
        }
        Store::create_unchecked(dir, key)
    }

    /// The bare creation path, used by `create` and by `fresh_start` after it
    /// has written its gap record.
    fn create_unchecked(dir: &Path, key: LocalKey) -> std::io::Result<Store> {
        std::fs::create_dir_all(dir)?;
        set_private(dir)?;
        let install_id = key.install_id();
        let s = Store {
            dir: dir.to_path_buf(),
            key,
            generation_id: 0,
            install_id,
            records: Vec::new(),
            index: HashMap::new(),
            leased: Vec::new(),
        };
        std::fs::write(Self::records_path(dir), [])?;
        s.write_header()?;
        Ok(s)
    }

    /// Open an existing store, **verifying the whole chain and the header MAC.**
    ///
    /// A4: any missing, duplicated, reordered or truncated record is corruption
    /// and routes to [`Self::fresh_start`].
    pub fn open(dir: &Path, key: LocalKey) -> Result<Store, StoreFault> {
        let hb = std::fs::read(Self::header_path(dir)).map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                StoreFault::Missing
            } else {
                StoreFault::HeaderUnreadable(e.to_string())
            }
        })?;
        if hb.len() != 4 + 16 + 4 + 8 + 8 + 32 + 32 {
            return Err(StoreFault::HeaderUnreadable(format!("header is {} bytes", hb.len())));
        }
        let mut install_id = [0u8; 16];
        install_id.copy_from_slice(&hb[4..20]);
        let header = Header {
            install_id,
            generation_id: u32::from_be_bytes(hb[20..24].try_into().unwrap()),
            entry_count: u64::from_be_bytes(hb[24..32].try_into().unwrap()),
            tail_seq: u64::from_be_bytes(hb[32..40].try_into().unwrap()),
            tail_chain: hb[40..72].try_into().unwrap(),
        };
        let stored_mac: [u8; 32] = hb[72..104].try_into().unwrap();
        if !ct_eq(&header.mac(&key), &stored_mac) {
            return Err(StoreFault::HeaderMacMismatch);
        }

        let rb = std::fs::read(Self::records_path(dir))
            .map_err(|e| StoreFault::RecordUnreadable(e.to_string()))?;
        if rb.len() % RECORD_WIRE_LEN != 0 {
            return Err(StoreFault::RecordUnreadable(format!(
                "record log is {} bytes, not a multiple of {RECORD_WIRE_LEN}",
                rb.len()
            )));
        }
        let found = (rb.len() / RECORD_WIRE_LEN) as u64;
        if found < header.entry_count {
            return Err(StoreFault::Truncated { header_count: header.entry_count, found });
        }
        // **A6 item 5 — restore before reset (C-5).** A crash between the record
        // fsync and the header write leaves the log ahead by one or more
        // records. That is the ordinary crash window, not corruption, and the
        // old behaviour burned the whole store over it.
        //
        // ⚠ **The recovery direction is deliberate and disagrees with a review
        // leg.** Gemini proposed truncating the log back to the header's count.
        // **A2's own reasoning rejects that:** *"Deleting could permit a reuse
        // the store exists to prevent; promoting cannot."* A record that was
        // written and fsynced may already have had its scalar used. So the
        // trailing records are **adopted** when they chain correctly, and the
        // header is rewritten forward. Adoption can only over-restrict.
        let recovered_from_crash_window = found > header.entry_count;

        let mut records = Vec::with_capacity(found as usize);
        let mut index = HashMap::new();
        let mut prev = [0u8; 32];
        for i in 0..found as usize {
            let w = &rb[i * RECORD_WIRE_LEN..(i + 1) * RECORD_WIRE_LEN];
            let seq = u64::from_be_bytes(w[0..8].try_into().unwrap());
            let generation_id = u32::from_be_bytes(w[8..12].try_into().unwrap());
            let kind = EntryKind::from_tag(w[12])
                .ok_or(StoreFault::ChainBrokenAt(seq))?;
            let entry: [u8; 32] = w[13..45].try_into().unwrap();
            let status = Status::from_tag(w[45]).ok_or(StoreFault::ChainBrokenAt(seq))?;
            let created_at = u64::from_be_bytes(w[46..54].try_into().unwrap());
            let chain: [u8; 32] = w[54..86].try_into().unwrap();

            // Sequence numbers start at 0 and increase by exactly one. A gap or
            // a repeat is a removed or inserted record.
            if seq != i as u64 {
                return Err(StoreFault::ChainBrokenAt(seq));
            }
            let rec = Record { seq, generation_id, kind, entry, status, created_at, chain };
            let want = chain_next(&key, &header.install_id, &prev, &rec);
            if !ct_eq(&want, &rec.chain) {
                return Err(StoreFault::ChainBrokenAt(seq));
            }
            prev = rec.chain;
            // **C-7 (REVIEW-014b): the only legal duplication is a same-kind
            // `pending -> committed` supersession.** An unconditional insert let
            // a valid-MAC log containing `pending(A), committed(A), pending(A)`
            // open with the last record winning. A MAC that verifies proves the
            // bytes were not altered; it proves nothing about whether the state
            // machine they describe is legal.
            if let Some(prior_idx) = index.get(&rec.entry).copied() {
                let prior: &Record = &records[prior_idx];
                let legal = prior.kind == rec.kind
                    && prior.status == Status::Pending
                    && rec.status == Status::Committed;
                if !legal {
                    return Err(StoreFault::IllegalTransitionAt(rec.seq));
                }
            }
            index.insert(rec.entry, records.len());
            records.push(rec);
        }

        // The header commits a prefix. Everything up to `entry_count` must match
        // it exactly; anything beyond is the crash window and is adopted above.
        if header.entry_count > 0 {
            let committed_tail = &records[header.entry_count as usize - 1];
            if !ct_eq(&committed_tail.chain, &header.tail_chain)
                || header.tail_seq != header.entry_count - 1
            {
                return Err(StoreFault::ChainBrokenAt(header.entry_count - 1));
            }
        } else if !ct_eq(&header.tail_chain, &[0u8; 32]) {
            return Err(StoreFault::ChainBrokenAt(0));
        }

        // **C-4 (both legs): the audit log must verify.** It was chained
        // per-entry but never checked by the daemon, and a suffix deletion left
        // a shorter valid chain — A4's own defect, one file over. It is checked
        // here because the audit log is what proves an earlier fault was
        // acknowledged, so a broken one is itself a fault.
        if let Err(e) = read_audit_log(dir, &key) {
            return Err(StoreFault::AuditLogFault(e.to_string()));
        }

        let store = Store {
            dir: dir.to_path_buf(),
            key,
            generation_id: header.generation_id,
            install_id: header.install_id,
            records,
            index,
            leased: Vec::new(),
        };

        // Adopt the crash-window records by writing the header forward. Done
        // last so a failure here leaves the store in the state it was found in.
        if recovered_from_crash_window {
            store.write_header().map_err(|e| StoreFault::HeaderUnreadable(e.to_string()))?;
        }

        Ok(store)
    }

    /// The installation key, for computing entry identifiers.
    ///
    /// It does not leave the process and `LocalKey`'s `Debug` is redacted. The
    /// signing path needs it to compute `r_entry`/`rho_entry`, and computing
    /// those inside `reserve` instead would mean handing the store the scalars.
    pub fn key(&self) -> &LocalKey {
        &self.key
    }

    pub fn generation_id(&self) -> u32 {
        self.generation_id
    }
    pub fn len(&self) -> usize {
        self.records.len()
    }
    pub fn is_empty(&self) -> bool {
        self.records.is_empty()
    }
    pub fn contains(&self, entry: &[u8; 32]) -> bool {
        self.index.contains_key(entry)
    }

    /// Reserve both identifiers as `pending` before proof generation.
    ///
    /// §7 steps 4–6, with the lock being `&mut self`.
    pub fn reserve(
        &mut self,
        r_entry: [u8; 32],
        rho_entry: [u8; 32],
        now: u64,
    ) -> Result<Reservation, ReserveError> {
        if self.index.contains_key(&r_entry) {
            return Err(ReserveError::AlreadyUsed { kind: EntryKind::R });
        }
        if self.index.contains_key(&rho_entry) {
            return Err(ReserveError::AlreadyUsed { kind: EntryKind::Rho });
        }
        // Belt and braces: a derivation that produced the same value twice in
        // one attempt is a bug, and reserving it once would hide the bug.
        if r_entry == rho_entry {
            return Err(ReserveError::AlreadyUsed { kind: EntryKind::Rho });
        }

        let r_seq = self.append(EntryKind::R, r_entry, Status::Pending, now)
            .map_err(|e| ReserveError::Io(e.to_string()))?;
        let rho_seq = self.append(EntryKind::Rho, rho_entry, Status::Pending, now)
            .map_err(|e| ReserveError::Io(e.to_string()))?;

        self.leased.push(r_seq);
        self.leased.push(rho_seq);
        Ok(Reservation {
            r_entry,
            rho_entry,
            r_seq,
            rho_seq,
            generation_id: self.generation_id,
        })
    }

    /// Move a reservation to `committed`.
    ///
    /// **A7:** called on success *and* on any local failure before emission — a
    /// cancelled confirmation, a failed proof, an aborted attempt. §7 step 7's
    /// *"clear `pending`"* is struck. The scalar was derived from fresh entropy
    /// for that attempt alone, so burning it costs nothing and deleting it
    /// could permit a reuse the store exists to prevent.
    ///
    /// **A8(a):** idempotent. Committing an entry a startup sweep already
    /// promoted within the same generation succeeds and is not a collision.
    pub fn commit(&mut self, res: Reservation, now: u64) -> std::io::Result<()> {
        if res.generation_id != self.generation_id {
            // The store was reset under this reservation. The values are burned
            // in a generation that no longer exists; nothing to do, and nothing
            // to claim about it.
            self.release_lease(&res);
            return Ok(());
        }
        for entry in [res.r_entry, res.rho_entry] {
            self.promote_entry(&entry, now)?;
        }
        self.release_lease(&res);
        Ok(())
    }

    fn release_lease(&mut self, res: &Reservation) {
        self.leased.retain(|s| *s != res.r_seq && *s != res.rho_seq);
    }

    /// **A2, as kept by A5:** on startup, promote every `pending` entry older
    /// than the lease interval to `committed` — **promote, never delete.**
    ///
    /// **A8(a):** an entry under a live in-memory lease is skipped, so a human
    /// still reading a confirmation does not have their own reservation
    /// promoted out from under them.
    pub fn promote_expired_pending(&mut self, lease_secs: u64, now: u64) -> std::io::Result<usize> {
        // Iterate the **index**, not the raw log. Promotion appends a
        // superseding record rather than editing one, so the log still holds
        // the original `pending` entry after it has been committed; only the
        // index knows an identifier's current state.
        let mut stale: Vec<[u8; 32]> = self
            .index
            .values()
            .map(|i| &self.records[*i])
            .filter(|r| {
                r.status == Status::Pending
                    && now.saturating_sub(r.created_at) >= lease_secs
                    && !self.leased.contains(&r.seq)
            })
            .map(|r| r.entry)
            .collect();
        // Deterministic order, so two runs over the same store produce the same
        // log. A HashMap's iteration order is not.
        stale.sort_unstable();
        let n = stale.len();
        for entry in stale {
            self.promote_entry(&entry, now)?;
        }
        Ok(n)
    }

    /// Promotion is an **append**, not an edit: the chain would break if a
    /// record changed in place. The later record supersedes the earlier one,
    /// and both remain, which is what an append-only log means.
    fn promote_entry(&mut self, entry: &[u8; 32], now: u64) -> std::io::Result<()> {
        let Some(idx) = self.index.get(entry).copied() else {
            return Ok(());
        };
        let rec = &self.records[idx];
        if rec.status == Status::Committed {
            return Ok(()); // idempotent — A8(a)
        }
        let kind = rec.kind;
        self.append_superseding(kind, *entry, Status::Committed, now)
    }

    fn append(
        &mut self,
        kind: EntryKind,
        entry: [u8; 32],
        status: Status,
        now: u64,
    ) -> std::io::Result<u64> {
        let seq = self.records.len() as u64;
        let prev = self.records.last().map(|r| r.chain).unwrap_or([0u8; 32]);
        let mut rec = Record {
            seq,
            generation_id: self.generation_id,
            kind,
            entry,
            status,
            created_at: now,
            chain: [0u8; 32],
        };
        rec.chain = chain_next(&self.key, &self.install_id, &prev, &rec);

        let mut f = std::fs::OpenOptions::new()
            .append(true)
            .open(Self::records_path(&self.dir))?;
        f.write_all(&wire(&rec))?;
        f.sync_all()?;

        self.index.entry(rec.entry).or_insert(self.records.len());
        self.records.push(rec);
        debug_assert!(self.index.values().all(|i| *i < self.records.len()));
        // A4: the header is written atomically *after* the record it commits.
        self.write_header()?;
        Ok(seq)
    }

    fn append_superseding(
        &mut self,
        kind: EntryKind,
        entry: [u8; 32],
        status: Status,
        now: u64,
    ) -> std::io::Result<()> {
        let seq = self.append(kind, entry, status, now)?;
        // Point the index at the newest record for this identifier so status
        // lookups see the current state.
        if let Some(idx) = self.records.iter().position(|r| r.seq == seq) {
            self.index.insert(entry, idx);
        }
        Ok(())
    }

    fn write_header(&self) -> std::io::Result<()> {
        let header = Header {
            install_id: self.install_id,
            generation_id: self.generation_id,
            entry_count: self.records.len() as u64,
            tail_seq: self.records.len().saturating_sub(1) as u64,
            tail_chain: self.records.last().map(|r| r.chain).unwrap_or([0u8; 32]),
        };
        let mut b = header.body();
        b.extend_from_slice(&header.mac(&self.key));
        atomic_write(&Self::header_path(&self.dir), &b)
    }

    pub fn install_id(&self) -> [u8; 16] {
        self.install_id
    }

    /// **For tests only.** Appends a record without the state-machine checks
    /// `reserve` applies, so a test can forge the valid-MAC-but-illegal log
    /// that C-7 is about. Not reachable from any request path.
    #[doc(hidden)]
    #[cfg(feature = "test-support")]
    pub fn force_append_for_test(
        &mut self,
        kind: EntryKind,
        entry: [u8; 32],
        status: Status,
        now: u64,
    ) -> std::io::Result<()> {
        self.append(kind, entry, status, now).map(|_| ())
    }

    /// **For tests only.**
    #[doc(hidden)]
    #[cfg(feature = "test-support")]
    pub fn records_for_test(&self) -> &[Record] {
        &self.records
    }

    pub fn status_of(&self, entry: &[u8; 32]) -> Option<Status> {
        self.index.get(entry).map(|i| self.records[*i].status)
    }

    // -----------------------------------------------------------------------
    // A3 as amended by A6 — degrade loudly, never brick
    // -----------------------------------------------------------------------

    /// Start a fresh store after a fault, and record the gap durably **outside**
    /// the store being reset.
    ///
    /// `ack` must have come from the signer's own UI. **A6 item 1: a reset
    /// instruction arriving over IPC, as a CLI flag or as a config value must be
    /// refused** — this function cannot enforce where its argument came from, so
    /// the type makes the requirement explicit and the only constructor is in
    /// [`crate::confirm`].
    pub fn fresh_start(
        dir: &Path,
        key: LocalKey,
        fault: &StoreFault,
        ack: &crate::confirm::HumanAcknowledgement,
        now: u64,
    ) -> std::io::Result<Store> {
        // **C-3 (both legs): the generation must never move backwards.**
        // Reading it only from the header meant that the commonest reset
        // trigger — a missing or MAC-failing header — reset a generation-4
        // store to generation 1. The audit log is the durable record precisely
        // because it survives the store, so it is the floor.
        let (header_generation, last_seq) = match Store::peek_header(dir, &key) {
            Some(h) => (h.generation_id, h.tail_seq as i64),
            None => (0, -1),
        };
        let audit_generation = read_audit_log(dir, &key)
            .ok()
            .and_then(|v| v.iter().map(|e| e.new_generation).max())
            .unwrap_or(0);
        let old_generation = header_generation.max(audit_generation);
        let new_generation = old_generation.saturating_add(1);

        // The gap record goes to the audit log FIRST. If the process dies
        // between here and the new store, the evidence still exists.
        append_audit(
            dir,
            &key,
            &AuditEntry {
                at: now,
                old_generation,
                new_generation,
                last_verified_seq: last_seq,
                reason: format!("{fault:?}"),
                acknowledged_by: ack.transcript().to_string(),
            },
        )?;

        let _ = std::fs::remove_file(Self::records_path(dir));
        let _ = std::fs::remove_file(Self::header_path(dir));
        let mut s = Store::create_unchecked(dir, key)?;
        s.generation_id = new_generation;
        s.write_header()?;
        Ok(s)
    }

    fn peek_header(dir: &Path, key: &LocalKey) -> Option<Header> {
        let hb = std::fs::read(Self::header_path(dir)).ok()?;
        if hb.len() != 104 {
            return None;
        }
        let mut install_id = [0u8; 16];
        install_id.copy_from_slice(&hb[4..20]);
        let h = Header {
            install_id,
            generation_id: u32::from_be_bytes(hb[20..24].try_into().ok()?),
            entry_count: u64::from_be_bytes(hb[24..32].try_into().ok()?),
            tail_seq: u64::from_be_bytes(hb[32..40].try_into().ok()?),
            tail_chain: hb[40..72].try_into().ok()?,
        };
        let stored: [u8; 32] = hb[72..104].try_into().ok()?;
        if ct_eq(&h.mac(key), &stored) {
            Some(h)
        } else {
            // A rolled-back or forged header still tells us a generation
            // number, which is better than nothing in an audit record — but it
            // is not trusted, so it is not returned.
            None
        }
    }

    pub fn read_audit(dir: &Path, key: &LocalKey) -> std::io::Result<Vec<AuditEntry>> {
        read_audit_log(dir, key)
    }
}

fn wire(r: &Record) -> Vec<u8> {
    let mut b = Vec::with_capacity(RECORD_WIRE_LEN);
    b.extend_from_slice(&r.seq.to_be_bytes());
    b.extend_from_slice(&r.generation_id.to_be_bytes());
    b.push(r.kind.tag());
    b.extend_from_slice(&r.entry);
    b.push(r.status.tag());
    b.extend_from_slice(&r.created_at.to_be_bytes());
    b.extend_from_slice(&r.chain);
    b
}

// ---------------------------------------------------------------------------
// The separate audit log — A6 item 4
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuditEntry {
    pub at: u64,
    pub old_generation: u32,
    pub new_generation: u32,
    /// -1 when no header could be verified.
    pub last_verified_seq: i64,
    pub reason: String,
    pub acknowledged_by: String,
}

fn audit_line(key: &LocalKey, prev: &[u8; 32], e: &AuditEntry) -> Vec<u8> {
    let body = format!(
        "{}|{}|{}|{}|{}|{}",
        e.at,
        e.old_generation,
        e.new_generation,
        e.last_verified_seq,
        e.reason.replace('|', "/").replace('\n', " "),
        e.acknowledged_by.replace('|', "/").replace('\n', " ")
    );
    let mut mac = HmacSha256::new_from_slice(&key.0).expect("any key length");
    mac.update(D_AUDIT);
    mac.update(prev);
    mac.update(body.as_bytes());
    let chain: [u8; 32] = mac.finalize().into_bytes().into();
    let hex: String = chain.iter().map(|b| format!("{b:02x}")).collect();
    format!("{body}|{hex}\n").into_bytes()
}

/// The audit log's own authenticated header — **A4's construction, applied to
/// the audit log (C-4).**
///
/// Without this the audit log was chained per entry and nothing bound the
/// *set*, so deleting the last line left a shorter, perfectly valid chain. That
/// is precisely the defect A4 was written to fix for the record log, reproduced
/// one file over by the same author in the same commit.
fn audit_header_path(dir: &Path) -> PathBuf {
    dir.join("audit.hdr")
}

fn audit_header_bytes(key: &LocalKey, count: u64, tail: &[u8; 32]) -> Vec<u8> {
    let mut body = Vec::new();
    body.extend_from_slice(&STORE_VERSION.to_be_bytes());
    body.extend_from_slice(&count.to_be_bytes());
    body.extend_from_slice(tail);
    let mut mac = HmacSha256::new_from_slice(&key.0).expect("any key length");
    mac.update(D_AUDIT);
    mac.update(b"/header");
    mac.update(&body);
    let tag: [u8; 32] = mac.finalize().into_bytes().into();
    body.extend_from_slice(&tag);
    body
}

/// Returns the committed `(count, tail_chain)`, or `None` when no audit log has
/// ever been written.
fn read_audit_header(dir: &Path, key: &LocalKey) -> std::io::Result<Option<(u64, [u8; 32])>> {
    let p = audit_header_path(dir);
    let Ok(b) = std::fs::read(&p) else { return Ok(None) };
    if b.len() != 4 + 8 + 32 + 32 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "audit header is the wrong length",
        ));
    }
    let count = u64::from_be_bytes(b[4..12].try_into().unwrap());
    let tail: [u8; 32] = b[12..44].try_into().unwrap();
    let expect = audit_header_bytes(key, count, &tail);
    if expect != b {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "audit header MAC does not verify",
        ));
    }
    Ok(Some((count, tail)))
}

fn append_audit(dir: &Path, key: &LocalKey, e: &AuditEntry) -> std::io::Result<()> {
    std::fs::create_dir_all(dir)?;
    // Verify the whole log before extending it. Blind-chaining off whatever
    // line happens to be last is how a truncated log becomes a permanent one.
    let existing = read_audit_log(dir, key)?;
    let prev = audit_chain_of(key, &existing);
    let path = Store::audit_path(dir);
    let mut f = std::fs::OpenOptions::new().create(true).append(true).open(&path)?;
    f.write_all(&audit_line(key, &prev, e))?;
    f.sync_all()?;

    let mut all = existing;
    all.push(e.clone());
    let tail = audit_chain_of(key, &all);
    atomic_write(&audit_header_path(dir), &audit_header_bytes(key, all.len() as u64, &tail))
}

/// Recompute the chain value after `entries`.
fn audit_chain_of(key: &LocalKey, entries: &[AuditEntry]) -> [u8; 32] {
    let mut prev = [0u8; 32];
    for e in entries {
        let line = audit_line(key, &prev, e);
        let text = String::from_utf8_lossy(&line);
        let hex = text.trim_end().rsplit('|').next().unwrap_or("").to_string();
        let mut c = [0u8; 32];
        for i in 0..32 {
            c[i] = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).unwrap_or(0);
        }
        prev = c;
    }
    prev
}

fn read_audit_log(dir: &Path, key: &LocalKey) -> std::io::Result<Vec<AuditEntry>> {
    let path = Store::audit_path(dir);
    let committed = read_audit_header(dir, key)?;
    let Ok(s) = std::fs::read_to_string(&path) else {
        // No log. That is only consistent with no committed header.
        return match committed {
            None | Some((0, _)) => Ok(vec![]),
            Some((n, _)) => Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("the audit header commits {n} entries and the log is gone"),
            )),
        };
    };
    let mut out = Vec::new();
    let mut prev = [0u8; 32];
    for line in s.lines().filter(|l| !l.trim().is_empty()) {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() != 7 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "audit line has the wrong shape",
            ));
        }
        let e = AuditEntry {
            at: parts[0].parse().unwrap_or(0),
            old_generation: parts[1].parse().unwrap_or(0),
            new_generation: parts[2].parse().unwrap_or(0),
            last_verified_seq: parts[3].parse().unwrap_or(-1),
            reason: parts[4].to_string(),
            acknowledged_by: parts[5].to_string(),
        };
        if parts[6].len() != 64 || !parts[6].bytes().all(|b| b.is_ascii_hexdigit()) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "audit line MAC is not 64 hex characters",
            ));
        }
        let expect = audit_line(key, &prev, &e);
        if expect != format!("{line}\n").into_bytes() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "the audit log's chain does not verify",
            ));
        }
        let mut c = [0u8; 32];
        for i in 0..32 {
            c[i] = u8::from_str_radix(&parts[6][i * 2..i * 2 + 2], 16).unwrap_or(0);
        }
        prev = c;
        out.push(e);
    }

    // **The set check.** A per-entry chain accepts any valid prefix; the header
    // is what makes a deletion visible.
    if let Some((count, tail)) = committed {
        if out.len() as u64 != count {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("the audit header commits {count} entries and the log holds {}", out.len()),
            ));
        }
        if !ct_eq(&prev, &tail) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "the audit log tail does not match its header",
            ));
        }
    } else if !out.is_empty() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "the audit log has entries and no header",
        ));
    }
    Ok(out)
}

// ---------------------------------------------------------------------------

fn atomic_write(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let tmp = path.with_extension("tmp");
    {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    std::fs::rename(&tmp, path)
}

fn set_private(p: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(p, std::fs::Permissions::from_mode(0o700))
}

/// Compare without an early exit.
fn ct_eq(a: &[u8; 32], b: &[u8; 32]) -> bool {
    let mut d = 0u8;
    for i in 0..32 {
        d |= a[i] ^ b[i];
    }
    d == 0
}

```


## FILE (complete): `signer/tests/hedged_signing.rs`

```rust
//! `CLAIMS.md` **B-14** — the transaction's ECDSA nonce, ruled 2026-08-20.
//!
//! # What was ruled, and why it is not symmetry for its own sake
//!
//! Issue #1 ruled that **a hostile process on the holder's own machine, as the
//! holder's own user, is in the threat model.** That ruling is what made the
//! sigma-protocol nonces hedged (`WCONF_HEDGE=1`). The transaction signature's
//! `k` had the same shape — a nonce derived deterministically from a long-lived
//! secret — and the opposite treatment, with nothing written down.
//!
//! `REVIEW-018`, two independent legs, **both ruled that issue #1 extends
//! here**, and neither found a principled distinction. The reason it matters is
//! not the amount: **`k` protects the account key**, and under the ruled keygen
//! construction that key is also the input the ElGamal decryption key is
//! derived from. A repeated or biased `k` is a spending failure *and* a
//! confidentiality failure.
//!
//! # The cost, paid deliberately
//!
//! `ripple-keypairs` is deterministic, so the **default path can no longer be
//! pinned byte-for-byte against it.** `tests/xrpl_vectors.rs` now pins the
//! deterministic arm. Both legs said that is sound **only** if the arm is the
//! same signing implementation with one input varied — a separate signer would
//! pin the wrong binary.
//!
//! ⚠ This said *"`one_implementation_not_two` below is what holds that"*, and
//! that test **is gone** — `REVIEW-024` §4d established it could not hold it,
//! and the sentence outlived the test by one commit (`REVIEW-025`, Codex leg).
//! **What holds it is `xrpl::AccountKey::sign_with_aux` being private and being
//! the only place either algorithm signs**, which is structure rather than an
//! assertion.
//!
//! # ⚠ B-14: both halves are BUILT and EXECUTED as of 2026-08-27
//!
//! ~~Ed25519 is deterministic by construction and **this is the live path**…
//! Tracked as **B-16**.~~ **B-16 was ruled on 2026-08-27 (`REVIEW-024`, three
//! independent legs) and built in the session that read this comment.** Codex's
//! B-14 instruction — *"Do not mark B-14 closed by fixing only secp256k1"* — is
//! now satisfied rather than pending.
//!
//! The ed25519 half is below, under `ED25519`. It is a different construction at
//! a different layer — the RFC 8032 nonce **prefix**, masked by
//! `SHA512(DST ‖ aux)`, rather than RFC 6979 additional data — so it gets its
//! own tests rather than a parameter on these.
//!
//! ⚠ **`REVIEW-024` §6 lists eight things that must execute before anything says
//! "the signer hedges ed25519".** Items 1-6 and 8 are in this file and in
//! `tests/xrpl_vectors.rs`; **item 7 is a Devnet transaction on the default path
//! with `SigningPubKey` decoded out of the submitted blob**, which no test can
//! stand in for — `tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts`, with
//! its receipt at `docs/runs/`.
//!
//! ⚠ **All eight have run, and §7 item 4 — two adversarial rounds — is now
//! COMPLETE.** `REVIEW-025c` is round one (eleven findings, none the
//! construction); `REVIEW-026c` is round two, and what it found was that round
//! one's adjudication had **overstated its own fixes** (E-168), which is exactly
//! what a second round is for. All four of `REVIEW-024` §7's conditions are met.
//!
//! ⚠ This comment read *"has not finished … `REVIEW-025` is round one"* for one
//! commit after round two landed. **A statement that is true when written is
//! false by the end of the same session** — the twenty-second instance, and this
//! is the twenty-third.

use wconf_signer::xrpl::{self, AccountKey, Hedge};

/// The first vector seed, a published constant derived from 16 zero bytes.
const SECP_SEED: &str = "sp6JS7f14BuwFY8Mw6bTtLKWauoUs";

fn probe() -> Vec<u8> {
    xrpl::unhex("5354580012005821000000022200000000").unwrap()
}

/// **The default path is hedged.** Two signatures over identical bytes with
/// the identical key differ.
///
/// ⚠ This said *"the whole ruling in one assertion"* — and so did its ed25519
/// twin, which `REVIEW-025`'s Codex leg named and which was corrected while
/// **this copy was left standing**. It is not: any nondeterminism passes it,
/// including nondeterminism arriving for the wrong reason. What says the
/// nondeterminism is RFC 6979-plus-additional-data is
/// `the_deterministic_arm_repeats_itself_exactly` beside it, and
/// `the_hedged_signature_still_verifies` is what catches signing becoming a
/// no-op.
///
/// ⚠ **Two identical sentences, one fixed.** `CLAUDE.md`: *apply a fix against
/// the FINDING's own citation list, not the adjudication's summary of it* —
/// found in round two by sweeping for the corrected phrase rather than for the
/// line number.
#[test]
fn the_default_path_does_not_repeat_itself() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();

    let mut seen = std::collections::HashSet::new();
    for _ in 0..16 {
        let sig = key.sign_message(&msg).unwrap();
        assert!(!sig.is_empty());
        seen.insert(sig);
    }
    assert_eq!(
        seen.len(),
        16,
        "sixteen signatures over identical bytes produced {} distinct values; the default \
         path is not hedged",
        seen.len()
    );
}

/// ...and the deterministic arm **does** repeat itself, exactly.
///
/// The control. Without it the test above passes on an implementation that had
/// simply become nondeterministic for the wrong reason.
#[test]
fn the_deterministic_arm_repeats_itself_exactly() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();
    let first = key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap();
    for _ in 0..8 {
        assert_eq!(
            key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
            first,
            "the arm the vectors are pinned against is not deterministic"
        );
    }
}

/// A hedged signature is a **valid** signature. Randomising `k` must not have
/// broken the thing being signed.
///
/// Verified with `k256`'s own verifier against the public key this signer
/// publishes in `SigningPubKey`, over the same digest rule the signer uses.
#[test]
fn the_hedged_signature_still_verifies() {
    use k256::ecdsa::signature::hazmat::PrehashVerifier;
    use k256::ecdsa::{Signature, VerifyingKey};

    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let vk = VerifyingKey::from_sec1_bytes(key.public()).expect("public key");
    let msg = probe();

    for _ in 0..8 {
        let der = key.sign_message(&msg).unwrap();
        let sig = Signature::from_der(&der).expect("the signer emitted non-DER bytes");
        vk.verify_prehash(&xrpl::sha512half(&msg), &sig)
            .expect("a hedged signature did not verify against this signer's own public key");
    }
}

/// Low-`S` normalisation survives hedging.
///
/// rippled rejects a high-`S` signature. `k` changes every time now, so roughly
/// half of the raw signatures would be high-`S` without normalisation — which
/// makes this a test that would fail *often* rather than never if the
/// normalisation were dropped on the hedged path.
#[test]
fn every_hedged_signature_is_low_s() {
    use k256::ecdsa::Signature;
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();
    for i in 0..32 {
        let der = key.sign_message(&msg).unwrap();
        let sig = Signature::from_der(&der).expect("non-DER");
        assert!(
            sig.normalize_s().is_none(),
            "signature {i} is high-S and rippled would reject it"
        );
    }
}

/// **The two secp256k1 arms are semantically compatible** — same key, same
/// message, same digest, same encoding, both verifying, both low-`S`.
///
/// ⚠ **This test was called `one_implementation_not_two` and could NOT establish
/// that property.** `REVIEW-024`'s Codex leg found it and it is verified: two
/// independently written correct signers pass every assertion in this body, so
/// the name promised a check no black-box test can make. Both `REVIEW-018` legs
/// had made the single-implementation property the condition on which the
/// deterministic arm was acceptable **at all**, and it was held by inspection
/// and by nothing else. `CLAIMS.md` E-161.
///
/// **The property is now structural**, per `REVIEW-024` §7 item 1:
/// `AccountKey::sign_with_aux` is private, takes `Option<Zeroizing<[u8; 32]>>`,
/// and is the only place either algorithm signs — `sign_message` and `sign_message_with`
/// both call it and there is no third path. That is enforced by the module, not
/// asserted here.
///
/// What is left in this body is the weaker property it actually establishes,
/// under a name that says so. It is still worth having: a nonce change that
/// broke the digest choice or the DER encoding would show up here.
#[test]
fn both_secp256k1_arms_are_semantically_compatible() {
    use k256::ecdsa::signature::hazmat::PrehashVerifier;
    use k256::ecdsa::{Signature, VerifyingKey};

    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let vk = VerifyingKey::from_sec1_bytes(key.public()).unwrap();
    let msg = probe();
    let digest = xrpl::sha512half(&msg);

    let det = key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap();
    let hedged = key.sign_message(&msg).unwrap();

    assert_ne!(det, hedged, "the hedged arm reproduced the deterministic one");
    for (name, der) in [("deterministic", &det), ("hedged", &hedged)] {
        let sig = Signature::from_der(der).unwrap_or_else(|_| panic!("{name} is not DER"));
        vk.verify_prehash(&digest, &sig)
            .unwrap_or_else(|_| panic!("{name} does not verify under the same key and digest"));
        assert!(sig.normalize_s().is_none(), "{name} is high-S");
    }
}

/// ⚠ **Entropy failure DEGRADES here. It does not refuse — and the two are not
/// interchangeable.**
///
/// Architecture §4 keeps three randomness rules side by side because they are
/// genuinely different. `r`/`ρ` **refuse to sign** on entropy failure, because
/// entropy *is* the source there and `r` is published on chain. Sigma nonces
/// **degrade**, because entropy is a hedge over a deterministic core that is
/// safe on its own. `k` has the second shape, so it degrades to the standard
/// RFC 6979 construction — which is exactly where this project was before the
/// ruling, and is not a downgrade below it.
///
/// `REVIEW-018`'s Codex leg said refuse. **That is the merge `CLAUDE.md` warns
/// against by name**, and the adjudication rejected it — recorded here rather
/// than in a note nobody re-reads (`CLAIMS.md` E-93's precedent).
#[test]
fn entropy_failure_degrades_to_the_standard_construction() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();

    wconf_signer::store::fail_next_entropy_draw_for_test();
    let under_failure = key
        .sign_message(&msg)
        .expect("entropy failure must not stop a transaction signature; k is a hedge here");

    assert_eq!(
        under_failure,
        key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
        "an entropy failure produced something other than the standard RFC 6979 construction"
    );
}

/// Signatures do not collide across a large run.
///
/// ⚠ **This test was called `aux_is_exactly_one_field_of_entropy` and could not
/// check that.** If the auxiliary RNG recycled its 32 bytes to satisfy a larger
/// request, every signature would *still* differ — so no black-box test over
/// signature outputs can see recycling, and the name promised a check the body
/// never made.
///
/// The real check moved into `xrpl.rs`, where `OneShotAux` **panics** rather
/// than recycling, with unit tests either side of the boundary. What is left
/// here is the weaker property this body actually establishes, under a name
/// that says so.
#[test]
fn signatures_do_not_collide_across_a_long_run() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();
    let mut seen = std::collections::HashSet::new();
    for _ in 0..200 {
        seen.insert(key.sign_message(&msg).unwrap());
    }
    assert_eq!(seen.len(), 200, "signatures collided across 200 draws");
}

// ===========================================================================
// ED25519 — `CLAIMS.md` B-16, ruled 2026-08-27 (`REVIEW-024`) and built here
// ===========================================================================
//
// ⚠ `ed25519_is_still_deterministic_and_that_is_a_tracked_gap` **was here and is
// gone deliberately.** Its own panic message said what to do: *"this may be the
// B-16 build arriving rather than a defect … Close B-16 deliberately; do not
// delete this test to make the suite green."* The build landed, the register
// entry is closed, and what replaces it is not one assertion but `REVIEW-024`
// §6's list. Everything the old test established — that the selector has an
// effect, that the arms are distinguishable — is asserted below in the opposite
// direction.

/// The 29 ruled bytes of the domain separator, **written out here rather than
/// imported from the code under test** — and then compared *to* the code under
/// test, which is the half that was missing.
///
/// ⚠ **This constant existed and was compared to the same literal**, because
/// `xrpl::ED25519_NONCE_HEDGE_DST` was `pub(crate)` and an integration test
/// cannot see it. So `the_dst_is_the_ruled_bytes` was a tautology, under a doc
/// comment in `xrpl.rs` asserting it *"pins all 29 of them"*. Found
/// independently by `REVIEW-025`'s self leg and its Codex leg. The constant is
/// `pub` now and the test reaches it.
const RULED_DST: &[u8] = b"WCONF/ed25519-nonce-hedge/v1\0";

fn ed_msg(tag: u8) -> Vec<u8> {
    let mut m = xrpl::unhex("53545800120058210000000222000000").unwrap();
    m.push(tag);
    m
}

/// The verifying key a conforming verifier would use: the 32 bytes after the
/// `0xED` prefix in what this signer publishes as `SigningPubKey`.
fn verifying_key(key: &AccountKey) -> ed25519_dalek::VerifyingKey {
    let pk = key.public();
    assert_eq!(pk.len(), 33, "an ed25519 SigningPubKey is 0xED followed by 32 bytes");
    assert_eq!(pk[0], 0xED, "an ed25519 SigningPubKey must start 0xED");
    ed25519_dalek::VerifyingKey::from_bytes(pk[1..].try_into().unwrap())
        .expect("the signer published a public key that is not a valid ed25519 point")
}

/// ⚠ **`REVIEW-024` §6 item 6, and the strictest verifier available.**
///
/// `verify_strict` rejects a non-canonical `R` and small-order public keys,
/// which the permissive `verify` accepts. Ed25519 verifiers genuinely diverge on
/// canonicality and cofactor handling, and the ruling says so; an honestly
/// generated signature sits in the intersection of every accept set, so the
/// strict one is the right check here.
fn assert_canonical(key: &AccountKey, msg: &[u8], sig: &[u8], what: &str) {
    assert_eq!(sig.len(), 64, "{what}: an ed25519 signature is 64 bytes, got {}", sig.len());
    let parsed = ed25519_dalek::Signature::from_slice(sig).expect("64 bytes");
    verifying_key(key)
        .verify_strict(msg, &parsed)
        .unwrap_or_else(|e| panic!("{what}: strict verification failed under this signer's own published public key: {e}"));
}

// ---------------------------------------------------------------------------
// §6 item 1 — the deterministic arm is byte-identical RFC 8032
// ---------------------------------------------------------------------------

/// ⚠ **The claim `REVIEW-024` §5 flagged as a PREDICTION rather than a
/// measurement, measured.**
///
/// The ruling said the unmasked arm *"follows from `raw_sign` with an unmodified
/// prefix being the same expression `SigningKey::sign` evaluates"* and that §6
/// item 1 is what turns that into evidence. This is that: the same key and
/// message through `ed25519_dalek::SigningKey::sign` — the crate's ordinary,
/// non-`hazmat` API, which this signer no longer calls — and through the new
/// code path, compared byte for byte.
///
/// `tests/xrpl_vectors.rs::each_algorithm_signs_what_ripple_keypairs_signs` is
/// the other half: it pins the same arm against `ripple-keypairs@2.0.0`, an
/// implementation neither this project nor `ed25519-dalek` wrote.
#[test]
fn the_unmasked_arm_is_byte_identical_to_the_crates_own_rfc_8032() {
    use ed25519_dalek::Signer;
    for i in 0..8u8 {
        let entropy = [i.wrapping_mul(37).wrapping_add(3); 16];
        let key = AccountKey::ed25519_from_entropy(&entropy).unwrap();
        let msg = ed_msg(i);

        let plain = ed25519_dalek::SigningKey::from_bytes(&xrpl::sha512half(&entropy));
        assert_eq!(
            key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
            plain.sign(&msg).to_bytes().to_vec(),
            "the unmasked arm is not the crate's own RFC 8032 signature at i={i}"
        );
    }
}

// ---------------------------------------------------------------------------
// §6 item 2 — a test-only fixed-aux input, and it drives the construction
// ---------------------------------------------------------------------------

/// **Two distinct fixed `aux` values give distinct `R`, and both verify.**
///
/// `R` rather than "the signature differs": `R = encode(r·B)` is the first 32
/// bytes and is the *only* part the nonce determines directly. Comparing whole
/// signatures would also pass if `s` alone moved, which would be a different and
/// much worse bug.
#[test]
fn two_fixed_aux_values_give_two_nonces() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);

    let a = key.sign_message_with(Hedge::FixedAux([0x11; 32]), &msg).unwrap();
    let b = key.sign_message_with(Hedge::FixedAux([0x22; 32]), &msg).unwrap();

    assert_ne!(a[..32], b[..32], "two different aux values produced the same R; the mask has no effect");
    assert_canonical(&key, &msg, &a, "fixed aux 0x11");
    assert_canonical(&key, &msg, &b, "fixed aux 0x22");
}

/// The fixed-`aux` arm is **reproducible**, which is what makes every equality
/// in this section an equality rather than a "did something change".
#[test]
fn a_fixed_aux_reproduces_itself_exactly() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);
    let first = key.sign_message_with(Hedge::FixedAux([0x5A; 32]), &msg).unwrap();
    for _ in 0..8 {
        assert_eq!(key.sign_message_with(Hedge::FixedAux([0x5A; 32]), &msg).unwrap(), first);
    }
}

// ---------------------------------------------------------------------------
// §6 item 3 — a successful draw of thirty-two zero bytes stays HEDGED
// ---------------------------------------------------------------------------

/// ⚠ **`Some([0u8; 32])` is not the no-mask arm, and this is the distinction
/// B-14 got wrong in the mirror direction.**
///
/// `REVIEW-018`'s Gemini leg wrote *"aux_rand = 0³² (or is omitted)"* as though
/// the two were interchangeable for secp256k1; they are not, and following it
/// would have broken the vector pinning. Here the same pair must stay distinct
/// in the **opposite** direction: a zero draw is a *successful* draw, so the
/// mask `SHA512(DST ‖ 0³²)[0..32]` is applied, and the result is a hedged
/// signature that is nothing like RFC 8032.
///
/// Codex named this in `REVIEW-024` without being prompted. A session that
/// assumes zeros recover RFC 8032 writes a test that passes for the wrong
/// reason.
#[test]
fn zero_aux_is_hedged_not_a_fallback() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);

    let zeros = key.sign_message_with(Hedge::FixedAux([0u8; 32]), &msg).unwrap();
    let unmasked = key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap();

    assert_ne!(
        zeros, unmasked,
        "a successful draw of 32 zero bytes reproduced the unmasked arm. Only a REPORTED \
         entropy failure omits the mask — REVIEW-024 section 4b"
    );
    assert_canonical(&key, &msg, &zeros, "aux = 32 zero bytes");
}

/// ⚠ **The same claim at the site that actually decides it, and this test exists
/// because a revert PASSED without it.**
///
/// `zero_aux_is_hedged_not_a_fallback` above drives `Hedge::FixedAux([0u8; 32])`
/// — which never reaches `xrpl::fresh_aux`, the function that turns a
/// `store::getrandom` result into `Some`/`None`. Reverting *that* function to
/// treat a successful all-zero draw as an omission left the entire suite green.
///
/// **A test named for a property, sitting one layer away from where the property
/// can break, is this project's most frequent defect** — `one_implementation_not_two`
/// and `aux_is_exactly_one_field_of_entropy` are the same shape, and
/// `REVIEW-024` §6 item 8's *"revert each fix and watch its test fail"* is what
/// found this one. The revert is now item 8 of that sweep and it fails here.
///
/// The distinction, stated once more because `REVIEW-018` §4a got its mirror
/// wrong: a draw that **succeeds** and yields 32 zero bytes is a hedged
/// signature. Only a draw that **reports failure** omits the mask.
#[test]
fn a_successful_all_zero_draw_still_hedges() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);

    wconf_signer::store::next_entropy_draw_returns_for_test([0u8; 32]);
    let drawn_zeros = key.sign_message(&msg).unwrap();

    assert_eq!(
        drawn_zeros,
        key.sign_message_with(Hedge::FixedAux([0u8; 32]), &msg).unwrap(),
        "a successful all-zero draw did not take the masked path"
    );
    assert_ne!(
        drawn_zeros,
        key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
        "a successful all-zero draw produced the UNMASKED signature. Only a REPORTED entropy \
         failure omits the mask — REVIEW-024 sections 4b and 6 item 3"
    );
    assert_canonical(&key, &msg, &drawn_zeros, "successful zero draw");
}

/// The secp256k1 arm has the same site and the same distinction, and it is the
/// one `REVIEW-018` §4a got wrong in the mirror direction: there, empty
/// additional data and 32 zero bytes of it were treated as interchangeable, and
/// they seed the HMAC-DRBG differently.
#[test]
fn a_successful_all_zero_draw_still_hedges_secp256k1() {
    let key = AccountKey::from_family_seed(SECP_SEED).unwrap();
    let msg = probe();

    wconf_signer::store::next_entropy_draw_returns_for_test([0u8; 32]);
    let drawn_zeros = key.sign_message(&msg).unwrap();

    assert_eq!(drawn_zeros, key.sign_message_with(Hedge::FixedAux([0u8; 32]), &msg).unwrap());
    assert_ne!(
        drawn_zeros,
        key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
        "32 zero bytes of RFC 6979 additional data produced the same k as omitting it"
    );
}

// ---------------------------------------------------------------------------
// §6 item 4 — a reported entropy failure degrades, and it degrades to RFC 8032
// ---------------------------------------------------------------------------

/// **Degrade, not refuse — demonstrated rather than asserted.**
///
/// ⚠ **The self leg of `REVIEW-024` had this wrong** and both external legs
/// corrected it: it had ruled that entropy failure lands on a *third* fixed
/// construction, `H(tag ‖ p ‖ 0³²)`, reasoning by analogy from an observation
/// about the sigma hedge. The ruling adopted the external answer — omit the mask
/// and land on **byte-identical RFC 8032** — and one of its three reasons was
/// that it makes this test an equality against an arm something outside this
/// repository can check. `REVIEW-024` §4b.
#[test]
fn ed25519_entropy_failure_degrades_to_rfc_8032() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);

    wconf_signer::store::fail_next_entropy_draw_for_test();
    let under_failure = key
        .sign_message(&msg)
        .expect("entropy failure must not stop a transaction signature; the nonce prefix is a hedge here");

    assert_eq!(
        under_failure,
        key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
        "an entropy failure produced something other than the standard RFC 8032 construction"
    );
    assert_canonical(&key, &msg, &under_failure, "degraded signature");
}

// ---------------------------------------------------------------------------
// §6 item 5 — message separation under a stuck RNG
// ---------------------------------------------------------------------------

/// ⚠ **What says the mask did not REPLACE the message in the nonce preimage.**
///
/// `r = reduce(H(q ‖ M))`. An implementation that computed `r` from `q` alone —
/// or that folded the message into the mask instead of the preimage — would pass
/// every other test in this file and would reuse a nonce across two different
/// messages under a stuck RNG. That is the exact precondition §2 of the ruling
/// describes: two signatures sharing `r` under two challenges give
/// `a = (s₁ − s₂)·(k₁ − k₂)⁻¹`, the secret scalar by one subtraction and one
/// inversion.
///
/// So: the same fixed `aux` over two different messages must give different `R`,
/// and over the same message must reproduce exactly.
#[test]
fn one_aux_over_two_messages_does_not_reuse_the_nonce() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let aux = Hedge::FixedAux([0x01; 32]);

    let m1 = ed_msg(1);
    let m2 = ed_msg(2);
    let s1 = key.sign_message_with(aux, &m1).unwrap();
    let s2 = key.sign_message_with(aux, &m2).unwrap();

    assert_ne!(
        s1[..32],
        s2[..32],
        "the same aux over two different messages produced the same R. The message has left \
         the nonce preimage and two signatures now share a nonce — REVIEW-024 section 2"
    );
    assert_eq!(s1, key.sign_message_with(aux, &m1).unwrap(), "same aux and same message did not reproduce");

    // The empty message is the degenerate case of the same property.
    let empty = key.sign_message_with(aux, &[]).unwrap();
    assert_ne!(empty[..32], s1[..32]);
    assert_canonical(&key, &[], &empty, "empty message");
}

// ---------------------------------------------------------------------------
// §6 item 6 — invariants
// ---------------------------------------------------------------------------

/// **The default path is hedged**, for the arm every account this project holds
/// actually uses.
///
/// ⚠ This said *"the whole ruling in one assertion"*. It is not: **any**
/// nondeterminism passes it, including nondeterminism arriving for the wrong
/// reason. `REVIEW-025`, Codex leg. What says the nondeterminism is *this*
/// construction is `the_construction_matches_a_second_model`; what says it is
/// still a valid signature is `assert_canonical` on every draw below.
#[test]
fn the_default_ed25519_path_does_not_repeat_itself() {
    let key = AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let msg = ed_msg(0);
    let mut seen = std::collections::HashSet::new();
    for _ in 0..64 {
        let sig = key.sign_message(&msg).unwrap();
        assert_canonical(&key, &msg, &sig, "default path");
        seen.insert(sig);
    }
    assert_eq!(seen.len(), 64, "64 signatures over identical bytes gave {} distinct values", seen.len());
}

/// **Both modes carry the identical public key**, and it is the one the signer
/// publishes in `SigningPubKey`.
///
/// ⚠ This is the invariant that makes hedging invisible on the wire. The mask
/// touches `hash_prefix` only; `a` is untouched, so `A = a·B` is untouched, so
/// a verifier cannot tell the arms apart and rippled's account-key check is
/// unaffected. If the mask ever reached the scalar, every signature would still
/// verify under a *different* key and every transaction would be rejected — or,
/// worse, `A` and the scalar would disagree and the signature would leak.
#[test]
fn both_modes_publish_and_verify_under_the_same_key() {
    for i in 0..4u8 {
        let entropy = [i.wrapping_mul(53).wrapping_add(11); 16];
        let key = AccountKey::ed25519_from_entropy(&entropy).unwrap();
        let msg = ed_msg(i);
        let published = verifying_key(&key);

        for (what, sig) in [
            ("default", key.sign_message(&msg).unwrap()),
            ("unmasked", key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap()),
            ("fixed aux", key.sign_message_with(Hedge::FixedAux([0xA5; 32]), &msg).unwrap()),
            ("zero aux", key.sign_message_with(Hedge::FixedAux([0u8; 32]), &msg).unwrap()),
        ] {
            assert_canonical(&key, &msg, &sig, what);
            // ...and under nothing else. A signature that verifies under a key
            // the signer did not publish is the verifying-key-mismatch failure
            // the hazmat warning is about.
            let other = AccountKey::ed25519_from_entropy(&[i.wrapping_add(1); 16]).unwrap();
            let parsed = ed25519_dalek::Signature::from_slice(&sig).unwrap();
            assert!(
                verifying_key(&other).verify_strict(&msg, &parsed).is_err(),
                "{what}: verified under an unrelated key"
            );
            assert_ne!(published.to_bytes(), verifying_key(&other).to_bytes());
        }
    }
}

/// ⚠ **This test was called `..._and_no_caller_can_choose_it`, and its own doc
/// comment said it could not see that clause.** Both `REVIEW-025` external legs
/// named the contradiction. A name that asserts what the body cannot establish
/// is the defect `REVIEW-024` §4d found in `one_implementation_not_two`, and
/// leaving it in place while quoting that finding two paragraphs up is worse
/// than not knowing.
///
/// ⚠ **`REVIEW-024` §7 item 2 is STRUCTURAL and this test cannot see it.**
///
/// *"The verifying key is derived inside that helper. It is never a parameter
/// this signer accepts."* What enforces that is the **signature of
/// `AccountKey::sign_with_aux`**, which takes `Option<Zeroizing<[u8; 32]>>` and a
/// message and nothing else — there is no `VerifyingKey` for a caller to get wrong. A
/// black-box test cannot distinguish "derived internally" from "supplied
/// correctly by every caller so far", which is precisely the trap
/// `one_implementation_not_two` fell into (`REVIEW-024` §4d).
///
/// What IS checkable, and is the observable consequence: the key a signature
/// verifies under is exactly the key the signer publishes, over many keys.
///
/// ⚠ This ended *"if a caller-supplied verifying key were ever threaded in, this
/// is what would move"* — **which overstates it in exactly the way the sentence
/// above disclaims.** A caller threading in the *correct* seed-derived key would
/// be invisible here. This test moves when the key is **wrong**, not when it
/// becomes a parameter. `REVIEW-026`, Codex leg.
#[test]
fn every_signature_verifies_under_the_seed_derived_published_key() {
    for i in 0..16u8 {
        let key = AccountKey::ed25519_from_entropy(&[i; 16]).unwrap();
        let msg = ed_msg(i);
        let sig = key.sign_message(&msg).unwrap();
        let parsed = ed25519_dalek::Signature::from_slice(&sig).unwrap();
        let derived = ed25519_dalek::SigningKey::from_bytes(&xrpl::sha512half(&[i; 16])).verifying_key();

        assert_eq!(derived.to_bytes()[..], key.public()[1..], "published key drifted from the seed at i={i}");
        derived.verify_strict(&msg, &parsed).expect("did not verify under the key derived from the seed");
    }
}

// ---------------------------------------------------------------------------
// The construction itself, against a SECOND MODEL — see the caveat below on
// which half of it a third party actually controls
// ---------------------------------------------------------------------------

/// **The production constant, pinned against a literal written out here.**
///
/// ⚠ The equality that matters is `xrpl::ED25519_NONCE_HEDGE_DST == RULED_DST`.
/// Without it this test compared `RULED_DST` to the identical literal and could
/// not have noticed any edit to `xrpl.rs` at all.
#[test]
fn the_dst_is_the_ruled_bytes() {
    assert_eq!(RULED_DST.len(), 29, "REVIEW-024 section 3 fixes the DST at 29 bytes");
    assert_eq!(RULED_DST[28], 0x00, "the trailing NUL is part of the tag");
    assert_eq!(
        &xrpl::ED25519_NONCE_HEDGE_DST[..],
        RULED_DST,
        "the domain separator in xrpl.rs is not the one REVIEW-024 section 3 ruled"
    );
}

/// ⚠ **The KAT, and it is what makes every test above more than self-consistent.**
///
/// Everything else in this file checks the signer against itself: that two arms
/// differ, that one reproduces, that the output verifies. **All of it would pass
/// on a wrong-but-consistent construction** — a mask over the wrong 32 bytes of
/// the SHA-512 output, a DST concatenated in the other order, `q ‖ M` written
/// `M ‖ q`.
///
/// `tools/spike-b16-2026-08-27/t-ed25519-hedge-construction.ts` implements
/// `REVIEW-024` §3 from the prose, in TypeScript, against `@noble/curves@1.9.7`
/// — a different curve library by a different author — writing out the scalar
/// arithmetic rather than calling anything that already knows RFC 8032. Its own
/// control is that with the mask omitted it reproduces `@noble`'s `ed25519.sign`
/// byte for byte, which is a **third** implementation, and it refuses to emit a
/// vector if that fails.
///
/// This is the discipline `tests/keygen_kat.rs` and `tests/r_and_rho_kat.rs`
/// apply to the other ruled derivations, for the reason `CLAIMS.md` E-72
/// records: the value written from recollection was the *test*, not the code.
///
/// ⚠ **Called `..._an_independent_implementation` for one commit, and that was
/// an overclaim.** `REVIEW-025`'s Codex leg: the curve library is external, but
/// **the model and its vectors were written by this project, in this change**.
/// It is cross-implementation *consistency*, not independent authorship and not
/// an independent review. The name says "a second model" now.
///
/// ⚠ **And the two arms are not equally defended, which nothing said.** The
/// generator's control establishes the *arithmetic*, because `@noble`'s own
/// `ed25519.sign` is a genuine third implementation of RFC 8032. **No third
/// third-party implementation of this combiner is present in the evidence
/// checked** — ⚠ **narrowed under P-12 in round two.** It said *"no third party
/// computes a W-CONF-hedged signature"*, justified as a deduction from the
/// combiner having been defined here on 2026-08-27. **Originating somewhere does
/// not prove absent everywhere**, and P-12 governs the claim whichever way it is
/// argued (`REVIEW-026`, Codex leg). What is checked: the packages this
/// repository depends on. That is why the mask rests on two readings of the same
/// prose — one in Rust, one in TypeScript, both this
/// project's. A shared arithmetic error is ruled out; a shared misreading of §3
/// is not. The revert sweep breaking byte order, concatenation order and
/// hash-half individually is what narrows that, and it is not the same as an
/// outside check.
///
/// If the vectors file is missing this **fails**. It does not skip.
#[test]
fn the_construction_matches_a_second_model() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../tools/spike-b16-2026-08-27/ed25519-hedge-vectors.json");
    let raw = std::fs::read_to_string(&path).unwrap_or_else(|e| {
        panic!(
            "cannot read {}: {e}\n\
             Regenerate with: bun run tools/spike-b16-2026-08-27/t-ed25519-hedge-construction.ts\n\
             This test does not skip when its evidence is missing.",
            path.display()
        )
    });
    let v: serde_json::Value = serde_json::from_str(&raw).expect("vectors are not valid JSON");

    assert_eq!(
        v["dst_hex"].as_str().unwrap(),
        xrpl::hex(RULED_DST),
        "the independent implementation used a different domain separator"
    );

    let vectors = v["vectors"].as_array().expect("no vectors array");
    assert!(vectors.len() >= 8, "expected at least 8 vectors, got {}", vectors.len());

    let mut masked = 0usize;
    let mut unmasked = 0usize;
    for vec in vectors {
        let name = vec["name"].as_str().unwrap();
        let entropy = xrpl::unhex(vec["entropy"].as_str().unwrap()).unwrap();
        let message = xrpl::unhex(vec["message"].as_str().unwrap()).unwrap();
        let key = AccountKey::ed25519_from_entropy(&entropy).unwrap();

        assert_eq!(
            xrpl::hex(&key.public()[1..]),
            vec["public_key"].as_str().unwrap(),
            "{name}: public key"
        );

        let hedge = match vec["aux"].as_str() {
            None => {
                unmasked += 1;
                Hedge::DeterministicForVectors
            }
            Some(a) => {
                masked += 1;
                let mut aux = [0u8; 32];
                aux.copy_from_slice(&xrpl::unhex(a).unwrap());
                Hedge::FixedAux(aux)
            }
        };

        let sig = key.sign_message_with(hedge, &message).unwrap();
        assert_eq!(xrpl::hex(&sig), vec["signature"].as_str().unwrap(), "{name}: signature (second model)");
        assert_eq!(xrpl::hex(&sig[..32]), vec["R"].as_str().unwrap(), "{name}: R");
        assert_canonical(&key, &message, &sig, name);
    }

    // ⚠ A vectors file of eight unmasked cases would pass every assertion above
    // and would check nothing about the hedge. Both arms must be present.
    assert!(masked >= 4, "only {masked} masked vectors; the hedge is barely covered");
    assert!(unmasked >= 1, "no unmasked vector; the RFC 8032 claim is not covered");
    // ⚠ Named here as well as in the doc: what this compares against is a SECOND
    // MODEL written by this project, not an independent implementation. Only the
    // unmasked arm has a third-party control (`@noble`). REVIEW-025 and -026.
}

// ---------------------------------------------------------------------------
// `CLAIMS.md` B-19 — decided 2026-08-27, and NOT for the nonce ruling's reasons
// ---------------------------------------------------------------------------

/// ⚠⚠ **THIS DOC SAID ITS ONLY JOB WAS TO FAIL TO COMPILE IF THE MANIFEST LINE
/// WAS REVERTED. THAT IS FALSE — `CLAIMS.md` E-171.**
///
/// Reverting `features = [.., "zeroize"]` **compiles**, because `std` implies
/// `alloc` and `alloc` lists `"zeroize/alloc"` without the `?` sigil that
/// `serde?/alloc` beside it carries. The feature was never off, so this test
/// never depended on the word B-19 added.
///
/// **What this test does, and it is worth having:** it asserts the two types
/// really are `ZeroizeOnDrop` in the build that ships. That is the property
/// anyone cares about. What it is **not** is a check on B-19's edit, and it was
/// documented as one in three places for a day — `CLAIMS.md` E-167, the decision
/// document, and here. **A test named for a property, one layer away from where
/// the property is decided** (E-161, E-164), at the manifest layer.
///
/// The feature-resolution check is `tools/check-zeroize-bounds.py` part 1, which
/// builds a scratch crate at four feature sets and requires the empty one to
/// FAIL — without that control "it compiles" says nothing.
///
/// `ed25519-dalek`'s `default-features = false, features = ["std"]` left
/// `zeroize` off — a crate default — so `ExpandedSecretKey` and `SigningKey` were
/// not wiped on drop while `hazmat.rs:39` promised unconditionally that they
/// were. `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md` decided it
/// on. The `ZeroizeOnDrop` impls exist **only** under that feature
/// (`hazmat.rs:75-76`, `signing.rs:665-666`), so naming the bound is what says
/// the feature is on — ⚠ **it does not say which manifest line turned it on**,
/// and that distinction is the whole of E-171.
///
/// ⚠ **A runtime "is the buffer zero now?" assertion was considered and
/// rejected**: reading freed stack memory is undefined behaviour and would pass
/// or fail for reasons unrelated to the feature. `CLAIMS.md` E-108's rule — *a
/// revert that does not compile proves nothing* — inverts for a `Drop`-carrying
/// type, because the compile failure IS the proof. ⚠ **But only if somebody
/// produces one.** `make check-zeroize-bounds` produces it for B-21's three
/// locals; for B-19 it produces the opposite, which is E-171.
///
/// ⚠ **Renamed from `ed25519_secret_material_is_zeroized_on_drop`**, which
/// overstated it: this proves the two types implement the marker trait, and the
/// memory effect follows from the crate's `Drop` impls rather than from anything
/// this test observes. `REVIEW-025`, Codex leg.
///
/// ⚠ It does **not** claim the secret is unrecoverable. §4 of that decision says
/// what it does not buy: the crate's own `From<&SecretKey>` leaves an unwiped
/// SHA-512 local, the curve temporaries are outside any `Drop`, and an adversary
/// with code execution reads the scalar while it is live regardless.
/// ⚠ **B-21's locals are NOT checked here** — `sha512_zeroizing`, `fresh_aux`
/// and `OneShotAux` are all private, so their bounds are named in
/// `xrpl::aux_tests::the_signing_helpers_secret_locals_wipe_on_drop`, in-crate,
/// and reverted for real by `make check-zeroize-bounds` part 2.
#[test]
fn ed25519_secret_types_implement_zeroize_on_drop() {
    fn requires_zeroize_on_drop<T: zeroize::ZeroizeOnDrop>() {}
    requires_zeroize_on_drop::<ed25519_dalek::hazmat::ExpandedSecretKey>();
    requires_zeroize_on_drop::<ed25519_dalek::SigningKey>();
}

```


## FILE (complete): `tools/check-zeroize-bounds.py`

```python
#!/usr/bin/env python3
"""
Wiping-type gate — `CLAIMS.md` **B-19**, **B-21** and **E-171**.

Two questions, both answered by making a compiler decide rather than by reading
a manifest:

  **Part 1 — is `ed25519-dalek`'s `zeroize` feature on, and what turns it on?**
  Scratch-crate probes, one per feature set, each naming the `ZeroizeOnDrop`
  bound. Isolated from the signer so the answer cannot be confounded by anything
  else in this tree.

  **Part 2 — do the signer's own secret locals wipe?** In-tree reverts to bare
  arrays, each of which must break the build.

⚠ **PART 1 EXISTS BECAUSE B-19 WAS WRONG, AND THIS SCRIPT IS WHAT FOUND IT
(E-171).** `CLAIMS.md` E-167 said the `zeroize` feature *"was OFF, by accident,
for nine days"* and the B-19 decision said *"reverting the manifest line fails to
COMPILE"*. **Both are false.** The historical line —
`default-features = false, features = ["std"]`, at `16e2e58` — resolves to
`alloc,std,zeroize`, because `std = ["alloc", ..]` and `alloc` lists
`"zeroize/alloc"` **without the `?` sigil** that the `serde?/alloc` entry beside
it carries. The secret types were wiped on drop the whole time. B-19 made an
implied feature explicit, which is worth doing and is **not** what it said it
did. Three `REVIEW-025` legs and a `REVIEW-026` round accepted the claim, because
reading a manifest is not running one.

⚠ **CONTROLS RUN IN BOTH DIRECTIONS, and a gate without them is the false pass it
was built to catch (E-165, E-168).** Part 1's `[]` probe must FAIL, or "it
compiles" says nothing. Part 2's comment-edit control must still BUILD, or "the
build broke" says nothing.

⚠ **WHAT THIS DOES NOT SAY.** It says these types wipe on drop and these reverts
break the build. It does **not** say secret material is unrecoverable — see the
three residues named at `signer/src/xrpl.rs::sha512_zeroizing`, and P-5: an
adversary with code execution reads the scalar while it is live. This narrows a
window and removes no channel.

Run from the repository root:  python3 tools/check-zeroize-bounds.py
Exit 0 when every probe and every revert lands the way it is declared to.
"""
import subprocess, sys, shutil, os, tempfile, atexit, signal

MANIFEST = 'signer/Cargo.toml'
XRPL = 'signer/src/xrpl.rs'
FILES = [MANIFEST, XRPL]

if not all(os.path.exists(f) for f in FILES):
    sys.exit(f"run me from the repository root; {FILES} not found from {os.getcwd()}")

_bakdir = tempfile.mkdtemp(prefix='wconf-zeroize-bounds-')
_baks = {}
for _f in FILES:
    _b = os.path.join(_bakdir, os.path.basename(_f))
    shutil.copy(_f, _b)
    _baks[_f] = _b

def restore():
    for f, b in _baks.items():
        shutil.copy(b, f)

atexit.register(restore)
for _sig in (signal.SIGINT, signal.SIGTERM):
    signal.signal(_sig, lambda *_: (restore(), sys.exit(130)))

bad = 0

# ---------------------------------------------------------------------------
# Part 1 — what actually enables ed25519-dalek's `zeroize` feature
# ---------------------------------------------------------------------------
SCRATCH = tempfile.mkdtemp(prefix='wconf-zeroize-probe-')
os.makedirs(os.path.join(SCRATCH, 'src'), exist_ok=True)
open(os.path.join(SCRATCH, 'src', 'lib.rs'), 'w').write(
    "pub fn probe() {\n"
    "    fn requires<T: zeroize::ZeroizeOnDrop>() {}\n"
    "    requires::<ed25519_dalek::SigningKey>();\n"
    "}\n")

def probe(feats):
    """Build a scratch crate naming the bound. Returns True if it compiles."""
    open(os.path.join(SCRATCH, 'Cargo.toml'), 'w').write(
        '[package]\nname = "zprobe"\nversion = "0.0.0"\nedition = "2021"\n'
        '[dependencies]\n'
        f'ed25519-dalek = {{ version = "2", default-features = false, features = [{feats}] }}\n'
        'zeroize = { version = "1", default-features = false }\n')
    r = subprocess.run(['cargo', 'build', '-q'], cwd=SCRATCH,
                       capture_output=True, text=True)
    return r.returncode == 0

# (features, must_compile, what it establishes)
PROBES = [
  ('', False,
   "CONTROL — no features at all. Must FAIL, or 'it compiles' below means nothing."),
  ('"std"', True,
   "⚠ THE HISTORICAL LINE at 16e2e58. E-167 said this left zeroize OFF. It did not."),
  ('"alloc"', True,
   "`alloc` is the switch — it lists \"zeroize/alloc\" with no `?` sigil."),
  ('"std", "hazmat", "zeroize"', True,
   "today's line. Explicit, and — E-171 — not a behaviour change."),
]

print("check-zeroize-bounds — CLAIMS.md B-19, B-21, E-171\n")
print(f"  signer:  {os.path.abspath('signer')}")
print(f"  scratch: {SCRATCH}\n")
print("Part 1 — ed25519-dalek's `zeroize` feature, decided by a compiler")
print(f"  {'features':<32} {'result':<22} establishes")
print("  " + "-" * 104)
for feats, must, why in PROBES:
    got = probe(feats)
    ok = (got == must)
    verdict = ('compiles' if got else 'fails') + ('  OK' if ok else '  ⚠ NOT AS DECLARED')
    print(f"  [{feats}]".ljust(34) + f"{verdict:<22} {why}")
    if not ok:
        bad += 1

# ---------------------------------------------------------------------------
# Part 2 — the signer's own secret locals
# ---------------------------------------------------------------------------
def apply(old, new):
    hits = [(f, open(f).read()) for f in FILES]
    hits = [(f, t) for f, t in hits if t.count(old) == 1]
    if len(hits) != 1:
        counts = {f: open(f).read().count(old) for f in FILES}
        return f"BAD REVERT: pattern occurs {counts}; must be exactly once in exactly one file"
    f, t = hits[0]
    open(f, 'w').write(t.replace(old, new))
    return None

def compile_tests():
    r = subprocess.run(['cargo', 'test', '--all-features', '--no-run'],
                       cwd='signer', capture_output=True, text=True)
    return r.returncode == 0, r.stdout + r.stderr

REVERTS = [
  ("`sha512_zeroizing` returns a bare array (the expansion and the mask)",
   """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
    let mut hasher = Sha512::new();
    for part in parts {
        hasher.update(part);
    }
    let mut digest = hasher.finalize();
    let mut out = Zeroizing::new([0u8; 64]);
    out.copy_from_slice(digest.as_slice());
    digest.as_mut_slice().zeroize();
    out
}""",
   """fn sha512_zeroizing(parts: &[&[u8]]) -> [u8; 64] {
    let mut hasher = Sha512::new();
    for part in parts {
        hasher.update(part);
    }
    let digest = hasher.finalize();
    let mut out = [0u8; 64];
    out.copy_from_slice(digest.as_slice());
    out
}""",
   "the ed25519 SHA-512 expansion `h` and the nonce mask"),

  ("`fresh_aux` returns a bare array (the drawn auxiliary entropy)",
   """fn fresh_aux() -> Option<Zeroizing<[u8; 32]>> {
    let mut b = Zeroizing::new([0u8; 32]);
    match crate::store::getrandom(&mut b[..]) {""",
   """fn fresh_aux() -> Option<[u8; 32]> {
    let mut b = [0u8; 32];
    match crate::store::getrandom(&mut b[..]) {""",
   "the 32 bytes `getrandom` drew for the nonce hedge"),

  ("`OneShotAux` holds a bare array (the ECDSA aux, live for the whole sign)",
   """struct OneShotAux {
    bytes: Zeroizing<[u8; 32]>,
    used: usize,
}

impl OneShotAux {
    fn new(bytes: Zeroizing<[u8; 32]>) -> OneShotAux {""",
   """struct OneShotAux {
    bytes: [u8; 32],
    used: usize,
}

impl OneShotAux {
    fn new(bytes: [u8; 32]) -> OneShotAux {""",
   "the same drawn bytes, held across `sign_prehash_with_rng`"),
]

CONTROL = ("CONTROL — a comment edited inside the signing helper. Must still BUILD.",
           "/// SHA-512 into a buffer that wipes itself, leaving no unwiped digest behind.",
           "/// SHA-512 into a buffer that wipes itself. (negative control edit)")

print("\nPart 2 — the signer's own secret locals, decided by reverting them")
print("  baseline: the unmodified tree must build its tests ...")
ok, out = compile_tests()
if not ok:
    print("    " + "\n    ".join(out.splitlines()[-12:]))
    print("\nVOID, not passing: the unmodified tree does not compile.")
    print("  Every revert below would 'break the build' for a reason that is not the revert.")
    sys.exit(1)
print("    builds. Every failure below is one a revert CAUSED.\n")

print(f"  {'result':<24} revert")
print("  " + "-" * 104)

name, old, new = CONTROL
restore()
err = apply(old, new)
if err:
    print(f"  {'VOID':<24} {name}\n    {err}")
    sys.exit(1)
ok, out = compile_tests()
restore()
if not ok:
    print("    " + "\n    ".join(out.splitlines()[-12:]))
    print(f"\nVOID, not passing: the negative control BROKE THE BUILD.")
    print("  'The build broke' then carries no information and every arm is a false pass. E-165.")
    sys.exit(1)
print(f"  {'still builds  OK':<24} {name}")

for name, old, new, register in REVERTS:
    restore()
    err = apply(old, new)
    if err:
        print(f"  {'BAD PATTERN':<24} {name}\n    {err}")
        bad += 1
        continue
    ok, out = compile_tests()
    if ok:
        print(f"  {'STILL BUILDS  ⚠ FALSE':<24} {name}\n    {register}")
        print("    ⚠ The secret stopped being a wiping type and NOTHING objected.")
        bad += 1
        continue
    mech = 'bound' if 'ZeroizeOnDrop' in out else 'type'
    print(f"  {'build broke  OK (' + mech + ')':<24} {name}\n    {register}")
restore()

print("\n" + "-" * 106)
if bad:
    print(f"FAIL: {bad} probe(s) or revert(s) did not land as declared.")
else:
    print(f"PASS: {len(PROBES)} feature probes and {len(REVERTS)} reverts all landed as declared,")
    print(f"      with a control in each direction.")
print("⚠ '(bound)' means the `ZeroizeOnDrop` bound refused it; '(type)' means an incidental")
print("  type mismatch did. Both break the build; only the first is a check on the PROPERTY.")
print("⚠ ⚠ **B-19's own claim is NOT in the revert list, because it is FALSE** — removing the")
print("  `zeroize` word from the ed25519-dalek line does NOT break the build. Part 1's")
print('  [\"std\"] probe is what establishes why. CLAIMS.md E-171.')
print("⚠ This says these types wipe on drop. It does NOT say the secret is unrecoverable —")
print("  see `sha512_zeroizing`'s three named residues, and P-5.")
sys.exit(1 if bad else 0)

```


## FILE (complete): `tools/spike-b16-2026-08-27/revert-sweep.py`

```python
#!/usr/bin/env python3
"""
B-16 revert sweep — `REVIEW-024` §6 item 8: **revert each fix and watch its test
fail.**

⚠ **A revert that PASSES is a finding about the code, not a bad revert**, and one
did. Revert 8 — a successful all-zero entropy draw treated as an omission, which
is `REVIEW-018` §4a's error in the mirror direction and exactly what §6 item 3
exists to prevent — left the whole suite green. The test written for that item
drove `Hedge::FixedAux([0u8; 32])`, which never reaches `xrpl::fresh_aux`, the
function that decides `Some` vs `None`. **A test named for a property, one layer
away from where the property breaks**, is this project's most frequent defect.
Fixed by `store::next_entropy_draw_returns_for_test` and two tests that use it.

⚠ **A revert that does not COMPILE proves nothing** (`CLAIMS.md` E-108, twice) —
so this script distinguishes three outcomes and treats `no compile` as VOID, not
as success. It also refuses to run a revert whose pattern does not occur exactly
once, because a silently-applied-to-nothing patch is the same false pass.

⚠ **AND A NONZERO EXIT IS NOT "the test failed", which is what this script used
to accept.** `REVIEW-025`'s Codex leg: any runtime, harness, missing-fixture or
infrastructure failure also exits nonzero, and the script parsed the failing test
names and then never checked them. It now **requires at least one EXPECTED test
name to appear in the failure list**, and reports `WRONG-TEST` — not success —
when a mutation breaks something other than what it was aimed at. That is the
same false-pass shape the sweep exists to find, one level up.

⚠ It also used a fixed `/tmp` backup and had no `try`/`finally`, so an
interruption could leave the reviewed tree mutated. Both fixed.

⚠ **AND "an expected test failed" IS NOT "the mutation caused it" WITHOUT A
BASELINE**, which round two caught (`REVIEW-026`, Codex leg). If an expected test
were already failing — a stale fixture, a bad environment, a concurrent edit —
every mutation listing that test would be certified by a failure it did not
cause. The sweep now **runs the unmodified target first and requires ZERO
failures**, and then requires each mutation to produce a **NEWLY** failing
expected test.

⚠ **Four of the twelve were re-anchored on 2026-08-27 by B-21**, which wrapped
the signing helper's secret locals in `Zeroizing` and moved two `Sha512` updates
into one helper call. The mutations are unchanged; their anchor text moved. The
sweep reported **BAD PATTERN** for all four rather than quietly passing, which is
what `apply`'s exactly-once rule is for — a patch applied to nothing is the same
false pass as a nonzero exit taken for a failing test.

⚠ This is a sweep over a NAMED SET of **twelve** mutations — it said eleven while
listing twelve (`REVIEW-026`) — against **`cargo test --test hedged_signing`**,
which is one target and not the whole suite; it claimed the whole suite for one
commit. It says those twelve are caught. It does not say the construction has no
other failure mode.

Run from the repository root:  python3 tools/spike-b16-2026-08-27/revert-sweep.py
Exit 0 when every revert produced a failing test.
"""
import subprocess, sys, shutil, os, tempfile, atexit, signal
XRPL = 'signer/src/xrpl.rs'
STORE = 'signer/src/store.rs'
FILES = [XRPL, STORE]
# ⚠ A unique backup per run, not a fixed /tmp path two runs would share.
_bakdir = tempfile.mkdtemp(prefix='wconf-revert-sweep-')
_baks = {}
for _f in FILES:
    _b = os.path.join(_bakdir, os.path.basename(_f))
    shutil.copy(_f, _b)
    _baks[_f] = _b

def restore():
    for f, b in _baks.items():
        shutil.copy(b, f)

# ⚠ Restore on ANY exit — exception, Ctrl-C, SIGTERM. The previous version left
# the reviewed working tree mutated if it died mid-sweep.
atexit.register(restore)
for _sig in (signal.SIGINT, signal.SIGTERM):
    signal.signal(_sig, lambda *_: (restore(), sys.exit(130)))

def apply(old, new):
    """Apply to whichever tracked file holds the pattern exactly once."""
    hits = [(f, open(f).read()) for f in FILES]
    hits = [(f, t) for f, t in hits if t.count(old) == 1]
    if len(hits) != 1:
        counts = {f: open(f).read().count(old) for f in FILES}
        return f"BAD REVERT: pattern occurs {counts}; must be exactly once in exactly one file"
    f, t = hits[0]
    open(f, 'w').write(t.replace(old, new))
    return None

def run(expected, baseline=frozenset()):
    """Run the whole `hedged_signing` TARGET and require a NEWLY failing expected test.

    ⚠ The whole target, not a positional filter: a filter can silently match
    nothing, and then "nonzero exit" means "no tests ran", not "the test failed".
    Running the target also catches a mutation that breaks something the revert's
    author did not anticipate — which is information, not noise.

    ⚠ `baseline` is the set of tests already failing BEFORE any mutation. It must
    be empty for the sweep to mean anything, and `establish_baseline` enforces
    that — but it is threaded through here so the "newly failing" arithmetic is
    explicit rather than assumed.
    """
    r = subprocess.run(['cargo', 'test', '--test', 'hedged_signing'],
                       cwd='signer', capture_output=True, text=True)
    out = r.stdout + r.stderr
    if 'error[E' in out or 'error: could not compile' in out:
        return 'DID-NOT-COMPILE', [], out
    failed = sorted({l.split()[1] for l in out.splitlines()
                     if l.startswith('test ') and l.rstrip().endswith('FAILED')})
    if r.returncode == 0:
        return 'PASSED', failed, out
    if not failed:
        # Nonzero, but no named test failed: a harness or infrastructure error.
        return 'NO-TEST-FAILED', failed, out
    newly = set(failed) - set(baseline)
    if not (newly & set(expected)):
        return 'WRONG-TEST', failed, out
    return 'FAILED', failed, out


def establish_baseline():
    """⚠ Prove the UNMODIFIED target is green before believing any mutation.

    Without this the sweep certifies a mutation whenever an expected test is in
    the failure set — including when that test was already failing for a reason
    the mutation had nothing to do with. `REVIEW-026`, Codex leg: *"the script
    never first proves the unmodified target passes."*
    """
    restore()
    r = subprocess.run(['cargo', 'test', '--test', 'hedged_signing'],
                       cwd='signer', capture_output=True, text=True)
    out = r.stdout + r.stderr
    if 'error[E' in out or 'error: could not compile' in out:
        return None, 'the unmodified target does not COMPILE', out
    failed = sorted({l.split()[1] for l in out.splitlines()
                     if l.startswith('test ') and l.rstrip().endswith('FAILED')})
    if r.returncode != 0 or failed:
        return None, f'the unmodified target is NOT GREEN: {failed or "nonzero exit, no named failure"}', out
    return frozenset(), None, out

REVERTS = [
  ("1. The mask is never applied (pure RFC 8032 again)",
   "                if let Some(aux) = aux {",
   "                if let Some(aux) = aux.filter(|_| false) {",
   ["zero_aux_is_hedged_not_a_fallback", "two_fixed_aux_values_give_two_nonces",
    "the_default_ed25519_path_does_not_repeat_itself", "the_construction_matches_a_second_model"]),

  ("2. The mask lands on the SCALAR instead of the nonce prefix",
   "                    for (b, m) in esk.hash_prefix.iter_mut().zip(mask.iter()) {\n                        *b ^= *m;\n                    }",
   "                    let mut sb = esk.scalar.to_bytes();\n                    for (b, m) in sb.iter_mut().zip(mask.iter()) { *b ^= *m; }\n                    sb[31] &= 0x0f;\n                    esk.scalar = ed25519_dalek::hazmat::ExpandedSecretKey::from_slice(&[&sb[..], &sb[..], &[0u8;0][..]].concat()[..64]).unwrap().scalar;",
   ["both_modes_publish_and_verify_under_the_same_key", "every_signature_verifies_under_the_seed_derived_published_key"]),

  ("3. One byte of the DST changed",
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1\\0";',
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v2\\0";',
   ["the_construction_matches_a_second_model"]),

  ("4. The trailing NUL dropped from the DST",
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1\\0";',
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1 ";',
   ["the_construction_matches_a_second_model"]),

  # ⚠ Re-anchored 2026-08-27 by **B-21**, which replaced two `Sha512` updates
  # with one `sha512_zeroizing(&[DST, aux])` call. The mutation is unchanged —
  # DST and aux in the other order — but its anchor text moved, and the sweep
  # reported BAD PATTERN rather than passing, which is the whole point of
  # refusing a pattern that does not occur exactly once.
  ("5. DST and aux concatenated in the other order",
   "sha512_zeroizing(&[ED25519_NONCE_HEDGE_DST, &aux[..]])",
   "sha512_zeroizing(&[&aux[..], &ED25519_NONCE_HEDGE_DST[..]])",
   ["the_construction_matches_a_second_model"]),

  ("6. The mask taken from the SECOND half of the SHA-512 output",
   "                    for (b, m) in esk.hash_prefix.iter_mut().zip(mask.iter()) {",
   "                    for (b, m) in esk.hash_prefix.iter_mut().zip(mask[32..].iter()) {",
   ["the_construction_matches_a_second_model"]),

  ("7. A reported entropy failure masks with zeros instead of omitting the mask",
   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => Some(b),\n        Err(_) => None,\n    }",
   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => Some(b),\n        Err(_) => Some(Zeroizing::new([0u8; 32])),\n    }",
   ["ed25519_entropy_failure_degrades_to_rfc_8032", "entropy_failure_degrades_to_the_standard_construction"]),

  ("8. A successful ZERO draw treated as an omission (B-14's mirror error)",
   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => Some(b),\n        Err(_) => None,\n    }",
   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => if *b == [0u8; 32] { None } else { Some(b) },\n        Err(_) => None,\n    }",
   ["zero_aux_is_hedged_not_a_fallback", "a_successful_all_zero_draw_still_hedges",
    "a_successful_all_zero_draw_still_hedges_secp256k1"]),

  ("9. The message dropped from the nonce preimage (nonce reuse across messages)",
   "                Ok(raw_sign::<Sha512>(&esk, message, &vk).to_bytes().to_vec())",
   "                let fixed: &[u8] = b\"\";\n                let _ = message;\n                Ok(raw_sign::<Sha512>(&esk, fixed, &vk).to_bytes().to_vec())",
   ["one_aux_over_two_messages_does_not_reuse_the_nonce", "the_construction_matches_a_second_model"]),

  ("10. A caller-visible verifying key substituted (the hazmat attack shape)",
   "                let vk = VerifyingKey::from(&esk);",
   "                let vk = VerifyingKey::from(&ExpandedSecretKey::from_slice(&Sha512::digest([9u8; 32])).unwrap());",
   ["both_modes_publish_and_verify_under_the_same_key", "every_signature_verifies_under_the_seed_derived_published_key"]),

  ("12. The DST constant edited — the_dst_is_the_ruled_bytes must catch it ALONE",
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1\\0";',
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v9\\0";',
   ["the_dst_is_the_ruled_bytes"]),

  # ⚠ Re-anchored 2026-08-27 by **B-21**. `h` is a `Zeroizing<[u8; 64]>` and
  # `from_slice` takes `&h[..]`; the mutation is the same stray flip.
  ("11. The unmasked arm no longer RFC 8032 (a stray mask on the no-mask path)",
   "                let mut esk = ExpandedSecretKey::from_slice(&h[..])",
   "                let mut h = h; h[63] ^= 1; let mut esk = ExpandedSecretKey::from_slice(&h[..])",
   ["the_unmasked_arm_is_byte_identical_to_the_crates_own_rfc_8032",
    "ed25519_entropy_failure_degrades_to_rfc_8032",
    "the_construction_matches_a_second_model"]),
]

print("baseline: running the unmodified target ...")
BASELINE, berr, bout = establish_baseline()
if berr is not None:
    print("  " + "\n  ".join(bout.splitlines()[-14:]))
    print(f"\nVOID, not passing: {berr}")
    print("  A sweep whose baseline is red certifies mutations by failures they did not")
    print("  cause. REVIEW-026, Codex leg. Fix the tree first; this run establishes nothing.")
    sys.exit(1)
print("  green, 0 failures. Every failure below is one the mutation CAUSED.\n")

print(f"{'#':<3} {'result':<16} revert")
print("-" * 100)
bad = 0
for name, old, new, tests in REVERTS:
    restore()
    err = apply(old, new)
    if err:
        print(f"    {'BAD PATTERN':<16} {name}\n      {err}")
        bad += 1
        continue
    verdict, failed, out = run(tests, BASELINE)
    mark = {
        'FAILED': 'test failed  OK',
        'PASSED': 'PASSED  <-- FINDING',
        'DID-NOT-COMPILE': 'no compile  VOID',
        'NO-TEST-FAILED': 'no test failed  VOID',
        'WRONG-TEST': 'WRONG TEST  <-- FINDING',
    }[verdict]
    print(f"    {mark:<24} {name}")
    print(f"      expected among: {', '.join(tests)}")
    print(f"      actually failed: {', '.join(failed) or '(none named)'}")
    if verdict != 'FAILED':
        bad += 1
        print("      " + "\n      ".join(out.splitlines()[-14:]))

restore()
print("-" * 100)
print(f"{len(REVERTS)} reverts, {len(REVERTS)-bad} made an EXPECTED test fail, {bad} did not.")
print("⚠ 'an expected test' — not merely a nonzero exit. A mutation that breaks")
print("  something other than what it was aimed at is reported WRONG TEST, and a")
print("  nonzero exit with no named failure is reported VOID. REVIEW-025, Codex leg.")
sys.exit(1 if bad else 0)

```


## FILE (complete): `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`

```markdown
# DECISION — `CLAIMS.md` B-19: `ed25519-dalek`'s `zeroize` feature

**Date:** 2026-08-27. **Decided by:** the coding session, as adjudicator.
**Status:** DECIDED — **enable it.** Applied in the same session.

⚠⚠ **CORRECTED AGAIN 2026-08-27, AND THIS ONE IS THE PREMISE, NOT THE WORDING —
`CLAIMS.md` E-171. THE FEATURE WAS NEVER OFF.**

`ed25519-dalek`'s `std` feature implies `alloc`, and `alloc` lists
`"zeroize/alloc"` **without the `?` sigil** that the `serde?/alloc` entry two
lines above it carries. The historical line at `16e2e58` —
`default-features = false, features = ["std"]` — therefore resolved to
**`alloc,std,zeroize`**. `ExpandedSecretKey` and `SigningKey` were wiped on drop
for the whole of the nine days §2 is about, and **removing the word `zeroize`
from this manifest still builds today**, which §5 says is impossible.

**What survives:** enabling it explicitly is worth doing. An implied feature is
one upstream refactor away from vanishing, and it is now pinned by a probe
instead of by a sentence. **What does not survive:** §1's and §2's account of a
consequence, and §5's falsifier.

⚠ **This was accepted by three `REVIEW-025` legs and a `REVIEW-026` round.** None
of them ran it, and neither did the session that wrote it — **reading a manifest
is not running one**, and a feature-resolution claim has no falsifier that
reading can supply. `tools/check-zeroize-bounds.py` is that falsifier now; it
exists because **B-21** needed one and the B-19 arm was included on the strength
of the sentence in §5. It reported `STILL BUILDS FALSE` on its first run.

⚠ **Corrected 2026-08-27 after `REVIEW-025` round one.** Both external legs
accepted B-19 and both corrected its wording; the corrections are marked ⚠ below.
It is no longer true that this decision has had no leg — it has had two, on the
narrow question, inside the B-16 packet. ⚠ **Two legs and a round accepted a
false premise, which is what E-171 is about**: a leg checks what the packet
makes checkable.

It is a dependency hygiene change, not a cryptographic design change: it alters
no construction, no byte on the wire, no test vector, and ⚠ **no `wconf-signer`
callable API or wire format** — it does newly expose two `ZeroizeOnDrop` trait
implementations from the dependency, which is what §5's check depends on, so
"no API" full stop was wrong (`REVIEW-025`, Codex leg). It rides into `REVIEW-025`'s two
build rounds alongside B-16 and is called out there explicitly so a reviewer can
reject it separately. `CLAUDE.md`'s "full adversarial rotation before
implementation" gate is for architecture, trust boundaries and cryptographic
design; a `Drop` impl on a struct this crate already owns is none of those.

⚠ **Its justification is NOT the nonce ruling's, deliberately.** `REVIEW-024` §9
finding 3 filed this as B-19 and said so: *"a fix to it should not inherit a
nonce ruling's justification."* Nothing below argues from the threat model that
`REVIEW-018` and `REVIEW-024` argue from.

---

## 1. The finding, restated and verified at source today

`signer/Cargo.toml:16`

```toml
ed25519-dalek = { version = "2", default-features = false, features = ["std"] }
```

`ed25519-dalek-2.2.0/Cargo.toml`

```toml
default  = ["fast", "std", "zeroize"]
zeroize  = ["dep:zeroize", "curve25519-dalek/zeroize"]
```

So `zeroize` is **off**, and with it:

| Site | Source | Effect with the feature off |
|---|---|---|
| `ExpandedSecretKey` | `hazmat.rs:67-73` — `#[cfg(feature = "zeroize")] impl Drop` | scalar and `hash_prefix` are **not** wiped on drop |
| `SigningKey` | `signing.rs:658-666` — `#[cfg(feature = "zeroize")] impl Drop` / `ZeroizeOnDrop` | the 32-byte secret key is **not** wiped on drop |
| `curve25519_dalek::Scalar` | `zeroize = [… "curve25519-dalek/zeroize"]` | no `Zeroize` impl to call |

And `hazmat.rs:39`, the doc comment on `ExpandedSecretKey`, states
unconditionally:

> *Instances of this secret are automatically overwritten with zeroes when they
> fall out of scope.*

**That sentence is false in this build**, and it is false in the one place a
reader would go to check.

## 2. Was the omission intentional? — **No.**

`git log -S'ed25519-dalek = ' -- signer/Cargo.toml` returns exactly one commit:
`16e2e58`, *"Wire the vendored prover into the signer — architecture §6 step 3"*
(2026-08-18). The hunk is three added lines:

```diff
-k256 = { version = "0.13", default-features = false, features = ["arithmetic"] }
+k256 = { version = "0.13", default-features = false, features = ["arithmetic", "ecdsa"] }
+ripemd = "0.1"
+ed25519-dalek = { version = "2", default-features = false, features = ["std"] }
```

The new line copies the `default-features = false` idiom from the `k256` line
directly above it.

⚠ **CORRECTED 2026-08-27, before this document was committed.** It said: *"No
commit message, review, ADR or ruling in this repository mentions `zeroize`
before `REVIEW-024` §9 finding 3."* **That is false, and P-12's falsifier is what
caught it** — `git log -S'zeroize' --all` returns **eleven** commits and eleven
tracked documents mention it. **A negative claim written without running the
search, in a document arguing that an unchecked assumption cost nine days.**

**And what the search found is a worse finding than the one it replaced.** This
project had already decided that key material is zeroized on drop, twice, in
writing, *before* the manifest line was written:

| Where | When | What it says |
|---|---|---|
| `REVIEW-005a` line 251 | **2026-08-17** | *"Witness and key types: `#[derive(Zeroize, ZeroizeOnDrop)]`"* |
| `REVIEW-012-RULING` §4 | **2026-08-18** | *"Seed, `PRK`, `OKM64` and `sk_A` buffers are … **zeroized on drop** and on `SIGINT`/`SIGTERM`/panic"* — a **condition of the keygen ruling** |

**Both conditions were honoured where a session wrote the code by hand.**
`signer/src/keygen.rs:118-129` implements `zeroize()` with a destructor that
calls it, and `zeroize_overwrites_every_byte` and
`the_derived_secret_survives_its_source_being_zeroized` are the tests. `mlock` is
named as a gap rather than claimed.

⚠ **So the accurate statement is narrower and sharper: the ElGamal key got
hand-rolled zeroization and a test; the XRPL ACCOUNT KEY — from which, under the
ruled keygen construction, that ElGamal key is derived — silently did not,
because a dependency default was switched off in a manifest and no review read
the manifest for nine days.** Nothing before `REVIEW-024` §9 finding 3 mentions
`ed25519-dalek`'s `zeroize` **feature**, which is the claim §2 should have made.

⚠ **And the idiom was harmless on the line it was copied from, which is why
nobody noticed.** `k256`'s `default-features = false` does **not** disable
zeroization: `elliptic-curve-0.13.8/Cargo.toml` declares `zeroize` as a
**mandatory** dependency — no `optional = true`, no feature gate — and
`secret_key.rs:318` is a bare `impl<C> ZeroizeOnDrop for SecretKey<C>`. The same
two words have opposite consequences on two adjacent lines, and the difference is
invisible from the manifest. **B-19 is confined to `ed25519-dalek`**, and this
paragraph is what says so rather than an assumption that it is.

## 3. The decision

> **Enable `zeroize`.** `signer/Cargo.toml`'s `ed25519-dalek` line gains
> `"zeroize"`.

⚠ The resulting feature list is `["std", "hazmat", "zeroize"]`, **not**
`["std", "zeroize"]` as this said — `hazmat` is B-16's, on the same line for a
different reason, and eliding it made the manifest look like something it is not
(`REVIEW-026`, Codex leg).

**Why, and the whole argument is hygiene:**

1. It **restores a crate default this project turned off by accident**, on
   evidence rather than inference (§2).
2. It makes the crate's own documentation true in this build. A reader who
   checks `ExpandedSecretKey` today reads a promise the manifest revokes four
   files away — and `CLAUDE.md`'s standing rule is that a false sentence about
   what the system does is a defect whoever wrote it.
3. ⚠ **No new dependency download, and an expected cost that has NOT been
   measured** — which is what this said until `REVIEW-025`'s Codex leg pointed
   out that *"nothing measurable"* and *"a cost of zero"* are unsupported
   claims, not modest ones. `zeroize 1.9.0` is already in `Cargo.lock` (pulled
   in by `elliptic-curve`), so nothing new is fetched. The change adds two
   `Drop` impls; zeroization performs real writes on every drop of a
   `SigningKey` or `ExpandedSecretKey` and may add code. **Expected negligible,
   not benchmarked**, and this project's own rule is that an unmeasured number
   is not a number.
4. ⚠ **`fast` stays off.** `fast = ["curve25519-dalek/precomputed-tables"]` is a
   speed/binary-size trade with no security content, and re-enabling it is not
   this decision. Only `zeroize` is added.

**Why it is being decided now rather than handed over:** the B-16 build puts a
second copy of expanded secret material on the stack. With `zeroize` **off**, the
honest B-16 implementation would have to wipe that material by hand — which is
`zeroize`'s job, done worse, inside a nonce commit, and is exactly the merge
`REVIEW-024` §9 forbade. **Deciding it on is what keeps B-19 and B-16 separable.**

## 4. ⚠ What this does NOT buy, stated because `CLAIMS.md` P-5 governs

- **It is not a defence against the issue #1 adversary.** A hostile process
  running as the holder's user reads the scalar out of live process memory while
  the signature is being computed. Zeroization shortens a window; it removes no
  channel. `REVIEW-024` §8 makes the same disclaimer about hedging and it applies
  here unchanged.
- **It does not cover every copy.** `ed25519-dalek`'s own
  `impl From<&SecretKey> for ExpandedSecretKey` computes
  `Sha512::default().chain_update(secret_key).finalize()` into a `GenericArray`
  local that **no** feature wipes, and the curve arithmetic's temporaries are
  outside any `Drop` this feature adds. Rust may also leave copies behind a move.
  ⚠ **The B-16 helper has the same residue by construction** — the 64-byte
  SHA-512 output and the 32-byte mask are stack locals — and it is recorded in
  `xrpl.rs` at the site rather than argued away here.
- **It says nothing about swap.** The signer already discloses that it does not
  pin memory, and that disclosure is unchanged.

## 5. The check that it took effect

⚠⚠ **THIS SECTION IS WHERE E-171 LIVES. Its last clause is FALSE and was never
executed.**

`signer/tests/hedged_signing.rs::ed25519_secret_types_implement_zeroize_on_drop`
asserts `ExpandedSecretKey: ZeroizeOnDrop` and `SigningKey: ZeroizeOnDrop`. That
much is **true and worth having**: the bounds are real, the impls are real, and
the test passes.

~~**trait bounds that do not exist without the feature**, so the test fails to
*compile* if the manifest line is reverted, which is the strongest available
falsifier for a `cfg`-gated impl.~~ ⚠ **The bounds do not depend on the word this
decision added.** Reverting the manifest line **compiles**, because `std` already
implies the feature. So this test is a check that the types wipe — which is the
property anyone actually cares about — and **not** a check on the edit. A test
that cannot see the change it was written for is this repository's most frequent
defect (E-161, E-164); this is that shape at the manifest layer.

**What checks it now:** `tools/check-zeroize-bounds.py` part 1, which builds a
scratch crate at four feature sets and requires `[]` to **fail** — without that
control, "it compiles" establishes nothing.

A manifest edit is a claim about a build, so it gets a test that fails if the
claim is false. ⚠ **It got one that could not**, for a day.

⚠ **A runtime "is the buffer zero?" assertion was considered and rejected**: it
would read freed stack memory, which is undefined behaviour, and it would pass or
fail for reasons unrelated to the feature. `CLAIMS.md` E-108's rule — *a revert
that does not compile proves nothing* — inverts here: a **compile failure is**
the proof, because the bound is what the feature adds.

## 6. Rejected alternatives

| Option | Why not |
|---|---|
| **Leave it off, document the gap** | The gap is a false sentence in the dependency's own doc plus an unwiped secret, at a cost of no new dependency and writes on drop that were not measured. ⚠ This said *"at a cost of zero"*, which §3 item 3 had already been corrected for and this row had not (`REVIEW-026`). Documenting is what you do when a fix is expensive. |
| **Enable `default-features = true`** | Sweeps `fast` in with it. Two changes, one line, one of them undiscussed. |
| **Hand-roll wiping in the B-16 helper** | `zeroize`'s job done worse, and it welds B-19's justification to B-16's. `REVIEW-024` §9 finding 3 forbids exactly that. |
| **Add `zeroize` as a direct signer dependency and wipe the helper's locals too** | ⚠ **DONE 2026-08-27 — B-21 is built.** `sha512_zeroizing`, `fresh_aux` and `OneShotAux` all carry `Zeroizing`, checked by `make check-zeroize-bounds` part 2. **Building it is what found E-171.** Originally: ⚠ **Not rejected on merit — deferred as out of scope.** It is a real gap (§4) and it is more than "one manifest line". Filed as **B-21**, and `REVIEW-025`'s Gemini leg independently confirmed the residue is real: `Output<Sha512>` and raw byte arrays implement no `Drop`. ⚠ **One instance was NOT deferred** — `Sha512::digest(k.to_bytes())` copied the secret by value where `as_bytes()` returns a reference, which was gratuitous rather than structural, and is fixed. |

```


## APPENDIX — the diff, FOR ORIENTATION ONLY

⚠ **The complete files above are the subject; this is an aid.** This project's rule is complete text, not a diff, because a diff bounds a leg to what the author chose to show. If this appendix and a file above disagree, the file is authoritative.

```diff
diff --git a/CLAIMS.md b/CLAIMS.md
index f78901e..332d805 100644
--- a/CLAIMS.md
+++ b/CLAIMS.md
@@ -223,10 +223,11 @@ Statuses: `SUPPORTED` (evidence attached) · `PENDING` (asserted, evidence not a
 | E-164 | ⚠ **A REVERT PASSED, and it is the strongest instance of `CLAUDE.md`'s "revert every fix and watch its test fail" the project has.** `REVIEW-024` §6 item 3 requires that a *successful* draw of 32 zero bytes stays hedged and only a *reported* failure omits the mask — the distinction `REVIEW-018` §4a got wrong in the mirror direction. A test was written for it, `zero_aux_is_hedged_not_a_fallback`, and reverting `xrpl::fresh_aux` to treat a successful all-zero draw as an omission **left all 263 tests green**. The test drove `Hedge::FixedAux([0u8; 32])`, which enters at `sign_with_aux` and **never reaches the function that makes the decision**. ⚠ **Reading the test finds nothing** — its assertion is true, its name is apt, and the site it cannot see is one call earlier. **This is the third instance of one failure mode in this file's history**: `aux_is_exactly_one_field_of_entropy` could not see entropy recycling, `one_implementation_not_two` could not see implementation identity (E-161), and this could not see the zero-draw decision. **A test named for a property, one layer away from where the property breaks** | **Fixed:** `store::next_entropy_draw_returns_for_test` — a `test-support`-only, thread-local, one-shot hook that makes a *successful* draw injectable, as the failure already was — plus `a_successful_all_zero_draw_still_hedges` and a secp256k1 twin. ⚠ **The hook PANICS on a size mismatch rather than returning `Err`**, because an error there is indistinguishable from an entropy failure and would send the signer down the **unmasked** arm — a test could then pass having exercised the exact thing it was written to rule out (`REVIEW-025`, Codex leg). The revert is item 8 of `tools/spike-b16-2026-08-27/revert-sweep.py` and now fails | A, executed |
 | E-165 | ⚠ **A GATE BUILT THIS SESSION TO CATCH FALSE PASSES FALSE-PASSED, and a control naming `0u8` — a literal, not a symbol — was reported "gated".** `tools/check-test-support-gate.ts` put every probe in **one** source file and asked whether the compiler's output `includes(symbol)`. rustc echoes the offending **source line** in its diagnostic, so any symbol sharing a line with a failing one was certified gated. **Both `REVIEW-025` external legs found it independently**, and the `0u8` control demonstrated it rather than arguing it. ⚠ **`CLAIMS.md` E-141 one layer out**: *a gate that reports a number is making a claim about what the number counts* — this one was counting echoed text. **The same session's `revert-sweep.py` had the sibling defect**: it accepted **any** nonzero exit as *"the test failed"*, so a crash, a missing fixture or a filter matching nothing would all have read as proof; it parsed the failing test names and never checked them (Codex leg) | **Both fixed and both re-verified by breaking them.** The gate compiles **one crate per probe**, both ways, plus a negative control that must build in both directions — the `0u8` entry is now reported `REACHABLE`, and ungating a real symbol is reported `REACHABLE`, and a renamed symbol is reported `VOID`. The sweep runs the whole suite and **requires an expected test name among the failures**, reporting `WRONG-TEST` and `NO-TEST-FAILED` distinctly; ⚠ **it immediately caught four stale expected-test names created by round one's own renames**, which the old rule could not have seen. It also restores the tree on `atexit`, `SIGINT` and `SIGTERM`, from a unique temp backup rather than a shared `/tmp` path | A, executed |
 | E-166 | **`REVIEW-025` round one: eleven findings, not one of them about the construction.** All three legs ruled the construction correct term by term against `REVIEW-024` §3 — Gemini 9.5, Codex 9 on the construction and **8 on the evidence**, self leg 7 — and **every finding was about evidence or about claims**. Four were sentences describing tests: a tautological DST test (`RULED_DST` compared to the same literal, because the constant was `pub(crate)` and unreachable from an integration test) under an `xrpl.rs` comment asserting it *"pins all 29 of them"*; a test whose **name** asserted what its own doc comment admitted it could not see; a KAT calling a project-authored model *"an independent implementation"*; and five stale or miscrediting sentences including `Cargo.toml`'s *"No keys, no proofs, no signing"*. Two were guards absent where they matter: `debug_assert_eq!` on verifying-key drift, **compiled out of the only binary that signs**, and `Sha512::digest(k.to_bytes())` copying the secret by value in the commit that enabled `zeroize` so secrets would be wiped. ⚠ **The self leg found four of eleven and missed the two worst** (E-165) — `REVIEW-024` §4's inverted lesson arriving again one round later: **being the adjudicator does not make your leg the good one** | **`REVIEW-025c-adjudication-b16-build-2026-08-27.md`**, from `REVIEW-025a` / `025b` / `025s`. ⚠ **This said "All eleven fixed" and ROUND TWO PROVED IT WRONG**: four corrected sentences had a **second copy** left standing, one remedy was taken in its weaker form, and the adjudication itself overstated a fix in the round whose whole lesson is that fixes and their descriptions fail separately. `REVIEW-026` fixed those; **the honest form is "all eleven addressed, four of them incompletely, corrected in round two"**. ⚠ **Round two reviews THE FIXES**, and `CLAUDE.md`'s reason is exactly this round's shape: *fixing something and describing the fix are separate acts with separate failure modes*, and four of the eleven were descriptions. ⚠ **One leg's PARTIAL grade was the ADJUDICATOR'S fault, not the code's**: `tests/xrpl_vectors.rs` was omitted from the packet, so Codex could not check §6 gate 1 — **E-160's lesson from the other side, an omission bounding a leg exactly as an excerpt does** | A, executed |
-| E-167 | **B-19 decided and applied: `ed25519-dalek`'s `zeroize` was OFF, by accident, for nine days.** `git log -S'ed25519-dalek = '` returns exactly one commit — `16e2e58`, architecture §6 step 3 — whose hunk copies `default-features = false` from the `k256` line directly above it. ⚠ **A first draft of this row said *"no commit message, review, ADR or ruling in this repository mentions `zeroize`"* — FALSE, and P-12's falsifier caught it before it was committed: `git log -S'zeroize' --all` returns ELEVEN commits.** ⚠ **And the truth is a worse finding.** `REVIEW-005a` (2026-08-17) required *"`#[derive(Zeroize, ZeroizeOnDrop)]`"* on key types and `REVIEW-012-RULING` §4 (2026-08-18) made *"zeroized on drop"* a **condition of the keygen ruling** — and both were honoured where a session wrote the code by hand (`keygen.rs:118-129`, with `zeroize_overwrites_every_byte`). **So the ElGamal key got hand-rolled zeroization and a test, while the XRPL ACCOUNT KEY — the input its derivation takes — silently did not, because a dependency default was switched off in a manifest that no review read for nine days.** What nothing mentions before `REVIEW-024` §9 is `ed25519-dalek`'s `zeroize` **feature**. ⚠ **And the idiom is HARMLESS on the line it was copied from, which is why nobody noticed**: `elliptic-curve-0.13.8` declares `zeroize` as a **mandatory** dependency — no `optional = true`, no feature gate — and `secret_key.rs:318` is a bare `impl<C> ZeroizeOnDrop for SecretKey<C>`. **The same two words have opposite consequences on two adjacent lines, and the difference is invisible from the manifest.** So `SigningKey` and `ExpandedSecretKey` were not wiped on drop while `hazmat.rs:39` promised unconditionally that they were | **`docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.** Enabled; `fast` deliberately left off. ⚠ **Decided on hygiene, NOT on the nonce ruling's threat model** — `REVIEW-024` §9 required that separation and it is what keeps B-19 and B-16 separable: with `zeroize` off, an honest B-16 would have had to wipe expanded secret material by hand, inside a nonce commit. The check is a `ZeroizeOnDrop` **trait bound**, so reverting the manifest line fails to **compile** — E-108's rule inverted, because there the compile failure IS the proof. ⚠ **Accepted by all three `REVIEW-025` legs, and its wording corrected by two**: *"no callable API or wire-format change"* rather than "no API", and *"no new download; expected negligible, NOT MEASURED"* rather than "nothing measurable" — **an unmeasured number is not a number, and this project says so about everyone else's**. The remaining unwiped stack locals are **B-21** | A, executed |
+| E-167 | ⚠⚠ **THIS ROW'S HEADLINE IS FALSE AND E-171 IS WHY. `zeroize` WAS NEVER OFF.** `std = ["alloc", ..]` and `alloc` lists `"zeroize/alloc"` **without the `?` sigil** the `serde?/alloc` entry beside it carries, so the historical line resolved to `alloc,std,zeroize`. Proved by scratch-crate probe in `tools/check-zeroize-bounds.py`, with an empty-feature control that fails. **Everything below about the ACCIDENT is still true and is still worth having — the line was copied from `k256` and meant nothing by it — but its CONSEQUENCE was nil.** The row now reads: ~~**B-19 decided and applied: `ed25519-dalek`'s `zeroize` was OFF, by accident, for nine days.**~~ `git log -S'ed25519-dalek = '` returns exactly one commit — `16e2e58`, architecture §6 step 3 — whose hunk copies `default-features = false` from the `k256` line directly above it. ⚠ **A first draft of this row said *"no commit message, review, ADR or ruling in this repository mentions `zeroize`"* — FALSE, and P-12's falsifier caught it before it was committed: `git log -S'zeroize' --all` returns ELEVEN commits.** ⚠ **And the truth is a worse finding.** `REVIEW-005a` (2026-08-17) required *"`#[derive(Zeroize, ZeroizeOnDrop)]`"* on key types and `REVIEW-012-RULING` §4 (2026-08-18) made *"zeroized on drop"* a **condition of the keygen ruling** — and both were honoured where a session wrote the code by hand (`keygen.rs:118-129`, with `zeroize_overwrites_every_byte`). **So the ElGamal key got hand-rolled zeroization and a test, while the XRPL ACCOUNT KEY — the input its derivation takes — silently did not, because a dependency default was switched off in a manifest that no review read for nine days.** What nothing mentions before `REVIEW-024` §9 is `ed25519-dalek`'s `zeroize` **feature**. ⚠ **And the idiom is HARMLESS on the line it was copied from, which is why nobody noticed**: `elliptic-curve-0.13.8` declares `zeroize` as a **mandatory** dependency — no `optional = true`, no feature gate — and `secret_key.rs:318` is a bare `impl<C> ZeroizeOnDrop for SecretKey<C>`. **The same two words have opposite consequences on two adjacent lines, and the difference is invisible from the manifest.** So `SigningKey` and `ExpandedSecretKey` were not wiped on drop while `hazmat.rs:39` promised unconditionally that they were | **`docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.** Enabled; `fast` deliberately left off. ⚠ **Decided on hygiene, NOT on the nonce ruling's threat model** — `REVIEW-024` §9 required that separation and it is what keeps B-19 and B-16 separable: with `zeroize` off, an honest B-16 would have had to wipe expanded secret material by hand, inside a nonce commit. ~~The check is a `ZeroizeOnDrop` **trait bound**, so reverting the manifest line fails to **compile** — E-108's rule inverted, because there the compile failure IS the proof.~~ ⚠ **FALSE, and nobody ran it for a day — E-171.** Reverting the manifest line **compiles**, because `std` already implies the feature. The trait bound is real and `ExpandedSecretKey`/`SigningKey` genuinely are `ZeroizeOnDrop`; what it does **not** do is depend on the word this decision added. E-108's rule inverts for a `Drop` type only if somebody produces the compile failure, and *asserting* one is the same act as asserting a gate works. ⚠ **Accepted by all three `REVIEW-025` legs, and its wording corrected by two**: *"no callable API or wire-format change"* rather than "no API", and *"no new download; expected negligible, NOT MEASURED"* rather than "nothing measurable" — **an unmeasured number is not a number, and this project says so about everyone else's**. The remaining unwiped stack locals are **B-21** | A, executed |
 | E-168 | ⚠ **Round two found that round one's adjudication OVERSTATED ITS OWN FIXES, in the round whose entire lesson is that fixes and descriptions fail separately.** `REVIEW-025c` recorded all eleven findings FIXED; `REVIEW-026` found **four were incomplete** and one remedy had been taken in its weaker form. Every miss is the same shape: **a fix applied to the instance the adjudicator was looking at, rather than to the phrase.** *"The whole ruling in one assertion"* was corrected on the ed25519 test Codex cited and left standing on the identical secp256k1 sentence; the KAT's independence overclaim was fixed in its doc comment and left in **the section banner directly above it — inside the line range the leg named** — and in two more places; the stale *"the draw happens in `Hedge::aux`"* got a note on a *different* occurrence while the one that asserts it was untouched. ⚠ **`CLAUDE.md` already says *tick the leg's list, not your own recollection of it* — and round two DID that, and it still took a grep for the STRING to find these.** A leg's list is line numbers; a corrected sentence is a string, and strings have copies | **`REVIEW-026c-adjudication-b16-fixes-2026-08-27.md`**, from `REVIEW-026a` / `026b` / `026s`. All fixed. **`CLAUDE.md` gains one sentence: tick the leg's list, then GREP FOR THE PHRASE.** ⚠ Two more false-pass modes were found in the same two artifacts as round one — the revert sweep had **no baseline**, so it certified a mutation whenever an expected test was in the failure set *including when that test was already failing for an unrelated reason*; and the gate's `FixedAux` probe wrapped the variant in a method call it did not need, so its row could not say which of three symbols gated it. Both fixed; the sweep now proves the unmodified target green and requires a **newly** failing expected test | A, executed |
 | E-169 | ⚠ **FOUR DOCUMENTS CITED A DEVNET TRANSACTION THAT NO COMMITTED RECEIPT RECORDS.** `CLAIMS.md` E-163, `CLAUDE.md`, `signer/README.md` and the architecture document all named `9356A524…`; `docs/runs/b16-hedged-ed25519-devnet-2026-08-27.json` recorded `5A8CF0B…`. The cause is mundane and is the point: the run was repeated from a clean tree **after** the prose was written, the receipt was overwritten, and **nothing re-read the prose against it**. ⚠ The superseded run also carried `workingTreeDirty: true` — so the sentence in four documents pointed at a run **nobody else could reconstruct**. Found by `REVIEW-026`'s Codex leg. ⚠ **And E-163 separately claimed the signer *"no longer signs pure RFC 8032"*, which is FALSE**: a reported entropy failure deliberately produces byte-identical RFC 8032 and so does the `test-support` vector arm. **The default path is hedged; two named paths are not, and neither is supposed to be** | **Reconciled to the receipt, and the script no longer lets it recur**: `b16-hedged-ed25519-devnet.ts` writes the receipt **only when the gate is satisfied** — it wrote unconditionally *before* the verdict was computed, so a failed run would have overwritten a good receipt with an artifact whose `claim` still asserted success — and it **checks `git`'s exit status**, which it ignored, so a failed `rev-parse` produced an empty commit and a failed `status` a false `dirty=false`. ⚠ **A receipt is only evidence if the prose is checked against it**; nothing gates that today, and it is the cheapest kind of drift this project has |
 | E-170 | ⚠ **A REVIEW LEG GRADED A HIGH DEFECT THAT DOES NOT EXIST, AND ITS EXCERPT OF THE FILE IS WHY — with the complete file in the packet.** `REVIEW-026`'s Gemini leg reported that `revert-sweep.py` *"accumulates mutations across iterations because `restore()` is omitted from the loop body … only called after all 12 reverts have executed"*, and quoted the loop. **`restore()` is the FIRST statement in that loop**, and the leg's own quotation silently omits it. Two more claims in the same report were checked and rejected: that `zero_aux_is_hedged_not_a_fallback` had been *"renamed/superseded"* (it exists and passes, unrenamed), and two `GATED` entries that do not exist. ⚠ **E-160 was an ADJUDICATOR's excerpt bounding a leg. This is a leg excerpting for ITSELF, from a complete file.** The rule survives the change of author: **what you choose to look at is your blind spot** | **All four rejected, with reasons, in `REVIEW-026c` §3** — `CLAUDE.md` requires rejected reviewer claims be recorded so later sessions do not relitigate them. ⚠ **Ninth instance of *a review finding is evidence, not an instruction*, and the third where applying the remedy would have edited code that already did the thing.** ⚠ **The point beneath two of the false premises was still worth taking**: an OR-match over a broad expected list does not say *which* test fired, and `FixedAux`'s probe wrapped a method it did not need. **A wrong diagnosis can sit on top of a real weakness, and discarding the whole report loses it** |
+| E-171 | ⚠⚠ **B-19's PREMISE AND B-19's GATE WERE BOTH FALSE, AND THE THING THAT FOUND IT WAS BUILDING THE GATE B-19 SAID IT HAD.** E-167 said `ed25519-dalek`'s `zeroize` feature *"was OFF, by accident, for nine days"*; the decision said *"reverting the manifest line fails to COMPILE"*. **Neither is true.** The historical line at `16e2e58` — `default-features = false, features = ["std"]` — resolves to **`alloc,std,zeroize`**, because `std = ["alloc", ..]` and `alloc = [.., "zeroize/alloc", ..]` **omits the `?` sigil** that the `serde?/alloc` entry two lines above it carries. `ExpandedSecretKey` and `SigningKey` were wiped on drop the whole time, and removing the word `zeroize` from our manifest **still builds today**. ⚠ **`alloc` is the switch, not `std`** — probed separately. ⚠ **THE SHAPE, AND IT IS THIS PROJECT'S OWN, LANDING ON ITS OWN GATE-BUILDING RULE:** E-165 and E-168 both say *verify a gate by breaking it*, and B-19's gate was **asserted in three documents and never once executed** — the register row, the decision, and a test doc comment all describing a compile failure nobody had produced. ⚠ **Three `REVIEW-025` legs and a `REVIEW-026` round accepted it**, because **reading a manifest is not running one**, and a feature-resolution claim has no falsifier that reading can supply. ⚠⚠ **AND ROUND TWO LOOKED STRAIGHT AT IT.** `REVIEW-026c` finding 10 is *"the B-19 decision gave the feature list as `["std", "zeroize"]` — the manifest has **`hazmat`** too"*. **A leg read that exact list, counted its members, corrected an omission in it, and never asked what `std` pulls in.** There is no stronger demonstration that the question was unaskable from the text: the word that made the whole row false was on the line being corrected. ⚠ **E-167's first draft was ALSO false and P-12's falsifier caught it; the corrected row was false on a different premise, and no falsifier existed for that one.** ⚠ **What survives: B-19 was still worth doing.** An implied feature made explicit is legible, and it is now pinned by a probe rather than by a sentence. ⚠ **What does NOT survive: the nine-day story.** Nothing was unwiped, nothing was at risk, and E-167's *"the truth is a worse finding"* was a worse finding about a thing that had not happened | **`tools/check-zeroize-bounds.py`, `make check-zeroize-bounds`.** Part 1 probes the feature in a scratch crate at four feature sets — `[]` **must fail** (the control), `["std"]`, `["alloc"]` and today's line must all compile. Part 2 reverts each of B-21's three locals and requires the build to break, with a comment-edit control that must not. ⚠ **B-19's own revert is deliberately NOT in the revert list** — it belongs to the probe table, as a thing that compiles. ⚠ **Found while building B-21, which is B-19's continuation**; the gate was written to test B-21 and the B-19 arm was included because the decision claimed it. It reported `STILL BUILDS FALSE` on its first run |
 
 ---
 
@@ -234,14 +235,14 @@ Statuses: `SUPPORTED` (evidence attached) · `PENDING` (asserted, evidence not a
 
 | # | Claim | What it needs |
 |---|---|---|
-| B-21 | **Secret material on the stack is not wiped: the SHA-512 expansion, the nonce mask, and `fresh_aux`'s 32-byte buffer.** B-19 enabled `zeroize`, which gives `SigningKey` and `ExpandedSecretKey` real `Drop` impls — but `Sha512::digest`'s `Output`, the `mask` array and `fresh_aux`'s `b` are plain locals that no `Drop` reaches, and neither does `ed25519-dalek`'s own `impl From<&SecretKey> for ExpandedSecretKey`, which computes a SHA-512 into a `GenericArray` local. Rust may also leave copies behind a move, and the curve arithmetic's temporaries are outside any of this. ⚠ **Confirmed independently by `REVIEW-025`'s Gemini leg**: *"`Output<Sha512>` and raw byte arrays do not implement `ZeroizeOnDrop`"* | **Add `zeroize` as a direct `wconf-signer` dependency and wipe the helper's own locals.** Deliberately deferred from B-19, which was scoped to one manifest line and a check. ⚠ **One instance was NOT deferred and is fixed**: `Sha512::digest(k.to_bytes())` copied the secret **by value** where `as_bytes()` returns a reference — gratuitous rather than structural. ⚠ **P-5 governs what this can ever claim**: an adversary with code execution reads the scalar while it is live, so this narrows a window and removes no channel |
+| B-21 | ~~**Secret material on the stack is not wiped: the SHA-512 expansion, the nonce mask, and `fresh_aux`'s 32-byte buffer.**~~ **BUILT 2026-08-27.** `zeroize` is a direct `wconf-signer` dependency; `sha512_zeroizing` returns a `Zeroizing<[u8; 64]>` and wipes the `Output<Sha512>` it copied out of, `fresh_aux` returns `Option<Zeroizing<[u8; 32]>>`, and `OneShotAux` holds its bytes in a `Zeroizing`. ⚠ **`OneShotAux` was NOT in this row's list and is the longest-lived of the four** — it holds the drawn entropy for the whole of `sign_prehash_with_rng`. Fixed here rather than filed as a fourth item, and said out loud rather than folded in, because a widened scope recorded as the original is how a fix comes to claim more than it did. ⚠ **The wipe goes through `zeroize`'s `impl Zeroize for [Z]`, NOT `GenericArray`'s own** — `generic-array`'s `zeroize` feature is on in this graph only because `k256` pulls it in transitively, and resting a security property on a feature no line of our manifest declares is E-171's mistake repeated | **CLOSED as a build. `make check-zeroize-bounds` is the falsifier**, and it is a COMPILE-time one: `REVIEW-025` rejected a runtime *"is the buffer zero now?"* assertion because reading a dead stack frame is undefined behaviour. ⚠ **P-5 GOVERNS WHAT THIS MAY EVER CLAIM, and the wording has not moved: it narrows a window and removes NO channel.** ⚠ **Three residues are named at `signer/src/xrpl.rs::sha512_zeroizing` and are NOT fixed**: the `Sha512` hasher's own block buffer, which holds the 32-byte secret input — ⚠ **P-12: `grep -rn "zeroize\|Zeroize\|impl.*Drop"` over the vendored sources AND manifests of `sha2 0.10.9`, `digest 0.10.7`, `crypto-common 0.1.6` and `block-buffer 0.10.4` returns ZERO hits, run 2026-08-27, so there is no feature to enable**, **the source of every move** (a Rust move is a bitwise copy that does not run `Drop` on its source), and anything the optimiser spills. A fourth is `ExpandedSecretKey::from_slice`'s own `bytes.try_into()` into an unwiped `[u8; 64]` (`hazmat.rs:108-117`), which is the crate's and unreachable from here |
 | B-20 | ~~**The deterministic signing arm is `pub` in an ordinary release build, and only a doc comment says it is for vectors.**~~ **CLOSED 2026-08-27, with the B-16 build.** `Hedge`, `Hedge::DeterministicForVectors`, `Hedge::FixedAux` and `AccountKey::sign_message_with` are `#[cfg(feature = "test-support")]`, the way `confirm::acknowledgement_for_test` is. ⚠ **The `Fresh` variant was deleted rather than gated**: it had exactly one reference — its own match arm — because `sign_message` calls `fresh_aux` directly, making it a second, unexercised entry to fresh entropy | **CLOSED, with a REAL gate: `tools/check-test-support-gate.ts`** (`make check-test-support`), which compiles a throwaway crate **per probe**, with and without the feature, plus a negative control that must build both ways. ⚠ **Its first form FALSE-PASSED and certified a literal as a gated symbol — E-165.** ⚠ **`make signer-release`'s comment claimed a verification its recipe did not perform** — *"verified by compiling a release binary that references them and watching it fail to resolve"*, above a bare `cargo build --release` — which is `REVIEW-014`'s own shape surviving inside the target named after its fix, for seven days. Corrected |
-| B-19 | ~~**`ed25519-dalek` is configured `default-features = false, features = ["std"]`, so `zeroize` is OFF.**~~ **DECIDED AND APPLIED 2026-08-27 → E-167.** The omission was accidental — one commit, the idiom copied from the `k256` line above, where the same two words are harmless because `elliptic-curve` makes `zeroize` **mandatory** rather than a default feature. ⚠ **`fast` is still off, deliberately**: a speed trade with no security content, and re-enabling it was not that decision | **CLOSED → `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.** Decided on **hygiene, not on the nonce ruling's threat model**, which `REVIEW-024` §9 required and which is what kept it separable from B-16. Accepted by all three `REVIEW-025` legs; two corrected its wording. The check is a `ZeroizeOnDrop` trait bound, so a revert fails to **compile**. ⚠ **The remaining unwiped stack locals — the SHA-512 output, the mask, `fresh_aux`'s buffer — are B-21 and are NOT closed by this** |
+| B-19 | ~~**`ed25519-dalek` is configured `default-features = false, features = ["std"]`, so `zeroize` is OFF.**~~ ⚠⚠ **THAT PREMISE IS FALSE — E-171, 2026-08-27.** `["std"]` resolves to `alloc,std,zeroize`. The row's subject never existed; what B-19 actually did was make an implied feature explicit, which is worth having and is not what it said. **DECIDED AND APPLIED 2026-08-27 → E-167.** The omission was accidental — one commit, the idiom copied from the `k256` line above, where the same two words are harmless because `elliptic-curve` makes `zeroize` **mandatory** rather than a default feature. ⚠ **`fast` is still off, deliberately**: a speed trade with no security content, and re-enabling it was not that decision | **CLOSED → `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.** Decided on **hygiene, not on the nonce ruling's threat model**, which `REVIEW-024` §9 required and which is what kept it separable from B-16. Accepted by all three `REVIEW-025` legs; two corrected its wording. ~~The check is a `ZeroizeOnDrop` trait bound, so a revert fails to **compile**.~~ ⚠ **FALSE → E-171**: the revert compiles, because `std → alloc → "zeroize/alloc"` already enabled the feature. **The decision is still right and is now merely EXPLICIT rather than corrective** — and it was accepted by three `REVIEW-025` legs and a `REVIEW-026` round on a premise none of them ran. ⚠ **The remaining unwiped stack locals — the SHA-512 output, the mask, `fresh_aux`'s buffer — are B-21 and were NOT closed by this.** **B-21 is now BUILT (2026-08-27)** and closed them, plus `OneShotAux`, which this row's list did not name. |
 | B-17 | **Whether the signer should preflight `terFROZEN`, and what exactly it would have to read.** XLS-0096 §10.4.2 item 9 refuses a ConvertBack when *"the account or issuance is frozen"*. The signer neither reads nor checks any freeze state, so it can draw entropy, reserve two identifiers, generate an 816-byte proof, take a human's approval and return a blob rippled will refuse. ⚠ **`terFROZEN` is a `ter`, not a `tec`** — it is **not** applied to the ledger, so **no ciphertext is published** and this is a liveness and honest-error question rather than an F-23 confidentiality one. That is why it is a gap and not a defect | **Raised 2026-08-25 by `REVIEW-021`'s Codex leg (Q1-2), which rated it LOW and explicitly declined to prescribe a remedy** *"without pinning the exact rippled 3.3.0 flag and precedence rules"*. ⚠ **This session declined for the same reason and that is the correct output**: `CLAUDE.md` — *a named gap is a correct output; a substituted source is a corrupted one*. **This repository holds no rippled source**, and the flags involved (`lsfMPTLocked`, individual vs global freeze, and their precedence) would have to be read there, not recalled. **What would settle it:** read `ConfidentialMPTConvertBack.cpp` and the MPT freeze helpers at rippled `3.3.0`, then decide whether a preflight read is worth a fifth ledger call |
 | B-18 | ⚠ **LARGELY CLOSED 2026-08-25 → E-146, E-149, F-27. What remains is narrower and is stated at the end of this row.** rippled accepts them: **28 validated facility transactions** — ⚠ **the facility's own movements**: authorize, Payment, Convert, Send, MergeInbox, ConvertBack. **31** counts everything the program submitted and the ledger applied, adding the two issuance-setup transactions and the fail-hard control's unflagged arm. ⚠ **It was quoted as 27 in six documents until `REVIEW-023`**, because `convertFloat` awaited the Dedicated Account's post-conversion merge and **discarded the `Movement` it returned** — the transaction validated, the book recorded it, and the run record did not. **A count taken from a record that its own producer under-fills is E-141's shape again.** — issuance `0048BEC27991E04E26DA60230B894B7C12E51E7FBC0A537E`, and every party's decrypted `ConfidentialBalanceSpending` equals the book's prediction — dedicated 0, supplier-A 610 (`10+900−300`), supplier-B 10, supplier-C 1410 — with the issuance's **plaintext** `ConfidentialOutstandingAmount` at **2030**, exactly the sum of the three hidden positions. All four registered `HolderEncryptionKey`s are the ruled derivation. `observer-harness --assert-no-r-reuse` PASSED over 14 transactions. ⚠ **STILL OPEN: the run was NOT under B-15's conditions** (E-151), and `run-facility.ts` still does **not** assert all four of §10.5's state changes per movement — it checks the outstanding-amount delta on the float conversion and reconciles decrypted balances, and the per-position verification above was done **after the fact by hand rather than by the driver**. ~~**Whether rippled accepts the facility's transactions at all.** `facility/` is built, type-checked and covered by 81 tests (2026-08-26), and **none of it has been submitted to any ledger**.~~ **Struck 2026-08-25 — it has.** Everything the tests establish is established against **fake nodes this project wrote**: that the code refuses what it says it refuses, that it sets `fail_hard`, that the book's arithmetic is right. What they cannot establish is the thing every earlier milestone established first — that rippled answers `tesSUCCESS`, that the state changes are XLS-0096 §10.5's, and that the confidential balances decrypt to what the book predicts. ⚠ **The specific untested claims**: that the Dedicated Account's single Convert registers a derived `HolderEncryptionKey` and moves the whole float; that a drawdown, a MergeInbox and a repayment round-trip; that retirement in tranches publishes each tranche size (F-24) and moves `sfConfidentialOutstandingAmount` by exactly the amount; and that `tapFailHard` behaves as E-149 reads it | **A loopback rippled that finishes syncing Devnet.** `tools/loopback-node/node.sh start && … wait`, then `bun facility/run-facility.ts --auto-confirm`. ⚠ **Not a remote endpoint** — B-15's answer is that the public endpoint is not sufficient for the facility, and E-148 is what Option A costs. The node from this session was left running; if it reached `full`, the run is one command |
 | B-15 | ⚠ **AMENDED AGAIN 2026-08-25 → E-151: the named risk acceptance is EXTENDED to the facility's Devnet demo, because Option A turned out not to be payable on this hardware (E-148).** Part C — `tapFailHard` on whatever submits — is unchanged and in force. The loopback requirement is **not retired**; it is unmet, by name, with a printed disclosure and a stamp on every run record. ~~**Whether one trusted endpoint is an acceptable ledger source for a signer, given F-23.**~~ **RULED 2026-08-20 → E-110.** One endpoint stands for this Devnet research artifact **as a named risk acceptance**, with a mandatory disclosure; loopback is the clean answer; corroboration across one operator's hosts is not built and both legs called it near-theatre. ⚠ **A GATE ON STEP 7**: the facility requires loopback, corroboration across independently operated nodes, or a submitter that sets `tapFailHard` | **RESOLVED → `REVIEW-019-RULING-ledger-source-2026-08-20.md`.** The ruling's premise is that `ledger_entry` returns no Merkle proof (verified at rippled `3.3.0`); **if that changes, revisit**. ⚠ ~~**The step-7 gate is STILL SHUT as of 2026-08-25**~~ **ANSWERED 2026-08-25 by the project owner: loopback for the facility, plus `tapFailHard` set by whatever submits, which is NOT the signer.** ⚠ **The answer is not one of the ruling's three options** — it is A plus a reading of C that puts the flag outside the signer — and **it had no adversarial review**. The residual stands: **nothing forces a separate submitter to set the flag**, so that half is a convention rather than a property. Loopback is the half that removes the risk at its source. ⚠ **Earlier state, retained:**, and the three options are costed and handed over in `docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md` — **not decided**, because one of them adds a submitter and *"the signer does not submit"* is a trust-boundary claim in three places. ⚠ **`ConfidentialMPTConvertBack` being built (E-131) is not this gate being passed**: it is a transaction type, built under exactly the risk acceptance the ruling allows for the artifact |
 | B-16 | ~~**The ed25519 signing nonce — B-14's other half, and the LIVE path.**~~ **RULED 2026-08-27 → E-158. BUILT AND EXECUTED the same day → E-163.** ~~⚠ **RULED AND NOT IMPLEMENTED**, and `signer/src/xrpl.rs` still signs ed25519 with pure RFC 8032 today. `ed25519_is_still_deterministic_and_that_is_a_tracked_gap` **still passes and must keep passing until the build lands**~~ — **struck: the build landed, and that test was replaced rather than deleted, as its own panic message instructed.** All eight of `REVIEW-024` §6's gates have run, ending in a validated Devnet transaction on the default path with `SigningPubKey` decoded out of the submitted blob | **CLOSED as a build → E-163**, with round one of its rotation adjudicated in `REVIEW-025c` (eleven findings, all fixed → E-166). **§7 item 4 — the two-round rotation — is COMPLETE**: `REVIEW-025c` round one (eleven findings, none the construction) and `REVIEW-026c` round two (E-168). ⚠ **Round two's finding was that round one's adjudication overstated its own fixes**, which is precisely what a second round is for. **All four of `REVIEW-024` §7's conditions are now met.** ⚠ **What remains open is named and is not this gate**: B-21's unwiped stack locals, the mask having no third-party control, and rippled's verification path being unreadable from this checkout |
-| B-14 | ~~**Where the transaction's own ECDSA signing nonce `k` comes from — a fifth randomness site, and no packet has covered it.**~~ **RULED 2026-08-20 → E-109.** Two independent legs, both ruling that the issue #1 ruling extends: `k` is **hedged** RFC 6979 on the default path, deterministic only on a test arm. ~~⚠ **Resolved for secp256k1 ONLY — the ed25519 half is B-16**, and ed25519 is the live path~~ **BOTH HALVES ARE NOW RULED — B-16 on 2026-08-27 (E-158).** ~~⚠ **Ruled is not implemented**: secp256k1 is built and executed, ed25519 is ruled and not built~~ **BOTH HALVES ARE BUILT AND EXECUTED as of 2026-08-27 (E-163).** Codex's B-14 instruction — *"Do not mark B-14 closed by fixing only secp256k1"* — is satisfied rather than pending | **RESOLVED → `REVIEW-018-RULING-ecdsa-nonce-2026-08-20.md`, implemented and executed on Devnet; the ed25519 half is `REVIEW-024`, built and executed 2026-08-27 → E-163.** ⚠ **Both arms now go through ONE private helper** — `AccountKey::sign_with_aux`, taking `Option<[u8; 32]>` — which is `REVIEW-024` §7 item 1 and makes the single-implementation property **structural** rather than asserted by a test that could not see it (E-161) |
+| B-14 | ~~**Where the transaction's own ECDSA signing nonce `k` comes from — a fifth randomness site, and no packet has covered it.**~~ **RULED 2026-08-20 → E-109.** Two independent legs, both ruling that the issue #1 ruling extends: `k` is **hedged** RFC 6979 on the default path, deterministic only on a test arm. ~~⚠ **Resolved for secp256k1 ONLY — the ed25519 half is B-16**, and ed25519 is the live path~~ **BOTH HALVES ARE NOW RULED — B-16 on 2026-08-27 (E-158).** ~~⚠ **Ruled is not implemented**: secp256k1 is built and executed, ed25519 is ruled and not built~~ **BOTH HALVES ARE BUILT AND EXECUTED as of 2026-08-27 (E-163).** Codex's B-14 instruction — *"Do not mark B-14 closed by fixing only secp256k1"* — is satisfied rather than pending | **RESOLVED → `REVIEW-018-RULING-ecdsa-nonce-2026-08-20.md`, implemented and executed on Devnet; the ed25519 half is `REVIEW-024`, built and executed 2026-08-27 → E-163.** ⚠ **Both arms now go through ONE private helper** — `AccountKey::sign_with_aux`, taking `Option<Zeroizing<[u8; 32]>>` since B-21 — which is `REVIEW-024` §7 item 1 and makes the single-implementation property **structural** rather than asserted by a test that could not see it (E-161) |
 | B-12 | ~~Whether XLS-0096 anywhere states that the ElGamal encryption randomness `r` must not be reused across transactions~~ | **RESOLVED 2026-08-18 → E-67.** The spec text was obtained — it was never unobtainable, only unheld — and it is **silent**. That is the branch B-12 itself named as a specification gap, so U-37's stronger form is unblocked on this axis. The standing rule still applies: nothing moves out of `Observed` in a coding session |
 | B-13 | **Anything about what the Trail of Bits May 2026 revision audit says**, beyond the two findings upstream cites by identifier | **NOT OBTAINABLE, and recorded rather than backfilled (issue #5).** `trailofbits/publications/reviews` is the primary source and it is **current** — 448 reports including sixteen dated 2026-05 to 2026-08 — and it holds **exactly one** Ripple report, the April 2026 one already on disk. No May revision under any name; a web search returned only secondary coverage of the April report. **The gap is now bounded rather than unknown.** Upstream cites two of its findings in source: **TOB-RIPCTXR-1** (`secp256k1_mpt.h:42–43`) — TOB-RIPCTX-1/-4 decryption timing side channels *reintroduced*, mitigated by fixed-iteration search; and **TOB-RIPCTXR-10** (`mpt_internal.h:188,199–201`) — Informational, the unprefixed nonce-KDF IKM layout as a brittle-API concern, *"not a present-day exploit"*. **Neither is keygen and neither is randomness sourcing**, so on present evidence this document does not gate ADR-0001 §(e) — a statement about the two findings we can see, not about the report's full contents. **Never cite RIPCTXR identifiers as our own reading**; attribute them to upstream's comment. Same discipline as B-6 |
 | B-1 | ~~Bulletproof proving ~44.8 ms, verification ~22.6 ms~~ | **RESOLVED 2026-08-16 → E-24.** The spec's §14.2 figures remain unusable under P-8 and are still never to be quoted. Replaced by measured numbers with full hardware and parameters |
diff --git a/CLAUDE.md b/CLAUDE.md
index eeb58c9..92eed26 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -30,6 +30,13 @@ The spec exists, the architecture has passed adversarial review, and TASK ZERO i
 
 **Status 2026-08-27 — B-16 is RULED, BUILT, EXECUTED and REVIEWED TWICE. `REVIEW-024` ruled it; `REVIEW-025` found eleven things wrong with the build, none of them the construction; `REVIEW-026` found that `REVIEW-025c` had OVERSTATED ITS OWN FIXES (E-168). All four of §7's conditions are met.** `REVIEW-024`, three independent legs (Gemini 9.0, Codex 8, self leg 7.5), **all ruling Option B**: the issue #1 ruling extends to the ed25519 signing nonce and the residual is **not** accepted. The RFC 8032 nonce prefix is hedged — 32 fresh CSPRNG bytes, tagged-hashed under a fixed DST and **XORed** over it, the same idiom site 1 uses — through `ed25519_dalek::hazmat::raw_sign` with the scalar, the public key, the challenge transcript and the signature equation untouched. **B-14 is now closed on both halves.**
 
+**Status 2026-08-27, later the same day — B-21 is BUILT, and building it proved B-19 WRONG (E-171).** `zeroize` is a direct `wconf-signer` dependency; `sha512_zeroizing`, `fresh_aux` and `OneShotAux` carry `Zeroizing`. 267 tests, three green runs, `make check-zeroize-bounds` is the falsifier. ⚠ **NOT REVIEWED — that is the open item, and its own gate was written by the session that wrote the code.**
+
+**Two things B-21 established which a session will otherwise get wrong:**
+
+- ⚠ **`ed25519-dalek`'s `zeroize` FEATURE WAS NEVER OFF, and three documents said it was.** `std = ["alloc", ..]`, and `alloc` lists **`"zeroize/alloc"` without the `?` sigil** that `serde?/alloc` two lines above it carries — so the historical `features = ["std"]` already resolved to `alloc,std,zeroize`. **E-167's nine-day story describes something that did not happen**, and B-19's falsifier — *"reverting the manifest line fails to COMPILE"* — is **false**: it compiles. ⚠ **A CARGO FEATURE AND AN OPTIONAL DEPENDENCY CAN SHARE A NAME, and `dep/feat` without `?` enables the feature.** `cargo tree -f '{p} {f}'` is what shows it; reading the manifest is not. ⚠ **Three `REVIEW-025` legs and a `REVIEW-026` round accepted it — and round two corrected that exact feature list** (finding 10: *"the manifest has `hazmat` too"*) **without asking what `std` pulls in.** The word that made the row false was on the line being corrected.
+- ⚠ **A GATE NOBODY RAN IS A CLAIM, and this is the purest instance the project has.** `CLAIMS.md` E-165 and E-168 already said *verify a gate by breaking it* — about two gates that **existed**. B-19's gate had never been built, only described, in the register row, the decision §5 and a test's doc comment. It was found only because B-21 needed a real one and included the B-19 arm **on the strength of that sentence**. ⚠ **The new gate carries a control in BOTH directions** — an empty feature set that must fail, a comment edit that must still build — because `check-test-support-gate` and `revert-sweep.py` each false-passed before they worked (E-165).
+
 **Four things the BUILD established which a session will otherwise get wrong:**
 
 - ⚠ **A REVERT PASSED, and reading the test would never have found it (E-164).** `REVIEW-024` §6 item 3 — *a successful all-zero draw stays hedged* — had a test named for it, and reverting `fresh_aux` to treat a zero draw as an omission **left all 263 tests green**. The test drove `Hedge::FixedAux([0u8; 32])`, which enters one function *after* the decision is made. **Third instance of one failure mode in this file**: `aux_is_exactly_one_field_of_entropy`, then `one_implementation_not_two` (E-161), then this. **A test named for a property, one layer away from where the property breaks.**
diff --git a/Makefile b/Makefile
index 7b17068..a64be47 100644
--- a/Makefile
+++ b/Makefile
@@ -1,4 +1,4 @@
-.PHONY: sync-personas check-amendments check-tables rebuild-env vendor-verify vendor-build signer signer-test check-test-support signer-test-devnet ledger-read signer-run signer-release xrpl-vectors step3 step3-clean facility-test typecheck check-loopback check-blinding check-personas node-start node-wait node-status facility
+.PHONY: sync-personas check-amendments check-tables rebuild-env vendor-verify vendor-build signer signer-test check-test-support check-zeroize-bounds signer-test-devnet ledger-read signer-run signer-release xrpl-vectors step3 step3-clean facility-test typecheck check-loopback check-blinding check-personas node-start node-wait node-status facility
 
 # Part C delta: .claude/agents/ is generated from docs/personas/.
 # Regenerate whenever a persona changes or the two will drift.
@@ -97,6 +97,25 @@ signer-release:
 check-test-support:
 	@bun run tools/check-test-support-gate.ts
 
+# ⚠ **This gate found that B-19's own claim was FALSE (CLAIMS.md E-171).**
+# E-167 said `ed25519-dalek`'s `zeroize` feature *"was OFF, by accident, for nine
+# days"* and the decision said reverting the manifest line *"fails to COMPILE"*.
+# Neither is true: `std` implies `alloc`, and `alloc` lists `"zeroize/alloc"`
+# without the `?` sigil, so the historical line already resolved to
+# `alloc,std,zeroize`. Three REVIEW-025 legs and a REVIEW-026 round accepted the
+# claim, because reading a manifest is not running one.
+#
+# Part 1 probes the feature in a scratch crate; part 2 reverts each of the
+# signer's secret locals to a bare array and requires the build to break. Both
+# parts carry a control in the OPPOSITE direction — an empty feature set that
+# must fail, a comment edit that must still build — because a gate without one
+# is the false pass it exists to catch (E-165, E-168).
+#
+# ⚠ It says these types wipe on drop. It does NOT say the secret is
+# unrecoverable; see `signer/src/xrpl.rs::sha512_zeroizing` and P-5.
+check-zeroize-bounds:
+	@python3 tools/check-zeroize-bounds.py
+
 # Regenerating these BLESSES whatever the encoder currently does. Run without
 # --write to check for drift; that is what CI-shaped use wants.
 xrpl-vectors:
diff --git a/docs/NEXT-SESSION-PROMPT.md b/docs/NEXT-SESSION-PROMPT.md
index f3d73c9..55d12fe 100644
--- a/docs/NEXT-SESSION-PROMPT.md
+++ b/docs/NEXT-SESSION-PROMPT.md
@@ -2,17 +2,54 @@
 
 ## WHERE THIS LEFT OFF
 
+**B-21 IS BUILT, AND BUILDING IT PROVED B-19 WRONG.** `zeroize` is a direct
+signer dependency; `sha512_zeroizing`, `fresh_aux` and `OneShotAux` all carry
+`Zeroizing`. **267 tests, three consecutive green runs. NOT REVIEWED — that is
+the open item.**
+
+⚠⚠ **THE HEADLINE IS E-171, AND IT IS A FINDING AGAINST THIS PROJECT'S OWN LAST
+SESSION.** `ed25519-dalek`'s `zeroize` feature **was never off**. `std` implies
+`alloc`, and `alloc` lists `"zeroize/alloc"` **without the `?` sigil** that
+`serde?/alloc` two lines above it carries, so the historical line
+`features = ["std"]` already resolved to `alloc,std,zeroize`. **E-167's nine-day
+story describes something that did not happen**, and B-19's stated falsifier —
+*"reverting the manifest line fails to COMPILE"* — is **false**: it compiles.
+⚠ **Three `REVIEW-025` legs and a `REVIEW-026` round accepted it, and round two
+corrected that exact feature list** (finding 10: *"the manifest has `hazmat`
+too"*) **while never asking what `std` pulls in.** The word that made the row
+false was on the line being corrected.
+
 **B-16 is RULED, BUILT, EXECUTED and REVIEWED TWICE.** `signer/src/xrpl.rs`
 hedges the ed25519 nonce prefix on the default path. All eight of `REVIEW-024`
-§6's execution gates and all four of §7's conditions are met. **B-14, B-19 and
-B-20 are closed; B-21 is new and open.**
+§6's execution gates and all four of §7's conditions are met. **B-14, B-19, B-20
+and B-21 are closed.**
 
 ⚠ **Do not re-open the construction.** Six independent leg-readings across two
 rounds found **not one defect in it**. Everything that went wrong in this
 session's reviews — eleven findings in round one, eighteen in round two — was
 **evidence and prose**.
 
-## ⚠ THE THREE THINGS THIS SESSION LEARNED THAT ARE NOT IN THE CODE
+## ⚠ THE THING THE B-21 SESSION LEARNED
+
+**A GATE THAT WAS NEVER RUN IS A CLAIM, AND THIS PROJECT HAD THREE DOCUMENTS
+DESCRIBING ONE.** B-19's compile-failure falsifier was written into `CLAIMS.md`
+E-167, into the decision document §5, and into a test's doc comment — and no
+harness had ever removed the feature and watched a compiler. It was found only
+because **B-21 needed a real gate and included the B-19 arm on the strength of
+that sentence**; the gate reported `STILL BUILDS FALSE` on its first run.
+
+⚠ **The previous session's own lesson 2 said "verify a gate by breaking it, in
+every direction it claims to detect."** It was written about two gates that
+*existed*. The one that had never been built was the one that was wrong.
+`make check-zeroize-bounds` is that gate now, and it carries a control in **both**
+directions: an empty feature set that must FAIL, and a comment edit that must
+still BUILD.
+
+⚠ **Reading a manifest is not running one.** A feature-resolution claim has no
+falsifier that reading can supply — which is why three legs and two rounds passed
+over it.
+
+## ⚠ THE THREE THINGS THE B-16 SESSION LEARNED THAT ARE NOT IN THE CODE
 
 1. **Tick the leg's list, then GREP FOR THE PHRASE.** `CLAUDE.md` already said
    the first half. Round two did it correctly and **still missed four sites**,
@@ -39,6 +76,7 @@ pwd                           # gates run from the wrong directory report nonsen
 tools/rebuild-env.sh          # ~60s, idempotent — CHECK it restored /tmp/wconf/state.json
 bun run tools/check-amendments.ts
 make check-tables check-negative-claims check-personas check-blinding check-test-support
+make check-zeroize-bounds     # ~2 min, compiles a lot; NEW, and it is what found E-171
 ```
 
 ⚠ `check-test-support` is **new this session**. It compiles a scratch crate per
@@ -49,13 +87,20 @@ updated.
 
 ## WHAT TO DO NEXT — pick one, they are independent
 
-1. **B-21 — wipe the signing helper's stack locals.** `Sha512::digest`'s output,
-   the nonce mask, and `fresh_aux`'s buffer are unwiped. B-19 enabled `zeroize`
-   for the *types*; these are plain locals. Both `REVIEW-025` legs confirmed the
-   residue. ⚠ **P-5 governs what it can ever claim**: an adversary with code
-   execution reads the scalar while it is live. This narrows a window and removes
-   no channel. Cost: `zeroize` as a direct dependency and a few `Zeroizing<>`
-   wrappers.
+1. **REVIEW B-21 AND E-171 — the only item created by the last session, and the
+   one it cannot do itself.** B-21 is built and **has had no leg**. Two things
+   want an adversarial reading, and they are different in kind:
+   **(a)** the `Zeroizing` change itself — cheap, mechanical, and its falsifier
+   (`make check-zeroize-bounds`) was written by the same session that wrote the
+   code, which is the arrangement `REVIEW-025` §7 exists to distrust;
+   **(b)** ⚠ **E-171's correction of B-19**, which is a finding this session made
+   against the previous session's work **using a gate it built for a different
+   purpose**. A leg should re-derive the feature resolution independently rather
+   than reading this repository's account of it — the probe is four lines and
+   `cargo tree -f '{p} {f}'` settles it.
+   ⚠ **Packet rule, earned twice (E-160, E-170): supply `ed25519-dalek`'s
+   `Cargo.toml` IN FULL.** The `alloc` feature list is the whole subject and an
+   excerpt of it is what produced the error in the first place.
 2. **Issue #10 — the liftable keygen-derivation document.** Ruled Option 3.
    Obligation 2 is discharged (E-159). **Two remain**: the document, which must
    **not paraphrase** `REVIEW-012-RULING-keygen-2026-08-18.md` §2 — lift it or
diff --git a/docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md b/docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md
index d59f1e8..6aef1ca 100644
--- a/docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md
+++ b/docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md
@@ -3,10 +3,35 @@
 **Date:** 2026-08-27. **Decided by:** the coding session, as adjudicator.
 **Status:** DECIDED — **enable it.** Applied in the same session.
 
+⚠⚠ **CORRECTED AGAIN 2026-08-27, AND THIS ONE IS THE PREMISE, NOT THE WORDING —
+`CLAIMS.md` E-171. THE FEATURE WAS NEVER OFF.**
+
+`ed25519-dalek`'s `std` feature implies `alloc`, and `alloc` lists
+`"zeroize/alloc"` **without the `?` sigil** that the `serde?/alloc` entry two
+lines above it carries. The historical line at `16e2e58` —
+`default-features = false, features = ["std"]` — therefore resolved to
+**`alloc,std,zeroize`**. `ExpandedSecretKey` and `SigningKey` were wiped on drop
+for the whole of the nine days §2 is about, and **removing the word `zeroize`
+from this manifest still builds today**, which §5 says is impossible.
+
+**What survives:** enabling it explicitly is worth doing. An implied feature is
+one upstream refactor away from vanishing, and it is now pinned by a probe
+instead of by a sentence. **What does not survive:** §1's and §2's account of a
+consequence, and §5's falsifier.
+
+⚠ **This was accepted by three `REVIEW-025` legs and a `REVIEW-026` round.** None
+of them ran it, and neither did the session that wrote it — **reading a manifest
+is not running one**, and a feature-resolution claim has no falsifier that
+reading can supply. `tools/check-zeroize-bounds.py` is that falsifier now; it
+exists because **B-21** needed one and the B-19 arm was included on the strength
+of the sentence in §5. It reported `STILL BUILDS FALSE` on its first run.
+
 ⚠ **Corrected 2026-08-27 after `REVIEW-025` round one.** Both external legs
 accepted B-19 and both corrected its wording; the corrections are marked ⚠ below.
 It is no longer true that this decision has had no leg — it has had two, on the
-narrow question, inside the B-16 packet.
+narrow question, inside the B-16 packet. ⚠ **Two legs and a round accepted a
+false premise, which is what E-171 is about**: a leg checks what the packet
+makes checkable.
 
 It is a dependency hygiene change, not a cryptographic design change: it alters
 no construction, no byte on the wire, no test vector, and ⚠ **no `wconf-signer`
@@ -168,12 +193,29 @@ honest B-16 implementation would have to wipe that material by hand — which is
 
 ## 5. The check that it took effect
 
-A manifest edit is a claim about a build, so it gets a test that fails if the
-claim is false. `signer/tests/hedged_signing.rs::ed25519_secret_types_implement_zeroize_on_drop`
-asserts `ExpandedSecretKey: ZeroizeOnDrop` and `SigningKey: ZeroizeOnDrop` —
-**trait bounds that do not exist without the feature**, so the test fails to
+⚠⚠ **THIS SECTION IS WHERE E-171 LIVES. Its last clause is FALSE and was never
+executed.**
+
+`signer/tests/hedged_signing.rs::ed25519_secret_types_implement_zeroize_on_drop`
+asserts `ExpandedSecretKey: ZeroizeOnDrop` and `SigningKey: ZeroizeOnDrop`. That
+much is **true and worth having**: the bounds are real, the impls are real, and
+the test passes.
+
+~~**trait bounds that do not exist without the feature**, so the test fails to
 *compile* if the manifest line is reverted, which is the strongest available
-falsifier for a `cfg`-gated impl.
+falsifier for a `cfg`-gated impl.~~ ⚠ **The bounds do not depend on the word this
+decision added.** Reverting the manifest line **compiles**, because `std` already
+implies the feature. So this test is a check that the types wipe — which is the
+property anyone actually cares about — and **not** a check on the edit. A test
+that cannot see the change it was written for is this repository's most frequent
+defect (E-161, E-164); this is that shape at the manifest layer.
+
+**What checks it now:** `tools/check-zeroize-bounds.py` part 1, which builds a
+scratch crate at four feature sets and requires `[]` to **fail** — without that
+control, "it compiles" establishes nothing.
+
+A manifest edit is a claim about a build, so it gets a test that fails if the
+claim is false. ⚠ **It got one that could not**, for a day.
 
 ⚠ **A runtime "is the buffer zero?" assertion was considered and rejected**: it
 would read freed stack memory, which is undefined behaviour, and it would pass or
@@ -188,4 +230,4 @@ the proof, because the bound is what the feature adds.
 | **Leave it off, document the gap** | The gap is a false sentence in the dependency's own doc plus an unwiped secret, at a cost of no new dependency and writes on drop that were not measured. ⚠ This said *"at a cost of zero"*, which §3 item 3 had already been corrected for and this row had not (`REVIEW-026`). Documenting is what you do when a fix is expensive. |
 | **Enable `default-features = true`** | Sweeps `fast` in with it. Two changes, one line, one of them undiscussed. |
 | **Hand-roll wiping in the B-16 helper** | `zeroize`'s job done worse, and it welds B-19's justification to B-16's. `REVIEW-024` §9 finding 3 forbids exactly that. |
-| **Add `zeroize` as a direct signer dependency and wipe the helper's locals too** | ⚠ **Not rejected on merit — deferred as out of scope.** It is a real gap (§4) and it is more than "one manifest line". Filed as **B-21**, and `REVIEW-025`'s Gemini leg independently confirmed the residue is real: `Output<Sha512>` and raw byte arrays implement no `Drop`. ⚠ **One instance was NOT deferred** — `Sha512::digest(k.to_bytes())` copied the secret by value where `as_bytes()` returns a reference, which was gratuitous rather than structural, and is fixed. |
+| **Add `zeroize` as a direct signer dependency and wipe the helper's locals too** | ⚠ **DONE 2026-08-27 — B-21 is built.** `sha512_zeroizing`, `fresh_aux` and `OneShotAux` all carry `Zeroizing`, checked by `make check-zeroize-bounds` part 2. **Building it is what found E-171.** Originally: ⚠ **Not rejected on merit — deferred as out of scope.** It is a real gap (§4) and it is more than "one manifest line". Filed as **B-21**, and `REVIEW-025`'s Gemini leg independently confirmed the residue is real: `Output<Sha512>` and raw byte arrays implement no `Drop`. ⚠ **One instance was NOT deferred** — `Sha512::digest(k.to_bytes())` copied the secret by value where `as_bytes()` returns a reference, which was gratuitous rather than structural, and is fixed. |
diff --git a/signer/Cargo.toml b/signer/Cargo.toml
index 0e417a6..ae16341 100644
--- a/signer/Cargo.toml
+++ b/signer/Cargo.toml
@@ -33,6 +33,23 @@ ripemd = "0.1"
 # security content, and re-enabling it is not that decision.
 # `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.
 ed25519-dalek = { version = "2", default-features = false, features = ["std", "hazmat", "zeroize"] }
+# `zeroize` as a DIRECT dependency — **B-21**, 2026-08-27. B-19 turned the
+# `ed25519-dalek` feature on, which gives `SigningKey` and `ExpandedSecretKey`
+# real `Drop` impls (`hazmat.rs:67-76`, verified at source). That reaches the
+# crate's *types* and nothing else: the SHA-512 expansion this signer computes
+# itself, the nonce mask, the auxiliary entropy buffer and the ECDSA aux RNG are
+# plain locals in `xrpl.rs` that no `Drop` touches. Both `REVIEW-025` legs
+# confirmed the residue independently.
+#
+# ⚠ **`default-features = false`** — the default is `alloc`, and `Zeroizing` is a
+# `core` type. Nothing here zeroizes a heap collection.
+#
+# ⚠ **What this buys is bounded and P-5 governs the claim**: it narrows the
+# window in which secret bytes sit in a stack frame that is later reused. It
+# removes **no channel** — an adversary with code execution reads the scalar
+# while it is live, Rust leaves the source of a move unwiped, and the curve
+# arithmetic's temporaries are outside all of it.
+zeroize = { version = "1", default-features = false }
 ureq = { version = "3.4.0", default-features = false, features = ["rustls"] }
 
 [features]
@@ -50,12 +67,15 @@ test-support = []
 # Self dev-dependency: enables `test-support` for the test targets only.
 [dev-dependencies]
 sha2 = "0.10"
-# Test-only, for exactly one assertion: `hedged_signing.rs`'s
-# `ed25519_secret_types_implement_zeroize_on_drop` names the `ZeroizeOnDrop` bound
-# so that reverting B-19's manifest line fails to COMPILE. The signer itself does
-# not depend on `zeroize` — see that decision's §6, which files wiping the
-# helper's own stack locals as B-21 rather than doing it here.
-zeroize = { version = "1", default-features = false }
+# ⚠ **The `zeroize` dev-dependency is GONE and that is not an omission.** It was
+# here for exactly one assertion — `hedged_signing.rs`'s
+# `ed25519_secret_types_implement_zeroize_on_drop`, which names the
+# `ZeroizeOnDrop` bound so reverting B-19's manifest line fails to COMPILE — and
+# its comment said *"the signer itself does not depend on `zeroize`"*. **B-21
+# made that false**, and a `[dependencies]` entry is already on the test targets'
+# extern prelude, so keeping both would have been a duplicate carrying a stale
+# reason. `CLAIMS.md`'s twenty-two-instance lesson, caught by grepping for what
+# this commit contradicts.
 wconf-signer = { path = ".", features = ["test-support"] }
 
 [profile.release]
diff --git a/signer/src/xrpl.rs b/signer/src/xrpl.rs
index 999d4a7..e1c45f8 100644
--- a/signer/src/xrpl.rs
+++ b/signer/src/xrpl.rs
@@ -100,8 +100,10 @@
 //! crate's warning is really about.
 //!
 //! ⚠ **One private helper, one varied input — and that is now STRUCTURAL.**
-//! [`AccountKey::sign_with_aux`] takes `Option<[u8; 32]>` and is the only place
-//! either algorithm signs. `REVIEW-024` §4d: `one_implementation_not_two`
+//! [`AccountKey::sign_with_aux`] takes `Option<Zeroizing<[u8; 32]>>` and is the
+//! only place either algorithm signs. ⚠ It read `Option<[u8; 32]>` until B-21
+//! wrapped the auxiliary entropy; the property is the *one helper*, not the
+//! parameter's spelling, but a doc naming a type has to name the type. `REVIEW-024` §4d: `one_implementation_not_two`
 //! asserted a property no black-box test can see, because two separately written
 //! correct signers pass every assertion it made.
 
@@ -111,6 +113,7 @@ use k256::ecdsa::{
 };
 use ripemd::Ripemd160;
 use sha2::{Digest, Sha256, Sha512};
+use zeroize::{Zeroize, Zeroizing};
 
 /// XRPL's base58 alphabet. Note the absent `0`, `O`, `I` and `l`.
 pub const ALPHABET: &[u8] = b"rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
@@ -184,6 +187,53 @@ pub fn sha512half(data: &[u8]) -> [u8; 32] {
     out
 }
 
+/// SHA-512 into a buffer that wipes itself, leaving no unwiped digest behind.
+///
+/// **`CLAIMS.md` B-21.** `Sha512::digest(..)` returns an `Output<Sha512>` — a
+/// `GenericArray` that implements no `Drop` — so over secret input it leaves 64
+/// bytes in a stack frame that the next call reuses. B-19 gave `SigningKey` and
+/// `ExpandedSecretKey` real `Drop` impls (`hazmat.rs:67-76`, read at source);
+/// it reached the crate's *types* and nothing this signer hashes itself.
+///
+/// The `Output` is copied out and then **explicitly zeroized**, through
+/// `zeroize`'s `impl Zeroize for [Z]` rather than `GenericArray`'s own. That is
+/// deliberate: `generic-array`'s `zeroize` feature is on in this graph, and
+/// `cargo tree -e features -i generic-array` (2026-08-27) attributes it to
+/// **`elliptic-curve v0.13.8`** — the `k256` branch, not ours. Resting a
+/// security property on a feature **no line of our manifest declares** is
+/// precisely E-171's mistake, where `std` silently implied `zeroize` and three
+/// documents described a consequence that never happened. Wiping through a
+/// slice needs no feature at all.
+///
+/// ⚠ **What this does NOT wipe, stated because the alternative is a false
+/// guarantee:**
+///
+/// 1. The `Sha512` **hasher's own block buffer**, which holds the last partial
+///    block of input — for a 32-byte secret, all of it. ⚠ **P-12, so the search
+///    is recorded rather than the absence asserted:** `grep -rn
+///    "zeroize\|Zeroize\|impl.*Drop"` over the vendored sources of
+///    `sha2 0.10.9`, `digest 0.10.7`, `crypto-common 0.1.6` and
+///    `block-buffer 0.10.4` — sources **and** manifests — returns **zero hits**
+///    (run 2026-08-27). There is no feature to enable and nothing here can reach
+///    inside `CoreWrapper`.
+/// 2. The **source of a move**. Rust moves are bitwise copies and do not run
+///    `Drop` on the source, so returning this buffer leaves a copy behind.
+/// 3. Anything the optimiser spills to a second stack slot or a register.
+///
+/// So this narrows a window and **removes no channel** — P-5, and the same
+/// sentence `CLAIMS.md` B-21 carries.
+fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
+    let mut hasher = Sha512::new();
+    for part in parts {
+        hasher.update(part);
+    }
+    let mut digest = hasher.finalize();
+    let mut out = Zeroizing::new([0u8; 64]);
+    out.copy_from_slice(digest.as_slice());
+    digest.as_mut_slice().zeroize();
+    out
+}
+
 /// `RIPEMD160(SHA256(x))` — the AccountID of a public key.
 pub fn account_id_of(pubkey: &[u8; 33]) -> [u8; 20] {
     let sha = Sha256::digest(pubkey);
@@ -470,7 +520,13 @@ impl AccountKey {
     #[doc(hidden)]
     #[cfg(feature = "test-support")]
     pub fn sign_message_with(&self, hedge: Hedge, message: &[u8]) -> R<Vec<u8>> {
-        self.sign_with_aux(hedge.aux(), message)
+        // ⚠ **The wrapper goes on HERE, not inside `Hedge`.** `Hedge` is `Copy`
+        // and its bytes are a test's own literal rather than drawn entropy, so
+        // wrapping the enum would buy nothing and cost its `Copy`. What matters
+        // is that everything reaching `sign_with_aux` wipes on drop, and B-21's
+        // subject is the signing helper. `Hedge::aux`'s own returned copy is
+        // **not** covered and is named as such at that function.
+        self.sign_with_aux(hedge.aux().map(Zeroizing::new), message)
     }
 
     /// **The one signing implementation.** Both entry points call this and
@@ -491,7 +547,12 @@ impl AccountKey {
     /// caller's side: the deterministic vector arm asks for it, and a *reported*
     /// entropy failure degrades to it. ⚠ **`Some([0u8; 32])` is neither** — it
     /// is a successful draw and it is hedged.
-    fn sign_with_aux(&self, aux: Option<[u8; 32]>, message: &[u8]) -> R<Vec<u8>> {
+    ///
+    /// ⚠ **`Zeroizing` is B-21 and changes no construction.** The bytes inside
+    /// are the same bytes; the wrapper only gives them a `Drop`. Every KAT and
+    /// every cross-implementation vector in `tests/` is unchanged and green,
+    /// which is what says the refactor was a refactor.
+    fn sign_with_aux(&self, aux: Option<Zeroizing<[u8; 32]>>, message: &[u8]) -> R<Vec<u8>> {
         match &self.inner {
             Inner::Secp256k1(k) => {
                 let prehash = sha512half(message);
@@ -530,9 +591,17 @@ impl AccountKey {
                 // **by value** (`signing.rs:114`) and that copy is a stack local
                 // no `Drop` reaches — in the same commit that enabled `zeroize`
                 // so secret material would be wiped. `REVIEW-025`, self leg.
-                // `h` and `mask` below are the same class and are **B-21**.
-                let h = Sha512::digest(k.as_bytes());
-                let mut esk = ExpandedSecretKey::from_slice(&h)
+                //
+                // ⚠ **`h` and `mask` were the same class and are now wiped —
+                // B-21, 2026-08-27.** [`sha512_zeroizing`] returns a buffer with
+                // a `Drop`, and wipes the `Output<Sha512>` it copied out of. Read
+                // that function for the three residues it does **not** reach; one
+                // of them is inside `from_slice` on the very next line, which does
+                // `bytes.try_into()` into an unwiped `[u8; 64]` before
+                // `from_bytes` consumes it (`hazmat.rs:108-117`). That copy is
+                // the crate's and this signer cannot reach it.
+                let h = sha512_zeroizing(&[k.as_bytes()]);
+                let mut esk = ExpandedSecretKey::from_slice(&h[..])
                     .map_err(|e| XrplError::Key(format!("expanding the ed25519 key failed: {e}")))?;
 
                 if let Some(aux) = aux {
@@ -541,10 +610,14 @@ impl AccountKey {
                     // ⚠ The mask covers **only** `hash_prefix`. `esk.scalar` is
                     // untouched, so `A`, the signature equation and every byte a
                     // verifier checks are exactly RFC 8032's.
-                    let mut mask = Sha512::new();
-                    mask.update(ED25519_NONCE_HEDGE_DST);
-                    mask.update(aux);
-                    let mask = mask.finalize();
+                    //
+                    // ⚠ **The mask is secret material too, and it is not
+                    // obviously so.** It is `SHA512(DST ‖ aux)` over a public
+                    // constant and 32 bytes of fresh entropy — but `q = p XOR
+                    // mask` is the nonce prefix, so anyone holding the mask and
+                    // one signature recovers `p`. B-21 wipes it for the same
+                    // reason it wipes `h`.
+                    let mask = sha512_zeroizing(&[ED25519_NONCE_HEDGE_DST, &aux[..]]);
                     for (b, m) in esk.hash_prefix.iter_mut().zip(mask.iter()) {
                         *b ^= *m;
                     }
@@ -630,9 +703,22 @@ pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1\0"
 ///
 /// ⚠ **A successful draw of thirty-two zero bytes returns `Some([0u8; 32])`.**
 /// That is a hedged signature. Only the `Err` arm below returns `None`.
-fn fresh_aux() -> Option<[u8; 32]> {
-    let mut b = [0u8; 32];
-    match crate::store::getrandom(&mut b) {
+///
+/// ⚠ **`Zeroizing` is B-21 and does not change the draw.** The buffer is filled
+/// by the same `getrandom` and carries the same bytes; the wrapper gives it a
+/// `Drop`. `a_successful_all_zero_draw_still_hedges` is unchanged and still
+/// green, which is what says so — the `Some`/`None` distinction lives in the
+/// match arms here and the wrapper is outside it.
+///
+/// ⚠ **Returning it still leaves a copy.** `Some(b)` moves the buffer, and a
+/// Rust move is a bitwise copy that does not run `Drop` on its source. What is
+/// bounded is the lifetime of every *named binding* along the way, not every
+/// byte the compiler ever wrote down. Boxing would fix this one site and was not
+/// taken: it trades an allocation on the signing path for a residue that
+/// `sha512_zeroizing`'s note 2 says is unfixable in general anyway.
+fn fresh_aux() -> Option<Zeroizing<[u8; 32]>> {
+    let mut b = Zeroizing::new([0u8; 32]);
+    match crate::store::getrandom(&mut b[..]) {
         Ok(()) => Some(b),
         Err(_) => None,
     }
@@ -700,6 +786,13 @@ pub enum Hedge {
 
 #[cfg(feature = "test-support")]
 impl Hedge {
+    /// ⚠ **Not `Zeroizing`, deliberately — B-21 does not cover this copy.**
+    /// `Hedge` is `Copy`, its bytes are a test's own literal rather than drawn
+    /// entropy, and this arm does not exist in a release build at all. The
+    /// wrapper goes on at [`AccountKey::sign_message_with`], which is where the
+    /// value enters the helper B-21 is about. Saying "the aux bytes are wiped"
+    /// without this sentence would be the overstatement `REVIEW-026` found round
+    /// one making about its own fixes.
     fn aux(self) -> Option<[u8; 32]> {
         match self {
             Hedge::DeterministicForVectors => None,
@@ -718,13 +811,22 @@ impl Hedge {
 /// ⚠ This said the draw happens in `Hedge::aux`, which stopped being true at the
 /// §7 item 1 restructure. `REVIEW-025`'s Codex leg named the staleness and round
 /// one annotated **a different occurrence of it**, leaving this one standing.
+///
+/// ⚠ **`bytes` is `Zeroizing` — B-21, and this one was NOT in B-21's registered
+/// list.** The row named the SHA-512 expansion, the mask and `fresh_aux`'s
+/// buffer; this holds the same 32 drawn bytes for the whole of
+/// `sign_prehash_with_rng`, which is the longest any of them is live. It is the
+/// same class at the same helper, so it is fixed here rather than filed as a
+/// fourth thing — and it is called out rather than folded in silently, because
+/// a widened scope recorded as if it were the original is how a fix comes to
+/// claim more than it did.
 struct OneShotAux {
-    bytes: [u8; 32],
+    bytes: Zeroizing<[u8; 32]>,
     used: usize,
 }
 
 impl OneShotAux {
-    fn new(bytes: [u8; 32]) -> OneShotAux {
+    fn new(bytes: Zeroizing<[u8; 32]>) -> OneShotAux {
         OneShotAux { bytes, used: 0 }
     }
 }
@@ -1321,7 +1423,7 @@ mod aux_tests {
         for (i, b) in src.iter_mut().enumerate() {
             *b = i as u8;
         }
-        let mut rng = OneShotAux::new(src);
+        let mut rng = OneShotAux::new(Zeroizing::new(src));
         let mut out = [0u8; 32];
         rng.fill_bytes(&mut out);
         assert_eq!(out, src, "the aux RNG did not yield the entropy it was given");
@@ -1335,16 +1437,87 @@ mod aux_tests {
     #[test]
     #[should_panic(expected = "beyond one field element")]
     fn one_shot_aux_refuses_to_recycle() {
-        let mut rng = OneShotAux::new([7u8; 32]);
+        let mut rng = OneShotAux::new(Zeroizing::new([7u8; 32]));
         let mut out = [0u8; 33];
         rng.fill_bytes(&mut out);
     }
 
+    /// **B-21's falsifier, and it is a COMPILE-TIME one on purpose.**
+    ///
+    /// `REVIEW-025` considered a runtime *"is the buffer zero now?"* assertion
+    /// for B-19 and **rejected it**: reading a stack slot after its frame is
+    /// gone is undefined behaviour, and the test would pass or fail for reasons
+    /// unrelated to the change. E-108's rule — *a revert that does not compile
+    /// proves nothing* — inverts for a `Drop`-carrying type, because the compile
+    /// failure IS the proof.
+    ///
+    /// So this names the bound on the **actual return types of the actual
+    /// private functions**, not on `Zeroizing` in the abstract. Reverting any of
+    /// the three to a bare array fails to compile here. A test that asserted
+    /// `Zeroizing::<[u8; 32]>::new(..)` is `ZeroizeOnDrop` would pass forever
+    /// while the signer used plain arrays — that is `check-test-support-gate`'s
+    /// own false-pass shape (E-165), one layer along.
+    ///
+    /// ⚠ **It proves the types wipe on drop. It does not prove the secret is
+    /// unrecoverable**, and B-21 never claimed that: see `sha512_zeroizing` for
+    /// the three residues that remain, and P-5 for why an adversary with code
+    /// execution is unaffected either way.
+    #[test]
+    fn the_signing_helpers_secret_locals_wipe_on_drop() {
+        fn wipes_on_drop<T: zeroize::ZeroizeOnDrop>(_: &T) {}
+
+        // `sha512_zeroizing` — the ed25519 expansion `h` and the nonce mask.
+        wipes_on_drop(&sha512_zeroizing(&[b"probe"]));
+
+        // `fresh_aux` — the drawn auxiliary entropy.
+        //
+        // ⚠ **`expect`, not `if let Some`.** The first draft skipped the check
+        // when the draw reported a failure, which is a test that passes by not
+        // running — the exact shape E-164 and E-161 are about, written into the
+        // test whose whole subject is B-21. No hook is armed here, so a `None`
+        // is a real entropy failure and this stops instead of certifying
+        // nothing.
+        let aux = fresh_aux().expect("the entropy draw failed, so this test checked nothing");
+        wipes_on_drop(&aux);
+
+        // `OneShotAux` — the same drawn bytes, held for the whole ECDSA sign.
+        let rng = OneShotAux::new(Zeroizing::new([0u8; 32]));
+        wipes_on_drop(&rng.bytes);
+    }
+
+    /// The wiping helper computes **SHA-512** and not something adjacent to it.
+    ///
+    /// ⚠ **This is the half a trait bound cannot see.** B-21 moved two live
+    /// hashes onto a new function; if that function hashed its parts in the
+    /// wrong order, or dropped one, every `ZeroizeOnDrop` bound above would
+    /// still be satisfied and the nonce construction would have silently
+    /// changed. The end-to-end KATs in `tests/hedged_signing.rs` would catch it
+    /// — this catches it at the unit that changed, and pins concatenation order
+    /// explicitly, which the KATs only do implicitly.
+    #[test]
+    fn the_wiping_hash_is_sha512_over_its_parts_in_order() {
+        assert_eq!(
+            sha512_zeroizing(&[b"abc"])[..],
+            Sha512::digest(b"abc")[..],
+            "the wiping helper is not plain SHA-512"
+        );
+        assert_eq!(
+            sha512_zeroizing(&[b"ab", b"c"])[..],
+            Sha512::digest(b"abc")[..],
+            "the wiping helper does not concatenate its parts"
+        );
+        assert_ne!(
+            sha512_zeroizing(&[b"a", b"bc"])[..],
+            sha512_zeroizing(&[b"bc", b"a"])[..],
+            "the wiping helper is order-insensitive, so DST || aux is not pinned"
+        );
+    }
+
     /// Two draws that together stay inside the budget are fine; the one that
     /// crosses it is not. Pins the boundary rather than only the far side.
     #[test]
     fn the_budget_is_thirty_two_bytes_in_total_not_per_call() {
-        let mut rng = OneShotAux::new([3u8; 32]);
+        let mut rng = OneShotAux::new(Zeroizing::new([3u8; 32]));
         let mut a = [0u8; 16];
         let mut b = [0u8; 16];
         rng.fill_bytes(&mut a);
@@ -1352,7 +1525,7 @@ mod aux_tests {
         assert_eq!(a, [3u8; 16]);
         assert_eq!(b, [3u8; 16]);
 
-        let mut rng = OneShotAux::new([3u8; 32]);
+        let mut rng = OneShotAux::new(Zeroizing::new([3u8; 32]));
         let mut a = [0u8; 24];
         rng.fill_bytes(&mut a);
         assert!(
diff --git a/signer/tests/hedged_signing.rs b/signer/tests/hedged_signing.rs
index d9fe8af..677a18d 100644
--- a/signer/tests/hedged_signing.rs
+++ b/signer/tests/hedged_signing.rs
@@ -50,9 +50,16 @@
 //! stand in for — `tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts`, with
 //! its receipt at `docs/runs/`.
 //!
-//! ⚠ **All eight have run; §7 item 4 — two adversarial rounds — has not
-//! finished.** `REVIEW-025` is round one. Both external legs said B-14 must not
-//! be written "closed" before round two and both were right.
+//! ⚠ **All eight have run, and §7 item 4 — two adversarial rounds — is now
+//! COMPLETE.** `REVIEW-025c` is round one (eleven findings, none the
+//! construction); `REVIEW-026c` is round two, and what it found was that round
+//! one's adjudication had **overstated its own fixes** (E-168), which is exactly
+//! what a second round is for. All four of `REVIEW-024` §7's conditions are met.
+//!
+//! ⚠ This comment read *"has not finished … `REVIEW-025` is round one"* for one
+//! commit after round two landed. **A statement that is true when written is
+//! false by the end of the same session** — the twenty-second instance, and this
+//! is the twenty-third.
 
 use wconf_signer::xrpl::{self, AccountKey, Hedge};
 
@@ -172,8 +179,8 @@ fn every_hedged_signature_is_low_s() {
 /// and by nothing else. `CLAIMS.md` E-161.
 ///
 /// **The property is now structural**, per `REVIEW-024` §7 item 1:
-/// `AccountKey::sign_with_aux` is private, takes `Option<[u8; 32]>`, and is the
-/// only place either algorithm signs — `sign_message` and `sign_message_with`
+/// `AccountKey::sign_with_aux` is private, takes `Option<Zeroizing<[u8; 32]>>`,
+/// and is the only place either algorithm signs — `sign_message` and `sign_message_with`
 /// both call it and there is no third path. That is enforced by the module, not
 /// asserted here.
 ///
@@ -618,8 +625,8 @@ fn both_modes_publish_and_verify_under_the_same_key() {
 ///
 /// *"The verifying key is derived inside that helper. It is never a parameter
 /// this signer accepts."* What enforces that is the **signature of
-/// `AccountKey::sign_with_aux`**, which takes `Option<[u8; 32]>` and a message
-/// and nothing else — there is no `VerifyingKey` for a caller to get wrong. A
+/// `AccountKey::sign_with_aux`**, which takes `Option<Zeroizing<[u8; 32]>>` and a
+/// message and nothing else — there is no `VerifyingKey` for a caller to get wrong. A
 /// black-box test cannot distinguish "derived internally" from "supplied
 /// correctly by every caller so far", which is precisely the trap
 /// `one_implementation_not_two` fell into (`REVIEW-024` §4d).
@@ -779,21 +786,41 @@ fn the_construction_matches_a_second_model() {
 // `CLAIMS.md` B-19 — decided 2026-08-27, and NOT for the nonce ruling's reasons
 // ---------------------------------------------------------------------------
 
-/// ⚠ **This test's only job is to fail to COMPILE if the manifest line is
-/// reverted**, and that is the strongest falsifier a `cfg`-gated trait impl has.
+/// ⚠⚠ **THIS DOC SAID ITS ONLY JOB WAS TO FAIL TO COMPILE IF THE MANIFEST LINE
+/// WAS REVERTED. THAT IS FALSE — `CLAIMS.md` E-171.**
+///
+/// Reverting `features = [.., "zeroize"]` **compiles**, because `std` implies
+/// `alloc` and `alloc` lists `"zeroize/alloc"` without the `?` sigil that
+/// `serde?/alloc` beside it carries. The feature was never off, so this test
+/// never depended on the word B-19 added.
+///
+/// **What this test does, and it is worth having:** it asserts the two types
+/// really are `ZeroizeOnDrop` in the build that ships. That is the property
+/// anyone cares about. What it is **not** is a check on B-19's edit, and it was
+/// documented as one in three places for a day — `CLAIMS.md` E-167, the decision
+/// document, and here. **A test named for a property, one layer away from where
+/// the property is decided** (E-161, E-164), at the manifest layer.
+///
+/// The feature-resolution check is `tools/check-zeroize-bounds.py` part 1, which
+/// builds a scratch crate at four feature sets and requires the empty one to
+/// FAIL — without that control "it compiles" says nothing.
 ///
 /// `ed25519-dalek`'s `default-features = false, features = ["std"]` left
 /// `zeroize` off — a crate default — so `ExpandedSecretKey` and `SigningKey` were
 /// not wiped on drop while `hazmat.rs:39` promised unconditionally that they
 /// were. `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md` decided it
 /// on. The `ZeroizeOnDrop` impls exist **only** under that feature
-/// (`hazmat.rs:75-76`, `signing.rs:665-666`), so naming the bound is the check.
+/// (`hazmat.rs:75-76`, `signing.rs:665-666`), so naming the bound is what says
+/// the feature is on — ⚠ **it does not say which manifest line turned it on**,
+/// and that distinction is the whole of E-171.
 ///
 /// ⚠ **A runtime "is the buffer zero now?" assertion was considered and
 /// rejected**: reading freed stack memory is undefined behaviour and would pass
 /// or fail for reasons unrelated to the feature. `CLAIMS.md` E-108's rule — *a
-/// revert that does not compile proves nothing* — inverts here, because the
-/// compile failure IS the proof.
+/// revert that does not compile proves nothing* — inverts for a `Drop`-carrying
+/// type, because the compile failure IS the proof. ⚠ **But only if somebody
+/// produces one.** `make check-zeroize-bounds` produces it for B-21's three
+/// locals; for B-19 it produces the opposite, which is E-171.
 ///
 /// ⚠ **Renamed from `ed25519_secret_material_is_zeroized_on_drop`**, which
 /// overstated it: this proves the two types implement the marker trait, and the
@@ -804,6 +831,10 @@ fn the_construction_matches_a_second_model() {
 /// what it does not buy: the crate's own `From<&SecretKey>` leaves an unwiped
 /// SHA-512 local, the curve temporaries are outside any `Drop`, and an adversary
 /// with code execution reads the scalar while it is live regardless.
+/// ⚠ **B-21's locals are NOT checked here** — `sha512_zeroizing`, `fresh_aux`
+/// and `OneShotAux` are all private, so their bounds are named in
+/// `xrpl::aux_tests::the_signing_helpers_secret_locals_wipe_on_drop`, in-crate,
+/// and reverted for real by `make check-zeroize-bounds` part 2.
 #[test]
 fn ed25519_secret_types_implement_zeroize_on_drop() {
     fn requires_zeroize_on_drop<T: zeroize::ZeroizeOnDrop>() {}
diff --git a/tools/check-zeroize-bounds.py b/tools/check-zeroize-bounds.py
new file mode 100755
index 0000000..79c2fb6
--- /dev/null
+++ b/tools/check-zeroize-bounds.py
@@ -0,0 +1,248 @@
+#!/usr/bin/env python3
+"""
+Wiping-type gate — `CLAIMS.md` **B-19**, **B-21** and **E-171**.
+
+Two questions, both answered by making a compiler decide rather than by reading
+a manifest:
+
+  **Part 1 — is `ed25519-dalek`'s `zeroize` feature on, and what turns it on?**
+  Scratch-crate probes, one per feature set, each naming the `ZeroizeOnDrop`
+  bound. Isolated from the signer so the answer cannot be confounded by anything
+  else in this tree.
+
+  **Part 2 — do the signer's own secret locals wipe?** In-tree reverts to bare
+  arrays, each of which must break the build.
+
+⚠ **PART 1 EXISTS BECAUSE B-19 WAS WRONG, AND THIS SCRIPT IS WHAT FOUND IT
+(E-171).** `CLAIMS.md` E-167 said the `zeroize` feature *"was OFF, by accident,
+for nine days"* and the B-19 decision said *"reverting the manifest line fails to
+COMPILE"*. **Both are false.** The historical line —
+`default-features = false, features = ["std"]`, at `16e2e58` — resolves to
+`alloc,std,zeroize`, because `std = ["alloc", ..]` and `alloc` lists
+`"zeroize/alloc"` **without the `?` sigil** that the `serde?/alloc` entry beside
+it carries. The secret types were wiped on drop the whole time. B-19 made an
+implied feature explicit, which is worth doing and is **not** what it said it
+did. Three `REVIEW-025` legs and a `REVIEW-026` round accepted the claim, because
+reading a manifest is not running one.
+
+⚠ **CONTROLS RUN IN BOTH DIRECTIONS, and a gate without them is the false pass it
+was built to catch (E-165, E-168).** Part 1's `[]` probe must FAIL, or "it
+compiles" says nothing. Part 2's comment-edit control must still BUILD, or "the
+build broke" says nothing.
+
+⚠ **WHAT THIS DOES NOT SAY.** It says these types wipe on drop and these reverts
+break the build. It does **not** say secret material is unrecoverable — see the
+three residues named at `signer/src/xrpl.rs::sha512_zeroizing`, and P-5: an
+adversary with code execution reads the scalar while it is live. This narrows a
+window and removes no channel.
+
+Run from the repository root:  python3 tools/check-zeroize-bounds.py
+Exit 0 when every probe and every revert lands the way it is declared to.
+"""
+import subprocess, sys, shutil, os, tempfile, atexit, signal
+
+MANIFEST = 'signer/Cargo.toml'
+XRPL = 'signer/src/xrpl.rs'
+FILES = [MANIFEST, XRPL]
+
+if not all(os.path.exists(f) for f in FILES):
+    sys.exit(f"run me from the repository root; {FILES} not found from {os.getcwd()}")
+
+_bakdir = tempfile.mkdtemp(prefix='wconf-zeroize-bounds-')
+_baks = {}
+for _f in FILES:
+    _b = os.path.join(_bakdir, os.path.basename(_f))
+    shutil.copy(_f, _b)
+    _baks[_f] = _b
+
+def restore():
+    for f, b in _baks.items():
+        shutil.copy(b, f)
+
+atexit.register(restore)
+for _sig in (signal.SIGINT, signal.SIGTERM):
+    signal.signal(_sig, lambda *_: (restore(), sys.exit(130)))
+
+bad = 0
+
+# ---------------------------------------------------------------------------
+# Part 1 — what actually enables ed25519-dalek's `zeroize` feature
+# ---------------------------------------------------------------------------
+SCRATCH = tempfile.mkdtemp(prefix='wconf-zeroize-probe-')
+os.makedirs(os.path.join(SCRATCH, 'src'), exist_ok=True)
+open(os.path.join(SCRATCH, 'src', 'lib.rs'), 'w').write(
+    "pub fn probe() {\n"
+    "    fn requires<T: zeroize::ZeroizeOnDrop>() {}\n"
+    "    requires::<ed25519_dalek::SigningKey>();\n"
+    "}\n")
+
+def probe(feats):
+    """Build a scratch crate naming the bound. Returns True if it compiles."""
+    open(os.path.join(SCRATCH, 'Cargo.toml'), 'w').write(
+        '[package]\nname = "zprobe"\nversion = "0.0.0"\nedition = "2021"\n'
+        '[dependencies]\n'
+        f'ed25519-dalek = {{ version = "2", default-features = false, features = [{feats}] }}\n'
+        'zeroize = { version = "1", default-features = false }\n')
+    r = subprocess.run(['cargo', 'build', '-q'], cwd=SCRATCH,
+                       capture_output=True, text=True)
+    return r.returncode == 0
+
+# (features, must_compile, what it establishes)
+PROBES = [
+  ('', False,
+   "CONTROL — no features at all. Must FAIL, or 'it compiles' below means nothing."),
+  ('"std"', True,
+   "⚠ THE HISTORICAL LINE at 16e2e58. E-167 said this left zeroize OFF. It did not."),
+  ('"alloc"', True,
+   "`alloc` is the switch — it lists \"zeroize/alloc\" with no `?` sigil."),
+  ('"std", "hazmat", "zeroize"', True,
+   "today's line. Explicit, and — E-171 — not a behaviour change."),
+]
+
+print("check-zeroize-bounds — CLAIMS.md B-19, B-21, E-171\n")
+print(f"  signer:  {os.path.abspath('signer')}")
+print(f"  scratch: {SCRATCH}\n")
+print("Part 1 — ed25519-dalek's `zeroize` feature, decided by a compiler")
+print(f"  {'features':<32} {'result':<22} establishes")
+print("  " + "-" * 104)
+for feats, must, why in PROBES:
+    got = probe(feats)
+    ok = (got == must)
+    verdict = ('compiles' if got else 'fails') + ('  OK' if ok else '  ⚠ NOT AS DECLARED')
+    print(f"  [{feats}]".ljust(34) + f"{verdict:<22} {why}")
+    if not ok:
+        bad += 1
+
+# ---------------------------------------------------------------------------
+# Part 2 — the signer's own secret locals
+# ---------------------------------------------------------------------------
+def apply(old, new):
+    hits = [(f, open(f).read()) for f in FILES]
+    hits = [(f, t) for f, t in hits if t.count(old) == 1]
+    if len(hits) != 1:
+        counts = {f: open(f).read().count(old) for f in FILES}
+        return f"BAD REVERT: pattern occurs {counts}; must be exactly once in exactly one file"
+    f, t = hits[0]
+    open(f, 'w').write(t.replace(old, new))
+    return None
+
+def compile_tests():
+    r = subprocess.run(['cargo', 'test', '--all-features', '--no-run'],
+                       cwd='signer', capture_output=True, text=True)
+    return r.returncode == 0, r.stdout + r.stderr
+
+REVERTS = [
+  ("`sha512_zeroizing` returns a bare array (the expansion and the mask)",
+   """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
+    let mut hasher = Sha512::new();
+    for part in parts {
+        hasher.update(part);
+    }
+    let mut digest = hasher.finalize();
+    let mut out = Zeroizing::new([0u8; 64]);
+    out.copy_from_slice(digest.as_slice());
+    digest.as_mut_slice().zeroize();
+    out
+}""",
+   """fn sha512_zeroizing(parts: &[&[u8]]) -> [u8; 64] {
+    let mut hasher = Sha512::new();
+    for part in parts {
+        hasher.update(part);
+    }
+    let digest = hasher.finalize();
+    let mut out = [0u8; 64];
+    out.copy_from_slice(digest.as_slice());
+    out
+}""",
+   "the ed25519 SHA-512 expansion `h` and the nonce mask"),
+
+  ("`fresh_aux` returns a bare array (the drawn auxiliary entropy)",
+   """fn fresh_aux() -> Option<Zeroizing<[u8; 32]>> {
+    let mut b = Zeroizing::new([0u8; 32]);
+    match crate::store::getrandom(&mut b[..]) {""",
+   """fn fresh_aux() -> Option<[u8; 32]> {
+    let mut b = [0u8; 32];
+    match crate::store::getrandom(&mut b[..]) {""",
+   "the 32 bytes `getrandom` drew for the nonce hedge"),
+
+  ("`OneShotAux` holds a bare array (the ECDSA aux, live for the whole sign)",
+   """struct OneShotAux {
+    bytes: Zeroizing<[u8; 32]>,
+    used: usize,
+}
+
+impl OneShotAux {
+    fn new(bytes: Zeroizing<[u8; 32]>) -> OneShotAux {""",
+   """struct OneShotAux {
+    bytes: [u8; 32],
+    used: usize,
+}
+
+impl OneShotAux {
+    fn new(bytes: [u8; 32]) -> OneShotAux {""",
+   "the same drawn bytes, held across `sign_prehash_with_rng`"),
+]
+
+CONTROL = ("CONTROL — a comment edited inside the signing helper. Must still BUILD.",
+           "/// SHA-512 into a buffer that wipes itself, leaving no unwiped digest behind.",
+           "/// SHA-512 into a buffer that wipes itself. (negative control edit)")
+
+print("\nPart 2 — the signer's own secret locals, decided by reverting them")
+print("  baseline: the unmodified tree must build its tests ...")
+ok, out = compile_tests()
+if not ok:
+    print("    " + "\n    ".join(out.splitlines()[-12:]))
+    print("\nVOID, not passing: the unmodified tree does not compile.")
+    print("  Every revert below would 'break the build' for a reason that is not the revert.")
+    sys.exit(1)
+print("    builds. Every failure below is one a revert CAUSED.\n")
+
+print(f"  {'result':<24} revert")
+print("  " + "-" * 104)
+
+name, old, new = CONTROL
+restore()
+err = apply(old, new)
+if err:
+    print(f"  {'VOID':<24} {name}\n    {err}")
+    sys.exit(1)
+ok, out = compile_tests()
+restore()
+if not ok:
+    print("    " + "\n    ".join(out.splitlines()[-12:]))
+    print(f"\nVOID, not passing: the negative control BROKE THE BUILD.")
+    print("  'The build broke' then carries no information and every arm is a false pass. E-165.")
+    sys.exit(1)
+print(f"  {'still builds  OK':<24} {name}")
+
+for name, old, new, register in REVERTS:
+    restore()
+    err = apply(old, new)
+    if err:
+        print(f"  {'BAD PATTERN':<24} {name}\n    {err}")
+        bad += 1
+        continue
+    ok, out = compile_tests()
+    if ok:
+        print(f"  {'STILL BUILDS  ⚠ FALSE':<24} {name}\n    {register}")
+        print("    ⚠ The secret stopped being a wiping type and NOTHING objected.")
+        bad += 1
+        continue
+    mech = 'bound' if 'ZeroizeOnDrop' in out else 'type'
+    print(f"  {'build broke  OK (' + mech + ')':<24} {name}\n    {register}")
+restore()
+
+print("\n" + "-" * 106)
+if bad:
+    print(f"FAIL: {bad} probe(s) or revert(s) did not land as declared.")
+else:
+    print(f"PASS: {len(PROBES)} feature probes and {len(REVERTS)} reverts all landed as declared,")
+    print(f"      with a control in each direction.")
+print("⚠ '(bound)' means the `ZeroizeOnDrop` bound refused it; '(type)' means an incidental")
+print("  type mismatch did. Both break the build; only the first is a check on the PROPERTY.")
+print("⚠ ⚠ **B-19's own claim is NOT in the revert list, because it is FALSE** — removing the")
+print("  `zeroize` word from the ed25519-dalek line does NOT break the build. Part 1's")
+print('  [\"std\"] probe is what establishes why. CLAIMS.md E-171.')
+print("⚠ This says these types wipe on drop. It does NOT say the secret is unrecoverable —")
+print("  see `sha512_zeroizing`'s three named residues, and P-5.")
+sys.exit(1 if bad else 0)
diff --git a/tools/spike-b16-2026-08-27/revert-sweep.py b/tools/spike-b16-2026-08-27/revert-sweep.py
index b7c5c37..6e5684d 100755
--- a/tools/spike-b16-2026-08-27/revert-sweep.py
+++ b/tools/spike-b16-2026-08-27/revert-sweep.py
@@ -36,6 +36,13 @@ cause. The sweep now **runs the unmodified target first and requires ZERO
 failures**, and then requires each mutation to produce a **NEWLY** failing
 expected test.
 
+⚠ **Four of the twelve were re-anchored on 2026-08-27 by B-21**, which wrapped
+the signing helper's secret locals in `Zeroizing` and moved two `Sha512` updates
+into one helper call. The mutations are unchanged; their anchor text moved. The
+sweep reported **BAD PATTERN** for all four rather than quietly passing, which is
+what `apply`'s exactly-once rule is for — a patch applied to nothing is the same
+false pass as a nonzero exit taken for a failing test.
+
 ⚠ This is a sweep over a NAMED SET of **twelve** mutations — it said eleven while
 listing twelve (`REVIEW-026`) — against **`cargo test --test hedged_signing`**,
 which is one target and not the whole suite; it claimed the whole suite for one
@@ -151,9 +158,14 @@ REVERTS = [
    'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1 ";',
    ["the_construction_matches_a_second_model"]),
 
+  # ⚠ Re-anchored 2026-08-27 by **B-21**, which replaced two `Sha512` updates
+  # with one `sha512_zeroizing(&[DST, aux])` call. The mutation is unchanged —
+  # DST and aux in the other order — but its anchor text moved, and the sweep
+  # reported BAD PATTERN rather than passing, which is the whole point of
+  # refusing a pattern that does not occur exactly once.
   ("5. DST and aux concatenated in the other order",
-   "                    mask.update(ED25519_NONCE_HEDGE_DST);\n                    mask.update(aux);",
-   "                    mask.update(aux);\n                    mask.update(ED25519_NONCE_HEDGE_DST);",
+   "sha512_zeroizing(&[ED25519_NONCE_HEDGE_DST, &aux[..]])",
+   "sha512_zeroizing(&[&aux[..], &ED25519_NONCE_HEDGE_DST[..]])",
    ["the_construction_matches_a_second_model"]),
 
   ("6. The mask taken from the SECOND half of the SHA-512 output",
@@ -162,13 +174,13 @@ REVERTS = [
    ["the_construction_matches_a_second_model"]),
 
   ("7. A reported entropy failure masks with zeros instead of omitting the mask",
-   "    match crate::store::getrandom(&mut b) {\n        Ok(()) => Some(b),\n        Err(_) => None,\n    }",
-   "    match crate::store::getrandom(&mut b) {\n        Ok(()) => Some(b),\n        Err(_) => Some([0u8; 32]),\n    }",
+   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => Some(b),\n        Err(_) => None,\n    }",
+   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => Some(b),\n        Err(_) => Some(Zeroizing::new([0u8; 32])),\n    }",
    ["ed25519_entropy_failure_degrades_to_rfc_8032", "entropy_failure_degrades_to_the_standard_construction"]),
 
   ("8. A successful ZERO draw treated as an omission (B-14's mirror error)",
-   "    match crate::store::getrandom(&mut b) {\n        Ok(()) => Some(b),\n        Err(_) => None,\n    }",
-   "    match crate::store::getrandom(&mut b) {\n        Ok(()) => if b == [0u8; 32] { None } else { Some(b) },\n        Err(_) => None,\n    }",
+   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => Some(b),\n        Err(_) => None,\n    }",
+   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => if *b == [0u8; 32] { None } else { Some(b) },\n        Err(_) => None,\n    }",
    ["zero_aux_is_hedged_not_a_fallback", "a_successful_all_zero_draw_still_hedges",
     "a_successful_all_zero_draw_still_hedges_secp256k1"]),
 
@@ -187,9 +199,11 @@ REVERTS = [
    'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v9\\0";',
    ["the_dst_is_the_ruled_bytes"]),
 
+  # ⚠ Re-anchored 2026-08-27 by **B-21**. `h` is a `Zeroizing<[u8; 64]>` and
+  # `from_slice` takes `&h[..]`; the mutation is the same stray flip.
   ("11. The unmasked arm no longer RFC 8032 (a stray mask on the no-mask path)",
-   "                let mut esk = ExpandedSecretKey::from_slice(&h)",
-   "                let mut h = h; h[63] ^= 1; let mut esk = ExpandedSecretKey::from_slice(&h)",
+   "                let mut esk = ExpandedSecretKey::from_slice(&h[..])",
+   "                let mut h = h; h[63] ^= 1; let mut esk = ExpandedSecretKey::from_slice(&h[..])",
    ["the_unmasked_arm_is_byte_identical_to_the_crates_own_rfc_8032",
     "ed25519_entropy_failure_degrades_to_rfc_8032",
     "the_construction_matches_a_second_model"]),

```


## What was RUN, and its output

⚠ Reported so you can judge the evidence, not so you accept it.

```
$ cd signer && cargo test --all-features        (three consecutive runs)
  run 1: 267 passed, 0 failed
  run 2: 267 passed, 0 failed
  run 3: 267 passed, 0 failed

$ make check-tables check-negative-claims check-personas check-blinding check-test-support
PASS: every table row has exactly as many cells as its header.
PASS: every graded or filed row asserting a negative carries a recorded search.
check-personas: PASS - 3 personas, each byte-identical to its generated copy.
PASS: 5 deliberate call sites, 0 unrecorded uses of the superseded generator.
PASS: 6 test-only probes are unreachable without `test-support`.

$ make check-zeroize-bounds
Part 1 - ed25519-dalek's `zeroize` feature, decided by a compiler
  []                            fails     OK   CONTROL - must fail
  ["std"]                       compiles  OK   THE HISTORICAL LINE at 16e2e58
  ["alloc"]                     compiles  OK   `alloc` is the switch
  ["std","hazmat","zeroize"]    compiles  OK   today's line
Part 2 - the signer's own secret locals, decided by reverting them
  still builds  OK          CONTROL - a comment edit. Must still BUILD.
  build broke  OK (bound)   `sha512_zeroizing` returns a bare array
  build broke  OK (type)    `fresh_aux` returns a bare array
  build broke  OK (type)    `OneShotAux` holds a bare array
PASS: 4 feature probes and 3 reverts all landed as declared.

$ python3 tools/spike-b16-2026-08-27/revert-sweep.py
12 reverts, 12 made an EXPECTED test fail, 0 did not.

$ git show 16e2e58:signer/Cargo.toml | grep ed25519-dalek
ed25519-dalek = { version = "2", default-features = false, features = ["std"] }
```

⚠ **The last line is the historical manifest at the commit E-167 blames.** It is
the input to question 1.
