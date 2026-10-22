# NEXT SESSION — the explainer is built and reviewed; the owner's redeploy, then phase 3's posts

⚠ **The launch plan is `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`** (`CLAIMS.md` E-309). Phases 0 to 2 are done. The repository is public at `https://github.com/nandanito/xrpl-confidential-positions`, and the demo serves at `https://xrpl-confidential-positions.vercel.app`, deployed on 2026-10-20 from the public commit `34ed67a` (E-336), redeployed from `ccf76e7` (E-339), and redeployed on 2026-10-21 from `62fcac3`, the build `REVIEW-059` reviewed (E-349). **An explainer page, `/how-it-works`, and a rewritten overview are built and read twice (E-350, `REVIEW-060`), and not yet deployed.** **Phase 3 has begun with its gate, the filing re-survey (E-341). No post is drafted.**

## WHERE THIS LEFT OFF

The work is on `build/step-9-explainer` in the private archive, branched from `review/step-9-build`. ⚠ Read `git log --oneline -12` and `git status -sb` before trusting this.

The public repository's `main` was at `62fcac3` (PR #18), carrying register rows up to E-348. **The public update made from this commit carries E-349, E-350 and R-7**; read the public `main`'s log for its commit.

**2026-10-21 and the night into 2026-10-22, the explainer:**

- **The owner asked for an explainer** because the overview did not orient a reader: what a confidential transfer is, how a position works, what the example is. Ruled: a new `/how-it-works` page and a short overview (option 1), the receivables facility told in text with the note that the site shows four test accounts and not the facility, and two reads before deploying.
- **Built and read twice** (E-350, `REVIEW-060c`). Leg A, Codex with the repository, upheld nine findings against the register; leg B, a newcomer with only the rendered text, fourteen, two in part, and six were rejected. Fixed at `c4bc2fe`: `make ci` passed, the gate 70 of 70 controls, the browser check 7 pages and 53 requests, its self-test passed, and each new control failed with its check removed.
- **The gate now admits two repository files as links**, `CLAIMS.md` and the facility walkthrough, at the build's commit only, and refuses a repository link at any other commit in any file; the browser check refuses one in the rendered page, which finds a link a script assembles.
- **R-7**: `WHAT-CONFIDENTIAL-MEANS` said a holder who converts 500 and converts back 400 shows that 100 *"left by transfer"*; it may still be held. The README's rewrite had corrected the same sentence with no row.
- **The plan's two changes**, ruled the same day: `make check-inventory-fresh` in the public update procedure, and `compare-deployed` on each post's day. The Japanese docs page is deferred.

**2026-10-21, earlier the same day:**

- **The full suite ran**, its first run since `7a7c9fc`: 26 steps at `11c43a4` by one script, plus `rebuild-env` and the amendment read, all exit 0 and the tree clean before and after.
- **The public update and the redeploy** (E-349). PR #18 carried E-339 to E-348 and public `main` was fast-forwarded to `62fcac3`. Built at ledger 6,288,453 into `wconf-hosted-builds/62fcac3447e5`; the gate passed 66 of 66 controls, the browser check six pages and 47 requests, and the preflight passed. The owner deployed it, and `compare-deployed` passed at 2026-10-21T05:03Z, with a zeroed digest and an altered header each failing against the live host.
- **The owner's follow-ups, later the same day.** `make check-inventory-fresh` now regenerates the inventory and compares it with `HEAD`. Its first run failed for a real reason: E-349's own row had moved the `CLAIMS.md` lines the inventory cites, which is the drift E-349 records (`2733ffd`). Three breaks each fail it: shifted lines, a staged copy, and the tool refusing an untracked file. The plan now re-runs `compare-deployed` on the day each post goes out, and the Japanese docs page is deferred.
- **Two stale things found on the way.** The archive's third-party inventory had cited line numbers from before E-342 (`c7898cd` regenerates it), and two architecture lines said round two was still to come after round three had run (struck in E-349).

**2026-10-20 and the morning of 2026-10-21, the previous session:**

- **The filing re-survey, phase 3's gate** (E-341, `docs/evidence/upstream-survey-2026-10-20/README.md`). Nothing changed on any of the eleven filings since 2026-10-18. Two things E-316 had missed: **#3879's fix reached the English docs page only** (the Japanese translation still says the encrypted zero is indistinguishable, served live at xrpl.org/ja), and **a draft standard, XLS-99, proposes holder key rotation and key-loss recovery**; its amendment is `Supported::No` in rippled `develop` and unknown to Mainnet, Testnet and Devnet. The README and the plan now name it.
- **`REVIEW-059`, the first outside review of step 9's build, two rounds.** Round one (E-342, `REVIEW-059c`): 24 findings upheld, two of them letting the release procedure publish what step 9 forbids with no check noticing, both measured. Fixes E-343, completed E-344. Round two (E-345, `REVIEW-059d`): **five fixes had not discharged their findings**, found only by the leg that ran each finding's own example; fixes E-346. Round three (E-347, `REVIEW-059e`), run on 2026-10-21 as the owner ruled: one repository leg on round two's fixes; three were still partial and two new browser gaps were measured; fixes E-348. **The rotation is closed**, as set before round three, so E-348's fixes are checked by their own tests and controls only.
- **Rebuilds of the fixes run through the whole procedure.** `wconf-hosted-builds/review059-r2-c08db2b` and `review059-r3-3934ae1` were built in two containers, the second with `--network none`; the gate, browser check and preflight run on them, and the preflight refuses them only for not being on public `main`. ⚠ They are review artifacts, not releases: rebuild from the public commit that carries E-348.

## 1. WHAT IS NEXT

**The owner's, open:**

0. **Redeploy with the explainer** (E-350). The public update, a rebuild from the public commit through `web/hosted/README.md`, the owner's deploy, and `compare-deployed` with its two breaking controls; then a register row for the deploy. ⚠ The gate now runs 70 controls and the browser check needs `build-manifest.json` beside the output.
1. ~~**A third review round on step 9**~~ **run and closed** (E-347, E-348).
2. ~~**The live site is stale.**~~ **Redeployed 2026-10-21 from `62fcac3`** (E-349). It served the output from before the review: the custody page still says a custodied account *"cannot derive its own ElGamal key"* without its exception, and the footer does not yet say the browser checks nothing. A public update carrying E-339 to E-348, a rebuild from that public commit through `web/hosted/README.md`'s steps, and the owner's redeploy change that. ⚠ Every release step changed in this review: the gate runs 66 controls, the browser check inspects more, the preflight validates the whole manifest, and the build refuses an `OUT` that is not new or empty.
3. **The Japanese docs page** (E-341): whether to tell upstream, by a comment on the closed #3879 or a new dev-portal issue, through `/upstream-issue` and `/issue-review`. The owner's. **Deferred by the owner on 2026-10-21: later.** Until then, a post that calls #3879 fixed says the English page.
4. **Vercel housekeeping:** deleting a stray empty project, and letting the deploy token expire (E-340).
5. **D8's C, the ruleset**: *not yet*, ruled 2026-10-19.

**Then phase 3, the posts.** The survey is done as of 2026-10-20; if drafting starts days later, run it again, because E-316 and E-341 each found something. ⚠ **The posts must say *"no rotation or recovery in XLS-96, or on Mainnet, Testnet or Devnet"* and name XLS-99 as a draft** (the plan says so since E-341). Each draft runs `claims-check` and one adversarial read, and the owner signs off the final text. Read the plan's phase 3 whole. **Ruled 2026-10-21:** re-run `compare-deployed` on the day each post goes out, after breaking it on a copy, and the post waits if it fails.

**Rebuilding the demo** is by hand and is the README's seven steps again. ⚠ Since E-343 the build refuses an `OUT` that is not new or empty, and refuses a tree that is not the commit's. It needs a commit on public `main`, the OrbStack Docker context, the local secret store for the gate, and the owner's project-scoped token for the deploy only. The URL stays `https://xrpl-confidential-positions.vercel.app`, because the footer names it.

**How a public update is made**, as it was done: change the file in this archive and commit here; run `make check-inventory-fresh` here and commit the regenerated inventory if it fails; copy the changed files to `…/ripple/xrpl-confidential-positions-public`, re-inserting the README's publication note; `git add` them, then `make inventory-third-party` there, which refuses on untracked files since E-332; commit; regenerate `docs/CLAIMS-REVISIONS.md` there as its own commit if `CLAIMS.md` changed; run `check-no-secrets --repo <public> --strict-history` with the local store and `make ci`; push a branch, open a PR, and once `checks` is green **fast-forward** `main` to it. ⚠ **Never squash or rebase a public PR**: the revision log names the commit that last changed `CLAIMS.md`, and a rewritten commit fails `check-claims-revisions` on `main`.

---

## 2. PHASE 2 — for the record

**Ruled 2026-10-19** (E-331): H3, prerendered pages, with an indefinite snapshot rebuilt by hand on an isolated build machine; the D-H2 wording accepted as written; A, no issuer figure; the prebuilt CLI deploy. `ADR-0004` is `Accepted` at revision 5; its rotation, `REVIEW-058`, ran three rounds.

**Built 2026-10-20** (E-334, E-335). The owner ruled seroval's licence email redacted in the shipped notice, and the gate checks each notice against the package's own file with only addresses removed. The owner kept the CLI deploy over Git integration. **Deployed the same day** (E-336).

---

## 3. PHASE 1 AND THE FOUR FILINGS — for the record

**Phase 1 was published on 2026-10-19.** `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md` records the ten steps, D1 to D8 and their rulings, and `REVIEW-056` and `REVIEW-057`; E-317 to E-326 are the register's account. ⚠ **Step 7's gate is the sweep on the exact published commit, and no rehearsal substitutes for it**; a later public update runs it again.

**All four filings are sent** (E-315): F-9 `mpt-crypto#148`, F-17 `#153`, F-12 `#154`, F-13 `#155`. The owner invokes `/upstream-issue` and `/issue-review`; a session must not run them on its own. Phase 3's posts re-survey every filing at source before a word is drafted.

---

## 4. STILL OPEN — the standing backlog

- **Issue #14, an epic for live transfers on the hosted demo**, filed on the archive only on 2026-10-20 and labelled `decision`. It prices three shapes: the visitor's browser signs, a server signs with the demo accounts' keys, or a local setup guide instead. The first two reopen ADR-0001 and ADR-0004. The owner may pursue it later; for the posts the snapshot demo stands, and nothing is built before a new ADR is ruled and reviewed.
- **⚠⚠ `B-30` — the Sherlock XRP Ledger Attackathon, contest 1260.** A second audit covering **Confidential Transfers for MPTs**, 96 valid findings, 2 critical and 6 high. **Not obtainable by the two conventional routes** — no `sherlock-audit` repository, `/contests/1260/report` is 404 — so it is B-13's shape. ⚠ `rippled#6885`, *"[XLS-0096] ElGamal Ciphertext Malleability in ConvertBack"*, is **open**; read 2026-09-22, it cites no Sherlock finding and only speculates about the contest's scope. The primary evidence that Sherlock findings reached Confidential Transfer code is `mpt-crypto#102`, citing **Sherlock #2759 (Medium)** against MergeInbox.
- **`paper/cmpt-progress-and-changes.tex` is internal and unobtainable.** `mpt-crypto#107` locates it in `confidential-transactions` / `internal-ripplex-research`; #101, #102, #103 and #107 cite it, two by its `\section{Sherlock Audit (April--May 2026) Cross-Reference}`. It is the document that would settle F-13.
- **`U-56`, withheld:** `mpt-crypto` `1.0.5` has **no `install()` rule in any CMake file** while `conanfile.py`'s `package()` is a bare `cmake.install()`. Unresolved — resolving it needs a build.
- ~~**Devnet runs rippled `3.4.0-rc5`, which has no public tag or branch.**~~ ⚠ **Superseded 2026-10-18: `server_info` reads rippled 3.4.1** (E-319). Anything read at `develop` is still not a reading of what Devnet runs; check the tag before reading source against it.
- **Found and NOT recorded:** E-14, E-27 and F-18 say rippled `3.3.0` pins mpt-crypto `0.4.0-rc4`; rippled's `conan.lock` at tag `3.3.0` pins `mpt-crypto/1.0.2`. No size or proof claim moves.
- **`U-55`, withheld:** `xrpl@5.2.0` signs a LoanSet's counterparty role under the new prefix whether or not the network has `fixCleanup3_4_0`. Not run.
- **`B-27`** — ruled, rotation closed at two rounds with one dissent, which is the owner's to overrule. **Issue #10** — the liftable keygen-derivation document, a Desktop decision. **Issue #8** — Bulletproof blinding, off the critical path. **Issue #5** (the Trail of Bits May revision, B-13) is open; **#6 closed** when F-12 was filed.
- **The signer's hand-written FFI rests on `mpt-crypto-sys@0.1.0-beta.1`**, and `0.1.0` pins `1.0.4`. Not re-weighed.
- **B-15's step-8 position** — never asked. **B-17 — `terFROZEN` preflight.** **ADR-0002 `Proposed` on item 4**; ~~**ADR-0003 `Proposed` on the issuer route.**~~ **`Accepted` 2026-09-05, revision 3**: the route was ruled and the disclosure removed (E-241). This line was stale for six weeks.
- **`acc` in `reduce_wide_mod`** — a named residual, priced, deliberately open. **No loopback run, ever** — E-151's named risk acceptance.
- **`U-58` and `U-59`, withheld, captured 2026-10-19:** the public Devnet JSON-RPC endpoint refuses browser pages while its WebSocket endpoint answers them, and `@xrplf/mpt-crypto@0.1.0` exposes provers and no verifiers though its WASM build has seven. Not graded, not searched.
- **The facility reader's decimal-form difference from the Rust reader** (E-330), documented and not closed. Closing it means reading the raw response text.
- **`REVIEW-059`'s named residuals**: the ledger hash is not pinned (R1-9); code that runs during `bun install` or the snapshot has the network and, on OrbStack, the build machine's loopback through `host.docker.internal` (S-2, measured); dependency code can write the tree after the tree check (R1-10's second half). Leg A of round two gave an exact container probe for the last, in `REVIEW-059-packets/round-two-codex-output.md`; not run.
- **XLS-99, the draft key-rotation standard** (E-341). Not read beyond its header and abstract. If it is enabled anywhere, P-10's wording and every page saying there is no rotation or recovery need re-reading.

---

## BEFORE RUNNING ANYTHING

```bash
pwd                                        # gates from the wrong directory report nonsense
tools/rebuild-env.sh                       # compare both state.json copies FIRST
bun run tools/check-amendments.ts          # date-stamp it; never assert from memory
make check-zeroize-bounds                  # FIRST, not last — it REWRITES signer/ while it runs
make break-zeroize-lock                    # its falsifier; needs a clean signer/
make check-tables check-negative-claims check-personas check-blinding \
     check-test-support check-loopback check-web-readonly \
     check-disclosure-phrases check-claims-index check-claims-topics \
     check-claims-revisions check-emphasis
make check-filing FILE=docs/upstream-filings/TEMPLATE.md   # POSITIVE control
make check-vocabulary check-no-secrets     # the second needs the local store; refuses without it
make break-no-secrets-gate                 # 93 probes; writes untracked plants for seconds — no git add -A meanwhile
make break-no-secrets-gate-self-test
make ci                                    # exactly what GitHub Actions runs
make break-emphasis-gate                   # refuses on a dirty tree — commit first
make break-emphasis-gate-self-test
python3 tools/break-secret-file-modes.py   # B-29's falsifier; refuses on a dirty tree
cd signer && cargo test                    # sum EVERY "test result:" line
```

**The hosted release is not in this list.** Its gates need an output directory; `web/hosted/README.md` gives the commands.

**Full suite green at `7a7c9fc`, 2026-10-19**, every line above plus `make vendor-verify`, run by one script with a log per step and no pipes: 28 steps, all exit 0, tree clean before and after. `cargo test` summed 21 result lines to 279 / 0 / 4 on both runs; `make ci` gave 236 pass, 5 skip, 0 fail; the sweep 97/97 controls and 83 probes. **Since then no file under `signer/` has changed.** On the tip after E-340: `make ci` 273 / 5 / 0, and the register gates pass. Amendments read `2026-10-20T04:17:17.621Z`: `ConfidentialTransfer` enabled on Devnet, supported and not enabled on Mainnet and Testnet. At step 9 (E-334) `check-no-secrets` ran 111 controls and `break-no-secrets-gate` 93 probes. ~~⚠ **The full 28-step suite has not been re-run since `7a7c9fc`.**~~ **Re-run at `11c43a4` on 2026-10-21**: 26 steps by one script, plus `rebuild-env` and the amendment read, all exit 0 and the tree clean before and after; `cargo test` 279 / 0 / 4 on both runs, `make ci` 305 / 5 / 0, `check-no-secrets` 111 controls, `break-no-secrets-gate` 93 probes. Amendments read `2026-10-21T03:09:59.013Z`, unchanged. On the tip after E-348: `make ci` 305 / 5 / 0, the register gates and `check-no-secrets` pass. Amendments read `2026-10-20T10:23:11.544Z`, unchanged. The hosted gate runs 66 controls, and the browser check counts 47 requests, because the overview's second load is now inspected.

⚠ **Editing `CLAIMS.md` takes TWO commits.** Commit the register change, then regenerate and commit `docs/CLAIMS-REVISIONS.md` **on its own**.

---

## TRAPS

- ⚠⚠ **OpenAI's filter stops a Codex leg whose prompt reads as an attack.** `REVIEW-059` round one's first leg A ran Step 0 and ended on *"This content was flagged for possible cybersecurity risk"*. Word leg prompts as a defensive code review of the project's own tooling: find defects, mutation tests on local copies, private configuration. Check stderr for a line starting `ERROR:`; a leg reading a file that quotes the phrase matches too.
- **`agy` can finish its report and not exit.** It ignored `SIGTERM`; `SIGKILL` lost nothing. Read the output's last line, not the exit.
- **zsh does not split `-c a=b -c c=d` held in a variable**, so `git $C commit` failed and nothing was committed. Write the options inline.
- **A removal whose target is a command substitution is blocked by a safety check** and needs the user. Build temporary repositories without deleting: `git --work-tree=<dir> add -A` commits a tree from another directory.
- **A control that probes a listener must use one that is listening and must not block it.** The build's loopback control first aimed at a port nothing served, then spawned the container synchronously so its own listener could not answer; both passed with the network on.
- **The rendered footer splits text with `<!-- -->`.** Match a sentence on `pageText()` from `tools/check-web-hosted.ts`, never on raw HTML.
- **Round two's leg A ran in a repository of two commits** built from `git archive` of the before and after trees, so `git diff HEAD~1` was the subject and no other history was present. Keep the adjudicator's self notes out of that tree.

- ⚠⚠ **A Content Security Policy hash is over the script text the browser parsed, not the file's bytes.** The parser turns CRLF and a lone CR into LF and NUL into U+FFFD, and TanStack Start's hydration script carries NUL bytes. `web/hosted/csp.ts` is the one hashing function; do not hash anywhere else (E-334).
- **Inside the build container, Vite under Bun could not prerender, and `localhost` resolved to `::1`.** The image runs Vite under Node, and the preview server binds `127.0.0.1`.
- **A literal U+FFFD in source made a `sed` mutation miss silently**, so the copy was not the break it was named for. Write a mutation against an exact string and check that it applied.
- **Vercel's dashboard does not make an empty project without a repository**; `vercel project create <name>` does. `vercel logout` revokes the token on Vercel's side (`DELETE /v3/user/tokens/current`, read in the 64.7.0 bundle). The CLI reads `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`, and an environment token takes precedence over a saved login.
- **A deploy command goes to the owner's own terminal, never through `!`**, so the token stays out of the transcript. Prefer `read -s VERCEL_TOKEN` over `--token`, which any local user can read in the process list.
- **The built pages hold NUL bytes, so `grep` treats them as binary and prints no match.** Use `grep -a`, or a check reads zero for text that is there (E-339).
- **`compare-deployed` prints only a verdict.** The counts behind E-336 came from the verdict file. Before believing a PASS, break it against the live host: zero one digest, alter one header.

- ⚠⚠ **A fake node for `facility/` must answer like rippled 3.4.1**: `validated: true` and a numeric `ledger_index` on every pinned answer, `entryNotFound` included, and a `LedgerEntryType` on every entry. The reader refuses anything else since E-329, and an old-style fake now fails with `REFUSED_LEDGER_TORN`.
- **The public Devnet JSON-RPC endpoint refuses browser pages**: no CORS header on the preflight or the response. Its WebSocket endpoint answered a page on `https://example.com`. The endpoint is a pool, so successive connections reach servers holding different history (E-327).
- **To quote a retracted phrase in a live file, strike it and cite its register row within six lines**, or `check-disclosure-phrases` fails, correctly. The window also forgives a neighbouring row's strike, so strike your own quotation rather than leaning on it.
- **Re-read every leg prompt against the frozen commit.** Both of `REVIEW-058`'s round-one prompts said the ADR recommended an option the draft had moved away from before freezing.
- **Vercel's GitHub app documents write access** to a connected repository's `Administration` and `Contents` (2026-09-17). That is why `ADR-0004` recommends a prebuilt CLI deploy.
- **The owner's Codex policy caps plan rounds at three per key.** `adr0004-plan` has used all three.
- ⚠⚠ **A review of `check-no-secrets` plants secrets, so its transcript fails the gate — correctly.** Do not weaken the gate to accept a leg's fixtures. Scrub personal paths with `tools/scrub-personal-data.ts`, then replace planted secrets with `tools/redact-review-fixtures.ts`, which refuses outside `docs/reviews/` and refuses on any value from the real store. Redirect a leg's output **outside** the repository while it runs, and copy it in afterwards, or the gate and the harness baseline see it half-written.
- ⚠ **A flaky control can be a real detector defect.** The Google key control failed one run in 30: the pattern was wrong, not the sample. Run controls in a loop (`for i in $(seq 1 30)`) before calling a flake noise.
- **git reads the index copy of a missing `.gitattributes`.** A control that deletes it from disk still sees it; `git rm` it from the index too.
- **zsh does not word-split an unquoted `$args`.** Use `${=args}`, or a probe passes its whole string as one argument and every result is wrong.
- **A file on disk is not a file in the tree.** `git check-ignore -v <path>` and `git ls-files <path>` before planning on what "the tree carries".

- ⚠⚠ **`check-zeroize-bounds` rewrites tracked files in `signer/` for as long as it runs, so the tree is NOT safe to read.** Do not let a repo-access review leg overlap it. The shape that works: write the packets, launch the **no-corpus** leg, run the gate suite, and launch the **repo** leg only once the tree is clean again. A wrapper that waits for the gate's marker, **checks `git status --porcelain` and refuses on a dirty tree**, then launches Codex, is worth rebuilding; the copy an earlier session wrote lived in its scratchpad and is gone.
- ⚠⚠ **A review packet that asks about a finding must CONTAIN that finding.** `REVIEW-048`'s leg B was asked whether the rows support filings for F-9, F-12, F-13 and F-17 and was given none of those rows' text. It reconstructed F-12 from a one-line summary, got it backwards, and ranked the result its HIGH. **E-160, with the adjudicator writing the excerpt.**
- **A GitHub search for a number matches issue numbers.** `gh search issues 'ElGamal 66 bytes' --owner XRPLF` returned eight hits, **every one of them issue #66**, in eight different repositories. Such a query establishes nothing.
- **An empty `total_count` needs a control.** `actions/workflows/<id>/runs` gave 0 for `build-wasm.yml` because it is `workflow_call`-only; `actions/runs` gave **684**. Without the second call the first reads as *the build never runs*.
- **A junk-bodied `ConfidentialMPTSend` with correctly sized fields passes preflight** and is applied as a `tec` in preclaim. Not a "nothing applies" control.
- **`2>/dev/null` in a lookup loop can turn a failed fetch into "no match".** Check that every fetch returned a body.
- ⚠ **zsh parses `$r:src/…` as a history modifier.** Write `"${r}:src/…"`. **Set `CONAN_HOME` before the FIRST `conan` command**, `--version` included.
- **An evidence cell can be shared.** Anchor on the row's own words.
- **`git merge -F -` does not read stdin.** Write the message to a file. **zsh**: quote `echo ====x` and `grep --include=*.ts`.
- **`git commit` is signed through 1Password**; on *"failed to fill whole buffer"* ask the user to unlock it.
- ⚠ **The user's Codex review-policy hook** (`~/.claude/hooks/codex-review-policy.sh`) allows a *targeted* `codex exec` round only for security, wire-contract or precedence-chain work, with an explicit effort and a `CODEX_ROUND=targeted:<reason>` marker, and requires `-m gpt-6-luna` on a docs-only diff (read from the hook on 2026-10-19; it said `gpt-5.6-luna` here until then). **Do not write in a reason to get past it.** For register reviews use `codex exec review -m gpt-6-luna -c model_reasoning_effort=high --skip-git-repo-check "<packet>" < /dev/null`: `codex review` rejects `-m`, and `--base` cannot be combined with a prompt. ⚠ **That pass runs `workspace-write`**, so check `git status --porcelain` before and after.
- **A `|` inside a code span still splits a GFM table cell.** Escape it as `\|`. `make check-tables` caught it.
- **Review legs:** `codex exec` needs `< /dev/null` and `--skip-git-repo-check`; watch **stderr grow**, not stdout. `agy` takes every flag **before** `-p` and needs a non-repo cwd.
- **`cd` persists between Bash calls.** **Devnet only, never mainnet.** **Branch as `<kind>/<slug>`.**

---

## WHAT THIS SESSION TAUGHT, kept because it is the transferable part

**2026-10-21 and 22, the explainer:**

- **A newcomer read finds true sentences a stranger misreads, and nothing else does.** The register read and the self pass passed *"without the figure"* beside *"the issuer can always read every balance"*, and *"some zero balances are recognisable"*; both are true, and a stranger read the first as a contradiction and the second as an edge case. For any page a stranger reads, give one leg the rendered text and nothing else.
- **A gate check written against the raw file passed the browser's spellings.** An entity-encoded `href`, a literal in a script and a link assembled at run time each passed the first commit check. Parse what the browser parses, and check the rendered page for what no file holds. `REVIEW-059`'s lesson, in the first check written after it.
- ⚠ **A change that looks like text still runs `make ci` before its first commit.** The web tier's wording tests live in `web/api`; only `web/hosted` was run, and a correct disclaimer failed one until the repository leg ran it.
- **A cache in `$TMPDIR` can lie after a night.** The inventory's corpus checkouts lost their done markers and one its git metadata; the tool trusts the marker. The intact ones were checked with `git status`. Suggested, not ruled: keep the cache outside `$TMPDIR`, or verify each checkout before using it.
- **Codex's native review pass prints only its findings.** Leg A's full report, with each section's *"no findings"* and what it did not check, was in its working directory. Collect that directory before deleting it.

**2026-10-21, the redeploy:**

- **A generated file that only one repository's procedure regenerates drifts in the other.** The archive's inventory was regenerated only when a public update ran, so `REVIEW-059`'s rows moved its line numbers with nothing noticing; the public regeneration differed from it and that is how it was found. `make check-inventory-fresh` now makes that comparison against `HEAD`, and its first run caught E-349's own row doing it again.
- **The lesson about stale states recurred one round later.** E-347 and E-348 closed the rotation and left two architecture lines saying round two was still to come. Grep for the state a round ends, at every round, not only when a ruling lands.

**2026-10-20, the filing survey and `REVIEW-059`:**

- ⚠⚠ **A ruling's one-line summary of a finding is the adjudicator's own fix report written in advance.** Round one's fixes were ticked against the summaries and four discharged half a finding (E-344); round two then found five more not discharged, each only by running the finding's own example (E-345). Tick the leg's words, and run its example.
- ⚠⚠ **Only the leg that could execute found what survived, for the third rotation running.** Round two's no-tools leg, given every finding and every changed file, ruled all of them discharged; the repository leg found twelve. A no-tools leg is for suspicion; it is not a verdict on a fix.
- **A survey's grep is as wide as the copies it reads.** E-316 grepped the English docs page; the Japanese translation, made from the text before the fix, still carried both sentences. And the line in XLS-0096 that points to XLS-99 had been read by E-316, quoted in a review packet and listed in a review transcript, and nobody captured it.
- **A disclaimer offered in place of a requested check can itself overclaim.** Round one answered *"add a regression for the issuer figure"* with a sentence saying a figure *"could enter only as text in a public commit"*, which the build's own residual contradicted.

**2026-10-20, phase 2 steps 3 to 5:**

- ⚠⚠ **The gate passed a policy every browser refused.** It hashed inline scripts over the file's bytes, its controls agreed with it, and the hydration of every page was blocked. Only loading the output in a real browser under its own headers showed it. **A gate that reads files checks what the files say; run the artifact where it is consumed before calling the gate's PASS the property.**
- ⚠ **Phase 1's lesson recurred within the day.** When the owner ruled the email (E-335), architecture §6 step 9 kept *"the gate fails until the owner rules"* until the deploy record found it. This file already said to grep for the state a ruling ends, and that was not self-executing either.
- **The inventory passed on a file it never saw**, because it read the index before `git add`. It refuses on untracked files now (E-332). A check over "the tree" must say which tree.
- **Isolation is shown by what fails to leak.** Canary variables, decoy stores and a self-test that fails with each check removed are what the build's isolation claim rests on, not the container's configuration.

**2026-10-19, phase 2 step 1:**

- ⚠⚠ **A check that a forger passes proves nothing about the secret.** The first draft offered a published issuer figure with a check against the public `ConfidentialOutstandingAmount`; anyone can split that public total among holders without the key, and round one's repository leg built two such forgeries. Before offering a check as evidence that someone used a secret, construct the forger first.
- ⚠⚠ **Two readers of one obligation had drifted on three checks, and the review fixed one check per round.** The Rust reader was the reference throughout. Diffing against its whole check list in round one would have found all three at once.
- **Only the leg that swept the whole tree found surviving copies.** In round two the inline leg ruled every fix discharged, and the repository leg found three that were not. Making `check-disclosure-phrases` join wrapped lines then found a sentence retracted in September still live in a comment.
- **Two of the author's own fixes narrowed the author's own findings**: S-8 lost its gate verdict, and R2-10 lost its unconditional token isolation. Tick the finding's own words, including your own.

**2026-10-18, phase 1:**

- ⚠⚠ **A plan can be ruled and still be unexecutable, and only executing it in rehearsal shows which.** `REVIEW-057`'s leg ran steps 4 to 6 in a scratch export and found four commits under a sentence promising one, and that the obvious repair, a squash, fails the revision-log gate. Reading the steps had not found it; this session wrote the steps and missed it twice.
- ⚠ **A mutant counts as caught only if its case passed without it.** The push guard's first self-test reported all 10 mutants caught while 17 cases were already failing on the real hook. It now refuses to evaluate mutants unless the baseline is green.
- ⚠⚠ **A ruling that changes state makes every sentence describing the old state false, and no gate finds those.** E-241 closed the issuer route on 2026-09-05; six weeks later the README, the web README, the front page, two API strings, `CLAUDE.md` and the demo script still described it as open. `check-disclosure-phrases` matches **retracted** phrases, and these were never retracted — they were true when written. **When a ruling lands, grep for the state it ends, not only for the claim it retracts.**

- ⚠⚠ **A fix written against a finding's example is not a fix for its class, and only the next round shows which.** Round one's fixes caught every input round one used; round two found three that covered the example only (a JSON label past a blank line, a 57-digit value, the AWS CLI's own spelling). **Write the control for the class the finding names, then ask what input the class contains that the example does not.**
- **Measure the publication before writing about it.** A `git archive` export into a fresh repository, gated in `--rev` mode, is cheap. It found the revision-log blocker and confirmed the excluded files are absent, which reasoning about "the squash" had not.
- **An allowance added to pass one's own review is the wrong direction.** Round two criticised three allowances added in round one; the fix for its own planted fixtures was redaction under refusals, not a fourth allowance.
- **Stack the branches and keep register rows on the tip.** Adding a row lower in a stack makes two branches insert after the same row.

**2026-09-22 and earlier:**

- ⚠⚠ **A register's *"has upstream raised this?"* check is only as wide as the corpus it reads, and nobody had asked what the corpus was.** Eleven sites answered it against Trail of Bits, two of them filings already sent; round one found six of them. A second audit of the same code existed, was public as a contest, and had never been named in this repository. **The instrument was never wrong on its own terms and was answering a narrower question than the one being asked.**
- ⚠⚠ **A finding can rest on one undefined word, and the source can use that word both ways.** F-17 turns on `statement`. The paper never defines it, §6.2 uses it to include the context, and upstream's implementer named the variable `stmt_hash`. **The finding survives as an ambiguity and is stronger for it** — reporting the ambiguity forecloses the answer a maintainer would otherwise give.
- **Differing the packets was measured, and only one finding of seventeen was reached by all three legs.** The corpus leg alone could re-run a command and catch a mis-recorded output; the rules-only leg alone raised two disclosure gaps. ⚠ **But both of the rules-only leg's rejected findings were of one shape** — *the evidence does not prove the exclusivity the claim asserts* — and given the corpus both turned out true and provable. **A rules-only leg produces a work list, not a verdict.**
- **Re-running a recorded command is a different act from reading the row that records it**, and it is the only thing that found E-296's wrong output. Nine of ten falsification attempts failed to falsify, which is what makes the tenth worth having.
- ⚠ **A leg given before-and-after text still did not find the copies.** Round two's Gemini leg had F-17 and E-297 whole and ruled every finding discharged, missing two surviving copies inside its own packet. **Only whole-tree sweeps found copies**, in both rounds. A no-corpus leg is for suspicion, not for coverage.
- **Check your own finding against the source before it is adjudicated.** Half of self finding 6 said rippled's transactors are under `src/xrpld`; they are at `src/libxrpl/tx/transactors/token/`. Withdrawn before it reached the ruling.

---

## REPORT

At the end: what runs, what does not, what you learned that was not in the spec, and what should change in the plan. The last item is the Compound step and it is not optional.
