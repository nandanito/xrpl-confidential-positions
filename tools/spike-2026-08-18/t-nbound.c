/*
 * Regression test for the HIGH finding of the 2026-08-18 adversarial review
 * (Codex leg): unchecked size_t arithmetic on the participant count.
 *
 * Before the fix, STD_STMT_POINTS(n) = 2n + 6 wrapped for large n, so stmt_len
 * became small, malloc succeeded, and std_serialize_statement then wrote n
 * compressed points into a buffer sized for 2. A heap out-of-bounds write,
 * introduced by this patch's own refactor — upstream hashed points one at a
 * time into a fixed 33-byte stack buffer and never sized a buffer from n.
 *
 * ---------------------------------------------------------------------------
 * HOW THIS TEST DISCRIMINATES, and why the obvious version does not.
 *
 * The first version of this file tested the wrapping values directly —
 * n = 2^63 - 2 and friends — passing single-element arrays as the n-element
 * vectors. The SECOND review round caught that as a FALSE-PASS MODE, correctly:
 * with the guard removed, std_serialize_statement reads Pk_vec[1] from stack
 * garbage, serialization fails, prove returns 0, and the test prints PASS
 * having just performed an out-of-bounds read. It passes for the wrong reason.
 *
 * So the discriminator is now n = 65 with GENUINE 65-element arrays:
 *
 *   with the guard     prove returns 0   (rejected by MPT_ARG_CHECK)
 *   without the guard  prove returns 1   (65 is arithmetically fine:
 *                                         (2*65+6)*33 = 4488, no wrap)
 *
 * No undefined behaviour, no reliance on what stack garbage happens to be, and
 * the two builds differ in the RETURN VALUE rather than in whether they crash.
 * n = 65 exercises exactly the same `n > STD_MAX_PARTICIPANTS` branch that
 * rejects the wrapping values, so testing it tests the guard that prevents the
 * wrap.
 *
 * The wrapping values themselves are deliberately NOT tested. Doing so requires
 * lying to the function about its array lengths, which is undefined behaviour in
 * the test rather than in the code under test — and a test that relies on UB
 * cannot distinguish a fix from luck. That is a real limit of this file and it
 * is stated rather than hidden.
 *
 * Verify is not used as the discriminator: these statement points do not satisfy
 * the relation, so verify returns 0 in both builds and proves nothing.
 */
#include "secp256k1_mpt.h"
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define OVER 65 /* one past STD_MAX_PARTICIPANTS */

int main(void)
{
    secp256k1_context* ctx =
        secp256k1_context_create(SECP256K1_CONTEXT_SIGN | SECP256K1_CONTEXT_VERIFY);
    if (!ctx)
        return 1;

    unsigned char sk[32], r[32], rb[32], ctxid[32], scratch[32];
    secp256k1_pubkey C1, PC_m, pk_A, PC_b, B1, B2, one;
    secp256k1_pubkey big[OVER];
    unsigned char proof[SECP256K1_COMPACT_STANDARD_PROOF_SIZE];
    int fail = 0;

    memset(sk, 0x11, 32);
    memset(r, 0x22, 32);
    memset(rb, 0x33, 32);
    memset(ctxid, 0xcd, 32);
    memset(scratch, 0x44, 32);

    if (!secp256k1_ec_pubkey_create(ctx, &pk_A, sk))
        return 1;
    if (!secp256k1_ec_pubkey_create(ctx, &one, scratch))
        return 1;
    C1 = PC_m = PC_b = B1 = B2 = one;
    for (size_t i = 0; i < OVER; i++)
        big[i] = one;

    /* --- the discriminator: n = 65, with real 65-element vectors --- */
    int proved_over = secp256k1_compact_standard_prove(
        ctx, proof, 25, 500, r, sk, rb, OVER, &C1, big, big, &PC_m, &pk_A,
        &PC_b, &B1, &B2, ctxid);

    if (proved_over == 0)
    {
        printf("  PASS  n=%d rejected (guard present)\n", OVER);
    }
    else
    {
        printf("  FAIL  n=%d ACCEPTED (prove=%d) — the n bound is gone, and with\n",
               OVER, proved_over);
        printf("        it the protection against 2n+6 wrapping at large n\n");
        fail = 1;
    }

    /* --- control: the guard must not reject legitimate counts ---
     * Without this, a guard that rejected everything would pass above. */
    for (size_t n = 1; n <= 4; n++)
    {
        int proved = secp256k1_compact_standard_prove(
            ctx, proof, 25, 500, r, sk, rb, n, &C1, big, big, &PC_m, &pk_A,
            &PC_b, &B1, &B2, ctxid);
        if (proved != 1)
        {
            printf("  FAIL  n=%zu rejected but is legitimate (prove=%d)\n", n, proved);
            fail = 1;
        }
        else
        {
            printf("  PASS  n=%zu still accepted\n", n);
        }
    }

    /* --- boundary: 64 is in, 65 is out. Pins the bound, not just its existence. --- */
    int proved_64 = secp256k1_compact_standard_prove(
        ctx, proof, 25, 500, r, sk, rb, 64, &C1, big, big, &PC_m, &pk_A, &PC_b,
        &B1, &B2, ctxid);
    if (proved_64 == 1)
    {
        printf("  PASS  n=64 accepted (bound is 64, not lower)\n");
    }
    else
    {
        printf("  FAIL  n=64 rejected (prove=%d) — bound is tighter than documented\n",
               proved_64);
        fail = 1;
    }

    secp256k1_context_destroy(ctx);
    printf(fail ? "\nN-BOUND FAIL\n" : "\nN-BOUND PASS\n");
    return fail;
}
