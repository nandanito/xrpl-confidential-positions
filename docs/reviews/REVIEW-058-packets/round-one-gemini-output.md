# REVIEW-058 round one, leg B — The hosted demo's trust boundary, before any code

---

## Question 1: The threat model

**Explicit verdict:** `INCOMPLETE`

`ADR-0004` treats moving from a loopback process to a static site as an elimination of server-side attack surface. In doing so, it leaves substantial parts of the public web threat model unexamined.

### 1. The build's supply chain
- **What is unconsidered:** The local build pipeline (`bun run build`, `vercel build`) pulls and executes dependencies from `npm` (`@tanstack/react-start`, `@noble/curves`, `ripple-address-codec`, etc.). Build scripts or compromised transitives execute arbitrary code on the developer/owner machine where the Vercel deploy token resides. The ADR considers M7 (WASM symbol presence) and M8 (plugin schema), but never mentions package lockfile pinning, build-time provenance, or subresource integrity (SRI) for the generated static bundle.
- **Does it matter for Devnet with throwaway accounts?** **YES.** While Devnet account seeds are throwaway, the owner's machine hosts the Vercel deployment token and the private repository environment. Furthermore, supply chain tampering can inject malicious scripts into the static output, destroying presentation integrity (e.g. rendering false claims under the project's name, which [CLAIMS.md](file:///docs/decisions/ADR-0003-web-tier-trust-boundary.md#L98-L101) E-209 rules as a trust-boundary failure).

### 2. The hosting account (Vercel)
- **What is unconsidered:** Platform-level features outside Git control: Vercel Web Analytics, Speed Insights, automatic preview comments/toolbars, edge error pages, and dashboard-level environment variables or redirects. The ADR assumes in D-H4 that `vercel deploy --prebuilt` uploads pure directory bytes, but Vercel's edge network can inject headers, platform telemetry scripts, or caching layers unless explicitly disabled in project configuration. It also omits account takeover, token leakage on the owner's workstation, and DDoS/bandwidth consumption resulting in account suspension.
- **Does it matter?** **YES.** The ADR claims the tier "may never touch: ... any analytics or third-party script" ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L77-L81)). If the Vercel project configuration injects platform scripts, that prohibition is violated automatically without a single line of repo code changing.

### 3. The domain
- **What is unconsidered:** The ADR names `https://wconf-demo.vercel.app` in M2. It does not consider subdomain hijacking if the project is renamed or deprovisioned, nor origin isolation if deployed under a custom domain (such as a subdomain of `nandan.me`, which the launch plan names for writing). Shared cookies or storage across `*.nandan.me` would broaden the ambient authority of the demo page.
- **Does it matter?** **LOW for `vercel.app`, HIGH if on a personal apex/subdomain.** On `vercel.app`, the PSL (Public Suffix List) isolates cookies, but abandonment allows takeover. On `nandan.me`, any cross-subdomain cookie leakage becomes possible.

### 4. The WebSocket endpoint (`wss://s.devnet.rippletest.net:51233`)
- **What is unconsidered:**
  1. *Egress port blocking:* Port `51233` is a non-standard port. Many corporate, academic, and restricted guest Wi-Fi networks block outbound TCP ports other than 80 and 443.
  2. *Connection drops and pool flapping:* M3 observes that two connections reach two servers with different validated ledger ranges. When a browser's WebSocket disconnects and reconnects, it lands on an entirely different server in the pool, causing ledger index regression or sequence divergence.
  3. *Denial of service:* Rate limiting or IP bans from Ripple's public node against visitor IP ranges.
- **Does it matter?** **YES.** Port 51233 egress blocking causes silent or generic connection failures for enterprise/corporate visitors—the exact capital-markets audience the demo targets.

### 5. The visitor
- **What is unconsidered:**
  1. *Browser extensions:* Wallet extensions (Xaman, Crossmark, GemWallet) or ad/script injectors can tamper with DOM values, intercept WebSocket frames, or fail unexpectedly.
  2. *URL history and referrer leakage:* As noted in D-H1, `web/app/src/routes/observer.tsx` serializes the account and issuance ID into the URL query parameters. When a visitor reloads, shares, or follows a link, the exact account query is logged in Vercel's HTTP access logs and browser history.
  3. *Accidental Mainnet confusion:* Visitors entering their own real XRPL Mainnet accounts or addresses into the search bar.
- **Does it matter?** **YES.** It causes privacy egress to Vercel (violating Trigger 5) and creates user confusion when Mainnet accounts report as non-existent or un-initialised.

### 6. Anyone who might misuse or misread the page
- **What is unconsidered:**
  1. *Clone phishing:* Since the bundle is static and open-source, an adversary can clone the Vercel deployment, point the WebSocket to a malicious node that reports false keys, and trick users into transacting.
  2. *Decontextualised screenshots:* A visitor screenshotting the observer view and claiming "confidential amounts are publicly zero" (misinterpreting F-1 canonical zero vs. homomorphic zero) or "XRPL confidential tokens are live on Mainnet".
- **Does it matter?** **YES.** In a research artifact whose primary output is factual demonstration and credibility, presentation misinterpretation and fraudulent cloning are primary risks.

### Findings for Question 1

- `B1-1 | HIGH | Non-standard WebSocket port 51233 firewall block | "A Bun WebSocket to wss://s.devnet.rippletest.net:51233 carrying Origin: https://wconf-demo.vercel.app ... A page on each origin tried can read this endpoint" (ADR-0004:47-49) | Verify whether Ripple provides a port 443 WSS endpoint for Devnet, or explicitly disclose port 51233 firewall restrictions in the connection failure UI.`
- `B1-2 | MEDIUM | URL query param leakage to Vercel HTTP access logs | "today's observer route carries the account in the URL (web/app/src/routes/observer.tsx:7-8,51), so a reload or a shared link sends the lookup to Vercel too unless the hosted build keeps it out of the URL" (ADR-0004:96-98) | Migrate the hosted build's router to hash-based routing (/#/observer/...) or in-memory state so account lookups never leave the browser in HTTP request lines.`
- `B1-3 | MEDIUM | Vercel platform script and telemetry injection unaddressed | "May never touch: ... any analytics or third-party script" (ADR-0004:77-81) | Add explicit vercel.json configuration disabling Vercel Analytics and Speed Insights, and add a gate check verifying that no platform scripts appear in deployed HTML.`

---

## Question 2: "Why this shape"

**Explicit verdict:** `UNSOUND`

The argument in `ADR-0004` under *"Why this shape"* states:
> *"Under it, the hosted tier serves the static output of the public repository's own source, plus whatever D-H3 deliberately adds. Trigger 4, the decryption oracle, cannot fire: there is no request handler for a request to reach. Step 8's loopback falsifier has nothing to bind. Trigger 5 fires only for what is put into the bundle on purpose, and the gate can enumerate that."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L67-L71))

This reasoning reproduces the exact structural mistake of `ADR-0003` revision 1:

1. **"Trigger 4 cannot fire: there is no request handler for a request to reach."**
   In `ADR-0003`, the author believed Trigger 4 only applied to an incoming key in a request. `CLAIMS.md` E-212 and E-228 proved that serving a pre-decrypted plaintext result over an unauthenticated `GET` is structurally the same oracle: the result leaves in a response. In `ADR-0004`, asserting that Trigger 4 cannot fire because there is no server-side request handler ignores that a static file server *is* a request handler. If D-H3 were to adopt Option B, the pre-decrypted snapshot is served to the world without authentication. Claiming Trigger 4 cannot fire simply because the file is static rather than dynamically computed is the exact semantic loophole E-212 and E-228 struck down.
2. **"Step 8's loopback falsifier has nothing to bind."**
   This is rhetorical evasion. Architecture §6 step 8 is falsified if *"the API binds to anything but loopback"*. The purpose of that falsifier was to prevent exposing the tier to external networks. Eliminating the local server and placing the entire application on Vercel's public edge does not honor the property—it abandons it. Vercel binds to `0.0.0.0:443`. Claiming the falsifier "has nothing to bind" is arguing that an obligation ceases to exist once violated at a higher layer.
3. **"Trigger 5 fires only for what is put into the bundle on purpose, and the gate can enumerate that."**
   This is flatly false on two counts:
   - *Trigger 5 is runtime egress, not just bundle content.* When a visitor loads the page and searches an account, their browser transmits their IP address and search query to Ripple's node and to Vercel's servers. Those data flows did not exist before this tier was deployed.
   - *The gate cannot enumerate egress.* `ADR-0003` explicitly says under *What this decision does not claim*: *"That the gate covers egress. It checks what the tier can REACH (parts 1-3), what it HOLDS (part 4), and where it BINDS (part 6). It does not check what the tier EMITS, or to whom, and it now says so in its own output (item 11)."* ([ADR-0003](file:///docs/decisions/ADR-0003-web-tier-trust-boundary.md#L283-L285)). `ADR-0004` directly contradicts `ADR-0003` by asserting that the gate can enumerate what fires Trigger 5.

### Findings for Question 2

- `B1-4 | HIGH | Contradicting ADR-0003 by claiming gate enumerates egress | "Trigger 5 fires only for what is put into the bundle on purpose, and the gate can enumerate that." (ADR-0004:69-71) | Strike the claim. Acknowledge that Trigger 5 fires dynamically upon visitor interaction (IP and queries sent to Ripple and Vercel) and that static lexical gates cannot enumerate runtime egress.`
- `B1-5 | HIGH | False evasion of Step 8's loopback falsifier | "Step 8's loopback falsifier has nothing to bind." (ADR-0004:68-69) | Replace with an explicit statement that Step 8's loopback constraint is deliberately replaced by Step 9's public static hosting boundary, and define Step 9's specific boundary falsifiers instead.`

---

## Question 3: D-H3, the issuer figure

**Explicit verdict:** `FLAWED PREMISE IN PROMPT; ADR-0004 RECOMMENDATION A IS SOUND, OPTION B IS DISQUALIFIED`

### 1. The discrepancy between the prompt and `ADR-0004`
The prompt asserts: *"The ADR recommends publishing it on the hosted page, with a consistency check."*
**This is factually false against the text of `ADR-0004` (commit d764bca).**
`ADR-0004` explicitly recommends **Option A: No figure**:
> *"Why A. E-241's reasoning holds with more force on a public page. A figure no visitor can check is a claim with no falsifier, published under this project's name. B's checks cannot change that, because both pass for a publisher who never held the key... ⚠ This recommendation departs from the launch plan... An earlier draft of this document recommended B with the sum check as its falsifier. Preparing the self leg showed that the check passes for a forger, so the draft changed before review."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L141-L150))

It was the *launch plan* (`PLAN-PUBLIC-LAUNCH-2026-09-22.md` phase 2 step 1) and an *earlier draft* of ADR-0004 that proposed publishing Option B with the sum check. The author of ADR-0004 caught this defect and reversed the recommendation to A prior to this review.

### 2. Does Option B answer E-241's reasoning or route around it?
Option B **routes around it**, and the mechanism is completely broken:
- E-241 established that the plaintext balance integer only ever proved that *this project* holds the private key, which is not an architectural property of the protocol.
- The proposed "consistency check" for Option B was verifying that the sum of decrypted balances matches `ConfidentialOutstandingAmount` on the issuance.
- But as M9 and D-H3 in `ADR-0004` observe, `ConfidentialOutstandingAmount` is **public plaintext on the ledger**. Any adversary who never held the issuer key can take that public total, split it arbitrarily into numbers that sum to it, and publish them.
- A visitor has no mathematical or cryptographic way to verify that the split matches the ciphertexts. Thus, Option B publishes an unfalsifiable claim under the project's authority, directly violating E-241.

### 3. Recommendation among A, B, and C
**Recommend Option A.**
- **Option B** is disqualified: it is cryptographic theatre that passes for a complete forgery.
- **Option C** (generating and verifying a ZK proof of correct decryption in browser WASM) is technically the only path that cryptographically answers E-241. However, it is unpriced, relies on unwrapped C WASM symbols (`_mpt_verify_clawback_proof`, M7), and requires binding a proof to an unsubmitted transaction context whose cryptographic safety has not been reviewed. Launching with Option C introduces unreviewed cryptographic attack surface.
- **Option A** carries forward E-241 cleanly: it displays the on-chain `IssuerEncryptedBalance` and cites the protocol specification invariant (P-9: the issuer can always decrypt). It asserts no unverified numbers, requires no untrusted assertions, and introduces zero cryptographic risk.

*Question 3: no new B1 finding required against ADR-0004's text*, as ADR-0004 already recommends A and discredits B.

---

## Question 4: D-H2, the risk acceptance wording

**Explicit verdict:** `INCOMPLETE AND MATERIALLY MISLEADING BY OMISSION`

The proposed disclosure wording in `ADR-0004` D-H2:
> *Sentence 1: "A lying or substituted node makes this page show wrong values. Nothing on this page signs or submits, so no amount can be published because of it."*
> *Sentence 2: "Your browser connects to the public Devnet node operated by Ripple. That operator sees your IP address and every account you look up here."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L106-L113))

### What is false or misleading
1. **Sentence 2's privacy claim is false by omission.**
   Sentence 2 says: *"That operator [Ripple] sees your IP address and every account you look up here."*
   This implies that *only* Ripple sees the visitor's IP and search queries.
   In reality, **Vercel also sees the visitor's IP address on every request, and sees every account looked up whenever the account is in the URL query string** (as implemented today in `web/app/src/routes/observer.tsx:7-8` upon reload or link navigation).
2. **"no amount can be published because of it" is ambiguous.**
   In this project's vocabulary, F-23 defines "published" as writing a ciphertext to the on-chain ledger via a submitted transaction. A casual visitor reads "published" as "displayed publicly on this page". Because the page *does* publish and display plaintext amounts (public balance, `ConfidentialOutstandingAmount`), this sentence confuses users.

### What is missing that a visitor needs
1. **Devnet & Monetary Value:** It never states that the data is from XRPL **Devnet** (network ID 2), that balances are test tokens with zero financial value, and that Devnet is subject to periodic resets that wipe all data.
2. **Node Pool Flapping / Staleness:** Sentence 1 blames wrong values solely on a "lying or substituted node". It omits benign distributed systems failure modes: cluster desynchronization (M3), lagging nodes, or dropped WebSocket messages.
3. **TLS vs. Ledger Integrity:** Visitors need to know that while TLS authenticates the connection to `rippletest.net`, it does not authenticate the ledger contents (Architecture §7, F-23). The browser performs no state-tree verification.

### Findings for Question 4

- `B1-6 | HIGH | Incomplete and misleading privacy disclosure in D-H2 | "Your browser connects to the public Devnet node operated by Ripple. That operator sees your IP address and every account you look up here." (ADR-0004:111-113) | Amend Sentence 2 to explicitly disclose that Vercel also sees the visitor's IP address and, if URLs are shared or reloaded, any account parameters in the request.`
- `B1-7 | MEDIUM | Node failure disclosure understates cluster desync and Devnet resets | "A lying or substituted node makes this page show wrong values." (ADR-0004:107) | Expand Sentence 1 to state that out-of-sync cluster nodes, lagging nodes, and periodic Devnet resets also cause missing or conflicting values.`

---

## Question 5: The prohibitions (P-1 to P-12)

**Explicit verdict:** `VIOLATIONS FOUND`

Reviewing `ADR-0004` and `Architecture §6 step 9` against P-1 through P-12:

1. **P-3 / Caching Claim (Claims more than is delivered):**
   In `ADR-0004` under *Abuse, rate limiting and caching*:
   > *"Static files cache normally. Ledger values are not cached; each view names the index it read."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L182-L183))
   In TanStack Start / TanStack Router applications, route loaders cache returned data in client memory by default (`staleTime` / `gcTime`). Unless explicitly disabled with `gcTime: 0`, navigating away from `/observer` and returning will display cached in-memory ledger responses without re-fetching from WebSocket, presenting stale values under an old ledger index. The claim that "ledger values are not cached" is false for the client-side SPA.
2. **Architecture Step 9 / Code Reuse (Claims more than is delivered):**
   In `Architecture §6 step 9`:
   > *"The hosted reader composes the same `Snapshot` discipline with a WebSocket transport, because a browser cannot read the public JSON-RPC endpoint and `web/api/ledger-view.ts` already records why a second reader of one obligation is not acceptable."* ([ARCHITECTURE-2026-08-18.md](file:///docs/architecture/ARCHITECTURE-2026-08-18.md#L416-L418))
   `web/api/ledger-view.ts` composes `facility/src/loopback.ts`, which is hardcoded to Node/Bun `fetch` over HTTP JSON-RPC and reads environment variables. There is currently no generic transport abstraction in `loopback.ts`. To run in a browser, a brand-new WebSocket client must be written. Calling this "the same Snapshot discipline... not a second reader" claims an architectural unification that does not exist in the codebase today.
3. **Misleading if reading stops there (No code runs per request):**
   In `ADR-0004`:
   > *"No code of ours runs per request. The deployment is static files."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L57))
   If a reader stops there, this is misleading. Client-side JavaScript written by this project runs on every visitor action, processes every WebSocket event, and performs elliptic curve operations in the browser (`canonicalEncZero`). The sentence should specify "No server-side code runs per HTTP request."

### Findings for Question 5

- `B1-8 | HIGH | False claim regarding client-side ledger caching | "Ledger values are not cached; each view names the index it read." (ADR-0004:182-183) | Specify explicit TanStack Router loader cache-busting (staleTime: 0, gcTime: 0) so in-memory client state never retains stale ledger snapshots across route navigations.`
- `B1-9 | HIGH | Overclaiming single-reader implementation for browser WebSocket | "The hosted reader composes the same `Snapshot` discipline with a WebSocket transport ... stay in one implementation" (ADR-0004:72-76 / ARCHITECTURE-2026-08-18.md:416-418) | Clarify that facility/src/loopback.ts must first be refactored to decouple the Snapshot state machine from HTTP fetch before the claim of a single unified reader is true.`
- `B1-10 | LOW | Unqualified claim of no code running per request | "No code of ours runs per request. The deployment is static files." (ADR-0004:57) | Change to "No server-side code of ours runs per request."`

---

## Question 6: The recommendation you would overturn

**Explicit verdict:** `OVERTURN H1 IN FAVOR OF H3` (and uphold rejection of B)

*(Note on candidate list: If evaluating the prompt's listed option "B", overturning B in favor of A is mandatory for the reasons detailed in Question 3: B's sum check is an unfalsifiable forger's pass. However, because `ADR-0004` already recommends A, the operative recommendation to overturn in `ADR-0004` is **H1**).*

### Overturning Recommendation H1 (Static site with browser WebSocket) in favor of H3 (Prerendered pages only)

`ADR-0004` recommends H1 on the premise that it allows visitors to "try it" by entering accounts. This is a bad trade-off for this project:

1. **Visitor privacy destruction:** Under H1, every visitor's IP address and account search query are leaked directly to Ripple's public node operator and to Vercel (D-H1). Under H3, the build reads Devnet once locally; visitors make **zero** network requests to Ripple.
2. **Network failure modes on port 51233:** Devnet WebSocket runs on non-standard port 51233 (M2). Strict enterprise, bank, and corporate firewalls block non-standard egress, causing connection failures for the core intended audience. H3 uses pure standard HTTPS (port 443) for static assets.
3. **Eliminates the "second reader" problem entirely:** H1 forces the project to write a new browser-compatible WebSocket ledger reader, duplicating the `Snapshot` discipline and risking drift. H3 reuses the existing, tested `facility/src/loopback.ts` JSON-RPC reader at build time.
4. **Devnet accounts are a fixed set anyway:** Devnet has no arbitrary user community holding confidential MPT tokens. The only accounts with active confidential balances are this project's four curated demo accounts (`Holder A` through `D`, M4). A visitor typing their own address will see nothing. The promise of "trying it" under H1 reduces in practice to looking up accounts that don't exist.
5. **Absolute fidelity to P-3:** P-3 mandates treating ledger state as dated observations rather than standing truth. H3 bakes the exact ledger index, timestamp, and amendment set into the static HTML, making it impossible for a lagging or lying node to display deceptive live state.

---

## Last: The single sentence in the ADR most likely to be false

> **`"Trigger 5 fires only for what is put into the bundle on purpose, and the gate can enumerate that."`**  
> — `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`, line 70

**Why it is false:**
1. **Clause 1 is false:** Trigger 5 governs *egress*—making data reachable by a party who could not obtain it before. The hosted demo dynamically causes the visitor's IP address and query data to reach Ripple's node and Vercel. That egress happens at runtime and is not in the bundle.
2. **Clause 2 is false:** `ADR-0003` explicitly proved and documented that lexical gates run over build artifacts *cannot* enumerate runtime egress: *"That the gate covers egress... It does not check what the tier EMITS, or to whom, and it now says so in its own output (item 11)"* ([ADR-0003:283-285](file:///docs/decisions/ADR-0003-web-tier-trust-boundary.md#L283-L285)). `ADR-0004` asserts the exact opposite.
