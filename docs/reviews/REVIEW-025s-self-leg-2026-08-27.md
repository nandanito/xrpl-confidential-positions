# REVIEW-025s — self leg, the B-16 build

**Date:** 2026-08-27. **Frozen commit** `200aae63`. Written **before** either
external leg returned and held in a session scratchpad until both had, per
`CLAUDE.md`: *don't let your own answers appear in the tree a leg is reading.*

⚠ **`REVIEW-024` §4's inverted lesson applies to this document.** In that
rotation the self leg had the degradation rule wrong and both external legs
corrected it. **Being the adjudicator does not make your leg the good one**, and
being the *author* of the code under review makes it worse, not better. Read the
findings below as one reading, not as the answer.

---

## 1. Verdict on the construction

**The code implements `REVIEW-024` §3.** Checked term by term against the
ruling's block, at `signer/src/xrpl.rs:500-543`:

| Ruling §3 | Code | |
|---|---|---|
| `h := H(sk)` | `Sha512::digest(k.to_bytes())` :515 | ✓ |
| `a := clamp(h[0..32])` | `ExpandedSecretKey::from_slice(&h)` :516 → `from_bytes` clamps at `hazmat.rs:93` | ✓ |
| `p := h[32..64]` | same call, `hash_prefix` at `hazmat.rs:89` | ✓ |
| `A := encode(a·B)` | `VerifyingKey::from(&esk)` :538 → `verifying.rs:95-100`, `mul_base(&scalar)` | ✓ |
| `DST`, 29 bytes | `ED25519_NONCE_HEDGE_DST` :555 | ✓ |
| `q := p XOR H(DST ‖ aux)[0..32]` | `mask.update(DST); mask.update(aux)`, then `hash_prefix.iter_mut().zip(mask.iter())` :525-531 | ✓ |
| unmasked ⇒ RFC 8032 | `if let Some(aux)` guards the whole mask :521 | ✓ |
| `raw_sign::<Sha512>` does the arithmetic | :543 | ✓ |
| scalar, base point, transcript, encodings untouched | nothing else is written | ✓ |

**Nit, not a defect:** the `[0..32]` truncation is implicit — it falls out of
`hash_prefix` being 32 bytes and `zip` stopping at the shorter iterator. `mask[..32]`
would say it. The revert sweep's item 6 (mask taken from `mask[32..]`) is what
catches the wrong-half error, so the property is held; it is held by a test
rather than by the expression.

---

## 2. §6 gate by gate

| # | Gate | Status |
|---|---|---|
| 1 | Deterministic arm byte-identical to `ripple-keypairs`, through the new path | **ESTABLISHED**, twice — `the_unmasked_arm_is_byte_identical_to_the_crates_own_rfc_8032` against `ed25519_dalek::SigningKey::sign`, and `xrpl_vectors.rs::each_algorithm_signs_what_ripple_keypairs_signs` unchanged and passing |
| 2 | Test-only fixed `aux`; two values ⇒ distinct `R`, both verify | **ESTABLISHED** — `two_fixed_aux_values_give_two_nonces`, comparing `sig[..32]` rather than whole signatures |
| 3 | `Some([0u8; 32])` differs from the no-mask arm | **ESTABLISHED, AND IT WAS NOT UNTIL THE REVERT SWEEP RAN** — see §3 |
| 4 | Injected entropy failure signs and reproduces the deterministic vector | **ESTABLISHED** — `ed25519_entropy_failure_degrades_to_rfc_8032` |
| 5 | Message separation under a stuck RNG | **ESTABLISHED** — `one_aux_over_two_messages_does_not_reuse_the_nonce`, plus the empty message |
| 6 | Invariants: same key, 64 canonical bytes, strict verifier, vk internal | **PARTIAL** — the first three are established; the fourth is structural and **S2 below is a hole in it** |
| 7 | Devnet, default path, `SigningPubKey` out of the submitted blob | **ESTABLISHED** — `6800175A…`, validated, and the script goes further than the gate asks (§4) |
| 8 | Revert each fix, watch its test fail | **ESTABLISHED** — 11 reverts, all failing, script committed |

## §7 condition by condition

| # | Condition | Status |
|---|---|---|
| 1 | One private helper takes `Option<[u8; 32]>`; both entry points call it; applies to secp256k1 too | **ESTABLISHED** — `sign_with_aux` is private and is the only signing site for either algorithm. **S4 below qualifies it** |
| 2 | Verifying key derived inside the helper, never a parameter | **ESTABLISHED structurally** — the function takes no key. **S2 is about the guard, not the property** |
| 3 | Deterministic and fixed-`aux` entry points `test-support` only | **ESTABLISHED, with a real gate** — `check-test-support-gate.ts`, both directions, both detectors verified by breaking them |
| 4 | Two rounds, second reviews the fixes | **IN PROGRESS.** This is round one |

---

## 3. ⚠ The finding this session made against itself, recorded because it is the pattern

**A revert PASSED.** `REVIEW-024` §6 item 3 — *a successful all-zero draw stays
hedged, only a reported failure omits the mask* — had a test named for it,
`zero_aux_is_hedged_not_a_fallback`, and reverting `fresh_aux` to treat a
successful zero draw as an omission **left all 263 tests green**. The test drove
`Hedge::FixedAux([0u8; 32])`, which enters `sign_with_aux` and never reaches
`fresh_aux`, the function that decides `Some` vs `None`.

**This is the third instance of one failure mode in one artifact's history**, and
the point is that it keeps arriving in a new disguise:

1. `aux_is_exactly_one_field_of_entropy` — could not see entropy recycling,
   because recycled entropy still produces distinct signatures.
2. `one_implementation_not_two` — could not see implementation identity, because
   two correct signers pass every assertion it made (`REVIEW-024` §4d).
3. `zero_aux_is_hedged_not_a_fallback` — could not see the zero-draw decision,
   because the decision is made one function earlier.

**Only the revert sweep found the third.** Reading the test found nothing; the
test looks correct and its assertion is true. `CLAUDE.md`'s *revert every fix and
watch its test fail* is what pays here, and this is the strongest instance of it
the project has.

Fixed by `store::next_entropy_draw_returns_for_test` and
`a_successful_all_zero_draw_still_hedges` (plus the secp256k1 twin).

---

## 4. Findings against this build

### S1 — ⚠ `the_dst_is_the_ruled_bytes` IS A TAUTOLOGY, and a comment claims otherwise. **HIGH**, as a claim; **LOW**, as a risk

`tests/hedged_signing.rs`:

```rust
const RULED_DST: &[u8] = b"WCONF/ed25519-nonce-hedge/v1\0";
...
assert_eq!(RULED_DST, b"WCONF/ed25519-nonce-hedge/v1\0", "the domain separator is not the ruled string");
```

**It compares a literal to the same literal.** It never touches
`xrpl::ED25519_NONCE_HEDGE_DST`, which is `pub(crate)` and therefore unreachable
from an integration test. Its own doc comment says it exists so that *"a test
that reads `xrpl::ED25519_NONCE_HEDGE_DST` and compares it to itself checks
nothing"* — and it then does the same thing one level out.

Worse, the constant in `xrpl.rs:552-555` says:

> *"`the_dst_is_the_ruled_bytes` pins all 29 of them against a literal written
> out in the test rather than against this constant."*

**That sentence is false.** The test pins a literal against a literal; the
constant is not in its blast radius.

**Why the risk is nonetheless LOW:** the code's DST *is* pinned, transitively and
behaviourally, by `the_construction_matches_an_independent_implementation` —
whose vectors were produced by a different implementation under the ruled DST, so
a changed constant changes every signature. Revert sweep items 3 and 4 (one byte
changed; the trailing NUL replaced) both fail on it. **The construction is
correct and defended; the test named for the DST is decorative and the comment
about it is an overclaim.**

**Remedy, and I am confident in this one:** make `ED25519_NONCE_HEDGE_DST` `pub`
— it is a constant, not a capability, and publishing it removes nothing — and
assert `xrpl::ED25519_NONCE_HEDGE_DST == RULED_DST`. Then correct the constant's
doc comment.

### S2 — ⚠ The verifying-key drift check is `debug_assert_eq!`, so the ONLY binary that signs real transactions does not have it. **MEDIUM**

`xrpl.rs:539`:

```rust
let vk = VerifyingKey::from(&esk);
debug_assert_eq!(vk.as_bytes()[..], self.public[1..], "verifying key drift");
```

`debug_assert!` is compiled out under `--release`, and `make signer-release` is
what produces the binary a holder runs. The check sits directly under a comment
explaining that a mismatched verifying key *"gives an attacker two equations in
one unknown and recovers the secret scalar"* — so a reader takes it for a guard
against exactly that, and in the shipping build it is not there at all.

**The property it checks is not actually at risk today** — `vk` is derived from
the same expanded key three lines above, and `self.public` from the same seed —
so this is a guard against a *future* edit, which is precisely the kind that
survives to release.

⚠ **And it is the same shape as `CLAIMS.md` B-20 and `REVIEW-014`**: a protection
that is present in the build you test and absent from the build you ship.

**Remedy:** a hard check. `OneShotAux`'s precedent is a `panic!` — *continuing
with recycled entropy is worse than stopping* — and `[profile.release]
panic = "abort"` makes that a clean stop. Returning `Err` is the alternative and
would be untestable-by-construction. I lean to the hard assert and I am **not**
confident which is right; both are better than a compiled-out one.

### S3 — `Sha512::digest(k.to_bytes())` copies the 32-byte secret onto the stack, in the same commit that turned `zeroize` on. **LOW**

`SigningKey::to_bytes` (`signing.rs:114`) returns `SecretKey` **by value**;
`as_bytes` (`signing.rs:120`) returns `&SecretKey`. The copy is a stack local
that no `Drop` reaches, made three lines into the function whose sibling commit
enabled zeroization so that secret material is wiped.

It is one of several — `h`, `mask` and `fresh_aux`'s `b` are the others, and the
B-19 decision §4 names them and files the general case as **B-21**. This one is
distinguishable because it is **gratuitous**: `as_bytes()` exists, is the same
length of code, and removes the copy.

**Remedy:** `Sha512::digest(k.as_bytes())`. Trivially safe.

### S4 — `Hedge::Fresh` has exactly one reference in the repository: its own match arm. **LOW**

`grep -rn 'Hedge::Fresh'` returns `xrpl.rs:644` and nothing else. `sign_message`
calls `fresh_aux()` directly, so the default path does not go through `Hedge` at
all — which is deliberate and good, because it means a release build has no
`Hedge`. The consequence is that `Hedge::Fresh` is **a second entry to fresh
entropy that nothing exercises**.

That is a small version of the problem §7 item 1 is about. It is not a live
defect — the arm is one line and calls the same `fresh_aux` — but *"a path
nothing exercises"* is how the last three defects in this file arrived.

**Remedy:** delete the variant, or add the one test that drives it. I lean to
deleting: the type exists for the vector and fixed-`aux` arms, and `Fresh` is
what `sign_message` already is.

### S5 — the KAT's strength is asymmetric between the two arms, and nothing says so. **LOW**, as a claim

`t-ed25519-hedge-construction.ts` refuses to emit unless its **unmasked** arm
reproduces `@noble`'s `ed25519.sign` byte for byte. That is a genuine third
implementation and it establishes the scalar arithmetic, the encodings and the
transcript.

**It cannot do the same for the masked arm.** No third-party library computes a
W-CONF-hedged signature, so the mask itself is checked by **two independent
readings of the same prose** — mine in Rust and mine in TypeScript — and by
nothing outside this repository. The unmasked control means a shared arithmetic
error is impossible; a shared *misreading of §3* is not.

This is not fixable with what exists, and the honest form is to say it. The
mitigation that does exist: the ruling's §3 is precise enough that the two
readings had to agree on byte order, concatenation order and which half of the
hash, and the revert sweep breaks each of those individually.

**Remedy:** state the limitation in the test's doc comment. Nothing more is
available.

---

## 5. Overclaims

- **`xrpl.rs:552-555`** — *"`the_dst_is_the_ruled_bytes` pins all 29 of them"*.
  **False**, per S1.
- **`xrpl.rs:539`'s surroundings** — the `debug_assert` reads as a guard against
  the attack described immediately above it, and is absent from release. Per S2.
  Not a false sentence, but a misleading juxtaposition.
- **The commit message** — checked line by line against what ran. *"Eleven
  reverts, every one producing a failing test"*, *"265 tests, three consecutive
  clean runs"*, the Devnet hash and the `0xED` prefix all hold. **No overclaim
  found**, which given this project's history I distrust and is one reason two
  external legs are reading it.
- **`REVIEW-024` §6's own standard** — the accurate sentence is now *"the signer
  hedges ed25519"* rather than *"it has been ruled for adoption"*, because all
  eight items have executed. I believe that flip is earned. **It is the single
  claim in this build most worth a leg disagreeing with me about.**

## 6. B-19 — accept

The evidence that the omission was accidental is `git log -S`, one commit, the
line copied from the `k256` line above it. The evidence that it is confined to
`ed25519-dalek` is `elliptic-curve-0.13.8`'s **mandatory** `zeroize` dependency
and its unconditional `impl<C> ZeroizeOnDrop for SecretKey<C>` — so the identical
two words are harmless one line up, which is why nobody noticed for nine days.
The check is a trait bound, so a revert does not compile.

⚠ It has **no independent leg** and its justification is deliberately not the
nonce ruling's. A leg that thinks a dependency-hygiene change does not belong in
a cryptographic build commit is making a reasonable process objection and I would
not argue with it.

## 7. Findings outside the question

**`make signer-release`'s comment claimed a verification the recipe did not
perform** — *"verified by compiling a release binary that references them and
watching it fail to resolve"* above a bare `cargo build --release`. That is
`REVIEW-014`'s own shape surviving inside the target named after its fix, for
seven days. Corrected in this commit, and `make check-test-support` is what
establishes it now. **Found by trying to satisfy §7 item 3, not by reading.**

**Two pre-existing warnings** are untouched and confirmed pre-existing by
stashing the change: an `unused_doc_comment` on `store.rs:135`'s `thread_local!`
and an unused `Confirmer` import in `tests/support/mod.rs`. Out of scope,
recorded so a leg does not report them as new.

## 8. Confidence: **7**

The construction is high-confidence — it is eight lines, term-for-term against a
normative block, agreeing byte for byte with a second implementation, and
executed on a public ledger.

What holds it at 7 is **S1 and the pattern it belongs to**. Three tests in this
file's history have been named for properties they could not see, one of them
found *in this session*, by a mechanical sweep rather than by reading — and the
fourth instance is a test I wrote today and did not notice until I grepped for
the constant's callers. **I do not believe I have found the last one**, and a
self leg is the worst instrument for that particular defect, because the blind
spot that writes the test also writes the review of it.

**What would move it up:** an external leg confirming §3 term by term from the
crate source in this packet, and finding no fifth instance. **What would move it
down:** any leg finding one.
