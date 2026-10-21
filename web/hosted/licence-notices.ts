/**
 * The licence notices shipped with the hosted bundle, shared by the build's
 * plugin (`web/app/vite.hosted.config.ts`) and the gate, so both read one rule.
 *
 * ⚠ **Email addresses are removed from the shipped notices, and only those.**
 * seroval's MIT notice, which TanStack Start bundles, names its author's
 * personal address, and this repository does not republish personal addresses
 * (`check-no-secrets`'s email class). The project owner ruled on 2026-10-20 to
 * keep each notice and replace the address with a marker; the copyright line
 * keeps its year and holder (`CLAIMS.md` E-335). The gate checks that every
 * shipped notice is the package's own licence file with that one change.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const EMAIL_MARKER = "[email address removed; the package's own licence file carries it]";

/**
 * The licence file's opening lines, before the first notice. One constant, so
 * the gate can require the file to open with exactly this and nothing else
 * (`REVIEW-059` S-4: the region before the first notice was read by no check).
 */
export const LICENCE_FILE_HEADER = [
  "Third-party software in the W-CONF hosted demo's client bundle, with the licence",
  "each package ships. Collected at build time from the modules actually bundled.",
  `Email addresses in these notices are replaced with "${EMAIL_MARKER}".`,
  "",
];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

export function redactEmails(text: string): string {
  return text.replace(EMAIL, EMAIL_MARKER);
}

const LICENCE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md", "LICENCE"];

/** A package root's licence file, or null. */
export function licenceFileOf(root: string): string | null {
  return LICENCE_FILES.map((f) => join(root, f)).find(existsSync) ?? null;
}

/** The notice as it is shipped: the package's licence file, emails removed, trailing space trimmed. */
export function shippedNotice(root: string): string | null {
  const f = licenceFileOf(root);
  return f ? redactEmails(readFileSync(f, "utf8")).trimEnd() : null;
}
