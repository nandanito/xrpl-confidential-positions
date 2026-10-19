# REVIEW-021g — adjudication, ROUND TWO

- **Date:** 2026-08-25
- **Under review:** commit `4cc3ae1` — round one's seven fixes.
- **Legs:** `REVIEW-021e` (Gemini), `REVIEW-021f` (Codex).
- **Outcome: seven findings upheld, one leg claim rejected. Round two earned its place decisively.**

---

## 1. Round two found exactly the two things it exists to find

`CLAUDE.md` names three failure modes a second round catches. **Two of the three
turned up, and nothing else did** — which is the pattern that says the round was
aimed correctly.

### Kind 1 — a defect introduced BY a fix. The purest instance this project has produced.

Round one tightened `check-blinding-sources.ts`'s patterns to require an open
paren, so the gate would stop firing on **prose**. That was a fix for a real
annoyance. It also silently turned `wconf-randomness.ts` — which names the symbol
only in comments — from a **matching** exemption into a **dead** one.

The stale-exemption loop carried a hardcoded `continue` for exactly that file,
written earlier when the file did still match. After the tightening, that skip
**masked** the dead entry.

⚠ **So the gate printed `PASS` while the guarantee in its own header — *"fails on
an unrecorded use **or on a stale exemption***" — was disabled for one file.**
Both legs found it. `CLAIMS.md` **E-141**.

**The lesson generalises past this file:** a defensive exception that is harmless
when written becomes a mask when something else moves underneath it. The stale
loop now has **no exceptions at all**.

### Kind 3 — false sentences written ABOUT fixes. Three of them.

| Sentence | Reality |
|---|---|
| `txn.rs`: *"the typed builder cannot currently produce one"* | **False.** `WireFields::ConvertBack` is `pub` with `proof: Vec<u8>`; `builder` is `pub` and serialises it unchecked. Only the `session`/`prover` path cannot. ⚠ **The sentence mis-rated the severity of the very defect it was excusing** |
| `rebuild-env.sh`: the restore branch was *"four lines below"* the struck sentence | **False.** It is more than a hundred lines below — **a fabricated detail inside the correction of a fabrication** |
| `tests/convert_back.rs`: *"And the BYTES"* | **False.** It compared the field-name **set**, not values. A helper preserving every field and changing a value would have passed |

`CLAIMS.md` **E-144**. All three corrected; the test now compares raw values and
was spot-checked by corrupting `SigningPubKey`, **a field no parsed assertion
covers**, so the new loop is demonstrably what fires.

### Kind 2 — a test passing for the wrong reason. **Not found**, and both legs looked.

Both legs walked all six tests and both concluded each fails for the reason its
name claims. Independently confirmed here by removing a field from `REBUILDABLE`
and watching five tests fail on the completeness assertion.

---

## 2. Dispositions

### UPHELD

| # | Leg | Finding | Disposition |
|---|---|---|---|
| **E-141** | **both** | Dead exemption masked by a hardcoded skip; count reported as *"nine call sites"* when two were not call sites | **Upheld.** Gate excludes itself from its own walk; both non-call-site entries removed; the stale loop has no exceptions. `CLAIMS.md` E-141 |
| **E-142** | **both** | The gate missed alias references, bracket lookups, array-form and shell invocations; did not scan `signer/`; skipped `.sh`/`.mjs`/`.cjs` | **Upheld.** Comments are now **stripped structurally** and the patterns match the symbol itself rather than guessing at parens; a shell route added; `signer/src` and `signer/tests` walked. ⚠ **And the guarantee is narrowed**, as Codex asked: a run-time-assembled subcommand is invisible to any regex, and the file says so rather than overclaiming |
| **E-143** | Codex (Q4-1) | Three harnesses that **submit to Devnet** were exempt on two successive **false** reasons | **Upheld, and it is the sharpest finding of the review.** Round one corrected a false reason *with another false reason* — upstream's generator draws fresh entropy per run, so *"these exact scalars"* was never true. All three migrated: the ruled derivation supplies every scalar and the **deliberate violation is preserved explicitly**. Exempt call sites 8 → **5** |
| **E-144** | Codex (Q3-1, Q3-3, Q2-1) | Three false sentences written to explain fixes | **Upheld.** See §1 |
| — | Gemini (F3) | A no-op ternary with two identical branches in a test | **Upheld**, cosmetic. No register row: it makes no capability claim. Replaced with the single call it was |
| — | Codex | `E-137` and `E-140` **not supported as written** | **Upheld — findings against the register itself.** Both rows now carry their corrections at the head. ⚠ This is the class this project audits worst: **a reason that sounds right is not read the way a line is** |

### REJECTED, with the reason recorded

| Claim | Why rejected |
|---|---|
| **Gemini:** `mptool.c` is *"a C implementation definition"* / *"C function signatures"*, so the count of callers is **seven** | **Wrong.** `tools/spike-2026-08-17/mptool.c:54` is `if (mpt_generate_blinding_factor(r) != 0)` — a **call**, in the CLI adapter the other exempt harnesses invoke. The count was **eight** at the time, not seven and not nine. ⚠ **Codex contradicted itself on the same point**, calling `mptool.c` correctly a caller in its table and then listing it among non-callers in its count. **Both legs got the number wrong in opposite directions while both correctly diagnosed that the number was wrong.** *A review finding is evidence, not an instruction* — the sixth time |

⚠ **The rejected claim is pinned by the gate's own output**, which now says *"5
deliberate call sites"* and lists `mptool.c` among them with a corrected reason —
its previous reason, *"it is not itself a caller"*, was **also false** and is
struck.

---

## 3. What round two says about round ONE's structural correction

Round one's adjudication recommended: *"give both legs repository access, or stop
treating a no-tools leg's silence as evidence."*

**The recommendation was half wrong and the half that worked is worth recording
precisely.**

- ⚠ **"Repository access" is not available to the Gemini leg at all.** `agy` is
  denied shell permission in non-interactive use and **aborts** if it tries; a
  copy of the tree placed in its working directory was unreachable. The first
  attempt at this round died that way.
- **What actually worked was enriching the packet** — the **complete text** of
  every file the fixes touched, instead of a diff. The same leg that reported
  nothing on seven questions in round one came back with the review's single most
  valuable finding.

**Carry forward the mechanism, not the wording:** a leg that cannot read files
must be *given* them, in full. A diff bounds a leg to what the adjudicator chose
to show, and **the adjudicator's choices are the blind spots**.

---

## 4. Where this stops

`CLAUDE.md`: *"A third round would review the fixes to the fixes; that is where
it stops paying."* **It stops here**, and the judgement is not automatic — it is
made against what round two actually produced:

- **No finding touched the wire format**, the proof construction, or the §10.3
  field set. Round two's fixes are a gate script, a test helper, three harness
  migrations and four sentences.
- **No fix changed the wire format.** Both legs were asked and both said no, so
  no ConvertBack needed re-executing. ⚠ **Four harnesses WERE executed** — the
  ones round two migrated — and §5 records what that found.
- ⚠ **The one thing that would have justified a third round was the harness
  migration** (E-143) — three files that *submit*, changed with no execution
  behind them. **That gap was closed rather than carried**: all four were run
  against Devnet, and doing so exposed E-145, a defect in this session's own
  verification method that no leg had reason to look for. ⚠ **Had the gap been
  left as written, two harnesses would have shipped unable to run at all.**

## 5. What is NOT established

- ~~**The three migrated harnesses have not been re-run on Devnet.**~~
  **CLOSED, and closing it found a defect none of the three legs did.** All four
  migrated harnesses were executed: `adj-c1-verify.ts` produced its
  `tecBAD_PROOF` for the mismatched-`C₁` arm, and the other three ran to
  completion and recorded results.

  ⚠ **Two of them had NO IMPORT for the function they called, and `bun build`
  reported success on both.** The failure appeared only on execution —
  `ReferenceError: deriveRandomness is not defined`. **`bun build` bundles; it
  does not type-check**, and an undefined identifier becomes a runtime global.
  This session had called it a type-check throughout (`CLAIMS.md` **E-145**).

  ⚠ **The same faulty check underwrote every earlier migration.** All fourteen
  files that use the ruled derivation were re-verified afterwards by parsing
  their import lines, and all fourteen are correct — but that was one Devnet run
  and luck, not the check. ⚠ **And the first version of the re-verification
  script was itself wrong**, reporting every correct file as failing, because
  `grep` on this machine is `ugrep` and its `\b` did not behave as assumed. **A
  verification script is not exempt from verification.**
- **B-17 (frozen state) remains open**, and Codex sharpened it: *"a fifth ledger
  call is premature — the existing `account_info` and `ledger_entry` responses
  may already carry the flags."* That refinement is folded into B-17.
- **The gate's guarantee is over KNOWN SPELLINGS**, not over reachability. A
  run-time-assembled subcommand defeats it and the file says so.
