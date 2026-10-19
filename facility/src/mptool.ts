/**
 * mptool.ts — the facility's only use of the native crypto library.
 *
 * The facility does **not** generate proofs and does **not** draw blinding
 * factors: everything that publishes an `r` is built, proved and signed by
 * `signer/`, under the ruled `r`/`ρ` derivation. What is left is *reading* —
 * decrypting a balance the facility already has the key for, and recomputing
 * the canonical `EncZero` the observer harness compares against.
 *
 * ⚠ **`/tmp/wconf/mptool` is the PRISTINE upstream binary**, pointed there by
 * `tools/rebuild-env.sh` (`CLAIMS.md` E-99). That is the right one for a read:
 * decryption has no nonce, so the patched build's hedged sigma nonces are
 * irrelevant, and using upstream's own code to read a balance means a wrong
 * reading is not a bug this project introduced.
 *
 * ⚠ **The search is LINEAR and its cost is the range, not the answer.**
 * Upstream fixes the iteration count over `[from, to]` as its mitigation for
 * the `RIPCTXR-1` timing channel, so a narrow window is cheap because it is
 * narrow — not because the balance happens to be near one end. That is what
 * makes `facility/src/book.ts` a requirement rather than an optimisation.
 */
import { existsSync } from "node:fs";

const MPTOOL = process.env.WCONF_MPTOOL ?? "/tmp/wconf/mptool";

function requireTool(): string {
  if (!existsSync(MPTOOL)) {
    throw new Error(
      `${MPTOOL} does not exist. /tmp does not survive a clean and this has now been lost ` +
        `twice (CLAIMS.md E-97, E-133). Run: tools/rebuild-env.sh`,
    );
  }
  return MPTOOL;
}

async function run(args: string[]): Promise<string[]> {
  const p = Bun.spawnSync([requireTool(), ...args]);
  if (p.exitCode !== 0) {
    throw new Error(`mptool ${args[0]} failed (${p.exitCode}): ${p.stderr.toString().trim()}`);
  }
  return p.stdout.toString().trim().split("\n");
}

/**
 * Decrypt an ElGamal ciphertext over an inclusive integer range.
 *
 * Returns `null` when the plaintext is not in `[from, to]` — **an answer, not
 * an error**. The caller decides whether a miss means "widen the search" or
 * "the book is wrong", and collapsing the two would hide the second.
 */
export async function decryptInRange(
  ciphertext: string,
  sk: string,
  from: number,
  to: number,
): Promise<number | null> {
  const p = Bun.spawnSync([requireTool(), "decrypt", ciphertext, sk, String(from), String(to)]);
  if (p.exitCode !== 0) return null;
  const out = p.stdout.toString().trim();
  if (!out) return null;
  const v = Number(out.split("\n")[0]);
  return Number.isFinite(v) ? v : null;
}

/**
 * The canonical `EncZero` for one holder on one issuance.
 *
 * ⚠ `CLAIMS.md` **F-1**: this constant is computable by anyone with public
 * data, so a balance equal to it is **publicly known to be zero**. A balance
 * that reached zero by homomorphic subtraction is not this constant — which is
 * a distinction the observer harness checks rather than asserts.
 */
export async function canonicalEncZero(
  holderEncryptionKey: string,
  accountIdHex: string,
  issuanceIdHex: string,
): Promise<string> {
  return (await run(["enczero", holderEncryptionKey, accountIdHex, issuanceIdHex]))[0];
}

/** An ElGamal keypair from upstream's own CSPRNG — the `standalone` source. */
export async function standaloneKeypair(): Promise<{ sk: string; pk: string }> {
  const [sk, pk] = await run(["keygen"]);
  return { sk, pk };
}
