# REVIEW-032c — ADJUDICATION — B-24, round two

Frozen `2cf6ee186a6bec0d801fd9ed22f11d20c01c789b`. Legs: **032a** Gemini 3.1 Pro
(inline packet, no tools), **032b** Codex (read-only repo), **032s** self.

⚠ **THE ADJUDICATOR IS THE INTERESTED PARTY — IT WROTE B-24 — SO THE DIRECTION IS
RECORDED: this ruling goes AGAINST the build on every contested point except one,
and that one is a leg's claim measured and found false.**

## Verdict

⚠⚠ **B-24 LEFT THE DERIVED ELGAMAL SECRET UNWIPED AND WROTE A COMMENT
MISIDENTIFYING THE TYPE TO EXPLAIN WHY IT COULD NOT BE.** That is `CLAIMS.md`
E-181's shape, one milestone later, in the function B-24 created.

⚠⚠ **AND THE PIN ON B-24's OWN HIGH FIX DOES NOT PIN IT.** Part 6's two decoder
needles match on the SIGNATURE, so the wipe can be undone in the body while both
still count 1 — measured.

**Round two found something round one's fixes got wrong. Fourth consecutive
milestone.**

## Findings, every one verified at source before it was accepted

| # | leg | finding | verified how | verdict |
|---|---|---|---|---|
| 1 | **032b only** | ⚠⚠ **`finish()` never wipes `sk`, the DERIVED ELGAMAL SECRET, and the comment says `sk` is *"a `k256` type this crate does not own"*** | read at source: `keygen.rs:42` is `use crate::scalar::reduce_wide_total`; `scalar.rs:233` returns `Scalar`; `scalar.rs:132-133` is `#[derive(Clone, Copy, …)] pub struct Scalar([u8; 32])`; `grep -n "Zeroize\|zeroize\|impl Drop" signer/src/scalar.rs` → **no hits at all** | **UPHELD — HIGH** |
| 2 | **032b only** | ⚠⚠ **Both decoder wipes can be undone while both part-6 needles still pass** — the needles are signatures; move the wipe out of the body (`let mut out = [0u8; 16]; … Ok(Zeroizing::new(out))`) | **MEASURED**: mutation applied to `xrpl.rs` in memory, gate's own `strip_line_comments` + counts → **`[1, 1]`**, and `let mut out = [0u8; 16];` is back | **UPHELD — HIGH** (032b graded MEDIUM; ⚠ **raised**, see below) |
| 3 | 032a, 032b, 032s | **`strip_line_comments` still false-passes, two ways, and its *"never easier"* claim is false** | **MEASURED both**: `/* /* */ <needle> */` → needle survives, count 1 (032a predicted, 032s measured); `const DECOY: &str = r#"let raw/*x*/= Zeroizing::new("#;` → needle **absent** in source, **present** after stripping (032b) | **UPHELD — MEDIUM** |
| 4 | 032a, 032b, 032s | **`single_decode_findings` misses four mutations** | **MEASURED**, each through the real function: a second `decode_ed25519_seed` **inside `derive_raw`** (032s); an external helper `derive_raw` calls (032b); `from_family_seed` added to either public wrapper (032a) — all four return `[]` | **UPHELD — MEDIUM** |
| 5 | 032b | **`derive_from_master_seed_with_account` is not KAT-covered for ed25519** | read at source: its only caller is `holder.rs:497`; its only test is `a_prompted_seed_keeps_every_secret_off_disk`, whose `SEED` is `sp6Jdw…` — **secp256k1**. No ed25519 profile reaches it | **UPHELD — LOW** |
| 6 | 032b | **One rustdoc block documents `expected_account_id` and then a function that has no such parameter; `derive_from_master_seed` lost its doc entirely** | read at source, `keygen.rs:336-360` vs `:398` | **UPHELD — LOW** |
| 7 | 032b, 032s | ⚠ **FIVE stale hand-restated counts**, listed in full below | **MEASURED**: `len(B23_SITES)`=9 vs *"EIGHT needles"*; `len(B22_SITES)`=13 vs `CLAIMS.md` *"FOURTEEN"*; 5 `#[test]` vs *"four tests"*; 6 parts vs *"Three questions"*; a retired needle still called *"Site 7"* | **UPHELD — MEDIUM as a set** |
| 8 | 032b | **A comment says the decoder return type is *"what part 2 reverts"*. `REVERTS` has no decoder entry** | **MEASURED**: `'decode_family_seed' in REVERTS_block` → `False`; and `check-zeroize-bounds.py:700-703` says the opposite in the same file | **UPHELD — LOW** |
| 9 | **032s only** | **An UNNAMED behaviour change: moving `from_family_seed` into the standalone arm changed which error four malformed profiles produce** | **MEASURED** with a throwaway test: derived → `Keygen`, standalone → `KeySourceFields`, bad source → `UnknownKeySource`, derived+`elgamal_sk` → `KeySourceFields`. **All four were `Field("account_seed: …")` before B-24**, because the decode ran above the match | **UPHELD — LOW** |
| 10 | 032a | *"The KATs NEVER call `finish()` … do not test the actual `sk` and `pk` derivation"* | **MEASURED**: `keygen_kat.rs:89` calls `derive_from_master_seed`, **which calls `finish()` at `keygen.rs:403`**, and asserts `hex(key.public()) == v.pk` on every vector | ⚠ **REJECTED — false.** ⚠ **The point underneath is UPHELD as finding 5** (E-170): the *new* entry point's ed25519 wiring is genuinely unpinned |
| 11 | 032a | A needle written into a string literal counts as present | **MEASURED**: true | **UPHELD — LOW**, subsumed by finding 3 |

## ⚠ Where I ruled AGAINST a leg's own grade, and why

**Finding 2, raised MEDIUM → HIGH.** `REVIEW-032b` graded it MEDIUM. I am the
author of the thing being graded, so raising it needs a reason that is not taste:

* B-24's central claim is *"the fix is the PRODUCER"*, and `CLAIMS.md` B-24 says
  in the same breath that it **has no compile-time falsifier** and that
  **part 6 pins it at source**. That sentence is the whole warrant.
* The mutation is not exotic. `let mut out = [0u8; 16]; … Ok(Zeroizing::new(out))`
  is **the exact idiom this session hit four times** (E-178) and the exact idiom
  B-24 removed from `derive_raw`. It is what a well-meaning later edit produces.
* So the one guard on the milestone's headline fix is blind to its own most
  likely regression. That is HIGH.

## The five stale counts, in full

| where | says | is |
|---|---|---|
| `check-zeroize-bounds.py:649` | *"EIGHT needles are pinned below"* | **9** |
| `check-zeroize-bounds.py:658` | *"Site 7 — keygen's single decode"* | that needle was **retired by B-24** |
| `check-zeroize-bounds.py:5` | *"Three questions"* | **six parts** |
| `CLAIMS.md`, B-22 row | *"the fifth pinning **FOURTEEN** named sites"* | **13** |
| `profile_parse_b23.rs:24` | *"These **four** tests are that falsifier"* | **5** |

⚠⚠ **Two of these were falsified by B-24 ITSELF.** It retired a `B22_SITES` entry
and updated `CLAUDE.md` to *"thirteen"* — `git log -S "thirteen named sites"`
puts that edit in `9878046` — **while leaving `CLAIMS.md`'s "FOURTEEN" from
`5623648`**. And it **added the fifth test** to `profile_parse_b23.rs` while
rewriting the paragraph two lines above *"four tests"*.

⚠ **E-168's sentence landing on the register: a fix applied to the instance the
author was looking at, rather than to the phrase.** ⚠ **And E-199's, tenth and
eleventh instances, committed inside the fix for the ninth** — which derived
part 6's printed total correctly and left every number in the prose above it.

## What round two did NOT overturn, recorded so the absence is legible

* ⚠ **Attack point 2 is SOUND. All three legs agree, and I verified it
  independently before reading 032b.** `derive_raw` and
  `AccountKey::from_family_seed` run the same `match algo` over the same two
  constructors on the same decoded entropy; `the_two_seed_dispatches_agree`
  fails if they drift; `a_prompted_seed_keeps_every_secret_off_disk` pins the
  derived path's account against a constant. **The removed check was
  tautological and B-24 did not delete a defence.**
* **The decoder implementations themselves are right.** Both build the 16 bytes
  *inside* `Zeroizing`; no bare temporary exists. ⚠ **`looks_like_a_family_seed`
  was fixed with nobody editing it** — the strongest evidence for B-24's central
  claim, and it survives round two intact. The defect is in the **pin**, not the
  fix.
* **`finish()` did not change the derived bytes.** 032b read the statements as
  moved intact; the KATs reproduce both published vectors through it.
* **274 tests, three green runs, all six gates PASS** — re-run this session and
  confirmed, `TOTAL PASSED: 274`.
* **E-197's tests are right**, and `a_non_object_still_reaches_the_same_error`'s
  two shapes do discriminate the two parses.
* **The `Stdin` `BufReader` residual is accurately named.**
* ⚠ **The E-169 receipt claim in `5a20acb` is honestly SCOPED and holds.** Swept
  every 64-hex hash in the three live documents: 4 of 21 resolve to committed
  receipts, and the commit message claims exactly that — *"both hashes written
  this session resolve"*, the rest predate the mechanism.
* **No fifth unnamed residual found.** ⚠ `bin/onboard.rs:52` **refuses** a seed
  on argv and discloses why; that is a defence, not a residual.

## The lesson this round adds

⚠⚠ **A COMMENT NAMED THE WRONG CRATE AND THAT IS WHY A SECRET WENT UNWIPED.**
The sentence *"`sk` is a `k256` type this crate does not own"* sits eight lines
above `compressed_public_key`, which genuinely does use `k256`. **The author read
the neighbouring function's dependency and wrote it into the comment for this
one** — and the comment then answered the question *"why is this not wiped?"* for
every subsequent reader, including two passes by the self leg.

⚠ **E-181 was: the build wiped no scalars and a comment called that "the crate's
boundary, not an omission". This is the same sentence, about the same crate,
written by the session that had E-181 in front of it in `CLAUDE.md`.** The rule
was carried, in these words, and it was not self-executing — E-185's finding,
recurring.

⚠ **The instrument that would have caught it is not a rule. It is a compile
probe**: `scalar::Scalar` is this crate's own type, so `impl Zeroize` is three
lines away, and one `grep -n Zeroize signer/src/scalar.rs` returning nothing
falsifies the comment outright. **E-181 was closed by exactly that probe on
`k256::Scalar` and the probe was not re-run one file over.**
