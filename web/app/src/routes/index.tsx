import { createFileRoute } from "@tanstack/react-router";
import { api } from "../api";
import { Panel } from "../components/Verdict";

export const Route = createFileRoute("/")({
  loader: async () => {
    // ⚠ Loaders read. There is no server function here and none may be added
    // that reaches a signing operation — ADR-0003 D3 names that as exactly the
    // one-line mechanism to watch for.
    // ⚠ Identity is asserted in the ROOT route's beforeLoad, so it covers every
    // route rather than this one.
    const [meta, signer] = await Promise.all([
      api.meta().catch((e) => ({ error: String(e) })),
      api.signer().catch((e) => ({ error: String(e) })),
    ]);
    return { meta, signer };
  },
  component: Overview,
});

function Overview() {
  const { meta, signer } = Route.useLoaderData();

  return (
    <>
      <Panel title="What this is">
        <p className="text-sm leading-relaxed mb-3">
          A read-only view of confidential positions on the XRPL Devnet. It adds no{" "}
          <strong>signing</strong> authority: it never signs, never holds a key, and cannot reach
          the two signer requests that carry authority. It does not follow that it moves no
          boundary — it used to serve a decrypted issuer view and signer-local status to any
          local caller. ADR-0003 named that disclosure, and it was removed rather than guarded:
          the issuer page says whether a balance decrypted and never shows the figure.
        </p>
        <p className="text-sm leading-relaxed">
          Signing lives in a separate binary — <code>wconf-signer</code> — where the holder confirms
          each transaction against parsed fields in the signer’s own interface. That split is the
          trust boundary, and this tier is on the readable side of it.
        </p>
      </Panel>

      <Panel title="Start here">
        <p className="text-sm leading-relaxed">
          The running order, what each screen shows, what not to say, and what is missing are in{" "}
          <code className="text-xs">docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md</code>. The
          limitations note beside it is what this demonstration does <em>not</em> establish.
        </p>
        <ol className="text-sm mt-3 space-y-1 list-decimal pl-5 opacity-85">
          <li><strong>Capability matrix</strong> — what each key source can and cannot do.</li>
          <li><strong>Observer view</strong> — what anyone can read, including which zero balances are visible.</li>
          <li><strong>Issuer view</strong> — the same holder, decrypted. This is the point.</li>
          <li><strong>Wallet</strong> — three structural reasons a wallet cannot hold a position.</li>
          <li><strong>Custody</strong> — where confidentiality and policy controls collide.</li>
        </ol>
      </Panel>

      <Panel title="What it never claims" tone="warn">
        <ul className="text-sm space-y-2">
          {(meta.neverClaims ?? []).map((i: any) => (
            <li key={i.rule}>
              <code className="text-xs font-semibold mr-2 opacity-70">{i.rule}</code>
              {i.text}
            </li>
          ))}
        </ul>
        <p className="text-xs opacity-60 mt-3">
          These are CLAIMS.md rows cited, not restated. A second copy of a claim is a second thing
          to go stale.
        </p>
      </Panel>

      <Panel title="Signer">
        {signer.reachable ? (
          <div className="text-sm space-y-1">
            <div><span className="opacity-60">version</span> <code>{signer.status.version}</code></div>
            <div><span className="opacity-60">note</span> {signer.status.note}</div>
          </div>
        ) : (
          <p className="text-sm opacity-70">
            Not reachable: {signer.reason ?? signer.error}. This is a named gap, not a failure — the
            tier is read-only and every ledger view is complete without it.
          </p>
        )}
        <p className="text-xs opacity-60 mt-3">{signer.whatThisIs}</p>
        <p className="text-xs opacity-60 mt-1">{signer.whatThisIsNot}</p>
      </Panel>
    </>
  );
}
