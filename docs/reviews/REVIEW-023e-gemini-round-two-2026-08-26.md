# REVIEW-023e — Gemini leg, ROUND TWO: the fixes

**Date 2026-08-26.** Packet only — **no shell, no repository access**. Every file
under review was inlined in `REVIEW-023d` §6 in full, and the run record and the
relevant `CLAIMS.md` rows in §7. Run with `agy --effort high -p` from an empty
directory outside the repository, with an explicit *"do not use any tools"*
preamble.

**Six findings: 1 HIGH, 3 MEDIUM, 2 LOW.** Adjudicated in `REVIEW-023g`.

⚠ **What this leg could not see, and it matters for reading it.** The packet
contained the eight code files and nine `CLAIMS.md` rows — **not** the
architecture document, the walkthrough, `CLAUDE.md`, the personas or the
`Makefile`. Three of round two's findings live in exactly those files. That is
`REVIEW-021c`'s lesson arriving again: **a self-contained packet bounds what a
leg can find to what the packet chose to show, and the packet's choices are the
adjudicator's blind spots.** It found the register defects it was given the
register for, and it found them well.

---

### Files Reviewed

Every file provided in the review packet was read in full:
- `facility/src/loopback.ts` (§6.1)
- `facility/src/submit.ts` (§6.2)
- `facility/run-facility.ts` (§6.3)
- `facility/tests/risk-acceptance.test.ts` (§6.4)
- `facility/src/facility.ts` (§6.5)
- `facility/src/book.ts` (§6.6)
- `facility/tests/facility.test.ts` (§6.7)
- `tools/check-loopback.ts` (§6.8)
- Saved run record and balance book (§7.1)
- `CLAIMS.md` rows F-28 (§7.2), E-146, E-148, E-149, E-151, E-152, B-18, F-24, F-25, F-27, F-23 (§7.3)

---

### Q1. Did any fix introduce a defect?

#### (a) `underB15Conditions` getter and unflagged-submission counter

1. **What value the run record can now carry:**
   For any complete run executed by `run-facility.ts`, `underB15Conditions` in the saved run record is **always `false`**.
   - `failHardControl()` is called unconditionally on every run.
   - Arm B calls `ledger.call("submit", { tx_blob: blob })` without `fail_hard: true`.
   - `LoopbackLedger.call` increments `this.unflagged` to `1`.
   - When `underB15Conditions` is evaluated at the end of the run during `state.runs.push(...)`, `this.unflagged === 0` is `false`.
   - **What it discriminates:** The boolean stamp `underB15Conditions` itself no longer discriminates between a remote run and a loopback run when driven by `run-facility.ts`—it is `false` on both. The discrimination is offloaded entirely to `b15Note` (which branches on `!this.identity.isLoopback` vs `this.unflagged > 0`).

2. **`run-facility.ts` §0 console output vs §8 record on a loopback run:**
   - At §0, `const b15AtStart = ledger.underB15Conditions; const b15 = b15AtStart;` captures `true` before `failHardControl()` runs. §0 prints:
     `B-15 step-7   conditions MET — loopback`
   - At §8, `state.runs.push` evaluates `ledger.underB15Conditions` after `failHardControl()`, recording `underB15Conditions: false`.
   - Furthermore, §8 evaluates `if (!b15)` using the stale constant `b15` (which remains `true`), so §8 suppresses the warning `AND THIS RUN WAS NOT UNDER B-15's STEP-7 CONDITIONS`, while simultaneously persisting `underB15Conditions: false` and `b15Note: "loopback, but 1 submission(s) went out without tapFailHard..."` to disk.
   - **Defect:** `run-facility.ts` line 125 claims in its comment:
     `// ⚠ Read at the point of PRINTING, and again at the point of RECORDING. It is a getter now, not a field...`
     Yet lines 126–127 freeze `const b15 = b15AtStart;` and reuse `b15` at line 538 and line 568. The script claims the answer changes during the run, but its own downstream console branching is hardcoded to the start-of-run snapshot.

3. **Submissions missed by `method === "submit" && params.fail_hard !== true`:**
   - **`submit_multisigned`**: rippled supports `submit_multisigned` as a top-level submission RPC. It accepts `fail_hard` but is completely bypassed by the `method === "submit"` check.
   - **Signer direct RPCs**: The signer daemon (`signer/`) is a child process communicating over its own HTTP client directly with `cfg.ledgerEndpoint`. None of the signer's requests pass through `LoopbackLedger.call`.
   - **Multiple Ledger instances**: If a caller instantiates more than one `LoopbackLedger`, the unflagged counter is not shared.

4. **Truth of sentences produced by `b15Note` branches:**
   - **Branch 1 (`!this.identity.isLoopback`)**: True, though if an unflagged submission also occurred on a remote endpoint, it only reports the remote status.
   - **Branch 2 (`this.unflagged > 0`)**: Over-specific. It states: `the fail-hard control's own second arm does this deliberately`. If an unflagged submission occurred due to any other caller or bug, the note would still assert it was caused by the fail-hard control's second arm.
   - **Branch 3 (default)**: True when loopback and 0 unflagged submissions.

#### Finding 1: `run-facility.ts` console branches on stale start-of-run B-15 status while disk record saves the getter
- **Defect:** `run-facility.ts` caches `underB15Conditions` into `const b15` at startup and uses it for §8 console output instead of evaluating the getter, resulting in console output claiming B-15 conditions met while the run record saved in the same block records `underB15Conditions: false`.
- **File & Sentence:** `facility/run-facility.ts`
  > `const b15AtStart = ledger.underB15Conditions;`
  > `const b15 = b15AtStart;`
  and §8:
  > `if (!b15) {`
- **Why it is wrong:** The fix made `underB15Conditions` a dynamic getter specifically because `failHardControl()` flips it during the run. Caching it in `b15` causes §8 to branch on the pre-control value.
- **What concretely breaks:** On a loopback run, §8 prints loopback observer guidance and omits the non-compliance warning, while saving `underB15Conditions: false` to `facility-state.json`.
- **Severity:** MEDIUM
- **Falsification:** Run `run-facility.ts` against a loopback node and observe that terminal output at §8 disagrees with `state.runs[0].underB15Conditions`.
- **Remedy:** Re-evaluate `ledger.underB15Conditions` at §8 or use `ledger.underB15Conditions` directly instead of the stale `b15` constant.

---

#### (b) `convertFloat` returning `Movement[]`

1. **Run record and book recording:**
   - `convertFloat` returns `[m, merged]`.
   - `run-facility.ts` calls `note(await facility.convertFloat(FLOAT))`, which flattens the array and pushes both movements to `movements`.
   - `mergeInbox` calls `this.book.record({ kind: "merge", account: p.address, amount: merged, hash })`.
   - The book already recorded `convert` and `merge` before this fix (see §7.1 book entries 1 and 2). It does not double-record; the fix only brought the run record's in-memory movement log into alignment with what the book and ledger already did.
2. **Caller handling and §8 partitioning:**
   - In `run-facility.ts`, `note()` accepts `Movement | Movement[]` using `[m].flat()`.
   - In §8, the merge movement from `convertFloat` has `amountIsPublic: false` and `amount: 5000` (`> 0`), so it is correctly categorized into `hiddenMovements`.
   - No unit test in `facility.test.ts` calls `convertFloat`.
   - **No finding on (b).**

---

#### (c) `http://localhost:<port>` test and `check-loopback.ts` exemption

1. **Gate normalisation and remote literals:**
   - `normaliseTemplate` converts `http://localhost:${server.port}` to `http://localhost:1`.
   - Any template substitution in the host (e.g. `http://${host}:5005` or `http://127.${host}:5005`) replaces the host with `HOST SUBSTITUTION`, which fails `isLoopbackEndpoint` and fails the check unless explicitly exempted.
   - Genuine remote literals (e.g. `https://s.devnet.rippletest.net:51234/`) normalize their port to `1` but retain their non-loopback host, failing `isLoopbackEndpoint` and raising an unrecorded finding.
   - It does not let arbitrary remote literals through.
2. **Exemption reason:**
   - The reason accurately describes why `http://localhost:1` is present.
3. **Machine confinement:**
   - The test relies on OS-level name resolution mapping `localhost` to `127.0.0.1`. If an environment resolved `localhost` to a non-loopback IP, requests would exit the host. However, under standard operating system configuration, requests remain on loopback.
   - **No finding on (c).**

---

### Q2. Does any test written for a round-one finding pass for the WRONG reason?

1. **Stderr-capture test (`facility/tests/risk-acceptance.test.ts`):**
   - The monkey-patch intercepts `process.stderr.write`.
   - If `LoopbackLedger.open()` emitted nothing to stderr, `written` would be empty (`""`).
   - The assertions `expect(emitted).toContain("NOT UNDER B-15's STEP-7 CONDITIONS")` and `expect(emitted).toContain(remoteClassified)` would both fail.
   - Nothing else writes to stderr during this synchronous in-memory execution block. The test would fail for the right reason if disclosure output were missing.

2. **Unflagged submission test (`facility/tests/risk-acceptance.test.ts`):**
   - The test asserts `true`, calls `call("submit", { fail_hard: true })`, asserts `true`, calls `call("submit", {})`, and asserts `false`.
   - If `LoopbackLedger.call` had a bug that incremented `unflagged` on *all* `submit` calls regardless of `params.fail_hard`, the middle assertion would immediately fail.
   - The middle assertion is load-bearing.

3. **§10.5 disclosure test (`facility/tests/risk-acceptance.test.ts`):**
   - The test splits `REMOTE_LEDGER_DISCLOSURE` on `\n\n`, isolates the paragraph containing `"CAN establish"`, and checks:
     `expect(canEstablish).not.toContain("§10.5");`
     `expect(REMOTE_LEDGER_DISCLOSURE).toContain("does NOT establish XLS-0096 §10.5");`
   - **Brittle check:** If someone re-introduced the false claim by writing:
     *"What a run under this hatch CAN establish: that transactions serialise, and all state transitions specified in section ten point five of XLS-0096"*
     the test would still pass because it only checks for the absence of the literal substring `"§10.5"`.
   - However, within the context of pinning the specific phrase removed in Round One, it does pin the paragraph structure.

---

### Q3. Is any sentence written ABOUT a fix false?

#### Finding 2: Protocol field misnomer in `CLAIMS.md` F-28
- **Defect:** `CLAIMS.md` F-28 states that the facility reads the issuer's `HolderEncryptionKey`, but on XRPL/XLS-0096 an issuer holds an `IssuerEncryptionKey` (or `sfIssuerEncryptionKey`), not a `HolderEncryptionKey`.
- **File & Sentence:** `CLAIMS.md` F-28 (§7.2)
  > `The facility reads the destination's and the issuer's HolderEncryptionKey from an endpoint, builds a ConfidentialMPTSend encrypted to whatever it read, and then submits the signed blob to that same endpoint.`
- **Why it is wrong:** `HolderEncryptionKey` is registered on an individual holder's `MPToken` object (by a holder upon `Convert`). The issuer's key is `IssuerEncryptionKey` set on the `MPTokenIssuance` object via `MPTokenIssuanceSet`.
- **What concretely breaks:** A reader verifying the ledger model against rippled source or XLS-0096 specification is given an incorrect ledger field name for the issuer.
- **Severity:** LOW
- **Falsification:** Check rippled `MPTokenIssuance` schema / `facility/src/loopback.ts` `IssuanceState` interface (`issuerEncryptionKey?: string`).
- **Remedy:** Amend the sentence to: *"The facility reads the destination's `HolderEncryptionKey` and the issuer's `IssuerEncryptionKey` from an endpoint..."*

---

#### Finding 3: False assertion that `LoopbackLedger` is the only place that sees every RPC
- **Defect:** `facility/src/loopback.ts` asserts that `LoopbackLedger` is "the only place that sees every RPC", which is false because the signer daemon issues RPC requests directly to the ledger endpoint.
- **File & Sentence:** `facility/src/loopback.ts` (§6.1, comment above `unflagged`)
  > `⚠ Counted here because this is the only place that sees every RPC.`
- **Why it is wrong:** `signer/` (`SignerSession`) connects directly to `ledgerEndpoint` from its own process over its internal HTTP client. Those RPCs do not pass through `LoopbackLedger`. Additionally, `LoopbackLedger.probe()` makes RPC calls via `rawCall()`, bypassing `LoopbackLedger.call()`.
- **What concretely breaks:** Gives a false guarantee that all RPC traffic across the facility and signer is monitored by `LoopbackLedger`.
- **Severity:** MEDIUM
- **Falsification:** Trace `SignerSession.prepare()` in `signer/` or check `rawCall` in `LoopbackLedger.probe`.
- **Remedy:** Rephrase comment to state that it is the only place in the facility driver that routes application-level submissions.

---

### Q4. Is C-6's sweep COMPLETE?

#### Finding 4: Incomplete contradiction sweep in `CLAIMS.md` E-146 (live denial of execution remains)
- **Defect:** `CLAIMS.md` E-146 still contains an un-struck sentence explicitly claiming that no facility transaction has been submitted to any ledger.
- **File & Sentence:** `CLAIMS.md` E-146 (§7.3)
  > `⚠ NOT EXECUTED means no facility transaction has been submitted to any ledger, and every capability sentence about it is therefore about code and tests, not about rippled's answer — see B-18`
- **Why it is wrong:** While an earlier occurrence in E-146 was struck (`~~and it is NOT EXECUTED~~ — struck 2026-08-25`), this second sentence was missed and remains in the active text of E-146, directly contradicting the row's header ("Architecture §6 step 7 is BUILT AND EXECUTED") and the executed run on 2026-08-25.
- **What concretely breaks:** A permanent register row in `CLAIMS.md` contradicts itself and denies the execution that took place.
- **Severity:** HIGH
- **Falsification:** Read line 198 of `CLAIMS.md` reproduced in §7.3.
- **Remedy:** Strike or delete the sentence from `CLAIMS.md` E-146.

---

#### Finding 5: Incomplete fix for C-7 in `CLAIMS.md` F-27 (fabricated absolutes retained in register)
- **Defect:** Round-one finding C-7 ruled that F-27 contained two fabricated absolutes ("No unit test could have caught it" and "the first Devnet transaction refused to reconcile"). While `book.ts` was amended, `CLAIMS.md` F-27 was left unmodified and still contains both absolutes.
- **File & Sentence:** `CLAIMS.md` F-27 (§7.3)
  > `⚠ No unit test could have caught it and none did: the suite asserts this project's model of the protocol against itself, and only the ledger says what the protocol does.`
  and
  > `and the FIRST Devnet run refused to reconcile: expected 5000, ledger said 0`
- **Why it is wrong:** The C-7 fix in `book.ts` correctly acknowledged: *"The then-existing tests could not have caught this... A unit test absolutely CAN encode the rule once the ledger has established it"*. Leaving the absolute in `CLAIMS.md` F-27 leaves the exact defect Round One caught standing in the permanent register.
- **What concretely breaks:** `CLAIMS.md` F-27 perpetuates a known false absolute that was adjudicated as defective in `REVIEW-023c`.
- **Severity:** MEDIUM
- **Falsification:** Read line 265 of `CLAIMS.md` reproduced in §7.3.
- **Remedy:** Update `CLAIMS.md` F-27's evidence column to match the corrected wording in `book.ts`.

---

### Q5. Are the numbers right, and does each say what it counts?

1. **Derivation of counts:**
   - **28 facility movements / transactions:**
     - 4 Authorize (`dedicated`, `supplier-A`, `supplier-B`, `supplier-C`)
     - 4 Plaintext Payments (`dedicated` float 5000, 3 supplier enrolment payments of 10)
     - 4 Converts (`dedicated` float 5000, 3 supplier enrolment converts of 10)
     - 9 MergeInbox (1 `dedicated` float merge, 3 supplier enrolment merges, 3 supplier drawdown merges, 2 `dedicated` repayment merges)
     - 5 ConfidentialMPTSend (3 drawdowns, 2 repayments)
     - 2 ConvertBack (retirement tranches 1000 and 2000)
     - **Total = 4 + 4 + 4 + 9 + 5 + 2 = 28.**
   - **31 program-submitted validated transactions:**
     - 28 facility transactions + 2 bank issuance setup transactions (`MPTokenIssuanceCreate`, `MPTokenIssuanceSet`) + 1 fail-hard control arm B unflagged `Payment` applied to the ledger.
     - **Total = 28 + 2 + 1 = 31.**
   - **9 merges:**
     - Exactly 9 `ConfidentialMPTMergeInbox` transactions as derived above.

2. **Validation status of the 28th transaction:**
   - The dedicated account's post-conversion merge (`3F264EB84BD3804C…`) was executed via `submitValidated`, which required `tesSUCCESS` in validated metadata. It was recorded in `facility-book.json` at run time; only the in-memory array returned by `convertFloat` dropped it. It is defensible as validated.

3. **Exclusion of Arm A and Faucet:**
   - Arm A (`tapFailHard: true`) returned `applied: false`, sequence did not advance, and it was absent from subsequent ledgers. It was never a validated transaction.
   - Faucet fundings are HTTP API calls to the faucet service, not signed transactions submitted to the ledger.
   - `CLAIMS.md` B-18 states what the counts include.

4. **Saved run record on disk:**
   - The record on disk reflects the pre-fix state (27 movements). `CLAIMS.md` B-18 explicitly notes why the disk record contains 27 while the actual validated execution count was 28.
   - **No finding on Q5.**

---

### Q6. Free Hunt — on the fixes only

#### Finding 6: Stale test count in `CLAIMS.md` E-146
- **Defect:** `CLAIMS.md` E-146 states the test count is "63 tests (`bun test facility tools`)", but the suite has 79 tests following the addition of the Round One fix test suites.
- **File & Sentence:** `CLAIMS.md` E-146 (§7.3)
  > `63 tests (bun test facility tools), a real type-check...`
- **Why it is wrong:** Round One fixes added new tests in `risk-acceptance.test.ts` and `facility.test.ts`, raising the total test count to 79 (as recorded in §5).
- **What concretely breaks:** Inaccurate test suite metrics in the claims register.
- **Severity:** LOW
- **Falsification:** Compare `E-146` ("63 tests") with §5 ("79 TypeScript tests").
- **Remedy:** Update test count in `E-146` from 63 to 79.

---

### Summary of Findings

| Finding | File | Severity | Summary |
|---|---|---|---|
| **1** | `facility/run-facility.ts` | MEDIUM | Console output caches B-15 status at start and contradicts the run record saved at §8 |
| **2** | `CLAIMS.md` F-28 | LOW | References issuer's `HolderEncryptionKey` instead of `IssuerEncryptionKey` |
| **3** | `facility/src/loopback.ts` | MEDIUM | Comment claims `LoopbackLedger` sees every RPC, ignoring signer daemon and `rawCall` |
| **4** | `CLAIMS.md` E-146 | HIGH | Incomplete contradiction sweep leaves live sentence denying execution |
| **5** | `CLAIMS.md` F-27 | MEDIUM | Incomplete C-7 fix leaves two fabricated absolutes standing in the register |
| **6** | `CLAIMS.md` E-146 | LOW | Stale test count (63 vs 79) |
