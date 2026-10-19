/**
 * Does the newly-published @xrplf/mpt-crypto@0.1.0 reproduce, byte for byte,
 * the proof material of the ConfidentialMPTConvert this session got accepted?
 */
import * as mpt from "@xrplf/mpt-crypto";

const tool = (args: string[]) => {
  const p = Bun.spawnSync(["/tmp/wconf/mptool", ...args]);
  if (p.exitCode !== 0) throw new Error(p.stderr.toString());
  return p.stdout.toString().trim().split("\n");
};

// exact inputs of the accepted on-chain Convert
const ACC = "382FF0B4DE2E609AAFEAC1FA34B1916EB00A9A55";
const ISS = "00453A78D67EB7E60002C33AAD59E7F544C136A8D30F5D52";
const SEQ = 4536955;
const ONCHAIN_CTX = "9B3DB64363ACE665B6C604E94FF9DB0EF14793741ADBACD40803271CA9663F12";

const ctx = await mpt.getConvertContextHash(ACC, ISS, SEQ);
console.log(`npm  getConvertContextHash -> ${ctx}`);
console.log(`on-chain transaction used  -> ${ONCHAIN_CTX}`);
console.log(`  MATCH: ${ctx === ONCHAIN_CTX}\n`);

// keygen is not in the package (deliberate) — take keys from the native tool
const [sk, pk] = tool(["keygen"]);
const proof = await mpt.getConvertProof(pk, sk, ctx);
console.log(`npm  getConvertProof (${proof.length / 2} B) -> ${proof.slice(0, 48)}...`);
console.log(`  verified by native library: ${tool(["verify-convert", proof, pk, ctx])[0]}`);

const r = await mpt.generateBlindingFactor();
const ct = await mpt.encryptAmount(250n, pk, r);
console.log(`\nnpm  encryptAmount(250)  -> ${ct.slice(0, 40)}...`);
console.log(`  native encrypt, same r, identical: ${tool(["encrypt", "250", pk, r])[0] === ct}`);
console.log(`  native decrypt:                    ${tool(["decrypt", ct, sk, "0", "1000"])[0]}`);

console.log(`\nkeypair generation exported by the package? ${"generateKeypair" in mpt || "mptGenerateKeypair" in mpt ? "yes" : "NO — must come from elsewhere"}`);
console.log(`exported names: ${Object.keys(mpt).join(", ")}`);
