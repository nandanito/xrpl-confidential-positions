# Reference material — manually retrieved

Three primary sources that the research sessions could not pull into context, for
different reasons. Until each is here and read, the gap against its name stays open.

## Required

- **`2026-04-ripple-labs-xrp-ledger-confidential-transfer-securityreview.pdf`**
  Trail of Bits cryptographic review of the Confidential Transfer implementation,
  April 2026, six weeks of effort. 17 findings: 3 high, 3 medium, 3 low,
  7 informational, 1 undetermined. Appendix F carries the fix review — 14 resolved,
  2 partially resolved, 1 unresolved.
  Source: `github.com/trailofbits/publications/tree/master/reviews`

  Not blocked by anything; it was simply missed in the first research pass, which
  covered the specification, the implementation and the documentation and never
  asked whether the code had been audited. **Read before Session 3 and before
  anything is filed upstream.** Two entries were withdrawn from
  `UPSTREAM-FEEDBACK.md` on 2026-08-16 because of what this report already contains.

  The findings that bear directly on decisions already made:
  TOB-RIPCTX-1 (ElGamal decryption bounded at 1,000,000 — invalidates part of
  TASK ZERO §9), TOB-RIPCTX-5 (timing side channels in Bulletproof generation,
  partially resolved — an input to ADR-0001's local signer), TOB-RIPCTX-13 (the
  one unresolved issue), TOB-RIPCTX-14 (spec/implementation discrepancies, only
  partially resolved — check before filing F-5).

- **`eprint-2026-602.pdf`** — IACR ePrint 2026/602, Cenk, Malhotra et al.
  `eprint.iacr.org` returns a permanent ban page to automated fetchers, so this
  can only arrive by hand. **Closes GAP-2.** Load-bearing for W-PQ's W2 workstream:
  which XLS-96 security properties are computationally versus unconditionally
  hiding, and what a store-now-break-later adversary recovers.

  *If a file with a plausible title is already sitting in this directory, confirm
  it before marking GAP-2 closed — open it and check the first page carries the
  ePrint identifier and the author list. A likely-looking filename is not
  verification, and a gap that looks closed while still being open is worse than
  one that looks open.*

- **`cmpt-compact-sigma.pdf`** — from `paper/` in `XRPLF/mpt-crypto`.
  Formal specification and security analysis of the compact AND-composed sigma
  proof. **Closes GAP-3.** ADR-0001 §(a) assumes the balance-linkage statement
  requires the sender's secret key, and grades that premise C precisely because
  this was unread. The whole custody decision rests on it, so read it far enough
  to confirm or refute that before Session 1 — if the assumption is wrong,
  ADR-0001 needs redoing and Session 3's spike changes shape.

## Committing

`.gitignore` excludes `docs/references/*.pdf` by default. Check each source's
redistribution terms before removing that rule — IACR ePrint terms vary per paper,
and the Trail of Bits and mpt-crypto documents carry their own. If in doubt, leave
the rule in place and record the retrieval date and source URL in `CLAIMS.md`
instead, so a later reader can retrieve the same document and check the citation.
