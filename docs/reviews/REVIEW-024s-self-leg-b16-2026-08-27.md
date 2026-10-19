# REVIEW-024s — SELF LEG on `CLAIMS.md` B-16: the ed25519 signing nonce

**Date:** written 2026-08-26 late evening, filed under 2026-08-27 with the rest of
`REVIEW-024` — the session crossed midnight between this leg and the
adjudication, and the filename follows the ruling rather than the keystroke.
**Written before either external leg returned**, and held in
the session scratchpad rather than the tree until they did (`CLAUDE.md`: *don't
let your own answers appear in the tree a leg is reading*). The Codex leg was
launched first because it backgrounds; its output was not read before this was
written.

⚠ **This leg had repository and filesystem access and the external legs did
not.** That is not a virtue — it means this leg's factual claims about
`ed25519-dalek` are readings and the external legs' are recollections, so where
we disagree on what the crate does, **this leg is checkable and they are not**,
and where we disagree on *judgement* that asymmetry buys nothing.

---

## The ruling, in one paragraph

**Option B — hedge it.** The issue #1 extension holds at this site for the same
reason it held at `k`, and nothing about ed25519 defeats it; if anything the
deterministic-EdDSA fault literature makes this site the *better* documented of
the two. **B-14's stated ground for leaving ed25519 open is false against the
crate source**: hedging here does not mean hand-rolling a signature scheme, it
means calling `ed25519_dalek::hazmat::raw_sign::<Sha512>` — which is the exact
function `SigningKey::try_sign` already calls — with one 32-byte field of
`ExpandedSecretKey` replaced. The signature equation, the scalar arithmetic, the
point compression and the encoding are untouched upstream code. The entropy rule
is the **sigma-nonce shape: degrade, do not refuse.** The cost is real but
smaller than B-14's: the deterministic arm stays *byte-identical to RFC 8032*, so
the cross-implementation vector pin against `ripple-keypairs` survives intact —
which is more than the secp256k1 arm got. **Conditional on execution**: nothing
may say "the ed25519 nonce is hedged" until a hedged ed25519 signature has been
accepted into a validated ledger, with the algorithm decoded out of the submitted
blob.

---

## 1. Does the issue #1 ruling extend to the ed25519 nonce?

**Yes, and the split B-14's legs drew is right: the extension is a technical
conclusion, the disposition is a judgement.** I agree with the split and I differ
from B-14 only on the disposition.

The B-14 argument transfers without modification, because it was never about
ECDSA:

> `k` protects the **XRPL account key**, and under the ruled keygen construction
> (REVIEW-012c) that same key is the input the ElGamal decryption key is derived
> from. So a `k` failure is a spending failure **and** a confidentiality failure,
> welded together by this project's own keygen ruling.

Every word of that is true of the ed25519 nonce, and this signer's ed25519 keys
are derived from `sEd…` family seeds that the keygen ruling then re-uses as the
ElGamal derivation input. Substituting "the ed25519 nonce" for "`k`" produces a
true sentence.

**Nothing about ed25519 defeats the extension. One thing sharpens it.** The
attack that hedging exists to stop is *better established* against deterministic
EdDSA than against RFC 6979 ECDSA, and the reason is structural. An EdDSA
signature is `(R, s)` with `s = r + H(R ‖ A ‖ M)·a`. If an adversary obtains two
signatures over the *same* message where the nonce `r` is identical and the
second differs by a fault in the challenge or the multiply, then

    s − s′ = (H − H′)·a   ⟹   a = (s − s′) / (H − H′)

recovers the secret scalar from **one** faulted signature plus one clean one.
**Pure determinism is what guarantees the precondition**: re-signing the same
message always regenerates the same `r`, so the adversary does not need to win a
race or catch a collision — they can ask for the signature twice.

⚠ **Marked as reasoning, not reading.** I did not fetch the fault-attack
literature this session; the derivation above is from the signature equation
quoted verbatim in the packet (`signing.rs::raw_sign_byupdate`) and is
self-contained. My recollection is that this is the Poddebniak et al. (2018)
class of attack on deterministic signature schemes, and a reader should treat the
attribution as unverified and the algebra as checkable.

**The contrary argument, which lost at issue #1 and is quoted in the packet** —
an adversary who can fault the computation can read `sk_A` out of process memory
— is not weaker here than it was there. It is exactly as strong, and it lost.
Re-litigating it at the fourth site, after paying for it at three, would be
deciding the same question differently on a Tuesday.

---

## 2. Was B-14's ground for leaving ed25519 open correct?

**It was correct about hand-rolling and wrong about the premise.** Both legs said
some version of *"randomising it needs `ed25519-dalek`'s `hazmat` surface or a
vetted hedged construction, and rolling one for symmetry is worse than the gap"*,
and the ruling adopted that: *"Agreed: rolling one is worse than the gap."*

**Rolling one would indeed be worse. That is not what this requires.** Against the
crate source in the packet:

- `SigningKey::try_sign` is, in full:
  ```rust
  let expanded: ExpandedSecretKey = (&self.secret_key).into();
  Ok(expanded.raw_sign::<Sha512>(message, &self.verifying_key))
  ```
  (`signing.rs`, quoted in packet §6.) **The default path already goes through
  `raw_sign`.** The `hazmat` feature does not add a second signing routine; it
  makes the one that is already running *reachable by name*, along with the
  struct it takes.

- `ExpandedSecretKey` is `{ pub scalar: Scalar, pub hash_prefix: [u8; 32] }`, and
  the nonce is derived at exactly one line of `raw_sign_byupdate`:
  ```rust
  let mut h = CtxDigest::new();
  h.update(self.hash_prefix);
  msg_update(&mut h)?;          // the message
  let r = Scalar::from_hash(h);
  ```
  **`hash_prefix` enters the computation once, as the first 32 bytes of the nonce
  hash preimage, and nowhere else.** It does not touch `scalar`, `R`, the
  challenge, or `s`.

- Therefore hedging is: compute the nonce hash's first input differently, and
  call the same upstream function. **Nothing this project writes performs any
  elliptic-curve arithmetic, no encoding changes, and the RFC 8032 equation is
  not reimplemented.** The claim *"this would be hand-rolling randomised
  Ed25519"* is false against that source.

⚠ **This is the fourth time in this project's record that a review conclusion was
sound and its supporting premise was not**, and it is worth being precise about
which half failed. B-14's legs were right that a bespoke scheme is worse than the
gap. They appear to have assessed the crate from recollection — one of them
asserted `SigningKey::sign_with_rng`, an API this crate **does not have** at
2.2.0 (I searched `src/signing.rs` and `src/hazmat.rs`; the randomised entry
points are `raw_sign`, `raw_sign_prehashed`, `raw_sign_byupdate`, all taking an
`ExpandedSecretKey`, none taking an RNG). Having got the surface wrong in one
direction, the cost estimate came out wrong in the other.

---

## 3. The construction

Notation: `seed32` is the 32-byte ed25519 secret this signer already computes as
`SHA512Half(entropy)` from the `sEd…` family seed (`xrpl.rs::ed25519_from_entropy`).

```
  H            := SHA-512
  esk          := ExpandedSecretKey::from_bytes(H(seed32))
                    # scalar     = clamp(H(seed32)[0..32]) as a Scalar   — UNCHANGED, RFC 8032
                    # hash_prefix =        H(seed32)[32..64]             — the field we vary
  vk           := VerifyingKey::from(&esk)          # derived from esk.scalar, never supplied
  aux          := 32 bytes from store::getrandom, or [0u8; 32] if it fails   # DEGRADE
  prefix'      := H( "W-CONF/ed25519-nonce-hedge/v1" ‖ esk.hash_prefix ‖ aux )[0..32]
  esk'         := ExpandedSecretKey { scalar: esk.scalar, hash_prefix: prefix' }
  signature    := hazmat::raw_sign::<Sha512>(&esk', message, &vk)
```

**The deterministic arm is the same expression with the `prefix'` line removed**
— i.e. `raw_sign::<Sha512>(&esk, message, &vk)`, which is `SigningKey::sign`
byte for byte, because it is the same call with the same inputs.

**What must stay exactly as RFC 8032 defines it:**

- `scalar`. It is the key. Varying it signs under a different key while
  presenting the same `vk`, which is the actual documented catastrophe (§4).
- `vk`. It must be derived from `esk.scalar` and must never be an argument this
  signer accepts from anywhere. `VerifyingKey::from(&ExpandedSecretKey)` exists
  and is what `SigningKey::from_bytes` itself uses (`signing.rs:105`), so there
  is no reason to pass anything else.
- The message. `raw_sign` hashes it directly; ed25519 hashes internally and
  pre-hashing signs the wrong thing — a hazard `xrpl.rs` already documents.

**What varies:** `hash_prefix`, and only through the tagged hash above.

**Why the secret prefix stays in the preimage rather than being replaced by
`aux`.** If `hash_prefix` were set to `aux` alone, then a CSPRNG that is
predictable to the adversary makes `r = H(aux ‖ M)` **computable by the
adversary**, which is a total break — strictly worse than determinism. Mixing
keeps the floor at "a deterministic scheme keyed by a secret", which is where the
site stands today. This is the same reason the sigma-nonce hedge XORs a mask over
the long-lived secret rather than replacing it.

**Domain separation.** The tag is fixed, versioned, and contains no message
material. A `v2` tag is a different scheme, not an upgrade — but unlike the
keygen derivation it is **not** a fork, because nothing on the ledger is bound to
it: any nonce scheme produces signatures the same verifier accepts. This is the
one place in this project where a versioned label is cheap, and that is worth
saying out loud so nobody imports issue #10's caution here.

---

## 4. The crate's warnings — scope versus citation

The two warnings, verbatim from the packet:

> `ExpandedSecretKey`: *"**WARNING:** Deriving the values for these fields in any
> other way can lead to full key recovery, as documented in [`raw_sign`] and
> [`raw_sign_prehashed`]."*

> `raw_sign`: *"Using the wrong values in `ExpandedSecretKey` can leak your
> signing key. See [here](https://github.com/MystenLabs/ed25519-unsafe-libs) for
> more details on this attack."*

**The warning's scope is wider than the attack it cites, and the gap matters
here.**

⚠ **Named gap: I did not fetch the `ed25519-unsafe-libs` writeup this session.**
What follows about it is recollection and is marked as such; the *structural*
argument after it does not depend on the recollection and is checkable against
the packet's source quotes.

- **Recollection, unverified:** `ed25519-unsafe-libs` catalogues libraries whose
  signing API accepts a public key **as a separate argument** from the private
  key, so that a caller can pass a `vk` that does not correspond to the secret.
  Two signatures over the same message under two different supplied public keys
  then yield two equations in the same unknown scalar, and the scalar falls out.
  The hazard is a **`verifying_key` mismatch**.

- **Structural, from the packet's own source:** `raw_sign`'s three parameters are
  `esk`, `message`, `verifying_key`. The only one a caller can get *silently and
  catastrophically* wrong is `verifying_key`, because it is the only one that
  appears in the challenge hash without appearing in the scalar arithmetic:
  ```rust
  h.update(R.as_bytes()); h.update(verifying_key.as_bytes()); msg_update(&mut h)?;
  let k = Scalar::from_hash(h);
  let s = (k * self.scalar) + r;
  ```
  A wrong `verifying_key` changes `k` while `self.scalar` stays the real key —
  which is precisely the two-equations-one-unknown shape.

**So: a construction that leaves `scalar` untouched and derives `vk` from that
same `scalar` is outside the cited attack.** It cannot produce the mismatch,
because there is no second source for the public key.

**What else could go wrong, enumerated rather than waved at:**

| Hazard | Reachable here? |
|---|---|
| `verifying_key` mismatched to `scalar` | **No** — `vk` is derived from the esk, never an argument |
| `scalar` altered | **No** — copied unchanged; a test must assert it |
| `hash_prefix` made public or attacker-predictable | **No** — the secret prefix is in the preimage |
| Nonce `r` repeated across two *different* messages | **No** — `M` is in the nonce preimage, so a repeat needs a SHA-512 collision |
| Caller-supplied entropy | **Must be no** — architecture §3 rule 5 forbids it on any endpoint that can sign; `aux` is drawn internally through `store::getrandom`, like every other site |
| Secret material left in memory | ⚠ **Yes, and it is already true today** — see §8's extra finding |

---

## 5. Entropy failure — which rule, and why

**The sigma-nonce shape. Degrade, do not refuse.**

- Entropy here is a **hedge over a deterministic core that is safe on its own**.
  That core is RFC 8032, which is the standard construction and is what this
  signer does today. Degrading returns the site to where it stands now.
- `r`/`ρ`'s "refuse to sign" does not apply, and importing it would be the merge
  `CLAUDE.md` names: there, entropy **is** the source and the value is published
  on chain. Here it is a mask over a secret-keyed hash.
- Keygen's "no failure path" does not apply: the input is not a fixed seed.
- Refusing would convert a transient entropy failure into a liveness failure on
  the **live** signing path, which is the argument that already carried at B-14.

⚠ **Precisely as at the sigma nonces, degrading lands on a *different fixed*
construction, not on RFC 8032's bytes.** With `aux = 0³²`, `prefix'` is
`H(tag ‖ prefix ‖ 0³²)[0..32]` — a fixed function of the secret. That is the
behaviour issue #1's implementation note recorded and called *"arguably better
than leg A's stated 'degrades safely to the deterministic core'"*, and it means
**the hedged and deterministic arms are never byte-compatible**. Say it in the
ruling; a session that assumes zeros recover RFC 8032 will write a false test.

**Can any of this reach ed25519's catastrophic mode — the same `r` across two
different messages?** **No, and the reason is specific rather than reassuring.**
`r = H(prefix' ‖ M)` keeps `M` in the preimage under every value of `aux`,
including a constant one, including a repeating one. A CSPRNG that returns the
same 32 bytes forever yields a *deterministic scheme*, not a colliding one. The
failure that destroys EdDSA is reachable only by replacing the nonce with raw
randomness — which is why this construction mixes into the hash instead. **This
is the load-bearing reason "degrade" is safe here, and it is not the same reason
it was safe at `k`.**

---

## 6. What it costs

**The vector pin survives, and better than secp256k1's did.**

`tests/xrpl_vectors.rs` pins both algorithms byte-for-byte against
`ripple-keypairs@2.0.0` and asserts the set covers an ed25519 key. Under this
construction the ed25519 pin moves to `Hedge::DeterministicForVectors`, exactly
as the secp256k1 pin did — and the arm is **the same function with one input
varied** in a stronger sense than secp256k1's arm can claim:

| | secp256k1 (B-14, shipped) | ed25519 (proposed) |
|---|---|---|
| Both arms call | `k256`'s signer, via two different entry points (`sign_prehash` / `sign_prehash_with_rng`) | **the same `raw_sign::<Sha512>`, one call site** |
| Difference between arms | additional data present vs. absent | one 32-byte field of one struct |
| Deterministic arm equals the standard | yes — pure RFC 6979 | yes — **byte-identical RFC 8032**, because it is `SigningKey::sign`'s own expression |

**The real costs, stated rather than minimised:**

1. ⚠ **Enabling `hazmat` is a project-wide guardrail removal, not a local one.**
   The feature is what keeps `ExpandedSecretKey`'s fields and `raw_sign` out of
   reach; turning it on makes the `verifying_key`-mismatch hazard constructible
   anywhere in this crate, forever, for the sake of one function. **This is the
   single strongest argument against Option B** and it is a real cost, not a
   formality. Mitigation, and it must be a condition of the ruling rather than a
   suggestion: one private function is the only caller, `vk` is derived from the
   `esk` inside it, and a test asserts both.
2. A signing-path change on the **live** path. Every account this project holds
   is ed25519, so a defect here is a defect everywhere, immediately. That argues
   for the two-round gate, not against the change.
3. `#[cfg(feature = "hazmat")]` gates the module's *publicity*; the code is
   compiled either way (the packet's source says so: *"even without `hazmat` we
   still need this module because this is where `ExpandedSecretKey` is
   defined"*). So there is no performance or size cost, only an exposure one.

---

## 7. Wire validity — reasoning is not enough

**Reasoning gets close and this project's own standard does not accept close.**

What reasoning establishes: `R` is `EdwardsPoint::mul_base(&r).compress()`, a
canonical compressed point; `s` is a `Scalar`, canonically reduced. A signature
in that shape is a well-formed RFC 8032 signature under any conforming verifier,
and **a verifier cannot tell how `r` was derived** — it checks
`s·B = R + H(R‖A‖M)·A` and nothing else. That is the same argument B-14 made for
secp256k1 and then declined to rely on.

What it does not establish, and there is an ed25519-specific reason to be careful:
verifier behaviour on ed25519 genuinely does diverge between implementations —
cofactor-multiplied versus strict equations, canonicality of `R` and `A`, batch
versus single verification. **Our signature is a fresh honest one and sits in the
intersection of every such accept set**, so the risk is low; but "low" is not the
standard this project applies, and ⚠ **the rippled source is not in this
checkout, so its ed25519 verification path could not be read at source today.**
That is a named gap, not a reason to assert.

**Condition, and it should be written into the ruling in these words:** the
sentence *"the ed25519 nonce is hedged"* may not appear in this repository until a
hedged ed25519 signature has been **accepted into a validated ledger**, with the
algorithm **decoded out of the submitted blob** rather than inferred from which
account was used.

⚠ **That last clause is not pedantry — it is B-14 §6's trap, run backwards.**
There, the first Devnet run proved nothing because every account is ed25519 and
the ruling had changed secp256k1. Here the same accounts make the *easy* run the
*right* one, which is exactly the circumstance in which nobody checks.

---

## 8. The strongest case against my own recommendation

**Made properly, because the answer is close.**

1. **The guardrail trade is genuinely unattractive.** Option B removes a
   compile-time protection against a documented full-key-recovery bug class from
   this project's own crate, permanently and globally, to remove a nonce
   determinism that only matters to an adversary who is already executing code on
   the holder's machine. A reviewer can reasonably say the exchange is bad.
2. **Issue #1's losing argument has not become weaker.** An adversary who can
   inject a fault into this process can read the scalar out of it. Under that
   view every hedge this project has bought is defence against a threat model
   that, if real, defeats the whole daemon anyway.
3. **`CLAIMS.md` P-5 caps the benefit.** Nothing here becomes secure. B-14's own
   §7 says the ruling is *"not that hedging makes anything secure"*.
4. **Change risk on the live path.** The gap is theoretical; a signing bug is not.
5. **B-14 chose the other way on this exact question six days ago**, with two
   independent legs, and *"we found a nicer API"* is a thin basis for reversal.

**Why it still loses.** (1) is the only one of the five that is about ed25519
rather than about hedging in general, and it is answerable by construction —
one call site, `vk` derived internally, a test on both. (2) and (3) were argued
and decided at issue #1 and re-deciding them here makes this project's threat
model a function of which file is open. (4) is what the two-round build gate is
for. (5) is the one I take most seriously, and the answer is that B-14 did not
decide the ed25519 question on its merits — **it declined it on a cost estimate,
and the estimate is checkably wrong** (§2). Reversing a cost estimate is not
reversing a ruling.

### Extra finding, outside what was asked

⚠ **`ed25519-dalek` is configured with `default-features = false, features =
["std"]`, so `zeroize` is OFF.** The crate's defaults are
`["fast", "std", "zeroize"]`. The consequences are separable:

- **`zeroize` off** means `SecretKey` and `ExpandedSecretKey` are **not**
  overwritten on drop, despite the crate's own doc for `ExpandedSecretKey`
  saying *"Instances of this secret are automatically overwritten with zeroes
  when they fall out of scope"* — which is true only under that feature. **This
  is true today, before any B-16 change**, and it sits next to a disclosure this
  signer already prints about not pinning memory against swap. Option B would put
  one more copy of expanded secret material on the stack, which raises the
  priority without creating the problem.
- **`fast` off** means `curve25519-dalek` runs without precomputed tables — a
  performance choice, not a correctness one, and plausibly deliberate.

I did not check whether the omission was intentional. **Recommend it be filed as
its own item rather than folded into B-16**, because a fix to it should not
inherit a nonce ruling's justification.

---

## 9. If the ruling goes the other way

**If Option A is chosen**, the register entry should say this and not less:

> **B-16 — accepted as a named residual risk.** The ed25519 signing nonce is
> RFC 8032 deterministic. The issue #1 ruling extends to it on the same reasoning
> that carried at the sigma nonces and at `k`; the risk is accepted anyway,
> because enabling `ed25519-dalek`'s `hazmat` feature removes a compile-time
> guard against a documented full-key-recovery bug class from the whole crate in
> order to fix one call site. ⚠ **This is an acceptance, not an absence of
> risk**, and it is the *live* path: every account this project holds is
> ed25519, so the hedged secp256k1 path is the one that is rarely exercised.
> **Revisit if** `ed25519-dalek` exposes a hedged signing entry point that does
> not require `hazmat`, or if this signer ever runs on a shared host, a hypervisor
> the holder does not control, or one process for more than one holder
> (`REVIEW-005b` §6's triggers).

And the test must assert **more than determinism**, which is all the current one
does. `ed25519_is_still_deterministic_and_that_is_a_tracked_gap` fails if somebody
randomises ed25519 — a useful tripwire — but it cannot fail if the *acceptance*
decays into an oversight, because an acceptance decays by being forgotten, not by
being contradicted. Under Option A the test should also assert that the
disclosure surface still says which algorithm is hedged and which is not, the way
this project's other acceptances are pinned to a wording.

**If Option B is chosen**, §7's execution condition is what gates the claim, and
the build gets the standard two rounds with the second reviewing the fixes.

---

## 10. Confidence, and the judgement call

**7.5 / 10**, and the number is lower than B-14's legs gave for a reason: the
*technical* half here is unusually solid — the crate source is quoted, the nonce
enters at one line, the equation is untouched — while the *disposition* turns on
a trade this leg cannot quantify.

**The judgement call, named:** whether removing `ed25519-dalek`'s `hazmat`
guardrail from this crate permanently is a worse marginal risk than the
deterministic nonce it removes. I say no, on the condition that the ruling
constrains the call site. **A reasonable reviewer who weights "do not widen a
crate's dangerous surface for a defence-in-depth gain" above consistency with
three prior rulings decides this the other way, and they are not being
unreasonable.**

⚠ **What this leg is worst at:** it read the crate and then recommended the thing
the crate made easy. That is the shape of a conclusion driven by what was
convenient to check. The external legs are better placed on §8, which is where I
would look first for the correction.
