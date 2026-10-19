/*
 * mptool.c — throwaway CLI over mpt-crypto for the W-CONF Devnet spike.
 *
 * Ugly on purpose. Hex in on argv, hex out on stdout, one line per result.
 * The TS driver shells out to this because the WASM path does not export
 * mpt_generate_keypair and we need throwaway ElGamal keys.
 *
 * NOT library code. Do not generalise. Do not keep.
 */
#include <mpt_protocol.h>
#include <secp256k1.h>
#include <secp256k1_mpt.h>
#include <utility/mpt_utility.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int hex2bin(const char *h, unsigned char *out, size_t expect) {
  size_t n = strlen(h);
  if (n != expect * 2) {
    fprintf(stderr, "hex length %zu, expected %zu chars\n", n, expect * 2);
    return 0;
  }
  for (size_t i = 0; i < expect; i++) {
    unsigned int b;
    if (sscanf(h + 2 * i, "%2x", &b) != 1) return 0;
    out[i] = (unsigned char)b;
  }
  return 1;
}

static void put(const unsigned char *b, size_t n) {
  for (size_t i = 0; i < n; i++) printf("%02X", b[i]);
  printf("\n");
}

#define NEED(k) do { if (argc < (k)) { fprintf(stderr, "not enough args for %s\n", cmd); return 2; } } while (0)

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "usage: mptool <cmd> [args]\n"); return 2; }
  const char *cmd = argv[1];
  secp256k1_context *ctx = mpt_secp256k1_context();

  if (!strcmp(cmd, "keygen")) {
    unsigned char sk[32], pk[33];
    if (mpt_generate_keypair(sk, pk) != 0) return 1;
    put(sk, 32); put(pk, 33);
    return 0;
  }

  if (!strcmp(cmd, "blinding")) {
    unsigned char r[32];
    if (mpt_generate_blinding_factor(r) != 0) return 1;
    put(r, 32);
    return 0;
  }

  /* encrypt <amount> <pub33> <blinding32> -> 66B ciphertext */
  if (!strcmp(cmd, "encrypt")) {
    NEED(5);
    unsigned char pk[33], r[32], ct[66];
    uint64_t amt = strtoull(argv[2], NULL, 10);
    if (!hex2bin(argv[3], pk, 33) || !hex2bin(argv[4], r, 32)) return 2;
    if (mpt_encrypt_amount(amt, pk, r, ct) != 0) return 1;
    put(ct, 66);
    return 0;
  }

  /* decrypt <ct66> <priv32> <lo> <hi> -> amount */
  if (!strcmp(cmd, "decrypt")) {
    NEED(6);
    unsigned char ct[66], sk[32];
    uint64_t out = 0;
    if (!hex2bin(argv[2], ct, 66) || !hex2bin(argv[3], sk, 32)) return 2;
    int rc = mpt_decrypt_amount(ct, sk, &out, strtoull(argv[4], NULL, 10),
                                strtoull(argv[5], NULL, 10));
    if (rc != 0) { fprintf(stderr, "decrypt rc=%d\n", rc); return 1; }
    printf("%llu\n", (unsigned long long)out);
    return 0;
  }

  /* convert-ctx <account20> <issuance24> <sequence> -> 32B */
  if (!strcmp(cmd, "convert-ctx")) {
    NEED(5);
    account_id acc; mpt_issuance_id iss; unsigned char h[32];
    if (!hex2bin(argv[2], acc.bytes, 20) || !hex2bin(argv[3], iss.bytes, 24)) return 2;
    if (mpt_get_convert_context_hash(acc, iss, (uint32_t)strtoul(argv[4], NULL, 10), h) != 0) return 1;
    put(h, 32);
    return 0;
  }

  /* convert-proof <pub33> <priv32> <ctxhash32> -> 64B */
  if (!strcmp(cmd, "convert-proof")) {
    NEED(5);
    unsigned char pk[33], sk[32], h[32], proof[64];
    if (!hex2bin(argv[2], pk, 33) || !hex2bin(argv[3], sk, 32) || !hex2bin(argv[4], h, 32)) return 2;
    if (mpt_get_convert_proof(pk, sk, h, proof) != 0) return 1;
    put(proof, 64);
    return 0;
  }

  /* verify-convert <proof64> <pub33> <ctxhash32> */
  if (!strcmp(cmd, "verify-convert")) {
    NEED(5);
    unsigned char proof[64], pk[33], h[32];
    if (!hex2bin(argv[2], proof, 64) || !hex2bin(argv[3], pk, 33) || !hex2bin(argv[4], h, 32)) return 2;
    printf("%s\n", mpt_verify_convert_proof(proof, pk, h) == 0 ? "OK" : "FAIL");
    return 0;
  }

  /* enczero <pub33> <account20> <issuance24> -> 66B canonical EncZero (F-1) */
  if (!strcmp(cmd, "enczero")) {
    NEED(5);
    unsigned char pkb[33], acc[20], iss[24], out[66];
    secp256k1_pubkey pk, c1, c2;
    if (!hex2bin(argv[2], pkb, 33) || !hex2bin(argv[3], acc, 20) || !hex2bin(argv[4], iss, 24)) return 2;
    if (!secp256k1_ec_pubkey_parse(ctx, &pk, pkb, 33)) return 1;
    if (!generate_canonical_encrypted_zero(ctx, &c1, &c2, &pk, acc, iss)) return 1;
    if (!mpt_serialize_ec_pair(&c1, &c2, out)) return 1;
    put(out, 66);
    return 0;
  }

  /* send-ctx <acc20> <iss24> <seq> <dest20> <version> -> 32B */
  if (!strcmp(cmd, "send-ctx")) {
    NEED(7);
    account_id acc, dest; mpt_issuance_id iss; unsigned char h[32];
    if (!hex2bin(argv[2], acc.bytes, 20) || !hex2bin(argv[3], iss.bytes, 24) ||
        !hex2bin(argv[5], dest.bytes, 20)) return 2;
    if (mpt_get_send_context_hash(acc, iss, (uint32_t)strtoul(argv[4], NULL, 10), dest,
                                  (uint32_t)strtoul(argv[6], NULL, 10), h) != 0) return 1;
    put(h, 32);
    return 0;
  }

  /* pedersen <amount> <blinding32> -> 33B */
  if (!strcmp(cmd, "pedersen")) {
    NEED(4);
    unsigned char r[32], c[33];
    if (!hex2bin(argv[3], r, 32)) return 2;
    if (mpt_get_pedersen_commitment(strtoull(argv[2], NULL, 10), r, c) != 0) return 1;
    put(c, 33);
    return 0;
  }

  /* elgamal-add / elgamal-sub <a66> <b66> -> 66B */
  if (!strcmp(cmd, "elgamal-add") || !strcmp(cmd, "elgamal-sub")) {
    NEED(4);
    unsigned char a[66], b[66], out[66];
    secp256k1_pubkey a1, a2, b1, b2, r1, r2;
    if (!hex2bin(argv[2], a, 66) || !hex2bin(argv[3], b, 66)) return 2;
    if (!mpt_make_ec_pair(a, &a1, &a2) || !mpt_make_ec_pair(b, &b1, &b2)) return 1;
    int ok = !strcmp(cmd, "elgamal-add")
      ? secp256k1_elgamal_add(ctx, &r1, &r2, &a1, &a2, &b1, &b2)
      : secp256k1_elgamal_subtract(ctx, &r1, &r2, &a1, &a2, &b1, &b2);
    if (!ok || !mpt_serialize_ec_pair(&r1, &r2, out)) return 1;
    put(out, 66);
    return 0;
  }

  /*
   * send-proof <priv32> <pub33> <amount> <txblind32> <ctxhash32> <amtcommit33>
   *            <balpc33> <balamount> <balct66> <balrho32>
   *            <n> <p0pub33> <p0ct66> ... -> 946B
   */
  if (!strcmp(cmd, "send-proof")) {
    NEED(13);
    unsigned char priv[32], pub[33], txb[32], h[32], amtc[33];
    uint64_t amount = strtoull(argv[4], NULL, 10);
    mpt_pedersen_proof_params bp;
    memset(&bp, 0, sizeof(bp));

    if (!hex2bin(argv[2], priv, 32) || !hex2bin(argv[3], pub, 33) ||
        !hex2bin(argv[5], txb, 32) || !hex2bin(argv[6], h, 32) ||
        !hex2bin(argv[7], amtc, 33)) return 2;
    if (!hex2bin(argv[8], bp.pedersen_commitment, 33)) return 2;
    bp.amount = strtoull(argv[9], NULL, 10);
    if (!hex2bin(argv[10], bp.ciphertext, 66) || !hex2bin(argv[11], bp.blinding_factor, 32)) return 2;

    size_t n = (size_t)strtoul(argv[12], NULL, 10);
    if (n < 3 || n > 4) { fprintf(stderr, "n must be 3 or 4\n"); return 2; }
    NEED((int)(13 + 2 * n));
    mpt_confidential_participant parts[4];
    memset(parts, 0, sizeof(parts));
    for (size_t i = 0; i < n; i++) {
      if (!hex2bin(argv[13 + 2 * i], parts[i].pubkey, 33)) return 2;
      if (!hex2bin(argv[14 + 2 * i], parts[i].ciphertext, 66)) return 2;
    }

    unsigned char proof[946];
    size_t plen = sizeof(proof);
    if (mpt_get_confidential_send_proof(priv, pub, amount, parts, n, txb, h, amtc, &bp,
                                        proof, &plen) != 0) {
      fprintf(stderr, "send proof generation failed\n");
      return 1;
    }
    fprintf(stderr, "send proof len=%zu\n", plen);
    put(proof, plen);
    return 0;
  }

  /* verify-send <proof946> <senderbal66> <amtc33> <balpc33> <ctxhash32> <n> <p0pub> <p0ct> ... */
  if (!strcmp(cmd, "verify-send")) {
    NEED(9);
    unsigned char proof[946], sbal[66], amtc[33], balc[33], h[32];
    if (!hex2bin(argv[2], proof, 946) || !hex2bin(argv[3], sbal, 66) ||
        !hex2bin(argv[4], amtc, 33) || !hex2bin(argv[5], balc, 33) ||
        !hex2bin(argv[6], h, 32)) return 2;
    size_t n = (size_t)strtoul(argv[7], NULL, 10);
    NEED((int)(8 + 2 * n));
    mpt_confidential_participant parts[4];
    memset(parts, 0, sizeof(parts));
    for (size_t i = 0; i < n; i++) {
      if (!hex2bin(argv[8 + 2 * i], parts[i].pubkey, 33)) return 2;
      if (!hex2bin(argv[9 + 2 * i], parts[i].ciphertext, 66)) return 2;
    }
    printf("%s\n", mpt_verify_send_proof(proof, parts, (unsigned char)n, sbal, amtc, balc, h) == 0
                       ? "OK" : "FAIL");
    return 0;
  }

  /* convertback-ctx <acc20> <iss24> <seq> <version> -> 32B */
  if (!strcmp(cmd, "convertback-ctx")) {
    NEED(6);
    account_id acc; mpt_issuance_id iss; unsigned char h[32];
    if (!hex2bin(argv[2], acc.bytes, 20) || !hex2bin(argv[3], iss.bytes, 24)) return 2;
    if (mpt_get_convert_back_context_hash(acc, iss, (uint32_t)strtoul(argv[4], NULL, 10),
                                          (uint32_t)strtoul(argv[5], NULL, 10), h) != 0) return 1;
    put(h, 32);
    return 0;
  }

  /*
   * convertback-proof <priv32> <pub33> <ctxhash32> <amount>
   *                   <balpc33> <balamount> <balct66> <balrho32> -> 816B
   *
   * The witness is (b, rho, priv) — the BALANCE, not the amount. `amount` is
   * the public m being withdrawn, and the range proof is over b - m.
   */
  if (!strcmp(cmd, "convertback-proof")) {
    NEED(10);
    unsigned char priv[32], pub[33], h[32];
    uint64_t amount = strtoull(argv[5], NULL, 10);
    mpt_pedersen_proof_params bp;
    memset(&bp, 0, sizeof(bp));
    if (!hex2bin(argv[2], priv, 32) || !hex2bin(argv[3], pub, 33) ||
        !hex2bin(argv[4], h, 32)) return 2;
    if (!hex2bin(argv[6], bp.pedersen_commitment, 33)) return 2;
    bp.amount = strtoull(argv[7], NULL, 10);
    if (!hex2bin(argv[8], bp.ciphertext, 66) || !hex2bin(argv[9], bp.blinding_factor, 32)) return 2;

    unsigned char proof[816];
    if (mpt_get_convert_back_proof(priv, pub, h, amount, &bp, proof) != 0) {
      fprintf(stderr, "convert-back proof generation failed\n");
      return 1;
    }
    put(proof, sizeof(proof));
    return 0;
  }

  /* verify-convertback <proof816> <pub33> <balct66> <balpc33> <amount> <ctxhash32> */
  if (!strcmp(cmd, "verify-convertback")) {
    NEED(8);
    unsigned char proof[816], pub[33], balct[66], balpc[33], h[32];
    if (!hex2bin(argv[2], proof, 816) || !hex2bin(argv[3], pub, 33) ||
        !hex2bin(argv[4], balct, 66) || !hex2bin(argv[5], balpc, 33) ||
        !hex2bin(argv[7], h, 32)) return 2;
    printf("%s\n", mpt_verify_convert_back_proof(proof, pub, balct, balpc,
                                                 strtoull(argv[6], NULL, 10), h) == 0
                       ? "OK" : "FAIL");
    return 0;
  }

  fprintf(stderr, "unknown cmd %s\n", cmd);
  return 2;
}
