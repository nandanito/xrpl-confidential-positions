/**
 * check-vocabulary.ts — no reader-facing document uses `tapFailHard` as if it
 * were a real name.
 *
 *   bun run tools/check-vocabulary.ts
 *
 * # Why this exists
 *
 * `tapFailHard` is this project's shorthand and appears zero times in rippled.
 * The real names are `fail_hard`, the submission parameter a client sets, and
 * `TapFailHard`, rippled's internal apply flag (`docs/VOCABULARY.md`). The
 * shorthand escaped into a public upstream filing once (`CLAIMS.md` E-156).
 * Phase 1 of the launch plan translates it on every reader-facing surface, and
 * `docs/VOCABULARY.md` said of itself: *"It is prose, with no falsifier. If that
 * matters, the gate is the artifact."* This is that gate.
 *
 * # The rule
 *
 * A LEAK uses the shorthand instead of the real name. A DEFINITION puts it next
 * to one. So a line containing `tapFailHard` passes only if, with every
 * `tapFailHard` removed, the SAME line still carries a marker: the real name
 * `fail_hard` or `TapFailHard` (case-sensitive, since the shorthand differs from
 * the flag by one capital), or the words "shorthand", "not a real name" or
 * "zero times in rippled". ⚠ **Same line only, no window**: a window of even one
 * line would forgive a leak written directly under a definition, and a control
 * pins that.
 *
 * # What it does NOT check
 *
 * Printed every run. It reads a NAMED set of reader-facing files. The records —
 * `CLAIMS.md`, `CLAUDE.md`, `UPSTREAM-FEEDBACK.md`, `docs/reviews/`,
 * `docs/decisions/`, `docs/task-zero/`, `docs/runs/` and the rest — keep their
 * wording by ruling, under a banner pointing at the translation. Code is not
 * read: its identifiers and comments are for contributors and the real
 * parameter is what it sends. `web/` is covered by `web/api/disclosure.test.ts`,
 * and upstream drafts by `tools/check-filing.ts`. It is lexical: a paraphrase
 * that misnames the flag without the string is invisible to it.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SHORTHAND = "tapFailHard";
const REAL = ["fail_hard", "TapFailHard"];
const PHRASES = ["shorthand", "not a real name", "zero times in rippled"];

/** The reader-facing set. Directories are walked for `.md` files. */
const TOP_LEVEL = ["README.md", "GETTING-STARTED-CLAUDE-CODE.md", "PREFLIGHT.md", "CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md"];
const DIRS = ["docs/architecture", "docs/explainer", "docs/posts", ".github"];
const FILES = ["docs/VOCABULARY.md", "facility/README.md", "signer/README.md", "web/README.md"];
/** Evidence and tool READMEs are reader-facing too; their logs and data are not. */
const README_UNDER = ["docs/evidence", "tools"];

export function inScope(rel: string): boolean {
  if (TOP_LEVEL.includes(rel) || FILES.includes(rel)) return true;
  if (DIRS.some((d) => rel.startsWith(d + "/")) && /\.(md|ya?ml)$/.test(rel)) return true;
  return README_UNDER.some((d) => rel.startsWith(d + "/")) && /(^|\/)README\.md$/.test(rel);
}

/** The one function every check and every control calls. */
export function findLeaks(rel: string, text: string): { rel: string; line: number; text: string }[] {
  const out: { rel: string; line: number; text: string }[] = [];
  text.split("\n").forEach((l, i) => {
    if (!l.includes(SHORTHAND)) return;
    const rest = l.split(SHORTHAND).join("");
    const marked = REAL.some((r) => rest.includes(r)) || PHRASES.some((p) => rest.toLowerCase().includes(p));
    if (!marked) out.push({ rel, line: i + 1, text: l.trim().slice(0, 160) });
  });
  return out;
}

function walk(dir: string): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const n of readdirSync(abs)) {
    const p = join(abs, n);
    if (statSync(p).isDirectory()) out.push(...walk(relative(ROOT, p)));
    else out.push(relative(ROOT, p));
  }
  return out;
}

export function surfaces(): string[] {
  const all = new Set<string>([...TOP_LEVEL, ...FILES].filter((f) => existsSync(join(ROOT, f))));
  for (const d of [...DIRS, ...README_UNDER]) for (const f of walk(d)) if (inScope(f)) all.add(f);
  return [...all].sort();
}

if (import.meta.main) {
  const finish = (word: string, code: number) => { console.log(`check-vocabulary: verdict=${word} exit=${code}`); process.exit(code); };
  let run = 0;
  const failed: string[] = [];
  const control = (name: string, ok: boolean) => { run++; if (!ok) failed.push(name); };
  const leaks = (t: string) => findLeaks("x.md", t).length;
  control("a sentence using the shorthand as a name is a leak", leaks("Set `tapFailHard` on every submission.") === 1);
  control("a definition naming fail_hard is not", leaks("`tapFailHard` is ours; the parameter is `fail_hard`.") === 0);
  control("a definition naming TapFailHard is not", leaks("Internally rippled calls it `TapFailHard`, not tapFailHard.") === 0);
  control("a sentence calling it shorthand is not", leaks("`tapFailHard` is this project's shorthand.") === 0);
  control("the real flag alone is not (case matters)", leaks("rippled sets `TapFailHard`.") === 0);
  control("a leak directly under a definition IS caught (no window)", leaks("`tapFailHard` is shorthand for `fail_hard`.\nSo the facility sets tapFailHard.") === 1);
  control("a leak inside a code block is caught", leaks("```sh\nsubmit --tapFailHard\n```") === 1);
  control("README.md is in scope", inScope("README.md"));
  control("an explainer is in scope", inScope("docs/explainer/X.md"));
  control("a post draft is in scope", inScope("docs/posts/X.md"));
  control("an evidence README is in scope, its logs are not", inScope("docs/evidence/a/README.md") && !inScope("docs/evidence/a/logs/x.log"));
  control("docs/reviews is out of scope by ruling", !inScope("docs/reviews/REVIEW-001.md"));
  control("CLAIMS.md is out of scope by ruling", !inScope("CLAIMS.md"));
  console.log(`controls: ${run - failed.length}/${run} passed, through the same findLeaks() and inScope() the check calls`);
  if (failed.length) { for (const f of failed) console.log(`  CONTROL FAILED: ${f}`); finish("CONTROL-FAILED", 2); }

  const set = surfaces();
  if (!set.includes("README.md") || set.length < 5) { console.log(`REFUSED: only ${set.length} reader-facing file(s) found; an empty scope is not a pass`); finish("REFUSED", 2); }
  const found = set.flatMap((f) => findLeaks(f, readFileSync(join(ROOT, f), "utf8")));
  console.log(`scanned ${set.length} reader-facing file(s)`);
  for (const l of found) console.log(`  LEAK ${l.rel}:${l.line}  ${l.text}`);
  console.log("\nWhat this does NOT check: the records (CLAIMS.md, CLAUDE.md, UPSTREAM-FEEDBACK.md, docs/reviews/, docs/decisions/,");
  console.log("docs/task-zero/, docs/runs/) keep their wording by ruling; code is not read; web/ is web/api/disclosure.test.ts's;");
  console.log("upstream drafts are check-filing's; and a paraphrase that misnames the flag without the string is invisible.");
  finish(found.length ? "FAIL" : "PASS", found.length ? 1 : 0);
}
