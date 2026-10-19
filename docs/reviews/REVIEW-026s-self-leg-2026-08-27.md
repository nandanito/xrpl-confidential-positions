# REVIEW-026s — self leg, ROUND TWO: the fixes

**Date:** 2026-08-27. Frozen at `e9a3d26`, written before either external leg
returned. ⚠ **Round one's self leg found four of eleven and missed the two
worst.** This one is written knowing that.

---

## 1. Finding by finding, ticked against each LEG's own text

⚠ **Not against `REVIEW-025c`'s table.** `CLAUDE.md`: *a sweep re-derived from a
summary is E-141's shape one layer up.* Method: for each corrected sentence,
**grep for the phrase**, not for the line number the leg cited.

**That method found four misses, three of them inside ranges a leg named.**

| # | Round-one finding | Status | |
|---|---|---|---|
| 1 | Gate false-passed | **FIXED** | Per-probe crates; the `0u8` control now reports `REACHABLE`; three detectors re-verified by breaking them |
| 2 | Sweep accepted any nonzero exit | **FIXED** | Requires an expected name; caught four stale names immediately |
| 3 | Entropy hook returned `Err` on size mismatch | ⚠ **WAS PARTIAL — now fixed** | Codex offered two remedies, *"accept `[u8; 32]`, or panic"*. Round one took the **second**. Both now |
| 4 | DST test tautological | **FIXED** | Constant `pub`; revert 12 fails on it alone |
| 5 | `..._no_caller_can_choose_it` | **FIXED** | Renamed |
| 6 | `debug_assert_eq!` compiled out | **FIXED** | Hard `assert!` |
| 7 | `to_bytes()` copied the secret | **FIXED** | `as_bytes()` |
| 8 | "BUILT"/"CLOSED" premature | **FIXED** | Every header separates built-and-executed from reviewed |
| 9 | KAT independence overclaimed | ⚠ **WAS PARTIAL — now fixed** | The test's doc was fixed; **the section banner above it and `Hedge::FixedAux`'s doc still said "an independent implementation"** |
| 10 | Sweep mutated the live tree | **FIXED** | `mkdtemp`, `atexit`, `SIGINT`/`SIGTERM` |
| 11 | Stale/miscrediting sentences | ⚠ **WAS PARTIAL — now fixed** | Two second copies survived: see below |

### ⚠ The four misses, and why they are the same defect

- **`hedged_signing.rs:69`** — *"the whole ruling in one assertion"*. Codex named
  the **ed25519** copy. **The secp256k1 test carries the identical sentence** and
  round one corrected one of two.
- **`hedged_signing.rs:635`** — the section banner, *"against an implementation
  this project did not write"*. ⚠ **Codex cited *"the comment around
  `hedged_signing.rs:605-635`"*** — the banner is inside the range it named, and
  round one fixed only the doc comment beneath it.
- **`xrpl.rs`, `Hedge::FixedAux`'s doc** — *"the KAT against an independent
  implementation"*, a third copy of finding 9.
- **`xrpl.rs`, `OneShotAux`'s doc** — *"the draw happens in `Hedge::aux`"*. ⚠
  Codex named **this exact staleness**; round one annotated a *different*
  occurrence and left this one asserting it.

**All four are one failure mode: a fix applied to the instance the adjudicator
happened to be looking at, rather than to the phrase.** `CLAUDE.md` records
`REVIEW-023c` costing an extra round for this, and the entry says *tick the leg's
list, not your own recollection of it* — **which is what I did, and it still took
a grep for the phrase to find these, because the leg's list is line numbers and
the defect is a string.** That is worth adding to the file: **tick the leg's
list, then grep for the phrase.**

## 2. New defects introduced by the fixes

- **The hard `assert!` in the signing path** turns a would-be-silent condition
  into a process abort (`panic = "abort"`). ⚠ **It is unreachable by
  construction today** — `vk` and `self.public` derive from the same seed — so it
  is untested and untestable without corrupting state. That is the right trade
  (`OneShotAux`'s precedent) but *"a guard nothing exercises"* is a phrase this
  session has used twice about other people's code. **I do not have a way to
  falsify it and I am recording that rather than implying otherwise.**
- **`store::getrandom`'s new panic** fires on *any* draw whose size differs from
  what the hook was handed. With `[u8; 32]` the caller cannot get the size wrong;
  what remains is a differently-sized draw arriving first on the same thread.
  One-shot bounds it. Loud is correct here.
- **Deleting `Hedge::Fresh`** loses nothing: no test constructed it, and
  `sign_message` is what it was. The gate's `Hedge` probe now names
  `DeterministicForVectors` — ⚠ and the gate **reported VOID** when the stale
  probe was left behind, which is the rebuilt gate's own detector firing in
  anger rather than in a rehearsal.
- **The sweep's "expected name" rule** could pass wrongly if an expected list
  were widened to include a test that fails for an unrelated reason. It is not,
  and the lists are narrow. Named, not fixed.

## 3. Descriptions that overstate what the fix established

- ⚠ **`REVIEW-025c` §3 says of finding 3 "Fixed", and it was HALF fixed.** The
  adjudication I wrote overstated a fix in the very round whose lesson is that
  fixes and their descriptions fail separately. Corrected here rather than left
  standing.
- **`check-test-support-gate.ts`'s PASS line** now says *"6 test-only probes"*
  rather than *"6 test-only symbols"*, and the closing caveat says a two-symbol
  probe cannot be attributed. I believe that is now accurate.
- **`E-165` says both gates were "re-verified by breaking them".** True: three
  detectors for the gate (control REACHABLE, ungated REACHABLE, renamed VOID) and
  the sweep's BAD-PATTERN and WRONG-TEST paths both fired.

## 4. §6 gate 1, with `xrpl_vectors.rs` now in the packet

**ESTABLISHED.** `each_algorithm_signs_what_ripple_keypairs_signs` iterates the
vector keys, signs the probe on `Hedge::DeterministicForVectors` — the new code
path — and compares to `signature_over_probe` from `ripple-keypairs@2.0.0`.
`family_seed_derivation_matches_ripple_keypairs` asserts the set covers an
ed25519 key, with the message *"every account this project holds on Devnet is
one"*. `signed_transaction_vectors` pins whole signed blobs on the same arm. The
file loads its vectors from a committed generator and **fails rather than skips**
when they are missing.

⚠ **Round one's PARTIAL was correct and its cause was mine**, not the code's.

## 5. Anything else

- **`Cargo.toml`'s corrected description is 3 lines of prose in a manifest
  field.** It is accurate and it is unusual. I would not object to it being cut
  to the first sentence.
- **`docs/runs/` is a new directory with one file.** If run receipts become a
  habit it wants a README saying what a receipt is and is not.

## 6. Confidence: **8.5**, and a third round would NOT pay

Higher than round one's 8 because the construction survived three legs unchanged
and because the two false-pass gates are now falsified in both directions.

**Why a third round does not pay, and I have a specific reason rather than a
policy:** round two's findings are **four second copies of round one's sentences
and one half-taken remedy**. A third round would be reviewing the fixes to those
— and the fix is *"grep for the phrase"*, which is mechanical and which I have
now run to exhaustion over every corrected string. `CLAUDE.md` says this is
where it stops paying and I agree, **with one condition: the phrase sweep is in
the record, so a later session can re-run it rather than trust that I did.**
