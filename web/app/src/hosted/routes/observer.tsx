import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { ObserverLists, ObserverReading } from "../../views/ObserverReading";
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
  // What is public and what is hidden is the same for every position, so it is shown once.
  const lists = SNAPSHOT.accounts.find((a) => a.state === "present" && a.observer)?.observer;
  return (
    <>
      <LedgerReading />
      {lists && <ObserverLists view={lists} />}
      {SNAPSHOT.accounts.map((a) => (
        <Panel key={a.address} title={`Observer view: ${a.label}`}>
          <AccountHeading address={a.address} note={a.note} />
          {a.state === "present" && a.observer ? <ObserverReading view={a.observer} lists={false} /> : <AbsentReading state={a.state} />}
        </Panel>
      ))}
    </>
  );
}
