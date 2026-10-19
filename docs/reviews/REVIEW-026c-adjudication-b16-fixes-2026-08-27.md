# REVIEW-026c — ADJUDICATION, round TWO: the fixes

**Date:** 2026-08-27. **Three legs** against frozen commit `e9a3d26`:
`REVIEW-026a` (Gemini, 9.0), `REVIEW-026b` (Codex, **9 construction / 7 fix
implementation / 6.5 evidence and descriptions**), `REVIEW-026s` (self leg, 8.5).
⚠ **The adjudicator takes the low end: 6.5, on evidence and descriptions.**

**All three say a third round would not pay.** So does `CLAUDE.md`. Codex's
phrasing is adopted as the closing instruction: *"a bounded fix-and-verify pass …
then stop; do not initiate another broad review rotation."*

---

## 1. ⚠ The round-two lesson, and it is EXACTLY the one `CLAUDE.md` predicts

> *"Fixing something and describing the fix are separate acts with separate
> failure modes, and only a fresh reviewer catches the second kind."*

**Round one produced eleven findings and `REVIEW-025c` recorded all eleven as
FIXED. Round two found that four were not.** Not wrong — *incomplete*, in one
specific way:

| What round one fixed | What it missed |
|---|---|
| *"the whole ruling in one assertion"* on the **ed25519** test, the line Codex cited | The **secp256k1** test carries the identical sentence |
| the KAT's doc comment | the **section banner above it** — ⚠ inside the range Codex named — plus `Hedge::FixedAux`'s doc and the assertion text |
| a note on `Hedge`'s doc about the stale `Hedge::aux` sentence | **the occurrence that actually asserts it**, on `OneShotAux` |
| the entropy hook's panic | Codex offered **two** remedies and round one took the weaker; both now |

**One failure mode: a fix applied to the instance the adjudicator was looking at,
rather than to the phrase.** `CLAUDE.md` already records `REVIEW-023c` costing an
extra round for this and says *tick the leg's list, not your own recollection of
it* — **which round two did, and it still took a grep for the STRING to find
these, because a leg's list is line numbers and the defect is a sentence.**

> ⚠ **Proposed addition to `CLAUDE.md`: tick the leg's list, then GREP FOR THE
> PHRASE.** A line number locates one instance. A corrected sentence is a
> string, and strings have copies.

## 2. Findings upheld and fixed in this round

**Machinery — two more false-pass modes, in the same two artifacts as round one:**

| # | Finding | Found by | Fix |
|---|---|---|---|
| 1 | ⚠ **`revert-sweep.py` had NO BASELINE.** It certified a mutation whenever an expected test was in the failure set — **including when that test was already failing for a reason the mutation had nothing to do with** | **Codex** | Runs the unmodified target first and **requires zero failures**, then requires a **newly** failing expected test. A red baseline reports VOID |
| 2 | **The gate's probes over-attributed.** `FixedAux`'s probe wrapped the variant in `sign_message_with`, so its row could not distinguish which of three symbols was gating it | **Codex and Gemini** | Bare probes. ⚠ The enum/variant coupling is irreducible — a variant needs its enum — and the caveat now says that instead of implying per-symbol attribution |
| 3 | **The gate leaked its scratch crate on every failure path**: `process.exit()` does not run a pending `finally` | **Gemini** | `bail()` cleans up first. Verified: 6 dirs before a forced failure, 6 after |
| 4 | **The Devnet script ignored `git`'s exit status**, so a failed `rev-parse` gave an empty commit and a failed `status` gave a false `dirty=false` — a receipt asserting provenance it had not established | **Codex** | Both checked; the commit is shape-validated |
| 5 | **The receipt was written before the verdict was computed**, so a failed run would overwrite a good receipt with one whose `claim` still said rippled accepts the construction | **Codex** | Written only when the gate is satisfied, and it carries `gateSatisfied` |

**Claims — and this is where the round concentrated:**

| # | Sentence | Why it was wrong |
|---|---|---|
| 6 | `CLAIMS.md` **E-163**: *"the signer no longer signs pure RFC 8032"* | **False.** A reported entropy failure deliberately does, and so does the vector arm. The **default path** is hedged; two named paths are not, and are not supposed to be |
| 7 | E-163, `CLAUDE.md`, `signer/README.md`, the architecture document all cited transaction **`9356A524…`**; the committed receipt records **`5A8CF0B…`** | ⚠ **The prose cited a run from a DIRTY tree that no committed receipt records.** Four documents, one hash, zero evidence. Reconciled to the receipt |
| 8 | `REVIEW-025c` and **E-166**: *"all eleven fixed"* | **False**, per §1. Corrected to *"all eleven addressed, four incompletely"* |
| 9 | `store.rs`: *"`r`/`ρ` … are not affected by a successful draw"* — **one sentence before admitting a test gets a chosen `r`** | Self-contradicting. What is true is narrower: their *refuse-on-failure* rule is untouched |
| 10 | The B-19 decision gave the feature list as `["std", "zeroize"]` | The manifest has **`hazmat`** too — eliding it made the line look like something it is not |
| 11 | B-19's rejected-alternatives table kept *"at a cost of zero"* | §3 had been corrected for exactly this and the table had not |
| 12 | `Cargo.toml` and the B-19 decision kept a **deleted test's name** | Round one renamed the test and not its two references |
| 13 | `check-test-support-gate.ts` said the Makefile *"still carries"* a sentence | ⚠ **In the same commit that removed it** — the file describing the file it had just fixed |
| 14 | `revert-sweep.py`'s header said *"eleven mutations"* and *"the WHOLE suite"* | **Twelve**, and one target (`--test hedged_signing`), not the suite |
| 15 | `xrpl_vectors.rs` described the default path as hedged RFC 6979 with low-`S` and DER | That is **secp256k1 only**, in a test that signs every vector key including the ed25519 one — and ed25519 is hedged now too |
| 16 | *"if a caller-supplied verifying key were threaded in, this is what would move"* | Overstates in the way the sentence above it disclaims: a caller threading in the **correct** key is invisible |
| 17 | *"no third party computes a W-CONF-hedged signature"*, defended as a deduction | ⚠ **Originating somewhere does not prove absent everywhere.** P-12 governs the claim whichever way it is argued. Narrowed to the evidence checked |
| 18 | The hard assert's message compressed a mismatched `A` straight into key recovery | Recovery needs more than one mismatch; the assert is right, the sentence was tight |

## 3. ⚠ Claims REJECTED, with reasons, so no later session relitigates them

**Gemini graded a HIGH defect that does not exist**, and its remedy would have
been applied to code that already does the thing.

> **Gemini, Defect 1:** *"`revert-sweep.py` accumulates mutations across
> iterations because `restore()` is omitted from the loop body … `restore()` is
> **never called at the end of each iteration** — it is only called on line 183
> after all 12 reverts have executed!"*

**False. `restore()` is line 164 — the FIRST statement in the loop body**, before
`apply()`. Gemini's own quoted excerpt of the loop silently omits it. Every
mutation is applied to a restored tree, and the twelve results are independent.
⚠ **Had this been accepted, a `finally: restore()` would have been added to code
that restores at the top of the loop** — harmless, but on a diagnosis that was
backwards. `CLAIMS.md` records this pattern twice already; this is the third.

> **Gemini, Defect 2 (premise):** *"`zero_aux_is_hedged_not_a_fallback` — the
> exact test that was renamed/superseded"*.

**False.** That test exists, passes, and was never renamed. ⚠ **The point beneath
the false premise was still worth taking**: an OR-match over a broad expected
list does not say *which* expected test fired. Addressed by the baseline plus
newly-failing rule (§2 item 1).

> **Gemini, Defect 3 (citation):** quotes `GATED` entries for
> `DeterministicForVectors` and a second `sign_message_with`.

**Neither exists.** There are six entries and a control. ⚠ **The underlying
observation — that `FixedAux`'s probe wrapped a method it did not need — was
true**, and is fixed.

> **Gemini, §3 item 3:** *"Gate 8 … did not execute the 12 reverts in clean
> isolation."*

**Rejected**, because it rests entirely on Defect 1.

⚠ **All three Gemini errors are the same shape: a conclusion drawn from an
excerpt of a file the packet supplied IN FULL.** E-160 was about an adjudicator's
excerpt bounding a leg; this is a leg excerpting for itself. **The rule survives
the change of author: what you choose to look at is your blind spot.**

## 4. What is left open, deliberately

- **B-21** — the SHA-512 output, the mask and `fresh_aux`'s buffer are unwiped
  stack locals. Filed, not fixed, and both rounds confirmed it is real.
- ⚠ **The mask has no outside check and cannot get one.** `@noble` controls the
  arithmetic; the combiner rests on two readings of the same prose, both this
  project's.
- **rippled's ed25519 verification path was not read at source.** Not in this
  checkout. `REVIEW-024` §6 named it; P-12's falsifier was re-run on 2026-08-27
  and returned 0.
- **The hard assert in the signing path is unreachable by construction and
  therefore untested.** Named rather than implied.

## 5. Confidence: **6.5 on evidence and descriptions; 9 on the construction**

The construction has now survived **six independent leg-readings across two
rounds** without a single finding against it, has a KAT against a second model
whose arithmetic a third implementation controls, twelve reverts each provably
causing a named test to fail against a green baseline, and a validated Devnet
transaction whose signature is provably not the deterministic one.

**Everything that has gone wrong in two rounds has been evidence and prose**, and
round two's own contribution is that **round one's adjudication overstated its
fixes in the round whose entire lesson is that fixes and descriptions fail
separately.** That is not a reason for a third round — it is the reason the
sentence about grepping for the phrase belongs in `CLAUDE.md`, where the next
session will read it.

**A third round would review the fixes to the fixes. That is where it stops
paying, and all three legs agree.**
