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
 * ⚠ **The environment is an allowlist.** The container receives only the
 * variables named below, plus two CANARIES: random values under the `VITE_` and
 * `WCONF_` prefixes. `REVIEW-058` M11 saw a `VITE_` variable inlined into the
 * bundle; if either canary's value appears anywhere in the output, the build
 * fails.
 *
 * ⚠ **It builds a COMMIT, never a working tree.** What the footer names is what
 * was built. `--worktree` exists for local trials only: it copies the working
 * tree, names `HEAD` in the footer, and marks the manifest `trial`, which
 * `deploy.ts` refuses.
 */

import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
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
function exportSource(repo: string, dest: string, worktree: boolean, commit?: string): string {
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

/** Inside the container. `set -eu`, and the store checks come before anything third-party runs. */
// ⚠ One command per line: `set -e` does not stop on a failure inside an `&&`
// list, and the first version ran the next step after Vite had failed.
const CONTAINER_SCRIPT = [
  "set -eu",
  'for p in /tmp/wconf "$HOME/.wconf"; do if [ -e "$p" ]; then echo "REFUSED: $p exists inside the build container" >&2; exit 3; fi; done',
  "bun install --frozen-lockfile",
  "mkdir -p web/hosted/.build",
  "bun run web/hosted/snapshot.ts web/hosted/.build/snapshot.json",
  "cd web/app",
  "bunx vite build --config vite.hosted.config.ts",
  "cd /src",
  "bun run web/hosted/vercel-output.ts web/app/dist/client web/hosted/.build",
].join("\n");

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
  if (existsSync(join(out, ".vercel"))) throw new Error(`${out}/.vercel exists; use a fresh --out for each build`);
  const repoTop = run(["git", "-C", a.repo, "rev-parse", "--show-toplevel"]).trim();
  if (out.startsWith(repoTop + "/")) throw new Error("--out must be outside the repository, so no build file lands in a tree that can be committed");

  const work = join(out, "work");
  const src = join(work, "src");
  const commit = exportSource(repoTop, src, a.worktree, a.commit);
  const canaries = { VITE_WCONF_CANARY: randomBytes(12).toString("hex"), WCONF_CANARY: randomBytes(12).toString("hex") };
  const env: Record<string, string> = {
    WCONF_ACCEPT_REMOTE_LEDGER_RISK: RISK_ACCEPTANCE_PHRASE,
    WCONF_HOSTED_COMMIT: commit,
    WCONF_HOSTED_CANONICAL_URL: a.canonicalUrl,
    ...canaries,
  };
  const IMAGE = image();
  const docker = [
    "docker", "--context", DOCKER_CONTEXT, "run", "--rm",
    "-v", `${src}:/src`, "-w", "/src",
    ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
    IMAGE, "sh", "-c", CONTAINER_SCRIPT,
  ];
  console.log(`building ${commit}${a.worktree ? " (TRIAL: working tree)" : ""} in ${IMAGE}`);
  const r = Bun.spawnSync(docker, { stdout: "pipe", stderr: "pipe" });
  writeFileSync(join(out, "container.log"), r.stdout.toString() + "\n--- stderr ---\n" + r.stderr.toString());
  if (r.exitCode !== 0) throw new Error(`the container build failed (${r.exitCode}); see ${join(out, "container.log")}`);

  cpSync(join(src, "web/hosted/.build/.vercel"), join(out, ".vercel"), { recursive: true });
  const snapshot = JSON.parse(readFileSync(join(src, "web/hosted/.build/snapshot.json"), "utf8"));

  // The canaries: neither value may appear anywhere in what is uploaded.
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
    canaries: "two random values, under VITE_ and WCONF_; neither appears in the output",
    isolation:
      `the container mounted only ${a.worktree ? "a copy of the working tree (TRIAL)" : "a git archive of the commit"}; ` +
      "it checked /tmp/wconf and ~/.wconf absent before installing; no deployment token was present",
  };
  writeFileSync(join(out, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  rmSync(work, { recursive: true, force: true });
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
export function selfTest(): string[] {
  const failed: string[] = [];
  const tag = image();
  // The image's own home directory, asked rather than assumed: its user is set
  // by the Dockerfile, and a hard-coded path would test the wrong directory.
  const home = run(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", tag, "sh", "-c", 'printf %s "$HOME"']).trim();
  if (!home.startsWith("/")) failed.push(`the image reported no home directory (${JSON.stringify(home)})`);
  for (const store of ["/tmp/wconf", `${home}/.wconf`]) {
    const r = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", "--tmpfs", store, tag, "sh", "-c", CONTAINER_SCRIPT], { stdout: "pipe", stderr: "pipe" });
    const err = r.stderr.toString();
    if (r.exitCode !== 3 || !err.includes(`REFUSED: ${store} exists`)) failed.push(`a decoy ${store} was not refused before install (exit ${r.exitCode}: ${err.trim().slice(0, 200)})`);
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
    const failed = selfTest();
    for (const f of failed) console.log(`  CONTROL FAILED: ${f}`);
    console.log(`build self-test: verdict=${failed.length ? "CONTROL-FAILED" : "PASS"} exit=${failed.length ? 2 : 0}`);
    process.exit(failed.length ? 2 : 0);
  }
  await build(process.argv.slice(2));
}
