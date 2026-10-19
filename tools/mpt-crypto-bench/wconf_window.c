/* wconf_window.c — does a NARROW window at a HIGH value stay cheap?
 * If yes, an application that tracks expected balance off-ledger can decrypt
 * large balances quickly, and the "1,000,000 ceiling" is not a value ceiling
 * at all. Not upstream; W-CONF measurement harness. */
#include "secp256k1_mpt.h"
#include "test_utils.h"
#include <secp256k1.h>
#include <stdio.h>
#include <time.h>

static double now_ms(void){struct timespec t;timespec_get(&t,TIME_UTC);
  return t.tv_sec*1000.0+t.tv_nsec/1e6;}

static void t(secp256k1_context *ctx,const secp256k1_pubkey*pk,
              const unsigned char*sk,uint64_t m,uint64_t lo,uint64_t hi){
  secp256k1_pubkey c1,c2; unsigned char r[32]; random_scalar(ctx,r);
  EXPECT(secp256k1_elgamal_encrypt(ctx,&c1,&c2,pk,m,r));
  uint64_t out=0; double t0=now_ms();
  int ok=secp256k1_elgamal_decrypt(ctx,&out,&c1,&c2,sk,lo,hi);
  double d=now_ms()-t0;
  printf("  plaintext=%-14llu window=[%llu, %llu] width=%-10llu -> %-14s %8.2f ms\n",
    (unsigned long long)m,(unsigned long long)lo,(unsigned long long)hi,
    (unsigned long long)(hi-lo+1), ok?"RECOVERED":"not recovered", d);
  if(ok) EXPECT(out==m);
}

int main(void){
  secp256k1_context *ctx=secp256k1_context_create(
    SECP256K1_CONTEXT_SIGN|SECP256K1_CONTEXT_VERIFY);
  unsigned char sk[32]; secp256k1_pubkey pk;
  random_scalar(ctx,sk); EXPECT(secp256k1_ec_pubkey_create(ctx,&pk,sk));
  printf("Narrow-window decryption at large plaintexts\n");
  printf("(cost tracks WINDOW WIDTH, not the magnitude of the value)\n\n");
  t(ctx,&pk,sk,        500000000ULL, 499999000ULL, 500001000ULL);
  t(ctx,&pk,sk,     100000000000ULL, 99999999000ULL, 100000001000ULL);
  t(ctx,&pk,sk,10000000000000000ULL, 9999999999999000ULL, 10000000000001000ULL);
  printf("\n  For contrast, the documented default window on a small value:\n");
  t(ctx,&pk,sk,               42ULL, 0ULL, 1000000ULL);
  secp256k1_context_destroy(ctx); return 0;
}
