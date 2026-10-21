/**
 * The footer: what built this page, and whether its gate passed (`ADR-0004`,
 * `REVIEW-058` S-8 and R2-3).
 *
 * ⚠ **The verdict cannot be compiled into the page it judges**, because the
 * gate runs over the finished output. The gate writes `/gate-verdict.json`
 * after it passes, listing a digest of every other file, and this component
 * reads it from the same host. A missing file renders as missing, never as a
 * pass.
 */
import { useEffect, useState } from "react";
import { SNAPSHOT } from "./data";

const REPO = "https://github.com/nandanito/xrpl-confidential-positions";

export function Footer() {
  const [verdict, setVerdict] = useState("not loaded (it is read from /gate-verdict.json once the page's script runs)");
  useEffect(() => {
    fetch("/gate-verdict.json", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((v: any) =>
        setVerdict(
          v?.verdict === "PASS"
            ? `PASS, ${v.files} files, output digest ${String(v.outputDigest).slice(0, 16)}…, checked ${v.checkedAt}`
            : `not a pass: ${JSON.stringify(v?.verdict ?? null)}`,
        ),
      )
      .catch((e) => setVerdict(`missing: no gate verdict was published with this build (${String(e)})`));
  }, []);
  const c = SNAPSHOT.commit;
  return (
    <footer className="mt-12 pt-6 border-t border-black/10 dark:border-white/15 text-xs opacity-70 space-y-1">
      <p>
        Built from commit <a className="underline" href={`${REPO}/commit/${c}`}><code>{c.slice(0, 12)}</code></a> of
        the public repository. Ledger values were read at validated ledger {SNAPSHOT.source.ledgerIndex} on{" "}
        {SNAPSHOT.readAt}.
      </p>
      <p>
        This page is published at <code>{SNAPSHOT.canonicalUrl}</code>. A copy hosted anywhere else
        is not this build.
      </p>
      <p>
        Gate verdict: <span data-gate-verdict="">{verdict}</span>{" "}
        (<a className="underline" href="/gate-verdict.json">gate-verdict.json</a>). This is the gate's record,
        published with the build; your browser shows it and does not check it against the files it loaded.
      </p>
      <p>
        Third-party licences for the code in these pages:{" "}
        <a className="underline" href="/third-party-licenses.txt">third-party-licenses.txt</a>
      </p>
    </footer>
  );
}
