STEP 0
$USER_TMP/T/r060a.qD7Xey/repo
3b6b3aa after: the archive tree at aabb31e
e8c1081 before: the archive tree at 3659a87
Subject: git diff HEAD~1 HEAD. Exactly two commits.
FINAL REPORT — supersedes the intermediate scratch report.

FINDINGS — most severe first

1. [P1] Limit the zero-knowledge explanation to transactions that prove — web/app/src/hosted/routes/how-it-works.tsx:41–43
HIGH — “So each confidential transaction carries zero-knowledge proofs, which every validator checks without learning the amount.” TASK ZERO §3 explicitly makes MergeInbox proof-free and later Converts proof-free; Convert and ConvertBack also publish their amounts. This additionally contradicts the README’s Proofs table and this page’s public-boundary panels. Replace the universal statement with a Send-specific explanation, distinguishing proof-free operations and public conversion amounts.

2. [P1] Keep the new disclaimer compatible with the wording test — web/app/src/hosted/routes/how-it-works.tsx:215–216
MEDIUM — “It is not audited, not production-ready and not safe to put value behind.” is correctly negative under P-5, but its source line containing `production-ready` lacks the exemption required by `web/api/disclosure.test.ts:128–132`. Running `bun test web/api web/hosted` produces 191 passes and this one failure at line 135. Keep the disclaimer and either add its P-5 citation on the scanned line or update the detector to recognise the negation; do not remove the warning to make the test pass.

3. [P2] Preserve the seed-rederivation exception in the key-loss limit — web/app/src/hosted/routes/how-it-works.tsx:202–204
MEDIUM — “If a holder loses it, the balance cannot be spent, and the only remedy is an issuer clawback, which destroys the balance.” drops the exception demonstrated by E-119 and retained in the README and capability matrix: a holder retaining the master seed can reconstruct a derived ElGamal key. P-10 prohibits protocol recovery, not this application-level reconstruction; [CLAUDE.md:127](CLAUDE.md#L127) explicitly requires keeping those layers separate. Say “irretrievably loses it, including any seed from which it can be re-derived” and retain the seed-rederivation qualification.

4. [P2] Disclose that this project enables the clawback power — web/app/src/hosted/routes/how-it-works.tsx:208–209
MEDIUM — “If the token allows clawback, the issuer can destroy a holder’s whole confidential balance.” states E-21’s protocol condition but omits that this project sets the flag. E-223 records both live issuances with `Flags=224`, and `facility/run-facility.ts` sets `tfMPTCanClawback`; the README explicitly says the issuer can therefore burn a balance in every demonstration here. Preserve that application of the condition instead of leaving readers to guess whether the example or displayed token permits it. Add “This project’s demonstrations enable it” and cite E-223. The project-specific disclosure is recorded in [CLAIMS.md:283](CLAIMS.md#L283).

5. [P2] Enforce citation pinning beyond raw HTML strings — tools/check-web-hosted.ts:383–386
MEDIUM — The new invariant, “A link into the repository at any commit but the build's would cite text the gate never saw.”, is not enforced for all admitted citations. On copies of the supplied build, `runChecks()` returns no findings for a wrong-commit blob URL placed literally or assembled in the loaded JavaScript bundle. It also accepts an HTML href using `https&#58;` and `blob&#47;` before a different 40-hex commit: check 5 decodes and admits it, while this raw-HTML regex misses it. Apply the expected-commit constraint to canonicalised citation URLs in HTML and bundled code, with controls for both bypasses.

6. [P2] Carry the facility run’s remote-source qualification — web/app/src/hosted/routes/how-it-works.tsx:145–145
MEDIUM — “This project built that facility on XLS-96 and ran it on Devnet, in 28 validated transactions:” omits the condition E-146 and B-18 preserve. The walkthrough explicitly says this qualification must travel with the run claim: it used a remote ledger source under E-151’s risk acceptance, not B-15’s loopback conditions, and establishes acceptance and balance agreement rather than the loopback obligation. Add that short qualification and E-151/B-18 to the panel’s sources; see [FACILITY-WALKTHROUGH:11–15](docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md#L11-L15).

7. [P2] Explain that converted funds also require an inbox merge — web/app/src/hosted/routes/how-it-works.tsx:55–57
MEDIUM — “Moves tokens from the holder’s public balance into confidential form.” leaves out the condition needed to follow this Convert → Send lifecycle. F-27 establishes that Convert credits the inbox, not spending; a fresh holder cannot Send any converted funds until MergeInbox runs. The page mentions merging only for the recipient of a Send, repeating the precise missing distinction that previously broke the facility’s balance model. Add that Convert lands in the inbox and must be merged before spending, and cite F-27.

8. [P3] Name the scope of the 28-transaction count — web/app/src/hosted/routes/how-it-works.tsx:145–149
LOW — “This project built that facility on XLS-96 and ran it on Devnet, in 28 validated transactions:” uses the correct facility count but leaves its boundary implicit while the next step includes issuance creation. B-18 distinguishes 28 facility movements from 31 ledger-applied submissions, including two issuance-setup transactions and the unflagged control arm. Say “28 validated facility movements” to retain the register’s scope; use 31 if counting every applied submission by the driver.

9. [P3] Cite sources that establish the panel’s mechanism claims — web/app/src/hosted/routes/how-it-works.tsx:50–50
LOW — “Sources: E-1; tools/check-amendments.ts, run 2026-10-21” does not support most of the first panel: E-1 records authorship and specification status, and the amendment checker records network activation, not ElGamal balances, registration or proof obligations. Cite the README’s Terms/protocol sections and TASK ZERO §3 for those mechanisms, and the recorded dated reading rather than just the checker’s filename. The later source lists also omit R-7 for the arithmetic, E-118/E-119 for seed derivation/reconstruction, and `web/api/demo-accounts.ts` with E-101/E-118/E-176/E-208 for the account histories.

SECTION 1 — SENTENCE/SOURCE AUDIT

References below are to the committed second tree unless marked as supplied-build evidence. “Supported” means checked against the named source, not merely repeated from the register index. Findings above take precedence over these grouped checks.

/how-it-works, panel 1 (lines 32–50)
- “The XRP Ledger is public: anyone can read every account and every transaction on it.” — supported for public ledger records by README, “What XLS-96 hides”, and TASK ZERO’s observer discussion. It does not say encrypted payloads become readable amounts.
- MPT/XLS-33 identification — README Terms and introductory scope. XLS-96’s encrypted-holder-balance sentence — TASK ZERO §4 and WHAT-CONFIDENTIAL-MEANS, protocol mapping.
- ElGamal ciphertext/readable-with-the-key sentence — WHAT-CONFIDENTIAL-MEANS, protocol mapping; E-33’s balance/key relation. The later zero/inference qualifications matter and were checked below.
- Holder registration on opt-in — E-9, TASK ZERO §3’s first Convert, and F-27. Anti-overspending requirement — TASK ZERO §3’s Send proof obligations.
- Universal ZKP/no-amount-learning sentence — finding 1; not supported by TASK ZERO §3.
- Dated amendment sentence — supported by the recorded reading in docs/NEXT-SESSION-PROMPT.md:103: 2026-10-21T03:09:59.013Z, unchanged from enabled Devnet / supported-not-enabled Mainnet and Testnet. The 2026-10-18 JSON snapshot corroborates the older reading, not the 2026-10-21 observation. E-1 is about spec status/authorship, not amendment activation. I did not treat “Final” as “enabled”.
- Sources label — finding 9. Add actual mechanism sources and the dated reading’s record; E-1 alone does not establish those mechanisms.

Panel 2 (lines 55–82)
- Convert moves public holdings into confidential form, publishes the amount, first registers a key and cannot rotate it — supported by TASK ZERO §3, E-9 and F-26, with the missing inbox/merge condition in finding 7.
- Send moves between confidential positions; its amount is hidden, parties are public — E-33, TASK ZERO §3, P-4/P-11. Receipt into the inbox and MergeInbox into spending — FACILITY-WALKTHROUGH §3 step 6; F-27 establishes the analogous Convert requirement.
- ConvertBack moves out to public holdings and publishes each withdrawal separately — F-24 and TASK ZERO §3; not merely an aggregate disclosure.
- “Only Send hides an amount.” — matches README Terms and WHAT-CONFIDENTIAL-MEANS’ operation taxonomy; it must not be used to imply MergeInbox reveals its already-encrypted contents.
- Send’s proof of key knowledge — E-33. Equal plaintext across copies and nonnegative amount/remainder — TASK ZERO §3’s sigma linkage plus aggregated range proof. Copies for sender, receiver, issuer and optional auditor — E-4’s n=3/n=4 field measurements and E-58. No finding on these Send-specific sentences: they do not say a proof alone supplies the XRPL signature, and E-290 requires both credentials for movement.
- Conservation rationale, public confidential total, and published changes at Convert/ConvertBack — WHAT-CONFIDENTIAL-MEANS, “Why the door has to be public”; F-24; README public-supply list. E-12 additionally records the clawback decrement, which this sentence does not deny.
- Additional sources worth naming here: P-4, P-11, F-27 and the conservation explanation, beyond the currently named E-9/E-33/F-24/TASK ZERO §3.

Panel 3 (lines 90–114)
- Balance/Send-amount hiding from the public, but not the issuer — WHAT_IS_HIDDEN in web/api/observer.ts; P-9. Public parties, timing and frequency — P-4/P-11/R-1. Public individual entry/exit amounts — F-24/F-26. Public total supply/confidential supply — README’s protocol list and WHAT-CONFIDENTIAL-MEANS’ public-total mapping.
- Zero cases and spent-to-zero qualification — supported by F-1 and E-211. README makes the field scope particularly explicit: first initialisation writes zero to spending; merge resets inbox; clawback resets the whole position. The supplied observer HTML shows canonical spending for C, canonical inbox for A/B/D, and noncanonical spending for A/B/D. Noncanonical was not treated as nonzero.
- Public arithmetic can bound hidden values, and no key is needed for subtraction — WHAT-CONFIDENTIAL-MEANS limit 1 and R-7. R-7 correctly removes the inference that a transfer must have happened; retained and sent portions can sum to 100. This does not establish the hidden split.
- Missing panel citations: P-9 and R-7. R-1 concerns graph/timing, not the new arithmetic correction.

Panel 4 (lines 119–135)
- Holder reads its own balance; issuer’s mandatory mirror and no off-switch — E-58/P-9. Optional auditor with one supported auditor — E-58/E-11.
- “This was run, not inferred…” and reading again after a change — E-58: holder/issuer/auditor agreed at 500 and independently at 475 after a 25-unit Send. This claim is about that experiment, not decryption performed by this hosted site.
- “Only the holder can spend” with necessary Send witness and master-seed qualification — E-33 and README “Who can spend”; E-118/E-119 establish the implemented derivation. I did not interpret key knowledge as sufficient account-signing authority: the capability matrix and E-290 require the account authorisation as well. No positive non-custodial claim is made here.
- Add E-118/E-119 to this panel’s sources. The master seed’s permanent decryption consequence is also stated on the capability page.

Panel 5 (lines 141–196)
- Bank advances against suppliers’ invoices and drawdowns reveal commercial information — FACILITY-WALKTHROUGH §1.
- Built/executed facility — E-146/B-18 and FACILITY-WALKTHROUGH §6. Findings 6 and 8 preserve the run’s conditions and counting boundary; the record is 2026-08-25, not a new commercial deployment.
- Bank creates token; ordinary Dedicated Account; whole-float single Convert — FACILITY-WALKTHROUGH §3 steps 1–4, E-116 and R-5. It is not an XLS-65 Vault. Supplier public payment plus own Convert/key registration — step 5 and F-26. Drawdowns/repayments as Sends — steps 6–7. Retirement tranches as ConvertBack — step 9 and F-24. The actual driver/code additionally merges after conversion (F-27).
- Public float, enrolled counterparties, both enrolment amounts, draw/repayment events/timing/frequency and individual retirement tranches — F-24/F-26/R-1 and walkthrough disclosure table. Hidden credit limits, confidential draw/repayment sizes and per-supplier exposure — WHAT-CONFIDENTIAL-MEANS “What it actually buys you” and the walkthrough’s disclosure model; these are not claims that the ledger enforces credit limits or invoice servicing.
- Issuer reads these confidential positions — P-9. “Shape of the book, not its size” — WHAT-CONFIDENTIAL-MEANS’ concluding sentence, bounded by the public-edge/inference qualification already on the page.
- “These pages do not show the facility.” — confirmed: B-18’s facility issuance differs from DEMO_ISSUANCE in web/api/demo-accounts.ts. Four accounts / one demo issuance — that file, snapshot.ts and supplied observer/issuer HTML.
- A’s active-position label — DEMO_ACCOUNTS; E-208 records its first observer reading, not an exact creation date. B’s derived-key description — E-118/E-119 (2026-08-20). C’s ed25519 signing description — E-176 and docs/runs/b21-zeroized-default-path-devnet-2026-08-27.json. D’s early-test description — E-101’s clean-account run (2026-08-19). These are project test accounts, not the facility suppliers. The page does not publish exact creation dates for all four; I did not infer A’s creation date from E-208’s later read.
- Facility run recorded in repository — FACILITY-WALKTHROUGH §6, facility/README.md and B-18. The walkthrough link in supplied HTML targets one of the two admitted files at the manifest’s build commit.
- Add B-18/E-151, demo-accounts.ts and E-101/E-118/E-176/E-208 as applicable sources. E-146/F-24/F-26/R-1 do not themselves establish the four demo accounts’ histories.

Panel 6, “Limits” (lines 202–219)
- Registered-key immutability/no XLS-96 protocol rotation — E-9/P-10. Application-level reconstruction and loss — finding 3; E-119 and CLAUDE.md:127 distinguish the layers.
- Clawback burns the entire position — E-12. Requires the issuance flag — E-21. Whether this project enables it — finding 4, E-223 and README. A flagless issuance has no clawback remedy; the later conditional in the page must remain attached when describing that remedy.
- XLS-99 draft rotation/recovery and unknown amendment on three networks on 2026-10-20 — E-341 and docs/evidence/upstream-survey-2026-10-20/README.md. No claim that the draft is enabled or that XLS-96 already supports its proposal.
- Enabling locking later unless immutable; freezing without holder consent — E-290/E-292 and README. The page correctly preserves “read in rippled’s source, not run”; I did not promote it to executed evidence.
- Research/test network; not audited, production-ready or safe for value — P-5. Correct disclaimers, not an accusation that XLS-96 itself was unaudited. Finding 2 is a test integration failure, not an overclaim in the warning.
- Register-row identification and precedence (lines 223–225) — CLAIMS.md:5 and README Citations. The register index/topic summaries were not treated as evidence authorities.

Overview (web/app/src/hosted/routes/index.tsx)
- Lines 30–32, encrypted holdings and one Devnet snapshot — README protocol explanation, snapshot.ts/data.ts and the supplied manifest/HTML.
- Hidden summary, including “some zero balances are recognisable” — F-1/E-211 and observer WHAT_IS_HIDDEN, with the canonical/noncanonical checks above. Supported; it does not claim every zero is visible.
- Public summary — P-4/P-11/F-24/F-26. Issuer “Can always read every balance. No setting turns this off.” — P-9 and the issuer page’s mandatory-mirror explanation. Supported; no identities/timing/issuer-privacy overclaim found.
- Six destination descriptions — checked against each rendered page and its route/view: how-it-works, four-account observer, issuer’s ciphertext without the figure (ADR-0004 D-H3), capability matrix, wallets examined on 2026-08-28 (E-329/E-330), and custody approval-policy simulation (custody-sim.ts/CustodyView.tsx). The wallet description retains “examined”, not all possible browser wallets.
- Lines 59–61, build-time snapshot/no signing/no keys/static serving/same-origin files — snapshot.ts, static supplied output, runChecks inventory/no-server/CSP checks, and the user-supplied browser-check result. “Every value” was read in its established ledger-value context, not as a claim that explanatory numbers such as 500 came from this snapshot. I did not independently rerun the browser measurement or infer universal egress safety from it.
- Local wconf-signer signing, no browser signing — README architecture diagram, signer source, hosted data module and route exclusions. This is the site’s transaction path, not a new assertion that old research harnesses never signed.
- README’s build/local-viewer directions and missing profile/funding tutorial — checked README “Run it”, which explicitly states the latter gap and links signer/README.md; no invented onboarding walkthrough.
- Seven “What it never claims” entries — imported unchanged from capability.ts: P-4/P-9/P-10/P-11/F-1/F-24/P-5. The common banner/footer also remain shared; their build commit/index/time agree across the supplied pages. No new positive trustless, non-custodial, private-from-issuer, secure, audited or production-ready claim was found.

SECTION 2 — CONSISTENCY
Findings 1 and 3 are cross-page inconsistencies: proof-free operations in README versus “each” proof-bearing transaction, and seed reconstruction in README/capabilities versus the new key-loss limit. Finding 4 drops the README’s application of the clawback condition to these demonstrations. Findings 6 and 8 narrow the facility claim to its evidence.
No additional findings: checked the observer Public/Hidden lists in ObserverReading.tsx/web/api/observer.ts and their supplied rendered HTML; issuer page and its rendered mirrors; capability, wallet and custody sources plus their supplied rendered HTML; README’s protocol section; and overview’s three-line summary against the explainer. The zero hedge, graph/timing disclosure, issuer visibility, examined-wallet scope and custody simulation designation agree against the sources named above.

SECTION 3 — R-7 AND LIVE COPIES
No findings on R-7’s correction. Checked against the public-boundary explanation, F-24, the transaction model and arithmetic: at the example’s closing ConvertBack, 500 in minus 400 out leaves a residual 100 that may be retained, sent, or divided between those categories; subtraction alone does not identify the split. A no-Send history retaining 100 directly falsifies the old “100 left by transfer” inference. I do not read the new “either ... or” as proving the holding is exclusively 0 or 100. A draft candidate based on a clawback after the final ConvertBack was rejected because it changed the observation point, rather than disproving the stated example.
No findings about an unmarked surviving copy of the OLD literal claim in the searched public corpus. Search: git-tracked text files, excluding docs/reviews/ (history) and .claude/ (configuration/persona material); multiline patterns for “100 ... left by transfer”, Convert/500 ... 400, “other 100 ... transfer”, and difference/subtraction/transfer variants, followed by reading matches. Old wording survives deliberately as R-7’s quotation and the explainer’s struck text, not as a standing claim. README:71 has the replacement already; the hosted page repeats it. Generated index/topic/revision references identify a retraction, not an independently supported claim.
The exact c561541 edit/publication chronology cannot be independently reconstructed from this two-commit archive. The dated project records are compatible with it, but I did not verify that historical commit object or a historical deployment. That is an evidence gap, not a claim that the date is false.

SECTION 4 — GATE AND CONTROLS
Finding 5: pinning fails for admitted wrong-commit citations in bundled JavaScript and fully encoded HTML attributes. Tests used copies of review-input/rebuilt/ under review-work/, with want.commit taken from its own gate-verdict.json: aabb31e6f23972626baa7aca52e14b2eefd8b0df, not the synthetic archive HEAD.

Actual runChecks results:
- Unchanged output: zero findings.
- Ordinary HTML /blob/<wrong full sha>/CLAIMS.md: commit-and-verdict fires.
- Abbreviated SHA: refused by urls; the new check-9 loop itself does not recognise it.
- Entity-encoded SHA/slash with an ordinary literal https scheme: refused by urls because the raw URL-prefix scan catches a truncated URL, not because pinning works.
- Entity-encoded scheme together with SHA or blob slash: zero findings. A real decoded href carries the wrong commit.
- Percent-encoded SHA: refused by urls. Percent-encoded GitHub hostname combined with encoded scheme/blob slash: zero findings after URL normalisation admits the hostname but check 9 misses the path spelling.
- /tree/ and /raw/ paths, raw.githubusercontent.com, www.github.com, uppercase hostname and scheme-relative links: refused; details in review-work/gate-results.txt. Some are caught only by admission, not check 9.
- Wrong full-commit /blob/ URL literally in the existing loaded JS asset: zero findings.
- Same URL assembled in that JS asset by concatenation and assigned to an anchor: zero findings.

No findings in the new admission expression’s FILE SET: direct regex tests admitted exactly CLAIMS.md and docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md; other files, suffixes and traversal-shaped paths did not match. This does not make the whole scanner a complete URL recogniser.
No findings in the two NEW CONTROLS’ isolation:
- “a cited file at another commit”: only the intended new commit-and-verdict reason fires; removing just the new check-9 loop in a scratch gate yields zero findings on that mutation.
- “a repository file the list does not name”: urls fires on the unlisted path; broadening only the new entry’s path restriction in a scratch gate yields zero findings. Removing the unrelated commit loop does not disable this path control, as expected.
All 66 non-secret mutation controls passed through the actual runChecks, plus the unchanged baseline passed. This is 67 checked cases, NOT a re-run of all 68 private-store-dependent release controls. The planted-secret control was deliberately not called.

WHAT WAS NOT CHECKED, AND WHY
- No private configuration/store, prohibited outside-directory paths, scratchpad, or /Users/*/Development content was read. No make check-web-hosted, tools/check-no-secrets.ts, secretScan(), runHosted() or runControls() invocation was made.
- No native signer rebuild, value-moving transaction, live issuer decryption or facility re-run: unchanged signer/facility code and the private store are outside this review’s permitted execution scope. Executed-evidence statements were checked against the committed records, not replayed.
- No independent browser visit, fresh amendment RPC, deployed-host comparison or historical-deployment reconstruction. I used the provided release build/visible text and its supplied browser-check result; historical status was checked against dated repository readings, not replaced by a new reading on a later day.
- No newcomer-only judgement: that is the separate leg the owner specified.
- No full make ci/private-store gates: targeted bun test web/api web/hosted ran, 191 pass / 1 fail; all 66 safe runChecks controls ran. git diff --check HEAD~1 HEAD passed. Tracked files remain unchanged; scratch artifacts are under review-work/.
- Generated index/topic/revision/inventory/route-tree diffs were inspected for the new row/page and corresponding counts/references. I did not regenerate the historical revision log against this synthetic two-commit history or re-audit unchanged third-party upstream corpora.

Artifacts: review-work/findings.json; report.md; gate-probes.ts and gate-results.txt; all-safe-controls.ts and controls-results.txt; tests.txt; extracted other-page rendered text. No fix, commit, push or deployment was performed.
END OF LEG A REPORT
