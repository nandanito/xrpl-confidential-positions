/**
 * wconf-keygen.test.ts — the shared TypeScript ElGamal derivation.
 *
 * ⚠ **This is not the KAT.** `tools/spike-keygen-2026-08-18/t-keygen-construction.ts`
 * is, and it stays independent: it runs the construction through **two**
 * library paths so the ruling's vectors are reproducible from its prose rather
 * than from one code path, and a KAT that imported the thing it tests would be
 * worthless.
 *
 * What this asserts is narrower and is still worth asserting: that the module
 * the facility imports **refuses to derive anything** if it has diverged, and
 * that the two properties a later session is most likely to "fix" — the total
 * reduction, and the account-binding of the preimage — still hold.
 */
import { describe, expect, test } from "bun:test";
import { assertConstruction, deriveElGamalKey } from "./wconf-keygen.ts";

// REVIEW-012-RULING-keygen-2026-08-18.md §6, verbatim.
const V1 = {
  familySeed: "sp6JdwovBCsiwnMhXuvZGZtPUoGVj",
  accountId: "7F0BBA382512C0A00A1630506AE44EBE8AC20D27",
  sk: "D1CE6CB547E3010BEE0DE614330D745A2ADE751C8BD16A66962616EFE7453964",
  pk: "02295AD17728DBD75FAB16EE3A38E7D1ED96908DD7E530C90BD8965AF0A7E71246",
  seedType: "secp256k1",
};
const V2 = {
  familySeed: "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n",
  accountId: "A8683DC013F856ACCDD629E0730E9FBB707D0D1B",
  sk: "601AF0DF8C25B04441802E2E6A5B69D93AD56343CA6556885A2B0F75CBE295EA",
  pk: "02763AF7208A6D7557F638D5959CD65C6BA0C3BF320A84CCA36E4A55E7B099877B",
  seedType: "ed25519",
};

describe("wconf-keygen", () => {
  test("reproduces both published vectors", () => {
    for (const v of [V1, V2]) {
      const k = deriveElGamalKey(v.familySeed);
      expect(k.sk).toBe(v.sk);
      expect(k.pk).toBe(v.pk);
      expect(k.accountId).toBe(v.accountId);
      expect(k.seedType).toBe(v.seedType);
    }
  });

  test("the self-check runs and passes before anything is derived", () => {
    expect(() => assertConstruction()).not.toThrow();
  });

  test("BOTH seed types derive — a secp256k1-only implementation would pass V1 alone", () => {
    // ed25519 is the live path: every account this project holds on Devnet has
    // an `sEd…` seed. A derivation that quietly only handled secp256k1 would
    // still reproduce V1 and would be wrong about every real account.
    expect(deriveElGamalKey(V1.familySeed).seedType).toBe("secp256k1");
    expect(deriveElGamalKey(V2.familySeed).seedType).toBe("ed25519");
    expect(deriveElGamalKey(V1.familySeed).sk).not.toBe(deriveElGamalKey(V2.familySeed).sk);
  });

  test("refuses a malformed seed rather than deriving something from it", () => {
    expect(() => deriveElGamalKey("not-a-seed")).toThrow();
    expect(() => deriveElGamalKey("")).toThrow();
  });

  test("the derivation is deterministic — that is the whole benefit", () => {
    // What deriving buys is that a holder with the master seed reconstructs the
    // key. ⚠ It does NOT make the key "recoverable": XLS-0096 has no rotation
    // and no recovery (P-10), and the derivation is not a published standard
    // (issue #10). Two sentences, two layers; merging them is E-125/E-126.
    expect(deriveElGamalKey(V1.familySeed).sk).toBe(deriveElGamalKey(V1.familySeed).sk);
  });
});
