/* wconf_bench.c — W-CONF measurement harness for mpt-crypto.
 *
 * NOT part of mpt-crypto. Added by the W-CONF project to replace the
 * unusable XLS-0096 s14.2 timings ("laptop-class CPU", no model/clock/flags)
 * with numbers that satisfy standing prohibition P-8.
 *
 * Reports min / median / mean / p95 / max / stddev over N runs for:
 *   - aggregated Bulletproof prove+verify, m=2 (the ConfidentialMPTSend case)
 *   - single Bulletproof prove+verify, m=1   (the ConvertBack case)
 *   - compact sigma standard / convertback / clawback prove+verify
 *   - ElGamal decrypt as a function of range_high (the TOB-RIPCTX-1 bound)
 *
 * Setup code for each proof is lifted from the corresponding upstream test
 * so the measured operation is the same one the test suite exercises.
 */

#include "secp256k1_mpt.h"
#include "test_utils.h"
#include <math.h>
#include <secp256k1.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifndef BENCH_RUNS
#define BENCH_RUNS 50
#endif

#define BP_VALUE_BITS 64

/* ---------- timing ---------- */

static double now_ms(void)
{
  struct timespec t;
  timespec_get(&t, TIME_UTC);
  return t.tv_sec * 1000.0 + t.tv_nsec / 1e6;
}

static int cmp_double(const void *a, const void *b)
{
  double x = *(const double *)a, y = *(const double *)b;
  return (x > y) - (x < y);
}

/* Print min/median/mean/p95/max/stddev. Spread, not just the mean — P-8. */
static void report(const char *label, double *s, int n)
{
  qsort(s, n, sizeof(double), cmp_double);
  double sum = 0.0;
  for (int i = 0; i < n; i++)
    sum += s[i];
  double mean = sum / n;
  double var = 0.0;
  for (int i = 0; i < n; i++)
    var += (s[i] - mean) * (s[i] - mean);
  double sd = (n > 1) ? sqrt(var / (n - 1)) : 0.0;
  double median =
      (n % 2) ? s[n / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
  int p95i = (int)(0.95 * (n - 1) + 0.5);
  printf("%-38s n=%3d  min %8.3f  med %8.3f  mean %8.3f  p95 %8.3f  max %8.3f  sd %7.3f\n",
         label, n, s[0], median, mean, s[p95i], s[n - 1], sd);
}

/* ---------- aggregated bulletproof ---------- */

static void bench_bulletproof(secp256k1_context *ctx, size_t m,
                              const char *tag)
{
  uint64_t *values = malloc(m * sizeof(uint64_t));
  unsigned char (*blindings)[32] = malloc(m * sizeof(*blindings));
  secp256k1_pubkey *commitments = malloc(m * sizeof(secp256k1_pubkey));
  unsigned char context_id[32];
  EXPECT(values && blindings && commitments);
  random_bytes(context_id);

  secp256k1_pubkey H;
  EXPECT(secp256k1_mpt_get_h_generator(ctx, &H));

  /* Representative non-trivial values rather than the upstream {0,0}. */
  for (size_t i = 0; i < m; i++)
  {
    values[i] = 1000000ULL + i * 7919ULL;
    random_scalar(ctx, blindings[i]);
    EXPECT(secp256k1_bulletproof_create_commitment(
        ctx, &commitments[i], values[i], blindings[i], &H));
  }

  const size_t n = BP_VALUE_BITS * m;
  secp256k1_pubkey *G_vec = malloc(n * sizeof(secp256k1_pubkey));
  secp256k1_pubkey *H_vec = malloc(n * sizeof(secp256k1_pubkey));
  EXPECT(G_vec && H_vec);
  EXPECT(secp256k1_mpt_get_generator_vector(ctx, G_vec, n,
                                            (const unsigned char *)"BP_G", 4));
  EXPECT(secp256k1_mpt_get_generator_vector(ctx, H_vec, n,
                                            (const unsigned char *)"BP_H", 4));

  unsigned char proof[4096];
  size_t proof_len = sizeof(proof);
  double *sp = malloc(BENCH_RUNS * sizeof(double));
  double *sv = malloc(BENCH_RUNS * sizeof(double));

  /* warm-up (page-in, generator caches) */
  proof_len = sizeof(proof);
  EXPECT(secp256k1_bulletproof_prove_agg(ctx, proof, &proof_len, values,
                                         (const unsigned char *)blindings, m,
                                         &H, context_id));
  EXPECT(secp256k1_bulletproof_verify_agg(ctx, G_vec, H_vec, proof, proof_len,
                                          commitments, m, &H, context_id));
  printf("  [%s] measured proof size: %zu bytes\n", tag, proof_len);

  for (int i = 0; i < BENCH_RUNS; i++)
  {
    proof_len = sizeof(proof);
    double t0 = now_ms();
    EXPECT(secp256k1_bulletproof_prove_agg(ctx, proof, &proof_len, values,
                                           (const unsigned char *)blindings, m,
                                           &H, context_id));
    sp[i] = now_ms() - t0;

    t0 = now_ms();
    EXPECT(secp256k1_bulletproof_verify_agg(ctx, G_vec, H_vec, proof,
                                            proof_len, commitments, m, &H,
                                            context_id));
    sv[i] = now_ms() - t0;
  }

  char l1[96], l2[96];
  snprintf(l1, sizeof(l1), "%s prove", tag);
  snprintf(l2, sizeof(l2), "%s verify", tag);
  report(l1, sp, BENCH_RUNS);
  report(l2, sv, BENCH_RUNS);

  free(values); free(blindings); free(commitments);
  free(G_vec); free(H_vec); free(sp); free(sv);
}

/* ---------- compact sigma: standard send ---------- */

static void bench_compact_standard(secp256k1_context *ctx)
{
  const uint64_t amount = 250000, balance = 900000;
  const uint64_t remainder = balance - amount;
  const int N = 3; /* receiver, issuer, auditor */

  unsigned char r[32], r_bal[32], r_b[32], sk_A[32], context_id[32];
  secp256k1_pubkey pk_A, H;
  random_scalar(ctx, r); random_scalar(ctx, r_bal);
  random_scalar(ctx, r_b); random_scalar(ctx, sk_A);
  random_bytes(context_id);
  EXPECT(secp256k1_ec_pubkey_create(ctx, &pk_A, sk_A));
  EXPECT(secp256k1_mpt_get_h_generator(ctx, &H));

  unsigned char sk_recip[3][32];
  secp256k1_pubkey pks[3];
  for (int i = 0; i < N; i++)
  {
    random_scalar(ctx, sk_recip[i]);
    EXPECT(secp256k1_ec_pubkey_create(ctx, &pks[i], sk_recip[i]));
  }

  secp256k1_pubkey C1;
  EXPECT(secp256k1_ec_pubkey_create(ctx, &C1, r));

  secp256k1_pubkey mG;
  const int has_mG = value_times_g(ctx, &mG, amount);

  secp256k1_pubkey C2_vec[3];
  for (int i = 0; i < N; i++)
  {
    secp256k1_pubkey rPk = pks[i];
    EXPECT(secp256k1_ec_pubkey_tweak_mul(ctx, &rPk, r));
    if (has_mG) {
      const secp256k1_pubkey *pts[2] = {&rPk, &mG};
      EXPECT(secp256k1_ec_pubkey_combine(ctx, &C2_vec[i], pts, 2));
    } else C2_vec[i] = rPk;
  }

  secp256k1_pubkey PC_m;
  {
    secp256k1_pubkey rH = H;
    EXPECT(secp256k1_ec_pubkey_tweak_mul(ctx, &rH, r));
    if (has_mG) {
      const secp256k1_pubkey *pts[2] = {&mG, &rH};
      EXPECT(secp256k1_ec_pubkey_combine(ctx, &PC_m, pts, 2));
    } else PC_m = rH;
  }

  secp256k1_pubkey PC_b;
  {
    secp256k1_pubkey vG, rbH = H;
    const int has_vG = value_times_g(ctx, &vG, remainder);
    EXPECT(secp256k1_ec_pubkey_tweak_mul(ctx, &rbH, r_b));
    if (has_vG) {
      const secp256k1_pubkey *pts[2] = {&vG, &rbH};
      EXPECT(secp256k1_ec_pubkey_combine(ctx, &PC_b, pts, 2));
    } else PC_b = rbH;
  }

  unsigned char r_diff[32];
  {
    unsigned char neg_r[32];
    secp256k1_mpt_scalar_negate(neg_r, r);
    secp256k1_mpt_scalar_add(r_diff, r_bal, neg_r);
    secp256k1_mpt_scalar_reduce32(r_diff, r_diff);
    EXPECT(secp256k1_ec_seckey_verify(ctx, r_diff));
  }

  secp256k1_pubkey B1;
  EXPECT(secp256k1_ec_pubkey_create(ctx, &B1, r_diff));

  secp256k1_pubkey B2;
  {
    secp256k1_pubkey rdPk = pk_A, vG;
    EXPECT(secp256k1_ec_pubkey_tweak_mul(ctx, &rdPk, r_diff));
    const int has_vG = value_times_g(ctx, &vG, remainder);
    if (has_vG) {
      const secp256k1_pubkey *pts[2] = {&rdPk, &vG};
      EXPECT(secp256k1_ec_pubkey_combine(ctx, &B2, pts, 2));
    } else B2 = rdPk;
  }

  unsigned char proof[SECP256K1_COMPACT_STANDARD_PROOF_SIZE];
  double *sp = malloc(BENCH_RUNS * sizeof(double));
  double *sv = malloc(BENCH_RUNS * sizeof(double));

  EXPECT(secp256k1_compact_standard_prove(
      ctx, proof, amount, remainder, r, sk_A, r_b, N, &C1, C2_vec, pks, &PC_m,
      &pk_A, &PC_b, &B1, &B2, context_id));
  EXPECT(secp256k1_compact_standard_verify(ctx, proof, N, &C1, C2_vec, pks,
                                           &PC_m, &pk_A, &PC_b, &B1, &B2,
                                           context_id));
  printf("  [sigma standard] proof size: %d bytes\n",
         SECP256K1_COMPACT_STANDARD_PROOF_SIZE);

  for (int i = 0; i < BENCH_RUNS; i++)
  {
    double t0 = now_ms();
    EXPECT(secp256k1_compact_standard_prove(
        ctx, proof, amount, remainder, r, sk_A, r_b, N, &C1, C2_vec, pks,
        &PC_m, &pk_A, &PC_b, &B1, &B2, context_id));
    sp[i] = now_ms() - t0;

    t0 = now_ms();
    EXPECT(secp256k1_compact_standard_verify(ctx, proof, N, &C1, C2_vec, pks,
                                             &PC_m, &pk_A, &PC_b, &B1, &B2,
                                             context_id));
    sv[i] = now_ms() - t0;
  }
  report("sigma standard (n=3) prove", sp, BENCH_RUNS);
  report("sigma standard (n=3) verify", sv, BENCH_RUNS);
  free(sp); free(sv);
}

/* ---------- compact sigma: convertback ---------- */

static void bench_compact_convertback(secp256k1_context *ctx)
{
  const uint64_t balance = 900000;
  unsigned char sk_A[32], rho[32], r_bal[32], context_id[32];
  secp256k1_pubkey pk_A, H;
  random_scalar(ctx, sk_A); random_scalar(ctx, rho);
  random_scalar(ctx, r_bal); random_bytes(context_id);
  EXPECT(secp256k1_ec_pubkey_create(ctx, &pk_A, sk_A));
  EXPECT(secp256k1_mpt_get_h_generator(ctx, &H));

  secp256k1_pubkey B1;
  EXPECT(secp256k1_ec_pubkey_create(ctx, &B1, r_bal));

  secp256k1_pubkey B2;
  {
    secp256k1_pubkey rPk = pk_A, vG;
    EXPECT(secp256k1_ec_pubkey_tweak_mul(ctx, &rPk, r_bal));
    const int has_vG = value_times_g(ctx, &vG, balance);
    if (has_vG) {
      const secp256k1_pubkey *pts[2] = {&rPk, &vG};
      EXPECT(secp256k1_ec_pubkey_combine(ctx, &B2, pts, 2));
    } else B2 = rPk;
  }

  secp256k1_pubkey PC_b;
  {
    secp256k1_pubkey vG, rhoH = H;
    const int has_vG = value_times_g(ctx, &vG, balance);
    EXPECT(secp256k1_ec_pubkey_tweak_mul(ctx, &rhoH, rho));
    if (has_vG) {
      const secp256k1_pubkey *pts[2] = {&vG, &rhoH};
      EXPECT(secp256k1_ec_pubkey_combine(ctx, &PC_b, pts, 2));
    } else PC_b = rhoH;
  }

  unsigned char proof[SECP256K1_COMPACT_CONVERTBACK_PROOF_SIZE];
  double *sp = malloc(BENCH_RUNS * sizeof(double));
  double *sv = malloc(BENCH_RUNS * sizeof(double));

  EXPECT(secp256k1_compact_convertback_prove(ctx, proof, balance, sk_A, rho,
                                             &pk_A, &B1, &B2, &PC_b,
                                             context_id));
  EXPECT(secp256k1_compact_convertback_verify(ctx, proof, &pk_A, &B1, &B2,
                                              &PC_b, context_id));
  printf("  [sigma convertback] proof size: %d bytes\n",
         SECP256K1_COMPACT_CONVERTBACK_PROOF_SIZE);

  for (int i = 0; i < BENCH_RUNS; i++)
  {
    double t0 = now_ms();
    EXPECT(secp256k1_compact_convertback_prove(ctx, proof, balance, sk_A, rho,
                                               &pk_A, &B1, &B2, &PC_b,
                                               context_id));
    sp[i] = now_ms() - t0;
    t0 = now_ms();
    EXPECT(secp256k1_compact_convertback_verify(ctx, proof, &pk_A, &B1, &B2,
                                                &PC_b, context_id));
    sv[i] = now_ms() - t0;
  }
  report("sigma convertback prove", sp, BENCH_RUNS);
  report("sigma convertback verify", sv, BENCH_RUNS);
  free(sp); free(sv);
}

/* ---------- compact sigma: clawback ---------- */

static void bench_compact_clawback(secp256k1_context *ctx)
{
  const uint64_t amount = 250000;
  unsigned char sk_iss[32], r[32], context_id[32];
  secp256k1_pubkey P_iss, pk_holder;
  unsigned char sk_holder[32];

  random_scalar(ctx, sk_iss); random_scalar(ctx, r);
  random_scalar(ctx, sk_holder); random_bytes(context_id);
  EXPECT(secp256k1_ec_pubkey_create(ctx, &P_iss, sk_iss));
  EXPECT(secp256k1_ec_pubkey_create(ctx, &pk_holder, sk_holder));

  /* Mirror ciphertext under the issuer key: C1 = r*G, C2 = m*G + r*P_iss */
  secp256k1_pubkey C1;
  EXPECT(secp256k1_ec_pubkey_create(ctx, &C1, r));
  secp256k1_pubkey C2;
  {
    secp256k1_pubkey rP = P_iss, mG;
    EXPECT(secp256k1_ec_pubkey_tweak_mul(ctx, &rP, r));
    const int has_mG = value_times_g(ctx, &mG, amount);
    if (has_mG) {
      const secp256k1_pubkey *pts[2] = {&rP, &mG};
      EXPECT(secp256k1_ec_pubkey_combine(ctx, &C2, pts, 2));
    } else C2 = rP;
  }

  unsigned char proof[SECP256K1_COMPACT_CLAWBACK_PROOF_SIZE];
  double *sp = malloc(BENCH_RUNS * sizeof(double));
  double *sv = malloc(BENCH_RUNS * sizeof(double));

  EXPECT(secp256k1_compact_clawback_prove(ctx, proof, amount, sk_iss, &P_iss,
                                          &C1, &C2, context_id));
  EXPECT(secp256k1_compact_clawback_verify(ctx, proof, amount, &P_iss, &C1,
                                           &C2, context_id));
  printf("  [sigma clawback] proof size: %d bytes\n",
         SECP256K1_COMPACT_CLAWBACK_PROOF_SIZE);

  for (int i = 0; i < BENCH_RUNS; i++)
  {
    double t0 = now_ms();
    EXPECT(secp256k1_compact_clawback_prove(ctx, proof, amount, sk_iss, &P_iss,
                                            &C1, &C2, context_id));
    sp[i] = now_ms() - t0;
    t0 = now_ms();
    EXPECT(secp256k1_compact_clawback_verify(ctx, proof, amount, &P_iss, &C1,
                                             &C2, context_id));
    sv[i] = now_ms() - t0;
  }
  report("sigma clawback prove", sp, BENCH_RUNS);
  report("sigma clawback verify", sv, BENCH_RUNS);
  free(sp); free(sv);
}

/* ---------- ElGamal decrypt vs range (TOB-RIPCTX-1) ---------- */

/* The DLP loop has no early exit: it runs exactly
 * range_high - max(1,range_low) + 1 iterations whatever the plaintext.
 * So decrypt cost is a function of the RANGE, not the amount. Measure the
 * per-iteration cost on a small range and extrapolate to 1,000,000. */
static void bench_elgamal_decrypt(secp256k1_context *ctx)
{
  unsigned char sk[32];
  secp256k1_pubkey pk;
  random_scalar(ctx, sk);
  EXPECT(secp256k1_ec_pubkey_create(ctx, &pk, sk));

  const uint64_t amount = 42;
  secp256k1_pubkey c1, c2;
  unsigned char r[32];
  random_scalar(ctx, r);
  EXPECT(secp256k1_elgamal_encrypt(ctx, &c1, &c2, &pk, amount, r));

  const uint64_t ranges[] = {1000, 5000, 20000, 50000};
  const int NR = (int)(sizeof(ranges) / sizeof(ranges[0]));
  const int RUNS = 7;

  printf("\n  ElGamal decrypt — cost is a function of range_high, not amount\n");
  printf("  (plaintext fixed at %llu in every row)\n",
         (unsigned long long)amount);

  double ns_per_iter_acc = 0.0;
  int acc_n = 0;

  for (int k = 0; k < NR; k++)
  {
    double *s = malloc(RUNS * sizeof(double));
    for (int i = 0; i < RUNS; i++)
    {
      uint64_t out = 0;
      double t0 = now_ms();
      int ok = secp256k1_elgamal_decrypt(ctx, &out, &c1, &c2, sk, 0,
                                         ranges[k]);
      s[i] = now_ms() - t0;
      EXPECT(ok == 1 && out == amount);
    }
    char lbl[96];
    snprintf(lbl, sizeof(lbl), "elgamal_decrypt range_high=%llu",
             (unsigned long long)ranges[k]);
    qsort(s, RUNS, sizeof(double), cmp_double);
    double med = s[RUNS / 2];
    report(lbl, s, RUNS);
    ns_per_iter_acc += (med * 1e6) / (double)ranges[k];
    acc_n++;
    free(s);
  }

  double ns_per_iter = ns_per_iter_acc / acc_n;
  printf("\n  mean per-iteration cost: %.1f ns\n", ns_per_iter);
  printf("  => extrapolated decrypt at range_high=1,000,000: %.2f s\n",
         ns_per_iter * 1e6 / 1e9);
  printf("  => extrapolated decrypt at range_high=2^32:       %.1f s\n",
         ns_per_iter * 4294967296.0 / 1e9);
  printf("  NOTE: paid on EVERY decrypt regardless of plaintext (no early exit).\n");
}

/* ---------- main ---------- */

int main(void)
{
  secp256k1_context *ctx = secp256k1_context_create(SECP256K1_CONTEXT_SIGN |
                                                    SECP256K1_CONTEXT_VERIFY);
  EXPECT(ctx != NULL);

  printf("W-CONF mpt-crypto benchmark — %d runs per operation\n", BENCH_RUNS);
  printf("all times in milliseconds\n\n");

  printf("== Bulletproofs ==\n");
  bench_bulletproof(ctx, 2, "bulletproof agg m=2 (Send)");
  bench_bulletproof(ctx, 1, "bulletproof m=1 (ConvertBack)");

  printf("\n== Compact sigma proofs ==\n");
  bench_compact_standard(ctx);
  bench_compact_convertback(ctx);
  bench_compact_clawback(ctx);

  printf("\n== ElGamal decryption bound ==\n");
  bench_elgamal_decrypt(ctx);

  secp256k1_context_destroy(ctx);
  printf("\ndone\n");
  return 0;
}
