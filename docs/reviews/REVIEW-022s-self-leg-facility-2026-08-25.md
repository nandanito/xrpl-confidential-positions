# REVIEW-022s — the session's own leg, architecture §6 step 7

**Date 2026-08-25. Round one. Written before either external leg returned**, so
that what it found is not contaminated by what they found.

⚠ **This project's own record says a self leg is the weak one**: *"self-review
finds mechanisms, misses instances"*. That is the prior. What follows is
recorded because on this milestone the ordering came out the other way — the
most serious defect in the round is S-1, and neither external leg reported it.

---

## S-1 — CRITICAL. **Every plaintext transaction was submitted twice, and the second submission could only fail.**

`facility/src/submit.ts` had one method, `signAndSubmit`, that built, signed
**and submitted**. Every caller in `facility/src/facility.ts` then did:

```ts
const { hash } = await this.submitter.submitValidated(
  (await this.buildPlaintext({ … }, p.seed)).blob,   // ← already submitted it
  `${p.label} MPTokenAuthorize`,
);
```

So `MPTokenAuthorize`, the public `Payment` and `ConfidentialMPTMergeInbox` were
each submitted, and then the **same blob** was submitted a second time.
`submitValidated` requires a `tes` from its own submission, and the second
submission of an already-applied transaction cannot produce one — so **every
plaintext step in the facility would have thrown**, on the first run, on Devnet.

**Why it hid:** the unit tests drive a fake node that answers `tesSUCCESS` to
every `submit`, so a double submission looks like a single one. Nothing in the
suite could tell the two apart, and nothing was executed.

**Found by** reading `submit.ts` against its callers rather than by a test —
which is `CLAIMS.md` E-139's lesson exactly: *running the artifact catches what
a fix prints; only reading the whole file catches what it leaves standing.*

**Fixed:** `signAndSubmit` is split into `sign` (build and sign, **no network**)
and the existing `submitBlob`. That also leaves **exactly one** path to the
network, which is what makes *"no path omits `tapFailHard`"* a property of the
shape rather than of everyone remembering. `facility/tests/submit.test.ts` now
asserts that signing submits nothing.

---

## S-2 — HIGH. **`submitValidated` checked the PROVISIONAL engine result and never the validated metadata.**

`submit` reports what happened when the transaction was applied to *this node's
open ledger*. What settles it is `TransactionResult` in the metadata of the
**validated** transaction, and the two can differ.

`Facility.confidential` checked the validated metadata; the three plaintext
paths did not. So a `Payment` that reported `tesSUCCESS` at submit and validated
as a `tec` would have been recorded in the book as a completed movement — and
the book would then have been wrong by exactly that amount, permanently, with
every later reconciliation blaming the wrong thing.

**Fixed** in `submitValidated`, so every path gets it, and the duplicated check
in `Facility.confidential` is removed rather than left as a second copy.

---

## S-3 — MEDIUM. **The single-conversion guard was an in-memory flag on a resumable driver.**

TASK ZERO §9's design rule is that value enters confidentiality **once, in
aggregate**. `Facility.convertFloat` enforced it with `this.floatConverted`, a
field on the object — which is `false` again on every process start, and
`run-facility.ts` is resumable by design.

**Fixed:** the guard now reads the ledger. A registered `HolderEncryptionKey` is
the durable fact — it can only have been written by a Convert and it can only be
written once — and the in-memory flag is kept as the within-process half.

⚠ **The comment next to it is the load-bearing part and it survives:** this is
**our** rule, not the protocol's. rippled would accept a second Convert. What it
would cost is a second public amount.

---

## S-4 — MEDIUM. **The driver reached into the facility's private state with a cast, skipping every check.**

`run-facility.ts` adopted an already-enrolled supplier with
`(facility as any).suppliers.set(s.address, s)`. `enrolSupplier` checks that the
seed controls the address, that the derivation agrees, and that the key **on the
ledger** is the derived one; the cast skipped all three. A resumed run could
therefore have tracked a position it could not decrypt.

**Fixed:** `Facility.adoptEnrolledSupplier` does the checks and skips only the
transactions.

---

## S-5 — LOW. **A `merge` movement recorded `amount: 0`.**

The movement log is supposed to explain the position it produced. Recording zero
on the one transaction whose whole job is to move value leaves a log that says
nothing happened.

**Fixed:** the caller states what it believes the inbox held and
`FacilityBook.record` **refuses to disagree silently** — a merge for the wrong
amount throws. That is a check the book did not have and a test now drives.

---

## What this leg looked for and did NOT find

Recorded because "found nothing" in a named place is a result and an unnamed
silence is not.

* **A non-loopback ledger read.** None. Traced every call to `rawCall`, which is
  reachable only through `LoopbackLedger`, whose constructor is private and whose
  only entry point refuses a non-loopback literal before connecting.
* **A way past `isLoopbackEndpoint`.** ~~Tried decimal (`2130706433`), octal
  (`0177.0.0.1`), short form (`127.1`), trailing dot, IPv4-mapped IPv6
  (`[::ffff:127.0.0.1]`) and uppercase. All are **refused**, several of them
  conservatively.~~
  ⚠ **STRUCK 2026-08-25 — this paragraph was FALSE, and this leg wrote it from
  reasoning rather than from running the code.** `REVIEW-022`'s Codex leg ran
  them. WHATWG `URL` canonicalises `2130706433`, `0177.0.0.1`, `0x7f.1`,
  `127.1`, a trailing dot **and Unicode digit forms** all to `127.0.0.1` before
  `isLoopbackEndpoint` sees the host, so every one of them is **ACCEPTED**. Only
  `[::ffff:127.0.0.1]` (refused) and `127.0.0.256` (unparseable) behave as this
  paragraph claimed.
  **Accepting them is correct** — each genuinely is loopback — so the defect is
  in the description and not in the check. But *"I reasoned about what this
  function does and wrote the answer down"* is the failure this project already
  records against itself, and doing it inside a **review leg** is worse than
  doing it in code, because a review leg is what everything else is checked
  against. The six forms are now pinned as **accepted** in
  `facility/tests/hostile-endpoints.ts`, so the claim is executable.
* **What did survive, checked the same way:** the two `REVIEW-016` bypasses, the
  unterminated `[::1`, `localhost` as a name, and every remote host — all
  refused, and all asserted by tests that run.
* **A blinding factor or a proof generated in `facility/`.** None;
  `tools/check-blinding-sources.ts` now walks `facility/` and says so, and the
  coverage was spot-checked by planting a call and watching the gate fail.
* **A plaintext amount on a transaction that should hide one.** None. The two
  types that publish an amount are `Convert` and `ConvertBack`, per XLS-0096, and
  both are labelled `amountIsPublic` in the movement log.
