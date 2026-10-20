import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../api";
import { Panel } from "../components/Verdict";
import { AccountPicker } from "../components/AccountPicker";
import { ObserverReading } from "../views/ObserverReading";

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

      {view && !view.error && <ObserverReading view={view} />}
      {view?.error && <Panel title="Read failed"><p className="text-sm">{view.error}</p></Panel>}
    </>
  );
}
