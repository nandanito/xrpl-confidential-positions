/**
 * book.ts — the facility's off-ledger balance record, and the reason it is not
 * optional.
 *
 * # Why a facility needs this at all
 *
 * TASK ZERO §9 originally capped the float. That cap was **un-retracted** on
 * 2026-08-16 when the 1,000,000 decryption bound turned out to be a
 * caller-supplied search window rather than a ceiling (`CLAIMS.md` F-7), and
 * what replaced it is a **requirement**: whoever holds the confidential balance
 * must maintain its expected value off-ledger so that it can be decrypted
 * cheaply, because resynchronisation costs time proportional to the width of
 * the uncertainty and **no sublinear fallback is shipped** (F-8: at the pinned
 * mpt-crypto `1.0.4`, the library's own header points at a `bsgs` symbol that
 * does not exist; upstream added it in `1.0.5`, E-297).
 *
 * ⚠ **The per-iteration cost is NOT restated here.** It is a benchmark number,
 * `CLAIMS.md` **P-8** forbids quoting one without hardware, parameter set and
 * methodology, and all three live in `docs/task-zero/benchmarks-2026-08-16.md`
 * §4 with `CLAIMS.md` **E-23** and **F-7** as the register rows. ⚠ It is also
 * **not F-8** — TASK ZERO §9 states the cost and the missing fallback in one
 * sentence with one citation, and copying that sentence attaches the wrong row
 * to the number.
 *
 * That is this module. A confidential balance is an ElGamal ciphertext of a
 * scalar multiple of a generator; recovering the integer is a **linear** search
 * over the candidate range. A holder who knows what their balance *should* be
 * searches a window of a few units. A holder who does not searches the whole
 * facility.
 *
 * ⚠ **So the book is a performance requirement that behaves like a correctness
 * one.** Lose it and the position is not lost — the ledger still holds it and
 * `sk_A` still decrypts it — but the search becomes proportional to the float,
 * and for a £50m facility at scale 0 that is not a search anyone runs.
 *
 * # ⚠ What this book is NOT
 *
 * * **Not authoritative.** The ledger is. Every entry here is a *prediction*,
 *   and [`reconcile`] is what turns a prediction into a confirmed reading.
 * * **Not the randomness ledger.** `signer/src/store.rs` is an append-only,
 *   authenticated record guarding a cryptographic invariant under amendments
 *   A4–A9. This is a cache of integers. Conflating them would import a
 *   seriousness this file does not have, and — worse — suggest the protections
 *   there apply here.
 * * **Not integrity-protected.** A tampered book makes a reconciliation fail
 *   loudly (the window misses and the widened search disagrees), which is the
 *   honest failure mode. It does not make a wrong number believed.
 * * **Not a confidentiality boundary.** It holds every confidential movement's
 *   amount and every expected balance in plaintext, on disk, unencrypted. Anyone
 *   who can read it knows them all. Public payments are not in it, and are public
 *   anyway. Devnet throwaways only.
 */
import { existsSync, readFileSync } from "node:fs";
import { writeSecretFile } from "./secret-file.ts";

export interface Movement {
  at: string;
  kind: "convert" | "send-out" | "send-in" | "merge" | "convert-back";
  account: string;
  amount: number;
  /** The validated transaction that caused it. A movement with no hash is a
   *  prediction that was never confirmed, and is not written. */
  hash: string;
}

interface Position {
  /** What `ConfidentialBalanceSpending` should decrypt to. */
  spending: number;
  /** What `ConfidentialBalanceInbox` should decrypt to. */
  inbox: number;
}

interface BookFile {
  issuanceId: string;
  positions: Record<string, Position>;
  movements: Movement[];
}

/** What one reconciliation established. */
export interface Reconciliation {
  account: string;
  which: "spending" | "inbox";
  expected: number;
  actual: number;
  /** How wide a search found it. The whole point of keeping the book. */
  searchWidth: number;
  /** True when the narrow window missed and a full-range search was needed. */
  widened: boolean;
}

export class BookDrift extends Error {
  constructor(readonly detail: Reconciliation & { searchedTo: number }) {
    super(
      `book drift on ${detail.account} ${detail.which}: expected ${detail.expected}, ` +
        `ledger says ${detail.actual}`,
    );
    this.name = "BookDrift";
  }
}

export class Unreadable extends Error {
  constructor(account: string, which: string, searchedTo: number) {
    super(
      `${account}'s ${which} balance did not decrypt anywhere in [0, ${searchedTo}]. ` +
        `The facility will not guess a balance it could not read`,
    );
    this.name = "Unreadable";
  }
}

/** Decrypts one ciphertext over an inclusive integer range. `mptool decrypt`. */
export type RangeDecryptor = (
  ciphertext: string,
  sk: string,
  from: number,
  to: number,
) => Promise<number | null>;

export class FacilityBook {
  private data: BookFile;

  private constructor(
    private readonly path: string,
    data: BookFile,
    /** How far either side of the expected value a reconciliation looks first. */
    readonly window: number,
  ) {
    this.data = data;
  }

  static open(path: string, issuanceId: string, window = 8): FacilityBook {
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, "utf8")) as BookFile;
      if (data.issuanceId !== issuanceId) {
        throw new Error(
          `${path} is the book for issuance ${data.issuanceId}, not ${issuanceId}. ` +
            `Two facilities sharing one book is two sets of expectations in one file`,
        );
      }
      return new FacilityBook(path, data, window);
    }
    return new FacilityBook(path, { issuanceId, positions: {}, movements: [] }, window);
  }

  private save(): void {
    // Write-then-rename: a book truncated by a crash mid-write is a book that
    // will fail every reconciliation until someone resyncs it. `writeSecretFile`
    // does the rename, and it creates the file at `0600`, because the book holds
    // every confidential amount in plaintext and was written at the umask until B-29.
    writeSecretFile(this.path, JSON.stringify(this.data, null, 2));
  }

  private position(account: string): Position {
    return (this.data.positions[account] ??= { spending: 0, inbox: 0 });
  }

  expected(account: string): Position {
    return { ...this.position(account) };
  }

  get movements(): readonly Movement[] {
    return this.data.movements;
  }

  /**
   * Record a movement that has **validated**.
   *
   * ⚠ Nothing is recorded on submission. A transaction that was discarded
   * under `tapFailHard`, or that never validated, moved no value, and a book
   * updated from intent rather than from outcome is a book that drifts by
   * exactly the amount of every failure.
   */
  record(m: Omit<Movement, "at">): void {
    // ⚠ **Compute, validate, THEN commit.** The first draft mutated the stored
    // position and checked for negativity afterwards, so a refused movement
    // left the in-memory book holding a number the protocol cannot represent —
    // on disk it still said the old value, and the two disagreed until the next
    // reload. The test asserted only that it threw, so it passed against the
    // corrupted state. Found independently by both `REVIEW-022` legs.
    const current = this.position(m.account);
    const next: Position = { ...current };
    switch (m.kind) {
      case "convert":
        // ⚠ **A Convert lands in the INBOX, not in the spendable balance**, and
        // this credited `spending` until the first Devnet run refused to
        // reconcile. Read off the ledger on 2026-08-25, after a validated
        // Convert of 5000: `ConfidentialBalanceSpending` decrypted to **0** and
        // `ConfidentialBalanceInbox` to **5000**. A `ConfidentialMPTMergeInbox`
        // is what makes it spendable, exactly as it is for a received Send.
        //
        // ⚠ **The then-existing tests could not have caught this**, and that
        // is the defensible form of the claim. They asserted this model against
        // itself, so every one of them passed. **A unit test absolutely CAN
        // encode the rule once the ledger has established it** — the arithmetic
        // tests do, and they fail if `convert` credits `spending` again.
        // `REVIEW-023` corrected the absolute, which read *"no unit test could
        // have caught it"*.
        //
        // What is durable: only the ledger says what the protocol does, and a
        // suite that agrees with its author about the protocol agrees about
        // that author's mistakes too.
        next.inbox += m.amount;
        break;
      case "send-out":
        next.spending -= m.amount;
        break;
      case "send-in":
        // A received amount lands in the INBOX, not in the spendable balance.
        // Merging it is a separate transaction and a separate movement.
        next.inbox += m.amount;
        break;
      case "merge":
        // ⚠ The caller states what it believes the inbox held, and the book
        // refuses to disagree silently: a merge recorded for the wrong amount
        // is a movement log that no longer explains the position it produced.
        if (m.amount !== next.inbox) {
          throw new Error(
            `merge for ${m.account} was recorded as ${m.amount} but the book holds ` +
              `${next.inbox} in the inbox`,
          );
        }
        next.spending += next.inbox;
        next.inbox = 0;
        break;
      case "convert-back":
        next.spending -= m.amount;
        break;
    }
    if (next.spending < 0 || next.inbox < 0) {
      throw new Error(
        `${m.kind} of ${m.amount} would take ${m.account} negative ` +
          `(spending ${next.spending}, inbox ${next.inbox}). The book refuses to hold a state ` +
          `the protocol cannot represent`,
      );
    }
    this.data.positions[m.account] = next;
    this.data.movements.push({ ...m, at: new Date().toISOString() });
    this.save();
  }

  /**
   * Check one prediction against the ledger, cheaply if the book is right.
   *
   * The narrow window is the benefit the book exists for. `fullRange` is what a
   * holder without a book pays on **every** read, and passing it here is what
   * makes that cost visible rather than assumed.
   */
  async reconcile(
    account: string,
    which: "spending" | "inbox",
    ciphertext: string | undefined,
    sk: string,
    decrypt: RangeDecryptor,
    fullRange: number,
  ): Promise<Reconciliation> {
    const expected = this.position(account)[which];
    if (!ciphertext) {
      // No ciphertext is a real state — nothing has been converted — and it is
      // only consistent with an expectation of zero.
      if (expected !== 0) {
        throw new BookDrift({
          account, which, expected, actual: 0, searchWidth: 0, widened: false, searchedTo: 0,
        });
      }
      return { account, which, expected, actual: 0, searchWidth: 0, widened: false };
    }
    const from = Math.max(0, expected - this.window);
    const to = expected + this.window;
    const near = await decrypt(ciphertext, sk, from, to);
    if (near !== null) {
      if (near !== expected) {
        throw new BookDrift({
          account, which, expected, actual: near, searchWidth: to - from + 1,
          widened: false, searchedTo: to,
        });
      }
      return { account, which, expected, actual: near, searchWidth: to - from + 1, widened: false };
    }
    // The window missed. This is F-8's cost, paid in public.
    const far = await decrypt(ciphertext, sk, 0, fullRange);
    if (far === null) throw new Unreadable(account, which, fullRange);
    throw new BookDrift({
      account, which, expected, actual: far, searchWidth: fullRange + 1,
      widened: true, searchedTo: fullRange,
    });
  }

  /**
   * Rebuild one expectation from the ledger, paying the full-range search.
   *
   * ⚠ This is what a lost book costs, and it is the honest counterpart to
   * [`reconcile`]: the same ciphertext, the same key, and a search proportional
   * to the **facility**, not to the movement.
   */
  async resync(
    account: string,
    which: "spending" | "inbox",
    ciphertext: string | undefined,
    sk: string,
    decrypt: RangeDecryptor,
    fullRange: number,
  ): Promise<{ value: number; searchWidth: number }> {
    if (!ciphertext) {
      this.position(account)[which] = 0;
      this.save();
      return { value: 0, searchWidth: 0 };
    }
    const value = await decrypt(ciphertext, sk, 0, fullRange);
    if (value === null) throw new Unreadable(account, which, fullRange);
    this.position(account)[which] = value;
    this.save();
    return { value, searchWidth: fullRange + 1 };
  }
}
