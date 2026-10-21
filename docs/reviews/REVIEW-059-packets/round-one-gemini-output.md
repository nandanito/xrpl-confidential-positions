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
