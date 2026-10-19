# REVIEW-050c — adjudication: round three, narrow, and THE ROTATION IS CLOSED

- **Date:** 2026-09-22
- **Owner's ruling:** *"Run a narrow third review."* One corpus leg, as `REVIEW-049c` recommended.
- **Legs:** `REVIEW-050a`, Codex native light pass (`codex exec review -m gpt-5.6-luna -c model_reasoning_effort=high`), over the repository at `7462add` and the mpt-crypto clone, with no network. `REVIEW-050s`, a self sweep with different spellings, written before the Codex output was read, and **not independent**. `git status --porcelain` was empty before and after the Codex pass.
- **Question:** only whether any sentence corrected in `REVIEW-048` or `REVIEW-049` survives anywhere outside `docs/reviews/`, and whether B-30's list holds under spellings its recorded regex does not use.
- **Stopping condition, set in `REVIEW-049c` before this round ran:** **the rotation closes after round three whatever it finds**, and what it finds is fixed without a fourth round. **It is closed.**

## UPHELD, and fixed

| # | Site | Surviving claim | Legs | Severity |
|---|---|---|---|---|
| 1 | `README.md:371` | *"reviewed by Trail of Bits … so check it before believing anything here is novel"* — **the public front door** sent readers to one audit to settle novelty. It now names B-30 beside B-13 | a, s | HIGH |
| 2 | `CLAIMS.md` file-first paragraph | *"Nothing here is filed without first checking the Trail of Bits"* report — the register's filing rule named one audit. It now says the check covers two and the Sherlock one cannot be read | a | HIGH |
| 3 | `CLAIMS.md` publication headline | *"F-7 and F-8 are the strongest new material and neither is in the Trail of Bits report"* — B-30 already named this paragraph as a site, but the sentence itself still read as a novelty claim. It now carries *"(one of two audits, B-30)"* | a | MEDIUM |
| 4 | F-19 row, `UPSTREAM-FEEDBACK.md` F-19 row, `DECISION-REQUEST-public-or-private` | *"upstream HEAD is unchanged on it"* — the phrase E-296 was corrected away from, at three more sites. The decision request is dated 2026-09-13 but its sentence says *"Checked 2026-09-14"*, so it was a live copy, not a dated record | a | MEDIUM |
| 5 | F-8 row, `UPSTREAM-FEEDBACK.md` F-8 row | *"Fixed upstream"* and *"Closed upstream"* without the packaging caveat E-297 now carries | a | MEDIUM |

## FOUND WHILE FIXING, and this is the one worth remembering

⚠⚠ **The fix for finding 1 introduced two defects of its own, and the project's checks caught both before commit.**

- **The first wording said the Sherlock findings are *"not publicly available"*.** B-30's evidence supports only *"not obtainable by the routes this project tried"*. That is P-12's shape, written into the sentence that fixes a P-12-adjacent finding. Narrowed.
- **The second wording cited `rippled#6885` as an upstream issue citing a Sherlock finding by number.** `claims-check` on the paragraph flagged the scope clause as resting on secondary coverage, which is why the citation was added, and **reading `#6885` before committing showed it cites no Sherlock finding** — it only says the issue *"belongs there"* if the contest's scope includes mpt-crypto. The session had described `#6885` as citing the contest since round one, **having never read it**; it appeared in a search for the word. The citation now points at `mpt-crypto#102`, which cites **Sherlock #2759 (Medium)**, an inbox-poisoning finding against MergeInbox with a PoC against rippled. That is also the primary evidence B-30 lacked for its scope claim, which rested on secondary coverage, and B-30 now carries it.

**The lesson is not new: a search hit is not a reading.** What is new is where it landed — in the front-door sentence that tells a stranger what was checked.

## NOT EDITED

- `docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md:265`, *"no existing coverage"* for F-10 — a dated record of what was checked on 2026-08-16. B-30 names it.
- `docs/task-zero/DEVNET-CONVERT-2026-08-17.md:124` and `tools/spike-2026-08-17/README.md:56`, the two-link-line remedy — dated records of the build at `85dbac7`, as in `REVIEW-049c`.

## CLOSING THE ROTATION

Three rounds, and the findings shrank each time in the way that means convergence. Round one found overreach in the rows. Round two found fixes with copies. Round three found more copies, **all of one sentence family — the one-audit coverage check — and the old F-19 and F-8 wording**. Nothing in any round touched the executed evidence. **The rotation is closed as ruled.** What it leaves open is not a review question: B-30's list is a lexical bound over a named set, and it says so.
