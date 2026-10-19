# REVIEW-033 — REQUEST — B-25, the fixes to B-24's fixes

**Frozen commit: `dee8570c8996deae3976d043d1566b65870c7adf`** (branch `main`, clean).

⚠ **The handover named `7eab33f` and HEAD had moved two commits.** Both are
documentation: `git diff --name-only 7eab33f dee8570` returns
`docs/NEXT-SESSION-PROMPT.md` alone. Widening it, `git diff --name-only 8acb334
dee8570` returns `CLAIMS.md`, `CLAUDE.md`, the handover and one run receipt —
**no file under `signer/` or `tools/` has changed since B-25 itself.** The code
under review is byte-identical at `8acb334` and at the frozen commit. Frozen at
HEAD because that is the tree that exists (E-157's neighbour: review the tree,
not the tree you remember).

## ⚠ This is round THREE, and that is a departure

`CLAUDE.md` says two rounds is the right number and *"a third round would review
the fixes to the fixes; that is where it stops paying."* **That rule assumes
round two finds sentences and gates.** `REVIEW-032` found a **live secret left
unwiped** — the derived ElGamal secret, behind a comment that named the wrong
crate — so the stopping condition never fired. **The project owner has
authorised review to continue to convergence.**

**Convergence is the target, not exhaustion.** That has a concrete consequence
for how you should report:

* **If everything you find is a sentence, a count or a gate, say so plainly.**
  That is the convergence signal and it ends the rotation. **An absence recorded
  is worth more here than a finding manufactured** — this round's most valuable
  possible output is a well-evidenced *"the construction is sound"*.
* **If you find a CONSTRUCTION defect, that is a finding about the PROCESS, not
  just the code.** It would make six consecutive milestones where a later round
  found something an earlier round's fixes got wrong, and `CLAUDE.md`'s two-round
  rule empirically wrong for this workstream. **Say so in as many words** — the
  rule gets amended in the same session, not merely obeyed.

## What B-25 is

The subject is `git diff cfd81db 8acb334` — eight files, +446/−51. Mapped to the
`REVIEW-032c` findings it answers:

| `REVIEW-032c` | grade | what B-25 did |
|---|---|---|
| 1 — `finish()` never wipes `sk`, the derived ElGamal secret | **HIGH** | ⚠ **the PRODUCER**: `Scalar` loses `Copy`, gains `Zeroize` + `Drop` + `ZeroizeOnDrop` (`scalar.rs:144–165`). The false *"a `k256` type this crate does not own"* comment is replaced at `keygen.rs:378–398` |
| 2 — part 6's decoder needles pinned the SIGNATURE only | **HIGH** | each decoder needle now spans signature AND construction AND return; `B23_SITES` grows from 9 to 12 (derived: `len(B23_SITES)` at `cfd81db` and at the frozen commit) |
| 3 — `strip_line_comments` is not nesting-aware; raw strings SYNTHESIZE needles | MEDIUM | `in_block` boolean → `depth` counter; the *"never easier"* claim is retracted in the docstring rather than repaired |
| 4 — `single_decode_findings` missed four mutations | MEDIUM | counts **every decoder by name** (`DECODERS` tuple), covers both public wrappers and any helper `derive_raw` calls; all four mutations are now controls |
| 5 — the new entry point was unpinned for ed25519 | MEDIUM | `both_entry_points_agree_on_both_vectors` in `keygen_kat.rs` |
| 6 — a rustdoc block documented a parameter its function does not have | LOW | moved back onto `derive_from_master_seed` |
| 7 — five stale hand-restated counts | LOW | derived from `len(...)` or deleted |
| 8 — B-24 changed which error four malformed profiles report, unnamed | LOW | named at `holder.rs:476–498`; pinned by `a_malformed_seed_reports_the_branch_s_error_not_the_seed_s` |

**Re-measured at the frozen commit by the adjudicator, not inherited:**
**278 tests** (`cargo test`, summed over 21 targets), **all six gates PASS**,
part 6 reports **13 checks (12 needles + 1 scoped)**. Devnet
`63D81873…B663E8`, validated, clean tree at `8acb334`.

## The five things this round exists to attack

1. ⚠⚠ **REMOVING `Copy` FROM `Scalar` CHANGED MOVE SEMANTICS FOR `sk_A`, `r`, `ρ`
   AND EVERY BLINDING FACTOR, AND THE COMPILER ACCEPTED IT SILENTLY.** Zero
   errors is the fix's strength and its risk: **nothing broke, so nothing
   announced what changed.** Every consumer I can find takes `&Scalar`
   (`prover.rs`, `store.rs`, `session.rs`); the producers return by value
   (`scalar::reduce_wide`, `reduce_wide_total`, `randomness::derive`,
   `derive_pair`). ⚠ **Find the place that relied on implicit copying.** Is there
   a `.clone()` introduced or implied whose result is a second live copy? Is
   there a partial move, a `mem::swap`, a container, an `Option::take`, a
   destructuring that leaves a source slot live? **And say explicitly whether
   `Drop` now runs somewhere it materially should not** — a `Scalar` inside a
   `Result` that is `?`-propagated, for instance.
2. ⚠ **`impl Drop for Scalar` IS NEW AND `reduce_wide_total` IS ON THE
   CONSTANT-TIME PATH.** The `U256` arithmetic is unchanged, but the destructor
   is new and it is in the same file, on the type that function returns. **Does
   adding drop glue to `Scalar` introduce a data-dependent timing difference, or
   defeat any part of the constant-time argument in `scalar.rs`'s module
   docstring?** ⚠ Argue it from the code or find it — **do not accept "zeroize is
   unconditional" as the whole answer without checking where the drop is
   inserted** relative to `reduce_wide`'s zero branch, which *is* a
   secret-dependent branch and is ruled to be one.
3. ⚠⚠ **THE `U256` RESIDUAL'S STATED REASON IS THE THING TO ATTACK, AND I HAVE
   ALREADY MEASURED THAT IT IS WRONG — CONFIRM OR REFUTE MY MEASUREMENT.**
   `scalar.rs`'s `reduce_wide_mod` docstring says the residual is *"NOT fixed
   here deliberately"* because `U256` *"is the constant-time arithmetic type"*
   and *"removing `Copy` to add a destructor would rewrite the routine"*.
   ⚠ **That is a false dichotomy: nothing requires removing `Copy` to wipe.**
   Measured at the frozen commit — one line, `zeroize::Zeroize::zeroize(&mut
   diff.0)` after the `select`, with `let (mut diff, borrow)` — **ZERO compile
   errors, and `cargo test --lib` unchanged at 18 passed / 0 failed** (baseline
   is also 18). It is unconditional and per-iteration, so it is
   **data-independent and preserves every constant-time property claimed**.
   ⚠ **This is the exact shape of E-181 (*"the crate's boundary, not an
   omission"*) and E-200 (*"a `k256` type this crate does not own"*) — a
   plausible sentence standing in for a measurement.** The residual may still be
   *accepted*; what it may not do is rest on a reason that is false. **Tell me
   whether my probe is right, whether the `acc` half is reachable the same way,
   and what grade the sentence deserves.**
4. ~~**Do the new three-line needles break under `rustfmt`?**~~ ⚠ **CONCEDED
   BEFORE THE ROUND OPENED — MEASURED. DO NOT SPEND TIME ON IT.** All three new
   needles survive `cargo fmt` byte for byte, **and the repo does not run rustfmt
   at all**: no `rustfmt.toml`, no `fmt` target in the `Makefile`, and the
   committed tree is already not fmt-clean (`cargo fmt --check` reports diffs in
   34 files, `build.rs` and every binary included). A whitespace-sensitive needle
   is **not a live hazard in this repository**, and that is a fact about the repo
   rather than a property of the needle. ⚠ **A finding that merely restates it is
   noise; a finding that a `fmt` gate is about to be added is not.**
5. ⚠ **`a_scalar_wipes_on_drop` ASSERTS A MARKER TRAIT, AND A MARKER TRAIT CAN
   LIE** — measured by B-25 itself: it still passed with `Drop::drop` emptied.
   The byte-level test beside it is the load-bearing one. ⚠ **So: is
   `dropping_a_scalar_overwrites_its_bytes` SOUND?** It takes a `*const u8` from
   `held.as_bytes().as_ptr()` — derived from a **shared** reference — then calls
   `ManuallyDrop::drop(&mut held)`, which takes a **mutable** borrow, then reads
   through the original pointer. **Under Stacked/Tree Borrows a `&mut` invalidates
   previously-derived shared pointers.** Is this test undefined behaviour? Would
   Miri accept it? **A test that is UB proves nothing** — B-25's own docstring
   says exactly that about the version it rejected. If it is unsound, say what
   the sound construction is.

## What is already conceded — do not spend the round re-deriving it

* **P-5 governs all of it.** Nothing here is claimed to make anything secure. An
  adversary with code execution reads the value while it is live. **B-25 narrows
  a window and removes no channel.** A sentence claiming more is a finding; an
  argument that the whole exercise is insufficient is not.
* **Removing `Copy` from `Scalar` gave ZERO compile errors.** Measured before it
  was written. Do not re-report it — **do report it if a consequence of it was
  missed**, which is attack point 1.
* **Moved-from source slots are not wiped by `ZeroizeOnDrop`.** A Rust move is a
  memcpy and the source is not dropped. ⚠ **This is ALREADY a named residual**,
  from B-22: *"the `Sha512` block buffer, **the source of every move**, and
  `serde_json`'s parse scratch are all untouched."* Restating the general fact is
  not a finding. ⚠ **A B-25 sentence that contradicts it — one claiming every
  copy of `r`/`ρ`/`sk_A` is wiped rather than every live binding — IS.**
* **Named residuals**, all of them: `reduce_wide_mod`'s `U256` accumulator and
  its 512 `diff` values (attack point 3 is about the *reason*, not the
  existence), `serde_json`'s escape-decoding scratch, `read_to_string`'s growth
  mid-read, a pasted line over the 4096-byte reservation, `StdinLock`'s
  `BufReader`, and B-21's `Sha512` block buffer. ⚠ **A residual that is NOT
  named is a finding** — that is how three of these got here.
* **`the_two_seed_dispatches_agree` catches DRIFT, not a revert to the double
  decode.** Stated in the test (E-191). Not news.
* **The gate's guarantee is over a NAMED SET.** A site added later and not listed
  is invisible to it (E-142). Restating that is not a finding; **naming a site
  that should be in the set and is not** is.
* **`tapFailHard` is this project's shorthand and is not a real rippled name.**
  Not this round's subject.

## Three standing hazards, because each has bitten inside a fix

⚠ **A COUNT RESTATED BY HAND EXPIRES AT THE NEXT EDIT — TWELVE instances, the
last one inside the milestone whose subject was counts (E-201).** Part 6's total
is derived from `len(B23_SITES)` and is correct at 13. ⚠ **Check every other
number in the diff, in `CLAUDE.md`'s B-25 block, in `CLAIMS.md` row B-25, and in
this request's own table.** Assume at least one is wrong, because one always is.

⚠ **A COMMENT ASSERTING A FALSIFIER IS A CLAIM WITH NO FALSIFIER (E-196), and
B-25 is dense with them** — *"measured before it was written"*, *"ZERO compile
errors"*, *"removing `Copy` would rewrite the routine"*, *"it still passed with
`Drop::drop` emptied"*. **Assume every one is unmeasured until you measure it.**
One of them is already known to be false — attack point 3.

⚠ **A CONTROL THAT REPLAYS THE LAST ROUND'S ATTACK PROVES YOU CATCH THE LAST
ATTACK (E-201).** Part 6's four new controls are `REVIEW-032`'s four measured
mutations, verbatim. **Ask what they do NOT run.** The nested-comment control is
the same question: `strip_line_comments` now counts depth — **what does it still
get wrong?** The docstring names raw strings as unfixed; is that the only one?

## Grade each finding

`HIGH` / `MEDIUM` / `LOW`, with **file and line**, and say **what would falsify
it**. ⚠ **A finding whose diagnosis is wrong may still have a real weakness
underneath (E-170) — say so rather than dropping it.** ⚠ **And say plainly where
a fix is CORRECT**: round three's job is disproportionately to establish that,
and this round ends when the findings are sentences, counts and gates.
