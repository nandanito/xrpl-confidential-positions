# REVIEW-039c — the RippleX reader (what is unfair or wrong about our work)

- **Rotation:** `REVIEW-039` — the publication rotation
- **Date:** 2026-09-04
- **Subject:** the repository as a PUBLIC artifact, at `7d7149c`
- **Access:** FULL REPOSITORY, read-only.
- **Packet:** `docs/reviews/REVIEW-039-packets/packet-c-rippex-reader.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-039d`.**

---

## UNFAIR — reads as accusation, needs re-framing

- The treatment of `rippled#8118` implies a contributor closed it because the filing was defective, although there was no comment establishing a reason. The sharpest version says the false central claim was followed by “a core contributor **closed it without comment**” (`docs/UPSTREAM-FILING-PROTOCOL.md:87-91`). `CLAIMS.md:287` goes further by naming `mvadari` and saying the filing’s presentation was “consistent with a silent close.” With no explanation from the closer, that is motive-by-juxtaposition. Report only the status and timeline; omit the person and any inferred reason. The protocol itself correctly says non-response “is not evidence of anything, in either direction” at `docs/UPSTREAM-FILING-PROTOCOL.md:154-156`.

- The public explainer crosses from defining scope into accusing the protocol’s name of overpromising: “the name promises more than the protocol delivers” (`docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md:11-13`) and “a good deal less than ‘confidential positions’ sounds like” (`…:132-136`). XLS-0096 expressly documents its public information. The technically fair formulation is “confidentiality covers holder balances and Send amounts, not identities or conversion amounts.” Likewise, “the counterparty with the most reason to look” (`…:122-126`) assigns motive to issuers where “the issuer necessarily has decryption capability” would state the fact.

- Calling vault behavior an error with “the wrong cause” assumes the very composability policy the project says remains unresolved. The filing shows that 700 public units deposit successfully while 150 confidential units remain usable through confidential transactions (`docs/upstream-filings/2026-08-26/06-standards-composability.md:14-20`). In that design, `tecINSUFFICIENT_FUNDS` can accurately mean insufficient eligible public funds. The filing later admits, “I genuinely do not know which of those you want” (`…:48`). Until intent is established, call this an undifferentiated or unhelpful error, not a wrong one. The same issue affects U‑31’s headline, “names the wrong cause” (`UPSTREAM-FEEDBACK.md:196`).

- Some internal review language is technically grounded but unsuitable for public release. “The paper … is broken” and fresh entropy “papers over this” (`docs/reviews/REVIEW-005b-ruling-cryptography-leg-B-2026-08-17.md:33`) imply concealment or general unsoundness when the actual finding concerns Remark 6.1’s justification. “Remark 6.1 omits context from its uniqueness argument” is sufficient. “Guilty until proven innocent” (`docs/reviews/REVIEW-008-crypto-packet-2026-08-17.md:44`) is understandable as an internal testing stance but theatrical in a public technical record.

- `REVIEW-003a` accuses the project’s own author of an “Incentive to Manufacture Upstream Bugs” and of trying “to justify the session’s labor” (`docs/reviews/REVIEW-003a-gemini-2026-08-17.md:54-59`). That is an allegation of bad faith, not a technical diagnosis. Its underlying criticism—U‑24 overstates partial interoperability as total non-composability—is useful without speculating about motive.

- Several Observed rows inflate otherwise useful notes:

  - U‑20 says its build problem is “the first thing **every** new contributor hits,” despite requiring reproduction on a second machine (`UPSTREAM-FEEDBACK.md:174`).
  - U‑21 calls one parameter “the single most consequential” and a requirement on “every integrator” (`…:175`).
  - U‑25 says `tefBAD_AUTH` is “the only signal” without recording the corpus search (`…:184`).
  - U‑42 says “nothing says” whether `account_flags` is stable and “not stated anywhere we found,” again without the recorded search (`…:209`).

  These are not established falsehoods, but they should be questions or scoped observations rather than universal claims.

## WRONG — factually incorrect about RippleX work, needs correction

- Two known-false claims remain live in the supposedly verified part of `UPSTREAM-FEEDBACK.md`:

  - U‑12 still says the auditor property “is not called out as a selling point anywhere I found” (`UPSTREAM-FEEDBACK.md:151`). The project’s correction acknowledges XLS-0096 states it twice and that one passage gives “the exact benefit I presented as something I had worked out” (`docs/upstream-filings/2026-08-26/correction-8118.md:3-10`). The row must be corrected inline, not merely contradicted 77 lines earlier.
  - U‑51 remains grade A and praises §13.1’s public/hidden structure, including its “currency code” entry (`UPSTREAM-FEEDBACK.md:143`). The filed correction withdraws that item because confidential MPT transactions have no currency field and because “Holder balances” is stated too broadly (`docs/upstream-filings/2026-08-26/correction-8118.md:16-21`). U‑51 should be marked withdrawn or replaced with narrower praise.

- U‑38 and U‑44 rediscover an item already in the Trail of Bits report. U‑38 treats TOB-RIPCTX-3 as merely “adjacent” and says the audit still needs checking (`UPSTREAM-FEEDBACK.md:202`); U‑44 repeats the NULL-context concern (`…:211`). But this repository’s own cryptography review explicitly records: “Contrast TOB Appendix B, where `context_id == NULL` is silently accepted and omitted from the hash” (`docs/reviews/REVIEW-005b-ruling-cryptography-leg-B-2026-08-17.md:283`). The underlying API observation is valid; presenting it as unowned upstream feedback is wrong. It should be an audit-remediation status check with Trail of Bits credited.

- U‑24’s categorical statement that `LendingProtocol` and `ConfidentialTransfer` are “silently non-composable” is too broad (`UPSTREAM-FEEDBACK.md:183`). The project’s own execution establishes partial composition: public balances enter vaults and the confidential balance remains usable (`docs/upstream-filings/2026-08-26/06-standards-composability.md:14-20`). The correct finding is: “vault and lending transactors do not consume confidential balances, and the specifications do not explain that boundary.”

- U‑48 contains a known-false attribution. It admits the premise that `r.devnet.rippletest.net` was “NAMED IN THE DOCUMENTATION” could not be established, then repeats in bold, unstruck, “The Devnet peer hub named in the documentation” (`UPSTREAM-FEEDBACK.md:215`). Retain the reachability observation if useful; delete or strike the documentation attribution.

- The archived filings preserve several factual errors. Their prominent correction banners are responsible provenance, but the originals are not independently publishable:

  - The EncZero filing claimed all three call sites contained a determinism comment (`docs/upstream-filings/2026-08-26/01-devportal-enczero.md:41-45`); Clawback did not (`correction-3879.md:3-9`).
  - The errata filing said the view-key mechanism had “no corresponding ledger field” (`02-standards-errata.md:34-40`); it uses the existing issuer key (`correction-608.md:3-9`). It also wrongly called §13.1 ambiguous (`correction-608.md:11`).
  - The failed-proof filing repeatedly used the nonexistent API name `tapFailHard` (`03-standards-tecbadproof.md:24`, `:40-46`); the names are `fail_hard` and `TapFailHard` (`correction-609.md:3-10`).
  - The positives filing said none of its items was advertised (`05-rippled-positives.md:8`) and repeated the false absence in item 1 (`…:22`). It also credited `credentials::valid` as an independently discovered design virtue even though it was TOB-RIPCTX-14 remediation (`correction-8118.md:12`).

- The deletion filing still presents upstream intent as unresolved: deleting and recreating a holding “is a question for the authors” (`04-standards-deletion.md:64`) and the disclosure says the sequence was not executed (`…:76`). The repository later found upstream tests deliberately pin both behaviors and concluded the defect is only §7.4’s wording (`UPSTREAM-FEEDBACK.md:142`). Unlike the other corrected originals, this file has no correction banner; the archive README merely mentions a follow-up at `docs/upstream-filings/2026-08-26/README.md:38-39`.

- There is no upstream response quoted incorrectly: the record says there were no substantive maintainer responses. What is wrong is converting that silence into an explanation of why an issue was closed.

## FAIR AND FINE — labelled, evidenced, publishable as-is

- The EncZero core finding is fair. It distinguishes intentional deterministic zero from misleading documentation and scopes the exception correctly: ConvertBack-zeroed spending balances are randomized, while canonical zeros are identifiable (`docs/upstream-filings/2026-08-26/01-devportal-enczero.md:53-59`).

- The surviving specification errata are concrete and mechanical: nonexistent `RevealedAmount`, contradicted clawback destination, unreproducible timing conditions, and numbering defects (`UPSTREAM-FEEDBACK.md:115-119`, `:167`). These criticize text, not people.

- The executed `tecBAD_PROOF` result is strong and useful. It supplies a validated ledger, transaction hash, byte-identical ciphertext, successful recovery of 42 by the substituted-key holder, and failure by the intended destination (`UPSTREAM-FEEDBACK.md:208`). After replacing `tapFailHard`, it is fair to request a security-considerations note.

- U‑28 is exemplary: it reports only two tested emsdk versions and explicitly refuses to extrapolate a version range (`UPSTREAM-FEEDBACK.md:192`). U‑29 similarly confines itself to a naming problem and says, “Do not file this as a security issue” (`…:193`).

- U‑30 records both its search and its limitation—another test may use different vocabulary (`UPSTREAM-FEEDBACK.md:194`). That is an honestly labelled negative claim.

- U‑33’s missing `range_low` API observation, U‑34’s EncZero WASM-export request, and U‑36’s stale Rust binding evidence are specific integration feedback with counterarguments and bounded consequences (`UPSTREAM-FEEDBACK.md:197-200`).

- U‑35’s paper correction is technically fair because it explicitly says “The implementation is fine” (`UPSTREAM-FEEDBACK.md:195`). Its separate optional-context request must, however, be attributed to the Trail of Bits appendix.

- U‑37’s reuse experiment is valuable: two accepted Sends, recovered amount difference from all participant ciphertexts, and an explicit statement that this is signer responsibility rather than a feasible ledger check (`UPSTREAM-FEEDBACK.md:201`). The documentation request is fair; deterministic derivation should remain a design proposal, not part of the finding.

- U‑39 carefully says the NetworkID rule is deliberate and documented elsewhere (`UPSTREAM-FEEDBACK.md:206`). U‑40 and U‑46 are particularly good positive feedback about cross-build verification and precise asymmetric API documentation (`…:207`, `:213`).

- U‑43 is a fair interoperability question because it expressly does not ask RippleX to adopt this repository’s derivation and asks whether derivation is intentionally out of scope (`UPSTREAM-FEEDBACK.md:210`). U‑47 also distinguishes what §10.7.2 actually gets right before asking for clarification (`…:214`).

- The best review documents are disciplined rather than contemptuous. `REVIEW-001` explicitly narrows EncZero from an alleged privacy weakness to documentation drift and says it “is not evidence that XLS-96 leaks more than its designers intended” (`docs/reviews/REVIEW-001-self-2026-08-13.md:30-40`). `REVIEW-005c` likewise says the upstream implementation is sound on the nonce-context axis (`docs/reviews/REVIEW-005c-adjudication-nonce-construction-2026-08-17.md:28-34`).

## THE 37 UNGRADED ROWS — a verdict on publishing them

First, the count is structurally misleading. There are 37 rows under `Observed`, but four are expressly filed and graded:

- U‑18: “promoted … with … grade A” (`UPSTREAM-FEEDBACK.md:167`)
- U‑24: “FILED” and reverified (`…:183`)
- U‑34: “FILED” (`…:197`)
- U‑41: “promoted … grade A, executed” (`…:208`)

So there are 37 rows in the section, but only 33 are ungraded.

| Verdict | Rows |
|---|---|
| Wrong or misattributed | U‑24, U‑38, U‑44, U‑48 |
| Fair core, but needs re-framing before public use | U‑20, U‑21, U‑25, U‑31, U‑35’s optional-context sub-ask, U‑37’s deterministic-API remedy, U‑42 |
| Fair as explicitly provisional notebook entries | U‑54, U‑53, U‑52, U‑16, U‑17, U‑18, U‑19, U‑22, U‑23, U‑26, U‑27, U‑28, U‑29, U‑30, U‑34, U‑33, U‑32, U‑36, U‑39, U‑40, U‑41, U‑43, U‑45, U‑46, U‑47, U‑49 |

The section label is not enough. The register promises that “Every entry carries … a grade and … source citation” and that ungraded items remain Observed (`UPSTREAM-FEEDBACK.md:9-12`); the README calls it “held to a higher evidence bar than anything published here” (`README.md:31`). Yet the checking tool deliberately exempts Observed as “ungraded and unresearched” (`tools/check-negative-claims.ts:39-45`).

Once the repository is public, definitive bold headlines such as “No XRPL browser wallet…,” “the only signal,” and “nothing says…” are published assertions regardless of the section heading. The heading therefore risks looking like cover: the project gets the reputational effect of an accusation while disclaiming that it has verified it.

I would not publish this section in its present form. Either keep it outside the public tree, or rewrite every live entry as a question with an observation date, tested scope, owner/venue, and explicit missing verification. Move the four filed rows out, and propagate corrections into the rows themselves.

## WHAT I WOULD WANT KEPT AND MADE PROMINENT

- The execution-backed `tecBAD_PROOF` disclosure finding. It is rare, reproducible protocol feedback with a transaction hash and demonstrated consequence (`UPSTREAM-FEEDBACK.md:208`).

- The EncZero observer work, especially its careful distinction between canonical zero and a randomized encryption of zero (`docs/upstream-filings/2026-08-26/01-devportal-enczero.md:47-59`).

- The narrow vault/lending result: public balances compose; confidential balances are ignored by those transactors; the specifications should state that compatibility boundary (`docs/upstream-filings/2026-08-26/06-standards-composability.md:14-20`, `:41-48`).

- The API and build friction that another integrator can immediately act on: U‑19, U‑28, U‑33, U‑34, U‑36, U‑39 and U‑45. These are far more useful than broad judgments because they identify an exact symbol, version, return code or missing parameter.

- The randomness-reuse experiment in U‑37, provided it is framed as signer guidance and not a ledger defect (`UPSTREAM-FEEDBACK.md:201`).

- The cross-implementation proof verification in U‑40 and precise ConvertBack documentation in U‑46 (`UPSTREAM-FEEDBACK.md:207`, `:213`). These are meaningful compliments, not padding.

- The project’s habit of publishing corrections and crediting prior work. The filing archive explicitly says originals are retained for provenance and must be read with their corrections (`docs/upstream-filings/2026-08-26/README.md:24-36`). The README credits the XLS authors, Tess Dore, Murat Cenk and Trail of Bits and says the project claims none of their work (`README.md:360-368`). Keep that prominently.

The public artifact RippleX would value is a curated conformance and integration report: executed transaction evidence, source-tagged divergences, reproducible tooling, narrow asks, positive implementation properties, and corrections adjacent to the claims they supersede. The raw accusatory notebook is not that report.
