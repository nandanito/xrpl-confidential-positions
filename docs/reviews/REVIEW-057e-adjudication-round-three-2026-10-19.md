# REVIEW-057e — adjudication of round three, and the rotation closes

**Subject:** the redesigned push guard, the rebuilt third-party inventory and the
publication steps at `a36f165`. Neither the guard's redesign nor the inventory's
rebuild had been reviewed.

**Leg:** one Codex leg, `gpt-6.1-sol` at `xhigh`, from a fresh clone at `a36f165`
under `$TMPDIR`, with no remote, `workspace-write` and network on, as plan-review
round 3 of 3 under the owner's hook (`publication-egress-plan-r3`), the last it
allows. Its SSH probes used a shim that ran a local `git-receive-pack`; no push
reached GitHub. Prompt, report, transcript and the self notes written before launch
are in `REVIEW-057-packets/round-three-*`.

**Before the transcript was committed** it was checked against every private issue
body and comment and every withheld row: nothing from any of them appears in it that
is not also in the tracked tree at `a36f165`. It was scrubbed, and the leg's clone,
which held the private history, was deleted. The round's new rule held: the leg
printed no third-party source whole.

**Outcome: 14 findings, 7 HIGH, 6 MEDIUM, 1 LOW. All 14 upheld.** The leg ruled six
of round two's twelve fixes discharged and six discharged only in part.

## The findings

| id | grade | verdict | fix |
|---|---|---|---|
| R3-1 | HIGH | **Upheld.** A remote named `--parse-url` reached the hook's parse-only mode, which exited before the check | The mode is gone. The installer extracts the hook's functions by name. Case R21 and a mutant restoring the mode |
| R3-2 | HIGH | **Upheld, and re-measured**: `http_unix_socket` is a documented `gh` setting | The hook refuses when `gh` is routed through a socket. Case R25 and a mutant |
| R3-3 | HIGH | **Upheld.** `core.sshCommand` and `GIT_SSH_COMMAND` sent an SSH push for the archive to another receiver | **HTTPS to github.com only**, and the hook refuses when TLS verification is off or a CA has been added in the environment or git's configuration. Cases R2, R3, R22 to R24; mutants for each |
| R3-4 | HIGH | **Upheld, and re-measured**: from a subdirectory git reports the hooks path relative to the caller | `--path-format=absolute`; an installer case from a subdirectory |
| R3-5 | HIGH | **Upheld.** A stale `pushurl` let the reinstall in step 8 replace the recorded archive | The installer checks every push URL, never replaces a recorded id, and step 8 unsets `pushurl` first. Installer cases |
| R3-6 | MEDIUM | **Upheld.** A tags allowance passed every case | Tag and blob cases, end-to-end and direct, and the mutant. ⚠ **It first survived even then**: the harness fed stdin without the final newline git sends, so a mutant reading stdin never saw its line. Fixed in the harness |
| R3-7 | HIGH | **Upheld, and re-measured**: the F-12 log quotes Emscripten 6.0.5's changelog | `.log` files are read, Emscripten's changelogs at 6.0.5 and 6.0.12 are a corpus, and `NOTICE` and `LICENSES/` carry it |
| R3-8 | MEDIUM | **Upheld in part.** Numeric-dense windows, `.log` files and source beside licence text were hidden | All three fixed: a window needs eight distinct tokens, and only SHA-2's constants, computed from their definition, are facts. **Not upheld for manifests**: reflowed `package.json` files stay excluded, as dependency metadata every package shares, and the inventory says so |
| R3-9 | MEDIUM | **Upheld.** The clio rule reported rippled for a quotation of clio's own file | The rule is removed; a line both hold names both, and `NOTICE` carries clio |
| R3-10 | MEDIUM | **Upheld.** A symlink to `node_modules` passed while publishing nothing | `LICENSES/` files are read from git's index and must be mode `100644`. The symlink attack, reproduced, now fails |
| R3-11 | MEDIUM | **Upheld.** No publication gate re-ran the inventory | Step 5 regenerates it in the export before the first commit; step 7 re-runs it and requires no diff |
| R3-12 | MEDIUM | **Upheld.** `DATE` passed both gates | Step 5 fills it; step 7 rejects it |
| R3-13 | HIGH | **Upheld.** A secret in a JSON escape passed a sweep of the serialised manifest | D7 writes decoded fields as plain files and sweeps them with `--rev HEAD`, which was tried and passes; issues are created from those files and read back |
| R3-14 | LOW | **Upheld.** The prompt's headline overstated review coverage; E-323's *"Not done"* lacked its observation point | Both corrected |

## The recommendation, and why it goes to the owner

The leg's single change was D8's option B, credential isolation, because a hook
cannot hold against a push someone means to make. **That is true, and the guard's
own output now says so.** Every failure it demonstrated needed a mistake the guard
now refuses, or configuration set to route a push elsewhere. Whether that second
class is worth protecting against at B's cost is a judgement about how the owner
works, so D8 is reopened in the decision request with three options and a
recommendation, not settled here.

## Against the self notes written before the leg ran

- **U1 = R3-11, U3 ≈ R3-8, U4 = R3-3, U5 = R3-12**, found by both.
- **U2**, that the `NOTICE` check found an entry by the first mention of a name, was
  not raised by the leg. It was real, because the new clio entry mentions rippled,
  and it is fixed: an entry must start with the name.
- **Found by the leg alone:** R3-1, R3-2, R3-4, R3-5, R3-6, R3-7, R3-9, R3-10, R3-13
  and R3-14. As in both earlier rounds, the self notes caught none of this session's
  false sentences, and this round the leg found more defects in the session's code
  than in its prose.

## The rotation closes

This was the third round and the owner's hook allows no fourth. **Round three's
fixes are reviewed by their tests and by nobody else**: 31 guard cases and 16
mutants, and the inventory's check refusing each attack round three made on it.
