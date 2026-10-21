/**
 * The hosted demo's isolated build: `ADR-0004` D-H1 (H3), with the owner's two
 * sub-choices, ruled 2026-10-19 (`CLAIMS.md` E-331): an indefinite snapshot
 * rebuilt by hand, and an ISOLATED build machine.
 *
 *   bun run web/hosted/build.ts --repo <git repo> --commit <sha> \
 *     --canonical-url https://<name>.vercel.app --out <dir outside any repo>
 *
 * # What isolation means here
 *
 * Installing dependencies and building run third-party code with the build
 * user's file access (`ADR-0004`, the build machine). This script therefore
 * runs both inside a container that sees ONE directory: a `git archive` of the
 * named commit. Neither private store (`~/.wconf`, `/tmp/wconf`) is mounted, the
 * container checks that neither exists before it installs anything, and no
 * deployment token exists anywhere in it: D-H4's token comes in for the upload
 * only, after this script and the gate have finished.
 *
 * ⚠ **What it is isolated FROM is files, and the network only in part.**
 * Measured 2026-10-20 (`REVIEW-059` S-2): an OrbStack container with network
 * reaches a service bound to the build machine's `127.0.0.1` through
 * `host.docker.internal`. So the work runs in TWO containers. The first
 * installs and takes the snapshot, which need the network; the second runs
 * Vite and the assembler with `--network none`, so the third-party code in the
 * build proper reaches nothing. ⚠ Code that runs during install or the snapshot
 * still has the network and can reach the build machine's loopback services.
 *
 * ⚠ **The environment is an allowlist.** The container receives only the
 * variables named below, plus two CANARIES: random values under the `VITE_` and
 * `WCONF_` prefixes. `REVIEW-058` M11 saw a `VITE_` variable inlined into the
 * bundle; if either canary's value appears VERBATIM anywhere in the output, the
 * build fails. ⚠ That is all it proves: an encoded copy, or a variable sent
 * over the network during install, is not seen (`REVIEW-059` R1-11).
 *
 * ⚠ **It builds a COMMIT, never a working tree.** What the footer names is what
 * was built. `--worktree` exists for local trials only: it copies the working
 * tree, names `HEAD` in the footer, and marks the manifest `trial`, which
 * `deploy-preflight.ts` refuses.
 *
 * ⚠ **And the tree it builds is checked against the commit, file for file.**
 * `REVIEW-059` R1-10, measured with a real build: a file left in a reused
 * `--out` survived the extraction and reached the output of a build whose
 * footer named a commit that does not contain it. So `--out` must be new or
 * empty, the workspace is removed even when a build fails, and the exported
 * tree must list exactly the commit's files before any container runs. ⚠ It
 * does not see dependency code changing `/src` DURING the build.
 */

import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { RISK_ACCEPTANCE_PHRASE } from "../../facility/src/loopback.ts";

/**
 * The build image: `web/hosted/Dockerfile`, whose two bases are pinned by
 * digest. Tagged by the Dockerfile's own hash, so an edit makes a new image.
 */
const DOCKERFILE = join(import.meta.dir, "Dockerfile");
export const DOCKER_CONTEXT = process.env.WCONF_DOCKER_CONTEXT ?? "orbstack";

function run(cmd: string[], opts: { cwd?: string; stdin?: Uint8Array } = {}): string {
  const r = Bun.spawnSync(cmd, { cwd: opts.cwd, stdin: opts.stdin, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`${cmd.slice(0, 4).join(" ")} … failed (${r.exitCode}):\n${r.stderr.toString().slice(-2000)}`);
  return r.stdout.toString();
}

function args(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const a = { repo: get("--repo"), commit: get("--commit"), canonicalUrl: get("--canonical-url"), out: get("--out"), worktree: argv.includes("--worktree") };
  if (!a.repo || !a.out || !a.canonicalUrl) throw new Error("usage: --repo <git repo> (--commit <sha> | --worktree) --canonical-url <https origin> --out <dir>");
  if (!a.worktree && !a.commit) throw new Error("--commit is required: the build is of a commit, not a working tree");
  return a as { repo: string; commit?: string; canonicalUrl: string; out: string; worktree: boolean };
}

/** The source tree, exported into `dest`: a commit's archive, or a trial's working tree. */
export function exportSource(repo: string, dest: string, worktree: boolean, commit?: string): string {
  mkdirSync(dest, { recursive: true });
  if (worktree) {
    const files = run(["git", "-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean);
    for (const f of files) if (existsSync(join(repo, f))) cpSync(join(repo, f), join(dest, f), { recursive: false, dereference: false });
    return run(["git", "-C", repo, "rev-parse", "HEAD"]).trim();
  }
  const full = run(["git", "-C", repo, "rev-parse", "--verify", `${commit}^{commit}`]).trim();
  const tar = Bun.spawnSync(["git", "-C", repo, "archive", "--format=tar", full], { stdout: "pipe", stderr: "pipe" });
  if (tar.exitCode !== 0) throw new Error(`git archive failed: ${tar.stderr.toString()}`);
  run(["tar", "-x", "-C", dest], { stdin: tar.stdout });
  return full;
}

/** Every file and link under `dir`, relative to it, in `git ls-tree` form. */
export function listTree(dir: string): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const name of readdirSync(join(dir, rel))) {
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(join(dir, r));
      if (st.isDirectory() && !st.isSymbolicLink()) walk(r);
      else out.push(r);
    }
  };
  walk("");
  return out.sort();
}

/**
 * The exported tree, against the commit's own file list. Any extra or missing
 * path is refused before a container runs (`REVIEW-059` R1-10).
 */
export function checkExportedTree(src: string, committed: string[]): string[] {
  const have = new Set(listTree(src)), want = new Set(committed);
  const extra = [...have].filter((p) => !want.has(p)), missing = [...want].filter((p) => !have.has(p));
  return [...extra.map((p) => `${p} is in the build tree and not in the commit`), ...missing.map((p) => `${p} is in the commit and not in the build tree`)];
}

/**
 * Where a build may write: a new or empty directory outside the repository it
 * builds. ⚠ It refused only an existing `.vercel` before, so a failed build's
 * workspace could be reused, and `out === repoTop` passed the prefix test.
 */
export function outProblems(out: string, repoTop: string): string[] {
  const real = (p: string) => { let q = p; while (!existsSync(q)) q = dirname(q); return join(realpathSync(q), p.slice(q.length)); };
  const o = real(out), top = realpathSync(repoTop);
  const problems: string[] = [];
  if (o === top || o.startsWith(top + "/")) problems.push("--out must be outside the repository, so no build file lands in a tree that can be committed");
  if (existsSync(out) && readdirSync(out).length) problems.push(`${out} is not empty; use a new directory for each build, because a reused one can carry files into the output`);
  return problems;
}

/** Inside the containers. `set -eu`, and the store checks come before anything third-party runs. */
// ⚠ One command per line: `set -e` does not stop on a failure inside an `&&`
// list, and the first version ran the next step after Vite had failed.
const STORE_CHECK = 'for p in /tmp/wconf "$HOME/.wconf"; do if [ -e "$p" ]; then echo "REFUSED: $p exists inside the build container" >&2; exit 3; fi; done';
const CONTAINER_SCRIPT = [
  "set -eu",
  STORE_CHECK,
  "bun install --frozen-lockfile",
  "mkdir -p web/hosted/.build",
  "bun run web/hosted/snapshot.ts web/hosted/.build/snapshot.json",
].join("\n");
/** The second container: no network at all. */
const OFFLINE_SCRIPT = [
  "set -eu",
  STORE_CHECK,
  "cd web/app",
  "bunx vite build --config vite.hosted.config.ts",
  "cd /src",
  "bun run web/hosted/vercel-output.ts web/app/dist/client web/hosted/.build",
].join("\n");
export const OFFLINE_ARGS = ["--network", "none"];

/** Build (or reuse) the image named by the Dockerfile's hash. */
function image(): string {
  const tag = `wconf-hosted-build:${createHash("sha256").update(readFileSync(DOCKERFILE)).digest("hex").slice(0, 16)}`;
  const have = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "image", "inspect", tag], { stdout: "ignore", stderr: "ignore" });
  if (have.exitCode !== 0) run(["docker", "--context", DOCKER_CONTEXT, "build", "-q", "-t", tag, "-f", DOCKERFILE, import.meta.dir]);
  return tag;
}

export async function build(argv: string[]) {
  const a = args(argv);
  const out = resolve(a.out);
  if (!isAbsolute(out)) throw new Error("--out must resolve to an absolute path");
  const repoTop = run(["git", "-C", a.repo, "rev-parse", "--show-toplevel"]).trim();
  const refused = outProblems(out, repoTop);
  if (refused.length) throw new Error(refused.join("; "));

  const work = join(out, "work");
  try {
    await buildInto(a, out, work, repoTop);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

async function buildInto(a: ReturnType<typeof args>, out: string, work: string, repoTop: string) {
  const src = join(work, "src");
  const commit = exportSource(repoTop, src, a.worktree, a.commit);
  if (!a.worktree) {
    const committed = run(["git", "-C", repoTop, "ls-tree", "-r", "-z", "--name-only", commit]).split("\0").filter(Boolean);
    const drift = checkExportedTree(src, committed);
    if (drift.length) throw new Error(`the build tree is not the commit's: ${drift.slice(0, 5).join("; ")}${drift.length > 5 ? ` (and ${drift.length - 5} more)` : ""}`);
  }
  const canaries = { VITE_WCONF_CANARY: randomBytes(12).toString("hex"), WCONF_CANARY: randomBytes(12).toString("hex") };
  const env: Record<string, string> = {
    WCONF_ACCEPT_REMOTE_LEDGER_RISK: RISK_ACCEPTANCE_PHRASE,
    WCONF_HOSTED_COMMIT: commit,
    WCONF_HOSTED_CANONICAL_URL: a.canonicalUrl,
    ...canaries,
  };
  const IMAGE = image();
  const docker = (extra: string[], script: string) => [
    "docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...extra,
    "-v", `${src}:/src`, "-w", "/src",
    ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
    IMAGE, "sh", "-c", script,
  ];
  console.log(`building ${commit}${a.worktree ? " (TRIAL: working tree)" : ""} in ${IMAGE}`);
  let log = "";
  for (const [label, extra, script] of [["install and snapshot, with network", [], CONTAINER_SCRIPT], ["build and assemble, --network none", OFFLINE_ARGS, OFFLINE_SCRIPT]] as const) {
    const r = Bun.spawnSync(docker([...extra], script), { stdout: "pipe", stderr: "pipe" });
    log += `=== ${label}\n${r.stdout.toString()}\n--- stderr ---\n${r.stderr.toString()}\n`;
    writeFileSync(join(out, "container.log"), log);
    if (r.exitCode !== 0) throw new Error(`the container step "${label}" failed (${r.exitCode}); see ${join(out, "container.log")}`);
  }

  cpSync(join(src, "web/hosted/.build/.vercel"), join(out, ".vercel"), { recursive: true });
  const snapshot = JSON.parse(readFileSync(join(src, "web/hosted/.build/snapshot.json"), "utf8"));

  // The canaries: neither value may appear verbatim anywhere in what is uploaded.
  const leaked = leakedCanaries(join(out, ".vercel"), Object.values(canaries));
  if (leaked.length) throw new Error(`a build variable reached the output (REVIEW-058 M11): ${leaked.join(", ")}`);

  const manifest = {
    trial: a.worktree,
    commit,
    image: IMAGE,
    dockerfileSha256: createHash("sha256").update(readFileSync(DOCKERFILE)).digest("hex"),
    dockerContext: DOCKER_CONTEXT,
    builtAt: new Date().toISOString(),
    snapshot: { ledgerIndex: snapshot.source.ledgerIndex, readAt: snapshot.readAt, endpoint: snapshot.source.endpoint, canonicalUrl: snapshot.canonicalUrl },
    environment: Object.keys(env).sort(),
    canaries: "two random values, under VITE_ and WCONF_; neither appears verbatim in the output",
    isolation:
      `the containers mounted only ${a.worktree ? "a copy of the working tree (TRIAL)" : "a git archive of the commit, checked file for file against the commit before they ran"}; ` +
      "each checked /tmp/wconf and ~/.wconf absent before running anything else; install and the snapshot had network, " +
      "and could reach the build machine's loopback; the Vite build and the assembler ran with --network none; no deployment token was present",
  };
  writeFileSync(join(out, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`built ${join(out, ".vercel/output")} from ${commit} at ledger ${snapshot.source.ledgerIndex}; manifest at ${join(out, "build-manifest.json")}`);
  console.log(`next: bun run tools/check-web-readonly.ts --hosted ${out} --commit ${commit}`);
}

/** Every file under `dir` holding any of `values`. `grep` exits 1 for none, 2 for an error. */
export function leakedCanaries(dir: string, values: string[]): string[] {
  const r = Bun.spawnSync(["grep", "-rlF", ...values.flatMap((v) => ["-e", v]), dir], { stdout: "pipe", stderr: "pipe" });
  if (r.exitCode === 2) throw new Error(`grep failed: ${r.stderr.toString()}`);
  return r.exitCode === 0 ? r.stdout.toString().trim().split("\n") : [];
}

/**
 * The build's own controls, through the same container script and the same
 * leak check the build runs. Needs Docker; reads no ledger.
 */
export async function selfTest(): Promise<string[]> {
  const failed: string[] = [];
  const tag = image();
  // The image's own home directory, asked rather than assumed: its user is set
  // by the Dockerfile, and a hard-coded path would test the wrong directory.
  const home = run(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", tag, "sh", "-c", 'printf %s "$HOME"']).trim();
  if (!home.startsWith("/")) failed.push(`the image reported no home directory (${JSON.stringify(home)})`);
  for (const store of ["/tmp/wconf", `${home}/.wconf`]) {
    for (const [label, extra, script] of [["install", [], CONTAINER_SCRIPT], ["offline build", OFFLINE_ARGS, OFFLINE_SCRIPT]] as const) {
      const r = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...extra, "--tmpfs", store, tag, "sh", "-c", script], { stdout: "pipe", stderr: "pipe" });
      const err = r.stderr.toString();
      if (r.exitCode !== 3 || !err.includes(`REFUSED: ${store} exists`)) failed.push(`a decoy ${store} was not refused before the ${label} step (exit ${r.exitCode}: ${err.trim().slice(0, 200)})`);
    }
  }
  // The offline step's network, through the same arguments the build passes:
  // a fetch to the ledger and one to a listener on the build machine's
  // loopback must both fail. ⚠ The loopback half first aimed at a port where
  // nothing listened, so it was unreachable WITH network too and tested
  // nothing; found by running this with the offline arguments removed. ⚠ And
  // the container is spawned ASYNCHRONOUSLY: a synchronous spawn blocks this
  // process, so its own listener could not answer and every probe timed out.
  const listener = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("listening") });
  try {
    for (const url of ["https://s.devnet.rippletest.net:51234/", `http://host.docker.internal:${listener.port}/`]) {
      const proc = Bun.spawn(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...OFFLINE_ARGS, tag, "bun", "-e",
        `try { await fetch(${JSON.stringify(url)}, { signal: AbortSignal.timeout(5000) }); console.log("REACHED") } catch { console.log("UNREACHABLE") }`], { stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
      if (!stdout.includes("UNREACHABLE")) failed.push(`the offline step reached ${url} (${stdout.trim()} ${stderr.trim().slice(0, 120)})`);
    }
  } finally {
    listener.stop(true);
  }
  const d = mkdtempSync(join(tmpdir(), "wconf-build-self-test-"));
  try {
    const canary = randomBytes(12).toString("hex");
    mkdirSync(join(d, "static", "assets"), { recursive: true });
    writeFileSync(join(d, "static", "assets", "app.js"), `const p = "${canary}";`);
    if (leakedCanaries(d, [canary]).length !== 1) failed.push("a canary planted in an asset was not found");
    if (leakedCanaries(d, [randomBytes(12).toString("hex")]).length !== 0) failed.push("a canary that is absent was reported");
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
  return failed;
}

if (import.meta.main) {
  if (process.argv.includes("--self-test")) {
    const failed = await selfTest();
    for (const f of failed) console.log(`  CONTROL FAILED: ${f}`);
    console.log(`build self-test: verdict=${failed.length ? "CONTROL-FAILED" : "PASS"} exit=${failed.length ? 2 : 0}`);
    process.exit(failed.length ? 2 : 0);
  }
  await build(process.argv.slice(2));
}
