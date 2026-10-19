#!/usr/bin/env bash
# Build libmpt-crypto.a natively (no conan): homebrew openssl@3 + locally-built
# secp256k1 v0.7.1. Mirrors what build-wasm.sh does, with clang instead of emcc.
set -euo pipefail
SP=/tmp/wconf
OBJ=$SP/native/obj
OSSL=$(brew --prefix openssl@3)

mkdir -p "$OBJ/private"
# mpt_scalar.c pulls secp256k1 internals in as <private/...>
ln -sf "$SP"/secp256k1/src/* "$OBJ/private/" 2>/dev/null || true

CFLAGS=(
  -O2
  -I"$SP/mpt-crypto/include"
  -I"$SP/secp256k1/include"
  -I"$OSSL/include"
  -I"$OBJ"
  -DSECP256K1_WIDEMUL_INT128
)

cd "$SP/mpt-crypto"
OBJS=()
for f in src/*.c; do
  n=$(basename "$f" .c)
  echo "  CC  $n.c"
  clang "${CFLAGS[@]}" -c "$f" -o "$OBJ/$n.o"
  OBJS+=("$n.o")
done
echo "  CXX mpt_utility.cpp"
clang++ "${CFLAGS[@]}" -std=c++17 -c src/utility/mpt_utility.cpp -o "$OBJ/mpt_utility.o"
OBJS+=("mpt_utility.o")

cd "$OBJ"
rm -f "$SP/native/libmpt-crypto.a"
ar rcs "$SP/native/libmpt-crypto.a" "${OBJS[@]}"
echo "built: $(wc -c < "$SP/native/libmpt-crypto.a") bytes"
