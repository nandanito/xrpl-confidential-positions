/**
 * The read-only Elysia API — architecture §6 step 8, `ADR-0003` D1.
 *
 * ```
 * Browser  ──HTTP, localhost, READ-ONLY──►  this process  ──►  rippled (Devnet)
 *                                                │
 *                                                └──►  signer UDS: Status ONLY
 * ```
 *
 * ⚠ **This process is the only thing in the web tier that may open the signer's
 * Unix socket, and `Request::Status` is the only request it may build.** `Pair`
 * and `Prepare` carry authority. `tools/check-web-readonly.ts` asserts both
 * halves and is wired into the `Makefile`.
 *
 * ⚠ **There is no write path here at all — not a disabled one, an absent one.**
 * The tier signs nothing and holds no key, so an XSS in the browser
 * application reaches no SIGNING authority.
 *
 * ⚠⚠ **THIS SAID AN XSS *"reaches exactly what a `curl` against a public node
 * reaches"* UNTIL 2026-09-04, AND THAT WAS FALSE — `CLAIMS.md` E-239.** This
 * same process served a **decrypted issuer snapshot** and **signer-local
 * status**, including a record count that includes attempts which never reached
 * the ledger and the local socket path. **None of that is on a public node.**
 * ⚠ All three were withdrawn on 2026-09-05 (E-241); see the `/signer` route
 * and `issuer.ts`.
 *
 * ⚠ **It is the retracted trust-boundary claim (E-230) surviving as a
 * PARAPHRASE in live source, which is the one shape `check-disclosure-phrases`
 * cannot catch** — it matches copies, not restatements. Found by an adversarial
 * leg asked for the single most overclaiming sentence in the repository.
 * Adding a signing route is not a code-review question; it is the
 * trust-boundary change `ADR-0003` names as a rotation trigger.
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { readSignerStatus } from "./signer-status.ts";
import { LedgerView, LedgerRefusal } from "./ledger-view.ts";
import { CAPABILITY_MATRIX, INVARIANTS, MASTER_SEED_DISCLOSURE, DERIVATION_NOT_PUBLISHED, WALLET_CODEC_GAP } from "./capability.ts";
import { observerView } from "./observer.ts";
import { walkFlows } from "./custody-sim.ts";
import { validDemoAccounts, DEMO_ACCOUNTS } from "./demo-accounts.ts";
import { issuerView } from "./issuer.ts";

/**
 * ⚠ **The ledger source is opened lazily and its failure is a rendered
 * disclosure, not a crash.** A tier that cannot reach a node must say which
 * node it could not reach; falling back to another one is the substitution
 * `CLAUDE.md` forbids.
 */
let view: LedgerView | null = null;
let viewError: string | null = null;

async function ledger(): Promise<LedgerView> {
  if (view) return view;
  try {
    view = await LedgerView.open();
    viewError = null;
    return view;
  } catch (e) {
    viewError = e instanceof LedgerRefusal ? `${e.code}: ${e.message}` : String(e);
    throw e;
  }
}

export const api = new Elysia({ prefix: "/api" })
  .use(cors({ origin: /^http:\/\/(localhost|127\.0\.0\.1):\d+$/ }))

  /**
   * What this tier is and what it refuses to be. Served first because a demo
   * that explains itself last has already misled whoever stopped reading.
   */
  .get("/meta", () => ({
    // ⚠ The client asserts this exact string before it trusts any other
    // response. See DEFAULT_PORT above for what it is guarding against.
    service: "wconf-read-only-api",
    tier: "read-only",
    signs: false,
    holdsKeys: false,
    architecture: "ARCHITECTURE-2026-08-18.md §6 step 8, revision 9",
    // ⚠ Was "(Proposed, not adversarially reviewed)" until 2026-09-02 — the
    // rotation ran and the running interface still said it had not (E-234).
    decision:
      "ADR-0003 — the web tier's trust boundary (ACCEPTED 2026-09-05, revision 3). Adversarially reviewed " +
      "2026-09-02 (REVIEW-036): the central claim was ruled UNSOUND and rewritten. This tier adds " +
      "no SIGNING authority; it does NOT follow that no boundary moved. It served a decrypted " +
      "issuer view and signer-local status unauthenticated to any local uid — a disclosure " +
      "boundary, named in CLAIMS.md E-228 and closed by removal on 2026-09-05 (E-241): the " +
      "issuer route reports whether a balance decrypted, never the figure.",
    network: "Devnet only. This project never writes to any other network, at any phase, for any reason.",
    neverClaims: INVARIANTS,
  }))

  /** The signer's own status. The ONE socket call this tier can make. */
  .get("/signer", async () => {
    const probe = await readSignerStatus();
    // ⚠⚠ **`socketPath` AND THE SIGNER'S `note` ARE WITHHELD — `CLAIMS.md` E-241.**
    // `...probe` used to spread both. The socket path is the holder's local
    // filesystem layout (on macOS a per-user `/var/folders/<hash>/T/…`), and
    // the note carries the randomness ledger's generation id and ENTRY COUNT —
    // which `signer/src/store.rs:753-756` commits for "a cancelled
    // confirmation, a failed proof, an aborted attempt", so it counts work that
    // never reached the ledger and no observer can reconstruct.
    //
    // ⚠ The signer's socket is `0600` inside a `0700` directory precisely to
    // keep other users off it (`ipc.rs:100-128`). Re-serving its answer on an
    // unauthenticated loopback listener undid that, because loopback is not
    // uid-scoped (`REVIEW-036` U1, E-228).
    const { socketPath: _withheld, ...safe } = probe as typeof probe & { socketPath?: string };
    const status = "status" in safe ? { ...safe.status, note: undefined } : undefined;
    return {
      ...safe,
      ...(status ? { status } : {}),
      withheld:
        "socketPath and the signer's note (holder address, randomness-ledger generation and entry " +
        "count) are deliberately not served. The entry count includes attempts that never reached " +
        "the ledger, so it is not recoverable from public state (CLAIMS.md E-228, E-241).",
      // ⚠ E-205: the variant's comment said "public ledger read" and it reads
      // no ledger. What comes back is signer-local, and the UI says so.
      whatThisIs:
        "Signer-local status: crate version and whether keys are loaded. The signer's note, which " +
        "names the holder address and the randomness ledger's size, is withheld (see `withheld`). " +
        "It performs no ledger read (CLAIMS.md E-205).",
      whatThisIsNot:
        "Not authority. Status needs no grant and touches no secret; Pair and Prepare are the requests " +
        "that carry authority and this tier cannot construct either.",
    };
  })

  /**
   * Known Devnet accounts, so the demonstration does not open on an empty form.
   * ⚠ Public ledger data only — addresses and issuance ids. The secrets file is
   * not read by this process and must not be.
   */
  .get("/accounts", () => ({
    issuance: "004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8",
    accounts: validDemoAccounts(),
    dropped: DEMO_ACCOUNTS.length - validDemoAccounts().length,
    note:
      "A convenience, not a registry. The observer and issuer views take any account and issuance; " +
      "these only save pasting. Addresses and issuance ids are public ledger data (CLAIMS.md P-4, P-11).",
  }))

  /** The ledger source, disclosed. */
  .get("/source", async ({ status }) => {
    try {
      const v = await ledger();
      return v.disclosure;
    } catch {
      return status(503, {
        reachable: false,
        error: viewError,
        namedGap:
          "The ledger source is unreachable. This is a named gap and is reported as one — " +
          "no other endpoint is substituted (CLAUDE.md: a substituted source is a corrupted one).",
      });
    }
  })

  /** What a full-ledger observer sees. The honest counterpart to the demo. */
  .get("/observer/:account/:issuanceId", async ({ params, status }) => {
    try {
      const v = await ledger();
      return await observerView(await v.snapshot(), params.account, params.issuanceId);
    } catch (e) {
      return status(e instanceof LedgerRefusal ? 502 : 503, { error: String(e) });
    }
  })

  /**
   * What the ISSUER sees. ⚠ P-9: no configuration makes a holder private from
   * the issuer, and showing this is the honest counterpart to showing the
   * observer view.
   */
  .get("/issuer/:account/:issuanceId", ({ params }) =>
    // ⚠ **No ledger read, no key, no decryption.** This reads the CLI tool's
    // output file. The route that decrypted per request was an oracle (E-212).
    issuerView(params.account, params.issuanceId))

  /**
   * The custody demo mode. ⚠ A SIMULATION — every response says so, and the
   * verdicts are computed from a declared key-source shape rather than written
   * per flow, so a flow added later cannot be quietly marked "works".
   */
  .get("/custody", () => walkFlows())

  /** The capability matrix — the spine of the demonstration. */
  .get("/capabilities", () => ({
    rows: CAPABILITY_MATRIX,
    invariants: INVARIANTS,
    disclosures: { masterSeed: MASTER_SEED_DISCLOSURE, derivationNotPublished: DERIVATION_NOT_PUBLISHED },
    namedGaps: { walletCodec: WALLET_CODEC_GAP },
  }));

/**
 * ⚠ **3001 was the first default and it collided with a Docker-hosted Gitea on
 * the development machine** — the API died with `EADDRINUSE` while the browser
 * application's proxy happily forwarded `/api/*` to the stranger, which
 * answered `303 See Other` with a login redirect. **Nothing in the tier noticed.**
 * The port moved to 3011 AND `/api/meta` now carries an identity the client
 * checks, because a free port is luck and a checked identity is not.
 */
export const DEFAULT_PORT = Number(process.env.WCONF_WEB_PORT ?? 3011);

/**
 * ⚠⚠ **LOOPBACK, EXPLICITLY — AND THE DEFAULT WAS NOT.** `listen(port)` with a
 * bare number forwards no hostname to `Bun.serve`, whose default is
 * **`0.0.0.0`**. **Measured 2026-08-28**: a `Bun.serve({port})` with no hostname
 * answered on this machine's LAN address. So `make web-api` was publishing a
 * holder's ledger view — and, while the issuer route still decrypted, an
 * unauthenticated decryption oracle — **on every interface** (`CLAIMS.md`
 * E-213).
 *
 * ⚠ **CORS was not a defence and was never going to be**: it constrains
 * browsers, and `curl` is not a browser. The comment in `vite.config.ts` about
 * binding to `127.0.0.1` was applied to the *dev server* and not to this one.
 */
export const BIND_HOSTNAME = "127.0.0.1";

export function serve(port = DEFAULT_PORT) {
  const app = new Elysia().use(api).listen({ port, hostname: BIND_HOSTNAME });
  console.log(`W-CONF read-only API on http://${BIND_HOSTNAME}:${port}/api`);
  console.log(`⚠ READ-ONLY. This process signs nothing and holds no key (ADR-0003 D1).`);
  console.log(`⚠ Bound to ${BIND_HOSTNAME} only — not reachable from another machine.`);
  console.log(`⚠ Devnet only.`);
  return app;
}

if (import.meta.main) serve();
