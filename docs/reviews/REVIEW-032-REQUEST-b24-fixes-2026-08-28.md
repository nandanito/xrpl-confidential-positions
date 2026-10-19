# REVIEW-032 — REQUEST — B-24, the fixes to B-23

**Frozen commit: `2cf6ee186a6bec0d801fd9ed22f11d20c01c789b`** (branch `main`, clean).

⚠ **The handover named `5a20acb` and HEAD had moved.** `2cf6ee1` is one commit
later and touches **`docs/NEXT-SESSION-PROMPT.md` only** — `git diff --name-only
5a20acb 2cf6ee1` returns that single path — so **the code under review is
byte-identical** at both. Frozen at HEAD because that is the tree that exists.

Round **two** of two, per `CLAUDE.md`: *two rounds is the right number and the
second round reviews the FIXES.* **B-24 is nine fixes to nine upheld findings and
nobody has read them.**

## Why this round is not bookkeeping

⚠ **Three consecutive milestones have had round two find something round one's
fixes got wrong.** B-21→`REVIEW-028`. B-22→`REVIEW-030`: the build had not
implemented its own ruling. B-23→`REVIEW-031`: **the same again**, plus the
worse one — `REVIEW-030b` had **already reported** the bare entropy and
`REVIEW-030c` answered the comment the finding quoted instead of the defect it
named (E-194). **Assume B-24 has one too.**

## What B-24 is

The subject is `git diff a2561ec 9878046` — ten files, +533/−199. Mapped to the
findings it answers:

| `REVIEW-031c` | grade | what B-24 did |
|---|---|---|
| 1 — four decoded seed arrays never wiped | HIGH | `decode_family_seed` → `R<(Zeroizing<[u8; 16]>, KeyAlgorithm)>`, `decode_ed25519_seed` → `R<Zeroizing<[u8; 16]>>`, both **built into** the wiping buffer. Deleted `Zeroizing(entropy)` + `zeroize_source_copy()` in `keygen::derive_raw` as thereby dead |
| 2 — the process failure | HIGH | `CLAIMS.md` E-194; comments at `xrpl.rs::decode_family_seed` |
| 3 — `holder.rs` decodes the seed twice on the derived path | HIGH | `derive_raw` now returns `xrpl::AccountKey`; new `derive_from_master_seed_with_account`; new private `finish()`; `holder.rs` produces `(account, elgamal)` from whichever arm runs |
| 4 — part 6 false-passes on `/* */` | MEDIUM | `strip_line_comments` rewritten as a two-state scanner; new `CONTROL(/* */)` |
| 5 — the single-decode needle pinned only the Ed25519 arm | MEDIUM | needle retired; new `single_decode_findings()` scoped to `derive_raw`'s body, with **three** controls |
| 6 — four live sentences claim more than the code delivers | MEDIUM | `CLAUDE.md` status block, `holder.rs`'s *"exactly one buffer"*, two `keygen.rs` comments |
| 7 — the `IgnoredAny` swap is not fully behaviour-preserving | LOW | E-197; new `the_stale_field_now_wins_over_a_bad_value`; file header rewritten; `a_non_object_still_reaches_the_same_error` tightened to two shapes |
| 8 — `StdinLock`'s `BufReader` retains the typed seed | MEDIUM | named as a residual at `onboarding.rs::TerminalIo::ask_secret` |
| 9 — the E-192 comment contradicts itself | LOW | quotation replaced at `holder.rs` |
| 10 — *"TWO E0053 errors"* | REJECTED, point upheld | the `REVERTS` entry's wording |

**274 tests, all six gates PASS, Devnet `50627A0B…2B980` validated at `9878046`.**

## The five things this round exists to attack

1. ⚠⚠ **THE DECODER RETURN TYPE IS THE WHOLE HIGH FIX AND IT HAS NO
   COMPILE-TIME FALSIFIER.** Reverting **both** decoders together gives **zero**
   errors — measured, E-196 — because `&entropy[..]` compiles identically on
   `Zeroizing<[u8; 16]>` and on `[u8; 16]`. So the only thing standing between
   this fix and a silent regression is **`check-zeroize-bounds` part 6's two new
   source needles**. ⚠ **Break that pin.** Three gates in this repository were
   built to catch false passes and false-passed (E-165, E-168, E-182), and part 6
   itself was the fourth (E-198). **Is there a way to undo the wipe while both
   needles still match?**
2. ⚠⚠ **`holder.rs` DROPPED THE `expected_account_id` CHECK ON THE DERIVED
   PATH, AND THE WHOLE FIX RESTS ON THAT BEING TAUTOLOGICAL.** The removed
   comment said the check *"cannot fail"* there and cited a revert. B-24 took it
   at its word. ⚠ **If that was WRONG, B-24 deleted a real defence in the name of
   removing a copy.** `try_from_parts` exists because `from_parts` accepted a
   public key that was not `sk·G` (E-120) — this project has shipped exactly this
   class of mistake before. **Read the two paths and say whether the account the
   derivation returns can EVER differ from the one `AccountKey::from_family_seed`
   would have produced.** If it cannot, say what makes that true; if it can, that
   is a HIGH.
3. ⚠ **`finish()` IS A NEW SINGLE PRODUCER OF `DerivedKey` AND BOTH PUBLIC ENTRY
   POINTS NOW GO THROUGH IT.** `derive_from_master_seed` and
   `derive_from_master_seed_with_account`. **Did factoring it out change anything
   about the derived key?** The KATs and
   `family_seed_derivation_matches_ripple_keypairs` are the falsifiers —
   ⚠ **check they actually cover BOTH entry points**, because a KAT that only
   drives the old one proves nothing about the new one. E-164 is three instances
   of a test named for a property, one layer from where the property breaks.
4. ⚠ **`single_decode_findings()` IS NEW, AND ITS CONTROLS RUN
   `REVIEW-031b`'S EXACT MUTATION.** That is the right instinct and it is also
   the trap: a control that replays the last round's attack proves the gate
   catches the **last** attack. ⚠ **Find the mutation its controls do NOT run.**
   It is scoped by `derive_raw_body`, which slices from `fn derive_raw(` to the
   next `\nfn ` or `\npub fn ` — **what does that scoping miss?**
5. ⚠ **`strip_line_comments` IS EXPLICITLY NOT A RUST LEXER.** A `//` or `/*`
   inside a string literal is treated as a comment, and the docstring claims this
   is **safe-direction-only** — *"it can only make a needle harder to satisfy,
   never easier"*. ⚠ **Is that true?** Nested `/* /* */ */` is legal Rust and the
   scanner is not nesting-aware. Raw strings, `*/` inside a `//` line, a needle
   that itself contains comment syntax. **Construct the counterexample or say
   why none exists.**

## What is already conceded — do not spend the round re-deriving it

* **P-5 governs all of it.** Nothing here is claimed to make anything secure. An
  adversary with code execution reads the value while it is live. **B-24 narrows
  windows and removes no channel.** A sentence claiming more is a finding; an
  argument that the whole exercise is insufficient is not.
* **The decoder revert compiles clean.** Measured, E-196, and the comment that
  said otherwise is corrected in this very diff. Do not re-report it as a
  finding — **do report it if the correction is itself wrong.**
* **Named residuals**, all four: `serde_json`'s escape-decoding scratch,
  `read_to_string`'s growth if the file changes mid-read, a pasted line over the
  4096-byte reservation, and now **`StdinLock`'s internal `BufReader`**. Nothing
  in this crate can reach any of them. ⚠ **A FIFTH one that is NOT named is a
  finding** — that is how residual 4 got here.
* **`the_two_seed_dispatches_agree` catches DRIFT, not a revert to the double
  decode.** Stated in the test. That is exactly why finding 5 needed a gate.
* **E-197's behaviour change is *which error*, not *what is accepted*.** Both
  `Json` and `Stale` refuse the profile. The finding was that it was documented
  as no change at all.
* **`tapFailHard` is this project's shorthand and is not a real rippled name.**
  Not this round's subject.

## Two standing hazards, because both have bitten inside a fix

⚠ **A COUNT RESTATED BY HAND EXPIRES AT THE NEXT EDIT — nine instances (E-199).**
Part 6's header now derives every number from `len(B23_SITES)`. **Check the
other five parts for a hand-restated number**, and check this request's own
table while you are at it.

⚠ **A COMMENT ASSERTING A FALSIFIER IS A CLAIM WITH NO FALSIFIER, and B-24 wrote
one INSIDE the fix for a finding about overclaiming (E-196).** ⚠ **Every
"reverting this breaks X" sentence in this diff should be assumed unmeasured
until you measure it.** There are several.

## Grade each finding

`HIGH` / `MEDIUM` / `LOW`, with **file and line**, and say **what would falsify
it**. ⚠ **A finding whose diagnosis is wrong may still have a real weakness
underneath (E-170) — say so rather than dropping it.** ⚠ **And say plainly if a
fix is correct**: round two's job includes establishing that the fixes hold, and
an absence recorded is worth more than a finding manufactured.
