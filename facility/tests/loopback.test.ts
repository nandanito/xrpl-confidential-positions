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
        node: {
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
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound" };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      expect(await snapshot.mptoken("rNobody", "00".repeat(24))).toBeNull();
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
