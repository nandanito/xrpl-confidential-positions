# REVIEW-023c — adjudication: the accepted-risk hatch and the executed claims

**Date 2026-08-25.** One leg: `REVIEW-023b` (Codex, packet **plus** read-only
repository access, against a **frozen** tree at `d17b8ee`).

**Seven findings — 2 HIGH, 4 MEDIUM, 1 LOW. All seven upheld, none rejected,
none stale.** ~~Every one is fixed.~~

> ## ⚠ **"Every one is fixed" was FALSE, and round two is what established it**
>
> **`REVIEW-023g`, 2026-08-26.** Three legs, **seventeen findings upheld**. The
> largest is that these fixes were **incomplete at sites these very findings
> cited by file and line** — C-6 named `architecture:205` and `:217` and neither
> was touched; C-7 named `architecture:215` and the row `CLAIMS.md` F-27, and
> neither was touched; C-1's headline sentence *"That is exactly the F-23
> consequence removed"* was left standing in E-149 with a caveat appended below
> it. **A fix that reaches five of six sites is an unfixed finding recorded as
> fixed.**
>
> Two sentences **in this document** are among the corrected ones and are left
> in place, because a wrong argument that was acted on is worth more than a
> deleted one:
>
> * §1 C-1: *"With loopback the node is the operator's own and the question does
>   not arise"* — **false**; the issue #1 ruling puts a hostile same-host process
>   in scope, and `loopback.ts`'s own header says that adversary can edit the
>   local node's answers. Narrowed to *an honest, operator-controlled node*.
> * §1 C-2: *"because it is the only place that sees every RPC"* — **false**;
>   `probe` reaches the node through `rawCall`. It is the only place that sees
>   every RPC **after the connection is open**.
>
> Also corrected: the file count below (*"eleven"* → **20 paths**, 17 excluding
> review artifacts), and §5's *"what would settle it"* wording, which F-28
> inherited and which **removes the mechanism it is meant to test**.

⚠ **This is the first review round in this project where a leg returned no
finding that had to be argued with.** Three of the seven are the kind the
project has learned to expect — a stale sentence, a fabricated count, a false
absolute. The other four are about **what an executed run is evidence of**,
which is a category no previous round has had to judge, because until today
there was nothing executed to overstate.

---

## 1. The two that matter

### C-1 — HIGH. **Four documents said the run removed F-23's consequence. It did not, and there is a second reason it cannot.**

The executed control was a plaintext `Payment` to an unauthorised destination,
producing `tecNO_AUTH`. **It was not an F-23 transaction**: no substituted
`HolderEncryptionKey`, no `ConfidentialMPTSend`, no `tecBAD_PROOF`, no
attacker-key ciphertext, no recovery attempt. What it establishes is that
`tapFailHard` changed the treatment of **that** `tec`; the step from *"this
tec"* to *"any tec"* is `Transactor.cpp:1645-1651`'s text — a **source
reading**, which is why the source was read first and why E-149 was graded `B`
before it was graded `A`.

⚠ **And the leg found something the session had not seen at all**, which is now
`CLAIMS.md` **F-28**:

> **The flag stops a `tec` reaching the LEDGER. It does not stop the ciphertext
> reaching the NODE you submitted to — and under a remote ledger source, that is
> the same node F-23 is about.**

The facility reads the destination's and the issuer's keys from an endpoint,
builds a Send encrypted to whatever it read, and **submits the signed blob to
that same endpoint**. A lying source receives the ciphertext encrypted under its
own key *before* the flag can prevent application or relay.

**So under E-151's amendment the two halves of B-15's answer are not merely
unequal in strength — Part C does not cover the residual Part A was carrying.**
With loopback the node is the operator's own and the question does not arise,
which is exactly why the ruling called loopback the protection and the flag a
seatbelt. **Fixed** in `submit.ts`, `run-facility.ts`'s §1 preamble, E-149 and
the new F-28.

### C-2 — HIGH. **A run could be stamped `underB15Conditions: true` while having submitted without the flag.**

The stamp measured only whether the endpoint was a loopback literal. But
`run-facility.ts` executes the fail-hard control's **unflagged** arm on every
run, before the stamp is written — so a future loopback run would have been
recorded as *"both halves in force"* while having made an unflagged submission.
**B-15's Part C says *"whatever submits"* and names no control-arm exception.**

The remote run was correctly stamped `false`, so nothing already recorded is
wrong; the `true` branch was unsound and had never been taken.

**Fixed by making the stamp measure both halves.** `underB15Conditions` is now a
**getter, not a field** — the answer changes during a run — and `LoopbackLedger`
counts unflagged `submit` calls because it is the only place that sees every
RPC. `b15Note` distinguishes the three cases in words a run record can carry.
`facility/tests/risk-acceptance.test.ts` drives the transition.

---

## 2. Three about evidence and coverage

* **C-3 — MEDIUM. The hatch's accepting branch was never executed by any test.**
  The test named *"set exactly: it opens, and the connection is STAMPED as not
  under B-15"* connected to `127.0.0.1`, which never reaches
  `assertRemoteRiskAccepted` at all — **its name promised the accepted-remote
  outcome while its assertions proved the opposite stamp**, and the sentence
  claiming *"the hatch itself is driven by the two tests above"* was false, since
  both of those stop before connecting. The disclosure tests asserted substrings
  of the **constant**, never that `open()` emits it.
  ⚠ **The leg supplied the route in and it is a good one**: `localhost` is
  deliberately classified **non-loopback** by `isLoopbackEndpoint` — a name is
  resolved by something the process does not control — while still resolving to
  a local test server. **Fixed**: the accepting branch now runs, against a
  remote-classified local server, asserting the `false` stamp **and capturing
  stderr to prove the disclosure is emitted**. `tools/check-loopback.ts` flagged
  the new endpoint immediately and it is recorded with its reason.
* **C-4 — MEDIUM. The mandatory disclosure claimed §10.5 evidence the driver
  does not collect.** `REMOTE_LEDGER_DISCLOSURE` said a run *"CAN establish …
  that XLS-0096 §10.5's state changes hold"* while `run-facility.ts`'s own header
  said it does **not** keep that standard and B-18 records the same gap.
  ⚠ **And the wording tests skipped exactly that paragraph** — so the one false
  sentence in the constant was the one nothing pinned. **Fixed**, and pinned.
  ⚠ The first version of the new assertion **failed against correct text**: it
  spanned a paragraph break and matched the correction itself. Scoped to the
  paragraph that makes the claim.
* **C-6 — MEDIUM. Nine live sentences still denied the execution or the hatch.**
  `run-facility.ts` (*"it has still never been run"*), `facility.test.ts`
  (*"it is not, and it never has been"*), the `Makefile`, three `CLAIMS.md`
  cells, two in the architecture document, and three saying the facility refuses
  remote endpoints without qualifying the hatch introduced in the same revision.
  ⚠ **The session's own contradiction sweep ran and missed them**, and the
  reason is instructive: it grepped for *"not executed | never executed | never
  been submitted"* **and excluded lines mentioning E-148 or B-18** — which is
  where several of the hits were. **An exclusion filter added to reduce noise is
  a filter that hides the signal it was tuned against.**

---

## 3. Two about numbers and absolutes

* **C-5 — MEDIUM. "27 validated transactions" was wrong in six documents.**
  `convertFloat` **awaited** the Dedicated Account's post-conversion merge and
  **discarded the `Movement` it returned** — so a validated transaction, hash
  `3F264EB8…`, was in the book and absent from the run record, and every
  document counting the run record was one short. There were **nine** merges,
  not the seven the commit message claimed; **28** facility movements; and **31**
  program-submitted validated transactions counting the two issuance-setup
  transactions and the control's unflagged arm.
  **Fixed** — the merge is returned, the count corrected everywhere, and both
  numbers now say **what they count**. ⚠ `CLAIMS.md` E-141's shape a third time:
  *a count taken from a record its own producer under-fills.*
* **C-7 — LOW. F-27's explanation carried two false absolutes.**
  *"No unit test could have caught it"* — false as stated; a unit test can encode
  the rule once the ledger has established it, and `book.test.ts` now does. The
  defensible claim is that the **then-existing, self-consistent** suite could
  not. And *"the first Devnet transaction refused to reconcile"* — false; the
  authorize and the public `Payment` came first, and the issuance setup before
  that. It was the first **reconciliation**. ⚠ **Both are fabricated details
  inside a correction**, which is `CLAIMS.md` E-144's category exactly.

---

## 4. What this round says about method

1. ⚠ **Freezing the tree worked, and it is cheap.** `REVIEW-022`'s Codex leg
   watched files move under it and produced a stale finding. This leg was given a
   pushed, frozen commit and produced **seven findings and no stale ones**. Same
   tool, same access, one procedural change.
2. **The leg declined to claim verification it could not perform.** Outbound DNS
   was blocked in its sandbox, so it said which four numbers it had **not**
   independently checked rather than passing them silently. That is worth more
   than a clean report.
3. ⚠ **The new failure mode is overstating what an execution establishes**, and
   four of seven findings are in that family. A run produces a great deal of
   green output, and the temptation is to let *"rippled accepted 28
   transactions"* stand in for *"the facility keeps its obligations"*. **The
   discipline that catches it is naming, for each claim, the transaction that
   would have to have been executed to support it** — which is how C-1 was found.
4. **A contradiction sweep with an exclusion filter is a sweep with a blind spot
   shaped like its filter.** Next time, sweep wide and read the hits.

---

## 5. ~~No second round~~ — **ROUND TWO IS OWED, and this section was wrong**

⚠ **Struck 2026-08-25, within hours of being written.** What follows argued that
the fixes touch no wire format, proof, field set or cryptography, and concluded
a second round would not pay. **That reasons from the CATEGORY of the change and
ignores this session's own base rate**, which is the opposite: `REVIEW-022`'s
fixes introduced **two** defects that `REVIEW-023` then found — a redirect check
wrong in both directions, and a test whose name promised a branch it never took.
`CLAUDE.md`'s rule is two rounds, the second reviewing the FIXES, and this was
round one.

**Round two is owed on:** ~~eleven~~ **20** changed paths (17 excluding this round's own review artifacts) — ⚠ **the "eleven" was never derived from anything and round two's Codex leg counted it; `git show --stat 7ec094d` says 20** — two HIGH fixes, a stamp that
changed from a field to a getter, a returned value that was being discarded, and
**`CLAIMS.md` F-28 — a new register row written today to explain a finding**,
which is precisely the surface `E-144` records three false sentences on.

The original reasoning is kept below, because a wrong argument that was acted on
is worth more to a later reader than a deleted one.

### The original §5, struck



`CLAUDE.md`'s rule counts rounds of review, and a second round exists to catch
defects introduced by fixes and false sentences written to explain them. That is
a real risk here — ~~eleven~~ **20 paths** changed — and it is weighed against what the
fixes are: a getter replacing a field, a returned value that was discarded, one
regex scoped to a paragraph, and a set of sentences corrected to say less.
**None of them touches the wire format, the proof, a field set, or the
cryptography.**

⚠ **The honest residual, and it is the same one the milestone has carried all
day:** the two HIGH fixes have tests and none of them has run against a real
node. `underB15Conditions` has never been recorded `true` by an actual run,
because there has never been a loopback run. **F-28 is read at source and
reasoned, not executed**, and settling it needs a substituted-key Send under the
flag against a source that cannot obtain the blob — which is a loopback run's
job, and loopback is what this hardware could not pay for.
