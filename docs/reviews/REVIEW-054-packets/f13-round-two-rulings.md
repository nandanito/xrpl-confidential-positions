# F-13 round two — the author's rulings (2026-10-18)

The round ran isolated, with network: the GitHub check printed 200, there were no DNS failures, and project paths appear only in the prompt. It confirmed the call chain, the 1.0.2 check, TOB-RIPCTX-16's status, the component table and the arithmetic, and it accepted both of round one's rejections.

| # | Finding | Ruling |
|---|---|---|
| P1 | *"The paper's figures are incorrect"* overclaims, because the paper predates the adopted protocol | **Upheld.** It now reads *"The paper's total does not match the adopted protocol"*, and the title says *"below the protocol's"*. Both defects were introduced by the round-one rewrite |
| P2 | The XLS-0096 quotation was not verbatim (an ellipsis inside a block quote) | **Upheld.** The text is restored, and both quoted lines were checked as exact substrings of XLS-0096 at `58ccd30` |
| P3 | Shorten the Devnet line | **Upheld.** It now reads *"My Devnet measurements of three Sends on 2026-08-17 matched these totals."* |

**Stopping.** No third round. Round two found two defects introduced by the rewrite, not a round-one finding left undischarged. One fix is an exact-substring check against the source; the other uses the reviewer's own wording. `make check-filing` passes at 210 prose words.
