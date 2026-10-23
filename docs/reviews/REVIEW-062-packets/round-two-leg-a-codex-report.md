 succeeded in 0ms:
# REVIEW-062 round two, leg A report

## Step 0

- `pwd`: `$USER_TMP/T/r062r2a.CDzmJB/repo`.
- `git log --oneline`:
  - `5273019 after: round one's fixes, R-9, and the blog's AI sentence removed`
  - `385b952 before: round one's subject (41098e8)`
- Subject: `git diff HEAD~1 HEAD`.
- Required GitHub API request: **200**. Network was available; individual checks and omissions are distinguished below.
- No commits, pushes, deployments, or project-source edits. Scratch work used the permitted `$TMPDIR`. Final `git status --short` was empty.

## 1. Run the upheld findings' own examples

The original reports, not just their adjudication, were checked: `docs/reviews/REVIEW-062-packets/leg-a-codex-output.md:25–32` and `leg-b-gemini-output.md:33–91,103–109`.

| Finding | Original quotation/example | Fixed text and check | Verdict |
|---|---|---|---|
| A-1 | “each a sentence this project published and later found false”; specifically R-4 and R-5 | “Most withdraw or narrow something this project claimed; one records a retraction that was itself reversed” (`docs/posts/BLOG-2026-10-22-draft.md:250–252`). Re-read R-4's accurate description of pre-fix behaviour and R-5's reversed retraction (`CLAIMS.md:512,514`): neither is now described as necessarily a published falsehood. The new count error is separate, R2-A2. | **discharged** for the original characterization defect |
| A-2, upheld part | LinkedIn gave five outcomes, leaving six unstated | “The rest are open, waiting, or closed without comment. The write-up describes each one, and names the three outside reviews of upstream's code” (`docs/posts/LINKEDIN-2026-10-22-draft.md:22`). The blog accounts for all eleven (`BLOG:267–291`), matching the survey's eleven rows (`docs/evidence/upstream-survey-2026-10-22/README.md:43–53`). The pointer supplies the detail; the adjudication did not require LinkedIn itself to name all three reviews. | **discharged** as draft content; the blog URL remains an explicit publication placeholder |
| A-3 | The survey link returns 404 on public `main` | The reference remains (`BLOG:351`); the fix is the publication condition in `docs/reviews/REVIEW-062c-adjudication-2026-10-22.md:85–86` and `docs/NEXT-SESSION-PROMPT.md:9,57`. Repeated the exact Contents API request against public `main`: **404**. A promise to publish is not an existing source. | **not**; a correctly recorded but still open publication condition |
| B-1 | “Three reviews of this code exist” sounded like audits of this project | “Upstream's code has had three outside reviews. None of them reviewed this project, which has had no outside audit” (`BLOG:65–72`). Read with the opening status line: the antecedent is now upstream, and the project is explicitly excluded. Compared the qualifications with `CLAIMS.md:431–432,441` (B-30, B-31, B-13). | **discharged** |
| B-2, upheld part | “adversarial review” sounded like third-party security review rather than the recorded model-driven process | “the project's own review rounds, not outside audits” followed by “reviewers” and their “agreement” (`BLOG:206–209`), plus “four reviewers independently” (`:216`). This rules out outside audits but does not rule out human security reviewers. The introductory explanation was removed, so the adjudicated “as described above” protection no longer exists. See R2-A1. | **partly** |
| B-3 | “shape of the book” meant counterparties, timing and frequency to the stranger | Title: “Amounts, not relationships”; body: “it hides how much each supplier draws and owes. It does not hide who borrows, when, how often, or the size of the whole” (`BLOG:1,162–165`). LinkedIn says “It hides how much, not who or when” (`:20`), following its explicit public float and retirement amounts. These no longer claim to hide the graph. | **discharged** in the drafts and edited source files; the served copy remains outstanding, below |
| B-4 | Static demo's “holds no keys” appeared inconsistent with E-230's disclosure boundary | The example now says “local read-only web viewer” and identifies “the viewer that runs on the holder's machine, before the hosted demo existed; the demo serves only static files” (`BLOG:216–221`). Compared E-230 (`CLAIMS.md:290`) with the hosted/static description (`BLOG:316–320`): the two are now distinct. | **discharged** |
| B-5, upheld part | Unexplained MPT, ElGamal, sigma protocol, inbox, clawback, Dedicated Account, `tec`, vaults | Issuer/holder roles, public-key encryption, zero-knowledge proof, clawback setting, ordinary project-named account, and failure-code/sequence explanations are now present (`BLOG:35–61,98–103,145–150,185–190`). “ledger's vaults (XLS-65)” (`:285–287`) identifies the system, although it is still a terse gloss. The inbox's architectural reason remains missing; see R2-A5. | **partly** |
| B-6 | “Read on 2026-10-22” looked like an instruction | “When I checked on 2026-10-22 at 03:25 UTC” (`BLOG:8–11`); “when I checked on 2026-10-22” (`LINKEDIN:8`). Compared the dated reading with E-353 (`CLAIMS.md:413`) and the survey timestamps (`survey:26–30`). | **discharged** |
| B-7 | “an observation filed or graded for upstream says a source does not say something” was hard to parse | “a note meant for upstream says something is missing from a source and does not record the search that found it missing” (`BLOG:245–248`). This can now be read once. Checked `tools/check-negative-claims.ts:9–12,29–36,38–45`: its actual enforcement is lexical over filed/ready/graded/positive rows of `UPSTREAM-FEEDBACK.md`; ungraded Observed rows are advisory, not a guarantee over every note. | **discharged** as the original readability finding; retain the gate's actual scope when describing its guarantee |
| B-8 | The upstream-audits paragraph was under the project's filings | It now appears in XLS-96 background (`BLOG:65–72`), before “What it hides” (`:76`), and the filings section only refers back to it (`:293–294`). | **discharged** |
| B-12 | The reader inferred #8118 was closed *for* fitting neither issue template | “closed without comment the day it was filed, so its reason is not known. It also fit neither…” (`BLOG:288–291`). The explicit unknown reason defeats the original causal inference. Fresh API reads confirmed same-day closure and only an author correction in the comments, not a maintainer explanation. | **discharged** |
| B-13 | LinkedIn made XLS-96 sound proposed, and upstream fixes sound like the author's | “XLS-96 is a final standard” and “Upstream resolved four in September and fixed a fifth…” (`LINKEDIN:8,22`). Checked the upstream spec header (`XLS-0096/README.md:7`) and the recorded outcomes (`survey:43–59`); current API states agree. | **discharged** |
| B-11a | Why does an inbox exist, rather than crediting spending directly? | “Tokens in the inbox cannot be sent until they are merged” (`BLOG:52–53`) explains the consequence, not why the protocol needs the extra balance/transaction. The upstream specification explicitly gives the reason: incoming transfers must not stale spending proofs (XLS-0096 §§8–10, fetched lines 293,388,496). | **partly**, same defect as R2-A5, not a second finding |

B-9, B-10's proposed cuts, and B-11b were rejected; no new obligation to implement those rejected requests was invented.

### Existing publication conditions checked, not mistaken for new regressions

1. **A-3 remains open:** `https://api.github.com/repos/nandanito/xrpl-confidential-positions/contents/docs/evidence/upstream-survey-2026-10-22/README.md?ref=main` returned **404**. Publish the survey before either post; repeat this exact request and require 200 and the intended contents.
2. **R-9 is changed in source, not yet in the served page.** GET `https://xrpl-confidential-positions.vercel.app/how-it-works` returned **200**, containing `<strong>In short, it hides the shape of the book, not its size.</strong>` and not the replacement. Rebuild/redeploy by the owner's existing procedure, then verify the served text and the day-of-post deployment comparison. This review did not deploy anything.
3. `<BLOG-URL>` remains deliberately unresolved (`LINKEDIN:3–4,26`); no claim that it is already a working link is made.

## Findings requiring correction

### R2-A1 — MEDIUM — The review paragraph still permits a human-review reading

**Quoted text:** “the project's own review rounds, not outside audits. Each round gave its reviewers deliberately different packets” (`docs/posts/BLOG-2026-10-22-draft.md:206–209`); “four reviewers independently” (`:216`).

**Evidence:** The original B-2 example was specifically the difference between security reviewers and automated model sessions (`docs/reviews/REVIEW-062-packets/leg-b-gemini-output.md:77–78,108–109`). The recorded participants are model-based legs and the author (`docs/reviews/REVIEW-062c-adjudication-2026-10-22.md:13–15`). Removing the tools sentence is the owner's decision; nevertheless “own” and “not outside audits” do not disclose that the apparent reviewers were not independent human security assessors. Applicable security-claim instruction: [CLAUDE.md:9](CLAUDE.md#L9), with P-5 at `CLAIMS.md:26`.

**Suggested correction/control:** Without naming products or tools, remove the person-like assurance and explicitly disclaim independent human security review; describe internal review/checking passes and their scoped packets. Re-run B-2's reader question on that paragraph alone, without the deleted introduction.

### R2-A2 — HIGH — The fixes themselves make the blog's current counts false

**Quoted text:** “eight correction records, R-1 to R-8” and “The last one, R-8” (`BLOG:250–252`); “it has eight entries” (`:331`); “61 numbered review records” (`:209`).

**Evidence:** Counting actual correction rows gives **9**, R-1 through R-9 (`CLAIMS.md:509–517`). Counting unique numbered prefixes in `docs/reviews/` gives **62**, REVIEW-001 through REVIEW-062; this patch adds REVIEW-062's adjudication and packets. The characterization fix passes A-1's R-4/R-5 examples, but the added register row and review record invalidate the present-tense totals. The repository's current-tree count convention is explicit in [CLAUDE.md:35](CLAUDE.md#L35).

**Suggested correction/control:** Update both correction-count copies, describe R-8 as an example rather than the last correction, and update or date the review count. Check the numbers by extracting row IDs and unique review prefixes, not by counting files or trusting the previous review's count.

### R2-A3 — HIGH — R-9's gate accepts an assertion next to an unrelated strike

**Quoted text:** `markers: ["R-9", "~~", "STRUCK", "RETRACTED"]` (`tools/check-disclosure-phrases.ts:199–201`); R-9 promises refusal “unless it is struck beside this id” (`CLAIMS.md:517`).

**Evidence:** On a copy of the actual README, replacing the summary with `In short, it hides the shape of the book, not its size. (R-9)` fails as intended. Adding a separate nearby `~~An unrelated obsolete note.~~` changes the same gate to **exit 0**, under all 14 passing controls; the slogan is still unstruck. A nearby sentence “This document no longer uses the old page layout” also yields **exit 0**. `scan()` independently finds any token and any matching ID within its six-line window (`tools/check-disclosure-phrases.ts:309–330`), rather than relating the retraction to the assertion. This violates the new entry's specific [R-9 rule](CLAIMS.md#L517), even though all three requested basic probes fail correctly.

**Suggested correction/control:** Require the retraction to apply to the matched occurrence, not unrelated window text. Add both false-pass examples as negative controls through the real detector, alongside a genuine struck R-9 quotation that must pass. The gate framework predates this patch; the new R-9 enforcement claim is not fulfilled by merely adding its marker list.

### R2-A4 — MEDIUM — Retained strike tokens are not always valid rendered strikes

**Quoted text:** “A strike in the register is a strike in its excerpt” (`tools/build-claims-index.ts:125–129`). Actual output: `~~ RULED AND…~~`.

**Evidence:** `summarise("~~⚠ **RULED AND NOT IMPLEMENTED**~~")` returns `~~ RULED AND NOT IMPLEMENTED~~`. GFM does not recognize an opening strike delimiter followed by whitespace. `cmark-gfm -e strikethrough` renders the original with `<del>` and the summary as literal tildes plus unstruck text. This occurs in existing generated content: E-76 at `docs/CLAIMS-INDEX.md:113` from `CLAIMS.md:127`, and B-16 at `docs/claims/by-topic/decisions-and-scope.md:106`, `devnet-execution.md:66`, and `protocol-and-crypto.md:145` from `CLAIMS.md:438`. These are four generated occurrences of the same normalization defect, not four findings.

**Suggested correction/control:** Preserve valid delimiter flanking after removing warning/emphasis markup, then regenerate rather than hand-edit generated files. Add rendered regressions using these actual register cells, including a truncated B-16 excerpt. Counting pairs is insufficient. Ordinary truncation closure itself works; see section 5.

### R2-A5 — MEDIUM — The inbox fix explains the restriction but not its purpose

**Quoted text:** “MergeInbox moves the inbox into the balance the holder can spend. Tokens in the inbox cannot be sent until they are merged” (`BLOG:52–53`).

**Evidence:** The original example asks why incoming funds cannot credit spending directly (`docs/reviews/REVIEW-062-packets/leg-b-gemini-output.md:47–48`), and the adjudication explicitly upholds the inbox's missing purpose (`docs/reviews/REVIEW-062c-adjudication-2026-10-22.md:61`). The fixed sentence is true against F-27 (`CLAIMS.md:481`) but only restates the required operation. The primary specification explains the reason: arrivals do not invalidate proofs prepared against a stable spending balance (XLS-0096 §§8–10, fetched lines 293,388,496). This is the same outstanding part of B-5 and B-11a; [CLAUDE.md:19](CLAUDE.md#L19) requires checking the finding's own example, rather than the fix summary.

**Suggested correction/control:** Add one plain clause explaining that separating incoming funds keeps already-prepared spending proofs from becoming stale. Re-read the four transaction bullets and require that they answer both “where does value arrive?” and “why the extra merge?”

### R2-A6 — MEDIUM — The handover still treats the owner's removal as undecided

**Quoted text:** “whether to keep the blog's sentence saying the project was built with Claude Code and reviewed by Codex, Gemini and Claude sessions” (`docs/NEXT-SESSION-PROMPT.md:55`), under “What remains, in order”.

**Evidence:** The owner has requested removal, and the sentence is absent from the fixed blog: its register explanation is followed directly by the section separator (`BLOG:27–33`; the diff deletes the old introductory paragraph). The new handover nevertheless describes this resolved decision as outstanding. Unlike the exempt adjudication, this is an operational next-session instruction, not a frozen record of the earlier review.

**Suggested correction/control:** Record that the removal was requested and completed; keep only genuinely pending sign-off and URL decisions. Check the handover against the actual fixed introduction so the next session is not invited to restore the removed sentence.

## 2. New and rewritten sentences: source audit

The following checks supplement the findings above; they are not blanket agreement with the adjudication.

| Changed passage | Source/example checked | Result |
|---|---|---|
| Blog title and amounts-versus-relationships summaries; LinkedIn's short summary | P-4/P-11, R-1 (`CLAIMS.md:25,32,509`), facility walkthrough `:149–154,184–189,209–217` | Correct in the surrounding text: drawdown/repayment amounts versus a public transaction graph; not all amounts are hidden. |
| “When I checked…”; LinkedIn's “final standard” | E-353 (`CLAIMS.md:413`), survey `:26–30,105–121`; upstream XLS-0096 header fetched with status Final | Matches the recorded dated reading. No fresh live-amendment RPC was performed in this review. |
| MPT issuer/holder explanation and ElGamal's public-key-encryption gloss | The repository's token model and upstream XLS-0096 abstract and holder fields | Correct simplifications; no extra secrecy from issuer is claimed. |
| Convert and Send credit inbox; MergeInbox is required before spending | F-27 (`CLAIMS.md:481`) and fetched XLS-0096 §§8–10 | Mechanically correct; missing rationale is R2-A5. |
| Compact sigma protocol described as a zero-knowledge proof used behind Send | P-7 (`CLAIMS.md:28`), upstream Send proof field | Correct at this level, but it is a component, not the entire Send proof bundle: the specification separately lists the range proof. Do not infer that sigma alone proves the ranges. |
| Upstream review paragraph, moved and explicitly scoped | B-13/B-30/B-31 (`CLAIMS.md:441,431–432`) | No assertion that those reviews audited this project. The unavailable reports and limited Zellic knowledge remain explicitly qualified. I did not independently obtain those reports. |
| Clawback explanation | E-12 (`CLAIMS.md:53`) | Correct when read with “destroy…crediting no one”, not as recovery to the issuer. |
| Dedicated Account is an ordinary account named by this project | Facility walkthrough `:61–74,98–102` | Correct; it is not an XLS-65 Vault. |
| `tec` failure and sequence consumption | E-149 (`CLAIMS.md:209`) and the already recorded plain-Payment control | Correct; it still clearly distinguishes that executed test from the source-read confidential-key case. |
| Local viewer versus hosted demo | E-230 (`CLAIMS.md:290`), static hosted architecture and `BLOG:316–320` | Correct separation; no inference that holding no signing key removes a disclosure boundary. |
| Review-process paragraph and live counts | Original B-2 example; actual correction/review ID extraction | R2-A1 and R2-A2, not discharged by “not outside audits”. |
| Negative-claims check's rewritten explanation | `tools/check-negative-claims.ts:29–45` | Readable account of the check's purpose. Its enforcement is limited to named lexical patterns and governed upstream-feedback rows; not every ungraded note. |
| R-4/R-5 characterization | `CLAIMS.md:512,514` | Correctly distinguishes withdrawal/narrowing from reversed retraction. New total/last-record problem is R2-A2. |
| Vault question and #8118 closure | Survey `:47–48,130`; filing protocol `:36–43`; fresh #8118 issue/comments API | XLS-65 identifies the relevant vaults; closure's unknown reason is now explicit. No maintainer explanation was found in the comments returned. |
| LinkedIn's eleven outcomes, upstream attribution, and review pointer | Survey `:43–59`; current issue/PR APIs | Four September closures, fifth #148 fixed/closed October 21; #141 and #153–155 and #611 open; #8118 closed without an outside explanation. #145 remains unmerged, #152 merged, latest mpt-crypto release remains 1.0.5. |
| R-9 and “replaced everywhere” status | The three edited source sites plus live HTTP response | Source replacement is present. The actual served slogan is not yet replaced; keep that rollout condition visible. |

## 3. Whole-tree surviving copies

Searched all tracked project files, including generated outputs and local in-repository command files, rather than only the drafts. `docs/reviews/` was searched as record material and excluded from live-copy findings. Dependencies and `.git` are not publication source. Quoting a rejected sentence to explain its correction is distinguished from asserting it.

| Corrected phrase | Every non-review surviving source copy | Assessment |
|---|---|---|
| “shape of the book” | `CLAIMS.md:414,517`; `docs/NEXT-SESSION-PROMPT.md:15,56`; `docs/CLAIMS-REVISIONS.md:48`; `docs/claims/by-topic/claims-and-drift.md:117`, `confidentiality-limits.md:61`, `protocol-and-crypto.md:186`; `docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md:136`; `tools/check-disclosure-phrases.ts:199` | Correction/history quotations, generated struck excerpts, or the detector's needle—not current privacy assertions. The explanatory quotations at E-354 and handover line 15 are not struck but explicitly describe the misleading old wording. The deployed `/how-it-works` is the remaining **asserted** copy, verified by GET. |
| “three reviews of this code” | `CLAIMS.md:414`; `docs/NEXT-SESSION-PROMPT.md:15` | Both identify the old statement as misleading. No surviving live assertion of that audit implication was found. |
| “each a sentence”; “later found false” | `docs/NEXT-SESSION-PROMPT.md:15` | Quoted finding, expressly qualified by “R-4 and R-5 are not”; not a live assertion that every correction is a false published sentence. |
| “fit neither” | `.claude/commands/issue-review.md:54`, `.claude/commands/upstream-issue.md:51` (both inside this repository); `CLAUDE.md:239`; `docs/UPSTREAM-FILING-PROTOCOL.md:40–41`; `BLOG:289–291` | Surviving chronological/template statements. The fixed blog explicitly disclaims knowledge of the closure reason. The older procedural copies do not supply a maintainer reason and should not be cited as one. No new “closed for this reason” sentence was found. |
| Case-insensitive “Read on 2026” | `CLAIMS.md:41,384`; `README.md:28,107,151`; `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md:297`; `docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md:21` | No occurrence of the corrected 2026-10-22 draft opening remains. README line 151 and ADR line 297 still use sentence-initial “Read on” for other dates; LOW readability remnants, not false amendment readings. Other hits have an explicit grammatical subject/context. |
| “moves no trust boundary” | `CLAUDE.md:173`; `docs/architecture/ARCHITECTURE-2026-08-18.md:240`; `web/README.md:3,74` | Struck or explicitly retracted. No unqualified live assertion found. The blog's own quote wraps across lines and is immediately described as wrong (`BLOG:216–221`). |
| The difficult “an observation filed or graded” wording | No non-review literal hit | Removed from live prose. |
| “eight correction…” / “eight entries” / “61 numbered” | `BLOG:250,331,209`; historical finding quotation at `docs/NEXT-SESSION-PROMPT.md:15` | The three blog totals are live assertions and wrong after this patch: R2-A2. The handover quotation is a historical description, not a current count. |

## 4. Does R-9's replacement hold?

> “It hides how much each supplier draws and owes, not who borrows, when, or the size of the float.”

**Yes, as the contextual facility summary—not as an unconditional privacy guarantee.** Checked the three literal replacements at `README.md:71`, `docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md:133–134`, and `web/app/src/hosted/routes/how-it-works.tsx:197–198` against:

- E-146 (`CLAIMS.md:197`): the executed facility; its qualification about remote-ledger reads is still present in the surrounding explanation.
- F-24 (`CLAIMS.md:478`): each retirement tranche's own amount is public, not just a net total.
- R-1 (`CLAIMS.md:509`): amounts versus public graph, timing and frequency.
- Facility walkthrough `:104–128,138–154,164–189`: public initial float and enrolments, confidential Send drawdowns/repayments, public ConvertBack tranches.

The new sentence does not claim relationship anonymity. Omitting repayment amounts, limits, frequency and individual retirement tranches from a one-sentence summary does not retract their immediately surrounding disclosures: README `:71` names tranches/frequency/limits and arithmetic bounds; the hosted facility panel `:175–192` names enrolment amounts, draw/repayment timing/frequency and tranches; the longer explainer `:84–127` supplies those limits.

The caveats still matter: the bank sees all amounts; known zero cases and public arithmetic can expose or bound values, sometimes exactly (`WHAT-CONFIDENTIAL-MEANS:106–113`). The sentence is not a guarantee against inference for every possible facility history. In its existing context it does not newly overstate or materially understate the demonstrated confidentiality. Its source fix is sound; its live rollout is not yet done.

## 5. Tools, controls and rendered output

### Requested gates

`bun install --frozen-lockfile` succeeded, without changing tracked files.

| Command | Result |
|---|---|
| `make check-disclosure-phrases` | **PASS**: 326 live files, 23 phrases, 14 controls |
| `make check-claims-index` | **PASS**: 435 rows, regenerated and byte-compared; existing splitter/content/escape probes pass |
| `make check-claims-topics` | **PASS**: 13 topic files, 435 rows, 12 topics |
| `make check-tables` | **PASS**: 16 files, 1,763 body rows, no ungoverned rows; table-shape/continuity controls pass |

### Actual copies of a live README, using the real unchanged checker

Copies were isolated under `$TMPDIR/review-062-mutations/`, each with the actual checker in `tools/check-disclosure-phrases.ts` and the current README with only its summary substituted.

| Mutation | Exit | Expected behavior |
|---|---:|---|
| Old slogan, unmarked | **1** | Correct refusal |
| Old slogan with `(R-9)`, no strike | **1** | Correct refusal |
| Old slogan split across a line break | **1** | Correct refusal |
| Old slogan split across blockquoted lines | **1** | Correct refusal |
| Genuine `~~old slogan~~ (R-9)` | **0** | Correct positive control |
| Unstruck old slogan with `(R-9)`, unrelated struck note nearby | **0** | **False pass**, R2-A3 |
| Unstruck old slogan with `(R-9)`, unrelated “no longer” sentence nearby | **0** | **False pass**, R2-A3 |

The false passes keep all 14 built-in controls green. “Every phrase is detectable” tests a bare assertion, not the new entry's forgiveness boundary.

### `summarise()` and the generated Markdown

- A normal cut inside a strike closes correctly: input `before ~~this withdrawn sentence continues well past the excerpt boundary~~ after` at max 31 becomes `before ~~this withdrawn…~~`. `cmark-gfm` renders the shortened quotation inside `<del>`.
- A short complete strike remains complete. A cut near an opening delimiter did not leave a dangling double delimiter in the exercised boundary case.
- Scanned **all 15 generated Markdown files** in the requested locations, including README and revisions: **5,505 table cells**, **zero cells with an odd `~~` count**. No raw unbalanced double-strike excerpt was found.
- Keeping `~~` did **not** create table-cell or continuity failures: `make check-tables` passes.
- Rendered those files using `cmark-gfm` with table and strikethrough extensions. Their **81 nominal double-strike pairs yield 75 `<del>` elements**. Four missing renderings are the new preservation/whitespace problem in R2-A4. The other two are B-1 copies (`docs/CLAIMS-INDEX.md:417`, `docs/claims/by-topic/protocol-and-crypto.md:148`): their source `CLAIMS.md:442` already contains the problematic mixed single-/double-tilde benchmark phrase. That source rendering issue predates this patch and is not reported as a new defect.
- No rendered `<del>` crossed a table-cell boundary. The failure is literal, ineffective strike markup, not a structurally broken table or a strike leaking into later cells.

### Additional tests

- `bun test`: **305 pass, 5 fail**. All five failures are in signer-start/secret-file scenarios; the required `signer/target/debug/wconf-signer` binary is absent. This is an environment prerequisite, not established as a regression in the documentation/tool patch.
- `bun test web/api web/hosted`: **192 pass, 0 fail**.
- No Rust build was attempted to remedy that prerequisite.

## Final one-line verdicts for every upheld round-one finding

- **A-1 — discharged:** R-4/R-5 are no longer generalized into published false sentences; the new current-count errors are separate.
- **A-2 — discharged:** LinkedIn describes the other six outcomes and points to the full breakdown and upstream reviews.
- **A-3 — not:** public survey Contents API still returns 404; publication must wait.
- **B-1 — discharged:** the three outside reviews are explicitly upstream's, not this project's.
- **B-2 — partly:** outside audits are disclaimed, but the fixed paragraph still permits a human-review inference.
- **B-3 — discharged in fixed text:** amounts and public relationships are distinguished; the deployed old slogan remains an open rollout condition.
- **B-4 — discharged:** the local viewer and static hosted demo are explicitly separated.
- **B-5 — partly:** the term glosses improved; the inbox-purpose example is not fully answered.
- **B-6 — discharged:** both dated openings now say “when I checked”.
- **B-7 — discharged:** the original hard-to-parse sentence is rewritten; the actual gate remains lexical and scoped.
- **B-8 — discharged:** upstream reviews moved into XLS-96 background.
- **B-12 — discharged:** the closure reason is explicitly unknown, not inferred from template mismatch.
- **B-13 — discharged:** final-standard status and upstream authorship of fixes are explicit.
- **B-11a — partly:** a required merge is described, but the reason for a separate inbox is still absent; same issue as R2-A5.

## What I did not check

No private configuration or prohibited external directory was read. No live transaction was signed or submitted. The earlier facility run, decryption experiments, same-user memory claim, Conan resolution/build and crypto implementation were not re-executed. I did not obtain or independently audit the Trail of Bits, Sherlock or Zellic reports, re-read every Japanese upstream page, inspect every upstream filing's entire timeline, or run fresh Mainnet/Testnet/Devnet amendment RPCs. The dated amendment claims were checked against the repository's survey evidence, not promoted to fresh live-network findings.

Fresh HTTP/API checks covered the eleven filing states, selected issue comments, #145/#152 merge state, the latest mpt-crypto release, the upstream XLS-0096 text, the exact public-survey path and the served explainer. No source build, Vercel deployment, full deployment/header comparison, owner sign-off, or publication was performed. The missing signer binary prevents a clean full-suite result here. Proposed corrections require their listed regression controls; no third review round is requested.

END OF ROUND TWO LEG A REPORT
