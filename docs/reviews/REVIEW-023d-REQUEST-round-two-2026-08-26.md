# REVIEW-023d — review packet, ROUND TWO. The FIXES, not the feature.

- **Date:** 2026-08-26
- **Under review:** commit **`7ec094d`** — round one's **seven fixes**, ~~eleven~~
  **20 paths** (17 excluding its three review artifacts). ⚠ **This packet said
  "eleven files", inheriting the number from `REVIEW-023c` without deriving it;
  the Codex leg counted 20 and was right. Corrected 2026-08-26.** The feature itself (`facility/`, and the executed run) was reviewed in
  round one at `d17b8ee` and is **not** your subject.
- **Round one:** `REVIEW-023b` (Codex, packet + read-only repository access,
  frozen tree), adjudicated in `REVIEW-023c`. Seven findings — 2 HIGH, 4 MEDIUM,
  1 LOW — **all upheld, none rejected, none stale**.
- **The tree is frozen at `c6a63ad` plus this packet, on branch
  `build/step-7-the-facility`, pushed.** Nothing will change under you while you
  read. Only `docs/reviews/` moved after `7ec094d`; every file under review is
  byte-identical to `7ec094d`.

> ## Why a second round exists here, stated so it is not treated as ceremony
>
> `CLAUDE.md`: *"Two rounds is the right number for a throwaway spike, and the
> second round reviews the FIXES. Fixing something and describing the fix are
> separate acts with separate failure modes, and only a fresh reviewer catches
> the second kind."*
>
> ⚠ **`REVIEW-023c` §5 originally ruled that no second round was owed. That
> section is struck, and it says why it was wrong**: it reasoned from the
> *category* of the changes — *"a getter replacing a field, a returned value that
> was discarded, one regex scoped to a paragraph, and a set of sentences
> corrected to say less"* — and ignored this session's own base rate, which is
> the opposite. **`REVIEW-022`'s fixes introduced two defects that `REVIEW-023`
> then found.**
>
> **Every second round this project has run has found something, and always one
> of exactly three kinds:**
>
> 1. **A defect introduced BY a fix.** `REVIEW-016` round two: a round-one fix
>    routed a retryable condition through a permanent-failure code, so *the one
>    condition most likely to clear itself told the client to give up.*
>    `REVIEW-023` C-3: a round-one fix's test connected to `127.0.0.1` and so
>    never reached the branch its own name promised.
> 2. **A test written for a round-one finding that passes for the WRONG
>    reason.** `REVIEW-016` round two produced two, caught only by spot-checking
>    reverts. `REVIEW-023` C-4: the wording tests pinned every paragraph of a
>    disclosure **except** the one that was false.
> 3. **A false sentence written ABOUT a fix.** `CLAIMS.md` **E-144** records
>    three of these in one commit. `REVIEW-023` C-7 found two more — both
>    fabricated absolutes written *inside a correction*.
>
> **Look for those three first.** ⚠ And note that round one's own LOW finding
> was kind 3 in the highest-risk possible location: a `CLAIMS.md` register row
> written to *explain* a finding. **This round's fixes added a new one —
> `CLAIMS.md` F-28.**

---

## 0. Ground rules

**Devnet-only research artifact.** Nothing here is secure, audited,
non-custodial or production-ready and no document may say otherwise
(`CLAIMS.md` P-5). Amount confidentiality is the only property claimed: not who
transacts (P-4), not who with, when or how often (P-11), and the issuer decrypts
every balance by construction (P-9). No benchmark number without hardware,
parameter set and methodology (P-8). No undated amendment claim (P-3).

**If you have a shell** (the Codex leg does; the Gemini leg does not): the
repository is at `$REPO`.
Read `git show 7ec094d`, `git log`, `CLAIMS.md`, `docs/reviews/REVIEW-023b` and
`REVIEW-023c`, and the live run record at `~/.wconf/facility-state.json` and
`~/.wconf/facility-book.json`. You may query Devnet read-only:
`https://s.devnet.rippletest.net:51234/`, JSON-RPC.

**If you do NOT have a shell:** every file under review is reproduced **in
full** in §6, and the run record's movement list is in §7. **Do not cite a line
number you have not read.** ⚠ `REVIEW-021`'s Gemini leg cited file paths with
line ranges it could not have read; the numbers were derivable from diff hunks
and the citations were fiction.

---

## 1. What round one found, and what was done about it

**Seven findings, all upheld, all fixed.** This is the list whose *fixes* you
are checking.

| # | Round-one finding | The fix |
|---|---|---|
| **C-1** HIGH | Four documents said the executed control *"removed F-23's consequence"*. It was a plaintext `Payment` producing `tecNO_AUTH` — no substituted key, no `ConfidentialMPTSend`, no `tecBAD_PROOF`, no attacker-key ciphertext. **And the leg found a second boundary nobody had seen: the flag stops a `tec` reaching the LEDGER, not the ciphertext reaching the NODE you submitted to** | Claims narrowed in `submit.ts`, `run-facility.ts` §1, `CLAIMS.md` E-149 — and a **new register row, `CLAIMS.md` F-28** |
| **C-2** HIGH | A run could be stamped `underB15Conditions: true` while having submitted **without** the flag: the stamp measured only loopback-ness, and `run-facility.ts` makes exactly one unflagged submission (the control's arm B) on every run | `underB15Conditions` is now a **getter, not a field**; `LoopbackLedger` counts unflagged `submit` calls; a new `b15Note` says which of three cases holds; a new test drives the transition |
| **C-3** MEDIUM | The hatch's **accepting branch was executed by no test**. The one that claimed to connected to `127.0.0.1` and never reached `assertRemoteRiskAccepted`; its name promised the accepted-remote outcome while its assertions proved the opposite stamp | The test now connects to `http://localhost:<port>` — deliberately classified **non**-loopback while still resolving locally — asserts the `false` stamp, and **captures stderr to prove the disclosure is emitted** |
| **C-4** MEDIUM | `REMOTE_LEDGER_DISCLOSURE` claimed a run *"CAN establish … XLS-0096 §10.5's state changes"* while `run-facility.ts`'s own header said it does not. **The wording tests skipped exactly that paragraph** | The paragraph now says the opposite, and a test pins it — scoped to the paragraph, after a first version matched the correction itself |
| **C-5** MEDIUM | *"27 validated transactions"*, in six documents, was wrong: `convertFloat` **awaited** the Dedicated Account's post-conversion merge and **discarded** the `Movement` it returned | `convertFloat` returns `Movement[]`; the count is **28** facility movements and **31** program-submitted validated transactions, and both now say what they count |
| **C-6** MEDIUM | **Nine live sentences still denied the execution or the hatch** — `run-facility.ts`, `facility.test.ts`, the `Makefile`, three `CLAIMS.md` cells, two in the architecture document, three saying the facility refuses remote endpoints without qualifying the hatch | Each rewritten |
| **C-7** LOW | F-27's explanation carried **two fabricated absolutes**: *"No unit test could have caught it"* and *"the first Devnet transaction refused to reconcile"* | Narrowed in `book.ts` and `CLAIMS.md` F-27; `book.test.ts` now encodes the rule the ledger established |

---

## 2. THE QUESTIONS

### Q1 (highest value). Did any fix introduce a defect?

Three of the seven fixes changed behaviour rather than prose. Take them in this
order.

**(a) `underB15Conditions` became a getter that ANDs in an unflagged-submission
counter.** This is the fix with the widest blast radius, because the stamp is
what a later reader trusts *instead of re-deriving*.

- `run-facility.ts` calls `failHardControl()` — which submits **once without the
  flag** — on **every** run, before the record is written. So trace it: **what
  value can the run record now carry, for any run whatsoever?** If the answer is
  *"`false`, always, including a perfect loopback run"*, then say what the field
  still discriminates and whether the fix has replaced a stamp that could lie
  with a stamp that cannot say anything.
- ⚠ **Read `run-facility.ts` §0's console output against §8's record for one
  hypothetical loopback run.** `b15AtStart` is read before the control; the
  record is written after it. Do the two now say different things about the same
  run, in the same terminal? Is either of them wrong?
- The counter lives in `LoopbackLedger.call` and fires on
  `method === "submit" && params.fail_hard !== true`. **What submission does that
  miss?** Consider `submit_multisigned`, a `fail_hard` passed as a string, a
  submit made through `rawCall` rather than `call`, a second `LoopbackLedger`,
  and `FailHardSubmitter` being handed a different ledger object.
- `b15Note` has three branches. **Is each sentence true in the state that
  produces it?**

**(b) `convertFloat` now returns `Movement[]` instead of `Movement`.** The point
was that a validated transaction was missing from the run record.

- Does the merge now appear **exactly once** in the run record, and does
  anything else count it twice? Check `note()`, `movements`, and the book.
- Is the **book** unchanged by this? `mergeInbox` recorded its movement in the
  book before this fix and still does — so is the book now double-recording, or
  was the book always right and only the run record wrong?
- Is `Promise<Movement[]>` handled correctly by **every** caller and by the
  §8 public/hidden partition at the end of the driver?

**(c) The new test reaches `http://localhost:<port>`, and `tools/check-loopback.ts`
gained an exemption for it.** The exemption's `literal` is `http://localhost:1`
and the gate *"normalises the port to 1"*.

- Does that normalisation let a **genuinely remote** literal through the gate
  somewhere else? Read `tools/check-loopback.ts` in §6 and answer from the code.
- Is the exemption's stated *reason* true?
- ⚠ **Does the test actually stay on the machine?** `localhost` is refused by
  `isLoopbackEndpoint` as a *name*, but the OS still resolves it. If a machine
  resolved `localhost` to something else, what would this test do?

### Q2. Does any test written for a round-one finding pass for the WRONG reason?

`REVIEW-016` round two found two of these and they were caught **only** by
spot-checking reverts — reading them was not enough. The tests written for
round-one findings are all in `facility/tests/risk-acceptance.test.ts` (§6.4):

- `"set exactly: it OPENS a remote-classified endpoint, stamps false, and discloses"`
- `"an unflagged submission takes the stamp down even on loopback"`
- `"does NOT claim §10.5's state changes, because the driver does not check them"`

For each, ask **not** *"does it pass?"* but **"would it fail for the reason its
name claims?"** Specifically:

- The stderr-capture test monkey-patches `process.stderr.write` for the duration.
  **What else writes to stderr inside that window?** If `open()` emitted nothing
  at all, would this test fail — or would something else in the buffer satisfy
  `toContain`?
- The unflagged-submission test asserts `true`, then `true` after a **flagged**
  submit, then `false` after an unflagged one. **Is the middle assertion load
  bearing, or does it pass because the fake node answers everything the same
  way?**
- The §10.5 test splits the disclosure on `"\n\n"` and checks that the
  `"CAN establish"` paragraph does not contain `"§10.5"`. **Reword the disclosure
  in your head to reintroduce the false claim without the literal string
  `§10.5`.** Does the test still pass? If it does, what is it pinning?

### Q3. Is any sentence written ABOUT a fix false? Start with `CLAIMS.md` F-28.

⚠ **F-28 is a register row written to EXPLAIN a finding, which is the exact
surface `CLAIMS.md` E-144 records three false sentences on.** It is new, it is
permanent, and no reviewer has seen it. It is reproduced in full in §7.2.

- Is F-28's **mechanism** right? It says the facility *"reads the destination's
  and the issuer's `HolderEncryptionKey` from an endpoint, builds a
  `ConfidentialMPTSend` encrypted to whatever it read, and then submits the
  signed blob to that same endpoint"*. **Check that against the code in §6** —
  who reads the keys, who builds the Send, who submits, and are they in fact the
  same endpoint? The signer reads the ledger for itself; does that change the
  claim, strengthen it, or weaken it?
- Is *"before the flag can prevent application or relay"* the right ordering
  claim? Is there any sense in which `fail_hard` reaches the node **before** the
  blob does?
- Is the row's scope right? It is stated as a **remote-source** problem. Is it
  **only** that? What about a loopback node that is compromised — does the row
  claim more or less than the code supports?
- ⚠ Its evidence column says **"Read at source and reasoned, NOT executed"**. Is
  that grading honest, and is *"what would settle it"* the right experiment?

Then the rest of the prose the fixes carry — **every one of these is a sentence
written today to explain a fix, and this project's base rate on those is bad**:

- `submit.ts`'s new *"⚠ It does NOT remove the consequence at the NODE"* block.
- `run-facility.ts` §1's new preamble about what the control does and does not
  establish.
- `loopback.ts`'s new comments on `unflagged`, `underB15Conditions` and
  `b15Note` — in particular *"because it is the only place that sees every
  RPC"*. **Is that true?**
- `facility.ts`'s *"A method that returns fewer movements than it made is a
  method whose count nobody can check."*
- `book.ts`'s replacement for the deleted absolute — it now says the arithmetic
  tests *"fail if `convert` credits `spending` again"*. **Do they?**
- `facility.test.ts`'s new header, which claims the file *"has now been wrong in
  BOTH directions"*.
- `CLAIMS.md` **E-149**'s narrowed caveat and **E-152**'s account of the round.
- `facility/README.md`'s new *"⚠ That number counts the facility's own
  movements"* paragraph, and its new hatch qualification in the obligation table.

### Q4. Is C-6's sweep COMPLETE?

Round one found **nine** live sentences denying the execution or the hatch. The
session's own contradiction sweep had already run and missed them, because it
**excluded lines mentioning E-148 and B-18** to cut noise — and that is where
several of the hits were. `REVIEW-023c` §4: *"an exclusion filter added to
reduce noise is a filter that hides the signal it was tuned against."*

**Sweep it again, wide, and read the hits.** The tree still contains many
sentences written before 2026-08-25. Which of them is now false? Consider — and
do not stop at — these shapes:

- *"not executed"*, *"never been run"*, *"has never"*, *"no facility transaction"*
- *"refuses a remote endpoint"* stated without the hatch
- *"27"*, *"seven merges"*, or any count the C-5 fix should have reached
- *"no unit test could"*, *"the first Devnet transaction"*, or any other absolute
  the C-7 fix should have reached
- Anything that reads the executed run as evidence about the **loopback**
  obligation or about **F-23**

⚠ **A fix that reached five of six sites is a defect, not a partial success**,
and round one's own findings cite specific files and lines. **Check that every
site a round-one finding named was actually changed.**

### Q5. Are the numbers right, and does each say what it counts?

The corrected claims are **28 validated facility transactions**, **31**
program-submitted validated transactions, and **nine merges**. §7.1 has the
run record's movement list and the book's, redacted of seeds.

**Derive the numbers yourself before reading the justification.** Then:

- Is *"28"* defensible as **validated**? One of the 28 is not in the run record
  at all — it is only in the book. What established that it validated?
- Is *"31"* right? It adds the two issuance-setup transactions and **the
  fail-hard control's unflagged arm**. Why is the **flagged** arm not in the
  count — and is that reasoning stated anywhere a reader would find it?
- The faucet fundings are excluded. Is that stated?
- ⚠ **The saved run record on disk still says 27**, because it is the record of
  the run that happened *before* the fix. Does any document claim the record
  says 28? Does any document need to say that it does not?

### Q6. Free hunt — on the fixes only.

Anything else in `7ec094d`. **Not** the facility itself and not the executed
run; those were round one. If you find nothing in a section, **say so
explicitly** — a clean section is a real result and a padded one is worse than
silence.

---

## 3. ⚠ SETTLED — do not reopen

Everything `REVIEW-022c`, `REVIEW-022g` and `REVIEW-023c` settled. In
particular:

| | Why |
|---|---|
| **The signer does not submit** | ADR-0001's trust boundary. `tapFailHard` cannot be a signed field (`CLAIMS.md` F-25), so the submitter is outside by construction |
| **`localhost` classified non-loopback by the facility** | Deliberate and stricter than the signer; `REVIEW-016` found two bypasses of the name-based check |
| **`URL`-canonicalised loopback forms (`2130706433`, `0177.0.0.1`, `127.1`) accepted** | They genuinely are loopback; `REVIEW-022`'s leg ran them and `loopback.test.ts` pins them |
| **The two-phase fail-hard control** | `REVIEW-022` round two found back-to-back arms indistinguishable; three ledger closes separate them now |
| **`sameEndpoint` comparing against the endpoint asked for** | Round one checked it in both directions and found no defect |
| **Convert → inbox → MergeInbox** | F-27, established **on the ledger**. Round one confirmed no code, test or document still credits a Convert to the spendable balance |
| **The facility holding every seed, `--auto-confirm`, no permissioned domain, no cover traffic** | Named non-goals, stated in `facility/README.md` |
| **`run-facility.ts` not asserting all four §10.5 state changes per movement** | Stated in the file and in `CLAIMS.md` B-18. Report it **only** if the statement of it is wrong |
| **The B-15 ruling and its amendments having had no adversarial review** | Known, recorded, and the rotation is scheduled after this round. Do not report it as a finding; **do** report any sentence that forgets it |

---

## 4. What a finding must look like

**The defect in one sentence. The file and the exact line or sentence. Why it is
wrong. What concretely breaks. A severity. What would falsify your claim.** A
remedy only if you are certain — `CLAIMS.md` records two occasions where a leg's
diagnosis was right and its proposed fix was backwards.

⚠ **Say which files you actually opened.** *"No finding"* on a question you did
not open a file for is not the same statement as *"no finding"*, and round one's
leg earned credit precisely by naming the four numbers it could **not** check
because outbound DNS was blocked in its sandbox.

---

## 5. What was executed after the fixes, and what was not

- **79 TypeScript tests, run twice, 0 fail** (`bun test facility tools`).
- `bunx tsc --noEmit` — clean. ⚠ `bun build` is **not** a type-check
  (`CLAIMS.md` E-145).
- `bun tools/check-loopback.ts` — PASS. 15 `.ts` files under `facility`, 43
  scheme-prefixed URL literals, 15 non-loopback, 3 recorded exemptions.
- `bun tools/check-blinding-sources.ts` — PASS. 5 deliberate call sites, 0
  unrecorded uses, 110 files scanned.
- `bun tools/check-amendments.ts` — **observed 2026-08-25T15:08:12Z**:
  `ConfidentialTransfer` ENABLED on Devnet.
- ⚠ **NO new Devnet transactions.** The fixes are stamp, count, test and prose
  changes. **Nothing about the wire format moved** — and if you think a fix
  *did* change what goes on the wire, say so, because that would need a run and
  it has not had one.
- ⚠ **`underB15Conditions` has still never been recorded `true` by an actual
  run**, because there has never been a loopback run: loopback is not payable on
  this hardware (`CLAIMS.md` E-148). **F-28 is read at source and reasoned, not
  executed.**

---

## 6. The files under review, in full

Reproduced verbatim from `7ec094d`, not as a diff. **Read the files; do not
trust this packet's summary of them.**

### 6.1 `facility/src/loopback.ts` — 497 lines

```typescript
/**
 * loopback.ts — the facility's ONLY ledger read path.
 *
 * # Why this module exists, and why it refuses rather than warns
 *
 * `CLAIMS.md` **B-15**'s step-7 gate was ruled by the project owner on
 * 2026-08-25: **the facility's ledger reads go to loopback.** Not "should"; the
 * ruling is what opened architecture §6 step 7 at all, and `REVIEW-019` is
 * explicit that *"we ran a local node once" is not the property* — the property
 * is that **every** read the facility makes goes to a node the operator runs.
 *
 * What it is defending against is `CLAIMS.md` **F-23**, and F-23 is
 * **executed**, not reasoned. A `ConfidentialMPTSend` encrypts the amount to
 * the destination's `HolderEncryptionKey` and the issuer's
 * `IssuerEncryptionKey`, **both read from the ledger**. A substituted key fails
 * the proof with `tecBAD_PROOF` — and a `tec` is *applied to the ledger* with
 * every ciphertext in it. On 2026-08-19 that was run on Devnet and the amount
 * **42 was recovered from public ledger data by the party who supplied the
 * wrong key**, while the intended destination could not decrypt it.
 *
 * So a lying ledger source does not cost a transaction. It costs the
 * confidentiality of the amount, permanently, in public. **TLS does not address
 * it** — TLS authenticates the channel to a node the operator chose, and a
 * hostile node lies just as well over TLS.
 *
 * # ⚠ What this module does NOT buy
 *
 * Nothing about the same-host adversary the issue #1 ruling put in scope. That
 * adversary can point this at a different endpoint, or edit the local node's
 * answers. The trust boundary is unchanged and `CLAIMS.md` P-5 still forbids
 * calling any of this secure.
 *
 * # Stricter than the signer, deliberately
 *
 * `signer/src/ledger.rs` accepts the *name* `localhost` as loopback. This
 * accepts only an **address**, never a name, because a name is resolved by
 * something this process does not control and there is no cost to requiring
 * the address. `REVIEW-016` found the hosts `127.attacker.example` and
 * `127.0.0.1@attacker.example` walking through the Rust check that exists
 * *because of* F-23. Those two shapes are negative test inputs in
 * `facility/tests/loopback.test.ts` — written there rather than quoted here, so
 * that they are executed rather than described.
 *
 * ⚠ **"Address" means what `URL` canonicalises to, and that is wider than a
 * dotted quad.** WHATWG `URL` folds `2130706433`, `0177.0.0.1`, `0x7f.1`,
 * `127.1`, a trailing dot and even Unicode digit forms all to `127.0.0.1`
 * before this check ever sees them, so **all of those are ACCEPTED** — and
 * correctly, because every one of them genuinely is loopback. An earlier
 * version of this comment said *"only a dotted-quad literal"* and the session's
 * own review leg then asserted those forms were **refused**, from reasoning
 * rather than from running them. `REVIEW-022`'s Codex leg ran them.
 * `facility/tests/loopback.test.ts` now pins them as accepted, so that a later
 * session cannot "tighten" the check into rejecting real loopback addresses.
 *
 * # ⚠ Redirects are refused, because a redirect is the whole check undone
 *
 * `fetch` follows redirects by default. A loopback endpoint answering `307`
 * could forward the POST — and every one after it — to a remote host, and
 * `LoopbackLedger.open`'s check would have passed on the original URL.
 * `signer/src/ledger.rs` sets `max_redirects(0)` for exactly this reason and
 * this file did not until `REVIEW-022`'s Codex leg found it.
 */

// ---------------------------------------------------------------------------
// The escape hatch, and everything about it is deliberate.
// ---------------------------------------------------------------------------

/**
 * The exact string `WCONF_ACCEPT_REMOTE_LEDGER_RISK` must hold before this
 * module will read a ledger anywhere but loopback.
 *
 * ⚠ **It is a sentence, not a `1`, and that is the point.** A flag that can be
 * set by muscle memory is a flag that gets set by muscle memory. Somebody has
 * to type this, and typing it is the acknowledgement.
 *
 * ⚠ **This does not make a remote endpoint safe. It makes it RECORDED.**
 * `CLAIMS.md` F-23 is executed: on 2026-08-19 an amount was recovered from
 * public ledger data by the party who supplied a wrong key. Nothing here
 * changes that; what changes is that a run which accepted the risk says so, in
 * its output and in its own run record.
 */
export const RISK_ACCEPTANCE_PHRASE =
  "I accept CLAIMS.md F-23: a lying ledger source publishes the amount";

/**
 * Printed to stderr, in full, on every run that uses the hatch.
 *
 * ⚠ **A constant with an asserted wording**, because `CLAIMS.md` E-126 records
 * that the one disclosure surface which was not a constant is where a false
 * sentence lived through a whole round of review — and `REVIEW-022` then found
 * this file's sibling citing a wording test that did not exist. This one has
 * `facility/tests/risk-acceptance.test.ts`.
 */
export const REMOTE_LEDGER_DISCLOSURE = [
  "⚠ THIS RUN IS NOT UNDER B-15's STEP-7 CONDITIONS.",
  "",
  "  The facility's ledger source is REMOTE and is trusted for amount",
  "  confidentiality. CLAIMS.md F-23 is EXECUTED, not theoretical: a source that",
  "  lies about a destination's HolderEncryptionKey makes the signer publish the",
  "  amount encrypted under the liar's key, permanently, in public. TLS does not",
  "  address it — it authenticates the channel to a node someone chose.",
  "",
  "  B-15's step-7 answer was AMENDED by the project owner on 2026-08-25 to",
  "  extend REVIEW-019's named risk acceptance to this demo. That amendment, like",
  "  the ruling it amends, has had NO adversarial review.",
  "",
  "  What a run under this hatch CAN establish: that the transactions serialise,",
  "  that rippled accepts them, that the balances decrypt to what the book",
  "  predicts, and what a full-ledger observer sees.",
  "",
  "  ⚠ It does NOT establish XLS-0096 §10.5's state changes. This sentence said it",
  "  did, while run-facility.ts's own header said it did not — REVIEW-023 found the",
  "  pair. The driver checks the outstanding-amount delta on the float conversion",
  "  and reconciles decrypted balances; there are no per-movement assertions over",
  "  the public amount or the balance version. CLAIMS.md B-18.",
  "",
  "  What it CANNOT establish: anything whatever about the loopback obligation.",
  "  Do not record a run under this hatch as evidence that the facility keeps it.",
].join("\n");

/** A read or a check that must stop the facility, distinct from a bug. */
export class LedgerRefusal extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "LedgerRefusal";
  }
}

/**
 * Is this endpoint a loopback literal?
 *
 * Parsing is delegated to `URL`, which is what strips userinfo (`user@host`)
 * and rejects an unterminated `[::1`. A hand-rolled split on `@`, `:` or `]`
 * is exactly how the Rust version acquired two holes.
 */
export function isLoopbackEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return false;
  // `URL.hostname` is the host with userinfo removed and IPv6 brackets kept.
  const host = url.hostname.toLowerCase();
  if (host === "[::1]") return true;
  // Only a dotted-quad literal in 127.0.0.0/8. A name — `localhost` included —
  // is resolved by something outside this process.
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const octets = m.slice(1).map(Number);
  if (octets.some((o) => o > 255)) return false;
  return octets[0] === 127;
}

/** The fields a facility read needs from one holder's `MPToken`. */
export interface MPTokenState {
  /** Public, plaintext MPT balance. Absent means zero. */
  publicAmount: number;
  /** 33-byte compressed ElGamal point, hex — absent until the holder Converts. */
  holderEncryptionKey?: string;
  confidentialBalanceSpending?: string;
  confidentialBalanceInbox?: string;
  /** Present as a JSON **string** when non-zero, absent when zero. */
  confidentialBalanceVersion: number;
}

export interface IssuanceState {
  issuer: string;
  /** ⚠ rippled serialises every `UINT64` as a JSON **string**. */
  confidentialOutstandingAmount: number;
  issuerEncryptionKey?: string;
  auditorEncryptionKey?: string;
  transferFee: number;
  flags: number;
}

/**
 * A pinned read.
 *
 * Two `"validated"` reads seconds apart land in **different ledgers** — E-103
 * observed it live against the public cluster. The index is taken once and
 * every later call carries that number, and every answer is checked to have
 * come from it. That check is the part `REVIEW-016` found *"asked for and never
 * checked"* in the Rust version.
 */
export class Snapshot {
  constructor(
    private readonly ledger: LoopbackLedger,
    readonly index: number,
  ) {}

  private async pinned(method: string, params: Record<string, unknown>): Promise<any> {
    const result = await this.ledger.call(method, { ...params, ledger_index: this.index });
    const answered = Number(result.ledger_index ?? result.ledger_current_index ?? NaN);
    if (answered !== this.index) {
      throw new LedgerRefusal(
        "REFUSED_LEDGER_TORN",
        `${method} answered from ledger ${answered}, not the pinned ${this.index}. ` +
          `A snapshot assembled from two ledgers is a state that never existed`,
      );
    }
    return result;
  }

  async sequenceOf(address: string): Promise<number> {
    const r = await this.pinned("account_info", { account: address });
    return Number(r.account_data.Sequence);
  }

  /** Every field of one holder's position, or `null` if they hold no MPToken. */
  async mptoken(address: string, issuanceId: string): Promise<MPTokenState | null> {
    let r: any;
    try {
      r = await this.pinned("ledger_entry", {
        mptoken: { mpt_issuance_id: issuanceId, account: address },
      });
    } catch (e) {
      if (e instanceof LedgerRefusal && e.code === "REFUSED_LEDGER_ENTRY_MISSING") return null;
      throw e;
    }
    const n = r.node;
    return {
      publicAmount: Number(n.MPTAmount ?? 0),
      holderEncryptionKey: n.HolderEncryptionKey,
      confidentialBalanceSpending: n.ConfidentialBalanceSpending,
      confidentialBalanceInbox: n.ConfidentialBalanceInbox,
      confidentialBalanceVersion: Number(n.ConfidentialBalanceVersion ?? 0),
    };
  }

  async issuance(issuanceId: string): Promise<IssuanceState> {
    const r = await this.pinned("ledger_entry", { mpt_issuance: issuanceId });
    const n = r.node;
    return {
      issuer: n.Issuer,
      // ⚠ **A JSON string, as rippled serialises every `UINT64`.** Reading it
      // with a numeric helper sees every value as absent, and a preflight check
      // that always passes looks identical to one that works. The signer has a
      // control test for exactly this; so does `facility/tests`.
      confidentialOutstandingAmount: Number(n.ConfidentialOutstandingAmount ?? 0),
      issuerEncryptionKey: n.IssuerEncryptionKey,
      auditorEncryptionKey: n.AuditorEncryptionKey,
      transferFee: Number(n.TransferFee ?? 0),
      flags: Number(n.Flags ?? 0),
    };
  }
}

export interface NodeIdentity {
  buildVersion: string;
  gitHash?: string;
  networkId: number;
  serverState: string;
  validatedIndex: number;
  /** Whether the endpoint is a loopback address. */
  isLoopback: boolean;
}

/** Devnet, and nothing else. `CLAUDE.md`'s hard rule, checked before any read. */
const DEVNET_NETWORK_ID = 2;

export class LoopbackLedger {
  private constructor(
    readonly endpoint: string,
    readonly identity: NodeIdentity,
  ) {}

  /**
   * Open the facility's ledger source.
   *
   * Refuses a non-loopback endpoint **before it connects**, so a misconfigured
   * facility cannot leak the shape of its reads to a remote host on the way to
   * failing.
   */
  static async open(endpoint: string): Promise<LoopbackLedger> {
    const loopback = isLoopbackEndpoint(endpoint);
    if (!loopback) assertRemoteRiskAccepted(endpoint);
    const identity = await LoopbackLedger.probe(endpoint);
    identity.isLoopback = loopback;
    if (identity.networkId !== DEVNET_NETWORK_ID) {
      throw new LedgerRefusal(
        "REFUSED_NOT_DEVNET",
        `network_id ${identity.networkId}, expected ${DEVNET_NETWORK_ID} (Devnet). ` +
          `This project never writes to any other network, at any phase, for any reason`,
      );
    }
    if (identity.serverState !== "full") {
      throw new LedgerRefusal(
        "REFUSED_NODE_NOT_FULL",
        `the local node reports server_state "${identity.serverState}". A node that is running ` +
          `is not a node that can answer a pinned read; wait for it with ` +
          `tools/loopback-node/node.sh wait`,
      );
    }
    return new LoopbackLedger(endpoint, identity);
  }

  private static async probe(endpoint: string): Promise<NodeIdentity> {
    const info = (await rawCall(endpoint, "server_info", {})).info;
    return {
      buildVersion: info.build_version,
      gitHash: info.git?.hash,
      networkId: Number(info.network_id),
      serverState: info.server_state,
      validatedIndex: Number(info.validated_ledger?.seq ?? 0),
      // Overwritten by `open`, which is the only caller and the only place that
      // knows whether the hatch was used. Defaulting to the SAFE answer here
      // means a future second caller that forgets cannot silently claim the
      // permissive one.
      isLoopback: false,
    };
  }

  /**
   * How many `submit` calls went out **without** `fail_hard`.
   *
   * ⚠ Counted here because this is the only place that sees every RPC. The
   * facility's own submitter cannot omit the flag, but `run-facility.ts`'s
   * fail-hard control deliberately makes one unflagged submission through
   * `call` — and B-15's Part C says *"whatever submits"*, with no control-arm
   * exception in the ruling's text.
   */
  private unflagged = 0;

  /**
   * ⚠ **Whether BOTH halves of B-15's step-7 answer were in force for the whole
   * of this connection's life.**
   *
   * Loopback **and** no unflagged submission. It measured only the first until
   * `REVIEW-023` pointed out that every run of `run-facility.ts` makes an
   * unflagged submission before the stamp is written — so a future loopback run
   * would have been recorded as *"both halves in force"* while having submitted
   * once without the flag. The stamp is what a later reader trusts instead of
   * re-deriving; a stamp that measures one half and claims two is worse than
   * none.
   *
   * ⚠ It is a **getter, not a field**, because the answer changes during the
   * run. Read it when you record, not when you connect.
   */
  get underB15Conditions(): boolean {
    return this.identity.isLoopback && this.unflagged === 0;
  }

  /** Why the answer above is what it is, in words a run record can carry. */
  get b15Note(): string {
    if (!this.identity.isLoopback) {
      return (
        "REMOTE endpoint under the accepted-risk hatch (CLAIMS.md E-151). The loopback half " +
        "of B-15's step-7 answer was NOT in force. This run is not evidence about the loopback " +
        "obligation (CLAIMS.md F-23)"
      );
    }
    if (this.unflagged > 0) {
      return (
        `loopback, but ${this.unflagged} submission(s) went out without tapFailHard — the ` +
        `fail-hard control's own second arm does this deliberately. B-15's Part C says ` +
        `"whatever submits" and names no exception, so both halves were not in force for the ` +
        `whole of this run`
      );
    }
    return "loopback and every submission flagged: both halves of B-15's step-7 answer in force";
  }

  async call(method: string, params: Record<string, unknown>): Promise<any> {
    if (method === "submit" && params.fail_hard !== true) this.unflagged++;
    return rawCall(this.endpoint, method, params);
  }

  /** Pin one validated index. Everything the facility reads comes from it. */
  async snapshot(): Promise<Snapshot> {
    const info = (await this.call("server_info", {})).info;
    const seq = Number(info.validated_ledger?.seq ?? 0);
    if (!Number.isInteger(seq) || seq <= 0) {
      throw new LedgerRefusal("REFUSED_NO_VALIDATED_LEDGER", "the node has no validated ledger");
    }
    return new Snapshot(this, seq);
  }

  /** The current (not yet validated) index, for `LastLedgerSequence`. */
  async currentIndex(): Promise<number> {
    const r = await this.call("ledger_current", {});
    return Number(r.ledger_current_index);
  }
}

/**
 * Refuse a non-loopback endpoint unless the risk has been accepted **by name**.
 *
 * ⚠ **Three refusals, not one.** An unset variable, a variable set to something
 * else, and the accepted case are different situations and a caller who gets
 * them confused is a caller who thinks they turned the hatch on. `REVIEW-013c`
 * §3a B-VII is the standing reason: a refusal a client renders as "please try
 * again" is a loud refusal made quiet.
 */
function assertRemoteRiskAccepted(endpoint: string): void {
  const accepted = process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
  if (accepted === RISK_ACCEPTANCE_PHRASE) {
    // stderr, not stdout: a disclosure that can be lost to a pipe is a
    // disclosure that will be.
    process.stderr.write(`\n${REMOTE_LEDGER_DISCLOSURE}\n\n  endpoint: ${endpoint}\n\n`);
    return;
  }
  if (accepted !== undefined) {
    throw new LedgerRefusal(
      "REFUSED_RISK_NOT_ACCEPTED",
      `WCONF_ACCEPT_REMOTE_LEDGER_RISK is set, but not to the acceptance sentence. It must be ` +
        `EXACTLY:\n\n    ${RISK_ACCEPTANCE_PHRASE}\n\n` +
        `A near miss is refused rather than accepted, because a hatch that opens on anything ` +
        `truthy is a hatch that opens by accident`,
    );
  }
  throw new LedgerRefusal(
    "REFUSED_NOT_LOOPBACK",
    `${endpoint} is not a loopback address. CLAIMS.md B-15's step-7 ruling requires the ` +
      `facility's ledger reads to go to a node the operator runs, and a remote endpoint ` +
      `reopens F-23 — which is executed, not theoretical. Start one with ` +
      `tools/loopback-node/node.sh start.\n\n` +
      `To proceed against a remote endpoint anyway — which the project owner amended B-15's ` +
      `answer to allow on 2026-08-25, for a Devnet demo with throwaway keys and NOT for ` +
      `anything else — set WCONF_ACCEPT_REMOTE_LEDGER_RISK to the acceptance sentence in ` +
      `facility/README.md. The run will say so in its output and in its own record`,
  );
}

/**
 * Whether two URLs name the same endpoint, ignoring the trailing slash `fetch`
 * adds to `response.url`.
 *
 * Exported so the comparison can be tested directly: the path that reaches it
 * in `rawCall` requires a runtime that ignores `redirect: "error"`, which is not
 * a state a test can produce — and an untestable check is one nobody finds out
 * is wrong until it fires in production, which is exactly what happened to its
 * first version.
 */
export function sameEndpoint(a: string, b: string): boolean {
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
}

async function rawCall(
  endpoint: string,
  method: string,
  params: Record<string, unknown>,
): Promise<any> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params: [params] }),
      // ⚠ **A redirect is the loopback check undone.** `fetch` follows them by
      // default; `307`/`308` preserve the method and body, so a loopback
      // responder could forward this POST to a remote host and every later
      // call with it. `error` makes the fetch reject instead.
      redirect: "error",
    });
  } catch (e) {
    throw new LedgerRefusal("REFUSED_LEDGER_UNAVAILABLE", `${method}: ${String(e)}`);
  }
  // Belt as well as braces: if a runtime ever honoured a redirect anyway, the
  // response carries the final URL and it must be the one we asked.
  //
  // ⚠ **This compared against LOOPBACK-ness until the first run under the
  // accepted-risk hatch, and that was wrong in both directions.** It refused
  // every remote endpoint even when the risk had been accepted — which is how
  // it was found, by running the artifact rather than by reading it — and it
  // would have *accepted* a redirect from one loopback port to another. The
  // invariant a redirect violates is "the answer came from where I asked", and
  // that is what this checks now. `CLAIMS.md` E-139: running the artifact
  // catches what a fix leaves standing.
  if (response.url && !sameEndpoint(response.url, endpoint)) {
    throw new LedgerRefusal(
      "REFUSED_REDIRECTED",
      `${method}: asked ${endpoint} and the answer came from ${response.url}. A redirect is ` +
        `the endpoint check undone`,
    );
  }
  if (!response.ok) {
    throw new LedgerRefusal("REFUSED_LEDGER_UNAVAILABLE", `${method}: HTTP ${response.status}`);
  }
  const body: any = await response.json();
  const result = body.result;
  if (!result) throw new LedgerRefusal("REFUSED_LEDGER_MALFORMED", `${method}: no result`);
  if (result.status === "error") {
    // `entryNotFound` is an answer, not a failure — a holder who has not opted
    // in has no `MPToken`, and the caller distinguishes that from a broken read.
    const code = result.error === "entryNotFound" || result.error === "objectNotFound"
      ? "REFUSED_LEDGER_ENTRY_MISSING"
      : "REFUSED_LEDGER_ERROR";
    throw new LedgerRefusal(code, `${method}: ${result.error} ${result.error_message ?? ""}`);
  }
  return result;
}
```

### 6.2 `facility/src/submit.ts` — 198 lines

```typescript
/**
 * submit.ts — the facility's ONLY submission path, and it always sets
 * `tapFailHard`.
 *
 * # The second half of B-15's step-7 ruling
 *
 * Ruled 2026-08-25: loopback for the facility's reads, **and `tapFailHard` set
 * by whatever submits — which is NOT the signer**. The signer signs and hands
 * back a blob; *"the signer reads the ledger and still does not write to it"*
 * is a trust-boundary claim architecture §1 says is load-bearing in both
 * halves, and putting a submitter inside it would be a different system from
 * the one ADR-0001 accepted. So the submitter lives here, outside.
 *
 * # What the flag does, read at source rather than assumed
 *
 * rippled 3.3.0 (`00a178f`, the same commit `CLAIMS.md` F-23 was read at):
 *
 * * `src/xrpld/rpc/handlers/transaction/Submit.cpp:32-37` — the `submit` RPC's
 *   `fail_hard` parameter becomes `NetworkOPs::FailHard`.
 * * `src/xrpld/app/misc/NetworkOPs.cpp:1683-1684` — `FailHard::Yes` sets
 *   `TapFailHard` in the flags the transaction is applied under.
 * * `src/libxrpl/tx/Transactor.cpp:1645-1651` —
 *   `if (isTecClaim(result) && (view().flags() & TapFailHard))` then
 *   `ctx_.discard(); applied = false;`, under the comment *"If the TapFailHard
 *   flag is set, a tec result must not do anything"*.
 * * `NetworkOPs.cpp:1833` — `enforceFailHard` also stops the transaction being
 *   kept locally **or relayed to peers**, so a `tec` never reaches the network.
 *
 * That removes F-23's consequence **at the ledger**: a `tecBAD_PROOF` no longer
 * publishes its ciphertexts.
 *
 * ⚠ **It does NOT remove the consequence at the NODE.** The blob is submitted
 * to an endpoint, and under a remote ledger source that endpoint is the same
 * one whose keys the transaction was built against — so a lying source receives
 * the ciphertext encrypted under its own key before the flag can prevent
 * anything. `CLAIMS.md` **F-28**. With loopback the node is the operator's own
 * and the question does not arise, which is why the ruling calls loopback the
 * protection and this the seatbelt.
 *
 * # ⚠ Where this stops, stated because a flag looks like a guarantee
 *
 * * **It is a convention, not a property.** `REVIEW-019` named a `tapFailHard`
 *   submitter as *"a real F-23 mitigation nobody had named"*, and the decision
 *   request is equally clear that **nothing forces a separate submitter to set
 *   the flag**. This module cannot be asked not to; another submitter can
 *   simply not be this module. **Loopback is the half that removes the risk;
 *   this is a seatbelt that only helps if someone buckles it.**
 * * **It covers `tec`, not `tem`/`tef`/`ter`.** Those were never applied.
 * * **It does not make a wrong read right.** The transaction still fails; what
 *   changes is that it fails *without publishing*.
 * * **The ruling had no adversarial review.** It is not one of `REVIEW-019`'s
 *   three options as stated — it is A plus a reading of C.
 */
import { encode, encodeForSigning } from "ripple-binary-codec";
import { deriveKeypair, deriveAddress, sign } from "ripple-keypairs";
import type { LoopbackLedger } from "./loopback.ts";
import { LedgerRefusal } from "./loopback.ts";

export interface SubmitResult {
  engineResult: string;
  engineMessage: string;
  hash: string;
  /** What the node did with it. Under fail-hard a `tec` reports `false`. */
  applied: boolean;
  blob: string;
}

/**
 * ⚠ **There is no `failHard` parameter anywhere in this file, and that is the
 * enforcement.** A caller cannot ask for a submission without it, because
 * there is no way to express the request. `REVIEW-021` is the reason to prefer
 * that shape: three false sentences were written to explain fixes, one of them
 * excusing a defect on the grounds that *"the typed builder cannot produce
 * one"* when it could. A property enforced by there being no other constructor
 * cannot decay into a property enforced by everyone remembering.
 */
export class FailHardSubmitter {
  constructor(private readonly ledger: LoopbackLedger) {}

  /** Submit an already-signed blob — what the signer hands back. */
  async submitBlob(blob: string): Promise<SubmitResult> {
    const r = await this.ledger.call("submit", { tx_blob: blob, fail_hard: true });
    const engineResult = String(r.engine_result ?? "(none)");
    return {
      engineResult,
      engineMessage: String(r.engine_result_message ?? ""),
      hash: String(r.tx_json?.hash ?? ""),
      applied: r.applied === true,
      blob,
    };
  }

  /**
   * Build and sign a **plaintext** transaction. **It does not submit.**
   *
   * ⚠ **Signing and submitting are separate on purpose, and they were not in
   * the first draft of this file.** `signAndSubmit` did both, so every caller
   * that wanted a validated result submitted the blob a second time through
   * `submitValidated` — a double submission whose second attempt could only
   * fail. Found by reading this file against its callers rather than by a test,
   * which is the reason to read the whole file (`CLAIMS.md` E-139).
   *
   * Splitting it also leaves exactly **one** path to the network, which is what
   * makes "no path omits `tapFailHard`" a property of the shape rather than of
   * everyone remembering.
   *
   * ⚠ **Only for transactions that carry no proof and no blinding factor** —
   * `MPTokenIssuanceCreate`, `MPTokenIssuanceSet`, `MPTokenAuthorize`,
   * `Payment`, `ConfidentialMPTMergeInbox`. Everything that publishes an `r`
   * is built, proved and signed by `signer/`, under the ruled `r`/`ρ`
   * derivation, and reaches this class as a finished blob.
   *
   * ⚠ **This holds a seed, and that is a property of the facility's operator
   * roles rather than of the holder signer.** Devnet throwaways only.
   */
  async sign(
    tx: Record<string, unknown>,
    seed: string,
    opts: { fee?: string } = {},
  ): Promise<string> {
    const kp = deriveKeypair(seed);
    const address = deriveAddress(kp.publicKey);
    const snapshot = await this.ledger.snapshot();
    const current = await this.ledger.currentIndex();
    const filled: Record<string, unknown> = {
      ...tx,
      Account: tx.Account ?? address,
      Sequence: tx.Sequence ?? (await snapshot.sequenceOf(address)),
      Fee: tx.Fee ?? opts.fee ?? "5000",
      // ⚠ **Not read-index + 20.** `REVIEW-016` found both legs independently
      // catching that borrowing `xrpl.js`'s autofill window is wrong when
      // anything sits between building and signing. Nothing human sits here,
      // but a Devnet cluster's ledgers close in ~4s and this process talks to
      // a node that may still be catching up.
      LastLedgerSequence: tx.LastLedgerSequence ?? current + 60,
      SigningPubKey: kp.publicKey,
    };
    // ⚠ **No `NetworkID` on Devnet** — `CLAIMS.md` F-21.
    const signed = { ...filled, TxnSignature: sign(encodeForSigning(filled), kp.privateKey) };
    return encode(signed);
  }

  /**
   * Wait for a hash to be validated.
   *
   * Returns the `tx` result, or `null` if it never validated inside the window
   * — which is an outcome, not an exception: a transaction that was discarded
   * under fail-hard will never validate, and that is the point.
   */
  async waitValidated(hash: string, tries = 40): Promise<any | null> {
    for (let i = 0; i < tries; i++) {
      await Bun.sleep(1500);
      try {
        const r = await this.ledger.call("tx", { transaction: hash });
        if (r.validated) return r;
      } catch (e) {
        if (!(e instanceof LedgerRefusal)) throw e;
        // `txnNotFound` until it is in a closed ledger. Keep waiting.
      }
    }
    return null;
  }

  /**
   * Submit, wait for validation, and require `tesSUCCESS` **in the validated
   * metadata**.
   *
   * ⚠ **The engine result at submit time is PROVISIONAL and the two can
   * differ.** `submit` reports what happened when the transaction was applied
   * to this node's open ledger; what settles it is `TransactionResult` in the
   * metadata of the validated transaction. Checking only the provisional
   * answer is how a facility comes to record a movement for a transaction that
   * ended up `tec` — and the book would then be wrong by exactly that amount,
   * permanently, with every later reconciliation blaming the wrong thing.
   */
  async submitValidated(blob: string, what: string): Promise<{ hash: string; tx: any }> {
    const res = await this.submitBlob(blob);
    if (!res.engineResult.startsWith("tes")) {
      throw new LedgerRefusal(
        "REFUSED_NOT_APPLIED",
        `${what}: ${res.engineResult} ${res.engineMessage}` +
          (res.engineResult.startsWith("tec")
            ? ` — discarded rather than applied, because this submitter sets tapFailHard`
            : ""),
      );
    }
    const tx = await this.waitValidated(res.hash);
    if (!tx) throw new LedgerRefusal("REFUSED_NEVER_VALIDATED", `${what}: ${res.hash}`);
    const finalResult = tx.meta?.TransactionResult ?? tx.metaData?.TransactionResult;
    if (finalResult !== "tesSUCCESS") {
      throw new LedgerRefusal(
        "REFUSED_NOT_APPLIED",
        `${what}: validated as ${finalResult}, though submit reported ${res.engineResult}`,
      );
    }
    return { hash: res.hash, tx };
  }
}
```

### 6.3 `facility/run-facility.ts` — 577 lines

```typescript
/**
 * run-facility.ts — architecture §6 step 7, the facility end to end.
 *
 * ⚠ **This header said "executed on Devnet" before this script had ever been
 * run, and then said "it has still never been run" after it had.** Both were
 * false when read. It HAS run — 28 validated facility transactions on Devnet,
 * 2026-08-25 — **and not under B-15's step-7 conditions**: the ledger source
 * was remote under the owner's amendment (`CLAIMS.md` E-151), so `tapFailHard`
 * was in force and loopback was not. A file that describes what it is *for* as
 * though it were what it *did* is the failure this project keeps paying for,
 * and a file that keeps a stale denial is the same failure with the sign
 * flipped.
 *
 * The whole of `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md` §3, driven
 * end to end: the issuance, the Dedicated Account, the one plaintext
 * conversion, supplier enrolment, drawdowns, repayments, and retirement in
 * tranches — with **every ledger read against a loopback node** and **every
 * submission carrying `tapFailHard`**, which is what `CLAIMS.md` B-15's step-7
 * ruling obliges.
 *
 * ⚠ **Prerequisites, and the run refuses without them:**
 *
 *   tools/rebuild-env.sh                    # the vendored prover
 *   (cd signer && cargo build)              # the signer binary
 *   tools/loopback-node/node.sh start       # OUR OWN rippled, syncing Devnet
 *   tools/loopback-node/node.sh wait        # until it reports `full`
 *
 *   bun facility/run-facility.ts --auto-confirm [--fresh]
 *
 * ⚠ **`--auto-confirm` is REQUIRED, not optional**, and the run refuses without
 * it. This driver forwards neither the signer's confirmation prompt nor an
 * operator's reply, so without the flag nothing could ever answer. Refusing is
 * better than hanging and much better than auto-confirming quietly: the flag is
 * how a run says out loud that it answered a human's question itself.
 *
 * ⚠ **`tesSUCCESS` is not the evidence, and this script does NOT yet keep
 * E-131's full standard.** ConvertBack's Devnet run checked all four of
 * XLS-0096 §10.5's state changes — public `MPTAmount`, the issuance's
 * `ConfidentialOutstandingAmount`, `ConfidentialBalanceVersion`, and the
 * **decrypted** remainder — against ledger state before and after. What this
 * script does is narrower: it checks the `ConfidentialOutstandingAmount` delta
 * on the float conversion, and it **reconciles the decrypted balance** after
 * every confidential movement, which is the check the balance book makes
 * anyway. **There are no per-movement assertions over the public amount or the
 * balance version.**
 *
 * ⚠ An earlier version of this header claimed all four, on every movement.
 * `REVIEW-022`'s Codex leg found it. **Closing that gap is the first thing to do
 * when the loopback node finishes syncing** — it is `CLAIMS.md` B-18's list.
 *
 * ⚠ **Devnet throwaways.** Nothing here is secure, audited, non-custodial or
 * production-ready (`CLAIMS.md` P-5), and nothing should ever hold value.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { FacilityBook } from "./src/book.ts";
import { faucetAccount } from "./src/devnet-accounts.ts";
import { Facility, type Movement, type Party } from "./src/facility.ts";
import { LoopbackLedger } from "./src/loopback.ts";
import { standaloneKeypair } from "./src/mptool.ts";
import { AUTO_CONFIRM_NOTICE } from "./src/signer.ts";
import { FailHardSubmitter } from "./src/submit.ts";

const AUTO = process.argv.includes("--auto-confirm");
const FRESH = process.argv.includes("--fresh");
// ⚠ Named for what it IS, not for what it should be. It was
// `WCONF_LOOPBACK_ENDPOINT` until the hatch existed, at which point a variable
// called "loopback" holding a remote host would have been a lie in the one
// place a reader looks to find out which node was used.
const ENDPOINT = process.env.WCONF_FACILITY_ENDPOINT ?? "http://127.0.0.1:5005";

/**
 * ⚠ **State lives OUTSIDE `/tmp`.** `/tmp/wconf/state.json` has now been lost
 * twice — once to a `/tmp` clean five days after it was written, once mid-session
 * (`CLAIMS.md` E-97, E-133). These seeds cannot be regenerated and the accounts
 * cannot be driven without them.
 */
const STATE_DIR = `${homedir()}/.wconf`;
const STATE = `${STATE_DIR}/facility-state.json`;
const BOOK = `${STATE_DIR}/facility-book.json`;
const WORK = "/tmp/wconf/facility";

/** The facility's own numbers. Small, because a Devnet run pays for every unit. */
const FLOAT = 5_000;
const ENROLMENT_TOKEN = 10;
const FULL_RANGE = 20_000;

interface State {
  issuanceId?: string;
  issuerElGamal?: { sk: string; pk: string };
  bank?: Party;
  dedicated?: Party;
  suppliers?: Party[];
  runs?: unknown[];
}

const state: State = existsSync(STATE) && !FRESH ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const save = () => {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE, JSON.stringify(state, null, 2));
};

const die = (m: string): never => {
  console.error(`\n✗ ${m}`);
  process.exit(1);
};
const rule = (t: string) => console.log(`\n${"─".repeat(72)}\n${t}\n${"─".repeat(72)}`);

// ---------------------------------------------------------------------------
// 0. The node. B-15's step-7 ruling in one connection.
// ---------------------------------------------------------------------------
rule("0. The ledger source");

const ledger = await LoopbackLedger.open(ENDPOINT).catch((e) =>
  die(
    `${e}\n\n  B-15's step-7 ruling requires the facility's ledger reads to go to a node the\n` +
      `  operator runs. Start one:\n\n` +
      `    tools/loopback-node/node.sh start\n    tools/loopback-node/node.sh wait\n\n` +
      `  ⚠ Do NOT point this at a public endpoint. The whole ruling is that the public\n` +
      `  endpoint is not sufficient here — CLAIMS.md F-23 is executed, not theoretical.`,
  ),
);
// ⚠ Read at the point of PRINTING, and again at the point of RECORDING. It is a
// getter now, not a field: the fail-hard control's second arm submits without
// the flag, so the answer changes during the run.
const b15AtStart = ledger.underB15Conditions;
const b15 = b15AtStart;
console.log(`  endpoint      ${ENDPOINT}  ${b15 ? "(loopback — our own node)" : "⚠ REMOTE"}`);
console.log(`  rippled       ${ledger.identity.buildVersion} ${ledger.identity.gitHash ?? ""}`);
console.log(`  network_id    ${ledger.identity.networkId}  (Devnet)`);
console.log(`  server_state  ${ledger.identity.serverState}`);
console.log(`  validated     ${ledger.identity.validatedIndex}`);
console.log(`  B-15 step-7   ${b15 ? "conditions MET — loopback" : "⚠ NOT MET — risk accepted by name"}`);
console.log(
  b15
    ? `\n  ⚠ Loopback removes the risk F-23 names; tapFailHard removes its consequence.\n` +
        `    Neither is enforced by the signer, and nothing forces a DIFFERENT submitter to\n` +
        `    set the flag — that half is a convention, not a property.`
    : `\n  ⚠ Only ONE half of B-15's answer is in force on this run. tapFailHard is set on\n` +
        `    every submission and removes the CONSEQUENCE of a wrong read; the loopback half,\n` +
        `    which removes the RISK at its source, is not in force. The disclosure above says\n` +
        `    what that means. Every result below is stamped accordingly.`,
);
if (AUTO) {
  console.log(`\n  ${AUTO_CONFIRM_NOTICE}`);
} else {
  // ⚠ **Without the flag this run cannot be confirmed by anybody.** The signer
  // child's stdio are pipes, this driver forwards neither its prompt nor the
  // operator's reply, and the only code that writes `CONFIRM` runs when
  // `--auto-confirm` is set. The CLI presented the flag as optional and it is
  // not; `REVIEW-022`'s Codex leg found that the un-flagged path simply hangs.
  // Refusing is better than hanging, and better than quietly auto-confirming.
  die(
    "this driver has no path for a human to answer the signer's confirmation: the daemon's\n" +
      "  stdio are pipes and nothing forwards them. Re-run with --auto-confirm and read what it\n" +
      "  prints about what that costs, or drive one transaction by hand with the signer in your\n" +
      "  own terminal (see signer/README.md).",
  );
}

const submitter = new FailHardSubmitter(ledger);

// ---------------------------------------------------------------------------
// 1. tapFailHard, executed. Both arms, or the claim is decoration.
// ---------------------------------------------------------------------------
rule("1. tapFailHard — executed, both arms");

console.log(
  `  rippled 3.3.0 Transactor.cpp:1645-1651 — "If the TapFailHard flag is set, a tec\n` +
    `  result must not do anything". That is READ AT SOURCE. What follows executes it in\n` +
    `  both directions, because an arm that only ever passes proves nothing about the flag.\n\n` +
    `  ⚠ What is executed is ONE tec: a tecNO_AUTH from a plaintext Payment. It is NOT an\n` +
    `    F-23 transaction — no substituted key, no ConfidentialMPTSend, no tecBAD_PROOF, no\n` +
    `    attacker-key ciphertext. The step from "this tec" to "any tec" is the source\n` +
    `    reading above, not this run. CLAIMS.md F-28.\n` +
    `  ⚠ And the flag stops a tec reaching the LEDGER, not the ciphertext reaching the NODE\n` +
    `    you submitted to — which under a remote source is the node F-23 is about.`,
);

async function failHardControl(bank: Party, issuanceId: string): Promise<void> {
  // A Payment of an MPT to an account that never opted in is a `tec`. It needs
  // no proof and no blinding factor, so it exercises the flag and nothing else.
  const stranger = await faucetAccount("stranger", ledger);
  const before = await (await ledger.snapshot()).sequenceOf(bank.address);

  const tx = {
    TransactionType: "Payment",
    Destination: stranger.address,
    Amount: { mpt_issuance_id: issuanceId, value: "1" },
  };

  // ⚠ **TWO PHASES, NOT TWO SUBMISSIONS.** The first version of this control
  // submitted the same blob with the flag and then without it, back to back,
  // and only looked at the ledger afterwards — so a run in which the FLAGGED
  // arm was wrongly applied and the unflagged one bounced as a duplicate was
  // indistinguishable from the intended result, and the script printed
  // `✓ The flag is the difference` on the exact failure it exists to detect.
  // Found by REVIEW-022 round two and, independently, by its Codex leg.
  //
  // So arm A is submitted, the ledger is allowed to close, and the transaction
  // must be ABSENT before arm B is submitted at all.
  const blob = await submitter.sign(tx, bank.seed);

  const withFlag = await submitter.submitBlob(blob);
  console.log(`\n  arm A, tapFailHard set:  ${withFlag.engineResult}  applied=${withFlag.applied}`);
  if (!withFlag.engineResult.startsWith("tec")) {
    die(`the control needs a tec from arm A and got ${withFlag.engineResult}`);
  }
  if (withFlag.applied) {
    die("arm A reported applied=true with tapFailHard set — the flag did not do what E-149 reads");
  }

  const onLedger = async () =>
    ledger
      .call("tx", { transaction: withFlag.hash })
      .then((r) => !!r.validated)
      .catch(() => false);

  await waitLedgers(3);
  const afterArmA = await onLedger();
  const seqAfterArmA = await (await ledger.snapshot()).sequenceOf(bank.address);
  console.log(`  after 3 ledger closes:   on the validated ledger? ${afterArmA ? "YES" : "no"}`);
  if (afterArmA) {
    die(
      "arm A's tec reached a validated ledger WITH tapFailHard set. That contradicts rippled " +
        "3.3.0 Transactor.cpp:1645-1651 as this project read it (CLAIMS.md E-149) and it is the " +
        "finding, not a failed run",
    );
  }

  // Arm B — the SAME bytes, WITHOUT the flag. ⚠ Deliberately bypasses
  // `FailHardSubmitter`, because the whole point of that class is that it
  // cannot do this. It is the one submission under `facility/` that omits the
  // flag, and `facility/README.md` says so.
  const rawResult = await ledger.call("submit", { tx_blob: blob });
  console.log(
    `  arm B, no flag:          ${rawResult.engine_result}  applied=${rawResult.applied === true}`,
  );
  await waitLedgers(3);
  const afterArmB = await onLedger();
  const seqAfterArmB = await (await ledger.snapshot()).sequenceOf(bank.address);

  console.log(`\n  the SAME transaction, ${withFlag.hash.slice(0, 16)}…`);
  console.log(`    after arm A: on ledger ${afterArmA ? "YES" : "no"}, Sequence ${before} → ${seqAfterArmA}`);
  console.log(`    after arm B: on ledger ${afterArmB ? "YES" : "no"}, Sequence ${seqAfterArmA} → ${seqAfterArmB}`);

  if (afterArmB) {
    console.log(
      `\n  ✓ The flag is the difference, and the two arms are DISTINGUISHABLE because they were\n` +
        `    separated by ledger closes. Arm A set tapFailHard and its tec never reached a\n` +
        `    validated ledger; arm B did not set it and the SAME bytes were applied. That is\n` +
        `    F-23's mechanism: a tec is written to the ledger WITH ITS CIPHERTEXTS unless the\n` +
        `    submitter set the flag. Here the payload is a plaintext Payment, so nothing\n` +
        `    confidential leaked; on a ConfidentialMPTSend it would be the amount, permanently.`,
    );
  } else {
    console.log(
      `\n  ⚠ INCONCLUSIVE — and that is a result, not a pass. Arm A was correctly absent, but\n` +
        `    arm B did not reach a validated ledger either, so nothing here distinguishes "the\n` +
        `    flag discarded it" from "these bytes were never going to land". Do not write this\n` +
        `    run down as evidence for tapFailHard.`,
    );
  }
}

/** Wait for `n` ledger closes on our own node, rather than for a wall-clock guess. */
async function waitLedgers(n: number): Promise<void> {
  const start = await ledger.currentIndex();
  for (let i = 0; i < 120; i++) {
    await Bun.sleep(1000);
    if ((await ledger.currentIndex()) >= start + n) return;
  }
  die(`the node did not close ${n} ledgers in two minutes`);
}

// ---------------------------------------------------------------------------
// 2. Setup — the accounts and the issuance. Walkthrough §3 steps 1 and 2.
// ---------------------------------------------------------------------------
rule("2. The bank, the issuance and the Dedicated Account");

state.bank ??= await faucetAccount("bank", ledger);
state.dedicated ??= await faucetAccount("dedicated", ledger);
save();
console.log(`  bank (issuer)      ${state.bank!.address}`);
console.log(`  Dedicated Account  ${state.dedicated!.address}`);
console.log(
  `  ⚠ Two accounts, and that is a PROTOCOL constraint: an issuer cannot convert its\n` +
    `    own issuance into a confidential balance. "Dedicated Account", never "vault".`,
);

if (!state.issuanceId) {
  // ⚠ `TransferFee` is absent, which is 0. A confidential issuance REQUIRES it
  // to be zero; fees and interest settle off-ledger or as separate confidential
  // transfers, and that is a protocol constraint rather than a design choice.
  const create = await submitter.submitBlob(
    await submitter.sign(
      {
        TransactionType: "MPTokenIssuanceCreate",
        AssetScale: 0,
        MaximumAmount: "1000000000",
        Flags: 0x20 | 0x40, // tfMPTCanTransfer | tfMPTCanClawback
      },
      state.bank!.seed,
    ),
  );
  if (!create.engineResult.startsWith("tes")) die(`issuance create: ${create.engineResult}`);
  const tx = await submitter.waitValidated(create.hash);
  const meta = tx?.meta ?? tx?.metaData;
  if (meta?.TransactionResult !== "tesSUCCESS") {
    die(`issuance create validated as ${meta?.TransactionResult ?? "(never)"}`);
  }
  state.issuanceId =
    meta?.mpt_issuance_id ??
    (meta?.AffectedNodes ?? [])
      .map((n: any) => n.CreatedNode)
      .find((c: any) => c?.LedgerEntryType === "MPTokenIssuance")?.LedgerIndex;
  if (!state.issuanceId) die("the issuance was created but its id could not be read from metadata");

  // The issuer's decryption mirror. ⚠ It is MANDATORY — no configuration
  // removes it, and any design that assumes otherwise is wrong about the
  // protocol (P-9). Its key comes from the library's CSPRNG: the ruled
  // derivation is about a HOLDER's key, and using it here would be this
  // project's choice rather than the ruling's, so it is not made silently.
  state.issuerElGamal = await standaloneKeypair();
  const set = await submitter.submitBlob(
    await submitter.sign(
      {
        TransactionType: "MPTokenIssuanceSet",
        MPTokenIssuanceID: state.issuanceId,
        Flags: 256, // tfMPTSetCanHoldConfidentialBalance
        IssuerEncryptionKey: state.issuerElGamal.pk,
      },
      state.bank!.seed,
    ),
  );
  if (!set.engineResult.startsWith("tes")) die(`issuance set: ${set.engineResult}`);
  // ⚠ The RESULT of the wait was ignored here, so a `null` (never validated) or
  // a validated `tec` let setup carry on and save an issuance id for an
  // issuance that may never have been made confidential. Found by REVIEW-022's
  // Codex leg. `submitValidated` is the method that checks both; the reason
  // this path did not use it is that it needed the hash before it had a blob,
  // which is no longer true.
  const setTx = await submitter.waitValidated(set.hash);
  const setResult = setTx?.meta?.TransactionResult ?? setTx?.metaData?.TransactionResult;
  if (setResult !== "tesSUCCESS") die(`issuance set validated as ${setResult ?? "(never)"}`);
  save();
}
console.log(`  MPTokenIssuanceID  ${state.issuanceId}`);
console.log(
  `  ⚠ No sfDomainID. The walkthrough offers one to gate the issuance to credentialled\n` +
    `    accounts; it is NOT built here and that is a named gap, not a decision.`,
);

// ⚠ `--fresh` has to clear the BOOK as well as the state, and it did not until
// the first Devnet run. A fresh run mints a new issuance, and `FacilityBook.open`
// refuses a book belonging to a different one — correctly — so the run died on a
// confusing error instead of starting. The refusal is right; forgetting to give
// it a fresh book was the defect.
if (FRESH && existsSync(BOOK)) {
  const retired = `${BOOK}.${Date.now()}.bak`;
  renameSync(BOOK, retired);
  console.log(`  previous book moved aside: ${retired}`);
}
const book = FacilityBook.open(BOOK, state.issuanceId!);
const facility = new Facility(ledger, submitter, book, {
  issuanceId: state.issuanceId!,
  bank: state.bank!,
  dedicated: state.dedicated!,
  fullRange: FULL_RANGE,
  ledgerEndpoint: ENDPOINT,
  workRoot: WORK,
  autoConfirm: AUTO,
  quietSigner: true,
});

const movements: Movement[] = [];
const note = (m: Movement | Movement[]) => {
  for (const x of [m].flat()) {
    movements.push(x);
    // ⚠ A confidential amount is printed here as `····`. It IS known to this
    // process — it is the number the facility asked the signer to send — but a
    // line reading `hidden  900` invites exactly the misreading this project
    // exists to avoid, and a reader skimming a terminal is the reader least
    // likely to check what the column means.
    console.log(
      `    ${x.amountIsPublic ? "PUBLIC  " + String(x.amount).padStart(6) : "hidden    ····"}  ` +
        `${x.what}  ${x.hash.slice(0, 12)}…`,
    );
  }
};

await failHardControl(state.bank!, state.issuanceId!);

// ---------------------------------------------------------------------------
// 3. Funding, and the one plaintext moment. Steps 3 and 4.
// ---------------------------------------------------------------------------
rule("3. Funding the Dedicated Account, and the ONE plaintext conversion");

const dedicatedBefore = await facility.positionOf(state.dedicated!.address);
if (!dedicatedBefore) note(await facility.authorize(state.dedicated!));
if ((dedicatedBefore?.publicAmount ?? 0) < FLOAT && !dedicatedBefore?.holderEncryptionKey) {
  note(await facility.payPublicly(state.dedicated!, FLOAT));
}

const issuanceBefore = await (await ledger.snapshot()).issuance(state.issuanceId!);
if (!dedicatedBefore?.holderEncryptionKey) {
  note(await facility.convertFloat(FLOAT)); // the Convert AND its merge
  const issuanceAfter = await (await ledger.snapshot()).issuance(state.issuanceId!);
  const delta =
    issuanceAfter.confidentialOutstandingAmount - issuanceBefore.confidentialOutstandingAmount;
  console.log(`\n  ConfidentialOutstandingAmount  ${issuanceBefore.confidentialOutstandingAmount}` +
              ` → ${issuanceAfter.confidentialOutstandingAmount}  (+${delta})`);
  if (delta !== FLOAT) die(`the aggregate moved by ${delta}, not ${FLOAT}`);
} else {
  console.log("  the Dedicated Account already holds a converted float — reusing it");
}
console.log(
  `\n  ⚠ The amount above is PUBLIC and that is the intent: facility size is what the\n` +
    `    market and the funders are entitled to see.\n` +
    `  ⚠ It is NOT the last plaintext amount, and saying so would be false. Every\n` +
    `    supplier enrolment publishes TWO: the bank's Payment and the supplier's own\n` +
    `    Convert. What is true is narrower — no DRAWDOWN and no REPAYMENT publishes an\n` +
    `    amount, and those are the numbers the facility exists to hide.`,
);
console.log(`  reconciled: ${JSON.stringify(await facility.reconcile(state.dedicated!))}`);

// ---------------------------------------------------------------------------
// 4. Suppliers. Step 5.
// ---------------------------------------------------------------------------
rule("4. Enrolling suppliers");

state.suppliers ??= [];
const WANTED = 3;
for (let i = state.suppliers.length; i < WANTED; i++) {
  state.suppliers.push(await faucetAccount(`supplier-${"ABC"[i]}`, ledger));
  save();
}
for (const s of state.suppliers) {
  const already = await facility.positionOf(s.address);
  if (already?.holderEncryptionKey) {
    console.log(`  ${s.label}: already enrolled, key ${already.holderEncryptionKey.slice(0, 12)}…`);
    // ⚠ Adopting re-checks the seed, the derivation and the key ON THE LEDGER.
    // An earlier draft reached into the facility's private supplier map with a
    // cast and did none of that — so a resumed run would have tracked a
    // position it could not decrypt.
    await facility.adoptEnrolledSupplier(s);
    continue;
  }
  console.log(`  ${s.label} ${s.address}`);
  note(await facility.enrolSupplier(s, ENROLMENT_TOKEN));
}
console.log(
  `\n  ⚠ Registration happens exactly ONCE and the protocol forbids repeating it. A\n` +
    `    supplier with no registered key cannot receive a confidential amount at all —\n` +
    `    there is no key to encrypt to, so the transaction cannot be BUILT.`,
);

// ---------------------------------------------------------------------------
// 5. Running the facility. Steps 6 and 7.
// ---------------------------------------------------------------------------
rule("5. Drawdowns and repayments — amounts hidden");

const suppliers = facility.supplierList;
const plan: { supplier: Party; draw: number; repay: number }[] = [
  { supplier: suppliers[0], draw: 900, repay: 300 },
  { supplier: suppliers[1], draw: 250, repay: 250 },
  { supplier: suppliers[2], draw: 1_400, repay: 0 },
];

for (const { supplier, draw, repay } of plan) {
  console.log(`\n  ${supplier.label}`);
  note(await facility.drawdown(supplier, draw));
  console.log(`    reconciled ${supplier.label}: ${JSON.stringify(await facility.reconcile(supplier))}`);
  if (repay > 0) {
    note(await facility.repay(supplier, repay));
    console.log(
      `    reconciled ${supplier.label}: ${JSON.stringify(await facility.reconcile(supplier))}`,
    );
  }
}
console.log(
  `\n  reconciled Dedicated Account: ${JSON.stringify(await facility.reconcile(state.dedicated!))}`,
);

// ---------------------------------------------------------------------------
// 6. What the book buys, measured rather than asserted.
// ---------------------------------------------------------------------------
rule("6. The balance book — what a lost book costs (F-8)");

const tracked = await facility.reconcile(state.dedicated!);
const lost = await facility.resync(state.dedicated!, "spending");
console.log(`  with the book:    ${tracked.searchWidth} candidate values searched`);
console.log(`  without the book: ${lost.searchWidth} candidate values searched`);
console.log(
  `  ⚠ Widths, not times. A wall-clock figure without hardware, parameter set and\n` +
    `    methodology is what CLAIMS.md P-8 forbids. The width is the parameter, and the\n` +
    `    search is LINEAR with a fixed iteration count (upstream's RIPCTXR-1 mitigation),\n` +
    `    so the width IS the cost.`,
);

// ---------------------------------------------------------------------------
// 7. Retirement, in tranches. Step 9, and F-24.
// ---------------------------------------------------------------------------
rule("7. Retirement — and every tranche size is public");

const remaining = book.expected(state.dedicated!.address).spending;
const firstTranche = Math.floor(remaining / 3);
if (firstTranche > 0) {
  note(await facility.retire(firstTranche));
  note(await facility.retire(remaining - firstTranche));
}
console.log(
  `\n  ⚠ CLAIMS.md F-24: MPTAmount is a plaintext field on EVERY individual\n` +
    `    ConfidentialMPTConvertBack, so retiring in tranches publishes EVERY tranche\n` +
    `    size — not just the net movement in ConfidentialOutstandingAmount. The two\n` +
    `    numbers above can be read straight off the validated transactions.`,
);
console.log(`  reconciled: ${JSON.stringify(await facility.reconcile(state.dedicated!))}`);

// ---------------------------------------------------------------------------
// 8. What happened, and what is public.
// ---------------------------------------------------------------------------
rule("8. The facility, as a full-ledger observer sees the amounts");

const publicMovements = movements.filter((m) => m.amountIsPublic && m.amount > 0);
const hiddenMovements = movements.filter((m) => !m.amountIsPublic && m.amount > 0);
console.log(`  transactions with a PUBLIC amount: ${publicMovements.length}`);
for (const m of publicMovements) console.log(`    ${String(m.amount).padStart(6)}  ${m.what}`);
console.log(`\n  transactions with a HIDDEN amount: ${hiddenMovements.length}`);
for (const m of hiddenMovements) console.log(`    ${"?".padStart(6)}  ${m.what}`);
console.log(
  `\n  ⚠ Every counterparty, every timestamp and every frequency above is PUBLIC. This\n` +
    `    hides amounts and nothing else, and the issuer decrypts every balance by\n` +
    `    construction (P-4, P-9, P-11).`,
);
if (!b15) {
  console.log(
    `\n  ⚠ AND THIS RUN WAS NOT UNDER B-15's STEP-7 CONDITIONS. The ledger source was\n` +
      `    remote. Everything above is evidence that the transactions are well-formed and\n` +
      `    that rippled accepts them; NONE of it is evidence about the loopback obligation.\n` +
      `    The run record says so too.`,
  );
}

state.runs ??= [];
(state.runs as unknown[]).push({
  at: new Date().toISOString(),
  endpoint: ENDPOINT,
  rippled: ledger.identity.buildVersion,
  // ⚠ **Stamped into the record, not left to be inferred from the endpoint.**
  // A later reader asking "was this run under B-15's conditions" must get the
  // answer from the record rather than by reasoning about a hostname, because
  // reasoning about a hostname is what REVIEW-016 found two ways past.
  underB15Conditions: ledger.underB15Conditions,
  b15Note: ledger.b15Note,
  movements,
});
save();

console.log(`\n  state: ${STATE}\n  book:  ${BOOK}`);
// ⚠ The observer is a THIRD PARTY and the public endpoint is the right place to
// stand for one — anybody with a block explorer is not running your node. This
// line named `ws://127.0.0.1:6006` unconditionally until the first run under
// the hatch, which would have sent the reader to a node that was not even
// running. Only a loopback RUN gets a loopback suggestion, and even then the
// public view is the one the harness is about.
console.log(`\n  Now run the observer harness — what a full-ledger observer sees:\n`);
console.log(
  `    bun tools/observer-harness.ts ${state.dedicated!.address} ${state.issuanceId} ` +
    `--assert-no-r-reuse\n`,
);
if (b15) {
  console.log(
    `  (add --endpoint ws://127.0.0.1:6006 to read the same thing from your own node;\n` +
      `   the default is the PUBLIC endpoint, which is what an observer actually has)\n`,
  );
}
```

### 6.4 `facility/tests/risk-acceptance.test.ts` — 224 lines

```typescript
/**
 * risk-acceptance.test.ts — the escape hatch, and the four states it has.
 *
 * On 2026-08-25 the project owner **amended** B-15's step-7 answer to extend
 * `REVIEW-019`'s named risk acceptance to the facility's Devnet demo. This is
 * that amendment as code: a remote endpoint is no longer impossible, it is
 * **recorded** — refused unless somebody types a sentence, disclosed in full
 * when they do, and stamped onto the run so no later reader can mistake it for
 * a run that kept the obligation.
 *
 * ⚠ **Nothing here makes a remote endpoint safe.** `CLAIMS.md` F-23 is
 * executed. What the hatch changes is whether the risk is visible.
 */
import { describe, expect, test } from "bun:test";
import {
  LoopbackLedger,
  REMOTE_LEDGER_DISCLOSURE,
  RISK_ACCEPTANCE_PHRASE,
} from "../src/loopback.ts";
import { HOSTILE_ENDPOINTS } from "./hostile-endpoints.ts";

const REMOTE = HOSTILE_ENDPOINTS.find((h) => h.why.includes("every other harness"))!.endpoint;

const FULL_INFO = {
  info: {
    build_version: "3.3.0",
    network_id: 2,
    server_state: "full",
    validated_ledger: { seq: 4_800_000 },
  },
};

function fakeNode() {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => Response.json({ result: { status: "success", ...FULL_INFO } }),
  });
  return { server, endpoint: `http://127.0.0.1:${server.port}` };
}

/** Run `fn` with the environment variable set to `value`, then restore it. */
async function withHatch<T>(value: string | undefined, fn: () => Promise<T>): Promise<T> {
  const saved = process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
  if (value === undefined) delete process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
  else process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK = value;
  try {
    return await fn();
  } finally {
    if (saved === undefined) delete process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
    else process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK = saved;
  }
}

describe("the hatch has four states and they are distinguishable", () => {
  test("unset: a remote endpoint is refused, and the refusal names the way out", async () => {
    await withHatch(undefined, async () => {
      const err = await LoopbackLedger.open(REMOTE).catch((e) => e);
      expect(String(err)).toContain("REFUSED_NOT_LOOPBACK");
      // ⚠ The refusal must say the hatch exists. A gate whose only message is
      // "no" teaches the next person to remove the gate.
      expect(String(err)).toContain("WCONF_ACCEPT_REMOTE_LEDGER_RISK");
    });
  });

  test("set to something else: refused DIFFERENTLY, not accepted", async () => {
    // ⚠ A hatch that opens on anything truthy is a hatch that opens by
    // accident, and a near miss reported as the generic refusal would leave
    // someone believing they had turned it on.
    for (const wrong of ["1", "true", "yes", RISK_ACCEPTANCE_PHRASE.toLowerCase(), " " + RISK_ACCEPTANCE_PHRASE]) {
      await withHatch(wrong, async () => {
        const err = await LoopbackLedger.open(REMOTE).catch((e) => e);
        expect(String(err)).toContain("REFUSED_RISK_NOT_ACCEPTED");
        expect(String(err)).not.toContain("REFUSED_NOT_LOOPBACK");
      });
    }
  });

  test("set exactly: it OPENS a remote-classified endpoint, stamps false, and discloses", async () => {
    // ⚠ **This is the only test that actually executes the accepting branch**,
    // and until `REVIEW-023` there was none. The earlier version connected to
    // `127.0.0.1`, which never reaches `assertRemoteRiskAccepted` at all — its
    // name promised the accepted-remote outcome while its assertions proved the
    // opposite stamp. A wording that describes a branch the test does not take
    // is worse than no test, because it reads as coverage.
    //
    // The route in is the leg's own: `localhost` is deliberately classified
    // NON-loopback by `isLoopbackEndpoint` (a name is resolved by something
    // this process does not control), while still resolving to the local
    // server. So the hatch is genuinely exercised without a packet leaving the
    // machine.
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () => Response.json({ result: { status: "success", ...FULL_INFO } }),
    });
    const remoteClassified = `http://localhost:${server.port}`;
    const written: string[] = [];
    const realWrite = process.stderr.write.bind(process.stderr);
    (process.stderr as any).write = (chunk: any) => {
      written.push(String(chunk));
      return true;
    };
    try {
      await withHatch(RISK_ACCEPTANCE_PHRASE, async () => {
        const ledger = await LoopbackLedger.open(remoteClassified);
        expect(ledger.identity.isLoopback).toBe(false);
        expect(ledger.underB15Conditions).toBe(false);
        expect(ledger.b15Note).toContain("REMOTE endpoint");
      });
    } finally {
      (process.stderr as any).write = realWrite;
      server.stop(true);
    }
    // ⚠ The disclosure must actually be EMITTED, not merely exist as a
    // constant. The wording tests below assert the constant's sentences; this
    // asserts that `open` puts them in front of somebody.
    const emitted = written.join("");
    expect(emitted).toContain("NOT UNDER B-15's STEP-7 CONDITIONS");
    expect(emitted).toContain(remoteClassified);
  });

  test("an unflagged submission takes the stamp down even on loopback", async () => {
    // ⚠ B-15's Part C says "whatever submits" and names no control-arm
    // exception. `run-facility.ts` makes exactly one unflagged submission on
    // every run, so a stamp measuring only loopback-ness would have recorded a
    // future loopback run as "both halves in force". REVIEW-023 found that.
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(req) {
        const body: any = await req.json();
        if (body.method === "server_info") {
          return Response.json({ result: { status: "success", ...FULL_INFO } });
        }
        return Response.json({
          result: { status: "success", engine_result: "tecNO_AUTH", tx_json: { hash: "A".repeat(64) } },
        });
      },
    });
    try {
      const endpoint = `http://127.0.0.1:${server.port}`;
      const ledger = await LoopbackLedger.open(endpoint);
      expect(ledger.underB15Conditions).toBe(true);

      await ledger.call("submit", { tx_blob: "DEADBEEF", fail_hard: true });
      expect(ledger.underB15Conditions).toBe(true); // a flagged one changes nothing

      await ledger.call("submit", { tx_blob: "DEADBEEF" });
      expect(ledger.underB15Conditions).toBe(false);
      expect(ledger.b15Note).toContain("without tapFailHard");
    } finally {
      server.stop(true);
    }
  });

  test("the hatch being set does NOT downgrade a loopback connection", async () => {
    // The stamp follows the endpoint, not the variable. A loopback run with the
    // variable left over from an earlier one is still a loopback run, and
    // recording it as compromised would be as wrong as the reverse.
    const { server, endpoint } = fakeNode();
    try {
      await withHatch(RISK_ACCEPTANCE_PHRASE, async () => {
        expect((await LoopbackLedger.open(endpoint)).underB15Conditions).toBe(true);
      });
      await withHatch(undefined, async () => {
        expect((await LoopbackLedger.open(endpoint)).underB15Conditions).toBe(true);
      });
    } finally {
      server.stop(true);
    }
  });
});

describe("the disclosure's wording", () => {
  // ⚠ CLAIMS.md E-126: the one disclosure surface that was not a constant with
  // an asserted wording is where a false sentence lived through a whole round of
  // review — and REVIEW-022 then found this file's sibling citing a wording test
  // that did not exist. This is that test.
  test("says the run is NOT under B-15's conditions", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("NOT UNDER B-15's STEP-7 CONDITIONS");
  });

  test("says F-23 is EXECUTED, not theoretical", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("EXECUTED, not theoretical");
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("F-23");
  });

  test("says TLS does not address it", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("TLS does not");
  });

  test("says the amendment had no adversarial review", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("NO adversarial review");
  });

  test("says what a run under it cannot establish", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("CANNOT establish");
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("loopback obligation");
  });

  test("does NOT claim §10.5's state changes, because the driver does not check them", () => {
    // ⚠ It claimed exactly that, while `run-facility.ts`'s own header said it
    // did not — REVIEW-023 found the pair, and noted that the wording tests
    // conspicuously skipped the "CAN establish" paragraph, so the one false
    // sentence in the constant was the one nothing pinned. This pins it.
    //
    // ⚠ The first version of this assertion was `/CAN establish[\s\S]*§10.5/`
    // and failed against correct text: it spanned the paragraph break and
    // matched the CORRECTION. Scope the claim to the paragraph that makes it.
    const paragraphs = REMOTE_LEDGER_DISCLOSURE.split("\n\n");
    const canEstablish = paragraphs.find((p) => p.includes("CAN establish"))!;
    expect(canEstablish).toBeDefined();
    expect(canEstablish).not.toContain("§10.5");
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("does NOT establish XLS-0096 §10.5");
  });

  test("the acceptance phrase is a sentence, not a flag", () => {
    // A value someone can set by muscle memory is a value that gets set by
    // muscle memory. Typing it is the acknowledgement.
    expect(RISK_ACCEPTANCE_PHRASE.split(" ").length).toBeGreaterThan(6);
    expect(RISK_ACCEPTANCE_PHRASE).toContain("F-23");
  });
});
```

### 6.5 `facility/src/facility.ts` — 606 lines

```typescript
/**
 * facility.ts — the receivables financing facility, as application logic.
 *
 * Architecture §6 **step 7**. ADR-0002: the facility is application logic on
 * XLS-0096 Confidential MPTs, **not** XLS-66 and **not** an XLS-65 `Vault`.
 * TASK ZERO §9 is the design; `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md`
 * is the end-to-end account of what it does and does not hide.
 *
 * ⚠ **"Dedicated Account", never "vault".** An XLS-65 `Vault` is a different
 * ledger object, its share token *cannot* be confidential, its pseudo-account
 * *cannot* sign a `ConfidentialMPTConvert`, and the word has already nearly
 * derailed one reading of this design.
 *
 * # The five steps, and which of them are protocol and which are ours
 *
 * A distinction worth keeping sharp, because a design rule stated as a protocol
 * rule is a claim about rippled that rippled does not make:
 *
 * | | Whose rule |
 * |---|---|
 * | The issuer cannot convert its own issuance | **protocol** — the ledger refuses it |
 * | Registration happens exactly once | **protocol** — the key is required at initialisation and forbidden after |
 * | `TransferFee` must be 0 on a confidential issuance | **protocol** |
 * | A destination with no registered key cannot receive | **protocol** — there is no key to encrypt to, so the transaction cannot be *built* |
 * | The float converts **once**, in aggregate | **ours** — TASK ZERO §9's design rule. rippled would accept a second Convert |
 * | Every per-participant movement is a `ConfidentialMPTSend` | **ours** |
 *
 * # What this hides, in one sentence that must survive any rewrite
 *
 * **Amounts.** Not who transacts, not with whom, not when, not how often — and
 * the issuer decrypts every balance by construction (`CLAIMS.md` P-4, P-9,
 * P-11). `Convert` and `ConvertBack` publish their amounts in the clear, **per
 * transaction**, so retiring a facility in tranches publishes every tranche
 * size (F-24).
 *
 * # ⚠ What this module is not
 *
 * * **Not multi-party.** One process plays the bank, the Dedicated Account and
 *   every supplier, and therefore holds every seed. A real facility has three
 *   parties and three machines; this has one, and every security property that
 *   depends on the separation is **not demonstrated here**.
 * * **Not a permissioned domain.** The walkthrough's step 1 offers `sfDomainID`
 *   to gate the issuance to credentialled accounts. It is **not built**, and
 *   that is a named gap rather than a decision: it needs `PermissionedDomainSet`
 *   and a credential per supplier, which is its own milestone.
 * * **Not secure, audited, non-custodial or production-ready** (P-5). Devnet
 *   throwaways only, and nothing here should ever hold value.
 */
import { deriveAddress, deriveKeypair } from "ripple-keypairs";
import { decodeAccountID } from "ripple-address-codec";
import { deriveElGamalKey, type DerivedElGamalKey } from "../../tools/wconf-keygen.ts";
import { FacilityBook } from "./book.ts";
import { LedgerRefusal, type LoopbackLedger, type MPTokenState } from "./loopback.ts";
import { decryptInRange } from "./mptool.ts";
import { assertLoopbackProfile, SignerSession } from "./signer.ts";
import type { FailHardSubmitter } from "./submit.ts";

/** One participant. ⚠ The seed is here because this process plays every role. */
export interface Party {
  label: string;
  address: string;
  seed: string;
}

export interface FacilityConfig {
  issuanceId: string;
  bank: Party;
  dedicated: Party;
  /**
   * The widest search the facility will ever run to read a balance.
   *
   * ⚠ This bounds the signer's balance read too (`amount_search_to`, E-104), so
   * it must cover the float. It is also **the cost of a lost book**: the search
   * is linear in the width, and no sublinear fallback is shipped (F-8). ⚠ The
   * per-iteration figure is a benchmark number and is deliberately not restated
   * — P-8, and `benchmarks-2026-08-16.md` §4 is where it has its methodology.
   */
  fullRange: number;
  ledgerEndpoint: string;
  workRoot: string;
  autoConfirm: boolean;
  quietSigner?: boolean;
}

export interface Movement {
  what: string;
  hash: string;
  /** True when the amount is a plaintext field of the transaction. */
  amountIsPublic: boolean;
  amount: number;
}

const accountIdHex = (address: string) =>
  Buffer.from(decodeAccountID(address)).toString("hex").toUpperCase();

/** The address a seed actually controls — never the one someone told us. */
export function addressOfSeed(seed: string): string {
  return deriveAddress(deriveKeypair(seed).publicKey);
}

export class FacilityRefusal extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "FacilityRefusal";
  }
}

export class Facility {
  private readonly suppliers = new Map<string, Party>();
  /** Cached because deriving is HMAC work and the addresses do not change. */
  private readonly keys = new Map<string, DerivedElGamalKey>();
  private floatConverted = false;

  constructor(
    private readonly ledger: LoopbackLedger,
    private readonly submitter: FailHardSubmitter,
    readonly book: FacilityBook,
    private readonly cfg: FacilityConfig,
  ) {
    assertLoopbackProfile(cfg.ledgerEndpoint);
    if (cfg.dedicated.address === cfg.bank.address) {
      throw new FacilityRefusal(
        "REFUSED_ISSUER_IS_DEDICATED",
        "the Dedicated Account cannot be the issuer: an issuer cannot convert its own issuance " +
          "into a confidential balance, and the ledger refuses it outright. That is the reason " +
          "this design has a separate account at all",
      );
    }
    for (const p of [cfg.bank, cfg.dedicated]) this.checkSeedControlsAddress(p);
  }

  /**
   * ⚠ A party's address is **derived from its seed**, never believed.
   *
   * The faucet, a config file and a state file all *claim* an address. If the
   * claim were wrong the facility would encrypt to a key belonging to an
   * account this process cannot sign for — which is F-23's shape arriving from
   * a different direction.
   */
  private checkSeedControlsAddress(p: Party): void {
    const derived = addressOfSeed(p.seed);
    if (derived !== p.address) {
      throw new FacilityRefusal(
        "REFUSED_SEED_ADDRESS_MISMATCH",
        `${p.label}: the seed controls ${derived}, not the claimed ${p.address}`,
      );
    }
  }

  elgamalOf(p: Party): DerivedElGamalKey {
    let k = this.keys.get(p.address);
    if (!k) {
      k = deriveElGamalKey(p.seed);
      if (k.address !== p.address) {
        throw new FacilityRefusal(
          "REFUSED_SEED_ADDRESS_MISMATCH",
          `${p.label}: the derivation's own account check disagrees with ${p.address}`,
        );
      }
      this.keys.set(p.address, k);
    }
    return k;
  }

  partyOf(address: string): Party {
    if (address === this.cfg.bank.address) return this.cfg.bank;
    if (address === this.cfg.dedicated.address) return this.cfg.dedicated;
    const s = this.suppliers.get(address);
    if (!s) throw new FacilityRefusal("REFUSED_UNKNOWN_PARTY", address);
    return s;
  }

  get supplierList(): Party[] {
    return [...this.suppliers.values()];
  }

  /**
   * Adopt a supplier that was enrolled by an earlier run.
   *
   * ⚠ **It re-checks everything `enrolSupplier` checks and skips only the
   * transactions.** The seed must control the address, the derivation must
   * agree, and the key **on the ledger** must be the derived one — because a
   * facility that adopted a position it cannot decrypt would track a number it
   * can never confirm. An earlier draft of the driver reached into the private
   * map with a cast instead, which did none of this.
   */
  async adoptEnrolledSupplier(supplier: Party): Promise<void> {
    this.checkSeedControlsAddress(supplier);
    const onLedger = await this.positionOf(supplier.address);
    const expected = this.elgamalOf(supplier).pk;
    if (!onLedger?.holderEncryptionKey) {
      throw new FacilityRefusal(
        "REFUSED_NOT_ENROLLED",
        `${supplier.label} carries no HolderEncryptionKey, so there is nothing to adopt`,
      );
    }
    if (onLedger.holderEncryptionKey !== expected) {
      throw new FacilityRefusal(
        "REFUSED_KEY_NOT_DERIVED",
        `${supplier.label} registered ${onLedger.holderEncryptionKey}, not the derived ${expected}`,
      );
    }
    this.suppliers.set(supplier.address, supplier);
  }

  // -------------------------------------------------------------- reads

  async positionOf(address: string): Promise<MPTokenState | null> {
    const snap = await this.ledger.snapshot();
    return snap.mptoken(address, this.cfg.issuanceId);
  }

  /**
   * Confirm one party's book entry against the ledger.
   *
   * This is where the book earns its place: the window is a handful of units
   * wide, and `cfg.fullRange` is what the same read costs without a book.
   */
  async reconcile(p: Party, which: "spending" | "inbox" = "spending") {
    const state = await this.positionOf(p.address);
    const ciphertext =
      which === "spending" ? state?.confidentialBalanceSpending : state?.confidentialBalanceInbox;
    return this.book.reconcile(
      p.address,
      which,
      ciphertext,
      this.elgamalOf(p).sk,
      decryptInRange,
      this.cfg.fullRange,
    );
  }

  /** Rebuild a book entry the expensive way — what a lost book costs. */
  async resync(p: Party, which: "spending" | "inbox" = "spending") {
    const state = await this.positionOf(p.address);
    const ciphertext =
      which === "spending" ? state?.confidentialBalanceSpending : state?.confidentialBalanceInbox;
    return this.book.resync(
      p.address,
      which,
      ciphertext,
      this.elgamalOf(p).sk,
      decryptInRange,
      this.cfg.fullRange,
    );
  }

  // ------------------------------------------------- plaintext operations

  /** Opt an account in to the issuance. Public, and a precondition of everything. */
  async authorize(p: Party): Promise<Movement> {
    const { hash } = await this.plaintext(
      { TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: this.cfg.issuanceId },
      p.seed,
      `${p.label} MPTokenAuthorize`,
    );
    return { what: `${p.label} authorized`, hash, amountIsPublic: false, amount: 0 };
  }

  /**
   * The bank pays an account a **public** MPT balance.
   *
   * Step 3 for the Dedicated Account (the whole float) and step 5 for a
   * supplier (a token amount, only so they have something to Convert and
   * therefore a key to register).
   *
   * ⚠ **This amount is public and permanent.** It is a plaintext `Payment`.
   */
  async payPublicly(to: Party, amount: number): Promise<Movement> {
    const { hash } = await this.plaintext(
      {
        TransactionType: "Payment",
        Destination: to.address,
        Amount: { mpt_issuance_id: this.cfg.issuanceId, value: String(amount) },
      },
      this.cfg.bank.seed,
      `public Payment of ${amount} to ${to.label}`,
    );
    return { what: `public payment to ${to.label}`, hash, amountIsPublic: true, amount };
  }

  /**
   * Move a received amount from the inbox into the spendable balance.
   *
   * ⚠ **Not a signer operation**, and that is not an omission: a
   * `ConfidentialMPTMergeInbox` carries no proof and no blinding factor, so
   * there is nothing for the signer to generate. It is signed here with the
   * party's own seed, like any ordinary XRPL transaction.
   */
  async mergeInbox(p: Party): Promise<Movement> {
    const { hash } = await this.plaintext(
      { TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: this.cfg.issuanceId },
      p.seed,
      `${p.label} MergeInbox`,
    );
    // ⚠ The amount is what the inbox held. Recording 0 would put a movement in
    // the log that says nothing moved, on the one transaction whose whole job
    // is to move something.
    const merged = this.book.expected(p.address).inbox;
    this.book.record({ kind: "merge", account: p.address, amount: merged, hash });
    return { what: `${p.label} merged inbox`, hash, amountIsPublic: false, amount: merged };
  }

  /**
   * Sign a plaintext transaction, submit it **once**, and wait for validation.
   *
   * ⚠ Exactly one place signs a plaintext transaction and exactly one place
   * submits one. An earlier shape had `signAndSubmit` submitting and then
   * `submitValidated` submitting the same blob a second time; the second
   * attempt could only ever fail.
   */
  private async plaintext(tx: Record<string, unknown>, seed: string, what: string) {
    const blob = await this.submitter.sign(tx, seed);
    return this.submitter.submitValidated(blob, what);
  }

  // ---------------------------------------------- confidential operations

  /**
   * Step 4 — **the one plaintext moment.** The Dedicated Account converts the
   * whole float in a single `ConfidentialMPTConvert`, which also registers its
   * `HolderEncryptionKey`.
   *
   * ⚠ **The amount is public at this step and that is the intent.** Facility
   * size is what the market and the funders are entitled to see. After this, no
   * plaintext amount appears again until the facility is retired or resized.
   *
   * ⚠ **"Converts once" is OUR rule, not the protocol's.** rippled would accept
   * a second Convert on this account; what it would cost is a second public
   * amount, and the design says there is exactly one.
   */
  async convertFloat(amount: number): Promise<Movement[]> {
    // ⚠ **The guard is derived from the LEDGER, not from a field on this
    // object.** An in-memory flag is reset by every process restart, and this
    // driver is resumable by design — so the flag would have said "not yet
    // converted" on the second run of a facility that had converted. A
    // registered `HolderEncryptionKey` is the durable fact: it can only have
    // been written by a Convert, and it can only be written once.
    const already = await this.positionOf(this.cfg.dedicated.address);
    if (already?.holderEncryptionKey || this.floatConverted) {
      throw new FacilityRefusal(
        "REFUSED_SECOND_CONVERSION",
        "TASK ZERO §9's design rule is that value enters confidentiality ONCE, in aggregate. " +
          "A second Convert is a second public amount. rippled would accept it; this facility " +
          "does not",
      );
    }
    const m = await this.confidential(this.cfg.dedicated, {
      operation: "ConfidentialMPTConvert",
      amount,
      what: "float conversion",
      amountIsPublic: true,
    });
    this.book.record({
      kind: "convert",
      account: this.cfg.dedicated.address,
      amount,
      hash: m.hash,
    });
    // ⚠ **A Convert lands in the INBOX and is not spendable until merged.**
    // Established by the ledger, not by reading: after a validated Convert of
    // 5000, `ConfidentialBalanceSpending` decrypted to 0 and
    // `ConfidentialBalanceInbox` to 5000. Without this the first drawdown
    // refuses for insufficient balance against a float that is sitting there.
    // ⚠ **The merge is RETURNED, not merely awaited.** Its `Movement` was
    // discarded, so the Dedicated Account's post-conversion merge — a validated
    // transaction, hash `3F264EB8…` — sat in the book and was missing from the
    // run record, and every document that counted the run record was one short.
    // `REVIEW-023` found it. A method that returns fewer movements than it made
    // is a method whose count nobody can check.
    const merged = await this.mergeInbox(this.cfg.dedicated);
    this.floatConverted = true;
    return [m, merged];
  }

  /**
   * Step 5 — enrol a supplier.
   *
   * The bank pays them a token amount publicly and they Convert it, which is
   * what **registers their `HolderEncryptionKey`**. ⚠ Registration happens
   * exactly once and cannot be repeated, and a supplier with no registered key
   * cannot receive a confidential amount **at all** — there is no key to
   * encrypt to, so the Send cannot be built, let alone rejected.
   */
  async enrolSupplier(supplier: Party, tokenAmount: number): Promise<Movement[]> {
    this.checkSeedControlsAddress(supplier);
    if (this.suppliers.has(supplier.address)) {
      throw new FacilityRefusal("REFUSED_ALREADY_ENROLLED", supplier.label);
    }
    const already = await this.positionOf(supplier.address);
    if (already?.holderEncryptionKey) {
      throw new FacilityRefusal(
        "REFUSED_ALREADY_REGISTERED",
        `${supplier.label} already carries a HolderEncryptionKey. Registration happens exactly ` +
          `once and the protocol forbids repeating it`,
      );
    }
    // ⚠ **Registered LAST, after the ledger has confirmed everything.** The
    // first draft set it here, before three ledger operations — so a timeout in
    // any of them left the supplier marked enrolled in memory and not on the
    // ledger, and every retry then hit `REFUSED_ALREADY_ENROLLED`. Found by
    // `REVIEW-022` round two.
    const out: Movement[] = [];
    out.push(await this.authorize(supplier));
    out.push(await this.payPublicly(supplier, tokenAmount));
    const convert = await this.confidential(supplier, {
      operation: "ConfidentialMPTConvert",
      amount: tokenAmount,
      what: `${supplier.label} enrolment convert`,
      amountIsPublic: true,
    });
    this.book.record({
      kind: "convert",
      account: supplier.address,
      amount: tokenAmount,
      hash: convert.hash,
    });
    out.push(convert);
    // The enrolment token lands in the supplier's inbox for the same reason.
    out.push(await this.mergeInbox(supplier));

    // The registered key must be the one the ruled derivation produces, or the
    // facility is tracking a position it cannot read.
    const after = await this.positionOf(supplier.address);
    const expected = this.elgamalOf(supplier).pk;
    if (after?.holderEncryptionKey !== expected) {
      throw new FacilityRefusal(
        "REFUSED_KEY_NOT_DERIVED",
        `${supplier.label} registered ${after?.holderEncryptionKey}, not the derived ${expected}`,
      );
    }
    this.suppliers.set(supplier.address, supplier);
    return out;
  }

  /** Step 6 — a drawdown. Dedicated Account → supplier. **Amount hidden.** */
  async drawdown(supplier: Party, amount: number): Promise<Movement[]> {
    return this.confidentialTransfer(this.cfg.dedicated, supplier, amount, "drawdown");
  }

  /** Step 7 — a repayment. Supplier → Dedicated Account. **Amount hidden.** */
  async repay(supplier: Party, amount: number): Promise<Movement[]> {
    return this.confidentialTransfer(supplier, this.cfg.dedicated, amount, "repayment");
  }

  private async confidentialTransfer(
    from: Party,
    to: Party,
    amount: number,
    what: string,
  ): Promise<Movement[]> {
    // ⚠ **The seed/address invariant is checked HERE too, and it was not.**
    // `confidential()` hands the signer a **seed** while the book and the ledger
    // lookup use the **address**, so a `Party { address: Y, seed: X }` would
    // produce a transaction signed by X and a book entry against Y. The
    // constructor and `enrolSupplier` checked it; these two public entry points
    // did not, and the file's own comment says an address is *"never believed"*.
    // Found by `REVIEW-022`'s Codex leg.
    for (const p of [from, to]) {
      this.checkSeedControlsAddress(p);
      if (
        p.address !== this.cfg.bank.address &&
        p.address !== this.cfg.dedicated.address &&
        !this.suppliers.has(p.address)
      ) {
        throw new FacilityRefusal(
          "REFUSED_UNKNOWN_PARTY",
          `${p.label} (${p.address}) is not the bank, the Dedicated Account or an enrolled ` +
            `supplier of this facility. A movement against a party the facility does not know ` +
            `is a book entry nobody can reconcile`,
        );
      }
    }
    const destination = await this.positionOf(to.address);
    if (!destination?.holderEncryptionKey) {
      throw new FacilityRefusal(
        "REFUSED_DESTINATION_NOT_REGISTERED",
        `${to.label} has no HolderEncryptionKey. There is no key to encrypt to, so this ` +
          `transaction cannot be built — it is not a rejection, it is an impossibility`,
      );
    }
    const have = this.book.expected(from.address).spending;
    if (amount > have) {
      throw new FacilityRefusal(
        "REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE",
        `${what} of ${amount} exceeds ${from.label}'s tracked confidential balance of ${have}`,
      );
    }
    const send = await this.confidential(from, {
      operation: "ConfidentialMPTSend",
      amount,
      destination: to.address,
      what: `${what} ${from.label} → ${to.label}`,
      amountIsPublic: false,
    });
    this.book.record({ kind: "send-out", account: from.address, amount, hash: send.hash });
    this.book.record({ kind: "send-in", account: to.address, amount, hash: send.hash });
    // Received value lands in the INBOX. Merging is a second transaction and
    // the book does not pretend otherwise.
    const merged = await this.mergeInbox(to);
    return [send, merged];
  }

  /**
   * Step 9 — retire or resize. The Dedicated Account converts value back out.
   *
   * ⚠ **Each ConvertBack publishes its OWN amount in the clear** — `MPTAmount`
   * is a plaintext field of every one of them (XLS-0096 §10.3), so retiring in
   * tranches publishes **every tranche size**, not just the net movement in
   * `sfConfidentialOutstandingAmount`. That is `CLAIMS.md` **F-24**, and the
   * walkthrough said the opposite until 2026-08-25.
   */
  async retire(amount: number): Promise<Movement> {
    const have = this.book.expected(this.cfg.dedicated.address).spending;
    if (amount > have) {
      throw new FacilityRefusal(
        "REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE",
        `retiring ${amount} exceeds the Dedicated Account's tracked balance of ${have}`,
      );
    }
    const m = await this.confidential(this.cfg.dedicated, {
      operation: "ConfidentialMPTConvertBack",
      amount,
      what: `retire ${amount}`,
      amountIsPublic: true,
    });
    this.book.record({
      kind: "convert-back",
      account: this.cfg.dedicated.address,
      amount,
      hash: m.hash,
    });
    return m;
  }

  /**
   * Every confidential transaction: signed by `signer/`, submitted from here
   * with `tapFailHard`, and **not recorded in the book until it validates**.
   */
  private async confidential(
    p: Party,
    args: {
      operation: "ConfidentialMPTConvert" | "ConfidentialMPTSend" | "ConfidentialMPTConvertBack";
      amount: number;
      destination?: string;
      what: string;
      amountIsPublic: boolean;
    },
  ): Promise<Movement> {
    const session = await SignerSession.start(
      {
        accountSeed: p.seed,
        issuanceId: this.cfg.issuanceId,
        ledgerEndpoint: this.cfg.ledgerEndpoint,
        amountSearchTo: this.cfg.fullRange,
      },
      {
        workDir: `${this.cfg.workRoot}/${p.label}`,
        autoConfirm: this.cfg.autoConfirm,
        quiet: this.cfg.quietSigner,
      },
    );
    try {
      const grant = await session.pair([args.operation]);
      const signed = await session.prepare({
        grant,
        operation: args.operation,
        issuanceId: this.cfg.issuanceId,
        amount: args.amount,
        destination: args.destination,
      });
      // ⚠ `submitValidated` is what checks the VALIDATED metadata; the engine
      // result at submit time is provisional. The check that belongs here is
      // the one only this caller can make: the node and the signer must agree
      // on what was signed.
      const { hash } = await this.submitter.submitValidated(signed.txBlob, args.what);
      if (hash !== signed.hash) {
        throw new LedgerRefusal(
          "REFUSED_HASH_DISAGREEMENT",
          `the signer computed ${signed.hash}, the node reports ${hash}`,
        );
      }
      return { what: args.what, hash, amountIsPublic: args.amountIsPublic, amount: args.amount };
    } finally {
      session.stop();
    }
  }

  // ------------------------------------------------------------ helpers

  accountIdOf(p: Party): string {
    return accountIdHex(p.address);
  }

  get issuanceId(): string {
    return this.cfg.issuanceId;
  }

  get dedicated(): Party {
    return this.cfg.dedicated;
  }

  get bank(): Party {
    return this.cfg.bank;
  }
}
```

### 6.6 `facility/src/book.ts` — 313 lines

```typescript
/**
 * book.ts — the facility's off-ledger balance record, and the reason it is not
 * optional.
 *
 * # Why a facility needs this at all
 *
 * TASK ZERO §9 originally capped the float. That cap was **un-retracted** on
 * 2026-08-16 when the 1,000,000 decryption bound turned out to be a
 * caller-supplied search window rather than a ceiling (`CLAIMS.md` F-7), and
 * what replaced it is a **requirement**: whoever holds the confidential balance
 * must maintain its expected value off-ledger so that it can be decrypted
 * cheaply, because resynchronisation costs time proportional to the width of
 * the uncertainty and **no sublinear fallback is shipped** (F-8: the library's
 * own header points at a `bsgs` symbol that does not exist).
 *
 * ⚠ **The per-iteration cost is NOT restated here.** It is a benchmark number,
 * `CLAIMS.md` **P-8** forbids quoting one without hardware, parameter set and
 * methodology, and all three live in `docs/task-zero/benchmarks-2026-08-16.md`
 * §4 with `CLAIMS.md` **E-23** and **F-7** as the register rows. ⚠ It is also
 * **not F-8** — TASK ZERO §9 states the cost and the missing fallback in one
 * sentence with one citation, and copying that sentence attaches the wrong row
 * to the number.
 *
 * That is this module. A confidential balance is an ElGamal ciphertext of a
 * scalar multiple of a generator; recovering the integer is a **linear** search
 * over the candidate range. A holder who knows what their balance *should* be
 * searches a window of a few units. A holder who does not searches the whole
 * facility.
 *
 * ⚠ **So the book is a performance requirement that behaves like a correctness
 * one.** Lose it and the position is not lost — the ledger still holds it and
 * `sk_A` still decrypts it — but the search becomes proportional to the float,
 * and for a £50m facility at scale 0 that is not a search anyone runs.
 *
 * # ⚠ What this book is NOT
 *
 * * **Not authoritative.** The ledger is. Every entry here is a *prediction*,
 *   and [`reconcile`] is what turns a prediction into a confirmed reading.
 * * **Not the randomness ledger.** `signer/src/store.rs` is an append-only,
 *   authenticated record guarding a cryptographic invariant under amendments
 *   A4–A9. This is a cache of integers. Conflating them would import a
 *   seriousness this file does not have, and — worse — suggest the protections
 *   there apply here.
 * * **Not integrity-protected.** A tampered book makes a reconciliation fail
 *   loudly (the window misses and the widened search disagrees), which is the
 *   honest failure mode. It does not make a wrong number believed.
 * * **Not a confidentiality boundary.** It holds every amount in plaintext, on
 *   disk, unencrypted. Anyone who can read it knows the whole facility. Devnet
 *   throwaways only.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface Movement {
  at: string;
  kind: "convert" | "send-out" | "send-in" | "merge" | "convert-back";
  account: string;
  amount: number;
  /** The validated transaction that caused it. A movement with no hash is a
   *  prediction that was never confirmed, and is not written. */
  hash: string;
}

interface Position {
  /** What `ConfidentialBalanceSpending` should decrypt to. */
  spending: number;
  /** What `ConfidentialBalanceInbox` should decrypt to. */
  inbox: number;
}

interface BookFile {
  issuanceId: string;
  positions: Record<string, Position>;
  movements: Movement[];
}

/** What one reconciliation established. */
export interface Reconciliation {
  account: string;
  which: "spending" | "inbox";
  expected: number;
  actual: number;
  /** How wide a search found it. The whole point of keeping the book. */
  searchWidth: number;
  /** True when the narrow window missed and a full-range search was needed. */
  widened: boolean;
}

export class BookDrift extends Error {
  constructor(readonly detail: Reconciliation & { searchedTo: number }) {
    super(
      `book drift on ${detail.account} ${detail.which}: expected ${detail.expected}, ` +
        `ledger says ${detail.actual}`,
    );
    this.name = "BookDrift";
  }
}

export class Unreadable extends Error {
  constructor(account: string, which: string, searchedTo: number) {
    super(
      `${account}'s ${which} balance did not decrypt anywhere in [0, ${searchedTo}]. ` +
        `The facility will not guess a balance it could not read`,
    );
    this.name = "Unreadable";
  }
}

/** Decrypts one ciphertext over an inclusive integer range. `mptool decrypt`. */
export type RangeDecryptor = (
  ciphertext: string,
  sk: string,
  from: number,
  to: number,
) => Promise<number | null>;

export class FacilityBook {
  private data: BookFile;

  private constructor(
    private readonly path: string,
    data: BookFile,
    /** How far either side of the expected value a reconciliation looks first. */
    readonly window: number,
  ) {
    this.data = data;
  }

  static open(path: string, issuanceId: string, window = 8): FacilityBook {
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, "utf8")) as BookFile;
      if (data.issuanceId !== issuanceId) {
        throw new Error(
          `${path} is the book for issuance ${data.issuanceId}, not ${issuanceId}. ` +
            `Two facilities sharing one book is two sets of expectations in one file`,
        );
      }
      return new FacilityBook(path, data, window);
    }
    return new FacilityBook(path, { issuanceId, positions: {}, movements: [] }, window);
  }

  private save(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    // Write-then-rename: a book truncated by a crash mid-write is a book that
    // will fail every reconciliation until someone resyncs it.
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.path);
  }

  private position(account: string): Position {
    return (this.data.positions[account] ??= { spending: 0, inbox: 0 });
  }

  expected(account: string): Position {
    return { ...this.position(account) };
  }

  get movements(): readonly Movement[] {
    return this.data.movements;
  }

  /**
   * Record a movement that has **validated**.
   *
   * ⚠ Nothing is recorded on submission. A transaction that was discarded
   * under `tapFailHard`, or that never validated, moved no value, and a book
   * updated from intent rather than from outcome is a book that drifts by
   * exactly the amount of every failure.
   */
  record(m: Omit<Movement, "at">): void {
    // ⚠ **Compute, validate, THEN commit.** The first draft mutated the stored
    // position and checked for negativity afterwards, so a refused movement
    // left the in-memory book holding a number the protocol cannot represent —
    // on disk it still said the old value, and the two disagreed until the next
    // reload. The test asserted only that it threw, so it passed against the
    // corrupted state. Found independently by both `REVIEW-022` legs.
    const current = this.position(m.account);
    const next: Position = { ...current };
    switch (m.kind) {
      case "convert":
        // ⚠ **A Convert lands in the INBOX, not in the spendable balance**, and
        // this credited `spending` until the first Devnet run refused to
        // reconcile. Read off the ledger on 2026-08-25, after a validated
        // Convert of 5000: `ConfidentialBalanceSpending` decrypted to **0** and
        // `ConfidentialBalanceInbox` to **5000**. A `ConfidentialMPTMergeInbox`
        // is what makes it spendable, exactly as it is for a received Send.
        //
        // ⚠ **The then-existing tests could not have caught this**, and that
        // is the defensible form of the claim. They asserted this model against
        // itself, so every one of them passed. **A unit test absolutely CAN
        // encode the rule once the ledger has established it** — the arithmetic
        // tests do, and they fail if `convert` credits `spending` again.
        // `REVIEW-023` corrected the absolute, which read *"no unit test could
        // have caught it"*.
        //
        // What is durable: only the ledger says what the protocol does, and a
        // suite that agrees with its author about the protocol agrees about
        // that author's mistakes too.
        next.inbox += m.amount;
        break;
      case "send-out":
        next.spending -= m.amount;
        break;
      case "send-in":
        // A received amount lands in the INBOX, not in the spendable balance.
        // Merging it is a separate transaction and a separate movement.
        next.inbox += m.amount;
        break;
      case "merge":
        // ⚠ The caller states what it believes the inbox held, and the book
        // refuses to disagree silently: a merge recorded for the wrong amount
        // is a movement log that no longer explains the position it produced.
        if (m.amount !== next.inbox) {
          throw new Error(
            `merge for ${m.account} was recorded as ${m.amount} but the book holds ` +
              `${next.inbox} in the inbox`,
          );
        }
        next.spending += next.inbox;
        next.inbox = 0;
        break;
      case "convert-back":
        next.spending -= m.amount;
        break;
    }
    if (next.spending < 0 || next.inbox < 0) {
      throw new Error(
        `${m.kind} of ${m.amount} would take ${m.account} negative ` +
          `(spending ${next.spending}, inbox ${next.inbox}). The book refuses to hold a state ` +
          `the protocol cannot represent`,
      );
    }
    this.data.positions[m.account] = next;
    this.data.movements.push({ ...m, at: new Date().toISOString() });
    this.save();
  }

  /**
   * Check one prediction against the ledger, cheaply if the book is right.
   *
   * The narrow window is the benefit the book exists for. `fullRange` is what a
   * holder without a book pays on **every** read, and passing it here is what
   * makes that cost visible rather than assumed.
   */
  async reconcile(
    account: string,
    which: "spending" | "inbox",
    ciphertext: string | undefined,
    sk: string,
    decrypt: RangeDecryptor,
    fullRange: number,
  ): Promise<Reconciliation> {
    const expected = this.position(account)[which];
    if (!ciphertext) {
      // No ciphertext is a real state — nothing has been converted — and it is
      // only consistent with an expectation of zero.
      if (expected !== 0) {
        throw new BookDrift({
          account, which, expected, actual: 0, searchWidth: 0, widened: false, searchedTo: 0,
        });
      }
      return { account, which, expected, actual: 0, searchWidth: 0, widened: false };
    }
    const from = Math.max(0, expected - this.window);
    const to = expected + this.window;
    const near = await decrypt(ciphertext, sk, from, to);
    if (near !== null) {
      if (near !== expected) {
        throw new BookDrift({
          account, which, expected, actual: near, searchWidth: to - from + 1,
          widened: false, searchedTo: to,
        });
      }
      return { account, which, expected, actual: near, searchWidth: to - from + 1, widened: false };
    }
    // The window missed. This is F-8's cost, paid in public.
    const far = await decrypt(ciphertext, sk, 0, fullRange);
    if (far === null) throw new Unreadable(account, which, fullRange);
    throw new BookDrift({
      account, which, expected, actual: far, searchWidth: fullRange + 1,
      widened: true, searchedTo: fullRange,
    });
  }

  /**
   * Rebuild one expectation from the ledger, paying the full-range search.
   *
   * ⚠ This is what a lost book costs, and it is the honest counterpart to
   * [`reconcile`]: the same ciphertext, the same key, and a search proportional
   * to the **facility**, not to the movement.
   */
  async resync(
    account: string,
    which: "spending" | "inbox",
    ciphertext: string | undefined,
    sk: string,
    decrypt: RangeDecryptor,
    fullRange: number,
  ): Promise<{ value: number; searchWidth: number }> {
    if (!ciphertext) {
      this.position(account)[which] = 0;
      this.save();
      return { value: 0, searchWidth: 0 };
    }
    const value = await decrypt(ciphertext, sk, 0, fullRange);
    if (value === null) throw new Unreadable(account, which, fullRange);
    this.position(account)[which] = value;
    this.save();
    return { value, searchWidth: fullRange + 1 };
  }
}
```

### 6.7 `facility/tests/facility.test.ts` — 367 lines

```typescript
/**
 * facility.test.ts — the refusals, which are the part of the facility that has
 * to be right.
 *
 * Everything here is a guard that fires **before** a transaction is built.
 *
 * ⚠ **This header has now been wrong in BOTH directions.** It first claimed
 * the happy path *"is executed on Devnet"* before anything had run
 * (`REVIEW-022` round two), and was then corrected to *"it is not, and it never
 * has been"* — which `REVIEW-023` found still standing after the facility ran.
 * It HAS run: 28 validated facility transactions on 2026-08-25, **not** under
 * B-15's step-7 conditions (`CLAIMS.md` E-151). **A denial goes stale exactly
 * as fast as a claim.**
 *
 * What a unit test can establish is that the facility refuses the states it
 * says it refuses. What it cannot establish is that rippled accepts anything,
 * and a happy path would not establish confidentiality even if there were one
 * (`CLAUDE.md`: *"a demo of the happy path is not evidence of
 * confidentiality"*).
 */
import { describe, expect, test } from "bun:test";
import { encodeSeed } from "ripple-address-codec";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FacilityBook } from "../src/book.ts";
import { addressOfSeed, Facility, FacilityRefusal, type Party } from "../src/facility.ts";
import { LoopbackLedger } from "../src/loopback.ts";
import { FailHardSubmitter } from "../src/submit.ts";
import { HOSTILE_ENDPOINTS } from "./hostile-endpoints.ts";
import { deriveElGamalKey } from "../../tools/wconf-keygen.ts";

const ISSUANCE = "00".repeat(24);

// Published test vectors from REVIEW-012's §6, used here only as well-formed
// family seeds. They are not secret and never held value.
const SEED_A = "sp6JdwovBCsiwnMhXuvZGZtPUoGVj";
const SEED_B = "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n";

// ⚠ **Constructed, not invented.** The first draft of this file made up a
// plausible-looking `sEd…` string and every test using it died on
// `checksum_invalid`. A fabricated constant that merely LOOKS right is the
// failure this project has recorded against itself more than once; encoding 16
// fixed bytes is deterministic, checkable, and cannot be wrong about its own
// checksum.
const SEED_C = encodeSeed(Uint8Array.from(Buffer.alloc(16, 0x11)), "ed25519");

const FULL_INFO = {
  info: {
    build_version: "3.3.0",
    network_id: 2,
    server_state: "full",
    validated_ledger: { seq: 4_800_000 },
  },
};

/** A node whose `ledger_entry` answers come from a table the test controls. */
function nodeWith(entries: Record<string, any>) {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const body: any = await req.json();
      const params = body.params?.[0] ?? {};
      if (body.method === "server_info") {
        return Response.json({ result: { status: "success", ...FULL_INFO } });
      }
      if (body.method === "ledger_entry") {
        const key = params.mptoken?.account ?? (params.mpt_issuance ? "ISSUANCE" : "?");
        const node = entries[key];
        if (!node) {
          return Response.json({ result: { status: "error", error: "entryNotFound" } });
        }
        return Response.json({ result: { status: "success", ledger_index: 4_800_000, node } });
      }
      return Response.json({ result: { status: "error", error: "unknown" } });
    },
  });
  return { server, endpoint: `http://127.0.0.1:${server.port}` };
}

function tempBook() {
  const dir = mkdtempSync(join(tmpdir(), "wconf-facility-"));
  return {
    book: FacilityBook.open(join(dir, "book.json"), ISSUANCE),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

const party = (label: string, seed: string): Party => ({
  label,
  seed,
  address: addressOfSeed(seed),
});

async function facilityWith(entries: Record<string, any>, dedicatedSeed = SEED_B) {
  const { server, endpoint } = nodeWith(entries);
  const ledger = await LoopbackLedger.open(endpoint);
  const { book, cleanup } = tempBook();
  const bank = party("bank", SEED_A);
  const dedicated = party("dedicated", dedicatedSeed);
  const facility = new Facility(ledger, new FailHardSubmitter(ledger), book, {
    issuanceId: ISSUANCE,
    bank,
    dedicated,
    fullRange: 100_000,
    ledgerEndpoint: endpoint,
    workRoot: "/tmp/wconf-facility-test",
    autoConfirm: true,
    quietSigner: true,
  });
  return {
    facility,
    bank,
    dedicated,
    book,
    stop: () => {
      server.stop(true);
      cleanup();
    },
  };
}

describe("construction", () => {
  test("refuses a Dedicated Account that is the issuer — a PROTOCOL rule, not a preference", async () => {
    // An issuer cannot convert its own issuance into a confidential balance;
    // the ledger refuses it outright. That is the reason this design has a
    // separate account at all, and stating it as a style choice would be a
    // claim about rippled that rippled does not make.
    await expect(facilityWith({}, SEED_A)).rejects.toThrow(/REFUSED_ISSUER_IS_DEDICATED/);
  });

  test("refuses a party whose seed does not control its claimed address", async () => {
    const { server, endpoint } = nodeWith({});
    const ledger = await LoopbackLedger.open(endpoint);
    const { book, cleanup } = tempBook();
    try {
      expect(
        () =>
          new Facility(ledger, new FailHardSubmitter(ledger), book, {
            issuanceId: ISSUANCE,
            bank: party("bank", SEED_A),
            // A claimed address that belongs to someone else entirely — and
            // NOT the bank's, or the issuer-is-dedicated guard would fire first
            // and this test would pass for the wrong reason.
            dedicated: { label: "dedicated", seed: SEED_B, address: addressOfSeed(SEED_C) },
            fullRange: 100_000,
            ledgerEndpoint: endpoint,
            workRoot: "/tmp/wconf-facility-test",
            autoConfirm: true,
          }),
      ).toThrow(/REFUSED_SEED_ADDRESS_MISMATCH/);
    } finally {
      server.stop(true);
      cleanup();
    }
  });

  test("refuses a non-loopback ledger endpoint for the signer's own reads", async () => {
    // Two processes read the same ledger for two different reasons, and B-15's
    // ruling covers both. The signer's reads are the ones F-23 is actually
    // about.
    const { server, endpoint } = nodeWith({});
    const ledger = await LoopbackLedger.open(endpoint);
    const { book, cleanup } = tempBook();
    try {
      expect(
        () =>
          new Facility(ledger, new FailHardSubmitter(ledger), book, {
            issuanceId: ISSUANCE,
            bank: party("bank", SEED_A),
            dedicated: party("dedicated", SEED_B),
            fullRange: 100_000,
            ledgerEndpoint: HOSTILE_ENDPOINTS.find((h) =>
              h.why.includes("every other harness"),
            )!.endpoint,
            workRoot: "/tmp/wconf-facility-test",
            autoConfirm: true,
          }),
      ).toThrow(/REFUSED_NOT_LOOPBACK/);
    } finally {
      server.stop(true);
      cleanup();
    }
  });
});

describe("the ElGamal key each party reads its own balance with", () => {
  test("comes from the ruled derivation and is checked against the address", async () => {
    const f = await facilityWith({});
    try {
      const key = f.facility.elgamalOf(f.bank);
      // REVIEW-012 §6's V1 vector. If this changes, either the derivation moved
      // or the seed did, and both are worth stopping for.
      expect(key.pk).toBe("02295AD17728DBD75FAB16EE3A38E7D1ED96908DD7E530C90BD8965AF0A7E71246");
      expect(key.address).toBe(f.bank.address);
    } finally {
      f.stop();
    }
  });
});

describe("adopting a supplier an earlier run enrolled", () => {
  // ⚠ `adoptEnrolledSupplier` was ADDED as a round-one fix and shipped with no
  // test — REVIEW-022 round two found that, and a fix nobody can falsify is a
  // fix on the same footing as the cast it replaced.
  const supplier = party("supplier", SEED_C);
  const derived = deriveElGamalKey(SEED_C).pk;

  test("adopts a supplier whose registered key is the derived one", async () => {
    const f = await facilityWith({
      [supplier.address]: { MPTAmount: "1", HolderEncryptionKey: derived },
    });
    try {
      await f.facility.adoptEnrolledSupplier(supplier);
      expect(f.facility.supplierList.map((p) => p.address)).toEqual([supplier.address]);
    } finally {
      f.stop();
    }
  });

  test("refuses an account that carries no key at all", async () => {
    const f = await facilityWith({});
    try {
      await expect(f.facility.adoptEnrolledSupplier(supplier)).rejects.toThrow(
        /REFUSED_NOT_ENROLLED/,
      );
      expect(f.facility.supplierList).toEqual([]);
    } finally {
      f.stop();
    }
  });

  test("refuses an account whose registered key is NOT the derived one", async () => {
    // ⚠ This is the case the cast it replaced could not see: a position the
    // facility would track and could never decrypt.
    const f = await facilityWith({
      [supplier.address]: { MPTAmount: "1", HolderEncryptionKey: "02" + "CD".repeat(32) },
    });
    try {
      await expect(f.facility.adoptEnrolledSupplier(supplier)).rejects.toThrow(
        /REFUSED_KEY_NOT_DERIVED/,
      );
      expect(f.facility.supplierList).toEqual([]);
    } finally {
      f.stop();
    }
  });

  test("refuses a party whose seed does not control its claimed address", async () => {
    const f = await facilityWith({});
    try {
      const liar = { label: "liar", seed: SEED_C, address: addressOfSeed(SEED_B) };
      await expect(f.facility.adoptEnrolledSupplier(liar)).rejects.toThrow(
        /REFUSED_SEED_ADDRESS_MISMATCH/,
      );
    } finally {
      f.stop();
    }
  });
});

describe("refusals before a transaction is built", () => {
  const supplier = party("supplier", SEED_C);
  const supplierEntry = {
    MPTAmount: "1",
    HolderEncryptionKey: deriveElGamalKey(SEED_C).pk,
    MPTokenIssuanceID: ISSUANCE,
  };

  test("a movement against a party the facility does not know is refused", async () => {
    // ⚠ `confidential()` hands the signer a SEED while the book and the ledger
    // lookup use the ADDRESS. A `Party` the facility never enrolled can carry
    // any pairing of the two, so a transaction signed by one account would be
    // booked against another. Found by REVIEW-022's Codex leg.
    const f = await facilityWith({});
    try {
      f.book.record({ kind: "convert", account: f.dedicated.address, amount: 1000, hash: "h1" });
      f.book.record({ kind: "merge", account: f.dedicated.address, amount: 1000, hash: "m1" });
      await expect(f.facility.drawdown(supplier, 10)).rejects.toThrow(/REFUSED_UNKNOWN_PARTY/);
    } finally {
      f.stop();
    }
  });

  test("a movement to a destination with no registered key is an IMPOSSIBILITY, not a rejection", async () => {
    // ⚠ There is no key to encrypt to, so the transaction cannot be built. A
    // facility that reported this as "the ledger refused it" would be
    // describing a round trip that never happens.
    //
    // The destination here is the **Dedicated Account before it has converted**,
    // which is the case that is actually reachable: a supplier only enters the
    // facility's own list by way of an enrolment that required their key.
    const f = await facilityWith({ [supplier.address]: supplierEntry });
    try {
      await f.facility.adoptEnrolledSupplier(supplier);
      f.book.record({ kind: "convert", account: supplier.address, amount: 50, hash: "h1" });
      f.book.record({ kind: "merge", account: supplier.address, amount: 50, hash: "m1" });
      await expect(f.facility.repay(supplier, 10)).rejects.toThrow(
        /REFUSED_DESTINATION_NOT_REGISTERED/,
      );
    } finally {
      f.stop();
    }
  });

  test("a drawdown larger than the tracked balance is refused before any entropy is drawn", async () => {
    const f = await facilityWith({
      [supplier.address]: supplierEntry,
    });
    try {
      await f.facility.adoptEnrolledSupplier(supplier);
      // ⚠ convert lands in the INBOX; the merge is what makes it spendable.
      f.book.record({ kind: "convert", account: f.dedicated.address, amount: 100, hash: "h1" });
      f.book.record({ kind: "merge", account: f.dedicated.address, amount: 100, hash: "m1" });
      await expect(f.facility.drawdown(supplier, 101)).rejects.toThrow(
        /REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE/,
      );
      // The control: one unit less passes every FACILITY guard. Without it the
      // assertion above passes against a facility that refuses everything —
      // which is the shape REVIEW-016 round two found in two of its own new
      // tests, where the case named was never the reason the test failed.
      //
      // ⚠ It asserts on the TYPE, not on the absence of one string. Asserting
      // only `not.toContain(...)` passed for the wrong reason — the signer
      // cannot sign against this fake node, so any failure at all satisfied it,
      // including one thrown before the guards ran. REVIEW-022's Gemini leg
      // found that, and its falsification was exact: an unconditional throw in
      // `confidentialTransfer` would have satisfied both assertions. Every
      // facility guard throws `FacilityRefusal`, so "not a FacilityRefusal"
      // means the guards were passed and the failure came from further down.
      const boundary = await f.facility.drawdown(supplier, 100).catch((e) => e);
      expect(boundary).toBeInstanceOf(Error);
      expect(boundary).not.toBeInstanceOf(FacilityRefusal);
    } finally {
      f.stop();
    }
  });

  test("retiring more than the Dedicated Account holds is refused", async () => {
    const f = await facilityWith({});
    try {
      f.book.record({ kind: "convert", account: f.dedicated.address, amount: 50, hash: "h1" });
      f.book.record({ kind: "merge", account: f.dedicated.address, amount: 50, hash: "m1" });
      await expect(f.facility.retire(51)).rejects.toThrow(
        /REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE/,
      );
    } finally {
      f.stop();
    }
  });

  test("enrolling an account that already carries a HolderEncryptionKey is refused", async () => {
    // ⚠ Registration happens exactly once and the protocol forbids repeating
    // it. Discovering that by submitting is discovering it in public.
    const f = await facilityWith({
      [supplier.address]: { MPTAmount: "5", HolderEncryptionKey: "02CD" },
    });
    try {
      await expect(f.facility.enrolSupplier(supplier, 5)).rejects.toThrow(
        /REFUSED_ALREADY_REGISTERED/,
      );
    } finally {
      f.stop();
    }
  });
});
```

### 6.8 `tools/check-loopback.ts` — 319 lines

```typescript
/**
 * check-loopback.ts — the gate on B-15's step-7 obligation.
 *
 * # The claim this gate makes, stated precisely
 *
 * **No `.ts` file under `facility/` contains a scheme-prefixed URL literal whose
 * host is not loopback, except the sites recorded below, each with its reason.**
 *
 * ⚠ Read that sentence twice, because three of its qualifications were missing
 * from the first draft and `REVIEW-022`'s Codex leg found all three. It says
 * **`.ts`** — `walk` skips Markdown, JSON and every other extension, so a remote
 * URL in `facility/README.md` is invisible here. It says **sites**, not *call
 * sites* — the twelve strings in the hostile fixture are test inputs and nothing
 * calls them. And it says **literal**: a host assembled at run time is invisible
 * to any regex.
 *
 * ⚠ **That is a claim about endpoint literals in `.ts` source, and nothing
 * else.**
 * `CLAIMS.md` **E-141** is why the sentence is that careful: a sibling gate
 * reported *"nine"* when it was counting **files it flagged** rather than call
 * sites, and two of the nine were not call sites at all — one was the gate
 * itself, which necessarily contains its own patterns, and one was a dead
 * exemption its own stale check was hardcoded to skip. **A gate that reports a
 * number is making a claim about what the number counts, and nobody checks that
 * claim.** So this file says what it counts, in the header and in its output.
 *
 * # The two halves, because neither is sufficient
 *
 * * **Static — this gate.** A remote endpoint cannot be written into the
 *   facility's source without either failing the build gate or being recorded
 *   here with a reason someone had to type.
 * * **Dynamic — `facility/src/loopback.ts`.** `LoopbackLedger.open()` refuses a
 *   non-loopback endpoint at runtime, so an endpoint arriving from an
 *   environment variable or a config file is refused too. ⚠ **Unless the risk
 *   has been accepted by name.** On 2026-08-25 the project owner amended
 *   B-15's step-7 answer to allow a remote endpoint for the Devnet demo, and
 *   `WCONF_ACCEPT_REMOTE_LEDGER_RISK`, set to a full sentence, turns the
 *   refusal into a printed disclosure and a stamp on the run record. **This
 *   gate does not see that**, and could not: it reads source, and the hatch is
 *   an environment variable. What it still guarantees is that a remote endpoint
 *   cannot be *written into* the facility without a recorded reason.
 *
 * A source scan alone would miss `WCONF_LEDGER_ENDPOINT=https://…`; a runtime
 * check alone would let a hardcoded remote host sit in the tree until someone
 * ran the wrong path. **Neither is the property. Both together are close, and
 * "close" is the honest word** — nothing here stops the same-host adversary of
 * issue #1 from pointing the whole facility somewhere else.
 *
 *   bun tools/check-loopback.ts        # exit 0 = the claim above holds
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { isLoopbackEndpoint } from "../facility/src/loopback.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SCANNED = ["facility"];

/**
 * Every place under `facility/` that names a host which is not loopback.
 *
 * ⚠ **A reason, not a category.** `CLAIMS.md` E-140: three exemptions in the
 * sibling gate carried a reason that was simply false, and correcting a false
 * reason with a second false reason is how one of them survived a whole review
 * round. If a reason here stops being true, the exemption goes — it does not
 * get reworded.
 */
interface Exemption {
  /** Repository-relative path. */
  file: string;
  /**
   * The exact literal expected at that site, or `"*"` for a whole file.
   *
   * ⚠ **A whole-file exemption is a bigger claim and is reported as one.** The
   * gate prints how many literals it excused under each `"*"`, because
   * `CLAIMS.md` E-141's lesson is that a gate which quietly skips something is
   * a gate whose PASS means less than it looks. A `"*"` that excuses zero
   * literals is stale and fails, exactly like a literal one.
   */
  literal: string;
  reason: string;
}

const EXEMPT: Exemption[] = [
  {
    file: "facility/tests/hostile-endpoints.ts",
    literal: "*",
    reason:
      "Every endpoint the facility must REFUSE, in one file, each with the reason it is there — " +
      "REVIEW-016's two bypasses, round two's unterminated IPv6 literal, `localhost` as a NAME, " +
      "and the remote endpoint every other harness in this repository uses. Nothing here is " +
      "connected to: they are inputs to `isLoopbackEndpoint`, and " +
      "`facility/tests/loopback.test.ts` asserts every one is refused. One exemption instead of " +
      "thirteen near-identical ones, because a list nobody reads is E-140's false reason waiting " +
      "to happen.",
  },
  {
    file: "facility/tests/risk-acceptance.test.ts",
    literal: "http://localhost:1",
    reason:
      "A deliberately REMOTE-CLASSIFIED endpoint that resolves to a local test server. " +
      "`isLoopbackEndpoint` refuses the NAME `localhost` — a name is resolved by something " +
      "this process does not control — while the operating system still sends the request to " +
      "127.0.0.1. That is the only way to execute the accepted-risk hatch's ACCEPTING branch " +
      "without a packet leaving the machine, and REVIEW-023 found that no test executed it: " +
      "the previous one connected to a literal 127.0.0.1 and so never reached " +
      "`assertRemoteRiskAccepted` at all, while its name promised otherwise. The port is a " +
      "template substitution, which this gate normalises to `1`.",
  },
  {
    file: "facility/src/devnet-accounts.ts",
    literal: "https://faucet.devnet.rippletest.net/accounts",
    reason:
      "The Devnet faucet, and it is NOT a ledger read. It mints a throwaway account and returns " +
      "a seed. B-15 is about values that, if wrong, make the signer publish an amount encrypted " +
      "under an adversary's key — a faucet supplies neither a destination key nor an issuer key " +
      "nor a balance. What it does supply is an ADDRESS, and that is not trusted either: " +
      "`addressOfSeed` re-derives it from the seed and the facility refuses a mismatch. The " +
      "account's existence is then confirmed by a read against the LOOPBACK node.",
  },
];

interface Finding {
  file: string;
  line: number;
  literal: string;
}

/**
 * Endpoint literals in one blob of source.
 *
 * Matches a scheme-prefixed URL inside a string. It does **not** try to catch
 * a bare hostname: `"s.devnet.rippletest.net"` with the scheme assembled
 * elsewhere would walk past this, and saying so is better than implying a
 * completeness the regex does not have.
 *
 * ⚠ **One normalisation, and its first version was a mask.** A template
 * substitution in the **port** — `http://127.0.0.1:${port}` — is replaced by `1`
 * before the host is checked, because the HOST is what B-15 is about and a
 * computed port cannot reach a different machine.
 *
 * ⚠ **Substituting `1` for a substitution in the HOST was the hole.**
 * ``http://127.${host}:5005`` normalised to `http://127.1:5005`, which `URL`
 * canonicalises to `127.0.0.1` — so the gate **accepted** a host whose runtime
 * value could be anything at all. `REVIEW-022`'s Codex leg found it, and it is
 * `CLAIMS.md` E-141's shape exactly: a normalisation added to stop false
 * positives that quietly created a false negative. **Any substitution in the
 * host now fails the check outright**, and both shapes are in `selfTest`.
 */
export function endpointLiterals(source: string): { line: number; literal: string }[] {
  const out: { line: number; literal: string }[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\b(?:https?|wss?):\/\/[^\s"'`)]+/g)) {
      out.push({ line: i + 1, literal: normaliseTemplate(m[0]) });
    }
  }
  return out;
}

/**
 * Replace a template substitution in the PORT with `1`, and make a substitution
 * anywhere in the HOST unrepresentable as loopback.
 *
 * ⚠ The `HOST-SUBSTITUTION` sentinel is not a valid host, so `URL` parsing fails
 * and `isLoopbackEndpoint` returns false — which is what makes such a line a
 * finding that has to be recorded with a reason rather than waved through.
 */
export function normaliseTemplate(literal: string): string {
  const scheme = literal.match(/^[a-zA-Z]+:\/\//)?.[0] ?? "";
  const rest = literal.slice(scheme.length);
  const colon = rest.indexOf(":");
  const slash = rest.indexOf("/");
  const hostEnd = Math.min(colon < 0 ? rest.length : colon, slash < 0 ? rest.length : slash);
  const host = rest.slice(0, hostEnd);
  const after = rest.slice(hostEnd);
  if (/\$\{/.test(host)) return `${scheme}HOST SUBSTITUTION${after.replace(/\$\{[^}]*\}/g, "1")}`;
  return `${scheme}${host}${after.replace(/\$\{[^}]*\}/g, "1")}`;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === "node_modules") continue;
      yield* walk(p);
    } else if (p.endsWith(".ts")) {
      yield p;
    }
  }
}

function scan(): { findings: Finding[]; literalCount: number; fileCount: number } {
  const findings: Finding[] = [];
  let literalCount = 0;
  let fileCount = 0;
  for (const dir of SCANNED) {
    for (const path of walk(join(ROOT, dir))) {
      fileCount++;
      const rel = relative(ROOT, path);
      const source = readFileSync(path, "utf8");
      for (const { line, literal } of endpointLiterals(source)) {
        literalCount++;
        // A loopback literal is the whole point and is never a finding.
        if (isLoopbackEndpoint(literal)) continue;
        // ⚠ **Everything else is a finding, including a documentation URL.**
        // There is no host allowlist and no prose filter: a `https://github.com/…`
        // in a `facility/` file fails this gate until someone records it with a
        // reason. That is deliberate and it is the cheap direction to be wrong
        // in — a false positive costs one exemption someone had to type, and a
        // false negative costs F-23.
        //
        // ⚠ An earlier version of this comment claimed the opposite: that only
        // `rippletest.net` and bare IPs were treated as reachable hosts and
        // that prose was filtered out. **No such filter existed.** REVIEW-022's
        // Gemini leg found it — a sentence describing behaviour the line below
        // does not have, three lines above the line that does not have it.
        findings.push({ file: rel, line, literal });
      }
    }
  }
  return { findings, literalCount, fileCount };
}

/** The gate's own negative control: it must be able to fail. */
function selfTest(): void {
  const remote = endpointLiterals(`const E = "https://s.devnet.rippletest.net:51234/";`);
  if (remote.length !== 1 || isLoopbackEndpoint(remote[0].literal)) {
    throw new Error("check-loopback: the matcher does not flag a remote endpoint — it is a no-op");
  }
  const local = endpointLiterals(`const E = "http://127.0.0.1:5005";`);
  if (local.length !== 1 || !isLoopbackEndpoint(local[0].literal)) {
    throw new Error("check-loopback: the matcher does not accept a loopback endpoint");
  }
  // The two shapes REVIEW-016 found walking through the Rust check.
  for (const bad of ["http://127.attacker.example/", "http://127.0.0.1@attacker.example/"]) {
    if (isLoopbackEndpoint(bad)) {
      throw new Error(`check-loopback: ${bad} is being read as loopback`);
    }
  }
  // The template normalisation, tested rather than asserted in the header.
  // A computed PORT on a loopback host is fine; a computed HOST is not.
  const computedPort = endpointLiterals("const e = `http://127.0.0.1:${server.port}`;");
  if (computedPort.length !== 1 || !isLoopbackEndpoint(computedPort[0].literal)) {
    throw new Error("check-loopback: a computed port on 127.0.0.1 should normalise to loopback");
  }
  for (const source of [
    "const e = `http://${host}:5005`;",
    // ⚠ The one that got through. `127.${host}` became `127.1`, which URL folds
    // to 127.0.0.1 — so the gate accepted a host it could not know.
    "const e = `http://127.${host}:5005`;",
    "const e = `http://${a}.${b}.0.1:5005`;",
  ]) {
    const computed = endpointLiterals(source);
    if (computed.length !== 1 || isLoopbackEndpoint(computed[0].literal)) {
      throw new Error(
        `check-loopback: a substitution in the HOST must not normalise into loopback — ${source}`,
      );
    }
  }
}

function main(): number {
  selfTest();
  const { findings, literalCount, fileCount } = scan();

  const unmatched = new Set(EXEMPT.map((e) => `${e.file}::${e.literal}`));
  const excusedByFile = new Map<string, number>();
  const unrecorded: Finding[] = [];
  for (const f of findings) {
    const exact = EXEMPT.find((e) => e.file === f.file && e.literal === f.literal);
    const whole = EXEMPT.find((e) => e.file === f.file && e.literal === "*");
    const hit = exact ?? whole;
    if (!hit) {
      unrecorded.push(f);
      continue;
    }
    unmatched.delete(`${hit.file}::${hit.literal}`);
    if (hit.literal === "*") {
      excusedByFile.set(hit.file, (excusedByFile.get(hit.file) ?? 0) + 1);
    }
  }

  console.log(
    `check-loopback: ${fileCount} .ts files under ${SCANNED.join(", ")}, ` +
      `${literalCount} scheme-prefixed URL LITERALS (not files, not call sites — literals, ` +
      `and only in .ts), ` +
      `${findings.length} of them non-loopback, ${EXEMPT.length} recorded exemptions.`,
  );
  for (const [file, n] of excusedByFile) {
    console.log(`  whole-file exemption excused ${n} literal(s) in ${file}`);
  }

  let failed = false;
  for (const f of unrecorded) {
    failed = true;
    console.error(
      `\n✗ UNRECORDED non-loopback endpoint\n    ${f.file}:${f.line}\n    ${f.literal}\n` +
        `  CLAIMS.md B-15's step-7 ruling requires the facility's ledger reads to go to a node\n` +
        `  the operator runs. If this is not a ledger read, add it to EXEMPT with the reason.`,
    );
  }
  for (const key of unmatched) {
    failed = true;
    console.error(
      `\n✗ STALE exemption — nothing in the tree matches it\n    ${key}\n` +
        `  An exemption that matches nothing is a reason nobody is checking. Delete it.`,
    );
  }
  if (!failed) {
    console.log(
      `PASS — every non-loopback URL literal in the .ts files under ${SCANNED.join(", ")} is ` +
        `recorded with a reason, and every recorded exemption still matches something. ` +
        `⚠ Says nothing about Markdown, JSON, or a host assembled at run time.`,
    );
  }
  return failed ? 1 : 0;
}

if (import.meta.main) process.exit(main());
```

## 7. The record, and the register rows the fixes wrote

### 7.1 The saved run record and the balance book, redacted of seeds

`~/.wconf/facility-state.json`, `runs[0]` — **the record of the run that
happened BEFORE the C-5 fix**, so it holds 27 movements:

```
at:                  2026-08-25T12:22:04.446Z
endpoint:            https://s.devnet.rippletest.net:51234/
rippled:             3.3.0
underB15Conditions:  false
b15Note:             REMOTE endpoint under the accepted-risk hatch. tapFailHard in force; loopback NOT. This run is not evidence about the loopback obligation (CLAIMS.md F-23, E-151)
movements:           27

  1  dedicated authorized                hidden        2904BF23D0D8C731…
  2  public payment to dedicated         PUBLIC  5000  32A84E0913A435FA…
  3  float conversion                    PUBLIC  5000  BD86D82401C49C8B…
  4  supplier-A authorized               hidden        B49D760A9FF5EAB4…
  5  public payment to supplier-A        PUBLIC    10  AE1D6A8367A09D47…
  6  supplier-A enrolment convert        PUBLIC    10  AF017C12D6598A6E…
  7  supplier-A merged inbox             hidden        08099E4F7ADBAFDC…
  8  supplier-B authorized               hidden        3157C9CCA348D35C…
  9  public payment to supplier-B        PUBLIC    10  625530CC7EB9997A…
 10  supplier-B enrolment convert        PUBLIC    10  4A8B59689F65ADAE…
 11  supplier-B merged inbox             hidden        857CE67A6EB50982…
 12  supplier-C authorized               hidden        DCE908DB73029B76…
 13  public payment to supplier-C        PUBLIC    10  3D5A8061D069A25A…
 14  supplier-C enrolment convert        PUBLIC    10  0A7E497EE0F7C406…
 15  supplier-C merged inbox             hidden        EACF2D1FE9273FB6…
 16  drawdown dedicated → supplier-A     hidden        64B4B6308C4CF2D0…
 17  supplier-A merged inbox             hidden        FE6EEE94CE74F637…
 18  repayment supplier-A → dedicated    hidden        9D118804A983E548…
 19  dedicated merged inbox              hidden        C6FCA06774E4764B…
 20  drawdown dedicated → supplier-B     hidden        809394B5634C1282…
 21  supplier-B merged inbox             hidden        837B9766BCA1BABB…
 22  repayment supplier-B → dedicated    hidden        E45FF08C10FA8525…
 23  dedicated merged inbox              hidden        715765D181E19DA5…
 24  drawdown dedicated → supplier-C     hidden        5238AECC0094CBD9…
 25  supplier-C merged inbox             hidden        3316187FB4205070…
 26  retire 1000                         PUBLIC  1000  59290E01CBE835F4…
 27  retire 2000                         PUBLIC  2000  523ED12EA18C42CD…
```

`~/.wconf/facility-book.json`, `movements` — **the book, which is per-ACCOUNT**,
so one `ConfidentialMPTSend` appears twice (a `send-out` and a `send-in`) under
one hash:

```
issuanceId: 0048BEC27991E04E26DA60230B894B7C12E51E7FBC0A537E
movements:  25

  1  convert       rN5CeCYq…   5000  BD86D82401C49C8B…
  2  merge         rN5CeCYq…   5000  3F264EB84BD3804C…
  3  convert       rEpLC44f…     10  AF017C12D6598A6E…
  4  merge         rEpLC44f…     10  08099E4F7ADBAFDC…
  5  convert       rhjKYPyY…     10  4A8B59689F65ADAE…
  6  merge         rhjKYPyY…     10  857CE67A6EB50982…
  7  convert       rsXnKDmc…     10  0A7E497EE0F7C406…
  8  merge         rsXnKDmc…     10  EACF2D1FE9273FB6…
  9  send-out      rN5CeCYq…    900  64B4B6308C4CF2D0…
 10  send-in       rEpLC44f…    900  64B4B6308C4CF2D0…
 11  merge         rEpLC44f…    900  FE6EEE94CE74F637…
 12  send-out      rEpLC44f…    300  9D118804A983E548…
 13  send-in       rN5CeCYq…    300  9D118804A983E548…
 14  merge         rN5CeCYq…    300  C6FCA06774E4764B…
 15  send-out      rN5CeCYq…    250  809394B5634C1282…
 16  send-in       rhjKYPyY…    250  809394B5634C1282…
 17  merge         rhjKYPyY…    250  837B9766BCA1BABB…
 18  send-out      rhjKYPyY…    250  E45FF08C10FA8525…
 19  send-in       rN5CeCYq…    250  E45FF08C10FA8525…
 20  merge         rN5CeCYq…    250  715765D181E19DA5…
 21  send-out      rN5CeCYq…   1400  5238AECC0094CBD9…
 22  send-in       rsXnKDmc…   1400  5238AECC0094CBD9…
 23  merge         rsXnKDmc…   1400  3316187FB4205070…
 24  convert-back  rN5CeCYq…   1000  59290E01CBE835F4…
 25  convert-back  rN5CeCYq…   2000  523ED12EA18C42CD…
```

⚠ **Nothing in this packet tells you what the counts should be. Derive them.**

### 7.2 `CLAIMS.md` F-28 — the new row, written to explain a round-one finding

```
266:| F-28 | ⚠ **`tapFailHard` stops a `tec` reaching the LEDGER. It does not stop the ciphertext reaching the NODE you submitted to — and under a remote ledger source that node is the one F-23 is about.** The facility reads the destination's and the issuer's `HolderEncryptionKey` from an endpoint, builds a `ConfidentialMPTSend` encrypted to whatever it read, and then **submits the signed blob to that same endpoint**. A lying source therefore receives the ciphertext encrypted under its own key **before** the flag can prevent application or relay. The flag prevents *publication*; it prevents no *disclosure to the submitter*. ⚠ **So under E-151's amendment the two halves of B-15's answer are not merely unequal in strength — Part C does not cover the residual Part A was carrying at all.** With loopback, the node is the operator's own and the question does not arise; that is the whole reason the ruling called loopback the protection and the flag a seatbelt | **Read at source and reasoned, 2026-08-25; NOT executed.** Found by `REVIEW-023`'s Codex leg while checking whether the executed control established what four documents said it did. ⚠ **What was executed is narrower than those documents claimed**: `tapFailHard` changed the treatment of a `tecNO_AUTH` from a plaintext `Payment` — no substituted key, no `ConfidentialMPTSend`, no `tecBAD_PROOF`, no attacker-key ciphertext. The "all `tec`" step is `Transactor.cpp:1645-1651`'s text, not this run's. **What would settle it:** a substituted-key Send under the flag, against a source that cannot obtain the blob |
```

### 7.3 The rows F-28 rests on, and the ones the fixes edited

```
198:| E-146 | **Architecture §6 step 7 is BUILT AND EXECUTED — `facility/`, the receivables facility as application logic.** ⚠ **Executed under E-151's amendment, so `underB15Conditions: false`** — the ledger source was remote and this run says nothing about the loopback obligation. **Reviewed in two rounds, three legs → E-150.** ~~and it is NOT EXECUTED~~ — **struck 2026-08-25.** The Dedicated Account, the single conversion, supplier enrolment, drawdowns, repayments, the balance book and retirement in tranches. What the build actually enforces, as distinct from what it describes: **`LoopbackLedger` is the only ledger read path** and refuses a non-loopback literal *before it connects*, so a misconfigured facility cannot tell a remote host the shape of its reads on the way to failing; **`FailHardSubmitter` is the only submission path** and has no method that can omit `fail_hard`, with the method set pinned by a test so a new path cannot appear unnoticed; **`FacilityBook`** is TASK ZERO §9's R-5 balance-tracking requirement, and reports search **widths** rather than seconds because P-8 forbids a benchmark number without hardware, parameter set and methodology. ⚠ **The loopback check is STRICTER than the signer's**: a numeric literal in `127.0.0.0/8` or `::1` only, because a name is resolved by something the process does not control — `REVIEW-016`'s two bypasses and round two's unterminated `[::1` are negative test inputs rather than prose. ⚠ **NOT EXECUTED means no facility transaction has been submitted to any ledger**, and every capability sentence about it is therefore about code and tests, not about rippled's answer — see **B-18** | **2026-08-25.** 63 tests (`bun test facility tools`), a real type-check (`bunx tsc --noEmit` — added because `bun build` is not one, E-145), `tools/check-loopback.ts` PASS, and `tools/check-blinding-sources.ts` extended to walk `facility/` and still reporting 5 call sites, **with its coverage of the new tree spot-checked by planting a call and watching it fail**. ⚠ **A demo of the happy path is not evidence of confidentiality**, and the unit tests drive fake nodes — what a fake node proves is that the code does what the test says. What the Devnet run adds is ledger acceptance and the decrypted-balance agreement, and what it does **not** add is anything about the loopback obligation | **A, executed** for ledger acceptance and the decrypted positions; **no grade at all** for the loopback half of B-15, which this run did not test |
200:| E-148 | ⚠ **B-15 Option A's real cost is a FULL DEVNET SYNC, and there is no rehearsal network. Measured, not estimated.** The decision request called Option A *"None. Not one line"* of code and named the operational dependency without pricing it. Priced 2026-08-25: `xrpllabsofficial/xrpld:3.3.0` reports git `00a178fb92ca49521b937ae1a99d863765ea8a90` — **the same commit F-23 was read at** — and is **amd64 only**, so it runs emulated on Apple Silicon. Three things had to be discovered rather than read: the peer hub named in the documentation, `r.devnet.rippletest.net:51235`, **refused TCP** while `s.devnet.rippletest.net:51235` accepted (→ U-48); the validator-list key had to be fetched from the list site itself; and a **macOS bind mount cannot carry NuDB** — the first attempt could not keep up at all and a named docker volume was needed. ⚠ **And it still did not finish. TWO runs, two different failure modes, and the second is the one that settles it.** A fresh node must acquire a whole account state tree while Devnet keeps closing ledgers; each attempt aborted (`InboundLedger: … abort good:29130 dupe:822`).
207:| E-149 | **`fail_hard` on the `submit` RPC is what sets `TapFailHard`, and a `tec` under it is discarded and never relayed. READ AT SOURCE ~~AND NOT EXECUTED~~ — EXECUTED 2026-08-25.** rippled 3.3.0 (`00a178f`): `src/xrpld/rpc/handlers/transaction/Submit.cpp:32-37` turns the RPC parameter into `NetworkOPs::FailHard`; `src/xrpld/app/misc/NetworkOPs.cpp:1683-1684` sets `TapFailHard` in the apply flags; `src/libxrpl/tx/Transactor.cpp:1645-1651` reads *"If the TapFailHard flag is set, a tec result must not do anything"* and calls `ctx_.discard()`; and `NetworkOPs.cpp:1833`'s `enforceFailHard` also stops the transaction being kept locally **or relayed to peers**. That is exactly the F-23 consequence removed. ~~⚠ **`run-facility.ts` §1 runs BOTH ARMS … and it has never run.**~~ **EXECUTED 2026-08-25 on Devnet, both arms, and they were distinguishable.** The same signed bytes, twice: **with `fail_hard`** — `tecNO_AUTH`, `applied=false`, **absent from the validated ledger after three ledger closes, and the submitter's `Sequence` unchanged at 4767433** (so no fee was taken); **without it** — the identical bytes, `tecNO_AUTH`, `applied=true`, **on the validated ledger, `Sequence` 4767433 → 4767434**. ⚠ **The two-phase separation is what makes that a control rather than a coincidence**: `REVIEW-022` round two found that submitting both arms back to back could not distinguish *"A discarded, B applied"* from *"A applied, B a duplicate"*, so arm A is now checked absent **before** arm B is sent | **2026-08-25, read at source** from `raw.githubusercontent.com/XRPLF/rippled/3.3.0`. The tag was fetched rather than reconstructed from this project's notes. ⚠ **The caveat that survives, narrowed by `REVIEW-023`:** what was executed is that **`tapFailHard` changed the treatment of a `tecNO_AUTH`** produced by a plaintext `Payment`. The **F-23 case itself was not executed** — no substituted `HolderEncryptionKey`, no `ConfidentialMPTSend`, no `tecBAD_PROOF`, no attacker-key ciphertext. The general "all `tec`" conclusion rests on the **source reading**, which is what `Transactor.cpp:1645-1651` says and is why it was read first. → **F-28** | **A, executed** — and read at source first, which is why the execution confirms a reading rather than replacing one |
209:| E-151 | **B-15's step-7 answer was AMENDED by the project owner, and the amendment is recorded in code rather than only in prose.** Option A — loopback — was ruled on 2026-08-25, taken, and then **costed**: two runs, ~2.5 hours, 6.9 GB of node store, `complete_ledgers: empty` throughout, one OOM kill and one hour pegged at 1663% CPU after the memory ceiling was raised (E-148). The remaining routes are not coding-session decisions, so the choice went back to the owner, who **extended `REVIEW-019`'s named risk acceptance to the facility's Devnet demo**. ⚠ **The reasoning is that every earlier milestone — steps 2, 3, 4, 6 and ConvertBack — ran against the same public endpoint under the same acceptance, and that a demo with throwaway keys that will never hold value is not *"anything a user would rely on"*. That is a judgement, not a fact.** ⚠ **Part C is unchanged**: `tapFailHard` is set on every submission and removes the *consequence* of a wrong read; the loopback half, which removes the *risk*, is not in force. ⚠ **Nothing about F-23 changed** — it is executed, and TLS does not address it | **2026-08-25.** Kept honest rather than kept quiet: `WCONF_ACCEPT_REMOTE_LEDGER_RISK` must hold a **full sentence naming F-23** before `facility/` reads a non-loopback endpoint; a near miss is refused **differently** from an unset variable, so nobody can believe they enabled it when they did not; `REMOTE_LEDGER_DISCLOSURE` prints in full on **stderr**; and every run record carries **`underB15Conditions`**, so a later reader gets the answer from the record instead of reasoning about a hostname — which is what `REVIEW-016` found two ways past. `facility/tests/risk-acceptance.test.ts`: 10 tests over the four states and the disclosure's wording, the latter because E-126 records what an unasserted disclosure surface collects. ⚠ **The amendment has had no adversarial review, and neither had the ruling it amends** | A, reasoned |
210:| E-152 | **`REVIEW-023` reviewed the accepted-risk hatch, the post-execution fixes and the executed claims — seven findings, all upheld, none stale — and FOUR of the seven were about what an execution is evidence OF.** That is a category no earlier round had to judge, because until 2026-08-25 there was nothing executed to overstate. The two serious ones: (a) four documents said the run *"removed F-23's consequence"* when the executed control was a plaintext `Payment` producing `tecNO_AUTH` — no substituted key, no `ConfidentialMPTSend`, no `tecBAD_PROOF` — so the *"any `tec`"* step is `Transactor.cpp`'s text and not the run's, **and the leg then found F-28, which the session had not seen at all**; (b) `underB15Conditions` measured only loopback-ness while `run-facility.ts` submits **without** the flag on every run, so a future loopback run would have been stamped *"both halves in force"*. Also: the hatch's **accepting branch was executed by no test** — the one that claimed to connected to `127.0.0.1` and never reached the check; the mandatory disclosure claimed §10.5 evidence the driver does not collect, **and the wording tests skipped exactly that paragraph**; *"27 validated transactions"* was wrong in six documents because `convertFloat` **discarded a returned `Movement`** for a merge that had validated; and F-27's explanation carried two fabricated absolutes | **2026-08-25.** ⚠ **Freezing the tree is what made this round clean.** `REVIEW-022`'s Codex leg watched files move under it and produced a stale finding; this one was given a **pushed, frozen commit** and produced seven findings and no stale ones — same tool, same access, one procedural change. ⚠ **The leg declined to claim verification it could not perform**, naming the four numbers it could not check against the chain because outbound DNS was blocked in its sandbox. ⚠ **The session's own contradiction sweep ran and missed nine live denials**, because it excluded lines mentioning E-148 and B-18 — where several of the hits were. **An exclusion filter added to reduce noise hides the signal it was tuned against.** Adjudicated in `REVIEW-023c` | A, executed — the *review* is what was executed |
219:| B-18 | ⚠ **LARGELY CLOSED 2026-08-25 → E-146, E-149, F-27. What remains is narrower and is stated at the end of this row.** rippled accepts them: **28 validated facility transactions** — ⚠ **the facility's own movements**: authorize, Payment, Convert, Send, MergeInbox, ConvertBack. **31** counts everything the program submitted and the ledger applied, adding the two issuance-setup transactions and the fail-hard control's unflagged arm. ⚠ **It was quoted as 27 in six documents until `REVIEW-023`**, because `convertFloat` awaited the Dedicated Account's post-conversion merge and **discarded the `Movement` it returned** — the transaction validated, the book recorded it, and the run record did not. **A count taken from a record that its own producer under-fills is E-141's shape again.** — issuance `0048BEC27991E04E26DA60230B894B7C12E51E7FBC0A537E`, and every party's decrypted `ConfidentialBalanceSpending` equals the book's prediction — dedicated 0, supplier-A 610 (`10+900−300`), supplier-B 10, supplier-C 1410 — with the issuance's **plaintext** `ConfidentialOutstandingAmount` at **2030**, exactly the sum of the three hidden positions. All four registered `HolderEncryptionKey`s are the ruled derivation. `observer-harness --assert-no-r-reuse` PASSED over 14 transactions. ⚠ **STILL OPEN: the run was NOT under B-15's conditions** (E-151), and `run-facility.ts` still does **not** assert all four of §10.5's state changes per movement — it checks the outstanding-amount delta on the float conversion and reconciles decrypted balances, and the per-position verification above was done **after the fact by hand rather than by the driver**. ~~**Whether rippled accepts the facility's transactions at all.** `facility/` is built, type-checked and covered by 63 tests, and **none of it has been submitted to any ledger**.~~ **Struck 2026-08-25 — it has.** Everything the tests establish is established against **fake nodes this project wrote**: that the code refuses what it says it refuses, that it sets `fail_hard`, that the book's arithmetic is right. What they cannot establish is the thing every earlier milestone established first — that rippled answers `tesSUCCESS`, that the state changes are XLS-0096 §10.5's, and that the confidential balances decrypt to what the book predicts. ⚠ **The specific untested claims**: that the Dedicated Account's single Convert registers a derived `HolderEncryptionKey` and moves the whole float; that a drawdown, a MergeInbox and a repayment round-trip; that retirement in tranches publishes each tranche size (F-24) and moves `sfConfidentialOutstandingAmount` by exactly the amount; and that `tapFailHard` behaves as E-149 reads it | **A loopback rippled that finishes syncing Devnet.** `tools/loopback-node/node.sh start && … wait`, then `bun facility/run-facility.ts --auto-confirm`. ⚠ **Not a remote endpoint** — B-15's answer is that the public endpoint is not sufficient for the facility, and E-148 is what Option A costs. The node from this session was left running; if it reached `full`, the run is one command |
262:| F-24 | **Our own facility walkthrough understates what a ConvertBack publishes.** `FACILITY-WALKTHROUGH-2026-08-20.md` §3 step 9 says *"Public: the aggregate change"*, and §4's disclosure table is written the same way. **`MPTAmount` is a plaintext field on every individual `ConfidentialMPTConvertBack`** (XLS-0096 §10.3), so an observer sees **each withdrawal's own amount**, not merely the net movement in `sfConfidentialOutstandingAmount`. The two ConvertBacks of E-131 read 95 and 191 straight off the validated transactions. ⚠ **This is a finding against THIS PROJECT's document, not against the specification** — XLS-0096 §10.1 and its own §10.7 worked example are explicit that the ConvertBack amount is revealed. The walkthrough's sentence would let a reader conclude that retiring a facility in tranches hides the tranche sizes. It does not | **2026-08-25, executed.** Read back off validated ledgers 4743286 and 4743289. Corrected in the walkthrough the same day; recorded here because a wrong disclosure sentence is exactly what `CLAIMS.md` exists to catch, and this one survived the walkthrough's own `claims-check` | A, executed |
263:| F-25 | **`tapFailHard` cannot be bound into a transaction. It is a submission-time choice, and only the submitter can make it.** `TapFailHard` is an `ApplyFlags` value, not a transaction flag: it enters through the `submit` RPC's `fail_hard` parameter (rippled 3.3.0 `Submit.cpp:32-37` → `NetworkOPs.cpp:1683-1684`) and is not a field of the signed blob. ⚠ **This is why B-15's Part C is a convention rather than a property, and it is a structural reason rather than a procedural one.** A signer that wanted its transaction never to publish a `tec` **cannot express that wish** — there is nothing to sign that carries it. Whoever holds the blob decides, and a signer that does not submit has handed the decision away by construction. The decision request said *"nothing forces a separate submitter to set the flag"*; this is why nothing can | **Read at source 2026-08-25**, rippled `3.3.0`/`00a178f`. **Not a defect in rippled** — the flag is a node-local application policy and belongs where it is. It is a consequence for any design that separates signing from submission, which is what ADR-0001 accepted and what architecture §1 calls load-bearing in both halves |
265:| F-27 | **`ConfidentialMPTConvert` deposits into the holder's INBOX, not into their spendable balance — a `ConfidentialMPTMergeInbox` is required before any of it can be sent.** Read off the ledger on 2026-08-25 after a validated Convert of 5000 on `rQfHjoAYnpSSuvqoYK1eYTiBjoT3az65pB`: `ConfidentialBalanceSpending` decrypted to **0** and `ConfidentialBalanceInbox` to **5000**. ⚠ **This project had the fact in front of it three times and never wrote it down** — every earlier driver (`spike-2026-08-17/convert.ts`, `spike-step3`, `spike-step6`) performs a MergeInbox immediately after its Convert, and one of them even labels it *"not a signer operation"* — so the sequence was copied without the reason ever being recorded. The facility's balance book therefore modelled a Convert as crediting `spending`, and the FIRST Devnet run refused to reconcile: expected 5000, ledger said 0 | **2026-08-25, executed.** ⚠ **No unit test could have caught it and none did**: the suite asserts this project's model of the protocol against itself, and only the ledger says what the protocol does. `CLAUDE.md`'s standard arriving from the other side — the transaction returned `tesSUCCESS` and **the model of what it did was wrong**. Fixed in `facility/src/book.ts` (`convert` credits the inbox) and `facility/src/facility.ts` (`convertFloat` and `enrolSupplier` merge afterwards), with the ledger reading quoted at both sites so the next reader does not have to re-derive it | A, executed |
267:| F-23 | **A wrong ledger read is a CONFIDENTIALITY break, not a rejected transaction — and the signer cannot control which.** A `ConfidentialMPTSend` encrypts the amount to the destination's `HolderEncryptionKey` and the issuer's `IssuerEncryptionKey`, both read from the ledger. rippled verifies against the keys **it** holds — `ConfidentialMPTSend.cpp:132` takes `(*sleDestinationMPToken)[sfHolderEncryptionKey]` — so a substituted key fails the proof. It fails with **`tecBAD_PROOF`** (`ConfidentialTransfer.cpp:451`; `TER.h:371` makes it 199, a `tec`), and `Transactor.cpp:1653-1656` with `isTecClaimHardFail` (`applySteps.h:40`) **applies a `tec` to the ledger** unless the submitter set `tapFailHard`. So an adversary who controls what the signer reads gets the holder to publish the amount encrypted under a key the adversary holds, **and the failed transaction keeps it on chain**. The signer does not submit, so it does not get to set that flag | ~~**Read at source 2026-08-19.** ⚠ **Not executed**~~ — **EXECUTED 2026-08-19 and it HELD.** `tools/spike-step2-2026-08-19/f23-substituted-key.ts` built a Send encrypting the amount to an adversary's key instead of the destination's registered one. `tecBAD_PROOF`, **recorded on validated ledger 4603815**, hash `7A283EE5920EBB97AB90F4BC92B4E4E293C6DCE541A9607277D45DA4145AF160`. The amount **42 was recovered from public ledger data by the adversary**, holding only the key they supplied; **the intended destination could not decrypt it at all**. The published ciphertext is byte-identical to what was submitted. ⚠ **This is what a wrong READ costs. It is not a network attack** — nothing was compromised. Mitigated, not closed: TLS is required for any non-loopback endpoint, the signer re-reads the destination key before signing, and it checks the ledger's `HolderEncryptionKey` for **its own** account against the key it holds — **there is no such anchor for the destination's key or the issuer's** (B-15) | A, executed |
```
