# Protocol and cryptography

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

What XLS-0096 and the libraries actually do — field codes, sizes, proofs, encryption, the confidential balance model.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**165 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [P-3](../../../CLAIMS.md#L24) | Prohibitions | That any amendment is live or enabled, without a dated feature RPC check | Amendment state is a… |
| [P-4](../../../CLAIMS.md#L25) | Prohibitions | That a Confidential MPT demo hides identities | It hides amounts and… |
| [P-9](../../../CLAIMS.md#L30) | Prohibitions | That holders are private from the issuer | The issuer's decryptio… |
| [P-10](../../../CLAIMS.md#L31) | Prohibitions | That XLS-96 supports key rotation or key recovery | It supports neither,… |
| [P-11](../../../CLAIMS.md#L32) | Prohibitions | That confidential transfers hide *who* transacts, or *when*, or *how often* | Only amounts are… |
| [P-12](../../../CLAIMS.md#L33) | Prohibitions | Any claim that a source does NOT say something — *nothing documents it*, *no such field*, *not exported*, *nobody has called it out*, *I could not… | It is an assertion… |
| [E-1](../../../CLAIMS.md#L41) | Established | XLS-0096 authors: Cenk, Malhotra, Akinyele, Chen, Xie, Qian; status Draft, created 2026-01-15. Superseded upstream on 2026-09-03. XLS-0096 PR #604,… | A |
| [E-2](../../../CLAIMS.md#L42) | Established | Transaction types 85 Convert, 86 MergeInbox, 87 ConvertBack, 88 Send, 89 Clawback | A |
| [E-3](../../../CLAIMS.md#L43) | Established | The Send ZKProof is a fixed-length bundle of a compact sigma proof plus an aggregated Bulletproof, enforced at preflight | A |
| [E-3a](../../../CLAIMS.md#L44) | Established | Those components are 192 B and 754 B, totalling 946 B | A |
| [E-4](../../../CLAIMS.md#L45) | Established | Total Send payload is 1210 B without an auditor and 1276 B with one — both now MEASURED. The conflicting 1177 B is wrong for the wire | A on both figures,… |
| [E-5](../../../CLAIMS.md#L46) | Established | A confidential transaction costs exactly 10× the network's standard base fee. | A on the ratio,… |
| [E-6](../../../CLAIMS.md#L47) | Established | kTxMaxSizeBytes = megabytes(1) — size is not a binding constraint | A |
| [E-7](../../../CLAIMS.md#L48) | Established | Confidential MPTs are incompatible with a non-zero TransferFee | A |
| [E-8](../../../CLAIMS.md#L49) | Established | Confidential MPTs cannot be used with the DEX, escrow or checks | A |
| [E-9](../../../CLAIMS.md#L50) | Established | Holder, issuer and auditor encryption keys cannot be rotated once registered | A |
| [E-10](../../../CLAIMS.md#L51) | Established | A holder who loses their ElGamal key permanently loses access | A |
| [E-11](../../../CLAIMS.md#L52) | Established | Only one auditor is supported | A |
| [E-12](../../../CLAIMS.md#L53) | Established | Clawback burns the entire balance, decrementing both OA and COA, crediting no account | A |
| [E-13](../../../CLAIMS.md#L54) | Established | ~~xrpl.js@5.0.0 and ripple-binary-codec@2.8.0 contain no Confidential MPT types or fields~~ SUPERSEDED 2026-08-16 → E-30. True of the versions named;… | A |
| [E-14](../../../CLAIMS.md#L55) | Established | mpt-crypto is C/C++; 0.4.0-rc4 in rippled 3.3.0. ~~no bindings, no WASM target, no published package~~ PARTLY SUPERSEDED 2026-08-16 → E-31. A WASM… | A |
| [E-15](../../../CLAIMS.md#L56) | Established | MPTokensV2 (XLS-82 MPT DEX) is Supported::No in 3.3.0 | A |
| [E-16](../../../CLAIMS.md#L57) | Established | SmartEscrow (XLS-100) is absent from features.macro in 3.3.0 | A |
| [E-17](../../../CLAIMS.md#L58) | Established | When set, sfDomainID on the MPTokenIssuance gates confidential transfers, checked by requireAuth on both sender and destination | A |
| [E-18](../../../CLAIMS.md#L59) | Established | An MPToken cannot be deleted once confidential fields are initialised, even at zero balance. Superseded upstream on 2026-09-03. XLS-0096 PR #604… | A |
| [E-19](../../../CLAIMS.md#L60) | Established | Writing sfDomainID requires both PermissionedDomains and SingleAssetVault enabled | A |
| [E-20](../../../CLAIMS.md#L61) | Established | The issuer can unilaterally clear sfDomainID, removing the domain gate without holder consent | A |
| [E-21](../../../CLAIMS.md#L62) | Established | Clawback requires lsfMPTCanClawback on the issuance; without it, tecNO_PERMISSION | A |
| [E-23](../../../CLAIMS.md#L63) | Established | ~~ElGamal decryption bounded at 1,000,000; above that permanently undecryptable through the API~~ CORRECTED 2026-08-16 — see F-7. Decryption… | A |
| [E-22](../../../CLAIMS.md#L64) | Established | (a) A ConfidentialMPTSend of zero is valid. (b) It is indistinguishable from a non-zero send — survived THREE falsification checks under a controlled… | (a) A, executed. (b)… |
| [E-24](../../../CLAIMS.md#L65) | Established | On Apple M3 Pro / macOS 26.6.1 / Apple clang 21 / -O3 -DNDEBUG, aggregated Bulletproof (m=2) proving median 34.583 ms, verification median 16.100 ms,… | A |
| [E-25](../../../CLAIMS.md#L66) | Established | ConfidentialTransfer is not enabled on Mainnet as at 2026-08-16 | A |
| [E-26](../../../CLAIMS.md#L67) | Established | ConfidentialTransfer, PermissionedDomains and SingleAssetVault are all enabled on standard Devnet (network_id 2, rippled 3.3.0) as at 2026-08-16.… | A |
| [E-27](../../../CLAIMS.md#L68) | Established | mpt-crypto 0.4.0-rc4 (the version rippled 3.3.0 pins), 1.0.0 and 1.0.1 are the same commit, 48a3cfe4be2122b77c2baec079353c5d35cce785 | A |
| [E-28](../../../CLAIMS.md#L69) | Established | mpt-crypto builds clean and 11/11 tests pass on macOS 26.6.1 / arm64 / Apple clang 21, in 6.20 s — after adding the Ripple Conan remote | A |
| [E-29](../../../CLAIMS.md#L70) | Established | All seven proof-size constants are identical at 0.4.0-rc4 and 1.0.4: pubkey 33, ElGamal total 66, single BP 688, double BP 754, sigma standard 192,… | A |
| [E-30](../../../CLAIMS.md#L71) | Established | ripple-binary-codec@2.9.0 (2026-08-13) ships Confidential MPT serialisation. | A |
| [E-31](../../../CLAIMS.md#L72) | Established | mpt-crypto has a WASM build in CI (.github/workflows/build-wasm.yml, .github/scripts/build-wasm.sh) emitting dual CJS+ESM glue for web,node,… | A |
| [E-32](../../../CLAIMS.md#L73) | Established | ~~The @xrplf/mpt-crypto npm package referenced by that build script is not published as at 2026-08-16~~ | Superseded |
| [E-33](../../../CLAIMS.md#L74) | Established | Generating a ConfidentialMPTSend proof requires the sender's ElGamal secret key sk_A as a witness. | A |
| [E-34](../../../CLAIMS.md#L75) | Established | Nonce reuse in a compact-form sigma proof leaks sk_A, and is undetectable from the proofs. | A |
| [E-35](../../../CLAIMS.md#L76) | Established | Compact-form proofs cannot be batch-verified — commitments are reconstructed per-proof from each proof's own challenge, leaving no cross-proof linear… | A |
| [E-36](../../../CLAIMS.md#L77) | Established | XLS-96 deliberately rejected twisted ElGamal. Under compact form its size advantage shrinks from 292 B to an irreducible 64 B — structural, arising… | A |
| [E-37](../../../CLAIMS.md#L83) | Established | fixCleanup3_1_3, fixCleanup3_2_0 and fixCleanup3_3_0 are all enabled on standard Devnet as at 2026-08-16T13:41Z. fixCleanup3_3_0 moves the… | A |
| [E-38](../../../CLAIMS.md#L84) | Established | A vault share MPT can never carry lsfMPTCanHoldConfidentialBalance. VaultCreate builds the share flags itself from two tx flags, and there is no… | A |
| [E-39](../../../CLAIMS.md#L85) | Established | A pseudo-account can never hold a confidential balance. | A |
| [E-40](../../../CLAIMS.md#L86) | Established | Nothing rejects a confidential-capable MPT as a vault asset | A — restored 2026-08-1… |
| [E-41](../../../CLAIMS.md#L87) | Established | Vault, loan-broker and AMM pseudo-accounts are exempt from XLS-80 domain validation for MPTs they hold. Observed custodying 600 units of a… | A |
| [E-42](../../../CLAIMS.md#L88) | Established | Revoking a domain credential traps a vault position rather than recovering it: VaultWithdraw → tecNO_AUTH while the pseudo-account keeps custody.… | A |
| [E-43](../../../CLAIMS.md#L89) | Established | XLS-66 models a fixed-term amortising loan with one disbursement at origination. No revolving drawdowns. revolv and drawdown appear zero times in the… | A |
| [E-44](../../../CLAIMS.md#L90) | Established | Neither XLS-0065 nor XLS-0066 mentions confidential balances, encryption or XLS-96 — zero occurrences of confidential, encrypt, XLS-96, XLS-0096 in… | A |
| [E-45](../../../CLAIMS.md#L96) | Established | The end-to-end client path works. A ConfidentialMPTConvert was constructed, proved, signed and accepted by standard Devnet from outside rippled's… | A |
| [E-47](../../../CLAIMS.md#L98) | Established | mpt-crypto's WASM build works end to end and agrees bit-for-bit with a native build | A |
| [E-48](../../../CLAIMS.md#L99) | Established | mpt-crypto's sigma nonces are hedged, not deterministic. | A on the construction… |
| [E-50](../../../CLAIMS.md#L101) | Established | GAP-9 closed. A confidential balance is invisible to XLS-65 vault accounting, and the error misattributes the cause. | A |
| [E-51](../../../CLAIMS.md#L102) | Established | A three-participant ConfidentialMPTSend writes 1219 B or 1225 B of metadata against kOversizeMetaDataCap = 5200 — not a constant. Corrected… | A |
| [E-53](../../../CLAIMS.md#L103) | Established | @xrplf/mpt-crypto@0.1.0 is published and it works. | A, executed |
| [E-55](../../../CLAIMS.md#L105) | Established | Under WASM, sigma-proof randomness comes from the host. | A |
| [E-58](../../../CLAIMS.md#L108) | Established | The auditor view is executed, not inferred. | A |
| [E-52](../../../CLAIMS.md#L110) | Established | The issuer-view claim is executed, not inferred. | A |
| [E-60](../../../CLAIMS.md#L111) | Established | A ConfidentialMPTSend whose sigma nonces this project derived — not mpt-crypto's — was accepted on Devnet. | A, executed |
| [E-62](../../../CLAIMS.md#L113) | Established | The nonce construction reproduces from its own prose, and draws no entropy through the tree's only entropy route. | A, executed, scoped… |
| [E-63](../../../CLAIMS.md#L114) | Established | A passive full-ledger observer holding no keys recovered the difference between two confidential amounts, when the ElGamal encryption randomness r… | A, executed |
| [E-65](../../../CLAIMS.md#L116) | Established | Deterministic Bulletproof blinding is reachable by the same Path A move, and needs no new information from the caller. | B — read, not executed |
| [E-66](../../../CLAIMS.md#L117) | Established | The XLS-96 registration PoK IS bound to the account, so a registration proof is not copyable to another account. Issue #4 closed, and §(b)'s… | A, read |
| [E-67](../../../CLAIMS.md#L118) | Established | XLS-0096 nowhere states that the ElGamal encryption randomness r must not be reused across transactions. The specification is SILENT, and that is a… | A on the read, with… |
| [E-68](../../../CLAIMS.md#L119) | Established | The keygen construction reproduces from its own prose, by two implementations, and its test is not a false pass. | A on reproduction,… |
| [E-77](../../../CLAIMS.md#L128) | Established | The r/ρ randomness ledger is implemented against amendments A4–A9, with a falsifying test per amendment. | A, executed |
| [E-80](../../../CLAIMS.md#L131) | Established | The vendored prover is wired into the signer, and the pristine upstream verifier accepts proofs the signer produces. | A, executed |
| [E-83](../../../CLAIMS.md#L134) | Established | XRPL serialisation and signing are implemented in the signer and pinned byte-for-byte against three implementations this project did not write. | A, executed |
| [E-84](../../../CLAIMS.md#L135) | Established | A ConfidentialMPTSend built, proved and signed entirely by signer/ was accepted on Devnet. | A, executed |
| [E-89](../../../CLAIMS.md#L140) | Established | Step 3 was adversarially reviewed and the review found a defect that would have broken every Send on an auditor-enabled issuance. | A, executed |
| [E-91](../../../CLAIMS.md#L142) | Established | ParsedTransaction::parse ignored fields it did not recognise, while its own doc comment claimed it refused them — and one such field would have put a… | A, executed |
| [E-101](../../../CLAIMS.md#L152) | Established | A ConfidentialMPTSend built, proved and signed entirely by signer/ *from ledger state the signer read for itself* was accepted on Devnet. | A, executed |
| [E-104](../../../CLAIMS.md#L155) | Established | Reading the balance from the ledger made the search bound load-bearing in a second place, and made one earlier test's scenario unreachable. | A, executed |
| [E-109](../../../CLAIMS.md#L160) | Established | B-14 ruled and implemented: the transaction's ECDSA nonce is hedged, because the issue #1 ruling extends to it. | A, executed |
| [E-116](../../../CLAIMS.md#L167) | Established | An issuer cannot convert its own issuance into a confidential balance | A, source |
| [E-117](../../../CLAIMS.md#L168) | Established | Rejecting the XLS-65 Vault traded away a custody property, and ~~ADR-0002 does not say so~~ ADR-0002 has said so since c34dcec (E-256, E-295). | A, source on both… |
| [E-118](../../../CLAIMS.md#L169) | Established | Architecture §6 step 6 is built: the ElGamal key is DERIVED from the master seed under the ruled construction, and the ledger holds the result. | A, executed |
| [E-120](../../../CLAIMS.md#L171) | Established | ElGamalKeypair::from_parts accepted a public key that was not sk·G, and the failure it allowed is the worst one this protocol offers. | A, reasoned |
| [E-122](../../../CLAIMS.md#L173) | Established | A module header called the ECDSA nonce "unruled" for a full day after REVIEW-018 ruled it, in a file whose code had already been changed to hedge. | A, reasoned |
| [E-130](../../../CLAIMS.md#L181) | Established | Building ConfidentialMPTConvertBack made a documented refusal code UNREACHABLE, and the variant was removed rather than left in place. | A, executed |
| [E-131](../../../CLAIMS.md#L182) | Established | ConfidentialMPTConvertBack is BUILT AND EXECUTED — the facility's exit exists. | A, executed |
| [E-134](../../../CLAIMS.md#L185) | Established | A confidential balance emptied by ConvertBack is NOT publicly identifiable as empty — and the balance that IS publicly zero on the same object is a… | B, executed — the… |
| [E-135](../../../CLAIMS.md#L186) | Established | A test helper silently dropped every field it did not know about, and would have made the assertions built on it vacuous. | A, executed |
| [E-138](../../../CLAIMS.md#L189) | Established | parse enforced XLS-0096 §10.3's ALLOWLIST and not its REQUIREMENTS, and an allowlist cannot express either requiredness or length. | A, executed |
| [E-143](../../../CLAIMS.md#L194) | Established | Three harnesses that SUBMIT TO DEVNET were exempted from the ruled derivation on two successive false reasons, and the second was written to correct… | A, executed |
| [E-151](../../../CLAIMS.md#L211) | Established | B-15's step-7 answer was AMENDED by the project owner, and the amendment is recorded in code rather than only in prose. | A, reasoned |
| [E-158](../../../CLAIMS.md#L218) | Established | B-16 is RULED — the ed25519 signing nonce is hedged, and B-14 is now closed on both halves. | A, ruled → built |
| [E-163](../../../CLAIMS.md#L223) | Established | B-16 is BUILT AND EXECUTED — the ed25519 signing nonce is hedged on the DEFAULT path. | A, executed |
| [E-206](../../../CLAIMS.md#L266) | Established | D2's FOURTH REASON — *"the extension's codec does not know the XLS-0096 types, so it could not serialise a ConfidentialMPTSend"* — IS NOT… | A, measured |
| [E-207](../../../CLAIMS.md#L267) | Established | THE STEP-8 GATE'S FIRST RUN AGAINST THE REAL TREE CAUGHT PROSE, AND THE FIX IS A POLARITY DISTINCTION RATHER THAN AN EXEMPTION — E-203's LESSON ON A… | A, measured |
| [E-210](../../../CLAIMS.md#L270) | Established | The issuer view DECRYPTS, and the reason it did not was a comment that was wrong about its own repository. | A, measured |
| [E-212](../../../CLAIMS.md#L272) | Established | THE WEB TIER SHIPPED A DECRYPTION ORACLE, AND IT VIOLATED THE SCOPE THE SAME SESSION HAD WRITTEN HOURS EARLIER. | A, measured |
| [E-231](../../../CLAIMS.md#L291) | Established | PART 6 CHECKED THE API'S BIND AND NOT THE DEV SERVER'S, AND THE DEV SERVER PROXIES /api — SO A 0.0.0.0 THERE WOULD HAVE PUBLISHED THE WHOLE API,… | A, measured |
| [E-241](../../../CLAIMS.md#L301) | Established | THE ISSUER ROUTE IS RULED AND THE DISCLOSURE IS REMOVED RATHER THAN GUARDED — OPTION 2, 2026-09-05. | A, measured |
| [E-293](../../../CLAIMS.md#L353) | Established | The facility now writes its seeds, the issuer's secret and its book as 0600 files, and deletes each signer profile once the signer has read it — and… | A, measured |
| [E-296](../../../CLAIMS.md#L356) | Established | F-19's defect CLASS is not new. Trail of Bits' April 2026 report already raises it, the fix review does not track it, and upstream mpt-crypto has not… | A, read at source |
| [E-297](../../../CLAIMS.md#L357) | Established | F-8 is fixed in upstream's SOURCE TREE. The BSGS decrypt function mpt-crypto's documentation pointed to exists from tag 1.0.5, so on present evidence… | A, read at source;… |
| [E-299](../../../CLAIMS.md#L359) | Established | Three of the five mpt-crypto re-checks — F-7, F-12 and F-18, against F-9's and F-15's runs — are readings, not runs. F-7's and F-12's conditions are… | A, read at source;… |
| [E-300](../../../CLAIMS.md#L360) | Established | F-9 still reproduces at upstream HEAD, and it was run, but its shape has changed. The setup mpt-crypto's README links adds a remote without the… | A, executed |
| [E-301](../../../CLAIMS.md#L361) | Established | F-15's *"cannot be obtained from the published API at all"* is false for @xrplf/mpt-crypto 0.1.0 and 0.1.1. The package exports loadWasmModule, and… | A, executed |
| [E-303](../../../CLAIMS.md#L363) | Established | F-11 still holds at rippled develop, on reading. ConfidentialMPTClawback has no pseudo-account guard, and ordinary Clawback still has one. | A, read at source |
| [E-304](../../../CLAIMS.md#L364) | Established | F-13 still holds at both upstream HEADs, on reading, and XLS-0096's field layout matches rippled's rather than the paper's. | A, read at source;… |
| [E-306](../../../CLAIMS.md#L366) | Established | F-17 still holds at mpt-crypto 1.0.5, on reading, and so does its note that the implementation is not affected — on the utility path, and with a… | A, read at source |
| [E-313](../../../CLAIMS.md#L373) | Established | The four findings ruled to file all hold at upstream HEAD on 2026-09-22. F-9's remedy is a remote migration that clio and rippled made and mpt-crypto… | A, run and read |
| [E-314](../../../CLAIMS.md#L374) | Established | F-9 is filed as mpt-crypto#148, the first filing to run rule 1's review before it was sent. | A, run and read |
| [E-315](../../../CLAIMS.md#L375) | Established | F-17, F-12 and F-13 are filed, as mpt-crypto#153, #154 and #155, and the four findings ruled to file are all sent, which is phase 0's exit. | A, run and read |
| [E-316](../../../CLAIMS.md#L376) | Established | Four of the 2026-08-26 filings were resolved upstream in September, in the merged XLS-0096 and the docs page, and the register did not know until a… | A, read at source |
| [E-333](../../../CLAIMS.md#L393) | Established | vite's only root licence file aggregates the licences of everything it bundles and carries 35 personal email addresses, so a verbatim copy cannot… | A, measured |
| [E-336](../../../CLAIMS.md#L396) | Established | Architecture §6 step 9 is deployed, and when compared on 2026-10-20 what Vercel served was byte for byte what the gate passed. | A, measured |
| [E-339](../../../CLAIMS.md#L399) | Established | The demo's shorter text is live: the owner redeployed from the public commit ccf76e7, and when compared on 2026-10-20 what Vercel served was byte for… | A, measured |
| [E-341](../../../CLAIMS.md#L401) | Established | The filings were re-surveyed at source on 2026-10-20 before either post is drafted, and two things E-316 did not record were found: the Japanese copy… | A, read at source |
| [E-349](../../../CLAIMS.md#L409) | Established | The demo serves the reviewed build: PR #18 carried E-339 to E-348 to the public repository, the owner redeployed from 62fcac3, and when compared on… | A, measured |
| [E-352](../../../CLAIMS.md#L412) | Established | The demo serves the explainer and its diagrams: PR #19 and PR #20 carried E-349 to E-351, R-7 and R-8 to the public repository, the owner deployed… | A, measured |
| [E-353](../../../CLAIMS.md#L413) | Established | The filings were re-surveyed on 2026-10-22, before either post is drafted, and F-9's is fixed: mpt-crypto PR #152 merged on 2026-10-21 and closed… | A, run and read |
| [B-21](../../../CLAIMS.md#L423) | Pending | ~~Secret material on the stack is not wiped: the SHA-512 expansion, the nonce mask, and fresh_aux's 32-byte buffer.~~ BUILT 2026-08-27. zeroize is a… | CLOSED as a build.… |
| [B-22](../../../CLAIMS.md#L424) | Pending | ~~The KEY-DERIVATION path leaves secret material unwiped, and B-21 deliberately did not cover it. sha512half is used for public transaction digests…~~ | 268 tests at B-22;… |
| [B-25](../../../CLAIMS.md#L427) | Pending | REVIEW-032's fixes — the derived ElGamal secret, and the pin that did not pin. | BUILT 2026-08-28. The… |
| [B-29](../../../CLAIMS.md#L431) | Pending | BUILT 2026-09-13 (E-293). ~~The facility writes its seeds, the issuer's ElGamal secret and its plaintext book with no file mode, and leaves each…~~ | An explicit 0600 on… |
| [B-31](../../../CLAIMS.md#L433) | Pending | Anything about what the Zellic scan of mpt-crypto 3baaaac found | NOT OBTAINABLE, and… |
| [B-19](../../../CLAIMS.md#L435) | Pending | ~~ed25519-dalek is configured default-features = false, features = ["std"], so zeroize is OFF.~~ THAT PREMISE IS FALSE — E-171, 2026-08-27. ["std"]… | CLOSED → docs/decision… |
| [B-17](../../../CLAIMS.md#L436) | Pending | Whether the signer should preflight terFROZEN, and what exactly it would have to read. | Raised 2026-08-25 by… |
| [B-16](../../../CLAIMS.md#L439) | Pending | ~~The ed25519 signing nonce — B-14's other half, and the LIVE path.~~ RULED 2026-08-27 → E-158. BUILT AND EXECUTED the same day → E-163. ~~RULED AND…~~ | CLOSED as a build →… |
| [B-14](../../../CLAIMS.md#L440) | Pending | ~~Where the transaction's own ECDSA signing nonce k comes from — a fifth randomness site, and no packet has covered it.~~ RULED 2026-08-20 → E-109.… | RESOLVED → REVIEW-018-… |
| [B-12](../../../CLAIMS.md#L441) | Pending | ~~Whether XLS-0096 anywhere states that the ElGamal encryption randomness r must not be reused across transactions~~ | RESOLVED 2026-08-18 →… |
| [B-1](../../../CLAIMS.md#L443) | Pending | ~~Bulletproof proving \~44.8 ms, verification \~22.6 ms~~ | RESOLVED 2026-08-16 →… |
| [B-2](../../../CLAIMS.md#L444) | Pending | ~~"ConfidentialTransfer is not enabled on Mainnet"~~ | RESOLVED 2026-08-16 →… |
| [B-3](../../../CLAIMS.md#L445) | Pending | ~~"The Confidential Devnet has ConfidentialTransfer, PermissionedDomains and SingleAssetVault enabled"~~ | RESOLVED 2026-08-16 →… |
| [B-4](../../../CLAIMS.md#L446) | Pending | "MPTokensV1 activated in October 2025" | Secondary coverage… |
| [B-6](../../../CLAIMS.md#L448) | Pending | Anything about computational vs unconditional hiding in XLS-96 | ePrint 2026/602… |
| [B-7](../../../CLAIMS.md#L449) | Pending | ~~Any statement about what the 192-byte sigma proof proves — including ADR-0001's premise that balance linkage requires the sender's secret key~~ | RESOLVED 2026-08-16 →… |
| [B-9](../../../CLAIMS.md#L450) | Pending | ~~Confidential transaction metadata stays within kOversizeMetaDataCap = 5200~~ | RESOLVED 2026-08-17 →… |
| [B-11](../../../CLAIMS.md#L452) | Pending | XLS-96 and XLS-66 provide no encrypted loan accounting as at rippled 3.3.0 | Rewritten 2026-08-17… |
| [F-1](../../../CLAIMS.md#L466) | Findings | Docs claim the reset inbox value is indistinguishable; it is the canonical EncZero, recomputable by any observer from public inputs, and used on… | A |
| [F-2](../../../CLAIMS.md#L467) | Findings | Spec §13.2.2's "separate view keys" have no ledger field. Protocol layer: issuer keys are permanent. Operational layer: an issuer choosing Mechanism… | A / B |
| [F-3](../../../CLAIMS.md#L468) | Findings | Docs say confidentiality can be toggled on and off; spec and transactor have no clear flag | A |
| [F-4](../../../CLAIMS.md#L469) | Findings | Docs say clawback resets the version counter to 0; it increments | A |
| [F-5](../../../CLAIMS.md#L470) | Findings | Spec §11.1 names a RevealedAmount field that does not exist; the field is sfMPTAmount | A |
| [F-6](../../../CLAIMS.md#L471) | Findings | Spec §11.2 says clawed-back funds go to the issuer's reserve; §11/§11.4 and the transactor say burned | A |
| [F-7](../../../CLAIMS.md#L472) | Findings | The 1,000,000 decryption "bound" is not a bound. | A |
| [F-8](../../../CLAIMS.md#L473) | Findings | mpt-crypto documents an escape hatch that does not exist. | A |
| [F-9](../../../CLAIMS.md#L474) | Findings | mpt-crypto's committed conan.lock ~~cannot be resolved from public remotes~~ does not resolve from conancenter, or from the remote rippled's setup… | A |
| [F-10](../../../CLAIMS.md#L475) | Findings | LendingProtocol and ConfidentialTransfer are silently non-composable. | A on the executed… |
| [F-11](../../../CLAIMS.md#L476) | Findings | ConfidentialMPTClawback has no pseudo-account guard, where ordinary Clawback returns tecPSEUDO_ACCOUNT. Unreachable by construction rather than… | A |
| [F-17](../../../CLAIMS.md#L477) | Findings | cmpt-compact-sigma.pdf Remark 6.1's stated justification is false, and a reader who trusts it builds a key-extraction bug. | A |
| [F-18](../../../CLAIMS.md#L478) | Findings | The published Rust FFI crate silently links an mpt-crypto four tag-generations behind rippled's, and it is not on the mainline branch. | B — read, no Rust… |
| [F-27](../../../CLAIMS.md#L482) | Findings | ConfidentialMPTConvert deposits into the holder's INBOX, not into their spendable balance — a ConfidentialMPTMergeInbox is required before any of it… | A, executed |
| [F-23](../../../CLAIMS.md#L484) | Findings | A wrong ledger read is a CONFIDENTIALITY break, not a rejected transaction — and the signer cannot control which. | A, executed |
| [F-22](../../../CLAIMS.md#L485) | Findings | This project's own signer built a four-participant proof and serialised three ciphertexts, and no test or Devnet run could see it. | A (E-162) |
| [F-19](../../../CLAIMS.md#L487) | Findings | mpt-crypto's exported PoK API makes account binding optional, and the public header does not say so. | A (E-162) |
| [F-20](../../../CLAIMS.md#L488) | Findings | REVIEW-012-RULING-keygen's domain-separation table named a label family that does not exist. | A |
| [F-16](../../../CLAIMS.md#L489) | Findings | A LoanSet in which both parties signed the same pre-CounterpartySignature payload was accepted, first attempt. | A |
| [F-12](../../../CLAIMS.md#L490) | Findings | mpt-crypto's shipped WASM build script fails at emsdk 6.0.6 and succeeds at its CI-pinned 6.0.2. | A |
| [F-13](../../../CLAIMS.md#L491) | Findings | cmpt-compact-sigma.pdf §2.1's "transmitted once on-chain" is not true of rippled 3.3.0. | A |
| [F-15](../../../CLAIMS.md#L492) | Findings | The published JS wrapper ~~makes the tight-window decryption optimisation unreachable~~ keeps the tight-window decryption optimisation out of its hex… | A on the API shape;… |
| [F-14](../../../CLAIMS.md#L493) | Findings | tecINSUFFICIENT_FUNDS misattributes the cause when a holder's balance is partly confidential — on vault AND lending transactors. | A, executed (E-162) |
| [F-29](../../../CLAIMS.md#L494) | Findings | XLS-0096 §7.4 states the MPToken deletion blocker unconditionally; rippled enforces it through two paths that disagree. | A, not executed |
| [R-2](../../../CLAIMS.md#L511) | Retracted | ADR-0001 rev 1: local proving is "the only option under which the confidentiality claim is true" | Conflated custody… |
| [R-3](../../../CLAIMS.md#L512) | Retracted | F-3: "docs say confidentiality can be toggled on and off" | Corrected upstream.… |
| [R-4](../../../CLAIMS.md#L513) | Retracted | F-4: "docs say clawback resets the version counter" | Not a doc error.… |
| [R-6](../../../CLAIMS.md#L514) | Retracted | B-11 / ADR-0002 blocker 3 / investigation §12: that encrypted loan accounting is structurally blocked, because XLS-96's additive homomorphism "cannot… | The mathematics was… |
| [R-7](../../../CLAIMS.md#L516) | Retracted | docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md, limit 1, and the README before 2026-10-19: a holder who converts in 500, receives nothing and… | The README's rewrite… |
| [R-8](../../../CLAIMS.md#L517) | Retracted | web/api/capability.ts's wallet row and the wallet page: *"A confidential transaction needs the ElGamal secret and the account key"*, and *"needs two… | Found by REVIEW-061… |
| [R-9](../../../CLAIMS.md#L518) | Retracted | The hosted explainer /how-it-works, README.md and WHAT-CONFIDENTIAL-MEANS, the last as *"the sentence to use"*: ~~*"it hides the shape of the book,…~~ | True as the register… |
