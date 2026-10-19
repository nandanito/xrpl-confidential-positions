# Third-party inventory

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/inventory-third-party.ts`.

Which tracked files reproduce upstream source or specification text. `NOTICE` is
written from this file. Method: code is **4 or more substantive lines in a row**,
with gaps of up to 2, each verbatim in a corpus after collapsing whitespace, and
is attributed to every project holding 4 or more of the run's lines; prose is
**a run of 12 consecutive words**, searched in the specification and documentation
corpora only. A substantive line has 20 or more characters and a letter. A run
is **licence text** when 80% of its lines come from licence files, and
**shared boilerplate** when more than 3 projects hold it; neither is
attributed, and only lines held by 3 projects or fewer count toward
attribution. ⚠ **What this cannot see**: a quotation shorter than those thresholds, a
paraphrase, and a source that is not a corpus below. Sources the records are known to
cite and that are **not** corpora: the Trail of Bits report and the Dore and Cenk papers,
which are PDFs under `docs/references/` and not in version control;
`bitcoin-core/secp256k1`; and web pages quoted a sentence at a time, such as GitHub's
documentation; diff-prefixed (`+`/`-`) quotations inside Markdown, outside a
`.patch` file; and a reflowed manifest (`Cargo.toml`, `package.json`), which the
identifier pass leaves out because every package's dependency list looks alike, so
only the line pass sees a manifest, and only unreflowed.

**What is compared.** On the tracked side, every file `git ls-files` lists with a text
extension (655 files), except lockfiles, `LICENSE`, `NOTICE`, `LICENSES/`
and this directory; lines lose a line-number prefix first. On the upstream side, 110
corpora are configured in 106 projects:
**96 were compared and 14 were unavailable**, listed
at the end. A corpus's files over 2 MB, and minified files, are not tokenised.

**9 projects reproduced.**

## XRPLF/XRPL-Standards — MIT

Compared at `master`, `9fbf7ef8eb69973f43d44836875e01e6364a3ecb`.

| file | kind | lines |
|---|---|---|
| `CLAIMS.md` | prose | 213–216, 462–465 |
| `docs/reviews/REVIEW-012-REQUEST-keygen-2026-08-18.md` | prose | 65–68 |
| `docs/reviews/REVIEW-021-REQUEST-step7-convert-back-2026-08-25.md` | code, prose | 148–176, 184–188 |
| `docs/reviews/REVIEW-046b-gemini-custody-request-2026-09-13.md` | code, prose | 11–22 |
| `docs/reviews/REVIEW-046c-adjudication-custody-request-2026-09-13.md` | prose | 34–37 |
| `docs/reviews/REVIEW-047b-gemini-round-two-custody-2026-09-13.md` | prose | 10–15 |
| `docs/reviews/REVIEW-054-packets/f13-round-one-transcript.txt` | code | 2681–2764 |
| `docs/reviews/REVIEW-054-packets/f13-round-two-transcript.txt` | code | 587–621 |
| `docs/reviews/REVIEW-057-packets/round-one-stderr.txt` | code | 10371–10388 |
| `docs/reviews/REVIEW-057-packets/round-two-stderr.txt` | code | 6760, 6942 |
| `docs/task-zero/SOURCES-2026-08-18.md` | prose | 96–98 |
| `docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md` | prose | 323–326 |
| `docs/upstream-filings/2026-08-26/01-devportal-enczero.md` | code, prose | 27–30 |
| `docs/upstream-filings/2026-08-26/02-standards-errata.md` | code, prose | 21–28 |
| `docs/upstream-filings/2026-08-26/04-standards-deletion.md` | code, prose | 7–10 |
| `docs/upstream-filings/2026-08-26/07-mptcrypto-enczero-export.md` | code, prose | 11–14 |
| `docs/upstream-filings/2026-08-26/correction-8118.md` | prose | 2–5 |
| `docs/upstream-filings/2026-10-18/03-mptcrypto-shared-c1-size.md` | prose | 23–27 |

## XRPLF/clio — ISC

Compared at `develop`.

| file | kind | lines |
|---|---|---|
| `docs/reviews/REVIEW-054-packets/f13-round-one-transcript.txt` | code | 2167–2189 |
| `docs/reviews/REVIEW-057-packets/round-three-stderr.txt` | code | 4354–4360 |
| `docs/reviews/REVIEW-057-packets/round-two-stderr.txt` | code | 8668–8701 |

## XRPLF/mpt-crypto — no licence file found

Compared at `85dbac73d033241b73f0565ae7cce86d07005c70`, `main`.

| file | kind | lines |
|---|---|---|
| `docs/evidence/f12-emsdk-2026-10-18/README.md` | code | 454–457, 461–464, 492–495, 499–502, 530–533, 537–540 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-dcxx.log` | code | 25–28, 32–35 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-empp.log` | code | 25–28, 32–35 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-dcxx.log` | code | 25–28, 32–35 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-empp.log` | code | 25–28, 32–35 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-dcxx.log` | code | 25–28, 32–35 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-empp.log` | code | 25–28, 32–35 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-dcxx.log` | code | 25–28, 32–35 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-empp.log` | code | 25–28, 32–35 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-partial.log` | code | 25–28, 32–35 |
| `docs/reviews/REVIEW-021-REQUEST-step7-convert-back-2026-08-25.md` | code | 209–218 |
| `docs/reviews/REVIEW-054-packets/f13-round-one-transcript.txt` | code | 861–910, 1066–1095, 1246–1276, 1574–1579, 1583–1593, 1836–1995, 1998–2027, 2029–2063, 2068–2142, 2167–2189, 2337–2462, 2660–2676, 3361–3372, 3507–3511, 3562–3567 |
| `docs/reviews/REVIEW-054-packets/f13-round-two-transcript.txt` | code | 671–717, 1797–1801 |
| `docs/reviews/REVIEW-055-packets/f12-round-one-transcript.txt` | code | 571–672, 674–694, 696–741, 744–845, 848–876, 2044–2048, 2099–2104 |
| `docs/reviews/REVIEW-055-packets/f12-round-two-transcript.txt` | code | 586–975, 978–1050, 1694–1713 |
| `docs/reviews/REVIEW-057-packets/round-one-stderr.txt` | code | 6968–6977, 7024–7041, 10421–10430, 10566–10575 |
| `docs/reviews/REVIEW-057-packets/round-two-stderr.txt` | code | 6817–6822, 7080–7085, 8668–8701 |
| `tools/mpt-crypto-bench/wconf_bench.c` | code | 91–100, 147–177, 180–186, 193–197, 201–213, 216–220, 265–271 |
| `tools/spike-2026-08-17/mptool.c` | code | 10–13 |
| `tools/spike-2026-08-18/wconf-nonces.patch` | code | 71–81, 96–104, 280–285, 305–310, 312–335, 379–401, 436–446, 480–484, 517–560, 670–674, 693–699, 724–727, 753–757, 764–823, 828–831, 908–911, 938–942, 951–1005, 1010–1013, 1210–1225, 1244–1284, 1320–1325, 1354–1422, 1429–1436, 1495–1498, 1569–1605, 1610–1613 |

## XRPLF/rippled — ISC

Compared at `3.3.0`, `develop`.

| file | kind | lines |
|---|---|---|
| `docs/reviews/REVIEW-003-REQUEST-2026-08-16.md` | code | 61–65 |
| `docs/reviews/REVIEW-054-packets/f13-round-one-transcript.txt` | code | 912–961, 964–981, 983–1062, 1097–1143, 1149–1242, 1246–1276, 1278–1424, 1642–1762, 1764–1834, 1836–1995, 2144–2162, 2167–2196, 2198–2342, 2467–2587 |
| `docs/reviews/REVIEW-054-packets/f13-round-two-transcript.txt` | code | 587–621, 623–636, 648–653, 662–667, 726–771, 773–855, 858–879, 885–987, 997–1011 |
| `docs/reviews/REVIEW-057-packets/round-one-stderr.txt` | code | 9836–9840 |
| `docs/reviews/REVIEW-057-packets/round-two-stderr.txt` | code | 8622–8626, 8668–8721 |
| `docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md` | code | 119–123, 196–201 |
| `docs/upstream-filings/2026-08-26/04-standards-deletion.md` | code | 19–25, 34–49 |
| `tools/spike-2026-08-17/mptool.c` | code | 10–13 |

## XRPLF/xrpl-dev-portal — MIT, per its LICENSE (GitHub reports NOASSERTION)

Compared at `master, paths matching /confidential/i`.

| file | kind | lines |
|---|---|---|
| `UPSTREAM-FEEDBACK.md` | prose | 241–244 |
| `docs/reviews/REVIEW-021-REQUEST-step7-convert-back-2026-08-25.md` | prose | 150–153 |
| `docs/reviews/REVIEW-046b-gemini-custody-request-2026-09-13.md` | prose | 19–22 |
| `docs/task-zero/ADDENDUM-2026-08-16.md` | prose | 61–64 |
| `docs/upstream-filings/2026-08-26/01-devportal-enczero.md` | prose | 19–22 |
| `docs/upstream-filings/2026-08-26/correction-608.md` | prose | 2–5 |

## crate ed25519-dalek — BSD-3-Clause

Compared at `2.2.0`.

| file | kind | lines |
|---|---|---|
| `docs/reviews/REVIEW-024-REQUEST-b16-ed25519-nonce-2026-08-27.md` | code | 1861–1957, 1968–1990, 1995–2007, 2013–2073, 2080–2092 |
| `docs/reviews/REVIEW-027-REQUEST-b21-and-e171-2026-08-27.md` | code | 292–322, 326–352, 358–389, 397–753 |
| `docs/reviews/REVIEW-027a-gemini-b21-e171-2026-08-27.md` | code | 49–56 |
| `docs/reviews/REVIEW-057-packets/round-one-stderr.txt` | code | 10039–10075, 10086–10108, 10113–10125, 10131–10143, 10287–10295 |
| `docs/reviews/REVIEW-057-packets/round-two-stderr.txt` | code | 8603–8610 |

## emscripten-core/emscripten — MIT and University of Illinois/NCSA, per its LICENSE

Compared at `6.0.12, ChangeLog.md`, `6.0.5, ChangeLog.md`.

| file | kind | lines |
|---|---|---|
| `docs/evidence/f12-emsdk-2026-10-18/README.md` | prose | 161–166 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/05-cause-changelog.log` | code | 9–34, 44–50, 52–69, 75–78, 80–105 |
| `docs/evidence/f12-emsdk-2026-10-18/logs/05b-cause-changelog-6.0.12-context.log` | code | 2–36, 48–51 |
| `docs/reviews/REVIEW-055-packets/f12-round-one-transcript.txt` | code | 1225–1230 |
| `docs/reviews/REVIEW-055-packets/f12-round-two-transcript.txt` | code | 1178–1185 |
| `docs/upstream-filings/2026-10-18/02-mptcrypto-wasm-link.md` | prose | 11–14 |

## npm @noble/curves — MIT

Compared at `1.9.7`.

| file | kind | lines |
|---|---|---|
| `docs/reviews/REVIEW-057-packets/round-two-stderr.txt` | code | 7559–7707 |

## npm ripple-binary-codec — ISC

Compared at `2.9.0`.

| file | kind | lines |
|---|---|---|
| `docs/reviews/REVIEW-057-packets/round-three-stderr.txt` | code | 4344–4347 |
| `docs/reviews/REVIEW-057-packets/round-two-stderr.txt` | code | 8652–8655 |
| `tools/spike-step3-2026-08-18/xrpl-vectors.json` | code | 257–260 |

## Reviewed and set aside

None.

## Licence text, not attributed

| file | lines | shared by |
|---|---|---|
| `docs/reviews/REVIEW-057-packets/round-one-stderr.txt` | 2162–2354, 2358–2362, 6864–6876, 9911–9924, 9928–9945, 10192–10220, 11218–11233 | 86 projects |
| `docs/reviews/REVIEW-057-packets/round-three-stderr.txt` | 4178–4201, 4908–4927, 4930–5020, 5028–5040, 5044–5057, 5061–5069 | 40 projects |
| `docs/reviews/REVIEW-057-packets/round-two-stderr.txt` | 1940–2030, 2038–2050, 2054–2067, 2071–2079, 4519–4609, 4617–4629, 4633–4646, 4650–4658, 9713–9725 | 88 projects |

## Shared boilerplate, not attributed

| file | lines | shared by |
|---|---|---|
| `docs/reviews/REVIEW-027-REQUEST-b21-and-e171-2026-08-27.md` | 164–173, 194–200 | 66 projects |
| `signer/tests/support/mod.rs` | 9–14 | 19 projects |

## Not compared

- crate curve25519-dalek-derive `0.1.1`: NOT FOUND LOCALLY — not compared
- crate fiat-crypto `0.2.9`: NOT FOUND LOCALLY — not compared
- crate syn `2.0.119`: NOT FOUND LOCALLY — not compared
- crate wasi `0.11.1+wasi-snapshot-preview1`: NOT FOUND LOCALLY — not compared
- crate windows-sys `0.52.0`: NOT FOUND LOCALLY — not compared
- crate windows-targets `0.52.6`: NOT FOUND LOCALLY — not compared
- crate windows_aarch64_gnullvm `0.52.6`: NOT FOUND LOCALLY — not compared
- crate windows_aarch64_msvc `0.52.6`: NOT FOUND LOCALLY — not compared
- crate windows_i686_gnu `0.52.6`: NOT FOUND LOCALLY — not compared
- crate windows_i686_gnullvm `0.52.6`: NOT FOUND LOCALLY — not compared
- crate windows_i686_msvc `0.52.6`: NOT FOUND LOCALLY — not compared
- crate windows_x86_64_gnu `0.52.6`: NOT FOUND LOCALLY — not compared
- crate windows_x86_64_gnullvm `0.52.6`: NOT FOUND LOCALLY — not compared
- crate windows_x86_64_msvc `0.52.6`: NOT FOUND LOCALLY — not compared
