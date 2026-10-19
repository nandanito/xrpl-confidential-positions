import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { assertOurApi } from "../api";
import styles from "../styles.css?url";

export const Route = createRootRoute({
  // ⚠ **Every route passes through here, which is the point.** The identity
  // check lived in one loader and was therefore decorative: direct navigation
  // to any other route rendered whatever answered the proxied port
  // (CLAIMS.md E-213).
  beforeLoad: () => assertOurApi(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "W-CONF — Confidential MPT, read-only" },
    ],
    links: [{ rel: "stylesheet", href: styles }],
  }),
  component: Root,
});

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/capabilities", label: "Capability matrix" },
  { to: "/observer", label: "Observer view" },
  { to: "/issuer", label: "Issuer view" },
  { to: "/wallet", label: "Wallet" },
  { to: "/custody", label: "Custody" },
];

function Root() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {/* ⚠ The banner is not decoration. Every surface of this tier says what
            it is, because an untested disclosure surface is where the false
            sentence always ends up. */}
        <div className="bg-[var(--color-warn)] text-white text-sm px-4 py-2 font-medium">
          READ-ONLY · Devnet only · signs nothing, holds no key · not secure, not audited,
          not production-ready (CLAIMS.md P-5)
        </div>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">W-CONF</h1>
            <p className="text-sm opacity-70 mt-1">
              Confidential MPT research artifact. Architecture §6 step 8 — the read-only web tier.
            </p>
            <nav className="flex flex-wrap gap-4 mt-4 text-sm">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} className="underline underline-offset-4 opacity-80 hover:opacity-100"
                      activeProps={{ className: "underline underline-offset-4 font-semibold opacity-100" }}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </header>
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
