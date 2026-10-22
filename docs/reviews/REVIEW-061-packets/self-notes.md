# REVIEW-061, the adjudicator's own pass, written while the legs ran

Before launch, every label was checked against its source while the diagrams
were built, and seven were changed:

| # | where | was | why | now |
|---|---|---|---|---|
| S1 | local architecture | "Submits to Devnet, with fail_hard set" beside the API, under the facility's Pair/Prepare arrow | the layout read as Pair/Prepare going to the submitter; and run-facility.ts makes one control submission without the flag (E-146) | two rows, viewing and transacting; "the facility sets fail_hard on its movements" |
| S2 | position, field by field | the issuer's copy "always present" | the issuer page handles a position without one | "kept beside every confidential balance" |
| S3 | who can read what | a holder's view of balances: "their own only" | contradicts "anyone" seeing a recognisable zero | "their own, and any recognisable zero" |
| S4 | two keys, wallet | wallets "hold" the ElGamal key | the wallet page says none "kept" it | the wallet page's verb, dated |
| S5 | custody | the standalone key's holder "reads every balance, permanently", in violet | it reads that account's balances; violet means the issuer | the page's own words, neutral colour |
| S6 | custody | "decryption key" followed by the section number "2" | check 8b reads a digit after decrypt- in one run of text as a figure | "a permanent key to its balances" |
| S7 | who can read what | "yes" in green, "partly" in amber | every other diagram uses green for hidden and amber for public | neutral, a dashed cell for a partial yes |

Doubts carried into the round, not changed:

- The architecture panel's lead says "The project itself runs on one machine".
  The README says one machine is a property of the demonstration, not the
  design; the caption says so, the lead sentence does not.
- The overview's perimeter diagram omits the token's total supply from
  "Public everywhere"; it names the confidential total only.
