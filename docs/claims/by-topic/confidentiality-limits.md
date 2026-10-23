# Confidentiality limits

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

What this system does not hide: the counterparty graph, timing, and every claim the register forbids.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**41 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [P-1](../../../CLAIMS.md?plain=1#L22) | Prohibitions | That this work makes XRPL quantum-safe or quantum-resistant | It does not |
| [P-4](../../../CLAIMS.md?plain=1#L25) | Prohibitions | That a Confidential MPT demo hides identities | It hides amounts and… |
| [P-5](../../../CLAIMS.md?plain=1#L26) | Prohibitions | That anything here is trustless, non-custodial, decentralised, audited, production-ready or secure | None of it is;… |
| [P-6](../../../CLAIMS.md?plain=1#L27) | Prohibitions | That anything is compliant with regulation in a named jurisdiction | Not a compliance… |
| [P-7](../../../CLAIMS.md?plain=1#L28) | Prohibitions | That analysis of published work is original research | Cite Cenk, Malhotra,… |
| [P-9](../../../CLAIMS.md?plain=1#L30) | Prohibitions | That holders are private from the issuer | The issuer's decryptio… |
| [P-11](../../../CLAIMS.md?plain=1#L32) | Prohibitions | That confidential transfers hide *who* transacts, or *when*, or *how often* | Only amounts are… |
| [E-63](../../../CLAIMS.md?plain=1#L114) | Established | A passive full-ledger observer holding no keys recovered the difference between two confidential amounts, when the ElGamal encryption randomness r… | A, executed |
| [E-85](../../../CLAIMS.md?plain=1#L136) | Established | E-76 is closed: observer-harness.ts --assert-no-r-reuse has now been run against transactions this project's own code produced, and it passes. | A, executed |
| [E-86](../../../CLAIMS.md?plain=1#L137) | Established | The randomness ledger's records are checkable against the public ledger, and were checked. | A, executed |
| [E-120](../../../CLAIMS.md?plain=1#L171) | Established | ElGamalKeypair::from_parts accepted a public key that was not sk·G, and the failure it allowed is the worst one this protocol offers. | A, reasoned |
| [E-134](../../../CLAIMS.md?plain=1#L185) | Established | A confidential balance emptied by ConvertBack is NOT publicly identifiable as empty — and the balance that IS publicly zero on the same object is a… | B, executed — the… |
| [E-136](../../../CLAIMS.md?plain=1#L187) | Established | The Convert confirmation listed the BLINDING FACTOR as public and did not list the AMOUNT — which is the most consequential thing a Convert publishes. | A, executed |
| [E-205](../../../CLAIMS.md?plain=1#L265) | Established | A DOC COMMENT CALLED Request::Status A *"PUBLIC LEDGER READ"* AND IT READS NO LEDGER. | A, measured |
| [E-208](../../../CLAIMS.md?plain=1#L268) | Established | Architecture §6 step 8 is BUILT and its observer view was EXERCISED AGAINST LIVE DEVNET STATE — F-1 demonstrated rather than asserted. | A, measured |
| [E-211](../../../CLAIMS.md?plain=1#L271) | Established | A FALSE DISCLOSURE SENTENCE SHIPPED ON THE OBSERVER PAGE, AND IT IS F-24's SHAPE A THIRD TIME. | A, measured |
| [E-239](../../../CLAIMS.md?plain=1#L299) | Established | THE PUBLICATION ROTATION FOUND THE ENTRY POINTS HONEST AND THE INTERIOR NOT — AND IT RETRACTED THE ADJUDICATOR'S OWN ACCEPTED RECOMMENDATION. | A, measured |
| [E-240](../../../CLAIMS.md?plain=1#L300) | Established | THE Observed SECTION IS WITHHELD FROM THE PUBLIC TREE — RULED BY THE PROJECT OWNER 2026-09-05, REVERSING THIS PROJECT'S OWN EARLIER POSITION. | A, measured |
| [E-309](../../../CLAIMS.md?plain=1#L369) | Established | The owner ruled the shape of publication on 2026-09-22: a read-only hosted demo, a squashed public history, the four filings first, and everything… | A, recorded |
| [E-317](../../../CLAIMS.md?plain=1#L377) | Established | The phase 1 secret sweep is a gate, make check-no-secrets, and its first run found no stored secret, no credential and no non-public seed in the tree… | A, executed |
| [E-319](../../../CLAIMS.md?plain=1#L379) | Established | The four Devnet transactions the README offers a stranger can no longer be fetched from the public Devnet endpoint, and Devnet was not reset. | A, executed |
| [E-323](../../../CLAIMS.md?plain=1#L383) | Established | REVIEW-057, one Codex leg on the phase 1 publication plan before any step ran, found that the plan as the owner ruled it could not produce what it… | A, measured |
| [E-332](../../../CLAIMS.md?plain=1#L392) | Established | The public-update procedure ran the third-party inventory before git add, and the inventory reads only tracked files, so it passed on 9 projects… | A, measured |
| [E-339](../../../CLAIMS.md?plain=1#L399) | Established | The demo's shorter text is live: the owner redeployed from the public commit ccf76e7, and when compared on 2026-10-20 what Vercel served was byte for… | A, measured |
| [E-343](../../../CLAIMS.md?plain=1#L403) | Established | REVIEW-059 round one's fixes are built, and each new check was broken before it was believed; they are not yet reviewed, rebuilt from a public commit… | A, measured |
| [E-346](../../../CLAIMS.md?plain=1#L406) | Established | REVIEW-059 round two's fixes are built: each now runs its finding's own example and the next case in that example's class, and each check was broken… | A, measured |
| [E-349](../../../CLAIMS.md?plain=1#L409) | Established | The demo serves the reviewed build: PR #18 carried E-339 to E-348 to the public repository, the owner redeployed from 62fcac3, and when compared on… | A, measured |
| [E-350](../../../CLAIMS.md?plain=1#L410) | Established | The hosted demo has an explainer, /how-it-works, and an overview that orients rather than lists; both were read twice before any deploy, and this row… | A for the build,… |
| [E-352](../../../CLAIMS.md?plain=1#L412) | Established | The demo serves the explainer and its diagrams: PR #19 and PR #20 carried E-349 to E-351, R-7 and R-8 to the public repository, the owner deployed… | A, measured |
| [E-354](../../../CLAIMS.md?plain=1#L414) | Established | Both posts are drafted and read once, and neither is signed off or published. | A, read |
| [E-356](../../../CLAIMS.md?plain=1#L416) | Established | The demo serves R-9: PR #21 carried E-352 to E-355 and R-9 to the public repository, held the post drafts and their review records back as the owner… | A, measured |
| [B-22](../../../CLAIMS.md?plain=1#L429) | Pending | ~~The KEY-DERIVATION path leaves secret material unwiped, and B-21 deliberately did not cover it. sha512half is used for public transaction digests…~~ | 268 tests at B-22;… |
| [B-28](../../../CLAIMS.md?plain=1#L435) | Pending | Whether this repository becomes public, for what purpose, and in which form. | A ruling by the… |
| [F-1](../../../CLAIMS.md?plain=1#L471) | Findings | Docs claim the reset inbox value is indistinguishable; it is the canonical EncZero, recomputable by any observer from public inputs, and used on… | A |
| [F-9](../../../CLAIMS.md?plain=1#L479) | Findings | mpt-crypto's committed conan.lock ~~cannot be resolved from public remotes~~ does not resolve from conancenter, or from the remote rippled's setup… | A |
| [F-19](../../../CLAIMS.md?plain=1#L492) | Findings | mpt-crypto's exported PoK API makes account binding optional, and the public header does not say so. | A (E-162) |
| [F-16](../../../CLAIMS.md?plain=1#L494) | Findings | A LoanSet in which both parties signed the same pre-CounterpartySignature payload was accepted, first attempt. | A |
| [R-1](../../../CLAIMS.md?plain=1#L515) | Retracted | TASK ZERO §9 rev 1: the restructured facility "shows nothing about which supplier drew how much" | Found independently… |
| [R-5](../../../CLAIMS.md?plain=1#L520) | Retracted | TASK ZERO §9: the vault converts the whole facility float in one transaction | The retraction was… |
| [R-7](../../../CLAIMS.md?plain=1#L521) | Retracted | docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md, limit 1, and the README before 2026-10-19: a holder who converts in 500, receives nothing and… | The README's rewrite… |
| [R-9](../../../CLAIMS.md?plain=1#L523) | Retracted | The hosted explainer /how-it-works, README.md and WHAT-CONFIDENTIAL-MEANS, the last as *"the sentence to use"*: ~~*"it hides the shape of the book,…~~ | True as the register… |
