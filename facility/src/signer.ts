/**
 * signer.ts — how the facility reaches the holder signer.
 *
 * # The split this file sits across
 *
 * ADR-0001 §(a), `Accepted`: proof generation and transaction signing run in a
 * **separate local binary** on the holder's machine, and a browser page cannot
 * invoke a local process. The facility is application logic; it builds
 * *intents*.
 *
 * ⚠ **It does NOT follow that this process never sees a secret, and an earlier
 * version of this header said it did.** That sentence belongs to the web client
 * ADR-0001 describes, not to this driver. **This process holds every party's
 * XRPL family seed, writes each one into a `profile.json` on disk, and derives
 * every party's ElGamal secret to reconcile the book** — because it plays the
 * bank, the Dedicated Account and every supplier at once. A real facility has
 * three parties on three machines. `REVIEW-022`'s Codex leg found the sentence,
 * and it called it *"a load-bearing boundary misstated"*, which is right.
 *
 * ⚠ **What crosses the IPC boundary in each direction is a narrower claim, and
 * it is the true one:**
 *
 * * Out, on the socket: an operation name, an issuance, a destination, an
 *   amount. **No randomness, no key material, no seed** — `signer/src/protocol.rs`
 *   refuses any of those *by name*, on the raw JSON tree, before the request is
 *   interpreted.
 * * Back, on the socket: a signed blob and a hash. Never a secret.
 * * ⚠ **Beside the socket, not on it: the seed reaches the daemon through the
 *   profile file this module writes.** That is how the signer is configured and
 *   it is not a secret crossing the IPC boundary — but it is this process
 *   handling one, and the distinction is the whole of the correction above.
 *
 * The signer **reads the ledger itself** and **does not submit**. Both halves
 * are load-bearing: the facility cannot hand it a balance or a destination key
 * (it refuses nine ledger fields in a profile by name), and the facility is
 * what submits — with `tapFailHard`, per B-15's step-7 ruling.
 *
 * # ⚠ `--auto-confirm` defeats the actual trust boundary, and says so
 *
 * Architecture §3's boundary is **a human confirming, in the signer's own
 * window, a screen rendered from the transaction the signer built**. A driver
 * that writes `CONFIRM` to the daemon's stdin is not that human. It is
 * acceptable in an unattended Devnet run and it is **not** a demonstration of
 * the boundary; `signer/tests/falsifier.rs` is what demonstrates the boundary.
 * Every run that auto-confirms prints this, because an unmarked automation of
 * a human check reads as the check having passed.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { isLoopbackEndpoint, LedgerRefusal, RISK_ACCEPTANCE_PHRASE } from "./loopback.ts";
import { writeSecretFile } from "./secret-file.ts";

export interface SignerProfile {
  /** The XRPL family seed. ⚠ Devnet throwaway. */
  accountSeed: string;
  issuanceId: string;
  /** ⚠ Must be the loopback endpoint. The signer prints a mandatory disclosure
   *  for anything else, and for the facility anything else is a defect. */
  ledgerEndpoint: string;
  /** Bounds the confirmation's amount search **and the balance read** (E-104). */
  amountSearchTo: number;
  feeDrops?: number;
}

export interface SignedTransaction {
  txBlob: string;
  hash: string;
  summary: string;
}

export class SignerRefused extends Error {
  constructor(readonly code: string, readonly detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SignerRefused";
  }
}

const SIGNER_BINARY = new URL("../../signer/target/debug/wconf-signer", import.meta.url).pathname;

/**
 * One signer process, for one account, for as long as the caller needs it.
 *
 * ⚠ **One process per account, not one process for the facility.** A profile
 * carries one seed; the Dedicated Account and each supplier are different
 * holders with different keys, and a single daemon serving all of them would be
 * a single process holding every secret in the facility.
 */
export class SignerSession {
  private child: ChildProcess | null = null;
  private sock: any = null;
  private buffer = "";
  private readonly inbox: string[] = [];

  private constructor(
    private readonly socketPath: string,
    private readonly profilePath: string,
    private readonly autoConfirm: boolean,
  ) {}

  static async start(
    profile: SignerProfile,
    opts: { workDir: string; autoConfirm: boolean; quiet?: boolean },
  ): Promise<SignerSession> {
    if (!existsSync(SIGNER_BINARY)) {
      throw new Error(
        `the signer is not built at ${SIGNER_BINARY}. Run: tools/rebuild-env.sh && (cd signer && cargo build)`,
      );
    }
    // ⚠ Checked HERE, where the endpoint is written into the profile, and not
    // only in `Facility`'s constructor. A direct caller of `SignerSession.start`
    // bypassed the check entirely; `REVIEW-022` round two found that, and the
    // fix is one line at the place the value is actually used.
    assertLoopbackProfile(profile.ledgerEndpoint);
    // ⚠ **Refused BEFORE anything is written.** This check ran after the profile
    // was on disk until B-29, so a refused start left the account seed behind in
    // a file at the umask: `/tmp/wconf-boundary-test/profile.json` was one.
    // ⚠ **`WCONF_LEDGER_ENDPOINT` OVERRIDES THE PROFILE INSIDE THE SIGNER.**
    // `signer/src/main.rs:71` reads it first and falls back to
    // `holder.ledger_endpoint` only if it is unset. Inheriting `process.env`
    // therefore meant the facility could read loopback while **the signer** —
    // the component that reads the destination's and the issuer's keys, which
    // is F-23's actual mechanism — read a remote node, with `assertLoopbackProfile`
    // checking a value that was never used. `REVIEW-022`'s Codex leg found it and
    // rated it CRITICAL, and that is the right rating: it defeats the loopback
    // half of B-15's answer completely, on the one component the half is about.
    //
    // Two things close it. The variable is set **explicitly** to the endpoint
    // that was checked, so an inherited value cannot win; and an inherited value
    // that disagrees is a **refusal** rather than a silent override, because an
    // operator who set it meant something and ignoring them quietly is how the
    // next version of this hole gets built.
    const inherited = process.env.WCONF_LEDGER_ENDPOINT;
    if (inherited && inherited !== profile.ledgerEndpoint) {
      throw new LedgerRefusal(
        "REFUSED_ENDPOINT_OVERRIDE",
        `WCONF_LEDGER_ENDPOINT is set to ${inherited}, which the signer would prefer over the ` +
          `facility's checked endpoint ${profile.ledgerEndpoint}. Unset it, or set it to the ` +
          `same loopback endpoint`,
      );
    }

    // `writeSecretFile` creates the work directory at `0700` along with the file.
    rmSync(opts.workDir, { recursive: true, force: true });
    const socketPath = `${opts.workDir}/signer.sock`;
    const profilePath = `${opts.workDir}/profile.json`;
    writeSecretFile(
      profilePath,
      JSON.stringify(
        {
          account_seed: profile.accountSeed,
          // ⚠ **No ElGamal secret in this file at all.** The ruled derivation
          // reconstructs it from the master seed; `standalone` would be the
          // library's CSPRNG and a different key source entirely.
          elgamal_key_source: "derived-from-master-seed",
          issuance_id: profile.issuanceId,
          fee_drops: profile.feeDrops ?? 5000,
          network_id: 2,
          ledger_endpoint: profile.ledgerEndpoint,
          amount_search_to: profile.amountSearchTo,
        },
        null,
        2,
      ),
    );

    const s = new SignerSession(socketPath, profilePath, opts.autoConfirm);
    s.child = spawn(SIGNER_BINARY, [], {
      env: {
        ...process.env,
        WCONF_LEDGER_ENDPOINT: profile.ledgerEndpoint,
        WCONF_SIGNER_PROFILE: profilePath,
        WCONF_SIGNER_SOCKET: socketPath,
        WCONF_SIGNER_STORE: `${opts.workDir}/randomness`,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    // ⚠ **`quiet` never suppresses a disclosure.** The signer prints
    // `ledger::REMOTE_SOURCE_DISCLOSURE` whenever its endpoint is not loopback,
    // and that print is a **condition of `REVIEW-019`'s ruling**, not a
    // courtesy. Swallowing it is how a facility could be reading a remote node
    // and look exactly like one that was not. Nothing else is quieted on stderr
    // either — a signer refusal is never noise.
    const isDisclosure = (line: string) => /⚠|DISCLOSURE|REMOTE|REFUS/i.test(line);
    s.child.stdout!.on("data", (d: Buffer) => {
      const text = d.toString();
      if (!opts.quiet) process.stdout.write(`  [signer] ${text}`);
      else for (const line of text.split("\n")) {
        if (isDisclosure(line)) process.stdout.write(`  [signer] ${line}\n`);
      }
    });
    s.child.stderr!.on("data", (d: Buffer) => process.stderr.write(`  [signer] ${d}`));

    for (let i = 0; i < 60 && !existsSync(socketPath); i++) await Bun.sleep(100);
    if (!existsSync(socketPath)) {
      s.stop();
      throw new Error("the signer never created its socket");
    }
    // ⚠ **The profile is deleted as soon as the signer has read it.** The signer
    // loads it once, at `signer/src/main.rs:44`, before it binds the socket at
    // `:81`, so a socket on disk means the seed is already in the signer's memory
    // and the file is only a copy. It used to outlive the session (B-29).
    rmSync(profilePath, { force: true });
    await Bun.sleep(300);
    s.sock = await Bun.connect({
      unix: socketPath,
      socket: {
        data(_s: unknown, data: Buffer) {
          s.buffer += data.toString();
          let i: number;
          while ((i = s.buffer.indexOf("\n")) >= 0) {
            s.inbox.push(s.buffer.slice(0, i));
            s.buffer = s.buffer.slice(i + 1);
          }
        },
      },
    });
    return s;
  }

  private async ask(request: unknown, confirmable = false): Promise<any> {
    this.sock.write(JSON.stringify(request) + "\n");
    if (confirmable && this.autoConfirm) {
      await Bun.sleep(1500);
      this.child!.stdin!.write("CONFIRM\n");
    }
    for (let i = 0; i < 1800; i++) {
      if (this.inbox.length) return JSON.parse(this.inbox.shift()!);
      await Bun.sleep(100);
    }
    throw new Error("the signer did not answer");
  }

  /** Scoped, short-lived authority for exactly the operations named. */
  async pair(operations: string[], ttlSecs = 300): Promise<string> {
    const r = await this.ask({ type: "pair", operations, ttl_secs: ttlSecs });
    if (r.status !== "paired") throw new SignerRefused(r.code ?? "?", r.detail ?? JSON.stringify(r));
    return r.grant;
  }

  /**
   * Build, prove, confirm and sign one confidential transaction.
   *
   * ⚠ The `claimed` block a real web client would send is **deliberately not
   * sent**. It is carried and ignored by design, and a facility that sent one
   * would be inviting the reading REVIEW-003b forbids: that the confirmation
   * shows what the client asked for.
   */
  async prepare(args: {
    grant: string;
    operation: "ConfidentialMPTConvert" | "ConfidentialMPTSend" | "ConfidentialMPTConvertBack";
    issuanceId: string;
    amount: number;
    destination?: string;
  }): Promise<SignedTransaction> {
    const r = await this.ask(
      {
        type: "prepare",
        grant: args.grant,
        operation: args.operation,
        issuance_id: args.issuanceId,
        amount: String(args.amount),
        ...(args.destination ? { destination: args.destination } : {}),
      },
      true,
    );
    if (r.status !== "signed") throw new SignerRefused(r.code ?? "?", r.detail ?? JSON.stringify(r));
    return { txBlob: r.tx_blob, hash: r.hash, summary: r.summary };
  }

  stop(): void {
    try {
      this.sock?.end();
    } catch {
      /* the socket may already be gone */
    }
    this.child?.kill();
    rmSync(this.socketPath, { force: true });
    // Already gone on the normal path; this covers a start that failed first.
    rmSync(this.profilePath, { force: true });
  }
}

/**
 * The banner every unattended run prints.
 *
 * `CLAIMS.md` E-126 is what this is for: the one disclosure surface that was
 * not a constant with an asserted wording is where a false sentence lived
 * through a whole round of review. This is a constant, which is half the
 * lesson.
 *
 * ⚠ **The other half is not done, and this comment claimed it was.** It said
 * *"`facility/tests/signer.test.ts` asserts its wording"*. **There is no such
 * file.** `REVIEW-022`'s Codex leg found it — a citation to a test that does
 * not exist, in the comment explaining why untested wordings are dangerous.
 * The wording is asserted by nothing; making a constant is not the same as
 * asserting it.
 */
export const AUTO_CONFIRM_NOTICE =
  "⚠ AUTO-CONFIRM: this run answers the signer's confirmation prompt itself. " +
  "Architecture §3's boundary is a HUMAN confirming a screen rendered from the transaction " +
  "the signer built, and nothing below demonstrates that boundary. " +
  "signer/tests/falsifier.rs is what demonstrates it.";

export function assertLoopbackProfile(endpoint: string): void {
  // Defence in depth: `LoopbackLedger` refuses a remote endpoint for the
  // facility's own reads, and this refuses handing one to the signer. They are
  // two different processes reading the same ledger for two different reasons,
  // and B-15's ruling covers both.
  //
  // ⚠ The check is imported rather than re-implemented. A second copy of a
  // host-parsing rule is REVIEW-016's two bypasses waiting to happen again.
  if (isLoopbackEndpoint(endpoint)) return;

  // ⚠ **The hatch has to reach here too, and that is uncomfortable in exactly
  // the right way.** The signer's reads are the ones F-23 is actually about —
  // it reads the destination's and the issuer's keys — so a hatch that covered
  // the facility's own reads and not the signer's would be a hatch that
  // recorded the wrong risk. The signer prints its own
  // `ledger::REMOTE_SOURCE_DISCLOSURE` when its endpoint is not loopback, and
  // `SignerSession.start` no longer suppresses it.
  if (process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK === RISK_ACCEPTANCE_PHRASE) return;

  throw new LedgerRefusal(
    "REFUSED_NOT_LOOPBACK",
    `the signer would read the ledger from ${endpoint}. B-15's step-7 ruling requires ` +
      `loopback for the facility, and the signer's own reads are the ones F-23 is about`,
  );
}
