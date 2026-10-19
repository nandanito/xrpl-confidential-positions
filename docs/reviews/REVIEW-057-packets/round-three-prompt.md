# REVIEW-057 round three — the redesigned guard, the rebuilt inventory, and step 7

This is the third and last round on the phase 1 publication plan. Round two found
12 defects, four HIGH, and the response was not a set of patches: the push guard was
redesigned and the third-party inventory rebuilt. **Neither has been reviewed by
anyone.** Your job is to break them, to find a round-two fix that does not discharge
its finding, and to find anything in the plan that would still leak, publish a false
statement, or fail on publication day.

This repository's gates have false-passed many times, including twice in this
rotation: the guard's first self-test reported every mutant caught while 17 cases
already failed, and the first inventory check passed a `NOTICE` of bare names with a
licence file deleted. Treat every PASS you are shown as a claim to falsify.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org`. Print
   both codes. Run `gh auth status 2>&1 | head -3`. If network fails, print
   `NO NETWORK` and continue without it.
2. Run `pwd` and `git log --oneline -1`. The working copy is a clone at commit
   `a36f165`. Work only inside this clone.
3. **Do not read** any directory outside this clone, and in particular: any path
   under `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, any `scratchpad`
   directory, and the repository this clone was made from. `~/.wconf` and
   `/tmp/wconf` hold real (Devnet, no-value) secrets. **Never print, cat or copy
   them.** Do not run `make check-no-secrets` without `--no-local-store`, and do
   not run `cargo`, `make check-zeroize-bounds` or `tools/rebuild-env.sh`.
   **One exception**: `~/.cargo/registry/src` may be read, and only read, because
   the inventory compares the signer's locked crates from there.
4. You may write scratch files under `$TMPDIR`. Do not commit anything. **Never
   run `git push` to a network URL, including `--dry-run`**: test the guard
   against local bare repositories only. Do not create, rename or edit anything on
   GitHub. Read-only `gh` calls only.
5. ⚠ **Your transcript is committed to this repository after redaction.** Three
   sources must never appear in it as text:
   - **The private repository's issue bodies and comments.** You may query
     `nandanito/xrpl-confidential-positions` only through `--json … --jq` that
     prints numbers, states, dates, counts, titles and `U-nn` ids. Never print a
     body or a comment, or any sentence from one.
   - **Withheld rows.** `docs/upstream-observed-WITHHELD.md` is gitignored and not
     in your clone. Do not try to obtain it, and do not run `git log -p`,
     `git show`, `git blame` or `git diff` on `UPSTREAM-FEEDBACK.md` at any commit
     other than `a36f165`.
   - **Third-party source, printed whole.** Round two's transcript printed 150
     lines of `@noble/curves` to plant a probe, and that put a new project into
     this repository's licence notice. **Generate probe material without printing
     it**: write it to a file and print only its length and a hash, or print at
     most two lines of it.

## What to read, whole

- Round two: `docs/reviews/REVIEW-057-packets/round-two-output.md` and
  `docs/reviews/REVIEW-057d-adjudication-round-two-2026-10-18.md`.
- The changes since round two's subject: `git diff 776ca25 a36f165`, and the
  changed files whole.
- The guard: `tools/git-hooks/pre-push`, `tools/install-push-guard.sh`,
  `tools/check-push-guard.sh` (`make check-push-guard`).
- The inventory: `tools/inventory-third-party.ts`, `docs/third-party/INVENTORY.md`,
  `NOTICE`, `LICENSES/` (`make inventory-third-party`).
- The plan: `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md`,
  D3, D7, D8 and *Item 5, the publication steps*, steps 5 to 10.
- The register: `CLAIMS.md` rows `E-324` and `E-325`.

## The four seams. Answer every one, each with an explicit verdict

For each seam list findings as `R3-n | HIGH/MEDIUM/LOW | claim | evidence you ran or
read, with paths and line numbers | the smallest fix`. **If a seam has no finding,
write `Seam N: no findings` and say what you tried.** Grade HIGH only for something
that would leak private material, publish a false statement of fact, or make the
publication fail.

### Seam 1 — did each round-two fix discharge its finding?

R2-1 to R2-12, one at a time, against round two's wording and `REVIEW-057d`'s fix.
**Judge against the class, not the example.** Write `discharged`, `not discharged`
or `discharged in part`, with the reason.

### Seam 2 — the push guard, redesigned

The property is now: a private clone pushes only to the archive, identified by its
repository id on github.com, whatever the push holds. Try to make the hook allow a
push to anywhere else, or refuse a push to the archive, using local bare
repositories and the fake `gh` pattern the self-test uses. Consider at least: URL
forms git accepts; what actually connects, as against what the URL says
(`insteadOf`, `pushurl`, SSH configuration, `GIT_SSH_COMMAND`, `core.sshCommand`,
transport helpers); `gh` configuration and environment beyond `GH_HOST`; the
installer's choices of remote and hooks directory, worktrees, `core.hooksPath`; and
every exit path. **Then attack `tools/check-push-guard.sh`**: write a broken hook
it passes, if you can.

### Seam 3 — the inventory, rebuilt

Run it (`bun run tools/inventory-third-party.ts --check`, network needed). Then find
third-party material it still misses, and wrong attributions it still makes. Think
about what the new rules exclude — numeric-dense windows, manifests, licence text,
the `DERIVED_FROM` rule — and whether each exclusion can hide a real quotation.
**Attack the `NOTICE` manifest check**: can a `NOTICE` that fails its obligations
pass it? Check every statement in `NOTICE` against the inventory and the tree.

### Seam 4 — steps 5 to 10, and what publication day depends on

Walk steps 5 to 10 as the person executing them. Does anything the plan relies on
go unchecked on the exact commit that is pushed? In particular: is the inventory
re-run on the export, and is the README sentence's placeholder filled before the
gate? Is step 7 executable with the local store as written, and is D7's issue
procedure executable as written? Report what you rehearsed and what you did not.

## The report

End with: a table of every finding; one line per seam saying whether it survives;
and **the single change you would make before step 3 runs**.
