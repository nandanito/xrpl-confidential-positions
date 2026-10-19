STEP 0. Two preconditions; if either fails, STOP and report only which one failed.
(a) Network. Run `curl -s -o /dev/null -w '%{http_code}\n' https://api.github.com` and print the code. If it does not resolve, report NO NETWORK and stop.
(b) Isolation. Read nothing outside this working directory and any fresh temp directory you create yourself. Do NOT list, read or grep the parent directory, `/private/tmp/claude-501/`, any other directory under `$TMPDIR` (in particular `f12b.*`, which holds the author's builds), or any `xrpl-confidential-positions` checkout. Rule 1 requires that you do not see the author's work or conclusions.

You are the independent reviewer that rule 1 of PROTOCOL.md requires. You did not write `draft.md`. It is a proposed GitHub issue for XRPLF/mpt-crypto, reporting a build failure, and it has NOT been filed. Follow REVIEW-INSTRUCTIONS.md (the `/issue-review` procedure), with PROTOCOL.md as the higher authority. Its "did you write this draft?" section does not apply to you.

Constraints:
- Read-only against GitHub and every remote.
- zsh: use `printf '%s\n'` rather than `echo` for text with backslashes.
- Open anything you cite.
- `make check-filing` does not exist here. Count prose words yourself, excluding fenced code, block quotes, the `<details>` block and the disclosure footer.

Verify every claim against primary sources at the refs the draft names AND at current mpt-crypto `main`. Run every command in the `<details>` block exactly as written. Fetch the Trail of Bits report from https://github.com/trailofbits/publications (`reviews/`). Check the footer sentence by sentence. Check whether upstream has already fixed or reported this, including in open PRs.

Specific attack points:
1. **Re-run it.** Clone mpt-crypto at `3baaaac33dadec3e649846e487f452c5b6b2d825` and emsdk (https://github.com/emscripten-core/emsdk) into your own temp dir.
   - Use ONE emsdk clone per version, because one clone overwrites earlier installs.
   - Run `./.github/scripts/build-wasm.sh` in a fresh source tree per run, logging to a file. Never pipe a running build through `tail`/`grep`.
   - At minimum: 6.0.2 as shipped (the control), 6.0.6 as shipped, and 6.0.6 with `em++` replacing `emcc` on lines 363, 365 and 374.
   - If time allows: the newest emsdk tag, as shipped and with `em++`.
   - Say which table cells you did NOT re-run.
2. **The ChangeLog quotation:** is it verbatim at emscripten's `6.0.6` tag, lines 23-25? Does that tag match the version `emcc --version` prints?
3. **The causal story.** Does the failure really come from `DEFAULT_TO_CXX` becoming opt-in? Is `em++` the better fix than `-sDEFAULT_TO_CXX`, and is the ask one concrete ask?
4. **"CI did not catch it because it pins emsdk 6.0.2":** is 6.0.2 the pin, and did the linked run's WASM job pass at `3baaaac`?
5. **Overstatement.** The author ran only macOS arm64. Does any sentence claim more than that supports?
6. **Verbosity.** Specific cuts, each with the old text, the new text and what is lost. Never cut load-bearing evidence.

Report the five sections REVIEW-INSTRUCTIONS.md asks for, plus a verdict per point. If any claim fails verification, say plainly that the draft is not ready to file.
