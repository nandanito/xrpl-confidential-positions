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
 * missing features. ⚠ They are scoped to the wallets examined, not to every
 * possible wallet (`CLAIMS.md` E-329, E-330).
 */
export function WalletView({ rows, namedGaps }: { rows: any[]; namedGaps: { walletCodec: string } }) {
  const wallet = rows.find((r: any) => r.id === "browser-wallet");

  return (
    <>
      <Panel title="A browser wallet cannot hold a confidential position">
        <p className="text-sm leading-relaxed mb-4">
          The three wallets examined (Xaman, GemWallet and Crossmark, on 2026-08-28) cannot, and the
          reasons are structural, not missing features. A wallet that kept the ElGamal key inside the
          extension and offered a prove-and-sign operation could; none of those examined does.
        </p>
        <ol className="text-sm space-y-3 list-decimal pl-5">
          <li>
            A confidential transaction needs two secrets: the ElGamal secret, to decrypt the balance
            and build the proof, and the XRPL account key, to sign. A wallet supplies only the second.
          </li>
          <li>
            Under the ruled key generation, the ElGamal secret is derived from the master seed. A
            derived-key account has no other way to get it.
          </li>
          <li>
            A wallet extension exists in order not to release seed material. That is the product, not
            a gap in its API.
          </li>
        </ol>
        <p className="text-sm mt-4">
          So a page cannot assemble the transaction through these wallets. They are not refusing a
          permission; they hold nothing they are built to give a page.
        </p>
      </Panel>

      <Panel title="What a wallet can do">
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
                Enough to show that account&rsquo;s observer view, which anyone with the address can
                read anyway.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="What this page does not claim" tone="warn">
        <p className="text-sm">{namedGaps.walletCodec}</p>
        <p className="text-xs opacity-60 mt-3">CLAIMS.md E-206.</p>
      </Panel>
    </>
  );
}
