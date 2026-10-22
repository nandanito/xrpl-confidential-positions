import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Panel } from "../../components/Verdict";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/how-it-works")({ component: HowItWorks });

const REPO = "https://github.com/nandanito/xrpl-confidential-positions";
/** A repository file at the build's own commit, so the link shows the text the gate passed with. */
const AT_BUILD = (path: string) => `${REPO}/blob/${SNAPSHOT.commit}/${path}`;

/**
 * The explainer: what confidential transfers are, and the example this project
 * built, for a reader who has never met XLS-96.
 *
 * ⚠ **No ledger value, by design.** Check 8 of the hosted gate forbids an
 * address, an issuance ID or a ciphertext on any page but the two ledger
 * pages, so this page names the demo accounts by label only.
 *
 * ⚠ **Every sentence restates a register row or an explainer document**, and
 * the ids under each panel name them. The words *decrypt* and *plaintext* are
 * avoided on purpose: the gate's no-issuer-figure check (8b) reads either one
 * followed by a digit in the same sentence as a figure, and this page states
 * none.
 */
function HowItWorks() {
  return (
    <>
      <Panel title="Confidential balances, in brief">
        <div className="text-sm leading-relaxed space-y-2">
          <p>
            The XRP Ledger is public: anyone can read every account and every transaction on it.
            Multi-Purpose Tokens (MPTs, XLS-33) are one of its kinds of token. Confidential Transfers
            (XLS-96) let an MPT holder keep their balance encrypted on that public ledger: hidden from
            the public, not from the token&rsquo;s issuer.
          </p>
          <p>
            Each confidential balance is stored as an ElGamal ciphertext: a number only the right key
            can read. A holder registers their own encryption key when they opt in.
          </p>
          <p>
            The ledger must still check that nobody spends more than they hold. So every transaction
            that spends from a confidential balance carries zero-knowledge proofs, which every validator
            checks without learning any hidden amount.
          </p>
          <p>
            XLS-96 is a final standard. When this page was written, on 2026-10-21, its amendment,
            ConfidentialTransfer, was enabled on Devnet and not on Mainnet or Testnet.
          </p>
        </div>
        <Sources>E-1, E-349; the README&rsquo;s terms; TASK ZERO §3</Sources>
      </Panel>

      <Panel title="The life of a confidential position">
        <div className="grid gap-3 sm:grid-cols-3">
          <Step n="1" where="In" tone="public" name="Convert" tx="ConfidentialMPTConvert">
            Moves tokens from the holder&rsquo;s public balance into their confidential inbox. The amount
            is published. The first Convert also registers the holder&rsquo;s key, which can never be
            changed.
          </Step>
          <Step n="2" where="Inside" tone="hidden" name="Send" tx="ConfidentialMPTSend">
            Moves an amount from one confidential balance to another. The amount is hidden; the sender
            and receiver are not. It too arrives in the receiver&rsquo;s inbox.
          </Step>
          <Step n="3" where="Out" tone="public" name="ConvertBack" tx="ConfidentialMPTConvertBack">
            Moves tokens back to a public balance. The amount is published, on every ConvertBack
            separately.
          </Step>
        </div>
        <div className="text-sm leading-relaxed space-y-2 mt-4">
          <p>
            <strong>Tokens in the inbox cannot be sent yet.</strong> A separate transaction,
            MergeInbox, moves the inbox into the spending balance, so a holder who converts must merge
            before their first Send.
          </p>
          <p>
            <strong>Only Send hides an amount.</strong> The amount is encrypted separately for the
            sender, the receiver, the issuer and any auditor. Send&rsquo;s proofs show that every copy is
            the same number, that the sender holds the key to their balance, and that neither the amount
            nor the sender&rsquo;s remaining balance is negative.
          </p>
          <p>
            Why are both ends public? The ledger shows that no tokens are created inside the
            confidential pool by keeping its total in plain view. The token records the total held in
            confidential form, and every Convert and ConvertBack changes it by a published amount.
          </p>
        </div>
        <Sources>E-9, E-33, F-24, F-27, P-4, P-11; TASK ZERO §3; WHAT-CONFIDENTIAL-MEANS</Sources>
      </Panel>

      <Panel title="What is hidden, and what is public">
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <h3 className="font-semibold mb-1">Hidden from the public</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Each holder&rsquo;s balance, except in the zero cases under &ldquo;Public, always&rdquo;.</li>
              <li>The amount of each Send.</li>
            </ul>
            <p className="mt-2 opacity-80">Both are hidden from the public, not from the issuer.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Public, always</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Who sends to whom, and when, so how often anyone transacts.</li>
              <li>Every amount converted in or out, each one separately.</li>
              <li>The token&rsquo;s total supply, and the total held in confidential form.</li>
              <li>
                That a balance is exactly zero, in three cases: when it is first set up, when a
                MergeInbox empties the inbox, and after an issuer clawback, which destroys the balance. A
                balance spent down to zero looks like any other.
              </li>
            </ul>
          </div>
        </div>
        <p className="text-sm leading-relaxed mt-4">
          The public numbers also bound the hidden ones. If a holder converts in 500, receives nothing
          and converts back 400, anyone can work out that the other 100 is either still held or has left
          by confidential sends. No key is needed.
        </p>
        <Sources>P-4, P-9, P-11, F-24, F-1, E-211, R-1, R-7</Sources>
      </Panel>

      <Panel title="Who can read a balance, and who can spend it">
        <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
          <li>The holder can read their own balance, with their key.</li>
          <li>
            The issuer can always read every balance. The protocol keeps a second copy of each balance,
            encrypted to the issuer&rsquo;s key, and no setting turns it off.
          </li>
          <li>An auditor can too, if the issuer names one. Only one auditor is supported.</li>
          <li>
            This was run, not inferred: the holder, the issuer and the auditor each read the same
            balance, and again after it changed.
          </li>
          <li>
            Spending needs the holder&rsquo;s key: a Send&rsquo;s proof cannot be made without it. So the
            issuer cannot spend a holder&rsquo;s balance, though it can destroy it and may be able to
            freeze it (see Limits). Where the key is derived from the account&rsquo;s master seed,
            whoever holds the seed holds the key too.
          </li>
        </ul>
        <Sources>P-9, E-58, E-11, E-33, E-118, E-119</Sources>
      </Panel>

      <Panel title="The example: a confidential receivables facility">
        <div className="text-sm leading-relaxed mb-4 rounded border border-black/10 dark:border-white/15 p-3">
          <p>
            <strong>The other pages do not show this facility.</strong> They read four Devnet test
            accounts that hold one demo token, made by this project while it was being built: Holder A,
            an active position; Holder B, whose key is derived from its master seed; Holder C, the
            account the project&rsquo;s ed25519 signing ran on; and Holder D, an early test account.
            &ldquo;What anyone sees&rdquo; and &ldquo;What the issuer sees&rdquo; show how those accounts
            look to an observer and to the issuer. The facility below ran separately, and its record is
            in the repository:{" "}
            <a className="underline" href={AT_BUILD("docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md")}>
              the facility walkthrough
            </a>.
          </p>
        </div>
        <div className="text-sm leading-relaxed space-y-2">
          <p>
            A bank pays a large buyer&rsquo;s suppliers early, against their invoices. How much a
            supplier draws says a lot about its cash position, so these numbers are commercially
            sensitive.
          </p>
          <p>
            This project built the core of that facility on XLS-96 and ran it on Devnet on 2026-08-25, in
            28 validated facility transactions besides setting up the token:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              The bank creates the token, opens a Dedicated Account (an ordinary XRPL account that holds
              the float) and funds it publicly. The Dedicated Account converts the whole float into
              confidential form in one Convert.
            </li>
            <li>
              Each supplier enrols: the bank sends it a small public payment, and the supplier runs its
              own Convert, which registers its key.
            </li>
            <li>Drawdowns and repayments are Sends between the Dedicated Account and the suppliers.</li>
            <li>The facility is retired in tranches, each one a ConvertBack.</li>
          </ol>
          <p>
            The run shows that these transactions are well formed and that rippled accepts them. It read
            the ledger through a public Devnet node, not one on the same machine as the design requires,
            so it says nothing about that requirement.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 text-sm mt-4">
          <div>
            <h3 className="font-semibold mb-1">Anyone can see</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>The size of the float.</li>
              <li>Which suppliers are enrolled, and both public amounts of each enrolment.</li>
              <li>Who drew and repaid, on which days, and how often.</li>
              <li>The size of every retirement tranche.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Hidden from the public</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Each supplier&rsquo;s limit.</li>
              <li>The size of each drawdown and repayment.</li>
              <li>What each supplier still owes.</li>
            </ul>
            <p className="mt-2 opacity-80">The bank, as issuer, sees all of it.</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed mt-4">
          <strong>In short, it hides the shape of the book, not its size.</strong>
        </p>
        <Sources>E-146, B-18, E-151, F-24, F-26, R-1; the four accounts: E-208, E-118, E-176, E-101</Sources>
      </Panel>

      <Panel title="Limits" tone="warn">
        <ul className="text-sm leading-relaxed list-disc pl-5 space-y-2">
          <li>
            <strong>No key rotation or recovery in XLS-96.</strong> A registered key can never be changed.
            If a holder loses it, and any seed it can be re-derived from, the balance cannot be spent, and
            the only remedy is an issuer clawback, which destroys the balance. A key this project derives
            from the master seed can be re-derived from that seed, but the derivation is not a published
            standard. A draft standard, XLS-99, proposes rotation and recovery; on 2026-10-20 Mainnet,
            Testnet and Devnet did not know its amendment.
          </li>
          <li>
            <strong>The issuer can act without the holder&rsquo;s consent.</strong> If the token allows
            clawback, the issuer can destroy a holder&rsquo;s whole confidential balance; this
            project&rsquo;s tokens allow it. Unless the token&rsquo;s flags were made unchangeable when it
            was created, and this project&rsquo;s were not, the issuer can also turn on locking later and
            freeze balances. That second power was read in rippled&rsquo;s source, not run.
          </li>
          <li>
            <strong>Not audited.</strong> This is a research project on a test network. It is not
            audited, not production-ready (P-5) and not safe to put value behind.
          </li>
        </ul>
        <Sources>P-10, E-9, E-119, E-341, E-12, E-21, E-223, E-290, E-292, P-5</Sources>
      </Panel>

      <p className="text-xs opacity-60 mb-6">
        Each id under a panel, such as E-58, is a row in the project&rsquo;s claims register,{" "}
        <a className="underline" href={AT_BUILD("CLAIMS.md")}>CLAIMS.md</a>. Where this page and a
        row disagree, the row wins.
      </p>
    </>
  );
}

function Step({ n, where, tone, name, tx, children }: {
  n: string; where: string; tone: "public" | "hidden"; name: string; tx: string; children: ReactNode;
}) {
  const chip = tone === "hidden"
    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
    : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  return (
    <div className="rounded border border-black/10 dark:border-white/15 p-3 text-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-semibold">{n}. {where}: {name}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${chip}`}>amount {tone}</span>
      </div>
      <code className="text-[11px] opacity-60 break-all">{tx}</code>
      <p className="mt-2 leading-relaxed">{children}</p>
    </div>
  );
}

function Sources({ children }: { children: ReactNode }) {
  return <p className="text-xs opacity-60 mt-3">Sources: {children}</p>;
}
