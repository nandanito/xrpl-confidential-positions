import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import styles from "../../styles.css?url";
import { Footer } from "../Footer";

/**
 * The hosted demo's root (`ADR-0004`, architecture §6 step 9).
 *
 * ⚠ **No `beforeLoad` identity check and no API**: there is no API. Every
 * value comes from the build's one snapshot (`../data`), so no route can be
 * reached that fetches anything but files from this host.
 */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "W-CONF: confidential MPT on the XRPL Devnet" },
    ],
    links: [{ rel: "stylesheet", href: styles }],
  }),
  component: Root,
});

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/observer", label: "What anyone sees" },
  { to: "/issuer", label: "What the issuer sees" },
  { to: "/capabilities", label: "Who can do what" },
  { to: "/wallet", label: "Wallets" },
  { to: "/custody", label: "Custody" },
] as const;

function Root() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <div className="bg-[var(--color-warn)] text-white text-sm px-4 py-2 font-medium">
          Devnet snapshot · signs nothing, holds no keys · this project is not secure, not audited, not production-ready (P-5)
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">W-CONF</h1>
            <p className="text-sm opacity-70 mt-1">
              What confidential Multi-Purpose Tokens (MPTs) on the XRP Ledger hide, and what they do
              not. A research project, shown on one snapshot of the Devnet.
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
          <Footer />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
