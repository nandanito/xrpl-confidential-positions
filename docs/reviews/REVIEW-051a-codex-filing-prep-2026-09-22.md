# REVIEW-051a — Codex leg on the filing preparation, verbatim

- **Date:** 2026-09-22
- **Command:** `codex exec review -m gpt-5.6-luna -c model_reasoning_effort=high -c sandbox_workspace_write.network_access=true --skip-git-repo-check "<packet>" < /dev/null`, run from the repository at `13e16ae`, with network.
- **Packet:** `REVIEW-051-packets/packet-a-filing-prep.md`.
- **Tree:** `git status --porcelain` empty before and after. Exit 0, with a final report. The transcript on stderr (442 KB) is not committed.

The final report follows, unedited.

---

Item 3 is NOT FALSIFIED: `pdftotext -layout` confirms Appendix B pp. 55–56 says NULL context IDs are silently omitted and should probably not be optional, so F-17 should credit or narrow that caller-error material. Item 5 is NOT FALSIFIED: mpt-crypto remains `3baaaac`, rippled remains `8b1a228` with the 66-byte checks unchanged, and the XLS-0096 file blob is unchanged; F-12 remains properly limited to tested emsdk 6.0.2 versus 6.0.6, with emsdk 6.0.10 untested.

Full review comments:

- [P1] Qualify the Conan migration and update all old URLs — $REPO/CLAIMS.md:430-430
  Item 1 is NARROWED, while item 2 is NOT FALSIFIED: the Conan rerun reproduced exit 1 against `https://conan.xrplf.org/repository/conan/` with `openssl/3.6.2 not resolved` and exit 0 against `https://conan.ripplex.io`, and the new remote currently serves `openssl/3.6.3` revisions `f806de89` and `1163d4d`; however, `/v1/ping` and package-revision queries show the old remote is still live, `gh api search/code -f q='conan.ripplex.io org:XRPLF'` returns five current hits including `mpt-crypto` and `xrpl-py`, and no XRPLF deprecation notice was found. The draft should describe this as migration to the remote now used by rippled/clio, not retirement of the old remote, and should update mpt-crypto's other active references at `.github/scripts/build-native-libs.sh:16` and `.github/workflows/build.yml:71`, not only `regenerate.sh:17`.

- [P2] Include pull-request review comments in the Attackathon sweep — $REPO/CLAIMS.md:389-389
  Item 4 is FALSIFIED: `gh search issues Attackathon --owner XRPLF --include-prs --limit 100` returned 88 and `Sherlock` returned 18 without hitting the limit, but fetching PR review comments exposed `rippled#6861` discussion `r3067155197` on `conan.lock`: “Both `rc1` and `rc2` are present in the lock file — rc1 should be removed. Regenerate with `conan lock create` rather than hand-editing.” The reported bodies-plus-issue-comments sweep therefore missed a Conan/lockfile hit; amend the corpus result and state explicitly that review comments were also searched. A broader sweep found no additional Emscripten, shared-C1, or Remark 6.1 hit.
