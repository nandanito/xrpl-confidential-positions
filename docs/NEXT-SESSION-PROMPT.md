# NEXT SESSION — phase 1 steps 1 and 2 are done; REVIEW-057 closed at three rounds; D8 is reopened for the owner

⚠ **The launch plan is `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`** (`CLAIMS.md` E-309). Phase 0 is met. **Phase 1 items 1 to 4 are built, and item 5 is the owner's**: `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md` prices seven decisions. ⚠ The hosted demo (phase 2) is still a trust-boundary change that needs its own architecture step, an ADR and a rotation before any code.

## WHERE THIS LEFT OFF

`main` is still at `1701634`. Four branches are stacked on it, each cut from the one before, and **none is merged or pushed**. ⚠ **Read `git log --oneline -15 decision/phase-1-publication` and `git status -sb` before trusting this.**

| branch | item | what it holds |
|---|---|---|
| `tools/check-no-secrets` | 1 | the secret sweep, its harness, two review rounds, the scrub of 41 review files and the F-12 logs |
| `build/phase-1-vocabulary` | 2 | `tapFailHard` translated on reader-facing documents, `make check-vocabulary`, the `docs/reviews/` banner |
| `build/phase-1-front-door` | 3, 4 | README re-measured, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, templates, `make ci`, the workflow; **E-319 and E-320 are here** |
| `decision/phase-1-publication` | 5 | the decision request; this file; the README's claims-check fixes and **E-322** |

⚠ **Merge the stack in order, or the last branch alone.** The register rows for round two (E-320) and the Devnet finding (E-319) are only on the front-door branch, because adding them lower in the stack would have made two branches insert rows after E-318.

1. **`make check-no-secrets` is the phase 1 gate** (E-317, E-318, E-320). It scans what `git add -A` would commit, all history, and the exact values in the local secret store, with 97 controls run through the real `scanRepo()` every time. `make break-no-secrets-gate` is 83 mutation and CLI probes (E-321; this said 93 and 81, the round-two figures, until 2026-10-18). **Rehearsed on a squashed export of the front-door tree: PASS.**
2. **`REVIEW-056` ran three rounds and the rotation is CLOSED by the owner's ruling** (D1, E-321). Round three's fixes are unreviewed, by that ruling.
3. **The handover's premise about the F-12 logs was wrong**: they were gitignored, never in the tree. They are committed now, scrubbed. Three runner-script hashes no longer reproduce from the scrubbed text, and the evidence says so.
4. **The public Devnet endpoint no longer serves the README's four evidence transactions** (E-319); its history starts at ledger 5,171,980 and Devnet runs **rippled 3.4.1**. Devnet was not reset.
5. **Two publication blockers were measured, not guessed** (D2, D3): `check-claims-revisions` fails in a squashed repository, so public CI would be red on its first run; and `XRPLF/mpt-crypto` carries no licence file while this repository republishes a patch against it.
6. **The xrpl.js wrapper promise on `mpt-crypto#141`** still waits on PR #145.

## 1. WHAT IS NEXT

**The owner ruled on 2026-10-18:** the recommended option for D1, D2, D5 and D6. D1 is done (rotation closed). D2 is built: `tools/build-claims-revisions.ts` skips its oracle only when `docs/CLAIMS-REVISIONS-ARCHIVE.md` exists and none of its curated commits does, and `make ci` then passes in a squashed export. **D3 is open**: not to ask upstream for a licence; Option A with the facts disclosed beside the patch was recommended and awaits the owner's yes. **D4 is open.**

**The README's `/claims-check` findings are FIXED** (`b0afb07`, E-322). The owner's output was not saved, so the list was re-derived from the README and every claim re-read at source: XLS-0096 is `Final` since PR #604 on 2026-09-03 (E-1 now says so); the issuer route closed by removal on 2026-09-05 (E-241), and that claim was also stale in `web/README.md`, the front page, `/api/meta`, `/api/signer`'s `whatThisIs`, `CLAUDE.md` and the demo script, which said *"The number appears"*; the git-history paragraph now states the squash (E-309) and E-240 is marked superseded; the false-pass count cites the register's own numbering. ⚠ **Not changed, and named in E-322:** `ADR-0003`'s status line and its *"currently accepts"* paragraph, which are records, and **the launch plan's phase 2 question, which lists the decrypted snapshot as something the tier serves.** It has not served the figure since 2026-09-05; the phase 2 ADR must start from E-241.

**D3, D4 and D7 were then RULED by the owner, and `REVIEW-057` reviewed the plan before any step ran** (E-323, `REVIEW-057c`): 11 findings, all upheld at source. The plan promised one public commit and made four; it now makes two, rehearsed. Its gate ran with history off; step 7 now runs without `--rev` on the clean export, rehearsed. The required check is `checks`, not `ci`. **The push guard is BUILT** (`bceea15`): an allowlist by GitHub repository id, `make install-push-guard`, `make check-push-guard` in `make ci`, installed here and proved by dry run. ~~⚠ **Open: D8** … **and round two** … Then step 1 is the third-party inventory R1-1 asks for.~~ **All done on 2026-10-18**: D8 ruled A, the clone inventory complete (six scratch clones deleted; the owner confirmed no others), step 1 (`NOTICE`, `LICENSES/`, `make inventory-third-party`, E-324) and step 2 (actions pinned) built, and **round two run** (`REVIEW-057d`, E-325): 12 findings, four HIGH, all upheld. The guard was redesigned to let a private clone push only to the archive, the inventory rebuilt to see numbered and joined quotations, and step 7 made `--strict-history`. ~~⚠ **Open: round three**~~ **Run 2026-10-19** (`REVIEW-057e`, E-326): 14 findings, seven HIGH, all upheld and fixed. The guard accepts HTTPS to github.com only and refuses weakened TLS and `gh` socket routing (31 cases, 16 mutants); the inventory reads `.log` files and finds nine projects, Emscripten and clio added; step 7 re-runs the inventory and rejects `DATE`; D7 sweeps decoded fields. **D8 re-ruled 2026-10-19 by the owner: A, hardened, now, and C at step 10 if the account supports it**; B, the leg's recommendation, is not taken. **Step 3 done 2026-10-19**: `main` is at the stack's tip on the archive, with the four branches. **Next is step 5, the export**, then 6 to 10; step 8's rename is the first change visible on GitHub. **Round three's fixes are reviewed by their tests only**: the hook allows no fourth round. Then step 3. **The earlier summary of D3, D4 and D7 follows, kept for the record.**

**So item 5 then waited on D3, D4 and D7.** The decision request was revised the evening of 2026-10-18 with a recommendation for each. D3: publish the patch with a `NOTICE` that carves the upstream lines out of Apache-2.0. The patch carries about 832 upstream lines, not 341, and `wconf_bench.c` lifts upstream test code; the npm ISC licence is `xrpl.js`'s and is not a grant for the C source. D4: rename the private repository `xrpl-confidential-positions-private` and publish under the canonical name, the EVM study's pattern. **D7 is new**: the 13 private issues have to be copied in order so the cited numbers resolve, and six of them cite withheld rows.

Then item 5's ten steps are in the decision request, in order. ⚠ **Step 7 is the phase 1 gate itself — the sweep on the exact published commit — and the rehearsal does not substitute for it.**

---

## 2. THE FOUR FILINGS — all sent; what the drafting established, kept

**Prepared 2026-09-22 (`CLAIMS.md` E-313, reviewed in `REVIEW-051`):** all four hold at HEAD, the templates were re-read, and the searches are recorded. Two instructions were added. F-9 asks for the remote migration `clio#3118` made, at all three mpt-crypto sites. F-17 credits Trail of Bits' Appendix B for the NULL `context_id` half or drops it.

**ALL FOUR ARE FILED, and phase 0's exit was met on 2026-10-18 (E-315):** F-17 `#153`, F-12 `#154`, F-13 `#155`, after F-9 `#148`. Upstream's #152 would close #148. **Phase 1, the public repository, is next**; its gate is the secret sweep, and `docs/evidence/f12-emsdk-2026-10-18/` carries 42 logs with the local home path in them.

**F-9 is FILED as `mpt-crypto#148`, 2026-09-28 (E-314, `REVIEW-052`).** What worked is a Codex leg run from a fresh git repository under `$TMPDIR`, not inside the scratchpad, with `-c sandbox_mode=workspace-write`. A network check and an isolation instruction come first. Round two reviews the fixes, and the scratchpad does not survive between sessions.

The owner invokes `/upstream-issue` and `/issue-review`; **a session must not run them on its own**, and nothing is sent without sign-off on the final text. All four go to `XRPLF/mpt-crypto`.

- **F-9** (E-300, executed at `1.0.5`). ⚠ **Lead with the substitution:** `init.sh` was **not run**, only its remote-add was reproduced by hand. That is the first thing a maintainer will ask.
- **F-12** (E-299; run at `85dbac7`, read at `1.0.5`). ⚠ **Two things, both found by `REVIEW-048`:** upstream's WASM job is **green on `main`** at the pinned emsdk — say so in the first paragraph or the reply is *works for us* — and **F-12's own remedy sentence is stale.** It says *"the **two** `emcc` link lines"*; there are now **three**, at `:363`, `:365` and `:374`.
- **F-13** (E-304, read at `1.0.5` and rippled `develop`; sizes measured on Devnet at `3.3.0`, not re-measured). ⚠ **Show the component table, not the totals.** Two external legs re-derived 1276 and 1210 from the row and **one got the composition wrong** — leg B used the n=4 base for the n=3 case. The row now states it: n full 66-byte pairs for the paper's one shared `C₁` plus n `C₂` adds 99 B at n=4; at n=3 the paper's total is first 33 B lower, then 66 B is added.
- **F-17** (E-306, read at `1.0.5`). ⚠⚠ **The filing changed shape.** It may not claim that the paper's nonce input omits `TransactionContextID`. Remark 6.1 says `statement` and never defines it; §6.2 enumerates the challenge hash's inputs with `TransactionContextID` as item 4 and closes *"Omitting any statement element from the hash would allow cross-protocol attacks"*; and upstream's own prover names its variable **`stmt_hash`** and folds the context into it. **File the ambiguity and its consequence** — that a reader taking the x reading gets nonce reuse across a resubmission. A maintainer cannot answer that with *"statement includes the context"*, because that answer is half the finding.

⚠ **Before any of the four is sent, search B-30's corpus.** `docs/UPSTREAM-FILING-PROTOCOL.md` rule 4 is *no negative claim without its recorded search*. Nothing reachable in the Sherlock corpus touches these four subjects, so this is very unlikely to move them — but the search has to be recorded, not assumed.

---

## 3. STILL OPEN — the standing backlog

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
make break-no-secrets-gate                 # 83 probes; writes untracked plants for seconds — no git add -A meanwhile
make break-no-secrets-gate-self-test
make ci                                    # exactly what GitHub Actions runs
make break-emphasis-gate                   # refuses on a dirty tree — commit first
make break-emphasis-gate-self-test
python3 tools/break-secret-file-modes.py   # B-29's falsifier; refuses on a dirty tree
cd signer && cargo test                    # sum EVERY "test result:" line
```

**Green at `d96899d` on `decision/phase-1-publication`, 2026-10-18 evening**, every line above plus `make vendor-verify`, run by one script with a full log per step and no pipes: 20 steps, all exit 0, tree clean before and after. `cargo test` summed 21 result lines to 279 / 0 / 4 on both runs; `make ci` gave 227 pass, 5 skip, 0 fail; the sweep 97/97 controls and 83 probes; amendments read `2026-10-18T08:43:14.319Z`, the same table. **Earlier the same day, green on `build/phase-1-front-door`**, every line above, after `tools/rebuild-env.sh` rebuilt `/tmp/wconf`. `cargo test` summed 21 result lines to 279 / 0 / 4 on **both** runs; the TypeScript suites gave 232 / 0 twice. ⚠ One earlier TypeScript run timed out a facility test at Bun's 5-second limit while `cargo test` shared the CPU. **The previous reading: green at `a130479`, 2026-09-22**, every line above: nine steps, all exit 0. `check-zeroize-bounds` ran cold. `cargo test` summed 21 result lines to 279 / 0 / 4 on **both** runs. ⚠ **The suite and the Codex leg ran concurrently** and the tests were slower for it; that is contention, not flakiness.

⚠ **Editing `CLAIMS.md` takes TWO commits.** Commit the register change, then regenerate and commit `docs/CLAIMS-REVISIONS.md` **on its own**.

---

## TRAPS

- ⚠⚠ **A review of `check-no-secrets` plants secrets, so its transcript fails the gate — correctly.** Do not weaken the gate to accept a leg's fixtures. Scrub personal paths with `tools/scrub-personal-data.ts`, then replace planted secrets with `tools/redact-review-fixtures.ts`, which refuses outside `docs/reviews/` and refuses on any value from the real store. Redirect a leg's output **outside** the repository while it runs, and copy it in afterwards, or the gate and the harness baseline see it half-written.
- ⚠ **A flaky control can be a real detector defect.** The Google key control failed one run in 30: the pattern was wrong, not the sample. Run controls in a loop (`for i in $(seq 1 30)`) before calling a flake noise.
- **git reads the index copy of a missing `.gitattributes`.** A control that deletes it from disk still sees it; `git rm` it from the index too.
- **zsh does not word-split an unquoted `$args`.** Use `${=args}`, or a probe passes its whole string as one argument and every result is wrong.
- **A file on disk is not a file in the tree.** `git check-ignore -v <path>` and `git ls-files <path>` before planning on what "the tree carries".

- ⚠⚠ **`check-zeroize-bounds` rewrites tracked files in `signer/` for as long as it runs, so the tree is NOT safe to read.** Do not let a repo-access review leg overlap it. The shape that works: write the packets, launch the **no-corpus** leg, run the gate suite, and launch the **repo** leg only once the tree is clean again. A wrapper that waits for the gate's marker, **checks `git status --porcelain` and refuses on a dirty tree**, then launches Codex, is in this session's scratchpad and worth rebuilding.
- ⚠⚠ **A review packet that asks about a finding must CONTAIN that finding.** `REVIEW-048`'s leg B was asked whether the rows support filings for F-9, F-12, F-13 and F-17 and was given none of those rows' text. It reconstructed F-12 from a one-line summary, got it backwards, and ranked the result its HIGH. **E-160, with the adjudicator writing the excerpt.**
- **A GitHub search for a number matches issue numbers.** `gh search issues 'ElGamal 66 bytes' --owner XRPLF` returned eight hits, **every one of them issue #66**, in eight different repositories. Such a query establishes nothing.
- **An empty `total_count` needs a control.** `actions/workflows/<id>/runs` gave 0 for `build-wasm.yml` because it is `workflow_call`-only; `actions/runs` gave **684**. Without the second call the first reads as *the build never runs*.
- **A junk-bodied `ConfidentialMPTSend` with correctly sized fields passes preflight** and is applied as a `tec` in preclaim. Not a "nothing applies" control.
- **`2>/dev/null` in a lookup loop can turn a failed fetch into "no match".** Check that every fetch returned a body.
- ⚠ **zsh parses `$r:src/…` as a history modifier.** Write `"${r}:src/…"`. **Set `CONAN_HOME` before the FIRST `conan` command**, `--version` included.
- **An evidence cell can be shared.** Anchor on the row's own words.
- **`git merge -F -` does not read stdin.** Write the message to a file. **zsh**: quote `echo ====x` and `grep --include=*.ts`.
- **`git commit` is signed through 1Password**; on *"failed to fill whole buffer"* ask the user to unlock it.
- ⚠ **The user's Codex review-policy hook** (`~/.claude/hooks/codex-review-policy.sh`) allows a *targeted* `codex exec` round only for security, wire-contract or precedence-chain work, and requires `-m gpt-5.6-luna` on a docs-only diff. **Do not write in a reason to get past it.** For register reviews use `codex exec review -m gpt-5.6-luna -c model_reasoning_effort=high --skip-git-repo-check "<packet>" < /dev/null`: `codex review` rejects `-m`, and `--base` cannot be combined with a prompt. ⚠ **That pass runs `workspace-write`**, so check `git status --porcelain` before and after.
- **A `|` inside a code span still splits a GFM table cell.** Escape it as `\|`. `make check-tables` caught it.
- **Review legs:** `codex exec` needs `< /dev/null` and `--skip-git-repo-check`; watch **stderr grow**, not stdout. `agy` takes every flag **before** `-p` and needs a non-repo cwd.
- **`cd` persists between Bash calls.** **Devnet only, never mainnet.** **Branch as `<kind>/<slug>`.**

---

## WHAT THIS SESSION TAUGHT, kept because it is the transferable part

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
