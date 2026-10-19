#!/usr/bin/env python3
"""break-secret-file-modes.py — B-29's falsifier: break the fix one site at a time.

    python3 tools/break-secret-file-modes.py

Baseline first: the unmodified tree must be green, or a failing mutation proves
nothing. Each mutation is applied, facility/tests/secret-file.test.ts is run, and
the file is restored with , so it REFUSES on a dirty tree rather
than discarding uncommitted work.

⚠ What a CAUGHT line does not say: that the test failed for the reason the
mutation names. M8 is caught by two behavioural tests only because the mutation
also stops the work directory being created; the lexical guard is what catches
it for the right reason. And M7, the facility state in run-facility.ts, is caught
ONLY by the lexical guard: that file runs the whole facility when imported, so no
behavioural test reaches its write.
"""
import os, re, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST = ["bun", "test", "facility/tests/secret-file.test.ts"]

def run():
    r = subprocess.run(TEST, cwd=REPO, capture_output=True, text=True, timeout=300)
    out = r.stdout + r.stderr
    fails = re.findall(r"^\(fail\) (.+?)(?: \[\d|$)", out, re.M)
    return r.returncode, fails

def restore(path):
    subprocess.run(["git", "checkout", "--", path], cwd=REPO, check=True)

MUTATIONS = [
    ("M1 helper: file created with no mode", "facility/src/secret-file.ts",
     'writeFileSync(tmp, data, { mode: SECRET_FILE_MODE, flag: "wx" });',
     'writeFileSync(tmp, data, { flag: "wx" });'),
    ("M2 helper: no chmod on an existing directory", "facility/src/secret-file.ts",
     "  chmodSync(dir, SECRET_DIR_MODE);\n", ""),
    ("M3 helper: no removal of a leftover tmp, and no wx", "facility/src/secret-file.ts",
     '  rmSync(tmp, { force: true });\n  writeFileSync(tmp, data, { mode: SECRET_FILE_MODE, flag: "wx" });',
     '  writeFileSync(tmp, data, { mode: SECRET_FILE_MODE });'),
    ("M4 helper: overwrite in place instead of rename", "facility/src/secret-file.ts",
     '  const tmp = `${path}.tmp`;\n  rmSync(tmp, { force: true });\n  writeFileSync(tmp, data, { mode: SECRET_FILE_MODE, flag: "wx" });\n  renameSync(tmp, path);',
     '  writeFileSync(path, data, { mode: SECRET_FILE_MODE });'),
    ("M5 helper: parent directory not made private", "facility/src/secret-file.ts",
     "  ensurePrivateDir(dirname(path));\n", '  require("node:fs").mkdirSync(dirname(path), { recursive: true });\n'),
    ("M6 book: the old bare write", "facility/src/book.ts",
     "    writeSecretFile(this.path, JSON.stringify(this.data, null, 2));",
     '    require("node:fs").writeFileSync(this.path, JSON.stringify(this.data, null, 2));'),
    ("M7 run-facility: the old bare write", "facility/run-facility.ts",
     "const save = () => writeSecretFile(STATE, JSON.stringify(state, null, 2));",
     'const save = () => require("node:fs").writeFileSync(STATE, JSON.stringify(state, null, 2));'),
    ("M8 signer: profile written with no mode", "facility/src/signer.ts",
     "    writeSecretFile(\n      profilePath,",
     '    require("node:fs").writeFileSync(\n      profilePath,'),
    ("M9 signer: profile not deleted once the socket exists", "facility/src/signer.ts",
     "    rmSync(profilePath, { force: true });\n", ""),
    ("M10 signer: stop() does not remove the profile", "facility/src/signer.ts",
     "    rmSync(this.profilePath, { force: true });\n", ""),
    ("M11 signer: profile written BEFORE the override refusal again", "facility/src/signer.ts",
     "    const inherited = process.env.WCONF_LEDGER_ENDPOINT;\n",
     "    writeSecretFile(`${opts.workDir}/profile.json`, JSON.stringify({ account_seed: profile.accountSeed }));\n    const inherited = process.env.WCONF_LEDGER_ENDPOINT;\n"),
]

def main():
    dirty = subprocess.run(["git", "status", "--short"], cwd=REPO, capture_output=True, text=True).stdout
    if dirty.strip():
        print("refusing: the tree is dirty, and every mutation is restored with git checkout"); sys.exit(2)
    rc, fails = run()
    print(f"BASELINE rc={rc} fails={fails}")
    if rc != 0:
        print("baseline not green; refusing to sweep"); sys.exit(2)
    uncaught = 0
    applied = 0
    for name, path, old, new in MUTATIONS:
        src = open(f"{REPO}/{path}").read()
        n = src.count(old)
        if n != 1:
            print(f"{name}: MUTATION DID NOT APPLY (needle count {n})"); continue
        applied += 1
        open(f"{REPO}/{path}", "w").write(src.replace(old, new))
        try:
            rc, fails = run()
        finally:
            restore(path)
        verdict = "CAUGHT" if rc != 0 else "PASSED (not caught)"
        uncaught += rc == 0
        print(f"{name}: {verdict} rc={rc} failing={fails}")
    clean = subprocess.run(["git", "status", "--short"], cwd=REPO, capture_output=True, text=True).stdout
    print("tree after sweep:", repr(clean))
    if applied != len(MUTATIONS) or uncaught or clean.strip():
        print(f"FAIL: {applied} of {len(MUTATIONS)} mutations applied, {uncaught} not caught"); sys.exit(1)
    print(f"PASS: all {applied} mutations applied and caught, and the tree is clean")

main()
