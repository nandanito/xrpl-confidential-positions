# REVIEW-062 self leg — claims-check of both drafts at 41098e8

Run by the author before the legs returned; kept out of the tree until they did.
Procedure: `.claude/commands/claims-check.md`. Status: E = matches an established
row; N = no row, support named; X = fixed before the legs ran.

| claim (blog unless marked) | row | status | note |
|---|---|---|---|
| Amendment enabled on Devnet, supported not enabled on Mainnet/Testnet, 2026-10-22 03:25 UTC | P-3; E-353 | E | `check-amendments` 03:25:30.481Z this session |
| Hides balances and Send amounts; who/when/how often public; conversion amounts public | P-4, P-11, F-24 | E | |
| Issuer always reads; one auditor max | P-9, E-11 | E | |
| Holder, issuer, auditor each read 500, then 475 after a 25-unit Send | E-58 | E | |
| Spending needs the encryption secret | E-33 | E | |
| Issuer can destroy by clawback, crediting no one; this project's tokens allow it | E-12; README | E | |
| Issuer can freeze via later CanLock; read in source, not run | E-290 | E | README also cites E-292 |
| Canonical zero in three places; enrolment visible; matched byte for byte | F-1, E-59 | E | |
| English page corrected in September | E-316 | E | #3916 merged 2026-09-09 |
| Spent-to-zero not recognisable | E-211 | E | |
| 500 / 400 / 100 bound; earlier "left by transfer" | R-7 | E | |
| Keys cannot change; no rotation or recovery | E-9, P-10 | E | |
| XLS-99 draft, authors Malhotra and Qian; rc1 and develop declare Supported::No; no network knows it | E-341, E-353 | E | authors from the 2026-10-20 survey's header read |
| Facility on Devnet 2026-08-25, 28 validated transactions | E-146 | E | the explainer page says the same |
| ConvertBack publishes each tranche; walkthrough said "aggregate change" | F-24 | E | |
| "shows nothing about which supplier drew how much" | R-1 | E | |
| Local node never finished syncing; risk accepted | E-148, E-151 | E | |
| One driver held every seed | README; E-146 | E | |
| `fail_hard` both arms on Devnet | E-149 | X | first draft said a confidential transaction; the run was a plain Payment's `tecNO_AUTH`. Fixed before commit |
| Substituted destination key publishes the amount for good | F-23 | E | read at source, said so |
| Trail of Bits had already found several of this project's early findings | README Credit; E-296, E-298, F-7 | E | |
| Secret unwiped behind a comment | E-200 | X | "thirty lines away" dropped: `Scalar` is in another file |
| ADR-0003 claim ruled unsound by four legs | E-230 | E | |
| Gate passed a CSP browsers refused | E-334 | E | |
| Five fixes not discharged | E-345 | E | |
| 61 numbered review records | — | N | `ls docs/reviews \| grep -oE '^REVIEW-[0-9]+' \| sort -u \| wc -l` = 61, 001 to 061 |
| Twelve prohibitions; eight corrections | P-1..P-12; R-1..R-8 | E | counted by grep |
| CI runs disclosure-phrases, negative-claims and the index checks | `tools/ci.sh:47-53` | N | |
| Negative-claims gate reads register rows | — | X | it reads `UPSTREAM-FEEDBACK.md`; corrected before commit |
| R-8's content | R-8 | E | |
| Four filings carried as open on 2026-10-18 | E-316 | E | |
| Eleven filings, four repositories | UPSTREAM-FEEDBACK outcomes table | N | counted |
| Filing outcomes on 2026-10-22 | E-353 | E | |
| #8118 fit neither template; rule 3 | `docs/UPSTREAM-FILING-PROTOCOL.md:38-40`, rule 3 | N | |
| Three reviews; only ToB April could be checked | B-13, B-30, B-31; README | E | |
| Custody powers | E-266 | E | |
| Derivation unpublished | issue #10 | E | |
| Same-user process reads the secret | README | N | the README's sentence; no row cited there either |
| Demo shows four accounts, no figures, not the facility | E-331, E-350 | E | |
| Built with Claude Code; reviewers Codex, Gemini, Claude | — | N | true of the records; **the owner's decision whether to say it** |
| P-5 words | — | E | used only negated: "not audited, not production-ready" |
| P-8 | — | E | no timing or size figure in either draft |
| LinkedIn: all of the above, shorter; "a fifth was fixed on 2026-10-21, not yet in a release" | E-353 | E | |

Nothing matched a BLOCKED row. Nothing rests on a PENDING row.

## Open for the owner, not for a leg

- `<BLOG-URL>` and the post's slug.
- Whether to keep the Claude Code disclosure sentence.
- The survey (E-353) and these drafts are in the archive only: the blog links
  `docs/evidence/upstream-survey-2026-10-22/README.md` on public `main`, which does
  not exist until a public update carries E-353.
