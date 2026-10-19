# REVIEW-057 round two — the fixes to the publication plan, the push guard, and step 1

Round one reviewed the phase 1 publication plan at `adee1f0` and found 11 things
wrong, four of them HIGH. Every finding was upheld and fixed. **Nobody has seen the
fixes.** Two new artifacts were also built after round one froze its subject, and
nobody has reviewed them as code: the push guard, and the third-party inventory
with the `NOTICE` written from it. Your job is to find a fix that does not
discharge its finding, a defect the fixes introduced, and any way the guard or the
inventory reports success while the thing it checks is broken.

This repository's history says why that last part matters: gates built here to
catch false passes have false-passed many times, and the most recent instance was
in this round's own subject. The push guard's first self-test reported every
mutant caught while 17 of its cases were already failing.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org`. Print
   both codes. Run `gh auth status 2>&1 | head -3`. If network fails, print
   `NO NETWORK` and continue without it.
2. Run `pwd` and `git log --oneline -1`. The working copy is a clone at commit
   `776ca25`. Work only inside this clone.
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
5. ⚠ **Your transcript is committed to this repository after redaction.** Two
   sources must never appear in it as text:
   - **The private repository's issue bodies and comments.** You may query
     `nandanito/xrpl-confidential-positions` with `gh issue list` / `gh issue view`
     **only through `--json … --jq` that prints numbers, states, dates, counts,
     titles and `U-nn` ids**. Never print a body or a comment, or any sentence
     from one.
   - **Withheld rows.** `docs/upstream-observed-WITHHELD.md` is gitignored and not
     in your clone. Do not try to obtain it. Your clone's history still holds those
     rows: do not run `git log -p`, `git show`, `git blame` or `git diff` on
     `UPSTREAM-FEEDBACK.md` at any commit other than `776ca25`.

## What to read, whole

- Round one: `docs/reviews/REVIEW-057-packets/round-one-output.md` (the findings)
  and `docs/reviews/REVIEW-057c-adjudication-publication-plan-2026-10-18.md`
  (the ruling and each fix).
- The plan as fixed: `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md`,
  especially D3, D4, D7, D8 and *Item 5, the publication steps*.
- The fixes: `git diff adee1f0 776ca25`. Read the changed files whole too.
- The guard: `tools/git-hooks/pre-push`, `tools/install-push-guard.sh`,
  `tools/check-push-guard.sh` (`make check-push-guard`).
- The inventory: `tools/inventory-third-party.ts`, `docs/third-party/INVENTORY.md`,
  `NOTICE`, `LICENSES/`, `make inventory-third-party`.
- The register: `CLAIMS.md` rows `E-322`, `E-323` and `E-324`.

## The five seams. Answer every one, each with an explicit verdict

For each seam list findings as `R2-n | HIGH/MEDIUM/LOW | claim | evidence you ran
or read, with paths and line numbers | the smallest fix`. **If a seam has no
finding, write `Seam N: no findings` and say what you tried.** Grade HIGH only for
something that would leak private material, publish a false statement of fact, or
make the publication fail.

### Seam 1 — did each round-one fix discharge its finding?

Take R1-1 to R1-11 one at a time, with round one's own wording and REVIEW-057c's
fix. **Judge the fix against the CLASS the finding names, not the example it
used** — this repository has shipped fixes that covered the example only. For each,
write `R1-n: discharged`, `not discharged` or `discharged in part`, with the reason.

### Seam 2 — the push guard, as code

Attack `tools/git-hooks/pre-push` and its installer. The property: a push carrying
the private history goes only to the archive, identified by GitHub repository id.
Build scratch repositories and local bare remotes, and try to make it allow what it
should refuse, or refuse what it should allow. Consider at least: the URL parser
(every form git accepts for GitHub, case, ports, userinfo, `.git`, slashes, local
paths, `file://`, `ext::`, transport helpers); what `gh` resolves and from which
host (`GH_HOST`, `GH_TOKEN`, enterprise configuration); the roots recorded at
install time versus roots that appear later; tags, notes, `--mirror`, `--all`,
deletions, non-commit objects, shallow clones; every exit path, and whether any
fails open. **Then attack `tools/check-push-guard.sh` as a gate**: can it pass
while the hook is broken? Run its mutants; write one it does not catch.

### Seam 3 — the inventory and the `NOTICE`

The `NOTICE` claims to list every third-party project the tracked tree reproduces.
Find reproduced third-party material the inventory misses. Think about what its
matching cannot see: line-number prefixes from `cat -n`, `nl` or `grep -n`; code
reflowed by a formatter; quoted lines joined into one; corpora versions other than
the ones compared; projects that are not corpora. **Run it** (`bun run
tools/inventory-third-party.ts`, network needed) and probe it with planted
quotations in a scratch copy. Then check that every statement in `NOTICE` is true,
that each file in `LICENSES/` is a verbatim copy of the licence it names, and that
the licences' own conditions are met by how this repository reproduces the
material.

### Seam 4 — the revised steps, executed

Rehearse steps 5 to 7 as written, on an export of `776ca25`: the first commit with
the archive copy and the README sentence, the second with the regenerated log, then
the gate without `--rev` and `make ci`. Report the commit count, what the gate
scanned and the results. Then walk steps 8 to 10: is anything still contradictory,
unexecutable, or irreversible before it has been checked? Is D7's issue procedure
executable as written, and does it publish exactly what was swept?

### Seam 5 — the record

Are E-322's correction, E-323 and E-324 true against the tree? Does any sentence
this round's fixes added to the README, the decision request, `NOTICE` or elsewhere
state something false or unsupported? Search the tree for copies of any sentence
you find false.

## The report

End with: a table of every finding; one line per seam saying whether it survives;
and **the single change you would make before step 3 runs**.
