# REVIEW-023g — adjudication, ROUND TWO: the fixes

**Date 2026-08-26.** Three legs against a tree frozen at `3aac8dd`:
`REVIEW-023e` (Gemini, packet only), `REVIEW-023f` (Codex, packet plus read-only
repository access), `REVIEW-023s2` (self, committed before either external report
was read).

**Twenty-two findings raised, SEVENTEEN upheld, one sub-claim rejected, four
merged as duplicates. All seventeen are fixed.**

> ## ⚠ The finding this round exists for
>
> **`REVIEW-023c` says: *"All seven upheld, none rejected, none stale. Every one
> is fixed."* That last sentence was false.**
>
> Three of round one's seven fixes did not reach sites **the findings themselves
> cited by file and line**:
>
> | Round-one finding | Site it named | State at `7ec094d` |
> |---|---|---|
> | C-6 | `architecture:205` — *"NOT EXECUTED"* | **unchanged** |
> | C-6 | `architecture:217` — *"No facility transaction has been submitted"* | **unchanged** |
> | C-7 | `architecture:215` — *"the first Devnet transaction"* | **unchanged**, and edited for the count in the same sentence without either absolute being touched |
> | C-7 | `CLAIMS.md` **F-27** — *"No unit test could have caught it"* | **row never touched by the commit at all** |
> | C-1 | `CLAIMS.md` **E-149** — *"That is exactly the F-23 consequence removed"* | **unchanged**; a caveat was appended *below* it |
>
> **A fix that reaches five of six sites is not a partial success. It is an
> unfixed finding recorded as fixed** — and the record is the thing a later
> session trusts instead of re-deriving.
>
> ⚠ **And the mechanism is now visible.** Round one's fixes were applied from
> **the adjudication's summary of the findings** rather than from the findings'
> own citation lists. `REVIEW-023c` §2 says *"nine live sentences"* and names six
> of them in prose; the leg's report names all nine with paths and line numbers.
> **The sweep was re-derived from the summary instead of executed against the
> list.** That is the same shape as `E-141` — *a count taken from a record its own
> producer under-fills* — one layer up.

---

## 1. The three HIGH findings

### R2-1 — HIGH. **`tapFailHard` "removes the consequence of a wrong read" still stood in six places, contradicted by the F-28 row added in the same commit.**

*Codex Q4-1, novel.* C-1's whole content was that this claim outran the evidence,
and the fix **added F-28 and left the claim**:

* `CLAIMS.md` E-149 — *"That is exactly the F-23 consequence removed"*
* `CLAIMS.md` E-151 — *"removes the consequence of a wrong read"*
* `CLAUDE.md` §"Status 2026-08-25", the facility `README`, and
  `run-facility.ts`'s §0 output, twice

Meanwhile F-28, four rows below E-149 in the same file, says the flag stops a
`tec` reaching the **ledger** and not the ciphertext reaching the **node**.
**Fixed everywhere**: the claim is now *"removes the consequence **at the
ledger**"*, with F-28 cited at each site.

### R2-2 — HIGH. **"`tapFailHard` is set on every submission" is false, and the code that proves it false was added by the same commit.**

*Codex Q4-2, novel.* `run-facility.ts` §1's control submits one arm **without**
the flag, on every run, deliberately. C-2's fix made the *stamp* measure this —
and left five prose surfaces asserting the opposite: `run-facility.ts`'s file
header, its §0 output, `CLAIMS.md` E-151, the walkthrough's §6 table, and
`CLAIMS.md` E-146's *"`FailHardSubmitter` is the only submission path"*.

⚠ **The code and the prose were fixed by the same commit and disagreed with each
other.** Fixed: every site now says **every facility *movement***, and names the
control arm as the deliberate exception.

### R2-3 — HIGH, and EXECUTED. **With the acceptance sentence exported, the test suite connected to public Devnet from the test whose stated purpose is that it does not.**

*Self S-7. Neither external leg found it.*

`WCONF_ACCEPT_REMOTE_LEDGER_RISK` is process-wide and read at call time. Only
`risk-acceptance.test.ts` controlled it — through `withHatch`, the helper C-3's
fix introduced. **Three older tests asserted the loopback refusal and controlled
nothing.** With the sentence exported — **what `facility/README.md` tells an
operator to set** — `bun test facility tools` gave **76 pass, 3 fail**, and:

```
Expected promise that rejects
Received promise that resolved: Promise { <resolved> }
(fail) LoopbackLedger.open > refuses a remote endpoint BEFORE it connects [576.80ms]
```

**The promise resolved.** `open` reached `s.devnet.rippletest.net`, got
`server_info` back and returned a ledger — from a unit test whose own comment is
*"the refusal must not require the endpoint to answer: a facility that reached
out to a remote host on the way to failing has already told that host what it
was about to ask for."*

**Fixed**: `withHatch` lifted to `facility/tests/with-hatch.ts` and wrapped
around all three. ⚠ **The falsifier is executed, not argued**: the suite is now
run **both** ways and is **81 pass / 0 fail** in each.

⚠ **Attribution, stated because it is not flattering to round one.** The hatch
predates the fixes, so `d17b8ee` had this too. Round one asked *"find a path that
reaches a non-loopback endpoint **without** the exact phrase"* and nobody asked
the inverse. What belongs to the fixes is that **C-3 built the exact tool this
needed and left it in the one file that needed it least.**

---

## 2. Six MEDIUM

* **R2-4. The stamp cannot be `true` for any run, and the driver's console said otherwise.**
  *All three legs.* `underB15Conditions` is `isLoopback && unflagged === 0`, and
  §1's control guarantees the second conjunct is false — so **every** run of
  `run-facility.ts` records `false`, including a perfect loopback run. §8 branched
  on a value **cached before the control**, so a loopback run would print
  *"conditions MET"*, suppress §8's non-compliance warning, and write
  `underB15Conditions: false` three lines below. **Fixed**: the cached value is
  gone, the variable is named `loopbackHalf` for the half it actually holds, §8
  reads the getter, and the record now carries **both halves separately** because
  the AND of them is constant. §0 now prints what §8 will write.
* **R2-5. Five live sentences still denied the execution or the hatch.**
  *Gemini F4 (HIGH), Codex Q4-4, self S-1/S-6.* `CLAIMS.md` E-146's closing
  *"NOT EXECUTED means no facility transaction has been submitted to any
  ledger"* — **inside the row headed BUILT AND EXECUTED**; `CLAIMS.md` F-26's
  evidence *"the facility has never run"*; `architecture:205` and `:217`; and
  `facility/README.md`'s modules table describing the pre-hatch refusal two
  sections below the table corrected for exactly that. **All struck or
  qualified.**
* **R2-6. "With loopback the question does not arise" contradicts the module's own threat model.**
  *Codex Q3-2, novel and sharp.* F-28, `submit.ts` and the commit message all
  said it. `facility/src/loopback.ts`'s own header says the issue #1 ruling puts
  a hostile same-host process in scope and that adversary *"can point this at a
  different endpoint, or edit the local node's answers"*. A compromised local
  node lies about the key and reads the blob exactly as a remote one does.
  **Narrowed to *an honest, operator-controlled node*.**
* **R2-7. The unflagged counter, and a false sentence about where it sits.**
  *All three legs.* *"Counted here because this is the only place that sees every
  RPC"* — `probe` reaches the node through `rawCall`, so `call` sees every RPC
  **after the connection is open**. And the counter matched the literal string
  `submit`, missing `submit_multisigned`. **Fixed both**: the comment is true,
  the counter asks `method.startsWith("submit")`, and two new tests pin it —
  `submit_multisigned`, and a non-boolean `fail_hard` counting as unflagged.
* **R2-8. The §10.5 regression test pinned one spelling, not the claim.**
  *Codex Q2-1, Gemini.* It asserted the `"CAN establish"` paragraph does not
  contain the literal `§10.5`; *"every state change XLS-0096 requires"* would
  have reintroduced C-4's exact defect and kept the test green. **Fixed** — the
  paragraph is now checked against `/10\.5/`, `/state change/i` and `/XLS-0096/`.
  ⚠ **Revert-tested**: the overclaim without the literal `§10.5` now fails it.
* **R2-9. `.claude/agents/build-lead.md` was the only file in the tree still saying "27".**
  *Codex Q4-3, self S-3.* `CLAUDE.md`: *"`.claude/agents/` is generated from
  `docs/personas/` — regenerate whenever a persona changes."* `diff` over all
  three personas returned **exactly one differing line in one file**, which is
  what makes it a miss rather than drift. ⚠ **`make sync-personas` already
  existed and nobody ran it: the convention had a tool and no check.**

---

## 3. Six LOW

* **R2-10. F-27's fabricated absolute survived in the register.** *Gemini F5,
  Codex Q4-5, self S-1.* C-7 was adjudicated and `CLAIMS.md` F-27 **was never
  touched by the commit**. Fixed, along with `architecture:215`'s pair.
* **R2-11. "Falling back to the public endpoint was available and was refused" is
  now backwards.** *Self S-2.* True of the coding session; the owner then amended
  the ruling and the fallback was taken. ⚠ **One instance is in `CLAIMS.md`
  E-148's own row — the row C-6's sweep excluded to cut noise.** The blind spot
  survived the fix that named it. Both narrowed to *"refused **by this
  session**"*.
* **R2-12. F-28 named the wrong component and a field the issuer does not have.**
  *Gemini F2 + Codex Q3-1, each finding one half.* It said *"the facility reads
  … the issuer's `HolderEncryptionKey`"*. The **signer** reads, builds, proves
  and signs; the issuer's field is `IssuerEncryptionKey`. Fixed, and the
  same-endpoint property is now stated as a property of **this driver** rather
  than of `Facility`.
* **R2-13. F-28's "what would settle it" removes the mechanism it tests.**
  *Codex Q3-3, novel.* It prescribed *"a source that cannot obtain the blob"* —
  but F-28 **is** disclosure to the source that also receives the submission.
  Fixed. ⚠ The wording was inherited from `REVIEW-023c` §5, which is annotated.
* **R2-14. "A method whose count nobody can check" denies the evidence that caught it.**
  *Codex Q3-4, novel.* Round one found the missing merge **through the book**.
  Narrowed to *"cannot be counted from its own return value"*.
* **R2-15. "63 tests" was wrong in four documents, and "eleven files" in three.**
  *Gemini F6, self, Codex's scope note.* The suite runs **81** now and ran **77**
  at round one's own tree — so 63 was already stale when round one read it and
  nobody re-derived it. `7ec094d` changes **20 paths**, 17 excluding its review
  artifacts; *"eleven"* appears in `REVIEW-023c` twice, in the handoff, and
  **in this round's own request packet**, which inherited it without deriving it.
  All corrected and dated.

---

## 4. What was NOT a finding

* **The counts 28 / 31 / nine are right.** Codex derived them independently by
  transaction type; the self leg derived them from the book and run record; they
  agree. The book holds 25 entries over **22 distinct hashes** (a Send is
  recorded twice, `send-out` and `send-in`, under one hash) of which **nine** are
  merges; the run record holds 27 movements and eight merges; the union is **28**.
  The flagged control arm is correctly excluded — it never validated.
* **`convertFloat` returning `Movement[]` introduced nothing.** Three legs traced
  it: `mergeInbox` records its own book entry, `note()` flattens once, the §8
  partition is right, and the only caller is the driver.
* **The stderr-capture test and the unflagged-submission test do not pass for the
  wrong reason.** Both external legs checked the middle assertion of the latter
  independently and found it load-bearing.
* **`localhost` resolution.** *Codex Q1-3, self residual.* The test and the gate
  exemption both say *"without a packet leaving the machine"*, and neither
  controls the resolver. **Recorded rather than fixed**: the honest statement is
  that this host resolves `localhost` to `::1` and `127.0.0.1`, which is a fact
  about this host. Left as a known residual in `CLAIMS.md` E-153.

---

## 5. REJECTED — one sub-claim, and it is the failure mode this project watches for

**Codex Q4-5 cites `docs/NEXT-SESSION-PROMPT.md:25` quoting *"The first Devnet
transaction found a defect nothing else could"*.**

⚠ **That sentence does not exist.** Not at line 25, not in that file, not
anywhere in the tree — `grep -rn "defect nothing else"` returns nothing, and
line 25 at `3aac8dd` reads *"was not**, and every run record carries
`underB15Conditions`."*

**The other two sites in the same finding are upheld and fixed.** The rejection
is of one fabricated citation inside an otherwise excellent report — and it is
worth naming precisely because this leg **had** the files. `REVIEW-021` recorded
a leg citing line ranges it could not have read; that was explicable, since it
had no filesystem. **This one is not**, and it is the reason every citation in
this adjudication was opened before it was accepted.

---

## 6. ⚠ What this round says about method

1. **A fix must be applied against the finding's own citation list, not against
   the adjudication's summary of it.** That is the whole of §0, and it is now
   three findings deep in this project's history.
2. ⚠ **The session committed its own self leg into the tree while a repo-access
   leg was reading it.** That is a mistake, it is recorded rather than buried,
   and **the leg caught it** — it noticed the checkout was not the stated frozen
   commit, read the subject through `git show 7ec094d:<path>` instead, and never
   opened the self leg. The independence held **because of the leg's discipline,
   not the session's**. `REVIEW-022`'s lesson was *don't let files move under a
   leg*; the neighbouring one is **don't let your own answers appear in the tree
   a leg is reading**.
3. **A packet without the whole tree bounds what a leg can find.** The Gemini leg
   got eight code files and nine register rows and found six real defects in
   them — and could not have found the architecture document's three, because it
   was never shown it. `REVIEW-021c` said the packet's choices are the
   adjudicator's blind spots. **Still true, and this round is the demonstration:
   every finding unique to the self leg or the Codex leg came from a file the
   packet omitted.**
4. **A gate that reports drift beats a target that fixes it.** `make
   sync-personas` existed the whole time. `tools/check-personas.ts` is the half
   that was missing, and it found a second defect the moment it ran —
   `docs/personas/README.md` saying *"Not yet populated"* beside three populated
   personas.
5. ⚠ **`codex exec` blocks on stdin when backgrounded**, even with the prompt as
   an argument, and looks exactly like a slow review: 15 minutes, zero stdout, a
   39-byte stderr. `< /dev/null` fixes it. **Watch stderr grow, not stdout, and
   never the exit code.**

---

## 7. What is still open after this round

**Unchanged by round two, and none of it is a finding:**

* **The B-15 ruling and both its amendments have had no adversarial review**,
  and the facility rests on them entirely. **That rotation is the next thing to
  run**, and round two sharpened its subject: F-28 means Part C does not cover
  the residual Part A was carrying, and R2-6 means loopback narrows the question
  rather than closing it.
* **`CLAIMS.md` B-18** — `run-facility.ts` still does not assert all four of
  XLS-0096 §10.5's state changes per movement.
* **F-28 is read at source and reasoned, NOT executed**, and settling it needs a
  lying source that also receives the submission.
* **`underB15Conditions` has never been recorded `true` by any run** — and after
  R2-4 it never can be by this driver. E-117, ADR-0002 item 4, issues #10 and
  #8, B-16, B-17.
