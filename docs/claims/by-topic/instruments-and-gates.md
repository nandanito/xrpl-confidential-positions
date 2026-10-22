# Instruments and gates

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

Gates, tests and detectors — including the many that reported PASS while the thing they checked was broken.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**97 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [E-17](../../../CLAIMS.md#L58) | Established | When set, sfDomainID on the MPTokenIssuance gates confidential transfers, checked by requireAuth on both sender and destination | A |
| [E-20](../../../CLAIMS.md#L61) | Established | The issuer can unilaterally clear sfDomainID, removing the domain gate without holder consent | A |
| [E-45](../../../CLAIMS.md#L96) | Established | The end-to-end client path works. A ConfidentialMPTConvert was constructed, proved, signed and accepted by standard Devnet from outside rippled's… | A |
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
| [E-247](../../../CLAIMS.md#L307) | Established | REVIEW-041 — ROUND TWO, TWO EXTERNAL LEGS, AND THE HEADLINE IS A FALSE PREMISE THE GATE WAS BUILT ON. IN A GFM TABLE A PIPE IS A CELL DELIMITER EVEN… | A, measured |
| [E-251](../../../CLAIMS.md#L311) | Established | tools/check-emphasis.ts is built, and it caught four violations in the fifteen rows the session wrote under the discipline while building the gate… | A, measured |
| [E-253](../../../CLAIMS.md#L313) | Established | A probe that verified the gate's cutoff passed for the wrong reason, and the exit code is what showed it. | A, measured |
| [E-257](../../../CLAIMS.md#L317) | Established | make check-zeroize-bounds mutates tracked signer sources for the ~2 minutes it runs, and a git status taken during that window reported M… | A, source |
| [E-258](../../../CLAIMS.md#L318) | Established | REVIEW-043 found five defects in the emphasis gate and its harness, and the sharpest is that the harness could not tell a crash from a verdict. | A, measured |
| [E-259](../../../CLAIMS.md#L319) | Established | REVIEW-044, round two, three legs with differed packets: the fixes carried a live false-pass, one defect a fix INTRODUCED, and a sentence that was… | A, measured |
| [E-260](../../../CLAIMS.md#L320) | Established | REVIEW-044's own fix for false-passing probes false-passed, and testing the fix is what found it. | A, measured |
| [E-261](../../../CLAIMS.md#L321) | Established | REVIEW-045, round three: the hand-written block splitter FALSE-PASSED six real over-800-character paragraphs, and the fix is a design change rather… | A, measured |
| [E-263](../../../CLAIMS.md#L323) | Established | Giving rule 6 to cmark-gfm made two of the harness's own probes stale, and the harness is the only thing that said so. | A, measured |
| [E-264](../../../CLAIMS.md#L324) | Established | The emphasis-gate rotation STOPS at three rounds, which departs from CLAUDE.md's rule, and the owner ruled it on 2026-09-09. | A, reasoned |
| [E-268](../../../CLAIMS.md#L328) | Established | A generated file whose input includes its own commit has NO FIXPOINT — FALSE AS STATED, and corrected the next day by an external review (E-271).… | A, measured |
| [E-269](../../../CLAIMS.md#L329) | Established | Two concurrent runs of check-zeroize-bounds corrupt source, and the second is now refused. | A, measured |
| [E-270](../../../CLAIMS.md#L330) | Established | check-zeroize-bounds takes ~2 minutes or ~28 depending only on what ran before it, and nothing said so. | A, measured |
| [E-271](../../../CLAIMS.md#L331) | Established | An external review of this session's own work upheld five findings, and the sharpest refuted a row written the day before. | A, measured |
| [E-274](../../../CLAIMS.md#L334) | Established | The two-commit workflow this gate prescribes made its own generator NON-IDEMPOTENT, and --check could not see the loop. | A, measured |
| [E-275](../../../CLAIMS.md#L335) | Established | Every check in the revision gate read committed git objects, so deleting a row before committing reported PASS. | A, measured |
| [E-276](../../../CLAIMS.md#L336) | Established | A Set at the parse layer hid a whole class of defect, and every instrument in the revision gate was built on that one function. | A, measured |
| [E-279](../../../CLAIMS.md#L339) | Established | Two valid git settings crashed the revision tool, and the fix went to the producer rather than the four call sites. | A, measured |
| [E-280](../../../CLAIMS.md#L340) | Established | GIT_DIR BEATS cwd, so the revision tool's synthetic probe wrote its configuration into a FOREIGN repository — measured, not theorised. | A, measured |
| [E-282](../../../CLAIMS.md#L342) | Established | The DENYLIST written to fix GIT_DIR missed GIT_CONFIG one round later, so it is an ALLOWLIST now. | A, measured |
| [E-284](../../../CLAIMS.md#L344) | Established | SIGHUP STRANDED A REVERTED SOURCE FILE, and the gate's own output promised the opposite. | A, measured |
| [E-285](../../../CLAIMS.md#L345) | Established | The mutation lock had no falsifier, and building one found a hole in the lock and a flaw in the harness. | A, measured |
| [E-286](../../../CLAIMS.md#L346) | Established | The falsifier built last round could not see the regression it exists for. | A, measured |
| [E-287](../../../CLAIMS.md#L347) | Established | check-zeroize-bounds leaked a temporary directory per run, and 110 of them had accumulated before anyone counted. | A, measured |
| [E-317](../../../CLAIMS.md#L377) | Established | The phase 1 secret sweep is a gate, make check-no-secrets, and its first run found no stored secret, no credential and no non-public seed in the tree… | A, executed |
| [E-318](../../../CLAIMS.md#L378) | Established | REVIEW-056 round one found 13 defects in make check-no-secrets, and the gate's own controls had caught none of them. | A, executed |
| [E-324](../../../CLAIMS.md#L384) | Established | Step 1's inventory found six third-party projects reproduced in the tracked tree, and NOTICE is written from it rather than from memory. | A, measured |
| [E-333](../../../CLAIMS.md#L393) | Established | vite's only root licence file aggregates the licences of everything it bundles and carries 35 personal email addresses, so a verbatim copy cannot… | A, measured |
| [E-334](../../../CLAIMS.md#L394) | Established | Architecture §6 step 9 is built and gated but not deployed, and the browser check caught a policy the gate had passed. | A, measured |
| [E-336](../../../CLAIMS.md#L396) | Established | Architecture §6 step 9 is deployed, and when compared on 2026-10-20 what Vercel served was byte for byte what the gate passed. | A, measured |
| [E-339](../../../CLAIMS.md#L399) | Established | The demo's shorter text is live: the owner redeployed from the public commit ccf76e7, and when compared on 2026-10-20 what Vercel served was byte for… | A, measured |
| [E-342](../../../CLAIMS.md#L402) | Established | The first review of step 9's build, REVIEW-059 round one, upheld 24 findings, and two would have let the release procedure publish what step 9… | A, measured |
| [E-343](../../../CLAIMS.md#L403) | Established | REVIEW-059 round one's fixes are built, and each new check was broken before it was believed; they are not yet reviewed, rebuilt from a public commit… | A, measured |
| [E-345](../../../CLAIMS.md#L405) | Established | REVIEW-059 round two found that five of round one's fixes did not discharge their findings, so its stopping condition fired and a third round is the… | A, measured |
| [E-346](../../../CLAIMS.md#L406) | Established | REVIEW-059 round two's fixes are built: each now runs its finding's own example and the next case in that example's class, and each check was broken… | A, measured |
| [E-347](../../../CLAIMS.md#L407) | Established | REVIEW-059 round three, run as the owner ruled on 2026-10-21, found three of round two's fixes still partial and two new browser gaps, and the… | A, measured |
| [E-348](../../../CLAIMS.md#L408) | Established | REVIEW-059 round three's fixes are built, each check broken before it was believed, and the rotation is closed, so no outside reader has seen them. | A, measured |
| [E-349](../../../CLAIMS.md#L409) | Established | The demo serves the reviewed build: PR #18 carried E-339 to E-348 to the public repository, the owner redeployed from 62fcac3, and when compared on… | A, measured |
| [E-350](../../../CLAIMS.md#L410) | Established | The hosted demo has an explainer, /how-it-works, and an overview that orients rather than lists; both were read twice before any deploy, and this row… | A for the build,… |
| [E-351](../../../CLAIMS.md#L411) | Established | The hosted demo has diagrams on all seven pages, read twice before any deploy, and this row records no deployment. | A for the build,… |
| [B-24](../../../CLAIMS.md#L422) | Pending | REVIEW-031's fixes — the seed residue B-23 left, and the gate that could not see it. | BUILT 2026-08-28. The… |
| [B-26](../../../CLAIMS.md#L424) | Pending | REVIEW-033's fixes — the falsifier that was UB, and the gate's fourth round of false passes. | BUILT 2026-08-28. The… |
| [F-23](../../../CLAIMS.md#L480) | Findings | A wrong ledger read is a CONFIDENTIALITY break, not a rejected transaction — and the signer cannot control which. | A, executed |
