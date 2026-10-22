# REVIEW-061c — adjudication of the diagrams' two reads

- **Date:** 2026-10-22. The legs ran from 01:18Z to 01:25Z.
- **Subject:** nine diagrams on the hosted demo's seven pages, at the owner's
  request of 2026-10-22, and the browser self-test's choice of script chunk.
  `6d5daf3..a87ae55` in the archive.
- **Process:** the owner's ruling for the explainer, *"two reads, then deploy"*,
  applied to its diagrams: one read against `CLAIMS.md` with the repository, one
  by a newcomer who sees only the rendered pages. No later round was planned, so
  the fixes are checked by their own tests, controls and probes.
- **Register:** `CLAIMS.md` E-351, and R-8 for a sentence the review found
  already published.

## The legs

| leg | model and access | packet |
|---|---|---|
| A | Codex native review pass, a repository of two commits, the archive trees at `6d5daf3` and `a87ae55` (tree hashes equal), the gated output, 32 screenshot segments and the seven pages' visible text; `workspace-write` with network | every label, arrow, grouping and colour against its source; consistency; the code; the layout. `leg-a-prompt-codex.md` |
| B | a Claude Sonnet subagent, instructed to read the brief and the 32 screenshots only | a stranger from a post, reading the diagrams. `leg-b-prompt.md` |
| self | the adjudicator | the label checks made while building, and two doubts carried in, written to the scratchpad during the round and committed after. `self-notes.md` |

⚠ **Leg B is not the newcomer leg `REVIEW-060` used.** That was Gemini through
`agy`, which takes no images. A Codex run with images attached would be a
targeted round, which the local review policy reserves for security, wire
contracts and precedence chains; no such reason applies, so none was written.
A Sonnet subagent can read images and had none of this session's context, but
it is the same model family as the adjudicator, and its independence is that
much weaker.

Leg A ran 7 minutes, read nothing outside its directory, and could not start
Chrome in its sandbox, so it did not reproduce the browser runs. Its full report
was in its working directory and is kept as `leg-a-codex-report.md`, with its
probe. 70 per-user temporary paths are replaced with `$USER_TMP`. Leg B read all
32 segments; its *"34"* is its own miscount, and the segment it called blank is
the 10-pixel tail of the wallet page.

## Rulings

### Leg A

| id | claimed | ruling | why, and the fix |
|---|---|---|---|
| A-1 | HIGH | **Upheld**, and it reaches past the diagrams | *"A confidential transaction needs both keys"*: a MergeInbox carries no proof and the facility signs it with the seed alone, and a Convert that does not register a key needs no proof (TASK ZERO §3). The sentence came from the capability matrix's wallet row and the wallet page, both public; all three are corrected, and R-8 records it. The wallet conclusion holds, because without the first Convert there is no position |
| A-2 | HIGH | **Upheld** | *"signs every transaction"* dropped E-69's condition. The account key now *"signs, while the master key controls the account"*, as the matrix's own row says |
| A-3 | MEDIUM | **Upheld**, and leg B too | The submission arrow left the signer. A third row now shows the driver submitting; the signer returns the signed bytes and never submits |
| A-4 | MEDIUM | **Upheld** | Repayments were drawn only outward. Drawdowns go down, repayments come back up |
| A-5 | MEDIUM | **Upheld** | Retirement was drawn from the suppliers. It now starts from the float left in the Dedicated Account, as `retire()` does |
| A-6 | MEDIUM | **Upheld**, and leg B too | The custody proof was green, which says hidden; the proof is public and the amount is what the workflow cannot read. Neutral now |
| A-7 | MEDIUM | **Upheld** | The auditor's copy was violet, which says the issuer can read it. Neutral now, under the auditor's key |
| A-8 | MEDIUM | **Upheld**, and leg B too | On a wide screen the Send floated beside A's public balance. It is now placed cell by cell, on the row of A's spending balance and B's inbox |
| A-9 | MEDIUM | **Upheld** | The self-test's first replacement took any common reference, and a `modulepreload` link is never run. It now takes the one module script every page runs, and refuses if the pages do not agree. Probed both ways: an unused preload on all seven pages still passes, and a second module script on one page refuses |
| A-10 | LOW | **Upheld**, and leg B too | The matrix's last column was off screen on a phone. On a phone each row is now a card |

Leg A affirmed, with what it checked: every other label in all nine diagrams
against the rows named; the three zero cases across five places; no inline
style, ledger value or 8b wording; eleven figures with captions;
`runChecks()` clean; `bun test web` 192 pass. It did not run the store-dependent
gate, a browser, or any Devnet read.

### Leg B

| item | ruling | why, and the fix |
|---|---|---|
| 4a, two keys | **Upheld** | The arrows did not say which derivation gives which key. Each key has its own row |
| 4b, custody | **Upheld** | The proof box, as A-6; *breaks* now has the warning border |
| 4c, the zero exception in the overview | **Rejected** | The bullet states it and names the three cases |
| 4d, the off-site signer | **Upheld** | Its title now says *not connected to it* |
| 4e, spending | **Upheld** | The table under a title about spending had no spending column. It has one |
| 4f, zero cells | **Upheld** | Reworded: *"only whether it is a recognisable zero"*, *"others only as a recognisable zero"* |
| 4g, the issuer in the lifecycle | **Upheld** | A line under the key says the issuer can read every green box |
| 4h, the facility's Convert | **Upheld** | A step on the arrow now, as A-4 and A-5 rebuilt the diagram |
| 4i, two signer boxes | **Upheld** | The upper one says *the same program as below* |
| 4j, custody flows | **Upheld**, and it predates the diagrams | *survives* used an orange-red beside the warning red. Neutral now |
| 4k, *"shape of the book"* | **Rejected** | The sentence is the register's; the *Anyone can see* list beside it carries the size |
| phone matrix, phone Send | **Upheld** | Cards (A-10); the Send's label names holder B |
| float, Pair, Prepare, `fail_hard` | **Upheld** | Each is explained where it appears |
| the overview's Send | **Upheld** | The confidential box shows holder A sending to holder B |
| the Send's note read as an actor | **Upheld** | Dashed, and titled *Note* |
| why an inbox | **Rejected** | No row records the protocol's reason |
| *ElGamal* on the front page | **Rejected** | The front page does not use the word |
| one legend per page, one key diagram with a toggle, collapsing *Sources* | **Rejected** | Each diagram is read alone; the two pages make different points; traceability is the register's rule (as `REVIEW-060` B-16) |

### The self pass

Its seven pre-launch corrections are in `self-notes.md`. Of its two doubts, the
architecture lead sentence was left: the caption under the diagram states the
one-machine limit. The overview's omission of the total supply was left: the
explainer states it.

## After the fixes

At `883ee63`: all three type-checks pass, `bun test web/api web/hosted` 192 pass,
`make ci` every step passed once the packets' temporary paths were redacted;
built in two containers; the gate 70 of 70 controls on 20 files; the
browser check passed; the self-test passed, and its two probes behaved as above.

⚠ **A JSX comment placed where an arrow function returns one element broke the
build and passed the root type-check**, because `tsc` at the root does not cover
`web/app`. The hosted configuration and a build found it before any commit.

## What this round shows

- **A diagram's arrows are claims no wording gate reads.** The facility diagram
  drew repayments and retirement in the wrong places while every label and
  sentence around it was right. Only a reader comparing the arrow with the code
  that runs found them.
- **A diagram repeats a page's sentence, and so repeats its error.** The
  both-keys caption was correct to its source; the source was wrong, and had
  been public since publication. Checking a new artifact against existing text
  checks consistency, not truth.
- **A replacement written to fix a brittle name can be brittle in a new way.**
  The self-test's first fix chose by reference, and a reference is not an
  execution.
