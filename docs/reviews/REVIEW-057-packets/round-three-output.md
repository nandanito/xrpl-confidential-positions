Step 0: **GitHub 200; npm 200.** `gh` reported an active login as `nandanito`.

Working directory: `$USER_TMP/T/review057r3.NMFyrF/repo`  
HEAD: **`a36f165` — Regenerate the revision log after E-325**

**Step 3 should not run yet. I found 14 findings: seven HIGH, six MEDIUM, one LOW. All four seams fail.**

The review clone is clean and remains at `a36f165`. Test commits were confined to disposable repositories. Push receivers were local bare repositories; SSH transport probes used a shim that executed local `git-receive-pack`. No push contacted GitHub, and no GitHub changes were made. [Probe results and logs]($USER_TMP/T/review057r3-evidence.27775tok/summary.json) were preserved outside the clone; temporary repositories and downloaded corpora were removed.

Below, **D** means `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md`.

**Seam 1 — the round-two fixes: does not survive**

| Finding | Verdict | Assessment against the class |
|---|---|---|
| R2-1: replacement refs hide private ancestry | **Discharged** | The hook no longer inspects ancestry. Replacement objects cannot alter its destination decision. Other destination bypasses remain below. |
| R2-2: shallow installation records the wrong root | **Discharged** | Installation records no roots; shallow boundaries no longer affect that decision. |
| R2-3: archive identity is resolved on an unpinned API host | **Discharged in part** | `GH_HOST` is defeated, but `gh` transport configuration can still supply the answer from elsewhere. R3-2. |
| R2-4: the gate misses removal of non-commit protection | **Discharged in part** | The original branch disappeared, but a blob-tag exception still passes the entire replacement gate. R3-6. |
| R2-5: formatting hides substantial reproduced source | **Discharged in part** | Numbered source is detected. Joined numeric source, reflowed manifests and licence-adjacent source still disappear. R3-7–R3-8. |
| R2-6: NOTICE validation accepts missing obligations | **Discharged in part** | Names and missing ordinary files are checked. A licence available locally through a symlink passes while its bytes are absent from the export. R3-10. |
| R2-7: historical personal data is reported rather than failed | **Discharged** | Step 7 now requires `--strict-history`; the controls and export rehearsal exercise that mode. |
| R2-8: README promises one commit | **Discharged** | The active README and publication instructions now specify two; the rehearsal produced two. |
| R2-9: signer-disclosure descriptions remain current | **Discharged** | The cited ADR and architecture sentences now date the disclosure and identify E-241’s removal. |
| R2-10: issue titles are outside the swept payload | **Discharged in part** | Titles now belong to the manifest, but scanning its serialized bytes does not establish that decoded publication fields were scanned. R3-13. |
| R2-11: comparison count and scope are overstated | **Discharged** | The stock run reproduces 108 configured, 94 compared, 14 unavailable. The report describes its selection. That selection remains inadequate. |
| R2-12: current summaries contradict completed work | **Discharged in part** | Several instances were corrected, but the handoff headline overstates review coverage and historical “not done” statements remain insufficiently scoped. R3-14. |

**Seam 2 — the redesigned guard: does not survive**

The stock gate returned:

```text
check-push-guard: verdict=PASS cases=25 mutants=9 exit=0
```

The additional attacks found:

- **R3-1 | HIGH | A remote named `--parse-url` bypasses destination authorization | `tools/git-hooks/pre-push:70–72` | Give parser mode an invocation that cannot overlap Git’s two hook arguments, and add this remote-name case.**

  I configured that remote name with a different repository URL. Git invoked the parser-only branch, which exited successfully before checking configuration, repository ID or visibility. With the local SSH receiver shim, the push succeeded and the receiver contained the toy private file and history.

- **R3-2 | HIGH | `--hostname github.com` does not pin the API connection | `tools/git-hooks/pre-push:91–95`; `tools/install-push-guard.sh:37` | Isolate or reject API routing overrides, including `http_unix_socket` and `api_host`, before trusting the response.**

  Using the **real `gh` binary**, a custom `GH_CONFIG_DIR`, a synthetic token and a local Unix-socket HTTP server, `gh api --hostname github.com repos/pub/lic` returned the locally supplied `100 true`. The unmodified hook then accepted that different repository as archive ID 100. The local server recorded both requests. GitHub documents these routing settings in its [CLI configuration manual](https://cli.github.com/manual/gh_config).

- **R3-3 | HIGH | The hook authenticates the URL’s repository, not the receiving transport | `tools/git-hooks/pre-push:22–24,87–102` | Constrain permitted transports and reject routing overrides that prevent establishing the actual destination.**

  Both `GIT_SSH_COMMAND` and `core.sshCommand` redirected an archive-looking SSH URL to another local bare repository. The hook accepted the archive ID; the other receiver obtained the private fixture. SSH host configuration and transport commands therefore remain outside the claimed property.

- **R3-4 | HIGH | Installation from a subdirectory reports success but installs outside the clone’s effective hooks directory | `tools/install-push-guard.sh:25–27,46–48` | Resolve the hooks path absolutely, or resolve its relative result against the invoking directory.**

  From `private/tools`, Git returned `../.git/hooks`. The installer prepended the repository root, producing `private/../.git/hooks/pre-push`. It exited 0 while `private/.git/hooks/pre-push` was absent. A subsequent direct push to a local bare repository succeeded and delivered the private fixture.

- **R3-5 | HIGH | Reinstallation can replace the trusted archive ID with a stale push URL’s repository ID | `tools/install-push-guard.sh:32–43`; D:360–363 | Preserve the established archive ID across reinstalls and validate every push URL; explicitly reconcile `pushurl` in step 8.**

  I started with archive ID 100, set a stale `remote.origin.pushurl` to repository 200, and executed step 8’s `git remote set-url origin` correction. The fetch URL became the archive; the push URL stayed elsewhere. Installation succeeded, overwrote the archive ID with 200, and the hook subsequently accepted that destination. A newly created publication repository is still private at this point, so the visibility check does not prevent this mistake.

- **R3-6 | MEDIUM | A broken hook still passes the complete self-test | `tools/check-push-guard.sh:173–199,234–254,260–290` | Add actual tag/blob/tree pushes and mutants covering their destination checks.**

  My mutant added an early success return for `refs/tags/*`. The complete gate still reported **PASS, 25 cases, 9 mutants**. Installed in the toy private clone, it allowed a private blob tag into a local receiver.

Controls that held: `insteadOf`, `pushInsteadOf` and `pushurl` rewrites exposed the rewritten non-archive destination to the hook and were refused. Linked-worktree installation reached the common hook directory. The stock missing-configuration, missing-`gh`, API-error, visibility and ID cases passed. Explicit `file://`, local, `ext::` and helper-style destinations were refused. The parser-only exit is the additional fail-open path.

**Seam 3 — the rebuilt inventory: does not survive**

The requested stock command exited 0 and found seven projects. Its 94 comparison records agree with the committed count. All six committed licence copies passed its byte comparisons.

- **R3-7 | HIGH | Existing Emscripten quotations are omitted, making D3’s seven-project statement false | `tools/inventory-third-party.ts:128–148,153,294–298`; D:154–160; `docs/evidence/f12-emsdk-2026-10-18/logs/05-cause-changelog.log:9–48` | Include the committed log formats and Emscripten corpus, add its notice, and revise the exhaustive count.**

  The tracked F-12 logs reproduce Emscripten’s changelog. I matched **36 substantive lines** against upstream 6.0.5 without printing them, including runs at local lines **9–19, 23–34 and 44–48**. Neither `.log` files nor Emscripten enter the inventory. `NOTICE` and `LICENSES/` contain no Emscripten entry. Its upstream [licence file](https://github.com/emscripten-core/emscripten/blob/6.0.5/LICENSE) provides MIT and University of Illinois/NCSA terms.

- **R3-8 | MEDIUM | Broad exclusions suppress real copied material | `tools/inventory-third-party.ts:194–200,249–254,329–332,395–397` | Replace blanket exclusions with narrow allowances, and retain attribution for qualifying source within mixed runs.**

  The probes showed:

  | Material | Result |
  |---|---|
  | Numbered `@noble/hashes` source | Detected |
  | Diff-prefixed copy of the same source | Detected |
  | Same whole source saved as `.log`, 3,068 bytes | Omitted |
  | Joined rippled test-vector initializer, **94,993 bytes / 991 original lines** | Omitted; original layout detected |
  | Reflowed React manifest, 1,242 bytes | Omitted |
  | Reflowed Elysia manifest, 6,857 bytes | Omitted |
  | Four qualifying HMAC source lines alone | Attributed |
  | The same four lines adjacent to licence text | Entire run classified as licence text; source attribution lost |

  The numeric source had no identifier tokens, so every token window failed the names threshold. Its upstream file’s longest line was only 98 characters: this was not the minified-file exclusion.

- **R3-9 | MEDIUM | `DERIVED_FROM` replaces ambiguity with unsupported provenance | `tools/inventory-third-party.ts:278–289` | Resolve provenance per quotation, retaining ambiguity until evidence establishes the source.**

  I planted a quotation explicitly identified as coming from `XRPLF/clio`, `src/util/MPTIssuanceUtils.cpp:3–6`. Because rippled also held those lines, the inventory reported only rippled. Library dependence does not establish where a quotation was copied from. This demonstrates loss of known immediate provenance; it does not establish a separate copyright obligation for those includes.

- **R3-10 | MEDIUM | NOTICE validation checks local licence bytes rather than shipped licence bytes | `tools/inventory-third-party.ts:554–559` | Require a tracked regular file and validate the bytes and mode in the publication tree.**

  I replaced `LICENSES/noble-curves-MIT.txt` with a symlink to its correct licence inside ignored `node_modules`. The check passed. An archive of the staged publication tree contained the symlink, omitted `node_modules`, and had **no readable licence bytes** at the promised path.

  With the positive-control project properly noticed, the full probe run returned:

  ```text
  check: PASS — every one of 8 projects found has a NOTICE entry,
  and each licensed one a verbatim LICENSES/ file
  ```

  That PASS coexisted with the dangling shipped notice and the missed quotations above.

The other NOTICE checks held: the patch has **756 added, 500 removed and 341 context lines**, including **764 nonblank upstream lines**. The installed npm package is ISC-licensed, contains WASM and no C files. The acknowledged absence of a C-source redistribution grant remains the owner’s accepted limitation. I found no new discrepancy in the six committed licence texts themselves.

**Seam 4 — publication steps 5–10: does not survive**

The clean rehearsal produced:

| Check | Result |
|---|---|
| Publication commits | **2** |
| Worktree before the clean gate | Clean |
| Withheld file and unscrubbed-log directory | Absent from tracked export |
| NOTICE | Present |
| Shape-only strict-history gate | **97/97 controls; 666 tree files; 665 history objects; PASS-SHAPES-ONLY** |
| `make ci` | **227 pass, 5 skip, 0 fail; every step passed** |
| Explicit synthetic-store gate | **PASS**, one generated secret loaded from one explicitly named test file |
| Real local-store gate | **Not run** |

The synthetic-store result establishes that the store-aware invocation runs. It does **not** establish the required phase 1 PASS with the owner’s real store, which your restrictions prohibited reading.

- **R3-11 | MEDIUM | No publication gate re-runs the inventory on the export | D:339–359; `tools/ci.sh:35–44` | Regenerate and reconcile the inventory on the prepared export before committing, then verify it remains unchanged on the sealed commit.**

  Step 1 is marked done; step 7 and CI omit the inventory. The export already has **593 inventory-selected files**, while its published report says **592**, because the archive revision log was added. Later review records can also introduce quotations, as round two itself demonstrated.

- **R3-12 | MEDIUM | The literal publication-date placeholder passes both gates | D:342–347,354–359 | Require substitution before the first commit and reject remaining publication placeholders in step 7.**

  I followed the prescribed sentence with `published on DATE`. The clean strict-history shape gate and every CI step passed with that literal text still present.

- **R3-13 | HIGH | Sweeping a frozen manifest does not ensure the published decoded fields were swept | D:265–272; `tools/check-no-secrets.ts:594–598,1172–1190,1227–1231` | Freeze and sweep the exact decoded UTF-8 title/body bytes, bind them by hash, and create issues from those same files. Supply an executable payload-sweep procedure.**

  A valid JSON manifest encoded a generated synthetic seed using Unicode escapes. Through the real detector, the serialized manifest produced **zero hits**; its decoded publication fields produced a **seed hit**. The round trip preserved the body exactly.

  There is also no usable manifest-only CLI procedure specified: sweeping a separate synthetic payload repository returned **CONTROL-FAILED, exit 2**, because the full-repository citation controls were absent. Passing the manifest envelope directly as `--body-file` would publish that envelope, rather than the body field.

- **R3-14 | LOW | Current status text still overstates review completion | `docs/NEXT-SESSION-PROMPT.md:1,31`; `CLAIMS.md:383` | Correct the headline and explicitly date historical unfinished-work statements.**

  The headline says steps 1 and 2 are “reviewed twice”, while line 31 correctly says the rebuilt inventory and redesigned guard await review. E-323’s “Not done” inventory/round-two statement also remains without an explicit observation-point qualification.

For steps 8–10, the recorded-SHA push, private staging CI, observed check context and issue-number mismatch stop are useful controls. Step 8 nevertheless has the stale-`pushurl` enrollment defect above.

The allowed metadata query confirmed **13 issues, ten closed, three open and 17 comments**, with the stated withheld-ID locations. I did not read issue prose, perform semantic clearance, create issues, rename repositories, change visibility, run hosted CI or configure protection. D7 requires the decoded-field sweep and extraction procedure above before it is executable as a publication procedure.

| Finding | Seam(s) | Severity | Finding |
|---|---|---|---|
| R3-1 | 2 | **HIGH** | `--parse-url` remote bypasses authorization |
| R3-2 | 1, 2 | **HIGH** | Real `gh` accepts identity responses through alternate routing |
| R3-3 | 2 | **HIGH** | Authorized URL can send private history to another receiver |
| R3-4 | 2 | **HIGH** | Subdirectory installation succeeds without protecting the clone |
| R3-5 | 2, 4 | **HIGH** | Stale push URL replaces the trusted archive ID |
| R3-6 | 1, 2 | MEDIUM | Blob-tag bypass mutant passes the complete guard gate |
| R3-7 | 1, 3 | **HIGH** | Existing Emscripten quotations invalidate the seven-project claim |
| R3-8 | 1, 3 | MEDIUM | Numeric, manifest, extension and licence exclusions hide copies |
| R3-9 | 3 | MEDIUM | Global provenance rule discards known quotation provenance |
| R3-10 | 1, 3 | MEDIUM | Locally readable licence passes while exported notice is missing |
| R3-11 | 4 | MEDIUM | Inventory is not checked on the publication export |
| R3-12 | 4 | MEDIUM | Publication-date placeholder survives the gates |
| R3-13 | 1, 4 | **HIGH** | Serialized manifest sweep misses secrets in decoded publication fields |
| R3-14 | 1, 4 | LOW | Review and completion summaries remain misleading |

Seam 1: **does not survive** — six fixes remain only partly discharged.  
Seam 2: **does not survive** — five authorization/installation failures and a surviving mutant.  
Seam 3: **does not survive** — existing omissions, suppressed quotations, wrong provenance and missing exported notice bytes.  
Seam 4: **does not survive** — the final inventory, date and exact issue payload are not adequately gated.

**The single change I would make before step 3: adopt D8-B credential isolation, so credentials available to private clones cannot write the publication repository. The redesigned hook still cannot support D8-A’s claimed protection.**