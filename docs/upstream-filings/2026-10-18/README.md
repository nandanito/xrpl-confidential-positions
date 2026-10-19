# Upstream filings — 2026-10-18

The exact text submitted to XRPLF on 2026-10-18. Same layout as `2026-08-26/` and
`2026-09-28/`: destination and title in the first two lines, and the issue body is
everything after the first `---`. Each live body was fetched after filing and compared
with its file by `diff -B`; all three are identical apart from blank lines.

| File | Destination | Issue | Carries | Review |
|---|---|---|---|---|
| `01-mptcrypto-remark-6-1.md` | `XRPLF/mpt-crypto` | [#153](https://github.com/XRPLF/mpt-crypto/issues/153) | F-17 | `REVIEW-053`, three isolated Codex rounds |
| `02-mptcrypto-wasm-link.md` | `XRPLF/mpt-crypto` | [#154](https://github.com/XRPLF/mpt-crypto/issues/154) | F-12 | `REVIEW-055`, two rounds, the first reproducing the builds independently |
| `03-mptcrypto-shared-c1-size.md` | `XRPLF/mpt-crypto` | [#155](https://github.com/XRPLF/mpt-crypto/issues/155) | F-13 | `REVIEW-054`, two rounds |

`comment-pr152.md` is a comment, not a filing: an independent verification of PR #152's
regenerated lockfile, posted on 2026-10-18 after the owner authorised it. #152 is the
maintainer's fix for #148 (F-9).

All three ran `docs/UPSTREAM-FILING-PROTOCOL.md` rule 1 before sending, were read once
more by a second model on the filing day with every claim re-checked at source, and
were authorised by the project owner for this text. The drafts were written on
2026-09-28 and re-checked at upstream HEAD on 2026-10-18 before filing.
