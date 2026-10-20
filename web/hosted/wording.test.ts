/**
 * The hosted page renders the ruled text, not a paraphrase of it.
 *
 * `ADR-0004` D-H2 was accepted by the project owner with this wording "as
 * written" (`CLAIMS.md` E-331), and its "Devnet resets" section gives the reset
 * sentence. Both are read from the ADR itself, so editing either side alone
 * fails here.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DH2_WORDING } from "../app/src/hosted/wording.ts";

const ADR = readFileSync(join(import.meta.dir, "../../docs/decisions/ADR-0004-hosted-demo-trust-boundary.md"), "utf8");

/** The ADR's blockquoted paragraphs, unwrapped, without the italics. */
function quoted(): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  for (const line of ADR.split("\n")) {
    if (line.startsWith("> ")) { cur.push(line.slice(2).trim()); continue; }
    if (line === ">") { if (cur.length) out.push(cur.join(" ")); cur = []; continue; }
    if (cur.length) { out.push(cur.join(" ")); cur = []; }
  }
  return out.map((p) => p.replace(/^\*|\*$/g, ""));
}

describe("ADR-0004 D-H2: the accepted wording", () => {
  test("the ADR still carries the blockquotes this test reads", () => {
    expect(quoted().length).toBeGreaterThanOrEqual(3);
  });

  test("every hosted paragraph is one of the ADR's, word for word", () => {
    const q = quoted();
    for (const para of DH2_WORDING) expect(q).toContain(para);
  });

  test("both D-H2 paragraphs are rendered, and only the H3 form", () => {
    expect(DH2_WORDING.length).toBe(2);
    // The H1 sentence names a node the browser connects to; under H3 there is none.
    expect(DH2_WORDING.join(" ")).not.toMatch(/Your browser also connects/);
  });

  test("the reset sentence the observer page renders is the ADR's", () => {
    const page = readFileSync(join(import.meta.dir, "../app/src/hosted/LedgerReading.tsx"), "utf8");
    const reset = quoted().find((p) => p.startsWith("This account does not exist on Devnet at ledger N."))!;
    expect(reset).toBeDefined();
    const rendered = reset.replace("ledger N.", "ledger ${n}.");
    expect(page).toContain(rendered);
  });
});
