/**
 * check-no-secrets.ts — no secret and no personal datum in what would be published.
 *
 *   bun run tools/check-no-secrets.ts                 # tree + history + local store
 *   bun run tools/check-no-secrets.ts --no-local-store  # shape classes only (CI)
 *   bun run tools/check-no-secrets.ts --repo <dir> --rev <commit>   # one exact tree
 *   bun run tools/check-no-secrets.ts --dir <build output>          # every file, no git
 *
 * # Why this exists
 *
 * Phase 1 of `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` makes this repository
 * public, and its gate is *"the secret sweep passing on the exact tree that will
 * be published"*. The plan says why it must be a gate and not a paragraph: **a
 * sweep recorded in prose is a claim with no falsifier** (`CLAIMS.md` E-137,
 * E-141). And this repository has shipped four gates that false-passed
 * (E-165, E-168, E-182, E-201), so this one runs its controls through the same
 * `scanRepo()` the real check calls, against a throwaway git repository it
 * builds with planted secrets, every time it runs.
 *
 * # What it looks for
 *
 * | class | what | allowed when |
 * |---|---|---|
 * | `seed` | an XRPL family seed in base58, either algorithm, checksum valid **or not** | its 16 bytes of entropy come from a published rule (`PUBLIC_ENTROPY`) |
 * | `seed-entropy-hex` | 32 hex digits after a `seed` or `entropy` label | same rule |
 * | `labelled-scalar` | 64 or 66 hex digits after a label with an `sk`, `secret` or `private` component | it is derived from public entropy, or is a cited test vector |
 * | `known-value` | **an exact value from the local secret store**, in every encoding listed in `needlesForSeed` | never |
 * | `credential` | PEM private keys and common API-token shapes | its variable part, after the pattern's fixed prefix, is one character repeated: a placeholder. A PEM header never |
 * | `secret-file` | a path named like a secret store (`state.json`, `profile.json`, `.env`, `*.pem`, ...) | never |
 * | `personal-path` | a home directory or a macOS per-user temp directory, in five encodings | the user name is generic (`runner`, `user`, ...) |
 * | `email` | an email address | reserved domains and three role addresses |
 *
 * **`known-value` is the only class that can see an UNLABELLED ElGamal secret.**
 * A bare 64-hex scalar is indistinguishable from a transaction hash, so no
 * shape rule can find one. That is why the default run REFUSES without the
 * local store: a run that skipped it would look like the phase 1 gate and not
 * be it. `--no-local-store` runs the shape classes and says so in its verdict
 * word (`PASS-SHAPES-ONLY`), so a CI log cannot be mistaken for the real gate.
 *
 * # What "published" means here
 *
 * * **The tree:** every file `git add -A` would commit — tracked plus
 *   untracked-not-ignored — read from disk. A gitignored file is not scanned,
 *   because it is not published; that is a property, and a control pins it.
 * * **`--rev`:** the blobs of exactly one commit's tree, read from git objects.
 *   ⚠ It scans no history. The publication is two commits, so the phase 1 gate
 *   is NOT this form: it is `--repo <export> --strict-history` on a clean export
 *   (`REVIEW-057` R1-7 and R2-7).
 * * **History:** every blob, commit message and tag message reachable from any
 *   ref, and every path any commit ever touched. ⚠ **Personal paths and emails
 *   in history are REPORTED, not failed**, because the launch plan rules that
 *   history is squashed at publication (`CLAIMS.md` E-309) and this repository
 *   stays the private archive. Secrets fail in history like anywhere else.
 *   `--strict-history` fails on both, and is the form for the export: its two
 *   commits are published history, so nothing in them may be merely reported.
 * * **`--dir`:** every regular file under one directory, read from disk with
 *   no git at all, dotfiles and gitignored files included. It is the form for a
 *   build output, which is uploaded whole: under the tree mode an ignored
 *   `dist/` file went unscanned (`REVIEW-058` R1-9). A symlink, a non-regular
 *   file and an archive it cannot open are refused. A whole file in gzip (found
 *   by its magic bytes) or brotli (by its `.br` name) is read decompressed as
 *   well as raw.
 *
 * **No path is exempt, including `docs/reviews/` and this file.** Exempting a
 * file is how a gate false-passes. This file contains no planted secret
 * literally: the controls generate theirs at runtime.
 *
 * # Exit codes and the verdict line
 *
 * `0` pass, `1` the scanned tree has findings, `2` a control failed or the gate
 * refused to run. **The last line of output is always
 * `check-no-secrets: verdict=<WORD> exit=<N>`**, and a caller must require it,
 * because Bun exits 1 on a crash too (`CLAIMS.md` E-259).
 *
 * # What it does NOT catch
 *
 * Printed every run by `printLimits()`, and each lexical limit is an
 * ASSERTED-UNCAUGHT control: if a later change starts catching one, the control
 * fails and the disclosure has to be updated rather than going stale
 * (E-203's shape, from `check-zeroize-bounds` part 6).
 */

import { createHash, randomBytes } from "node:crypto";
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync,
  readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { brotliCompressSync, brotliDecompressSync, gunzipSync, gzipSync } from "node:zlib";
import { encodeSeed } from "ripple-address-codec";
import { deriveKeypair } from "ripple-keypairs";
import { deriveElGamalKey } from "./wconf-keygen.ts";

// ---------------------------------------------------------------- primitives

export const XRPL_ALPHABET = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
const B58 = new Map([...XRPL_ALPHABET].map((c, i) => [c, i] as const));

const sha256 = (b: Uint8Array) => new Uint8Array(createHash("sha256").update(b).digest());
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

/** Base58 over the XRPL alphabet. Independent of `ripple-address-codec` on purpose. */
export function b58decode(s: string): Uint8Array | null {
  let n = 0n;
  for (const c of s) {
    const v = B58.get(c);
    if (v === undefined) return null;
    n = n * 58n + BigInt(v);
  }
  const out: number[] = [];
  while (n > 0n) { out.unshift(Number(n & 0xffn)); n >>= 8n; }
  let lead = 0;
  while (lead < s.length && s[lead] === XRPL_ALPHABET[0]) lead++;
  return Uint8Array.from([...new Array(lead).fill(0), ...out]);
}

export type SeedType = "secp256k1" | "ed25519";
export interface DecodedSeed { type: SeedType; entropy: Uint8Array; checksumOk: boolean }

/**
 * A family seed is `0x21 || 16 bytes` (secp256k1) or `0x01 0xE1 0x4B || 16 bytes`
 * (ed25519), base58check over the XRPL alphabet. ⚠ **The checksum is REPORTED,
 * not required.** A seed with one character changed still discloses all but a
 * few bits of its entropy, so a mistyped seed is a seed.
 */
export function decodeSeedLike(s: string): DecodedSeed | null {
  const raw = b58decode(s);
  if (!raw) return null;
  let type: SeedType, prefix: number;
  if (raw.length === 21 && raw[0] === 0x21) { type = "secp256k1"; prefix = 1; }
  else if (raw.length === 23 && raw[0] === 0x01 && raw[1] === 0xe1 && raw[2] === 0x4b) { type = "ed25519"; prefix = 3; }
  else return null;
  const body = raw.subarray(0, raw.length - 4);
  const chk = sha256(sha256(body));
  const checksumOk = [0, 1, 2, 3].every((i) => chk[i] === raw[raw.length - 4 + i]);
  return { type, entropy: body.subarray(prefix), checksumOk };
}

// ------------------------------------------------- what is public by construction

/**
 * Entropy anyone can compute is not a secret, however it is encoded. Each rule
 * is a published construction, not a list of values, so the allowlist cannot
 * be extended by pasting a real seed into it: a seed drawn from a CSPRNG
 * matches none of these except with probability around 2^-120.
 *
 * Every seed in this repository on 2026-10-18 matched one of these, measured:
 * the `ripple-keypairs` vectors in `tools/spike-step3-2026-08-18/xrpl-vectors.json`
 * (one byte repeated), the keygen known-answer vectors of
 * `REVIEW-012-RULING-keygen-2026-08-18.md` §6 (the counting bytes), and
 * rippled's genesis account.
 */
const GENESIS_ENTROPY = new Uint8Array(createHash("sha512").update("masterpassphrase").digest()).subarray(0, 16);
export const PUBLIC_ENTROPY: { name: string; matches: (e: Uint8Array) => boolean; all: () => Uint8Array[] }[] = [
  {
    name: "one byte repeated sixteen times",
    matches: (e) => e.length === 16 && e.every((b) => b === e[0]),
    all: () => Array.from({ length: 256 }, (_, b) => new Uint8Array(16).fill(b)),
  },
  {
    name: "the bytes 0x00 to 0x0f in order (REVIEW-012 §6)",
    matches: (e) => e.length === 16 && e.every((b, i) => b === i),
    all: () => [Uint8Array.from({ length: 16 }, (_, i) => i)],
  },
  {
    name: "SHA-512 of 'masterpassphrase', first 16 bytes (rippled's genesis account)",
    matches: (e) => e.length === 16 && e.every((b, i) => b === GENESIS_ENTROPY[i]),
    all: () => [GENESIS_ENTROPY],
  },
];
const publicEntropyRule = (e: Uint8Array) => PUBLIC_ENTROPY.find((r) => r.matches(e))?.name ?? null;

/**
 * Cited test vectors that are labelled like secrets and are not derivable by
 * this gate. **Each needs a source a reader can open.** `checkStale` fails if
 * one is no longer present in the tree, so the list cannot rot into a set of
 * forgiven values nobody remembers.
 */
export const CITED_VECTORS: { value: string; source: string }[] = [
  { value: "d0f5579962bfda138d1ccad641922d3886cf912d9f16936d957ce808d8daac65", source: "REVIEW-005a sigma-nonce vector V1, α_sk, over the published inputs in the same section" },
  { value: "255b28c2d975c512de82f86c31bac6ef2f861abe7798d1627da1ee1bad935bf8", source: "REVIEW-005a sigma-nonce vector V2, α_sk" },
  { value: "b41cd14ee4e703100d9f6359d3fe8740922840aed12cfd72cb9b4e7c78f9e7e8", source: "REVIEW-005a sigma-nonce vector V3, α_sk" },
  { value: "60a5b83fb38d52ea389ebd6eec164823e7e8b9077ef171ebb2517c13a6c56321", source: "REVIEW-005a sigma-nonce vector V4, t_sk" },
  { value: "8d2b054d2cc7d12a57cc4214ee8d95e3ca11e27b04bc7f3f6ae0d755407b45ce", source: "REVIEW-005a sigma-nonce vector V5, t_sk" },
  // REVIEW-012b's leg proposed `OKM64 mod n`; the ruling chose `(OKM64 mod (n-1)) + 1`
  // (REVIEW-012 §2.3, §6). Same public seeds, same OKM64, so these are public by
  // construction. Checked 2026-10-18: each equals its printed OKM64 mod n.
  { value: "f523da4f10344409a57e27ec6c2ff66e612962c4002ae347d53226fbca26925a", source: "REVIEW-012b leg's vector 1 sk_A, OKM64 mod n over the public counting-bytes secp256k1 seed" },
  { value: "32afe79f8cc2d1745dee0ab5fbf2b6af39e1f63dc5b8d83c7200a05c8f56ee51", source: "REVIEW-012b leg's vector 2 sk_A, OKM64 mod n over the public counting-bytes ed25519 seed" },
  { value: "000000000000000000000000000000000000000000000000fffffffffffffff1", source: "REVIEW-056 round one S4-1, the leg's own synthetic fixture" },
];

/**
 * A scalar this small is a toy test value. Anyone can find it from its public
 * key by enumeration, so publishing it discloses nothing that was not already
 * public. ⚠ **This said 2^64 until `REVIEW-056` S4-1.** A key in a 2^64 interval
 * falls to a kangaroo walk of about 2^32 steps, which is cheap but not free;
 * 2^32 makes "already public" true without that qualification. The only labelled
 * toy scalars in the tree are 7, 11, 13 and 17.
 */
const TOY_SCALAR_BOUND = 1n << 32n;

let publicScalarCache: Map<string, string> | null = null;
/**
 * Every scalar this repository could publish legitimately under a secret's
 * label: the ElGamal key the ruled derivation gives each public seed, and the
 * XRPL signing key `ripple-keypairs` gives it. Computed, never listed.
 */
export function publicScalars(): Map<string, string> {
  if (publicScalarCache) return publicScalarCache;
  const m = new Map<string, string>();
  for (const rule of PUBLIC_ENTROPY) {
    for (const e of rule.all()) {
      for (const type of ["secp256k1", "ed25519"] as const) {
        const seed = encodeSeed(Buffer.from(e), type);
        const why = `derived from a ${type} seed whose entropy is ${rule.name}`;
        m.set(deriveElGamalKey(seed).sk.toLowerCase(), `ElGamal key ${why}`);
        const priv = deriveKeypair(seed).privateKey.toLowerCase();
        m.set(priv, `signing key ${why}`);
        m.set(priv.slice(2), `signing key ${why}`);
      }
    }
  }
  for (const v of CITED_VECTORS) m.set(v.value.toLowerCase(), v.source);
  publicScalarCache = m;
  return m;
}

// ------------------------------------------------------------------- findings

export type Cls =
  | "seed" | "seed-entropy-hex" | "labelled-scalar" | "known-value"
  | "credential" | "secret-file" | "personal-path" | "email";
/** Classes that are personal data rather than secrets. History reports these. */
export const PERSONAL: ReadonlySet<Cls> = new Set<Cls>(["personal-path", "email"]);

export interface Hit {
  cls: Cls;
  at: number;
  /** Redacted: a finding never prints the value it found. */
  shown: string;
  why: string;
  /** Set when the hit is permitted; the name of the rule that permits it. */
  allowedBy?: string;
  /** Span length, so a consumer can replace the hit (`scrub-personal-data.ts`, `redact-review-fixtures.ts`). */
  len?: number;
}

const redact = (v: string) => (v.length <= 8 ? `${v[0]}…(${v.length})` : `${v.slice(0, 3)}…${v.slice(-2)} (${v.length} chars)`);

// ------------------------------------------------------------ the detectors

const B58RUN = new RegExp(`[${XRPL_ALPHABET}]{24,}`, "g");

export function seedHits(text: string): Hit[] {
  const out: Hit[] = [];
  for (const m of text.matchAll(B58RUN)) {
    const run = m[0];
    const tried = new Set<string>();
    const consider = (start: number, len: number, requireChecksum: boolean) => {
      const s = run.slice(start, start + len);
      if (tried.has(s)) return;
      tried.add(s);
      const d = decodeSeedLike(s);
      if (!d || (requireChecksum && !d.checksumOk)) return;
      const rule = publicEntropyRule(d.entropy);
      out.push({
        cls: "seed",
        at: m.index! + start,
        len: s.length,
        shown: redact(s),
        why: `${d.type} family seed${d.checksumOk ? "" : " (checksum FAILS — a mistyped seed is still a seed)"}`,
        allowedBy: rule ? `public entropy: ${rule}` : undefined,
      });
    };
    // The whole run, if it is seed-length: the checksum is not required here.
    if (run[0] === "s" && run.length <= 35) consider(0, run.length, false);
    // A seed glued to other base58 characters: slide, and require the checksum,
    // because without one an arbitrary run would decode to *something*.
    for (let i = 0; i < run.length; i++) {
      if (run[i] !== "s") continue;
      for (const len of [28, 29, 30, 31, 32]) if (i + len <= run.length && !(i === 0 && len === run.length)) consider(i, len, true);
    }
  }
  return out;
}

/** Split an identifier into lower-case components on `_ . - $` and camelCase. */
export function components(id: string): string[] {
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_.\-$]+/)
    .filter(Boolean)
    .map((c) => c.toLowerCase());
}
const SECRET_COMPONENTS = new Set(["sk", "secret", "secretkey", "seckey", "private", "privatekey", "privkey", "priv"]);
const ENTROPY_COMPONENTS = new Set(["seed", "entropy", "familyseed", "masterseed"]);
const IDENT = /[A-Za-z_$][A-Za-z0-9_$.\-]*/g;
const WINDOW = 40;

/**
 * The label of a value at `[at, end)`: an identifier with a wanted component in
 * the `WINDOW` characters before it on its line. Two more places, both from
 * `REVIEW-056` S3-1: the end of the PREVIOUS line when the value begins its own
 * line, as hand-wrapped JSON puts it; and the `WINDOW` characters AFTER it on a
 * Markdown table row, where a value can precede its label. ⚠ **The after-window
 * is for table rows only.** On a JSON line such as `{"pk":…,"sk":…}` it would
 * flag the public key, because the secret's label follows it.
 */
function labelNear(text: string, at: number, end: number, wanted: Set<string>): string | null {
  const lineStart = text.lastIndexOf("\n", at - 1) + 1;
  let lineEnd = text.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = text.length;
  const wins = [text.slice(Math.max(lineStart, at - WINDOW), at)];
  if (/^\s*\|/.test(text.slice(lineStart, at))) wins.push(text.slice(end, Math.min(lineEnd, end + WINDOW)));
  // ⚠ The previous line counts only when it ENDS in `key:` or `key =`, so the
  // label is the key whose value this line holds. A wider window flagged nonce
  // vectors listed in an array whose NAME contains `sk` (REVIEW-056 adjudication);
  // an array of values under a label is a printed limit instead.
  // ⚠ Blank lines between are skipped: JSON allows any whitespace between a key
  // and its value, and stopping at the first blank line let one hide (R2-1).
  if (lineStart > 0 && /^[\s"'`]*$/.test(text.slice(lineStart, at))) {
    let e = lineStart - 1;
    let prevStart = text.lastIndexOf("\n", e - 1) + 1;
    while (prevStart > 0 && /^\s*$/.test(text.slice(prevStart, e))) { e = prevStart - 1; prevStart = text.lastIndexOf("\n", e - 1) + 1; }
    const m = text.slice(prevStart, e).match(/([A-Za-z_$][A-Za-z0-9_$.\-]*)["'`]?\s*[:=]\s*$/);
    if (m) wins.push(m[1]);
  }
  for (const win of wins) for (const m of win.matchAll(IDENT)) if (components(m[0]).some((c) => wanted.has(c))) return m[0];
  return null;
}

/**
 * 48 to 66 hex digits, not exactly 64 or 66: a scalar printed without padding
 * drops its leading zero nibbles, one time in sixteen per nibble (`REVIEW-056`
 * S3-1). ⚠ **This was 58 until round two (R2-1)**, which put a valid 57-digit
 * value through. 48 digits means sixteen leading zero nibbles, which a uniform
 * scalar has with probability 2^-64. A label is still required.
 */
const HEX_SCALAR = /(?<![0-9A-Za-z])(?:0x)?([0-9A-Fa-f]{48,66})(?![0-9A-Za-z])/g;
const HEX_32 = /(?<![0-9A-Za-z])(?:0x)?([0-9A-Fa-f]{32})(?![0-9A-Za-z])/g;

export function labelledHits(text: string): Hit[] {
  const out: Hit[] = [];
  const pub = publicScalars();
  for (const m of text.matchAll(HEX_SCALAR)) {
    const label = labelNear(text, m.index!, m.index! + m[0].length, SECRET_COMPONENTS);
    if (!label) continue;
    const v = m[1].toLowerCase();
    const toy = BigInt("0x" + v) < TOY_SCALAR_BOUND ? "a toy scalar below 2^32" : undefined;
    // One byte repeated is guessable from 256 candidates, the same argument as the seed rule.
    const repeated = v.length % 2 === 0 && v.match(/../g)!.every((b) => b === v.slice(0, 2)) ? "one byte repeated" : undefined;
    out.push({ cls: "labelled-scalar", at: m.index!, len: m[0].length, shown: redact(m[1]), why: `${m[1].length} hex digits labelled '${label}'`, allowedBy: pub.get(v) ?? toy ?? repeated });
  }
  for (const m of text.matchAll(HEX_32)) {
    const label = labelNear(text, m.index!, m.index! + m[0].length, ENTROPY_COMPONENTS);
    if (!label) continue;
    const rule = publicEntropyRule(Uint8Array.from(Buffer.from(m[1], "hex")));
    out.push({ cls: "seed-entropy-hex", at: m.index!, len: m[0].length, shown: redact(m[1]), why: `32 hex digits labelled '${label}'`, allowedBy: rule ? `public entropy: ${rule}` : undefined });
  }
  return out;
}

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const rnd = (n: number, alphabet = ALNUM) => Array.from(randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");

/**
 * Each pattern carries a SAMPLE, built here at run time so this file contains
 * none, and `runControls()` plants every sample (`REVIEW-056` S1-1: only two of
 * ten patterns had a control, so deleting any other passed every check).
 */
export const CREDENTIALS: { name: string; re: RegExp; sample: () => string }[] = [
  { name: "PEM private key", re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/g, sample: () => "-----BEGIN " + "RSA PRIVATE KEY-----" },
  { name: "GitHub token", re: /\bgh[pousr]_([A-Za-z0-9]{36})\b/g, sample: () => "gh" + "p_" + rnd(36) },
  { name: "GitHub fine-grained token", re: /\bgithub_pat_([A-Za-z0-9_]{50,})/g, sample: () => "github" + "_pat_" + rnd(60, ALNUM + "_") },
  { name: "Anthropic API key", re: /\bsk-ant-([A-Za-z0-9_-]{20,})/g, sample: () => "sk-" + "ant-" + rnd(40) },
  { name: "OpenAI API key", re: /\bsk-(?:proj-)?([A-Za-z0-9_-]{40,})/g, sample: () => "sk-" + rnd(48) },
  { name: "AWS access key id", re: /\b(?:AKIA|ASIA)([0-9A-Z]{16})\b/g, sample: () => "AK" + "IA" + rnd(16, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567") },
  // ⚠ Any spelling of the label, not only `aws_secret_access_key` (R2-2): the AWS
  // CLI's own JSON says `SecretAccessKey`, config files use hyphens, and prose says
  // `AWS Secret Access Key` with spaces, which round three found missed (R3-2).
  { name: "AWS secret access key", re: /\b(?:aws[_ \t-]?)?secret[_ \t-]?access[_ \t-]?key["'`\s:=]{1,8}([A-Za-z0-9/+]{40})(?![A-Za-z0-9/+])/gi, sample: () => "aws_secret" + "_access_key = " + rnd(40, ALNUM + "/+") },
  { name: "Slack token", re: /\bxox[abprs]-([A-Za-z0-9-]{10,})/g, sample: () => "xo" + "xb-" + rnd(24) },
  // ⚠ Not a trailing `\b`: a key may END in `-`, and `\b` after `-` needs a word
  // character next. Of the 64 characters a key may end in, only `-` was missed, so
  // one key in 64 was invisible. ⚠ **This said one in 32 until round two (R2-11)**:
  // `_` is a word character, so it was never affected. Found as a flaky control.
  { name: "Google API key", re: /\bAIza([0-9A-Za-z_-]{35})(?![0-9A-Za-z_-])/g, sample: () => "AI" + "za" + rnd(35, ALNUM + "_-") },
  { name: "npm token", re: /\bnpm_([A-Za-z0-9]{36})\b/g, sample: () => "np" + "m_" + rnd(36) },
  { name: "GitLab token", re: /\bglpat-([A-Za-z0-9_-]{20,})/g, sample: () => "gl" + "pat-" + rnd(24) },
];

export function credentialHits(text: string): Hit[] {
  const out: Hit[] = [];
  for (const c of CREDENTIALS) for (const m of text.matchAll(c.re)) {
    // A token whose WHOLE variable part is one character repeated is a placeholder,
    // as in `aws_secret_access_key=AAAA…`. ⚠ **This tested only the last sixteen
    // characters until round two (R2-4)**, so a real token followed by sixteen
    // dashes passed as a placeholder with the real part intact.
    const body = m[1];
    const placeholder = body !== undefined && body.length >= 8 && [...body].every((ch) => ch === body[0]) ? "a placeholder (its value is one character repeated)" : undefined;
    out.push({ cls: "credential", at: m.index!, len: m[0].length, shown: redact(m[0]), why: c.name, allowedBy: placeholder });
  }
  return out;
}

/**
 * Five encodings of a home directory, because a transcript records paths the
 * way the tool that printed them did: plain, JSON-escaped, URL-encoded,
 * Windows, and the dash-encoded form tools use to name a directory after a
 * path. Measured 2026-10-18: the plain and dash forms were both in the tree.
 */
const NAME = "([A-Za-z0-9._][A-Za-z0-9._-]*)";
const NOT_URL = "(?<![A-Za-z0-9._~%-])";
const PATH_RULES: { rule: string; re: RegExp }[] = [
  { rule: "macOS home", re: new RegExp(`${NOT_URL}/Users/${NAME}`, "g") },
  { rule: "Linux home", re: new RegExp(`${NOT_URL}/home/${NAME}`, "g") },
  { rule: "JSON-escaped home", re: new RegExp(`\\\\/(?:Users|home)\\\\/${NAME}`, "g") },
  { rule: "URL-encoded home", re: new RegExp(`%2[Ff](?:Users|home)%2[Ff]${NAME}`, "g") },
  { rule: "Windows home", re: new RegExp(`[A-Za-z]:\\\\{1,2}Users\\\\{1,2}${NAME}`, "g") },
  { rule: "dash-encoded home", re: /(?<![A-Za-z0-9])-(?:Users|home)-([A-Za-z0-9._]+)-/g },
  { rule: "macOS per-user temp", re: new RegExp(`${NOT_URL}(?:/private)?/var/folders/([A-Za-z0-9_+-]{2}/[A-Za-z0-9_+-]{8,})`, "g") },
];
/** User names that identify nobody. Compared case-insensitively. */
export const GENERIC_USERS = new Set(["runner", "user", "username", "you", "yourname", "me", "name", "example", "shared"]);
// ⚠ `alice` and `bob` were generic names until round two (R2-5), and the cited
// name that replaced them allowed every path under it until round three (R3-3).
// There is now no name-wide allowance for a fixture: a review leg's synthetic
// paths are redacted by `tools/redact-review-fixtures.ts` instead.

export function pathHits(text: string): Hit[] {
  const out: Hit[] = [];
  for (const { rule, re } of PATH_RULES) {
    for (const m of text.matchAll(re)) {
      const who = m[1];
      const generic = rule !== "macOS per-user temp" && GENERIC_USERS.has(who.toLowerCase());
      out.push({ cls: "personal-path", at: m.index!, len: m[0].length, shown: `${rule}: ${redact(who)}`, why: rule, allowedBy: generic ? "generic user name" : undefined });
    }
  }
  return out;
}

/** RFC 2606 / RFC 6761 reserved names, plus three role addresses. */
const RESERVED_TLDS = new Set(["example", "invalid", "test", "localhost"]);
const RESERVED_DOMAINS = new Set(["example.com", "example.org", "example.net"]);
export const ROLE_ADDRESSES = new Set(["noreply@github.com", "noreply@anthropic.com", "git@github.com"]);

const isLocalChar = (c: number) =>
  (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 46 || c === 95 || c === 37 || c === 43 || c === 45;
const isDomainChar = (c: number) => (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 46 || c === 45;

/**
 * Scans for `@` and expands outward, rather than one regex, because
 * `[local-chars]+@` backtracks quadratically over a long run with no `@`.
 */
export function emailHits(text: string): Hit[] {
  const out: Hit[] = [];
  for (let i = text.indexOf("@"); i !== -1; i = text.indexOf("@", i + 1)) {
    let s = i;
    while (s > 0 && i - s < 64 && isLocalChar(text.charCodeAt(s - 1))) s--;
    let e = i + 1;
    while (e < text.length && e - i < 254 && isDomainChar(text.charCodeAt(e))) e++;
    const local = text.slice(s, i).replace(/^\.+/, "");
    const domain = text.slice(i + 1, e).replace(/\.+$/, "").toLowerCase();
    if (!local || !/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(domain)) continue;
    const addr = `${local.toLowerCase()}@${domain}`;
    const tld = domain.slice(domain.lastIndexOf(".") + 1);
    const allowed = ROLE_ADDRESSES.has(addr)
      ? "role address"
      : RESERVED_TLDS.has(tld) || [...RESERVED_DOMAINS].some((d) => domain === d || domain.endsWith("." + d))
        ? "reserved domain"
        : undefined;
    out.push({ cls: "email", at: i - local.length, len: local.length + 1 + domain.length, shown: `${local[0]}…@${domain}`, why: "email address", allowedBy: allowed });
  }
  return out;
}

const SECRET_FILE = /(^|\/)(state\.json|facility-state\.json|facility-book\.json|profile\.json|\.env(\.(?!example$|sample$)[^/]+)?|[^/]*\.(seed|secret|pem|key|p12|pfx|jks|keystore)|id_(rsa|dsa|ecdsa|ed25519)|\.npmrc|\.netrc|credentials(\.json)?)$/i;

export function secretFileHit(path: string): Hit | null {
  return SECRET_FILE.test(path) ? { cls: "secret-file", at: 0, shown: path, why: "named like a secret store or a key file" } : null;
}

// ------------------------------------------------------- the known-value class

export interface Needle { value: string; label: string; kind: "hex" | "b58" }

/**
 * Every encoding of a stored seed this gate can see: the seed, its entropy, the
 * ElGamal key the ruled derivation gives it, and its XRPL signing key with and
 * without the algorithm prefix. ⚠ **The derived key matters most**: a holder
 * under `derived-from-master-seed` has NO ElGamal secret in any file, so a
 * check over stored values alone would never see it.
 */
export function needlesForSeed(seed: string, label: string): Needle[] {
  const d = decodeSeedLike(seed)!;
  const priv = deriveKeypair(seed).privateKey.toLowerCase();
  return [
    { value: seed, label: `${label} (as stored)`, kind: "b58" },
    { value: hex(d.entropy), label: `${label} (entropy, hex)`, kind: "hex" },
    { value: deriveElGamalKey(seed).sk.toLowerCase(), label: `${label} (ElGamal key derived from it)`, kind: "hex" },
    { value: priv, label: `${label} (signing key)`, kind: "hex" },
    { value: priv.slice(2), label: `${label} (signing key, no prefix)`, kind: "hex" },
  ];
}

export interface Store { files: string[]; needles: Needle[]; secrets: number; publicSkipped: number }

/** Default places the project keeps secrets. `rebuild-env.sh` and `facility/` write these. */
export function defaultStorePaths(): string[] {
  const p = [join(homedir(), ".wconf"), "/tmp/wconf"];
  if (process.env.WCONF_STATE_BACKUP) p.unshift(process.env.WCONF_STATE_BACKUP);
  return p;
}

export function loadStore(paths: string[], env: Record<string, string | undefined> = process.env): Store {
  const st: Store = { files: [], needles: [], secrets: 0, publicSkipped: 0 };
  const files: string[] = [];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    const s = lstatSync(p);
    if (s.isFile()) files.push(p);
    else if (s.isDirectory()) for (const n of readdirSync(p)) if (n.includes(".json") && lstatSync(join(p, n)).isFile()) files.push(join(p, n));
  }
  // Counted by distinct VALUE: the same seed in two copies of state.json is one
  // secret, and a count that doubled it would claim coverage it does not have.
  const seen = new Set<string>();
  const addSeed = (seed: string, label: string) => {
    const d = decodeSeedLike(seed);
    if (!d || !d.checksumOk) return;
    if (publicEntropyRule(d.entropy)) { st.publicSkipped++; return; }
    if (seen.has(seed)) return;
    seen.add(seed);
    st.secrets++;
    st.needles.push(...needlesForSeed(seed, label));
  };
  const addHex = (v: string, label: string) => {
    const k = v.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    st.secrets++;
    st.needles.push({ value: k, label, kind: "hex" });
  };
  for (const f of files) {
    st.files.push(f);
    const raw = readFileSync(f, "utf8");
    const name = f.slice(f.lastIndexOf("/") + 1);
    let json: unknown;
    // ⚠ A malformed store file REFUSES (`REVIEW-056` S3-3). It used to fall back
    // to scanning the raw text for seeds, which silently dropped every 64-hex
    // scalar in it — the one shape only this class can find — while another
    // file kept the store non-empty, so no refusal fired.
    try { json = JSON.parse(raw); } catch (e) {
      throw new Error(`store file ${f} is not valid JSON (${String(e).slice(0, 80)}); the known-value class cannot tell its secrets from its hashes, so it refuses rather than guess`);
    }
    const walk = (o: unknown, path: string) => {
      if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
      else if (typeof o === "string") {
        const key = path.slice(path.lastIndexOf(".") + 1).replace(/\[\d+\]$/, "");
        if (decodeSeedLike(o)?.checksumOk) addSeed(o, `${name}:${path}`);
        else if (/^[0-9A-Fa-f]{64}$/.test(o) && components(key).some((c) => SECRET_COMPONENTS.has(c))) addHex(o, `${name}:${path}`);
      }
    };
    walk(json, "");
  }
  const envSk = env.WCONF_ELGAMAL_SK?.trim();
  if (envSk && /^[0-9A-Fa-f]{64}$/.test(envSk)) addHex(envSk, "environment: WCONF_ELGAMAL_SK");
  return st;
}

const HEXRUN = /[0-9A-Fa-f]{24,}/g;
export function knownHits(text: string, store: Store): Hit[] {
  if (!store.needles.length) return [];
  const out: Hit[] = [];
  // ⚠ Each hex needle is searched WITHOUT its leading zeros, so a stored secret
  // printed unpadded, as `BigInt.toString(16)` prints one in sixteen, is still
  // found; the padded form contains the unpadded one. Found from round three's
  // R3-1, which showed the shape rule's tail but not this class's.
  const hexN = store.needles.filter((n) => n.kind === "hex").map((n) => ({ ...n, value: n.value.replace(/^0+/, "") || n.value }));
  const b58N = store.needles.filter((n) => n.kind === "b58");
  for (const m of text.matchAll(HEXRUN)) {
    const run = m[0].toLowerCase();
    for (const n of hexN) {
      const k = run.indexOf(n.value);
      if (k !== -1) out.push({ cls: "known-value", at: m.index! + k, len: n.value.length, shown: n.label, why: "a value from the local secret store" });
    }
  }
  if (b58N.length) {
    for (const m of text.matchAll(B58RUN)) {
      for (const n of b58N) {
        const k = m[0].indexOf(n.value);
        if (k !== -1) out.push({ cls: "known-value", at: m.index! + k, len: n.value.length, shown: n.label, why: "a value from the local secret store" });
      }
    }
  }
  return out;
}

/** The one function every scan and every control calls. */
export function scanText(text: string, store: Store): Hit[] {
  return [
    ...seedHits(text), ...labelledHits(text), ...credentialHits(text),
    ...pathHits(text), ...emailHits(text), ...knownHits(text, store),
  ];
}

// ------------------------------------------------------------- enumeration

/**
 * ⚠ **Every git call ignores replacement objects** (`REVIEW-056` S2-2). By
 * default `cat-file` and `rev-list` silently substitute any object named under
 * `refs/replace/`, so a local replacement could show this gate harmless bytes
 * while a push publishes the original.
 */
const GIT_ENV: Record<string, string> = { GIT_NO_REPLACE_OBJECTS: "1" };

function git(repo: string, args: string[], input?: Uint8Array, env?: Record<string, string>): Uint8Array {
  const r = Bun.spawnSync(["git", "-C", repo, ...args], { stdin: input, stdout: "pipe", stderr: "pipe", env: { ...process.env, ...GIT_ENV, ...(env ?? {}) } });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${new TextDecoder().decode(r.stderr).trim()}`);
  return r.stdout;
}
const gitText = (repo: string, args: string[], input?: string) => new TextDecoder().decode(git(repo, args, input === undefined ? undefined : new TextEncoder().encode(input)));

/** Bytes as latin1, so every byte is one character and nothing is replaced. */
const asText = (b: Uint8Array) => Buffer.from(b.buffer, b.byteOffset, b.byteLength).toString("latin1");

export interface Unit {
  where: string; text: string; scope: "tree" | "history"; kind: "file" | "message" | "path";
  /** How many published paths carry this content; a file count counts these, not blobs. */
  paths?: number;
}

function* batchObjects(repo: string, shas: string[]): Generator<{ sha: string; type: string; body: Uint8Array }> {
  if (!shas.length) return;
  const out = git(repo, ["cat-file", "--batch"], new TextEncoder().encode(shas.join("\n") + "\n"));
  let i = 0;
  const dec = new TextDecoder();
  while (i < out.length) {
    const nl = out.indexOf(10, i);
    const [sha, type, size] = dec.decode(out.subarray(i, nl)).split(" ");
    if (type === "missing") throw new Error(`object ${sha} missing`);
    const n = Number(size);
    yield { sha, type, body: out.subarray(nl + 1, nl + 1 + n) };
    i = nl + 1 + n + 1;
  }
}

/**
 * ⚠ **Refuse what this gate cannot read as published** (`REVIEW-056` S2-1, S2-4).
 * A `filter` attribute means `git add` stores bytes a clean filter produced, or,
 * for Git LFS, a pointer while the content is published elsewhere. A
 * `working-tree-encoding` attribute re-encodes on the way in. A gitlink or a
 * nested repository publishes none of its content here. In each case the bytes
 * on disk are not the bytes published, so the gate refuses rather than scanning
 * the wrong ones. `git check-attr` reads `.gitattributes`, `.git/info/attributes`
 * and `core.attributesFile` alike.
 */
function refuseTransformedTree(repo: string, paths: string[], gitlinks: string[], source?: string): void {
  if (gitlinks.length) throw new Error(`a submodule or nested repository at ${gitlinks.slice(0, 5).join(", ")}: its content is another repository and is not scanned`);
  if (!paths.length) return;
  // ⚠ For `--rev`, the attributes are read FROM THAT COMMIT with `--source`, and
  // parsed by git, so a comment that mentions `filter=` is not a filter (R2-6).
  const src = source ? ["--source", source] : [];
  const out = gitText(repo, ["check-attr", "-z", "--stdin", ...src, "filter", "working-tree-encoding"], paths.join("\0") + "\0").split("\0");
  const bad: string[] = [];
  for (let i = 0; i + 2 < out.length; i += 3) if (out[i + 2] !== "unspecified" && out[i + 2] !== "unset") bad.push(`${out[i]} (${out[i + 1]}=${out[i + 2]})`);
  if (bad.length) throw new Error(`content-transforming attributes on ${bad.length} path(s), e.g. ${bad.slice(0, 3).join(", ")}: the published bytes are not the bytes on disk`);
}

/** What `git add -A` would commit, read from disk. Symlinks are not followed. */
export function treeUnits(repo: string): Unit[] {
  const names = gitText(repo, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean);
  const staged = gitText(repo, ["ls-files", "-z", "-s"]).split("\0").filter(Boolean);
  const gitlinks = staged.filter((l) => l.startsWith("160000 ")).map((l) => l.slice(l.indexOf("\t") + 1));
  // An untracked nested repository is listed as a directory: `git add -A` would record a gitlink.
  gitlinks.push(...names.filter((n) => n.endsWith("/")));
  refuseTransformedTree(repo, names.filter((n) => !n.endsWith("/")), gitlinks);
  const units: Unit[] = [];
  for (const n of [...new Set(names)]) {
    const p = join(repo, n);
    units.push({ where: n, text: n, scope: "tree", kind: "path" });
    if (!existsSync(p) && !lstatSync(p, { throwIfNoEntry: false })) {
      // Deleted on disk, still in the index: the index copy is what a plain commit publishes.
      try { units.push({ where: n, text: asText(git(repo, ["cat-file", "blob", `:${n}`])), scope: "tree", kind: "file" }); } catch { /* not in index either */ }
      continue;
    }
    const s = lstatSync(p);
    if (s.isSymbolicLink()) units.push({ where: `${n} (symlink target)`, text: readlinkSync(p), scope: "tree", kind: "file" });
    else if (s.isFile()) units.push({ where: n, text: asText(readFileSync(p)), scope: "tree", kind: "file" });
  }
  return units;
}

/**
 * Magic bytes of archives this gate cannot open. A build output holding one is
 * refused rather than scanned as opaque bytes.
 */
const UNREADABLE_ARCHIVES: [string, number[]][] = [
  ["zip", [0x50, 0x4b, 0x03, 0x04]], ["zip", [0x50, 0x4b, 0x05, 0x06]],
  ["zstd", [0x28, 0xb5, 0x2f, 0xfd]], ["xz", [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]],
  ["7z", [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]],
];
const DECOMPRESS_LIMIT = 256 * 1024 * 1024;
const startsWith = (b: Uint8Array, m: number[]) => b.length >= m.length && m.every((x, i) => b[i] === x);

/** The decompressed bytes of a whole-file gzip or brotli member, or null. */
function decompressed(path: string, body: Uint8Array): Uint8Array | null {
  for (const [name, magic] of UNREADABLE_ARCHIVES) if (startsWith(body, magic)) throw new Error(`${path} is a ${name} archive, which this gate cannot open`);
  let inner: Uint8Array | null = null;
  if (startsWith(body, [0x1f, 0x8b])) inner = gunzipSync(body, { maxOutputLength: DECOMPRESS_LIMIT });
  else if (/\.br$/i.test(path)) {
    try { inner = brotliDecompressSync(body, { maxOutputLength: DECOMPRESS_LIMIT }); }
    catch (e) { throw new Error(`${path} is named as brotli and does not decompress: ${String(e)}`); }
  }
  if (inner && (startsWith(inner, [0x1f, 0x8b]) || UNREADABLE_ARCHIVES.some(([, m]) => startsWith(inner!, m)))) {
    throw new Error(`${path} decompresses to another archive, which this gate does not open`);
  }
  return inner;
}

/**
 * Every regular file under `dir`, read from disk with no git filter. Paths are
 * relative to `dir`. ⚠ A decompressed copy is a second unit with `paths: 0`, so
 * the file count still counts files on disk.
 */
export function dirUnits(dir: string): Unit[] {
  const units: Unit[] = [];
  const walk = (rel: string) => {
    for (const name of readdirSync(join(dir, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name;
      const s = lstatSync(join(dir, r));
      if (s.isSymbolicLink()) throw new Error(`a symlink at ${r}: an upload may follow it, and its target is not scanned`);
      units.push({ where: r, text: r, scope: "tree", kind: "path" });
      if (s.isDirectory()) { walk(r); continue; }
      if (!s.isFile()) throw new Error(`${r} is not a regular file`);
      const body = readFileSync(join(dir, r));
      units.push({ where: r, text: asText(body), scope: "tree", kind: "file" });
      const inner = decompressed(r, body);
      if (inner) units.push({ where: `${r} (decompressed)`, text: asText(inner), scope: "tree", kind: "file", paths: 0 });
    }
  };
  if (!lstatSync(dir).isDirectory()) throw new Error(`${dir} is not a directory`);
  walk("");
  return units;
}

/** Exactly the blobs of one commit's tree. */
export function revUnits(repo: string, rev: string): Unit[] {
  // ⚠ Split at the FIRST tab only: a path may itself contain one (REVIEW-056 S2-3).
  const entries = gitText(repo, ["ls-tree", "-r", "-z", "--full-tree", rev]).split("\0").filter(Boolean).map((l) => {
    const t = l.indexOf("\t");
    const [mode, type, sha] = l.slice(0, t).split(" ");
    return { mode, type, sha, path: l.slice(t + 1) };
  });
  const gitlinks = entries.filter((e) => e.type === "commit").map((e) => e.path);
  if (gitlinks.length) throw new Error(`a submodule at ${gitlinks.slice(0, 5).join(", ")}: its content is another repository and is not scanned`);
  const blobs = entries.filter((e) => e.type === "blob");
  refuseTransformedTree(repo, blobs.map((e) => e.path), [], rev);
  const pathsOf = new Map<string, string[]>();
  for (const e of blobs) pathsOf.set(e.sha, [...(pathsOf.get(e.sha) ?? []), e.path]);
  const units: Unit[] = blobs.map((e) => ({ where: e.path, text: e.path, scope: "tree" as const, kind: "path" as const }));
  for (const o of batchObjects(repo, [...pathsOf.keys()])) {
    const ps = pathsOf.get(o.sha)!;
    units.push({ where: ps.join("; "), text: asText(o.body), scope: "tree", kind: "file", paths: ps.length });
  }
  return units;
}

/** A commit or tag message, without the identity and signature headers. */
function messageOf(body: Uint8Array): string {
  const t = asText(body);
  const split = t.indexOf("\n\n");
  const head = split === -1 ? t : t.slice(0, split);
  const msg = split === -1 ? "" : t.slice(split + 2);
  // Keep header lines that are not identity or signature: none carry free text
  // except `encoding`, so only the message is returned.
  void head;
  return msg;
}

export function historyUnits(repo: string): Unit[] {
  // ⚠ A shallow clone or a grafts file hides history from rev-list, so a pass
  // over it would not be a pass over what the repository holds.
  if (gitText(repo, ["rev-parse", "--is-shallow-repository"]).trim() === "true") throw new Error("the repository is shallow; history mode needs every commit");
  const grafts = gitText(repo, ["rev-parse", "--git-path", "info/grafts"]).trim();
  if (existsSync(join(repo, grafts)) || existsSync(grafts)) throw new Error(`a grafts file exists at ${grafts}; it rewrites what rev-list sees`);
  const lines = gitText(repo, ["rev-list", "--objects", "--all"]).split("\n").filter(Boolean);
  const pathOf = new Map<string, string>();
  for (const l of lines) {
    const sp = l.indexOf(" ");
    const sha = sp === -1 ? l : l.slice(0, sp);
    if (!pathOf.has(sha)) pathOf.set(sha, sp === -1 ? "" : l.slice(sp + 1));
  }
  const tags = gitText(repo, ["for-each-ref", "--format=%(objectname) %(objecttype)", "refs/tags"]).split("\n").filter((l) => l.endsWith(" tag")).map((l) => l.split(" ")[0]);
  const units: Unit[] = [];
  for (const o of batchObjects(repo, [...pathOf.keys(), ...tags])) {
    const p = pathOf.get(o.sha) ?? "";
    if (o.type === "blob") units.push({ where: `${p} @ blob ${o.sha.slice(0, 10)}`, text: asText(o.body), scope: "history", kind: "file" });
    else if (o.type === "commit" || o.type === "tag") units.push({ where: `${o.type} ${o.sha.slice(0, 10)} message`, text: messageOf(o.body), scope: "history", kind: "message" });
  }
  // NUL-separated, because a path may contain a tab or a newline (REVIEW-056 S2-3).
  const paths = new Set(gitText(repo, ["log", "--all", "-m", "--format=", "--name-only", "--no-renames", "-z"]).split("\0").filter(Boolean));
  for (const p of paths) units.push({ where: `${p} (a path some commit touched)`, text: p, scope: "history", kind: "path" });
  return units;
}

export interface Finding extends Hit { where: string; line: number; scope: "tree" | "history" }

export function scanUnits(units: Unit[], store: Store): { findings: Finding[]; allowed: Map<string, number>; seenAllowed: Set<string> } {
  const findings: Finding[] = [];
  const allowed = new Map<string, number>();
  const seenAllowed = new Set<string>();
  for (const u of units) {
    const hits = u.kind === "path" ? [secretFileHit(u.text), ...pathHits(u.text), ...emailHits(u.text)].filter((h): h is Hit => !!h) : scanText(u.text, store);
    for (const h of hits) {
      if (h.allowedBy) {
        const k = `${h.cls}: ${h.allowedBy}`;
        allowed.set(k, (allowed.get(k) ?? 0) + 1);
        seenAllowed.add(h.allowedBy);
        continue;
      }
      const line = u.kind === "path" ? 0 : u.text.slice(0, h.at).split("\n").length;
      findings.push({ ...h, where: u.where, line, scope: u.scope });
    }
  }
  return { findings, allowed, seenAllowed };
}

// ------------------------------------------------------------------ controls

/**
 * ⚠⚠ **What this gate cannot see.** Each entry is also an ASSERTED-UNCAUGHT
 * control in `runControls()`: the planted secret must NOT be found. If a later
 * change starts finding one, the control fails and this list must be updated,
 * so the disclosure cannot go stale.
 */
export const LIMITS: string[] = [
  "a secret split across two string literals or two lines",
  "a secret in UTF-16, base64, gzip or any other re-encoding",
  "an unlabelled 64-hex ElGamal secret that is NOT in the local store (no shape rule can tell it from a hash)",
  "a seed or key in RFC 1751 words, or as a decimal or byte array",
  "a home path under a user name on the generic list",
  "a labelled scalar printed in fewer than 48 hex digits: a uniform key is that short with probability below 2^-64",
  "a secret listed as an array element under a label, rather than as the value of a key",
  "gitignored files, the reflog and unreachable objects: none of them is published",
  "a hostname, a machine serial, or a person's name — only paths and email addresses are personal-data classes",
];

let controlsRun = 0;
let controlsFailed: string[] = [];
function control(name: string, ok: boolean, detail = "") {
  controlsRun++;
  if (!ok) controlsFailed.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const randName = () => "u" + randomBytes(5).toString("hex");
const realSeed = (type: SeedType) => encodeSeed(randomBytes(16), type);

/**
 * Builds a throwaway repository with planted secrets and runs the REAL
 * `scanRepo()` over it in tree mode and in history mode. The planted values are
 * generated here, at runtime, so this file contains none of them.
 */
export function runControls(): { run: number; failed: string[] } {
  controlsRun = 0;
  controlsFailed = [];
  const root = mkdtempSync(join(tmpdir(), "check-no-secrets-"));
  const repo = join(root, "repo");
  const storeDir = join(root, "store");
  mkdirSync(repo);
  mkdirSync(storeDir);
  const env = { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_AUTHOR_NAME: "control", GIT_AUTHOR_EMAIL: "control@example.invalid", GIT_COMMITTER_NAME: "control", GIT_COMMITTER_EMAIL: "control@example.invalid" };
  const g = (...a: string[]) => git(repo, a, undefined, env);
  const put = (p: string, body: string | Uint8Array) => { mkdirSync(dirname(join(repo, p)), { recursive: true }); writeFileSync(join(repo, p), body); };
  const refuses = (fn: () => unknown, needle: string) => { try { fn(); return false; } catch (e) { return String(e).includes(needle); } };
  try {
    g("init", "-q", "-b", "main");
    const name = randName();
    const known = { seed: realSeed("ed25519"), sk: randomBytes(32).toString("hex").toUpperCase(), zeroSk: "00" + randomBytes(31).toString("hex") };
    writeFileSync(join(storeDir, "state.json"), JSON.stringify({ holder: { seed: known.seed }, issuerElGamal: { sk: known.sk }, holderElGamal: { sk: known.zeroSk }, public: { seed: encodeSeed(Buffer.alloc(16), "secp256k1") } }));
    // ⚠ A second copy of the same secrets, as rebuild-env.sh keeps one in /tmp
    // and one in ~/.wconf. Without it the de-duplication is never exercised and
    // removing it passes every control (found by break-no-secrets-gate.ts).
    writeFileSync(join(storeDir, "state.json.bak"), JSON.stringify({ holder: { seed: known.seed }, issuerElGamal: { sk: known.sk.toLowerCase() } }));
    const knownDerived = deriveElGamalKey(known.seed).sk;
    const knownEntropy = hex(decodeSeedLike(known.seed)!.entropy).toUpperCase();
    const secp = realSeed("secp256k1"), ed = realSeed("ed25519"), glued = realSeed("ed25519"), crlf = realSeed("secp256k1");
    let near = ed.slice(0, -1) + (ed.endsWith("r") ? "p" : "r");
    if (decodeSeedLike(near)?.checksumOk) near = ed.slice(0, -1) + (ed.endsWith("s") ? "h" : "s");
    const sc = (n = 32) => randomBytes(n).toString("hex");
    const at = "@";
    const users = "/" + "Users/";

    // ---- must be found (tree)
    put("src/comment.rs", `fn main() {}\n// rotate later: ${secp}\n`);
    put("src/literal.ts", `export const s = "${ed}";\n`);
    put("docs/near.md", `typo'd: ${near}\n`);
    put("docs/glued.md", `abc${glued}xyz\n`);
    put("evidence/dump.txt", `{ "issuerElGamal": { "sk": "${sc()}" } }\n`);
    put("docs/env.md", "```sh\nWCONF_ELGAMAL_SK=" + sc() + " bun run tools/x.ts\n```\n");
    put("src/typed.rs", `const ISSUER_SK: &str = "${sc()}";\n`);
    // REVIEW-056 S3-1: a label on the previous line, a value before its label in
    // a table, an unpadded scalar; and S4-1's bound, just above it.
    put("evidence/pretty.json", `{"private_key":\n  "${sc()}"}\n`);
    put("docs/table.md", `| value | what |\n|---|---|\n| ${sc()} | private key |\n`);
    put("evidence/unpadded.txt", `private_key: ${sc().slice(1)}\n`);
    put("evidence/pretty-entropy.json", `{"entropy":\n  "${sc(16)}"}\n`);
    put("evidence/above-toy.txt", `sk: 0x${(1n << 40n).toString(16).padStart(64, "0")}\n`);
    // REVIEW-056 S1-1: every credential pattern, not two of them.
    for (const [i, c] of CREDENTIALS.entries()) put(`creds/${i}.txt`, `${c.sample()}\n`);
    // REVIEW-056 round two: the variant each fix exists for, not the example.
    put("evidence/pretty-blank.json", `{"private_key":\n\n  "${sc()}"}\n`);
    put("evidence/unpadded-57.txt", `private_key: ${sc().slice(7)}\n`);
    put("creds/aws-json.txt", `{"SecretAccessKey":"${rnd(40, ALNUM + "/+")}"}\n`);
    put("creds/aws-hyphen.txt", `aws-secret-access-key: ${rnd(40, ALNUM + "/+")}\n`);
    put("creds/slack-tail.txt", `${"xo" + "xb-" + rnd(24)}${"-".repeat(16)}\n`);
    put("creds/google-hyphen.txt", `${"AI" + "za" + rnd(34)}-\n`);
    put("logs/home-alice.txt", `${users}alice/x\n`);
    // ⚠ Not `home-Alice.txt`: on a case-insensitive filesystem that is the same
    // file as `home-alice.txt`, and the two controls merged into one.
    put("logs/home-cited-name.txt", `${users}Alice/private-client/plan.md\n`);
    put("creds/aws-spaced.txt", `AWS Secret Access Key = ${rnd(40, ALNUM + "/+")}\n`);
    put("evidence/entropy.json", `{"entropy": "${sc(16)}"}\n`);
    put("notes/known-bare.txt", `${known.sk.toLowerCase()}\n`);
    put("notes/known-derived.txt", `${knownDerived}\n`);
    put("notes/known-entropy.txt", `${knownEntropy}\n`);
    put("notes/known-unpadded.txt", `sk = ${BigInt("0x" + known.zeroSk).toString(16)}\n`);
    put("logs/home.txt", `cd ${users}${name}/work\n`);
    put("logs/home.json", `{"cwd":"\\/Users\\/${name}\\/work"}\n`);
    put("logs/home-dash.txt", `/private/tmp/claude-501/-Users-${name}-Development-x/scratch\n`);
    put("logs/home-linux.txt", `cd /` + `home/${name}/src\n`);
    put("logs/home-win.txt", `C:\\Users\\${name}\\src\n`);
    put("logs/home-url.txt", `file%2FUsers%2F${name}%2Fx\n`);
    put("logs/tmp.txt", `/var/` + `folders/ab/${randomBytes(12).toString("hex")}/T/x\n`);
    put("docs/reviews/r.md", `Author: Someone <${name}${at}gmail.com>\n`);
    put("cred.txt", `token gh` + `p_${randomBytes(18).toString("hex")}\n`);
    put("key.txt", `-----BEGIN ` + `OPENSSH PRIVATE KEY-----\nAAAA\n`);
    put("state.json", "{}\n");
    put("crlf.txt", `x\r\n${crlf}`);
    put("no-extension-file", `${realSeed("ed25519")}\n`);
    put("bin.dat", Buffer.concat([Buffer.from([0, 1, 2, 0]), Buffer.from(realSeed("secp256k1")), Buffer.from([0, 255])]));
    put("../outside.txt", `${realSeed("ed25519")}\n`);
    symlinkSync(join(root, "outside.txt"), join(repo, "link-out"));
    symlinkSync(`${users}${name}/x`, join(repo, "link-home"));

    // ---- must NOT be found
    const pubSecp = encodeSeed(Buffer.alloc(16), "secp256k1");
    const pubEd = encodeSeed(Buffer.from(Uint8Array.from({ length: 16 }, (_, i) => i)), "ed25519");
    const genesis = encodeSeed(Buffer.from(GENESIS_ENTROPY), "secp256k1");
    const pubSk = deriveElGamalKey(pubEd).sk;
    put("pass/public.rs", [
      `// ${pubSecp}`, `const S: &str = "${pubEd}";`, `let g = "${genesis}";`,
      `sk: "${pubSk}"`, `"entropy": "000102030405060708090a0b0c0d0e0f"`,
      `sk_A = 0x${"0".repeat(63)}7`, `vector1.sk_A ${CITED_VECTORS[CITED_VECTORS.length - 1].value}`,
      `tx ${sc()}`, `rGCkuB7PBr5tNy68tPEABEtcdno4hE6Y7f`,
      `noreply${at}github.com probe${at}example.invalid x${at}attacker.example`,
      `${users}<you>/x /` + `home/runner/work $HOME/.wconf/state.json ~/.wconf/state.json`,
      `git${at}github.com:XRPLF/x.git ripple-binary-codec${at}2.9.0`,
      `https://example.com/home/index.html https://github.com/Users/x`,
      // The after-window is for table rows only: a public key before a secret's label on a JSON line is not a secret.
      `{"pk":"${sc(33)}","sk":"${pubSk}"}`,
      `| ${sc()} | tx hash |`,
      `sk_A = ${"01".repeat(32)}`, `aws_secret_access_key = ${"A".repeat(40)}`,
    ].join("\n") + "\n");
    put(".gitignore", "*.log\ndist/\n");
    put("ignored.log", `${realSeed("ed25519")}\n`);
    // ---- a build output: gitignored, so the tree mode must miss it and --dir must not (REVIEW-058 R1-9)
    put("dist/assets/app.js", `const k = "${realSeed("ed25519")}";\n`);
    put("dist/.hidden.json", `{"issuerElGamal": {"sk": "${sc()}"}}\n`);
    put("dist/assets/app.js.gz", gzipSync(Buffer.from(`x = "${realSeed("secp256k1")}"\n`)));
    put("dist/assets/style.css.br", brotliCompressSync(Buffer.from(`/* ${users}${name}/x */\n`)));
    put("dist/assets/disguised.txt", gzipSync(Buffer.from(`${known.sk}\n`)));
    put("dist/clean.html", `<p>${pubEd} sk: "${pubSk}"</p>\n`);

    // ---- asserted uncaught: the LIMITS, each planted and each required NOT found
    const lim = realSeed("ed25519");
    put("limits/split.ts", `const s = "${lim.slice(0, 12)}" + "${lim.slice(12)}";\n`);
    put("limits/utf16.txt", Buffer.from(realSeed("ed25519"), "utf16le"));
    put("limits/base64.txt", Buffer.from(realSeed("ed25519")).toString("base64") + "\n");
    put("limits/gzip.gz", gzipSync(Buffer.from(realSeed("ed25519"))));
    put("limits/unlabelled.txt", `${sc()}\n`);
    put("limits/bytes.rs", `const E: [u8; 16] = [${[...randomBytes(16)].join(", ")}];\n`);
    put("limits/generic.txt", `${users}runner/x\n`);
    put("limits/array.json", `{"issuer secret keys": [\n  "${sc()}"\n]}\n`);
    put("limits/short-scalar.txt", `private_key: f${sc().slice(0, 46)}\n`);

    g("add", "-A");
    g("commit", "-q", "--no-gpg-sign", "-m", "planted");
    // ---- history only: committed, then removed; and a message carrying a seed.
    // ⚠ The author here is a PERSONAL address, not a reserved one, so the
    // header-stripping control below would fail if headers were scanned. With a
    // reserved address it would pass either way and test nothing.
    const gh = (...a: string[]) => git(repo, a, undefined, { ...env, GIT_AUTHOR_EMAIL: `${name}${at}gmail.com`, GIT_COMMITTER_EMAIL: `${name}${at}gmail.com` });
    const gone = realSeed("secp256k1");
    put("gone.txt", `${gone}\n`);
    gh("add", "gone.txt");
    gh("commit", "-q", "--no-gpg-sign", "-m", "add gone");
    gh("rm", "-q", "gone.txt");
    gh("commit", "-q", "--no-gpg-sign", "-m", `remove it; seed was ${realSeed("ed25519")}`);
    // ---- untracked, not ignored: `git add -A` would publish it
    put("untracked.txt", `${realSeed("secp256k1")}\n`);
    // ---- staged, then deleted on disk: a plain `git commit` still publishes the index copy
    put("staged-then-deleted.txt", `${realSeed("ed25519")}\n`);
    g("add", "staged-then-deleted.txt");
    rmSync(join(repo, "staged-then-deleted.txt"));

    const store = loadStore([storeDir], {});
    control("the control store loads exactly three secrets from two copies and skips the public seed", store.secrets === 3 && store.files.length === 2 && store.publicSkipped === 1, `secrets=${store.secrets} files=${store.files.length} public=${store.publicSkipped}`);
    const tree = scanRepo(repo, store, { tree: true, history: false });
    const hist = scanRepo(repo, store, { tree: false, history: true });
    const has = (fs: Finding[], where: string, cls: Cls) => fs.some((f) => f.where.startsWith(where) && f.cls === cls);
    const none = (fs: Finding[], where: string) => !fs.some((f) => f.where.startsWith(where));

    const mustTree: [string, Cls, string][] = [
      ["src/comment.rs", "seed", "a secp256k1 seed inside a comment"],
      ["src/literal.ts", "seed", "an ed25519 seed inside a string literal"],
      ["docs/near.md", "seed", "a seed whose checksum fails"],
      ["docs/glued.md", "seed", "a seed glued to other base58 characters"],
      ["evidence/dump.txt", "labelled-scalar", "an ElGamal secret under a JSON 'sk' key"],
      ["docs/env.md", "labelled-scalar", "a WCONF_ELGAMAL_SK assignment in a shell block"],
      ["src/typed.rs", "labelled-scalar", "a secret behind a Rust type annotation"],
      ["evidence/pretty.json", "labelled-scalar", "a secret whose label is on the previous line"],
      ["docs/table.md", "labelled-scalar", "a secret before its label in a table row"],
      ["evidence/unpadded.txt", "labelled-scalar", "an unpadded 63-digit secret"],
      ["evidence/pretty-entropy.json", "seed-entropy-hex", "seed entropy whose label is on the previous line"],
      ["evidence/above-toy.txt", "labelled-scalar", "a labelled scalar just above the toy bound"],
      ["evidence/pretty-blank.json", "labelled-scalar", "a secret whose label is two lines up, past a blank line"],
      ["evidence/unpadded-57.txt", "labelled-scalar", "an unpadded 57-digit secret"],
      ["creds/aws-json.txt", "credential", "an AWS secret under the CLI's SecretAccessKey label"],
      ["creds/aws-hyphen.txt", "credential", "an AWS secret under a hyphenated label"],
      ["creds/slack-tail.txt", "credential", "a real token followed by sixteen repeated characters"],
      ["creds/google-hyphen.txt", "credential", "a Google key ending in a hyphen"],
      ["logs/home-alice.txt", "personal-path", "a lower-case alice home path"],
      ["logs/home-cited-name.txt", "personal-path", "a home path under the name round one's fixture used"],
      ["creds/aws-spaced.txt", "credential", "an AWS secret under a label with spaces"],
      ["evidence/entropy.json", "seed-entropy-hex", "a seed's entropy in hex under 'entropy'"],
      ["notes/known-bare.txt", "known-value", "a stored ElGamal secret, unlabelled and lower-cased"],
      ["notes/known-derived.txt", "known-value", "the ElGamal key DERIVED from a stored seed"],
      ["notes/known-entropy.txt", "known-value", "a stored seed's entropy in upper-case hex"],
      ["notes/known-unpadded.txt", "known-value", "a stored secret printed without its leading zeros"],
      ["logs/home.txt", "personal-path", "a macOS home path"],
      ["logs/home.json", "personal-path", "a JSON-escaped home path"],
      ["logs/home-dash.txt", "personal-path", "a dash-encoded home path"],
      ["logs/home-linux.txt", "personal-path", "a Linux home path"],
      ["logs/home-win.txt", "personal-path", "a Windows home path"],
      ["logs/home-url.txt", "personal-path", "a URL-encoded home path"],
      ["logs/tmp.txt", "personal-path", "a macOS per-user temp path"],
      ["docs/reviews/r.md", "email", "a personal email inside docs/reviews (no directory is exempt)"],
      ["cred.txt", "credential", "a GitHub token"],
      ["key.txt", "credential", "a PEM private key header"],
      ["state.json", "secret-file", "a tracked file named state.json"],
      ["crlf.txt", "seed", "a seed at end of file after CRLF, no trailing newline"],
      ["no-extension-file", "seed", "a seed in a file with no extension"],
      ["bin.dat", "seed", "a seed inside a binary file"],
      ["untracked.txt", "seed", "an untracked, unignored file (git add -A would publish it)"],
      ["staged-then-deleted.txt", "seed", "the index copy of a file staged and then deleted on disk"],
      ["link-home (symlink target)", "personal-path", "a symlink whose target is a home path"],
    ];
    for (const [w, c, why] of mustTree) control(`tree finds ${why}`, has(tree.findings, w, c), `${w} ${c}`);
    for (const [i, c] of CREDENTIALS.entries()) control(`credential: ${c.name}`, tree.findings.some((f) => f.where === `creds/${i}.txt` && f.cls === "credential" && f.why === c.name));
    // Its TARGET string is scanned (on macOS it is a per-user temp path, and is
    // reported); the file it points at, which holds a seed, must not be read.
    control("tree does not follow a symlink out of the repository", !has(tree.findings, "link-out", "seed"));
    control("tree does not scan a gitignored file (it is not published)", none(tree.findings, "ignored.log"));

    // ---- --dir, through the same scanRepo(): ignored build files are read (REVIEW-058 R1-9)
    control("tree does not scan a gitignored build output", none(tree.findings, "dist/"));
    const dist = scanRepo(repo, store, { tree: true, history: false, dir: join(repo, "dist") });
    const mustDir: [string, Cls, string][] = [
      ["assets/app.js", "seed", "a seed in a gitignored build file"],
      [".hidden.json", "labelled-scalar", "a labelled secret in a dotfile"],
      ["assets/app.js.gz (decompressed)", "seed", "a seed inside a gzip file"],
      ["assets/style.css.br (decompressed)", "personal-path", "a home path inside a brotli file"],
      ["assets/disguised.txt (decompressed)", "known-value", "a stored secret in gzip under a .txt name"],
    ];
    for (const [w, c, why] of mustDir) control(`--dir finds ${why}`, has(dist.findings, w, c), `${w} ${c}`);
    control("--dir finds nothing in a clean file", none(dist.findings, "clean.html"), dist.findings.filter((f) => f.where.startsWith("clean.html")).map((f) => `${f.cls} ${f.why}`).join("; "));
    control("--dir counts files on disk, not decompressed copies", dist.unitsTree === 6, `unitsTree=${dist.unitsTree}`);
    const dirRefuses = (name: string, setup: (d: string) => void, want: string) => {
      const d = join(root, `dir-${name}`);
      mkdirSync(d);
      setup(d);
      control(`--dir REFUSES ${name}`, refuses(() => scanRepo(repo, store, { tree: true, history: false, dir: d }), want));
    };
    dirRefuses("a symlink", (d) => { writeFileSync(join(d, "a.txt"), "x\n"); symlinkSync(join(d, "a.txt"), join(d, "link")); }, "a symlink");
    dirRefuses("a zip archive", (d) => writeFileSync(join(d, "bundle.js"), Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0])), "zip archive");
    dirRefuses("a brotli name that does not decompress", (d) => writeFileSync(join(d, "x.js.br"), Buffer.from("not brotli at all")), "does not decompress");
    dirRefuses("gzip inside gzip", (d) => writeFileSync(join(d, "x.gz"), gzipSync(gzipSync(Buffer.from("x")))), "another archive");
    const emptyDir = join(root, "dir-empty");
    mkdirSync(emptyDir);
    const empty = scanRepo(repo, store, { tree: true, history: false, dir: emptyDir });
    control("--dir over an empty directory REFUSES", decide({ findings: empty.findings, store, requireStore: true, strictHistory: false, unitsTree: empty.unitsTree, unitsHistory: 0, tree: true, history: false }).exit === 2);
    control("--dir cannot be combined with history", refuses(() => scanRepo(repo, store, { tree: true, history: true, dir: emptyDir }), "no history"));
    control("tree does not see a file deleted in history", none(tree.findings, "gone.txt"));
    control("tree finds nothing in the must-pass file", none(tree.findings, "pass/"), tree.findings.filter((f) => f.where.startsWith("pass/")).map((f) => `${f.cls} ${f.why}`).join("; "));
    control("history finds a seed in a file deleted later", has(hist.findings, "gone.txt", "seed"));
    control("history finds a seed in a commit message", hist.findings.some((f) => f.where.startsWith("commit ") && f.cls === "seed"));
    control("history finds the tracked state.json by path", hist.findings.some((f) => f.where.startsWith("state.json (a path") && f.cls === "secret-file"));
    control("history does not report the control author's identity", !hist.findings.some((f) => f.cls === "email" && f.where.startsWith("commit ")));
    control("history does not scan the untracked file", none(hist.findings, "untracked.txt"));
    for (const w of ["limits/split.ts", "limits/utf16.txt", "limits/base64.txt", "limits/gzip.gz", "limits/unlabelled.txt", "limits/bytes.rs", "limits/generic.txt", "limits/array.json", "limits/short-scalar.txt"]) {
      control(`asserted uncaught (a LIMIT, printed every run): ${w}`, none(tree.findings, w), "now caught — update LIMITS");
    }
    // The decision layer, through the same function main() calls.
    control("an empty store with the store required REFUSES", decide({ findings: [], store: { files: [], needles: [], secrets: 0, publicSkipped: 0 }, requireStore: true, strictHistory: false, unitsTree: 1, unitsHistory: 1, tree: true, history: true }).exit === 2);
    control("a personal path in history alone does not fail by default", decide({ findings: [{ ...dummy("personal-path"), scope: "history" }], store, requireStore: true, strictHistory: false, unitsTree: 1, unitsHistory: 1, tree: true, history: true }).exit === 0);
    control("a personal path in history fails under --strict-history", decide({ findings: [{ ...dummy("personal-path"), scope: "history" }], store, requireStore: true, strictHistory: true, unitsTree: 1, unitsHistory: 1, tree: true, history: true }).exit === 1);
    control("a seed in history fails by default", decide({ findings: [{ ...dummy("seed"), scope: "history" }], store, requireStore: true, strictHistory: false, unitsTree: 1, unitsHistory: 1, tree: true, history: true }).exit === 1);
    control("zero files scanned REFUSES", decide({ findings: [], store, requireStore: true, strictHistory: false, unitsTree: 0, unitsHistory: 1, tree: true, history: true }).exit === 2);
    // ---- the --rev enumerator, on the same repository (REVIEW-056 S1-1: it had no control).
    const rev = scanRepo(repo, store, { tree: true, history: false, rev: "HEAD" });
    control("--rev finds a committed seed", has(rev.findings, "src/comment.rs", "seed"));
    control("--rev does not see an uncommitted file", none(rev.findings, "untracked.txt"));
    control("--rev at an older commit sees a file deleted since", has(scanRepo(repo, store, { tree: true, history: false, rev: "HEAD~1" }).findings, "gone.txt", "seed"));

    // ---- refusals and the git environment, each in a repository of its own (REVIEW-056 S2).
    const sub = (n: string) => { const r = join(root, n); mkdirSync(r); git(r, ["init", "-q", "-b", "main"], undefined, env); return r; };
    const gx = (r: string, ...a: string[]) => git(r, a, undefined, env);

    const fr = sub("filter");
    writeFileSync(join(fr, ".gitattributes"), "payload.txt filter=inject\n");
    writeFileSync(join(fr, "payload.txt"), "SAFE\n");
    control("a content-transforming attribute REFUSES the tree", refuses(() => scanRepo(fr, store, { tree: true, history: false }), "content-transforming"));
    gx(fr, "add", "-A");
    gx(fr, "commit", "-q", "--no-gpg-sign", "-m", "x");
    // ⚠ Removed from the working tree AND the index after the commit, so --rev
    // must read the COMMIT's attributes to refuse (R2-6). Removing it from disk
    // alone was not enough: git falls back to the index copy, and the harness
    // showed that mutation passing every control.
    gx(fr, "rm", "-q", ".gitattributes");
    control("a content-transforming attribute REFUSES --rev", refuses(() => scanRepo(fr, store, { tree: true, history: false, rev: "HEAD" }), "content-transforming"));
    const ac = sub("attr-comment");
    writeFileSync(join(ac, ".gitattributes"), "# an example, not a rule: *.txt filter=inject\n");
    writeFileSync(join(ac, "payload.txt"), "SAFE\n");
    gx(ac, "add", "-A");
    gx(ac, "commit", "-q", "--no-gpg-sign", "-m", "x");
    control("a comment mentioning filter= does not refuse --rev", (() => { try { scanRepo(ac, store, { tree: true, history: false, rev: "HEAD" }); return true; } catch { return false; } })());

    const rr = sub("replace");
    writeFileSync(join(rr, "f.txt"), `${realSeed("ed25519")}\n`);
    gx(rr, "add", "f.txt");
    gx(rr, "commit", "-q", "--no-gpg-sign", "-m", "x");
    const orig = gitText(rr, ["rev-parse", "HEAD:f.txt"]).trim();
    writeFileSync(join(rr, "f.txt"), "SAFE\n");
    const safeBlob = gitText(rr, ["hash-object", "-w", "f.txt"]).trim();
    gx(rr, "replace", orig, safeBlob);
    control("a replacement object does not hide a seed from --rev", has(scanRepo(rr, store, { tree: true, history: false, rev: "HEAD" }).findings, "f.txt", "seed"));
    control("a replacement object does not hide a seed from history", has(scanRepo(rr, store, { tree: false, history: true }).findings, "f.txt", "seed"));

    const tr = sub("tab");
    mkdirSync(join(tr, "a\tb"));
    writeFileSync(join(tr, "a\tb", "state.json"), "{}\n");
    gx(tr, "add", "-A");
    gx(tr, "commit", "-q", "--no-gpg-sign", "-m", "x");
    const tabbed = (fs: Finding[]) => fs.some((f) => f.cls === "secret-file" && f.where.includes("\tb/state.json"));
    control("a tab in a path does not hide its suffix from --rev", tabbed(scanRepo(tr, store, { tree: true, history: false, rev: "HEAD" }).findings));
    control("a tab in a path does not hide its suffix from history", tabbed(scanRepo(tr, store, { tree: false, history: true }).findings));

    const sm = sub("submodule");
    writeFileSync(join(sm, "x.txt"), "x\n");
    gx(sm, "add", "x.txt");
    gx(sm, "update-index", "--add", "--cacheinfo", `160000,${"ab".repeat(20)},vendor/sub`);
    control("a gitlink REFUSES the tree", refuses(() => scanRepo(sm, store, { tree: true, history: false }), "submodule or nested repository"));
    gx(sm, "commit", "-q", "--no-gpg-sign", "-m", "x");
    control("a gitlink REFUSES --rev", refuses(() => scanRepo(sm, store, { tree: true, history: false, rev: "HEAD" }), "a submodule at"));

    const nr = sub("nested");
    writeFileSync(join(nr, "x.txt"), "x\n");
    mkdirSync(join(nr, "inner"));
    git(join(nr, "inner"), ["init", "-q"], undefined, env);
    writeFileSync(join(nr, "inner", "y.txt"), "y\n");
    control("an untracked nested repository REFUSES the tree", refuses(() => scanRepo(nr, store, { tree: true, history: false }), "submodule or nested repository"));

    // A grafts file can make a commit look parentless and hide what its parent holds (R2-7).
    const gr = sub("grafts");
    writeFileSync(join(gr, "old.txt"), `${realSeed("ed25519")}\n`);
    gx(gr, "add", "old.txt");
    gx(gr, "commit", "-q", "--no-gpg-sign", "-m", "old");
    gx(gr, "rm", "-q", "old.txt");
    gx(gr, "commit", "-q", "--allow-empty", "--no-gpg-sign", "-m", "new");
    writeFileSync(join(gr, ".git", "info", "grafts"), `${gitText(gr, ["rev-parse", "HEAD"]).trim()}\n`);
    control("a grafts file REFUSES history", refuses(() => scanRepo(gr, store, { tree: false, history: true }), "grafts"));

    const shallow = join(root, "shallow");
    git(root, ["clone", "-q", "--depth", "1", `file://${repo}`, shallow], undefined, env);
    control("a shallow clone REFUSES history", refuses(() => scanRepo(shallow, store, { tree: false, history: true }), "shallow"));

    const dp = sub("dupes");
    writeFileSync(join(dp, "a.txt"), "same\n");
    writeFileSync(join(dp, "b.txt"), "same\n");
    gx(dp, "add", "-A");
    gx(dp, "commit", "-q", "--no-gpg-sign", "-m", "x");
    control("--rev counts two paths with one blob as two files", scanRepo(dp, store, { tree: true, history: false, rev: "HEAD" }).unitsTree === 2);

    const badStore = join(root, "badstore");
    mkdirSync(badStore);
    writeFileSync(join(badStore, "good.json"), JSON.stringify({ x: { seed: realSeed("ed25519") } }));
    writeFileSync(join(badStore, "broken.json"), `{"sk":"${sc()}"`);
    control("a malformed store file REFUSES", refuses(() => loadStore([badStore], {}), "not valid JSON"));
    control("scanning nothing at all REFUSES", decide({ findings: [], store, requireStore: true, strictHistory: false, unitsTree: 0, unitsHistory: 0, tree: false, history: false }).exit === 2);

    // The decoder against an independent encoder.
    const sEd = realSeed("ed25519"), sSecp = realSeed("secp256k1");
    control("the decoder agrees with ripple-address-codec on both algorithms", decodeSeedLike(sEd)?.type === "ed25519" && !!decodeSeedLike(sEd)?.checksumOk && decodeSeedLike(sSecp)?.type === "secp256k1" && !!decodeSeedLike(sSecp)?.checksumOk);
  } catch (e) {
    control("the controls ran to completion", false, String(e));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  return { run: controlsRun, failed: controlsFailed };
}

const dummy = (cls: Cls): Finding => ({ cls, at: 0, shown: "x", why: "x", where: "x", line: 1, scope: "tree" });

// ------------------------------------------------------------- the decision

export interface ScanResult { findings: Finding[]; allowed: Map<string, number>; seenAllowed: Set<string>; unitsTree: number; unitsHistory: number }

export function scanRepo(repo: string, store: Store, o: { tree: boolean; history: boolean; rev?: string; dir?: string }): ScanResult {
  if (o.dir && (o.history || o.rev)) throw new Error("--dir scans one directory; it has no history and no revision");
  const t = o.tree ? (o.dir ? dirUnits(o.dir) : o.rev ? revUnits(repo, o.rev) : treeUnits(repo)) : [];
  const h = o.history ? historyUnits(repo) : [];
  const r = scanUnits([...t, ...h], store);
  // ⚠ Files are counted by PATH, not by unique blob (REVIEW-056 S5-3): two paths
  // with identical content are two published files.
  const files = (us: Unit[]) => us.filter((u) => u.kind === "file").reduce((n, u) => n + (u.paths ?? 1), 0);
  return { ...r, unitsTree: files(t), unitsHistory: h.filter((u) => u.kind !== "path").length };
}

interface DecideIn { findings: Finding[]; store: Store; requireStore: boolean; strictHistory: boolean; unitsTree: number; unitsHistory: number; tree: boolean; history: boolean }

export function decide(d: DecideIn): { exit: 0 | 1 | 2; word: string; failing: Finding[]; reported: Finding[]; why?: string } {
  if (d.requireStore && d.store.secrets === 0) return { exit: 2, word: "REFUSED", failing: [], reported: [], why: "no local secret store found; the known-value class cannot run (pass --no-local-store for the shape classes only)" };
  if (!d.tree && !d.history) return { exit: 2, word: "REFUSED", failing: [], reported: [], why: "nothing was selected to scan" };
  if ((d.tree && d.unitsTree === 0) || (d.history && d.unitsHistory === 0)) return { exit: 2, word: "REFUSED", failing: [], reported: [], why: "zero files scanned; an empty scan is not a pass" };
  const failing = d.findings.filter((f) => f.scope === "tree" || d.strictHistory || !PERSONAL.has(f.cls));
  const reported = d.findings.filter((f) => !failing.includes(f));
  if (failing.length) return { exit: 1, word: "FAIL", failing, reported };
  return { exit: 0, word: d.requireStore ? "PASS" : "PASS-SHAPES-ONLY", failing, reported };
}

function printLimits() {
  console.log("\nWhat this gate does NOT catch (each is an asserted-uncaught control):");
  for (const l of LIMITS) console.log(`  - ${l}`);
}

function printFindings(title: string, fs: Finding[], cap = 25) {
  if (!fs.length) return;
  console.log(`\n${title}: ${fs.length}`);
  const byCls = new Map<Cls, Finding[]>();
  for (const f of fs) byCls.set(f.cls, [...(byCls.get(f.cls) ?? []), f]);
  for (const [cls, list] of byCls) {
    const files = new Map<string, number>();
    for (const f of list) files.set(f.where, (files.get(f.where) ?? 0) + 1);
    console.log(`  ${cls}: ${list.length} in ${files.size} location(s)`);
    for (const f of list.slice(0, cap)) console.log(`    ${f.where}${f.line ? `:${f.line}` : ""}  ${f.why} — ${f.shown}`);
    if (list.length > cap) console.log(`    … ${list.length - cap} more; per location:`), [...files].slice(0, 60).forEach(([w, n]) => console.log(`      ${n}  ${w}`));
  }
}

// ---------------------------------------------------------------------- main

/**
 * Parse the command line STRICTLY (`REVIEW-056` S5-1). An unknown flag, a
 * missing value or a contradictory pair is refused: a misspelled
 * `--strict-histroy` used to be ignored and the run reported a pass.
 */
export function parseArgs(argv: string[]): { flags: Set<string>; repo?: string; rev?: string; dir?: string; stores: string[] } {
  const FLAGS = new Set(["--no-local-store", "--history-only", "--tree-only", "--strict-history", "--controls-only"]);
  const OPTS = new Set(["--repo", "--rev", "--store", "--dir"]);
  const flags = new Set<string>();
  const out: { flags: Set<string>; repo?: string; rev?: string; dir?: string; stores: string[] } = { flags, stores: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (FLAGS.has(a)) { flags.add(a); continue; }
    if (!OPTS.has(a)) throw new Error(`unknown argument '${a}'`);
    const v = argv[++i];
    if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
    if (a === "--store") out.stores.push(v);
    else if (a === "--repo") out.repo = v;
    else if (a === "--dir") out.dir = v;
    else out.rev = v;
  }
  if (out.dir && (out.repo || out.rev || flags.has("--history-only") || flags.has("--strict-history"))) {
    throw new Error("--dir scans one directory with no git; it cannot be combined with --repo, --rev, --history-only or --strict-history");
  }
  if (flags.has("--tree-only") && flags.has("--history-only")) throw new Error("--tree-only and --history-only together select nothing");
  if (out.rev && flags.has("--history-only")) throw new Error("--rev scans one tree; it cannot be combined with --history-only");
  if (flags.has("--strict-history") && (out.rev || flags.has("--tree-only"))) throw new Error("--strict-history has no effect without a history scan");
  if (flags.has("--no-local-store") && out.stores.length) throw new Error("--no-local-store and --store contradict each other");
  return out;
}

if (import.meta.main) {
  const finish = (word: string, exit: number): never => { console.log(`check-no-secrets: verdict=${word} exit=${exit}`); process.exit(exit); };
  // ⚠ Everything runs inside one try, so every failure ends with the verdict
  // line rather than a stack trace (`REVIEW-056` S5-2).
  try {
    const a = parseArgs(process.argv.slice(2));
    const flag = (f: string) => a.flags.has(f);
    const repo = realpathSync(a.repo ?? join(import.meta.dir, ".."));
    const rev = a.rev;
    const dir = a.dir ? realpathSync(a.dir) : undefined;
    const requireStore = !flag("--no-local-store");
    const doTree = !flag("--history-only");
    const doHistory = !flag("--tree-only") && !rev && !dir;

    console.log(`check-no-secrets over ${dir ? `every file under ${dir}, with no git filter` : rev ? `the tree of ${rev}` : doTree ? "the publication set (what git add -A would commit)" : "nothing in the tree"}${doHistory ? " and all history" : ""}`);
    const c = runControls();
    console.log(`controls: ${c.run - c.failed.length}/${c.run} passed, run through the same scanRepo() as the real check`);
    if (c.failed.length) {
      for (const f of c.failed) console.log(`  CONTROL FAILED: ${f}`);
      console.log("The detector is wrong; nothing it would report can be believed.");
      finish("CONTROL-FAILED", 2);
    }
    // The fast self-check `break-no-secrets-gate.ts` drives: controls, and nothing else.
    if (flag("--controls-only")) finish("CONTROLS-PASS", 0);

    const store = requireStore ? loadStore(a.stores.length ? a.stores : defaultStorePaths()) : { files: [], needles: [], secrets: 0, publicSkipped: 0 };
    if (requireStore) console.log(`known-value: ${store.secrets} secret(s) from ${store.files.length} file(s) in the local store, ${store.needles.length} encodings searched; ${store.publicSkipped} stored seed(s) skipped as public by construction`);
    else console.log("known-value: NOT RUN (--no-local-store). An unlabelled ElGamal secret is invisible to this run. This is NOT the phase 1 gate.");

    const r = scanRepo(repo, store, { tree: doTree, history: doHistory, rev, dir });
    console.log(`scanned: ${r.unitsTree} file(s) in the tree, ${r.unitsHistory} history object(s)`);
    console.log("allowed (each rule, and how many hits it permitted):");
    for (const [k, n] of [...r.allowed].sort()) console.log(`  ${n}  ${k}`);

    if (doTree && !rev && !dir) {
      const stale = CITED_VECTORS.map((v) => v.source).filter((src) => !r.seenAllowed.has(src));
      if (stale.length) {
        for (const s of stale) console.log(`  STALE CITED VECTOR: ${s} — no longer present; remove it from CITED_VECTORS`);
        finish("CONTROL-FAILED", 2);
      }
    }

    const d = decide({ findings: r.findings, store, requireStore, strictHistory: flag("--strict-history"), unitsTree: r.unitsTree, unitsHistory: r.unitsHistory, tree: doTree, history: doHistory });
    if (d.why) console.log(`REFUSED: ${d.why}`);
    printFindings("FAILING", d.failing);
    printFindings("REPORTED, NOT FAILED (personal data in history; history is squashed at publication, CLAIMS.md E-309; --strict-history fails these)", d.reported, 5);
    printLimits();
    finish(d.word, d.exit);
  } catch (e) {
    console.log(`REFUSED: ${String(e)}`);
    finish("REFUSED", 2);
  }
}
