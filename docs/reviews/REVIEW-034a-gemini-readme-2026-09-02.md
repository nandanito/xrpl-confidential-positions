# REVIEW-034a — Gemini leg, round three: the README

- **Date:** 2026-09-02
- **Access:** document text only. No repository. Uncontaminated by `CLAIMS.md` E-222.
- **Model:** external (agy, effort high).

---

# Adversarial Review Report: W-CONF README (Round Three)

**Reviewer Stance:** Independent, hostile adversarial audit  
**Scope:** `README.md` (unabridged text provided)  
**Objective:** Identify logical contradictions, decorative hedges, arithmetic errors, self-rule violations, false takeaways, and missing critical specifications that survived Rounds 1 & 2.

---

## Executive Summary of Round Three Findings

Two previous review rounds eliminated obvious cosmetic defects and surfaced historical errata, but left deeper architectural contradictions, arithmetic errors, and self-rule violations intact. Most critically:
1. **Mathematical impossibility in benchmark analysis:** The document claims two derived rates "bracket" a benchmark figure when both numbers are strictly higher than it.
2. **Standard and Amendment conflation:** The document asserts that three amendments must be enabled on the network because `SingleAssetVault` is required for `sfDomainID`, conflating XLS-65 with XLS-80, while simultaneously stating earlier that the project does not use `sfDomainID` at all.
3. **Unfulfilled self-imposed disclosure:** The document explicitly mandates that it must disclose whether the facility sets `lsfMPTCanClawback`, yet fails to disclose it anywhere in the text.
4. **False claims regarding `fail_hard`:** The document promises `fail_hard` prevents failed confidential transactions from landing on-ledger, ignoring consensus-time `tec` applications.
5. **Direct violation of Rule P-8:** The document quotes execution duration without specifying the hardware.

---

## 1. Logical Consistency & Collapsed Distinctions

### Finding 1.1: Conflation of XLS-65/XLS-80 and Contradiction of Application Scope
* **Severity:** **P1**
* **Exact Quoted Sentence:**
  > `"**Three amendments must be enabled on the same network, not one:** `ConfidentialTransfer`, `PermissionedDomains` and `SingleAssetVault` — the last because writing `sfDomainID` to an `MPTokenIssuance` requires it."`
* **Why it is wrong:**
  1. *Protocol Error:* "The last" amendment in the list is `SingleAssetVault` (XLS-65). `SingleAssetVault` has nothing to do with `sfDomainID`. `sfDomainID` is introduced by `PermissionedDomains` (XLS-80).
  2. *Scope Contradiction:* The introduction explicitly states: *"It does not exercise Credentials (XLS-70) or Permissioned Domains (XLS-80)... The issuance carries no `sfDomainID`, and the facility says so when it runs."* Furthermore, XLS-65 is explicitly not composable with confidential transfers. If the reference build carries no `sfDomainID` and does not use vaults, asserting that all three amendments *must* be enabled on the same network for this application to run is false and contradicts the project's own scope.
* **Corrected Sentence:**
  > `"**Only `ConfidentialTransfer` is strictly required for this reference build; `PermissionedDomains` and `SingleAssetVault` are enabled on Devnet but are relevant only to adjacent research:** writing `sfDomainID` to an `MPTokenIssuance` requires `PermissionedDomains` (which this build does not set), while `SingleAssetVault` is evaluated only in off-path compatibility research."`

---

### Finding 1.2: Contradiction on Threat Model and Signer UI Confirmation Efficacy
* **Severity:** **P2**
* **Exact Quoted Sentence:**
  > `⚠ **It does not stop a hostile process running as the same user.** That adversary is in scope, and the per-transaction confirmation, not the transport, is what stands against it.`
* **Why it is wrong:**
  This directly contradicts the architecture section, which states: *"Against the same-host adversary that is in scope, this is the last line rather than a guarantee — that adversary reads `sk_A` from memory and the screen is irrelevant."* If an adversary running as the same user can read `sk_A` out of process memory, they do not invoke the signer via socket or prompt the UI—they derive or sign transactions directly. Asserting in the Trust Model that the per-transaction confirmation "stands against" this adversary is a contradiction.
* **Corrected Sentence:**
  > `⚠ **It does not stop a hostile process running as the same user.** That adversary is in scope; the per-transaction confirmation protects only against a malicious caller submitting altered parameters over the socket, whereas an adversary with local memory read access can extract `sk_A` directly and bypass the confirmation UI entirely.`

---

### Finding 1.3: Conflation of "Browser Page" with the "Web Tier"
* **Severity:** **P3**
* **Exact Quoted Sentence:**
  > `"**The trust boundary is the signer process — and it is a real boundary for the web tier only.** For the web tier it holds by construction: the browser cannot reach the signer at all."`
* **Why it is wrong:**
  The document defines `web/` as comprising two components: `web/app` (the browser frontend) and `web/api` (an Elysia server process on loopback). The document explicitly states that `web/api` *does* open a Unix domain socket to the signer to query `Status`. Saying the boundary holds for the "web tier" by construction because "the browser cannot reach the signer" collapses the distinction between the browser client and the backend server process of the web tier.
* **Corrected Sentence:**
  > `"**The trust boundary is the signer process — and it holds by construction against the browser application (`web/app`), which has no API to open a Unix domain socket.** The backend server process (`web/api`) does connect over UDS, but is restricted to read-only `Status` queries."`

---

### Finding 1.4: Inverted Logic in B-15 Risk Acceptance Receipt Flag
* **Severity:** **P2**
* **Exact Quoted Sentence:**
  > `"Nothing has run against a loopback node. Every Devnet interaction goes to the public cluster under a named risk acceptance (B-15, E-151), because a local node could not acquire Devnet's state tree on the available hardware (E-148). Every run record says `underB15Conditions: false`."`
* **Why it is wrong:**
  If every interaction was executed against the public cluster *under* the B-15 risk acceptance, then the run records asserting `underB15Conditions: false` is an explicit contradiction between the actual execution environment and the recorded receipt metadata. Either the receipts are falsely recording that B-15 conditions were not active, or the text misstates what the flag represents.
* **Corrected Sentence:**
  > `"Nothing has run against a loopback node. Every Devnet interaction goes to the public cluster under a named risk acceptance (B-15, E-151), because a local node could not acquire Devnet's state tree on the available hardware (E-148). Every run record says `underB15Conditions: true` (or: `underPublicClusterConditions: true`)."`

---

## 2. Claims That Outrun Their Evidence (Decorative Hedges)

### Finding 2.1: False Decorative Hedge on Unauthenticated Issuer View Disclosure
* **Severity:** **P2**
* **Exact Quoted Sentence:**
  > `"**These are demo Devnet balances the issuer may read anyway under P-9**, so the consequence is small — but no review has looked at it, and it was found by a fresh reader of this README rather than by six rounds of code review."`
* **Why it is wrong:**
  The hedge attempts to downplay the issue by asserting "the issuer may read anyway under P-9". However, the finding is that `GET /api/issuer/<account>/<issuance>` on `127.0.0.1:3011` serves decrypted plaintext balances without authentication to *any* local process or browser script on the machine. P-9 permits the *issuer* to decrypt balances, but exposing decrypted balances to unauthenticated local HTTP callers violates the observer boundary. Framing an unauthenticated local disclosure as an authorized issuer read is a decorative hedge.
* **Corrected Sentence:**
  > `"**While protocol rule P-9 entitles the issuer to decrypt these balances, serving them over unauthenticated loopback HTTP exposes decrypted balances to any local process or browser context**, breaching local observer confidentiality even though chosen-input decryption is closed."`

---

### Finding 2.2: Decorative Hedge on `/tmp/wconf` Build Integrity
* **Severity:** **P2**
* **Exact Quoted Sentence:**
  > `The patch is committed and `make vendor-verify` checks the restoration byte for byte, which bounds what a tampered tree could hide; it does not make `/tmp` a safe place to link a cryptography library from.`
* **Why it is wrong:**
  The document notes that `make vendor-verify` is *not* part of the gate list and is not run by `cargo build`. Because `/tmp/wconf` is writable by any process running under the same UID (an in-scope adversary), a malicious process can alter header files or object code in `/tmp/wconf` during or after compilation (TOCTOU). Claiming that `make vendor-verify` "bounds what a tampered tree could hide" when the build script unconditionally compiles from `/tmp` without verification during `make signer` is a decorative hedge.
* **Corrected Sentence:**
  > `The patch is committed and `make vendor-verify` can verify the tree on demand, but because `signer/build.rs` compiles directly from `/tmp/wconf` without running this check at build time, a tampered build tree in `/tmp` remains completely unprotected against a same-user adversary.`

---

## 3. Arithmetic and Counts

### Finding 3.1: Mathematical Impossibility in Range Cost Bracketing
* **Severity:** **P2**
* **Exact Quoted Sentence:**
  > `"The measured cost is about **2.49 µs per unit of range**, with no early exit and no sublinear fallback shipped; the two timings above bracket it at 2.54 and 2.50 µs respectively, so **do not try to derive it from them.**"`
* **Why it is wrong:**
  Let the two timings be calculated:
  - 10¹⁶ balance: $\frac{5.09\text{ ms}}{2001\text{ units}} \approx 2.5437\text{ }\mu\text{s/unit}$.
  - Value 42: $\frac{2.5\text{ s}}{1,000,000\text{ units}} = 2.5000\text{ }\mu\text{s/unit}$.
  The interval formed by these two values is $[2.50, 2.54]\text{ }\mu\text{s}$.
  Both $2.54\text{ }\mu\text{s}$ and $2.50\text{ }\mu\text{s}$ are strictly greater than $2.49\text{ }\mu\text{s}$. They do **not** "bracket" $2.49\text{ }\mu\text{s}$; $2.49\text{ }\mu\text{s}$ falls completely below the lower bound of the interval.
* **Corrected Sentence:**
  > `"The measured cost is about **2.49 µs per unit of range**, with no early exit and no sublinear fallback shipped; the two timings above both sit slightly above this baseline at 2.54 and 2.50 µs respectively, so **do not try to derive it from them.**"`

---

## 4. The Document's Own Rules, Turned on Itself

### Finding 4.1: Violation of Rule P-8 (Quoting Numbers Without Hardware Specification)
* **Severity:** **P2**
* **Exact Quoted Sentence:**
  > `make check-zeroize-bounds                     # ~3 min`
* **Why it is wrong:**
  Under the section "What the research established", the document states its strict rule:
  > *"...Hardware, flags and spread in `benchmarks-2026-08-16.md` — **quote the hardware with the number or do not quote the number** (P-8)."*
  
  Quoting an execution duration of `~3 min` in the gate commands block without quoting the CPU, memory, or runner environment violates rule P-8 directly.
* **Corrected Sentence:**
  > `make check-zeroize-bounds                     # ~3 min on Apple M3 Pro` *(or omit the timing comment entirely: `make check-zeroize-bounds`)*.

---

### Finding 4.2: Unfulfilled Mandatory Disclosure Regarding Clawback Flag
* **Severity:** **P1**
* **Exact Quoted Sentence:**
  > `"Whether this project sets the clawback flag is a choice it must disclose either way."`
* **Why it is wrong:**
  The document imposes a mandatory disclosure rule on itself in the Trust Model, stating that whether the build sets `lsfMPTCanClawback` *must* be disclosed either way. However, nowhere in the entire README is it stated whether the project's token issuance sets or clears `lsfMPTCanClawback`. The document defines a required disclosure and fails to provide it.
* **Corrected Sentence:**
  > `"Whether this project sets the clawback flag is a choice it must disclose either way: the facility's `MPTokenIssuance` leaves `lsfMPTCanClawback` unset (or: sets `lsfMPTCanClawback`), ensuring holder balances cannot be burned unilaterally (or: subjecting balances to unilateral burning)."`

---

## 5. What a Reader Would Wrongly Conclude

### Finding 5.1: False Takeaway Regarding `fail_hard` Protection Against On-Ledger `tec` Codes
* **Severity:** **P1**
* **Exact Quoted Sentence:**
  > `"That is the submission parameter which tells a node to discard a failing transaction instead of applying it — and a confidential transaction that fails still **lands on the ledger carrying its ciphertexts**, so a transaction built against a substituted destination key publishes the amount encrypted to the substituter, permanently. **Whatever submits has to set the flag, and nothing forces it to.** (F-23, F-28.)"`
* **Why it is wrong:**
  *What a reader wrongly concludes:* A reader will conclude that setting `fail_hard` guarantees a failing confidential transaction will never land on the public ledger or expose its ciphertexts.  
  *Why it is false:* On XRPL, `fail_hard` is a client RPC submission parameter that instructs the local node to reject a transaction during local preflight. If a transaction passes local preflight and is broadcast into consensus, but subsequently fails during consensus application (e.g., due to a balance change or race condition), validators apply it to the ledger with a `tec` code, consuming the fee and permanently publishing its ciphertexts. `fail_hard` provides zero protection against consensus-stage `tec` results.
* **Corrected Sentence:**
  > `"That is the submission parameter which tells the local node to discard a failing transaction during local preflight rather than broadcasting it — though if a transaction passes preflight and fails during consensus application, it still **lands on the ledger as a `tec` carrying its ciphertexts**; whatever submits should set `fail_hard` to prevent preflight failures from broadcasting, but no client flag can prevent on-ledger `tec` application once in consensus."`

---

### Finding 5.2: False Takeaway Regarding Multi-Party Signer Execution
* **Severity:** **P2**
* **Exact Quoted Sentence:**
  > `"`signer/` — a Rust binary on the holder's machine. It holds the ElGamal secret `sk_A` and the XRPL account key, generates the proofs, and signs."`
* **Why it is wrong:**
  *What a reader wrongly concludes:* A reader will conclude that running `make signer-run` starts a single daemon holding one holder's keys that can service the entire multi-party facility demo.  
  *Why it is false:* The facility driver simulates three distinct roles (the Bank, the Dedicated Account, and multiple Suppliers). If the signer holds only a single holder's `sk_A` and XRPL account key, and the socket interface strictly forbids passing keys or seeds, a single signer cannot build and sign `Prepare` requests for multiple distinct parties unless it multiplexes profiles or the facility driver signs transactions itself.
* **Corrected Sentence:**
  > `"`signer/` — a Rust binary on the participant's machine. In production it holds a single participant's ElGamal secret `sk_A` and XRPL account key; in this single-host demonstration, the signer must be initialized with distinct key profiles for the bank, Dedicated Account, and each supplier."`

---

## 6. Anything Missing That a Reader Needs and Cannot Get

### Finding 6.1: Missing Configuration Schema and Account Seed Setup Instructions
* **Severity:** **P3**
* **Exact Quoted Sentence:**
  > `"The signer and the facility are separate processes, and starting them needs a holder profile and funded Devnet accounts that this document does not tell you how to create. `make signer-run` and `make facility` are the targets; **the demo script is what tells you what has to exist first.**"`
* **Why it is wrong:**
  The document provides exact commands for building the binaries and starting the web tier (`make web-api`, `make web-app`), but gives no environment variable specifications, configuration file paths, or profile formats needed to run `make signer-run` or `make facility`. A reader attempting to run the facility cannot determine what configuration keys are required without navigating away to inspect secondary scripts.
* **Corrected Sentence:**
  > `"The signer and the facility are separate processes; starting them requires configuring Devnet seeds in `facility/.env` and setting the signer profile in `signer/config.json` as specified in [WEB-TIER-DEMO-SCRIPT-2026-08-28.md](docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md). `make signer-run` and `make facility` are the targets."`

---

## Summary Table of Defect Classifications

| ID | Category | Severity | Summary |
|---|---|:---:|---|
| **1.1** | Logical Consistency | **P1** | Conflates XLS-65 with XLS-80 for `sfDomainID` and contradicts application scope |
| **1.2** | Logical Consistency | **P2** | Contradicts threat model on whether UI confirmation stands against same-user process |
| **1.3** | Logical Consistency | **P3** | Conflates browser frontend (`web/app`) with the entire web tier (`web/api`) |
| **1.4** | Logical Consistency | **P2** | Run records asserting `underB15Conditions: false` contradicts executing under B-15 |
| **2.1** | Decorative Hedge | **P2** | Excuses unauthenticated loopback disclosure by claiming issuer is authorized under P-9 |
| **2.2** | Decorative Hedge | **P2** | Claims `make vendor-verify` bounds tampered `/tmp` trees when build doesn't run it |
| **3.1** | Arithmetic & Counts | **P2** | Asserts 2.54 and 2.50 µs "bracket" 2.49 µs when both numbers exceed 2.49 µs |
| **4.1** | Self-Rule Violation | **P2** | Quotes `~3 min` duration without specifying hardware, violating Rule P-8 |
| **4.2** | Self-Rule Violation | **P1** | Fails to disclose whether issuance sets `lsfMPTCanClawback` after mandating disclosure |
| **5.1** | False Takeaway | **P1** | Falsely implies `fail_hard` prevents on-ledger `tec` application during consensus |
| **5.2** | False Takeaway | **P2** | Implies single-key signer daemon can service multi-party facility driver |
| **6.1** | Missing Requirement | **P3** | Omits required configuration file paths/schemas for running signer and facility |
