/**
 * boundary.test.ts — the two ways the loopback obligation was escapable, both
 * found by `REVIEW-022`'s Codex leg and both now refused.
 *
 * ⚠ **Neither was a mistake in `isLoopbackEndpoint`.** The check was right and
 * something reached the network around it. That is the shape worth remembering:
 * a correct predicate does not make a property, and the property here is
 * *"every ledger read the facility causes goes to a node the operator runs"* —
 * **including the reads the signer makes**, which are the ones `CLAIMS.md` F-23
 * is actually about.
 */
import { describe, expect, test } from "bun:test";
import { LoopbackLedger, sameEndpoint } from "../src/loopback.ts";
import { SignerSession } from "../src/signer.ts";
import { HOSTILE_ENDPOINTS } from "./hostile-endpoints.ts";
import { withHatch } from "./with-hatch.ts";

/**
 * ⚠ **These start a REAL signer**, so they need `signer/target/debug/wconf-signer`,
 * which needs the vendored build (`tools/rebuild-env.sh`). CI has neither, so it
 * sets `WCONF_SKIP_SIGNER_TESTS=1` and Bun reports them as SKIPPED, by name, rather
 * than as passes. Locally the variable is unset and they run, and fail loudly if
 * the signer is not built. Skipping is opt-in so a missing build is never quiet.
 */
const signerTest = process.env.WCONF_SKIP_SIGNER_TESTS === "1" ? test.skip : test;

const REDIRECT_TARGET = HOSTILE_ENDPOINTS.find((h) => h.why.startsWith("RFC 5737"))!.endpoint;

/**
 * The remote endpoint used as a negative input below.
 *
 * ⚠ Taken from the hostile fixture rather than written here, so that
 * `tools/check-loopback.ts` needs no second exemption — and so that a reader
 * who wonders why a remote host appears in a test finds the reason next to the
 * string instead of next to the gate.
 */
const REMOTE = HOSTILE_ENDPOINTS.find((h) => h.why.includes("every other harness"))!.endpoint;

describe("a redirect is the loopback check undone", () => {
  test("a loopback endpoint answering 307 does not forward the request off-host", async () => {
    // `fetch` follows redirects by default, and 307 preserves method and body.
    // Without `redirect: "error"` this POST — and every call after it — would
    // have gone to whatever the loopback responder named.
    let requests = 0;
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch() {
        requests++;
        return Response.redirect(REDIRECT_TARGET, 307);
      },
    });
    try {
      const endpoint = `http://127.0.0.1:${server.port}`;
      await expect(LoopbackLedger.open(endpoint)).rejects.toThrow(/REFUSED_LEDGER_UNAVAILABLE/);
      // The control: the responder WAS reached, so the refusal is about the
      // redirect and not about an endpoint that was never contacted.
      expect(requests).toBe(1);
    } finally {
      server.stop(true);
    }
  });
});

describe("sameEndpoint — the check a redirect would violate", () => {
  // ⚠ Tested directly because the path that reaches it needs a runtime that
  // ignores `redirect: "error"`, which no test can produce. Its FIRST version
  // compared against loopback-ness instead of against the requested endpoint,
  // and was wrong in both directions: it refused every remote endpoint even
  // when the risk had been accepted, and it would have waved through a redirect
  // from one loopback port to another.
  test("a trailing slash is not a difference", () => {
    expect(sameEndpoint("http://127.0.0.1:5005/", "http://127.0.0.1:5005")).toBe(true);
  });

  test("a different PORT on the same loopback host is a difference", () => {
    expect(sameEndpoint("http://127.0.0.1:5006/", "http://127.0.0.1:5005")).toBe(false);
  });

  test("a remote endpoint answering itself is NOT a redirect", () => {
    const remote = HOSTILE_ENDPOINTS.find((h) => h.why.includes("every other harness"))!.endpoint;
    expect(sameEndpoint(remote, remote)).toBe(true);
  });

  test("unparseable input is a difference, not a pass", () => {
    expect(sameEndpoint("", "http://127.0.0.1:5005")).toBe(false);
  });
});

describe("the signer's endpoint cannot be overridden out from under the check", () => {
  const profile = {
    accountSeed: "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n",
    issuanceId: "00".repeat(24),
    ledgerEndpoint: "http://127.0.0.1:5005",
    amountSearchTo: 1000,
  };

  signerTest("refuses when WCONF_LEDGER_ENDPOINT disagrees with the checked endpoint", async () => {
    // ⚠ `signer/src/main.rs:71` prefers this variable over the profile. The
    // facility inherited `process.env` and set only the profile, so the signer —
    // which reads the destination's and the issuer's keys — could have been
    // pointed anywhere while the facility's own reads stayed on loopback.
    const saved = process.env.WCONF_LEDGER_ENDPOINT;
    process.env.WCONF_LEDGER_ENDPOINT = REMOTE;
    try {
      await expect(
        SignerSession.start(profile, { workDir: "/tmp/wconf-boundary-test", autoConfirm: true }),
      ).rejects.toThrow(/REFUSED_ENDPOINT_OVERRIDE/);
    } finally {
      if (saved === undefined) delete process.env.WCONF_LEDGER_ENDPOINT;
      else process.env.WCONF_LEDGER_ENDPOINT = saved;
    }
  });

  signerTest("refuses a non-loopback endpoint in the profile itself", async () => {
    // ⚠ **The refusal depends on `WCONF_ACCEPT_REMOTE_LEDGER_RISK` being unset,
    // and this test owns that rather than hoping.** With the acceptance
    // sentence exported this asserted nothing: `REVIEW-023` round two ran the
    // suite that way and got 76 pass / 3 fail, with THIS test failing because
    // the promise RESOLVED — `open` reached the public endpoint and got
    // `server_info` back. A test that asserts an environment-dependent outcome
    // must own the environment.
    await withHatch(undefined, async () => {
      await expect(
        SignerSession.start(
          { ...profile, ledgerEndpoint: REMOTE },
          { workDir: "/tmp/wconf-boundary-test", autoConfirm: true },
        ),
      ).rejects.toThrow(/REFUSED_NOT_LOOPBACK/);
    });
  });
});
