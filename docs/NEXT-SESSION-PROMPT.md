# NEXT SESSION — phase 2 step 1 is designed and reviewed; the hosted demo waits on four owner rulings

⚠ **The launch plan is `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`** (`CLAIMS.md` E-309). Phases 0 and 1 are done: the repository is public at `https://github.com/nandanito/xrpl-confidential-positions`. **Phase 2, the hosted demo, is designed and not built.** `ADR-0004` is `Proposed` at revision 4, its rotation `REVIEW-058` ran three rounds and is closed, and nothing is built until the owner rules on D-H1 to D-H4.

## WHERE THIS LEFT OFF

`main` is at `2d41b64`, pushed to the private archive (`origin`, `nandanito/xrpl-confidential-positions-private`). **`decision/phase-2-hosted-demo` holds this phase's commits on top of it, not merged and not pushed.** ⚠ Read `git log --oneline -12 decision/phase-2-hosted-demo` and `git status -sb` before trusting this.

The branch holds:

- **The design.** `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`, revision 4, and architecture §6 step 9 (revision 10). `CLAIMS.md` E-327 records the measurements it rests on.
- **The review.** `REVIEW-058`: packets and transcripts in `docs/reviews/REVIEW-058-packets/`, and the adjudications `REVIEW-058c`, `058d` and `058e`; E-328 to E-330.
- **Fixes to shipped code that the review found.** ⚠ **The public repository carries every one of these defects**, because they predate publication:
  - `facility/src/loopback.ts` read a "not found" from any ledger as an empty position. Every pinned answer, positive or `entryNotFound`, must now carry `validated: true` and a numeric `ledger_index` equal to the pinned index, and every entry is type-checked: the Rust reader's checks. A decimal-form index still reads as an integer here and is documented, not closed.
  - `web/app/src/routes/index.tsx` promised the issuer view showed the holder decrypted, false since E-241.
  - `web/app/src/routes/wallet.tsx`, `web/api/capability.ts` and the web walkthrough said no wallet could ever close the gap; scoped now to the wallets examined.
  - `web/api/signer-status.ts` still carried a sentence E-224 retracted in September.
  - `tools/check-disclosure-phrases.ts` now joins wrapped lines and drops blockquote, comment, bullet and JSX spacing markers before matching: 22 phrases, 14 controls.

The public repository's `main` is at `d135eed` (PR #14).

## 1. WHAT IS NEXT

**Four rulings are the owner's**, each priced in `ADR-0004` revision 4 with a recommendation:

1. **D-H1, the hosting shape.** H3, prerendered pages, is recommended: a visitor's browser sends nothing but page loads to Vercel. H1 is the option if visitors must look up their own accounts. H3 brings two sub-choices: a rebuild cadence, and an isolated build machine or its trust accepted by name.
2. **D-H2, the hosted risk acceptance.** Accept by name, with the revised two paragraphs beside every ledger value.
3. **D-H3, the issuer view.** A, no figure, holding E-241's line. ⚠ This departs from the launch plan's snapshot sentence. C, a proof of correct decryption a browser verifies, is the only way to show a checkable figure and is unpriced.
4. **D-H4, the deploy.** Prebuilt output from the CLI, with a token scoped to the project, given an expiry, and never present while dependencies install or the build runs.

**Also the owner's:** merging the branch and pushing it to the archive; **a public update carrying the code fixes**, which publishes and so waits on a yes; and D8's C. The rulesets endpoint answers for the public repository with an empty list, not a 403, measured on 2026-10-19, so the account offers rulesets; C still waits on the owner checking the public page.

**After the rulings, phase 2 step 3 builds**, and the ADR's gate list is the order: a directory mode for `check-no-secrets` with controls proving ignored build files are read (R1-9); the hosted build with an allowlisted environment, its endpoint and acceptance named, no source maps and one pinned snapshot; a static data adapter replacing the application's runtime API dependency (R2-9); a per-account existence check; the D-H2 wording; a footer with the commit and the gate's verdict; the Content Security Policy in `.vercel/output/config.json`; the bundle's licence notices. Then step 4's hosted gate part, verified by breaking it, and step 5's deploy, with served bytes and headers compared against the gated output.

**How a public update is made**, as it was done: change the file in this archive and commit here; copy the changed files to `…/ripple/xrpl-confidential-positions-public`, re-inserting the README's publication note; `git add` them, then `make inventory-third-party` there, which refuses on untracked files since E-332; commit; regenerate `docs/CLAIMS-REVISIONS.md` there as its own commit if `CLAIMS.md` changed; run `check-no-secrets --repo <public> --strict-history` with the local store and `make ci`; push a branch, open a PR, and once `checks` is green **fast-forward** `main` to it. ⚠ **Never squash or rebase a public PR**: the revision log names the commit that last changed `CLAIMS.md`, and a rewritten commit fails `check-claims-revisions` on `main`.

---

## 2. PHASE 1 AND THE FOUR FILINGS — for the record

**Phase 1 was published on 2026-10-19.** `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md` records the ten steps, D1 to D8 and their rulings, and `REVIEW-056` and `REVIEW-057`; E-317 to E-326 are the register's account. ⚠ **Step 7's gate is the sweep on the exact published commit, and no rehearsal substitutes for it**; a later public update runs it again.

**All four filings are sent** (E-315): F-9 `mpt-crypto#148`, F-17 `#153`, F-12 `#154`, F-13 `#155`. The owner invokes `/upstream-issue` and `/issue-review`; a session must not run them on its own. Phase 3's posts re-survey every filing at source before a word is drafted.

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
- **`U-58` and `U-59`, withheld, captured 2026-10-19:** the public Devnet JSON-RPC endpoint refuses browser pages while its WebSocket endpoint answers them, and `@xrplf/mpt-crypto@0.1.0` exposes provers and no verifiers though its WASM build has seven. Not graded, not searched.
- **The facility reader's decimal-form difference from the Rust reader** (E-330), documented and not closed. Closing it means reading the raw response text.

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

**Green at `2d41b64` on `main`, 2026-10-19**, every line above plus `make vendor-verify`, run by one script with a log per step and no pipes: 28 steps, all exit 0, tree clean before the first edit. `cargo test` summed 21 result lines to 279 / 0 / 4 on both runs; `make ci` gave 227 pass, 5 skip, 0 fail; amendments read `2026-10-19T09:57:32Z`, with `ConfidentialTransfer` enabled on Devnet and supported but not enabled on Mainnet and Testnet. **On the branch tip after `REVIEW-058`:** `make ci` 236 / 5 / 0 and every document gate passes; `cargo test` was not re-run, since no Rust changed. **Green at `d96899d` on `decision/phase-1-publication`, 2026-10-18 evening**, every line above plus `make vendor-verify`, run by one script with a full log per step and no pipes: 20 steps, all exit 0, tree clean before and after. `cargo test` summed 21 result lines to 279 / 0 / 4 on both runs; `make ci` gave 227 pass, 5 skip, 0 fail; the sweep 97/97 controls and 83 probes; amendments read `2026-10-18T08:43:14.319Z`, the same table. **Earlier the same day, green on `build/phase-1-front-door`**, every line above, after `tools/rebuild-env.sh` rebuilt `/tmp/wconf`. `cargo test` summed 21 result lines to 279 / 0 / 4 on **both** runs; the TypeScript suites gave 232 / 0 twice. ⚠ One earlier TypeScript run timed out a facility test at Bun's 5-second limit while `cargo test` shared the CPU. **The previous reading: green at `a130479`, 2026-09-22**, every line above: nine steps, all exit 0. `check-zeroize-bounds` ran cold. `cargo test` summed 21 result lines to 279 / 0 / 4 on **both** runs. ⚠ **The suite and the Codex leg ran concurrently** and the tests were slower for it; that is contention, not flakiness.

⚠ **Editing `CLAIMS.md` takes TWO commits.** Commit the register change, then regenerate and commit `docs/CLAIMS-REVISIONS.md` **on its own**.

---

## TRAPS

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
