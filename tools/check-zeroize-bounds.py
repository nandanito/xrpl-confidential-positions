#!/usr/bin/env python3
"""
Wiping-type gate — `CLAIMS.md` **B-19**, **B-21** and **E-171**.

⚠ **SIX parts, and this line said *"Three questions"* until `REVIEW-032b`
counted them.** It was written when there were three and never moved as parts 4,
5 and 6 were added — ⚠ **including by the commit that fixed part 6's header for
miscounting (E-199), which derived the printed total and left every number in the
prose above it.** `CLAIMS.md` E-201.

⚠ **A docstring cannot count itself, so the parts are NAMED rather than
numbered.** Where a number is load-bearing it is derived from the list it counts;
where it cannot be, it is not written.

The first two are answered by making a compiler decide rather than by reading a
manifest; the rest cannot be, and say so:

  **Part 1 — is `ed25519-dalek`'s `zeroize` feature on, and what turns it on?**
  Scratch-crate probes, one per feature set, each naming the `ZeroizeOnDrop`
  bound. Isolated from the signer so the answer cannot be confounded by anything
  else in this tree.

  **Part 2 — do the signer's own secret locals wipe?** In-tree reverts to bare
  arrays, each of which must break the build.

  **Part 3 — did the signing helper stop calling the wiping helper?** A
  known-spelling source check, because no type can express it. ⚠ **Added after
  both `REVIEW-027` external legs found parts 1 and 2 blind to it** (E-173):
  inlining `Sha512::digest` back into `sign_with_aux` leaves every other check
  green. ⚠ **It detects that regression. It does NOT establish that the arm
  hashes only through the helper** — see part 3's own note (E-175).

⚠ **PART 1 EXISTS BECAUSE B-19 WAS WRONG, AND THIS SCRIPT IS WHAT FOUND IT
(E-171).** `CLAIMS.md` E-167 said the `zeroize` feature *"was OFF, by accident,
for nine days"* and the B-19 decision said *"reverting the manifest line fails to
COMPILE"*. **Both are false.** The historical line —
`default-features = false, features = ["std"]`, at `16e2e58` — resolves to
`alloc,std,zeroize`, because `std = ["alloc", ..]` and `alloc` lists
`"zeroize/alloc"` **without the `?` sigil** that the `serde?/alloc` entry beside
it carries. The secret types were wiped on drop the whole time. B-19 made an
implied feature explicit, which is worth doing and is **not** what it said it
did. Three `REVIEW-025` legs and a `REVIEW-026` round accepted the claim, because
reading a manifest is not running one.

⚠ **CONTROLS RUN IN BOTH DIRECTIONS, and a gate without them is the false pass it
was built to catch (E-165, E-168).** Part 1's `[]` probe must FAIL, or "it
compiles" says nothing. Part 2's comment-edit control must still BUILD, or "the
build broke" says nothing.

⚠ **WHAT THIS DOES NOT SAY.** It says these types wipe on drop and these reverts
break the build. It does **not** say secret material is unrecoverable — see the
three residues named at `signer/src/xrpl.rs::sha512_zeroizing`, and P-5: an
adversary with code execution reads the scalar while it is live. This narrows a
window and removes no channel.

⚠ **IT REWRITES TRACKED SOURCE WHILE IT RUNS, and until 2026-09-11 nothing here
said so.** Part 2 reverts a secret-wiping local and requires the build to break,
so the mutation is the mechanism. The tree is restored on exit from file copies
taken at start-up - **not** by `git checkout` - so uncommitted edits survive a
run. While it runs `git status` is not to be trusted and nothing should be
staged: `CLAIMS.md` E-257 records an `M signer/src/xrpl.rs` seen one command
before a commit. ⚠ **A concurrent second run is REFUSED**, because its start-up
backup would capture this run's mutations and restore them permanently (E-269).

⚠ **Budget ≥20 minutes if a default-feature `cargo test` ran first.** Part 2
builds with `--all-features`; the two feature sets do not share artifacts, so
they evict each other from `signer/target` and the gate rebuilds from cold.
Measured 2026-09-11: ~2 minutes warm, 28 minutes after three `cargo test` runs.

Run from the repository root:  python3 tools/check-zeroize-bounds.py
Exit 0 when every probe and every revert lands the way it is declared to.
"""
import subprocess, sys, shutil, os, tempfile, atexit, signal, pathlib, re, fcntl

MANIFEST = 'signer/Cargo.toml'
XRPL = 'signer/src/xrpl.rs'
# ⚠ **B-23 added `holder.rs` and `onboarding.rs`, and the gate REFUSED the new
# reverts until it did** - "BAD REVERT: pattern occurs {Cargo.toml: 0, xrpl.rs:
# 0}". That is the `must be exactly once in exactly one file` rule working: a
# revert whose pattern is not found is reported, never silently skipped. It is
# recorded because a gate that fails LOUDLY on its own extension is the property
# E-165, E-168 and E-182 were all about, and this is the first time in this
# repository one did.
HOLDER = 'signer/src/holder.rs'
ONBOARDING = 'signer/src/onboarding.rs'
FILES = [MANIFEST, XRPL, HOLDER, ONBOARDING]

if not all(os.path.exists(f) for f in FILES):
    sys.exit(f"run me from the repository root; {FILES} not found from {os.getcwd()}")

# ---------------------------------------------------------------------------
# The mutation window - `CLAIMS.md` E-257, E-269
# ---------------------------------------------------------------------------
# ⚠ **THIS SCRIPT REWRITES TRACKED SOURCE WHILE IT RUNS.** Part 2's whole
# method is reverting a secret-wiping local and requiring the build to break, so
# the mutation IS the mechanism and not a defect in it. What WAS a defect is that
# nothing said so: the Makefile comment, this module's docstring and every line
# of output described what the gate proves, and none said the tree is unsafe to
# read while it proves it. On 2026-09-09 a `git status` taken inside the window
# reported `M signer/src/xrpl.rs` one command before a commit (E-257).
#
# ⚠⚠ **TWO CONCURRENT RUNS CORRUPT SOURCE, and that is why this refuses
# rather than warns.** The backups below are taken from DISK at start-up. A
# second run beginning inside the first one's window backs up the MUTATED file
# and, on exit, restores that mutation permanently - a source file corrupted by
# two gates that each believed they were restoring. **Measured 2026-09-11**: a
# backup taken during a real run captured `let _negative_control = ();` in
# `signer/src/xrpl.rs`. E-169's rule is that a known-destructive path is blocked
# rather than described, and this is that.
#
# ⚠ **The lock is taken BEFORE the backups, and the order is the whole
# point.** Acquiring it afterwards would let the second run copy the first one's
# mutations into its own backup and only then discover it was second.
#
# ⚠ `flock` rather than an exclusive-create file, deliberately: the OS drops
# it when the process dies, so a crashed or killed run leaves nothing to clean up
# by hand. A stale lock that outlives its owner turns a guard into an outage.
#
# ⚠⚠ **THE LOCK LIVES IN THIS WORKTREE'S GIT DIRECTORY, and two earlier
# attempts put it somewhere that did not work.** The identity has to be decided
# by the tree whose files this run rewrites, and by nothing else.
#
#   1. A single global name in the temp directory serialised two clones that
#      mutate entirely disjoint files - one falsely refused for what can be the
#      28 minutes documented above.
#   2. Hashing the tree path fixed that and broke on `TMPDIR`. Two runs over the
#      SAME checkout with different `TMPDIR` values - an IDE or launchd service
#      and a shell - hash to the same name in *different directories*, so both
#      acquire, both take backups, and the later one restores the earlier one's
#      MUTATED snapshot over the developer's source. Measured: the default here
#      is `/var/folders/.../T` and `TMPDIR=/tmp` is `/tmp`.
#
# `git rev-parse --absolute-git-dir` is decided by the worktree alone: it ignores
# `TMPDIR`, it differs per clone AND per `git worktree` checkout, and `.git` is
# never reported by `git status`, so the lock file cannot dirty the tree - which
# was the only reason the temp directory was chosen in the first place.
#
# ⚠ **It also closes a symlink attack the temp path had.** A predictable name in
# a shared directory such as Linux `/tmp` can be pre-created as a symlink, and
# `open(path, 'w')` FOLLOWS it and TRUNCATES the target before `flock` ever runs.
# This opens with `O_NOFOLLOW` and without `O_TRUNC`: the lock's contents are
# never used, so there is no reason to write to it at all.
# ⚠⚠ **`GIT_DIR` BEATS `cwd`, so asking git where it is can be answered about a
# DIFFERENT repository.** With `GIT_DIR` exported - a git hook, a CI wrapper -
# `rev-parse --absolute-git-dir` reports that repository, so a redirected run and
# an ordinary run would take locks in two different places while rewriting the
# SAME `signer/` files. That is the corruption race the lock exists to stop,
# reopened by the environment. Measured: with `GIT_DIR` set, the lock path moved
# to the foreign repository.
#
# ⚠ Two defences, because either alone is thin: the repository-selection
# variables are removed from the child environment, AND the worktree git reports
# is required to BE this directory. The second catches anything the first misses.
# ⚠⚠ **AN ALLOWLIST, because the denylist that stood here missed a member.**
# The first version listed the repository-selection variables. It did not list
# `GIT_CONFIG`, which redirects where `git config` WRITES, nor
# `GIT_CONFIG_COUNT`/`_KEY_n`/`_VALUE_n`, which inject settings, nor
# `GIT_TEMPLATE_DIR`. A denylist has to be re-derived every time git gains a
# variable; an allowlist cannot silently miss one. `GIT_EXEC_PATH` is kept
# because it locates git's own helper programs rather than selecting a
# repository or a configuration. This gate asks git exactly two questions and
# needs nothing else from the environment.
_git_env = {k: v for k, v in os.environ.items()
            if not k.startswith('GIT_') or k == 'GIT_EXEC_PATH'}

def _git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True, env=_git_env)

_gitdir = _git('rev-parse', '--absolute-git-dir')
if _gitdir.returncode != 0:
    sys.exit(
        "REFUSED: this is not a git worktree, so the mutation lock has nowhere safe to live.\n"
        "         The lock must be keyed to the tree this run rewrites. A temp-directory\n"
        "         fallback is not offered because it is the weakness this replaced: it\n"
        "         varies with TMPDIR, so two runs over one checkout can both acquire it.")
_toplevel = _git('rev-parse', '--show-toplevel')
_here = os.path.realpath(os.getcwd())
if _toplevel.returncode != 0 or os.path.realpath(_toplevel.stdout.strip()) != _here:
    sys.exit(
        f"REFUSED: git reports its worktree as {_toplevel.stdout.strip() or '<none>'},\n"
        f"         but this run rewrites files under {_here}.\n"
        "         The lock would be keyed to a repository other than the one being mutated,\n"
        "         so two runs over these files could hold different locks. Run from the\n"
        "         repository root with no GIT_DIR or GIT_WORK_TREE override.")
_LOCKPATH = os.path.join(_gitdir.stdout.strip(), 'wconf-check-zeroize-bounds.lock')
try:
    _lockfd = os.open(_LOCKPATH, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
except OSError as e:
    sys.exit(f"REFUSED: cannot open the mutation lock at {_LOCKPATH} ({e}).\n"
             "         A symlink in its place is refused rather than followed.")
try:
    fcntl.flock(_lockfd, fcntl.LOCK_EX | fcntl.LOCK_NB)
except OSError:
    sys.exit(
        "REFUSED: another check-zeroize-bounds is already running.\n"
        "         This gate rewrites tracked files in signer/ while it runs, and its\n"
        "         backups are taken from disk at start-up, so a second run would back\n"
        "         up the FIRST one's mutations and restore them permanently.\n"
        f"         Lock: {_LOCKPATH}\n"
        "         The lock lives in THIS worktree's git directory, so a different clone\n"
        "         or worktree is not blocked by it, and TMPDIR cannot split it in two.\n"
        "         Wait for the other run on this tree to finish.")

# ⚠ **`flush=True`, and it is not decoration.** Python block-buffers stdout when
# it is redirected or piped, so without this the warning about the window is
# still sitting in a buffer while the window is open and only lands after the
# run ends. **Measured 2026-09-11**: with `> log 2>&1` the banner was absent from
# the file three seconds in, with `signer/` already mutated. A warning that
# arrives after the danger has passed is not a warning.
print("⚠ This gate REWRITES tracked files in signer/ for as long as it runs, and", flush=True)
print("  restores them on exit. While it runs the working tree is NOT safe to read:", flush=True)
print("  do not stage, do not commit, and do not trust `git status` until it ends.", flush=True)
print("  A concurrent second run is REFUSED - it would restore this run's mutations.", flush=True)
print(flush=True)

_bakdir = tempfile.mkdtemp(prefix='wconf-zeroize-bounds-')
_baks = {}
for _f in FILES:
    # ⚠ **The backup name is the FLATTENED PATH, not the basename.** With
    # `basename` two files called `mod.rs` would share one backup and `restore()`
    # would write one over the other - **corrupting a source file to fix a gate
    # run.** No collision exists in today's list; this is here so adding to
    # `FILES` cannot create one silently. B-23.
    _b = os.path.join(_bakdir, _f.replace(os.sep, '__'))
    shutil.copy(_f, _b)
    _baks[_f] = _b

def restore():
    for f, b in _baks.items():
        shutil.copy(b, f)

# ⚠ **Registered BEFORE `restore`, because `atexit` runs LIFO** — so the backups
# are put back first and only then deleted. Reversing these two lines would
# delete the backups before they were used, which is why the order is stated
# rather than left to be re-derived.
#
# ⚠ **The directory used to leak, one per run: 51 of them had accumulated in
# `TMPDIR` before anyone counted.** Harmless in size and untidy in a way that
# matters here — the backup directory is the artefact a reader would go looking
# for after an interrupted run, and fifty stale ones make the real one
# unfindable.
atexit.register(lambda: shutil.rmtree(_bakdir, ignore_errors=True))

atexit.register(restore)
# ⚠⚠ **`SIGHUP` WAS NOT HANDLED, AND `atexit` DOES NOT RUN FOR IT — measured.**
# Closing a terminal or dropping an SSH session during part 2 killed this process
# with a tracked `signer/` file still reverted, and the flock went with it. The
# next run then took that mutation as its BASELINE backup and restored it
# permanently: the exact corruption the lock exists to stop, arriving through the
# one door the lock does not watch. The output's promise that the tree "is
# restored on exit" was false for that path.
#
# ⚠ `SIGQUIT` for the same reason. Both are looked up with `getattr` because
# neither exists on every platform, and a missing signal must not stop the gate
# from running at all.
for _name in ('SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'):
    _sig = getattr(signal, _name, None)
    if _sig is not None:
        signal.signal(_sig, lambda *_: (restore(), sys.exit(130)))

bad = 0

# ---------------------------------------------------------------------------
# Part 1 — what actually enables ed25519-dalek's `zeroize` feature
# ---------------------------------------------------------------------------
SCRATCH = tempfile.mkdtemp(prefix='wconf-zeroize-probe-')
atexit.register(lambda: shutil.rmtree(SCRATCH, ignore_errors=True))
os.makedirs(os.path.join(SCRATCH, 'src'), exist_ok=True)
open(os.path.join(SCRATCH, 'src', 'lib.rs'), 'w').write(
    "pub fn probe() {\n"
    "    fn requires<T: zeroize::ZeroizeOnDrop>() {}\n"
    "    requires::<ed25519_dalek::SigningKey>();\n"
    "}\n")

def probe(feats):
    """Build a scratch crate naming the bound. Returns True if it compiles."""
    open(os.path.join(SCRATCH, 'Cargo.toml'), 'w').write(
        '[package]\nname = "zprobe"\nversion = "0.0.0"\nedition = "2021"\n'
        '[dependencies]\n'
        f'ed25519-dalek = {{ version = "2", default-features = false, features = [{feats}] }}\n'
        'zeroize = { version = "1", default-features = false }\n')
    r = subprocess.run(['cargo', 'build', '-q'], cwd=SCRATCH,
                       capture_output=True, text=True)
    return r.returncode == 0

# (features, must_compile, what it establishes)
PROBES = [
  ('', False,
   "CONTROL — no features at all. Must FAIL, or 'it compiles' below means nothing."),
  ('"std"', True,
   "⚠ THE HISTORICAL LINE at 16e2e58. E-167 said this left zeroize OFF. It did not."),
  ('"alloc"', True,
   "`alloc` is the switch — it lists \"zeroize/alloc\" with no `?` sigil."),
  ('"std", "hazmat", "zeroize"', True,
   "today's line. Explicit, and — E-171 — not a behaviour change."),
]

print("check-zeroize-bounds — CLAIMS.md B-19, B-21, E-171\n")
print(f"  signer:  {os.path.abspath('signer')}")
print(f"  scratch: {SCRATCH}\n")
print("Part 1 — ed25519-dalek's `zeroize` feature, decided by a compiler")
print(f"  {'features':<32} {'result':<22} establishes")
print("  " + "-" * 104)
for feats, must, why in PROBES:
    got = probe(feats)
    ok = (got == must)
    verdict = ('compiles' if got else 'fails') + ('  OK' if ok else '  ⚠ NOT AS DECLARED')
    print(f"  [{feats}]".ljust(34) + f"{verdict:<22} {why}")
    if not ok:
        bad += 1

# ---------------------------------------------------------------------------
# Part 2 — the signer's own secret locals
# ---------------------------------------------------------------------------
def apply(old, new):
    hits = [(f, open(f).read()) for f in FILES]
    hits = [(f, t) for f, t in hits if t.count(old) == 1]
    if len(hits) != 1:
        counts = {f: open(f).read().count(old) for f in FILES}
        return f"BAD REVERT: pattern occurs {counts}; must be exactly once in exactly one file"
    f, t = hits[0]
    open(f, 'w').write(t.replace(old, new))
    return None

def compile_tests():
    r = subprocess.run(['cargo', 'test', '--all-features', '--no-run'],
                       cwd='signer', capture_output=True, text=True)
    return r.returncode == 0, r.stdout + r.stderr

REVERTS = [
  ("`sha512_zeroizing` returns a bare array (the expansion and the mask)",
   """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
    let mut hasher = Sha512::new();
    for part in parts {
        hasher.update(part);
    }
    let mut digest = hasher.finalize();
    let mut out = Zeroizing::new([0u8; 64]);
    out.copy_from_slice(digest.as_slice());
    digest.as_mut_slice().zeroize();
    out
}""",
   """fn sha512_zeroizing(parts: &[&[u8]]) -> [u8; 64] {
    let mut hasher = Sha512::new();
    for part in parts {
        hasher.update(part);
    }
    let digest = hasher.finalize();
    let mut out = [0u8; 64];
    out.copy_from_slice(digest.as_slice());
    out
}""",
   "the ed25519 SHA-512 expansion `h` and the nonce mask"),

  # ---- B-22 / REVIEW-029c condition 3 -------------------------------------
  # ⚠ VERIFIED TO BREAK BEFORE BEING WRITTEN HERE: ONE compile error (E0308 at
  # the `root` closure). ⚠ **A first version of this comment said "2 compile
  # errors" - `grep -c '^error'` had counted rustc's "could not compile ... due
  # to 1 previous error" SUMMARY LINE as a second error. E-181.** It bites
  # through `derive_scalar`'s `Fn(u32) -> Zeroizing<[u8; 32]>` bound, NOT at
  # `ed25519_from_entropy` — `from_bytes(&x)` accepts either form, so that call
  # site alone would have false-passed (E-164's shape, found before shipping).
  ("`sha512half_zeroizing` returns a bare array (the DERIVED PRIVATE KEY)",
   """fn sha512half_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 32]> {
    let full = sha512_zeroizing(parts);
    let mut out = Zeroizing::new([0u8; 32]);""",
   """fn sha512half_zeroizing(parts: &[&[u8]]) -> [u8; 32] {
    let full = sha512_zeroizing(parts);
    let mut out = ([0u8; 32]);""",
   "the secp256k1 root preimage digest"),  # NOT the ed25519 site - see the note above

  ("`fresh_aux` returns a bare array (the drawn auxiliary entropy)",
   """fn fresh_aux() -> Option<Zeroizing<[u8; 32]>> {
    let mut b = Zeroizing::new([0u8; 32]);
    match crate::store::getrandom(&mut b[..]) {""",
   """fn fresh_aux() -> Option<[u8; 32]> {
    let mut b = [0u8; 32];
    match crate::store::getrandom(&mut b[..]) {""",
   "the 32 bytes `getrandom` drew for the nonce hedge"),

  # ---- B-23 / the seed's owned lifetime -----------------------------------
  # ⚠ **MEASURED BEFORE BEING WRITTEN HERE, and 5 OF B-23'S 7 SITES DID NOT
  # BREAK.** Every one of the seven was reverted by hand and `cargo build
  # --tests` re-run; only these two produced a compile error. The other five are
  # part 6, checked at SOURCE, because a revert that compiles proves nothing and
  # putting it here would be a false pass of E-164's shape. **E-179's rule, run
  # forward rather than quoted.**
  #
  # ⚠ Error counts below are read from rustc's `error[E….]` lines, NOT from
  # `grep -c '^error'` — that counts the "could not compile … due to 1 previous
  # error" SUMMARY line too, which is how E-181's wrong count happened.
  #
  # ⚠ Both are **(type)** breaks, not property breaks, and they are COUPLED: each
  # bites because a *second* B-23 site still expects the wiping type. Reverting
  # both halves together would compile. That is stated rather than left for a
  # reviewer to discover — it is the same caveat the "(bound)"/"(type)" note at
  # the foot of this file makes.
  ("`RawProfile::account_seed` is a bare `String` (the profile's plaintext seed)",
   """    #[serde(deserialize_with = "de_zeroizing_string")]
    account_seed: Zeroizing<String>,""",
   """    account_seed: String,""",
   "B-23 - the deserialised seed. ONE error, E0308, biting at `p.account_seed`, "
   "which is the MOVE into the wiping `seed` binding"),

  ("`OnboardingIo::ask_secret` returns a bare `String` (the seed as typed)",
   """    fn ask_secret(&mut self, prompt: &str) -> Option<Zeroizing<String>>;""",
   """    fn ask_secret(&mut self, prompt: &str) -> Option<String>;""",
   "B-23 - the prompted master seed. ONE error, E0053, at `TerminalIo`'s impl - "
   "the REAL terminal reader. NOT because the test double is unaffected: the lib "
   "fails first, so `tests/onboarding.rs` is never compiled (REVIEW-031a said TWO "
   "errors; measured, it is ONE)"),

  ("`OneShotAux` holds a bare array (the ECDSA aux, live for the whole sign)",
   """struct OneShotAux {
    bytes: Zeroizing<[u8; 32]>,
    used: usize,
}

impl OneShotAux {
    fn new(bytes: Zeroizing<[u8; 32]>) -> OneShotAux {""",
   """struct OneShotAux {
    bytes: [u8; 32],
    used: usize,
}

impl OneShotAux {
    fn new(bytes: [u8; 32]) -> OneShotAux {""",
   "the same drawn bytes, held across `sign_prehash_with_rng`"),
]

# ⚠ **Anchored on a STRUCTURAL line, not on prose.** Its first form patched the
# `sha512_zeroizing` doc headline — and a `REVIEW-027` fix rewrote that headline,
# so the control reported VOID and took the whole gate down with it. A control
# that breaks whenever someone edits a comment is a control that will be
# loosened, which is how `check-test-support-gate` acquired E-165.
CONTROL = ("CONTROL — a no-op line added inside the wiping helper. Must still BUILD.",
           """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
    let mut hasher = Sha512::new();""",
           """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
    let _negative_control = ();
    let mut hasher = Sha512::new();""")

print("\nPart 2 — the signer's own secret locals, decided by reverting them")
print("  baseline: the unmodified tree must build its tests ...")
ok, out = compile_tests()
if not ok:
    print("    " + "\n    ".join(out.splitlines()[-12:]))
    print("\nVOID, not passing: the unmodified tree does not compile.")
    print("  Every revert below would 'break the build' for a reason that is not the revert.")
    sys.exit(1)
print("    builds. Every failure below is one a revert CAUSED.\n")

print(f"  {'result':<24} revert")
print("  " + "-" * 104)

name, old, new = CONTROL
restore()
err = apply(old, new)
if err:
    print(f"  {'VOID':<24} {name}\n    {err}")
    sys.exit(1)
ok, out = compile_tests()
restore()
if not ok:
    print("    " + "\n    ".join(out.splitlines()[-12:]))
    print(f"\nVOID, not passing: the negative control BROKE THE BUILD.")
    print("  'The build broke' then carries no information and every arm is a false pass. E-165.")
    sys.exit(1)
print(f"  {'still builds  OK':<24} {name}")

for name, old, new, register in REVERTS:
    restore()
    err = apply(old, new)
    if err:
        print(f"  {'BAD PATTERN':<24} {name}\n    {err}")
        bad += 1
        continue
    ok, out = compile_tests()
    if ok:
        print(f"  {'STILL BUILDS  ⚠ FALSE':<24} {name}\n    {register}")
        print("    ⚠ The secret stopped being a wiping type and NOTHING objected.")
        bad += 1
        continue
    mech = 'bound' if 'ZeroizeOnDrop' in out else 'type'
    print(f"  {'build broke  OK (' + mech + ')':<24} {name}\n    {register}")
restore()

# ---------------------------------------------------------------------------
# Part 3 - does the SIGNING HELPER actually use the wiping helper?
#
# ⚠ **BOTH `REVIEW-027` EXTERNAL LEGS FOUND THAT PARTS 1 AND 2 MISS THIS, AND
# THEY ARE RIGHT (CLAIMS.md E-173).** Part 2 mutates `sha512_zeroizing`'s
# RETURN TYPE, and the in-crate test calls `sha512_zeroizing` DIRECTLY. So if
# `sign_with_aux` stopped calling it and inlined `Sha512::digest(..)` again, the
# helper would still exist, the test would still name its bound, part 2's revert
# would still break the build - and the signing path would be back to unwiped
# digests with every check green.
#
# **A type cannot express "this call site must use that function", so this is a
# SOURCE-level check** - the same shape as `check-blinding-sources.ts`, which
# gates which call sites may reach the superseded generator.
#
# ⚠⚠ **IT IS A KNOWN-SPELLING REGRESSION CHECK AND NOTHING MORE, and round two
# of `REVIEW-027` found the prose around it claiming otherwise (E-175).** It
# rejects the two literal spellings `Sha512::digest` and `Sha512::new` and
# requires the helper's NAME to appear in the arm. All of these evade it:
#
#   type H = Sha512; H::digest(secret)          # an alias
#   <Sha512 as Digest>::digest(secret)          # qualified syntax
#   Sha512::default() ... .finalize()           # constructed another way
#   sha512_zeroizing(&[b""]); other_hash(sk)    # a DECOY call plus a real one
#
# So it catches **the regression that actually happened** — someone inlining the
# digest back — and does not establish that the arm hashes only through the
# helper. `check-blinding`'s header says the same of itself (E-142); the
# alternative is a false guarantee.
def ed25519_arm_of_sign_with_aux(text):
    """The Ed25519 match arm inside `sign_with_aux`, or None if not locatable."""
    i = text.find("fn sign_with_aux(")
    if i < 0:
        return None
    j = text.find("Inner::Ed25519(k) =>", i)
    if j < 0:
        return None
    k = text.find("\n        }\n    }\n}", j)
    return text[j:k if k > 0 else len(text)]

print("\nPart 3 - has the signing helper stopped calling the wiping helper?")
print("  (a KNOWN-SPELLING regression check - not a proof that it hashes only through it)")
restore()
src = open(XRPL).read()
arm = ed25519_arm_of_sign_with_aux(src)
if arm is None:
    print("  VOID: could not locate the Ed25519 arm of `sign_with_aux`.")
    bad += 1
else:
    BANNED = ("Sha512::digest", "Sha512::new")
    stray = [b for b in BANNED if b in arm]
    uses_helper = "sha512_zeroizing(" in arm
    if stray or not uses_helper:
        print(f"  ⚠ FALSE: the Ed25519 arm {'contains ' + ', '.join(stray) if stray else 'does not call sha512_zeroizing'}.")
        print("    Every hash over secret input on the signing path must go through")
        print("    `sha512_zeroizing`, or its digest is an unwiped stack local again.")
        bad += 1
    else:
        n = arm.count("sha512_zeroizing(")
        print(f"  no stray `Sha512::` in the arm, and {n} call(s) to `sha512_zeroizing`  OK")

    # ⚠ The control: the check must DETECT the inlining it exists to forbid.
    # Without this, "no stray Sha512" could mean the locator returned an empty
    # string - which is E-165's false pass exactly.
    # ⚠ **BOTH call sites, not just the expansion.** Round two: the control
    # mutated only `h` and left the mask's call untested, so a check that saw
    # only the first would have passed its own control (E-175).
    mutated = arm.replace("sha512_zeroizing(&[k.as_bytes()])",
                          "Sha512::digest(k.as_bytes())")
    mutated2 = arm.replace("sha512_zeroizing(&[ED25519_NONCE_HEDGE_DST, &aux[..]])",
                           "{ let mut m = Sha512::new(); m.update(ED25519_NONCE_HEDGE_DST); m.update(&aux[..]); m.finalize() }")
    if mutated2 != arm and not any(b in mutated2 for b in BANNED):
        print("  ⚠ VOID: inlining the MASK hash was not detected. This check is blind to it.")
        bad += 1
    elif mutated2 != arm:
        print("  CONTROL: inlining the mask hash IS detected  OK")
    else:
        print("  ⚠ VOID: the mask control could not be applied - that call site moved.")
        bad += 1
    if mutated == arm:
        print("  VOID: the control could not be applied - the expected call site moved.")
        bad += 1
    elif any(b in mutated for b in BANNED):
        print("  CONTROL: inlining `Sha512::digest` at the call site IS detected  OK")
    else:
        print("  ⚠ VOID: the control was applied and NOT detected. This check is blind.")
        bad += 1

# ---------------------------------------------------------------------------
# Part 4 - no LIVE file may assert the retracted B-19 premise.
#
# ⚠⚠ **THIS EXISTS BECAUSE THE COUNT WAS WRONG THREE TIMES RUNNING (E-172,
# E-175).** Round one recorded "fixed at all four live sites"; round two found
# six; the sweep after round two found NINE. Each correction asserted a number
# and each number was a claim with no falsifier - which is this project's own
# sentence about gates, landing on its own adjudications.
#
# So the count is no longer written down. This is.
#
# ⚠ **`docs/reviews/` and the REQUEST packets are EXEMPT and must stay so**: a
# packet is the record of what a leg was shown, and editing it after the fact
# makes the round unreviewable.
FORBIDDEN = [
    ("turned off by accident",        "asserts the feature was disabled"),
    ("B-19 turned",                   "attributes the feature to B-19's edit"),
    ("fails to COMPILE",              "asserts the retracted compile-failure falsifier"),
    ("left `zeroize` off",            "asserts the feature was disabled"),
    ("With `zeroize` **off**",        "argues from the false premise"),
]
# A hit is FORGIVEN when the correction is visible near it. Anything that marks
# the sentence as retracted counts.
MARKERS = ("E-171", "E-172", "E-175", "FALSE", "~~", "⚠")
EXEMPT_DIRS = ("docs/reviews/",)
LIVE_EXT = (".rs", ".md", ".toml", ".py")

def live_files():
    root = pathlib.Path(".")
    for f in root.rglob("*"):
        sp = str(f)
        if not f.is_file() or f.suffix not in LIVE_EXT:
            continue
        if any(d in sp for d in EXEMPT_DIRS) or "/target/" in sp or "/node_modules/" in sp or "/.git/" in sp:
            continue
        yield f

def scan(extra_text=None, extra_name="<injected>"):
    """Return [(file, lineno, phrase, why)] for UNCORRECTED assertions."""
    bad = []
    items = [(f, f.read_text(errors="replace")) for f in live_files()]
    if extra_text is not None:
        items.append((extra_name, extra_text))
    for f, text in items:
        lines = text.splitlines()
        for i, line in enumerate(lines):
            for phrase, why in FORBIDDEN:
                if phrase in line:
                    window = "\n".join(lines[max(0, i - 6):i + 7])
                    if not any(m in window for m in MARKERS):
                        bad.append((str(f), i + 1, phrase, why))
    return bad

print("\nPart 4 - no LIVE file may assert the retracted B-19 premise")
print("  (docs/reviews/ is exempt: a packet is the record of what a leg was shown)")
hits = scan()
if hits:
    for f, ln, phrase, why in hits:
        print(f"  ⚠ FALSE: {f}:{ln} - \"{phrase}\" {why}, with no correction nearby")
    bad += len(hits)
else:
    print(f"  {len(list(live_files()))} live files scanned, 0 uncorrected assertions  OK")

# ⚠ The control: an uncorrected assertion MUST be detected, or "0 hits" is the
# same false pass as an empty locator (E-165).
probe = scan("This line says the manifest fails to COMPILE with nothing around it.\n" * 1,
             "<control>")
if any(f == "<control>" for f, _, _, _ in probe):
    print("  CONTROL: an uncorrected assertion IS detected  OK")
else:
    print("  ⚠ VOID: the control was NOT detected. Part 4 is blind.")
    bad += 1

# ---------------------------------------------------------------------------
# Part 5 - the B-22 derivation sites that NO type revert can catch
#
# ⚠ **WHY THIS PART EXISTS, AND IT IS AN EMPIRICAL RESULT, NOT A PRECAUTION.**
# Before it was written, each B-22 site was reverted by hand and the build re-run.
# Reverting `sha512half_zeroizing`'s return type to a bare array breaks the build.
# **Wrapping an existing binding in `Zeroizing` does NOT**: reverting
# `Zeroizing::new(base58check_decode(..))` to the bare call gave **ZERO errors**,
# because `Zeroizing<T>` derefs to `T` and every use site compiles identically.
#
# **So for these sites a compile-time falsifier does not exist**, and part 2's
# machinery applied to them would have been a false pass of `CLAIMS.md` E-164's
# shape. A source check is the honest instrument.
#
# ⚠⚠ **BOTH `REVIEW-030` LEGS FOUND THIS PART FALSE-PASSING IN TWO WAYS, AND
# BOTH ARE FIXED HERE (E-181):**
#
#   1. **It counted needles ANYWHERE**, so commenting out a production line left
#      the needle matching inside the comment. Source is now **comment-stripped**
#      before counting - the same technique `check-blinding-sources.ts` uses.
#   2. **Its controls were not controls.** The positive one re-ran the same count
#      on the same string; the negative one checked an unrelated string was
#      absent. **Neither exercised the detector or the `bad` accounting.** Both
#      now run through `find_missing`, the identical function the real check uses.
#
# ⚠⚠ **WHAT THIS PART DOES NOT SAY, because `REVIEW-029a` finding 4 was right:**
# a gate pins the sites it NAMES. **It cannot establish that no unlisted
# secret-bearing site exists anywhere in the crate.** The guarantee is over a
# **NAMED SET**, the same narrowing `check-test-support` and `check-blinding`
# carry (E-142).
def _string_literal_at(text, i):
    """End index of the Rust string literal starting at `i`, or None.

    ⚠ **Handles what this repository actually contains and says so:** `"..."`
    with backslash escapes, `r"..."`, `r#"..."#` with any hash count, and the `b`
    prefixes of each. A lifetime or char literal is NOT a string and is left to
    the ordinary path - `'a` never opens one here because only `"` is treated as
    an opener.

    ⚠ This is still not a Rust lexer, and the residual is named rather than
    argued away: see `what_part_6_does_not_say()`.
    """
    j = i
    if j < len(text) and text[j] == "b":
        j += 1
    if j < len(text) and text[j] == "r":
        j += 1
        h = 0
        while j + h < len(text) and text[j + h] == "#":
            h += 1
        j += h
        if j >= len(text) or text[j] != '"':
            return None
        close = '"' + "#" * h
        k = text.find(close, j + 1)
        return None if k < 0 else k + len(close)
    if j >= len(text) or text[j] != '"':
        return None
    # An ordinary string: `\\` escapes the next character.
    k = j + 1
    while k < len(text):
        if text[k] == "\\":
            k += 2
            continue
        if text[k] == '"':
            return k + 1
        k += 1
    return None


def strip_line_comments(text):
    """Blank out `//` tails AND `/* ... */` blocks, COUNTING NESTING DEPTH.

    ⚠ **`/* ... */` WAS NOT HANDLED AT ALL AND THAT WAS A LIVE FALSE PASS
    (REVIEW-031b). THEN IT WAS HANDLED WITHOUT NESTING AND THAT WAS THE NEXT ONE
    (REVIEW-032a, REVIEW-032s).** Rust block comments nest, so
    `/* /* */ <needle> */` is entirely a comment; a depth-blind scanner cleared
    the block on the inner `*/` and handed the needle back live. Verified by
    running this function on exactly that input: count **1**.

    ⚠⚠ **FIFTH INSTANCE in this repository of a gate built to catch false passes
    false-passing** (E-165, E-168, E-182, E-198). ⚠ **Each fix looked at the
    construct in front of it**: the `//` half missed `/* */`, and the `/* */`
    half missed that `/* */` nests.

    ⚠⚠ **THE OLD DOCSTRING CLAIMED THIS IMPRECISION WAS SAFE-DIRECTION-ONLY -
    *"it can only make a needle harder to satisfy, never easier"* - AND THAT IS
    FALSE IN TWO WAYS, BOTH MEASURED (REVIEW-032b, E-201):**

      1. **Nesting**, above: a commented-out needle is handed back live.
      2. **Raw strings SYNTHESIZE needles.** This is not a Rust lexer, so
         `const DECOY: &str = r#"let raw/*x*/= Zeroizing::new("#;` contains the
         needle ZERO times as written, and stripping `/*x*/` produces it. The
         gate then reports a site present that does not exist.

    ⚠⚠ **AND THE REPLACEMENT CLAIM WAS FALSE TOO - THIRD RETRACTION OF THIS
    SENTENCE IN THREE ROUNDS (REVIEW-033a, REVIEW-033c, E-203).** B-25 narrowed
    it to *"a `//` or `/*` INSIDE a string literal strips more than it should,
    and THAT direction is safe."* ⚠ **There is no safe direction, because this
    function feeds TWO CONSUMERS WITH OPPOSITE POLARITY:**

      * `find_missing` wants a needle PRESENT. Stripping more can only report a
        site missing - safe.
      * `single_decode_findings` enforces `total != 1`, a **MAXIMUM**. Stripping
        more makes it EASIER to satisfy - **the unsafe direction.**

    **MEASURED (REVIEW-033a finding 5):** a real second decode written between
    `let _decoy = "/*";` and `let _decoy2 = "*/";` was swallowed whole, and
    `single_decode_findings` returned `[]`. The identical mutation without the
    two decoy literals is caught.

    ⚠ **A "safe direction" argument is only ever as good as the list of
    consumers, and the list grew after the argument was written.** B-24 added
    the second consumer; B-25 re-derived the argument from the first alone.

    **So string literals are now SKIPPED rather than argued about**, which
    closes both directions at once: the hiding attack above, and the raw-string
    SYNTHESIS in (2). Ordinary strings, raw strings with any number of hashes,
    byte strings, and backslash escapes are handled; controls for each sit under part
    6, and `what_part_6_does_not_say()` states what survives.
    """
    out, i, n = [], 0, len(text)
    depth = 0
    while i < n:
        ch = text[i]
        if depth:
            # ⚠ Depth, not a boolean. `/*` opens another level; only the `*/`
            # that returns depth to 0 ends the comment.
            if text.startswith("/*", i):
                depth += 1
                i += 2
            elif text.startswith("*/", i):
                depth -= 1
                i += 2
            else:
                out.append("\n" if ch == "\n" else " ")
                i += 1
        elif text.startswith("/*", i):
            depth += 1
            i += 2
        elif text.startswith("//", i):
            j = text.find("\n", i)
            if j < 0:
                break
            i = j
        else:
            # ⚠ A STRING LITERAL IS COPIED THROUGH VERBATIM, comment syntax and
            # all (REVIEW-033a finding 5, E-203). Skipping it is what stops a
            # `"/*"` decoy opening a comment that swallows a real second decode,
            # and what stops a raw string synthesizing a needle it does not
            # contain. Both directions, one mechanism.
            lit = _string_literal_at(text, i)
            if lit is not None:
                out.append(text[i:lit])
                i = lit
                continue
            out.append(ch)
            i += 1
    return "".join(out)

def find_missing(sites, source_override=None):
    """The ONE detector. Controls call this too, so a broken detector fails them."""
    missing = []
    for path, needle, why in sites:
        text = source_override if source_override is not None else open(path).read()
        if strip_line_comments(text).count(needle) != 1:
            missing.append((path, needle, why))
    return missing

B22_SITES = [
  ("signer/src/xrpl.rs", "let sk_bytes = sha512half_zeroizing(&[entropy]);",
   "the ed25519 private key - the digest IS the key"),
  # ⚠ Both closures end in the SAME call, so a bare-call needle matched TWICE and
  # part 5 reported it missing - the detector refusing an ambiguous needle, which
  # is the behaviour wanted. Each needle now carries the line that names its own
  # closure, so it says which site it pins.
  ("signer/src/xrpl.rs",
   "let mut m = Zeroizing::new(Vec::with_capacity(entropy.len() + 4));\n"
   "            m.extend_from_slice(entropy);\n"
   "            m.extend_from_slice(&(i as u32).to_be_bytes());\n"
   "            sha512half_zeroizing(&[&m[..]])",
   "the ROOT closure: heap preimage carrying the master seed, hashed into a wiping buffer"),
  ("signer/src/xrpl.rs",
   "let mut m = root_pub.clone();\n"
   "            m.extend_from_slice(&0u32.to_be_bytes());\n"
   "            m.extend_from_slice(&(i as u32).to_be_bytes());\n"
   "            sha512half_zeroizing(&[&m[..]])",
   "the INTERMEDIATE closure: public preimage, SECRET digest, no bare Copy temporary (REVIEW-030)"),
  ("signer/src/xrpl.rs", "let mut sum_bytes = Zeroizing::new(sum.to_bytes());",
   "the serialised secp256k1 ACCOUNT PRIVATE KEY"),
  ("signer/src/xrpl.rs", "sum_bytes.as_mut_slice().zeroize();",
   "the explicit wipe of that key after `from_bytes` copied it"),
  ("signer/src/xrpl.rs", "        sum.zeroize();",
   "the account private scalar itself - ruling condition 2 (REVIEW-030)"),
  ("signer/src/xrpl.rs", "        root.zeroize();",
   "the secp256k1 root scalar - ruling condition 2 (REVIEW-030)"),
  ("signer/src/xrpl.rs", "        intermediate.zeroize();",
   "the secp256k1 intermediate scalar - ruling condition 2 (REVIEW-030)"),
  ("signer/src/xrpl.rs", "let raw = Zeroizing::new(b58_decode(seed)?);",
   "the ed25519 master seed on the heap"),
  ("signer/src/xrpl.rs", "let entropy = Zeroizing::new(base58check_decode(seed, VER_FAMILY_SEED)?);",
   "the family-seed master seed on the heap"),
  ("signer/src/xrpl.rs", "let raw = Zeroizing::new(b58_decode(s)?);",
   "base58check_decode's own decoded buffer (REVIEW-030b)"),
  ("signer/src/xrpl.rs", "let mut bytes: Zeroizing<Vec<u8>> = Zeroizing::new(vec![0]);",
   "b58_decode's accumulator - reallocation residue is NAMED at the site (REVIEW-030b)"),
  # ⚠ `Zeroizing(entropy)` / `entropy.zeroize_source_copy()` is GONE, and its
  # absence is not a regression: B-24 made `decode_family_seed` return a wiping
  # type, so there is no bare `Copy` source to wipe. **The producer was fixed, so
  # the guard at the consumer became dead code.** The property it protected is
  # now pinned by the decoder's RETURN TYPE AND BODY, in PART 6 - not part 2,
  # which has no decoder entry at all because a decoder revert compiles clean
  # (E-196). ⚠ This comment said "which part 2 reverts" and contradicted the
  # comment 100 lines below it saying part 2 has no honest entry (REVIEW-032b).
  ("signer/src/keygen.rs", "sk_bytes.zeroize_source_copy();",
   "the Copy source `*sk.as_bytes()` left live (REVIEW-030b)"),
]

print("\nPart 5 - the B-22 derivation sites a type revert cannot reach")
print("  (comment-stripped; a commented-out production line does NOT satisfy a needle)")
missing = find_missing(B22_SITES)
for path, needle, why in B22_SITES:
    if (path, needle, why) in missing:
        print(f"  \u26a0 MISSING  {why}\n              expected in {path}: {needle!r}")
    else:
        print(f"  present   {why}")
bad += len(missing)

# ⚠ The controls run through `find_missing` itself - E-165, and REVIEW-030's
# finding that the previous pair tested nothing.
_fake = [("signer/src/xrpl.rs", "fn this_symbol_does_not_exist_anywhere()", "synthetic")]
if len(find_missing(_fake)) == 1:
    print("  CONTROL(-): an ABSENT site is reported missing by the real detector  OK")
else:
    print("  \u26a0 VOID: the detector did not report an absent site. Part 5 is blind.")
    bad += 1

if len(find_missing(B22_SITES[:1])) == 0:
    print("  CONTROL(+): a PRESENT site is reported present by the real detector  OK")
else:
    print("  \u26a0 VOID: the detector did not find a site that is in the tree.")
    bad += 1

_commented = "// " + B22_SITES[0][1]
if len(find_missing([B22_SITES[0]], source_override=_commented)) == 1:
    print("  CONTROL(comment): a COMMENTED-OUT site is reported missing  OK")
else:
    print("  \u26a0 VOID: a commented-out site satisfied its needle. Part 5 false-passes.")
    bad += 1

# Part 6 - the B-23 seed-lifetime sites checked at SOURCE
#
# ⚠⚠ **TWO DIFFERENT NUMBERS LIVE HERE AND THEY ARE NOT THE SAME NUMBER.** A
# first draft of this header said *"5 of 7"* while the list below held EIGHT
# needles - `CLAIMS.md` E-141's trap exactly, *a gate that reports a number is
# claiming what the number counts*, in the part written to avoid it. Both counts,
# separately:
#
#   * **SEVEN reverts were measured** by hand before any of this was written -
#     each applied, `cargo build --tests` re-run, then restored. **TWO broke**
#     and are in `REVERTS` above with their error code and the line they bite
#     at. **FIVE compiled clean**: `Zeroizing<T>` derefs to `T`, `with_capacity`
#     and `new` have the same type, a clone and a move both type-check, and
#     swapping a parse strategy or a decode call changes no signature.
#   * **The needles pinned below are counted by `len(B23_SITES)`, never by hand**
#     - a prose count here said EIGHT over nine (REVIEW-032b, E-201). Those five,
#     plus the sites that were
#     never separate reverts: the deserialiser body (the other half of a site
#     whose type IS in `REVERTS`), and the two `onboarding.rs` prompt idioms,
#     which are copies of the `holder.rs` one and are pinned for E-168's reason
#     rather than a measured one.
#
# E-179 said measure before writing a revert into a gate; this is that
# measurement, and the count above is what it actually measured.
#
# ⚠ **The single-decode check - which is `single_decode_findings`, NOT a needle;
# it was retired as one by B-24 and this comment still called it "Site 7"
# (REVIEW-032b) - has a TEST as well, and the test does NOT
# guard this property.** `the_two_seed_dispatches_agree` catches the two
# dispatches DRIFTING apart; reverting to `from_family_seed` is behaviourally
# identical and passes it. **A test named near a property is not a test of it**
# (E-164, three instances). The source check is what pins the single decode.
#
# ⚠ **Same NAMED-SET narrowing as part 5.** These are the sites B-23 names. A
# seed-bearing site added later and not listed here is invisible to this.
def _fn_body(text, name):
    """One function's body, comment-stripped, or None.

    ⚠ **The opener and the terminator use the SAME pattern**, and that is the
    point: they disagreed once. This matched `fn name(` / `pub fn name(`
    exactly, so `fn name (` with a space was unlocatable and
    `single_decode_findings`' helper arm SILENTLY SKIPPED it - a helper the
    sweep had already found by name (REVIEW-033s, E-203). ⚠ **A body it cannot
    extract is now the CALLER's problem to report, not this function's to
    swallow** - see the `is None` arms there.
    """
    t = strip_line_comments(text)
    m = re.search(r"\n(?:pub )?fn %s\s*\(" % re.escape(name), t)
    if not m:
        return None
    i = m.start()
    nxt = re.search(r"\n(?:pub )?fn [a-z_0-9]+\s*\(", t[i + 1:])
    return t[i:i + 1 + nxt.start()] if nxt else t[i:]

def derive_raw_body(text):
    """`keygen::derive_raw`'s body, comment-stripped, or None if not locatable."""
    t = strip_line_comments(text)
    i = t.find("fn derive_raw(")
    if i < 0:
        return None
    j = t.find("\nfn ", i + 1)
    k = t.find("\npub fn ", i + 1)
    ends = [x for x in (j, k) if x > 0]
    return t[i:min(ends)] if ends else t[i:]

def single_decode_findings(text=None):
    """B-24: `derive_raw` decodes the seed ONCE. Scoped, both arms, no escape hatch.

    ⚠ Returns a list of problems, so the CONTROLS can drive the same function the
    real check drives (E-165, E-182). Empty list means the property holds.

    ⚠⚠ **THE FIRST VERSION COUNTED ONE SPELLING AND MISSED FOUR MUTATIONS
    (REVIEW-032b, REVIEW-032s, REVIEW-032a - measured, all four returned `[]`):**
    a second decode through `decode_ed25519_seed` INSIDE `derive_raw`; a helper
    outside the slice that `derive_raw` calls; and `from_family_seed` added to
    either public wrapper. ⚠ **Its controls replayed REVIEW-031b's exact
    mutation, so they proved it caught the LAST attack.**

    It now counts **every seed decoder by name** rather than one spelling, and
    covers the two public wrappers as well as `derive_raw`.

    ⚠⚠ **AND ITS SECOND VERSION MISSED FOUR MORE, ALL MEASURED (REVIEW-033b,
    REVIEW-033a, REVIEW-033s; E-203):** a `pub fn` helper, a helper written
    `fn name (` with a space, a closure bound once and CALLED TWICE, and the
    same decode inside a `for` loop. ⚠ **The helper sweep matched `\nfn ` while
    `_fn_body` ten lines above it handled BOTH spellings** - the fix had been
    written against the previous round's finding list rather than against the
    property. **Third round running in which that is the reason.**

    ⚠⚠ **WHAT IT STILL CANNOT SEE, and the first item is now a KNOWN GAP rather
    than an unknown one:**

      1. **This counts CALL SITES, NOT EXECUTIONS.** One lexical occurrence
         reached twice - a closure called twice, a decode in a loop, a helper
         invoked from two arms - satisfies `total == 1`. ⚠ **A lexical check
         cannot close this**; it would need control-flow analysis. It is stated
         here, in `what_part_6_does_not_say()`, and the two shapes are carried
         as ACKNOWLEDGED-UNCAUGHT controls below so the gap is visible in the
         gate's own output rather than only in this docstring.
      2. A decode reached through a function whose name is not in `DECODERS`.

    Scoping is lexical; this is a NAMED SET like every other part (E-142).
    """
    src = open("signer/src/keygen.rs").read() if text is None else text
    body = derive_raw_body(src)
    if body is None:
        return ["derive_raw is not locatable - the check is VOID, not passing"]
    bad = []
    if "ed25519_from_entropy(&seed[..])" not in body:
        bad.append("the Ed25519 arm does not derive from the already-decoded entropy")
    if "from_entropy(&seed[..])" not in body.replace("ed25519_from_entropy(&seed[..])", ""):
        bad.append("the secp256k1 arm does not derive from the already-decoded entropy")

    # ⚠ EVERY way this crate turns a seed string into entropy, not just one.
    DECODERS = ("decode_family_seed", "decode_ed25519_seed", "from_family_seed")
    total = sum(body.count(d) for d in DECODERS)
    if total != 1:
        bad.append(f"derive_raw reaches a seed decoder {total} times, not exactly 1 "
                   f"(counting {', '.join(DECODERS)})")

    # ⚠ The wrappers are OUTSIDE derive_raw's slice, and REVIEW-032b showed a
    # decode added there is invisible to a derive_raw-scoped check.
    for fn in ("derive_from_master_seed_with_account", "derive_from_master_seed"):
        w = _fn_body(src, fn)
        if w is None:
            bad.append(f"{fn} is not locatable - the check is VOID, not passing")
        elif any(d in w for d in DECODERS):
            bad.append(f"{fn} reaches a seed decoder directly; the decode belongs in derive_raw")

    # ⚠ A helper outside derive_raw that derive_raw calls (REVIEW-032b's mutation).
    stripped = strip_line_comments(src)
    # ⚠ `pub fn` AND `fn`, and any whitespace before the paren. The previous
    # spelling matched `\nfn ` alone, so `pub fn duplicate_decode(` and
    # `fn duplicate_decode (` both walked past it - MEASURED (REVIEW-033b,
    # REVIEW-033s). `_fn_body`, directly above, has handled both all along;
    # the two disagreed and only the looser one was a gate.
    for m in re.finditer(r"\n(?:pub )?fn ([a-z_0-9]+)\s*\(", stripped):
        name = m.group(1)
        if name in ("derive_raw", "finish"):
            continue
        h = _fn_body(src, name)
        if h is None and (name + "(") in body:
            bad.append(f"derive_raw calls `{name}`, whose body is not locatable - "
                       f"the helper check is VOID for it, not passing")
            continue
        if h and any(d in h for d in DECODERS) and (name + "(") in body:
            bad.append(f"derive_raw calls `{name}`, which reaches a seed decoder - "
                       f"a second decode hidden behind a helper")
    return bad


B23_SITES = [
  # ⚠ **These two are here because a COMPLETE revert of both decoders compiles
  # with ZERO errors** - measured, after a comment had already claimed otherwise
  # (E-196). Reverting one alone breaks internally and proves nothing about
  # consumers, so part 2 has no honest entry for them.
  # ⚠⚠ **THE SIGNATURE IS NOT ENOUGH, AND THAT WAS A MEASURED FALSE PASS
  # (REVIEW-032b).** These two pinned only the return TYPE, so the wipe could be
  # undone in the BODY - `let mut out = [0u8; 16]; ... Ok(Zeroizing::new(out))` -
  # while both needles still counted 1. That restores E-178 exactly: the bare
  # `out` is a `Copy` source that stays live. **It is also the single most likely
  # regression**, being the idiom this project hit four times.
  #
  # ⚠ Each needle now spans signature AND construction AND return, so the buffer
  # has to BE the wrapper from the start. `CLAIMS.md` B-25.
  ("signer/src/xrpl.rs",
   "pub fn decode_family_seed(seed: &str) -> R<(Zeroizing<[u8; 16]>, KeyAlgorithm)> {",
   "the family-seed decoder returns a WIPING array - fixes every consumer at once"),
  ("signer/src/xrpl.rs",
   "let mut out = Zeroizing::new([0u8; 16]);\n"
   "    out.copy_from_slice(&entropy);\n"
   "    Ok((out, KeyAlgorithm::Secp256k1))",
   "the family-seed decoder BUILDS INTO the wiping buffer - no bare `out` (REVIEW-032b)"),
  ("signer/src/xrpl.rs",
   "pub fn decode_ed25519_seed(seed: &str) -> R<Zeroizing<[u8; 16]>> {",
   "the ed25519 decoder returns a WIPING array (REVIEW-031b, and REVIEW-030b before it)"),
  ("signer/src/xrpl.rs",
   "let mut out = Zeroizing::new([0u8; 16]);\n"
   "    out.copy_from_slice(&body[3..]);\n"
   "    Ok(out)",
   "the ed25519 decoder BUILDS INTO the wiping buffer - no bare `out` (REVIEW-032b)"),
  # ⚠ B-25: the derived ElGamal secret itself. `Scalar` was `Copy` with no `Drop`
  # and a comment called it a foreign type (E-200). This pins the producer fix.
  ("signer/src/scalar.rs", "impl zeroize::ZeroizeOnDrop for Scalar {}",
   "`Scalar` - sk_A, r, rho and every blinding factor - wipes on drop (REVIEW-032b)"),
  ("signer/src/holder.rs",
   "let raw = Zeroizing::new(",
   "the whole profile JSON from `read_to_string` - seed in plaintext"),
  ("signer/src/holder.rs",
   "let keys: Result<std::collections::BTreeMap<String, serde::de::IgnoredAny>, _> =",
   "the stale-field check reads NAMES: the second parse builds no seed `String` at all"),
  ("signer/src/holder.rs",
   "String::deserialize(d).map(Zeroizing::new)",
   "the seed is wrapped INSIDE the deserialiser, so no caller can bind it bare"),
  ("signer/src/holder.rs",
   "            p.account_seed\n        };",
   "the file path MOVES the seed out of the profile rather than cloning it"),
  ("signer/src/onboarding.rs",
   "let mut line = Zeroizing::new(String::with_capacity(SEED_LINE_RESERVE));",
   "`read_line` does not grow, so no earlier buffer is freed unwiped"),
  ("signer/src/onboarding.rs",
   "let seed = Zeroizing::new(typed.trim().to_string());\n    drop(typed);",
   "the RECOVERY prompt: the line as typed AND the trimmed copy both wipe"),
  ("signer/src/onboarding.rs",
   "let seed = Zeroizing::new(typed_seed.trim().to_string());\n    drop(typed_seed);",
   "the DERIVE prompt: same pair. ⚠ Not in REVIEW-029c's list - E-168, an idiom "
   "has copies (three of them)"),
  # ⚠⚠ **THE SINGLE-DECODE NEEDLE USED TO PIN ONLY THE ED25519 ARM, AND THAT WAS
  # A VERIFIED FALSE PASS (REVIEW-031b).** Reverting **only** the secp256k1 arm
  # to `from_family_seed` restored the double decode for secp256k1 and:
  # compiled with 0 errors, passed `the_two_seed_dispatches_agree` (the account
  # ID is unchanged), left part 6 reporting "present", and **passed the whole
  # gate.** It is replaced by `single_decode_findings()` below, which is scoped
  # to `derive_raw`'s body and requires BOTH arms AND the absence of any
  # `from_family_seed` call inside it.
]

# ⚠⚠ **THIS HEADER HAS NOW MISCOUNTED TWICE, AND THE SECOND TIME WAS AFTER IT WAS
# FIXED FOR THE FIRST.** Draft one said "5 of 7" over EIGHT needles (E-189);
# B-24 then retired a needle and added the scoped single-decode check, and the
# header said "7 sites" over EIGHT printed lines. ⚠ **Every number here is now
# DERIVED from the thing it counts** - `len(B23_SITES)` plus the scoped check -
# so the header cannot drift from the list again. **E-141's sentence, ninth
# instance, and the only fix that ever held was arithmetic instead of prose.**
_p6_total = len(B23_SITES) + 1  # +1: the scoped single-decode check below
print(f"\nPart 6 - {_p6_total} B-23 seed-lifetime checks at SOURCE "
      f"({len(B23_SITES)} needles + 1 scoped check; of 7 reverts measured, 5 did not break)")
print("  (comment-stripped, same detector as part 5)")
missing = find_missing(B23_SITES)
for path, needle, why in B23_SITES:
    if (path, needle, why) in missing:
        print(f"  \u26a0 MISSING  {why}\n              expected in {path}: {needle!r}")
    else:
        print(f"  present   {why}")
bad += len(missing)

# ---- the scoped single-decode check (replaces a needle that pinned ONE arm) --
_sd = single_decode_findings()
if _sd:
    for _p in _sd:
        print(f"  \u26a0 MISSING  single decode in derive_raw: {_p}")
    bad += len(_sd)
else:
    print("  present   derive_raw decodes the seed ONCE - both arms, no `from_family_seed`")

# ⚠⚠ **CONTROLS ARE COUNTED BY THE THING THAT RUNS THEM, NEVER BY HAND.**
# `CLAUDE.md`, `CLAIMS.md` B-25 and the handover all said part 6 had **ten**
# controls; it printed **twelve** (REVIEW-033s, REVIEW-033b; E-203). The
# THIRTEEN checks were right because they were derived from `len(B23_SITES)`,
# and the ten were wrong because they were typed. ⚠ **The miscount was a LOOP:**
# reading the file counts nine `print("  CONTROL` sites, four of which are one
# `print` inside a loop over four mutations. **A number derived from source
# STRUCTURE is not derived from BEHAVIOUR.** `_p6_controls` below is incremented
# by the helper every control actually runs through.
_p6_controls = 0

def _p6_control(label, passed, void_msg):
    """Run one control, count it, and report. The ONLY way to add a control."""
    global _p6_controls, bad
    _p6_controls += 1
    if passed:
        print(f"  CONTROL {label:62} OK")
    else:
        print(f"  \u26a0 VOID: {void_msg}")
        bad += 1

_k = open("signer/src/keygen.rs").read()

def _mut(*pairs, base=None):
    """Apply replacements; returns None if any did not apply, so the caller VOIDs."""
    t = base if base is not None else _k
    for old, new, *cnt in pairs:
        if old not in t:
            return None
        t = t.replace(old, new, cnt[0] if cnt else -1)
    return t

_ACCOUNT = "    let account = match algo {"
_HELPER = "fn duplicate_decode(s: &str) -> bool { xrpl::AccountKey::from_family_seed(s).is_ok() }\n"

# Every mutation any REVIEW round has measured as getting past this check, plus
# the two arm-reverts that were the original controls. ⚠ **Each drives the REAL
# `single_decode_findings`, never a re-implementation** (E-165, E-182).
_MUTS = [
  ("secp-only revert (REVIEW-031b's exact mutation)",
   _mut(("xrpl::KeyAlgorithm::Secp256k1 => xrpl::AccountKey::from_entropy(&seed[..])",
         "xrpl::KeyAlgorithm::Secp256k1 => xrpl::AccountKey::from_family_seed(family_seed)"))),
  ("ed25519-only revert (the other arm)",
   _mut(("xrpl::KeyAlgorithm::Ed25519 => xrpl::AccountKey::ed25519_from_entropy(&seed[..])",
         "xrpl::KeyAlgorithm::Ed25519 => xrpl::AccountKey::from_family_seed(family_seed)"))),
  ("2nd decode via the OTHER decoder (REVIEW-032s)",
   _mut((_ACCOUNT, "    let _again = xrpl::decode_ed25519_seed(family_seed);\n" + _ACCOUNT))),
  ("decode behind a HELPER derive_raw calls (REVIEW-032b)",
   _mut(("fn derive_raw(", _HELPER + "fn derive_raw(", 1),
        (_ACCOUNT, "    let _h = duplicate_decode(family_seed);\n" + _ACCOUNT))),
  ("the same helper written `pub fn` (REVIEW-033b)",
   _mut(("fn derive_raw(", "pub " + _HELPER + "fn derive_raw(", 1),
        (_ACCOUNT, "    let _h = duplicate_decode(family_seed);\n" + _ACCOUNT))),
  ("the same helper written `fn name (` (REVIEW-033s)",
   _mut(("fn derive_raw(", _HELPER.replace("duplicate_decode(", "duplicate_decode (") + "fn derive_raw(", 1),
        (_ACCOUNT, "    let _h = duplicate_decode(family_seed);\n" + _ACCOUNT))),
  ("decode added to derive_from_master_seed (REVIEW-032a)",
   _mut(("    let (algo, account, _ikm_len, _prk, okm) = derive_raw(family_seed, expected_account_id)?;",
         "    let _dup = xrpl::AccountKey::from_family_seed(family_seed);\n"
         "    let (algo, account, _ikm_len, _prk, okm) = derive_raw(family_seed, expected_account_id)?;"))),
  ("decode added to derive_from_master_seed_with_account (REVIEW-032a)",
   _mut(("    let (algo, account, _ikm_len, _prk, okm) = derive_raw(family_seed, None)?;",
         "    let _dup = xrpl::AccountKey::from_family_seed(family_seed);\n"
         "    let (algo, account, _ikm_len, _prk, okm) = derive_raw(family_seed, None)?;"))),
  # ⚠ REVIEW-033a finding 5: a real second decode swallowed by two string
  # literals containing comment syntax. The stripper is now literal-aware.
  ("2nd decode hidden between \"/*\" and \"*/\" literals (REVIEW-033a)",
   _mut((_ACCOUNT,
         '    let _decoy = "/*";\n'
         "    let _again = xrpl::decode_ed25519_seed(family_seed);\n"
         '    let _decoy2 = "*/";\n' + _ACCOUNT))),
]
for _why, _m in _MUTS:
    if _m is None:
        _p6_control(_why, False, f"the mutation did not apply - {_why}. The check is VOID, not passing.")
    else:
        _p6_control(_why, bool(single_decode_findings(_m)), f"UNCAUGHT - {_why}")

_p6_control("the UNMODIFIED tree passes the same function",
            not single_decode_findings(_k),
            "the unmodified tree fails its own single-decode check.")

# ⚠⚠ **CONTROLS FOR WHAT THIS CHECK CANNOT DO, RUN IN THE OPPOSITE DIRECTION.**
# `single_decode_findings` counts CALL SITES, not EXECUTIONS, so one lexical
# occurrence reached twice satisfies it (REVIEW-033b finding 2). A lexical check
# cannot close that. **The gap is therefore ASSERTED rather than hidden**: these
# must stay uncaught, and if one ever IS caught the gate FAILS - not because the
# code got worse but because `what_part_6_does_not_say()` would then be a false
# sentence, and an out-of-date disclosure is this repository's most-repeated
# defect (E-141, E-189, E-199, E-201, E-203).
_KNOWN_UNCAUGHT = [
  ("a closure bound ONCE and CALLED TWICE (REVIEW-033b)",
   _mut(("""    let (seed, algo) =
        xrpl::decode_family_seed(family_seed).map_err(|e| KeygenError::Seed(e.to_string()))?;""",
         """    let decode = || xrpl::decode_family_seed(family_seed)
        .map_err(|e| KeygenError::Seed(e.to_string()));
    let _first = decode()?;
    let (seed, algo) = decode()?;"""))),
  ("one decode inside a `for` loop (REVIEW-033s)",
   _mut(("""    let (seed, algo) =
        xrpl::decode_family_seed(family_seed).map_err(|e| KeygenError::Seed(e.to_string()))?;""",
         """    let mut tmp = None;
    for _ in 0..2 {
        tmp = Some(xrpl::decode_family_seed(family_seed)
            .map_err(|e| KeygenError::Seed(e.to_string()))?);
    }
    let (seed, algo) = tmp.unwrap();"""))),
]
for _why, _m in _KNOWN_UNCAUGHT:
    if _m is None:
        _p6_control(f"[known gap] {_why}", False,
                    f"the mutation did not apply - {_why}. The disclosure is unverified.")
    else:
        _p6_control(f"[known gap, still uncaught] {_why}",
                    not single_decode_findings(_m),
                    f"NOW CAUGHT: {_why}. That is an IMPROVEMENT and a STALE DISCLOSURE - "
                    f"update `what_part_6_does_not_say()` and this list, then re-run.")

# Detector controls, through the SAME function the real check uses - E-165, E-182.
_p6_control("an ABSENT site is reported missing by the real detector",
            len(find_missing([("signer/src/holder.rs", "fn no_such_b23_symbol_exists()", "synthetic")])) == 1,
            "the detector did not report an absent site. Part 6 is blind.")
_p6_control("a PRESENT site is reported present by the real detector",
            len(find_missing(B23_SITES[:1])) == 0,
            "the detector did not find a site that is in the tree.")

# ⚠ Every way a needle can be neutralised that this gate has ever been shown to
# miss. The last is B-26's: a raw string must NOT synthesize a needle.
for _label, _src, _want, _void in [
    ("a NESTED-comment site is reported missing",
     "/* /* */ " + B23_SITES[0][1] + " */", 1,
     "a nested block comment satisfied its needle (REVIEW-032a/s)."),
    ("a BLOCK-COMMENTED site is reported missing",
     "/* " + B23_SITES[0][1] + " */", 1,
     "a /* */ comment satisfied its needle. REVIEW-031b's false pass is back."),
    ("a COMMENTED-OUT site is reported missing",
     "// " + B23_SITES[0][1], 1,
     "a commented-out site satisfied its needle. Part 6 false-passes."),
    ("a RAW STRING does not SYNTHESIZE a needle",
     'const DECOY: &str = r#"' + B23_SITES[0][1].replace("pub fn", "pub/*x*/fn", 1) + '"#;', 1,
     "stripping a comment INSIDE a raw string manufactured a needle for a site "
     "that is not in the tree (REVIEW-032b's second case, E-201)."),
]:
    _p6_control(_label, len(find_missing([B23_SITES[0]], source_override=_src)) == _want, _void)


def what_part_6_does_not_say():
    """⚠ **The block `strip_line_comments` cites, which did not exist until B-26.**

    Its docstring said the string-literal cases were *"named in part 6's own
    'what this does not say' block rather than argued away"*. **There was no such
    block** - `grep` found the citation and nothing it pointed at, and the
    residual was therefore disclosed NOWHERE (REVIEW-033s finding 3, E-203).
    A citation to a section that does not exist reads exactly like a disclosure.

    What part 6 does NOT establish, in the order it will bite:

      1. **Call sites are not executions.** `single_decode_findings` requires
         exactly one lexical decoder occurrence inside `derive_raw`. One
         occurrence REACHED TWICE - a closure called twice, a decode in a loop -
         satisfies it. Both shapes are carried as asserted-uncaught controls
         above, so the gap is in the gate's OUTPUT, not only in this docstring.
      2. **The set is NAMED.** A seed-bearing site added later and not listed in
         `B23_SITES` is invisible (E-142, REVIEW-029a finding 4).
      3. **A decoder not in `DECODERS`** is not counted, by name.
      4. **Not a Rust lexer.** String literals are now skipped, so they neither
         hide code nor synthesize needles - but nested raw-string edge cases and
         `//` inside a block comment's own text are handled by construction
         rather than by a grammar, and no claim is made beyond the controls.
      5. **A source pin is not a compile-time falsifier.** Five of seven B-23
         reverts compile clean (E-188); that is WHY these are source checks, and
         it is also their limit.
    """


print("\n  What part 6 does NOT say:")
for _line in (what_part_6_does_not_say.__doc__ or "").splitlines():
    _t = _line.strip()
    if _t.startswith(("1.", "2.", "3.", "4.", "5.")):
        print(f"    {_t}")

print("\n" + "-" * 106)
if bad:
    print(f"FAIL: {bad} probe(s) or revert(s) did not land as declared.")
else:
    print(f"PASS: {len(PROBES)} feature probes, {len(REVERTS)} reverts, the known-spelling")
    print(f"      call-site regression check, the live-prose scan, {len(B22_SITES)} B-22")
    print(f"      derivation sites and {_p6_total} B-23 seed-lifetime checks all landed as")
    print(f"      declared, under {_p6_controls} part-6 controls - a count INCREMENTED BY THE")
    print(f"      HELPER THAT RUNS THEM, never typed (E-203) - each running through the same")
    print(f"      detector the real check uses.")
    print("\u26a0 Part 5's guarantee is over a NAMED SET of sites, NOT over the crate's whole")
    print("  secret-bearing surface. A derivation site added later and not listed there is")
    print("  invisible to it - REVIEW-029a finding 4, and the same narrowing E-142 forced.")
print("⚠ '(bound)' means the `ZeroizeOnDrop` bound refused it; '(type)' means an incidental")
print("  type mismatch did. Both break the build; only the first is a check on the PROPERTY.")
print("⚠ ⚠ **B-19's own claim is NOT in the revert list, because it is FALSE** — removing the")
print("  `zeroize` word from the ed25519-dalek line does NOT break the build. Part 1's")
print('  [\"std\"] probe is what establishes why. CLAIMS.md E-171.')
print("⚠ This says these types wipe on drop. It does NOT say the secret is unrecoverable —")
print("  see `sha512_zeroizing`'s three named residues, and P-5.")
# ⚠ Closing the window is half of E-257's fix, and it has to be SAID. `restore()`
# runs after every part and again through `atexit`, from file copies taken at
# start-up - NOT a `git checkout` - so uncommitted edits survive a run intact.
print("⚠ The working tree is restored: signer/ matches what it was when this started,")
print("  uncommitted edits included. `git status` is trustworthy again from here.")
sys.exit(1 if bad else 0)
