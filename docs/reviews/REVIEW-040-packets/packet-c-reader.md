DO NOT USE ANY TOOLS. Everything you need is pasted below. You have no
repository, no internet, and no prior knowledge of this project.

# You are a reader trying to FIND things, not a reviewer

A software project keeps a "claims register": a large markdown file where every
factual claim the project makes gets a row with its evidence and a grade. The
file is ~435 KB and ~318 rows, and rows average over a thousand characters.

Two navigation aids were built for it. Both are pasted below. **Your job is to
use them to answer the questions, and to report honestly where they failed you.**

⚠ **Do not review the writing. Do not look for defects in the documents.**
Report what actually happened when you tried to find something. If you could not
find an answer, that is the finding — say where you looked and what you expected
to be there.

⚠ **Nobody has ever asked this project's reviewers whether a person could READ
this material.** Four previous review rounds and eleven reviewers all asked
whether the claims were TRUE or whether they were FAIR TO PUBLISH. A reader
found a defect none of them did. You are that instrument.

## The questions

1. **What has this project learned about "gates" — its automated checks?** Give
   the gist in your own words, and say which document you used.
2. **The project says a certain mistake keeps recurring. Which one, and roughly
   how many times?**
3. **Find the row about a test that was "undefined behaviour".** What is its id,
   and what happened?
4. **How would you find out whether row `E-176` was executed or merely reasoned
   about?** Walk me through the steps you actually took.
5. **If you wanted to read everything this project knows about SECRETS — keys,
   seeds, wiping memory — where would you go, and how confident are you that you
   would get all of it?**
6. ⚠ **Which of the two navigation aids did you actually reach for, and why?**
   Was the other one useless, redundant, or just not what you needed?
7. ⚠ **What confused you?** Anything you had to read twice, any place two
   documents seemed to say different things, anything you expected and did not
   find.

## Then, one more

**If you had to explain to a colleague how to find something in this register,
what would you tell them?** One paragraph. If your answer is "I would not use
these files, I would just search the big one", say that — it is a real finding.

---

# DOCUMENT 1 — docs/claims/by-topic/README.md

# CLAIMS by topic

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if these files drift from `CLAIMS.md`.

[`CLAIMS.md`](../../../CLAIMS.md) is chronological and append-only. **These are views of
it grouped by subject** — the rows are not moved, and a row appears under every topic
it belongs to. [`docs/CLAIMS-INDEX.md`](../../CLAIMS-INDEX.md) answers *where is E-181*;
these answer *what has this project learned about X*.

**318 rows across 12 topics**, counted where they are parsed.
⚠ The topic counts below sum to more than the row count, because a row can carry
several topics. That is the point of a view rather than a split.

| topic | rows | what is in it |
|---|---|---|
| [Protocol and cryptography](protocol-and-crypto.md) | 139 | What XLS-0096 and the libraries actually do — field codes, sizes, proofs, encryption, the confidential balance model. |
| [Instruments and gates](instruments-and-gates.md) | 55 | Gates, tests and detectors — including the many that reported PASS while the thing they checked was broken. |
| [Review rounds and adjudication](review-rounds.md) | 56 | What adversarial rounds found, what legs got wrong, and what the two-round rule has cost and bought. |
| [Claims, prose and drift](claims-and-drift.md) | 62 | Sentences that outran their evidence: stale notes, false disclosures, retracted claims and the documents that carried them. |
| [Secret handling](secret-handling.md) | 28 | Keys, seeds and scalars — what wipes, what does not, and the residuals named rather than closed. |
| [Devnet execution](devnet-execution.md) | 46 | What was actually submitted and validated on standard Devnet, and what a `tesSUCCESS` does and does not establish. |
| [Counts and numbers](counts-and-numbers.md) | 11 | The project's most persistent failure mode: a number restated instead of derived. |
| [Upstream, libraries and filings](upstream-and-filings.md) | 41 | rippled, mpt-crypto and the published packages — findings raised upstream and the build friction behind them. |
| [Confidentiality limits](confidentiality-limits.md) | 25 | What this system does not hide: the counterparty graph, timing, and every claim the register forbids. |
| [Environment and tooling](environment-and-tooling.md) | 11 | The build environment, the ephemeral `/tmp/wconf` tree, and the session mechanics that have cost real work. |
| [Decisions, rulings and scope](decisions-and-scope.md) | 61 | ADRs, decision requests and rulings — what was decided, what was reopened, and what a coding session may not choose. |
| [Web tier](web-tier.md) | 7 | Architecture §6 step 8: the read-only Elysia/TanStack tier, its gate, and the boundary it does and does not move. |

⚠ **A topic is a finding aid, not a judgement.** It says nothing about whether a
row is true or its grade deserved. Assignment is **LEXICAL, over a NAMED SET** of
patterns matched against each row's headline, plus an explicit override list in
`tools/build-claims-topics.ts` for the rows the patterns do not reach.

==============================================================

# DOCUMENT 2 — docs/claims/by-topic/instruments-and-gates.md

# Instruments and gates

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

Gates, tests and detectors — including the many that reported PASS while the thing they checked was broken.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

**55 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [E-20](../../../CLAIMS.md#L61) | Established | The issuer can unilaterally clear sfDomainID, removing the domain gate without holder consent | A |
| [E-59](../../../CLAIMS.md#L109) | Established | The two harnesses CLAUDE.md requires now exist and both self-verify. | A |
| [E-68](../../../CLAIMS.md#L119) | Established | The keygen construction reproduces from its own prose, by two implementations, and its test is not a false pass. | A on reproduction,… |
| [E-73](../../../CLAIMS.md#L124) | Established | The signer skeleton is built and runs, and architecture §6 step 1's named falsifier passes. | A, executed |
| [E-85](../../../CLAIMS.md#L136) | Established | E-76 is closed: observer-harness.ts --assert-no-r-reuse has now been run against transactions this project's own code produced, and it passes. | A, executed |
| [E-87](../../../CLAIMS.md#L138) | Established | A real defect in the signing path was found by a test, not by review, and it would have been rejected by every validator. | A |
| [E-88](../../../CLAIMS.md#L139) | Established | session.rs now calls store and randomness on the signing path, in the order the rulings require, and there are tests that fail if it does not. | A, executed |
| [E-92](../../../CLAIMS.md#L143) | Established | The step 3 falsifier could be pointed at the wrong binary, and every test would still have passed. | A, executed |
| [E-93](../../../CLAIMS.md#L144) | Established | Two round-one findings were WRONG, and both are now pinned by tests rather than by a disposition note. | A, executed |
| [E-94](../../../CLAIMS.md#L145) | Established | Round two reviewed the FIXES and found a defect one of them introduced, a test that passed for the wrong reason, and four overclaims. | A, executed |
| [E-98](../../../CLAIMS.md#L149) | Established | The test suite was FLAKY and several "all passing" reports were true but lucky. | A, executed |
| [E-108](../../../CLAIMS.md#L159) | Established | Two of the tests written for round two's own findings were FALSE PASSES, and only the revert spot-check caught them. | A, executed |
| [E-113](../../../CLAIMS.md#L164) | Established | A test written the same hour, for the ruling it was guarding, could not check the thing its name promised. | A, executed |
| [E-132](../../../CLAIMS.md#L183) | Established | THIS ROW OVERSTATED ITS OWN SWEEP AND WAS CORRECTED 2026-08-25 → E-137. | A, executed |
| [E-141](../../../CLAIMS.md#L192) | Established | A GATE REPORTED PASS WHILE ITS OWN HEADLINE GUARANTEE WAS DISABLED FOR ONE FILE — and the fix that disabled it was a fix for something else. | A, executed |
| [E-142](../../../CLAIMS.md#L193) | Established | The same gate had three blind spots, all latent rather than live, and closing them was cheap. | A, executed |
| [E-143](../../../CLAIMS.md#L194) | Established | Three harnesses that SUBMIT TO DEVNET were exempted from the ruled derivation on two successive false reasons, and the second was written to correct… | A, executed |
| [E-162](../../../CLAIMS.md#L222) | Established | Seven rows of the Findings table had no Grade cell, and the register has been reading as if they did. | A, executed |
| [E-164](../../../CLAIMS.md#L224) | Established | A REVERT PASSED, and it is the strongest instance of CLAUDE.md's "revert every fix and watch its test fail" the project has. | A, executed |
| [E-165](../../../CLAIMS.md#L225) | Established | A GATE BUILT THIS SESSION TO CATCH FALSE PASSES FALSE-PASSED, and a control naming 0u8 — a literal, not a symbol — was reported "gated". | A, executed |
| [E-171](../../../CLAIMS.md#L231) | Established | B-19's PREMISE AND B-19's GATE WERE BOTH FALSE, AND THE THING THAT FOUND IT WAS BUILDING THE GATE B-19 SAID IT HAD. | A, executed (E-244) |
| [E-173](../../../CLAIMS.md#L233) | Established | THE TEST AND THE GATE WERE BOTH BLIND TO THE ONLY THING THAT MATTERS — THE CALL SITE — AND BOTH REVIEW-027 EXTERNAL LEGS FOUND IT INDEPENDENTLY. | A, executed (E-244) |
| [E-179](../../../CLAIMS.md#L239) | Established | FOR A Zeroizing WRAPPED AROUND AN EXISTING BINDING, NO COMPILE-TIME FALSIFIER EXISTS — MEASURED, NOT ASSUMED. | A, executed |
| [E-182](../../../CLAIMS.md#L242) | Established | A GATE WRITTEN TO CATCH FALSE PASSES FALSE-PASSED IN TWO WAYS, THE THIRD TIME IN THIS REPOSITORY (E-165, E-168). | A, executed |
| [E-188](../../../CLAIMS.md#L248) | Established | FIVE OF B-23's SEVEN REVERTS COMPILE CLEAN — E-179's RULE RUN FORWARD, AND THE ANSWER WAS MOSTLY *NO FALSIFIER EXISTS*. | A, executed |
| [E-190](../../../CLAIMS.md#L250) | Established | A GATE REFUSED ITS OWN EXTENSION, LOUDLY, AND THAT IS THE FIRST TIME IN THIS REPOSITORY. | A, executed |
| [E-191](../../../CLAIMS.md#L251) | Established | B-23's FALSIFIERS WERE VERIFIED BY BREAKING THEM, AND ONE OF THEM CATCHES LESS THAN ITS NAME SUGGESTS. | A, executed |
| [E-193](../../../CLAIMS.md#L253) | Established | A TEST WRITTEN IN THIS SESSION TO PIN B-23's PARSE SWAP FALSE-PASSED, AND ONLY BREAKING THE CODE FOUND IT — E-164's SHAPE, FOURTH INSTANCE. | A, executed |
| [E-196](../../../CLAIMS.md#L256) | Established | A COMMENT CLAIMED A COMPILE-TIME FALSIFIER THAT DOES NOT EXIST, INSIDE THE FIX FOR A FINDING ABOUT CLAIMING MORE THAN THE CODE DELIVERS. | A, executed |
| [E-197](../../../CLAIMS.md#L257) | Established | THE IgnoredAny SWAP WAS NOT FULLY BEHAVIOUR-PRESERVING AND WAS DOCUMENTED AS THOUGH IT WERE. | A, executed |
| [E-198](../../../CLAIMS.md#L258) | Established | A GATE BUILT TO CATCH FALSE PASSES FALSE-PASSED IN TWO NEW WAYS — FOURTH INSTANCE (E-165, E-168, E-182). | A, executed |
| [E-201](../../../CLAIMS.md#L261) | Established | FOUR FALSE PASSES IN THE FIX ROUND FOR FALSE PASSES, AND ONE OF THEM WAS A TEST WRITTEN THIS SESSION. | A, executed |
| [E-202](../../../CLAIMS.md#L262) | Established | THE ONLY REAL FALSIFIER B-25 HAD FOR ITS OWN HEADLINE CLAIM WAS UNDEFINED BEHAVIOUR, AND ITS DOC COMMENT CONDEMNED ITSELF. | A, measured |
| [E-203](../../../CLAIMS.md#L263) | Established | FOURTH CONSECUTIVE ROUND IN WHICH A GATE BUILT TO CATCH FALSE PASSES FALSE-PASSED, AND THIRD IN WHICH THE REASON IS THAT ITS CONTROLS REPLAY THE… | A, measured |
| [E-207](../../../CLAIMS.md#L267) | Established | THE STEP-8 GATE'S FIRST RUN AGAINST THE REAL TREE CAUGHT PROSE, AND THE FIX IS A POLARITY DISTINCTION RATHER THAN AN EXEMPTION — E-203's LESSON ON A… | A, measured |
| [E-209](../../../CLAIMS.md#L269) | Established | TWO DEFECTS THAT A CLEAN TYPE-CHECK, A CLEAN BUILD AND A PASSING GATE ALL MISSED, AND BOTH WERE FOUND BY LOADING THE PAGE. | A, measured |
| [E-213](../../../CLAIMS.md#L273) | Established | TWO MORE DEFECTS THE GATE COULD NOT SEE, BECAUSE IT CHECKS REACHABILITY AND THESE WERE ABOUT EXPOSURE AND LIFETIME. | A, measured |
| [E-214](../../../CLAIMS.md#L274) | Established | TWO REGRESSION TESTS COULD NOT REGRESS, AND BOTH WERE WRITTEN IN THE ROUND THAT ADDED THEM. | A, measured |
| [E-215](../../../CLAIMS.md#L275) | Established | ROUND TWO OF THE CODEX REVIEW, AND THE HEADLINE IS THAT ROUND ONE'S FIX CREATED THE NEW P1 AND ROUND ONE'S NEW TEST FALSE-PASSED. | A, measured |
| [E-217](../../../CLAIMS.md#L277) | Established | A FILING PROTOCOL AND ITS GATE, RULED 2026-09-01 — AND THE GATE'S FIRST TWO BUGS WERE FOUND BY ITS OWN POSITIVE CONTROL. | A, measured |
| [E-220](../../../CLAIMS.md#L280) | Established | STEP 8'S FIRST INDEPENDENT REVIEW — nine findings, no P1, and TWO WERE FUNCTIONAL BUGS THE WHOLE TEST SUITE MISSED. | A, measured |
| [E-225](../../../CLAIMS.md#L285) | Established | THE DISCLOSURE-PHRASE GATE IS BUILT, AND IT CAUGHT A LIVE ASSERTION ON ITS FIRST RUN — IN THE DOCUMENT DESCRIBING THE DEFECT. | A, executed |
| [E-226](../../../CLAIMS.md#L286) | Established | THE STEP-8 GATE CARRIED TWO SOCKET DETECTORS THAT DISAGREED, AND THE NARROWER ONE WAS WIRED TO THE WHOLE-TIER PROPERTY — SIXTH INSTANCE OF A GATE… | A, measured |
| [E-227](../../../CLAIMS.md#L287) | Established | A FALSIFIER CONDITION NAMED IN THE ARCHITECTURE DOCUMENT HAD NO FALSIFIER. | A, measured |
| [E-228](../../../CLAIMS.md#L288) | Established | THE WEB TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY IN TWO PLACES, EACH WITH A COMMENT SAYING WHY — AND ADR-0003's FALSIFIER LIST HAD… | A, measured |
| [E-232](../../../CLAIMS.md#L292) | Established | THE DISCLOSURE-PHRASE GATE FALSE-PASSED ON THE EXACT SENTENCE IT HAD JUST BEEN EXTENDED TO CATCH, AND THE FIX PASS MANUFACTURED ITS OWN SUPPRESSION. | A, measured |
| [E-234](../../../CLAIMS.md#L294) | Established | THE SOCKET FIX WAS WRITTEN AGAINST THE FINDING'S LIST RATHER THAN THE PROPERTY, THE DISCLOSURE GATE COULD NOT SEE THE RENDERED UI, AND THREE… | A, measured |
| [E-235](../../../CLAIMS.md#L295) | Established | ROUND TWO'S HEADLINE: THE TWO GATES ROUND ONE BUILT OR EXTENDED BOTH FALSE-PASSED — THE SEVENTH AND EIGHTH INSTANCES, WRITTEN IN THE ROUND THAT WAS… | A, measured |
| [E-237](../../../CLAIMS.md#L297) | Established | THE NINTH FALSE-PASSING GATE, AND IT IS E-235's DEFECT REPRODUCED IN THE SIBLING FUNCTION TWENTY LINES AWAY, IN THE SAME COMMIT. | A, measured |
| [E-238](../../../CLAIMS.md#L298) | Established | A NARROW CODEX SPOT-CHECK ON THREE DETECTORS RETURNED *broken* AND FOUND SIX MORE HOLES, INCLUDING ONE WHERE THE CHECK READ THE VALUE THAT DOES NOT… | A, measured |
| [E-243](../../../CLAIMS.md#L303) | Established | CLAIMS.md HAD 24 BLANK LINES INSIDE ITS TABLES AND RENDERED AS ROUGHLY TWENTY SEPARATE FRAGMENTS — check-tables REPORTED PASS THROUGHOUT, FOR WEEKS. | A, measured |
| [E-244](../../../CLAIMS.md#L304) | Established | E-243'S FIX LEFT 96 ROWS STILL RENDERING OUTSIDE THE TABLES, AND check-tables REPORTED PASS — A FIX APPLIED TO THE INSTANCE THE FINDING NAMED RATHER… | A, measured |
| [B-24](../../../CLAIMS.md#L316) | Pending | REVIEW-031's fixes — the seed residue B-23 left, and the gate that could not see it. | BUILT 2026-08-28. The… |
| [B-26](../../../CLAIMS.md#L318) | Pending | REVIEW-033's fixes — the falsifier that was UB, and the gate's fourth round of false passes. | BUILT 2026-08-28. The… |
| [F-23](../../../CLAIMS.md#L369) | Findings | A wrong ledger read is a CONFIDENTIALITY break, not a rejected transaction — and the signer cannot control which. | A, executed |

==============================================================

# DOCUMENT 3 — docs/claims/by-topic/counts-and-numbers.md

# Counts and numbers

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

The project's most persistent failure mode: a number restated instead of derived.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

**11 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [P-8](../../../CLAIMS.md#L29) | Prohibitions | Any benchmark number without hardware, parameter set and methodology | Includes re-quoting… |
| [E-164](../../../CLAIMS.md#L224) | Established | A REVERT PASSED, and it is the strongest instance of CLAUDE.md's "revert every fix and watch its test fail" the project has. | A, executed |
| [E-189](../../../CLAIMS.md#L249) | Established | THE PART WRITTEN TO AVOID A MISCOUNT SHIPPED A MISCOUNT IN ITS FIRST DRAFT — CAUGHT BEFORE COMMIT, WHICH IS THE ONLY NEW THING ABOUT IT. | A, executed |
| [E-193](../../../CLAIMS.md#L253) | Established | A TEST WRITTEN IN THIS SESSION TO PIN B-23's PARSE SWAP FALSE-PASSED, AND ONLY BREAKING THE CODE FOUND IT — E-164's SHAPE, FOURTH INSTANCE. | A, executed |
| [E-198](../../../CLAIMS.md#L258) | Established | A GATE BUILT TO CATCH FALSE PASSES FALSE-PASSED IN TWO NEW WAYS — FOURTH INSTANCE (E-165, E-168, E-182). | A, executed |
| [E-199](../../../CLAIMS.md#L259) | Established | THE HEADER FIXED FOR MISCOUNTING MISCOUNTED AGAIN — NINTH INSTANCE, AND ONLY ARITHMETIC ENDED IT. | A, executed |
| [E-226](../../../CLAIMS.md#L286) | Established | THE STEP-8 GATE CARRIED TWO SOCKET DETECTORS THAT DISAGREED, AND THE NARROWER ONE WAS WIRED TO THE WHOLE-TIER PROPERTY — SIXTH INSTANCE OF A GATE… | A, measured |
| [E-229](../../../CLAIMS.md#L289) | Established | A RECORDED P-12 SEARCH NO LONGER REPRODUCED: FIVE FILES, NOT THREE — FIFTEENTH INSTANCE OF A RESTATED NUMBER GOING STALE, AND IT WAS INSIDE THE… | A, measured |
| [E-235](../../../CLAIMS.md#L295) | Established | ROUND TWO'S HEADLINE: THE TWO GATES ROUND ONE BUILT OR EXTENDED BOTH FALSE-PASSED — THE SEVENTH AND EIGHTH INSTANCES, WRITTEN IN THE ROUND THAT WAS… | A, measured |
| [E-236](../../../CLAIMS.md#L296) | Established | A COUNT CORRECTED IN ROUND ONE WAS ALREADY FALSE IN THE COMMIT THAT CORRECTED IT — SIXTEENTH INSTANCE, INSIDE THE FIX FOR THE FIFTEENTH. | A, measured |
| [E-244](../../../CLAIMS.md#L304) | Established | E-243'S FIX LEFT 96 ROWS STILL RENDERING OUTSIDE THE TABLES, AND check-tables REPORTED PASS — A FIX APPLIED TO THE INSTANCE THE FINDING NAMED RATHER… | A, measured |

==============================================================

# DOCUMENT 4 — docs/CLAIMS-INDEX.md (the other navigation aid, HEAD AND A MIDDLE SLICE)

# CLAIMS index

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-index.ts`;
`make check-claims-index` fails if this file drifts from `CLAIMS.md`.

**Why it exists:** `CLAIMS.md` is a register of hundreds of rows averaging over a
thousand characters each. It is not readable end to end and was never meant to be —
this is how you find a row. **Line numbers link into the file and are regenerated,**
so they do not rot the way a hand-written index would (`CLAIMS.md` E-199, E-236).

⚠ **A summary is not a claim.** Each line below is a truncated, markup-stripped
excerpt for finding things. **The row is the authority** — never cite the index.

**318 rows** across **5 sections**, counted where they are parsed.

## Standing prohibitions — never claim — 12 rows

| id | summary | grade |
|---|---|---|
| [P-1](../CLAIMS.md#L22) | That this work makes XRPL quantum-safe or quantum-resistant | It does not |
| [P-2](../CLAIMS.md#L23) | That an application-layer PQ scheme protects funds at the ledger level | An adversary who… |
| [P-3](../CLAIMS.md#L24) | That any amendment is live or enabled, without a dated feature RPC check | Amendment state is a… |
| [P-4](../CLAIMS.md#L25) | That a Confidential MPT demo hides identities | It hides amounts and… |
| [P-5](../CLAIMS.md#L26) | That anything here is trustless, non-custodial, decentralised, audited, production-ready or secure | None of it is;… |
| [P-6](../CLAIMS.md#L27) | That anything is compliant with regulation in a named jurisdiction | Not a compliance… |
| [P-7](../CLAIMS.md#L28) | That analysis of published work is original research | Cite Cenk, Malhotra,… |
| [P-8](../CLAIMS.md#L29) | Any benchmark number without hardware, parameter set and methodology | Includes re-quoting… |
| [P-9](../CLAIMS.md#L30) | That holders are private from the issuer | The issuer's decryptio… |
| [P-10](../CLAIMS.md#L31) | That XLS-96 supports key rotation or key recovery | It supports neither,… |
| [P-11](../CLAIMS.md#L32) | That confidential transfers hide *who* transacts, or *when*, or *how often* | Only amounts are… |
| [P-12](../CLAIMS.md#L33) | Any claim that a source does NOT say something — *nothing documents it*, *no such field*, *not exported*, *nobody has… | It is an assertion… |

## Established — 246 rows

| id | summary | grade |
|---|---|---|
| [E-1](../CLAIMS.md#L41) | XLS-0096 authors: Cenk, Malhotra, Akinyele, Chen, Xie, Qian; status Draft, created 2026-01-15 | A |
| [E-2](../CLAIMS.md#L42) | Transaction types 85 Convert, 86 MergeInbox, 87 ConvertBack, 88 Send, 89 Clawback | A |
| [E-3](../CLAIMS.md#L43) | The Send ZKProof is a fixed-length bundle of a compact sigma proof plus an aggregated Bulletproof, enforced at preflight | A |
| [E-3a](../CLAIMS.md#L44) | Those components are 192 B and 754 B, totalling 946 B | A |

                    [... index continues ...]

| [E-170](../CLAIMS.md#L230) | A REVIEW LEG GRADED A HIGH DEFECT THAT DOES NOT EXIST, AND ITS EXCERPT OF THE FILE IS WHY — with the complete file in… | A, source (E-244) |
| [E-171](../CLAIMS.md#L231) | B-19's PREMISE AND B-19's GATE WERE BOTH FALSE, AND THE THING THAT FOUND IT WAS BUILDING THE GATE B-19 SAID IT HAD.… | A, executed (E-244) |
| [E-172](../CLAIMS.md#L232) | THE FALSE B-19 PREMISE SURVIVED THE COMMIT THAT CORRECTED IT — AND TWO OF THE SURVIVORS WERE WRITTEN BY THAT COMMIT.… | A, executed (E-244) |
| [E-173](../CLAIMS.md#L233) | THE TEST AND THE GATE WERE BOTH BLIND TO THE ONLY THING THAT MATTERS — THE CALL SITE — AND BOTH REVIEW-027 EXTERNAL… | A, executed (E-244) |
| [E-174](../CLAIMS.md#L234) | A REVIEW LEG RULED THE SESSION'S CENTRAL FINDING FALSE, FROM A CORRECT-SOUNDING READING OF CARGO'S RULES, AND WAS… | A, executed (E-244) |
| [E-175](../CLAIMS.md#L235) | ROUND TWO FOUND THAT ROUND ONE'S FIX FOR E-172 REPRODUCED E-172. A COMPLETENESS CLAIM WAS FALSE, AND ONE SURVIVING… | A, executed (E-244) |
| [E-176](../CLAIMS.md#L236) | B-21's default signing path is EXECUTED on Devnet, and the receipt was written before the prose. REVIEW-027 finding 8… | A, executed (E-244) |
| [E-177](../CLAIMS.md#L237) | A DECISION REQUEST ARGUING THAT HAND-ENUMERATED SITE LISTS ARE UNFALSIFIABLE CONTAINED FOUR ENUMERATION ERRORS OF ITS… | A, executed |
| [E-178](../CLAIMS.md#L238) | WRAPPING A Copy TYPE IN A ZEROIZING WRAPPER DOES NOT WIPE THE SOURCE, AND ONE LINE OF THIS PROJECT READ AS THOUGH IT… | A, executed |
| [E-179](../CLAIMS.md#L239) | FOR A Zeroizing WRAPPED AROUND AN EXISTING BINDING, NO COMPILE-TIME FALSIFIER EXISTS — MEASURED, NOT ASSUMED. Each B-22… | A, executed |

==============================================================

# DOCUMENT 5 — the register's own header, and two sample rows in FULL
#   (so you can see what a row actually looks like)

# CLAIMS register

⚠ **`tapFailHard` in this document is THIS PROJECT'S SHORTHAND and appears zero times in rippled** — the real names are `fail_hard` (the RPC parameter) and `TapFailHard` (the internal apply flag). See [`docs/VOCABULARY.md`](docs/VOCABULARY.md). The code always used the real one.

**The register.** Every capability claim in a README, demo, post or conversation gets an entry here with the test result or primary citation that supports it. **Before publishing anything, diff the new claims against this register.**

**Human-gated checklist, not automation.** CI cannot judge whether prose overclaims. Do not add a CI job and call it solved.

| | |
|---|---|
| **Navigate** | [`docs/CLAIMS-INDEX.md`](docs/CLAIMS-INDEX.md) — one line per row, generated. ⚠ Do not hand-edit it; `make check-claims-index` fails if it drifts. |
| **Statuses** | `SUPPORTED` evidence attached · `PENDING` asserted, evidence not attached, **may not be published** · `BLOCKED` never claim · `RETRACTED` was claimed, found wrong — **keep the row** |
| **Sections** | [Standing prohibitions](#standing-prohibitions--never-claim) · [Established](#established) · [Pending](#pending--asserted-not-yet-supportable) · [Findings](#findings--verified-file-upstream-before-publishing) · [Retracted](#retracted) |
| **History** | [Revision history](#revision-history) — moved to the end 2026-09-04. ⚠ It was **5,358 characters of unbroken prose above the first heading**, so nothing in this file was visible without scrolling past it. |

---

--- one full row, E-202 ---
| E-202 | ⚠⚠ **THE ONLY REAL FALSIFIER B-25 HAD FOR ITS OWN HEADLINE CLAIM WAS UNDEFINED BEHAVIOUR, AND ITS DOC COMMENT CONDEMNED ITSELF.** `dropping_a_scalar_overwrites_its_bytes` took a `*const u8` from `held.as_bytes().as_ptr()` — a **shared** reference — then called `ManuallyDrop::drop(&mut held)`, which retags **Unique** over the same bytes, then read through the stale pointer. ⚠ **`ManuallyDrop` fixed the use-after-free the previous version had and introduced an aliasing violation instead**, while the docstring said *"a test that is undefined behaviour proves nothing"* about the version it replaced. ⚠ **It carried the whole warrant**: the `ZeroizeOnDrop` bound beside it is a marker trait, and B-25 had itself measured that it still passes with `Drop::drop` emptied. Found by `REVIEW-033a` AND `REVIEW-033b` independently; **neither could run Miri** | **MEASURED AND FIXED 2026-08-28, B-26.** Stacked Borrows: *"attempting a read access using `<525589>` … but that tag does not exist in the borrow stack"*; Tree Borrows: *"read access through `<518924>` … is forbidden"* — Miri naming the whole chain, `SharedReadOnly` retag at the `as_ptr()`, invalidated by a `Unique` retag at the `drop`. ⚠⚠ **THE REMEDY WAS MEASURED, NOT REASONED, AND THAT IS WHY ONE OF THE THREE SOUND CANDIDATES WAS REJECTED:** calling `Zeroize::zeroize` and reading back is Miri-clean, reads like the same test, and **PASSES with the destructor emptied** — it exercises `Zeroize`, and the property at issue is `Drop`. **A sound replacement is not automatically a falsifier.** Two replacements are kept and **both FAIL when `Drop::drop` is emptied**: an ordinary `&self` read after the destructor, and a raw-pointer form running `drop_in_place` **through the same pointer the reads use**. ⚠ **The `unsafe` that made the old test UB was never load-bearing** | A, measured |

--- one full row, E-176 ---
| E-176 | **B-21's default signing path is EXECUTED on Devnet, and the receipt was written before the prose.** `REVIEW-027` finding 8 and `REVIEW-028c` §3 item 1: B-21 changed `fresh_aux`'s return type on the path `sign_message` uses, and `REVIEW-024` §6 item 7 makes a default-path Devnet transaction an obligation because **no test substitutes for it**. Re-executed at `af1cc3e41acf13a4a0b09eeec0fa029dbee406aa` — **HEAD, with `signer/` clean** — giving validated transaction **`EF2018FA13AF7DCECD1D7562DE0BDF9A870688FAD6E4E564323B2AA1386FD336`** from `rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbY`, `SigningPubKey` `ED21E08C1B…` decoded **out of the submitted blob**. Over the same 297-byte signing serialisation the blob's `TxnSignature` **differs** from what `ripple-keypairs` deterministically produces, and **both verify under the same key** — so the difference is `r` and nothing else. The validated ledger carries the hedged bytes. ⚠ **`workingTreeDirty` is `true` and that is recorded rather than explained away**: the dirt was `tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts` — the harness — while `git status --short signer/` was **empty**, so the binary is exactly this commit's. **The subject was clean; the instrument was not.** ⚠ **This does NOT re-prove B-16.** It proves the construction still reaches a validated ledger *after* B-21, which is the only question `REVIEW-027` finding 8 asked | **`docs/runs/b21-zeroized-default-path-devnet-2026-08-27.json`**, observed 2026-08-27T10:24:12.632Z. ⚠ **A SECOND receipt file, not an overwrite, and the script was changed to make that possible — E-169's actual fix.** The B-16 receipt at the old name is cited by `CLAIMS.md`, `signer/README.md` and `UPSTREAM-FEEDBACK.md`; the script's path was a fixed string, so this run would have **destroyed the evidence those three rest on**. It now takes `WCONF_RECEIPT_NAME` and **refuses to overwrite a receipt recording a different commit**. ⚠ **The refusal happens BEFORE anything is submitted, and that placement is the point**: its first form sat after the submit, which made it untestable without paying for a Devnet transaction — *a gate described is not a gate run* (E-165, E-171), written into the very fix for E-169. ⚠ **VERIFIED BY BREAKING IT IN BOTH DIRECTIONS, at no network cost**: aimed at the B-16 receipt it **died** naming both commits; aimed at a scratch receipt recording the current commit it **printed and continued**. A guard that only ever refuses is indistinguishable from one that always refuses. ⚠ **E-169 was *four documents citing a hash no receipt recorded*; the mechanism was a receipt being replaced by a re-run. That mechanism is now blocked rather than warned about.** ⚠ Every value in this row was read out of the receipt JSON by script, not transcribed from the run's console output | A, executed (E-244) |
