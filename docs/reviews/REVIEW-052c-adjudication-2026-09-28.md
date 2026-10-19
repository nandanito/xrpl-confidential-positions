# REVIEW-052c — adjudication: rule 1's review of the F-9 filing, and the filing

- **Date:** 2026-09-28
- **Subject:** the F-9 draft for `XRPLF/mpt-crypto`, written with `/upstream-issue` on 2026-09-22.
- **Result:** filed as [mpt-crypto#148](https://github.com/XRPLF/mpt-crypto/issues/148) on 2026-09-28, after the owner signed off on the final text. Archived at `docs/upstream-filings/2026-09-28/01-mptcrypto-conan-remote.md`.
- **Recorded as:** `CLAIMS.md` E-314.

## How the review was run, including what went wrong

The author refused `/issue-review` on their own draft, as the command requires. The owner chose a Codex leg.

1. **First attempt, void.** The leg ran from a repository inside the author's scratchpad and read the parent directory. That exposed the author's conclusions to it, which rule 1 forbids. It also had no network, so it re-ran nothing. See `REVIEW-052a` §"An attempt that does not count".
2. **Round one, clean** (`REVIEW-052a`). It ran from a fresh repository under `$TMPDIR`, with network, after a precondition check. It confirmed the defect, and it went further than the author: it ran `init.sh` in full and regenerated the lockfile.
3. **Round two, narrow** (`REVIEW-052b`). It covered the fixes, the new claims and verbosity, set up the same way.

## Round one: five findings

| # | Finding | Ruling |
|---|---|---|
| 1 | Prose is 316 words, over the limit | **Rejected.** `make check-filing` counted 207, and the protocol says the gate wins. Round two counted 199 by hand, which confirms it |
| 2 | The search block cannot be run as written | **Upheld.** It now lists exact commands |
| 3 | *"The contest findings are not public"* is too broad, since `rippled#7026` is public | **Upheld.** Now *"full findings report not found"* |
| 4 | *"So CI passes"* is inferred | **Upheld.** Replaced with a link to the passing run at `3baaaac` |
| 5 | The README alternative weakens the one ask | **Upheld.** Removed |

The author then re-ran `init.sh` and the regeneration, so the draft reports the author's own runs rather than the leg's. The substitution the draft had disclosed, a remote added by hand, went away as a result.

## Round two: every fix discharged, one footer defect

- **The footer's Trail of Bits sentence was under-specified.** `mpt-crypto#122` cites a later Trail of Bits report, dated June 5, 2026, whose Appendix G carries a Conan command for running CodeQL. The April report has 0 matches for *conan*. The sentence was true of the April report and did not say which report it meant. **Upheld.** The report is now linked, and the later revision is named as not obtained.
- **The contest count moved.** It was 104 on 2026-09-22 and 103 on 2026-09-28. **Upheld.** Both counts are given with dates.
- **Verbosity: three cuts, all repetition.** **Upheld.** Prose went from 179 to 158 words.

The owner then asked for the audit and contest searches to move from the footer into the collapsed searches section. The move changed no claim. While moving it, the author rewrote *"I could not obtain its later revision"* as *"Its later revision is not public"*. That is a broader negative than the evidence supports, the same shape `REVIEW-050` caught in the README. It was reverted before filing.

## Stopping

There was no third round. Round two's only defect was a footer sentence, and its fix was a narrowing verified against source. That is the two-round rule's stopping condition. The owner's sign-off read was the final check.

## Not recoverable

The scratchpad was cleared between 2026-09-23 and 2026-09-28. That took round one's output file, the exact draft it reviewed, and the author's Conan run logs from 2026-09-22 and 2026-09-23. Round one's report is transcribed from the session. Round two re-ran every claim on 2026-09-28, and those results stand in place of the lost logs.
