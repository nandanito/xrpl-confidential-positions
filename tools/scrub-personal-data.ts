/**
 * scrub-personal-data.ts — replace this machine's personal paths, and email
 * addresses the secret sweep does not allow, with placeholders.
 *
 *   bun run tools/scrub-personal-data.ts <file>...            # dry run: counts only
 *   bun run tools/scrub-personal-data.ts --write <file>...    # rewrite in place
 *
 * # Why this exists
 *
 * `make check-no-secrets` fails on a home directory, a macOS per-user temp
 * directory or a personal email address anywhere in what would be published.
 * Review transcripts and build logs pick those up every time a tool prints its
 * working directory, so scrubbing is a repeated task, not a one-off — and a
 * repeated hand edit is how a copy gets missed (`CLAUDE.md`: grep the phrase,
 * not the line).
 *
 * # What it replaces
 *
 * Computed at run time from the machine, so this file names no person:
 *
 * | placeholder | what |
 * |---|---|
 * | `$REPO` | this repository's root, plain or JSON-escaped |
 * | `$REPO_SLUG` | the root dash-encoded, as tools name a directory after a path |
 * | `$HOME` | the home directory, plain or JSON-escaped |
 * | `$HOME_SLUG` | the home directory dash-encoded |
 * | `$USER_TMP` | the macOS per-user temp root under `/var/folders` |
 * | `redacted@example.invalid` | every email address `check-no-secrets.ts` does not allow |
 *
 * ⚠ **Not angle brackets.** The first version wrote `<home>`, and GitHub
 * renders a bare `<home>` in Markdown as an HTML tag and drops it, so a
 * scrubbed path would have read as `/.nvm/...`. Shell-style names render
 * literally and, in a command, are still valid shell.
 *
 * Emails are found by **the gate's own `emailHits()`**, so the two cannot
 * disagree about what an address is. Afterwards the gate's path and email
 * detectors run over the result, and anything the gate would still FAIL on —
 * another user's home under a name that is not generic, say — is printed and the
 * run exits 1, so it is handled by hand rather than left in place.
 *
 * ⚠ **Corrected by `REVIEW-056` S3-4.** This said *"anything left … is
 * printed"*, and two cases contradict that. A home under a generic name such as
 * `/home/user` is allowed by the gate, so it is neither scrubbed nor printed.
 * And this machine's own paths are replaced EVERYWHERE they occur, including
 * where the gate would not flag them, such as glued to a preceding word. That
 * over-reach is deliberate: it only ever removes this machine's paths.
 *
 * # What it will not do
 *
 * * **Edit code.** A path in a `.ts`, `.rs`, `.py`, `.sh` or `.js` file is a
 *   bug to fix, not text to redact: a scrubbed path no longer runs. Those files
 *   are refused unless `--allow-code` is given.
 * * **Print a value.** Counts per rule, per file, only.
 * * **Touch a secret.** Seeds, scalars and credentials are not personal data and
 *   must not be "scrubbed" into a placeholder that hides that they were there.
 *   Rotate or remove those by hand.
 */

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { emailHits, pathHits } from "./check-no-secrets.ts";

const CODE = /\.(ts|tsx|js|mjs|cjs|rs|py|sh)$/;

function substitutions(): { rule: string; from: string; to: string }[] {
  const repo = realpathSync(join(import.meta.dir, ".."));
  const home = realpathSync(homedir());
  const subs: { rule: string; from: string; to: string }[] = [];
  const t = realpathSync(tmpdir()).match(/^(\/private)?(\/var\/folders\/[^/]+\/[^/]+)/);
  if (t) {
    subs.push({ rule: "user-tmp", from: "/private" + t[2], to: "$USER_TMP" });
    subs.push({ rule: "user-tmp", from: t[2], to: "$USER_TMP" });
  }
  const esc = (p: string) => p.replaceAll("/", "\\/");
  const dash = (p: string) => p.replaceAll("/", "-");
  subs.push(
    { rule: "repo", from: esc(repo), to: "$REPO" },
    { rule: "repo", from: repo, to: "$REPO" },
    { rule: "repo-slug", from: dash(repo), to: "$REPO_SLUG" },
    { rule: "home", from: esc(home), to: "$HOME" },
    { rule: "home", from: home, to: "$HOME" },
    { rule: "home-slug", from: dash(home) + "-", to: "$HOME_SLUG-" },
  );
  // Longest first, so the repository root wins over the home directory it is under.
  return subs.sort((a, b) => b.from.length - a.from.length);
}

export function scrub(text: string): { text: string; counts: Map<string, number> } {
  const counts = new Map<string, number>();
  let out = text;
  for (const s of substitutions()) {
    const n = out.split(s.from).length - 1;
    if (n) { counts.set(s.rule, (counts.get(s.rule) ?? 0) + n); out = out.replaceAll(s.from, s.to); }
  }
  const emails = emailHits(out).filter((h) => !h.allowedBy).sort((a, b) => b.at - a.at);
  for (const h of emails) out = out.slice(0, h.at) + "redacted@example.invalid" + out.slice(h.at + h.len!);
  if (emails.length) counts.set("email", emails.length);
  return { text: out, counts };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const allowCode = argv.includes("--allow-code");
  const files = argv.filter((a) => !a.startsWith("--"));
  if (!files.length) { console.log("usage: scrub-personal-data.ts [--write] [--allow-code] <file>..."); process.exit(2); }
  let left = 0, changed = 0;
  const total = new Map<string, number>();
  console.log("| file | substitutions |\n|---|---|");
  for (const f of files) {
    if (CODE.test(f) && !allowCode) { console.log(`| \`${f}\` | REFUSED: code file, fix the path by hand |`); left++; continue; }
    const before = readFileSync(f, "latin1");
    const { text, counts } = scrub(before);
    const remaining = [...pathHits(text), ...emailHits(text)].filter((h) => !h.allowedBy);
    if (counts.size) {
      changed++;
      for (const [k, n] of counts) total.set(k, (total.get(k) ?? 0) + n);
      console.log(`| \`${f}\` | ${[...counts].map(([k, n]) => `${k} ${n}`).join(", ")} |`);
      if (write) writeFileSync(f, text, "latin1");
    }
    for (const h of remaining) { left++; console.log(`| \`${f}\` | LEFT: ${h.why} — ${h.shown} |`); }
  }
  console.log(`\n${write ? "rewrote" : "would rewrite"} ${changed} file(s); totals: ${[...total].map(([k, n]) => `${k} ${n}`).join(", ") || "none"}; ${left} item(s) need a hand fix`);
  process.exit(left ? 1 : 0);
}
