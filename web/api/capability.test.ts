/**
 * The capability matrix's citations must point at something that exists.
 *
 * ⚠ **`CLAIMS.md` E-203: a citation to a section that does not exist reads
 * exactly like a disclosure.** That row was written about a docstring citing a
 * `what this does not say` block that had never been written — `grep` found the
 * citation and nothing it pointed at. The matrix is *entirely* citations, so it
 * is the most exposed surface in this tier to that failure.
 */

import { test, expect, describe } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CAPABILITY_MATRIX, INVARIANTS } from "./capability.ts";

const REPO = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const CLAIMS = readFileSync(join(REPO, "CLAIMS.md"), "utf8");

/** Does a `REVIEW-nnn` / `ADR-nnnn` name a file that exists? */
function hasRef(ref: string): boolean {
  const dirs = ["docs/decisions", "docs/reviews"];
  for (const d of dirs) {
    try {
      if (readdirSync(join(REPO, d)).some((f) => f.startsWith(ref))) return true;
    } catch { /* directory absent — falls through to false */ }
  }
  return false;
}

/** Every `path/like/this.ext` or `path/like/this.ext:123` in a citation. */
function filePaths(citation: string): string[] {
  return [...citation.matchAll(/\b((?:[\w.-]+\/)+[\w.-]+\.(?:rs|ts|tsx|md|py|json))(?::\d+)?/g)].map((m) => m[1]);
}

/**
 * Named rulings, ADRs and issues — the third kind of citable target.
 *
 * ⚠ These are checked to EXIST as files or as text in the repository, not
 * merely to look like citations, because "looks like a citation" is exactly the
 * bar that let prose through.
 */
function rulingRefs(citation: string): string[] {
  return [...citation.matchAll(/\b(REVIEW-\d+[a-z]?|ADR-\d{4}|issue #\d+)\b/g)].map((m) => m[1]);
}

/**
 * External sources — a fourth citable kind, and the only one whose target this
 * repository cannot hold.
 *
 * ⚠ **Validated on the thing that actually matters for an external source: a
 * READ DATE.** `CLAIMS.md` P-3's habit generalises — an external corpus moves,
 * so a citation to one without the date it was read is a claim with no
 * falsifier. A bare domain does **not** count; `docs.crossmark.io (read
 * 2026-08-28)` does.
 */
function externalRefs(citation: string): string[] {
  if (!/\b(?:read|observed|checked)\s+\d{4}-\d{2}-\d{2}\b/i.test(citation)) return [];
  return [...citation.matchAll(/\b([a-z0-9-]+\.(?:app|io|dev|com|org|net))\b/gi)].map((m) => m[1]);
}

/** Everything in a citation that this test can actually go and check. */
export function resolvableTargets(citation: string): string[] {
  return [...filePaths(citation), ...registerRows(citation), ...rulingRefs(citation), ...externalRefs(citation)];
}

/** Every `E-nnn`, `F-nnn`, `P-nn`, `B-nn` register row a citation names. */
function registerRows(citation: string): string[] {
  return [...citation.matchAll(/\b([EFPBRU]-\d+)\b/g)].map((m) => m[1]);
}

/**
 * Every `KeySource::… => "token"` arm in the signer, **unfiltered**.
 *
 * ⚠ The match is anchored on `KeySource::` so it cannot pick up unrelated
 * string-returning arms elsewhere in the file — narrowing by SHAPE, not by a
 * whitelist of values already known.
 */
export function parseKeySourceTokens(src: string): string[] {
  return [...src.matchAll(/KeySource::\w+\s*=>\s*"([^"]+)"/g)].map((m) => m[1]);
}

const KEYGEN_SRC = readFileSync(join(REPO, "signer/src/onboarding.rs"), "utf8");
const keySourceTokens = () => [...new Set(parseKeySourceTokens(KEYGEN_SRC))];

const ALL_CAPS = CAPABILITY_MATRIX.flatMap((r) => [
  [r.id, "decryptOwnBalance", r.decryptOwnBalance] as const,
  [r.id, "proveAndSign", r.proveAndSign] as const,
  [r.id, "publicTransactions", r.publicTransactions] as const,
]);

describe("the matrix is not empty and covers what the signer supports", () => {
  // ⚠⚠ **THE FIRST VERSION FILTERED TO THE TWO TOKENS IT ALREADY KNEW, WHICH
  // MADE IT BLIND TO EXACTLY THE CHANGE IT EXISTS TO CATCH.** A third
  // `KeySource` arm would have been stripped before both the size assertion and
  // the coverage check, so the test stayed green while the matrix silently
  // omitted the new source — a regression test that cannot regress
  // (`CLAIMS.md` E-214). Every arm is now derived, unfiltered.
  test("every KeySource variant in the signer has a row — ALL arms, unfiltered", () => {
    const tokens = keySourceTokens();
    // A parse that finds nothing must fail loudly rather than pass vacuously.
    expect(tokens.length).toBeGreaterThan(0);
    const covered = new Set(CAPABILITY_MATRIX.map((r) => r.profileToken).filter(Boolean));
    for (const t of tokens) expect(covered).toContain(t);
  });

  test("...and the parser sees exactly the arms the signer defines today", () => {
    // ⚠ Stated as a fact about the tree, so adding an arm without a matrix row
    // fails the test above rather than drifting past it.
    expect(keySourceTokens().sort()).toEqual(["derived-from-master-seed", "standalone"]);
  });

  test("the parser CATCHES an added arm (verified by breaking it)", () => {
    const withThird = KEYGEN_SRC.replace(
      'KeySource::Standalone => "standalone",',
      'KeySource::Standalone => "standalone",\n            KeySource::Custodial => "custodial",',
    );
    expect(parseKeySourceTokens(withThird)).toContain("custodial");
  });

  test("there are rows the code does NOT support, and they are marked not built", () => {
    const notBuilt = CAPABILITY_MATRIX.filter((r) => !r.existsToday.built);
    expect(notBuilt.length).toBeGreaterThan(0);
    for (const r of notBuilt) expect(r.existsToday.where).toBeTruthy();
  });
});

describe("every citation resolves — E-203's shape", () => {
  for (const [rowId, field, cap] of ALL_CAPS) {
    // ⚠⚠ **THIS ASSERTED ONLY THAT THE STRING WAS LONGER THAN EIGHT
    // CHARACTERS.** When both parsers returned empty, the existence checks below
    // passed over nothing — so arbitrary prose satisfied a "citation" test, and
    // two live cells did exactly that (`CLAIMS.md` E-214). A citation must now
    // resolve to a FILE, a register row, or a named ruling/ADR.
    test(`${rowId}.${field} — its citation resolves to something checkable`, () => {
      expect(resolvableTargets(cap.citation)).not.toEqual([]);
    });

    test(`${rowId}.${field} — every FILE it names exists`, () => {
      const missing = filePaths(cap.citation).filter((f) => !existsSync(join(REPO, f)));
      expect(missing).toEqual([]);
    });

    test(`${rowId}.${field} — every RULING or ADR it names exists in the tree`, () => {
      const missing = rulingRefs(cap.citation).filter((r) => {
        if (r.startsWith("issue #")) return false; // GitHub issues are outside the tree, by nature.
        return !existsSync(join(REPO, "docs/decisions")) ? true : !hasRef(r);
      });
      expect(missing).toEqual([]);
    });

    test(`${rowId}.${field} — every REGISTER ROW it names exists in CLAIMS.md`, () => {
      const missing = registerRows(cap.citation).filter((r) => !new RegExp(`\\|\\s*${r}\\s*\\|`).test(CLAIMS));
      expect(missing).toEqual([]);
    });
  }

  test("PROSE with no target is NOT a citation (verified by breaking it)", () => {
    // ⚠ The exact shape that passed before: long enough, resolves to nothing.
    expect(resolvableTargets("a sound and well-reasoned argument, honestly")).toEqual([]);
    // ⚠ An external source with NO read date is not a citation either — the
    // corpus moves, so an undated reference has no falsifier (P-3's habit).
    expect(resolvableTargets("gemwallet.app API reference; docs.crossmark.io")).toEqual([]);
    expect(resolvableTargets("gemwallet.app API reference (read 2026-08-28)")).not.toEqual([]);
    expect(resolvableTargets("REVIEW-012 (derivation from master seed); ADR-0003 D2")).not.toEqual([]);
    expect(resolvableTargets("signer/src/keygen.rs")).not.toEqual([]);
    expect(resolvableTargets("CLAIMS.md E-117")).not.toEqual([]);
  });

  test("the detectors CATCH a bad citation (verified by breaking them)", () => {
    expect(filePaths("signer/src/nonexistent-file.rs").filter((f) => !existsSync(join(REPO, f)))).toHaveLength(1);
    expect(registerRows("CLAIMS.md E-99999").filter((r) => !new RegExp(`\\|\\s*${r}\\s*\\|`).test(CLAIMS))).toHaveLength(1);
  });

  test("...and do NOT fire on citations that resolve", () => {
    expect(filePaths("signer/src/keygen.rs").filter((f) => !existsSync(join(REPO, f)))).toEqual([]);
    expect(registerRows("CLAIMS.md E-117").filter((r) => !new RegExp(`\\|\\s*${r}\\s*\\|`).test(CLAIMS))).toEqual([]);
  });
});

describe("every invariant names a real standing prohibition or finding", () => {
  for (const inv of INVARIANTS) {
    test(`${inv.rule} exists in CLAIMS.md`, () => {
      expect(new RegExp(`\\|\\s*${inv.rule}\\s*\\|`).test(CLAIMS)).toBe(true);
    });
  }

  test("the four standing prohibitions this tier most risks are all present", () => {
    const rules = INVARIANTS.map((i) => i.rule);
    for (const r of ["P-4", "P-9", "P-10", "P-11"]) expect(rules).toContain(r);
  });
});
