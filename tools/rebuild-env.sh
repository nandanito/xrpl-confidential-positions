#!/usr/bin/env bash
#
# Rebuild the ephemeral build environment the signer links against.
#
# `/tmp/wconf` holds the vendored patched mpt-crypto, a built secp256k1, and the
# libraries and tools derived from them. **None of it survives a /tmp clean**,
# and on 2026-08-19 it did not (`CLAIMS.md` E-97): the signer stopped building
# and `build.rs` said so, naming the commands this script now is.
#
# **The vendored half is reproducible by design.** The patch is committed, so a
# clone at the pin plus `git apply` restores the tree exactly, and
# `vendor-verify.sh` proves the restoration rather than assuming it. That is
# issue #2 path A's central argument, and this script is what makes it a
# one-liner instead of a paragraph somebody retypes.
#
# **What this cannot RECONSTRUCT: `/tmp/wconf/state.json`** — the Devnet account
# seeds, issuance ID and ElGamal secrets. Nothing committed can regenerate them:
# the accounts and every recorded transaction hash stay verifiable on Devnet,
# but the ability to *drive* them does not. **It CAN restore them from the
# backup below**, and with no backup a fresh chain is
# `bun tools/spike-2026-08-17/convert.ts`.
#
# ⚠ ~~*"Those are gone for good."*~~ **Struck 2026-08-25.** That sentence was
# true when written and was left standing by the same commit that added the
# restore branch further down this file — a fix contradicting its own header,
# found by `REVIEW-021` round one's Codex leg reading the header against the
# code (`CLAIMS.md` E-139). Reconstruct and restore are different verbs and only
# one of them is impossible.
#
# ⚠ **The strike above said "four lines below it" and that was invented.** The
# restore branch is more than a hundred lines down. Round TWO caught it — a
# fabricated detail inside the correction of a false sentence, which is as neat
# an illustration of why the second round exists as this project has produced
# (`CLAIMS.md` E-144).
#
# ⚠ **The window is DAYS, not weeks, and this script now keeps a copy.**
# `CLAIMS.md` E-133: the macOS cleaner took `state.json` on 2026-08-25 having
# last seen it written on 2026-08-20, **eight minutes before a session needed
# it**, and it came back only because that session's own transcript still held
# the values. A copy is kept at `$BACKUP` — mode 0600 in a 0700 directory,
# outside `/tmp`. ⚠ **It is the same plaintext Devnet secrets in a less volatile
# place, and it should be read as that and not as protection.**
#
#   tools/rebuild-env.sh
#
# Idempotent: safe to re-run against a complete or half-complete tree.
#
# ⚠ **The location is not configurable, and that is deliberate.** An earlier
# draft of this script took a `WCONF_PREFIX` — which would have been a lie,
# because `build.sh` hardcodes `/tmp/wconf` and `/tmp/wconf-pristine` and would
# have silently ignored it. One hardcoded path that every committed script
# agrees on beats an option that only two thirds of them honour.
set -euo pipefail

PREFIX=/tmp/wconf
MPT_PIN=85dbac73d033241b73f0565ae7cce86d07005c70
SECP_PIN=1a53f4961f337b4d166c25fce72ef0dc88806618
REPO="$(cd "$(dirname "$0")/.." && pwd)"

say () { printf '\n=== %s\n' "$1"; }

# ⚠ **`[ -d .git ]` is not the same question as "is this a git repository", and
# the difference is not academic.** macOS prunes `/tmp` by **file** age and
# leaves the directory tree standing, so a partial clean deletes `.git/config`,
# `.git/HEAD` and every packfile while `.git/` itself survives. An earlier
# revision of this script guarded on the directory, skipped the clone, and then
# died on `git checkout` with `fatal: not a git repository` — from a script
# whose entire job is recovering exactly this (`CLAIMS.md` E-129). Ask git.
usable_repo () {
  git -C "$1" rev-parse --git-dir >/dev/null 2>&1
}

# A half-cleaned tree cannot be cloned into and cannot be repaired in place.
# It is derived state with a committed pin, so replacing it is free.
reclone () {
  local dir=$1 url=$2
  if [ -e "$dir" ]; then
    echo "  $dir exists and is not a usable git repository — replacing it"
    rm -rf "$dir"
  fi
  git clone --quiet "$url" "$dir"
}

mkdir -p "$PREFIX"

# --- mpt-crypto, at the pin, patched ---------------------------------------
say "mpt-crypto at $MPT_PIN (tag 1.0.4)"
if ! usable_repo "$PREFIX/mpt-crypto"; then
  reclone "$PREFIX/mpt-crypto" https://github.com/XRPLF/mpt-crypto.git
fi
git -C "$PREFIX/mpt-crypto" fetch --quiet --tags origin || true
git -C "$PREFIX/mpt-crypto" checkout --quiet "$MPT_PIN"

# `git apply` is not idempotent, so ask whether the patch is already in the tree
# rather than applying and hoping. `--reverse --check` succeeds exactly when the
# patch is already applied.
PATCH="$REPO/tools/spike-2026-08-18/wconf-nonces.patch"
if git -C "$PREFIX/mpt-crypto" apply --reverse --check "$PATCH" 2>/dev/null; then
  echo "  patch already applied"
else
  git -C "$PREFIX/mpt-crypto" checkout --quiet -- .
  git -C "$PREFIX/mpt-crypto" apply "$PATCH"
  echo "  patch applied"
fi

# --- secp256k1 --------------------------------------------------------------
say "secp256k1 v0.7.1 at $SECP_PIN"
if ! usable_repo "$PREFIX/secp256k1"; then
  reclone "$PREFIX/secp256k1" https://github.com/bitcoin-core/secp256k1.git
fi
git -C "$PREFIX/secp256k1" checkout --quiet "$SECP_PIN"
if [ ! -f "$PREFIX/secp256k1/build/lib/libsecp256k1.a" ]; then
  cmake -S "$PREFIX/secp256k1" -B "$PREFIX/secp256k1/build" \
    -DCMAKE_BUILD_TYPE=Release \
    -DSECP256K1_BUILD_TESTS=OFF -DSECP256K1_BUILD_BENCHMARK=OFF \
    -DSECP256K1_BUILD_EXHAUSTIVE_TESTS=OFF -DSECP256K1_BUILD_CTIME_TESTS=OFF \
    -DBUILD_SHARED_LIBS=OFF > /dev/null
  cmake --build "$PREFIX/secp256k1/build" -j"$(sysctl -n hw.ncpu 2>/dev/null || echo 4)" > /dev/null
fi
echo "  $(ls -l "$PREFIX/secp256k1/build/lib/libsecp256k1.a" | awk '{print $5}') bytes"

# --- verify the fork, THEN build it ----------------------------------------
# Order matters: a tree that does not verify is not one to build against.
# `build.sh` extracts the pristine control tree only when its directory is
# absent, which has exactly the defect above one directory over. A gutted
# pristine tree is worse than a missing one: `vendor-verify.sh` would compare
# our fork against a shell.
if [ -e /tmp/wconf-pristine/mpt-crypto ] && [ ! -f /tmp/wconf-pristine/mpt-crypto/include/mpt_protocol.h ]; then
  echo "  /tmp/wconf-pristine/mpt-crypto is incomplete — removing it so build.sh re-extracts"
  rm -rf /tmp/wconf-pristine/mpt-crypto
fi

say "vendor-verify"
"$REPO/tools/spike-2026-08-18/vendor-verify.sh" "$PREFIX/mpt-crypto"

say "build"
"$REPO/tools/spike-2026-08-18/build.sh"

# --- the name four older tools still use -----------------------------------
# `build.sh` produces mptool-patched, mptool-pristine and mptool-deterministic.
# It does NOT produce plain `mptool`, which is what the 2026-08-17 spike built
# and what convert.ts, send.ts, wasm-test.ts, npm-package-test.ts and
# reuse-r-setup.ts still call by that name. Without it a rebuilt environment
# looks complete and cannot rebuild a Devnet chain (CLAIMS.md E-99).
#
# ⚠ It points at **mptool-pristine**, not mptool-patched, and that is
# deliberate: the 2026-08-17 `mptool` was built before the W-CONF patch existed,
# so pristine is what restores the environment rather than quietly changing what
# those five tools do. `reuse-r-setup.ts` says "unmodified" in a comment and
# means it.
say "mptool"
ln -sf "$PREFIX/mptool-pristine" "$PREFIX/mptool"
echo "  $PREFIX/mptool -> mptool-pristine (unmodified upstream, as the 2026-08-17 spike built it)"

# --- keep a copy of the one thing this script cannot rebuild ---------------
say "state.json backup"
BACKUP="${WCONF_STATE_BACKUP:-$HOME/.wconf/state.json}"
mkdir -p "$(dirname "$BACKUP")"
chmod 700 "$(dirname "$BACKUP")"
if [ -f "$PREFIX/state.json" ]; then
  cp "$PREFIX/state.json" "$BACKUP"
  chmod 600 "$BACKUP"
  echo "  $PREFIX/state.json -> $BACKUP  ($(wc -c < "$BACKUP" | tr -d ' ') bytes)"
elif [ -f "$BACKUP" ]; then
  cp "$BACKUP" "$PREFIX/state.json"
  echo "  RESTORED $BACKUP -> $PREFIX/state.json"
  echo "  ⚠ verify it against the ledger before driving anything from it"
else
  echo "  no state.json in either place — a fresh chain is"
  echo "    bun tools/spike-2026-08-17/convert.ts"
fi

say "done"
cat <<EOF
  The signer builds again:  cd signer && cargo test

  ⚠ Devnet state comes back ONLY from $BACKUP, and only if a previous run made
    one. It is not reproducible from anything committed: $PREFIX/state.json
    holds throwaway account seeds and ElGamal secrets that cannot be
    regenerated. With no backup, a fresh chain is
    bun tools/spike-2026-08-17/convert.ts — the old accounts and every recorded
    transaction hash stay verifiable on Devnet, the ability to drive them does
    not (CLAIMS.md E-97, E-133).

  ⚠ Run the test suite more than once before believing it — CLAIMS.md E-98.
EOF
