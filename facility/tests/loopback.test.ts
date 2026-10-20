/**
 * loopback.test.ts — the facility's ledger source refuses anything that is not
 * a loopback literal, and reads a pinned ledger or refuses.
 *
 * Every capability claim needs a test that fails if the claim is false. The
 * claim here is B-15's step-7 obligation, and it is the one the whole milestone
 * rests on.
 */
import { describe, expect, test } from "bun:test";
import { isLoopbackEndpoint, LedgerRefusal, LoopbackLedger } from "../src/loopback.ts";
import { withHatch } from "./with-hatch.ts";
import {
  CANONICALISED_LOOPBACK,
  HOSTILE_ENDPOINTS,
  LOOPBACK_ENDPOINTS,
  NOT_ENDPOINTS,
} from "./hostile-endpoints.ts";

describe("isLoopbackEndpoint", () => {
  test("accepts loopback literals", () => {
    for (const e of LOOPBACK_ENDPOINTS) expect(isLoopbackEndpoint(e)).toBe(true);
    expect(LOOPBACK_ENDPOINTS.length).toBeGreaterThan(4);
  });

  // ⚠ Every hostile endpoint lives in `./hostile-endpoints.ts`, with the reason
  // it is there. `REVIEW-016` found two of them — a host NAMED to look numeric,
  // and userinfo before the real host — walking through the Rust check that
  // exists BECAUSE of F-23. The unterminated IPv6 literal is round two's: a
  // parser that split on `]` and took what came before accepted it.
  //
  // ⚠ `tools/check-loopback.ts` carries ONE whole-file exemption for that
  // fixture rather than a dozen near-identical entries, and it reports how many
  // literals the exemption excused. A gate that skipped its own test files
  // silently would be the mask CLAIMS.md E-141 records.
  test.each(HOSTILE_ENDPOINTS.map((h) => [h.endpoint, h.why]))(
    "refuses %s — %s",
    (endpoint) => {
      expect(isLoopbackEndpoint(endpoint as string)).toBe(false);
    },
  );

  test("accepts the forms URL canonicalises to 127.0.0.1 — they ARE loopback", () => {
    // ⚠ `2130706433`, `0177.0.0.1`, `0x7f.1`, `127.1`, a trailing dot and an
    // uppercase scheme are all folded to `127.0.0.1` by WHATWG `URL` before the
    // check sees them. Accepting them is correct. This test exists because the
    // session's own review leg asserted the OPPOSITE — from reasoning, not from
    // running them — and because a later session reading "literal" in the
    // comments might otherwise tighten the check into rejecting real loopback.
    for (const e of CANONICALISED_LOOPBACK) {
      expect(isLoopbackEndpoint(e)).toBe(true);
    }
    expect(CANONICALISED_LOOPBACK.length).toBe(6);
  });

  test("refuses input that is not a URL at all", () => {
    for (const e of NOT_ENDPOINTS) expect(isLoopbackEndpoint(e)).toBe(false);
  });

  test("the hostile list is not silently empty", () => {
    // A `test.each` over an empty array passes by running nothing. That is the
    // false-pass shape REVIEW-009 §8 found in `t-nbound.c` and this project has
    // paid for twice since.
    expect(HOSTILE_ENDPOINTS.length).toBe(13);
  });
});

/** A node that answers whatever the test tells it to, on 127.0.0.1. */
function fakeNode(handler: (method: string, params: any) => any) {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const body: any = await req.json();
      const result = handler(body.method, body.params?.[0] ?? {});
      return Response.json({ result: { status: "success", ...result } });
    },
  });
  return { server, endpoint: `http://127.0.0.1:${server.port}` };
}

const FULL_INFO = {
  info: {
    build_version: "3.3.0",
    git: { hash: "00a178fb92ca49521b937ae1a99d863765ea8a90" },
    network_id: 2,
    server_state: "full",
    validated_ledger: { seq: 4_800_000 },
  },
};

describe("LoopbackLedger.open", () => {
  test("refuses a remote endpoint BEFORE it connects", async () => {
    // The refusal must not require the endpoint to answer: a facility that
    // reached out to a remote host on the way to failing has already told that
    // host what it was about to ask for.
    // ⚠ **The refusal depends on `WCONF_ACCEPT_REMOTE_LEDGER_RISK` being unset,
    // and this test owns that rather than hoping.** With the acceptance
    // sentence exported this asserted nothing: `REVIEW-023` round two ran the
    // suite that way and got 76 pass / 3 fail, with THIS test failing because
    // the promise RESOLVED — `open` reached the public endpoint and got
    // `server_info` back. A test that asserts an environment-dependent outcome
    // must own the environment.
    const remote = HOSTILE_ENDPOINTS.find((h) => h.why.includes("every other harness"))!.endpoint;
    await withHatch(undefined, async () => {
      await expect(LoopbackLedger.open(remote)).rejects.toThrow(/REFUSED_NOT_LOOPBACK/);
    });
  });

  test("refuses a node that is not Devnet", async () => {
    const { server, endpoint } = fakeNode(() => ({
      info: { ...FULL_INFO.info, network_id: 1 },
    }));
    try {
      await expect(LoopbackLedger.open(endpoint)).rejects.toThrow(/REFUSED_NOT_DEVNET/);
    } finally {
      server.stop(true);
    }
  });

  test("refuses a node that is running but not yet full", async () => {
    const { server, endpoint } = fakeNode(() => ({
      info: { ...FULL_INFO.info, server_state: "connected" },
    }));
    try {
      await expect(LoopbackLedger.open(endpoint)).rejects.toThrow(/REFUSED_NODE_NOT_FULL/);
    } finally {
      server.stop(true);
    }
  });

  test("opens against a full Devnet node on loopback", async () => {
    const { server, endpoint } = fakeNode(() => FULL_INFO);
    try {
      const ledger = await LoopbackLedger.open(endpoint);
      expect(ledger.identity.buildVersion).toBe("3.3.0");
      expect(ledger.identity.networkId).toBe(2);
    } finally {
      server.stop(true);
    }
  });
});

describe("Snapshot", () => {
  test("refuses an answer that came from a different ledger than the pinned one", async () => {
    // E-103, observed live: two "validated" reads seconds apart landed in
    // different ledgers. REVIEW-016 found the Rust version asking for one
    // pinned index and never checking it.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { ledger_index: 4_800_001, node: { Sequence: 7 }, account_data: { Sequence: 7 } };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      expect(snapshot.index).toBe(4_800_000);
      await expect(snapshot.sequenceOf("rTest")).rejects.toThrow(/REFUSED_LEDGER_TORN/);
    } finally {
      server.stop(true);
    }
  });

  test("reads ConfidentialOutstandingAmount from a STRING, not a number", async () => {
    // ⚠ rippled serialises every UINT64 as a JSON string. Reading it with a
    // numeric helper sees every value as absent — and a preflight check that
    // always passes looks identical to one that works. This is the control the
    // signer has for the same field; the facility needs its own.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return {
        ledger_index: 4_800_000,
        validated: true,
        node: {
          LedgerEntryType: "MPTokenIssuance",
          Issuer: "rBank",
          ConfidentialOutstandingAmount: "12345",
          IssuerEncryptionKey: "02AA",
          TransferFee: 0,
          Flags: 0,
        },
      };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      const issuance = await snapshot.issuance("00".repeat(24));
      expect(issuance.confidentialOutstandingAmount).toBe(12345);
      // The control: a reader that saw every value as zero would also pass a
      // test that only ever asserted `>= 0`.
      expect(issuance.confidentialOutstandingAmount).not.toBe(0);
    } finally {
      server.stop(true);
    }
  });

  test("a holder with no MPToken reads as null rather than as an error", async () => {
    // rippled 3.4.1 names the ledger on `entryNotFound` (measured on Devnet,
    // 2026-10-19), and the snapshot now checks it like any other answer.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound", ledger_index: 4_800_000, validated: true };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      expect(await snapshot.mptoken("rNobody", "00".repeat(24))).toBeNull();
    } finally {
      server.stop(true);
    }
  });

  test("a 'not found' from a DIFFERENT ledger is refused, not read as an empty position", async () => {
    // REVIEW-058 R1-7: the negative path returned before the index check, so
    // this answer read as `null` in a snapshot pinned to 4_800_000, and the
    // observer view would have rendered an empty position. The Rust reader
    // closed the same gap in REVIEW-016 round two.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound", ledger_index: 4_800_001, validated: true };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.mptoken("rSomeone", "00".repeat(24))).rejects.toThrow(/REFUSED_LEDGER_TORN/);
    } finally {
      server.stop(true);
    }
  });

  test("a 'not found' that names no ledger is refused, because it proves nothing", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound" };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.mptoken("rSomeone", "00".repeat(24))).rejects.toThrow(/REFUSED_LEDGER_TORN/);
    } finally {
      server.stop(true);
    }
  });

  test("an entry of the wrong type is refused rather than read field by field", async () => {
    // An MPTokenIssuance returned where an MPToken was asked for would
    // otherwise be read for whichever fields share a name.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { ledger_index: 4_800_000, validated: true, node: { LedgerEntryType: "MPTokenIssuance", MPTAmount: "5" } };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.mptoken("rSomeone", "00".repeat(24))).rejects.toThrow(/REFUSED_LEDGER_MALFORMED/);
    } finally {
      server.stop(true);
    }
  });

  // REVIEW-058 round two (R2-4, R2-5): the Rust reader's `came_from` requires
  // `validated: true` and a numeric `ledger_index`, on positive and negative
  // answers alike. Round one's fix stopped at the index of a negative answer.
  const ORIGIN_CASES: Array<[string, Record<string, unknown>]> = [
    ["a positive answer marked validated: false", { ledger_index: 4_800_000, validated: false, account_data: { Sequence: 7 } }],
    ["a positive answer naming its ledger as a string", { ledger_index: "4800000", validated: true, account_data: { Sequence: 7 } }],
    ["a positive answer naming only ledger_current_index", { ledger_current_index: 4_800_000, validated: true, account_data: { Sequence: 7 } }],
  ];
  test("ORIGIN_CASES is not empty, so the loop below cannot pass by running nothing", () => {
    expect(ORIGIN_CASES.length).toBe(3);
  });
  for (const [why, answer] of ORIGIN_CASES) {
    test(`refuses ${why}`, async () => {
      const { server, endpoint } = fakeNode((method) => (method === "server_info" ? FULL_INFO : answer));
      try {
        const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
        await expect(snapshot.sequenceOf("rTest")).rejects.toThrow(/REFUSED_LEDGER_TORN/);
      } finally {
        server.stop(true);
      }
    });
  }

  test("a 'not found' marked validated: false is refused, not read as an empty position", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound", ledger_index: 4_800_000, validated: false };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.mptoken("rSomeone", "00".repeat(24))).rejects.toThrow(/REFUSED_LEDGER_TORN/);
    } finally {
      server.stop(true);
    }
  });

  test("an issuance read of the wrong entry type is refused (the issuance call site, not only mptoken)", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { ledger_index: 4_800_000, validated: true, node: { LedgerEntryType: "MPToken", Issuer: "rBank" } };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.issuance("00".repeat(24))).rejects.toThrow(/REFUSED_LEDGER_MALFORMED/);
    } finally {
      server.stop(true);
    }
  });

  // ADR-0004: a Devnet reset must render as a missing account, not as an
  // account holding nothing, so existence is read from the pinned ledger too.
  test("accountExists reads an AccountRoot from the pinned ledger", async () => {
    const asked: any[] = [];
    const { server, endpoint } = fakeNode((method, params) => {
      if (method === "server_info") return FULL_INFO;
      asked.push(params);
      return { ledger_index: 4_800_000, validated: true, node: { LedgerEntryType: "AccountRoot", Account: "rHere" } };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      expect(await snapshot.accountExists("rHere")).toBe(true);
      expect(asked).toEqual([{ account_root: "rHere", ledger_index: 4_800_000 }]);
    } finally {
      server.stop(true);
    }
  });

  test("accountExists reads a pinned 'not found' as absent", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound", ledger_index: 4_800_000, validated: true };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      expect(await snapshot.accountExists("rGone")).toBe(false);
    } finally {
      server.stop(true);
    }
  });

  test("accountExists refuses a 'not found' from another ledger rather than reporting a reset", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound", ledger_index: 4_799_999, validated: true };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.accountExists("rGone")).rejects.toThrow(/REFUSED_LEDGER_TORN/);
    } finally {
      server.stop(true);
    }
  });

  test("accountExists refuses an entry that is not an AccountRoot", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { ledger_index: 4_800_000, validated: true, node: { LedgerEntryType: "MPToken" } };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.accountExists("rHere")).rejects.toThrow(/REFUSED_LEDGER_MALFORMED/);
    } finally {
      server.stop(true);
    }
  });

  test("accountExists does not read a real error as a missing account", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "actMalformed", ledger_index: 4_800_000, validated: true };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.accountExists("rBad")).rejects.toThrow(/REFUSED_LEDGER_ERROR/);
    } finally {
      server.stop(true);
    }
  });

  test("a real error is not swallowed as an absent entry", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "internal", error_message: "the node fell over" };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.mptoken("rSomeone", "00".repeat(24))).rejects.toBeInstanceOf(
        LedgerRefusal,
      );
    } finally {
      server.stop(true);
    }
  });
});
