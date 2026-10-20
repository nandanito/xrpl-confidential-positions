/**
 * The wallet page: prove-and-contrast.
 *
 * ⚠ Rendered by the local tier's route and by the hosted build's route alike,
 * so the page has one body and the two cannot drift (`ADR-0004`; `CLAIMS.md`
 * E-141's shape is a second copy of one text).
 */
import { Panel, Verdict } from "../components/Verdict";

/**
 * Prove-and-contrast. ⚠ The contrast is the lesson: a browser wallet cannot
 * hold a confidential position, and the reasons are structural rather than
 * missing features.
 */
export function WalletView({ rows, namedGaps }: { rows: any[]; namedGaps: { walletCodec: string } }) {
  const wallet = rows.find((r: any) => r.id === "browser-wallet");

  return (
    <>
      <Panel title="A browser wallet cannot hold a confidential position">
        <p className="text-sm leading-relaxed mb-4">
          This is not a feature gap in the three wallet APIs examined (Xaman, GemWallet,
          Crossmark, checked 2026-08-28). ⚠ It is <em>not</em> a claim that no wallet API
          could ever close it — an extension that derived or held an ElGamal key internally,
          and exposed a prove-and-sign operation without exporting seed material, would.
          Nothing observed does. Three reasons, each structural to the design as it stands:
        </p>
        <ol className="text-sm space-y-3 list-decimal pl-5">
          <li>
            A confidential operation needs <strong>two</strong> secrets — the ElGamal secret, to
            decrypt the balance and produce the proof, and the XRPL account key, to sign. A wallet
            supplies the second.
          </li>
          <li>
            Under the ruled key generation, the ElGamal secret is <strong>derived from the master
            seed</strong>. There is no other way to obtain it for a derived-key account.
          </li>
          <li>
            A wallet extension exists <strong>in order not to release seed material</strong>. That is
            the product, not a limitation of its API.
          </li>
        </ol>
        <p className="text-sm mt-4">
          So a page cannot assemble the operation through the wallets examined. They are not
          denying a permission: they hold nothing they are built to release to a page.
        </p>
      </Panel>

      <Panel title="What a wallet CAN do">
        <div className="text-sm space-y-3">
          <div className="flex gap-3 items-start">
            <Verdict v={wallet.publicTransactions.verdict} />
            <div>
              <div className="font-medium">Ordinary XRPL transactions</div>
              <p className="opacity-80">{wallet.publicTransactions.detail}</p>
              <p className="text-xs opacity-50 mt-1">{wallet.publicTransactions.citation}</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Verdict v="yes" />
            <div>
              <div className="font-medium">Prove control of an account</div>
              <p className="opacity-80">
                Which is enough to show that account’s observer view — the same view anyone with the
                address can read.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="What this page does not claim" tone="warn">
        <p className="text-sm">{namedGaps.walletCodec}</p>
        <p className="text-xs opacity-60 mt-3">
          CLAIMS.md E-206. Recorded because an earlier draft of this project’s reasoning led with
          exactly this point, and it is a version fact an upstream release could close at any time.
          The three reasons above cannot be closed by a codec release. A wallet that held the
          viewing key and produced the proofs itself would close them, and none observed does.
        </p>
      </Panel>
    </>
  );
}
