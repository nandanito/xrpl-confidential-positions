# REVIEW-040b — the evidence audit (Codex, read-only repo)

- **Rotation:** `REVIEW-040` — round one on `tools/claims-render-continuity`
- **Date:** 2026-09-06
- **Subject:** the branch at `cb72368`
- **Access:** READ-ONLY repository, instructed to read the FROZEN commit via `git show cb72368:<path>`.
- **Packet:** `docs/reviews/REVIEW-040-packets/packet-b-evidence.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-040d`.**

---

Audit result: the continuity repair is real and most E‑244 measurements hold. However, three of the eight new grades use the wrong evidence kind, E‑245’s central anti-split measurement cannot be reproduced from the shipped classifier and is contradicted by it, and each new gate has a false-pass mutation.

I executed the frozen TypeScript sources in memory with reads bound to `git show cb72368…:<path>`; no repository files were created or modified.

## 1. E‑169…E‑176 grades

The vocabulary is evidentiary modality: `A, executed` means behavior or a mutation was actually exercised; `A, measured` means a count/observation; `A, source`/`A, read` means source inspection; `A, reasoned` means inference. E‑162 itself distinguishes “read at source” from “observed on Devnet” and “read … NOT executed.” (`CLAIMS.md@cb72368:222`; examples at `:165-168`, `:223`, `:304`, `:366-378`.)

| Row | Verdict | Severity | Why, from its own Evidence cell | What would falsify this audit verdict |
|---|---|---:|---|---|
| E‑169 | **WRONG KIND** | MEDIUM | “**Reconciled to the receipt**” is a source comparison, and “**nothing gates that today**” expressly admits that prose/receipt continuity was not executed as a protected property; `A, source` or `A, measured` fits better than `A, executed`. (`CLAIMS.md@cb72368:229`) | A committed run showing a prose/receipt synchronization guard failing under the original mismatch and passing after the fix. |
| E‑170 | **SUPPORTED** | LOW | “**All four rejected, with reasons, in `REVIEW-026c` §3**” directly identifies the source adjudication, which indeed rejects the omitted-`restore()` claim and the three other claims. (`CLAIMS.md@cb72368:230`; `docs/reviews/REVIEW-026c-adjudication-b16-fixes-2026-08-27.md@cb72368:70-100`) | The cited adjudication not rejecting all four, or the frozen source actually lacking `restore()` at the loop head. |
| E‑171 | **SUPPORTED** | LOW | The evidence says Part 1 “**probes the feature in a scratch crate at four feature sets**” and “**reported `STILL BUILDS FALSE` on its first run**”; that is executed evidence. (`CLAIMS.md@cb72368:231`) | Re-running the probe without producing the stated feature-resolution/build outcomes. |
| E‑172 | **WRONG KIND** | MEDIUM | “**The post-round-two sweep found three more live assertions**” supports a measured/source sweep, not an executed behavioral result; the evidence never reports a final mutation or runtime execution for this row. (`CLAIMS.md@cb72368:232`) | A recorded break-test of the final correction/gate showing the false premise is caught across the claimed scope. |
| E‑173 | **SUPPORTED** | LOW | “**Re-verified by really inlining it and watching part 3 fire while parts 1–2 and 267 tests did not**” is exactly an executed negative control. (`CLAIMS.md@cb72368:233`) | That inlining mutation causing the old tests/parts to fail, or the new Part 3 not firing. |
| E‑174 | **WRONG KIND** | MEDIUM | Its Evidence cell says only “**Rejected, with the evidence recorded**”; the `cargo build -vv` execution appears in the Claim cell, not the Evidence cell, so under the requested evidence-cell discipline this supports `A, source`, not `A, executed`. (`CLAIMS.md@cb72368:234`) | Putting the compiler transcript or a reproducible command/result directly in the Evidence cell. |
| E‑175 | **SUPPORTED** | LOW | The evidence describes a real detector and says both mutated call sites were “**each … verified to fire**”; that earns `executed`. (`CLAIMS.md@cb72368:235`) | Either injected assertion or call-site mutation passing Part 4/Part 3. |
| E‑176 | **SUPPORTED** | LOW | It cites a dated receipt and says the refusal was “**VERIFIED BY BREAKING IT IN BOTH DIRECTIONS**”; the receipt confirms `tesSUCCESS`, the hash, validation and hedged bytes. (`CLAIMS.md@cb72368:236`; `docs/runs/b21-zeroized-default-path-devnet-2026-08-27.json@cb72368:2-26`) | The receipt disagreeing with the row, or either overwrite-control arm not behaving as stated. |

So E‑162 supports the repair method, but not all eight outcomes: it supports five assignments and argues against treating E‑169, E‑172 and E‑174 as executed. No grade appears too weak.

## 2. E‑244 and E‑245 measurements

### E‑244

- **REPRODUCED — LOW/no defect:** the unfixed blob has exactly two stray runs: E‑149…E‑243, 95 rows, and F‑29, one row. An independent GFM parser also gives eight tables containing 224 body rows; the lexical detector gives 96 outside. (`CLAIMS.md@87fbb3b:201-206,300,384`; `tools/check-table-integrity.ts@cb72368:272-305`)

- **REPRODUCED — LOW/no defect:** the old gate prints 374 because it counts every non-separator pipe line, including headers; only 261 body rows were actually shape-checked across its two targets: 224 in `CLAIMS.md` and 37 in `UPSTREAM-FEEDBACK.md`. (`tools/check-table-integrity.ts@87fbb3b:211-229`; `CLAIMS.md@cb72368:304`)

- **REPRODUCED with a dating correction — MEDIUM:** eight rows were three-cell rows in the final broken blob (`CLAIMS.md@87fbb3b:226-233`), but only E‑169 and E‑170 existed at `432dad4` (`CLAIMS.md@432dad4:228-229`). E‑171, E‑172…174, E‑175 and E‑176 entered in four later commits that day (`CLAIMS.md@d8eb7a3:230`; `@d535589:231-233`; `@af1cc3e:234`; `@cd7637b:235`).  
  **Falsifier:** showing those six rows in `432dad4:CLAIMS.md`.

- **REPRODUCED — LOW/no defect:** `8f5b8bd` introduced the surviving prose break, and the interval to the repair is about 11 days; E‑243’s commit deleted exactly 24 blank lines. (`CLAIMS.md@8f5b8bd:197-205`; `CLAIMS.md@cb72368:303-304`)  
  **Falsifier:** a prior commit already containing that specific E‑148 prose break, or a diff count other than 24.

- **NOT REPRODUCIBLE FROM A COMMIT — MEDIUM:** “after the repair … 320 rows inside 9 tables” describes an uncommitted intermediate. The broken tree has 224+96=320; the stored repair commit has 321 because it also adds E‑244, and the frozen tree has 322 after E‑245. (`CLAIMS.md@cb72368:304`)  
  **Falsifier:** an immutable tree/blob for the claimed post-repair, pre-registration state.

- **REPRODUCED — LOW/no defect:** the final table gate has nine continuity controls, incremented by the helper. (`tools/check-table-integrity.ts@cb72368:208-256`)

### E‑245

- **REPRODUCED — LOW/no defect:** before counting E‑245 itself there are 245 Established rows. (`CLAIMS.md@cb72368:39-305`)

- **NOT REPRODUCIBLE AND CONTRADICTED BY THE SHIPPED CLASSIFIER — HIGH:** the alleged nine-topic instrument yielding 49 singleton rows and 93 rows in four-or-more topics is absent. The committed classifier has 12 topics; applying its exact rules to the same 245 pre‑E‑245 rows yields **121 in exactly one topic (49.4%) and only 4 in four topics**. (`tools/build-claims-topics.ts@cb72368:63-100,168-195`; generated topic inventory at `docs/claims/by-topic/README.md@cb72368:15-28`; assertion at `CLAIMS.md@cb72368:305`)  
  **Falsifier:** the exact nine-topic patterns/overrides and input snapshot reproducing 49 and 93.

- **REPRODUCED — LOW/no defect:** applying the shipped 12 rules to whole rows gives 197/245, or 80.4%, in four-or-more topics. (`tools/build-claims-topics.ts@cb72368:35-38,63-100`)  
  **Falsifier:** the same rules over the same rows producing a different distribution.

- **REPRODUCED with rounding caveat — LOW:** there are exactly **476 distinct per-row cross-reference edges** after removing self-references and deduplicating repeated targets within each row; 156/245 rows cite another row, which is **63.67%**, conventionally rounded to 64%, not 63%. (`CLAIMS.md@cb72368:41-304`; assertion at `:305`)  
  **Falsifier:** a documented alternative counting rule that simultaneously reproduces 476 and exactly 63%.

- **WRONG IN THE FROZEN TREE — MEDIUM:** E‑245 says the generated views contain **317 rows**, but the generated README and the gate both report **318**. Twelve topic files plus one README is correct. (`CLAIMS.md@cb72368:305`; `docs/claims/by-topic/README.md@cb72368:3-11`; `tools/build-claims-topics.ts@cb72368:303-325`)  
  **Falsifier:** any frozen generated file set at this commit containing 317 parsed rows.

- **PARTLY REPRODUCED — MEDIUM:** the final list has exactly 26 override entries, but “eleven of the first thirty-seven” and the E‑87/E‑90 commenting incident exist only as retrospective prose; no 37-entry tree or mutation transcript is committed, so those numbers are unfalsifiable from the tree. (`tools/build-claims-topics.ts@cb72368:102-152,274-280`; `CLAIMS.md@cb72368:305`)  
  **Falsifier:** preservation of the original 37-entry list plus detector output identifying exactly 11 redundancies and the intermediate commented-out state.

## 3. Gate falsifiability

| Mutation | Result | Severity | Citation and falsifier |
|---|---|---:|---|
| Put a row after prose | **Caught**, exit 1: one row outside a table. | LOW/no defect | This is directly pinned by the control. (`tools/check-table-integrity.ts@cb72368:223-226`) Falsified if the same mutation exits zero. |
| Put a row after `---` | **Caught**, exit 1: one row outside a table. | LOW/no defect | Thematic-break control is present. (`tools/check-table-integrity.ts@cb72368:227-228`) Falsified if it exits zero. |
| Add a fifth header cell while leaving the separator and body at four | **Missed**, exit 0; an independent GFM parser renders the fragment as prose, not a table. | **HIGH** | `scan()` derives width only from the separator, while `strayRows()` opens a table merely because a header precedes a separator; neither compares their widths. (`tools/check-table-integrity.ts@cb72368:123-136,334-340`) Falsified when this mutation exits nonzero through a header/separator-width check. |
| Add canonical `\| E-9999 \| Zyzzyva quux \| evidence \| A \|` | **Caught**, exit 1: “matches no topic.” | LOW/no defect | Completeness rejects parsed rows with zero topics. (`tools/build-claims-topics.ts@cb72368:178-195,291-296`) Falsified if it exits zero. |
| Add the equally valid Markdown row `\|E-9999\| Zyzzyva quux \| evidence \| A \|` | **Missed**, exit 0; `check-tables` also passes it. | **HIGH** | The topic parser requires a literal space after the opening pipe, so the row is never parsed and byte comparison sees no change. (`tools/build-claims-topics.ts@cb72368:54-55,178-195,307-325`; table row predicate at `tools/check-table-integrity.ts@cb72368:110-112`) Falsified by raw claim-row accounting or a whitespace-tolerant ID parser that makes this mutation fail. |
| Existing partially redundant E‑111 override | **Missed** on the clean tree. | MEDIUM | `E-111` manually adds `decisions-and-scope` even though its “ADR/Decision” headline already matches that rule; the detector fails only when **every** topic in an override array is redundant. (`CLAIMS.md@cb72368:162`; `tools/build-claims-topics.ts@cb72368:94-96,126,282-288`) Falsified if `byRules(E‑111)` does not contain `decisions-and-scope`, or a per-topic redundancy check passes cleanly. |

Both gates are therefore genuinely falsifiable, but neither currently establishes its headline property without qualification.

## 4. The decision not to split

**HIGH finding:** the decision is a defensible cheap implementation, but its stated “measured reason” is a rationalisation unless the discarded nine-topic instrument is recovered. The shipped taxonomy produces almost the reverse headline—about half the Established rows are single-topic and only four are four-topic—yet the decision text says the 49/93 result is why a physical split was rejected. (`docs/NEXT-SESSION-PROMPT.md@cb72368:53-68`; `tools/build-claims-topics.ts@cb72368:63-100`)

The strongest case for a real split is:

- The decision presents a false dichotomy: canonical rows can live in one primary topic while generated secondary indexes expose them under every tag; physical splitting need not “hide” multi-topic rows. (`docs/NEXT-SESSION-PROMPT.md@cb72368:58-61`; `docs/claims/by-topic/protocol-and-crypto.md@cb72368:8-10`)

- The shipped data now favors splitting: 121/245 rows are single-topic, and only 4/245 have four topics under the taxonomy readers actually receive. (`tools/build-claims-topics.ts@cb72368:63-100`; topic files enumerated at `docs/claims/by-topic/README.md@cb72368:15-28`)

- The 476 references argue for stable ID resolution and generated backlinks, not necessarily physical colocation; the present generated links are line-number based and already require regeneration. (`tools/build-claims-topics.ts@cb72368:217-218`; `CLAIMS.md@cb72368:305`)

- Chronology can likewise be a generated view ordered by numeric ID or explicit date, just as topic views are generated now; physical order is not the only way to preserve it. The current design already treats generated views as legitimate navigation artifacts. (`tools/build-claims-topics.ts@cb72368:229-256`)

- The project’s own size comparison—one roughly 435 KB authority versus topic files no larger than roughly 24 KB—supports smaller canonical review units, narrower diffs and fewer giant-table continuity failures. (`docs/NEXT-SESSION-PROMPT.md@cb72368:70-77`)

What would falsify this conclusion is preservation and reproduction of the nine-topic measurement, together with an explicit requirement that chronology—not topic discoverability—must remain the canonical storage form. Without that, the generated-view choice may still be sensible, but the numerical argument offered for it is not auditable.
