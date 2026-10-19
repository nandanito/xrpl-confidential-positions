# F-13 round one — the author's rulings (2026-10-18)

Round one ran in an isolated repository under `$TMPDIR`, with network. The GitHub check printed 200, there were no DNS failures, and the transcript mentions this project's paths only in the prompt's own instruction. Output: `f13-round-one-output.md`.

| # | Finding | Ruling | Checked how |
|---|---|---|---|
| 1 | The Trail of Bits note is misleading: TOB-RIPCTX-16 is related and Resolved | **Upheld, refined.** It is Resolved, and its fix moved the code to the shared-r proof. It does not address the ciphertext field layout or the paper's totals. "The later revision" is now named as the June 2026 report | `pdftotext` of the April report, fix review pp. 66-67 and summary table line 2665 |
| 2 | Scope the totals to the cryptographic payload | **Upheld** | XLS-0096 §17.1 itself excludes headers and metadata |
| 3 | Cite the current rippled verification path | **Upheld** | At rippled `develop` `7939339`: `ConfidentialMPTSend.cpp:299` calls `verifySendProofs` (`:101`), which calls `verifySendProof` (`ConfidentialTransfer.cpp:528`), which calls `mpt_verify_send_proof` (`:585`). In mpt-crypto 1.0.2, `mpt_verify_send_proof` (`mpt_utility.cpp:1106`) holds the shared-C1 byte check at `:1140` |
| 4 | Over the word limit (334, counted by hand) | **Rejected.** `make check-filing` counted 219 before the rewrite and 211 after | the gate |
| 5 | Cite XLS-0096 §17.1 | **Upheld, and it became the lead evidence.** §17.1 already computes 1276 and 1210, so the paper contradicts the finalized specification | XLS-0096 at `58ccd30`, lines 1010-1015 |
| — | Zellic need not be named | **Rejected, for consistency** with F-17, which names all three reviews | — |

Found while ruling: `CLAIMS.md` E-304 read XLS-0096 at this same commit and said only that it "never says C₁ is sent once". It missed that §17.1 states the corrected totals outright.
