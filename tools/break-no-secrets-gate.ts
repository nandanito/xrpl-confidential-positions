/**
 * break-no-secrets-gate.ts — verify `check-no-secrets` by BREAKING it.
 *
 *   bun run tools/break-no-secrets-gate.ts              # every probe
 *   bun run tools/break-no-secrets-gate.ts --self-test  # verify this harness
 *
 * # Why this exists
 *
 * A gate that has never been broken is a claim. This repository recorded four
 * gates that reported PASS while the thing they checked was broken (`CLAIMS.md`
 * E-165, E-168, E-182, E-201), and each was found by mutating, not by reading.
 * So the mutations are committed and the next session re-runs them.
 *
 * # Three kinds of probe
 *
 * * **Detector mutations.** A copy of the gate with ONE exact edit, written
 *   beside it as `tools/.mutant-<pid>.ts` (gitignored) so its imports resolve,
 *   run with `--controls-only`. It must end `CONTROL-FAILED exit=2`, and the
 *   control the probe names must appear in a `CONTROL FAILED:` line. The real
 *   gate file is never edited, so nothing needs restoring.
 * * **Tree plants.** An untracked file carrying a SYNTHETIC secret is written
 *   into the real tree, and the real gate runs over the real tree. It must end
 *   `FAIL exit=1` with the planted path in the `FAILING` section. ⚠ **A plant
 *   into a gitignored path must still PASS**, because ignored files are not
 *   published. ⚠ **These need a clean baseline**: the unplanted tree must PASS
 *   first, or a FAIL proves nothing about the plant.
 * * **Baselines.** The unmutated copy must end `CONTROLS-PASS exit=0`, so a
 *   harness that rejects everything cannot score full marks.
 *
 * # How a run is classified
 *
 * By the gate's verdict line, which must be the LAST line and must agree with
 * the exit code. Bun exits 1 on a syntax error or an uncaught throw, the same
 * code as a real finding, so the exit code alone cannot tell them apart
 * (`CLAIMS.md` E-259). Anything else is `CRASH`. ⚠ The needle is searched only
 * in the lines that report a failure, never the whole output: the gate prints
 * its control names, so an unscoped search matches every run.
 *
 * ⚠ Tree plants write files into the working tree for a few seconds each. The
 * values are generated here and are not anyone's secret, but do not run
 * `git add -A` while this runs.
 */

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { encodeSeed } from "ripple-address-codec";

const ROOT = join(import.meta.dir, "..");
const GATE = join(import.meta.dir, "check-no-secrets.ts");
const SRC = readFileSync(GATE, "utf8");
const MUTANT = join(import.meta.dir, `.mutant-${process.pid}.ts`);

const cleanup: string[] = [MUTANT];
const clean = () => { for (const p of cleanup) rmSync(p, { recursive: true, force: true }); };
process.on("exit", clean);
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => { clean(); process.exit(130); });

interface Run { verdict: string; exit: number; out: string[]; crash: boolean }
function run(file: string, args: string[]): Run {
  const r = Bun.spawnSync(["bun", "run", file, ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  const out = new TextDecoder().decode(r.stdout).split("\n").filter((l) => l.length);
  const last = out[out.length - 1] ?? "";
  const m = last.match(/^check-no-secrets: verdict=(\S+) exit=(\d+)$/);
  const crash = !m || Number(m[2]) !== r.exitCode;
  if (crash) out.push(...new TextDecoder().decode(r.stderr).split("\n").slice(-8).map((l) => `stderr: ${l}`));
  return { verdict: m?.[1] ?? "none", exit: r.exitCode ?? -1, out, crash };
}

/** Lines that report a failure, and only those. */
function failureLines(r: Run): string[] {
  const control = r.out.filter((l) => l.startsWith("  CONTROL FAILED:") || l.startsWith("  STALE CITED VECTOR:"));
  const i = r.out.findIndex((l) => l.startsWith("FAILING:"));
  if (i === -1) return control;
  const end = r.out.findIndex((l, k) => k > i && (l.startsWith("REPORTED") || l.startsWith("What this gate")));
  return [...control, ...r.out.slice(i, end === -1 ? undefined : end)];
}

interface Mutation { name: string; find: string; replace: string; needle: string; args?: string[]; expect?: "CONTROL-FAILED" }

/** Apply one exact edit, asserting it matches exactly once. */
function mutate(m: Mutation): string | null {
  const n = SRC.split(m.find).length - 1;
  return n === 1 ? SRC.replace(m.find, m.replace) : null;
}

export const MUTATIONS: Mutation[] = [
  { name: "near-seeds require a checksum", find: "if (run[0] === \"s\" && run.length <= 35) consider(0, run.length, false);", replace: "if (run[0] === \"s\" && run.length <= 35) consider(0, run.length, true);", needle: "a seed whose checksum fails" },
  { name: "no sliding over glued runs", find: "      if (run[i] !== \"s\") continue;", replace: "      if (run[i] !== \"s\" || true) continue;", needle: "glued to other base58" },
  { name: "public-entropy rule accepts any entropy", find: "matches: (e) => e.length === 16 && e.every((b) => b === e[0]),", replace: "matches: (e) => e.length === 16,", needle: "a secp256k1 seed inside a comment" },
  { name: "'sk' dropped from the secret labels", find: "const SECRET_COMPONENTS = new Set([\"sk\", ", replace: "const SECRET_COMPONENTS = new Set([\"xk\", ", needle: "under a JSON 'sk' key" },
  { name: "label window too short for a type annotation", find: "const WINDOW = 40;", replace: "const WINDOW = 4;", needle: "behind a Rust type annotation" },
  { name: "'entropy' dropped from the entropy labels", find: "new Set([\"seed\", \"entropy\",", replace: "new Set([\"seed\", \"xentropy\",", needle: "entropy in hex" },
  { name: "known-value class disabled", find: "  if (!store.needles.length) return [];", replace: "  if (true) return [];", needle: "unlabelled and lower-cased" },
  { name: "derived ElGamal key not searched", find: "    { value: deriveElGamalKey(seed).sk.toLowerCase(), label: `${label} (ElGamal key derived from it)`, kind: \"hex\" },\n", replace: "", needle: "DERIVED from a stored seed" },
  { name: "JSON-escaped home rule removed", find: "{ rule: \"JSON-escaped home\", re: new RegExp(", replace: "{ rule: \"JSON-escaped home\", re: new RegExp(\"(?!)\", \"g\") ?? new RegExp(", needle: "JSON-escaped home path" },
  { name: "dash-encoded home rule removed", find: "{ rule: \"dash-encoded home\", re: /", replace: "{ rule: \"dash-encoded home\", re: /(?!)/g ?? /", needle: "dash-encoded home path" },
  { name: "Linux home rule removed", find: "{ rule: \"Linux home\", re: new RegExp(", replace: "{ rule: \"Linux home\", re: new RegExp(\"(?!)\", \"g\") ?? new RegExp(", needle: "Linux home path" },
  { name: "Windows home rule removed", find: "{ rule: \"Windows home\", re: new RegExp(", replace: "{ rule: \"Windows home\", re: new RegExp(\"(?!)\", \"g\") ?? new RegExp(", needle: "Windows home path" },
  { name: "URL-encoded home rule removed", find: "{ rule: \"URL-encoded home\", re: new RegExp(", replace: "{ rule: \"URL-encoded home\", re: new RegExp(\"(?!)\", \"g\") ?? new RegExp(", needle: "URL-encoded home path" },
  { name: "per-user temp rule removed", find: "{ rule: \"macOS per-user temp\", re: new RegExp(", replace: "{ rule: \"macOS per-user temp\", re: new RegExp(\"(?!)\", \"g\") ?? new RegExp(", needle: "per-user temp path" },
  { name: "every user name treated as generic", find: "const generic = rule !== \"macOS per-user temp\" && GENERIC_USERS.has(who.toLowerCase());", replace: "const generic = rule !== \"macOS per-user temp\";", needle: "a macOS home path" },
  { name: "'.com' treated as reserved", find: "const RESERVED_TLDS = new Set([\"example\", \"invalid\", \"test\", \"localhost\"]);", replace: "const RESERVED_TLDS = new Set([\"example\", \"invalid\", \"test\", \"localhost\", \"com\"]);", needle: "personal email inside docs/reviews" },
  { name: "email local part never expanded", find: "while (s > 0 && i - s < 64 && isLocalChar(", replace: "while (s > 0 && i - s < 0 && isLocalChar(", needle: "personal email inside docs/reviews" },
  { name: "commit headers scanned", find: "  return msg;\n}", replace: "  return t;\n}", needle: "author's identity" },
  { name: "untracked files not listed", find: "\"--cached\", \"--others\", \"--exclude-standard\"", replace: "\"--cached\", \"--exclude-standard\"", needle: "untracked, unignored" },
  { name: "gitignored files listed", find: "\"--cached\", \"--others\", \"--exclude-standard\"", replace: "\"--cached\", \"--others\"", needle: "gitignored file" },
  { name: "index copy of a deleted file ignored", find: "      try { units.push({ where: n, text: asText(git(repo, [\"cat-file\", \"blob\", `:${n}`])), scope: \"tree\", kind: \"file\" }); } catch { /* not in index either */ }\n", replace: "", needle: "staged and then deleted" },
  // Shaped like a real regression: it checks the target exists before reading it,
  // so it does not crash on a dangling link and trip the wrong control.
  { name: "symlinks followed", find: "if (s.isSymbolicLink()) units.push({ where: `${n} (symlink target)`, text: readlinkSync(p), scope: \"tree\", kind: \"file\" });", replace: "if (s.isSymbolicLink()) { units.push({ where: `${n} (symlink target)`, text: readlinkSync(p), scope: \"tree\", kind: \"file\" }); if (existsSync(p)) units.push({ where: n, text: asText(readFileSync(p)), scope: \"tree\", kind: \"file\" }); }", needle: "does not follow a symlink" },
  { name: "binary files skipped", find: "else if (s.isFile()) units.push(", replace: "else if (s.isFile() && !readFileSync(p).includes(0)) units.push(", needle: "inside a binary file" },
  { name: "commit messages not scanned", find: "else if (o.type === \"commit\" || o.type === \"tag\") units.push(", replace: "else if (false) units.push(", needle: "in a commit message" },
  { name: "history paths not scanned", find: "  for (const p of paths) units.push(", replace: "  for (const p of [] as string[]) units.push(", needle: "tracked state.json by path" },
  { name: "state.json dropped from secret-file names", find: "(^|\\/)(state\\.json|", replace: "(^|\\/)(xstate\\.json|", needle: "a tracked file named state.json" },
  { name: "GitHub token pattern removed", find: "{ name: \"GitHub token\", re: /", replace: "{ name: \"GitHub token\", re: /(?!)/g ?? /", needle: "a GitHub token" },
  { name: "PEM pattern removed", find: "{ name: \"PEM private key\", re: /", replace: "{ name: \"PEM private key\", re: /(?!)/g ?? /", needle: "a PEM private key" },
  { name: "personal data in history fails by default", find: "d.findings.filter((f) => f.scope === \"tree\" || d.strictHistory || !PERSONAL.has(f.cls));", replace: "d.findings.filter(() => true);", needle: "does not fail by default" },
  { name: "an empty store does not refuse", find: "if (d.requireStore && d.store.secrets === 0) return", replace: "if (false && d.requireStore && d.store.secrets === 0) return", needle: "empty store" },
  { name: "base64 decoded and scanned (a LIMIT becomes caught)", find: "...seedHits(text), ...labelledHits(text),", replace: "...seedHits(text), ...seedHits(Buffer.from(text, \"base64\").toString(\"latin1\")), ...labelledHits(text),", needle: "limits/base64.txt" },
  { name: "the store counts duplicates", find: "    if (seen.has(seed)) return;\n", replace: "", needle: "loads exactly three secrets" },
  // ---- REVIEW-056 round one: one mutation that reverts each fix.
  { name: "replacement objects honoured", find: "const GIT_ENV: Record<string, string> = { GIT_NO_REPLACE_OBJECTS: \"1\" };", replace: "const GIT_ENV: Record<string, string> = {};", needle: "replacement object does not hide a seed from --rev" },
  { name: "--rev splits a path at every tab", find: "    return { mode, type, sha, path: l.slice(t + 1) };", replace: "    return { mode, type, sha, path: l.slice(t + 1).split(\"\\t\")[0] };", needle: "tab in a path does not hide its suffix from --rev" },
  { name: "history paths read without -z", find: "\"--no-renames\", \"-z\"]).split(\"\\0\")", replace: "\"--no-renames\"]).split(\"\\n\")", needle: "tab in a path does not hide its suffix from history" },
  { name: "transforming attributes not refused (tree)", find: "  if (bad.length) throw new Error(", replace: "  if (false) throw new Error(", needle: "content-transforming attribute REFUSES the tree" },
  { name: "transforming attributes not refused (--rev)", find: "const src = source ? [\"--source\", source] : [];", replace: "const src: string[] = [];", needle: "content-transforming attribute REFUSES --rev" },
  { name: "gitlinks not refused", find: "staged.filter((l) => l.startsWith(\"160000 \"))", replace: "staged.filter(() => false)", needle: "a gitlink REFUSES the tree" },
  { name: "nested repositories not refused", find: "  gitlinks.push(...names.filter((n) => n.endsWith(\"/\")));\n", replace: "", needle: "nested repository REFUSES" },
  { name: "shallow history not refused", find: "=== \"true\") throw new Error(\"the repository is shallow", replace: "=== \"never\") throw new Error(\"the repository is shallow", needle: "shallow clone REFUSES" },
  { name: "--rev counts unique blobs", find: "n + (u.paths ?? 1), 0)", replace: "n + 1, 0)", needle: "counts two paths with one blob" },
  { name: "a malformed store is skipped", find: "    try { json = JSON.parse(raw); } catch (e) {\n      throw new Error(", replace: "    try { json = JSON.parse(raw); } catch (e) { void e; continue;\n      throw new Error(", needle: "malformed store file REFUSES" },
  { name: "no previous-line label window", find: "    if (m) wins.push(m[1]);\n", replace: "", needle: "label is on the previous line" },
  { name: "no table after-window", find: "  if (/^\\s*\\|/.test(text.slice(lineStart, at))) wins.push(", replace: "  if (false) wins.push(", needle: "before its label in a table row" },
  { name: "an after-window on every line (the false-positive direction)", find: "  if (/^\\s*\\|/.test(text.slice(lineStart, at))) wins.push(", replace: "  if (true) wins.push(", needle: "nothing in the must-pass file" },
  { name: "only exactly 64 or 66 hex digits", find: "([0-9A-Fa-f]{48,66})", replace: "([0-9A-Fa-f]{64,66})", needle: "unpadded 63-digit" },
  { name: "the toy bound back at 2^64", find: "const TOY_SCALAR_BOUND = 1n << 32n;", replace: "const TOY_SCALAR_BOUND = 1n << 64n;", needle: "just above the toy bound" },
  { name: "scanning nothing is not refused", find: "  if (!d.tree && !d.history) return {", replace: "  if (false) return {", needle: "scanning nothing at all REFUSES" },
  // ---- REVIEW-056 round two: one mutation that reverts each fix.
  { name: "previous-line window stops at a blank line", find: "    while (prevStart > 0 && /^\\s*$/.test(text.slice(prevStart, e))) { e = prevStart - 1; prevStart = text.lastIndexOf(\"\\n\", e - 1) + 1; }\n", replace: "", needle: "past a blank line" },
  { name: "hex range back at 58 digits", find: "([0-9A-Fa-f]{48,66})", replace: "([0-9A-Fa-f]{58,66})", needle: "unpadded 57-digit" },
  { name: "AWS label back to the one spelling", find: "/\\b(?:aws[_ \\t-]?)?secret[_ \\t-]?access[_ \\t-]?key", replace: "/\\baws_?secret_?access_?key", needle: "SecretAccessKey label" },
  { name: "placeholder judged on the last 16 characters", find: "    const body = m[1];\n", replace: "    const body = m[0].slice(-16);\n", needle: "followed by sixteen repeated characters" },
  { name: "Google pattern back to a trailing \\b", find: "{35})(?![0-9A-Za-z_-])/g", replace: "{35})\\b/g", needle: "Google key ending in a hyphen" },
  { name: "alice generic again", find: "\"example\", \"shared\"]);", replace: "\"example\", \"shared\", \"alice\"]);", needle: "lower-case alice" },
  { name: "grafts not refused", find: "if (existsSync(join(repo, grafts)) || existsSync(grafts)) throw", replace: "if (false) throw", needle: "grafts file REFUSES" },
  // ---- REVIEW-056 round three: one mutation that reverts each fix.
  { name: "AWS label without spaces", find: "/\\b(?:aws[_ \\t-]?)?secret[_ \\t-]?access[_ \\t-]?key", replace: "/\\b(?:aws[_-]?)?secret[_-]?access[_-]?key", needle: "label with spaces" },
  { name: "known values searched with their leading zeros", find: ".map((n) => ({ ...n, value: n.value.replace(/^0+/, \"\") || n.value }))", replace: "", needle: "printed without its leading zeros" },
  {
    name: "a cited vector nobody cites is caught as stale",
    find: "export const CITED_VECTORS: { value: string; source: string }[] = [\n",
    replace: "export const CITED_VECTORS: { value: string; source: string }[] = [\n  { value: \"" + "ab".repeat(32) + "\", source: \"a planted stale entry\" },\n",
    needle: "a planted stale entry",
    args: ["--tree-only", "--no-local-store"],
  },
];

/**
 * ⚠ **One mutation per credential pattern** (`REVIEW-056` S1-1): only two of ten
 * had a probe, and deleting any other passed every control. The names are listed
 * here rather than read from the gate, so a pattern added there without a name
 * here is visible as a gap rather than silently covered.
 */
const CREDENTIAL_NAMES = ["PEM private key", "GitHub token", "GitHub fine-grained token", "Anthropic API key", "OpenAI API key", "AWS access key id", "AWS secret access key", "Slack token", "Google API key", "npm token", "GitLab token"];
for (const n of CREDENTIAL_NAMES) MUTATIONS.push({ name: `credential pattern removed: ${n}`, find: `{ name: "${n}", re: /`, replace: `{ name: "${n}", re: /(?!)/g ?? /`, needle: `credential: ${n}` });

/** Command lines the gate must REFUSE, with the verdict line (`REVIEW-056` S5-1, S5-2). */
const CLI_REFUSALS: string[][] = [
  ["--tree-only", "--history-only"],
  ["--history-only", "--rev", "HEAD"],
  ["--strict-histroy"],
  ["--rev"],
  ["--tree-only", "--strict-history"],
  ["--no-local-store", "--store", "/nonexistent"],
  ["--repo", "/nonexistent-break-no-secrets", "--no-local-store"],
];

interface Plant { name: string; files: Record<string, string>; store?: Record<string, string>; expect: "FAIL" | "PASS"; needle?: string }

function plants(): Plant[] {
  const tag = `zz-break-${process.pid}`;
  const sk = randomBytes(32).toString("hex");
  return [
    { name: "a real-entropy seed in an untracked file", files: { [`${tag}.txt`]: `seed: ${encodeSeed(randomBytes(16), "ed25519")}\n` }, expect: "FAIL", needle: `${tag}.txt` },
    { name: "an ElGamal secret under docs/reviews", files: { [`docs/reviews/${tag}.md`]: `{"sk": "${randomBytes(32).toString("hex")}"}\n` }, expect: "FAIL", needle: `docs/reviews/${tag}.md` },
    { name: "a stored secret, bare, against a synthetic store", files: { [`${tag}-known.txt`]: `${sk}\n` }, store: { "state.json": JSON.stringify({ x: { sk } }) }, expect: "FAIL", needle: `${tag}-known.txt` },
    { name: "this machine's home path in an evidence README", files: { [`docs/evidence/${tag}/README.md`]: `ran from ${homedir()}/x\n` }, expect: "FAIL", needle: `docs/evidence/${tag}/README.md` },
    { name: "a seed in a gitignored file still PASSES", files: { [`${tag}.log`]: `${encodeSeed(randomBytes(16), "secp256k1")}\n` }, expect: "PASS" },
  ];
}

function plantRun(p: Plant): Run {
  const written: string[] = [];
  let storeDir: string | undefined;
  try {
    for (const [rel, body] of Object.entries(p.files)) {
      const abs = join(ROOT, rel);
      if (existsSync(abs)) throw new Error(`refusing to overwrite ${rel}`);
      // Remove the shallowest directory this plant creates, or the file itself.
      let created = abs;
      for (let d = dirname(abs); d !== ROOT && !existsSync(d); d = dirname(d)) created = d;
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, body);
      written.push(created);
      cleanup.push(created);
    }
    const args = ["--tree-only"];
    if (p.store) {
      storeDir = mkdtempSync(join(tmpdir(), "break-no-secrets-store-"));
      cleanup.push(storeDir);
      for (const [n, b] of Object.entries(p.store)) writeFileSync(join(storeDir, n), b);
      args.push("--store", storeDir);
    }
    return run(GATE, args);
  } finally {
    for (const w of written) rmSync(w, { recursive: true, force: true });
    if (storeDir) rmSync(storeDir, { recursive: true, force: true });
  }
}

type Verdict = "TICK" | "NOT-CAUGHT" | "WRONG-CONTROL" | "CRASH" | "DID-NOT-APPLY";

function judgeMutation(m: Mutation): { v: Verdict; detail: string } {
  const body = mutate(m);
  if (body === null) return { v: "DID-NOT-APPLY", detail: `the edit matched ${SRC.split(m.find).length - 1} times, not once` };
  writeFileSync(MUTANT, body);
  const r = run(MUTANT, m.args ?? ["--controls-only"]);
  if (r.crash) return { v: "CRASH", detail: r.out.slice(-4).join(" | ") };
  if (r.verdict !== (m.expect ?? "CONTROL-FAILED") || r.exit !== 2) return { v: "NOT-CAUGHT", detail: `verdict=${r.verdict} exit=${r.exit}` };
  const lines = failureLines(r);
  if (!lines.some((l) => l.includes(m.needle))) return { v: "WRONG-CONTROL", detail: `failed, but not on '${m.needle}': ${lines.slice(0, 3).join(" | ")}` };
  return { v: "TICK", detail: lines.filter((l) => l.includes(m.needle))[0].trim() };
}

function judgePlant(p: Plant): { v: Verdict; detail: string } {
  const r = plantRun(p);
  if (r.crash) return { v: "CRASH", detail: r.out.slice(-4).join(" | ") };
  if (p.expect === "PASS") return r.exit === 0 && r.verdict === "PASS" ? { v: "TICK", detail: "PASS" } : { v: "NOT-CAUGHT", detail: `expected PASS, got verdict=${r.verdict} exit=${r.exit}` };
  if (r.verdict !== "FAIL" || r.exit !== 1) return { v: "NOT-CAUGHT", detail: `verdict=${r.verdict} exit=${r.exit}` };
  const lines = failureLines(r);
  if (!lines.some((l) => l.includes(p.needle!))) return { v: "WRONG-CONTROL", detail: `failed, but not naming '${p.needle}'` };
  return { v: "TICK", detail: lines.filter((l) => l.includes(p.needle!))[0].trim() };
}

function finish(ok: boolean, n: number, bad: number): never {
  console.log(`break-no-secrets-gate: verdict=${ok ? "PASS" : "FAIL"} probes=${n} failed=${bad}`);
  process.exit(ok ? 0 : 1);
}

if (import.meta.main) {
  const selfTest = process.argv.includes("--self-test");
  let n = 0, bad = 0;
  const report = (name: string, want: Verdict | "REJECTED", got: { v: Verdict; detail: string }) => {
    n++;
    const ok = want === "REJECTED" ? got.v !== "TICK" : got.v === want;
    if (!ok) bad++;
    console.log(`${ok ? "✓" : "✗"} ${name}: ${got.v}${want === "REJECTED" ? " (must be rejected)" : ""} — ${got.detail}`);
  };

  if (selfTest) {
    // Three probes that must be REJECTED and one that must tick, so a harness
    // that rejects everything cannot pass its own self-test.
    report("self-test: a no-op mutation must not count as caught", "REJECTED", judgeMutation({ name: "no-op", find: "const WINDOW = 40;", replace: "const WINDOW = 40; ", needle: "type annotation" }));
    report("self-test: a crash must be classified CRASH", "REJECTED", judgeMutation({ name: "crash", find: "const WINDOW = 40;", replace: "const WINDOW = ;", needle: "type annotation" }));
    report("self-test: the wrong control's failure must not count", "REJECTED", judgeMutation({ name: "wrong", find: "const WINDOW = 40;", replace: "const WINDOW = 4;", needle: "a GitHub token" }));
    report("self-test: a correct probe must tick", "TICK", judgeMutation(MUTATIONS.find((m) => m.name === "JSON-escaped home rule removed")!));
    finish(bad === 0, n, bad);
  }

  writeFileSync(MUTANT, SRC);
  const base = run(MUTANT, ["--controls-only"]);
  report("baseline: the unmutated copy passes its controls", "TICK", base.crash ? { v: "CRASH", detail: base.out.slice(-3).join(" | ") } : base.verdict === "CONTROLS-PASS" && base.exit === 0 ? { v: "TICK", detail: base.out.find((l) => l.startsWith("controls:")) ?? "" } : { v: "NOT-CAUGHT", detail: `verdict=${base.verdict}` });
  for (const m of MUTATIONS) report(`mutation: ${m.name}`, "TICK", judgeMutation(m));
  for (const args of CLI_REFUSALS) {
    const r = run(GATE, args);
    report(`cli: ${args.join(" ")} is refused`, "TICK", r.crash ? { v: "CRASH", detail: r.out.slice(-3).join(" | ") } : r.verdict === "REFUSED" && r.exit === 2 ? { v: "TICK", detail: r.out.find((l) => l.startsWith("REFUSED:")) ?? "" } : { v: "NOT-CAUGHT", detail: `verdict=${r.verdict} exit=${r.exit}` });
  }

  const treeBase = run(GATE, ["--tree-only"]);
  const clean = !treeBase.crash && treeBase.verdict === "PASS" && treeBase.exit === 0;
  report("baseline: the real tree passes before anything is planted", "TICK", clean ? { v: "TICK", detail: "PASS" } : { v: "NOT-CAUGHT", detail: `verdict=${treeBase.verdict} exit=${treeBase.exit}; tree plants cannot be judged against a failing baseline` });
  if (clean) for (const p of plants()) report(`plant: ${p.name}`, "TICK", judgePlant(p));
  else console.log("  (tree plants SKIPPED: a FAIL against a failing baseline proves nothing about the plant)");
  finish(bad === 0, n, bad);
}
