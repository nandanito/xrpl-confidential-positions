/**
 * The build's snapshot records what the pinned ledger said, and never turns a
 * missing account into an empty one (architecture §6 step 9's falsifier).
 */
import { describe, expect, test } from "bun:test";
import { HOSTED_ENDPOINT, readAccount, takeSnapshot } from "./snapshot.ts";
import type { HostedSnapshot } from "./snapshot-types.ts";

const ACCOUNT = { address: "rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8", issuanceId: "00".repeat(24), label: "Holder A", note: "n" };
const KEY = "02" + "11".repeat(32);

function fake(o: { exists?: boolean; mpt?: any; issuance?: any }) {
  return {
    index: 42,
    accountExists: async () => o.exists ?? true,
    mptoken: async () => o.mpt ?? null,
    issuance: async () => o.issuance ?? { issuer: "rIssuer", confidentialOutstandingAmountRaw: "7", issuerEncryptionKey: KEY },
  };
}

describe("readAccount", () => {
  test("an account the pinned ledger does not hold is 'account-missing', with no view", async () => {
    const a = await readAccount(fake({ exists: false }), ACCOUNT, true);
    expect(a.state).toBe("account-missing");
    expect(a.observer).toBeNull();
    expect(a.issuerMirror).toBeNull();
  });

  test("a missing issuance is 'issuance-missing', checked after the account", async () => {
    expect((await readAccount(fake({}), ACCOUNT, false)).state).toBe("issuance-missing");
    expect((await readAccount(fake({ exists: false }), ACCOUNT, false)).state).toBe("account-missing");
  });

  test("an account with no MPToken is 'no-position', not a zero balance", async () => {
    const a = await readAccount(fake({ mpt: null }), ACCOUNT, true);
    expect(a.state).toBe("no-position");
    expect(a.observer).toBeNull();
  });

  test("a position records whether the issuer's mirror is on the ledger, and no figure", async () => {
    const mpt = { publicAmountRaw: "0", confidentialBalanceVersion: 1, issuerEncryptedBalance: "AB".repeat(66) };
    const a = await readAccount(fake({ mpt }), ACCOUNT, true);
    expect(a.state).toBe("present");
    expect(a.issuerMirror).toEqual({ present: true, ciphertext: "AB".repeat(66) });
    expect(JSON.stringify(a)).not.toMatch(/decrypt(ed)?(Balance|Amount)|"figure"/);
    const b = await readAccount(fake({ mpt: { ...mpt, issuerEncryptedBalance: undefined } }), ACCOUNT, true);
    expect(b.issuerMirror).toEqual({ present: false });
  });

  test("a read that fails is not swallowed into a state", async () => {
    const broken = { ...fake({}), accountExists: async () => { throw new Error("REFUSED_LEDGER_TORN"); } };
    await expect(readAccount(broken, ACCOUNT, true)).rejects.toThrow(/REFUSED_LEDGER_TORN/);
  });
});

describe("takeSnapshot refuses before it reads", () => {
  const C = "a".repeat(40);
  test("any endpoint but the named one", async () => {
    await expect(takeSnapshot(C, "https://x.vercel.app", "https://s.altnet.rippletest.net:51234")).rejects.toThrow(/trigger 3/);
  });
  test("a commit that is not a full id", async () => {
    await expect(takeSnapshot("abc123", "https://x.vercel.app")).rejects.toThrow(/40-hex/);
  });
  test("a canonical address that is not an https origin", async () => {
    await expect(takeSnapshot(C, "http://x.vercel.app")).rejects.toThrow(/https origin/);
    await expect(takeSnapshot(C, "https://x.vercel.app/path")).rejects.toThrow(/https origin/);
  });
  test("the named endpoint is Devnet's public JSON-RPC endpoint", () => {
    expect(HOSTED_ENDPOINT).toBe("https://s.devnet.rippletest.net:51234");
  });
});

// A compile-time check that the serialised shape is what the app imports.
const _shape: (s: HostedSnapshot) => string = (s) => s.source.endpoint;
void _shape;
