# REVIEW-049 — request: round two on `REVIEW-048`'s fixes

- **Date:** 2026-09-22
- **Subject:** `a130479..65e16e8` — the fixes to E-296 to E-307 and F-17, the new rows `B-30` and `E-310`, the `UPSTREAM-FEEDBACK.md` F-13/F-17 bullet, and the launch plan's phase 0.
- **Why:** `CLAUDE.md`'s two-round rule. The second round reviews the fixes, because fixing and describing a fix fail differently.
- **Stopping condition, set before this round ran** (plan, phase 0 step 2): **no third round unless round two finds a fix that did not discharge its finding.**

## The legs, differed

| Leg | Reviewer | Sees | Framing |
|---|---|---|---|
| **s** | Self | Everything, plus the network | ⚠ The model changed between the rounds, but this is the session that wrote the fixes. Written before either external leg was read. |
| **a** | Codex, **native pass**, `codex exec review -m gpt-5.6-luna -c model_reasoning_effort=high` | The repository at `65e16e8`, the mpt-crypto clone, the two PDFs. No network | *Are the fixes TRUE?* Check every new factual sentence against source, sweep the WHOLE register for B-30's list, find surviving copies |
| **b** | Gemini, `agy`, no tools | `REVIEW-048c` whole; every row in scope BEFORE and AFTER, whole, **F-12 and F-17 included**; `B-30`, `E-310`, the feedback bullet, the plan's phase 0 | *Did each fix DISCHARGE its finding?* One line per finding, none skipped |

⚠ **The Codex leg ran as the native pass, not a targeted round.** The user's review-policy hook allows a targeted round only for security, wire-contract or precedence-chain work, and requires the light model for a docs-only diff. This round is neither kind of targeted work, so no reason was manufactured to get past the hook. Two launches failed before one ran: `codex review` rejects `-m`, and `--base` cannot be combined with a custom prompt. The run that counted used `codex exec review` with the packet as its prompt and the range named inside it. ⚠ **That pass runs `workspace-write`, not read-only.** `git status --porcelain` was empty before and after, at `65e16e8`.

⚠ **Packet B was checked against its own questions before sending.** Every id the questions name — `REVIEW-048c`, E-296 to E-306, F-12, F-17, B-30, E-310, phase 0, the feedback bullet — was grepped in the assembled packet and found. That is `REVIEW-048`'s lesson applied: a question naming a finding the packet omits is how round one's leg B went wrong.
