# REVIEW-036a — Gemini leg: attack the central claim as a design argument

- **Rotation:** `REVIEW-036` — `ADR-0003`'s central claim
- **Date:** 2026-09-02
- **Subject:** `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, revision 1, `Proposed`
- **Access:** DOCUMENT TEXT ONLY. No repository, no tree, no CLAIMS.md corpus.
- **Packet:** `docs/reviews/REVIEW-036-packets/packet-a-gemini.md` — the ADR in full, architecture §3, the rotation rule, P-4/P-5/P-9/P-11. **Uncontaminated by the tree and by this rotation's other legs.**

⚠ **Verbatim leg output. Adjudicated in `REVIEW-036c`** — findings here are the
leg's, not the project's, and several were rejected on source. Read the
adjudication for what was upheld.

---

## VERDICT ON THE CENTRAL CLAIM

**UNSOUND.** The central claim (*"A tier that reads public state and holds no credential grants no authority that did not already exist, so no trust boundary moves, so the mandatory-rotation gate does not fire"*) fails on both formal validity and factual truth. As an inference, it commits a fallacy of definition narrowing: it equates the entirety of a "trust boundary" with *transaction-signing authority*, silently discarding confidentiality, transport isolation, presentation integrity, and attack-surface expansion. As a factual matter, its premises are false: the tier does *not* read merely public state—by the ADR's own admission, it reads host-private process metadata via `Request::Status` and renders decrypted confidential balances via the issuer view pipeline. By creating an unauthenticated localhost HTTP server that bridges to a private Unix domain socket and renders state for user decisions, the tier establishes two brand-new trust boundaries while degrading the transport isolation of the signer. Waiving the mandatory adversarial rotation based on this claim is an unearned procedural bypass.

---

## FINDINGS

### F1 — [P1] Equivocating "Authority" with "Trust Boundary" (Invalid Inference)
QUOTE: *"A tier that reads public state and holds no credential grants no authority that did not already exist, so no boundary moves, so the gate does not fire."*
DEFECT: The inference `[grants no new authority] ⟹ [no boundary moves]` is invalid. Authority (the capability to execute state transitions or sign transactions) is only one axis of a trust boundary. In standard security engineering (and in Architecture §3 itself), a trust boundary also governs:
1. **Network & Transport Exposure:** The signer was deliberately isolated behind a Unix domain socket (`ipc.rs`) precisely because web browsers cannot open Unix sockets. Placing an HTTP tier in front creates a network-reachable bridge to an otherwise network-isolated process.
2. **Confidentiality & Information Disclosure:** Aggregation, caching, and exfiltration of data across privilege domains.
3. **Presentation Integrity:** What the user sees and relies on to make trust decisions (see F5).
4. **Denial-of-Service / Resource Isolation:** Protecting the signer daemon from resource exhaustion or IPC desynchronization triggered by network clients.
By defining "trust boundary movement" solely as "granting signing authority to the browser," the claim silently drops every other protective property a trust boundary provides.
WHY IT MATTERS: If this inference is allowed to stand, any session can build arbitrary unauthenticated network listeners, proxy services, or telemetry aggregators directly adjacent to private keys and bypass adversarial review simply by making them "read-only."
NEEDS SOURCE CHECK: No. This is a formal defect in the argument's deductive logic.

---

### F2 — [P1] False Premise: The Tier Reads Non-Public and Host-Private State
QUOTE: *"A tier that reads public state and holds no credential grants no authority that did not already exist..."* and D1: *"The tier renders what is already readable: public ledger state at a pinned validated index, the observer view, the issuer view given a demo issuer key, the facility's run records, and the signer's own status."*
DEFECT: The premise that the tier "reads public state" is factually false in two separate places in the decision itself:
1. **The Issuer View reads private, decrypted state:** Under protocol rules P-4 and P-11, confidential balances and amounts on the public ledger are *encrypted*. Decrypted balances are private state readable only by the holder or the issuer's decryption mirror (P-9). Whether the web tier decrypts on the fly or reads the output of `tools/issuer-decrypt-balance.ts`, the web tier is ingesting and rendering *decrypted confidential state*. Plaintext balances are not public state.
2. **`Request::Status` reads host-private process state:** `Request::Status` connects to `signer/src/ipc.rs` and returns `keys_loaded`, the crate version, the holder's address, and the randomness ledger's generation ID and entry count. The operational status of a local signing daemon and the confirmation of which account is loaded in memory is host-local process state, not public ledger state.
WHY IT MATTERS: The antecedent of the central claim is false. Because the tier reads decrypted confidential data and host-private daemon metadata, it acts as an information-dissemination boundary. It cannot claim exemption under a premise of "only reading public state."
NEEDS SOURCE CHECK: Yes — check `web/api` for how the issuer view endpoint is populated (grep for invocations of `issuer-decrypt-balance` or imports of decryption artifacts) and verify the exact schema returned by the Elysia status route.

---

### F3 — [P1] Circular Scope and Self-Adjudication of the Mandatory Rotation Gate
QUOTE: *"What makes it publishable as Proposed without a rotation is not the quality of the argument — it is that the decision removes authority rather than granting it, and §3's rotation requirement is triggered by trust-boundary movement."*
DEFECT: The scope test is entirely circular. `CLAUDE.md` establishes a meta-rule: *"Architecture, trust boundaries, cryptographic design, anything to be published: full adversarial rotation before implementation."* ADR-0003 circumvents this rule by having the implementing author self-adjudicate whether a trust boundary moved:
1. The author defines "trust boundary change" as strictly "a browser signing confidential transactions."
2. The author designs a tier that does not sign.
3. The author declares no trust boundary has moved.
4. The author concludes that no rotation is required.
A policy designed to protect against author blind spots cannot permit the author to define the trigger condition out of existence. A non-circular test must be structural: **any introduction of a new network listener, any cross-process communication bridge to the signer, or any new architectural tier is an architectural change that triggers the rotation gate automatically, regardless of claimed data flow.**
WHY IT MATTERS: Procedural bypass. The ADR explicitly notes that the session writing the ADR is the session implementing it. Self-serving scope definitions are the exact failure mode review gates exist to stop.
NEEDS SOURCE CHECK: No.

---

### F4 — [P2] Ambient Transport Authority: Bridging UDS to Localhost HTTP
QUOTE: *"A browser page cannot connect at all. No web API opens a Unix socket."* ... *"Only the Elysia process may open the Unix socket."* ... *"The application talks to Elysia over HTTP."*
DEFECT: The claim asserts that the tier "holds no credential," implying it conveys no unauthenticated privilege. However, Elysia possesses **ambient transport authority**: it runs as a local process with filesystem permissions to open `signer/src/ipc.rs`. By exposing an unauthenticated HTTP listener on `localhost`, Elysia creates an ambient bridge between two completely different security contexts:
- *Before:* The signer UDS is reachable only by processes with local OS user/filesystem access to the socket path. A browser page cannot touch it.
- *After:* Any process on the host, and potentially web pages running in the holder's browser (via DNS rebinding or missing CORS/Host checks), can issue HTTP requests to Elysia, which in turn opens and queries the signer's UDS.
The claim ignores that transforming an OS-mediated IPC endpoint into an HTTP-mediated network endpoint is itself a substantial transport boundary movement.
WHY IT MATTERS: Hostile same-host processes are explicitly in the threat model (Architecture §3, Issue #1). An unauthenticated HTTP port lowers the barrier to probing the signer's liveness, state, and version from "must have filesystem access to the socket" to "can issue a localhost TCP request."
NEEDS SOURCE CHECK: Yes — check Elysia server initialization in `web/api` (grep for `.listen(`) to verify whether it binds to `127.0.0.1` or `0.0.0.0`, and whether Host header validation or origin filtering is implemented.

---

### F5 — [P2] Presentation Integrity Dropped from the Boundary Definition (Address Substitution)
QUOTE: *"Signing stays in the `wconf-signer` CLI, where the holder confirms against parsed transaction fields in the signer's own UI. That confirmation is architecture §6 step 1's falsifier and it is the actual trust boundary; nothing in this decision touches it."*
DEFECT: This claim assumes the trust boundary starts and ends where transaction bytes are signed. It ignores the **presentation and preparation boundary**. In real usage, a user uses the web tier to view account states, inspect counterparty addresses, and observe transaction results.
If the web tier is compromised (via dependency supply chain, local process tampering, or SSR script injection), it can display attacker-controlled counterparty addresses or fraudulent transaction histories. When the user copies an address from the web UI and pastes it into the CLI signer, the CLI signer faithfully displays the attacker's address, and the user confirms it because "the web app told them to." Architecture §3 rule 1 was established because "clients lie." A web UI that displays transaction context is a client that can lie.
WHY IT MATTERS: Calling the web tier "out of the trust boundary" gives developers a false justification to skip integrity protections on the frontend, treating presentation spoofing as out of scope.
NEEDS SOURCE CHECK: No.

---

### F6 — [P3] Lexical Gate Substituted for Architectural Invariance
QUOTE: *"This is enforced by a gate, not by discipline — `tools/check-web-readonly.ts`, built before the UI. It is a lexical gate over a named set and it says so..."*
DEFECT: A static string-matching script (`check-web-readonly.ts`) is cited as the structural enforcement preventing the web tier from signing. But a lexical check is not an architectural boundary:
1. It does not detect dynamic imports, string concatenation, reflection, or indirect HTTP calls.
2. It cannot inspect TanStack Start server functions that might call external binaries or access ambient environment variables.
The ADR itself acknowledges that "a gate that implies more than it checks is this repository's most-repeated defect (E-165, E-168, E-182, E-198, E-203)," yet it immediately relies on one to justify skipping an architectural rotation.
WHY IT MATTERS: Lexical checks offer a false sense of formal verification while leaving architectural drift unchecked.
NEEDS SOURCE CHECK: Yes — inspect `tools/check-web-readonly.ts` to see the exact token list and verify whether AST parsing or merely regex/string searching is used.

---

## CONCRETE LIST: WHAT NEW THING EXISTS?

To evaluate whether a boundary moved, we must catalog what concrete entities exist after step 8 that did not exist before, and whether the central claim covers them:

1. **A localhost TCP/HTTP listener (Elysia API):**
   - *Status:* Brand new. Previously, only an OS filesystem socket (`ipc.rs`) existed.
   - *Covered by claim?* **No.** The claim ignores transport exposure and network-to-IPC bridging.
2. **An SSR Web Server and Client Application (TanStack Start):**
   - *Status:* Brand new. Introduces a Node/Bun runtime, hydration, client-side bundle execution, and RPC server functions.
   - *Covered by claim?* **No.** The claim handwaves SSR as "crossing no new boundary because Elysia is already local."
3. **An IPC Client inside a Network Daemon:**
   - *Status:* Brand new. Code inside Elysia that formats packets and writes to the signer UDS.
   - *Covered by claim?* **Partially.** The claim notes it is restricted to `Request::Status`, but fails to analyze IPC protocol confusion or socket exhaustion.
4. **An Unauthenticated Network Query Surface for Signer Metadata:**
   - *Status:* Brand new. Anyone capable of sending an HTTP request to Elysia can learn `keys_loaded`, generation IDs, and active holder addresses.
   - *Covered by claim?* **No.** Dismissed as "activity metadata," ignoring local process fingerprinting.
5. **A Presentation Layer for Balances and Counterparties:**
   - *Status:* Brand new.
   - *Covered by claim?* **No.** Dropped under the assumption that confirmation in the CLI absolves the UI of all presentation integrity requirements.
6. **An HTTP Pipeline Serving Decrypted Confidential Balances (Issuer View):**
   - *Status:* Brand new.
   - *Covered by claim?* **No.** Directly contradicts the premise "reads public state."

---

## WHAT SURVIVES

Despite the central claim being unsound as an exemption from review, several core technical arguments within ADR-0003 are solid and survive adversarial scrutiny:

1. **The Transport Property of the Signer UDS (`ipc.rs`):**
   - *The ADR's position:* A browser sandbox cannot open a Unix domain socket directly.
   - *Why the attack fails:* This is an operating system and web platform reality. There is no Web API (`fetch`, `WebSocket`, `WebTransport`, WebRTC) that can bind or connect to `AF_UNIX` filesystem paths. An attacker in a browser cannot bypass Elysia to speak raw IPC to the signer unless an explicit bridging proxy is built.
2. **Rejection of ADR-0001 Option 2 (Browser Proving & Keys):**
   - *The ADR's position:* Running proving/keys inside the browser is rejected on risk, not cost.
   - *Why the attack fails:* The derivation of the ElGamal secret from the master seed (`REVIEW-012`) means putting confidential proving in the browser requires exposing or deriving master seed material in a web environment. Browser wallet extensions exist specifically to prevent seed export. Recommending Option 2 would destroy the isolation of the master account key for an unrotatable exposure. The ADR is completely right to reject Option 2 on structural risk.
3. **Rejection of Localhost HTTP with Pasted Tokens / Origin Allowlists:**
   - *The ADR's position:* Origin allowlists and session tokens do not constrain hostile local processes.
   - *Why the attack fails:* Under Issue #1, a hostile local process is in the threat model. Local processes can easily inspect loopback traffic, forge `Origin` headers, or read files from the holder's home directory. A value-shaped HTTP interface with a bearer token indeed degenerates into a local spend oracle.

---

## THE FALSIFIER LIST

The ADR lists four rotation triggers:
1. Any path from the browser to a signing operation.
2. Keys or proving in the page.
3. A native shell (Tauri, Electron) opening the socket.
4. A decryption oracle (accepting a key or exposing a decryption result over HTTP).

### Is the list complete?
**NO. It is critically incomplete.** The author listed only triggers related to *signing* and *key exposure*, completely missing triggers related to network reachability, presentation integrity, and transport exhaustion.

### Missed Falsifiers (High-Value Findings):

1. **Falsifier 5 (MISSED): DNS Rebinding & Cross-Origin Localhost Exposure**
   - *Condition:* If the Elysia HTTP server can be reached by a browser executing code from an arbitrary web origin via DNS rebinding (e.g., `attacker.com` resolving to `127.0.0.1`), or if CORS/Host headers are not strictly validated to localhost.
   - *Why it falsifies the claim:* External web pages could query local signer status, probe running account addresses, and inspect local node configurations without any local process execution.
2. **Falsifier 6 (MISSED): Presentation-Level Parameter Injection / Address Substitution**
   - *Condition:* If the web tier is used by the holder to generate, look up, or copy transaction parameters (counterparty addresses, convert amounts, sequence numbers) that are subsequently input into the CLI signer without independent, out-of-band verification.
   - *Why it falsifies the claim:* A compromised web tier becomes a transaction-tampering oracle, defeating the purpose of the signer's independent UI by tricking the user into confirming attacker parameters.
3. **Falsifier 7 (MISSED): IPC Protocol Confusion & Deserialization Injection via the UDS Bridge**
   - *Condition:* If any code path in Elysia allows external HTTP request parameters, headers, or query strings to influence the bytes written to the Unix domain socket, or if malformed HTTP requests can cause Elysia to send invalid frames that crash or desynchronize `wconf-signer`.
   - *Why it falsifies the claim:* The transport isolation of `ipc.rs` is nullified the moment an HTTP daemon dynamically serializes untrusted input into the socket.
4. **Falsifier 8 (MISSED): Ambient SSR Server-Function Privilege Escalation**
   - *Condition:* If any TanStack Start server function executes with access to ambient environment variables, local configuration files, or local administrative ports without an explicit, statically enforced permission boundary.
   - *Why it falsifies the claim:* Server functions blur the boundary between client and server; an unvetted server function can inadvertently expose local machine secrets or file contents to client components under the guise of an ordinary RPC call.
5. **Falsifier 9 (MISSED): Denial of Service / Connection Starvation of the Signer Daemon**
   - *Condition:* If unauthenticated HTTP requests to Elysia can exhaust file descriptors, saturate the single-threaded event loop, or hold open UDS socket handles to `wconf-signer`.
   - *Why it falsifies the claim:* An attacker can lock up the holder's signing daemon from the network, preventing timely transaction submission or blinding the holder to randomness ledger updates.
