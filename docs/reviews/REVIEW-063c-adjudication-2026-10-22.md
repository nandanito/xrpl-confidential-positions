# REVIEW-063c — the launch posts in their final shape, with figures, adjudicated

**Subject:** `bf2055e`: the blog post moved into the format of the owner's website
(`nandan.me/writing/`), with fewer dates, a sentence that the same study is running on EVM
chains, a closing summary and three new figures; a rewritten LinkedIn post; and new posts for
X, Bluesky, Mastodon and Nostr, in the shape of the owner's earlier series.
**Requested by the owner:** the website's figure style (`array-thinking-to-q/writings/figures/STYLE.md`),
the earlier posts' shapes, a review of each post for its platform's audience, fewer dates, and
the EVM mention.
**Ruled by the plan:** each draft runs `claims-check` and one adversarial read before the owner
signs off (`docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`, phase 3).

| leg | reviewer | packet |
|---|---|---|
| A | Codex native pass, `gpt-6-luna` at high, in a two-commit repository under `$TMPDIR`, with network | every sentence, figure label, arrow, `<desc>` and `alt` against `CLAIMS.md` and the demo's reviewed diagrams; lengths; links; the website's banned words and dash rule. `leg-a-prompt-codex.md` |
| B | Gemini through `agy`, effort high, no tools | each post read as its platform's typical audience, then the blog as a reader arriving from any of them. `leg-b-prompt-gemini.md` |
| C | a Claude subagent, Sonnet, restricted to reading three PNG renders | the figures only, as a first-time reader. Weaker independence: the same model family as the author. Its report is `leg-c-subagent-output.md` |

All three ran in about two minutes. Leg A's network check returned 200.

## Leg A — six findings, five upheld, one upheld as a publication step

| id | finding | ruling | fix |
|---|---|---|---|
| A-1 | HIGH. Bluesky: *"they hide balances and transfer amounts"* drops the qualifier: Convert and ConvertBack amounts are public | UPHELD | *"the amounts sent between confidential balances"* |
| A-2 | MEDIUM. Figure 2, its `<desc>` and the blog's alt text make the freeze unconditional | UPHELD, and clawback too is conditional on the token | The issuer's spend cell, `<desc>`, alt texts and the closing summary say *"if the token's settings allow"* |
| A-3 | MEDIUM. The author's notes in two post files said more about the EVM study than *"results will follow"* | UPHELD | Removed. The notes now say the posts state only that the study is running |
| A-4 | MEDIUM. The LinkedIn post does not mention the three outside reviews | UPHELD in part. The plan names them for the blog; LinkedIn's rule is the same prohibitions. But the post counts filings, so it now says none is claimed as new and that one of three outside reports could be read | |
| A-5 | MEDIUM. LinkedIn gives five outcomes of eleven | UPHELD | *"the rest are open or were closed without comment"* |
| A-6 | MEDIUM. The card path the blog and notes name did not exist in the repository | UPHELD as a step, not a text defect: the path is the website's. The figures and card were copied to `images/posts/amounts-not-relationships/` in the website repository, and a local build of the site with drafts resolved all three figure paths and the card | |

Leg A gave figures 1 and 3 *no findings* against the walkthrough and the demo's diagrams.

## Leg B — the platforms

| platform | upheld | rejected, with the reason |
|---|---|---|
| LinkedIn | Issuer visibility can read as a requirement to a banking audience: the post now says both (*"For a regulated issuer that may be the point. For a holder, it is where the privacy ends"*). Auditors: one can read too. Key custody: the consequence is stated. The EVM line moved up beside the study it names. `#ZeroKnowledge` dropped | Cutting the six-author credit (P-7) and the EVM line (the owner's request) |
| X | *"Keys are for life"* invites a reply calling it FUD: now *"Keys cannot be rotated or recovered"*. The XRP community's likeliest reply, that issuer visibility is by design: now said in the post. Card attached, as planned. `#ZeroKnowledge` dropped | *"slated for XLS-99"*: XLS-99 is a draft, and *slated* claims more |
| Bluesky | The opening's jargon: now *"the XRP Ledger's confidential transfers on its test network"* | *"issuer backdoors"*: a disclosed, mandatory part of the standard is not a backdoor. Cutting the EVM line (the owner's request); shortened instead |
| Mastodon | A content warning, the norm for crypto topics: in the notes. `#XRPL` dropped. *"some zero balances"* made specific | Cutting the EVM line; shortened. A second link would break the 500-character limit; the repository is one click from the write-up |
| Nostr | Lead with the result, not a question: now *"confidentiality from the public, not from the issuer"*. The facility shortened to *"a small invoice-finance example"*. `#zeroknowledge` dropped | *"isn't privacy"*, *"total surveillance"*, `#CBDC`: loaded words that claim more than the evidence. Cutting XLS-99: the plan requires it, now with *"those three networks do not know it yet"* |
| Blog, from any post | | Moving the reviews and checks sections out: the plan's spine names them as the project's own part. Moving the row ids to footnotes: they are the provenance the post promises. A ledger excerpt: a fair idea that needs a verified excerpt from the run records; offered to the owner. An EVM architecture paragraph: it would describe the EVM study before its results, and a negative about EVM tokens would need its own search |

## Leg C — the figures, all upheld

Figure 1: *"hidden"* said nothing about from whom while the dark frame read as *protected*; now *"hidden from the public"* twice, and the two outer boxes are A's and B's public balances. Figure 2: the issuer's spend cell, the key caveat, was the least readable; it is now in normal ink and conditional, and the footer says grey means no. Figure 3: the Sends' label says *"both ways"*, the supplier boxes and the label say *"hidden from the public"*, the bank's *"reads every balance"* is in bold, the bottom row names *"the confidential float"*, and the enrolment box has room. Rejected: a different style for the holder's *"their own"* cells, which are a partial yes against *"every one"*.

## What this does not establish

The fixes are the author's, read by the author only, and checked by the gates, the website's
dash checker, a local site build and a re-count of every length. A second read is available
and was not run. The amendment reading is E-353's; re-run it on the day of posting.

A-3's sentence was redacted from leg A's output and transcript, with a marker. It is still in this
archive's history at `bf2055e`; public updates copy files, not history, so it does not travel.
