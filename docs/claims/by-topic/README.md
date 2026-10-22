# CLAIMS by topic

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if these files drift from `CLAIMS.md`.

[`CLAIMS.md`](../../../CLAIMS.md) is chronological and append-only. **These are views of
it grouped by subject** — the rows are not moved, and a row appears under every topic
it belongs to. [`docs/CLAIMS-INDEX.md`](../../CLAIMS-INDEX.md) answers *where is E-181*;
these answer *what has this project learned about X*.

**429 rows across 12 topics**, counted where they are parsed.
⚠ The topic counts below sum to more than the row count, because a row can carry
several topics. That is the point of a view rather than a split.

| topic | rows | what is in it |
|---|---|---|
| [Protocol and cryptography](protocol-and-crypto.md) | 161 | What XLS-0096 and the libraries actually do — field codes, sizes, proofs, encryption, the confidential balance model. |
| [Instruments and gates](instruments-and-gates.md) | 96 | Gates, tests and detectors — including the many that reported PASS while the thing they checked was broken. |
| [Review rounds and adjudication](review-rounds.md) | 91 | What adversarial rounds found, what legs got wrong, and what the two-round rule has cost and bought. |
| [Claims, prose and drift](claims-and-drift.md) | 94 | Sentences that outran their evidence: stale notes, false disclosures, retracted claims and the documents that carried them. |
| [Secret handling](secret-handling.md) | 50 | Keys, seeds and scalars — what wipes, what does not, and the residuals named rather than closed. |
| [Devnet execution](devnet-execution.md) | 53 | What was actually submitted and validated on standard Devnet, and what a `tesSUCCESS` does and does not establish. |
| [Counts and numbers](counts-and-numbers.md) | 13 | The project's most persistent failure mode: a number restated instead of derived. |
| [Upstream, libraries and filings](upstream-and-filings.md) | 66 | rippled, mpt-crypto and the published packages — findings raised upstream and the build friction behind them. |
| [Confidentiality limits](confidentiality-limits.md) | 37 | What this system does not hide: the counterparty graph, timing, and every claim the register forbids. |
| [Environment and tooling](environment-and-tooling.md) | 17 | The build environment, the ephemeral `/tmp/wconf` tree, and the session mechanics that have cost real work. |
| [Decisions, rulings and scope](decisions-and-scope.md) | 91 | ADRs, decision requests and rulings — what was decided, what was reopened, and what a coding session may not choose. |
| [Web tier](web-tier.md) | 21 | Architecture §6 step 8: the read-only Elysia/TanStack tier, its gate, and the boundary it does and does not move. |

⚠ **A topic is a finding aid, not a judgement.** It says nothing about whether a
row is true or its grade deserved. Assignment is **LEXICAL, over a NAMED SET** of
patterns matched against each row's headline, plus an explicit override list in
`tools/build-claims-topics.ts` for the rows the patterns do not reach.

⚠⚠ **WHAT THESE VIEWS DO NOT DO** (`REVIEW-040`):

- **They index HEADLINES, not row bodies.** A point made only inside a row's evidence
  prose is invisible to every file here. **Grep `CLAIMS.md` for an exhaustive sweep.**
- **`protocol-and-crypto` holds 161 of 429 rows.** A filter returning that share of the
  corpus has not narrowed much. It is disclosed rather than re-cut, because re-cutting
  the taxonomy would invalidate the measurements this round was reviewed against.
- **A row's topics are as good as its headline.** A row whose headline uses different
  vocabulary lands only where the override list puts it.
