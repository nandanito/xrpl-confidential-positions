/**
 * Where a hosted page's ledger values came from, and the accepted risk wording.
 *
 * ⚠ **Every hosted page that renders a ledger value renders this**, and the
 * hosted gate checks it from the built HTML: the D-H2 wording, the network
 * check and the ledger index (`ADR-0004`, "What phase 2 step 4's gate must
 * check"). The `data-` attributes are what the gate reads.
 */
import { Panel } from "../components/Verdict";
import { SNAPSHOT } from "./data";
import { DH2_WORDING } from "./wording";

export function LedgerReading() {
  const s = SNAPSHOT.source;
  return (
    <Panel title="Where these values come from" tone="warn">
      <div className="text-sm space-y-1" data-ledger-source="" data-network-id={s.networkId} data-ledger-index={s.ledgerIndex}>
        <div><span className="opacity-60">read from</span> <code>{s.endpoint}</code></div>
        <div>
          <span className="opacity-60">validated ledger</span> <code>{s.ledgerIndex}</code>{" "}
          <span className="opacity-60">at</span> <code>{SNAPSHOT.readAt}</code>
        </div>
        <div>
          <span className="opacity-60">network_id</span> <code>{s.networkId}</code> (Devnet){" "}
          <span className="opacity-60">rippled</span> <code>{s.buildVersion}</code>
        </div>
      </div>
      <div className="mt-3 space-y-2" data-dh2-wording="">
        {DH2_WORDING.map((p) => <p key={p} className="text-sm leading-relaxed">{p}</p>)}
      </div>
    </Panel>
  );
}

/** One account's heading, with the ledger it was read at. */
export function AccountHeading({ label, address, note }: { label: string; address: string; note: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-semibold">{label}</h3>
      <code className="text-[10px] opacity-60 break-all" data-ledger-value="">{address}</code>
      <p className="text-xs opacity-75 mt-1">{note}</p>
      <p className="text-xs opacity-60 mt-1">read at validated ledger {SNAPSHOT.source.ledgerIndex}</p>
    </div>
  );
}

/** What the pinned ledger said when there is no position to show. */
export function AbsentReading({ state }: { state: string }) {
  const n = SNAPSHOT.source.ledgerIndex;
  const at = `At validated ledger ${n}`;
  const text: Record<string, string> = {
    // ⚠ `ADR-0004`'s own sentence, word for word (its "Devnet resets" section).
    "account-missing":
      `This account does not exist on Devnet at ledger ${n}. Devnet is reset from time to time and the demo accounts are throwaway. No other source is substituted.`,
    "issuance-missing": `${at} the demo issuance does not exist, so no account holds a position in it.`,
    "no-position": `${at} this account exists and holds no position in the demo issuance.`,
  };
  return <p className="text-sm" data-ledger-value="">{text[state] ?? `Unrecognised state ${JSON.stringify(state)}.`}</p>;
}
