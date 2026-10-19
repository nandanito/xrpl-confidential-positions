#!/usr/bin/env bash
#
# ci.sh — everything that runs WITHOUT the vendored build, in one list.
#
#   tools/ci.sh        # or: make ci
#
# GitHub Actions runs exactly this script (.github/workflows/ci.yml), and the
# README's five-minute path tells a stranger to run it too. One list, so the
# workflow, the README and CONTRIBUTING.md cannot drift apart on what is covered.
#
# ⚠ **What this does NOT run, and why** — printed at the end of every run too:
#
# * `cargo test` in `signer/`, `make check-test-support`, `make check-zeroize-bounds`
#   and `make break-zeroize-lock`. All four compile the signer, which links a
#   patched, vendored `mpt-crypto` that `tools/rebuild-env.sh` builds from pinned
#   clones with Homebrew `openssl@3`. That is a macOS build this workflow does not
#   perform.
# * Five facility tests that start a real signer. They are SKIPPED by name, not
#   passed: this script sets `WCONF_SKIP_SIGNER_TESTS=1`, and Bun reports them as
#   `skip`.
# * The known-value half of the secret sweep. `check-no-secrets-shapes` runs the
#   shape classes only; the full `make check-no-secrets` needs the local secret
#   store and runs on the owner's machine. Its verdict word says which it was.
# * `check-filing` on the historical drafts. It runs on the template, as a positive
#   control; 15 of the 20 committed drafts predate the rules it enforces.
set -euo pipefail
cd "$(dirname "$0")/.."

FAILED=()
step() {
  printf '\n=== %s\n' "$*"
  if "$@"; then echo "--- ok: $*"; else echo "--- FAILED: $*"; FAILED+=("$*"); fi
}

step bunx tsc --noEmit
step env WCONF_SKIP_SIGNER_TESTS=1 bun test facility web/api tools
for gate in check-tables check-negative-claims check-personas check-blinding \
            check-loopback check-web-readonly check-disclosure-phrases \
            check-claims-index check-claims-topics check-claims-revisions \
            check-emphasis check-vocabulary check-no-secrets-shapes \
            check-push-guard; do
  step make "$gate"
done
step make check-filing FILE=docs/upstream-filings/TEMPLATE.md

cat <<'EOF'

=== NOT RUN by this script (see its header): cargo test, check-test-support,
    check-zeroize-bounds and break-zeroize-lock, which need the vendored build;
    five facility tests that start a real signer, reported as skip; the
    known-value half of the secret sweep, which needs the local store; and
    check-filing on the historical drafts.
EOF

if [ "${#FAILED[@]}" -gt 0 ]; then
  printf '\nci: FAILED %d step(s):\n' "${#FAILED[@]}"
  printf '  %s\n' "${FAILED[@]}"
  exit 1
fi
echo
echo "ci: every step passed"
