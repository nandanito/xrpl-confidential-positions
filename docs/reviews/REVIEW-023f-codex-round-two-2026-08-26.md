# REVIEW-023f — Codex leg, ROUND TWO: the fixes

**Date 2026-08-26.** Packet **plus read-only repository access**, against a tree
frozen at `3aac8dd`. Run as
`codex exec --sandbox read-only --skip-git-repo-check … < /dev/null`.

**Thirteen findings: 3 HIGH, 5 MEDIUM, 5 LOW.** Adjudicated in `REVIEW-023g`.
**Twelve upheld; one sub-claim rejected** — see `REVIEW-023g` §5.

⚠ **This leg's own procedural discipline saved the round, and it should be
recorded.** Two commits landed in `docs/reviews/` while it was reading — the
session's self leg and its addendum, which is a mistake the session made and
records in `REVIEW-023g` §6. The leg **noticed the checkout was not the stated
frozen commit and said so**, then read the subject exclusively through
`git show 7ec094d:<path>` and the packet through `git show 3aac8dd:<path>`
rather than the working tree. Its file list confirms it never opened the self
leg. **The overlap with the self leg is therefore corroboration, not
contamination** — but that is the leg's doing, not the session's.

⚠ **Outbound DNS was blocked in its sandbox** (`curl: (6) Could not resolve
host: s.devnet.rippletest.net`), and it named exactly which four claims it
therefore could not check against the chain rather than passing them silently.
That is the second round running in which a leg has earned credit for declining
to claim verification it could not perform.

---

# REVIEW-023d — Round-two report on `7ec094d`

## Verdict

The fixes are not clean. I found **13 findings: 3 HIGH, 5 MEDIUM, 5 LOW**. No CRITICAL finding.

Two scope discrepancies are worth recording but are not findings against `7ec094d`:

- The checkout was at `a4ec482`, not the stated frozen `3aac8dd`. I therefore inspected the subject exclusively through `git show 7ec094d:<path>` and the packet through `git show 3aac8dd:<path>`, without relying on later working-tree contents.
- `7ec094d` changes **20 paths**, not the packet’s “eleven files.” Seventeen remain after excluding the three review artifacts.

Outbound Devnet verification was blocked:

```text
curl: (6) Could not resolve host: s.devnet.rippletest.net
```

The affected claims are identified under Q5.

---

## Q1. Did any fix introduce a defect?

### Q1(a) `underB15Conditions`

For the actual driver:

| Endpoint | At §0 | After mandatory control arm B | Saved record |
|---|---:|---:|---:|
| Remote | `false` | `false` | `false` |
| Loopback | `true` | `false` | `false` |

`b15Note`, not the Boolean, is now the only saved field that distinguishes remote from loopback-plus-control.

### Finding Q1-1 — HIGH

**Defect:** The revised stamp is necessarily `false` for every completed `run-facility.ts` run, while the same hypothetical loopback run prints that B-15’s conditions are met and suppresses the final non-compliance warning.

- **Location:** `facility/run-facility.ts@7ec094d`:
  - lines 126–133: `b15AtStart` is cached and printed as `"conditions MET — loopback"`;
  - line 392: every run calls `failHardControl`;
  - line 235: its second arm submits without `fail_hard`;
  - lines 536–543: the final warning tests the cached `b15`, not the getter;
  - lines 554–555: the record reads the getter after the unflagged arm.
  - `facility/src/loopback.ts:341–342`: `isLoopback && unflagged === 0`.
- **Why wrong:** A loopback run begins `true`, necessarily transitions to `false`, but the terminal continues to present the beginning-of-run value as the run’s status.
- **What concretely breaks:** The Boolean cannot certify any completed driver run, and a single terminal can say both “conditions MET” and record “both halves were not in force” without printing §8’s warning.
- **Severity:** HIGH.
- **What would falsify this claim:** A completed driver path that writes `underB15Conditions: true`, or evidence that §0 and §8 are explicitly labelled as point-in-time rather than run-level statements.
- **Remedy:** None proposed; whether the control belongs inside the compliance boundary requires a ruling, not a guessed code edit.

### Finding Q1-2 — MEDIUM

**Defect:** The counter does not implement B-15’s “whatever submits” rule because it observes only `method === "submit"` calls made through one particular `LoopbackLedger.call` instance.

- **Location:** `facility/src/loopback.ts:315–324, 327–342, 365–367`; especially `"this is the only place that sees every RPC"` and:
  ```ts
  if (method === "submit" && params.fail_hard !== true) this.unflagged++;
  ```
- **Why wrong:** It misses `submit_multisigned`, any internal direct `rawCall`, and submissions through a second ledger object. A `FailHardSubmitter` can also be constructed with a different ledger from the one whose getter is later stamped.
- **What concretely breaks:** `ledger.call("submit_multisigned", ...)` without a flag leaves the getter `true`; `b15Note` can then falsely say `"every submission flagged"`.
- **Severity:** MEDIUM.
- **What would falsify this claim:** Demonstrating that every supported submission API, including multisigned submission, necessarily converges on this exact counter and causes the getter to become `false`.
- **Additional trace result:** A string `fail_hard: "true"` is not missed; it is conservatively counted as unflagged because it is not the Boolean `true`.

### Q1(b) `convertFloat`

**No finding.**

- `facility/src/facility.ts:348–359` records the Convert in the book.
- `mergeInbox` records the merge once at lines 290–301.
- `convertFloat` returns `[m, merged]` at lines 371–373 without recording either again.
- The only caller is `facility/run-facility.ts:407`.
- `note()` at lines 376–389 flattens the returned array once.
- The end partition correctly treats the Convert as public and the merge as hidden.

The book was already correct; only the run movement list was underfilled.

### Q1(c) `localhost` test and gate exemption

The port normalisation does not convert any currently present, syntactically remote host into loopback. Host substitutions become the invalid `HOST SUBSTITUTION` sentinel, and a fixed remote host remains remote. Runtime construction remains outside the gate’s explicitly stated guarantee.

### Finding Q1-3 — LOW

**Defect:** The new test and exemption state that `localhost` keeps all traffic on-machine, but neither controls nor verifies its resolution.

- **Location:**
  - `facility/tests/risk-acceptance.test.ts:87–97`: `"genuinely exercised without a packet leaving the machine"`;
  - `tools/check-loopback.ts:100–107`: `"the operating system still sends the request to 127.0.0.1"` and `"without a packet leaving the machine"`.
- **Why wrong:** The classifier deliberately refuses `localhost` precisely because resolution is outside its control. If that name resolves elsewhere, `LoopbackLedger.open()` follows the resolution and sends the probe there.
- **What concretely breaks:** On a misconfigured or hostile resolver, the test attempts outbound traffic, either failing nondeterministically or—if the remote endpoint answers like the fixture—passing against a remote service.
- **Severity:** LOW.
- **What would falsify this claim:** A test-controlled resolution mechanism or packet-level proof that the request cannot leave the host regardless of system resolver configuration.
- **Observed here:** This machine resolved `localhost` to `::1` and `127.0.0.1`; that confirms this host, not the universal claim.

---

## Q2. Do any new tests pass for the wrong reason?

### Stderr-capture test

**No finding.** Inside the patched window, the material operation is `LoopbackLedger.open()`. The fake server does not write the required strings to stderr. If `open()` emitted nothing, both the exact disclosure fragment and dynamic endpoint assertions would fail.

### Unflagged-submission test

**No finding.** The middle assertion is load-bearing: if the counter incremented on the flagged call, line 147’s `expect(...).toBe(true)` would fail. The fake node returning the same response does not determine the getter.

### Finding Q2-1 — MEDIUM

**Defect:** The §10.5 regression test pins one literal spelling, not the semantic overclaim named by the test.

- **Location:** `facility/tests/risk-acceptance.test.ts:202–215`, especially:
  ```ts
  expect(canEstablish).not.toContain("§10.5");
  ```
- **Why wrong:** The paragraph could say, for example, “CAN establish every state change XLS-0096 requires” while retaining the later contradictory correction. It would contain no literal `§10.5`, so the test would pass.
- **What concretely breaks:** The C-4 disclosure defect can be reintroduced by a routine rewording while its dedicated regression test remains green.
- **Severity:** MEDIUM.
- **What would falsify this claim:** Applying a semantically equivalent overclaim without the literal `§10.5` and showing that this test fails.

---

## Q3. Is any sentence written about a fix false?

### Finding Q3-1 — LOW

**Defect:** F-28 assigns the ledger reads and transaction construction to the facility and gives the issuer’s key the wrong field name.

- **Location:** `CLAIMS.md:266`, F-28:
  > “The facility reads the destination's and the issuer's `HolderEncryptionKey` … builds a `ConfidentialMPTSend`…”
- **Why wrong:** The signer independently reads the destination’s `HolderEncryptionKey` and the issuance’s `IssuerEncryptionKey`, then builds, proves and signs the Send. The TypeScript facility performs a destination precheck and passes an intent.
- **What concretely breaks:** The permanent register directs an auditor to the wrong component and to a nonexistent issuer-side `HolderEncryptionKey`.
- **Severity:** LOW.
- **What would falsify this claim:** Code showing the TypeScript facility constructs the final confidential transaction and that the issuer field is actually named `HolderEncryptionKey`.
- **Remedy:** Replace it with the precise chain: signer reads destination `HolderEncryptionKey` and issuance `IssuerEncryptionKey`, builds/signs, then the facility submitter sends the blob.

The “same endpoint” part is true of `run-facility.ts`: the signer profile receives `cfg.ledgerEndpoint`, and the submitter uses the same `ledger` object. That equality is conventional rather than enforced by `Facility`’s constructor, but it holds in this driver.

### Ordering

**No finding.** `fail_hard` and the blob arrive in the same RPC request; there is no network ordering in which the flag arrives first. The node must receive the blob before it can prevent application or relay.

### Finding Q3-2 — MEDIUM

**Defect:** F-28 and `submit.ts` falsely say the node-disclosure question does not arise on loopback.

- **Location:**
  - `CLAIMS.md:266`: `"With loopback, the node is the operator's own and the question does not arise"`;
  - `facility/src/submit.ts:32–38`: the same claim;
  - commit `7ec094d` message: the same sentence.
- **Why wrong:** `facility/src/loopback.ts:26–31` explicitly keeps the same-host adversary in scope and says that adversary can redirect or edit the local node’s answers. A compromised or adversary-operated loopback listener can lie about the key and read the submitted blob exactly like a remote liar.
- **What concretely breaks:** The permanent risk row understates F-28’s scope and can be read as asserting that loopback alone protects against compromise of the local node.
- **Severity:** MEDIUM.
- **What would falsify this claim:** A threat-model exclusion for compromised/operator-substituted local nodes, or a mechanism preventing the loopback node process from reading the submitted blob.
- **Remedy:** Scope the sentence to an honest, operator-controlled loopback node.

### Finding Q3-3 — LOW

**Defect:** F-28’s proposed settling experiment removes the mechanism it is supposed to test.

- **Location:** `CLAIMS.md:266`:
  > “What would settle it: a substituted-key Send under the flag, against a source that cannot obtain the blob.”
- **Why wrong:** F-28 is specifically disclosure to the source because that source is also the submitter endpoint. A source that cannot obtain the blob is a different topology and cannot execute the asserted disclosure.
- **What concretely breaks:** Following the register’s prescription cannot promote F-28 from reasoned to executed evidence.
- **Severity:** LOW.
- **What would falsify this claim:** Showing that the proposed source still receives and decrypts the submitted ciphertext.
- **Remedy:** Exercise a lying source that also receives the submission and demonstrate that it can recover the amount despite `fail_hard`.

The `"Read at source and reasoned; NOT executed"` grade itself is honest.

### Finding Q3-4 — LOW

**Defect:** The new `convertFloat` comment falsely says an under-returning method produces a count “nobody can check.”

- **Location:** `facility/src/facility.ts:369–370`:
  > “A method that returns fewer movements than it made is a method whose count nobody can check.”
- **Why wrong:** Round one checked the missing movement through the independent book record; that is how hash `3F264EB8…` was found.
- **What concretely breaks:** The correction’s rationale denies the exact independent evidence that established the defect.
- **Severity:** LOW.
- **What would falsify this claim:** Showing there was no independent book or ledger evidence from which the missing movement could be recovered.
- **Remedy:** Narrow it to “cannot be counted from the returned movement list/run record.”

The following inspected sentences were clean:

- `run-facility.ts` §1 correctly narrows the executed control to one `tecNO_AUTH`.
- `book.ts:190–201` is true; `book.test.ts:47–66` fails if Convert credits `spending`.
- `facility.test.ts`’s “wrong in both directions” account is true.
- E-149’s newly added execution caveat and E-152’s account of round one are accurate.
- The README’s 28/31 paragraph and obligation-table hatch qualification are accurate subject to Q5’s chain limitation.
- The `loopback.ts` “only place that sees every RPC” sentence is false for the same reason as Q1-2 and is included there rather than duplicated.

---

## Q4. Is C-6’s sweep complete?

**No. It is materially incomplete.**

### Finding Q4-1 — HIGH

**Defect:** The tree still says `tapFailHard` removes the consequence of a wrong read even though the newly added F-28 says the submitting node still receives the attacker-key ciphertext.

- **Location:**
  - `CLAIMS.md:207`, E-149: `"That is exactly the F-23 consequence removed"`;
  - `CLAIMS.md:209`, E-151: `"removes the consequence of a wrong read"`;
  - `facility/run-facility.ts:136,140`: `"tapFailHard removes its consequence"` / `"removes the CONSEQUENCE of a wrong read"`.
- **Why wrong:** Source reading supports prevention of ledger application and relay. It does not prevent disclosure to the submitting node.
- **What concretely breaks:** The permanent register and terminal still present Part C as a complete consequence-removal mechanism in the accepted-remote configuration.
- **Severity:** HIGH.
- **What would falsify this claim:** Evidence that the submitting node cannot inspect or decrypt the ciphertext in the blob, or an explicit local definition limiting “consequence” solely to ledger publication.
- **Remedy:** Say that the flag prevents ledger application/relay but not disclosure to the submitting node.

### Finding Q4-2 — HIGH

**Defect:** Multiple live surfaces still claim that every submission carries `tapFailHard`, although every driver run deliberately makes one unflagged submission.

- **Location:**
  - `facility/run-facility.ts:17–19` and `139–140`;
  - `CLAIMS.md:209`, E-151: ``tapFailHard` is set on every submission`;
  - `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md:245`;
  - `CLAIMS.md:198`, E-146: ``FailHardSubmitter` is the only submission path`;
  - counterexample: `facility/run-facility.ts:231–235`.
- **Why wrong:** B-15 says “whatever submits” and names no control exception; the driver’s control bypass is itself a submission.
- **What concretely breaks:** The C-2 prose fix remains false even though the new getter records the violation.
- **Severity:** HIGH.
- **What would falsify this claim:** The control being skipped, flagged, or expressly excluded by a revised B-15 ruling.
- **Remedy:** Replace “every submission” with an explicit statement that workflow movements are flagged and the control’s second arm is the deliberate unflagged exception.

### Finding Q4-3 — MEDIUM

**Defect:** The 27→28 count sweep updated one build-lead persona but left its live `.claude` mirror at 27.

- **Location:** `.claude/agents/build-lead.md:40`:
  > “27 validated transactions.”
- **Why wrong:** The corrected facility count is 28.
- **What concretely breaks:** An agent loaded from the `.claude` persona begins with the exact stale count C-5 was meant to remove.
- **Severity:** MEDIUM.
- **What would falsify this claim:** Evidence that this file is unused or intentionally describes the pre-fix run-record length rather than the validated facility count.
- **Remedy:** Apply the same 28-qualified wording used in `docs/personas/build-lead.md`.

### Finding Q4-4 — MEDIUM

**Defect:** C-6’s execution/hatch sweep left several live denials and an unqualified refusal claim.

- **Locations and exact sentences:**
  - `CLAIMS.md:198`, E-146: `"NOT EXECUTED means no facility transaction has been submitted to any ledger"` and the unqualified `LoopbackLedger` refusal claim;
  - `CLAIMS.md:264`, F-26 evidence: `"the facility has never run (B-18)"`;
  - `docs/architecture/ARCHITECTURE-2026-08-18.md:205`: `"NOT EXECUTED — see below"`;
  - the same file at line 217: `"No facility transaction has been submitted"`;
  - `facility/README.md:135`: `"Refuses a non-loopback literal"` without the hatch.
- **Why wrong:** The same revision records the remote executed run and its named acceptance hatch.
- **What concretely breaks:** Authoritative architecture, register and module-summary surfaces remain mutually contradictory; four of these are sites round one named explicitly.
- **Severity:** MEDIUM.
- **What would falsify this claim:** Showing that each quotation is struck, explicitly temporal, or locally qualified by the hatch. They are not.
- **Remedy:** Strike or temporally qualify the execution denials and add the E-151 hatch qualification to the module-summary claim.

### Finding Q4-5 — LOW

**Defect:** The C-7 sweep left both fabricated narratives in live permanent surfaces.

- **Location:**
  - `CLAIMS.md:265`, F-27: `"No unit test could have caught it"`;
  - `docs/architecture/ARCHITECTURE-2026-08-18.md:215`: `"The first Devnet transaction refused to reconcile"` and `"no unit test could have caught"`;
  - `docs/NEXT-SESSION-PROMPT.md:25`: `"The first Devnet transaction found a defect nothing else could"`.
- **Why wrong:** Authorization, public payment and issuance setup preceded the Convert; and `facility/tests/book.test.ts:47–66` now proves a unit test can encode and catch the rule once established.
- **What concretely breaks:** The register, architecture and next-session handoff preserve the exact absolutes the fix claims to have removed.
- **Severity:** LOW.
- **What would falsify this claim:** Showing that the Convert was chronologically the first transaction, or that the arithmetic test still passes when Convert credits `spending`.

The F-27 phrase `"the FIRST Devnet run refused to reconcile"` is not itself reported: read literally as a statement about the first run rather than its first transaction, it is defensible.

---

## Q5. Are 28, 31 and nine correct and properly scoped?

**No numeric finding.**

The 28 facility transactions derive as follows:

| Type | Count |
|---|---:|
| Authorize | 4 |
| Public Payment | 4 |
| Convert | 4 |
| Send | 5 |
| MergeInbox | 9 |
| ConvertBack | 2 |
| **Total** | **28** |

Equivalent workflow derivation:

- Dedicated setup: 4
- Three supplier enrolments: 12
- Three drawdowns plus merges: 6
- Two repayments plus merges: 4
- Two retirements: 2
- Total: 28

The nine merges are one post-float merge, three enrolment merges, three drawdown merges and two repayment merges.

The 31 count is also internally correct:

```text
28 facility movements
+ 2 issuance setup transactions
+ 1 unflagged, applied control arm
= 31
```

The flagged arm is excluded because it was submitted but `applied=false`, remained absent after three ledger closes and therefore never became a validated transaction. The count’s phrase “submitted and the ledger applied,” together with E-149’s arm account, states that distinction.

Faucet fundings are excluded because this program POSTs a funding request to the faucet; the faucet service, not this program’s JSON-RPC submitter, creates/submits the funding transaction. The phrase “program-submitted” communicates that boundary, though it does not separately spell out “excluding faucet fundings.”

### Evidence for the omitted 28th movement

The saved run record contains 27 movements. The book contains the omitted merge:

```text
3F264EB84BD3804C23BD39756B145EDA577E0942E6F057023A010707ED1AD12C
```

`mergeInbox()` calls the plaintext path, which calls `submitValidated`; `submitValidated` requires a validated transaction with final metadata `tesSUCCESS` before returning; only then does `mergeInbox` write the book movement. That makes “validated” defensible from the local execution record and control flow.

It is not independent chain verification. Because Devnet DNS was blocked, I could not independently check:

- that `3F264E…D12C` exists and validated as `tesSUCCESS`;
- consequently, the external-chain truth of “28 validated facility transactions” and “nine validated merges”;
- the unflagged control’s validated application and therefore the external-chain truth of 31.

The live state still correctly contains 27 because it predates the producer fix. `CLAIMS.md` B-18 explicitly explains that the run record omitted the merge; I found no document claiming the saved record itself contains 28.

---

## Q6. Free hunt on the fixes only

**No additional finding beyond Q1–Q5.**

I did not reopen the settled signer/submission boundary, canonical loopback forms, two-phase control, `sameEndpoint`, Convert→inbox semantics, named non-goals, or the absence of per-movement §10.5 assertions.

---

## Files actually opened

Review material:

- `docs/reviews/REVIEW-023d-REQUEST-round-two-2026-08-26.md`
- `docs/reviews/REVIEW-023-REQUEST-hatch-and-executed-claims-2026-08-25.md`
- `docs/reviews/REVIEW-023b-codex-hatch-and-executed-claims-2026-08-25.md`
- `docs/reviews/REVIEW-023c-adjudication-2026-08-25.md`
- `docs/reviews/REVIEW-022-REQUEST-step7-facility-2026-08-25.md`
- `REVIEW-022a`, `022b`, `022c`, `022e`, `022g` and `022s`

Claims and prose:

- `CLAIMS.md`
- `CLAUDE.md`
- `Makefile`
- `docs/NEXT-SESSION-PROMPT.md`
- `docs/architecture/ARCHITECTURE-2026-08-18.md`
- `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md`
- `docs/personas/build-lead.md`
- `.claude/agents/build-lead.md`
- `facility/README.md`
- `signer/README.md`

Code and tests:

- `facility/run-facility.ts`
- `facility/src/book.ts`
- `facility/src/devnet-accounts.ts`
- `facility/src/facility.ts`
- `facility/src/loopback.ts`
- `facility/src/signer.ts`
- `facility/src/submit.ts`
- `facility/tests/book.test.ts`
- `facility/tests/facility.test.ts`
- `facility/tests/risk-acceptance.test.ts`
- `tools/check-loopback.ts`
- `tools/spike-step2-2026-08-19/f23-substituted-key.ts`

Live records:

- `~/.wconf/facility-state.json`
- `~/.wconf/facility-book.json`
