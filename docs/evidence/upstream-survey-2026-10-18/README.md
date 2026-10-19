# Upstream survey, re-run 2026-10-18 for the README

Phase 1 item 3 of `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` requires the survey
`CLAIMS.md` E-316 records to be run again on the day the README is finalised.
This is that run. It was made a few hours after E-316's, on the same day, and it
changes nothing E-316 recorded.

## Method

The same three steps E-316 names, run with `gh` authenticated as this project's
account:

1. `gh api repos/XRPLF/<repo>/issues/<n>` and
   `gh api --paginate repos/XRPLF/<repo>/issues/<n>/comments` for all eleven
   filings, listing state, close date, and every comment by an account other than
   this project's. Every fetch returned a body; none failed.
2. `gh pr view <n> -R XRPLF/<repo> --json …` for the five PRs a closing comment or
   E-316 names: XRPL-Standards #604 and #628, xrpl-dev-portal #3916, and
   mpt-crypto #145 and #152.
3. XLS-0096 read at `58ccd3047`, the merge commit of #628, through
   `gh api repos/XRPLF/XRPL-Standards/contents/XLS-0096-confidential-mpt/README.md?ref=58ccd3047`.
   §7.2 and §7.4 read in full.

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

#152's head is still `5bec336`, the commit this project verified and commented on.

## What §7.2 says at `58ccd3047`

The deletion rules are in §7.2. §7.4 is the example JSON. Holder-initiated
deletion, by `MPTokenAuthorize` with `tfMPTUnauthorize`, fails with
`tecHAS_OBLIGATIONS` while the issuance's `ConfidentialOutstandingAmount` is
non-zero, and is allowed once it reaches zero even with the confidential fields
present. Implicit deletion by `VaultDelete`, `VaultWithdraw`, `VaultClawback` and
`LoanBrokerDelete` is blocked whenever any confidential balance field is present.
That is the behaviour F-29 read in rippled 3.3.0, so #610's finding is resolved by
the specification now describing it.

## What this changed

`README.md` *Before opting in* item 2, `docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md`
§6, and the `CLAIMS.md` rows E-18 and F-29, which still described the unconditional
rule. Their text now gives the §7.2 rule and the upstream outcome.

## What this does not establish

The reception of #611, which has had no reply, and whether #145 and #152 merge as
written. Both are E-316's open items too.
