# Decisions, rulings and scope

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

ADRs, decision requests and rulings — what was decided, what was reopened, and what a coding session may not choose.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**92 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [E-1](../../../CLAIMS.md?plain=1#L41) | Established | XLS-0096 authors: Cenk, Malhotra, Akinyele, Chen, Xie, Qian; status Draft, created 2026-01-15. Superseded upstream on 2026-09-03. XLS-0096 PR #604,… | A |
| [E-13](../../../CLAIMS.md?plain=1#L54) | Established | ~~xrpl.js@5.0.0 and ripple-binary-codec@2.8.0 contain no Confidential MPT types or fields~~ SUPERSEDED 2026-08-16 → E-30. True of the versions named;… | A |
| [E-14](../../../CLAIMS.md?plain=1#L55) | Established | mpt-crypto is C/C++; 0.4.0-rc4 in rippled 3.3.0. ~~no bindings, no WASM target, no published package~~ PARTLY SUPERSEDED 2026-08-16 → E-31. A WASM… | A |
| [E-18](../../../CLAIMS.md?plain=1#L59) | Established | An MPToken cannot be deleted once confidential fields are initialised, even at zero balance. Superseded upstream on 2026-09-03. XLS-0096 PR #604… | A |
| [E-57](../../../CLAIMS.md?plain=1#L107) | Established | GAP-11 closed. The Rust path for ADR-0001's signer already exists upstream and is published. | A on existence and… |
| [E-66](../../../CLAIMS.md?plain=1#L117) | Established | The XLS-96 registration PoK IS bound to the account, so a registration proof is not copyable to another account. Issue #4 closed, and §(b)'s… | A, read |
| [E-69](../../../CLAIMS.md?plain=1#L120) | Established | An XRPL account's master seed need not be its spending authority, which is the fact that falsifies ADR-0001 §(e)'s central defence. | A, read |
| [E-72](../../../CLAIMS.md?plain=1#L123) | Established | ADR-0001's build-cost comparison was INVERTED, not merely stale, and the decision survived the correction. | A on the cost facts;… |
| [E-74](../../../CLAIMS.md?plain=1#L125) | Established | SUPERSEDED 2026-08-18 → E-80, E-83, E-84. | A |
| [E-75](../../../CLAIMS.md?plain=1#L126) | Established | The ruled r/ρ construction is implemented and reproduces all nine published vectors from an independent second implementation. | A, executed |
| [E-76](../../../CLAIMS.md?plain=1#L127) | Established | The tools/ half was still open until 2026-08-24 and is now CLOSED → E-132. | A |
| [E-88](../../../CLAIMS.md?plain=1#L139) | Established | session.rs now calls store and randomness on the signing path, in the order the rulings require, and there are tests that fail if it does not. | A, executed |
| [E-109](../../../CLAIMS.md?plain=1#L160) | Established | B-14 ruled and implemented: the transaction's ECDSA nonce is hedged, because the issue #1 ruling extends to it. | A, executed |
| [E-110](../../../CLAIMS.md?plain=1#L161) | Established | B-15 ruled: one ledger endpoint stands for this artifact, as a NAMED RISK ACCEPTANCE, and the disclosure is a condition of the ruling rather than a… | A, executed |
| [E-111](../../../CLAIMS.md?plain=1#L162) | Established | ADR-0002's second round found that its Decision sentence asserted what the ADR itself reopened two sections later | A, executed |
| [E-112](../../../CLAIMS.md?plain=1#L163) | Established | A review leg argued a coding session could close a question the ADR reserves for scope, and it was checked and rejected. | A, executed |
| [E-113](../../../CLAIMS.md?plain=1#L164) | Established | A test written the same hour, for the ruling it was guarding, could not check the thing its name promised. | A, executed |
| [E-114](../../../CLAIMS.md?plain=1#L165) | Established | ADR-0002's open question may be premised on a facility TASK ZERO §9 does not describe, and two review rounds could not see it because the packet… | A, source |
| [E-115](../../../CLAIMS.md?plain=1#L166) | Established | ADR-0002's hybrid is resolved on a TECHNICAL ground, and the scope question two revisions deferred to turns out not to decide it. | A, executed |
| [E-117](../../../CLAIMS.md?plain=1#L168) | Established | Rejecting the XLS-65 Vault traded away a custody property, and ~~ADR-0002 does not say so~~ ADR-0002 has said so since c34dcec (E-256, E-295). | A, source on both… |
| [E-118](../../../CLAIMS.md?plain=1#L169) | Established | Architecture §6 step 6 is built: the ElGamal key is DERIVED from the master seed under the ruled construction, and the ledger holds the result. | A, executed |
| [E-119](../../../CLAIMS.md?plain=1#L170) | Established | ADR-0001 §(e)'s only benefit is now EXECUTED rather than described: the seed alone reproduced the key the ledger holds. | A, executed |
| [E-122](../../../CLAIMS.md?plain=1#L173) | Established | A module header called the ECDSA nonce "unruled" for a full day after REVIEW-018 ruled it, in a file whose code had already been changed to hedge. | A, reasoned |
| [E-143](../../../CLAIMS.md?plain=1#L194) | Established | Three harnesses that SUBMIT TO DEVNET were exempted from the ruled derivation on two successive false reasons, and the second was written to correct… | A, executed |
| [E-148](../../../CLAIMS.md?plain=1#L199) | Established | B-15 Option A's real cost is a FULL DEVNET SYNC, and there is no rehearsal network. Measured, not estimated. | A, executed — the… |
| [E-151](../../../CLAIMS.md?plain=1#L211) | Established | B-15's step-7 answer was AMENDED by the project owner, and the amendment is recorded in code rather than only in prose. | A, reasoned |
| [E-158](../../../CLAIMS.md?plain=1#L218) | Established | B-16 is RULED — the ed25519 signing nonce is hedged, and B-14 is now closed on both halves. | A, ruled → built |
| [E-163](../../../CLAIMS.md?plain=1#L223) | Established | B-16 is BUILT AND EXECUTED — the ed25519 signing nonce is hedged on the DEFAULT path. | A, executed |
| [E-171](../../../CLAIMS.md?plain=1#L231) | Established | B-19's PREMISE AND B-19's GATE WERE BOTH FALSE, AND THE THING THAT FOUND IT WAS BUILDING THE GATE B-19 SAID IT HAD. | A, executed (E-244) |
| [E-172](../../../CLAIMS.md?plain=1#L232) | Established | THE FALSE B-19 PREMISE SURVIVED THE COMMIT THAT CORRECTED IT — AND TWO OF THE SURVIVORS WERE WRITTEN BY THAT COMMIT. | A, measured (E-244,… |
| [E-174](../../../CLAIMS.md?plain=1#L234) | Established | A REVIEW LEG RULED THE SESSION'S CENTRAL FINDING FALSE, FROM A CORRECT-SOUNDING READING OF CARGO'S RULES, AND WAS REFUTED BY THE COMPILER'S OWN FLAGS. | A, source (E-244,… |
| [E-176](../../../CLAIMS.md?plain=1#L236) | Established | B-21's default signing path is EXECUTED on Devnet, and the receipt was written before the prose. | A, executed (E-244) |
| [E-177](../../../CLAIMS.md?plain=1#L237) | Established | A DECISION REQUEST ARGUING THAT HAND-ENUMERATED SITE LISTS ARE UNFALSIFIABLE CONTAINED FOUR ENUMERATION ERRORS OF ITS OWN. | A, executed |
| [E-181](../../../CLAIMS.md?plain=1#L241) | Established | ROUND TWO FOUND THAT THE B-22 BUILD DID NOT IMPLEMENT ITS OWN RULING, AND THAT PROSE WAS COVERING THE GAP. | A, executed |
| [E-183](../../../CLAIMS.md?plain=1#L243) | Established | A COPY WAS DELETED RATHER THAN WIPED, AND THAT IS THE STRONGER FIX — B-23's one genuinely new idea. | A, executed |
| [E-184](../../../CLAIMS.md?plain=1#L244) | Established | THE B-22 DECISION REQUEST CALLED THIS AN OPEN TECHNICAL QUESTION AND IT DISSOLVED IN THREE LINES. | A, executed |
| [E-185](../../../CLAIMS.md?plain=1#L245) | Established | E-168 FOR THE THIRD TIME, AND THIS TIME THE RULING'S OWN SITE LIST IS WHAT WAS INCOMPLETE. | A, executed |
| [E-187](../../../CLAIMS.md?plain=1#L247) | Established | B-23 RESTED ON A CARGO FEATURE NO MANIFEST IN THIS REPOSITORY ASKED FOR — E-167 RUNNING FORWARD INSTEAD OF BEING QUOTED. | A, executed |
| [E-188](../../../CLAIMS.md?plain=1#L248) | Established | FIVE OF B-23's SEVEN REVERTS COMPILE CLEAN — E-179's RULE RUN FORWARD, AND THE ANSWER WAS MOSTLY *NO FALSIFIER EXISTS*. | A, executed |
| [E-191](../../../CLAIMS.md?plain=1#L251) | Established | B-23's FALSIFIERS WERE VERIFIED BY BREAKING THEM, AND ONE OF THEM CATCHES LESS THAN ITS NAME SUGGESTS. | A, executed |
| [E-192](../../../CLAIMS.md?plain=1#L252) | Established | A COMMENT IN THE B-23 BUILD CREDITED A BINDING WITH A DEFENCE THE BINDING DOES NOT PROVIDE — E-181's SHAPE, POINTING THE OTHER WAY. | A, executed |
| [E-193](../../../CLAIMS.md?plain=1#L253) | Established | A TEST WRITTEN IN THIS SESSION TO PIN B-23's PARSE SWAP FALSE-PASSED, AND ONLY BREAKING THE CODE FOUND IT — E-164's SHAPE, FOURTH INSTANCE. | A, executed |
| [E-195](../../../CLAIMS.md?plain=1#L255) | Established | B-23 REMOVED A DUPLICATE SEED DECODE FROM ONE FILE AND LEFT THE IDENTICAL ONE IN THE FILE ABOVE IT. | A, executed |
| [E-202](../../../CLAIMS.md?plain=1#L262) | Established | THE ONLY REAL FALSIFIER B-25 HAD FOR ITS OWN HEADLINE CLAIM WAS UNDEFINED BEHAVIOUR, AND ITS DOC COMMENT CONDEMNED ITSELF. | A, measured |
| [E-212](../../../CLAIMS.md?plain=1#L272) | Established | THE WEB TIER SHIPPED A DECRYPTION ORACLE, AND IT VIOLATED THE SCOPE THE SAME SESSION HAD WRITTEN HOURS EARLIER. | A, measured |
| [E-217](../../../CLAIMS.md?plain=1#L277) | Established | A FILING PROTOCOL AND ITS GATE, RULED 2026-09-01 — AND THE GATE'S FIRST TWO BUGS WERE FOUND BY ITS OWN POSITIVE CONTROL. | A, measured |
| [E-228](../../../CLAIMS.md?plain=1#L288) | Established | THE WEB TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY IN TWO PLACES, EACH WITH A COMMENT SAYING WHY — AND ADR-0003's FALSIFIER LIST HAD… | A, measured |
| [E-230](../../../CLAIMS.md?plain=1#L290) | Established | ADR-0003's CENTRAL CLAIM WAS ADVERSARIALLY REVIEWED FOR THE FIRST TIME AND ALL FOUR LEGS RULED IT UNSOUND AS STATED. | A, executed |
| [E-240](../../../CLAIMS.md?plain=1#L300) | Established | THE Observed SECTION IS WITHHELD FROM THE PUBLIC TREE — RULED BY THE PROJECT OWNER 2026-09-05, REVERSING THIS PROJECT'S OWN EARLIER POSITION. | A, measured |
| [E-241](../../../CLAIMS.md?plain=1#L301) | Established | THE ISSUER ROUTE IS RULED AND THE DISCLOSURE IS REMOVED RATHER THAN GUARDED — OPTION 2, 2026-09-05. | A, measured |
| [E-246](../../../CLAIMS.md?plain=1#L306) | Established | REVIEW-040 — FOUR LEGS ON THE BRANCH THAT FIXED E-243, AND THE WORST FINDING IS THAT THE JUSTIFICATION FOR ITS MAIN DESIGN DECISION CAME FROM AN… | A, measured |
| [E-256](../../../CLAIMS.md?plain=1#L316) | Established | E-117's premises hold at source and one of its clauses was false from the commit that wrote it. | A, source |
| [E-264](../../../CLAIMS.md?plain=1#L324) | Established | The emphasis-gate rotation STOPS at three rounds, which departs from CLAUDE.md's rule, and the owner ruled it on 2026-09-09. | A, reasoned |
| [E-288](../../../CLAIMS.md?plain=1#L348) | Established | CLAIMS.md's Findings heading says *"file upstream before publishing"*, and 12 of its 29 rows are upstream-directed with neither a filing nor a… | A, row by row |
| [E-289](../../../CLAIMS.md?plain=1#L349) | Established | The repository's history carries none of the 19 live Devnet secret values held outside the tree, and it does carry every row the 2026-09-05 ruling… | A on the named… |
| [E-290](../../../CLAIMS.md?plain=1#L350) | Established | The custody decision request priced the wrong set of credentials, and its first review round of its own withdrew its recommendation. | A, source; the lock… |
| [E-294](../../../CLAIMS.md?plain=1#L354) | Established | The project owner ruled B-27 and part of B-28 on 2026-09-13, and the custody ruling is built as a disclosure printed on every facility run. | A, recorded and tested |
| [E-298](../../../CLAIMS.md?plain=1#L358) | Established | The owner ruled F-19 not-to-file on 2026-09-14, and issue #7 is closed. F-8 and F-18 are recorded as not-to-file because upstream overtook both,… | A, recorded |
| [E-302](../../../CLAIMS.md?plain=1#L362) | Established | The owner ruled four more of E-288's 12 on 2026-09-14: F-7 and F-15 are not-to-file, and F-9 and F-12 are to be filed. | A, recorded |
| [E-308](../../../CLAIMS.md?plain=1#L368) | Established | The owner ruled the last five of E-288's 12 on 2026-09-14. F-11, F-16 and F-21 are not-to-file, and F-13 and F-17 are to be filed. Every one of the… | A, recorded |
| [E-309](../../../CLAIMS.md?plain=1#L369) | Established | The owner ruled the shape of publication on 2026-09-22: a read-only hosted demo, a squashed public history, the four filings first, and everything… | A, recorded |
| [E-312](../../../CLAIMS.md?plain=1#L372) | Established | REVIEW-050, the narrow third round the owner ruled, found five more surviving copies, all fixed, and the E-296 to E-307 rotation is CLOSED as ruled… | A, recorded |
| [E-313](../../../CLAIMS.md?plain=1#L373) | Established | The four findings ruled to file all hold at upstream HEAD on 2026-09-22. F-9's remedy is a remote migration that clio and rippled made and mpt-crypto… | A, run and read |
| [E-315](../../../CLAIMS.md?plain=1#L375) | Established | F-17, F-12 and F-13 are filed, as mpt-crypto#153, #154 and #155, and the four findings ruled to file are all sent, which is phase 0's exit. | A, run and read |
| [E-321](../../../CLAIMS.md?plain=1#L381) | Established | REVIEW-056 round three, the last by the owner's ruling, found that four of round two's fixes still missed members of their class, and that the… | A, executed |
| [E-323](../../../CLAIMS.md?plain=1#L383) | Established | REVIEW-057, one Codex leg on the phase 1 publication plan before any step ran, found that the plan as the owner ruled it could not produce what it… | A, measured |
| [E-324](../../../CLAIMS.md?plain=1#L384) | Established | Step 1's inventory found six third-party projects reproduced in the tracked tree, and NOTICE is written from it rather than from memory. | A, measured |
| [E-327](../../../CLAIMS.md?plain=1#L387) | Established | The hosted demo is scoped as architecture §6 step 9 and ADR-0004, Proposed, and its design rests on measurements taken on 2026-10-19. | A, measured |
| [E-328](../../../CLAIMS.md?plain=1#L388) | Established | REVIEW-058 round one reviewed ADR-0004 with three differed legs and found its central sentence false, a gap in the facility's ledger reader, and two… | A, measured |
| [E-331](../../../CLAIMS.md?plain=1#L391) | Established | The project owner ruled ADR-0004's four decisions on 2026-10-19, each as recommended, and the ADR is Accepted at revision 5. | A, recorded |
| [E-335](../../../CLAIMS.md?plain=1#L395) | Established | The owner ruled the licence email redacted and kept the CLI deploy, and claims-check found five overstatements in the hosted build's own README… | A, measured |
| [E-337](../../../CLAIMS.md?plain=1#L397) | Established | The owner named who acts when the demo goes down: the owner. | A, recorded |
| [E-340](../../../CLAIMS.md?plain=1#L400) | Established | The owner reported the rest of the deploy setup: no Git repository is connected to the Vercel project, the toolbar is off, and the deploys ran on the… | A, recorded |
| [E-345](../../../CLAIMS.md?plain=1#L405) | Established | REVIEW-059 round two found that five of round one's fixes did not discharge their findings, so its stopping condition fired and a third round is the… | A, measured |
| [E-346](../../../CLAIMS.md?plain=1#L406) | Established | REVIEW-059 round two's fixes are built: each now runs its finding's own example and the next case in that example's class, and each check was broken… | A, measured |
| [E-347](../../../CLAIMS.md?plain=1#L407) | Established | REVIEW-059 round three, run as the owner ruled on 2026-10-21, found three of round two's fixes still partial and two new browser gaps, and the… | A, measured |
| [B-22](../../../CLAIMS.md?plain=1#L430) | Pending | ~~The KEY-DERIVATION path leaves secret material unwiped, and B-21 deliberately did not cover it. sha512half is used for public transaction digests…~~ | 268 tests at B-22;… |
| [B-23](../../../CLAIMS.md?plain=1#L431) | Pending | The seed's residue in holder.rs — the second half of B-22's ruled unit, IN SCOPE and NOT deferred. | BUILT AND EXECUTED… |
| [B-24](../../../CLAIMS.md?plain=1#L432) | Pending | REVIEW-031's fixes — the seed residue B-23 left, and the gate that could not see it. | BUILT 2026-08-28. The… |
| [B-27](../../../CLAIMS.md?plain=1#L435) | Pending | RULED 2026-09-13 by the project owner (E-294). | A ruling by the… |
| [B-28](../../../CLAIMS.md?plain=1#L436) | Pending | Whether this repository becomes public, for what purpose, and in which form. | A ruling by the… |
| [B-20](../../../CLAIMS.md?plain=1#L440) | Pending | ~~The deterministic signing arm is pub in an ordinary release build, and only a doc comment says it is for vectors.~~ CLOSED 2026-08-27, with the… | CLOSED, with a REAL… |
| [B-18](../../../CLAIMS.md?plain=1#L443) | Pending | LARGELY CLOSED 2026-08-25 → E-146, E-149, F-27. What remains is narrower and is stated at the end of this row. | A loopback rippled… |
| [B-15](../../../CLAIMS.md?plain=1#L444) | Pending | AMENDED AGAIN 2026-08-25 → E-151: the named risk acceptance is EXTENDED to the facility's Devnet demo, because Option A turned out not to be payable… | RESOLVED → REVIEW-019-… |
| [B-16](../../../CLAIMS.md?plain=1#L445) | Pending | ~~The ed25519 signing nonce — B-14's other half, and the LIVE path.~~ RULED 2026-08-27 → E-158. BUILT AND EXECUTED the same day → E-163. ~~RULED AND…~~ | CLOSED as a build →… |
| [B-14](../../../CLAIMS.md?plain=1#L446) | Pending | ~~Where the transaction's own ECDSA signing nonce k comes from — a fifth randomness site, and no packet has covered it.~~ RULED 2026-08-20 → E-109.… | RESOLVED → REVIEW-018-… |
| [B-7](../../../CLAIMS.md?plain=1#L455) | Pending | ~~Any statement about what the 192-byte sigma proof proves — including ADR-0001's premise that balance linkage requires the sender's secret key~~ | RESOLVED 2026-08-16 →… |
| [F-20](../../../CLAIMS.md?plain=1#L494) | Findings | REVIEW-012-RULING-keygen's domain-separation table named a label family that does not exist. | A |
| [F-29](../../../CLAIMS.md?plain=1#L500) | Findings | XLS-0096 §7.4 states the MPToken deletion blocker unconditionally; rippled enforces it through two paths that disagree. | A, not executed |
| [R-2](../../../CLAIMS.md?plain=1#L517) | Retracted | ADR-0001 rev 1: local proving is "the only option under which the confidentiality claim is true" | Conflated custody… |
| [R-6](../../../CLAIMS.md?plain=1#L520) | Retracted | B-11 / ADR-0002 blocker 3 / investigation §12: that encrypted loan accounting is structurally blocked, because XLS-96's additive homomorphism "cannot… | The mathematics was… |
| [R-11](../../../CLAIMS.md?plain=1#L526) | Retracted | The published blog, figure 2's alt text, the social drafts, the README, ADR-0001 and the hosted explainer: clawback given as fixed, *"if the token… | The condition was… |
