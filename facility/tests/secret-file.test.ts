/**
 * secret-file.test.ts — B-29: what the facility writes to disk, and who else can read it.
 *
 * `CLAIMS.md` E-291. The facility state (every seed and the issuer's ElGamal
 * secret), the book (every confidential amount, in plaintext) and each signer profile (one
 * seed) were written at the process umask, and profiles outlived the session.
 *
 * ⚠ **Every mode test runs under `umask 000`.** Under the usual `022` a file
 * written with no mode comes out `0644` and a directory `0755`, which a test can
 * mistake for "some mode was applied". Under `000` an unprotected write comes
 * out `0666` / `0777`, so the only way to see `0600` / `0700` is for the code to
 * have asked for it.
 *
 * ⚠ **What this does not say.** It says other local users cannot read these
 * files. A process running as the same user can, and the issue #1 ruling puts
 * one in scope (`CLAIMS.md` P-5).
 */
import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FacilityBook } from "../src/book.ts";
import { ensurePrivateDir, writeSecretFile } from "../src/secret-file.ts";
import { SignerSession } from "../src/signer.ts";

/**
 * ⚠ **These start a REAL signer**, so they need `signer/target/debug/wconf-signer`,
 * which needs the vendored build (`tools/rebuild-env.sh`). CI has neither, so it
 * sets `WCONF_SKIP_SIGNER_TESTS=1` and Bun reports them as SKIPPED, by name, rather
 * than as passes. Locally the variable is unset and they run, and fail loudly if
 * the signer is not built. Skipping is opt-in so a missing build is never quiet.
 */
const signerTest = process.env.WCONF_SKIP_SIGNER_TESTS === "1" ? test.skip : test;

const modeOf = (p: string) => statSync(p).mode & 0o777;

function underUmask<T>(mask: number, fn: () => T): T {
  const old = process.umask(mask);
  try {
    return fn();
  } finally {
    process.umask(old);
  }
}

async function underUmaskAsync<T>(mask: number, fn: () => Promise<T>): Promise<T> {
  const old = process.umask(mask);
  try {
    return await fn();
  } finally {
    process.umask(old);
  }
}

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "wconf-secret-file-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe("writeSecretFile", () => {
  test("creates a 0600 file in a 0700 directory, even under umask 000", () => {
    const { dir, cleanup } = scratch();
    try {
      const path = join(dir, "nested", "state.json");
      underUmask(0o000, () => writeSecretFile(path, '{"seed":"x"}'));
      expect(readFileSync(path, "utf8")).toBe('{"seed":"x"}');
      expect(modeOf(path)).toBe(0o600);
      expect(modeOf(join(dir, "nested"))).toBe(0o700);
    } finally {
      cleanup();
    }
  });

  test("an existing 0644 target comes out 0600 — the state E-291 measured", () => {
    // Writing over an existing file keeps its mode whatever mode is passed, so
    // the tightening has to come from replacing the file, not from the write.
    const { dir, cleanup } = scratch();
    try {
      const path = join(dir, "facility-state.json");
      writeFileSync(path, "old");
      chmodSync(path, 0o644);
      underUmask(0o000, () => writeSecretFile(path, "new"));
      expect(readFileSync(path, "utf8")).toBe("new");
      expect(modeOf(path)).toBe(0o600);
    } finally {
      cleanup();
    }
  });

  test("a leftover 0644 temporary file from a crash does not lend its mode", () => {
    const { dir, cleanup } = scratch();
    try {
      const path = join(dir, "book.json");
      writeFileSync(`${path}.tmp`, "half a book");
      chmodSync(`${path}.tmp`, 0o644);
      underUmask(0o000, () => writeSecretFile(path, "whole book"));
      expect(modeOf(path)).toBe(0o600);
      expect(existsSync(`${path}.tmp`)).toBe(false);
    } finally {
      cleanup();
    }
  });

  test("an existing 0755 directory is tightened to 0700", () => {
    // `mkdirSync`'s mode applies only to directories it creates.
    const { dir, cleanup } = scratch();
    try {
      const wide = join(dir, "dot-wconf");
      mkdirSync(wide);
      chmodSync(wide, 0o755);
      underUmask(0o000, () => ensurePrivateDir(wide));
      expect(modeOf(wide)).toBe(0o700);
    } finally {
      cleanup();
    }
  });
});

describe("the write sites use it", () => {
  test("the book, which holds every confidential amount in plaintext, is written 0600", () => {
    const { dir, cleanup } = scratch();
    try {
      const path = join(dir, "book-dir", "book.json");
      underUmask(0o000, () => {
        const book = FacilityBook.open(path, "00".repeat(24), 8);
        book.record({ kind: "convert", account: "rDedicated", amount: 5000, hash: "AB".repeat(32) });
      });
      expect(modeOf(path)).toBe(0o600);
      expect(modeOf(join(dir, "book-dir"))).toBe(0o700);
    } finally {
      cleanup();
    }
  });

  const profile = {
    accountSeed: "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n",
    issuanceId: "00".repeat(24),
    ledgerEndpoint: "http://127.0.0.1:5005",
    amountSearchTo: 1000,
  };

  signerTest("a REFUSED signer start writes no profile at all", async () => {
    // The endpoint-override refusal used to run after the profile was written,
    // so a refused start left the seed on disk.
    const { dir, cleanup } = scratch();
    const workDir = join(dir, "refused");
    const saved = process.env.WCONF_LEDGER_ENDPOINT;
    process.env.WCONF_LEDGER_ENDPOINT = "http://127.0.0.1:5006";
    try {
      await expect(SignerSession.start(profile, { workDir, autoConfirm: true, quiet: true })).rejects.toThrow(
        /REFUSED_ENDPOINT_OVERRIDE/,
      );
      expect(existsSync(join(workDir, "profile.json"))).toBe(false);
    } finally {
      if (saved === undefined) delete process.env.WCONF_LEDGER_ENDPOINT;
      else process.env.WCONF_LEDGER_ENDPOINT = saved;
      cleanup();
    }
  });

  signerTest("a signer that dies before binding leaves no profile behind", async () => {
    // `stop()`'s removal is the only thing that covers this path: the normal
    // deletion happens after the socket appears, and here it never does. A
    // malformed issuance id fails the profile load at `holder.rs:550`, before
    // the signer binds.
    const { dir, cleanup } = scratch();
    const workDir = join(dir, "dies");
    const saved = process.env.WCONF_LEDGER_ENDPOINT;
    delete process.env.WCONF_LEDGER_ENDPOINT;
    try {
      await expect(
        SignerSession.start({ ...profile, issuanceId: "zz" }, { workDir, autoConfirm: true, quiet: true }),
      ).rejects.toThrow(/never created its socket/);
      expect(existsSync(join(workDir, "profile.json"))).toBe(false);
    } finally {
      if (saved !== undefined) process.env.WCONF_LEDGER_ENDPOINT = saved;
      cleanup();
    }
  }, 30_000);

  signerTest("a running signer's profile is gone once its socket exists, and stop leaves none", async () => {
    const { dir, cleanup } = scratch();
    const workDir = join(dir, "dedicated");
    const saved = process.env.WCONF_LEDGER_ENDPOINT;
    delete process.env.WCONF_LEDGER_ENDPOINT;
    let session: SignerSession | null = null;
    try {
      session = await underUmaskAsync(0o000, () =>
        SignerSession.start(profile, { workDir, autoConfirm: true, quiet: true }),
      );
      expect(existsSync(join(workDir, "signer.sock"))).toBe(true);
      expect(existsSync(join(workDir, "profile.json"))).toBe(false);
      // ⚠ Not attributable to the facility alone: the signer also sets its socket
      // directory to 0700 when it binds (`signer/src/ipc.rs:105`).
      expect(modeOf(workDir)).toBe(0o700);
      session.stop();
      session = null;
      expect(readdirSync(workDir)).not.toContain("profile.json");
    } finally {
      session?.stop();
      if (saved !== undefined) process.env.WCONF_LEDGER_ENDPOINT = saved;
      cleanup();
    }
  }, 30_000);
});

/**
 * ⚠ **LEXICAL, over a NAMED SET of write APIs, in `facility/src` and
 * `run-facility.ts` only.** It flags the NAME of any write API anywhere in a file,
 * so an aliased import (`import { writeFileSync as dump }`) is caught by its
 * import line. `REVIEW-047` showed the earlier call-pattern version missed exactly
 * that. It does not see a write through dynamic property access, a child process,
 * or code outside the two places it reads.
 */
const WRITE_NAME =
  /\b(?:writeFileSync|writeFile|appendFileSync|appendFile|copyFileSync|cpSync|createWriteStream|openSync|linkSync|symlinkSync)\b|\bBun\.write\b|\bfs\/promises\b/g;

function writeNames(source: string): string[] {
  return [...source.matchAll(WRITE_NAME)].map((m) => m[0]);
}

describe("no write API is named in the facility outside secret-file.ts", () => {
  const root = new URL("..", import.meta.url).pathname;
  const files = [
    join(root, "run-facility.ts"),
    ...readdirSync(join(root, "src"))
      .filter((f) => f.endsWith(".ts"))
      .map((f) => join(root, "src", f)),
  ];

  test("CONTROL: the detector sees a bare write, an aliased import and Bun.write, through the same function", () => {
    expect(writeNames("writeFileSync(STATE, JSON.stringify(state));")).toHaveLength(1);
    expect(writeNames('import { writeFileSync as dump } from "node:fs";\ndump(path, secret);')).toHaveLength(1);
    expect(writeNames("await Bun.write(path, data)")).toHaveLength(1);
    expect(writeNames("writeSecretFile(path, data)")).toHaveLength(0);
  });

  test("no file in facility/src or run-facility.ts names one", () => {
    const offenders = files
      .filter((f) => !f.endsWith("/secret-file.ts"))
      .flatMap((f) => writeNames(readFileSync(f, "utf8")).map((c) => `${f}: ${c}`));
    expect(offenders).toEqual([]);
    expect(files.length).toBeGreaterThan(5);
  });
});
