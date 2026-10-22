# REVIEW-061 — Leg A: register and repository review

## STEP 0 — results

`pwd` printed:

```text
$USER_TMP/T/r061a.NchKmT/repo
```

`git log --oneline` printed:

```text
9f8cf00 after: the archive tree at a87ae55
0e700cd before: the archive tree at 6d5daf3
```

Subject: `git diff HEAD~1 HEAD`: nine changed files, 418 insertions and 65 deletions. The supplied build identifies its original public commit as `a87ae55cb9801ad905f576170dc88d10c2f9187f`; these two local commits contain archived trees, not that public history. Initially only `review-input/` was untracked. No committed file was edited. No root or scoped `AGENTS.md`/`AGENTS.override.md` was found; the root `CLAUDE.md` was also checked, including its key-source conditions. All review artifacts are under `review-work/`.

## Findings — most severe first

### 1. HIGH — Restrict the two-key claim to operations that require a holder proof

**Location:** `web/app/src/hosted/Diagrams.tsx:293–294`, on `/wallet` and `/capabilities`. **Exact labels:** “A confidential transaction needs both keys. The wallets examined supply only the account key, so a page cannot assemble one through them.” and “A confidential transaction needs both keys: the proof comes from the ElGamal key and the signature from the account key.” **Checked against:** `docs/task-zero/TASK-ZERO-2026-08-13.md:90–97`, CLAIMS E-33 and F-27, and `facility/src/facility.ts:283–302`. `ConfidentialMPTMergeInbox` is a confidential transaction but has no proof and requires no ElGamal secret: the existing facility builds and signs it directly with the account seed, outside the signer. Later Converts also do not require a new registration proof. Thus the captions claim more than the demonstrated two-secret requirement for Send/ConvertBack. The matrix's similar wording does not overcome these counterexamples. **Smallest fix:** say “A holder's confidential Send or ConvertBack needs both keys”; scope the wallet conclusion to assembling those proof-bearing transactions.

### 2. HIGH — Keep the master-key authorisation condition in the key diagram

**Location:** `web/app/src/hosted/Diagrams.tsx:298–302`. **Exact label:** “signs every transaction, public or confidential”, beneath “The account key”, reached from “The master seed” by “XRPL's own derivation gives the account key”. **Checked against:** CLAIMS E-69; `web/api/capability.ts:119–131`, the existing-seed row displayed on the same capabilities page; and the explicit instruction in [CLAUDE.md:204](../CLAUDE.md#L204). A master-derived account key need not authorise this account: with `lsfDisableMaster` the signer refuses it; regular-key and signer-list configurations also change the authority analysis. The diagram removes the condition that the matrix deliberately calls “conditional”, while the seed can still derive the permanent viewing key. **Smallest fix:** qualify the master-derived signing branch with “only while the master key authorises the account”; identify an authorised account signing key separately if showing the other regimes.

### 3. MEDIUM — Connect submission to the driver, not the signer

**Location:** `web/app/src/hosted/Diagrams.tsx:250–254`. **Exact edge label:** “the driver submits”. **Checked against:** README “How it fits together”, especially `README.md:110–117`; CLAIMS E-146 and B-15; and the diagram's own sentence “the signer never submits”. The arrow actually leaves the signer box and enters Devnet. At both widths this presents a signer-to-ledger submission path, precisely the boundary the README separates from the driver. Naming the driver on the edge does not repair its endpoints. **Smallest fix:** show signed bytes returning from signer to driver and a distinct driver-to-Devnet submission edge. Keep the API/signer ledger-read paths separate.

### 4. MEDIUM — Reverse the repayment direction

**Location:** `web/app/src/hosted/Diagrams.tsx:214`. **Exact edge label:** “drawdowns and repayments are Sends: amounts hidden; who and when public”. **Checked against:** `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md:149–154`, steps 6 and 7, and CLAIMS E-146. The sole down arrow runs from the Dedicated Account to suppliers for both operations. That is a drawdown, but a repayment runs supplier → Dedicated Account. Both desktop and phone screenshots retain the wrong one-way grouping. **Smallest fix:** make this connection two-way, with “drawdown” on the outward direction and “repayment” on the return direction.

### 5. MEDIUM — Retire from the Dedicated Account rather than the suppliers

**Location:** `web/app/src/hosted/Diagrams.tsx:220–222`. **Exact edge label:** “retired in tranches: each ConvertBack's amount public”. **Checked against:** `facility/src/facility.ts:509–540`, particularly `retire()` selecting `this.cfg.dedicated`, the walkthrough's wind-down, and CLAIMS E-146/B-18/F-24. The retirement arrow follows the three supplier boxes and leads directly to “Back to public balances”. It depicts suppliers cashing out their positions as the facility's retirement, whereas the executed retirement converts the Dedicated Account's remaining float. The public-per-tranche wording itself is correct. **Smallest fix:** connect the retirement/ConvertBack edge to the Dedicated Account, not to the supplier group.

### 6. MEDIUM — Do not colour the public proof as hidden

**Location:** `web/app/src/hosted/Diagrams.tsx:335–338`. **Exact label:** “A proof, not an amount”, with the green key “hidden from the public”. **Checked against:** `web/app/src/views/CustodyView.tsx:48–59`, TASK ZERO's transaction/proof table, and the explainer's statement that every validator checks the proofs. The simulation's policy engine holds only public data and can read the proof; it cannot read the amount. The green box currently assigns secrecy to the proof itself, reversing the distinction the custody finding teaches. **Smallest fix:** make the proof box public or neutral; reserve green for the unreadable amount, if that is drawn separately. The $1M policy threshold is a hypothetical rule, not a ledger figure.

### 7. MEDIUM — Distinguish the auditor's ciphertext from the issuer's ciphertext

**Location:** `web/app/src/hosted/Diagrams.tsx:280`, repeated on `/observer` and `/issuer`. **Exact label:** “The auditor's copy, if the token names an auditor”, field `AuditorEncryptedBalance`, coloured violet under “the issuer can read it”. **Checked against:** CLAIMS E-58, which decrypts the auditor mirror with the auditor key and the issuer mirror with the issuer key, and the diagram's adjacent field/key labels. At this explicitly field-by-field level the colour says the issuer can read the auditor-encrypted copy. The issuer knows the same balance through its own mandatory mirror; that does not give its key access to the auditor's ciphertext. **Smallest fix:** give the auditor copy a distinct labelled tone, or make it neutral with its existing “the auditor can read it” text. Do not imply that either party's key reads both ciphertexts.

### 8. MEDIUM — Align the lifecycle Send arrow with its source and destination

**Location:** `web/app/src/hosted/Diagrams.tsx:136–153`, particularly the independent centre column at `145–149`. **Exact edge label:** “Send: amount hidden; A and B public”. **Checked against:** CLAIMS F-27/E-33, the lifecycle paragraph on the same page, and `review-input/screens/desk_how-it-works-00.jpg`. At 1100px the Send arrow is near A's public balance and B's inbox, while A's spending balance is much lower. It reads as a public-balance-to-inbox Send, not spending-to-inbox. At 390px the linear ordering does correctly follow A's spending balance. **Smallest fix:** use explicit grid rows/areas for the two connected balances and their Send edge, instead of centring an independent arrow column between unequal vertical stacks.

### 9. MEDIUM — Select an executed script rather than any common JS reference

**Location:** `web/hosted/browser-check.ts:341–344`. **Exact selection:** `common[0]`, under the claim “A script chunk every page loads, read from the pages rather than named.” **Checked against:** the supplied HTML, its actual script/import graph, the six changed script-injection controls, and a mutated output copy. The regex includes `modulepreload` links, not just executed scripts. In `review-work/unused-preload/`, adding an unused `/assets/A-unused.js` modulepreload to all seven pages makes the exact helper select that file; `runChecks()` still returns `[]`. Preloading does not evaluate the module, so appending the six control payloads there exercises none of them. This is a false control failure on an otherwise admissible output, not a demonstrated silent PASS. **Smallest fix:** select the actual common module entry script (`script[type=module][src]` here), or establish and verify execution on each required target before using a candidate. Reproducer and output: `review-work/probe-shared.ts` and `review-work/probe-shared.log`.

### 10. LOW — Make the off-screen table column discoverable on a phone

**Location:** `web/app/src/hosted/Diagrams.tsx:182–183`. **Exact heading affected:** “A Send's amount”. **Checked against:** `review-input/screens/phone_how-it-works-04.jpg` and the complete desktop table in `desk_how-it-works-01.jpg`. At 390px the final column and all its public/holder/issuer/auditor answers are beyond the visible right edge. There is no visible scroll cue in the screenshot, so the diagram appears to stop at “A holder's balance”. The data is present in the markup, not deleted, but an important disclosure comparison is undiscoverable in the initial phone view. **Smallest fix:** add an explicit horizontal-scroll cue or use a stacked phone presentation that exposes every column.

## Section 1 — label, edge, colour and caption audit

All nine diagram components and all eleven page placements were reviewed, including captions, conditional branches, edge direction, nesting and the three colour definitions. Findings 1–8 cover the semantic/visual exceptions; this section is not a blanket “no findings”. The following retained statements were checked against the named evidence, rather than accepted because they agree with another diagram:

| Diagram | Checked labels and support |
|---|---|
| Perimeter, `/` | Public MPT balances; public Convert and every ConvertBack amount; hidden Send amounts; public counterparty/timing/frequency and confidential aggregate: P-4, P-11, F-24 and the observer public/hidden lists. Mandatory issuer visibility and conditional auditor visibility: P-9/E-58/E-11. The three canonical-zero cases: F-1/E-49/E-211 and README's zero paragraph. “New balance” must refer to initial spending, not the funded inbox; a spent-to-zero value is not thereby canonical. No additional perimeter finding. |
| This site, `/` | Snapshot → offline pages → static host → browser, and the detached local signer: `web/hosted/README.md` release steps 2–4, `build.ts`/`snapshot.ts`, and the page's own static-site explanation. “Read once” is one build snapshot, not one RPC: the snapshot performs separate reads at the pinned ledger. No runtime ledger connection or server-side project execution is introduced by the diagram. No findings for this diagram. |
| Lifecycle, explainer | Public → inbox on Convert, MergeInbox → spending, Send → receiver inbox, then merge and public ConvertBack: F-27 and facility merge/book code. Four encrypted Send copies, conditional auditor, validator-checked proofs: E-4/E-33 and TASK ZERO §3. The intended transaction ordering holds; the desktop edge placement is finding 8. |
| Who sees what, explainer | All twenty data cells: walkthrough §4, P-4/P-9/P-11, E-33/E-58, F-1/E-211 and the observer lists. Holder's own Send includes their participation as sender or receiver; issuer/auditor read all relevant amounts through their respective copies. Neutral yes/no cells avoid treating green “yes” as private. No additional semantic finding; phone presentation is finding 10. |
| Facility, explainer | Bank as issuer, ordinary Dedicated Account rather than an XLS-65 Vault, one whole-float Convert, three suppliers, both public enrolment amounts, hidden draw/repayment sizes and supplier book values, and each public retirement tranche: walkthrough §§2–6, E-146/B-18/F-24/F-26/R-1. The text below preserves E-151's remote-source qualification; the diagram does not claim the loopback requirement was demonstrated. Findings 4–5 concern edges, not the accurate public-per-tranche or two-enrolment-amount labels. |
| Local architecture, explainer | Browser HTTP → loopback API → Status-only socket; driver Pair/Prepare; one signer per party; secrets/proofs/confirmation/signed bytes; local demonstration holding all seeds; public Devnet; `fail_hard` scoped to movements; API/signer ledger reads; no browser UDS access: README “How it fits together”, E-146/B-15. Status has no signing authority, not a promise of no disclosure. Submission endpoint is finding 3. |
| Position anatomy, observer and issuer | All eight named fields: public MPTAmount, public registered immutable holder key, spending/inbox ciphertexts with the canonical-zero exception, issuer mirror, optional auditor mirror, public version counter and issuance-level confidential total: `web/api/observer.ts` public/hidden lists, E-9/E-58/F-1/E-211/P-9. The total is explicitly marked “On the token”, not misrepresented as a holder field. The issuer caption promises presence, not a published decrypted figure, matching ADR-0004 D-H3. Auditor colour is finding 7. |
| Two keys, capabilities and wallet | Master-derived versus separately kept ElGamal key, proof/decryption role versus signature role, repository-only derivation rather than a published standard, two-secret standalone cost, examined-wallet/date limitation: `web/api/capability.ts` rows and E-118/E-119/E-329/E-330. The broad transaction scope and unconditional master signing are findings 1–2. No codec-support claim was inferred: E-206 remains a named gap. |
| Custody | Simulation-only caption; seed stays inside the platform; outside derivation fails; standalone secret survives outside with a permanent viewing-key holder; internal derivation/published-standard caveat; public-only policy engine cannot evaluate a hidden threshold: `CustodyView.tsx` and the simulated-custody capability row. These reproduce the two findings and their boundary, not an integration with an MPC/HSM. Proof colour is finding 6. |

## Section 2 — consistency

Findings 1–2 remove distinctions preserved in the repository/own-page text; findings 3–8 create graphic contradictions despite mostly accurate wording. F-1's three reset cases were compared across the overview, who-sees caption, position diagram, observer lists and explainer's precise zero paragraph. E-211's spent-to-zero distinction was checked; no new label asserts that a noncanonical ciphertext must be nonzero. F-27's inbox-versus-spending distinction was checked against the lifecycle, facility and README. The general holder/issuer/auditor access table was compared with both position-page placements and the facility table. No additional distinct consistency findings beyond those listed above.

## Section 3 — code and controls

- **No findings for inline styles, ledger-value leakage, check 8b wording, or figure/caption structure.** The built seven pages contain eleven `<figure>` elements and eleven `<figcaption>` elements (2/4/1/1/1/1/1), with no inline styles or style elements. Figure children and captions are structurally valid; tables retain headers and lists retain list markup. Diagram text remains available without interpreting colour; arrows are decorative but transaction labels remain readable. No address, issuance ID, ciphertext or live ledger figure was introduced by the diagrams. Field names, dates, “two secrets”, and the hypothetical $1M approval threshold are not ledger readings. The real exported `runChecks(readOutput(copy), {commit})` returned `[]`, including CSP, ledger-wording and no-issuer-figure checks.
- Hosted TypeScript check: `bunx --no-install tsc --noEmit -p web/app/tsconfig.hosted.json`, exit 0. `git diff --check HEAD~1 HEAD` produced no errors.
- `bun test web`: **192 pass, 0 fail**. `bun test facility tools web`: **305 pass, 5 fail**; all five failures concern tests requiring the absent compiled `signer/target/debug/wconf-signer`, not this diff. No Rust build was attempted. An initial unrestricted `bun test` also discovered dependency tests in the install cache under `review-work/tmp` (1775 pass, 306 fail, 33 errors); that contaminated discovery is not a project-test verdict and was replaced with the explicitly scoped runs. Logs are preserved.
- Current build selection: the common references are `Diagrams-BLFvIpqL.js` and `index-ZxsQsVgo.js`; sorting always selects `Diagrams-BLFvIpqL.js`. Every page route chunk actually imports it. **No run-to-run nondeterminism was found for identical output.** The unused-preload copy demonstrates finding 9 without changing committed code or invoking a private store.
- Each of the six changed controls demands its injected marker (and, where needed, the navigation/how-it-works/second-home label). An unexecuted payload does not satisfy these assertions. **No silent PASS with an unexercised changed control was established.** Finding 9 is specifically an execution-selection/false-failure problem.
- A fresh `browserCheck()` and `selfTest()` were attempted on `review-work/baseline/`, with a minimal manifest carrying the build's embedded commit, not a claimed reconstruction of its release manifest. Both stopped with **“Chrome did not open a DevTools port”** before page/control execution. Browser-test success was therefore not independently reproduced. All profiles/copies were directed under `review-work/tmp`; the supplied browser-check result is input evidence, not a new result of this review.

## Section 4 — screenshots/layout

Viewed **all 32 supplied image segments**: sixteen desktop segments covering all seven pages, five phone overview segments, and eleven phone explainer segments. Findings 8 and 10 are layout-specific; the screenshots also confirm the architecture/facility edge and colour findings at the available widths. The overview's horizontal paths reflow to correctly ordered down paths on the phone. The phone lifecycle ordering preserves spending → Send → receiver inbox. The three supplier boxes remain legible at 390px. Desktop field boxes, key branches, captions and custody alternatives do not overlap or visibly drop text. No additional layout findings in the supplied images.

## What was not checked, and why

- No private configuration/store, prohibited external directory, `make check-web-hosted`, or `tools/check-no-secrets.ts` was accessed/run. The full secret-store-backed 70-control release gate was not rerun; only its expressly store-free exported checks were used.
- No deployment, live Vercel comparison, current network/amendment RPC, Devnet transaction, secret-key decryption, upstream re-survey, or independent cryptographic audit was performed. The question is accuracy against this committed register and repository, not new evidence replacing their dated rows.
- Browser execution and browser self-test mutations could not be completed because Chrome did not open its debugging port. Finding 9's selection and gate acceptance were executed; its browser non-evaluation follows modulepreload semantics, not a claimed successful browser run here.
- No phone screenshots were supplied for `/observer`, `/issuer`, `/capabilities`, `/wallet` or `/custody`; those five phone layouts were not visually verified. No light-mode images, assistive-technology session, keyboard walkthrough, or other viewport was supplied/tested. Accessibility review was limited to markup and the provided visual evidence.
- No pre-existing unrelated defect was promoted to a diff finding, and no fix was applied to either committed tree. The separate screenshot-only newcomer read remains separate from this evidence-aware review.

END OF LEG A REPORT
