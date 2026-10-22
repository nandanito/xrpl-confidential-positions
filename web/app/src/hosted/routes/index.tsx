import { Link, createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { SNAPSHOT } from "../data";

const REPO = "https://github.com/nandanito/xrpl-confidential-positions";

export const Route = createFileRoute("/")({ component: Overview });

/**
 * ⚠ The local overview's signer panel and its loader call are ABSENT here, not
 * hidden (`ADR-0004`, hosted exclusions): there is no signer behind this page.
 *
 * Orientation only: the answer in three lines and where to go. The explanation
 * is `/how-it-works`, so a reader who wants it opts in and one who does not is
 * not made to read it first.
 */
const PAGES = [
  { to: "/how-it-works", label: "How it works", text: "confidential transfers in plain words, and the example this project built." },
  { to: "/observer", label: "What anyone sees", text: "what a ledger observer reads of four test accounts, including which balances are visibly zero." },
  { to: "/issuer", label: "What the issuer sees", text: "the encrypted copy of each balance that the issuer can always read. This site does not publish the figures." },
  { to: "/capabilities", label: "Who can do what", text: "what each kind of key can and cannot do." },
  { to: "/wallet", label: "Wallets", text: "why the browser wallets examined cannot hold a confidential position." },
  { to: "/custody", label: "Custody", text: "where confidentiality and custody approval policies conflict." },
] as const;

function Overview() {
  const { invariants } = SNAPSHOT.repositoryText.capabilities;
  return (
    <>
      <Panel title="What this site shows">
        <p className="text-sm leading-relaxed">
          XLS-96, Confidential Transfers, lets a holder of a Multi-Purpose Token (MPT) keep their
          balance encrypted on the public XRP Ledger: hidden from the public, not from the token&rsquo;s
          issuer. This site shows what that hides and what it does not, from one snapshot of the Devnet
          test network.
        </p>
        <dl className="text-sm mt-4 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2">
          <dt className="font-semibold">Hidden</dt>
          <dd>
            Each holder&rsquo;s balance, and the amount of each confidential send. A new balance, a merged
            inbox and a clawed-back position are recognisable as zero.
          </dd>
          <dt className="font-semibold">Public</dt>
          <dd>Who sends to whom, when and how often, and every amount moved into or out of confidential form.</dd>
          <dt className="font-semibold">The issuer</dt>
          <dd>Can always read every balance. No setting turns this off.</dd>
        </dl>
        <p className="text-sm mt-4">
          <Link to="/how-it-works" className="underline underline-offset-4 font-medium">New to this? Read how it works</Link>
        </p>
      </Panel>

      <Panel title="Where to go">
        <ul className="text-sm space-y-1">
          {PAGES.map((p) => (
            <li key={p.to}>
              <Link to={p.to} className="underline underline-offset-4 font-medium">{p.label}</Link>: {p.text}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="About this site">
        <p className="text-sm leading-relaxed">
          Every value comes from one snapshot of the ledger, taken when this site was built. The site
          signs nothing and holds no keys. No code of this project runs on a server when you load it,
          and your browser requests only this site&rsquo;s own files.
        </p>
        <p className="text-sm leading-relaxed mt-2">
          To transact, run it yourself. Signing happens only in <code>wconf-signer</code>, a separate
          program on the holder&rsquo;s own machine, never in a web page. The{" "}
          <a className="underline" href="https://github.com/nandanito/xrpl-confidential-positions#run-it">
            README&rsquo;s &ldquo;Run it&rdquo;
          </a>{" "}
          explains how to build it and run the local version of this site. It does not yet explain how to
          create a holder profile and funded Devnet accounts, which a transaction needs.
        </p>
      </Panel>

      <Panel title="What it never claims" tone="warn">
        <ul className="text-sm space-y-2">
          {invariants.map((i: any) => (
            <li key={i.rule}>
              {i.text} <code className="text-xs opacity-60">({i.rule})</code>
            </li>
          ))}
        </ul>
        <p className="text-xs opacity-60 mt-3">
          Each code in brackets names a row in the project&rsquo;s claims register,{" "}
          <a className="underline" href={`${REPO}/blob/${SNAPSHOT.commit}/CLAIMS.md`}>CLAIMS.md</a>.
        </p>
      </Panel>
    </>
  );
}
