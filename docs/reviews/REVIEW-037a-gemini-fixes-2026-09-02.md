# REVIEW-037a-gemini-fixes-2026-09-02.md

- **Rotation:** `REVIEW-037` — ROUND TWO, reviewing `REVIEW-036`'s FIXES
- **Date:** 2026-09-02
- **Subject:** commit `f7e7b43` — `ADR-0003` rev 2, `check-web-readonly` part 6, `check-disclosure-phrases`
- **Access:** DOCUMENT TEXT ONLY — round one's adjudication and ADR revision 2. No repository.

⚠ **Verbatim leg output. Adjudicated in `REVIEW-037c`.** Some findings were
already fixed in the worktree when the leg read the commit; the adjudication
says which.

---

# ADVERSARIAL REVIEW: `ADR-0003` Revision 2

**Subject:** `docs/decisions/ADR-0003-web-tier-trust-boundary.md` (Revision 2)  
**Role:** Adversarial Reviewer  
**Verdict:** **UNSOUND ON REWRITE — CRITICAL DEFECTS (P1)**  
**Core Finding:** The rewrite attempts to rescue the ADR by retreating from a universal claim about *authority* to a narrow claim about *signing authority*, while packaging the moved disclosure boundary into an "unsettled handover." In doing so, it introduces a fatal self-contradiction into its trigger system, attributes to the transport layer a guarantee that actually depends on an unverified lexical heuristic, smuggles discredited premises back into the active decision text, and quietly drops half of Round One’s headline finding (U1).

---

## SUMMARY OF FINDINGS & GRADES

| ID | Sev | Category | Finding |
|---|---|---|---|
| **F1** | **P1** | **Rewritten Claim** | Conflates application discipline with transport properties; claims a negative is "verified" by a lexical gate it elsewhere admits cannot prove it. |
| **F2** | **P1** | **Trigger 5 (EGRESS)** | Self-Falsification Paradox: ADR lists Trigger 5 as falsifying the rewritten claim, admits Trigger 5 has already fired, yet asserts the claim stands and permits building without rotation. |
| **F3** | **P1** | **The "Handover"** | The handover is a pseudo-choice disguising a fait accompli: the ADR declares the tier "ships with the boundary open" while punting to an uncallable owner. |
| **F4** | **P1** | **Selective Amnesia** | The rewrite truncates U1: it isolates the issuer route in the handover and completely drops `GET /api/signer`'s loopback leakage of socket path, candidate paths, and UDS responses. |
| **F5** | **P2** | **Internal Contradiction** | Section D1 retains the exact falsified text asserting the tier discloses "nothing" and defending the entry count, contradicting the retraction section 3 pages later. |
| **F6** | **P2** | **Gate Verification Theater** | Celebrating Part 6 (binding to loopback) as a fix when loopback is the exact channel dissolving the UID barrier; lexical checks are mistaken for boundary verification. |
| **F7** | **P3** | **Decorative Rigor** | Elaborate self-criticism over grep hit counts (Metaco 3 vs 5) and wallet codecs acts as cosmetic scaffolding to distract from structural boundary failures. |

---

## 1. THE REWRITTEN CLAIM

> *"This tier adds no SIGNING authority: it cannot construct `Pair` or `Prepare`, it holds no key, and it cannot reach the holder's confirmation. That property is real, is verified by `tools/check-web-readonly.ts` parts 1-3, and rests on the transport rather than on this decision."*

### The Replacement is Unsound and Carries the Defect One Level Down [P1]

The rewrite retreats from *"grants no authority"* to *"adds no SIGNING authority"*, asserting this property **"rests on the transport rather than on this decision."**

**This is demonstrably false against the document’s own architecture.**

1. **The transport does NOT enforce "no `Pair` or `Prepare`":**
   - The transport connecting the browser to Elysia is HTTP.
   - The transport connecting Elysia to the signer is a **Unix Domain Socket (`ipc.rs`)**.
   - As `D1` and the preamble admit: `web/api/signer-status.ts` connects to that UDS.
   - **The UDS transport permits `Pair` and `Prepare`.** The socket wire protocol accepts those frames from whichever process holds the file descriptor.
   - Therefore, the fact that the web tier does not construct `Pair` or `Prepare` is **100% application-level discipline inside Elysia**, guarded only by code. Attributing this to the "transport" is a sleight of hand that conflates the *browser's* inability to open a UDS with the *tier's* (Elysia's) active connection to it.

2. **It is NOT verifiable by `tools/check-web-readonly.ts` parts 1–3:**
   - Under *"What this decision does not claim"*, the document explicitly concedes:
     > *"That the gate proves no signing path exists. It is a lexical check over a named set. A path it does not name is invisible to it..."*
   - You cannot in one section assert that a property is *"real, is verified by `tools/check-web-readonly.ts` parts 1-3"*, and three sections later concede that the gate only scans for a hardcoded list of identifiers and cannot prove the absence of a signing path.
   - A negative claim (*"cannot construct Pair or Prepare"*) cannot be verified by a lexical filter scanning a codebase for specific strings.

3. **It drops properties down a level:**
   By narrowing the claim strictly to *signing*, the document asserts: *"the milestone only ever needed the signing claim, and the signing claim is sound."* This is a post-hoc re-scoping. Architecture §6 step 8 is titled *"The web tier's trust boundary"*, not *"The web tier's signing non-capability"*. A tier that allows an unauthenticated, non-holder local user to obtain decrypted balances and signer activity metadata has moved a trust boundary. Narrowing the word to "signing" is a rhetorical evasion of Round One's ruling.

---

## 2. THE NEW FIFTH TRIGGER (EGRESS)

> *"5. ⚠⚠ EGRESS — the trigger the list was MISSING, and the one that had already fired... If this tier makes any datum reachable by a party who could not obtain that datum before the tier existed, the boundary has MOVED — regardless of whether the tier signs, holds a key, or performs any computation."*

### A. The Self-Falsification Paradox [P1]
The document introduces the section with this explicit declaration:
> *"Five things falsify the rewritten claim, and each is a rotation trigger rather than a code review:"*

It then lists items 1 through 5, culminating in:
> *"5. ⚠⚠ EGRESS — the trigger the list was MISSING, and the one that had already fired"*

**Look at the formal logic:**
- Premise 1: Items 1–5 *falsify the rewritten claim*.
- Premise 2: Trigger 5 *has already fired*.
- Conclusion: **The rewritten claim is currently falsified.**

If Trigger 5 falsifies the rewritten claim and has already fired, the ADR cannot simultaneously claim that the rewritten claim is sound and that Step 8 is buildable without a rotation. The document is arguing that its claim survives while explicitly categorizing the condition under which it is dead as an already-realized historical event.

### B. The Trigger is Pathologically Overbroad and Non-Actionable [P2]
*"If this tier makes any datum reachable by a party who could not obtain that datum before the tier existed..."*

A trigger that fires on everything is not a trigger. Under this formulation:
- Serving the web application bundle (HTML/JS) makes data reachable that was not reachable before.
- Querying a public rippled node, formatting JSON-RPC responses, and serving them over HTTP makes those formatted bytes reachable to a local user who had no rippled client installed.
- Exposing the Elysia HTTP server's own version header or listening port fires this trigger.

By using the unbounded phrase **"any datum"** without qualifying **confidentiality classification, security domains, or authorization boundaries** (e.g., data protected by filesystem mode bits or user-isolation boundaries), the trigger defines ordinary software operation as a boundary breach. Because it fires unconditionally on any network service ever written, it cannot serve as an actionable gate.

### C. It is Completely Unmonitored [P2]
Under *"What this decision does not claim"*:
> *"That the gate covers egress. It checks what the tier can REACH (parts 1-3), what it HOLDS (part 4), and where it BINDS (part 6). It does not check what the tier EMITS, or to whom..."*

The ADR adds a trigger, admits it already fired, makes it universal, and then admits that the automated gate—which it designates as the milestone’s falsifier—has no ability to check it.

---

## 3. OVERSTATED FIXES & LOAD-BEARING CONTRADICTIONS

### A. The Zombie Premise in Section D1 [P2]
In the retraction section, the ADR honestly acknowledges Round One U2:
> *"Revision 1's defence — that the count is 'activity metadata of exactly the kind the protocol leaves public' — answered a question about SENSITIVITY with the premise written about PUBLICNESS... Public ledger history cannot reveal a declined confirmation."*

**Yet, look at Section D1 of Revision 2. The discredited text was left completely untouched:**
> *"What the tier discloses that the protocol does not already publish: nothing. P-4 and P-11 say this system hides amounts, not who transacts, with whom, when or how often. The `Status` note's entry count is activity metadata of exactly the kind the protocol leaves public."*

This is not a minor oversight; it is an outright contradiction inside a 6-page decision record. Section D1 (the operative Decision) asserts that the tier discloses **nothing** non-public and defends the entry count. Section "The claim revision 1 made" asserts that this exact defense is **false** and that the count commits aborted local attempts. **Which section is the ADR?**

### B. Gate Verification Theater: Celebrating Part 6 [P2]
The document boasts:
> *"2. The gate verified by breaking it in both directions. DONE, and extended... Both are fixed, part 6 is new, and three break tests against the real tree exit 1."*

What does Part 6 check?
Under *"What this decision does not claim"*, Part 6 checks **"where it BINDS"** (enforcing `BIND_HOSTNAME = "127.0.0.1"`).

**This is security theater.** Round One's headline finding (U1) was precisely that **loopback TCP is not UID-scoped**:
> *"BIND_HOSTNAME = '127.0.0.1'; loopback is not uid-scoped... A second local user who cannot connect() the 0600 socket and cannot cat the 0600 snapshot can curl both through this tier."*

Part 6 enforces binding to the very interface that dissolves the `0600`/`0700` barrier! Verifying that the gate breaks if the server binds to `0.0.0.0` does nothing to prevent local non-root UIDs from curling loopback. Celebrating Part 6 as a verified fix for the trust boundary is posturing.

### C. Decorative vs. Load-Bearing Rigor [P3]
- **Decorative:** Section D4 devotes paragraphs to documenting that a grep for `harmonize|metaco` went from 3 hits to 5 hits between August 28 and September 2 (`E-229`). It also details the dependencies of `@crossmarkio/sdk` and `xumm`. This creates an illusion of obsessive forensic accuracy.
- **Load-Bearing:** Meanwhile, the ADR brushes past the fact that the automated gate checks only string literals, does not check egress, does not check peer UID, and that the server leaks decrypted balance files to any user on the machine.

---

## 4. THE HANDOVER OF THE ISSUER ROUTE

> *"What revision 2 does NOT settle — the issuer route is HANDED OVER, not decided... A coding session may not rule on this, and this one did not. The choice is a genuine trade and it belongs to the project owner..."*

### A. The Handover is a Way of Not Deciding While Shipping Open [P1]
The document adopts a posture of humility: *"A coding session may not rule on this, and this one did not."*

Then read the immediate consequence under that same section and under *Consequences*:
> *"Until it is ruled, the tier ships with the disclosure boundary open..."*  
> *"Architecture §6 step 8 is buildable now, without a rotation, and its falsifier is the gate."*

This is dishonest governance. If an ADR says:
1. This route violates the trust boundary established by project mode bits.
2. Resolving it requires a trade-off that only the project owner can make.
3. Therefore, we are going to **ship the code with the breach open** and declare Step 8 **buildable now without a rotation**.

Then the coding session **did** make the decision: it selected **Option 3** (*"Accept it as a named risk"*) by default, while claiming it had the discipline to defer the choice. Calling it an "unsettled handover" allows the team to merge the code while keeping the ADR formally `Proposed` to avoid accountability.

### B. The Four Options: False Symmetry & Phantom Solutions [P2]
The four options presented to the owner are neither balanced nor fully truthful:
- **Option 1 (Authenticate the route):** The ADR poisons the well by claiming this resurrects the shape `REVIEW-003b` killed. But `REVIEW-003b` killed a bearer secret in the *browser* for *signing*. Requiring local IPC authentication for an administrative read API is standard practice.
- **Option 2 (Stop serving `decrypted`):** Framed as gutting the demonstration and violating `CLAUDE.md`.
- **Option 3 (Accept as named risk):** What the session actually implemented.
- **Option 4 (Bind snapshot's reach to file's own mode):**
  > *"serve it only to a caller that can already read the file, which is the only option that ADDS no credential and REMOVES no disclosure."*
  
  **How does a loopback TCP listener on macOS serve only a caller that can read a mode-0600 file without adding a credential?**
  - Loopback TCP does not pass `SO_PEERCRED` / `LOCAL_PEERCRED` across TCP sockets on macOS or BSD.
  - A browser process cannot read mode-0600 files from disk due to OS sandboxing.
  - The only way an HTTP client proves it can read a mode-0600 file is by reading a token from a mode-0600 file and presenting it in an HTTP header. That **is** adding a credential!
  Option 4 is a technical phantom presented as an elegant no-trade-off ideal to make the handover look thoughtfully analyzed.

---

## 5. WHAT THE REWRITE DID NOT FIX

### A. Total Erasure of `GET /api/signer` from the U1 Remediation [P1]
Round One U1 explicitly targeted **two** sites where the per-user barrier was dissolved:
1. The decrypted-balance snapshot (`issuer-view-snapshot.ts`, mode `0600`).
2. **The signer's Unix domain socket (`ipc.rs`, mode `0700` dir / `0600` socket).**

Round One proved:
> *"`GET /api/signer` returns the socket's answer and the socket path (`web/api/server.ts:74-78` spreads `...probe`; `web/api/signer-status.ts:43-45`)... Reachable by any local uid."*

**The rewrite completely memory-holed the signer socket in its handover.**
Look at the heading:
> *"What revision 2 does NOT settle — the issuer route is HANDED OVER, not decided: `REVIEW-036` U1 established that `GET /api/issuer/:account/:issuanceId` serves `decrypted` confidential balances..."*

Where did `GET /api/signer` go?
It is not in the handover. It is not mentioned in the decision. It is not guarded by authentication. The API still spreads `...probe`, returning the per-user temporary socket path (`/var/folders/...`), the candidate filesystem probe paths, and the signer status to any local UID on loopback. The rewrite quietly narrowed U1 from two endpoints down to one, leaving the other unaddressed and unacknowledged.

### B. Premise 2 is Still Disregarded in Practice [P2]
Revision 2 strikes:
> ~~*"What makes it publishable as `Proposed` without a rotation is not the quality of the argument — it is that the decision removes authority rather than granting it."*~~

And admits:
> *"A DISCLOSURE boundary did move, and revision 1 neither noticed nor priced it"*

Yet the document's operative conclusion remains:
> *"Architecture §6 step 8 is buildable now, without a rotation, and its falsifier is the gate."*

This is the exact same procedural maneuver that Round One invalidated. In Revision 1, the rotation was bypassed because "authority was removed." In Revision 2, the rotation is bypassed because "signing authority is unchanged," even while acknowledging that a disclosure boundary moved and that the gate cannot check disclosure. The mechanism of evasion has merely shifted from an unsound premise about authority to a bifurcated definition of boundaries.

---

## WHAT WAS ATTACKED AND COULD NOT BE BROKEN

An adversarial review that finds fault with everything is an exercise in bias. The following sections of the rewrite were attacked vigorously and **held firm**:

1. **The Transport Barrier Between Browser and Signer:**
   The attack that *"Elysia is an HTTP proxy that could allow a browser to drive the signer"* fails against the current codebase. The browser cannot construct or issue arbitrary IPC commands; `signer-status.ts` has no code path or parameterization to emit `Pair` or `Prepare`. The browser-to-signer isolation against *signing* operations is structurally intact.
2. **Rejection of ADR-0001 Option 2 (Proving in the Browser):**
   The argument in D2 and Alternatives regarding why Option 2 is structurally broken holds up under scrutiny. Because ElGamal secret derivation depends on the master seed under the ruled keygen, running proofs in the page requires either exposing the root seed to the DOM or redesigning the protocol key hierarchy. The finding that extensions like GemWallet and Crossmark cannot perform confidential proofs is sound and independent of wallet codec updates.
3. **Removal of the Live Decryption Oracle (`E-212`):**
   The removal of `WCONF_ELGAMAL_SK` from the API process memory is real. The API no longer performs active ElGamal decryptions per HTTP request. The attack that the API remains an active computation oracle fails; it has been reduced to a static file-serving disclosure channel.
4. **Correction of Shipped Scope (`routeTree.gen.ts`):**
   The removal of the non-existent *"facility's run records"* route from the ADR's description aligns the document with the real tree (`REVIEW-036b` F7).

---

## CONCLUSION & REQUIRED ACTION

Revision 2 cannot be accepted in its current form. It swaps an unsustainable universal assertion about authority for an unsustainable logical paradox about triggers, while shipping an unauthenticated UID leak under the banner of an "unsettled handover."

Before `ADR-0003` can be accepted:
1. **Resolve the Trigger 5 Paradox:** Trigger 5 must either be re-scoped to *unauthorized/cross-domain disclosure* rather than "any datum", and the tier must be evaluated against it, or the claim that Triggers 1–5 falsify the rewritten claim must be revised.
2. **Reconcile D1 with the Retraction:** The text in D1 claiming the tier discloses "nothing" and defending the entry count must be deleted or harmonized with the retraction section.
3. **Stop the "Ship Open" Handover:** The project owner must rule on the issuer route *before* Step 8 is declared buildable. If Option 3 is chosen, state plainly that the project accepts local cross-UID balance disclosure for the demo.
4. **Restore `GET /api/signer` to the Scope of U1:** The disclosure of socket paths, probed filesystem paths, and internal signer status via loopback TCP must be priced and settled alongside the issuer balance snapshot.
