/**
 * The policy admits each inline script by the hash a BROWSER computes.
 */
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { inlineScripts, parsedScriptText, scriptHash } from "./csp.ts";
import { contentSecurityPolicy } from "./vercel-output.ts";

const b64 = (s: string) => createHash("sha256").update(s, "utf8").digest("base64");

describe("parsed script text", () => {
  test("NUL becomes U+FFFD, as the HTML tokeniser emits it", () => {
    expect(parsedScriptText("a\u0000b")).toBe("a�b");
  });
  test("CRLF and a lone CR become LF, as input-stream preprocessing does", () => {
    expect(parsedScriptText("a\r\nb\rc")).toBe("a\nb\nc");
  });
  test("the hash of a script carrying NUL is NOT the hash of its bytes", () => {
    const raw = "x='\u0000'";
    expect(scriptHash(raw)).toBe(`'sha256-${b64("x='�'")}'`);
    expect(scriptHash(raw)).not.toBe(`'sha256-${b64(raw)}'`);
  });
  test("an external script is not an inline one", () => {
    expect(inlineScripts('<script src="/a.js"></script><script>b()</script>')).toEqual(["b()"]);
  });
});

describe("the policy", () => {
  const csp = contentSecurityPolicy(["'sha256-x'", "'sha256-x'"]);
  test("connects to its own origin only, and admits no inline code but by hash", () => {
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("script-src 'self' 'sha256-x';");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|https?:/);
  });
  test("refuses objects, base URIs, form posts and framing", () => {
    for (const d of ["object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'"]) expect(csp).toContain(d);
  });
});
