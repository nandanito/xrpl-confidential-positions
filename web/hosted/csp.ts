/**
 * Inline-script hashes as a BROWSER computes them, shared by the output
 * assembler and the hosted gate so the two cannot disagree.
 *
 * ⚠ **A hash over the file's bytes is not the hash the browser checks.** The
 * HTML parser normalises line endings before tokenising and replaces every NUL
 * in script text with U+FFFD, and the policy is checked against the PARSED
 * text. TanStack Start's hydration script carries NUL bytes (`i:"\0\0"` in the
 * router's serialised state), so the first build hashed the raw bytes, the
 * browser refused the script on every page, and hydration failed. The gate
 * passed it; `web/hosted/browser-check.ts` caught it.
 */
import { createHash } from "node:crypto";

/** Every inline script's raw body in one HTML document. */
export function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/** The script's text after HTML input-stream preprocessing and script-data tokenisation. */
export function parsedScriptText(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/\u0000/g, "\uFFFD");
}

/** The CSP source expression that admits this inline script. */
export function scriptHash(raw: string): string {
  return `'sha256-${createHash("sha256").update(parsedScriptText(raw), "utf8").digest("base64")}'`;
}
