**The revised plan should not run yet. I found 12 findings, including four HIGHs.** Six round-one fixes are only partly discharged. The stock guard gate passes, but an additional broken-hook mutant also passes.

Step 0 results: GitHub **200**; npm registry **200**; `gh` authenticated as `nandanito`. Working directory: `$USER_TMP/T/review057r2.FWMzdC/repo`; HEAD **`776ca25`**, “Step 2: pin the workflow's actions by commit.”

The source clone finishes clean at that commit. Commits and push experiments were confined to scratch repositories; every push used a local bare remote. No GitHub changes were made, and no prohibited secrets, withheld rows, or private issue sentences were printed.

Below, **D** means `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md`.

**Seam 1 — the round-one fixes: survives only in part**

| Finding, using round one’s wording | Verdict | Assessment of REVIEW-057c’s fix |
|---|---|---|
| R1-1: “NOTICE’s third-party inventory is incomplete” | **Discharged in part** | The BSD notice and the other four licence copies are present and correct. The new inventory nevertheless misses substantial existing quotations and passes planted, unattributed copies. See R2-5 and R2-6. |
| R1-2: “D3 mixes line-count definitions and gives an unreproducible benchmark denominator” | **Discharged** | Reproduced **756 added, 500 removed, 341 context; 764 nonblank upstream lines**. Applying D3’s benchmark exclusions reproduces **321 / 96 exact / 101 trimmed**. |
| R1-3: “A repository-local URL hook does not close the private-history publication route” | **Discharged in part** | D8 now acknowledges hook bypasses and records the owner’s acceptance. But its narrower claim that the installed guard closes the stale-origin route depends on code that can approve private-history pushes elsewhere. R2-1–R2-3. |
| R1-4: “The publishable issue payloads and semantic-redaction gate are not concretely bound” | **Discharged in part** | Comments and attachments are excluded; semantic reading is explicitly required; bodies are created from swept files. Titles remain outside that file-and-sweep binding. R2-10. |
| R1-5: “The universal stub promise is false” | **Discharged** | D:252–258 removes the universal outcome promise and requires verification before linking an outcome. |
| R1-6: “Steps 4–6 cannot produce the one-commit publication they promise” | **Discharged in part** | The revised sequence produces two commits and passes CI. The published README still promises a single squashed publication commit. R2-8. |
| R1-7: “Step 7 does not seal the complete object graph or the final published tree” | **Discharged in part** | Clean-worktree sequencing, history scanning, earlier action pinning and the recorded-SHA push are fixed. Historical personal data still does not fail the prescribed gate. R2-7. |
| R1-8: “A literal required check named `ci` will never complete” | **Discharged** | Step 10 requires the context observed during staging; the workflow’s job is `checks`. |
| R1-9: “The first Linux verification is observed only after irreversible publication” | **Discharged** | Step 9 now requires the private staging run to pass before visibility changes. |
| R1-10: “A newly added README sentence is false” | **Discharged** | README:31 now says Draft when the project began, rather than Draft for most of its life. |
| R1-11: “E-322’s sweep left active copies of the removed disclosure state” | **Discharged in part** | The issuer descriptions were dated, but adjacent current-tense signer-disclosure claims remain. R2-9. |

**Seam 2 — the guard and its gate: does not survive**

`make check-push-guard` returned:

```text
check-push-guard: verdict=PASS cases=26 mutants=11 exit=0
```

The additional experiments found:

- **R2-1 | HIGH | Git replacement refs hide private ancestry from the running hook | `tools/git-hooks/pre-push:95–105` | Disable replacement objects for ancestry/object inspection and reject grafts, or remove the ancestry exemption.**

  I installed the real guard in a toy private repository. An ordinary push to a local bare repository was refused. After replacing the private tip with an unrelated orphan commit using `git replace`, the same push succeeded. The receiver contained the **original private commits**, their private root as an ancestor, and the toy private file. The hook inspected Git’s substituted graph; the transmitted history was the original graph.

- **R2-2 | HIGH | Installation in a shallow clone records a truncation boundary as the private root | `tools/install-push-guard.sh:42–48`; `tools/git-hooks/pre-push:83–105` | Refuse shallow installation and shallow execution; record and validate the actual private root.**

  The installer accepted a depth-one clone and recorded its tip as the root. After unshallowing, pushing an older private commit to another local bare repository succeeded: that older commit does not descend from the recorded truncation point. The receiver’s private ref was verified.

- **R2-3 | HIGH | Archive identity is resolved on an unpinned API host | `tools/install-push-guard.sh:37`; `tools/git-hooks/pre-push:114` | Pass `--hostname github.com` in both places.**

  Both URLs are parsed as GitHub.com destinations, but both `gh api repos/...` calls inherit `GH_HOST`. A real `gh` probe with a synthetic enterprise host attempted that host rather than `api.github.com`.

  With a host-aware fake API, the hook refused a GitHub.com destination when it returned that destination’s different ID, then approved the same destination when `GH_HOST` selected an enterprise response matching the configured archive ID. Installation under that environment can likewise record the enterprise repository instead of the actual GitHub.com archive. Repository IDs must be bound to their host.

- **R2-4 | MEDIUM | The gate misses removal of the non-commit-object protection | `tools/git-hooks/pre-push:95–98`; `tools/check-push-guard.sh:144–171,235–245` | Add actual blob/tree/tag-to-blob push cases and corresponding mutants.**

  My additional mutant changed the failed `^{commit}` conversion branch to `exit 0`. The entire gate still reported **PASS, 26 cases, 11 mutants**. The original hook refused a private blob pushed as a tag; the surviving mutant allowed it, and the local receiver contained the private blob.

Other coverage: owner/repository and hostname case, userinfo, ports, `.git` and trailing slashes, SSH/scp forms, local paths, `file://`, `ext::` and helper-style URLs were exercised against the parser. Local `--all`, `--mirror` and `--tags` pushes carrying the ordinary private graph were refused. Annotated tags to private commits were covered by the stock gate. Blob/tree refs were conservatively refused by the original hook; deletions and unrelated orphan commits were allowed. Ordinary descendants created after installation remain covered; the shallow test demonstrates a root that becomes visible later and escapes coverage.

Missing configuration, missing recorded objects, missing `gh`, API failure and visibility changes fail closed in the tested cases. The ancestry status-1 path is the consequential false-negative path.

**Seam 3 — inventory and NOTICE: does not survive**

I ran the inventory over a scratch export with installed npm dependencies and a fresh corpus cache. It reproduced the committed six-project result. Its stderr showed **94 corpora actually indexed**; fourteen locked crates were unavailable.

The quotation probes gave:

| Planted material | Result |
|---|---|
| Ten authentic `@noble/curves` source lines, unchanged | Detected; NOTICE check failed |
| Same ten lines with `cat -n` prefixes | Missed; check passed |
| Same ten lines with `grep -n` prefixes | Missed; check passed |
| Same code joined onto one line | Missed; check passed |
| Entire older `@noble/curves` 1.8.2 source file | Detected through shared text |
| Entire 52-line `left-pad` source file, outside the corpora | Missed; check passed |
| Names-only NOTICE, with the BSD licence file deleted | Check passed |

Findings:

- **R2-5 | MEDIUM | Ordinary quotation formatting hides substantial reproduced source | `tools/inventory-third-party.ts:139,214–246,253–257`; `docs/third-party/INVENTORY.md:52–54` | Normalize transcript prefixes, compare code token sequences across line boundaries, and manually reconcile quotations outside the corpora.**

  This affects the existing tree, not just planted material. For example, `docs/reviews/REVIEW-054-packets/f13-round-one-transcript.txt:2351–2374` reproduces numbered `mpt-crypto` source but is absent from its inventory ranges. Stripping numeric prefixes recovered that excerpt and many others. Numbered `ed25519-dalek` excerpts in `docs/reviews/REVIEW-057-packets/round-one-stderr.txt:10039–10071` are also omitted.

  The documented blind spots do not include numbering or code reflow. A matcher hit also needs provenance confirmation: normalization produced a `clio` attribution for shared includes in a rippled excerpt; I did **not** treat that as proof that clio source was copied.

- **R2-6 | MEDIUM | The NOTICE gate accepts project-name tokens without the required notices | `tools/inventory-third-party.ts:344–351` | Validate a project-to-licence manifest, required notice files and their expected contents.**

  Replacing NOTICE with one line containing the six searched names, and deleting `LICENSES/ed25519-dalek-BSD-3-Clause.txt`, still passed `make inventory-third-party`. The gate proves substring presence, which is insufficient to establish completion of step 1’s notice obligations.

- **R2-11 | LOW | The recorded comparison scope and count are false | `tools/inventory-third-party.ts:94–96,200–204,328`; `docs/third-party/INVENTORY.md:22`; D:145–148; `CLAIMS.md:384` | Report “108 configured, 94 compared, 14 unavailable” and describe the selected file set.**

  The tool skips fourteen corpora and excludes files by extension and explicit path rules. “Compared every tracked file with 108 corpora” overstates both sides of the comparison.

The five committed licence files themselves passed byte-for-byte comparison:

| File | Upstream comparison |
|---|---|
| `LICENSES/ed25519-dalek-BSD-3-Clause.txt` | Locked 2.2.0 crate’s LICENSE |
| `LICENSES/rippled-ISC.md` | rippled 3.3.0 LICENSE.md |
| `LICENSES/XRPL-Standards-MIT.txt` | XRPL-Standards master LICENSE |
| `LICENSES/xrpl-dev-portal-MIT.txt` | Dev portal master LICENSE |
| `LICENSES/ripple-binary-codec-ISC.txt` | Installed 2.9.0 package LICENSE |

For those identified distributions, the copyright, permission/conditions and disclaimer texts travel in `LICENSES/`, with NOTICE pointing to them. I found no endorsement claim violating the BSD condition.

NOTICE’s patch count, package distinction and identified licence descriptions hold. The npm package contains WASM and no C source; its version file says 1.0.4. Neither inspected C repository snapshot had a root licence file. The owner’s accepted absence of redistribution permission for that C material remains an acknowledged limitation, not a new finding. The incomplete matcher cannot establish the exhaustive project list requested by step 1.

**Seam 4 — execution rehearsal: does not survive**

I exported `776ca25` and executed the revised sequence in scratch:

| Point | Result |
|---|---|
| Step 5: archive-log copy and first-screen README sentence, then commit | **1 commit** |
| Step 6: regenerate revision log, then artifact-only commit | **2 commits** |
| Worktree before step 7 | **Clean** |
| Recorded HEAD | `0e6c9b29eb9c1bcb6d788f620e2067fc2966d8e7` |
| Sweep without `--rev`, with mandatory `--no-local-store` restriction | **97/97 controls; 660 tree files; 659 history objects; PASS-SHAPES-ONLY** |
| `make ci` | **227 pass, 5 skip, 0 fail; every step passed** |

The revision-log oracle explicitly reported that it did not run because its curated commits were absent and the archive file declared publication history. The resulting revision-log check passed.

This is **not** a full phase-1 PASS: the real-store known-value check was deliberately not run.

Findings:

- **R2-7 | HIGH | Step 7 scans history but permits historical personal data | D:332–336; `tools/check-no-secrets.ts:1134–1141` | Add `--strict-history` to the publication gate.**

  In a separate two-commit export, I put a synthetic personal home path in the first commit and removed it in the second. The prescribed history-enabled scan detected it under **REPORTED, NOT FAILED** and exited successfully. Adding `--strict-history` changed the result to **FAIL, exit 1**.

  The exemption still assumes history will be squashed away. Both publication commits are now published. Loading the real store does not change that personal-data filtering rule.

- **R2-8 | MEDIUM | The export publishes contradictory commit-count statements | `README.md:384`; D:317–331 | Replace the remaining single-commit sentence before creating the export.**

  Step 5’s added first-screen sentence says two commits; README:384 still says “a single squashed publication commit.” The rehearsal produces two, so the latter statement will be false on publication day.

- **R2-10 | MEDIUM | D7’s swept payload excludes titles that it publishes | D:245–250 | Freeze and sweep a manifest containing each number, title and body, then create from those exact fields.**

  Only bodies are explicitly written to files and swept. `gh issue create --body-file` binds the body; it does not bind or sweep the title.

  The allowed metadata query confirmed thirteen issues, ten closed, three open, seventeen comments and the stated withheld-ID locations. I found no demonstrated sensitive title. Semantic clearance of the open bodies remains pending the owner’s required reading; the metadata-only query cannot establish it.

Steps 8–10 otherwise have the necessary sequencing improvements: staging remains private through CI and issue preparation; returned issue numbers must be checked; Discussions remain deferred; only the recorded SHA is pushed; protection uses the emitted context. The pinned action SHAs also matched their stated tags when queried. I did not execute any GitHub mutation.

D7 is operationally executable for the bodies, with its manual review still required. It does **not** yet establish that the complete title-plus-body payload is exactly what was swept.

**Seam 5 — the record: does not survive**

- **R2-9 | MEDIUM | The disclosure correction fixes the issuer example but leaves signer-disclosure copies current | `docs/decisions/ADR-0003-web-tier-trust-boundary.md:52,128`; `docs/architecture/ARCHITECTURE-2026-08-18.md:246` | Date these statements and state that E-241 removed the API disclosure.**

  The ADR still says the tier emits the socket path and candidate paths. The architecture still says the API returns the local socket path. `web/api/server.ts:109–123` withholds the path and note. Changing the adjacent issuer sentence at ADR:129 did not discharge the class of stale disclosure descriptions.

- **R2-12 | LOW | Current status summaries contradict completed work and the review record | D:21,124–126 versus 282–290; `docs/NEXT-SESSION-PROMPT.md:1,31`; `CLAIMS.md:382–383`; `README.md:367` | Mark historical status statements with their observation point and update current summaries.**

  Examples include D8 described as open despite its recorded ruling, and D3 saying NOTICE does not exist despite the committed file. E-323’s “inventory not done” is accurate as a historical checkpoint but needs that qualification beside E-324’s completion.

  E-322 still says “No review round cites E-241”; round one explicitly cites it at `docs/reviews/REVIEW-057-packets/round-one-output.md:187`. README:367 also retains the now-unqualified claim that no review round has looked at the removal.

E-322’s added admission that its sweep was incomplete is supported. E-323’s round-one measurements and two-commit repair are supported, subject to the surviving qualifications above. E-324’s six-project detector result reproduces, but its comparison-scope sentence is false and its result cannot establish completeness.

I searched tracked files for copies of the false sentences. The single-commit promise remains active in README:384, with historical copies in the round-one transcript. The all-files comparison claim appears in D:145 and E-324. The signer-disclosure copies are listed under R2-9, with another historical packet copy. The stale review claims appear in E-322 and README:367, plus transcript snapshots. Historical packets should retain their text with contextual supersession; active summaries need correction.

| Finding | Seam(s) | Severity | Finding |
|---|---|---|---|
| R2-1 | 1, 2 | **HIGH** | Replacement refs hide private ancestry while original history is pushed |
| R2-2 | 1, 2 | **HIGH** | Shallow installation records the wrong root |
| R2-3 | 1, 2 | **HIGH** | GitHub.com destination identity is checked against an unpinned API host |
| R2-4 | 2 | MEDIUM | Non-commit fail-open mutant passes the guard gate |
| R2-5 | 1, 3 | MEDIUM | Numbering and code reflow hide reproduced source |
| R2-6 | 1, 3 | MEDIUM | Names-only NOTICE and missing BSD licence still pass |
| R2-7 | 1, 4 | **HIGH** | Publication gate permits personal data in published history |
| R2-8 | 1, 4, 5 | MEDIUM | README retains the single-commit promise |
| R2-9 | 1, 5 | MEDIUM | Current-tense signer-disclosure claims survive |
| R2-10 | 1, 4 | MEDIUM | Issue titles are outside the frozen, swept payload |
| R2-11 | 3, 5 | LOW | Comparison count and scope are overstated |
| R2-12 | 5 | LOW | Current progress and review-status assertions remain stale |

Seam 1: **does not survive** — six fixes are only partly discharged.

Seam 2: **does not survive** — private-history bypasses and a surviving broken-hook mutant were demonstrated.

Seam 3: **does not survive** — existing quotations are missed and missing notices can pass.

Seam 4: **does not survive** — the two-commit rehearsal passes, but the prescribed gate tolerates published historical personal data.

Seam 5: **does not survive** — stale factual statements and overstated measurements remain.

**The single change I would make before step 3:** replace the guard’s ancestry exemption with an archive-ID allowlist for every non-deletion push from a private clone, resolving that ID explicitly through `gh api --hostname github.com`. The separate export is already the designated publication environment.