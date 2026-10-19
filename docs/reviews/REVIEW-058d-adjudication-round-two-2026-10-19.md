# REVIEW-058d — adjudication of round two: round one's fixes

- **Date:** 2026-10-19
- **Subject:** the fixes to round one, from `d764bca` to the frozen
  `629f21621c723cd7f61afec032c09248760b3ddf`, against the rulings in `REVIEW-058c`.
- **Register:** `CLAIMS.md` E-329. **Result:** `ADR-0004` revision 3, and further
  code fixes in `facility/src/loopback.ts`, `web/api/capability.ts` and
  `tools/check-disclosure-phrases.ts`.
- **Stopping condition**, set before round one and copied into both packets word
  for word: *no third round unless round two finds a fix that did not discharge its
  finding.* **It fired.**

## The legs

| leg | model and access | packet |
|---|---|---|
| A | Codex `gpt-6.1-sol`, effort `high`, a fresh clone of `629f216` under `$TMPDIR`, no remote, `workspace-write` with network | five seams, starting with a row-by-row discharge audit of `REVIEW-058c` and a sweep of the whole tree outside `docs/reviews/` for every corrected sentence. `round-two-prompt-codex.md` |
| B | Gemini through `agy`, effort `high`, no tools | five questions, with revision 2 and revision 1 whole, `REVIEW-058c`, its own round-one report and the changed code, inline. `round-two-prompt-gemini.md` |
| self | the author | written from 11:07Z, before either leg launched, committed after both returned. `round-two-self-notes.md` |

Leg A ran 34 shell commands, none touching a private store, `~/.claude`, `~/.codex`
or the scratchpad. It reported that one early source read displayed public
test-vector seed literals; both secret sweeps pass on its scrubbed transcript.
Both prompts were re-read against the frozen commit before launch, the lesson of
round one's packet defect, and neither leg reported a false premise.

## The legs split on the condition, and the split is about coverage

Leg B ruled every round-one finding discharged and the condition **not** met. Leg A
ruled it **met**, by three fixes, each found by sweeping the tree for the sentence a
fix corrected. For two of the three, leg A looked somewhere leg B could not:
`web/api/capability.ts` and the self leg's notes were not in leg B's packet. The
third, R2-1, was: leg B had the whole ADR and read the fixes where they were made.
That is the pattern this project has recorded before: a leg given before-and-after
text did not find the copies, and only a whole-tree sweep did. **The split is not
a disagreement about the same evidence.** ⚠ STRUCK in part by `REVIEW-058e` (E-330): ~~not a disagreement about the same evidence~~ is true of R2-2 and R2-3 only. For R2-1 both legs had the evidence, and one missed the copy. All three of leg A's condition-firing
findings were checked at source before this ruling.

## Rulings

| id | leg | claimed | ruling | why, and the fix |
|---|---|---|---|---|
| R2-1 | A | HIGH | **Upheld, HIGH. Fires the condition** | The abuse section still said *"nothing of ours runs per request"* after round one corrected the same sentence two sections up (B1-10). Now *"no server-side code of ours"*, with the retraction recorded at the site |
| R2-2 | A | HIGH | **Upheld, HIGH. Fires the condition** | `web/api/capability.ts`, browser-wallet row: *"There is no path from a connected wallet to a viewing key"* and *"not a permissions gap that a different API would close"*, the permanence claim R1-4 corrected on the wallet page, which renders this row. Both details are scoped to the three wallets examined, with the internally-proving wallet named as the case that would close it |
| R2-3 | A | HIGH | **Upheld, HIGH. Fires the condition** | The self leg's S-8 asked for *"the commit and the gate's verdict"*; `REVIEW-058c` and revision 2 kept the commit only, with no ruling dropping the verdict. Restored in the gate list and in step 9's falsifier. ⚠ The narrowed fix was the author's, against the author's own finding |
| R2-4 | A | MEDIUM | **Upheld, and the self leg's T-1** | The reader accepted `validated: false`, a string index and a `ledger_current_index` on both paths, and tolerated `objectNotFound`, where the Rust reader's `came_from` refuses all four. One predicate now serves both paths ~~with the Rust checks~~. Six mutations, each turning a test red. ⚠ STRUCK by `REVIEW-058e` (E-330): a decimal-form index still reads as an integer here and is refused there |
| R2-5 | A | MEDIUM | **Upheld** | Removing only the issuance call site's type check left every test green. A test now reads a wrong-type issuance through `snapshot.issuance()` |
| R2-6 | A | HIGH | **Upheld, regraded MEDIUM** | `REVIEW-058c` said H3 made *"Ledger values are not cached"* true by construction; it does the opposite. The adjudication's sentence is struck in place and revision 3 says H3 serves cached, dated observations deliberately. Regraded because the ADR's own caching text was not false, only the adjudication's gloss on it |
| R2-7 | A | LOW | **Upheld, and the self leg's T-2 and leg B's B2-2** | Five findings were regraded, not six. Struck in `REVIEW-058c`. Three legs found the same restated count |
| R2-8 | A | MEDIUM | **Upheld** | E-327 still ended *"the rotation … has not run"*. Corrected with a marker |
| R2-9 | A | MEDIUM | **Upheld** | H3's cost now includes replacing the application's runtime dependency on the API: every route passes the root's `/api/meta` check, and the wallet and custody loaders call the API. Each page must load directly and by navigation with no API running |
| R2-10 | A | MEDIUM | **Upheld** | Revision 3 states the build machine's trust as a choice: ~~build where neither the private stores nor the deployment token is reachable, or accept that trust by name~~. ⚠ STRUCK by `REVIEW-058e` (E-330): the finding kept the token out of the build unconditionally, and this summary let the acceptance waive it; revision 4 restores it |
| R2-11 | A | MEDIUM | **Upheld** | Both false sentences passed `check-disclosure-phrases` once wrapped across two lines. The scan now flattens whitespace and reports the line a hit starts on. Restoring the wrapped sentences in the real pages fails the gate, and disabling the line-crossing fails exactly the two new wrapped-copy controls |
| R2-12 | A | LOW | **Upheld** | The wallet phrases now carry the subject that made them false, and a control shows a true sentence sharing their words is not caught |
| H3 extras | A | — | **Upheld** | The build names its endpoint and the remote-risk acceptance input in its allowlist; a per-account existence check renders a reset, a missing token and a failed read differently; a rebuild cadence, or an accepted indefinite snapshot, is the owner's to name |
| B2-1 | B | MEDIUM | **Upheld** | `REVIEW-058c` said revision 2 cited every upheld finding at its site; B1-1, B1-2, B1-9 and S-1 appeared nowhere in it, measured by `grep`. Revision 3 cites them, and the adjudication's sentence is struck |
| B2-2 | B | LOW | **Upheld, with R2-7** | |
| B2-3 | B | MEDIUM | **Upheld** | *"Reads Devnet once per page"* was neither true nor the design. The build opens one pinned snapshot for every page. The phrase had two more copies, in the ADR's may-touch list and in step 9, both found by `grep` and fixed |
| B2-4 | B | MEDIUM | **Upheld** | Under H3 a difference from today's ledger is staleness, not a lying server. The visitor wording now says the page does not update, and the ADR notes the endpoint keeps only recent history |
| Q4 | B | — | **Noted** | Leg B argued the strongest case against H3 and ruled that the move holds. Its argument includes a claim this project has not measured, that no Devnet account outside the demo set holds a confidential balance; revision 3 does not rely on it |
| T-1, T-2 | self | — | **Upheld**, as R2-4 and R2-7 | |

**Rejected:** none. One regraded down, R2-6, for the reason given.

## Round three

**Owed**, because the condition fired, and the owner's review policy allows exactly
one more plan round for this key. **The rotation closes after round three, whatever
it finds**: its findings are fixed and recorded, and none of those fixes is reviewed
by a fourth round. Round three should be narrow, the shape `REVIEW-050` and
`REVIEW-057e` used to close their rotations: one repository leg, asked only whether
each of round two's fixes discharges its finding at every site, and to sweep the
tree for copies.
