/*
 * wconf-kat — exposes wconf_generate_nonces() directly so the T-1 known-answer
 * vectors have a generator that can be run. Under P-8 a value whose generator
 * is unavailable is not checkable, so this is committed alongside the vectors.
 *
 * Throwaway harness code, like everything else under tools/spike-*.
 *
 * Build: see build.sh in this directory.
 * Usage: wconf-kat <k> <witness_hex> <domain_ascii> <stmt_hex> <ctx_hex|->
 *                  [aux_hex] [sk_offset]
 *        prints k lines of 32-byte hex.
 *
 * sk_offset defaults to 0 and is only read when aux_hex is given. It exists
 * because ConvertBack's witness order is (b, rho, sk_A), so its long-lived
 * secret sits at offset 64 -- and without this argument the vectors could not
 * exercise the one call site that uses a non-zero offset. Adversarial review
 * (Codex leg, 2026-08-18) named that as an evidence gap: a prover that
 * regressed to offset 0 would still have passed every committed vector.
 */
#include "mpt_internal.h"
#include "secp256k1_mpt.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int hex2bin(char const* h, unsigned char* out, size_t n)
{
    if (strlen(h) != n * 2)
        return 0;
    for (size_t i = 0; i < n; i++)
    {
        unsigned v;
        if (sscanf(h + 2 * i, "%2x", &v) != 1)
            return 0;
        out[i] = (unsigned char)v;
    }
    return 1;
}

int main(int argc, char** argv)
{
    if (argc < 6)
    {
        fprintf(stderr,
                "usage: %s <k> <witness_hex> <domain> <stmt_hex> <ctx_hex|-> "
                "[aux_hex] [sk_offset]\n",
                argv[0]);
        return 2;
    }

    size_t k = (size_t)strtoul(argv[1], NULL, 10);
    size_t witness_len = strlen(argv[2]) / 2;
    size_t stmt_len = strlen(argv[4]) / 2;

    unsigned char* witness = malloc(witness_len ? witness_len : 1);
    unsigned char* stmt = malloc(stmt_len ? stmt_len : 1);
    unsigned char ctx_id[32], aux[32], nonces[8 * 32];
    unsigned char const* ctx_ptr = NULL;
    unsigned char const* aux_ptr = NULL;
    size_t sk_offset = 0;

    if (!witness || !stmt)
        return 1;
    if (!hex2bin(argv[2], witness, witness_len))
    {
        fprintf(stderr, "bad witness hex\n");
        return 2;
    }
    if (!hex2bin(argv[4], stmt, stmt_len))
    {
        fprintf(stderr, "bad stmt hex\n");
        return 2;
    }
    if (strcmp(argv[5], "-") != 0)
    {
        if (!hex2bin(argv[5], ctx_id, 32))
        {
            fprintf(stderr, "bad ctx hex\n");
            return 2;
        }
        ctx_ptr = ctx_id;
    }
    if (argc > 6)
    {
        if (!hex2bin(argv[6], aux, 32))
        {
            fprintf(stderr, "bad aux hex\n");
            return 2;
        }
        aux_ptr = aux;
    }
    if (argc > 7)
        sk_offset = (size_t)strtoul(argv[7], NULL, 10);

    secp256k1_context* ctx =
        secp256k1_context_create(SECP256K1_CONTEXT_SIGN | SECP256K1_CONTEXT_VERIFY);
    if (!ctx)
        return 1;

    if (!wconf_generate_nonces(
            ctx, nonces, k, witness, witness_len, argv[3], strlen(argv[3]), stmt, stmt_len,
            ctx_ptr, aux_ptr, sk_offset))
    {
        fprintf(stderr, "wconf_generate_nonces failed\n");
        return 1;
    }

    for (size_t i = 0; i < k; i++)
    {
        for (size_t j = 0; j < 32; j++)
            printf("%02x", nonces[i * 32 + j]);
        printf("\n");
    }

    secp256k1_context_destroy(ctx);
    free(witness);
    free(stmt);
    return 0;
}
