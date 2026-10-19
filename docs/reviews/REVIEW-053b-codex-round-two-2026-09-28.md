# REVIEW-053b — Codex round two on the F-17 draft

- **Date:** 2026-09-28. Same setup as `REVIEW-053a`, with round one's findings and the author's rulings added to the packet. Narrow brief: did each fix discharge its finding, is every changed claim true, is the draft tight.
- ⚠ **Transcribed, not copied**, for the reason given in `REVIEW-053a`.

## Final report

Q1: the algebra and permalink fixes discharged their findings, but the scope fix did not; Q2: the rejections of a second ask and removal of required audit evidence are acceptable; Q3: `generate_deterministic_nonces` calls `RAND_bytes` once per valid invocation, all four compact provers use it, and no caller bypasses it, while the response and other permalinks resolve; Q4: the draft needs at least the stale-count cut. Commands included curl (200), checkout of the requested commit, exact GitHub searches (1/0/0/0/0/1; 88/19/16), and `make check-filing FILE=draft.md` (no Makefile rule). Verdict: not ready to file.

- [P1] State the complete nonce-reuse preconditions — draft.md:6. The opening still implies that reusing only `r` and `ρ` repeats all nonces. HKDF also includes `m`, `b`, `sk_A`, and every non-context statement input, so the attack requires the complete witness and non-context `x` inputs to repeat, with entropy omitted, while the context ID changes only the challenge.
- [P2] Narrow the claim about the paper's statement — draft.md:6. The paper does define the formal statement `x` at lines 283-284 and enumerates challenge-hash statement elements, including `TransactionContextID`, at lines 862-876. The defect is that Remark 6.1 does not clarify which of these sets `statement` means; saying the paper never says what it contains is false and is also an unrecorded negative claim.
- [P2] Correct the reproducible audit union count — draft.md:55-57. Running the exact commands gives 88 Attackathon results, 19 Sherlock results, and 16 base-branch PRs, but the first two sets contain three overlaps (`mpt-crypto#148`, `rippled#6885`, and `rippled#7018`), yielding 104 unique items rather than 106. Update that sentence and remove the stale historical note.
