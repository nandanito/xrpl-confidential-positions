/**
 * facility.ts — the receivables financing facility, as application logic.
 *
 * Architecture §6 **step 7**. ADR-0002: the facility is application logic on
 * XLS-0096 Confidential MPTs, **not** XLS-66 and **not** an XLS-65 `Vault`.
 * TASK ZERO §9 is the design; `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md`
 * is the end-to-end account of what it does and does not hide.
 *
 * ⚠ **"Dedicated Account", never "vault".** An XLS-65 `Vault` is a different
 * ledger object, its share token *cannot* be confidential, its pseudo-account
 * *cannot* sign a `ConfidentialMPTConvert`, and the word has already nearly
 * derailed one reading of this design.
 *
 * # The five steps, and which of them are protocol and which are ours
 *
 * A distinction worth keeping sharp, because a design rule stated as a protocol
 * rule is a claim about rippled that rippled does not make:
 *
 * | | Whose rule |
 * |---|---|
 * | The issuer cannot convert its own issuance | **protocol** — the ledger refuses it |
 * | Registration happens exactly once | **protocol** — the key is required at initialisation and forbidden after |
 * | `TransferFee` must be 0 on a confidential issuance | **protocol** |
 * | A destination with no registered key cannot receive | **protocol** — there is no key to encrypt to, so the transaction cannot be *built* |
 * | The float converts **once**, in aggregate | **ours** — TASK ZERO §9's design rule. rippled would accept a second Convert |
 * | Every per-participant movement is a `ConfidentialMPTSend` | **ours** |
 *
 * # What this hides, in one sentence that must survive any rewrite
 *
 * **Amounts.** Not who transacts, not with whom, not when, not how often — and
 * the issuer decrypts every balance by construction (`CLAIMS.md` P-4, P-9,
 * P-11). `Convert` and `ConvertBack` publish their amounts in the clear, **per
 * transaction**, so retiring a facility in tranches publishes every tranche
 * size (F-24).
 *
 * # ⚠ What this module is not
 *
 * * **Not multi-party.** One process plays the bank, the Dedicated Account and
 *   every supplier, and therefore holds every seed. A real facility has three
 *   parties and three machines; this has one, and every security property that
 *   depends on the separation is **not demonstrated here**.
 * * **Not a permissioned domain.** The walkthrough's step 1 offers `sfDomainID`
 *   to gate the issuance to credentialled accounts. It is **not built**, and
 *   that is a named gap rather than a decision: it needs `PermissionedDomainSet`
 *   and a credential per supplier, which is its own milestone.
 * * **Not secure, audited, non-custodial or production-ready** (P-5). Devnet
 *   throwaways only, and nothing here should ever hold value.
 */
import { deriveAddress, deriveKeypair } from "ripple-keypairs";
import { decodeAccountID } from "ripple-address-codec";
import { deriveElGamalKey, type DerivedElGamalKey } from "../../tools/wconf-keygen.ts";
import { FacilityBook } from "./book.ts";
import { LedgerRefusal, type LoopbackLedger, type MPTokenState } from "./loopback.ts";
import { decryptInRange } from "./mptool.ts";
import { assertLoopbackProfile, SignerSession } from "./signer.ts";
import type { FailHardSubmitter } from "./submit.ts";

/** One participant. ⚠ The seed is here because this process plays every role. */
export interface Party {
  label: string;
  address: string;
  seed: string;
}

export interface FacilityConfig {
  issuanceId: string;
  bank: Party;
  dedicated: Party;
  /**
   * The widest search the facility will ever run to read a balance.
   *
   * ⚠ This bounds the signer's balance read too (`amount_search_to`, E-104), so
   * it must cover the float. It is also **the cost of a lost book**: the search
   * is linear in the width, and no sublinear fallback is shipped at the pinned
   * mpt-crypto `1.0.4` (F-8; upstream added one in `1.0.5`, E-297). ⚠ The
   * per-iteration figure is a benchmark number and is deliberately not restated
   * — P-8, and `benchmarks-2026-08-16.md` §4 is where it has its methodology.
   */
  fullRange: number;
  ledgerEndpoint: string;
  workRoot: string;
  autoConfirm: boolean;
  quietSigner?: boolean;
}

export interface Movement {
  what: string;
  hash: string;
  /** True when the amount is a plaintext field of the transaction. */
  amountIsPublic: boolean;
  amount: number;
}

const accountIdHex = (address: string) =>
  Buffer.from(decodeAccountID(address)).toString("hex").toUpperCase();

/** The address a seed actually controls — never the one someone told us. */
export function addressOfSeed(seed: string): string {
  return deriveAddress(deriveKeypair(seed).publicKey);
}

export class FacilityRefusal extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "FacilityRefusal";
  }
}

export class Facility {
  private readonly suppliers = new Map<string, Party>();
  /** Cached because deriving is HMAC work and the addresses do not change. */
  private readonly keys = new Map<string, DerivedElGamalKey>();
  private floatConverted = false;

  constructor(
    private readonly ledger: LoopbackLedger,
    private readonly submitter: FailHardSubmitter,
    readonly book: FacilityBook,
    private readonly cfg: FacilityConfig,
  ) {
    assertLoopbackProfile(cfg.ledgerEndpoint);
    if (cfg.dedicated.address === cfg.bank.address) {
      throw new FacilityRefusal(
        "REFUSED_ISSUER_IS_DEDICATED",
        "the Dedicated Account cannot be the issuer: an issuer cannot convert its own issuance " +
          "into a confidential balance, and the ledger refuses it outright. That is the reason " +
          "this design has a separate account at all",
      );
    }
    for (const p of [cfg.bank, cfg.dedicated]) this.checkSeedControlsAddress(p);
  }

  /**
   * ⚠ A party's address is **derived from its seed**, never believed.
   *
   * The faucet, a config file and a state file all *claim* an address. If the
   * claim were wrong the facility would encrypt to a key belonging to an
   * account this process cannot sign for — which is F-23's shape arriving from
   * a different direction.
   */
  private checkSeedControlsAddress(p: Party): void {
    const derived = addressOfSeed(p.seed);
    if (derived !== p.address) {
      throw new FacilityRefusal(
        "REFUSED_SEED_ADDRESS_MISMATCH",
        `${p.label}: the seed controls ${derived}, not the claimed ${p.address}`,
      );
    }
  }

  elgamalOf(p: Party): DerivedElGamalKey {
    let k = this.keys.get(p.address);
    if (!k) {
      k = deriveElGamalKey(p.seed);
      if (k.address !== p.address) {
        throw new FacilityRefusal(
          "REFUSED_SEED_ADDRESS_MISMATCH",
          `${p.label}: the derivation's own account check disagrees with ${p.address}`,
        );
      }
      this.keys.set(p.address, k);
    }
    return k;
  }

  partyOf(address: string): Party {
    if (address === this.cfg.bank.address) return this.cfg.bank;
    if (address === this.cfg.dedicated.address) return this.cfg.dedicated;
    const s = this.suppliers.get(address);
    if (!s) throw new FacilityRefusal("REFUSED_UNKNOWN_PARTY", address);
    return s;
  }

  get supplierList(): Party[] {
    return [...this.suppliers.values()];
  }

  /**
   * Adopt a supplier that was enrolled by an earlier run.
   *
   * ⚠ **It re-checks everything `enrolSupplier` checks and skips only the
   * transactions.** The seed must control the address, the derivation must
   * agree, and the key **on the ledger** must be the derived one — because a
   * facility that adopted a position it cannot decrypt would track a number it
   * can never confirm. An earlier draft of the driver reached into the private
   * map with a cast instead, which did none of this.
   */
  async adoptEnrolledSupplier(supplier: Party): Promise<void> {
    this.checkSeedControlsAddress(supplier);
    const onLedger = await this.positionOf(supplier.address);
    const expected = this.elgamalOf(supplier).pk;
    if (!onLedger?.holderEncryptionKey) {
      throw new FacilityRefusal(
        "REFUSED_NOT_ENROLLED",
        `${supplier.label} carries no HolderEncryptionKey, so there is nothing to adopt`,
      );
    }
    if (onLedger.holderEncryptionKey !== expected) {
      throw new FacilityRefusal(
        "REFUSED_KEY_NOT_DERIVED",
        `${supplier.label} registered ${onLedger.holderEncryptionKey}, not the derived ${expected}`,
      );
    }
    this.suppliers.set(supplier.address, supplier);
  }

  // -------------------------------------------------------------- reads

  async positionOf(address: string): Promise<MPTokenState | null> {
    const snap = await this.ledger.snapshot();
    return snap.mptoken(address, this.cfg.issuanceId);
  }

  /**
   * Confirm one party's book entry against the ledger.
   *
   * This is where the book earns its place: the window is a handful of units
   * wide, and `cfg.fullRange` is what the same read costs without a book.
   */
  async reconcile(p: Party, which: "spending" | "inbox" = "spending") {
    const state = await this.positionOf(p.address);
    const ciphertext =
      which === "spending" ? state?.confidentialBalanceSpending : state?.confidentialBalanceInbox;
    return this.book.reconcile(
      p.address,
      which,
      ciphertext,
      this.elgamalOf(p).sk,
      decryptInRange,
      this.cfg.fullRange,
    );
  }

  /** Rebuild a book entry the expensive way — what a lost book costs. */
  async resync(p: Party, which: "spending" | "inbox" = "spending") {
    const state = await this.positionOf(p.address);
    const ciphertext =
      which === "spending" ? state?.confidentialBalanceSpending : state?.confidentialBalanceInbox;
    return this.book.resync(
      p.address,
      which,
      ciphertext,
      this.elgamalOf(p).sk,
      decryptInRange,
      this.cfg.fullRange,
    );
  }

  // ------------------------------------------------- plaintext operations

  /** Opt an account in to the issuance. Public, and a precondition of everything. */
  async authorize(p: Party): Promise<Movement> {
    const { hash } = await this.plaintext(
      { TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: this.cfg.issuanceId },
      p.seed,
      `${p.label} MPTokenAuthorize`,
    );
    return { what: `${p.label} authorized`, hash, amountIsPublic: false, amount: 0 };
  }

  /**
   * The bank pays an account a **public** MPT balance.
   *
   * Step 3 for the Dedicated Account (the whole float) and step 5 for a
   * supplier (a token amount, only so they have something to Convert and
   * therefore a key to register).
   *
   * ⚠ **This amount is public and permanent.** It is a plaintext `Payment`.
   */
  async payPublicly(to: Party, amount: number): Promise<Movement> {
    const { hash } = await this.plaintext(
      {
        TransactionType: "Payment",
        Destination: to.address,
        Amount: { mpt_issuance_id: this.cfg.issuanceId, value: String(amount) },
      },
      this.cfg.bank.seed,
      `public Payment of ${amount} to ${to.label}`,
    );
    return { what: `public payment to ${to.label}`, hash, amountIsPublic: true, amount };
  }

  /**
   * Move a received amount from the inbox into the spendable balance.
   *
   * ⚠ **Not a signer operation**, and that is not an omission: a
   * `ConfidentialMPTMergeInbox` carries no proof and no blinding factor, so
   * there is nothing for the signer to generate. It is signed here with the
   * party's own seed, like any ordinary XRPL transaction.
   */
  async mergeInbox(p: Party): Promise<Movement> {
    const { hash } = await this.plaintext(
      { TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: this.cfg.issuanceId },
      p.seed,
      `${p.label} MergeInbox`,
    );
    // ⚠ The amount is what the inbox held. Recording 0 would put a movement in
    // the log that says nothing moved, on the one transaction whose whole job
    // is to move something.
    const merged = this.book.expected(p.address).inbox;
    this.book.record({ kind: "merge", account: p.address, amount: merged, hash });
    return { what: `${p.label} merged inbox`, hash, amountIsPublic: false, amount: merged };
  }

  /**
   * Sign a plaintext transaction, submit it **once**, and wait for validation.
   *
   * ⚠ Exactly one place signs a plaintext transaction and exactly one place
   * submits one. An earlier shape had `signAndSubmit` submitting and then
   * `submitValidated` submitting the same blob a second time; the second
   * attempt could only ever fail.
   */
  private async plaintext(tx: Record<string, unknown>, seed: string, what: string) {
    const blob = await this.submitter.sign(tx, seed);
    return this.submitter.submitValidated(blob, what);
  }

  // ---------------------------------------------- confidential operations

  /**
   * Step 4 — **the one plaintext moment.** The Dedicated Account converts the
   * whole float in a single `ConfidentialMPTConvert`, which also registers its
   * `HolderEncryptionKey`.
   *
   * ⚠ **The amount is public at this step and that is the intent.** Facility
   * size is what the market and the funders are entitled to see. After this, no
   * plaintext amount appears again until the facility is retired or resized.
   *
   * ⚠ **"Converts once" is OUR rule, not the protocol's.** rippled would accept
   * a second Convert on this account; what it would cost is a second public
   * amount, and the design says there is exactly one.
   */
  async convertFloat(amount: number): Promise<Movement[]> {
    // ⚠ **The guard is derived from the LEDGER, not from a field on this
    // object.** An in-memory flag is reset by every process restart, and this
    // driver is resumable by design — so the flag would have said "not yet
    // converted" on the second run of a facility that had converted. A
    // registered `HolderEncryptionKey` is the durable fact: it can only have
    // been written by a Convert, and it can only be written once.
    const already = await this.positionOf(this.cfg.dedicated.address);
    if (already?.holderEncryptionKey || this.floatConverted) {
      throw new FacilityRefusal(
        "REFUSED_SECOND_CONVERSION",
        "TASK ZERO §9's design rule is that value enters confidentiality ONCE, in aggregate. " +
          "A second Convert is a second public amount. rippled would accept it; this facility " +
          "does not",
      );
    }
    const m = await this.confidential(this.cfg.dedicated, {
      operation: "ConfidentialMPTConvert",
      amount,
      what: "float conversion",
      amountIsPublic: true,
    });
    this.book.record({
      kind: "convert",
      account: this.cfg.dedicated.address,
      amount,
      hash: m.hash,
    });
    // ⚠ **A Convert lands in the INBOX and is not spendable until merged.**
    // Established by the ledger, not by reading: after a validated Convert of
    // 5000, `ConfidentialBalanceSpending` decrypted to 0 and
    // `ConfidentialBalanceInbox` to 5000. Without this the first drawdown
    // refuses for insufficient balance against a float that is sitting there.
    // ⚠ **The merge is RETURNED, not merely awaited.** Its `Movement` was
    // discarded, so the Dedicated Account's post-conversion merge — a validated
    // transaction, hash `3F264EB8…` — sat in the book and was missing from the
    // run record, and every document that counted the run record was one short.
    // `REVIEW-023` found it — **through the book**, which had recorded the merge
    // all along. So the honest form is narrower than the one written here first:
    // a method that returns fewer movements than it made cannot be counted FROM
    // ITS OWN RETURN VALUE. Saying "nobody can check" denied the very evidence
    // that caught it, which round two called out.
    const merged = await this.mergeInbox(this.cfg.dedicated);
    this.floatConverted = true;
    return [m, merged];
  }

  /**
   * Step 5 — enrol a supplier.
   *
   * The bank pays them a token amount publicly and they Convert it, which is
   * what **registers their `HolderEncryptionKey`**. ⚠ Registration happens
   * exactly once and cannot be repeated, and a supplier with no registered key
   * cannot receive a confidential amount **at all** — there is no key to
   * encrypt to, so the Send cannot be built, let alone rejected.
   */
  async enrolSupplier(supplier: Party, tokenAmount: number): Promise<Movement[]> {
    this.checkSeedControlsAddress(supplier);
    if (this.suppliers.has(supplier.address)) {
      throw new FacilityRefusal("REFUSED_ALREADY_ENROLLED", supplier.label);
    }
    const already = await this.positionOf(supplier.address);
    if (already?.holderEncryptionKey) {
      throw new FacilityRefusal(
        "REFUSED_ALREADY_REGISTERED",
        `${supplier.label} already carries a HolderEncryptionKey. Registration happens exactly ` +
          `once and the protocol forbids repeating it`,
      );
    }
    // ⚠ **Registered LAST, after the ledger has confirmed everything.** The
    // first draft set it here, before three ledger operations — so a timeout in
    // any of them left the supplier marked enrolled in memory and not on the
    // ledger, and every retry then hit `REFUSED_ALREADY_ENROLLED`. Found by
    // `REVIEW-022` round two.
    const out: Movement[] = [];
    out.push(await this.authorize(supplier));
    out.push(await this.payPublicly(supplier, tokenAmount));
    const convert = await this.confidential(supplier, {
      operation: "ConfidentialMPTConvert",
      amount: tokenAmount,
      what: `${supplier.label} enrolment convert`,
      amountIsPublic: true,
    });
    this.book.record({
      kind: "convert",
      account: supplier.address,
      amount: tokenAmount,
      hash: convert.hash,
    });
    out.push(convert);
    // The enrolment token lands in the supplier's inbox for the same reason.
    out.push(await this.mergeInbox(supplier));

    // The registered key must be the one the ruled derivation produces, or the
    // facility is tracking a position it cannot read.
    const after = await this.positionOf(supplier.address);
    const expected = this.elgamalOf(supplier).pk;
    if (after?.holderEncryptionKey !== expected) {
      throw new FacilityRefusal(
        "REFUSED_KEY_NOT_DERIVED",
        `${supplier.label} registered ${after?.holderEncryptionKey}, not the derived ${expected}`,
      );
    }
    this.suppliers.set(supplier.address, supplier);
    return out;
  }

  /** Step 6 — a drawdown. Dedicated Account → supplier. **Amount hidden.** */
  async drawdown(supplier: Party, amount: number): Promise<Movement[]> {
    return this.confidentialTransfer(this.cfg.dedicated, supplier, amount, "drawdown");
  }

  /** Step 7 — a repayment. Supplier → Dedicated Account. **Amount hidden.** */
  async repay(supplier: Party, amount: number): Promise<Movement[]> {
    return this.confidentialTransfer(supplier, this.cfg.dedicated, amount, "repayment");
  }

  private async confidentialTransfer(
    from: Party,
    to: Party,
    amount: number,
    what: string,
  ): Promise<Movement[]> {
    // ⚠ **The seed/address invariant is checked HERE too, and it was not.**
    // `confidential()` hands the signer a **seed** while the book and the ledger
    // lookup use the **address**, so a `Party { address: Y, seed: X }` would
    // produce a transaction signed by X and a book entry against Y. The
    // constructor and `enrolSupplier` checked it; these two public entry points
    // did not, and the file's own comment says an address is *"never believed"*.
    // Found by `REVIEW-022`'s Codex leg.
    for (const p of [from, to]) {
      this.checkSeedControlsAddress(p);
      if (
        p.address !== this.cfg.bank.address &&
        p.address !== this.cfg.dedicated.address &&
        !this.suppliers.has(p.address)
      ) {
        throw new FacilityRefusal(
          "REFUSED_UNKNOWN_PARTY",
          `${p.label} (${p.address}) is not the bank, the Dedicated Account or an enrolled ` +
            `supplier of this facility. A movement against a party the facility does not know ` +
            `is a book entry nobody can reconcile`,
        );
      }
    }
    const destination = await this.positionOf(to.address);
    if (!destination?.holderEncryptionKey) {
      throw new FacilityRefusal(
        "REFUSED_DESTINATION_NOT_REGISTERED",
        `${to.label} has no HolderEncryptionKey. There is no key to encrypt to, so this ` +
          `transaction cannot be built — it is not a rejection, it is an impossibility`,
      );
    }
    const have = this.book.expected(from.address).spending;
    if (amount > have) {
      throw new FacilityRefusal(
        "REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE",
        `${what} of ${amount} exceeds ${from.label}'s tracked confidential balance of ${have}`,
      );
    }
    const send = await this.confidential(from, {
      operation: "ConfidentialMPTSend",
      amount,
      destination: to.address,
      what: `${what} ${from.label} → ${to.label}`,
      amountIsPublic: false,
    });
    this.book.record({ kind: "send-out", account: from.address, amount, hash: send.hash });
    this.book.record({ kind: "send-in", account: to.address, amount, hash: send.hash });
    // Received value lands in the INBOX. Merging is a second transaction and
    // the book does not pretend otherwise.
    const merged = await this.mergeInbox(to);
    return [send, merged];
  }

  /**
   * Step 9 — retire or resize. The Dedicated Account converts value back out.
   *
   * ⚠ **Each ConvertBack publishes its OWN amount in the clear** — `MPTAmount`
   * is a plaintext field of every one of them (XLS-0096 §10.3), so retiring in
   * tranches publishes **every tranche size**, not just the net movement in
   * `sfConfidentialOutstandingAmount`. That is `CLAIMS.md` **F-24**, and the
   * walkthrough said the opposite until 2026-08-25.
   */
  async retire(amount: number): Promise<Movement> {
    const have = this.book.expected(this.cfg.dedicated.address).spending;
    if (amount > have) {
      throw new FacilityRefusal(
        "REFUSED_INSUFFICIENT_CONFIDENTIAL_BALANCE",
        `retiring ${amount} exceeds the Dedicated Account's tracked balance of ${have}`,
      );
    }
    const m = await this.confidential(this.cfg.dedicated, {
      operation: "ConfidentialMPTConvertBack",
      amount,
      what: `retire ${amount}`,
      amountIsPublic: true,
    });
    this.book.record({
      kind: "convert-back",
      account: this.cfg.dedicated.address,
      amount,
      hash: m.hash,
    });
    return m;
  }

  /**
   * Every confidential transaction: signed by `signer/`, submitted from here
   * with `tapFailHard`, and **not recorded in the book until it validates**.
   */
  private async confidential(
    p: Party,
    args: {
      operation: "ConfidentialMPTConvert" | "ConfidentialMPTSend" | "ConfidentialMPTConvertBack";
      amount: number;
      destination?: string;
      what: string;
      amountIsPublic: boolean;
    },
  ): Promise<Movement> {
    const session = await SignerSession.start(
      {
        accountSeed: p.seed,
        issuanceId: this.cfg.issuanceId,
        ledgerEndpoint: this.cfg.ledgerEndpoint,
        amountSearchTo: this.cfg.fullRange,
      },
      {
        workDir: `${this.cfg.workRoot}/${p.label}`,
        autoConfirm: this.cfg.autoConfirm,
        quiet: this.cfg.quietSigner,
      },
    );
    try {
      const grant = await session.pair([args.operation]);
      const signed = await session.prepare({
        grant,
        operation: args.operation,
        issuanceId: this.cfg.issuanceId,
        amount: args.amount,
        destination: args.destination,
      });
      // ⚠ `submitValidated` is what checks the VALIDATED metadata; the engine
      // result at submit time is provisional. The check that belongs here is
      // the one only this caller can make: the node and the signer must agree
      // on what was signed.
      const { hash } = await this.submitter.submitValidated(signed.txBlob, args.what);
      if (hash !== signed.hash) {
        throw new LedgerRefusal(
          "REFUSED_HASH_DISAGREEMENT",
          `the signer computed ${signed.hash}, the node reports ${hash}`,
        );
      }
      return { what: args.what, hash, amountIsPublic: args.amountIsPublic, amount: args.amount };
    } finally {
      session.stop();
    }
  }

  // ------------------------------------------------------------ helpers

  accountIdOf(p: Party): string {
    return accountIdHex(p.address);
  }

  get issuanceId(): string {
    return this.cfg.issuanceId;
  }

  get dedicated(): Party {
    return this.cfg.dedicated;
  }

  get bank(): Party {
    return this.cfg.bank;
  }
}
