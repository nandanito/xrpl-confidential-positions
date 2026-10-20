# Upstream, libraries and filings

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

rippled, mpt-crypto and the published packages — findings raised upstream and the build friction behind them.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**65 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [E-1](../../../CLAIMS.md#L41) | Established | XLS-0096 authors: Cenk, Malhotra, Akinyele, Chen, Xie, Qian; status Draft, created 2026-01-15. Superseded upstream on 2026-09-03. XLS-0096 PR #604,… | A |
| [E-14](../../../CLAIMS.md#L55) | Established | mpt-crypto is C/C++; 0.4.0-rc4 in rippled 3.3.0. no bindings, no WASM target, no published package PARTLY SUPERSEDED 2026-08-16 → E-31. A WASM target… | A |
| [E-18](../../../CLAIMS.md#L59) | Established | An MPToken cannot be deleted once confidential fields are initialised, even at zero balance. Superseded upstream on 2026-09-03. XLS-0096 PR #604… | A |
| [E-26](../../../CLAIMS.md#L67) | Established | ConfidentialTransfer, PermissionedDomains and SingleAssetVault are all enabled on standard Devnet (network_id 2, rippled 3.3.0) as at 2026-08-16.… | A |
| [E-27](../../../CLAIMS.md#L68) | Established | mpt-crypto 0.4.0-rc4 (the version rippled 3.3.0 pins), 1.0.0 and 1.0.1 are the same commit, 48a3cfe4be2122b77c2baec079353c5d35cce785 | A |
| [E-28](../../../CLAIMS.md#L69) | Established | mpt-crypto builds clean and 11/11 tests pass on macOS 26.6.1 / arm64 / Apple clang 21, in 6.20 s — after adding the Ripple Conan remote | A |
| [E-31](../../../CLAIMS.md#L72) | Established | mpt-crypto has a WASM build in CI (.github/workflows/build-wasm.yml, .github/scripts/build-wasm.sh) emitting dual CJS+ESM glue for web,node,… | A |
| [E-32](../../../CLAIMS.md#L73) | Established | The @xrplf/mpt-crypto npm package referenced by that build script is not published as at 2026-08-16 | Superseded |
| [E-36](../../../CLAIMS.md#L77) | Established | XLS-96 deliberately rejected twisted ElGamal. Under compact form its size advantage shrinks from 292 B to an irreducible 64 B — structural, arising… | A |
| [E-45](../../../CLAIMS.md#L96) | Established | The end-to-end client path works. A ConfidentialMPTConvert was constructed, proved, signed and accepted by standard Devnet from outside rippled's… | A |
| [E-47](../../../CLAIMS.md#L98) | Established | mpt-crypto's WASM build works end to end and agrees bit-for-bit with a native build | A |
| [E-48](../../../CLAIMS.md#L99) | Established | mpt-crypto's sigma nonces are hedged, not deterministic. | A on the construction… |
| [E-53](../../../CLAIMS.md#L103) | Established | @xrplf/mpt-crypto@0.1.0 is published and it works. | A, executed |
| [E-54](../../../CLAIMS.md#L104) | Established | Upstream is building native libraries for Rust and Python consumers. | A on the intent, GAP… |
| [E-55](../../../CLAIMS.md#L105) | Established | Under WASM, sigma-proof randomness comes from the host. | A |
| [E-56](../../../CLAIMS.md#L106) | Established | F-9 was bypassed for local macOS compilation; it remains blocking for the documented contributor path. | A on "this host was… |
| [E-57](../../../CLAIMS.md#L107) | Established | GAP-11 closed. The Rust path for ADR-0001's signer already exists upstream and is published. | A on existence and… |
| [E-60](../../../CLAIMS.md#L111) | Established | A ConfidentialMPTSend whose sigma nonces this project derived — not mpt-crypto's — was accepted on Devnet. | A, executed |
| [E-61](../../../CLAIMS.md#L112) | Established | Path A is installable, and cheaper than issue #2 costed it: the Rust FFI crate does not need forking. | B — read, not executed… |
| [E-64](../../../CLAIMS.md#L115) | Established | r and ρ are caller-owned, so whatever the third packet rules for them needs no upstream change and has no FFI problem. | A |
| [E-66](../../../CLAIMS.md#L117) | Established | The XLS-96 registration PoK IS bound to the account, so a registration proof is not copyable to another account. Issue #4 closed, and §(b)'s… | A, read |
| [E-70](../../../CLAIMS.md#L121) | Established | Two standing ambiguities about the vendored fork, closed by direct check. | A on (a), executed; B… |
| [E-80](../../../CLAIMS.md#L131) | Established | The vendored prover is wired into the signer, and the pristine upstream verifier accepts proofs the signer produces. | A, executed |
| [E-81](../../../CLAIMS.md#L132) | Established | The signer links the PATCHED library or does not link at all, and binds to the pinned headers or does not build. | A, executed |
| [E-82](../../../CLAIMS.md#L133) | Established | The Rust FFI struct layouts and by-value ABI are checked against the vendored header by the C compiler, not by hand. | A, executed |
| [E-109](../../../CLAIMS.md#L160) | Established | B-14 ruled and implemented: the transaction's ECDSA nonce is hedged, because the issue #1 ruling extends to it. | A, executed |
| [E-121](../../../CLAIMS.md#L172) | Established | Issue #11's two untested conditions now branch, and the third irreversible act of onboarding reaches the confirmation screen. | A, executed |
| [E-155](../../../CLAIMS.md#L215) | Established | The project's second stated output stopped being zero: five items filed upstream 2026-08-26, and re-verification removed three of the eleven that… | A, executed |
| [E-156](../../../CLAIMS.md#L216) | Established | AN EXTERNAL LEG FOUND 13 DEFECTS IN THE FIVE FILINGS AFTER MY OWN REVIEW FOUND 3, AND THE WORST WAS IN THE POSITIVES. | A, executed |
| [E-157](../../../CLAIMS.md#L217) | Established | Second filing round, and the first one run in the right order. | A, executed |
| [E-216](../../../CLAIMS.md#L276) | Established | THE SIX OPEN UPSTREAM FILINGS WERE AUDITED AT UPSTREAM HEAD ON 2026-09-01 AND EVERY CLAIM STILL STANDS. | A, measured |
| [E-217](../../../CLAIMS.md#L277) | Established | A FILING PROTOCOL AND ITS GATE, RULED 2026-09-01 — AND THE GATE'S FIRST TWO BUGS WERE FOUND BY ITS OWN POSITIVE CONTROL. | A, measured |
| [E-218](../../../CLAIMS.md#L278) | Established | A SELF-REVIEW OF THE TWO FILING COMMANDS FOUND FOUR DEFECTS AND REPORTED THEM FIXED; AN INDEPENDENT PASS THEN FOUND SIX MORE — INCLUDING ONE THE… | A, measured |
| [E-288](../../../CLAIMS.md#L348) | Established | CLAIMS.md's Findings heading says *"file upstream before publishing"*, and 12 of its 29 rows are upstream-directed with neither a filing nor a… | A, row by row |
| [E-296](../../../CLAIMS.md#L356) | Established | F-19's defect CLASS is not new. Trail of Bits' April 2026 report already raises it, the fix review does not track it, and upstream mpt-crypto has not… | A, read at source |
| [E-297](../../../CLAIMS.md#L357) | Established | F-8 is fixed in upstream's SOURCE TREE. The BSGS decrypt function mpt-crypto's documentation pointed to exists from tag 1.0.5, so on present evidence… | A, read at source;… |
| [E-298](../../../CLAIMS.md#L358) | Established | The owner ruled F-19 not-to-file on 2026-09-14, and issue #7 is closed. F-8 and F-18 are recorded as not-to-file because upstream overtook both,… | A, recorded |
| [E-299](../../../CLAIMS.md#L359) | Established | Three of the five mpt-crypto re-checks — F-7, F-12 and F-18, against F-9's and F-15's runs — are readings, not runs. F-7's and F-12's conditions are… | A, read at source;… |
| [E-300](../../../CLAIMS.md#L360) | Established | F-9 still reproduces at upstream HEAD, and it was run, but its shape has changed. The setup mpt-crypto's README links adds a remote without the… | A, executed |
| [E-301](../../../CLAIMS.md#L361) | Established | F-15's *"cannot be obtained from the published API at all"* is false for @xrplf/mpt-crypto 0.1.0 and 0.1.1. The package exports loadWasmModule, and… | A, executed |
| [E-303](../../../CLAIMS.md#L363) | Established | F-11 still holds at rippled develop, on reading. ConfidentialMPTClawback has no pseudo-account guard, and ordinary Clawback still has one. | A, read at source |
| [E-304](../../../CLAIMS.md#L364) | Established | F-13 still holds at both upstream HEADs, on reading, and XLS-0096's field layout matches rippled's rather than the paper's. | A, read at source;… |
| [E-305](../../../CLAIMS.md#L365) | Established | F-16 is overtaken upstream, and Devnet now refuses the construction it recorded. | A, executed |
| [E-306](../../../CLAIMS.md#L366) | Established | F-17 still holds at mpt-crypto 1.0.5, on reading, and so does its note that the implementation is not affected — on the utility path, and with a… | A, read at source |
| [E-309](../../../CLAIMS.md#L369) | Established | The owner ruled the shape of publication on 2026-09-22: a read-only hosted demo, a squashed public history, the four filings first, and everything… | A, recorded |
| [E-313](../../../CLAIMS.md#L373) | Established | The four findings ruled to file all hold at upstream HEAD on 2026-09-22. F-9's remedy is a remote migration that clio and rippled made and mpt-crypto… | A, run and read |
| [E-314](../../../CLAIMS.md#L374) | Established | F-9 is filed as mpt-crypto#148, the first filing to run rule 1's review before it was sent. | A, run and read |
| [E-315](../../../CLAIMS.md#L375) | Established | F-17, F-12 and F-13 are filed, as mpt-crypto#153, #154 and #155, and the four findings ruled to file are all sent, which is phase 0's exit. | A, run and read |
| [E-316](../../../CLAIMS.md#L376) | Established | Four of the 2026-08-26 filings were resolved upstream in September, in the merged XLS-0096 and the docs page, and the register did not know until a… | A, read at source |
| [B-28](../../../CLAIMS.md#L413) | Pending | Whether this repository becomes public, for what purpose, and in which form. | A ruling by the… |
| [B-31](../../../CLAIMS.md#L416) | Pending | Anything about what the Zellic scan of mpt-crypto 3baaaac found | NOT OBTAINABLE, and… |
| [B-14](../../../CLAIMS.md#L423) | Pending | Where the transaction's own ECDSA signing nonce k comes from — a fifth randomness site, and no packet has covered it. RULED 2026-08-20 → E-109. Two… | RESOLVED → REVIEW-018-… |
| [B-13](../../../CLAIMS.md#L425) | Pending | Anything about what the Trail of Bits May 2026 revision audit says | NOT OBTAINABLE, and… |
| [B-5](../../../CLAIMS.md#L430) | Pending | "rippled 3.3.0 released ~2026-08-07, voting under way" | Secondary coverage… |
| [B-10](../../../CLAIMS.md#L434) | Pending | Scheduled cover traffic conceals drawdown frequency | Not blocked — E-22… |
| [B-11](../../../CLAIMS.md#L435) | Pending | XLS-96 and XLS-66 provide no encrypted loan accounting as at rippled 3.3.0 | Rewritten 2026-08-17… |
| [F-8](../../../CLAIMS.md#L456) | Findings | mpt-crypto documents an escape hatch that does not exist. | A |
| [F-9](../../../CLAIMS.md#L457) | Findings | mpt-crypto's committed conan.lock cannot be resolved from public remotes does not resolve from conancenter, or from the remote rippled's setup adds… | A |
| [F-18](../../../CLAIMS.md#L461) | Findings | The published Rust FFI crate silently links an mpt-crypto four tag-generations behind rippled's, and it is not on the mainline branch. | B — read, no Rust… |
| [F-19](../../../CLAIMS.md#L470) | Findings | mpt-crypto's exported PoK API makes account binding optional, and the public header does not say so. | A (E-162) |
| [F-12](../../../CLAIMS.md#L473) | Findings | mpt-crypto's shipped WASM build script fails at emsdk 6.0.6 and succeeds at its CI-pinned 6.0.2. | A |
| [F-13](../../../CLAIMS.md#L474) | Findings | cmpt-compact-sigma.pdf §2.1's "transmitted once on-chain" is not true of rippled 3.3.0. | A |
| [F-15](../../../CLAIMS.md#L475) | Findings | The published JS wrapper makes the tight-window decryption optimisation unreachable keeps the tight-window decryption optimisation out of its hex… | A on the API shape;… |
| [F-14](../../../CLAIMS.md#L476) | Findings | tecINSUFFICIENT_FUNDS misattributes the cause when a holder's balance is partly confidential — on vault AND lending transactors. | A, executed (E-162) |
| [F-29](../../../CLAIMS.md#L477) | Findings | XLS-0096 §7.4 states the MPToken deletion blocker unconditionally; rippled enforces it through two paths that disagree. | A, not executed |
