# REVIEW-022g — adjudication, round two: architecture §6 step 7, the facility

**Date 2026-08-25.** Round two's leg: `REVIEW-022e` (Gemini, full file text, no
shell). ⚠ **`REVIEW-022b` (Codex, round one) returned during round two** and its
findings are adjudicated here, because they arrived after `REVIEW-022c` was
written and several are more serious than anything in either round as
adjudicated there.

**Twenty-one findings across the two reports. Nineteen upheld, one stale, one
narrowed.** Every upheld finding is fixed. The two most serious in the whole
review are in this document, not in round one's.

---

## 1. ⚠ The two that defeat the milestone's central obligation

Both from the Codex leg. Both are escapes **around** a correct check rather than
defects in it, and that is the shape worth carrying: **a correct predicate does
not make a property.**

### C-0 — CRITICAL. **The signer could be pointed at a remote node while the facility read loopback.**

`signer/src/main.rs:71`:

```rust
let endpoint = std::env::var("WCONF_LEDGER_ENDPOINT")
    .unwrap_or_else(|_| holder.ledger_endpoint.clone());
```

**`WCONF_LEDGER_ENDPOINT` overrides the profile.** `SignerSession.start`
inherited all of `process.env` and set only the profile, so:

```
WCONF_LOOPBACK_ENDPOINT=http://127.0.0.1:5005     # the facility's own reads
WCONF_LEDGER_ENDPOINT=https://hostile.example      # the SIGNER's reads
```

gave a facility whose TypeScript reads were loopback and whose **signer** — the
component that reads the destination's `HolderEncryptionKey` and the issuer's
key, which is F-23's actual mechanism — read a remote node. `assertLoopbackProfile`
checked a value the signer never used. ⚠ **And `quietSigner: true` suppressed
`ledger::REMOTE_SOURCE_DISCLOSURE`**, which `REVIEW-019` makes a *condition of
its ruling*, so the one thing that would have shown it was swallowed.

**UPHELD, and the rating is right.** This is the loopback half of B-15's answer
defeated on the one component the half is about.

**Fixed** three ways, because one would have been a convention:
`WCONF_LEDGER_ENDPOINT` is set **explicitly** to the checked endpoint so an
inherited value cannot win; an inherited value that **disagrees** is a refusal
rather than a silent override, because an operator who set it meant something;
and `quiet` no longer suppresses a disclosure on either stream.
`facility/tests/boundary.test.ts` drives it, and the fix was spot-checked by
reverting it.

⚠ **The signer's own comment calls the override *"no more of a hole than the
profile path already is"*, and for the signer alone that is right** — anything
that can set the environment already has code execution, which issue #1 puts in
scope. **It is not right for the facility**, which makes a claim the signer does
not: that *every* ledger read goes to loopback. The same mechanism is a
convenience in one component and a hole in another, and that is why the fix is
in `facility/` and not in `signer/`.

### C-1 — HIGH. **A redirect walked the whole check.**

`rawCall` used `fetch` without `redirect: "error"` and never checked
`response.url`. `fetch` follows redirects by default and 307/308 preserve method
and body, so a loopback endpoint answering 307 forwarded the POST — and every
call after it — off-host, with `LoopbackLedger.open` having passed on the
original URL. `signer/src/ledger.rs` sets `max_redirects(0)`; this did not.

**UPHELD, fixed** with `redirect: "error"` plus a `response.url` check. The
revert is instructive: with the fix removed the test does not merely fail, it
**takes 75 seconds**, because the request really does leave for the redirect
target and time out.

---

## 2. False sentences, which is what a second round is for

| # | Leg | What was claimed | What is true |
|---|---|---|---|
| G-1 | Gemini R2 | `facility.test.ts`: *"the happy path is executed on Devnet by `run-facility.ts`"* | **It has never run.** A test file contradicting the milestone's own BUILT-AND-NOT-EXECUTED status |
| C-8 | Codex | `run-facility.ts`: every confidential movement checked against **all four** of §10.5's state changes | Only the float conversion checks the outstanding-amount delta; movements reconcile the decrypted balance and nothing asserts the public amount or the version. The header claimed E-131's standard and the code does not keep it |
| C-9 | Codex | *"After this, no plaintext amount appears again until the facility is retired or resized"* — in the driver **and in the walkthrough** | **False.** Enrolment publishes **two** plaintext amounts per supplier. On the walkthrough's own thirty-supplier example that is sixty, all after the sentence says none appear. → **`CLAIMS.md` F-26** |
| C-10 | Codex | `signer.ts`: the facility *"never sees a secret"* | It holds every party's family seed, **writes each one to disk**, and derives every ElGamal secret. The true claim is about the IPC socket and is narrower |
| C-13 | Codex | `signer.ts`: *"`facility/tests/signer.test.ts` asserts its wording"* | **No such file exists** — a citation to a nonexistent test, inside the comment explaining why untested wordings are dangerous |
| G-4 | Gemini R2 | `submit.test.ts`: *"every one of them reaches the ledger through `submitBlob`"* | False of two of the four. `sign` and `waitValidated` submit nothing |
| G-5 | Gemini R2 | `hostile-endpoints.ts`: *"instead of **fourteen** near-identical ones"* | There were twelve. A fabricated count in the file whose purpose is to keep a count honest |
| C-2 | Codex | README: `submit.ts` is *"the only submission path"* | One deliberate exception exists — the control arm — and the method-set test **cannot see** a `ledger.call("submit", …)` made outside the class, though its comment claimed a new path could not appear unnoticed |

**All eight upheld and corrected.** ⚠ **C-9 is the sharpest**, because it is a
finding against this project's own explainer and it is the **second** false
disclosure sentence in that one document (F-24 was the first). **Both were about
which amounts are plaintext.** The rule now recorded: *a sentence of the form
"no plaintext amount appears after X" should be assumed wrong until every
transaction type between X and the end has been listed.*

⚠ **And one false sentence was in a REVIEW LEG.** `REVIEW-022s` claimed the
decimal, octal, short and trailing-dot IPv4 forms were **refused** by
`isLoopbackEndpoint`. They are **accepted** — WHATWG `URL` canonicalises all of
them to `127.0.0.1` — which is correct behaviour and the opposite of what the leg
wrote. **The leg reasoned instead of running them; the Codex leg ran them.** A
false sentence inside a review leg is worse than one in code, because a review
leg is what everything else is checked against. Struck in place, and the six
forms are now pinned as **accepted** so the claim is executable.

---

## 3. Defects introduced by round-one fixes

| # | Leg | Finding |
|---|---|---|
| G-2 | Gemini R2 | `enrolSupplier` set `suppliers` **before** three ledger operations, so a failure left the supplier enrolled in memory and not on the ledger, and every retry hit `REFUSED_ALREADY_ENROLLED`. ⚠ **The round-one fix `adoptEnrolledSupplier` does it correctly** — the same author wrote both, one paragraph apart |
| G-3 / C-8 | both | **The fail-hard control could not distinguish its two arms.** Both submit the **same blob** with the **same hash**, back to back, and only then look at the ledger. A run in which the *flagged* arm was wrongly applied and the unflagged one bounced as a duplicate is indistinguishable from the intended result — so the script would print `✓ The flag is the difference` **on the exact failure it exists to detect** |
| C-4 | Codex | The gate's template normalisation — a round-one fix — replaced every `${…}` with `1`, so ``http://127.${host}:5005`` became `http://127.1:5005`, which `URL` folds to `127.0.0.1`. **The gate accepted a host it could not know.** `CLAIMS.md` E-141's shape exactly: a normalisation added to stop false positives that quietly created a false negative |

**All upheld and fixed.** The control is now **two-phase**: arm A is submitted,
the node closes three ledgers, the transaction must be **absent**, and only then
is arm B submitted. `withFlag.applied === false` is asserted, and a flagged arm
that *did* reach the ledger is a **`die`**, not a warning — it would be the
finding.

---

## 4. The rest, upheld and fixed

* **C-5 — HIGH.** `drawdown`/`repay` believed the `Party` they were handed.
  `confidential()` gives the signer a **seed** while the book and the ledger
  lookup use the **address**, so a mismatched pairing signs as one account and
  books against another. The file's own comment says an address is *"never
  believed"*; two public entry points believed it. Both now check the seed and
  require the party to be one the facility knows.
* **C-6 / G-8 — MEDIUM, found independently by both.** `FacilityBook.record`
  mutated the position and validated afterwards, so a refused movement left a
  negative number in memory while the disk still held the old one. Now compute,
  validate, commit.
* **C-7 — MEDIUM.** `MPTokenIssuanceSet` ignored the result of its own
  `waitValidated`, so a `null` or a validated `tec` let setup save an issuance id
  for an issuance that may never have been made confidential.
* **C-11 — MEDIUM.** `--auto-confirm` was presented as optional and the
  un-flagged path **cannot confirm at all** — the daemon's stdio are pipes and
  nothing forwards them. The run now **refuses** without the flag, which is
  better than hanging and much better than auto-confirming quietly.
* **C-4b.** The gate's own claims: it says `.ts` (not "any file"), it says
  *sites* (not *call sites* — the fixture's strings are test inputs), and its
  PASS line now names what it is silent about.
* **G-6 — LOW.** `adoptEnrolledSupplier` shipped as a round-one fix **with no
  test**. Four now drive it, including both refusal paths.
* **G-7 — LOW.** `assertLoopbackProfile` was called only in `Facility`'s
  constructor, so a direct caller of `SignerSession.start` bypassed it. Now
  checked where the value is written.

---

## 5. Narrowed, and one stale

* **G-4's Q3 note, NARROWED.** The leg observes that
  `expect(boundary).not.toBeInstanceOf(FacilityRefusal)` would also pass if
  `positionOf` failed with a `LedgerRefusal`. **True**, and the test's fixture
  makes `positionOf` succeed, so the control holds as written. Recorded rather
  than "fixed", because tightening it further would test the fake node rather
  than the facility.
* **C-12, STALE.** The leg reported the README's *"no per-iteration figure
  appears anywhere under `facility/`"* as contradicted by `book.ts`. It **was**,
  when the leg read the tree; the session had removed all four occurrences
  before the leg returned. ⚠ **Not rejected — it was true when observed**, and
  the reason it is stale is the same reason it is recorded in §6.

---

## 6. ⚠ What this round says about how to run a round

Three things, and the third is new.

1. **A clean section in an external report is evidence about the leg, not about
   the code.** Round one's Gemini leg reported *"Findings: NONE"* on the
   submission path that contained a CRITICAL double-submission. Round two's
   found eight real defects in the same area. **Same leg, same model, different
   question.** What changed was that round two's packet told it what round one
   had fixed — so it had somewhere specific to look.
2. **Do not edit the tree while a leg has repository access.** The Codex leg
   watched file mtimes move under it, excluded findings it could see were
   already repaired, and produced one stale finding anyway. `REVIEW-021c`'s
   recommendation to give legs repository access is right and it has this cost.
   **Freeze the tree, or review a commit.**
3. ⚠ **A slow leg is not a failed leg, and a fast adjudication can be a
   premature one.** `REVIEW-022c` was written and round two was launched while
   the Codex leg was still working. It then returned the two most serious
   findings of the entire review — including the only CRITICAL — both of which
   needed `signer/src/main.rs`, a file **outside the packet**. Round one's
   adjudication was therefore wrong about the shape of the round for as long as
   it stood. **Wait for the legs.**

---

## 7. No round three

`CLAUDE.md`: *a third round reviews the fixes to the fixes; that is where it
stops paying.* Nothing here touches a wire format, a proof, or a field set — the
three things `REVIEW-021` used as its own test for whether another round was
owed. What the fixes changed is a fetch option, an environment variable, a
control's phasing, several sentences, and where a `Map.set` happens.

⚠ **The honest residual: the two CRITICAL/HIGH fixes have tests and reverts, and
neither has run against a real node.** The milestone is still **built and not
executed** (`CLAIMS.md` B-18), and the redirect and override escapes were closed
against fake servers this project wrote. That is a real limit and it is the same
limit the whole milestone has.
