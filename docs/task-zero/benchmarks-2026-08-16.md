# mpt-crypto benchmarks — measured 2026-08-16

Replaces the **UNUSABLE** timings in `TASK-ZERO-2026-08-13.md` §6 (XLS-0096 §14.2:
"~44.8 ms proving, ~22.6 ms verification" on a "laptop-class CPU", no model, clock,
compiler or flags). Those cannot be cited under standing prohibition **P-8**.

**P-8 applies to these numbers exactly as it applied to the specification's.** Everything
needed to reproduce or reject them is stated below. If you quote a number from this file,
quote the hardware and parameters with it, or do not quote it.

---

## 1. Measurement environment

| | |
|---|---|
| **Machine** | Apple `Mac15,6` (MacBook Pro 14", M3 Pro) |
| **CPU** | Apple M3 Pro — 12 physical / 12 logical cores (6 performance + 6 efficiency) |
| **Clock** | **Not exposed.** `hw.cpufrequency` returns empty on Apple Silicon. Nominal P-core boost is ~4.05 GHz per Apple's published figures; *this was not read from the machine and is not a measurement.* |
| **RAM** | 18 GB unified |
| **OS** | macOS 26.6.1, build 25G76 (Darwin 25.6.0, arm64) |
| **Compiler** | Apple clang 21.0.0 (`clang-2100.1.1.101`), via `/usr/bin/cc` |
| **Build type** | CMake `Release` |
| **C flags (library)** | `-O3 -DNDEBUG -arch arm64 -fPIC -Wall -Wextra -Wpedantic -DSECP256K1_WIDEMUL_INT128` |
| **C flags (harness)** | `-O3 -DNDEBUG -arch arm64 -fPIE -Wall -Wextra -Wpedantic` |
| **SDK** | `MacOSX.sdk` (Command Line Tools) |
| **Generator** | Ninja |
| **Dependencies** | `secp256k1/0.7.1` (Ripple Conan remote), `openssl/3.6.2` (conancenter), `zlib/1.3.2` |
| **Conan** | 2.31.2 |
| **Power / thermal** | AC power, no sustained load before the run. **Not thermally controlled.** No CPU pinning, no `nice`, no core affinity — macOS does not expose P-core pinning to userland. |

### Version measured

**mpt-crypto commit `48a3cfe4be2122b77c2baec079353c5d35cce785`**, dated 2026-07-14
(`fix(elgamal): prevent infinite loop when range_high = UINT64_MAX`, PR #133).

Tags `0.4.0-rc4`, `1.0.0` and `1.0.1` **all point at this same commit.** rippled 3.3.0
pins `0.4.0-rc4`, so the version measured is exactly the version rippled 3.3.0 consumes —
and it is also, byte for byte, the `1.0.1` release. See §5.

---

## 2. Method

- Harness: `tests/wconf_bench.c`, added to the mpt-crypto tree for this measurement and
  **not** upstream. Setup code for each proof is lifted from the corresponding upstream
  test so the measured operation is the one the test suite exercises.
- Registered as a plain `add_executable`, deliberately **not** an `add_test` — it is a
  benchmark, not a test.
- Timing: `timespec_get(TIME_UTC)` around the single library call, nothing else inside
  the timed region. Setup, allocation and generator-vector construction are outside it.
- **50 runs per operation**, preceded by one untimed warm-up (page-in and generator caches).
- Reported: min, median, mean, p95, max, sample standard deviation. **Spread, not just the
  mean** — the max column is where the honest reader looks first.
- Values proved are representative non-zero amounts (1,000,000 and 1,000,000+7,919), not
  the upstream test's `{0, 0}`, which exercises a shortcut path.

---

## 3. Results — all times in milliseconds

### Bulletproofs

| Operation | n | min | **median** | mean | p95 | max | sd |
|---|---|---|---|---|---|---|---|
| agg m=2 **prove** (`ConfidentialMPTSend`) | 50 | 33.545 | **34.583** | 35.192 | 37.578 | 54.140 | 2.908 |
| agg m=2 **verify** (`ConfidentialMPTSend`) | 50 | 15.564 | **16.100** | 16.337 | 16.793 | 24.377 | 1.197 |
| m=1 **prove** (`ConfidentialMPTConvertBack`) | 50 | 16.829 | **17.347** | 17.384 | 18.119 | 18.482 | 0.318 |
| m=1 **verify** (`ConfidentialMPTConvertBack`) | 50 | 7.964 | **8.250** | 8.278 | 8.573 | 8.964 | 0.190 |

The two `max` outliers (54.1 ms prove, 24.4 ms verify) are single samples on the m=2 run and
are consistent with scheduler migration between performance and efficiency cores. They are
reported rather than trimmed. **Quote the median; disclose the max.**

### Compact sigma proofs

| Operation | n | min | **median** | mean | p95 | max | sd |
|---|---|---|---|---|---|---|---|
| standard (n=3) **prove** | 50 | 0.202 | **0.214** | 0.216 | 0.235 | 0.284 | 0.013 |
| standard (n=3) **verify** | 50 | 0.311 | **0.328** | 0.330 | 0.353 | 0.358 | 0.012 |
| convertback **prove** | 50 | 0.081 | **0.083** | 0.087 | 0.099 | 0.116 | 0.007 |
| convertback **verify** | 50 | 0.123 | **0.128** | 0.131 | 0.143 | 0.164 | 0.008 |
| clawback **prove** | 50 | 0.052 | **0.053** | 0.056 | 0.066 | 0.073 | 0.005 |
| clawback **verify** | 50 | 0.090 | **0.094** | 0.097 | 0.109 | 0.166 | 0.011 |

`n=3` is the ciphertext count for a send with an auditor (receiver, issuer, auditor).

### What this means

**The sigma proofs are free; the Bulletproof is the entire cost.** A full
`ConfidentialMPTSend` proof bundle is ~34.8 ms to produce (34.583 + 0.214) and ~16.4 ms to
verify (16.100 + 0.328). The 192-byte sigma component contributes **0.6% of proving time and
2.0% of verification time.** Any optimisation effort belongs in the Bulletproof.

Against the specification's unusable ~44.8 / ~22.6: same order of magnitude, ~23% and ~28%
faster respectively. That is unsurprising on 2026 desktop-class Apple Silicon and is **not**
evidence the specification's figures were wrong — they are unfalsifiable, which is the
point of P-8.

---

## 4. ElGamal decryption — the TOB-RIPCTX-1 bound, measured

This settles the open question in `ADDENDUM-2026-08-16.md` §1. **The addendum's conclusion
is wrong and this section supersedes it.**

The DLP solver (`secp256k1_solve_dlp_small_range_fixed`, `src/elgamal.c:128`) has **no early
exit**. It runs exactly `range_high - max(1, range_low) + 1` iterations whatever the
plaintext, deliberately, so timing cannot leak the value's position in the range.

**Decryption cost is a function of window width, not of the value.**

| plaintext | window | width | result | time |
|---|---|---|---|---|
| 42 | [0, 1 000 000] | 1 000 001 | recovered | 2 589.6 ms (mean of 3) |
| 999 999 | [0, 1 000 000] | 1 000 001 | recovered | 2 522.1 ms (mean of 3) |
| 1 000 001 | [0, 1 000 000] | 1 000 001 | **not recovered** | 2 534.90 ms |
| 1 000 001 | [0, 1 100 000] | 1 100 001 | **recovered** | 2 739.10 ms |
| 500 000 000 | [499 999 000, 500 001 000] | 2 001 | recovered | **5.08 ms** |
| 100 000 000 000 | [99 999 999 000, 100 000 001 000] | 2 001 | recovered | **5.07 ms** |
| 10 000 000 000 000 000 | [9 999 999 999 999 000, 10 000 000 000 001 000] | 2 001 | recovered | **5.09 ms** |

Scaling is linear at **~2.49 µs per iteration** (measured across widths 1 000 / 5 000 /
20 000 / 50 000, sd < 1%). The library's own header independently states "[0, 1,000,000]
takes approximately 3 seconds on Apple Silicon" (`include/utility/mpt_utility.h:183`) —
consistent with the 2.5 s measured here.

**A 10¹⁶ balance decrypts in 5 ms.** There is no value ceiling. What costs money is
*uncertainty*, not *magnitude*.

Extrapolated resynchronisation cost, if an application loses track of its expected balance
and must scan:

| scan width | cost |
|---|---|
| 10⁶ | 2.5 s |
| 10⁷ | 25 s |
| 10⁸ | 4.2 min |
| 10⁹ | 42 min |
| 2³² | ~3.0 h |

---

## 5. Build notes — two blockers a newcomer will hit

The build **succeeded**: all 11 tests pass, 6.20 s total. Two things stood between a clean
clone and that result, neither stated in mpt-crypto's README prerequisites.

**Blocker 1 — `secp256k1/0.7.1` is not on conancenter.** It is a Ripple-hosted recipe. Without
`conan remote add ripple https://conan.ripplex.io` the graph cannot resolve. The README
defers Conan setup to rippled's `BUILD.md`, one hyperlink away, and its own Prerequisites
section lists only CMake and a C compiler.

**Blocker 2 — the committed `conan.lock` cannot be resolved from ~~public remotes~~ conancenter** (`conan.ripplex.io` is public and resolves it; `CLAIMS.md` E-300). It pins
`openssl/3.6.2#4789bbf131b77d0515d15e094c8f697f`; conancenter carries openssl/3.6.2 only at
recipe revision `36f92686a9285adfe2ccd1c1dbf9ea35`. The error is
`ERROR: Package 'openssl/3.6.2' not resolved`, which reads like a missing package rather
than a revision mismatch. Adding the Ripple remote resolved it.

The README's CMake invocation, which looks wrong (`-DCMAKE_TOOLCHAIN_FILE=build/generators/…`
run from inside `build/`), is **correct** — CMake resolves a relative toolchain path against
the source directory. Noted here because it costs a newcomer a few minutes of doubt.

### Test suite — 11/11 pass

```
test_elgamal 0.80s · test_elgamal_verify 0.41s · test_pok_sk 0.39s
test_commitments 0.38s · test_ipa 0.54s · test_bulletproof_agg 0.68s
test_mpt_utility 1.00s · test_compact_standard 0.64s · test_compact_clawback 0.53s
test_compact_convertback 0.38s · test_ct_tweak_mul 0.43s
100% tests passed out of 11 — total 6.20 s
```

---

## 6. Proof sizes — confirmed by execution

`test_bulletproof_agg` prints the serialised length of every proof it produces:

```
Single Proof (Value 0)    num_values = 1   Proof size: 688 bytes
Single Proof (Value 1)    num_values = 1   Proof size: 688 bytes
Single Proof (MAX Value)  num_values = 1   Proof size: 688 bytes
Aggregated Proof (0, 1)   num_values = 2   Proof size: 754 bytes
Aggregated Proof (0, 0)   num_values = 2   Proof size: 754 bytes
```

Independently reproduced by the harness at non-zero values: m=1 → 688 B, m=2 → 754 B.
This is **executed** confirmation, not a header reading. See `CLAIMS.md` E-3a.

---

## 7. Reproducing this

```bash
git clone https://github.com/XRPLF/mpt-crypto.git && cd mpt-crypto
git checkout 0.4.0-rc4                    # == 1.0.0 == 1.0.1 == 48a3cfe
conan remote add ripple https://conan.ripplex.io --index 0
mkdir -p build && cd build
conan install .. --build=missing -o "&:tests=True"
cmake .. -DCMAKE_BUILD_TYPE=Release -G Ninja \
         -DCMAKE_TOOLCHAIN_FILE:FILEPATH=build/generators/conan_toolchain.cmake
ninja && ctest --output-on-failure
# then add tests/wconf_bench.c and its add_executable stanza, and:
ninja wconf_bench && ./tests/wconf_bench
```

Harness sources are committed at **`tools/mpt-crypto-bench/`** — `wconf_bench.c` (proof
timings), `wconf_dlp.c` (bound at the documented default), `wconf_window.c` (narrow-window
decryption) — with a README giving the exact CMake stanza and build sequence. A benchmark
whose code is not available is a P-8 violation with extra steps; that directory is the
other half of §1's disclosure.
