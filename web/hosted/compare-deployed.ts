/**
 * After the upload: are the bytes and headers the host serves the ones the gate
 * passed? `ADR-0004` D-H4 and step 5.
 *
 *   bun run web/hosted/compare-deployed.ts <output root> <https origin>
 *
 * Fetches every file `gate-verdict.json` lists, and each page by its route,
 * and compares bytes with the verdict's digests and the security headers with
 * `config.json`'s. Fails on any difference, on a cookie, on a redirect, and on
 * an unknown path that does not answer 404.
 *
 * ⚠ **It detects a change at the moment it runs, nothing later.** The deployed
 * bytes are the host's to deliver (`ADR-0004`, `REVIEW-058` S-3, R1-10).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HOSTED_PAGES } from "./pages.ts";

const sha256 = (b: ArrayBuffer | Buffer) => createHash("sha256").update(Buffer.from(b as ArrayBuffer)).digest("hex");
const CHECKED_HEADERS = ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Cross-Origin-Opener-Policy", "Permissions-Policy"];

export async function compareDeployed(root: string, origin: string): Promise<string[]> {
  const base = join(root, ".vercel", "output");
  const verdict = JSON.parse(readFileSync(join(base, "static/gate-verdict.json"), "utf8"));
  const config = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
  const want: Record<string, string> = config.routes[0].headers;
  const problems: string[] = [];
  const get = async (path: string) => {
    const r = await fetch(origin.replace(/\/$/, "") + path, { redirect: "manual", headers: { "cache-control": "no-cache" } });
    if (r.headers.get("set-cookie")) problems.push(`${path}: the host set a cookie`);
    return r;
  };
  const checkHeaders = (path: string, r: Response) => {
    for (const h of CHECKED_HEADERS) if (r.headers.get(h) !== want[h]) problems.push(`${path}: ${h} is ${JSON.stringify(r.headers.get(h))}, not what config.json sets`);
  };
  for (const [p, digest] of Object.entries<string>(verdict.perFile)) {
    if (!p.startsWith("static/")) continue;
    const path = p.slice("static".length);
    const r = await get(path);
    if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
    if (sha256(await r.arrayBuffer()) !== digest) problems.push(`${path}: the served bytes differ from what the gate passed`);
    checkHeaders(path, r);
  }
  for (const page of HOSTED_PAGES) {
    const path = `/${page}`;
    const r = await get(path);
    const file = page ? `static/${page}/index.html` : "static/index.html";
    if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
    if (sha256(await r.arrayBuffer()) !== verdict.perFile[file]) problems.push(`${path}: the page served at its route differs from ${file}`);
    checkHeaders(path, r);
  }
  const served = await get("/gate-verdict.json");
  if (sha256(await served.arrayBuffer()) !== sha256(readFileSync(join(base, "static/gate-verdict.json")))) problems.push("/gate-verdict.json differs from the local one");
  const missing = await get(`/no-such-page-${Date.now()}`);
  if (missing.status !== 404) problems.push(`an unknown path answered ${missing.status}, not 404`);
  return problems;
}

if (import.meta.main) {
  const [root, origin] = process.argv.slice(2);
  if (!root || !origin?.startsWith("https://")) throw new Error("usage: bun run web/hosted/compare-deployed.ts <output root> <https origin>");
  const problems = await compareDeployed(root, origin);
  for (const p of problems) console.log(`  DIFFERS: ${p}`);
  console.log(`compare-deployed: verdict=${problems.length ? "FAIL" : "PASS"} exit=${problems.length ? 1 : 0}`);
  process.exit(problems.length ? 1 : 0);
}
