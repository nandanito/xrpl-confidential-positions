/**
 * with-hatch.ts — own the environment a test depends on.
 *
 * ⚠ **`WCONF_ACCEPT_REMOTE_LEDGER_RISK` is process-wide, and until
 * `REVIEW-023` round two only `risk-acceptance.test.ts` controlled it.** Three
 * other tests asserted the loopback refusal and controlled nothing, so they
 * passed because of what happened to be in the shell rather than because of
 * anything they did.
 *
 * With the acceptance sentence exported — **which is exactly what
 * `facility/README.md` tells an operator to set, and what the shell that ran the
 * facility on 2026-08-25 had set** — `bun test facility tools` gave **76 pass,
 * 3 fail**, and the failure in `loopback.test.ts` was this:
 *
 *     Expected promise that rejects
 *     Received promise that resolved: Promise { <resolved> }
 *     (fail) LoopbackLedger.open > refuses a remote endpoint BEFORE it connects
 *
 * **The promise resolved.** `LoopbackLedger.open` reached
 * `s.devnet.rippletest.net`, got `server_info` back and returned a ledger — from
 * the unit test whose own comment is *"the refusal must not require the endpoint
 * to answer: a facility that reached out to a remote host on the way to failing
 * has already told that host what it was about to ask for."*
 *
 * So: **a test that asserts an environment-dependent outcome must own the
 * environment.** Every test that asserts the refusal wraps itself in
 * `withHatch(undefined, …)`, and the suite is run with the sentence exported to
 * prove it.
 */

/** Run `fn` with `WCONF_ACCEPT_REMOTE_LEDGER_RISK` set to `value`, then restore it. */
export async function withHatch<T>(value: string | undefined, fn: () => Promise<T>): Promise<T> {
  const saved = process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
  if (value === undefined) delete process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
  else process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK = value;
  try {
    return await fn();
  } finally {
    if (saved === undefined) delete process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
    else process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK = saved;
  }
}
