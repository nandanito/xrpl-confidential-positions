/**
 * check-loopback.ts — the gate on B-15's step-7 obligation.
 *
 * # The claim this gate makes, stated precisely
 *
 * **No `.ts` file under `facility/` contains a scheme-prefixed URL literal whose
 * host is not loopback, except the sites recorded below, each with its reason.**
 *
 * ⚠ Read that sentence twice, because three of its qualifications were missing
 * from the first draft and `REVIEW-022`'s Codex leg found all three. It says
 * **`.ts`** — `walk` skips Markdown, JSON and every other extension, so a remote
 * URL in `facility/README.md` is invisible here. It says **sites**, not *call
 * sites* — the twelve strings in the hostile fixture are test inputs and nothing
 * calls them. And it says **literal**: a host assembled at run time is invisible
 * to any regex.
 *
 * ⚠ **That is a claim about endpoint literals in `.ts` source, and nothing
 * else.**
 * `CLAIMS.md` **E-141** is why the sentence is that careful: a sibling gate
 * reported *"nine"* when it was counting **files it flagged** rather than call
 * sites, and two of the nine were not call sites at all — one was the gate
 * itself, which necessarily contains its own patterns, and one was a dead
 * exemption its own stale check was hardcoded to skip. **A gate that reports a
 * number is making a claim about what the number counts, and nobody checks that
 * claim.** So this file says what it counts, in the header and in its output.
 *
 * # The two halves, because neither is sufficient
 *
 * * **Static — this gate.** A remote endpoint cannot be written into the
 *   facility's source without either failing the build gate or being recorded
 *   here with a reason someone had to type.
 * * **Dynamic — `facility/src/loopback.ts`.** `LoopbackLedger.open()` refuses a
 *   non-loopback endpoint at runtime, so an endpoint arriving from an
 *   environment variable or a config file is refused too. ⚠ **Unless the risk
 *   has been accepted by name.** On 2026-08-25 the project owner amended
 *   B-15's step-7 answer to allow a remote endpoint for the Devnet demo, and
 *   `WCONF_ACCEPT_REMOTE_LEDGER_RISK`, set to a full sentence, turns the
 *   refusal into a printed disclosure and a stamp on the run record. **This
 *   gate does not see that**, and could not: it reads source, and the hatch is
 *   an environment variable. What it still guarantees is that a remote endpoint
 *   cannot be *written into* the facility without a recorded reason.
 *
 * A source scan alone would miss `WCONF_LEDGER_ENDPOINT=https://…`; a runtime
 * check alone would let a hardcoded remote host sit in the tree until someone
 * ran the wrong path. **Neither is the property. Both together are close, and
 * "close" is the honest word** — nothing here stops the same-host adversary of
 * issue #1 from pointing the whole facility somewhere else.
 *
 *   bun tools/check-loopback.ts        # exit 0 = the claim above holds
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { isLoopbackEndpoint } from "../facility/src/loopback.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SCANNED = ["facility"];

/**
 * Every place under `facility/` that names a host which is not loopback.
 *
 * ⚠ **A reason, not a category.** `CLAIMS.md` E-140: three exemptions in the
 * sibling gate carried a reason that was simply false, and correcting a false
 * reason with a second false reason is how one of them survived a whole review
 * round. If a reason here stops being true, the exemption goes — it does not
 * get reworded.
 */
interface Exemption {
  /** Repository-relative path. */
  file: string;
  /**
   * The exact literal expected at that site, or `"*"` for a whole file.
   *
   * ⚠ **A whole-file exemption is a bigger claim and is reported as one.** The
   * gate prints how many literals it excused under each `"*"`, because
   * `CLAIMS.md` E-141's lesson is that a gate which quietly skips something is
   * a gate whose PASS means less than it looks. A `"*"` that excuses zero
   * literals is stale and fails, exactly like a literal one.
   */
  literal: string;
  reason: string;
}

const EXEMPT: Exemption[] = [
  {
    file: "facility/tests/hostile-endpoints.ts",
    literal: "*",
    reason:
      "Every endpoint the facility must REFUSE, in one file, each with the reason it is there — " +
      "REVIEW-016's two bypasses, round two's unterminated IPv6 literal, `localhost` as a NAME, " +
      "and the remote endpoint every other harness in this repository uses. Nothing here is " +
      "connected to: they are inputs to `isLoopbackEndpoint`, and " +
      "`facility/tests/loopback.test.ts` asserts every one is refused. One exemption instead of " +
      "thirteen near-identical ones, because a list nobody reads is E-140's false reason waiting " +
      "to happen.",
  },
  {
    file: "facility/tests/risk-acceptance.test.ts",
    literal: "http://localhost:1",
    reason:
      "A deliberately REMOTE-CLASSIFIED endpoint that resolves to a local test server. " +
      "`isLoopbackEndpoint` refuses the NAME `localhost` — a name is resolved by something " +
      "this process does not control — while the operating system still sends the request to " +
      "127.0.0.1. That is the only way to execute the accepted-risk hatch's ACCEPTING branch " +
      "without a packet leaving the machine, and REVIEW-023 found that no test executed it: " +
      "the previous one connected to a literal 127.0.0.1 and so never reached " +
      "`assertRemoteRiskAccepted` at all, while its name promised otherwise. The port is a " +
      "template substitution, which this gate normalises to `1`.",
  },
  {
    file: "facility/src/devnet-accounts.ts",
    literal: "https://faucet.devnet.rippletest.net/accounts",
    reason:
      "The Devnet faucet, and it is NOT a ledger read. It mints a throwaway account and returns " +
      "a seed. B-15 is about values that, if wrong, make the signer publish an amount encrypted " +
      "under an adversary's key — a faucet supplies neither a destination key nor an issuer key " +
      "nor a balance. What it does supply is an ADDRESS, and that is not trusted either: " +
      "`addressOfSeed` re-derives it from the seed and the facility refuses a mismatch. The " +
      "account's existence is then confirmed by a read against the LOOPBACK node.",
  },
];

interface Finding {
  file: string;
  line: number;
  literal: string;
}

/**
 * Endpoint literals in one blob of source.
 *
 * Matches a scheme-prefixed URL inside a string. It does **not** try to catch
 * a bare hostname: `"s.devnet.rippletest.net"` with the scheme assembled
 * elsewhere would walk past this, and saying so is better than implying a
 * completeness the regex does not have.
 *
 * ⚠ **One normalisation, and its first version was a mask.** A template
 * substitution in the **port** — `http://127.0.0.1:${port}` — is replaced by `1`
 * before the host is checked, because the HOST is what B-15 is about and a
 * computed port cannot reach a different machine.
 *
 * ⚠ **Substituting `1` for a substitution in the HOST was the hole.**
 * ``http://127.${host}:5005`` normalised to `http://127.1:5005`, which `URL`
 * canonicalises to `127.0.0.1` — so the gate **accepted** a host whose runtime
 * value could be anything at all. `REVIEW-022`'s Codex leg found it, and it is
 * `CLAIMS.md` E-141's shape exactly: a normalisation added to stop false
 * positives that quietly created a false negative. **Any substitution in the
 * host now fails the check outright**, and both shapes are in `selfTest`.
 */
export function endpointLiterals(source: string): { line: number; literal: string }[] {
  const out: { line: number; literal: string }[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\b(?:https?|wss?):\/\/[^\s"'`)]+/g)) {
      out.push({ line: i + 1, literal: normaliseTemplate(m[0]) });
    }
  }
  return out;
}

/**
 * Replace a template substitution in the PORT with `1`, and make a substitution
 * anywhere in the HOST unrepresentable as loopback.
 *
 * ⚠ The `HOST-SUBSTITUTION` sentinel is not a valid host, so `URL` parsing fails
 * and `isLoopbackEndpoint` returns false — which is what makes such a line a
 * finding that has to be recorded with a reason rather than waved through.
 */
export function normaliseTemplate(literal: string): string {
  const scheme = literal.match(/^[a-zA-Z]+:\/\//)?.[0] ?? "";
  const rest = literal.slice(scheme.length);
  const colon = rest.indexOf(":");
  const slash = rest.indexOf("/");
  const hostEnd = Math.min(colon < 0 ? rest.length : colon, slash < 0 ? rest.length : slash);
  const host = rest.slice(0, hostEnd);
  const after = rest.slice(hostEnd);
  if (/\$\{/.test(host)) return `${scheme}HOST SUBSTITUTION${after.replace(/\$\{[^}]*\}/g, "1")}`;
  return `${scheme}${host}${after.replace(/\$\{[^}]*\}/g, "1")}`;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === "node_modules") continue;
      yield* walk(p);
    } else if (p.endsWith(".ts")) {
      yield p;
    }
  }
}

function scan(): { findings: Finding[]; literalCount: number; fileCount: number } {
  const findings: Finding[] = [];
  let literalCount = 0;
  let fileCount = 0;
  for (const dir of SCANNED) {
    for (const path of walk(join(ROOT, dir))) {
      fileCount++;
      const rel = relative(ROOT, path);
      const source = readFileSync(path, "utf8");
      for (const { line, literal } of endpointLiterals(source)) {
        literalCount++;
        // A loopback literal is the whole point and is never a finding.
        if (isLoopbackEndpoint(literal)) continue;
        // ⚠ **Everything else is a finding, including a documentation URL.**
        // There is no host allowlist and no prose filter: a `https://github.com/…`
        // in a `facility/` file fails this gate until someone records it with a
        // reason. That is deliberate and it is the cheap direction to be wrong
        // in — a false positive costs one exemption someone had to type, and a
        // false negative costs F-23.
        //
        // ⚠ An earlier version of this comment claimed the opposite: that only
        // `rippletest.net` and bare IPs were treated as reachable hosts and
        // that prose was filtered out. **No such filter existed.** REVIEW-022's
        // Gemini leg found it — a sentence describing behaviour the line below
        // does not have, three lines above the line that does not have it.
        findings.push({ file: rel, line, literal });
      }
    }
  }
  return { findings, literalCount, fileCount };
}

/** The gate's own negative control: it must be able to fail. */
function selfTest(): void {
  const remote = endpointLiterals(`const E = "https://s.devnet.rippletest.net:51234/";`);
  if (remote.length !== 1 || isLoopbackEndpoint(remote[0].literal)) {
    throw new Error("check-loopback: the matcher does not flag a remote endpoint — it is a no-op");
  }
  const local = endpointLiterals(`const E = "http://127.0.0.1:5005";`);
  if (local.length !== 1 || !isLoopbackEndpoint(local[0].literal)) {
    throw new Error("check-loopback: the matcher does not accept a loopback endpoint");
  }
  // The two shapes REVIEW-016 found walking through the Rust check.
  for (const bad of ["http://127.attacker.example/", "http://127.0.0.1@attacker.example/"]) {
    if (isLoopbackEndpoint(bad)) {
      throw new Error(`check-loopback: ${bad} is being read as loopback`);
    }
  }
  // The template normalisation, tested rather than asserted in the header.
  // A computed PORT on a loopback host is fine; a computed HOST is not.
  const computedPort = endpointLiterals("const e = `http://127.0.0.1:${server.port}`;");
  if (computedPort.length !== 1 || !isLoopbackEndpoint(computedPort[0].literal)) {
    throw new Error("check-loopback: a computed port on 127.0.0.1 should normalise to loopback");
  }
  for (const source of [
    "const e = `http://${host}:5005`;",
    // ⚠ The one that got through. `127.${host}` became `127.1`, which URL folds
    // to 127.0.0.1 — so the gate accepted a host it could not know.
    "const e = `http://127.${host}:5005`;",
    "const e = `http://${a}.${b}.0.1:5005`;",
  ]) {
    const computed = endpointLiterals(source);
    if (computed.length !== 1 || isLoopbackEndpoint(computed[0].literal)) {
      throw new Error(
        `check-loopback: a substitution in the HOST must not normalise into loopback — ${source}`,
      );
    }
  }
}

function main(): number {
  selfTest();
  const { findings, literalCount, fileCount } = scan();

  const unmatched = new Set(EXEMPT.map((e) => `${e.file}::${e.literal}`));
  const excusedByFile = new Map<string, number>();
  const unrecorded: Finding[] = [];
  for (const f of findings) {
    const exact = EXEMPT.find((e) => e.file === f.file && e.literal === f.literal);
    const whole = EXEMPT.find((e) => e.file === f.file && e.literal === "*");
    const hit = exact ?? whole;
    if (!hit) {
      unrecorded.push(f);
      continue;
    }
    unmatched.delete(`${hit.file}::${hit.literal}`);
    if (hit.literal === "*") {
      excusedByFile.set(hit.file, (excusedByFile.get(hit.file) ?? 0) + 1);
    }
  }

  console.log(
    `check-loopback: ${fileCount} .ts files under ${SCANNED.join(", ")}, ` +
      `${literalCount} scheme-prefixed URL LITERALS (not files, not call sites — literals, ` +
      `and only in .ts), ` +
      `${findings.length} of them non-loopback, ${EXEMPT.length} recorded exemptions.`,
  );
  for (const [file, n] of excusedByFile) {
    console.log(`  whole-file exemption excused ${n} literal(s) in ${file}`);
  }

  let failed = false;
  for (const f of unrecorded) {
    failed = true;
    console.error(
      `\n✗ UNRECORDED non-loopback endpoint\n    ${f.file}:${f.line}\n    ${f.literal}\n` +
        `  CLAIMS.md B-15's step-7 ruling requires the facility's ledger reads to go to a node\n` +
        `  the operator runs. If this is not a ledger read, add it to EXEMPT with the reason.`,
    );
  }
  for (const key of unmatched) {
    failed = true;
    console.error(
      `\n✗ STALE exemption — nothing in the tree matches it\n    ${key}\n` +
        `  An exemption that matches nothing is a reason nobody is checking. Delete it.`,
    );
  }
  if (!failed) {
    console.log(
      `PASS — every non-loopback URL literal in the .ts files under ${SCANNED.join(", ")} is ` +
        `recorded with a reason, and every recorded exemption still matches something. ` +
        `⚠ Says nothing about Markdown, JSON, or a host assembled at run time.`,
    );
  }
  return failed ? 1 : 0;
}

if (import.meta.main) process.exit(main());
