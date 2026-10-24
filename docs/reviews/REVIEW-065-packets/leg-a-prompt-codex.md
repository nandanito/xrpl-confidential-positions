# REVIEW-065 leg A — a factual-accuracy review of two public text corrections

You are reviewing a documentation and user-facing text change in this repository
for factual accuracy and completeness. `git diff HEAD~1` is the change. It corrects
two kinds of sentence in a published blog post, its figures, social-post drafts, the
README, an ADR, a signer's onboarding disclosure string and a web page, and adds
entries to a text-checking tool, `tools/check-disclosure-phrases.ts`.

The two corrections, as the change states them:

1. **MergeInbox states no amount.** The old text said only a Send hides an amount,
   which read as though MergeInbox published one. The new text says Convert and
   ConvertBack publish their amounts, and Send and MergeInbox do not.
2. **Clawback and locking can be switched on after a token is created**, under the
   `DynamicMPT` amendment, unless the issuer has made that flag immutable, which it
   can do at creation or later. The old text treated clawback as fixed and gave the
   immutability condition for locking only, at creation only. It also corrects
   "the only remedy is clawback" for a lost key.

Primary sources (network is available; fetch them):

- XLS-0096 at `https://raw.githubusercontent.com/XRPLF/XRPL-Standards/93389999a/XLS-0096-confidential-mpt/README.md`, §10 (MergeInbox) and the Clawback section.
- rippled `3.4.1`, which Devnet runs: `include/xrpl/protocol/TxFlags.h`,
  `src/libxrpl/tx/transactors/token/MPTokenIssuanceSet.cpp`,
  `include/xrpl/tx/transactors/token/MPTokenIssuanceSet.h`,
  `src/libxrpl/tx/transactors/token/MPTokenIssuanceCreate.cpp`, at
  `https://raw.githubusercontent.com/XRPLF/rippled/3.4.1/<path>`.

Please check, and report each problem with file:line, a severity, the evidence and
a one-line fix:

1. Is every new or changed sentence about MergeInbox true against XLS-0096?
2. Is every new or changed sentence about clawback, locking, immutability and
   `DynamicMPT` true against rippled 3.4.1's source? In particular: can an issuer
   enable clawback after creation; can any capability be disabled; can
   `ImmutableFlags` be set at creation and later; does the post claim anything the
   source does not show?
3. Did the correction reach every copy? Search the whole "after" tree, outside
   `docs/reviews/`, for sentences that still say or imply that only Send hides an
   amount, that clawback is fixed at creation, that flags can be made immutable only
   at creation, or that clawback is the only remedy for a lost key.
4. Do the new register rows `R-10`, `R-11` and `E-361` in `CLAIMS.md` match the
   evidence they cite (file and line numbers included)?
5. Do the new entries in `tools/check-disclosure-phrases.ts` do what their comments
   say? Run `bun run tools/check-disclosure-phrases.ts` if bun is available.
6. Is any corrected sentence harder for a newcomer to read than it needs to be, or
   ambiguous in a way that could mislead?

Do not edit files. If a check could not be run, say so.
