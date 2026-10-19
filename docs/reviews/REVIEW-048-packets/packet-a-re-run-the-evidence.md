# REVIEW-048, leg A — re-run the evidence. Do the twelve rows' own commands reproduce?

You are an adversarial reviewer with **read-only** access to this repository and to a local clone of one of the upstream projects. Your job is not to reason about the prose. It is to **re-run the searches and diffs the evidence cells name** and report every place where the command does not produce what the row says it produces.

## The subject

`CLAIMS.md` rows **E-296 to E-307**, at lines 356 to 367 of `CLAIMS.md`. Read them first, in full. Each row is `| id | claim | evidence | grade |`.

They were written on 2026-09-14 by one person in one day and have had only that writer's re-read. Four of the findings they re-check — F-9, F-12, F-13 and F-17 — are about to be written up and sent to upstream maintainers, and these rows are the whole evidentiary basis.

## What you can reach

- **This repository**, at commit `a130479`. `UPSTREAM-FEEDBACK.md` carries the F-numbers the rows discuss. `CLAIMS.md` carries every other E- and F- and B- row they cite.
- **`/tmp/wconf/mpt-crypto`** — a real clone of `XRPLF/mpt-crypto`. It holds tags `1.0.0`, `1.0.1`, `1.0.2`, `1.0.4`, `1.0.5`, the commit `3baaaac` the rows call HEAD, the pin `85dbac7`, and `f196bdb`, the commit Trail of Bits reviewed. **`git -C /tmp/wconf/mpt-crypto <cmd>` works and you should use it heavily.** The working checkout is at `85dbac7`; use explicit revisions rather than relying on the checkout.
- `docs/references/` holds the Trail of Bits April 2026 PDF and the compact-sigma paper PDF.

You have **no network**. You cannot reach rippled, GitHub, npm, crates.io or Conan. Where a row's evidence needs one of those, say so and move on — do not guess at it.

## What to do

**For every command, path, line number, count, hash and tag that the evidence cells of E-296, E-297, E-299, E-304 and E-306 name, and that you can reach, re-run it or check it.** Those five rows rest on the mpt-crypto clone and the two PDFs, which you have. Then:

1. **Report every mismatch.** A line number that points at different code, a `git grep` count that differs, a diff the row says prints nothing that prints something, a tag that does not contain the commit the row says it contains, a quoted sentence that is not at the cited line.
2. **Report every command the row describes that you re-ran and that reproduced.** Silence is not useful to the adjudicator; name what you confirmed.
3. **For each negative claim in those five rows** — *"finds nothing"*, *"0 matches"*, *"the only X"*, *"is the only code that"*, *"never says"* — **try to falsify it with a search the row did not run.** Different spellings, different case, different directories, the same idea under another name. This project has repeatedly shipped negatives that fell to one extra spelling. That is your highest-value work.
4. **Check the claim cell against the evidence cell** for all twelve rows, including the seven you cannot verify against upstream. Where a headline asserts more than the evidence establishes, quote both.
5. **Cross-row contradictions.** These twelve rows were written in one sitting and share subject matter. Where two rows say things that cannot both be true, or where one row's evidence undercuts another row's claim, that is a finding, and it is the kind a single-row reading cannot see.

## Rules

- **Quote and cite.** Every finding gives the row id, the quoted sentence, and the command you ran with its actual output.
- **Rank most serious first**, marked HIGH / MEDIUM / LOW.
- **Do not soften and do not pad.** A row that survives your checks should be said to survive, in one line.
- **Distinguish three things**: the claim is *wrong*; the claim is *right but unsupported by the cited evidence*; the claim is *right and supported but stated more broadly than the evidence reaches*.
- Do not edit anything. You are read-only.

# Return format

```
## FINDINGS, most serious first
   n. [HIGH|MEDIUM|LOW] row id — [wrong | unsupported | overbroad | cross-row] — quoted sentence
      command run, and its actual output
      what follows
## NEGATIVES I TRIED TO FALSIFY, and how
## RE-RAN AND REPRODUCED
## COULD NOT CHECK (no network)
```
