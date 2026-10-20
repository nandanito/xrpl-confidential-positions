/**
 * What a full-ledger observer sees of one position.
 *
 * ⚠ Rendered by the local tier's observer route and by the hosted build's,
 * so the observer text has one body (`ADR-0004`). `data-ledger-value` marks
 * each ledger datum, which is how the hosted gate finds the pages that must
 * carry the risk wording.
 *
 * `lists={false}` leaves out what is public and what is hidden, for a page
 * that shows several positions and renders `ObserverLists` once above them.
 */
import { Panel } from "../components/Verdict";

export function ObserverReading({ view, lists = true }: { view: any; lists?: boolean }) {
  return (
    <>
      <Panel title="What a full-ledger observer sees">
        <div className="text-sm space-y-1 mb-4">
          <div><span className="opacity-60">public MPT balance</span> <code data-ledger-value="">{view.publicAmount}</code></div>
          <div><span className="opacity-60">registered</span> <code data-ledger-value="">{String(view.registered)}</code></div>
          <div><span className="opacity-60">ConfidentialBalanceVersion</span> <code data-ledger-value="">{view.confidentialBalanceVersion}</code></div>
          <div><span className="opacity-60">ConfidentialOutstandingAmount</span> <code data-ledger-value="">{view.issuance.confidentialOutstandingAmount}</code> (public: the total of all confidential balances)</div>
        </div>
        {["spending", "inbox"].map((k) => {
          const ct = (view as any)[k];
          if (!ct) return <p key={k} className="text-sm opacity-60">no {k} ciphertext</p>;
          return (
            <div key={k} className={`mt-3 p-3 rounded border ${ct.publiclyKnownZero ? "border-[var(--color-warn)]" : "border-black/10 dark:border-white/15"}`}>
              <div className="text-xs font-semibold uppercase tracking-wide opacity-60">{k}</div>
              <code className="text-[10px] break-all block my-1 opacity-80" data-ledger-value="">{ct.ciphertext}</code>
              <p className="text-sm">{ct.note}</p>
            </div>
          );
        })}
      </Panel>

      {lists && <ObserverLists view={view} />}
    </>
  );
}

/** What is public and what is hidden, the same for every position. */
export function ObserverLists({ view }: { view: any }) {
  return (
    <>
      <Panel title="Public">
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
  );
}
