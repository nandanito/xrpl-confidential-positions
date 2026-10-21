/**
 * Before and after the owner's upload: the preflight refuses what the gate did
 * not pass, and the comparison sees what the host changed.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LEDGER_PAGES, readOutput, verdictFile } from "../../tools/check-web-hosted.ts";
import { onPublicMain, preflight } from "./deploy-preflight.ts";
import { compareDeployed } from "./compare-deployed.ts";
import { HOSTED_ENDPOINT } from "./snapshot.ts";
import { serveOutput } from "./browser-check.ts";
import { HOSTED_PAGES } from "./pages.ts";

const COMMIT = "c".repeat(40);
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

/** A minimal output the gate has passed, with its manifest beside it. */
const READ_AT = "2026-10-20T05:22:05.191Z";
function fixture(o: { trial?: boolean | null; verdict?: boolean; ledgerIndex?: number; readAt?: string; manifest?: (m: any) => void; page?: (p: string, html: string) => string } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "wconf-deploy-test-"));
  dirs.push(root);
  const base = join(root, ".vercel", "output");
  for (const p of HOSTED_PAGES) {
    mkdirSync(join(base, "static", p), { recursive: true });
    const ledger = (LEDGER_PAGES as readonly string[]).includes(p)
      ? `<div data-ledger-source="" data-ledger-index="${o.ledgerIndex ?? 1}"><div><span>read from</span> <code>${HOSTED_ENDPOINT}</code></div><div><span>validated ledger</span> <code>1</code> <span>at</span> <code>${READ_AT}</code></div></div>`
      : "";
    const footer = `<footer><p>Built from commit. Ledger values were read at validated ledger <!-- -->1<!-- --> on<!-- --> <!-- -->${READ_AT}.</p><p>This page is published at <code>https://x.vercel.app</code>. A copy hosted anywhere else is not this build.</p></footer>`;
    const html = `<html><body>${p || "home"}${ledger}${footer}</body></html>`;
    writeFileSync(join(base, "static", p, "index.html"), o.page ? o.page(p, html) : html);
  }
  const headers = { "Content-Security-Policy": "default-src 'self'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cross-Origin-Opener-Policy": "same-origin", "Permissions-Policy": "camera=()" };
  writeFileSync(join(base, "config.json"), JSON.stringify({ version: 3, routes: [{ src: "/(.*)", headers, continue: true }, ...HOSTED_PAGES.filter(Boolean).map((p) => ({ src: `^/${p}/?$`, dest: `/${p}/index.html` })), { handle: "filesystem" }] }));
  const manifest: any = {
    trial: o.trial === undefined ? false : o.trial, commit: COMMIT, image: "wconf-hosted-build:" + "b".repeat(16),
    dockerfileSha256: "d".repeat(64), dockerContext: "orbstack", builtAt: READ_AT,
    environment: ["WCONF_HOSTED_COMMIT"], canaries: "two random values", isolation: "two containers",
    snapshot: { ledgerIndex: 1, readAt: o.readAt ?? READ_AT, endpoint: HOSTED_ENDPOINT, canonicalUrl: "https://x.vercel.app" },
  };
  if (o.trial === null) delete manifest.trial;
  o.manifest?.(manifest);
  writeFileSync(join(root, "build-manifest.json"), JSON.stringify(manifest));
  if (o.verdict ?? true) writeFileSync(join(base, "static/gate-verdict.json"), JSON.stringify(verdictFile(readOutput(root), { commit: COMMIT }, 0)));
  return root;
}
const onMain = () => true;
// The fixture is not a real output, so the gate's checks are stubbed except
// where a test is about them.
const clean = () => [];

describe("deploy-preflight", () => {
  test("passes the output the gate passed", () => {
    expect(preflight(fixture(), onMain, clean)).toEqual([]);
  });
  test("refuses a trial build", () => {
    expect(preflight(fixture({ trial: true }), onMain, clean).join()).toMatch(/trial field is true/);
  });
  test("refuses a manifest with no trial field (REVIEW-059 R1-7)", () => {
    expect(preflight(fixture({ trial: null }), onMain, clean).join()).toMatch(/trial field is null, not false/);
  });
  test("refuses a commit that is not on the public main", () => {
    expect(preflight(fixture(), () => false, clean).join()).toMatch(/not on the public repository's main/);
  });
  test("refuses an output with no verdict", () => {
    expect(preflight(fixture({ verdict: false }), onMain, clean).join()).toMatch(/gate has not passed/);
  });
  test("refuses a file changed after the gate passed", () => {
    const root = fixture();
    appendFileSync(join(root, ".vercel/output/static/observer/index.html"), "<!-- later -->");
    expect(preflight(root, onMain, clean).join()).toMatch(/static\/observer\/index\.html changed/);
  });
  test("refuses an output whose gate check fails now, verdict and all (REVIEW-059 S-5)", () => {
    const failing = () => [{ check: "csp", detail: "planted" }];
    expect(preflight(fixture(), onMain, failing).join()).toMatch(/the gate's check fails now: csp: planted/);
  });
  test("refuses a manifest whose read time no page shows (REVIEW-059 R1-7)", () => {
    expect(preflight(fixture({ readAt: "2026-01-01T00:00:00.000Z" }), onMain, clean).join()).toMatch(/footer does not state the manifest's provenance/);
  });
  test("reads the provenance from the footer, not from anywhere on the page (REVIEW-059 R3-5)", () => {
    const wrong = fixture({ page: (_p, h) => h.replace("validated ledger <!-- -->1<!-- -->", "validated ledger 9").replace("<body>", `<body><p hidden>Ledger values were read at validated ledger 1 on ${READ_AT}.</p>`) });
    expect(preflight(wrong, onMain, clean).join()).toMatch(/footer does not state the manifest's provenance/);
  });
  test("reads a footer split by inline markup as the reader sees it (REVIEW-059 R3-5)", () => {
    // Split INSIDE a value, as an inline element can be: a reader that put a
    // space where the tag was read "05: 22" and refused a correct footer.
    const split = fixture({ page: (_p, h) => h.replace(`${READ_AT}.</p>`, `${READ_AT.slice(0, 14)}<span>${READ_AT.slice(14)}</span>.</p>`) });
    expect(preflight(split, onMain, clean)).toEqual([]);
  });
  test("reads the endpoint from the source panel, not from a hidden copy (REVIEW-059 R3-5)", () => {
    const moved = fixture({ page: (_p, h) => h.replace(`<code>${HOSTED_ENDPOINT}</code>`, "<code>another public source</code>").replace("<body>", `<body><p hidden>read from ${HOSTED_ENDPOINT}</p>`) });
    expect(preflight(moved, onMain, clean).join()).toMatch(/source panel does not name https:\/\/s\.devnet/);
  });
  test("refuses a timestamp the calendar does not have (REVIEW-059 R3-6)", () => {
    expect(preflight(fixture({ manifest: (m) => (m.builtAt = "2026-99-99T99:99:99.999Z") }), onMain, clean).join()).toMatch(/builtAt .* is not a timestamp/);
  });
  test("requires every field the build writes (REVIEW-059 R3-6)", () => {
    for (const f of ["isolation", "environment", "canaries", "dockerContext"]) {
      expect(preflight(fixture({ manifest: (m) => delete m[f] }), onMain, clean).join()).toMatch(new RegExp(f));
    }
  });
  test("refuses a read time that is a substring of the page, not a timestamp (REVIEW-059 R2-4)", () => {
    const d = preflight(fixture({ readAt: "2" }), onMain, clean).join();
    expect(d).toMatch(/read time "2" is not a timestamp/);
    expect(d).toMatch(/does not state the manifest's provenance/);
  });
  test("refuses an endpoint that is not the hosted one (REVIEW-059 R2-4)", () => {
    expect(preflight(fixture({ manifest: (m) => (m.snapshot.endpoint = "https://s.altnet.rippletest.net:51234") }), onMain, clean).join()).toMatch(/endpoint .* is not https:\/\/s\.devnet/);
  });
  test("refuses a manifest with no image (REVIEW-059 R2-4)", () => {
    expect(preflight(fixture({ manifest: (m) => delete m.image }), onMain, clean).join()).toMatch(/image null is not a build image tag/);
  });
  test("refuses a ledger page that names another ledger than the manifest (REVIEW-059 R1-7)", () => {
    expect(preflight(fixture({ ledgerIndex: 2 }), onMain, clean).join()).toMatch(/\/observer names ledger 2, and the manifest records 1/);
  });
  test("asks GitHub for a comparison, and only 'identical' or 'ahead' is on main", () => {
    expect(onPublicMain("x", () => "ahead")).toBe(true);
    expect(onPublicMain("x", () => "identical")).toBe(true);
    for (const s of ["behind", "diverged", "error: Not Found"]) expect(onPublicMain("x", () => s)).toBe(false);
  });
});

describe("browser-check's server", () => {
  test("refuses a configuration it cannot model (REVIEW-059 R1-5)", () => {
    const root = fixture();
    const cfg = join(root, ".vercel/output/config.json");
    const c = JSON.parse(readFileSync(cfg, "utf8"));
    c.routes.splice(1, 0, { src: "/(.*)", headers: { "Content-Security-Policy": "default-src *" }, continue: true });
    writeFileSync(cfg, JSON.stringify(c));
    expect(() => serveOutput(root)).toThrow(/cannot model route 1/);
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
  /** A host that serves the output, with one misbehaviour applied to each response. */
  function misbehaving(root: string, change: (path: string, r: Response, body: ArrayBuffer) => Response | null) {
    const inner = serveOutput(root);
    const outer = Bun.serve({
      hostname: "127.0.0.1", port: 0,
      async fetch(req) {
        const path = new URL(req.url).pathname;
        const r = await fetch(`http://127.0.0.1:${inner.port}${path}`, { redirect: "manual" });
        const body = await r.arrayBuffer();
        return change(path, r, body) ?? new Response(body, { status: r.status, headers: r.headers });
      },
    });
    return { port: outer.port, stop: () => { outer.stop(true); inner.stop(true); } };
  }
  const withHeaders = (r: Response, h: Record<string, string | null>) => { const out = new Headers(r.headers); for (const [k, v] of Object.entries(h)) v === null ? out.delete(k) : out.set(k, v); return out; };

  test("sees a page served as text (REVIEW-059 R1-6)", async () => {
    const root = fixture();
    const s = misbehaving(root, (p, r, b) => (p.endsWith(".html") || !p.includes(".") ? new Response(b, { status: r.status, headers: withHeaders(r, { "content-type": "text/plain" }) }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/issuer: served as "text\/plain", not text\/html/); } finally { s.stop(); }
  });
  test("sees UTF-8 pages served under another charset (REVIEW-059 R2-5)", async () => {
    const root = fixture();
    const s = misbehaving(root, (p, r, b) => (p.endsWith(".html") || !p.includes(".") ? new Response(b, { status: r.status, headers: withHeaders(r, { "content-type": "text/html; charset=utf-16le" }) }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/served with charset "utf-16le"/); } finally { s.stop(); }
  });
  test("reads the charset a quoted parameter would hide (REVIEW-059 R3-7)", async () => {
    const root = fixture();
    const s = misbehaving(root, (p, r, b) => (p.endsWith(".html") || !p.includes(".") ? new Response(b, { status: r.status, headers: withHeaders(r, { "content-type": 'text/html; note=";charset=utf-8"; charset=utf-16le' }) }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/charset "utf-16le", which is utf-16le/); } finally { s.stop(); }
  });
  test("accepts UTF-8 under its other labels (REVIEW-059 R3-7)", async () => {
    const root = fixture();
    const s = misbehaving(root, (p, r, b) => (p.endsWith(".html") || !p.includes(".") ? new Response(b, { status: r.status, headers: withHeaders(r, { "content-type": "text/html; charset=utf8" }) }) : null));
    try { expect(await compareDeployed(root, `http://127.0.0.1:${s.port}`)).toEqual([]); } finally { s.stop(); }
  });
  test("sees a page that differs only at its trailing-slash route (REVIEW-059 R1-6)", async () => {
    const root = fixture();
    const s = misbehaving(root, (p, r) => (p === "/issuer/" ? new Response("<html>The holder is private from the issuer.</html>", { status: 200, headers: r.headers }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/issuer\/: the page served at its route differs/); } finally { s.stop(); }
  });
  test("sees the verdict served with an error status (REVIEW-059 R1-6)", async () => {
    const root = fixture();
    const s = misbehaving(root, (p, r, b) => (p === "/gate-verdict.json" ? new Response(b, { status: 500, headers: r.headers }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/gate-verdict\.json: HTTP 500/); } finally { s.stop(); }
  });
  test("sees an unknown path answered without the policy (REVIEW-059 R1-6)", async () => {
    const root = fixture();
    const s = misbehaving(root, (_p, r, b) => (r.status === 404 ? new Response(b, { status: 404, headers: withHeaders(r, { "Content-Security-Policy": null }) }) : null));
    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/an unknown path: Content-Security-Policy is null/); } finally { s.stop(); }
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
