```text
GitHub: 200
Devnet: 400
pwd: $USER_TMP/T/review058r2.Xwt0zH/repo
HEAD: 629f21621c723cd7f61afec032c09248760b3ddf
git log: 629f216 ADR-0004: the build reads a pooled endpoint, not one node
```

**Verdict: the fixes are incomplete. The stopping condition fires.** The requested ledger mutations are detected, but corrected claims survive elsewhere, and one upheld fix was narrowed in the adjudication.

All mutations were restored; the working tree is clean. No prohibited store was read. An early source read displayed public test-vector seed literals; that was a transcript-handling mistake.

Below, `ADR` means `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`; `Adjudication` means `docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md`.

**Seam 1: findings — discharge is incomplete.**

**R2-1 | HIGH | B1-10’s corrected sentence survives elsewhere |** `ADR:84` now correctly says “No server-side code of ours runs per request.” But `ADR:280–281` still says “Under H3 and H1 nothing of ours runs per request.” H1 executes this project’s browser code, exactly the objection in `round-one-gemini-output.md:147–156`. The whole-tree search found this surviving assertion. **Smallest fix:** qualify the abuse-section sentence with “server-side,” too.

**R2-2 | HIGH | R1-4’s wallet overclaim survives in the capability matrix |** The corrected `web/app/src/routes/wallet.tsx:78–79` allows a wallet that holds the viewing key and produces proofs internally. Yet `web/api/capability.ts:168` still says there is “no path” from a connected wallet to a viewing key, and `:174` says this is not a gap “a different API would close.” That is the same permanence claim in different words, rendered by the corrected wallet page through `wallet.publicTransactions` and the wider capability matrix. **Smallest fix:** scope these negatives to the examined APIs and carry the internally proving wallet exception into the matrix.

**R2-3 | HIGH | S-8’s fix was reduced from commit plus gate verdict to commit alone |** The original finding’s smallest fix explicitly requires “the commit and the gate’s verdict” in `docs/reviews/REVIEW-058-packets/round-one-self-notes.md:70–73`. `Adjudication:87` retains only the commit, and `ADR:342–343` requires only the commit. Nothing rejects the verdict requirement or records a partial ruling. **Smallest fix:** require both in the footer and in the hosted gate’s rendered-output checks.

The row-by-row audit follows. “Discharged” here means the **design requirement** was corrected; it does not claim the future hosted implementation exists.

| Round-one row | Verdict against the original finding |
|---|---|
| R1-1 | Discharged: `ADR:66,153` retracts browser compatibility and prices replacement helpers. H3 avoids executing this computation in the browser. |
| R1-2 | Discharged: `ADR:63` and `CLAIMS.md:387` distinguish one Chrome page from supplied Bun Origin headers. |
| R1-3 | Discharged as a provenance requirement: `ADR:98–105,321–322` names checkout, commit, dependencies, variables, maps and inventory. Build-machine trust remains unpriced; see R2-10. |
| R1-4 | **Partial:** the two cited pages and signer-panel exclusion are corrected, but the semantic copy remains in the matrix: R2-2. |
| R1-5 | Discharged: `ADR:218` requires a separate context naming Devnet and ledger hash. |
| R1-6 | Discharged: `ADR:218` requires a verifier-only artifact. |
| R1-7 | Discharged for the reported wrong/missing-index bypass and promised type check. Both mutations fail tests. Rust equivalence is narrower than implied; see R2-4. |
| R1-8 | Discharged: `ADR:331–336,247–253` specifies configuration, directives and served-header comparison. |
| R1-9 | Discharged at the design level: `ADR:325–330` explicitly admits that directory scanning does not exist and requires its implementation and controls. |
| R1-10 | Discharged: `ADR:241,247–253` limits the repository-permission claim and names host injection and post-deployment comparison. |
| R1-11 | Discharged as an owner requirement: `ADR:280–286` requires plan, limits, cap where available, and responder. |
| Falsifier table | Discharged in scope: architecture `:269` now covers provenance, secret inputs, unauthorized figures, negative-read identity and served headers. |
| B1-1 | Discharged for recommended H3; `ADR:153` records H1’s port restriction and unsearched 443 alternative. H1’s actual failure UI remains build work. |
| B1-2 | Discharged: `ADR:91–92,144`; architecture `:269`. |
| B1-3 | Discharged with R1-10: `ADR:247–253`. |
| B1-4 | Discharged: `ADR:107–115,348–349` explicitly denies that the file gate enumerates egress. |
| B1-5 | Discharged: `ADR:44–47`; architecture `:257` expressly replaces the loopback property. |
| B1-6 | Discharged: `ADR:174–184` names Vercel and, under H1, Ripple. |
| B1-7 | Discharged for the upheld portion: Devnet, no value, resets and lagging servers are in `ADR:174–178`; failures are named at `:269–286`. |
| B1-8 | **Partial:** `ADR:294–299` repairs the design, but the new adjudication incorrectly calls H3 uncached: R2-6. |
| B1-9 | Discharged: `ADR:153` expressly requires transport separation before H1 reuse. |
| B1-10 | **Partial:** qualification at `ADR:84` misses the copy at `:280`: R2-1. |
| Q6 | H3’s principal trade-off holds, with outstanding costs described under Seam 4. |
| S-1 | Discharged: `ADR:141–142,337`; architecture `:265,269`. |
| S-2 | Discharged: `ADR:340–341` requires dependency notices in the distribution. |
| S-3 | Discharged: `ADR:247–253`; architecture `:269` includes served bytes and headers. |
| S-4 | Discharged: `ADR:177–178` contains the requested transaction warning. |
| S-5 | Discharged: `ADR:152,194–195` says H3 still needs acceptance. |
| S-6 | Discharged: `ADR:241` names token scope, expiry and location. Project-scoped tokens are documented by [Vercel](https://vercel.com/docs/accounts/access-tokens). |
| S-7 | Discharged with R1-8. |
| S-8 | **Partial:** commit present as a requirement, gate verdict omitted: R2-3. |

I searched outside `docs/reviews/` with whitespace-tolerant patterns, including the author’s list and additional corrections concerning host access, request handlers, browser compatibility, reader reuse and wallet/API permanence.

The trigger-5, “nothing to bind,” origin, uncached-ledger, decrypted-holder and wallet-release **literal** matches now occur as recorded retractions or detector definitions. The active surviving copies are R2-1 and R2-2. The additional “no third party gains any access” sentence is explicitly retracted at `ADR:241`.

**Seam 2: findings — the requested checks hold, but parity and test coverage remain incomplete.**

The requested independent mutations produced:

| Reader state | Loopback tests |
|---|---:|
| Unchanged fix | 28 pass, 0 fail |
| Only negative-index comparison removed | 26 pass, **2 fail** |
| Only entry-type comparison removed | 27 pass, **1 fail** |

The failing tests are precisely the wrong-ledger negative, unnamed-ledger negative, and wrong-entry-type tests at `facility/tests/loopback.test.ts:207–249`.

**R2-4 | MEDIUM | TypeScript does not perform Rust’s full ledger-origin checks |** `facility/src/loopback.ts:239–253,591` accepts numeric coercion and `ledger_current_index`, without requiring `validated: true`. I supplied negative answers with matching `ledger_index` and `validated:false`, with only `ledger_current_index`, and with string `"42"`; all became `null`. Rust’s `signer/src/ledger.rs:702–718` requires `validated:true` and a strict `ledger_index`, including on tolerated negatives through `:933–943`. Rust also tolerates only `entryNotFound`, whereas TypeScript includes `objectNotFound`. **Smallest fix:** share the same strict origin predicate across positive and tolerated-negative TypeScript answers, or explicitly document the weaker contract.

This does **not** negate the demonstrated fix for a negative answer naming the wrong numeric index.

**R2-5 | MEDIUM | The new test does not protect the issuance type-check call site |** The wrong-type test invokes only `mptoken` (`facility/tests/loopback.test.ts:237–246`). I replaced only `entryOfType(r, "MPTokenIssuance")` at `facility/src/loopback.ts:295` with `r.node`: **all 41 tests across loopback and facility tests still passed**. **Smallest fix:** add a wrong-type issuance response tested through `snapshot.issuance()`.

Read-only Devnet probes at ledger **6,244,663**, network **2**, rippled **3.4.1**, returned:

- `account_info`: numeric index, `validated:true`.
- Successful MPToken and MPTokenIssuance reads: numeric index, `validated:true`, expected `LedgerEntryType`.
- Missing MPToken: `entryNotFound`, numeric index, `validated:true`, ledger hash.
- Unavailable ledger 100: `lgrNotFound`, which remains a failure.

A separately constructed absent account returned `actNotFound` with index and `validated:true` at ledger **6,244,688**. I found no currently used honest response shape broken by the new index/type requirements.

The full facility suite yielded **96 pass, 5 fail**. All five failures were caused by the absent signer binary, before the expected signer behavior. I did not build it or interpret that environment limitation as a defect in these fixes.

**Seam 3: findings — two descriptions and one count are wrong.**

**R2-6 | HIGH | The adjudication incorrectly says H3 makes “Ledger values are not cached” true |** `Adjudication:76` says “Under H3 it is true by construction,” referring to that sentence. H3 deliberately bakes ledger values into normally cached static files: `ADR:87–90,294–299`. Dating a cached observation does not make it uncached. **Smallest fix:** say H3 deliberately caches dated observations; H1 instead requires the specified loader-cache behavior.

**R2-7 | LOW | Five findings were downgraded, not six |** `Adjudication:89` says six. Its table contains exactly five “regraded” rows: R1-7, B1-1, B1-5, B1-8 and B1-9. **Smallest fix:** change six to five.

**R2-8 | MEDIUM | E-327 still says the rotation has not run |** The revised `CLAIMS.md:387` ends with “the rotation the launch plan requires has not run,” while its own revision-2 text and E-328 immediately below describe completed round one. Architecture `:257` correctly distinguishes completed round one from owed round two. **Smallest fix:** give E-327 that same distinction.

Measurement cross-checks:

| Measurements | Evidence checked and limit |
|---|---|
| M1–M2 | Leg A’s HTTP results match its report. Its raw WebSocket results at `round-one-codex-stderr.txt:5140–5142` are Bun clients. The original Chrome observation remains the author’s recorded measurement; Leg A expressly could not reproduce Chrome. Revision 2 now distinguishes these. |
| M3 | Leg A’s three lower bounds match `:5140–5142`; the author’s four readings match `round-one-self-notes.md:81–84`. |
| M4 | Ledger 6,244,010 and the four accounts’ fields match `round-one-codex-stderr.txt:5143–5147`. The earlier 6,243,460 reading is reproduced in the frozen inline packet. |
| M5 | Browser-targeted bundle and missing-Buffer failure match `:8257,8538–8559`; current harness helpers remain at `tools/observer-harness.ts:82–83`. |
| M6 | The transport/environment descriptions match current source. The remaining Rust differences are R2-4. |
| M7 | Independently confirmed seven verifier names, no `verify` in the twelve declaration files, and loader mappings for decryption `I` and clawback verification `V`. |
| M8 | Correctly limited to schema support, not a demonstrated server-free deployment. |
| M9 | The quoted mirror/aggregate/proof statements agree with the pinned specification reproduced in the packet and Leg A’s report. |
| M10 | Independently reproduced the important response fields on current Devnet. This was an adjudicator remeasurement, not a result from the original leg. |
| M11 | Canary inlining matches `round-one-codex-stderr.txt:9827–9842`. |

The quoted forgery ledger **6,244,148** and both passing comparisons match `round-one-codex-stderr.txt:9817–9818`. The **41 command** count is correct. Generated register counts and line links also agree: **406 rows**, including `E-3a`; revision history has **170 simplified / 211 full-history** commits.

**Seam 4: findings — H3 is a reasonable recommendation, incompletely priced.**

H3 removes visitor-to-ledger traffic, the nonstandard WebSocket port dependency, reconnection work and browser cryptographic compatibility work. Revision 2 also avoids Gemini’s stronger unsupported claims that only these four accounts exist or that static generation prevents a lying build-time node.

**R2-9 | MEDIUM | H3’s cost omits replacing the application’s runtime API dependency |** `ADR:152` prices a build-time ledger read, but today every route passes through `web/app/src/routes/__root.tsx:10`, which calls `assertOurApi`; `web/app/src/api.ts:66–80` requires `/api/meta`. Wallet and custody loaders still call the API (`wallet.tsx:6`, `custody.tsx:6`). A controlled 404 fetch made the root check refuse rendering. Prerendering alone does not remove those client navigation paths. **Smallest fix:** explicitly price a hosted static-data adapter or nonhydrated page target, and require direct-load and navigation checks with Elysia absent.

**R2-10 | MEDIUM | The provenance rule leaves the owner-machine build execution boundary unpriced |** `ADR:98–105` controls checkout, dependencies, environment and maps; it does not constrain dependency/build code’s filesystem access. D-H4 places a deployment credential on that machine (`:241`). An output inventory cannot establish that build code never read another local file or credential. **Smallest fix:** name either an isolated build environment without private stores/deploy credentials or an explicit acceptance of that build-execution trust; keep deployment credentials out of dependency execution.

Other outstanding H3 choices:

- **Remote acceptance:** the existing reader requires the exact `WCONF_ACCEPT_REMOTE_LEDGER_RISK` sentence (`facility/src/loopback.ts:492–518`). With it unset, opening the proposed endpoint returned `REFUSED_NOT_LOOPBACK`. The hosted build script must explicitly name its endpoint and acceptance input under the environment allowlist.
- **Reset rendering:** `ADR:262–267` specifies honest wording, but existing observer computation distinguishes missing MPToken, not absent AccountRoot (`web/api/observer.ts:126–145`). The build needs an explicit account-existence check and separate rendering for `actNotFound`, missing token and failed read.
- **Rebuild cadence:** “whenever the owner wants fresher values” is an unresolved operational choice. The ADR does honestly limit reset detection to the next build; it does not promise immediate detection. Name the owner/cadence or explicitly accept indefinite historical snapshots.

These costs do not overturn H3.

**Seam 5: findings — the copy changes improve the pages, but the gate is bypassable and overbroad.**

**R2-11 | MEDIUM | Line-wrapped copies of both false sentences pass the gate |** `tools/check-disclosure-phrases.ts:231–235` matches each phrase within one source line. I temporarily restored the issuer claim in actual `index.tsx`: the exact single-line copy failed, but splitting after the comma passed. Restoring the wallet claim with a newline between “any” and “release” also passed. **Smallest fix:** normalize whitespace across logical text before matching and add controls for both actual JSX forms.

**R2-12 | LOW | The new wallet phrase rejects true statements about other subjects |** The real detector rejected “The protocol-mandated issuer mirror cannot be closed by any wallet update.” The phrase at `tools/check-disclosure-phrases.ts:75` lacks the subject that made the original assertion false. **Smallest fix:** scope the pattern to the three wallet reasons and add a true-sentence control.

Additional detector results:

| Probe | Result |
|---|---|
| Unchanged tree | PASS: 20 phrases, 7 controls |
| Exact old issuer sentence | Caught |
| Wrapped issuer sentence | Missed |
| Wrapped wallet sentence | Missed |
| Paraphrase | Missed, consistent with the detector’s declared lexical limitation |
| Exact claim beside an unrelated `E-328` retraction | Forgiven by the six-line marker window |

The corrected index description agrees with `issuer.tsx:67–81` and `web/api/issuer.ts:185–188`: it reports success and withholds the figure. The wallet correction agrees with its own internal-key/proof exception. Their remaining conflict is the matrix copy in R2-2.

**Stopping condition:** **met**, by R2-1 (**B1-10**), R2-2 (**R1-4**) and R2-3 (**S-8**). R2-6 also leaves the caching correction falsely described in the adjudication. The other new findings are not needed to justify a third round.

**The single sentence most likely to be false:** “Under H3 and H1 nothing of ours runs per request” (`ADR:280–281`). Falsify it by loading the H1 browser bundle without a server-side application and observing this project’s JavaScript process a lookup and its WebSocket response. The missing “server-side” qualification is already contradicted by `ADR:84–86`.

**Files opened:** [complete file-by-file inventory](<$USER_TMP/T/review058-round-two-leg-a-opened-files.txt>) — 388 repository read/search/scan inputs, 13 directly inspected package files, and scratch results.
