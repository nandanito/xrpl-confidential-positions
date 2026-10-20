/**
 * Assembles the hosted demo's upload: Vercel's Build Output API, version 3,
 * with STATIC FILES ONLY (`ADR-0004`, D-H4 ruled A: the prebuilt output is
 * what is deployed).
 *
 * ⚠ **No `functions/` directory is ever written, and `config.json` routes only
 * to files.** Code of ours running per request is `ADR-0004` rotation trigger 1;
 * the hosted gate checks both from the output, not from this file.
 *
 * ⚠ **The Content Security Policy is delivered by `config.json`'s headers**,
 * because a policy set only on a development server does not configure the CDN
 * (`REVIEW-058` R1-8). The framework emits inline scripts for hydration, and
 * each is admitted by its SHA-256 hash rather than by `'unsafe-inline'`.
 *
 *   bun run web/hosted/vercel-output.ts <vite client dir> <output root>
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { HOSTED_PAGES } from "./pages.ts";
import { inlineScripts, scriptHash } from "./csp.ts";

/** The pages below the root, each a directory's index.html. */
const PAGES = HOSTED_PAGES.filter(Boolean);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}


/** The policy, given every inline script the pages carry. Exported for the gate. */
export function contentSecurityPolicy(hashes: string[]): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${[...new Set(hashes)].sort().join(" ")}`.trim(),
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function assemble(clientDir: string, root: string): { files: number; hashes: number } {
  if (!existsSync(join(clientDir, "index.html"))) throw new Error(`${clientDir} has no index.html; is it the hosted build's client output?`);
  for (const p of PAGES) {
    if (!existsSync(join(clientDir, p, "index.html"))) throw new Error(`the page /${p} was not prerendered`);
  }
  const out = join(root, ".vercel", "output");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "static"), { recursive: true });
  cpSync(clientDir, join(out, "static"), { recursive: true, dereference: false });

  const files = walk(join(out, "static"));
  const hashes = files.filter((f) => f.endsWith(".html")).flatMap((f) => inlineScripts(readFileSync(f, "utf8")).map(scriptHash));

  const headers = {
    "Content-Security-Policy": contentSecurityPolicy(hashes),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  };
  const config = {
    version: 3,
    routes: [
      { src: "/(.*)", headers, continue: true },
      // Each page is a directory's index.html; named explicitly rather than
      // relying on the host's directory-index behaviour.
      ...PAGES.map((p) => ({ src: `^/${p}/?$`, dest: `/${p}/index.html` })),
      { handle: "filesystem" },
    ],
  };
  writeFileSync(join(out, "config.json"), JSON.stringify(config, null, 2) + "\n");
  return { files: files.length, hashes: new Set(hashes).size };
}

if (import.meta.main) {
  const [clientDir, root] = process.argv.slice(2);
  if (!clientDir || !root) throw new Error("usage: bun run web/hosted/vercel-output.ts <vite client dir> <output root>");
  const r = assemble(clientDir, root);
  console.log(`assembled ${relative(process.cwd(), join(root, ".vercel/output"))}: ${r.files} static files, ${r.hashes} inline-script hashes in the policy`);
}
