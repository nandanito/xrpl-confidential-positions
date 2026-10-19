# REVIEW-058 round two, leg B — the fixes to round one, before any code

---

## Question 1: Your own findings

**Explicit verdict:** `ALL DISCHARGED; REGRADES HOLD`

Each of the round-one findings B1-1 through B1-10 and the Question 6 argument is evaluated against [ADR-0004 revision 2](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md), the [adjudication](file:///docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md), and [ARCHITECTURE revision 10](file:///docs/architecture/ARCHITECTURE-2026-08-18.md#L407-L430):

1. **B1-1 (Non-standard port 51233 firewall block):**
   - *Adjudication ruling:* Upheld, regraded MEDIUM.
   - *Regrade rationale:* Port 51233 egress blocking degrades accessibility on restricted corporate/guest networks; it does not cause a security breach or architectural failure. Under the project's severity definitions, HIGH is reserved for publishing false facts, leaking secrets, creating signing oracles, or undischarged findings. The regrade to MEDIUM holds.
   - *Discharge:* In revision 2, D-H1 lists non-443 egress blocking as an explicit cost and records an unsearched 443 endpoint as a named gap ([ADR-0004:139-140](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L139-L140)). Under recommended Option H3, visitors never connect to Devnet, mooting the risk. **Discharged.**

2. **B1-2 (URL query parameter leakage to Vercel access logs):**
   - *Adjudication ruling:* Upheld.
   - *Discharge:* Under H3, pages are fixed (one per demo account) with no visitor input box ([ADR-0004:89](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L89)). Furthermore, carrying lookups in URLs is placed on the never-touch list ([ADR-0004:127](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L127)), listed as Rotation Trigger 4 ([ADR-0004:218](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L218)), and codified as an architecture falsifier ([ARCHITECTURE:429](file:///docs/architecture/ARCHITECTURE-2026-08-18.md#L429)). **Discharged.**

3. **B1-3 (Vercel platform script and telemetry injection):**
   - *Adjudication ruling:* Upheld (with R1-10 and S-3).
   - *Discharge:* D-H4 mandates disabling the Vercel toolbar for both preview and production environments ([ADR-0004:193-196](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L193-L196)). The gate check specifies delivered Content Security Policy headers (`default-src 'self'`, `script-src 'self'` plus hashes, `object-src 'none'`) in `.vercel/output/config.json` ([ADR-0004:228-232](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L228-L232)), blocking external injection from `vercel.live`. Step 9 adds a falsifier for served bytes or headers differing from gated output. **Discharged.**

4. **B1-4 (Contradicting ADR-0003 by claiming gate enumerates egress):**
   - *Adjudication ruling:* Upheld, HIGH.
   - *Discharge:* Retracted in revision 2's status line ([ADR-0004:7-10](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L7-L10)). The body explicitly concedes that visitor requests are runtime egress no bundle contains, cites [ADR-0003](file:///docs/decisions/ADR-0003-web-tier-trust-boundary.md), states that the gate enumerates uploaded files rather than egress ([ADR-0004:106-110](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L106-L110)), and repeats this boundary in the gate requirements and non-claims ([ADR-0004:236,242-243](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L236-L243)). **Discharged.**

5. **B1-5 (Evasion of Step 8's loopback falsifier):**
   - *Adjudication ruling:* Upheld, regraded MEDIUM.
   - *Regrade rationale:* "Nothing to bind" was an evasive rhetorical phrasing rather than an architectural violation. The regrade to MEDIUM holds.
   - *Discharge:* Revision 2 acknowledges the phrasing read as evasion ([ADR-0004:15](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L15)) and replaces it with the principled architectural position: the hosted page is public by design, step 8's loopback property does not carry over to it, and step 9's specific public static hosting falsifiers replace it ([ADR-0004:13-14](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L13-L14)). **Discharged.**

6. **B1-6 (Privacy disclosure omitted Vercel):**
   - *Adjudication ruling:* Upheld, HIGH.
   - *Discharge:* D-H2 adds the mandatory second paragraph: *"Vercel, which hosts this page, sees your IP address and the pages you open."* ([ADR-0004:158](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L158)). Under H1, it discloses Ripple's node in addition to Vercel ([ADR-0004:159-160](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L159-L160)). **Discharged.**

7. **B1-7 (Node failure disclosure / Devnet resets):**
   - *Adjudication ruling:* Upheld in part.
   - *Partial uphold rationale:* Devnet testnet status, lack of economic value, periodic resets, and "lying or lagging" servers were incorporated into the disclosure. The adjudicator ruled that dropped network messages represent reader transport failures that must render as an explicit error UI ("named failure") rather than caveats in static data copy. This technical distinction is sound: transport failures should halt rendering, not caveat displayed data. The partial uphold holds.
   - *Discharge:* D-H2 now explicitly states Devnet is a test network, tokens have no value, resets occur periodically, and servers may be lying or lagging ([ADR-0004:154-156](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L154-L156)). **Discharged.**

8. **B1-8 (False claim that ledger values are not cached):**
   - *Adjudication ruling:* Upheld, regraded MEDIUM.
   - *Regrade rationale:* Stating a requirement as a fact without mechanism in an unbuilt proposal is a specification correction (MEDIUM), not an operational leak. The regrade holds.
   - *Discharge:* Under H3, values are baked into static HTML, eliminating client caching bugs by construction ([ADR-0004:210](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L210)). Under H1, revision 2 specifies that route loader caching must be disabled with a regression test showing re-navigation re-reads the socket ([ADR-0004:212-214](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L212-L214)). **Discharged.**

9. **B1-9 (Overclaiming single-reader reuse for browser WebSocket):**
   - *Adjudication ruling:* Upheld, regraded MEDIUM.
   - *Regrade rationale:* Correcting an overclaimed existing abstraction in an unbuilt design document is a costing/scoping correction (MEDIUM). The regrade holds.
   - *Discharge:* Revision 2 acknowledges that [`facility/src/loopback.ts`](file:///facility/src/loopback.ts) cannot run in a browser and explicitly prices refactoring it to decouple transport from the `Snapshot` state machine as a required prerequisite for H1 ([ADR-0004:136,142](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L136-L142)). **Discharged.**

10. **B1-10 (Unqualified claim of "no code of ours runs per request"):**
    - *Adjudication ruling:* Upheld, LOW.
    - *Discharge:* Changed in the specification to: *"No server-side code of ours runs per request. The deployment is static files."* ([ADR-0004:83](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L83)). **Discharged.**

11. **Question 6 argument (Overturning H1 in favor of H3):**
    - *Adjudication ruling:* Upheld; D-H1 recommendation moved to H3.
    - *Discharge:* Revision 2 adopts H3 as the primary recommendation in the status line ([ADR-0004:10](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L10)), the proposed architecture ([ADR-0004:76-93](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L76-L93)), D-H1 table ([ADR-0004:134](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L134)), and the rationale section ([ADR-0004:141-146](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L141-L146)). **Discharged.**

*Question 1: no findings.*
*What was tried:* Examined every occurrence of B1-1 through B1-10 in revision 2, checked whether old wording survived in [ARCHITECTURE revision 10](file:///docs/architecture/ARCHITECTURE-2026-08-18.md), verified all regrade rationales against the project severity rubric, and confirmed that every mechanism promised in the adjudication is present in the text.

---

## Question 2: The other legs' findings

**Explicit verdict:** `ALL DISCHARGED AS PROMISED`

Every finding from Leg A (R1-1 to R1-11) and the Self leg (S-1 to S-8) was checked against the [adjudication table](file:///docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md#L45-L79) and [ADR-0004 revision 2](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md):

- **R1-1 (Harness `Buffer` dependency):** M5 updated ([ADR-0004:60-63](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L60-L63)) and H1 cost updated ([ADR-0004:136-137](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L136-L137)).
- **R1-2 (M2 tested one origin):** M2 corrected to distinguish one browser page from two non-browser Bun clients ([ADR-0004:49-53](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L49-L53)).
- **R1-3 (Provenance rule):** Rule stated (clean checkout, locked deps, named build vars, no sourcemaps) at lines 95-103; file inventory codified in gate at line 221.
- **R1-4 (Local tier false sentences):** Corrected at source in `index.tsx:51` and `wallet.tsx:78`; [ADR-0004:115-122](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L115-L122) records them; clarifies signer is a panel and loader call, not a page.
- **R1-5 (Clawback delegate attack on ZK proof):** D-H3 Option C cost updated to require domain-separated context naming Devnet and ledger hash ([ADR-0004:176-179](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L176-L179)).
- **R1-6 (WASM exports amount decryption):** D-H3 Option C cost requires a verifier-only artifact ([ADR-0004:179-181](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L179-L181)).
- **R1-7 (`loopback.ts` negative answer handling):** Pinned reader in [`facility/src/loopback.ts:209-222`](file:///facility/src/loopback.ts#L209-L222) checks `e.answeredIndex !== this.index`; [`entryOfType`](file:///facility/src/loopback.ts#L261-L272) validates `LedgerEntryType`. Recorded in M6, M10, and Devnet resets section.
- **R1-8 (Delivered CSP directives):** Line 228 specifies delivered header extraction from `.vercel/output/config.json` with all required directives.
- **R1-9 (`check-no-secrets` git limitation):** Line 224-227 acknowledges `git ls-files` bypass and requires directory mode with controls as build work.
- **R1-10 (Vercel repository write access):** Line 190 rewords access to "no additional repository credential or write permission"; lines 193-196 specify toolbar disabling and byte comparison.
- **R1-11 (Static hosting cost and quota):** Line 203-205 mandates identifying the plan, limits, spend cap, and incident response owner.
- **S-1 (Never ask for secrets):** Added to never-touch list ([ADR-0004:126](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L126)), gate ([ADR-0004:232](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L232)), and step 9 falsifier ([ARCHITECTURE:428](file:///docs/architecture/ARCHITECTURE-2026-08-18.md#L428)).
- **S-2 (Third-party licenses):** Added to gate inventory ([ADR-0004:233](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L233)).
- **S-3 (Toolbar injection):** Corroborated with R1-10 and B1-3 ([ADR-0004:193-196](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L193-L196)).
- **S-4 (Transaction building warning):** Added to D-H2 ([ADR-0004:157](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L157)).
- **S-5 (H3 reads one node):** Added to D-H2 table ([ADR-0004:164](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L164)).
- **S-6 (Vercel deploy token constraints):** Added to D-H4 Option A cost ([ADR-0004:188-189](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L188-L189)).
- **S-7 (CSP headers):** Subsumed by R1-8.
- **S-8 (Render commit on page):** Added to gate list ([ADR-0004:234](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L234)).

*Question 2: no findings.*
*What was tried:* Cross-referenced all 19 findings from Leg A and Self against the ruling table and revision 2 text. Verified that every promised clause is present in revision 2 and none was weakened.

---

## Question 3: New sentences

**Explicit verdict:** `FINDINGS IDENTIFIED (FALSE CITATION CLAIM, DISCREPANT COUNT, AND OVERSTATED BUILD READ COUNT)`

### Findings for Question 3

- `B2-1 | MEDIUM | Adjudication falsely claims all upheld findings are cited at their sites | "ADR-0004 revision 2, with every upheld finding cited at its site." (docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md:95) | Add missing citation tags in ADR-0004 revision 2: (REVIEW-058 B1-1) at line 139, (REVIEW-058 B1-2) at line 127, (REVIEW-058 B1-9) at line 137, and (REVIEW-058 S-1) at lines 126 and 232.`
  *Context:* [REVIEW-058c line 95](file:///docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md#L95) asserts as a matter of completed fact that revision 2 cites every upheld finding at its site. While the substantive fixes are present in the text, four upheld findings—`B1-1` (port 51233 firewall risk), `B1-2` (URL query parameter prohibition), `B1-9` (loopback transport refactor prerequisite), and `S-1` (prohibition against asking for secrets)—appear zero times in [ADR-0004 revision 2](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md).

- `B2-2 | LOW | Adjudication summary count of regraded findings does not match table | "Rejected: none. Six findings were regraded down, each for the reason given." (docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md:83) | Change sentence to: "Five findings were regraded down (R1-7, B1-1, B1-5, B1-8, B1-9) and one was narrowed in scope (B1-7), each for the reason given."`
  *Context:* The table explicitly regrades down exactly five findings from HIGH to MEDIUM: R1-7, B1-1, B1-5, B1-8, and B1-9. Finding B1-7 was submitted as MEDIUM and ruled "Upheld in part" with its grade retained at MEDIUM. Stating "Six findings were regraded down" conflates a narrowing of scope with a severity regrade.

- `B2-3 | MEDIUM | ADR-0004 rev 2 and Architecture §6 step 9 claim build reads Devnet "once per page" | "The build reads Devnet once per page, with the reader the local tier already uses, pinned to one validated index, and the page names that index and the date." (docs/decisions/ADR-0004-hosted-demo-trust-boundary.md:87-88; also ARCHITECTURE-2026-08-18.md:412) | Reword to: "The build opens one pinned snapshot of public Devnet state at a single validated index, reads the required entries for all demo pages, and bakes static pages each naming that index and date."`
  *Context:* In this repository's terminology, a "read" is an individual ledger RPC query (`Snapshot.pinned` / `LoopbackLedger.call`). Rendering a single account observer page requires multiple distinct ledger reads: `account_info` (for sequence), `ledger_entry` for `MPToken` (for ciphertext and encryption keys), and `ledger_entry` for `MPTokenIssuance` (for issuance state and outstanding amount). A build cannot render an account view with "one read per page". Furthermore, if a build were to open a separate snapshot "once per page", each page could pin a different ledger index across cluster nodes, violating the core requirement of pinning to a single validated index.

---

## Question 4: The recommendation that moved

**Explicit verdict:** `THE MOVE TO H3 IS SOUND; THE AUTHOR DID NOT OVER-CORRECT`

### The strongest case that moving to H3 is wrong

1. **Destroys the "demo" premise of the launch plan:** The launch plan (`PLAN-PUBLIC-LAUNCH-2026-09-22.md`, phase 2 step 1) explicitly specifies a hosted tier "so people can try it". Under H3, a visitor cannot enter an account, query an issuance, or interact with the page in any way. A static site displaying hardcoded historical numbers is a published report or article, not a demo application. It fails to prove empirically to a skeptical public that XLS-0096 works live on Devnet.
2. **Guarantees immediate and permanent staleness:** Devnet ledgers close every 3–4 seconds, and Devnet is subject to periodic resets. Under H3, a static build is historical the moment it deploys. Within hours or days, the public Devnet node cluster prunes old ledgers from its history (as recorded in M3, complete ledger ranges have lower bounds around 5.1M). A visitor attempting to verify the displayed ledger index against Devnet using their own node or curl commands will receive `lgrNotFound`.
3. **Excludes third-party testers:** Third-party institutional developers or validator operators wishing to inspect their own test issuances or accounts using this observer view cannot do so under H3.
4. **H1's flaws were routine frontend engineering bugs:** The blockers identified for H1 in round one (`Buffer` polyfills, decoupling transport in `loopback.ts`, TanStack Router loader cache busting) were standard implementation tasks, not cryptographic flaws. Ripple already operates the Devnet node; routing test lookups to Devnet leaks no Mainnet secrets.

### Why this case does NOT hold

1. **Fidelity to P-3 (Dated observations over standing truth):** `CLAIMS.md` P-3 mandates treating ledger state as dated observations rather than standing truth. H3 embodies P-3 by construction: every value is visibly bound to a dated ledger index baked into static files. H1 presents a false veneer of "live truth" while masking pool flapping, cluster desynchronization (M3), and node lag.
2. **Absolute egress boundary (Trigger 5):** Leg B proved in round one (B1-4) that build-time lexical gates cannot enumerate or enforce runtime network egress. Under H1, every visitor's IP and search queries are leaked to Ripple's node pool on non-standard port 51233. Under H3, runtime egress is strictly zero; visitors load static files exclusively from Vercel.
3. **Eliminates the "Second Reader" divergence trap (E-141):** `CLAIMS.md` E-141 establishes that duplicate readers of a single ledger obligation inevitably drift. Round one uncovered that [`facility/src/loopback.ts`](file:///facility/src/loopback.ts) had already drifted from the Rust signer by omitting `entryNotFound` ledger validation and type checks (M10/R1-7). Writing a brand-new browser-compatible WebSocket reader for H1 introduces a third reader. H3 reuses the single existing, tested backend reader at build time.
4. **Firewall realities (B1-1):** Port 51233 is routinely blocked by enterprise, bank, and institutional corporate firewalls. Deploying H1 would cause silent connection failures for the primary capital-markets audience.
5. **Absence of a public Devnet confidential MPT ecosystem:** No arbitrary Devnet account holds confidential MPTs; creating and managing them requires custom ElGamal key generation and ZK proof construction that no consumer wallet supports. The only accounts on Devnet with active confidential balances are this project's four demo accounts (M4). H1's "lookup box" is an illusion that would return empty positions for any real visitor address.
6. **Preserves the escape hatch:** Revision 2 does not delete H1; it prices its implementation honestly and notes: *"If 'so people can try it' means a visitor looking up an account of their own, H1 is the option, at the costs above."* ([ADR-0004:145-146](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L145-L146)).

The move to H3 is architecturally sound and represents principled discipline rather than an over-correction.

---

## Question 5: The visitor-facing wording

**Explicit verdict:** `FINDING IDENTIFIED (DISCLOSURE MISATTRIBUTES STALE DATA SOLELY TO NODE MALFEASANCE)`

The revised two paragraphs in D-H2 ([ADR-0004:154-158](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L154-L158)):

> *This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.*
>
> *Vercel, which hosts this page, sees your IP address and the pages you open.*

### Evaluation

1. **Sentence accuracy:**
   - Sentence 1 (*test network*), Sentence 2 (*no value, resets*), Sentence 4 (*nothing signs or submits*), Sentence 5 (*do not use to build transactions*), and Paragraph 2 (*Vercel sees IP and pages opened*) are accurate, honest, and directly address round-one findings B1-6, B1-7, and S-4.
2. **Defect in Sentence 3 under H3:**
   Sentence 3 states: *"Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong."*
   Under the recommended H3 hosting shape, all values are baked into the page at build time. When a visitor views the hosted demo hours or days later, the displayed ledger state will not reflect current Devnet state. This divergence does not occur because Ripple's Devnet server was "lying or lagging"—the server may have been entirely honest and synchronized at build time. The discrepancy exists because **the page is an unrefreshed, static point-in-time snapshot**. Attributing wrongness exclusively to a "lying or lagging server" misinforms the visitor by directing them to suspect node malfeasance or cluster lag rather than ordinary build staleness.

### Finding for Question 5

- `B2-4 | MEDIUM | D-H2 wording misattributes stale data solely to a lying/lagging server | "Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong." (docs/decisions/ADR-0004-hosted-demo-trust-boundary.md:154-156) | Amend sentence to explicitly state that the page is a static snapshot: "Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown (and a lying or lagging server at that time would have made it wrong). This page is a static snapshot and does not update with subsequent ledger closes."`

---

## The stopping condition

> **"no third round unless round two finds a fix that did not discharge its finding."**

### Explicit Ruling on the Stopping Condition

**The findings of this review DO NOT meet the stopping condition. A third round is NOT owed.**

*Rationale:*
- Every round-one finding from all three legs (Leg B's B1-1 to B1-10 and Q6, Leg A's R1-1 to R1-11, and Self's S-1 to S-8) was discharged in revision 2 and the shipped codebase. None of the round-one fixes failed to discharge its finding.
- The four findings raised in this round (B2-1, B2-2, B2-3, B2-4) represent:
  1. An editorial tracking omission in the adjudication's citation claim (B2-1);
  2. A minor counting inconsistency in the adjudication summary (B2-2);
  3. A technical overstatement regarding build-time read counts in newly drafted text (B2-3);
  4. A completeness refinement in visitor-facing disclosure text tailored to H3 (B2-4).
- None of these findings is an undischarged round-one defect. Under the project's explicit stopping rule, round two is complete and phase 2 may proceed to owner decision and implementation.

---

## Last: The single sentence most likely to be false

> **`"ADR-0004 revision 2, with every upheld finding cited at its site."`**  
> — [`docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md`, line 95](file:///docs/reviews/REVIEW-
[`docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md`, line 95](file:///docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md#L95)

**Why it is false:**
This sentence asserts as an accomplished fact that [ADR-0004 revision 2](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md) cites every upheld finding at its corresponding site. 

In reality, four upheld findings from round one—**`B1-1`** (port 51233 firewall risk), **`B1-2`** (banning account lookups in URL request lines), **`B1-9`** (decoupling transport in `loopback.ts` as a prerequisite for browser use), and **`S-1`** (prohibiting inputs asking for secrets)—are upheld in the adjudication table, yet appear **zero times** anywhere in the text of `ADR-0004` revision 2. While the substantive concepts were incorporated into the prose, the citation tags themselves were omitted, making the statement factually untrue.
