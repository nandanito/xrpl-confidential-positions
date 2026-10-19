# REVIEW-026 — REQUEST: round TWO of the B-16 build. **You are reviewing the FIXES.**

**Date:** 2026-08-27. **Frozen commit:** `e9a3d26c13194fa86e11bd5ca5efdd4c1662e78f`.
**Round one's commit:** `200aae63`. **The fixes:** `200aae63..e9a3d26`.

Answer from this packet alone. No tools, no filesystem, no web.

---

## ⚠ Why this round exists, and what it is FOR

`CLAUDE.md`: *"Two rounds is the right number, and the second round reviews the
FIXES. Round one found a defect the code had. Round two — run against the
post-fix branch, because the fixes themselves had been seen by nobody — found a
**false-pass mode in the regression test round one had written**, plus two
sentences that overstated what the fixes established. **Fixing something and
describing the fix are separate acts with separate failure modes, and only a
fresh reviewer catches the second kind.**"*

**That is precisely this round's risk profile.** Round one produced **eleven**
findings and **not one was about the construction** — every one was about
evidence or about claims. Four were *sentences describing tests*. So the fixes
are themselves mostly new sentences and new test machinery, written by the same
adjudicator, seen by nobody.

⚠ **And two of round one's findings were false-pass modes in gates this project
built to catch false passes.** Assume there is a third.

## ⚠ The rule that binds this round hardest

> **Apply a fix against the FINDING's own citation list, not the adjudication's
> summary of it.** (`CLAUDE.md`, learned 2026-08-26 at the cost of a whole extra
> round.) `REVIEW-023c` said *"all seven upheld … every one is fixed"*; round two
> found **three fixes had not reached sites the findings named by file and
> line**. A sweep re-derived from a summary is the same defect one layer up.

**So: the three round-one leg reports are in this packet IN FULL, not just the
adjudication.** Tick each leg's own list. Where the adjudication's table and a
leg's report disagree about what was claimed, **the leg's report wins.**

---

## What to check, in priority order

1. **Did each round-one finding actually get fixed, at the site the LEG named?**
   Go finding by finding through `REVIEW-025a`, `REVIEW-025b` and `REVIEW-025s`
   below — not through `REVIEW-025c`'s table.
2. **Do the FIXES introduce new defects?** Especially:
   - the rebuilt `check-test-support-gate.ts` — does its new per-probe design
     have its own false-pass mode?
   - the rebuilt `revert-sweep.py` — does *requiring an expected test name*
     introduce a way to pass wrongly?
   - the new hard `assert!` in the signing path — is a panic there correct, and
     can it be reached?
   - `store::getrandom`'s new panic — same question.
   - the deleted `Hedge::Fresh` — did deleting it lose coverage?
3. **Do the fixes' DESCRIPTIONS overstate what they establish?** This is the
   named failure mode of a round two. Every corrected comment, every renamed
   test, every register row, the adjudication itself.
4. **Is anything now claimed that is not delivered?** `CLAIMS.md` P-5, and P-12
   for any claim that a source does *not* say something.
5. **Anything else.**

⚠ **`tests/xrpl_vectors.rs` is included in full this round.** Round one's Codex
leg graded §6 gate 1 PARTIAL because it was missing — correctly, and the fault
was the adjudicator's. Check gate 1 properly now.

## Output

1. **Finding-by-finding**: for each round-one finding, FIXED / PARTIAL / NOT
   FIXED / MADE WORSE, citing the post-fix line.
2. **New defects introduced by the fixes.**
3. **Descriptions that overstate what the fix established.**
4. **§6 gate 1, now that you have the file.**
5. **Anything else.**
6. **Confidence, and whether a third round would pay.** ⚠ `CLAUDE.md` says a
   third round reviews the fixes to the fixes and *"that is where it stops
   paying"* — say plainly if you disagree.

---

# ============ WHAT THE PACKET CARRIED, and it is NOT reproduced here ============

520 KB, reproducible from this repository and one pinned crate:

| Section | Source |
|---|---|
| Round one, **all three legs in full** | `REVIEW-025s`, `REVIEW-025a`, `REVIEW-025b`, plus `REVIEW-025c` |
| The fixes | `git diff 200aae63 e9a3d26` |
| Post-fix files, complete | the eleven files named in that diff, including **`signer/tests/xrpl_vectors.rs`**, which round one's packet omitted |
| The ruling | `REVIEW-024-RULING-ed25519-nonce-2026-08-27.md` |
| Third-party source, complete | `ed25519-dalek` 2.2.0 `src/hazmat.rs`, `src/signing.rs` |
| Run output | `cargo test` x3, the gate, the revert sweep |

⚠ **The legs' full reports were carried, not just the adjudication's summary of
them.** `CLAUDE.md`: *apply a fix against the FINDING's own citation list, not the
adjudication's summary of it* — and this round is what that rule is for. It paid:
round two found **four second copies** of round-one sentences and **one remedy
taken in its weaker form**, all of which `REVIEW-025c`'s table recorded as
"FIXED".
