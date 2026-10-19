STEP 0. Two preconditions; if either fails, STOP and report only which one failed.
(a) Network. Run `curl -s -o /dev/null -w '%{http_code}\n' https://api.github.com` and print the code. If it does not resolve, report NO NETWORK and stop.
(b) Isolation. Read nothing outside this working directory and any fresh temp directory you create yourself. Do NOT list, read or grep the parent directory, `/private/tmp/claude-501/`, any other directory under `$TMPDIR`, or any `xrpl-confidential-positions` checkout. They hold the draft author's work and conclusions, and rule 1 requires that you do not see them.

You are the independent reviewer that rule 1 of PROTOCOL.md requires. You did not write `draft.md`. It is a proposed GitHub issue for XRPLF/mpt-crypto, reporting an error in a paper, and it has NOT been filed. Follow REVIEW-INSTRUCTIONS.md (the `/issue-review` procedure), with PROTOCOL.md as the higher authority. Its "did you write this draft?" section does not apply to you.

Constraints:
- Read-only against GitHub and every remote: do not create, comment on, react to, edit or close anything.
- Do not submit anything to any network.
- zsh: write `"${r}:path"`, not `$r:path`, and use `printf '%s\n'` rather than `echo` for TeX, because zsh's echo interprets backslashes.
- A search hit is not a reading: open anything you cite.
- `make check-filing` does not exist here. Count prose words yourself, excluding fenced code, block quotes, the `<details>` block and the disclosure footer.

Verify every claim against primary sources yourself, at the refs the draft names AND at current HEAD: mpt-crypto `main` and rippled `develop`. Run every command in the `<details>` block exactly as written and compare the results. For the Trail of Bits report, fetch the PDF from https://github.com/trailofbits/publications (`reviews/`). Check the footer sentence by sentence. Check whether upstream has already fixed or reported this.

Specific attack points:
1. **Re-derive the component table yourself** from `paper/cmpt-compact-sigma.tex` at `3baaaac` and from rippled `develop` (`src/libxrpl/tx/transactors/token/ConfidentialMPTSend.cpp`, `include/xrpl/protocol/Protocol.h`), with mpt-crypto's `include/mpt_protocol.h`.
   - Do the paper's components sum to 1177 and 1144?
   - Do the wire components sum to 1276 and 1210?
   - Is the difference exactly (n-1) x 33?
   - At n = 3, which participants are present?
2. **Is the paper's table counting the same thing as the wire sum?** That is the encrypted fields, the commitments and the proof, not the whole signed transaction.
3. **"The extra copies carry no information."** Read the `mpt_utility.cpp` check at `3baaaac`, and at `1.0.2`, the version rippled's `conanfile.py` requires. Is it on the path rippled uses to verify a Send? Does that matter for the claim?
4. **Could the paper describe a DIFFERENT, intended layout?** Search the paper, the repository and XLS-0096 (https://github.com/XRPLF/XRPL-Standards, `XLS-0096-confidential-mpt/README.md`) for any sign that a shared C1 is a planned wire change. Is the ask ("correct it, or say it is a proposal") right, and is it one ask?
5. **The measurement.** The Devnet sizes are dated 2026-08-17 at rippled 3.3.0 and were not re-measured. Is the draft honest about that, and is it enough?
6. **Every permalink and line number:** does each resolve, and does it say what the draft claims?
7. **The audit section.** There is a third review the draft does not name: search `Zellic` across `--owner XRPLF` and read what you find. Should the draft mention it?
8. **Verbosity.** Propose specific cuts, each with the old text, the new text and what is lost. Never cut load-bearing evidence.

Report the five sections REVIEW-INSTRUCTIONS.md asks for, plus a verdict for each point above. If any claim fails verification, say plainly that the draft is not ready to file.
