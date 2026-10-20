import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { SNAPSHOT } from "../data";
import { AbsentReading, AccountHeading, LedgerReading } from "../LedgerReading";

export const Route = createFileRoute("/issuer")({ component: Issuer });

/**
 * What the issuer can read, without the figure: `ADR-0004` D-H3, ruled A
 * (`CLAIMS.md` E-331).
 *
 * ⚠ **Every value here is a ledger reading.** The page shows that each
 * holder's `IssuerEncryptedBalance` is on the ledger and the issuance key the
 * protocol encrypts it under. It does not show a decrypted balance: E-241's
 * reasoning holds with more force on a public page, because a figure no visitor
 * can check is a claim with no falsifier.
 */
function Issuer() {
  const iss = SNAPSHOT.issuance;
  return (
    <>
      <Panel title="A holder is never private from the issuer" tone="warn">
        <p className="text-sm leading-relaxed">
          The issuer&rsquo;s decryption mirror is part of the protocol. No configuration removes it, and
          no key source changes it. Every confidential balance also carries an
          {" "}<code>IssuerEncryptedBalance</code>, and the issuer&rsquo;s secret key decrypts it.
        </p>
        <p className="text-xs opacity-60 mt-3">CLAIMS.md P-9.</p>
      </Panel>

      <LedgerReading />

      <Panel title="The issuance">
        {iss.exists ? (
          <div className="text-sm space-y-1">
            <div><span className="opacity-60">MPTokenIssuanceID</span> <code className="break-all" data-ledger-value="">{iss.id}</code></div>
            <div><span className="opacity-60">issuer</span> <code data-ledger-value="">{iss.issuer}</code></div>
            <div>
              <span className="opacity-60">IssuerEncryptionKey</span>{" "}
              <code className="text-[10px] break-all" data-ledger-value="">{iss.issuerEncryptionKey ?? "absent"}</code>
            </div>
          </div>
        ) : (
          <AbsentReading state="issuance-missing" />
        )}
      </Panel>

      {SNAPSHOT.accounts.map((a) => (
        <Panel key={a.address} title={`Issuer's copy: ${a.label}`}>
          <AccountHeading label={a.label} address={a.address} note={a.note} />
          {a.state === "present" && a.issuerMirror ? (
            a.issuerMirror.present ? (
              <div className="text-sm space-y-2">
                <div>
                  <span className="opacity-60">IssuerEncryptedBalance</span>{" "}
                  <code className="text-[10px] break-all block my-1 opacity-80" data-ledger-value="">{a.issuerMirror.ciphertext}</code>
                </div>
                <p>
                  Present. XLS-0096 encrypts this copy under the issuance&rsquo;s{" "}
                  <code>IssuerEncryptionKey</code> above, so the issuer can always decrypt it (P-9). It is
                  a different ciphertext from the holder&rsquo;s own spending balance.
                </p>
                <p className="opacity-70">
                  This page does not show the figure. Nothing a visitor can run would show that a
                  published figure was true, so this project does not publish one (ADR-0004 D-H3).
                </p>
              </div>
            ) : (
              <p className="text-sm" data-ledger-value="">
                At validated ledger {SNAPSHOT.source.ledgerIndex} this position carries no
                {" "}<code>IssuerEncryptedBalance</code>.
              </p>
            )
          ) : (
            <AbsentReading state={a.state} />
          )}
        </Panel>
      ))}
    </>
  );
}
