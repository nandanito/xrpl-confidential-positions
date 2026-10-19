# REVIEW-046 — request: the custody decision request, in a round of its own

- **Date:** 2026-09-13
- **Subject:** `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md`, unchanged since `5328ed4`; reviewed at `b801c7e`.
- **Why now:** the request has never had a round to itself. Nine rounds went to the tooling on the branch that produced it, and three of the last five found a security overclaim in it on the way past — the auditor ciphertext stated as always present (E-266), a recommendation described as a refusal (E-278), and a quorum described as a second holder (E-283). It is the input to `CLAIMS.md` B-27, a ruling by the project owner.

## The legs, and how their packets differ

Differed deliberately, because identical packets give unanimity that is one reading distributed.

| Leg | Reviewer | Sees | Framing |
|---|---|---|---|
| **s** | Self, the adjudicating session | Everything, including rippled at `3.3.0` fetched from GitHub | Resolve every citation at source. **Written to the scratchpad before either external leg was launched, and committed only after both returned.** |
| **a** | Codex, `codex exec --sandbox read-only` | The repository, a complete shallow clone of rippled `3.3.0` (`00a178f`), and the vendored mpt-crypto. No network | Enumerate every credential and power over the float from source, and compare with the request |
| **b** | Gemini, `agy`, no tools | The request, `ADR-0002`, the facility walkthrough, XLS-0096 at `58ccd30` and the standing prohibitions, all in full. **No code** | A bank's custody risk officer: who can do what to the float, by the specification |

⚠ **Leg a was given a whole rippled tree, not selected files.** Picking which rippled files a leg sees is picking where it looks, and the self leg's findings would have been visible in the selection.

## Stopping condition

**One round, then fixes.** If the adjudication upholds a HIGH, the fixes are owed a second round under `CLAUDE.md`'s two-round rule, scoped to the changed sentences, and that is the owner's call to schedule. **No third round on this document** unless round two finds a new credential or power, which is the class round one exists to find.

**What this round does not do:** rule B-27. The request stays an input.
