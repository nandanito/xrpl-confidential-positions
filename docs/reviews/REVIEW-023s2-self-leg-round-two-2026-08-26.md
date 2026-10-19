# REVIEW-023s2 — self leg, ROUND TWO. The fixes.

**Date 2026-08-26.** Subject: commit `7ec094d`, round one's seven fixes, against
the packet `REVIEW-023d`.

⚠ **This file was written and committed BEFORE either external leg's report was
read.** That is checkable in the git history rather than merely asserted: the
Gemini and Codex legs were launched against frozen `3aac8dd`, and this commit
lands before the commit that records their output. The reason to bother is
`CLAIMS.md`'s own record — a self-review that reads the external legs first
finds what they found and calls it corroboration.

**Six findings — 1 HIGH, 3 MEDIUM, 2 LOW — plus two residuals and one check that
came back clean.**

---

## S-1 — HIGH. **Round one's fixes did not reach three sentences, at two file:line references the findings themselves cited.**

`REVIEW-023c` opens: *"Seven findings … All seven upheld, none rejected, none
stale. **Every one is fixed.**"* Three sentences say otherwise, all in
`docs/architecture/ARCHITECTURE-2026-08-18.md`, which `CLAUDE.md` names as the
authority on what is open:

| Where | What it still says | Which finding named it |
|---|---|---|
| `:205` | *"**63 tests, a real type-check, and three gates.** ⚠ **NOT EXECUTED — see below.**"* | C-6, which cited `architecture:205` by line |
| `:217` | *"**No facility transaction has been submitted.**"* | C-6, which cited `architecture:217` by line |
| `:215` | *"**The first Devnet transaction refused to reconcile** … and **no unit test could have caught the mistake** because the suite asserts this project's model of the protocol against itself"* | C-7, which cited `architecture:215` for the first absolute; the second is the sentence C-7 corrected in `book.ts` and `CLAIMS.md` F-27 |

`git show 7ec094d -- docs/architecture/ARCHITECTURE-2026-08-18.md` changes three
hunks: the revision header, the loopback bullet at `:209`, and the count at
`:215`. **Lines 205 and 217 were never touched, and 215 was edited for the count
without either absolute being corrected in the same sentence.**

**What breaks.** A reader who does what `CLAUDE.md` instructs — *"§5 of that
document is the authority"* — reads §6 step 7 and is told in one paragraph that
28 facility transactions were validated on Devnet, and two paragraphs later that
none has been submitted. Both are live, neither is struck.

**Severity HIGH** rather than MEDIUM because of what it says about the round,
not only about the document: **a fix that missed a site the finding named by line
is not a partial success, it is an unfixed finding recorded as fixed** — and
`REVIEW-023c`'s summary sentence is itself now one of the false sentences this
round exists to catch.

**What would falsify this.** Showing those three sentences struck, or scoped as
explicitly historical in a way a reader cannot mistake. They are not: `:205`
carries live `⚠` emphasis and `:217` is an unqualified present-perfect
statement.

---

## S-2 — MEDIUM. **"Falling back to the public endpoint was available and was refused" is false in two places, and the run that made it false is recorded in the same documents.**

- `docs/architecture/ARCHITECTURE-2026-08-18.md:217`
- `CLAIMS.md` **E-148**, evidence column: *"**Falling back to the public endpoint
  was available and was refused**: the whole content of B-15's answer is that the
  public endpoint is not sufficient for the facility."*

The facility then ran **against the public endpoint** —
`https://s.devnet.rippletest.net:51234/`, in the saved run record — under the
owner's amendment, E-151. The fallback was not refused; it was ruled, taken, and
disclosed.

⚠ **The defensible version of the sentence exists and is narrower**: falling back
was refused *by the coding session, before the owner amended the ruling*. As
written, both sentences describe the project's final position, and the project's
final position is the opposite.

**Why this was missed twice.** Round one's C-6 sweep excluded lines mentioning
E-148 — and `CLAIMS.md`'s instance is **in E-148's own row**. That is the same
blind spot `REVIEW-023c` §4 item 4 named, surviving the fix that named it.

---

## S-3 — MEDIUM. **The count fix corrected six documents and left the seventh, which is the one a session actually loads.**

`.claude/agents/build-lead.md:40` still says **"27 validated transactions"**.
`docs/personas/build-lead.md:40` was corrected to *"28 validated facility
transactions"*.

`CLAUDE.md`: *"`docs/personas/` is canonical. `.claude/agents/` is generated from
it — regenerate whenever a persona changes or the two will drift."*

⚠ **This is a miss, not general drift, and the tree proves it**: `diff` over all
three personas returns **exactly one differing line in one file** — the line the
fix changed. `crypto-reviewer.md` and `protocol-researcher.md` are byte-identical
to their canonical sources. The convention is kept everywhere except where this
fix touched it.

**What breaks.** `.claude/agents/build-lead.md` is the file a build-lead subagent
is instantiated from. **The last stale "27" in the tree is in the file most
likely to be read by something that cannot check it**, and `bun tools/*` gates
none of this.

---

## S-4 — MEDIUM. **The getter fix is right about B-15's text and leaves the driver's console contradicting the record it writes.**

`underB15Conditions` is now `isLoopback && unflagged === 0`. `run-facility.ts`
calls `failHardControl()` on **every** run, and its arm B submits without the
flag — deliberately, and that is the point of the control.

**Therefore no run of `run-facility.ts` can ever record `underB15Conditions:
true`, including a run that is perfectly loopback.** Three consequences, none of
them recorded anywhere:

1. **§0 and §8 of the same run disagree.** `b15AtStart` is read before the
   control, so a loopback run prints
   `B-15 step-7   conditions MET — loopback` and then writes
   `underB15Conditions: false` with a note saying both halves were **not** in
   force for the whole run. Two outputs of one run, in one terminal, saying
   opposite things.
2. **`b15Note`'s third branch is unreachable from the driver.** *"loopback and
   every submission flagged: both halves of B-15's step-7 answer in force"* is
   prose no run of `run-facility.ts` can produce. It is reachable only from the
   unit test.
3. **The stamp no longer discriminates.** It was created to answer *"was this run
   under B-15's conditions"*. It now answers `false` for every run whatever, so
   the only thing that distinguishes the remote run from a future loopback one is
   `b15Note`'s prose — which is exactly the *"reason about it yourself"* the stamp
   existed to replace.

⚠ **The fix is not wrong.** B-15's Part C says *"whatever submits"* and names no
control-arm exception; recording `false` is the honest answer. **What is missing
is that nothing says the field is now constant**, and `facility/README.md` and
`CLAIMS.md` E-151 both still read as though it varies.

**A remedy, offered because I am reasonably confident and it is small:** record
**both halves separately** — `loopbackHalf` and `failHardHalf` — so the record
says *which* half was not in force, and derive `underB15Conditions` from the
pair. Then §0 can print what §8 will write.

**What would falsify this.** A path through `run-facility.ts` that skips
`failHardControl`. There is none: it is called unconditionally at the top level.

---

## S-5 — LOW. **A sentence written to explain the counter is false: `call` is not the only place that sees every RPC.**

`facility/src/loopback.ts`, on `private unflagged = 0`:

> *"⚠ Counted here because this is the only place that sees every RPC."*

`LoopbackLedger.probe` reaches the node through **`rawCall`**, not through
`call` — so the `server_info` every connection makes is an RPC `call` never
sees. **`rawCall` is the only place that sees every RPC**; `call` is the only
place that sees every RPC *made after the connection is open*.

**What breaks.** Nothing today — no submission goes through `probe`. What the
false sentence costs is the next reader: it says the counter is positioned where
nothing can get past it, and a `submit` added inside `loopback.ts` through
`rawCall` would not be counted. This is `CLAIMS.md` E-144's category — a sentence
written to explain a fix, overstating the fix.

---

## S-6 — LOW. **`facility/README.md`'s modules table still describes the pre-hatch behaviour, in the file whose obligation table was corrected for exactly that.**

Line 135: *"`src/loopback.ts` | The **only** ledger read path. **Refuses a
non-loopback literal**, refuses a non-Devnet node, refuses a node that is not
`full` …"*

Round one's C-6 corrected four *"refuses a remote endpoint"* sites — the
obligation table **two sections above this one in the same file**, the
architecture bullet, and `signer/README.md`. The modules table is the fifth and
was not in the finding's list, so it was not swept.

---

## Residuals — recorded, not findings

- **The accepted-branch test depends on how the host resolves `localhost`.**
  `facility/tests/risk-acceptance.test.ts` serves on `hostname: "127.0.0.1"` and
  connects to `http://localhost:<port>`. It passes here. On a host that resolves
  `localhost` to `::1` and does not fall back, it fails with
  `REFUSED_LEDGER_UNAVAILABLE` — an environmental failure in the one test that
  executes the hatch's accepting branch. Worth knowing before someone debugs it
  as a hatch defect.
- **The §10.5 wording test pins a string, not a claim.** It asserts the
  `"CAN establish"` paragraph does not contain `"§10.5"`. A reworded false
  sentence — *"that the four state changes the spec requires hold"* — passes it.
  The companion assertion that the disclosure contains *"does NOT establish
  XLS-0096 §10.5"* is what carries the weight. Acceptable, and recorded so a
  later session does not read it as stronger than it is.

## Checked and clean

- **The counts are right and I derived them before reading the justification.**
  From `~/.wconf/facility-book.json` and the saved run record: the book holds 25
  entries over **22 distinct hashes** (a Send is recorded twice, `send-out` and
  `send-in`, under one hash); **nine** are merges; the run record holds 27
  movements and **eight** merges. The union of the two is **28** distinct
  validated facility transactions, the missing one being the Dedicated Account's
  post-conversion merge `3F264EB8…`. **31** adds the two issuance-setup
  transactions and the control's unflagged arm. ⚠ The control's **flagged** arm
  is correctly excluded — it never validated, which is the whole finding it
  exists to demonstrate.
- **`convertFloat` returning `[m, merged]` does not double-count.** `mergeInbox`
  records its own book entry and returns the `Movement`; `note()` pushes to the
  driver's local array only. The book was always right; only the run record was
  short.

---

# Addendum — S-7, found after the Gemini leg was read

⚠ **Stated plainly so the independence claim above stays accurate: this one came
after `REVIEW-023e` was read.** It did not come *from* it — the Gemini leg says
nothing about ambient environment, and neither does the Codex leg — but the
sweep that produced it ran after, and a self-leg that quietly back-dates a
finding is doing the thing this project keeps catching.

## S-7 — HIGH. **With the acceptance sentence exported, `bun test facility tools` connects to the public Devnet endpoint from the test whose stated purpose is that it does not.**

The hatch is read from `process.env` **at call time**, and only
`facility/tests/risk-acceptance.test.ts` controls that environment — through its
own `withHatch` helper, which C-3's fix introduced. **Three older tests assert
the loopback refusal and control nothing:**

- `facility/tests/loopback.test.ts:96` — *"refuses a remote endpoint BEFORE it
  connects"*
- `facility/tests/boundary.test.ts:111` — *"refuses a non-loopback endpoint in
  the profile itself"*
- `facility/tests/facility.test.ts:180` — *"refuses a non-loopback ledger
  endpoint for the signer's own reads"*

**Executed, not reasoned.** With
`WCONF_ACCEPT_REMOTE_LEDGER_RISK="I accept CLAIMS.md F-23: a lying ledger source
publishes the amount"` exported — **which is exactly what `facility/README.md`
tells an operator to set, and what the shell that ran the facility on 2026-08-25
had set** — `bun test facility tools` gives **76 pass, 3 fail**, and the
`loopback.test.ts` failure is this:

```
error:
Expected promise that rejects
Received promise that resolved: Promise { <resolved> }
(fail) LoopbackLedger.open > refuses a remote endpoint BEFORE it connects [576.80ms]
```

**The promise RESOLVED.** `LoopbackLedger.open("https://s.devnet.rippletest.net:51234/")`
opened — the probe reached the public endpoint, got `server_info` back, and
returned a ledger. The 576 ms is the round trip.

**What concretely breaks.** Three things, worsening:

1. The suite fails for a reason nothing in it explains, on the machine most
   likely to run it.
2. **A unit test makes an outbound request to a public Devnet endpoint.** Its own
   comment is *"the refusal must not require the endpoint to answer: a facility
   that reached out to a remote host on the way to failing has already told that
   host what it was about to ask for."* Under the hatch it reaches out.
3. The three tests **pass today because of ambient environment, not because of
   anything they control** — which is `REVIEW-016` round two's category exactly,
   and the one `CLAUDE.md` says only a fresh reader catches.

**Attribution, honestly.** The hatch predates the fixes, so `d17b8ee` had this
too and **round one missed it** — round one asked *"find a path that reaches a
non-loopback endpoint WITHOUT the exact phrase"* and nobody asked the inverse.
What belongs to the fixes is narrower and still real: **C-3 built `withHatch`,
the exact tool this needs, and left it in the one file that did not need it
most.**

**Remedy, and I am confident about this one:** lift `withHatch` into a shared
test helper and wrap every test that asserts the refusal in `withHatch(undefined,
…)`. A test that asserts an environment-dependent refusal must own the
environment.

**What would falsify this.** A run of `bun test facility tools` with the sentence
exported that passes. It does not: 76 pass, 3 fail, reproduced twice.
