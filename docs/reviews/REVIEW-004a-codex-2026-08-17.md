# REVIEW-004a — Codex leg, verbatim

- **Date:** 2026-08-17
- **Reviewer:** Codex CLI 0.135.0 via `/codex:adversarial-review`, run against `--base 8d6758a`
- **Target:** `git diff 8d6758a...HEAD` — 20 files, 1588 insertions, 10 deletions. Base is the commit immediately before Session 3, so the diff is both session commits.
- **Access:** full repository. **It also reached `/tmp/wconf`**, the session's scratchpad, and read the upstream mpt-crypto tree there directly — `tests/test_pok_sk.c`, `tests/test_compact_standard.c`, `src/mpt_internal.h:170–260`, `CMakeLists.txt`, and a grep for `nonce|random|RAND|deterministic|identical|same statement` across the test tree. **That matters for Q5**: the grep-based negative behind U-30 was re-checked against the actual upstream source by a second party, not merely accepted from this session's grade.
- **Focus given:** the packet's eight numbered questions in priority order, with Q1 (E-22 sample design), Q3 (`C₁`-sharing artifact), Q4 (F-12-shaped over-generalisation), Q5 (grep negatives) and Q6 (nonce endorsement) named explicitly, plus a sweep for `CLAIMS.md` rows graded above their evidence. Told not to relitigate REVIEW-003a/b.
- **Verdict returned:** `needs-attention`.

**Verbatim below. Not adjudicated. Not re-graded. Nothing here has been applied.**

---

# Codex Adversarial Review

Target: branch diff against 8d6758a
Verdict: needs-attention

No-ship for publication: the strongest measurement-backed claims still outrun what the harness actually measured, especially E-22/B-10 and the emsdk version range.

Findings:
- [high] Cover-traffic recommendation still treats E-22 indistinguishability as established (docs/task-zero/TASK-ZERO-2026-08-13.md:262-266)
  This section still says zero-value sends are freshly randomized and therefore indistinguishable from non-zero sends, then uses that to keep scheduled cover traffic as the domain-saving recommendation. The actual send harness built the non-zero sample first, then the two zero samples, and `buildSend` proves against the current decrypted balance/version. That means the side-by-side compared amount=100 at balance 250/version 1 against amount=0 at balance 150/versions 2 and 3, with only one non-zero control and no fee-minimum experiment. The measurement supports zero-send validity and a few coarse non-asymmetry spot checks, not the blanket statement this recommendation needs.
  Recommendation: Rewrite §9 to separate E-22(a) validity from E-22(b) indistinguishability, mark cover traffic as still proposed, and require controlled same-balance/multi-control measurements plus an adversary model before relying on it.
- [medium] E-47 reintroduces the narrowed F-12 range overclaim (CLAIMS.md:94)
  F-12 was correctly narrowed to exactly two tested emsdk versions: 6.0.2 succeeds and 6.0.6 fails. This row still says the WASM build "does not build on emsdk newer than its CI pin" and grades the row A, which asserts an unmeasured version range. The same wording appears in U-28, so this can leak into upstream feedback as a false generalization from a single newer sample.
  Recommendation: Change E-47 and U-28 to say only "failed on emsdk 6.0.6; succeeded on 6.0.2; other versions untested," while preserving the A grade only for the two executed versions and native/WASM cross-checks.
- [medium] F-9 severity is downgraded from a one-host workaround (CLAIMS.md:102)
  E-56 says the broken Conan lock is "not a blocker" because this spike compiled the nine sources directly with clang, a locally built secp256k1, and system OpenSSL. That is evidence that this macOS spike was unblocked, not that the documented build is non-blocking for clean machines, CI, Linux, or downstream Rust/Python consumers. The workaround is explicitly undocumented and hardcoded in the spike, so using it to downgrade F-9's practical severity is stronger than the measurement supports.
  Recommendation: Limit E-56 to "not blocking this spike on this host," keep F-9 as blocking for the documented contributor path, and only downgrade after a clean-machine reproduction or an upstream-documented workaround exists.

Next steps:
- Rerun E-22 with controlled pre-state and explicit fee-minimum coverage before publishing B-10-related prose.
- Audit all "newer than," "not a blocker," and "works" rows for range/sample-size language before filing upstream feedback.

---

## Recording notes — observations about the leg, not adjudication

Stated here so the adjudication round has them, and kept separate from the verbatim text above.

1. **All three findings are instances of the packet's own Q4** — a range or a general conclusion asserted from one or two samples. The packet named the failure mode and named F-12 as the worked example; it did not then apply the test to E-47, U-28 or E-56, which are the same shape. **Self-review found the mechanism and missed three of its instances.** That is the second time in this session the same thing has happened, after the "stranded" clause.
2. **Finding 1 is a miss this session should have caught.** `CLAIMS.md` B-10 was rewritten to state the dependency precisely; `TASK-ZERO-2026-08-13.md` §9, which is the document that actually carries the cover-traffic recommendation, was not touched. The register and the prose it governs now disagree.
3. **Finding 1 also reports a harness detail the packet did not state**: `buildSend` proves against the *current* decrypted balance and version, so the ordering of the three sends determined the pre-state. The packet described the balance mismatch as a design weakness; Codex identified its cause in the code.
4. **Q3 was not answered.** The `C₁`-sharing question — protocol property or artifact of the single `tx_blinding_factor` — drew no finding. Absence of a finding is not a clearance; whether the reviewer checked it and agreed, or did not reach it, is unknown from the output. **Carry Q3 to the Gemini leg and to adjudication.**
5. **Q5 drew no finding either, and here the silence is worth more**, because the transcript shows the reviewer did read the upstream test tree at `/tmp/wconf/mpt-crypto/tests/` and grep it for nonce-distinctness assertions. It did not contradict U-30. That is weak positive evidence, not confirmation.
6. **Q6 drew no finding** — the reviewer did not read the nonce write-up as an endorsement. One reviewer's silence, again, not a clearance.
7. **All three findings were spot-checked against the files before this record was committed, and all three point at real text.** TASK ZERO §9 does still assert that zero-send ciphertexts are freshly randomised and rest the cover-traffic recommendation on it (`TASK-ZERO-2026-08-13.md:264–266`), and it was not touched by this session. `CLAIMS.md:94` (E-47) does still read "does not build on emsdk newer than its CI pin". `UPSTREAM-FEEDBACK.md:118` (U-28) reads "does not build on an emsdk newer than the CI pin" — different words, same generalisation, so the reviewer's cross-reference is correct in substance. **Spot-checking that the findings point at real text is not adjudication** and does not decide whether the recommended changes are the right ones.
8. **Nothing was found against E-4, E-45, E-46, E-49, E-50, E-52, E-53 or F-15.** Recorded so the adjudication round can see which claims survived a hostile pass with repository access, and which were simply not examined.
