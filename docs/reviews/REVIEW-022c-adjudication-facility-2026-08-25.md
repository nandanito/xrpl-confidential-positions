# REVIEW-022c — adjudication, round one: architecture §6 step 7, the facility

> ## ⚠ SUPERSEDED IN PART BY `REVIEW-022g`
>
> **This document was written while the Codex leg was still running, and round
> two was launched before it returned.** It then returned the two most serious
> findings of the entire review — a **CRITICAL** environment-variable override
> that pointed the *signer* at a remote node while the facility read loopback,
> and a **HIGH** redirect escape — both of which needed `signer/src/main.rs`, a
> file the packet did not contain.
>
> So §1's "eight findings upheld" and §4's account of the Codex leg were true
> when written and are **no longer the shape of the round**. `REVIEW-022g`
> adjudicates all twenty-one findings across both rounds. **Nothing below is
> retracted; it is incomplete, and that is recorded rather than rewritten** —
> the lesson (§6 item 3 of `REVIEW-022g`) is *wait for the legs*, and deleting
> the evidence of not waiting would delete the lesson.

**Date 2026-08-25.** Legs: `REVIEW-022a` (Gemini, packet only, no shell),
`REVIEW-022b` (Codex, packet **plus** read-only repository access),
`REVIEW-022s` (the session's own, written before either external leg returned).

---

## 1. Disposition

**Eight findings upheld, none rejected.** Every one is fixed, and every fix that
could be spot-checked was.

| # | Leg | Severity | What it is | Disposition |
|---|---|---|---|---|
| **S-1** | self | **CRITICAL** | Every plaintext transaction submitted **twice**; the second submission of an already-applied transaction cannot return a `tes`, so every plaintext step would have thrown on the first real run | **UPHELD, fixed.** `signAndSubmit` split into `sign` (no network) and `submitBlob` |
| **S-2** | self | HIGH | `submitValidated` checked the **provisional** engine result and never `TransactionResult` in the validated metadata | **UPHELD, fixed** — the check moved into `submitValidated`, so all four paths get it |
| **G-4.1** | Gemini | MEDIUM | A comment in `tools/check-loopback.ts` claimed a documentation-URL filter that **does not exist** | **UPHELD, fixed** — the comment now states the truth and why the strict direction is the cheap one |
| **S-3** | self | MEDIUM | The single-conversion guard was an in-memory flag on a **resumable** driver | **UPHELD, fixed** — the guard reads the ledger |
| **S-4** | self | MEDIUM | The driver adopted an enrolled supplier with `(facility as any)`, skipping three checks | **UPHELD, fixed** — `adoptEnrolledSupplier` |
| **G-6.1** | Gemini | LOW | The fail-hard control printed `✓` on the **inconclusive** outcome and `⚠` on the demonstration | **UPHELD, fixed** — ticks swapped, and the inconclusive branch says not to write the run down as evidence |
| **G-7.1** | Gemini | LOW | The drawdown boundary control passed for the wrong reason | **UPHELD, fixed** — asserts on the exception **type**; spot-checked by injecting an unconditional throw |
| **S-5** | self | LOW | A `merge` movement recorded `amount: 0` | **UPHELD, fixed** — the book throws if the caller's amount disagrees with the inbox |

**Two further corrections, found by the session while the legs ran**, and both
against the same sentence:

* **P-8 violation.** `~2.49 µs per unit of uncertainty` appeared in four places
  under `facility/` with no hardware, parameter set or methodology. Removed; all
  four now point at `docs/task-zero/benchmarks-2026-08-16.md` §4.
* **The wrong register row.** That number was cited as **F-8**. F-8 is the
  missing `bsgs` symbol; the cost is **E-23** and **F-7**. ⚠ The mis-citation was
  inherited: TASK ZERO §9 states the cost and the missing fallback in one
  sentence under one citation, and copying the sentence carries the wrong row
  with it. **A citation copied from a compound sentence is a citation nobody
  checked.**

---

## 2. ⚠ The methodological finding, and it is the one worth carrying

**The most serious defect in this round was found by the session's own leg, and
the external leg that reviewed that exact file affirmatively reported it clean.**

`REVIEW-022a` §2 is headed *"`fail_hard` Submission Gate — Findings: NONE"* and
cites `signAndSubmit()` and `submitValidated()` as *"routing exclusively through
`submitBlob()`"*. That is true and it is not the question. The question was
whether a caller reaches the network **twice**, and the leg did not ask it.

⚠ **This is the second consecutive round in which a clean external report sat
beside a real defect in the same file.** `REVIEW-021` recorded *"a clean leg is
not corroboration"* after Gemini affirmatively called a broken test helper
correct. Here the same shape recurs one milestone later. The rule stands and
should be stated more strongly: **an external leg reporting NONE on a section is
evidence about the leg's attention, not about the code.**

⚠ **And a new one: giving a leg repository access while the repository is being
edited makes it review a moving target.** `REVIEW-021c` recommended repository
access for both legs because Codex's four novel findings all needed files the
packet did not contain. That recommendation is right and it has a cost this
round exposed: the Codex leg observed file mtimes changing under it while the
session applied round-one fixes. **Freeze the tree, or run the leg against a
commit.** Neither happened here and it is recorded rather than glossed.

---

## 3. What each leg was good for

**Gemini (`REVIEW-022a`), packet only.** Three findings, all upheld, all real,
and **all three were about a description rather than about behaviour** — a
comment that described a filter that did not exist, an output that labelled an
inconclusive result as a pass, and a test whose assertion did not distinguish
the states it named. That is a genuine specialisation and it is worth using
deliberately: **this leg reads what the code SAYS against what the code DOES.**
It reported NONE on five sections; one of those five contained S-1.

**The session's own (`REVIEW-022s`).** Five findings, one CRITICAL. Found by
reading `submit.ts` against its callers — a whole-file read, which is
`CLAIMS.md` E-139's lesson and which no test could have replaced: the unit tests
answer `tesSUCCESS` to every `submit`, so a double submission is indistinguishable
from a single one.

⚠ **This inverts the project's own prior.** `MEMORY.md` records *"self-review
finds mechanisms, misses instances"*, learned when six claims outran their
evidence and external legs caught every one. That prior was formed on
**documents**; this round was **code with no execution behind it**, and there
the ordering came out the other way. **The distinction to carry: a self leg is
weak on claims about the world and strong on code it wrote an hour ago.**

**Codex (`REVIEW-022b`).** See §4.

---

## 4. ⚠ The Codex leg, honestly

Round one's Codex leg was given the packet **and** read-only repository access,
on `REVIEW-021c`'s recommendation. It ran for over an hour, read the packet,
`CLAIMS.md`, `CLAUDE.md`, the signer sources and the task-zero benchmarks, and
**did not return a report inside the session**.

**What that is worth, stated precisely:**

* It is **not** a clean report. A leg that did not finish has found nothing and
  ruled nothing out, and this adjudication must not be read as though two
  external legs looked and one of them agreed.
* Its exploration was **not** wasted: watching what it grepped is what put the
  `~2.49 µs` quotation and its citation in front of the session, which is the
  second time a Codex leg has produced a finding **by searching differently
  rather than by writing one down** (`CLAIMS.md` E-137 is the first).
* ⚠ **The round is therefore two legs and a gap**, and the gap is named here so
  that a later session reading "REVIEW-022, three legs" is not misled by the
  file count in `docs/reviews/`.

**What would settle it:** re-run the leg against a frozen tree, with a smaller
prompt that does not invite a full-repository read. The packet was 167 KB and
the instruction to *"read whatever you need"* was an invitation to spend the
budget on reading.

---

## 5. What was NOT found, in named places

Recorded because an unnamed silence is not a result.

* **No non-loopback ledger read** on any path, from any leg. The read path is
  reachable only through `LoopbackLedger`, whose constructor is private.
* **No way past `isLoopbackEndpoint`.** Decimal, octal, short-form, trailing
  dot, IPv4-mapped IPv6 and uppercase were all tried by the session's leg and
  independently reasoned through by Gemini's §3. Several are refused
  *conservatively* — `127.1` and `[::ffff:127.0.0.1]` genuinely are loopback and
  are rejected anyway — and failing closed is the right direction here.
* **No proof generation or blinding factor in `facility/`**, gated rather than
  asserted: `tools/check-blinding-sources.ts` now walks `facility/`, and its
  coverage of the new tree was spot-checked by planting a call and watching the
  gate fail.
* **No plaintext amount on a transaction that should hide one.**

---

## 6. ⚠ The finding this round could not make

**None of the above is evidence that rippled accepts any of it.** Every leg
reviewed code and tests; the tests drive fake nodes this project wrote. The
milestone is **built and not executed** (`CLAIMS.md` **E-146**, **B-18**), and a
review of unexecuted code is a review of what the code says it will do.

That is not a criticism of the round. It is the reason round two's question 4 is
*"is 'built and not executed' stated consistently"* — because the largest risk in
a milestone with no execution behind it is a document that quietly promotes
intention into result. `run-facility.ts`'s own header said **"executed on
Devnet"** before the script had ever run.
