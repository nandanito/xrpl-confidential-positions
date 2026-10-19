# REVIEW-058 round three — self leg

- **Subject:** round two's fixes, from `629f216` to the frozen
  `29fc4ebacd24918e245e38f678dc3f621c054a69`.
- **Written:** 2026-10-19, from 11:29Z, before the round-three leg was launched,
  and kept uncommitted until it returned.

## Findings on the frozen commit

- **U-1 | LOW | The flattened phrase scan still misses a copy wrapped inside a
  blockquote or a line comment.** `tools/check-disclosure-phrases.ts` collapses
  whitespace, but a Markdown blockquote carries `> ` and a TypeScript comment
  carries `// ` at the start of each line, so a phrase wrapped across two such
  lines flattens to `… cannot be > closed …` and does not match. JSX text and
  plain Markdown paragraphs, the two forms round two demonstrated, are caught.
  The gate's printed list of what it does not say does not name this. | Name it in
  the gate's output, or strip a leading `>`, `//` or `*` before flattening, with a
  control for each.

## What I tried and found nothing in

- Every phrase round two corrected, grepped outside `docs/reviews/` after the
  commit: *"nothing of ours runs"*, *"once per page"*, *"one read per page"*,
  *"one pinned read"*, *"no path from a connected wallet"* and *"different API
  would close"* stand only as recorded retractions.
- `REVIEW-058d`'s count of regraded findings: one, R2-6, matching its table.
