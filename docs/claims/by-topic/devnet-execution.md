# Devnet execution

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

What was actually submitted and validated on standard Devnet, and what a `tesSUCCESS` does and does not establish.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**53 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [P-2](../../../CLAIMS.md#L23) | Prohibitions | That an application-layer PQ scheme protects funds at the ledger level | An adversary who… |
| [E-25](../../../CLAIMS.md#L66) | Established | ConfidentialTransfer is not enabled on Mainnet as at 2026-08-16 | A |
| [E-26](../../../CLAIMS.md#L67) | Established | ConfidentialTransfer, PermissionedDomains and SingleAssetVault are all enabled on standard Devnet (network_id 2, rippled 3.3.0) as at 2026-08-16.… | A |
| [E-31](../../../CLAIMS.md#L72) | Established | mpt-crypto has a WASM build in CI (.github/workflows/build-wasm.yml, .github/scripts/build-wasm.sh) emitting dual CJS+ESM glue for web,node,… | A |
| [E-37](../../../CLAIMS.md#L83) | Established | fixCleanup3_1_3, fixCleanup3_2_0 and fixCleanup3_3_0 are all enabled on standard Devnet as at 2026-08-16T13:41Z. fixCleanup3_3_0 moves the… | A |
| [E-45](../../../CLAIMS.md#L96) | Established | The end-to-end client path works. A ConfidentialMPTConvert was constructed, proved, signed and accepted by standard Devnet from outside rippled's… | A |
| [E-46](../../../CLAIMS.md#L97) | Established | ripple-binary-codec@2.9.0 agrees with the node. | A |
| [E-49](../../../CLAIMS.md#L100) | Established | F-1 is now executed on-chain, not only read. | A |
| [E-58](../../../CLAIMS.md#L108) | Established | The auditor view is executed, not inferred. | A |
| [E-52](../../../CLAIMS.md#L110) | Established | The issuer-view claim is executed, not inferred. | A |
| [E-60](../../../CLAIMS.md#L111) | Established | A ConfidentialMPTSend whose sigma nonces this project derived — not mpt-crypto's — was accepted on Devnet. | A, executed |
| [E-63](../../../CLAIMS.md#L114) | Established | A passive full-ledger observer holding no keys recovered the difference between two confidential amounts, when the ElGamal encryption randomness r… | A, executed |
| [E-77](../../../CLAIMS.md#L128) | Established | The r/ρ randomness ledger is implemented against amendments A4–A9, with a falsifying test per amendment. | A, executed |
| [E-84](../../../CLAIMS.md#L135) | Established | A ConfidentialMPTSend built, proved and signed entirely by signer/ was accepted on Devnet. | A, executed |
| [E-86](../../../CLAIMS.md#L137) | Established | The randomness ledger's records are checkable against the public ledger, and were checked. | A, executed |
| [E-99](../../../CLAIMS.md#L150) | Established | tools/rebuild-env.sh restored an environment that could not rebuild a Devnet chain, and looked complete doing it. | A, executed |
| [E-100](../../../CLAIMS.md#L151) | Established | Architecture §6 step 2 is built: the signer reads the ledger itself, and the profile file no longer carries any ledger state. | A, executed |
| [E-101](../../../CLAIMS.md#L152) | Established | A ConfidentialMPTSend built, proved and signed entirely by signer/ *from ledger state the signer read for itself* was accepted on Devnet. | A, executed |
| [E-102](../../../CLAIMS.md#L153) | Established | A stale ledger read is now *detected*, not merely bounded — the signer re-reads after the human confirms and refuses if anything the transaction… | A, executed |
| [E-103](../../../CLAIMS.md#L154) | Established | Two "validated" reads seconds apart land in different ledgers, so a snapshot assembled from them is a state that never existed. | A, executed |
| [E-104](../../../CLAIMS.md#L155) | Established | Reading the balance from the ledger made the search bound load-bearing in a second place, and made one earlier test's scenario unreachable. | A, executed |
| [E-110](../../../CLAIMS.md#L161) | Established | B-15 ruled: one ledger endpoint stands for this artifact, as a NAMED RISK ACCEPTANCE, and the disclosure is a condition of the ruling rather than a… | A, executed |
| [E-118](../../../CLAIMS.md#L169) | Established | Architecture §6 step 6 is built: the ElGamal key is DERIVED from the master seed under the ruled construction, and the ledger holds the result. | A, executed |
| [E-119](../../../CLAIMS.md#L170) | Established | ADR-0001 §(e)'s only benefit is now EXECUTED rather than described: the seed alone reproduced the key the ledger holds. | A, executed |
| [E-131](../../../CLAIMS.md#L182) | Established | ConfidentialMPTConvertBack is BUILT AND EXECUTED — the facility's exit exists. | A, executed |
| [E-143](../../../CLAIMS.md#L194) | Established | Three harnesses that SUBMIT TO DEVNET were exempted from the ruled derivation on two successive false reasons, and the second was written to correct… | A, executed |
| [E-146](../../../CLAIMS.md#L197) | Established | Architecture §6 step 7 is BUILT AND EXECUTED — facility/, the receivables facility as application logic. | A, executed for… |
| [E-147](../../../CLAIMS.md#L198) | Established | EVERY plaintext transaction in the facility was submitted TWICE, and no test could see it. | A, reasoned |
| [E-148](../../../CLAIMS.md#L199) | Established | B-15 Option A's real cost is a FULL DEVNET SYNC, and there is no rehearsal network. Measured, not estimated. | A, executed — the… |
| [E-149](../../../CLAIMS.md#L209) | Established | fail_hard on the submit RPC is what sets TapFailHard, and a tec under it is discarded and never relayed. READ AT SOURCE AND NOT EXECUTED — EXECUTED… | A, executed — and… |
| [E-152](../../../CLAIMS.md#L212) | Established | REVIEW-023 reviewed the accepted-risk hatch, the post-execution fixes and the executed claims — seven findings, all upheld, none stale — and FOUR of… | A, executed — the… |
| [E-163](../../../CLAIMS.md#L223) | Established | B-16 is BUILT AND EXECUTED — the ed25519 signing nonce is hedged on the DEFAULT path. | A, executed |
| [E-169](../../../CLAIMS.md#L229) | Established | FOUR DOCUMENTS CITED A DEVNET TRANSACTION THAT NO COMMITTED RECEIPT RECORDS. | A, source (E-244,… |
| [E-176](../../../CLAIMS.md#L236) | Established | B-21's default signing path is EXECUTED on Devnet, and the receipt was written before the prose. | A, executed (E-244) |
| [E-205](../../../CLAIMS.md#L265) | Established | A DOC COMMENT CALLED Request::Status A *"PUBLIC LEDGER READ"* AND IT READS NO LEDGER. | A, measured |
| [E-208](../../../CLAIMS.md#L268) | Established | Architecture §6 step 8 is BUILT and its observer view was EXERCISED AGAINST LIVE DEVNET STATE — F-1 demonstrated rather than asserted. | A, measured |
| [E-289](../../../CLAIMS.md#L349) | Established | The repository's history carries none of the 19 live Devnet secret values held outside the tree, and it does carry every row the 2026-09-05 ruling… | A on the named… |
| [E-305](../../../CLAIMS.md#L365) | Established | F-16 is overtaken upstream, and Devnet now refuses the construction it recorded. | A, executed |
| [E-307](../../../CLAIMS.md#L367) | Established | F-21's refusal still reproduces on Devnet, but its headline is too broad, because xrpl.org states the rule and lists Devnet. | A, executed |
| [E-310](../../../CLAIMS.md#L370) | Established | REVIEW-048 reviewed E-296 to E-307 with three differed legs and upheld seventeen findings, rejected two and withdrew one — and the twelve rows'… | A, recorded |
| [E-319](../../../CLAIMS.md#L379) | Established | The four Devnet transactions the README offers a stranger can no longer be fetched from the public Devnet endpoint, and Devnet was not reset. | A, executed |
| [E-328](../../../CLAIMS.md#L388) | Established | REVIEW-058 round one reviewed ADR-0004 with three differed legs and found its central sentence false, a gap in the facility's ledger reader, and two… | A, measured |
| [B-30](../../../CLAIMS.md#L427) | Pending | Anything about what the Sherlock XRP Ledger Attackathon found | NOT OBTAINABLE, and… |
| [B-15](../../../CLAIMS.md#L433) | Pending | AMENDED AGAIN 2026-08-25 → E-151: the named risk acceptance is EXTENDED to the facility's Devnet demo, because Option A turned out not to be payable… | RESOLVED → REVIEW-019-… |
| [B-16](../../../CLAIMS.md#L434) | Pending | The ed25519 signing nonce — B-14's other half, and the LIVE path. RULED 2026-08-27 → E-158. BUILT AND EXECUTED the same day → E-163. RULED AND NOT… | CLOSED as a build →… |
| [B-2](../../../CLAIMS.md#L439) | Pending | "ConfidentialTransfer is not enabled on Mainnet" | RESOLVED 2026-08-16 →… |
| [B-3](../../../CLAIMS.md#L440) | Pending | "The Confidential Devnet has ConfidentialTransfer, PermissionedDomains and SingleAssetVault enabled" | RESOLVED 2026-08-16 →… |
| [F-2](../../../CLAIMS.md#L462) | Findings | Spec §13.2.2's "separate view keys" have no ledger field. Protocol layer: issuer keys are permanent. Operational layer: an issuer choosing Mechanism… | A / B |
| [F-25](../../../CLAIMS.md#L475) | Findings | tapFailHard cannot be bound into a transaction. It is a submission-time choice, and only the submitter can make it. | A (E-162) |
| [F-28](../../../CLAIMS.md#L478) | Findings | tapFailHard stops a tec reaching the LEDGER. It does not stop the ciphertext reaching the NODE you submitted to — and under a remote ledger source… | A on the reading, NOT… |
| [F-23](../../../CLAIMS.md#L479) | Findings | A wrong ledger read is a CONFIDENTIALITY break, not a rejected transaction — and the signer cannot control which. | A, executed |
| [F-22](../../../CLAIMS.md#L480) | Findings | This project's own signer built a four-participant proof and serialised three ciphertexts, and no test or Devnet run could see it. | A (E-162) |
| [F-21](../../../CLAIMS.md#L481) | Findings | Devnet rejects a transaction that carries an explicit NetworkID, and nothing a signer author reads says which networks those are the codec's… | A, executed (E-162) |
