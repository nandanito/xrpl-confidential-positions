/**
 * wasm-test.ts — does the upstream WASM build work end to end?
 *
 * Generates a ConfidentialMPTConvert proof inside the WASM module and verifies
 * it BOTH in WASM and in the independently-built native library. Cross-path
 * agreement is the real test; self-verification alone would prove nothing.
 */
const { default: MptCrypto } = await import("/tmp/wconf/wasm-out-606/mpt_crypto.js");
const M: any = await MptCrypto();

const hex = (u: Uint8Array) => Buffer.from(u).toString("hex").toUpperCase();
const unhex = (s: string) => Uint8Array.from(Buffer.from(s, "hex"));
const alloc = (n: number) => M._malloc(n);
const put = (p: number, b: Uint8Array) => M.HEAPU8.set(b, p);
const get = (p: number, n: number) => new Uint8Array(M.HEAPU8.subarray(p, p + n));

console.log("exports present:");
for (const f of ["_mpt_get_convert_proof", "_mpt_verify_convert_proof", "_mpt_get_convert_context_hash",
                 "_mpt_encrypt_amount", "_mpt_decrypt_amount", "_mpt_generate_blinding_factor",
                 "_mpt_generate_keypair", "_mpt_get_confidential_send_proof"]) {
  console.log(`  ${f.padEnd(34)} ${typeof M[f] === "function" ? "yes" : "NO"}`);
}

// Keys must come from elsewhere: mpt_generate_keypair is deliberately not exported.
const tool = (args: string[]) => {
  const p = Bun.spawnSync(["/tmp/wconf/mptool", ...args]);
  if (p.exitCode !== 0) throw new Error(p.stderr.toString());
  return p.stdout.toString().trim().split("\n");
};
const [sk, pk] = tool(["keygen"]);
const acc = "382FF0B4DE2E609AAFEAC1FA34B1916EB00A9A55";
const iss = "00453A78D67EB7E60002C33AAD59E7F544C136A8D30F5D52";
const SEQ = 4536955;

// --- context hash in WASM (structs are passed byval -> pointer on wasm32) ---
const pAcc = alloc(20); put(pAcc, unhex(acc));
const pIss = alloc(24); put(pIss, unhex(iss));
const pHash = alloc(32);
let rc = M._mpt_get_convert_context_hash(pAcc, pIss, SEQ, pHash);
const wasmHash = hex(get(pHash, 32));
console.log(`\nWASM  convert_context_hash rc=${rc} -> ${wasmHash}`);
const [nativeHash] = tool(["convert-ctx", acc, iss, String(SEQ)]);
console.log(`native convert_context_hash        -> ${nativeHash}`);
console.log(`  context hash agreement: ${wasmHash === nativeHash ? "MATCH" : "*** MISMATCH ***"}`);

// --- proof in WASM, verified in WASM and natively ---
const pPk = alloc(33); put(pPk, unhex(pk));
const pSk = alloc(32); put(pSk, unhex(sk));
const pProof = alloc(64);
rc = M._mpt_get_convert_proof(pPk, pSk, pHash, pProof);
const wasmProof = hex(get(pProof, 64));
console.log(`\nWASM  get_convert_proof rc=${rc} -> ${wasmProof}`);
console.log(`  verified in WASM:   ${M._mpt_verify_convert_proof(pProof, pPk, pHash) === 0 ? "OK" : "FAIL"}`);
console.log(`  verified natively:  ${tool(["verify-convert", wasmProof, pk, wasmHash])[0]}`);

// --- native proof, verified in WASM (the other direction) ---
const [nativeProof] = tool(["convert-proof", pk, sk, nativeHash]);
const pProof2 = alloc(64); put(pProof2, unhex(nativeProof));
console.log(`\nnative proof verified in WASM: ${M._mpt_verify_convert_proof(pProof2, pPk, pHash) === 0 ? "OK" : "FAIL"}`);

// --- ElGamal encrypt in WASM, decrypt natively ---
const pR = alloc(32);
// ⚠ **This calls upstream's `mpt_generate_blinding_factor` DELIBERATELY.**
// `CLAIMS.md` E-76's migration moved every transaction-building harness to the
// ruled derivation in `tools/wconf-randomness.ts`. This file is exempt because
// it is testing the **WASM export surface**, and this symbol is one of the
// exports under test — a harness that stopped calling it would stop testing it.
// Nothing here is submitted to a ledger.
M._mpt_generate_blinding_factor(pR);
const r = hex(get(pR, 32));
const pCt = alloc(66);
rc = M._mpt_encrypt_amount(777n, pPk, pR, pCt);
const wasmCt = hex(get(pCt, 66));
console.log(`\nWASM  encrypt_amount(777) rc=${rc} -> ${wasmCt.slice(0, 40)}...`);
console.log(`  decrypted natively: ${tool(["decrypt", wasmCt, sk, "0", "2000"])[0]}`);
console.log(`  native encrypt with same r identical: ${tool(["encrypt", "777", pk, r])[0] === wasmCt}`);

// --- nonce behaviour inside WASM: two proofs, identical statement ---
const pA = alloc(64), pB = alloc(64);
M._mpt_get_convert_proof(pPk, pSk, pHash, pA);
M._mpt_get_convert_proof(pPk, pSk, pHash, pB);
console.log(`\nWASM nonce: two proofs over an identical statement are ${hex(get(pA, 64)) === hex(get(pB, 64)) ? "BYTE-IDENTICAL" : "DIFFERENT (hedged RNG live under wasm)"}`);
