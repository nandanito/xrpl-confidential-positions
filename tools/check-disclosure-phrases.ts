/**
 * check-disclosure-phrases.ts — no LIVE file may assert a retracted DISCLOSURE.
 *
 * # Why this exists
 *
 * ⚠⚠ **Across four review rounds on 2026-09-01/02 the dominant defect was ONE
 * shape: a correction reaching the instance someone was looking at, and not the
 * PHRASE.** Measured, after each was "fixed":
 *
 * * *"It hides AMOUNTS. It hides nothing else"* survived at **six** sites —
 *   the signer constant, its own test, the README, both walkthroughs and the
 *   demo script. ⚠ **And `CLAIMS.md` E-136 had already corrected exactly this
 *   claim at the Convert confirmation once before.**
 * * *"neither is constructible from anywhere under `web/`"* at **three**.
 * * *"Four gates … false-passed"* at **five** — E-222 recorded the miscount and
 *   fixed one site.
 * * *"Naming an auditor is permanent"* was still standing in **`ADR-0001`,
 *   which is `Accepted`**.
 *
 * ⚠ **`CLAUDE.md` carries three separate clauses of advice about grepping the
 * phrase rather than the line. All three are advice, and advice is what kept
 * failing.** The one mechanism that ever ended this class here is
 * `check-zeroize-bounds.py` part 4 — a phrase sweep with a falsifier. This is
 * its sibling, for disclosures rather than for the B-19 premise.
 *
 * # What it does NOT say
 *
 * 1. **It is LEXICAL and over a NAMED SET.** A retracted claim reworded is
 *    invisible to it. It catches copies, not paraphrases.
 * 2. **It cannot tell whether a claim is TRUE** — only whether a string this
 *    project has retracted is being asserted somewhere it should not be.
 * 3. **`docs/reviews/` is EXEMPT and must stay so.** A review packet is the
 *    record of what a leg was shown; editing it after the fact makes the round
 *    unreviewable. Same rule as part 4.
 * 4. **This file is exempt from itself.** It necessarily contains every phrase.
 *    Stated rather than left as an accident of the marker window.
 * 5. **It reads text, not a rendering.** It joins lines, and drops a leading
 *    blockquote, comment or bullet marker and JSX's `{" "}`; a tag, an entity,
 *    emphasis or any other markup between two words of a phrase still hides a
 *    copy (`REVIEW-058` R3-5, `CLAIMS.md` E-330). Joining lines also means a
 *    TRUE sentence wrapped to contain a phrase is now rejected, which is the
 *    loud direction.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

interface Retracted {
  /** The exact string a live file must not assert. */
  phrase: string;
  /** Why it was retracted — printed when the gate fails. */
  why: string;
  /** Tokens that mark a hit as a RECORDED retraction rather than an assertion. */
  markers: string[];
  /**
   * The occurrence ITSELF must sit inside a `~~` strike; a strike elsewhere in
   * the window does not forgive it. Added 2026-10-22 for R-9, whose row promises
   * the old wording is refused "unless it is struck beside this id": `REVIEW-062`
   * round two showed an unrelated `~~note~~` or "no longer" nearby forgave an
   * unstruck copy. Older entries keep the window rule, which the gate prints.
   */
  ownStrike?: boolean;
}

/**
 * ⚠ **Markers are PER PHRASE and deliberately tight.** `check-zeroize-bounds`
 * part 4 forgives a hit near any `⚠`, and this repository puts `⚠` on roughly
 * every third line — so that window forgives almost anything. **Over-forgiving
 * is the unsafe direction for a gate that enforces an absence** (E-203's
 * two-consumers lesson), so each entry names the row that retracted it.
 */
const RETRACTED: Retracted[] = [
  // ⚠ **ADDED 2026-10-19 BY `REVIEW-058` ROUND ONE (`CLAIMS.md` E-328).** The
  // front page promised the issuer view showed the holder *"decrypted"* for six
  // weeks after E-241 removed the figure, two lines below a paragraph saying
  // the opposite; and the wallet page said three reasons *"cannot be closed by
  // any release"* fifty lines after saying a wallet that held the key would.
  // ⚠ **ADDED BY `REVIEW-058` ROUND THREE (`CLAIMS.md` E-330).** The same
  // permanence claim, in the wallet page's conclusion and the walkthrough, and
  // in the capability matrix's comment, found by the last round's sweep.
  {
    phrase: "So the operation cannot be assembled at all",
    why: "Scoped to the wallets examined: a wallet that held the viewing key and produced the proofs itself would close it; E-330.",
    markers: ["E-330", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "no wallet update can close them",
    why: "A wallet that held the viewing key and produced the proofs itself would close them; E-330.",
    markers: ["E-330", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "the same holder, decrypted",
    why: "The issuer view has reported only whether a balance decrypted since 2026-09-05 (E-241); E-328.",
    markers: ["E-328", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "three reasons above cannot be closed by any release",
    why: "A wallet that held the viewing key and produced the proofs itself would close all three reasons; E-328.",
    markers: ["E-328", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "reasons 1–3 are **structural** and cannot be closed by any wallet update",
    why: "A wallet that held the viewing key and produced the proofs itself would close all three reasons; E-328.",
    markers: ["E-328", "~~", "STRUCK", "RETRACTED"],
  },
  // ⚠⚠ **THE EMPHASIS-GATE ROUNDS, ADDED BY `REVIEW-045`.** Three rounds each
  // corrected a sentence at the site somebody was looking at, and the next
  // round found it standing elsewhere: *"a crash cannot print this line"* in
  // the file that prints it, *"795 marks"* in two documents after the row was
  // corrected, *"nine shapes"* in three. **Advice is what kept failing**
  // (`CLAIMS.md` E-224); this is the falsifier (E-261).
  {
    phrase: "A crash cannot print this line, so a caller",
    why: "a crash CAN print it — only not LAST. REVIEW-045, CLAIMS.md E-261",
    markers: ["E-261", "E-259", "~~", "STRUCK", "RETRACTED", "LAST"],
  },
  {
    phrase: "795 marks",
    why: "the unit is contiguous runs, not marks, and the figure was stale when written (E-258, E-259)",
    markers: ["E-258", "E-259", "E-261", "~~", "STRUCK", "RETRACTED", "runs"],
  },
  {
    phrase: "on nine shapes",
    why: "the cmark-gfm differential is thirteen shapes and a committed control (E-259, E-261)",
    markers: ["E-259", "E-261", "~~", "STRUCK", "RETRACTED", "thirteen"],
  },
  {
    phrase: "every one of them is named in the printed disclosure",
    why: "the disclosure named none of them — a citation to a disclosure that does not exist (E-261)",
    markers: ["E-261", "E-203", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "It hides AMOUNTS. It hides nothing else",
    why: "Convert and ConvertBack publish MPTAmount in plaintext; Send and MergeInbox publish none (E-224, F-24)",
    markers: ["E-224", "E-136", "F-24", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "hides amounts. It hides nothing else",
    why: "same claim, lower-cased — the walkthrough and demo-script spelling (E-224)",
    markers: ["E-224", "E-136", "F-24", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "neither is constructible from anywhere under `web/`",
    why: "the Pair/Prepare scan covers web/api only, not the whole tier (E-224)",
    markers: ["E-224", "E-168", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "Naming an auditor is permanent",
    why: "a corpus-wide negative with no recorded search — P-12 forbids it (E-222, E-224)",
    markers: ["E-222", "E-224", "P-12", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "There is no dedicated Confidential Devnet",
    why: "the existence search was never run; say 'not needed and not used' (E-224, P-12)",
    markers: ["E-224", "P-12", "~~", "STRUCK", "RETRACTED", "never searched", "never run"],
  },
  {
    phrase: "Four gates in this repository were built to catch false passes",
    why: "four gates over five citations — the miscount E-222 recorded and fixed at one site (E-224)",
    markers: ["E-222", "E-224", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "Proof formats have **not** drifted",
    why: "two sample points are not a no-drift proof; intermediate revisions were never checked (E-224)",
    markers: ["E-224", "~~", "STRUCK", "RETRACTED", "NOT checked"],
  },
  // --- retracted 2026-09-02 by REVIEW-036 (E-230). ADR-0003's central claim.
  // ⚠ Three spellings, because the claim was written as one sentence and is
  // quoted in halves. E-168's rule: a corrected sentence is a STRING, and
  // strings have copies.
  {
    phrase: "grants no authority that did not already exist",
    why: "premise 2 equivocates: holding no credential is not conveying nothing a credential produces; the tier served decrypted balances and a 0600 file's contents to any local uid until E-241 removed them on 2026-09-05 (E-228, E-230)",
    markers: ["E-228", "E-230", "~~", "STRUCK", "RETRACTED"],
  },
  {
    phrase: "so no trust boundary moves",
    why: "a trust boundary also governs confidentiality, transport exposure and presentation integrity; a DISCLOSURE boundary moved (E-228, E-230)",
    markers: ["E-228", "E-230", "~~", "STRUCK", "RETRACTED"],
  },
  // --- retracted 2026-09-04 by REVIEW-039 (E-239). Paraphrases of E-230 that
  // survived in LIVE SOURCE because the gate matches copies, not restatements.
  {
    phrase: "reaches exactly what a `curl` against a public node reaches",
    why: "the same process served a decrypted issuer snapshot and signer-local status until E-241 on 2026-09-05; neither is on a public node (E-239)",
    markers: ["E-239", "E-230"],
  },
  {
    phrase: "none of it exceeds what the protocol already publishes",
    why: "the store's entry count includes cancelled, failed and aborted attempts no observer can reconstruct (store.rs:753-756, E-239)",
    markers: ["E-239", "E-230"],
  },
  {
    phrase: "none of it exceeds what",
    why: "any restatement of the E-230 premise about signer-local state being already-public (E-239)",
    markers: ["E-239", "E-230"],
  },
  {
    phrase: "activity metadata of exactly the kind the protocol leaves public",
    why: "Store::len() counts cancelled confirmations, failed proofs and aborted attempts, which public ledger history cannot reveal (store.rs:753-756, E-230)",
    markers: ["E-230", "~~", "STRUCK", "RETRACTED"],
  },
  // --- retracted 2026-10-22 by REVIEW-062 (R-9). True as the register meant it,
  // and read by a stranger as hiding who borrows and when, which is public. One
  // needle covers both spellings: "not its size" and "not the size of the book".
  {
    phrase: "hides the shape of the book",
    why: "a reader takes 'shape' to mean who borrows, when and how often, all public; it hides how much each supplier draws and owes (R-9)",
    markers: ["R-9", "~~", "STRUCK", "RETRACTED"],
    ownStrike: true,
  },
  // --- retracted 2026-10-24 on a RippleX reader's note (R-10). MergeInbox states no
  // amount either, so "only Send" read as though it published one. Three needles,
  // because the copies said "Only Send", "Only a Send" and "Only the Send".
  {
    phrase: "Only Send hides",
    why: "MergeInbox states no amount either; Convert and ConvertBack are the ones that publish theirs (R-10, E-361)",
    markers: ["R-10", "~~", "STRUCK", "RETRACTED"],
    ownStrike: true,
  },
  {
    phrase: "Only a Send hides",
    why: "MergeInbox states no amount either; Convert and ConvertBack are the ones that publish theirs (R-10, E-361)",
    markers: ["R-10", "~~", "STRUCK", "RETRACTED"],
    ownStrike: true,
  },
  {
    phrase: "Only the Send hides",
    why: "MergeInbox states no amount either; Convert and ConvertBack are the ones that publish theirs (R-10, E-361)",
    markers: ["R-10", "~~", "STRUCK", "RETRACTED"],
    ownStrike: true,
  },
  // --- retracted 2026-10-24 on the same note (R-11). Under DynamicMPT an issuer can
  // switch clawback or locking on later, and make a flag immutable at creation OR
  // later; these sentences gave the condition for locking only, and at creation only.
  {
    phrase: "flags were made unchangeable when it",
    why: "a flag can be made immutable at creation or later, and clawback can be switched on later too (R-11, E-361)",
    markers: ["R-11", "~~", "STRUCK", "RETRACTED"],
    ownStrike: true,
  },
  {
    phrase: "flags were fixed when it was created",
    why: "a flag can be made immutable at creation or later, and clawback can be switched on later too (R-11, E-361)",
    markers: ["R-11", "~~", "STRUCK", "RETRACTED"],
    ownStrike: true,
  },
  {
    phrase: "created with its flags made immutable",
    why: "a flag can be made immutable at creation or later, and clawback can be switched on later too (R-11, E-361)",
    markers: ["R-11", "~~", "STRUCK", "RETRACTED"],
    ownStrike: true,
  },
  {
    phrase: "locking was allowed when the token was created",
    why: "a flag can be made immutable at creation or later, and clawback can be switched on later too (R-11, E-361)",
    markers: ["R-11", "~~", "STRUCK", "RETRACTED"],
    ownStrike: true,
  },
  // REVIEW-064 A-4 fixed "the only remedy" in the blog and left it in the README,
  // ADR-0001 and the hosted explainer; found while fixing R-11, and folded into it.
  {
    phrase: "only remedy is",
    why: "clawback needs the flag, which the issuer may or may not be able to set, and nothing establishes it is the only remedy for a lost key (R-11, E-361)",
    markers: ["R-11", "~~", "STRUCK", "RETRACTED"],
    ownStrike: true,
  },
];

const EXEMPT_DIRS = ["docs/reviews/", "node_modules", "/.git/", "/target/", "/dist/"];
/** ⚠ This file necessarily contains every phrase. See "What it does NOT say" 4. */
const EXEMPT_FILES = ["tools/check-disclosure-phrases.ts"];
/**
 * ⚠⚠ **`.tsx` WAS MISSING, SO THIS GATE COULD NOT SEE THE RENDERED UI AT ALL —
 * `REVIEW-037` F1, `CLAIMS.md` E-234.** The web tier's pages are `.tsx`, and a
 * page is **the largest disclosure surface this project has built**: it is the
 * one place a claim reaches a human who cannot read the source. The gate that
 * exists to stop a retracted claim being asserted was blind to every one of
 * them. ⚠ **`.jsx` is included for the same reason, though the tier has none.**
 */
const LIVE_EXT = [".md", ".rs", ".ts", ".tsx", ".jsx", ".py", ".toml", ".json"];
/** Lines either side of a hit that are searched for a marker. */
const WINDOW = 6;

/**
 * ⚠ **One of these MUST be in the window before any hit is forgiven** — E-238.
 * A phrase's own markers say *which* retraction; these say *that* it is one.
 */
const RETRACTION_TOKENS = ["~~", "STRUCK", "RETRACTED", "SUPERSEDED", "no longer"];

export interface Hit {
  file: string;
  line: number;
  phrase: string;
  why: string;
}

function liveFiles(dir = "."): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (EXEMPT_DIRS.some((d) => (p + "/").includes(d.replace(/^\.?\//, "")))) continue;
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { out.push(...liveFiles(p)); continue; }
    if (!LIVE_EXT.some((e) => p.endsWith(e))) continue;
    if (EXEMPT_FILES.some((f) => p.endsWith(f))) continue;
    out.push(p);
  }
  return out;
}

/**
 * The text as a reader would see it, flattened: on each line a leading
 * blockquote, line-comment, comment-continuation or bullet marker is dropped,
 * JSX's `{" "}` becomes a space, and then every run of whitespace, newlines
 * included, becomes one space. Returns, for each character of the result, the
 * 0-based source line it came from.
 *
 * ⚠ **`REVIEW-058` round three (R3-5, `CLAIMS.md` E-330)**: whitespace alone
 * was not enough. A copy wrapped inside a blockquote kept `> ` between its words,
 * and a JSX copy wrapped after `{" "}` kept the braces, and both passed with
 * the real page edited. Other markup between words, a tag or an entity or
 * emphasis, still hides a copy, and the gate's printed limits say so.
 */
/**
 * Whether the occurrence starting on source line `line` lies inside a `~~`
 * strike. A GFM strike cannot cross a paragraph or a table cell, so the text
 * considered is the occurrence's own paragraph, or its own cell when the line is
 * a table row, flattened the same way the needle was: an odd number of `~~`
 * before the needle, and one after it. An unbalanced `~~` earlier in the same
 * paragraph or cell makes a struck copy look unstruck, which FAILS, the loud
 * direction.
 */
export function insideStrike(lines: string[], line: number, needle: string): boolean {
  const isRow = (l: string) => /^\s*\|/.test(l);
  let lo = line, hi = line;
  if (!isRow(lines[line])) {
    while (lo > 0 && lines[lo - 1].trim() !== "" && !isRow(lines[lo - 1])) lo--;
    while (hi < lines.length - 1 && lines[hi + 1].trim() !== "" && !isRow(lines[hi + 1])) hi++;
  }
  const seg = flatten(lines.slice(lo, hi + 1).join("\n")).flat;
  // EVERY copy in the paragraph or cell must be struck: which copy the caller
  // matched is not recoverable here, so one struck copy may not forgive another.
  let seen = 0;
  for (let at = seg.indexOf(needle); at >= 0; at = seg.indexOf(needle, at + 1)) {
    seen++;
    let head = seg.slice(0, at);
    let tail = seg.slice(at + needle.length);
    if (isRow(lines[line])) {
      head = head.slice(head.lastIndexOf("|") + 1);
      const end = tail.indexOf("|");
      if (end >= 0) tail = tail.slice(0, end);
    }
    if (!((head.split("~~").length - 1) % 2 === 1 && tail.includes("~~"))) return false;
  }
  return seen > 0;
}

function flatten(text: string): { flat: string; lineAt: number[] } {
  let flat = "";
  const lineAt: number[] = [];
  let inSpace = false;
  text.split("\n").forEach((raw, line) => {
    const body =
      raw
        .replace(/^\s*(?:(?:>\s*)+|\/\/+\s*|\*+\s+|-\s+)/, "")
        .replace(/\{\s*(["'`])\s*\1\s*\}/g, " ") + "\n";
    for (const ch of body) {
      if (/\s/.test(ch)) {
        if (!inSpace) {
          flat += " ";
          lineAt.push(line);
          inSpace = true;
        }
        continue;
      }
      inSpace = false;
      flat += ch;
      for (let k = 0; k < ch.length; k++) lineAt.push(line);
    }
  });
  return { flat, lineAt };
}

/**
 * The REAL detector. Every control below calls THIS — a control that
 * re-implements the check proves only that the re-implementation works
 * (`CLAIMS.md` E-182).
 */
export function scan(extra?: { name: string; text: string }): Hit[] {
  const bad: Hit[] = [];
  const items: Array<[string, string]> = liveFiles().map((f) => [f, readFileSync(f, "utf8")]);
  if (extra) items.push([extra.name, extra.text]);
  for (const [file, text] of items) {
    const lines = text.split("\n");
    // ⚠⚠ **A COPY WRAPPED ACROSS TWO LINES PASSED — `REVIEW-058` R2-11,
    // `CLAIMS.md` E-329.** This matched each phrase within one source line, so
    // the front page's false sentence passed once a line break fell after its
    // comma, and so did the wallet sentence split before "release". JSX and
    // Markdown both wrap prose. The text is now flattened, every run of
    // whitespace to one space, and each hit reports the line it starts on.
    const { flat, lineAt } = flatten(text);
    for (const r of RETRACTED) {
      const needle = r.phrase.replace(/\s+/g, " ");
      for (let at = flat.indexOf(needle); at >= 0; at = flat.indexOf(needle, at + 1)) {
        const i = lineAt[at];
        const window = lines.slice(Math.max(0, i - WINDOW), i + WINDOW + 1).join("\n");
        // ⚠⚠ **A RETRACTION TOKEN IS REQUIRED, NOT MERELY A CITATION —
        // `CLAIMS.md` E-238.** E-232 tightened the marker LISTS after a review
        // id forgave the assertion it was added to catch; the REVIEW-037
        // spot-check proved the MODE survived that fix, because a bare
        // `E-224` — an ordinary cross-reference that appears for a hundred
        // unrelated reasons — still satisfied `markers.some()`.
        //
        // ⚠ **A citation says "this was discussed". A STRIKE says "this is
        // withdrawn".** Only the second may forgive a live assertion, so a hit
        // is now forgiven only when the window carries BOTH a retraction token
        // AND one of the phrase's own markers.
        // ⚠ The phrase's own marker lists CONTAIN the retraction tokens, so a
        // naive `markers.some()` let a lone `RETRACTED` satisfy BOTH halves and
        // the requirement was toothless. **Caught by this gate's own new
        // control, before the fix was believed.** Identity and strike must come
        // from disjoint sets.
        const struck = r.ownStrike
          ? insideStrike(lines, i, needle)
          : RETRACTION_TOKENS.some((m) => window.includes(m));
        const cited = r.markers
          .filter((m) => !RETRACTION_TOKENS.includes(m))
          .some((m) => window.includes(m));
        if (!(struck && cited)) {
          bad.push({ file, line: i + 1, phrase: r.phrase, why: r.why });
        }
      }
    }
  }
  return bad;
}

// ---------------------------------------------------------------------------

if (import.meta.main) {
  let failures = 0;
  let controls = 0;
  const control = (label: string, ok: boolean) => {
    controls++;
    console.log(`  CONTROL ${ok ? "✓" : "✗"} ${label}`);
    if (!ok) failures++;
  };

  console.log("check-disclosure-phrases — no live file may assert a retracted disclosure");
  console.log("  (docs/reviews/ is exempt: a packet is the record of what a leg was shown)\n");

  // ⚠ A gate over an EMPTY set passes trivially and says nothing. Refuse first.
  if (RETRACTED.length === 0) {
    console.log("FAIL: the retracted-phrase list is empty — this gate would assert nothing");
    process.exit(1);
  }
  console.log(`Scanning ${liveFiles().length} live files for ${RETRACTED.length} retracted phrases\n`);

  const hits = scan();
  if (hits.length) {
    for (const h of hits) {
      console.log(`  ⚠ ASSERTED: ${h.file}:${h.line} — "${h.phrase}"`);
      console.log(`             ${h.why}`);
    }
    failures += hits.length;
  } else {
    console.log("  ✓ no live file asserts a retracted disclosure");
  }

  console.log("\nControls — each runs through the SAME detector the real check calls");
  const own = RETRACTED.find((r) => r.ownStrike)!;
  const id = own.markers[0];
  control(
    `${id}: an unstruck copy cited beside an UNRELATED strike IS caught`,
    scan({ name: "<injected>", text: `~~an old note~~ (${id})\nIt ${own.phrase}, not its size (${id}).\n` }).some((h) => h.file === "<injected>"),
  );
  control(
    `${id}: an unstruck copy cited beside "no longer" IS caught`,
    scan({ name: "<injected>", text: `This is no longer current (${id}).\nIt ${own.phrase}, not its size.\n` }).some((h) => h.file === "<injected>"),
  );
  control(
    `${id}: a copy struck ITSELF, cited, is NOT caught`,
    !scan({ name: "<injected>", text: `~~It ${own.phrase}, not its size~~ (${id}).\n` }).some((h) => h.file === "<injected>"),
  );
  control(
    `${id}: a struck copy wrapped across lines, cited, is NOT caught`,
    !scan({ name: "<injected>", text: `> ~~It ${own.phrase.replace("the book", "the\n> book")}, not its size~~\n> (${id})\n` }).some((h) => h.file === "<injected>"),
  );
  const p = RETRACTED[0];
  control(
    "an INJECTED retracted phrase with no correction marker IS caught",
    scan({ name: "<injected>", text: `prose\n${p.phrase}\nmore prose` }).some((h) => h.file === "<injected>"),
  );
  control(
    "the SAME phrase with a retraction TOKEN and its marker is NOT caught",
    !scan({ name: "<injected>", text: `⚠ RETRACTED, ${p.markers[0]}:\n~~${p.phrase}~~\n` }).some((h) => h.file === "<injected>"),
  );
  // ⚠⚠ E-238. A citation is not a retraction. This is the mode E-232's fix left
  // open, demonstrated by the REVIEW-037 spot-check with an unrelated `E-224`.
  control(
    "a BARE CITATION with no retraction token does NOT forgive the hit",
    scan({ name: "<injected>", text: `⚠ see ${p.markers[0]} for background\n${p.phrase}\n` }).some((h) => h.file === "<injected>"),
  );
  control(
    "a retraction TOKEN alone, without the phrase's own marker, does NOT forgive",
    scan({ name: "<injected>", text: `⚠ RETRACTED elsewhere\n${p.phrase}\n` }).some((h) => h.file === "<injected>"),
  );
  control(
    "a marker OUTSIDE the window does NOT forgive the hit",
    scan({
      name: "<injected>",
      text: `${p.markers[0]}\n${"filler\n".repeat(WINDOW + 2)}${p.phrase}\n`,
    }).some((h) => h.file === "<injected>"),
  );
  control(
    "clean prose is NOT caught",
    scan({ name: "<injected>", text: "nothing retracted here at all\n" }).length === hits.length,
  );
  // ⚠ REVIEW-058 R2-11 and R2-12 (E-329): wrapped copies, and a true sentence
  // that shares words with a retracted one.
  const wrapped = p.phrase.replace(/ /, "\n");
  control(
    "a copy WRAPPED across two lines IS caught",
    wrapped !== p.phrase &&
      scan({ name: "<injected>", text: `prose\n${wrapped}\nmore prose` }).some((h) => h.file === "<injected>"),
  );
  control(
    "a copy wrapped and INDENTED, as JSX wraps it, IS caught",
    scan({
      name: "<injected>",
      text: "          The three reasons above cannot be\n          closed by any release.\n",
    }).some((h) => h.file === "<injected>"),
  );
  control(
    "a TRUE sentence that shares the retracted words is NOT caught",
    !scan({
      name: "<injected>",
      text: "The protocol-mandated issuer mirror cannot be closed by any wallet update or any release.\n",
    }).some((h) => h.file === "<injected>"),
  );
  // ⚠ R3-4 (E-330): the control above lacked each pattern's full predicate, so
  // it could not protect a pattern that had lost its subject. Each of these keeps
  // a wallet phrase's whole predicate and changes only the subject.
  control(
    "each wallet phrase's predicate, on ANOTHER subject, is NOT caught",
    ![
      "The two mandatory mirrors are **structural** and cannot be closed by any wallet update.\n",
      "The issuer's two powers above cannot be closed by any release.\n",
      "For a wallet that held the key, no wallet update can close them would be false.\n",
    ].some((t) => scan({ name: "<injected>", text: t }).some((h) => h.file === "<injected>" && h.phrase !== "no wallet update can close them")),
  );
  control(
    "a copy wrapped inside a BLOCKQUOTE is caught",
    scan({ name: "<injected>", text: "> The issuer shows the same holder,\n> decrypted.\n" }).some((h) => h.file === "<injected>"),
  );
  control(
    "a copy wrapped after JSX's {\" \"} is caught",
    scan({ name: "<injected>", text: '<li>Issuer view — the same holder,{" "}\n decrypted.</li>\n' }).some((h) => h.file === "<injected>"),
  );
  control(
    "a copy wrapped across LINE COMMENTS is caught",
    scan({ name: "<injected>", text: "// So the operation cannot be\n// assembled at all.\n" }).some((h) => h.file === "<injected>"),
  );
  control(
    "EVERY phrase in the list is detectable, not just the first",
    RETRACTED.every((r) =>
      scan({ name: "<injected>", text: r.phrase }).some((h) => h.file === "<injected>"),
    ),
  );

  console.log("\n" + "-".repeat(74));
  if (failures) {
    console.log(`FAIL: ${hits.length} asserted retraction(s), ${failures - hits.length} control failure(s).`);
    console.log("⚠ A retracted claim is standing in a live file. Grep the PHRASE, not the line.");
    process.exit(1);
  }
  console.log(
    `PASS: no live file asserts any of ${RETRACTED.length} retracted disclosures — under ${controls} controls,\n` +
      "      each running through the same detector the real check calls.",
  );
  console.log("⚠ LEXICAL, over a NAMED SET. It catches COPIES, not paraphrases, and it");
  console.log("  cannot tell whether a claim is true. See the header for what it does not say.");
  const ownCount = RETRACTED.filter((r) => r.ownStrike).length;
  console.log(`⚠ ${ownCount} of ${RETRACTED.length} phrase(s) must be struck THEMSELVES to be forgiven; the rest are`);
  console.log("  forgiven by any strike token and their own id within six lines, so a nearby");
  console.log("  unrelated strike can forgive an unstruck copy of those (REVIEW-062 round two).");
}
