/**
 * build-claims-revisions.ts — the revision log of `CLAIMS.md`, DERIVED FROM GIT.
 *
 * `CLAIMS.md`'s own `Revision history` table stopped being given content on
 * 2026-08-25 at `f9e9eb9` and the register did not stop growing. The gap was
 * recorded rather than filled, for a reason worth keeping: **a reconstruction
 * written now would be one session's reading of other sessions' work**, which is
 * exactly the substitution `CLAUDE.md` forbids.
 *
 * ⚠ **So this tool does NOT reconstruct the narrative, and it never will.** The
 * curated table in `CLAIMS.md` answers *what that revision established* — a
 * judgement no tool can derive. This answers the half git already knows: **when
 * each row entered the register, and under which commit**. Two layers, two
 * sources of truth, neither pretending to be the other.
 *
 *   bun run tools/build-claims-revisions.ts          # write docs/CLAIMS-REVISIONS.md
 *   bun run tools/build-claims-revisions.ts --check  # fail if stale (the gate)
 *
 * ⚠ **DERIVED, NEVER RESTATED — `CLAIMS.md` E-199, E-203, E-236, E-249.** The
 * paragraph this replaces said *"62 commits touching it in between"*. Measured
 * on 2026-09-11 the span `f9e9eb9..HEAD` is **73**. The number was true when
 * written and is not a number anybody re-derived, which is this project's most
 * repeated failure and the whole argument for generating the thing.
 *
 * ## How a row is attributed
 *
 * For every commit that touched `CLAIMS.md`, the **whole file at that commit**
 * is read and its id set extracted — not the diff. A row belongs to the first
 * commit whose snapshot contains it.
 *
 * ⚠ **Snapshots rather than diffs, deliberately.** A `--unified=0` diff has to
 * be parsed, and a row id can appear on a `+` line because a neighbouring cell
 * was reflowed, because a row was moved, or because the id was merely mentioned
 * inside another row's prose. A set difference between two snapshots has none of
 * those failure modes: it answers *was this id in the file before, and is it in
 * the file now*, which is the actual question.
 *
 * ## What it also catches, and this register has no other check for it
 *
 * `CLAIMS.md` is append-only by convention and by nothing else. Comparing each
 * commit against **its own first parent** gets removal detection for free: an id
 * in the parent and not in the child is reported and **fails the gate**. A
 * retraction here is a row rewritten in place with `~~strikethrough~~`, never a
 * row deleted, so a disappearance is a mistake or a change of practice and both
 * want a human to look.
 *
 * ⚠⚠ **THE FIRST VERSION COMPARED EACH COMMIT TO THE PREVIOUS LOG ENTRY AND
 * REPORTED SIX REMOVALS THAT DID NOT HAPPEN.** Consecutive entries of
 * `git log -- <path>` are not parent and child: this history is non-linear, so the
 * walk crossed from one merged branch to another and every row the branch it left
 * behind held read as deleted. `E-218` was absent from `c9fa946`
 * **and from its parent**, which is what exposed it. ⚠ **A phantom defect in the
 * register, manufactured by the log tool's own traversal** — `build-claims-index`
 * records the same shape from a regex (E-141), and the instrument that caught
 * both was the same one: check the finding against the source before believing
 * the tool that produced it.
 */
import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const REPO = new URL("..", import.meta.url).pathname;
const SRC = "CLAIMS.md";
const OUT = join(REPO, "docs/CLAIMS-REVISIONS.md");

/**
 * A row id: `E-1`, `F-24`, `B-15`, `P-12`, `U-54`, `R-6` and the suffixed `E-3a`.
 *
 * ⚠ **Lifted from `build-claims-index.ts`'s shape on purpose.** That regex cost
 * two recorded defects to get right — an omitted `R-` that silently dropped the
 * whole Retracted section, and a truncated `E-3a` that manufactured a phantom
 * duplicate. Re-deriving it here from memory would be how a third one happens.
 *
 * ⚠ **The leading pipe's trailing space is OPTIONAL in GFM** — `|E-9999| … |` is
 * a valid row, and requiring the space made such a row invisible to two
 * generators at once with every gate green (REVIEW-040 H2).
 */
const ROW = /^ {0,3}\|\s*(?:\*\*)?([A-Z]+-\d+[a-z]?)(?:\*\*)?\s*\|/;

/**
 * Every git call this tool makes, with the ambient configuration that would
 * break it neutralised **here** rather than at each call site.
 *
 * ⚠⚠ **Two valid user settings crashed this tool, and both were measured.**
 * `log.showSignature=true` makes git prepend *"Good "git" signature for …"* to
 * `git log` output **even under a custom `--format`**, so the parse loop read
 * those lines as commits with undefined fields and `render()` threw on
 * `cell(r.subject)`; `fullCount` was inflated by the same lines. And
 * `merge.verifySignatures=true` aborts both of the synthetic probe's merges,
 * because the probe commits are deliberately unsigned — so generation and
 * `--check` failed before reading any repository data.
 *
 * ⚠ **Fixed at the producer, not at the four `git log` call sites.** A flag
 * added to each is a flag the fifth call site will not have, which is this
 * project's most repeated shape (`CLAIMS.md` E-168). `-c` beats a config file,
 * so this holds whatever the user has set. The synthetic probe turns both
 * settings ON in its own repository, so these overrides have a control that
 * fails if they ever stop working.
 */
// ⚠ **`i18n.logOutputEncoding` transcodes what `git log` prints, and this reads
// the bytes as UTF-8.** With `ISO-8859-1` set — a valid user setting — a subject
// containing `—` or `§` comes back re-encoded, so `--check` calls a correct
// artifact stale and a regeneration rewrites the characters. Measured on
// `b7d81fb`, whose subject carries an em-dash: the two encodings differ by a
// byte. This history already contains such subjects, so it is not hypothetical.
const GIT_SAFE = [
  "-c", "log.showSignature=false",
  "-c", "merge.verifySignatures=false",
  "-c", "i18n.logOutputEncoding=UTF-8",
];

/**
 * Repository-selection variables, removed from every child git.
 *
 * ⚠⚠ **`GIT_DIR` BEATS `cwd`, so passing a directory does NOT isolate the
 * synthetic probe — and this was measured doing real damage.** Run this tool
 * with `GIT_DIR` exported, which is exactly what a git hook or a CI wrapper
 * does, and the probe's `git config` calls land in the CALLER'S repository: a
 * throwaway victim came back carrying `user.email = probe@example.invalid`,
 * `merge.verifySignatures = true`, `log.showSignature = true` and — worst —
 * `core.hooksPath` pointing into a temp directory this tool then deleted, which
 * breaks git in that repository until someone finds the line.
 *
 * ⚠ The probe's `init`, `add`, `commit`, `checkout` and `merge` were all aimed
 * at whatever `GIT_DIR` named. Stripping these is what makes `cwd` mean
 * something.
 */
/**
 * Git environment variables this tool refuses to inherit — an ALLOWLIST, after a
 * denylist missed a member in each of two consecutive review rounds.
 *
 * ⚠⚠ **THE DENYLIST WAS WRONG TWICE, THE SECOND TIME AFTER BEING WRITTEN TO FIX
 * THE FIRST.** Round six found `GIT_DIR` aiming the synthetic probe's `init`,
 * `commit` and `config` at the caller's repository. The fix listed the
 * repository-selection variables — and round seven found `GIT_CONFIG`, which
 * redirects where `git config` **writes**, so the probe's six `config` calls
 * still landed in a caller-chosen file, `core.hooksPath` among them, pointing at
 * a directory this tool then deletes. `GIT_CONFIG_COUNT`/`_KEY_n`/`_VALUE_n`
 * inject settings the same way, and `GIT_TEMPLATE_DIR` is the `init.templateDir`
 * hook vector that round three closed only in its config form — **a third member
 * neither round named.**
 *
 * ⚠ **So the rule is inverted: everything `GIT_*` goes, and the exceptions are
 * listed here.** A denylist has to be re-derived every time git gains a
 * variable; this cannot silently miss one. `GIT_EXEC_PATH` stays because it
 * locates git's OWN helper programs rather than selecting a repository or a
 * configuration, and dropping it breaks relocated installations.
 *
 * ⚠ This tool needs nothing else from the environment: it reads a local
 * repository and drives a throwaway one, with no network, no authentication and
 * no credential helper.
 */
const GIT_ENV_KEEP = new Set(["GIT_EXEC_PATH"]);

/** `process.env` with every inherited `GIT_*` removed except the allowlist. */
export function gitEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith("GIT_") && !GIT_ENV_KEEP.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function git(args: string[], cwd: string = REPO): string {
  return execFileSync("git", [...GIT_SAFE, ...args], { cwd, env: gitEnv(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/**
 * How many ROWS each id opens in one revision of the file.
 *
 * ⚠⚠ **A `Set` hid a whole class of defect, and everything here was built on
 * one.** Two rows opening with the same id collapse into a single member, so the
 * row total under-counts, `duplicateOrigins` sees nothing — the id is present in
 * parent and child alike — and the append-only check passes, because the id it
 * looks for is still there. **The register then represents two rows as one, and
 * every instrument agrees it is fine.** Counting comes first now; the set is
 * derived from the count rather than the other way round.
 */
export function idCounts(text: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of text.split("\n")) {
    const m = line.match(ROW);
    if (m) out.set(m[1], (out.get(m[1]) ?? 0) + 1);
  }
  return out;
}

/** Ids opening more than one row in a single revision. */
export function duplicateIdsIn(text: string): Array<{ id: string; rows: number }> {
  return [...idCounts(text)].filter(([, n]) => n > 1).map(([id, rows]) => ({ id, rows })).sort((a, b) => a.id.localeCompare(b.id));
}

/** Every id-bearing row in one revision of the file. */
export function idsIn(text: string): Set<string> {
  return new Set(idCounts(text).keys());
}

/**
 * A table cell is one line, so anything that can end it early must be escaped.
 *
 * ⚠ **No commit subject in this repository contains a `|` today — measured, 0 of
 * 125 — and that is exactly why this exists.** A generator that is correct only
 * because the data has not yet exercised it is a latent break, and the next
 * commit is allowed to be the one that writes it.
 */
export function cell(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** Contiguous ids collapse: E-1, E-2, E-3, E-7 → `E-1 – E-3`, `E-7`. */
export function ranges(ids: string[]): string {
  const parsed = ids
    .map((id) => {
      const m = id.match(/^([A-Z]+)-(\d+)([a-z]?)$/);
      return m ? { id, pre: m[1], n: Number(m[2]), suf: m[3] } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (a.pre === b.pre ? a.n - b.n || a.suf.localeCompare(b.suf) : a.pre.localeCompare(b.pre)));

  const parts: string[] = [];
  let i = 0;
  while (i < parsed.length) {
    let j = i;
    // Only unsuffixed ids of one prefix collapse; `E-3a` is named in full.
    while (
      j + 1 < parsed.length &&
      parsed[j].suf === "" &&
      parsed[j + 1].suf === "" &&
      parsed[j + 1].pre === parsed[i].pre &&
      parsed[j + 1].n === parsed[j].n + 1
    ) j++;
    parts.push(j - i >= 2 ? `${parsed[i].id} – ${parsed[j].id}` : parsed.slice(i, j + 1).map((p) => p.id).join(", "));
    i = j + 1;
  }
  return parts.join(", ");
}

interface Rev {
  sha: string; date: string; subject: string;
  added: string[]; total: number;
}

/**
 * ⚠ **`--topo-order --reverse`, so every ancestor is walked before its
 * descendants.** That is what makes *first appearance* well defined: a row added
 * on a branch is attributed to the branch commit that wrote it, and the merge
 * that later brings it to `main` introduces nothing new and says so.
 *
 * ⚠ **What `--topo-order` is worth HERE was measured rather than assumed, and it
 * is less than the sentence above implies.** Removing it at this commit changes
 * the position of exactly two adjacent rows — `cd1eda0` and `11415a2` — and
 * changes **no attribution at all**, because this history never introduces a row
 * on one side of an interleaving and reads it from the other. So its loss is
 * caught by the byte comparison, not by the oracle below, and saying otherwise
 * would be claiming a falsifier this tool does not have (`CLAIMS.md` E-179).
 * It stays because the guarantee is about histories, not about this one.
 *
 * ⚠⚠ **THE REMOVAL CHECK USED TO RIDE ON THIS WALK AND THAT WAS A FALSE-PASS
 * SHAPE.** Two defects, both found by review, neither exercised by this history:
 * `git log -- <path>` **simplifies merges away** — a merge TREESAME to its first
 * parent is pruned, and **26 of this repository's 29 merges are pruned right
 * now** — and comparing only `parents[0]` cannot see a row that existed on the
 * *second* parent and did not survive the merge. Together those hide exactly one
 * event: a row introduced on a branch and dropped when the branch was merged.
 *
 * ⚠ **So display and integrity are two walks now, because they want opposite
 * things.** Display wants the simplified history, which is what a reader should
 * see. Integrity wants every commit and every parent, which is what an
 * append-only claim has to be checked against. One pass feeding both is the
 * shape that made this wrong.
 */
function collect(head: string): Rev[] {
  const log = git(["log", "--reverse", "--topo-order", "--format=%H%x00%ad%x00%s", "--date=short", head, "--", SRC])
    .split("\n").filter(Boolean);

  const snapshot = (rev: string): Set<string> => {
    try { return idsIn(git(["show", `${rev}:${SRC}`])); } catch { return new Set(); }
  };

  const revs: Rev[] = [];
  const seen = new Set<string>();
  for (const line of log) {
    const [sha, date, subject] = line.split("\0");
    const now = snapshot(sha);

    // Attribution: the first commit in topological order to carry the id.
    const added = [...now].filter((id) => !seen.has(id));
    for (const id of added) seen.add(id);

    revs.push({ sha: sha.slice(0, 7), date, subject, added, total: now.size });
  }
  return revs.reverse();
}

interface Snapshot { ids: Set<string>; dupes: Array<{ id: string; rows: number }> }
/** Callers use it as `(rev) => Set`; `.dupes(rev)` is the same cached read. */
type IdReader = ((rev: string) => Set<string>) & { dupes: (rev: string) => Array<{ id: string; rows: number }> };

/**
 * One parse per distinct BLOB, so 245 commits cost 130 reads here, not 245.
 *
 * ⚠ Duplicates are computed on the same pass rather than by a second scan,
 * because a separate walk is a second thing to keep in step with this one.
 */
function blobCache(cwd: string = REPO): IdReader {
  const byBlob = new Map<string, Snapshot>();
  const byRev = new Map<string, Snapshot>();
  const get = (rev: string): Snapshot => {
    const hit = byRev.get(rev);
    if (hit) return hit;
    let blob = "";
    try { blob = git(["rev-parse", `${rev}:${SRC}`], cwd).trim(); } catch { /* absent at this commit */ }
    let snap: Snapshot;
    if (!blob) snap = { ids: new Set(), dupes: [] };
    else {
      const cached = byBlob.get(blob);
      if (cached) snap = cached;
      else {
        const text = git(["cat-file", "blob", blob], cwd);
        snap = { ids: idsIn(text), dupes: duplicateIdsIn(text) };
        byBlob.set(blob, snap);
      }
    }
    byRev.set(rev, snap);
    return snap;
  };
  const fn = ((rev: string) => get(rev).ids) as IdReader;
  fn.dupes = (rev: string) => get(rev).dupes;
  return fn;
}

/**
 * Any revision whose file opens two rows with one id.
 *
 * ⚠ **Measured before it was enforced: no revision in this history has ever had
 * one**, across 245 commits and 130 distinct blobs. So checking every revision
 * cannot false-fail on a past nobody can edit, and the check is worth having over
 * the whole history rather than only at the tip.
 */
export function duplicateRows(head: string, ids: IdReader, cwd: string = REPO): Array<{ sha: string; dupes: Array<{ id: string; rows: number }> }> {
  const out: Array<{ sha: string; dupes: Array<{ id: string; rows: number }> }> = [];
  for (const sha of git(["rev-list", head], cwd).split("\n").filter(Boolean)) {
    const d = ids.dupes(sha);
    if (d.length > 0) out.push({ sha: sha.slice(0, 7), dupes: d });
  }
  return out;
}

/**
 * Every id that ever left the register, against EVERY parent of EVERY commit.
 *
 * ⚠ **Not path-limited and not simplified, deliberately.** Path limiting is what
 * hid the merges; simplification is what pruned them. This walks
 * `git rev-list --parents <head>` — all 237 reachable commits at the time of
 * writing — and asks one question per parent edge: was an id in the parent and
 * not in the child. That is exact by construction and needs no argument about
 * how git chooses to simplify a history.
 *
 * ⚠ **Measured when it was written: ZERO merges in this repository have ever
 * dropped a row.** The check is therefore unexercised by real history, which is
 * why `probeRemoval` below synthesises the event rather than trusting that.
 */
export function removals(head: string, ids: IdReader, cwd: string = REPO): Array<{ sha: string; parent: string; lost: string[] }> {
  const out: Array<{ sha: string; parent: string; lost: string[] }> = [];
  for (const line of git(["rev-list", "--parents", head], cwd).split("\n").filter(Boolean)) {
    const [sha, ...parents] = line.trim().split(/\s+/);
    const child = ids(sha);
    for (const p of parents) {
      const lost = [...ids(p)].filter((id) => !child.has(id));
      if (lost.length > 0) out.push({ sha: sha.slice(0, 7), parent: p.slice(0, 7), lost: lost.sort() });
    }
  }
  return out;
}

/**
 * Ids introduced independently at more than one commit.
 *
 * ⚠⚠ **This project has actually done it**: two branches worked in parallel and
 * each allocated the same `E-` number in an append-only register. The display
 * walk hides it — `seen` attributes the id to whichever incomparable commit the
 * topological order happens to reach first — and `removals` cannot see it
 * either, because it compares id SETS and the id is present on both sides. So a
 * merge that keeps one branch's row **silently discards the other's**, with the
 * same id, and every check stays green.
 *
 * An id is "introduced" at a commit when the commit has it and **every** parent
 * lacks it. More than one such commit means two independent allocations.
 */
export function duplicateOrigins(head: string, ids: IdReader, cwd: string = REPO): Array<{ id: string; at: string[] }> {
  const origins = new Map<string, string[]>();
  for (const line of git(["rev-list", "--parents", head], cwd).split("\n").filter(Boolean)) {
    const [sha, ...parents] = line.trim().split(/\s+/);
    for (const id of ids(sha)) {
      if (parents.length > 0 && parents.some((p) => ids(p).has(id))) continue;
      const at = origins.get(id) ?? [];
      at.push(sha.slice(0, 7));
      origins.set(id, at);
    }
  }
  return [...origins].filter(([, at]) => at.length > 1).map(([id, at]) => ({ id, at })).sort((a, b) => a.id.localeCompare(b.id));
}

function render(revs: Rev[], head: string): string {
  const touching = revs.length;
  // ⚠ Counted, not asserted: the gap between the readable walk and every commit
  // whose tree touched the file is exactly what the label above must not hide.
  const fullCount = git(["log", "--full-history", "--format=%H", head, "--", SRC]).split("\n").filter(Boolean).length;
  const withRows = revs.filter((r) => r.added.length > 0).length;
  const total = revs[0]?.total ?? 0;
  const span = revs.length ? `${revs[revs.length - 1].date} to ${revs[0].date}` : "—";

  const L: string[] = [];
  L.push("# `CLAIMS.md` — derived revision log");
  L.push("");
  L.push("⚠ **GENERATED by `tools/build-claims-revisions.ts`. Do not edit.**");
  L.push("`make check-claims-revisions` fails when this drifts from git.");
  L.push("");
  L.push("Git's **simplified** path history for `CLAIMS.md`, newest first, with the rows that");
  L.push("**first appear** in each commit. A row is attributed to the commit whose snapshot of");
  L.push("the file first contains its id — not to one that merely edits or mentions it.");
  L.push("");
  L.push("⚠ **Simplified, and that word is load-bearing.** `git log -- <path>` prunes a merge");
  L.push("that is TREESAME to its first parent, so this is NOT every commit whose tree touched");
  L.push(`the file: \`--full-history\` reports **${fullCount}** against the ${touching} listed below. The`);
  L.push("pruned ones are merges that introduced nothing the branch had not already introduced,");
  L.push("which is what makes this the readable history. ⚠ **The append-only check does NOT run");
  L.push("on this walk** — it runs over every reachable commit against every parent, precisely");
  L.push("because pruning could hide a row dropped at a merge.");
  L.push("");
  L.push("⚠ **This is the half git knows, and it is not the whole record.** What a revision");
  L.push("*established* is a judgement, and it lives in `CLAIMS.md`'s own `Revision history`");
  L.push("table for the entries that have one. The rest are deliberately not reconstructed:");
  L.push("a narrative written now would be one session's reading of other sessions' work.");
  L.push("");
  L.push(`- **Commits in the simplified walk:** ${touching}, spanning ${span} (\`--full-history\`: ${fullCount})`);
  L.push(`- **Of those, commits that introduced at least one row:** ${withRows}`);
  L.push(`- **Rows in the register at \`${revs[0]?.sha ?? "—"}\`:** ${total}`);
  L.push(`- **History covered up to:** \`${head}\``);
  L.push("");
  L.push("⚠ Every number above is derived from the git query its own label names — the first");
  L.push("three from the list below, the `--full-history` figure from a separate query that");
  L.push("deliberately counts MORE commits than the list. None is restated in prose anywhere,");
  L.push("because that is the failure this file exists to end (`CLAIMS.md` E-199, E-203, E-236,");
  L.push("E-249). ⚠ This line said all of them came from the list below, which the list itself");
  L.push("disproves: it holds fewer rows than the full-history count beside it.");
  L.push("");
  L.push("⚠⚠ **REGENERATING THIS FILE TAKES TWO COMMITS, and `make check-claims-revisions`");
  L.push("FAILS until the second one lands.** Commit the `CLAIMS.md` change first; regenerate;");
  L.push("then commit **this file on its own**. An artifact-only commit does not touch");
  L.push("`CLAIMS.md`, so it never enters the walk above and the lag closes at **zero**.");
  L.push("");
  L.push("⚠ **This paragraph used to say the lag could never close and that the gate only");
  L.push("reported it.** That was false, and the tolerance it justified let the gate report PASS");
  L.push("while two committed rows were missing from the log. A single commit cannot carry both");
  L.push("a register change and a log covering it; two can, and nobody asked. `CLAIMS.md` E-268,");
  L.push("corrected by E-271.");
  L.push("");
  L.push("| Date | Commit | Rows first appearing | Subject |");
  L.push("|---|---|---|---|");
  for (const r of revs) {
    L.push(`| ${r.date} | \`${r.sha}\` | ${r.added.length ? ranges(r.added) : "—"} | ${cell(r.subject)} |`);
  }
  L.push("");
  return L.join("\n");
}

/**
 * The parser, proved on shapes before it is trusted on the register.
 *
 * ⚠ **A control that replays the last attack proves the gate catches the last
 * attack** (`CLAIMS.md` E-182, E-202). These are the shapes that have actually
 * broken an id parser in this repository, plus the ones that would break this
 * one specifically: a missing space after the pipe, a bolded id, a suffixed id,
 * an `R-` row, and an id **mentioned inside prose** rather than opening a row.
 */
function probe(): void {
  const cases: Array<[string, string[]]> = [
    ["| E-1 | a | b | A |", ["E-1"]],
    ["|E-9999| no space after the pipe | x | A |", ["E-9999"]],
    ["| **E-2** | a bolded id | x | A |", ["E-2"]],
    ["| E-3a | a suffixed id | x | A |", ["E-3a"]],
    ["| R-6 | the Retracted section | x | A |", ["R-6"]],
    ["| E-5 | this cell mentions E-77 and B-13 in prose | x | A |", ["E-5"]],
    ["Not a row at all: E-42 in a paragraph.", []],
    ["|---|---|---|---|", []],
  ];
  for (const [line, want] of cases) {
    const got = [...idsIn(line)];
    if (got.join(",") !== want.join(",")) {
      console.log(`FAIL: the id parser is wrong before it was used.\n  input:  ${line}\n  want:   [${want}]\n  got:    [${got}]`);
      process.exit(2);
    }
  }
  // The escaper, on the shapes the data has not yet produced.
  const esc: Array<[string, string]> = [
    ["plain subject", "plain subject"],
    ["a | pipe", "a \\| pipe"],
    ["a \\ backslash", "a \\\\ backslash"],
  ];
  for (const [inp, want] of esc) {
    if (cell(inp) !== want) {
      console.log(`FAIL: the cell escaper is wrong.\n  input: ${inp}\n  want:  ${want}\n  got:   ${cell(inp)}`);
      process.exit(2);
    }
  }
  // Range collapsing, including the case that must NOT collapse.
  if (ranges(["E-1", "E-2", "E-3", "E-7"]) !== "E-1 – E-3, E-7") {
    console.log(`FAIL: range collapsing is wrong — got ${ranges(["E-1", "E-2", "E-3", "E-7"])}`);
    process.exit(2);
  }
  if (ranges(["E-1", "E-2"]) !== "E-1, E-2") {
    console.log("FAIL: two adjacent ids must be listed, not collapsed into a range of two.");
    process.exit(2);
  }
  if (ranges(["E-3", "E-3a"]) !== "E-3, E-3a") {
    console.log(`FAIL: a suffixed id must be named in full — got ${ranges(["E-3", "E-3a"])}`);
    process.exit(2);
  }
  console.log("Probes: 8 parser + 3 escaper + 3 range. Verified before use.");
}

/**
 * The removal check, driven against an event this repository has never had.
 *
 * ⚠⚠ **ZERO merges here have ever dropped a row, so without this the check is a
 * branch that has never run.** `CLAIMS.md` E-165, E-182 and E-202 are all the
 * same lesson: a gate built to catch a thing must be shown catching it, and
 * "it passes on real history" shows only that real history is clean.
 *
 * Builds a throwaway repository whose merge keeps the first parent's file and so
 * drops a row the SECOND parent introduced — the exact shape the path-limited,
 * first-parent-only walk could not see. Two assertions, in both directions: the
 * merge must be reported, and the id must be the one that was dropped. It also
 * asserts the event is invisible to the old method, so a regression to it fails
 * here rather than silently.
 */
class ProbeFailure extends Error {}

function probeRemoval(): void {
  const dir = mkdtempSync(join(tmpdir(), "wconf-revlog-probe-"));
  const g = (...a: string[]) => git(a, dir);
  const write = (body: string) => writeFileSync(join(dir, SRC), body);
  try {
    // ⚠ **Hooks are disabled before the first commit, and this probe is
    // MANDATORY — it runs on generation and on every `--check`.** A machine with
    // a global `core.hooksPath`, or executable hooks copied in through
    // `init.templateDir`, would run the user's hooks inside this throwaway
    // repository. Those hooks routinely expect the real project or enforce
    // commit-message rules, so an unrelated environment could fail generation and
    // the gate for reasons that have nothing to do with revision-log
    // correctness. An empty template at `init` stops them being copied in; an
    // empty `core.hooksPath` stops an inherited one being consulted.
    const noHooks = join(dir, "hooks-disabled");
    mkdirSync(noHooks, { recursive: true });
    g("init", "-q", "-b", "main", `--template=${noHooks}`);
    g("config", "core.hooksPath", noHooks);
    g("config", "user.email", "probe@example.invalid");
    g("config", "user.name", "probe");
    g("config", "commit.gpgsign", "false");
    // ⚠ **CONTROL for `GIT_SAFE`, switched ON deliberately.** These are the two
    // settings that crashed the tool. Enabling them in the throwaway repository
    // means every probe below runs under exactly the configuration that used to
    // fail: if the central overrides are ever removed, this probe breaks rather
    // than some user's checkout. `merge.verifySignatures` would abort the merges
    // (the commits here are unsigned); `log.showSignature` would decorate the
    // `git log` the pruning control parses.
    g("config", "merge.verifySignatures", "true");
    g("config", "log.showSignature", "true");
    // ⚠ **A global `core.excludesFile` matching `*.md` makes the first `git add`
    // refuse**, because the synthetic `CLAIMS.md` is untracked and ignored — so
    // generation and `--check` would fail before reading any history, on a
    // machine whose only sin is a tidy global gitignore. Measured: the add
    // reports *"The following paths are ignored"*. An empty excludes file inside
    // the throwaway repository overrides whatever the user has.
    const noExcludes = join(dir, "empty-excludes");
    writeFileSync(noExcludes, "");
    g("config", "core.excludesFile", noExcludes);
    // ⚠ **`core.attributesFile` is a SECOND global door and the excludes file
    // does not close it.** A global attributes rule giving `*.md` a `required`
    // clean filter — git-crypt and Git LFS both install exactly that shape —
    // makes this `add` run the filter over the synthetic `CLAIMS.md`, or fail
    // outright when the filter binary is absent. Measured: `git add` exits 128
    // with *"cannot fork to run external filter"*. The probe is mandatory, so
    // that aborts every generation and every `--check` on such a machine.
    const noAttrs = join(dir, "empty-attributes");
    writeFileSync(noAttrs, "");
    g("config", "core.attributesFile", noAttrs);

    write("| E-1 | a | b | A |\n");
    g("add", SRC); g("commit", "-q", "-m", "base");

    g("checkout", "-q", "-b", "side");
    write("| E-1 | a | b | A |\n| E-2 | only on the branch | b | A |\n");
    // ⚠ A non-ASCII subject, deliberately: it is what `i18n.logOutputEncoding`
    // transcodes, and the pruning control below parses `git log` output.
    g("add", SRC); g("commit", "-q", "-m", "side adds E-2 — an em-dash and a § in the subject");

    g("checkout", "-q", "main");
    write("| E-1 | a | b | A |\n| E-3 | only on main | b | A |\n");
    g("add", SRC); g("commit", "-q", "-m", "main adds E-3");

    // Merge keeping main's file: E-2 is on the second parent and does not survive.
    g("merge", "-q", "--no-ff", "-s", "ours", "-m", "merge, keeping ours", "side");

    const ids = blobCache(dir);
    const found = removals("HEAD", ids, dir);
    const lostE2 = found.filter((f) => f.lost.includes("E-2"));
    if (lostE2.length !== 1) {
      throw new ProbeFailure(`FAIL: the removal check did not see a row dropped by a merge. Reported: ${JSON.stringify(found)}`);
    }

    // CONTROL, the other direction: the OLD method must MISS it, or this probe
    // is not testing what it is named for.
    const firstParentOnly = (() => {
      const line = g("rev-list", "--parents", "-n", "1", "HEAD").trim().split(/\s+/);
      const child = ids(line[0]);
      return [...ids(line[1])].filter((id) => !child.has(id));
    })();
    if (firstParentOnly.includes("E-2")) {
      throw new ProbeFailure("FAIL: the first-parent comparison caught this, so the probe does not model the defect it names.");
    }

    // CONTROL: the path-limited simplified walk must not even list the merge.
    const simplified = g("log", "--topo-order", "--format=%H", "--", SRC).split("\n").filter(Boolean);
    const mergeSha = g("rev-parse", "HEAD").trim();
    if (simplified.includes(mergeSha)) {
      throw new ProbeFailure("FAIL: the simplified walk listed the merge, so pruning is not modelled here.");
    }
    console.log("Removal probe: a merge dropping a branch row is CAUGHT; first-parent-only MISSES it; the simplified walk prunes it.");

    // ---- the duplicate-origin path, which real history has never exercised ----
    // ⚠ Measured before it was written: ZERO ids in this repository have more
    // than one origin. So, like the removal check, it has to be shown catching
    // the thing it names rather than trusted because it stays quiet.
    g("checkout", "-q", "-b", "twin", "main~1");
    write("| E-1 | a | b | A |\n| E-9 | the TWIN's own row, same id | b | A |\n");
    g("add", SRC); g("commit", "-q", "-m", "twin adds E-9");
    g("checkout", "-q", "main");
    write("| E-1 | a | b | A |\n| E-3 | only on main | b | A |\n| E-9 | MAIN's own row, same id | b | A |\n");
    g("add", SRC); g("commit", "-q", "-m", "main adds E-9 independently");
    g("merge", "-q", "--no-ff", "-s", "ours", "-m", "merge, keeping ours", "twin");

    const ids2 = blobCache(dir);
    const dupes = duplicateOrigins("HEAD", ids2, dir);
    if (!dupes.some((d) => d.id === "E-9" && d.at.length === 2)) {
      throw new ProbeFailure(`FAIL: two independent allocations of one id were not detected. Reported: ${JSON.stringify(dupes)}`);
    }
    // CONTROL: `removals` must NOT see it — the id is on both sides, so the id
    // sets never differ and one branch's row is discarded in silence. If this
    // ever starts firing, the two checks overlap and this probe is misnamed.
    if (removals("HEAD", ids2, dir).some((r) => r.lost.includes("E-9"))) {
      throw new ProbeFailure("FAIL: the removal check caught the duplicate id, so this probe does not model the gap it names.");
    }
    console.log("Duplicate-origin probe: two branches allocating one id are CAUGHT; the removal check MISSES it.");

    // ---- two ROWS, one id, inside a single file ----------------------------
    // ⚠ Distinct from the case above: no branching, no merge, just one commit
    // whose file opens the same id twice. The Set-based instruments cannot see
    // it, which is the point, so this asserts the count-based one does AND that
    // the set-based view still reports the collapsed total.
    write("| E-1 | a | b | A |\n| E-4 | first row | b | A |\n| E-4 | SECOND row, same id | b | A |\n");
    g("add", SRC); g("commit", "-q", "-m", "one file, one id, two rows");
    const ids3 = blobCache(dir);
    const twoRows = duplicateRows("HEAD", ids3, dir);
    if (!twoRows.some((t) => t.dupes.some((d) => d.id === "E-4" && d.rows === 2))) {
      throw new ProbeFailure(`FAIL: two rows sharing one id were not detected. Reported: ${JSON.stringify(twoRows)}`);
    }
    // CONTROL: the set-based view collapses them, which is why the count exists.
    if (ids3("HEAD").size !== 2) {
      throw new ProbeFailure(`FAIL: the set view should collapse E-4 to one member (expected 2 ids, got ${ids3("HEAD").size}); this probe no longer models the defect.`);
    }
    console.log("Duplicate-row probe: two rows sharing one id are CAUGHT by the count; the set view still collapses them to one.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The one INDEPENDENT oracle this tool has for its attribution.
 *
 * ⚠ **Every other check here proves the parser parses. None of them proves the
 * TRAVERSAL attributes a row to the right commit** — and the traversal is the
 * part that was wrong, silently, and reported six deletions that never happened.
 * A probe written by the same session that wrote the walk would have agreed with
 * it.
 *
 * `CLAIMS.md`'s curated `Revision history` was written by other sessions, by
 * hand, from what they had just done. Three of its entries name their row ids,
 * so they are an oracle this tool did not produce and cannot influence. If the
 * derived log disagrees with all three, the traversal is wrong again.
 *
 * ⚠ These entries are historical and closed; they are not expected to change. If
 * one legitimately does, this control is where that shows up, and it should be
 * re-read rather than deleted.
 *
 * ⚠ **Verified by breaking it, and the first break it did NOT catch.** Dropping
 * `--topo-order` left all three entries reproduced, because that flag changes
 * ordering here and not attribution — the byte comparison caught it instead.
 * Dropping `--reverse`, which walks newest-first and truly inverts attribution,
 * is what this control exists for: all three entries then derive as empty and it
 * fails. **A control that only ever passes proves nothing**, so the break that
 * fails it is recorded beside the break that does not.
 */
/**
 * ⚠ **The archive declaration, for a repository published as one squashed
 * commit** (`CLAIMS.md` E-309; decision D2 of
 * `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md`). Such a
 * repository cannot contain the private history the curated entries below name,
 * so the oracle has no subject there, and on 2026-10-18 the builder refused to
 * run at all in a squashed export. It is skipped ONLY when none of its commits
 * exists AND `ARCHIVE` is present: a file created deliberately at publication,
 * keeping the private history's log as a static record. ⚠ **The private
 * repository never has that file, so its oracle never skips**, and a rewrite that
 * lost the curated commits still fails here.
 */
const ARCHIVE = "docs/CLAIMS-REVISIONS-ARCHIVE.md";
const commitExists = (sha: string) => { try { git(["cat-file", "-e", `${sha}^{commit}`]); return true; } catch { return false; } };

function oracle(revs: Rev[]): void {
  const expected: Array<[string, string]> = [
    ["f9e9eb9", "E-141 – E-145"],
    ["4cc3ae1", "B-17, E-135 – E-140"],
    ["aa1f349", "E-129 – E-134, F-24"],
  ];
  if (existsSync(join(REPO, ARCHIVE)) && expected.every(([sha]) => !commitExists(sha))) {
    console.log(`Oracle: NOT RUN. None of its ${expected.length} curated commits is in this history, and ${ARCHIVE} declares that history starts at publication.`);
    return;
  }
  const bad: string[] = [];
  for (const [sha, want] of expected) {
    const r = revs.find((x) => x.sha === sha);
    if (!r) { bad.push(`${sha}: not in the log at all`); continue; }
    const got = ranges(r.added);
    if (got !== want) bad.push(`${sha}: curated "${want}", derived "${got}"`);
  }
  if (bad.length > 0) {
    console.log("FAIL: the derived log disagrees with CLAIMS.md's hand-written Revision history.");
    for (const b of bad) console.log(`      ${b}`);
    console.log("      That table was written by other sessions and is the only outside check on");
    throw new ProbeFailure("      this tool's attribution. Suspect the traversal before suspecting the table.");
  }
  console.log(`Oracle: ${expected.length} curated entries reproduced from git independently.`);
}

/**
 * The commit this log should be anchored to: the newest one that TOUCHED the
 * register, not `HEAD`.
 *
 * ⚠⚠ **`HEAD` made regeneration non-idempotent, and the workflow this tool
 * prescribes is what exposed it.** After the artifact-only commit, `HEAD` no
 * longer touches `CLAIMS.md`, so a rerun with **no input change** moved the
 * covered sha — measured, `d355924` to `89ca9a5` — and committing that advances
 * `HEAD` again, forever. Meanwhile `--check` accepted the older sha because no
 * commit had touched the register in between, so the loop was invisible to it.
 *
 * ⚠ **Anchoring here keeps the staleness property rather than losing it.** The
 * check is no longer "is there a lag" — which this anchor would make vacuous —
 * but **"does the file's covered sha equal the newest register commit"**. A
 * `CLAIMS.md` commit without a regeneration still fails; an artifact-only commit
 * changes nothing. `CLAIMS.md` E-268, E-271, E-274.
 */
function generationHead(): string {
  return git(["rev-list", "-1", "HEAD", "--", SRC]).trim();
}

/** The head sha the committed log says it covers. */
export function coveredHead(text: string): string | null {
  const m = text.match(/^- \*\*History covered up to:\*\* `([0-9a-f]{7,40})`$/m);
  return m ? m[1] : null;
}

/**
 * Every id at the covered head must be attributed to exactly one commit.
 *
 * ⚠ **This is the invariant that catches a walk which silently skipped a
 * commit.** The display walk is path-limited and simplified, so it CAN in
 * principle lose a branch whose merge was TREESAME to the other parent. If that
 * ever happens, some id in the file is attributed to nothing and this fails,
 * rather than the log quietly omitting a row's origin.
 */
function attributionIsComplete(revs: Rev[], atHead: Set<string>): string[] {
  const attributed = new Set<string>();
  for (const r of revs) for (const id of r.added) attributed.add(id);
  return [...atHead].filter((id) => !attributed.has(id)).sort();
}

function main(): void {
  probe();
  // ⚠ **`process.exit` inside the probe skipped its own `finally`.** The probe
  // asserts by failing, so the leak happened on exactly the paths it exists to
  // exercise: a `wconf-revlog-probe-*` directory survived every regression it
  // caught. It throws now, the `finally` deletes the directory, and the exit
  // code is set here instead.
  try {
    probeRemoval();
  } catch (e) {
    if (!(e instanceof ProbeFailure)) throw e;
    console.log(e.message);
    process.exit(2);
  }

  if (process.argv.includes("--check")) {
    let current = "";
    try { current = readFileSync(OUT, "utf8"); } catch { /* absent */ }
    if (!current) {
      console.log("FAIL: docs/CLAIMS-REVISIONS.md is absent.");
      console.log("      Build it:  bun run tools/build-claims-revisions.ts");
      process.exit(1);
    }
    const head = coveredHead(current);
    if (!head) {
      console.log("FAIL: docs/CLAIMS-REVISIONS.md does not say which commit it covers.");
      console.log("      Its `History covered up to:` line is missing or malformed. Rebuild it.");
      process.exit(1);
    }
    try {
      git(["merge-base", "--is-ancestor", head, "HEAD"]);
    } catch {
      console.log(`FAIL: ${head.slice(0, 7)} is not an ancestor of HEAD.`);
      console.log("      The log describes a history this branch does not contain — a rebase, a");
      console.log("      force-push or the wrong branch. Rebuild it and re-read what changed.");
      process.exit(1);
    }

    const revs = collect(head);
    oracle(revs);
    if (readFileSync(OUT, "utf8") !== render(revs, head)) {
      console.log("FAIL: docs/CLAIMS-REVISIONS.md is STALE or hand-edited.");
      console.log(`      It does not match a regeneration over ${head.slice(0, 7)}, which it names.`);
      console.log("      Rebuild it:  bun run tools/build-claims-revisions.ts");
      process.exit(1);
    }

    const ids = blobCache();
    const orphans = attributionIsComplete(revs, ids(head));
    if (orphans.length > 0) {
      console.log(`FAIL: ${orphans.length} row(s) at ${head.slice(0, 7)} are attributed to no commit: ${ranges(orphans)}`);
      console.log("      The display walk lost a commit that introduced them. Suspect merge");
      console.log("      simplification pruning a branch, and widen the walk.");
      process.exit(1);
    }

    const gone = removals("HEAD", ids);
    if (gone.length > 0) {
      console.log(`FAIL: ${gone.length} parent edge(s) DROPPED a row from an append-only register.`);
      for (const g of gone) console.log(`      ${g.sha} lost ${ranges(g.lost)} relative to parent ${g.parent}`);
      console.log("      A retraction is a row rewritten in place with ~~strikethrough~~, never deleted.");
      process.exit(1);
    }

    // ⚠ **The anchor, not a lag list.** `HEAD` is the wrong reference: after the
    // artifact-only commit it no longer touches the register, so generating
    // against it was not idempotent (E-274). The property that matters is that
    // the file names the NEWEST register commit; a `CLAIMS.md` commit without a
    // regeneration still fails, and an artifact-only commit changes nothing.
    const expected = generationHead();
    if (head !== expected) {
      const missed = git(["log", "--format=%h %s", `${head}..${expected}`, "--", SRC]).split("\n").filter(Boolean);
      console.log(`FAIL: the log is anchored to ${head.slice(0, 7)}, but the newest ${SRC} commit is ${expected.slice(0, 7)}.`);
      for (const l of missed) console.log(`      missing: ${l}`);
      console.log("      Regenerate, then commit docs/CLAIMS-REVISIONS.md ON ITS OWN:");
      console.log("        bun run tools/build-claims-revisions.ts");
      console.log("        git add docs/CLAIMS-REVISIONS.md && git commit");
      console.log("      An artifact-only commit does not touch CLAIMS.md, so regeneration stays idempotent.");
      process.exit(1);
    }

    const twoRows = duplicateRows("HEAD", ids);
    if (twoRows.length > 0) {
      console.log(`FAIL: ${twoRows.length} revision(s) open two rows with one id.`);
      for (const t of twoRows) for (const d of t.dupes) console.log(`      ${t.sha}: ${d.id} opens ${d.rows} rows`);
      console.log("      A Set would collapse them, so the totals, the origin check and the");
      console.log("      append-only check would all agree while the register held two rows as one.");
      process.exit(1);
    }

    const dupes = duplicateOrigins("HEAD", ids);
    if (dupes.length > 0) {
      console.log(`FAIL: ${dupes.length} row id(s) were introduced INDEPENDENTLY at more than one commit.`);
      for (const d of dupes) console.log(`      ${d.id} introduced at ${d.at.join(", ")}`);
      console.log("      Two branches allocated one id in an append-only register. A merge keeps one");
      console.log("      row and silently discards the other; the id sets never differ, so nothing else");
      console.log("      here can see it. Renumber one of them and say so in the register.");
      process.exit(1);
    }

    // ⚠ **The working tree, which every check above is blind to.** Everything
    // else reads committed git objects, so deleting a row and running the gate
    // before committing reported PASS - measured by removing E-266 - which is
    // exactly the moment the append-only rule most needs to hold.
    const workingText = readFileSync(join(REPO, SRC), "utf8");
    const workingDupes = duplicateIdsIn(workingText);
    if (workingDupes.length > 0) {
      console.log(`FAIL: the working tree opens two rows with one id: ${workingDupes.map((d) => `${d.id} x${d.rows}`).join(", ")}`);
      console.log("      Nothing is committed yet. Renumber one of them before it enters history.");
      process.exit(1);
    }
    const working = idsIn(workingText);
    const dropped = [...ids(head)].filter((id) => !working.has(id)).sort();
    if (dropped.length > 0) {
      console.log(`FAIL: ${dropped.length} row(s) present at ${head.slice(0, 7)} are MISSING from the working tree: ${ranges(dropped)}`);
      console.log("      This register is append-only. A retraction is a row rewritten in place with");
      console.log("      ~~strikethrough~~, never a row deleted. Nothing is committed yet, so restore it.");
      process.exit(1);
    }

    console.log(`PASS: the log matches git and is anchored to the newest ${SRC} commit — ${revs.length} commits, ${revs[0].total} rows,`);
    console.log(`      byte-compared, every row attributed, ${git(["rev-list", "--count", "HEAD"]).trim()} commits checked for removals against every parent.`);
    console.log("⚠ This says WHEN each row entered the register. It says nothing about whether a row");
    console.log("  is TRUE, and it does not supply the narrative CLAIMS.md's Revision history carries.");
    return;
  }

  const head = generationHead();
  const revs = collect(head);
  if (revs.length === 0) {
    console.log("FAIL: git reports ZERO commits touching CLAIMS.md — the log would be empty and say nothing.");
    process.exit(2);
  }
  oracle(revs);
  const ids = blobCache();
  const live = idsIn(readFileSync(join(REPO, SRC), "utf8"));
  if (revs[0].total !== live.size) {
    console.log(`note: the working tree holds ${live.size} rows; ${revs[0].sha} holds ${revs[0].total}.`);
    console.log("      Uncommitted edits are not logged until they are committed. Commit CLAIMS.md");
    console.log("      FIRST, then regenerate, then commit this artifact on its own.");
  }
  const gone = removals("HEAD", ids);
  const dupes = duplicateOrigins("HEAD", ids);
  writeFileSync(OUT, render(revs, head));
  console.log(`wrote docs/CLAIMS-REVISIONS.md — ${revs.length} commits, ${revs[0].total} rows, covering up to ${head.slice(0, 7)}`);
  if (gone.length > 0) {
    console.log(`⚠ ${gone.length} parent edge(s) dropped a row; --check will FAIL until that is explained.`);
    for (const g of gone) console.log(`    ${g.sha} lost ${ranges(g.lost)} relative to parent ${g.parent}`);
  }
  if (dupes.length > 0) {
    console.log(`⚠ ${dupes.length} id(s) introduced at more than one commit; --check will FAIL until renumbered.`);
    for (const d of dupes) console.log(`    ${d.id} at ${d.at.join(", ")}`);
  }
  const twoRows = duplicateRows("HEAD", ids);
  if (twoRows.length > 0) {
    console.log(`⚠ ${twoRows.length} revision(s) open two rows with one id; --check will FAIL.`);
    for (const t of twoRows) for (const d of t.dupes) console.log(`    ${t.sha}: ${d.id} opens ${d.rows} rows`);
  }
}

if (import.meta.main) main();
