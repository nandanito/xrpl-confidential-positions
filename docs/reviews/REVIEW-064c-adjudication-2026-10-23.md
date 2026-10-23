# REVIEW-064c — the launch posts' second round, and the business case, adjudicated

**Subject:** the posts after `REVIEW-063`'s fixes, which their author alone had read, plus
three changes the owner asked for on 2026-10-23: a key to the register's ids at the top
of the blog, a business case before the example with a scored answer after it, and two
LinkedIn sentences carrying the same case.
**Why a second round:** `CLAUDE.md`'s rule that round two reviews the fixes, and new
claims in the business case. **It is the last round on these texts**: a third would
review fixes to fixes.

| leg | reviewer | packet |
|---|---|---|
| A | Codex native review, `gpt-6-luna` at high, in a two-commit repository under `$TMPDIR`, with network | the diff from the posts as `REVIEW-063` read them to now; every round-one finding at every copy of its phrase; the id key against the register; the business case and its answers against the rows. `leg-a-prompt-codex.md`. The *before* commit kept the notes' redacted text, so the redacted EVM sentence was in neither commit |
| B | a Claude subagent, Sonnet, reading one file: the blog text | the doc-coauthoring workflow's reader test: ten predicted reader questions, then ambiguity, assumed knowledge, contradictions, where a business reader stops. `leg-b-reader-test.md` |
| self | the author's claims-check before either leg ran | `self-claims-check.md`; it fixed three sentences first: an unsourced market claim, a lost-key answer that dropped two qualifiers, and a universal claim on LinkedIn |

Leg A ran 44 seconds; its transcript shows `pwd`, the network check (200), a read of
`REVIEW-063c` and its packets, the register's rows, the figures, the banned-word scan and
every link. It answered in Codex's review format rather than the requested one, with five
findings and no round-one table; the transcript is the evidence it checked the rest.

## Leg A — five findings

| id | finding | ruling | fix |
|---|---|---|---|
| A-1 | The business case states market and motive claims as fact with no source; LinkedIn repeats *"shows its cash position"*; *"For a regulated issuer that may be the point"* hints at regulatory expectation | UPHELD | The blog states them as the example's three premises, *"the reasons the example was built, not findings of this project"*, in conditional words (*can signal*, *may be short of cash*); the buyer's payment terms are now definitional. LinkedIn: *"can signal"*; *"For an issuer that must answer for its book"* |
| A-2 | LinkedIn does not name the three outside reviews | REJECTED | The plan's *"Name all three, and say which one could be checked"* is in its blog item; LinkedIn gets *"Same prohibitions"*, which it obeys: nothing is called new, and the post says upstream's code had three reviews of which one report could be read. Naming auditors in a short post beside this project invites the P-5 misreading the blog spends a paragraph preventing, and the blog, one link away, names them |
| A-3 | The short posts' amendment and network status rests on a date only in the author's notes (P-3) | UPHELD in part | Every status sentence now reads *"as I write this"*, as LinkedIn's already did: X's opening, and the key sentence on X, Nostr and LinkedIn. No calendar date added, as the owner asked; the post's timestamp dates it, and the publishing step re-runs `check-amendments` on the day. Bluesky and Mastodon say *"I tested … on its test network"*, an event, not a status |
| A-4 | *"The only remedy is a clawback"*: E-10 and E-12 do not establish *only* | UPHELD, both copies | The body and the scored answer say the key is lost with its seed, and that *if the token allows clawback, the issuer can remove such a balance, and a clawback destroys it*. E-10 is cited |
| A-5 | Figure 2's alt text gives the freeze without E-290's condition | UPHELD, with leg B's same point | The blog's alt text and the social note's figure-2 alt text state both conditions. The SVG cell is unchanged: it says *"if its settings allow"*, and the paragraph beside it states the condition |

## Leg B — the reader test

The reader answered eight of ten questions at high confidence and correctly, including
what an id means and how to find one; the business case *"works"*, and all seven
questions were matched to their answers. Upheld and fixed:

- **Lost key** (with A-4): the derivation from the master seed is now stated where the
  loss is.
- *"supported but not enabled"*: now *"the server software supported it, but the
  validators had not switched it on"*.
- **Zero:** *"A balance spent down to zero is different: it holds a randomised encryption
  of zero, and looks like any other balance."*
- **Four resolved:** now counts three and a fourth.
- *"Custody is accepted"* → *"Custody is a named risk"*.
- **The float:** *"the bank's money that the facility advances"*.
- *"The issuer sees everything"* → *"The issuer reads every amount"*, with every balance
  and Send amount.
- **Where a business reader stops:** the business case now ends with a link past the
  three mechanism sections to the facility; the anchor was checked in a local build of
  the website.

Not changed, with reasons: the guess that the review passes were automated, because the
owner asked that no tool or provider be named, and the post already says they were the
project's own reviews and not outside ones; *"a small enough book"*, because the honest
answer depends on the book and the post says the totals can pin amounts exactly; the
jargon list beyond the mechanism sections, which the skip link now routes a business
reader around; Q5's supervisor, because the answer says what can be decrypted and P-6
forbids saying more.

## What this does not establish

The fixes to this round are the author's, checked by the gates, the website's dash checker
(0 em dashes in all three files), a local website build, and a re-count of every length:
X's opening paragraph 244 of 280, Bluesky 295 of 300, Mastodon 497 of 500 with the link as
23, LinkedIn 2,767. No third round is planned. The amendment reading is still E-353's, and
the short posts' *"as I write this"* is true only if `check-amendments` is re-run on the day
each is posted.
