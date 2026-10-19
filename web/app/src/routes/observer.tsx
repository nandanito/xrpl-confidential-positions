import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../api";
import { Panel } from "../components/Verdict";
import { AccountPicker } from "../components/AccountPicker";

export const Route = createFileRoute("/observer")({
  validateSearch: (s: Record<string, unknown>) => ({
    account: (s.account as string) ?? "",
    issuanceId: (s.issuanceId as string) ?? "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [source, picker] = await Promise.all([
      api.source().catch((e) => ({ error: String(e) })),
      api.accounts().catch(() => ({ accounts: [] })),
    ]);
    if (!deps.account || !deps.issuanceId) return { source, picker, view: null };
    const view = await api.observer(deps.account, deps.issuanceId).catch((e) => ({ error: String(e) }));
    return { source, picker, view };
  },
  component: Observer,
});

function Observer() {
  const { source, picker, view } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/observer" });

  return (
    <>
      <Panel title="Ledger source" tone={source.isLoopback ? "plain" : "warn"}>
        {source.error ? (
          <p className="text-sm">{source.error}</p>
        ) : (
          <div className="text-sm space-y-1">
            <div><span className="opacity-60">endpoint</span> <code>{source.endpoint}</code></div>
            <div><span className="opacity-60">rippled</span> <code>{source.buildVersion}</code></div>
            <div><span className="opacity-60">network_id</span> <code>{source.networkId}</code> (Devnet)</div>
            <p className="mt-2">{source.note}</p>
          </div>
        )}
      </Panel>

      <Panel title="Look up an account">
        <AccountPicker to="/observer" accounts={picker.accounts ?? []} current={search} />
        <form
          className="flex flex-wrap gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            navigate({ search: { account: String(f.get("account") ?? ""), issuanceId: String(f.get("issuanceId") ?? "") } });
          }}
        >
          <input name="account" defaultValue={search.account} placeholder="r..." className="border rounded px-2 py-1 flex-1 min-w-56 bg-transparent" />
          <input name="issuanceId" defaultValue={search.issuanceId} placeholder="MPTokenIssuanceID (48 hex)" className="border rounded px-2 py-1 flex-1 min-w-56 bg-transparent" />
          <button className="border rounded px-3 py-1 font-medium">Read</button>
        </form>
        <p className="text-xs opacity-60 mt-2">
          Reads only. Nothing here can build, sign or submit a transaction.
        </p>
      </Panel>

      {view && !view.error && (
        <>
          <Panel title="What a full-ledger observer sees">
            <div className="text-sm space-y-1 mb-4">
              <div><span className="opacity-60">public MPT balance</span> <code>{view.publicAmount}</code> — plaintext, hidden from nobody</div>
              <div><span className="opacity-60">registered</span> <code>{String(view.registered)}</code></div>
              <div><span className="opacity-60">ConfidentialBalanceVersion</span> <code>{view.confidentialBalanceVersion}</code></div>
              <div><span className="opacity-60">ConfidentialOutstandingAmount</span> <code>{view.issuance.confidentialOutstandingAmount}</code> — plaintext on the issuance, the sum of every hidden position</div>
            </div>
            {["spending", "inbox"].map((k) => {
              const ct = (view as any)[k];
              if (!ct) return <p key={k} className="text-sm opacity-60">no {k} ciphertext</p>;
              return (
                <div key={k} className={`mt-3 p-3 rounded border ${ct.publiclyKnownZero ? "border-[var(--color-warn)]" : "border-black/10 dark:border-white/15"}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-60">{k}</div>
                  <code className="text-[10px] break-all block my-1 opacity-80">{ct.ciphertext}</code>
                  <p className="text-sm">{ct.note}</p>
                </div>
              );
            })}
          </Panel>

          <Panel title="Public" >
            <ul className="text-sm space-y-1 list-disc pl-5">
              {view.whatIsPublic.map((s: string) => <li key={s}>{s}</li>)}
            </ul>
          </Panel>

          <Panel title="Hidden">
            <ul className="text-sm space-y-1 list-disc pl-5">
              {view.whatIsHidden.map((s: string) => <li key={s}>{s}</li>)}
            </ul>
          </Panel>
        </>
      )}
      {view?.error && <Panel title="Read failed"><p className="text-sm">{view.error}</p></Panel>}
    </>
  );
}
