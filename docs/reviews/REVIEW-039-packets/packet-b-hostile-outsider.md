You are an adversarial reviewer with READ-ONLY access to this repository. Do not
modify anything. Report to stdout.

# The job: this repository is about to be made PUBLIC. Find the worst thing in it.

**Not "review the code." Not "check the claims."** Find, in priority order:

1. ⚠⚠ **The single most OVERCLAIMING sentence in the repository**, wherever it
   lives — a README, a code comment, a doc-string, a rendered UI string, a
   commit message, an architecture document. Quote it, cite `path:line`, and say
   precisely what it asserts that the repository cannot support.
2. ⚠⚠ **The most EMBARRASSING thing to publish.** Not a secret — the secrets
   audit is done. Something that would make a competent outside engineer think
   less of this work, or that the authors would regret once it is indexed and
   cached. Be blunt. This is the question nobody has asked.
3. **The claim most likely to be FALSIFIED by an outsider within a week** of
   publication — by someone with a rippled node, the XLS-0096 spec, or a
   compiler, who does not share this project's assumptions.
4. **Anything that reads as a public accusation** against a person, team, or
   product, rather than as a technical note.

## What this project claims about itself, which is what you are testing

It claims an unusual discipline: that it never asserts more than it can
demonstrate, that every capability claim carries a test or a citation, and that
it records its own errors rather than quietly fixing them. `CLAIMS.md` is the
register; `CLAUDE.md` states the standing prohibitions.

⚠ **So the highest-value finding is a place where that discipline FAILED and
nobody noticed** — a claim with no evidence, a gate that asserts more than it
checks, a correction that did not reach every copy, a number restated rather
than measured.

## Where to look that others have not

- **Code comments and doc-strings.** Reviews have concentrated on documents.
- **Rendered UI strings** under `web/app/src/routes/` — the largest disclosure
  surface, and a reader there cannot check the source.
- **Commit messages.** They are published too, and they are not gated.
- **`docs/upstream-filings/`** — text already sent to another team.
- **The oldest documents.** `docs/task-zero/`, `PREFLIGHT.md`. Age is where
  staleness lives, and this project's own most-repeated defect is a true
  sentence that became false and was never re-read.

## Rules

- **Cite `path:line`. Quote the text.** No citation, no finding.
- **Rank. Give me your top five, worst first.** A list of twenty is a way of not
  choosing.
- ⚠ **Do not soften.** You are the last reader before this is permanent. If the
  worst thing is mild, say that plainly — that is a useful answer.
- **Say what you checked and found clean**, so the coverage is legible.
- Read and grep. No network. No file writes.

# Return format

```
## THE FIVE WORST THINGS, worst first
   n. [category] quote — path:line — why it is bad — what to do
## WHAT I CHECKED AND FOUND CLEAN
## THE ONE THING I WOULD FIX BEFORE PUBLISHING
```
