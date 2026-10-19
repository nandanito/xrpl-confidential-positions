# REVIEW-024 — DECISION PACKET: `CLAIMS.md` B-16, the ed25519 signing nonce

You are one of two independent legs. The other leg is answering this same packet
with no knowledge of you, and neither of you sees the other's answer. **Answer
from this packet alone. Do not use tools, do not fetch anything, do not read a
filesystem.** Everything you need is quoted below at length, including the
complete text of the two files under review and verbatim source of the third-party
crate the decision turns on.

⚠ **A warning you are owed.** This project's own conclusions are in its
repository, and its own session notes lean one way on this question. You are not
being asked to agree with them, and if you happen to have any of this project's
material in context, treat agreement as contamination rather than corroboration.
Argue the question.

⚠ **This project has a standing record that a review leg's *diagnosis* is right
while its *remedy* is backwards. It has happened seven times.** Two of those are
quoted in §3 below, in the ruling that governs the neighbouring site, with the
tests that now pin the rejections. Please state remedies precisely enough to be
checked against the source, and flag where you are reasoning rather than reading.

---

## 1. What is being decided

**`CLAIMS.md` B-16 — where the ed25519 transaction signing nonce comes from.**

The neighbouring question, B-14 (the secp256k1 ECDSA nonce `k`), was ruled on
2026-08-20 by two independent legs and implemented the same day: `k` is **hedged
RFC 6979** on the default path, and entropy failure **degrades** to pure RFC 6979
rather than refusing to sign. That ruling is quoted whole in §3.

**That ruling explicitly did not close ed25519**, and both of its legs said so.
Ed25519 is deterministic by construction (RFC 8032 §5.1.6: `r = H(prefix ‖ M)`),
and **every account this project holds on its target network has an `sEd…`
seed** — so the arm the ruling changed is the one this project uses least, and
the arm it did not touch is the live one.

**What a ruling has to produce:**

1. A decision: is the residual risk **accepted as a named gap**, or is a
   **hedged construction adopted**?
2. If adopted: the construction, in enough detail to reimplement from your prose
   alone, and what it costs.
3. If accepted: what the register entry must say, and what a test must assert so
   the gap cannot go quietly stale.
4. Either way: the failure-on-entropy-failure rule (see §4 — this project keeps
   four different randomness rules side by side, deliberately, and merging them
   is a named recurring defect here).

**This is a ruling, not an implementation.** Nothing will be built from your
answer without a second review round of the build.

---

## 2. The system, in one paragraph, and the threat model

A holder-side Rust daemon builds, proves and signs XRP Ledger *confidential MPT*
transactions (XLS-0096) on a devnet. It holds an XRPL account key and an ElGamal
encryption key. **Under this project's own ruled key-derivation construction the
ElGamal decryption key is derived from the XRPL master seed**, so the account key
and the confidentiality key are welded together: a compromise of the account key
is retroactive decryption of the whole confidential history, permanently, with no
rotation and no recovery in the protocol. The daemon does **not** submit
transactions; it emits a signed blob over a Unix domain socket to whoever
submits.

**The threat model is ruled and is not open here.** Verbatim, from the project's
own ruling of 2026-08-18:

> **Ruled 2026-08-18: a hostile same-host process IS in this system's threat
> model.** … None of this makes the signer safe against an adversary with code
> execution — that adversary reads `sk_A` from process memory regardless. The
> boundary raises the bar from *a leaked token* to *code execution on the
> holder's machine*. That is a real difference and it is the whole of the claim.

The two arguments that ruling decided between, quoted from the decision request,
because the losing one is the strongest argument against hedging anything:

> - **Leg A ruled hedged**, because fault injection is in scope: a same-host
>   adversary is already contemplated by REVIEW-003b's MEDIUM on the localhost
>   boundary and by TOB-RIPCTX-5's timing finding.
> - **Leg B ruled fully deterministic**, because an adversary with enough control
>   to fault the prover can already read `sk_A` out of process memory, so DFA is
>   not in the threat model.

**Leg A won.** The zero-knowledge proof system's sigma-protocol nonces were made
hedged as a result, and a build gate fails if that default ever moves back.

⚠ One implementation note from that ruling, because it recurs below:

> **The hedge does not degrade to the deterministic construction when the RNG
> dies — it degrades to a *different fixed* construction.** … because aux is
> tagged-hashed before the XOR, a dead RNG returning zeros still produces a
> well-formed mask, so the output differs from the unhedged vector.

**A standing prohibition that governs your answer** (`CLAIMS.md` P-5): nothing in
this system may be described as trustless, non-custodial, audited,
production-ready or secure. A ruling that says hedging makes something secure
will be rejected on those grounds alone.

---

## 3. The governing precedent: the B-14 ruling, quoted whole

This is the ruling for the *neighbouring* site. It is the thing your answer has
to be consistent with or has to explicitly depart from. Read §4 and §5 of it with
particular care: two leg recommendations were rejected there, and both rejections
are now pinned by tests.

# REVIEW-018 — RULING on `CLAIMS.md` B-14: the transaction's ECDSA nonce `k`

**Date:** 2026-08-20. **Two independent legs**, both answering the same packet
with no knowledge of each other: `REVIEW-018a` (Gemini, effort high),
`REVIEW-018b` (Codex, read-only sandbox).

**Status: RULED for secp256k1. OPEN for ed25519** — the ed25519 half is
`CLAIMS.md` **B-16** and B-14 is *not* closed by this.

---

## 1. The ruling

> **The issue #1 ruling extends to the transaction signature's nonce.**
> secp256k1 signing uses **hedged RFC 6979** — the deterministic construction
> with 32 bytes of fresh CSPRNG entropy mixed in as additional data — on the
> default path. Byte-for-byte vector pinning against `ripple-keypairs` moves to
> a **deterministic arm that is the same implementation with one input varied**,
> never a second signer. **Entropy failure degrades to pure RFC 6979; it does
> not refuse.** ed25519 remains deterministic and is a **named open gap**.

**Both legs ruled that issue #1 extends, and neither found a principled
distinction.** That is the whole basis; the rest is implementation.

## 2. Why — and it is not symmetry for its own sake

Issue #1 ruled that **a hostile process on the holder's own machine, running as
the holder's own user, is in ADR-0001 §(a)'s threat model.** That ruling is what
flipped the sigma-protocol nonces to hedged (`WCONF_HEDGE=1`, and
`vendor-verify.sh` fails if the default moves back).

Site 5 had **the same shape** — a nonce derived deterministically from a
long-lived secret — and the opposite treatment, with nothing written down. The
packet asked both legs to find the distinction. Neither could.

**The reason it matters is not the amount.** The Gemini leg put it as: threat
models apply to *keys*, not to subroutines. `k` protects the **XRPL account
key**, and under the ruled keygen construction (REVIEW-012c) that same key is
the input the ElGamal decryption key is derived from. So a `k` failure is a
spending failure **and** a confidentiality failure, welded together by this
project's own keygen ruling.

The Codex leg added the sharper form: *"If `k` is repeated, biased, faulted, or
partially exposed badly enough, the account key is at risk; in this project that
also risks the derived ElGamal confidentiality key."*

⚠ **Neither leg argued that RFC 6979 is broken.** It is not. The argument is
that pure determinism is exactly the case hedging exists for — fault injection
and an adversary who can observe or perturb the computation — and issue #1 put
that adversary in scope.

## 3. What it cost, paid deliberately

`ripple-keypairs` is deterministic. **The default path can no longer be pinned
byte-for-byte against it**, and `tests/xrpl_vectors.rs` fails against a hedged
signer — which is how the implementation was confirmed live.

Both legs proposed the same remedy independently, and both made it conditional
on the same thing:

> **Codex:** *"That is sound only if the deterministic arm is the same signing
> implementation with the hedge input disabled or fixed. If it is a separate
> signer, it tests the wrong thing."*

> **Gemini:** *"This does not test the wrong binary. The arithmetic,
> pre-hashing, canonicalization, and DER encoding routines are identical between
> both arms; only the auxiliary entropy slice differs."*

Implemented as `AccountKey::sign_message_with(Hedge, &[u8])`, one function, one
varied input. `tests/hedged_signing.rs::one_implementation_not_two` is what
holds it: both arms must verify under the same public key over the same digest,
both must be DER, both must be low-`S`.

**What the deterministic arm still pins** is what that test was ever really for:
the digest choice, the serialisation, the low-`S` normalisation and the DER
encoding, against an implementation this project did not write. What it stopped
covering — that the *default* path produces valid signatures — is now covered by
seven tests that did not exist before.

## 4. ⚠ Two leg recommendations were WRONG, and both are pinned by tests

`CLAIMS.md` E-93's precedent: a rejected review claim belongs in a test, not in
a note.

### 4a. Gemini: *"aux_rand = 0³² (or is omitted)"* — **these are not the same**

The leg wrote that pure RFC 6979 is recovered by passing 32 zero bytes *or* by
omitting the additional data, as though the two were interchangeable.

**They are not.** `rfc6979::generate_k` seeds an HMAC-DRBG as
`HmacDrbg::new(x, h, data)` — the additional data is *seed material*. Thirty-two
zero bytes are data; omitting is no data. They produce different `k`.

**Following that literally would have broken the very vector pinning the arm
exists to preserve.** Confirmed by reverting: passing `Some([0u8; 32])` fails
`each_algorithm_signs_what_ripple_keypairs_signs` and
`transactions_serialise_and_sign_byte_for_byte_like_the_codec`.

**This is the fifth time in this project that a leg's remedy has been wrong in
detail while its diagnosis was right.**

### 4b. Codex: *"If entropy fails, refuse to sign"* — **rejected**

The leg wrote: *"If entropy fails, refuse to sign. Do not silently fall back to
pure RFC 6979, because that converts the ruled mitigation into best effort."*

**That imports the `r`/`ρ` rule into a site with the sigma-nonce shape, which is
the merge `CLAUDE.md` warns against by name.** Architecture §4 keeps three
randomness rules side by side *because they differ*:

| Site | Entropy is… | On failure |
|---|---|---|
| Sigma nonces | a **hedge** over a deterministic core that is safe alone | **degrade** |
| `r` / `ρ` | **the source**, and `r` is published on chain | **refuse** |
| Keygen | a **fixed seed**, no entropy at all | no failure path exists |
| **`k` (this ruling)** | a **hedge** over RFC 6979, which is safe alone | **degrade** |

`k` has the sigma-nonce shape. Degrading returns the signer to pure RFC 6979 —
exactly where it stood before this ruling, and the standard construction. That
is not "best effort" replacing a mitigation; it is the mitigation's floor being
the previous state of the art.

Refusing would also make a transient entropy failure a **liveness** failure on a
path where the deterministic fallback is safe — strictly worse.

Pinned by `entropy_failure_degrades_to_the_standard_construction`, which fails
if the remedy is applied.

⚠ **The two legs disagreed on this and the adjudicator broke the tie against the
more cautious one.** Recorded plainly because "we took the safer option" would
be the easy and wrong summary.

## 5. ⚠ ed25519 — B-14 is NOT closed

Both legs said so, and Codex said it as an instruction: *"Do not mark B-14
closed by fixing only secp256k1."*

Ed25519 is deterministic by construction (RFC 8032) and **this is the live
path** — every account this project holds on Devnet has an `sEd…` seed.
Randomising it needs `ed25519-dalek`'s `hazmat` surface or a vetted hedged
construction. Gemini: *"I would not recommend hand-rolling randomized Ed25519
for XRPL just to achieve symmetry."* Agreed: rolling one is worse than the gap.

**Tracked as `CLAIMS.md` B-16**, and asserted by
`ed25519_is_still_deterministic_and_that_is_a_tracked_gap`, which fails the day
somebody makes it randomised without closing B-16 — so the register cannot go
quietly stale.

## 6. Executed

⚠ **The first Devnet run proved nothing and was nearly reported as though it
had.** Every account this project holds uses an `sEd…` seed, so the obvious
"run the Devnet driver and see `tesSUCCESS`" exercised **ed25519** — the arm the
ruling did not change.

`tools/spike-step2-2026-08-19/b14-hedged-secp256k1-devnet.ts` funds a
**secp256k1** holder, drives a real `ConfidentialMPTConvert` through the signer,
and **decodes `SigningPubKey` out of the submitted blob**, refusing to report
success unless the prefix says secp256k1.

```
SigningPubKey 03A7180BF0…  → secp256k1
submit -> tesSUCCESS
hash 363EF721899BEED8A5A39DEBA57409F390418DB21EAF3B5912B49ACAFFC4A59F
validated: yes
```

**A hedged signature is wire-valid.** Validators verify `(r, s)` against the
public key and never see how `k` was derived. That is the one thing neither leg
could establish by reasoning, and the one thing that would have made the ruling
unimplementable if false.

## 7. What this ruling does NOT claim

- **Not** that the previous construction was broken. RFC 6979 is the standard
  answer and remains the fallback.
- **Not** that hedging makes anything secure. `CLAIMS.md` P-5 governs.
- **Not** that B-14 is closed. ed25519 is B-16.
- **Not** that the Devnet run shows hedging is *better* — only that it is
  accepted. The argument for it is §2, not §6.

## 8. Confidence

Gemini: 9.5/10, naming the judgement as defence-in-depth versus test simplicity.
Codex: medium-high, naming the ed25519 treatment as the judgement call rather
than the extension itself. **The adjudicator agrees the extension is a technical
conclusion and the ed25519 disposition is a judgement.**

---

## 4. The four randomness rules this project runs side by side

⚠ **They differ deliberately and merging them is a named recurring defect here.**
A leg recommended importing one into another during the B-14 ruling and was
rejected (§4b above). From the architecture document, verbatim:

| Site | Entropy is… | On failure |
|---|---|---|
| Sigma-protocol nonces (in the proof system) | a **hedge** over a deterministic core that is safe alone | **degrade** |
| `r` / `ρ` (blinding factors published on chain) | **the source**, and `r` is published on chain | **refuse to sign** |
| ElGamal keygen | a **fixed seed**, no entropy at all | no failure path exists, deliberately |
| `k` — the secp256k1 transaction nonce (B-14) | a **hedge** over RFC 6979, which is safe alone | **degrade** |

**Your answer has to say which of these shapes the ed25519 nonce has**, and it is
not permitted to be "the same as the others".

---

## 5. The code under review — complete files

### 5a. `signer/src/xrpl.rs` — complete

This is the file that would change. It is included whole rather than as a diff,
on purpose: a diff would bound you to what this project chose to show you, and
this project's choices are its blind spots.

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
//! recommended by a leg and rejected. ⚠ **Ruled for secp256k1 only** —
//! ed25519 is deterministic by construction, it is the live path for every
//! account this project holds, and it is `CLAIMS.md` **B-16**, open.

use k256::ecdsa::{
    signature::hazmat::{PrehashSigner, RandomizedPrehashSigner},
    Signature, SigningKey,
};
use ripemd::Ripemd160;
use sha2::{Digest, Sha256, Sha512};

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
    ///   auxiliary entropy, per `REVIEW-018`. See the module header, and
    ///   [`Self::sign_message_with`] for the deterministic arm.
    /// * **ed25519** — a raw 64-byte signature over `message` itself. Ed25519
    ///   hashes internally; pre-hashing would produce a signature over the
    ///   wrong thing.
    pub fn sign_message(&self, message: &[u8]) -> R<Vec<u8>> {
        self.sign_message_with(Hedge::Fresh, message)
    }

    /// Sign, choosing where the ECDSA nonce's auxiliary entropy comes from.
    ///
    /// ⚠ **This is ONE signing implementation with one input varied**, not two
    /// signers. Both `REVIEW-018` legs said the deterministic arm is sound only
    /// on that condition — a separate code path would pin the wrong binary,
    /// which is the failure `REVIEW-009` §8 found in `t-nbound.c`.
    pub fn sign_message_with(&self, hedge: Hedge, message: &[u8]) -> R<Vec<u8>> {
        match &self.inner {
            Inner::Secp256k1(k) => {
                let prehash = sha512half(message);
                let sig: Signature = match hedge.aux()? {
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
                // ⚠ **B-14 is NOT closed by hedging secp256k1.** Ed25519 is
                // deterministic by construction (RFC 8032) and this path is the
                // live one — every account this project holds on Devnet has an
                // `sEd…` seed. Both legs said so independently, and Codex said
                // it as an instruction: *"Do not mark B-14 closed by fixing
                // only secp256k1."* Randomising it needs `hazmat` or a vetted
                // construction, and rolling one for symmetry is worse than the
                // gap. Tracked as B-16.
                use ed25519_dalek::Signer;
                Ok(k.sign(message).to_bytes().to_vec())
            }
        }
    }
}

/// Where the ECDSA nonce's auxiliary entropy comes from.
///
/// **`CLAIMS.md` B-14, ruled 2026-08-20 (`REVIEW-018`).** The issue #1 ruling —
/// a hostile same-host process is in the threat model — is what made the sigma
/// nonces hedged. It extends here: `k` protects the **account key**, and under
/// the ruled keygen construction that key is also the input the ElGamal
/// decryption key is derived from, so a `k` failure is a confidentiality
/// failure as well as a spending one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Hedge {
    /// The default. 32 fresh CSPRNG bytes mixed in as RFC 6979 additional data.
    Fresh,
    /// Pure RFC 6979 — **for cross-implementation vectors only.**
    ///
    /// `ripple-keypairs` is deterministic, so byte-for-byte pinning is only
    /// possible on this arm. It pins the serialisation, the digest choice, the
    /// low-`S` normalisation and the DER encoding, which is what that test was
    /// ever really for.
    DeterministicForVectors,
}

impl Hedge {
    fn aux(self) -> R<Option<[u8; 32]>> {
        match self {
            Hedge::DeterministicForVectors => Ok(None),
            Hedge::Fresh => {
                let mut b = [0u8; 32];
                match crate::store::getrandom(&mut b) {
                    Ok(()) => Ok(Some(b)),
                    // ⚠ **Degrade, do not refuse — and the two are not
                    // interchangeable.** Architecture §4 keeps three randomness
                    // rules side by side because they differ: `r`/`ρ` refuse,
                    // because entropy *is* the source and `r` is published on
                    // chain; sigma nonces degrade, because entropy is a **hedge
                    // over a deterministic core** that is safe on its own. `k`
                    // is the second shape, so it degrades to the standard
                    // construction rather than declining to sign.
                    //
                    // `REVIEW-018`'s Codex leg said refuse. That would import
                    // the `r`/`ρ` rule into a site with the sigma-nonce shape,
                    // which is the merge `CLAUDE.md` warns against by name.
                    Err(_) => Ok(None),
                }
            }
        }
    }
}

/// Feeds exactly the bytes it was given, once.
///
/// `sign_prehash_with_rng` wants an RNG; this project wants to choose the
/// entropy source and to know when it failed. So the draw happens in
/// [`Hedge::aux`] through the same `getrandom` every other site uses, and this
/// hands those bytes over.
struct OneShotAux {
    bytes: [u8; 32],
    used: usize,
}

impl OneShotAux {
    fn new(bytes: [u8; 32]) -> OneShotAux {
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
        return Err(XrplError::Version { want: VER_ED25519_SEED[0], got: body[0] });
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
        let mut rng = OneShotAux::new(src);
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
        let mut rng = OneShotAux::new([7u8; 32]);
        let mut out = [0u8; 33];
        rng.fill_bytes(&mut out);
    }

    /// Two draws that together stay inside the budget are fine; the one that
    /// crosses it is not. Pins the boundary rather than only the far side.
    #[test]
    fn the_budget_is_thirty_two_bytes_in_total_not_per_call() {
        let mut rng = OneShotAux::new([3u8; 32]);
        let mut a = [0u8; 16];
        let mut b = [0u8; 16];
        rng.fill_bytes(&mut a);
        rng.fill_bytes(&mut b);
        assert_eq!(a, [3u8; 16]);
        assert_eq!(b, [3u8; 16]);

        let mut rng = OneShotAux::new([3u8; 32]);
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

### 5b. `signer/tests/hedged_signing.rs` — complete

The last test in this file is the current disposition of B-16: it asserts the gap
rather than describing it, so that making ed25519 randomised without a ruling
fails the suite.

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
//! pin the wrong binary. `one_implementation_not_two` below is what holds that.
//!
//! # ⚠ B-14 is NOT closed
//!
//! Ed25519 is deterministic by construction and **this is the live path** —
//! every account this project holds on Devnet has an `sEd…` seed. Both legs
//! said so; Codex said it as an instruction: *"Do not mark B-14 closed by
//! fixing only secp256k1."* Tracked as **B-16**.

use wconf_signer::xrpl::{self, AccountKey, Hedge};

/// The first vector seed, a published constant derived from 16 zero bytes.
const SECP_SEED: &str = "sp6JS7f14BuwFY8Mw6bTtLKWauoUs";

fn probe() -> Vec<u8> {
    xrpl::unhex("5354580012005821000000022200000000").unwrap()
}

fn ed25519_key() -> AccountKey {
    AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap()
}

/// **The default path is hedged.** Two signatures over identical bytes with
/// the identical key differ.
///
/// This is the whole ruling in one assertion. If it ever passes trivially
/// because signing became a no-op, `the_hedged_signature_still_verifies`
/// catches that.
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

/// **One implementation, one varied input — not two signers.**
///
/// Both `REVIEW-018` legs made the deterministic arm's soundness conditional on
/// exactly this. The check available from outside is that the two arms agree on
/// everything a signature commits to *except* the nonce: same key, same
/// message, same digest, same encoding, both verifying under the same public
/// key. A second implementation would drift on one of those.
#[test]
fn one_implementation_not_two() {
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

/// ⚠ **The ed25519 gap, asserted rather than described.**
///
/// B-14 is ruled for secp256k1 and **open** for ed25519 — and this is the live
/// path. A test that says so fails the day somebody makes ed25519 randomised
/// without also closing B-16, which is the moment the register would otherwise
/// go quietly stale.
#[test]
fn ed25519_is_still_deterministic_and_that_is_a_tracked_gap() {
    let key = ed25519_key();
    let msg = probe();
    let first = key.sign_message(&msg).unwrap();
    for _ in 0..8 {
        assert_eq!(
            key.sign_message(&msg).unwrap(),
            first,
            "ed25519 signing became randomised. That may be an improvement — but B-14's \
             ruling covers secp256k1 only, and CLAIMS.md B-16 is the ed25519 half. Close \
             B-16 deliberately rather than letting this test start failing"
        );
    }
    // ...and the hedge selector genuinely has no effect on that path, rather
    // than appearing to.
    assert_eq!(
        key.sign_message_with(Hedge::DeterministicForVectors, &msg).unwrap(),
        first
    );
}
```

### 5c. `signer/Cargo.toml` — complete

Note which features of `ed25519-dalek` are and are not enabled.

```toml
[package]
name = "wconf-signer"
version = "0.0.1"
edition = "2021"
publish = false
description = "W-CONF holder signer — skeleton. No keys, no proofs, no signing. Devnet only."

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
libc = "0.2"
hmac = "0.12"
sha2 = "0.10"
k256 = { version = "0.13", default-features = false, features = ["arithmetic", "ecdsa"] }
ripemd = "0.1"
ed25519-dalek = { version = "2", default-features = false, features = ["std"] }
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
wconf-signer = { path = ".", features = ["test-support"] }

[profile.release]
panic = "abort"
```

### 5d. What the ed25519 vector test currently pins

`signer/tests/xrpl_vectors.rs` pins this signer's output **byte for byte**
against `ripple-keypairs@2.0.0` — an independently written JavaScript
implementation this project did not author — for **both** algorithms, and it
asserts that the vector set covers at least one ed25519 key:

```rust
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
/// ⚠ **On the DETERMINISTIC ARM as of 2026-08-20 — `CLAIMS.md` B-14.** The
/// default signing path is now hedged (RFC 6979 with 32 bytes of fresh
/// entropy as additional data), so it produces a different signature every
/// time and cannot be pinned against `ripple-keypairs`, which is deterministic.
///
/// **What this still pins is what it was ever really for:** the digest choice,
```

⚠ For secp256k1 that byte-for-byte pinning had to move to a **deterministic
test-only arm** when B-14 was ruled, because a hedged signature is not
reproducible. Both B-14 legs made that acceptable **only** on the condition that
the deterministic arm is *the same signing implementation with one input varied,
never a second signer*. Whether the same is achievable for ed25519 is one of the
questions below.

---

## 6. Primary source: `ed25519-dalek` 2.2.0, verbatim

This is the crate the signer already depends on, at the exact version in its
lockfile. It is quoted rather than described because a previous leg on the B-14
packet asserted an API for this crate from memory that **does not exist**
(`SigningKey::sign_with_rng`), and that error was caught only downstream.
**Reason from what is below, not from recollection of this crate.**

### ed25519-dalek 2.2.0 — Cargo.toml [features] (verbatim)
```toml
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

```

### src/hazmat.rs — module header and ExpandedSecretKey (verbatim, lines 1-100)
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

```

### src/hazmat.rs — pub fn raw_sign (verbatim, lines 125-150)
```rust
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
```

### src/signing.rs — SigningKey::try_sign (verbatim, lines 560-572)
```rust
impl KeypairRef for SigningKey {
    type VerifyingKey = VerifyingKey;
}

impl Signer<Signature> for SigningKey {
    /// Sign a message with this signing key's secret key.
    fn try_sign(&self, message: &[u8]) -> Result<Signature, SignatureError> {
        let expanded: ExpandedSecretKey = (&self.secret_key).into();
        Ok(expanded.raw_sign::<Sha512>(message, &self.verifying_key))
    }
}

/// Equivalent to [`SigningKey::sign_prehashed`] with `context` set to [`None`].
```

### src/signing.rs — ExpandedSecretKey::raw_sign and raw_sign_byupdate (verbatim, lines 820-882)
```rust

impl ExpandedSecretKey {
    /// The plain, non-prehashed, signing function for Ed25519. `CtxDigest` is the digest used to
    /// calculate the pseudorandomness needed for signing. According to the spec, `CtxDigest =
    /// Sha512`, and `self` is derived via the method defined in `impl From<&SigningKey> for
    /// ExpandedSecretKey`.
    ///
    /// This definition is loose in its parameters so that end-users of the `hazmat` module can
    /// change how the `ExpandedSecretKey` is calculated and which hash function to use.
    #[allow(non_snake_case)]
    #[allow(clippy::unwrap_used)]
    #[inline(always)]
    pub(crate) fn raw_sign<CtxDigest>(
        &self,
        message: &[u8],
        verifying_key: &VerifyingKey,
    ) -> Signature
    where
        CtxDigest: Digest<OutputSize = U64>,
    {
        // OK unwrap, update can't fail.
        self.raw_sign_byupdate(
            |h: &mut CtxDigest| {
                h.update(message);
                Ok(())
            },
            verifying_key,
        )
        .unwrap()
    }

    /// Sign a message provided in parts. The `msg_update` closure will be called twice to hash the
    /// message parts. This closure MUST leave its hasher in the same state (i.e., must hash the
    /// same values) after both calls. Otherwise it will produce an invalid signature.
    #[allow(non_snake_case)]
    #[inline(always)]
    pub(crate) fn raw_sign_byupdate<CtxDigest, F>(
        &self,
        msg_update: F,
        verifying_key: &VerifyingKey,
    ) -> Result<Signature, SignatureError>
    where
        CtxDigest: Digest<OutputSize = U64>,
        F: Fn(&mut CtxDigest) -> Result<(), SignatureError>,
    {
        let mut h = CtxDigest::new();

        h.update(self.hash_prefix);
        msg_update(&mut h)?;

        let r = Scalar::from_hash(h);
        let R: CompressedEdwardsY = EdwardsPoint::mul_base(&r).compress();

        h = CtxDigest::new();
        h.update(R.as_bytes());
        h.update(verifying_key.as_bytes());
        msg_update(&mut h)?;

        let k = Scalar::from_hash(h);
        let s: Scalar = (k * self.scalar) + r;

        Ok(InternalSignature { R, s }.into())
    }
```

### src/signing.rs — From<&SecretKey> for ExpandedSecretKey (verbatim, lines 805-820)
```rust

/// The spec-compliant way to define an expanded secret key. This computes `SHA512(sk)`, clamps the
/// first 32 bytes and uses it as a scalar, and uses the second 32 bytes as a domain separator for
/// hashing.
impl From<&SecretKey> for ExpandedSecretKey {
    #[allow(clippy::unwrap_used)]
    fn from(secret_key: &SecretKey) -> ExpandedSecretKey {
        let hash = Sha512::default().chain_update(secret_key).finalize();
        ExpandedSecretKey::from_bytes(hash.as_ref())
    }
}

//
// Signing functions. These are pub(crate) so that the `hazmat` module can use them
//

```

---

## 7. The options, as this project currently understands them

You are not restricted to these. If there is a better option, say so and argue it.

**Option A — accept the residual risk as a named gap.** Ed25519 stays pure
RFC 8032. The register carries the gap, a test asserts the determinism so the row
cannot go stale, and the disclosure surfaces say what is and is not hedged. This
is the status quo and it is what B-14's ruling assumed, on the ground that
*"rolling one is worse than the gap"*.

**Option B — hedge the ed25519 nonce.** Adopt a construction that mixes fresh
CSPRNG entropy into the nonce derivation, on the default path, with a
deterministic arm retained for cross-implementation vector pinning — the same
shape B-14 produced for secp256k1.

**Option C — remove the question by not using ed25519.** Require that accounts
this signer manages use secp256k1 seeds, where the ruled hedged construction
already exists. Ed25519 support remains for reading and for compatibility, and is
documented as unhedged. Note that the network's faucet hands out ed25519 seeds by
default, so this is a live operational cost, not a free win.

**Option D — something else.**

---

## 8. The questions

Answer each explicitly. Where you are reasoning rather than reading, say so.

1. **Does the issue #1 ruling extend to the ed25519 signing nonce?** B-14's two
   legs both said the threat-model extension was a *technical conclusion* and the
   ed25519 disposition was a *judgement call*. Do you agree with that split? If
   the extension holds, does anything about ed25519 specifically defeat it?

2. **Was B-14's stated ground for leaving ed25519 open — that randomising it
   means hand-rolling a signature scheme — correct, and is it still correct
   against the crate source in §6?** Be specific about what `hazmat` does and
   does not give a caller, and about what the signature equation would and would
   not change.

3. **If a hedged construction is adopted, specify it.** Precisely enough to be
   reimplemented from your prose alone. In particular: what exactly is hashed,
   what domain separation is used, which values must remain exactly as RFC 8032
   defines them, and which may vary.

4. **The crate's warnings.** `ExpandedSecretKey`'s doc says *"Deriving the values
   for these fields in any other way can lead to full key recovery, as documented
   in `raw_sign`"*, and `raw_sign` cites the `ed25519-unsafe-libs` writeup.
   **Is the warning's scope wider than the attack it cites?** State exactly what
   the cited attack requires, and whether a construction that leaves the secret
   scalar untouched while varying the other field is inside or outside it. If it
   is outside, say what *else* could go wrong.

5. **Entropy failure.** Which of §4's four rules applies to the ed25519 nonce, and
   why? Note ed25519's catastrophic failure mode — the same nonce `r` used across
   two *different* messages reveals the secret scalar immediately — and say
   whether any construction you recommend can reach it, including when the
   CSPRNG returns a constant or repeats.

6. **What it costs.** Under your recommended option, what happens to the
   byte-for-byte pinning against `ripple-keypairs`? Is a deterministic arm
   available that is *the same implementation with one input varied* rather than
   a second signer? Is that arm byte-identical to RFC 8032, or merely
   deterministic?

7. **Wire validity.** Is *"a hedged ed25519 signature is accepted by XRP Ledger
   validators"* establishable by reasoning, or does it have to be executed
   against a real network before it can be claimed? B-14's ruling took the
   position that this was the one thing reasoning could not settle for
   secp256k1. Does the same hold here, and is there any ed25519-specific reason
   it might not (canonicality of `R` or `S`, cofactor handling, batch-verification
   rules, or anything else a validator might check that a local verifier does
   not)?

8. **The strongest case against your own recommendation.** Make it properly. If
   you recommend hedging, include: that enabling a crate's `hazmat` feature
   removes a compile-time guardrail from *this project's own* code, and issue #1's
   losing argument that an adversary who can inject faults can read the key from
   memory anyway. If you recommend accepting the gap, include: that this project
   has already paid for hedging at three other sites under the same threat model,
   and that this is the only site the live path actually uses.

9. **If the answer is Option A**, write the register entry — one paragraph — and
   say exactly what a test must assert so the acceptance cannot decay into an
   oversight. **If the answer is Option B**, say what must be executed before the
   claim *"the ed25519 nonce is hedged"* may be written down anywhere.

10. **Confidence, 0–10, and name the judgement call** — the thing that a
    reasonable reviewer could decide the other way.

---

## 9. Output

Prose and tables. No preamble, no restatement of the packet. Lead with the
ruling in one paragraph, then the numbered answers. If you find a defect in the
code in §5 that is not what you were asked about, say so at the end under a
heading of its own — the last three rounds in this project each found something
that way.
