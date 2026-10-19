/**
 * custody-disclosure.test.ts — B-27's ruling, as a text that must stay complete.
 *
 * The project owner ruled on 2026-09-13 that the custody risk is accepted by
 * name, with a printed disclosure. `REVIEW-046` found that the request behind
 * the ruling named one key when several holders act on the float, and
 * `REVIEW-047` found a second freeze mechanism and two facts worth stating so
 * their absence is not read as an omission.
 *
 * ⚠ **It checks AFFIRMATIVE phrases, so a negation fails.** The first version
 * checked noun phrases, and `REVIEW-047` showed that *"cannot erase with a
 * confidential clawback and cannot freeze it"* kept every one of them. A phrase
 * that carries its verb ("can erase", "It can freeze it") does not survive
 * "cannot". It still asserts presence and not absence: a test that bans words
 * fires on the sentences that deny them.
 *
 * ⚠ **It knows only the powers listed below.** A power nobody has found is not
 * in the list, and this test cannot see it.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { CUSTODY_DISCLOSURE } from "../src/custody.ts";

/** What the text must say, holder by holder, with the finding that requires it. */
const REQUIRED: { who: string; must: string[] }[] = [
  {
    who: "the Dedicated Account's seed (REVIEW-046 H2)",
    must: [
      "The Dedicated Account's seed moves the whole float and reads every drawdown and repayment amount",
      "derives the ElGamal secret that the proof in every drawdown and every retirement requires",
    ],
  },
  {
    who: "the holder's ElGamal secret (REVIEW-046 H2)",
    must: ["That ElGamal secret cannot be rotated, and losing it locks the confidential balance for good"],
  },
  {
    who: "the issuer's signing credential (REVIEW-046 H1, REVIEW-047 F3)",
    must: [
      "The bank, as issuer, can erase the Dedicated Account's confidential balance with a confidential clawback",
      "It can freeze it by enabling a lock and setting it, or by requiring authorisation",
      "Neither needs the Dedicated Account's seed",
      "have not been exercised here",
    ],
  },
  {
    who: "the issuer's ElGamal secret (REVIEW-046 H3)",
    must: ["The issuer's ElGamal secret reads every amount and every balance in the issuance"],
  },
  {
    who: "the facility book (REVIEW-046 H3, REVIEW-047 F9)",
    must: ["facility-book.json holds every confidential movement's amount and every expected balance in plaintext"],
  },
  {
    who: "the ledger source (REVIEW-046 L2)",
    must: ["Whoever controls the ledger source can make the signer encrypt an amount"],
  },
  {
    who: "a same-user reader of the state file (REVIEW-047 F5)",
    must: ["so does anything running as this user that can read ~/.wconf/facility-state.json"],
  },
  {
    who: "suppliers and receiving accounts, stated as not powers over the float (REVIEW-047 F1)",
    must: [
      "each supplier's seed reads and moves only that supplier's own balance and amounts",
      "can refuse transfers into itself",
    ],
  },
];

/** The disclosure is wrapped for a terminal; the phrases are checked unwrapped. */
function missing(text: string): string[] {
  const flat = text.replace(/\s+/g, " ");
  return REQUIRED.flatMap((r) => r.must.filter((m) => !flat.includes(m)).map((m) => `${r.who}: ${m}`));
}

describe("the custody disclosure says what each holder can do", () => {
  test("CONTROL: the same check refuses the negated rewrite REVIEW-047 used", () => {
    const negated = CUSTODY_DISCLOSURE.replace("can erase", "cannot erase").replace(
      "It can freeze it",
      "It cannot freeze it",
    );
    expect(missing(negated).length).toBeGreaterThanOrEqual(2);
  });

  for (const r of REQUIRED) {
    test(r.who, () => {
      expect(missing(CUSTODY_DISCLOSURE).filter((m) => m.startsWith(`${r.who}:`))).toEqual([]);
    });
  }

  test("it cites the ruling and the standing prohibition", () => {
    const flat = CUSTODY_DISCLOSURE.replace(/\s+/g, " ");
    expect(flat).toContain("B-27");
    expect(flat).toContain("P-5");
  });
});

/**
 * The first statement of a module after its header comment and its imports.
 *
 * ⚠ LEXICAL, and fitted to how `run-facility.ts` is written: one header block
 * comment, single-line imports, then code. An import with a top-level side effect
 * that exits would still skip the print, and nothing here checks that.
 */
function firstStatement(source: string): string {
  const lines = source.split("\n");
  let inBlock = false;
  for (const raw of lines) {
    const l = raw.trim();
    if (inBlock) {
      if (l.includes("*/")) inBlock = false;
      continue;
    }
    if (l.startsWith("/*")) {
      inBlock = !l.includes("*/");
      continue;
    }
    if (l === "" || l.startsWith("//") || l.startsWith("#!") || /^import\b.*from\s+"[^"]+";$/.test(l)) continue;
    return l;
  }
  return "";
}

describe("the run prints it before anything else can happen", () => {
  const run = readFileSync(new URL("../run-facility.ts", import.meta.url), "utf8");
  const PRINT = "console.log(`\\n${CUSTODY_DISCLOSURE}`);";

  test("CONTROL: the same detector refuses a print that something runs before", () => {
    const later = 'import { x } from "./x.ts";\nconst AUTO = process.argv.includes("--a");\n' + PRINT;
    expect(firstStatement(later)).not.toBe(PRINT);
    expect(firstStatement('/**\n * header\n */\nimport { x } from "./x.ts";\n\n' + PRINT)).toBe(PRINT);
  });

  test("run-facility.ts prints it as its first statement, before any die()", () => {
    expect(firstStatement(run)).toBe(PRINT);
  });
});
