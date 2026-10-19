# Decision request — phase 1 publication

- **Date:** 2026-10-18
- **For:** the project owner
- **Plan:** `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`, phase 1
- **Status:** phase 1 items 1 to 4 are built on four stacked branches. Item 5, the
  publication itself, and six decisions are yours. **Nothing has been published,
  pushed, force-pushed or merged to `main`, and no history has been rewritten.**
- **Ruled 2026-10-18 by the owner:** the recommended option for D1, D2, D5 and D6.
  D3 is not to ask upstream for a licence, and its option is open. D4 is open.
- **Revised the evening of 2026-10-18**, after the facts behind D3 and D4 were
  re-measured: D3's context was wrong in three places and now carries a
  recommendation; D4 carries one too; **D7 is new**; and the publication steps
  carry all three.
- **Ruled later on 2026-10-18 by the owner: the recommended option for D3 (A′),
  D4 and D7 (A).** The owner also ruled that the local checkout keeps its folder
  name (see D4), and asked for an adversarial review of this document before any
  step runs.
- **Reviewed the same evening: `REVIEW-057`**, one Codex leg at the frozen
  `adee1f0`, adjudicated in `REVIEW-057c`. 11 findings, every one confirmed at
  source; D3, D7 and the steps are revised here, and D8 was new. The owner ruled D8
  (A) the same evening.
- **Round two, `REVIEW-057d`**, at `776ca25`: 12 findings, four HIGH, on the fixes,
  the push guard and step 1. The guard was redesigned, the inventory rebuilt and
  step 7 made strict; see `REVIEW-057d` for each.

## What is ready

The four branches form one stack, each cut from the one before. Merging
`decision/phase-1-publication` merges all of them.

| branch | phase 1 item | state |
|---|---|---|
| `tools/check-no-secrets` | 1, the secret sweep | `make check-no-secrets` built, scrubbed tree passing, two review rounds (`REVIEW-056c`, `-056d`) |
| `build/phase-1-vocabulary` | 2, vocabulary | reader-facing documents translated; `make check-vocabulary`; banner in `docs/reviews/README.md` |
| `build/phase-1-front-door` | 3 and 4 | README re-measured, contributor files, `make ci` and a GitHub Actions workflow |
| `decision/phase-1-publication` | 5 | this document |

**The phase 1 gate was rehearsed on 2026-10-18 and passed.** The front-door tree
at `dfb650e` was exported with `git archive` into a fresh single-commit
repository, and the gate ran on that exact commit with the local store loaded:

```text
controls: 93/93 passed, run through the same scanRepo() as the real check
known-value: 19 secret(s) from 5 file(s) in the local store, 67 encodings searched; 0 stored seed(s) skipped as public by construction
scanned: 638 file(s) in the tree, 0 history object(s)
check-no-secrets: verdict=PASS exit=0
```

The withheld upstream-feedback file and the unscrubbed F-12 logs were absent
from that tree, checked by `git ls-files`. ⚠ **That rehearsal is not the phase 1
gate.** The gate is the same command on the commit that is actually published,
and it must be re-run after any change below.

## The decisions

### D1. A third review round on the secret sweep

**Context.** `REVIEW-056d` set a stopping condition before round two ran: no third
round unless round two found a fix that did not discharge its finding. It found
three. The precedent for that case, `REVIEW-049` and E-311, gave the third round
to you with a recommendation.

**Ruled A, and DONE 2026-10-18 (`REVIEW-056e`).** Round three found 9 findings, no
HIGH; 8 upheld and 1 upheld in part, all fixed; the rotation is closed and its fixes
are unreviewed, as ruled.

| option | cost | what it buys |
|---|---|---|
| **A. One more leg, on the round-two fixes only, and close after it whatever it finds** *(recommended; ruled)* | about 45 minutes of a Codex leg and an hour of adjudication | the gate that decides publication has had its latest fixes seen |
| B. Close at two | nothing | round two found no HIGH, and its findings moved from coverage to the record's sentences: the convergence pattern `CLAUDE.md` describes |

### D2. The revision log in a squashed repository

**Context, measured.** `docs/CLAIMS-REVISIONS.md` is derived from git history, and
`make check-claims-revisions` fails it if a commit it names is not an ancestor.
In the rehearsal repository it failed: *"db2fd12 is not an ancestor of HEAD"*.
`make ci` runs that gate, so **the public repository's first CI run would fail.**

| option | cost | what it buys |
|---|---|---|
| **A. Keep the archive's log as a dated, static file, and regenerate a fresh log from the public history** *(recommended; ruled)* | ⚠ priced here as *"a rename and one regeneration"*, and that was wrong: the builder refused to run in a squashed export, because its oracle checks three curated commits that only the private history has. **Built after the ruling**: the oracle skips only when none of its commits exists and `docs/CLAIMS-REVISIONS-ARCHIVE.md` is present. Rehearsed, and `make ci` then passed every step in the export | the per-row dating survives as a record, and the gate keeps protecting the register going forward |
| B. Keep the archive's log and drop the gate from public CI | one line in `tools/ci.sh` | the record survives; nothing in public fails when a register row disappears |
| C. Publish the history instead of squashing | reverses the E-309 ruling, and history carries 1,045 personal-path hits that `--strict-history` fails, so it needs a history rewrite first | the commit citations in the register resolve |

### D3. The licence, and the vendored `mpt-crypto` patch

**Context, searched on 2026-10-18 and re-measured that evening.** This repository is
Apache-2.0. It publishes `tools/spike-2026-08-18/wconf-nonces.patch`, 1,657 lines
against `XRPLF/mpt-crypto` at `85dbac7`, across six files under `src/`.

⚠ **This said *"with 341 context lines of upstream source"*, and that undercounted
it.** Counted by hunk, the patch has 756 added, 500 removed and 341 context lines,
and removed and context lines are both upstream source: **841 upstream lines, 764 of
them non-blank.** ⚠ An earlier revision of this paragraph said *"about 832"*, from a
pattern that skipped blank lines and lines starting `--`; `REVIEW-057` R1-2
re-counted it. ⚠ **A second file was not priced at all.**
`tools/mpt-crypto-bench/wconf_bench.c` says its setup code is *"lifted from the
corresponding upstream test"*. Of its 321 lines that are not blank, a comment or a
lone brace, 96 match a line of upstream's `tests/` at the pin exactly, and 101 after
trimming indentation. Some are API boilerplate.

⚠ **The records quote third-party source too, and this section first missed it**
(`REVIEW-057` R1-1, confirmed). `REVIEW-027`'s request packet reproduces the whole
of `ed25519-dalek` 2.2.0's `src/hazmat.rs`, and `REVIEW-024`'s quotes 139 lines of
the same crate, which is BSD-3-Clause: its copyright notice and conditions must
travel with the source. Packets also quote rippled, which is ISC, and XLS-0096,
whose repository is MIT, and both require their notice in copies. Under D5 the
records keep their wording, so the `NOTICE` has to cover them, and any quoted
`mpt-crypto` source in them stands where the patch does. 133 records mention
*verbatim* or a primary source, so the `NOTICE` waited for a scripted inventory of
every quoted third-party file with its project and licence. That inventory was step
1, and it is done; see below.

**That C repository carries no licence that these searches found:** `gh api repos/XRPLF/mpt-crypto/license`
returns 404, the root listing has no licence file at the pin or at `main`,
`conanfile.py` declares none, and no file under `src/` or `include/` has an SPDX
line, a licence text or a copyright line. No issue or pull request in it mentions
a licence; a control query in the same search returned hits, so the empty result
is real.

⚠ **The npm package's ISC licence is not evidence about the C source.**
`@xrplf/mpt-crypto@0.1.0` names `XRPLF/xrpl.js` as its repository, and ships
TypeScript and a WASM build of `mpt-crypto` 1.0.4 with no C source. Its `LICENSE`
is an ISC notice with the line *"Copyright (c) 2015 Ripple Labs Inc."*. Option A as
first written cited it as covering the C code, which is a substituted source.

⚠ **Nothing in the tree carved the upstream lines out of Apache-2.0** at `adee1f0`.
`LICENSE` was the only licence file and there was no `NOTICE`, so the publication
as built would have appeared to license Ripple's code under Apache-2.0. Step 1 added
`NOTICE` and `LICENSES/`.

| option | cost | what it buys |
|---|---|---|
| **A′. Publish the patch and the harness, with a `NOTICE` that carves them out** *(recommended; ruled)* | an inventory of quoted third-party source, one `NOTICE` file and one README line, committed before the export | a stranger can rebuild the signer, and the tree stops appearing to relicense upstream code. ⚠ The redistribution itself stays unlicensed, and is accepted by name |
| A. Publish the patch, citing the npm package's ISC licence | none now | ⚠ **not recommended**: it rests on a grant nothing states |
| B. Ask upstream to add a licence file first, then A | an upstream filing and its wait | **ruled out by the owner, 2026-10-18** |
| C. Publish without the patch or the lifted harness | the signer becomes buildable only from the private archive | no upstream code is republished; **the fallback if the copyright holder objects** |
| D. Move the patch to a GitHub fork of `mpt-crypto` | rework `tools/rebuild-env.sh` and `make vendor-verify`, and rebuild the signer, just before publication | the copy rests on GitHub's forking grant. ⚠ It does not settle modification: *"Although a code host such as GitHub may allow you to view and fork the code, this does not imply that you are permitted to use, modify, or share the software"* (choosealicense.com, read 2026-10-18) |

**Why A′ over C.** The signer is the main thing this project built, and its point
is that a claim is checked by running it. Under C a stranger cannot build it. The
practical risk under A′ is low: the code is published openly by the organisation
whose surrounding stack is ISC, and this project's use of it sends findings back
upstream. A′ cannot make the copy licensed. What it does is stop this repository
from mislabelling someone else's code, which is the part of the risk this project
controls.

**The `NOTICE` is written, in step 1, from a measured inventory** rather than a
draft. `tools/inventory-third-party.ts` compares the tracked text files, lockfiles
and licence files excepted, against upstream corpora: `mpt-crypto`, rippled, clio,
XRPL-Standards and the dev portal at stated versions, every crate the signer locks
and every direct npm dependency. Its output states how many of each were compared
and which were unavailable. **Nine projects are reproduced**: `mpt-crypto`, which
has no licence; `ed25519-dalek`, BSD-3-Clause; rippled, clio and
`ripple-binary-codec`, ISC; XRPL-Standards, the dev portal and `@noble/curves`, MIT;
and Emscripten, MIT and University of Illinois/NCSA. `@noble/curves` arrived with
round two's own transcript, where a leg printed its source to plant a probe; clio
and Emscripten with round three's fixes, below. Each one's licence file is copied
verbatim into `LICENSES/`. The full list, with line ranges and the method's blind
spots, is `docs/third-party/INVENTORY.md`.

⚠ **Round two found the first version of the inventory blind and its check weak**
(`REVIEW-057` R2-5, R2-6, R2-11). It matched lines exactly, so every quotation
printed with line numbers was missed; it now strips `cat -n`, `nl` and `grep -n`
prefixes and adds a pass over identifier sequences, which also finds code joined or
reflowed. The check passed a `NOTICE` of six bare names with a licence file deleted;
`make inventory-third-party` now requires each licensed project's entry to name a
`LICENSES/` file byte-identical to that project's own. Twice a rippled excerpt was
attributed to clio, which shares rippled's include blocks and licence text because
it builds on rippled's library; a rule now counts a line both hold for rippled
only, which replaced a hand-written exception after its second instance.

⚠ **Round three found the rebuild still blind in four places, and the rule wrong**
(R3-7 to R3-10). It did not read `.log` files, so Emscripten's changelog in the F-12
logs was never compared; it skipped windows dense with numbers, which hid joined
test vectors; it wrote off source quoted beside licence text as licence text; and
the clio rule reported rippled for a quotation of clio's own file. Since 2026-10-19:
`.log` files are read and Emscripten's changelogs are a corpus; a window needs eight
distinct tokens, and only SHA-2's published constants, computed from their
definition, are set aside as facts; licence lines no longer count against the source
beside them; and the rule is gone, so a line both projects hold names both. The
check reads each `LICENSES/` file from git's index as a regular file, because a
symlink into `node_modules` passed when it read the disk, and it finds a project's
entry by a line that starts with its name. And it said it compared *"every tracked file against 108 corpora in 91
projects"*: 108 is the configured count, 14 of them were unavailable, and only text
files are compared.

Plan item 6, attribution, also asks that every third-party citation name its
upstream and that P-7's credits be right on every public surface. **That check
was not run this session**, beyond the README's credit section, which now names
all three audits.

### D4. The public repository's name and owner

**Recommended and ruled: the public repository is `nandanito/xrpl-confidential-positions`,
and the private one is renamed `xrpl-confidential-positions-private` first.** That
is the pattern the EVM study already uses. `nandanito/evm-confidential-positions-private`
is private and `nandanito/evm-confidential-positions` is public, created the next
day (both read with `gh repo view` on 2026-10-18). The private repository holds the
name today, so the name has to be freed before the public one can take it. The
personal account matches the blog and the LinkedIn post. An organisation adds
nothing for a single-maintainer research artifact.

**The rename, read on GitHub's rename page on 2026-10-18.** After a rename, *"all
existing information, with the exception of project site URLs, is automatically
redirected to the new name."* If a new repository then takes the old name,
*"redirects to the renamed repository will no longer work."* Here that is what is
wanted: the canonical name should land on the public repository. Every existing
clone needs `git remote set-url origin` to the new name. The page also says
*"GitHub will not redirect calls to an action hosted by a renamed repository"*;
this repository hosts no action.

**Ruled, with one addition: the local folder keeps its name.** This checkout stays
at `…/xrpl-confidential-positions`. Claude Code's memory is keyed by the folder's
path, and the owner found that renaming the EVM study's folder broke both its Claude
Code and its Codex sessions. Only its `origin` changes, to `xrpl-confidential-positions-private`. The
public repository's working copy is a separate folder, the step 4 export.

⚠ **That leaves a folder whose name matches the PUBLIC repository holding the
PRIVATE history**, and one mistake publishes all of it: the history that
`--strict-history` fails on 1,045 personal-path hits, and the 36 commits behind the
withheld rows. Once the public repository takes the old name, a stale `origin` in
any clone stops redirecting to the archive and points at the public repository
instead. **So every private clone gets the push guard** (`make install-push-guard`),
and the public URL is never added as a remote here. ⚠ This first said the guard
would refuse URLs *"naming `nandanito/xrpl-confidential-positions` without the
`-private` suffix"*. It was built as an allowlist by repository id instead, and
what it does and does not close is D8.

The README's footnote records `xrpl-confidential-positions` as held since
2026-08-16, which stays true. The five-minute path says *"from a fresh clone"* and
names no URL, so nothing else changes.

### D5. Whether the vocabulary translation reaches the records

| option | cost | what it buys |
|---|---|---|
| **A. Leave `docs/reviews/`, `docs/decisions/` and `CLAIMS.md` as written, under the banner** *(recommended, and what is built)* | none | the records keep their value as a record of what was believed |
| B. Translate them in the published tree only | a scripted pass at publication | a public reader never meets the shorthand; the published records then differ from the archive's |

### D6. Whether CI runs the signer's tests

**Context.** The signer links a patched `mpt-crypto` that `tools/rebuild-env.sh`
builds with Homebrew `openssl@3`, a macOS build. `make ci` therefore skips
`cargo test`, `check-test-support` and `check-zeroize-bounds`, says so on every
run, and reports five signer-starting facility tests as skipped rather than passed.

| option | cost | what it buys |
|---|---|---|
| **A. Local-only, as built** *(recommended for publication)* | none | an honest CI that names what it does not run |
| B. A macOS runner job: `tools/rebuild-env.sh` then `cargo test` | unverified; pinned GitHub clones at every run; its own verification round | the signer is tested on every pull request |
| C. Port the vendored build to Linux | rework of `build.sh` and `rebuild-env.sh` | the same, on the cheaper runner |

### D7. Copying the issues, so the numbers the documents cite resolve

**Context, measured on 2026-10-18.** The README says bare issue numbers are issues
on *this* repository. `git grep` finds the pattern `issue #N` in 119 files, most of
them under `docs/reviews/` and `docs/decisions/`. Every number from #1 to #11
appears, and #13; #1 appears 157 times, #10 70 times and #11 50 times. That counts
the pattern, and a few hits are upstream issues rather than this repository's.
These numbers belong to the private repository, which has 13 issues, three of them open (#5, #8, #10), 17
comments between them and no pull requests. A fresh public repository numbers from
#1, and issues and pull requests share one counter, so every citation would point
at the wrong issue or at nothing.

⚠ **Six of the 13 cite withheld rows, and some restate them.** The bodies of #6
(U-28), #7 (U-31) and #10 (U-32), and comments on #2 (U-36), #3 (U-37) and #4
(U-35, U-38), cite rows that are in `docs/upstream-observed-WITHHELD.md` and not
in `UPSTREAM-FEEDBACK.md`. #10's body also restates what U-32 says. **Copying them
verbatim would publish part of what E-240 withheld.**

| option | cost | what it buys |
|---|---|---|
| **A. Title-only stubs for the ten closed issues, and full copies of the three open ones** *(recommended; ruled)* | 13 issues created in order, with #10's U-32 passage redacted and every body run through the secret sweep first | every cited number resolves, and no withheld row id leaves, because #10 is the only one of the open three that cites one. ⚠ The scan matched row ids, so the three open bodies still need a read for restated content. The closed issues' outcomes are already in the published register and reviews |
| B. Full copies of all 13 with their comments, after a redaction pass you approve | six issues redacted by hand and 17 comments copied | the discussions themselves become public |
| C. No copies. The step 6 sentence also says issue numbers refer to the archive, and the open three are re-filed under new numbers | the citations to #8 and #10 edited | ⚠ the public repository's own #1 to #13 would then collide with every cited number |

**What is published, exactly** (`REVIEW-057` R1-4, R2-10, R3-13). A copy is the
title and a body, and nothing else: no comments, attachments or labels. The
procedure:

1. Write each issue's decoded fields as plain UTF-8 files in a scratch repository:
   `NN.title.txt`, one line, and `NN.body.md`. ⚠ **Not a JSON manifest**: a secret
   written with JSON escapes passed a sweep of the serialised file while its decoded
   field was caught (R3-13).
2. The owner reads the three open bodies for any restatement of a withheld row; the
   id scan cannot see a paraphrase.
3. Commit them, and sweep that commit:
   `bun run tools/check-no-secrets.ts --repo <payload> --rev HEAD`, with the local
   store. It must PASS. (`--rev`, because tree mode also checks for this
   repository's own cited test vectors, which a payload repository does not have;
   the controls and the known-value search run either way. Tried 2026-10-19 on a
   two-file payload: 97/97 controls, 19 stored secrets searched, PASS.)
4. Record `shasum -a 256` of every file, then create each issue from its files:
   `gh issue create --title "$(cat NN.title.txt)" --body-file NN.body.md`.
5. Read each one back with `gh issue view N --json title,body` and compare it with
   its files.

Nothing is re-fetched from the archive at creation time.

A stub carries the original title and says: *"A stub. This was issue #N in the
private archive, opened DATE and closed DATE. Its discussion stays there."* ⚠ **It
said here that *"the outcome is in the document that cites it"*, and that is not
true of every citation** (R1-5): `REVIEW-013`'s request cites the re-weigh while it
was still open, and its outcome is in `REVIEW-013c`. So a stub links its outcome
only where a document is verified to record it, and otherwise says nothing about
one.

⚠ **The issues have to be created before anything else can take a number.** The
public repository is created private and made public only after them, Discussions
stay off until then, and each number GitHub returns is checked as it is created,
stopping at the first mismatch. Being private does not reserve a number by itself.

### D8. What keeps the private history out of the public repository

**Context.** `REVIEW-057` R1-3, upheld in part. A `pre-push` hook is not a
boundary: the leg measured that `--no-verify`, a fresh clone and `core.hooksPath`
each skip it. The plan, as frozen, described the hook as if it closed the route.
Since then the guard has been built as an allowlist rather than a URL pattern: a
push that carries the private history may go only to the archive, identified by
its GitHub repository id (`tools/git-hooks/pre-push`, `make check-push-guard`, in
`make ci`). It is installed in this clone and proved with dry runs. ⚠ **It stops
mistakes in a clone it is installed in, and nothing else.**

| option | cost | what it buys |
|---|---|---|
| **A. The guard, plus an inventory of every private clone** *(recommended)* | step 8 lists every clone on every machine, including any cloud session's checkout, and sets each one's `origin` and installs the guard | closes the realistic route, a stale `origin` after the public repository takes the old name. ⚠ **Residual, named**: a clone the inventory missed, or `--no-verify` |
| B. A, plus credential isolation | day-to-day `git` and `gh` credentials scoped so they cannot write the public repository, and a separate fine-grained token kept only in the export folder; every later public change goes through that folder or the web interface | the leg's recommendation: a real boundary on this machine, whatever the clone |
| C. A, plus a server-side ruleset on the public repository | refs may be created, updated or deleted only by merging a pull request, so even the owner's changes arrive from a fork; ⚠ the ruleset's availability on this account is not verified | closes the route for every clone and every credential |

**Ruled 2026-10-18 by the owner: A.** The inventory began the same day, on this
machine only: every repository under the home directory's project folders and the
temporary directories, searched to depth 7, was tested for the private history's
root commit `b71638c`. Seven hold it. **This checkout** has the guard. **Six are
scratch clones** in the temporary directory, from `REVIEW-056`'s and `REVIEW-057`'s
legs and an earlier CI rehearsal; none has a GitHub remote, so none can make the
stale-`origin` push. **They were deleted the same day at the owner's word, and the
owner confirmed there are no other clones**, on other machines or in cloud
sessions. A second search then found the private history in this checkout only.

**Why A.** The route that exists in practice is a clone whose `origin` still names
the old repository, and the inventory and the guard close it. B and C close the
rest at a standing cost to every later change, for a single-maintainer research
repository. **If you want the boundary rather than the guard, B is the cheaper of
the two.**

### D8, reopened after round three

**Context.** `REVIEW-057` round three broke the redesigned guard five more ways and
recommended option B. Three were bugs, fixed on 2026-10-19 and pinned by cases and
mutants: a remote named `--parse-url` reached a mode that skipped the check (R3-1),
installing from a subdirectory wrote the hook outside `.git` and reported success
(R3-4), and a stale `pushurl` let a reinstall replace the recorded archive (R3-5).
The other two need configuration that routes a push elsewhere: `core.sshCommand` or
`GIT_SSH_COMMAND` sent an SSH push for the archive to another server (R3-3), and
`gh`'s `http_unix_socket` setting answered the identity lookup locally (R3-2). The
guard now accepts **HTTPS to github.com only**, and refuses when TLS verification is
off, when a CA has been added in the environment or git's configuration, and when
`gh` is routed through a socket. `make check-push-guard`: 31 cases, 16 mutants. ⚠
**What remains is what any hook leaves: `--no-verify`, a clone without the guard, a
CA added to the system's own store, and anyone who means to get past it.**

| option | cost | what it buys |
|---|---|---|
| **A, as ruled, hardened** *(recommended)* | done | every mistake round three found is refused, in the only private clone |
| B. Credential isolation, the leg's recommendation | every `git` and `gh` credential on this machine that can write to the public repository replaced by one that cannot, on every project, and a token for the public repository kept only in the export folder | a boundary that holds against a determined push from this machine, not only a mistaken one |
| C. A, plus a ruleset on the public repository from step 10 | a ruleset that lets only a deploy key kept in the export folder, or a merged pull request, update any ref; every later change arrives one of those two ways. ⚠ Not verified on this account. Rulesets on a private repository need a paid plan, so it cannot cover step 9's private staging, which A does | from publication on, a push from any clone with any credential is refused by GitHub itself |

**Ruled 2026-10-19 by the owner: A, hardened, now, and C at step 10 if the account
supports it.** The leg's recommendation, B, is not taken.

**Why A, and C if it works.** Every failure round three demonstrated needed either
a mistake the guard now refuses, or configuration set on purpose to route a push
elsewhere. The second is not a mistake. B buys protection against it, at a cost to
how you work on every repository. C buys the same server-side protection for the
public repository at a cost only to that repository, once it exists.

## Item 5, the publication steps — every decision ruled 2026-10-18

⚠ **Revised after `REVIEW-057`.** The frozen version promised *"one commit"* while
steps 4 to 6 made four, and a log derived from git history cannot name the commit
that contains it, so squashing them fails the revision-log gate (R1-6). It also
gated the tree with history scanning off and edited the workflow after the gate
(R1-7), required a check named `ci` that the workflow never emits (R1-8), and saw
the first Linux CI run only after going public (R1-9).

1. **Apply D3.** Run the inventory of quoted third-party source, complete `NOTICE`
   from it, and add a line pointing to it in the README's *Licence* section.
   **Done 2026-10-18**: see D3.
2. Pin the workflow's actions by commit SHA. Commit both on the stack and re-run
   `make ci`. **Done 2026-10-18**: `actions/checkout` at `11d5960` (`v4.4.0`) and
   `oven-sh/setup-bun` at `0c5077e` (`v2.2.0`), each the commit its tag named that
   day. ⚠ The workflow cannot run locally, so step 9's staging run is its first test.
3. Merge the stack to `main` and push it to the private origin. **Done 2026-10-19**:
   `main` fast-forwarded from `1701634` to `f17b4f0`, and pushed with the four stack
   branches; every ref on the archive matched, which stayed private. The push guard
   allowed it, its first real push.
4. ~~Run D1's round, if ruled, and fix what it upholds.~~ **Done 2026-10-18**
   (`REVIEW-056e`).
5. **Export, and make the first of exactly two commits.** `git archive` the
   merged `main` into a fresh repository. Before committing, copy
   `docs/CLAIMS-REVISIONS.md` to `docs/CLAIMS-REVISIONS-ARCHIVE.md` (D2), and add to
   the README's first screen: *"Public history starts at publication. This
   repository was developed privately from 2026-08-16 and published on DATE as two
   commits: the tree, and its revision log regenerated from this history. The commit
   hashes cited in `CLAIMS.md` and `docs/reviews/` refer to that private archive and
   do not resolve here. Issues #1 to #13 were copied from the archive in order, so
   the issue numbers cited here resolve; the ten closed ones are stubs."* **Replace
   `DATE` with the publication date as you write it** (`REVIEW-057` R3-12). Then run
   `bun install --frozen-lockfile` and `make inventory-third-party` in the export,
   which must pass and may rewrite `docs/third-party/INVENTORY.md` for the export's
   own file set; that rewrite goes into this commit (R3-11). Commit. Confirm with
   `git ls-files` that `docs/upstream-observed-WITHHELD.md` and
   `docs/evidence/f12-emsdk-2026-10-18/logs-unscrubbed/` are absent and `NOTICE` is
   present.
6. **The second commit, artifact-only:** run `bun run tools/build-claims-revisions.ts`
   and commit the regenerated log. Rehearsed on 2026-10-18 at `bceea15`: two commits,
   the oracle not run because history starts at publication, and the check passed.
7. **Run the phase 1 gate on the export, with the worktree clean**:
   `bun run tools/check-no-secrets.ts --repo <export> --strict-history`, **without
   `--rev`**, so it scans both commits' history as well as the tree (`--rev` turns
   history off), and fails on personal data in that history rather than reporting
   it: both commits are published (`REVIEW-057` R2-7). Then, there: `make ci`;
   `make inventory-third-party` followed by `git diff --exit-code`, so the notice is
   proved complete for the exact tree (R3-11); and
   `! git grep -n -w DATE -- README.md`, so no placeholder is published (R3-12).
   Record `git rev-parse HEAD`. ⚠ **Any later change to the export goes back to
   step 5.**

   **Steps 5 to 7 done 2026-10-19**, in `…/ripple/xrpl-confidential-positions-public`,
   exported from `main` at `a17285b` and dated 2026-10-19. Two commits, `d7fc148` and
   `9edf965`; the withheld file and the unscrubbed logs absent, `NOTICE` and the eight
   `LICENSES/` files present. The strict gate with the local store: 97/97 controls, 19
   stored secrets searched, 673 files and 672 history objects, PASS. `make ci`: 227
   pass, 5 skipped, 0 fail. The inventory: nine projects, and no diff on the re-run.
   No `DATE` left. **Recorded: `9edf965f33d122be9a4afb36992ad6c15059a36d`.** ⚠ If
   publication happens on a later day, the README's date is wrong and step 5 runs
   again.
8. **Apply D4 and D8.** Rename the private repository to
   `xrpl-confidential-positions-private`. In every private clone on the inventory,
   run `git config --unset-all remote.origin.pushurl` (a stale push URL would
   otherwise survive the next command, R3-5), then `git remote set-url origin` to
   the new HTTPS URL, confirm with `git ls-remote origin` and
   `git remote get-url --push --all origin`, and run `make install-push-guard`. It
   keeps the recorded archive id, because the id survives the rename, and refuses if
   any push URL resolves elsewhere. **Done 2026-10-19**: renamed with the id
   `1335911613` unchanged and still private; `origin` repointed, no stale `pushurl`;
   the guard reinstalled with the same id; the old name redirects to the archive
   until step 9 takes it. The only clone, so the inventory needs nothing more.
9. **Stage it privately.** Create `nandanito/xrpl-confidential-positions` as a
   private repository and push **only the recorded commit**:
   `git push <url> <recorded-sha>:refs/heads/main`. Confirm with `git ls-remote`
   that it holds that one ref and nothing else. **Wait for the first CI run there to
   pass**, because no Linux run has happened yet. Note the check name it emits; the
   job is `checks`. Then apply D7, as specified under it.
   ⚠ **If anything but the recorded commit is ever pushed to the staging repository,
   delete it and start step 9 again.** GitHub can keep serving a pushed commit by
   its hash after the ref that pointed at it is gone, so a mistake there cannot be
   tidied away before the repository goes public.

   **Done 2026-10-19.** Created private as id `1424974282`, Discussions and wiki off;
   the guard in the archive clone then refused a dry run to that name by id. Pushed
   only `9edf965`: one ref, nothing else. The first Linux CI run passed, `tools/ci.sh`
   to the end with 227 pass, 5 skipped, 0 fail; the check context is **`checks`**.
   Its warnings: `actions/checkout` v4.4.0 targets the deprecated Node 20, and
   `ubuntu-latest` begins moving to Ubuntu 26. The 13 issues were created in order
   from the swept files; one 502 from GitHub created nothing and was retried, and
   every issue read back identical to its files, the ten stubs closed.
10. **Make it public**, then set private vulnerability reporting on, which
    `SECURITY.md` and `CODE_OF_CONDUCT.md` rely on, and branch protection requiring
    the check step 9 recorded. Clone it fresh and re-run step 7's gate on that clone.
    **Then apply D8's C**, if the account offers it: a ruleset on every branch and
    tag that restricts creation, update and deletion and blocks force pushes, with
    two bypass actors, a deploy key kept only in the export folder and the
    repository admin role for pull requests only. **Prove it with a harmless push**:
    from a fresh clone of the public repository, using your everyday credentials,
    push a new branch holding one empty commit. GitHub must refuse it. If rulesets or
    a deploy-key bypass are not available, record that here and rely on A.

    **Published 2026-10-19.** `nandanito/xrpl-confidential-positions` is public, id
    `1424974282`; anonymous requests for its page and API return 200, and for the
    archive 404. Private vulnerability reporting is on. `main` requires `checks` and
    refuses force pushes and deletion. A fresh clone holds `9edf965` and nothing
    else, and passed step 7's strict gate with the local store: 97/97 controls, 19
    stored secrets searched, 673 files and 672 history objects. ⚠ **D8's C is not yet
    applied**: the owner chose to check the public page first.

## Found this session, and not in the plan

- **The Devnet evidence the README offers a stranger is no longer served** by the
  public endpoint, whose history now starts at ledger 5,171,980. Devnet was not
  reset (E-319). Phase 2's hosted demo should not depend on old transaction
  hashes either.
- **Devnet runs rippled 3.4.1**, not the `3.4.0-rc5` the session prompt recorded.
- **The F-12 build logs were never committed**, so the README beside them cited
  evidence a reader could not open. They are committed now, scrubbed (E-317).
- **The licence question in D3** is not in the plan, which lists licence terms as
  open without saying why they might be hard.
- **D3's first pricing undercounted the upstream code by more than half**, because
  a patch's removed lines are upstream source as well as its context lines.
- **`REVIEW-057` found the plan could not produce what it promised**: one commit
  was impossible with a derived revision log, the gate ran with history off, and
  the required check had the wrong name. All three were in the version the owner
  ruled on.
- **The issue numbers were a publication blocker nobody had listed** (D7). The
  squash ruling covered commit hashes and not issue numbers, which also start
  again in a new repository.
