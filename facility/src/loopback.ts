/**
 * loopback.ts — the facility's ONLY ledger read path.
 *
 * # Why this module exists, and why it refuses rather than warns
 *
 * `CLAIMS.md` **B-15**'s step-7 gate was ruled by the project owner on
 * 2026-08-25: **the facility's ledger reads go to loopback.** Not "should"; the
 * ruling is what opened architecture §6 step 7 at all, and `REVIEW-019` is
 * explicit that *"we ran a local node once" is not the property* — the property
 * is that **every** read the facility makes goes to a node the operator runs.
 *
 * What it is defending against is `CLAIMS.md` **F-23**, and F-23 is
 * **executed**, not reasoned. A `ConfidentialMPTSend` encrypts the amount to
 * the destination's `HolderEncryptionKey` and the issuer's
 * `IssuerEncryptionKey`, **both read from the ledger**. A substituted key fails
 * the proof with `tecBAD_PROOF` — and a `tec` is *applied to the ledger* with
 * every ciphertext in it. On 2026-08-19 that was run on Devnet and the amount
 * **42 was recovered from public ledger data by the party who supplied the
 * wrong key**, while the intended destination could not decrypt it.
 *
 * So a lying ledger source does not cost a transaction. It costs the
 * confidentiality of the amount, permanently, in public. **TLS does not address
 * it** — TLS authenticates the channel to a node the operator chose, and a
 * hostile node lies just as well over TLS.
 *
 * # ⚠ What this module does NOT buy
 *
 * Nothing about the same-host adversary the issue #1 ruling put in scope. That
 * adversary can point this at a different endpoint, or edit the local node's
 * answers. The trust boundary is unchanged and `CLAIMS.md` P-5 still forbids
 * calling any of this secure.
 *
 * # Stricter than the signer, deliberately
 *
 * `signer/src/ledger.rs` accepts the *name* `localhost` as loopback. This
 * accepts only an **address**, never a name, because a name is resolved by
 * something this process does not control and there is no cost to requiring
 * the address. `REVIEW-016` found the hosts `127.attacker.example` and
 * `127.0.0.1@attacker.example` walking through the Rust check that exists
 * *because of* F-23. Those two shapes are negative test inputs in
 * `facility/tests/loopback.test.ts` — written there rather than quoted here, so
 * that they are executed rather than described.
 *
 * ⚠ **"Address" means what `URL` canonicalises to, and that is wider than a
 * dotted quad.** WHATWG `URL` folds `2130706433`, `0177.0.0.1`, `0x7f.1`,
 * `127.1`, a trailing dot and even Unicode digit forms all to `127.0.0.1`
 * before this check ever sees them, so **all of those are ACCEPTED** — and
 * correctly, because every one of them genuinely is loopback. An earlier
 * version of this comment said *"only a dotted-quad literal"* and the session's
 * own review leg then asserted those forms were **refused**, from reasoning
 * rather than from running them. `REVIEW-022`'s Codex leg ran them.
 * `facility/tests/loopback.test.ts` now pins them as accepted, so that a later
 * session cannot "tighten" the check into rejecting real loopback addresses.
 *
 * # ⚠ Redirects are refused, because a redirect is the whole check undone
 *
 * `fetch` follows redirects by default. A loopback endpoint answering `307`
 * could forward the POST — and every one after it — to a remote host, and
 * `LoopbackLedger.open`'s check would have passed on the original URL.
 * `signer/src/ledger.rs` sets `max_redirects(0)` for exactly this reason and
 * this file did not until `REVIEW-022`'s Codex leg found it.
 */

// ---------------------------------------------------------------------------
// The escape hatch, and everything about it is deliberate.
// ---------------------------------------------------------------------------

/**
 * The exact string `WCONF_ACCEPT_REMOTE_LEDGER_RISK` must hold before this
 * module will read a ledger anywhere but loopback.
 *
 * ⚠ **It is a sentence, not a `1`, and that is the point.** A flag that can be
 * set by muscle memory is a flag that gets set by muscle memory. Somebody has
 * to type this, and typing it is the acknowledgement.
 *
 * ⚠ **This does not make a remote endpoint safe. It makes it RECORDED.**
 * `CLAIMS.md` F-23 is executed: on 2026-08-19 an amount was recovered from
 * public ledger data by the party who supplied a wrong key. Nothing here
 * changes that; what changes is that a run which accepted the risk says so, in
 * its output and in its own run record.
 */
export const RISK_ACCEPTANCE_PHRASE =
  "I accept CLAIMS.md F-23: a lying ledger source publishes the amount";

/**
 * Printed to stderr, in full, on every run that uses the hatch.
 *
 * ⚠ **A constant with an asserted wording**, because `CLAIMS.md` E-126 records
 * that the one disclosure surface which was not a constant is where a false
 * sentence lived through a whole round of review — and `REVIEW-022` then found
 * this file's sibling citing a wording test that did not exist. This one has
 * `facility/tests/risk-acceptance.test.ts`.
 */
export const REMOTE_LEDGER_DISCLOSURE = [
  "⚠ THIS RUN IS NOT UNDER B-15's STEP-7 CONDITIONS.",
  "",
  "  The facility's ledger source is REMOTE and is trusted for amount",
  "  confidentiality. CLAIMS.md F-23 is EXECUTED, not theoretical: a source that",
  "  lies about a destination's HolderEncryptionKey makes the signer publish the",
  "  amount encrypted under the liar's key, permanently, in public. TLS does not",
  "  address it — it authenticates the channel to a node someone chose.",
  "",
  "  B-15's step-7 answer was AMENDED by the project owner on 2026-08-25 to",
  "  extend REVIEW-019's named risk acceptance to this demo. That amendment, like",
  "  the ruling it amends, has had NO adversarial review.",
  "",
  "  What a run under this hatch CAN establish: that the transactions serialise,",
  "  that rippled accepts them, that the balances decrypt to what the book",
  "  predicts, and what a full-ledger observer sees.",
  "",
  "  ⚠ It does NOT establish XLS-0096 §10.5's state changes. This sentence said it",
  "  did, while run-facility.ts's own header said it did not — REVIEW-023 found the",
  "  pair. The driver checks the outstanding-amount delta on the float conversion",
  "  and reconciles decrypted balances; there are no per-movement assertions over",
  "  the public amount or the balance version. CLAIMS.md B-18.",
  "",
  "  What it CANNOT establish: anything whatever about the loopback obligation.",
  "  Do not record a run under this hatch as evidence that the facility keeps it.",
].join("\n");

/** A read or a check that must stop the facility, distinct from a bug. */
export class LedgerRefusal extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "LedgerRefusal";
  }
}

/**
 * Is this endpoint a loopback literal?
 *
 * Parsing is delegated to `URL`, which is what strips userinfo (`user@host`)
 * and rejects an unterminated `[::1`. A hand-rolled split on `@`, `:` or `]`
 * is exactly how the Rust version acquired two holes.
 */
export function isLoopbackEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return false;
  // `URL.hostname` is the host with userinfo removed and IPv6 brackets kept.
  const host = url.hostname.toLowerCase();
  if (host === "[::1]") return true;
  // Only a dotted-quad literal in 127.0.0.0/8. A name — `localhost` included —
  // is resolved by something outside this process.
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const octets = m.slice(1).map(Number);
  if (octets.some((o) => o > 255)) return false;
  return octets[0] === 127;
}

/** The fields a facility read needs from one holder's `MPToken`. */
export interface MPTokenState {
  /** Public, plaintext MPT balance. Absent means zero. */
  publicAmount: number;
  /**
   * ⚠ **The same value as a DECIMAL STRING, losslessly.**
   * `MPTAmount` is a UINT64 and rippled serialises it as a string for that
   * reason; `publicAmount` above rounds anything over 2^53. The number is kept
   * because the facility does arithmetic on it and its values are small; **any
   * surface that DISPLAYS the amount must use this field** (`CLAIMS.md` E-220,
   * the same defect E-215 fixed on the issuer path and missed here).
   */
  publicAmountRaw: string;
  /** 33-byte compressed ElGamal point, hex — absent until the holder Converts. */
  holderEncryptionKey?: string;
  confidentialBalanceSpending?: string;
  confidentialBalanceInbox?: string;
  /** Present as a JSON **string** when non-zero, absent when zero. */
  confidentialBalanceVersion: number;
  /**
   * ⚠ **The issuer's mandatory decryption mirror.** `CLAIMS.md` P-9: no
   * configuration removes it, so this field is present on every confidential
   * balance and the issuer's ElGamal secret decrypts it.
   *
   * ⚠ **It is a DIFFERENT ciphertext from `confidentialBalanceSpending`, and
   * assuming otherwise costs an afternoon** — measured 2026-08-28: the issuer
   * key against the holder's spending ciphertext returns `rc=-1` from `mptool
   * decrypt`, and against this field returns the balance.
   *
   * Added 2026-08-28 for architecture §6 step 8's issuer view. The facility
   * never read it: it reconciles each party's OWN balance with that party's own
   * key, which is a different question from what the issuer can see.
   */
  issuerEncryptedBalance?: string;
  /** The optional auditor's mirror, present only if an auditor was named. */
  auditorEncryptedBalance?: string;
}

export interface IssuanceState {
  issuer: string;
  /** ⚠ rippled serialises every `UINT64` as a JSON **string**. */
  confidentialOutstandingAmount: number;
  /** ⚠ The same value as a decimal string, losslessly. See `publicAmountRaw`. */
  confidentialOutstandingAmountRaw: string;
  issuerEncryptionKey?: string;
  auditorEncryptionKey?: string;
  transferFee: number;
  flags: number;
}

/**
 * A pinned read.
 *
 * Two `"validated"` reads seconds apart land in **different ledgers** — E-103
 * observed it live against the public cluster. The index is taken once and
 * every later call carries that number, and every answer is checked to have
 * come from it. That check is the part `REVIEW-016` found *"asked for and never
 * checked"* in the Rust version.
 */
export class Snapshot {
  constructor(
    private readonly ledger: LoopbackLedger,
    readonly index: number,
  ) {}

  private async pinned(method: string, params: Record<string, unknown>): Promise<any> {
    const result = await this.ledger.call(method, { ...params, ledger_index: this.index });
    const answered = Number(result.ledger_index ?? result.ledger_current_index ?? NaN);
    if (answered !== this.index) {
      throw new LedgerRefusal(
        "REFUSED_LEDGER_TORN",
        `${method} answered from ledger ${answered}, not the pinned ${this.index}. ` +
          `A snapshot assembled from two ledgers is a state that never existed`,
      );
    }
    return result;
  }

  async sequenceOf(address: string): Promise<number> {
    const r = await this.pinned("account_info", { account: address });
    return Number(r.account_data.Sequence);
  }

  /** Every field of one holder's position, or `null` if they hold no MPToken. */
  async mptoken(address: string, issuanceId: string): Promise<MPTokenState | null> {
    let r: any;
    try {
      r = await this.pinned("ledger_entry", {
        mptoken: { mpt_issuance_id: issuanceId, account: address },
      });
    } catch (e) {
      if (e instanceof LedgerRefusal && e.code === "REFUSED_LEDGER_ENTRY_MISSING") return null;
      throw e;
    }
    const n = r.node;
    return {
      publicAmount: Number(n.MPTAmount ?? 0),
      publicAmountRaw: String(n.MPTAmount ?? "0"),
      holderEncryptionKey: n.HolderEncryptionKey,
      confidentialBalanceSpending: n.ConfidentialBalanceSpending,
      confidentialBalanceInbox: n.ConfidentialBalanceInbox,
      confidentialBalanceVersion: Number(n.ConfidentialBalanceVersion ?? 0),
      issuerEncryptedBalance: n.IssuerEncryptedBalance,
      auditorEncryptedBalance: n.AuditorEncryptedBalance,
    };
  }

  async issuance(issuanceId: string): Promise<IssuanceState> {
    const r = await this.pinned("ledger_entry", { mpt_issuance: issuanceId });
    const n = r.node;
    return {
      issuer: n.Issuer,
      // ⚠ **A JSON string, as rippled serialises every `UINT64`.** Reading it
      // with a numeric helper sees every value as absent, and a preflight check
      // that always passes looks identical to one that works. The signer has a
      // control test for exactly this; so does `facility/tests`.
      confidentialOutstandingAmount: Number(n.ConfidentialOutstandingAmount ?? 0),
      confidentialOutstandingAmountRaw: String(n.ConfidentialOutstandingAmount ?? "0"),
      issuerEncryptionKey: n.IssuerEncryptionKey,
      auditorEncryptionKey: n.AuditorEncryptionKey,
      transferFee: Number(n.TransferFee ?? 0),
      flags: Number(n.Flags ?? 0),
    };
  }
}

export interface NodeIdentity {
  buildVersion: string;
  gitHash?: string;
  networkId: number;
  serverState: string;
  validatedIndex: number;
  /** Whether the endpoint is a loopback address. */
  isLoopback: boolean;
}

/** Devnet, and nothing else. `CLAUDE.md`'s hard rule, checked before any read. */
const DEVNET_NETWORK_ID = 2;

export class LoopbackLedger {
  private constructor(
    readonly endpoint: string,
    readonly identity: NodeIdentity,
  ) {}

  /**
   * Open the facility's ledger source.
   *
   * Refuses a non-loopback endpoint **before it connects**, so a misconfigured
   * facility cannot leak the shape of its reads to a remote host on the way to
   * failing.
   */
  static async open(endpoint: string): Promise<LoopbackLedger> {
    const loopback = isLoopbackEndpoint(endpoint);
    if (!loopback) assertRemoteRiskAccepted(endpoint);
    const identity = await LoopbackLedger.probe(endpoint);
    identity.isLoopback = loopback;
    if (identity.networkId !== DEVNET_NETWORK_ID) {
      throw new LedgerRefusal(
        "REFUSED_NOT_DEVNET",
        `network_id ${identity.networkId}, expected ${DEVNET_NETWORK_ID} (Devnet). ` +
          `This project never writes to any other network, at any phase, for any reason`,
      );
    }
    if (identity.serverState !== "full") {
      throw new LedgerRefusal(
        "REFUSED_NODE_NOT_FULL",
        `the local node reports server_state "${identity.serverState}". A node that is running ` +
          `is not a node that can answer a pinned read; wait for it with ` +
          `tools/loopback-node/node.sh wait`,
      );
    }
    return new LoopbackLedger(endpoint, identity);
  }

  private static async probe(endpoint: string): Promise<NodeIdentity> {
    const info = (await rawCall(endpoint, "server_info", {})).info;
    return {
      buildVersion: info.build_version,
      gitHash: info.git?.hash,
      networkId: Number(info.network_id),
      serverState: info.server_state,
      validatedIndex: Number(info.validated_ledger?.seq ?? 0),
      // Overwritten by `open`, which is the only caller and the only place that
      // knows whether the hatch was used. Defaulting to the SAFE answer here
      // means a future second caller that forgets cannot silently claim the
      // permissive one.
      isLoopback: false,
    };
  }

  /**
   * How many submissions went out **without** `fail_hard`.
   *
   * ⚠ Counted here because this is the only place that sees every RPC **made
   * after the connection is open** — which is not the same as every RPC, and
   * the comment said it was until `REVIEW-023` round two. `probe` reaches the
   * node through `rawCall`, so the `server_info` every connection makes never
   * passes through `call`. That costs nothing today because no submission goes
   * through `probe`; what it costs is a reader who believes nothing can get
   * past this, and adds a `rawCall` submit inside this file.
   *
   * The facility's own submitter cannot omit the flag, but `run-facility.ts`'s
   * fail-hard control deliberately makes one unflagged submission through
   * `call` — and B-15's Part C says *"whatever submits"*, with no control-arm
   * exception in the ruling's text.
   */
  private unflagged = 0;

  /**
   * ⚠ **Whether BOTH halves of B-15's step-7 answer were in force for the whole
   * of this connection's life.**
   *
   * Loopback **and** no unflagged submission. It measured only the first until
   * `REVIEW-023` pointed out that every run of `run-facility.ts` makes an
   * unflagged submission before the stamp is written — so a future loopback run
   * would have been recorded as *"both halves in force"* while having submitted
   * once without the flag. The stamp is what a later reader trusts instead of
   * re-deriving; a stamp that measures one half and claims two is worse than
   * none.
   *
   * ⚠ It is a **getter, not a field**, because the answer changes during the
   * run. Read it when you record, not when you connect.
   */
  get underB15Conditions(): boolean {
    return this.identity.isLoopback && this.unflagged === 0;
  }

  /** Why the answer above is what it is, in words a run record can carry. */
  get b15Note(): string {
    if (!this.identity.isLoopback) {
      return (
        "REMOTE endpoint under the accepted-risk hatch (CLAIMS.md E-151). The loopback half " +
        "of B-15's step-7 answer was NOT in force. This run is not evidence about the loopback " +
        "obligation (CLAIMS.md F-23)"
      );
    }
    if (this.unflagged > 0) {
      return (
        `loopback, but ${this.unflagged} submission(s) went out without tapFailHard — the ` +
        `fail-hard control's own second arm does this deliberately. B-15's Part C says ` +
        `"whatever submits" and names no exception, so both halves were not in force for the ` +
        `whole of this run`
      );
    }
    return "loopback and every submission flagged: both halves of B-15's step-7 answer in force";
  }

  async call(method: string, params: Record<string, unknown>): Promise<any> {
    // ⚠ **Every method that submits, not just `submit`.** It matched the exact
    // string until `REVIEW-023` round two pointed at `submit_multisigned`,
    // which is also a submission and also takes `fail_hard`. Nothing here uses
    // it; a counter that has to be right about which submission APIs exist is
    // a counter that goes wrong when one is added, so it asks the broader
    // question. A non-boolean `fail_hard` — the string `"true"`, say — counts
    // as unflagged, which is the conservative answer and the right one.
    if (method.startsWith("submit") && params.fail_hard !== true) this.unflagged++;
    return rawCall(this.endpoint, method, params);
  }

  /** Pin one validated index. Everything the facility reads comes from it. */
  async snapshot(): Promise<Snapshot> {
    const info = (await this.call("server_info", {})).info;
    const seq = Number(info.validated_ledger?.seq ?? 0);
    if (!Number.isInteger(seq) || seq <= 0) {
      throw new LedgerRefusal("REFUSED_NO_VALIDATED_LEDGER", "the node has no validated ledger");
    }
    return new Snapshot(this, seq);
  }

  /** The current (not yet validated) index, for `LastLedgerSequence`. */
  async currentIndex(): Promise<number> {
    const r = await this.call("ledger_current", {});
    return Number(r.ledger_current_index);
  }
}

/**
 * Refuse a non-loopback endpoint unless the risk has been accepted **by name**.
 *
 * ⚠ **Three refusals, not one.** An unset variable, a variable set to something
 * else, and the accepted case are different situations and a caller who gets
 * them confused is a caller who thinks they turned the hatch on. `REVIEW-013c`
 * §3a B-VII is the standing reason: a refusal a client renders as "please try
 * again" is a loud refusal made quiet.
 */
function assertRemoteRiskAccepted(endpoint: string): void {
  const accepted = process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
  if (accepted === RISK_ACCEPTANCE_PHRASE) {
    // stderr, not stdout: a disclosure that can be lost to a pipe is a
    // disclosure that will be.
    process.stderr.write(`\n${REMOTE_LEDGER_DISCLOSURE}\n\n  endpoint: ${endpoint}\n\n`);
    return;
  }
  if (accepted !== undefined) {
    throw new LedgerRefusal(
      "REFUSED_RISK_NOT_ACCEPTED",
      `WCONF_ACCEPT_REMOTE_LEDGER_RISK is set, but not to the acceptance sentence. It must be ` +
        `EXACTLY:\n\n    ${RISK_ACCEPTANCE_PHRASE}\n\n` +
        `A near miss is refused rather than accepted, because a hatch that opens on anything ` +
        `truthy is a hatch that opens by accident`,
    );
  }
  throw new LedgerRefusal(
    "REFUSED_NOT_LOOPBACK",
    `${endpoint} is not a loopback address. CLAIMS.md B-15's step-7 ruling requires the ` +
      `facility's ledger reads to go to a node the operator runs, and a remote endpoint ` +
      `reopens F-23 — which is executed, not theoretical. Start one with ` +
      `tools/loopback-node/node.sh start.\n\n` +
      `To proceed against a remote endpoint anyway — which the project owner amended B-15's ` +
      `answer to allow on 2026-08-25, for a Devnet demo with throwaway keys and NOT for ` +
      `anything else — set WCONF_ACCEPT_REMOTE_LEDGER_RISK to the acceptance sentence in ` +
      `facility/README.md. The run will say so in its output and in its own record`,
  );
}

/**
 * Whether two URLs name the same endpoint, ignoring the trailing slash `fetch`
 * adds to `response.url`.
 *
 * Exported so the comparison can be tested directly: the path that reaches it
 * in `rawCall` requires a runtime that ignores `redirect: "error"`, which is not
 * a state a test can produce — and an untestable check is one nobody finds out
 * is wrong until it fires in production, which is exactly what happened to its
 * first version.
 */
export function sameEndpoint(a: string, b: string): boolean {
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
}

async function rawCall(
  endpoint: string,
  method: string,
  params: Record<string, unknown>,
): Promise<any> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params: [params] }),
      // ⚠ **A redirect is the loopback check undone.** `fetch` follows them by
      // default; `307`/`308` preserve the method and body, so a loopback
      // responder could forward this POST to a remote host and every later
      // call with it. `error` makes the fetch reject instead.
      redirect: "error",
    });
  } catch (e) {
    throw new LedgerRefusal("REFUSED_LEDGER_UNAVAILABLE", `${method}: ${String(e)}`);
  }
  // Belt as well as braces: if a runtime ever honoured a redirect anyway, the
  // response carries the final URL and it must be the one we asked.
  //
  // ⚠ **This compared against LOOPBACK-ness until the first run under the
  // accepted-risk hatch, and that was wrong in both directions.** It refused
  // every remote endpoint even when the risk had been accepted — which is how
  // it was found, by running the artifact rather than by reading it — and it
  // would have *accepted* a redirect from one loopback port to another. The
  // invariant a redirect violates is "the answer came from where I asked", and
  // that is what this checks now. `CLAIMS.md` E-139: running the artifact
  // catches what a fix leaves standing.
  if (response.url && !sameEndpoint(response.url, endpoint)) {
    throw new LedgerRefusal(
      "REFUSED_REDIRECTED",
      `${method}: asked ${endpoint} and the answer came from ${response.url}. A redirect is ` +
        `the endpoint check undone`,
    );
  }
  if (!response.ok) {
    throw new LedgerRefusal("REFUSED_LEDGER_UNAVAILABLE", `${method}: HTTP ${response.status}`);
  }
  const body: any = await response.json();
  const result = body.result;
  if (!result) throw new LedgerRefusal("REFUSED_LEDGER_MALFORMED", `${method}: no result`);
  if (result.status === "error") {
    // `entryNotFound` is an answer, not a failure — a holder who has not opted
    // in has no `MPToken`, and the caller distinguishes that from a broken read.
    const code = result.error === "entryNotFound" || result.error === "objectNotFound"
      ? "REFUSED_LEDGER_ENTRY_MISSING"
      : "REFUSED_LEDGER_ERROR";
    throw new LedgerRefusal(code, `${method}: ${result.error} ${result.error_message ?? ""}`);
  }
  return result;
}
