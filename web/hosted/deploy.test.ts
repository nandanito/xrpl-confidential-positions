/**
 * Before and after the owner's upload: the preflight refuses what the gate did
 * not pass, and the comparison sees what the host changed.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readOutput, verdictFile } from "../../tools/check-web-hosted.ts";
import { onPublicMain, preflight } from "./deploy-preflight.ts";
import { compareDeployed } from "./compare-deployed.ts";
import { serveOutput } from "./browser-check.ts";
import { HOSTED_PAGES } from "./pages.ts";

const COMMIT = "c".repeat(40);
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

/** A minimal output the gate has passed, with its manifest beside it. */
function fixture(o: { trial?: boolean; verdict?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "wconf-deploy-test-"));
  dirs.push(root);
  const base = join(root, ".vercel", "output");
  for (const p of HOSTED_PAGES) {
    mkdirSync(join(base, "static", p), { recursive: true });
    writeFileSync(join(base, "static", p, "index.html"), `<html><body>${p || "home"}</body></html>`);
  }
  const headers = { "Content-Security-Policy": "default-src 'self'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cross-Origin-Opener-Policy": "same-origin", "Permissions-Policy": "camera=()" };
  writeFileSync(join(base, "config.json"), JSON.stringify({ version: 3, routes: [{ src: "/(.*)", headers, continue: true }, ...HOSTED_PAGES.filter(Boolean).map((p) => ({ src: `^/${p}/?$`, dest: `/${p}/index.html` })), { handle: "filesystem" }] }));
  writeFileSync(join(root, "build-manifest.json"), JSON.stringify({ trial: o.trial ?? false, commit: COMMIT, snapshot: { ledgerIndex: 1, canonicalUrl: "https://x.vercel.app" } }));
  if (o.verdict ?? true) writeFileSync(join(base, "static/gate-verdict.json"), JSON.stringify(verdictFile(readOutput(root), { commit: COMMIT }, 0)));
  return root;
}
const onMain = () => true;

describe("deploy-preflight", () => {
  test("passes the output the gate passed", () => {
    expect(preflight(fixture(), onMain)).toEqual([]);
  });
  test("refuses a trial build", () => {
    expect(preflight(fixture({ trial: true }), onMain).join()).toMatch(/TRIAL/);
  });
  test("refuses a commit that is not on the public main", () => {
    expect(preflight(fixture(), () => false).join()).toMatch(/not on the public repository's main/);
  });
  test("refuses an output with no verdict", () => {
    expect(preflight(fixture({ verdict: false }), onMain).join()).toMatch(/gate has not passed/);
  });
  test("refuses a file changed after the gate passed", () => {
    const root = fixture();
    appendFileSync(join(root, ".vercel/output/static/observer/index.html"), "<!-- later -->");
    expect(preflight(root, onMain).join()).toMatch(/static\/observer\/index\.html changed/);
  });
  test("asks GitHub for a comparison, and only 'identical' or 'ahead' is on main", () => {
    expect(onPublicMain("x", () => "ahead")).toBe(true);
    expect(onPublicMain("x", () => "identical")).toBe(true);
    for (const s of ["behind", "diverged", "error: Not Found"]) expect(onPublicMain("x", () => s)).toBe(false);
  });
});

describe("compare-deployed", () => {
  test("finds nothing when the host serves what the gate passed", async () => {
    const root = fixture();
    const s = serveOutput(root);
    try { expect(await compareDeployed(root, `http://127.0.0.1:${s.port}`)).toEqual([]); } finally { s.stop(true); }
  });
  test("sees a page the host changed, at its file and at its route", async () => {
    const root = fixture();
    const s = serveOutput(root);
    appendFileSync(join(root, ".vercel/output/static/issuer/index.html"), "<script src=//x></script>");
    try {
      const d = (await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n");
      expect(d).toMatch(/\/issuer\/index\.html: the served bytes differ/);
      expect(d).toMatch(/\/issuer: the page served at its route differs/);
    } finally { s.stop(true); }
  });
  test("sees a header the host changed, a cookie, and a catch-all", async () => {
    const root = fixture();
    const s = Bun.serve({
      hostname: "127.0.0.1", port: 0,
      fetch: () => new Response("<html></html>", { headers: { "Content-Security-Policy": "default-src *", "Set-Cookie": "a=b" } }),
    });
    try {
      const d = (await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n");
      expect(d).toMatch(/Content-Security-Policy is/);
      expect(d).toMatch(/the host set a cookie/);
      expect(d).toMatch(/an unknown path answered 200, not 404/);
    } finally { s.stop(true); }
  });
});
