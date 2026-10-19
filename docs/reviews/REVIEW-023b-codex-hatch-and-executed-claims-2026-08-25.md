# REVIEW-023b — Codex leg: the accepted-risk hatch, the post-execution fixes, and the executed claims

**Date 2026-08-25.** Packet plus **read-only repository access**, against a
**frozen** tree at `d17b8ee` — pushed before the leg started and not touched
while it ran, which is `REVIEW-022g` §6 item 2 applied.

⚠ **The leg could not reach the chain** (outbound DNS blocked in its sandbox)
and **said so** rather than claiming verification it did not have. Four numbers
therefore rest on the saved run record and on this session's own queries: the
`Sequence` pair, the live outstanding amount, the four on-ledger keys, and the
observer count of 14.

**Seven findings: 2 HIGH, 4 MEDIUM, 1 LOW. All seven upheld.** Adjudicated in
`REVIEW-023c`.

---

# REVIEW-023 — round-one adversarial report

Reviewed frozen `d17b8ee9179f63c64d69f3b5d535389ecf8007ee` against `11e568e`, REVIEW-022c/g, source, tests, commit messages, and the saved facility state/book.

I found **2 HIGH, 4 MEDIUM, and 1 LOW** findings. No CRITICAL finding.

## Findings

### 1. HIGH — the run did not execute or establish the claimed F-23 mitigation

**Exact claims**

- [CLAIMS.md:207]($REPO/CLAIMS.md:207), E-149: “**That is exactly the F-23 consequence removed**.”
- [CLAIMS.md:209]($REPO/CLAIMS.md:209), E-151: “`tapFailHard` … **removes the consequence of a wrong read**.”
- [submit.ts:29]($REPO/facility/src/submit.ts:29): “That is exactly the F-23 consequence removed.”
- [run-facility.ts:241]($REPO/facility/run-facility.ts:241): “That is F-23’s mechanism…”
- `d17b8ee` commit message: “`tapFailHard` — the half that removes the CONSEQUENCE of a wrong read — was in force.”

**Why wrong**

The executed control was an ordinary plaintext `Payment` to an unauthorized destination, designed to produce `tecNO_AUTH` ([run-facility.ts:169]($REPO/facility/run-facility.ts:169)). It was not an F-23 transaction:

- no substituted `HolderEncryptionKey`;
- no `ConfidentialMPTSend`;
- no `tecBAD_PROOF`;
- no attacker-key ciphertext;
- no attempt to recover an amount.

It establishes that `tapFailHard` changed the treatment of this particular `tecNO_AUTH`. The source reading may support the broader “all `tec`” inference, but the run does not execute the F-23 confidentiality case.

There is a second boundary the wording omits: under the accepted-risk configuration, the same remote endpoint used as the ledger source receives the signed `tx_blob` during submission ([submit.ts:73]($REPO/facility/src/submit.ts:73)). If that source is the F-23 liar, it receives the ciphertext encrypted under its key before `tapFailHard` can prevent ledger application or relay. The flag prevents on-chain publication; it does not prevent disclosure to the submitting node.

**What would falsify this finding**

Evidence that the executed arm was a substituted-key `ConfidentialMPTSend` yielding `tecBAD_PROOF`, with an adversarial ledger source unable to obtain either the blob or the amount. The frozen source instead proves it was a plaintext `Payment`.

---

### 2. HIGH — a run can be stamped `underB15Conditions: true` despite a submission without `tapFailHard`

**Exact locations**

- [loopback.ts:285]($REPO/facility/src/loopback.ts:285): `identity.underB15Conditions = loopback`
- [run-facility.ts:224]($REPO/facility/run-facility.ts:224): raw `submit` without `fail_hard`
- [run-facility.ts:543]($REPO/facility/run-facility.ts:543): the endpoint-only value is written to the run record
- [run-facility.ts:545]($REPO/facility/run-facility.ts:545): “loopback: **both halves** of B-15’s step-7 answer in force”
- [CLAIMS.md:209]($REPO/CLAIMS.md:209): “`tapFailHard` is set on **every submission**”
- [facility walkthrough:245]($REPO/docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md:245): “`tapFailHard` was in force on **every submission**”

**Why wrong**

The stamp measures only whether the facility endpoint is a loopback literal. It never measures B-15’s second half.

Every invocation of `run-facility.ts` executes the unflagged control submission before writing the stamp. Therefore, a future loopback run will be recorded as satisfying “both halves” even though that same run submitted once without the flag. The exception is deliberate and disclosed elsewhere, but B-15 says “whatever submits”; it contains no control-arm exception.

The actual remote run was correctly stamped `false`, but the `true` branch is unsound.

**What would falsify this finding**

A ruling text expressly excluding the control transaction from “whatever submits,” or evidence that the unflagged call cannot execute before a `true` record is written. The current source shows the opposite.

---

### 3. MEDIUM — the hatch’s claimed four-state test coverage does not execute the accepted remote state

**Exact sentences**

- [risk-acceptance.test.ts:79]($REPO/facility/tests/risk-acceptance.test.ts:79): test named “set exactly: **it opens, and the connection is STAMPED as not under B-15**”
- [risk-acceptance.test.ts:82]($REPO/facility/tests/risk-acceptance.test.ts:82): “The fake node is on loopback, so this drives the stamp rather than the hatch.”
- [risk-acceptance.test.ts:83]($REPO/facility/tests/risk-acceptance.test.ts:83): “**The hatch itself is driven by the two tests above**”
- [risk-acceptance.test.ts:88]($REPO/facility/tests/risk-acceptance.test.ts:88): actually asserts `underB15Conditions === true`
- [CLAIMS.md:209]($REPO/CLAIMS.md:209) and [decision request:8]($REPO/docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md:8): claim all four states are driven.

**Why wrong**

The “set exactly” test connects to `127.0.0.1`, which bypasses `assertRemoteRiskAccepted` entirely. Its name promises the accepted remote outcome while its assertions prove the opposite stamp.

The two preceding tests drive only the unset and wrong-phrase refusal branches; both stop before connecting. Thus no test executes:

- exact phrase → remote-classified connection;
- `underB15Conditions === false`;
- disclosure actually written to stderr;
- signer accepted-remote path.

The explanatory sentence at line 83 is itself false. A local fake node could be reached through `http://localhost:<port>`: TypeScript deliberately classifies `localhost` as non-loopback while it still resolves to the local test server.

The static disclosure tests also assert selected substrings in the constant, not that `open()` emits it.

**What would falsify this finding**

A test that reaches a locally hosted but remote-classified endpoint with the exact phrase, asserts a successful open, asserts the false stamp, captures stderr, and exercises the signer counterpart. None exists.

---

### 4. MEDIUM — the mandatory remote-risk disclosure claims §10.5 evidence the driver explicitly does not collect

**Exact sentence**

[loopback.ts:107]($REPO/facility/src/loopback.ts:107):

> “What a run under this hatch CAN establish … that XLS-0096 §10.5’s state changes hold…”

**Why wrong**

The driver’s own current header says it does not meet that standard:

- [run-facility.ts:34]($REPO/facility/run-facility.ts:34): “does NOT yet keep E-131’s full standard”
- [run-facility.ts:42]($REPO/facility/run-facility.ts:42): “There are no per-movement assertions over the public amount or the balance version.”
- [CLAIMS.md:218]($REPO/CLAIMS.md:218), B-18, admits the same gap.

The wording test conspicuously omits the disclosure’s “CAN establish” paragraph, so it pins surrounding warnings while leaving the false capability sentence unfalsified.

**What would falsify this finding**

Per-movement before/after assertions covering all four §10.5 state changes, or evidence that the sentence is explicitly scoped to a different driver. Neither is present.

---

### 5. MEDIUM — “27 validated transactions” is an incomplete movement-list length, not the run’s transaction count

**Exact claims**

“27 validated transactions” appears in [README:10]($REPO/facility/README.md:10), [CLAIMS.md B-18:218]($REPO/CLAIMS.md:218), [architecture:215]($REPO/docs/architecture/ARCHITECTURE-2026-08-18.md:215), [walkthrough:245]($REPO/docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md:245), [CLAUDE.md:27]($REPO/CLAUDE.md:27), and the `d17b8ee` subject.

The commit body also says “**seven merges**.”

**Why wrong**

The saved run record contains 27 movement entries, but it omits the Dedicated Account’s post-conversion `MergeInbox`:

- [facility.ts:365]($REPO/facility/src/facility.ts:365) awaits the merge but discards its returned `Movement`.
- [facility.ts:367]($REPO/facility/src/facility.ts:367) returns only the Convert.
- [run-facility.ts:396]($REPO/facility/run-facility.ts:396) therefore records only that returned Convert.
- The book contains the omitted validated merge, hash `3F264EB84BD3804C23BD39756B145EDA577E0942E6F057023A010707ED1AD12C`, at [facility-book.json:33]($HOME/.wconf/facility-book.json:33).

There were nine merges: one after the float conversion, three supplier-enrolment merges, three drawdown merges, and two repayment merges. The run record contains eight; the commit says seven.

Even under the narrow “facility workflow” interpretation there were **28**, not 27, validated transactions. Adding issuance create/set and the validated unflagged control yields **31 program-submitted validated transactions**, excluding faucet funding.

**What would falsify this finding**

Evidence that the omitted merge hash never validated, or an explicit definition of “27” as “the incomplete `runs[0].movements` array.” `mergeInbox` uses `submitValidated` before recording the book movement ([facility.ts:290]($REPO/facility/src/facility.ts:290)).

---

### 6. MEDIUM — the final tree still contains mutually exclusive executed/not-executed and hatch/no-hatch claims

**Exact current sentences**

- [run-facility.ts:5]($REPO/facility/run-facility.ts:5): “It has still never been run”
- [facility.test.ts:8]($REPO/facility/tests/facility.test.ts:8): “It is not, and it never has been”
- [Makefile:84]($REPO/Makefile:84): “BUILT AND NOT EXECUTED”
- [CLAIMS.md E-146:198]($REPO/CLAIMS.md:198): “there is not even a demo” and “NO grade for ledger acceptance”
- [CLAIMS.md E-149:207]($REPO/CLAIMS.md:207): “this one has not been”
- [CLAIMS.md B-18:218]($REPO/CLAIMS.md:218): “none of it has been submitted to any ledger”
- [architecture:205]($REPO/docs/architecture/ARCHITECTURE-2026-08-18.md:205): “NOT EXECUTED”
- [architecture:217]($REPO/docs/architecture/ARCHITECTURE-2026-08-18.md:217): “No facility transaction has been submitted”
- [README:55]($REPO/facility/README.md:55), [README:131]($REPO/facility/README.md:131), [architecture:209]($REPO/docs/architecture/ARCHITECTURE-2026-08-18.md:209), and [signer README:1015]($REPO/signer/README.md:1015) still say the facility refuses remote endpoints without qualifying the accepted-risk hatch.

**Why wrong**

These are live, unstruck statements in the same revision that records the remote executed run. They are not merely historical commit messages. Several directly deny the hatch introduced in that revision.

**What would falsify this finding**

Showing that the quoted sentences are struck, explicitly historical, or qualified by the exact-risk hatch in the frozen tree. They are not.

---

### 7. LOW — the explanation of F-27 contains two false absolutes

**Exact sentences**

- [CLAIMS.md F-27:264]($REPO/CLAIMS.md:264): “**No unit test could have caught it**”
- [book.ts:190]($REPO/facility/src/book.ts:190): same sentence
- `d17b8ee` commit message: “None could have caught it”
- [architecture:215]($REPO/docs/architecture/ARCHITECTURE-2026-08-18.md:215): “The **first Devnet transaction** refused to reconcile”
- `d17b8ee` commit message repeats “the FIRST Devnet transaction”

**Why wrong**

The narrower defensible statement is that the then-existing, self-consistent fake-node suite did not catch it. A unit test absolutely can encode the externally established rule: [book.test.ts:47]($REPO/facility/tests/book.test.ts:47) now does exactly that and would fail if Convert again credited `spending`.

The Convert was also not the first transaction. The saved movement list begins with Dedicated Account authorization and public payment before the Convert ([facility-state.json:41]($HOME/.wconf/facility-state.json:41)); issuance setup occurred earlier still. It was the first run’s reconciliation failure, not the first Devnet transaction.

**What would falsify this finding**

Demonstrating that the current inbox test still passes when `case "convert"` credits `spending`, or that the Convert was chronologically the run’s first validated transaction. Neither is true.

## Sections with no additional finding

- **Exact-phrase hatch closure:** No bypass found in the current facility path. `WCONF_FACILITY_ENDPOINT`, the facility profile, and the spawned signer’s `WCONF_LEDGER_ENDPOINT` all converge on the checked endpoint; inherited disagreement is refused; the signer profile independently checks the exact phrase; redirects are not followed; and `LoopbackLedger` has no constructor call outside `open`.

- **`sameEndpoint`:** No defect found. Canonical URL equality compares the response against the endpoint requested, and the different-port and accepted-remote cases are covered.

- **`--fresh`:** No defect found. Fresh state is selected before setup, and the previous book is moved aside before opening the new issuance’s book.

- **Convert-to-inbox semantics:** No remaining code, test, or document explicitly credits a Convert directly to spendable balance. `book.ts`, `convertFloat`, supplier enrolment, and the new arithmetic tests agree on Convert → inbox → MergeInbox. The missing returned merge is the transaction-count defect above, not a balance-model regression.

- **Other numbers:** The saved issuance ID, remote endpoint, `underB15Conditions: false`, balances `0 / 610 / 10 / 1410`, and arithmetic sum `2030` match the saved state/book. The `4767433 → 4767434` pair, live outstanding value, four on-ledger keys, and observer count of 14 are not preserved in the run record. A live JSON-RPC check was unavailable from this read-only environment because outbound DNS was blocked, so I do not claim independent chain verification of those four items.

- **Standing prohibitions:** No new P-3/P-4/P-5/P-8/P-9/P-11 breach found. The prominent execution surfaces consistently say Devnet-only, amounts-only, issuer-readable, and not secure/audited/non-custodial/production-ready.
