# REVIEW-065c — the corrections a RippleX reader prompted, adjudicated

**Subject:** the corrections recorded as `CLAIMS.md` R-10, R-11 and E-361, before
commit. A RippleX reader of the published blog noted that MergeInbox also keeps
amounts confidential, and that clawback can be enabled after a token is created and
made immutable at creation or later. The author checked both at source and
corrected every copy the phrase gate and a sweep found: the blog, figure 1 and the
LinkedIn card, figure 2's alt text, the social drafts, the README, ADR-0001, the
signer's onboarding disclosure, and the hosted explainer and two of its diagrams.
**Why a review:** the corrections are new public claims about protocol behaviour,
and the author's own sweeps have missed copies before.

| leg | reviewer | packet |
|---|---|---|
| A | Codex native review, `gpt-6-luna` at high, in a two-commit repository under `$TMPDIR` (before: archive `1f81d5e`; after: the uncommitted corrections), with network | the primary sources by URL, XLS-0096 at `93389999a` and rippled `3.4.1`; six checks: each MergeInbox sentence, each clawback and immutability sentence, every remaining copy, the three register rows against their evidence, the new gate entries, and readability. `leg-a-prompt-codex.md` |

Leg A ran under a minute. Its transcript shows it fetching XLS-0096 and four rippled
`3.4.1` files, reading the diff, running `check-disclosure-phrases` (PASS) and two
whole-tree searches outside `docs/reviews/`. It reported that the MergeInbox and
`DynamicMPT` corrections are supported by the sources and that the sweep found no
remaining live copy.

⚠ The leg printed the third-party text it fetched, and `make inventory-third-party`
found rippled code in the transcript. The three output blocks are elided with a
marker naming what was printed and where it can be fetched, as `REVIEW-062`'s leg A
transcript was; the commands and every line the leg wrote are kept.

## Leg A — one finding

| id | finding | ruling | fix |
|---|---|---|---|
| A-1 | E-361 says `MPTokenIssuanceSet` can enable clawback, locking *"and four other capabilities"*; the source lists seven enable flags, so five others, `CanHoldConfidentialBalance` among them (`TxFlags.h` 153–162, `MPTokenIssuanceSet.h` 38–52) | UPHELD | E-361 now says five, and names the one that was missed. The row's own evidence cell already said *"seven enable flags"*: a count restated by hand, beside the count it contradicted. No post, page or disclosure states the number |

## What this does not establish

No newcomer leg read the corrected sentences; the fixes replace sentences in a
post two rounds already read. The claims about clawback, locking and immutability
are read at source and were not run on Devnet. The hosted demo serves the old text
until it is rebuilt from a public commit and the owner deploys it.
