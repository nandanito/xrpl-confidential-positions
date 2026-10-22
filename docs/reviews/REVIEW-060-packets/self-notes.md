# REVIEW-060, the adjudicator's own claims-check, written while the legs ran

Sentence by sentence against CLAIMS.md, before reading either leg. Kept out of
the tree until both legs returned.

| # | page, sentence | row | status | needed |
|---|---|---|---|---|
| S1 | how-it-works: "each confidential transaction carries zero-knowledge proofs" | README terms table: MergeInbox carries none | FALSE as worded | say the transactions that spend a confidential balance carry them |
| S2 | how-it-works: amendment status, dated 2026-10-21 | E-349 records the 03:09:59Z reading | supported, wrong citation | cite E-349, not the tool |
| S3 | how-it-works: "Only the holder can spend" | E-33 says only the holder of sk_A; README says the same | narrower than the row's form, and "the holder" reads as the account owner | "Spending needs the holder's key" |
| S4 | how-it-works: clawback "If the token allows clawback" | README: this project's issuances allow it | drops the fact that matters for this demo | add that this project's tokens allow it |
| S5 | how-it-works: lock power | README: this project's issuances were not made immutable | same omission | add it |
| S6 | how-it-works: "This project built that facility" | E-146 built the facility's movements; the walkthrough's design also names a permissioned domain and several funders, which were not built | slightly more than built | "built the core of that facility" or name what ran |
| S7 | how-it-works: facility steps omit the bank's public funding of the Dedicated Account | walkthrough step 3 | incomplete list of public amounts | add it, since "the size of the float" is public partly because of it |
| S8 | how-it-works: "Why are both ends public?" | WHAT-CONFIDENTIAL-MEANS, not a row | source not named | add the document to Sources |
| S9 | how-it-works: the four accounts "hold one demo token" | snapshot at 6300109: all four present and registered | supported at this build; a rebuild after a reset would contradict it, but AbsentReading would say so on the ledger pages | note only |
| S10 | overview and how-it-works: "The issuer can always read every balance" | P-9; PROTOCOL-FINDINGS on the discrete-log search width | P-9's own form; practicality is out of scope here | none |

Nothing matched a B row. No undated amendment claim. No prohibited word.
