/**
 * The application's **only** way to reach anything.
 *
 * ⚠ **HTTP to the read-only Elysia API, and nothing else.** There is no UDS
 * client here, no socket path, and no server function that reaches one — see
 * `ADR-0003` D3, which is precisely about how easy TanStack Start makes it to
 * add one. `tools/check-web-readonly.ts` asserts the absence.
 */

/**
 * ⚠ **The base differs between the server and the browser, and it has to.**
 *
 * In the browser, `/api` is relative and Vite's proxy forwards it. **During SSR
 * there is no proxy and no origin**, so `fetch("/api/meta")` throws
 * `Failed to parse URL from /api/meta` — which is exactly what the first
 * version did: the page's banner and navigation rendered, and every loader
 * failed. **Found by loading the page, not by the type-check or the build**,
 * both of which were clean.
 *
 * ⚠ The server path therefore talks to the API **directly**, bypassing the
 * proxy — which is why `assertOurApi()` matters on both sides rather than only
 * in the browser.
 */
const BASE =
  typeof window === "undefined"
    ? `http://127.0.0.1:${import.meta.env?.VITE_WCONF_WEB_PORT ?? process.env.WCONF_WEB_PORT ?? 3011}/api`
    : "/api";

/**
 * ⚠ **Every response is checked to have come from OUR API, not merely from the
 * port we proxied to.** The first default port collided with a Docker-hosted
 * Gitea: the API died with `EADDRINUSE`, the proxy forwarded `/api/*` to it,
 * and it answered a login redirect that nothing in the tier questioned. **A
 * free port is luck; a checked identity is not.**
 */
async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${path} answered ${r.status}. Is the read-only API running? \`make web-api\``);

  const type = r.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new Error(
      `${path} answered ${type || "an unknown content type"}, not JSON. Something OTHER than the ` +
      `W-CONF read-only API is listening on the proxied port — do not trust anything it returned.`,
    );
  }
  return r.json() as Promise<T>;
}

/**
 * Asserted before any other response is trusted.
 *
 * ⚠⚠ **THIS WAS CALLED FROM ONE LOADER AND THAT MADE IT DECORATIVE.** Only the
 * overview ran it, so navigating straight to `/observer`, `/issuer`,
 * `/capabilities`, `/custody` or `/wallet` fetched and rendered whatever the
 * proxied port returned — **exactly the collision the guard was added for**
 * (`CLAIMS.md` E-213). It now runs from the ROOT route's `beforeLoad`, so no
 * route can be reached without it.
 *
 * ⚠ The result is cached for the life of the page: the check exists to catch a
 * **wrong service on the port**, which does not change between navigations, and
 * re-fetching `/meta` on every route would be a cost without a property.
 */
let identity: Promise<void> | null = null;

export function assertOurApi(): Promise<void> {
  identity ??= (async () => {
    const meta = await get<any>("/meta");
    if (meta?.service !== "wconf-read-only-api") {
      throw new Error(
        `The proxied port is answering, but it is not the W-CONF read-only API ` +
        `(service: ${JSON.stringify(meta?.service)}). Refusing to render its data.`,
      );
    }
  })().catch((e) => {
    // ⚠ A failed check must not be cached as "checked". Reset so the next
    // navigation retries rather than inheriting a stale rejection.
    identity = null;
    throw e;
  });
  return identity;
}

export const api = {
  meta: () => get<any>("/meta"),
  signer: () => get<any>("/signer"),
  source: () => get<any>("/source"),
  capabilities: () => get<any>("/capabilities"),
  custody: () => get<any>("/custody"),
  accounts: () => get<any>("/accounts"),
  observer: (account: string, issuanceId: string) => get<any>(`/observer/${account}/${issuanceId}`),
  issuer: (account: string, issuanceId: string) => get<any>(`/issuer/${account}/${issuanceId}`),
};
