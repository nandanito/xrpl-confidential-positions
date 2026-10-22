/**
 * The hosted demo's diagrams, at the owner's request of 2026-10-22.
 *
 * ⚠ **Markup, not images.** The policy's `style-src 'self'` refuses inline
 * styles, and a diagram drawn in markup reflows on a phone, follows dark mode,
 * and is text the gate reads like any other sentence. So every label is a
 * claim: each restates a sentence already on the page it sits on, or a row the
 * page cites. The words *decrypt* and *plaintext* are not used, for check 8b's
 * reason (see `routes/how-it-works.tsx`).
 *
 * ⚠ **No ledger value.** Only `/observer` and `/issuer` may render one (check
 * 8), and these diagrams render none on any page.
 */
import type { ReactNode } from "react";

type Tone = "public" | "hidden" | "issuer" | "plain" | "breaks";

const TONE: Record<Tone, string> = {
  public: "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100",
  hidden: "border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100",
  issuer: "border-violet-400 bg-violet-50 text-violet-950 dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-100",
  plain: "border-black/20 dark:border-white/25",
  // The site's warning red, as the custody page's own "breaks" uses.
  breaks: "border-[var(--color-warn)]",
};

const TONE_WORD: Record<Exclude<Tone, "plain" | "breaks">, string> = {
  public: "public",
  hidden: "hidden from the public",
  issuer: "the issuer can read it",
};

function Figure({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="my-4">
      {children}
      <figcaption className="text-xs opacity-70 mt-2">{caption}</figcaption>
    </figure>
  );
}

/** A box. `sub` is a short description; `field` is a ledger field name, set in code. */
function Node({ tone = "plain", title, sub, field, children, dashed = false }: {
  tone?: Tone; title: string; sub?: string; field?: string; children?: ReactNode; dashed?: boolean;
}) {
  return (
    <div className={`rounded-md border ${dashed ? "border-dashed" : ""} ${TONE[tone]} p-2 text-xs leading-snug`}>
      <div className="font-semibold">{title}</div>
      {field && <code className="block text-[10px] opacity-70 break-all mt-0.5">{field}</code>}
      {sub && <div className="text-[11px] opacity-80 mt-0.5">{sub}</div>}
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

/** An arrow with its label: across on a wide screen, down on a phone. */
function Edge({ label, tone, always }: { label: string; tone?: Tone; always?: "down" }) {
  const arrow = always === "down"
    ? <span aria-hidden="true">↓</span>
    : <><span aria-hidden="true" className="hidden sm:inline">→</span><span aria-hidden="true" className="sm:hidden">↓</span></>;
  return (
    <div className="flex sm:flex-col items-center justify-center gap-1 text-center text-[11px] leading-tight px-1">
      <span className="text-base opacity-70">{arrow}</span>
      <span className={tone && tone !== "plain" ? `rounded border px-1 ${TONE[tone]}` : "opacity-80"}>{label}</span>
    </div>
  );
}

function Down({ label, tone }: { label: string; tone?: Tone }) {
  return <Edge label={label} tone={tone} always="down" />;
}

export function Legend({ tones = ["public", "hidden", "issuer"] }: { tones?: Exclude<Tone, "plain" | "breaks">[] }) {
  return (
    <div className="flex flex-wrap gap-2 text-[11px] mt-1" aria-label="Key to the colours">
      {tones.map((t) => (
        <span key={t} className={`rounded border px-1.5 py-0.5 ${TONE[t]}`}>{TONE_WORD[t]}</span>
      ))}
    </div>
  );
}

/** Overview: where the line between public and hidden falls. */
export function PerimeterDiagram() {
  return (
    <Figure caption="Amounts are public where they cross into or out of confidential form, and hidden inside it. Who transacts with whom is public everywhere, and the issuer reads every balance.">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_2fr_auto_1fr] items-stretch">
        <Node tone="public" title="A public balance" sub="an ordinary MPT holding" />
        <Edge label="Convert: amount public" tone="public" />
        <Node tone="hidden" title="Confidential balances">
          <div className="flex items-center justify-center gap-1 my-1 text-[11px]">
            <span className="rounded border border-current px-1">holder A</span>
            <span aria-hidden="true">→</span>
            <span>Send</span>
            <span aria-hidden="true">→</span>
            <span className="rounded border border-current px-1">holder B</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>each holder&rsquo;s balance, unless it is a recognisable zero: a new balance, an inbox just merged, or a position clawed back</li>
            <li>the amount of each Send between holders</li>
          </ul>
        </Node>
        <Edge label="ConvertBack: amount public" tone="public" />
        <Node tone="public" title="A public balance" sub="an ordinary MPT holding" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 mt-2">
        <Node tone="public" title="Public everywhere">
          Who sends to whom, when and how often; the total held in confidential form.
        </Node>
        <Node tone="issuer" title="The issuer reads every confidential balance">
          So does an auditor, if the token names one. No setting turns this off.
        </Node>
      </div>
      <Legend />
    </Figure>
  );
}

/** Overview: how this site is made, and where signing happens instead. */
export function ThisSiteDiagram() {
  return (
    <Figure caption="This site is files built once from a Devnet snapshot. Nothing on it can sign; signing happens only in a separate program on a holder's own machine.">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch">
        <Node title="Devnet, a public node" sub="read once, when the site is built" />
        <Edge label="one snapshot" />
        <Node title="The build" sub="pages built offline, checked by the release gate" />
        <Edge label="static files" />
        <Node title="Vercel" sub="serves the files; runs none of this project's code" />
        <Edge label="your page load" />
        <Node title="Your browser" sub="requests only this site's own files" />
      </div>
      <div className="mt-2">
        <Node dashed title="Not part of this site, and not connected to it: wconf-signer, on the holder's own machine">
          Holds the keys, builds the proofs and signs. A web page cannot reach it.
        </Node>
      </div>
    </Figure>
  );
}

/** How it works: one position's journey, with the inbox. */
// ⚠ Placed cell by cell on a wide screen, so the Send leaves A's spending
// balance and lands in B's inbox on one row (`REVIEW-061` A-8). The DOM order
// is the phone order. The class names are literal so Tailwind generates them.
const AT: Record<string, string> = {
  "1/1": "sm:col-start-1 sm:row-start-1", "1/2": "sm:col-start-1 sm:row-start-2", "1/3": "sm:col-start-1 sm:row-start-3",
  "1/4": "sm:col-start-1 sm:row-start-4", "1/5": "sm:col-start-1 sm:row-start-5", "1/6": "sm:col-start-1 sm:row-start-6",
  "2/6": "sm:col-start-2 sm:row-start-6", "2/7": "sm:col-start-2 sm:row-start-7",
  "3/5": "sm:col-start-3 sm:row-start-5", "3/6": "sm:col-start-3 sm:row-start-6", "3/7": "sm:col-start-3 sm:row-start-7",
  "3/8": "sm:col-start-3 sm:row-start-8", "3/9": "sm:col-start-3 sm:row-start-9", "3/10": "sm:col-start-3 sm:row-start-10",
};

export function LifecycleDiagram() {
  const lane = "text-[11px] font-semibold opacity-80 self-end";
  return (
    <Figure caption="Holder A converts, merges and sends to holder B, who merges and converts back. Only the Send hides its amount.">
      <div className="grid gap-x-3 gap-y-1 sm:grid-cols-[1fr_13rem_1fr] items-center">
        <div className={`${lane} ${AT["1/1"]}`}>Holder A</div>
        <div className={AT["1/2"]}><Node tone="public" title="Public balance" /></div>
        <div className={AT["1/3"]}><Down label="Convert: amount public" tone="public" /></div>
        <div className={AT["1/4"]}><Node tone="hidden" title="Inbox" field="ConfidentialBalanceInbox" /></div>
        <div className={AT["1/5"]}><Down label="MergeInbox" /></div>
        <div className={AT["1/6"]}><Node tone="hidden" title="Spending balance" field="ConfidentialBalanceSpending" /></div>
        <div className={AT["2/6"]}><Edge label="Send to holder B: amount hidden; A and B public" tone="hidden" /></div>
        <div className={AT["2/7"]}>
          <Node dashed title="Note: the Send carries">
            the amount encrypted for the sender, the receiver, the issuer and any auditor, and proofs every validator checks
          </Node>
        </div>
        <div className={`${lane} ${AT["3/5"]}`}>Holder B</div>
        <div className={AT["3/6"]}><Node tone="hidden" title="Inbox" field="ConfidentialBalanceInbox" /></div>
        <div className={AT["3/7"]}><Down label="MergeInbox" /></div>
        <div className={AT["3/8"]}><Node tone="hidden" title="Spending balance" field="ConfidentialBalanceSpending" /></div>
        <div className={AT["3/9"]}><Down label="ConvertBack: amount public" tone="public" /></div>
        <div className={AT["3/10"]}><Node tone="public" title="Public balance" /></div>
      </div>
      <Legend tones={["public", "hidden"]} />
      <p className="text-[11px] opacity-80 mt-1">
        Green is hidden from the public, not from the issuer: the issuer can read every green box, and so can an auditor if the token names one.
      </p>
    </Figure>
  );
}

// ⚠ Neutral on purpose: elsewhere green means "hidden from the public" and amber
// "public", so a green "yes" here would say the opposite of what it means.
const YES = "border-black/25 dark:border-white/30 font-semibold";
const NO = "border-black/10 dark:border-white/15 opacity-60";
const PART = "border-black/25 dark:border-white/30 border-dashed";

/** How it works: who can read what, and who can spend. The walkthrough's §4 table, made general. */
export function WhoSeesWhatDiagram() {
  const cols = ["Who sends to whom, and when", "Amounts converted in or out", "Total held in confidential form", "A holder's balance", "A Send's amount", "Can spend a balance"];
  const rows: [string, [string, string][]][] = [
    ["Anyone", [["yes", YES], ["yes", YES], ["yes", YES], ["only whether it is a recognisable zero", PART], ["no", NO], ["no", NO]]],
    ["A holder", [["yes", YES], ["yes", YES], ["yes", YES], ["their own; others only as a recognisable zero", PART], ["their own only", PART], ["their own, with both their keys", PART]]],
    ["The issuer", [["yes", YES], ["yes", YES], ["yes", YES], ["every one", YES], ["every one", YES], ["no; it can destroy one if the token allows clawback, and may freeze one", NO]]],
    ["An auditor, if the token names one", [["yes", YES], ["yes", YES], ["yes", YES], ["every one", YES], ["every one", YES], ["no", NO]]],
  ];
  return (
    <Figure caption="Who can read what, and who can spend. A dashed cell is a partial yes. A recognisable zero is a new balance, an inbox just merged, or a position clawed back.">
      {/* A table on a wide screen; on a phone each row becomes a card, so no column is off screen (REVIEW-061 A-10). */}
      <div className="hidden sm:block">
        <table className="w-full text-[11px] leading-snug border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-left font-semibold align-bottom p-1">who</th>
              {cols.map((c) => <th key={c} className="text-left font-semibold align-bottom p-1">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([who, cells]) => (
              <tr key={who}>
                <th className="text-left font-semibold align-top p-1">{who}</th>
                {cells.map(([t, cls], i) => <td key={i} className={`rounded border p-1 align-top ${cls}`}>{t}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-2">
        {rows.map(([who, cells]) => (
          <div key={who} className="rounded-md border border-black/20 dark:border-white/25 p-2 text-[11px]">
            <div className="font-semibold mb-1">{who}</div>
            <dl className="grid grid-cols-[1fr_1fr] gap-1">
              {cells.map(([t, cls], i) => (
                <div key={i} className="contents">
                  <dt className="opacity-80">{cols[i]}</dt>
                  <dd className={`rounded border px-1 ${cls}`}>{t}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Figure>
  );
}

/** How it works: the receivables facility, as it ran. */
export function FacilityDiagram() {
  return (
    <Figure caption="The facility as it ran on Devnet. The bank issues the token and so reads every balance; the amounts that move between the Dedicated Account and the suppliers are hidden, and the amounts at the edges are not.">
      <div className="space-y-1 max-w-xl mx-auto">
        <Node tone="issuer" title="The bank" sub="issues the token; reads every balance" />
        <Down label="funds it: amount public" tone="public" />
        <Node title="The Dedicated Account" sub="an ordinary XRPL account that holds the float, the money the facility advances to suppliers" />
        <Down label="one Convert: the whole float, amount public" tone="public" />
        <Node tone="hidden" title="The float, now confidential, in the Dedicated Account" />
        <div className="grid grid-cols-2 gap-1">
          <Down label="drawdowns: Sends to suppliers" tone="hidden" />
          <div className="flex items-center justify-center gap-1 text-center text-[11px] leading-tight px-1">
            <span className="text-base opacity-70" aria-hidden="true">↑</span>
            <span className={`rounded border px-1 ${TONE.hidden}`}>repayments: Sends back</span>
          </div>
        </div>
        <div className="text-[11px] opacity-80 text-center">Amounts hidden; who and when public.</div>
        <div className="grid grid-cols-3 gap-1">
          {["A", "B", "C"].map((s) => (
            <Node key={s} tone="hidden" title={`Supplier ${s}`} sub="limit, draws and what it owes are hidden" />
          ))}
        </div>
        <div className="text-[11px] opacity-80 text-center">Each supplier enrols with a small public payment and its own Convert: both amounts public.</div>
        <div className="grid gap-1 sm:grid-cols-[1fr_auto_1fr] items-center pt-2">
          <Node tone="hidden" title="At the end: the float left in the Dedicated Account" />
          <Edge label="retired in tranches: each ConvertBack's amount public" tone="public" />
          <Node tone="public" title="A public balance again" />
        </div>
      </div>
      <Legend />
    </Figure>
  );
}

/** How it works: the project on a holder's machine. README, "How it fits together". */
export function LocalArchitectureDiagram() {
  const row = "grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch";
  const lane = "text-[11px] font-semibold opacity-80 mb-1";
  return (
    <Figure caption="The project as it runs on one machine. In the demonstration one driver plays every party and holds every seed; that is a property of the demonstration, not of the design.">
      <div className="space-y-3">
        <div>
          <div className={lane}>Viewing</div>
          <div className={row}>
            <Node title="The local web page" sub="web/app, in the browser" />
            <Edge label="HTTP" />
            <Node title="The read-only API" sub="web/api, on loopback only" />
            <Edge label="socket: Status only" />
            <Node tone="hidden" title="wconf-signer, the same program as below" sub="answers Status, which carries no authority" />
          </div>
        </div>
        <div>
          <div className={lane}>Transacting</div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_2fr] items-stretch">
            <Node title="The facility driver" sub="facility/, plays the bank and every supplier" />
            <Edge label="socket: Pair opens a grant, then Prepare asks for one transaction" />
            <Node tone="hidden" title="wconf-signer, one per party" sub="holds the ElGamal key and the account key">
              builds the proofs, shows the transaction in its own window, signs, and returns the signed bytes to the driver. It never submits.
            </Node>
          </div>
        </div>
        <div>
          <div className={lane}>Submitting</div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_2fr] items-stretch">
            <Node title="The facility driver" sub="with the signed bytes" />
            <Edge label="submits, with fail_hard on its movements" />
            <Node tone="public" title="Devnet" sub="fail_hard asks that a failing transaction be discarded rather than applied" />
          </div>
        </div>
      </div>
      <div className="text-[11px] opacity-80 mt-2">
        The API and the signer read the ledger. A web page cannot open the signer&rsquo;s socket, so a script injected into one can reach Status at most.
      </div>
    </Figure>
  );
}

/** Observer and issuer pages: one position, field by field. */
export function PositionAnatomyDiagram({ focus }: { focus: "observer" | "issuer" }) {
  const ring = (on: boolean) => (on ? "ring-2 ring-offset-1 ring-violet-400 dark:ring-offset-black rounded-md" : "");
  return (
    <Figure caption={focus === "issuer"
      ? "One confidential position on the ledger. The issuer's copy sits beside the holder's own, encrypted to the issuer's key; the next panels show that each copy is there, never the figure."
      : "One confidential position on the ledger, and what an observer can tell from each field. The panels below read these fields for four test accounts."}>
      <div className="grid gap-2 sm:grid-cols-2">
        <Node tone="public" title="Public balance" field="MPTAmount">an ordinary amount anyone can read</Node>
        <Node tone="public" title="The holder's encryption key" field="HolderEncryptionKey">public once registered, and never changeable</Node>
        <Node tone="hidden" title="Spending balance, encrypted to the holder" field="ConfidentialBalanceSpending">value hidden, unless it is the recognisable zero</Node>
        <Node tone="hidden" title="Inbox, encrypted to the holder" field="ConfidentialBalanceInbox">value hidden, unless it is the recognisable zero</Node>
        <div className={ring(focus === "issuer")}>
          <Node tone="issuer" title="The issuer's copy, encrypted to the issuer" field="IssuerEncryptedBalance">kept beside every confidential balance; the issuer can read it</Node>
        </div>
        {/* ⚠ Not violet: violet says the issuer can read it, and this copy is under the auditor's key (REVIEW-061 A-7). */}
        <Node title="The auditor's copy, if the token names an auditor" field="AuditorEncryptedBalance">encrypted to the auditor; the auditor can read it</Node>
        <Node tone="public" title="Version counter" field="ConfidentialBalanceVersion">counts changes to the balance, publicly</Node>
        <Node tone="public" title="On the token: the total held in confidential form" field="ConfidentialOutstandingAmount">public</Node>
      </div>
      <Legend />
    </Figure>
  );
}

/** Who can do what, and wallets: the two keys, and which transactions need both. */
export function TwoKeysDiagram({ wallet = false }: { wallet?: boolean }) {
  const row = "grid gap-2 sm:grid-cols-[1fr_12rem_1.4fr] items-center";
  return (
    <Figure caption={wallet
      ? "A Send, a ConvertBack and the first Convert, which registers the key, need both keys; a MergeInbox or a later Convert needs only the account key. The wallets examined supply only the account key, so a page cannot assemble the first three through them."
      : "A Send, a ConvertBack and the first Convert, which registers the key, need both keys: the proof comes from the ElGamal key and the signature from the account key. A MergeInbox or a later Convert needs only the account key."}>
      <div className="space-y-2">
        <div className={row}>
          <Node title="The master seed" sub="what an XRPL wallet keeps" />
          <Edge label="XRPL's own derivation" />
          <Node title="The account key" sub="signs, while the master key controls the account; with a regular key or a signer list, signing authority may sit elsewhere">
            {wallet && <span>A browser wallet holds this one.</span>}
          </Node>
        </div>
        <div className={row}>
          <Node title="The master seed" sub="the same seed" />
          <Edge label="this project's derivation, not a published standard" />
          <Node tone="hidden" title="The ElGamal key" sub="reads the holder's balances; builds the proofs">
            {wallet && <span>None of the wallets examined on 2026-08-28 keeps it or gives it to a page.</span>}
          </Node>
        </div>
      </div>
      <div className="mt-2">
        <Node dashed title="Or a standalone ElGamal key, kept separately">Two secrets to keep instead of one.</Node>
      </div>
    </Figure>
  );
}

/** Custody: the page's two findings, as the simulation models them. */
export function CustodyDiagram() {
  return (
    <Figure caption="The simulation's two findings. A platform that ran the derivation inside its own boundary would change the first; that needs the derivation published as a standard (issue #10), and it is not.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold opacity-80">1. Where the ElGamal key can come from</div>
          <Node title="The custody platform" sub="holds the seed and signs; never releases the seed" />
          <Down label="outside the platform" />
          <div className="grid grid-cols-2 gap-1">
            <Node tone="breaks" title="Derived key: breaks" sub="deriving it needs the seed" />
            <Node title="Standalone key: survives" sub="but something outside the platform then holds a permanent key to its balances" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-semibold opacity-80">2. What an approval policy can read</div>
          <Node title="An approval workflow" sub="holds only public data" />
          <Down label="reads the confidential transaction" />
          {/* ⚠ Not green: the proof is public; it is the amount the workflow cannot read (REVIEW-061 A-6). */}
          <Node title="It reads a proof, not an amount" sub="a rule like 'two approvers above $1M' has nothing to check" />
        </div>
      </div>
    </Figure>
  );
}
