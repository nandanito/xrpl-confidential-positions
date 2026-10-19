import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../components/Verdict";

export const Route = createFileRoute("/api-doc")({ component: ApiDoc });

const ENDPOINTS = [
  ["GET /api/meta", "What the tier is and what it never claims."],
  ["GET /api/signer", "Signer-local status. The one socket call this tier can make."],
  ["GET /api/source", "The ledger source, disclosed — endpoint, network, and whether it is loopback."],
  ["GET /api/observer/:account/:issuanceId", "What a full-ledger observer sees."],
  ["GET /api/issuer/:account/:issuanceId", "What the issuer sees — read from a file a CLI tool wrote. ⚠ This process holds no key and decrypts nothing."],
  ["GET /api/capabilities", "The capability matrix and its invariants."],
];

function ApiDoc() {
  return (
    <>
      <Panel title="Every endpoint is a GET, and that is the design">
        <p className="text-sm mb-4">
          There is no write path in this tier — not a disabled one, an absent one. The API cannot
          pair with the signer, cannot prepare a transaction, and holds no key.
        </p>
        <p className="text-sm mb-4">
          ⚠ It also performs no decryption. The issuer view reads results written by a command-line
          tool that holds the key; an earlier version decrypted on request, which made this an
          unauthenticated decryption oracle.
        </p>
        <table className="w-full text-sm">
          <tbody>
            {ENDPOINTS.map(([e, d]) => (
              <tr key={e} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2 pr-4 align-top"><code className="text-xs">{e}</code></td>
                <td className="py-2 opacity-80">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="How the boundary is enforced">
        <p className="text-sm leading-relaxed">
          The signer speaks a Unix domain socket, which no browser API can open. Only the API
          process may connect to it, and it may send one request type. A gate —
          <code className="mx-1">tools/check-web-readonly.ts</code>— asserts that nothing in the
          browser application names the socket, that the API constructs no request carrying
          authority, and that no route or loader reaches a signing operation.
        </p>
        <p className="text-xs opacity-60 mt-3">
          The gate is lexical and says so in its own output. It is a check over a named set, not a
          proof.
        </p>
      </Panel>
    </>
  );
}
