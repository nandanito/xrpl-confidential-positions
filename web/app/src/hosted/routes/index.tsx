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
        <p className="text-sm leading-relaxed">
          A read-only look at confidential MPT positions on the XRPL Devnet. Every value comes from
          one snapshot of the ledger, taken when this site was built. The site signs nothing and holds
          no keys. No code of this project runs on a server when you load it, and your browser
          requests only this site&rsquo;s own files.
        </p>
      </Panel>

      <Panel title="Start here">
        <ol className="text-sm space-y-1 list-decimal pl-5 opacity-85">
          <li><strong>Capability matrix</strong>: what each kind of key can and cannot do.</li>
          <li><strong>Observer view</strong>: what anyone can read on the ledger, including which balances are visibly zero.</li>
          <li><strong>Issuer view</strong>: the issuer&rsquo;s copy of each balance, without the figure.</li>
          <li><strong>Wallet</strong>: why the browser wallets examined cannot hold a confidential position.</li>
          <li><strong>Custody</strong>: where confidentiality and custody approval policies conflict.</li>
        </ol>
      </Panel>

      <Panel title="To transact, run it yourself">
        <p className="text-sm leading-relaxed">
          Signing happens only in <code>wconf-signer</code>, a separate program on the holder&rsquo;s own
          machine, never in a web page. The README explains how to build it and run the local version
          of this site. It does not yet explain how to create a holder profile and funded Devnet
          accounts, which a transaction needs.
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
        <p className="text-xs opacity-60 mt-3">Each label is a row in the repository&rsquo;s CLAIMS.md.</p>
      </Panel>
    </>
  );
}
