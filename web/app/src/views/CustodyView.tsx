/**
 * The custody page, a simulation.
 *
 * ⚠ Rendered by the local tier's route and by the hosted build's route alike,
 * so the page has one body and the two cannot drift (`ADR-0004`; `CLAIMS.md`
 * E-141's shape is a second copy of one text).
 *
 * The capability matrix's custody row is not repeated here: the two findings
 * say the same thing, and the matrix page carries the row.
 */
import { Panel } from "../components/Verdict";

export function CustodyView({ sim }: { sim: { flows: any[] } }) {
  // A caveat that several flows share is printed once, numbered, and each flow points at it.
  const counts = new Map<string, number>();
  for (const f of sim.flows) for (const c of f.caveats as string[]) counts.set(c, (counts.get(c) ?? 0) + 1);
  const notes = [...counts].filter(([, n]) => n > 1).map(([c]) => c);
  return (
    <>
      <Panel title="This is a simulation" tone="warn">
        <p className="text-sm leading-relaxed">
          No custody platform is integrated behind this page: no MPC, no HSM, no Harmonize. It
          models a key-source shape, a standalone ElGamal key plus an external signer, to show which
          flows survive and which break.
        </p>
      </Panel>

      <Panel title="Two findings">
        <div className="text-sm space-y-5">
          <div>
            <h3 className="font-semibold mb-1">1. The derived key does not work with custodial key management</h3>
            <p className="opacity-85 leading-relaxed">
              The ElGamal secret is derived from the master seed, and a custody platform never releases
              the seed. So a custodied account cannot derive its own ElGamal key or read its own
              confidential balance.
            </p>
            <p className="opacity-85 leading-relaxed mt-2">
              A standalone ElGamal key gets around this, but then something outside the custody
              platform holds a permanent decryption key. Who that should be is an open question in
              this project (CLAIMS.md E-117).
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">2. Approval policies cannot read a confidential amount</h3>
            <p className="opacity-85 leading-relaxed">
              An approval workflow sees a proof, not a value, so a rule like <em>&ldquo;two approvers
              above $1M&rdquo;</em> has nothing to check. This is structural, not an integration
              detail: confidentiality and amount-based approval policies pull against each other.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Which flows survive, and which break">
        <p className="text-sm mb-2 opacity-80">
          Each flow lists what it needs, and the verdict is computed from what a custody-shaped key
          source has.
        </p>
        {notes.map((c, i) => (
          <p key={c} className="text-sm mb-2 opacity-80">Note {i + 1}: {c}</p>
        ))}
        <div className="mb-4" />
        <div className="space-y-3">
          {sim.flows.map((f: any) => (
            // ⚠ A class, not a `style` attribute: the hosted build's Content
            // Security Policy blocks inline style attributes (ADR-0004).
            <div key={f.id} className={`border-l-2 pl-3 ${f.survives ? "border-[var(--color-public)]" : "border-[var(--color-warn)]"}`}>
              <div className="text-sm font-medium">
                {f.survives ? "survives" : "breaks"}: {f.label}
                {notes.map((c, i) => (f.caveats.includes(c) ? <span key={c} className="font-normal opacity-70"> (note {i + 1})</span> : null))}
              </div>
              {f.blockedBy.map((b: any) => (
                <p key={b.requirement} className="text-xs opacity-80 mt-1">{b.because}</p>
              ))}
              {f.caveats.filter((c: string) => !notes.includes(c)).map((c: string) => (
                <p key={c} className="text-xs opacity-70 mt-1">{c}</p>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
