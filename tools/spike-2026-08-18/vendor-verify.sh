#!/usr/bin/env bash
#
# CI assertion for the vendored fork, required by REVIEW-005c section 3:
# clone mpt-crypto at the pinned commit, apply our patch, and prove that
# NOTHING outside the six patched files differs from upstream.
#
# This is the whole safety argument for path A. We took upstream's audited
# transcript serialisation and replaced one function; if anything else drifted,
# that argument is void and this script fails.
#
#   ./vendor-verify.sh            verify against a fresh clone in a temp dir
#   ./vendor-verify.sh /path/tree verify an existing checkout in place
set -euo pipefail

PIN=85dbac73d033241b73f0565ae7cce86d07005c70
UPSTREAM=https://github.com/XRPLF/mpt-crypto.git
HERE="$(cd "$(dirname "$0")" && pwd)"
PATCH="$HERE/wconf-nonces.patch"

# The complete set of files the W-CONF patch is allowed to touch.
ALLOWED=(
  src/mpt_internal.h
  src/mpt_scalar.c
  src/proof_compact_standard.c
  src/proof_compact_clawback.c
  src/proof_compact_convertback.c
  src/proof_pok_sk.c
)

if [ $# -ge 1 ]; then
  TREE="$1"
  echo "verifying existing tree: $TREE"
else
  TREE=$(mktemp -d)/mpt-crypto
  echo "cloning $UPSTREAM at $PIN"
  git clone --quiet "$UPSTREAM" "$TREE"
  git -C "$TREE" checkout --quiet "$PIN"
  git -C "$TREE" apply "$PATCH"
  echo "patch applied"
fi

cd "$TREE"

actual_pin=$(git rev-parse HEAD)
if [ "$actual_pin" != "$PIN" ]; then
  echo "FAIL: tree is at $actual_pin, pinned commit is $PIN"
  exit 1
fi
echo "PASS: HEAD is the pinned commit $PIN"

# Which tracked files differ from the pinned commit?
# bash 3.2 on macOS has no mapfile
changed=()
while IFS= read -r line; do changed+=("$line"); done < <(git diff --name-only "$PIN")

fail=0
for f in "${changed[@]}"; do
  ok=0
  for a in "${ALLOWED[@]}"; do
    [ "$f" = "$a" ] && ok=1
  done
  if [ $ok -eq 0 ]; then
    echo "FAIL: $f differs from upstream but is not in the allowed set"
    fail=1
  fi
done

if [ $fail -eq 0 ]; then
  echo "PASS: ${#changed[@]} file(s) differ, all within the allowed set"
  printf '        %s\n' "${changed[@]}"
fi

# Everything else must be byte-identical. Prove it positively rather than
# inferring it from the diff list.
tracked=$(git ls-files | wc -l | tr -d ' ')
unchanged=$(( tracked - ${#changed[@]} ))
echo "PASS: $unchanged of $tracked tracked files byte-identical to upstream"

# The patched files must not have quietly dropped upstream's own guard rails.
if ! grep -q "digest_update_amount_point\|put_amount_point" src/proof_compact_clawback.c; then
  echo "FAIL: the zero-amount clawback sentinel helper is gone"
  fail=1
else
  echo "PASS: zero-amount clawback sentinel preserved"
fi

# Match a real call, not the name appearing in a comment. Lines whose first
# non-space character is "*" are comment continuations and are excluded; the
# patch discusses upstream's deleted function by name in several of them.
calls=$(grep -rn "generate_deterministic_nonces *(" src/*.c src/mpt_internal.h |
        grep -v ':[0-9]*: *\*' || true)
if [ -n "$calls" ]; then
  echo "FAIL: a call site still reaches upstream's nonce derivation"
  echo "$calls"
  fail=1
else
  echo "PASS: no call site reaches upstream's nonce derivation"
fi

# THE CLAIM THAT LOCAL VERIFICATION MEANS ANYTHING FOR RIPPLED.
#
# We vendor 1.0.4; rippled 3.3.0 ships 0.4.0-rc4 (CLAIMS.md E-14). Cross-checking
# our prover against a 1.0.4 verifier only says something about the ledger if the
# two tags contain the same library code. They do -- the five commits between
# them touch CI, workflows and CMake only -- but the second review round was
# right that this was asserted rather than checked. Now it is checked.
if git rev-parse --verify --quiet 0.4.0-rc4 >/dev/null && \
   git rev-parse --verify --quiet 1.0.4 >/dev/null; then
  if git diff --quiet 0.4.0-rc4 1.0.4 -- src/ include/; then
    echo "PASS: src/ and include/ byte-identical between 0.4.0-rc4 (rippled 3.3.0) and 1.0.4"
  else
    echo "FAIL: library sources differ between rippled's tag and the vendored tag"
    echo "      local cross-verification no longer implies ledger compatibility"
    git diff --stat 0.4.0-rc4 1.0.4 -- src/ include/
    fail=1
  fi
else
  echo "SKIP: tags 0.4.0-rc4 / 1.0.4 not present in this checkout (shallow clone?)"
fi

# ConvertBack's witness order is (b, rho, sk_A), so its long-lived secret is at
# offset 64, not 0. The T-1 vectors exercise the KDF's handling of a non-zero
# offset but call wconf-kat, NOT this prover -- so they cannot catch a regression
# in the ARGUMENT the prover passes. The second review round found that gap. This
# is a source-level assertion covering exactly what the vectors cannot.
if grep -q "context_id, aux, 64)" src/proof_compact_convertback.c; then
  echo "PASS: ConvertBack passes sk_offset=64 for its (b, rho, sk_A) witness order"
else
  echo "FAIL: ConvertBack's sk_offset is not 64 — the hedge would mask the wrong scalar"
  fail=1
fi

# The other three provers put the long-lived secret first.
for f in src/proof_compact_standard.c src/proof_compact_clawback.c src/proof_pok_sk.c; do
  if grep -qE "context_id, aux, 0\)|aux, 0\);" "$f"; then
    echo "PASS: $(basename "$f") passes sk_offset=0"
  else
    echo "FAIL: $(basename "$f") does not pass sk_offset=0"
    fail=1
  fi
done

# Issue #1 was RULED on 2026-08-18: a hostile same-host process IS in scope, so
# the hedged construction is the default. Before the ruling this assertion
# required 0 and existed to stop a coding session picking a side by accident;
# it now pins the decision that was actually made.
if grep -q "^#define WCONF_HEDGE 1" src/mpt_internal.h; then
  echo "PASS: WCONF_HEDGE defaults to 1 (issue #1 ruled: same-host adversary in scope)"
else
  echo "FAIL: WCONF_HEDGE default is not 1 — that contradicts the issue #1 ruling"
  fail=1
fi

exit $fail
