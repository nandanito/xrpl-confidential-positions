/**
 * risk-acceptance.test.ts — the escape hatch, and the four states it has.
 *
 * On 2026-08-25 the project owner **amended** B-15's step-7 answer to extend
 * `REVIEW-019`'s named risk acceptance to the facility's Devnet demo. This is
 * that amendment as code: a remote endpoint is no longer impossible, it is
 * **recorded** — refused unless somebody types a sentence, disclosed in full
 * when they do, and stamped onto the run so no later reader can mistake it for
 * a run that kept the obligation.
 *
 * ⚠ **Nothing here makes a remote endpoint safe.** `CLAIMS.md` F-23 is
 * executed. What the hatch changes is whether the risk is visible.
 */
import { describe, expect, test } from "bun:test";
import {
  LoopbackLedger,
  REMOTE_LEDGER_DISCLOSURE,
  RISK_ACCEPTANCE_PHRASE,
} from "../src/loopback.ts";
import { HOSTILE_ENDPOINTS } from "./hostile-endpoints.ts";
import { withHatch } from "./with-hatch.ts";

const REMOTE = HOSTILE_ENDPOINTS.find((h) => h.why.includes("every other harness"))!.endpoint;

const FULL_INFO = {
  info: {
    build_version: "3.3.0",
    network_id: 2,
    server_state: "full",
    validated_ledger: { seq: 4_800_000 },
  },
};

function fakeNode() {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => Response.json({ result: { status: "success", ...FULL_INFO } }),
  });
  return { server, endpoint: `http://127.0.0.1:${server.port}` };
}

describe("the hatch has four states and they are distinguishable", () => {
  test("unset: a remote endpoint is refused, and the refusal names the way out", async () => {
    await withHatch(undefined, async () => {
      const err = await LoopbackLedger.open(REMOTE).catch((e) => e);
      expect(String(err)).toContain("REFUSED_NOT_LOOPBACK");
      // ⚠ The refusal must say the hatch exists. A gate whose only message is
      // "no" teaches the next person to remove the gate.
      expect(String(err)).toContain("WCONF_ACCEPT_REMOTE_LEDGER_RISK");
    });
  });

  test("set to something else: refused DIFFERENTLY, not accepted", async () => {
    // ⚠ A hatch that opens on anything truthy is a hatch that opens by
    // accident, and a near miss reported as the generic refusal would leave
    // someone believing they had turned it on.
    for (const wrong of ["1", "true", "yes", RISK_ACCEPTANCE_PHRASE.toLowerCase(), " " + RISK_ACCEPTANCE_PHRASE]) {
      await withHatch(wrong, async () => {
        const err = await LoopbackLedger.open(REMOTE).catch((e) => e);
        expect(String(err)).toContain("REFUSED_RISK_NOT_ACCEPTED");
        expect(String(err)).not.toContain("REFUSED_NOT_LOOPBACK");
      });
    }
  });

  test("set exactly: it OPENS a remote-classified endpoint, stamps false, and discloses", async () => {
    // ⚠ **This is the only test that actually executes the accepting branch**,
    // and until `REVIEW-023` there was none. The earlier version connected to
    // `127.0.0.1`, which never reaches `assertRemoteRiskAccepted` at all — its
    // name promised the accepted-remote outcome while its assertions proved the
    // opposite stamp. A wording that describes a branch the test does not take
    // is worse than no test, because it reads as coverage.
    //
    // The route in is the leg's own: `localhost` is deliberately classified
    // NON-loopback by `isLoopbackEndpoint` (a name is resolved by something
    // this process does not control), while still resolving to the local
    // server. So the hatch is genuinely exercised without a packet leaving the
    // machine.
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () => Response.json({ result: { status: "success", ...FULL_INFO } }),
    });
    const remoteClassified = `http://localhost:${server.port}`;
    const written: string[] = [];
    const realWrite = process.stderr.write.bind(process.stderr);
    (process.stderr as any).write = (chunk: any) => {
      written.push(String(chunk));
      return true;
    };
    try {
      await withHatch(RISK_ACCEPTANCE_PHRASE, async () => {
        const ledger = await LoopbackLedger.open(remoteClassified);
        expect(ledger.identity.isLoopback).toBe(false);
        expect(ledger.underB15Conditions).toBe(false);
        expect(ledger.b15Note).toContain("REMOTE endpoint");
      });
    } finally {
      (process.stderr as any).write = realWrite;
      server.stop(true);
    }
    // ⚠ The disclosure must actually be EMITTED, not merely exist as a
    // constant. The wording tests below assert the constant's sentences; this
    // asserts that `open` puts them in front of somebody.
    const emitted = written.join("");
    expect(emitted).toContain("NOT UNDER B-15's STEP-7 CONDITIONS");
    expect(emitted).toContain(remoteClassified);
  });

  test("an unflagged submission takes the stamp down even on loopback", async () => {
    // ⚠ B-15's Part C says "whatever submits" and names no control-arm
    // exception. `run-facility.ts` makes exactly one unflagged submission on
    // every run, so a stamp measuring only loopback-ness would have recorded a
    // future loopback run as "both halves in force". REVIEW-023 found that.
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(req) {
        const body: any = await req.json();
        if (body.method === "server_info") {
          return Response.json({ result: { status: "success", ...FULL_INFO } });
        }
        return Response.json({
          result: { status: "success", engine_result: "tecNO_AUTH", tx_json: { hash: "A".repeat(64) } },
        });
      },
    });
    try {
      const endpoint = `http://127.0.0.1:${server.port}`;
      const ledger = await LoopbackLedger.open(endpoint);
      expect(ledger.underB15Conditions).toBe(true);

      await ledger.call("submit", { tx_blob: "DEADBEEF", fail_hard: true });
      expect(ledger.underB15Conditions).toBe(true); // a flagged one changes nothing

      await ledger.call("submit", { tx_blob: "DEADBEEF" });
      expect(ledger.underB15Conditions).toBe(false);
      expect(ledger.b15Note).toContain("without tapFailHard");
    } finally {
      server.stop(true);
    }
  });

  test("submit_multisigned counts too — the counter asks the broad question", async () => {
    // ⚠ The counter matched the exact string `submit` until `REVIEW-023` round
    // two named `submit_multisigned`, which is also a submission and also takes
    // `fail_hard`. Nothing in the facility uses it. That is exactly why this
    // test exists: a counter that has to be right about which submission APIs
    // exist is a counter that goes wrong when someone adds one.
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(req) {
        const body: any = await req.json();
        if (body.method === "server_info") {
          return Response.json({ result: { status: "success", ...FULL_INFO } });
        }
        return Response.json({ result: { status: "success", engine_result: "tesSUCCESS" } });
      },
    });
    try {
      const ledger = await LoopbackLedger.open(`http://127.0.0.1:${server.port}`);
      await ledger.call("submit_multisigned", { tx_json: {} });
      expect(ledger.underB15Conditions).toBe(false);
      expect(ledger.b15Note).toContain("without tapFailHard");
    } finally {
      server.stop(true);
    }
  });

  test("a non-boolean fail_hard is counted as UNFLAGGED, which is the safe answer", async () => {
    // `fail_hard: "true"` is a string, and rippled would not read it as the
    // boolean. Counting it as flagged would be the one wrong direction.
    const { server, endpoint } = fakeNode();
    try {
      const ledger = await LoopbackLedger.open(endpoint);
      await ledger.call("submit", { tx_blob: "DEADBEEF", fail_hard: "true" });
      expect(ledger.underB15Conditions).toBe(false);
    } finally {
      server.stop(true);
    }
  });

  test("the hatch being set does NOT downgrade a loopback connection", async () => {
    // The stamp follows the endpoint, not the variable. A loopback run with the
    // variable left over from an earlier one is still a loopback run, and
    // recording it as compromised would be as wrong as the reverse.
    const { server, endpoint } = fakeNode();
    try {
      await withHatch(RISK_ACCEPTANCE_PHRASE, async () => {
        expect((await LoopbackLedger.open(endpoint)).underB15Conditions).toBe(true);
      });
      await withHatch(undefined, async () => {
        expect((await LoopbackLedger.open(endpoint)).underB15Conditions).toBe(true);
      });
    } finally {
      server.stop(true);
    }
  });
});

describe("the disclosure's wording", () => {
  // ⚠ CLAIMS.md E-126: the one disclosure surface that was not a constant with
  // an asserted wording is where a false sentence lived through a whole round of
  // review — and REVIEW-022 then found this file's sibling citing a wording test
  // that did not exist. This is that test.
  test("says the run is NOT under B-15's conditions", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("NOT UNDER B-15's STEP-7 CONDITIONS");
  });

  test("says F-23 is EXECUTED, not theoretical", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("EXECUTED, not theoretical");
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("F-23");
  });

  test("says TLS does not address it", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("TLS does not");
  });

  test("says the amendment had no adversarial review", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("NO adversarial review");
  });

  test("says what a run under it cannot establish", () => {
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("CANNOT establish");
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("loopback obligation");
  });

  test("does NOT claim §10.5's state changes, because the driver does not check them", () => {
    // ⚠ It claimed exactly that, while `run-facility.ts`'s own header said it
    // did not — REVIEW-023 found the pair, and noted that the wording tests
    // conspicuously skipped the "CAN establish" paragraph, so the one false
    // sentence in the constant was the one nothing pinned. This pins it.
    //
    // ⚠ The first version of this assertion was `/CAN establish[\s\S]*§10.5/`
    // and failed against correct text: it spanned the paragraph break and
    // matched the CORRECTION. Scope the claim to the paragraph that makes it.
    const paragraphs = REMOTE_LEDGER_DISCLOSURE.split("\n\n");
    const canEstablish = paragraphs.find((p) => p.includes("CAN establish"))!;
    expect(canEstablish).toBeDefined();
    // ⚠ **This pinned the literal `§10.5` and nothing else until `REVIEW-023`
    // round two**, which both external legs raised: the paragraph could say
    // *"every state change XLS-0096 requires"*, reintroduce exactly the defect
    // C-4 found, and keep this test green. A regression test that pins one
    // SPELLING of a claim does not pin the claim.
    for (const forbidden of [/10\.5/, /state change/i, /XLS-0096/]) {
      expect(canEstablish).not.toMatch(forbidden);
    }
    expect(REMOTE_LEDGER_DISCLOSURE).toContain("does NOT establish XLS-0096 §10.5");
  });

  test("the acceptance phrase is a sentence, not a flag", () => {
    // A value someone can set by muscle memory is a value that gets set by
    // muscle memory. Typing it is the acknowledgement.
    expect(RISK_ACCEPTANCE_PHRASE.split(" ").length).toBeGreaterThan(6);
    expect(RISK_ACCEPTANCE_PHRASE).toContain("F-23");
  });
});
