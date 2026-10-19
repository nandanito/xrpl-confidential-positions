#!/usr/bin/env bash
#
# Builds everything this spike needs:
#   - the PATCHED mpt-crypto library and mptool  (our nonces)
#   - the PRISTINE upstream library and mptool   (the control, and the verifier
#                                                 whose acceptance is the test)
#   - wconf-kat, which exposes wconf_generate_nonces for the T-1 vectors
#
# Prerequisites, inherited from the 2026-08-17 spike and unchanged:
#   - /tmp/wconf/mpt-crypto  — a checkout of XRPLF/mpt-crypto at 85dbac7 with
#                              wconf-nonces.patch applied
#   - /tmp/wconf/secp256k1   — v0.7.1 at 1a53f4961f337b4d166c25fce72ef0dc88806618,
#                              built (build/lib/libsecp256k1.a)
#   - homebrew openssl@3
#
# No Conan. mpt-crypto has no build-system-dependent code, so F-9 is a real
# defect but not a blocker.
set -euo pipefail

PIN=85dbac73d033241b73f0565ae7cce86d07005c70
SECP=/tmp/wconf/secp256k1
OSSL=$(brew --prefix openssl@3)
HERE="$(cd "$(dirname "$0")" && pwd)"
PATCHED_SRC=/tmp/wconf/mpt-crypto
PRISTINE_SRC=/tmp/wconf-pristine/mpt-crypto

[ -d "$PATCHED_SRC" ] || { echo "missing $PATCHED_SRC — see WCONF-PATCH.md §5"; exit 1; }
[ -f "$SECP/build/lib/libsecp256k1.a" ] || { echo "missing built secp256k1"; exit 1; }

# The pristine tree is derived from the patched checkout's git object store, so
# it needs no network and cannot drift from the pin.
if [ ! -d "$PRISTINE_SRC" ]; then
  echo "extracting pristine $PIN"
  mkdir -p "$PRISTINE_SRC"
  git -C "$PATCHED_SRC" archive "$PIN" | tar -x -C "$PRISTINE_SRC"
fi

build_lib () {
  local src=$1 out=$2 extra=${3:-}
  local obj="$out/obj"
  mkdir -p "$obj/private"
  # mpt_scalar.c pulls secp256k1 internals in as <private/...>
  ln -sf "$SECP"/src/* "$obj/private/" 2>/dev/null || true
  local cflags=(-O2 "-I$src/include" "-I$SECP/include" "-I$OSSL/include" "-I$obj"
                -DSECP256K1_WIDEMUL_INT128)
  [ -n "$extra" ] && cflags+=("$extra")
  local objs=()
  for f in "$src"/src/*.c; do
    local n; n=$(basename "$f" .c)
    clang "${cflags[@]}" -c "$f" -o "$obj/$n.o"
    objs+=("$obj/$n.o")
  done
  clang++ "${cflags[@]}" -std=c++17 -c "$src/src/utility/mpt_utility.cpp" -o "$obj/mpt_utility.o"
  objs+=("$obj/mpt_utility.o")
  rm -f "$out/libmpt-crypto.a"
  ar rcs "$out/libmpt-crypto.a" "${objs[@]}"
  echo "  $out/libmpt-crypto.a  $(wc -c < "$out/libmpt-crypto.a" | tr -d ' ') bytes"
}

link_tool () {
  local src=$1 lib=$2 csrc=$3 out=$4
  clang -O2 "-I$src/src" "-I$src/include" "-I$SECP/include" "-I$OSSL/include" \
    "$csrc" -o "$out" \
    "$lib/libmpt-crypto.a" "$SECP/build/lib/libsecp256k1.a" \
    -L"$OSSL/lib" -lcrypto -lstdc++
  echo "  $out"
}

echo "patched library (our nonces, HEDGED default per the issue #1 ruling):"
build_lib "$PATCHED_SRC" /tmp/wconf/native

# The deterministic arm is retained so the harness can still demonstrate that
# the nonce derivation is OURS. Under the hedged default a proof deliberately
# does not reproduce, so reproducibility has to be shown on this arm instead.
echo "patched library (deterministic arm, -DWCONF_HEDGE=0):"
build_lib "$PATCHED_SRC" /tmp/wconf/native-det -DWCONF_HEDGE=0

echo "pristine library (upstream $PIN, the control):"
build_lib "$PRISTINE_SRC" /tmp/wconf-pristine/native

echo "tools:"
link_tool "$PATCHED_SRC"  /tmp/wconf/native           "$HERE/../spike-2026-08-17/mptool.c" /tmp/wconf/mptool-patched
link_tool "$PRISTINE_SRC" /tmp/wconf-pristine/native  "$HERE/../spike-2026-08-17/mptool.c" /tmp/wconf/mptool-pristine
link_tool "$PATCHED_SRC"  /tmp/wconf/native           "$HERE/wconf-kat.c"                  /tmp/wconf/wconf-kat
link_tool "$PATCHED_SRC"  /tmp/wconf/native           "$HERE/t-nbound.c"                   /tmp/wconf/t-nbound
link_tool "$PATCHED_SRC"  /tmp/wconf/native-det       "$HERE/../spike-2026-08-17/mptool.c" /tmp/wconf/mptool-deterministic

echo
echo "built. next:"
echo "  bun $HERE/nonce-crosscheck.ts"
echo "  bun $HERE/t1-vectors.ts"
echo "  bash $HERE/build-t9.sh"
echo "  /tmp/wconf/t-nbound        # judge by exit code, not by grepping FAIL"
