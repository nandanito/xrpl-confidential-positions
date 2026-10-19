#!/usr/bin/env bash
#
# break-emphasis-gate.sh — verify `check-emphasis` by BREAKING it, in both
# directions, against the real tree.
#
#   tools/break-emphasis-gate.sh
#
# ⚠⚠ **A gate that has never been broken is a claim, not an instrument.** This
# repository has recorded four gates that reported PASS while the thing they
# checked was broken (`CLAIMS.md` E-165, E-168, E-182, E-203), and each was
# found by mutating the tree rather than by reading the check. So the mutations
# are committed, and the next session can re-run them instead of inheriting a
# sentence in a commit message.
#
# ⚠ **The exit code distinguishes two failures and the distinction is the
# point.** `rc=1` is the TREE failing a rule; `rc=2` is a CONTROL failing, which
# says the detector is wrong and nothing it reported can be believed. A probe
# that expects `rc=1` and gets `rc=2` passed for the wrong reason: it tripped a
# control before reaching the branch it names. That happened here — raising the
# cutoff hit a control hardcoding `E-249` instead of the vacuity branch — and it
# is why the cutoff controls are derived from `CUTOFF` (`CLAIMS.md` E-253).
#
# ⚠ Refuses to run on a dirty tree, so an interrupted run is recoverable with
# `git checkout -- CLAIMS.md CLAUDE.md tools/check-emphasis.ts`.
set -u
R="$(cd "$(dirname "$0")/.." && pwd)"
cd "$R"

if [ -n "$(git status --porcelain -- CLAIMS.md CLAUDE.md tools/check-emphasis.ts)" ]; then
  echo "REFUSED: CLAIMS.md, CLAUDE.md or tools/check-emphasis.ts is dirty."
  echo "         This script mutates all three. Commit or stash first, so an"
  echo "         interrupted run is recoverable with git checkout."
  exit 3
fi

TMP="$(mktemp -d)"
trap 'cp "$TMP"/CLAIMS.md CLAIMS.md; cp "$TMP"/CLAUDE.md CLAUDE.md; cp "$TMP"/check-emphasis.ts tools/check-emphasis.ts; rm -rf "$TMP"' EXIT
cp CLAIMS.md CLAUDE.md "$TMP/"; cp tools/check-emphasis.ts "$TMP/"
restore(){ cp "$TMP"/CLAIMS.md CLAIMS.md; cp "$TMP"/CLAUDE.md CLAUDE.md; cp "$TMP"/check-emphasis.ts tools/check-emphasis.ts; }

FAILED=0
py(){ python3 -c "$1"; }

# ⚠⚠ **PINNED TO A COMMIT, NOT TO `main`.** This probe reproduces the real
# defect by re-appending the 4,811-character paragraph the rewrite replaced —
# and it used to read it from `main:CLAIMS.md`. **The moment this branch merges,
# `main` carries the rewritten table and that line is gone**, so the lookup
# raises and the probe reports a failed mutation forever after. A reusable
# harness may not depend on a moving reference to the state it exists to
# reproduce (`CLAIMS.md` E-258).
#
# ⚠ The pin asserts the paragraph's LENGTH as well as its presence, so a pin
# that ever resolves to something else fails loudly instead of mutating with the
# wrong text. If the commit is unreachable — a shallow clone — the probe reports
# the mutation as failed, which is the safe direction.
PRE_REWRITE_PIN=124e95910bb223cc0cbf4c9fcf018aa07d60ec71
PRE_REWRITE_PARAGRAPH="import io,subprocess,sys
r=subprocess.run(['git','show','$PRE_REWRITE_PIN:CLAIMS.md'],capture_output=True,text=True)
if r.returncode: sys.exit('pinned commit $PRE_REWRITE_PIN unreachable: '+r.stderr.strip())
hits=[l for l in r.stdout.split(chr(10)) if l.startswith('**Last revised 2026-08-25**')]
if len(hits)!=1: sys.exit('expected 1 pre-rewrite paragraph at the pin, found %d' % len(hits))
if len(hits[0])!=4811: sys.exit('pinned paragraph is %d characters, expected 4811' % len(hits[0]))
p='CLAIMS.md'
t=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(t+chr(10)+chr(10)+hits[0]+chr(10))"

# probe <name> <PASS|FAIL|CONTROL|CRASH> <expect-needle|-> <mutation…>
#
# ⚠⚠ **CLASSIFIED BY THE GATE'S OWN VERDICT LINE, AND THE LINE MUST BE THE LAST
# ONE.** Round one's form read the exit code only, and Bun exits **1** for a
# syntax error, a failed import and an uncaught throw. Round two then found that
# requiring the line *somewhere* in the output was still not enough: a process
# that PRINTS the verdict and then throws was classified as a rule failure, so
# `REVIEW-043`'s own sentence — *"a crash cannot print this line"* — was false
# (`CLAIMS.md` E-259). A crash cannot print it **last**.
#
# ⚠ **THE NEEDLE IS WHAT MAKES A PROBE ABOUT ITS OWN RULE.** `probe()` used to
# assert only that *something* failed. Measured: the rule-1 mutation trips rule
# 1 **and** rule 3, so a `FAIL` verdict never established that rule 1's detector
# ran. A probe now names a string that must appear in the gate's output, and `-`
# is the explicit opt-out for probes whose outcome is the whole claim.
#
# ⚠ **A mutation that changes nothing is a probe that proves nothing.** Python's
# `str.replace(…, 1)` exits 0 when its needle has zero matches, so a stale
# needle would no-op silently and the unchanged tree would answer `PASS`. The
# files are hashed before and after.
probe(){
  local name="$1" want="$2" needle="$3"; shift 3
  local before after
  before="$(cat CLAIMS.md CLAUDE.md tools/check-emphasis.ts | shasum | cut -d' ' -f1)"
  if ! "$@" >"$TMP/mutate.log" 2>&1; then
    echo "  ✗ $name — THE MUTATION ITSELF FAILED. A probe that cannot apply is not a probe."
    tail -4 "$TMP/mutate.log" | sed 's/^/        /'
    restore; FAILED=1; return
  fi
  after="$(cat CLAIMS.md CLAUDE.md tools/check-emphasis.ts | shasum | cut -d' ' -f1)"
  if [ "$before" = "$after" ]; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING. Its needle has gone stale;"
    echo "      this probe would have reported the unmutated tree's verdict."
    restore; FAILED=1; return
  fi

  bun run tools/check-emphasis.ts >"$TMP/run.log" 2>&1; local rc=$?
  restore

  local last got=CRASH
  last="$(tail -1 "$TMP/run.log")"
  case "$last" in
    "check-emphasis: verdict=PASS exit=0")    [ "$rc" = "0" ] && got=PASS ;;
    "check-emphasis: verdict=FAIL exit=1")    [ "$rc" = "1" ] && got=FAIL ;;
    "check-emphasis: verdict=CONTROL exit=2") [ "$rc" = "2" ] && got=CONTROL ;;
  esac

  if [ "$got" != "$want" ]; then
    if [ "$got" = "CRASH" ] && [ "$want" != "CRASH" ]; then
      echo "  ✗ $name — CRASH (rc=$rc, last line was not a verdict). The gate did not"
      echo "      complete; this probe proved nothing. Last lines of its output:"
      tail -4 "$TMP/run.log" | sed 's/^/        /'
    else
      echo "  ✗ $name — wanted $want, got $got (rc=$rc)"
    fi
    FAILED=1; return
  fi

  # ⚠⚠ **THE NEEDLE IS SEARCHED IN THE `FAIL` LINES ONLY.** Its first form
  # grepped the whole run, and the gate PRINTS its controls — `CONTROL ✓ rule 1:
  # a row with TWO ⚠⚠ fails` — so a needle of `rule 1` matched a passing run's
  # own output. Measured: a probe that produced a **rule 3** failure and claimed
  # rule 1 reported ✓. **A false pass inside the fix for false passes**, found
  # by breaking the harness rather than by reading it (`CLAIMS.md` E-260).
  if [ "$needle" != "-" ] && ! grep '^FAIL' "$TMP/run.log" | grep -qF "$needle"; then
    echo "  ✗ $name — got $want, but the output never mentions \"$needle\"."
    echo "      Something else failed. This probe did not exercise what it names."
    FAILED=1; return
  fi
  echo "  ✓ $name — $got (rc=$rc)"
}

echo "=============================================================================="
echo "break-emphasis-gate — verifying check-emphasis by breaking it"
echo "=============================================================================="
echo
# ⚠⚠ **`--self-test` VERIFIES THE HARNESS, and it is committed because running
# it is how the needle check's own false pass was found.** Three deliberately
# broken probes that must be REPORTED broken, and one correct probe that must
# still tick — without the last one, a harness that failed everything would
# score full marks.
if [ "${1:-}" = "--self-test" ]; then
  echo "SELF-TEST — three broken probes must EACH be rejected, one correct probe must tick"
  echo
  rejected=0
  for i in 1 2 3; do
    FAILED=0
    case $i in
      1) probe "STALE NEEDLE: the mutation matches nothing and changes nothing" FAIL "rule 1" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('| E-99999 | ','ZZZ',1))" ;;
      2) probe "WRONG NEEDLE: a real rule-3 failure claimed as rule 1" FAIL "rule 1" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 | **','| E-249 | ⚠ A. ⚠ B. ⚠ C. ⚠ D. **',1);io.open(p,'w',encoding='utf-8').write(t)" ;;
      3) probe "CRASH AFTER A VERDICT: the line printed, then a throw" FAIL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('  runControls();','  console.log(\"check-emphasis: verdict=FAIL exit=1\");'+chr(10)+'  throw new Error(\"boom\");'+chr(10)+'  runControls();',1);io.open(p,'w',encoding='utf-8').write(t)" ;;
    esac
    [ "$FAILED" = "1" ] && rejected=$((rejected + 1))
  done
  FAILED=0
  probe "CORRECT: a real rule-3 failure claimed as rule 3" FAIL "rule 3" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 | **','| E-249 | ⚠ A. ⚠ B. ⚠ C. ⚠ D. **',1);io.open(p,'w',encoding='utf-8').write(t)"
  echo
  # ⚠⚠ **`broken=$FAILED` COUNTED *ANY* REJECTION AS ALL THREE.** `probe` sets
  # `FAILED=1` and never clears it, so one rejection made the boolean true and
  # the self-test printed *"rejected all three broken probes"* with a second
  # probe false-passing. **Measured** by giving the wrong-needle probe the right
  # needle: it ticked and the self-test still reported PASS and exited 0. Found
  # independently by both external legs (`CLAIMS.md` E-261). The count is per
  # probe now.
  if [ "$rejected" = "3" ] && [ "$FAILED" = "0" ]; then
    echo "PASS: all three broken probes were rejected, and the correct one was accepted."
    exit 0
  fi
  echo "FAIL: $rejected of 3 broken probes rejected; the correct probe " \
       "$([ "$FAILED" = "0" ] && echo 'was accepted' || echo 'was REJECTED')."
  exit 1
fi

echo "The GOVERNED rows — each rule must actually fail"
probe "rule 1: a second ⚠⚠ in E-251" FAIL "rule 1" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-251 | **','| E-251 | ⚠⚠ **X.** ⚠⚠ **',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "rule 3: four ⚠ in E-249" FAIL "rule 3" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 | **','| E-249 | ⚠ A. ⚠ B. ⚠ C. ⚠ D. **',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "rule 4: a mid-clause ⚠ in E-250" FAIL "rule 4" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('and the dangling date stood','and ⚠ the dangling date stood',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "rule 5: the whole claim cell of E-250 bolded" FAIL "rule 5" py "import io;p='CLAIMS.md';L=io.open(p,encoding='utf-8').read().split('\n');i=[n for n,l in enumerate(L) if l.startswith('| E-250 |')][0];c=L[i].split(' | ');c[1]='**'+c[1].replace('*','')+'**';L[i]=' | '.join(c);io.open(p,'w',encoding='utf-8').write('\n'.join(L))"
probe "rule 5 in a REVISION-HISTORY row, which carries no cutoff" FAIL "rule 5" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| 2026-08-13 | — | \`REVIEW-001\`','| 2026-08-13 | — | **REVIEW-001 and REVIEW-002 and a verification round, every word of it bold**  \`REVIEW-001\`',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "The FORWARD-ONLY property — history must stay untouched"
probe "a GRANDFATHERED row made far worse still passes" PASS "-" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-100 | ','| E-100 | ⚠⚠ A. ⚠⚠ B. ⚠ C. ⚠ D. ',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "Rule 6 and the recorded exemptions"
probe "the pre-rewrite paragraph from the pinned commit — 4,631 RENDERED characters" FAIL "4631 characters" py "$PRE_REWRITE_PARAGRAPH"
probe "a fourteenth over-length paragraph in CLAUDE.md trips the ratchet" FAIL "The ratchet only turns one way" py "import io;p='CLAUDE.md';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t+'\n\n'+'z'*900+'\n')"
probe "the recorded CLAIMS.md exemption's target removed — a STALE exemption" FAIL "matches 0 over-length paragraphs" py "import io;p='CLAIMS.md';L=io.open(p,encoding='utf-8').read().split('\n');L=[l for l in L if 'So the honest conclusion is not' not in l];io.open(p,'w',encoding='utf-8').write('\n'.join(L))"

echo
echo "The cutoff, and the fail-closed paths"
probe "the cutoff raised above every row — the VACUITY branch, not a control" FAIL "ZERO id-bearing rows" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('{ P: 13, E: 249, B: 27, F: 30, R: 7 }','{ P: 9999, E: 9999, B: 9999, F: 9999, R: 9999 }',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "a row carrying a prefix the cutoff does not cover" FAIL "prefix the cutoff does not cover" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 |','| G-1 | placeholder | placeholder | A |\n| E-249 |',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "The DETECTOR — neutering it must be caught by the controls, at rc=2"
probe "judgeRow neutered to report nothing" CONTROL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('  return { doubles, warns, boldRatio, midSentence: mid, problems };','  return { doubles, warns, boldRatio, midSentence: mid, problems: [] };',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "the code-span masker turned into the identity function" CONTROL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('export function maskCodeSpans(line: string): string {','export function maskCodeSpans(line: string): string { return line;',1);io.open(p,'w',encoding='utf-8').write(t)"
# ⚠⚠ **THE FENCE PROBE MUTATED DEAD CODE AND ONLY SAID SO WHEN IT BROKE.**
# It deleted the fence branch from the heuristic, which stopped being the live
# path when `REVIEW-045` gave rule 6 to `cmark-gfm` — so the mutation became a
# no-op and the probe reported `PASS` where it wanted `CONTROL`. **The harness
# caught it; nothing else would have** (`CLAIMS.md` E-263). One probe attacks the
# live path now, the other forces the fallback and then breaks it.
probe "the LIVE splitter: the <li> exclusion dropped from the cmark path" CONTROL "-" py "import io;p='tools/check-emphasis.ts';L=io.open(p,encoding='utf-8').read().split(chr(10));n=[i for i,l in enumerate(L) if l.strip().startswith('.replace(/<li')];assert len(n)==1, 'the li-exclusion line moved: %r' % n;del L[n[0]];io.open(p,'w',encoding='utf-8').write(chr(10).join(L))"
probe "the FALLBACK: cmark forced off, then the heuristic made blind to fences" CONTROL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('  const viaCmark = paragraphsViaCmark(text);','  const viaCmark = null;',1);t=t.replace('if (/^\\\\s*(\`\`\`|~~~)/.test(l)) { flush(); fenced = !fenced; continue; }','',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "midSentence made always-false" CONTROL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('export function midSentence(before: string): boolean {','export function midSentence(before: string): boolean { return false;',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "A CRASH is not a verdict — the harness must not read one as the other"
probe "a SYNTAX ERROR in the gate is CRASH, not a rule failure" CRASH "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('export function judgeRow','export function judgeRow(((',1))"
probe "an UNCAUGHT THROW is CRASH, not a rule failure" CRASH "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('  runControls();','  runControls();'+chr(10)+'  throw new Error(\"boom\");',1))"
probe "a SUPPRESSED verdict line is CRASH even when the exit code looks right" CRASH "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('  console.log(\`check-emphasis: verdict=\${what} exit=\${code}\`);','',1))"

echo
if [ "$FAILED" = "0" ]; then
  echo "PASS: every probe behaved as specified. The gate fails on each rule it claims"
  echo "      to enforce, passes on history it claims to leave alone, and its controls"
  echo "      catch a neutered detector."
  echo "⚠ This says the gate DETECTS these shapes. It says nothing about the shapes it"
  echo "  does not model — check-emphasis prints those itself."
else
  echo "FAIL: a probe misbehaved. Either the gate no longer detects what it claims,"
  echo "      or a mutation has rotted against the tree it edits. Both need reading."
fi
exit $FAILED
