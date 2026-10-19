# REVIEW-022 Adversarial Review: Architecture §6 Step 7 (The Facility)

**Round one. Date: 2026-08-25. Scope: Devnet-only research artifact.**

---

### 1. Ledger Read Isolation (Loopback Enforcement)

**Findings: NONE.**

All ledger read paths within `facility/` strictly enforce loopback resolution:
- [facility/src/loopback.ts](file:///facility/src/loopback.ts#L182-L200): `LoopbackLedger.open()` requires `isLoopbackEndpoint()` before attempting any HTTP connection, rejecting remote hosts pre-flight.
- [facility/src/loopback.ts](file:///facility/src/loopback.ts#L88-L135): `Snapshot.pinned()` enforces ledger sequence continuity against the pinned index, preventing torn multi-ledger reads (E-103).
- [facility/src/signer.ts](file:///facility/src/signer.ts#L173-L188): `assertLoopbackProfile()` verifies the profile endpoint passed to the signer child process.
- [facility/src/devnet-accounts.ts](file:///facility/src/devnet-accounts.ts#L36-L53): While the faucet endpoint `https://faucet.devnet.rippletest.net/accounts` is remote (as documented in exemption), account funding confirmation is performed exclusively via `ledger.snapshot().sequenceOf()`, querying the loopback node.

---

### 2. `fail_hard` Submission Gate

**Findings: NONE.**

- [facility/src/submit.ts](file:///facility/src/submit.ts#L44-L55): `FailHardSubmitter.submitBlob()` hardcodes `fail_hard: true` in the `submit` RPC payload. There is no parameter or configuration allowing its omission.
- [facility/src/submit.ts](file:///facility/src/submit.ts#L57-L91): `signAndSubmit()` and `submitValidated()` route exclusively through `submitBlob()`.
- [facility/src/facility.ts](file:///facility/src/facility.ts#L298-L302): `Facility.buildPlaintext()` delegates signing and submission exclusively to `this.submitter.signAndSubmit()`.
- [facility/tests/submit.test.ts](file:///facility/tests/submit.test.ts#L85-L101): Prototype method pinning prevents addition of unflagged submission paths unnoticed.

---

### 3. `isLoopbackEndpoint` Host Parsing

**Findings: NONE.**

- [facility/src/loopback.ts](file:///facility/src/loopback.ts#L55-L73): Host parsing is delegated to the WHATWG `URL` parser (`url.hostname`), which canonicalizes octal, hexadecimal, integer (`2130706433`), and compressed IPv6 formats, while stripping userinfo (`user@host`).
- Dotted-decimal parsing explicitly requires 4 numeric octets (`\d{1,3}`) with each octet $\le 255$ and the first octet strictly equal to `127` (`127.0.0.0/8`).
- IPv6 loopback is matched strictly against `[::1]`. Alternative formats such as IPv4-mapped IPv6 `[::ffff:127.0.0.1]` fail the regex and bracket checks, failing closed. Trailing dots (`127.0.0.1.`) fail the quad regex.

---

### 4. `tools/check-loopback.ts` Claims and Gate Logic

#### Finding 4.1: Phantom Prose Exemption Claim in Scanner Comments
* **Severity:** MEDIUM
* **File & Lines:** [tools/check-loopback.ts:147-150](file:///tools/check-loopback.ts#L147-L150)
* **Code / Text:**
  ```typescript
  // A documentation URL is not an endpoint this code connects to. Only
  // `rippletest.net` and bare IPs are treated as reachable ledger hosts;
  // anything else in prose (a spec link, a repository URL) is not.
  findings.push({ file: rel, line, literal });
  ```
* **Why it is wrong:** The comment claims that documentation URLs (such as spec links or GitHub repository URLs) are filtered out and only `rippletest.net` or bare IPs are treated as candidate findings. In the code immediately following the comment, there is no filter condition—`findings.push` is executed unconditionally for every non-loopback URL matched. If documentation URLs (e.g. `https://github.com/...`) were placed in a `.ts` file under `facility/`, the gate would fail on an unrecorded endpoint. The comment describes filtering behaviour the code does not implement (a recurrence of the documentation-code divergence pattern identified in E-141).
* **Falsification:** Adding `const DOC = "https://github.com/xrplf/rippled";` inside any `.ts` file under `facility/` causes `bun tools/check-loopback.ts` to exit with status 1 and report an unrecorded endpoint finding.

---

### 5. Balance Book Arithmetic and Reconciliation

**Findings: NONE.**

- [facility/src/book.ts](file:///facility/src/book.ts#L130-L162): `record()` maintains the dual-balance structure required by XLS-0096:
  - `convert`: increments `spending`.
  - `send-out`: decrements `spending`.
  - `send-in`: increments `inbox` (does not increment spendable balance).
  - `merge`: transfers `inbox` into `spending` and zeros `inbox`.
  - `convert-back`: decrements `spending`.
  - Underflow protection halts on any negative balance.
- [facility/src/facility.ts](file:///facility/src/facility.ts#L306-L390): Movement records are added to `FacilityBook` only **after** the corresponding transaction has been submitted, applied with `tesSUCCESS`, and validated on a closed ledger. Failed submissions or unapplied `tec` discards record no movement.

---

### 6. Accuracy of Comments, README, and Output Messages

#### Finding 6.1: Inverted Status Indication in `run-facility.ts` §1 Control Arm Output
* **Severity:** LOW
* **File & Lines:** [facility/run-facility.ts:136-146](file:///facility/run-facility.ts#L136-L146)
* **Code / Text:**
  ```typescript
  console.log(
    found
      ? `\n  ⚠ Applied — which is F-23's mechanism exactly: a tec is written to the ledger\n` +
          `    WITH ITS CIPHERTEXTS unless the submitter set the flag...`
      : `\n  ✓ Discarded. The unflagged arm was the one that could apply it, and it did not\n` +
          `    reach a validated ledger.`,
  );
  ```
* **Why it is wrong:** In §1, the script executes a dual-arm control test to demonstrate that `tapFailHard` prevents a `tec` transaction from being applied to the validated ledger while an unflagged submission allows it to be recorded. If `found` is `false`, Arm B (the unflagged arm) failed to reach the ledger, meaning the control failed to demonstrate the difference between flagged and unflagged execution. However, the output marks this failure with `✓ Discarded` (a success mark), while marking the successful demonstration of Arm B landing on the ledger with a warning `⚠ Applied`.
* **Falsification:** If the unflagged transaction times out or fails to reach the ledger in a test run, `found` evaluates to `false`, and the script prints `✓ Discarded` without aborting, reporting a failed control run as a clean success.

---

### 7. Test Suite Falsification Rigor

#### Finding 7.1: Incomplete Error-Domain Assertion in Boundary Control Test
* **Severity:** LOW
* **File & Lines:** [facility/tests/facility.test.ts:182-192](file:///facility/tests/facility.test.ts#L182-L192)
* **Code / Text:**
  ```typescript
  const boundary = await f.facility.drawdown(supplier, 100).catch((e) => e);
  expect(String(boundary)).not.toContain("REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE");
  ```
* **Why it is wrong:** The test asserts that a drawdown equal to the tracked balance (`100`) does not fail with `REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE`. In the mock test environment (`facilityWith({})`), there is no running `wconf-signer` socket. Consequently, `drawdown(100)` rejects immediately when attempting `SignerSession.start()`. While this satisfies `.not.toContain("REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE")`, it passes because the signer spawn fails, not because the preflight balance validation succeeded and handed off cleanly.
* **Falsification:** Introducing a bug in `confidentialTransfer` that throws a generic error (e.g. `throw new Error("unconditional drawdown error")`) will cause both the `drawdown(101)` assertion and the `drawdown(100)` control assertion to pass.

---

### 8. Confidential Amount Exposure

**Findings: NONE.**

- Plaintext amounts appear only on operations where the XLS-0096 protocol mandates cleartext representation (`MPTokenIssuanceCreate`, `MPTokenIssuanceSet`, `Payment`, `ConfidentialMPTConvert`, `ConfidentialMPTConvertBack`).
- Confidential transfers (`ConfidentialMPTSend`) are built, blinded, and proved exclusively in `signer/`. No plaintext amount or blinding factor is exposed in `Facility` transaction payloads.
- Observer output in [facility/run-facility.ts:321-326](file:///facility/run-facility.ts#L321-L326) masks confidential transaction values (`?`).
- Disk-backed plaintext balances in `facility-book.json` are explicitly documented as off-ledger tracking records for Devnet test harnesses.

[exited with code 0]
