/**
 * devnet-accounts.ts — where the facility's throwaway accounts come from.
 *
 * ⚠ **This is the ONE file under `facility/` that names a remote host**, and
 * `tools/check-loopback.ts` records it with its reason. The reason is not "the
 * faucet is trusted"; it is that **a faucet is not a ledger read**. B-15 is
 * about values that, if wrong, make the signer publish an amount encrypted
 * under an adversary's key — a destination's `HolderEncryptionKey`, an
 * issuer's key, a balance. A faucet supplies none of those.
 *
 * What it *does* supply is a seed and a claimed address, and the claim is not
 * believed: the address is **re-derived from the seed** and a mismatch refuses.
 * Then the account's existence is confirmed by a read against the **loopback**
 * node, not against the faucet's own view.
 *
 * ⚠ **Devnet throwaways.** `CLAUDE.md`'s hard rule: no mainnet writes, at any
 * phase, for any reason.
 */
import type { LoopbackLedger } from "./loopback.ts";
import { LedgerRefusal } from "./loopback.ts";
import { addressOfSeed, type Party } from "./facility.ts";

const FAUCET = "https://faucet.devnet.rippletest.net/accounts";

/**
 * Mint one funded Devnet account and confirm it **on the loopback node**.
 *
 * ⚠ The confirmation loop is against our own node deliberately. A faucet that
 * says "funded" and a ledger that says so are two different statements, and the
 * facility only ever acts on the second.
 */
export async function faucetAccount(label: string, ledger: LoopbackLedger): Promise<Party> {
  const response = await fetch(FAUCET, { method: "POST" });
  if (!response.ok) throw new Error(`faucet ${response.status} for ${label}`);
  const body: any = await response.json();
  const seed: string | undefined = body.seed ?? body.account?.secret;
  const claimed: string | undefined = body.account?.classicAddress ?? body.account?.address;
  if (!seed) throw new Error(`the faucet returned no seed for ${label}`);

  const address = addressOfSeed(seed);
  if (claimed && claimed !== address) {
    throw new LedgerRefusal(
      "REFUSED_FAUCET_ADDRESS_MISMATCH",
      `the faucet claimed ${claimed} for ${label}, but the seed it returned controls ${address}`,
    );
  }

  for (let i = 0; i < 30; i++) {
    await Bun.sleep(2000);
    try {
      const snapshot = await ledger.snapshot();
      await snapshot.sequenceOf(address);
      return { label, address, seed };
    } catch (e) {
      if (e instanceof LedgerRefusal) continue;
      throw e;
    }
  }
  throw new LedgerRefusal(
    "REFUSED_ACCOUNT_NEVER_APPEARED",
    `${label} (${address}) never appeared in a validated ledger on the loopback node`,
  );
}
