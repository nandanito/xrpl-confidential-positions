# Upstream filings — 2026-08-26

The exact text submitted to XRPLF on 2026-08-26, kept because a GitHub issue can be
edited afterwards and `UPSTREAM-FEEDBACK.md` needs to be able to point at what was
actually sent.

Each file carries its destination and title in the first two lines; the issue body is
everything after the first `---`.

| File | Destination | Issue |
|---|---|---|
| `01-devportal-enczero.md` | `XRPLF/xrpl-dev-portal` | [#3879](https://github.com/XRPLF/xrpl-dev-portal/issues/3879) |
| `02-standards-errata.md` | `XRPLF/XRPL-Standards` | [#608](https://github.com/XRPLF/XRPL-Standards/issues/608) |
| `03-standards-tecbadproof.md` | `XRPLF/XRPL-Standards` | [#609](https://github.com/XRPLF/XRPL-Standards/issues/609) |
| `04-standards-deletion.md` | `XRPLF/XRPL-Standards` | [#610](https://github.com/XRPLF/XRPL-Standards/issues/610) |
| `05-rippled-positives.md` | `XRPLF/rippled` | [#8118](https://github.com/XRPLF/rippled/issues/8118) |
| `06-standards-composability.md` | `XRPLF/XRPL-Standards` | [#611](https://github.com/XRPLF/XRPL-Standards/issues/611) |
| `07-mptcrypto-enczero-export.md` | `XRPLF/mpt-crypto` | [#141](https://github.com/XRPLF/mpt-crypto/issues/141) |

Filings 06 and 07 are the **second round** and carry no correction: they were drafted after
`P-12` and `tools/check-negative-claims.ts` were merged, with the Trail of Bits check run
before filing rather than after.

## ⚠ Four of the five were corrected the same day — read the corrections

A Codex adversarial review on 2026-08-26, run after filing, found **13 defects** across these five
(6 graded *would embarrass*). Corrections were posted to four of the issues and are archived here.
**The filing files above are the ORIGINAL submitted text, kept unaltered for provenance.** Each
carries a banner naming what no longer stands. Do not cite a filing without its correction.

| Correction | Issue | What it retracts |
|---|---|---|
| `correction-8118.md` | rippled#8118 | Item 1's central claim, item 2's attribution, the introduction, and item 4 (withdrawn) |
| `correction-608.md` | XRPL-Standards#608 | Item 3 narrowed; item 5's ambiguity claim halved |
| `correction-609.md` | XRPL-Standards#609 | `tapFailHard` — a name that does not exist in rippled |
| `correction-3879.md` | xrpl-dev-portal#3879 | A determinism comment generalised across three call sites |

`XRPL-Standards#610` also carries a follow-up comment (posted before the Codex round) narrowing it
to a §7.4 wording defect, after rippled's own tests were found to pin both deletion behaviours.

The full account is `CLAIMS.md` **E-155** (the filing) and **E-156** (the review).

All five carry a disclosure footer naming AI assistance and the date the citations were
checked — XRPLF states no position on AI-assisted contributions and imposes no CLA or
DCO, and this register's rule is to disclose when the policy is silent.

Sources the citations were checked against: rippled tag `3.3.0`
(`e6d8bdebc3d69f68bc6ccda88a46d24ace63e105a80403312f407eecb209855e`), XRPL-Standards
`master`, xrpl-dev-portal `master`, all read 2026-08-26.
