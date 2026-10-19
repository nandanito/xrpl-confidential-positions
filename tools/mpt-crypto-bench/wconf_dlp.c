/* wconf_dlp.c — direct measurement of ElGamal decrypt at the documented
 * default bound range_high = 1,000,000, and of the failure mode above it.
 * Not upstream; W-CONF measurement harness. */

#include "secp256k1_mpt.h"
#include "test_utils.h"
#include <secp256k1.h>
#include <stdio.h>
#include <time.h>

static double now_ms(void)
{
  struct timespec t;
  timespec_get(&t, TIME_UTC);
  return t.tv_sec * 1000.0 + t.tv_nsec / 1e6;
}

static void measure(secp256k1_context *ctx, const secp256k1_pubkey *pk,
                    const unsigned char *sk, uint64_t plaintext,
                    uint64_t range_high, int runs)
{
  secp256k1_pubkey c1, c2;
  unsigned char r[32];
  random_scalar(ctx, r);
  EXPECT(secp256k1_elgamal_encrypt(ctx, &c1, &c2, pk, plaintext, r));

  printf("  plaintext=%-12llu range_high=%-10llu ",
         (unsigned long long)plaintext, (unsigned long long)range_high);
  fflush(stdout);

  double lo = 1e18, hi = 0, sum = 0;
  int found_all = 1;
  uint64_t out = 0;
  for (int i = 0; i < runs; i++)
  {
    double t0 = now_ms();
    int ok = secp256k1_elgamal_decrypt(ctx, &out, &c1, &c2, sk, 0, range_high);
    double d = now_ms() - t0;
    if (!ok) found_all = 0;
    if (d < lo) lo = d;
    if (d > hi) hi = d;
    sum += d;
  }
  printf("-> %s  min %.1f ms  mean %.1f ms  max %.1f ms  (n=%d)\n",
         found_all ? "RECOVERED" : "*** NOT RECOVERED ***", lo, sum / runs, hi,
         runs);
  if (found_all)
    printf("        recovered value = %llu\n", (unsigned long long)out);
}

int main(void)
{
  secp256k1_context *ctx = secp256k1_context_create(SECP256K1_CONTEXT_SIGN |
                                                    SECP256K1_CONTEXT_VERIFY);
  EXPECT(ctx);
  unsigned char sk[32];
  secp256k1_pubkey pk;
  random_scalar(ctx, sk);
  EXPECT(secp256k1_ec_pubkey_create(ctx, &pk, sk));

  printf("Direct measurement at the documented default bound\n");
  printf("(header: \"Recommended default: range_low=0, range_high=1000000\")\n\n");

  /* Small plaintext, full default range: shows cost is range-driven. */
  measure(ctx, &pk, sk, 42, 1000000, 3);

  /* Plaintext just under the bound. */
  measure(ctx, &pk, sk, 999999, 1000000, 3);

  /* Plaintext just over the bound: valid ciphertext, not recoverable. */
  measure(ctx, &pk, sk, 1000001, 1000000, 1);

  /* The same over-bound plaintext IS recoverable if the caller raises the
   * range -- the bound is a caller-supplied parameter, not a property of
   * the ciphertext. Cost scales linearly with the range. */
  measure(ctx, &pk, sk, 1000001, 1100000, 1);

  secp256k1_context_destroy(ctx);
  return 0;
}
