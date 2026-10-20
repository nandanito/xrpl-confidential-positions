# Claims, prose and drift

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

Sentences that outran their evidence: stale notes, false disclosures, retracted claims and the documents that carried them.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**89 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [P-7](../../../CLAIMS.md#L28) | Prohibitions | That analysis of published work is original research | Cite Cenk, Malhotra,… |
| [E-9](../../../CLAIMS.md#L50) | Established | Holder, issuer and auditor encryption keys cannot be rotated once registered | A |
| [E-59](../../../CLAIMS.md#L109) | Established | The two harnesses CLAUDE.md requires now exist and both self-verify. | A |
| [E-62](../../../CLAIMS.md#L113) | Established | The nonce construction reproduces from its own prose, and draws no entropy through the tree's only entropy route. | A, executed, scoped… |
| [E-68](../../../CLAIMS.md#L119) | Established | The keygen construction reproduces from its own prose, by two implementations, and its test is not a false pass. | A on reproduction,… |
| [E-72](../../../CLAIMS.md#L123) | Established | ADR-0001's build-cost comparison was INVERTED, not merely stale, and the decision survived the correction. | A on the cost facts;… |
| [E-79](../../../CLAIMS.md#L130) | Established | Four claims in the signer's own documentation were false, and all four were written by the session that wrote the code. | A |
| [E-91](../../../CLAIMS.md#L142) | Established | ParsedTransaction::parse ignored fields it did not recognise, while its own doc comment claimed it refused them — and one such field would have put a… | A, executed |
| [E-102](../../../CLAIMS.md#L153) | Established | A stale ledger read is now *detected*, not merely bounded — the signer re-reads after the human confirms and refuses if anything the transaction… | A, executed |
| [E-110](../../../CLAIMS.md#L161) | Established | B-15 ruled: one ledger endpoint stands for this artifact, as a NAMED RISK ACCEPTANCE, and the disclosure is a condition of the ruling rather than a… | A, executed |
| [E-111](../../../CLAIMS.md#L162) | Established | ADR-0002's second round found that its Decision sentence asserted what the ADR itself reopened two sections later | A, executed |
| [E-114](../../../CLAIMS.md#L165) | Established | ADR-0002's open question may be premised on a facility TASK ZERO §9 does not describe, and two review rounds could not see it because the packet… | A, source |
| [E-119](../../../CLAIMS.md#L170) | Established | ADR-0001 §(e)'s only benefit is now EXECUTED rather than described: the seed alone reproduced the key the ledger holds. | A, executed |
| [E-125](../../../CLAIMS.md#L176) | Established | The confirmation told a holder, at the approval step, that a registered key can "never be recovered" — false for a derived key, and false about the… | A, reasoned |
| [E-126](../../../CLAIMS.md#L177) | Established | A false sentence survived a full round of review because it lived in the one disclosure surface that was not a constant with an asserted wording. | A, reasoned |
| [E-127](../../../CLAIMS.md#L178) | Established | A sentence written to justify keeping a test mis-described the very function a finding upheld an hour earlier was about. | A, reasoned |
| [E-128](../../../CLAIMS.md#L179) | Established | claims-check caught four things a session that had just written the register did not, and one was the recurring failure in the author's own README. | A, reasoned |
| [E-132](../../../CLAIMS.md#L183) | Established | THIS ROW OVERSTATED ITS OWN SWEEP AND WAS CORRECTED 2026-08-25 → E-137. | A, executed |
| [E-139](../../../CLAIMS.md#L190) | Established | A fix contradicted its own file four lines away, and the contradiction was in the HEADER the fix did not touch. | A, executed |
| [E-144](../../../CLAIMS.md#L195) | Established | THREE FALSE SENTENCES, ALL WRITTEN TO EXPLAIN ROUND-ONE FIXES — which is exactly and only what a second round is for. | A, executed |
| [E-151](../../../CLAIMS.md#L211) | Established | B-15's step-7 answer was AMENDED by the project owner, and the amendment is recorded in code rather than only in prose. | A, reasoned |
| [E-152](../../../CLAIMS.md#L212) | Established | REVIEW-023 reviewed the accepted-risk hatch, the post-execution fixes and the executed claims — seven findings, all upheld, none stale — and FOUR of… | A, executed — the… |
| [E-154](../../../CLAIMS.md#L214) | Established | CLAUDE.md carried two stale claims in its Stack section, and one of them described a design REVIEW-003b had KILLED. | A, read at source |
| [E-159](../../../CLAIMS.md#L219) | Established | An onboarding disclosure asserted a key source the holder had not chosen yet — and the obligation to test it had been discharged eight days before it… | A, executed |
| [E-162](../../../CLAIMS.md#L222) | Established | Seven rows of the Findings table had no Grade cell, and the register has been reading as if they did. | A, executed |
| [E-164](../../../CLAIMS.md#L224) | Established | A REVERT PASSED, and it is the strongest instance of CLAUDE.md's "revert every fix and watch its test fail" the project has. | A, executed |
| [E-168](../../../CLAIMS.md#L228) | Established | Round two found that round one's adjudication OVERSTATED ITS OWN FIXES, in the round whose entire lesson is that fixes and descriptions fail… | A, executed |
| [E-172](../../../CLAIMS.md#L232) | Established | THE FALSE B-19 PREMISE SURVIVED THE COMMIT THAT CORRECTED IT — AND TWO OF THE SURVIVORS WERE WRITTEN BY THAT COMMIT. | A, measured (E-244,… |
| [E-175](../../../CLAIMS.md#L235) | Established | ROUND TWO FOUND THAT ROUND ONE'S FIX FOR E-172 REPRODUCED E-172. A COMPLETENESS CLAIM WAS FALSE, AND ONE SURVIVING SENTENCE SAT DIRECTLY BELOW THE… | A, measured and… |
| [E-176](../../../CLAIMS.md#L236) | Established | B-21's default signing path is EXECUTED on Devnet, and the receipt was written before the prose. | A, executed (E-244) |
| [E-181](../../../CLAIMS.md#L241) | Established | ROUND TWO FOUND THAT THE B-22 BUILD DID NOT IMPLEMENT ITS OWN RULING, AND THAT PROSE WAS COVERING THE GAP. | A, executed |
| [E-185](../../../CLAIMS.md#L245) | Established | E-168 FOR THE THIRD TIME, AND THIS TIME THE RULING'S OWN SITE LIST IS WHAT WAS INCOMPLETE. | A, executed |
| [E-192](../../../CLAIMS.md#L252) | Established | A COMMENT IN THE B-23 BUILD CREDITED A BINDING WITH A DEFENCE THE BINDING DOES NOT PROVIDE — E-181's SHAPE, POINTING THE OTHER WAY. | A, executed |
| [E-196](../../../CLAIMS.md#L256) | Established | A COMMENT CLAIMED A COMPILE-TIME FALSIFIER THAT DOES NOT EXIST, INSIDE THE FIX FOR A FINDING ABOUT CLAIMING MORE THAN THE CODE DELIVERS. | A, executed |
| [E-200](../../../CLAIMS.md#L260) | Established | A COMMENT NAMED THE WRONG CRATE, AND A SECRET WENT UNWIPED BECAUSE OF IT. | A, executed |
| [E-202](../../../CLAIMS.md#L262) | Established | THE ONLY REAL FALSIFIER B-25 HAD FOR ITS OWN HEADLINE CLAIM WAS UNDEFINED BEHAVIOUR, AND ITS DOC COMMENT CONDEMNED ITSELF. | A, measured |
| [E-204](../../../CLAIMS.md#L264) | Established | CLAUDE.md TOLD EVERY NEW SESSION THAT ARCHITECTURE §6 STEP 8 EXISTED, AND IT NEVER DID. | A, measured |
| [E-205](../../../CLAIMS.md#L265) | Established | A DOC COMMENT CALLED Request::Status A *"PUBLIC LEDGER READ"* AND IT READS NO LEDGER. | A, measured |
| [E-207](../../../CLAIMS.md#L267) | Established | THE STEP-8 GATE'S FIRST RUN AGAINST THE REAL TREE CAUGHT PROSE, AND THE FIX IS A POLARITY DISTINCTION RATHER THAN AN EXEMPTION — E-203's LESSON ON A… | A, measured |
| [E-210](../../../CLAIMS.md#L270) | Established | The issuer view DECRYPTS, and the reason it did not was a comment that was wrong about its own repository. | A, measured |
| [E-211](../../../CLAIMS.md#L271) | Established | A FALSE DISCLOSURE SENTENCE SHIPPED ON THE OBSERVER PAGE, AND IT IS F-24's SHAPE A THIRD TIME. | A, measured |
| [E-222](../../../CLAIMS.md#L282) | Established | THE README WAS REWRITTEN AND A FRESH-READER TEST CAUGHT A FALSE DISCLOSURE SENTENCE THE AUTHOR COULD NOT SEE — E-211's SHAPE, A FOURTH TIME. | A, executed |
| [E-223](../../../CLAIMS.md#L283) | Established | ROUND THREE ON THE README RETURNED TWO P1s THAT FIVE EARLIER LEGS HAD MISSED, AND THE BINDING CONSTRAINT WAS *ACCESS*, NOT ADVERSARIAL DEPTH. | A, executed |
| [E-224](../../../CLAIMS.md#L284) | Established | AN ADVERSARIAL LEG POINTED AT THE FIXES FOUND 14 DEFECTS, AND THE P1 IS A FALSE DISCLOSURE THE SIGNER SHOWED HOLDERS AT ONBOARDING. | A, executed |
| [E-225](../../../CLAIMS.md#L285) | Established | THE DISCLOSURE-PHRASE GATE IS BUILT, AND IT CAUGHT A LIVE ASSERTION ON ITS FIRST RUN — IN THE DOCUMENT DESCRIBING THE DEFECT. | A, executed |
| [E-228](../../../CLAIMS.md#L288) | Established | THE WEB TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY IN TWO PLACES, EACH WITH A COMMENT SAYING WHY — AND ADR-0003's FALSIFIER LIST HAD… | A, measured |
| [E-229](../../../CLAIMS.md#L289) | Established | A RECORDED P-12 SEARCH NO LONGER REPRODUCED: FIVE FILES, NOT THREE — FIFTEENTH INSTANCE OF A RESTATED NUMBER GOING STALE, AND IT WAS INSIDE THE… | A, measured |
| [E-232](../../../CLAIMS.md#L292) | Established | THE DISCLOSURE-PHRASE GATE FALSE-PASSED ON THE EXACT SENTENCE IT HAD JUST BEEN EXTENDED TO CATCH, AND THE FIX PASS MANUFACTURED ITS OWN SUPPRESSION. | A, measured |
| [E-234](../../../CLAIMS.md#L294) | Established | THE SOCKET FIX WAS WRITTEN AGAINST THE FINDING'S LIST RATHER THAN THE PROPERTY, THE DISCLOSURE GATE COULD NOT SEE THE RENDERED UI, AND THREE… | A, measured |
| [E-239](../../../CLAIMS.md#L299) | Established | THE PUBLICATION ROTATION FOUND THE ENTRY POINTS HONEST AND THE INTERIOR NOT — AND IT RETRACTED THE ADJUDICATOR'S OWN ACCEPTED RECOMMENDATION. | A, measured |
| [E-241](../../../CLAIMS.md#L301) | Established | THE ISSUER ROUTE IS RULED AND THE DISCLOSURE IS REMOVED RATHER THAN GUARDED — OPTION 2, 2026-09-05. | A, measured |
| [E-243](../../../CLAIMS.md#L303) | Established | CLAIMS.md HAD 24 BLANK LINES INSIDE ITS TABLES AND RENDERED AS ROUGHLY TWENTY SEPARATE FRAGMENTS — check-tables REPORTED PASS THROUGHOUT, FOR WEEKS. | A, measured |
| [E-245](../../../CLAIMS.md#L305) | Established | CLAIMS.md NOW HAS TOPIC VIEWS, AND THEY ARE GENERATED VIEWS RATHER THAN A SPLIT — BECAUSE ABOUT HALF THE ROWS CARRY MORE THAN ONE TOPIC. | A, measured |
| [E-247](../../../CLAIMS.md#L307) | Established | REVIEW-041 — ROUND TWO, TWO EXTERNAL LEGS, AND THE HEADLINE IS A FALSE PREMISE THE GATE WAS BUILT ON. IN A GFM TABLE A PIPE IS A CELL DELIMITER EVEN… | A, measured |
| [E-249](../../../CLAIMS.md#L309) | Established | CLAIMS.md's Revision history stopped being maintained on 2026-08-25 and nobody noticed for fifteen days. | A, measured |
| [E-250](../../../CLAIMS.md#L310) | Established | The 2026-08-17 revision entry's body was deleted on 2026-08-18 by the commit that rewrote the paragraph around it, and the dangling date stood for… | A, source |
| [E-252](../../../CLAIMS.md#L312) | Established | CLAUDE.md carries a higher density than the register the discipline was measured from, and it was never sampled. | A, measured |
| [E-254](../../../CLAIMS.md#L314) | Established | CLAUDE.md said bun test web/api is 89 tests and it is 129. | A, measured |
| [E-256](../../../CLAIMS.md#L316) | Established | E-117's premises hold at source and one of its clauses was false from the commit that wrote it. | A, source |
| [E-259](../../../CLAIMS.md#L319) | Established | REVIEW-044, round two, three legs with differed packets: the fixes carried a live false-pass, one defect a fix INTRODUCED, and a sentence that was… | A, measured |
| [E-262](../../../CLAIMS.md#L322) | Established | A handover edit was reported as applied and never reached the file. | A, source |
| [E-263](../../../CLAIMS.md#L323) | Established | Giving rule 6 to cmark-gfm made two of the harness's own probes stale, and the harness is the only thing that said so. | A, measured |
| [E-264](../../../CLAIMS.md#L324) | Established | The emphasis-gate rotation STOPS at three rounds, which departs from CLAUDE.md's rule, and the owner ruled it on 2026-09-09. | A, reasoned |
| [E-267](../../../CLAIMS.md#L327) | Established | CLAIMS.md's revision history is DERIVED from git as of 2026-09-11, and building it manufactured a defect that did not exist. | A, measured |
| [E-268](../../../CLAIMS.md#L328) | Established | A generated file whose input includes its own commit has NO FIXPOINT — FALSE AS STATED, and corrected the next day by an external review (E-271).… | A, measured |
| [E-272](../../../CLAIMS.md#L332) | Established | Round two on the same work: the concurrency lock was wrong TWICE, and a retired sentence came back because a GENERATOR emits it. | A, measured |
| [E-273](../../../CLAIMS.md#L333) | Established | A retired sentence that lives in a GENERATOR regenerates, so fixing the behaviour and leaving the template reinstates the false claim on every run. | A, measured |
| [E-277](../../../CLAIMS.md#L337) | Established | The handover cited a commit that does not exist, one section below the paragraph where a fabricated sha had already been removed for the same reason. | A, measured |
| [E-281](../../../CLAIMS.md#L341) | Established | The custody request's summary paragraph contradicted the option it had just corrected, two sentences later. | A, source |
| [E-288](../../../CLAIMS.md#L348) | Established | CLAIMS.md's Findings heading says *"file upstream before publishing"*, and 12 of its 29 rows are upstream-directed with neither a filing nor a… | A, row by row |
| [E-291](../../../CLAIMS.md#L351) | Established | The custody request's reassurance about its own seed was false: the Dedicated Account's seed is in a 0644 file, and the request named a different one. | A, measured |
| [E-292](../../../CLAIMS.md#L352) | Established | Two records in the custody material did not reproduce, and the round's own self leg made the kind of error the round existed to catch. | A, measured |
| [E-294](../../../CLAIMS.md#L354) | Established | The project owner ruled B-27 and part of B-28 on 2026-09-13, and the custody ruling is built as a disclosure printed on every facility run. | A, recorded and tested |
| [E-297](../../../CLAIMS.md#L357) | Established | F-8 is fixed in upstream's SOURCE TREE. The BSGS decrypt function mpt-crypto's documentation pointed to exists from tag 1.0.5, so on present evidence… | A, read at source;… |
| [E-300](../../../CLAIMS.md#L360) | Established | F-9 still reproduces at upstream HEAD, and it was run, but its shape has changed. The setup mpt-crypto's README links adds a remote without the… | A, executed |
| [E-316](../../../CLAIMS.md#L376) | Established | Four of the 2026-08-26 filings were resolved upstream in September, in the merged XLS-0096 and the docs page, and the register did not know until a… | A, read at source |
| [E-319](../../../CLAIMS.md#L379) | Established | The four Devnet transactions the README offers a stranger can no longer be fetched from the public Devnet endpoint, and Devnet was not reset. | A, executed |
| [E-322](../../../CLAIMS.md#L382) | Established | The README failed the owner's /claims-check on 2026-10-18 on claims that had gone stale, and the same stale claims stood on other surfaces, including… | A, read at source |
| [E-328](../../../CLAIMS.md#L388) | Established | REVIEW-058 round one reviewed ADR-0004 with three differed legs and found its central sentence false, a gap in the facility's ledger reader, and two… | A, measured |
| [E-335](../../../CLAIMS.md#L395) | Established | The owner ruled the licence email redacted and kept the CLI deploy, and claims-check found five overstatements in the hosted build's own README… | A, measured |
| [B-20](../../../CLAIMS.md#L414) | Pending | The deterministic signing arm is pub in an ordinary release build, and only a doc comment says it is for vectors. CLOSED 2026-08-27, with the B-16… | CLOSED, with a REAL… |
| [F-1](../../../CLAIMS.md#L446) | Findings | Docs claim the reset inbox value is indistinguishable; it is the canonical EncZero, recomputable by any observer from public inputs, and used on… | A |
| [F-2](../../../CLAIMS.md#L447) | Findings | Spec §13.2.2's "separate view keys" have no ledger field. Protocol layer: issuer keys are permanent. Operational layer: an issuer choosing Mechanism… | A / B |
| [F-3](../../../CLAIMS.md#L448) | Findings | Docs say confidentiality can be toggled on and off; spec and transactor have no clear flag | A |
| [F-4](../../../CLAIMS.md#L449) | Findings | Docs say clawback resets the version counter to 0; it increments | A |
| [F-24](../../../CLAIMS.md#L459) | Findings | Our own facility walkthrough understates what a ConvertBack publishes. | A, executed |
| [F-26](../../../CLAIMS.md#L461) | Findings | The facility walkthrough's *"After this, no plaintext amount appears again until the facility is retired or resized"* was FALSE, and it is the SECOND… | A on the reading, NOT… |
| [R-3](../../../CLAIMS.md#L492) | Retracted | F-3: "docs say confidentiality can be toggled on and off" | Corrected upstream.… |
| [R-4](../../../CLAIMS.md#L493) | Retracted | F-4: "docs say clawback resets the version counter" | Not a doc error.… |
