from cmpt_nonce_ref import *

def hx(b): return b.hex()

# --- deterministic, obviously-fake but valid test material -------------------
sk_A   = 0x0000000000000000000000000000000000000000000000000000000000000007
sk_R   = 0x000000000000000000000000000000000000000000000000000000000000000B
sk_I   = 0x000000000000000000000000000000000000000000000000000000000000000D
sk_iss = 0x0000000000000000000000000000000000000000000000000000000000000011

m   = 1234567
r   = 0x2b1f8c0d9e4a5713c8f60b2d3a94e7561fb08c2d7e93a4150c6b8d2f3e5a7091
b   = 98765432100
rho = 0x0c9d3a7e15b284f6039e7c1d5a8b3f240761c9e83d5a2b4f108e6c3d97a5b201

P1 = pubkey(sk_A); P2 = pubkey(sk_R); P3 = pubkey(sk_I)
PA = P1

# statement points: arbitrary but valid curve points, deterministic
C1   = pubkey(r)
C2_1 = pubkey(0x21); C2_2 = pubkey(0x22); C2_3 = pubkey(0x23)
PCm  = pubkey(0x31); PCb = pubkey(0x32)
B1   = pubkey(0x41); B2  = pubkey(0x42)
mG   = pubkey(m)
Piss = pubkey(sk_iss)

TXCTX_A = bytes.fromhex("a1"*32)
TXCTX_B = bytes.fromhex("a1"*31 + "a0")   # differs in the final byte only

AUX_ZERO = bytes(32)
AUX_ONE  = bytes.fromhex("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f")

def send_prefix(txctx):
    return fs_prefix([(KIND_POINT,P1),(KIND_POINT,P2),(KIND_POINT,P3),
                      (KIND_POINT,PA),(KIND_POINT,C1),
                      (KIND_POINT,C2_1),(KIND_POINT,C2_2),(KIND_POINT,C2_3),
                      (KIND_POINT,PCm),(KIND_POINT,PCb),
                      (KIND_POINT,B1),(KIND_POINT,B2),
                      (KIND_OPAQUE,txctx)])

def send(aux, txctx=TXCTX_A):
    return derive_nonces(PT_SEND, b"CMPT_SEND_SIGMA", send_prefix(txctx),
        [(SLOT_PLAIN,m),(SLOT_PLAIN,r),(SLOT_PLAIN,b),(SLOT_PLAIN,rho),(SLOT_MASKED,sk_A)],
        LABELS_SEND, aux)

cb_prefix = fs_prefix([(KIND_POINT,PA),(KIND_POINT,B1),(KIND_POINT,B2),
                       (KIND_POINT,PCb),(KIND_OPAQUE,TXCTX_A)])
def cb(aux):
    return derive_nonces(PT_CONVERTBACK, b"CMPT_CONVERTBACK_SIGMA", cb_prefix,
        [(SLOT_PLAIN,b),(SLOT_PLAIN,rho),(SLOT_MASKED,sk_A)], LABELS_CB, aux)

claw_prefix = fs_prefix([(KIND_POINT,Piss),(KIND_POINT,C1),(KIND_POINT,C2_1),
                         (KIND_POINT,mG),(KIND_OPAQUE,TXCTX_A)])
def claw(aux):
    return derive_nonces(PT_CLAWBACK, b"CMPT_CLAWBACK_SIGMA", claw_prefix,
        [(SLOT_MASKED,sk_iss)], LABELS_CLAW, aux)

def dump(name, vals):
    print(f"### {name}")
    for v in vals:
        print("  " + format(v,'064x'))

print("send_prefix len =", len(send_prefix(TXCTX_A)))
print("cb_prefix len   =", len(cb_prefix))
print("claw_prefix len =", len(claw_prefix))
print()
dump("V1 Send aux=00*32", send(AUX_ZERO))
dump("V2 Send aux=000102..1f", send(AUX_ONE))
dump("V3 Send aux=00*32, TxCtxID last byte a1->a0", send(AUX_ZERO, TXCTX_B))
dump("V4 ConvertBack aux=00*32", cb(AUX_ZERO))
dump("V5 Clawback aux=00*32", claw(AUX_ZERO))
print()
print("V1 vs V3 all differ:", all(x!=y for x,y in zip(send(AUX_ZERO), send(AUX_ZERO,TXCTX_B))))
print("V1 vs V2 all differ:", all(x!=y for x,y in zip(send(AUX_ZERO), send(AUX_ONE))))
print("V1 pairwise distinct:", len(set(send(AUX_ZERO)))==5)
print("Send[b,rho,sk] vs CB nonces disjoint:", set(send(AUX_ZERO)).isdisjoint(set(cb(AUX_ZERO))))
print()
print("PA  =", hx(PA))
print("C1  =", hx(C1))
print("PCb =", hx(PCb))
print("B1  =", hx(B1))
print("B2  =", hx(B2))
print("mG  =", hx(mG))
print("Piss=", hx(Piss))
print("SALT=", hx(SALT))
