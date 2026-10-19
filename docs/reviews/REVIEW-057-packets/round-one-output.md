Step 0 results:

- `https://github.com`: **200**
- `https://registry.npmjs.org`: **200**
- `gh`: **authenticated as `nandanito`**
- Working directory: `$USER_TMP/T/review057.Ua6pYP/repo`
- HEAD: **`adee1f0`**

**The plan should not run as written.** It leaves a demonstrated route for publishing private history, contradicts its one-commit promise, and omits third-party source from its licence accounting.

No GitHub changes were made. The source checkout remains clean. Rehearsals used scratch repositories. I did not run Cargo, rebuild the environment, load the real secret store, or inspect prohibited historical versions of `UPSTREAM-FEEDBACK.md`.

Below, **D** means `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md`.

**Seam 1 — D3 and NOTICE**

The measurements were:

| Item | Result |
|---|---|
| Patch length and scope | **1,657 lines; six files**, all under `src/` |
| Added lines | **756**, including 44 blank lines |
| Removed lines | **500**, including nine blank lines |
| Context lines | **341**, including 68 blank lines |
| Upstream lines carried by the patch | **841 including blanks; 764 nonblank** |
| Benchmark file | **465 physical lines** |
| Benchmark comparison | Excluding blank lines, comment lines and standalone braces: **321 line occurrences**, of which **96 match upstream exactly**, or **101 after trimming indentation** |
| Upstream licence search | No licence file found at the pin or downloaded `main`; no licence declaration in `conanfile.py`; no SPDX/copyright/licence notice found under `src/` or `include/` |
| Upstream issue/PR search | Zero `license`/`licence` results; a control search returned results |
| npm package | `@xrplf/mpt-crypto@0.1.0`: **70 shipped files**, TypeScript, compiled JavaScript and WASM; no C source; `MPT_CRYPTO_VERSION` is **1.0.4**; package licence is **ISC**; repository is `XRPLF/xrpl.js` |

I could not reproduce **70/217** without an undisclosed definition of “substantive.” My explicit comparison gives approximately **30% exact line matches**, including ordinary API boilerplate.

The broader search found a material omission:

- `docs/reviews/REVIEW-024-REQUEST-b16-ed25519-nonce-2026-08-27.md:1803` introduces verbatim `ed25519-dalek` source. Its excerpts at lines **1861–1960**, **1965–1990** and **1995–2007** match the downloaded **2.2.0** crate exactly: **139 lines**.
- `docs/reviews/REVIEW-027-REQUEST-b21-and-e171-2026-08-27.md:394` includes the **complete 359-line `src/hazmat.rs`**.
- That crate is **BSD-3-Clause**. The first packet contains neither copyright nor licence text. The proposed NOTICE supplies neither. [Crate licence](https://docs.rs/crate/ed25519-dalek/2.2.0/source/LICENSE).
- Markdown also reproduces rippled code and substantial specification text: examples are `docs/reviews/REVIEW-003-REQUEST-2026-08-16.md:59` and `docs/reviews/REVIEW-021-REQUEST-step7-convert-back-2026-08-25.md:139`. Upstream rippled is ISC-licensed; XRPL-Standards is MIT-licensed. These need inclusion in the quotation/attribution inventory.

Findings:

- **R1-1 | MEDIUM | NOTICE’s third-party inventory is incomplete | D:91,150–153; REVIEW-024:1803,1859; REVIEW-027:394; byte comparisons against the downloaded crate | Add the BSD copyright, conditions and disclaimer; inventory and provide applicable notices for the other reproduced source and specification excerpts.**
- **R1-2 | LOW | D3 mixes line-count definitions and gives an unreproducible benchmark denominator | D:85–90,137–140; `git apply --numstat` and explicit line comparisons above | Publish the counting command and definition; use 500 removed/341 context/756 added, distinguishing blank lines.**

I searched the **643 tracked files**, including TypeScript, Rust, JSON/vector generators, Markdown source excerpts, web components, generated routing code and CSS. The tracked inventory contains no image, font, icon or vendored `.js` asset files. The XRPL vectors inspected identify committed generators rather than copied upstream KAT datasets.

I did **not** establish provenance for every unmarked line, compare every dependency’s complete source tree, or resolve the legal treatment of every quotation.

A′ does its narrow attribution job: it explicitly disclaims relicensing the identified C material. It supplies **no redistribution permission**. The surrounding stack’s ISC licensing and the project’s useful upstream contributions do not establish permission or quantify enforcement risk. That limitation is acknowledged in D3, so I am not reporting it as newly discovered. [GitHub’s no-licence guidance](https://choosealicense.com/no-permission/).

**Seam 2 — rename and pre-push guard**

GitHub’s quoted rename behaviour is accurate. Old Git URLs redirect after rename; reusing the old repository name ends that redirect. The sibling repositories’ visibility and creation dates also match D4. [GitHub rename documentation](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).

Local experiments with Git **2.50.1** established:

| Route | What happened / design consequence |
|---|---|
| `url.<base>.insteadOf` | Hook received the **rewritten destination**, not the original alias |
| `remote.origin.pushurl` | Hook received the **push URL** |
| `--no-verify` | Push succeeded without invoking the hook |
| `core.hooksPath` override | Push succeeded without invoking the installed hook |
| Fresh clone | Repository-local hook was absent; push succeeded |
| Linked second worktree | Shared the hook and was refused; a second worktree is **not automatically a bypass** |
| `gh repo create --source . --push` | CLI source delegates to Git push; it does **not inherently bypass** an effective hook |
| Remote `gh repo sync` | Uses GitHub APIs, so no local hook runs; this does not establish that unrelated private objects would be accepted |
| IDE | A normal Git invocation normally runs the hook; an alternative Git implementation or overridden configuration needs separate verification |

Sources: [Git hooks](https://git-scm.com/docs/githooks), [CLI create implementation](https://github.com/cli/cli/blob/trunk/pkg/cmd/repo/create/create.go), [CLI sync implementation](https://github.com/cli/cli/blob/trunk/pkg/cmd/repo/sync/sync.go).

The decisive experiment was a push from an unhooked toy clone into a repository with an unrelated public root:

```text
mixed_push_exit 1
main_rejected True
private_branch_published True
```

**`git push --all` rejected `main` but successfully created another branch containing the toy private history.** Main-branch protection and a failed push exit code therefore do not establish confidentiality.

- **R1-3 | HIGH | A repository-local URL hook does not close the private-history publication route | D:181–188,267–270; bypass and mixed-result push experiments above | Remove public-repository write authority from private-history environments; reserve publication credentials for the isolated export. Keep the hook as an additional guard, preferably allowing only the canonical private destination.**

A URL expression must account for owner/repository case, optional `.git`, trailing slash, scp-style SSH and `ssh://` forms. It should inspect Git’s effective destination, not reconstruct it from `origin`. A blacklist remains weaker than a private-destination allowlist.

One qualification to the proposed test: after the rename, the old URL can still resolve to the renamed private repository. Thus testing before public creation can invoke the hook. Require its **specific refusal marker**; an authentication or repository-not-found error is not proof that it ran.

**Seam 3 — copying issues**

The stated citation counts reproduce with the case-insensitive pattern **`issues? #[0-9]+`**:

- **119 files; 390 matches**
- #1: **157**
- #10: **70**
- #11: **50**

The literal singular pattern produces different counts; the plan should preserve the actual expression.

The restricted issue queries confirmed:

| Measurement | Result |
|---|---|
| Issues | **13** |
| Closed/open | **10 / 3** |
| Open numbers | **5, 8, 10** |
| Comments | **17 total** |
| Pull requests | **0** |
| Withheld IDs in bodies | #6: **U-28**; #7: **U-31**; #10: **U-32** |
| Withheld IDs in comments | #2: **U-36**; #3: **U-37**; #4: **U-35, U-38** |
| Titles containing withheld IDs | **0** |
| Other title ID | #7 contains **U-24**, a public row |

The titles concern subjects already described in the public tracked material; I found no title-specific leak.

Issues, PRs and Discussions must all be kept out of the initial numbering sequence. Transfers and integrations that create them also matter. A push, workflow run, label or release does not itself reserve an issue number. This workflow has read-only permissions and no creation step. Enabling Discussions can lead through creation of a welcome discussion, so defer that setup too. [GitHub Discussions setup](https://docs.github.com/en/discussions/quickstart).

Creating the repository privately is useful, but **privacy alone does not reserve numbers**. Assert each returned number as it is created, and stop immediately on a mismatch.

The semantic question remains **uncleared**. The allowed queries establish that #5 and #8 have no `U-nn` references and #10 has one U-32-bearing paragraph. They cannot establish that other paragraphs paraphrase no withheld observation. I did not evade the transcript restriction to read those bodies.

Findings:

- **R1-4 | MEDIUM | The publishable issue payloads and semantic-redaction gate are not concretely bound | D:234,271–275; open issues have three comments between them, while step 9 scans “13 bodies” | Specify title plus sanitized body only, explicitly exclude comments/attachments, complete the semantic review, and create each issue from the exact swept file. Freeze those files rather than re-fetching bodies during creation.**
- **R1-5 | MEDIUM | The universal stub promise is false | D:238–240; REVIEW-013 request:15,161 still presents the unresolved re-weigh, whose final disposition is in `docs/reviews/REVIEW-013c-adjudication-option-2-and-amendments-2026-08-18.md:10` | Give each closed stub a verified outcome-document link; remove the promise that every citing document contains the outcome.**

Step 9 does not explicitly authorize copying comments, but “full copies” invites that interpretation. If comments are copied, the specified body-only sweep has not covered the complete publication payload.

**Seam 4 — execution order**

I rehearsed the export, added the drafted NOTICE/README reference, initialized Git, committed, performed D2’s two commits, and committed step 6’s README changes. Installation succeeded:

```text
156 packages installed
227 pass
5 skip
0 fail
ci: every step passed
```

That was macOS verification. The sweep component reported **97/97 controls** and **PASS-SHAPES-ONLY**. It was not the full local-store publication gate.

The commit arithmetic is unavoidable:

| After step | Commit count |
|---|---:|
| 4 | **1** |
| 5, first commit | **2** |
| 5, regeneration commit | **3** |
| 6, literally executed without an additional commit | **3, with a dirty README** |
| 6, README committed as evidently intended | **4** |

Squashing the rehearsed tree back to one commit caused the revision-log gate to fail:

```text
FAIL: 739b29f is not an ancestor of HEAD.
```

The log embeds the hash of the commit introducing `CLAIMS.md`; putting that generated log into a replacement root invalidates its anchor.

Findings:

- **R1-6 | HIGH | Steps 4–6 cannot produce the one-commit publication they promise | D:252–264,271–272; rehearsal above; `tools/build-claims-revisions.ts:765,812` | Resolve the bootstrap design before execution: either change the promise to an approved short bootstrap history, or adapt the revision-log format/gate to support a genuine single root. Merely squashing afterward fails.**
- **R1-7 | HIGH | Step 7 does not seal the complete object graph or the final published tree | D:259–278; `tools/check-no-secrets.ts:1200–1203` disables history scanning under `--rev`; step 6 lacks a commit instruction and step 9 recommends later workflow edits | Finish and commit every file change first; require a clean worktree; validate the intended history/ref set and scan export history strictly; record the approved HEAD and push only that object. Re-run after any workflow pinning edit.**
- **R1-8 | HIGH | A literal required check named `ci` will never complete | D:276; `.github/workflows/ci.yml:6,16` names the workflow `ci` but its job `checks` | Require the emitted check named `checks`, or rename the job. Select and verify the actual emitted context from the staging run.**
- **R1-9 | MEDIUM | The first Linux verification is observed only after irreversible publication | D:275–280; workflow uses `ubuntu-latest`, while the recorded/rehearsed executions are macOS | Wait for the private staging repository’s first CI run to pass before changing visibility.**

GitHub uses the **job name** for a workflow’s required status check. [Required-check naming documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules).

There is **no settings-availability finding** in the stated order: step 9 makes the repository public before enabling private vulnerability reporting and branch protection. Those features are available for public repositories on GitHub Free. Moving both settings earlier would encounter availability restrictions. [Branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches), [private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately).

The tested CI path needs no access to the private repository. Historical commit citations deliberately remain unverifiable to outsiders; step 6 discloses that limitation. They remain an evidence-access cost, not a runtime dependency.

**Seam 5 — surface corrections and E-322**

The requested upstream reads confirmed `status: Final` at **`33ea4ca66`**, **`58ccd3047`** and **`master`**. PR #604 merged on **2026-09-03**. [Pinned specification](https://github.com/XRPLF/XRPL-Standards/blob/33ea4ca66/XLS-0096-confidential-mpt/README.md).

The corrected API descriptions agree with current code:

- `web/api/server.ts:109–123` removes `socketPath` and the note.
- `web/api/issuer.ts:180–193` returns `decryptable`, not `decrypted`.
- A request-level probe using a **synthetic scratch snapshot** returned HTTP 200, `decryptable: true`, no decrypted field, and no occurrence of the synthetic figure.
- `/api/meta` no longer described the disclosure as unruled.

Two defects remain:

- **R1-10 | MEDIUM | A newly added README sentence is false | `README.md:31` says XLS-0096 was Draft for most of this project’s life; the first commit is 2026-08-16 and Final was set 2026-09-03—approximately 18 of 63 days by review day | Replace “for most of this project’s life” with the two dates.**
- **R1-11 | MEDIUM | E-322’s sweep left active copies of the removed disclosure state | `docs/explainer/WEB-TIER-STACK-AND-PHILOSOPHY-2026-08-28.md:34–35`; `docs/architecture/ARCHITECTURE-2026-08-18.md:235`; launch plan:137–140; `tools/check-disclosure-phrases.ts:126,138` | Date the historical descriptions and state that E-241 removed the figure, count and path. Preserve records, but mark their supersession where readers encounter them.**

The ADR’s contradictory status prose and “currently accepts” paragraph also remain at `docs/decisions/ADR-0003-web-tier-trust-boundary.md:3,352`. E-322 explicitly acknowledges those; acknowledgement does not make their current-tense statements true.

I found no remaining **unqualified current claim** outside the exempt historical/register material that withheld rows will remain in public history. The explainer’s Draft wording is explicitly dated to its September 1 reading and now records Final afterward; that is a historical statement, not a surviving current-status error.

The complete findings register:

| Finding | Seam | Severity | Finding |
|---|---:|---|---|
| R1-1 | 1 | MEDIUM | Third-party notice inventory misses reproduced Rust source and other excerpts |
| R1-2 | 1 | LOW | Line-count definitions are mixed or undisclosed |
| R1-3 | 2 | HIGH | Hook bypass permits private-history publication on another ref |
| R1-4 | 3 | MEDIUM | Semantic redaction and exact issue payloads remain unsealed |
| R1-5 | 3 | MEDIUM | Stub promises outcomes in documents that predate resolution |
| R1-6 | 4 | HIGH | Publication commit count contradicts the plan; subsequent squash fails the gate |
| R1-7 | 4 | HIGH | Gate does not seal final files, history and pushed object |
| R1-8 | 4 | HIGH | Required `ci` context differs from emitted `checks` |
| R1-9 | 4 | MEDIUM | First Linux CI result is checked after publication |
| R1-10 | 5 | MEDIUM | Newly added “most of this project’s life” statement is false |
| R1-11 | 5 | MEDIUM | Current-tense disclosure claims survive the surface sweep |

Seam 1: **does not survive**—the licence inventory is incomplete.

Seam 2: **does not survive**—a confidentiality guard bypass was demonstrated locally.

Seam 3: **does not survive**—the stub promise is false, and semantic redaction remains uncleared.

Seam 4: **does not survive**—the commit sequence, final-object gate and required check conflict.

Seam 5: **does not survive**—the source corrections mostly hold, but a new false sentence and surviving copies remain.

**The single change I would make before step 1:** replace the hook’s role as the confidentiality boundary with **credential isolation: private-history environments cannot write to the public repository; only the isolated, verified export environment can publish.**