# REVIEW-035 — Codex adversarial leg: the FIXES

- **Date:** 2026-09-02
- **Subject:** the fixes on `review/readme-rewrite`, at frozen `ef3b6f9` — NOT the original
- **Access:** full repository, read-only. Adversarial framing.
- ⚠ **Directed at one defect class**: a fix that reaches the edited instance and not the PHRASE (E-168), because the previous pass found exactly that.

---

# Adversarial review report

I found **14 defects: 1 P1, 7 P2, 6 P3**. The dominant failure is exactly E-168’s recorded mode: the edited instance is corrected while equivalent wording survives elsewhere.

## Findings

### 1. P1 — The repaired privacy headline still falsely says that amounts, as a class, are hidden

**Quoted sentence — [`README.md:24`]($REPO/README.md:24):**

> “The answer: it hides amounts, and it hides nothing else.”

The same claim remains holder-facing at [`signer/src/onboarding.rs:238`]($REPO/signer/src/onboarding.rs:238):

> “It hides AMOUNTS. It hides nothing else.”

It is pinned by a test at [`signer/tests/onboarding.rs:300`]($REPO/signer/tests/onboarding.rs:300), and survives in the demo and walkthrough copies.

**Settled by [`README.md:44`]($REPO/README.md:44) and [`README.md:82`]($REPO/README.md:82):**

> “Convert and ConvertBack publish their amounts in plaintext; only Send hides one.”

> “Only the Send conceals its amount.”

**Why wrong:** E-222’s fix added the canonical-zero exception but missed the transaction-type exception. A fresh reader is still told, in the document’s opening answer and during holder onboarding, that amounts are hidden generally. They are not: every conversion into or out of confidential form publishes its amount.

**Corrected sentence:**

> “Confidential MPT hides `Send` amounts and noncanonical balance values from public observers; `Convert` and `ConvertBack` publish their amounts, canonical zero is recognisable, identities, timing and frequency are public, and the issuer can decrypt every balance.”

---

### 2. P2 — The Devnet fix contains both the unsupported claim and its replacement

**Quoted sentences — [`CLAUDE.md:7`]($REPO/CLAUDE.md:7):**

> “`CLAIMS.md` E-26: ‘There is no dedicated Confidential Devnet’”

and, four clauses later:

> “Say ‘not needed and not used’, not ‘does not exist’ … whether such a network still exists somewhere was never searched.”

The unsupported wording remains in [`CLAIMS.md:64`]($REPO/CLAIMS.md:64) and twice in [`docs/task-zero/TASK-ZERO-2026-08-13.md:20`]($REPO/docs/task-zero/TASK-ZERO-2026-08-13.md:20).

**Settled by [`docs/task-zero/amendments-2026-08-16.md:63`]($REPO/docs/task-zero/amendments-2026-08-16.md:63):**

> “No dedicated network is needed and none was searched for.”

**Why wrong:** the source explicitly says the existence search was not performed. E-26’s evidence cell therefore does not support its sentence, and the fix now carries the retracted overclaim and its correction in the same paragraph—the precise failure class motivating this review.

**Corrected sentence:**

> “No dedicated Confidential Devnet is needed or used by this project; whether one exists elsewhere was not searched. All project execution used standard Devnet.”

---

### 3. P2 — The Pair/Prepare scope correction still did not reach `CLAUDE.md`

**Quoted sentence — [`CLAUDE.md:173`]($REPO/CLAUDE.md:173):**

> “`Pair` and `Prepare` are the requests that carry authority and neither is constructible from anywhere under `web/` — asserted by `tools/check-web-readonly.ts`”

**Settled by [`tools/check-web-readonly.ts:469`]($REPO/tools/check-web-readonly.ts:469) and [`tools/check-web-readonly.ts:616`]($REPO/tools/check-web-readonly.ts:616):**

> “web/api constructs neither `pair` nor `prepare`”

> “It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs.”

[`web/README.md:13`]($REPO/web/README.md:13) now states the correct narrow scope.

**Why wrong:** `ef3b6f9` fixed `web/README.md`, but the identical whole-`web/` overclaim remains in the session authority. This is the same phrase-level miss twice in succession.

**Corrected sentence:**

> “`tools/check-web-readonly.ts` asserts that `web/api` constructs neither `Pair` nor `Prepare`; `web/app` is separately checked for signer-socket reachability, and the source scan does not prove runtime behaviour.”

---

### 4. P2 — The deletion-block fix contradicts its own “three irreversible ways” introduction and missed holder-facing copies

**Quoted sentence — [`README.md:179`]($REPO/README.md:179):**

> “A holder’s first `ConfidentialMPTConvert` is irreversible in three separate ways”

Yet corrected item 2 at [`README.md:182`]($REPO/README.md:182) admits the deletion block is conditional.

Unqualified copies remain:

- [`signer/src/onboarding.rs:154`]($REPO/signer/src/onboarding.rs:154):  
  > “It permanently blocks deletion of the MPToken object and locks its reserve.”
- [`docs/decisions/ADR-0001-key-custody-and-proof-location.md:297`]($REPO/docs/decisions/ADR-0001-key-custody-and-proof-location.md:297):  
  > “a transaction irreversible in three ways at once”
- [`UPSTREAM-FEEDBACK.md:132`]($REPO/UPSTREAM-FEEDBACK.md:132):  
  > “permanently blocks deletion … and locks its reserve even at zero balance”

**Settled by [`CLAIMS.md:383`]($REPO/CLAIMS.md:383):**

> “With issuance-wide confidential outstanding at 0, the holding is deletable with confidential fields present.”

> “The reserve is NOT permanently locked.”

**Why wrong:** the corrected bullet invalidates the unchanged introduction, while onboarding and ADR copies still present the specification’s overstatement as implementation behaviour.

**Corrected sentence:**

> “Before the first Convert: the registered key cannot be changed and the converted amount is permanently public; deletion is blocked while issuance-wide confidential outstanding is non-zero, but rippled permits unauthorisation and deletion once that total reaches zero.”

For [`docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md:126`]($REPO/docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md:126), replace:

> “Two enforcement paths that disagree.”

with:

> “Two intentionally different policies, both pinned by upstream tests; the defect is the specification’s unconditional wording.”

---

### 5. P2 — The auditor-permanence retraction did not reach ADR-0001

**Quoted sentence — [`docs/decisions/ADR-0001-key-custody-and-proof-location.md:179`]($REPO/docs/decisions/ADR-0001-key-custody-and-proof-location.md:179):**

> “Naming an auditor is permanent; there is no way to revoke it.”

**Settled by [`README.md:155`]($REPO/README.md:155):**

> “Whether naming an auditor can later be undone is a named gap: this project has not searched for the answer.”

And by P-12 at [`CLAIMS.md:30`]($REPO/CLAIMS.md:30), which prohibits corpus-wide negatives without the search.

**Why wrong:** E-222 records this exact sentence as unsupported and corrected, but it still stands in the accepted custody ADR.

**Corrected sentence:**

> “The auditor can decrypt balances if one is named. Whether the auditor designation can later be removed is unsearched; the registered auditor encryption key itself cannot be rotated.”

---

### 6. P2 — The latest Clawback-table fix missed README’s equivalent proof glossary

**Quoted sentence — [`README.md:45`]($REPO/README.md:45):**

> “The composition differs per transaction type. `Send`: … `ConvertBack`: … `Convert`: … `MergeInbox`: no proof.”

**Settled by [`docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md:39`]($REPO/docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md:39) and [`docs/task-zero/TASK-ZERO-2026-08-13.md:97`]($REPO/docs/task-zero/TASK-ZERO-2026-08-13.md:97):**

> “`ConfidentialMPTClawback` | 64-byte compact sigma”

**Why wrong:** `ef3b6f9` fixed the protocol table’s four-of-five omission, but the README glossary still presents an apparently exhaustive transaction-by-transaction breakdown containing the same four-of-five list.

**Corrected sentence:**

> “`Clawback`: a 64-byte issuer-side compact sigma proof.”

---

### 7. P2 — The newest GETTING-STARTED citation fix reintroduces an already-upheld E-159 miscitation

**Quoted sentence — [`GETTING-STARTED-CLAUDE-CODE.md:28`]($REPO/GETTING-STARTED-CLAUDE-CODE.md:28):**

> “the same defect has now been recorded three times … a status sentence at the top of the document … true when written and never re-checked (`CLAIMS.md` E-159, E-204, E-222)”

**Settled by [`CLAIMS.md:218`]($REPO/CLAIMS.md:218):**

> “An onboarding disclosure asserted a key source the holder had not chosen yet — and the obligation to test it had been discharged eight days before it was written down as undone.”

E-159 is neither a top-of-document status sentence nor something true when written. [`docs/reviews/REVIEW-034c-adjudication-readme-2026-09-02.md:76`]($REPO/docs/reviews/REVIEW-034c-adjudication-readme-2026-09-02.md:76) had already upheld:

> “E-159 cited for a claim it is not about.”

**Why wrong:** the latest Gemini adjudication repaired the citation count by prescribing E-222, but failed to check whether E-159 matched the defined defect. Its proposed fix reintroduced an issue the previous adjudication explicitly upheld.

**Corrected sentence:**

> “This is the second recorded case of a high-visibility status sentence that was true when written and later went stale (E-204, E-222). E-159 is a separate stale-source failure and was already false when written.”

---

### 8. P2 — The new “two points do not prove drift” caveat did not reach E-29 or TASK ZERO

**Quoted sentences:**

- [`CLAIMS.md:67`]($REPO/CLAIMS.md:67):  
  > “Proof formats have not drifted between the pinned version and current HEAD.”
- [`docs/task-zero/TASK-ZERO-2026-08-13.md:322`]($REPO/docs/task-zero/TASK-ZERO-2026-08-13.md:322):  
  > “proof formats have not drifted”

**Settled by [`docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md:26`]($REPO/docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md:26):**

> “Two points are not a proof of no drift in between.”

**Why wrong:** the evidence establishes equality of seven size constants at two endpoints. It does not establish absence of intermediate drift, nor complete proof-format equality beyond those constants. The new caveat retracts the claim only in the explainer.

**Corrected sentence:**

> “All seven proof-size constants are identical at `0.4.0-rc4` and `1.0.4`; intermediate revisions and other format details were not checked.”

---

### 9. P3 — The five-part web-gate correction did not reach the gate’s source documentation or Makefile

**Quoted sentences:**

- [`tools/check-web-readonly.ts:7`]($REPO/tools/check-web-readonly.ts:7):  
  > “It asserts four things”
- [`Makefile:192`]($REPO/Makefile:192):  
  > “Four parts”

**Settled by [`web/README.md:21`]($REPO/web/README.md:21):**

> “Five parts”

The implementation has Part 4 at [`tools/check-web-readonly.ts:527`]($REPO/tools/check-web-readonly.ts:527) and Part 5 at [`tools/check-web-readonly.ts:566`]($REPO/tools/check-web-readonly.ts:566).

**Why wrong:** the source header and Makefile retain the pre-oracle four-part description and omit the later “holds no secret, decrypts nothing and spawns nothing” property.

**Corrected sentence:**

> “Five parts: application socket reachability; API request construction; route signing reachability; secret/decryption/spawn exclusion; and exactly one socket client.”

---

### 10. P3 — E-222 records the “four gates” miscount, but the phrase still survives in four places

**Quoted sentence — [`docs/architecture/ARCHITECTURE-2026-08-18.md:246`]($REPO/docs/architecture/ARCHITECTURE-2026-08-18.md:246):**

> “wired into the `Makefile` beside the other six”

and:

> “Four gates in this repository were built to catch false passes and false-passed (E-165, E-168, E-182, E-198, E-203)”

The same “Four gates” phrase survives in both gate source comments and the web-tier philosophy document. [`tools/check-filing.ts:21`]($REPO/tools/check-filing.ts:21) says “Four” over six cited rows.

**Settled by [`CLAIMS.md:296`]($REPO/CLAIMS.md:296):**

> “‘four gates’ over five citations (inherited verbatim from `ARCHITECTURE-2026-08-18.md`)”

**Why wrong:** the branch records the defect but fixes only `web/README.md`’s “other six” instance. The named source and its copies remain unchanged.

**Corrected sentence:**

> “This repository has repeatedly shipped gates that false-passed (E-165, E-168, E-182, E-198, E-203); this gate is therefore verified by breaking it in both directions.”

And:

> “wired into the Makefile alongside the repository’s other gates”

---

### 11. P3 — E-222’s corrected citation command does not return its stated number

**Quoted sentence — [`CLAIMS.md:296`]($REPO/CLAIMS.md:296):**

> “corrected by `grep -oE '[EFPB]-[0-9]+' README.md | sort -u | wc -l` (46 checked … at `b197315` … `REVIEW-034`’s fixes took it to 52)”

**Settled by the filename at [`README.md:143`]($REPO/README.md:143):**

> “`ARCHITECTURE-2026-08-18.md`”

The prescribed grep treats `E-2026` inside that filename as a claim ID. Measured at the pinned commits:

- `b197315`: stated command **47**, boundary-aware real IDs **46**
- `72576f7`: stated command **52**, boundary-aware real IDs **51**

**Why wrong:** the first stated number is accidentally right only after silently excluding the command’s false match; the post-fix count is wrong by one. This is another hand-restated count inside the row about hand-restated counts.

**Corrected sentence:**

> “A boundary-aware ID scan reports 46 real IDs at `b197315` and 51 after `72576f7`; the simpler grep also matches the phantom `E-2026` inside an architecture filename.”

---

### 12. P3 — README still says “thirteenth” after E-222/E-223 call it the fourteenth

**Quoted sentence — [`README.md:84`]($REPO/README.md:84):**

> “the register’s own instance counter has reached thirteenth”

**Settled by [`CLAIMS.md:296`]($REPO/CLAIMS.md:296) and [`CLAIMS.md:298`]($REPO/CLAIMS.md:298):**

> “The FOURTEENTH instance”

> “fourteenth instance”

**Why wrong:** the branch updated the register’s count while leaving the README sentence unchanged.

**Corrected sentence:**

> “the register’s own instance counter has reached fourteenth”

Preferably remove the restated count entirely.

---

### 13. P3 — “Original document follows, unaltered” is contradicted two lines later

**Quoted sentence — [`GETTING-STARTED-CLAUDE-CODE.md:32`]($REPO/GETTING-STARTED-CLAUDE-CODE.md:32):**

> “The original document follows, unaltered below this line.”

**Settled by [`GETTING-STARTED-CLAUDE-CODE.md:34`]($REPO/GETTING-STARTED-CLAUDE-CODE.md:34):**

> “~~Application logic cannot start …~~ (Struck 2026-09-01 — see the header above.)”

**Why wrong:** the original text was altered in place by striking and annotating it.

**Corrected sentence:**

> “The original document follows below; its stale application-logic sentence is struck in place and annotated.”

---

### 14. P3 — README says two research findings correct earlier project readings; the explainer names three

**Quoted sentence — [`README.md:189`]($REPO/README.md:189):**

> “Two of them correct a reading this project published first”

**Settled by:**

- [`PROTOCOL-FINDINGS-2026-09-02.md:31`]($REPO/docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md:31):  
  > “this project made it in its own README”
- [`PROTOCOL-FINDINGS-2026-09-02.md:88`]($REPO/docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md:88):  
  > “correcting this project’s own earlier reading”
- [`PROTOCOL-FINDINGS-2026-09-02.md:100`]($REPO/docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md:100):  
  > “this project’s first write-up said stranded, which was false”

**Why wrong:** composition, the one-million search-window reading, and the “stranded” vault reading are three explicitly identified corrections.

**Corrected sentence:**

> “Three of them correct readings this project published first; two are filed upstream.”

## Checked and found sound

- Read all prior Gemini/Codex/self review legs and adjudications, plus E-222 and E-223, before assessing new findings.
- Compared every changed subject-document line across `main...HEAD`, then searched repository-wide for deleted wording and near variants of its replacements.
- The latest `vendor-verify` paragraph at [`README.md:212`]($REPO/README.md:212) is now correctly scoped: allowlisted tracked paths, invisible untracked files, and conditional tag comparison are all disclosed.
- The edited `web/README.md` Pair/Prepare sentence is correct at its own site.
- The repaired Clawback row in the protocol table correctly distinguishes the 64-byte issuer-side sigma proof from Convert’s 64-byte Schnorr proof.
- The canonical-zero correction at [`README.md:43`]($REPO/README.md:43) and [`README.md:167`]($REPO/README.md:167) correctly distinguishes canonical initial/reset zero from homomorphic spent-down zero.
- The clawback-flag disclosure and holder-custody qualification at [`README.md:157`]($REPO/README.md:157) and [`README.md:161`]($REPO/README.md:161) agree with the recorded source evidence.
- The 2026-09-01 amendment timestamp and the three required enabled amendments agree with [`docs/task-zero/amendments-2026-09-01.json:2`]($REPO/docs/task-zero/amendments-2026-09-01.json:2) and its Devnet rows.
- The previous rejections concerning `sfDomainID`, `underB15Conditions`, `fail_hard`, the `~3 min` operator note, and invented configuration paths remain correctly rejected.
- Every local Markdown target in the five subject documents exists; no conflict markers were present.
- The worktree remained unmodified and clean throughout the review.
