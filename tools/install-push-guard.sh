#!/usr/bin/env bash
# Installs the push guard, tools/git-hooks/pre-push, in this clone.
#
# Run it in every PRIVATE clone (decision request phase 1, D4, D8 and item 5,
# step 8). It records the archive as the GitHub repository behind the clone's
# own push URL — so run it while `origin` is the private archive, under either
# name — and refuses if GitHub does not report that repository private.
#
# The hook is COPIED, not linked. A link into the tracked file would vanish on
# checking out any commit that predates it, and git treats a missing hook as
# no hook.
#
# ⚠ Three refusals added after `REVIEW-057` round three:
#   - the hooks directory is resolved as an absolute path, because from a
#     subdirectory git reports it relative to where you stand, and the guard was
#     once written outside `.git` with the installer reporting success (R3-4);
#   - every push URL of the remote must resolve to the same archive, and an
#     archive id already recorded is never replaced silently, because a stale
#     `pushurl` once turned the reinstall in step 8 into a new archive (R3-5);
#   - the URL parser and the routing checks are the hook's own functions,
#     extracted by name; the hook no longer has a parse-only mode, which a
#     remote named `--parse-url` once reached (R3-1).
#
# Usage: tools/install-push-guard.sh [remote]   (default: origin)
set -euo pipefail

fail() { printf 'install-push-guard: REFUSED — %s\n' "$1" >&2; exit 1; }

top=$(git rev-parse --show-toplevel)
src="$top/tools/git-hooks/pre-push"
[ -f "$src" ] || fail "$src is missing"
# The hook's functions, by name, without running its check.
eval "$(sed -n '/^parse_github_url() {$/,/^}$/p; /^routing_problem() {$/,/^}$/p; /^lookup_repo() {$/,/^}$/p' "$src")"
declare -F parse_github_url routing_problem lookup_repo >/dev/null || fail "could not read the guard's functions from $src"

if hooks_path=$(git config --get core.hooksPath); then
  fail "core.hooksPath is set ($hooks_path), so a hook copied into the hooks directory would not run"
fi
hooks_dir=$(git rev-parse --path-format=absolute --git-path hooks)
dest="$hooks_dir/pre-push"
if [ -e "$dest" ] && ! grep -q '^# wconf push guard' "$dest"; then
  fail "$dest exists and is not this guard; move it aside first"
fi

remote=${1:-origin}
push_urls=$(git remote get-url --push --all "$remote") || fail "no remote named $remote"
command -v gh >/dev/null 2>&1 || fail "gh is not on PATH"
archive_id= full_name=
while IFS= read -r push_url; do
  target=$(parse_github_url "$push_url") \
    || fail "$remote's push URL is not an HTTPS repository on github.com: $push_url"
  problem=$(routing_problem "$push_url")
  [ -z "$problem" ] || fail "the connection to $push_url cannot be trusted: $problem"
  info=$(lookup_repo "$target") || fail "could not read repos/$target from GitHub"
  read -r id private <<<"$info"
  [ "$private" = "true" ] || fail "$target is not private, so it cannot be the archive"
  if [ -z "$archive_id" ]; then archive_id=$id full_name=$target
  elif [ "$id" != "$archive_id" ]; then fail "$remote's push URLs name two repositories ($archive_id and $id)"
  fi
done <<<"$push_urls"

recorded=$(git config --get wconf.pushguard.archiveid || true)
if [ -n "$recorded" ] && [ "$recorded" != "$archive_id" ]; then
  fail "this clone's recorded archive is repository id $recorded, and $remote now resolves to $archive_id. If the archive really changed, run git config --unset wconf.pushguard.archiveid and install again"
fi

git config wconf.pushguard.archiveid "$archive_id"
git config wconf.pushguard.archivename "$full_name"
# Earlier versions recorded the history's roots; the hook no longer uses them.
git config --unset wconf.pushguard.roots 2>/dev/null || true
mkdir -p "$hooks_dir"
cp "$src" "$dest"
chmod 0755 "$dest"

printf 'push guard installed: %s\n' "$dest"
printf '  archive: %s (repository id %s, private)\n' "$full_name" "$archive_id"
printf '  Every push from this clone may go only to that repository id, over HTTPS\n'
printf '  to github.com. The guard does not run on git push --no-verify, in a clone\n'
printf '  it was never installed in, or if core.hooksPath is set later.\n'
