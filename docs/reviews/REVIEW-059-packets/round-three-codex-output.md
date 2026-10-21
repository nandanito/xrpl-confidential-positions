Step 0 results:

```text
https://github.com                          200
https://s.devnet.rippletest.net:51234/        400

pwd:
$USER_TMP/T/r059a3.a9gx52/repo

git log --oneline:
ea17ab9 after round two's fixes
e2f3bdd before round two's fixes
```

Network was available. Tracked files remain unchanged. No remote state was changed and no transaction was submitted.

**The original round-two examples are repaired, but several requested properties remain incomplete.** Browser conclusions below distinguish source-supported findings from measurements: Chrome failed with `Chrome did not open a DevTools port`.

The principal reproductions are [probes.ts](review-work-r3/probes.ts), [probes.log](review-work-r3/probes.log), [release-probes.ts](review-work-r3/release-probes.ts), and [release-probes.log](review-work-r3/release-probes.log). Preflight probes stubbed **only** the public-main predicate; the real `runChecks` remained enabled.

**1. The gate’s new checks — R2-1, R2-2, R2-3**

I ran:

```text
bun run review-work-r3/probes.ts

baseline []
detector controls "50/50"
```

These are the 50 detector controls, excluding the unbroken-copy control and private-store secret control. I did not invoke `runControls`.

Round two’s exact account paragraph, issuance paragraph, both issuer-figure sentences, entity-encoded script, and external second `srcset` candidate now produce their intended findings. Independent deletion of the new matchers makes their corresponding controls fail; [control-isolation.log](review-work-r3/control-isolation.log) records this.

- **R3-1 | HIGH | R2-1 still scans source spelling rather than rendered identifiers. | Evidence:** `tools/check-web-hosted.ts:286` applies the address and issuance patterns directly to HTML. The probe prints `account-entity []`, `account-entity preflight []`, `issuance-entity []`, and `issuance-entity preflight []`. Encoding the address’s initial `r` as `&#114;`, or the issuance’s initial `0` as `&#48;`, displays the original identifiers unchanged. Splitting the address as `rHb9<span>CJAWyB4rj91VRWn96DkukG4bwdtyTh</span>` also prints `account-markup []`. **Smallest fix:** scan parsed, entity-decoded page text, preserving adjacent inline text, with these cases as controls.

- **R3-2 | HIGH | R2-2’s labelled-figure exclusion remains narrower than its claim. | Evidence:** `tools/check-web-hosted.ts:157` requires a digit immediately after a narrow label form. `Decrypted issuer balance is 42` and `42 (decrypted issuer balance)` both return gate `[]` and preflight `[]`. Moreover, the control named **“a figure labelled after its value”** at line 447 actually plants `Holder A balance (decrypted): 1,000`: the label precedes the numeric value. It therefore does not test its named case. **Smallest fix:** cover ordinary connecting words and labels following numeric values; replace that control with an actual value-first example.

- **R3-3 | LOW | R2-3’s attribute decoding still misses browser-recognised encodings. | Evidence:** the same probe prints `scheme-named []`, `scheme-no-semi []`, `scheme-tab []`, and `scheme-backslash []` for `&sol;&sol;…`, optional-semicolon numeric references, an embedded tab between slashes, and slash/backslash forms. `tools/check-web-hosted.ts:230` performs partial entity decoding followed by string-prefix tests. **Smallest fix:** parse HTML attributes with browser-compatible entity handling and resolve candidate URLs before testing their origins.

- **R3-4 | LOW | The new entity decoder introduces false failures and an exception. | Evidence:** `entity-invalid THREW "RangeError: Arguments contain a value that is out of range of code points"` for valid HTML containing `&#1114112;`; HTML decoding substitutes U+FFFD. The correct same-origin attribute `href="&#x26;#47;&#x26;#47;analytics.example.net/a"` is rejected as scheme-relative because hexadecimal decoding creates decimal references which the next replacement decodes again. See `tools/check-web-hosted.ts:74` and `scheme-double-decode-correct` in the log. **Smallest fix:** use a single HTML-compatible decoding operation rather than sequential substitutions.

Thus every new control triggers its configured rejection, but the purported value-first control does not exercise the case its name promises.

**2. Release-time fixes — R2-4 through R2-7**

After `bun install --frozen-lockfile`:

```text
bun test web/hosted
47 pass
0 fail
```

Round two’s `readAt: "2"`, Testnet endpoint string, missing image, and literal `charset=utf-16le` now fail. The charset example produces 17 comparison findings across page-file and route requests.

- **R3-5 | HIGH | R2-4 still does not bind the actual footer and source fields. | Evidence:** `web/hosted/deploy-preflight.ts:90` searches the whole page for the provenance sentence. Changing every footer to ledger `1` and adding the correct sentence elsewhere prints `wrong-footer gate []` and `wrong-footer preflight []`. Replacing the displayed endpoint with “another public source” while putting the expected endpoint in a hidden paragraph likewise prints `comment-endpoint gate []` and `comment-endpoint preflight []`. Conversely, splitting the correct footer index with an inline `<span>` makes all six pages fail provenance matching although their displayed sentence is unchanged. **Smallest fix:** parse and compare the footer and ledger-source fields themselves, rather than accepting matching text anywhere.

- **R3-6 | HIGH | R2-4’s schema still accepts malformed snapshot timestamps. | Evidence:** `manifestProblems` and preflight both return `[]` for `2026-99-99T99:99:99.999Z`; the read-time case also updates the pages and verdict. `web/hosted/deploy-preflight.ts:42` checks timestamp punctuation, not calendar validity. Removing `isolation` or `environment` also passes, contradicting line 47’s “Every field the build writes is required.” **Smallest fix:** validate timestamps by parsing and exact round-trip comparison, and define the complete manifest schema—or narrow the “every field” claim.

- **R3-7 | LOW | R2-5’s charset parser can inspect a fictitious parameter inside a quoted value. | Evidence:** `bun run review-work-r3/release-probes.ts` prints:
  
  ```text
  {"type":"text/html; note=\";charset=utf-8\"; charset=utf-16le",
   "effectiveCharset":"utf-16le","result":[]}
  ```
  
  `node:util`’s `MIMEType` identifies the actual charset; comparison passes because `web/hosted/compare-deployed.ts:50` splits inside the quoted string. Correct UTF-8 aliases `utf8` and `unicode-1-1-utf-8` instead produce 17 false failures. Those labels denote UTF-8 in the [Encoding Standard](https://encoding.spec.whatwg.org/#names-and-labels). **Smallest fix:** use a MIME parser and compare the resolved encoding.

- **R3-8 | HIGH | R2-6 retains an event gap during the newly added inspection. | Evidence:** source-supported, **browser confirmation pending**. At `web/hosted/browser-check.ts:210`, `inspect` receives an already-copied event slice. Inside `inspect`, evaluating `window.__violations.splice(0)` can emit a console error after that snapshot. Line 212 then starts the click interval after the error, excluding it from both inspections. The prepared `second-home-inspect-gap` copy logs synchronously from that operation only on the second overview load; its gate and preflight return `[]`. **Smallest fix:** consume events using a continuous cursor, including events arriving during inspection, instead of opening a new interval after inspection returns.

- **R3-9 | HIGH | R2-7’s requested clipping check is absent. | Evidence:** source-supported, **browser confirmation pending**. `web/hosted/browser-check.ts:175` measures an element’s rectangle, opacity and `checkVisibility`, without testing clipping. `[data-dh2-wording]{clip-path:inset(50%)}` removes the disclosure visually while retaining those properties and its `innerText`. Ancestor overflow clipping is similarly unchecked. Conversely, `display:contents` leaves text visible but removes the element boxes that this check requires. The [CSSOM visibility algorithm](https://drafts.csswg.org/cssom-view/#dom-element-checkvisibility) does not establish freedom from clipping. **Smallest fix:** test the disclosure’s painted text regions against clipping ancestors; permit visible text hosted by elements without their own boxes.

Every browser case is a prepared copy of `review-input/rebuilt/`. All have gate `[]` and preflight `[]` with only public-main stubbed:

| Exact command | Result that would confirm the assessment |
|---|---|
| `bun run web/hosted/browser-check.ts review-work-r3/browser-second-home` | FAIL mentioning `R2_SECOND_HOME`; confirms the original repair |
| `bun run web/hosted/browser-check.ts review-work-r3/opacity-zero` | FAIL for invisible disclosures, including after navigation |
| `bun run web/hosted/browser-check.ts review-work-r3/nav-opacity` | FAIL for invisible disclosures after navigation |
| `bun run web/hosted/browser-check.ts review-work-r3/second-home-error-late` | FAIL mentioning `R3_HOME_LATE` |
| `bun run web/hosted/browser-check.ts review-work-r3/second-home-inspect-gap` | PASS despite `R3_SECOND_INSPECT_GAP`; confirms R3-8 |
| `bun run web/hosted/browser-check.ts review-work-r3/clipped` | PASS with disclosures clipped away; confirms R3-9 |
| `bun run web/hosted/browser-check.ts review-work-r3/ancestor-clipped` | PASS with ancestor-clipped disclosures |
| `bun run web/hosted/browser-check.ts review-work-r3/display-contents` | FAIL despite visible disclosure text; confirms the false rejection |

These are predictions, **not observed browser passes**. The adjudicator’s supplied successful original-example and self-test measurements remain separate evidence.

**3. Text and record fixes — R2-9 through R2-12**

The complete project-corpus sweep, excluding `docs/reviews/`, Git internals, installed dependencies and review scratch copies, read **463 files**. It included both supplied output roots. All matches and surrounding qualifications are in [text-sweep.log](review-work-r3/text-sweep.log).

**No findings in R2-9 or R2-11:** the Vite comment now names the limited guarantee; the browser and comparison headers correctly name README steps 4 and 7.

The specific unsupported codec negatives reported by R2-10 are scoped or explicitly retracted in current source. One related wallet absolute remains:

- **R3-10 | LOW | The edited E-206 still carries the unqualified wallet-update guarantee. | Evidence:** `CLAIMS.md:266` still says, “A demonstration built on reason 4 would be falsified by a wallet update; one built on reasons 1–3 cannot be.” This is live, unstruck prose. `web/api/capability.ts:171` and line 177 explicitly allow a wallet that derives the viewing key and constructs proofs internally; `ADR-0003:76` already retracts the corresponding absolute. **Smallest fix:** carry that scoped replacement into E-206 too.

The other surviving old forms are:

- `docs/research/CUSTODY-2026-08-28.md:30`, `:40`, `:60`: contextual copies, accompanied by the derivation exception and policy alternatives in that document.
- `web/api/custody-sim.ts:67`: the policy generalisation within its explicitly defined simulation.
- `CLAIMS.md:266`, `:403`, `:404`, and `ADR-0003:74`, `:76`: quoted or struck historical forms, apart from R3-10.
- Architecture lines 5–6: explicitly identified revision history.
- The deliberately old deployed artifact: `capabilities/index.html`, `custody/index.html`, `wallet/index.html`, `observer/index.html`, `issuer/index.html`; `assets/custody-hkJYX5SB.js`; `assets/index-CKAZ0d8y.js`; and `gate-verdict.json`. These retain the previously reported custody, wallet, balance-note and step-number copies. They are not evidence of a regression in rebuilt output.

For R2-12 I independently removed qualifications from each custody surface in an isolated archive:

| Removal | New custody tests |
|---|---:|
| Page’s internal-derivation exception | 1 fail |
| Matrix’s internal-derivation exception | 1 fail |
| Simulation’s internal-derivation exception | **0 fail** |
| Public-data qualification, separately on each surface | 1 fail each |
| Page’s first two policy alternatives | **0 fail** |

- **R3-11 | LOW | R2-12’s regression remains incomplete. | Evidence:** `python3 review-work-r3/custody-probes.py` reports **184 pass, 0 fail** for `bun test web/api web/hosted` after removing the simulation’s internal-derivation exception, and again after removing the page’s key-sharing and holder-attestation alternatives. `web/api/disclosure.test.ts:628` checks only “outside the platform” in simulation reasons; the page test checks only the final alternative’s “neither built nor costed” wording. **Smallest fix:** assert the simulation’s internal-derivation exception and all three page policy alternatives independently.

**4. Records of the fixes**

E-343’s narrowed coverage sentence and E-344’s correction from four regression-tested completions to three accurately describe the earlier state.

The following current statements exceed the measured implementation:

| Statement | Counterevidence |
|---|---|
| E-346: any address-shaped string or issuance ID is refused | Encoded and inline-split identifiers pass, R3-1 |
| E-346 and printed limit 9: labelled figures are refused, label before or after | Connecting-word and value-first cases pass; the named control plants neither value-first case, R3-2 |
| E-346: preflight validates “every field” | Missing fields and impossible timestamps pass, R3-6 |
| E-346 and README step 5: the footer’s provenance is matched | Matching text elsewhere masks the wrong footer, R3-5 |
| E-346 and README step 7: incompatible charsets are refused | Quoted-parameter bypass, R3-7 |
| E-346: custody exceptions are pinned | Specific removals leave 184 tests passing, R3-11 |
| README step 4: invisible/collapsed disclosures fail | Clipping remains untested; browser confirmation is pending, R3-9 |

Printed limit 8 also omits the raw-HTML spelling boundary demonstrated by R3-1. These records should name actual coverage until the corresponding checks are strengthened.

Both generated-record checks passed:

```text
13 topic files match CLAIMS.md — 424 rows
the index matches CLAIMS.md — 424 rows
```

**5. Rebuilt output**

`runChecks` returns `[]`. I read all six page bodies against P-1 through P-12.

**No additional findings in those page bodies.** The custody qualifications and simulation label are present; wallet statements are dated and scoped; identities and timing remain public; canonical zero is distinguished from other zero balances; no issuer plaintext figure is displayed.

There is one additional output-tooling observation, not attributed to a changed secret detector:

- **R3-12 | LOW | The newly rebuilt verdict causes a false secret-scan failure when scanned again. | Evidence:**  
  `bun run tools/check-no-secrets.ts --dir review-input/rebuilt/.vercel/output --no-local-store` returns `verdict=FAIL exit=1`, identifying the SHA-256 under `Verdict-D4nfSkC-.js` as a labelled scalar. I recomputed the digest and confirmed equality. Removing **only** `gate-verdict.json` from a copy produces `verdict=PASS-SHAPES-ONLY exit=0`. The filename’s `Sk` triggers the label heuristic. **Smallest fix:** recognise verified `gate-verdict.json` per-file digest entries structurally, without exempting arbitrary labelled hex values.

The shapes-only run establishes no private-store comparison. Its post-verdict failure does not contradict the adjudicator’s successful scan before the gate wrote that verdict.

**Answer to the required question**

**Yes: R2-1, R2-2 and R2-4 remain partly undischarged**, demonstrated by executed counterexamples to their requested properties. Their original literal examples now fail correctly.

**R2-6 and R2-7 additionally have source-supported remaining failures**, with prepared browser confirmations above; I could not measure those browser outcomes here.

The stopping condition closes the rotation after this report, whatever it finds. There is no fourth round.

**Files opened**

- [Complete path-by-path list — 2,081 entries, including removed direct-control copies](review-work-r3/opened-files.txt).
- [The 28 changed files read whole](review-work-r3/changed-files-audit.txt).

END OF ROUND THREE REPORT
