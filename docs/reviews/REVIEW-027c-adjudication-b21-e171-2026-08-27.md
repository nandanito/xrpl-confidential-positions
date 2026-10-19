# REVIEW-027c — ADJUDICATION: B-21 and E-171, round one

**Date:** 2026-08-27. **Frozen commit:** `d8eb7a3`. **Legs:** Gemini (`agy`, no
repo access), Codex (read-only repo access, four targeted passes), self leg.

⚠ **This is round ONE. `CLAUDE.md`'s rule is two rounds and the second reviews
the FIXES**, because fixing something and describing the fix are separate acts
with separate failure modes. Round two is `REVIEW-028`.

---

## 1. The verdict in one line

**The construction is untouched and nobody disputes that.** All three legs agree
B-21 changed container types and `Drop` behaviour and moved not one byte. What
the round found is **one serious hole in the checks**, **one false premise that
survived its own correction**, and **one leg ruling the central finding false**.

---

## 2. Findings, adjudicated

| # | Finding | Raised by | Ruling |
|---|---|---|---|
| 1 | **The test and the gate are both blind to `sign_with_aux`'s call sites.** Inlining `Sha512::digest` leaves 267 tests green *and* part 2 reporting `OK`. | **Gemini and Codex, independently** | **UPHELD — HIGH → E-173.** Verified by really inlining it. Fixed by `check-zeroize-bounds` **part 3**, a source check with its own control. Test renamed. |
| 2 | **The false B-19 premise survives in `signer/Cargo.toml:26-34`.** | **Gemini and Codex, independently** | **UPHELD → E-172.** And worse: `Cargo.toml:36-38` and `xrpl.rs:192-196` assert it in prose *the correcting commit itself added*. ⚠ **Round one recorded "all four live sites fixed" and there were SIX** — `REVIEW-028` found two standing (E-175). Now fixed at all six. |
| 3 | **`sha512_zeroizing`'s headline contradicts its own note 2** — *"leaving no unwiped digest behind"* against *"a move leaves a copy behind"*, twelve lines apart. | Gemini | **UPHELD — MEDIUM.** Headline now names the two wipes it performs instead of an absence it cannot deliver. |
| 4 | **The key-derivation path is unwiped and the scope boundary is arbitrary.** `sha512half` over `entropy` **is** the ed25519 private key. | **Gemini and Codex, independently** | **UPHELD as a finding, FILED not fixed → B-22.** The dissent is recorded rather than settled; widening a security change on a review's advice mid-commit is how a fix overclaims. |
| 5 | **`AccountKey`/`Inner` are unwiped.** | Gemini | **REJECTED — refuted by Codex**, which traced drop glue to the k256 and boxed dalek keys, whose destructors zeroize. **A leg correcting a leg.** |
| 6 | **E-171 is FALSE; B-19 was right; `zeroize` was off for nine days.** | Gemini | **REJECTED → E-174.** Refuted by `cargo build -vv`: `rustc` compiles `ed25519-dalek/src/lib.rs` with `--cfg 'feature="zeroize"'` from a crate depending on nothing else at `features = ["std"]`. Codex answered CORRECT independently. |
| 7 | **Two of part 2's three reverts are caught by `(type)`, not `(bound)`** — weaker than the headline. | Self leg, echoed by Gemini | **UPHELD as a limitation, already disclosed** in the gate's output and its header. No change. |
| 8 | **No Devnet run after a change on the default signing path.** | Self leg | **UPHELD → carried to `REVIEW-028`.** `REVIEW-024` §6 item 7 made a default-path Devnet transaction a gate for exactly this reason. |
| 9 | **The packet was too large for one leg and truncated.** | Gemini | **UPHELD → §4.** |

---

## 3. ⚠ What round one got wrong about itself

**The gate this session built to catch false passes had one.** E-165 and E-168
are two prior instances; E-173 is the third, and the first where the *gate built
to catch the previous ones* shared the blind spot. The reason is worth stating
plainly: **part 2 mutates a definition, and the property lives at a call site.**
A definition-level mutation cannot see a caller that stopped calling.

**And the correction commit wrote fresh copies of the claim it was correcting**
(E-172). `CLAUDE.md`'s existing pair — *tick the leg's list, then grep for the
phrase* — is not sufficient. The missing third clause: **grep the diff you just
wrote for the claim you just falsified.**

---

## 4. ⚠ Tooling findings, recorded because friction is only visible now

1. **Codex exits 0 having produced NOTHING when asked for a long report.** Every
   prompt requesting a multi-question report returned only the echoed input, at
   exit code 0. Short single-question prompts answered normally. Input size was
   *not* the cause — a 36 KB prompt with a one-word answer succeeded.
   `CLAUDE.md` says *check output size, not exit code*; ⚠ **size is misleading
   too**, because the echoed prompt is most of the output. The working shape is
   **one question per invocation with an explicit short word budget.**
2. **The bisect of that failure was itself a false pass**, live: it grepped the
   output for a sentinel word that appears in the prompt being echoed. **E-165's
   shape — matching the echoed input — committed by the session that had written
   E-165 into the handover that morning.**
3. **A 341 KB packet is too large for the no-repo-access leg.** Gemini reported
   `hedged_signing.rs` truncated mid-line and two files absent that were present.
   ⚠ **An over-large packet bounds a leg exactly as an excerpt does** (E-160,
   E-170) — the failure mode is the same, the cause is the opposite. For a
   repo-access leg, hand it `git show <frozen>:<path>` and inline only what is
   outside the repository.

---

## 5. What round two must check

1. **The fixes themselves**, which no leg has seen — that is the whole point.
2. Whether **part 3's source check can false-pass**: what if the locator returns
   an empty arm? (A control was added for exactly this; verify it works.)
3. Whether **E-172's four fixes reached every copy**, including any *new* prose
   this round's fixes introduced. **That is the failure this round found.**
4. Whether **B-22's deferral is honest** or is scope-avoidance wearing a register
   row.
5. **The Devnet question** (finding 8), still open.
