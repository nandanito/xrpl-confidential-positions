# REVIEW-025c — ADJUDICATION, round one of the B-16 build

**Date:** 2026-08-27. **Three legs** against frozen commit `200aae63`:
`REVIEW-025a` (Gemini, `agy --effort high`, 9.5), `REVIEW-025b` (Codex,
read-only, 9 on the construction / **8 on the evidence**), `REVIEW-025s` (self
leg, 7). ⚠ **The adjudicator takes the low end: 8, and on the evidence rather
than on the construction**, which is where the disagreement was.

⚠ **The self leg was written to a session scratchpad before either external leg
returned, and committed only after both had.** Codex was launched first because
it backgrounds; `agy` does not. Neither external leg had repository access and
both answered from the packet alone.

---

## 1. Where the legs agreed, and it is not the interesting part

**All three ruled the construction CORRECT**, term by term against `REVIEW-024`
§3, and all three checked the same nine terms independently: `h = SHA512(sk)`,
the clamp, `hash_prefix`, the 29-byte DST *including* its trailing NUL, the
`DST ‖ aux` order, the XOR landing on `hash_prefix` and not the scalar, the
internal derivation of `A`, `raw_sign::<Sha512>`, and `fresh_aux` mapping a
successful zero draw to `Some`.

**Nobody found a defect in the construction.** Everything below is about
**evidence and claims**, which is where all eleven findings landed.

⚠ **Unanimity here is worth more than `REVIEW-024`'s was**, and the reason is
E-160: that packet quoted `hazmat.rs` in excerpts and steered a leg into calling
a `pub` function unavailable. This packet carried `hazmat.rs`, `signing.rs` and
`verifying.rs` **complete**, and both legs cited `hazmat.rs:81-98` and
`signing.rs:566-569` — lines the adjudicator did not point at.

---

## 2. ⚠ The finding this session made against ITSELF, before any leg ran

**A revert PASSED.** `REVIEW-024` §6 item 3 — *a successful all-zero draw stays
hedged* — had a test named for it, and reverting `fresh_aux` to treat a zero
draw as an omission **left all 263 tests green**. The test drove
`Hedge::FixedAux([0u8; 32])`, which enters at `sign_with_aux` and never reaches
the function that makes the decision.

**Reading the test found nothing. The mechanical sweep found it.** That is
`CLAUDE.md`'s *revert every fix and watch its test fail* paying for itself, and
it is the strongest instance the project has.

---

## 3. Findings upheld, and every one is fixed

| # | Finding | Found by | Fix |
|---|---|---|---|
| 1 | ⚠ **`check-test-support-gate.ts` FALSE-PASSED.** One shared probe file plus `output.includes(symbol)` matched the **echoed source line**, so a symbol was "gated" whenever anything sharing its line failed | **Gemini and Codex, independently** | **One crate and one pair of compiles per probe**, plus a negative control that must build both ways. ⚠ **Demonstrated before and after**: a control entry naming `0u8` — a literal — was reported `gated` by the old gate and is reported `REACHABLE` by the new one |
| 2 | ⚠ **`revert-sweep.py` accepted any nonzero exit as "the test failed"** and never checked that an *expected* test was among the failures | **Codex** | Runs the whole suite, requires an expected name in the failures, and reports `WRONG-TEST` / `NO-TEST-FAILED` / `VOID` distinctly. ⚠ **It immediately caught four stale expected-test names created by this round's own renames** — invisible under the old rule |
| 3 | ⚠ **`next_entropy_draw_returns_for_test` returned `Err` on a size mismatch**, which `fresh_aux` converts into *"entropy failed"* → the **unmasked** arm. A malformed test would have signed with no mask and passed | **Codex** | Panics instead. A broken test setup is not a runtime condition |
| 4 | **`the_dst_is_the_ruled_bytes` was a tautology** — a literal compared to the same literal, because the constant was `pub(crate)` and unreachable from an integration test — under an `xrpl.rs` comment claiming it *"pins all 29 of them"* | **Self leg and Codex, independently** | Constant is `pub`; the test compares **it**. Revert 12 added, and it fails on a one-byte DST edit with that test alone |
| 5 | **`the_verifying_key_..._and_no_caller_can_choose_it`** asserted in its name what its own doc comment admitted it could not see | **Gemini and Codex** | `every_signature_verifies_under_the_seed_derived_published_key` |
| 6 | **`debug_assert_eq!` on verifying-key drift is compiled out of `--release`** — absent from the only binary that signs | **Self leg and Gemini** | Hard `assert!`. `panic = "abort"` makes it a clean stop, on `OneShotAux`'s precedent |
| 7 | **`Sha512::digest(k.to_bytes())` copies the secret by value**, in the commit that enabled `zeroize` so secrets would be wiped | **Self leg and Gemini** | `as_bytes()`. The remaining locals are **B-21** and stay filed |
| 8 | **"BUILT" / "B-14 is CLOSED" is premature** while §7 item 4 is unfinished | **Gemini and Codex** | Every header now separates **built and executed** from **reviewed**, and names round two as what is outstanding |
| 9 | **The KAT's name and framing overclaimed independence** — the curve library is external; the model and its vectors are this project's, written in this change | **Codex; the self leg raised the asymmetry** | `the_construction_matches_a_second_model`, with the asymmetry stated: the *arithmetic* has a third-party control, **the mask has none** |
| 10 | **`revert-sweep.py` mutated the live tree** with a shared `/tmp` backup and no `try`/`finally` | **Codex** | Unique temp backup, `atexit` **and** SIGINT/SIGTERM restore |
| 11 | **Five stale or miscrediting sentences** — `Cargo.toml`'s *"No keys, no proofs, no signing"*; *"the draw happens in `Hedge::aux`"*; *"`one_implementation_not_two` is what holds that"* about a deleted test; the wrong test credited for the zero-draw property; *"the whole ruling in one assertion"*; the Makefile's *"every gated symbol"*; B-19's *"no API"* and *"nothing measurable"* | **Codex, mostly; Gemini the Makefile** | All corrected, each marked with what it said and who found it |

**Also fixed, from the self leg alone:** `Hedge::Fresh` had exactly one reference
— its own match arm — because `sign_message` calls `fresh_aux` directly. **A
second, unexercised entry to fresh entropy** is a small version of what §7 item 1
exists to prevent. Deleted.

## 4. ⚠ Findings NOT upheld, recorded so they are not relitigated

- **Codex, §6 gate 1 PARTIAL** — *"the `ripple-keypairs` test source is absent
  from the packet."* **The grade is right and the cause is the adjudicator's.**
  `tests/xrpl_vectors.rs` is unchanged by this build and passing, but *unchanged*
  is a claim a leg cannot check without the file. **A packet gap, not a code
  gap**, and it is E-160's lesson arriving from the other side: an omission
  bounds a leg exactly as an excerpt does. The file is in round two's packet.
- **Codex, §6 gate 8 PARTIAL** — upheld in substance (finding 2) but its premise
  that *"the supplied output omits the script's own `-> failing:` lines"* was the
  adjudicator's filtering of the packet, not the script's behaviour.
- **Gemini, §6 gate 7 PARTIAL for want of a committed receipt** — upheld, and
  Codex sharpened it into the real point: the script ran **whatever binary was at
  `target/debug/`**, with no source-to-binary link. Fixed by rebuilding inside
  the script and recording `builtFromCommit` and `workingTreeDirty` in
  `docs/runs/`.

## 5. B-19 — ACCEPTED by all three legs

Both external legs accepted it on the merits and both corrected its wording,
which is now fixed: **"no callable API or wire-format change"** rather than "no
API" (the `ZeroizeOnDrop` bounds are newly visible, and §5's check depends on
that), and **"no new dependency download; expected negligible, not measured"**
rather than "nothing measurable". ⚠ An unmeasured number is not a number, and
this project says so about everyone else's.

## 6. What round one did NOT settle

- **§7 item 4 is the reason there is a round two**, and its subject is *these
  eleven fixes*. `CLAUDE.md`: *fixing something and describing the fix are
  separate acts with separate failure modes.* Findings 4, 5, 9 and 11 are all
  **descriptions**, which is exactly the class round two exists to catch.
- ⚠ **The mask has no outside check and cannot get one.** No third party computes
  a W-CONF-hedged signature. The arithmetic is controlled by `@noble`; the
  combiner rests on two readings of the same prose, both this project's. Stated
  in the test rather than argued away.
- **rippled's ed25519 verification path was not read at source** — that source is
  not in this checkout. `REVIEW-024` §6 named it and it stays named.

## 7. Confidence: **8**

The construction is 9-plus and three legs agree on it from complete source.
**What holds the whole at 8 is that eleven findings were about evidence and
claims, and that is the half this project keeps getting wrong.** Four of the
eleven were sentences describing tests, one was a gate that certified a literal
as a gated symbol, and one was a sweep that would have accepted a crash as proof.

⚠ **The self leg found four of eleven and missed the two worst.** Being the
adjudicator does not make your leg the good one — `REVIEW-024` §4's inverted
lesson, arriving again in the same shape, one round later.
