# REVIEW-053c — Codex round three on the F-17 draft

- **Date:** 2026-09-28. Same setup, narrowest brief: is the opening paragraph now true and complete, is "leaves that open" fair, do the three corpus commands give 88 / 19 / 16, and is anything in the changed sentences new and false.
- ⚠ **Transcribed, not copied**, for the reason given in `REVIEW-053a`.

## Final report

Q1 is not fully satisfied: the retry conditions need unchanged keys and balance ciphertext, and the §6.2 description is overstated; Q2's claim that Remark 6.1 leaves `statement` open is accurate. Q3 is confirmed: the commands returned 88, 19, and 16, with unions of 104 and 106, and `mpt-crypto#148` appeared in both searches; Q4 therefore has the two inaccuracies above, so the draft is not ready to file.

- [P1] State the unchanged keys and balance ciphertext — draft.md:6. The nonce inputs also require the same sender/recipient keys and identical `B1`/`B2`; the paper's formal `x` includes those values, while the HKDF input includes `sk_A`. A retry on the unchanged ledger state has them, but the same scalar balance alone does not guarantee the same balance ciphertext, so state this condition explicitly.
- [P2] Narrow the §6.2 statement-element claim — draft.md:6. Section 6.2 says the challenge hash includes a domain-separation tag, public-key/ciphertext components, first-round commitments, and `TransactionContextID`, then says only that omitting any statement element allows attacks. It does not call every hash input a statement element, so this new characterization is inaccurate.
