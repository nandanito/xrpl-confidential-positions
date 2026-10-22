# Upstream survey, re-run 2026-10-22 before the posts

Phase 3 of `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` requires every filing to be
re-surveyed at source before a word of either post is drafted. The previous run
(`docs/evidence/upstream-survey-2026-10-20/README.md`) is two days old, and the
session that drafts the posts runs it again first. It found that F-9's filing
was fixed and closed the day before. `CLAIMS.md` E-353.

## Method

The five steps of the 2026-10-20 run, plus one for the fix this run found:

1. `gh api repos/XRPLF/<repo>/issues/<n>`, `.../comments --paginate` and
   `.../timeline --paginate` for all eleven filings, as `nandanito`, listing
   state, close date, every comment by another account, and every
   cross-reference. Every fetch returned a body; none failed.
2. `gh pr view` for mpt-crypto #145, #149 and #152, their reviews and comments,
   `compare/5bec3364d...<head>` for #152, and `search/issues` for everything in
   `XRPLF/mpt-crypto` updated since 2026-10-19. The releases and tags list.
3. XLS-0096 at XRPL-Standards `master` (`93389999a`, unchanged since 2026-10-19)
   compared with `58ccd3047` by `cmp`. The commit list for XLS-0099's directory.
4. The docs page at xrpl-dev-portal `master` (`dfebf359f`, 2026-10-21) in English
   and Japanese, the commit list for each copy, and both rendered pages fetched
   live from xrpl.org. `@l10n` still holds `ja` and `es-ES`, and `es-ES` has no
   copy of this page.
5. `features.macro` at rippled `develop` (`025aa7193`, 2026-10-21), at `3.4.1`
   and at `3.5.0-rc1`, a tag that did not exist on 2026-10-20.
   `tools/check-amendments.ts` at 2026-10-22T03:25:30.481Z, and `server_info`
   plus `feature` on Mainnet, Testnet and Devnet at 2026-10-22T03:30:47.442Z,
   listing every amendment whose name matches *Confidential* or *Rotation*.
6. **F-9 re-run at the merged commit.** mpt-crypto fetched at `385b3611b` into
   an empty directory, rippled's `conan/` fetched at `develop` `025aa7193`,
   Conan 2.33.0 in its own virtual environment, and `CONAN_HOME` set to an empty
   directory before the first `conan` command. rippled's `conan/init.sh` run as
   mpt-crypto's README directs, then `conan graph info . --lockfile=conan.lock`.
   The control is the same command with the lockfile from the merge's parent,
   `c60a60cc8`.

## Results

| filing | state | closed | outside comments | latest outside comment |
|---|---|---|---|---|
| xrpl-dev-portal #3879 | closed | 2026-09-09 | 0 | — |
| XRPL-Standards #608 | closed | 2026-09-10 | 1 | 2026-09-10 |
| XRPL-Standards #609 | closed | 2026-09-10 | 1 | 2026-09-10 |
| XRPL-Standards #610 | closed | 2026-09-10 | 1 | 2026-09-10 |
| XRPL-Standards #611 | open | — | 0 | — |
| rippled #8118 | closed | 2026-08-26 | 0 | — |
| mpt-crypto #141 | open | — | 2 | 2026-10-20 |
| mpt-crypto #148 | **closed** | **2026-10-21** | 0 | — |
| mpt-crypto #153 | open | — | 0 | — |
| mpt-crypto #154 | open | — | 0 | — |
| mpt-crypto #155 | open | — | 0 | — |

| PR | state | merged | merge commit | head |
|---|---|---|---|---|
| mpt-crypto #145 | open, approved twice | — | — | `1128ab996` |
| mpt-crypto #149 | open | — | — | `3aeda45d3` |
| mpt-crypto #152 | **merged** | **2026-10-21** | `385b3611b` | `7dbe21cd1`, closes #148 |

The four PRs the 2026-10-20 run read as merged (XRPL-Standards #604 and #628,
dev-portal #3916) did not change. mpt-crypto `main` is `385b3611b`. Its newest
release is still `1.0.5`, from 2026-08-20.

## Finding 1: F-9 is fixed on mpt-crypto `main`, and not in a release

#148 was closed as *completed* at 2026-10-21T16:16:15Z, two seconds after PR #152
merged. #152 gained a commit after this project's check: `7dbe21cd1`, on
2026-10-20, moves the Linux CI jobs to a shared image and adds `conan/init.sh`,
`conan/global.conf` and two profiles. It did not touch `conan.lock`. The merged
lockfile is byte-identical to the one at `5bec3364d` that this project resolved on
2026-10-18 and reported in a comment. It pins `openssl/3.6.5#57e26a79…` where the
filing's lockfile pinned `openssl/3.6.2#4789bbf1…`.

The re-run, from step 6:

- rippled's `init.sh` exited 0 and left two remotes, `xrplf`
  (`conan.xrplf.org`) first and `conancenter`.
- `conan graph info . --lockfile=conan.lock` at `385b3611b` exited 0. All three
  recipes resolved from `xrplf`: `openssl/3.6.5#57e26a79`,
  `secp256k1/0.7.1#b1f450b7` and `zlib/1.3.2#1cb806da`.
- The control, the parent's lockfile, exited 1 with *"Package 'openssl/3.6.2'
  not resolved: Unable to find 'openssl/3.6.2#4789bbf1…' in remotes"*, the
  failure F-9 recorded.

The check resolves recipes. It does not build. For this machine's profile the
graph lists the openssl binary as *Missing*, which the README's
`conan install .. --build=missing` builds from source; that build was not run.

mpt-crypto's README still says only *"Set up Conan using rippled's BUILD.md"*.
It names neither the remote nor the new `conan/init.sh`. rippled's setup now
works for this lockfile, because rippled's `init.sh` has added `conan.xrplf.org`
since `9c292fbe4` on 2026-08-10 and the lockfile now pins a revision that remote
serves.

**A maintainer disagreed with part of this project's comment.** The comment on
#152 said *"This covers what #148 asked for; the CI image question is
separate."* On 2026-10-20 a maintainer quoted that and replied: *"I disagree
here - this PR tries to get rid of the old non-working Conan remote. But the
(unsupported) image is still using that remote."* Commit `7dbe21cd1` is the
image change that reply asked for. The filing had asked for the remote at all
three sites, CI included (E-313), so the reply corrects the comment, not the
filing.

## Finding 2: rippled `3.5.0-rc1` declares the key-rotation amendment, unsupported

rippled `3.5.0-rc1`, tagged 2026-10-20, carries
`XRPL_FEATURE(ConfidentialMPTKeyRotation, Supported::No, VoteBehavior::DefaultNo)`,
the line the 2026-10-20 run found only on `develop`. `3.4.1` still has no such
line. On all three public networks the `feature` list names
`ConfidentialTransfer` and nothing else matching *Confidential* or *Rotation*:
Mainnet (115 known, `network_id` 0) and Testnet (107, rippled 3.4.1) have it
supported and not enabled, and Devnet (107, rippled 3.4.1) has it enabled.
Mainnet's `server_info` returned no `build_version`.

XLS-0099's directory has no commit since #662 on 2026-10-14. Its header still
reads `status: Draft`. mpt-crypto PR #149, the prover and verifier APIs for the
three new transaction types, is open and was last updated 2026-10-20.

The sentence E-341 allows a post is unchanged: there is no rotation or recovery
in XLS-96, or on Mainnet, Testnet or Devnet, and a draft, XLS-99, proposes both.

## Everything else

- **#141.** A maintainer replied on 2026-10-20 to the owner's 2026-10-18 offer:
  *"Thanks, that would be great! I'll post here once #145 is in a release"*.
  #145 was approved on 2026-10-20 and again on 2026-10-21, and is not merged; a
  reviewer asked why its CI failed and the answer was the stale
  `conan.ripplex.io`, which #152 fixes.
- **#611** has had no reply in 57 days. **#153, #154 and #155** have none in four.
- **XLS-0096** at `master` is byte-identical to `58ccd3047`.
- **The docs page.** English has 0 *"indistinguishable"* and the live page says
  anyone can reproduce the ciphertext. The Japanese copy's last commit is still
  `ae7ab946e`, and lines 96 and 127 still carry both sentences #3879 reported.
  `https://xrpl.org/ja/docs/concepts/tokens/fungible-tokens/confidential-transfers`
  returned 200 with `<html lang="ja"` and both sentences in the rendered page.
- **mpt-crypto #157**, opened 2026-10-19 by an outside contributor, asks for a
  helper that checks a public amount against `INT64_MAX`. It touches none of the
  four filings' subjects.

## What this changed

The `CLAIMS.md` F-9 row's evidence cell and E-353, `UPSTREAM-FEEDBACK.md`'s
outcomes for #148, #141 and #611, the README's survey link, and the note beside
the archived #152 comment.

## What this does not establish

That mpt-crypto builds from source at `385b3611b` on any machine: the openssl
build was not run. When a release carries the fix. Whether #145 merges as
written, and the reception of #611, #153, #154 and #155. Whether XLS-99 changes
before it is enabled anywhere. The other Japanese Confidential MPT pages were
not read.
