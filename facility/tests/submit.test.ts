/**
 * submit.test.ts — the facility's submitter always sets `tapFailHard`.
 *
 * The second half of B-15's step-7 ruling, and the half the decision request
 * calls **a convention rather than a property**: nothing forces a separate
 * submitter to set the flag. What can be tested is narrower and is worth
 * testing — that *this* submitter cannot be made to omit it, on any path.
 */
import { describe, expect, test } from "bun:test";
import { LoopbackLedger } from "../src/loopback.ts";
import { FailHardSubmitter } from "../src/submit.ts";

const FULL_INFO = {
  info: {
    build_version: "3.3.0",
    network_id: 2,
    server_state: "full",
    validated_ledger: { seq: 4_800_000 },
  },
};

/** A node that records every `submit` it is asked to make. */
function recordingNode() {
  const submits: any[] = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const body: any = await req.json();
      const params = body.params?.[0] ?? {};
      switch (body.method) {
        case "server_info":
          return Response.json({ result: { status: "success", ...FULL_INFO } });
        case "ledger_current":
          return Response.json({
            result: { status: "success", ledger_current_index: 4_800_003 },
          });
        case "account_info":
          return Response.json({
            result: { status: "success", ledger_index: 4_800_000, validated: true, account_data: { Sequence: 11 } },
          });
        case "submit":
          submits.push(params);
          return Response.json({
            result: {
              status: "success",
              engine_result: "tesSUCCESS",
              engine_result_message: "ok",
              applied: true,
              tx_json: { hash: "A".repeat(64) },
            },
          });
        default:
          return Response.json({ result: { status: "error", error: "unknown" } });
      }
    },
  });
  return { server, endpoint: `http://127.0.0.1:${server.port}`, submits };
}

describe("FailHardSubmitter", () => {
  test("sets fail_hard on a pre-signed blob", async () => {
    const { server, endpoint, submits } = recordingNode();
    try {
      const submitter = new FailHardSubmitter(await LoopbackLedger.open(endpoint));
      await submitter.submitBlob("DEADBEEF");
      expect(submits).toHaveLength(1);
      expect(submits[0].fail_hard).toBe(true);
      expect(submits[0].tx_blob).toBe("DEADBEEF");
    } finally {
      server.stop(true);
    }
  });

  test("signing does NOT submit — there is exactly one path to the network", async () => {
    // ⚠ An earlier shape had `signAndSubmit` doing both, so every caller that
    // wanted a validated result submitted the same blob a second time and the
    // second attempt could only fail. Splitting them also leaves ONE path to
    // the network, which is what makes "no path omits the flag" a property of
    // the shape rather than of everyone remembering.
    const { server, endpoint, submits } = recordingNode();
    try {
      const submitter = new FailHardSubmitter(await LoopbackLedger.open(endpoint));
      const blob = await submitter.sign(
        { TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: "00".repeat(24) },
        "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n",
      );
      expect(blob.length).toBeGreaterThan(0);
      expect(submits).toHaveLength(0);

      await submitter.submitBlob(blob);
      expect(submits).toHaveLength(1);
      expect(submits[0].fail_hard).toBe(true);
    } finally {
      server.stop(true);
    }
  });

  test("the control: a submitter that never set the flag would fail the two above", async () => {
    // Without this the two tests above pass against any object that happens to
    // call `submit`. This asserts the recorder can tell the difference — a test
    // that cannot distinguish the states it is asserting over is the false-pass
    // mode this project has now paid for three times (E-92, E-98, and
    // REVIEW-016 round two's two repaired tests).
    const { server, endpoint, submits } = recordingNode();
    try {
      const ledger = await LoopbackLedger.open(endpoint);
      await ledger.call("submit", { tx_blob: "DEADBEEF" });
      expect(submits[0].fail_hard).toBeUndefined();
    } finally {
      server.stop(true);
    }
  });

  test("the submitter's method set is pinned, so a NEW path cannot appear unnoticed", () => {
    // The enforcement is that there is nothing to pass: no method takes a
    // fail-hard argument, so a caller cannot ask for a submission without it.
    // What that does not cover is a method added later — which is exactly how a
    // flag set on one of two paths becomes a flag half set (REVIEW-015 found a
    // check `Send` performed and `Convert` skipped).
    //
    // So the method set is pinned. Adding a path fails this test until someone
    // has looked at whether it sets the flag.
    const methods = Object.getOwnPropertyNames(FailHardSubmitter.prototype)
      .filter((n) => n !== "constructor")
      .sort();
    expect(methods).toEqual(["sign", "submitBlob", "submitValidated", "waitValidated"]);
    // ⚠ **Exactly one of them submits.** `submitBlob` is the single place
    // `fail_hard` is set; `submitValidated` reaches the ledger through it;
    // `sign` and `waitValidated` talk to the ledger for other reasons and
    // submit nothing. An earlier version of this comment said *"every one of
    // them reaches the ledger through `submitBlob`"*, which is false of two of
    // the four — `REVIEW-022` round two found it, in the comment written to
    // explain the fix.
    //
    // ⚠ **And this test cannot see a `ledger.call("submit", …)` made outside
    // this class.** `run-facility.ts`'s fail-hard control makes exactly one,
    // deliberately, because demonstrating the flag requires an arm without it.
  });

  test("a tec is reported as a refusal that names the discard", async () => {
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(req) {
        const body: any = await req.json();
        if (body.method === "server_info") {
          return Response.json({ result: { status: "success", ...FULL_INFO } });
        }
        return Response.json({
          result: {
            status: "success",
            engine_result: "tecBAD_PROOF",
            engine_result_message: "the proof was not valid",
            applied: false,
            tx_json: { hash: "B".repeat(64) },
          },
        });
      },
    });
    try {
      const endpoint = `http://127.0.0.1:${server.port}`;
      const submitter = new FailHardSubmitter(await LoopbackLedger.open(endpoint));
      const res = await submitter.submitBlob("DEADBEEF");
      expect(res.engineResult).toBe("tecBAD_PROOF");
      expect(res.applied).toBe(false);
      await expect(submitter.submitValidated("DEADBEEF", "a Send")).rejects.toThrow(
        /discarded rather than applied/,
      );
    } finally {
      server.stop(true);
    }
  });
});
