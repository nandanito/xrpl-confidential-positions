import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { ObserverReading } from "../../views/ObserverReading";
import { SNAPSHOT } from "../data";
import { AbsentReading, AccountHeading, LedgerReading } from "../LedgerReading";

export const Route = createFileRoute("/observer")({ component: Observer });

/**
 * What a full-ledger observer sees of each demo account, as the build read it.
 *
 * ⚠ **No input and no lookup.** The local tier takes any account; this page
 * shows the four demo accounts and nothing a visitor chooses, so no lookup
 * travels in a URL the host receives (`ADR-0004`).
 */
function Observer() {
  return (
    <>
      <LedgerReading />
      {SNAPSHOT.accounts.map((a) => (
        <Panel key={a.address} title={`Observer view: ${a.label}`}>
          <AccountHeading label={a.label} address={a.address} note={a.note} />
          {a.state === "present" && a.observer ? <ObserverReading view={a.observer} /> : <AbsentReading state={a.state} />}
        </Panel>
      ))}
    </>
  );
}
