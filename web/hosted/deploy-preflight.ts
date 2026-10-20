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
import { readOutput } from "../../tools/check-web-hosted.ts";

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

export function preflight(root: string, isOnPublicMain: (commit: string) => boolean = onPublicMain): string[] {
  const problems: string[] = [];
  const manifestPath = join(root, "build-manifest.json");
  if (!existsSync(manifestPath)) return [`no build-manifest.json beside the output; build with web/hosted/build.ts`];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.trial) problems.push("the manifest says TRIAL: this output was built from a working tree, not a commit");
  else if (!isOnPublicMain(manifest.commit)) problems.push(`${manifest.commit} is not on the public repository's main, so the footer's link names a commit readers cannot see`);
  const files = readOutput(root);
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
