# REVIEW-059c — adjudication of round one: the hosted demo as built and deployed

- **Date:** 2026-10-20
- **Subject:** architecture §6 step 9 as BUILT and DEPLOYED: the public commit
  `ccf76e73bf6629b29dece98cc15a050e3f60cad4`, which the live site was built from,
  and the deployed output built from it.
- **Why it ran:** the owner ruled on 2026-10-20 that step 9's build gets a review
  round. `REVIEW-058` reviewed the design over three rounds; the build had been
  checked by its own tests and controls and by no outside reader.
- **Register:** `CLAIMS.md` E-342. **Result:** the fixes listed under *What
  changes*, which round two reviews.

## The legs, and how their packets differed

| leg | model and access | packet |
|---|---|---|
| A | Codex `gpt-6.1-sol`, effort `high`, a fresh clone of the PUBLIC repository at the frozen commit under `$TMPDIR` with no remote, plus a byte copy of the deployed output root; `workspace-write` with network | five seams, with instructions to test by mutation on local copies and to run the live comparison. `round-one-prompt-codex.md` |
| B | Gemini through `agy`, effort `high`, no tools, from an empty directory | six questions, with 32 whole files, 26 whole register rows and the deployed pages' visible text inline. `round-one-prompt-gemini.md` |
| self | the adjudicator | written from 10:40Z, before either leg was launched, and committed only after both returned. `round-one-self-notes.md` |

**Withheld on purpose:** the self leg's measurement 5, that the build container
reaches the Mac's loopback through `host.docker.internal`, was in neither packet.
Both packets carried measurements 1 to 4. Leg B reached the network half from the
code alone (B1-3). Leg A described *"unrestricted build networking"* in seam 4 and
did not grade it.

Leg A ran its review scripts inside its clone, and they are kept in
`round-one-codex-review-scripts.md`. The transcripts were scrubbed with
`tools/scrub-personal-data.ts` before commit: 51 temp paths, and one container
home path in leg B's report replaced by hand with `[the container home]`.

## ⚠ Two defects in running the round, recorded first

**Leg A's first attempt was void.** It ran Step 0 and was stopped by the model
provider: *"This content was flagged for possible cybersecurity risk"*, 11,202
tokens, no review (`round-one-codex-attempt-1-stderr.txt`). The prompt asked an
*"adversarial reviewer"* to *"break"* things and *"construct outputs that
violate"* rules, and it named the private stores as holding *"real secrets"*.
The second attempt carried the same seams and questions reworded as a defensive
code review (mutation tests on local copies, *"find defects"*), and ran to
completion in 15 minutes. **The rewording changed no seam, question, grading rule
or stopping condition**. `round-one-prompt-codex.md` is the second wording; the
first is preserved verbatim in `round-one-codex-attempt-1-stderr.txt`, where
Codex echoed it before it was stopped.

**Leg B did not exit.** Its report ended with `END OF LEG B REPORT` by 10:54Z;
`agy` was still running at 11:08Z, ignored `SIGTERM`, and was stopped with
`SIGKILL` (exit 137). Nothing was lost.

## Where the legs agreed, and whether they could have disagreed

Three findings were reached by two legs from different evidence:

- **Check 8 trusts the page to label itself** (S-8, R1-2, B1-8). Leg B argued it
  from the gate's code inline; leg A demonstrated it by removing the marker and
  the wording together, and by hiding the wording with a stylesheet.
- **The policy check reads one string that is not the policy a browser enforces**
  (S-1, R1-1). The self leg measured a later route overriding the header; leg A
  found a duplicate directive inside the first route, which the self leg missed.
- **The build has network** (S-2, B1-3). The self leg measured loopback reach;
  leg B reasoned about outbound egress from the absent `--network` flag.

Each pair had different access and different evidence. That agreement is not one
reading distributed.

## Rulings

Grades are the leg's unless the ruling changes them. Every finding was checked at
source before it was ruled; the measurements are the adjudicator's, 2026-10-20.

| id | leg | claimed | ruling | why, and the fix |
|---|---|---|---|---|
| R1-1 + S-1 | A, self | HIGH, MEDIUM | **Upheld, HIGH** | **Measured**: a policy beginning `connect-src *;` gets 0 findings, because `new Map` keeps the last of two duplicate directives and a browser enforces the first. The browser check serves that same string and sees no cross-origin request; `compare-deployed` compares the identical string. **Nothing in the procedure notices, and the page would permit a connection anywhere.** S-1's later-route override also gets 0 findings in three placements. Fix: refuse a duplicate directive, refuse `headers` on any route but the first, and add a control for each |
| R1-10 | A | HIGH | **Upheld, HIGH** | **Measured by a real container build**: a file planted in a pre-existing `work/src` reached `static/assets/review059.js` in the output of a build of `ccf76e7`, which does not contain it; the build exited 0, the manifest said it mounted *"only a git archive of the commit"*, and `runChecks` gave 0 findings. Fix: the build refuses an existing `--out`, refuses the repository root, and checks the exported tree against `git ls-tree` of the commit before the container runs |
| R1-2 + B1-8 + S-8 | A, B, self | HIGH, HIGH, note | **Upheld, regraded MEDIUM** | The output complies today; the gap is that check 8 applies only to pages that label themselves, so a regression would pass. Fix: a named set of ledger pages must carry the marker; no other page may carry a 66-byte ciphertext; the browser check asserts the D-H2 sentences are in each ledger page's rendered text, which a stylesheet cannot hide from it |
| B1-1 | B | HIGH | **Upheld, regraded LOW** | D-H3 is held by the build having no issuer key, not by the gate: the container mounts neither store, so no figure can be computed, and one could enter only as text in a public commit. Fix: the gate's printed limits say so |
| R1-3 | A | MEDIUM | **Upheld** | The cryptography-package control fires because its fabricated notice does not match the package's licence file, not because the package is unadmitted. Fix: plant the authentic notice and require the *"not admitted"* finding |
| R1-4 | A | MEDIUM | **Upheld** | Removing seroval's entry gets 0 findings; only React and React DOM are required. The shipped list equals the 15 admitted packages, so the gate now requires equality, with a single-entry deletion control. Item 7 of the printed limits is corrected |
| R1-5 | A | MEDIUM | **Upheld** | **Measured**: leg A's two copies, one logging `console.error` and one throwing after the final navigation, both PASS the browser check, whose header says it fails on *"any uncaught exception or console error"*. Fix: handle `Runtime.consoleAPICalled` errors, and check the final navigation's interval like every page's, with self-test cases for both |
| R1-6 | A | HIGH | **Upheld, regraded MEDIUM** | Confirmed at `compare-deployed.ts:34-58`: no content-type check, the verdict's status never checked, and `/<page>/` never fetched though the routes serve it. Each needs the host to misbehave in a way that changes bytes it was not asked about. Fix: check all three |
| R1-7 + S-5 | A, self | MEDIUM, LOW | **Upheld** | `if (manifest.trial)` passes a manifest with no `trial`; the manifest's ledger is never compared with the pages'; an output altered together with its verdict passes. Fix: `trial === false`, the manifest's ledger index must equal every ledger page's, and the preflight re-runs `runChecks` on the bytes about to be uploaded |
| R1-8 | A | HIGH | **Upheld, regraded MEDIUM** | Confirmed: `readAccount` reads the position, `observerView` reads it again, and a negative second answer becomes zeros under state `present`. An honest pool cannot answer both ways at one validated index; a lying one is D-H2's accepted risk and could show any value. It is still the falsifier's shape and one read removes it. Fix: one read, passed to the view |
| R1-9 | A | MEDIUM | **Upheld in part, LOW** | `snapshot()` reads `server_info` again and ignores its `network_id`: fixed, the pin refuses a second answer that is not Devnet. Pinning the ledger hash is **not** done: within D-H2's accepted risk a lying server can make any value wrong, the facility reader is shared with step 7, and the Rust reader would drift (E-330's shape). Named as a residual |
| R1-12 | A | HIGH | **Upheld, regraded MEDIUM** | The custody page says a custodied account *"cannot derive its own ElGamal key"*. The research it summarises names the exception — a platform deriving inside its own boundary is *"not obviously impossible"* (`CUSTODY-2026-08-28.md`) — and the page dropped it. Overstated, not invented. Fix: state the exception and why it needs issue #10 |
| R1-14 | A | HIGH | **Upheld, regraded MEDIUM** | Holder A's note is a hard-coded claim about ledger state. It matches today's reading; any send to A's inbox or a Devnet reset makes it false at the next rebuild, and it renders above an absent account too. Fix: the note describes the account, not its balances, with a test that no note names a balance state |
| S-2 + B1-3 | self, B | MEDIUM | **Upheld** | **Measured**: a listener bound to the Mac's `127.0.0.1` answered from inside the build image. The records say the container *"cannot reach the private stores"*, true of files, silent on network. Fix: the Vite build and the assembler run in a second container with `--network none`; install and the snapshot keep network, and the README, the manifest and `ADR-0004` name what remains |
| R1-11 | A | MEDIUM | **Upheld, regraded LOW** | The canaries prove two values are absent **verbatim**. Fix: the records say verbatim |
| R1-13 | A | MEDIUM | **Upheld, LOW** | The wallet gap drops E-206's *"or in Xaman's backend"* and states an undated negative. Fix: restore the backend case and date the check to E-206 |
| S-3 | self | LOW | **Upheld** | The gate now checks `Cross-Origin-Opener-Policy` and `Permissions-Policy` too |
| S-4 | self | LOW | **Upheld** | The licence file's preamble must equal the build's fixed header, and an unpaired trailing part is refused |
| S-6 | self | LOW | **Upheld** | The architecture document's revision line said *"Step 9 is not built"*. A revision 12 line records the build, the deploy and this review |
| S-7 + B1-4 | self, B | LOW, HIGH | **Upheld, LOW** | *"Step 5"* is the launch plan's numbering; the README, which is the release procedure, calls it step 7. Ambiguous rather than false. Fix: name the README's step 7 |
| B1-2 | B | MEDIUM | **Upheld, regraded LOW** | The footer echoes the published verdict and checks nothing in the browser. Fix: the footer says so |
| B1-5 | B | MEDIUM | **Upheld, regraded LOW** | E-336 uses *"alias"* for two addresses. Fix: name the production alias; the same sentence in `NEXT-SESSION-PROMPT.md` too |
| B1-6 | B | LOW | **Upheld at the public commit; already fixed in the archive** | The archive's §6 step 9 names the `ccf76e7` redeploy (E-339); it publishes with the next public update |
| S-9 | self | LOW | **Upheld** | Found while ruling B1-7: the README says the repository *"does not tell you how to create"* a holder profile, while `signer/README.md` documents the profile's fields and an onboarding command that prints them. Fix: narrow it |
| B1-7 | B | LOW | **Rejected** | The overview says the README *"does not yet explain"* profile creation. That is a statement about the project's own README, which says the same in its own words, and the README's *Run it* section carries no such steps (read 2026-10-20). P-12's search is reading the section the sentence names |
| table rows | A | — | **Rejected as findings, kept as context** | A changed amount, both ledger indices changed together, and an obfuscated socket name pass `runChecks`. The gate has no ground truth for values, the preflight now binds the index to the manifest, and the policy's `connect-src`, fixed under R1-1, is what stops an assembled connection. Two rows lead to fixes: a protocol-relative script URL is now matched by the URL check, and a script-created `prompt()` is named in the printed limits beside item 5 |

## The stopping condition

Set before the round, word for word: *"Round one reviews the build. If it upholds
any finding that changes code, a gate or a record, round two runs on the fixes
alone, and it is the last unless it finds a fix that did not discharge its
finding; a third round is then the owner's decision."*

Leg A: **no**, but round two must include the fixes' consequences across the
release path. Leg B: **yes**, because the pipeline is chained: a fix to the gate
changes every digest, and reviewing a diff alone would not show that the whole
procedure still runs.

**Ruled: the condition stands, and leg B's point is taken as a statement of what
"the fixes" are.** Round two's subject is the fix diff **and** an output rebuilt
from a commit carrying it, gated, browser-checked and preflighted under the fixed
tooling. It is not a redeploy: deploying is the owner's step, and the comparison
against the live site is the owner's to run after it.

## What changes, and what does not

The live site is unchanged by this round. Four fixes change page text (R1-12,
R1-13, R1-14, B1-2), so the demo is stale until it is rebuilt from a public commit
carrying them and the owner redeploys. Until then the deployed custody page
carries the overstated sentence.

Residuals named, not fixed: the ledger hash is not pinned (R1-9); third-party code
in `bun install` and the snapshot keeps network and can reach the build machine's
loopback (S-2); dependency code can still modify `/src` during the build, which
neither the canaries nor the tree check see (R1-10's second half).
