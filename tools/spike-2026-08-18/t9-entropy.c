/*
 * T-9 — how many times does proof generation draw entropy?
 *
 * The measurement is exact rather than statistical: this file defines its own
 * RAND_bytes, which wins over libcrypto's for every call made from the
 * statically linked mpt-crypto objects. RAND_bytes is the ONLY route to
 * getentropy in the mpt-crypto tree — verified by grep at 85dbac7, five call
 * sites, all listed in WCONF-PATCH.md — so counting it counts entropy draws.
 *
 * Fixtures are generated first, with the counter running; the counter is then
 * reset and only the sigma prover is called. So the number printed is entropy
 * drawn BY THE PROOF, not by setting up its inputs.
 *
 * Expected:
 *   default build      0   (leg B, and the default while issue #1 is open)
 *   -DWCONF_HEDGE=1    1   (leg A: exactly one draw, at exactly one site)
 *
 * The statement points below do not satisfy the relation — they do not need
 * to. The prover serialises them into the transcript either way, and this
 * binary measures entropy, not soundness. nonce-crosscheck.ts is what tests
 * that real proofs verify.
 */
#include "secp256k1_mpt.h"
#include <openssl/rand.h>
#include <stdio.h>
#include <string.h>

#ifndef WCONF_HEDGE
#define WCONF_HEDGE 0
#endif

static long rand_calls = 0;
static long rand_bytes_total = 0;

/* Overrides libcrypto's RAND_bytes for all statically linked callers. */
int RAND_bytes(unsigned char* buf, int num)
{
    rand_calls++;
    rand_bytes_total += num;
    /* Deterministic filler: this binary measures call counts, and a real CSPRNG
     * would make the "hedged" arm unreproducible for no benefit. */
    for (int i = 0; i < num; i++)
        buf[i] = (unsigned char)(0xA5 ^ (i & 0xff));
    return 1;
}

int main(void)
{
    secp256k1_context* ctx =
        secp256k1_context_create(SECP256K1_CONTEXT_SIGN | SECP256K1_CONTEXT_VERIFY);
    if (!ctx)
        return 1;

    size_t const n = 3;
    unsigned char sk_A[32], r_shared[32], r_b[32];
    unsigned char scratch[32];
    secp256k1_pubkey C1, PC_m, pk_A, PC_b, B1, B2;
    secp256k1_pubkey C2_vec[3], Pk_vec[3];
    unsigned char proof[SECP256K1_COMPACT_STANDARD_PROOF_SIZE];
    unsigned char context_id[32];

    /* --- fixtures, counter running --- */
    memset(sk_A, 0x11, 32);
    memset(r_shared, 0x22, 32);
    memset(r_b, 0x33, 32);
    memset(context_id, 0xcd, 32);

    if (!secp256k1_ec_pubkey_create(ctx, &pk_A, sk_A))
        return 1;
    memset(scratch, 0x44, 32);
    if (!secp256k1_ec_pubkey_create(ctx, &C1, scratch))
        return 1;
    memset(scratch, 0x55, 32);
    if (!secp256k1_ec_pubkey_create(ctx, &PC_m, scratch))
        return 1;
    memset(scratch, 0x66, 32);
    if (!secp256k1_ec_pubkey_create(ctx, &PC_b, scratch))
        return 1;
    memset(scratch, 0x77, 32);
    if (!secp256k1_ec_pubkey_create(ctx, &B1, scratch))
        return 1;
    memset(scratch, 0x78, 32);
    if (!secp256k1_ec_pubkey_create(ctx, &B2, scratch))
        return 1;
    for (size_t i = 0; i < n; i++)
    {
        memset(scratch, (int)(0x80 + i), 32);
        if (!secp256k1_ec_pubkey_create(ctx, &Pk_vec[i], scratch))
            return 1;
        memset(scratch, (int)(0x90 + i), 32);
        if (!secp256k1_ec_pubkey_create(ctx, &C2_vec[i], scratch))
            return 1;
    }

    /* --- the measurement --- */
    rand_calls = 0;
    rand_bytes_total = 0;

    int ok = secp256k1_compact_standard_prove(
        ctx, proof, 25, 500, r_shared, sk_A, r_b, n, &C1, C2_vec, Pk_vec, &PC_m,
        &pk_A, &PC_b, &B1, &B2, context_id);

    if (!ok)
    {
        fprintf(stderr, "prove failed\n");
        return 1;
    }

    printf("hedge_build=%d\n", WCONF_HEDGE);
    printf("rand_calls=%ld\n", rand_calls);
    printf("rand_bytes=%ld\n", rand_bytes_total);

    /* A second proof, to show the count is per-proof and not one-time init. */
    long first = rand_calls;
    rand_calls = 0;
    ok = secp256k1_compact_standard_prove(
        ctx, proof, 25, 500, r_shared, sk_A, r_b, n, &C1, C2_vec, Pk_vec, &PC_m,
        &pk_A, &PC_b, &B1, &B2, context_id);
    printf("rand_calls_second_proof=%ld\n", rand_calls);
    printf("stable=%s\n", (ok && rand_calls == first) ? "yes" : "no");

    secp256k1_context_destroy(ctx);
    return 0;
}
