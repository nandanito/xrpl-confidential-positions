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
