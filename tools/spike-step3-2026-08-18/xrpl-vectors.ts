/**
 * xrpl-vectors.ts — the generator for `signer/tests/xrpl_vectors.rs`.
 *
 * Architecture §6 step 3 puts XRPL serialisation and signing inside the Rust
 * signer. Nothing in this repository had ever produced XRPL bytes from Rust, so
 * the encoder needed something to be wrong against. These vectors are it.
 *
 * **Committed under standing prohibition P-8:** a value whose generator is
 * unavailable is not checkable. This file is the generator; `xrpl-vectors.json`
 * is its output; the Rust test fails if the two disagree.
 *
 * Three independent implementations this project did not write produce every
 * expected value here:
 *
 *   - `ripple-binary-codec@2.9.0`   — canonical serialisation. CLAIMS.md E-46
 *                                      records it verified against a live
 *                                      node's `server_definitions` across all
 *                                      381 fields.
 *   - `ripple-keypairs@2.0.0`       — family-seed derivation and ECDSA.
 *   - `ripple-address-codec@5.0.1`  — base58check.
 *
 * Run it two ways:
 *
 *   bun tools/spike-step3-2026-08-18/xrpl-vectors.ts          # check, exit 1 on drift
 *   bun tools/spike-step3-2026-08-18/xrpl-vectors.ts --write  # regenerate
 *
 * ⚠ **`--write` is how a wrong encoder gets blessed.** Regenerate only when the
 * codec version changes, and say so in the commit. The whole value of a vector
 * is that it was not written by the thing it tests.
 *
 * No network. No keys that matter. Devnet only, and this file does not submit.
 */
import { encode, encodeForSigning } from "ripple-binary-codec";
import { deriveKeypair, deriveAddress, sign } from "ripple-keypairs";
import { decodeAccountID, encodeSeed } from "ripple-address-codec";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("./xrpl-vectors.json", import.meta.url).pathname;

const hex = (b: Uint8Array | Buffer) => Buffer.from(b).toString("hex").toUpperCase();
/// An arbitrary fixed message, signed by every key below. Nothing about it is
/// a transaction; it exists to pin what each algorithm hashes.
const PROBE = "5354580012005821000000022200000000";
const rep = (byte: number, n: number) => hex(Buffer.alloc(n, byte));

// --- 1. seeds -------------------------------------------------------------
// Deterministic entropy so the vectors are stable. These are NOT keys anybody
// should fund: the entropy is a constant published in this file.
// Both algorithms. Devnet's faucet hands out ed25519, so a signer that only
// spoke secp256k1 could not sign for any account this project already has.
const entropies = [0x00, 0x11, 0x7f, 0xff];
const keys = [
  ...entropies.map((b) => ({ b, algo: "secp256k1" as const })),
  ...entropies.map((b) => ({ b, algo: "ed25519" as const })),
].map(({ b, algo }) => {
  const entropy = Buffer.alloc(16, b);
  const seed = encodeSeed(entropy, algo);
  const kp = deriveKeypair(seed);
  const address = deriveAddress(kp.publicKey);
  return {
    seed,
    algorithm: algo,
    entropy: hex(entropy),
    public_key: kp.publicKey.toUpperCase(),
    account_id: hex(decodeAccountID(address)),
    address,
    // The same message signed by both, so the Rust side can pin that
    // secp256k1 signs SHA512Half(message) and ed25519 signs the message.
    signature_over_probe: sign(PROBE, kp.privateKey),
  };
});

// --- 2. transactions ------------------------------------------------------
// Field values are structurally correct — right lengths, right shapes — but
// they are NOT real proofs. These vectors pin the ENCODER, not the prover;
// `signer/tests/prover_pristine.rs` pins the prover.
const holder = keys[0];
const dest = keys[1];
const ed_holder = keys.find((k) => k.algorithm === "ed25519")!;

const txs: Record<string, any> = {
  send: {
    TransactionType: "ConfidentialMPTSend",
    Account: holder.address,
    Destination: dest.address,
    MPTokenIssuanceID: rep(0x5a, 24),
    SenderEncryptedAmount: rep(0x01, 66),
    DestinationEncryptedAmount: rep(0x02, 66),
    IssuerEncryptedAmount: rep(0x03, 66),
    AmountCommitment: rep(0x04, 33),
    BalanceCommitment: rep(0x05, 33),
    ZKProof: rep(0x06, 946),
    Sequence: 12345,
    Fee: "5000",
    Flags: 0,
    LastLedgerSequence: 9876543,
    NetworkID: 2,
    SigningPubKey: holder.public_key,
  },
  convert: {
    TransactionType: "ConfidentialMPTConvert",
    Account: holder.address,
    MPTokenIssuanceID: rep(0x5a, 24),
    MPTAmount: "100",
    HolderEncryptionKey: rep(0x07, 33),
    HolderEncryptedAmount: rep(0x08, 66),
    IssuerEncryptedAmount: rep(0x09, 66),
    BlindingFactor: rep(0x0a, 32),
    ZKProof: rep(0x0b, 64),
    Sequence: 1,
    Fee: "10",
    Flags: 0,
    LastLedgerSequence: 100,
    NetworkID: 2,
    SigningPubKey: holder.public_key,
  },
  // A Send WITH an auditor. The earlier version of this comment claimed the
  // auditor's ciphertext "is not a separate field — the shape is identical",
  // which was wrong: `AuditorEncryptedAmount` is Blob nth=43, and the signer
  // was silently dropping it (CLAIMS.md F-22). This vector is what pins the
  // four-field encoding.
  send_with_auditor: {
    TransactionType: "ConfidentialMPTSend",
    Account: holder.address,
    Destination: dest.address,
    MPTokenIssuanceID: rep(0x5a, 24),
    SenderEncryptedAmount: rep(0x01, 66),
    DestinationEncryptedAmount: rep(0x02, 66),
    IssuerEncryptedAmount: rep(0x03, 66),
    AuditorEncryptedAmount: rep(0x0c, 66),
    AmountCommitment: rep(0x04, 33),
    BalanceCommitment: rep(0x05, 33),
    ZKProof: rep(0x06, 946),
    Sequence: 999,
    Fee: "5000",
    Flags: 0,
    LastLedgerSequence: 9876543,
    NetworkID: 2,
    SigningPubKey: holder.public_key,
  },
  send_large_fee: {
    TransactionType: "ConfidentialMPTSend",
    Account: dest.address,
    Destination: holder.address,
    MPTokenIssuanceID: rep(0xff, 24),
    SenderEncryptedAmount: rep(0xf1, 66),
    DestinationEncryptedAmount: rep(0xf2, 66),
    IssuerEncryptedAmount: rep(0xf3, 66),
    AmountCommitment: rep(0xf4, 33),
    BalanceCommitment: rep(0xf5, 33),
    ZKProof: rep(0xf6, 946),
    Sequence: 4294967295,
    Fee: "1000000",
    Flags: 2147483648,
    LastLedgerSequence: 1,
    NetworkID: 2,
    SigningPubKey: dest.public_key,
  },
};

// A fourth transaction, signed with ed25519, so the whole path — serialise,
// sign, embed — is pinned for both algorithms rather than only for secp256k1.
txs.send_ed25519 = {
  ...txs.send,
  Account: ed_holder.address,
  SigningPubKey: ed_holder.public_key,
  Sequence: 7,
};

const signerOf: Record<string, string> = {
  send: holder.seed,
  convert: holder.seed,
  send_large_fee: dest.seed,
  send_with_auditor: holder.seed,
  send_ed25519: ed_holder.seed,
};

const transactions = Object.entries(txs).map(([name, tx]) => {
  const kp = deriveKeypair(signerOf[name]);
  const signing_hex = encodeForSigning(tx);
  const signature = sign(signing_hex, kp.privateKey);
  const signed = { ...tx, TxnSignature: signature };
  const blob = encode(signed);
  return {
    name,
    tx,
    signing_hex,          // "STX\0" prefix included, as encodeForSigning emits
    unsigned_hex: encode(tx),
    signature,
    signed_hex: blob,
  };
});

// --- 3. VL prefix boundaries ---------------------------------------------
// The three ranges of XRPL's length prefix. Encoding a Blob of each length and
// slicing off the field header exposes the prefix bytes the codec chose.
const vl = [1, 192, 193, 194, 918, 12480, 12481].map((len) => {
  // A non-repeating body, so its hex occurs exactly once and on an even
  // nibble boundary. A run of one repeated byte can match half a byte early.
  const body = Buffer.from(Array.from({ length: len }, (_, i) => (i * 37 + 11) & 0xff));
  // MemoData is field 13 of type Blob (7) — a one-byte header, so everything
  // after the first byte of this fragment is the VL prefix plus the body.
  const enc = encode({
    TransactionType: "Payment",
    Account: holder.address,
    Destination: dest.address,
    Amount: "1",
    Fee: "10",
    Sequence: 1,
    SigningPubKey: "",
    Memos: [{ Memo: { MemoData: hex(body) } }],
  });
  const marker = hex(body);
  let at = -1;
  for (let i = 0; i + marker.length <= enc.length; i += 2) {
    if (enc.startsWith(marker, i)) { at = i; break; }
  }
  if (at < 0) throw new Error(`could not locate the ${len}-byte blob in the encoding`);
  // Walk back from the body to the field header byte for MemoData (0x7D).
  let start = at / 2;
  let headerAt = -1;
  for (let back = 1; back <= 4; back++) {
    if (parseInt(enc.slice((start - back) * 2, (start - back) * 2 + 2), 16) === 0x7d) {
      headerAt = start - back;
      break;
    }
  }
  if (headerAt < 0) throw new Error(`could not locate the MemoData header for len ${len}`);
  return { len, prefix: enc.slice((headerAt + 1) * 2, start * 2) };
});

// --- 4. field headers -----------------------------------------------------
// Every field the signer serialises, with the header bytes the codec produces
// for it. Derived by encoding a one-field object is not possible for all of
// them, so this reads the codec's own definitions and applies its documented
// rule — the SAME table CLAIMS.md E-46 verified against a node.
const defs = JSON.parse(
  readFileSync(
    new URL("../../node_modules/ripple-binary-codec/dist/enums/definitions.json", import.meta.url).pathname,
    "utf8",
  ),
);
const typeCode: Record<string, number> = defs.TYPES;
const wanted = [
  "TransactionType", "NetworkID", "Flags", "Sequence", "LastLedgerSequence",
  "MPTAmount", "BlindingFactor", "Fee", "SigningPubKey", "TxnSignature",
  "HolderEncryptionKey", "ZKProof", "HolderEncryptedAmount",
  "IssuerEncryptedAmount", "SenderEncryptedAmount", "DestinationEncryptedAmount",
  "AuditorEncryptedAmount", "AmountCommitment", "BalanceCommitment",
  "Account", "Destination", "MPTokenIssuanceID",
];
const fields = defs.FIELDS.filter(([n]: [string, any]) => wanted.includes(n)).map(
  ([name, f]: [string, any]) => ({
    name,
    type: f.type,
    type_code: typeCode[f.type],
    nth: f.nth,
    is_vl_encoded: f.isVLEncoded,
    is_signing_field: f.isSigningField,
  }),
);

const tx_types = Object.fromEntries(
  Object.entries(defs.TRANSACTION_TYPES).filter(([k]) => k.startsWith("ConfidentialMPT")),
);

// --- output ---------------------------------------------------------------
const doc = {
  _note:
    "Generated by tools/spike-step3-2026-08-18/xrpl-vectors.ts. Do not hand-edit. " +
    "Expected values come from ripple-binary-codec@2.9.0, ripple-keypairs@2.0.0 " +
    "and ripple-address-codec@5.0.1 — not from this project.",
  codec_version: JSON.parse(
    readFileSync(
      new URL("../../node_modules/ripple-binary-codec/package.json", import.meta.url).pathname,
      "utf8",
    ),
  ).version,
  keys,
  fields,
  tx_types,
  transactions,
  vl,
};

const serialized = JSON.stringify(doc, null, 2) + "\n";

if (process.argv.includes("--write")) {
  writeFileSync(OUT, serialized);
  console.log(`wrote ${OUT}`);
  console.log(`  ${keys.length} keys, ${fields.length} fields, ${transactions.length} transactions, ${vl.length} VL cases`);
  process.exit(0);
}

if (!existsSync(OUT)) {
  console.error(`${OUT} does not exist. Run with --write.`);
  process.exit(1);
}
const onDisk = readFileSync(OUT, "utf8");
if (onDisk !== serialized) {
  console.error("DRIFT: the committed vectors no longer match what the codec produces.");
  console.error("Either the codec changed or the vectors were hand-edited. Investigate before --write.");
  process.exit(1);
}
console.log(`OK: ${OUT} matches ripple-binary-codec@${doc.codec_version} and ripple-keypairs.`);
console.log(`  ${keys.length} keys, ${fields.length} fields, ${transactions.length} transactions, ${vl.length} VL cases`);
