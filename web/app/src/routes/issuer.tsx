import { createFileRoute } from "@tanstack/react-router";
import { api } from "../api";
import { Panel } from "../components/Verdict";
import { AccountPicker } from "../components/AccountPicker";

export const Route = createFileRoute("/issuer")({
  validateSearch: (s: Record<string, unknown>) => ({
    account: (s.account as string) ?? "",
    issuanceId: (s.issuanceId as string) ?? "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const picker = await api.accounts().catch(() => ({ accounts: [] }));
    if (!deps.account || !deps.issuanceId) return { picker, view: null };
    const view = await api.issuer(deps.account, deps.issuanceId).catch((e) => ({ error: String(e) }));
    return { picker, view };
  },
  component: Issuer,
});

function Issuer() {
  const { picker, view } = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <>
      <Panel title="A holder is never private from the issuer" tone="warn">
        <p className="text-sm leading-relaxed">
          The issuer’s decryption mirror is part of the protocol. No configuration removes it, and
          no key source changes it. This page exists because showing what the issuer sees is the
          honest counterpart to showing what the public sees — a demo of the happy path is not
          evidence of confidentiality.
        </p>
        <p className="text-xs opacity-60 mt-3">CLAIMS.md P-9.</p>
      </Panel>

      <Panel title="Choose an account">
        <AccountPicker to="/issuer" accounts={picker.accounts ?? []} current={search} />
      </Panel>

      <Panel title="Where the decryption happened" tone="warn">
        <p className="text-sm leading-relaxed">
          Not here. This page reads a file produced by a command-line tool that holds the issuer key
          and decrypts a fixed set of accounts. ⚠ <strong>There is no request on this site that
          reaches a decryption</strong>, so there is no oracle to authenticate — an earlier version
          decrypted per request and that was a defect, not a feature.
        </p>
      </Panel>

      <Panel title="Key handling">
        <p className="text-sm">
          {/* ⚠ The fallback fires before an account is picked, and it said the
              web process reads the issuer key from its environment — false
              since the snapshot design, and contradicting /api/meta's
              holdsKeys:false on the same site (CLAIMS.md E-215). */}
          {view?.keyPolicy ??
            "This process holds no issuer key and performs no decryption. A command-line tool holds the key, decrypts a fixed set of accounts and writes results; this page reads those results. There is no request here that reaches a decryption."}
        </p>
      </Panel>

      {view && !("error" in view) && (
        <Panel title="Issuer view" tone={view.available ? "warn" : "plain"}>
          {view.available ? (
            <>
              <div className="text-sm space-y-1">
                <div>
                  <span className="opacity-60">issuer decryption</span>{" "}
                  <code className="text-base font-semibold">
                    {view.decryptable ? "SUCCEEDED" : "not available"}
                  </code>{" "}
                  <span className="opacity-60">— the figure is withheld</span>
                </div>
                <div className="opacity-70">
                  read from <code>{view.mirrorField}</code>, searched [0, {view.searchedTo}]
                </div>
                <div className="opacity-70">
                  ⚠ The decrypted balance is <strong>not served by this tier</strong>. Loopback is
                  not scoped to your user account, so an unauthenticated response would hand it to
                  every local process — out of a file the producing tool writes{" "}
                  <code>mode 0600</code>. To see the figure, run the CLI:{" "}
                  <code>bun run tools/issuer-decrypt-balance.ts</code>.
                </div>
                {view.publicAmount !== undefined && (
                  <div className="opacity-70">
                    public plaintext MPT balance <code>{view.publicAmount}</code> — ⚠ a different
                    number and a different thing; do not read one as the other
                  </div>
                )}
              </div>
              <p className="text-sm mt-3">
                ⚠ The observer view shows this same holder’s balance as an opaque ciphertext. It was
                read with one key that the protocol requires to exist.
              </p>
              {view.snapshotAgeNote && (
                <p className="text-xs opacity-60 mt-2">
                  {view.snapshotAgeNote}
                  {view.snapshotAtUnix
                    ? ` Taken ${new Date(view.snapshotAtUnix * 1000).toISOString()}.`
                    : ""}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm">{view.reason}</p>
          )}
          <p className="text-sm mt-3">{view.whatThisProves}</p>
        </Panel>
      )}
      {view && "error" in view && <Panel title="Read failed"><p className="text-sm">{String(view.error)}</p></Panel>}
    </>
  );
}
