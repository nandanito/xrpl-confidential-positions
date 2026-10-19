#!/usr/bin/env bash
# Self-test for the push guard, tools/git-hooks/pre-push.
#
# Every case runs against the real hook, installed by the real installer into a
# throwaway repository, with a fake `gh` on PATH so nothing touches GitHub.
# Then every case runs again against MUTANTS of the hook, each of which removes
# one protection or adds one allowance. A mutant that the cases do not catch
# fails this check, and so does a mutation that does not apply: a case list that
# a broken hook still passes proves nothing. Mutants are evaluated only when the
# real hook passes every case, because otherwise each one would look caught.
#
# The fake gh answers from github.com's table only when it is called with
# `--hostname github.com`. Called without it, it answers from another host's
# table, where the public repository has the archive's id — so a hook that lets
# GH_HOST choose the host is caught (`REVIEW-057` R2-3). It reports a socket for
# `http_unix_socket` when FAKE_GH_SOCKET is set (R3-2).
#
# Needs bash, git and perl. No network.
set -u

top=$(git rev-parse --show-toplevel)
HOOK_SRC="$top/tools/git-hooks/pre-push"
INSTALL_SRC="$top/tools/install-push-guard.sh"
work=$(mktemp -d "${TMPDIR:-/tmp}/push-guard.XXXXXX")
trap 'rm -rf "$work"' EXIT

G() {
  git -c user.name=guard -c user.email=guard@example.invalid \
      -c commit.gpgsign=false -c tag.gpgsign=false -c init.defaultBranch=main "$@"
}
ZERO=0000000000000000000000000000000000000000
FAILED=0
fail() { printf '  ✗ %s\n' "$1"; FAILED=$((FAILED + 1)); }
pass() { printf '  ✓ %s\n' "$1"; }

if hp=$(git config --global --get core.hooksPath); then
  printf 'check-push-guard: FAIL — core.hooksPath is set globally (%s), so the guard cannot run on this machine\n' "$hp"
  exit 1
fi

# --- a fake gh: `gh api [--hostname H] repos/<owner>/<name> --jq <expr>`, and
# `gh config get http_unix_socket --host github.com`
mkdir -p "$work/bin" "$work/minbin"
cat >"$work/bin/gh" <<'EOF'
#!/usr/bin/env bash
if [ "${1-}" = config ] && [ "${2-}" = get ] && [ "${3-}" = http_unix_socket ]; then
  printf '%s\n' "${FAKE_GH_SOCKET-}"
  exit 0
fi
[ "${1-}" = api ] || exit 2
shift
host= repo= expr=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --hostname) host=$2; shift 2 ;;
    --jq) expr=$2; shift 2 ;;
    repos/*) repo=${1#repos/}; shift ;;
    *) shift ;;
  esac
done
table=$FAKE_GH_TABLE
[ "$host" = github.com ] || table=$FAKE_GH_OTHER_HOST
want=$(printf '%s' "$repo" | tr '[:upper:]' '[:lower:]')
while read -r name id private; do
  if [ "$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')" = "$want" ]; then
    case "$expr" in
      *full_name*) printf '%s %s %s\n' "$id" "$private" "$name" ;;
      *) printf '%s %s\n' "$id" "$private" ;;
    esac
    exit 0
  fi
done <"$table"
echo 'HTTP 404: Not Found' >&2
exit 1
EOF
chmod +x "$work/bin/gh"
for t in bash git tr; do ln -s "$(command -v "$t")" "$work/minbin/$t"; done
PATH_GH="$work/bin:$PATH"
PATH_NO_GH="$work/minbin"

TABLE="$work/table"
printf 'arch/ive 100 true\npub/lic 200 true\nflip/ped 300 false\nstag/ing 400 true\n' >"$TABLE"
TABLE_FLIPPED="$work/table-flipped"
printf 'arch/ive 100 false\npub/lic 200 true\n' >"$TABLE_FLIPPED"
# Another host, where the public repository's name resolves to the archive's id.
OTHER="$work/table-other-host"
printf 'arch/ive 999 true\npub/lic 100 true\n' >"$OTHER"
export FAKE_GH_OTHER_HOST="$OTHER"

# A throwaway clone with the hook and installer copied in, and an origin.
clone() { # <dir> <origin url>
  G init -q "$1" && G -C "$1" commit -q --allow-empty -m root
  mkdir -p "$1/tools/git-hooks"
  cp "$HOOK_SRC" "$1/tools/git-hooks/pre-push"
  cp "$INSTALL_SRC" "$1/tools/install-push-guard.sh"
  [ -n "${2-}" ] && G -C "$1" remote add origin "$2"
  return 0
}
install_in() { # <dir> [subdir]: runs the installer; prints its output
  (cd "$1/${2-}" && PATH="$PATH_GH" FAKE_GH_TABLE="$TABLE" GH_HOST=ghe.example.invalid bash "$1/tools/install-push-guard.sh" 2>&1)
}

# --- the "private" clone, with the guard installed
P="$work/private"
clone "$P" https://github.com/arch/ive.git
G -C "$P" commit -q --allow-empty -m second
PRIV=$(G -C "$P" rev-parse HEAD)

echo "The installer:"
if out=$(install_in "$P"); then pass "installs against a private archive"; else fail "installs against a private archive: $out"; fi
[ "$(G -C "$P" config --get wconf.pushguard.archiveid)" = 100 ] \
  && pass "records the archive's id from github.com, with GH_HOST set elsewhere" \
  || fail "records the archive's id from github.com, with GH_HOST set elsewhere"
cmp -s "$HOOK_SRC" "$P/.git/hooks/pre-push" \
  && pass "copies the hook byte for byte" || fail "copies the hook byte for byte"

installer_refuses() { # <label> <needle> <dir> <origin> [setup command...]
  local label=$1 needle=$2 d=$3 origin=$4
  shift 4
  clone "$d" "$origin"
  [ "$#" -gt 0 ] && (cd "$d" && "$@")
  local o rc
  o=$(install_in "$d")
  rc=$?
  if [ "$rc" -ne 0 ] && printf '%s' "$o" | grep -qF "$needle"; then pass "$label"; else fail "$label (exit $rc): $o"; fi
}
installer_refuses "refuses an origin that is not private" "is not private" "$work/i1" https://github.com/flip/ped.git
installer_refuses "refuses when core.hooksPath is set" "core.hooksPath is set" "$work/i2" https://github.com/arch/ive.git \
  git config core.hooksPath .hooks
installer_refuses "refuses to overwrite a foreign pre-push hook" "is not this guard" "$work/i3" https://github.com/arch/ive.git \
  sh -c 'printf "#!/bin/sh\nexit 0\n" > .git/hooks/pre-push'
installer_refuses "refuses an origin that is not on GitHub" "not an HTTPS repository on github.com" "$work/i4" "$work/somewhere.git"
installer_refuses "refuses an SSH origin" "not an HTTPS repository on github.com" "$work/i5" git@github.com:arch/ive.git
installer_refuses "refuses push URLs naming two repositories" "name two repositories" "$work/i6" https://github.com/arch/ive.git \
  sh -c 'git config --add remote.origin.pushurl https://github.com/arch/ive.git && git config --add remote.origin.pushurl https://github.com/stag/ing.git'

# REVIEW-057 R3-5: a reinstall must not replace the recorded archive with what a
# stale push URL names.
d="$work/i7"
clone "$d" https://github.com/arch/ive.git
install_in "$d" >/dev/null
G -C "$d" config remote.origin.pushurl https://github.com/stag/ing.git
if o=$(install_in "$d"); then
  fail "a reinstall refuses to replace the recorded archive (it succeeded; id now $(G -C "$d" config --get wconf.pushguard.archiveid))"
elif printf '%s' "$o" | grep -qF "recorded archive is repository id 100" && [ "$(G -C "$d" config --get wconf.pushguard.archiveid)" = 100 ]; then
  pass "a reinstall refuses to replace the recorded archive, and keeps it"
else
  fail "a reinstall refuses to replace the recorded archive: $o"
fi

# REVIEW-057 R3-4: installing from a subdirectory must install into this clone.
d="$work/i8"
clone "$d" https://github.com/arch/ive.git
mkdir -p "$d/tools/deeper"
if install_in "$d" tools/deeper >/dev/null && cmp -s "$HOOK_SRC" "$d/.git/hooks/pre-push"; then
  pass "installs into this clone's hooks from a subdirectory"
else
  fail "installs into this clone's hooks from a subdirectory"
fi

# The installer's own lookup is the hook's lookup_repo; a hook copy without
# --hostname must make it record the other host's id, or the check above could
# not have failed.
d="$work/i9"
clone "$d" https://github.com/arch/ive.git
sed -i.bak 's/gh api --hostname github.com /gh api /' "$d/tools/git-hooks/pre-push"
install_in "$d" >/dev/null
if cmp -s "$HOOK_SRC" "$d/tools/git-hooks/pre-push"; then
  fail "control: the lookup mutation did not apply"
elif [ "$(G -C "$d" config --get wconf.pushguard.archiveid)" = 999 ]; then
  pass "control: an unpinned lookup records the wrong id, so the check above can fail"
else
  fail "control: an unpinned lookup still recorded the right id"
fi

# A clone with the hook but no configuration.
U="$work/unconfigured"
G init -q "$U" && G -C "$U" commit -q --allow-empty -m root
cp "$HOOK_SRC" "$U/.git/hooks/pre-push"

G -C "$P" checkout -q --orphan clean
G -C "$P" commit -q --allow-empty -m orphan
ORPH=$(G -C "$P" rev-parse HEAD)
G -C "$P" checkout -q main
BLOB=$(printf 'private\n' | G -C "$P" hash-object -w --stdin)

ref() { printf 'refs/heads/main %s refs/heads/main %s\n' "$1" "$ZERO"; }

# One case: <want 0|1> <needle or -> <remote name> <url> <stdin> <repo> <PATH> <table> [env assignments...]
case_result() {
  local want=$1 needle=$2 rname=$3 url=$4 input=$5 repo=$6 path=$7 table=$8
  shift 8
  local out rc
  # Fed as git feeds it: one line per ref, each ending in a newline. Without the
  # final newline a mutant that reads stdin never sees its line, and a tags
  # allowance once passed every case that way.
  out=$(cd "$repo" && { [ -z "$input" ] || printf '%s\n' "$input"; } | env "$@" PATH="$path" FAKE_GH_TABLE="$table" "$repo/.git/hooks/pre-push" "$rname" "$url" 2>&1)
  rc=$?
  if [ "$want" = 0 ]; then
    [ "$rc" -eq 0 ]
  else
    [ "$rc" -ne 0 ] && { [ "$needle" = - ] || printf '%s' "$out" | grep -qF "$needle"; }
  fi
}

NOT_ARCHIVE="is not the archive"
NOT_HTTPS="is not an HTTPS repository on github.com"
UNTRUSTED="cannot be trusted to reach github.com"
CASES=(
  "A1|0|-|https://github.com/arch/ive.git|PRIV"
  "A3|0|-|https://GITHUB.COM/Arch/Ive.git/|PRIV"
  "A5|0|-|https://github.com/arch/ive.git|PRIV|GHHOST"
  "A6|0|-|https://www.github.com/arch/ive|PRIV"
  "R1|1|$NOT_ARCHIVE|https://github.com/pub/lic.git|PRIV"
  "R2|1|$NOT_HTTPS|git@github.com:arch/ive.git|PRIV"
  "R3|1|$NOT_HTTPS|ssh://git@github.com/pub/lic|PRIV"
  "R4|1|$NOT_ARCHIVE|https://github.com/PUB/LIC.git/|PRIV"
  "R5|1|$NOT_ARCHIVE|https://git@github.com/pub/lic|PRIV"
  "R6|1|$NOT_ARCHIVE|https://github.com/pub/lic//|PRIV"
  "R7|1|$NOT_HTTPS|$work/public.git|PRIV"
  "R8|1|$NOT_HTTPS|file://$work/public.git|PRIV"
  "R9|1|$NOT_HTTPS|https://github.com.example.org/arch/ive.git|PRIV"
  "R10|1|$NOT_HTTPS|https://example.org/github.com/arch/ive|PRIV"
  "R11|1|$NOT_HTTPS|https://gitlab.com/arch/ive.git|PRIV"
  "R12|1|$NOT_HTTPS|https://github.com/arch/ive/extra|PRIV"
  "R13|1|could not be read|https://github.com/no/such|PRIV"
  "R14|1|$NOT_ARCHIVE|https://github.com/pub/lic.git|DELETE"
  "R15|1|$NOT_ARCHIVE|https://github.com/pub/lic.git|ORPH"
  "R16|1|gh is not on PATH|https://github.com/pub/lic.git|PRIV|NOGH"
  "R17|1|is not private|https://github.com/arch/ive.git|PRIV|FLIPPED"
  "R18|1|not configured|https://github.com/pub/lic.git|PRIV|UNCONF"
  "R19|1|$NOT_ARCHIVE|https://github.com/pub/lic.git|PRIV|GHHOST"
  "R20|1|$NOT_ARCHIVE|https://github.com/pub/lic.git|EMPTY"
  "R21|1|$NOT_ARCHIVE|https://github.com/pub/lic.git|PRIV|PARSEURL"
  "R22|1|$UNTRUSTED|https://github.com/arch/ive.git|PRIV|NOVERIFY"
  "R23|1|$UNTRUSTED|https://github.com/arch/ive.git|PRIV|SSLFALSE"
  "R24|1|$UNTRUSTED|https://github.com/arch/ive.git|PRIV|CERTFILE"
  "R25|1|$UNTRUSTED|https://github.com/arch/ive.git|PRIV|SOCKET"
  "R26|1|$NOT_ARCHIVE|https://github.com/pub/lic.git|TAG"
  "R27|1|$NOT_ARCHIVE|https://github.com/pub/lic.git|BLOBTAG"
)
CASE_COUNT=${#CASES[@]}

# Runs every case; prints the names that fail, one per line.
run_cases() {
  local c name want needle url what mode input repo path table rname
  for c in "${CASES[@]}"; do
    IFS='|' read -r name want needle url what mode <<<"$c"
    repo=$P path=$PATH_GH table=$TABLE rname=origin
    local -a envs=(FAKE_GH_SOCKET=)
    case "$what" in
      PRIV) input=$(ref "$PRIV") ;;
      ORPH) input=$(ref "$ORPH") ;;
      DELETE) input=$(printf '(delete) %s refs/heads/old %s\n' "$ZERO" "$PRIV") ;;
      EMPTY) input= ;;
      TAG) input=$(printf 'refs/tags/v1 %s refs/tags/v1 %s\n' "$PRIV" "$ZERO") ;;
      BLOBTAG) input=$(printf 'refs/tags/b %s refs/tags/b %s\n' "$BLOB" "$ZERO") ;;
    esac
    case "${mode-}" in
      NOGH) path=$PATH_NO_GH ;;
      FLIPPED) table=$TABLE_FLIPPED ;;
      UNCONF) repo=$U ;;
      GHHOST) envs+=(GH_HOST=ghe.example.invalid) ;;
      PARSEURL) rname=--parse-url ;;
      NOVERIFY) envs+=(GIT_SSL_NO_VERIFY=1) ;;
      SSLFALSE) envs+=(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.sslVerify GIT_CONFIG_VALUE_0=false) ;;
      CERTFILE) envs+=(SSL_CERT_FILE="$work/extra-ca.pem") ;;
      SOCKET) envs+=(FAKE_GH_SOCKET="$work/gh.sock") ;;
    esac
    case_result "$want" "$needle" "$rname" "$url" "$input" "$repo" "$path" "$table" "${envs[@]}" || echo "$name"
  done
}

echo
echo "The hook, ${CASE_COUNT} cases:"
failed_cases=$(run_cases)
if [ -z "$failed_cases" ]; then
  pass "all ${CASE_COUNT} cases"
else
  for n in $failed_cases; do fail "case $n"; done
fi

echo
echo "Through git itself:"
G init -q --bare "$work/public.git"
pushes() { # <label> <git push args...>: the push must fail and deliver nothing
  local label=$1
  shift
  if (cd "$P" && PATH="$PATH_GH" FAKE_GH_TABLE="$TABLE" G push -q "$@" 2>/dev/null); then
    fail "$label"
  elif [ -n "$(G -C "$work/public.git" for-each-ref)" ]; then
    fail "$label (but refs arrived)"
  else
    pass "$label"
  fi
}
pushes "a real push of the private history is refused, and nothing arrives" "$work/public.git" main
pushes "a commit without the private history is refused too" "$work/public.git" clean
pushes "a dry run is refused, so the guard can be proved against a real repository safely" --dry-run "$work/public.git" main
# REVIEW-057 R2-1: a replacement ref hid the private ancestry from the old hook
# while git sent the original history.
G -C "$P" replace "$PRIV" "$ORPH"
pushes "a push behind a git replace ref is refused, and nothing arrives" "$work/public.git" main
G -C "$P" replace -d "$PRIV" >/dev/null
G -C "$P" tag -f btag "$BLOB" >/dev/null
pushes "a private blob pushed as a tag is refused, and nothing arrives" "$work/public.git" refs/tags/btag

# --- mutants: each removes one protection or adds one allowance, and the named
# case must catch it
echo
echo "Mutants — each must be caught by the case named:"
# Four parallel arrays, because several patterns contain `|` or newlines.
M_MUST=() M_LABEL=() M_FROM=() M_TO=()
mutant() { M_MUST+=("$1"); M_LABEL+=("$2"); M_FROM+=("$3"); M_TO+=("$4"); }
mutant R1 "repository id not compared" '[ "$id" = "$archive_id" ]' 'true'
mutant R7 "a destination off github.com allowed" '|| refuse "the destination is not an HTTPS repository on github.com' '|| exit 0; refuse "the destination is not an HTTPS repository on github.com'
mutant R9 "host matched loosely" 'github.com | www.github.com) ;;' '*github.com*) ;;'
mutant R12 "extra path segments accepted" "*/*/* | /* | */ | '') return 1 ;;" "/* | */ | '') return 1 ;;"
mutant R13 "fail-open when GitHub cannot be read" '|| refuse "repos/$target could not be read from github.com"' '|| exit 0'
mutant R16 "a missing gh ignored" '|| refuse "gh is not on PATH, so the destination cannot be checked"' '|| true'
mutant R17 "archive's visibility not checked" '[ "$private" = "true" ]' 'true'
mutant R18 "unconfigured clone allowed" '|| refuse "the guard is not configured in this clone; run make install-push-guard"' '|| exit 0'
mutant R19 "lookup not pinned to github.com" 'gh api --hostname github.com "repos/$1"' 'gh api "repos/$1"'
mutant R21 "a parse-only mode restored" 'url=${2-}' 'if [ "$#" -eq 2 ] && [ "$1" = "--parse-url" ]; then parse_github_url "$2"; exit; fi
url=${2-}'
mutant R3 "SSH accepted" 'https://*) ;;
    *) return 1 ;;
  esac
  rest=${u#https://}' 'https://* | ssh://*) ;;
    *) return 1 ;;
  esac
  rest=${u#*://}'
mutant R22 "GIT_SSL_NO_VERIFY ignored" '[ -n "${GIT_SSL_NO_VERIFY-}" ] && { echo "GIT_SSL_NO_VERIFY is set"; return; }' ':'
mutant R23 "http.sslVerify ignored" '[ "$v" = false ] && { echo "http.sslVerify is false for this URL"; return; }' ':'
mutant R24 "an added CA ignored" 'for e in GIT_SSL_CAINFO GIT_SSL_CAPATH SSL_CERT_FILE SSL_CERT_DIR; do' 'for e in GIT_SSL_CAINFO GIT_SSL_CAPATH; do'
mutant R25 "gh socket routing ignored" '[ -n "$v" ] && { echo "gh routes github.com through a socket ($v)"; return; }' ':'
mutant R26 "tags allowed" 'archive_id=$(git config' 'while read -r _ _ r _; do case "$r" in refs/tags/*) exit 0 ;; esac; done
archive_id=$(git config'
MUTANT_COUNT=${#M_MUST[@]}
if [ -n "$failed_cases" ]; then
  fail "no mutant evaluated: the real hook fails cases, so a mutant's failures would prove nothing"
  M_MUST=()
fi
for i in "${!M_MUST[@]}"; do
  must=${M_MUST[$i]} label=${M_LABEL[$i]}
  for repo in "$P" "$U"; do
    cp "$HOOK_SRC" "$repo/.git/hooks/pre-push"
    FROM=${M_FROM[$i]} TO=${M_TO[$i]} perl -0pi -e 's/\Q$ENV{FROM}\E/$ENV{TO}/' "$repo/.git/hooks/pre-push"
  done
  if cmp -s "$HOOK_SRC" "$P/.git/hooks/pre-push"; then
    fail "mutant '$label' did not apply — the pattern no longer matches the hook"
    continue
  fi
  caught=$(run_cases)
  if printf '%s\n' "$caught" | grep -qx "$must"; then
    pass "'$label' is caught by $must"
  else
    fail "'$label' is NOT caught by $must (cases failing: $(printf '%s' "$caught" | tr '\n' ' '))"
  fi
done
for repo in "$P" "$U"; do cp "$HOOK_SRC" "$repo/.git/hooks/pre-push"; done

echo
echo "What this does not check:"
echo "  1. git push --no-verify, which skips every hook; a clone the guard was never"
echo "     installed in; and core.hooksPath set after the install."
echo "  2. Real GitHub. gh is faked here. make install-push-guard reads the real"
echo "     archive, and a git push --dry-run to a real public repository proves the"
echo "     refusal without sending anything."
echo "  3. The machine's own TLS roots. The guard refuses an added CA it can see in"
echo "     the environment or git's configuration, and trusts the system store."
echo
if [ "$FAILED" -eq 0 ]; then
  printf 'check-push-guard: verdict=PASS cases=%d mutants=%d exit=0\n' "$CASE_COUNT" "$MUTANT_COUNT"
  exit 0
fi
printf 'check-push-guard: verdict=FAIL failures=%d exit=1\n' "$FAILED"
exit 1
