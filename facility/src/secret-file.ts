/**
 * secret-file.ts — the one way this facility writes a file another local user
 * must not read.
 *
 * `CLAIMS.md` B-29 and E-291. The facility state holds every seed and the
 * issuer's ElGamal secret, the book holds every confidential amount in plaintext, and each
 * signer profile holds one seed. All three were written with no mode, so they
 * took the process umask (`0644` under the usual `022`), and the only `0700`
 * protecting any of them came from a different script, `tools/rebuild-env.sh`.
 *
 * ⚠ **What this does NOT buy.** A process running as the same user reads a
 * `0600` file exactly as easily as a `0644` one, and the issue #1 ruling puts a
 * hostile same-host process in scope. File modes keep OTHER local users out and
 * nothing more. `CLAIMS.md` P-5 still forbids calling any of this secure.
 */
import { chmodSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const SECRET_FILE_MODE = 0o600;
export const SECRET_DIR_MODE = 0o700;

/**
 * Make `dir` exist at `0700`, including when it already existed wider.
 *
 * ⚠ The `mode` given to `mkdirSync` applies only to directories it creates. An
 * existing `0755` directory stays `0755` without the `chmodSync`, and that is
 * the state `~/.wconf` is in on any machine where the facility ran before
 * `rebuild-env.sh` did.
 */
export function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: SECRET_DIR_MODE });
  chmodSync(dir, SECRET_DIR_MODE);
}

/**
 * Write `data` to `path` as a new `0600` file, by write-then-rename.
 *
 * ⚠ Writing over an existing file keeps THAT file's mode, whatever mode is
 * passed, so a state file already at `0644` would have stayed `0644`. The data
 * goes to a temporary file created fresh, exclusively (`wx`), at `0600`, and is
 * renamed over the target, which replaces the inode and its mode together. A
 * temporary file left by a crash is removed first for the same reason, so no
 * byte of `data` is ever written into a file that was already wider.
 *
 * ⚠ **No `chmodSync` after the write, deliberately.** An earlier draft had one,
 * and it made the leftover-file removal untestable: breaking the removal still
 * produced a `0600` file, after the data had sat in a `0644` one. The umask can
 * only narrow a creation mode, never widen it, so creation is the whole defence.
 */
export function writeSecretFile(path: string, data: string): void {
  ensurePrivateDir(dirname(path));
  const tmp = `${path}.tmp`;
  rmSync(tmp, { force: true });
  writeFileSync(tmp, data, { mode: SECRET_FILE_MODE, flag: "wx" });
  renameSync(tmp, path);
}
