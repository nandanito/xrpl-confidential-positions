/**
 * The third-party inventory: which tracked files reproduce upstream source or
 * specification text, from which project, under which licence.
 *
 * Decision request phase 1, D3 and item 5 step 1 (`REVIEW-057` R1-1). The
 * `NOTICE` is written from this tool's output, not from memory: the first
 * draft named one patch and one harness, and the records quoted a whole
 * BSD-3-Clause file nobody had counted.
 *
 * Method. Each upstream source is a CORPUS fetched at a stated version. A
 * tracked file reproduces a corpus where:
 *   - CODE: four or more substantive lines in a row (gaps of up to two
 *     non-substantive lines allowed) each appear verbatim, after trimming and
 *     collapsing whitespace, somewhere in that corpus; or
 *   - CODE, across lines: a run of 24-token windows appears in that corpus, so
 *     code joined onto one line or reflowed by a formatter is still found; or
 *   - PROSE (specification and documentation corpora only): a run of 12
 *     consecutive words appears in that corpus, so a quotation that was
 *     re-wrapped or inlined is still found.
 * Before either code pass, a tracked line loses a line-number prefix of the
 * kind `cat -n`, `nl` and `grep -n` print: the first version of this tool
 * matched lines exactly and missed every numbered quotation in the review
 * transcripts (`REVIEW-057` R2-5).
 * A substantive line has at least 20 characters after normalising and at
 * least one letter. The thresholds are a choice, printed in the output.
 *
 *   bun run tools/inventory-third-party.ts            # fetch, compare, write
 *   bun run tools/inventory-third-party.ts --check    # also fail if NOTICE omits a project found
 *
 * Needs network for the GitHub corpora; the crates come from the local cargo
 * registry and the npm packages from node_modules. Not part of `make ci`.
 */
import { spawnSync } from "bun";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const CACHE = process.env.WCONF_INVENTORY_CACHE ?? join(process.env.TMPDIR ?? "/tmp", "wconf-third-party-corpora");
const OUT = join(ROOT, "docs/third-party/INVENTORY.md");
const MIN_RUN = 4;
const MAX_GAP = 2;
const MIN_LINE = 20;
const SHINGLE = 12;
const TOKEN_WINDOW = 24;
const MIN_TOKEN_RUN = 12;

type Corpus = { name: string; version: string; licence: string; dir: string; prose: boolean };

function run(cmd: string[], cwd?: string): string {
  const r = spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed: ${r.stderr.toString().trim()}`);
  return r.stdout.toString();
}

/** A shallow fetch of one ref of a GitHub repository into the cache. */
function github(repo: string, ref: string): string {
  const dir = join(CACHE, `${repo.replace("/", "__")}@${ref}`);
  if (existsSync(join(dir, ".done"))) return dir;
  mkdirSync(dir, { recursive: true });
  run(["git", "init", "-q"], dir);
  run(["git", "fetch", "-q", "--depth", "1", `https://github.com/${repo}.git`, ref], dir);
  run(["git", "-c", "advice.detachedHead=false", "checkout", "-q", "FETCH_HEAD"], dir);
  writeFileSync(join(dir, ".done"), "");
  return dir;
}

/**
 * Only the files of a repository whose path matches, fetched one by one: the
 * dev portal is far too large to clone for the pages that concern this project.
 */
function pathsMatching(repo: string, ref: string, re: RegExp): Corpus {
  const dir = join(CACHE, `${repo.replace("/", "__")}@${ref}-${re.source}`);
  if (!existsSync(join(dir, ".done"))) {
    mkdirSync(dir, { recursive: true });
    const tree = JSON.parse(run(["gh", "api", `repos/${repo}/git/trees/${ref}?recursive=1`]));
    if (tree.truncated) throw new Error(`${repo} tree listing is truncated; the path filter would miss files`);
    for (const e of tree.tree) {
      if (e.type !== "blob" || !re.test(e.path) || !TEXT.test(e.path)) continue;
      const body = run(["gh", "api", `repos/${repo}/contents/${encodeURI(e.path)}?ref=${ref}`, "-H", "Accept: application/vnd.github.raw"]);
      const out = join(dir, e.path);
      mkdirSync(join(out, ".."), { recursive: true });
      writeFileSync(out, body);
    }
    writeFileSync(join(dir, ".done"), "");
  }
  // The root licence file, so the NOTICE check can compare LICENSES/ against it.
  if (!existsSync(join(dir, "LICENSE"))) {
    writeFileSync(join(dir, "LICENSE"), run(["gh", "api", `repos/${repo}/contents/LICENSE?ref=${ref}`, "-H", "Accept: application/vnd.github.raw"]));
  }
  return { name: repo, version: `${ref}, paths matching ${re}`, licence: githubLicence(repo), dir, prose: true };
}

/** Named files of a repository at a ref, fetched one by one, with its root LICENSE. */
function namedFiles(repo: string, ref: string, paths: string[], prose: boolean): Corpus {
  const dir = join(CACHE, `${repo.replace("/", "__")}@${ref}-named`);
  for (const path of [...paths, "LICENSE"]) {
    const out = join(dir, path);
    if (existsSync(out)) continue;
    mkdirSync(join(out, ".."), { recursive: true });
    writeFileSync(out, run(["gh", "api", `repos/${repo}/contents/${encodeURI(path)}?ref=${ref}`, "-H", "Accept: application/vnd.github.raw"]));
  }
  return { name: repo, version: `${ref}, ${paths.join(", ")}`, licence: githubLicence(repo), dir, prose };
}

function githubLicence(repo: string): string {
  const r = spawnSync(["gh", "api", `repos/${repo}/license`, "--jq", ".license.spdx_id"], { stdout: "pipe", stderr: "pipe" });
  return r.exitCode === 0 ? r.stdout.toString().trim() : "no licence file found";
}

function crates(): Corpus[] {
  const lock = readFileSync(join(ROOT, "signer/Cargo.lock"), "utf8");
  const registry = join(process.env.HOME ?? "", ".cargo/registry/src");
  const indexes = existsSync(registry) ? readdirSync(registry).map((d) => join(registry, d)) : [];
  const out: Corpus[] = [];
  for (const m of lock.matchAll(/\[\[package\]\]\nname = "([^"]+)"\nversion = "([^"]+)"\nsource = "registry/g)) {
    const [, name, version] = m;
    const dir = indexes.map((i) => join(i, `${name}-${version}`)).find((d) => existsSync(d));
    if (!dir) {
      out.push({ name: `crate ${name}`, version, licence: "NOT FOUND LOCALLY — not compared", dir: "", prose: false });
      continue;
    }
    const toml = readFileSync(join(dir, "Cargo.toml"), "utf8");
    const licence = toml.match(/^license\s*=\s*"([^"]+)"/m)?.[1] ?? "see crate";
    out.push({ name: `crate ${name}`, version, licence, dir, prose: false });
  }
  return out;
}

function npmPackages(): Corpus[] {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
  return names.map((name) => {
    const dir = join(ROOT, "node_modules", name);
    if (!existsSync(join(dir, "package.json"))) return { name: `npm ${name}`, version: "?", licence: "NOT INSTALLED — not compared", dir: "", prose: false };
    const p = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return { name: `npm ${name}`, version: p.version, licence: p.license ?? "see package", dir, prose: false };
  });
}

function corpora(): Corpus[] {
  const gh = (name: string, ref: string, prose = false): Corpus => ({
    name, version: ref, licence: githubLicence(name), dir: github(name, ref), prose,
  });
  return [
    gh("XRPLF/mpt-crypto", "85dbac73d033241b73f0565ae7cce86d07005c70"),
    gh("XRPLF/mpt-crypto", "main"),
    gh("XRPLF/rippled", "3.3.0"),
    gh("XRPLF/rippled", "develop"),
    gh("XRPLF/clio", "develop"),
    gh("XRPLF/XRPL-Standards", "master", true),
    // The last XLS-0096 revision before PR #604 set it Final; quotations of the
    // older wording come from here. Resolved with `gh api`, not typed.
    gh("XRPLF/XRPL-Standards", "9fbf7ef8eb69973f43d44836875e01e6364a3ecb", true),
    // GitHub reports NOASSERTION for the dev portal, because its LICENSE also lists
    // bundled libraries. The file grants MIT for the portal's original contents
    // (read 2026-10-18).
    { ...pathsMatching("XRPLF/xrpl-dev-portal", "master", /confidential/i), licence: "MIT, per its LICENSE (GitHub reports NOASSERTION)" },
    // The F-12 evidence logs quote Emscripten's changelog at 6.0.5, 6.0.6 and
    // 6.0.12 (`REVIEW-057` R3-7); it is cumulative, so the newest and the
    // oldest are enough. Emscripten is MIT and University of Illinois/NCSA.
    { ...namedFiles("emscripten-core/emscripten", "6.0.12", ["ChangeLog.md"], true), licence: "MIT and University of Illinois/NCSA, per its LICENSE" },
    { ...namedFiles("emscripten-core/emscripten", "6.0.5", ["ChangeLog.md"], true), licence: "MIT and University of Illinois/NCSA, per its LICENSE" },
    ...crates(),
    ...npmPackages(),
  ];
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ");
const substantive = (s: string) => s.length >= MIN_LINE && /[A-Za-z]/.test(s);
const TEXT = /\.(c|h|cc|cpp|hpp|ipp|rs|ts|tsx|js|mjs|cjs|jsx|md|txt|log|py|sh|toml|json|yml|yaml|cmake|in|patch|html|css)$|(^|\/)(CMakeLists\.txt|Makefile|LICENSE[^/]*)$/i;

function walk(dir: string, into: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, into);
    else if (e.isFile() && TEXT.test(p) && statSync(p).size < 2_000_000) into.push(p);
  }
  return into;
}

function words(s: string): string[] {
  return s.toLowerCase().replace(/[`*_>#|\[\]()]/g, " ").split(/\s+/).filter(Boolean);
}

/**
 * A line-number prefix, as `cat -n` and `nl` (`   12\t`), numbered viewers
 * (`12→`, `12|`), and `grep -n` with or without a file name (`src/x.c:12:`,
 * `12:`) print it. Stripping too much can only add matches, which is the safe
 * direction for a notice.
 */
const PREFIXES = [/^\s*\d+\t/, /^\s*\d+\s*[→│|]\s?/, /^[\w.\/+@-]*\.\w+[:-]\d+[:-]/, /^\d+[:-]/];
function stripPrefix(l: string): string {
  for (const re of PREFIXES) if (re.test(l)) return l.replace(re, "");
  return l;
}

/**
 * Identifiers and numbers only. Punctuation tokens made box-drawing lines and
 * operator-heavy idioms match across projects, and comment markers kept a
 * licence header in a source file from matching the same licence's file.
 */
function tokens(text: string): { tok: string[]; line: number[] } {
  const tok: string[] = [], line: number[] = [];
  text.split("\n").forEach((l, i) => {
    for (const m of l.matchAll(/[A-Za-z_][A-Za-z0-9_]*|\d\w*/g)) { tok.push(m[0]); line.push(i); }
  });
  return { tok, line };
}

/**
 * SHA-2's round constants and initial values, computed from their definition
 * (the fractional parts of the cube and square roots of the first primes), not
 * typed in. A table of them is a published fact every implementation shares:
 * `signer/build.rs` carries SHA-256's and was once attributed to two crates.
 */
const FACTS: Set<string> = (() => {
  const primes: bigint[] = [];
  for (let n = 2n; primes.length < 80; n++) if (primes.every((p) => n % p !== 0n)) primes.push(n);
  const root = (x: bigint, k: bigint) => { // floor(x^(1/k))
    let lo = 0n, hi = 1n;
    while (hi ** k <= x) hi *= 2n;
    while (lo < hi - 1n) { const mid = (lo + hi) / 2n; if (mid ** k <= x) lo = mid; else hi = mid; }
    return lo;
  };
  const out = new Set<string>();
  const add = (v: bigint, bits: number) => {
    const h = v.toString(16).padStart(bits / 4, "0");
    out.add(`0x${h}`); out.add(`0x${h.toUpperCase()}`);
  };
  for (const [count, k, bits] of [[64, 3n, 32], [8, 2n, 32], [80, 3n, 64], [8, 2n, 64]] as const) {
    for (const p of primes.slice(0, count)) add(root(p << (BigInt(bits) * k), k) & ((1n << BigInt(bits)) - 1n), bits);
  }
  return out;
})();

/**
 * A window worth hashing: at least 8 distinct tokens, and not mostly published
 * constants. The first rebuild required half the tokens to be names, which hid
 * every quotation dense with numbers — test vectors, KAT tables (R3-8).
 */
function windowValid(tok: string[], i: number): boolean {
  const w = tok.slice(i, i + TOKEN_WINDOW);
  if (new Set(w).size < 8) return false;
  return w.filter((x) => FACTS.has(x)).length * 5 < TOKEN_WINDOW * 4;
}
const MANIFEST = /(^|\/)(Cargo\.toml(\.orig)?|package\.json|[^/]*\.lock)$/;

/** A 53-bit hash of one token window, from two independent 32-bit hashes. */
function windowHash(tok: string[], i: number): number {
  const s = tok.slice(i, i + TOKEN_WINDOW).join(" ");
  return (Bun.hash.crc32(s) * 0x200000) + (Bun.hash.adler32(s) & 0x1fffff);
}

/** A project is a repository, crate or package, whatever its version. */
const project = (c: Corpus) => c.name;

// line -> the projects whose corpus contains it; and the lines of licence files.
const LINES = new Map<string, Set<string>>();
const LICENCE_LINES = new Set<string>();
const SHINGLES = new Map<string, Set<string>>();
const VERSIONS = new Map<string, Set<string>>();
// Token windows: the tracked files' hashes, and for each one found in a corpus
// the projects that hold it. Only tracked hashes are kept, so a corpus is
// streamed rather than stored.
const TRACKED_HASHES = new Set<number>();
const TOKEN_HITS = new Map<number, Set<string>>();
// Windows found in any project's licence file: never evidence of a quotation.
const LICENCE_WINDOWS = new Set<number>();
// Each project's root licence files, for the NOTICE check.
const LICENCE_FILES = new Map<string, Buffer[]>();

function index(c: Corpus): number {
  let n = 0;
  for (const f of walk(c.dir)) {
    const text = readFileSync(f, "utf8");
    const isLicence = /(^|\/)(LICEN[CS]E|COPYING|NOTICE)[^/]*$/i.test(f);
    for (const l of text.split("\n")) {
      const s = norm(l);
      if (!substantive(s)) continue;
      if (isLicence) LICENCE_LINES.add(s);
      let set = LINES.get(s);
      if (!set) LINES.set(s, (set = new Set()));
      set.add(project(c));
      n++;
    }
    if (isLicence && !relative(c.dir, f).includes("/")) {
      if (!LICENCE_FILES.has(project(c))) LICENCE_FILES.set(project(c), []);
      LICENCE_FILES.get(project(c))!.push(readFileSync(f));
    }
    // Licence texts are left to the line pass, which classifies them; minified
    // files carry no quotable structure and cost most of the time.
    // Minified files carry no quotable structure and cost most of the time;
    // manifests are dependency lists every crate shares, and are left to the
    // line pass.
    if (!/^.{2000,}$/m.test(text) && !MANIFEST.test(f)) {
      const { tok } = tokens(text);
      for (let i = 0; i + TOKEN_WINDOW <= tok.length; i++) {
        const h = windowHash(tok, i);
        if (!TRACKED_HASHES.has(h)) continue;
        if (isLicence) { LICENCE_WINDOWS.add(h); continue; }
        let set = TOKEN_HITS.get(h);
        if (!set) TOKEN_HITS.set(h, (set = new Set()));
        set.add(project(c));
      }
    }
    if (c.prose && /\.md$/i.test(f)) {
      const w = words(text);
      for (let i = 0; i + SHINGLE <= w.length; i++) {
        const k = w.slice(i, i + SHINGLE).join(" ");
        let set = SHINGLES.get(k);
        if (!set) SHINGLES.set(k, (set = new Set()));
        set.add(project(c));
      }
    }
  }
  let v = VERSIONS.get(project(c));
  if (!v) VERSIONS.set(project(c), (v = new Set()));
  v.add(c.version);
  return n;
}

type Run = { file: string; from: number; to: number; kind: "code" | "prose"; projects: string[]; lines: number };

// ⚠ A rule here once counted a line rippled and clio both hold for rippled only,
// on the ground that clio builds on rippled's library. `REVIEW-057` R3-9 planted
// a quotation of clio's own file and the rule reported rippled: dependence is no
// evidence of where a quotation was copied from. Shared lines are attributed to
// every project holding them, and NOTICE names both.
const GENERIC_PROJECTS = 3;
const LICENCE_SHARE = 0.8;

function tracked(): string[] {
  return run(["git", "ls-files"], ROOT).split("\n").filter((f) =>
    f && TEXT.test(f) && !/(^|\/)(bun\.lock|Cargo\.lock|package-lock\.json)$/.test(f)
    && f !== "LICENSE" && f !== "NOTICE" && !f.startsWith("LICENSES/")
    && !f.startsWith("docs/third-party/") && existsSync(join(ROOT, f)));
}

/**
 * Code runs: consecutive substantive lines, with gaps of up to MAX_GAP, each
 * found in at least one corpus. A run is attributed to every project holding
 * MIN_RUN or more of its lines; it is LICENCE TEXT when most of its lines come
 * from licence files, and SHARED BOILERPLATE when more than GENERIC_PROJECTS
 * projects hold it (Cargo's generated header is in every crate).
 */
function codeRuns(file: string, raw: string[]): { attributed: Run[]; licence: Run[]; generic: Run[] } {
  const isPatch = file.endsWith(".patch");
  const lines = raw.map((l) => norm(stripPrefix(isPatch && /^[ +-]/.test(l) && !/^(\+\+\+|---) /.test(l) ? l.slice(1) : l)));
  const out = { attributed: [] as Run[], licence: [] as Run[], generic: [] as Run[] };
  let run: number[] = [];
  let gap = 0;
  const close = () => {
    if (run.length >= MIN_RUN) {
      // Only SPECIFIC lines — held by GENERIC_PROJECTS projects or fewer —
      // count toward attribution. Counting every line let a few shared
      // attributes in a long quotation push the whole of it into boilerplate,
      // and under-attributing is the unsafe direction for a notice.
      // Licence lines never count toward attribution, so source quoted beside
      // a licence keeps its own; a run used to be written off as licence text
      // whole (`REVIEW-057` R3-8).
      const specific = new Map<string, number>();
      const any = new Set<string>();
      let lic = 0;
      for (const i of run) {
        const held = LINES.get(lines[i])!;
        for (const p of held) any.add(p);
        if (LICENCE_LINES.has(lines[i])) { lic++; continue; }
        if (held.size <= GENERIC_PROJECTS) for (const p of held) specific.set(p, (specific.get(p) ?? 0) + 1);
      }
      const projects = [...specific].filter(([, k]) => k >= MIN_RUN).map(([p]) => p).sort();
      const r: Run = { file, from: run[0] + 1, to: run[run.length - 1] + 1, kind: "code", projects: projects.length ? projects : [...any].sort(), lines: run.length };
      if (projects.length) out.attributed.push(r);
      else if (lic / run.length >= LICENCE_SHARE) out.licence.push(r);
      else if (any.size > GENERIC_PROJECTS) out.generic.push(r);
    }
    run = [];
    gap = 0;
  };
  lines.forEach((l, i) => {
    if (!substantive(l)) { if (run.length && ++gap > MAX_GAP) close(); return; }
    if (LINES.has(l)) { run.push(i); gap = 0; } else close();
  });
  close();
  return out;
}

/** Prose runs: lines carrying a SHINGLE-word run found in a prose corpus. */
function proseRuns(file: string, raw: string[]): Run[] {
  if (!file.endsWith(".md")) return [];
  const out: Run[] = [];
  raw.forEach((_, i) => {
    const w = words(raw.slice(i, i + 4).join(" "));
    const found = new Set<string>();
    for (let k = 0; k + SHINGLE <= w.length; k++) {
      const s = SHINGLES.get(w.slice(k, k + SHINGLE).join(" "));
      if (s) for (const p of s) found.add(p);
    }
    for (const p of found) {
      const prev = out.findLast((r) => r.projects[0] === p);
      if (prev && i + 1 <= prev.to + 1) { prev.to = i + 1; prev.lines++; }
      else out.push({ file, from: i + 1, to: i + 1, kind: "prose", projects: [p], lines: 1 });
    }
  });
  return out;
}

/**
 * Token runs: positions whose 24-token window is found in a corpus, with gaps
 * of up to MAX_GAP windows, attributed the same way as line runs: to each
 * project holding MIN_TOKEN_RUN or more SPECIFIC windows, held by
 * GENERIC_PROJECTS projects or fewer.
 */
function tokenRuns(file: string, tok: string[], line: number[]): { attributed: Run[]; generic: Run[] } {
  const out = { attributed: [] as Run[], generic: [] as Run[] };
  let run: number[] = [];
  let gap = 0;
  const close = () => {
    if (run.length >= MIN_TOKEN_RUN) {
      const specific = new Map<string, number>();
      const any = new Set<string>();
      for (const i of run) {
        const held = TOKEN_HITS.get(windowHash(tok, i))!;
        for (const p of held) any.add(p);
        if (held.size <= GENERIC_PROJECTS) for (const p of held) specific.set(p, (specific.get(p) ?? 0) + 1);
      }
      const projects = [...specific].filter(([, k]) => k >= MIN_TOKEN_RUN).map(([p]) => p).sort();
      const last = run[run.length - 1] + TOKEN_WINDOW - 1;
      const r: Run = { file, from: line[run[0]] + 1, to: line[Math.min(last, line.length - 1)] + 1, kind: "code", projects: projects.length ? projects : [...any].sort(), lines: run.length };
      if (projects.length) out.attributed.push(r);
      else if (any.size > GENERIC_PROJECTS) out.generic.push(r);
    }
    run = [];
    gap = 0;
  };
  for (let i = 0; i + TOKEN_WINDOW <= tok.length; i++) {
    const h = windowValid(tok, i) ? windowHash(tok, i) : -1;
    if (h >= 0 && TOKEN_HITS.has(h) && !LICENCE_WINDOWS.has(h)) { run.push(i); gap = 0; }
    else if (run.length && ++gap > MAX_GAP) close();
  }
  close();
  return out;
}

const all = corpora();
const notCompared = all.filter((c) => !c.dir);

// The tracked side first, so a corpus can be streamed against its hashes.
const TRACKED = tracked().map((f) => {
  const raw = readFileSync(join(ROOT, f), "utf8").split("\n");
  const isPatch = f.endsWith(".patch");
  const stripped = raw.map((l) => stripPrefix(isPatch && /^[ +-]/.test(l) && !/^(\+\+\+|---) /.test(l) ? l.slice(1) : l));
  const { tok, line } = tokens(stripped.join("\n"));
  for (let i = 0; i + TOKEN_WINDOW <= tok.length; i++) if (windowValid(tok, i)) TRACKED_HASHES.add(windowHash(tok, i));
  return { f, raw, stripped, tok, line };
});

for (const c of all) {
  if (!c.dir) continue;
  console.error(`${c.name}@${c.version}: ${index(c)} substantive lines`);
}
const LICENCE_OF = new Map(all.filter((c) => c.dir).map((c) => [project(c), c.licence]));

// A run found by both passes is reported once per pass; the table merges them.
const attributed: Run[] = [], licenceRuns: Run[] = [], genericRuns: Run[] = [];
for (const { f, raw, stripped, tok, line } of TRACKED) {
  const r = codeRuns(f, raw);
  const k = tokenRuns(f, tok, line);
  attributed.push(...r.attributed, ...k.attributed, ...proseRuns(f, stripped));
  licenceRuns.push(...r.licence);
  genericRuns.push(...r.generic, ...k.generic);
}

/**
 * Hits reviewed by hand and judged not a quotation of the project they name. A
 * matcher finds shared text; it cannot tell which project a shared line came
 * from (`REVIEW-057` R2-5). Each entry is one project, one file and one range,
 * with its reason, and an entry that no longer matches a hit FAILS the check,
 * so a stale allowance cannot outlive what it was written for.
 */
// Empty. Its one entry, a rippled include block attributed to clio, became a
// rule after a second instance, and the rule was then removed (R3-9).
const SET_ASIDE: { project: string; file: string; from: number; to: number; reason: string }[] = [];
const setAside: { entry: (typeof SET_ASIDE)[number]; run: Run }[] = [];
const usedAside = new Set<number>();
for (const r of attributed) {
  r.projects = r.projects.filter((p) => {
    const k = SET_ASIDE.findIndex((e) => e.project === p && e.file === r.file && r.from <= e.to && r.to >= e.from);
    if (k < 0) return true;
    usedAside.add(k);
    setAside.push({ entry: SET_ASIDE[k], run: r });
    return false;
  });
}
const staleAside = SET_ASIDE.filter((_, k) => !usedAside.has(k));

const byProject = new Map<string, Run[]>();
for (const r of attributed.filter((x) => x.projects.length)) for (const p of r.projects) {
  if (!byProject.has(p)) byProject.set(p, []);
  byProject.get(p)!.push(r);
}
const range = (r: { from: number; to: number }) => (r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`);
/** Overlapping and adjacent ranges merged, because two passes can find one quotation. */
function merged(rs: Run[]): string {
  const sorted = rs.map((r) => ({ from: r.from, to: r.to })).sort((a, b) => a.from - b.from);
  const out: { from: number; to: number }[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.from <= last.to + 1) last.to = Math.max(last.to, r.to); else out.push({ ...r });
  }
  return out.map(range).join(", ");
}
const table = (runs: Run[], withProjects: boolean) => {
  const byFile = new Map<string, Run[]>();
  for (const r of runs) { if (!byFile.has(r.file)) byFile.set(r.file, []); byFile.get(r.file)!.push(r); }
  let s = withProjects ? "| file | lines | shared by |\n|---|---|---|\n" : "| file | kind | lines |\n|---|---|---|\n";
  for (const [f, rs] of byFile) {
    s += withProjects
      ? `| \`${f}\` | ${merged(rs)} | ${[...new Set(rs.flatMap((r) => r.projects))].length} projects |\n`
      : `| \`${f}\` | ${[...new Set(rs.map((r) => r.kind))].join(", ")} | ${merged(rs)} |\n`;
  }
  return s;
};

let md = `# Third-party inventory

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with \`bun run tools/inventory-third-party.ts\`.

Which tracked files reproduce upstream source or specification text. \`NOTICE\` is
written from this file. Method: code is **${MIN_RUN} or more substantive lines in a row**,
with gaps of up to ${MAX_GAP}, each verbatim in a corpus after collapsing whitespace, and
is attributed to every project holding ${MIN_RUN} or more of the run's lines; prose is
**a run of ${SHINGLE} consecutive words**, searched in the specification and documentation
corpora only. A substantive line has ${MIN_LINE} or more characters and a letter. A run
is **licence text** when ${LICENCE_SHARE * 100}% of its lines come from licence files, and
**shared boilerplate** when more than ${GENERIC_PROJECTS} projects hold it; neither is
attributed, and only lines held by ${GENERIC_PROJECTS} projects or fewer count toward
attribution. ⚠ **What this cannot see**: a quotation shorter than those thresholds, a
paraphrase, and a source that is not a corpus below. Sources the records are known to
cite and that are **not** corpora: the Trail of Bits report and the Dore and Cenk papers,
which are PDFs under \`docs/references/\` and not in version control;
\`bitcoin-core/secp256k1\`; and web pages quoted a sentence at a time, such as GitHub's
documentation; diff-prefixed (\`+\`/\`-\`) quotations inside Markdown, outside a
\`.patch\` file; and a reflowed manifest (\`Cargo.toml\`, \`package.json\`), which the
identifier pass leaves out because every package's dependency list looks alike, so
only the line pass sees a manifest, and only unreflowed.

**What is compared.** On the tracked side, every file \`git ls-files\` lists with a text
extension (${TRACKED.length} files), except lockfiles, \`LICENSE\`, \`NOTICE\`, \`LICENSES/\`
and this directory; lines lose a line-number prefix first. On the upstream side, ${all.length}
corpora are configured in ${VERSIONS.size + new Set(notCompared.map((c) => c.name)).size} projects:
**${all.length - notCompared.length} were compared and ${notCompared.length} were unavailable**, listed
at the end. A corpus's files over 2 MB, and minified files, are not tokenised.

**${byProject.size} projects reproduced.**

`;
for (const [p, runs] of [...byProject].sort()) {
  md += `## ${p} — ${LICENCE_OF.get(p)}\n\nCompared at ${[...VERSIONS.get(p)!].map((v) => `\`${v}\``).join(", ")}.\n\n${table(runs, false)}\n`;
}
md += `## Reviewed and set aside\n\n${setAside.length ? setAside.map(({ entry, run }) => `- ${entry.project} in \`${entry.file}\` ${range(run)}: ${entry.reason}`).join("\n") + "\n" : "None.\n"}\n`;
md += `## Licence text, not attributed\n\n${licenceRuns.length ? table(licenceRuns, true) : "None.\n"}\n`;
md += `## Shared boilerplate, not attributed\n\n${genericRuns.length ? table(genericRuns, true) : "None.\n"}\n`;
if (notCompared.length) {
  md += `## Not compared\n\n${notCompared.map((c) => `- ${c.name} \`${c.version}\`: ${c.licence}`).join("\n")}\n`;
}
mkdirSync(join(ROOT, "docs/third-party"), { recursive: true });
writeFileSync(OUT, md);
console.log(`wrote ${relative(ROOT, OUT)} — ${byProject.size} projects reproduced, ${licenceRuns.length} licence-text and ${genericRuns.length} boilerplate runs set aside`);
const found = [...byProject.keys()];

/**
 * The NOTICE check, as a manifest rather than a name search (`REVIEW-057`
 * R2-6, where a NOTICE of six bare names and a deleted licence file passed).
 * For every project found: NOTICE must name it in a bullet; a project with a
 * licence must name a LICENSES/ file in that bullet, and the file must exist
 * and be byte-identical to one of the project's own root licence files; a
 * project with none must be stated as carrying no licence.
 */
function noticeProblems(): string[] {
  const path = join(ROOT, "NOTICE");
  if (!existsSync(path)) return ["NOTICE does not exist"];
  const notice = readFileSync(path, "utf8");
  const problems: string[] = staleAside.map((e) => `set-aside entry for ${e.project} in ${e.file} ${e.from}–${e.to} matches no hit; delete it`);
  for (const p of found) {
    const name = p.replace(/^(crate|npm) /, "");
    // The entry is the bullet or section that STARTS with the name: the first
    // mention anywhere could be inside another project's entry, and the check
    // would then read the wrong one.
    const esc = name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    const m = new RegExp(`^[ \\t]*(?:-|\\d+\\.)[ \\t]+${esc}\\b`, "m").exec(notice);
    if (!m) { problems.push(`NOTICE has no entry that starts with ${name}`); continue; }
    const at = m.index + m[0].length - name.length;
    const start = notice.lastIndexOf("\n", at) + 1;
    const next = notice.slice(at).search(/\n\s*(-|\d+\.) |\n\n/);
    const entry = notice.slice(start, next < 0 ? undefined : at + next);
    const lic = LICENCE_OF.get(p) ?? "";
    if (/no licence/i.test(lic)) {
      if (!/no licence/i.test(entry)) problems.push(`NOTICE's entry for ${name} does not say it carries no licence`);
      continue;
    }
    const file = entry.match(/LICENSES\/[\w.-]+/)?.[0];
    if (!file) { problems.push(`NOTICE's entry for ${name} names no LICENSES/ file`); continue; }
    // From git's index, as a regular file: a symlink to node_modules passed when
    // this read the disk, and published nothing at that path (R3-10).
    const staged = run(["git", "ls-files", "-s", "--", file], ROOT).trim();
    if (!staged) { problems.push(`${file}, named for ${name}, is not tracked`); continue; }
    if (!staged.startsWith("100644 ")) { problems.push(`${file}, named for ${name}, is not a regular file in git (mode ${staged.split(" ")[0]})`); continue; }
    const ours = Buffer.from(spawnSync(["git", "cat-file", "blob", `:${file}`], { cwd: ROOT, stdout: "pipe" }).stdout);
    if (!(LICENCE_FILES.get(p) ?? []).some((b) => b.equals(ours))) {
      problems.push(`${file} is not byte-identical to any root licence file of ${name}`);
    }
  }
  return problems;
}

if (process.argv.includes("--check")) {
  const problems = noticeProblems();
  if (problems.length) {
    for (const x of problems) console.log(`check: ${x}`);
    console.log(`check: FAIL — ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(`check: PASS — every one of ${found.length} projects found has a NOTICE entry, and each licensed one a verbatim LICENSES/ file`);
}
