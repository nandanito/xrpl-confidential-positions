# Upstream survey, re-run 2026-10-23 after the blog was published

The owner asked for the filings to be checked again on the day after the last
survey (`docs/evidence/upstream-survey-2026-10-22/README.md`, `CLAIMS.md` E-353),
having seen a comment about contributing. The blog had been published the same
morning without a filing re-survey, because the plan asked for one only when the
last survey was more than a day or two old. `CLAIMS.md` E-360.

## Method

Steps 1 to 5 of the 2026-10-22 run, started at 2026-10-23T06:54:06Z:

1. `gh api repos/XRPLF/<repo>/issues/<n>`, `.../comments --paginate` and
   `.../timeline --paginate` for all eleven filings, as `nandanito`. Every fetch
   returned a body. Then the account's notifications since 2026-10-20 and
   `search/issues` for `involves:nandanito`, to find the comment the owner meant.
2. mpt-crypto #145, #149, #152 and #157, #145's reviews and comments, the
   releases and tags, `main`, and `search/issues` for everything in
   `XRPLF/mpt-crypto` updated since 2026-10-21. The files and bodies of #145 and
   #149, and `build-wasm.sh` at `main`. npm's version list for
   `@xrplf/mpt-crypto`, and xrpl.js's `packages/mpt-crypto` commits since
   2026-10-15.
3. XRPL-Standards `master`, the commits under `XLS-0096-confidential-mpt` since
   2026-10-19 and under `XLS-0099-confidential-mpt-key-rotation` since 2026-10-13,
   and `search/issues` for the repository since 2026-10-21.
4. The commit lists for the English and Japanese copies of the confidential
   transfers docs page.
5. rippled's tags, `develop`, and `features.macro` at `develop`.
   `tools/check-amendments.ts` at 2026-10-23T06:56:24.163Z, and `server_info` plus
   `feature` on Mainnet, Testnet and Devnet at 06:56:35–37Z, listing every
   amendment whose name matches *Confidential* or *Rotation*.

## Results

No filing has changed since 2026-10-21. State, close date and last update are as
the 2026-10-22 table records them, and no filing has a new comment.

| PR | state | merged | merge commit | what it does |
|---|---|---|---|---|
| mpt-crypto #145 | **merged** | **2026-10-22T07:13:32Z** | `eecc00778` | adds `_generate_canonical_encrypted_zero` and `_secp256k1_ec_pubkey_parse` to `build-wasm.sh`'s export list; *"Part of #141"* |
| mpt-crypto #149 | **merged** | **2026-10-22T18:53:00Z** | `4bbd640c8` | prover and verifier functions for XLS-99's three transaction types, rotation and recovery included |
| mpt-crypto #152 | merged | 2026-10-21 | `385b3611b` | unchanged since E-353 |
| mpt-crypto #157 | open | — | — | unchanged since 2026-10-19 |

mpt-crypto `main` is `4bbd640c8`. Its newest release is still `1.0.5`, from
2026-08-20. npm's newest `@xrplf/mpt-crypto` is still `0.1.1`, from 2026-08-24, and
xrpl.js's `packages/mpt-crypto` has no commit since 2026-10-15.

## Finding 1: the WASM half of #141 is merged, and the npm half waits on a release

#145 merged about four hours after the 2026-10-22 survey, which ran from
03:25Z, read it as approved twice and not merged. `build-wasm.sh` at
`main` line 324 now exports `_generate_canonical_encrypted_zero` and
`_secp256k1_ec_pubkey_parse`. The PR's description says it is only the export
half: *"The thin TypeScript wrapper the issue also asks for belongs in
@xrplf/mpt-crypto rather than here"*. Its author says they did not run the WASM
build locally and relied on CI.

#141 is open, and its timeline gained only #145's cross-reference. The comment
the owner remembered is the maintainer's of 2026-10-20, already in E-353: *"Thanks,
that would be great! I'll post here once #145 is in a release"*, answering the
owner's offer to write the wrapper in xrpl.js's `packages/mpt-crypto`. No release
carries #145, so the offer is not yet due, and nobody has started the wrapper.

**The blog was behind on this.** Its *What went upstream* section said the pull
request *"is approved and not merged"*. That was true when the 2026-10-22 survey
read it and false by the time the blog was published on 2026-10-23. The owner
ruled the sentence corrected the same day.

## Finding 2: mpt-crypto `main` has the proofs for key rotation and recovery

#149, by an author of XLS-99, adds functions to prove and verify the three new
transaction types: `ConfidentialMPTMirrorUpdate`, `ConfidentialMPTHolderKeyUpdate`
with rotation, recovery and cancel modes, and `ConfidentialMPTRecoverBalance`.
1,601 lines across five files, 571 of them tests. It is in no release.

Nothing on a network moved. rippled `develop` (`097cb5e89`, 2026-10-22) still
declares `ConfidentialMPTKeyRotation` as `Supported::No`, and no rippled tag newer
than `3.5.0-rc1` exists. On all three public networks the only amendment matching
*Confidential* or *Rotation* is `ConfidentialTransfer`: Mainnet (115 known,
`network_id` 0, no `build_version`) and Testnet (107, rippled 3.4.1) have it
supported and not enabled, and Devnet (107, rippled 3.4.1) has it enabled.
XLS-0099's directory has no commit since #662 on 2026-10-14.

The sentence the posts carry is unchanged: there is no rotation or recovery in
XLS-96, or on Mainnet, Testnet or Devnet, and a draft, XLS-99, proposes both. The
library half of that draft now exists on a main branch.

## Everything else

- **XRPL-Standards #669**, opened 2026-10-21 by an outside contributor, adds a
  non-normative FAQ entry to XLS-0096: a non-zero `TransferFee` and confidential
  balances cannot coexist, which §6.4 already states. **#664**, opened 2026-10-15
  by an XLS-99 author, adds proof sizes to XLS-99. Both open; neither touches a
  filing. XLS-0096 at `master` (`93389999a`) is unchanged.
- **The docs page.** Neither copy has a commit since `ae7ab946e` on 2026-09-17,
  so the Japanese copy still carries both sentences #3879 reported.
- **#611** has had no reply in 58 days. **#153, #154 and #155** have none in five.

## What this changed

`CLAIMS.md` E-360; the blog's *What went upstream* bullet for #141, on the website
and in `docs/posts/`; `UPSTREAM-FEEDBACK.md`'s survey note, its #141 outcome and
its follow-up; the README's survey link; and the launch plan's rule for when a
post's day needs a re-survey.

## What this does not establish

That the WASM build at `main` works: #145's author did not run it, and neither did
this survey. When a release carries #145 or #149. Whether #149's proofs match
XLS-99 as written, which was not read. Whether XLS-99 changes before it is enabled
anywhere.
