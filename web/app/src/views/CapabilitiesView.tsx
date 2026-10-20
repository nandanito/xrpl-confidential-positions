/**
 * The capability matrix page.
 *
 * ⚠ Rendered by the local tier's route and by the hosted build's route alike,
 * so the page has one body and the two cannot drift (`ADR-0004`; `CLAIMS.md`
 * E-141's shape is a second copy of one text).
 */
import { Panel, Verdict } from "../components/Verdict";

export function CapabilitiesView({ rows, invariants, disclosures }: { rows: any[]; invariants: any[]; disclosures: { masterSeed: string; derivationNotPublished: string } }) {
  return (
    <>
      <Panel title="Capability matrix">
        <p className="text-sm mb-4 opacity-80">
          What each key source can and cannot do. The ElGamal key encrypts and decrypts confidential
          balances; the XRPL account key signs. The rows follow the signer&rsquo;s own
          <code className="mx-1">KeySource</code> type, which has two variants, and rows that are not
          built say so.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-black/15 dark:border-white/20">
                <th className="py-2 pr-4">key source</th>
                <th className="py-2 pr-4">decrypt own balance</th>
                <th className="py-2 pr-4">prove + sign confidential</th>
                <th className="py-2 pr-4">public transactions</th>
                <th className="py-2">exists today</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-black/5 dark:border-white/10 align-top">
                  <td className="py-3 pr-4 font-medium">
                    {r.label}
                    {r.profileToken && <div className="text-xs opacity-60 font-normal"><code>{r.profileToken}</code></div>}
                  </td>
                  {["decryptOwnBalance", "proveAndSign", "publicTransactions"].map((k) => (
                    <td key={k} className="py-3 pr-4">
                      <Verdict v={r[k].verdict} />
                      <div className="text-xs opacity-75 mt-1 max-w-xs">{r[k].detail}</div>
                      <div className="text-[10px] opacity-45 mt-1">{r[k].citation}</div>
                    </td>
                  ))}
                  <td className="py-3 text-xs opacity-75">
                    {r.existsToday.built ? "built" : "not built"}
                    <div className="opacity-70 mt-1">{r.existsToday.where}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Shown before the seed is asked for" tone="warn">
        <p className="text-sm">{disclosures.masterSeed}</p>
        <p className="text-sm mt-3">{disclosures.derivationNotPublished}</p>
        <p className="text-xs opacity-60 mt-3">
          Required by the key-derivation ruling, REVIEW-012 condition 2.
        </p>
      </Panel>

      <Panel title="What no key source changes">
        <ul className="text-sm space-y-2">
          {invariants.map((i: any) => (
            <li key={i.rule}>
              <code className="text-xs font-semibold mr-2 opacity-70">{i.rule}</code>{i.text}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
