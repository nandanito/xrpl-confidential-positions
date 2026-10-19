/**
 * facility.test.ts — the refusals, which are the part of the facility that has
 * to be right.
 *
 * Everything here is a guard that fires **before** a transaction is built.
 *
 * ⚠ **This header has now been wrong in BOTH directions.** It first claimed
 * the happy path *"is executed on Devnet"* before anything had run
 * (`REVIEW-022` round two), and was then corrected to *"it is not, and it never
 * has been"* — which `REVIEW-023` found still standing after the facility ran.
 * It HAS run: 28 validated facility transactions on 2026-08-25, **not** under
 * B-15's step-7 conditions (`CLAIMS.md` E-151). **A denial goes stale exactly
 * as fast as a claim.**
 *
 * What a unit test can establish is that the facility refuses the states it
 * says it refuses. What it cannot establish is that rippled accepts anything,
 * and a happy path would not establish confidentiality even if there were one
 * (`CLAUDE.md`: *"a demo of the happy path is not evidence of
 * confidentiality"*).
 */
import { describe, expect, test } from "bun:test";
import { encodeSeed } from "ripple-address-codec";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FacilityBook } from "../src/book.ts";
import { addressOfSeed, Facility, FacilityRefusal, type Party } from "../src/facility.ts";
import { LoopbackLedger } from "../src/loopback.ts";
import { FailHardSubmitter } from "../src/submit.ts";
import { HOSTILE_ENDPOINTS } from "./hostile-endpoints.ts";
import { withHatch } from "./with-hatch.ts";
import { deriveElGamalKey } from "../../tools/wconf-keygen.ts";

const ISSUANCE = "00".repeat(24);

// Published test vectors from REVIEW-012's §6, used here only as well-formed
// family seeds. They are not secret and never held value.
const SEED_A = "sp6JdwovBCsiwnMhXuvZGZtPUoGVj";
const SEED_B = "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n";

// ⚠ **Constructed, not invented.** The first draft of this file made up a
// plausible-looking `sEd…` string and every test using it died on
// `checksum_invalid`. A fabricated constant that merely LOOKS right is the
// failure this project has recorded against itself more than once; encoding 16
// fixed bytes is deterministic, checkable, and cannot be wrong about its own
// checksum.
const SEED_C = encodeSeed(Uint8Array.from(Buffer.alloc(16, 0x11)), "ed25519");

const FULL_INFO = {
  info: {
    build_version: "3.3.0",
    network_id: 2,
    server_state: "full",
    validated_ledger: { seq: 4_800_000 },
  },
};

/** A node whose `ledger_entry` answers come from a table the test controls. */
function nodeWith(entries: Record<string, any>) {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const body: any = await req.json();
      const params = body.params?.[0] ?? {};
      if (body.method === "server_info") {
        return Response.json({ result: { status: "success", ...FULL_INFO } });
      }
      if (body.method === "ledger_entry") {
        const key = params.mptoken?.account ?? (params.mpt_issuance ? "ISSUANCE" : "?");
        const node = entries[key];
        if (!node) {
          return Response.json({ result: { status: "error", error: "entryNotFound" } });
        }
        return Response.json({ result: { status: "success", ledger_index: 4_800_000, node } });
      }
      return Response.json({ result: { status: "error", error: "unknown" } });
    },
  });
  return { server, endpoint: `http://127.0.0.1:${server.port}` };
}

function tempBook() {
  const dir = mkdtempSync(join(tmpdir(), "wconf-facility-"));
  return {
    book: FacilityBook.open(join(dir, "book.json"), ISSUANCE),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

const party = (label: string, seed: string): Party => ({
  label,
  seed,
  address: addressOfSeed(seed),
});

async function facilityWith(entries: Record<string, any>, dedicatedSeed = SEED_B) {
  const { server, endpoint } = nodeWith(entries);
  const ledger = await LoopbackLedger.open(endpoint);
  const { book, cleanup } = tempBook();
  const bank = party("bank", SEED_A);
  const dedicated = party("dedicated", dedicatedSeed);
  const facility = new Facility(ledger, new FailHardSubmitter(ledger), book, {
    issuanceId: ISSUANCE,
    bank,
    dedicated,
    fullRange: 100_000,
    ledgerEndpoint: endpoint,
    workRoot: "/tmp/wconf-facility-test",
    autoConfirm: true,
    quietSigner: true,
  });
  return {
    facility,
    bank,
    dedicated,
    book,
    stop: () => {
      server.stop(true);
      cleanup();
    },
  };
}

describe("construction", () => {
  test("refuses a Dedicated Account that is the issuer — a PROTOCOL rule, not a preference", async () => {
    // An issuer cannot convert its own issuance into a confidential balance;
    // the ledger refuses it outright. That is the reason this design has a
    // separate account at all, and stating it as a style choice would be a
    // claim about rippled that rippled does not make.
    await expect(facilityWith({}, SEED_A)).rejects.toThrow(/REFUSED_ISSUER_IS_DEDICATED/);
  });

  test("refuses a party whose seed does not control its claimed address", async () => {
    const { server, endpoint } = nodeWith({});
    const ledger = await LoopbackLedger.open(endpoint);
    const { book, cleanup } = tempBook();
    try {
      expect(
        () =>
          new Facility(ledger, new FailHardSubmitter(ledger), book, {
            issuanceId: ISSUANCE,
            bank: party("bank", SEED_A),
            // A claimed address that belongs to someone else entirely — and
            // NOT the bank's, or the issuer-is-dedicated guard would fire first
            // and this test would pass for the wrong reason.
            dedicated: { label: "dedicated", seed: SEED_B, address: addressOfSeed(SEED_C) },
            fullRange: 100_000,
            ledgerEndpoint: endpoint,
            workRoot: "/tmp/wconf-facility-test",
            autoConfirm: true,
          }),
      ).toThrow(/REFUSED_SEED_ADDRESS_MISMATCH/);
    } finally {
      server.stop(true);
      cleanup();
    }
  });

  test("refuses a non-loopback ledger endpoint for the signer's own reads", async () => {
    // Two processes read the same ledger for two different reasons, and B-15's
    // ruling covers both. The signer's reads are the ones F-23 is actually
    // about.
    const { server, endpoint } = nodeWith({});
    const ledger = await LoopbackLedger.open(endpoint);
    const { book, cleanup } = tempBook();
    try {
      // ⚠ **The refusal depends on `WCONF_ACCEPT_REMOTE_LEDGER_RISK` being
      // unset, and this test owns that rather than hoping.** `REVIEW-023` round
      // two ran the suite with the acceptance sentence exported and got 76 pass
      // / 3 fail; this was one of the three. A test that asserts an
      // environment-dependent outcome must own the environment.
      await withHatch(undefined, async () => {
        expect(
          () =>
            new Facility(ledger, new FailHardSubmitter(ledger), book, {
              issuanceId: ISSUANCE,
              bank: party("bank", SEED_A),
              dedicated: party("dedicated", SEED_B),
              fullRange: 100_000,
              ledgerEndpoint: HOSTILE_ENDPOINTS.find((h) =>
                h.why.includes("every other harness"),
              )!.endpoint,
              workRoot: "/tmp/wconf-facility-test",
              autoConfirm: true,
            }),
        ).toThrow(/REFUSED_NOT_LOOPBACK/);
      });
    } finally {
      server.stop(true);
      cleanup();
    }
  });
});

describe("the ElGamal key each party reads its own balance with", () => {
  test("comes from the ruled derivation and is checked against the address", async () => {
    const f = await facilityWith({});
    try {
      const key = f.facility.elgamalOf(f.bank);
      // REVIEW-012 §6's V1 vector. If this changes, either the derivation moved
      // or the seed did, and both are worth stopping for.
      expect(key.pk).toBe("02295AD17728DBD75FAB16EE3A38E7D1ED96908DD7E530C90BD8965AF0A7E71246");
      expect(key.address).toBe(f.bank.address);
    } finally {
      f.stop();
    }
  });
});

describe("adopting a supplier an earlier run enrolled", () => {
  // ⚠ `adoptEnrolledSupplier` was ADDED as a round-one fix and shipped with no
  // test — REVIEW-022 round two found that, and a fix nobody can falsify is a
  // fix on the same footing as the cast it replaced.
  const supplier = party("supplier", SEED_C);
  const derived = deriveElGamalKey(SEED_C).pk;

  test("adopts a supplier whose registered key is the derived one", async () => {
    const f = await facilityWith({
      [supplier.address]: { MPTAmount: "1", HolderEncryptionKey: derived },
    });
    try {
      await f.facility.adoptEnrolledSupplier(supplier);
      expect(f.facility.supplierList.map((p) => p.address)).toEqual([supplier.address]);
    } finally {
      f.stop();
    }
  });

  test("refuses an account that carries no key at all", async () => {
    const f = await facilityWith({});
    try {
      await expect(f.facility.adoptEnrolledSupplier(supplier)).rejects.toThrow(
        /REFUSED_NOT_ENROLLED/,
      );
      expect(f.facility.supplierList).toEqual([]);
    } finally {
      f.stop();
    }
  });

  test("refuses an account whose registered key is NOT the derived one", async () => {
    // ⚠ This is the case the cast it replaced could not see: a position the
    // facility would track and could never decrypt.
    const f = await facilityWith({
      [supplier.address]: { MPTAmount: "1", HolderEncryptionKey: "02" + "CD".repeat(32) },
    });
    try {
      await expect(f.facility.adoptEnrolledSupplier(supplier)).rejects.toThrow(
        /REFUSED_KEY_NOT_DERIVED/,
      );
      expect(f.facility.supplierList).toEqual([]);
    } finally {
      f.stop();
    }
  });

  test("refuses a party whose seed does not control its claimed address", async () => {
    const f = await facilityWith({});
    try {
      const liar = { label: "liar", seed: SEED_C, address: addressOfSeed(SEED_B) };
      await expect(f.facility.adoptEnrolledSupplier(liar)).rejects.toThrow(
        /REFUSED_SEED_ADDRESS_MISMATCH/,
      );
    } finally {
      f.stop();
    }
  });
});

describe("refusals before a transaction is built", () => {
  const supplier = party("supplier", SEED_C);
  const supplierEntry = {
    MPTAmount: "1",
    HolderEncryptionKey: deriveElGamalKey(SEED_C).pk,
    MPTokenIssuanceID: ISSUANCE,
  };

  test("a movement against a party the facility does not know is refused", async () => {
    // ⚠ `confidential()` hands the signer a SEED while the book and the ledger
    // lookup use the ADDRESS. A `Party` the facility never enrolled can carry
    // any pairing of the two, so a transaction signed by one account would be
    // booked against another. Found by REVIEW-022's Codex leg.
    const f = await facilityWith({});
    try {
      f.book.record({ kind: "convert", account: f.dedicated.address, amount: 1000, hash: "h1" });
      f.book.record({ kind: "merge", account: f.dedicated.address, amount: 1000, hash: "m1" });
      await expect(f.facility.drawdown(supplier, 10)).rejects.toThrow(/REFUSED_UNKNOWN_PARTY/);
    } finally {
      f.stop();
    }
  });

  test("a movement to a destination with no registered key is an IMPOSSIBILITY, not a rejection", async () => {
    // ⚠ There is no key to encrypt to, so the transaction cannot be built. A
    // facility that reported this as "the ledger refused it" would be
    // describing a round trip that never happens.
    //
    // The destination here is the **Dedicated Account before it has converted**,
    // which is the case that is actually reachable: a supplier only enters the
    // facility's own list by way of an enrolment that required their key.
    const f = await facilityWith({ [supplier.address]: supplierEntry });
    try {
      await f.facility.adoptEnrolledSupplier(supplier);
      f.book.record({ kind: "convert", account: supplier.address, amount: 50, hash: "h1" });
      f.book.record({ kind: "merge", account: supplier.address, amount: 50, hash: "m1" });
      await expect(f.facility.repay(supplier, 10)).rejects.toThrow(
        /REFUSED_DESTINATION_NOT_REGISTERED/,
      );
    } finally {
      f.stop();
    }
  });

  test("a drawdown larger than the tracked balance is refused before any entropy is drawn", async () => {
    const f = await facilityWith({
      [supplier.address]: supplierEntry,
    });
    try {
      await f.facility.adoptEnrolledSupplier(supplier);
      // ⚠ convert lands in the INBOX; the merge is what makes it spendable.
      f.book.record({ kind: "convert", account: f.dedicated.address, amount: 100, hash: "h1" });
      f.book.record({ kind: "merge", account: f.dedicated.address, amount: 100, hash: "m1" });
      await expect(f.facility.drawdown(supplier, 101)).rejects.toThrow(
        /REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE/,
      );
      // The control: one unit less passes every FACILITY guard. Without it the
      // assertion above passes against a facility that refuses everything —
      // which is the shape REVIEW-016 round two found in two of its own new
      // tests, where the case named was never the reason the test failed.
      //
      // ⚠ It asserts on the TYPE, not on the absence of one string. Asserting
      // only `not.toContain(...)` passed for the wrong reason — the signer
      // cannot sign against this fake node, so any failure at all satisfied it,
      // including one thrown before the guards ran. REVIEW-022's Gemini leg
      // found that, and its falsification was exact: an unconditional throw in
      // `confidentialTransfer` would have satisfied both assertions. Every
      // facility guard throws `FacilityRefusal`, so "not a FacilityRefusal"
      // means the guards were passed and the failure came from further down.
      const boundary = await f.facility.drawdown(supplier, 100).catch((e) => e);
      expect(boundary).toBeInstanceOf(Error);
      expect(boundary).not.toBeInstanceOf(FacilityRefusal);
    } finally {
      f.stop();
    }
  });

  test("retiring more than the Dedicated Account holds is refused", async () => {
    const f = await facilityWith({});
    try {
      f.book.record({ kind: "convert", account: f.dedicated.address, amount: 50, hash: "h1" });
      f.book.record({ kind: "merge", account: f.dedicated.address, amount: 50, hash: "m1" });
      await expect(f.facility.retire(51)).rejects.toThrow(
        /REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE/,
      );
    } finally {
      f.stop();
    }
  });

  test("enrolling an account that already carries a HolderEncryptionKey is refused", async () => {
    // ⚠ Registration happens exactly once and the protocol forbids repeating
    // it. Discovering that by submitting is discovering it in public.
    const f = await facilityWith({
      [supplier.address]: { MPTAmount: "5", HolderEncryptionKey: "02CD" },
    });
    try {
      await expect(f.facility.enrolSupplier(supplier, 5)).rejects.toThrow(
        /REFUSED_ALREADY_REGISTERED/,
      );
    } finally {
      f.stop();
    }
  });
});
