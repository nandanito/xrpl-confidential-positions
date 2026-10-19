# REVIEW-032s — SELF LEG — B-24, round two

Frozen `2cf6ee186a6bec0d801fd9ed22f11d20c01c789b`.

## ⚠ THIS LEG IS NOT INDEPENDENT AND MUST NOT BE COUNTED AS CORROBORATION

It was written **after reading `REVIEW-032a` (agy/Gemini)** and while the Codex
leg was still running. On findings 1, 3 and 5 below it is **measurement of
another leg's prediction**, not a second sighting. `CLAIMS.md` E-160's neighbour:
a leg that has read another leg's report agrees for a reason that is not
evidence.

**Independent of both legs:** findings 2 and 6, and every entry in *What I
checked and found CORRECT*.

## Findings

### 1. `strip_line_comments` false-passes on a NESTED block comment — MEASURED

**`tools/check-zeroize-bounds.py:504`.** `REVIEW-032a` predicted it; I ran the
gate's own function in isolation:

```
input : /* /* */ pub fn decode_family_seed(seed: &str) -> R<(Zeroizing<[u8; 16]>, …
output: '     pub fn decode_family_seed(seed: &str) -> R<(Zeroizing<[u8; 16]>, …)> { */'
needle survives stripping? True   count: 1
```

⚠ **Nested block comments are legal Rust and the whole construct is a comment**,
so a reviewer commenting out a decoder this way removes the wipe and part 6 still
reports `present`. The scanner clears `in_block` on the **first** `*/`.

⚠⚠ **This is the FIFTH instance of a gate built to catch false passes
false-passing (E-165, E-168, E-182, E-198) — and the `/* */` handling was
E-198's own fix, shipped one commit ago.** E-198's lesson was *the `//` half
looked at the comment syntax in front of it and not at the language's other one*.
**B-24 then looked at `/* */` and not at the language's nesting rule.** Same
sentence, one layer down.

**Grade: MEDIUM.** (Not HIGH: it needs someone to write a nested comment, and the
gate's job is accidental regression. But part 6's needles are the *only* pin on
the HIGH fix, which is what stops this being LOW.)

**Falsifier:** make `strip_line_comments` count nesting depth; the probe above
must then report `False`. A control belongs in the gate, like `CONTROL(/* */)`.

### 2. `single_decode_findings` misses a second decode INSIDE its own scope — MEASURED, INDEPENDENT

**`tools/check-zeroize-bounds.py:677`.** The request asked for *the mutation the
controls do not run*. There are three, and **the first is inside `derive_raw`
itself**, which is the one area the check claims to cover:

| mutation | caught? |
|---|---|
| secp-only revert to `from_family_seed` (the gate's own control) | yes |
| ed-only revert to `from_family_seed` (the gate's own control) | yes |
| ⚠ **`xrpl::decode_ed25519_seed(family_seed)` added inside `derive_raw`** | **NO** |
| `from_family_seed` added to `derive_from_master_seed` | **NO** |
| `from_family_seed` added to `derive_from_master_seed_with_account` | **NO** |

The check counts `decode_family_seed` and greps for `from_family_seed`. **A
second decode through the *other* decoder satisfies both rules.** ⚠ `REVIEW-032a`
found the two wrapper cases; it did not find this one, and this one is the
serious one because it is the function the check is scoped to.

⚠ **The mechanism is the one the request predicted: the controls replay
`REVIEW-031b`'s exact mutation, so they prove the gate catches the LAST attack.**

**Grade: MEDIUM.** **Falsifier:** count decodes rather than spellings — assert
`derive_raw`'s body contains exactly one call to any seed decoder — and add a
control that runs each of the three mutations above.

### 3. Two hand-restated counts, both stale, one falsified BY B-24 ITSELF — MEASURED

⚠ **`signer/tests/profile_parse_b23.rs:24` says *"These four tests are that
falsifier"* and the file has FIVE `#[test]`** (lines 58, 74, 85, 126, 141).
⚠⚠ **B-24 is the commit that added the fifth AND rewrote the paragraph two lines
above the number without touching it.**

⚠ **`tools/check-zeroize-bounds.py:5` says *"Three questions"*; the script has
SIX parts** and prints six. ⚠⚠ **B-24 fixed the count in part 6's header by
deriving it (E-199) and left the count in the file's own opening docstring
wrong** — E-168's sentence exactly (*a fix applied to the instance the
adjudicator was looking at, rather than to the phrase*), landing on the commit
that was fixing a count.

**Grade: LOW each, MEDIUM as a pair** — this is the **tenth** instance and the
second inside a fix for the ninth. **Falsifier:** derive both, or delete the
number. `len(B23_SITES)` is the model; a docstring cannot count itself, so the
honest fix there is to name the parts rather than count them.

### 4. `REVIEW-032a`'s "needle inside a string literal" — UPHELD but re-graded LOW

**Confirmed** by the same probe: `let _bypass = "<needle>";` leaves the needle
counted. But this is a property of **substring detection**, not of B-24, and it
requires an adversary writing the needle into a string on purpose. The gate's
stated guarantee is a NAMED SET against regression, not against a hostile
committer. **Grade: LOW**, and it is worth one sentence in the gate's own
"what this does not say" block rather than a code change.

### 5. `REVIEW-032a`'s finding 3 (the KATs miss `finish()`) — ⚠ REJECTED, MEASURED

**`REVIEW-032a` says the KATs "NEVER call `finish()`" and "do not test the actual
`sk` and `pk` derivation". Both are false.**

`signer/tests/keygen_kat.rs:89` calls `keygen::derive_from_master_seed`, **which
calls `finish()` at `keygen.rs:403`**, and asserts `hex(key.public()) == v.pk`
and `key.address()` against the published vectors. `finish()` is covered by the
KATs on every vector.

**And the NEW entry point is covered too**, which the leg also missed:
`signer/tests/onboarding.rs:725` `a_prompted_seed_keeps_every_secret_off_disk`
loads a `derived-from-master-seed` profile through `holder.rs` — the only caller
of `derive_from_master_seed_with_account` — and asserts **both** halves of what
B-24 changed: `p.account.account_id() == ACCOUNT_ID` (a constant, not a
re-derivation) and `p.elgamal.public()` against the other entry point.

⚠ **The point underneath is still worth recording (E-170):** the new entry point
has **no direct test**; its coverage is entirely via one holder test. That is
coverage, so it is not a finding — but it is one test away from being one.

### 6. An UNNAMED behaviour change on the derived path — INDEPENDENT, ⚠ PREDICTED, NOT YET MEASURED

**`signer/src/holder.rs:455→510`.** B-24 moved `AccountKey::from_family_seed`
from **above** the `key_source` match into the **standalone arm only**. That
changes error variants and ordering for malformed input:

| profile | before B-24 | after B-24 (predicted) |
|---|---|---|
| derived source + malformed seed | `ProfileError::Field("account_seed: …")` | `ProfileError::Keygen(…)` |
| unrecognised `elgamal_key_source` + malformed seed | `Field("account_seed: …")` | the key-source error |
| derived source + `elgamal_sk` present + malformed seed | `Field("account_seed: …")` | the "declares derived and carries a secret" error |

⚠⚠ **This is EXACTLY round one's finding 7 (E-197) again, one file away and in
the fix rather than in the thing fixed**: a mechanism swap that changes *which
error* the operator sees, documented as though it changed nothing. B-24's own
comment at `holder.rs:467` lists what was given up — *"the tautological
`expected_account_id` check and the 'one call shape' argument"* — **and does not
mention that the seed is no longer validated before the key-source branch.**

⚠ **The impact is the error, not acceptance: all three still refuse.** Same
shape, same severity as E-197.

**Grade: LOW.** ⚠ **MARKED PREDICTED. The adjudicator must measure it** — a leg's
"two compile errors" was one when measured last round (E-170).

**Falsifier:** load the three profiles above and read the variant. If they still
give `Field`, I have misread the control flow and this is withdrawn.

### 7. ⚠ **CLAIMS.md STILL SAYS PART 5 PINS "FOURTEEN" SITES. IT PINS THIRTEEN — AND B-24 IS WHAT MADE IT THIRTEEN.** MEASURED, INDEPENDENT

**`CLAIMS.md`, the B-22 row.** Measured: `len(B22_SITES) == 13`, and part 5
prints thirteen site lines.

⚠⚠ **B-24 retired the `Zeroizing(entropy)` / `zeroize_source_copy` needle — the
right call, since the producer fix left no bare source to guard — and updated
`CLAUDE.md` to *"thirteen named sites"* (`git log -S` puts that edit in
`9878046`) while leaving `CLAIMS.md`'s *"the fifth pinning FOURTEEN named
sites"* untouched from `5623648`.**

The row date-stamps its *parts* count — *"five AT B-22, SIX as of B-23"* — and
leaves the *sites* count undated, so it reads as current. It is not.

⚠ **This is E-168's sentence landing on the register itself: *a fix applied to
the instance the author was looking at, rather than to the phrase*. Two documents
carry the same count; B-24 corrected one.** And it is a COUNT, so it is also
E-199 — ⚠ **the eleventh instance, and the second one B-24 committed while
fixing the ninth and tenth.**

**Grade: MEDIUM.** Higher than findings 3's counts because `CLAIMS.md` is the
register — the document whose job is to be the thing other documents are checked
against — and because the *correct* number was written into a neighbouring file
in the same commit.

**Falsifier:** `python3 -c "…; print(len(B22_SITES))"` → 13. If it prints 14 I
have miscounted and this is withdrawn.

## What I checked and found CORRECT — recorded so the absence is legible

* ⚠ **Attack point 2 — dropping `expected_account_id` on the derived path — is
  SOUND, and it is TESTED.** `derive_raw` builds `account` from the decoded
  entropy with the same `match algo` on the same two constructors that
  `AccountKey::from_family_seed` uses (`xrpl.rs:474`, `keygen.rs:280`). They
  cannot differ without the dispatch drifting, and `the_two_seed_dispatches_agree`
  (`keygen_interop.rs:386`) fails if it does. **`a_prompted_seed_keeps_every_secret_off_disk`
  then pins the derived path's account against a constant.** The removed comment
  was right that the check was tautological.
* ⚠ **Finding 1's fourth site really was fixed by the producer, with nobody
  editing it.** `looks_like_a_family_seed` (`onboarding.rs:263`) is still
  `decode_family_seed(arg).is_ok()` — unchanged text — and now discards a
  `Zeroizing<[u8; 16]>` that wipes on drop. **This is the strongest evidence for
  B-24's central claim** that fixing the producer beats four call-site guards.
* **No bare `[u8; 16]` secret remains in the crate.** Swept `signer/src/`: every
  live hit is a comment or `store.rs`'s `install_id`, which is not a secret.
* **All six gates PASS at the frozen commit**, part 6 printing 10 checks
  (9 needles + 1 scoped check) with all seven controls OK — including the new
  `CONTROL(/* */)`, which does catch the **single**-level block comment it is
  written for.
* **The gate's docstring claim that a `//` inside a string literal is
  safe-direction is TRUE** — measured; that case strips more and makes the
  needle harder. ⚠ **It is the GENERALISATION that is false** (finding 1), not
  the example given.
* `wrapping_a_copy_array_leaves_the_source_and_the_helper_wipes_it`
  (`keygen.rs:492`) is **not** made stale by B-24: `zeroize_source_copy` is still
  live for `*sk.as_bytes()` in `finish()`, which is what the comment at
  `keygen.rs:253` claims.

## What I did not check

* I did not re-derive P-5, the four named residuals, or the measured zero-error
  decoder revert — the request concedes all of it.
* ⚠ **I did not look for a FIFTH unnamed residual**, which the request says is a
  finding if one exists. Codex has repo access and the time; this is the gap in
  my own leg and it is named rather than left implicit.

## ⚠⚠ WHAT THIS LEG MISSED, added after `REVIEW-032b` returned

**It missed the round's HIGH, and it missed it while looking straight at it.**

`REVIEW-032b` finding 1: `finish()` binds `sk` — **the derived ElGamal secret** —
from `reduce_wide_total`, and never wipes it. The comment three lines below says
`sk` is *"a `k256` type this crate does not own"*. ⚠ **It is
`crate::scalar::Scalar`, `signer/src/scalar.rs:133`, a `Copy` newtype over
`[u8; 32]` with no `Drop` and no `Zeroize` anywhere in the file.**

⚠ **I read `finish()` twice** — once to answer attack point 3, once to check that
`wrapping_a_copy_array_leaves_the_source_and_the_helper_wipes_it` had not gone
stale — **and both times I read the comment as the answer to the question the
code was posing.** That is the exact failure `CLAIMS.md` E-181 records
(*the construction was sound and the DESCRIPTION was hiding a real gap*) and it
is what this leg was supposed to be looking for.

⚠ **The self leg is the one that had already read the codebase, and it is the one
that trusted the comment.** Recorded because it is the argument for external legs
in its strongest form: my findings 2, 3 and 7 are all gate and prose defects —
the class a self leg CAN find — and the one finding about a live secret came from
the leg with no prior investment in the code.
