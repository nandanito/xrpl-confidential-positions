import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/")({ component: Overview });

/**
 * ⚠ The local overview's signer panel and its loader call are ABSENT here, not
 * hidden (`ADR-0004`, hosted exclusions): there is no signer behind this page.
 */
function Overview() {
  const { invariants } = SNAPSHOT.repositoryText.capabilities;
  return (
    <>
      <Panel title="What this is">
        <p className="text-sm leading-relaxed mb-3">
          A static demonstration of confidential positions on the XRPL Devnet, built from one
          snapshot of the ledger taken when this page was built. It never signs and never holds a
          key. No code of this project runs on a server when you load it, and your browser asks
          nothing of anyone but this site, for its own files.
        </p>
        <p className="text-sm leading-relaxed">
          The issuer page shows that the issuer&rsquo;s copy of each balance is on the ledger, and
          never a decrypted figure. A figure no visitor can check would be a claim with nothing to
          test it against.
        </p>
      </Panel>

      <Panel title="Start here">
        <ol className="text-sm space-y-1 list-decimal pl-5 opacity-85">
          <li><strong>Capability matrix</strong>: what each key source can and cannot do.</li>
          <li><strong>Observer view</strong>: what anyone can read, including which zero balances are visible.</li>
          <li><strong>Issuer view</strong>: that the issuer&rsquo;s copy exists for every holder, without the figure.</li>
          <li><strong>Wallet</strong>: three structural reasons the wallets examined cannot hold a position.</li>
          <li><strong>Custody</strong>: where confidentiality and policy controls collide.</li>
        </ol>
      </Panel>

      <Panel title="To transact, run it yourself">
        <p className="text-sm leading-relaxed">
          Signing happens only in <code>wconf-signer</code>, a separate binary on the holder&rsquo;s own
          machine, and never in a web page. The repository&rsquo;s README describes how to build it and
          run the local tier. It does not yet describe how to create a holder profile and funded
          Devnet accounts, which a transaction needs.
        </p>
        <p className="text-sm mt-2">
          <a className="underline" href="https://github.com/nandanito/xrpl-confidential-positions#run-it">
            README, &ldquo;Run it&rdquo;
          </a>
        </p>
      </Panel>

      <Panel title="What it never claims" tone="warn">
        <ul className="text-sm space-y-2">
          {invariants.map((i: any) => (
            <li key={i.rule}>
              <code className="text-xs font-semibold mr-2 opacity-70">{i.rule}</code>
              {i.text}
            </li>
          ))}
        </ul>
        <p className="text-xs opacity-60 mt-3">These are CLAIMS.md rows cited, not restated.</p>
      </Panel>
    </>
  );
}
