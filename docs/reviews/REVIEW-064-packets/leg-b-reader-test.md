# REVIEW-064 leg B — a fresh reader, the blog text only

**Method:** the reader-testing stage of the doc-coauthoring workflow. A Claude subagent
(Sonnet) with no context read one file, a copy of `docs/posts/BLOG-2026-10-22-draft.md`
as it stood after the author's claims-check, and was told not to read any other file, not
to open links, and to mark outside knowledge. Weaker independence than leg A: the same
model family as the author. It ran in about 30 seconds.

## Prompt, in summary

Part 1, ten questions a reader would bring, each answered from the post with a confidence
line: what is hidden and what is public; who besides the holder can read a balance, and
whether that can be switched off; what an id such as E-58 means and how to check it, and
what F, P, R and B stand for; the business problem and whether XLS-96 solves it; a lost
key; Mainnet status and how current that is; outside reviews; EVM; what a competitor
learns about one supplier; anything presented as production-ready.

Part 2: ambiguities, with the two readings; knowledge assumed of a business reader;
internal contradictions, including alt texts; where a business reader stops; whether the
business case works and its seven questions are answered.

## Report, condensed

Answers 1, 2, 3, 4, 6, 8, 9 and 10 at **high** confidence and correct. The id key worked:
the reader found the register, the find instruction and all five letters.

Medium confidence:

- **Q5, lost key:** *"and any seed it could be re-derived from"* is unexplained where it
  appears; the derivation is mentioned earlier and obliquely.
- **Q7, reviews:** clear on the three outside reviews and the one checkable report. It
  guessed the project's own review passes were automated, from the phrase *"review
  passes"*, and said so as a guess.

Ambiguities quoted: *"supported but not enabled"* (supported by whom; may read as about to
go live); *"Zero is sometimes visible"* against *"a balance spent down to zero … is not
recognisable"*, which read as a contradiction; *"Four resolved"* heading a bullet whose
items are hard to count to four, with the Japanese page still carrying the error;
*"Custody is accepted"* (by whom); *"the float"* (whose money); *"The issuer sees
everything"* (amounts, or identities too); *"in a small enough book"* (how small).

Assumed knowledge for a business reader: Devnet, Mainnet, Testnet, validators, ElGamal,
zero-knowledge proof, compact sigma protocol, inbox and MergeInbox, `tec`, `fail_hard`,
master seed, signer, CI, WASM, lockfile, rippled, XLS-65, *nominatively*. Receivables
finance and the Dedicated Account are explained well.

Inconsistency: figure 2's alt text gives the issuer's powers without the body's caveat
that the freeze was read in source and not run (E-290).

Where a business reader stops: first at *What XLS-96 is, briefly* (ElGamal,
zero-knowledge proofs), then at the four-transaction list, then at *What the reviews
caught*. They would read the business case and the facility's answers.

The business case: *"Yes, it works."* The three premises and the dilemma explain why it
matters before any technology, and all seven questions get numbered answers in the same
order. Weak spots: Q1's answer is partial (*"though the public totals bound it"*); Q5
leaves the supervisor question open; the supervisor in the shared-ledger paragraph is not
tied to a question.
