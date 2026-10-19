# REVIEW-027s — SELF LEG: B-21's build and E-171's correction of B-19

**Date:** 2026-08-27. **Frozen commit:** `d8eb7a3`. **Leg:** the session that
wrote the code, reviewing its own work.

⚠ **Written to a scratchpad and not committed until the other legs return.**
`CLAUDE.md`'s rule, learned 2026-08-26: do not let your own answers appear in the
tree a repo-access leg is reading. The Codex leg has read-only repository access.

⚠ **This leg is structurally the weakest of the three** and its own register says
so: *"self-review finds mechanisms, misses instances"* — six claims outran their
evidence in one session, external legs caught every instance and my own
re-reading caught none. Read this as a list of things I already know are wrong,
not as a clean bill.

---

## Findings

| # | Finding | File:line | Severity | Confidence |
|---|---|---|---|---|
| S1 | **No Devnet execution after B-21, and B-21 touches the DEFAULT signing path.** `fresh_aux` is what `sign_message` calls; its type changed. `REVIEW-024` §6 item 7 made a Devnet transaction on the default path a gate for B-16 precisely because no test can stand in for it, and the same argument applies to a change on the same path. The construction is pinned by KATs and I believe it is unchanged — **but "I believe it is unchanged" is what §6 item 7 exists to refuse** | — | **MEDIUM** | CERTAIN |
| S2 | **E-171's RESULT is proven; E-171's stated MECHANISM is not.** The result — `features = ["std"]` yields `alloc,std,zeroize` — rests on a compiling probe with a failing control and on `cargo tree`, and is solid. The *explanation* I wrote into four documents is that `"zeroize/alloc"` lacking the `?` sigil enables the feature. **I did not verify that against Cargo's documented resolution rules**; I inferred it from the manifest and the observed outcome. The subtlety I skipped: `dep:zeroize` appears in the explicit `zeroize` feature, which normally suppresses the implicit feature, so *why* `zeroize/alloc` reaches the explicit feature is exactly the step I am asserting rather than citing | `CLAIMS.md` E-171; `CLAUDE.md`; `DECISION-b19…`; `xrpl.rs` | **MEDIUM** | CERTAIN |
| S3 | **Two of the three part-2 reverts are caught by `(type)`, not `(bound)` — which is weaker than the gate's headline suggests.** `fresh_aux` and `OneShotAux` break the build because `sign_with_aux`'s signature disagrees, not because anything asserts they wipe. A refactor that reverted the local **and** its consumer together would compile with the secret unwiped. The gate reports the distinction honestly, but the register row and the commit message both say "reverts break the build" without it | `tools/check-zeroize-bounds.py` | **MEDIUM** | CERTAIN |
| S4 | **The gate's part-2 patterns are whole-function literals**, so any reformat of `sha512_zeroizing` makes it report `BAD PATTERN`. It fails loudly rather than silently, which is the right direction — but it is brittle enough that a future session may be tempted to "fix" it by loosening the match, which is how `check-test-support-gate` acquired E-165 | `tools/check-zeroize-bounds.py` | **LOW** | CERTAIN |
| S5 | **I widened B-21's scope to `OneShotAux` and closed the row as if it were the registered work.** It is disclosed at the code site, in the register row and in the commit — but the row is still marked closed against a list it did not match. A reviewer should say whether that is acceptable or whether `OneShotAux` deserved its own number | `CLAIMS.md` B-21 | **LOW** | CERTAIN |
| S6 | **`sha512half`'s secret-derivation callers are out of scope by my own decision, not by the register's.** B-21 named the signing helper; `ed25519_from_entropy` derives the actual ed25519 secret through `sha512half`, whose `full` local and returned array are unwiped. I disclosed this in the packet rather than fixing it. **If a leg says it should have been in scope, I have no argument** — it is the same class of residue, on a more sensitive value | `signer/src/xrpl.rs:180-186, 387` | **MEDIUM** | CERTAIN |
| S7 | **The falsifier was written by the author of the code**, in the same session, with no independent check that the gate tests what it claims. This is the arrangement `REVIEW-025` §7 exists to distrust, and it is worth stating that the gate agreeing with the code is not evidence | — | **LOW** | CERTAIN |
| S8 | **`the_signing_helpers_secret_locals_wipe_on_drop` calls `fresh_aux()`, which reads a `test-support` thread-local hook.** No hook is armed in this test and it now `expect`s a successful draw rather than skipping — but the test's correctness depends on no other test in the same thread leaving `NEXT_ENTROPY` armed. I judged the risk negligible; I did not prove it | `signer/src/xrpl.rs` `aux_tests` | **LOW** | LIKELY |

---

## Answers

**1. Is E-171 correct? — CORRECT on the result, PARTIAL on the explanation.**
See S2. The probe is four lines, has a control that fails, and was run: `[]`
fails, `["std"]` compiles, `["alloc"]` compiles, today's line compiles. `git show
16e2e58:signer/Cargo.toml` confirms the historical line was `["std"]`. I am
confident the *finding* is right. I am not confident the *mechanism sentence* I
put in four documents is precisely stated, and it should be checked against
Cargo's resolution rules rather than against this repository's account.

**2. Does B-21 change the signing construction? — CORRECT, it does not.**
The strongest evidence is not mine: all twelve `revert-sweep.py` mutations still
fire, `the_construction_matches_a_second_model` (a KAT against a separately
written model) is green, and
`the_unmasked_arm_is_byte_identical_to_the_crates_own_rfc_8032` is green. Those
three would all move if a byte moved. ⚠ **But see S1** — none of them is a Devnet
transaction.

**3. Can the gate false-pass? — PARTIAL.** See S3 and S4. The direction I could
not close: `(type)` catches a revert only while the consumer disagrees.

**4. Are the new tests real falsifiers? — PARTIAL.**
`the_wiping_hash_is_sha512_over_its_parts_in_order` I broke deliberately (hashed
the parts in reverse) and watched fail, so it is real.
`the_signing_helpers_secret_locals_wipe_on_drop` is a compile-time bound and is
exercised by the gate's part 2. ⚠ **Its first draft had a vacuous-pass path** —
`if let Some(aux) = fresh_aux()` silently skipped the check on an entropy
failure, which is this repository's own most frequent defect written into the
test whose subject is B-21. I caught and fixed that before committing; a leg
should assume there is another.

**5. Is anything overstated? — NOT-ESTABLISHED by me.** I checked every site I
wrote and found none, and `claims-check` caught two things I had missed (a bare
P-12 negative about `sha2`, and an unsupported "only because k256"). **My own
re-reading has never once caught an instance in this project's history** — that
is the exact register row about this leg. Assume there is one.

**6. Did the B-19 corrections reach every copy? — NOT-ESTABLISHED.** I corrected
`CLAIMS.md` E-167, `CLAIMS.md` B-19, the decision §5 and header, and the test doc
comment, and grepped for the phrases. E-168 is the record of doing exactly that
correctly and still missing four sites. I did not re-grep after the last edit.

**7. What is still unwiped? — see S6** for the one I chose not to fix, and
`sha512_zeroizing`'s doc for the three I cannot.

**8. Is removing the dev-dependency correct? — CORRECT, but weakly checked.**
The tests compile and run, which is the whole of my evidence.

**9. Anything else.** The packet is 341 KB and had to be re-cut twice to get a
leg to answer at all; the first two Codex invocations exited 0 having produced
**nothing**, which is precisely the failure mode `CLAUDE.md` warns about when it
says *check output size, not exit code* — and **size was misleading too**, because
the output was the echoed prompt. That is worth a register row on its own.

**Score: 6.5/10.** The change is small, correct as far as three independent
mechanisms can show, and honestly bounded. What holds it down is S1 (no Devnet
run on a default-path change), S2 (a mechanism asserted in four documents on one
reading) and S3 (the gate is weaker than its headline). **The single change that
would raise it most: run the default path on Devnet and reconcile the prose
against the receipt** — E-169 is four documents citing a hash no receipt recorded,
and the way not to repeat it is to run first and write second.
