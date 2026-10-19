/**
 * book.test.ts — the off-ledger balance record, and the cost it exists to avoid.
 *
 * TASK ZERO §9's balance-tracking requirement (R-5, replacing the float cap;
 * `CLAIMS.md` F-8). A confidential balance is recovered by a **linear** search,
 * so the width of the search is the whole cost — and the book is what keeps the
 * width proportional to the movement rather than to the facility.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BookDrift, FacilityBook, Unreadable, type RangeDecryptor } from "../src/book.ts";

const ISSUANCE = "00".repeat(24);
const SK = "AA".repeat(32);
const DEDICATED = "rDedicated";
const SUPPLIER = "rSupplier";

function tempBook(window = 8) {
  const dir = mkdtempSync(join(tmpdir(), "wconf-book-"));
  return {
    dir,
    book: FacilityBook.open(join(dir, "book.json"), ISSUANCE, window),
    path: join(dir, "book.json"),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/**
 * A decryptor that knows the true balance and reports the width it was asked
 * for — which is what makes "the book keeps the search narrow" testable rather
 * than merely stated.
 */
function decryptorFor(truth: Record<string, number>) {
  const widths: number[] = [];
  const decrypt: RangeDecryptor = async (ciphertext, _sk, from, to) => {
    widths.push(to - from + 1);
    const v = truth[ciphertext];
    if (v === undefined) return null;
    return v >= from && v <= to ? v : null;
  };
  return { decrypt, widths };
}

describe("FacilityBook arithmetic", () => {
  test("a received amount lands in the INBOX and is not spendable until merged", () => {
    const { book, cleanup } = tempBook();
    try {
      // ⚠ A Convert lands in the INBOX — established on Devnet 2026-08-25, not
      // by reading — so it takes a merge before anything can be sent.
      book.record({ kind: "convert", account: DEDICATED, amount: 1000, hash: "h0" });
      expect(book.expected(DEDICATED)).toEqual({ spending: 0, inbox: 1000 });
      book.record({ kind: "merge", account: DEDICATED, amount: 1000, hash: "h1" });
      book.record({ kind: "send-out", account: DEDICATED, amount: 250, hash: "h2" });
      book.record({ kind: "send-in", account: SUPPLIER, amount: 250, hash: "h2" });

      expect(book.expected(DEDICATED)).toEqual({ spending: 750, inbox: 0 });
      // ⚠ Not 250 spendable. A `ConfidentialMPTSend` lands in the destination's
      // inbox and a `ConfidentialMPTMergeInbox` is a separate transaction. A
      // book that credited the spendable balance directly would be wrong for
      // exactly as long as the merge was outstanding.
      expect(book.expected(SUPPLIER)).toEqual({ spending: 0, inbox: 250 });

      book.record({ kind: "merge", account: SUPPLIER, amount: 250, hash: "h3" });
      expect(book.expected(SUPPLIER)).toEqual({ spending: 250, inbox: 0 });
    } finally {
      cleanup();
    }
  });

  test("a repayment and a retirement move the balance back the other way", () => {
    const { book, cleanup } = tempBook();
    try {
      book.record({ kind: "convert", account: DEDICATED, amount: 1000, hash: "h0" });
      book.record({ kind: "merge", account: DEDICATED, amount: 1000, hash: "h1" });
      book.record({ kind: "send-out", account: DEDICATED, amount: 400, hash: "h2" });
      book.record({ kind: "send-in", account: SUPPLIER, amount: 400, hash: "h2" });
      book.record({ kind: "merge", account: SUPPLIER, amount: 400, hash: "h3" });
      book.record({ kind: "send-out", account: SUPPLIER, amount: 150, hash: "h4" });
      book.record({ kind: "send-in", account: DEDICATED, amount: 150, hash: "h4" });
      book.record({ kind: "merge", account: DEDICATED, amount: 150, hash: "h5" });
      book.record({ kind: "convert-back", account: DEDICATED, amount: 700, hash: "h6" });

      expect(book.expected(DEDICATED)).toEqual({ spending: 50, inbox: 0 });
      expect(book.expected(SUPPLIER)).toEqual({ spending: 250, inbox: 0 });
    } finally {
      cleanup();
    }
  });

  test("refuses a merge recorded for an amount the inbox does not hold", () => {
    // ⚠ The movement log has to explain the position it produced. A merge
    // recorded as 0 — which is what the first draft passed — leaves a log
    // saying nothing moved on the one transaction whose whole job is to move
    // something.
    const { book, cleanup } = tempBook();
    try {
      book.record({ kind: "send-in", account: SUPPLIER, amount: 40, hash: "h1" });
      expect(() =>
        book.record({ kind: "merge", account: SUPPLIER, amount: 0, hash: "h2" }),
      ).toThrow(/inbox/);
      expect(book.expected(SUPPLIER)).toEqual({ spending: 0, inbox: 40 });
      book.record({ kind: "merge", account: SUPPLIER, amount: 40, hash: "h2" });
      expect(book.expected(SUPPLIER)).toEqual({ spending: 40, inbox: 0 });
    } finally {
      cleanup();
    }
  });

  test("refuses a movement that would take a position negative", () => {
    const { book, cleanup } = tempBook();
    try {
      book.record({ kind: "convert", account: DEDICATED, amount: 10, hash: "h1" });
      book.record({ kind: "merge", account: DEDICATED, amount: 10, hash: "m1" });
      expect(() =>
        book.record({ kind: "send-out", account: DEDICATED, amount: 11, hash: "h2" }),
      ).toThrow(/negative/);
    } finally {
      cleanup();
    }
  });

  test("survives a reopen, because a book that is not on disk is not a book", () => {
    const { book, path, cleanup } = tempBook();
    try {
      book.record({ kind: "convert", account: DEDICATED, amount: 42, hash: "h1" });
      book.record({ kind: "merge", account: DEDICATED, amount: 42, hash: "m1" });
      const reopened = FacilityBook.open(path, ISSUANCE);
      expect(reopened.expected(DEDICATED).spending).toBe(42);
      expect(reopened.movements).toHaveLength(2); // the convert and its merge
    } finally {
      cleanup();
    }
  });

  test("refuses to be opened for a different issuance", () => {
    const { book, path, cleanup } = tempBook();
    try {
      book.record({ kind: "convert", account: DEDICATED, amount: 1, hash: "h1" });
      book.record({ kind: "merge", account: DEDICATED, amount: 1, hash: "m1" });
      expect(() => FacilityBook.open(path, "11".repeat(24))).toThrow(/not/);
    } finally {
      cleanup();
    }
  });
});

describe("reconcile — what the book is actually for", () => {
  test("a correct book searches a window, not the facility", async () => {
    const { book, cleanup } = tempBook(8);
    try {
      book.record({ kind: "convert", account: DEDICATED, amount: 5000, hash: "h1" });
      book.record({ kind: "merge", account: DEDICATED, amount: 5000, hash: "m1" });
      const { decrypt, widths } = decryptorFor({ CT: 5000 });
      const r = await book.reconcile(DEDICATED, "spending", "CT", SK, decrypt, 1_000_000);
      expect(r.actual).toBe(5000);
      expect(r.widened).toBe(false);
      expect(r.searchWidth).toBe(17); // 8 either side, inclusive
      // The number that matters: 17 candidate points instead of 1,000,001.
      expect(widths).toEqual([17]);
    } finally {
      cleanup();
    }
  });

  test("drift is DETECTED, loudly, and reports both numbers", async () => {
    const { book, cleanup } = tempBook(8);
    try {
      book.record({ kind: "convert", account: DEDICATED, amount: 5000, hash: "h1" });
      book.record({ kind: "merge", account: DEDICATED, amount: 5000, hash: "m1" });
      const { decrypt } = decryptorFor({ CT: 4999 }); // one unit inside the window
      await expect(
        book.reconcile(DEDICATED, "spending", "CT", SK, decrypt, 1_000_000),
      ).rejects.toBeInstanceOf(BookDrift);
    } finally {
      cleanup();
    }
  });

  test("a miss inside the window widens to the full range and STILL refuses", async () => {
    // The widened search is what a lost book costs on every read: linear in the
    // width, with no sublinear fallback shipped at the pinned mpt-crypto `1.0.4`
    // (F-8; upstream added one in `1.0.5`, E-297). The facility pays it
    // once, to say what the true balance is, and then refuses.
    //
    // ⚠ Asserted in WIDTHS. A per-iteration time is a benchmark number and P-8
    // forbids restating one without its hardware, parameter set and
    // methodology — which live in `benchmarks-2026-08-16.md` §4.
    const { book, cleanup } = tempBook(8);
    try {
      book.record({ kind: "convert", account: DEDICATED, amount: 5000, hash: "h1" });
      book.record({ kind: "merge", account: DEDICATED, amount: 5000, hash: "m1" });
      const { decrypt, widths } = decryptorFor({ CT: 12 });
      const err = await book
        .reconcile(DEDICATED, "spending", "CT", SK, decrypt, 100_000)
        .catch((e) => e);
      expect(err).toBeInstanceOf(BookDrift);
      expect(err.detail.actual).toBe(12);
      expect(err.detail.widened).toBe(true);
      expect(widths).toEqual([17, 100_001]);
    } finally {
      cleanup();
    }
  });

  test("a balance outside the full range is REFUSED, never guessed", async () => {
    const { book, cleanup } = tempBook(8);
    try {
      book.record({ kind: "convert", account: DEDICATED, amount: 5000, hash: "h1" });
      book.record({ kind: "merge", account: DEDICATED, amount: 5000, hash: "m1" });
      const { decrypt } = decryptorFor({ CT: 999_999 });
      await expect(
        book.reconcile(DEDICATED, "spending", "CT", SK, decrypt, 100),
      ).rejects.toBeInstanceOf(Unreadable);
    } finally {
      cleanup();
    }
  });

  test("no ciphertext is consistent only with an expectation of zero", async () => {
    const { book, cleanup } = tempBook();
    try {
      const { decrypt } = decryptorFor({});
      const r = await book.reconcile(SUPPLIER, "spending", undefined, SK, decrypt, 1000);
      expect(r.actual).toBe(0);
      expect(r.searchWidth).toBe(0);

      book.record({ kind: "convert", account: SUPPLIER, amount: 7, hash: "h1" });
      book.record({ kind: "merge", account: SUPPLIER, amount: 7, hash: "m1" });
      await expect(
        book.reconcile(SUPPLIER, "spending", undefined, SK, decrypt, 1000),
      ).rejects.toBeInstanceOf(BookDrift);
    } finally {
      cleanup();
    }
  });
});

describe("resync — the cost of losing the book", () => {
  test("rebuilds an expectation, and the width it paid is the facility's size", async () => {
    const { book, cleanup } = tempBook();
    try {
      const { decrypt, widths } = decryptorFor({ CT: 4321 });
      const r = await book.resync(DEDICATED, "spending", "CT", SK, decrypt, 50_000);
      expect(r.value).toBe(4321);
      expect(r.searchWidth).toBe(50_001);
      expect(widths).toEqual([50_001]);
      // And the rebuilt expectation now reconciles cheaply.
      const again = await book.reconcile(DEDICATED, "spending", "CT", SK, decrypt, 50_000);
      expect(again.searchWidth).toBe(17);
    } finally {
      cleanup();
    }
  });
});
