# REVIEW-005a reference implementation and the T-2 check

Artifacts belonging to `../REVIEW-005a-ruling-cryptography-leg-A-2026-08-17.md`. **Leg A only. Not adjudicated. Leg B was still running when these were filed.**

| File | Origin | What it is |
|---|---|---|
| `cmpt_nonce_ref.py` | shipped with the ruling | The reviewer's reference implementation. Pure standard library, including a from-scratch secp256k1 |
| `cmpt_nonce_vectors.py` | shipped with the ruling | Generates Appendix A |
| `cmpt_nonce_selftest.py` | shipped with the ruling | The reviewer's own property checks |
| `t2-independent-check.ts` | **written by this project** | The T-2 second implementation |

## Why `t2-independent-check.ts` exists

The ruling's **T-2** asks for a second implementation, *in a different language*, **written from the ruling's prose and not from the Python** — because it is the only test that can fail on account of the **specification** being unclear rather than the code being wrong. The packet's deliverable ("two independent implementers produce the same nonces") is evidenced by nothing else.

So it was done, under that discipline: written from §1.2–§1.6 of the ruling in TypeScript, with `cmpt_nonce_ref.py` unread. Only the vector *inputs* were taken from `cmpt_nonce_vectors.py`.

**Result, 2026-08-17: all five vectors reproduced, zero mismatches.** Independently confirmed alongside them:

- `SALT` equals the constant the ruling states.
- `FS_PREFIX` lengths are 495 / 191 / 191, derived from the framing rules rather than copied — the ruling states the same three numbers.

**T-2 passes. The specification is reproducible from its prose alone.**

## The same discipline now applies to this file

`t2-independent-check.ts` is a second thing a Rust implementer could port from, and porting it would defeat exactly the property T-2 measures. **The Rust implementation must be written from §1 of the ruling.** These two files are for checking it afterwards, not for translating.

## What is still unverified

The ruling's reading of the *paper* — the definition of the statement `x`, Eq. 25, Eq. 31, Theorem 4.2 and Remark 6.1 — was not independently re-derived. All of §3.1 rests on `TransactionContextID` sitting outside `x` while inside the challenge, and that belongs to adjudication.
