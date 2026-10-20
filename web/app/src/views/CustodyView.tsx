/**
 * The custody page, a simulation.
 *
 * ⚠ Rendered by the local tier's route and by the hosted build's route alike,
 * so the page has one body and the two cannot drift (`ADR-0004`; `CLAIMS.md`
 * E-141's shape is a second copy of one text).
 */
import { Panel, Verdict } from "../components/Verdict";

export function CustodyView({ caps, sim }: { caps: { rows: any[] }; sim: { flows: any[] } }) {
  const { rows } = caps;
  const row = rows.find((r: any) => r.id === "custody-simulated");

  return (
    <>
      <Panel title="⚠ This is a simulation" tone="warn">
        <p className="text-sm leading-relaxed">
          There is no integration with any custody platform behind this page. No MPC, no HSM, no
          Harmonize. What is modelled is a <strong>key-source shape</strong> — a standalone ElGamal
          key plus an external signer — so that the flows which survive and the flows which break
          can be shown rather than described.
        </p>
        <p className="text-xs opacity-60 mt-3">
          CLAIMS.md P-5 forbids claiming more than is delivered. “Custody-compatible” over a stub is
          exactly that kind of claim.
        </p>
      </Panel>

      <Panel title="The two findings that matter for capital markets">
        <div className="text-sm space-y-5">
          <div>
            <h3 className="font-semibold mb-1">1. The ruled key derivation is incompatible with custodial key management</h3>
            <p className="opacity-85 leading-relaxed">
              The ElGamal secret is derived from the master seed. A custody platform’s entire purpose
              is never to release seed material. So a custodied account <strong>cannot derive its own
              viewing key</strong> — it cannot read its own confidential balance.
            </p>
            <p className="opacity-85 leading-relaxed mt-2">
              The escape is a standalone ElGamal key, which moves the question rather than answering
              it: something now holds a permanent decryption credential outside the custody boundary.
              That is an open, unreviewed item in this project.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">2. A policy engine cannot enforce an amount limit on a confidential amount by reading it</h3>
            <p className="opacity-85 leading-relaxed">
              Approval workflows see a proof, not a value. <em>“Require two approvers above $1M”</em>
              is unevaluable on a confidential send — the amount is exactly what has been hidden.
            </p>
            <p className="opacity-85 leading-relaxed mt-2">
              This is structural, not an integration detail: confidentiality and policy-based custody
              controls are in direct tension, and choosing one constrains the other.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="What a custody-shaped key source can and cannot do">
        <div className="text-sm space-y-3">
          {[
            ["Decrypt own balance", row.decryptOwnBalance],
            ["Prove + sign confidential", row.proveAndSign],
            ["Public transactions", row.publicTransactions],
          ].map(([label, cap]: any) => (
            <div key={label} className="flex gap-3 items-start">
              <Verdict v={cap.verdict} />
              <div>
                <div className="font-medium">{label}</div>
                <p className="opacity-80">{cap.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Which flows survive, and which break">
        <p className="text-sm mb-4 opacity-80">
          Each flow declares the capabilities it needs; the verdict is computed from what a
          custody-shaped key source actually has. A flow added later cannot be quietly marked as
          working.
        </p>
        <div className="space-y-3">
          {sim.flows.map((f: any) => (
            // ⚠ A class, not a `style` attribute: the hosted build's Content
            // Security Policy blocks inline style attributes (ADR-0004).
            <div key={f.id} className={`border-l-2 pl-3 ${f.survives ? "border-[var(--color-public)]" : "border-[var(--color-warn)]"}`}>
              <div className="text-sm font-medium">
                {f.survives ? "survives" : "breaks"} — {f.label}
              </div>
              {f.blockedBy.map((b: any) => (
                <p key={b.requirement} className="text-xs opacity-80 mt-1">
                  <code className="mr-1">{b.requirement}</code>{b.because}
                </p>
              ))}
              {f.caveats.map((c: string) => (
                <p key={c} className="text-xs opacity-70 mt-1">{c}</p>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="One more thing a custody client would reasonably assume, and should not">
        <p className="text-sm leading-relaxed">
          Retiring a position in tranches publishes <strong>every tranche size</strong>. The amount
          field on each exit transaction is plaintext, so the sizes and their timing are public even
          though the balance was not.
        </p>
        <p className="text-xs opacity-60 mt-3">CLAIMS.md F-24.</p>
      </Panel>
    </>
  );
}
