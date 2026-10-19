# REVIEW-018 — RULING on `CLAIMS.md` B-14: the transaction's ECDSA nonce `k`

**Date:** 2026-08-20. **Two independent legs**, both answering the same packet
with no knowledge of each other: `REVIEW-018a` (Gemini, effort high),
`REVIEW-018b` (Codex, read-only sandbox).

**Status: RULED for secp256k1. OPEN for ed25519** — the ed25519 half is
`CLAIMS.md` **B-16** and B-14 is *not* closed by this.

> ⚠ **SUPERSEDED IN PART, 2026-08-27 — read this banner before §5.** `REVIEW-024`
> ruled the ed25519 half: three independent legs, all ruling that the issue #1
> extension holds there too and that the residual is **not** accepted. **This
> document is left unedited below as the historical record**, and two of its
> statements are now known to be wrong rather than merely superseded:
>
> - §5's *"Randomising it needs `ed25519-dalek`'s `hazmat` surface or a vetted
>   hedged construction … rolling one is worse than the gap"* — the caution was
>   right, the premise was not. `SigningKey::try_sign` already **is**
>   `raw_sign`, so hedging changes one 32-byte field and no arithmetic.
> - The leg claim underlying it named `SigningKey::sign_with_rng`, an API
>   `ed25519-dalek` 2.2.0 does not have (`grep -rn "sign_with_rng"` over the
>   unpacked crate: 0 lines, 2026-08-27).
>
> §5's instruction — *"Do not mark B-14 closed by fixing only secp256k1"* — was
> honoured: B-14 is closed on 2026-08-27 because **both** halves are ruled, and
> ⚠ **ruled is not built.** See `REVIEW-024-RULING-ed25519-nonce-2026-08-27.md`.

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
