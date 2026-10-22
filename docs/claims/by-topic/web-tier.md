# Web tier

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

Architecture §6 step 8: the read-only Elysia/TanStack tier, its gate, and the boundary it does and does not move.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**24 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [E-150](../../../CLAIMS.md#L210) | Established | The facility was reviewed in two rounds and the loopback obligation it exists to keep was ESCAPABLE TWO WAYS — neither of them a defect in the check. | A, executed — the… |
| [E-212](../../../CLAIMS.md#L272) | Established | THE WEB TIER SHIPPED A DECRYPTION ORACLE, AND IT VIOLATED THE SCOPE THE SAME SESSION HAD WRITTEN HOURS EARLIER. | A, measured |
| [E-226](../../../CLAIMS.md#L286) | Established | THE STEP-8 GATE CARRIED TWO SOCKET DETECTORS THAT DISAGREED, AND THE NARROWER ONE WAS WIRED TO THE WHOLE-TIER PROPERTY — SIXTH INSTANCE OF A GATE… | A, measured |
| [E-228](../../../CLAIMS.md#L288) | Established | THE WEB TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY IN TWO PLACES, EACH WITH A COMMENT SAYING WHY — AND ADR-0003's FALSIFIER LIST HAD… | A, measured |
| [E-230](../../../CLAIMS.md#L290) | Established | ADR-0003's CENTRAL CLAIM WAS ADVERSARIALLY REVIEWED FOR THE FIRST TIME AND ALL FOUR LEGS RULED IT UNSOUND AS STATED. | A, executed |
| [E-231](../../../CLAIMS.md#L291) | Established | PART 6 CHECKED THE API'S BIND AND NOT THE DEV SERVER'S, AND THE DEV SERVER PROXIES /api — SO A 0.0.0.0 THERE WOULD HAVE PUBLISHED THE WHOLE API,… | A, measured |
| [E-234](../../../CLAIMS.md#L294) | Established | THE SOCKET FIX WAS WRITTEN AGAINST THE FINDING'S LIST RATHER THAN THE PROPERTY, THE DISCLOSURE GATE COULD NOT SEE THE RENDERED UI, AND THREE… | A, measured |
| [E-254](../../../CLAIMS.md#L314) | Established | CLAUDE.md said bun test web/api is 89 tests and it is 129. | A, measured |
| [E-322](../../../CLAIMS.md#L382) | Established | The README failed the owner's /claims-check on 2026-10-18 on claims that had gone stale, and the same stale claims stood on other surfaces, including… | A, read at source |
| [E-334](../../../CLAIMS.md#L394) | Established | Architecture §6 step 9 is built and gated but not deployed, and the browser check caught a policy the gate had passed. | A, measured |
| [E-337](../../../CLAIMS.md#L397) | Established | The owner named who acts when the demo goes down: the owner. | A, recorded |
| [E-340](../../../CLAIMS.md#L400) | Established | The owner reported the rest of the deploy setup: no Git repository is connected to the Vercel project, the toolbar is off, and the deploys ran on the… | A, recorded |
| [E-342](../../../CLAIMS.md#L402) | Established | The first review of step 9's build, REVIEW-059 round one, upheld 24 findings, and two would have let the release procedure publish what step 9… | A, measured |
| [E-343](../../../CLAIMS.md#L403) | Established | REVIEW-059 round one's fixes are built, and each new check was broken before it was believed; they are not yet reviewed, rebuilt from a public commit… | A, measured |
| [E-344](../../../CLAIMS.md#L404) | Established | Checked against each finding's own words rather than the adjudication's summary of it, four of E-343's fixes discharged half a finding, and the… | A, measured |
| [E-345](../../../CLAIMS.md#L405) | Established | REVIEW-059 round two found that five of round one's fixes did not discharge their findings, so its stopping condition fired and a third round is the… | A, measured |
| [E-346](../../../CLAIMS.md#L406) | Established | REVIEW-059 round two's fixes are built: each now runs its finding's own example and the next case in that example's class, and each check was broken… | A, measured |
| [E-347](../../../CLAIMS.md#L407) | Established | REVIEW-059 round three, run as the owner ruled on 2026-10-21, found three of round two's fixes still partial and two new browser gaps, and the… | A, measured |
| [E-348](../../../CLAIMS.md#L408) | Established | REVIEW-059 round three's fixes are built, each check broken before it was believed, and the rotation is closed, so no outside reader has seen them. | A, measured |
| [E-349](../../../CLAIMS.md#L409) | Established | The demo serves the reviewed build: PR #18 carried E-339 to E-348 to the public repository, the owner redeployed from 62fcac3, and when compared on… | A, measured |
| [E-350](../../../CLAIMS.md#L410) | Established | The hosted demo has an explainer, /how-it-works, and an overview that orients rather than lists; both were read twice before any deploy, and this row… | A for the build,… |
| [E-351](../../../CLAIMS.md#L411) | Established | The hosted demo has diagrams on all seven pages, read twice before any deploy, and this row records no deployment. | A for the build,… |
| [E-352](../../../CLAIMS.md#L412) | Established | The demo serves the explainer and its diagrams: PR #19 and PR #20 carried E-349 to E-351, R-7 and R-8 to the public repository, the owner deployed… | A, measured |
| [R-8](../../../CLAIMS.md#L517) | Retracted | web/api/capability.ts's wallet row and the wallet page: *"A confidential transaction needs the ElGamal secret and the account key"*, and *"needs two… | Found by REVIEW-061… |
