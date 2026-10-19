# REVIEW-031c — ADJUDICATION — B-23, round one

Frozen `0766d49317743f9fbf0f422af37246cadcbd8aa1`. Legs: **031a** Gemini 3.1 Pro
(inline packet), **031b** Codex (read-only repo), **031s** self.

⚠ **THE ADJUDICATOR IS THE INTERESTED PARTY — IT WROTE THE BUILD — SO THE
DIRECTION IS RECORDED: this ruling goes AGAINST the build on every contested
point but one, and the one exception is a leg's arithmetic that was measured.**

## Verdict

⚠⚠ **B-23 AS COMMITTED DID NOT FULLY IMPLEMENT ITS OWN RULING.** `REVIEW-029c`
condition 2 put **the decoded seed arrays** in scope. Four remain bare.

**This is B-22's round two happening again, one milestone later, and the
mechanism is identical**: the construction was sound and the DESCRIPTION was
hiding the gap. `CLAUDE.md`'s two-round rule predicted it both times.

## Findings, every one verified at source before it was accepted

| # | leg | finding | verified how | verdict |
|---|---|---|---|---|
| 1 | 031b, 031s | **Four decoded master-seed arrays are never wiped**: `decode_ed25519_seed::out`, `decode_family_seed::out`, `AccountKey::from_family_seed::entropy`, `looks_like_a_family_seed`'s discarded payload | read at source; `keygen::derive_raw` is the ONLY caller that wipes its copy | **UPHELD — HIGH** |
| 2 | 031b | ⚠⚠ **`REVIEW-030b` ALREADY REPORTED FINDING 1 AND THE ADJUDICATION DROPPED IT** | `REVIEW-030b` line 1 verbatim: *"`AccountKey::from_family_seed` leaves returned entropy bare"*; line 7 lists *"`from_family_seed`'s bare `[u8;16]`"*. `REVIEW-030c` row 8 corrects **a comment about the mechanism** and never fixes the defect | **UPHELD — HIGH, and it is a PROCESS finding** |
| 3 | 031a | **`holder.rs` decodes the seed twice on the derived path** — the identical defect B-23 removed from `keygen.rs` | `holder.rs:450` `from_family_seed`, then `:488` → `derive_raw` → `decode_family_seed` | **UPHELD — HIGH** |
| 4 | 031b | **Part 6 false-passes on a `/* */` block comment** — `strip_line_comments` handles `//` only | ran the gate's own `strip_line_comments` on `/* let raw = Zeroizing::new( */` → **count 1** | **UPHELD — MEDIUM** |
| 5 | 031b | **Part 6's single-decode needle pins only the Ed25519 arm** | reverted **only** the secp256k1 arm to `from_family_seed`: **compiles, dispatch test PASSES, part 6 says "present", whole gate PASSES** | **UPHELD — MEDIUM** |
| 6 | 031b | **Four live sentences claim more than the code delivers**, incl. `CLAUDE.md`'s *"the seed's owned lifetime wipes"* and `holder.rs`'s *"exactly one buffer exists"* (`raw` still holds the seed too) | read at source | **UPHELD — MEDIUM** |
| 7 | 031b | **The `IgnoredAny` swap is NOT fully behaviour-preserving**: `"balance":1e999` and `"balance":"\uD800"` used to give `Json`, now give `Stale` | ran both: **`Stale`, `Stale`** | **UPHELD — LOW.** Both still refuse the profile, so the impact is the error, not acceptance — but *"behaviour preserved"* is **false as written** |
| 8 | 031a | **`StdinLock`'s internal `BufReader` retains the typed seed** and is not in the named residuals | mechanism confirmed: `read_line` → `fill_buf` copies OS → BufReader buffer → `String` | **UPHELD — MEDIUM, as a RESIDUAL to name** |
| 9 | 031a | **The E-192 comment's wording contradicts itself** | read: the quoted claim is ambiguous about *unwiped*, so *"That is false"* reads as contradicting the next sentence | **UPHELD — LOW, wording** |
| 10 | 031a | *"Reverting `ask_secret` gives **TWO** E0053 errors, one in `tests/onboarding.rs`"* | **MEASURED**: `cargo build --tests` emits **ONE**, at `src/onboarding.rs:782`, inside `impl OnboardingIo for TerminalIo`. **The lib fails first, so the test target is never compiled** | ⚠ **REJECTED — the count is wrong.** ⚠ **The point underneath is UPHELD (E-170)**: the gate says the error bites *"not a test double"*, which reads as *the double is unaffected* when the truth is *the double is never compiled*. **Wording to fix** |

## What round one did NOT find, recorded so the absence is legible

Both legs cleared: the `IgnoredAny` scan really does avoid allocating string
values (Codex read the same `ignore_str` path); the manifest's explicit `alloc`;
the two prompt paths' paired `Zeroizing`; and `the_two_seed_dispatches_agree`'s
honesty about its own reach.

## The lesson this round adds, and it is about ADJUDICATION, not building

⚠⚠ **A LEG'S FINDING WAS CORRECT, RECORDED IN THE COMMITTED REPORT, AND NEVER
ACTED ON — AND THE NEXT ROUND'S BUILD INHERITED THE DEFECT.** `CLAUDE.md` already
says *tick the leg's list, not your own recollection of it* (E-141) and *a leg's
list is line numbers, a corrected sentence is a string* (E-168). **Finding 2 is
the third shape: the adjudicator answered the SENTENCE the finding used and not
the DEFECT the sentence named.** Row 8 of `REVIEW-030c` corrected *"`out` IS
RETURNED, so it is a MOVE"* — the comment — while the leg's actual words were
*"`AccountKey::from_family_seed` leaves returned entropy bare"*.

⚠ **A finding is not discharged by correcting the prose it cited.**
