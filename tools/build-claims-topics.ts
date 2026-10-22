/**
 * build-claims-topics.ts — topic views of `CLAIMS.md`, DERIVED.
 *
 *   bun run tools/build-claims-topics.ts            # write docs/claims/by-topic/
 *   bun run tools/build-claims-topics.ts --check    # fail if stale (the gate)
 *
 * ## Why this exists, and why it is not a split
 *
 * `docs/CLAIMS-INDEX.md` answers *"where is E-181?"*. It does not answer *"what
 * has this project learned about gates?"* — for that you need the register
 * grouped by subject, and the register is chronological.
 *
 * ⚠⚠ **THE ROWS ARE NOT MOVED, AND THAT IS A MEASURED DECISION, NOT TIMIDITY.**
 * ⚠⚠ **This paragraph quoted *"only ~20% belong to exactly one; 93 of 245 matched
 * four or more"* until `REVIEW-041`. Those numbers came from an exploratory
 * nine-topic pass over WHOLE ROWS that was then replaced by this twelve-topic
 * headline classifier, and three different figures were published for the same
 * measurement before anyone noticed the PREDICATE was never stated.** The run
 * output prints the distribution, with its predicate, derived where it is
 * computed. **About half the rows carry more than one topic.** E-203 is
 * a gate that false-passed *and* a miscount *and* a review finding *and* a
 * lesson about stripping string literals. **A physical split files such a row
 * under one topic and hides it from readers of the other three.** A generated
 * view lists it under all of them.
 *
 * Three further properties a move would cost, all measured on the register:
 *
 *   - **63% of rows cite another row**, 476 cross-references in total. Moving
 *     rows scatters those across files.
 *   - **Chronology is load-bearing.** *"Seventh instance of a wrong count"* is
 *     only legible because the register is append-only and in order.
 *   - Every gate that opens `CLAIMS.md` by path would need updating and
 *     **re-verifying by breaking it**. None needs to change here.
 *
 * ## How a row gets its topics
 *
 * A **lexical rule over the row's HEADLINE** — the leading bold run of the claim
 * cell — plus an explicit `OVERRIDES` list for rows the rules do not reach.
 *
 * ⚠ **The headline, not the whole row, and that is the instrument.** Matching
 * the full row put 80% of rows in 4+ topics, because an evidence cell mentions
 * everything: the gate, the review, the Devnet run and the secret. The headline
 * states what the row is *about*.
 *
 * ⚠⚠ **What this does NOT say.** A topic is a finding aid, not a judgement. It
 * does not say a row is true, that its grade is deserved, or that the topic set
 * is the right one. It is **LEXICAL, over a NAMED SET of patterns**, and a row
 * whose headline uses different vocabulary lands only where `OVERRIDES` puts it.
 * **The row is the authority — never cite a topic file.**
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { summarise, contentCells } from "./build-claims-index.ts";

const REPO = new URL("..", import.meta.url).pathname;
const SRC = join(REPO, "CLAIMS.md");
const OUTDIR = join(REPO, "docs/claims/by-topic");

/**
 * Same id shapes the index parses — `E-3a` and `R-6` included.
 *
 * ⚠⚠ **The space after the leading pipe is OPTIONAL in GFM.** Requiring it made
 * `|E-9999| … |` — a valid row — invisible to this generator AND to the index,
 * with every gate green (REVIEW-040 H2).
 */
const ROW = /^ {0,3}\|\s*(?:\*\*)?([A-Z]+-\d+[a-z]?)(?:\*\*)?\s*\|/;

interface Topic { slug: string; title: string; blurb: string; pattern: RegExp }

/**
 * ⚠ Order is display order only. Every rule is tested against every row; a row
 * belongs to as many topics as match it.
 */
const TOPICS: Topic[] = [
  { slug: "protocol-and-crypto", title: "Protocol and cryptography",
    blurb: "What XLS-0096 and the libraries actually do — field codes, sizes, proofs, encryption, the confidential balance model.",
    pattern: /nonce|ElGamal|sigma|Bulletproof|ed25519|secp256k1|keygen|proof|XLS-|MPT|amendment|homomorphic|transaction type|ZKProof|payload|confidential|encrypt|decrypt|clawback|issuer|balance|\bfield\b|byte|auditor|domain/i },
  { slug: "instruments-and-gates", title: "Instruments and gates",
    blurb: "Gates, tests and detectors — including the many that reported PASS while the thing they checked was broken.",
    pattern: /\bgate\b|gates|false[- ]pass|falsifier|\bcontrol\b|detector|revert|check-|\btest(s)? (that|which|was|were|named)|harness|sweep|flaky|suite/i },
  { slug: "review-rounds", title: "Review rounds and adjudication",
    blurb: "What adversarial rounds found, what legs got wrong, and what the two-round rule has cost and bought.",
    pattern: /\bleg(s)?\b|REVIEW-|round (one|two|three|four)|adjudicat|packet|reviewer|rotation|independent|adversarial/i },
  { slug: "claims-and-drift", title: "Claims, prose and drift",
    blurb: "Sentences that outran their evidence: stale notes, false disclosures, retracted claims and the documents that carried them.",
    pattern: /stale|false (sentence|claim|premise|disclosure|security)|overstat|retract|prose|disclosure|CLAUDE\.md|CLAIMS\.md|register|README|documentation|docs (say|claim)|walkthrough|comment|sentence|describ|legib|readab/i },
  { slug: "secret-handling", title: "Secret handling",
    blurb: "Keys, seeds and scalars — what wipes, what does not, and the residuals named rather than closed.",
    pattern: /zeroiz|wipe[ds]?|unwiped|secret|scalar|seed|entropy|\bCopy\b|\bdrop\b|custody|credential/i },
  { slug: "devnet-execution", title: "Devnet execution",
    blurb: "What was actually submitted and validated on standard Devnet, and what a `tesSUCCESS` does and does not establish.",
    pattern: /Devnet|validated|tesSUCCESS|receipt|executed|transaction hash|ledger|submit|node|mainnet/i },
  { slug: "counts-and-numbers", title: "Counts and numbers",
    blurb: "The project's most persistent failure mode: a number restated instead of derived.",
    pattern: /\bcount(s|ed|ing)?\b|miscount|restated|arithmetic|\bnumber\b|instance/i },
  { slug: "upstream-and-filings", title: "Upstream, libraries and filings",
    blurb: "rippled, mpt-crypto and the published packages — findings raised upstream and the build friction behind them.",
    pattern: /upstream|rippled|filing|issue #|mpt-crypto|XRPL-Standards|npm|library|vendor|conan|WASM|FFI|package/i },
  { slug: "confidentiality-limits", title: "Confidentiality limits",
    blurb: "What this system does not hide: the counterparty graph, timing, and every claim the register forbids.",
    pattern: /quantum|trustless|non-custodial|compliant|private from|hide|hidden|observer|public|anonym|counterparty|privacy|original research/i },
  { slug: "environment-and-tooling", title: "Environment and tooling",
    blurb: "The build environment, the ephemeral `/tmp/wconf` tree, and the session mechanics that have cost real work.",
    pattern: /rebuild-env|\/tmp\/wconf|state\.json|environment|bun build|type-check|typecheck|toolchain|cargo|manifest|feature/i },
  { slug: "decisions-and-scope", title: "Decisions, rulings and scope",
    blurb: "ADRs, decision requests and rulings — what was decided, what was reopened, and what a coding session may not choose.",
    pattern: /ADR-|decision|ruling|ruled|B-\d|scope|blocker|option [123AB]|superseded|reversal/i },
  { slug: "web-tier", title: "Web tier",
    blurb: "Architecture §6 step 8: the read-only Elysia/TanStack tier, its gate, and the boundary it does and does not move.",
    pattern: /web tier|web\/api|web\/app|ADR-0003|Elysia|TanStack|socket|browser|loopback|HTTP/i },
];

/**
 * Rows whose headline the rules do not reach, with the reason each is here.
 *
 * ⚠ **An override is a hand judgement and it can rot.** The generator FAILS if
 * an override names an id the register does not contain, or a topic slug that
 * does not exist — so a deleted row or a renamed topic is caught at the next
 * run rather than becoming a quietly wrong line in a published file.
 */
const OVERRIDES: Record<string, string[]> = {
  // ⚠ ONE ENTRY PER LINE, DELIBERATELY. These were packed several to a line
  // until 2026-09-05, when deleting a redundant entry pulled the next two up
  // onto a `//` comment and silently commented them out — caught only because
  // the completeness check then reported E-87 and E-90 as carrying no topic.
  // A mechanical edit to a packed line is a semantic change waiting to happen.

  // Bookkeeping rows whose headline is a pointer, not a statement.
  "E-76": ["decisions-and-scope"],

  // Process findings whose headline names no instrument by keyword.
  "E-87": ["review-rounds", "instruments-and-gates"],
  "E-90": ["review-rounds"],
  "E-93": ["review-rounds", "instruments-and-gates"],
  "E-95": ["review-rounds"],
  "E-96": ["review-rounds"],
  "E-111": ["review-rounds"],
  "E-113": ["instruments-and-gates"],
  "E-139": ["claims-and-drift"],
  "E-162": ["instruments-and-gates"],
  "E-172": ["claims-and-drift"],
  "E-185": ["claims-and-drift"],
  "E-197": ["instruments-and-gates"],
  "E-214": ["instruments-and-gates"],
  "E-97": ["environment-and-tooling"],
  // ⚠ E-250's headline names a lost revision entry and no instrument, no
  // document and no number. The rules reach it through none of their
  // vocabulary, which is exactly what OVERRIDES is for — rewording a claim to
  // satisfy a lexical classifier would be tuning the evidence to the tool.
  "E-250": ["claims-and-drift"],
  // E-324 is publication licensing, a subject no topic was built for; its
  // headline reaches none of the rules' vocabulary.
  "E-324": ["decisions-and-scope", "instruments-and-gates"],
  // E-337 records an owner's answer about the hosted demo's availability; its
  // headline names neither a ruling nor the web tier by keyword.
  "E-337": ["decisions-and-scope", "web-tier"],
  // E-340 records the owner's report of the deploy setup; its headline names
  // the host's settings, not the web tier by keyword.
  "E-340": ["decisions-and-scope", "web-tier"],
  // E-341 records two things the register missed at source; its headline names
  // the filings and a standard, not the drift by keyword.
  "E-341": ["claims-and-drift"],
  // E-342 is a review round on the hosted build and its gate; its headline
  // names the review and the release procedure, not the web tier by keyword.
  "E-342": ["web-tier", "instruments-and-gates"],
  // E-343 records the fixes to the hosted build's checks; its headline names
  // the review, not the web tier or a gate by keyword.
  "E-343": ["web-tier", "instruments-and-gates"],
  // E-344 records fixes that discharged half a finding; its headline names
  // the review's words, not the drift or the review round by keyword.
  "E-344": ["claims-and-drift", "web-tier"],
  // E-345 is round two of the hosted build's review; its headline names the
  // review, not the web tier or its gates by keyword.
  "E-345": ["web-tier", "instruments-and-gates"],
  // E-346 records round two's fixes to the hosted build's checks.
  "E-346": ["web-tier", "instruments-and-gates"],
  // E-347 is round three of the hosted build's review.
  "E-347": ["instruments-and-gates"],
  // E-348 records round three's fixes to the hosted build's checks.
  "E-348": ["web-tier", "instruments-and-gates"],
  // E-349 records the reviewed build's deploy; its headline names the demo
  // and the host, not the web tier by keyword, and its body strikes two
  // stale lines.
  "E-349": ["web-tier", "claims-and-drift"],
  // E-350's headline names the explainer and the overview, not the web tier,
  // a review or a gate by the words the patterns know.
  "E-350": ["web-tier", "review-rounds", "confidentiality-limits", "instruments-and-gates"],
  // E-351 likewise names the diagrams and pages, not the tier or the review by the patterns' words.
  "E-351": ["web-tier", "review-rounds", "instruments-and-gates"],
  // ⚠ E-256's headline is about a stale clause in another row and names no
  // instrument by keyword; the custody subject it settles is in the body.
  "E-256": ["claims-and-drift", "decisions-and-scope"],
  // ⚠ E-262's headline is about an edit that did not land; it names no
  // instrument, document or number the rules match on.
  "E-262": ["claims-and-drift", "environment-and-tooling"],

  // ⚠ E-17 and E-45 USED to be here and are not any more. E-17's headline was
  // "When set" until `headline()` stopped trusting a short bold lead
  // (REVIEW-040 M5); the rules reach both now, and the per-member redundancy
  // check FAILS if either is re-added.

  // Early protocol facts stated as bare measurements.
  "E-3a": ["protocol-and-crypto"],
  "E-56": ["upstream-and-filings"],

  // Prohibitions and retractions the rules miss.
  "P-7": ["claims-and-drift"],
  "R-1": ["confidentiality-limits"],
  "R-5": ["confidentiality-limits"],
  "R-7": ["confidentiality-limits"],

  // ⚠ E-268's headline opens with a STRIKETHROUGH, so `headline()` finds no bold
  // lead and falls back to the opening 200 characters — which carry the
  // retraction and not the subject. The gate and the drift are both in the body.
  "E-268": ["instruments-and-gates", "claims-and-drift"],
  // ⚠ E-271's headline says "an external review", and the rules match
  // "REVIEW-", "reviewer" and "legs" but not the bare word.
  "E-271": ["review-rounds", "instruments-and-gates"],
  // ⚠ E-282's headline is about a denylist of git variables becoming an
  // allowlist. The rules match "environment" and "toolchain"; the lead names
  // neither, and the tools it fixes are named only in the body.
  "E-282": ["environment-and-tooling", "instruments-and-gates"],
  // ⚠ E-280's headline is about GIT_DIR redirecting a probe into another
  // repository. The rules match "environment" and "toolchain", neither of which
  // the lead uses, and the lock it also fixes is named only in the body.
  "E-280": ["environment-and-tooling", "instruments-and-gates", "secret-handling"],
  // ⚠ E-279's headline names git SETTINGS breaking a tool. The rules match
  // "toolchain", "manifest" and "feature", none of which it uses, and the word
  // "gate" is in the body rather than the lead.
  "E-279": ["environment-and-tooling", "instruments-and-gates"],
  // ⚠ E-277's headline is about a handover naming a commit that does not exist.
  // The rules match "CLAUDE.md", "CLAIMS.md" and "stale", none of which it says;
  // the drift and the sha are both in the body.
  "E-277": ["claims-and-drift", "environment-and-tooling"],

  // Standing gaps.
  // ⚠ B-27's headline asks who holds a key, and since its 2026-09-13 ruling
  // opens "RULED", which the rules reach as a decision. "custody" and
  // "credential" are still only in the body, so secret-handling stays here.
  "B-27": ["secret-handling"],
  // B-28's headline asks whether the repository becomes public. The rules file
  // it under confidentiality-limits through "public" alone; the ruling and the
  // unfiled findings it waits on are in the body.
  "B-28": ["decisions-and-scope", "upstream-and-filings"],
  // E-290's headline is a review round withdrawing a recommendation; the rules
  // reach its subject and not the round. E-291's is a false reassurance, which
  // is drift in a document. E-292's is two records that did not reproduce, one
  // of them a restated count.
  "E-290": ["review-rounds"],
  "E-291": ["claims-and-drift"],
  "E-292": ["claims-and-drift", "counts-and-numbers"],
  "B-13": ["upstream-and-filings"],
  "B-17": ["protocol-and-crypto"],
  "B-18": ["decisions-and-scope"],
  "B-20": ["secret-handling"],
};

interface Entry { id: string; line: number; section: string; headline: string; grade: string; topics: string[] }

/**
 * The row's headline: the leading bold run of the claim cell, else its opening.
 *
 * ⚠ This is what the rules see. A row whose claim opens with unbolded prose
 * falls back to its first 200 characters, which is why `OVERRIDES` exists.
 */
/** A bold lead shorter than this says nothing on its own — see below. */
const MIN_HEADLINE = 40;

/**
 * The row's headline: the leading bold run of the claim cell, else its opening.
 *
 * ⚠⚠ **A NON-GREEDY FIRST BOLD RUN CAN THROW THE ROW AWAY.** `E-17` opens
 * `**When set**, \`sfDomainID\` on the \`MPTokenIssuance\` gates confidential
 * transfers…`, so this returned **`"When set"`** — nine characters carrying no
 * subject. It matched no topic, and the first repair was an `OVERRIDES` entry,
 * which asserts *the patterns do not reach this row* when the truth was *the
 * extractor discarded the row* (REVIEW-040 M5).
 *
 * A bold lead shorter than `MIN_HEADLINE` is treated as an opening clause
 * rather than a headline, and the surrounding text is taken instead.
 */
export function headline(claim: string): string {
  const flat = claim.replace(/⚠+/g, "").replace(/\s+/g, " ").trim();
  const bold = flat.match(/^\*\*(.+?)\*\*/);
  if (bold && bold[1].length >= MIN_HEADLINE) return bold[1];
  // Strip emphasis markers so a short lead and its continuation read as one.
  return flat.replace(/\*\*/g, "").slice(0, 200);
}

export function byRules(head: string): string[] {
  return TOPICS.filter((t) => t.pattern.test(head)).map((t) => t.slug);
}

export function classify(id: string, head: string): string[] {
  const hits = byRules(head);
  for (const extra of OVERRIDES[id] ?? []) if (!hits.includes(extra)) hits.push(extra);
  return hits;
}

export function parse(text: string): Entry[] {
  const out: Entry[] = [];
  let section = "(none)";
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^## (.+)$/);
    if (h) { section = h[1].replace(/[*`]/g, "").trim(); continue; }
    const m = lines[i].match(ROW);
    if (!m) continue;
    // ⚠ The SHARED splitter, so this file and the gate cut cells the same way.
    // ⚠⚠ This comment used to say *"a pipe inside a code span is content"*. It is
    // NOT — GFM splits on it, and that false belief cost five live rows
    // (REVIEW-041). Only `\|` is content (REVIEW-042).
    const cells = contentCells(lines[i]).map((c) => c.trim());
    const claim = cells[1] ?? "";
    const head = headline(claim);
    out.push({
      id: m[1], line: i + 1, section, headline: head,
      grade: summarise(cells.length >= 3 ? (cells[cells.length - 1] ?? "") : "", 22) || "—",
      topics: classify(m[1], head),
    });
  }
  return out;
}

function renderTopic(t: Topic, rows: Entry[]): string {
  const L = [
    `# ${t.title}`,
    "",
    "⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;",
    "`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.",
    "",
    t.blurb,
    "",
    "⚠ **A row may appear under several topics, and that is deliberate** — filing each",
    "row under exactly one would hide it from readers of the others. **The row in",
    "[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**",
    "",
    "⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the",
    "row's opening headline. **A point discussed only inside a row's evidence prose is",
    "invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *\"everything",
    "about secrets\"* and said they would fall back to grep. **They were right to.** For an",
    "exhaustive sweep, search `CLAIMS.md` directly.",
    "",
    `**${rows.length} rows.**`,
    "",
    "| id | section | headline | grade |",
    "|---|---|---|---|",
  ];
  for (const e of rows) {
    L.push(`| [${e.id}](../../../CLAIMS.md#L${e.line}) | ${shortSection(e.section)} | ${summarise(e.headline, 150)} | ${e.grade} |`);
  }
  L.push("");
  return L.join("\n");
}

function shortSection(s: string): string {
  return s.split("—")[0].trim().replace("Standing prohibitions", "Prohibitions")
    .replace("Findings", "Findings").replace("Pending", "Pending") || "—";
}

function renderReadme(entries: Entry[], byTopic: Map<string, Entry[]>): string {
  const L = [
    "# CLAIMS by topic",
    "",
    "⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;",
    "`make check-claims-topics` fails if these files drift from `CLAIMS.md`.",
    "",
    "[`CLAIMS.md`](../../../CLAIMS.md) is chronological and append-only. **These are views of",
    "it grouped by subject** — the rows are not moved, and a row appears under every topic",
    "it belongs to. [`docs/CLAIMS-INDEX.md`](../../CLAIMS-INDEX.md) answers *where is E-181*;",
    "these answer *what has this project learned about X*.",
    "",
    `**${entries.length} rows across ${byTopic.size} topics**, counted where they are parsed.`,
    "⚠ The topic counts below sum to more than the row count, because a row can carry",
    "several topics. That is the point of a view rather than a split.",
    "",
    "| topic | rows | what is in it |",
    "|---|---|---|",
  ];
  for (const t of TOPICS) {
    const rows = byTopic.get(t.slug) ?? [];
    L.push(`| [${t.title}](${t.slug}.md) | ${rows.length} | ${t.blurb} |`);
  }
  L.push("", "⚠ **A topic is a finding aid, not a judgement.** It says nothing about whether a",
    "row is true or its grade deserved. Assignment is **LEXICAL, over a NAMED SET** of",
    "patterns matched against each row's headline, plus an explicit override list in",
    "`tools/build-claims-topics.ts` for the rows the patterns do not reach.",
    "",
    "⚠⚠ **WHAT THESE VIEWS DO NOT DO** (`REVIEW-040`):",
    "",
    "- **They index HEADLINES, not row bodies.** A point made only inside a row's evidence",
    "  prose is invisible to every file here. **Grep `CLAIMS.md` for an exhaustive sweep.**",
    `- **\`protocol-and-crypto\` holds ${(byTopic.get("protocol-and-crypto") ?? []).length} of ${entries.length} rows.** A filter returning that share of the`,
    "  corpus has not narrowed much. It is disclosed rather than re-cut, because re-cutting",
    "  the taxonomy would invalidate the measurements this round was reviewed against.",
    "- **A row's topics are as good as its headline.** A row whose headline uses different",
    "  vocabulary lands only where the override list puts it.", "");
  return L.join("\n");
}

const text = readFileSync(SRC, "utf8");
const entries = parse(text);
if (entries.length === 0) {
  console.log("FAIL: parsed ZERO rows from CLAIMS.md — the topic views would be empty.");
  process.exit(1);
}

// --- completeness and staleness, before anything is written ----------------
const ids = new Set(entries.map((e) => e.id));
const slugs = new Set(TOPICS.map((t) => t.slug));
const problems: string[] = [];
for (const [id, ts] of Object.entries(OVERRIDES)) {
  if (!ids.has(id)) problems.push(`OVERRIDES names ${id}, which CLAIMS.md does not contain`);
  for (const t of ts) if (!slugs.has(t)) problems.push(`OVERRIDES[${id}] names unknown topic "${t}"`);
}
/**
 * ⚠⚠ **A REDUNDANT OVERRIDE IS A FALSE STATEMENT ABOUT THE RULES, AND ELEVEN OF
 * THE FIRST THIRTY-SEVEN BECAME ONE WITHIN AN HOUR.** Each entry asserts *the
 * patterns do not reach this row*. Widening a pattern can make that untrue, and
 * nothing would say so — the file would keep a hand-maintained list that no
 * longer does anything, which is the rot this project has recorded seventeen
 * times. **Deleting the line is the whole fix.**
 */
for (const [id, ts] of Object.entries(OVERRIDES)) {
  const e = entries.find((x) => x.id === id);
  if (!e) continue; // already reported above as naming a row that does not exist
  const rules = new Set(byRules(e.headline));
  if (ts.length === 0) {
    problems.push(`OVERRIDES[${id}] is EMPTY — it adds nothing. Delete the line.`);
    continue;
  }
  // ⚠⚠ **PER MEMBER, NOT PER ENTRY.** This used `ts.every(...)`, so an override
  // was flagged only when EVERY topic it named had become rule-covered. A
  // partially redundant entry — `E-111` naming `decisions-and-scope`, which its
  // "ADR-0002's second round…" headline already matches — sat undetected on the
  // clean tree (REVIEW-040 M4, mechanism from leg A, live instance from leg B).
  const dead = ts.filter((t) => rules.has(t));
  if (dead.length) {
    problems.push(
      `OVERRIDES[${id}] names ${dead.length} topic(s) the patterns ALREADY give it: ` +
        `${dead.join(", ")}. Remove ${dead.length === ts.length ? "the line" : "those entries"}.`,
    );
  }
}

const orphans = entries.filter((e) => e.topics.length === 0);
for (const o of orphans) problems.push(`${o.id} matches no topic — add a pattern or an OVERRIDES entry: ${o.headline.slice(0, 60)}`);
if (problems.length) {
  console.log(`FAIL: ${problems.length} problem(s) — every row must carry at least one topic.`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}

const byTopic = new Map<string, Entry[]>();
for (const t of TOPICS) byTopic.set(t.slug, []);
for (const e of entries) for (const t of e.topics) byTopic.get(t)!.push(e);

const files = new Map<string, string>();
files.set("README.md", renderReadme(entries, byTopic));
for (const t of TOPICS) files.set(`${t.slug}.md`, renderTopic(t, byTopic.get(t.slug)!));

if (process.argv.includes("--check")) {
  let stale: string[] = [];
  let present: string[] = [];
  try { present = readdirSync(OUTDIR).filter((f) => f.endsWith(".md")); } catch { /* absent */ }
  for (const [name, body] of files) {
    let cur = "";
    try { cur = readFileSync(join(OUTDIR, name), "utf8"); } catch { /* absent */ }
    if (cur !== body) stale.push(name);
  }
  // ⚠ A file left behind by a REMOVED topic is drift too, and byte-comparing
  // only the files we generate would never see it.
  for (const f of present) if (!files.has(f)) stale.push(`${f} (orphaned — no topic generates it)`);
  if (stale.length) {
    console.log(`FAIL: ${stale.length} topic file(s) STALE or orphaned: ${stale.join(", ")}`);
    console.log("      Rebuild them:  bun run tools/build-claims-topics.ts");
    process.exit(1);
  }
  console.log(`PASS: ${files.size} topic files match CLAIMS.md — ${entries.length} rows, every row carrying`);
  console.log(`      at least one of ${TOPICS.length} topics, regenerated and byte-compared.`);
  console.log("⚠ LEXICAL, over a NAMED SET of headline patterns plus an override list. It says");
  console.log("  the views are CURRENT — nothing about whether a row is true or well filed.");
} else {
  mkdirSync(OUTDIR, { recursive: true });
  for (const [name, body] of files) writeFileSync(join(OUTDIR, name), body);
  console.log(`wrote ${files.size} files to docs/claims/by-topic/ — ${entries.length} rows`);
  // ⚠⚠ **THE DISTRIBUTION IS PRINTED, NOT RESTATED.** Three different numbers
  // were given for "how many rows are single-topic" across two review rounds —
  // 113, 119 and 121 — and all three were right for a DIFFERENT predicate
  // (rules-only vs final assignment; which cohort; which commit). **A bare
  // number here is meaningless without its predicate** (`CLAIMS.md` E-236), so
  // the predicate is stated and the figure is computed where it is printed.
  const dist = new Map<number, number>();
  for (const e of entries) dist.set(e.topics.length, (dist.get(e.topics.length) ?? 0) + 1);
  const one = dist.get(1) ?? 0;
  const fourPlus = [...dist].filter(([k]) => k >= 4).reduce((n, [, v]) => n + v, 0);
  console.log(
    `\n  Topics per row — FINAL assignment (rules + overrides), ALL sections, this tree:`,
  );
  console.log(
    `    ${[...dist].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join("  ")}`,
  );
  console.log(
    `    exactly one topic: ${one} of ${entries.length} ` +
      `(${((100 * one) / entries.length).toFixed(1)}%)   four or more: ${fourPlus}`,
  );
  console.log(
    `  ⚠ The MULTI-topic rows — ${entries.length - one} of ${entries.length} ` +
      `(${((100 * (entries.length - one)) / entries.length).toFixed(1)}%) — are what a SPLIT` +
      `\n    would force into a single home. This line used to point at the SINGLETON` +
      `\n    share, which is the other side of the split (REVIEW-042). It is` +
      `\n    the number the design decision rests on, and it is derived here rather` +
      `\n    than quoted, because three different figures were published for it.`,
  );
  for (const t of TOPICS) console.log(`  ${String(byTopic.get(t.slug)!.length).padStart(4)}  ${t.slug}`);
}
