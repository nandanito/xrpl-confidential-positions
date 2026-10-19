#!/usr/bin/env python3
"""
CMPT-NONCE/v1 — reference implementation.

Deliberately written from the specification prose, in a different language and by a
different route than the Rust signer will be, so that agreement between the two is
evidence the specification is unambiguous rather than evidence they share a bug.

No dependencies beyond the standard library.
"""

import hashlib
import hmac
from typing import List, Tuple

# ---------------------------------------------------------------- secp256k1

P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
Q = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8


def _inv(a: int, m: int) -> int:
    return pow(a, m - 2, m)


def _add(p1, p2):
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2 and (y1 + y2) % P == 0:
        return None
    if p1 == p2:
        lam = (3 * x1 * x1) * _inv(2 * y1, P) % P
    else:
        lam = (y2 - y1) * _inv(x2 - x1, P) % P
    x3 = (lam * lam - x1 - x2) % P
    return (x3, (lam * (x1 - x3) - y1) % P)


def _mul(k: int, p):
    r = None
    while k:
        if k & 1:
            r = _add(r, p)
        p = _add(p, p)
        k >>= 1
    return r


def point33(p) -> bytes:
    """SEC1 compressed encoding. The identity has no encoding; callers must not pass it."""
    if p is None:
        raise ValueError("point at infinity has no encoding")
    x, y = p
    return bytes([2 + (y & 1)]) + x.to_bytes(32, "big")


def pubkey(sk: int) -> bytes:
    return point33(_mul(sk % Q, (GX, GY)))


# ---------------------------------------------------------------- encoding

LABEL = b"CMPT-NONCE"
VERSION = b"\x01"
SALT = hashlib.sha256(LABEL + VERSION).digest()

KIND_POINT = 0x01
KIND_OPAQUE = 0x02

SLOT_PLAIN = 0x00
SLOT_MASKED = 0x01


def u8(n: int) -> bytes:
    assert 0 <= n < 256
    return n.to_bytes(1, "big")


def u16be(n: int) -> bytes:
    assert 0 <= n < 1 << 16
    return n.to_bytes(2, "big")


def u32be(n: int) -> bytes:
    assert 0 <= n < 1 << 32
    return n.to_bytes(4, "big")


def scalar32(x: int) -> bytes:
    if not 0 <= x < Q:
        raise ValueError("scalar out of range")
    return x.to_bytes(32, "big")


def fs_prefix(elements: List[Tuple[int, bytes]]) -> bytes:
    """elements is an ordered list of (KIND, bytes)."""
    out = u16be(len(elements))
    for kind, b in elements:
        if kind == KIND_POINT and len(b) != 33:
            raise ValueError("point element must be 33 bytes")
        if kind == KIND_POINT and b[0] not in (2, 3):
            raise ValueError("point element must be SEC1 compressed")
        out += u8(kind) + u32be(len(b)) + b
    return out


def th512(tag: bytes, msg: bytes) -> bytes:
    t = hashlib.sha256(tag).digest()
    return hashlib.sha512(t + t + msg).digest()


def hkdf_extract(salt: bytes, ikm: bytes) -> bytes:
    return hmac.new(salt, ikm, hashlib.sha512).digest()


def hkdf_expand(prk: bytes, info: bytes, length: int) -> bytes:
    assert length <= 64, "this construction never needs more than one block"
    return hmac.new(prk, info + b"\x01", hashlib.sha512).digest()[:length]


# ---------------------------------------------------------------- construction

AUX_TAG = b"CMPT-NONCE/v1/aux"


def derive_nonces(
    proof_type_id: int,
    domain_tag: bytes,
    prefix: bytes,
    witness: List[Tuple[int, int]],  # ordered [(SLOT_KIND, scalar)]
    nonce_labels: List[bytes],
    aux: bytes,
) -> List[int]:
    if len(aux) != 32:
        raise ValueError("aux must be exactly 32 bytes")
    if b"\x00" in domain_tag:
        raise ValueError("domain tag must not contain NUL")
    if len(witness) != len(nonce_labels):
        raise ValueError("witness arity does not match nonce count")

    mask = th512(AUX_TAG, aux)[:32]

    ikm = bytearray()
    ikm += LABEL
    ikm += VERSION
    ikm += u8(proof_type_id)
    ikm += u32be(len(domain_tag)) + domain_tag
    ikm += u32be(len(prefix)) + prefix
    ikm += u8(len(witness))
    for j, (slot_kind, value) in enumerate(witness):
        if slot_kind == SLOT_MASKED:
            if not 1 <= value < Q:
                raise ValueError("long-lived secret must be in [1, q)")
            enc = bytes(a ^ b for a, b in zip(scalar32(value), mask))
        else:
            enc = scalar32(value)
        ikm += u8(j) + u8(slot_kind) + enc

    prk = hkdf_extract(SALT, bytes(ikm))

    out = []
    for j, lbl in enumerate(nonce_labels):
        info = LABEL + VERSION + u8(proof_type_id) + b"n" + u8(j) + u8(len(lbl)) + lbl
        okm = hkdf_expand(prk, info, 64)
        alpha = int.from_bytes(okm, "big") % Q
        if alpha == 0:
            raise RuntimeError("derived zero nonce — abort")
        out.append(alpha)
    return out


# ---------------------------------------------------------------- proof types

PT_SEND = 0x01
PT_CONVERTBACK = 0x02
PT_CLAWBACK = 0x03
PT_REGISTER = 0x04

LABELS_SEND = [b"send/alpha_m", b"send/alpha_r", b"send/alpha_b",
               b"send/alpha_rho", b"send/alpha_sk"]
LABELS_CB = [b"convertback/t_b", b"convertback/t_rho", b"convertback/t_sk"]
LABELS_CLAW = [b"clawback/t_sk"]
LABELS_REG = [b"register/t_sk"]
