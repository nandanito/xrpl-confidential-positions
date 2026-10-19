# REVIEW-045 Leg B — Description vs. Code Audit

## Executive Summary

Yes. There are direct contradictions, miscounted lists, false citations, and uncorrected claims across the adjudication document ([`REVIEW-044d`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b)), the register rows ([`E-258`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b), [`E-259`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b)), and the source file docstrings ([`tools/check-emphasis.ts`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts)).

---

## Part 1: Discrepancies and Findings

### Finding 1: Adjudication Contradiction on Disjoint Sets (Leg S vs Leg A)
- **Grade:** **HIGH**
- **Type:** Description finding (Internal Prose Contradiction in [`REVIEW-044d`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b))

| Prose Claim in [`REVIEW-044d`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b) | Contradicting Table Row in [`REVIEW-044d`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b) |
|---|---|
| `⚠ The packets differ on purpose. CLAIMS.md E-160: identical packets give unanimity that is one reading distributed. **They found three disjoint sets** — leg A the two construction defects, leg B nine detector holes, leg S the evidence and the counts. **No finding was reported by two legs.**` | `\| 11 \| **S, A** \| *"795 marks"* is stale **and** the wrong unit \| 795 is contiguous runs on the parent tree; 797 at HEAD; 957 mark characters \| Corrected in E-258, with the reason \|` |

**Analysis:**
The adjudication asserts as a methodological guarantee that the three legs found completely disjoint sets and that *"No finding was reported by two legs."* However, item 11 in the Upheld table explicitly lists both `S` and `A` as reporting the stale count/unit finding.

---

### Finding 2: Miscounted List of False Fails (Stated 4, Listed 5)
- **Grade:** **MEDIUM**
- **Type:** Description finding (Count discrepancy in [`REVIEW-044d`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b) and [`E-259`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b))

| Prose Claim in [`REVIEW-044d`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b) & [`E-259`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b) | Items Actually Enumerated & Code Implementation |
|---|---|
| **REVIEW-044d (Row 8):**<br>`Four false FAILS: 1) opening a cell, (A), **~~x~~**, indented code, lazy continuation`<br><br>**E-259:**<br>`Nine further detector holes came from the cold leg... and four false fails` | **Five distinct items are listed:**<br>1. `1)` opening a cell ([`tools/check-emphasis.ts:202`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L202))<br>2. `(A)` ([`tools/check-emphasis.ts:199`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L199))<br>3. `**~~x~~**` ([`tools/check-emphasis.ts:206-208`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L206-L208))<br>4. Indented code ([`tools/check-emphasis.ts:265`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L265))<br>5. Lazy continuation ([`tools/check-emphasis.ts:271`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L271)) |

**Analysis:**
Both the adjudication and register row `E-259` declare "four false fails", but proceed to list five distinct false-fail defects immediately following the colon.

---

### Finding 3: Refuted Claim Retained in Source Docstring
- **Grade:** **HIGH**
- **Type:** Description finding (Uncorrected assertion in [`tools/check-emphasis.ts`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts))

| Claim in [`REVIEW-044d`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b), [`E-259`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b), & [`tools/break-emphasis-gate.sh`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh) | Actual Docstring in [`tools/check-emphasis.ts:459-460`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L459-L460) |
|---|---|
| **REVIEW-044d (Row 3):**<br>`*"A crash cannot print this line"* is false... The verdict must be the last line`<br><br>**E-259:**<br>`And *"a crash cannot print the verdict line"* was false...`<br><br>**break-emphasis-gate.sh:59:**<br>`so REVIEW-043's own sentence — *"a crash cannot print this line"* — was false (CLAIMS.md E-259). A crash cannot print it last.` | ```typescript
/**
 * ...
 * A crash cannot print this line, so a caller that requires it, and requires it
 * to agree with the exit code, can separate the three outcomes.
 */
function verdict(what: "PASS" | "FAIL" | "CONTROL", code: number): never {
``` |

**Analysis:**
While `REVIEW-044d`, `E-259`, and `break-emphasis-gate.sh` all document that the claim *"A crash cannot print this line"* was false and had to be amended to specify printing it *last*, the docstring directly above `verdict()` in [`tools/check-emphasis.ts:459`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L459) was never updated and still contains the verbatim false sentence.

---

### Finding 4: False Citation to Disclosure in Code Comment
- **Grade:** **HIGH**
- **Type:** Citation finding / Non-existent disclosure in [`tools/check-emphasis.ts`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts)

| Comment in [`tools/check-emphasis.ts:191-194`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L191-L194) | What [`what_this_does_not_say()`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L320-L339) Actually Prints |
|---|---|
| `The complete allow-list is now . ! ? — (, an unescaped \|, a (n) enumerator and a closed ~~retraction~~, and every one of them is named in the printed disclosure.` | [`what_this_does_not_say()`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L320-L339) contains 9 numbered items (lexical scope, named file sets, inline mentions, rule 5 syntax, CLAUDE ratchet, ID cutoffs, unmodeled block elements, autolinks, cmark status).<br><br>**Not one item lists or names the allow-list characters.** |

**Analysis:**
The comment claims that *"every one of them is named in the printed disclosure"*. This is unsupported by the code: `what_this_does_not_say()` omits the sentence-start allow-list entirely. Additionally, the comment's "complete allow-list" omits list markers (`\d{1,9}[.)]`, `[-*+]`) opening a cell, which [`midSentence()`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L202) explicitly accepts.

---

### Finding 5: Stale "795 marks" Persists in Code Comments
- **Grade:** **LOW**
- **Type:** Description finding (Stale unit in [`tools/check-emphasis.ts`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts))

| Prose in [`E-258`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b) & [`REVIEW-044d`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b) | Comment in [`tools/check-emphasis.ts:189-191`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L189-L191) |
|---|---|
| `⚠ This said "795 marks" and both halves were wrong — the unit is runs, not marks, since the gate counts a ⚠⚠ as two and the same tree holds 957 mark characters... Corrected by REVIEW-044 (E-259).` | `* Removed after measuring the cost: across 795 marks in the register the two account for 5 — ; four times and : once, against 597 full stops — so the register never depended on them.` |

**Analysis:**
While `E-258` corrected its own prose to `"795 contiguous ⚠ runs"` and noted that `"795 marks"` was both stale and the wrong unit, the comment in [`tools/check-emphasis.ts:190`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L190) was left unedited.

---

### Finding 6: Self-Test Verification Defect in `break-emphasis-gate.sh`
- **Grade:** **MEDIUM**
- **Type:** **Code finding** (Masked verification logic)

| Claim in [`REVIEW-044d`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b) & [`E-260`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b) | Implementation in [`tools/break-emphasis-gate.sh:114-129`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L114-L129) |
|---|---|
| `PASS: the harness rejected all three broken probes and accepted the correct one.` | ```bash
probe "STALE NEEDLE..." ...
probe "WRONG NEEDLE..." ...
probe "CRASH AFTER A VERDICT..." ...
broken=$FAILED; FAILED=0
probe "CORRECT..." ...
if [ "$broken" = "1" ] && [ "$FAILED" = "0" ]; then
  echo "PASS: the harness rejected all three broken probes..."
``` |

**Analysis:**
`FAILED` is set to `1` whenever any probe fails. If the first broken probe fails (`FAILED=1`), but the second or third broken probe passes (a false-pass), `FAILED` remains `1`. Thus, `broken=$FAILED` evaluates to `1` as long as *at least one* probe failed, rather than verifying that *all three* were rejected. The harness reports `"rejected all three broken probes"` even in the presence of false passes on probes 2 or 3.

---

## Part 2: Verified Accurate Claims

The following claims were checked against the code and confirmed **TRUE**:

1. **59 Controls Count ([`E-259`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b)):**
   [`tools/check-emphasis.ts`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts) executes 13 cmark-differential assertions in `cmarkDifferential()` plus 46 individual unit `control()` calls, totaling exactly **59 controls**.

2. **13 Differential Shapes ([`REVIEW-044d:10`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b), [`E-259`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b)):**
   The `shapes` array in `cmarkDifferential()` ([`tools/check-emphasis.ts:117-131`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/check-emphasis.ts#L117-L131)) contains exactly **13 test shape tuples**.

3. **18 Main Probes Count ([`E-258`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b)):**
   [`tools/break-emphasis-gate.sh`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh) contains exactly **18 probes** in its main suite:
   - 5 governed rows ([`lines 118-122`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L118-L122))
   - 1 grandfathered row ([`line 125`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L125))
   - 3 rule 6 & exemption tests ([`lines 128-130`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L128-L130))
   - 2 cutoff fail-closed tests ([`lines 133-134`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L133-L134))
   - 4 detector controls ([`lines 137-140`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L137-L140))
   - 3 crash classification tests ([`lines 143-145`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L143-L145))

4. **Needle Scoped to `FAIL` Lines ([`E-260`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b)):**
   [`tools/break-emphasis-gate.sh:104`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L104) uses `grep '^FAIL' "$TMP/run.log" | grep -qF "$needle"`, preventing passing control output from satisfying failure needle checks.

5. **Tree Hashing to Detect No-op Mutations ([`E-259`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b)):**
   [`tools/break-emphasis-gate.sh:70-79`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L70-L79) computes SHA sums of target files before and after applying Python mutations, halting if no change occurred.

6. **Vacuity Probe Cohort Coverage ([`REVIEW-044d:B5.2`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b)):**
   [`tools/break-emphasis-gate.sh:133`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L133) replaces all cutoffs `{ P: 9999, E: 9999, B: 9999, F: 9999, R: 9999 }` rather than only `E`.

7. **Last-Line Verdict Extraction ([`REVIEW-044d:3`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b), [`E-259`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b)):**
   [`tools/break-emphasis-gate.sh:83-88`](file://$HOME/.gemini/antigravity-cli/brain/5652398b-7a51-4515-8ea0-d809b18ee80b/tools/break-emphasis-gate.sh#L83-L88) extracts `tail -1` and verifies both the string structure and exit code consistency.
