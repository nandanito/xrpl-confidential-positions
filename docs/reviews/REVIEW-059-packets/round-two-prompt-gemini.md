DO NOT USE ANY TOOLS. Everything you need is inline below. Do not try to read files, run commands or browse.

# REVIEW-059 round two, leg B — the fixes to round one's findings

You are a code reviewer for an open-source research project, reviewing the
project's own release tooling and records for correctness. Round one of this
review found defects in the build of a read-only static demonstration site,
published at `https://xrpl-confidential-positions.vercel.app`. The project has
fixed them. **Your job is to check the fixes**: whether each one discharges the
finding it answers, **judged against the round-one report's own words and not
against the adjudicator's summary of it**, whether any fix introduced a new
defect, and whether the records describe the fixes accurately.

This matters here specifically. Before this round launched, the adjudicator
re-read the round-one report and found four fixes that had discharged only half
of their finding, because they had been checked against the ruling's one-line
summary (`CLAIMS.md` E-344). Assume there may be more.

Agreement is not useful. A fix that holds is worth reporting only if you tested
it against the code shown and say how. You have the material listed at the end,
each **complete** unless its header says otherwise; where your answer depends on
something not shown, say so rather than assuming. The two trees are the project
after round one (`a5c897a`) and after the fixes (`c08db2b`).

## Measurements the adjudicator took on 2026-10-20

1. An output rebuilt from `c08db2b` by the fixed build: two containers, the second
   with `--network none`, after the tree check passed; ledger 6,270,649.
2. The fixed gate on it: 44 of 44 controls, full secret sweep PASS.
3. The fixed browser check on it: PASS, 6 pages, 41 requests.
4. The fixed preflight on it: REFUSED only because `c08db2b` is not on the public
   repository's `main`, which is correct for an unpublished commit.
5. Each of the 14 new gate checks, deleted from a copy, failed its control; each of
   the browser check's three new checks, deleted, failed its self-test.
6. The TypeScript suites: 290 pass, 0 fail.

## Answer all five questions, each with an explicit verdict

For each finding: `B2-n | HIGH/MEDIUM/LOW | claim | the passage you rely on, quoted
briefly with its file | the smallest fix`. If a question has no finding, write
`Question N: no findings` and say what you tested. Grade HIGH only for a fix that
does not discharge a HIGH finding, or a new defect that would publish a false
statement of fact to visitors, publish private data, or let the release procedure
publish an output that does not meet architecture §6 step 9's requirements with
no later check able to notice.

1. **Discharged, finding by finding.** For every finding the adjudication upheld
   (R1-1 to R1-14, B1-1 to B1-6, S-1 to S-9 as ruled), give one line: the id, what
   the round-one report asked for **in its own words**, what the fix does, and a
   verdict of discharged, partly discharged or not discharged. Where the ruling
   narrowed a finding, say whether the narrowing was justified.
2. **New defects.** Did any fix introduce a check that false-passes, a check that
   false-fails on the real output, a control that tests something next to what it
   names, or a regression in what the tools did before?
3. **The records.** `CLAIMS.md` E-342, E-343 and E-344, `web/hosted/README.md`, the
   changed paragraph of `ADR-0004`, the architecture document's revision 12 line
   and step 9 text, and the gate's printed list of what it does not check. Find
   any sentence that is false, overstated, or contradicted by the code shown.
4. **What visitors read.** The four sentences the fixes changed (the custody page,
   the wallet gap, Holder A's note, the footer) and the rebuilt pages' visible
   text, against `CLAIMS.md` P-1 to P-12. Find any sentence that claims more than
   is delivered or states a negative without its recorded search (P-12).
5. **The residuals.** The adjudication named three residuals it did not fix: the
   ledger hash is not pinned; code that runs during install or the snapshot has the
   network and can reach the build machine's loopback; dependency code can change
   the source tree during the build. Are they stated accurately where they are
   stated, and is any of them a fix that should have been made?

## Then answer one more question

**The stopping condition, word for word:** *"Round one reviews the build. If it
upholds any finding that changes code, a gate or a record, round two runs on the
fixes alone, and it is the last unless it finds a fix that did not discharge its
finding; a third round is then the owner's decision."* On your findings, does it
fire? Answer yes or no, and why.

End with a final line reading exactly `END OF LEG B REPORT`.

# The material


## FILE: docs/reviews/REVIEW-059-packets/round-one-codex-output.md, round one (complete)

````markdown
Step 0 results:

```text
https://github.com                                      200
https://xrpl-confidential-positions.vercel.app/           200
https://s.devnet.rippletest.net:51234/                    400

pwd:
$USER_TMP/T/r059a.gT93Ny/repo

git log --oneline -1:
ccf76e7 Revision log regenerated after the CLAIMS.md update
```

Network was available. I worked inside this clone, made no external changes, and submitted no transactions. The tracked checkout remains unchanged.

The supplied output recomputes to **18 files, digest `1332ea0a95772b12b18f4a91cb650db551faf6edcdb124a6e222b8b8282bf462`**. The live comparison passed during this review. These results do not discharge the defects below.

**1. Gate coverage and controls**

I ran mutations on copies using `runChecks(readOutput(copy), { commit })`. Reproduction scripts are under `review-work/`. Here, **PASS means the forbidden mutation produced no findings from `runChecks()`**, not that the complete release procedure passed.

| Requirement or falsifier | Mutation | Result |
|---|---|---|
| No server functions or middleware | Add function configuration; add `middlewarePath` | Detected |
| No external rewrite | Existing control inserting external `dest` | Detected |
| No signer socket path | Append `/run/wconf/signer.sock` | Detected |
| No socket client | Append `new globalThis["Web"+"Socket"](u)` inside a function | PASS |
| No secret-shaped values | Append generated seed and labelled private scalar | PASS; separate directory secret scan detected both |
| No decryption routine | Append `crypto.subtle.decrypt(...)` wrapper | PASS |
| No WebAssembly | Existing `WebAssembly.instantiate` control | Detected |
| No secret input | Append `<input name="seed">` | Detected |
| No secret input through another mechanism | Append a button invoking `prompt("Enter your seed")` | PASS; its inline handler would separately encounter CSP |
| Devnet only | Add literal Mainnet endpoint | Detected |
| Devnet only | Construct that endpoint from `"https:"+"//..."` | PASS |
| No second ledger endpoint | Add literal second endpoint | Detected |
| No third-party script | Add `<script src="//analytics.example.net/a.js">` | PASS; browser CSP should catch its attempted load |
| No analytics | Append same-origin click reporting | PASS |
| No visitor lookup in host URL | Append lookup function using `prompt()` and `location.href` | PASS |
| Inventory and no source maps | Add stray file, `.map`, or mapping comment | Detected |
| Restricted connection targets | Widen ordinary `connect-src` | Detected |
| Restricted connection targets | Prepend duplicate `connect-src *` | PASS |
| D-H2 wording | Remove its Vercel sentence | Detected |
| D-H2 wording | Remove ledger markers and that sentence together | PASS |
| Visible D-H2 wording | Hide `[data-dh2-wording]` through stylesheet | PASS |
| Network check | Change network marker to `0` | Detected |
| Correct ledger index | Change one page’s index | Detected |
| Correct ledger index | Change both ledger-page index attributes together | PASS |
| Correct reading/source | Change displayed amount `750` to `999` | PASS |
| Failed or unplaceable negative read | Actual reader inconsistency described in R1-8 | Returns fabricated empty-looking observer values |
| No issuer figure | Append “Decrypted issuer balance: 42” | PASS |
| Commit rendered | Change commit hyperlink | Detected |
| Commit rendered | Change visible commit label, retain hyperlink | PASS |
| Verdict rendered | Remove verdict marker | Detected |
| Required notices | Remove licence file | Detected |
| Required notices | Remove only seroval’s complete entry | PASS |
| Step 8 wording falsifiers | Append issuer-privacy, hidden-fresh-zero, real custody-integration, or `tapFailHard` claims | All PASS |
| Actual source provenance | Add an admitted asset absent from the commit | PASS |

The secret-scan distinction matters. On the original output:

```text
controls: 111/111 passed
check-no-secrets: verdict=PASS-SHAPES-ONLY exit=0
```

On the planted seed/scalar mutant:

```text
seed: 1 in 1 location(s)
labelled-scalar: 1 in 1 location(s)
check-no-secrets: verdict=FAIL exit=1
```

I did not run the private-store sweep. The unlisted decryption, browser-created input, and prose limitations are partly disclosed already; the table demonstrates their extent rather than treating each as a newly discovered implementation bug.

- **R1-1 | HIGH | The CSP check can pass a policy permitting forbidden connections. | Evidence:** `bun run review-work/mutations.ts` reports `findings: []` for prepending `connect-src *;`. At `tools/check-web-hosted.ts:166`, `new Map(...)` retains the **last** duplicate directive; CSP uses the **first**. Comparison subsequently compares the identical erroneous string, while a browser run need make no forbidden request to pass. Later-route headers also escape this CSP check. **Smallest fix:** reject duplicate directives and reject security-header overrides on later routes, or validate the effective policy for every supported route.

- **R1-2 | HIGH | Presence of markers and strings does not establish the required displayed disclosures or D-H3 exclusion. | Evidence:** `bun run review-work/more-probes.ts` prints `D-H2 hidden by stylesheet []`; removing markers together with wording and appending an issuer figure also produce `[]`. The deciding code is `tools/check-web-hosted.ts:189–207`. **Smallest fix:** independently assert the expected ledger-bearing pages, test disclosure visibility in the browser, and add a hosted rendering/output regression for the no-issuer-figure rule. Do not describe these string checks as enforcing those complete properties.

- **R1-3 | MEDIUM | The cryptography-package control does not test forbidden-package admission. | Evidence:** `bun run review-work/control-strength.ts` deletes the `ADMITTED_PACKAGES` rejection in an instrumented copy. **All 28 detector controls still pass.** Its crypto control fires because the fabricated licence is incorrect. An authentic `@noble/curves` notice produces the forbidden-package finding in the original detector and `[]` in the weakened detector. See `tools/check-web-hosted.ts:294`. **Smallest fix:** plant the package’s authentic notice and assert the specific forbidden-package rejection.

- **R1-4 | MEDIUM | Notice completeness is unchecked even for a dependency already represented by this build’s module report. | Evidence:** removing seroval’s entry, without changing its bundled code, yields `findings: []`. Only React and React DOM are mandatory at `tools/check-web-hosted.ts:241`. The served `doesNotCheck` item 7 describes a narrower limitation—packages missed by the module graph—than this actual omission. **Smallest fix:** require the complete reviewed package set for this build and add a single-notice-deletion control; correct the disclosure.

All 28 detector controls fired in their original configuration. Several nevertheless test adjacent properties:

- “An account panel dropped” changes its title, leaving the panel intact.
- “The network check changed” changes an HTML attribute, not the application’s network rejection.
- “A build variable inlined” plants a variable **name**, not an inlined value.
- “A cryptography package bundled” changes the licence list, not the bundle.
- The source-map-file control expects `inventory`, so it does not independently protect the `.map` detector.

There are no dedicated controls for issuer figures, visitor lookups in host URLs, disclosure visibility, ledger-index removal/coherent replacement, verdict-slot removal, or a truthful-but-incomplete licence list. The four inherited wording falsifiers also have no hosted-output controls.

**2. Release-time checks**

`preflight()` establishes agreement between locally supplied hashes and metadata, plus the public-main predicate. `browserCheck()` samples browser behavior through its local server. `compareDeployed()` checks selected responses, bytes, and five headers. Their PASS statements exceed those precise boundaries in the following cases.

- **R1-5 | MEDIUM | Browser errors can escape the advertised “any exception or console error” check. | Evidence:** `web/hosted/browser-check.ts:133` handles `Log.entryAdded`, but never handles `Runtime.consoleAPICalled` with type `error`. After the final client navigation, lines 147–157 inspect navigation/rendering only; they do not inspect its exceptions, requests, or CSP violations. **Smallest fix:** handle console API errors and apply the same event checks to the final navigation interval.

  I prepared these actual output copies:

  ```text
  review-work/browser-console-error
  review-work/browser-navigation-exception
  ```

  Both pass `runChecks()` and preflight. The first appends `console.error(...)`; the second throws asynchronously when the checked observer link is clicked. Confirm/refute with:

  ```sh
  bun run web/hosted/browser-check.ts review-work/browser-console-error
  bun run web/hosted/browser-check.ts review-work/browser-navigation-exception
  ```

  **Browser PASS is not experimentally established here.** Chrome 155.0.8059.85 aborted with `SIGABRT`, exit 134; both launch attempts failed to open a DevTools port.

  Separately, `serveOutput()` takes only `config.routes[0].headers` and applies rewrites without implementing the complete route sequence. It therefore cannot generally establish behavior “the way its config.json says.” Reject unsupported configurations or implement their semantics.

- **R1-6 | HIGH | The deployed comparison can pass materially different visitor behavior. | Evidence:** `bun run review-work/compare-probes.ts` reports `[]` for all four cases:

  ```text
  wrong MIME []
  altered /observer/ page []
  500 verdict []
  redirect verdict []
  ```

  The unchecked `/observer/` returned HTTP 200 containing “The holder is private from the issuer.” Every HTML response could instead be `text/plain`, and the verdict could be HTTP 500 or 302 with its original body. The comparison checks neither trailing-slash page routes nor verdict status, and omits MIME validation (`web/hosted/compare-deployed.ts:34–58`). **Smallest fix:** check both declared page spellings, expected content types, and status/security headers for the verdict and 404 response.

- **R1-7 | MEDIUM | Preflight accepts malformed provenance metadata and can print a false ledger attribution. | Evidence:** `bun run review-work/release-probes.ts` deletes `manifest.trial` and changes its ledger to `1`; `preflight(copy, () => true)` returns `[]`. The callback isolates local validation using the already-public commit. Missing `trial` is accepted by the truthiness check at `web/hosted/deploy-preflight.ts:38`; snapshot metadata is not cross-checked. An altered output also passes after a new locally generated verdict. **Smallest fix:** validate a manifest schema, require `trial === false`, bind snapshot metadata to the gated artifact, and describe hash agreement separately from source provenance.

The required live command returned:

```text
compare-deployed: verdict=PASS exit=0
```

`curl -sI` showed the expected five security headers and additional host headers, including:

```text
access-control-allow-origin: *
strict-transport-security: max-age=63072000; includeSubDomains; preload
cache-control: public, max-age=0, must-revalidate
server: Vercel
x-vercel-cache: HIT
```

No cookie appeared in these responses. **No findings concerning those observed host additions:** E-336 explicitly records them. “Headers matched” should mean the five compared security headers, not complete header equality.

**3. Snapshot and pooled reader**

`bun test web/hosted facility/tests/loopback.test.ts` passed **67 tests**. The separately targeted hosted snapshot suite passed **9 tests**.

A live read succeeded at validated ledger **6269733**, network 2, rippled 3.4.1, including Holder A’s account existence, MPToken and issuance. I also directly tested wrong positive index, false validation, string index, wrong entry type, and negative answers with wrong/missing indices. They were refused. A correctly indexed, validated negative returned `null`. **No findings in those tested refusal paths.**

- **R1-8 | HIGH | Re-reading a position can turn contradictory answers into an empty-looking present position. | Evidence:** `bun run review-work/more-probes.ts`, through the actual `Snapshot` class:

  ```text
  actual Snapshot positive->negative
  {"state":"present","amount":"0","registered":false,"mirror":true}
  ```

  `readAccount()` first reads the MPToken, then `observerView()` reads it again (`web/hosted/snapshot.ts:54–61`). If the second answer is a permitted negative, `web/api/observer.ts:118–136` substitutes zero, false and null fields. The issuer mirror survives from the first answer. **Smallest fix:** compute both views from the same already-read MPToken and issuance; reject contradictory repeated responses if repetition remains.

- **R1-9 | MEDIUM | The pin identifies an index, not one ledger hash, and the pool identity can change unnoticed. | Evidence:** `bun run review-work/snapshot-probes.ts` produces a completed snapshot from alternating ledger hashes at index 42. Its first `server_info` says network 2 and the next says network 1; the result still reports network 2. `Snapshot.cameFrom()` checks only index and `validated` (`facility/src/loopback.ts:265`); `snapshot()` ignores the second response’s network identity. Negative-answer metadata discards the ledger hash altogether. **Smallest fix:** retain and pin the validated ledger hash, require it on positive and negative answers, and reject changed network identity when acquiring the snapshot.

  This does not show an ordinary same-epoch honest pool producing conflicting validated hashes. It shows that explicit inconsistency in the responses is accepted; D-H2’s trust acceptance does not make that consistency check work.

**4. Build isolation and provenance**

Third-party build code has the container user’s access to the entire writable source mount, build environment, container filesystem, and unrestricted build networking. It can change source files, the snapshot and assembled output. The Docker invocation does not mount the private stores or deployment token. I found no contrary host mount in this code; the adjudicator’s no-mount measurement supports that narrower isolation claim.

The Dockerfile hash matches the manifest:

```text
b5fac27dc25167883ae2867af7a14c8fd25eebef0e0a4c7d358acce7156c7c6f
```

That establishes the recorded Dockerfile hash, not that dependencies preserved the exported source.

- **R1-10 | HIGH | A commit build can include files that were never in that commit. | Evidence:** `bun run review-work/provenance-probes.ts` invokes the unchanged production `exportSource()` through an export-only instrumentation:

  ```text
  preexistingNonCommitFileSurvives: true
  file exists in named commit false
  uncommitted asset gate []
  uncommitted asset preflight []
  ```

  `build.ts:60` extracts into an existing directory; line 100 rejects only an existing `.vercel`, not an existing `work/src`. A failed build leaves that workspace behind. A leftover `web/app/public/assets/review059.js` can therefore survive extraction and enter Vite’s public output. The footer still names the requested commit. The output-path guard also accepts `out === repoTop`. **Smallest fix:** create a genuinely fresh source directory, reject reused/nonempty build workspaces, clean failed work in `finally`, and reject the repository root as output.

  **Container-dependent confirmation probe:** create a fresh outside-repository output directory; before building, plant `work/src/web/app/public/assets/review059.js` containing `export const outsider=1;`. Run the documented commit build. Finding confirmed if `.vercel/output/static/assets/review059.js` exists afterward and the ordinary gate/preflight accept it; refuted if the build refuses the pre-existing workspace or excludes the file. I did not run this container probe.

- **R1-11 | MEDIUM | Two canaries do not establish that no build variable reaches the output. | Evidence:** `bun run review-work/more-probes.ts` places a recoverable base64-encoded canary in JavaScript; `leakedCanaries()` returns `[]`. A verbatim control returns one hit. The function is a literal `grep`, and commit/canonical URL environment values intentionally reach the snapshot. **Smallest fix:** describe the actual guarantee—automatic Vite exposure disabled, two specific values absent verbatim, named metadata intentionally admitted. Do not present this as proof against arbitrary dependency code exporting environment data.

Preflight cannot repair R1-10: its manifest and verdict identify the same output, without establishing that output’s source tree. Dependency modification of `/src` is another provenance boundary the canaries do not check.

**5. What visitors read**

The D-H2 paragraphs match the accepted wording; the wording tests pass. The current artifact has no displayed issuer plaintext figure. These checks do not validate every sentence or protect future snapshots.

- **R1-12 | HIGH | The custody page presents a model limitation as a universal impossibility. | Evidence:** the served custody page says, “So a custodied account cannot derive its own ElGamal key or read its own confidential balance.” Its source is `web/app/src/views/CustodyView.tsx:34`. The project’s own research explicitly allows derivation inside the custody boundary without releasing either secret (`docs/research/CUSTODY-2026-08-28.md:36`). The amount-policy claim likewise omits that document’s qualifications and alternative constructions. Rendering the current component confirms the absolute statement is emitted. **Smallest fix:** scope both findings to the simulated external-signer model and policies operating on public transaction data without added cryptographic support.

- **R1-13 | MEDIUM | The wallet’s named gap contains an unsupported corpus-wide negative and overstates where serialization occurs. | Evidence:** `web/api/capability.ts:81–85`, served on `/wallet`, says serialization happens “inside the extension, whose version no vendor publishes.” E-206 records checking page-side package dependencies; that does not establish absence across vendors’ published material. E-206 also explicitly allows serialization in **Xaman’s backend**, which the current sentence drops. **Smallest fix:** say the runtime codec version was not established by the dated SDK checks; retain the backend distinction and remove the unsearched universal negative. This is P-12’s prohibited shape.

- **R1-14 | HIGH | A reset or changed position can publish a false balance claim from a hard-coded account note. | Evidence:** `bun run review-work/more-probes.ts` returns an `account-missing` snapshot still carrying:

  > “Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.”

  `readAccount()` copies this note regardless of state (`snapshot.ts:49–55`), and both ledger pages render `AccountHeading` before their absence branch. A changed present position has the same problem. **Smallest fix:** derive balance-specific notes from the snapshot’s classification, or label them as historical observations and suppress them when the account/position is absent.

The footer’s current digest agrees with the artifact. Its “built from commit” attribution remains vulnerable to R1-10. Its fetched PASS is also a presentation of supplied verdict JSON, not independent browser verification of that JSON’s file digests.

The single sentence most likely to be false is:

> “So a custodied account cannot derive its own ElGamal key or read its own confidential balance.”

File: `web/app/src/views/CustodyView.tsx:34`, served in `review-input/deployed/.vercel/output/static/custody/index.html`.

The stopping condition, word for word:

> “Round one reviews the build. If it upholds any finding that changes code, a gate or a record, round two runs on the fixes alone, and it is the last unless it finds a fix that did not discharge its finding; a third round is then the owner's decision.”

**No.** These findings justify round two. Reviewing their fixes must include their consequences across the complete release path; none establishes a need to discard the preset stopping rule.

Files opened for inspection, or read as review artifacts by the probes, are listed below. Temporary output copies used the same relative filenames; test-generated fixtures and ordinary runtime dependency loading are not separate source inspections.

- Repository records/configuration: `README.md`, `CLAIMS.md`, `Makefile`, `package.json`, `bun.lock`; `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`; `docs/architecture/ARCHITECTURE-2026-08-18.md`; `docs/research/CUSTODY-2026-08-28.md`.
- `web/hosted/`: `README.md`, `build.ts`, `Dockerfile`, `snapshot.ts`, `snapshot-types.ts`, `vercel-output.ts`, `csp.ts`, `browser-check.ts`, `deploy-preflight.ts`, `compare-deployed.ts`, `licence-notices.ts`, `pages.ts`, `snapshot.test.ts`, `deploy.test.ts`, `wording.test.ts`, `csp.test.ts`.
- `tools/`: `check-web-hosted.ts`, `check-web-readonly.ts`, `check-no-secrets.ts`, `web-readonly-needles.ts`, `observer-harness.ts`, `wconf-keygen.ts`.
- `facility/src/loopback.ts`; `facility/tests/loopback.test.ts`; `signer/src/txn.rs`.
- `web/api/`: `observer.ts`, `demo-accounts.ts`, `capability.ts`, `custody-sim.ts`.
- `web/app/vite.hosted.config.ts`; `web/app/src/components/Verdict.tsx`.
- `web/app/src/hosted/`: `data.ts`, `virtual.d.ts`, `router.tsx`, `routeTree.gen.ts`, `Footer.tsx`, `wording.ts`, `LedgerReading.tsx`.
- `web/app/src/hosted/routes/`: `__root.tsx`, `index.tsx`, `capabilities.tsx`, `observer.tsx`, `issuer.tsx`, `wallet.tsx`, `custody.tsx`.
- `web/app/src/views/`: `CapabilitiesView.tsx`, `CustodyView.tsx`, `ObserverReading.tsx`, `WalletView.tsx`.
- `review-input/deployed/`: `build-manifest.json`, `container.log`, `.vercel/output/config.json`.
- `review-input/deployed/.vercel/output/static/`: `index.html`, `capabilities/index.html`, `observer/index.html`, `issuer/index.html`, `wallet/index.html`, `custody/index.html`, `gate-verdict.json`, `third-party-licenses.txt`.
- Its `static/assets/`: `capabilities-CyBiSyzZ.js`, `custody-hkJYX5SB.js`, `index-CKAZ0d8y.js`, `issuer-B7oYAUmM.js`, `LedgerReading-DqqbK6gq.js`, `observer-DQA-_pWg.js`, `routes-D9R1YHa2.js`, `styles-DJVXuOe6.css`, `Verdict-CNiIxuke.js`, `wallet-yjF0ml3-.js`.
- Detector-read package metadata/notices: `package.json` and `LICENSE` under each of `node_modules/@tanstack/{history,react-router,react-start,react-start-client,react-store,router-core,start-client-core,store}`, and `node_modules/{react,react-dom,scheduler,seroval,seroval-plugins,tailwindcss,use-sync-external-store,@noble/curves}`.
- `node_modules/@types/node/inspector.generated.d.ts`.
- Review scripts/instrumentation under `review-work/`: `mutations.ts`, `release-probes.ts`, `snapshot-probes.ts`, `control-probes.ts`, `more-probes.ts`, `provenance-probes.ts`, `build-instrumented.ts`, `reader-refusal-probes.ts`, `compare-probes.ts`, `browser-cases.ts`, `control-strength.ts`, `gate-no-package-restriction.ts`, `canary-positive.ts`, `shape-probe.ts`, `chrome-wrapper.sh`, `chrome-status.ts`.
- Review-generated files read afterward: `review-work/secret-scan.log`, `review-work/chrome-launch.log`, `review-work/canary/app.js`, `review-work/canary/raw.js`, and the subsequently removed `review-work/shape-mutant.log` and `review-work/exported/web/app/public/assets/review059.js`.
- Mutant copies read under `review-work/{release-baseline,release-changed,release-csp-duplicate,provenance-output,browser-console-error,browser-navigation-exception,shape-mutant}` and temporary `case-*`, `control-*`, and `strength-*` directories: the deployed artifact filenames listed above, plus planted `static/assets/review059.js`, `static/assets/app.js.map`, `static/notes.txt`, and `functions/api.func/.vc-config.json`, where applicable. The exported copy of `web/hosted/snapshot.test.ts` and its identical imports were also loaded by one broad test selector before cleanup.

END OF LEG A REPORT

````


## FILE: docs/reviews/REVIEW-059-packets/round-one-gemini-output.md, round one (complete)

````markdown
# REVIEW-059 Round One, Leg B Report — Hosted Demo as Built and Deployed

**Review Subject:** Static hosted demo of confidential positions on XRPL Devnet  
**Commit Under Review:** `ccf76e73bf6629b29dece98cc15a050e3f60cad4`  
**Deploy Target:** `https://xrpl-confidential-positions.vercel.app`  

---

## Question 1: Ruled versus Built

**Verdict: DEFECTS FOUND (Incomplete automated enforcement; key safety invariants rest entirely on convention or manual adherence)**

### 1. `ADR-0004` Four Rulings (D-H1 to D-H4)

* **D-H1 (Prerendered pages from one pinned snapshot, indefinite snapshot rebuilt by hand, isolated build machine):**
  * *Prerendered static pages without server handlers:* Enforced in code by `check-web-hosted.ts` Check 1 (`inventory`, lines 95–97) and Check 3 (`no-server-code`, lines 103–116).
  * *One pinned snapshot:* Pinned index read once at build time (`snapshot.ts:98`); consistency across rendered pages is enforced in code by Check 8 (`ledger-wording`, lines 150–157, `indices.size > 1`).
  * *Indefinite snapshot rebuilt by hand:* **Enforced by manual convention only** (no automated trigger/cron).
  * *Isolated build machine:* Build container invocation is defined in `web/hosted/build.ts:109–114`, but **not enforced by the gate**; `tools/check-web-hosted.ts` explicitly disclaims checking the build machine (item 3, lines 226–227). Running `build.ts` rather than a direct local build is **enforced by manual step only** (`README.md` step 2).
* **D-H2 (Ledger-source risk wording beside every ledger value):**
  * Enforced in code by Check 8 (`ledger-wording`, lines 150–156) for any page carrying `data-ledger-value`. (Note: Pages without `data-ledger-value` omit this check; see Question 6).
* **D-H3 (Option A: No issuer figure, shows mirror present under issuance key):**
  * **Enforced by convention only.** In `snapshot.ts:49–53` and `routes/issuer.tsx:32–54`, the code omits decryption routines and renders only the ciphertext. **Nothing in the gate checks for or forbids the presence of an issuer figure or plaintext balance in the output** (see finding B1-1).
* **D-H4 (Option A: Prebuilt CLI deploy, project-scoped token, no Git integration):**
  * *Preflight check before deploy:* Enforced in code by `deploy-preflight.ts:31–53`.
  * *CLI deployment, token scoping, disabling Git integration & toolbar:* **Enforced by manual step and owner convention only** (`README.md` steps 5–6, owner one-time setup).

---

### 2. `ADR-0004` "What phase 2 step 4's gate must check"

* *Inventory & provenance (admitted files, no source maps):* Enforced in code by Check 1 (`inventory`, lines 95–97) and Check 2 (`no-source-maps`, lines 99–101).
* *No server function, API route, serverless function, or middleware:* Enforced in code by Check 3 (`no-server-code`, lines 103–116).
* *No socket client, signer socket path, decryption routine, or secret-shaped value:* Enforced in code by Check 4 (`no-socket-secret-or-decryption`, lines 118–125) and `secretScan()` (`check-web-hosted.ts:182–187`, running `check-no-secrets.ts --dir`).
* *Delivered Content Security Policy with strict directives and parsed inline-script hashes:* Enforced in code by Check 6 (`csp`, lines 133–146).
* *No input asking for a seed, key, or secret:* Enforced in code by Check 7 (`no-inputs`, lines 147–148, banning all `<input>`, `<textarea>`, `<select>`, `<form>`, and `contenteditable`).
* *Every view rendering a ledger value renders D-H2 wording, network check, and ledger index:* Enforced in code by Check 8 (`ledger-wording`, lines 150–156).
* *Third-party licence notices for bundled dependencies shipped with bundle:* Enforced in code by Check 10 (`licences`, lines 166–193).
* *Public commit and gate verdict rendered on every page:* Enforced in code by Check 9 (`commit-and-verdict`, lines 162–165).

---

### 3. Architecture §6 Step 9: "What it may never touch"

* *Any server-side request handler:* Enforced in code by Check 3 (`no-server-code`, lines 103–116).
* *Any socket client or signer socket path:* Enforced in code by Check 4 (`no-socket-secret-or-decryption`, lines 118–125).
* *Any secret, seed or private key:* Enforced in code by Check 4 (needles) and `secretScan()` (`check-no-secrets --dir`, line 182).
* *Any decryption routine in shipped output:* Partially enforced in code by Check 4 (scans for `WebAssembly`, `.wasm`, `ProjectivePoint`, `mpt_`, `elgamal_`, `eval(`, `new Function`) and Check 10 (banning unadmitted crypto packages). **Decryption routines under unlisted names are not enforced** (disclaimed in item 6, lines 231–232).
* *Any input asking a visitor for a secret:* Enforced in code by Check 7 (`no-inputs`, lines 147–148).
* *Any network but Devnet:*
  * *In deployed browser:* Enforced in code by Check 6 (CSP `connect-src 'self'`) and Check 5 (`urls`, lines 127–133).
  * *During build:* **Convention only.** The container has unrestricted internet egress during `bun install` and `snapshot.ts`.
* *Any second ledger endpoint, as fallback or otherwise:* Enforced in code by `snapshot.ts:56` (`endpoint !== HOSTED_ENDPOINT` throws) and Check 5 (`urls`, line 78).
* *Any analytics, toolbar or third-party script:* Enforced in code by Check 6 (strict `script-src 'self' <hashes>`, `connect-src 'self'`, no external origins), Check 1, and Check 5. Disabling Vercel toolbar at host level is a **manual step**.
* *Any account or issuance a visitor chooses, carried in a URL the host receives:* Enforced in code by static routing configuration (Check 1, Check 3, `HOSTED_PAGES`) and Check 7 (no input forms).

---

### 4. Architecture §6 Step 9: "Falsified if"

* *Shipped output contains a server function, API route, serverless function, or middleware:* Enforced in code by Check 3 (`no-server-code`, lines 103–116).
* *Contains socket client, signer socket path, decryption routine, or secret-shaped value:* Enforced in code by Check 4 and `secretScan()`.
* *Contains any file provenance rule does not admit:* Enforced in code by Check 1 (`inventory`, lines 95–97).
* *Asks a visitor for a seed, key, or secret:* Enforced in code by Check 7 (`no-inputs`, lines 147–148).
* *Permits connection to anything but named targets:* Enforced in code by Check 6 (CSP), Check 5 (URLs), and `browser-check.ts:114–117`.
* *Renders ledger value without risk wording, network check, and ledger index:* Enforced in code by Check 8 (`ledger-wording`, lines 150–156) for tagged elements.
* *Renders a failed or negative read that cannot be placed in the pinned ledger as an empty account, or substitutes another source:* **Enforced by convention in `snapshot.ts` and loopback unit tests only.** Nothing in `runChecks()` verifies that a failed/negative read renders as an absent account rather than an empty balance.
* *Carries a visitor's lookup in a URL the host receives:* Enforced in code by static route architecture (`pages.ts`, Check 1, Check 3).
* *Publishes an issuer figure, which D-H3 ruled out:* **Enforced by convention only; nothing in the gate checks this.**
* *Ships bytes or headers other than ones gate passed:* Enforced in code by `deploy-preflight.ts` and `compare-deployed.ts`, but running both commands around deployment is **enforced by manual release procedure only**.
* *Does not render commit it was built from and gate's verdict on it:* Enforced in code by Check 9 (`commit-and-verdict`, lines 162–165).
* *Step 8's wording falsifiers hold on hosted page:* **Enforced by repository CI only (`check-disclosure-phrases.ts`). NOT enforced by the hosted gate**, which explicitly disclaims checking prose truth (`check-web-hosted.ts:228–229`).

---

### Summary of Items Enforced Only by Convention or Manual Step, or by Nothing

1. **D-H1:** Indefinite snapshot rebuild cadence (manual step).
2. **D-H1:** Execution inside the isolated Docker container (manual step; gate disclaims checking build environment).
3. **D-H3:** Prohibition against publishing an issuer figure in the output (**convention only; nothing in gate checks this**).
4. **D-H4:** Prebuilt CLI deployment, project-scoped token isolation, no Git integration, toolbar disabled (manual steps).
5. **§6 Step 9:** Network isolation during build (convention only; container retains network egress).
6. **§6 Step 9:** Falsifier against rendering failed/negative reads as empty accounts (convention in `snapshot.ts` only; gate does not verify rendering of missing states).
7. **§6 Step 9:** Falsifier against shipping altered bytes/headers (manual execution of preflight and compare steps).
8. **§6 Step 9:** Falsifier against step 8 wording defects on hosted pages (convention/CI only; hosted gate explicitly ignores prose).

```
B1-1 | HIGH | D-H3 and §6 step 9 rule out publishing an issuer figure, but runChecks() has no check to detect or fail on a published figure | "or publishes an issuer figure, which D-H3 ruled out;" (ARCHITECTURE-2026-08-18.md:273) vs tools/check-web-hosted.ts:89-194 | In tools/check-web-hosted.ts, add a check over static/issuer/index.html (and all HTML) asserting that no decrypted balance number or plaintext integer figure is rendered, and verify issuerMirror states match the snapshot.
```

---

## Question 2: What Each PASS Means

**Verdict: DEFECTS FOUND (Significant integrity and verification gaps between reader belief and code guarantees)**

### 1. The Gate (`check-web-hosted.ts`)
* **What a reader would believe:** That the hosted output has been proven secure, leak-free, free of all decryption code, verified for prose accuracy, and guaranteed to have originated from a sterile build environment.
* **What the code establishes:** 
  * 30 synthetic mutation controls passed against temporary copies of `.vercel/output`.
  * Every file path in `.vercel/output` matches `ADMITTED` regexes (Check 1); source maps and `sourceMappingURL` comments are absent (Check 2).
  * `config.json` is v3 and routes only to static files without server functions or middleware (Check 3).
  * Specific string literals (`NEEDLES`) and four specific connection APIs (`new WebSocket`, `EventSource`, `sendBeacon`, `XMLHttpRequest`) are absent from non-licence files (Check 4). Note: `fetch()` is not checked.
  * Absolute URLs match `ADMITTED_URLS` (Check 5).
  * CSP headers in `config.json` match hardcoded directives, and inline script hashes match parsed HTML inline scripts (Check 6).
  * Form controls are absent in prerendered HTML (Check 7).
  * HTML with `data-ledger-value` carries D-H2 text, network ID 2, matching ledger indices, and 4 account panel titles (Check 8).
  * Commit sha and `data-gate-verdict` slots exist in HTML (Check 9).
  * Licence notices match expected dependencies (Check 10).
  * `check-no-secrets --dir` passed over the output directory.
  * *Disclaimers (lines 222–234):* Does NOT check visitor egress, what Vercel serves post-upload, build machine isolation, truth of prose, client-side DOM forms created post-hydration, or unlisted decryption routines.

### 2. `browser-check.ts`
* **What a reader would believe:** That in real-world browsing across all user clients, no requests leave the origin, no policy violations occur, and client navigation functions flawlessly.
* **What the code establishes:** On a single local run using macOS headless Chrome connecting to `127.0.0.1`, loading the 6 pages produced no `securitypolicyviolation` events, all outgoing network requests intercepted via CDP began with `http://127.0.0.1:<port>/`, no uncaught console errors occurred (except expected 404s), and clicking `/observer` triggered client-side router navigation without full document reload. It establishes nothing about other browsers, network environments, or what Vercel serves.

### 3. `deploy-preflight.ts`
* **What a reader would believe:** That the output directory is certified ready for deployment and that the deployment process is automated and tamper-proof.
* **What the code establishes:** `build-manifest.json` exists with `trial: false`; GitHub API confirms the manifest commit is reachable on `main`; `gate-verdict.json` reports `PASS`; and file counts, per-file SHA-256 digests, and the overall output digest in `.vercel/output` exactly match `gate-verdict.json`. It does not execute tests or perform deployment.

### 4. `compare-deployed.ts`
* **What a reader would believe:** That the live Vercel deployment is identical to the gated build and will remain permanently immutable and untampered.
* **What the code establishes:** At the exact timestamp the script ran, an HTTPS GET to each file and route on the public Vercel domain returned HTTP 200, byte-identical SHA-256 digests matching `gate-verdict.json`, matching security headers, no cookies, and a 404 on an unknown route. It does not prevent later CDN drift, edge middleware additions, or toolbar re-enablement.

### 5. Visitor's Footer: `PASS, 18 files`
* **What a visitor would believe:** That their browser has verified that the page they are viewing passed the gate, that all 18 files are cryptographically intact, and that the displayed content is genuine.
* **What the code establishes:** In `Footer.tsx:18–30`, the client script calls `fetch("/gate-verdict.json")` and checks if `v?.verdict === "PASS"`. If true, it displays `PASS, 18 files, output digest <first-16-hex>...`. **The browser does not compute or verify any hash of the HTML, JavaScript, or CSS it is currently executing.** If a page were tampered with while leaving `gate-verdict.json` reporting `PASS`, the footer would still display `PASS, 18 files`.

### 6. Where is the Widest Gap?
The widest gap exists between **what a visitor reading `PASS, 18 files` in the footer believes** and **what `Footer.tsx` actually does**. The footer creates the illusion of active client-side verification, but it performs an unauthenticated fetch of a static JSON file and echoes its string properties without validating a single byte of the rendered page or bundle.

```
B1-2 | MEDIUM | The footer presents "PASS, 18 files" as a live verification of the page, but Footer.tsx performs an unauthenticated fetch of gate-verdict.json without checking the integrity of running assets | "v?.verdict === 'PASS' ? `PASS, ${v.files} files, output digest ${String(v.outputDigest).slice(0, 16)}…, checked ${v.checkedAt}`" (web/app/src/hosted/Footer.tsx:23-26) | In Footer.tsx or whatThisDoesNotCheck, explicitly document that the footer displays the server's static verdict file and does not perform browser-side cryptographic attestation of loaded assets.
```

---

## Question 3: The Isolation Claim

**Verdict: DEFECTS FOUND (Container isolation overclaimed; third-party build code has full outbound internet access)**

### 1. What Access Third-Party Dependency Code Has During the Build
Inside the container (`Dockerfile` running as user `node`, executing `CONTAINER_SCRIPT` from `build.ts:60–70`):
* **Full Outbound Internet Access:** The Docker command (`build.ts:109–114`) uses default bridge networking (no `--network=none` flag). Third-party build scripts executed during `bun install --frozen-lockfile` (e.g. package lifecycle hooks) and `bunx vite build` (Vite plugins, Tailwind, TanStack Start) have unrestricted network access. They can exfiltrate any file or environment variable inside the container to arbitrary remote endpoints.
* **Local Network/Host Access:** Because the container has network access, third-party code can connect to accessible LAN services or host loopback proxies.
* **Source Tree Read/Write Access:** The directory `${src}` is bind-mounted at `/src` read-write (`-v ${src}:/src -w /src`). Dependency code can read and modify all files in the build tree.
* **Filesystem Isolation:** The container cannot read the host's `/Users`, `/Volumes`, `/private`, `/tmp`, or `/host` (verified by adjudicator measurement #4).

### 2. What the Store Check and the Two Canaries Establish
* **The Store Check (`for p in /tmp/wconf "$HOME/.wconf"; do if [ -e "$p" ] ...`):**
  * *Establishes:* Inside the container filesystem, the literal paths `/tmp/wconf` and `[the container home]/.wconf` do not exist prior to dependency installation.
  * *What is claimed beyond it:* `README.md:8` claims the build *"runs in a container that cannot reach the private stores"*. Checking that `/tmp/wconf` is absent inside the container only tests that nobody mounted that exact path to `/tmp/wconf`. If a host store were mounted elsewhere, the check would pass. The true isolation from host stores is enforced by the mount arguments in `build.ts` (mounting only `${src}`), not by the in-container script check.
* **The Two Canaries (`VITE_WCONF_CANARY` and `WCONF_CANARY`):**
  * *Establishes:* Two specific 24-character random hex strings passed in environment variables under those two prefixes did not appear verbatim in any file under `.vercel` (`build.ts:121–123`). This proves that Vite's `envPrefix` configuration prevented automatic inlining of `VITE_WCONF_CANARY`, and build scripts did not copy `WCONF_CANARY` into `.vercel`.
  * *What is claimed beyond them:* `build.ts:19–24` and `build-manifest.json` frame this as proof of an environment allowlist and prevention of build variable leakage. The check does not detect exfiltration of environment variables over the network, nor does it detect leakage of environment variables under other names or from container defaults.

```
B1-3 | MEDIUM | README claims the container build cannot reach private data, but the container runs with unrestricted outbound network access, allowing third-party dependencies to exfiltrate build files | "The build is isolated: it runs in a container that cannot reach the private stores." (web/hosted/README.md:8) vs web/hosted/build.ts:109-114 | Add --network=none to the Docker build execution, or decouple the Devnet snapshot fetch from the bundle build step and run the Vite bundle build in a strictly network-isolated container.
```

---

## Question 4: The Records

**Verdict: DEFECTS FOUND (Direct contradiction between release procedure numbering and gate disclosure; record contradictions in CLAIMS.md and Architecture)**

### 1. Single Sentence Most Likely False at this Commit

In `tools/check-web-hosted.ts:224` (and served to every visitor in `static/gate-verdict.json`):

> **"2. The SERVED bytes and headers. It checks the output before upload; step 5 compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later."**

**Why it is false:**  
In the repository's authoritative release procedure (`web/hosted/README.md:27–32`), **Step 5 is `deploy-preflight.ts`**, which runs on local files before deployment and never touches the deployed site. Comparing the deployed site with `gate-verdict.json` is **Step 7 (`compare-deployed.ts`)**. This sentence misrepresents the release pipeline, and because it is baked into `gate-verdict.json`, a false statement is published on the live site.

```
B1-4 | HIGH | check-web-hosted.ts and the live gate-verdict.json falsely state that step 5 compares the deployed site with gate-verdict.json, when step 5 is preflight and step 7 is compare-deployed | "step 5 compares the deployed site with gate-verdict.json" (tools/check-web-hosted.ts:224, static/gate-verdict.json) vs web/hosted/README.md:27-31 | In tools/check-web-hosted.ts:224, change "step 5" to "step 7".
```

---

### 2. Other Statements Contradicted by the Code Shown

1. **`CLAIMS.md` E-336:**  
   *"The deployment's own URL and the project's team alias both redirect to Vercel's login; of the addresses tried, only the alias serves the page."*  
   *Contradiction:* This sentence is internally self-contradictory: if the team alias redirects to Vercel's login, the alias cannot be the only address that serves the page. The production project domain (`xrpl-confidential-positions.vercel.app`) serves the page.
2. **`ARCHITECTURE-2026-08-18.md` §6 step 9 (lines 270–272):**  
   *"Deployed 2026-10-20 at https://xrpl-confidential-positions.vercel.app, from the public commit 34ed67a, and what was served matched what the gate passed when compared that day (CLAIMS.md E-336)."*  
   *Contradiction:* At commit `ccf76e7`, the deployed site was rebuilt and redeployed from `ccf76e7` at ledger 6,263,910 (`CLAIMS.md` E-339). Architecture §6 step 9 still cites the prior deployment commit `34ed67a`.
3. **`CLAIMS.md` E-338:**  
   *"The hosted demo's text was cut by about a third and its register habits removed, with every disclosure kept; not yet deployed."*  
   *Contradiction:* At public commit `ccf76e73bf66` (which fast-forwarded PR #17 containing E-336 to E-338), the site was redeployed (E-339).
4. **`web/hosted/README.md` step 3:**  
   *"On a pass the gate writes static/gate-verdict.json, a digest of every other file, which the page's footer shows."*  
   *Contradiction:* The footer (`Footer.tsx:24`) shows only a truncated 16-hex slice of the single composite `outputDigest`, not the per-file digests.

```
B1-5 | MEDIUM | CLAIMS.md E-336 contains a self-contradictory statement regarding whether the team alias redirects to login or serves the page | "The deployment's own URL and the project's team alias both redirect to Vercel's login; of the addresses tried, only the alias serves the page." (CLAIMS.md:E-336) | In CLAIMS.md E-336, state clearly that the canonical production project domain serves the page while deployment URLs redirect to login.
```

```
B1-6 | LOW | Architecture §6 step 9 records the deployed site as running from public commit 34ed67a, contradicting the active redeployment from ccf76e7 | "Deployed 2026-10-20 at https://xrpl-confidential-positions.vercel.app, from the public commit 34ed67a..." (ARCHITECTURE-2026-08-18.md:270-272) vs CLAIMS.md E-339 | Update ARCHITECTURE-2026-08-18.md §6 step 9 to name commit ccf76e7 and cite E-339.
```

---

## Question 5: What Visitors Read

**Verdict: DEFECTS FOUND (Negative claim without recorded search in violation of P-12)**

### 1. Analysis Against `CLAIMS.md` P-1 to P-12 and D-H2 Wording

* **P-1, P-2, P-3, P-4, P-6, P-7, P-8, P-9, P-10, P-11:** Fully observed. The pages clearly state that identities, event timing, and transaction graph are public; that holders are never private from the issuer (P-9, `/issuer`); that key rotation/recovery is unsupported (P-10); and that amounts/balances are the only confidential elements.
* **P-5:** Prominently displayed in the top banner on all routes (`routes/__root.tsx:37–39`) and on `/` (`What it never claims`).
* **D-H2 Wording:** Rendered word for word as accepted on `/observer` and `/issuer` within `<LedgerReading />`.

### 2. Violations Identified in Visitor Text

In `web/app/src/hosted/routes/index.tsx:38–41` (Page `/` visible text):

> *"Signing happens only in `wconf-signer`, a separate program on the holder’s own machine, never in a web page. The README explains how to build it and run the local version of this site. **It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs.**"*

**Finding:**  
The sentence *"It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs"* is an explicit negative claim about what documentation says, published without the search that would falsify it recorded alongside. This violates `CLAIMS.md` **P-12**:
> *"Any claim that a source does NOT say something — nothing documents it, no such field, not exported, nobody has called it out, I could not find it — without the search that would falsify it recorded alongside"*

```
B1-7 | LOW | The Overview page asserts a negative about repository documentation without a recorded search alongside it, violating P-12 | "It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs." (web/app/src/hosted/routes/index.tsx:39-40) | Rephrase positively (e.g. "Creating a holder profile and funding Devnet accounts must be done before transacting") or record the documentation search in CLAIMS.md.
```

---

## Question 6: A Gap in the Gate, by Construction

**Verdict: DEFECTS FOUND (Critical architectural gap: gate check 8 is tautological and bypassable by tag omission)**

### 1. Concrete Demonstration of the Gap

* **The Requirement:**  
  Architecture §6 step 9 specifies:
  > *Falsified if: ... or renders a ledger value without the risk wording, the network check and the ledger index it was read at;*
* **The Vulnerability in `runChecks()`:**  
  In `tools/check-web-hosted.ts:150–156`:
  ```typescript
  // 8. Every page that renders a ledger value renders the wording, the network check and the index.
  const indices = new Set<string>();
  for (const [p, h] of html) {
    if (!h.includes("data-ledger-value")) continue;
    const plain = decodeEntities(h);
    for (const para of DH2_WORDING) if (!plain.includes(para)) add("ledger-wording", ...);
    if (!h.includes(`data-network-id="${DEVNET_NETWORK_ID}"`)) add("ledger-wording", ...);
    const idx = h.match(/data-ledger-index="(\d+)"/);
    if (!idx) add("ledger-wording", ...);
    else indices.add(idx[1]);
  }
  ```
* **The Smallest Breaking Change:**
  In `static/wallet/index.html` (or `static/index.html`), add:
  ```html
  <p>Demo account rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh holds confidential balance 5000</p>
  ```
  *(Without adding the `data-ledger-value` attribute).*
* **Why `runChecks()` Fails to Report It:**
  1. Check 8 executes `if (!h.includes("data-ledger-value")) continue;` on line 151. Because `static/wallet/index.html` does not contain the literal substring `"data-ledger-value"`, Check 8 completely skips the file.
  2. None of the other checks (Check 1 inventory, Check 2 source maps, Check 3 server code, Check 4 needles, Check 5 URLs, Check 6 CSP, Check 7 inputs, Check 9 commit, Check 10 licences) inspect page bodies for unadorned ledger values or missing risk disclosures.
  3. The page renders a ledger value without the D-H2 wording, network check, or ledger index, directly falsifying §6 step 9, yet `runChecks()` reports **0 findings (PASS)**.
* **Root Cause:**  
  The gate relies on client HTML markup to truthfully self-identify when it renders a ledger value via `data-ledger-value`. If a developer adds a ledger value without the attribute, or removes the attribute from existing views, the gate is entirely blind.

```
B1-8 | HIGH | check-web-hosted.ts Check 8 only checks pages containing the literal marker 'data-ledger-value', allowing unadorned ledger values to be rendered on any page without risk wording or network checks | "if (!h.includes("data-ledger-value")) continue;" (tools/check-web-hosted.ts:151) | In check-web-hosted.ts, scan all prerendered HTML files for XRPL account addresses, issuance IDs, or ciphertext patterns; require that any page containing them renders LedgerReading and carries valid data-ledger-value attributes.
```

---

## Stopping Condition Evaluation

**The stopping condition, word for word:**  
*"Round one reviews the build. If it upholds any finding that changes code, a gate or a record, round two runs on the fixes alone, and it is the last unless it finds a fix that did not discharge its finding; a third round is then the owner's decision."*

**Does anything you found argue that this condition is wrong for this subject?**  
**YES.**

**Why:**  
1. **The subject is already live in production:** Unlike a pre-release artifact, this build is actively serving visitors at `https://xrpl-confidential-positions.vercel.app`. Several findings (B1-4, B1-8) reveal that the live site serves a verdict file containing a factual error (`step 5` instead of `step 7`) and that the gate has structural bypasses. Amending the gate (`check-web-hosted.ts`) or `gate-verdict.json` invalidates all cryptographic digests (`outputDigest`, `perFile`) and requires rebuilding and redeploying.
2. **Coupled release pipeline cannot be reviewed "on fixes alone":** The release pipeline is a tightly chained sequence (`build.ts` -> `check-web-hosted.ts` -> `browser-check.ts` -> `deploy-preflight.ts` -> `compare-deployed.ts`). A fix to `check-web-hosted.ts` or `gate-verdict.json` alters output files and digests, directly affecting preflight and deployment comparison. Restricting round two to "the fixes alone" would examine only isolated diffs without verifying that the whole deployment pipeline runs end-to-end and matches what Vercel serves.
3. **Precedent from `REVIEW-058`:** In `REVIEW-058`, scoping round two to fixes alone allowed multiple surviving errors to escape detection until a full-tree sweep was forced. A pipeline review must test the re-built and re-deployed output as an integrated whole.

---

END OF LEG B REPORT

````


## FILE: docs/reviews/REVIEW-059-packets/round-one-self-notes.md, round one (complete)

````markdown
# REVIEW-059 round one — self leg

- **Subject:** architecture §6 step 9 as BUILT and DEPLOYED: the public commit
  `ccf76e73bf6629b29dece98cc15a050e3f60cad4`, which is the commit Vercel serves,
  and the deployed output built from it (`wconf-hosted-builds/ccf76e73bf66`,
  outside every repository).
- **Author of the subject:** this project's earlier sessions. The self leg is the
  session that will adjudicate, so it reads as the leg with the most context and
  the least distance.
- **Written:** from 2026-10-20T10:40Z, **before either external leg was launched**,
  and committed only after both returned (`CLAUDE.md`, *do not commit your own
  self leg while a repo-access leg is reading the tree*).

## Measurements taken before launching, which the legs cannot take

Each was run by the adjudicator on this machine on 2026-10-20.

1. **The live site still serves the gated bytes.** `compare-deployed` against
   `https://xrpl-confidential-positions.vercel.app`: PASS at 10:39:42Z.
2. **The gate passes the deployed output again.** On a COPY (the gate writes its
   verdict into the directory it checks): 30/30 controls, the full sweep with the
   local store, PASS, output digest `1332ea0a95772b12…`, which is E-339's. The new
   verdict differs from the deployed one only in `checkedAt`.
3. **The browser check passes the copy.** 6 pages, 39 requests, all same-origin,
   footer `PASS, 18 files`.
4. **An OrbStack build container sees no host path.** Running the build image with
   no mount: `/Users`, `/mnt/mac`, `/Volumes`, `/private`, `/host`, `/run/host`
   all absent; the user is `node`, whose home directory is inside the image.
5. **An OrbStack build container DOES reach the Mac's loopback.** A throwaway
   listener bound to `127.0.0.1` only, on the Mac, answered `200 probe-ok` to
   `fetch` from inside the build image via both `host.docker.internal` and
   `host.orb.internal`. `127.0.0.1` inside the container did not reach it. No
   other service was contacted.

## Findings

### S-1 — MEDIUM, measured. Every check that models the policy reads `routes[0]` only, and the gate admits headers on any route

`tools/check-web-hosted.ts` check 3 allows the keys `src`, `dest`, `headers`,
`continue` and `handle` on every route. Check 6 reads the Content-Security-Policy,
`X-Content-Type-Options` and `Referrer-Policy` from `config.routes[0]` only.
`browser-check.ts:42` serves every response with `config.routes[0].headers`, and
`compare-deployed.ts:24` takes its expected headers from the same place.

Measured with `runChecks` on the deployed `config.json` plus one route
`{ src, headers: { CSP: "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *", X-Content-Type-Options: "", Referrer-Policy: "unsafe-url" }, continue: true }`:
**0 findings** when it is inserted second as a catch-all, **0** when it is scoped to
`/issuer(/.*)?`, **0** when appended last.

So the two pre-upload checks both pass an output whose routing replaces the
policy, and the browser check would load the pages under the policy the output
does NOT deliver. Only `compare-deployed`, after the upload, would see a served
header that differs from `routes[0]`'s, and only if the host applies the later
route's header. That last point is not measured: whether Build Output API v3
lets a later `continue` route override a header an earlier one set.

The gate's own comment for check 6 says *"The Content Security Policy, as
config.json delivers it"*. As written it is the policy `routes[0]` declares.

**Fix:** check 3 refuses `headers` on any route but the first, with a control
for each of the three placements above. Then all three readers agree by
construction rather than by convention.

### S-2 — MEDIUM, measured. The build is isolated from the private stores' FILES, not from the build machine's loopback

Measurement 5. Third-party code runs in the container during `bun install`, the
snapshot (which imports the ledger codecs) and `vite build`. It can open
connections to any service listening on the Mac's `127.0.0.1`. On the build
machine at the time of writing, `lsof` lists a password manager's local port, IDE
agents, a local model server, the Claude Code process and OrbStack's own ports
among them. The local web tier, if running, is reachable too; since E-241 it
serves only signer-local status, so this project's own exposure is small.

What the records say: `build.ts`'s header says the container *"sees ONE
directory"*, and the README says the build *"cannot reach the private stores"*.
Both are true of files. Neither names the network, and the container has outbound
network by default, so anything such code reads from a loopback service it can
also send out. `ADR-0004`'s build-machine paragraph priced *"the build user's file
access"*.

**Fix, for adjudication:** at least name it in the README, the manifest's
`isolation` string and `ADR-0004`. Better, measured before it is claimed: run
`vite build` and the assembler in a second container with `--network none`, since
neither needs the network, and check whether Bun's default of not running
dependency lifecycle scripts covers `bun install` (no `trustedDependencies` in any
`package.json` here).

### S-3 — LOW, measured. The gate does not check two of the five headers the assembler sets

`vercel-output.ts` sets `Cross-Origin-Opener-Policy` and `Permissions-Policy`.
Check 6 checks only the policy, `X-Content-Type-Options` and `Referrer-Policy`.
Deleting both from `routes[0]`: **0 findings**. `compare-deployed` does check
them, against whatever `config.json` holds, so it confirms only that the host
served what the output said.

### S-4 — LOW, measured. The licence file has two regions no check reads

Checks 4 and 5 skip `static/third-party-licenses.txt` entirely. Check 10 parses
`[preamble, header, body, header, body, …]` and verifies each header-and-body
pair, so the preamble and any unpaired trailing part are never compared to
anything. Prepending a third-party URL, the signer socket path and
`WebAssembly` to the preamble: **0 findings**. The file is served as text and
never executed, which is why this is LOW. The secret sweep still reads it.

### S-5 — LOW. The preflight trusts the verdict file instead of re-running the checks

`deploy-preflight.ts` compares every file with the digests in
`gate-verdict.json`. An output altered together with a rewritten verdict passes
it. A hostile same-user process is in scope (issue #1). `runChecks` needs no
secret store and takes under a second, so the preflight could re-run it on the
exact bytes about to be uploaded. The controls and the secret sweep would stay
the gate's.

### S-6 — LOW, a record. The architecture document's latest revision line says step 9 is not built

`ARCHITECTURE-2026-08-18.md:5`, revision 11: *"Step 9 is not built."* §6 step 9
itself says built, gated and deployed. The header is what a reader meets first.
This is phase 1's lesson (E-336's row records the same shape one sentence over):
a ruling that changes state leaves every sentence describing the old state, and
no gate finds them.

### S-7 — LOW, wording. The gate's printed limits name "step 5" for the comparison

`whatThisDoesNotCheck()` item 2 says *"step 5 compares the deployed site"*. The
README's procedure numbers that comparison **step 7**; step 5 there is the
preflight. "Step 5" is the launch plan's phase 2 numbering. The text ships to
visitors inside `gate-verdict.json`'s `doesNotCheck`. `browser-check.ts`'s header
says *"`ADR-0004` step 4"*, and the ADR has no numbered release steps.

### S-8 — note, not a finding yet. Check 8 applies to pages that opt in

The D-H2 wording, network check and ledger index are required only on pages
carrying `data-ledger-value`, a marker the renderer sets. Today only `/observer`
and `/issuer` carry it. The overview renders the ledger index in its footer
sentence (*"read at validated ledger 6263910"*) without the marker or the D-H2
wording. Whether a footer's provenance line is *"a ledger value"* in the
falsifier's sense is a question for the legs. A page that rendered a balance
outside `LedgerReading` would escape the check, and no control covers that.

## What I tried and could not break

- **Provenance of the deployed bytes.** The preflight's `compare/<sha>...main`
  check, the verdict digest and `compare-deployed` agree, and measurement 1 and 2
  reproduce E-339's digest.
- **Hash-as-parsed.** `csp.ts` normalises CR/LF and NUL as the HTML parser does,
  and the NUL control fails a raw hash. Not attacked further: other
  preprocessing (for example a lone surrogate or a BOM) is not in TanStack's
  output today.
- **No server code.** No `functions/`, top-level keys limited to `version` and
  `routes`, every `dest` a file in the output. The rewrite and middleware
  controls fire.

````


## FILE: docs/reviews/REVIEW-059c-adjudication-round-one-2026-10-20.md, round one (complete)

````markdown
# REVIEW-059c — adjudication of round one: the hosted demo as built and deployed

- **Date:** 2026-10-20
- **Subject:** architecture §6 step 9 as BUILT and DEPLOYED: the public commit
  `ccf76e73bf6629b29dece98cc15a050e3f60cad4`, which the live site was built from,
  and the deployed output built from it.
- **Why it ran:** the owner ruled on 2026-10-20 that step 9's build gets a review
  round. `REVIEW-058` reviewed the design over three rounds; the build had been
  checked by its own tests and controls and by no outside reader.
- **Register:** `CLAIMS.md` E-342. **Result:** the fixes listed under *What
  changes*, which round two reviews.

## The legs, and how their packets differed

| leg | model and access | packet |
|---|---|---|
| A | Codex `gpt-6.1-sol`, effort `high`, a fresh clone of the PUBLIC repository at the frozen commit under `$TMPDIR` with no remote, plus a byte copy of the deployed output root; `workspace-write` with network | five seams, with instructions to test by mutation on local copies and to run the live comparison. `round-one-prompt-codex.md` |
| B | Gemini through `agy`, effort `high`, no tools, from an empty directory | six questions, with 32 whole files, 26 whole register rows and the deployed pages' visible text inline. `round-one-prompt-gemini.md` |
| self | the adjudicator | written from 10:40Z, before either leg was launched, and committed only after both returned. `round-one-self-notes.md` |

**Withheld on purpose:** the self leg's measurement 5, that the build container
reaches the Mac's loopback through `host.docker.internal`, was in neither packet.
Both packets carried measurements 1 to 4. Leg B reached the network half from the
code alone (B1-3). Leg A described *"unrestricted build networking"* in seam 4 and
did not grade it.

Leg A ran its review scripts inside its clone, and they are kept in
`round-one-codex-review-scripts.md`. The transcripts were scrubbed with
`tools/scrub-personal-data.ts` before commit: 51 temp paths, and one container
home path in leg B's report replaced by hand with `[the container home]`.

## ⚠ Two defects in running the round, recorded first

**Leg A's first attempt was void.** It ran Step 0 and was stopped by the model
provider: *"This content was flagged for possible cybersecurity risk"*, 11,202
tokens, no review (`round-one-codex-attempt-1-stderr.txt`). The prompt asked an
*"adversarial reviewer"* to *"break"* things and *"construct outputs that
violate"* rules, and it named the private stores as holding *"real secrets"*.
The second attempt carried the same seams and questions reworded as a defensive
code review (mutation tests on local copies, *"find defects"*), and ran to
completion in 15 minutes. **The rewording changed no seam, question, grading rule
or stopping condition**. `round-one-prompt-codex.md` is the second wording; the
first is preserved verbatim in `round-one-codex-attempt-1-stderr.txt`, where
Codex echoed it before it was stopped.

**Leg B did not exit.** Its report ended with `END OF LEG B REPORT` by 10:54Z;
`agy` was still running at 11:08Z, ignored `SIGTERM`, and was stopped with
`SIGKILL` (exit 137). Nothing was lost.

## Where the legs agreed, and whether they could have disagreed

Three findings were reached by two legs from different evidence:

- **Check 8 trusts the page to label itself** (S-8, R1-2, B1-8). Leg B argued it
  from the gate's code inline; leg A demonstrated it by removing the marker and
  the wording together, and by hiding the wording with a stylesheet.
- **The policy check reads one string that is not the policy a browser enforces**
  (S-1, R1-1). The self leg measured a later route overriding the header; leg A
  found a duplicate directive inside the first route, which the self leg missed.
- **The build has network** (S-2, B1-3). The self leg measured loopback reach;
  leg B reasoned about outbound egress from the absent `--network` flag.

Each pair had different access and different evidence. That agreement is not one
reading distributed.

## Rulings

Grades are the leg's unless the ruling changes them. Every finding was checked at
source before it was ruled; the measurements are the adjudicator's, 2026-10-20.

| id | leg | claimed | ruling | why, and the fix |
|---|---|---|---|---|
| R1-1 + S-1 | A, self | HIGH, MEDIUM | **Upheld, HIGH** | **Measured**: a policy beginning `connect-src *;` gets 0 findings, because `new Map` keeps the last of two duplicate directives and a browser enforces the first. The browser check serves that same string and sees no cross-origin request; `compare-deployed` compares the identical string. **Nothing in the procedure notices, and the page would permit a connection anywhere.** S-1's later-route override also gets 0 findings in three placements. Fix: refuse a duplicate directive, refuse `headers` on any route but the first, and add a control for each |
| R1-10 | A | HIGH | **Upheld, HIGH** | **Measured by a real container build**: a file planted in a pre-existing `work/src` reached `static/assets/review059.js` in the output of a build of `ccf76e7`, which does not contain it; the build exited 0, the manifest said it mounted *"only a git archive of the commit"*, and `runChecks` gave 0 findings. Fix: the build refuses an existing `--out`, refuses the repository root, and checks the exported tree against `git ls-tree` of the commit before the container runs |
| R1-2 + B1-8 + S-8 | A, B, self | HIGH, HIGH, note | **Upheld, regraded MEDIUM** | The output complies today; the gap is that check 8 applies only to pages that label themselves, so a regression would pass. Fix: a named set of ledger pages must carry the marker; no other page may carry a 66-byte ciphertext; the browser check asserts the D-H2 sentences are in each ledger page's rendered text, which a stylesheet cannot hide from it |
| B1-1 | B | HIGH | **Upheld, regraded LOW** | D-H3 is held by the build having no issuer key, not by the gate: the container mounts neither store, so no figure can be computed, and one could enter only as text in a public commit. Fix: the gate's printed limits say so |
| R1-3 | A | MEDIUM | **Upheld** | The cryptography-package control fires because its fabricated notice does not match the package's licence file, not because the package is unadmitted. Fix: plant the authentic notice and require the *"not admitted"* finding |
| R1-4 | A | MEDIUM | **Upheld** | Removing seroval's entry gets 0 findings; only React and React DOM are required. The shipped list equals the 15 admitted packages, so the gate now requires equality, with a single-entry deletion control. Item 7 of the printed limits is corrected |
| R1-5 | A | MEDIUM | **Upheld** | **Measured**: leg A's two copies, one logging `console.error` and one throwing after the final navigation, both PASS the browser check, whose header says it fails on *"any uncaught exception or console error"*. Fix: handle `Runtime.consoleAPICalled` errors, and check the final navigation's interval like every page's, with self-test cases for both |
| R1-6 | A | HIGH | **Upheld, regraded MEDIUM** | Confirmed at `compare-deployed.ts:34-58`: no content-type check, the verdict's status never checked, and `/<page>/` never fetched though the routes serve it. Each needs the host to misbehave in a way that changes bytes it was not asked about. Fix: check all three |
| R1-7 + S-5 | A, self | MEDIUM, LOW | **Upheld** | `if (manifest.trial)` passes a manifest with no `trial`; the manifest's ledger is never compared with the pages'; an output altered together with its verdict passes. Fix: `trial === false`, the manifest's ledger index must equal every ledger page's, and the preflight re-runs `runChecks` on the bytes about to be uploaded |
| R1-8 | A | HIGH | **Upheld, regraded MEDIUM** | Confirmed: `readAccount` reads the position, `observerView` reads it again, and a negative second answer becomes zeros under state `present`. An honest pool cannot answer both ways at one validated index; a lying one is D-H2's accepted risk and could show any value. It is still the falsifier's shape and one read removes it. Fix: one read, passed to the view |
| R1-9 | A | MEDIUM | **Upheld in part, LOW** | `snapshot()` reads `server_info` again and ignores its `network_id`: fixed, the pin refuses a second answer that is not Devnet. Pinning the ledger hash is **not** done: within D-H2's accepted risk a lying server can make any value wrong, the facility reader is shared with step 7, and the Rust reader would drift (E-330's shape). Named as a residual |
| R1-12 | A | HIGH | **Upheld, regraded MEDIUM** | The custody page says a custodied account *"cannot derive its own ElGamal key"*. The research it summarises names the exception — a platform deriving inside its own boundary is *"not obviously impossible"* (`CUSTODY-2026-08-28.md`) — and the page dropped it. Overstated, not invented. Fix: state the exception and why it needs issue #10 |
| R1-14 | A | HIGH | **Upheld, regraded MEDIUM** | Holder A's note is a hard-coded claim about ledger state. It matches today's reading; any send to A's inbox or a Devnet reset makes it false at the next rebuild, and it renders above an absent account too. Fix: the note describes the account, not its balances, with a test that no note names a balance state |
| S-2 + B1-3 | self, B | MEDIUM | **Upheld** | **Measured**: a listener bound to the Mac's `127.0.0.1` answered from inside the build image. The records say the container *"cannot reach the private stores"*, true of files, silent on network. Fix: the Vite build and the assembler run in a second container with `--network none`; install and the snapshot keep network, and the README, the manifest and `ADR-0004` name what remains |
| R1-11 | A | MEDIUM | **Upheld, regraded LOW** | The canaries prove two values are absent **verbatim**. Fix: the records say verbatim |
| R1-13 | A | MEDIUM | **Upheld, LOW** | The wallet gap drops E-206's *"or in Xaman's backend"* and states an undated negative. Fix: restore the backend case and date the check to E-206 |
| S-3 | self | LOW | **Upheld** | The gate now checks `Cross-Origin-Opener-Policy` and `Permissions-Policy` too |
| S-4 | self | LOW | **Upheld** | The licence file's preamble must equal the build's fixed header, and an unpaired trailing part is refused |
| S-6 | self | LOW | **Upheld** | The architecture document's revision line said *"Step 9 is not built"*. A revision 12 line records the build, the deploy and this review |
| S-7 + B1-4 | self, B | LOW, HIGH | **Upheld, LOW** | *"Step 5"* is the launch plan's numbering; the README, which is the release procedure, calls it step 7. Ambiguous rather than false. Fix: name the README's step 7 |
| B1-2 | B | MEDIUM | **Upheld, regraded LOW** | The footer echoes the published verdict and checks nothing in the browser. Fix: the footer says so |
| B1-5 | B | MEDIUM | **Upheld, regraded LOW** | E-336 uses *"alias"* for two addresses. Fix: name the production alias; the same sentence in `NEXT-SESSION-PROMPT.md` too |
| B1-6 | B | LOW | **Upheld at the public commit; already fixed in the archive** | The archive's §6 step 9 names the `ccf76e7` redeploy (E-339); it publishes with the next public update |
| S-9 | self | LOW | **Upheld** | Found while ruling B1-7: the README says the repository *"does not tell you how to create"* a holder profile, while `signer/README.md` documents the profile's fields and an onboarding command that prints them. Fix: narrow it |
| B1-7 | B | LOW | **Rejected** | The overview says the README *"does not yet explain"* profile creation. That is a statement about the project's own README, which says the same in its own words, and the README's *Run it* section carries no such steps (read 2026-10-20). P-12's search is reading the section the sentence names |
| table rows | A | — | **Rejected as findings, kept as context** | A changed amount, both ledger indices changed together, and an obfuscated socket name pass `runChecks`. The gate has no ground truth for values, the preflight now binds the index to the manifest, and the policy's `connect-src`, fixed under R1-1, is what stops an assembled connection. Two rows lead to fixes: a protocol-relative script URL is now matched by the URL check, and a script-created `prompt()` is named in the printed limits beside item 5 |

## The stopping condition

Set before the round, word for word: *"Round one reviews the build. If it upholds
any finding that changes code, a gate or a record, round two runs on the fixes
alone, and it is the last unless it finds a fix that did not discharge its
finding; a third round is then the owner's decision."*

Leg A: **no**, but round two must include the fixes' consequences across the
release path. Leg B: **yes**, because the pipeline is chained: a fix to the gate
changes every digest, and reviewing a diff alone would not show that the whole
procedure still runs.

**Ruled: the condition stands, and leg B's point is taken as a statement of what
"the fixes" are.** Round two's subject is the fix diff **and** an output rebuilt
from a commit carrying it, gated, browser-checked and preflighted under the fixed
tooling. It is not a redeploy: deploying is the owner's step, and the comparison
against the live site is the owner's to run after it.

## What changes, and what does not

The live site is unchanged by this round. Four fixes change page text (R1-12,
R1-13, R1-14, B1-2), so the demo is stale until it is rebuilt from a public commit
carrying them and the owner redeploys. Until then the deployed custody page
carries the overstated sentence.

Residuals named, not fixed: the ledger hash is not pinned (R1-9); third-party code
in `bun install` and the snapshot keeps network and can reach the build machine's
loopback (S-2); dependency code can still modify `/src` during the build, which
neither the canaries nor the tree check see (R1-10's second half).

````


## FILE: the fix diff, a5c897a..c08db2b (derived register files omitted; for orientation — read the whole files below) (complete)

````diff
diff --git a/CLAIMS.md b/CLAIMS.md
index b907bc1..0d027fd 100644
--- a/CLAIMS.md
+++ b/CLAIMS.md
@@ -393,13 +393,15 @@
 | E-333 | **vite's only root licence file aggregates the licences of everything it bundles and carries 35 personal email addresses, so a verbatim copy cannot pass both the inventory's byte-identity rule and the secret sweep's email rule.** Neither gate was loosened. The 42 transcript lines that reproduced vite source, a review leg's printout of `loadEnv` and its grep hits, are elided in place, each keeping its source line number, so the transcript's line count and the later citations into it hold. The elided lines are vite's published source at 8.2.2, re-fetchable at the path each marker names. The leg's M11 finding rests on its canary build, not on the quotation | Staging `LICENSES/vite-MIT.md`, a copy of `node_modules/vite/LICENSE.md`, failed `make check-no-secrets` with 35 email hits in that file. With the elision and no vite entry, the inventory passes on 11 projects and the sweep passes. `round-one-codex-stderr.txt` keeps 10,162 lines, and lines 9817 to 9842, which `round-two-codex-output.md` cites, are unchanged. The two local commits that briefly held the copy were rebuilt before any push, so no reachable commit contains it | A, measured |
 | E-334 | **Architecture §6 step 9 is built and gated but not deployed, and the browser check caught a policy the gate had passed.** `check-no-secrets --dir` reads every file under a build output with no git filter, so an ignored `dist/` file is scanned (`REVIEW-058` R1-9). The facility reader gains a pinned existence check. The hosted pages are a second route tree that renders the local tier's page bodies and reads one build-time snapshot, with no API. `web/hosted/build.ts` builds a commit's `git archive` in a container that mounts neither private store, and two canary variables must not reach the output. The hosted gate, `check-web-readonly --hosted`, runs its controls over broken copies of the real output, then checks the output and writes a verdict the footer shows. The first assembler and the gate hashed inline scripts over the file's bytes. TanStack Start's hydration script carries NUL bytes, which the HTML parser turns into U+FFFD before the policy is checked, so every page's hydration was refused under a policy the gate had passed. `web/hosted/browser-check.ts` found it, and one shared function now hashes the parsed text, with a control that a raw-byte hash fails. seroval's licence notice, which TanStack Start bundles, names its author's personal email, and the secret sweep failed the output on it until the owner ruled (E-335) | `make ci` 262 / 5 / 0; `bun test web/hosted` 19, `web/api` 131, `facility/tests/loopback.test.ts` 39. `check-no-secrets` 111 controls, `break-no-secrets-gate` 93 probes. A trial build from the working tree read ledger 6,249,946; on its output the gate passed 28 of 28 controls and failed only on the two seroval emails, and the browser check passed six pages and 39 same-origin requests. After E-335, a trial at ledger 6,258,942 passed the gate's 30 controls and its full sweep with the local store, and the footer showed `PASS, 18 files`. Before the fix, every page reported a `script-src-elem` violation with the sample `(self.$R=self.$R\|\|{})["tsr"]`, and the file's script held two NUL bytes. Devnet, rippled 3.4.1, ledger 6,249,566: an absent account root answered `entryNotFound` with `validated: true` and the pinned index. Inside the container, Vite under Bun could not prerender, and `localhost` resolved to `::1` while the request went to `127.0.0.1`; the image runs Vite under Node, and the preview server binds `127.0.0.1` | A, measured |
 | E-335 | **The owner ruled the licence email redacted and kept the CLI deploy, and `claims-check` found five overstatements in the hosted build's own README before it was published.** On 2026-10-20 the owner ruled seroval's address replaced by a marker in the shipped notice, which keeps the year and holder, and the gate now checks each notice against the package's own licence file with only addresses removed. Offered Git integration's costs, the owner kept D-H4's prebuilt CLI deploy, and said yes to publishing the step 9 code. The README called the endpoint ~~*"one public node"*~~, the phrase `629f216` corrected, which also survived in ADR-0004's D-H1 table. It also called the local tier unchanged when its routes had moved into shared views, and a commit "of the public repository" that nothing checked; the preflight now asks GitHub. Controls added: decoy stores refused in the container, a planted canary found, a request to another origin and a page whose script never ran both reported, and the footer required to show a verdict that exists. The snapshot's reads are separate requests to a pooled endpoint, where E-327 said a snapshot must stay on one connection; each answer must name the pinned validated ledger, and one that cannot fails the build | `bun run web/hosted/build.ts --self-test` and `browser-check.ts --self-test` pass, and each fails with its check removed. `gh api repos/nandanito/xrpl-confidential-positions/compare/<sha>...main` answered `ahead` for `d135eed` and 404 for an archive-only commit. `bun test web/hosted` 28. A control first restored the email at the file's header line, which changes no notice, and the gate refused its own run rather than passing it. `git grep -n "vercel deploy"` finds the command only as printed text | A, measured |
-| E-336 | **Architecture §6 step 9 is deployed, and when compared on 2026-10-20 what Vercel served was byte for byte what the gate passed.** On 2026-10-20 the owner ran `vercel deploy --prebuilt --prod` in their own terminal with a project-scoped token, which never entered this session. The output was built in the container from the public commit `34ed67a` at ledger 6,259,125. The gate passed 30 of 30 controls and its full sweep, the browser check passed six pages and 39 same-origin requests with the footer showing `PASS, 18 files`, and the preflight found the commit on public `main`. The host adds headers the build does not set, among them `access-control-allow-origin: *`, which lets other origins read files that are public and carry no cookie. The deployment's own URL and the project's team alias both redirect to Vercel's login; of the addresses tried, only the alias serves the page. The owner named the plan: Vercel Hobby, which is free and has no billing; in Vercel's words, exceeding a limit means waiting 30 days in most cases, so the failure is the page going down, not a bill. Vercel restricts Hobby to non-commercial, personal use. Who acts when the page goes down is not yet named. The CLI version, the toolbar setting, whether a Git repository is connected, and a check from a machine that has never run the project were not reported to this session. ⚠ Architecture §6 step 9 still said the gate failed until the owner ruled on the email, a sentence E-335's ruling made false and its commit did not touch | `bun run web/hosted/compare-deployed.ts` against `https://xrpl-confidential-positions.vercel.app` passed on 2026-10-20: 17 files by digest, six routes, the verdict file, a 404 for an unknown path and no cookie. Two controls on copies of the output, run against the live host, failed as they should: a zeroed digest named `/observer/index.html`, and an altered policy named the header on every file. Verdict digest `f88c1d4a…bfb77`, commit `34ed67a9f2f5…`. `curl -sI` on `/` and `/gate-verdict.json` showed `access-control-allow-origin: *`, `strict-transport-security` and `cache-control: public, max-age=0, must-revalidate`; the deployment URL and the team alias each answered 302 to `vercel.com/sso-api`. Vercel's Hobby page, updated 2026-09-14: 100 GB of Fast Data Transfer and 1,000,000 CDN requests a month. The output's files total 481,661 bytes uncompressed | A, measured |
+| E-336 | **Architecture §6 step 9 is deployed, and when compared on 2026-10-20 what Vercel served was byte for byte what the gate passed.** On 2026-10-20 the owner ran `vercel deploy --prebuilt --prod` in their own terminal with a project-scoped token, which never entered this session. The output was built in the container from the public commit `34ed67a` at ledger 6,259,125. The gate passed 30 of 30 controls and its full sweep, the browser check passed six pages and 39 same-origin requests with the footer showing `PASS, 18 files`, and the preflight found the commit on public `main`. The host adds headers the build does not set, among them `access-control-allow-origin: *`, which lets other origins read files that are public and carry no cookie. The deployment's own URL and the project's team alias both redirect to Vercel's login; of the addresses tried, only the production alias, `xrpl-confidential-positions.vercel.app`, serves the page. The owner named the plan: Vercel Hobby, which is free and has no billing; in Vercel's words, exceeding a limit means waiting 30 days in most cases, so the failure is the page going down, not a bill. Vercel restricts Hobby to non-commercial, personal use. Who acts when the page goes down is not yet named. The CLI version, the toolbar setting, whether a Git repository is connected, and a check from a machine that has never run the project were not reported to this session. ⚠ Architecture §6 step 9 still said the gate failed until the owner ruled on the email, a sentence E-335's ruling made false and its commit did not touch | `bun run web/hosted/compare-deployed.ts` against `https://xrpl-confidential-positions.vercel.app` passed on 2026-10-20: 17 files by digest, six routes, the verdict file, a 404 for an unknown path and no cookie. Two controls on copies of the output, run against the live host, failed as they should: a zeroed digest named `/observer/index.html`, and an altered policy named the header on every file. Verdict digest `f88c1d4a…bfb77`, commit `34ed67a9f2f5…`. `curl -sI` on `/` and `/gate-verdict.json` showed `access-control-allow-origin: *`, `strict-transport-security` and `cache-control: public, max-age=0, must-revalidate`; the deployment URL and the team alias each answered 302 to `vercel.com/sso-api`. Vercel's Hobby page, updated 2026-09-14: 100 GB of Fast Data Transfer and 1,000,000 CDN requests a month. The output's files total 481,661 bytes uncompressed | A, measured |
 | E-337 | **The owner named who acts when the demo goes down: the owner.** On 2026-10-20 the owner said they act if the page goes down, which completes `ADR-0004`'s list for availability and cost. The owner also said the project is public and approved publishing the deploy record. The demo stays on the owner's Hobby team; the owner's paid team belongs to a different organisation. Still not reported: the CLI version that ran the deploy, the toolbar setting, and whether a Git repository is connected; all three were reported later that day (E-340) | The owner's messages in the session of 2026-10-20 | A, recorded |
 | E-338 | **The hosted demo's text was cut by about a third and its register habits removed, with every disclosure kept; not yet deployed.** On 2026-10-20 the owner asked for the demo's text to read like the README: not verbose, and without filler. The observer page printed the public and hidden lists once per holder, four times, and now prints them once. The custody page repeated one caveat on six flows and repeated the matrix's custody row; the caveat is a numbered note and the row is gone. The issuer page said two paragraphs once per holder and now says them once. Warning marks, capitalised emphasis and remarks about the register itself are gone from the page text. Two account notes called balances non-zero, which no visitor can check, the reason the issuer page publishes no figure; they now say what the ledger shows. A matrix cell said a regular key means the master seed is not the spending authority, and now says authority may sit elsewhere. A wallet cell said three wallets sign and submit any transaction type, where the source is about what their APIs accept. ⚠ The custody page chose which reasons become flow caveats by a warning mark inside the reason's text, and no test covered it, so removing the marks would have dropped every caveat silently; it is a field now, with two tests. The D-H2 wording is unchanged, as ruled | The six pages' visible text went from 5,352 words to 3,463, both counts including the header, footer and ciphertexts. A trial build from the working tree at ledger 6,263,285 passed the gate's 30 controls and its sweep, and the browser check passed six pages and 39 same-origin requests with the footer showing `PASS`. `bun test web/api web/hosted` 161 pass; `make ci` 273 / 5 / 0. Deleting the caveat field fails the new test, and a hosted route that stops importing its shared view fails the import test. Changed tests: the zero note is matched case-insensitively, the custody notice is anchored to the first finding instead of the removed panel, the custody row matches `simulation` case-insensitively, and the shared-view import may name a second export. The signer refuses a `Send` without an `IssuerEncryptedAmount` (`signer/src/txn.rs:786-793`), which is what the new sentence that send amounts are not hidden from the issuer rests on | A, measured |
 | E-339 | **The demo's shorter text is live: the owner redeployed from the public commit `ccf76e7`, and when compared on 2026-10-20 what Vercel served was byte for byte what the gate passed.** PR #17 carried E-336 to E-338 to the public repository and was fast-forwarded onto `main`. The container built `ccf76e7` at ledger 6,263,910; the gate passed 30 of 30 controls and its sweep, the browser check passed six pages and 39 same-origin requests with the footer showing `PASS, 18 files`, and the preflight found the commit on public `main`. The owner ran the deploy in their own terminal. ⚠ A check that the build carried the new text first read zero matches for phrases the gate had just counted, because the pages hold NUL bytes and `grep` treated them as binary and printed nothing; `grep -a` found every phrase | `compare-deployed` against `https://xrpl-confidential-positions.vercel.app` passed at 2026-10-20T05:28:35Z, and the served `gate-verdict.json` names `ccf76e73bf66` with digest `1332ea0a95772b12…`. Two controls on copies of the output failed against the live host as they should: a zeroed digest named `/custody/index.html`, and an altered `Referrer-Policy` named the header on every file. `check-no-secrets --strict-history` on the public repository passed 111 of 111 controls over 738 files and 861 history objects; `make ci` there 273 / 5 / 0, and the `checks` workflow passed on the PR and on `main`. `grep -ao` on the built pages: no warning marks on any page, one `Two findings`, four `Observer view: ` labels, one `Public` list | A, measured |
 | E-340 | **The owner reported the rest of the deploy setup: no Git repository is connected to the Vercel project, the toolbar is off, and the deploys ran on the pinned CLI, 62.4.0.** On 2026-10-20 the owner reported all three, which completes the one-time setup in `web/hosted/README.md` for this deployment. The owner also opened the site on a phone, a machine that has never run the project, and said it works. Whether the footer there showed `PASS` was not reported at first; asked, the owner reported that it did, which completes the check. The owner will delete a stray empty project that Vercel's dashboard created, and is letting the deploy token expire as planned rather than revoking it | The owner's messages in the session of 2026-10-20. `vercel --version` on the owner's machine printed `Vercel CLI 62.4.0` the same day; that shows what is installed now, not what ran the deploys | A, recorded |
 | E-341 | **The filings were re-surveyed at source on 2026-10-20 before either post is drafted, and two things E-316 did not record were found: the Japanese copy of the docs page still says the encrypted zero is indistinguishable, and a draft key-rotation standard, XLS-99, exists.** No filing has a comment from anyone outside this project since 2026-10-18. mpt-crypto #145 and #152 are open at the heads E-316 read, and #153, #154 and #155 have no reply. XLS-0096 at XRPL-Standards `master` is byte-identical to `58ccd3047`, and every check E-316 lists holds on it. #3879's fix reached the English page only: the Japanese page was translated from the text before dev-portal PR #3916, added three days before that PR merged, and never updated, and xrpl.org/ja served both sentences on 2026-10-20. XLS-0099, *ElGamal Key Rotation for Confidential MPTs*, status Draft, merged on 2026-09-03 and changed as late as 2026-10-14, adds holder, issuer and auditor key rotation and holder key-loss recovery. rippled `develop` declares its amendment `ConfidentialMPTKeyRotation` as `Supported::No`, and Mainnet, Testnet and Devnet do not know it. P-10 still holds of XLS-96; a post may say there is no rotation or recovery in XLS-96 or on those three networks today, and must name the draft. ⚠ E-316 grepped one copy of a translated page, and read the XLS-0096 line that links XLS-99 without noticing it. `REVIEW-058`'s packet quoted that line and `REVIEW-054`'s transcript listed the rippled transactor files; neither was captured | `docs/evidence/upstream-survey-2026-10-20/README.md`. `gh api` issue, comments and timeline for all eleven filings, every fetch returned a body; `gh pr view` for #604, #628, #3916, #145 and #152; XLS-0096 at `93389999a` compared with `58ccd3047` by `cmp`, and line 938 read; both language copies of the page at dev-portal `7e302d278` and live from xrpl.org, Japanese lines 96 and 127; XLS-0099's header and abstract at `93389999a`; `features.macro` at rippled `develop` `360843351` and at `3.4.1`; `check-amendments` at 2026-10-20T10:23:11.544Z, and a `feature` query to Mainnet, Testnet and Devnet at 2026-10-20T10:37:26.256Z, none of which named an amendment matching *Rotation*. Not read: the other Japanese MPT pages, and anything about when or whether XLS-99 is enabled | A, read at source |
 | E-342 | **The first review of step 9's build, `REVIEW-059` round one, upheld 24 findings, and two would have let the release procedure publish what step 9 forbids with no check noticing.** Three legs with differed packets: Codex with a clone of the public commit and the deployed output, Gemini with 32 whole files inline, and the self leg. A policy beginning `connect-src *;` passed the gate, because the gate kept the last of two duplicate directives and a browser enforces the first; the browser check and the live comparison read the same string. A file left in a reused build directory reached the output of a build of `ccf76e7`, which does not contain it, and the manifest still said the build mounted only the commit's archive. Among the others: the gate trusts a page to label itself as showing ledger values, three controls test something next to what they are named for, the browser check ignores console errors, the build container reaches the build machine's loopback, the custody page drops its research's exception, and Holder A's note is a hard-coded balance claim. Leg A's first attempt was stopped by the provider's cybersecurity filter after Step 0 and ran again reworded as a defensive review; leg B's process did not exit and was killed after its report was complete. The live site is unchanged, and four fixes change page text, so it is stale until rebuilt and redeployed | `docs/reviews/REVIEW-059c-adjudication-round-one-2026-10-20.md` and `REVIEW-059-packets/`. Measured on 2026-10-20: `runChecks` gave 0 findings on the duplicate directive and on three later-route overrides; a container build of `ccf76e7` into a directory holding `work/src/web/app/public/assets/review059.js` exited 0 with that file in `static/assets/`; the browser check passed leg A's console-error and navigation-exception copies; a listener on the Mac's `127.0.0.1` answered `fetch` from the build image through `host.docker.internal`. Before the round, `compare-deployed` passed at 10:39:42Z, the gate passed 30 of 30 controls on a copy with digest `1332ea0a…`, and the browser check passed | A, measured |
+| E-343 | **`REVIEW-059` round one's fixes are built, and each new check was broken before it was believed; they are not yet reviewed, rebuilt from a public commit or deployed.** The gate refuses a repeated directive, headers on any route but the first, a missing or extra security header, a scheme-relative address, a ledger value on a page outside the two named ledger pages, a ledger page without its marker, a changed commit label, and a licence file whose header, tail or package list differs. Fourteen controls were added, and the cryptography-package control now plants the package's real notice. The browser check reads a page's own console errors, checks the interval after the client navigation, and requires the D-H2 wording in each ledger page's rendered text. The comparison checks content types, both spellings of each route, the verdict's status and the 404's headers. The preflight requires `trial: false`, runs the gate's checks again and matches each ledger page's index to the manifest's. The build refuses a non-empty output directory and a tree that is not the commit's, and runs Vite and the assembler with `--network none`. The snapshot reads each position once and refuses a pinning answer that is not Devnet. Four sentences visitors read changed: the custody finding names its exception, the wallet gap restores Xaman's backend and dates its check, Holder A's note no longer states its balances, and the footer says the browser checks nothing. ⚠ The build's new network control first aimed at a port where nothing listened, so it passed with the network on; then the probe ran synchronously and its own listener could not answer. Running it with the offline arguments removed found both | Measured 2026-10-20: the fixed gate passed the deployed output with 44 of 44 controls and digest `1332ea0a…`; each of the 14 new checks, deleted from a copy, failed its control; the browser check's self-test passed, and deleting each of its three new checks failed it; leg A's two browser copies now fail; `bun test web/hosted/deploy.test.ts` 16 pass, and the eight new tests fail against the old files; `web/hosted/build.test.ts` 5 pass, and each of three rules mutated fails a test; the build self-test passed, and with the offline arguments removed both halves of its network control failed; `bun test web/hosted web/api facility` 288 pass; `make ci` 288 / 5 / 0 | A, measured |
+| E-344 | **Checked against each finding's own words rather than the adjudication's summary of it, four of E-343's fixes discharged half a finding, and the second halves are now fixed.** R1-12 named two sentences on the custody page and the ruling carried one: the amount-policy claim also dropped its research's three ways out, and it had two more copies, in the capability matrix and the custody simulation. R1-8 asked for both views to be built from the position AND the issuance already read; the fix stopped re-reading the position and still read the issuance once per account. R1-7 asked for the snapshot's metadata to be bound to the pages; the fix bound the ledger index and not the read time or the address the footer shows. R1-5 asked the browser check to refuse a configuration it cannot model; the fix made the gate refuse it and left the browser check serving it as a simpler one. ⚠ The ruling summarised each finding and the fixes were ticked against the summaries, which is the shape this file's own session prompt records from 2026-10-19: two of the author's fixes narrowing the author's findings. Found before round two launched, by re-reading leg A's report finding by finding | `docs/reviews/REVIEW-059-packets/round-one-codex-output.md`, R1-5, R1-7, R1-8 and R1-12, read against `6b537e3`. Each completion has a test that fails against `e45321b`: the issuance is read zero times in `readAccount`, the preflight refuses a read time no page shows, and the browser check's server refuses a later route carrying headers. `bun test web/hosted web/api facility` 290 pass; `make ci` 290 / 5 / 0. The custody page's new sentence first called the zero-knowledge route one *"no one has specified"*, an unsearched negative, and now says this project has neither built nor costed it, which is the research's own scope | A, measured |
 
 ---
 
diff --git a/CLAUDE.md b/CLAUDE.md
index 64423ff..45c75f1 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -168,7 +168,7 @@ Bun, TypeScript strict, TanStack Start, Elysia, Tailwind + shadcn/ui, monorepo.
 
 ⚠ **NONE OF THAT EXISTS YET, and this line has always read as though it did.** There is no `apps/`, no `web/`, no React and no Elysia in `package.json`. What exists is `signer/` (Rust), `facility/` (TypeScript, no framework) and `tools/`. ⚠⚠ **AND THIS SAID *"It is architecture §6 step 8 and step 8 was written on 2026-08-26"*, WHICH WAS FALSE — CORRECTED 2026-08-28 BY GREPPING THE DOCUMENT IT NAMED.** `ARCHITECTURE-2026-08-18.md` §6 has **SEVEN** numbered steps, §7 follows step 7 directly, `grep -n "step 8"` over it returns **nothing**, and revision 8 is recorded as *"§6 step 7 only"*. ⚠ **So the web tier had no scope, no falsifier and no gate in the authority document, and this line told every new session otherwise.** The sentence was right that the web tier *"was never built rather than being behind schedule"* and wrong about why: **there was no step, not a step nobody had reached.** ⚠ **A SCOPE NOTE NEEDS A RE-CHECK DATE EXACTLY AS MUCH AS AN AMENDMENT CLAIM DOES** — this file's own lesson about the `xrpl.js` blocker paragraph, one section up, landing one section down. `CLAIMS.md` **E-204**.
 
-⚠ **CORRECTED TWICE MORE ON 2026-08-28, BOTH TIMES BY THE COMMIT THAT FALSIFIED THE PREVIOUS SENTENCE — WHICH IS THE POINT.** **(1) §6 step 8 now EXISTS**: `ARCHITECTURE-2026-08-18.md` was **revision 9** then, and is revision 11 since 2026-10-20, when step 9's rulings were recorded; step 8 carries its scope, the four ruled decisions, what it may touch, what it may never touch, its gate and its *Falsified if:* clause, and `ADR-0003` is the decision record. **(2) THE STACK LINE ABOVE IS NOW TRUE, AND THE DATE IT BECAME TRUE IS 2026-08-28.** `web/api/` is Elysia; `web/app/` is TanStack Start with React 19, Vite and Tailwind 4; `bun test web/api` was **89 tests** on 2026-08-28 and is **129** on 2026-09-09 — ⚠ this read as a live figure and was stale by 40; `make check-web-readonly` is the seventh gate. ⚠ **The two paragraphs above are kept rather than deleted because they are the evidence for E-204** — *"the web tier has no scope"* was true when written and false two hours later, and *"there is no `web/`, no React, no Elysia"* was true at the start of this session and false by the end of it. **This is the project's own lesson landing twice on the note that records the lesson, in one day.**
+⚠ **CORRECTED TWICE MORE ON 2026-08-28, BOTH TIMES BY THE COMMIT THAT FALSIFIED THE PREVIOUS SENTENCE — WHICH IS THE POINT.** **(1) §6 step 8 now EXISTS**: `ARCHITECTURE-2026-08-18.md` was **revision 9** then, and is revision 12 since 2026-10-20, when step 9's first review was recorded; step 8 carries its scope, the four ruled decisions, what it may touch, what it may never touch, its gate and its *Falsified if:* clause, and `ADR-0003` is the decision record. **(2) THE STACK LINE ABOVE IS NOW TRUE, AND THE DATE IT BECAME TRUE IS 2026-08-28.** `web/api/` is Elysia; `web/app/` is TanStack Start with React 19, Vite and Tailwind 4; `bun test web/api` was **89 tests** on 2026-08-28 and is **129** on 2026-09-09 — ⚠ this read as a live figure and was stale by 40; `make check-web-readonly` is the seventh gate. ⚠ **The two paragraphs above are kept rather than deleted because they are the evidence for E-204** — *"the web tier has no scope"* was true when written and false two hours later, and *"there is no `web/`, no React, no Elysia"* was true at the start of this session and false by the end of it. **This is the project's own lesson landing twice on the note that records the lesson, in one day.**
 
 ⚠ **WHAT IS BUILT IS READ-ONLY.** ⚠⚠ ~~*"and that is the whole reason it needed no rotation"*~~ **STRUCK 2026-09-02 — the rotation ran (`REVIEW-036`) and ruled that reasoning unsound** (E-230). Read-only bought the **signing** property and not the disclosure one. The browser talks HTTP to a local Elysia process; that process reads a rippled node and sends the signer **`Request::Status` and nothing else**. **Signing stays in `wconf-signer`.** ⚠ **`Pair` and `Prepare` are the requests that carry authority, and `tools/check-web-readonly.ts` asserts that `web/api` constructs neither** — ⚠ **that scan covers `web/api`, not the whole tier**; `web/app` is covered by a separate assertion that nothing under it reaches the socket at all. This said *"anywhere under `web/`"* until 2026-09-02, and it was the THIRD site of one phrase (E-168), which was **broken seven ways against the real tree** before it was believed. ⚠⚠ **`ADR-0003` HAS NOW HAD ITS ROTATION — `REVIEW-036`, 2026-09-02, four legs with differed packets — AND ALL FOUR RULED THE CENTRAL CLAIM UNSOUND AS STATED (`CLAIMS.md` E-230).** ~~*"a read-only tier moves no trust boundary"*~~ **RETRACTED.** Both premises are false against source: **"reads public state"** — `Store::len()` counts *"a cancelled confirmation, a failed proof, an aborted attempt"* (`signer/src/store.rs:753-756`), which public ledger history cannot reveal; **"holds no credential"** is true and is **not** the same property as *conveys nothing a credential produces*. ⚠⚠ **The boundary that moved is a DISCLOSURE boundary: the tier re-serves, unauthenticated and to any local uid, the product of two resources the project protects with `0700`/`0600` mode bits — the signer's socket and the decrypted-balance snapshot** (E-228). ⚠ **What survives, and it is what the milestone needed: the tier adds no SIGNING authority**, and every leg affirmed it. **The ADR proved that and wrote it as a universal about authority.** ~~⚠ **`ADR-0003` is revision 2, still `Proposed`, on ONE item: the issuer route is a RULING handed to the project owner with four options priced — a coding session may not choose.**~~ **Ruled 2026-09-05, option 2: the disclosure is removed and `ADR-0003` is `Accepted` at revision 3 (E-241).** ⚠ This sentence stood unstruck until 2026-10-18. Two gate defects were found and fixed: **a falsifier condition named in architecture §6 step 8 (*"the API binds to anything but loopback"*) had NO falsifier** (E-227), and **two socket detectors disagreed with the narrower wired to the whole-tier count** — the pre-fix gate **measured** exiting 0 with a real second UDS client (E-226).
 
diff --git a/GETTING-STARTED-CLAUDE-CODE.md b/GETTING-STARTED-CLAUDE-CODE.md
index cd67fb5..f35a4ee 100644
--- a/GETTING-STARTED-CLAUDE-CODE.md
+++ b/GETTING-STARTED-CLAUDE-CODE.md
@@ -12,7 +12,7 @@ Written 2026-08-13, after TASK ZERO rev 2 and the review rotation.
 
 | you want | read |
 |---|---|
-| what is open, and each step's gate | [`docs/architecture/ARCHITECTURE-2026-08-18.md`](docs/architecture/ARCHITECTURE-2026-08-18.md) §5 and §6 — **revision 11, the authority** |
+| what is open, and each step's gate | [`docs/architecture/ARCHITECTURE-2026-08-18.md`](docs/architecture/ARCHITECTURE-2026-08-18.md) §5 and §6 — **revision 12, the authority** |
 | what the project is and what runs | [`README.md`](README.md) |
 | how to work in this repository | [`CLAUDE.md`](CLAUDE.md) |
 | what may be claimed | [`CLAIMS.md`](CLAIMS.md) |
diff --git a/README.md b/README.md
index b1acff4..0281869 100644
--- a/README.md
+++ b/README.md
@@ -142,7 +142,7 @@ make web-api            # the read-only viewer: http://127.0.0.1:3011
 make web-app            #                       http://127.0.0.1:3000
 ```
 
-The signer links a patched fork of `mpt-crypto`, and the patch is committed. `make vendor-verify` checks the build tree's pin and which tracked files differ; it does not see untracked files or changes inside the files it allows, and `/tmp/wconf` is writable by any process running as you. Running the signer and the facility needs a holder profile and funded Devnet accounts, which this repository does not tell you how to create; the demo script lists what has to exist first. Walkthroughs: [the facility](docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md), [the web tier](docs/explainer/WEB-TIER-WALKTHROUGH-2026-08-28.md).
+The signer links a patched fork of `mpt-crypto`, and the patch is committed. `make vendor-verify` checks the build tree's pin and which tracked files differ; it does not see untracked files or changes inside the files it allows, and `/tmp/wconf` is writable by any process running as you. Running the signer and the facility needs a holder profile and funded Devnet accounts, and this README does not walk through creating them: [`signer/README.md`](signer/README.md) documents the profile's fields and an onboarding command that prints its lines, and the demo script lists what has to exist first. Walkthroughs: [the facility](docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md), [the web tier](docs/explainer/WEB-TIER-WALKTHROUGH-2026-08-28.md).
 
 Measured on 2026-10-18: the signer's suite passes 279 tests with none failing; 4 more are ignored by default, three of which read live Devnet. The facility ran 28 validated transactions on Devnet on 2026-08-25, recorded in [`facility/README.md`](facility/README.md).
 
diff --git a/docs/NEXT-SESSION-PROMPT.md b/docs/NEXT-SESSION-PROMPT.md
index 958b12f..4947fd1 100644
--- a/docs/NEXT-SESSION-PROMPT.md
+++ b/docs/NEXT-SESSION-PROMPT.md
@@ -13,7 +13,7 @@ Architecture §6 step 9 is ruled (E-331), built (E-334, E-335) and deployed (E-3
 - **`web/hosted/README.md` is the release procedure**, seven steps: an isolated container build from a public commit, the hosted gate, a headless-browser check, a preflight, the owner's deploy, and a comparison of what is served.
 - **The deployed output** is `…/ripple/wconf-hosted-builds/ccf76e73bf66`, outside every repository. It was built at ledger 6,263,910. The gate passed 30 of 30 controls and its full sweep. The browser check passed six pages and 39 same-origin requests, and the footer showed `PASS, 18 files` (E-339). The first deploy's output, `…/34ed67a9f2f5`, is kept as the record of E-336.
 - **`compare-deployed` passed against the live alias** on 2026-10-20. Two controls on broken copies of the output, a zeroed digest and an altered policy header, failed against the live host as they should. ⚠ It detects a change at the moment it runs, nothing later.
-- **What the host adds**: `access-control-allow-origin: *`, HSTS and `cache-control`. The deployment's own URL and the project's team alias redirect to Vercel's login; of the addresses tried, only the alias serves the page.
+- **What the host adds**: `access-control-allow-origin: *`, HSTS and `cache-control`. The deployment's own URL and the project's team alias redirect to Vercel's login; of the addresses tried, only the production alias, `xrpl-confidential-positions.vercel.app`, serves the page.
 
 ## 1. WHAT IS NEXT
 
diff --git a/docs/architecture/ARCHITECTURE-2026-08-18.md b/docs/architecture/ARCHITECTURE-2026-08-18.md
index 621a6c6..5aa0049 100644
--- a/docs/architecture/ARCHITECTURE-2026-08-18.md
+++ b/docs/architecture/ARCHITECTURE-2026-08-18.md
@@ -1,7 +1,8 @@
-# W-CONF architecture — revision 11
+# W-CONF architecture — revision 12
 
 ⚠ **This document said `tapFailHard` until 2026-10-18, which is THIS PROJECT'S SHORTHAND and appears zero times in rippled.** It now uses the real names: `fail_hard`, the submission parameter a client sets, and `TapFailHard`, rippled's internal apply flag. See [`docs/VOCABULARY.md`](../VOCABULARY.md). The code always used the real one.
 
+- **Revision 12 on 2026-10-20: §6 step 9 is BUILT, DEPLOYED and REVIEWED once.** Built and gated (`CLAIMS.md` E-334, E-335), deployed from `34ed67a` and redeployed from `ccf76e7` (E-336, E-339). `REVIEW-059` round one, the first outside review of the build, upheld 24 findings (E-342); the fixes are not yet deployed, and round two reviews them. ⚠ The revision 11 line below said *"Step 9 is not built"* until this line was added, which was true of the ruling and false of the header a reader meets first (`REVIEW-059` S-6).
 - **Revision 11 on 2026-10-20: §6 step 9 is RULED.** The project owner ruled `ADR-0004`'s four decisions on 2026-10-19, each as recommended: prerendered pages from one pinned snapshot, rebuilt by hand, on an isolated build machine; the hosted risk wording accepted by name; no issuer figure; and a prebuilt CLI deploy. `ADR-0004` is `Accepted` at revision 5 (`CLAIMS.md` E-331). Step 9 is not built.
 - **Revision 10 on 2026-10-19, amended the same day after `REVIEW-058` round one** (step 9's shape moved from browser reads to prerendered pages, and its falsifier grew; `CLAIMS.md` E-328). **§6 step 9 written: the hosted demo, scoped and NOT ruled.** `ADR-0004` is the decision record, `Proposed`, with four decisions for the project owner and a full adversarial rotation owed before any code (launch plan phase 2, `CLAIMS.md` E-309). The design rests on measurements taken the same day and recorded in the ADR: the public Devnet JSON-RPC endpoint cannot be read from a browser page, its WebSocket endpoint can, and the four demo accounts still exist (`CLAIMS.md` E-327).
 - **Revision 9 on 2026-08-28** — **§6 step 8 written for the first time.** ⚠ **This revision exists because `CLAUDE.md` asserted a step that did not exist.** *"It is architecture §6 step 8 and step 8 was written on 2026-08-26"* was false: §6 had **seven** numbered steps, §7 followed step 7 directly, `grep -n "step 8"` over this document returned **nothing**, and revision 8 is recorded as *"§6 step 7 only"*. The web tier therefore had no scope, no falsifier and no gate in the authority document, and the line every new session reads first said otherwise for two days (`CLAIMS.md` **E-204**). Step 8 now carries the four decisions the project owner ruled on 2026-08-28, the read-only trust boundary that keeps it out of a rotation, its gate, and its falsifier. **`ADR-0003` is the decision record; this is the step.** ⚠ **One source correction came out of the scoping itself**: `Request::Status`'s doc comment called it a *"Public ledger read"* and it reads no ledger — the sentence D1's safety argument quotes was wrong about what the call does (**E-205**).
@@ -267,7 +268,7 @@ Ordered by dependency, not by appetite. Each step names what would make it wrong
 
    **Its gate is a hosted part of `tools/check-web-readonly.ts`, run over the UPLOADED OUTPUT DIRECTORY and its routing configuration rather than the source**, verified by breaking it in both directions. `ADR-0004` lists what it must check. ⚠ It cannot check egress. ~~`check-no-secrets` has no directory mode yet, so the scan it relies on does not exist (`REVIEW-058` R1-9).~~ The directory mode exists since 2026-10-20 and the gate runs it (`CLAIMS.md` E-334).
 
-   **Built 2026-10-20 (`CLAIMS.md` E-334).** `web/hosted/README.md` is the release procedure: an isolated container build from a commit, the gate (`check-web-readonly --hosted`), a headless-browser check under the output's own policy, a preflight, the owner's deploy and a comparison of what is served. ~~⚠ **Not deployed.** The gate fails on the current output until the owner rules on the email address in a bundled package's licence notice, and the deploy needs the owner's Vercel project and token.~~ ⚠ The owner ruled the email redacted (E-335), and this sentence stood until the deploy. **Deployed 2026-10-20** at `https://xrpl-confidential-positions.vercel.app`, from the public commit `34ed67a`, and what was served matched what the gate passed when compared that day (`CLAIMS.md` E-336). Redeployed the same day from `ccf76e7` with the demo's shorter text, compared the same way (E-338, E-339).
+   **Built 2026-10-20 (`CLAIMS.md` E-334).** `web/hosted/README.md` is the release procedure: an isolated container build from a commit, the gate (`check-web-readonly --hosted`), a headless-browser check under the output's own policy, a preflight, the owner's deploy and a comparison of what is served. ~~⚠ **Not deployed.** The gate fails on the current output until the owner rules on the email address in a bundled package's licence notice, and the deploy needs the owner's Vercel project and token.~~ ⚠ The owner ruled the email redacted (E-335), and this sentence stood until the deploy. **Deployed 2026-10-20** at `https://xrpl-confidential-positions.vercel.app`, from the public commit `34ed67a`, and what was served matched what the gate passed when compared that day (`CLAIMS.md` E-336). Redeployed the same day from `ccf76e7` with the demo's shorter text, compared the same way (E-338, E-339). **Reviewed the same day**: `REVIEW-059` round one, the first outside review of the build, upheld 24 findings, two of which let the release procedure pass what this step forbids (E-342). The fixes are built and not deployed, so the live site predates them; round two reviews them.
 
    *Falsified if:* the shipped output contains a server function, an API route, a serverless function or middleware, in its files or its routing configuration; or contains a socket client, the signer socket path, a decryption routine or a secret-shaped value; or contains any file the provenance rule does not admit; or asks a visitor for a seed, a key or a secret; or permits a connection to anything but its named targets; or renders a ledger value without the risk wording, the network check and the ledger index it was read at; or renders a failed or negative read that cannot be placed in the pinned ledger as an empty account, or substitutes another source; or carries a visitor's lookup in a URL the host receives; or publishes an issuer figure, which D-H3 ruled out; or ships bytes or headers other than the ones the gate passed; or does not render the commit it was built from and the gate's verdict on it. *Also falsified if:* any of step 8's wording falsifiers holds on the hosted page.
 
diff --git a/docs/decisions/ADR-0004-hosted-demo-trust-boundary.md b/docs/decisions/ADR-0004-hosted-demo-trust-boundary.md
index e09b31d..ee0f57f 100644
--- a/docs/decisions/ADR-0004-hosted-demo-trust-boundary.md
+++ b/docs/decisions/ADR-0004-hosted-demo-trust-boundary.md
@@ -137,6 +137,13 @@ are not reachable, or accept the build machine's trust by name (`REVIEW-058`
 R2-10). ⚠ Revision 3 let that acceptance waive the token's isolation too (R3-2).
 **Ruled 2026-10-19: isolated.** The owner did not accept the build machine's
 trust, so the build runs where neither private store is reachable.
+⚠ **Reachable meant the stores' files, and the network was not priced.**
+`REVIEW-059` measured that a build container with network reaches a service bound
+to the build machine's `127.0.0.1` through `host.docker.internal` (S-2). Since then
+the Vite build and the assembler run with `--network none`; installing and taking
+the snapshot need the network and keep it, so third-party code that runs during
+those steps can reach the build machine's loopback services. That is named in
+`web/hosted/README.md` and in each build's manifest, not removed.
 
 **What the hosted tier causes to be sent, and to whom.** Each page load goes to
 Vercel, which sees the visitor's IP address and the page requested. Under H3 that
diff --git a/docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md b/docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md
index 169bdf0..ff8c51b 100644
--- a/docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md
+++ b/docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md
@@ -180,8 +180,10 @@ release note.** The page says so.
 
 ### Screen 6 — **Custody**. Where it lands commercially.
 
-Two findings: a custodied account **cannot derive its own viewing key**, and a
-policy engine **cannot enforce an amount limit on an amount that is a proof**.
+Two findings: a custodied account **cannot derive its own viewing key outside the
+platform**, unless the platform runs the derivation inside its own boundary, which
+needs the derivation published (issue #10, `REVIEW-059` R1-12); and a policy
+engine **cannot enforce an amount limit on an amount that is a proof**.
 
 ⚠ **The generalisation is the useful sentence:** every policy over an
 **identity**, a **time** or a **count** survives; every policy over a **value**
diff --git a/facility/src/loopback.ts b/facility/src/loopback.ts
index 3991fa7..adac5ff 100644
--- a/facility/src/loopback.ts
+++ b/facility/src/loopback.ts
@@ -499,6 +499,16 @@ export class LoopbackLedger {
   /** Pin one validated index. Everything the facility reads comes from it. */
   async snapshot(): Promise<Snapshot> {
     const info = (await this.call("server_info", {})).info;
+    // ⚠ `open` checked the network once, and this second answer was taken on
+    // trust. A public endpoint is a pool, so it can come from another server;
+    // one that is not Devnet is refused here too (`REVIEW-059` R1-9).
+    if (Number(info.network_id) !== DEVNET_NETWORK_ID) {
+      throw new LedgerRefusal(
+        "REFUSED_NOT_DEVNET",
+        `the server that answered for the snapshot reports network_id ${JSON.stringify(info.network_id ?? null)}, ` +
+          `not ${DEVNET_NETWORK_ID} (Devnet), although the one that answered open() did`,
+      );
+    }
     const seq = Number(info.validated_ledger?.seq ?? 0);
     if (!Number.isInteger(seq) || seq <= 0) {
       throw new LedgerRefusal("REFUSED_NO_VALIDATED_LEDGER", "the node has no validated ledger");
diff --git a/facility/tests/loopback.test.ts b/facility/tests/loopback.test.ts
index 921a213..1bf6758 100644
--- a/facility/tests/loopback.test.ts
+++ b/facility/tests/loopback.test.ts
@@ -141,6 +141,21 @@ describe("LoopbackLedger.open", () => {
 });
 
 describe("Snapshot", () => {
+  test("refuses a pinning answer from a server that is not Devnet (REVIEW-059 R1-9)", async () => {
+    // A public endpoint is a pool: open() and snapshot() can reach different servers.
+    let infos = 0;
+    const { server, endpoint } = fakeNode((method) => {
+      if (method === "server_info") return infos++ === 0 ? FULL_INFO : { info: { ...FULL_INFO.info, network_id: 1 } };
+      return {};
+    });
+    try {
+      const ledger = await LoopbackLedger.open(endpoint);
+      await expect(ledger.snapshot()).rejects.toThrow(/REFUSED_NOT_DEVNET/);
+    } finally {
+      server.stop(true);
+    }
+  });
+
   test("refuses an answer that came from a different ledger than the pinned one", async () => {
     // E-103, observed live: two "validated" reads seconds apart landed in
     // different ledgers. REVIEW-016 found the Rust version asking for one
diff --git a/tools/build-claims-topics.ts b/tools/build-claims-topics.ts
index 5708c54..07d3a5b 100644
--- a/tools/build-claims-topics.ts
+++ b/tools/build-claims-topics.ts
@@ -163,6 +163,12 @@ const OVERRIDES: Record<string, string[]> = {
   // E-342 is a review round on the hosted build and its gate; its headline
   // names the review and the release procedure, not the web tier by keyword.
   "E-342": ["web-tier", "instruments-and-gates"],
+  // E-343 records the fixes to the hosted build's checks; its headline names
+  // the review, not the web tier or a gate by keyword.
+  "E-343": ["web-tier", "instruments-and-gates"],
+  // E-344 records fixes that discharged half a finding; its headline names
+  // the review's words, not the drift or the review round by keyword.
+  "E-344": ["claims-and-drift", "web-tier"],
   // ⚠ E-256's headline is about a stale clause in another row and names no
   // instrument by keyword; the custody subject it settles is in the body.
   "E-256": ["claims-and-drift", "decisions-and-scope"],
diff --git a/tools/check-web-hosted.ts b/tools/check-web-hosted.ts
index fbdfa3b..fec6048 100644
--- a/tools/check-web-hosted.ts
+++ b/tools/check-web-hosted.ts
@@ -34,7 +34,7 @@ import { DH2_WORDING, DEVNET_NETWORK_ID } from "../web/app/src/hosted/wording.ts
 import { DEMO_ACCOUNTS } from "../web/api/demo-accounts.ts";
 import { HOSTED_PAGES } from "../web/hosted/pages.ts";
 import { inlineScripts, scriptHash } from "../web/hosted/csp.ts";
-import { EMAIL_MARKER, shippedNotice } from "../web/hosted/licence-notices.ts";
+import { EMAIL_MARKER, LICENCE_FILE_HEADER, shippedNotice } from "../web/hosted/licence-notices.ts";
 
 const REPO = join(import.meta.dir, "..");
 
@@ -113,6 +113,32 @@ export const ADMITTED_URLS: [RegExp, string][] = [
 const FORMS = /<(input|textarea|select|form)\b|contenteditable/i;
 const PAGE_HTML = (p: string) => (p ? `static/${p}/index.html` : "static/index.html");
 
+/**
+ * The pages that render ledger values, NAMED rather than inferred. ⚠ Check 8
+ * first applied to any page carrying `data-ledger-value`, a marker the page sets
+ * on itself, so a page that rendered a value without it was never checked
+ * (`REVIEW-059` R1-2, B1-8). Each page here must carry the marker and the
+ * wording; every other page must carry no marker, no ciphertext and no demo
+ * account address. A new ledger page is added here in review.
+ */
+export const LEDGER_PAGES = ["observer", "issuer"] as const;
+
+/** A 66-byte ElGamal ciphertext as the pages print it: 132 hex characters. */
+const CIPHERTEXT = /\b[0-9A-Fa-f]{132}\b/;
+
+/**
+ * The response headers the first route sets, exactly: no fewer, no others
+ * (`REVIEW-059` S-3: two of the five the assembler sets were unchecked). The
+ * policy itself is checked directive by directive in check 6.
+ */
+export const EXPECTED_HEADERS: Record<string, string | null> = {
+  "Content-Security-Policy": null,
+  "X-Content-Type-Options": "nosniff",
+  "Referrer-Policy": "no-referrer",
+  "Cross-Origin-Opener-Policy": "same-origin",
+  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
+};
+
 export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
   const f: Finding[] = [];
   const add = (check: string, detail: string) => f.push({ check, detail });
@@ -133,8 +159,13 @@ export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
   if (!config || config.version !== 3) add("no-server-code", "config.json is missing or not Build Output API version 3");
   else {
     for (const k of Object.keys(config)) if (k !== "version" && k !== "routes") add("no-server-code", `config.json has a top-level key ${k}`);
-    for (const r of config.routes ?? []) {
+    for (const [i, r] of (config.routes ?? []).entries()) {
       for (const k of Object.keys(r)) if (!["src", "dest", "headers", "continue", "handle"].includes(k)) add("no-server-code", `a route has the key ${k}`);
+      // ⚠ Every reader of the policy (this gate, the browser check, the live
+      // comparison) reads the FIRST route's headers. A later route's headers
+      // would be read by none of them, so only the first may set any
+      // (`REVIEW-059` S-1).
+      if (i > 0 && r.headers !== undefined) add("csp", `route ${i} sets headers; only the first route may, because it is the only one any check reads`);
       if (r.handle !== undefined && r.handle !== "filesystem") add("no-server-code", `a route hands off to ${r.handle}`);
       if (r.dest !== undefined && (typeof r.dest !== "string" || !files.has(`static${r.dest}`))) add("no-server-code", `a route's dest ${JSON.stringify(r.dest)} is not a file in the output`);
     }
@@ -157,13 +188,25 @@ export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
       if (!ADMITTED_URLS.some(([re]) => re.test(u))) add("urls", `${p} names ${u}`);
     }
   }
+  // ⚠ A scheme-relative address (`src="//host/x.js"`) has no `https:` for the
+  // pattern above to match (`REVIEW-059` R1-2's table). In the pages' own
+  // attributes it can only name another host.
+  for (const [p, h] of html) for (const m of h.matchAll(/\b(?:src|href|action|srcset|poster)\s*=\s*["']?\s*(\/\/[^"'\s>]+)/gi)) add("urls", `${p} names the scheme-relative ${m[1]}`);
 
   // 6. The Content Security Policy, as config.json delivers it.
   const first = config?.routes?.[0];
   const csp: string | undefined = first?.src === "/(.*)" && first?.continue === true ? first?.headers?.["Content-Security-Policy"] : undefined;
   if (!csp) add("csp", "the first route does not set a Content-Security-Policy on every path");
   else {
-    const dirs = new Map(csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v] as const; }));
+    // ⚠ A browser enforces the FIRST of two directives with one name and
+    // ignores the second; a Map keeps the LAST. So `connect-src *;` placed
+    // before the real one passed this check while the page permitted a
+    // connection anywhere (`REVIEW-059` R1-1, measured). A repeated name, in
+    // any case, is refused before anything else is read.
+    const parsed = csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v] as const; });
+    const seen = new Set<string>();
+    for (const [k] of parsed) { if (seen.has(k.toLowerCase())) add("csp", `the directive ${k} appears twice; a browser enforces the first`); seen.add(k.toLowerCase()); }
+    const dirs = new Map(parsed);
     const exact: Record<string, string[]> = {
       "default-src": ["'self'"], "style-src": ["'self'"], "img-src": ["'self'"], "font-src": ["'self'"],
       "connect-src": ["'self'"], "object-src": ["'none'"], "base-uri": ["'none'"], "form-action": ["'none'"], "frame-ancestors": ["'none'"],
@@ -177,17 +220,30 @@ export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
     const needed = new Set([...html.values()].flatMap((h) => inlineScripts(h).map(scriptHash)));
     for (const h of needed) if (!allowed.has(h)) add("csp", `an inline script's hash ${h} is not admitted, so the page would not run`);
     for (const h of allowed) if (!needed.has(h)) add("csp", `script-src admits ${h}, which no page carries`);
-    for (const [h, v] of Object.entries({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" })) if (first.headers?.[h] !== v) add("csp", `${h} is not ${v}`);
+    const names = Object.keys(first.headers ?? {});
+    for (const n of names) if (!(n in EXPECTED_HEADERS)) add("csp", `the first route sets ${n}, which is not one of the expected headers`);
+    const lower = names.map((n) => n.toLowerCase());
+    if (new Set(lower).size !== lower.length) add("csp", "the first route sets one header name twice in different case");
+    for (const [h, v] of Object.entries(EXPECTED_HEADERS)) if (v !== null && first.headers?.[h] !== v) add("csp", `${h} is not ${v}`);
   }
   for (const [p, h] of html) if (/\sstyle="|<style[\s>]/.test(h)) add("csp", `${p} carries inline style, which style-src 'self' refuses`);
 
   // 7. No input that asks a visitor for anything.
   for (const [p, h] of html) if (FORMS.test(h)) add("no-inputs", `${p} renders a form control`);
 
-  // 8. Every page that renders a ledger value renders the wording, the network check and the index.
+  // 8. Every ledger page renders the wording, the network check and the index,
+  //    and no other page renders a ledger value.
   const indices = new Set<string>();
+  const ledgerHtml = new Set(LEDGER_PAGES.map((lp) => PAGE_HTML(lp)));
+  for (const lp of ledgerHtml) if (html.has(lp) && !html.get(lp)!.includes("data-ledger-value")) add("ledger-wording", `${lp} is a ledger page and marks no ledger value`);
+  for (const [p, h] of html) {
+    if (ledgerHtml.has(p)) continue;
+    if (h.includes("data-ledger-value")) add("ledger-wording", `${p} marks a ledger value and is not one of the named ledger pages`);
+    if (CIPHERTEXT.test(h)) add("ledger-wording", `${p} carries a ciphertext and is not one of the named ledger pages`);
+    for (const a of DEMO_ACCOUNTS) if (h.includes(a.address)) add("ledger-wording", `${p} names the demo account ${a.address} and is not one of the named ledger pages`);
+  }
   for (const [p, h] of html) {
-    if (!h.includes("data-ledger-value")) continue;
+    if (!ledgerHtml.has(p)) continue;
     const plain = decodeEntities(h);
     for (const para of DH2_WORDING) if (!plain.includes(para)) add("ledger-wording", `${p} renders a ledger value without the D-H2 sentence beginning ${JSON.stringify(para.slice(0, 40))}`);
     if (!h.includes(`data-network-id="${DEVNET_NETWORK_ID}"`)) add("ledger-wording", `${p} renders a ledger value without the Devnet network check`);
@@ -204,6 +260,7 @@ export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
   // 9. The commit and the verdict, on every page.
   for (const [p, h] of html) {
     if (!h.includes(`/commit/${want.commit}`)) add("commit-and-verdict", `${p} does not name commit ${want.commit}`);
+    if (!h.includes(`<code>${want.commit.slice(0, 12)}</code>`)) add("commit-and-verdict", `${p} does not show commit ${want.commit.slice(0, 12)} as its link text`);
     if (!h.includes("data-gate-verdict")) add("commit-and-verdict", `${p} has no gate-verdict slot`);
   }
 
@@ -214,6 +271,11 @@ export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
     // Separator, `name@version (licence)`, separator, licence text: split on the
     // separator lines, so each header is followed by its own body.
     const parts = text(lic).split(/^={20,}$/m);
+    // ⚠ The text before the first notice, and any part after the last one,
+    // were read by no check (`REVIEW-059` S-4). The first must be the build's
+    // fixed header; there must be no second.
+    if (parts[0].trim() !== LICENCE_FILE_HEADER.join("\n").trim()) add("licences", "the text before the first notice is not the build's fixed header");
+    if (parts.length % 2 === 0) add("licences", "the file has text after its last notice");
     const names: [string, string, string][] = [];
     for (let i = 1; i + 1 < parts.length; i += 2) {
       const head = parts[i].trim().match(/^((?:@[^/\s]+\/)?[^@\s]+)@\S+ \([^)]*\)$/);
@@ -235,7 +297,11 @@ export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
       if (!ADMITTED_PACKAGES.has(name)) add("licences", `the bundle contains ${name}, which is not admitted`);
       if (body.trim().length < 100) add("licences", `${name}'s licence text is missing or truncated`);
     }
-    for (const must of ["react", "react-dom"]) if (!names.some((m) => m[1] === must)) add("licences", `${must} is bundled and not listed`);
+    // ⚠ Only React and React DOM were required, so deleting seroval's whole
+    // entry passed (`REVIEW-059` R1-4). The listed set must equal the admitted
+    // set: a package the framework stops bundling is removed here in review,
+    // as one it starts bundling is added.
+    for (const must of ADMITTED_PACKAGES) if (!names.some((m) => m[1] === must)) add("licences", `${must} is admitted and not listed, so a bundled package may be shipped without its notice`);
   }
   return f;
 }
@@ -258,8 +324,19 @@ const edit = (dir: string, p: string, fn: (s: string) => string) => writeFileSyn
 const firstJs = (dir: string) => "static/assets/" + readdirSync(out(dir, "static/assets")).find((n) => n.endsWith(".js"))!;
 const editConfig = (dir: string, fn: (c: any) => void) => edit(dir, "config.json", (s) => { const c = JSON.parse(s); fn(c); return JSON.stringify(c); });
 
-/** Each control: what it breaks, and the check that must fire. */
-export const CONTROLS: [string, string, Mutate][] = [
+const LIC = "static/third-party-licenses.txt";
+const csp = (d: string, fn: (p: string) => string) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = fn(c.routes[0].headers["Content-Security-Policy"])));
+const WEAK_POLICY = "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *";
+
+/**
+ * Each control: what it breaks, the check that must fire and, where a check
+ * has several reasons to fire, the words its finding must contain. ⚠ Without
+ * the last, a control can pass on a finding next to the one it is named for:
+ * the cryptography-package control fired because its fabricated notice did not
+ * match a licence file, and kept passing with the admission rule deleted
+ * (`REVIEW-059` R1-3).
+ */
+export const CONTROLS: [string, string, Mutate, string?][] = [
   ["a stray file", "inventory", (d) => writeFileSync(out(d, "static/notes.txt"), "x")],
   ["a source map", "inventory", (d) => writeFileSync(out(d, "static/assets/app.js.map"), "{}")],
   ["a sourceMappingURL comment", "no-source-maps", (d) => edit(d, firstJs(d), (s) => s + "\n//# sourceMappingURL=app.js.map\n")],
@@ -291,7 +368,27 @@ export const CONTROLS: [string, string, Mutate][] = [
   ["the network check changed", "ledger-wording", (d) => edit(d, "static/issuer/index.html", (s) => s.replace(`data-network-id="${DEVNET_NETWORK_ID}"`, 'data-network-id="0"'))],
   ["an account panel dropped", "accounts", (d) => edit(d, "static/observer/index.html", (s) => s.replace("Observer view: ", "Observed: "))],
   ["another commit on one page", "commit-and-verdict", (d) => edit(d, "static/wallet/index.html", (s) => s.replace(/\/commit\/[0-9a-f]{40}/g, "/commit/" + "0".repeat(40)))],
-  ["a cryptography package bundled", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => s + "\n" + "=".repeat(78) + "\n@noble/curves@1.9.7 (MIT)\n" + "=".repeat(78) + "\n" + "MIT ".repeat(40) + "\n")],
+  // The package's AUTHENTIC notice, at the version this checkout holds, so the
+  // only reason left to refuse it is that it is not admitted.
+  ["a cryptography package bundled, with its real notice", "licences", (d) => {
+    const root = join(REPO, "node_modules", "@noble/curves");
+    const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
+    edit(d, LIC, (s) => s + "=".repeat(78) + `\n@noble/curves@${version} (MIT)\n` + "=".repeat(78) + "\n" + shippedNotice(root) + "\n");
+  }, "which is not admitted"],
+  ["seroval's whole entry removed", "licences", (d) => edit(d, LIC, (s) => s.replace(/={78}\nseroval@[^\n]*\n={78}\n[\s\S]*?(?=={78}\n)/, "")), "admitted and not listed"],
+  ["text before the first notice changed", "licences", (d) => edit(d, LIC, (s) => "Extra line.\n" + s), "fixed header"],
+  ["text after the last notice", "licences", (d) => edit(d, LIC, (s) => s + "=".repeat(78) + "\nan unpaired part\n"), "after its last notice"],
+  ["a duplicate connect-src placed first", "csp", (d) => csp(d, (p) => "connect-src *; " + p), "appears twice"],
+  ["a later catch-all route replacing the policy", "csp", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/(.*)", headers: { "Content-Security-Policy": WEAK_POLICY }, continue: true })), "only the first route"],
+  ["a path route replacing the policy for /issuer", "csp", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/issuer(/.*)?", headers: { "Content-Security-Policy": WEAK_POLICY }, continue: true })), "only the first route"],
+  ["Permissions-Policy removed", "csp", (d) => editConfig(d, (c) => delete c.routes[0].headers["Permissions-Policy"]), "Permissions-Policy is not"],
+  ["an extra header on the first route", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Access-Control-Allow-Origin"] = "*")), "not one of the expected headers"],
+  ["the policy's name repeated in lower case", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["content-security-policy"] = WEAK_POLICY)), "twice in different case"],
+  ["a scheme-relative script", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<script src="//cdn.example.net/a.js"></script></body>')), "scheme-relative"],
+  ["the ledger marker and the wording removed together", "ledger-wording", (d) => edit(d, "static/observer/index.html", (s) => s.replaceAll('data-ledger-value=""', "").replace(/Vercel, which hosts this page/g, "This host")), "marks no ledger value"],
+  ["a ciphertext on a page that is not a ledger page", "ledger-wording", (d) => edit(d, "static/wallet/index.html", (s) => s.replace("</body>", `<p>${"0A".repeat(66)}</p></body>`)), "carries a ciphertext"],
+  ["a demo address on the overview", "ledger-wording", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", `<p>${DEMO_ACCOUNTS[0].address}</p></body>`)), "names the demo account"],
+  ["the commit's link text changed", "commit-and-verdict", (d) => edit(d, "static/custody/index.html", (s) => s.replace(/<code>[0-9a-f]{12}<\/code>/, "<code>000000000000</code>")), "link text"],
   ["the licence file removed", "licences", (d) => rmSync(out(d, "static/third-party-licenses.txt"))],
   ["a licence notice altered", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => s.replace("Permission is hereby granted", "Permission is granted"))],
   // ⚠ The LAST marker: the first is the file's header line explaining it, and
@@ -312,12 +409,12 @@ export function runControls(root: string, want: Expect): { run: number; failed:
     run++;
     const base = runChecks(readOutput(clean), want);
     if (base.length) failed.push(`the unbroken copy must pass, and has ${base.length} finding(s): ${base[0].check}: ${base[0].detail}`);
-    for (const [name, check, mutate] of CONTROLS) {
+    for (const [name, check, mutate, detail] of CONTROLS) {
       const d = fresh(); dirs.push(d);
       run++;
       mutate(d);
       const got = runChecks(readOutput(d), want);
-      if (!got.some((x) => x.check === check)) failed.push(`${name}: expected a '${check}' finding, got ${got.length ? got.map((x) => x.check).join(", ") : "none"}`);
+      if (!got.some((x) => x.check === check && (!detail || x.detail.includes(detail)))) failed.push(`${name}: expected a '${check}' finding${detail ? ` saying "${detail}"` : ""}, got ${got.length ? got.map((x) => `${x.check}: ${x.detail}`).join(" | ") : "none"}`);
     }
     // The secret scan, through the same function the real check calls.
     const d = fresh(); dirs.push(d);
@@ -340,12 +437,14 @@ function plantedSeed(): string {
 export function whatThisDoesNotCheck(): string[] {
   return [
     "1. EGRESS. It reads files; what a visitor's browser sends is not in them. The policy's connect-src 'self' is checked as written, not as a browser enforces it.",
-    "2. The SERVED bytes and headers. It checks the output before upload; step 5 compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.",
-    "3. The BUILD MACHINE. An inventory of the output cannot show that the build never read a private store; the isolated build is what addresses that.",
+    "2. The SERVED bytes and headers. It checks the output before upload; step 7 of web/hosted/README.md compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.",
+    "3. The BUILD MACHINE. An inventory of the output cannot show that the build never read a private store, or that every file came from the named commit; the isolated build and its tree check are what address that.",
     "4. Whether the PROSE is true. Wording is claims-check's and the wording tests' question; this gate checks that the ruled D-H2 sentences are present, not that every other sentence is right.",
-    "5. A form control built in the BROWSER after hydration. The check reads the prerendered HTML; React's DOM code names input elements internally, so the bundle cannot be read for them.",
+    "5. Anything a script asks a visitor for after hydration, by a form control or a dialog such as prompt(). The check reads the prerendered HTML; React's DOM code names input elements internally, so the bundle cannot be read for them.",
     "6. A decryption routine under a name it does not list. It forbids WebAssembly, the named mpt-crypto and ElGamal identifiers and any cryptography package in the licence list, which is a named set.",
-    "7. The licence list's COMPLETENESS beyond the module graph the build reported. A package inlined without its module path would be missed.",
+    "7. A package inlined without its module path. The licence list is collected from the module graph the build reported, and the gate requires that list to equal the admitted set.",
+    "8. A ledger value on a page outside /observer and /issuer is found only if it is a ciphertext, a demo account address or a marked value; a figure written as prose is not.",
+    "9. NO ISSUER FIGURE (D-H3) is held by the build, not by this gate: the build container holds no key, so no figure can be computed, and one could enter the pages only as text in a public commit.",
   ];
 }
 
diff --git a/web/api/capability.ts b/web/api/capability.ts
index 650e811..da03fa5 100644
--- a/web/api/capability.ts
+++ b/web/api/capability.ts
@@ -69,7 +69,8 @@ export const MASTER_SEED_DISCLOSURE =
  * serialise the XLS-0096 types is **not determinable from any published
  * source** — the page-side SDKs (`@crossmarkio/sdk@0.4.0`, `@gemwallet/api@3.8.0`,
  * `xumm@1.8.0`) carry no codec dependency at all, so serialisation happens
- * inside a closed extension bundle whose version nobody publishes.
+ * inside the extension, or for Xaman in its backend, and none of the three
+ * page-side packages names the codec version (checked 2026-08-28, E-206).
  *
  * ⚠ **It is excluded from the reasoning on purpose.** It is a version fact an
  * upstream release can close at any time; the three reasons the row DOES give
@@ -80,9 +81,10 @@ export const MASTER_SEED_DISCLOSURE =
  */
 export const WALLET_CODEC_GAP =
   "Not determined: whether a given wallet build can serialise XLS-0096 transactions. The " +
-  "page-side SDKs carry no codec, so serialisation happens inside the extension, whose version no " +
-  "vendor publishes. This is not why a wallet cannot hold a confidential position: the reasons " +
-  "above are structural, and this one could change with any release.";
+  "page-side SDKs examined on 2026-08-28 carry no codec, so serialisation happens inside the " +
+  "extension, or for Xaman in its backend, and none of them names the codec version (CLAIMS.md " +
+  "E-206). This is not why a wallet cannot hold a confidential position: the reasons above are " +
+  "structural, and this one could change with any release.";
 
 export const DERIVATION_NOT_PUBLISHED =
   "The derivation is specified only in this repository and is not a published " +
@@ -191,13 +193,13 @@ export const CAPABILITY_MATRIX: KeySourceRow[] = [
     decryptOwnBalance: {
       verdict: "conditional",
       detail:
-        "Only with a standalone ElGamal key, held by something other than the custody platform. A custodied account cannot derive its own key, because that needs the seed, and a custody platform never releases the seed.",
+        "Only with a standalone ElGamal key, held by something other than the custody platform, or if the platform itself ran the derivation inside its own boundary, which would need the derivation published as a standard (issue #10). Outside the platform the account cannot derive its key, because that needs the seed, and a custody platform never releases the seed.",
       citation: "REVIEW-012; CLAIMS.md E-117",
     },
     proveAndSign: {
       verdict: "conditional",
       detail:
-        "The external signer can sign. It cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read.",
+        "The external signer can sign. Holding only public data, it cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read.",
       citation: "docs/research/CUSTODY-2026-08-28.md; CLAIMS.md P-4",
     },
     publicTransactions: {
diff --git a/web/api/custody-sim.ts b/web/api/custody-sim.ts
index d68f093..6b7fac5 100644
--- a/web/api/custody-sim.ts
+++ b/web/api/custody-sim.ts
@@ -58,7 +58,8 @@ export const CUSTODY_SHAPE: Record<Requirement, { available: boolean; because: s
     available: false,
     because:
       "Structural: the transaction carries a proof, not a value, so a rule like 'two approvers above " +
-      "$1M' has no amount to read. It is hidden from the policy engine too.",
+      "$1M' has no amount to read. It is hidden from this simulation's policy engine too, which holds " +
+      "only public data.",
   },
   "policy-over-identity": {
     available: true,
@@ -69,8 +70,9 @@ export const CUSTODY_SHAPE: Record<Requirement, { available: boolean; because: s
   "seed-material": {
     available: false,
     because:
-      "Structural: a custody platform never releases seed material, so a custodied account cannot " +
-      "derive its own ElGamal key.",
+      "Structural in this simulation: a custody platform never releases seed material, so the account " +
+      "cannot derive its own ElGamal key outside the platform. A platform that ran the derivation " +
+      "inside its own boundary would change this, and that needs the derivation published (issue #10).",
   },
 };
 
diff --git a/web/api/demo-accounts.ts b/web/api/demo-accounts.ts
index e31ba44..4cbf998 100644
--- a/web/api/demo-accounts.ts
+++ b/web/api/demo-accounts.ts
@@ -34,9 +34,10 @@ export const DEMO_ACCOUNTS: DemoAccount[] = [
     address: "rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8",
     issuanceId: DEMO_ISSUANCE,
     label: "Holder A — an active position",
-    note:
-      "Its spending balance is not the canonical zero, so its value is hidden; its inbox is " +
-      "publicly known to be exactly zero.",
+    // ⚠ This note described the account's balances, which are a ledger reading
+    // and change whenever anyone sends to it; the page prints the reading
+    // beside it (`REVIEW-059` R1-14). Notes describe the account, never its state.
+    note: "One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).",
   },
   {
     address: "rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8",
diff --git a/web/api/disclosure.test.ts b/web/api/disclosure.test.ts
index 98ac7ac..2dc3c73 100644
--- a/web/api/disclosure.test.ts
+++ b/web/api/disclosure.test.ts
@@ -19,6 +19,7 @@ import { CAPABILITY_MATRIX, INVARIANTS, MASTER_SEED_DISCLOSURE, DERIVATION_NOT_P
 import { CANONICAL_ZERO_NOTE, NOT_CANONICAL_NOTE, WHAT_IS_PUBLIC, WHAT_IS_HIDDEN } from "./observer.ts";
 import { MIRROR_FIELD_LEDGER_NAME, ISSUER_KEY_POLICY, FORBIDDEN_SECRET_ENV, issuerView } from "./issuer.ts";
 import { FLOWS, walkFlows } from "./custody-sim.ts";
+import { DEMO_ACCOUNTS } from "./demo-accounts.ts";
 import { SECRET_NEEDLES, stripComments, stripStringLiterals } from "../../tools/check-web-readonly.ts";
 
 const REPO = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
@@ -591,3 +592,13 @@ describe("ADR-0004: the hosted tier renders the same pages and reaches nothing",
     }
   });
 });
+
+describe("a demo account's note describes the account, never its balances", () => {
+  // ⚠ Holder A's note said its spending balance was hidden and its inbox was
+  // exactly zero. That is a ledger reading written as fixed text: true at one
+  // ledger, and false after any send to the inbox or a Devnet reset, while the
+  // page printed it above the live reading (`REVIEW-059` R1-14).
+  test("no note names a balance state", () => {
+    for (const a of DEMO_ACCOUNTS) expect(a.note).not.toMatch(/\b(zero|non-zero|hidden|balance|inbox|spending|empty|holds?)\b/i);
+  });
+});
diff --git a/web/api/observer.ts b/web/api/observer.ts
index 21b1ad1..2b584d9 100644
--- a/web/api/observer.ts
+++ b/web/api/observer.ts
@@ -121,7 +121,16 @@ function classify(ciphertext: string | undefined, encZero: string | null): Ciphe
 export async function observerView(snap: Snapshot, account: string, issuanceId: string): Promise<ObserverView> {
   const mpt = await snap.mptoken(account, issuanceId);
   const iss = await snap.issuance(issuanceId);
+  return viewOf(account, issuanceId, mpt, iss);
+}
 
+/**
+ * The view, from answers already read. ⚠ The hosted snapshot read a position,
+ * then called `observerView`, which read it AGAIN; a second answer that said
+ * "not found" rendered as zeros under the state `present` (`REVIEW-059` R1-8).
+ * A caller that has read the position passes it here instead of reading twice.
+ */
+export function viewOf(account: string, issuanceId: string, mpt: any, iss: any): ObserverView {
   const key = mpt?.holderEncryptionKey;
   const encZero = key ? canonicalEncZero(key, account, issuanceId) : null;
 
diff --git a/web/app/src/hosted/Footer.tsx b/web/app/src/hosted/Footer.tsx
index 23e8ce1..5afd169 100644
--- a/web/app/src/hosted/Footer.tsx
+++ b/web/app/src/hosted/Footer.tsx
@@ -41,7 +41,8 @@ export function Footer() {
       </p>
       <p>
         Gate verdict: <span data-gate-verdict="">{verdict}</span>{" "}
-        (<a className="underline" href="/gate-verdict.json">gate-verdict.json</a>)
+        (<a className="underline" href="/gate-verdict.json">gate-verdict.json</a>). This is the gate's record,
+        published with the build; your browser shows it and does not check it against the files it loaded.
       </p>
       <p>
         Third-party licences for the code in these pages:{" "}
diff --git a/web/app/src/views/CustodyView.tsx b/web/app/src/views/CustodyView.tsx
index d374785..ff8c4c5 100644
--- a/web/app/src/views/CustodyView.tsx
+++ b/web/app/src/views/CustodyView.tsx
@@ -31,8 +31,10 @@ export function CustodyView({ sim }: { sim: { flows: any[] } }) {
             <h3 className="font-semibold mb-1">1. The derived key does not work with custodial key management</h3>
             <p className="opacity-85 leading-relaxed">
               The ElGamal secret is derived from the master seed, and a custody platform never releases
-              the seed. So a custodied account cannot derive its own ElGamal key or read its own
-              confidential balance.
+              the seed. So the account cannot derive its own ElGamal key or read its own confidential
+              balance outside the platform. A platform that ran the derivation inside its own boundary
+              would change that; it would need the derivation published as a standard, and it is not
+              (issue #10).
             </p>
             <p className="opacity-85 leading-relaxed mt-2">
               A standalone ElGamal key gets around this, but then something outside the custody
@@ -43,9 +45,14 @@ export function CustodyView({ sim }: { sim: { flows: any[] } }) {
           <div>
             <h3 className="font-semibold mb-1">2. Approval policies cannot read a confidential amount</h3>
             <p className="opacity-85 leading-relaxed">
-              An approval workflow sees a proof, not a value, so a rule like <em>&ldquo;two approvers
-              above $1M&rdquo;</em> has nothing to check. This is structural, not an integration
-              detail: confidentiality and amount-based approval policies pull against each other.
+              An approval workflow that holds only public data sees a proof, not a value, so a rule
+              like <em>&ldquo;two approvers above $1M&rdquo;</em> has nothing to check. This is
+              structural, not an integration detail: confidentiality and amount-based approval
+              policies pull against each other. The ways out each cost something: give the policy
+              engine the ElGamal secret, and it becomes another party that reads every balance;
+              accept the holder&rsquo;s statement of the amount, and the policy rests on the
+              holder&rsquo;s honesty; or prove the bound in zero knowledge, which this project
+              has neither built nor costed.
             </p>
           </div>
         </div>
diff --git a/web/app/vite.hosted.config.ts b/web/app/vite.hosted.config.ts
index 929c27c..a4a84c0 100644
--- a/web/app/vite.hosted.config.ts
+++ b/web/app/vite.hosted.config.ts
@@ -19,7 +19,7 @@ import react from "@vitejs/plugin-react";
 import tailwindcss from "@tailwindcss/vite";
 import { tanstackStart } from "@tanstack/react-start/plugin/vite";
 import { HOSTED_PAGES } from "../hosted/pages.ts";
-import { EMAIL_MARKER, shippedNotice } from "../hosted/licence-notices.ts";
+import { LICENCE_FILE_HEADER, shippedNotice } from "../hosted/licence-notices.ts";
 
 const HERE = dirname(fileURLToPath(import.meta.url));
 export const SNAPSHOT_PATH = resolve(HERE, "../hosted/.build/snapshot.json");
@@ -70,12 +70,7 @@ function licenceNotices(): Plugin {
           if (m) roots.set(m[1], m[1].slice(m[1].lastIndexOf("node_modules/") + "node_modules/".length));
         }
       }
-      const parts: string[] = [
-        "Third-party software in the W-CONF hosted demo's client bundle, with the licence",
-        "each package ships. Collected at build time from the modules actually bundled.",
-        `Email addresses in these notices are replaced with "${EMAIL_MARKER}".`,
-        "",
-      ];
+      const parts: string[] = [...LICENCE_FILE_HEADER];
       for (const [root, name] of [...roots].sort((a, b) => a[1].localeCompare(b[1]))) {
         const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
         const notice = shippedNotice(root);
diff --git a/web/hosted/README.md b/web/hosted/README.md
index 12d1cb0..6cfdf65 100644
--- a/web/hosted/README.md
+++ b/web/hosted/README.md
@@ -2,7 +2,7 @@
 
 The hosted demo is static pages, prerendered from one pinned snapshot of public Devnet state. No code of this project runs on a server when a visitor loads them: the gate fails an output that holds a function, middleware or a rewrite to another host. The decision record is `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`, `Accepted` at revision 5. The owner ruled its four decisions on 2026-10-19 (`CLAIMS.md` E-331):
 
-- **D-H1, H3.** Prerendered pages. The snapshot is kept indefinitely and rebuilt by hand. The build is isolated: it runs in a container that cannot reach the private stores.
+- **D-H1, H3.** Prerendered pages. The snapshot is kept indefinitely and rebuilt by hand. The build is isolated from the private stores' files: it runs in containers that mount neither. It is not isolated from the network while it installs and takes the snapshot (below).
 - **D-H2.** The risk wording is accepted as written and shown beside every ledger value.
 - **D-H3, A.** No issuer figure.
 - **D-H4, A.** The output is built and gated locally, then deployed prebuilt from the CLI.
@@ -14,12 +14,12 @@ The pages are `web/app/src/hosted/`, a second build target beside the local tier
 Each step this repository owns refuses or fails loudly. Step 6 is Vercel's command.
 
 1. **Publish the commit first.** The footer names the commit and links to it in the public repository, and step 5 refuses a commit that is not on the public `main`. Make the public update as `docs/NEXT-SESSION-PROMPT.md` describes, then build from the public clone at that commit.
-2. **Build, isolated.** `make hosted-build REPO=<public clone> COMMIT=<sha> URL=https://<name>.vercel.app OUT=<dir outside any repository>`. A container sees only a `git archive` of the commit, checks that neither private store exists, installs, takes the snapshot, builds and assembles `.vercel/output`. Two canary variables must not reach the output. `build-manifest.json` is written beside the output, not in it.
+2. **Build, isolated.** `make hosted-build REPO=<public clone> COMMIT=<sha> URL=https://<name>.vercel.app OUT=<new or empty dir outside the repository>`. The build refuses a directory that is not empty, exports a `git archive` of the commit and refuses it unless its files are exactly the commit's, then runs two containers that see only that tree and each check that neither private store exists: the first installs and takes the snapshot, with network; the second builds and assembles `.vercel/output` with `--network none`. Two canary values must not appear verbatim in the output. `build-manifest.json` is written beside the output, not in it.
 3. **Gate the output.** `make check-web-hosted OUT=<dir> COMMIT=<sha>`. This needs the local secret store. Its controls run first, each breaking a copy of the real output, and the gate prints how many passed. On a pass the gate writes `static/gate-verdict.json`, a digest of every other file, which the page's footer shows.
-4. **Load it in a browser.** `make hosted-browser-check OUT=<dir>`. A headless Chrome with a fresh profile loads every page under the output's own headers. It fails on a policy violation, a request to anything but the page's origin, an exception, a page whose script never ran, or a client-side navigation that loads a new document.
-5. **Preflight.** `bun run web/hosted/deploy-preflight.ts <dir>` refuses a trial build, a commit that is not on the public `main`, a missing or failed verdict, a commit mismatch and any file changed since the gate passed. It prints the deploy command.
+4. **Load it in a browser.** `make hosted-browser-check OUT=<dir>`. A headless Chrome with a fresh profile loads every page under the output's own headers. It fails on a policy violation, a request to anything but the page's origin, an exception or a console error, on any page or after the client-side navigation, a page whose script never ran, a ledger page whose rendered text lacks the D-H2 wording, or a client-side navigation that loads a new document.
+5. **Preflight.** `bun run web/hosted/deploy-preflight.ts <dir>` refuses a manifest that does not say `trial: false`, a commit that is not on the public `main`, a missing or failed verdict, a commit mismatch, any file changed since the gate passed, a ledger page naming another ledger than the manifest, and any failure of the gate's checks run again on the bytes about to be uploaded. It prints the deploy command.
 6. **Deploy.** The owner runs the printed `vercel deploy --prebuilt --prod` with the project-scoped token present for that command only. Nothing in this repository runs it.
-7. **Compare what is served.** `bun run web/hosted/compare-deployed.ts <dir> https://<name>.vercel.app` fetches every file and page and compares bytes and security headers with what the gate passed. It also requires a 404 for an unknown path and no cookie.
+7. **Compare what is served.** `bun run web/hosted/compare-deployed.ts <dir> https://<name>.vercel.app` fetches every file, and every page at both spellings of its route, and compares status, bytes, content type and security headers with what the gate passed. It also requires a 404 for an unknown path under the same headers, and no cookie.
 
 ## The owner's one-time setup, before step 6
 
@@ -36,6 +36,8 @@ From `ADR-0004` D-H4 and "Abuse, availability and cost":
 The gate prints its own list. The short form:
 
 - It reads files, so it cannot check egress. The browser check observes one browser on one run.
+- The build's first container has network while it installs and takes the snapshot, and on OrbStack it can reach services on the build machine's own loopback through `host.docker.internal` (measured 2026-10-20, `REVIEW-059` S-2). Third-party code that runs during install or the snapshot has that access. The second container, which runs Vite and the assembler, has no network.
+- The tree check runs before the containers. It does not see dependency code changing the tree during the build.
 - The comparison in step 7 detects a change at the moment it runs, nothing later.
 - Every value is a dated reading from Ripple's public Devnet endpoint, which is a pool of servers (`CLAIMS.md` E-327), under the accepted D-H2 risk. Every answer must name the one pinned, validated ledger. The reads are separate requests and are not held to one connection, so a server without that ledger fails the build rather than answering for another.
 
diff --git a/web/hosted/browser-check.ts b/web/hosted/browser-check.ts
index c95e03c..4f90b7a 100644
--- a/web/hosted/browser-check.ts
+++ b/web/hosted/browser-check.ts
@@ -11,8 +11,12 @@
  *   - any Content Security Policy violation, which is how a hash the gate
  *     computed and a script the browser runs would disagree;
  *   - any request to anything but the page's own origin;
- *   - any uncaught exception or console error other than the expected 404
- *     for a missing verdict file;
+ *   - any uncaught exception, or any console error other than the expected
+ *     404 for a missing verdict file, whether the browser logged it or the
+ *     page's own script did (`console.error`), on every page AND after the
+ *     final client-side navigation (`REVIEW-059` R1-5: both were missed);
+ *   - a ledger page whose rendered text, which a stylesheet that hides an
+ *     element removes, does not carry the D-H2 wording (`REVIEW-059` R1-2);
  *   - a page whose script never ran, read from the footer's verdict slot,
  *     which only the page's own script changes;
  *   - a client-side navigation that loads a new document or does not render.
@@ -23,10 +27,12 @@
  * list, items 1 and 2).
  */
 
-import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
+import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { HOSTED_PAGES } from "./pages.ts";
+import { LEDGER_PAGES } from "../../tools/check-web-hosted.ts";
+import { DH2_WORDING } from "../app/src/hosted/wording.ts";
 
 const CHROME = process.env.WCONF_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
 
@@ -39,6 +45,15 @@ const TYPES: Record<string, string> = {
 export function serveOutput(root: string) {
   const base = join(root, ".vercel", "output");
   const config = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
+  // ⚠ This server models one shape: headers on the first route only, file
+  // rewrites, and the filesystem. A configuration outside it would be served
+  // as if it were that shape, so it is refused instead (`REVIEW-059` R1-5).
+  for (const [i, r] of (config.routes ?? []).entries()) {
+    const keys = Object.keys(r).filter((k) => !["src", "dest", "headers", "continue", "handle"].includes(k));
+    if (keys.length || (i > 0 && r.headers !== undefined) || (r.handle !== undefined && r.handle !== "filesystem")) {
+      throw new Error(`browser-check cannot model route ${i} (${JSON.stringify(r).slice(0, 120)}); the gate refuses it too`);
+    }
+  }
   const headers: Record<string, string> = config.routes[0].headers;
   const rewrites: [RegExp, string][] = config.routes.filter((r: any) => r.dest).map((r: any) => [new RegExp(r.src), r.dest]);
   return Bun.serve({
@@ -116,25 +131,39 @@ export async function browserCheck(root: string): Promise<{ problems: string[];
     });
     const evalJs = async (expr: string) => (await s("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;
 
-    for (const page of HOSTED_PAGES) {
-      const before = cdp.events.length;
-      await s("Page.navigate", { url: `${origin}/${page}` });
-      for (let i = 0; i < 50; i++) { if (cdp.events.slice(before).some((e) => e.method === "Page.loadEventFired")) break; await sleep(100); }
-      await sleep(1200);
-      const ev = cdp.events.slice(before);
+    /** Every check over one interval of events, the same for a page load and for the client navigation. */
+    const inspect = async (label: string, ev: typeof cdp.events) => {
       for (const e of ev.filter((e) => e.method === "Network.requestWillBeSent")) {
         requests++;
         const u = e.params.request.url as string;
-        if (!u.startsWith(origin + "/")) problems.push(`/${page}: a request to ${u}`);
+        if (!u.startsWith(origin + "/")) problems.push(`${label}: a request to ${u}`);
       }
-      const violations = await evalJs("window.__violations");
-      for (const v of violations ?? []) problems.push(`/${page}: CSP violation ${v}`);
-      for (const e of ev.filter((e) => e.method === "Runtime.exceptionThrown")) problems.push(`/${page}: exception ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`);
+      const violations = await evalJs("window.__violations.splice(0)");
+      for (const v of violations ?? []) problems.push(`${label}: CSP violation ${v}`);
+      for (const e of ev.filter((e) => e.method === "Runtime.exceptionThrown")) problems.push(`${label}: exception ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`);
       for (const e of ev.filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")) {
         const t: string = e.params.entry.text ?? "";
         // Two same-origin 404s are expected: the verdict file before the gate
         // has written it, and the favicon a browser asks for unprompted.
-        if (!(/404/.test(t) && /\/(gate-verdict\.json|favicon\.ico)$/.test(e.params.entry.url ?? ""))) problems.push(`/${page}: console error ${t} (${e.params.entry.url ?? "no url"})`);
+        if (!(/404/.test(t) && /\/(gate-verdict\.json|favicon\.ico)$/.test(e.params.entry.url ?? ""))) problems.push(`${label}: console error ${t} (${e.params.entry.url ?? "no url"})`);
+      }
+      // ⚠ `Log.entryAdded` carries what the BROWSER logs; a page's own
+      // `console.error` arrives only as `Runtime.consoleAPICalled`.
+      for (const e of ev.filter((e) => e.method === "Runtime.consoleAPICalled" && ["error", "assert"].includes(e.params.type))) {
+        problems.push(`${label}: console.${e.params.type} ${(e.params.args ?? []).map((a: any) => a.value ?? a.description ?? "").join(" ")}`);
+      }
+    };
+    const squash = (t: string) => t.replace(/\s+/g, " ").trim();
+
+    for (const page of HOSTED_PAGES) {
+      const before = cdp.events.length;
+      await s("Page.navigate", { url: `${origin}/${page}` });
+      for (let i = 0; i < 50; i++) { if (cdp.events.slice(before).some((e) => e.method === "Page.loadEventFired")) break; await sleep(100); }
+      await sleep(1200);
+      await inspect(`/${page}`, cdp.events.slice(before));
+      if ((LEDGER_PAGES as readonly string[]).includes(page)) {
+        const shown = squash(await evalJs("document.body.innerText"));
+        for (const para of DH2_WORDING) if (!shown.includes(squash(para))) problems.push(`/${page}: the D-H2 sentence beginning ${JSON.stringify(para.slice(0, 40))} is not in the rendered text`);
       }
       const slot = await evalJs("document.querySelector('[data-gate-verdict]')?.textContent ?? null");
       if (page === "") footer = slot;
@@ -144,12 +173,16 @@ export async function browserCheck(root: string): Promise<{ problems: string[];
       else if (/^not loaded/.test(slot)) problems.push(`/${page}: the page's script never ran (the verdict slot still reads ${JSON.stringify(slot)})`);
     }
 
-    // Client-side navigation: one link, no new document, the target renders.
+    // Client-side navigation: one link, no new document, the target renders,
+    // and the interval after the click passes every check a page load does.
     await s("Page.navigate", { url: `${origin}/` });
     await sleep(1500);
+    await evalJs("window.__violations.splice(0)");
     const docsBefore = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
+    const clickedAt = cdp.events.length;
     await evalJs("document.querySelector('a[href=\"/observer\"]').click()");
     await sleep(1200);
+    await inspect("client navigation to /observer", cdp.events.slice(clickedAt));
     const docsAfter = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
     const path = await evalJs("location.pathname");
     const rendered = await evalJs("document.body.innerText.includes('Observer view: ')");
@@ -189,6 +222,23 @@ export async function selfTest(root: string): Promise<string[]> {
     writeFileSync(idx, readFileSync(idx, "utf8").replace("</body>", `<img src="http://127.0.0.1:${elsewhere.port}/pixel.png"></body>`));
     if (!(await browserCheck(other)).problems.some((p) => p.includes(`a request to http://127.0.0.1:${elsewhere.port}/`))) failed.push("a request to another origin was not reported");
 
+    // ⚠ The three cases `REVIEW-059` found passing: a page's own console
+    // error, an exception after the client navigation, and the D-H2 wording
+    // present in the HTML but hidden by the stylesheet.
+    const asset = (d: string, re: RegExp) => join(d, ".vercel/output/static/assets", readdirSync(join(d, ".vercel/output/static/assets")).find((n) => re.test(n))!);
+    const logs = copy(); dirs.push(logs);
+    const v1 = asset(logs, /^Verdict-.*\.js$/);
+    writeFileSync(v1, readFileSync(v1, "utf8") + '\nconsole.error("BROWSER_CHECK_CONTROL");\n');
+    if (!(await browserCheck(logs)).problems.some((p) => p.includes("console.error BROWSER_CHECK_CONTROL"))) failed.push("a page's own console.error was not reported");
+    const nav = copy(); dirs.push(nav);
+    const v2 = asset(nav, /^Verdict-.*\.js$/);
+    writeFileSync(v2, readFileSync(v2, "utf8") + "\ndocument.addEventListener('click',e=>{if(e.target.closest('a[href=\"/observer\"]'))setTimeout(()=>{throw Error('BROWSER_CHECK_NAV')},0)});\n");
+    if (!(await browserCheck(nav)).problems.some((p) => p.startsWith("client navigation to /observer: exception") && p.includes("BROWSER_CHECK_NAV"))) failed.push("an exception after the client navigation was not reported");
+    const hidden = copy(); dirs.push(hidden);
+    const css = asset(hidden, /\.css$/);
+    writeFileSync(css, readFileSync(css, "utf8") + "\n[data-dh2-wording]{display:none}\n");
+    if (!(await browserCheck(hidden)).problems.some((p) => p.startsWith("/observer: the D-H2 sentence"))) failed.push("D-H2 wording hidden by the stylesheet was not reported");
+
     const dead = copy(); dirs.push(dead);
     const wal = join(dead, ".vercel/output/static/wallet/index.html");
     writeFileSync(wal, readFileSync(wal, "utf8").replace(/<script type="module"[^>]*><\/script>/, ""));
diff --git a/web/hosted/build.test.ts b/web/hosted/build.test.ts
new file mode 100644
index 0000000..5e9e34e
--- /dev/null
+++ b/web/hosted/build.test.ts
@@ -0,0 +1,67 @@
+/**
+ * The build's two refusals that need no container: where it may write, and
+ * whether the tree it is about to build is the commit's (`REVIEW-059` R1-10).
+ */
+import { afterEach, describe, expect, test } from "bun:test";
+import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
+import { tmpdir } from "node:os";
+import { join } from "node:path";
+import { checkExportedTree, exportSource, listTree, outProblems } from "./build.ts";
+
+const dirs: string[] = [];
+afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
+const temp = () => { const d = mkdtempSync(join(tmpdir(), "wconf-build-test-")); dirs.push(d); return d; };
+const git = (cwd: string, ...a: string[]) => {
+  const r = Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...a], { cwd, stdout: "pipe", stderr: "pipe" });
+  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
+  return r.stdout.toString().trim();
+};
+
+/** A two-file repository with one commit. */
+function repo(): { dir: string; commit: string } {
+  const dir = temp();
+  git(dir, "init", "-q");
+  mkdirSync(join(dir, "web/app"), { recursive: true });
+  writeFileSync(join(dir, "README.md"), "x\n");
+  writeFileSync(join(dir, "web/app/page.ts"), "export const a = 1;\n");
+  git(dir, "add", "-A");
+  git(dir, "commit", "-q", "-m", "one");
+  return { dir, commit: git(dir, "rev-parse", "HEAD") };
+}
+
+describe("where a build may write", () => {
+  test("refuses the repository itself and anything inside it", () => {
+    const { dir } = repo();
+    expect(outProblems(dir, dir).join()).toMatch(/outside the repository/);
+    expect(outProblems(join(dir, "out"), dir).join()).toMatch(/outside the repository/);
+  });
+  test("refuses a directory that is not empty, and takes a new or empty one", () => {
+    const { dir } = repo();
+    const used = temp();
+    mkdirSync(join(used, "work/src"), { recursive: true });
+    expect(outProblems(used, dir).join()).toMatch(/is not empty/);
+    expect(outProblems(temp(), dir)).toEqual([]);
+    expect(outProblems(join(temp(), "new"), dir)).toEqual([]);
+  });
+});
+
+describe("the tree a build is about to build", () => {
+  test("a clean export lists exactly the commit's files", () => {
+    const { dir, commit } = repo();
+    const src = join(temp(), "src");
+    exportSource(dir, src, false, commit);
+    expect(checkExportedTree(src, ["README.md", "web/app/page.ts"])).toEqual([]);
+  });
+  test("a file left in the directory before the export is refused (REVIEW-059 R1-10, as measured)", () => {
+    const { dir, commit } = repo();
+    const src = join(temp(), "src");
+    mkdirSync(join(src, "web/app/public/assets"), { recursive: true });
+    writeFileSync(join(src, "web/app/public/assets/review059.js"), "export const outsider = 1;\n");
+    exportSource(dir, src, false, commit);
+    expect(listTree(src)).toContain("web/app/public/assets/review059.js");
+    expect(checkExportedTree(src, ["README.md", "web/app/page.ts"]).join()).toMatch(/web\/app\/public\/assets\/review059\.js is in the build tree and not in the commit/);
+  });
+  test("a committed file the export lost is refused", () => {
+    expect(checkExportedTree(temp(), ["README.md"]).join()).toMatch(/README\.md is in the commit and not in the build tree/);
+  });
+});
diff --git a/web/hosted/build.ts b/web/hosted/build.ts
index d555b46..7b7d75e 100644
--- a/web/hosted/build.ts
+++ b/web/hosted/build.ts
@@ -16,22 +16,40 @@
  * deployment token exists anywhere in it: D-H4's token comes in for the upload
  * only, after this script and the gate have finished.
  *
+ * ⚠ **What it is isolated FROM is files, and the network only in part.**
+ * Measured 2026-10-20 (`REVIEW-059` S-2): an OrbStack container with network
+ * reaches a service bound to the build machine's `127.0.0.1` through
+ * `host.docker.internal`. So the work runs in TWO containers. The first
+ * installs and takes the snapshot, which need the network; the second runs
+ * Vite and the assembler with `--network none`, so the third-party code in the
+ * build proper reaches nothing. ⚠ Code that runs during install or the snapshot
+ * still has the network and can reach the build machine's loopback services.
+ *
  * ⚠ **The environment is an allowlist.** The container receives only the
  * variables named below, plus two CANARIES: random values under the `VITE_` and
  * `WCONF_` prefixes. `REVIEW-058` M11 saw a `VITE_` variable inlined into the
- * bundle; if either canary's value appears anywhere in the output, the build
- * fails.
+ * bundle; if either canary's value appears VERBATIM anywhere in the output, the
+ * build fails. ⚠ That is all it proves: an encoded copy, or a variable sent
+ * over the network during install, is not seen (`REVIEW-059` R1-11).
  *
  * ⚠ **It builds a COMMIT, never a working tree.** What the footer names is what
  * was built. `--worktree` exists for local trials only: it copies the working
  * tree, names `HEAD` in the footer, and marks the manifest `trial`, which
- * `deploy.ts` refuses.
+ * `deploy-preflight.ts` refuses.
+ *
+ * ⚠ **And the tree it builds is checked against the commit, file for file.**
+ * `REVIEW-059` R1-10, measured with a real build: a file left in a reused
+ * `--out` survived the extraction and reached the output of a build whose
+ * footer named a commit that does not contain it. So `--out` must be new or
+ * empty, the workspace is removed even when a build fails, and the exported
+ * tree must list exactly the commit's files before any container runs. ⚠ It
+ * does not see dependency code changing `/src` DURING the build.
  */
 
 import { createHash, randomBytes } from "node:crypto";
-import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
+import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
 import { tmpdir } from "node:os";
-import { isAbsolute, join, resolve } from "node:path";
+import { dirname, isAbsolute, join, resolve } from "node:path";
 import { RISK_ACCEPTANCE_PHRASE } from "../../facility/src/loopback.ts";
 
 /**
@@ -56,7 +74,7 @@ function args(argv: string[]) {
 }
 
 /** The source tree, exported into `dest`: a commit's archive, or a trial's working tree. */
-function exportSource(repo: string, dest: string, worktree: boolean, commit?: string): string {
+export function exportSource(repo: string, dest: string, worktree: boolean, commit?: string): string {
   mkdirSync(dest, { recursive: true });
   if (worktree) {
     const files = run(["git", "-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean);
@@ -70,20 +88,66 @@ function exportSource(repo: string, dest: string, worktree: boolean, commit?: st
   return full;
 }
 
-/** Inside the container. `set -eu`, and the store checks come before anything third-party runs. */
+/** Every file and link under `dir`, relative to it, in `git ls-tree` form. */
+export function listTree(dir: string): string[] {
+  const out: string[] = [];
+  const walk = (rel: string) => {
+    for (const name of readdirSync(join(dir, rel))) {
+      const r = rel ? `${rel}/${name}` : name;
+      const st = lstatSync(join(dir, r));
+      if (st.isDirectory() && !st.isSymbolicLink()) walk(r);
+      else out.push(r);
+    }
+  };
+  walk("");
+  return out.sort();
+}
+
+/**
+ * The exported tree, against the commit's own file list. Any extra or missing
+ * path is refused before a container runs (`REVIEW-059` R1-10).
+ */
+export function checkExportedTree(src: string, committed: string[]): string[] {
+  const have = new Set(listTree(src)), want = new Set(committed);
+  const extra = [...have].filter((p) => !want.has(p)), missing = [...want].filter((p) => !have.has(p));
+  return [...extra.map((p) => `${p} is in the build tree and not in the commit`), ...missing.map((p) => `${p} is in the commit and not in the build tree`)];
+}
+
+/**
+ * Where a build may write: a new or empty directory outside the repository it
+ * builds. ⚠ It refused only an existing `.vercel` before, so a failed build's
+ * workspace could be reused, and `out === repoTop` passed the prefix test.
+ */
+export function outProblems(out: string, repoTop: string): string[] {
+  const real = (p: string) => { let q = p; while (!existsSync(q)) q = dirname(q); return join(realpathSync(q), p.slice(q.length)); };
+  const o = real(out), top = realpathSync(repoTop);
+  const problems: string[] = [];
+  if (o === top || o.startsWith(top + "/")) problems.push("--out must be outside the repository, so no build file lands in a tree that can be committed");
+  if (existsSync(out) && readdirSync(out).length) problems.push(`${out} is not empty; use a new directory for each build, because a reused one can carry files into the output`);
+  return problems;
+}
+
+/** Inside the containers. `set -eu`, and the store checks come before anything third-party runs. */
 // ⚠ One command per line: `set -e` does not stop on a failure inside an `&&`
 // list, and the first version ran the next step after Vite had failed.
+const STORE_CHECK = 'for p in /tmp/wconf "$HOME/.wconf"; do if [ -e "$p" ]; then echo "REFUSED: $p exists inside the build container" >&2; exit 3; fi; done';
 const CONTAINER_SCRIPT = [
   "set -eu",
-  'for p in /tmp/wconf "$HOME/.wconf"; do if [ -e "$p" ]; then echo "REFUSED: $p exists inside the build container" >&2; exit 3; fi; done',
+  STORE_CHECK,
   "bun install --frozen-lockfile",
   "mkdir -p web/hosted/.build",
   "bun run web/hosted/snapshot.ts web/hosted/.build/snapshot.json",
+].join("\n");
+/** The second container: no network at all. */
+const OFFLINE_SCRIPT = [
+  "set -eu",
+  STORE_CHECK,
   "cd web/app",
   "bunx vite build --config vite.hosted.config.ts",
   "cd /src",
   "bun run web/hosted/vercel-output.ts web/app/dist/client web/hosted/.build",
 ].join("\n");
+export const OFFLINE_ARGS = ["--network", "none"];
 
 /** Build (or reuse) the image named by the Dockerfile's hash. */
 function image(): string {
@@ -97,13 +161,26 @@ export async function build(argv: string[]) {
   const a = args(argv);
   const out = resolve(a.out);
   if (!isAbsolute(out)) throw new Error("--out must resolve to an absolute path");
-  if (existsSync(join(out, ".vercel"))) throw new Error(`${out}/.vercel exists; use a fresh --out for each build`);
   const repoTop = run(["git", "-C", a.repo, "rev-parse", "--show-toplevel"]).trim();
-  if (out.startsWith(repoTop + "/")) throw new Error("--out must be outside the repository, so no build file lands in a tree that can be committed");
+  const refused = outProblems(out, repoTop);
+  if (refused.length) throw new Error(refused.join("; "));
 
   const work = join(out, "work");
+  try {
+    await buildInto(a, out, work, repoTop);
+  } finally {
+    rmSync(work, { recursive: true, force: true });
+  }
+}
+
+async function buildInto(a: ReturnType<typeof args>, out: string, work: string, repoTop: string) {
   const src = join(work, "src");
   const commit = exportSource(repoTop, src, a.worktree, a.commit);
+  if (!a.worktree) {
+    const committed = run(["git", "-C", repoTop, "ls-tree", "-r", "-z", "--name-only", commit]).split("\0").filter(Boolean);
+    const drift = checkExportedTree(src, committed);
+    if (drift.length) throw new Error(`the build tree is not the commit's: ${drift.slice(0, 5).join("; ")}${drift.length > 5 ? ` (and ${drift.length - 5} more)` : ""}`);
+  }
   const canaries = { VITE_WCONF_CANARY: randomBytes(12).toString("hex"), WCONF_CANARY: randomBytes(12).toString("hex") };
   const env: Record<string, string> = {
     WCONF_ACCEPT_REMOTE_LEDGER_RISK: RISK_ACCEPTANCE_PHRASE,
@@ -112,21 +189,25 @@ export async function build(argv: string[]) {
     ...canaries,
   };
   const IMAGE = image();
-  const docker = [
-    "docker", "--context", DOCKER_CONTEXT, "run", "--rm",
+  const docker = (extra: string[], script: string) => [
+    "docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...extra,
     "-v", `${src}:/src`, "-w", "/src",
     ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
-    IMAGE, "sh", "-c", CONTAINER_SCRIPT,
+    IMAGE, "sh", "-c", script,
   ];
   console.log(`building ${commit}${a.worktree ? " (TRIAL: working tree)" : ""} in ${IMAGE}`);
-  const r = Bun.spawnSync(docker, { stdout: "pipe", stderr: "pipe" });
-  writeFileSync(join(out, "container.log"), r.stdout.toString() + "\n--- stderr ---\n" + r.stderr.toString());
-  if (r.exitCode !== 0) throw new Error(`the container build failed (${r.exitCode}); see ${join(out, "container.log")}`);
+  let log = "";
+  for (const [label, extra, script] of [["install and snapshot, with network", [], CONTAINER_SCRIPT], ["build and assemble, --network none", OFFLINE_ARGS, OFFLINE_SCRIPT]] as const) {
+    const r = Bun.spawnSync(docker([...extra], script), { stdout: "pipe", stderr: "pipe" });
+    log += `=== ${label}\n${r.stdout.toString()}\n--- stderr ---\n${r.stderr.toString()}\n`;
+    writeFileSync(join(out, "container.log"), log);
+    if (r.exitCode !== 0) throw new Error(`the container step "${label}" failed (${r.exitCode}); see ${join(out, "container.log")}`);
+  }
 
   cpSync(join(src, "web/hosted/.build/.vercel"), join(out, ".vercel"), { recursive: true });
   const snapshot = JSON.parse(readFileSync(join(src, "web/hosted/.build/snapshot.json"), "utf8"));
 
-  // The canaries: neither value may appear anywhere in what is uploaded.
+  // The canaries: neither value may appear verbatim anywhere in what is uploaded.
   const leaked = leakedCanaries(join(out, ".vercel"), Object.values(canaries));
   if (leaked.length) throw new Error(`a build variable reached the output (REVIEW-058 M11): ${leaked.join(", ")}`);
 
@@ -139,13 +220,13 @@ export async function build(argv: string[]) {
     builtAt: new Date().toISOString(),
     snapshot: { ledgerIndex: snapshot.source.ledgerIndex, readAt: snapshot.readAt, endpoint: snapshot.source.endpoint, canonicalUrl: snapshot.canonicalUrl },
     environment: Object.keys(env).sort(),
-    canaries: "two random values, under VITE_ and WCONF_; neither appears in the output",
+    canaries: "two random values, under VITE_ and WCONF_; neither appears verbatim in the output",
     isolation:
-      `the container mounted only ${a.worktree ? "a copy of the working tree (TRIAL)" : "a git archive of the commit"}; ` +
-      "it checked /tmp/wconf and ~/.wconf absent before installing; no deployment token was present",
+      `the containers mounted only ${a.worktree ? "a copy of the working tree (TRIAL)" : "a git archive of the commit, checked file for file against the commit before they ran"}; ` +
+      "each checked /tmp/wconf and ~/.wconf absent before running anything else; install and the snapshot had network, " +
+      "and could reach the build machine's loopback; the Vite build and the assembler ran with --network none; no deployment token was present",
   };
   writeFileSync(join(out, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
-  rmSync(work, { recursive: true, force: true });
   console.log(`built ${join(out, ".vercel/output")} from ${commit} at ledger ${snapshot.source.ledgerIndex}; manifest at ${join(out, "build-manifest.json")}`);
   console.log(`next: bun run tools/check-web-readonly.ts --hosted ${out} --commit ${commit}`);
 }
@@ -161,7 +242,7 @@ export function leakedCanaries(dir: string, values: string[]): string[] {
  * The build's own controls, through the same container script and the same
  * leak check the build runs. Needs Docker; reads no ledger.
  */
-export function selfTest(): string[] {
+export async function selfTest(): Promise<string[]> {
   const failed: string[] = [];
   const tag = image();
   // The image's own home directory, asked rather than assumed: its user is set
@@ -169,9 +250,29 @@ export function selfTest(): string[] {
   const home = run(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", tag, "sh", "-c", 'printf %s "$HOME"']).trim();
   if (!home.startsWith("/")) failed.push(`the image reported no home directory (${JSON.stringify(home)})`);
   for (const store of ["/tmp/wconf", `${home}/.wconf`]) {
-    const r = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", "--tmpfs", store, tag, "sh", "-c", CONTAINER_SCRIPT], { stdout: "pipe", stderr: "pipe" });
-    const err = r.stderr.toString();
-    if (r.exitCode !== 3 || !err.includes(`REFUSED: ${store} exists`)) failed.push(`a decoy ${store} was not refused before install (exit ${r.exitCode}: ${err.trim().slice(0, 200)})`);
+    for (const [label, extra, script] of [["install", [], CONTAINER_SCRIPT], ["offline build", OFFLINE_ARGS, OFFLINE_SCRIPT]] as const) {
+      const r = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...extra, "--tmpfs", store, tag, "sh", "-c", script], { stdout: "pipe", stderr: "pipe" });
+      const err = r.stderr.toString();
+      if (r.exitCode !== 3 || !err.includes(`REFUSED: ${store} exists`)) failed.push(`a decoy ${store} was not refused before the ${label} step (exit ${r.exitCode}: ${err.trim().slice(0, 200)})`);
+    }
+  }
+  // The offline step's network, through the same arguments the build passes:
+  // a fetch to the ledger and one to a listener on the build machine's
+  // loopback must both fail. ⚠ The loopback half first aimed at a port where
+  // nothing listened, so it was unreachable WITH network too and tested
+  // nothing; found by running this with the offline arguments removed. ⚠ And
+  // the container is spawned ASYNCHRONOUSLY: a synchronous spawn blocks this
+  // process, so its own listener could not answer and every probe timed out.
+  const listener = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("listening") });
+  try {
+    for (const url of ["https://s.devnet.rippletest.net:51234/", `http://host.docker.internal:${listener.port}/`]) {
+      const proc = Bun.spawn(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...OFFLINE_ARGS, tag, "bun", "-e",
+        `try { await fetch(${JSON.stringify(url)}, { signal: AbortSignal.timeout(5000) }); console.log("REACHED") } catch { console.log("UNREACHABLE") }`], { stdout: "pipe", stderr: "pipe" });
+      const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
+      if (!stdout.includes("UNREACHABLE")) failed.push(`the offline step reached ${url} (${stdout.trim()} ${stderr.trim().slice(0, 120)})`);
+    }
+  } finally {
+    listener.stop(true);
   }
   const d = mkdtempSync(join(tmpdir(), "wconf-build-self-test-"));
   try {
@@ -188,7 +289,7 @@ export function selfTest(): string[] {
 
 if (import.meta.main) {
   if (process.argv.includes("--self-test")) {
-    const failed = selfTest();
+    const failed = await selfTest();
     for (const f of failed) console.log(`  CONTROL FAILED: ${f}`);
     console.log(`build self-test: verdict=${failed.length ? "CONTROL-FAILED" : "PASS"} exit=${failed.length ? 2 : 0}`);
     process.exit(failed.length ? 2 : 0);
diff --git a/web/hosted/compare-deployed.ts b/web/hosted/compare-deployed.ts
index 5160397..0d39f93 100644
--- a/web/hosted/compare-deployed.ts
+++ b/web/hosted/compare-deployed.ts
@@ -4,10 +4,15 @@
  *
  *   bun run web/hosted/compare-deployed.ts <output root> <https origin>
  *
- * Fetches every file `gate-verdict.json` lists, and each page by its route,
- * and compares bytes with the verdict's digests and the security headers with
- * `config.json`'s. Fails on any difference, on a cookie, on a redirect, and on
- * an unknown path that does not answer 404.
+ * Fetches every file `gate-verdict.json` lists, and each page by both spellings
+ * of its route, and compares bytes with the verdict's digests, the security
+ * headers with `config.json`'s and the content type with the file's kind. Fails
+ * on any difference, on a status other than 200, on a cookie, on a redirect,
+ * and on an unknown path that does not answer 404 under the same headers.
+ *
+ * ⚠ **`REVIEW-059` R1-6 found three things this did not look at**: the
+ * content type (every page could have been served as text), the verdict
+ * file's status, and `/<page>/`, which the routes serve and nothing fetched.
  *
  * ⚠ **It detects a change at the moment it runs, nothing later.** The deployed
  * bytes are the host's to deliver (`ADR-0004`, `REVIEW-058` S-3, R1-10).
@@ -20,6 +25,12 @@ import { HOSTED_PAGES } from "./pages.ts";
 const sha256 = (b: ArrayBuffer | Buffer) => createHash("sha256").update(Buffer.from(b as ArrayBuffer)).digest("hex");
 const CHECKED_HEADERS = ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Cross-Origin-Opener-Policy", "Permissions-Policy"];
 
+/** The media types each kind of file may be served as. Both JavaScript types are valid for a module script. */
+export const MEDIA_TYPES: Record<string, string[]> = {
+  html: ["text/html"], js: ["text/javascript", "application/javascript"], css: ["text/css"],
+  json: ["application/json"], txt: ["text/plain"],
+};
+
 export async function compareDeployed(root: string, origin: string): Promise<string[]> {
   const base = join(root, ".vercel", "output");
   const verdict = JSON.parse(readFileSync(join(base, "static/gate-verdict.json"), "utf8"));
@@ -34,6 +45,11 @@ export async function compareDeployed(root: string, origin: string): Promise<str
   const checkHeaders = (path: string, r: Response) => {
     for (const h of CHECKED_HEADERS) if (r.headers.get(h) !== want[h]) problems.push(`${path}: ${h} is ${JSON.stringify(r.headers.get(h))}, not what config.json sets`);
   };
+  const checkType = (path: string, file: string, r: Response) => {
+    const ext = file.slice(file.lastIndexOf(".") + 1);
+    const got = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
+    if (!(MEDIA_TYPES[ext] ?? []).includes(got)) problems.push(`${path}: served as ${JSON.stringify(got)}, not ${(MEDIA_TYPES[ext] ?? ["a known type"]).join(" or ")}`);
+  };
   for (const [p, digest] of Object.entries<string>(verdict.perFile)) {
     if (!p.startsWith("static/")) continue;
     const path = p.slice("static".length);
@@ -41,19 +57,26 @@ export async function compareDeployed(root: string, origin: string): Promise<str
     if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
     if (sha256(await r.arrayBuffer()) !== digest) problems.push(`${path}: the served bytes differ from what the gate passed`);
     checkHeaders(path, r);
+    checkType(path, p, r);
   }
   for (const page of HOSTED_PAGES) {
-    const path = `/${page}`;
-    const r = await get(path);
     const file = page ? `static/${page}/index.html` : "static/index.html";
-    if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
-    if (sha256(await r.arrayBuffer()) !== verdict.perFile[file]) problems.push(`${path}: the page served at its route differs from ${file}`);
-    checkHeaders(path, r);
+    for (const path of page ? [`/${page}`, `/${page}/`] : ["/"]) {
+      const r = await get(path);
+      if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
+      if (sha256(await r.arrayBuffer()) !== verdict.perFile[file]) problems.push(`${path}: the page served at its route differs from ${file}`);
+      checkHeaders(path, r);
+      checkType(path, file, r);
+    }
   }
   const served = await get("/gate-verdict.json");
+  if (served.status !== 200) problems.push(`/gate-verdict.json: HTTP ${served.status}`);
   if (sha256(await served.arrayBuffer()) !== sha256(readFileSync(join(base, "static/gate-verdict.json")))) problems.push("/gate-verdict.json differs from the local one");
+  checkHeaders("/gate-verdict.json", served);
+  checkType("/gate-verdict.json", "gate-verdict.json", served);
   const missing = await get(`/no-such-page-${Date.now()}`);
   if (missing.status !== 404) problems.push(`an unknown path answered ${missing.status}, not 404`);
+  checkHeaders("an unknown path", missing);
   return problems;
 }
 
diff --git a/web/hosted/deploy-preflight.ts b/web/hosted/deploy-preflight.ts
index 36c1e6f..89c3e7b 100644
--- a/web/hosted/deploy-preflight.ts
+++ b/web/hosted/deploy-preflight.ts
@@ -11,7 +11,7 @@
 import { createHash } from "node:crypto";
 import { existsSync, readFileSync } from "node:fs";
 import { join } from "node:path";
-import { readOutput } from "../../tools/check-web-hosted.ts";
+import { LEDGER_PAGES, readOutput, runChecks, type Finding } from "../../tools/check-web-hosted.ts";
 
 const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
 
@@ -30,14 +30,46 @@ export function onPublicMain(commit: string, compare = (sha: string) => {
   return status === "identical" || status === "ahead";
 }
 
-export function preflight(root: string, isOnPublicMain: (commit: string) => boolean = onPublicMain): string[] {
+/**
+ * ⚠ **What a PASS here means, and what it does not** (`REVIEW-059` R1-7, S-5).
+ * It means: the manifest says a commit build, not a trial, of a commit on the
+ * public `main`; the gate's checks pass on these exact bytes, run again here;
+ * every file matches the verdict; and every ledger page names the ledger the
+ * manifest records. It does not mean the files came from that commit: that is
+ * the build's tree check, and the manifest is the build's own word for it.
+ */
+export function preflight(
+  root: string,
+  isOnPublicMain: (commit: string) => boolean = onPublicMain,
+  checks: (files: Map<string, Buffer>, want: { commit: string }) => Finding[] = runChecks,
+): string[] {
   const problems: string[] = [];
   const manifestPath = join(root, "build-manifest.json");
   if (!existsSync(manifestPath)) return [`no build-manifest.json beside the output; build with web/hosted/build.ts`];
   const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
-  if (manifest.trial) problems.push("the manifest says TRIAL: this output was built from a working tree, not a commit");
+  // ⚠ `if (manifest.trial)` passed a manifest with no `trial` at all.
+  if (manifest.trial !== false) problems.push(`the manifest's trial field is ${JSON.stringify(manifest.trial ?? null)}, not false: this output is not known to be a commit build`);
+  else if (typeof manifest.commit !== "string" || !/^[0-9a-f]{40}$/.test(manifest.commit)) problems.push(`the manifest's commit ${JSON.stringify(manifest.commit ?? null)} is not a full commit id`);
   else if (!isOnPublicMain(manifest.commit)) problems.push(`${manifest.commit} is not on the public repository's main, so the footer's link names a commit readers cannot see`);
   const files = readOutput(root);
+  // The gate's checks, again, on the bytes about to be uploaded: a file changed
+  // together with its verdict passes the digest comparison below and not this.
+  // The controls and the secret sweep stay the gate's.
+  for (const f of checks(files, { commit: String(manifest.commit) })) problems.push(`the gate's check fails now: ${f.check}: ${f.detail}`);
+  // Every page's footer names the snapshot's read time and the address it is
+  // published at; both must be the manifest's (`REVIEW-059` R1-7).
+  for (const [p, b] of files) {
+    if (!p.endsWith(".html")) continue;
+    const h = b.toString("utf8");
+    if (!manifest.snapshot?.readAt || !h.includes(String(manifest.snapshot.readAt))) problems.push(`${p} does not show the manifest's read time ${JSON.stringify(manifest.snapshot?.readAt ?? null)}`);
+    if (!manifest.snapshot?.canonicalUrl || !h.includes(`<code>${manifest.snapshot.canonicalUrl}</code>`)) problems.push(`${p} does not name the manifest's address ${JSON.stringify(manifest.snapshot?.canonicalUrl ?? null)}`);
+  }
+  const ledgerIndex = manifest.snapshot?.ledgerIndex;
+  for (const lp of LEDGER_PAGES) {
+    const h = files.get(`static/${lp}/index.html`)?.toString("utf8") ?? "";
+    const named = [...h.matchAll(/data-ledger-index="(\d+)"/g)].map((m) => Number(m[1]));
+    if (!named.length || named.some((n) => n !== ledgerIndex)) problems.push(`/${lp} names ledger ${[...new Set(named)].join(", ") || "none"}, and the manifest records ${JSON.stringify(ledgerIndex ?? null)}`);
+  }
   const v = files.get("static/gate-verdict.json");
   if (!v) return [...problems, "no static/gate-verdict.json: the gate has not passed this output"];
   const verdict = JSON.parse(v.toString("utf8"));
diff --git a/web/hosted/deploy.test.ts b/web/hosted/deploy.test.ts
index b703c47..cf17ad0 100644
--- a/web/hosted/deploy.test.ts
+++ b/web/hosted/deploy.test.ts
@@ -3,10 +3,10 @@
  * not pass, and the comparison sees what the host changed.
  */
 import { afterEach, describe, expect, test } from "bun:test";
-import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
+import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { readOutput, verdictFile } from "../../tools/check-web-hosted.ts";
+import { LEDGER_PAGES, readOutput, verdictFile } from "../../tools/check-web-hosted.ts";
 import { onPublicMain, preflight } from "./deploy-preflight.ts";
 import { compareDeployed } from "./compare-deployed.ts";
 import { serveOutput } from "./browser-check.ts";
@@ -17,39 +17,60 @@ const dirs: string[] = [];
 afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
 
 /** A minimal output the gate has passed, with its manifest beside it. */
-function fixture(o: { trial?: boolean; verdict?: boolean } = {}): string {
+const READ_AT = "2026-10-20T05:22:05.191Z";
+function fixture(o: { trial?: boolean | null; verdict?: boolean; ledgerIndex?: number; readAt?: string } = {}): string {
   const root = mkdtempSync(join(tmpdir(), "wconf-deploy-test-"));
   dirs.push(root);
   const base = join(root, ".vercel", "output");
   for (const p of HOSTED_PAGES) {
     mkdirSync(join(base, "static", p), { recursive: true });
-    writeFileSync(join(base, "static", p, "index.html"), `<html><body>${p || "home"}</body></html>`);
+    const ledger = (LEDGER_PAGES as readonly string[]).includes(p) ? `<div data-ledger-index="${o.ledgerIndex ?? 1}"></div>` : "";
+    const footer = `<footer>read on ${READ_AT}; published at <code>https://x.vercel.app</code></footer>`;
+    writeFileSync(join(base, "static", p, "index.html"), `<html><body>${p || "home"}${ledger}${footer}</body></html>`);
   }
   const headers = { "Content-Security-Policy": "default-src 'self'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cross-Origin-Opener-Policy": "same-origin", "Permissions-Policy": "camera=()" };
   writeFileSync(join(base, "config.json"), JSON.stringify({ version: 3, routes: [{ src: "/(.*)", headers, continue: true }, ...HOSTED_PAGES.filter(Boolean).map((p) => ({ src: `^/${p}/?$`, dest: `/${p}/index.html` })), { handle: "filesystem" }] }));
-  writeFileSync(join(root, "build-manifest.json"), JSON.stringify({ trial: o.trial ?? false, commit: COMMIT, snapshot: { ledgerIndex: 1, canonicalUrl: "https://x.vercel.app" } }));
+  const manifest: any = { trial: o.trial === undefined ? false : o.trial, commit: COMMIT, snapshot: { ledgerIndex: 1, readAt: o.readAt ?? READ_AT, canonicalUrl: "https://x.vercel.app" } };
+  if (o.trial === null) delete manifest.trial;
+  writeFileSync(join(root, "build-manifest.json"), JSON.stringify(manifest));
   if (o.verdict ?? true) writeFileSync(join(base, "static/gate-verdict.json"), JSON.stringify(verdictFile(readOutput(root), { commit: COMMIT }, 0)));
   return root;
 }
 const onMain = () => true;
+// The fixture is not a real output, so the gate's checks are stubbed except
+// where a test is about them.
+const clean = () => [];
 
 describe("deploy-preflight", () => {
   test("passes the output the gate passed", () => {
-    expect(preflight(fixture(), onMain)).toEqual([]);
+    expect(preflight(fixture(), onMain, clean)).toEqual([]);
   });
   test("refuses a trial build", () => {
-    expect(preflight(fixture({ trial: true }), onMain).join()).toMatch(/TRIAL/);
+    expect(preflight(fixture({ trial: true }), onMain, clean).join()).toMatch(/trial field is true/);
+  });
+  test("refuses a manifest with no trial field (REVIEW-059 R1-7)", () => {
+    expect(preflight(fixture({ trial: null }), onMain, clean).join()).toMatch(/trial field is null, not false/);
   });
   test("refuses a commit that is not on the public main", () => {
-    expect(preflight(fixture(), () => false).join()).toMatch(/not on the public repository's main/);
+    expect(preflight(fixture(), () => false, clean).join()).toMatch(/not on the public repository's main/);
   });
   test("refuses an output with no verdict", () => {
-    expect(preflight(fixture({ verdict: false }), onMain).join()).toMatch(/gate has not passed/);
+    expect(preflight(fixture({ verdict: false }), onMain, clean).join()).toMatch(/gate has not passed/);
   });
   test("refuses a file changed after the gate passed", () => {
     const root = fixture();
     appendFileSync(join(root, ".vercel/output/static/observer/index.html"), "<!-- later -->");
-    expect(preflight(root, onMain).join()).toMatch(/static\/observer\/index\.html changed/);
+    expect(preflight(root, onMain, clean).join()).toMatch(/static\/observer\/index\.html changed/);
+  });
+  test("refuses an output whose gate check fails now, verdict and all (REVIEW-059 S-5)", () => {
+    const failing = () => [{ check: "csp", detail: "planted" }];
+    expect(preflight(fixture(), onMain, failing).join()).toMatch(/the gate's check fails now: csp: planted/);
+  });
+  test("refuses a manifest whose read time no page shows (REVIEW-059 R1-7)", () => {
+    expect(preflight(fixture({ readAt: "2026-01-01T00:00:00.000Z" }), onMain, clean).join()).toMatch(/does not show the manifest's read time/);
+  });
+  test("refuses a ledger page that names another ledger than the manifest (REVIEW-059 R1-7)", () => {
+    expect(preflight(fixture({ ledgerIndex: 2 }), onMain, clean).join()).toMatch(/\/observer names ledger 2, and the manifest records 1/);
   });
   test("asks GitHub for a comparison, and only 'identical' or 'ahead' is on main", () => {
     expect(onPublicMain("x", () => "ahead")).toBe(true);
@@ -58,6 +79,17 @@ describe("deploy-preflight", () => {
   });
 });
 
+describe("browser-check's server", () => {
+  test("refuses a configuration it cannot model (REVIEW-059 R1-5)", () => {
+    const root = fixture();
+    const cfg = join(root, ".vercel/output/config.json");
+    const c = JSON.parse(readFileSync(cfg, "utf8"));
+    c.routes.splice(1, 0, { src: "/(.*)", headers: { "Content-Security-Policy": "default-src *" }, continue: true });
+    writeFileSync(cfg, JSON.stringify(c));
+    expect(() => serveOutput(root)).toThrow(/cannot model route 1/);
+  });
+});
+
 describe("compare-deployed", () => {
   test("finds nothing when the host serves what the gate passed", async () => {
     const root = fixture();
@@ -74,6 +106,43 @@ describe("compare-deployed", () => {
       expect(d).toMatch(/\/issuer: the page served at its route differs/);
     } finally { s.stop(true); }
   });
+  /** A host that serves the output, with one misbehaviour applied to each response. */
+  function misbehaving(root: string, change: (path: string, r: Response, body: ArrayBuffer) => Response | null) {
+    const inner = serveOutput(root);
+    const outer = Bun.serve({
+      hostname: "127.0.0.1", port: 0,
+      async fetch(req) {
+        const path = new URL(req.url).pathname;
+        const r = await fetch(`http://127.0.0.1:${inner.port}${path}`, { redirect: "manual" });
+        const body = await r.arrayBuffer();
+        return change(path, r, body) ?? new Response(body, { status: r.status, headers: r.headers });
+      },
+    });
+    return { port: outer.port, stop: () => { outer.stop(true); inner.stop(true); } };
+  }
+  const withHeaders = (r: Response, h: Record<string, string | null>) => { const out = new Headers(r.headers); for (const [k, v] of Object.entries(h)) v === null ? out.delete(k) : out.set(k, v); return out; };
+
+  test("sees a page served as text (REVIEW-059 R1-6)", async () => {
+    const root = fixture();
+    const s = misbehaving(root, (p, r, b) => (p.endsWith(".html") || !p.includes(".") ? new Response(b, { status: r.status, headers: withHeaders(r, { "content-type": "text/plain" }) }) : null));
+    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/issuer: served as "text\/plain", not text\/html/); } finally { s.stop(); }
+  });
+  test("sees a page that differs only at its trailing-slash route (REVIEW-059 R1-6)", async () => {
+    const root = fixture();
+    const s = misbehaving(root, (p, r) => (p === "/issuer/" ? new Response("<html>The holder is private from the issuer.</html>", { status: 200, headers: r.headers }) : null));
+    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/issuer\/: the page served at its route differs/); } finally { s.stop(); }
+  });
+  test("sees the verdict served with an error status (REVIEW-059 R1-6)", async () => {
+    const root = fixture();
+    const s = misbehaving(root, (p, r, b) => (p === "/gate-verdict.json" ? new Response(b, { status: 500, headers: r.headers }) : null));
+    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/gate-verdict\.json: HTTP 500/); } finally { s.stop(); }
+  });
+  test("sees an unknown path answered without the policy (REVIEW-059 R1-6)", async () => {
+    const root = fixture();
+    const s = misbehaving(root, (_p, r, b) => (r.status === 404 ? new Response(b, { status: 404, headers: withHeaders(r, { "Content-Security-Policy": null }) }) : null));
+    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/an unknown path: Content-Security-Policy is null/); } finally { s.stop(); }
+  });
+
   test("sees a header the host changed, a cookie, and a catch-all", async () => {
     const root = fixture();
     const s = Bun.serve({
diff --git a/web/hosted/licence-notices.ts b/web/hosted/licence-notices.ts
index f40cf43..78a065c 100644
--- a/web/hosted/licence-notices.ts
+++ b/web/hosted/licence-notices.ts
@@ -14,6 +14,18 @@ import { existsSync, readFileSync } from "node:fs";
 import { join } from "node:path";
 
 export const EMAIL_MARKER = "[email address removed; the package's own licence file carries it]";
+
+/**
+ * The licence file's opening lines, before the first notice. One constant, so
+ * the gate can require the file to open with exactly this and nothing else
+ * (`REVIEW-059` S-4: the region before the first notice was read by no check).
+ */
+export const LICENCE_FILE_HEADER = [
+  "Third-party software in the W-CONF hosted demo's client bundle, with the licence",
+  "each package ships. Collected at build time from the modules actually bundled.",
+  `Email addresses in these notices are replaced with "${EMAIL_MARKER}".`,
+  "",
+];
 const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
 
 export function redactEmails(text: string): string {
diff --git a/web/hosted/snapshot.test.ts b/web/hosted/snapshot.test.ts
index 1c191f2..22b25ff 100644
--- a/web/hosted/snapshot.test.ts
+++ b/web/hosted/snapshot.test.ts
@@ -8,6 +8,7 @@ import type { HostedSnapshot } from "./snapshot-types.ts";
 
 const ACCOUNT = { address: "rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8", issuanceId: "00".repeat(24), label: "Holder A", note: "n" };
 const KEY = "02" + "11".repeat(32);
+const ISS = { issuer: "rIssuer", confidentialOutstandingAmountRaw: "7", issuerEncryptionKey: KEY };
 
 function fake(o: { exists?: boolean; mpt?: any; issuance?: any }) {
   return {
@@ -20,36 +21,49 @@ function fake(o: { exists?: boolean; mpt?: any; issuance?: any }) {
 
 describe("readAccount", () => {
   test("an account the pinned ledger does not hold is 'account-missing', with no view", async () => {
-    const a = await readAccount(fake({ exists: false }), ACCOUNT, true);
+    const a = await readAccount(fake({ exists: false }), ACCOUNT, ISS);
     expect(a.state).toBe("account-missing");
     expect(a.observer).toBeNull();
     expect(a.issuerMirror).toBeNull();
   });
 
   test("a missing issuance is 'issuance-missing', checked after the account", async () => {
-    expect((await readAccount(fake({}), ACCOUNT, false)).state).toBe("issuance-missing");
-    expect((await readAccount(fake({ exists: false }), ACCOUNT, false)).state).toBe("account-missing");
+    expect((await readAccount(fake({}), ACCOUNT, null)).state).toBe("issuance-missing");
+    expect((await readAccount(fake({ exists: false }), ACCOUNT, null)).state).toBe("account-missing");
   });
 
   test("an account with no MPToken is 'no-position', not a zero balance", async () => {
-    const a = await readAccount(fake({ mpt: null }), ACCOUNT, true);
+    const a = await readAccount(fake({ mpt: null }), ACCOUNT, ISS);
     expect(a.state).toBe("no-position");
     expect(a.observer).toBeNull();
   });
 
   test("a position records whether the issuer's mirror is on the ledger, and no figure", async () => {
     const mpt = { publicAmountRaw: "0", confidentialBalanceVersion: 1, issuerEncryptedBalance: "AB".repeat(66) };
-    const a = await readAccount(fake({ mpt }), ACCOUNT, true);
+    const a = await readAccount(fake({ mpt }), ACCOUNT, ISS);
     expect(a.state).toBe("present");
     expect(a.issuerMirror).toEqual({ present: true, ciphertext: "AB".repeat(66) });
     expect(JSON.stringify(a)).not.toMatch(/decrypt(ed)?(Balance|Amount)|"figure"/);
-    const b = await readAccount(fake({ mpt: { ...mpt, issuerEncryptedBalance: undefined } }), ACCOUNT, true);
+    const b = await readAccount(fake({ mpt: { ...mpt, issuerEncryptedBalance: undefined } }), ACCOUNT, ISS);
     expect(b.issuerMirror).toEqual({ present: false });
   });
 
+  test("the position is read once, so a contradicting second answer cannot empty it (REVIEW-059 R1-8)", async () => {
+    const mpt = { publicAmountRaw: "750", confidentialBalanceVersion: 11 };
+    let reads = 0, issuanceReads = 0;
+    const flaky = { ...fake({}), mptoken: async () => (reads++ === 0 ? mpt : null), issuance: async () => { issuanceReads++; return null; } };
+    const a = await readAccount(flaky, ACCOUNT, ISS);
+    expect(reads).toBe(1);
+    expect(issuanceReads).toBe(0);
+    expect(a.observer?.issuance.confidentialOutstandingAmount).toBe("7");
+    expect(a.state).toBe("present");
+    expect(a.observer?.publicAmount).toBe("750");
+    expect(a.observer?.confidentialBalanceVersion).toBe(11);
+  });
+
   test("a read that fails is not swallowed into a state", async () => {
     const broken = { ...fake({}), accountExists: async () => { throw new Error("REFUSED_LEDGER_TORN"); } };
-    await expect(readAccount(broken, ACCOUNT, true)).rejects.toThrow(/REFUSED_LEDGER_TORN/);
+    await expect(readAccount(broken, ACCOUNT, ISS)).rejects.toThrow(/REFUSED_LEDGER_TORN/);
   });
 });
 
diff --git a/web/hosted/snapshot.ts b/web/hosted/snapshot.ts
index 2e0da6f..b5ad048 100644
--- a/web/hosted/snapshot.ts
+++ b/web/hosted/snapshot.ts
@@ -24,7 +24,7 @@
 
 import { writeFileSync } from "node:fs";
 import { LoopbackLedger, LedgerRefusal } from "../../facility/src/loopback.ts";
-import { observerView } from "../api/observer.ts";
+import { viewOf } from "../api/observer.ts";
 import { DEMO_ACCOUNTS, DEMO_ISSUANCE, validDemoAccounts } from "../api/demo-accounts.ts";
 import { CAPABILITY_MATRIX, INVARIANTS, MASTER_SEED_DISCLOSURE, DERIVATION_NOT_PUBLISHED, WALLET_CODEC_GAP } from "../api/capability.ts";
 import { walkFlows } from "../api/custody-sim.ts";
@@ -42,18 +42,21 @@ export const HOSTED_ENDPOINT = "https://s.devnet.rippletest.net:51234";
 
 /** One account at the pinned ledger. Exported for tests. */
 export async function readAccount(
-  snap: { accountExists(a: string): Promise<boolean>; mptoken: (a: string, i: string) => Promise<any>; issuance: (i: string) => Promise<any>; index: number },
+  snap: { accountExists(a: string): Promise<boolean>; mptoken: (a: string, i: string) => Promise<any>; index: number },
   account: { address: string; issuanceId: string; label: string; note: string },
-  issuanceExists: boolean,
+  /** The issuance as the snapshot already read it, or null for a missing one. Not read again here. */
+  iss: any | null,
 ): Promise<HostedAccount> {
   const base = { address: account.address, label: account.label, note: account.note };
   if (!(await snap.accountExists(account.address))) {
     return { ...base, state: "account-missing", observer: null, issuerMirror: null };
   }
-  if (!issuanceExists) return { ...base, state: "issuance-missing", observer: null, issuerMirror: null };
+  if (!iss) return { ...base, state: "issuance-missing", observer: null, issuerMirror: null };
+  // ⚠ One read of the position, and the view is built from it and from the
+  // issuance the snapshot already read (`REVIEW-059` R1-8: both were read again).
   const mpt = await snap.mptoken(account.address, account.issuanceId);
   if (!mpt) return { ...base, state: "no-position", observer: null, issuerMirror: null };
-  const observer = await observerView(snap as any, account.address, account.issuanceId);
+  const observer = viewOf(account.address, account.issuanceId, mpt, iss);
   return {
     ...base,
     state: "present",
@@ -85,7 +88,7 @@ export async function takeSnapshot(commit: string, canonicalUrl: string, endpoin
   }
 
   const out: HostedAccount[] = [];
-  for (const a of accounts) out.push(await readAccount(snap, a, issuanceExists));
+  for (const a of accounts) out.push(await readAccount(snap, a, issuanceExists ? iss : null));
 
   return {
     schema: SNAPSHOT_SCHEMA,

````


## FILE: tools/check-web-hosted.ts, after the fixes (complete)

````typescript
/**
 * check-web-hosted — architecture §6 step 9's gate: the HOSTED part of
 * `check-web-readonly`, run over the UPLOADED OUTPUT and its routing
 * configuration, never over the source (`ADR-0004`, "What phase 2 step 4's gate
 * must check").
 *
 *   bun run tools/check-web-readonly.ts --hosted <output root> --commit <sha>
 *
 * `<output root>` holds `.vercel/output/`. On a pass it writes
 * `.vercel/output/static/gate-verdict.json`, which the page's footer reads: a
 * digest of every other file, so a reader can tell what the gate passed.
 *
 * ⚠ **Gates in this repository have false-passed before they worked**
 * (`CLAIMS.md` E-165, E-182, E-226). So every run first copies the real output,
 * breaks the copy one way per control, and runs the SAME `runChecks()` over it;
 * each control names the check that must fire, and the unbroken copy must pass.
 * A control that fails stops the run with `CONTROL-FAILED`.
 *
 * ⚠ **It cannot check egress.** It reads files; a visitor's requests are not in
 * them (`ADR-0004`). `web/hosted/browser-check.ts` observes one browser's
 * requests, which is evidence about that browser and not a proof. The full list
 * of what this gate does not check is printed on every run.
 *
 * The last line is always `check-web-hosted: verdict=<WORD> exit=<N>`.
 */

import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeSeed } from "ripple-address-codec";
import { SOCKET_NEEDLES, SECRET_NEEDLES } from "./web-readonly-needles.ts";
import { DH2_WORDING, DEVNET_NETWORK_ID } from "../web/app/src/hosted/wording.ts";
import { DEMO_ACCOUNTS } from "../web/api/demo-accounts.ts";
import { HOSTED_PAGES } from "../web/hosted/pages.ts";
import { inlineScripts, scriptHash } from "../web/hosted/csp.ts";
import { EMAIL_MARKER, LICENCE_FILE_HEADER, shippedNotice } from "../web/hosted/licence-notices.ts";

const REPO = join(import.meta.dir, "..");

// ------------------------------------------------------------------ the output

/** Every file under `.vercel/output`, by path relative to it. Symlinks refused. */
export function readOutput(root: string): Map<string, Buffer> {
  const base = join(root, ".vercel", "output");
  if (!existsSync(base)) throw new Error(`${base} does not exist`);
  const files = new Map<string, Buffer>();
  const walk = (rel: string) => {
    for (const name of readdirSync(join(base, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(join(base, r));
      if (st.isSymbolicLink()) throw new Error(`a symlink at ${r}: the uploader may follow it`);
      if (st.isDirectory()) walk(r);
      else if (st.isFile()) files.set(r, readFileSync(join(base, r)));
      else throw new Error(`${r} is not a regular file`);
    }
  };
  walk("");
  return files;
}

const VERDICT = "static/gate-verdict.json";
const text = (b: Buffer) => b.toString("utf8");
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** React escapes these in text; the wording is compared after undoing it. */
export function decodeEntities(s: string): string {
  return s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}


// ------------------------------------------------------------------ the checks

export interface Finding { check: string; detail: string }
export interface Expect { commit: string }

/** What the provenance rule admits, by path. Anything else fails. */
export const ADMITTED: RegExp[] = [
  /^config\.json$/,
  /^static\/index\.html$/,
  new RegExp(`^static/(${HOSTED_PAGES.filter(Boolean).join("|")})/index\\.html$`),
  /^static\/assets\/[A-Za-z0-9_-]+\.(js|css)$/,
  /^static\/third-party-licenses\.txt$/,
  /^static\/gate-verdict\.json$/,
];

/**
 * The packages the client bundle may contain, as its licence file lists them.
 * ⚠ A package added by a framework update fails this until the list is changed
 * in review; a cryptography, ledger or server package is never admitted.
 */
export const ADMITTED_PACKAGES = new Set([
  "@tanstack/history", "@tanstack/react-router", "@tanstack/react-start", "@tanstack/react-start-client",
  "@tanstack/react-store", "@tanstack/router-core", "@tanstack/start-client-core", "@tanstack/store",
  "react", "react-dom", "scheduler", "seroval", "seroval-plugins", "use-sync-external-store", "tailwindcss",
]);

/**
 * Absolute URLs the output may contain, each with why. ⚠ None is fetched: the
 * policy's `connect-src 'self'` refuses any connection elsewhere, and this list
 * exists so a new third-party URL fails the gate rather than passing silently.
 */
export const ADMITTED_URLS: [RegExp, string][] = [
  [/^http:\/\/www\.w3\.org\/(1999\/xlink|2000\/svg|XML\/1998\/namespace|1998\/Math\/MathML)$/, "XML namespace names in React's DOM code"],
  [/^https:\/\/react\.dev\/errors\/$/, "React's error-decoder link in production messages"],
  [/^https:\/\/tailwindcss\.com$/, "Tailwind's licence banner in the stylesheet"],
  [/^http:\/\/localhost$/, "TanStack Router's fallback origin when window.origin is null"],
  [/^https:\/\/github\.com\/nandanito\/xrpl-confidential-positions(\/commit\/[0-9a-f]{40}|#run-it)?$/, "links to the public repository"],
  [/^https:\/\/s\.devnet\.rippletest\.net:51234$/, "the ledger endpoint, NAMED on the page as the source of its values"],
  [/^https:\/\/[a-z0-9-]+\.vercel\.app$/, "the canonical address the footer names"],
];

const FORMS = /<(input|textarea|select|form)\b|contenteditable/i;
const PAGE_HTML = (p: string) => (p ? `static/${p}/index.html` : "static/index.html");

/**
 * The pages that render ledger values, NAMED rather than inferred. ⚠ Check 8
 * first applied to any page carrying `data-ledger-value`, a marker the page sets
 * on itself, so a page that rendered a value without it was never checked
 * (`REVIEW-059` R1-2, B1-8). Each page here must carry the marker and the
 * wording; every other page must carry no marker, no ciphertext and no demo
 * account address. A new ledger page is added here in review.
 */
export const LEDGER_PAGES = ["observer", "issuer"] as const;

/** A 66-byte ElGamal ciphertext as the pages print it: 132 hex characters. */
const CIPHERTEXT = /\b[0-9A-Fa-f]{132}\b/;

/**
 * The response headers the first route sets, exactly: no fewer, no others
 * (`REVIEW-059` S-3: two of the five the assembler sets were unchecked). The
 * policy itself is checked directive by directive in check 6.
 */
export const EXPECTED_HEADERS: Record<string, string | null> = {
  "Content-Security-Policy": null,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
  const f: Finding[] = [];
  const add = (check: string, detail: string) => f.push({ check, detail });
  const paths = [...files.keys()].filter((p) => p !== VERDICT);
  const html = new Map(paths.filter((p) => p.endsWith(".html")).map((p) => [p, text(files.get(p)!)]));

  // 1. Inventory and provenance.
  for (const p of paths) if (!ADMITTED.some((re) => re.test(p))) add("inventory", `${p} is not admitted by the provenance rule`);
  for (const p of HOSTED_PAGES) if (!files.has(PAGE_HTML(p))) add("inventory", `the page /${p} is missing`);

  // 2. No source maps.
  for (const p of paths) if (/sourceMappingURL|\.map$/.test(p) || /[#@]\s*sourceMappingURL=/.test(text(files.get(p)!))) add("no-source-maps", `${p} carries or references a source map`);

  // 3. No server code: no function, no middleware, routes to files only.
  for (const p of paths) if (p.startsWith("functions/") || p.includes("/functions/")) add("no-server-code", `${p} is a function`);
  let config: any = null;
  try { config = JSON.parse(text(files.get("config.json") ?? Buffer.from("null"))); } catch { add("no-server-code", "config.json is not JSON"); }
  if (!config || config.version !== 3) add("no-server-code", "config.json is missing or not Build Output API version 3");
  else {
    for (const k of Object.keys(config)) if (k !== "version" && k !== "routes") add("no-server-code", `config.json has a top-level key ${k}`);
    for (const [i, r] of (config.routes ?? []).entries()) {
      for (const k of Object.keys(r)) if (!["src", "dest", "headers", "continue", "handle"].includes(k)) add("no-server-code", `a route has the key ${k}`);
      // ⚠ Every reader of the policy (this gate, the browser check, the live
      // comparison) reads the FIRST route's headers. A later route's headers
      // would be read by none of them, so only the first may set any
      // (`REVIEW-059` S-1).
      if (i > 0 && r.headers !== undefined) add("csp", `route ${i} sets headers; only the first route may, because it is the only one any check reads`);
      if (r.handle !== undefined && r.handle !== "filesystem") add("no-server-code", `a route hands off to ${r.handle}`);
      if (r.dest !== undefined && (typeof r.dest !== "string" || !files.has(`static${r.dest}`))) add("no-server-code", `a route's dest ${JSON.stringify(r.dest)} is not a file in the output`);
    }
  }

  // 4. No socket client, signer path, decryption routine, secret name or build variable.
  const NEEDLES = [...SOCKET_NEEDLES, ...SECRET_NEEDLES, "WebAssembly", ".wasm", "ProjectivePoint", "mptool", "mpt_", "elgamal_", "VITE_", "WCONF_", "eval(", "new Function"];
  for (const p of paths) {
    if (p === "static/third-party-licenses.txt") continue;
    const t = text(files.get(p)!);
    for (const n of NEEDLES) if (t.includes(n)) add("no-socket-secret-or-decryption", `${p} contains ${JSON.stringify(n)}`);
    for (const api of ["new WebSocket", "EventSource(", "sendBeacon", "XMLHttpRequest"]) if (t.includes(api)) add("no-other-connection", `${p} uses ${api}`);
  }

  // 5. Absolute URLs, against the admitted list.
  for (const p of paths) {
    if (p === "static/third-party-licenses.txt") continue;
    for (const m of text(files.get(p)!).matchAll(/\bhttps?:\/\/[A-Za-z0-9.:/#_-]+/g)) {
      const u = m[0].replace(/[.:]+$/, "");
      if (!ADMITTED_URLS.some(([re]) => re.test(u))) add("urls", `${p} names ${u}`);
    }
  }
  // ⚠ A scheme-relative address (`src="//host/x.js"`) has no `https:` for the
  // pattern above to match (`REVIEW-059` R1-2's table). In the pages' own
  // attributes it can only name another host.
  for (const [p, h] of html) for (const m of h.matchAll(/\b(?:src|href|action|srcset|poster)\s*=\s*["']?\s*(\/\/[^"'\s>]+)/gi)) add("urls", `${p} names the scheme-relative ${m[1]}`);

  // 6. The Content Security Policy, as config.json delivers it.
  const first = config?.routes?.[0];
  const csp: string | undefined = first?.src === "/(.*)" && first?.continue === true ? first?.headers?.["Content-Security-Policy"] : undefined;
  if (!csp) add("csp", "the first route does not set a Content-Security-Policy on every path");
  else {
    // ⚠ A browser enforces the FIRST of two directives with one name and
    // ignores the second; a Map keeps the LAST. So `connect-src *;` placed
    // before the real one passed this check while the page permitted a
    // connection anywhere (`REVIEW-059` R1-1, measured). A repeated name, in
    // any case, is refused before anything else is read.
    const parsed = csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v] as const; });
    const seen = new Set<string>();
    for (const [k] of parsed) { if (seen.has(k.toLowerCase())) add("csp", `the directive ${k} appears twice; a browser enforces the first`); seen.add(k.toLowerCase()); }
    const dirs = new Map(parsed);
    const exact: Record<string, string[]> = {
      "default-src": ["'self'"], "style-src": ["'self'"], "img-src": ["'self'"], "font-src": ["'self'"],
      "connect-src": ["'self'"], "object-src": ["'none'"], "base-uri": ["'none'"], "form-action": ["'none'"], "frame-ancestors": ["'none'"],
    };
    for (const [k, v] of Object.entries(exact)) if (JSON.stringify(dirs.get(k) ?? null) !== JSON.stringify(v)) add("csp", `${k} is ${JSON.stringify(dirs.get(k) ?? null)}, not ${v.join(" ")}`);
    for (const k of dirs.keys()) if (!(k in exact) && k !== "script-src") add("csp", `an unexpected directive ${k}`);
    const script = dirs.get("script-src") ?? [];
    if (script[0] !== "'self'") add("csp", "script-src does not start with 'self'");
    const allowed = new Set(script.slice(1));
    for (const tok of allowed) if (!/^'sha256-[A-Za-z0-9+/]+=*'$/.test(tok)) add("csp", `script-src admits ${tok}`);
    const needed = new Set([...html.values()].flatMap((h) => inlineScripts(h).map(scriptHash)));
    for (const h of needed) if (!allowed.has(h)) add("csp", `an inline script's hash ${h} is not admitted, so the page would not run`);
    for (const h of allowed) if (!needed.has(h)) add("csp", `script-src admits ${h}, which no page carries`);
    const names = Object.keys(first.headers ?? {});
    for (const n of names) if (!(n in EXPECTED_HEADERS)) add("csp", `the first route sets ${n}, which is not one of the expected headers`);
    const lower = names.map((n) => n.toLowerCase());
    if (new Set(lower).size !== lower.length) add("csp", "the first route sets one header name twice in different case");
    for (const [h, v] of Object.entries(EXPECTED_HEADERS)) if (v !== null && first.headers?.[h] !== v) add("csp", `${h} is not ${v}`);
  }
  for (const [p, h] of html) if (/\sstyle="|<style[\s>]/.test(h)) add("csp", `${p} carries inline style, which style-src 'self' refuses`);

  // 7. No input that asks a visitor for anything.
  for (const [p, h] of html) if (FORMS.test(h)) add("no-inputs", `${p} renders a form control`);

  // 8. Every ledger page renders the wording, the network check and the index,
  //    and no other page renders a ledger value.
  const indices = new Set<string>();
  const ledgerHtml = new Set(LEDGER_PAGES.map((lp) => PAGE_HTML(lp)));
  for (const lp of ledgerHtml) if (html.has(lp) && !html.get(lp)!.includes("data-ledger-value")) add("ledger-wording", `${lp} is a ledger page and marks no ledger value`);
  for (const [p, h] of html) {
    if (ledgerHtml.has(p)) continue;
    if (h.includes("data-ledger-value")) add("ledger-wording", `${p} marks a ledger value and is not one of the named ledger pages`);
    if (CIPHERTEXT.test(h)) add("ledger-wording", `${p} carries a ciphertext and is not one of the named ledger pages`);
    for (const a of DEMO_ACCOUNTS) if (h.includes(a.address)) add("ledger-wording", `${p} names the demo account ${a.address} and is not one of the named ledger pages`);
  }
  for (const [p, h] of html) {
    if (!ledgerHtml.has(p)) continue;
    const plain = decodeEntities(h);
    for (const para of DH2_WORDING) if (!plain.includes(para)) add("ledger-wording", `${p} renders a ledger value without the D-H2 sentence beginning ${JSON.stringify(para.slice(0, 40))}`);
    if (!h.includes(`data-network-id="${DEVNET_NETWORK_ID}"`)) add("ledger-wording", `${p} renders a ledger value without the Devnet network check`);
    const idx = h.match(/data-ledger-index="(\d+)"/);
    if (!idx) add("ledger-wording", `${p} renders a ledger value without the ledger index`);
    else indices.add(idx[1]);
  }
  if (indices.size > 1) add("ledger-wording", `pages name different ledgers: ${[...indices].join(", ")}`);
  for (const [p, label] of [["static/observer/index.html", "Observer view: "], ["static/issuer/index.html", "Issuer&#x27;s copy: "]] as const) {
    const n = (html.get(p) ?? "").split(label).length - 1;
    if (html.has(p) && n !== DEMO_ACCOUNTS.length) add("accounts", `${p} renders ${n} account panels, not ${DEMO_ACCOUNTS.length}`);
  }

  // 9. The commit and the verdict, on every page.
  for (const [p, h] of html) {
    if (!h.includes(`/commit/${want.commit}`)) add("commit-and-verdict", `${p} does not name commit ${want.commit}`);
    if (!h.includes(`<code>${want.commit.slice(0, 12)}</code>`)) add("commit-and-verdict", `${p} does not show commit ${want.commit.slice(0, 12)} as its link text`);
    if (!h.includes("data-gate-verdict")) add("commit-and-verdict", `${p} has no gate-verdict slot`);
  }

  // 10. Licence notices for what is bundled, and nothing that should never be.
  const lic = files.get("static/third-party-licenses.txt");
  if (!lic) add("licences", "static/third-party-licenses.txt is missing");
  else {
    // Separator, `name@version (licence)`, separator, licence text: split on the
    // separator lines, so each header is followed by its own body.
    const parts = text(lic).split(/^={20,}$/m);
    // ⚠ The text before the first notice, and any part after the last one,
    // were read by no check (`REVIEW-059` S-4). The first must be the build's
    // fixed header; there must be no second.
    if (parts[0].trim() !== LICENCE_FILE_HEADER.join("\n").trim()) add("licences", "the text before the first notice is not the build's fixed header");
    if (parts.length % 2 === 0) add("licences", "the file has text after its last notice");
    const names: [string, string, string][] = [];
    for (let i = 1; i + 1 < parts.length; i += 2) {
      const head = parts[i].trim().match(/^((?:@[^/\s]+\/)?[^@\s]+)@\S+ \([^)]*\)$/);
      if (!head) { add("licences", `an entry header is malformed: ${JSON.stringify(parts[i].trim().slice(0, 60))}`); continue; }
      names.push([head[0], head[1], parts[i + 1]]);
    }
    // Each notice must be the package's own licence file with only its email
    // addresses removed (E-335), read from this checkout's node_modules at the
    // same version. A version this checkout does not hold cannot be verified.
    for (const [header, name, body] of names) {
      const root = join(REPO, "node_modules", name);
      const version = header.slice(name.length + 1, header.indexOf(" "));
      const have = existsSync(join(root, "package.json")) ? JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version : null;
      if (have !== version) { add("licences", `${name}@${version} cannot be verified: this checkout's node_modules holds ${have ?? "nothing"}`); continue; }
      if (shippedNotice(root) !== body.trim()) add("licences", `${name}'s notice is not its own licence file with only email addresses removed`);
    }
    if (names.length === 0) add("licences", "the licence file lists no package");
    for (const [, name, body] of names) {
      if (!ADMITTED_PACKAGES.has(name)) add("licences", `the bundle contains ${name}, which is not admitted`);
      if (body.trim().length < 100) add("licences", `${name}'s licence text is missing or truncated`);
    }
    // ⚠ Only React and React DOM were required, so deleting seroval's whole
    // entry passed (`REVIEW-059` R1-4). The listed set must equal the admitted
    // set: a package the framework stops bundling is removed here in review,
    // as one it starts bundling is added.
    for (const must of ADMITTED_PACKAGES) if (!names.some((m) => m[1] === must)) add("licences", `${must} is admitted and not listed, so a bundled package may be shipped without its notice`);
  }
  return f;
}

// ------------------------------------------------------------------ the secret scan

/** `check-no-secrets --dir`, with the local store. Its verdict line is required. */
export function secretScan(root: string): { ok: boolean; line: string } {
  const r = Bun.spawnSync(["bun", "run", join(REPO, "tools/check-no-secrets.ts"), "--dir", join(root, ".vercel", "output")], { stdout: "pipe", stderr: "pipe" });
  const lines = r.stdout.toString().trim().split("\n");
  const last = lines[lines.length - 1] ?? "";
  return { ok: last === "check-no-secrets: verdict=PASS exit=0" && r.exitCode === 0, line: last };
}

// ------------------------------------------------------------------ controls

type Mutate = (dir: string) => void;
const out = (dir: string, p: string) => join(dir, ".vercel", "output", p);
const edit = (dir: string, p: string, fn: (s: string) => string) => writeFileSync(out(dir, p), fn(readFileSync(out(dir, p), "utf8")));
const firstJs = (dir: string) => "static/assets/" + readdirSync(out(dir, "static/assets")).find((n) => n.endsWith(".js"))!;
const editConfig = (dir: string, fn: (c: any) => void) => edit(dir, "config.json", (s) => { const c = JSON.parse(s); fn(c); return JSON.stringify(c); });

const LIC = "static/third-party-licenses.txt";
const csp = (d: string, fn: (p: string) => string) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = fn(c.routes[0].headers["Content-Security-Policy"])));
const WEAK_POLICY = "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *";

/**
 * Each control: what it breaks, the check that must fire and, where a check
 * has several reasons to fire, the words its finding must contain. ⚠ Without
 * the last, a control can pass on a finding next to the one it is named for:
 * the cryptography-package control fired because its fabricated notice did not
 * match a licence file, and kept passing with the admission rule deleted
 * (`REVIEW-059` R1-3).
 */
export const CONTROLS: [string, string, Mutate, string?][] = [
  ["a stray file", "inventory", (d) => writeFileSync(out(d, "static/notes.txt"), "x")],
  ["a source map", "inventory", (d) => writeFileSync(out(d, "static/assets/app.js.map"), "{}")],
  ["a sourceMappingURL comment", "no-source-maps", (d) => edit(d, firstJs(d), (s) => s + "\n//# sourceMappingURL=app.js.map\n")],
  ["a missing page", "inventory", (d) => rmSync(out(d, "static/issuer/index.html"))],
  ["a serverless function", "no-server-code", (d) => { const p = out(d, "functions/api.func"); mkdirSync(p, { recursive: true }); writeFileSync(join(p, ".vc-config.json"), "{}"); }],
  ["middleware in config.json", "no-server-code", (d) => editConfig(d, (c) => c.routes.unshift({ src: "/(.*)", middlewarePath: "_middleware" }))],
  ["a rewrite to another host", "no-server-code", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/x", dest: "https://example.com/x" }))],
  ["a top-level overrides key", "no-server-code", (d) => editConfig(d, (c) => (c.overrides = {}))],
  ["the signer socket path in a script", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ';const p="/run/wconf/signer.sock";')],
  ["a WebAssembly module", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ";WebAssembly.instantiate(x);")],
  ["a build variable inlined", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ';const v="VITE_WCONF_WEB_PORT";')],
  ["a WebSocket", "no-other-connection", (d) => edit(d, firstJs(d), (s) => s + ';new WebSocket("wss://x");')],
  ["a third-party URL", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<a href="https://analytics.example.net/x">x</a></body>'))],
  ["'unsafe-inline' in script-src", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")))],
  ["a widened connect-src", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("connect-src 'self'", "connect-src 'self' https://s.devnet.rippletest.net:51234")))],
  ["an inline script the policy does not admit", "csp", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", "<script>window.x=1</script></body>"))],
  ["no policy at all", "csp", (d) => editConfig(d, (c) => delete c.routes[0].headers["Content-Security-Policy"])],
  // ⚠ The first build hashed the file's bytes; the browser hashes the parsed
  // text, refused every page's hydration script, and this gate had passed it.
  ["a script carrying NUL, admitted by its RAW hash", "csp", (d) => {
    const raw = "window.y='\u0000'";
    edit(d, "static/index.html", (s) => s.replace("</body>", `<script>${raw}</script></body>`));
    const rawHash = `'sha256-${createHash("sha256").update(raw, "utf8").digest("base64")}'`;
    editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("script-src 'self'", `script-src 'self' ${rawHash}`)));
  }],
  ["an inline style attribute", "csp", (d) => edit(d, "static/index.html", (s) => s.replace("<body>", '<body><div style="color:red">x</div>'))],
  ["an input asking for a seed", "no-inputs", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<input name="seed"></body>'))],
  ["the D-H2 wording removed from the observer page", "ledger-wording", (d) => edit(d, "static/observer/index.html", (s) => s.replace(/Vercel, which hosts this page/g, "This host"))],
  ["the network check changed", "ledger-wording", (d) => edit(d, "static/issuer/index.html", (s) => s.replace(`data-network-id="${DEVNET_NETWORK_ID}"`, 'data-network-id="0"'))],
  ["an account panel dropped", "accounts", (d) => edit(d, "static/observer/index.html", (s) => s.replace("Observer view: ", "Observed: "))],
  ["another commit on one page", "commit-and-verdict", (d) => edit(d, "static/wallet/index.html", (s) => s.replace(/\/commit\/[0-9a-f]{40}/g, "/commit/" + "0".repeat(40)))],
  // The package's AUTHENTIC notice, at the version this checkout holds, so the
  // only reason left to refuse it is that it is not admitted.
  ["a cryptography package bundled, with its real notice", "licences", (d) => {
    const root = join(REPO, "node_modules", "@noble/curves");
    const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
    edit(d, LIC, (s) => s + "=".repeat(78) + `\n@noble/curves@${version} (MIT)\n` + "=".repeat(78) + "\n" + shippedNotice(root) + "\n");
  }, "which is not admitted"],
  ["seroval's whole entry removed", "licences", (d) => edit(d, LIC, (s) => s.replace(/={78}\nseroval@[^\n]*\n={78}\n[\s\S]*?(?=={78}\n)/, "")), "admitted and not listed"],
  ["text before the first notice changed", "licences", (d) => edit(d, LIC, (s) => "Extra line.\n" + s), "fixed header"],
  ["text after the last notice", "licences", (d) => edit(d, LIC, (s) => s + "=".repeat(78) + "\nan unpaired part\n"), "after its last notice"],
  ["a duplicate connect-src placed first", "csp", (d) => csp(d, (p) => "connect-src *; " + p), "appears twice"],
  ["a later catch-all route replacing the policy", "csp", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/(.*)", headers: { "Content-Security-Policy": WEAK_POLICY }, continue: true })), "only the first route"],
  ["a path route replacing the policy for /issuer", "csp", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/issuer(/.*)?", headers: { "Content-Security-Policy": WEAK_POLICY }, continue: true })), "only the first route"],
  ["Permissions-Policy removed", "csp", (d) => editConfig(d, (c) => delete c.routes[0].headers["Permissions-Policy"]), "Permissions-Policy is not"],
  ["an extra header on the first route", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Access-Control-Allow-Origin"] = "*")), "not one of the expected headers"],
  ["the policy's name repeated in lower case", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["content-security-policy"] = WEAK_POLICY)), "twice in different case"],
  ["a scheme-relative script", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<script src="//cdn.example.net/a.js"></script></body>')), "scheme-relative"],
  ["the ledger marker and the wording removed together", "ledger-wording", (d) => edit(d, "static/observer/index.html", (s) => s.replaceAll('data-ledger-value=""', "").replace(/Vercel, which hosts this page/g, "This host")), "marks no ledger value"],
  ["a ciphertext on a page that is not a ledger page", "ledger-wording", (d) => edit(d, "static/wallet/index.html", (s) => s.replace("</body>", `<p>${"0A".repeat(66)}</p></body>`)), "carries a ciphertext"],
  ["a demo address on the overview", "ledger-wording", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", `<p>${DEMO_ACCOUNTS[0].address}</p></body>`)), "names the demo account"],
  ["the commit's link text changed", "commit-and-verdict", (d) => edit(d, "static/custody/index.html", (s) => s.replace(/<code>[0-9a-f]{12}<\/code>/, "<code>000000000000</code>")), "link text"],
  ["the licence file removed", "licences", (d) => rmSync(out(d, "static/third-party-licenses.txt"))],
  ["a licence notice altered", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => s.replace("Permission is hereby granted", "Permission is granted"))],
  // ⚠ The LAST marker: the first is the file's header line explaining it, and
  // restoring that one changes no notice, so this control first tested nothing.
  ["a personal email restored to a notice", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => {
    const at = s.lastIndexOf(EMAIL_MARKER);
    return at < 0 ? s : s.slice(0, at) + "someone@example.org" + s.slice(at + EMAIL_MARKER.length);
  })],
];

export function runControls(root: string, want: Expect): { run: number; failed: string[] } {
  const failed: string[] = [];
  let run = 0;
  const fresh = () => { const d = mkdtempSync(join(tmpdir(), "check-web-hosted-")); cpSync(join(root, ".vercel"), join(d, ".vercel"), { recursive: true }); return d; };
  const dirs: string[] = [];
  try {
    const clean = fresh(); dirs.push(clean);
    run++;
    const base = runChecks(readOutput(clean), want);
    if (base.length) failed.push(`the unbroken copy must pass, and has ${base.length} finding(s): ${base[0].check}: ${base[0].detail}`);
    for (const [name, check, mutate, detail] of CONTROLS) {
      const d = fresh(); dirs.push(d);
      run++;
      mutate(d);
      const got = runChecks(readOutput(d), want);
      if (!got.some((x) => x.check === check && (!detail || x.detail.includes(detail)))) failed.push(`${name}: expected a '${check}' finding${detail ? ` saying "${detail}"` : ""}, got ${got.length ? got.map((x) => `${x.check}: ${x.detail}`).join(" | ") : "none"}`);
    }
    // The secret scan, through the same function the real check calls.
    const d = fresh(); dirs.push(d);
    run++;
    edit(d, firstJs(d), (s) => s + `;const s="${plantedSeed()}";`);
    if (secretScan(d).ok) failed.push("a seed planted in a script: check-no-secrets --dir passed it");
  } finally {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
  return { run, failed };
}

/** A real-entropy ed25519 seed, made at run time so this file holds none. */
function plantedSeed(): string {
  return encodeSeed(randomBytes(16), "ed25519");
}

// ------------------------------------------------------------------ disclosure

export function whatThisDoesNotCheck(): string[] {
  return [
    "1. EGRESS. It reads files; what a visitor's browser sends is not in them. The policy's connect-src 'self' is checked as written, not as a browser enforces it.",
    "2. The SERVED bytes and headers. It checks the output before upload; step 7 of web/hosted/README.md compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.",
    "3. The BUILD MACHINE. An inventory of the output cannot show that the build never read a private store, or that every file came from the named commit; the isolated build and its tree check are what address that.",
    "4. Whether the PROSE is true. Wording is claims-check's and the wording tests' question; this gate checks that the ruled D-H2 sentences are present, not that every other sentence is right.",
    "5. Anything a script asks a visitor for after hydration, by a form control or a dialog such as prompt(). The check reads the prerendered HTML; React's DOM code names input elements internally, so the bundle cannot be read for them.",
    "6. A decryption routine under a name it does not list. It forbids WebAssembly, the named mpt-crypto and ElGamal identifiers and any cryptography package in the licence list, which is a named set.",
    "7. A package inlined without its module path. The licence list is collected from the module graph the build reported, and the gate requires that list to equal the admitted set.",
    "8. A ledger value on a page outside /observer and /issuer is found only if it is a ciphertext, a demo account address or a marked value; a figure written as prose is not.",
    "9. NO ISSUER FIGURE (D-H3) is held by the build, not by this gate: the build container holds no key, so no figure can be computed, and one could enter the pages only as text in a public commit.",
  ];
}

// ------------------------------------------------------------------ main

export function verdictFile(files: Map<string, Buffer>, want: Expect, controls: number) {
  const entries = [...files].filter(([p]) => p !== VERDICT).sort(([a], [b]) => a.localeCompare(b));
  const perFile = Object.fromEntries(entries.map(([p, b]) => [p, sha256(b)]));
  return {
    verdict: "PASS",
    gate: "check-web-readonly --hosted (tools/check-web-hosted.ts)",
    checkedAt: new Date().toISOString(),
    commit: want.commit,
    controls,
    files: entries.length,
    outputDigest: sha256(entries.map(([p, b]) => `${p}\t${sha256(b)}`).join("\n")),
    perFile,
    doesNotCheck: whatThisDoesNotCheck(),
  };
}

export async function runHosted(argv: string[]): Promise<number> {
  const finish = (word: string, exit: number) => { console.log(`check-web-hosted: verdict=${word} exit=${exit}`); return exit; };
  try {
    const at = argv.indexOf("--hosted"), ct = argv.indexOf("--commit");
    const root = argv[at + 1], commit = argv[ct + 1];
    if (!root || root.startsWith("--")) throw new Error("--hosted needs the output root, the directory that holds .vercel/output");
    if (!commit || !/^[0-9a-f]{40}$/.test(commit)) throw new Error("--commit needs the full public commit id the build ran from");
    const want = { commit };
    console.log(`check-web-hosted over ${join(root, ".vercel/output")}, expecting commit ${commit}`);

    const c = runControls(root, want);
    console.log(`controls: ${c.run - c.failed.length}/${c.run} passed, each through the same runChecks() and secretScan() as the real check`);
    if (c.failed.length) { for (const x of c.failed) console.log(`  CONTROL FAILED: ${x}`); return finish("CONTROL-FAILED", 2); }

    const files = readOutput(root);
    const findings = runChecks(files, want);
    const secrets = secretScan(root);
    if (!secrets.ok) findings.push({ check: "secrets", detail: `check-no-secrets --dir: ${secrets.line}` });
    console.log(`scanned: ${[...files.keys()].filter((p) => p !== VERDICT).length} file(s); secret sweep: ${secrets.line}`);
    console.log("\nWhat this gate does NOT check:");
    for (const l of whatThisDoesNotCheck()) console.log(`  ${l}`);
    if (findings.length) {
      console.log(`\nFAILING: ${findings.length}`);
      for (const x of findings) console.log(`  ${x.check}: ${x.detail}`);
      return finish("FAIL", 1);
    }
    const v = verdictFile(files, want, c.run);
    writeFileSync(join(root, ".vercel/output", VERDICT), JSON.stringify(v, null, 2) + "\n");
    console.log(`\nwrote ${VERDICT}: ${v.files} files, output digest ${v.outputDigest}`);
    return finish("PASS", 0);
  } catch (e) {
    console.log(`REFUSED: ${String(e)}`);
    return finish("REFUSED", 2);
  }
}

if (import.meta.main) process.exit(await runHosted(process.argv.slice(2)));

````


## FILE: web/hosted/browser-check.ts, after the fixes (complete)

````typescript
/**
 * The hosted demo in a real browser, under its real policy: `ADR-0004` step 4.
 *
 *   bun run web/hosted/browser-check.ts <output root>
 *
 * Serves `<output root>/.vercel/output` the way its `config.json` says (every
 * response carries the first route's headers, the page routes rewrite to their
 * `index.html`, everything else is a file or a 404), opens each page in a
 * headless Chrome with a fresh profile, and FAILS on:
 *
 *   - any Content Security Policy violation, which is how a hash the gate
 *     computed and a script the browser runs would disagree;
 *   - any request to anything but the page's own origin;
 *   - any uncaught exception, or any console error other than the expected
 *     404 for a missing verdict file, whether the browser logged it or the
 *     page's own script did (`console.error`), on every page AND after the
 *     final client-side navigation (`REVIEW-059` R1-5: both were missed);
 *   - a ledger page whose rendered text, which a stylesheet that hides an
 *     element removes, does not carry the D-H2 wording (`REVIEW-059` R1-2);
 *   - a page whose script never ran, read from the footer's verdict slot,
 *     which only the page's own script changes;
 *   - a client-side navigation that loads a new document or does not render.
 *
 * ⚠ **This observes ONE browser on ONE run.** It is evidence about what the
 * pages request, not a proof about every browser, and it says nothing about
 * what the host adds after upload (`ADR-0004`; the gate's own "does not check"
 * list, items 1 and 2).
 */

import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOSTED_PAGES } from "./pages.ts";
import { LEDGER_PAGES } from "../../tools/check-web-hosted.ts";
import { DH2_WORDING } from "../app/src/hosted/wording.ts";

const CHROME = process.env.WCONF_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8",
  json: "application/json", txt: "text/plain; charset=utf-8",
};

/** A local stand-in for the host, from the output's own config.json. */
export function serveOutput(root: string) {
  const base = join(root, ".vercel", "output");
  const config = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
  // ⚠ This server models one shape: headers on the first route only, file
  // rewrites, and the filesystem. A configuration outside it would be served
  // as if it were that shape, so it is refused instead (`REVIEW-059` R1-5).
  for (const [i, r] of (config.routes ?? []).entries()) {
    const keys = Object.keys(r).filter((k) => !["src", "dest", "headers", "continue", "handle"].includes(k));
    if (keys.length || (i > 0 && r.headers !== undefined) || (r.handle !== undefined && r.handle !== "filesystem")) {
      throw new Error(`browser-check cannot model route ${i} (${JSON.stringify(r).slice(0, 120)}); the gate refuses it too`);
    }
  }
  const headers: Record<string, string> = config.routes[0].headers;
  const rewrites: [RegExp, string][] = config.routes.filter((r: any) => r.dest).map((r: any) => [new RegExp(r.src), r.dest]);
  return Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      let path = new URL(req.url).pathname;
      for (const [re, dest] of rewrites) if (re.test(path)) { path = dest; break; }
      if (path === "/") path = "/index.html";
      const file = join(base, "static", path);
      if (!file.startsWith(join(base, "static")) || !existsSync(file) || !statSync(file).isFile()) return new Response("not found", { status: 404, headers });
      const ext = file.slice(file.lastIndexOf(".") + 1);
      return new Response(Bun.file(file), { headers: { ...headers, "Content-Type": TYPES[ext] ?? "application/octet-stream" } });
    },
  });
}

/** A minimal DevTools-protocol client over one WebSocket. */
class Cdp {
  private id = 0;
  private waiting = new Map<number, (v: any) => void>();
  readonly events: { method: string; params: any; sessionId?: string }[] = [];
  private constructor(private ws: WebSocket) {
    ws.onmessage = (m) => {
      const msg = JSON.parse(String(m.data));
      if (msg.id !== undefined) this.waiting.get(msg.id)?.(msg);
      else this.events.push(msg);
    };
  }
  static async connect(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
    return new Cdp(ws);
  }
  async send(method: string, params: any = {}, sessionId?: string): Promise<any> {
    const id = ++this.id;
    const reply = new Promise<any>((ok) => this.waiting.set(id, ok));
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    const r = await reply;
    if (r.error) throw new Error(`${method}: ${JSON.stringify(r.error)}`);
    return r.result;
  }
  close() { this.ws.close(); }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function browserCheck(root: string): Promise<{ problems: string[]; pages: number; requests: number; footer: string | null }> {
  const server = serveOutput(root);
  const origin = `http://127.0.0.1:${server.port}`;
  const profile = mkdtempSync(join(tmpdir(), "wconf-browser-check-"));
  const chrome = Bun.spawn([CHROME, "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking",
    "--disable-component-update", "--disable-sync", "about:blank"], { stdout: "ignore", stderr: "ignore" });
  const problems: string[] = [];
  let requests = 0;
  let footer: string | null = null;
  try {
    let port = "";
    for (let i = 0; i < 100 && !port; i++) {
      const f = join(profile, "DevToolsActivePort");
      if (existsSync(f)) port = readFileSync(f, "utf8").split("\n")[0];
      else await sleep(100);
    }
    if (!port) throw new Error("Chrome did not open a DevTools port");
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const cdp = await Cdp.connect(version.webSocketDebuggerUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const s = (m: string, p: any = {}) => cdp.send(m, p, sessionId);
    for (const d of ["Page", "Network", "Runtime", "Log"]) await s(`${d}.enable`);
    // Runs before the page's own scripts, and is not itself subject to the page's policy.
    await s("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.__violations=[];document.addEventListener('securitypolicyviolation',e=>window.__violations.push(e.violatedDirective+' '+e.blockedURI));",
    });
    const evalJs = async (expr: string) => (await s("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

    /** Every check over one interval of events, the same for a page load and for the client navigation. */
    const inspect = async (label: string, ev: typeof cdp.events) => {
      for (const e of ev.filter((e) => e.method === "Network.requestWillBeSent")) {
        requests++;
        const u = e.params.request.url as string;
        if (!u.startsWith(origin + "/")) problems.push(`${label}: a request to ${u}`);
      }
      const violations = await evalJs("window.__violations.splice(0)");
      for (const v of violations ?? []) problems.push(`${label}: CSP violation ${v}`);
      for (const e of ev.filter((e) => e.method === "Runtime.exceptionThrown")) problems.push(`${label}: exception ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`);
      for (const e of ev.filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")) {
        const t: string = e.params.entry.text ?? "";
        // Two same-origin 404s are expected: the verdict file before the gate
        // has written it, and the favicon a browser asks for unprompted.
        if (!(/404/.test(t) && /\/(gate-verdict\.json|favicon\.ico)$/.test(e.params.entry.url ?? ""))) problems.push(`${label}: console error ${t} (${e.params.entry.url ?? "no url"})`);
      }
      // ⚠ `Log.entryAdded` carries what the BROWSER logs; a page's own
      // `console.error` arrives only as `Runtime.consoleAPICalled`.
      for (const e of ev.filter((e) => e.method === "Runtime.consoleAPICalled" && ["error", "assert"].includes(e.params.type))) {
        problems.push(`${label}: console.${e.params.type} ${(e.params.args ?? []).map((a: any) => a.value ?? a.description ?? "").join(" ")}`);
      }
    };
    const squash = (t: string) => t.replace(/\s+/g, " ").trim();

    for (const page of HOSTED_PAGES) {
      const before = cdp.events.length;
      await s("Page.navigate", { url: `${origin}/${page}` });
      for (let i = 0; i < 50; i++) { if (cdp.events.slice(before).some((e) => e.method === "Page.loadEventFired")) break; await sleep(100); }
      await sleep(1200);
      await inspect(`/${page}`, cdp.events.slice(before));
      if ((LEDGER_PAGES as readonly string[]).includes(page)) {
        const shown = squash(await evalJs("document.body.innerText"));
        for (const para of DH2_WORDING) if (!shown.includes(squash(para))) problems.push(`/${page}: the D-H2 sentence beginning ${JSON.stringify(para.slice(0, 40))} is not in the rendered text`);
      }
      const slot = await evalJs("document.querySelector('[data-gate-verdict]')?.textContent ?? null");
      if (page === "") footer = slot;
      // With a verdict file beside the pages, the footer must show the pass it records.
      if (slot !== null && existsSync(join(root, ".vercel/output/static/gate-verdict.json")) && !/^PASS, /.test(slot)) problems.push(`/${page}: a verdict file exists and the footer shows ${JSON.stringify(slot)}`);
      if (slot === null) problems.push(`/${page}: no gate-verdict slot`);
      else if (/^not loaded/.test(slot)) problems.push(`/${page}: the page's script never ran (the verdict slot still reads ${JSON.stringify(slot)})`);
    }

    // Client-side navigation: one link, no new document, the target renders,
    // and the interval after the click passes every check a page load does.
    await s("Page.navigate", { url: `${origin}/` });
    await sleep(1500);
    await evalJs("window.__violations.splice(0)");
    const docsBefore = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
    const clickedAt = cdp.events.length;
    await evalJs("document.querySelector('a[href=\"/observer\"]').click()");
    await sleep(1200);
    await inspect("client navigation to /observer", cdp.events.slice(clickedAt));
    const docsAfter = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
    const path = await evalJs("location.pathname");
    const rendered = await evalJs("document.body.innerText.includes('Observer view: ')");
    if (path !== "/observer" || !rendered) problems.push(`client navigation to /observer did not render (path ${path}, rendered ${rendered})`);
    if (docsAfter !== docsBefore) problems.push("client navigation loaded a new document; the router did not hydrate");
    cdp.close();
  } finally {
    chrome.kill();
    server.stop(true);
    rmSync(profile, { recursive: true, force: true });
  }
  return { problems, pages: HOSTED_PAGES.length, requests, footer };
}

/**
 * The check's own controls, each a broken copy of a good output run through the
 * same `browserCheck()`. ⚠ The other-origin control removes the policy from its
 * copy, because with the policy in place the browser blocks the request and the
 * violation detector fires instead; this control is for the request detector.
 */
export async function selfTest(root: string): Promise<string[]> {
  const failed: string[] = [];
  const copy = () => { const d = mkdtempSync(join(tmpdir(), "wconf-browser-self-test-")); cpSync(join(root, ".vercel"), join(d, ".vercel"), { recursive: true }); return d; };
  const dirs: string[] = [];
  const elsewhere = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("x") });
  try {
    const good = copy(); dirs.push(good);
    const g = await browserCheck(good);
    if (g.problems.length) failed.push(`the unbroken copy must pass, and reported: ${g.problems[0]}`);

    const other = copy(); dirs.push(other);
    const cfg = join(other, ".vercel/output/config.json");
    const c = JSON.parse(readFileSync(cfg, "utf8"));
    delete c.routes[0].headers["Content-Security-Policy"];
    writeFileSync(cfg, JSON.stringify(c));
    const idx = join(other, ".vercel/output/static/index.html");
    writeFileSync(idx, readFileSync(idx, "utf8").replace("</body>", `<img src="http://127.0.0.1:${elsewhere.port}/pixel.png"></body>`));
    if (!(await browserCheck(other)).problems.some((p) => p.includes(`a request to http://127.0.0.1:${elsewhere.port}/`))) failed.push("a request to another origin was not reported");

    // ⚠ The three cases `REVIEW-059` found passing: a page's own console
    // error, an exception after the client navigation, and the D-H2 wording
    // present in the HTML but hidden by the stylesheet.
    const asset = (d: string, re: RegExp) => join(d, ".vercel/output/static/assets", readdirSync(join(d, ".vercel/output/static/assets")).find((n) => re.test(n))!);
    const logs = copy(); dirs.push(logs);
    const v1 = asset(logs, /^Verdict-.*\.js$/);
    writeFileSync(v1, readFileSync(v1, "utf8") + '\nconsole.error("BROWSER_CHECK_CONTROL");\n');
    if (!(await browserCheck(logs)).problems.some((p) => p.includes("console.error BROWSER_CHECK_CONTROL"))) failed.push("a page's own console.error was not reported");
    const nav = copy(); dirs.push(nav);
    const v2 = asset(nav, /^Verdict-.*\.js$/);
    writeFileSync(v2, readFileSync(v2, "utf8") + "\ndocument.addEventListener('click',e=>{if(e.target.closest('a[href=\"/observer\"]'))setTimeout(()=>{throw Error('BROWSER_CHECK_NAV')},0)});\n");
    if (!(await browserCheck(nav)).problems.some((p) => p.startsWith("client navigation to /observer: exception") && p.includes("BROWSER_CHECK_NAV"))) failed.push("an exception after the client navigation was not reported");
    const hidden = copy(); dirs.push(hidden);
    const css = asset(hidden, /\.css$/);
    writeFileSync(css, readFileSync(css, "utf8") + "\n[data-dh2-wording]{display:none}\n");
    if (!(await browserCheck(hidden)).problems.some((p) => p.startsWith("/observer: the D-H2 sentence"))) failed.push("D-H2 wording hidden by the stylesheet was not reported");

    const dead = copy(); dirs.push(dead);
    const wal = join(dead, ".vercel/output/static/wallet/index.html");
    writeFileSync(wal, readFileSync(wal, "utf8").replace(/<script type="module"[^>]*><\/script>/, ""));
    if (!(await browserCheck(dead)).problems.some((p) => p.startsWith("/wallet: the page's script never ran"))) failed.push("a page whose script never ran was not reported");
  } finally {
    elsewhere.stop(true);
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
  return failed;
}

if (import.meta.main) {
  if (process.argv[2] === "--self-test") {
    const failed = await selfTest(process.argv[3] ?? "");
    for (const f of failed) console.log(`  CONTROL FAILED: ${f}`);
    console.log(`browser-check self-test: verdict=${failed.length ? "CONTROL-FAILED" : "PASS"} exit=${failed.length ? 2 : 0}`);
    process.exit(failed.length ? 2 : 0);
  }
  const root = process.argv[2];
  if (!root) throw new Error("usage: bun run web/hosted/browser-check.ts <output root>");
  const r = await browserCheck(root);
  console.log(`browser-check: ${r.pages} pages, ${r.requests} requests observed, all to the page's own origin unless listed below`);
  console.log(`  the overview's footer shows: ${r.footer}`);
  for (const p of r.problems) console.log(`  PROBLEM: ${p}`);
  console.log(`browser-check: verdict=${r.problems.length ? "FAIL" : "PASS"} exit=${r.problems.length ? 1 : 0}`);
  process.exit(r.problems.length ? 1 : 0);
}

````


## FILE: web/hosted/build.ts, after the fixes (complete)

````typescript
/**
 * The hosted demo's isolated build: `ADR-0004` D-H1 (H3), with the owner's two
 * sub-choices, ruled 2026-10-19 (`CLAIMS.md` E-331): an indefinite snapshot
 * rebuilt by hand, and an ISOLATED build machine.
 *
 *   bun run web/hosted/build.ts --repo <git repo> --commit <sha> \
 *     --canonical-url https://<name>.vercel.app --out <dir outside any repo>
 *
 * # What isolation means here
 *
 * Installing dependencies and building run third-party code with the build
 * user's file access (`ADR-0004`, the build machine). This script therefore
 * runs both inside a container that sees ONE directory: a `git archive` of the
 * named commit. Neither private store (`~/.wconf`, `/tmp/wconf`) is mounted, the
 * container checks that neither exists before it installs anything, and no
 * deployment token exists anywhere in it: D-H4's token comes in for the upload
 * only, after this script and the gate have finished.
 *
 * ⚠ **What it is isolated FROM is files, and the network only in part.**
 * Measured 2026-10-20 (`REVIEW-059` S-2): an OrbStack container with network
 * reaches a service bound to the build machine's `127.0.0.1` through
 * `host.docker.internal`. So the work runs in TWO containers. The first
 * installs and takes the snapshot, which need the network; the second runs
 * Vite and the assembler with `--network none`, so the third-party code in the
 * build proper reaches nothing. ⚠ Code that runs during install or the snapshot
 * still has the network and can reach the build machine's loopback services.
 *
 * ⚠ **The environment is an allowlist.** The container receives only the
 * variables named below, plus two CANARIES: random values under the `VITE_` and
 * `WCONF_` prefixes. `REVIEW-058` M11 saw a `VITE_` variable inlined into the
 * bundle; if either canary's value appears VERBATIM anywhere in the output, the
 * build fails. ⚠ That is all it proves: an encoded copy, or a variable sent
 * over the network during install, is not seen (`REVIEW-059` R1-11).
 *
 * ⚠ **It builds a COMMIT, never a working tree.** What the footer names is what
 * was built. `--worktree` exists for local trials only: it copies the working
 * tree, names `HEAD` in the footer, and marks the manifest `trial`, which
 * `deploy-preflight.ts` refuses.
 *
 * ⚠ **And the tree it builds is checked against the commit, file for file.**
 * `REVIEW-059` R1-10, measured with a real build: a file left in a reused
 * `--out` survived the extraction and reached the output of a build whose
 * footer named a commit that does not contain it. So `--out` must be new or
 * empty, the workspace is removed even when a build fails, and the exported
 * tree must list exactly the commit's files before any container runs. ⚠ It
 * does not see dependency code changing `/src` DURING the build.
 */

import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { RISK_ACCEPTANCE_PHRASE } from "../../facility/src/loopback.ts";

/**
 * The build image: `web/hosted/Dockerfile`, whose two bases are pinned by
 * digest. Tagged by the Dockerfile's own hash, so an edit makes a new image.
 */
const DOCKERFILE = join(import.meta.dir, "Dockerfile");
export const DOCKER_CONTEXT = process.env.WCONF_DOCKER_CONTEXT ?? "orbstack";

function run(cmd: string[], opts: { cwd?: string; stdin?: Uint8Array } = {}): string {
  const r = Bun.spawnSync(cmd, { cwd: opts.cwd, stdin: opts.stdin, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`${cmd.slice(0, 4).join(" ")} … failed (${r.exitCode}):\n${r.stderr.toString().slice(-2000)}`);
  return r.stdout.toString();
}

function args(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const a = { repo: get("--repo"), commit: get("--commit"), canonicalUrl: get("--canonical-url"), out: get("--out"), worktree: argv.includes("--worktree") };
  if (!a.repo || !a.out || !a.canonicalUrl) throw new Error("usage: --repo <git repo> (--commit <sha> | --worktree) --canonical-url <https origin> --out <dir>");
  if (!a.worktree && !a.commit) throw new Error("--commit is required: the build is of a commit, not a working tree");
  return a as { repo: string; commit?: string; canonicalUrl: string; out: string; worktree: boolean };
}

/** The source tree, exported into `dest`: a commit's archive, or a trial's working tree. */
export function exportSource(repo: string, dest: string, worktree: boolean, commit?: string): string {
  mkdirSync(dest, { recursive: true });
  if (worktree) {
    const files = run(["git", "-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean);
    for (const f of files) if (existsSync(join(repo, f))) cpSync(join(repo, f), join(dest, f), { recursive: false, dereference: false });
    return run(["git", "-C", repo, "rev-parse", "HEAD"]).trim();
  }
  const full = run(["git", "-C", repo, "rev-parse", "--verify", `${commit}^{commit}`]).trim();
  const tar = Bun.spawnSync(["git", "-C", repo, "archive", "--format=tar", full], { stdout: "pipe", stderr: "pipe" });
  if (tar.exitCode !== 0) throw new Error(`git archive failed: ${tar.stderr.toString()}`);
  run(["tar", "-x", "-C", dest], { stdin: tar.stdout });
  return full;
}

/** Every file and link under `dir`, relative to it, in `git ls-tree` form. */
export function listTree(dir: string): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const name of readdirSync(join(dir, rel))) {
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(join(dir, r));
      if (st.isDirectory() && !st.isSymbolicLink()) walk(r);
      else out.push(r);
    }
  };
  walk("");
  return out.sort();
}

/**
 * The exported tree, against the commit's own file list. Any extra or missing
 * path is refused before a container runs (`REVIEW-059` R1-10).
 */
export function checkExportedTree(src: string, committed: string[]): string[] {
  const have = new Set(listTree(src)), want = new Set(committed);
  const extra = [...have].filter((p) => !want.has(p)), missing = [...want].filter((p) => !have.has(p));
  return [...extra.map((p) => `${p} is in the build tree and not in the commit`), ...missing.map((p) => `${p} is in the commit and not in the build tree`)];
}

/**
 * Where a build may write: a new or empty directory outside the repository it
 * builds. ⚠ It refused only an existing `.vercel` before, so a failed build's
 * workspace could be reused, and `out === repoTop` passed the prefix test.
 */
export function outProblems(out: string, repoTop: string): string[] {
  const real = (p: string) => { let q = p; while (!existsSync(q)) q = dirname(q); return join(realpathSync(q), p.slice(q.length)); };
  const o = real(out), top = realpathSync(repoTop);
  const problems: string[] = [];
  if (o === top || o.startsWith(top + "/")) problems.push("--out must be outside the repository, so no build file lands in a tree that can be committed");
  if (existsSync(out) && readdirSync(out).length) problems.push(`${out} is not empty; use a new directory for each build, because a reused one can carry files into the output`);
  return problems;
}

/** Inside the containers. `set -eu`, and the store checks come before anything third-party runs. */
// ⚠ One command per line: `set -e` does not stop on a failure inside an `&&`
// list, and the first version ran the next step after Vite had failed.
const STORE_CHECK = 'for p in /tmp/wconf "$HOME/.wconf"; do if [ -e "$p" ]; then echo "REFUSED: $p exists inside the build container" >&2; exit 3; fi; done';
const CONTAINER_SCRIPT = [
  "set -eu",
  STORE_CHECK,
  "bun install --frozen-lockfile",
  "mkdir -p web/hosted/.build",
  "bun run web/hosted/snapshot.ts web/hosted/.build/snapshot.json",
].join("\n");
/** The second container: no network at all. */
const OFFLINE_SCRIPT = [
  "set -eu",
  STORE_CHECK,
  "cd web/app",
  "bunx vite build --config vite.hosted.config.ts",
  "cd /src",
  "bun run web/hosted/vercel-output.ts web/app/dist/client web/hosted/.build",
].join("\n");
export const OFFLINE_ARGS = ["--network", "none"];

/** Build (or reuse) the image named by the Dockerfile's hash. */
function image(): string {
  const tag = `wconf-hosted-build:${createHash("sha256").update(readFileSync(DOCKERFILE)).digest("hex").slice(0, 16)}`;
  const have = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "image", "inspect", tag], { stdout: "ignore", stderr: "ignore" });
  if (have.exitCode !== 0) run(["docker", "--context", DOCKER_CONTEXT, "build", "-q", "-t", tag, "-f", DOCKERFILE, import.meta.dir]);
  return tag;
}

export async function build(argv: string[]) {
  const a = args(argv);
  const out = resolve(a.out);
  if (!isAbsolute(out)) throw new Error("--out must resolve to an absolute path");
  const repoTop = run(["git", "-C", a.repo, "rev-parse", "--show-toplevel"]).trim();
  const refused = outProblems(out, repoTop);
  if (refused.length) throw new Error(refused.join("; "));

  const work = join(out, "work");
  try {
    await buildInto(a, out, work, repoTop);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

async function buildInto(a: ReturnType<typeof args>, out: string, work: string, repoTop: string) {
  const src = join(work, "src");
  const commit = exportSource(repoTop, src, a.worktree, a.commit);
  if (!a.worktree) {
    const committed = run(["git", "-C", repoTop, "ls-tree", "-r", "-z", "--name-only", commit]).split("\0").filter(Boolean);
    const drift = checkExportedTree(src, committed);
    if (drift.length) throw new Error(`the build tree is not the commit's: ${drift.slice(0, 5).join("; ")}${drift.length > 5 ? ` (and ${drift.length - 5} more)` : ""}`);
  }
  const canaries = { VITE_WCONF_CANARY: randomBytes(12).toString("hex"), WCONF_CANARY: randomBytes(12).toString("hex") };
  const env: Record<string, string> = {
    WCONF_ACCEPT_REMOTE_LEDGER_RISK: RISK_ACCEPTANCE_PHRASE,
    WCONF_HOSTED_COMMIT: commit,
    WCONF_HOSTED_CANONICAL_URL: a.canonicalUrl,
    ...canaries,
  };
  const IMAGE = image();
  const docker = (extra: string[], script: string) => [
    "docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...extra,
    "-v", `${src}:/src`, "-w", "/src",
    ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
    IMAGE, "sh", "-c", script,
  ];
  console.log(`building ${commit}${a.worktree ? " (TRIAL: working tree)" : ""} in ${IMAGE}`);
  let log = "";
  for (const [label, extra, script] of [["install and snapshot, with network", [], CONTAINER_SCRIPT], ["build and assemble, --network none", OFFLINE_ARGS, OFFLINE_SCRIPT]] as const) {
    const r = Bun.spawnSync(docker([...extra], script), { stdout: "pipe", stderr: "pipe" });
    log += `=== ${label}\n${r.stdout.toString()}\n--- stderr ---\n${r.stderr.toString()}\n`;
    writeFileSync(join(out, "container.log"), log);
    if (r.exitCode !== 0) throw new Error(`the container step "${label}" failed (${r.exitCode}); see ${join(out, "container.log")}`);
  }

  cpSync(join(src, "web/hosted/.build/.vercel"), join(out, ".vercel"), { recursive: true });
  const snapshot = JSON.parse(readFileSync(join(src, "web/hosted/.build/snapshot.json"), "utf8"));

  // The canaries: neither value may appear verbatim anywhere in what is uploaded.
  const leaked = leakedCanaries(join(out, ".vercel"), Object.values(canaries));
  if (leaked.length) throw new Error(`a build variable reached the output (REVIEW-058 M11): ${leaked.join(", ")}`);

  const manifest = {
    trial: a.worktree,
    commit,
    image: IMAGE,
    dockerfileSha256: createHash("sha256").update(readFileSync(DOCKERFILE)).digest("hex"),
    dockerContext: DOCKER_CONTEXT,
    builtAt: new Date().toISOString(),
    snapshot: { ledgerIndex: snapshot.source.ledgerIndex, readAt: snapshot.readAt, endpoint: snapshot.source.endpoint, canonicalUrl: snapshot.canonicalUrl },
    environment: Object.keys(env).sort(),
    canaries: "two random values, under VITE_ and WCONF_; neither appears verbatim in the output",
    isolation:
      `the containers mounted only ${a.worktree ? "a copy of the working tree (TRIAL)" : "a git archive of the commit, checked file for file against the commit before they ran"}; ` +
      "each checked /tmp/wconf and ~/.wconf absent before running anything else; install and the snapshot had network, " +
      "and could reach the build machine's loopback; the Vite build and the assembler ran with --network none; no deployment token was present",
  };
  writeFileSync(join(out, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`built ${join(out, ".vercel/output")} from ${commit} at ledger ${snapshot.source.ledgerIndex}; manifest at ${join(out, "build-manifest.json")}`);
  console.log(`next: bun run tools/check-web-readonly.ts --hosted ${out} --commit ${commit}`);
}

/** Every file under `dir` holding any of `values`. `grep` exits 1 for none, 2 for an error. */
export function leakedCanaries(dir: string, values: string[]): string[] {
  const r = Bun.spawnSync(["grep", "-rlF", ...values.flatMap((v) => ["-e", v]), dir], { stdout: "pipe", stderr: "pipe" });
  if (r.exitCode === 2) throw new Error(`grep failed: ${r.stderr.toString()}`);
  return r.exitCode === 0 ? r.stdout.toString().trim().split("\n") : [];
}

/**
 * The build's own controls, through the same container script and the same
 * leak check the build runs. Needs Docker; reads no ledger.
 */
export async function selfTest(): Promise<string[]> {
  const failed: string[] = [];
  const tag = image();
  // The image's own home directory, asked rather than assumed: its user is set
  // by the Dockerfile, and a hard-coded path would test the wrong directory.
  const home = run(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", tag, "sh", "-c", 'printf %s "$HOME"']).trim();
  if (!home.startsWith("/")) failed.push(`the image reported no home directory (${JSON.stringify(home)})`);
  for (const store of ["/tmp/wconf", `${home}/.wconf`]) {
    for (const [label, extra, script] of [["install", [], CONTAINER_SCRIPT], ["offline build", OFFLINE_ARGS, OFFLINE_SCRIPT]] as const) {
      const r = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...extra, "--tmpfs", store, tag, "sh", "-c", script], { stdout: "pipe", stderr: "pipe" });
      const err = r.stderr.toString();
      if (r.exitCode !== 3 || !err.includes(`REFUSED: ${store} exists`)) failed.push(`a decoy ${store} was not refused before the ${label} step (exit ${r.exitCode}: ${err.trim().slice(0, 200)})`);
    }
  }
  // The offline step's network, through the same arguments the build passes:
  // a fetch to the ledger and one to a listener on the build machine's
  // loopback must both fail. ⚠ The loopback half first aimed at a port where
  // nothing listened, so it was unreachable WITH network too and tested
  // nothing; found by running this with the offline arguments removed. ⚠ And
  // the container is spawned ASYNCHRONOUSLY: a synchronous spawn blocks this
  // process, so its own listener could not answer and every probe timed out.
  const listener = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("listening") });
  try {
    for (const url of ["https://s.devnet.rippletest.net:51234/", `http://host.docker.internal:${listener.port}/`]) {
      const proc = Bun.spawn(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...OFFLINE_ARGS, tag, "bun", "-e",
        `try { await fetch(${JSON.stringify(url)}, { signal: AbortSignal.timeout(5000) }); console.log("REACHED") } catch { console.log("UNREACHABLE") }`], { stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
      if (!stdout.includes("UNREACHABLE")) failed.push(`the offline step reached ${url} (${stdout.trim()} ${stderr.trim().slice(0, 120)})`);
    }
  } finally {
    listener.stop(true);
  }
  const d = mkdtempSync(join(tmpdir(), "wconf-build-self-test-"));
  try {
    const canary = randomBytes(12).toString("hex");
    mkdirSync(join(d, "static", "assets"), { recursive: true });
    writeFileSync(join(d, "static", "assets", "app.js"), `const p = "${canary}";`);
    if (leakedCanaries(d, [canary]).length !== 1) failed.push("a canary planted in an asset was not found");
    if (leakedCanaries(d, [randomBytes(12).toString("hex")]).length !== 0) failed.push("a canary that is absent was reported");
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
  return failed;
}

if (import.meta.main) {
  if (process.argv.includes("--self-test")) {
    const failed = await selfTest();
    for (const f of failed) console.log(`  CONTROL FAILED: ${f}`);
    console.log(`build self-test: verdict=${failed.length ? "CONTROL-FAILED" : "PASS"} exit=${failed.length ? 2 : 0}`);
    process.exit(failed.length ? 2 : 0);
  }
  await build(process.argv.slice(2));
}

````


## FILE: web/hosted/build.test.ts, after the fixes (complete)

````typescript
/**
 * The build's two refusals that need no container: where it may write, and
 * whether the tree it is about to build is the commit's (`REVIEW-059` R1-10).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkExportedTree, exportSource, listTree, outProblems } from "./build.ts";

const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const temp = () => { const d = mkdtempSync(join(tmpdir(), "wconf-build-test-")); dirs.push(d); return d; };
const git = (cwd: string, ...a: string[]) => {
  const r = Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...a], { cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return r.stdout.toString().trim();
};

/** A two-file repository with one commit. */
function repo(): { dir: string; commit: string } {
  const dir = temp();
  git(dir, "init", "-q");
  mkdirSync(join(dir, "web/app"), { recursive: true });
  writeFileSync(join(dir, "README.md"), "x\n");
  writeFileSync(join(dir, "web/app/page.ts"), "export const a = 1;\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "one");
  return { dir, commit: git(dir, "rev-parse", "HEAD") };
}

describe("where a build may write", () => {
  test("refuses the repository itself and anything inside it", () => {
    const { dir } = repo();
    expect(outProblems(dir, dir).join()).toMatch(/outside the repository/);
    expect(outProblems(join(dir, "out"), dir).join()).toMatch(/outside the repository/);
  });
  test("refuses a directory that is not empty, and takes a new or empty one", () => {
    const { dir } = repo();
    const used = temp();
    mkdirSync(join(used, "work/src"), { recursive: true });
    expect(outProblems(used, dir).join()).toMatch(/is not empty/);
    expect(outProblems(temp(), dir)).toEqual([]);
    expect(outProblems(join(temp(), "new"), dir)).toEqual([]);
  });
});

describe("the tree a build is about to build", () => {
  test("a clean export lists exactly the commit's files", () => {
    const { dir, commit } = repo();
    const src = join(temp(), "src");
    exportSource(dir, src, false, commit);
    expect(checkExportedTree(src, ["README.md", "web/app/page.ts"])).toEqual([]);
  });
  test("a file left in the directory before the export is refused (REVIEW-059 R1-10, as measured)", () => {
    const { dir, commit } = repo();
    const src = join(temp(), "src");
    mkdirSync(join(src, "web/app/public/assets"), { recursive: true });
    writeFileSync(join(src, "web/app/public/assets/review059.js"), "export const outsider = 1;\n");
    exportSource(dir, src, false, commit);
    expect(listTree(src)).toContain("web/app/public/assets/review059.js");
    expect(checkExportedTree(src, ["README.md", "web/app/page.ts"]).join()).toMatch(/web\/app\/public\/assets\/review059\.js is in the build tree and not in the commit/);
  });
  test("a committed file the export lost is refused", () => {
    expect(checkExportedTree(temp(), ["README.md"]).join()).toMatch(/README\.md is in the commit and not in the build tree/);
  });
});

````


## FILE: web/hosted/compare-deployed.ts, after the fixes (complete)

````typescript
/**
 * After the upload: are the bytes and headers the host serves the ones the gate
 * passed? `ADR-0004` D-H4 and step 5.
 *
 *   bun run web/hosted/compare-deployed.ts <output root> <https origin>
 *
 * Fetches every file `gate-verdict.json` lists, and each page by both spellings
 * of its route, and compares bytes with the verdict's digests, the security
 * headers with `config.json`'s and the content type with the file's kind. Fails
 * on any difference, on a status other than 200, on a cookie, on a redirect,
 * and on an unknown path that does not answer 404 under the same headers.
 *
 * ⚠ **`REVIEW-059` R1-6 found three things this did not look at**: the
 * content type (every page could have been served as text), the verdict
 * file's status, and `/<page>/`, which the routes serve and nothing fetched.
 *
 * ⚠ **It detects a change at the moment it runs, nothing later.** The deployed
 * bytes are the host's to deliver (`ADR-0004`, `REVIEW-058` S-3, R1-10).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HOSTED_PAGES } from "./pages.ts";

const sha256 = (b: ArrayBuffer | Buffer) => createHash("sha256").update(Buffer.from(b as ArrayBuffer)).digest("hex");
const CHECKED_HEADERS = ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Cross-Origin-Opener-Policy", "Permissions-Policy"];

/** The media types each kind of file may be served as. Both JavaScript types are valid for a module script. */
export const MEDIA_TYPES: Record<string, string[]> = {
  html: ["text/html"], js: ["text/javascript", "application/javascript"], css: ["text/css"],
  json: ["application/json"], txt: ["text/plain"],
};

export async function compareDeployed(root: string, origin: string): Promise<string[]> {
  const base = join(root, ".vercel", "output");
  const verdict = JSON.parse(readFileSync(join(base, "static/gate-verdict.json"), "utf8"));
  const config = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
  const want: Record<string, string> = config.routes[0].headers;
  const problems: string[] = [];
  const get = async (path: string) => {
    const r = await fetch(origin.replace(/\/$/, "") + path, { redirect: "manual", headers: { "cache-control": "no-cache" } });
    if (r.headers.get("set-cookie")) problems.push(`${path}: the host set a cookie`);
    return r;
  };
  const checkHeaders = (path: string, r: Response) => {
    for (const h of CHECKED_HEADERS) if (r.headers.get(h) !== want[h]) problems.push(`${path}: ${h} is ${JSON.stringify(r.headers.get(h))}, not what config.json sets`);
  };
  const checkType = (path: string, file: string, r: Response) => {
    const ext = file.slice(file.lastIndexOf(".") + 1);
    const got = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!(MEDIA_TYPES[ext] ?? []).includes(got)) problems.push(`${path}: served as ${JSON.stringify(got)}, not ${(MEDIA_TYPES[ext] ?? ["a known type"]).join(" or ")}`);
  };
  for (const [p, digest] of Object.entries<string>(verdict.perFile)) {
    if (!p.startsWith("static/")) continue;
    const path = p.slice("static".length);
    const r = await get(path);
    if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
    if (sha256(await r.arrayBuffer()) !== digest) problems.push(`${path}: the served bytes differ from what the gate passed`);
    checkHeaders(path, r);
    checkType(path, p, r);
  }
  for (const page of HOSTED_PAGES) {
    const file = page ? `static/${page}/index.html` : "static/index.html";
    for (const path of page ? [`/${page}`, `/${page}/`] : ["/"]) {
      const r = await get(path);
      if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
      if (sha256(await r.arrayBuffer()) !== verdict.perFile[file]) problems.push(`${path}: the page served at its route differs from ${file}`);
      checkHeaders(path, r);
      checkType(path, file, r);
    }
  }
  const served = await get("/gate-verdict.json");
  if (served.status !== 200) problems.push(`/gate-verdict.json: HTTP ${served.status}`);
  if (sha256(await served.arrayBuffer()) !== sha256(readFileSync(join(base, "static/gate-verdict.json")))) problems.push("/gate-verdict.json differs from the local one");
  checkHeaders("/gate-verdict.json", served);
  checkType("/gate-verdict.json", "gate-verdict.json", served);
  const missing = await get(`/no-such-page-${Date.now()}`);
  if (missing.status !== 404) problems.push(`an unknown path answered ${missing.status}, not 404`);
  checkHeaders("an unknown path", missing);
  return problems;
}

if (import.meta.main) {
  const [root, origin] = process.argv.slice(2);
  if (!root || !origin?.startsWith("https://")) throw new Error("usage: bun run web/hosted/compare-deployed.ts <output root> <https origin>");
  const problems = await compareDeployed(root, origin);
  for (const p of problems) console.log(`  DIFFERS: ${p}`);
  console.log(`compare-deployed: verdict=${problems.length ? "FAIL" : "PASS"} exit=${problems.length ? 1 : 0}`);
  process.exit(problems.length ? 1 : 0);
}

````


## FILE: web/hosted/deploy-preflight.ts, after the fixes (complete)

````typescript
/**
 * Before `vercel deploy --prebuilt`: is this output the one the gate passed,
 * built from a commit, and nothing since? `ADR-0004` D-H4, ruled A.
 *
 *   bun run web/hosted/deploy-preflight.ts <output root>
 *
 * ⚠ **This does not deploy.** Deploying needs the owner's Vercel token, and
 * D-H4 keeps that token away from everything that installs or builds. This
 * checks the output and prints the command; the owner runs it.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_PAGES, readOutput, runChecks, type Finding } from "../../tools/check-web-hosted.ts";

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

export const PUBLIC_REPO = "nandanito/xrpl-confidential-positions";

/**
 * Whether `commit` is on the public `main`. ⚠ Asked as a comparison, not a
 * lookup: `repos/<repo>/commits/<sha>` also answers for commits that exist only
 * in a fork, because forks share an object store.
 */
export function onPublicMain(commit: string, compare = (sha: string) => {
  const r = Bun.spawnSync(["gh", "api", `repos/${PUBLIC_REPO}/compare/${sha}...main`, "--jq", ".status"], { stdout: "pipe", stderr: "pipe" });
  return r.exitCode === 0 ? r.stdout.toString().trim() : `error: ${r.stderr.toString().trim()}`;
}): boolean {
  const status = compare(commit);
  return status === "identical" || status === "ahead";
}

/**
 * ⚠ **What a PASS here means, and what it does not** (`REVIEW-059` R1-7, S-5).
 * It means: the manifest says a commit build, not a trial, of a commit on the
 * public `main`; the gate's checks pass on these exact bytes, run again here;
 * every file matches the verdict; and every ledger page names the ledger the
 * manifest records. It does not mean the files came from that commit: that is
 * the build's tree check, and the manifest is the build's own word for it.
 */
export function preflight(
  root: string,
  isOnPublicMain: (commit: string) => boolean = onPublicMain,
  checks: (files: Map<string, Buffer>, want: { commit: string }) => Finding[] = runChecks,
): string[] {
  const problems: string[] = [];
  const manifestPath = join(root, "build-manifest.json");
  if (!existsSync(manifestPath)) return [`no build-manifest.json beside the output; build with web/hosted/build.ts`];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  // ⚠ `if (manifest.trial)` passed a manifest with no `trial` at all.
  if (manifest.trial !== false) problems.push(`the manifest's trial field is ${JSON.stringify(manifest.trial ?? null)}, not false: this output is not known to be a commit build`);
  else if (typeof manifest.commit !== "string" || !/^[0-9a-f]{40}$/.test(manifest.commit)) problems.push(`the manifest's commit ${JSON.stringify(manifest.commit ?? null)} is not a full commit id`);
  else if (!isOnPublicMain(manifest.commit)) problems.push(`${manifest.commit} is not on the public repository's main, so the footer's link names a commit readers cannot see`);
  const files = readOutput(root);
  // The gate's checks, again, on the bytes about to be uploaded: a file changed
  // together with its verdict passes the digest comparison below and not this.
  // The controls and the secret sweep stay the gate's.
  for (const f of checks(files, { commit: String(manifest.commit) })) problems.push(`the gate's check fails now: ${f.check}: ${f.detail}`);
  // Every page's footer names the snapshot's read time and the address it is
  // published at; both must be the manifest's (`REVIEW-059` R1-7).
  for (const [p, b] of files) {
    if (!p.endsWith(".html")) continue;
    const h = b.toString("utf8");
    if (!manifest.snapshot?.readAt || !h.includes(String(manifest.snapshot.readAt))) problems.push(`${p} does not show the manifest's read time ${JSON.stringify(manifest.snapshot?.readAt ?? null)}`);
    if (!manifest.snapshot?.canonicalUrl || !h.includes(`<code>${manifest.snapshot.canonicalUrl}</code>`)) problems.push(`${p} does not name the manifest's address ${JSON.stringify(manifest.snapshot?.canonicalUrl ?? null)}`);
  }
  const ledgerIndex = manifest.snapshot?.ledgerIndex;
  for (const lp of LEDGER_PAGES) {
    const h = files.get(`static/${lp}/index.html`)?.toString("utf8") ?? "";
    const named = [...h.matchAll(/data-ledger-index="(\d+)"/g)].map((m) => Number(m[1]));
    if (!named.length || named.some((n) => n !== ledgerIndex)) problems.push(`/${lp} names ledger ${[...new Set(named)].join(", ") || "none"}, and the manifest records ${JSON.stringify(ledgerIndex ?? null)}`);
  }
  const v = files.get("static/gate-verdict.json");
  if (!v) return [...problems, "no static/gate-verdict.json: the gate has not passed this output"];
  const verdict = JSON.parse(v.toString("utf8"));
  if (verdict.verdict !== "PASS") problems.push(`the verdict is ${JSON.stringify(verdict.verdict)}`);
  if (verdict.commit !== manifest.commit) problems.push(`the gate checked ${verdict.commit}, the build was of ${manifest.commit}`);
  const entries = [...files].filter(([p]) => p !== "static/gate-verdict.json").sort(([a], [b]) => a.localeCompare(b));
  if (entries.length !== verdict.files) problems.push(`${entries.length} files now, ${verdict.files} when the gate passed`);
  for (const [p, b] of entries) if (verdict.perFile[p] !== sha256(b)) problems.push(`${p} changed since the gate passed`);
  const digest = sha256(entries.map(([p, b]) => `${p}\t${sha256(b)}`).join("\n"));
  if (digest !== verdict.outputDigest) problems.push("the output digest does not match the verdict's");
  return problems;
}

if (import.meta.main) {
  const root = process.argv[2];
  if (!root) throw new Error("usage: bun run web/hosted/deploy-preflight.ts <output root>");
  const problems = preflight(root);
  for (const p of problems) console.log(`  REFUSED: ${p}`);
  if (problems.length) { console.log("deploy-preflight: verdict=REFUSED exit=1"); process.exit(1); }
  const m = JSON.parse(readFileSync(join(root, "build-manifest.json"), "utf8"));
  console.log(`deploy-preflight: ${root} is the output the gate passed, built from ${m.commit} at ledger ${m.snapshot.ledgerIndex}.`);
  console.log("\nThe owner deploys it, with the project-scoped token present for this command only:");
  console.log(`  VERCEL_TOKEN=… VERCEL_ORG_ID=… VERCEL_PROJECT_ID=… vercel deploy --prebuilt --prod --cwd ${root}`);
  console.log(`\nThen compare what is served with what passed:\n  bun run web/hosted/compare-deployed.ts ${root} ${m.snapshot.canonicalUrl}`);
  console.log("deploy-preflight: verdict=PASS exit=0");
}

````


## FILE: web/hosted/deploy.test.ts, after the fixes (complete)

````typescript
/**
 * Before and after the owner's upload: the preflight refuses what the gate did
 * not pass, and the comparison sees what the host changed.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LEDGER_PAGES, readOutput, verdictFile } from "../../tools/check-web-hosted.ts";
import { onPublicMain, preflight } from "./deploy-preflight.ts";
import { compareDeployed } from "./compare-deployed.ts";
import { serveOutput } from "./browser-check.ts";
import { HOSTED_PAGES } from "./pages.ts";

const COMMIT = "c".repeat(40);
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

/** A minimal output the gate has passed, with its manifest beside it. */
const READ_AT = "2026-10-20T05:22:05.191Z";
function fixture(o: { trial?: boolean | null; verdict?: boolean; ledgerIndex?: number; readAt?: string } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "wconf-deploy-test-"));
  dirs.push(root);
  const base = join(root, ".vercel", "output");
  for (const p of HOSTED_PAGES) {
    mkdirSync(join(base, "static", p), { recursive: true });
    const ledger = (LEDGER_PAGES as readonly string[]).includes(p) ? `<div data-ledger-index="${o.ledgerIndex ?? 1}"></div>` : "";
    const footer = `<footer>read on ${READ_AT}; published at <code>https://x.vercel.app</code></footer>`;
    writeFileSync(join(base, "static", p, "index.html"), `<html><body>${p || "home"}${ledger}${footer}</body></html>`);
  }
  const headers = { "Content-Security-Policy": "default-src 'self'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cross-Origin-Opener-Policy": "same-origin", "Permissions-Policy": "camera=()" };
  writeFileSync(join(base, "config.json"), JSON.stringify({ version: 3, routes: [{ src: "/(.*)", headers, continue: true }, ...HOSTED_PAGES.filter(Boolean).map((p) => ({ src: `^/${p}/?$`, dest: `/${p}/index.html` })), { handle: "filesystem" }] }));
  const manifest: any = { trial: o.trial === undefined ? false : o.trial, commit: COMMIT, snapshot: { ledgerIndex: 1, readAt: o.readAt ?? READ_AT, canonicalUrl: "https://x.vercel.app" } };
  if (o.trial === null) delete manifest.trial;
  writeFileSync(join(root, "build-manifest.json"), JSON.stringify(manifest));
  if (o.verdict ?? true) writeFileSync(join(base, "static/gate-verdict.json"), JSON.stringify(verdictFile(readOutput(root), { commit: COMMIT }, 0)));
  return root;
}
const onMain = () => true;
// The fixture is not a real output, so the gate's checks are stubbed except
// where a test is about them.
const clean = () => [];

describe("deploy-preflight", () => {
  test("passes the output the gate passed", () => {
    expect(preflight(fixture(), onMain, clean)).toEqual([]);
  });
  test("refuses a trial build", () => {
    expect(preflight(fixture({ trial: true }), onMain, clean).join()).toMatch(/trial field is true/);
  });
  test("refuses a manifest with no trial field (REVIEW-059 R1-7)", () => {
    expect(preflight(fixture({ trial: null }), onMain, clean).join()).toMatch(/trial field is null, not false/);
  });
  test("refuses a commit that is not on the public main", () => {
    expect(preflight(fixture(), () => false, clean).join()).toMatch(/not on the public repository's main/);
  });
  test("refuses an output with no verdict", () => {
    expect(preflight(fixture({ verdict: false }), onMain, clean).join()).toMatch(/gate has not passed/);
  });
  test("refuses a file changed after the gate passed", () => {
    const root = fixture();
    appendFileSync(join(root, ".vercel/output/static/observer/index.html"), "<!-- later -->");
    expect(preflight(root, onMain, clean).join()).toMatch(/static\/observer\/index\.html changed/);
  });
  test("refuses an output whose gate check fails now, verdict and all (REVIEW-059 S-5)", () => {
    const failing = () => [{ check: "csp", detail: "planted" }];
    expect(preflight(fixture(), onMain, failing).join()).toMatch(/the gate's check fails now: csp: planted/);
  });
  test("refuses a manifest whose read time no page shows (REVIEW-059 R1-7)", () => {
    expect(preflight(fixture({ readAt: "2026-01-01T00:00:00.000Z" }), onMain, clean).join()).toMatch(/does not show the manifest's read time/);
  });
  test("refuses a ledger page that names another ledger than the manifest (REVIEW-059 R1-7)", () => {
    expect(preflight(fixture({ ledgerIndex: 2 }), onMain, clean).join()).toMatch(/\/observer names ledger 2, and the manifest records 1/);
  });
  test("asks GitHub for a comparison, and only 'identical' or 'ahead' is on main", () => {
    expect(onPublicMain("x", () => "ahead")).toBe(true);
    expect(onPublicMain("x", () => "identical")).toBe(true);
    for (const s of ["behind", "diverged", "error: Not Found"]) expect(onPublicMain("x", () => s)).toBe(false);
  });
});

describe("browser-check's server", () => {
  test("refuses a configuration it cannot model (REVIEW-059 R1-5)", () => {
    const root = fixture();
    const cfg = join(root, ".vercel/output/config.json");
    const c = JSON.parse(readFileSync(cfg, "utf8"));
    c.routes.splice(1, 0, { src: "/(.*)", headers: { "Content-Security-Policy": "default-src *" }, continue: true });
    writeFileSync(cfg, JSON.stringify(c));
    expect(() => serveOutput(root)).toThrow(/cannot model route 1/);
  });
});

describe("compare-deployed", () => {
  test("finds nothing when the host serves what the gate passed", async () => {
    const root = fixture();
    const s = serveOutput(root);
    try { expect(await compareDeployed(root, `http://127.0.0.1:${s.port}`)).toEqual([]); } finally { s.stop(true); }
  });
  test("sees a page the host changed, at its file and at its route", async () => {
    const root = fixture();
    const s = serveOutput(root);
    appendFileSync(join(root, ".vercel/output/static/issuer/index.html"), "<script src=//x></script>");
    try {
      const d = (await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n");
      expect(d).toMatch(/\/issuer\/index\.html: the served bytes differ/);
      expect(d).toMatch(/\/issuer: the page served at its route differs/);
    } finally { s.stop(true); }
  });
  /** A host that serves the output, with one misbehaviour applied to each response. */
  function misbehaving(root: string, change: (path: string, r: Response, body: ArrayBuffer) => Response | null) {
    const inner = serveOutput(root);
    const outer = Bun.serve({
      hostname: "127.0.0.1", port: 0,
      async fetch(req) {
        const path = new URL(req.url).pathname;
        const r = await fetch(`http://127.0.0.1:${inner.port}${path}`, { redirect: "manual" });
        const body = await r.arrayBuffer();
        return change(path, r, body) ?? new Response(body, { status: r.status, headers: r.headers });
      },
    });
    return { port: outer.port, stop: () => { outer.stop(true); inner.stop(true); } };
  }
  const withHeaders = (r: Response, h: Record<string, string | null>) => { const out = new Headers(r.headers); for (const [k, v] of Object.entries(h)) v === null ? out.delete(k) : out.set(k, v); return out; };

  test("sees a page served as text (REVIEW-059 R1-6)", async () => {
    const root = fixture();
    const s = misbehaving(root, (p, r, b) => (p.endsWith(".html") || !p.includes(".") ? new Response(b, { status: r.status, headers: withHeaders(r, { "content-type": "text/plain" }) }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/issuer: served as "text\/plain", not text\/html/); } finally { s.stop(); }
  });
  test("sees a page that differs only at its trailing-slash route (REVIEW-059 R1-6)", async () => {
    const root = fixture();
    const s = misbehaving(root, (p, r) => (p === "/issuer/" ? new Response("<html>The holder is private from the issuer.</html>", { status: 200, headers: r.headers }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/issuer\/: the page served at its route differs/); } finally { s.stop(); }
  });
  test("sees the verdict served with an error status (REVIEW-059 R1-6)", async () => {
    const root = fixture();
    const s = misbehaving(root, (p, r, b) => (p === "/gate-verdict.json" ? new Response(b, { status: 500, headers: r.headers }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/gate-verdict\.json: HTTP 500/); } finally { s.stop(); }
  });
  test("sees an unknown path answered without the policy (REVIEW-059 R1-6)", async () => {
    const root = fixture();
    const s = misbehaving(root, (_p, r, b) => (r.status === 404 ? new Response(b, { status: 404, headers: withHeaders(r, { "Content-Security-Policy": null }) }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/an unknown path: Content-Security-Policy is null/); } finally { s.stop(); }
  });

  test("sees a header the host changed, a cookie, and a catch-all", async () => {
    const root = fixture();
    const s = Bun.serve({
      hostname: "127.0.0.1", port: 0,
      fetch: () => new Response("<html></html>", { headers: { "Content-Security-Policy": "default-src *", "Set-Cookie": "a=b" } }),
    });
    try {
      const d = (await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n");
      expect(d).toMatch(/Content-Security-Policy is/);
      expect(d).toMatch(/the host set a cookie/);
      expect(d).toMatch(/an unknown path answered 200, not 404/);
    } finally { s.stop(true); }
  });
});

````


## FILE: web/hosted/snapshot.ts, after the fixes (complete)

````typescript
/**
 * The hosted demo's one pinned snapshot: `ADR-0004`, architecture §6 step 9.
 *
 * Runs at BUILD time, inside the isolated build, and never in a visitor's
 * browser. It opens the reader the local tier already uses
 * (`facility/src/loopback.ts`) against ONE named endpoint under the named risk
 * acceptance, pins one validated ledger, and reads every value the hosted pages
 * render from it. It writes public ledger data only.
 *
 * ⚠ **A failed read stops the build.** A negative read the pinned ledger
 * answered (`entryNotFound`, carrying that ledger's index) is recorded as what it
 * is: a missing account, a missing position or a missing issuance. Nothing is
 * substituted (`CLAUDE.md`: a substituted source is a corrupted one), and no
 * failed read is rendered as an empty account (architecture §6 step 9's
 * falsifier).
 *
 * ⚠ **No issuer figure.** D-H3 was ruled A (`CLAIMS.md` E-331). The snapshot
 * records whether `IssuerEncryptedBalance` is present and the key it is under,
 * both ledger readings, and holds no key and decrypts nothing.
 *
 *   WCONF_ACCEPT_REMOTE_LEDGER_RISK="<the sentence>" WCONF_HOSTED_COMMIT=<sha> \
 *   WCONF_HOSTED_CANONICAL_URL=https://<name>.vercel.app bun run web/hosted/snapshot.ts <out.json>
 */

import { writeFileSync } from "node:fs";
import { LoopbackLedger, LedgerRefusal } from "../../facility/src/loopback.ts";
import { viewOf } from "../api/observer.ts";
import { DEMO_ACCOUNTS, DEMO_ISSUANCE, validDemoAccounts } from "../api/demo-accounts.ts";
import { CAPABILITY_MATRIX, INVARIANTS, MASTER_SEED_DISCLOSURE, DERIVATION_NOT_PUBLISHED, WALLET_CODEC_GAP } from "../api/capability.ts";
import { walkFlows } from "../api/custody-sim.ts";
import { SNAPSHOT_SCHEMA, type HostedAccount, type HostedSnapshot } from "./snapshot-types.ts";

export { SNAPSHOT_SCHEMA };
export type { HostedAccount, HostedSnapshot };

/**
 * The one ledger endpoint the hosted build may read. ⚠ A constant, not an
 * input: a second endpoint, as a fallback or otherwise, is a rotation trigger
 * (`ADR-0004` trigger 3), so no variable can name one.
 */
export const HOSTED_ENDPOINT = "https://s.devnet.rippletest.net:51234";

/** One account at the pinned ledger. Exported for tests. */
export async function readAccount(
  snap: { accountExists(a: string): Promise<boolean>; mptoken: (a: string, i: string) => Promise<any>; index: number },
  account: { address: string; issuanceId: string; label: string; note: string },
  /** The issuance as the snapshot already read it, or null for a missing one. Not read again here. */
  iss: any | null,
): Promise<HostedAccount> {
  const base = { address: account.address, label: account.label, note: account.note };
  if (!(await snap.accountExists(account.address))) {
    return { ...base, state: "account-missing", observer: null, issuerMirror: null };
  }
  if (!iss) return { ...base, state: "issuance-missing", observer: null, issuerMirror: null };
  // ⚠ One read of the position, and the view is built from it and from the
  // issuance the snapshot already read (`REVIEW-059` R1-8: both were read again).
  const mpt = await snap.mptoken(account.address, account.issuanceId);
  if (!mpt) return { ...base, state: "no-position", observer: null, issuerMirror: null };
  const observer = viewOf(account.address, account.issuanceId, mpt, iss);
  return {
    ...base,
    state: "present",
    observer,
    issuerMirror: mpt.issuerEncryptedBalance
      ? { present: true, ciphertext: mpt.issuerEncryptedBalance }
      : { present: false },
  };
}

export async function takeSnapshot(commit: string, canonicalUrl: string, endpoint = HOSTED_ENDPOINT): Promise<HostedSnapshot> {
  if (endpoint !== HOSTED_ENDPOINT) throw new Error(`the hosted build reads ${HOSTED_ENDPOINT} and nothing else (ADR-0004 trigger 3)`);
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`WCONF_HOSTED_COMMIT must be a full 40-hex commit id, not ${JSON.stringify(commit)}`);
  if (!/^https:\/\/[a-z0-9.-]+\/?$/.test(canonicalUrl)) throw new Error(`WCONF_HOSTED_CANONICAL_URL must be an https origin, not ${JSON.stringify(canonicalUrl)}`);
  const accounts = validDemoAccounts();
  if (accounts.length !== DEMO_ACCOUNTS.length) throw new Error("a demo account failed its own format check; fix web/api/demo-accounts.ts");

  const ledger = await LoopbackLedger.open(endpoint);
  const snap = await ledger.snapshot();
  const readAt = new Date().toISOString();

  let issuanceExists = true;
  let iss: any = null;
  try {
    iss = await snap.issuance(DEMO_ISSUANCE);
  } catch (e) {
    if (!(e instanceof LedgerRefusal && e.code === "REFUSED_LEDGER_ENTRY_MISSING")) throw e;
    issuanceExists = false;
  }

  const out: HostedAccount[] = [];
  for (const a of accounts) out.push(await readAccount(snap, a, issuanceExists ? iss : null));

  return {
    schema: SNAPSHOT_SCHEMA,
    readAt,
    commit,
    canonicalUrl: canonicalUrl.replace(/\/$/, ""),
    source: {
      endpoint: ledger.endpoint,
      networkId: ledger.identity.networkId,
      buildVersion: ledger.identity.buildVersion,
      ledgerIndex: snap.index,
    },
    issuance: issuanceExists
      ? {
          id: DEMO_ISSUANCE,
          exists: true,
          issuer: iss.issuer,
          confidentialOutstandingAmount: iss.confidentialOutstandingAmountRaw,
          issuerEncryptionKey: iss.issuerEncryptionKey,
          hasAuditorKey: Boolean(iss.auditorEncryptionKey),
        }
      : { id: DEMO_ISSUANCE, exists: false },
    accounts: out,
    repositoryText: {
      capabilities: {
        rows: CAPABILITY_MATRIX,
        invariants: INVARIANTS,
        disclosures: { masterSeed: MASTER_SEED_DISCLOSURE, derivationNotPublished: DERIVATION_NOT_PUBLISHED },
        namedGaps: { walletCodec: WALLET_CODEC_GAP },
      },
      custody: walkFlows(),
    },
  };
}

if (import.meta.main) {
  const out = process.argv[2];
  if (!out) throw new Error("usage: bun run web/hosted/snapshot.ts <out.json>");
  const snapshot = await takeSnapshot(process.env.WCONF_HOSTED_COMMIT ?? "", process.env.WCONF_HOSTED_CANONICAL_URL ?? "");
  writeFileSync(out, JSON.stringify(snapshot, null, 2) + "\n");
  const states = snapshot.accounts.map((a) => `${a.label.split(" —")[0]}: ${a.state}`).join(", ");
  console.log(`snapshot: ledger ${snapshot.source.ledgerIndex} on ${snapshot.source.endpoint}, rippled ${snapshot.source.buildVersion}; ${states}`);
}

````


## FILE: web/hosted/snapshot.test.ts, after the fixes (complete)

````typescript
/**
 * The build's snapshot records what the pinned ledger said, and never turns a
 * missing account into an empty one (architecture §6 step 9's falsifier).
 */
import { describe, expect, test } from "bun:test";
import { HOSTED_ENDPOINT, readAccount, takeSnapshot } from "./snapshot.ts";
import type { HostedSnapshot } from "./snapshot-types.ts";

const ACCOUNT = { address: "rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8", issuanceId: "00".repeat(24), label: "Holder A", note: "n" };
const KEY = "02" + "11".repeat(32);
const ISS = { issuer: "rIssuer", confidentialOutstandingAmountRaw: "7", issuerEncryptionKey: KEY };

function fake(o: { exists?: boolean; mpt?: any; issuance?: any }) {
  return {
    index: 42,
    accountExists: async () => o.exists ?? true,
    mptoken: async () => o.mpt ?? null,
    issuance: async () => o.issuance ?? { issuer: "rIssuer", confidentialOutstandingAmountRaw: "7", issuerEncryptionKey: KEY },
  };
}

describe("readAccount", () => {
  test("an account the pinned ledger does not hold is 'account-missing', with no view", async () => {
    const a = await readAccount(fake({ exists: false }), ACCOUNT, ISS);
    expect(a.state).toBe("account-missing");
    expect(a.observer).toBeNull();
    expect(a.issuerMirror).toBeNull();
  });

  test("a missing issuance is 'issuance-missing', checked after the account", async () => {
    expect((await readAccount(fake({}), ACCOUNT, null)).state).toBe("issuance-missing");
    expect((await readAccount(fake({ exists: false }), ACCOUNT, null)).state).toBe("account-missing");
  });

  test("an account with no MPToken is 'no-position', not a zero balance", async () => {
    const a = await readAccount(fake({ mpt: null }), ACCOUNT, ISS);
    expect(a.state).toBe("no-position");
    expect(a.observer).toBeNull();
  });

  test("a position records whether the issuer's mirror is on the ledger, and no figure", async () => {
    const mpt = { publicAmountRaw: "0", confidentialBalanceVersion: 1, issuerEncryptedBalance: "AB".repeat(66) };
    const a = await readAccount(fake({ mpt }), ACCOUNT, ISS);
    expect(a.state).toBe("present");
    expect(a.issuerMirror).toEqual({ present: true, ciphertext: "AB".repeat(66) });
    expect(JSON.stringify(a)).not.toMatch(/decrypt(ed)?(Balance|Amount)|"figure"/);
    const b = await readAccount(fake({ mpt: { ...mpt, issuerEncryptedBalance: undefined } }), ACCOUNT, ISS);
    expect(b.issuerMirror).toEqual({ present: false });
  });

  test("the position is read once, so a contradicting second answer cannot empty it (REVIEW-059 R1-8)", async () => {
    const mpt = { publicAmountRaw: "750", confidentialBalanceVersion: 11 };
    let reads = 0, issuanceReads = 0;
    const flaky = { ...fake({}), mptoken: async () => (reads++ === 0 ? mpt : null), issuance: async () => { issuanceReads++; return null; } };
    const a = await readAccount(flaky, ACCOUNT, ISS);
    expect(reads).toBe(1);
    expect(issuanceReads).toBe(0);
    expect(a.observer?.issuance.confidentialOutstandingAmount).toBe("7");
    expect(a.state).toBe("present");
    expect(a.observer?.publicAmount).toBe("750");
    expect(a.observer?.confidentialBalanceVersion).toBe(11);
  });

  test("a read that fails is not swallowed into a state", async () => {
    const broken = { ...fake({}), accountExists: async () => { throw new Error("REFUSED_LEDGER_TORN"); } };
    await expect(readAccount(broken, ACCOUNT, ISS)).rejects.toThrow(/REFUSED_LEDGER_TORN/);
  });
});

describe("takeSnapshot refuses before it reads", () => {
  const C = "a".repeat(40);
  test("any endpoint but the named one", async () => {
    await expect(takeSnapshot(C, "https://x.vercel.app", "https://s.altnet.rippletest.net:51234")).rejects.toThrow(/trigger 3/);
  });
  test("a commit that is not a full id", async () => {
    await expect(takeSnapshot("abc123", "https://x.vercel.app")).rejects.toThrow(/40-hex/);
  });
  test("a canonical address that is not an https origin", async () => {
    await expect(takeSnapshot(C, "http://x.vercel.app")).rejects.toThrow(/https origin/);
    await expect(takeSnapshot(C, "https://x.vercel.app/path")).rejects.toThrow(/https origin/);
  });
  test("the named endpoint is Devnet's public JSON-RPC endpoint", () => {
    expect(HOSTED_ENDPOINT).toBe("https://s.devnet.rippletest.net:51234");
  });
});

// A compile-time check that the serialised shape is what the app imports.
const _shape: (s: HostedSnapshot) => string = (s) => s.source.endpoint;
void _shape;

````


## FILE: web/hosted/licence-notices.ts, after the fixes (complete)

````typescript
/**
 * The licence notices shipped with the hosted bundle, shared by the build's
 * plugin (`web/app/vite.hosted.config.ts`) and the gate, so both read one rule.
 *
 * ⚠ **Email addresses are removed from the shipped notices, and only those.**
 * seroval's MIT notice, which TanStack Start bundles, names its author's
 * personal address, and this repository does not republish personal addresses
 * (`check-no-secrets`'s email class). The project owner ruled on 2026-10-20 to
 * keep each notice and replace the address with a marker; the copyright line
 * keeps its year and holder (`CLAIMS.md` E-335). The gate checks that every
 * shipped notice is the package's own licence file with that one change.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const EMAIL_MARKER = "[email address removed; the package's own licence file carries it]";

/**
 * The licence file's opening lines, before the first notice. One constant, so
 * the gate can require the file to open with exactly this and nothing else
 * (`REVIEW-059` S-4: the region before the first notice was read by no check).
 */
export const LICENCE_FILE_HEADER = [
  "Third-party software in the W-CONF hosted demo's client bundle, with the licence",
  "each package ships. Collected at build time from the modules actually bundled.",
  `Email addresses in these notices are replaced with "${EMAIL_MARKER}".`,
  "",
];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

export function redactEmails(text: string): string {
  return text.replace(EMAIL, EMAIL_MARKER);
}

const LICENCE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md", "LICENCE"];

/** A package root's licence file, or null. */
export function licenceFileOf(root: string): string | null {
  return LICENCE_FILES.map((f) => join(root, f)).find(existsSync) ?? null;
}

/** The notice as it is shipped: the package's licence file, emails removed, trailing space trimmed. */
export function shippedNotice(root: string): string | null {
  const f = licenceFileOf(root);
  return f ? redactEmails(readFileSync(f, "utf8")).trimEnd() : null;
}

````


## FILE: web/hosted/vercel-output.ts, after the fixes (complete)

````typescript
/**
 * Assembles the hosted demo's upload: Vercel's Build Output API, version 3,
 * with STATIC FILES ONLY (`ADR-0004`, D-H4 ruled A: the prebuilt output is
 * what is deployed).
 *
 * ⚠ **No `functions/` directory is ever written, and `config.json` routes only
 * to files.** Code of ours running per request is `ADR-0004` rotation trigger 1;
 * the hosted gate checks both from the output, not from this file.
 *
 * ⚠ **The Content Security Policy is delivered by `config.json`'s headers**,
 * because a policy set only on a development server does not configure the CDN
 * (`REVIEW-058` R1-8). The framework emits inline scripts for hydration, and
 * each is admitted by its SHA-256 hash rather than by `'unsafe-inline'`.
 *
 *   bun run web/hosted/vercel-output.ts <vite client dir> <output root>
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { HOSTED_PAGES } from "./pages.ts";
import { inlineScripts, scriptHash } from "./csp.ts";

/** The pages below the root, each a directory's index.html. */
const PAGES = HOSTED_PAGES.filter(Boolean);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}


/** The policy, given every inline script the pages carry. Exported for the gate. */
export function contentSecurityPolicy(hashes: string[]): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${[...new Set(hashes)].sort().join(" ")}`.trim(),
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function assemble(clientDir: string, root: string): { files: number; hashes: number } {
  if (!existsSync(join(clientDir, "index.html"))) throw new Error(`${clientDir} has no index.html; is it the hosted build's client output?`);
  for (const p of PAGES) {
    if (!existsSync(join(clientDir, p, "index.html"))) throw new Error(`the page /${p} was not prerendered`);
  }
  const out = join(root, ".vercel", "output");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "static"), { recursive: true });
  cpSync(clientDir, join(out, "static"), { recursive: true, dereference: false });

  const files = walk(join(out, "static"));
  const hashes = files.filter((f) => f.endsWith(".html")).flatMap((f) => inlineScripts(readFileSync(f, "utf8")).map(scriptHash));

  const headers = {
    "Content-Security-Policy": contentSecurityPolicy(hashes),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  };
  const config = {
    version: 3,
    routes: [
      { src: "/(.*)", headers, continue: true },
      // Each page is a directory's index.html; named explicitly rather than
      // relying on the host's directory-index behaviour.
      ...PAGES.map((p) => ({ src: `^/${p}/?$`, dest: `/${p}/index.html` })),
      { handle: "filesystem" },
    ],
  };
  writeFileSync(join(out, "config.json"), JSON.stringify(config, null, 2) + "\n");
  return { files: files.length, hashes: new Set(hashes).size };
}

if (import.meta.main) {
  const [clientDir, root] = process.argv.slice(2);
  if (!clientDir || !root) throw new Error("usage: bun run web/hosted/vercel-output.ts <vite client dir> <output root>");
  const r = assemble(clientDir, root);
  console.log(`assembled ${relative(process.cwd(), join(root, ".vercel/output"))}: ${r.files} static files, ${r.hashes} inline-script hashes in the policy`);
}

````


## FILE: web/hosted/csp.ts, after the fixes (complete)

````typescript
/**
 * Inline-script hashes as a BROWSER computes them, shared by the output
 * assembler and the hosted gate so the two cannot disagree.
 *
 * ⚠ **A hash over the file's bytes is not the hash the browser checks.** The
 * HTML parser normalises line endings before tokenising and replaces every NUL
 * in script text with U+FFFD, and the policy is checked against the PARSED
 * text. TanStack Start's hydration script carries NUL bytes (`i:"\0\0"` in the
 * router's serialised state), so the first build hashed the raw bytes, the
 * browser refused the script on every page, and hydration failed. The gate
 * passed it; `web/hosted/browser-check.ts` caught it.
 */
import { createHash } from "node:crypto";

/** Every inline script's raw body in one HTML document. */
export function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/** The script's text after HTML input-stream preprocessing and script-data tokenisation. */
export function parsedScriptText(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/\u0000/g, "\uFFFD");
}

/** The CSP source expression that admits this inline script. */
export function scriptHash(raw: string): string {
  return `'sha256-${createHash("sha256").update(parsedScriptText(raw), "utf8").digest("base64")}'`;
}

````


## FILE: web/hosted/Dockerfile, after the fixes (complete)

````typescript
# The hosted demo's build image (ADR-0004, the isolated build machine).
#
# Node for Vite, Bun for everything else: the toolchain the hosted build is
# developed and tested with on the host. `bunx vite` runs Vite under Node, by
# its shebang; under Bun alone the prerender step could not reach its own
# preview server. Both bases are pinned by digest, and Bun is copied out of its
# own image rather than installed from a registry at build time.
FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS bun
FROM node:22.23.2-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx
USER node

````


## FILE: web/hosted/pages.ts, after the fixes (complete)

````typescript
/**
 * The hosted demo's pages, by path segment ("" is the overview). One list, read
 * by the Vite build, the output assembler and the gate.
 */
export const HOSTED_PAGES = ["", "capabilities", "observer", "issuer", "wallet", "custody"] as const;

````


## FILE: facility/src/loopback.ts, after the fixes (complete)

````typescript
/**
 * loopback.ts — the facility's ONLY ledger read path.
 *
 * # Why this module exists, and why it refuses rather than warns
 *
 * `CLAIMS.md` **B-15**'s step-7 gate was ruled by the project owner on
 * 2026-08-25: **the facility's ledger reads go to loopback.** Not "should"; the
 * ruling is what opened architecture §6 step 7 at all, and `REVIEW-019` is
 * explicit that *"we ran a local node once" is not the property* — the property
 * is that **every** read the facility makes goes to a node the operator runs.
 *
 * What it is defending against is `CLAIMS.md` **F-23**, and F-23 is
 * **executed**, not reasoned. A `ConfidentialMPTSend` encrypts the amount to
 * the destination's `HolderEncryptionKey` and the issuer's
 * `IssuerEncryptionKey`, **both read from the ledger**. A substituted key fails
 * the proof with `tecBAD_PROOF` — and a `tec` is *applied to the ledger* with
 * every ciphertext in it. On 2026-08-19 that was run on Devnet and the amount
 * **42 was recovered from public ledger data by the party who supplied the
 * wrong key**, while the intended destination could not decrypt it.
 *
 * So a lying ledger source does not cost a transaction. It costs the
 * confidentiality of the amount, permanently, in public. **TLS does not address
 * it** — TLS authenticates the channel to a node the operator chose, and a
 * hostile node lies just as well over TLS.
 *
 * # ⚠ What this module does NOT buy
 *
 * Nothing about the same-host adversary the issue #1 ruling put in scope. That
 * adversary can point this at a different endpoint, or edit the local node's
 * answers. The trust boundary is unchanged and `CLAIMS.md` P-5 still forbids
 * calling any of this secure.
 *
 * # Stricter than the signer, deliberately
 *
 * `signer/src/ledger.rs` accepts the *name* `localhost` as loopback. This
 * accepts only an **address**, never a name, because a name is resolved by
 * something this process does not control and there is no cost to requiring
 * the address. `REVIEW-016` found the hosts `127.attacker.example` and
 * `127.0.0.1@attacker.example` walking through the Rust check that exists
 * *because of* F-23. Those two shapes are negative test inputs in
 * `facility/tests/loopback.test.ts` — written there rather than quoted here, so
 * that they are executed rather than described.
 *
 * ⚠ **"Address" means what `URL` canonicalises to, and that is wider than a
 * dotted quad.** WHATWG `URL` folds `2130706433`, `0177.0.0.1`, `0x7f.1`,
 * `127.1`, a trailing dot and even Unicode digit forms all to `127.0.0.1`
 * before this check ever sees them, so **all of those are ACCEPTED** — and
 * correctly, because every one of them genuinely is loopback. An earlier
 * version of this comment said *"only a dotted-quad literal"* and the session's
 * own review leg then asserted those forms were **refused**, from reasoning
 * rather than from running them. `REVIEW-022`'s Codex leg ran them.
 * `facility/tests/loopback.test.ts` now pins them as accepted, so that a later
 * session cannot "tighten" the check into rejecting real loopback addresses.
 *
 * # ⚠ Redirects are refused, because a redirect is the whole check undone
 *
 * `fetch` follows redirects by default. A loopback endpoint answering `307`
 * could forward the POST — and every one after it — to a remote host, and
 * `LoopbackLedger.open`'s check would have passed on the original URL.
 * `signer/src/ledger.rs` sets `max_redirects(0)` for exactly this reason and
 * this file did not until `REVIEW-022`'s Codex leg found it.
 */

// ---------------------------------------------------------------------------
// The escape hatch, and everything about it is deliberate.
// ---------------------------------------------------------------------------

/**
 * The exact string `WCONF_ACCEPT_REMOTE_LEDGER_RISK` must hold before this
 * module will read a ledger anywhere but loopback.
 *
 * ⚠ **It is a sentence, not a `1`, and that is the point.** A flag that can be
 * set by muscle memory is a flag that gets set by muscle memory. Somebody has
 * to type this, and typing it is the acknowledgement.
 *
 * ⚠ **This does not make a remote endpoint safe. It makes it RECORDED.**
 * `CLAIMS.md` F-23 is executed: on 2026-08-19 an amount was recovered from
 * public ledger data by the party who supplied a wrong key. Nothing here
 * changes that; what changes is that a run which accepted the risk says so, in
 * its output and in its own run record.
 */
export const RISK_ACCEPTANCE_PHRASE =
  "I accept CLAIMS.md F-23: a lying ledger source publishes the amount";

/**
 * Printed to stderr, in full, on every run that uses the hatch.
 *
 * ⚠ **A constant with an asserted wording**, because `CLAIMS.md` E-126 records
 * that the one disclosure surface which was not a constant is where a false
 * sentence lived through a whole round of review — and `REVIEW-022` then found
 * this file's sibling citing a wording test that did not exist. This one has
 * `facility/tests/risk-acceptance.test.ts`.
 */
export const REMOTE_LEDGER_DISCLOSURE = [
  "⚠ THIS RUN IS NOT UNDER B-15's STEP-7 CONDITIONS.",
  "",
  "  The facility's ledger source is REMOTE and is trusted for amount",
  "  confidentiality. CLAIMS.md F-23 is EXECUTED, not theoretical: a source that",
  "  lies about a destination's HolderEncryptionKey makes the signer publish the",
  "  amount encrypted under the liar's key, permanently, in public. TLS does not",
  "  address it — it authenticates the channel to a node someone chose.",
  "",
  "  B-15's step-7 answer was AMENDED by the project owner on 2026-08-25 to",
  "  extend REVIEW-019's named risk acceptance to this demo. That amendment, like",
  "  the ruling it amends, has had NO adversarial review.",
  "",
  "  What a run under this hatch CAN establish: that the transactions serialise,",
  "  that rippled accepts them, that the balances decrypt to what the book",
  "  predicts, and what a full-ledger observer sees.",
  "",
  "  ⚠ It does NOT establish XLS-0096 §10.5's state changes. This sentence said it",
  "  did, while run-facility.ts's own header said it did not — REVIEW-023 found the",
  "  pair. The driver checks the outstanding-amount delta on the float conversion",
  "  and reconciles decrypted balances; there are no per-movement assertions over",
  "  the public amount or the balance version. CLAIMS.md B-18.",
  "",
  "  What it CANNOT establish: anything whatever about the loopback obligation.",
  "  Do not record a run under this hatch as evidence that the facility keeps it.",
].join("\n");

/** A read or a check that must stop the facility, distinct from a bug. */
export class LedgerRefusal extends Error {
  /**
   * @param answeredFrom the origin fields a negative answer carried. Only
   * `REFUSED_LEDGER_ENTRY_MISSING` sets it, because a "not found" is an answer
   * about one ledger and `Snapshot` checks it exactly as it checks a positive one.
   */
  constructor(
    readonly code: string,
    message: string,
    readonly answeredFrom?: { ledger_index?: unknown; validated?: unknown },
  ) {
    super(`${code}: ${message}`);
    this.name = "LedgerRefusal";
  }
}

/**
 * Is this endpoint a loopback literal?
 *
 * Parsing is delegated to `URL`, which is what strips userinfo (`user@host`)
 * and rejects an unterminated `[::1`. A hand-rolled split on `@`, `:` or `]`
 * is exactly how the Rust version acquired two holes.
 */
export function isLoopbackEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return false;
  // `URL.hostname` is the host with userinfo removed and IPv6 brackets kept.
  const host = url.hostname.toLowerCase();
  if (host === "[::1]") return true;
  // Only a dotted-quad literal in 127.0.0.0/8. A name — `localhost` included —
  // is resolved by something outside this process.
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const octets = m.slice(1).map(Number);
  if (octets.some((o) => o > 255)) return false;
  return octets[0] === 127;
}

/** The fields a facility read needs from one holder's `MPToken`. */
export interface MPTokenState {
  /** Public, plaintext MPT balance. Absent means zero. */
  publicAmount: number;
  /**
   * ⚠ **The same value as a DECIMAL STRING, losslessly.**
   * `MPTAmount` is a UINT64 and rippled serialises it as a string for that
   * reason; `publicAmount` above rounds anything over 2^53. The number is kept
   * because the facility does arithmetic on it and its values are small; **any
   * surface that DISPLAYS the amount must use this field** (`CLAIMS.md` E-220,
   * the same defect E-215 fixed on the issuer path and missed here).
   */
  publicAmountRaw: string;
  /** 33-byte compressed ElGamal point, hex — absent until the holder Converts. */
  holderEncryptionKey?: string;
  confidentialBalanceSpending?: string;
  confidentialBalanceInbox?: string;
  /** Present as a JSON **string** when non-zero, absent when zero. */
  confidentialBalanceVersion: number;
  /**
   * ⚠ **The issuer's mandatory decryption mirror.** `CLAIMS.md` P-9: no
   * configuration removes it, so this field is present on every confidential
   * balance and the issuer's ElGamal secret decrypts it.
   *
   * ⚠ **It is a DIFFERENT ciphertext from `confidentialBalanceSpending`, and
   * assuming otherwise costs an afternoon** — measured 2026-08-28: the issuer
   * key against the holder's spending ciphertext returns `rc=-1` from `mptool
   * decrypt`, and against this field returns the balance.
   *
   * Added 2026-08-28 for architecture §6 step 8's issuer view. The facility
   * never read it: it reconciles each party's OWN balance with that party's own
   * key, which is a different question from what the issuer can see.
   */
  issuerEncryptedBalance?: string;
  /** The optional auditor's mirror, present only if an auditor was named. */
  auditorEncryptedBalance?: string;
}

export interface IssuanceState {
  issuer: string;
  /** ⚠ rippled serialises every `UINT64` as a JSON **string**. */
  confidentialOutstandingAmount: number;
  /** ⚠ The same value as a decimal string, losslessly. See `publicAmountRaw`. */
  confidentialOutstandingAmountRaw: string;
  issuerEncryptionKey?: string;
  auditorEncryptionKey?: string;
  transferFee: number;
  flags: number;
}

/**
 * A pinned read.
 *
 * Two `"validated"` reads seconds apart land in **different ledgers** — E-103
 * observed it live against the public cluster. The index is taken once and
 * every later call carries that number, and every answer is checked to have
 * come from it. That check is the part `REVIEW-016` found *"asked for and never
 * checked"* in the Rust version.
 */
export class Snapshot {
  constructor(
    private readonly ledger: LoopbackLedger,
    readonly index: number,
  ) {}

  private async pinned(method: string, params: Record<string, unknown>): Promise<any> {
    let result: any;
    try {
      result = await this.ledger.call(method, { ...params, ledger_index: this.index });
    } catch (e) {
      // ⚠ **A "not found" is an answer, and it is checked like one.** `REVIEW-058`
      // found this path returning before the index check below, so a negative
      // answer naming ledger 43 read as `null` in a snapshot pinned to 42. The
      // Rust reader closed the same gap in `REVIEW-016` round two
      // (`signer/src/ledger.rs`, `ledger_entry`) and this one never got the fix:
      // two readings of one obligation, drifting (`CLAIMS.md` E-141's shape).
      // rippled 3.4.1 names `ledger_index` on `entryNotFound`, measured on
      // Devnet 2026-10-19; an absence that names no ledger proves nothing.
      if (e instanceof LedgerRefusal && e.code === "REFUSED_LEDGER_ENTRY_MISSING") {
        this.cameFrom(`${method} said "not found"`, e.answeredFrom ?? {});
      }
      throw e;
    }
    this.cameFrom(`${method} answered`, result);
    return result;
  }

  /**
   * Did this answer come from the pinned, validated ledger? The same predicate for
   * a positive answer and a negative one.
   *
   * ⚠ **Round one's fix checked the index of a negative answer and stopped there,
   * and `REVIEW-058` round two found the Rust reader's third check still missing.**
   * `signer/src/ledger.rs`'s `came_from` requires `validated` to be exactly `true`
   * and `ledger_index` to be a number, with no fallback; this one accepted
   * `validated: false`, a `ledger_current_index` in place of the index, and the
   * string `"42"`. rippled 3.4.1 sends a numeric `ledger_index` and
   * `validated: true` on every pinned answer, positive or `entryNotFound`
   * (measured on Devnet 2026-10-19), so nothing honest is refused.
   */
  private cameFrom(what: string, r: any): void {
    const index = r?.ledger_index;
    if (r?.validated !== true || typeof index !== "number" || index !== this.index) {
      throw new LedgerRefusal(
        "REFUSED_LEDGER_TORN",
        `${what} from ledger ${typeof index === "number" ? index : JSON.stringify(index ?? null)}` +
          ` (validated: ${JSON.stringify(r?.validated ?? null)}), not the pinned, validated ${this.index}. ` +
          `A snapshot assembled from two ledgers, or from one nobody validated, is a state that never existed`,
      );
    }
  }

  async sequenceOf(address: string): Promise<number> {
    const r = await this.pinned("account_info", { account: address });
    return Number(r.account_data.Sequence);
  }

  /**
   * Whether `address` has an `AccountRoot` in the pinned ledger.
   *
   * Through `ledger_entry` rather than `account_info`, because a missing root
   * answers `entryNotFound`, the one negative answer `pinned` checks for its
   * ledger. Measured on Devnet with rippled 3.4.1 on 2026-10-20: a random
   * address answered `entryNotFound` with `validated: true` and the pinned
   * index. `ADR-0004` needs it so a Devnet reset renders as a missing account
   * and not as an account holding nothing.
   */
  async accountExists(address: string): Promise<boolean> {
    try {
      entryOfType(await this.pinned("ledger_entry", { account_root: address }), "AccountRoot");
      return true;
    } catch (e) {
      if (e instanceof LedgerRefusal && e.code === "REFUSED_LEDGER_ENTRY_MISSING") return false;
      throw e;
    }
  }

  /** Every field of one holder's position, or `null` if they hold no MPToken. */
  async mptoken(address: string, issuanceId: string): Promise<MPTokenState | null> {
    let r: any;
    try {
      r = await this.pinned("ledger_entry", {
        mptoken: { mpt_issuance_id: issuanceId, account: address },
      });
    } catch (e) {
      if (e instanceof LedgerRefusal && e.code === "REFUSED_LEDGER_ENTRY_MISSING") return null;
      throw e;
    }
    const n = entryOfType(r, "MPToken");
    return {
      publicAmount: Number(n.MPTAmount ?? 0),
      publicAmountRaw: String(n.MPTAmount ?? "0"),
      holderEncryptionKey: n.HolderEncryptionKey,
      confidentialBalanceSpending: n.ConfidentialBalanceSpending,
      confidentialBalanceInbox: n.ConfidentialBalanceInbox,
      confidentialBalanceVersion: Number(n.ConfidentialBalanceVersion ?? 0),
      issuerEncryptedBalance: n.IssuerEncryptedBalance,
      auditorEncryptedBalance: n.AuditorEncryptedBalance,
    };
  }

  async issuance(issuanceId: string): Promise<IssuanceState> {
    const r = await this.pinned("ledger_entry", { mpt_issuance: issuanceId });
    const n = entryOfType(r, "MPTokenIssuance");
    return {
      issuer: n.Issuer,
      // ⚠ **A JSON string, as rippled serialises every `UINT64`.** Reading it
      // with a numeric helper sees every value as absent, and a preflight check
      // that always passes looks identical to one that works. The signer has a
      // control test for exactly this; so does `facility/tests`.
      confidentialOutstandingAmount: Number(n.ConfidentialOutstandingAmount ?? 0),
      confidentialOutstandingAmountRaw: String(n.ConfidentialOutstandingAmount ?? "0"),
      issuerEncryptionKey: n.IssuerEncryptionKey,
      auditorEncryptionKey: n.AuditorEncryptionKey,
      transferFee: Number(n.TransferFee ?? 0),
      flags: Number(n.Flags ?? 0),
    };
  }
}

/**
 * The node must be the kind of object that was asked for. Without this a node
 * could return an `MPTokenIssuance` where an `MPToken` was requested, and the
 * reader would take whichever fields happened to have the right names. The Rust
 * reader has checked this since `REVIEW-016`; this one did not until `REVIEW-058`.
 */
function entryOfType(r: any, expected: string): any {
  const n = r?.node;
  if (!n || typeof n !== "object") {
    throw new LedgerRefusal("REFUSED_LEDGER_MALFORMED", `ledger_entry returned no node`);
  }
  if (n.LedgerEntryType !== expected) {
    throw new LedgerRefusal(
      "REFUSED_LEDGER_MALFORMED",
      `ledger_entry was asked for a ${expected} and returned a ${String(n.LedgerEntryType ?? "(no LedgerEntryType)")}`,
    );
  }
  return n;
}

export interface NodeIdentity {
  buildVersion: string;
  gitHash?: string;
  networkId: number;
  serverState: string;
  validatedIndex: number;
  /** Whether the endpoint is a loopback address. */
  isLoopback: boolean;
}

/** Devnet, and nothing else. `CLAUDE.md`'s hard rule, checked before any read. */
const DEVNET_NETWORK_ID = 2;

export class LoopbackLedger {
  private constructor(
    readonly endpoint: string,
    readonly identity: NodeIdentity,
  ) {}

  /**
   * Open the facility's ledger source.
   *
   * Refuses a non-loopback endpoint **before it connects**, so a misconfigured
   * facility cannot leak the shape of its reads to a remote host on the way to
   * failing.
   */
  static async open(endpoint: string): Promise<LoopbackLedger> {
    const loopback = isLoopbackEndpoint(endpoint);
    if (!loopback) assertRemoteRiskAccepted(endpoint);
    const identity = await LoopbackLedger.probe(endpoint);
    identity.isLoopback = loopback;
    if (identity.networkId !== DEVNET_NETWORK_ID) {
      throw new LedgerRefusal(
        "REFUSED_NOT_DEVNET",
        `network_id ${identity.networkId}, expected ${DEVNET_NETWORK_ID} (Devnet). ` +
          `This project never writes to any other network, at any phase, for any reason`,
      );
    }
    if (identity.serverState !== "full") {
      throw new LedgerRefusal(
        "REFUSED_NODE_NOT_FULL",
        `the local node reports server_state "${identity.serverState}". A node that is running ` +
          `is not a node that can answer a pinned read; wait for it with ` +
          `tools/loopback-node/node.sh wait`,
      );
    }
    return new LoopbackLedger(endpoint, identity);
  }

  private static async probe(endpoint: string): Promise<NodeIdentity> {
    const info = (await rawCall(endpoint, "server_info", {})).info;
    return {
      buildVersion: info.build_version,
      gitHash: info.git?.hash,
      networkId: Number(info.network_id),
      serverState: info.server_state,
      validatedIndex: Number(info.validated_ledger?.seq ?? 0),
      // Overwritten by `open`, which is the only caller and the only place that
      // knows whether the hatch was used. Defaulting to the SAFE answer here
      // means a future second caller that forgets cannot silently claim the
      // permissive one.
      isLoopback: false,
    };
  }

  /**
   * How many submissions went out **without** `fail_hard`.
   *
   * ⚠ Counted here because this is the only place that sees every RPC **made
   * after the connection is open** — which is not the same as every RPC, and
   * the comment said it was until `REVIEW-023` round two. `probe` reaches the
   * node through `rawCall`, so the `server_info` every connection makes never
   * passes through `call`. That costs nothing today because no submission goes
   * through `probe`; what it costs is a reader who believes nothing can get
   * past this, and adds a `rawCall` submit inside this file.
   *
   * The facility's own submitter cannot omit the flag, but `run-facility.ts`'s
   * fail-hard control deliberately makes one unflagged submission through
   * `call` — and B-15's Part C says *"whatever submits"*, with no control-arm
   * exception in the ruling's text.
   */
  private unflagged = 0;

  /**
   * ⚠ **Whether BOTH halves of B-15's step-7 answer were in force for the whole
   * of this connection's life.**
   *
   * Loopback **and** no unflagged submission. It measured only the first until
   * `REVIEW-023` pointed out that every run of `run-facility.ts` makes an
   * unflagged submission before the stamp is written — so a future loopback run
   * would have been recorded as *"both halves in force"* while having submitted
   * once without the flag. The stamp is what a later reader trusts instead of
   * re-deriving; a stamp that measures one half and claims two is worse than
   * none.
   *
   * ⚠ It is a **getter, not a field**, because the answer changes during the
   * run. Read it when you record, not when you connect.
   */
  get underB15Conditions(): boolean {
    return this.identity.isLoopback && this.unflagged === 0;
  }

  /** Why the answer above is what it is, in words a run record can carry. */
  get b15Note(): string {
    if (!this.identity.isLoopback) {
      return (
        "REMOTE endpoint under the accepted-risk hatch (CLAIMS.md E-151). The loopback half " +
        "of B-15's step-7 answer was NOT in force. This run is not evidence about the loopback " +
        "obligation (CLAIMS.md F-23)"
      );
    }
    if (this.unflagged > 0) {
      return (
        `loopback, but ${this.unflagged} submission(s) went out without tapFailHard — the ` +
        `fail-hard control's own second arm does this deliberately. B-15's Part C says ` +
        `"whatever submits" and names no exception, so both halves were not in force for the ` +
        `whole of this run`
      );
    }
    return "loopback and every submission flagged: both halves of B-15's step-7 answer in force";
  }

  async call(method: string, params: Record<string, unknown>): Promise<any> {
    // ⚠ **Every method that submits, not just `submit`.** It matched the exact
    // string until `REVIEW-023` round two pointed at `submit_multisigned`,
    // which is also a submission and also takes `fail_hard`. Nothing here uses
    // it; a counter that has to be right about which submission APIs exist is
    // a counter that goes wrong when one is added, so it asks the broader
    // question. A non-boolean `fail_hard` — the string `"true"`, say — counts
    // as unflagged, which is the conservative answer and the right one.
    if (method.startsWith("submit") && params.fail_hard !== true) this.unflagged++;
    return rawCall(this.endpoint, method, params);
  }

  /** Pin one validated index. Everything the facility reads comes from it. */
  async snapshot(): Promise<Snapshot> {
    const info = (await this.call("server_info", {})).info;
    // ⚠ `open` checked the network once, and this second answer was taken on
    // trust. A public endpoint is a pool, so it can come from another server;
    // one that is not Devnet is refused here too (`REVIEW-059` R1-9).
    if (Number(info.network_id) !== DEVNET_NETWORK_ID) {
      throw new LedgerRefusal(
        "REFUSED_NOT_DEVNET",
        `the server that answered for the snapshot reports network_id ${JSON.stringify(info.network_id ?? null)}, ` +
          `not ${DEVNET_NETWORK_ID} (Devnet), although the one that answered open() did`,
      );
    }
    const seq = Number(info.validated_ledger?.seq ?? 0);
    if (!Number.isInteger(seq) || seq <= 0) {
      throw new LedgerRefusal("REFUSED_NO_VALIDATED_LEDGER", "the node has no validated ledger");
    }
    return new Snapshot(this, seq);
  }

  /** The current (not yet validated) index, for `LastLedgerSequence`. */
  async currentIndex(): Promise<number> {
    const r = await this.call("ledger_current", {});
    return Number(r.ledger_current_index);
  }
}

/**
 * Refuse a non-loopback endpoint unless the risk has been accepted **by name**.
 *
 * ⚠ **Three refusals, not one.** An unset variable, a variable set to something
 * else, and the accepted case are different situations and a caller who gets
 * them confused is a caller who thinks they turned the hatch on. `REVIEW-013c`
 * §3a B-VII is the standing reason: a refusal a client renders as "please try
 * again" is a loud refusal made quiet.
 */
function assertRemoteRiskAccepted(endpoint: string): void {
  const accepted = process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
  if (accepted === RISK_ACCEPTANCE_PHRASE) {
    // stderr, not stdout: a disclosure that can be lost to a pipe is a
    // disclosure that will be.
    process.stderr.write(`\n${REMOTE_LEDGER_DISCLOSURE}\n\n  endpoint: ${endpoint}\n\n`);
    return;
  }
  if (accepted !== undefined) {
    throw new LedgerRefusal(
      "REFUSED_RISK_NOT_ACCEPTED",
      `WCONF_ACCEPT_REMOTE_LEDGER_RISK is set, but not to the acceptance sentence. It must be ` +
        `EXACTLY:\n\n    ${RISK_ACCEPTANCE_PHRASE}\n\n` +
        `A near miss is refused rather than accepted, because a hatch that opens on anything ` +
        `truthy is a hatch that opens by accident`,
    );
  }
  throw new LedgerRefusal(
    "REFUSED_NOT_LOOPBACK",
    `${endpoint} is not a loopback address. CLAIMS.md B-15's step-7 ruling requires the ` +
      `facility's ledger reads to go to a node the operator runs, and a remote endpoint ` +
      `reopens F-23 — which is executed, not theoretical. Start one with ` +
      `tools/loopback-node/node.sh start.\n\n` +
      `To proceed against a remote endpoint anyway — which the project owner amended B-15's ` +
      `answer to allow on 2026-08-25, for a Devnet demo with throwaway keys and NOT for ` +
      `anything else — set WCONF_ACCEPT_REMOTE_LEDGER_RISK to the acceptance sentence in ` +
      `facility/README.md. The run will say so in its output and in its own record`,
  );
}

/**
 * Whether two URLs name the same endpoint, ignoring the trailing slash `fetch`
 * adds to `response.url`.
 *
 * Exported so the comparison can be tested directly: the path that reaches it
 * in `rawCall` requires a runtime that ignores `redirect: "error"`, which is not
 * a state a test can produce — and an untestable check is one nobody finds out
 * is wrong until it fires in production, which is exactly what happened to its
 * first version.
 */
export function sameEndpoint(a: string, b: string): boolean {
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
}

async function rawCall(
  endpoint: string,
  method: string,
  params: Record<string, unknown>,
): Promise<any> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params: [params] }),
      // ⚠ **A redirect is the loopback check undone.** `fetch` follows them by
      // default; `307`/`308` preserve the method and body, so a loopback
      // responder could forward this POST to a remote host and every later
      // call with it. `error` makes the fetch reject instead.
      redirect: "error",
    });
  } catch (e) {
    throw new LedgerRefusal("REFUSED_LEDGER_UNAVAILABLE", `${method}: ${String(e)}`);
  }
  // Belt as well as braces: if a runtime ever honoured a redirect anyway, the
  // response carries the final URL and it must be the one we asked.
  //
  // ⚠ **This compared against LOOPBACK-ness until the first run under the
  // accepted-risk hatch, and that was wrong in both directions.** It refused
  // every remote endpoint even when the risk had been accepted — which is how
  // it was found, by running the artifact rather than by reading it — and it
  // would have *accepted* a redirect from one loopback port to another. The
  // invariant a redirect violates is "the answer came from where I asked", and
  // that is what this checks now. `CLAIMS.md` E-139: running the artifact
  // catches what a fix leaves standing.
  if (response.url && !sameEndpoint(response.url, endpoint)) {
    throw new LedgerRefusal(
      "REFUSED_REDIRECTED",
      `${method}: asked ${endpoint} and the answer came from ${response.url}. A redirect is ` +
        `the endpoint check undone`,
    );
  }
  if (!response.ok) {
    throw new LedgerRefusal("REFUSED_LEDGER_UNAVAILABLE", `${method}: HTTP ${response.status}`);
  }
  const body: any = await response.json();
  const result = body.result;
  if (!result) throw new LedgerRefusal("REFUSED_LEDGER_MALFORMED", `${method}: no result`);
  if (result.status === "error") {
    // `entryNotFound` is an answer, not a failure — a holder who has not opted
    // in has no `MPToken`, and the caller distinguishes that from a broken read.
    // ⚠ Only `entryNotFound`, as the Rust reader tolerates. This also accepted
    // `objectNotFound` until `REVIEW-058` round two; no pinned read here can
    // receive it, and a tolerance nothing needs is a tolerance something abuses.
    const missing = result.error === "entryNotFound";
    const code = missing ? "REFUSED_LEDGER_ENTRY_MISSING" : "REFUSED_LEDGER_ERROR";
    // The origin fields a negative answer carries travel with it, so `Snapshot`
    // checks it exactly as it checks a positive answer.
    const answeredFrom = missing ? { ledger_index: result.ledger_index, validated: result.validated } : undefined;
    throw new LedgerRefusal(code, `${method}: ${result.error} ${result.error_message ?? ""}`, answeredFrom);
  }
  return result;
}

````


## FILE: web/api/observer.ts, after the fixes (complete)

````typescript
/**
 * What a full-ledger observer sees.
 *
 * ⚠ **A demo of the happy path is not evidence of confidentiality** — this is
 * the surface that says what is actually public, and its first duty is
 * `CLAIMS.md` **F-1**: a freshly-initialised or post-merge balance is
 * **publicly identifiable as exactly zero**, because `EncZero` is canonical and
 * recomputable by anyone from the holder's public key, the account id and the
 * issuance id. The observer harness proves that by recomputing it
 * independently; this view reports it.
 *
 * ⚠ **P-4 and P-11 govern every sentence here.** Sender, receiver, timing and
 * frequency are public. Only amounts are hidden.
 */

import type { Snapshot } from "../../facility/src/loopback.ts";
import { canonicalEncZero } from "../../tools/observer-harness.ts";

export interface ObserverView {
  account: string;
  issuanceId: string;
  /**
   * Public and plaintext. Not hidden by anything.
   *
   * ⚠ **A DECIMAL STRING.** `MPTAmount` is a UINT64 and a JS `Number` rounds
   * anything over 2^53 — the issuer path was fixed for this (E-215) and this
   * one was missed, which is the fix-the-instance-not-the-phrase shape again
   * (`CLAIMS.md` E-220).
   */
  publicAmount: string;
  registered: boolean;
  holderEncryptionKey?: string;
  confidentialBalanceVersion: number;
  /** ⚠ The whole point of F-1. */
  spending: CiphertextView | null;
  inbox: CiphertextView | null;
  issuance: {
    issuer: string;
    /** ⚠ PLAINTEXT on the issuance object. The sum of every hidden position. */
    /** ⚠ A decimal string, for the same reason as `publicAmount`. */
    confidentialOutstandingAmount: string;
    hasIssuerKey: boolean;
    hasAuditorKey: boolean;
  };
  whatIsPublic: string[];
  whatIsHidden: string[];
}

export interface CiphertextView {
  ciphertext: string;
  /** True when the ciphertext equals the canonical encryption of zero. */
  publiclyKnownZero: boolean;
  note: string;
}

/** Everything on an observer page that is readable with no secret at all. */
export const WHAT_IS_PUBLIC: string[] = [
  "The account's address, and every account it has transacted with (P-4).",
  "When each transaction happened, and how often (P-11).",
  "The public MPT balance.",
  "The issuance's ConfidentialOutstandingAmount: the total of all confidential balances.",
  "The holder's encryption key, once registered.",
  "The ConfidentialBalanceVersion, which counts changes to the balance.",
  "Whether a confidential balance is exactly zero, when it holds the canonical encryption of zero. " +
    "New, merged and clawed-back balances do; a balance spent down to zero does not (F-1, E-211).",
  "Each tranche size, when a position is retired in tranches: the amount is plaintext on every ConvertBack (F-24).",
];

/**
 * ⚠ **The complete list, and it is two items.** Anything not here is public.
 */
export const WHAT_IS_HIDDEN: string[] = [
  "The value of a confidential balance that is not the canonical encryption of zero, even when " +
    "that value is zero (E-211).",
  "The amount of each ConfidentialMPTSend.",
  "Both are hidden from observers, not from the issuer (P-9). Nothing else here is hidden.",
];

/** ⚠ F-1, stated where it is true rather than in a footnote. */
export const CANONICAL_ZERO_NOTE =
  "Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can " +
  "recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).";

/**
 * ⚠⚠ **THIS SAID "Non-zero, and the amount is hidden from an observer" AND THAT
 * WAS FALSE (`CLAIMS.md` E-211).**
 *
 * Measured on Devnet 2026-08-28: holder `rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8`
 * decrypts to **0** through the issuer mirror, while its
 * `ConfidentialBalanceSpending` does **not** match the canonical `EncZero`.
 * **A balance can be exactly zero and not publicly identifiable as zero** —
 * F-1's canonical form is used on first-time init, merge reset and clawback, so
 * a balance that reached zero by SPENDING is a homomorphic result: a randomised
 * encryption of zero that matches nothing.
 *
 * ⚠ `tools/observer-harness.ts:277` had the correct hedge — *"not the canonical
 * zero (some non-zero value, or never reset)"* — and this tier flattened it into
 * a flat claim. **The correct source was one import away.**
 */
export const NOT_CANONICAL_NOTE =
  "Not the canonical encryption of zero, so an observer cannot tell the value. That is not the " +
  "same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. " +
  "The issuer can still decrypt it (P-9).";

function classify(ciphertext: string | undefined, encZero: string | null): CiphertextView | null {
  if (!ciphertext) return null;
  if (encZero && ciphertext.toUpperCase() === encZero) {
    return {
      ciphertext,
      publiclyKnownZero: true,
      note: CANONICAL_ZERO_NOTE,
    };
  }
  return {
    ciphertext,
    publiclyKnownZero: false,
    note: NOT_CANONICAL_NOTE,
  };
}

export async function observerView(snap: Snapshot, account: string, issuanceId: string): Promise<ObserverView> {
  const mpt = await snap.mptoken(account, issuanceId);
  const iss = await snap.issuance(issuanceId);
  return viewOf(account, issuanceId, mpt, iss);
}

/**
 * The view, from answers already read. ⚠ The hosted snapshot read a position,
 * then called `observerView`, which read it AGAIN; a second answer that said
 * "not found" rendered as zeros under the state `present` (`REVIEW-059` R1-8).
 * A caller that has read the position passes it here instead of reading twice.
 */
export function viewOf(account: string, issuanceId: string, mpt: any, iss: any): ObserverView {
  const key = mpt?.holderEncryptionKey;
  const encZero = key ? canonicalEncZero(key, account, issuanceId) : null;

  return {
    account,
    issuanceId,
    publicAmount: mpt?.publicAmountRaw ?? "0",
    registered: Boolean(key),
    holderEncryptionKey: key,
    confidentialBalanceVersion: mpt?.confidentialBalanceVersion ?? 0,
    spending: classify(mpt?.confidentialBalanceSpending, encZero),
    inbox: classify(mpt?.confidentialBalanceInbox, encZero),
    issuance: {
      issuer: iss.issuer,
      confidentialOutstandingAmount: iss.confidentialOutstandingAmountRaw,
      hasIssuerKey: Boolean(iss.issuerEncryptionKey),
      hasAuditorKey: Boolean(iss.auditorEncryptionKey),
    },
    whatIsPublic: WHAT_IS_PUBLIC,
    whatIsHidden: WHAT_IS_HIDDEN,
  };
}

````


## FILE: web/api/demo-accounts.ts, after the fixes (complete)

````typescript
/**
 * Known Devnet accounts, so the demonstration does not open on an empty form.
 *
 * ⚠⚠ **PUBLIC LEDGER DATA ONLY, AND THE OMISSION IS DELIBERATE.** An account
 * address and an `MPTokenIssuanceID` are readable by anyone with a block
 * explorer — that is `CLAIMS.md` P-4 and P-11, and rendering them gives nothing
 * away that the protocol was hiding.
 *
 * ⚠ **`/tmp/wconf/state.json` IS NOT READ AND MUST NOT BE.** That file holds
 * throwaway account seeds and ElGamal secrets. The addresses below were
 * transcribed from it by hand, once, and **the secrets stayed there** — a
 * read-only rendering tier that opens a file full of seed material has become
 * something else, whatever it does with the contents. If this list needs to
 * grow, transcribe the public fields again rather than teaching this process to
 * read that file.
 *
 * ⚠ **It is a convenience, not a registry.** The observer and issuer views take
 * any account and issuance; this only saves pasting 34 and 48 characters.
 */

export interface DemoAccount {
  address: string;
  issuanceId: string;
  label: string;
  /** What this account is useful for showing. Rendered, so it is a claim. */
  note: string;
}

/** The issuance every account below holds. */
export const DEMO_ISSUANCE = "004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    address: "rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder A — an active position",
    // ⚠ This note described the account's balances, which are a ledger reading
    // and change whenever anyone sends to it; the page prints the reading
    // beside it (`REVIEW-059` R1-14). Notes describe the account, never its state.
    note: "One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).",
  },
  {
    address: "rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder B — a derived-key account",
    note:
      "Onboarded with the derived key, so its ElGamal key comes from its master seed.",
  },
  {
    address: "rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbY",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder C — the ed25519 signing account",
    note:
      "The account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer " +
      "cannot see the signing change.",
  },
  {
    address: "rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWH",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder D — an early spike account",
    note: "An early test account, kept as a second position to compare against.",
  },
];

/**
 * ⚠ **Every entry is checked to be a plausible address and issuance id before
 * it is served**, because a typo here renders as "this account holds nothing"
 * — which reads exactly like a true statement about the ledger.
 */
export function validDemoAccounts(): DemoAccount[] {
  return DEMO_ACCOUNTS.filter(
    (a) => /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a.address) && /^[0-9A-F]{48}$/.test(a.issuanceId),
  );
}

````


## FILE: web/api/custody-sim.ts, after the fixes (complete)

````typescript
/**
 * The custody demo mode — architecture §6 step 8, decision D4.
 *
 * ⚠⚠ **THIS IS A SIMULATION AND EVERY VALUE IT RETURNS SAYS SO.** There is no
 * custody-platform integration behind it, no MPC and no HSM. It models a
 * **key-source shape** — a standalone ElGamal key plus an external signer — and
 * walks each flow to report which survive and which break, and why.
 *
 * ⚠ `CLAIMS.md` **P-5** forbids claiming more than is delivered, and
 * *"custody-compatible"* over a stub is exactly that kind of claim.
 * `disclosure.test.ts` fails if any surface stops saying this, and that test is
 * verified by breaking it.
 *
 * **What makes it more than a mock:** the verdicts are not hand-written per
 * flow. Each flow declares which *capabilities* it needs, and the verdict is
 * computed from what a custody-shaped key source actually has — so a flow added
 * later cannot be quietly marked "works".
 */

/** What a step of a flow requires. The only inputs a verdict is computed from. */
export type Requirement =
  | "xrpl-signature"        // the account key signs. A custody platform does this.
  | "elgamal-decrypt"       // read own confidential balance.
  | "elgamal-prove"         // produce the ZK proof over hidden values.
  | "policy-over-amount"    // an approval rule that reads the transferred value.
  | "policy-over-identity"  // an approval rule over destination, issuance or time.
  | "seed-material";        // the raw master seed must be available.

/**
 * What a **custody-shaped** key source has, and what it structurally cannot.
 *
 * ⚠ Derived from the two findings in `docs/research/CUSTODY-2026-08-28.md`, not
 * from a wish-list: seed material never leaves the platform (that is the
 * product), and an approval engine sees a proof rather than a value.
 */
export const CUSTODY_SHAPE: Record<Requirement, { available: boolean; because: string; caveat?: string }> = {
  "xrpl-signature": {
    available: true,
    because: "Signing is what a custody platform is for. The account key never leaves its boundary.",
  },
  "elgamal-decrypt": {
    available: true,
    because:
      "Only with a standalone ElGamal key, which moves the problem rather than solving it: something " +
      "outside the custody platform then holds a permanent decryption key for every balance this " +
      "account has held. Who that should be has had no review (CLAIMS.md E-117).",
    // ⚠ A flow that needs this survives only on that condition, so the walk
    // reports it on each flow. It was keyed on a "⚠" inside `because` until
    // 2026-10-20; the wording pass removed the marks, and a field cannot be
    // dropped by rewording a sentence.
    caveat: "Only with a standalone ElGamal key, held outside the custody platform (E-117).",
  },
  "elgamal-prove": {
    available: true,
    because: "The same standalone key. Proving needs the same secret decrypting does.",
  },
  "policy-over-amount": {
    available: false,
    because:
      "Structural: the transaction carries a proof, not a value, so a rule like 'two approvers above " +
      "$1M' has no amount to read. It is hidden from this simulation's policy engine too, which holds " +
      "only public data.",
  },
  "policy-over-identity": {
    available: true,
    because:
      "Destination, issuance and timing are public (CLAIMS.md P-4, P-11). Every policy over an " +
      "identity, a time or a count survives; every policy over a value does not.",
  },
  "seed-material": {
    available: false,
    because:
      "Structural in this simulation: a custody platform never releases seed material, so the account " +
      "cannot derive its own ElGamal key outside the platform. A platform that ran the derivation " +
      "inside its own boundary would change this, and that needs the derivation published (issue #10).",
  },
};

export interface Flow {
  id: string;
  label: string;
  requires: Requirement[];
}

export const FLOWS: Flow[] = [
  { id: "public-payment", label: "Send a public XRPL payment", requires: ["xrpl-signature"] },
  { id: "onboard-derived", label: "Onboard with the ruled derived key", requires: ["seed-material", "xrpl-signature"] },
  { id: "onboard-standalone", label: "Onboard with a standalone ElGamal key", requires: ["xrpl-signature", "elgamal-decrypt"] },
  { id: "read-own-balance", label: "Read own confidential balance", requires: ["elgamal-decrypt"] },
  { id: "confidential-send", label: "Send a confidential amount", requires: ["elgamal-decrypt", "elgamal-prove", "xrpl-signature"] },
  { id: "confidential-send-capped", label: "Send confidentially, under an amount-capped approval policy", requires: ["elgamal-decrypt", "elgamal-prove", "xrpl-signature", "policy-over-amount"] },
  { id: "confidential-send-allowlist", label: "Send confidentially, under a destination-allowlist policy", requires: ["elgamal-decrypt", "elgamal-prove", "xrpl-signature", "policy-over-identity"] },
  { id: "retire-tranches", label: "Retire a position in tranches", requires: ["elgamal-decrypt", "elgamal-prove", "xrpl-signature"] },
];

export interface FlowVerdict {
  id: string;
  label: string;
  survives: boolean;
  blockedBy: { requirement: Requirement; because: string }[];
  caveats: string[];
}

/** ⚠ Computed, never hand-written per flow. */
export function walkFlows(): { simulation: true; disclaimer: string; flows: FlowVerdict[] } {
  const flows = FLOWS.map((f) => {
    const blockedBy = f.requires
      .filter((r) => !CUSTODY_SHAPE[r].available)
      .map((r) => ({ requirement: r, because: CUSTODY_SHAPE[r].because }));
    const caveats = f.requires
      .filter((r) => CUSTODY_SHAPE[r].available && CUSTODY_SHAPE[r].caveat)
      .map((r) => CUSTODY_SHAPE[r].caveat!);
    if (f.id === "retire-tranches") {
      caveats.push(
        "Each tranche size and its timing is public: the amount is plaintext on every ConvertBack (CLAIMS.md F-24).",
      );
    }
    return { id: f.id, label: f.label, survives: blockedBy.length === 0, blockedBy, caveats };
  });

  return {
    simulation: true,
    disclaimer:
      "SIMULATION. No custody platform is integrated behind this: no MPC and no HSM. It models a " +
      "standalone ElGamal key plus an external signer, to show which flows survive and which break. " +
      "See docs/research/CUSTODY-2026-08-28.md.",
    flows,
  };
}

````


## FILE: web/app/src/views/CustodyView.tsx, after the fixes (complete)

````typescript
/**
 * The custody page, a simulation.
 *
 * ⚠ Rendered by the local tier's route and by the hosted build's route alike,
 * so the page has one body and the two cannot drift (`ADR-0004`; `CLAIMS.md`
 * E-141's shape is a second copy of one text).
 *
 * The capability matrix's custody row is not repeated here: the two findings
 * say the same thing, and the matrix page carries the row.
 */
import { Panel } from "../components/Verdict";

export function CustodyView({ sim }: { sim: { flows: any[] } }) {
  // A caveat that several flows share is printed once, numbered, and each flow points at it.
  const counts = new Map<string, number>();
  for (const f of sim.flows) for (const c of f.caveats as string[]) counts.set(c, (counts.get(c) ?? 0) + 1);
  const notes = [...counts].filter(([, n]) => n > 1).map(([c]) => c);
  return (
    <>
      <Panel title="This is a simulation" tone="warn">
        <p className="text-sm leading-relaxed">
          No custody platform is integrated behind this page: no MPC, no HSM, no Harmonize. It
          models a key-source shape, a standalone ElGamal key plus an external signer, to show which
          flows survive and which break.
        </p>
      </Panel>

      <Panel title="Two findings">
        <div className="text-sm space-y-5">
          <div>
            <h3 className="font-semibold mb-1">1. The derived key does not work with custodial key management</h3>
            <p className="opacity-85 leading-relaxed">
              The ElGamal secret is derived from the master seed, and a custody platform never releases
              the seed. So the account cannot derive its own ElGamal key or read its own confidential
              balance outside the platform. A platform that ran the derivation inside its own boundary
              would change that; it would need the derivation published as a standard, and it is not
              (issue #10).
            </p>
            <p className="opacity-85 leading-relaxed mt-2">
              A standalone ElGamal key gets around this, but then something outside the custody
              platform holds a permanent decryption key. Who that should be is an open question in
              this project (CLAIMS.md E-117).
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">2. Approval policies cannot read a confidential amount</h3>
            <p className="opacity-85 leading-relaxed">
              An approval workflow that holds only public data sees a proof, not a value, so a rule
              like <em>&ldquo;two approvers above $1M&rdquo;</em> has nothing to check. This is
              structural, not an integration detail: confidentiality and amount-based approval
              policies pull against each other. The ways out each cost something: give the policy
              engine the ElGamal secret, and it becomes another party that reads every balance;
              accept the holder&rsquo;s statement of the amount, and the policy rests on the
              holder&rsquo;s honesty; or prove the bound in zero knowledge, which this project
              has neither built nor costed.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Which flows survive, and which break">
        <p className="text-sm mb-2 opacity-80">
          Each flow lists what it needs, and the verdict is computed from what a custody-shaped key
          source has.
        </p>
        {notes.map((c, i) => (
          <p key={c} className="text-sm mb-2 opacity-80">Note {i + 1}: {c}</p>
        ))}
        <div className="mb-4" />
        <div className="space-y-3">
          {sim.flows.map((f: any) => (
            // ⚠ A class, not a `style` attribute: the hosted build's Content
            // Security Policy blocks inline style attributes (ADR-0004).
            <div key={f.id} className={`border-l-2 pl-3 ${f.survives ? "border-[var(--color-public)]" : "border-[var(--color-warn)]"}`}>
              <div className="text-sm font-medium">
                {f.survives ? "survives" : "breaks"}: {f.label}
                {notes.map((c, i) => (f.caveats.includes(c) ? <span key={c} className="font-normal opacity-70"> (note {i + 1})</span> : null))}
              </div>
              {f.blockedBy.map((b: any) => (
                <p key={b.requirement} className="text-xs opacity-80 mt-1">{b.because}</p>
              ))}
              {f.caveats.filter((c: string) => !notes.includes(c)).map((c: string) => (
                <p key={c} className="text-xs opacity-70 mt-1">{c}</p>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

````


## FILE: web/app/src/hosted/Footer.tsx, after the fixes (complete)

````typescript
/**
 * The footer: what built this page, and whether its gate passed (`ADR-0004`,
 * `REVIEW-058` S-8 and R2-3).
 *
 * ⚠ **The verdict cannot be compiled into the page it judges**, because the
 * gate runs over the finished output. The gate writes `/gate-verdict.json`
 * after it passes, listing a digest of every other file, and this component
 * reads it from the same host. A missing file renders as missing, never as a
 * pass.
 */
import { useEffect, useState } from "react";
import { SNAPSHOT } from "./data";

const REPO = "https://github.com/nandanito/xrpl-confidential-positions";

export function Footer() {
  const [verdict, setVerdict] = useState("not loaded (it is read from /gate-verdict.json once the page's script runs)");
  useEffect(() => {
    fetch("/gate-verdict.json", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((v: any) =>
        setVerdict(
          v?.verdict === "PASS"
            ? `PASS, ${v.files} files, output digest ${String(v.outputDigest).slice(0, 16)}…, checked ${v.checkedAt}`
            : `not a pass: ${JSON.stringify(v?.verdict ?? null)}`,
        ),
      )
      .catch((e) => setVerdict(`missing: no gate verdict was published with this build (${String(e)})`));
  }, []);
  const c = SNAPSHOT.commit;
  return (
    <footer className="mt-12 pt-6 border-t border-black/10 dark:border-white/15 text-xs opacity-70 space-y-1">
      <p>
        Built from commit <a className="underline" href={`${REPO}/commit/${c}`}><code>{c.slice(0, 12)}</code></a> of
        the public repository. Ledger values were read at validated ledger {SNAPSHOT.source.ledgerIndex} on{" "}
        {SNAPSHOT.readAt}.
      </p>
      <p>
        This page is published at <code>{SNAPSHOT.canonicalUrl}</code>. A copy hosted anywhere else
        is not this build.
      </p>
      <p>
        Gate verdict: <span data-gate-verdict="">{verdict}</span>{" "}
        (<a className="underline" href="/gate-verdict.json">gate-verdict.json</a>). This is the gate's record,
        published with the build; your browser shows it and does not check it against the files it loaded.
      </p>
      <p>
        Third-party licences for the code in these pages:{" "}
        <a className="underline" href="/third-party-licenses.txt">third-party-licenses.txt</a>
      </p>
    </footer>
  );
}

````


## FILE: web/app/vite.hosted.config.ts, after the fixes (complete)

````typescript
/**
 * The hosted demo's build: `ADR-0004`, architecture §6 step 9.
 *
 * ⚠ **A second build target, not a replacement.** `vite.config.ts` is the local
 * tier and is untouched. This one builds `src/hosted/`, prerenders every page
 * from the build's one snapshot, and emits static files only.
 *
 * ⚠ **Nothing from the build machine's environment reaches the bundle.**
 * `REVIEW-058` M11: a `VITE_` variable set on the build machine was inlined into
 * the client bundle without appearing in the source. `envPrefix` names a prefix
 * nothing sets, and `web/hosted/build.ts` sets canary variables under both
 * prefixes and fails if either value appears in the output.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { HOSTED_PAGES } from "../hosted/pages.ts";
import { LICENCE_FILE_HEADER, shippedNotice } from "../hosted/licence-notices.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_PATH = resolve(HERE, "../hosted/.build/snapshot.json");
const VIRTUAL = "virtual:wconf-snapshot";

/** The build's one snapshot, as a module. A missing snapshot fails the build. */
function hostedSnapshot(): Plugin {
  return {
    name: "wconf-hosted-snapshot",
    resolveId(id) {
      return id === VIRTUAL ? `\0${VIRTUAL}` : null;
    },
    load(id) {
      if (id !== `\0${VIRTUAL}`) return null;
      if (!existsSync(SNAPSHOT_PATH)) {
        throw new Error(`no snapshot at ${SNAPSHOT_PATH}; run web/hosted/build.ts, which takes one first`);
      }
      const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
      if (snap.schema !== "wconf-hosted-snapshot/1") throw new Error(`unexpected snapshot schema ${JSON.stringify(snap.schema)}`);
      return `export default ${JSON.stringify(snap)};`;
    },
  };
}

/**
 * The licence notices the client bundle's dependencies require, shipped with
 * it (`REVIEW-058` S-2). Collected from the modules actually in the client
 * bundle, so a package that is bundled cannot be missed and one that is not is
 * not listed. A bundled package without a licence file fails the build.
 */
function licenceNotices(): Plugin {
  return {
    name: "wconf-licence-notices",
    generateBundle(_options, bundle) {
      if ((this as any).environment?.name && (this as any).environment.name !== "client") return;
      const roots = new Map<string, string>();
      for (const out of Object.values(bundle)) {
        // ⚠ Tailwind's generated stylesheet is not a JS module, so the module
        // walk below cannot see it; its banner is how it is found.
        if (out.type === "asset" && out.fileName.endsWith(".css") && String(out.source).includes("tailwindcss")) {
          const root = resolve(HERE, "../../node_modules/tailwindcss");
          roots.set(root, "tailwindcss");
        }
        if (out.type !== "chunk") continue;
        for (const id of Object.keys(out.modules)) {
          const clean = id.replace(/^\0/, "").split("?")[0];
          const m = clean.match(/^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//);
          if (m) roots.set(m[1], m[1].slice(m[1].lastIndexOf("node_modules/") + "node_modules/".length));
        }
      }
      const parts: string[] = [...LICENCE_FILE_HEADER];
      for (const [root, name] of [...roots].sort((a, b) => a[1].localeCompare(b[1]))) {
        const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
        const notice = shippedNotice(root);
        if (!notice) throw new Error(`${name}@${pkg.version} is in the client bundle and ships no licence file`);
        parts.push("=".repeat(78), `${name}@${pkg.version} (${pkg.license ?? "licence field absent"})`, "=".repeat(78), notice, "");
      }
      this.emitFile({ type: "asset", fileName: "third-party-licenses.txt", source: parts.join("\n") + "\n" });
    },
  };
}

export default defineConfig({
  envPrefix: "WCONF_HOSTED_BUNDLE_NEVER_",
  build: { sourcemap: false },
  // ⚠ The prerender step serves the build to itself through Vite's preview
  // server. `localhost` resolved to ::1 inside the build container while the
  // request went to 127.0.0.1, and every page was refused; a literal fixes
  // both, and keeps the server on loopback.
  preview: { host: "127.0.0.1" },
  plugins: [
    hostedSnapshot(),
    licenceNotices(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/hosted",
      // ⚠ Not crawled: the six pages are named, and the crawler followed the
      // footer's links to files the gate writes after the build, and failed.
      prerender: { enabled: true, crawlLinks: false, failOnError: true },
      pages: HOSTED_PAGES.map((p) => ({ path: `/${p}` })),
    }),
    react(),
  ],
});

````


## FILE: web/api/capability.ts, after the fixes (complete)

````typescript
/**
 * The capability matrix — architecture §6 step 8's spine.
 *
 * **What each key source can and cannot do, and why.** Every cell carries a
 * citation, and `web/api/capability.test.ts` checks that each citation
 * RESOLVES AND EXISTS — that the named file, register row, ADR or ruling is
 * there.
 *
 * ⚠⚠ **IT DOES NOT CHECK SEMANTIC SUPPORT, AND THIS COMMENT SAID IT DID UNTIL
 * 2026-09-04** (*"says what the cell claims"*, `CLAIMS.md` E-239). **A citation
 * to an existing but irrelevant file passes.** That is the exact shape this
 * project claims discipline against — a gate asserting more than it checks —
 * and it was found by an adversarial leg asked for the worst overclaim in the
 * repository.
 *
 * ⚠ **This is DERIVED from the signer's own types, not restated from a
 * handover table.** `KeySource` in `signer/src/onboarding.rs:274` has exactly
 * two variants — `DerivedFromMasterSeed` and `Standalone` — and an absent
 * `elgamal_key_source` reads as `standalone` rather than being upgraded
 * (`holder.rs:53`). The browser-wallet row is the one that does **not** exist
 * in the code, and saying so is the point of the row.
 *
 * ⚠ **`CLAIMS.md` P-4, P-9 and P-11 govern every sentence here.** This system
 * hides amounts. It does not hide who transacts, with whom, when or how often,
 * and no configuration makes a holder private from the issuer.
 */

export type Verdict = "yes" | "no" | "conditional" | "unverified";

export interface Capability {
  verdict: Verdict;
  /** One sentence. Rendered as-is; it is a disclosure surface. */
  detail: string;
  /** Where the claim comes from. A file, a ruling, or a `CLAIMS.md` row. */
  citation: string;
}

export interface KeySourceRow {
  id: string;
  label: string;
  /** The token an operator writes into a holder profile, or null if none exists. */
  profileToken: string | null;
  existsToday: { built: boolean; where: string };
  decryptOwnBalance: Capability;
  proveAndSign: Capability;
  publicTransactions: Capability;
  /** The ruled disclosure this source obliges, if any. */
  ruledDisclosure: string | null;
}

/**
 * ⚠ **`REVIEW-012` condition 2 is RULED, not optional**, and it is the reason
 * the derived rows carry a disclosure the standalone row does not. It must
 * reach the holder **before the seed is asked for**.
 */
export const MASTER_SEED_DISCLOSURE =
  "The master seed becomes a permanent decryption credential. Anyone who ever " +
  "holds it can decrypt every confidential balance this account has held, past " +
  "and future. XLS-96 has no key rotation and no key recovery (P-10), so this " +
  "cannot be undone.";

/**
 * ⚠ **Issue #10 is OPEN and no code discharges it.** The derivation is
 * specified in one repository document and is not a published standard.
 */
/**
 * ⚠ **A NAMED GAP, and it is deliberately NOT one of the reasons the wallet row
 * says no.** `CLAIMS.md` E-206: whether a given wallet build's bundled codec can
 * serialise the XLS-0096 types is **not determinable from any published
 * source** — the page-side SDKs (`@crossmarkio/sdk@0.4.0`, `@gemwallet/api@3.8.0`,
 * `xumm@1.8.0`) carry no codec dependency at all, so serialisation happens
 * inside the extension, or for Xaman in its backend, and none of the three
 * page-side packages names the codec version (checked 2026-08-28, E-206).
 *
 * ⚠ **It is excluded from the reasoning on purpose.** It is a version fact an
 * upstream release can close at any time; the three reasons the row DOES give
 * are structural, so no codec release closes them, and only a wallet that held
 * the viewing key and produced the proofs itself would (`CLAIMS.md` E-330).
 * A demonstration resting
 * on this one would be falsified by a release note.
 */
export const WALLET_CODEC_GAP =
  "Not determined: whether a given wallet build can serialise XLS-0096 transactions. The " +
  "page-side SDKs examined on 2026-08-28 carry no codec, so serialisation happens inside the " +
  "extension, or for Xaman in its backend, and none of them names the codec version (CLAIMS.md " +
  "E-206). This is not why a wallet cannot hold a confidential position: the reasons above are " +
  "structural, and this one could change with any release.";

export const DERIVATION_NOT_PUBLISHED =
  "The derivation is specified only in this repository and is not a published " +
  "standard. A holder with their seed but without this repository cannot " +
  "reconstruct their key. Issue #10 tracks this.";

export const CAPABILITY_MATRIX: KeySourceRow[] = [
  {
    id: "derived-generated",
    label: "Generated demo seed, faucet-funded",
    profileToken: "derived-from-master-seed",
    existsToday: { built: true, where: "signer/src/onboarding.rs" },
    decryptOwnBalance: {
      verdict: "yes",
      detail: "The ElGamal secret is derived from the master seed, so the signer rebuilds it from the seed alone.",
      citation: "docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md; signer/src/keygen.rs",
    },
    proveAndSign: {
      verdict: "yes",
      detail: "One seed gives both the ElGamal secret and the XRPL account key.",
      citation: "signer/src/keygen.rs; signer/src/onboarding.rs",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "An ordinary XRPL account. Public transactions are unaffected.",
      citation: "signer/src/xrpl.rs",
    },
    ruledDisclosure: MASTER_SEED_DISCLOSURE,
  },
  {
    id: "derived-pasted",
    label: "Existing Devnet seed, pasted",
    profileToken: "derived-from-master-seed",
    existsToday: { built: true, where: "signer/src/onboarding.rs" },
    decryptOwnBalance: {
      verdict: "yes",
      detail: "Same as a generated seed: the derivation does not depend on where the seed came from.",
      citation: "signer/src/keygen.rs",
    },
    proveAndSign: {
      verdict: "conditional",
      detail:
        "Only if the master key controls the account. With a regular key or a signer list, spending authority may sit elsewhere, so the signer warns; with lsfDisableMaster it refuses.",
      citation: "signer/src/session.rs (REFUSED_MASTER_KEY_DISABLED); issue #11; REVIEW-012 condition 2",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "An ordinary XRPL account.",
      citation: "signer/src/xrpl.rs",
    },
    ruledDisclosure: MASTER_SEED_DISCLOSURE,
  },
  {
    id: "standalone",
    label: "Standalone ElGamal key",
    profileToken: "standalone",
    existsToday: { built: true, where: "signer/src/holder.rs — KeySource::Standalone" },
    decryptOwnBalance: {
      verdict: "yes",
      detail: "A separate ElGamal secret kept in the profile: two secrets to keep instead of one.",
      citation: "signer/src/onboarding.rs:279; signer/src/holder.rs:48",
    },
    proveAndSign: {
      verdict: "conditional",
      detail:
        "The ElGamal key decrypts and proves but does not sign; the account key is a separate secret. A custody platform ends up here, and who then holds the ElGamal key is an open question (E-117).",
      citation: "CLAIMS.md E-117; signer/src/holder.rs",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "Unaffected: the ElGamal key plays no part in public transactions.",
      citation: "signer/src/xrpl.rs",
    },
    ruledDisclosure: null,
  },
  {
    id: "browser-wallet",
    label: "Browser wallet extension",
    profileToken: null,
    existsToday: { built: false, where: "not built, for the reasons in this row" },
    decryptOwnBalance: {
      verdict: "no",
      detail:
        "Decrypting needs the ElGamal secret, which is derived from the master seed, and a wallet exists to keep the seed in. None of the three wallets examined on 2026-08-28 (Xaman, GemWallet, Crossmark) decrypts for a page or gives it a key. A wallet that derived the key and decrypted internally could; none examined does (E-329).",
      citation: "REVIEW-012 (derivation from master seed); ADR-0003 D2",
    },
    proveAndSign: {
      verdict: "no",
      detail:
        "A confidential transaction needs the ElGamal secret and the account key. These wallets supply only the account key, so a page cannot assemble the transaction through them. A wallet that held the ElGamal key and built the proofs itself could; none examined does (E-329).",
      citation: "ADR-0003 D2; signer/src/keygen.rs",
    },
    publicTransactions: {
      verdict: "yes",
      detail:
        "Ordinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.",
      citation: "gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)",
    },
    ruledDisclosure: null,
  },
  {
    id: "custody-simulated",
    label: "Custody platform (simulated)",
    profileToken: "standalone",
    existsToday: { built: false, where: "Simulation: an external-signer stub. No MPC, no HSM, no integration." },
    decryptOwnBalance: {
      verdict: "conditional",
      detail:
        "Only with a standalone ElGamal key, held by something other than the custody platform, or if the platform itself ran the derivation inside its own boundary, which would need the derivation published as a standard (issue #10). Outside the platform the account cannot derive its key, because that needs the seed, and a custody platform never releases the seed.",
      citation: "REVIEW-012; CLAIMS.md E-117",
    },
    proveAndSign: {
      verdict: "conditional",
      detail:
        "The external signer can sign. Holding only public data, it cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read.",
      citation: "docs/research/CUSTODY-2026-08-28.md; CLAIMS.md P-4",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "Public transactions carry plain amounts, so approval policies work as usual.",
      citation: "docs/research/CUSTODY-2026-08-28.md",
    },
    ruledDisclosure: null,
  },
];

/**
 * What every row shares, and what no key source changes.
 *
 * ⚠ **These are `CLAIMS.md` rows CITED, not restated.** A second copy of a
 * claim is a second thing to go stale, and this project has thirteen recorded
 * instances of exactly that.
 */
export const INVARIANTS = [
  { rule: "P-4", text: "No key source hides identities. The sender and receiver of every confidential transaction are public." },
  { rule: "P-9", text: "A holder is never private from the issuer. The issuer can always decrypt." },
  { rule: "P-10", text: "No key source supports rotation or recovery. XLS-96 supports neither." },
  { rule: "P-11", text: "No key source hides who transacts, when, or how often. Only amounts are hidden." },
  { rule: "F-1", text: "A newly created confidential balance is publicly identifiable as exactly zero." },
  { rule: "F-24", text: "Retiring a position in tranches publishes each tranche size." },
  { rule: "P-5", text: "None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation." },
];

````


## FILE: web/hosted/README.md, after the fixes (complete)

````markdown
# `web/hosted/` — architecture §6 step 9, the hosted demo's build

The hosted demo is static pages, prerendered from one pinned snapshot of public Devnet state. No code of this project runs on a server when a visitor loads them: the gate fails an output that holds a function, middleware or a rewrite to another host. The decision record is `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`, `Accepted` at revision 5. The owner ruled its four decisions on 2026-10-19 (`CLAIMS.md` E-331):

- **D-H1, H3.** Prerendered pages. The snapshot is kept indefinitely and rebuilt by hand. The build is isolated from the private stores' files: it runs in containers that mount neither. It is not isolated from the network while it installs and takes the snapshot (below).
- **D-H2.** The risk wording is accepted as written and shown beside every ledger value.
- **D-H3, A.** No issuer figure.
- **D-H4, A.** The output is built and gated locally, then deployed prebuilt from the CLI.

The pages are `web/app/src/hosted/`, a second build target beside the local tier. Four page bodies moved out of the local routes into `web/app/src/views/`, which both tiers render, so those four pages' text exists once. The overview, the issuer page and the banner have hosted texts of their own.

## The release procedure

Each step this repository owns refuses or fails loudly. Step 6 is Vercel's command.

1. **Publish the commit first.** The footer names the commit and links to it in the public repository, and step 5 refuses a commit that is not on the public `main`. Make the public update as `docs/NEXT-SESSION-PROMPT.md` describes, then build from the public clone at that commit.
2. **Build, isolated.** `make hosted-build REPO=<public clone> COMMIT=<sha> URL=https://<name>.vercel.app OUT=<new or empty dir outside the repository>`. The build refuses a directory that is not empty, exports a `git archive` of the commit and refuses it unless its files are exactly the commit's, then runs two containers that see only that tree and each check that neither private store exists: the first installs and takes the snapshot, with network; the second builds and assembles `.vercel/output` with `--network none`. Two canary values must not appear verbatim in the output. `build-manifest.json` is written beside the output, not in it.
3. **Gate the output.** `make check-web-hosted OUT=<dir> COMMIT=<sha>`. This needs the local secret store. Its controls run first, each breaking a copy of the real output, and the gate prints how many passed. On a pass the gate writes `static/gate-verdict.json`, a digest of every other file, which the page's footer shows.
4. **Load it in a browser.** `make hosted-browser-check OUT=<dir>`. A headless Chrome with a fresh profile loads every page under the output's own headers. It fails on a policy violation, a request to anything but the page's origin, an exception or a console error, on any page or after the client-side navigation, a page whose script never ran, a ledger page whose rendered text lacks the D-H2 wording, or a client-side navigation that loads a new document.
5. **Preflight.** `bun run web/hosted/deploy-preflight.ts <dir>` refuses a manifest that does not say `trial: false`, a commit that is not on the public `main`, a missing or failed verdict, a commit mismatch, any file changed since the gate passed, a ledger page naming another ledger than the manifest, and any failure of the gate's checks run again on the bytes about to be uploaded. It prints the deploy command.
6. **Deploy.** The owner runs the printed `vercel deploy --prebuilt --prod` with the project-scoped token present for that command only. Nothing in this repository runs it.
7. **Compare what is served.** `bun run web/hosted/compare-deployed.ts <dir> https://<name>.vercel.app` fetches every file, and every page at both spellings of its route, and compares status, bytes, content type and security headers with what the gate passed. It also requires a 404 for an unknown path under the same headers, and no cookie.

## The owner's one-time setup, before step 6

From `ADR-0004` D-H4 and "Abuse, availability and cost":

- A Vercel project with **no Git integration**. The Vercel GitHub app would hold write access to the public repository.
- The **Vercel toolbar off** for production and preview. The policy's `script-src` would refuse a script from another origin, and step 7 sees any change to a page's bytes; neither has been tried against the real toolbar.
- A **token scoped to the one project, with an expiry**, kept beside the publication export folder and absent from every build.
- The project's own `vercel.app` name, or a domain used for nothing else. That name is the `URL` the build takes, because the footer names it.
- The **plan, its limits, a spend cap** if the plan offers one, and **who acts when the page goes down**. The ADR asks for these to be named. For the 2026-10-20 deployment the plan is Vercel Hobby, which has no billing and so no spend to cap; the owner acts when it goes down (`CLAIMS.md` E-336, E-337).

## What these checks do not establish

The gate prints its own list. The short form:

- It reads files, so it cannot check egress. The browser check observes one browser on one run.
- The build's first container has network while it installs and takes the snapshot, and on OrbStack it can reach services on the build machine's own loopback through `host.docker.internal` (measured 2026-10-20, `REVIEW-059` S-2). Third-party code that runs during install or the snapshot has that access. The second container, which runs Vite and the assembler, has no network.
- The tree check runs before the containers. It does not see dependency code changing the tree during the build.
- The comparison in step 7 detects a change at the moment it runs, nothing later.
- Every value is a dated reading from Ripple's public Devnet endpoint, which is a pool of servers (`CLAIMS.md` E-327), under the accepted D-H2 risk. Every answer must name the one pinned, validated ledger. The reads are separate requests and are not held to one connection, so a server without that ledger fails the build rather than answering for another.

## Files

| file | what it is |
|---|---|
| `snapshot.ts` | Reads the pinned ledger at build time. It records a missing account, issuance or position as what it is, and fails on any other failed read. |
| `snapshot-types.ts` | The snapshot's shape, with no imports, so the pages can import the types without the reader. |
| `build.ts`, `Dockerfile` | The isolated build. The image is composed from two bases pinned by digest. |
| `vercel-output.ts` | Assembles Build Output API v3: static files, headers and page routes, and no functions. |
| `csp.ts` | Inline-script hashes as a browser computes them, shared by the assembler and the gate. |
| `browser-check.ts` | The headless-browser check, over the DevTools protocol. |
| `deploy-preflight.ts`, `compare-deployed.ts` | Before and after the owner's upload. |
| `pages.ts` | The six pages, one list. |
| `../../tools/check-web-hosted.ts` | The gate, run as `check-web-readonly --hosted`. |

````


## FILE: docs/decisions/ADR-0004-hosted-demo-trust-boundary.md, after the fixes (complete)

````markdown
# ADR-0004 — The hosted demo's trust boundary

- **Status:** `Accepted`, **revision 5**. The project owner ruled D-H1 to D-H4 on
  2026-10-19, each as recommended (`CLAIMS.md` E-331). The rotation, `REVIEW-058`,
  ran three rounds and is closed; round three's fixes are reviewed by their tests
  and controls only. ~~Nothing is built yet.~~ Built and gated 2026-10-20 (`CLAIMS.md`
  E-334), and deployed the same day; the served bytes matched the gated ones when compared (E-336); `web/hosted/README.md` is the release procedure.
- **Revision 5, 2026-10-20.** Records the owner's rulings: H3, prerendered pages,
  with an indefinite snapshot rebuilt by hand and an isolated build machine; the
  D-H2 wording accepted as written; A, no issuer figure; and the prebuilt CLI
  deploy. Each decision below carries its ruling, and the sentences that were
  conditional on a ruling now state it.
- **Revision 4, 2026-10-19.** Round three found the wallet permanence claim at three
  more live sites, the deployment token's isolation weakened into an option, the
  reader's parity with the Rust reader still overstated, and the phrase gate blind
  to blockquotes, comments and JSX spacing (`REVIEW-058e`, `CLAIMS.md` E-330). All
  are fixed or, for the reader, documented.
- **Revision 3, 2026-10-19.** Round two reviewed round one's fixes and found three
  that had not discharged their findings: a corrected sentence that survived in a
  second section, a wallet overclaim that survived in the capability matrix, and a
  fix that dropped half of what its finding asked for (`REVIEW-058d`, `CLAIMS.md`
  E-329). It also found the ledger reader still missing one of the Rust reader's
  checks, a phrase gate that a line break defeated, and H3's costs under-priced.
  All are fixed here or in the code.
- **Revision 2, 2026-10-19.** Round one ran three legs with differed packets and
  upheld findings from all three (`docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md`,
  `CLAIMS.md` E-328). ⚠ **Its central sentence is retracted**: revision 1 said
  *"Trigger 5 fires only for what is put into the bundle on purpose, and the gate
  can enumerate that"*, and both external legs named it the sentence most likely
  to be false. It was. Visitors' requests are egress the bundle does not contain,
  and the repository leg showed a build input outside the source reaching the
  output. **D-H1's recommendation moves from H1 to H3.** Three defects round one
  found were in shipped code, not in this document, and are fixed: the facility's
  ledger reader accepted a "not found" answer from any ledger, and two pages of
  the local tier carried false sentences.
- **Date:** 2026-10-19
- **Context:** launch plan phase 2 step 1. Architecture §6 step 9 is the step; this
  is the decision record. Where the two disagree, §6 is the authority on scope and
  this document is the authority on why, as with `ADR-0003`.
- **Blocks:** phase 2 steps 3 to 5, the build and the deployment.
- **Decided by:** the project owner, 2026-10-19. D-H1 to D-H4 are priced below,
  each with the recommendation the owner took.

This ADR is written by the session that would implement it. `ADR-0003`'s first
revision was too, and its rotation retracted its central claim (`CLAIMS.md` E-230).
Revision 1 of this document repeated that shape, and its own rotation retracted
it. Read every recommendation here as the author's, and attack it accordingly.

---

## What changes

Step 8's tier is a process on the holder's own machine, bound to loopback, serving
one operator. A hosted demo is a public URL that anyone can load. Two of this
project's own conditions fire for any public deployment, which is why E-309 ruled
it a trust-boundary change and not a deploy step:

- Architecture §6 step 8 is *falsified if* *"the API binds to anything but
  loopback"*.
- `ADR-0003`'s trigger 5 fires when *"this tier makes any datum reachable by a
  party who could not obtain that datum before the tier existed"*.

**The hosted page is public by design, so step 8's loopback property does not
carry over to it.** Step 9's own falsifiers replace it. ⚠ Revision 1 said here
that step 8's falsifier *"has nothing to bind"*, which read as evading the
property rather than replacing it (`REVIEW-058` B1-5).

E-309 ruled the demo read-only: no hosted signer and no keys in the page. This
document asks the question the launch plan names first: **what does the hosted
tier serve that a public node does not, and what does it cause to be sent, and to
whom?** The second half was missing from revision 1.

## Measured on 2026-10-19

Everything in this table was measured on 2026-10-19, by the session that wrote this
document or by `REVIEW-058`'s repository leg where the row says so. Nothing is
carried from a previous session.

| # | What | How it was measured | Result |
|---|---|---|---|
| M1 | Public Devnet JSON-RPC and CORS | `curl` to `https://s.devnet.rippletest.net:51234/`: an `OPTIONS` preflight with `Origin` and `Access-Control-Request-Method: POST`, then a `POST` of `server_info` with `Origin`. Then a `fetch` of the same `POST` from a Chrome page at `https://example.com` | The preflight answered `400` with no `Access-Control-*` header. The `POST` answered `200` with no `Access-Control-Allow-Origin`. In Chrome the `fetch` failed with *"Failed to fetch"*. A browser page cannot read this endpoint |
| M2 | Public Devnet WebSocket and `Origin` | One page: Chrome at `https://example.com`, sending `server_info`. Two non-browser clients: Bun `WebSocket`s supplying an `Origin` header of `https://wconf-demo.vercel.app` and of `null` | All three answered `success`, `network_id` 2, `build_version` 3.4.1. ⚠ **One page was tested, on one origin.** The two Bun clients show the server did not refuse those header values; they are not pages on those origins. Revision 1 said *"a page on each origin tried"* (`REVIEW-058` R1-2) |
| M3 | The endpoint is a pool | Successive connections, by this session and by the repository leg | Lower bounds of `complete_ledgers` read 5,193,077, 5,193,077, 5,171,980 and 5,171,980 here, and 5,193,077, 5,642,942 and 5,171,980 for the leg. Successive connections reach servers holding different history. It says nothing about who operates them |
| M4 | The demo set still exists | `account_info` and `ledger_entry` for the four addresses in `web/api/demo-accounts.ts` and issuance `004625C9…FEE332CB25E8`; re-run by the leg | All four accounts and their `MPToken` entries exist at validated ledger 6,243,460, and again at 6,244,010 for the leg, each with a `HolderEncryptionKey`, a spending ciphertext and an issuer mirror. Devnet has not been reset since E-319 |
| M5 | The observer computation's dependencies | Read `tools/observer-harness.ts:51-53,82-83,100`; the repository leg bundled `web/api/observer.ts` for a browser and ran it | `canonicalEncZero` takes only public inputs and its libraries are plain JavaScript. ⚠ **It does not run in a browser as written**: its hex helpers call `Buffer`, a Node global, and the leg's browser bundle threw `TypeError`. Revision 1 said only *"needs no native code"* (`REVIEW-058` R1-1) |
| M6 | The ledger readers this repository already has | Read `facility/src/loopback.ts`, `tools/observer-harness.ts:55,152-153,237,247` and `signer/src/ledger.rs:922-965` | `loopback.ts`, which the local tier reuses, reads over JSON-RPC with `fetch`, which M1 rules out in a browser, and its remote-risk acceptance is an environment variable. The observer harness reads over WebSocket but asks for `"validated"` on each request rather than pinning one index. The Rust signer's reader checks the ledger on a "not found" answer and the type of every entry; `loopback.ts` did neither until this revision (M10) |
| M7 | Proof verifiers in the published WASM package | `grep` over `node_modules/@xrplf/mpt-crypto@0.1.0`; the leg read the loader's export map | `wasm/mpt_crypto.mjs` references seven `_mpt_verify_*` symbols, `_mpt_verify_clawback_proof` among them. The typed API does not wrap them: `grep -n verify` over `dist/*.d.ts` returns nothing. The same WASM module also exports amount decryption |
| M8 | TanStack Start can emit a static build | Read `node_modules/@tanstack/start-plugin-core/dist/esm/schema.d.ts` at `@tanstack/react-start` 1.168.49 | The plugin schema has `spa` and `prerender` options. Whether the output runs with no server at all is not established by reading a schema, and is checked at build |
| M9 | What the issuer's mirror encrypts | `XRPL-Standards` `XLS-0096-confidential-mpt/README.md` at `58ccd3047`, the latest commit on `master` to touch it, lines 52, 245 and 707 | `IssuerEncryptedBalance` encrypts *"the holder's **total** confidential balance (`CB_S` + `CB_IN`)"*. `ConfidentialOutstandingAmount` is the total held in confidential balances by non-issuers. The clawback `ZKProof` proves *"that the `IssuerEncryptedBalance` encrypts the plaintext `MPTAmount`"* |
| M10 | What a "not found" answer carries | `ledger_entry` for a valid account holding no `MPToken`, at a pinned index, and for ledger 100 | rippled 3.4.1 answered `entryNotFound` with `ledger_index`, `ledger_hash` and `validated: true` for the pinned index, and `lgrNotFound` for ledger 100. So a negative answer can be checked against the pinned ledger, and `loopback.ts` now does |
| M11 | A build input outside the source | The repository leg set `VITE_WCONF_WEB_PORT` to a canary value and built | Vite inlined the canary into the client bundle. A value from the build machine's environment reached the output without appearing in the source |

## The decision: prerendered pages, no server of ours, no visitor egress but page loads

```
Owner's machine, at build time
  └── the existing JSON-RPC reader ──► public Devnet endpoint   (one pinned snapshot for the whole build)
        └── static pages, each naming that ledger index and the date

Visitor's browser ── static files only ──► Vercel   (no functions, no middleware)
```

- **No server-side code of ours runs per request.** The deployment is static files.
  ⚠ Revision 1 said *"no code of ours"*, and the page's own script runs in every
  visitor's browser (`REVIEW-058` B1-10).
- **Every ledger value is a dated reading.** The build opens one snapshot at one
  validated index, with the reader the local tier already uses, and reads every
  entry each page needs from it; every page names that index and the date. Nothing
  refreshes it until the next build. ⚠ Revision 2 said the build read Devnet *"once
  per page"*, which is neither one read nor one snapshot per page (`REVIEW-058`
  B2-3).
- **The visitor's browser sends nothing anywhere but Vercel.** The pages are fixed:
  one per demo account, with no input, so no lookup travels in a URL.
- **The capability matrix, the custody simulation and the wallet page are static.**
  They are functions of this repository's own text (`web/api/capability.ts`,
  `web/api/custody-sim.ts`).
- **The issuer view shows no figure.** D-H3 was ruled A: the page shows
  `IssuerEncryptedBalance` present and populated under the issuance's
  `IssuerEncryptionKey`, and says the issuer can always decrypt it (P-9).

**What the hosted output may contain, by provenance.** Files built from a clean
checkout of the public repository at a named commit, with its locked dependencies,
with no environment variable admitted to the build except those named in the build
script, and with no source maps. ⚠ Revision 1 described the output as *"the static
output of the public repository's own source"* and treated that as a boundary. M11
shows a build input outside the source reaching the output, so provenance is
something the build has to enforce and the gate has to check, not a description
(`REVIEW-058` R1-3).

**The build machine is trusted, and that has to be a choice.** Installing
dependencies and building runs third-party code with the build user's file access.
An inventory of the output cannot show that the build never read a private store
or a credential. **The deployment token is never reachable while dependencies
install or the build runs; it comes in for the upload step only, whatever else is
chosen.** For the rest, build where the private stores (`~/.wconf`, `/tmp/wconf`)
are not reachable, or accept the build machine's trust by name (`REVIEW-058`
R2-10). ⚠ Revision 3 let that acceptance waive the token's isolation too (R3-2).
**Ruled 2026-10-19: isolated.** The owner did not accept the build machine's
trust, so the build runs where neither private store is reachable.
⚠ **Reachable meant the stores' files, and the network was not priced.**
`REVIEW-059` measured that a build container with network reaches a service bound
to the build machine's `127.0.0.1` through `host.docker.internal` (S-2). Since then
the Vite build and the assembler run with `--network none`; installing and taking
the snapshot need the network and keep it, so third-party code that runs during
those steps can reach the build machine's loopback services. That is named in
`web/hosted/README.md` and in each build's manifest, not removed.

**What the hosted tier causes to be sent, and to whom.** Each page load goes to
Vercel, which sees the visitor's IP address and the page requested. Under H3 that
is all. Under H1 the visitor's browser also connects to Ripple's Devnet node and
sends every account it looks up. ⚠ **Revision 1 said trigger 5 fired only for what
is put into the bundle, and that the gate could enumerate it. Both halves were
false.** Visitors' requests are egress no bundle contains, and `ADR-0003` itself
says its gate does not check what the tier emits or to whom. The gate can
enumerate the uploaded files; it cannot enumerate egress (`REVIEW-058` B1-4, and
the repository leg's closing finding).

**Trigger 4, the decryption oracle.** No request reaches a decryption under any
D-H3 option: A and B decrypt nothing at request time, and C adds a verifier. That
is narrower than revision 1's *"cannot fire: there is no request handler"*. A
static file server answers requests, and a pre-decrypted figure served to everyone
is the result leaving, which is E-212's lesson. That is why D-H3 is a ruling,
and it was ruled A: the output carries no issuer figure.

**Hosted exclusions.** The local tier's signer panel and its loader call
(`web/app/src/routes/index.tsx:12-15,72-85`) are absent, not merely the signer
page; ⚠ revision 1 called it a page. The `/api-doc` page describes an API that does
not exist in the hosted build and is absent too. Two false sentences found on the
local tier by round one are corrected at source: the front page promised the issuer
view showed the holder *"decrypted"*, and the wallet page said three reasons
~~*"cannot be closed by any release"*~~ after saying a wallet that held the key would
close them (`REVIEW-058` R1-4, `CLAIMS.md` E-328). ⚠ Round two found the same
permanence claim surviving in the capability matrix, which the wallet page renders
(`web/api/capability.ts`, the browser-wallet row), and it is now scoped to the
wallets examined (R2-2, E-329).

## What the hosted surface may touch, and may never touch

**May touch:** public Devnet ledger state, read from one pinned snapshot at build
time; and static content built as the provenance rule above says. ⚠ Until revision
5 this also admitted browser reads under H1 and, if D-H3 ruled it, one published
snapshot file. The owner took neither (E-331).

**May never touch:** any server-side request handler; any socket client or the
signer's socket path; any secret, seed or private key, the demo issuer key
included; any decryption routine in the shipped output; any input that asks a
visitor for a seed, a key or any secret (`REVIEW-058` S-1); any network but Devnet;
any second ledger endpoint, as a fallback or otherwise; any analytics, toolbar or
third-party script; and any account or issuance a visitor chooses, carried in a URL
the host receives (B1-2).

## The owner's decisions

### D-H1. The hosting shape

| option | cost | what it buys |
|---|---|---|
| **H3. Prerendered pages** *(recommended)* | a build step that opens one pinned snapshot with the existing reader, naming its endpoint and the remote-risk acceptance input in the build's allowlist; replacing the application's runtime dependency on the API, because every route today passes the root's `/api/meta` check and the wallet and custody loaders call the API, with data baked at build time and checked by loading each page directly and by navigating, with no API running (`REVIEW-058` R2-9); a check that each demo account exists, so a reset, a missing token and a failed read render differently; a rebuild cadence the owner names, or an accepted indefinite snapshot; a visitor cannot enter an account | no visitor request leaves Vercel; no second ledger reader; no WebSocket, reconnection or `Buffer` problem; every value is a dated reading, P-3's habit. ⚠ The build still reads ~~one node~~ one public endpoint, a pool of servers (M3), so D-H2's first paragraph still applies. This cell said *"one node"* after `629f216` corrected the phrase elsewhere (`CLAIMS.md` E-335) |
| H1. Static site, the visitor's browser reads Devnet | a WebSocket transport under `Snapshot`, after `loopback.ts` is refactored to separate its transport (`REVIEW-058` B1-9); a browser-safe replacement for the harness's `Buffer` helpers; snapshot integrity across reconnects; a Content Security Policy that admits the node; no loader cache reused across navigation | a visitor can look up any Devnet account. ⚠ Their IP and every lookup go to Ripple's node. Port 51233 is not 443, and networks that block other ports will fail the page (B1-1); whether a Devnet WebSocket endpoint on 443 exists has **not been searched** |
| H2. Vercel functions running the Elysia API against Devnet over JSON-RPC, with SSR | the API on the public internet: CORS for the deployed origin, rate limiting, caching, function logs holding visitors' IPs and queries, and billing exposure on the owner's account | the existing reader unchanged, and visitors' IPs hidden from Ripple's node. ⚠ Every route added later runs our code per request, which is trigger 4's shape |

**Why H3.** Revision 1 recommended H1, and round one priced what H1 costs. Its
reuse fails in a browser as written (M5); the reader it would reuse had a gap the
Rust reader closed long ago (M10); it adds a second transport, reconnection, a CSP
exception and a cache rule; and it sends every visitor's lookups to a second
party. What it buys is a lookup box. The confidential positions this demo shows are
the project's own four demo accounts, and most readers of the posts will have no
Devnet account to look up. H3 shows the same views, as dated readings, with nothing to
reconcile. ⚠ The argument for H3 is the Gemini leg's, upheld (`REVIEW-058` Q6).
**If "so people can try it" means a visitor looking up an account of their own,
H1 is the option, at the costs above.**

**Ruled 2026-10-19 by the owner: H3.** Rebuild cadence: an indefinite snapshot,
rebuilt by hand whenever the owner chooses to deploy; every page names its ledger
and date, so a stale page says how stale it is. Build machine: isolated, as the
provenance section above records.

### D-H2. The ledger-source risk acceptance for a hosted page

B-15's named risk acceptance was written for a local operator who chose their
node (E-110, extended to the facility demo by E-151). A hosted page needs its own,
and accepting a risk is the owner's act, not this document's. The proposed wording,
shown beside every ledger value:

> *This page shows the XRPL Devnet, a test network. Its tokens have no value, and
> it is reset from time to time. Each value was read from Ripple's public Devnet
> endpoint, at the ledger and date shown, and a lying or lagging server behind it
> would have made it wrong. The page does not update: it shows Devnet as it was at
> that ledger, not as it is now. Nothing on this page signs or submits. Do not use a
> value shown here to build a transaction.*
>
> *Vercel, which hosts this page, sees your IP address and the pages you open.*

Under H1 the second paragraph gains: *"Your browser also connects to the public
Devnet node operated by Ripple, which sees your IP address and every account you
look up."*

⚠ Revision 1's wording said *"no amount can be published because of it"*, which is
true of the page and not of a reader who copies a displayed key into their own
tooling, where a lying node reaches F-23 through them. It named only Ripple as a
party that sees visitors, and Vercel sees every one. It omitted that Devnet has no
value and is reset (`REVIEW-058` B1-6, B1-7, S-4). ⚠ Revision 2's wording blamed any
difference from today's ledger on a lying or lagging server, when under H3 the page
is simply a fixed reading (B2-4). The public endpoint also keeps only recent
history, about a million ledgers on 2026-10-18 (E-319), so a visitor can check the
ledger shown against it for some weeks and not after.

| option | what it means |
|---|---|
| **Accept, by name, with this wording beside every ledger value** *(recommended)* | the same shape as E-151: the risk is unmet by name, and the page says so where the value is |
| Do not accept | no hosted demo with ledger values. ⚠ Revision 1 offered H3 here as the way to avoid the acceptance, and H3 reads one node too, at build time (`REVIEW-058` S-5) |

**Ruled 2026-10-19 by the owner: accepted, by name, with the wording above as
written.** The H1 sentence does not apply, because D-H1 was ruled H3.

Corroboration across independently operated Devnet nodes is not offered as an
option. Every Devnet host this repository names is under `rippletest.net`
(`git grep -ohiE` for `devnet` hostnames, 2026-10-19), so every endpoint it knows
has one operator. Whether an independently operated public Devnet node exists has
**not been searched** outside this repository. That is a named gap, not a
negative.

### D-H3. The issuer view: what, if anything, the hosted page says the issuer reads

`ADR-0003`'s ruled position for the local tier is E-241: the route reports
whether a balance is decryptable and never the figure, because *"the plaintext
integer only ever demonstrated that THIS PROJECT holds the demo issuer key."* The
launch plan's phase 2 text proposes the opposite for the hosted page: the
snapshot *"is the point of the demo and becomes a deliberately published static
artifact over throwaway Devnet accounts, with the disclosure beside it."* The two
cannot both stand without a ruling.

| option | cost | what it buys |
|---|---|---|
| **A. No figure** *(recommended)*. The page shows `IssuerEncryptedBalance` present and populated under the issuance's `IssuerEncryptionKey`, and says the issuer can always decrypt it (P-9) | none beyond the static page | E-241's position, carried unchanged to a public audience. The ciphertext and the key it is under are ledger readings a visitor can check. That the issuer can decrypt it is the specification's, cited as P-9, and no figure is asserted |
| B. A published snapshot of the issuer's figures | run `tools/issuer-view-snapshot.ts` locally and publish its results with the ledger index and, for each holder, the `IssuerEncryptedBalance` the figure was decrypted from. The tool does not record that ciphertext today (`tools/issuer-view-snapshot.ts:220-262`), so B changes the one tool that holds the issuer key | the contrast the plan wants: the observer sees a ciphertext, the issuer sees a number. ⚠ Nothing a visitor can run shows the figures are true. Re-reading each ciphertext shows only that the snapshot is current. Comparing the figures' sum with `ConfidentialOutstandingAmount` shows nothing about the key either: that total is public, and anyone can split it among holders without decrypting anything (M9). The repository leg built two incompatible allocations of the same total at ledger 6,244,148, and both passed |
| C. B, plus a proof of correct decryption that the browser verifies | unpriced. XLS-0096's clawback proof is a proof that the mirror encrypts a stated amount (M9), and M7 shows its verifier in the WASM build. ⚠ Two constraints from round one. A proof built with a real clawback context could be used by any account XLS-0096 lets submit a clawback for the issuer, delegates included, so a published proof needs its own domain-separated context naming Devnet and the ledger hash (`REVIEW-058` R1-5). And the published WASM module also exports amount decryption, so shipping it contradicts the rule against decryption routines in the output; C needs a verifier-only artifact (R1-6) | the only option under which a visitor can check each figure, and so the only one that answers E-241 |

**Why A.** E-241's reasoning holds with more force on a public page. A figure no
visitor can check is a claim with no falsifier, published under this project's
name. B's checks cannot change that, because both pass for a publisher who never
held the key, and the repository leg built that forgery. C is the way to show the
number, and it needs the two constraints above priced first. Launching with A costs
nothing, and C can be added later without reopening the rest of this decision.

⚠ **This recommendation departs from the launch plan**, whose phase 2 text calls
the snapshot *"the point of the demo"*. A draft of revision 1 recommended B with
the sum check as its falsifier. Preparing the self leg showed that the check passes
for a forger, so the draft changed before review.

**Ruled 2026-10-19 by the owner: A.** The hosted page shows no issuer figure, and
the launch plan's snapshot sentence is superseded (E-331). C remains open and
unpriced; adding it later reopens this decision and no other.

### D-H4. What Vercel deploys, and from where

Read on 2026-10-19 from Vercel's own pages: `vercel.com/docs/cli/deploy`, marked
updated 2026-09-18; `vercel.com/docs/git/vercel-for-github`, marked updated
2026-09-17; and `vercel.com/docs/vercel-toolbar/managing-toolbar`, marked updated
2026-08-11.

| option | cost | what it buys |
|---|---|---|
| **A. Build and gate locally, deploy the prebuilt output from the CLI** *(recommended)* | a Vercel token on the owner's machine, which can replace what the public page says: scope it to the one project, give it an expiry, and keep it beside D8's export folder. Each deployment is a deliberate act. `vercel build` writes `.vercel/output`, and `vercel deploy --prebuilt` uploads that directory | the gate runs on the exact bytes that ship, which is phase 1 step 7's lesson. No additional repository credential or write permission is granted. ⚠ Revision 1 said *"no third party gains any access"*; Vercel still receives every file and controls how it is delivered (`REVIEW-058` R1-10, S-6) |
| B. Vercel's Git integration, production from `main` | Vercel builds from source, so the gate has to run inside Vercel's build and fail it. ⚠ The Vercel for GitHub app's documented repository permissions include write access to `Administration`, `Contents`, `Pull Requests` and `Web Hooks`. That is a third party with write access to the public repository, which D8's option C exists to restrict | deploys follow merges. The integration deploys every push by default, previews included. A pull request from a fork needs a team member's authorization before it deploys, and that protection can be switched off. A fork's preview is a page under the owner's project saying whatever the fork says, which is E-209's presentation-integrity shape |

**Why A.** It keeps the gate on the shipped bytes and keeps the public
repository's write access where D8 put it.

**Ruled 2026-10-19 by the owner: A**, the prebuilt CLI deploy.

**Under either option, the host can add to the page.** Vercel's toolbar appears on
preview deployments and on any environment where it is enabled, and it loads
script from `vercel.live`. Set it off for both environments in the project, serve a
policy that would block it anyway, and compare the served bytes and headers with
the gated output after every deployment. ⚠ The deployed bytes are Vercel's to
deliver; the comparison detects a change, it does not prevent one (`REVIEW-058`
S-3, B1-3, R1-10).

**The domain.** Serve it from its own `vercel.app` name or a domain used for
nothing else. A subdomain of a domain that also hosts the owner's writing would
share its cookie scope. A `vercel.app` name freed by deleting the project can be
claimed by someone else, and every post linking it would then point at them.

## Devnet resets

The demo accounts are throwaway. Under H3 a page is a reading at a named ledger
and date, and stays one: when Devnet resets, the next build finds the accounts
gone and the page must say so rather than drop them.

> *This account does not exist on Devnet at ledger N. Devnet is reset from time to
> time and the demo accounts are throwaway. No other source is substituted.*

A failed read must never render as an empty account, which reads exactly like a
true statement about the ledger. ⚠ **That was not true of the reader this design
reuses**: `facility/src/loopback.ts` turned a "not found" answer from any ledger
into an empty position, and the observer view would have rendered it. It now
requires, on every pinned answer, positive or negative, a numeric `ledger_index`
equal to the pinned index and `validated: true`; it tolerates only `entryNotFound`;
and it checks the type of every entry. Those are the Rust reader's checks
(`signer/src/ledger.rs`, `came_from` and `ledger_entry`), with one difference that
is documented rather than closed: this reader sees the index after JSON parsing, so
a decimal form such as `4800000.0` on the wire reads as `4800000`, where the Rust
reader refuses it. rippled sends integers, so no honest answer differs. ⚠ Revision
3 called the two readers' checks the same (`REVIEW-058` R3-3). ⚠ Round one's fix stopped
at the index of a negative answer and revision 2 called that parity; round two
found `validated` unchecked on both paths and the issuance's type check untested
(M10, `REVIEW-058` R1-7, R2-4, R2-5). Old transaction hashes are
not a foundation either, because the public endpoint stopped serving them without
a reset (E-319).

## Abuse, availability and cost

Under H3 and H1 no server-side code of ours runs per request, so there is nothing
of ours to rate limit. ⚠ This said *"nothing of ours"* in revision 2, a copy of the
sentence round one corrected two sections up (`REVIEW-058` R2-1). Static hosting still has costs: page loads and transfer count against
the owner's Vercel plan, and a flood of them can exhaust a free plan's quota or
bill a paid one. Name the plan, its limits, a spend cap if the plan offers one, and
who acts when the page goes down (`REVIEW-058` R1-11). Named 2026-10-20: Vercel Hobby,
which is free, has no billing and pauses a feature that exceeds its limit, so there
is no spend to cap. The owner acts when the page goes down (`CLAIMS.md` E-336, E-337). Under H1 the node's limits
are Ripple's, and the page must render a refused, failed or rate-limited read as a
named failure, never as an empty account. Under H2 all of it becomes ours.

**Copies.** The bundle is public and anyone can host a copy that reads a node of
their choosing. Nothing prevents that. The page names its canonical address and
the repository, and that is the whole defence.

## Caching

Under H3 the pages are cached, dated observations, deliberately: each names its
ledger index and date and none claims to be current. ⚠ `REVIEW-058c` said H3 made
*"Ledger values are not cached"* true by construction, and it does the opposite
(R2-6). ⚠ Revision 1 said *"Ledger values are not
cached"* without a mechanism, and under H1 TanStack Router's loaders keep data
across navigation by default (`REVIEW-058` B1-8). Under H1 the build must disable
loader caching for ledger reads, and a test must show that returning to a view
reads again.

## Rotation triggers

`ADR-0003`'s five triggers apply to the hosted build unchanged. Four more are
specific to hosting:

1. **Anything that runs code of ours per request**: a serverless function, edge
   middleware, or on-demand rendering. That is H2, and it needs its own rotation.
2. **Any datum in the shipped output that the provenance rule does not admit.**
   D-H3's snapshot is the only exception that can be ruled, and only by name.
   D-H3 was ruled A, so no exception is admitted; a figure in the output reopens
   D-H3.
3. **A second network endpoint**, a fallback, or any widening of the page's
   permitted connection targets.
4. **Any new party that receives a visitor's requests**, and any visitor input
   that leaves the browser. Moving from H3 to H1 is one.

## What phase 2 step 4's gate must check

The local gate, `tools/check-web-readonly.ts`, asserts the local shape. The hosted
build needs its own part, run over the **uploaded output directory and its routing
configuration**, not the source:

- an inventory of every file in the output, compared with what the provenance rule
  admits; no source maps;
- no server function, API route, serverless function or middleware, in the files
  or in `.vercel/output/config.json`;
- no socket client, no signer socket path, no decryption routine and no secret-
  shaped value. ⚠ ~~**`check-no-secrets` cannot do the last part today**~~ It could not until 2026-10-20, when `--dir` was built (E-334): it selects
  files through git (`tools/check-no-secrets.ts:665-683`) and has no directory
  mode, and the repository leg showed an ignored `dist/` file going unscanned
  (`REVIEW-058` R1-9). The hosted part needs a directory mode with controls that
  prove ignored build files are read;
- the Content Security Policy as delivered, from `.vercel/output/config.json`'s
  headers, with `default-src 'self'`, `script-src 'self'` plus hashes for any
  inline script the framework emits, `connect-src 'self'` (and the one Devnet
  WebSocket under H1), `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`
  and `frame-ancestors 'none'`; a policy set only on the development server does
  not configure the CDN (`REVIEW-058` R1-8);
- no input asking for a seed, a key or a secret;
- every view that renders a ledger value also renders the D-H2 wording, the
  network check and the ledger index;
- the third-party licence notices the bundle's dependencies require, shipped with
  it (`REVIEW-058` S-2);
- the public commit the output was built from, and the gate's verdict on that
  output, rendered on the page, so a reader can tell what built it and whether it
  passed (S-8). ⚠ Revision 2 kept the commit and dropped the verdict, which the
  finding asked for (`REVIEW-058` R2-3).

It is verified by breaking it, in both directions, with its controls run through
the real detector, and it says in its own output what it does not check. Gates in
this repository have false-passed before they worked, `ADR-0003`'s own among them
(E-165, E-182, E-226). ⚠ **It cannot check egress**: it reads files, and a visitor's
requests are not in them.

## What this decision does not claim

- **That the hosted page is secure.** P-5 governs. It is a static demonstration.
- **That the values it shows are true.** TLS to Ripple's node authenticates the
  channel, not the values (architecture §7, F-23). D-H2 is the acceptance of that.
- **That visitors are private.** Vercel sees every page load. Under H1, Ripple's
  node sees each visitor's IP and lookups.
- **That a holder is private from the issuer** (P-9), that confidential transfers
  hide who or when (P-4, P-11), or that a fresh balance is hidden when F-1 says
  it is publicly known to be zero. `web/api/disclosure.test.ts` pins the local
  tier's wording, and the hosted build must run the same tests.
- **That the gate covers egress, or proves the served bytes stay the gated ones.**
  It checks files before upload; the comparison after deployment detects a change
  at the moment it runs.
- **That Devnet evidence is permanent.** E-319.

## Before this ADR can be accepted

1. ~~The owner's rulings on D-H1 to D-H4.~~ **Ruled 2026-10-19**, each as
   recommended (`CLAIMS.md` E-331).
2. ~~Round one of the rotation.~~ **Run 2026-10-19, `REVIEW-058`.** ~~Round two.~~
   **Run the same day, and its stopping condition fired**: three of round one's fixes
   had not discharged their findings (`REVIEW-058d`). ~~Round three.~~ **Run the
   same day, the last the owner's review policy allows; the rotation is closed**
   (`REVIEW-058e`). Its fixes are reviewed by their tests and controls only.

````


## FILE: docs/architecture/ARCHITECTURE-2026-08-18.md after the fixes: its first 8 lines (title and latest revision lines) and §6 step 9 whole; the rest is not included

````markdown
# W-CONF architecture — revision 12

⚠ **This document said `tapFailHard` until 2026-10-18, which is THIS PROJECT'S SHORTHAND and appears zero times in rippled.** It now uses the real names: `fail_hard`, the submission parameter a client sets, and `TapFailHard`, rippled's internal apply flag. See [`docs/VOCABULARY.md`](../VOCABULARY.md). The code always used the real one.

- **Revision 12 on 2026-10-20: §6 step 9 is BUILT, DEPLOYED and REVIEWED once.** Built and gated (`CLAIMS.md` E-334, E-335), deployed from `34ed67a` and redeployed from `ccf76e7` (E-336, E-339). `REVIEW-059` round one, the first outside review of the build, upheld 24 findings (E-342); the fixes are not yet deployed, and round two reviews them. ⚠ The revision 11 line below said *"Step 9 is not built"* until this line was added, which was true of the ruling and false of the header a reader meets first (`REVIEW-059` S-6).
- **Revision 11 on 2026-10-20: §6 step 9 is RULED.** The project owner ruled `ADR-0004`'s four decisions on 2026-10-19, each as recommended: prerendered pages from one pinned snapshot, rebuilt by hand, on an isolated build machine; the hosted risk wording accepted by name; no issuer figure; and a prebuilt CLI deploy. `ADR-0004` is `Accepted` at revision 5 (`CLAIMS.md` E-331). Step 9 is not built.
- **Revision 10 on 2026-10-19, amended the same day after `REVIEW-058` round one** (step 9's shape moved from browser reads to prerendered pages, and its falsifier grew; `CLAIMS.md` E-328). **§6 step 9 written: the hosted demo, scoped and NOT ruled.** `ADR-0004` is the decision record, `Proposed`, with four decisions for the project owner and a full adversarial rotation owed before any code (launch plan phase 2, `CLAIMS.md` E-309). The design rests on measurements taken the same day and recorded in the ADR: the public Devnet JSON-RPC endpoint cannot be read from a browser page, its WebSocket endpoint can, and the four demo accounts still exist (`CLAIMS.md` E-327).
- **Revision 9 on 2026-08-28** — **§6 step 8 written for the first time.** ⚠ **This revision exists because `CLAUDE.md` asserted a step that did not exist.** *"It is architecture §6 step 8 and step 8 was written on 2026-08-26"* was false: §6 had **seven** numbered steps, §7 followed step 7 directly, `grep -n "step 8"` over this document returned **nothing**, and revision 8 is recorded as *"§6 step 7 only"*. The web tier therefore had no scope, no falsifier and no gate in the authority document, and the line every new session reads first said otherwise for two days (`CLAIMS.md` **E-204**). Step 8 now carries the four decisions the project owner ruled on 2026-08-28, the read-only trust boundary that keeps it out of a rotation, its gate, and its falsifier. **`ADR-0003` is the decision record; this is the step.** ⚠ **One source correction came out of the scoping itself**: `Request::Status`'s doc comment called it a *"Public ledger read"* and it reads no ledger — the sentence D1's safety argument quotes was wrong about what the call does (**E-205**).
[...]
9. **The hosted demo — a static, read-only page on a public URL.** **SCOPED AND RULED 2026-10-19; BUILT AND GATED 2026-10-20, ~~NOT DEPLOYED~~ DEPLOYED THE SAME DAY. Its rotation ran three rounds and is closed (`REVIEW-058`).** `ADR-0004` is the decision record, `Accepted` at revision 5. It carries four decisions, D-H1 to D-H4, which the project owner ruled on 2026-10-19, each as recommended: H3, with an indefinite snapshot rebuilt by hand on an isolated build machine; the D-H2 wording accepted by name; A, no issuer figure; and the prebuilt CLI deploy (`CLAIMS.md` E-331). ⚠ **A public deployment fires two of step 8's own conditions**: its falsifier *"the API binds to anything but loopback"*, and `ADR-0003`'s trigger 5, egress. The hosted page is public by design, so step 8's loopback property does not carry over to it, and this step's falsifiers replace it.

   **What the step is, in one sentence, as D-H1 was ruled:** prerendered static pages, built from one pinned snapshot of public Devnet state with the reader the local tier already uses, each naming that ledger index and the date, with no code of this project running on a server per request and nothing sent by a visitor's browser except page loads to the host. ⚠ **This said the visitor's browser would read Devnet over WebSocket until `REVIEW-058` round one**, which found that reuse failing in a browser and pricing a second reader, and found that revision 1's claim that the gate could enumerate egress was false (`CLAIMS.md` E-328).

   **It is a second build target, not a replacement.** Step 8's local tier stays as it is. Its signer panel and `/api-doc` page are absent from the hosted build.

   **What this step may touch:** public Devnet ledger state, read at build time; and files built from a clean checkout of the public repository at a named commit, with its locked dependencies, named build variables only and no source maps, on a machine where `~/.wconf` and `/tmp/wconf` are not reachable. ⚠ Until revision 11 this also admitted browser reads under H1 and one issuer snapshot if D-H3 ruled it; the owner took neither (`CLAIMS.md` E-331).

   **What it may never touch:** any server-side request handler; any socket client or the signer's socket path; any secret, seed or private key, the demo issuer key included; any decryption routine in the shipped output; any input asking a visitor for a secret; any network but Devnet; any second ledger endpoint, as a fallback or otherwise; any analytics, toolbar or third-party script; and any account a visitor chooses, carried in a URL the host receives.

   **Its gate is a hosted part of `tools/check-web-readonly.ts`, run over the UPLOADED OUTPUT DIRECTORY and its routing configuration rather than the source**, verified by breaking it in both directions. `ADR-0004` lists what it must check. ⚠ It cannot check egress. ~~`check-no-secrets` has no directory mode yet, so the scan it relies on does not exist (`REVIEW-058` R1-9).~~ The directory mode exists since 2026-10-20 and the gate runs it (`CLAIMS.md` E-334).

   **Built 2026-10-20 (`CLAIMS.md` E-334).** `web/hosted/README.md` is the release procedure: an isolated container build from a commit, the gate (`check-web-readonly --hosted`), a headless-browser check under the output's own policy, a preflight, the owner's deploy and a comparison of what is served. ~~⚠ **Not deployed.** The gate fails on the current output until the owner rules on the email address in a bundled package's licence notice, and the deploy needs the owner's Vercel project and token.~~ ⚠ The owner ruled the email redacted (E-335), and this sentence stood until the deploy. **Deployed 2026-10-20** at `https://xrpl-confidential-positions.vercel.app`, from the public commit `34ed67a`, and what was served matched what the gate passed when compared that day (`CLAIMS.md` E-336). Redeployed the same day from `ccf76e7` with the demo's shorter text, compared the same way (E-338, E-339). **Reviewed the same day**: `REVIEW-059` round one, the first outside review of the build, upheld 24 findings, two of which let the release procedure pass what this step forbids (E-342). The fixes are built and not deployed, so the live site predates them; round two reviews them.

   *Falsified if:* the shipped output contains a server function, an API route, a serverless function or middleware, in its files or its routing configuration; or contains a socket client, the signer socket path, a decryption routine or a secret-shaped value; or contains any file the provenance rule does not admit; or asks a visitor for a seed, a key or a secret; or permits a connection to anything but its named targets; or renders a ledger value without the risk wording, the network check and the ledger index it was read at; or renders a failed or negative read that cannot be placed in the pinned ledger as an empty account, or substitutes another source; or carries a visitor's lookup in a URL the host receives; or publishes an issuer figure, which D-H3 ruled out; or ships bytes or headers other than the ones the gate passed; or does not render the commit it was built from and the gate's verdict on it. *Also falsified if:* any of step 8's wording falsifiers holds on the hosted page.


````


## FILE: CLAIMS.md after the fixes: rows P-1 to P-12 and E-334 to E-344 (complete)

````markdown
| P-1 | That this work makes XRPL quantum-safe or quantum-resistant | It does not |
| P-2 | That an application-layer PQ scheme protects funds at the ledger level | An adversary who breaks secp256k1 signs a valid classical transaction and the network accepts it |
| P-3 | That any amendment is live or enabled, without a dated `feature` RPC check | Amendment state is a reading, not knowledge |
| P-4 | That a Confidential MPT demo hides identities | It hides amounts and balances. Sender and receiver remain public |
| P-5 | That anything here is trustless, non-custodial, decentralised, audited, production-ready or secure | None of it is; ADR-0001 names the trusted parties |
| P-6 | That anything is compliant with regulation in a named jurisdiction | Not a compliance project |
| P-7 | That analysis of published work is original research | Cite Cenk, Malhotra, Akinyele, Chen, Xie, Qian by name where the work is theirs. **Add Tess Dore (2026-08-16):** the compact sigma protocol, the twisted-ElGamal analysis and the Bulletproofs++ analysis are Dore & Cenk, RippleX Research — Dore is *not* an XLS-0096 author and is easy to omit by copying E-1's list |
| P-8 | Any benchmark number without hardware, parameter set and methodology | Includes re-quoting XLS-0096 §14.2's "laptop-class CPU" timings — see B-1 |
| P-9 | That holders are private from the issuer | The issuer's decryption mirror is mandatory. No configuration makes this false |
| P-10 | That XLS-96 supports key rotation or key recovery | It supports neither, at any level |
| P-11 | That confidential transfers hide *who* transacts, or *when*, or *how often* | Only amounts are hidden. The counterparty graph and event timing are fully public |
| P-12 | **Any claim that a source does NOT say something — *nothing documents it*, *no such field*, *not exported*, *nobody has called it out*, *I could not find it* — without the search that would falsify it recorded alongside** | It is an assertion about a whole corpus and one search settles it. **Three graded rows failed this way on 2026-08-26** (E-155, E-156), two of them **positives**: U-15 quoted a sentence XLS-0096 has never contained; U-12 said a property was *"not called out anywhere I found"* when the spec states it **twice**, once in wording identical to the benefit claimed as an original reading. ⚠ **This shape survives review because it does not look like a claim** — a quotation has quotation marks, a benchmark visibly wants a methodology, and *"nobody has documented this"* reads as modesty. Gated by `tools/check-negative-claims.ts` |
| E-334 | **Architecture §6 step 9 is built and gated but not deployed, and the browser check caught a policy the gate had passed.** `check-no-secrets --dir` reads every file under a build output with no git filter, so an ignored `dist/` file is scanned (`REVIEW-058` R1-9). The facility reader gains a pinned existence check. The hosted pages are a second route tree that renders the local tier's page bodies and reads one build-time snapshot, with no API. `web/hosted/build.ts` builds a commit's `git archive` in a container that mounts neither private store, and two canary variables must not reach the output. The hosted gate, `check-web-readonly --hosted`, runs its controls over broken copies of the real output, then checks the output and writes a verdict the footer shows. The first assembler and the gate hashed inline scripts over the file's bytes. TanStack Start's hydration script carries NUL bytes, which the HTML parser turns into U+FFFD before the policy is checked, so every page's hydration was refused under a policy the gate had passed. `web/hosted/browser-check.ts` found it, and one shared function now hashes the parsed text, with a control that a raw-byte hash fails. seroval's licence notice, which TanStack Start bundles, names its author's personal email, and the secret sweep failed the output on it until the owner ruled (E-335) | `make ci` 262 / 5 / 0; `bun test web/hosted` 19, `web/api` 131, `facility/tests/loopback.test.ts` 39. `check-no-secrets` 111 controls, `break-no-secrets-gate` 93 probes. A trial build from the working tree read ledger 6,249,946; on its output the gate passed 28 of 28 controls and failed only on the two seroval emails, and the browser check passed six pages and 39 same-origin requests. After E-335, a trial at ledger 6,258,942 passed the gate's 30 controls and its full sweep with the local store, and the footer showed `PASS, 18 files`. Before the fix, every page reported a `script-src-elem` violation with the sample `(self.$R=self.$R\|\|{})["tsr"]`, and the file's script held two NUL bytes. Devnet, rippled 3.4.1, ledger 6,249,566: an absent account root answered `entryNotFound` with `validated: true` and the pinned index. Inside the container, Vite under Bun could not prerender, and `localhost` resolved to `::1` while the request went to `127.0.0.1`; the image runs Vite under Node, and the preview server binds `127.0.0.1` | A, measured |
| E-335 | **The owner ruled the licence email redacted and kept the CLI deploy, and `claims-check` found five overstatements in the hosted build's own README before it was published.** On 2026-10-20 the owner ruled seroval's address replaced by a marker in the shipped notice, which keeps the year and holder, and the gate now checks each notice against the package's own licence file with only addresses removed. Offered Git integration's costs, the owner kept D-H4's prebuilt CLI deploy, and said yes to publishing the step 9 code. The README called the endpoint ~~*"one public node"*~~, the phrase `629f216` corrected, which also survived in ADR-0004's D-H1 table. It also called the local tier unchanged when its routes had moved into shared views, and a commit "of the public repository" that nothing checked; the preflight now asks GitHub. Controls added: decoy stores refused in the container, a planted canary found, a request to another origin and a page whose script never ran both reported, and the footer required to show a verdict that exists. The snapshot's reads are separate requests to a pooled endpoint, where E-327 said a snapshot must stay on one connection; each answer must name the pinned validated ledger, and one that cannot fails the build | `bun run web/hosted/build.ts --self-test` and `browser-check.ts --self-test` pass, and each fails with its check removed. `gh api repos/nandanito/xrpl-confidential-positions/compare/<sha>...main` answered `ahead` for `d135eed` and 404 for an archive-only commit. `bun test web/hosted` 28. A control first restored the email at the file's header line, which changes no notice, and the gate refused its own run rather than passing it. `git grep -n "vercel deploy"` finds the command only as printed text | A, measured |
| E-336 | **Architecture §6 step 9 is deployed, and when compared on 2026-10-20 what Vercel served was byte for byte what the gate passed.** On 2026-10-20 the owner ran `vercel deploy --prebuilt --prod` in their own terminal with a project-scoped token, which never entered this session. The output was built in the container from the public commit `34ed67a` at ledger 6,259,125. The gate passed 30 of 30 controls and its full sweep, the browser check passed six pages and 39 same-origin requests with the footer showing `PASS, 18 files`, and the preflight found the commit on public `main`. The host adds headers the build does not set, among them `access-control-allow-origin: *`, which lets other origins read files that are public and carry no cookie. The deployment's own URL and the project's team alias both redirect to Vercel's login; of the addresses tried, only the production alias, `xrpl-confidential-positions.vercel.app`, serves the page. The owner named the plan: Vercel Hobby, which is free and has no billing; in Vercel's words, exceeding a limit means waiting 30 days in most cases, so the failure is the page going down, not a bill. Vercel restricts Hobby to non-commercial, personal use. Who acts when the page goes down is not yet named. The CLI version, the toolbar setting, whether a Git repository is connected, and a check from a machine that has never run the project were not reported to this session. ⚠ Architecture §6 step 9 still said the gate failed until the owner ruled on the email, a sentence E-335's ruling made false and its commit did not touch | `bun run web/hosted/compare-deployed.ts` against `https://xrpl-confidential-positions.vercel.app` passed on 2026-10-20: 17 files by digest, six routes, the verdict file, a 404 for an unknown path and no cookie. Two controls on copies of the output, run against the live host, failed as they should: a zeroed digest named `/observer/index.html`, and an altered policy named the header on every file. Verdict digest `f88c1d4a…bfb77`, commit `34ed67a9f2f5…`. `curl -sI` on `/` and `/gate-verdict.json` showed `access-control-allow-origin: *`, `strict-transport-security` and `cache-control: public, max-age=0, must-revalidate`; the deployment URL and the team alias each answered 302 to `vercel.com/sso-api`. Vercel's Hobby page, updated 2026-09-14: 100 GB of Fast Data Transfer and 1,000,000 CDN requests a month. The output's files total 481,661 bytes uncompressed | A, measured |
| E-337 | **The owner named who acts when the demo goes down: the owner.** On 2026-10-20 the owner said they act if the page goes down, which completes `ADR-0004`'s list for availability and cost. The owner also said the project is public and approved publishing the deploy record. The demo stays on the owner's Hobby team; the owner's paid team belongs to a different organisation. Still not reported: the CLI version that ran the deploy, the toolbar setting, and whether a Git repository is connected; all three were reported later that day (E-340) | The owner's messages in the session of 2026-10-20 | A, recorded |
| E-338 | **The hosted demo's text was cut by about a third and its register habits removed, with every disclosure kept; not yet deployed.** On 2026-10-20 the owner asked for the demo's text to read like the README: not verbose, and without filler. The observer page printed the public and hidden lists once per holder, four times, and now prints them once. The custody page repeated one caveat on six flows and repeated the matrix's custody row; the caveat is a numbered note and the row is gone. The issuer page said two paragraphs once per holder and now says them once. Warning marks, capitalised emphasis and remarks about the register itself are gone from the page text. Two account notes called balances non-zero, which no visitor can check, the reason the issuer page publishes no figure; they now say what the ledger shows. A matrix cell said a regular key means the master seed is not the spending authority, and now says authority may sit elsewhere. A wallet cell said three wallets sign and submit any transaction type, where the source is about what their APIs accept. ⚠ The custody page chose which reasons become flow caveats by a warning mark inside the reason's text, and no test covered it, so removing the marks would have dropped every caveat silently; it is a field now, with two tests. The D-H2 wording is unchanged, as ruled | The six pages' visible text went from 5,352 words to 3,463, both counts including the header, footer and ciphertexts. A trial build from the working tree at ledger 6,263,285 passed the gate's 30 controls and its sweep, and the browser check passed six pages and 39 same-origin requests with the footer showing `PASS`. `bun test web/api web/hosted` 161 pass; `make ci` 273 / 5 / 0. Deleting the caveat field fails the new test, and a hosted route that stops importing its shared view fails the import test. Changed tests: the zero note is matched case-insensitively, the custody notice is anchored to the first finding instead of the removed panel, the custody row matches `simulation` case-insensitively, and the shared-view import may name a second export. The signer refuses a `Send` without an `IssuerEncryptedAmount` (`signer/src/txn.rs:786-793`), which is what the new sentence that send amounts are not hidden from the issuer rests on | A, measured |
| E-339 | **The demo's shorter text is live: the owner redeployed from the public commit `ccf76e7`, and when compared on 2026-10-20 what Vercel served was byte for byte what the gate passed.** PR #17 carried E-336 to E-338 to the public repository and was fast-forwarded onto `main`. The container built `ccf76e7` at ledger 6,263,910; the gate passed 30 of 30 controls and its sweep, the browser check passed six pages and 39 same-origin requests with the footer showing `PASS, 18 files`, and the preflight found the commit on public `main`. The owner ran the deploy in their own terminal. ⚠ A check that the build carried the new text first read zero matches for phrases the gate had just counted, because the pages hold NUL bytes and `grep` treated them as binary and printed nothing; `grep -a` found every phrase | `compare-deployed` against `https://xrpl-confidential-positions.vercel.app` passed at 2026-10-20T05:28:35Z, and the served `gate-verdict.json` names `ccf76e73bf66` with digest `1332ea0a95772b12…`. Two controls on copies of the output failed against the live host as they should: a zeroed digest named `/custody/index.html`, and an altered `Referrer-Policy` named the header on every file. `check-no-secrets --strict-history` on the public repository passed 111 of 111 controls over 738 files and 861 history objects; `make ci` there 273 / 5 / 0, and the `checks` workflow passed on the PR and on `main`. `grep -ao` on the built pages: no warning marks on any page, one `Two findings`, four `Observer view: ` labels, one `Public` list | A, measured |
| E-340 | **The owner reported the rest of the deploy setup: no Git repository is connected to the Vercel project, the toolbar is off, and the deploys ran on the pinned CLI, 62.4.0.** On 2026-10-20 the owner reported all three, which completes the one-time setup in `web/hosted/README.md` for this deployment. The owner also opened the site on a phone, a machine that has never run the project, and said it works. Whether the footer there showed `PASS` was not reported at first; asked, the owner reported that it did, which completes the check. The owner will delete a stray empty project that Vercel's dashboard created, and is letting the deploy token expire as planned rather than revoking it | The owner's messages in the session of 2026-10-20. `vercel --version` on the owner's machine printed `Vercel CLI 62.4.0` the same day; that shows what is installed now, not what ran the deploys | A, recorded |
| E-341 | **The filings were re-surveyed at source on 2026-10-20 before either post is drafted, and two things E-316 did not record were found: the Japanese copy of the docs page still says the encrypted zero is indistinguishable, and a draft key-rotation standard, XLS-99, exists.** No filing has a comment from anyone outside this project since 2026-10-18. mpt-crypto #145 and #152 are open at the heads E-316 read, and #153, #154 and #155 have no reply. XLS-0096 at XRPL-Standards `master` is byte-identical to `58ccd3047`, and every check E-316 lists holds on it. #3879's fix reached the English page only: the Japanese page was translated from the text before dev-portal PR #3916, added three days before that PR merged, and never updated, and xrpl.org/ja served both sentences on 2026-10-20. XLS-0099, *ElGamal Key Rotation for Confidential MPTs*, status Draft, merged on 2026-09-03 and changed as late as 2026-10-14, adds holder, issuer and auditor key rotation and holder key-loss recovery. rippled `develop` declares its amendment `ConfidentialMPTKeyRotation` as `Supported::No`, and Mainnet, Testnet and Devnet do not know it. P-10 still holds of XLS-96; a post may say there is no rotation or recovery in XLS-96 or on those three networks today, and must name the draft. ⚠ E-316 grepped one copy of a translated page, and read the XLS-0096 line that links XLS-99 without noticing it. `REVIEW-058`'s packet quoted that line and `REVIEW-054`'s transcript listed the rippled transactor files; neither was captured | `docs/evidence/upstream-survey-2026-10-20/README.md`. `gh api` issue, comments and timeline for all eleven filings, every fetch returned a body; `gh pr view` for #604, #628, #3916, #145 and #152; XLS-0096 at `93389999a` compared with `58ccd3047` by `cmp`, and line 938 read; both language copies of the page at dev-portal `7e302d278` and live from xrpl.org, Japanese lines 96 and 127; XLS-0099's header and abstract at `93389999a`; `features.macro` at rippled `develop` `360843351` and at `3.4.1`; `check-amendments` at 2026-10-20T10:23:11.544Z, and a `feature` query to Mainnet, Testnet and Devnet at 2026-10-20T10:37:26.256Z, none of which named an amendment matching *Rotation*. Not read: the other Japanese MPT pages, and anything about when or whether XLS-99 is enabled | A, read at source |
| E-342 | **The first review of step 9's build, `REVIEW-059` round one, upheld 24 findings, and two would have let the release procedure publish what step 9 forbids with no check noticing.** Three legs with differed packets: Codex with a clone of the public commit and the deployed output, Gemini with 32 whole files inline, and the self leg. A policy beginning `connect-src *;` passed the gate, because the gate kept the last of two duplicate directives and a browser enforces the first; the browser check and the live comparison read the same string. A file left in a reused build directory reached the output of a build of `ccf76e7`, which does not contain it, and the manifest still said the build mounted only the commit's archive. Among the others: the gate trusts a page to label itself as showing ledger values, three controls test something next to what they are named for, the browser check ignores console errors, the build container reaches the build machine's loopback, the custody page drops its research's exception, and Holder A's note is a hard-coded balance claim. Leg A's first attempt was stopped by the provider's cybersecurity filter after Step 0 and ran again reworded as a defensive review; leg B's process did not exit and was killed after its report was complete. The live site is unchanged, and four fixes change page text, so it is stale until rebuilt and redeployed | `docs/reviews/REVIEW-059c-adjudication-round-one-2026-10-20.md` and `REVIEW-059-packets/`. Measured on 2026-10-20: `runChecks` gave 0 findings on the duplicate directive and on three later-route overrides; a container build of `ccf76e7` into a directory holding `work/src/web/app/public/assets/review059.js` exited 0 with that file in `static/assets/`; the browser check passed leg A's console-error and navigation-exception copies; a listener on the Mac's `127.0.0.1` answered `fetch` from the build image through `host.docker.internal`. Before the round, `compare-deployed` passed at 10:39:42Z, the gate passed 30 of 30 controls on a copy with digest `1332ea0a…`, and the browser check passed | A, measured |
| E-343 | **`REVIEW-059` round one's fixes are built, and each new check was broken before it was believed; they are not yet reviewed, rebuilt from a public commit or deployed.** The gate refuses a repeated directive, headers on any route but the first, a missing or extra security header, a scheme-relative address, a ledger value on a page outside the two named ledger pages, a ledger page without its marker, a changed commit label, and a licence file whose header, tail or package list differs. Fourteen controls were added, and the cryptography-package control now plants the package's real notice. The browser check reads a page's own console errors, checks the interval after the client navigation, and requires the D-H2 wording in each ledger page's rendered text. The comparison checks content types, both spellings of each route, the verdict's status and the 404's headers. The preflight requires `trial: false`, runs the gate's checks again and matches each ledger page's index to the manifest's. The build refuses a non-empty output directory and a tree that is not the commit's, and runs Vite and the assembler with `--network none`. The snapshot reads each position once and refuses a pinning answer that is not Devnet. Four sentences visitors read changed: the custody finding names its exception, the wallet gap restores Xaman's backend and dates its check, Holder A's note no longer states its balances, and the footer says the browser checks nothing. ⚠ The build's new network control first aimed at a port where nothing listened, so it passed with the network on; then the probe ran synchronously and its own listener could not answer. Running it with the offline arguments removed found both | Measured 2026-10-20: the fixed gate passed the deployed output with 44 of 44 controls and digest `1332ea0a…`; each of the 14 new checks, deleted from a copy, failed its control; the browser check's self-test passed, and deleting each of its three new checks failed it; leg A's two browser copies now fail; `bun test web/hosted/deploy.test.ts` 16 pass, and the eight new tests fail against the old files; `web/hosted/build.test.ts` 5 pass, and each of three rules mutated fails a test; the build self-test passed, and with the offline arguments removed both halves of its network control failed; `bun test web/hosted web/api facility` 288 pass; `make ci` 288 / 5 / 0 | A, measured |
| E-344 | **Checked against each finding's own words rather than the adjudication's summary of it, four of E-343's fixes discharged half a finding, and the second halves are now fixed.** R1-12 named two sentences on the custody page and the ruling carried one: the amount-policy claim also dropped its research's three ways out, and it had two more copies, in the capability matrix and the custody simulation. R1-8 asked for both views to be built from the position AND the issuance already read; the fix stopped re-reading the position and still read the issuance once per account. R1-7 asked for the snapshot's metadata to be bound to the pages; the fix bound the ledger index and not the read time or the address the footer shows. R1-5 asked the browser check to refuse a configuration it cannot model; the fix made the gate refuse it and left the browser check serving it as a simpler one. ⚠ The ruling summarised each finding and the fixes were ticked against the summaries, which is the shape this file's own session prompt records from 2026-10-19: two of the author's fixes narrowing the author's findings. Found before round two launched, by re-reading leg A's report finding by finding | `docs/reviews/REVIEW-059-packets/round-one-codex-output.md`, R1-5, R1-7, R1-8 and R1-12, read against `6b537e3`. Each completion has a test that fails against `e45321b`: the issuance is read zero times in `readAccount`, the preflight refuses a read time no page shows, and the browser check's server refuses a later route carrying headers. `bun test web/hosted web/api facility` 290 pass; `make ci` 290 / 5 / 0. The custody page's new sentence first called the zero-knowledge route one *"no one has specified"*, an unsearched negative, and now says this project has neither built nor costed it, which is the research's own scope | A, measured |

````


## FILE: the adjudicator's run: r2-gate.txt, on the output rebuilt from c08db2b (complete)

````text
check-web-hosted over <builds>/review059-r2-c08db2b/.vercel/output, expecting commit c08db2befb175c2efc0060ca8f71b95e61caf3aa
controls: 44/44 passed, each through the same runChecks() and secretScan() as the real check
scanned: 18 file(s); secret sweep: check-no-secrets: verdict=PASS exit=0

What this gate does NOT check:
  1. EGRESS. It reads files; what a visitor's browser sends is not in them. The policy's connect-src 'self' is checked as written, not as a browser enforces it.
  2. The SERVED bytes and headers. It checks the output before upload; step 7 of web/hosted/README.md compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.
  3. The BUILD MACHINE. An inventory of the output cannot show that the build never read a private store, or that every file came from the named commit; the isolated build and its tree check are what address that.
  4. Whether the PROSE is true. Wording is claims-check's and the wording tests' question; this gate checks that the ruled D-H2 sentences are present, not that every other sentence is right.
  5. Anything a script asks a visitor for after hydration, by a form control or a dialog such as prompt(). The check reads the prerendered HTML; React's DOM code names input elements internally, so the bundle cannot be read for them.
  6. A decryption routine under a name it does not list. It forbids WebAssembly, the named mpt-crypto and ElGamal identifiers and any cryptography package in the licence list, which is a named set.
  7. A package inlined without its module path. The licence list is collected from the module graph the build reported, and the gate requires that list to equal the admitted set.
  8. A ledger value on a page outside /observer and /issuer is found only if it is a ciphertext, a demo account address or a marked value; a figure written as prose is not.
  9. NO ISSUER FIGURE (D-H3) is held by the build, not by this gate: the build container holds no key, so no figure can be computed, and one could enter the pages only as text in a public commit.

wrote static/gate-verdict.json: 18 files, output digest 577fc9d53dc9e137cf18643fd0b1abac499a0c400fcb6e36b1eec9b2ba5788dd
check-web-hosted: verdict=PASS exit=0

````


## FILE: the adjudicator's run: r2-browser.txt, on the output rebuilt from c08db2b (complete)

````text
browser-check: 6 pages, 41 requests observed, all to the page's own origin unless listed below
  the overview's footer shows: PASS, 18 files, output digest 577fc9d53dc9e137…, checked 2026-10-20T11:45:49.501Z
browser-check: verdict=PASS exit=0

````


## FILE: the adjudicator's run: r2-preflight.txt, on the output rebuilt from c08db2b (complete)

````text
  REFUSED: c08db2befb175c2efc0060ca8f71b95e61caf3aa is not on the public repository's main, so the footer's link names a commit readers cannot see
deploy-preflight: verdict=REFUSED exit=1

````


## FILE: the rebuilt pages' VISIBLE TEXT, extracted from the prerendered HTML (complete)

````markdown

### Page /

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
What this is
A read-only look at confidential MPT positions on the XRPL Devnet. Every value comes from one snapshot of the ledger, taken when this site was built. The site signs nothing and holds no keys. No code of this project runs on a server when you load it, and your browser requests only this site’s own files.
Start here
Capability matrix: what each kind of key can and cannot do.
Observer view: what anyone can read on the ledger, including which balances are visibly zero.
Issuer view: the issuer’s copy of each balance, without the figure.
Wallet: why the browser wallets examined cannot hold a confidential position.
Custody: where confidentiality and custody approval policies conflict.
To transact, run it yourself
Signing happens only in wconf-signer, a separate program on the holder’s own machine, never in a web page. The README explains how to build it and run the local version of this site. It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs.
README, “Run it”
What it never claims
P-4No key source hides identities. The sender and receiver of every confidential transaction are public.
P-9A holder is never private from the issuer. The issuer can always decrypt.
P-10No key source supports rotation or recovery. XLS-96 supports neither.
P-11No key source hides who transacts, when, or how often. Only amounts are hidden.
F-1A newly created confidential balance is publicly identifiable as exactly zero.
F-24Retiring a position in tranches publishes each tranche size.
P-5None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.
Each label is a row in the repository’s CLAIMS.md.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /observer

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
Where these values come from
read from https://s.devnet.rippletest.net:51234
validated ledger 6270649 at 2026-10-20T11:45:28.415Z
network_id 2 (Devnet) rippled 3.4.1
This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.
Public
The account's address, and every account it has transacted with (P-4).
When each transaction happened, and how often (P-11).
The public MPT balance.
The issuance's ConfidentialOutstandingAmount: the total of all confidential balances.
The holder's encryption key, once registered.
The ConfidentialBalanceVersion, which counts changes to the balance.
Whether a confidential balance is exactly zero, when it holds the canonical encryption of zero. New, merged and clawed-back balances do; a balance spent down to zero does not (F-1, E-211).
Each tranche size, when a position is retired in tranches: the amount is plaintext on every ConvertBack (F-24).
Hidden
The value of a confidential balance that is not the canonical encryption of zero, even when that value is zero (E-211).
The amount of each ConfidentialMPTSend.
Both are hidden from observers, not from the issuer (P-9). Nothing else here is hidden.
Observer view: Holder A — an active position
rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).
read at validated ledger 6270649
What a full-ledger observer sees
public MPT balance 750
registered true
ConfidentialBalanceVersion 11
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
021D3288E7E5BF982641DF0ADCDB067DCFDBA95E312F0159A85E2A81B5496999B4029652CF4E578E5E03E539CBBBF04D57F5244A56D7FC1FDF4E8672E76418FDF947Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
inbox
03B67732AAE2EDB348088A27B147EE3D01387631CDDD357B12C24659F6EB26A04F02EE0D0A18BEED84DA931C481F57A712C8CC0731F822B5013ADE72739A0C3217C4Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Observer view: Holder B — a derived-key account
rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6270649
What a full-ledger observer sees
public MPT balance 586
registered true
ConfidentialBalanceVersion 5
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
02C8F5B45590A1CF7F9006F974DAA91FFD7C64FAA85FC2964F18F6495E23577313028556C7AA02F610759762A7449B7AF4A4A4EDFA73F8BF96BF93A09DFB09B87EBCNot the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
inbox
03C9FC4098EDC4B287A3873E21ABCA828FFE9CF50150DEE079221267F21AD8535D0289A21820DDA63C5FB4BC107A710898DBB7F10E5EEE4B8DBA205D7D8967CD8214Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Observer view: Holder C — the ed25519 signing account
rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbYThe account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6270649
What a full-ledger observer sees
public MPT balance 30
registered true
ConfidentialBalanceVersion 0
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
031AE5A70B242D81691C1FC43D684FCD908BC7DCCC07CE3ED7DD1096A9575F5D1C03CE6F696A2AACEBEB02E4728249B72E362D2DD76754F084B819A289628691F31CPublicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
inbox
022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F980348759FC36C71AE3F6FE16A6904C23312D36DEFAAE95A9A2C9EE7DA7E6F84D9F2Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
Observer view: Holder D — an early spike account
rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWHAn early test account, kept as a second position to compare against.
read at validated ledger 6270649
What a full-ledger observer sees
public MPT balance 0
registered true
ConfidentialBalanceVersion 4
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
0382CD36EC99297C61FE6D878C8ED59CFE0C38EEB36A316EB0FE0AC8379FC66A9603A2AA18361F6ACFBE85FDC97EEAC7F6822C5767CB74256564FDA95009C6E11A17Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
inbox
0266912F17A098DC7E54BFEC56277DEA0422888A0212874D411A841E385A1D1D4D0240B6B9DB0AF95113717F95B056815D5B3A1C69FE596518ACB564F0A5E92FECE5Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /issuer

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
A holder is never private from the issuer
The protocol keeps a second copy of every confidential balance, the IssuerEncryptedBalance, encrypted to the issuer’s key. The issuer can always decrypt it, and no setting turns this off (CLAIMS.md P-9).
This page shows that each copy is on the ledger. It does not show the decrypted figures: a visitor could not check them, so this project does not publish them (ADR-0004 D-H3).
Where these values come from
read from https://s.devnet.rippletest.net:51234
validated ledger 6270649 at 2026-10-20T11:45:28.415Z
network_id 2 (Devnet) rippled 3.4.1
This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.
The issuance
MPTokenIssuanceID 004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8
issuer rP9wBAcBUXNDSiUNPgLRv2WWjMn1L8xzRa
IssuerEncryptionKey 029DDE4953B75D741FC54DB86B44DF7E486E5B1BDFBCECD5F671B68E7E1CFD6CB9
Issuer's copy: Holder A — an active position
rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).
read at validated ledger 6270649
IssuerEncryptedBalance 0227B2F019BB9F3887355B85C959B2011DBEF7AC80439E42514390BBB236CF43A80237189EBACB6E36B5C7AE7B8F251B8E97D55D37C3AC01B281F93C84C7395A75D3
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder B — a derived-key account
rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6270649
IssuerEncryptedBalance 034958E9C943B437E117E9021E017799168DF9EE45270FE310212BF8F5BA957C10035E00F894315900DBBE99B2BC859F4FB45ECDA17381C0768E4F5C2D435412302D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder C — the ed25519 signing account
rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbYThe account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6270649
IssuerEncryptedBalance 022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F9802EDC9E003481C3DB14F60A83767C9B88C53525104C1A408DA61677EFAE4887CD0
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder D — an early spike account
rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWHAn early test account, kept as a second position to compare against.
read at validated ledger 6270649
IssuerEncryptedBalance 03578671D93AB129EA4196A34214E45B4EA639DB43758C63D2516A457F7735CF5702C2587A7AAD3AFFD05A691C26390E5623C44DAE1E4FCFF5DC3952D5342563C93D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /custody

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
This is a simulation
No custody platform is integrated behind this page: no MPC, no HSM, no Harmonize. It models a key-source shape, a standalone ElGamal key plus an external signer, to show which flows survive and which break.
Two findings
1. The derived key does not work with custodial key management
The ElGamal secret is derived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation published as a standard, and it is not (issue #10).
A standalone ElGamal key gets around this, but then something outside the custody platform holds a permanent decryption key. Who that should be is an open question in this project (CLAIMS.md E-117).
2. Approval policies cannot read a confidential amount
An approval workflow that holds only public data sees a proof, not a value, so a rule like “two approvers above $1M” has nothing to check. This is structural, not an integration detail: confidentiality and amount-based approval policies pull against each other. The ways out each cost something: give the policy engine the ElGamal secret, and it becomes another party that reads every balance; accept the holder’s statement of the amount, and the policy rests on the holder’s honesty; or prove the bound in zero knowledge, which this project has neither built nor costed.
Which flows survive, and which break
Each flow lists what it needs, and the verdict is computed from what a custody-shaped key source has.
Note 1: Only with a standalone ElGamal key, held outside the custody platform (E-117).
survives: Send a public XRPL payment
breaks: Onboard with the ruled derived key
Structural in this simulation: a custody platform never releases seed material, so the account cannot derive its own ElGamal key outside the platform. A platform that ran the derivation inside its own boundary would change this, and that needs the derivation published (issue #10).
survives: Onboard with a standalone ElGamal key (note 1)
survives: Read own confidential balance (note 1)
survives: Send a confidential amount (note 1)
breaks: Send confidentially, under an amount-capped approval policy (note 1)
Structural: the transaction carries a proof, not a value, so a rule like 'two approvers above $1M' has no amount to read. It is hidden from this simulation's policy engine too, which holds only public data.
survives: Send confidentially, under a destination-allowlist policy (note 1)
survives: Retire a position in tranches (note 1)
Each tranche size and its timing is public: the amount is plaintext on every ConvertBack (CLAIMS.md F-24).
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /capabilities

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
Capability matrix
What each key source can and cannot do. The ElGamal key encrypts and decrypts confidential balances; the XRPL account key signs. The rows follow the signer’s ownKeySource type, which has two variants, and rows that are not built say so.
key sourcedecrypt own balanceprove + sign confidentialpublic transactionsexists today
| Generated demo seed, faucet-fundedderived-from-master-seed
| yesThe ElGamal secret is derived from the master seed, so the signer rebuilds it from the seed alone.
docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md; signer/src/keygen.rs
| yesOne seed gives both the ElGamal secret and the XRPL account key.
signer/src/keygen.rs; signer/src/onboarding.rs
| yesAn ordinary XRPL account. Public transactions are unaffected.
signer/src/xrpl.rs
| builtsigner/src/onboarding.rs
| Existing Devnet seed, pastedderived-from-master-seed
| yesSame as a generated seed: the derivation does not depend on where the seed came from.
signer/src/keygen.rs
| conditionalOnly if the master key controls the account. With a regular key or a signer list, spending authority may sit elsewhere, so the signer warns; with lsfDisableMaster it refuses.
signer/src/session.rs (REFUSED_MASTER_KEY_DISABLED); issue #11; REVIEW-012 condition 2
| yesAn ordinary XRPL account.
signer/src/xrpl.rs
| builtsigner/src/onboarding.rs
| Standalone ElGamal keystandalone
| yesA separate ElGamal secret kept in the profile: two secrets to keep instead of one.
signer/src/onboarding.rs:279; signer/src/holder.rs:48
| conditionalThe ElGamal key decrypts and proves but does not sign; the account key is a separate secret. A custody platform ends up here, and who then holds the ElGamal key is an open question (E-117).
CLAIMS.md E-117; signer/src/holder.rs
| yesUnaffected: the ElGamal key plays no part in public transactions.
signer/src/xrpl.rs
| builtsigner/src/holder.rs — KeySource::Standalone
| Browser wallet extension | noDecrypting needs the ElGamal secret, which is derived from the master seed, and a wallet exists to keep the seed in. None of the three wallets examined on 2026-08-28 (Xaman, GemWallet, Crossmark) decrypts for a page or gives it a key. A wallet that derived the key and decrypted internally could; none examined does (E-329).
REVIEW-012 (derivation from master seed); ADR-0003 D2
| noA confidential transaction needs the ElGamal secret and the account key. These wallets supply only the account key, so a page cannot assemble the transaction through them. A wallet that held the ElGamal key and built the proofs itself could; none examined does (E-329).
ADR-0003 D2; signer/src/keygen.rs
| yesOrdinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.
gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)
| not builtnot built, for the reasons in this row
| Custody platform (simulated)standalone
| conditionalOnly with a standalone ElGamal key, held by something other than the custody platform, or if the platform itself ran the derivation inside its own boundary, which would need the derivation published as a standard (issue #10). Outside the platform the account cannot derive its key, because that needs the seed, and a custody platform never releases the seed.
REVIEW-012; CLAIMS.md E-117
| conditionalThe external signer can sign. Holding only public data, it cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read.
docs/research/CUSTODY-2026-08-28.md; CLAIMS.md P-4
| yesPublic transactions carry plain amounts, so approval policies work as usual.
docs/research/CUSTODY-2026-08-28.md
| not builtSimulation: an external-signer stub. No MPC, no HSM, no integration.
Shown before the seed is asked for
The master seed becomes a permanent decryption credential. Anyone who ever holds it can decrypt every confidential balance this account has held, past and future. XLS-96 has no key rotation and no key recovery (P-10), so this cannot be undone.
The derivation is specified only in this repository and is not a published standard. A holder with their seed but without this repository cannot reconstruct their key. Issue #10 tracks this.
Required by the key-derivation ruling, REVIEW-012 condition 2.
What no key source changes
P-4No key source hides identities. The sender and receiver of every confidential transaction are public.
P-9A holder is never private from the issuer. The issuer can always decrypt.
P-10No key source supports rotation or recovery. XLS-96 supports neither.
P-11No key source hides who transacts, when, or how often. Only amounts are hidden.
F-1A newly created confidential balance is publicly identifiable as exactly zero.
F-24Retiring a position in tranches publishes each tranche size.
P-5None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /wallet

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
A browser wallet cannot hold a confidential position
The three wallets examined (Xaman, GemWallet and Crossmark, on 2026-08-28) cannot, and the reasons are structural, not missing features. A wallet that kept the ElGamal key inside the extension and offered a prove-and-sign operation could; none of those examined does.
A confidential transaction needs two secrets: the ElGamal secret, to decrypt the balance and build the proof, and the XRPL account key, to sign. A wallet supplies only the second.
Under the ruled key generation, the ElGamal secret is derived from the master seed. A derived-key account has no other way to get it.
A wallet extension exists in order not to release seed material. That is the product, not a gap in its API.
So a page cannot assemble the transaction through these wallets. They are not refusing a permission; they hold nothing they are built to give a page.
What a wallet can do
yesOrdinary XRPL transactions
Ordinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.
gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)
yesProve control of an account
Enough to show that account’s observer view, which anyone with the address can read anyway.
What this page does not claim
Not determined: whether a given wallet build can serialise XLS-0096 transactions. The page-side SDKs examined on 2026-08-28 carry no codec, so serialisation happens inside the extension, or for Xaman in its backend, and none of them names the codec version (CLAIMS.md E-206). This is not why a wallet cannot hold a confidential position: the reasons above are structural, and this one could change with any release.
CLAIMS.md E-206.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

````


END OF MATERIAL. Now answer the five questions and the stopping-condition question, and end with `END OF LEG B REPORT`.
