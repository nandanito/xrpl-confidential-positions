/**
 * check-personas.ts — `.claude/agents/` is GENERATED from `docs/personas/`, and
 * until now nothing said so except prose.
 *
 * `CLAUDE.md`: *"`docs/personas/` is canonical. `.claude/agents/` is generated
 * from it — regenerate whenever a persona changes or the two will drift."*
 *
 * ⚠ **That convention was stated and never enforced, and `REVIEW-023` round two
 * is what it cost.** The C-5 count fix corrected *"27 validated transactions"* to
 * *"28 validated facility transactions"* in six documents including
 * `docs/personas/build-lead.md`, and left `.claude/agents/build-lead.md` — the
 * file a build-lead subagent is actually instantiated from. **The last stale
 * count in the tree was in the one file most likely to be read by something that
 * cannot check it.**
 *
 * ⚠ **The convention already had a TOOL and no CHECK.** `make sync-personas`
 * has existed all along and does exactly the right thing; nobody ran it. A tool
 * you have to remember is a convention, and this project's whole method is that
 * a convention with no falsifier decays. `sync-personas` is the fix,
 * `check-personas` is what tells you that you need it.
 *
 * ⚠ It also catches something `sync-personas` cannot: that target names its
 * three files **literally**, so a fourth persona would never be copied at all.
 * This walks the directory.
 *
 * It was a genuine miss rather than general drift, and that is exactly why a
 * gate is the right answer: the other two personas were byte-identical, so
 * nobody looking at the directory would have seen anything wrong.
 *
 * `CLAUDE.md`'s own standard, learned three times over: **a sweep recorded in
 * prose is a claim with no falsifier.** This is the falsifier.
 *
 * ⚠ **What this does NOT check.** That the personas are correct, that they agree
 * with `CLAUDE.md`, or that a persona exists for every agent. It checks one
 * thing: that the generated copy is the canonical file. A gate that claims more
 * than it measures is `CLAIMS.md` E-141's shape, which is what put the wrong
 * number in front of this project twice in two days.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";

const CANON = "docs/personas";
const GENERATED = ".claude/agents";

// ⚠ `README.md` is documentation ABOUT this directory, not a persona, and it has
// no generated counterpart by design. Named rather than pattern-matched, so that
// adding a second non-persona document is a deliberate act.
const NOT_A_PERSONA = ["README.md"];

const personas = readdirSync(CANON)
  .filter((f) => f.endsWith(".md") && !NOT_A_PERSONA.includes(f))
  .sort();
if (personas.length === 0) {
  console.error("check-personas: no personas found under docs/personas — that is itself wrong");
  process.exit(1);
}

let drifted = 0;
let missing = 0;

for (const name of personas) {
  const canonical = `${CANON}/${name}`;
  const generated = `${GENERATED}/${name}`;
  if (!existsSync(generated)) {
    console.error(`✗ ${generated} does not exist, but ${canonical} does`);
    missing++;
    continue;
  }
  const a = readFileSync(canonical, "utf8");
  const b = readFileSync(generated, "utf8");
  if (a === b) continue;

  drifted++;
  console.error(`✗ ${generated} has DRIFTED from ${canonical}`);
  // Show the drift rather than only announcing it: a gate that says "they
  // differ" and makes you go and look is a gate people stop running.
  const al = a.split("\n");
  const bl = b.split("\n");
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] === bl[i]) continue;
    console.error(`    line ${i + 1}`);
    console.error(`      canonical: ${al[i] ?? "(absent)"}`);
    console.error(`      generated: ${bl[i] ?? "(absent)"}`);
  }
}

// ⚠ A file under `.claude/agents/` with NO canonical source is the other
// direction of the same defect: something a session loads that no persona
// review has ever seen.
const orphans = existsSync(GENERATED)
  ? readdirSync(GENERATED).filter((f) => f.endsWith(".md") && !personas.includes(f))
  : [];
for (const o of orphans) {
  console.error(`✗ ${GENERATED}/${o} has no canonical source in ${CANON}/`);
}

if (drifted || missing || orphans.length) {
  console.error(
    `\nFAIL — ${drifted} drifted, ${missing} missing, ${orphans.length} orphaned. ` +
      `docs/personas/ is canonical: run 'make sync-personas'. Never edit the generated copy.`,
  );
  process.exit(1);
}

console.log(
  `check-personas: PASS — ${personas.length} personas, each byte-identical to its ` +
    `generated copy in ${GENERATED}. ⚠ Says nothing about whether a persona is CORRECT.`,
);
