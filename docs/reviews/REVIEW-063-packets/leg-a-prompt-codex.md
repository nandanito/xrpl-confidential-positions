# REVIEW-063 leg A — the launch posts and their figures, checked against the claims register

You are a documentation reviewer for an open-source research project, checking a blog
post, its three figures, a LinkedIn post and four short social posts for factual
accuracy before they are published. The project studies what XLS-96 (confidential
Multi-Purpose Tokens on the XRP Ledger) hides and what it does not. Its claims register,
`CLAIMS.md`, governs every sentence it publishes: **E** rows are evidence, **F** findings,
**P** standing prohibitions, **B** blockers, **R** corrections. Where a text and a row
disagree, the row wins. Agreement is not useful; a sentence that holds is worth reporting
only if you checked it and say against what.

The earlier text of the blog and LinkedIn posts was reviewed twice
(`docs/reviews/REVIEW-062c-adjudication-2026-10-22.md` and `REVIEW-062d-…`). This round
covers what changed since: the blog's move to the owner's website format, fewer dates,
a sentence that the same study is running on EVM chains, a closing summary, three new
figures, a rewritten LinkedIn post, and new posts for X, Bluesky, Mastodon and Nostr.
There is no later round planned, so report everything now.

## STEP 0 — do this first and print the results

1. Run `pwd` and `git log --oneline`. The working copy holds exactly two commits.
   **`git diff HEAD~1 HEAD` is the subject.** Work only inside this directory.
2. Run `curl -s -o /dev/null -w '%{http_code}\n' https://api.github.com/repos/XRPLF/mpt-crypto`.
   If it is not 200, print `NO NETWORK` at the top and mark every upstream claim not checked.
3. **Do not read** anything outside this directory, in particular any path under
   `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, `~/Library`, any `scratchpad`
   directory, and anything under `/Users/*/Development`. They hold the owner's private
   configuration and other projects, and you do not need them.
4. You may write scratch files under `$TMPDIR`, and render the SVGs to PNG there if a
   renderer is available, to look at them. Do not commit or push.

## The subject

- `docs/posts/BLOG-2026-10-22-draft.md`: the blog post, now with the website's front
  matter and three `<figure>` elements.
- `docs/posts/figures/*.svg`: the three figures, hand-written SVG. **A figure's arrows,
  groupings and labels are claims as much as its sentences are**: a box placed inside
  another, an arrow's direction, which label sits on which edge. Check each `<text>`,
  each `<desc>`, and each `alt` attribute in the blog against the register.
- `docs/posts/LINKEDIN-2026-10-22-draft.md` and `docs/posts/SOCIAL-2026-10-22-draft.md`:
  the HTML comment at the top of each is the author's notes, not post text; check its
  factual claims too (lengths, the image size, the evidence rows it names).

## Rules the texts must obey

- `CLAIMS.md` P-1 to P-12. In particular P-3 (amendment status needs a dated reading:
  the owner asked for fewer dates, and the posts rely on the post's own timestamp and
  the note's citation of E-353; say whether that holds), P-4 and P-11, P-5, P-7, P-8,
  P-9, P-10, P-12.
- `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`, *Phase 3 — the two posts*: the three outside
  reviews named, with the one that could be checked; never *new* or *unreported*;
  *"no rotation or recovery in XLS-96, or on Mainnet, Testnet or Devnet"* with XLS-99
  named as a draft; each filing by its outcome on the survey date.
- **The EVM sentences** must say only that the same study is running on EVM chains and
  results will follow. They must not state or imply any EVM result.
- The owner's website forbids these words in its copy: *transformative, empower,
  unleash, paradigm shift, game-changing, boundary-pushing, bold, journey, passionate,
  thrilled, honoured, excited to share, leverage* (as a verb), *innovate,
  revolutionary, decentralised future*; no exclamation marks in body text; em dashes
  at most two per 1,000 words and none in titles, excerpts, headings or captions.

## Questions, in this order

1. **Every factual sentence and figure label.** Does its row, or the repository file it
   rests on, support it exactly? Quote the text and the source.
2. **The figures' structure.** For each figure, does each arrow, grouping and label
   match the register and `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md`? Compare
   with the hosted demo's reviewed diagrams in `web/app/src/hosted/Diagrams.tsx`, and
   report any place a figure says more, or differently.
3. **Short posts.** Re-count each platform's length as the note describes, and say
   whether each short post compresses a claim into something false (a shorter sentence
   that drops a qualifier the register requires).
4. **What is missing**, and any sentence that could mislead a reader who never opens
   the register.
5. **Links.** Each link: does it resolve now? For paths in the public repository
   `nandanito/xrpl-confidential-positions`, check its `main` through the GitHub API.
   The blog's own URL is not live yet; say so rather than reporting it broken.

## Report

Print the whole report to stdout, as Markdown. For each finding: an id (A-1, A-2, …), a
severity (**HIGH**: false, or claims more than the evidence; **MEDIUM**: unsupported or
misleading; **LOW**: wording), the quoted text, the evidence with paths and line numbers,
and a suggested correction. Then, for each file and each figure, its findings' ids or
*no findings*. End with what you did not check, and the line `END OF LEG A REPORT`.
