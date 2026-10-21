/**
 * Before `vercel deploy --prebuilt`: is this output the one the gate passed,
 * built from a commit, and nothing since? `ADR-0004` D-H4, ruled A.
 *
 *   bun run web/hosted/deploy-preflight.ts <output root>
 *
 * ⚠ **This does not deploy.** Deploying needs the owner's Vercel token, and
 * D-H4 keeps that token away from everything that installs or builds. This
 * checks the output and prints the command; the owner runs it.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_PAGES, blockText, elementsInner, readOutput, runChecks, type Finding } from "../../tools/check-web-hosted.ts";
import { HOSTED_ENDPOINT } from "./snapshot.ts";

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

export const PUBLIC_REPO = "nandanito/xrpl-confidential-positions";

/**
 * Whether `commit` is on the public `main`. ⚠ Asked as a comparison, not a
 * lookup: `repos/<repo>/commits/<sha>` also answers for commits that exist only
 * in a fork, because forks share an object store.
 */
export function onPublicMain(commit: string, compare = (sha: string) => {
  const r = Bun.spawnSync(["gh", "api", `repos/${PUBLIC_REPO}/compare/${sha}...main`, "--jq", ".status"], { stdout: "pipe", stderr: "pipe" });
  return r.exitCode === 0 ? r.stdout.toString().trim() : `error: ${r.stderr.toString().trim()}`;
}): boolean {
  const status = compare(commit);
  return status === "identical" || status === "ahead";
}

/**
 * ⚠ **What a PASS here means, and what it does not** (`REVIEW-059` R1-7, S-5).
 * It means: the manifest says a commit build, not a trial, of a commit on the
 * public `main`; the gate's checks pass on these exact bytes, run again here;
 * every file matches the verdict; and every ledger page names the ledger the
 * manifest records. It does not mean the files came from that commit: that is
 * the build's tree check, and the manifest is the build's own word for it.
 */
// ⚠ The shape alone passed `2026-99-99T99:99:99.999Z` (`REVIEW-059` R3-6): a
// timestamp must survive a round trip through `Date` unchanged.
const isIso = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString() === v;

/**
 * The manifest's shape. ⚠ `REVIEW-059` R2-4: a read time of `"2"` passed,
 * because it was looked for as a substring, and the endpoint and image were
 * never checked. Every field `web/hosted/build.ts` writes is required, in its
 * form; this said so while three of them were not checked (R3-6).
 */
export function manifestProblems(m: any): string[] {
  const p: string[] = [];
  const need = (ok: boolean, what: string) => { if (!ok) p.push(`the manifest's ${what}`); };
  need(m?.trial === false, `trial field is ${JSON.stringify(m?.trial ?? null)}, not false: this output is not known to be a commit build`);
  need(typeof m?.commit === "string" && /^[0-9a-f]{40}$/.test(m.commit), `commit ${JSON.stringify(m?.commit ?? null)} is not a full commit id`);
  need(typeof m?.image === "string" && /^wconf-hosted-build:[0-9a-f]{16}$/.test(m.image), `image ${JSON.stringify(m?.image ?? null)} is not a build image tag`);
  need(typeof m?.dockerfileSha256 === "string" && /^[0-9a-f]{64}$/.test(m.dockerfileSha256), "dockerfileSha256 is not a SHA-256");
  need(typeof m?.dockerContext === "string" && m.dockerContext.length > 0, "dockerContext is missing");
  need(isIso(m?.builtAt), `builtAt ${JSON.stringify(m?.builtAt ?? null)} is not a timestamp`);
  need(Array.isArray(m?.environment) && m.environment.length > 0 && m.environment.every((e: unknown) => typeof e === "string"), "environment is not a list of variable names");
  need(typeof m?.canaries === "string" && m.canaries.length > 0, "canaries is missing");
  need(typeof m?.isolation === "string" && m.isolation.length > 0, "isolation is missing");
  need(Number.isInteger(m?.snapshot?.ledgerIndex) && m.snapshot.ledgerIndex > 0, `ledger index ${JSON.stringify(m?.snapshot?.ledgerIndex ?? null)} is not a ledger`);
  need(isIso(m?.snapshot?.readAt), `read time ${JSON.stringify(m?.snapshot?.readAt ?? null)} is not a timestamp`);
  need(m?.snapshot?.endpoint === HOSTED_ENDPOINT, `endpoint ${JSON.stringify(m?.snapshot?.endpoint ?? null)} is not ${HOSTED_ENDPOINT}`);
  need(typeof m?.snapshot?.canonicalUrl === "string" && /^https:\/\/[a-z0-9.-]+$/.test(m.snapshot.canonicalUrl), `canonical address ${JSON.stringify(m?.snapshot?.canonicalUrl ?? null)} is not an https origin`);
  return p;
}

export function preflight(
  root: string,
  isOnPublicMain: (commit: string) => boolean = onPublicMain,
  checks: (files: Map<string, Buffer>, want: { commit: string }) => Finding[] = runChecks,
): string[] {
  const problems: string[] = [];
  const manifestPath = join(root, "build-manifest.json");
  if (!existsSync(manifestPath)) return [`no build-manifest.json beside the output; build with web/hosted/build.ts`];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  // ⚠ `if (manifest.trial)` passed a manifest with no `trial` at all.
  const shape = manifestProblems(manifest);
  problems.push(...shape);
  if (!shape.length && !isOnPublicMain(manifest.commit)) problems.push(`${manifest.commit} is not on the public repository's main, so the footer's link names a commit readers cannot see`);
  const files = readOutput(root);
  // The gate's checks, again, on the bytes about to be uploaded: a file changed
  // together with its verdict passes the digest comparison below and not this.
  // The controls and the secret sweep stay the gate's.
  for (const f of checks(files, { commit: String(manifest.commit) })) problems.push(`the gate's check fails now: ${f.check}: ${f.detail}`);
  // Every page's footer states the snapshot's provenance in one sentence and
  // names the address it is published at; each ledger page's source panel names
  // the endpoint, the ledger and the read time. All must be the manifest's
  // (`REVIEW-059` R1-7). ⚠ Each is read from ITS element: matched anywhere on
  // the page, a wrong footer passed beside a correct sentence elsewhere, and a
  // footer split by an inline element failed (R2-4, R3-5).
  const snap = manifest.snapshot ?? {};
  const provenance = `Ledger values were read at validated ledger ${snap.ledgerIndex} on ${snap.readAt}.`;
  for (const [p, b] of files) {
    if (!p.endsWith(".html")) continue;
    const h = b.toString("utf8");
    const footers = elementsInner(h, "footer", /<footer\b[^>]*>/i);
    if (footers.length !== 1) { problems.push(`${p} has ${footers.length} footer elements, not one`); continue; }
    const footer = blockText(footers[0]);
    if (!footer.includes(provenance)) problems.push(`${p}'s footer does not state the manifest's provenance: ${JSON.stringify(provenance)}`);
    if (!footer.includes(`This page is published at ${snap.canonicalUrl}.`)) problems.push(`${p}'s footer does not name the manifest's address ${JSON.stringify(snap.canonicalUrl ?? null)}`);
    if ((LEDGER_PAGES as readonly string[]).some((lp) => p === `static/${lp}/index.html`)) {
      const sources = elementsInner(h, "div", /<div\b[^>]*\bdata-ledger-source\b[^>]*>/i).map(blockText);
      if (!sources.length) problems.push(`${p} has no ledger-source panel`);
      for (const src of sources) {
        if (!src.includes(`read from ${HOSTED_ENDPOINT}`)) problems.push(`${p}'s source panel does not name ${HOSTED_ENDPOINT}`);
        if (!src.includes(`validated ledger ${snap.ledgerIndex} at ${snap.readAt}`)) problems.push(`${p}'s source panel does not name the manifest's ledger and read time`);
      }
    }
  }
  const ledgerIndex = manifest.snapshot?.ledgerIndex;
  for (const lp of LEDGER_PAGES) {
    const h = files.get(`static/${lp}/index.html`)?.toString("utf8") ?? "";
    const named = [...h.matchAll(/data-ledger-index="(\d+)"/g)].map((m) => Number(m[1]));
    if (!named.length || named.some((n) => n !== ledgerIndex)) problems.push(`/${lp} names ledger ${[...new Set(named)].join(", ") || "none"}, and the manifest records ${JSON.stringify(ledgerIndex ?? null)}`);
  }
  const v = files.get("static/gate-verdict.json");
  if (!v) return [...problems, "no static/gate-verdict.json: the gate has not passed this output"];
  const verdict = JSON.parse(v.toString("utf8"));
  if (verdict.verdict !== "PASS") problems.push(`the verdict is ${JSON.stringify(verdict.verdict)}`);
  if (verdict.commit !== manifest.commit) problems.push(`the gate checked ${verdict.commit}, the build was of ${manifest.commit}`);
  const entries = [...files].filter(([p]) => p !== "static/gate-verdict.json").sort(([a], [b]) => a.localeCompare(b));
  if (entries.length !== verdict.files) problems.push(`${entries.length} files now, ${verdict.files} when the gate passed`);
  for (const [p, b] of entries) if (verdict.perFile[p] !== sha256(b)) problems.push(`${p} changed since the gate passed`);
  const digest = sha256(entries.map(([p, b]) => `${p}\t${sha256(b)}`).join("\n"));
  if (digest !== verdict.outputDigest) problems.push("the output digest does not match the verdict's");
  return problems;
}

if (import.meta.main) {
  const root = process.argv[2];
  if (!root) throw new Error("usage: bun run web/hosted/deploy-preflight.ts <output root>");
  const problems = preflight(root);
  for (const p of problems) console.log(`  REFUSED: ${p}`);
  if (problems.length) { console.log("deploy-preflight: verdict=REFUSED exit=1"); process.exit(1); }
  const m = JSON.parse(readFileSync(join(root, "build-manifest.json"), "utf8"));
  console.log(`deploy-preflight: ${root} is the output the gate passed, built from ${m.commit} at ledger ${m.snapshot.ledgerIndex}.`);
  console.log("\nThe owner deploys it, with the project-scoped token present for this command only:");
  console.log(`  VERCEL_TOKEN=… VERCEL_ORG_ID=… VERCEL_PROJECT_ID=… vercel deploy --prebuilt --prod --cwd ${root}`);
  console.log(`\nThen compare what is served with what passed:\n  bun run web/hosted/compare-deployed.ts ${root} ${m.snapshot.canonicalUrl}`);
  console.log("deploy-preflight: verdict=PASS exit=0");
}
