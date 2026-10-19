# REVIEW-024 — RULING on `CLAIMS.md` B-16: the ed25519 signing nonce

**Date:** 2026-08-27. **Three independent legs**, all answering the same packet
(`REVIEW-024-REQUEST-b16-ed25519-nonce-2026-08-27.md`) with no knowledge of each
other: `REVIEW-024a` (Gemini, `agy --effort high`), `REVIEW-024b` (Codex,
read-only sandbox), `REVIEW-024s` (self leg).

**Status: RULED. B-14 is now closed** — both halves of the transaction signing
nonce have a ruling. **B-16 is ruled and NOT implemented**, and the two are
different things; §6 is what stands between the ruling and any sentence claiming
the signer hedges ed25519.

⚠ **Both external legs answered from the packet alone, with no filesystem and no
tools.** The self leg had repository access and was written to a session
scratchpad *before* either external leg returned, and committed only after both
had (`CLAUDE.md`: don't let your own answers appear in the tree a leg is
reading). The Codex leg was launched first because it backgrounds; its output was
not read until the self leg was written.

---

## 1. The ruling

> **The issue #1 ruling extends to the ed25519 signing nonce, and the residual
> risk is NOT accepted.** Ed25519 signing uses a **hedged nonce prefix** on the
> default path: 32 bytes of fresh CSPRNG entropy, tagged-hashed and **XORed over
> the RFC 8032 nonce prefix**, with the secret scalar, the public key, the
> challenge transcript and the signature equation left exactly as RFC 8032
> defines them. **A reported entropy failure omits the mask and degrades to
> byte-identical RFC 8032; it does not refuse.** ⚠ **A successful draw of
> thirty-two zero bytes is not an omission and stays hedged.** Byte-for-byte
> vector pinning against `ripple-keypairs` moves to a deterministic arm which is
> the same `raw_sign` call with the mask not applied.

**All three legs ruled Option B independently.** Gemini at 9.0 confidence, Codex
at 8, the self leg at 7.5. That unanimity is worth less than it looks and §4c
says why.

## 2. Why — and the reason is not symmetry

`CLAUDE.md` and the B-14 ruling both say it: **symmetry is not a security
argument.** This ruling does not rest on one.

**The extension is the same argument that carried at `k`, and it was never about
ECDSA.** From `REVIEW-018` §2: the nonce protects the **XRPL account key**, and
under the ruled keygen construction (`REVIEW-012c`) that key is the input the
ElGamal decryption key is derived from, so a nonce failure is a spending failure
**and** a confidentiality failure welded together by this project's own keygen
ruling. Substituting "the ed25519 nonce" for "`k`" in that sentence produces a
true sentence, and all three legs said so.

**One thing sharpens it here rather than softening it.** An EdDSA signature is
`(R, s)` with `s = r + H(R ‖ A ‖ M)·a`. Two signatures sharing a nonce `r` under
two different challenges give

    s₁ − s₂ = (k₁ − k₂)·a   ⟹   a = (s₁ − s₂)·(k₁ − k₂)⁻¹ (mod ℓ)

— the secret scalar by one subtraction and one inversion, with none of the
lattice machinery ECDSA bias attacks need. **Pure determinism is what supplies
the precondition**: re-signing the same message regenerates the same `r` by
construction, so an adversary does not have to win a race, only ask twice. Both
external legs derived this independently from the equation quoted in the packet.

⚠ **This is not a claim that RFC 8032 is defective.** It is not, it is the
standard, and it remains this construction's floor and its fallback. The argument
is that pure determinism is the case hedging exists for, and issue #1 put the
adversary that exploits it in scope.

**And this is the arm the project actually uses.** Every account this project
holds on Devnet has an `sEd…` seed. B-14 hedged the arm that is exercised by one
spike; the arm every real transaction uses was left deterministic. That is the
imbalance this ruling removes.

## 3. The construction

Normative. Precise enough to reimplement from this prose alone, which is the
standard `REVIEW-012` §2 was held to.

Let `sk` be the 32-byte ed25519 secret this signer already computes as
`SHA512Half(entropy)` from the `sEd…` family seed. Let `H` be SHA-512.

```
  h            := H(sk)                          # 64 bytes
  a            := clamp(h[0..32]) as a Scalar    # UNCHANGED, exactly RFC 8032
  p            := h[32..64]                      # the standard nonce prefix
  A            := encode(a·B)                    # UNCHANGED, derived from a

  DST          := b"WCONF/ed25519-nonce-hedge/v1" ‖ 0x00      # 29 bytes, fixed

  aux          := 32 bytes from the signer's own CSPRNG

  q            := p                        if the mask is not applied
  q            := p XOR H(DST ‖ aux)[0..32]      if it is

  signature    := the ordinary pure-Ed25519 signature over M with q substituted
                  for the nonce prefix:
                      r = reduce_ℓ( H(q ‖ M) )
                      R = encode(r·B)
                      k = reduce_ℓ( H(R ‖ A ‖ M) )
                      s = (r + k·a) mod ℓ
                      emit R ‖ encode(s)
```

**When the mask is applied:**

| Case | Mask |
|---|---|
| Default signing path, entropy draw succeeded | **applied** |
| Default signing path, entropy draw **reported a failure** | **not applied** — byte-identical RFC 8032 |
| The deterministic arm, for cross-implementation vectors | **not applied** |
| ⚠ Entropy draw **succeeded and returned 32 zero bytes** | **applied** — this is a hedged signature, not a fallback |

**In implementation terms**, and this is not optional detail: build the standard
`ExpandedSecretKey` from `H(sk)`, replace **only** its `hash_prefix` field with
`q`, and call `ed25519_dalek::hazmat::raw_sign::<Sha512>` in **both** modes. The
crate performs the reduction, the base-point multiplication, the point
compression, the challenge hash, the scalar arithmetic and the encoding. **This
project writes no elliptic-curve arithmetic and does not reimplement RFC 8032.**

**What must not vary, ever:**

- **`a`**, its clamping, and its relationship to `A`.
- **`A`.** It must be derived inside the signing function from the same expanded
  key. ⚠ **A caller-supplied verifying key is forbidden at this call site.** It
  is the one input to `raw_sign` that appears in the challenge without appearing
  in the scalar arithmetic, which is exactly the two-equations-one-unknown shape
  §2 describes, and it is what the crate's warning is really about (§4a).
- The base point, the group order, the encodings, the challenge transcript
  `R ‖ A ‖ M`, and the message bytes. **Pure Ed25519, not Ed25519ph** — this
  signer already signs the message directly because ed25519 hashes internally,
  and pre-hashing would sign the wrong thing.
- `aux` is drawn **inside** the signer, through the same `getrandom` every other
  site uses. Architecture §3 rule 5 forbids caller-supplied randomness on
  anything that can sign, and that rule governs here.

**Nothing auxiliary goes on the wire.** The signature is 64 ordinary bytes.

### 3a. ⚠ Two sound constructions; this one was chosen on consistency, not security

The legs split on the combiner. Gemini and the self leg proposed
`q = H(DST ‖ p ‖ aux)[0..32]`; Codex proposed the XOR above. **Both are sound and
the difference is not a security difference** — under either, `q` stays secret
while `p` does, and the mask depends on nothing an adversary supplies.

**The XOR was ruled because this project already hedges that way.** Site 1's
sigma nonces are *"32 bytes of auxiliary randomness, tagged-hashed and XORed over
the long-lived secret"* (issue #1's ruling, implemented in the vendored fork).
One hedging idiom in the project beats two, and it is the one whose behaviour
under a dead RNG has already been measured here rather than argued.

⚠ **A reviewer who prefers the hash form is not wrong, and this paragraph exists
so a later session does not read the choice as load-bearing and defend it as
though it were.**

## 4. Leg recommendations adjudicated

`CLAIMS.md` E-93's precedent: a rejected — or corrected — review claim belongs in
a test or in a ruling, not in a note nobody re-reads.

### 4a. ⚠ B-14's ground for leaving ed25519 open was FALSE, and this ruling rests on that

`REVIEW-018` §5 said: *"Randomising it needs `ed25519-dalek`'s `hazmat` surface or
a vetted hedged construction. Gemini: 'I would not recommend hand-rolling
randomized Ed25519 for XRPL just to achieve symmetry.' Agreed: rolling one is
worse than the gap."*

**The caution was right. The premise was wrong.** Hedging here does not mean
rolling a signature scheme:

- `SigningKey::try_sign` is, in full, `expanded.raw_sign::<Sha512>(message,
  &self.verifying_key)`. **The default path already goes through `raw_sign`.**
  The `hazmat` feature adds no second routine; it makes the one already running
  reachable by name.
- `hash_prefix` enters the computation at exactly one line — `h.update(self.hash_prefix)`,
  the first input to the nonce hash — and touches nothing else.

**Both external legs reached this independently from the crate source in the
packet, and both said B-14's statement was too broad.** Codex put the residue
precisely: *"What remains hand-specified is the nonce-prefix combiner. The crate
provides the mechanism, not a vetted randomized-Ed25519 construction."* That is
accepted, and it is why §6 and §7 exist.

⚠ **How B-14 got it wrong is the part worth keeping.** One of its legs asserted
`SigningKey::sign_with_rng`, an API `ed25519-dalek` 2.2.0 **does not have**.
**P-12's falsifier, run 2026-08-27:** `grep -rn "sign_with_rng"` over the whole
unpacked crate at `2.2.0` returns **0 lines**, and `grep -rln
"with_rng\|RandomizedSigner"` over `src/` returns **no files**.
Having the surface wrong in one direction produced a cost estimate wrong in the
other, and a ruling deferred a live-path question on it for six days.
**Reversing a cost estimate is not reversing a ruling** — B-14 never decided the
ed25519 question on its merits; it declined it on a price that was never checked
at source.

### 4b. The self leg's degradation rule was WRONG, and the external legs corrected it

The self leg ruled that entropy failure lands on `H(tag ‖ p ‖ 0³²)` — *a
different fixed construction* — reasoning by analogy from issue #1's note that
the sigma hedge *"degrades to a different fixed construction"* rather than to the
deterministic core.

**Both external legs ruled the opposite and both are right.** Entropy failure
omits the mask and lands on **byte-identical RFC 8032**. Three reasons, none of
which the self leg had:

1. It matches the **shipped** neighbouring site rather than an anecdote about a
   third one. `xrpl.rs`'s `Hedge::aux` already returns `Ok(None)` on failure, and
   `None` takes `sign_prehash` — pure RFC 6979, byte-identical to the
   deterministic arm. B-14 degrades to the standard construction; so does this.
2. It makes the failure path **testable by equality** against the deterministic
   arm. A third construction would be a third thing to pin and nothing outside
   this repository could check it.
3. Issue #1's note was an *observation about a C-level XOR over a witness*, not a
   design goal. The self leg promoted a recorded side effect into a rule.

⚠ **And the distinction B-14 §4a got wrong runs the other way here.** There, a leg
treated `aux = 0³²` and *omitted* as interchangeable and they are not. Here the
same pair must stay distinct in the opposite direction: **a successful zero draw
is masked, only a reported failure is not.** Codex named this without being
prompted — *"This pins the same distinction B-14 previously got wrong"* — and §6
requires a test for it.

### 4c. ⚠ Unanimity was cheap here, and the packet is why

All three legs ruled Option B, and the two external ones ruled it from **source
this adjudicator selected and pasted into the packet**. That is not three
independent confirmations of a fact; it is one reading of a crate, distributed.

The proof is a leg getting it wrong in the direction the packet steered:

> **Codex:** *"`raw_sign_byupdate`, which could directly alter the nonce
> transcript, is `pub(crate)` and unavailable to this project."*

**False.** `hazmat.rs:210` declares `pub fn raw_sign_byupdate`, public under the
feature. Codex could not have known — **the packet quoted `hazmat.rs` lines
1–100 and 125–150 and omitted line 210**, while including the `pub(crate)` method
of the same name from `signing.rs`. The leg reasoned correctly from what it was
given and was wrong because of what it was not.

**Nothing in this ruling depends on it** — the construction uses `raw_sign` — but
it is the `CLAUDE.md` warning landing on the person who wrote it: *a diff bounds
a leg to what you chose to show it, and your choices are your blind spots.* An
excerpt is a diff by another name. Recorded as `CLAIMS.md` E-160.

### 4d. Accepted from Codex: behavioural tests do not establish one implementation

> *"`one_implementation_not_two` does not establish its named property. It checks
> semantic compatibility, not implementation identity. A separate correct signer
> would pass."*

**Correct, verified at source.** `tests/hedged_signing.rs:141` asserts both arms
are DER, both low-`S`, both verify under the same key and digest. Two
independently written correct signers pass all of that. **Both `REVIEW-018` legs
made the single-implementation property the condition on which the whole
deterministic arm was acceptable, and the test named for it cannot see it.**

The property has to be enforced by **structure**, not asserted by behaviour: one
private helper takes the auxiliary input, and both entry points call it. That is
a condition on the B-16 build (§7) and it applies to the secp256k1 arm too. The
existing test keeps its assertions and loses its name.

## 5. What it costs

| | secp256k1 (B-14, shipped) | ed25519 (this ruling) |
|---|---|---|
| Both arms call | `k256`, via two entry points | **the same `raw_sign::<Sha512>`, one call site** |
| Difference between arms | additional data present vs. absent | one 32-byte field of one struct |
| Deterministic arm vs. the standard | pure RFC 6979, **shipped and pinned** | **byte-identical RFC 8032** — ⚠ a *prediction*, not a measurement: it follows from `raw_sign` with an unmodified prefix being the same expression `SigningKey::sign` evaluates, and §6 item 1 is what turns it into evidence |
| `ripple-keypairs` byte-for-byte pin | kept, on the deterministic arm | kept, on the deterministic arm |

**The vector pin survives.** `tests/xrpl_vectors.rs` pins both algorithms against
`ripple-keypairs@2.0.0` and asserts the set covers an ed25519 key; that assertion
moves to the deterministic arm and keeps its full value, because the arm is the
RFC 8032 expression rather than an approximation of it.

**The costs, stated rather than minimised:**

1. ⚠ **Enabling `hazmat` is a project-wide guardrail removal for one call site.**
   All three legs named this as the strongest argument against, and it is. The
   feature is what keeps `ExpandedSecretKey`'s fields and `raw_sign` out of
   reach; turning it on makes the verifying-key-mismatch mistake constructible
   anywhere in this crate, permanently. §7 constrains it; nothing eliminates it.
2. **A signing-path change on the live path.** Every account this project holds
   is ed25519, so a defect here is a defect everywhere, at once. That argues for
   the two-round build gate, not against the change.
3. **A project-specific combiner to maintain and re-review.** The crate supplies
   the mechanism, not the construction.
4. One SHA-512 and one 32-byte draw per signature. Not material.
5. Default signatures stop being reproducible, which is what the deterministic
   arm exists for.

There is **no** compile-size or performance cost from the feature itself: the
`hazmat` module is compiled either way, and the feature gates only its
publicity — the crate says so in the source quoted in the packet.

## 6. ⚠ What must be executed before anything says "hedged"

**B-16 is ruled and open.** Until every item below has run, the accurate sentence
is *"hedged ed25519 has been ruled for adoption"*, and **not** *"the signer hedges
ed25519"*. Codex stated the distinction and it is adopted verbatim as the gate.

1. **The deterministic arm is byte-identical to `ripple-keypairs`** on the
   existing ed25519 vectors, through the new code path.
2. **A test-only fixed-`aux` input exists**, under `test-support`, so the
   construction is drivable rather than only observable. Two distinct fixed
   `aux` values must give distinct `R` and both must verify under the same key
   and message.
3. ⚠ **`Some([0u8; 32])` differs from the no-mask arm.** This is §4b's
   distinction and it is the one B-14 got wrong in the mirror direction.
4. **An injected entropy failure signs successfully and produces exactly the
   deterministic vector.** Degrade, not refuse, demonstrated rather than
   asserted.
5. **Message separation under a stuck RNG.** The same fixed `aux` over two
   different messages gives different `R`; the same fixed `aux` over the same
   message reproduces exactly. This is what says the mask did not replace the
   message in the nonce preimage.
6. **Invariants**: both modes carry the identical public key, emit canonical
   64-byte signatures, pass a strict verifier, and the verifying key is derived
   internally at the call site.
7. **Devnet execution.** A confidential transaction signed on the **default**
   path from an `sEd…` account, with `SigningPubKey` **decoded out of the
   submitted blob** and confirmed `0xED`, reaching a validated ledger.
8. ⚠ **Revert each fix and watch its test fail.** A revert that passes is a
   finding; a revert that does not compile proves nothing.

⚠ **Item 7 is not a formality and item 7's phrasing is not pedantry.** Wire
validity is establishable by reasoning only as far as *"a conforming verifier
cannot see how `r` was derived"* — which is true, and which `REVIEW-018` §6
declined to rely on for secp256k1. **The rippled source is not in this checkout,
so its ed25519 verification path could not be read at source on 2026-08-27; that
is a named gap, not an assertion.** (P-12's falsifier, run the same day:
`find / -maxdepth 6 -type d -name rippled` and `find ~ -maxdepth 5 -iname
Transactor.cpp` each return **0**. The `Transactor.cpp:1645-1651` citations
elsewhere in this repository were read in an earlier session against a tree that
is no longer present.) Ed25519 verifiers genuinely diverge on
canonicality and cofactor handling; an honestly generated signature sits in the
intersection of every such accept set, which is a reason to expect success and not
evidence of it.

⚠ **And B-14 §6's trap runs backwards here.** There, the obvious Devnet run
proved nothing because every account is ed25519 and the ruling had changed
secp256k1. Here the obvious run is the *right* one — which is exactly the
circumstance in which nobody checks what was actually exercised. Decode the blob.

## 7. Conditions on the build

1. **One private helper takes `Option<[u8; 32]>`** and both entry points call it.
   §4d: the single-implementation property is structural or it is absent. This
   applies to the secp256k1 arm as well.
2. **The verifying key is derived inside that helper** from the same expanded
   key. It is never a parameter this signer accepts.
3. **The deterministic and fixed-`aux` entry points are `test-support` only.**
   ⚠ Today `Hedge` and `sign_message_with` are `pub` in an ordinary build and
   only a doc comment says "for vectors only" — Codex found this and it is
   verified: every caller is a test, and nothing enforces that. This is the same
   shape `REVIEW-014` found when the README claimed a release build dropped
   `test-support` and it did not. Recorded as `CLAIMS.md` **B-20**.
4. **Full adversarial rotation, two rounds, and the second reviews the fixes.**
   `CLAUDE.md`'s gate for cryptographic design. This ruling is round zero of the
   decision, not round one of the build.

## 8. What this ruling does NOT claim

- **Not** that RFC 8032 is broken. It is the standard, it is the fallback, and it
  is what the deterministic arm still produces byte for byte.
- **Not** that hedging makes anything secure. `CLAIMS.md` P-5 governs and the
  issue #1 ruling's own limit stands: an adversary with code execution reads the
  scalar from process memory regardless.
- **Not** that the construction is vetted by `ed25519-dalek` or by anyone
  upstream. The crate supplies `raw_sign`; the combiner is this project's.
- **Not** that ed25519 is hedged. It is **ruled**, and §6 is the difference.
- **Not** that unanimity across three legs is strong evidence. §4c.

## 9. Findings outside the question

The packet invited them and each leg found one. All three verified at source.

| # | Finding | Status |
|---|---|---|
| 1 | `one_implementation_not_two` does not establish its named property (Codex) | §4d; **condition on the build** |
| 2 | The deterministic arm is `pub` in an ordinary build; "for vectors only" is a doc comment (Codex) | `CLAIMS.md` **B-20** |
| 3 | `ed25519-dalek` is configured `default-features = false, features = ["std"]`, so **`zeroize` is off** — while the crate's own doc for `ExpandedSecretKey` says instances *"are automatically overwritten with zeroes when they fall out of scope"*, which holds only under that feature (Codex **and** the self leg, independently) | `CLAIMS.md` **B-19**. ⚠ **True today, before any B-16 change.** Deliberately **not** folded into this ruling: a fix to it should not inherit a nonce ruling's justification |
| 4 | `decode_ed25519_seed` reports `Version { want: VER[0], got: body[0] }`, so a seed whose first prefix byte matches but whose second or third does not produces *"expected 0x01, got 0x01"* (Gemini) | **Fixed on this branch**, with a test |

## 10. Confidence

Gemini 9.0, Codex 8, self leg 7.5. **The adjudicator takes the low end.**

The **technical** half is unusually solid: the crate source is quoted, the nonce
enters at one line, the signature equation is untouched, and the deterministic
arm is byte-identical to the standard. The **disposition** turns on a trade
nobody here can quantify — a permanent widening of a crate's dangerous surface
against a defence-in-depth gain on the one path that is actually used.

**The judgement call, named:** whether enabling `ed25519-dalek`'s `hazmat`
feature is a worse marginal risk than the deterministic nonce it removes.
**A reviewer who weights "do not widen a dangerous surface for defence in depth"
above consistency with three prior rulings decides this the other way and is not
being unreasonable.** What decided it here is that issue #1 already answered the
threat-model half, at cost, three times — and re-deciding it at the fourth site
would make this project's threat model a function of which file is open.
