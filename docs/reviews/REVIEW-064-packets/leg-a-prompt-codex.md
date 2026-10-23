# REVIEW-064 leg A — the launch posts after REVIEW-063's fixes, with a business case added

You are a documentation reviewer for an open-source research project, checking a blog
post, its three figures, a LinkedIn post and four short social posts for factual
accuracy before they are published. The project studies what XLS-96 (confidential
Multi-Purpose Tokens on the XRP Ledger) hides and what it does not. Its claims register,
`CLAIMS.md`, governs every sentence it publishes: **E** rows are evidence, **F** findings,
**P** standing prohibitions, **B** pending claims, **R** corrections. Where a text and a
row disagree, the row wins. Agreement is not useful; a sentence that holds is worth
reporting only if you checked it and say against what.

This is the second round on these texts. Round one, `REVIEW-063`, is adjudicated in
`docs/reviews/REVIEW-063c-adjudication-2026-10-22.md`, with its legs' reports in
`docs/reviews/REVIEW-063-packets/`. Its fixes were applied and read by their author only.
Since then the owner asked for three more things, and they are in this diff too:

- a key to the register's ids at the top of the blog (*How to read the ids*);
- a business case before the example (*Why it matters: the business case*), a scored
  answer to it at the end of the facility section (*Against the business case's
  questions*), and one line added to the first closing takeaway;
- two sentences in the LinkedIn post that carry the same business case.

There is no later round planned, so report everything now.

## STEP 0 — do this first and print the results

1. Run `pwd` and `git log --oneline`. The working copy holds exactly two commits.
   **`git diff HEAD~1 HEAD -- docs/posts` is the subject.** Work only inside this
   directory.
2. Run `curl -s -o /dev/null -w '%{http_code}\n' https://api.github.com/repos/XRPLF/mpt-crypto`.
   If it is not 200, print `NO NETWORK` at the top and mark every link not checked.
3. **Do not read** anything outside this directory, in particular any path under
   `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, `~/Library`, any `scratchpad`
   directory, and anything under `/Users/*/Development`. They hold the owner's private
   configuration and other projects, and you do not need them.
4. You may write scratch files under `$TMPDIR`, and render the SVGs to PNG there if a
   renderer is available. Do not commit or push.

## Questions, in this order

1. **Were round one's fixes made, everywhere?** For each finding `REVIEW-063c` upholds
   (leg A's A-1 to A-6, leg B's upheld rows, leg C's figure changes), check the text now.
   A fix is a corrected *phrase*, and phrases have copies: search all three post files,
   the figures' `<text>` and `<desc>`, and the blog's `alt` attributes for the
   uncorrected wording, not only the line the finding cited. Say for each: discharged,
   partly, or not, with the site.
2. **Did a fix introduce a new error?** A shorter sentence that drops a qualifier the
   register requires, or a qualifier that is now wrong.
3. **The id key.** Does each letter's description match what that section of
   `CLAIMS.md` holds? Read the section headings and a sample of rows in each, including
   rows that do not fit the description. Do the instructions for finding a row work on
   the register as it is laid out, and does the topic-pages link point at a file that
   exists in this tree?
4. **The business case.** It makes statements about receivables finance, about who
   would mind which figures being public, and about the case usually made for a shared
   ledger. These are not in the register. Say whether any of them states as fact
   something that needs a source, claims more than the post can stand behind, or
   implies that XLS-96 or this project meets a regulatory requirement (P-6).
5. **The scored answers.** Check each of the seven answers against the rows it cites
   and the body of the post. In particular: does the answer about cover traffic use
   `B-10` (a pending row) correctly; is the lost-key answer consistent with the body's
   *No rotation, no recovery* section; is the issuer's power to freeze stated with its
   condition and with the fact that it was read in source and not run (E-290).
6. **The LinkedIn post**: its two new sentences against P-11 and the rest; its length.
7. **Rules that apply to every sentence**: `CLAIMS.md` P-1 to P-12, in particular P-3
   (amendment status needs a dated reading), P-4 and P-11, P-5, P-7, P-8, P-9, P-10;
   `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`, *Phase 3*. The EVM sentences may say only
   that the same study is running on EVM chains and results will follow. The posts must
   not name any tool or model provider used to build or review the work. The owner's
   website forbids *transformative, empower, unleash, paradigm shift, game-changing,
   boundary-pushing, bold, journey, passionate, thrilled, honoured, excited to share,
   leverage* (as a verb), *innovate, revolutionary, decentralised future*; no
   exclamation marks in body text; em dashes at most two per 1,000 words and none in
   titles, excerpts, headings or captions.
8. **Links.** Each link in the posts: does it resolve now? For paths in the public
   repository `nandanito/xrpl-confidential-positions`, check its `main` through the
   GitHub API. The blog's own URL is not live yet; say so rather than reporting it broken.

## Report

Print the whole report to stdout, as Markdown. For each finding: an id (A-1, A-2, …), a
severity (**HIGH**: false, or claims more than the evidence; **MEDIUM**: unsupported or
misleading; **LOW**: wording), the quoted text, the evidence with paths and line numbers,
and a suggested correction. Then the round-one table from question 1. Then, for each
file and each figure, its findings' ids or *no findings*. End with what you did not
check, and the line `END OF LEG A REPORT`.
