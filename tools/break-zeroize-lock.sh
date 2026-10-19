#!/usr/bin/env bash
#
# break-zeroize-lock.sh — the falsifier for check-zeroize-bounds' mutation lock.
#
# ⚠⚠ **THE LOCK HAD NO TEST, AND THAT IS A CLAIM WITHOUT A FALSIFIER.** The gate
# says a concurrent second run is REFUSED, and `CLAUDE.md` requires every
# capability claim to have a test that fails when the claim is false. Ordinary
# execution acquires the lock exactly once and never contends, so deleting the
# `flock` left every existing check green while reopening the source-corruption
# race the lock exists to close.
#
# ⚠ **The second run must refuse BEFORE it takes its backups**, and that is the
# property rather than the exit code. Backups are taken from disk at start-up; a
# second run that got as far as copying would capture the first run's mutations
# and restore them permanently. So the tree is asserted untouched as well.
#
# Controls, in both directions plus one that must NOT fire:
#   1. lock HELD → refuse, exit 1, `signer/` untouched.
#   2. lock FREE → the gate gets past the lock and starts work.
#   4. REAL concurrency → a first gate is run until it has mutated the tree, then
#      the second must refuse AND create no backup directory. Controls 1-3 cannot
#      see an ordering regression; this one can. It is the only control that
#      exercises the property the lock exists for.
#   3. lock held, PATH UNLINKED → **asserted UNCAUGHT**. `flock` lives on the
#      inode, so a second run opening the same path creates a NEW file and takes
#      a NEW lock. Measured: the second run proceeds. That is a real residual and
#      it is disclosed rather than claimed away — this control FAILS if the gate
#      ever starts catching it, because the disclosure would then be stale.
#
#   make break-zeroize-lock
set -uo pipefail

cd "$(dirname "$0")/.." || exit 2
GATE="python3 tools/check-zeroize-bounds.py"
fail() { echo "FAIL: $*"; exit 1; }

# ⚠ **The harness must sanitize the environment the SAME way the gate does, or
# the two disagree about which repository they are talking about.** Invoked from
# a git hook or a CI wrapper with `GIT_DIR` exported, this script would resolve a
# foreign repository while the gate strips the variable and locks the real
# checkout: the holder would lock a different file, control 1 would time out, and
# the `git status` assertions would inspect the wrong tree — a green
# implementation reported as broken. Same allowlist as the tools: everything
# `GIT_*` goes but `GIT_EXEC_PATH`.
GIT_UNSET=()
while IFS='=' read -r _k _; do
  case "$_k" in GIT_EXEC_PATH) ;; GIT_*) GIT_UNSET+=(-u "$_k") ;; esac
done < <(env)
gitc() { env ${GIT_UNSET[@]+"${GIT_UNSET[@]}"} git "$@"; }

LOCK="$(gitc rev-parse --absolute-git-dir)/wconf-check-zeroize-bounds.lock"
dirty() { gitc status --porcelain -- signer/; }
# The gate makes one backup directory per run, at start-up, before any mutation.
# Counting them is how "it never reached the backups" is asserted.
bakdirs() { ls -d "${TMPDIR:-/tmp}"wconf-zeroize-bounds-* 2>/dev/null | wc -l | tr -d " "; }

if [ -n "$(dirty)" ]; then
  fail "signer/ is dirty before the test; this script must be able to tell a mutation from your edits."
fi

HOLDER=$(mktemp -t wconf-lockholder-XXXXXX.py)
HOLDLOG=$(mktemp -t wconf-lockholder-XXXXXX.log)
RUNLOG=$(mktemp -t wconf-lockrun-XXXXXX.log)
cat > "$HOLDER" <<'PY'
import fcntl, os, sys, time
fh = open(sys.argv[1], 'a+')
fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
if len(sys.argv) > 2 and sys.argv[2] == '--unlink':
    os.unlink(sys.argv[1])          # the PATH goes; this process keeps the lock
print('held', flush=True)
time.sleep(600)
PY
H=""; G=""
cleanup() {
  [ -n "$H" ] && kill "$H" 2>/dev/null
  [ -n "$G" ] && kill "$G" 2>/dev/null
  rm -f "$HOLDER" "$HOLDLOG" "$RUNLOG"
}
trap cleanup EXIT

hold() {                                  # $1 = "" | --unlink
  : > "$HOLDLOG"
  # shellcheck disable=SC2086
  python3 "$HOLDER" "$LOCK" ${1:-} > "$HOLDLOG" 2>&1 &
  H=$!
  local waited=0
  until grep -q held "$HOLDLOG" 2>/dev/null; do
    waited=$((waited + 1)); [ "$waited" -gt 100 ] && fail "the holder never took the lock"
    kill -0 "$H" 2>/dev/null || fail "the holder died before taking the lock"
    perl -e 'select(undef,undef,undef,0.1)'
  done
}
release() { [ -n "$H" ] && { kill "$H" 2>/dev/null; wait "$H" 2>/dev/null; H=""; }; }

# Start the gate, wait for its banner, kill it. Used where the gate is EXPECTED
# to get past the lock: running it out would take minutes and mutate the tree.
# SIGTERM is handled, so it restores on the way out.
starts_work() {
  : > "$RUNLOG"
  $GATE > "$RUNLOG" 2>&1 &
  G=$!
  local waited=0
  until grep -q "REWRITES tracked files" "$RUNLOG" 2>/dev/null; do
    waited=$((waited + 1)); [ "$waited" -gt 300 ] && { kill "$G" 2>/dev/null; G=""; return 1; }
    kill -0 "$G" 2>/dev/null || { G=""; return 1; }
    perl -e 'select(undef,undef,undef,0.1)'
  done
  kill -TERM "$G" 2>/dev/null; wait "$G" 2>/dev/null; G=""
  return 0
}

echo "break-zeroize-lock — the mutation lock, verified by contending for it"

# --- 1. lock held: must refuse, before doing anything -------------------------
# ⚠ **Bounded, and the bound is part of the assertion.** A refusal happens before
# any work, in well under a second. Without the timeout a BROKEN lock does not
# fail this control quickly — it runs the whole gate, which is minutes, and the
# mutation test that proves this harness works became unusable. Measured while
# writing it: with the `flock` removed, control 1 sat through a full run.
hold ""
out=$(timeout 60 $GATE 2>&1); rc=$?
release
if [ "$rc" -eq 124 ]; then
  fail "lock held: the gate did not refuse within 60s — it got past the lock and started work.
      A refusal is immediate; anything slow here means the lock is not being taken."
fi
[ "$rc" -eq 1 ] || fail "lock held: expected exit 1, got $rc"
grep -q "REFUSED: another check-zeroize-bounds is already running" <<<"$out" \
  || fail "lock held: exited 1 without the concurrency refusal — wrong reason"
[ -z "$(dirty)" ] \
  || fail "lock held: the refused run TOUCHED signer/ — it got past the lock before refusing"
echo "  CONTROL ok — lock held: refused, exit 1, signer/ untouched"

# --- 2. lock free: must get past the lock -------------------------------------
starts_work || fail "lock free: the gate never started work, so the lock refuses even when nothing holds it"
echo "  CONTROL ok — lock free: the gate proceeds past it"

# --- 3. asserted UNCAUGHT ------------------------------------------------------
hold "--unlink"
[ -e "$LOCK" ] && fail "the holder did not unlink the lock path, so this control is not modelling anything"
if starts_work; then
  echo "  CONTROL ✓ uncaught — lock held but PATH UNLINKED: the second run PROCEEDS."
  echo "                       flock is on the inode; reopening the path makes a new file."
else
  release
  fail "the unlinked-path case was CAUGHT. That is better behaviour, and it makes the
      disclosure below stale — update the docstring and this control together."
fi
release

# --- 4. REAL concurrency: the ordering property -------------------------------
# ⚠⚠ **CONTROLS 1 TO 3 CANNOT SEE AN ORDERING REGRESSION, which is the thing
# that actually corrupts source.** `hold` takes the inode lock and mutates
# nothing, so if the `flock` were moved BELOW the backup loop the second run
# would copy clean files, then refuse with exit 1 and a clean `signer/` — and
# every assertion above would pass. Under real concurrency that same ordering
# backs up the FIRST run's mutations and restores them later. E-164's shape: a
# test named for a property, one layer away from where the property breaks.
#
# So this runs a real first gate until a tracked mutation is on disk, then starts
# the second one and asserts it created **no backup directory**. The gate makes
# exactly one per run, at start-up, before touching anything.
echo "  starting a REAL first run and waiting for it to mutate the tree"
: > "$RUNLOG"
$GATE > "$RUNLOG" 2>&1 &
G=$!
waited=0
until [ -n "$(dirty)" ]; do
  waited=$((waited + 1))
  if [ "$waited" -gt 3000 ]; then kill "$G" 2>/dev/null; G=""; fail "the first run never mutated the tree in 10 minutes"; fi
  kill -0 "$G" 2>/dev/null || { G=""; fail "the first run exited before mutating; it cannot exercise ordering"; }
  perl -e 'select(undef,undef,undef,0.2)'
done
echo "  first run has mutated: $(dirty | tr -s ' ')"

before=$(bakdirs)
out=$(timeout 60 $GATE 2>&1); rc=$?
after=$(bakdirs)

kill -TERM "$G" 2>/dev/null; wait "$G" 2>/dev/null; G=""

[ "$rc" -ne 124 ] || fail "real concurrency: the second run did not refuse within 60s while the first was mutating"
[ "$rc" -eq 1 ] || fail "real concurrency: expected exit 1, got $rc"
grep -q "REFUSED: another check-zeroize-bounds is already running" <<<"$out" \
  || fail "real concurrency: exited 1 for some other reason"
[ "$before" = "$after" ] \
  || fail "real concurrency: the refused run CREATED a backup directory ($before then $after).
      It reached the backup step before the lock, so it copied the first run's MUTATED
      files. On exit it would restore them permanently. The lock must be taken first."
echo "  CONTROL ok — real concurrency: refused while the first run held mutations, and took NO backup"

[ -z "$(dirty)" ] || fail "signer/ is dirty after the test"
echo
echo "PASS: 4 controls. A second run refuses with exit 1 and takes NO backup even while a"
echo "      real first run holds mutations on disk; a free lock lets the gate run; and the"
echo "      unlinked-path hole is asserted, not claimed shut."
echo "⚠ What this does NOT say: that the backup and restore logic is correct. It tests"
echo "  the LOCK. E-269 and E-282 are the record for the rest, and deleting the lock file"
echo "  out from under a running gate still defeats it — control 3 is that residual."
