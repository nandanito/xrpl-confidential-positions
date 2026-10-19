from cmpt_nonce_ref import *
from cmpt_nonce_vectors import send_prefix, send, TXCTX_A, AUX_ZERO, m,r,b,rho,sk_A
import itertools, sys

pre = send_prefix(TXCTX_A)
base = send(AUX_ZERO)

# 1. every bit of the FS prefix is load-bearing
bad = 0
for i in range(len(pre)):
    for bit in range(8):
        mut = bytearray(pre); mut[i] ^= (1<<bit)
        out = derive_nonces(PT_SEND, b"CMPT_SEND_SIGMA", bytes(mut),
            [(SLOT_PLAIN,m),(SLOT_PLAIN,r),(SLOT_PLAIN,b),(SLOT_PLAIN,rho),(SLOT_MASKED,sk_A)],
            LABELS_SEND, AUX_ZERO)
        if any(x==y for x,y in zip(out, base)): bad += 1
print(f"bit-flip test: {len(pre)*8} single-bit mutations of the FS prefix, collisions = {bad}")

# 2. framing injectivity: 3 recipients + 33-byte ctx vs 4 recipients + 0-byte ctx
a = fs_prefix([(KIND_OPAQUE, b"AB"), (KIND_OPAQUE, b"C")])
c = fs_prefix([(KIND_OPAQUE, b"A"), (KIND_OPAQUE, b"BC")])
print("framing injectivity (AB|C vs A|BC distinct):", a != c)

# 3. arity mismatch rejected
try:
    derive_nonces(PT_SEND, b"CMPT_SEND_SIGMA", pre,
        [(SLOT_PLAIN,m)], LABELS_SEND, AUX_ZERO); print("arity: NOT REJECTED")
except ValueError as e: print("arity mismatch rejected:", e)

# 4. sk = 0 rejected
try:
    derive_nonces(PT_SEND, b"CMPT_SEND_SIGMA", pre,
        [(SLOT_PLAIN,m),(SLOT_PLAIN,r),(SLOT_PLAIN,b),(SLOT_PLAIN,rho),(SLOT_MASKED,0)],
        LABELS_SEND, AUX_ZERO); print("sk=0: NOT REJECTED")
except ValueError as e: print("sk=0 rejected:", e)

# 5. aux length enforced
try:
    send.__globals__  # noqa
    derive_nonces(PT_SEND, b"CMPT_SEND_SIGMA", pre,
        [(SLOT_PLAIN,m),(SLOT_PLAIN,r),(SLOT_PLAIN,b),(SLOT_PLAIN,rho),(SLOT_MASKED,sk_A)],
        LABELS_SEND, b"\x00"*31); print("short aux: NOT REJECTED")
except ValueError as e: print("short aux rejected:", e)

# 6. cross-type separation with identical bytes
p_id = fs_prefix([(KIND_OPAQUE, b"same")])
x = derive_nonces(0x02, b"D", p_id, [(SLOT_MASKED,sk_A)], [b"L"], AUX_ZERO)
y = derive_nonces(0x03, b"D", p_id, [(SLOT_MASKED,sk_A)], [b"L"], AUX_ZERO)
print("cross-proof-type separation:", x[0] != y[0])

# 7. identical inputs -> identical output (pure function)
print("purity:", send(AUX_ZERO) == send(AUX_ZERO))
