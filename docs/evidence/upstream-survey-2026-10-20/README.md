# Upstream survey, re-run 2026-10-20 before the posts

Phase 3 of `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` requires every filing to be
re-surveyed at source before a word of either post is drafted. This is that run.
It found two things `CLAIMS.md` E-316 and the 2026-10-18 re-run did not record,
and they are the reason this file is longer than its predecessor
(`docs/evidence/upstream-survey-2026-10-18/README.md`). `CLAIMS.md` E-341.

## Method

The three steps E-316 names, run with `gh` authenticated as this project's
account, plus two that the findings below called for:

1. `gh api repos/XRPLF/<repo>/issues/<n>`, `.../comments --paginate` and
   `.../timeline --paginate` for all eleven filings, listing state, close date,
   every comment by an account other than this project's, and every
   cross-reference. Every fetch returned a body; none failed.
2. `gh pr view <n> -R XRPLF/<repo> --json …` for the five PRs a closing comment
   names: XRPL-Standards #604 and #628, xrpl-dev-portal #3916, and mpt-crypto
   #145 and #152. `search/issues` for everything in `XRPLF/mpt-crypto` updated
   since 2026-10-17.
3. XLS-0096 fetched at XRPL-Standards `master` (`93389999a`, 2026-10-19) and at
   `58ccd3047`, and compared with `cmp`. Every check E-316 lists was re-run on
   the `master` copy.
4. The docs page fetched at xrpl-dev-portal `master` (`7e302d278`, 2026-10-15)
   **in both languages it exists in**, English and Japanese, and both rendered
   pages fetched live from xrpl.org. The site has two translations, `ja` and
   `es-ES`; only `ja` has this page.
5. `features.macro` read at rippled `develop` (`360843351`, 2026-10-19) and at
   `3.4.1`, the version Devnet's `server_info` reported. `tools/check-amendments.ts`
   at 2026-10-20T10:23:11.544Z, and a `feature` query to Mainnet, Testnet and
   Devnet at 2026-10-20T10:37:26.256Z, listing every amendment whose name matches
   *Confidential* or *Rotation*.

## Results

| filing | state | closed | outside comments | latest outside comment |
|---|---|---|---|---|
| xrpl-dev-portal #3879 | closed | 2026-09-09 | 0 | — |
| XRPL-Standards #608 | closed | 2026-09-10 | 1 | 2026-09-10 |
| XRPL-Standards #609 | closed | 2026-09-10 | 1 | 2026-09-10 |
| XRPL-Standards #610 | closed | 2026-09-10 | 1 | 2026-09-10 |
| XRPL-Standards #611 | open | — | 0 | — |
| rippled #8118 | closed | 2026-08-26 | 0 | — |
| mpt-crypto #141 | open | — | 1 | 2026-10-17 |
| mpt-crypto #148 | open | — | 0 | — |
| mpt-crypto #153 | open | — | 0 | — |
| mpt-crypto #154 | open | — | 0 | — |
| mpt-crypto #155 | open | — | 0 | — |

| PR | state | merged | merge commit | head |
|---|---|---|---|---|
| XRPL-Standards #604 | merged | 2026-09-03 | `33ea4ca66` | — |
| XRPL-Standards #628 | merged | 2026-09-10 | `58ccd3047` | — |
| xrpl-dev-portal #3916 | merged | 2026-09-09 | `25b48a78d` | closes #3879 |
| mpt-crypto #145 | open | — | — | `1128ab996` |
| mpt-crypto #152 | open | — | — | `5bec3364d`, closes #148 |

Nothing changed on any filing since 2026-10-18. #152's head is still `5bec336`,
the commit this project verified and commented on. mpt-crypto `main` is at
`c60a60cc8` (2026-10-02), so neither #145 nor #152 has merged.

The three closing comments and the #141 reply were read in full again and say
what E-316 records.

XLS-0096 at `master` is byte-identical to `58ccd3047`; its last commit is still
#628. On the `master` copy: `RevealedAmount` 0, *"public reserve"* 0, *"view keys"*
0, one `## 14.`, *"laptop"* 0, §7.2 states both deletion policies, and line 904
says the `tec` codes are applied and the transaction *"recorded in full,
ciphertexts included"*.

## Finding 1: #3879's fix reached the English page only

The English page at `7e302d278` has 0 *"indistinguishable"* and says at line 95
that anyone can reproduce the canonical encrypted zero. That is the fix E-316
checked.

The Japanese page, `@l10n/ja/docs/concepts/tokens/fungible-tokens/confidential-transfers.md`,
was added on 2026-09-06 in `44818d9a6`, *"feat(ja): Fungible tokens section"*,
translated from the text before PR #3916. #3916 merged three days later and did
not touch it. Its only later commit, `ae7ab946e` on 2026-09-17, is a Deep Freeze
rewrite. It carries both sentences #3879 reported:

- line 96, after a merge: このゼロ値はゼロを表す有効なElGamal暗号文ですが、秘密鍵を持たない観測者には他の暗号文と区別がつきません。
  (This zero value is a valid ElGamal ciphertext representing zero, but an
  observer without the secret key cannot distinguish it from other ciphertexts.)
- line 127: ゼロを表す暗号化された残高は、ゼロでない残高と区別がつかないからです。
  (Because an encrypted balance representing zero cannot be distinguished from a
  non-zero balance.)

`https://xrpl.org/ja/docs/concepts/tokens/fungible-tokens/confidential-transfers`
returned 200 on 2026-10-20 with `<html lang="ja">` and both sentences in the
rendered page. The English URL returned the fixed text.

Whether to tell upstream, and how, is the owner's decision. A comment on the
closed #3879 and a new dev-portal issue are the two channels; either goes through
`/upstream-issue` and `/issue-review`.

## Finding 2: a draft key-rotation standard exists

XLS-0099, *ElGamal Key Rotation for Confidential MPTs*, by Aanchal Malhotra and
Yinyi Qian, is in XRPL-Standards at `XLS-0099-confidential-mpt-key-rotation/`.
Its header reads `status: Draft`, `created: 2026-04-01`, `updated: 2026-08-31`;
it was merged by #598 on 2026-09-03 and changed by #630, #655 and #662, the last
on 2026-10-14. It adds three transaction types, `ConfidentialMPTMirrorUpdate`,
`ConfidentialMPTHolderKeyUpdate` and `ConfidentialMPTRecoverBalance`, covers
issuer, auditor and holder keys, and its abstract says *"Key rotation is
supported for both voluntary and loss-recovery scenarios."*

rippled `develop` at `360843351` declares
`XRPL_FEATURE(ConfidentialMPTKeyRotation, Supported::No, VoteBehavior::DefaultNo)`;
`3.4.1` has no such line. On all three public networks the `feature` list names
`ConfidentialTransfer` and nothing else matching *Confidential* or *Rotation*:
Mainnet (115 amendments known) and Testnet (107, rippled 3.4.1) have it
supported and not enabled, and Devnet (107, rippled 3.4.1) has it enabled. mpt-crypto PR #149, open since 2026-10-06, adds the prover and
verifier APIs for the three types.

`CLAIMS.md` P-10 forbids claiming that **XLS-96** supports rotation or recovery,
and that still holds. What changes is the sentence a post may build on it: there
is no rotation or recovery *in XLS-96 or on Mainnet, Testnet or Devnet today*, and
a draft amendment, XLS-99, proposes both. A private network is outside what was
asked.

This repository had the pointer and never captured it. XLS-0096 itself, at
line 938 in §16.2, says adding or replacing an auditor after issuance *"is not
possible with this amendment"* and links XLS-99 as what addresses it. E-316 read
that file on 2026-10-18, and `REVIEW-058`'s round-one packet quoted the line.
`REVIEW-054`'s round-one transcript lists the `ConfidentialMPTHolderKeyUpdate`
transactor files in rippled.

## What this changed

`UPSTREAM-FEEDBACK.md`'s outcome for #3879 and its U-1 row, the README's lost-keys
paragraph and its survey link, and phase 3 of the launch plan.

## What this does not establish

Whether XLS-99 changes before it is enabled anywhere, or what it will say when it
is. The reception of #611, which has had no reply in 55 days, and whether #145
and #152 merge as written. The other Confidential MPT pages in Japanese were not
read; the survey read the one page #3879 named.
