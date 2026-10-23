# REVIEW-062c — the phase 3 post drafts, one read, adjudicated

**Subject:** `docs/posts/BLOG-2026-10-22-draft.md` and
`docs/posts/LINKEDIN-2026-10-22-draft.md` at `41098e8`, the first drafts written
after the 2026-10-22 survey (`CLAIMS.md` E-353).
**Ruled by the plan:** each draft runs `claims-check` and one adversarial read
before the owner signs off the final text (`docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`,
phase 3). The claims-check is the self leg below. The adversarial read is two legs
with differed packets, run at the same time.

| leg | reviewer | packet |
|---|---|---|
| A | Codex native pass, `gpt-6-luna` at high, the light pass the owner's policy sets for a docs-only subject, in a two-commit repository under `$TMPDIR` built from `git archive`, with network | both drafts against `CLAIMS.md`, the plan and upstream sources. `leg-a-prompt-codex.md` |
| B | Gemini through `agy`, effort high, no tools, from an empty directory | the two posts' text only, read as a stranger arriving from LinkedIn. `leg-b-prompt-gemini.md` |
| self | the author, before either leg returned | `claims-check` over every claim. `self-claims-check.md` |

Leg A's first launch was refused because another session's Codex round was
running, and the policy allows one at a time; it started a minute after leg B. Leg A ran two minutes and leg B one
and a half (`timings.txt`). Leg A's network check returned 200 for both hosts; its
transcript names no path outside its directory except the prompt's own
do-not-read list. Its working copy was clean afterwards.

Two edits were made to leg A's transcript before it was committed, and both say
so where they were made. `tools/scrub-personal-data.ts` replaced 21 temporary-directory
paths and five third-party email addresses the leg had printed from repository
files. Then 919 lines were elided: the source of the published
`@xrplf/mpt-crypto` 0.1.1 package, which the leg printed while checking its
exports. `make check-inventory-fresh` found it as reproduced third-party code,
TypeScript's emitted helpers among it, with no `NOTICE` entry. The leg's command
and the file list it printed are kept.

## Leg A — three findings, all upheld

| id | finding | ruling | fix |
|---|---|---|---|
| A-1 | HIGH. *"eight corrections, R-1 to R-8, each a sentence this project published and later found false"*: R-4 records a finding withdrawn because the docs had described pre-fix behaviour, and R-5 a retraction that was itself reversed | UPHELD. Checked at `CLAIMS.md` R-4 and R-5. Not every R row was published either: R-1 and R-2 were internal | "eight correction records … Most withdraw or narrow something this project claimed; one records a retraction that was itself reversed" |
| A-2 | MEDIUM. The LinkedIn draft gives five of eleven outcomes and does not name the three outside reviews | UPHELD in part. The plan puts the three reviews in the blog's item; LinkedIn's rule is *"same prohibitions"*, and it makes no novelty claim. But five outcomes with the rest unstated reads as a summary of all eleven | One sentence for the other six, and a pointer to the write-up for each filing and the three reviews |
| A-3 | MEDIUM. The survey link is 404 on public `main` | UPHELD. Known before the read, and listed in the self leg | Not a text fix: the public update that carries E-353 must land before either post goes out. A condition on publication, below |

Leg A gave every other section of both drafts an explicit *no findings*, and
inspected `@xrplf/mpt-crypto` 0.1.1's published exports on its own: no fixed-zero
helper, which the blog's #141 sentence relies on.

## Leg B — eleven findings upheld in whole or part, three rejected in whole or part

| id | finding | ruling | fix |
|---|---|---|---|
| B-1 | *"Three reviews of this code exist"* reads as audits of this project, and contradicts the status line | UPHELD, HIGH for the reader the post is for | The paragraph says the three reviewed upstream's code and none reviewed this project, which has had no outside audit; moved out of *What went upstream* into the XLS-96 background |
| B-2 | *"adversarial review"* reads as a third-party audit | UPHELD in part | *"These were reviews run with AI models, as described above, not audits"* |
| B-3 | *"It hides the shape of the book, not its size"*: a stranger reads *shape* as who borrows and when, which is public. It was also the title | UPHELD, MEDIUM | Retitled *"Amounts, not relationships"*; the slogan replaced by the plain statement in both drafts. ⚠ The same phrase is on the live explainer page and in the README; not changed here, see below |
| B-4 | *"signs nothing and holds no keys"* against E-230's re-served data | UPHELD as wording | E-230's bullet says it was the local viewer on the holder's machine, before the hosted demo existed |
| B-5 | Terms used unexplained: MPT, ElGamal, sigma protocol, inbox, clawback, Dedicated Account, `tec`, vaults | UPHELD in part | A clause each where first used. The inbox now enters with Convert and Send |
| B-6 | *"Read on 2026-10-22 …"* reads as an instruction | UPHELD | *"When I checked on …"*, in both drafts |
| B-7 | The negative-claims gate sentence is hard to parse | UPHELD | rewritten |
| B-8 | The audits paragraph sat under the upstream filings | UPHELD | moved, with B-1 |
| B-12 | Item 2's summary inferred that #8118 was closed *for* fitting no template. The close had no comment | UPHELD, MEDIUM: the post may not imply a cause nobody gave | *"so its reason is not known. It also fit neither …"* |
| B-13 | Item 1's summary read XLS-96 as *proposed*, and the upstream fixes as the author's | UPHELD, LOW, LinkedIn | *"XLS-96 is a final standard"*; *"Upstream resolved four"* |
| B-11a | Missing: the inbox's purpose | UPHELD under B-5 | |
| B-9 | The `tec` consequence belongs under what the protocol hides | REJECTED | It is a failure mode of a signer that reads a dishonest node, read at source (F-23), not a property of what XLS-96 hides; it sits where the post separates reading from running |
| B-10 | Cut the checks section, the CSP item, the positives item and the Japanese sentence | REJECTED for the checks section, which the plan's spine names, and the Japanese sentence, which E-341 requires of any post calling #3879 fixed. The CSP and positives items are one bullet each and stay | |
| B-11b | Missing: a raw transaction view, and proof timings and fees | REJECTED. The demo's observer page is the first and is linked. The second is P-8's territory and outside the post's question | |

## Self leg — what it found before the legs ran

Three of the author's own sentences were wrong and fixed before `41098e8`: the
`fail_hard` arms were run with a plain Payment's `tecNO_AUTH`, not a confidential
transaction (E-149 says so); the negative-claims gate reads `UPSTREAM-FEEDBACK.md`,
not register rows; and E-200's *"thirty lines away"* was dropped, because the type
is in another file. Neither leg found anything in those three places.

⚠ The self leg passed all three of leg B's main findings, B-1, B-3 and B-12, and
leg A's A-1. All four are sentences that are true when read as their register row
and false or misleading when read as English, which is
`docs/reviews/REVIEW-060c`'s lesson again: only the stranger's read finds the
first kind.

## What this does not establish

The fixes were read by the author only. The plan rules one read per draft, and
the owner's sign-off is the next read. A second leg on the fixes would follow this
project's two-round rule and is offered, not run.

## Conditions on publication, for the owner

1. **A public update carrying E-353** and `docs/evidence/upstream-survey-2026-10-22/`
   before either post goes out (A-3).
2. **`<BLOG-URL>`** in the LinkedIn draft, once the blog post has its address.
3. **The Claude Code sentence** in the blog's introduction, which says how the
   project was built and reviewed, is the owner's to keep or cut; B-2's fix refers
   back to it.
4. **`compare-deployed` on the day of each post**, after breaking it on a copy, as
   the plan rules.
5. **The phrase B-3 found is still on the live site and in two documents.** *"It
   hides the shape of the book, not its size"* is on the live `/how-it-works`
   (`web/app/src/hosted/routes/how-it-works.tsx:196`), in the README's *What XLS-96
   hides* section (`README.md:71`), and in `WHAT-CONFIDENTIAL-MEANS` (`:133`). It is true as the register means it and misread by
   a stranger in the direction that overstates the privacy. Changing it means a
   rebuild and a redeploy; whether to before the posts is the owner's call.
