# The nonce patch — vendored mpt-crypto at `85dbac7` (tag `1.0.4`)

**Executed 2026-08-18.** Path A from issue #2, chosen by Nandan. Replaces
`generate_deterministic_nonces` in a vendored fork of mpt-crypto and fixes its
four call sites.

**Note on the pin, corrected 2026-08-18.** `85dbac73d033241b73f0565ae7cce86d07005c70`
**is** tag `1.0.4` — the newest tagged release of the C library. Issue #2 and the
review packet describe the library as moving `0.4.0-rc4` → `1.0.4` → `85dbac7`,
which reads as though `85dbac7` were an untagged commit past `1.0.4`. It is not.
The chain is `48a3cfe` (`0.4.0-rc4`, `1.0.0`, `1.0.1`) → `bec3003` (`1.0.2`) →
`85dbac7` (`1.0.4`). This fork tracks the latest release rather than a floating
commit, which is a better position than the packet implies.

**Result: a `ConfidentialMPTSend` with sigma nonces this project derived was
accepted on Devnet.** `tesSUCCESS`, validated, transaction
`EFFBB35CA522DE5A3A4B8FF68FD411298CBB828E04F66B98A8A13F9D37574DD9`.

**This is throwaway spike code.** It is committed under P-8 — a value whose
generator is unavailable is not checkable — and because the patch is the
artifact. It is not the signer, and nothing should be built on it.

---

## 0. What this is, in one paragraph

REVIEW-005c struck ADR-0001 §(e)'s nonce formula and specified a replacement,
but §3 recorded that the replacement was **not installable**: mpt-crypto
exposes no entry point that lets a caller influence the nonce. Path A vendors
mpt-crypto at a pinned commit and replaces one function. That is what this is.
Six files differ from upstream; the other 44 are byte-identical, and
`vendor-verify.sh` asserts it. The Fiat–Shamir challenge is **unchanged** —
tested by having the pristine upstream verifier accept our proofs, and then by
the ledger accepting one. *Tested, not proven*: upstream-verifier compatibility
is executed at **n=3 and n=4 with a bound context** — the two shapes Send
actually uses — and a passing test is not a proof for every input. The n=4 arm
exists because adversarial review caught this sentence overclaiming: it
previously said "with and without a context", where the no-context evidence was
a nonce-KDF vector over opaque bytes, which cannot detect a
statement-serialisation bug at all.

## 1. What changed, and why each change

Upstream's construction satisfied four of the nine properties both review legs
agreed on. The five it did not:

| Required by REVIEW-005c §2 | Upstream `85dbac7` | Where fixed |
|---|---|---|
| HKDF-**SHA-512** | HMAC-SHA-256 | `wconf_generate_nonces` |
| Transcript **bytes** bound in, shared with the challenge | only `statement_hash`, a 32-byte digest built by a **second, separately written encoder** | one encoder per proof type, in the four provers |
| Wide 64-byte reduction | `reduce32` of a 32-byte HMAC output, biased ~2⁻¹²⁸ | `secp256k1_mpt_scalar_reduce64`, new |
| **No rejection sampling** | retries with an appended `sub_counter` byte | deleted |
| **Abort on zero, never retry** | retries, up to 256 times | `return 0` |

Already satisfied upstream and preserved: fixed-width 32-byte big-endian
witness encoding, length framing throughout, per-proof-type domain and count
separation, and the ConvertBack witness order `(b, ρ, sk_A)` — **verified in
place**, not assumed, at `proof_compact_convertback.c`.

### The one that mattered most

Upstream built the statement bytes **twice**: once inside the challenge
function, once again in the prover to make `stmt_hash`. The two agreed at
`85dbac7`, but nothing *made* them agree. REVIEW-005b §1.1 requires one
construction feeding both. So each prover now serialises its statement once and
passes those bytes to the nonce KDF and to the challenge.

The challenge hashes the same bytes in the same order as upstream. That is not
a stylistic constraint — rippled recomputes this challenge, so any reordering
rejects on chain. `nonce-crosscheck.ts` check 1 is what holds the line.

### The construction

```
IKM  = "WCONF-NONCE-v1"
    || u32be(k)
    || u32be(domain_len)  || domain
    || u32be(witness_len) || witness'
    || u32be(stmt_len)    || stmt_bytes      <- the challenge's bytes, not a re-derivation
    || u32be(ctx_len)     || context_id      <- ctx_len = 0, no bytes, if NULL

PRK  = HMAC-SHA512("WCONF-NONCE-v1/HKDF-Extract-salt", IKM)   [fixed salt, no entropy]
T(i) = HMAC-SHA512(PRK, T(i-1) || domain || i)                [64 bytes per nonce]
n_i  = T(i) reduced mod the group order, wide                 [one block, one nonce]
```

Every variable-length field is length-framed, so no two distinct input tuples
produce the same preimage. Each 64-byte Expand block feeds exactly one wide
reduction, which is what removes the rejection-sampling branch entirely rather
than merely making it rare.

## 2. The flag — issue #1 is RULED, and the default changed

> **Updated 2026-08-18.** Issue #1 was ruled: **a hostile same-host process is in
> ADR-0001 §(a)'s threat model**. That selects leg A, so `WCONF_HEDGE` now
> **defaults to 1** and `vendor-verify.sh` fails if it does not. The deterministic
> arm is retained as `-DWCONF_HEDGE=0`, for two reasons: T-9 measures both arms,
> and the hedged build deliberately gives up reproducibility — so the property
> that shows the derivation is *ours rather than upstream's* has to be
> demonstrated on the deterministic arm. `nonce-crosscheck.ts` §2 does exactly
> that.
>
> The same ruling obliges §(a)'s process boundary to gain per-transaction
> confirmation, short-lived scoped tokens, no browser-persisted bearer secret,
> and preferably OS-mediated IPC. That is architecture, not this file.
>
> The section below is the original text, kept because it records what the two
> constructions are and why the choice was one XOR.

### Original text, written while #1 was open

REVIEW-005c §2 could not settle deterministic (leg B) versus hedged (leg A),
because it reduces to whether a same-host adversary is in ADR-0001 §(a)'s
threat model. Nandan left #1 open for this session. The two constructions
differ **only** in whether a 32-byte mask is XORed over the long-lived secret
before hashing, so that is exactly one compile-time branch:

```
cc ...                  # leg B, fully deterministic. THE DEFAULT.
cc -DWCONF_HEDGE=1 ...  # leg A, BIP-340 style aux mask
```

`wconf_hedge_aux()` is the only place in the patched tree that can draw entropy
during proof generation. `vendor-verify.sh` asserts the default is still 0, so
nobody picks a side by accident.

The long-lived secret is **not** at witness offset 0 everywhere — it is at 64
in ConvertBack, whose witness order is `(b, ρ, sk_A)`. The offset is an
explicit parameter rather than a convention, because a convention would have
been wrong in exactly one of four places.

## 3. What was tested, and what each test would catch

| Test | What fails if it breaks |
|---|---|
| `nonce-crosscheck.ts` #1, #4 | **The pristine upstream verifier accepts our proof, at n=3 and n=4.** If the statement refactor changed one byte of the challenge, this fails and so would the ledger |
| `nonce-crosscheck.ts` #2 | The **deterministic arm** reproduces byte-identically and upstream does not — this is what shows the KDF is ours. The default arm deliberately does *not* reproduce, because it is hedged |
| `nonce-crosscheck.ts` #3 | A Sequence-only change moves every sigma response — the exact defect REVIEW-005c §1 found |
| `t1-vectors.ts` | 13 known-answer vectors, each generated by the C and reproduced by an **independent TypeScript implementation written from the prose above**, plus 8 separation properties — including the non-zero `sk_offset` ConvertBack uses |
| `build-t9.sh` | **Exactly 1** entropy draw per proof in the default (hedged) build, at one site, stable; **0** under `-DWCONF_HEDGE=0`. ⚠ **The count no longer discriminates against upstream**, which also draws exactly one per proof — see §8 |
| `vendor-verify.sh` | Only the six allowed files differ from `85dbac7`; the sentinel survives; no call site reaches the old function; the hedge default is untouched |
| `t-nbound` | n=65 rejected with genuine 65-element vectors, n=1..4 and n=64 accepted. Discriminates by RETURN VALUE — `prove` returns 0 with the guard and 1 without — so there is no crash-dependent or garbage-dependent pass. Verified in both directions |
| Devnet | `tesSUCCESS`, and the balance actually moved |

## 4. Scope — what this patch does NOT cover

**The Bulletproof is untouched.** A 946-byte `ZKProof` is 192 bytes of sigma
proof followed by a 754-byte aggregated Bulletproof. This patch replaced the
sigma nonces. The Bulletproof draws its own randomness through
`generate_random_scalar()` — eight call sites in `bulletproof_aggregated.c` —
and still does. `nonce-crosscheck.ts` asserts this boundary explicitly rather
than leaving it to be discovered: the sigma prefix reproduces, the tail does
not.

That is not an oversight, it is REVIEW-005c §6's open item: `r`, `ρ` and the
Bulletproof randomness are **unowned**, and both review legs asked for a third
packet on them ahead of the keygen one. This session did not touch it.

**Every entropy source in the tree, enumerated** (`grep RAND_bytes`, `85dbac7`):

| Site | Purpose | Touched? |
|---|---|---|
| `mpt_internal.h` `wconf_hedge_aux` | the issue-#1 hedge | **added; ON by default since the 2026-08-18 ruling** |
| `mpt_internal.h` `generate_random_scalar` | Bulletproof only, 8 call sites | no — §6's open item |
| `mpt_utility.cpp:478` | `mpt_generate_blinding_factor` → `r`, `ρ` | no — §6's open item |
| `mpt_utility.cpp:89` | secp256k1 context randomisation, once per process | no |
| `elgamal.c:58` | `mpt_generate_keypair` | no |

`RAND_bytes` is the only route to `getentropy` in this tree, which is what
makes T-9 an exact count rather than an estimate. ⚠ **That is a grep proving a
negative**, carrying the same caveat U-30 carries about itself: a direct
`getentropy` call, or entropy reached under a name not grepped for, would not be
caught. What T-9 counts exactly is calls to `RAND_bytes` from statically linked
mpt-crypto objects.

## 5. Reproducing

```bash
./vendor-verify.sh                     # clone 85dbac7, apply, assert nothing else moved
./build.sh                             # patched + pristine libraries and mptool binaries
bun nonce-crosscheck.ts                # 11 checks, no network
bun t1-vectors.ts                      # 18 checks against committed vectors
./build-t9.sh                          # both arms
bun devnet-send-our-nonces.ts          # Devnet only; refuses any network_id but 2
```

`wconf-nonces.patch` applies cleanly to a pristine `85dbac7` and reproduces the
working tree byte-for-byte — verified, not assumed.

## 6. What a later session should know

- **The Rust crates look like they do not need forking — read, not executed.**
  `mpt-crypto-sys`'s `build.rs` resolves its library from `MPT_CRYPTO_LIB_DIR`
  before anything else, and links a **prebuilt dylib** rather than compiling the
  C. On that reading the patched library drops into the Rust FFI path via one
  environment variable, and Path A costs materially less than issue #2
  estimated. **No Rust binary was linked this session and no signer exists**, so
  this is the build system's documented resolution order read from its source,
  and nothing more. `CLAIMS.md` E-61 grades it B for that reason. Whoever tries
  it first should expect F-18's header drift to bite.
- **But the crate pins `0.3.0-rc2`**, older than the `0.4.0-rc4` in rippled
  3.3.0 and three tags below `1.0.4`. Left alone it **builds and links fine** —
  its vendored header is byte-identical to the header in the tarball it
  downloads — so you silently get an old prover. Point it at a current library
  and the drift turns loud instead: the pinned header declares **seven functions
  that no longer exist at `1.0.4`**, because upstream *removed* exported API.
  Recorded as F-18 / U-36.
- **`mpt-crypto-sys` is not on the mainline branch.** It was published from
  `XRPLF/xrpl-rust` commit `d36ef38`, path `internal/mpt-crypto-sys`, which is
  the head of the unmerged branch `mpt-crypto-beta-release` and is absent from
  `main` and from the `v1.2.0` release. **`v1.2.0` is the `xrpl` client crate**,
  versioned independently of these two; it says nothing about mpt-crypto.
  True of `0.1.0-beta.1` on 2026-08-18. `0.1.0` was published the same day from
  a `release-1.3.0` commit, and `internal/mpt-crypto-sys` is on `main` now
  (`CLAIMS.md` E-299).
- **Do not paraphrase the construction into ADR-0001.** REVIEW-005c is explicit,
  and a second copy of a byte-exact specification is a divergence waiting to
  happen. §1 above is the description; `mpt_internal.h` is the definition.

## 7. Adversarial review, 2026-08-18 — findings and what changed

Two independent legs, neither shown the other's output: **Codex** (full
repository access) and **Gemini** via `agy` (diff only, no file access). Verbatim
Gemini output is at `docs/reviews/REVIEW-009-gemini-nonce-patch-2026-08-18.md`.
Every finding below was re-checked against source here before being accepted.

**Both legs independently found the same defect** — uncleansed `aux_buf` on the
statement-serialisation failure path in three provers. That is the strongest
signal in the set, and it is fixed.

| # | Leg | Severity | Finding | Disposition |
|---|---|---|---|---|
| 1 | Codex | **HIGH** | `STD_STMT_POINTS(n) = 2n+6` and the `*33` are unchecked `size_t`. At n = 2⁶³−2 the length wraps to 2, `malloc(66)` succeeds, and the serialiser writes n points into it — a heap OOB **write** | **FIXED.** `STD_MAX_PARTICIPANTS 64` enforced in prove, verify and the challenge helper. Regression test `t-nbound.c`, and the test was confirmed to abort (exit 134) with the guard deleted |
| 2 | Codex + Gemini | LOW | `aux_buf` not cleansed when statement serialisation fails, in clawback, convertback and pok_sk. Hedged builds only | **FIXED** in all three. The standard prover was never affected — it serialises before `aux_buf` exists |
| 3 | Gemini | LOW | `sk_offset + 32 > witness_len` wraps for `sk_offset` near `SIZE_MAX`, passing the guard, then the XOR loop writes out of bounds | **FIXED** — underflow-safe form. Not reachable in-tree; all four call sites pass literal 0 or 64 |
| 4 | Gemini | LOW | `prev[64]` passed uninitialised on the first Expand iteration. Never read (`cl[0] == 0`), but trips MSan | **FIXED** — zero-initialised |
| 5 | Codex | MEDIUM | **Evidence gap:** no vector exercised a non-zero `sk_offset`, so a ConvertBack prover that regressed 64 → 0 would still have passed every committed vector. `wconf-kat.c` could not even express it | **CLOSED, in two halves.** `wconf-kat` takes an `sk_offset` argument and two vectors pin the KDF's handling of it. The **prover's argument** is a different thing and the vectors cannot see it — the second review round caught that too — so `vendor-verify.sh` asserts `aux, 64)` at the ConvertBack call site and `aux, 0)` at the other three, at source level |
| 6 | Codex | MEDIUM | **Evidence gap:** transcript-compatibility ran only at n=3 — `nonce-crosscheck.ts` hard-coded `"3"` — while the doc claimed n=3 and n=4 | **CLOSED.** n=4 arm added, proved by us and verified by the pristine upstream library. The doc sentence is corrected above |
| 7 | Codex | MEDIUM | T-9's `RAND_bytes` override cannot see `RAND_priv_bytes`, `RAND_bytes_ex`, a direct `getentropy`/`getrandom`, or `arc4random` | **ACCEPTED as a scope limit, and narrowed by measurement.** Grepped all seven at `85dbac7`: the only occurrence of any of them is `getentropy` inside a comment this patch wrote. So `RAND_bytes` genuinely is the sole entropy route in the tree today; what T-9 would miss is a **new** route added later. E-62 is reworded to say so |

**Neither leg found a defect in the two things most likely to be wrong** — the
wide reduction and the Fiat–Shamir transcript. Both legs verified
`reduce64` independently (`shift_be[15] = 1` is big-endian 2¹²⁸; discarding
`set_b32`'s overflow flag is sound because reduction mod n is a homomorphism),
and both confirmed the statement order matches upstream for non-overflowing n.

**Not accepted:** nothing. Every finding was either fixed or, in the case of #7,
accepted as a stated limitation with the claim narrowed to match.

## 8. Second review round, 2026-08-18 — the merge gate

The fixes in §7 had themselves never been reviewed, so a second Codex round ran
against the post-fix branch as a merge gate. Verdict: **fix-before-merge**, five
blockers. All five are fixed below. Two of them undercut claims made in §7, and
both were right to.

| # | Blocker | Disposition |
|---|---|---|
| 1 | **`t-nbound.c` had a false-pass mode.** It tested the wrapping values by passing single-element arrays as n-element vectors; with the guard removed, serialisation reads `Pk_vec[1]` from stack garbage, fails, `prove` returns 0, and the test prints PASS *having just performed an out-of-bounds read*. It passed for the wrong reason | **FIXED, and the test is now stronger than the original.** The discriminator is n=65 with **genuine 65-element arrays**: `prove` returns 0 with the guard and **1** without, because 65 does not wrap. No undefined behaviour, no dependence on stack contents. Verified in both directions. n=64 is also asserted accepted, so the bound is pinned rather than merely present. The wrapping values are deliberately no longer tested, and §the file says why: doing so requires UB *in the test*, and a test that relies on UB cannot distinguish a fix from luck |
| 2 | **"the same code rippled runs" was unsupported and locally contradicted.** rippled 3.3.0 ships `0.4.0-rc4`; we vendor `1.0.4` | **FIXED — and the claim turns out to be true, now with evidence.** `git diff 0.4.0-rc4 1.0.4 -- src/ include/` is **empty**. The five commits between the tags touch CI scripts, workflows and CMake only; zero library code. `vendor-verify.sh` asserts it on every run, so it is checked rather than claimed |
| 3 | **The n=4 crosscheck established only 1.0.4-local compatibility** | **RESOLVED by #2.** Since the sources are identical, a 1.0.4 verifier *is* rippled's verifier. Narrowing the claim would have been the wrong fix — the right one was to establish the premise |
| 4 | **The `sk_offset` vectors cannot catch a prover call-site regression**, because they call `wconf-kat`, not the ConvertBack prover | **FIXED in the honest way: narrowed AND covered.** The vectors' note now says plainly what they do and do not pin. `vendor-verify.sh` asserts `aux, 64)` at the ConvertBack call site and `aux, 0)` at the other three, at source level — which is exactly what the vectors cannot see |
| 5 | **"proves" used where the project's own rule says "tests"** | **FIXED** in `nonce-crosscheck.ts` and this document |

**What the second round did not find.** No defect in the wide reduction, the HKDF
framing, the statement-encoder order, or any of the four LOW/HIGH fixes from §7 —
which it verified line by line rather than taking on trust. The `aux_buf` cleanse
was confirmed complete across every `goto cleanup` and bare `return` in all four
provers.

**The pattern worth naming.** Round one found a defect the code had; round two
found defects in *round one's own fixes and claims* — a false-pass test and two
overstated sentences. Fixing something and describing the fix are separate acts
with separate failure modes, and only the second round was in a position to catch
the second kind.

## 9. Second adversarial round on the hedge flip, 2026-08-18

Three legs (self, Codex, Gemini) reviewed the flip. Adjudicated in
`docs/reviews/REVIEW-011c-adjudication-decision-branch-2026-08-18.md`.

**The flip made four documents false without breaking a single test** — including
`CLAIMS.md` E-62, a graded register row. All corrected. The lesson worth keeping:
**changing a default is a documentation change**, and nothing in the workflow
treated it as one.

**Accepted verification gap, not yet closed.** T-9's count was a discriminator
when it asserted **zero** draws, because upstream draws one. Now that the default
draws one too, the count is consistent with an *unpatched* build. What still
discriminates is `vendor-verify.sh` (the tree is patched) and the deterministic
arm's reproducibility (the KDF is ours) — neither proves *this binary* was built
from *that tree*.

**The cheap fix, recorded for whoever picks it up:** `t9-entropy.c` already
overrides `RAND_bytes` deterministically. The same technique yields a hedged
build with a fixed `aux`, which makes the hedged path reproducible and therefore
KAT-able against the default binary directly. That closes the gap without
touching the construction.

**Also open:** the hedged default has **never been executed on Devnet**. E-60's
accepted transaction used the deterministic build.
