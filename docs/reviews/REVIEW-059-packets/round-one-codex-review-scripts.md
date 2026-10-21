# Leg A's review scripts, copied from its workspace after it returned

## browser-cases.ts

````
import {cpSync,readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';
import {readOutput,runChecks,verdictFile} from '../tools/check-web-hosted.ts';import {preflight} from '../web/hosted/deploy-preflight.ts';
const commit='ccf76e73bf6629b29dece98cc15a050e3f60cad4';
for(const [name,tail]of [
 ['browser-console-error','console.error("REVIEW059_ERROR_CONTROL");'],
 ['browser-navigation-exception',`document.addEventListener('click',e=>{if(e.target.closest('a[href="/observer"]'))setTimeout(()=>{throw Error('REVIEW059_NAV_ERROR')},0)});`]
]){
const d=join(process.cwd(),'review-work',name);cpSync('review-input/deployed',d,{recursive:true});const p=join(d,'.vercel/output/static/assets/Verdict-CNiIxuke.js');writeFileSync(p,readFileSync(p,'utf8')+'\n'+tail);
const files=readOutput(d);writeFileSync(join(d,'.vercel/output/static/gate-verdict.json'),JSON.stringify(verdictFile(files,{commit},30)));
console.log(name,'gate',runChecks(files,{commit}),'preflight',preflight(d,()=>true));
console.log('adjudicator browser probe: bun run web/hosted/browser-check.ts review-work/'+name);
}
````

## build-instrumented.ts

````
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
import { RISK_ACCEPTANCE_PHRASE } from "../facility/src/loopback.ts";

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
````

## canary-positive.ts

````
import {writeFileSync} from 'node:fs';import {leakedCanaries} from '../web/hosted/build.ts';
writeFileSync('review-work/canary/raw.js','const x="REVIEW059canary123";');console.log('raw canary hits',leakedCanaries('review-work/canary',['REVIEW059canary123']).length);
````

## chrome-status.ts

````
const profile=process.cwd()+'/review-work/chrome-status-profile';
const p=Bun.spawn(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless=new','--no-sandbox','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--disable-background-networking','about:blank'],{stdout:'pipe',stderr:'pipe'});
const outcome=await Promise.race([p.exited.then(code=>({code,signal:p.signalCode})),Bun.sleep(5000).then(()=>({alive:true}))]);
console.log(outcome);p.kill();
````

## compare-probes.ts

````
import {serveOutput} from '../web/hosted/browser-check.ts';import {compareDeployed} from '../web/hosted/compare-deployed.ts';
const root='review-input/deployed';const originServer=serveOutput(root);const origin=`http://127.0.0.1:${originServer.port}`;
for(const [name,mode]of [['wrong MIME','mime'],['altered /observer/ page','slash'],['500 verdict','verdict'],['redirect verdict','redirect']] as const){
const server=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(req){const path=new URL(req.url).pathname;const r=await fetch(origin+path);const headers=new Headers(r.headers);const bytes=await r.arrayBuffer();
 if(mode==='slash'&&path==='/observer/')return new Response('<html><body>The holder is private from the issuer.</body></html>',{headers});
 if(mode==='mime')headers.set('content-type','text/plain');
 if(mode==='verdict'&&path==='/gate-verdict.json'){headers.delete('content-security-policy');return new Response(bytes,{status:500,headers})}
 if(mode==='redirect'&&path==='/gate-verdict.json'){headers.set('location','/index.html');return new Response(bytes,{status:302,headers})}
 return new Response(bytes,{status:r.status,headers});}});
try{console.log(name,JSON.stringify(await compareDeployed(root,`http://127.0.0.1:${server.port}`)));if(mode==='slash'){const r=await fetch(`http://127.0.0.1:${server.port}/observer/`);console.log('unchecked response',r.status,await r.text())}}
finally{server.stop(true)}}
originServer.stop(true);
````

## control-probes.ts

````
import {CONTROLS,readOutput,runChecks} from '../tools/check-web-hosted.ts';
import {cpSync,mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';
const want={commit:'ccf76e73bf6629b29dece98cc15a050e3f60cad4'};let passed=0;
for(const [name,check,mutate] of CONTROLS){const d=mkdtempSync(join(process.cwd(),'review-work/control-'));cpSync('review-input/deployed/.vercel',join(d,'.vercel'),{recursive:true});mutate(d);const got=runChecks(readOutput(d),want);const ok=got.some(x=>x.check===check);if(ok)passed++;else console.log('FAILED',name,got);rmSync(d,{recursive:true})}
console.log('detector controls',passed,'/',CONTROLS.length);
````

## control-strength.ts

````
import {readFileSync,writeFileSync,cpSync,mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';
import {runChecks,readOutput} from '../tools/check-web-hosted.ts';import {shippedNotice} from '../web/hosted/licence-notices.ts';
const commit='ccf76e73bf6629b29dece98cc15a050e3f60cad4';
writeFileSync('review-work/gate-no-package-restriction.ts',readFileSync('tools/check-web-hosted.ts','utf8').replace('./web-readonly-needles.ts','../tools/web-readonly-needles.ts').replace('if (!ADMITTED_PACKAGES.has(name))','if (false)'));
const disabled=await import('./gate-no-package-restriction.ts');let passed=0;
for(const [name,check,mutate]of disabled.CONTROLS){const d=mkdtempSync(join(process.cwd(),'review-work/strength-'));cpSync('review-input/deployed/.vercel',join(d,'.vercel'),{recursive:true});mutate(d);const got=disabled.runChecks(disabled.readOutput(d),{commit});if(got.some((x:any)=>x.check===check))passed++;if(name==='a cryptography package bundled')console.log('crypto control with package restriction removed',got.filter((x:any)=>x.check==='licences'));rmSync(d,{recursive:true})}
console.log('detector controls with forbidden-package check deleted',passed,'/',disabled.CONTROLS.length);
const actual=readOutput('review-input/deployed');const p='static/third-party-licenses.txt';const pkg=JSON.parse(readFileSync('node_modules/@noble/curves/package.json','utf8'));
actual.set(p,Buffer.from(actual.get(p)!.toString()+'\n'+'='.repeat(78)+'\n@noble/curves@'+pkg.version+' (MIT)\n'+'='.repeat(78)+'\n'+shippedNotice('node_modules/@noble/curves')+'\n'));
console.log('authentic crypto notice original detector',runChecks(actual,{commit}).filter(x=>x.check==='licences'));
console.log('authentic crypto notice disabled detector',disabled.runChecks(actual,{commit}).filter((x:any)=>x.check==='licences'));
````

## gate-no-package-restriction.ts

````
/**
 * check-web-hosted — architecture §6 step 9's gate: the HOSTED part of
 * `check-web-readonly`, run over the UPLOADED OUTPUT and its routing
 * configuration, never over the source (`ADR-0004`, "What phase 2 step 4's gate
 * must check").
 *
 *   bun run tools/check-web-readonly.ts --hosted <output root> --commit <sha>
 *
 * `<output root>` holds `.vercel/output/`. On a pass it writes
 * `.vercel/output/static/gate-verdict.json`, which the page's footer reads: a
 * digest of every other file, so a reader can tell what the gate passed.
 *
 * ⚠ **Gates in this repository have false-passed before they worked**
 * (`CLAIMS.md` E-165, E-182, E-226). So every run first copies the real output,
 * breaks the copy one way per control, and runs the SAME `runChecks()` over it;
 * each control names the check that must fire, and the unbroken copy must pass.
 * A control that fails stops the run with `CONTROL-FAILED`.
 *
 * ⚠ **It cannot check egress.** It reads files; a visitor's requests are not in
 * them (`ADR-0004`). `web/hosted/browser-check.ts` observes one browser's
 * requests, which is evidence about that browser and not a proof. The full list
 * of what this gate does not check is printed on every run.
 *
 * The last line is always `check-web-hosted: verdict=<WORD> exit=<N>`.
 */

import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeSeed } from "ripple-address-codec";
import { SOCKET_NEEDLES, SECRET_NEEDLES } from "../tools/web-readonly-needles.ts";
import { DH2_WORDING, DEVNET_NETWORK_ID } from "../web/app/src/hosted/wording.ts";
import { DEMO_ACCOUNTS } from "../web/api/demo-accounts.ts";
import { HOSTED_PAGES } from "../web/hosted/pages.ts";
import { inlineScripts, scriptHash } from "../web/hosted/csp.ts";
import { EMAIL_MARKER, shippedNotice } from "../web/hosted/licence-notices.ts";

const REPO = join(import.meta.dir, "..");

// ------------------------------------------------------------------ the output

/** Every file under `.vercel/output`, by path relative to it. Symlinks refused. */
export function readOutput(root: string): Map<string, Buffer> {
  const base = join(root, ".vercel", "output");
  if (!existsSync(base)) throw new Error(`${base} does not exist`);
  const files = new Map<string, Buffer>();
  const walk = (rel: string) => {
    for (const name of readdirSync(join(base, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(join(base, r));
      if (st.isSymbolicLink()) throw new Error(`a symlink at ${r}: the uploader may follow it`);
      if (st.isDirectory()) walk(r);
      else if (st.isFile()) files.set(r, readFileSync(join(base, r)));
      else throw new Error(`${r} is not a regular file`);
    }
  };
  walk("");
  return files;
}

const VERDICT = "static/gate-verdict.json";
const text = (b: Buffer) => b.toString("utf8");
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** React escapes these in text; the wording is compared after undoing it. */
export function decodeEntities(s: string): string {
  return s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}


// ------------------------------------------------------------------ the checks

export interface Finding { check: string; detail: string }
export interface Expect { commit: string }

/** What the provenance rule admits, by path. Anything else fails. */
export const ADMITTED: RegExp[] = [
  /^config\.json$/,
  /^static\/index\.html$/,
  new RegExp(`^static/(${HOSTED_PAGES.filter(Boolean).join("|")})/index\\.html$`),
  /^static\/assets\/[A-Za-z0-9_-]+\.(js|css)$/,
  /^static\/third-party-licenses\.txt$/,
  /^static\/gate-verdict\.json$/,
];

/**
 * The packages the client bundle may contain, as its licence file lists them.
 * ⚠ A package added by a framework update fails this until the list is changed
 * in review; a cryptography, ledger or server package is never admitted.
 */
export const ADMITTED_PACKAGES = new Set([
  "@tanstack/history", "@tanstack/react-router", "@tanstack/react-start", "@tanstack/react-start-client",
  "@tanstack/react-store", "@tanstack/router-core", "@tanstack/start-client-core", "@tanstack/store",
  "react", "react-dom", "scheduler", "seroval", "seroval-plugins", "use-sync-external-store", "tailwindcss",
]);

/**
 * Absolute URLs the output may contain, each with why. ⚠ None is fetched: the
 * policy's `connect-src 'self'` refuses any connection elsewhere, and this list
 * exists so a new third-party URL fails the gate rather than passing silently.
 */
export const ADMITTED_URLS: [RegExp, string][] = [
  [/^http:\/\/www\.w3\.org\/(1999\/xlink|2000\/svg|XML\/1998\/namespace|1998\/Math\/MathML)$/, "XML namespace names in React's DOM code"],
  [/^https:\/\/react\.dev\/errors\/$/, "React's error-decoder link in production messages"],
  [/^https:\/\/tailwindcss\.com$/, "Tailwind's licence banner in the stylesheet"],
  [/^http:\/\/localhost$/, "TanStack Router's fallback origin when window.origin is null"],
  [/^https:\/\/github\.com\/nandanito\/xrpl-confidential-positions(\/commit\/[0-9a-f]{40}|#run-it)?$/, "links to the public repository"],
  [/^https:\/\/s\.devnet\.rippletest\.net:51234$/, "the ledger endpoint, NAMED on the page as the source of its values"],
  [/^https:\/\/[a-z0-9-]+\.vercel\.app$/, "the canonical address the footer names"],
];

const FORMS = /<(input|textarea|select|form)\b|contenteditable/i;
const PAGE_HTML = (p: string) => (p ? `static/${p}/index.html` : "static/index.html");

export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
  const f: Finding[] = [];
  const add = (check: string, detail: string) => f.push({ check, detail });
  const paths = [...files.keys()].filter((p) => p !== VERDICT);
  const html = new Map(paths.filter((p) => p.endsWith(".html")).map((p) => [p, text(files.get(p)!)]));

  // 1. Inventory and provenance.
  for (const p of paths) if (!ADMITTED.some((re) => re.test(p))) add("inventory", `${p} is not admitted by the provenance rule`);
  for (const p of HOSTED_PAGES) if (!files.has(PAGE_HTML(p))) add("inventory", `the page /${p} is missing`);

  // 2. No source maps.
  for (const p of paths) if (/sourceMappingURL|\.map$/.test(p) || /[#@]\s*sourceMappingURL=/.test(text(files.get(p)!))) add("no-source-maps", `${p} carries or references a source map`);

  // 3. No server code: no function, no middleware, routes to files only.
  for (const p of paths) if (p.startsWith("functions/") || p.includes("/functions/")) add("no-server-code", `${p} is a function`);
  let config: any = null;
  try { config = JSON.parse(text(files.get("config.json") ?? Buffer.from("null"))); } catch { add("no-server-code", "config.json is not JSON"); }
  if (!config || config.version !== 3) add("no-server-code", "config.json is missing or not Build Output API version 3");
  else {
    for (const k of Object.keys(config)) if (k !== "version" && k !== "routes") add("no-server-code", `config.json has a top-level key ${k}`);
    for (const r of config.routes ?? []) {
      for (const k of Object.keys(r)) if (!["src", "dest", "headers", "continue", "handle"].includes(k)) add("no-server-code", `a route has the key ${k}`);
      if (r.handle !== undefined && r.handle !== "filesystem") add("no-server-code", `a route hands off to ${r.handle}`);
      if (r.dest !== undefined && (typeof r.dest !== "string" || !files.has(`static${r.dest}`))) add("no-server-code", `a route's dest ${JSON.stringify(r.dest)} is not a file in the output`);
    }
  }

  // 4. No socket client, signer path, decryption routine, secret name or build variable.
  const NEEDLES = [...SOCKET_NEEDLES, ...SECRET_NEEDLES, "WebAssembly", ".wasm", "ProjectivePoint", "mptool", "mpt_", "elgamal_", "VITE_", "WCONF_", "eval(", "new Function"];
  for (const p of paths) {
    if (p === "static/third-party-licenses.txt") continue;
    const t = text(files.get(p)!);
    for (const n of NEEDLES) if (t.includes(n)) add("no-socket-secret-or-decryption", `${p} contains ${JSON.stringify(n)}`);
    for (const api of ["new WebSocket", "EventSource(", "sendBeacon", "XMLHttpRequest"]) if (t.includes(api)) add("no-other-connection", `${p} uses ${api}`);
  }

  // 5. Absolute URLs, against the admitted list.
  for (const p of paths) {
    if (p === "static/third-party-licenses.txt") continue;
    for (const m of text(files.get(p)!).matchAll(/\bhttps?:\/\/[A-Za-z0-9.:/#_-]+/g)) {
      const u = m[0].replace(/[.:]+$/, "");
      if (!ADMITTED_URLS.some(([re]) => re.test(u))) add("urls", `${p} names ${u}`);
    }
  }

  // 6. The Content Security Policy, as config.json delivers it.
  const first = config?.routes?.[0];
  const csp: string | undefined = first?.src === "/(.*)" && first?.continue === true ? first?.headers?.["Content-Security-Policy"] : undefined;
  if (!csp) add("csp", "the first route does not set a Content-Security-Policy on every path");
  else {
    const dirs = new Map(csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v] as const; }));
    const exact: Record<string, string[]> = {
      "default-src": ["'self'"], "style-src": ["'self'"], "img-src": ["'self'"], "font-src": ["'self'"],
      "connect-src": ["'self'"], "object-src": ["'none'"], "base-uri": ["'none'"], "form-action": ["'none'"], "frame-ancestors": ["'none'"],
    };
    for (const [k, v] of Object.entries(exact)) if (JSON.stringify(dirs.get(k) ?? null) !== JSON.stringify(v)) add("csp", `${k} is ${JSON.stringify(dirs.get(k) ?? null)}, not ${v.join(" ")}`);
    for (const k of dirs.keys()) if (!(k in exact) && k !== "script-src") add("csp", `an unexpected directive ${k}`);
    const script = dirs.get("script-src") ?? [];
    if (script[0] !== "'self'") add("csp", "script-src does not start with 'self'");
    const allowed = new Set(script.slice(1));
    for (const tok of allowed) if (!/^'sha256-[A-Za-z0-9+/]+=*'$/.test(tok)) add("csp", `script-src admits ${tok}`);
    const needed = new Set([...html.values()].flatMap((h) => inlineScripts(h).map(scriptHash)));
    for (const h of needed) if (!allowed.has(h)) add("csp", `an inline script's hash ${h} is not admitted, so the page would not run`);
    for (const h of allowed) if (!needed.has(h)) add("csp", `script-src admits ${h}, which no page carries`);
    for (const [h, v] of Object.entries({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" })) if (first.headers?.[h] !== v) add("csp", `${h} is not ${v}`);
  }
  for (const [p, h] of html) if (/\sstyle="|<style[\s>]/.test(h)) add("csp", `${p} carries inline style, which style-src 'self' refuses`);

  // 7. No input that asks a visitor for anything.
  for (const [p, h] of html) if (FORMS.test(h)) add("no-inputs", `${p} renders a form control`);

  // 8. Every page that renders a ledger value renders the wording, the network check and the index.
  const indices = new Set<string>();
  for (const [p, h] of html) {
    if (!h.includes("data-ledger-value")) continue;
    const plain = decodeEntities(h);
    for (const para of DH2_WORDING) if (!plain.includes(para)) add("ledger-wording", `${p} renders a ledger value without the D-H2 sentence beginning ${JSON.stringify(para.slice(0, 40))}`);
    if (!h.includes(`data-network-id="${DEVNET_NETWORK_ID}"`)) add("ledger-wording", `${p} renders a ledger value without the Devnet network check`);
    const idx = h.match(/data-ledger-index="(\d+)"/);
    if (!idx) add("ledger-wording", `${p} renders a ledger value without the ledger index`);
    else indices.add(idx[1]);
  }
  if (indices.size > 1) add("ledger-wording", `pages name different ledgers: ${[...indices].join(", ")}`);
  for (const [p, label] of [["static/observer/index.html", "Observer view: "], ["static/issuer/index.html", "Issuer&#x27;s copy: "]] as const) {
    const n = (html.get(p) ?? "").split(label).length - 1;
    if (html.has(p) && n !== DEMO_ACCOUNTS.length) add("accounts", `${p} renders ${n} account panels, not ${DEMO_ACCOUNTS.length}`);
  }

  // 9. The commit and the verdict, on every page.
  for (const [p, h] of html) {
    if (!h.includes(`/commit/${want.commit}`)) add("commit-and-verdict", `${p} does not name commit ${want.commit}`);
    if (!h.includes("data-gate-verdict")) add("commit-and-verdict", `${p} has no gate-verdict slot`);
  }

  // 10. Licence notices for what is bundled, and nothing that should never be.
  const lic = files.get("static/third-party-licenses.txt");
  if (!lic) add("licences", "static/third-party-licenses.txt is missing");
  else {
    // Separator, `name@version (licence)`, separator, licence text: split on the
    // separator lines, so each header is followed by its own body.
    const parts = text(lic).split(/^={20,}$/m);
    const names: [string, string, string][] = [];
    for (let i = 1; i + 1 < parts.length; i += 2) {
      const head = parts[i].trim().match(/^((?:@[^/\s]+\/)?[^@\s]+)@\S+ \([^)]*\)$/);
      if (!head) { add("licences", `an entry header is malformed: ${JSON.stringify(parts[i].trim().slice(0, 60))}`); continue; }
      names.push([head[0], head[1], parts[i + 1]]);
    }
    // Each notice must be the package's own licence file with only its email
    // addresses removed (E-335), read from this checkout's node_modules at the
    // same version. A version this checkout does not hold cannot be verified.
    for (const [header, name, body] of names) {
      const root = join(REPO, "node_modules", name);
      const version = header.slice(name.length + 1, header.indexOf(" "));
      const have = existsSync(join(root, "package.json")) ? JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version : null;
      if (have !== version) { add("licences", `${name}@${version} cannot be verified: this checkout's node_modules holds ${have ?? "nothing"}`); continue; }
      if (shippedNotice(root) !== body.trim()) add("licences", `${name}'s notice is not its own licence file with only email addresses removed`);
    }
    if (names.length === 0) add("licences", "the licence file lists no package");
    for (const [, name, body] of names) {
      if (false) add("licences", `the bundle contains ${name}, which is not admitted`);
      if (body.trim().length < 100) add("licences", `${name}'s licence text is missing or truncated`);
    }
    for (const must of ["react", "react-dom"]) if (!names.some((m) => m[1] === must)) add("licences", `${must} is bundled and not listed`);
  }
  return f;
}

// ------------------------------------------------------------------ the secret scan

/** `check-no-secrets --dir`, with the local store. Its verdict line is required. */
export function secretScan(root: string): { ok: boolean; line: string } {
  const r = Bun.spawnSync(["bun", "run", join(REPO, "tools/check-no-secrets.ts"), "--dir", join(root, ".vercel", "output")], { stdout: "pipe", stderr: "pipe" });
  const lines = r.stdout.toString().trim().split("\n");
  const last = lines[lines.length - 1] ?? "";
  return { ok: last === "check-no-secrets: verdict=PASS exit=0" && r.exitCode === 0, line: last };
}

// ------------------------------------------------------------------ controls

type Mutate = (dir: string) => void;
const out = (dir: string, p: string) => join(dir, ".vercel", "output", p);
const edit = (dir: string, p: string, fn: (s: string) => string) => writeFileSync(out(dir, p), fn(readFileSync(out(dir, p), "utf8")));
const firstJs = (dir: string) => "static/assets/" + readdirSync(out(dir, "static/assets")).find((n) => n.endsWith(".js"))!;
const editConfig = (dir: string, fn: (c: any) => void) => edit(dir, "config.json", (s) => { const c = JSON.parse(s); fn(c); return JSON.stringify(c); });

/** Each control: what it breaks, and the check that must fire. */
export const CONTROLS: [string, string, Mutate][] = [
  ["a stray file", "inventory", (d) => writeFileSync(out(d, "static/notes.txt"), "x")],
  ["a source map", "inventory", (d) => writeFileSync(out(d, "static/assets/app.js.map"), "{}")],
  ["a sourceMappingURL comment", "no-source-maps", (d) => edit(d, firstJs(d), (s) => s + "\n//# sourceMappingURL=app.js.map\n")],
  ["a missing page", "inventory", (d) => rmSync(out(d, "static/issuer/index.html"))],
  ["a serverless function", "no-server-code", (d) => { const p = out(d, "functions/api.func"); mkdirSync(p, { recursive: true }); writeFileSync(join(p, ".vc-config.json"), "{}"); }],
  ["middleware in config.json", "no-server-code", (d) => editConfig(d, (c) => c.routes.unshift({ src: "/(.*)", middlewarePath: "_middleware" }))],
  ["a rewrite to another host", "no-server-code", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/x", dest: "https://example.com/x" }))],
  ["a top-level overrides key", "no-server-code", (d) => editConfig(d, (c) => (c.overrides = {}))],
  ["the signer socket path in a script", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ';const p="/run/wconf/signer.sock";')],
  ["a WebAssembly module", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ";WebAssembly.instantiate(x);")],
  ["a build variable inlined", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ';const v="VITE_WCONF_WEB_PORT";')],
  ["a WebSocket", "no-other-connection", (d) => edit(d, firstJs(d), (s) => s + ';new WebSocket("wss://x");')],
  ["a third-party URL", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<a href="https://analytics.example.net/x">x</a></body>'))],
  ["'unsafe-inline' in script-src", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")))],
  ["a widened connect-src", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("connect-src 'self'", "connect-src 'self' https://s.devnet.rippletest.net:51234")))],
  ["an inline script the policy does not admit", "csp", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", "<script>window.x=1</script></body>"))],
  ["no policy at all", "csp", (d) => editConfig(d, (c) => delete c.routes[0].headers["Content-Security-Policy"])],
  // ⚠ The first build hashed the file's bytes; the browser hashes the parsed
  // text, refused every page's hydration script, and this gate had passed it.
  ["a script carrying NUL, admitted by its RAW hash", "csp", (d) => {
    const raw = "window.y='\u0000'";
    edit(d, "static/index.html", (s) => s.replace("</body>", `<script>${raw}</script></body>`));
    const rawHash = `'sha256-${createHash("sha256").update(raw, "utf8").digest("base64")}'`;
    editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("script-src 'self'", `script-src 'self' ${rawHash}`)));
  }],
  ["an inline style attribute", "csp", (d) => edit(d, "static/index.html", (s) => s.replace("<body>", '<body><div style="color:red">x</div>'))],
  ["an input asking for a seed", "no-inputs", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<input name="seed"></body>'))],
  ["the D-H2 wording removed from the observer page", "ledger-wording", (d) => edit(d, "static/observer/index.html", (s) => s.replace(/Vercel, which hosts this page/g, "This host"))],
  ["the network check changed", "ledger-wording", (d) => edit(d, "static/issuer/index.html", (s) => s.replace(`data-network-id="${DEVNET_NETWORK_ID}"`, 'data-network-id="0"'))],
  ["an account panel dropped", "accounts", (d) => edit(d, "static/observer/index.html", (s) => s.replace("Observer view: ", "Observed: "))],
  ["another commit on one page", "commit-and-verdict", (d) => edit(d, "static/wallet/index.html", (s) => s.replace(/\/commit\/[0-9a-f]{40}/g, "/commit/" + "0".repeat(40)))],
  ["a cryptography package bundled", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => s + "\n" + "=".repeat(78) + "\n@noble/curves@1.9.7 (MIT)\n" + "=".repeat(78) + "\n" + "MIT ".repeat(40) + "\n")],
  ["the licence file removed", "licences", (d) => rmSync(out(d, "static/third-party-licenses.txt"))],
  ["a licence notice altered", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => s.replace("Permission is hereby granted", "Permission is granted"))],
  // ⚠ The LAST marker: the first is the file's header line explaining it, and
  // restoring that one changes no notice, so this control first tested nothing.
  ["a personal email restored to a notice", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => {
    const at = s.lastIndexOf(EMAIL_MARKER);
    return at < 0 ? s : s.slice(0, at) + "someone@example.org" + s.slice(at + EMAIL_MARKER.length);
  })],
];

export function runControls(root: string, want: Expect): { run: number; failed: string[] } {
  const failed: string[] = [];
  let run = 0;
  const fresh = () => { const d = mkdtempSync(join(tmpdir(), "check-web-hosted-")); cpSync(join(root, ".vercel"), join(d, ".vercel"), { recursive: true }); return d; };
  const dirs: string[] = [];
  try {
    const clean = fresh(); dirs.push(clean);
    run++;
    const base = runChecks(readOutput(clean), want);
    if (base.length) failed.push(`the unbroken copy must pass, and has ${base.length} finding(s): ${base[0].check}: ${base[0].detail}`);
    for (const [name, check, mutate] of CONTROLS) {
      const d = fresh(); dirs.push(d);
      run++;
      mutate(d);
      const got = runChecks(readOutput(d), want);
      if (!got.some((x) => x.check === check)) failed.push(`${name}: expected a '${check}' finding, got ${got.length ? got.map((x) => x.check).join(", ") : "none"}`);
    }
    // The secret scan, through the same function the real check calls.
    const d = fresh(); dirs.push(d);
    run++;
    edit(d, firstJs(d), (s) => s + `;const s="${plantedSeed()}";`);
    if (secretScan(d).ok) failed.push("a seed planted in a script: check-no-secrets --dir passed it");
  } finally {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
  return { run, failed };
}

/** A real-entropy ed25519 seed, made at run time so this file holds none. */
function plantedSeed(): string {
  return encodeSeed(randomBytes(16), "ed25519");
}

// ------------------------------------------------------------------ disclosure

export function whatThisDoesNotCheck(): string[] {
  return [
    "1. EGRESS. It reads files; what a visitor's browser sends is not in them. The policy's connect-src 'self' is checked as written, not as a browser enforces it.",
    "2. The SERVED bytes and headers. It checks the output before upload; step 5 compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.",
    "3. The BUILD MACHINE. An inventory of the output cannot show that the build never read a private store; the isolated build is what addresses that.",
    "4. Whether the PROSE is true. Wording is claims-check's and the wording tests' question; this gate checks that the ruled D-H2 sentences are present, not that every other sentence is right.",
    "5. A form control built in the BROWSER after hydration. The check reads the prerendered HTML; React's DOM code names input elements internally, so the bundle cannot be read for them.",
    "6. A decryption routine under a name it does not list. It forbids WebAssembly, the named mpt-crypto and ElGamal identifiers and any cryptography package in the licence list, which is a named set.",
    "7. The licence list's COMPLETENESS beyond the module graph the build reported. A package inlined without its module path would be missed.",
  ];
}

// ------------------------------------------------------------------ main

export function verdictFile(files: Map<string, Buffer>, want: Expect, controls: number) {
  const entries = [...files].filter(([p]) => p !== VERDICT).sort(([a], [b]) => a.localeCompare(b));
  const perFile = Object.fromEntries(entries.map(([p, b]) => [p, sha256(b)]));
  return {
    verdict: "PASS",
    gate: "check-web-readonly --hosted (tools/check-web-hosted.ts)",
    checkedAt: new Date().toISOString(),
    commit: want.commit,
    controls,
    files: entries.length,
    outputDigest: sha256(entries.map(([p, b]) => `${p}\t${sha256(b)}`).join("\n")),
    perFile,
    doesNotCheck: whatThisDoesNotCheck(),
  };
}

export async function runHosted(argv: string[]): Promise<number> {
  const finish = (word: string, exit: number) => { console.log(`check-web-hosted: verdict=${word} exit=${exit}`); return exit; };
  try {
    const at = argv.indexOf("--hosted"), ct = argv.indexOf("--commit");
    const root = argv[at + 1], commit = argv[ct + 1];
    if (!root || root.startsWith("--")) throw new Error("--hosted needs the output root, the directory that holds .vercel/output");
    if (!commit || !/^[0-9a-f]{40}$/.test(commit)) throw new Error("--commit needs the full public commit id the build ran from");
    const want = { commit };
    console.log(`check-web-hosted over ${join(root, ".vercel/output")}, expecting commit ${commit}`);

    const c = runControls(root, want);
    console.log(`controls: ${c.run - c.failed.length}/${c.run} passed, each through the same runChecks() and secretScan() as the real check`);
    if (c.failed.length) { for (const x of c.failed) console.log(`  CONTROL FAILED: ${x}`); return finish("CONTROL-FAILED", 2); }

    const files = readOutput(root);
    const findings = runChecks(files, want);
    const secrets = secretScan(root);
    if (!secrets.ok) findings.push({ check: "secrets", detail: `check-no-secrets --dir: ${secrets.line}` });
    console.log(`scanned: ${[...files.keys()].filter((p) => p !== VERDICT).length} file(s); secret sweep: ${secrets.line}`);
    console.log("\nWhat this gate does NOT check:");
    for (const l of whatThisDoesNotCheck()) console.log(`  ${l}`);
    if (findings.length) {
      console.log(`\nFAILING: ${findings.length}`);
      for (const x of findings) console.log(`  ${x.check}: ${x.detail}`);
      return finish("FAIL", 1);
    }
    const v = verdictFile(files, want, c.run);
    writeFileSync(join(root, ".vercel/output", VERDICT), JSON.stringify(v, null, 2) + "\n");
    console.log(`\nwrote ${VERDICT}: ${v.files} files, output digest ${v.outputDigest}`);
    return finish("PASS", 0);
  } catch (e) {
    console.log(`REFUSED: ${String(e)}`);
    return finish("REFUSED", 2);
  }
}

if (import.meta.main) process.exit(await runHosted(process.argv.slice(2)));
````

## more-probes.ts

````
import {readOutput,runChecks,verdictFile} from '../tools/check-web-hosted.ts';
import {preflight} from '../web/hosted/deploy-preflight.ts';
import {leakedCanaries} from '../web/hosted/build.ts';
import {Snapshot,LedgerRefusal} from '../facility/src/loopback.ts';
import {readAccount} from '../web/hosted/snapshot.ts';
import {DEMO_ACCOUNTS} from '../web/api/demo-accounts.ts';
import {renderToStaticMarkup} from 'react-dom/server';
import {CustodyView} from '../web/app/src/views/CustodyView.tsx';
import {walkFlows} from '../web/api/custody-sim.ts';
import {cpSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const commit='ccf76e73bf6629b29dece98cc15a050e3f60cad4';const base=readOutput('review-input/deployed');
const edit=(m:Map<string,Buffer>,p:string,fn:(s:string)=>string)=>m.set(p,Buffer.from(fn(m.get(p)!.toString())));
for(const [name,mutate] of [
 ['D-H2 hidden by stylesheet',(m:any)=>edit(m,'static/assets/styles-DJVXuOe6.css',s=>s+'\n[data-dh2-wording]{display:none}')],
 ['all ledger indices changed together',(m:any)=>{for(const p of ['static/observer/index.html','static/issuer/index.html'])edit(m,p,s=>s.replaceAll('data-ledger-index="6263910"','data-ledger-index="42"'))}],
 ['value 750 changed to 999',(m:any)=>edit(m,'static/observer/index.html',s=>s.replace('>750<','>999<'))],
 ['wrong visible commit correct hyperlink',(m:any)=>edit(m,'static/wallet/index.html',s=>s.replace('>ccf76e73bf66<','>000000000000<'))],
 ['wrong verdict commit',(m:any)=>edit(m,'static/gate-verdict.json',s=>s.replaceAll(commit,'0'.repeat(40)))],
] as const){const m=new Map(base);mutate(m);console.log(name,runChecks(m,{commit}))}
let mpt=0;
const inconsistent:any={call:async(_method:string,p:any)=>{
 if(p.account_root)return {ledger_index:42,validated:true,ledger_hash:'A'.repeat(64),node:{LedgerEntryType:'AccountRoot'}};
 if(p.mptoken){if(++mpt===2)throw new LedgerRefusal('REFUSED_LEDGER_ENTRY_MISSING','mock',{ledger_index:42,validated:true});return {ledger_index:42,validated:true,ledger_hash:'A'.repeat(64),node:{LedgerEntryType:'MPToken',MPTAmount:'7',IssuerEncryptedBalance:'AB'.repeat(66)}}}
 return {ledger_index:42,validated:true,ledger_hash:'B'.repeat(64),node:{LedgerEntryType:'MPTokenIssuance',Issuer:'rIssuer',ConfidentialOutstandingAmount:'7'}};
}};
const a=await readAccount(new Snapshot(inconsistent,42),DEMO_ACCOUNTS[0],true);
console.log('actual Snapshot positive->negative',JSON.stringify({state:a.state,amount:a.observer?.publicAmount,registered:a.observer?.registered,mirror:a.issuerMirror?.present}));
const absent=await readAccount({accountExists:async()=>false,index:42,mptoken:async()=>null,issuance:async()=>null},DEMO_ACCOUNTS[0],true);
console.log('absent snapshot note',JSON.stringify(absent));
const custody=renderToStaticMarkup(CustodyView({sim:walkFlows()}));console.log('custody absolute statement rendered',custody.includes('So a custodied account cannot derive its own ElGamal key or read its own'));
const d=join(process.cwd(),'review-work/canary');mkdirSync(d,{recursive:true});const marker='REVIEW059canary123';
writeFileSync(join(d,'app.js'),'const x=atob("'+Buffer.from(marker).toString('base64')+'");');console.log('encoded canary leakage detector',leakedCanaries(d,[marker]));
````

## mutations.ts

````
import {cpSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {readOutput,runChecks,CONTROLS,verdictFile} from '../tools/check-web-hosted.ts';
import {DH2_WORDING} from '../web/app/src/hosted/wording.ts';
import {encodeSeed} from 'ripple-address-codec';
import {randomBytes} from 'node:crypto';
const root=process.cwd(), commit='ccf76e73bf6629b29dece98cc15a050e3f60cad4';
const base=readOutput('review-input/deployed');
const first='static/assets/Verdict-CNiIxuke.js';
const edit=(m:Map<string,Buffer>,p:string,fn:(s:string)=>string)=>m.set(p,Buffer.from(fn(m.get(p)!.toString())));
const html=(m:Map<string,Buffer>,s:string,p='static/index.html')=>edit(m,p,t=>t.replace('</body>',s+'</body>'));
const js=(m:Map<string,Buffer>,s:string)=>edit(m,first,t=>t+'\n'+s);
const cfg=(m:Map<string,Buffer>,fn:(c:any)=>void)=>edit(m,'config.json',s=>{let c=JSON.parse(s);fn(c);return JSON.stringify(c)});
const cases:[string,(m:Map<string,Buffer>)=>void][]=[
 ['baseline',m=>{}],
 ['server function',m=>m.set('functions/api.func/.vc-config.json',Buffer.from('{}'))],
 ['API route to existing static file',m=>cfg(m,c=>c.routes.splice(1,0,{src:'^/api/lookup$',dest:'/index.html'}))],
 ['middleware',m=>cfg(m,c=>c.routes.splice(1,0,{src:'/(.*)',middlewarePath:'mw'}))],
 ['signer socket literal',m=>js(m,'const path="/run/wconf/signer.sock";')],
 ['socket client alternate spelling',m=>js(m,'function socket(u){return new globalThis["Web"+"Socket"](u)}')],
 ['seed shaped value',m=>js(m,`const sample="${encodeSeed(randomBytes(16),'ed25519')}";`)],
 ['labelled private scalar',m=>js(m,'const privateKey="'+randomBytes(32).toString('hex')+'";')],
 ['AES decryption routine',m=>js(m,'async function d(k,iv,b){return crypto.subtle.decrypt({name:"AES-GCM",iv},k,b)}')],
 ['input seed',m=>html(m,'<input name="seed">')],
 ['button asks for seed via prompt',m=>html(m,'<button onclick="prompt(\'Enter your seed\')">Continue</button>')],
 ['Mainnet endpoint literal',m=>js(m,'const endpoint="https://s1.ripple.com:51234";')],
 ['Mainnet endpoint assembled',m=>js(m,'const endpoint="https:"+"//s1.ripple.com:51234";')],
 ['second ledger endpoint literal',m=>js(m,'const fallback="https://s.devnet.rippletest.net:51235";')],
 ['third-party script protocol relative',m=>html(m,'<script src="//analytics.example.net/a.js"></script>')],
 ['same-origin analytics',m=>js(m,'document.addEventListener("click",()=>fetch("/analytics?event=click"));')],
 ['visitor account in host URL',m=>html(m,'<a href="/observer?account=rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8">Look up this account</a>')],
 ['visitor lookup through prompt',m=>js(m,'function lookup(){location.href="/observer?account="+prompt("Account address")}')],
 ['source map',m=>m.set('static/assets/app.js.map',Buffer.from('{}'))],
 ['stray provenance file',m=>m.set('static/notes.txt',Buffer.from('x'))],
 ['CSP widened',m=>cfg(m,c=>c.routes[0].headers['Content-Security-Policy']=c.routes[0].headers['Content-Security-Policy'].replace("connect-src 'self'","connect-src *"))],
 ['CSP duplicate unsafe directive FIRST',m=>cfg(m,c=>c.routes[0].headers['Content-Security-Policy']="connect-src *; "+c.routes[0].headers['Content-Security-Policy'])],
 ['later route widens CSP',m=>cfg(m,c=>c.routes.splice(1,0,{src:'^/secret-path$',headers:{'Content-Security-Policy':"default-src *; script-src * 'unsafe-inline'; connect-src *"},continue:true}))],
 ['risk wording removed',m=>edit(m,'static/observer/index.html',s=>s.replaceAll('Vercel, which hosts this page','This host'))],
 ['ledger markers and risk wording removed',m=>edit(m,'static/observer/index.html',s=>s.replaceAll('data-ledger-value','data-value').replaceAll('Vercel, which hosts this page','This host'))],
 ['network marker changed',m=>edit(m,'static/observer/index.html',s=>s.replace('data-network-id="2"','data-network-id="0"'))],
 ['index changed',m=>edit(m,'static/observer/index.html',s=>s.replace(/data-ledger-index="\d+"/,'data-ledger-index="42"'))],
 ['failed read rendered empty',m=>html(m,'<p>At validated ledger 6263910 this account exists and holds no position in the demo issuance.</p>','static/observer/index.html')],
 ['substitute source value',m=>edit(m,'static/observer/index.html',s=>s.replace('6263910','42'))],
 ['issuer figure',m=>html(m,'<p>Decrypted issuer balance: 42</p>','static/issuer/index.html')],
 ['commit removed',m=>edit(m,'static/wallet/index.html',s=>s.replaceAll('/commit/'+commit,'/commit/'+'0'.repeat(40)))],
 ['commit visible label false',m=>edit(m,'static/wallet/index.html',s=>s.replaceAll(commit.slice(0,12),'000000000000'))],
 ['verdict slot removed',m=>edit(m,'static/wallet/index.html',s=>s.replaceAll('data-gate-verdict','data-verdict'))],
 ['licence omitted',m=>m.delete('static/third-party-licenses.txt')],
 ['seroval licence omitted',m=>edit(m,'static/third-party-licenses.txt',s=>s.replace(/={78}\nseroval@[^\n]+\n={78}\n[\s\S]*?(?=={78}|$)/,''))],
 ['P9 false claim',m=>html(m,'<p>The holder is private from the issuer.</p>')],
 ['F1 false claim',m=>html(m,'<p>A freshly initialised balance is hidden from observers.</p>')],
 ['custody integration false claim',m=>html(m,'<p>This is a real Harmonize integration.</p>')],
 ['tapFailHard shorthand',m=>html(m,'<p>Use tapFailHard.</p>')],
];
const report=[];
for(const [name,mutate]of cases){
 const m=new Map(base);mutate(m);
 const d=mkdtempSync(join(root,'review-work/case-'));
 const output=join(d,'.vercel/output');
 for(const [p,b]of m){mkdirSync(join(output,p,'..'),{recursive:true});writeFileSync(join(output,p),b)}
 const f=runChecks(readOutput(d),{commit});
 const row={name,findings:[...new Set(f.map(x=>x.check))]};report.push(row);console.log(JSON.stringify(row));
 rmSync(d,{recursive:true});
}
writeFileSync('review-work/mutation-results.json',JSON.stringify(report,null,2));
console.log('controls count',CONTROLS.length);
````

## provenance-probes.ts

````
import {readFileSync,writeFileSync,mkdirSync,existsSync,cpSync} from 'node:fs';import {join} from 'node:path';
import {readOutput,runChecks,verdictFile} from '../tools/check-web-hosted.ts';import {preflight} from '../web/hosted/deploy-preflight.ts';
const commit='ccf76e73bf6629b29dece98cc15a050e3f60cad4';
// Instrument ONLY the export to invoke the unchanged production source-export function without Docker.
writeFileSync('review-work/build-instrumented.ts',readFileSync('web/hosted/build.ts','utf8').replace('function exportSource(','export function exportSource(').replace('../../facility/src/loopback.ts','../facility/src/loopback.ts'));
const {exportSource}=await import('./build-instrumented.ts');
const dest=join(process.cwd(),'review-work/exported');const extra='web/app/public/assets/review059.js';
mkdirSync(join(dest,extra,'..'),{recursive:true});writeFileSync(join(dest,extra),'export const outsider=1;\n');
const sha=exportSource(process.cwd(),dest,false,commit);console.log('source export',JSON.stringify({commit:sha,preexistingNonCommitFileSurvives:existsSync(join(dest,extra))}));
const check=Bun.spawnSync(['git','cat-file','-e',commit+':'+extra],{stdout:'pipe',stderr:'pipe'});console.log('file exists in named commit',check.exitCode===0);
const d=join(process.cwd(),'review-work/provenance-output');cpSync('review-input/deployed',d,{recursive:true});cpSync(join(dest,extra),join(d,'.vercel/output/static/assets/review059.js'));
const files=readOutput(d);console.log('uncommitted asset gate',runChecks(files,{commit}));writeFileSync(join(d,'.vercel/output/static/gate-verdict.json'),JSON.stringify(verdictFile(files,{commit},30)));
console.log('uncommitted asset preflight',preflight(d,()=>true));
````

## reader-refusal-probes.ts

````
import {Snapshot,LedgerRefusal} from '../facility/src/loopback.ts';
for(const [name,r]of [['wrong positive index',{ledger_index:43,validated:true,node:{LedgerEntryType:'MPToken'}}],['unvalidated',{ledger_index:42,validated:false,node:{LedgerEntryType:'MPToken'}}],['string index',{ledger_index:'42',validated:true,node:{LedgerEntryType:'MPToken'}}],['wrong type',{ledger_index:42,validated:true,node:{LedgerEntryType:'AccountRoot'}}]] as const){try{await new Snapshot({call:async()=>r} as any,42).mptoken('a','i');console.log(name,'ACCEPTED')}catch(e:any){console.log(name,e.code)}}
for(const idx of [42,43,undefined]){try{const s=new Snapshot({call:async()=>{throw new LedgerRefusal('REFUSED_LEDGER_ENTRY_MISSING','mock',{ledger_index:idx,validated:true})}} as any,42);console.log('negative index',idx,await s.mptoken('a','i'))}catch(e:any){console.log('negative index',idx,e.code)}}
````

## release-probes.ts

````
import {cpSync,mkdtempSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {readOutput,runChecks,verdictFile} from '../tools/check-web-hosted.ts';
import {preflight} from '../web/hosted/deploy-preflight.ts';
import {compareDeployed} from '../web/hosted/compare-deployed.ts';
import {serveOutput,browserCheck} from '../web/hosted/browser-check.ts';
const commit='ccf76e73bf6629b29dece98cc15a050e3f60cad4';
const make=(name:string)=>{const d=join(process.cwd(),'review-work',name);cpSync('review-input/deployed',d,{recursive:true});return d};
const edit=(d:string,p:string,fn:(s:string)=>string)=>{const path=join(d,'.vercel/output',p);writeFileSync(path,fn(readFileSync(path,'utf8')))};
const seal=(d:string)=>writeFileSync(join(d,'.vercel/output/static/gate-verdict.json'),JSON.stringify(verdictFile(readOutput(d),{commit},30))+'\n');
const baseline=make('release-baseline');
console.log('baseline preflight (main callback true)',preflight(baseline,()=>true));
const changed=make('release-changed');
edit(changed,'static/index.html',s=>s.replace('</body>','<p>Decrypted issuer balance: 42</p></body>'));
console.log('changed gate',runChecks(readOutput(changed),{commit}));
console.log('changed before fresh gate',preflight(changed,()=>true));seal(changed);
console.log('changed after fresh gate',preflight(changed,()=>true));
const missingTrial=JSON.parse(readFileSync(join(changed,'build-manifest.json'),'utf8'));delete missingTrial.trial;missingTrial.snapshot.ledgerIndex=1;
writeFileSync(join(changed,'build-manifest.json'),JSON.stringify(missingTrial));
console.log('manifest no trial and false ledger',preflight(changed,()=>true));
const source=serveOutput(baseline);
const origin=`http://127.0.0.1:${source.port}`;
const check=async(name:string,transform:(r:Response,p:string)=>Promise<Response>)=>{
 const proxy=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(req){const p=new URL(req.url).pathname;const r=await fetch(origin+p,{redirect:'manual'});return transform(r,p)}});
 try{console.log(name,await compareDeployed(baseline,`http://127.0.0.1:${proxy.port}`))}finally{proxy.stop(true)}
};
await check('all content types text/plain',async r=>{const h=new Headers(r.headers);h.set('content-type','text/plain');return new Response(await r.arrayBuffer(),{status:r.status,headers:h})});
await check('verdict status 500; policy absent on verdict/404',async(r,p)=>{const h=new Headers(r.headers);if(p==='/gate-verdict.json'||r.status===404)h.delete('content-security-policy');return new Response(await r.arrayBuffer(),{status:p==='/gate-verdict.json'?500:r.status,headers:h})});
await check('additional API-like path',async(r,p)=>p==='/api/hidden'?new Response('code result'):r);
source.stop(true);
const duplicate=make('release-csp-duplicate');
edit(duplicate,'config.json',s=>{const c=JSON.parse(s);c.routes[0].headers['Content-Security-Policy']='connect-src *; '+c.routes[0].headers['Content-Security-Policy'];return JSON.stringify(c)});seal(duplicate);
console.log('duplicate gate',runChecks(readOutput(duplicate),{commit}));
console.log('duplicate browser',await browserCheck(duplicate));
console.log('changed browser',await browserCheck(changed));
const consoleError=make('release-console-error');
edit(consoleError,'static/assets/Verdict-CNiIxuke.js',s=>s+'\nconsole.error("REVIEW059_ERROR_CONTROL");');seal(consoleError);
console.log('console.error browser',await browserCheck(consoleError));
````

## shape-probe.ts

````
import {cpSync,readFileSync,writeFileSync} from 'node:fs';import {encodeSeed} from 'ripple-address-codec';import {randomBytes} from 'node:crypto';
cpSync('review-input/deployed/.vercel/output','review-work/shape-mutant',{recursive:true});
const p='review-work/shape-mutant/static/assets/Verdict-CNiIxuke.js';writeFileSync(p,readFileSync(p,'utf8')+'\nconst s="'+encodeSeed(randomBytes(16),'ed25519')+'";const privateKey="'+randomBytes(32).toString('hex')+'";');
````

## snapshot-probes.ts

````
import {LoopbackLedger,Snapshot,RISK_ACCEPTANCE_PHRASE} from '../facility/src/loopback.ts';
import {takeSnapshot,readAccount,HOSTED_ENDPOINT} from '../web/hosted/snapshot.ts';
import {DEMO_ACCOUNTS} from '../web/api/demo-accounts.ts';
const ledger={call:async()=>({validated:true,ledger_index:42,ledger_hash:'B'.repeat(64),node:{LedgerEntryType:'MPToken',MPTAmount:'7'}})};
console.log('unbound ledger hash',await new Snapshot(ledger as any,42).mptoken(DEMO_ACCOUNTS[0].address,DEMO_ACCOUNTS[0].issuanceId));
let n=0;
const fake={index:42,accountExists:async()=>true,mptoken:async()=>++n===1?{publicAmountRaw:'7',confidentialBalanceVersion:1,issuerEncryptedBalance:'AB'.repeat(66)}:null,issuance:async()=>({issuer:'rIssuer',confidentialOutstandingAmountRaw:'7'})};
console.log('MPToken present then missing',JSON.stringify(await readAccount(fake,DEMO_ACCOUNTS[0],true)));
const saved=globalThis.fetch;process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK=RISK_ACCEPTANCE_PHRASE;
let serverInfo=0;let entries=0;
globalThis.fetch=async(_url:any,init:any)=>{
 const {method,params:[p]}=JSON.parse(init.body);let r:any;
 if(method==='server_info')r={info:{network_id:++serverInfo===1?2:1,server_state:'full',build_version:'mock',validated_ledger:{seq:42,hash:'A'.repeat(64)}}};
 else {entries++;r={validated:true,ledger_index:42,ledger_hash:entries%2?'B'.repeat(64):'C'.repeat(64),node:p.mpt_issuance?{LedgerEntryType:'MPTokenIssuance',Issuer:'rIssuer'}:p.account_root?{LedgerEntryType:'AccountRoot'}:{LedgerEntryType:'MPToken'}}}
 return new Response(JSON.stringify({result:r}),{headers:{'content-type':'application/json'}});
};
try{const s=await takeSnapshot('c'.repeat(40),'https://x.vercel.app');console.log('mixed network/hash + truncated objects snapshot',JSON.stringify({networkId:s.source.networkId,ledger:s.source.ledgerIndex,states:s.accounts.map(a=>({state:a.state,amount:a.observer?.publicAmount,registered:a.observer?.registered,mirror:a.issuerMirror}))}))}finally{globalThis.fetch=saved}
console.log('LIVE READ START');
try{const l=await LoopbackLedger.open(HOSTED_ENDPOINT);const snap=await l.snapshot();const a=DEMO_ACCOUNTS[0];console.log('LIVE',JSON.stringify({identity:l.identity,index:snap.index,accountExists:await snap.accountExists(a.address),mpt:await snap.mptoken(a.address,a.issuanceId),issuance:await snap.issuance(a.issuanceId)}))}catch(e){console.log('LIVE REFUSED',String(e))}
````

## chrome-wrapper.sh

````
#!/bin/sh
exec '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --no-sandbox --disable-crash-reporter --disable-breakpad "$@" 2>>review-work/chrome-launch.log
````

