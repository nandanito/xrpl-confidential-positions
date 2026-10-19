# CLAIMS index

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-index.ts`;
`make check-claims-index` fails if this file drifts from `CLAIMS.md`.

**Why it exists:** `CLAIMS.md` is a register of hundreds of rows averaging over a
thousand characters each. It is not readable end to end and was never meant to be —
this is how you find a row. **Line numbers link into the file and are regenerated,**
so they do not rot the way a hand-written index would (`CLAIMS.md` E-199, E-236).

⚠ **A summary is not a claim.** Each line below is a truncated, markup-stripped
excerpt for finding things. **The row is the authority** — never cite the index.

**411 rows** across **5 sections**, counted where they are parsed.

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

## Established — 334 rows

| id | summary | grade |
|---|---|---|
| [E-1](../CLAIMS.md#L41) | XLS-0096 authors: Cenk, Malhotra, Akinyele, Chen, Xie, Qian; status Draft, created 2026-01-15. Superseded upstream on… | A |
| [E-2](../CLAIMS.md#L42) | Transaction types 85 Convert, 86 MergeInbox, 87 ConvertBack, 88 Send, 89 Clawback | A |
| [E-3](../CLAIMS.md#L43) | The Send ZKProof is a fixed-length bundle of a compact sigma proof plus an aggregated Bulletproof, enforced at preflight | A |
| [E-3a](../CLAIMS.md#L44) | Those components are 192 B and 754 B, totalling 946 B | A |
| [E-4](../CLAIMS.md#L45) | Total Send payload is 1210 B without an auditor and 1276 B with one — both now MEASURED. The conflicting 1177 B is… | A on both figures,… |
| [E-5](../CLAIMS.md#L46) | A confidential transaction costs exactly 10× the network's standard base fee. The widely-quoted "100 drops" is that… | A on the ratio,… |
| [E-6](../CLAIMS.md#L47) | kTxMaxSizeBytes = megabytes(1) — size is not a binding constraint | A |
| [E-7](../CLAIMS.md#L48) | Confidential MPTs are incompatible with a non-zero TransferFee | A |
| [E-8](../CLAIMS.md#L49) | Confidential MPTs cannot be used with the DEX, escrow or checks | A |
| [E-9](../CLAIMS.md#L50) | Holder, issuer and auditor encryption keys cannot be rotated once registered | A |
| [E-10](../CLAIMS.md#L51) | A holder who loses their ElGamal key permanently loses access | A |
| [E-11](../CLAIMS.md#L52) | Only one auditor is supported | A |
| [E-12](../CLAIMS.md#L53) | Clawback burns the entire balance, decrementing both OA and COA, crediting no account | A |
| [E-13](../CLAIMS.md#L54) | xrpl.js@5.0.0 and ripple-binary-codec@2.8.0 contain no Confidential MPT types or fields SUPERSEDED 2026-08-16 → E-30.… | A |
| [E-14](../CLAIMS.md#L55) | mpt-crypto is C/C++; 0.4.0-rc4 in rippled 3.3.0. no bindings, no WASM target, no published package PARTLY SUPERSEDED… | A |
| [E-15](../CLAIMS.md#L56) | MPTokensV2 (XLS-82 MPT DEX) is Supported::No in 3.3.0 | A |
| [E-16](../CLAIMS.md#L57) | SmartEscrow (XLS-100) is absent from features.macro in 3.3.0 | A |
| [E-17](../CLAIMS.md#L58) | When set, sfDomainID on the MPTokenIssuance gates confidential transfers, checked by requireAuth on both sender and… | A |
| [E-18](../CLAIMS.md#L59) | An MPToken cannot be deleted once confidential fields are initialised, even at zero balance. Superseded upstream on… | A |
| [E-19](../CLAIMS.md#L60) | Writing sfDomainID requires both PermissionedDomains and SingleAssetVault enabled | A |
| [E-20](../CLAIMS.md#L61) | The issuer can unilaterally clear sfDomainID, removing the domain gate without holder consent | A |
| [E-21](../CLAIMS.md#L62) | Clawback requires lsfMPTCanClawback on the issuance; without it, tecNO_PERMISSION | A |
| [E-23](../CLAIMS.md#L63) | ElGamal decryption bounded at 1,000,000; above that permanently undecryptable through the API CORRECTED 2026-08-16 —… | A |
| [E-22](../CLAIMS.md#L64) | (a) A ConfidentialMPTSend of zero is valid. (b) It is indistinguishable from a non-zero send — survived THREE… | (a) A, executed. (b)… |
| [E-24](../CLAIMS.md#L65) | On Apple M3 Pro / macOS 26.6.1 / Apple clang 21 / -O3 -DNDEBUG, aggregated Bulletproof (m=2) proving median 34.583 ms,… | A |
| [E-25](../CLAIMS.md#L66) | ConfidentialTransfer is not enabled on Mainnet as at 2026-08-16 | A |
| [E-26](../CLAIMS.md#L67) | ConfidentialTransfer, PermissionedDomains and SingleAssetVault are all enabled on standard Devnet (network_id 2,… | A |
| [E-27](../CLAIMS.md#L68) | mpt-crypto 0.4.0-rc4 (the version rippled 3.3.0 pins), 1.0.0 and 1.0.1 are the same commit,… | A |
| [E-28](../CLAIMS.md#L69) | mpt-crypto builds clean and 11/11 tests pass on macOS 26.6.1 / arm64 / Apple clang 21, in 6.20 s — after adding the… | A |
| [E-29](../CLAIMS.md#L70) | All seven proof-size constants are identical at 0.4.0-rc4 and 1.0.4: pubkey 33, ElGamal total 66, single BP 688, double… | A |
| [E-30](../CLAIMS.md#L71) | ripple-binary-codec@2.9.0 (2026-08-13) ships Confidential MPT serialisation. All five transaction types at codes 85–89… | A |
| [E-31](../CLAIMS.md#L72) | mpt-crypto has a WASM build in CI (.github/workflows/build-wasm.yml, .github/scripts/build-wasm.sh) emitting dual… | A |
| [E-32](../CLAIMS.md#L73) | The @xrplf/mpt-crypto npm package referenced by that build script is not published as at 2026-08-16 | Superseded |
| [E-33](../CLAIMS.md#L74) | Generating a ConfidentialMPTSend proof requires the sender's ElGamal secret key sk_A as a witness. sk_A appears in the… | A |
| [E-34](../CLAIMS.md#L75) | Nonce reuse in a compact-form sigma proof leaks sk_A, and is undetectable from the proofs. Compact form transmits (e,… | A |
| [E-35](../CLAIMS.md#L76) | Compact-form proofs cannot be batch-verified — commitments are reconstructed per-proof from each proof's own challenge,… | A |
| [E-36](../CLAIMS.md#L77) | XLS-96 deliberately rejected twisted ElGamal. Under compact form its size advantage shrinks from 292 B to an… | A |
| [E-37](../CLAIMS.md#L83) | fixCleanup3_1_3, fixCleanup3_2_0 and fixCleanup3_3_0 are all enabled on standard Devnet as at 2026-08-16T13:41Z.… | A |
| [E-38](../CLAIMS.md#L84) | A vault share MPT can never carry lsfMPTCanHoldConfidentialBalance. VaultCreate builds the share flags itself from two… | A |
| [E-39](../CLAIMS.md#L85) | A pseudo-account can never hold a confidential balance. It cannot sign the Convert that initialises the fields, and… | A |
| [E-40](../CLAIMS.md#L86) | Nothing rejects a confidential-capable MPT as a vault asset; the vault operates on the public sfMPTAmount only. Zero… | A — restored 2026-08-1… |
| [E-41](../CLAIMS.md#L87) | Vault, loan-broker and AMM pseudo-accounts are exempt from XLS-80 domain validation for MPTs they hold. Observed… | A |
| [E-42](../CLAIMS.md#L88) | Revoking a domain credential traps a vault position rather than recovering it: VaultWithdraw → tecNO_AUTH while the… | A |
| [E-43](../CLAIMS.md#L89) | XLS-66 models a fixed-term amortising loan with one disbursement at origination. No revolving drawdowns. revolv and… | A |
| [E-44](../CLAIMS.md#L90) | Neither XLS-0065 nor XLS-0066 mentions confidential balances, encryption or XLS-96 — zero occurrences of confidential,… | A |
| [E-45](../CLAIMS.md#L96) | The end-to-end client path works. A ConfidentialMPTConvert was constructed, proved, signed and accepted by standard… | A |
| [E-46](../CLAIMS.md#L97) | ripple-binary-codec@2.9.0 agrees with the node. All five ConfidentialMPT transaction types (85–89) and all 18… | A |
| [E-47](../CLAIMS.md#L98) | mpt-crypto's WASM build works end to end and agrees bit-for-bit with a native build, but failed to build at emsdk 6.0.6… | A |
| [E-48](../CLAIMS.md#L99) | mpt-crypto's sigma nonces are hedged, not deterministic. generate_deterministic_nonces (src/mpt_internal.h:218) is… | A on the construction… |
| [E-49](../CLAIMS.md#L100) | F-1 is now executed on-chain, not only read. After a first-time ConfidentialMPTConvert, the holder's… | A |
| [E-50](../CLAIMS.md#L101) | GAP-9 closed. A confidential balance is invisible to XLS-65 vault accounting, and the error misattributes the cause. A… | A |
| [E-51](../CLAIMS.md#L102) | A three-participant ConfidentialMPTSend writes 1219 B or 1225 B of metadata against kOversizeMetaDataCap = 5200 — not a… | A |
| [E-53](../CLAIMS.md#L103) | @xrplf/mpt-crypto@0.1.0 is published and it works. A hex-in/hex-out TypeScript API over a vendored WASM build, zero… | A, executed |
| [E-54](../CLAIMS.md#L104) | Upstream is building native libraries for Rust and Python consumers. .github/workflows/build-native-libs.yml exists to… | A on the intent, GAP… |
| [E-55](../CLAIMS.md#L105) | Under WASM, sigma-proof randomness comes from the host. OpenSSL's RAND_bytes — the source of the HKDF-Extract salt in… | A |
| [E-56](../CLAIMS.md#L106) | F-9 was bypassed for local macOS compilation; it remains blocking for the documented contributor path. mpt-crypto's… | A on "this host was… |
| [E-57](../CLAIMS.md#L107) | GAP-11 closed. The Rust path for ADR-0001's signer already exists upstream and is published. mpt-crypto-sys (low-level… | A on existence and… |
| [E-58](../CLAIMS.md#L108) | The auditor view is executed, not inferred. With an issuance carrying sfAuditorEncryptionKey, the auditor's ElGamal key… | A |
| [E-59](../CLAIMS.md#L109) | The two harnesses CLAUDE.md requires now exist and both self-verify. tools/observer-harness.ts holds no keys and links… | A |
| [E-52](../CLAIMS.md#L110) | The issuer-view claim is executed, not inferred. Given only sfIssuerEncryptedBalance from the ledger and the issuer's… | A |
| [E-60](../CLAIMS.md#L111) | A ConfidentialMPTSend whose sigma nonces this project derived — not mpt-crypto's — was accepted on Devnet. The nonce… | A, executed |
| [E-61](../CLAIMS.md#L112) | Path A is installable, and cheaper than issue #2 costed it: the Rust FFI crate does not need forking. mpt-crypto-sys's… | B — read, not executed… |
| [E-62](../CLAIMS.md#L113) | The nonce construction reproduces from its own prose, and draws no entropy through the tree's only entropy route.… | A, executed, scoped… |
| [E-63](../CLAIMS.md#L114) | A passive full-ledger observer holding no keys recovered the difference between two confidential amounts, when the… | A, executed |
| [E-64](../CLAIMS.md#L115) | r and ρ are caller-owned, so whatever the third packet rules for them needs no upstream change and has no FFI problem.… | A |
| [E-65](../CLAIMS.md#L116) | Deterministic Bulletproof blinding is reachable by the same Path A move, and needs no new information from the caller.… | B — read, not executed |
| [E-66](../CLAIMS.md#L117) | The XLS-96 registration PoK IS bound to the account, so a registration proof is not copyable to another account. Issue… | A, read |
| [E-67](../CLAIMS.md#L118) | XLS-0096 nowhere states that the ElGamal encryption randomness r must not be reused across transactions. The… | A on the read, with… |
| [E-68](../CLAIMS.md#L119) | The keygen construction reproduces from its own prose, by two implementations, and its test is not a false pass. The… | A on reproduction,… |
| [E-69](../CLAIMS.md#L120) | An XRPL account's master seed need not be its spending authority, which is the fact that falsifies ADR-0001 §(e)'s… | A, read |
| [E-70](../CLAIMS.md#L121) | Two standing ambiguities about the vendored fork, closed by direct check. (a) 85dbac7 IS tag 1.0.4 — not a commit past… | A on (a), executed; B… |
| [E-71](../CLAIMS.md#L122) | ripple-keypairs.deriveKeypair(seed) recovers the algorithm from the seed's own encoding — no algorithm option is… | A, executed |
| [E-72](../CLAIMS.md#L123) | ADR-0001's build-cost comparison was INVERTED, not merely stale, and the decision survived the correction. As written… | A on the cost facts;… |
| [E-73](../CLAIMS.md#L124) | The signer skeleton is built and runs, and architecture §6 step 1's named falsifier passes. signer/, a Rust binary… | A, executed |
| [E-74](../CLAIMS.md#L125) | SUPERSEDED 2026-08-18 → E-80, E-83, E-84. Everything this row said the skeleton could not do, it now does: proofs are… | A |
| [E-75](../CLAIMS.md#L126) | The ruled r/ρ construction is implemented and reproduces all nine published vectors from an independent second… | A, executed |
| [E-76](../CLAIMS.md#L127) | The tools/ half was still open until 2026-08-24 and is now CLOSED → E-132. What E-75 does NOT establish. RESOLVED… | A |
| [E-77](../CLAIMS.md#L128) | The r/ρ randomness ledger is implemented against amendments A4–A9, with a falsifying test per amendment.… | A, executed |
| [E-78](../CLAIMS.md#L129) | The signer implementation was adversarially reviewed and the review found real defects. REVIEW-014, two independent… | A, executed |
| [E-79](../CLAIMS.md#L130) | Four claims in the signer's own documentation were false, and all four were written by the session that wrote the code.… | A |
| [E-80](../CLAIMS.md#L131) | The vendored prover is wired into the signer, and the pristine upstream verifier accepts proofs the signer produces.… | A, executed |
| [E-81](../CLAIMS.md#L132) | The signer links the PATCHED library or does not link at all, and binds to the pinned headers or does not build. Two… | A, executed |
| [E-82](../CLAIMS.md#L133) | The Rust FFI struct layouts and by-value ABI are checked against the vendored header by the C compiler, not by hand.… | A, executed |
| [E-83](../CLAIMS.md#L134) | XRPL serialisation and signing are implemented in the signer and pinned byte-for-byte against three implementations… | A, executed |
| [E-84](../CLAIMS.md#L135) | A ConfidentialMPTSend built, proved and signed entirely by signer/ was accepted on Devnet. tesSUCCESS, validated,… | A, executed |
| [E-85](../CLAIMS.md#L136) | E-76 is closed: observer-harness.ts --assert-no-r-reuse has now been run against transactions this project's own code… | A, executed |
| [E-86](../CLAIMS.md#L137) | The randomness ledger's records are checkable against the public ledger, and were checked. r_entry commits to… | A, executed |
| [E-87](../CLAIMS.md#L138) | A real defect in the signing path was found by a test, not by review, and it would have been rejected by every… | A |
| [E-88](../CLAIMS.md#L139) | session.rs now calls store and randomness on the signing path, in the order the rulings require, and there are tests… | A, executed |
| [E-89](../CLAIMS.md#L140) | Step 3 was adversarially reviewed and the review found a defect that would have broken every Send on an auditor-enabled… | A, executed |
| [E-90](../CLAIMS.md#L141) | The review found that validation ran AFTER the randomness reservation, and that a test had codified it as intended. A… | A, executed |
| [E-91](../CLAIMS.md#L142) | ParsedTransaction::parse ignored fields it did not recognise, while its own doc comment claimed it refused them — and… | A, executed |
| [E-92](../CLAIMS.md#L143) | The step 3 falsifier could be pointed at the wrong binary, and every test would still have passed.… | A, executed |
| [E-93](../CLAIMS.md#L144) | Two round-one findings were WRONG, and both are now pinned by tests rather than by a disposition note. (1) A leg ruled… | A, executed |
| [E-94](../CLAIMS.md#L145) | Round two reviewed the FIXES and found a defect one of them introduced, a test that passed for the wrong reason, and… | A, executed |
| [E-95](../CLAIMS.md#L146) | Reading the spec to settle a review question found a defect neither review round did. XLS-0096 §7.2:… | A, executed |
| [E-96](../CLAIMS.md#L147) | A third review round was run against this project's own two-round rule, and it found a defect neither earlier round… | A, executed |
| [E-97](../CLAIMS.md#L148) | IT HAPPENED AGAIN on 2026-08-25, mid-session, and the window turned out to be DAYS → E-133. The entire executable… | A |
| [E-98](../CLAIMS.md#L149) | The test suite was FLAKY and several "all passing" reports were true but lucky. The entropy-failure hook added in step… | A, executed |
| [E-99](../CLAIMS.md#L150) | tools/rebuild-env.sh restored an environment that could not rebuild a Devnet chain, and looked complete doing it.… | A, executed |
| [E-100](../CLAIMS.md#L151) | Architecture §6 step 2 is built: the signer reads the ledger itself, and the profile file no longer carries any ledger… | A, executed |
| [E-101](../CLAIMS.md#L152) | A ConfidentialMPTSend built, proved and signed entirely by signer/ *from ledger state the signer read for itself* was… | A, executed |
| [E-102](../CLAIMS.md#L153) | A stale ledger read is now *detected*, not merely bounded — the signer re-reads after the human confirms and refuses if… | A, executed |
| [E-103](../CLAIMS.md#L154) | Two "validated" reads seconds apart land in different ledgers, so a snapshot assembled from them is a state that never… | A, executed |
| [E-104](../CLAIMS.md#L155) | Reading the balance from the ledger made the search bound load-bearing in a second place, and made one earlier test's… | A, executed |
| [E-105](../CLAIMS.md#L156) | Step 2 was reviewed (REVIEW-016, two independent legs) and the review found real defects, one of them in the guard this… | A, executed |
| [E-106](../CLAIMS.md#L157) | A review leg's diagnosis was wrong for the fourth time in this project, and a second leg's remedy was right in… | A, executed |
| [E-107](../CLAIMS.md#L158) | Round two reviewed the fixes and found all three things a round two is for, including a defect one of the fixes… | A, executed |
| [E-108](../CLAIMS.md#L159) | Two of the tests written for round two's own findings were FALSE PASSES, and only the revert spot-check caught them.… | A, executed |
| [E-109](../CLAIMS.md#L160) | B-14 ruled and implemented: the transaction's ECDSA nonce is hedged, because the issue #1 ruling extends to it. Two… | A, executed |
| [E-110](../CLAIMS.md#L161) | B-15 ruled: one ledger endpoint stands for this artifact, as a NAMED RISK ACCEPTANCE, and the disclosure is a condition… | A, executed |
| [E-111](../CLAIMS.md#L162) | ADR-0002's second round found that its Decision sentence asserted what the ADR itself reopened two sections later, and… | A, executed |
| [E-112](../CLAIMS.md#L163) | A review leg argued a coding session could close a question the ADR reserves for scope, and it was checked and… | A, executed |
| [E-113](../CLAIMS.md#L164) | A test written the same hour, for the ruling it was guarding, could not check the thing its name promised.… | A, executed |
| [E-114](../CLAIMS.md#L165) | ADR-0002's open question may be premised on a facility TASK ZERO §9 does not describe, and two review rounds could not… | A, source |
| [E-115](../CLAIMS.md#L166) | ADR-0002's hybrid is resolved on a TECHNICAL ground, and the scope question two revisions deferred to turns out not to… | A, executed |
| [E-116](../CLAIMS.md#L167) | An issuer cannot convert its own issuance into a confidential balance — ConfidentialMPTConvert.cpp:28–30, *"issuer… | A, source |
| [E-117](../CLAIMS.md#L168) | Rejecting the XLS-65 Vault traded away a custody property, and ADR-0002 does not say so ADR-0002 has said so since… | A, source on both… |
| [E-118](../CLAIMS.md#L169) | Architecture §6 step 6 is built: the ElGamal key is DERIVED from the master seed under the ruled construction, and the… | A, executed |
| [E-119](../CLAIMS.md#L170) | ADR-0001 §(e)'s only benefit is now EXECUTED rather than described: the seed alone reproduced the key the ledger holds.… | A, executed |
| [E-120](../CLAIMS.md#L171) | ElGamalKeypair::from_parts accepted a public key that was not sk·G, and the failure it allowed is the worst one this… | A, reasoned |
| [E-121](../CLAIMS.md#L172) | Issue #11's two untested conditions now branch, and the third irreversible act of onboarding reaches the confirmation… | A, executed |
| [E-122](../CLAIMS.md#L173) | A module header called the ECDSA nonce "unruled" for a full day after REVIEW-018 ruled it, in a file whose code had… | A, reasoned |
| [E-123](../CLAIMS.md#L174) | A profile can now hold NO secret at all, and with the derived key source that is the complete configuration. Say "the… | A, reasoned |
| [E-124](../CLAIMS.md#L175) | Step 6 was reviewed in two rounds by four legs, and NOT ONE finding touched the derivation. Both round-one legs… | A, executed |
| [E-125](../CLAIMS.md#L176) | The confirmation told a holder, at the approval step, that a registered key can "never be recovered" — false for a… | A, reasoned |
| [E-126](../CLAIMS.md#L177) | A false sentence survived a full round of review because it lived in the one disclosure surface that was not a constant… | A, reasoned |
| [E-127](../CLAIMS.md#L178) | A sentence written to justify keeping a test mis-described the very function a finding upheld an hour earlier was… | A, reasoned |
| [E-128](../CLAIMS.md#L179) | claims-check caught four things a session that had just written the register did not, and one was the recurring failure… | A, reasoned |
| [E-129](../CLAIMS.md#L180) | tools/rebuild-env.sh — the script whose entire job is recovering a cleaned /tmp — could not recover a PARTIALLY cleaned… | A, executed |
| [E-130](../CLAIMS.md#L181) | Building ConfidentialMPTConvertBack made a documented refusal code UNREACHABLE, and the variant was removed rather than… | A, executed |
| [E-131](../CLAIMS.md#L182) | ConfidentialMPTConvertBack is BUILT AND EXECUTED — the facility's exit exists. signer/src/prover.rs wraps… | A, executed |
| [E-132](../CLAIMS.md#L183) | THIS ROW OVERSTATED ITS OWN SWEEP AND WAS CORRECTED 2026-08-25 → E-137. It said the migration was complete with four… | A, executed |
| [E-133](../CLAIMS.md#L184) | /tmp/wconf/state.json was lost a SECOND time — during this session, eight minutes before it was needed — and the window… | A, executed |
| [E-134](../CLAIMS.md#L185) | A confidential balance emptied by ConvertBack is NOT publicly identifiable as empty — and the balance that IS publicly… | B, executed — the… |
| [E-135](../CLAIMS.md#L186) | A test helper silently dropped every field it did not know about, and would have made the assertions built on it… | A, executed |
| [E-136](../CLAIMS.md#L187) | The Convert confirmation listed the BLINDING FACTOR as public and did not list the AMOUNT — which is the most… | A, executed |
| [E-137](../CLAIMS.md#L188) | CORRECTED 2026-08-25 BY ROUND TWO → E-141, E-142. This row claimed the gate was a falsifier for the completeness claim.… | A, executed |
| [E-138](../CLAIMS.md#L189) | parse enforced XLS-0096 §10.3's ALLOWLIST and not its REQUIREMENTS, and an allowlist cannot express either requiredness… | A, executed |
| [E-139](../CLAIMS.md#L190) | A fix contradicted its own file four lines away, and the contradiction was in the HEADER the fix did not touch.… | A, executed |
| [E-140](../CLAIMS.md#L191) | THIS ROW'S OWN FIX WAS WRONG TWICE AND ROUND TWO FOUND BOTH → E-143. It said the corrected reasons landed *at their… | A, reasoned |
| [E-141](../CLAIMS.md#L192) | A GATE REPORTED PASS WHILE ITS OWN HEADLINE GUARANTEE WAS DISABLED FOR ONE FILE — and the fix that disabled it was a… | A, executed |
| [E-142](../CLAIMS.md#L193) | The same gate had three blind spots, all latent rather than live, and closing them was cheap. It walked only tools/ —… | A, executed |
| [E-143](../CLAIMS.md#L194) | Three harnesses that SUBMIT TO DEVNET were exempted from the ruled derivation on two successive false reasons, and the… | A, executed |
| [E-144](../CLAIMS.md#L195) | THREE FALSE SENTENCES, ALL WRITTEN TO EXPLAIN ROUND-ONE FIXES — which is exactly and only what a second round is for.… | A, executed |
| [E-145](../CLAIMS.md#L196) | bun build IS NOT A TYPE-CHECK, and this session called it one at least fourteen times. It bundles: it catches syntax… | A, executed |
| [E-146](../CLAIMS.md#L197) | Architecture §6 step 7 is BUILT AND EXECUTED — facility/, the receivables facility as application logic. Executed under… | A, executed for… |
| [E-147](../CLAIMS.md#L198) | EVERY plaintext transaction in the facility was submitted TWICE, and no test could see it.… | A, reasoned |
| [E-148](../CLAIMS.md#L199) | B-15 Option A's real cost is a FULL DEVNET SYNC, and there is no rehearsal network. Measured, not estimated. The… | A, executed — the… |
| [E-149](../CLAIMS.md#L209) | fail_hard on the submit RPC is what sets TapFailHard, and a tec under it is discarded and never relayed. READ AT SOURCE… | A, executed — and… |
| [E-150](../CLAIMS.md#L210) | The facility was reviewed in two rounds and the loopback obligation it exists to keep was ESCAPABLE TWO WAYS — neither… | A, executed — the… |
| [E-151](../CLAIMS.md#L211) | B-15's step-7 answer was AMENDED by the project owner, and the amendment is recorded in code rather than only in prose.… | A, reasoned |
| [E-152](../CLAIMS.md#L212) | REVIEW-023 reviewed the accepted-risk hatch, the post-execution fixes and the executed claims — seven findings, all… | A, executed — the… |
| [E-153](../CLAIMS.md#L213) | REVIEW-023 ROUND TWO reviewed the FIXES, and found that three of round one's seven had not reached sites the findings… | A, executed — the… |
| [E-154](../CLAIMS.md#L214) | CLAUDE.md carried two stale claims in its Stack section, and one of them described a design REVIEW-003b had KILLED. (a)… | A, read at source |
| [E-155](../CLAIMS.md#L215) | The project's second stated output stopped being zero: five items filed upstream 2026-08-26, and re-verification… | A, executed |
| [E-156](../CLAIMS.md#L216) | AN EXTERNAL LEG FOUND 13 DEFECTS IN THE FIVE FILINGS AFTER MY OWN REVIEW FOUND 3, AND THE WORST WAS IN THE POSITIVES.… | A, executed |
| [E-157](../CLAIMS.md#L217) | Second filing round, and the first one run in the right order. U-24 → XRPL-Standards #611, U-34 → mpt-crypto #141, the… | A, executed |
| [E-158](../CLAIMS.md#L218) | B-16 is RULED — the ed25519 signing nonce is hedged, and B-14 is now closed on both halves. Three independent legs, all… | A, ruled → built |
| [E-159](../CLAIMS.md#L219) | An onboarding disclosure asserted a key source the holder had not chosen yet — and the obligation to test it had been… | A, executed |
| [E-160](../CLAIMS.md#L220) | An excerpt is a diff by another name, and the packet's excerpt walked a leg into a false statement. CLAUDE.md requires… | A |
| [E-161](../CLAIMS.md#L221) | Two defects found by review legs outside the question they were asked, both verified at source. (1) Gemini:… | A, executed |
| [E-162](../CLAIMS.md#L222) | Seven rows of the Findings table had no Grade cell, and the register has been reading as if they did. The header is \|… | A, executed |
| [E-163](../CLAIMS.md#L223) | B-16 is BUILT AND EXECUTED — the ed25519 signing nonce is hedged on the DEFAULT path. This row said the signer *"no… | A, executed |
| [E-164](../CLAIMS.md#L224) | A REVERT PASSED, and it is the strongest instance of CLAUDE.md's "revert every fix and watch its test fail" the project… | A, executed |
| [E-165](../CLAIMS.md#L225) | A GATE BUILT THIS SESSION TO CATCH FALSE PASSES FALSE-PASSED, and a control naming 0u8 — a literal, not a symbol — was… | A, executed |
| [E-166](../CLAIMS.md#L226) | REVIEW-025 round one: eleven findings, not one of them about the construction. All three legs ruled the construction… | A, executed |
| [E-167](../CLAIMS.md#L227) | THIS ROW'S HEADLINE IS FALSE AND E-171 IS WHY. zeroize WAS NEVER OFF. std = ["alloc", ..] and alloc lists… | A, executed |
| [E-168](../CLAIMS.md#L228) | Round two found that round one's adjudication OVERSTATED ITS OWN FIXES, in the round whose entire lesson is that fixes… | A, executed |
| [E-169](../CLAIMS.md#L229) | FOUR DOCUMENTS CITED A DEVNET TRANSACTION THAT NO COMMITTED RECEIPT RECORDS. CLAIMS.md E-163, CLAUDE.md,… | A, source (E-244,… |
| [E-170](../CLAIMS.md#L230) | A REVIEW LEG GRADED A HIGH DEFECT THAT DOES NOT EXIST, AND ITS EXCERPT OF THE FILE IS WHY — with the complete file in… | A, source (E-244) |
| [E-171](../CLAIMS.md#L231) | B-19's PREMISE AND B-19's GATE WERE BOTH FALSE, AND THE THING THAT FOUND IT WAS BUILDING THE GATE B-19 SAID IT HAD.… | A, executed (E-244) |
| [E-172](../CLAIMS.md#L232) | THE FALSE B-19 PREMISE SURVIVED THE COMMIT THAT CORRECTED IT — AND TWO OF THE SURVIVORS WERE WRITTEN BY THAT COMMIT.… | A, measured (E-244,… |
| [E-173](../CLAIMS.md#L233) | THE TEST AND THE GATE WERE BOTH BLIND TO THE ONLY THING THAT MATTERS — THE CALL SITE — AND BOTH REVIEW-027 EXTERNAL… | A, executed (E-244) |
| [E-174](../CLAIMS.md#L234) | A REVIEW LEG RULED THE SESSION'S CENTRAL FINDING FALSE, FROM A CORRECT-SOUNDING READING OF CARGO'S RULES, AND WAS… | A, source (E-244,… |
| [E-175](../CLAIMS.md#L235) | ROUND TWO FOUND THAT ROUND ONE'S FIX FOR E-172 REPRODUCED E-172. A COMPLETENESS CLAIM WAS FALSE, AND ONE SURVIVING… | A, measured and… |
| [E-176](../CLAIMS.md#L236) | B-21's default signing path is EXECUTED on Devnet, and the receipt was written before the prose. REVIEW-027 finding 8… | A, executed (E-244) |
| [E-177](../CLAIMS.md#L237) | A DECISION REQUEST ARGUING THAT HAND-ENUMERATED SITE LISTS ARE UNFALSIFIABLE CONTAINED FOUR ENUMERATION ERRORS OF ITS… | A, executed |
| [E-178](../CLAIMS.md#L238) | WRAPPING A Copy TYPE IN A ZEROIZING WRAPPER DOES NOT WIPE THE SOURCE, AND ONE LINE OF THIS PROJECT READ AS THOUGH IT… | A, executed |
| [E-179](../CLAIMS.md#L239) | FOR A Zeroizing WRAPPED AROUND AN EXISTING BINDING, NO COMPILE-TIME FALSIFIER EXISTS — MEASURED, NOT ASSUMED. Each B-22… | A, executed |
| [E-180](../CLAIMS.md#L240) | TWO REVIEW LEGS SPLIT ON THE CENTRAL QUESTION, AND THE SPLIT WAS WORTH MORE THAN THE PREVIOUS ROUND'S UNANIMITY.… | A |
| [E-181](../CLAIMS.md#L241) | ROUND TWO FOUND THAT THE B-22 BUILD DID NOT IMPLEMENT ITS OWN RULING, AND THAT PROSE WAS COVERING THE GAP. REVIEW-029c… | A, executed |
| [E-182](../CLAIMS.md#L242) | A GATE WRITTEN TO CATCH FALSE PASSES FALSE-PASSED IN TWO WAYS, THE THIRD TIME IN THIS REPOSITORY (E-165, E-168).… | A, executed |
| [E-183](../CLAIMS.md#L243) | A COPY WAS DELETED RATHER THAN WIPED, AND THAT IS THE STRONGER FIX — B-23's one genuinely new idea. holder.rs parsed… | A, executed |
| [E-184](../CLAIMS.md#L244) | THE B-22 DECISION REQUEST CALLED THIS AN OPEN TECHNICAL QUESTION AND IT DISSOLVED IN THREE LINES. DECISION-REQUEST-b22… | A, executed |
| [E-185](../CLAIMS.md#L245) | E-168 FOR THE THIRD TIME, AND THIS TIME THE RULING'S OWN SITE LIST IS WHAT WAS INCOMPLETE. REVIEW-029c named B-23's… | A, executed |
| [E-186](../CLAIMS.md#L246) | String::new() FOLLOWED BY read_line COPIED THE MASTER SEED THROUGH A CHAIN OF EVER-LARGER HEAP BUFFERS AND FREED EVERY… | A, executed |
| [E-187](../CLAIMS.md#L247) | B-23 RESTED ON A CARGO FEATURE NO MANIFEST IN THIS REPOSITORY ASKED FOR — E-167 RUNNING FORWARD INSTEAD OF BEING… | A, executed |
| [E-188](../CLAIMS.md#L248) | FIVE OF B-23's SEVEN REVERTS COMPILE CLEAN — E-179's RULE RUN FORWARD, AND THE ANSWER WAS MOSTLY *NO FALSIFIER EXISTS*.… | A, executed |
| [E-189](../CLAIMS.md#L249) | THE PART WRITTEN TO AVOID A MISCOUNT SHIPPED A MISCOUNT IN ITS FIRST DRAFT — CAUGHT BEFORE COMMIT, WHICH IS THE ONLY… | A, executed |
| [E-190](../CLAIMS.md#L250) | A GATE REFUSED ITS OWN EXTENSION, LOUDLY, AND THAT IS THE FIRST TIME IN THIS REPOSITORY. B-23's two new reverts named… | A, executed |
| [E-191](../CLAIMS.md#L251) | B-23's FALSIFIERS WERE VERIFIED BY BREAKING THEM, AND ONE OF THEM CATCHES LESS THAN ITS NAME SUGGESTS. Part 6 was… | A, executed |
| [E-192](../CLAIMS.md#L252) | A COMMENT IN THE B-23 BUILD CREDITED A BINDING WITH A DEFENCE THE BINDING DOES NOT PROVIDE — E-181's SHAPE, POINTING… | A, executed |
| [E-193](../CLAIMS.md#L253) | A TEST WRITTEN IN THIS SESSION TO PIN B-23's PARSE SWAP FALSE-PASSED, AND ONLY BREAKING THE CODE FOUND IT — E-164's… | A, executed |
| [E-194](../CLAIMS.md#L254) | A LEG'S FINDING WAS CORRECT, COMMITTED, AND NEVER ACTED ON — AND THE NEXT MILESTONE'S BUILD INHERITED THE DEFECT.… | A, executed |
| [E-195](../CLAIMS.md#L255) | B-23 REMOVED A DUPLICATE SEED DECODE FROM ONE FILE AND LEFT THE IDENTICAL ONE IN THE FILE ABOVE IT. REVIEW-029a finding… | A, executed |
| [E-196](../CLAIMS.md#L256) | A COMMENT CLAIMED A COMPILE-TIME FALSIFIER THAT DOES NOT EXIST, INSIDE THE FIX FOR A FINDING ABOUT CLAIMING MORE THAN… | A, executed |
| [E-197](../CLAIMS.md#L257) | THE IgnoredAny SWAP WAS NOT FULLY BEHAVIOUR-PRESERVING AND WAS DOCUMENTED AS THOUGH IT WERE. The old serde_json::Value… | A, executed |
| [E-198](../CLAIMS.md#L258) | A GATE BUILT TO CATCH FALSE PASSES FALSE-PASSED IN TWO NEW WAYS — FOURTH INSTANCE (E-165, E-168, E-182).… | A, executed |
| [E-199](../CLAIMS.md#L259) | THE HEADER FIXED FOR MISCOUNTING MISCOUNTED AGAIN — NINTH INSTANCE, AND ONLY ARITHMETIC ENDED IT. check-zeroize-bounds… | A, executed |
| [E-200](../CLAIMS.md#L260) | A COMMENT NAMED THE WRONG CRATE, AND A SECRET WENT UNWIPED BECAUSE OF IT. keygen::finish() binds sk from… | A, executed |
| [E-201](../CLAIMS.md#L261) | FOUR FALSE PASSES IN THE FIX ROUND FOR FALSE PASSES, AND ONE OF THEM WAS A TEST WRITTEN THIS SESSION. (1) Part 6's… | A, executed |
| [E-202](../CLAIMS.md#L262) | THE ONLY REAL FALSIFIER B-25 HAD FOR ITS OWN HEADLINE CLAIM WAS UNDEFINED BEHAVIOUR, AND ITS DOC COMMENT CONDEMNED… | A, measured |
| [E-203](../CLAIMS.md#L263) | FOURTH CONSECUTIVE ROUND IN WHICH A GATE BUILT TO CATCH FALSE PASSES FALSE-PASSED, AND THIRD IN WHICH THE REASON IS… | A, measured |
| [E-204](../CLAIMS.md#L264) | CLAUDE.md TOLD EVERY NEW SESSION THAT ARCHITECTURE §6 STEP 8 EXISTED, AND IT NEVER DID. The line read *"It is… | A, measured |
| [E-205](../CLAIMS.md#L265) | A DOC COMMENT CALLED Request::Status A *"PUBLIC LEDGER READ"* AND IT READS NO LEDGER. signer/src/protocol.rs documented… | A, measured |
| [E-206](../CLAIMS.md#L266) | D2's FOURTH REASON — *"the extension's codec does not know the XLS-0096 types, so it could not serialise a… | A, measured |
| [E-207](../CLAIMS.md#L267) | THE STEP-8 GATE'S FIRST RUN AGAINST THE REAL TREE CAUGHT PROSE, AND THE FIX IS A POLARITY DISTINCTION RATHER THAN AN… | A, measured |
| [E-208](../CLAIMS.md#L268) | Architecture §6 step 8 is BUILT and its observer view was EXERCISED AGAINST LIVE DEVNET STATE — F-1 demonstrated rather… | A, measured |
| [E-209](../CLAIMS.md#L269) | TWO DEFECTS THAT A CLEAN TYPE-CHECK, A CLEAN BUILD AND A PASSING GATE ALL MISSED, AND BOTH WERE FOUND BY LOADING THE… | A, measured |
| [E-210](../CLAIMS.md#L270) | The issuer view DECRYPTS, and the reason it did not was a comment that was wrong about its own repository.… | A, measured |
| [E-211](../CLAIMS.md#L271) | A FALSE DISCLOSURE SENTENCE SHIPPED ON THE OBSERVER PAGE, AND IT IS F-24's SHAPE A THIRD TIME. For any ciphertext not… | A, measured |
| [E-212](../CLAIMS.md#L272) | THE WEB TIER SHIPPED A DECRYPTION ORACLE, AND IT VIOLATED THE SCOPE THE SAME SESSION HAD WRITTEN HOURS EARLIER.… | A, measured |
| [E-213](../CLAIMS.md#L273) | TWO MORE DEFECTS THE GATE COULD NOT SEE, BECAUSE IT CHECKS REACHABILITY AND THESE WERE ABOUT EXPOSURE AND LIFETIME. (1)… | A, measured |
| [E-214](../CLAIMS.md#L274) | TWO REGRESSION TESTS COULD NOT REGRESS, AND BOTH WERE WRITTEN IN THE ROUND THAT ADDED THEM. (1) The KeySource coverage… | A, measured |
| [E-215](../CLAIMS.md#L275) | ROUND TWO OF THE CODEX REVIEW, AND THE HEADLINE IS THAT ROUND ONE'S FIX CREATED THE NEW P1 AND ROUND ONE'S NEW TEST… | A, measured |
| [E-216](../CLAIMS.md#L276) | THE SIX OPEN UPSTREAM FILINGS WERE AUDITED AT UPSTREAM HEAD ON 2026-09-01 AND EVERY CLAIM STILL STANDS. Re-verified… | A, measured |
| [E-217](../CLAIMS.md#L277) | A FILING PROTOCOL AND ITS GATE, RULED 2026-09-01 — AND THE GATE'S FIRST TWO BUGS WERE FOUND BY ITS OWN POSITIVE… | A, measured |
| [E-218](../CLAIMS.md#L278) | A SELF-REVIEW OF THE TWO FILING COMMANDS FOUND FOUR DEFECTS AND REPORTED THEM FIXED; AN INDEPENDENT PASS THEN FOUND SIX… | A, measured |
| [E-219](../CLAIMS.md#L279) | ROUND FOUR, AND TWO OF THE FOUR FINDINGS WERE DEFECTS IN ROUND THREE'S FIXES. (1) ONLY HALF THE HANDSHAKE WAS FIXED.… | A, measured |
| [E-220](../CLAIMS.md#L280) | STEP 8'S FIRST INDEPENDENT REVIEW — nine findings, no P1, and TWO WERE FUNCTIONAL BUGS THE WHOLE TEST SUITE MISSED. (1)… | A, measured |
| [E-221](../CLAIMS.md#L281) | ROUND TWO ON STEP 8: FIVE FINDINGS, AND FOUR WERE DEFECTS IN ROUND ONE'S FIXES. Exactly what CLAUDE.md's two-round rule… | A, measured |
| [E-222](../CLAIMS.md#L282) | THE README WAS REWRITTEN AND A FRESH-READER TEST CAUGHT A FALSE DISCLOSURE SENTENCE THE AUTHOR COULD NOT SEE — E-211's… | A, executed |
| [E-223](../CLAIMS.md#L283) | ROUND THREE ON THE README RETURNED TWO P1s THAT FIVE EARLIER LEGS HAD MISSED, AND THE BINDING CONSTRAINT WAS *ACCESS*,… | A, executed |
| [E-224](../CLAIMS.md#L284) | AN ADVERSARIAL LEG POINTED AT THE FIXES FOUND 14 DEFECTS, AND THE P1 IS A FALSE DISCLOSURE THE SIGNER SHOWED HOLDERS AT… | A, executed |
| [E-225](../CLAIMS.md#L285) | THE DISCLOSURE-PHRASE GATE IS BUILT, AND IT CAUGHT A LIVE ASSERTION ON ITS FIRST RUN — IN THE DOCUMENT DESCRIBING THE… | A, executed |
| [E-226](../CLAIMS.md#L286) | THE STEP-8 GATE CARRIED TWO SOCKET DETECTORS THAT DISAGREED, AND THE NARROWER ONE WAS WIRED TO THE WHOLE-TIER PROPERTY… | A, measured |
| [E-227](../CLAIMS.md#L287) | A FALSIFIER CONDITION NAMED IN THE ARCHITECTURE DOCUMENT HAD NO FALSIFIER. Architecture §6 step 8's *Falsified if:*… | A, measured |
| [E-228](../CLAIMS.md#L288) | THE WEB TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY IN TWO PLACES, EACH WITH A COMMENT SAYING WHY — AND… | A, measured |
| [E-229](../CLAIMS.md#L289) | A RECORDED P-12 SEARCH NO LONGER REPRODUCED: FIVE FILES, NOT THREE — FIFTEENTH INSTANCE OF A RESTATED NUMBER GOING… | A, measured |
| [E-230](../CLAIMS.md#L290) | ADR-0003's CENTRAL CLAIM WAS ADVERSARIALLY REVIEWED FOR THE FIRST TIME AND ALL FOUR LEGS RULED IT UNSOUND AS STATED.… | A, executed |
| [E-231](../CLAIMS.md#L291) | PART 6 CHECKED THE API'S BIND AND NOT THE DEV SERVER'S, AND THE DEV SERVER PROXIES /api — SO A 0.0.0.0 THERE WOULD HAVE… | A, measured |
| [E-232](../CLAIMS.md#L292) | THE DISCLOSURE-PHRASE GATE FALSE-PASSED ON THE EXACT SENTENCE IT HAD JUST BEEN EXTENDED TO CATCH, AND THE FIX PASS… | A, measured |
| [E-233](../CLAIMS.md#L293) | THE REWRITE INTRODUCED THREE DEFECTS OF ITS OWN, WHICH IS THE CLASS ROUND TWO EXISTS FOR. (1) A SELF-FALSIFICATION… | A, measured |
| [E-234](../CLAIMS.md#L294) | THE SOCKET FIX WAS WRITTEN AGAINST THE FINDING'S LIST RATHER THAN THE PROPERTY, THE DISCLOSURE GATE COULD NOT SEE THE… | A, measured |
| [E-235](../CLAIMS.md#L295) | ROUND TWO'S HEADLINE: THE TWO GATES ROUND ONE BUILT OR EXTENDED BOTH FALSE-PASSED — THE SEVENTH AND EIGHTH INSTANCES,… | A, measured |
| [E-236](../CLAIMS.md#L296) | A COUNT CORRECTED IN ROUND ONE WAS ALREADY FALSE IN THE COMMIT THAT CORRECTED IT — SIXTEENTH INSTANCE, INSIDE THE FIX… | A, measured |
| [E-237](../CLAIMS.md#L297) | THE NINTH FALSE-PASSING GATE, AND IT IS E-235's DEFECT REPRODUCED IN THE SIBLING FUNCTION TWENTY LINES AWAY, IN THE… | A, measured |
| [E-238](../CLAIMS.md#L298) | A NARROW CODEX SPOT-CHECK ON THREE DETECTORS RETURNED *broken* AND FOUND SIX MORE HOLES, INCLUDING ONE WHERE THE CHECK… | A, measured |
| [E-239](../CLAIMS.md#L299) | THE PUBLICATION ROTATION FOUND THE ENTRY POINTS HONEST AND THE INTERIOR NOT — AND IT RETRACTED THE ADJUDICATOR'S OWN… | A, measured |
| [E-240](../CLAIMS.md#L300) | THE Observed SECTION IS WITHHELD FROM THE PUBLIC TREE — RULED BY THE PROJECT OWNER 2026-09-05, REVERSING THIS PROJECT'S… | A, measured |
| [E-241](../CLAIMS.md#L301) | THE ISSUER ROUTE IS RULED AND THE DISCLOSURE IS REMOVED RATHER THAN GUARDED — OPTION 2, 2026-09-05. GET… | A, measured |
| [E-242](../CLAIMS.md#L302) | A REVIEW PACKET CALLED A PUBLISHED CRYPTOGRAPHY PAPER *"BROKEN"* AND THE FINDING DOES NOT SUPPORT IT. REVIEW-005b says… | A, measured |
| [E-243](../CLAIMS.md#L303) | CLAIMS.md HAD 24 BLANK LINES INSIDE ITS TABLES AND RENDERED AS ROUGHLY TWENTY SEPARATE FRAGMENTS — check-tables… | A, measured |
| [E-244](../CLAIMS.md#L304) | E-243'S FIX LEFT 96 ROWS STILL RENDERING OUTSIDE THE TABLES, AND check-tables REPORTED PASS — A FIX APPLIED TO THE… | A, measured |
| [E-245](../CLAIMS.md#L305) | CLAIMS.md NOW HAS TOPIC VIEWS, AND THEY ARE GENERATED VIEWS RATHER THAN A SPLIT — BECAUSE ABOUT HALF THE ROWS CARRY… | A, measured |
| [E-246](../CLAIMS.md#L306) | REVIEW-040 — FOUR LEGS ON THE BRANCH THAT FIXED E-243, AND THE WORST FINDING IS THAT THE JUSTIFICATION FOR ITS MAIN… | A, measured |
| [E-247](../CLAIMS.md#L307) | REVIEW-041 — ROUND TWO, TWO EXTERNAL LEGS, AND THE HEADLINE IS A FALSE PREMISE THE GATE WAS BUILT ON. IN A GFM TABLE A… | A, measured |
| [E-248](../CLAIMS.md#L308) | REVIEW-042 — ROUND THREE, RUN AGAINST GITHUB'S OWN PARSER, AND IT FOUND THAT ROUND TWO'S GFM FIX WAS ITSELF WRONG ABOUT… | A, measured |
| [E-249](../CLAIMS.md#L309) | CLAIMS.md's Revision history stopped being maintained on 2026-08-25 and nobody noticed for fifteen days. It was last… | A, measured |
| [E-250](../CLAIMS.md#L310) | The 2026-08-17 revision entry's body was deleted on 2026-08-18 by the commit that rewrote the paragraph around it, and… | A, source |
| [E-251](../CLAIMS.md#L311) | tools/check-emphasis.ts is built, and it caught four violations in the fifteen rows the session wrote under the… | A, measured |
| [E-252](../CLAIMS.md#L312) | CLAUDE.md carries a higher density than the register the discipline was measured from, and it was never sampled.… | A, measured |
| [E-253](../CLAIMS.md#L313) | A probe that verified the gate's cutoff passed for the wrong reason, and the exit code is what showed it. Raising the… | A, measured |
| [E-254](../CLAIMS.md#L314) | CLAUDE.md said bun test web/api is 89 tests and it is 129. It read as a live figure, was stale by 40, and was found by… | A, measured |
| [E-255](../CLAIMS.md#L315) | The five grades REVIEW-040 upheld were audited against their own evidence cells, and one kind was wrong. E-175 read A,… | A, source |
| [E-256](../CLAIMS.md#L316) | E-117's premises hold at source and one of its clauses was false from the commit that wrote it. The clause said… | A, source |
| [E-257](../CLAIMS.md#L317) | make check-zeroize-bounds mutates tracked signer sources for the ~2 minutes it runs, and a git status taken during that… | A, source |
| [E-258](../CLAIMS.md#L318) | REVIEW-043 found five defects in the emphasis gate and its harness, and the sharpest is that the harness could not tell… | A, measured |
| [E-259](../CLAIMS.md#L319) | REVIEW-044, round two, three legs with differed packets: the fixes carried a live false-pass, one defect a fix… | A, measured |
| [E-260](../CLAIMS.md#L320) | REVIEW-044's own fix for false-passing probes false-passed, and testing the fix is what found it. The needle check… | A, measured |
| [E-261](../CLAIMS.md#L321) | REVIEW-045, round three: the hand-written block splitter FALSE-PASSED six real over-800-character paragraphs, and the… | A, measured |
| [E-262](../CLAIMS.md#L322) | A handover edit was reported as applied and never reached the file. The script that wrote it raised on a later… | A, source |
| [E-263](../CLAIMS.md#L323) | Giving rule 6 to cmark-gfm made two of the harness's own probes stale, and the harness is the only thing that said so.… | A, measured |
| [E-264](../CLAIMS.md#L324) | The emphasis-gate rotation STOPS at three rounds, which departs from CLAUDE.md's rule, and the owner ruled it on… | A, reasoned |
| [E-265](../CLAIMS.md#L325) | The /tmp cleaner took /tmp/wconf overnight for the third time, and the backup paid for itself. state.json — the Devnet… | A, executed |
| [E-266](../CLAIMS.md#L326) | The Dedicated Account's seed confers two powers and E-117 names only one. Power 1 is movement: drawdown or retire the… | A, source |
| [E-267](../CLAIMS.md#L327) | CLAIMS.md's revision history is DERIVED from git as of 2026-09-11, and building it manufactured a defect that did not… | A, measured |
| [E-268](../CLAIMS.md#L328) | A generated file whose input includes its own commit has NO FIXPOINT — FALSE AS STATED, and corrected the next day by… | A, measured |
| [E-269](../CLAIMS.md#L329) | Two concurrent runs of check-zeroize-bounds corrupt source, and the second is now refused. The gate's backups are file… | A, measured |
| [E-270](../CLAIMS.md#L330) | check-zeroize-bounds takes ~2 minutes or ~28 depending only on what ran before it, and nothing said so. Part 2 builds… | A, measured |
| [E-271](../CLAIMS.md#L331) | An external review of this session's own work upheld five findings, and the sharpest refuted a row written the day… | A, measured |
| [E-272](../CLAIMS.md#L332) | Round two on the same work: the concurrency lock was wrong TWICE, and a retired sentence came back because a GENERATOR… | A, measured |
| [E-273](../CLAIMS.md#L333) | A retired sentence that lives in a GENERATOR regenerates, so fixing the behaviour and leaving the template reinstates… | A, measured |
| [E-274](../CLAIMS.md#L334) | The two-commit workflow this gate prescribes made its own generator NON-IDEMPOTENT, and --check could not see the loop.… | A, measured |
| [E-275](../CLAIMS.md#L335) | Every check in the revision gate read committed git objects, so deleting a row before committing reported PASS. That is… | A, measured |
| [E-276](../CLAIMS.md#L336) | A Set at the parse layer hid a whole class of defect, and every instrument in the revision gate was built on that one… | A, measured |
| [E-277](../CLAIMS.md#L337) | The handover cited a commit that does not exist, one section below the paragraph where a fabricated sha had already… | A, measured |
| [E-278](../CLAIMS.md#L338) | The custody request overpriced its own recommendation by turning a recommendation into a refusal. It said hardening the… | A, source |
| [E-279](../CLAIMS.md#L339) | Two valid git settings crashed the revision tool, and the fix went to the producer rather than the four call sites.… | A, measured |
| [E-280](../CLAIMS.md#L340) | GIT_DIR BEATS cwd, so the revision tool's synthetic probe wrote its configuration into a FOREIGN repository — measured,… | A, measured |
| [E-281](../CLAIMS.md#L341) | The custody request's summary paragraph contradicted the option it had just corrected, two sentences later. E-278 split… | A, source |
| [E-282](../CLAIMS.md#L342) | The DENYLIST written to fix GIT_DIR missed GIT_CONFIG one round later, so it is an ALLOWLIST now. GIT_CONFIG redirects… | A, measured |
| [E-283](../CLAIMS.md#L343) | A quorum is not a second holder, and the custody request called it one. A SignerList whose quorum exceeds every… | A, source |
| [E-284](../CLAIMS.md#L344) | SIGHUP STRANDED A REVERTED SOURCE FILE, and the gate's own output promised the opposite. check-zeroize-bounds handled… | A, measured |
| [E-285](../CLAIMS.md#L345) | The mutation lock had no falsifier, and building one found a hole in the lock and a flaw in the harness. Ordinary runs… | A, measured |
| [E-286](../CLAIMS.md#L346) | The falsifier built last round could not see the regression it exists for. Its holder took the inode lock and mutated… | A, measured |
| [E-287](../CLAIMS.md#L347) | check-zeroize-bounds leaked a temporary directory per run, and 110 of them had accumulated before anyone counted. One… | A, measured |
| [E-288](../CLAIMS.md#L348) | CLAIMS.md's Findings heading says *"file upstream before publishing"*, and 12 of its 29 rows are upstream-directed with… | A, row by row |
| [E-289](../CLAIMS.md#L349) | The repository's history carries none of the 19 live Devnet secret values held outside the tree, and it does carry… | A on the named… |
| [E-290](../CLAIMS.md#L350) | The custody decision request priced the wrong set of credentials, and its first review round of its own withdrew its… | A, source; the lock… |
| [E-291](../CLAIMS.md#L351) | The custody request's reassurance about its own seed was false: the Dedicated Account's seed is in a 0644 file, and the… | A, measured |
| [E-292](../CLAIMS.md#L352) | Two records in the custody material did not reproduce, and the round's own self leg made the kind of error the round… | A, measured |
| [E-293](../CLAIMS.md#L353) | The facility now writes its seeds, the issuer's secret and its book as 0600 files, and deletes each signer profile once… | A, measured |
| [E-294](../CLAIMS.md#L354) | The project owner ruled B-27 and part of B-28 on 2026-09-13, and the custody ruling is built as a disclosure printed on… | A, recorded and tested |
| [E-295](../CLAIMS.md#L355) | Round two on the custody fixes found no further power over the float, and its Codex leg disagreed. REVIEW-047 ran three… | A, source and measured… |
| [E-296](../CLAIMS.md#L356) | F-19's defect CLASS is not new. Trail of Bits' April 2026 report already raises it, the fix review does not track it,… | A, read at source |
| [E-297](../CLAIMS.md#L357) | F-8 is fixed in upstream's SOURCE TREE. The BSGS decrypt function mpt-crypto's documentation pointed to exists from tag… | A, read at source;… |
| [E-298](../CLAIMS.md#L358) | The owner ruled F-19 not-to-file on 2026-09-14, and issue #7 is closed. F-8 and F-18 are recorded as not-to-file… | A, recorded |
| [E-299](../CLAIMS.md#L359) | Three of the five mpt-crypto re-checks — F-7, F-12 and F-18, against F-9's and F-15's runs — are readings, not runs.… | A, read at source;… |
| [E-300](../CLAIMS.md#L360) | F-9 still reproduces at upstream HEAD, and it was run, but its shape has changed. The setup mpt-crypto's README links… | A, executed |
| [E-301](../CLAIMS.md#L361) | F-15's *"cannot be obtained from the published API at all"* is false for @xrplf/mpt-crypto 0.1.0 and 0.1.1. The package… | A, executed |
| [E-302](../CLAIMS.md#L362) | The owner ruled four more of E-288's 12 on 2026-09-14: F-7 and F-15 are not-to-file, and F-9 and F-12 are to be filed.… | A, recorded |
| [E-303](../CLAIMS.md#L363) | F-11 still holds at rippled develop, on reading. ConfidentialMPTClawback has no pseudo-account guard, and ordinary… | A, read at source |
| [E-304](../CLAIMS.md#L364) | F-13 still holds at both upstream HEADs, on reading, and XLS-0096's field layout matches rippled's rather than the… | A, read at source;… |
| [E-305](../CLAIMS.md#L365) | F-16 is overtaken upstream, and Devnet now refuses the construction it recorded. Re-run on Devnet on 2026-09-14, a… | A, executed |
| [E-306](../CLAIMS.md#L366) | F-17 still holds at mpt-crypto 1.0.5, on reading, and so does its note that the implementation is not affected — on the… | A, read at source |
| [E-307](../CLAIMS.md#L367) | F-21's refusal still reproduces on Devnet, but its headline is too broad, because xrpl.org states the rule and lists… | A, executed |
| [E-308](../CLAIMS.md#L368) | The owner ruled the last five of E-288's 12 on 2026-09-14. F-11, F-16 and F-21 are not-to-file, and F-13 and F-17 are… | A, recorded |
| [E-309](../CLAIMS.md#L369) | The owner ruled the shape of publication on 2026-09-22: a read-only hosted demo, a squashed public history, the four… | A, recorded |
| [E-310](../CLAIMS.md#L370) | REVIEW-048 reviewed E-296 to E-307 with three differed legs and upheld seventeen findings, rejected two and withdrew… | A, recorded |
| [E-311](../CLAIMS.md#L371) | REVIEW-049, round two on REVIEW-048's fixes, upheld eight findings and its stopping condition fired: three were… | A, recorded |
| [E-312](../CLAIMS.md#L372) | REVIEW-050, the narrow third round the owner ruled, found five more surviving copies, all fixed, and the E-296 to E-307… | A, recorded |
| [E-313](../CLAIMS.md#L373) | The four findings ruled to file all hold at upstream HEAD on 2026-09-22. F-9's remedy is a remote migration that clio… | A, run and read |
| [E-314](../CLAIMS.md#L374) | F-9 is filed as mpt-crypto#148, the first filing to run rule 1's review before it was sent. The draft was written with… | A, run and read |
| [E-315](../CLAIMS.md#L375) | F-17, F-12 and F-13 are filed, as mpt-crypto#153, #154 and #155, and the four findings ruled to file are all sent,… | A, run and read |
| [E-316](../CLAIMS.md#L376) | Four of the 2026-08-26 filings were resolved upstream in September, in the merged XLS-0096 and the docs page, and the… | A, read at source |
| [E-317](../CLAIMS.md#L377) | The phase 1 secret sweep is a gate, make check-no-secrets, and its first run found no stored secret, no credential and… | A, executed |
| [E-318](../CLAIMS.md#L378) | REVIEW-056 round one found 13 defects in make check-no-secrets, and the gate's own controls had caught none of them.… | A, executed |
| [E-319](../CLAIMS.md#L379) | The four Devnet transactions the README offers a stranger can no longer be fetched from the public Devnet endpoint, and… | A, executed |
| [E-320](../CLAIMS.md#L380) | REVIEW-056 round two found that three of round one's fixes covered their example and not their class, and that two… | A, executed |
| [E-321](../CLAIMS.md#L381) | REVIEW-056 round three, the last by the owner's ruling, found that four of round two's fixes still missed members of… | A, executed |
| [E-322](../CLAIMS.md#L382) | The README failed the owner's /claims-check on 2026-10-18 on claims that had gone stale, and the same stale claims… | A, read at source |
| [E-323](../CLAIMS.md#L383) | REVIEW-057, one Codex leg on the phase 1 publication plan before any step ran, found that the plan as the owner ruled… | A, measured |
| [E-324](../CLAIMS.md#L384) | Step 1's inventory found six third-party projects reproduced in the tracked tree, and NOTICE is written from it rather… | A, measured |
| [E-325](../CLAIMS.md#L385) | REVIEW-057 round two reviewed round one's fixes, the push guard and step 1's inventory, found 12 defects, four of them… | A, measured |
| [E-326](../CLAIMS.md#L386) | REVIEW-057 round three, the last plan round the owner's hook allows, broke the redesigned guard five more ways and the… | A, measured |
| [E-327](../CLAIMS.md#L387) | The hosted demo is scoped as architecture §6 step 9 and ADR-0004, Proposed, and its design rests on measurements taken… | A, measured |
| [E-328](../CLAIMS.md#L388) | REVIEW-058 round one reviewed ADR-0004 with three differed legs and found its central sentence false, a gap in the… | A, measured |
| [E-329](../CLAIMS.md#L389) | REVIEW-058 round two reviewed round one's fixes and its stopping condition fired: three fixes had not discharged their… | A, measured |
| [E-330](../CLAIMS.md#L390) | REVIEW-058 round three, the last the owner's review policy allows, found six more defects in round two's fixes, and the… | A, measured |
| [E-331](../CLAIMS.md#L391) | The project owner ruled ADR-0004's four decisions on 2026-10-19, each as recommended, and the ADR is Accepted at… | A, recorded |
| [E-332](../CLAIMS.md#L392) | The public-update procedure ran the third-party inventory before git add, and the inventory reads only tracked files,… | A, measured |
| [E-333](../CLAIMS.md#L393) | vite's only root licence file aggregates the licences of everything it bundles and carries 35 personal email addresses,… | A, measured |

## Pending — asserted, not yet supportable — 30 rows

| id | summary | grade |
|---|---|---|
| [B-21](../CLAIMS.md#L401) | Secret material on the stack is not wiped: the SHA-512 expansion, the nonce mask, and fresh_aux's 32-byte buffer. BUILT… | CLOSED as a build.… |
| [B-22](../CLAIMS.md#L402) | The KEY-DERIVATION path leaves secret material unwiped, and B-21 deliberately did not cover it. sha512half is used for… | 268 tests at B-22;… |
| [B-23](../CLAIMS.md#L403) | The seed's residue in holder.rs — the second half of B-22's ruled unit, IN SCOPE and NOT deferred. REVIEW-029c ruling… | BUILT AND EXECUTED… |
| [B-24](../CLAIMS.md#L404) | REVIEW-031's fixes — the seed residue B-23 left, and the gate that could not see it. The HIGH finding is that… | BUILT 2026-08-28. The… |
| [B-25](../CLAIMS.md#L405) | REVIEW-032's fixes — the derived ElGamal secret, and the pin that did not pin. The HIGH is that keygen::finish() never… | BUILT 2026-08-28. The… |
| [B-26](../CLAIMS.md#L406) | REVIEW-033's fixes — the falsifier that was UB, and the gate's fourth round of false passes. The HIGH is that… | BUILT 2026-08-28. The… |
| [B-27](../CLAIMS.md#L407) | RULED 2026-09-13 by the project owner (E-294). The question was: who holds the Dedicated Account's key, and what the… | A ruling by the… |
| [B-28](../CLAIMS.md#L408) | Whether this repository becomes public, for what purpose, and in which form. Ruled in part on 2026-09-13 (E-294): it… | A ruling by the… |
| [B-29](../CLAIMS.md#L409) | BUILT 2026-09-13 (E-293). The facility writes its seeds, the issuer's ElGamal secret and its plaintext book with no… | An explicit 0600 on… |
| [B-30](../CLAIMS.md#L410) | Anything about what the Sherlock XRP Ledger Attackathon found, beyond the findings upstream cites by number in public… | NOT OBTAINABLE, and… |
| [B-31](../CLAIMS.md#L411) | Anything about what the Zellic scan of mpt-crypto 3baaaac found, beyond the three findings mpt-crypto#147 cites by… | NOT OBTAINABLE, and… |
| [B-20](../CLAIMS.md#L412) | The deterministic signing arm is pub in an ordinary release build, and only a doc comment says it is for vectors.… | CLOSED, with a REAL… |
| [B-19](../CLAIMS.md#L413) | ed25519-dalek is configured default-features = false, features = ["std"], so zeroize is OFF. THAT PREMISE IS FALSE —… | CLOSED → docs/decision… |
| [B-17](../CLAIMS.md#L414) | Whether the signer should preflight terFROZEN, and what exactly it would have to read. XLS-0096 §10.4.2 item 9 refuses… | Raised 2026-08-25 by… |
| [B-18](../CLAIMS.md#L415) | LARGELY CLOSED 2026-08-25 → E-146, E-149, F-27. What remains is narrower and is stated at the end of this row. rippled… | A loopback rippled… |
| [B-15](../CLAIMS.md#L416) | AMENDED AGAIN 2026-08-25 → E-151: the named risk acceptance is EXTENDED to the facility's Devnet demo, because Option A… | RESOLVED → REVIEW-019-… |
| [B-16](../CLAIMS.md#L417) | The ed25519 signing nonce — B-14's other half, and the LIVE path. RULED 2026-08-27 → E-158. BUILT AND EXECUTED the same… | CLOSED as a build →… |
| [B-14](../CLAIMS.md#L418) | Where the transaction's own ECDSA signing nonce k comes from — a fifth randomness site, and no packet has covered it.… | RESOLVED → REVIEW-018-… |
| [B-12](../CLAIMS.md#L419) | Whether XLS-0096 anywhere states that the ElGamal encryption randomness r must not be reused across transactions | RESOLVED 2026-08-18 →… |
| [B-13](../CLAIMS.md#L420) | Anything about what the Trail of Bits May 2026 revision audit says, beyond the two findings upstream cites by identifier | NOT OBTAINABLE, and… |
| [B-1](../CLAIMS.md#L421) | Bulletproof proving ~44.8 ms, verification ~22.6 ms | RESOLVED 2026-08-16 →… |
| [B-2](../CLAIMS.md#L422) | "ConfidentialTransfer is not enabled on Mainnet" | RESOLVED 2026-08-16 →… |
| [B-3](../CLAIMS.md#L423) | "The Confidential Devnet has ConfidentialTransfer, PermissionedDomains and SingleAssetVault enabled" | RESOLVED 2026-08-16 →… |
| [B-4](../CLAIMS.md#L424) | "MPTokensV1 activated in October 2025" | Secondary coverage… |
| [B-5](../CLAIMS.md#L425) | "rippled 3.3.0 released ~2026-08-07, voting under way" | Secondary coverage… |
| [B-6](../CLAIMS.md#L426) | Anything about computational vs unconditional hiding in XLS-96 | ePrint 2026/602… |
| [B-7](../CLAIMS.md#L427) | Any statement about what the 192-byte sigma proof proves — including ADR-0001's premise that balance linkage requires… | RESOLVED 2026-08-16 →… |
| [B-9](../CLAIMS.md#L428) | Confidential transaction metadata stays within kOversizeMetaDataCap = 5200 | RESOLVED 2026-08-17 →… |
| [B-10](../CLAIMS.md#L429) | Scheduled cover traffic conceals drawdown frequency | Not blocked — E-22… |
| [B-11](../CLAIMS.md#L430) | XLS-96 and XLS-66 provide no encrypted loan accounting as at rippled 3.3.0, and adding it would require a new proof… | Rewritten 2026-08-17… |

## Findings — verified, file upstream before publishing — 29 rows

| id | summary | grade |
|---|---|---|
| [F-1](../CLAIMS.md#L444) | Docs claim the reset inbox value is indistinguishable; it is the canonical EncZero, recomputable by any observer from… | A |
| [F-2](../CLAIMS.md#L445) | Spec §13.2.2's "separate view keys" have no ledger field. Protocol layer: issuer keys are permanent. Operational layer:… | A / B |
| [F-3](../CLAIMS.md#L446) | Docs say confidentiality can be toggled on and off; spec and transactor have no clear flag | A |
| [F-4](../CLAIMS.md#L447) | Docs say clawback resets the version counter to 0; it increments | A |
| [F-5](../CLAIMS.md#L448) | Spec §11.1 names a RevealedAmount field that does not exist; the field is sfMPTAmount | A |
| [F-6](../CLAIMS.md#L449) | Spec §11.2 says clawed-back funds go to the issuer's reserve; §11/§11.4 and the transactor say burned | A |
| [F-7](../CLAIMS.md#L450) | The 1,000,000 decryption "bound" is not a bound. It is a caller-supplied window [range_low, range_high]; the audit's… | A |
| [F-8](../CLAIMS.md#L451) | mpt-crypto documents an escape hatch that does not exist. secp256k1_mpt.h:73 directs callers needing larger ranges to… | A |
| [F-9](../CLAIMS.md#L452) | mpt-crypto's committed conan.lock cannot be resolved from public remotes does not resolve from conancenter, or from the… | A |
| [F-10](../CLAIMS.md#L453) | LendingProtocol and ConfidentialTransfer are silently non-composable. Both are enabled on the same network. A… | A on the executed… |
| [F-11](../CLAIMS.md#L454) | ConfidentialMPTClawback has no pseudo-account guard, where ordinary Clawback returns tecPSEUDO_ACCOUNT. Unreachable by… | A |
| [F-17](../CLAIMS.md#L455) | cmpt-compact-sigma.pdf Remark 6.1's stated justification is false, and a reader who trusts it builds a key-extraction… | A |
| [F-18](../CLAIMS.md#L456) | The published Rust FFI crate silently links an mpt-crypto four tag-generations behind rippled's, and it is not on the… | B — read, no Rust… |
| [F-24](../CLAIMS.md#L457) | Our own facility walkthrough understates what a ConvertBack publishes. FACILITY-WALKTHROUGH-2026-08-20.md §3 step 9… | A, executed |
| [F-25](../CLAIMS.md#L458) | tapFailHard cannot be bound into a transaction. It is a submission-time choice, and only the submitter can make it.… | A (E-162) |
| [F-26](../CLAIMS.md#L459) | The facility walkthrough's *"After this, no plaintext amount appears again until the facility is retired or resized"*… | A on the reading, NOT… |
| [F-27](../CLAIMS.md#L460) | ConfidentialMPTConvert deposits into the holder's INBOX, not into their spendable balance — a ConfidentialMPTMergeInbox… | A, executed |
| [F-28](../CLAIMS.md#L461) | tapFailHard stops a tec reaching the LEDGER. It does not stop the ciphertext reaching the NODE you submitted to — and… | A on the reading, NOT… |
| [F-23](../CLAIMS.md#L462) | A wrong ledger read is a CONFIDENTIALITY break, not a rejected transaction — and the signer cannot control which. A… | A, executed |
| [F-22](../CLAIMS.md#L463) | This project's own signer built a four-participant proof and serialised three ciphertexts, and no test or Devnet run… | A (E-162) |
| [F-21](../CLAIMS.md#L464) | Devnet rejects a transaction that carries an explicit NetworkID, and nothing a signer author reads says which networks… | A, executed (E-162) |
| [F-19](../CLAIMS.md#L465) | mpt-crypto's exported PoK API makes account binding optional, and the public header does not say so.… | A (E-162) |
| [F-20](../CLAIMS.md#L466) | REVIEW-012-RULING-keygen's domain-separation table named a label family that does not exist. Its row for r/ρ read *"the… | A |
| [F-16](../CLAIMS.md#L467) | A LoanSet in which both parties signed the same pre-CounterpartySignature payload was accepted, first attempt. The… | A |
| [F-12](../CLAIMS.md#L468) | mpt-crypto's shipped WASM build script fails at emsdk 6.0.6 and succeeds at its CI-pinned 6.0.2.… | A |
| [F-13](../CLAIMS.md#L469) | cmpt-compact-sigma.pdf §2.1's "transmitted once on-chain" is not true of rippled 3.3.0. The paper's Table 2 totals a… | A |
| [F-15](../CLAIMS.md#L470) | The published JS wrapper makes the tight-window decryption optimisation unreachable keeps the tight-window decryption… | A on the API shape;… |
| [F-14](../CLAIMS.md#L471) | tecINSUFFICIENT_FUNDS misattributes the cause when a holder's balance is partly confidential — on vault AND lending… | A, executed (E-162) |
| [F-29](../CLAIMS.md#L472) | XLS-0096 §7.4 states the MPToken deletion blocker unconditionally; rippled enforces it through two paths that disagree.… | A, not executed |

## Retracted — 6 rows

| id | summary | grade |
|---|---|---|
| [R-1](../CLAIMS.md#L488) | TASK ZERO §9 rev 1: the restructured facility "shows nothing about which supplier drew how much" | Found independently… |
| [R-2](../CLAIMS.md#L489) | ADR-0001 rev 1: local proving is "the only option under which the confidentiality claim is true" | Conflated custody… |
| [R-3](../CLAIMS.md#L490) | F-3: "docs say confidentiality can be toggled on and off" | Corrected upstream.… |
| [R-4](../CLAIMS.md#L491) | F-4: "docs say clawback resets the version counter" | Not a doc error.… |
| [R-6](../CLAIMS.md#L492) | B-11 / ADR-0002 blocker 3 / investigation §12: that encrypted loan accounting is structurally blocked, because XLS-96's… | The mathematics was… |
| [R-5](../CLAIMS.md#L493) | TASK ZERO §9: the vault converts the whole facility float in one transaction | The retraction was… |
