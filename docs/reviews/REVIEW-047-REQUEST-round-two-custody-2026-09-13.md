# REVIEW-047 — request: round two on the custody fixes and the B-27 ruling

- **Date:** 2026-09-13
- **Subject:** `main` at `74bf9a1`. Everything that changed since `5328ed4` in answer to `REVIEW-046`: the fixed decision request and its new *Who else holds power* and *The ruling* sections, `ADR-0002`'s custody row and note, the struck sentence in the custody research note, register rows E-117, E-256, E-266, E-290 to E-294, B-27, B-28 and B-29, the disclosure in `facility/src/custody.ts`, and B-29's build with its tests and falsifier.
- **Why:** `REVIEW-046c` upheld four HIGHs, so `CLAUDE.md`'s two-round rule owes a round on the fixes. The owner's ruling was then built in the same pass, and the recommendation it accepted had no review of its own, so it is in scope too.

## The legs, differed

| Leg | Reviewer | Sees | Framing |
|---|---|---|---|
| **s** | Self | Everything, plus live Devnet state | Written before either external leg was launched, committed after both returned |
| **a** | Codex, `codex exec --sandbox read-only` | The repository at `74bf9a1`, the same rippled `3.3.0` clone as round one, the vendored mpt-crypto. No network | Review the fixes against source: missing powers, overstated fixes, surviving copies, false-pass tests, the ruling's reasoning |
| **b** | Gemini, `agy`, no tools | The disclosure, the fixed request, `REVIEW-046c`, `ADR-0002`, the eleven changed rows whole, and XLS-0096 at `58ccd30`. **No code** | An auditor checking the disclosure is complete and not overstated, by the specification |

## Stopping condition

Set in `REVIEW-046c` before this round ran: **no third round unless round two finds a further credential or power over the float.** Both packets ask each leg to say whether anything it finds is a **new power** or a **new mechanism** for a power already named, because only the first reopens the rotation.
