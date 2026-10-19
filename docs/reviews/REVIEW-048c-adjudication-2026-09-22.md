# REVIEW-048c — adjudication: E-296 to E-307

- **Date:** 2026-09-22
- **Legs:** `REVIEW-048a` (Codex, corpus, no network), `REVIEW-048b` (Gemini, rules, no corpus), `REVIEW-048s` (self).
- **Verdict:** **seventeen findings upheld, two rejected, one withdrawn by the self leg before adjudication.** The twelve rows' *executed* evidence is sound and nothing in them is fabricated. What the round found is a layer up: sentences stated more broadly than the evidence reaches, one evidence cell that mis-records a command's output, and **an entire second audit corpus the register has never heard of**.
- **Round two is OWED.** It reviews the fixes, and it is not optional: `CLAIMS.md` E-194 is this project's record of an adjudication that answered the prose a finding quoted instead of the defect it named.

⚠ **The two findings that matter most both land on rulings already taken**, so they are stated first rather than by severity.

---

## THE TWO THAT CHANGE A FILING

### A. `F-17`'s load-bearing step rests on one word the paper uses both ways — and upstream's own code reads it the other way

**Found by leg A. Confirmed at source here.** F-17 says:

> *"Deriving nonces over the paper's `statement` omits it, producing two proofs with shared commitments under distinct challenges."*

Everything in F-17 hangs on `statement` in Remark 6.1 meaning the formal relation **x**, which does omit `TransactionContextID`. The paper does not say that, and **two subsections later it uses the word the other way.** §6.2, *Fiat–Shamir Domain Separation*, enumerates what the challenge hash must include, item 4 being *"The `TransactionContextID` for replay protection"*, and closes: *"Omitting any statement element from the hash would allow cross-protocol attacks."* Under that sentence the context **is** a statement element.

⚠ **And the strongest evidence for the other reading is inside F-17's own evidence cell.** It records that the implementation *"hashes `context_id` into **`stmt_hash`**"*. The implementers named the variable for the statement and put the context in it. Read at `3baaaac:src/proof_compact_standard.c:230-248`: every public key, the ciphertext bundle, both commitments and `B1`/`B2` are folded in, then `if (context_id)` folds that in too, and the result — `stmt_hash` — is what `generate_deterministic_nonces` receives beside the witness.

**Upheld, and it does not kill the finding — it makes the filing stronger.** The defensible filing is not *"the nonce input omits the context"* but ***"Remark 6.1 says `statement` and never defines it; the formal relation x excludes `TransactionContextID` and §6.2's `statement element` includes it; under the x reading the stated justification is false and an implementer who follows it gets nonce reuse across a resubmission."*** That reports the ambiguity **and** its consequence, and a maintainer cannot answer it with *"statement includes the context"* — that answer is half the finding.

**Action:** E-306 must record the §6.2 usage and stop presenting the x reading as settled. The F-17 draft must lead with the ambiguity.

### B. Six rows settle *"has upstream already raised this?"* against one of two audits

**Found by the self leg.** E-296, E-303, E-304, E-305, E-306 and E-307 each carry a sentence of the form *"Trail of Bits does not raise it"* or *"Trail of Bits has 0 matches for …"*.

There is a second audit of this exact codebase and it is public:

- `XRPLF/rippled#7018`, in full: *"Filed in error. Same content was submitted via the active Sherlock XRP Ledger Attackathon (contest 1260). Closing here. No action needed on this repo."*
- `audits.sherlock.xyz/contests/1260` — *XRP Ledger - April 2026 Contest*, 550,000 RLUSD. Public reporting puts **Confidential Transfers for MPTs** among its five scope pillars and its result at **96 valid findings, 2 critical and 6 high**.
- `rippled#6885`, *"[XLS-0096] ElGamal Ciphertext Malleability in ConvertBack"*, is **open**. `mpt-crypto#102` cites *"Sherlock #986"*.
- **`git grep -i -l sherlock HEAD` over this repository returns nothing.** `CLAIMS.md` and `UPSTREAM-FEEDBACK.md` are 0 each.

⚠ **This falsifies no sentence in the twelve rows.** Each says *Trail of Bits*, and each is true of Trail of Bits. **It falsifies what those sentences are used for** — they are the register's instrument for *is this already known upstream?*, and the instrument has been reading one of two audits.

**It is a NAMED GAP, not a reading anyone skipped.** Obtainability chased to the end: `gh api orgs/sherlock-audit` → the org exists with 460 public repositories on a `YYYY-MM-<name>[-judging]` convention; `search/repositories q='org:sherlock-audit xrp'` → **0**; `… 'org:sherlock-audit ledger'` → **0**; direct probes of `2026-04-xrp-ledger`, `-judging`, `2026-04-ripple`, `2026-04-xrpl`, `2026-04-xrpl-judging` → **404, all five**; `audits.sherlock.xyz/contests/1260/report` → **404**. B-13's shape.

⚠ **Calibrate it.** The reachable Sherlock-citing issues are about batch delegate revocation, pseudo-account directories, ElGamal malleability, MergeInbox griefing, bulletproof MSM, path-finding, permissioned-domain deletion, vaults and fees. **Not one touches Conan remotes, the Emscripten link line, the paper's C₁ layout or Remark 6.1.** So this bears **least** on the four filings and **most** on the register's security-adjacent negatives. The filings should still carry the search; they are very unlikely to be moved by it.

---

## UPHELD — the rest

| # | Row | Finding | Legs | Severity |
|---|---|---|---|---|
| 1 | E-306 | *"the implementation is not affected"* is unqualified. True of the utility path (`mpt_utility.cpp:654-656` rejects a NULL `context_hash`); **false of the exported low-level prover**, which has `MPT_ARG_CHECK` for every other pointer and none for `context_id`, then `if (context_id)` at `:240`. E-296 is the row that establishes the NULL path is real | a, s | HIGH |
| 2 | E-304 | *"no upstream text says which was intended"* is asserted over a document upstream names and this project has not obtained: `paper/cmpt-progress-and-changes.tex`, located by `mpt-crypto#107` in *"`confidential-transactions` / `internal-ripplex-research`"* — **an internal repository** — and cited by #101, #102, #103 and #107, two of them by the section `\section{Sherlock Audit (April--May 2026) Cross-Reference}`. `gh api search/code q='cmpt-progress-and-changes org:XRPLF'` → **0**; it is in no ref of the local clone. ⚠ The negative **survives widening** — three more phrasings across all XRPLF repositories found nothing — so the defect is asserting absence over an unobtainable source rather than naming the gap | b, s | HIGH |
| 3 | E-296 | **The evidence cell mis-records a command's output.** It says *"`git grep -c "if (context_id)"` at `f196bdb` lists `src/proof_pok_sk.c` with 1"*. Re-run, it lists **four** files: `bulletproof_aggregated.c` with 8, `proof_link.c` 1, `proof_pok_sk.c` 1, `proof_same_plaintext_multi_shared_r.c` 1 — and a spelling-expanded search adds `proof_same_plaintext.c:107`'s `if (tx_context_id)`. The PoK count of 1 is right; the recorded result is not | a | MEDIUM |
| 4 | E-296 | *"F-19 is not new"* and *"upstream `mpt-crypto` is unchanged on it at HEAD"* are both broader than the evidence. Trail of Bits names `proof_link.c` and `proof_same_plaintext.c` and there is **no `proof_pok`, registration, account-binding or replay match in that item** — the audit is prior art for the *class*, not for F-19's instance or its consequence, which the row itself concedes two sentences later. And upstream did act after the report: the `:319` sentence is new since `f196bdb` | a, s | MEDIUM |
| 5 | E-299 | *"F-7 and F-12 still hold at upstream HEAD"* states as status what was established as a reading of unchanged conditions. Disclosed twice in the row and once in the grade, and **E-302 already words it correctly** — *"run at `85dbac7`, only read at `1.0.5`"* — so E-299's headline is the outlier | a, b, s | MEDIUM |
| 6 | E-299 | *"Three of the five mpt-crypto re-checks"* names three and never names the other two. The denominator is not in the row | b, s | MEDIUM |
| 7 | E-299 | *"'not on the mainline branch' … true of `0.1.0-beta.1` only"* is contradicted by its own evidence cell: the `0.1.0` publish commit *"heads a one-commit `release-1.3.0` branch"* and compares **diverged, ahead 1 and behind 5**. What is true is that `main` now carries the same `1.0.4` pin | s | MEDIUM |
| 8 | E-299 | *"the only `1000000` in `src` and `include`"* falls to punctuation: `1,000,000` appears at `secp256k1_mpt.h:40`, `mpt_utility.h:183`, `elgamal.c:29` and **`bsgs_dlp.h:149`, which calls it a *cap*** — a new upstream sentence that cuts against F-7's reading. No caller hard-codes it, so F-7's code claim survives; the exact-spelling search hid the most relevant occurrence | a | MEDIUM |
| 9 | E-297 | *"F-8 is fixed upstream"* is a claim about the consumer's position, while the row's own `Not checked:` is *"whether `bsgs_dlp.h` is installed with the library"*. ⚠ **That question is live**: at `3baaaac`, `grep -i install` over `CMakeLists.txt` returns **nothing** (rc=1) and no `.cmake` file has one, while `conanfile.py:53-55`'s `package()` is a bare `cmake.install()`. Captured to `UPSTREAM-FEEDBACK.md` `Observed`, ungraded | s | MEDIUM |
| 10 | E-304 | The two totals need an **unstated intermediate**. Getting 1276 needs the paper's `33 + n×33` replaced by `n×66` at n=4 (+99); getting 1210 needs the auditor's `C₂` dropped from 1177 first (→1144) and *then* +66 at n=3. ⚠ **Demonstrated rather than argued: both external legs derived it and neither got it whole** — leg B recorded *"1177 + 33 = 1210"*, leg A *"adds 66 for n=3, giving 1210 exactly"*. For F-13, whose entire ask is byte counts, the filing must show the component table | a, b, s | MEDIUM |
| 11 | E-303 | *"no pseudo-account guard"* rests on two identifier spellings, `PSEUDO_ACCOUNT` and `isPseudoAccount`. A guard written as a keylet read or any helper containing neither token is outside the search | s | MEDIUM |
| 12 | E-301 | **No `Not checked:` clause at all** — alone among the twelve, and it is the row that *retracts* a finding, so it is the one most likely to be quoted as settled. Candidates: whether `loadWasmModule` is supported rather than merely exported, and that `_mpt_decrypt_amount` was exercised over one seven-wide window on one value | s | LOW |
| 13 | E-299 | The `Not checked:` names the natives tarball and omits the row's primary gap: **executing `build-wasm.sh` under an emsdk** | b | LOW |
| 14 | E-298 | *"upstream closed both"* — nothing was ever filed, so upstream closed nothing. Both were *overtaken*. The row says the right thing two sentences later | s | LOW |
| 15 | E-303 | The `3.4.0-rc5` gap is disclosed in the claim cell but, unlike E-305 and E-307, not in the `Not checked:` list. A consistency point only | b | LOW |

---

## REJECTED

### leg B's HIGH, and its nomination for *most likely to be found false*

> *"If upstream's CI workflow (`build-wasm.yml` pinning Emscripten `6.0.2`) is currently passing on GitHub Actions, the assertion that the build failure 'still holds' at HEAD is factually false."*

**Rejected on the substance. F-12 claims green CI at the pin.** Its text: *"mpt-crypto's shipped WASM build script **fails at emsdk 6.0.6 and succeeds at its CI-pinned 6.0.2**."*

Measured anyway. `actions/workflows` shows `build-wasm.yml` `active` with **0 runs of its own** — it is `workflow_call`-only. ⚠ **Control, because a bare zero is exactly the shape that turns a failed lookup into a false negative:** `actions/runs` → `total_count` **684**. The newest run on `main`, `32380884181`, contains the job **`success  Build WASM module / Build + test WASM module`**. The WASM path is exercised and green, at the pin, precisely as F-12 predicts.

⚠ **The cause is a defect in the packet the adjudicator wrote.** Leg B was asked whether these rows support filings about F-9, F-12, F-13 and F-17 **and was never given the text of F-9, F-12, F-13 or F-17.** It reconstructed F-12's claim from E-299's one-line summary and reconstructed it wrongly. That is `CLAIMS.md` E-160 — *an excerpt is a diff by another name* — landing on the person who wrote the excerpt, for the second time in this project.

**What survives is finding 5 above**, at MEDIUM.

### leg B's finding 5 — E-296's *"the one header sentence"* not established as exclusive

**Rejected, by a search neither leg B nor the row had run.** Five NULL-permitting phrasings across the whole `include/` directory:

```
git grep -n -i 'may be NULL\|can be NULL\|NULL is allowed\|optional.*NULL\|NULL.*optional' 3baaaac -- include/
  → include/secp256k1_mpt.h:319   (only)
… the same at f196bdb → no output
```

`:319` sits in the doc block immediately above `secp256k1_compact_standard_prove`. Leg A reached the same verdict independently, searching `NULL`, `optional`, `nullable` and every `context_id` declaration. **The row is right and is stronger than its own evidence cell showed.**

---

## WITHDRAWN BY THE SELF LEG, before adjudication

Self finding 6's second half said E-303's search *"over `src/libxrpl`"* might miss rippled's transactors, on the belief they live under `src/xrpld`. **False at `develop`:** GitHub code search puts them at `src/libxrpl/tx/transactors/token/`, `ConfidentialMPTConvert.cpp` among them, and the open PR #8181 touches `src/libxrpl/tx/invariants/`. The scope is adequate. Recorded because a remedy checked against the source before it is applied is the rule this project made by breaking it.

---

## WHAT THE ROUND CONFIRMED

- **Leg A re-ran the reachable evidence of E-296, E-297, E-299, E-304 and E-306 and it reproduced**, hash for hash and line for line: the report's SHA-256, `f196bdb`'s date, Appendix F's *"17 issues"* and March 31 – April 2, the `git diff --stat 85dbac7 3baaaac` that prints nothing, `fa7647e` contained only by `1.0.5` and not an ancestor of the pin, the paper's SHA-256 and every cited TeX line, `1.0.2`'s 33/66/33/754/192, and the `85dbac7..3baaaac` diff over `src include` listing only the two BSGS files. **Finding 3 is the single recorded output that did not reproduce.**
- **Nine of leg A's ten falsification attempts failed to falsify.** E-296's fix-review negative survived seven search terms; E-297's missing-BSGS negative survived six at two tags; E-304's Trail of Bits negative survived eight; E-306's April-report negative survived nine. **E-307's and E-306's negatives are the best-supported in the register** — E-307's because it enumerates `definitions.json`'s entire top-level structure instead of asserting an absence.
- **E-305 is the soundest row of the twelve.** Two arms, both hashed; the negative arm controlled by `txnNotFound` and an unmoved `Sequence`; the positive validated in a named ledger; the counterparty payload re-derived byte-wise; the cause traced to a merged PR, a tag and an amendment read live. It volunteers the check `REVIEW-007` said the original lacked.
- **E-307 discloses that its own prediction was wrong** — the junk Send was applied, not refused — and keeps the arm as a control with the reason.
- **No row claims a benchmark without its methodology, a security property, or an amendment state without a date.** E-301's P-8 sentence about its two timings is exactly right.
- `XRPLF/rippled#8181`, *"Enforce pseudo-account directory contents with an invariant"*, is **open** and not merged, so E-303's reading of `develop` stands. It is upstream corroboration that F-11's gap is real, which the row could say and does not.

---

## WHAT DIFFERING THE PACKETS BOUGHT, measured

**Only one finding was reached by all three legs** — E-299's headline, number 5. Everything else was structural to one leg's position:

- **Only leg A could reach** findings 3, 8 and section A. Each needed the corpus: a command re-run, a punctuation variant, a passage two subsections from the one the row cites.
- **Only leg B raised** findings 6 and 13, and it raised 6 from the rules alone, exactly as intended.
- **Only the self leg reached** section B and findings 2, 7, 9, 11, 12, 14 — all but one of which needed the network the sandboxed legs did not have.

⚠ **The counter-lesson is in the rejections.** Leg B's two rejected findings are both of one shape: *the evidence cell does not prove the exclusivity the claim asserts*. Given the corpus, both turned out to be **true and provable**. A rules-only leg generates the right suspicion and cannot settle it, so **its output is a work list, not a verdict**, and pairing it with a corpus leg is what makes it pay.

---

## WHAT HAPPENS NEXT

1. **Fix the twelve rows** against the list above — against the findings' own citations, then grep for each corrected phrase, because `CLAIMS.md` E-168 is three instances of a fix applied to the site the adjudicator was looking at rather than to the string.
2. **Record the Sherlock gap** as a B-row beside B-13, with the obtainability searches, and `UPSTREAM-FEEDBACK.md`'s two new `Observed` rows.
3. **Round two on the fixes**, owed and not optional.
4. **Then** the four drafts. Three of them now carry a specific instruction from this round: F-17 leads with the ambiguity; F-13 shows the component table; F-12 states that upstream CI is green at the pin and that **its own remedy sentence is stale** — it says *"the **two** `emcc` link lines"* and there are now **three**.
