---
name: Something does not run
about: A command, a test or a gate fails, crashes or reports the wrong verdict
labels: bug
---

**What you ran**, exactly, from which directory.

**What you expected, and what happened.** For a gate, paste its last line, which
is its verdict.

**Your environment.** `bun --version`, your OS, and whether you ran
`tools/rebuild-env.sh` first.

⚠ Devnet only. If this involves mainnet in any way, stop: nothing here may be
pointed at mainnet.
