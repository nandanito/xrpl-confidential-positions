# REVIEW-052a — Codex round one on the F-9 draft

- **Date:** run 2026-09-22 into 2026-09-23.
- **Command:** the same as `REVIEW-052b`, run from a fresh git repository under `$TMPDIR` holding only the draft, `docs/UPSTREAM-FILING-PROTOCOL.md` and `.claude/commands/issue-review.md`. A network check and an instruction not to read outside that directory came first.
- **Preconditions:** the GitHub check printed 200 and there were no DNS failures. The transcript mentions this project's paths once, in the instruction itself. The leg cloned its own copies of mpt-crypto, rippled, clio and `trailofbits/publications`.

⚠ **Transcribed, not copied.** The session's scratchpad was cleared between 2026-09-23 and 2026-09-28. That took this leg's output file, its prompt, and the exact draft it reviewed. The report below is the text as it appeared in the session, reproduced without edits. The draft it reviewed is the version after `REVIEW-052c`'s "first attempt" fixes and before the round-one fixes. No byte-exact copy of that draft survives.

## An attempt that does not count

An earlier leg on 2026-09-22 ran from a repository inside the scratchpad. It read the parent directory, which held the author's preparation packet, the `REVIEW-051` transcript and the author's Conan run outputs. It also had no network, because a non-trusted directory defaults Codex to a read-only sandbox. **It is not a rule-1 review.** Its four usable findings were fixed before round one ran: build requirements unchecked, the footer's corpus unnamed, *"the old remote"*, and a stale rippled SHA. Its output is not reproduced.

## Round one's final report

1. Claims that did not survive verification
The core defect survived: both graph runs and the revision queries reproduce the failure, and running rippled/conan/init.sh with its global.conf, profiles, and Conan Center still fails on the pinned OpenSSL revision. The footer claim that the Sherlock/Attackathon findings are not public is too broad: the public search includes contest-derived XRPLF findings such as rippled#7026 and many Attackathon issues/PRs. The statement "So CI passes" is inferred from configuration and dependency resolution, not demonstrated by running CI.

2. Claims that need a search that has not been run
The Conan-remote negative claim has now been searched, including the 104-result Sherlock/Attackathon union, review comments on matching PRs, and the 16 attackathon-branch PRs. No review comment mentions a Conan remote; rippled#6861 does mention a Conan lockfile, so the wording must stay this narrow. The draft's recorded gh block is not reproducible as written: gh has no "all" value for --state and the displayed line omits the actual search terms/options.

3. Layer corrections
Demonstrated: the two graph results, curl revision responses, the full init.sh result, the recipe inventory, the successful lock regeneration against the new remote, and the cited source lines. Inferred: the existing CI configuration can resolve the pinned graph because it uses conan.ripplex.io; this is not proof that the workflow passes. Proposed: align the repository and Linux CI with the documented remote and regenerate the lockfile; pin OpenSSL 3.6.3 only if matching rippled is required.

4. The edited version
(Omitted here. It was rejected in `REVIEW-052c`, because it moved the reproducer into prose and dropped the permalinks.)

5. Word count before and after
316 before, 298 after, counting prose while excluding fenced code, the details block, and the disclosure footer. `make check-filing FILE=draft.md` was attempted but no such target exists here, so the count was manual. The draft is not ready to file until these findings are resolved.

Full review comments: the five findings, reproduced verbatim in `REVIEW-052-packets/round-two-input-round-one-findings.md`.
