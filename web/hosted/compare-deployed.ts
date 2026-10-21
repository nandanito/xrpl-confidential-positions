/**
 * After the upload: are the bytes and headers the host serves the ones the gate
 * passed? Step 7 of `web/hosted/README.md`'s release procedure (`ADR-0004` D-H4).
 *
 *   bun run web/hosted/compare-deployed.ts <output root> <https origin>
 *
 * Fetches every file `gate-verdict.json` lists, and each page by both spellings
 * of its route, and compares bytes with the verdict's digests, the security
 * headers with `config.json`'s and the content type with the file's kind. Fails
 * on any difference, on a status other than 200, on a cookie, on a redirect,
 * and on an unknown path that does not answer 404 under the same headers.
 *
 * ⚠ **`REVIEW-059` R1-6 found three things this did not look at**: the
 * content type (every page could have been served as text), the verdict
 * file's status, and `/<page>/`, which the routes serve and nothing fetched.
 *
 * ⚠ **It detects a change at the moment it runs, nothing later.** The deployed
 * bytes are the host's to deliver (`ADR-0004`, `REVIEW-058` S-3, R1-10).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MIMEType } from "node:util";
import { HOSTED_PAGES } from "./pages.ts";

const sha256 = (b: ArrayBuffer | Buffer) => createHash("sha256").update(Buffer.from(b as ArrayBuffer)).digest("hex");
const CHECKED_HEADERS = ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Cross-Origin-Opener-Policy", "Permissions-Policy"];

/** The media types each kind of file may be served as. Both JavaScript types are valid for a module script. */
export const MEDIA_TYPES: Record<string, string[]> = {
  html: ["text/html"], js: ["text/javascript", "application/javascript"], css: ["text/css"],
  json: ["application/json"], txt: ["text/plain"],
};

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
  const checkType = (path: string, file: string, r: Response) => {
    const ext = file.slice(file.lastIndexOf(".") + 1);
    // ⚠ Parsed, not split on ";": a quoted parameter hid the real charset, and
    // UTF-8's other labels failed (`REVIEW-059` R3-7). `MIMEType` parses the
    // header and `TextDecoder` resolves the label as the Encoding Standard does.
    let mt: MIMEType;
    try { mt = new MIMEType(r.headers.get("content-type") ?? ""); } catch { problems.push(`${path}: the content type ${JSON.stringify(r.headers.get("content-type"))} does not parse`); return; }
    if (!(MEDIA_TYPES[ext] ?? []).includes(mt.essence)) problems.push(`${path}: served as ${JSON.stringify(mt.essence)}, not ${(MEDIA_TYPES[ext] ?? ["a known type"]).join(" or ")}`);
    // The parameter changes how the same bytes are read: UTF-8 pages served as
    // `charset=utf-16le` passed when only the type was compared (R2-5).
    const label = mt.params.get("charset");
    if (label !== null) {
      let encoding = "an unknown encoding";
      try { encoding = new TextDecoder(label).encoding; } catch { /* an unknown label is refused below */ }
      if (encoding !== "utf-8") problems.push(`${path}: served with charset ${JSON.stringify(label)}, which is ${encoding}, and every file is UTF-8`);
    }
  };
  for (const [p, digest] of Object.entries<string>(verdict.perFile)) {
    if (!p.startsWith("static/")) continue;
    const path = p.slice("static".length);
    const r = await get(path);
    if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
    if (sha256(await r.arrayBuffer()) !== digest) problems.push(`${path}: the served bytes differ from what the gate passed`);
    checkHeaders(path, r);
    checkType(path, p, r);
  }
  for (const page of HOSTED_PAGES) {
    const file = page ? `static/${page}/index.html` : "static/index.html";
    for (const path of page ? [`/${page}`, `/${page}/`] : ["/"]) {
      const r = await get(path);
      if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
      if (sha256(await r.arrayBuffer()) !== verdict.perFile[file]) problems.push(`${path}: the page served at its route differs from ${file}`);
      checkHeaders(path, r);
      checkType(path, file, r);
    }
  }
  const served = await get("/gate-verdict.json");
  if (served.status !== 200) problems.push(`/gate-verdict.json: HTTP ${served.status}`);
  if (sha256(await served.arrayBuffer()) !== sha256(readFileSync(join(base, "static/gate-verdict.json")))) problems.push("/gate-verdict.json differs from the local one");
  checkHeaders("/gate-verdict.json", served);
  checkType("/gate-verdict.json", "gate-verdict.json", served);
  const missing = await get(`/no-such-page-${Date.now()}`);
  if (missing.status !== 404) problems.push(`an unknown path answered ${missing.status}, not 404`);
  checkHeaders("an unknown path", missing);
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
