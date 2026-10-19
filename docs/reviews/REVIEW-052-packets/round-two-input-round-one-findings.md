# Round 1 findings on the F-9 draft (an earlier independent Codex review), verbatim

- [P1] Bring the body under the filing word limit — draft.md:49-51
  The issue body is 316 prose words under the protocol's counting rule (manual count because this checkout has no `check-filing` target), so it exceeds the hard limit and cannot pass the filing gate. Cut the research narration and duplicate evidence before filing; `PROTOCOL.md:60-74` makes this a gate requirement.

- [P1] Record executable searches for the negative claims — draft.md:57-60
  The details block is not a runnable search record: `gh search issues` does not accept "all" as a `--state` value, and the displayed line omits the actual terms/options used. The rerun found 104 unique Sherlock/Attackathon issues and PRs; review comments contain a Conan lockfile mention in rippled#6861, although none mentions a Conan remote. Replace this block with the exact commands and narrow result, as required by `REVIEW-INSTRUCTIONS.md:73-83` and `PROTOCOL.md:97-100`.

- [P2] Qualify the claim that contest findings are not public — draft.md:67
  The disclosure says the Sherlock/Attackathon findings are not public, but the public corpus contains contest-derived findings, including rippled#7026 ("Pre-contest finding") and the Attackathon XLS-0096 issues. The original contest reports may not be public, but this sentence is broader than the evidence; remove it or say only that the original reports were not located. This is a negative claim under `REVIEW-INSTRUCTIONS.md:73-77`.

- [P2] Do not state that CI passes without running it — draft.md:47
  The graph test demonstrates dependency resolution, and the workflow/image sources show which remote CI configures, but neither runs the workflow or a build. "So CI passes" therefore presents an inference as demonstrated; say that CI uses the old remote and can resolve this graph, or provide an actual CI result, consistent with the demonstrated/inferred distinction in `REVIEW-INSTRUCTIONS.md:85-92`.

- [P2] Keep the remediation to one clear ask — draft.md:49-51
  The draft asks maintainers to move to `conan.xrplf.org` but then offers keeping `conan.ripplex.io` and changing the README as an alternative. Those are incompatible remediation paths and weaken the one concrete ask; choose the documented-remote alignment path and describe the Linux image update as part of it, per `PROTOCOL.md:60-74`.

Round 1 also reported, from its own runs: running rippled's `conan/init.sh` in full still fails on the pinned OpenSSL revision; and `conan lock create` against `conan.xrplf.org` succeeds and selects `openssl/3.6.4`.

# How the author ruled on them

1. REJECTED. The repository's gate (`make check-filing`, which PROTOCOL.md rule 2 says is authoritative) counts the prose at 207 words; the round-1 count was manual. Re-check this yourself: count prose excluding fenced code, block quotes, the `<details>` block and the disclosure footer.
2. UPHELD — the block now lists exact commands.
3. UPHELD — the footer now says the full findings report was not found.
4. UPHELD — replaced by a link to the CI run at `3baaaac`.
5. UPHELD — the README alternative is removed.

The author also ran `init.sh` and `conan lock create` themselves, and the draft now reports those runs as the author's own.
