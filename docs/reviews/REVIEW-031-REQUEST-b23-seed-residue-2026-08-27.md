# REVIEW-031 — REQUEST — B-23, the seed's owned lifetime

**Frozen commit: `6c5c406d1a4e67fdb475ea063b38c5034cd3f7f0`** (branch `main`).
Round **one** of two. Round two reviews the fixes, per `CLAUDE.md`.

## What was built

B-23 is the **second half of B-22's ruled unit** (`REVIEW-029c` item 3). The
ruling fixed the unit as *the seed's owned lifetime* — from the profile on disk
to the derived key — and named four sites in `signer/src/holder.rs`. It is a
**build against an existing ruling, not a new decision.**

| what | where |
|---|---|
| `raw`, the whole profile from `read_to_string` | `holder.rs::load_with` |
| the second parse's `serde_json::Value` AST | `holder.rs::from_json_with` |
| `RawProfile::account_seed` | `holder.rs` |
| the `seed` local, and the prompted path's trim | `holder.rs::from_json_with` |
| **not in the ruling's list:** two more copies of the same idiom | `onboarding.rs` (two seed prompts) |
| **not in the ruling's list:** `ask_secret`'s return type | `onboarding.rs` |
| **not in the ruling's list:** `read_line`'s buffer growth | `onboarding.rs::TerminalIo` |
| the seed decoded twice (`REVIEW-029a` finding 3) | `keygen.rs::derive_raw` |

## The five things this round exists to attack

1. ⚠ **DID THE BUILD IMPLEMENT ITS OWN RULING?** `REVIEW-030` found B-22's build
   had **not** — the ruling put three scalars in scope, the build wiped none, and
   a comment called that *"the crate's boundary, not an omission"*. **Read
   `REVIEW-029c` yourself and tick its conditions against the code, not against
   anything this request says.**
2. ⚠ **IS THERE A SEED COPY THAT IS STILL MISSED?** The ruling's list was line
   numbers; the idiom had **three** copies and two were unnamed (E-185). **Assume
   the same is true again.** `serde_json`'s escape scratch is a *named* residual —
   argue if you think naming it is insufficient, but it is not an oversight.
3. ⚠ **IS THE `IgnoredAny` SWAP BEHAVIOUR-PRESERVING?** The `serde_json::Value`
   AST was **deleted**, not wiped. `tests/profile_parse_b23.rs` claims to pin the
   behaviour. **One of those four tests false-passed until it was broken (E-193)
   — check whether any of the other three still does.**
4. ⚠ **DOES `check-zeroize-bounds` PART 6 ACTUALLY CATCH ANYTHING?** Three gates
   in this repository were built to catch false passes and false-passed
   (E-165, E-168, E-182). **Break part 6 yourself.** Its claim is a NAMED SET,
   not a whole-surface guarantee.
5. ⚠ **ARE THE CLAIMS TRUE?** `CLAIMS.md` E-183–E-193, the B-23 row, and
   `CLAUDE.md`'s status block. E-181's lesson is that the **description** fails
   separately from the construction. **P-5 governs everything: this narrows a
   window and removes no channel. A sentence claiming more is a finding.**

## What is already conceded, so do not spend the round on it

* **P-5.** Nothing here is claimed to make anything secure. An adversary with
  code execution reads the value while it is live.
* **Named residuals:** `serde_json`'s escape-decoding scratch (outside this
  crate), `read_to_string`'s growth if the file changes mid-read, a pasted line
  over the 4096-byte reservation, and the source of every Rust move.
* **`the_two_seed_dispatches_agree` catches DRIFT, not a revert to the double
  decode** — that revert is behaviourally identical and passes it. Stated in the
  test.
* **The two compile-time reverts are `(type)` breaks and are COUPLED**: each
  bites because a second B-23 site expects the wiping type; reverting both
  halves together compiles.

## Grade each finding

`HIGH` / `MEDIUM` / `LOW`, with **file and line**, and say what would falsify it.
⚠ **A finding whose diagnosis is wrong may still have a real weakness under it
(E-170) — say so if that is the case rather than dropping it.**
