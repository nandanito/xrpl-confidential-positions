# REVIEW-058 round two — self leg

- **Subject:** round one's fixes, from `d764bca` to the frozen
  `629f21621c723cd7f61afec032c09248760b3ddf`.
- **Written:** 2026-10-19, from 11:07Z, before either round-two leg was launched,
  and kept uncommitted until both returned.
- **Before freezing**, two wording defects in revision 2 were found and fixed in
  `629f216` itself: D-H2 said each value was read from *"one public Devnet node"*
  when M3 shows a pool, and the H3 argument said no reader of the posts has a
  Devnet account. Both checks that prompted that pass also came back clean: the
  local web application loads nothing from a third-party host, and nothing but
  `Snapshot.mptoken` relies on a "not found" answer.

## Findings on the frozen commit

- **T-1 | MEDIUM | The TypeScript reader still lacks the Rust reader's third
  check.** `signer/src/ledger.rs:702-718`, `came_from`, refuses any answer not
  marked `validated: true`, positive or negative, before it compares the index.
  `facility/src/loopback.ts` checks `validated` on neither path. Round one's fix
  closed two of the three checks that had drifted (the negative answer's ledger,
  and the entry type), and revision 2, E-328 and `REVIEW-058c` all describe the
  reader as now checking *"as the Rust one does"*, which is true of those two and
  reads as parity. **Fix the class, not the example**: this is the same drift, one
  check further along. | Add the `validated` check to `Snapshot.pinned` on both
  paths, update the fakes, and add a test that fails without it.
- **T-2 | LOW | `REVIEW-058c` says *"Six findings were regraded down"*; the table
  regrades five** (R1-7, B1-1, B1-5, B1-8, B1-9). A count restated by hand in the
  document that rules on other people's counts. | Correct the number, or derive it.

## What I tried and found nothing in

- The new reader tests fail against the reverted reader and pass on the fix,
  measured before commit. Whether removing only the type check, or only the
  index check, leaves a test red was **not** measured separately.
- Revision 2's H3 claim that a visitor's browser sends nothing but page loads to
  Vercel: no external URL in `web/app/src` (`grep` for `http`, font CDNs and
  package CDNs).
- The two corrected pages against `web/app/src/routes/issuer.tsx`: the issuer page
  reports *"SUCCEEDED"* or *"not available"* and never a figure, which the new
  front-page line now says.
