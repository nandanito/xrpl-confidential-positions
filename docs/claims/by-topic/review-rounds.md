# Review rounds and adjudication

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

What adversarial rounds found, what legs got wrong, and what the two-round rule has cost and bought.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**82 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [P-10](../../../CLAIMS.md#L31) | Prohibitions | That XLS-96 supports key rotation or key recovery | It supports neither,… |
| [E-51](../../../CLAIMS.md#L102) | Established | A three-participant ConfidentialMPTSend writes 1219 B or 1225 B of metadata against kOversizeMetaDataCap = 5200 — not a constant. Corrected… | A |
| [E-64](../../../CLAIMS.md#L115) | Established | r and ρ are caller-owned, so whatever the third packet rules for them needs no upstream change and has no FFI problem. | A |
| [E-75](../../../CLAIMS.md#L126) | Established | The ruled r/ρ construction is implemented and reproduces all nine published vectors from an independent second implementation. | A, executed |
| [E-78](../../../CLAIMS.md#L129) | Established | The signer implementation was adversarially reviewed and the review found real defects. | A, executed |
| [E-87](../../../CLAIMS.md#L138) | Established | A real defect in the signing path was found by a test, not by review, and it would have been rejected by every validator. | A |
| [E-89](../../../CLAIMS.md#L140) | Established | Step 3 was adversarially reviewed and the review found a defect that would have broken every Send on an auditor-enabled issuance. | A, executed |
| [E-90](../../../CLAIMS.md#L141) | Established | The review found that validation ran AFTER the randomness reservation, and that a test had codified it as intended. | A, executed |
| [E-93](../../../CLAIMS.md#L144) | Established | Two round-one findings were WRONG, and both are now pinned by tests rather than by a disposition note. | A, executed |
| [E-94](../../../CLAIMS.md#L145) | Established | Round two reviewed the FIXES and found a defect one of them introduced, a test that passed for the wrong reason, and four overclaims. | A, executed |
| [E-95](../../../CLAIMS.md#L146) | Established | Reading the spec to settle a review question found a defect neither review round did. | A, executed |
| [E-96](../../../CLAIMS.md#L147) | Established | A third review round was run against this project's own two-round rule, and it found a defect neither earlier round could have. | A, executed |
| [E-105](../../../CLAIMS.md#L156) | Established | Step 2 was reviewed (REVIEW-016, two independent legs) and the review found real defects, one of them in the guard this project calls absolute. | A, executed |
| [E-106](../../../CLAIMS.md#L157) | Established | A review leg's diagnosis was wrong for the fourth time in this project, and a second leg's remedy was right in direction and too broad. | A, executed |
| [E-107](../../../CLAIMS.md#L158) | Established | Round two reviewed the fixes and found all three things a round two is for, including a defect one of the fixes INTRODUCED. | A, executed |
| [E-108](../../../CLAIMS.md#L159) | Established | Two of the tests written for round two's own findings were FALSE PASSES, and only the revert spot-check caught them. | A, executed |
| [E-111](../../../CLAIMS.md#L162) | Established | ADR-0002's second round found that its Decision sentence asserted what the ADR itself reopened two sections later | A, executed |
| [E-112](../../../CLAIMS.md#L163) | Established | A review leg argued a coding session could close a question the ADR reserves for scope, and it was checked and rejected. | A, executed |
| [E-114](../../../CLAIMS.md#L165) | Established | ADR-0002's open question may be premised on a facility TASK ZERO §9 does not describe, and two review rounds could not see it because the packet… | A, source |
| [E-122](../../../CLAIMS.md#L173) | Established | A module header called the ECDSA nonce "unruled" for a full day after REVIEW-018 ruled it, in a file whose code had already been changed to hedge. | A, reasoned |
| [E-124](../../../CLAIMS.md#L175) | Established | Step 6 was reviewed in two rounds by four legs, and NOT ONE finding touched the derivation. | A, executed |
| [E-137](../../../CLAIMS.md#L188) | Established | CORRECTED 2026-08-25 BY ROUND TWO → E-141, E-142. | A, executed |
| [E-140](../../../CLAIMS.md#L191) | Established | THIS ROW'S OWN FIX WAS WRONG TWICE AND ROUND TWO FOUND BOTH → E-143. | A, reasoned |
| [E-152](../../../CLAIMS.md#L212) | Established | REVIEW-023 reviewed the accepted-risk hatch, the post-execution fixes and the executed claims — seven findings, all upheld, none stale — and FOUR of… | A, executed — the… |
| [E-153](../../../CLAIMS.md#L213) | Established | REVIEW-023 ROUND TWO reviewed the FIXES, and found that three of round one's seven had not reached sites the findings themselves cited by file and… | A, executed — the… |
| [E-154](../../../CLAIMS.md#L214) | Established | CLAUDE.md carried two stale claims in its Stack section, and one of them described a design REVIEW-003b had KILLED. | A, read at source |
| [E-156](../../../CLAIMS.md#L216) | Established | AN EXTERNAL LEG FOUND 13 DEFECTS IN THE FIVE FILINGS AFTER MY OWN REVIEW FOUND 3, AND THE WORST WAS IN THE POSITIVES. | A, executed |
| [E-160](../../../CLAIMS.md#L220) | Established | An excerpt is a diff by another name, and the packet's excerpt walked a leg into a false statement. | A |
| [E-161](../../../CLAIMS.md#L221) | Established | Two defects found by review legs outside the question they were asked, both verified at source. | A, executed |
| [E-166](../../../CLAIMS.md#L226) | Established | REVIEW-025 round one: eleven findings, not one of them about the construction. | A, executed |
| [E-168](../../../CLAIMS.md#L228) | Established | Round two found that round one's adjudication OVERSTATED ITS OWN FIXES, in the round whose entire lesson is that fixes and descriptions fail… | A, executed |
| [E-170](../../../CLAIMS.md#L230) | Established | A REVIEW LEG GRADED A HIGH DEFECT THAT DOES NOT EXIST, AND ITS EXCERPT OF THE FILE IS WHY — with the complete file in the packet. | A, source (E-244) |
| [E-173](../../../CLAIMS.md#L233) | Established | THE TEST AND THE GATE WERE BOTH BLIND TO THE ONLY THING THAT MATTERS — THE CALL SITE — AND BOTH REVIEW-027 EXTERNAL LEGS FOUND IT INDEPENDENTLY. | A, executed (E-244) |
| [E-174](../../../CLAIMS.md#L234) | Established | A REVIEW LEG RULED THE SESSION'S CENTRAL FINDING FALSE, FROM A CORRECT-SOUNDING READING OF CARGO'S RULES, AND WAS REFUTED BY THE COMPILER'S OWN FLAGS. | A, source (E-244,… |
| [E-175](../../../CLAIMS.md#L235) | Established | ROUND TWO FOUND THAT ROUND ONE'S FIX FOR E-172 REPRODUCED E-172. A COMPLETENESS CLAIM WAS FALSE, AND ONE SURVIVING SENTENCE SAT DIRECTLY BELOW THE… | A, measured and… |
| [E-180](../../../CLAIMS.md#L240) | Established | TWO REVIEW LEGS SPLIT ON THE CENTRAL QUESTION, AND THE SPLIT WAS WORTH MORE THAN THE PREVIOUS ROUND'S UNANIMITY. | A |
| [E-181](../../../CLAIMS.md#L241) | Established | ROUND TWO FOUND THAT THE B-22 BUILD DID NOT IMPLEMENT ITS OWN RULING, AND THAT PROSE WAS COVERING THE GAP. | A, executed |
| [E-194](../../../CLAIMS.md#L254) | Established | A LEG'S FINDING WAS CORRECT, COMMITTED, AND NEVER ACTED ON — AND THE NEXT MILESTONE'S BUILD INHERITED THE DEFECT. | A, executed |
| [E-215](../../../CLAIMS.md#L275) | Established | ROUND TWO OF THE CODEX REVIEW, AND THE HEADLINE IS THAT ROUND ONE'S FIX CREATED THE NEW P1 AND ROUND ONE'S NEW TEST FALSE-PASSED. | A, measured |
| [E-218](../../../CLAIMS.md#L278) | Established | A SELF-REVIEW OF THE TWO FILING COMMANDS FOUND FOUR DEFECTS AND REPORTED THEM FIXED; AN INDEPENDENT PASS THEN FOUND SIX MORE — INCLUDING ONE THE… | A, measured |
| [E-219](../../../CLAIMS.md#L279) | Established | ROUND FOUR, AND TWO OF THE FOUR FINDINGS WERE DEFECTS IN ROUND THREE'S FIXES. | A, measured |
| [E-220](../../../CLAIMS.md#L280) | Established | STEP 8'S FIRST INDEPENDENT REVIEW — nine findings, no P1, and TWO WERE FUNCTIONAL BUGS THE WHOLE TEST SUITE MISSED. | A, measured |
| [E-221](../../../CLAIMS.md#L281) | Established | ROUND TWO ON STEP 8: FIVE FINDINGS, AND FOUR WERE DEFECTS IN ROUND ONE'S FIXES. | A, measured |
| [E-223](../../../CLAIMS.md#L283) | Established | ROUND THREE ON THE README RETURNED TWO P1s THAT FIVE EARLIER LEGS HAD MISSED, AND THE BINDING CONSTRAINT WAS *ACCESS*, NOT ADVERSARIAL DEPTH. | A, executed |
| [E-224](../../../CLAIMS.md#L284) | Established | AN ADVERSARIAL LEG POINTED AT THE FIXES FOUND 14 DEFECTS, AND THE P1 IS A FALSE DISCLOSURE THE SIGNER SHOWED HOLDERS AT ONBOARDING. | A, executed |
| [E-230](../../../CLAIMS.md#L290) | Established | ADR-0003's CENTRAL CLAIM WAS ADVERSARIALLY REVIEWED FOR THE FIRST TIME AND ALL FOUR LEGS RULED IT UNSOUND AS STATED. | A, executed |
| [E-233](../../../CLAIMS.md#L293) | Established | THE REWRITE INTRODUCED THREE DEFECTS OF ITS OWN, WHICH IS THE CLASS ROUND TWO EXISTS FOR. | A, measured |
| [E-235](../../../CLAIMS.md#L295) | Established | ROUND TWO'S HEADLINE: THE TWO GATES ROUND ONE BUILT OR EXTENDED BOTH FALSE-PASSED — THE SEVENTH AND EIGHTH INSTANCES, WRITTEN IN THE ROUND THAT WAS… | A, measured |
| [E-236](../../../CLAIMS.md#L296) | Established | A COUNT CORRECTED IN ROUND ONE WAS ALREADY FALSE IN THE COMMIT THAT CORRECTED IT — SIXTEENTH INSTANCE, INSIDE THE FIX FOR THE FIFTEENTH. | A, measured |
| [E-239](../../../CLAIMS.md#L299) | Established | THE PUBLICATION ROTATION FOUND THE ENTRY POINTS HONEST AND THE INTERIOR NOT — AND IT RETRACTED THE ADJUDICATOR'S OWN ACCEPTED RECOMMENDATION. | A, measured |
| [E-242](../../../CLAIMS.md#L302) | Established | A REVIEW PACKET CALLED A PUBLISHED CRYPTOGRAPHY PAPER *"BROKEN"* AND THE FINDING DOES NOT SUPPORT IT. | A, measured |
| [E-246](../../../CLAIMS.md#L306) | Established | REVIEW-040 — FOUR LEGS ON THE BRANCH THAT FIXED E-243, AND THE WORST FINDING IS THAT THE JUSTIFICATION FOR ITS MAIN DESIGN DECISION CAME FROM AN… | A, measured |
| [E-247](../../../CLAIMS.md#L307) | Established | REVIEW-041 — ROUND TWO, TWO EXTERNAL LEGS, AND THE HEADLINE IS A FALSE PREMISE THE GATE WAS BUILT ON. IN A GFM TABLE A PIPE IS A CELL DELIMITER EVEN… | A, measured |
| [E-248](../../../CLAIMS.md#L308) | Established | REVIEW-042 — ROUND THREE, RUN AGAINST GITHUB'S OWN PARSER, AND IT FOUND THAT ROUND TWO'S GFM FIX WAS ITSELF WRONG ABOUT ESCAPES. | A, measured |
| [E-255](../../../CLAIMS.md#L315) | Established | The five grades REVIEW-040 upheld were audited against their own evidence cells, and one kind was wrong. | A, source |
| [E-258](../../../CLAIMS.md#L318) | Established | REVIEW-043 found five defects in the emphasis gate and its harness, and the sharpest is that the harness could not tell a crash from a verdict. | A, measured |
| [E-259](../../../CLAIMS.md#L319) | Established | REVIEW-044, round two, three legs with differed packets: the fixes carried a live false-pass, one defect a fix INTRODUCED, and a sentence that was… | A, measured |
| [E-260](../../../CLAIMS.md#L320) | Established | REVIEW-044's own fix for false-passing probes false-passed, and testing the fix is what found it. | A, measured |
| [E-261](../../../CLAIMS.md#L321) | Established | REVIEW-045, round three: the hand-written block splitter FALSE-PASSED six real over-800-character paragraphs, and the fix is a design change rather… | A, measured |
| [E-264](../../../CLAIMS.md#L324) | Established | The emphasis-gate rotation STOPS at three rounds, which departs from CLAUDE.md's rule, and the owner ruled it on 2026-09-09. | A, reasoned |
| [E-271](../../../CLAIMS.md#L331) | Established | An external review of this session's own work upheld five findings, and the sharpest refuted a row written the day before. | A, measured |
| [E-272](../../../CLAIMS.md#L332) | Established | Round two on the same work: the concurrency lock was wrong TWICE, and a retired sentence came back because a GENERATOR emits it. | A, measured |
| [E-290](../../../CLAIMS.md#L350) | Established | The custody decision request priced the wrong set of credentials, and its first review round of its own withdrew its recommendation. | A, source; the lock… |
| [E-292](../../../CLAIMS.md#L352) | Established | Two records in the custody material did not reproduce, and the round's own self leg made the kind of error the round existed to catch. | A, measured |
| [E-295](../../../CLAIMS.md#L355) | Established | Round two on the custody fixes found no further power over the float, and its Codex leg disagreed. | A, source and measured… |
| [E-310](../../../CLAIMS.md#L370) | Established | REVIEW-048 reviewed E-296 to E-307 with three differed legs and upheld seventeen findings, rejected two and withdrew one — and the twelve rows'… | A, recorded |
| [E-311](../../../CLAIMS.md#L371) | Established | REVIEW-049, round two on REVIEW-048's fixes, upheld eight findings and its stopping condition fired: three were round-one findings the fixes had not… | A, recorded |
| [E-312](../../../CLAIMS.md#L372) | Established | REVIEW-050, the narrow third round the owner ruled, found five more surviving copies, all fixed, and the E-296 to E-307 rotation is CLOSED as ruled… | A, recorded |
| [E-318](../../../CLAIMS.md#L378) | Established | REVIEW-056 round one found 13 defects in make check-no-secrets, and the gate's own controls had caught none of them. | A, executed |
| [E-320](../../../CLAIMS.md#L380) | Established | REVIEW-056 round two found that three of round one's fixes covered their example and not their class, and that two fixes were pinned by nothing. | A, executed |
| [E-321](../../../CLAIMS.md#L381) | Established | REVIEW-056 round three, the last by the owner's ruling, found that four of round two's fixes still missed members of their class, and that the… | A, executed |
| [E-323](../../../CLAIMS.md#L383) | Established | REVIEW-057, one Codex leg on the phase 1 publication plan before any step ran, found that the plan as the owner ruled it could not produce what it… | A, measured |
| [E-325](../../../CLAIMS.md#L385) | Established | REVIEW-057 round two reviewed round one's fixes, the push guard and step 1's inventory, found 12 defects, four of them HIGH, and the guard and the… | A, measured |
| [E-326](../../../CLAIMS.md#L386) | Established | REVIEW-057 round three, the last plan round the owner's hook allows, broke the redesigned guard five more ways and the rebuilt inventory four, and… | A, measured |
| [E-328](../../../CLAIMS.md#L388) | Established | REVIEW-058 round one reviewed ADR-0004 with three differed legs and found its central sentence false, a gap in the facility's ledger reader, and two… | A, measured |
| [E-329](../../../CLAIMS.md#L389) | Established | REVIEW-058 round two reviewed round one's fixes and its stopping condition fired: three fixes had not discharged their findings, all found by the leg… | A, measured |
| [E-330](../../../CLAIMS.md#L390) | Established | REVIEW-058 round three, the last the owner's review policy allows, found six more defects in round two's fixes, and the rotation is closed with its… | A, measured |
| [B-24](../../../CLAIMS.md#L409) | Pending | REVIEW-031's fixes — the seed residue B-23 left, and the gate that could not see it. | BUILT 2026-08-28. The… |
| [B-25](../../../CLAIMS.md#L410) | Pending | REVIEW-032's fixes — the derived ElGamal secret, and the pin that did not pin. | BUILT 2026-08-28. The… |
| [B-26](../../../CLAIMS.md#L411) | Pending | REVIEW-033's fixes — the falsifier that was UB, and the gate's fourth round of false passes. | BUILT 2026-08-28. The… |
| [B-14](../../../CLAIMS.md#L423) | Pending | Where the transaction's own ECDSA signing nonce k comes from — a fifth randomness site, and no packet has covered it. RULED 2026-08-20 → E-109. Two… | RESOLVED → REVIEW-018-… |
| [F-20](../../../CLAIMS.md#L471) | Findings | REVIEW-012-RULING-keygen's domain-separation table named a label family that does not exist. | A |
