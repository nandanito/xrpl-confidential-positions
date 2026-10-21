# REVIEW-059 round three — self leg

- **Subject:** round two's fixes only, `bbe5557..3934ae1` (E-346), and the output
  rebuilt from `3934ae1`, `wconf-hosted-builds/review059-r3-3934ae1`.
- **Ruled by the owner on 2026-10-21:** run the third round as `REVIEW-059d`
  recommended.
- **Stopping condition, set before the round, word for word:** *"Round three
  reviews round two's fixes only, with one repository leg; the rotation closes
  after it, whatever it finds."*
- **Written:** from 2026-10-21T01:35Z, before the leg was launched; committed after
  it returned. Not in the leg's tree.

## Measurements, 2026-10-21

1. The rebuild from `3934ae1`: two containers, tree check passed, ledger
   6,285,074.
2. The gate on it: 52 of 52 controls, full sweep with the local store, PASS,
   digest `981bc510…`.
3. The browser check on it: PASS, 6 pages, 47 requests.
4. The preflight on it: REFUSED only because `3934ae1` is not on the public `main`.
5. `runChecks` on that output with one change each (`scratchpad` probe, results
   below).

## Findings, measured before launch

- **S3-1, LOW. The issuer-figure check is lexical and misses the next wordings.**
  *"Issuer's decrypted view of Holder A: 42"* and *"The issuer decrypts Holder A's
  balance to 42."* each give 0 findings: the first because *view* is not one of
  the nouns, the second because the verb comes first and no colon follows. A
  label in one table cell and the number in the next IS caught, because
  `pageText` joins them. Printed limit 9 says the check finds a labelled figure;
  these are labelled, so the limit overstates by the width of a word list.
- **S3-2, LOW. An X-address outside the ledger pages passes.** The address check
  matches the classic `r…` form only; an X-address encodes the same account.
- **S3-3, note. A 64-hex transaction hash outside the ledger pages passes.**
  Whether a transaction hash is a *"ledger value"* in the falsifier's sense is
  arguable; printed limit 8 lists what is caught and does not list hashes.

## What I tried and could not break

- The unbroken rebuild gives 0 findings, so the widened checks do not fire on the
  real pages, including the issuer page's own *"decrypted figures:"* prose.
- A label and a number in adjacent table cells are joined by `pageText` and
  caught.
