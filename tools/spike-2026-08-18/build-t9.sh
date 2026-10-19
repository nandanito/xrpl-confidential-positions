#!/usr/bin/env bash
# Build and run T-9 in both arms. Each arm needs its own build of the library,
# because WCONF_HEDGE is a compile-time flag inside a static inline function.
set -euo pipefail
SRC=/tmp/wconf/mpt-crypto
SECP=/tmp/wconf/secp256k1
OSSL=$(brew --prefix openssl@3)
HERE="$(cd "$(dirname "$0")" && pwd)"

build_arm () {
  local hedge=$1 out=$2
  local obj=/tmp/wconf/t9-$hedge/obj
  mkdir -p "$obj/private"
  ln -sf "$SECP"/src/* "$obj/private/" 2>/dev/null || true
  local cflags=(-O2 "-I$SRC/include" "-I$SECP/include" "-I$OSSL/include" "-I$obj"
                -DSECP256K1_WIDEMUL_INT128 "-DWCONF_HEDGE=$hedge")
  local objs=()
  for f in "$SRC"/src/*.c; do
    n=$(basename "$f" .c)
    clang "${cflags[@]}" -c "$f" -o "$obj/$n.o"
    objs+=("$obj/$n.o")
  done
  clang++ "${cflags[@]}" -std=c++17 -c "$SRC/src/utility/mpt_utility.cpp" -o "$obj/mpt_utility.o"
  objs+=("$obj/mpt_utility.o")
  rm -f "$obj/libmpt-crypto.a"
  ar rcs "$obj/libmpt-crypto.a" "${objs[@]}"
  clang -O2 "-I$SRC/include" "-I$SECP/include" "-I$OSSL/include" "-DWCONF_HEDGE=$hedge" \
    "$HERE/t9-entropy.c" -o "$out" \
    "$obj/libmpt-crypto.a" "$SECP/build/lib/libsecp256k1.a" -L"$OSSL/lib" -lcrypto -lstdc++
}

build_arm 1 /tmp/wconf/t9-hedged
build_arm 0 /tmp/wconf/t9-deterministic

echo "T-9 — entropy draws during sigma proof generation"
echo
fail=0
run_arm () {
  local bin=$1 name=$2 expect=$3
  local out; out=$($bin)
  local calls; calls=$(echo "$out" | grep '^rand_calls=' | cut -d= -f2)
  local second; second=$(echo "$out" | grep '^rand_calls_second_proof=' | cut -d= -f2)
  local stable; stable=$(echo "$out" | grep '^stable=' | cut -d= -f2)
  if [ "$calls" = "$expect" ] && [ "$second" = "$expect" ] && [ "$stable" = "yes" ]; then
    echo "  PASS  $name: $calls draw(s) per proof (expected $expect)"
  else
    echo "  FAIL  $name: $calls draw(s), second proof $second, stable=$stable (expected $expect)"
    fail=1
  fi
}
run_arm /tmp/wconf/t9-hedged        "hedged (DEFAULT, leg A, issue #1 ruled in scope)" 1
run_arm /tmp/wconf/t9-deterministic "deterministic (-DWCONF_HEDGE=0, leg B, retained for measurement)" 0
echo
[ $fail -eq 0 ] && echo "T-9 PASS" || { echo "T-9 FAIL"; exit 1; }
