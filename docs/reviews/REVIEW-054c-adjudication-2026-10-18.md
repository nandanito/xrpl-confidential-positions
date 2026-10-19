# REVIEW-054c — adjudication: F-13, two rounds, filed as mpt-crypto#155

- **Subject:** the F-13 draft, a paper erratum: §2.1's *"C₁ is transmitted once on-chain"* and the 1177-byte Send total.
- **Rounds:** two isolated Codex legs on 2026-10-18, with network. Their prompts, outputs, transcripts and the author's rulings are in `REVIEW-054-packets/`, written there the moment they existed.
- **Filed:** 2026-10-18 as [mpt-crypto#155](https://github.com/XRPLF/mpt-crypto/issues/155). Archived at `docs/upstream-filings/2026-10-18/03-mptcrypto-shared-c1-size.md`.

**Round one changed the filing's shape.** XLS-0096 §17.1, at the commit E-304 had read, already computes the Send payload at 1276 and 1210 bytes. The paper therefore contradicts the finalized specification, and the draft was rewritten to lead with that, with rippled's verifier path traced at `develop` and the shared-`C₁` check located inside `mpt_verify_send_proof` at the 1.0.2 rippled requires. The word-count finding was rejected on the gate's count; the suggestion to leave Zellic unnamed was rejected for consistency with F-17.

**Round two found two defects the rewrite had introduced** — *"incorrect"* for a paper that predates the adopted protocol, and an ellipsis inside a block quote — and both were fixed, the quotation checked as an exact substring of the specification. No third round: both were rewrite defects, not undischarged findings.

**Filing day:** a second model read it cold and found the footer named `3baaaac` while one permalink points at 1.0.2 (`376691c`). Fixed.
