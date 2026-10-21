Step 0 results:

```text
https://github.com                            200
https://s.devnet.rippletest.net:51234/          400

pwd:
$USER_TMP/T/r059a2b.wrslOU/repo

git log --oneline:
e5145a0 after fixes
ec683fc before fixes
```

Network was available. No external state was changed and no transaction was submitted. Tracked files remain unchanged.

**The fixes are incomplete.** In particular, B1-8’s original example still passes, and the issuer-figure exclusion still lacks the requested output regression.

Evidence scripts and logs are under [`review-work-r2/`](review-work-r2/). In preflight mutation tests, I replaced only the public-main predicate with `() => true`; the rebuilt commit is unpublished. Gate checks remained enabled.

**1. The gate’s fixes**

I ran every exported detector control separately through `runChecks`, avoiding `runControls`’ private-store sweep:

```text
baseline []
detector controls "42/42"
```

The separate scan returned:

```text
check-no-secrets: verdict=PASS-SHAPES-ONLY exit=0
```

This establishes no private-store comparison.

| Finding/class | Original example and next modification | Result |
|---|---|---|
| R1-1 | Prepend `connect-src *;`; then prepend an uppercase duplicate | Both caught |
| S-1 | Insert second catch-all, path-specific, and final header-setting routes | All caught |
| R1-2 | Remove observer marker and wording together | Caught |
| R1-2 / B1-1 | Add “Decrypted issuer balance: 42”; then “Issuer plaintext balance: 73” elsewhere | Both pass |
| B1-8 | Original `rHb9…` balance paragraph; then an issuance-ID balance paragraph | Both pass |
| R1-3 | Authentic `@noble/curves` notice; then authentic `@noble/hashes` notice | Both rejected specifically as unadmitted |
| R1-4 | Delete seroval’s notice; then scheduler’s | Both caught |
| S-3 | Delete both additional headers; then change COOP to `unsafe-none` | Both caught |
| S-4 | Original forbidden preamble; then an unpaired trailing section | Both caught |
| Scheme-relative URLs | Original script; then stylesheet link | Both caught |
| Scheme-relative URLs, next variants | Entity-encoded slashes; external second `srcset` candidate | Both pass |

The new controls exercise their named rejection messages. Independently deleting package admission from an instrumented detector changed the authentic-curves result from its sole admission finding to `[]`. R1-3’s control now tests the intended rule.

- **R2-1 | HIGH | B1-8’s original example remains undetected. | Evidence:** `bun run review-work-r2/probes.ts` prints `b18-original []`, `b18-original preflight []`, `b18-next []`, and `b18-next preflight []`. The original paragraph uses `rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh`; [check-web-hosted.ts:243](tools/check-web-hosted.ts#L243) checks only the four `DEMO_ACCOUNTS` addresses. An issuance ID also escapes. The browser checks disclosures only on the two named ledger pages; comparison checks agreement with the same artifact. **Smallest fix:** detect general account addresses and issuance IDs in rendered page content, with controls using B1-8’s actual example and a different issuance.

- **R2-2 | HIGH | R1-2’s issuer-figure half and B1-1 were replaced by a disclaimer rather than discharged. | Evidence:** the same command prints `issuer-figure []`, `issuer-figure preflight []`, and equivalent empty results for the second wording. No hosted rendering regression rejects either figure. The new published limit at [check-web-hosted.ts:447](tools/check-web-hosted.ts#L447) additionally asserts that a figure could enter only as text in a public commit. That does not follow from absence of a key: build dependencies retain write access after the tree check. **Smallest fix:** add the requested hosted rendering/output regression for D-H3, and replace the claimed impossibility with the actual boundary.

- **R2-3 | LOW | The scheme-relative URL fix covers raw attribute prefixes, not the whole class. | Evidence:** `scheme-entity []` for `<script src="&#47;&#47;analytics.example.net/a.js">`; `scheme-srcset []` for an external second candidate. The matcher at [check-web-hosted.ts:195](tools/check-web-hosted.ts#L195) neither decodes attributes nor parses candidate lists. Browser CSP provides a later check, so this is not HIGH. **Smallest fix:** parse decoded URL attributes and every `srcset` candidate.

**2. Release-time fixes**

Required commands:

```text
bun test web/hosted
43 pass, 0 fail

compare-deployed review-input/deployed <live origin>
compare-deployed: verdict=PASS exit=0

compare-deployed review-input/rebuilt <live origin>
compare-deployed: verdict=FAIL exit=1
```

The rebuilt comparison reported missing new assets, changed page bytes/policies, and a different verdict, as expected.

My local comparison probes rejected `text/plain`, a verdict served with HTTP 302, and a verdict missing Permissions-Policy. Preflight rejected missing `trial`, a different ledger index, a different complete timestamp, and a widened policy accompanied by a rewritten verdict. Those tested portions of R1-6, R1-7 and S-5 hold.

Chrome could not open a DevTools port:

```text
error: Chrome did not open a DevTools port
```

Consequently, the following browser findings are supported by source inspection and prepared mutations, **not an experimentally observed browser PASS**. The adjudicator’s supplied console/navigation and `display:none` measurements remain separate evidence.

- **R2-4 | MEDIUM | Preflight still accepts malformed and inconsistent snapshot metadata. | Evidence:** `bun run review-work-r2/release-probes.ts` prints `readtime-malformed []` for `readAt: "2"` and `endpoint-mismatch []` for a Testnet endpoint string in the manifest. No network request was made to that endpoint. [deploy-preflight.ts:64](web/hosted/deploy-preflight.ts#L64) accepts any truthy substring occurring anywhere in each HTML file, and never binds the manifest endpoint. Removing `image` also passes. **Smallest fix:** validate the manifest schema, parse and compare the actual rendered provenance fields, and bind the source endpoint. R1-7 asked for schema validation and snapshot metadata binding; E-344’s completion remains partial.

- **R2-5 | MEDIUM | The content-type fix ignores a parameter that changes interpretation of the checked bytes. | Evidence:** the comparison probe serves unchanged UTF-8 HTML as `text/html; charset=utf-16le`; `utf16-pages []`. Its decoding witness prints `{"utf8":true,"utf16":false}` for the presence of `W-CONF`. [compare-deployed.ts:50](web/hosted/compare-deployed.ts#L50) discards every parameter. **Smallest fix:** require a compatible charset for the UTF-8 text artifacts, with this mutation as a regression.

- **R2-6 | MEDIUM | The second overview load still has an unchecked exception/console interval. | Evidence:** [browser-check.ts:178](web/hosted/browser-check.ts#L178) reloads `/`, waits 1.5 seconds, discards violations, and starts the inspected interval only at the subsequent click. The prepared `browser-second-home` copy logs an error only on that second home visit; its gate and preflight both return `[]`. **Smallest fix:** inspect that navigation interval before clearing events or violations. Browser confirmation command: `bun run web/hosted/browser-check.ts review-work-r2/browser-second-home`; the predicted confirming result is PASS despite `R2_SECOND_HOME`.

- **R2-7 | MEDIUM | Rendered-text membership does not establish disclosure visibility. | Evidence:** the prepared `opacity-zero` copy adds `[data-dh2-wording]{opacity:0}`; gate and preflight both return `[]`. [browser-check.ts:165](web/hosted/browser-check.ts#L165) checks only `document.body.innerText`, which does not test opacity. **Smallest fix:** inspect disclosure elements and their ancestors for visibility, opacity and clipping, and verify again after client navigation. Browser confirmation command: `bun run web/hosted/browser-check.ts review-work-r2/opacity-zero`; the predicted confirming result is PASS with invisible disclosures.

**3. Build and snapshot fixes**

The concrete R1-10 contamination and repository-root cases are fixed in the paths I tested:

```text
clean export []
extra asset ["web/app/public/assets/review059.js is in the build tree and not in the commit"]

actual build command with --out .
error: --out must be outside the repository ...
```

The root refusal happened before Docker. The nonempty-directory and missing-file tests also passed. Cleanup is now in `finally`. **No findings in those tested R1-10 fixes**, including its explicit `out === repoTop` half.

The tree check compares path sets, not contents:

```text
changed committed bytes []
```

Dependency code can also add a public asset after the check. This remains the disclosed provenance residual; I am not treating it as failure of the specific reused-workspace repair.

An exact container probe for that residual is: in a temporary instrumented copy of `build.ts`, prepend these commands to `OFFLINE_SCRIPT`, after the store check:

```sh
mkdir -p /src/web/app/public/assets
printf 'export const outsider=1;\n' > /src/web/app/public/assets/review059.js
```

Then run the normal commit build into a new outside-repository output directory. Presence of `static/assets/review059.js`, followed by gate/preflight acceptance, confirms admission after the tree check; refusal or exclusion refutes it. **Not run: Docker is unavailable.**

The README, manifest `isolation` string and ADR-0004 now consistently describe the network split: install/snapshot retain network and host-loopback reach; Vite/assembly run with `--network none`. **No findings in that wording**, checked against the invocation and supplied container measurements.

Snapshot probes produced:

```text
positive then negative
{"calls":1,"state":"present","amount":"750","total":"7","mirror":true}

changed network
REFUSED_NOT_DEVNET ...
```

Thus R1-8 now reuses both the position and issuance. R1-9’s network-identity half holds.

```text
bun test web/hosted facility/tests/loopback.test.ts
83 pass, 0 fail
```

- **R2-8 | MEDIUM | R1-9’s ledger-hash half remains undis­charged, deliberately. | Evidence:** `bun run review-work-r2/reader-probes.ts` accepts two MPToken answers at index 42 carrying different hashes. [loopback.ts:265](facility/src/loopback.ts#L265) checks only validation and index; negative metadata also discards the hash. **Smallest fix:** retain and pin the validated hash and require it on positive and negative answers. This is an acknowledged residual, but the original finding explicitly requested it.

- **R2-9 | LOW | R1-11’s corrected guarantee survives elsewhere in its old absolute form. | Evidence:** [vite.hosted.config.ts:8](web/app/vite.hosted.config.ts#L8) still says “Nothing from the build machine’s environment reaches the bundle.” My canary probe returned `encoded canary []` and found the verbatim control; commit and canonical-URL metadata intentionally reach the output. **Smallest fix:** replace this comment with the same limited guarantee now used by `build.ts` and the manifest.

**4. Text and records**

The complete-file sweep covered all 44 changed files. Both generated-record checks passed:

```text
13 topic files match CLAIMS.md — 422 rows
the index matches CLAIMS.md — 422 rows
```

The corrected footer disclosure appears on all six rebuilt pages. Holder A’s absent-account snapshot now carries a dated historical note rather than a balance claim. The wallet’s rendered gap restores Xaman’s backend and scopes its negative to dated SDK checks. The custody page now includes the internal-derivation exception, the public-data qualification and all three policy alternatives.

The search results are preserved in [`text-sweep.log`](review-work-r2/text-sweep.log) and [`rg-old-phrases.log`](review-work-r2/rg-old-phrases.log).

- **R2-10 | LOW | Corrected custody and wallet claims remain unqualified in live repository text. | Evidence:** the sweep finds:
  - Custody derivation/policy claims: `docs/decisions/ADR-0003-web-tier-trust-boundary.md:264–265`.
  - Unqualified amount-policy claims: `docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:186,188–190`.
  - Unsupported wallet corpus negatives: `CLAIMS.md:266` (E-206); `docs/decisions/ADR-0003-web-tier-trust-boundary.md:74`; `docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:177–178,213`; `docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md:51`; `web/api/capability.ts:69–70`.
  
  E-206’s package-dependency search does not establish “no wallet publishes that version” or impossibility of determining it from any published source. Those are still P-12’s prohibited shape. **Smallest fix:** propagate the scoped replacements to these copies.

The research document also retains the old custody formulations at `docs/research/CUSTODY-2026-08-28.md:30,40,60`, but expressly supplies the exception and alternatives in the same document. `web/api/custody-sim.ts:67–68` retains the policy generalisation within its explicitly defined simulation. These are contextual copies, distinguished from the unqualified summaries above.

- **R2-11 | LOW | S-7’s numbering correction missed its browser-header half. | Evidence:** `web/hosted/browser-check.ts:2` still says “ADR-0004 step 4”; `web/hosted/compare-deployed.ts:3` similarly says “D-H4 and step 5.” The shipped verdict correctly names README step 7. **Smallest fix:** name the actual README procedure steps in both headers.

Other sweep results:

- **B1-2:** no surviving bare footer presentation in rebuilt pages; the explanatory sentence is present on all six.
- **B1-5:** no surviving “only the alias serves” sentence. E-336 and NEXT-SESSION-PROMPT now distinguish the production alias. The production comparison passed.
- **S-6:** “Step 9 is not built” remains at architecture lines 5–6 as an explicitly identified quotation and revision-11 history, below the new revision-12 status. **No finding.**
- **S-9:** no surviving repository-wide “does not tell you how to create” claim. README now identifies its narrower scope and points to signer documentation. **No finding.**
- **R1-14:** the old balance note survives only in the intentionally old deployed artifact, not current source or rebuilt output.
- **B1-4:** “step 5 compares” survives only in that old deployed verdict.

E-342 accurately records the adjudication and its measurements. E-343’s broad statement that the gate refuses a ledger value outside the named pages exceeds R2-1’s measured coverage.

- **R2-12 | LOW | E-344 overstates regression-test coverage. | Evidence:** in an isolated archive, I restored the before-fixes custody view, capability matrix and custody simulation, retaining current tests. `bun test web/api web/hosted` still reported **177 pass, 0 fail**. E-344 says “Each completion has a test that fails”; the custody completion has no such effective regression. **Smallest fix:** add a test that fails when those qualifications disappear, or correct the record to distinguish source inspection from regression-tested completions.

**5. Rebuilt output**

`runChecks` returned `[]`; the separate shapes-only secret scan passed. I read all six page bodies against P-1 through P-12 and the accepted D-H2 text.

**No additional findings in the six rebuilt page bodies.** The changed disclosures are present, custody remains labelled a simulation, identities/timing remain public, canonical zero is distinguished from other zero balances, and no issuer plaintext figure is displayed.

The new verdict’s item 9 contains the overstated build guarantee already reported in R2-2. The artifact’s unpublished commit is correctly prevented from release by the public-main preflight check.

For completeness, the broader command produced **285 pass, 5 fail** across 290 tests. All five failures arose because the signer binary is absent. I did not run cargo, rebuild the environment or claim those failures reproduced the adjudicator’s environment.

**Undischarged upheld findings**

Against the reports’ own words: **R1-2, B1-1, B1-8, R1-5, R1-6, R1-7, R1-9, R1-11 and S-7** remain wholly or partly undischarged. R1-5 and R1-2’s opacity case have source-supported browser residuals whose experimental confirmation remains pending.

R1-12 and R1-13’s served sentences are corrected; their surviving repository copies are reported separately above. R1-10’s explicit reused-workspace and repository-root failures are repaired; its documented dependency-write boundary remains.

The stopping condition, word for word:

> “Round one reviews the build. If it upholds any finding that changes code, a gate or a record, round two runs on the fixes alone, and it is the last unless it finds a fix that did not discharge its finding; a third round is then the owner's decision.”

**Yes, it fires.** B1-8’s original example and R1-2’s issuer-figure example still pass the fixed checks. That conclusion does not depend on the pending browser probes.

**Files opened**

The exhaustive list—including all whole-tree sweep inputs, package notices, output files and removed mutation copies—is in [`review-work-r2/opened-files.txt`](review-work-r2/opened-files.txt). Ordinary runtime dependency loading and test-created fixtures are excluded.

Primary inspections comprised:

- The three round-one reports and round-one adjudication.
- All 44 changed files, enumerated individually in [`changed-files-audit.txt`](review-work-r2/changed-files-audit.txt).
- `docs/research/CUSTODY-2026-08-28.md`, `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, `docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md`.
- `web/app/src/hosted/wording.ts`; `web/hosted/{pages.ts,csp.ts,vercel-output.ts,wording.test.ts,csp.test.ts}`.
- Both supplied output roots, including their manifests, configurations, six HTML pages, assets, licences and verdicts.
- The review scripts, instrumentation and logs enumerated in the exhaustive list.

END OF LEG A REPORT
