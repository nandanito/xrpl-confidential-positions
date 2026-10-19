# Personas — canonical copies

`.claude/agents/*.md` is generated from this directory. Regenerate whenever a
persona changes, or the two will drift.

Expected here: build-lead.md, protocol-researcher.md, crypto-reviewer.md.
~~Not yet populated — copy from the project setup document.~~ **All three are
populated**, and have been since well before 2026-08-25; this line said
otherwise until `REVIEW-023` round two, which found it while building the gate
below.

⚠ **`bun tools/check-personas.ts` is that gate**, and it exists because this
file's own convention was stated and never enforced. The `27 → 28` correction of
2026-08-25 reached `build-lead.md` here and **not** its generated copy, so the
only stale count left in the tree was in the file a subagent actually loads.
A sweep recorded in prose is a claim with no falsifier.

The Adversarial Reviewer and Publication Editor live in the Claude Desktop
project, not here. They review documents rather than touching the repository.
