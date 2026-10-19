/**
 * redact-review-fixtures.ts — replace the synthetic secrets a review leg planted,
 * in that leg's own transcript, with a marker.
 *
 *   bun run tools/redact-review-fixtures.ts [--write] docs/reviews/<file>...
 *
 * # Why this exists
 *
 * A review of `make check-no-secrets` has to plant secret-shaped values to break
 * it: random seeds, labelled scalars, credentials, other people's home paths. Its
 * transcript then fails the gate, correctly. `REVIEW-056` round two's transcript
 * carried 37 random-entropy seeds and 225 synthetic paths. The gate must not be
 * weakened to accept them, so they are redacted here instead, and the redaction
 * is recorded.
 *
 * # What it refuses
 *
 * * **Any file outside `docs/reviews/`.** Anywhere else a secret-shaped value is
 *   presumed real, and the remedy is to rotate it and remove it, not to hide it
 *   behind a marker.
 * * **Any value from the real local secret store.** A real secret in a transcript
 *   is an incident, not a fixture, so the run stops and names the file.
 *
 * It uses the gate's own `scanText()`, so it redacts exactly what the gate would
 * fail on and nothing else. Dry run by default.
 */

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { defaultStorePaths, loadStore, scanText, secretFileHit } from "./check-no-secrets.ts";

const REVIEWS = realpathSync(join(import.meta.dir, "..", "docs", "reviews"));
/**
 * ⚠ **Resolved, not lexical** (`REVIEW-056` R3-5). The first version checked that
 * the argument STARTED with `docs/reviews/`, so `docs/reviews/../../tools/x`
 * passed and a credential outside the reviews was hidden behind a marker.
 */
const insideReviews = (f: string) => { try { return realpathSync(f).startsWith(REVIEWS + "/"); } catch { return false; } };

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const files = argv.filter((a) => !a.startsWith("--"));
  if (!files.length) { console.log("usage: redact-review-fixtures.ts [--write] docs/reviews/<file>..."); process.exit(2); }
  const outside = files.filter((f) => !insideReviews(f));
  if (outside.length) { console.log(`REFUSED: outside docs/reviews/: ${outside.join(", ")}. A secret there is presumed real.`); process.exit(2); }
  const store = loadStore(defaultStorePaths());
  if (!store.secrets) { console.log("REFUSED: no local secret store, so a real secret could not be told from a fixture"); process.exit(2); }
  let total = 0;
  for (const f of files) {
    const text = readFileSync(f, "latin1");
    const hits = scanText(text, store).filter((h) => !h.allowedBy);
    if (hits.some((h) => h.cls === "known-value")) { console.log(`REFUSED: ${f} contains a value from the real secret store. Rotate it; do not redact it.`); process.exit(2); }
    // Replace from the end, skipping any span that overlaps one already replaced.
    const spans = hits.filter((h) => h.len).sort((a, b) => b.at - a.at);
    let out = text, floor = Infinity;
    const counts = new Map<string, number>();
    for (const h of spans) {
      if (h.at + h.len! > floor) continue;
      out = out.slice(0, h.at) + `[synthetic ${h.cls} redacted]` + out.slice(h.at + h.len!);
      floor = h.at;
      counts.set(h.cls, (counts.get(h.cls) ?? 0) + 1);
    }
    // ⚠ A file NAME the gate fails on cannot be redacted, so it is reported as
    // left rather than as "nothing" (R3-6).
    const nameHit = secretFileHit(relative(join(REVIEWS, "..", ".."), realpathSync(f)));
    const left = scanText(out, store).filter((h) => !h.allowedBy).length + (nameHit ? 1 : 0);
    if (nameHit) console.log(`${f}: its NAME fails the gate (${nameHit.why}); rename it, redaction cannot fix that`);
    const n = [...counts.values()].reduce((a, b) => a + b, 0);
    total += n;
    console.log(`${f}: ${[...counts].map(([k, v]) => `${k} ${v}`).join(", ") || "nothing"}; ${left} left`);
    if (write && n) writeFileSync(f, out, "latin1");
    if (left) process.exitCode = 1;
  }
  console.log(`${write ? "redacted" : "would redact"} ${total} span(s)`);
}
