# REVIEW-063 leg A — launch posts and figures

`pwd`: `$USER_TMP/T/r063a.Opc2gN/repo`  
`git log --oneline`: `efe0d4a after: the blog in the site's format with figures, LinkedIn and social posts`; `f8a2411 before: the posts after REVIEW-062`  
Reviewed `git diff HEAD~1 HEAD`. The GitHub API check for `XRPLF/mpt-crypto` returned **200**; no `NO NETWORK`.

## Findings

### A-1 — HIGH
**Quoted text:** Bluesky: “they hide balances and transfer amounts.”

**Evidence:** `docs/posts/SOCIAL-2026-10-22-draft.md:71`; `CLAIMS.md:25,32` (P-4, P-11); blog clarification at `docs/posts/BLOG-2026-10-22-draft.md:68-75`. The unqualified “transfer amounts” implies amounts of all transfers are hidden, but Convert and ConvertBack amounts are public; only Sends between confidential balances hide their amounts.

**Suggested correction:** Say “they hide balances and amounts sent between confidential balances,” preserving that qualifier in the short post.

### A-2 — MEDIUM
**Quoted text:** Figure 2’s issuer spend cell says “may freeze one”; its description and the blog’s alt text repeat that the issuer “may freeze one.”

**Evidence:** `docs/posts/figures/figure-2-who-can-read-who-can-spend.svg:4,63-66`; `docs/posts/BLOG-2026-10-22-draft.md:130`. The blog’s supporting condition is at `docs/posts/BLOG-2026-10-22-draft.md:125-127`: locking can be turned on later **unless the token’s flags were made unchangeable when it was created** (E-290). The figure and alt text omit that condition, making the freeze power sound unconditional.

**Suggested correction:** Include the unchangeable-flags condition in the cell, description, and alt text, or state that freezing is conditional.

### A-3 — MEDIUM
**Quoted text:** Author notes: “[redacted 2026-10-22: a sentence about the EVM study, REVIEW-063c A-3].”

**Evidence:** `docs/posts/LINKEDIN-2026-10-22-draft.md:18-19`; `docs/posts/SOCIAL-2026-10-22-draft.md:12-13,18-20`. Although the post copy itself only says the EVM study is running and results will follow, these notes say more about the EVM study than the posts may. That goes beyond the permitted “study running/results will follow” statement and implies a result.

**Suggested correction:** Remove the finding-specific disclosure from the notes; retain only that the same study is running on EVM chains and results will follow.

### A-4 — MEDIUM
**Quoted text:** The LinkedIn post does not name the three outside reviews or say which one could be checked.

**Evidence:** `docs/posts/LINKEDIN-2026-10-22-draft.md:31-57`; the Phase 3 requirements are in `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md:219-224`. The blog does name Trail of Bits, Sherlock and Zellic, and says only Trail of Bits’ report could be checked (`docs/posts/BLOG-2026-10-22-draft.md:84-91`), but the plan calls for this disclosure in the two posts.

**Suggested correction:** Add the three names and identify Trail of Bits as the only review whose report could be checked, while making clear none reviewed this project.

### A-5 — MEDIUM
**Quoted text:** LinkedIn says “Eleven issues” were filed and “Five are resolved upstream so far.”

**Evidence:** `docs/posts/LINKEDIN-2026-10-22-draft.md:45`; Phase 3 requires each filing to be described by its outcome on the survey date (`docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md:199-208`). The blog gives the filing outcomes at `docs/posts/BLOG-2026-10-22-draft.md:307-336`, but LinkedIn’s aggregate count does not say what happened to the other filings or distinguish their outcomes.

**Suggested correction:** Briefly summarize the remaining filings’ outcomes as of E-353’s survey, or otherwise meet the plan’s per-filing outcome requirement.

### A-6 — MEDIUM
**Quoted text:** Blog front matter points to `/images/posts/amounts-not-relationships/linkedin-card.png`; social notes say to attach `images/posts/amounts-not-relationships/linkedin-card.png`.

**Evidence:** `docs/posts/BLOG-2026-10-22-draft.md:9-11`; `docs/posts/SOCIAL-2026-10-22-draft.md:14-16`. In this commit the card exists only at `docs/posts/figures/linkedin-card.png`; no `images/posts/amounts-not-relationships/` asset exists in the repository. Unless the website build supplies that path separately, the blog image and the stated attachment path will not resolve to this card.

**Suggested correction:** Put the card at the referenced asset path or update both references to the actual published asset location.

## File and figure disposition

- `docs/posts/BLOG-2026-10-22-draft.md`: **A-2, A-6**. The dated amendment statement is supported by E-353’s 2026-10-22 reading; the post includes its date, says the reading goes stale, and cites the source. The no-rotation/no-recovery sentence matches the survey and XLS-99’s draft status. The EVM copy stays within the permitted scope. Blog’s three-review account and filing outcomes match the Phase 3 requirements.
- `docs/posts/LINKEDIN-2026-10-22-draft.md`: **A-3, A-4, A-5**. Its “as I write this” amendment wording is dated by E-353’s 2026-10-22 check and the post timestamp, but should be rechecked on publication as the note says. The EVM post copy itself makes no result claim.
- `docs/posts/SOCIAL-2026-10-22-draft.md`: **A-1, A-3**. Recounted post lengths: X **1,805** characters, with its opening paragraph **219**; Bluesky **267** including its full URL; Mastodon **497** when the link is counted as 23 characters. These fit the limits stated in the note. The note’s X, Mastodon and Nostr zero details are supported by F-1/E-59 and E-12; Bluesky’s dropped transfer qualifier is the substantive compression error.
- `docs/posts/figures/figure-1-where-the-line-falls.svg`: **no findings**. Checked its `<title>`, `<desc>`, visible labels and arrows against P-4/P-11, E-11 and the walkthrough; no material mismatch found.
- `docs/posts/figures/figure-2-who-can-read-who-can-spend.svg`: **A-2**. The table’s visibility and spending columns otherwise match the register; the freeze cell lacks its flags condition.
- `docs/posts/figures/figure-3-the-facility.svg`: **no findings**. Checked the funding and Convert direction, bidirectional drawdown/repayment arrows, enrolment labels and retirement flow against the walkthrough’s steps and F-24; no material mismatch found.
- `docs/posts/figures/linkedin-card.png`: **no findings** on its declared dimensions; it is **1200×627**. It is not present at the blog’s declared image path (A-6).

## Links and checks

The blog’s own URL, `https://nandan.me/writing/amounts-not-relationships/`, returned **404** during this check; it is not live yet, not a broken published post. The demo and xrpl.org English page returned **200**. The GitHub repository’s checked `main` paths for `CLAIMS.md`, the walkthrough, the explainer, `UPSTREAM-FEEDBACK.md` and the 2026-10-22 survey returned **200** through the GitHub API. The cited XLS-0096, XLS-0099 and mpt-crypto GitHub pages returned **200**.

The website copy has no prohibited vocabulary, exclamation marks, or em dashes in titles, excerpts, headings or captions. No figures were rendered for visual inspection. I did not independently rerun the amendment RPC, filing survey, or Devnet transactions; those were checked against the repository’s dated evidence.

END OF LEG A REPORT
