# mpt-crypto measurement harness

Three C programs that produced `docs/task-zero/benchmarks-2026-08-16.md`. They are **not**
part of mpt-crypto and are not upstream. They live here so the numbers stay reproducible;
under standing prohibition **P-8**, a benchmark whose code is unavailable is not a
publishable number.

| File | What it measures |
|---|---|
| `wconf_bench.c` | Bulletproof prove/verify (m=1 and m=2) and all three compact sigma proofs, 50 runs each, reporting min/median/mean/p95/max/sd. Also walks ElGamal decrypt across four window widths to derive per-iteration cost |
| `wconf_dlp.c` | ElGamal decrypt at the documented default window `[0, 1000000]`, including the over-bound case and its recovery at a wider window |
| `wconf_window.c` | Narrow-window decryption at large plaintexts — the measurement that shows cost tracks window **width**, not value magnitude |

## Running them

They `#include "test_utils.h"` from mpt-crypto's own `tests/`, so build them inside that
tree rather than standalone:

```bash
git clone https://github.com/XRPLF/mpt-crypto.git && cd mpt-crypto
git checkout 0.4.0-rc4                      # == 1.0.0 == 1.0.1 == 48a3cfe
conan remote add ripple https://conan.ripplex.io --index 0   # required; see CLAIMS.md F-9
cp /path/to/tools/mpt-crypto-bench/wconf_*.c tests/
```

Append to `tests/CMakeLists.txt`:

```cmake
foreach(b wconf_bench wconf_dlp wconf_window)
    add_executable(${b} ${b}.c)
    target_link_libraries(${b} PRIVATE mpt-crypto secp256k1::secp256k1 OpenSSL::Crypto)
endforeach()
```

Then:

```bash
mkdir -p build && cd build
conan install .. --build=missing -o "&:tests=True"
cmake .. -DCMAKE_BUILD_TYPE=Release -G Ninja \
         -DCMAKE_TOOLCHAIN_FILE:FILEPATH=build/generators/conan_toolchain.cmake
ninja && ctest --output-on-failure          # 11/11 expected
ninja wconf_bench wconf_dlp wconf_window
./tests/wconf_bench && ./tests/wconf_dlp && ./tests/wconf_window
```

`wconf_dlp` takes about 10 s — four full 10⁶-iteration DLP scans by design.

## If you publish anything from these

Restate the hardware, compiler, flags, run count and spread from
`benchmarks-2026-08-16.md` §1, or do not publish the number. That file's §1 is the
disclosure P-8 requires; this directory is the other half of it.
