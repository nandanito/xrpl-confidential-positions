# REVIEW-058 round one — self leg

- **Subject:** `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md` and
  architecture §6 step 9, at the frozen commit `d764bcaa75add41613a67d9cbb48c48038475cb4`.
- **Written:** 2026-10-19, from 10:30Z, **before either external leg was launched**,
  and kept uncommitted until both returned. The author of the subject wrote it.
- **What happened before freezing, recorded so it is not mistaken for a review
  result.** Two defects were found and fixed while the draft was still a draft.
  Preparing these notes showed that option B's sum check passes for a forger,
  because `ConfidentialOutstandingAmount` is public and anyone can split it among
  holders, so D-H3's recommendation moved from B to A. Then `/claims-check` on
  the ADR found five claims that outran their evidence: *"any origin"* from three
  origins, *"no logs of ours holding visitors' queries"* while the observer route
  puts the account in the URL, *"every statement … a visitor can check against
  the ledger"* for a specification fact, an unsourced *"per visitor IP"*, and
  unsourced error-code names. All were corrected before `d764bca`.

## Findings on the frozen commit

`S-n | grade | claim | evidence | smallest fix`

- **S-1 | MEDIUM | The page may never HOLD a secret, but nothing says it may never
  ASK for one.** The may-never-touch list and the gate cover a seed or key in the
  shipped output. A public page carrying this project's name, whose capability
  matrix discusses master seeds, is the obvious shape for a phishing copy, and a
  later page that "tells a visitor how to run the signer locally" (launch plan
  phase 2 step 3) is one careless form away from inviting a paste. | ADR-0004
  *What the hosted surface may touch*; launch plan phase 2 step 3 | Add *"never
  asks a visitor for a seed, key or secret, in any input"* to the never-touch
  list, step 9's falsifier and the gate.
- **S-2 | MEDIUM | The shipped bundle is a distribution of third-party code, and
  its licence notices are priced nowhere.** Phase 1's `NOTICE` and
  `docs/third-party/INVENTORY.md` cover the repository's tracked text. A static
  build ships React, TanStack, `@noble/curves`, `ripple-address-codec` and their
  dependencies as minified code on a public URL, and the MIT and ISC licences
  require their notices to travel with a copy. The ADR calls the output *"the
  static output of the public repository's own source"*, which is also inexact
  for the same reason. | ADR-0004 *Why this shape*; `NOTICE` | Name the bundle's
  notices as a build requirement, and say *"built from the public repository and
  its locked dependencies"*.
- **S-3 | MEDIUM | The host can add script to a page, and the falsifier does not
  name it.** Step 9 is falsified if the page ships bytes other than the gated
  ones, and the never-touch list excludes third-party script. A host that injects
  its own script into some deployments, a preview toolbar for example, would
  violate both without any change of ours. Whether Vercel does this for a
  prebuilt production deployment was **not checked**. | ADR-0004 D-H4; step 9's
  *Falsified if* | Make phase 2 step 5's live check compare the served HTML with
  the gated output, and name host injection as what it is looking for.
- **S-4 | LOW | D-H2's first sentence says more than the design guarantees.**
  *"No amount can be published because of it"* is true of the page, which cannot
  sign. It is not true of a reader who copies a displayed `HolderEncryptionKey`
  into their own tooling: a lying node then reaches F-23 through the reader. |
  ADR-0004 D-H2 | *"Nothing on this page signs or submits. Do not use a value
  shown here to build a transaction."*
- **S-5 | LOW | D-H2's "Do not accept" row implies H3 escapes the acceptance.** H3
  still reads one node, once, at build time, and a lying node then bakes wrong
  values into every page. It changes when the risk is taken, not whether. |
  ADR-0004 D-H2 table | Say H3 moves the read to build time and still needs the
  first sentence.
- **S-6 | LOW | D-H4 option A prices the token as a cost and not as a
  credential.** A Vercel token on the owner's machine can replace what the public
  page says, which is the same kind of power D8 exists to fence for the
  repository. Its scope and expiry are not named. | ADR-0004 D-H4 | Name a token
  scoped to the one project, with an expiry, kept where D8's export folder is.
- **S-7 | LOW | Where the Content Security Policy lives is not said.** For a
  prebuilt static deployment it is either a response header in the build
  output's configuration or a `<meta>` tag, and the two do not support the same
  directives. | ADR-0004 gate list | Say which, and make the gate read the served
  header rather than the source.
- **S-8 | LOW | A visitor cannot tell what built the page.** Nothing on the page
  names the public commit it was built from, so *"ships bytes other than the
  gated ones"* is checkable by the owner and by nobody else. | step 9's
  *Falsified if* | Render the commit and the gate's verdict in the page footer.

## What I tried and found nothing in

- **Trigger 4 under every D-H3 option.** A and B have no request handler and no
  decryption; C adds a verifier, which decrypts nothing. No oracle.
- **E-309's quotations and the launch plan's.** Both read correctly against the
  sources at `d764bca`.
- **M3's inference.** The four readings' lower bounds were 5,193,077, 5,193,077,
  5,171,980 and 5,171,980, in that order. A single server's lower bound moving by
  21,097 ledgers within a second, in either direction, is not plausible, so *"two
  connections can reach two different servers"* stands as worded.
