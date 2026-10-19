#!/usr/bin/env python3
"""
B-16 revert sweep — `REVIEW-024` §6 item 8: **revert each fix and watch its test
fail.**

⚠ **A revert that PASSES is a finding about the code, not a bad revert**, and one
did. Revert 8 — a successful all-zero entropy draw treated as an omission, which
is `REVIEW-018` §4a's error in the mirror direction and exactly what §6 item 3
exists to prevent — left the whole suite green. The test written for that item
drove `Hedge::FixedAux([0u8; 32])`, which never reaches `xrpl::fresh_aux`, the
function that decides `Some` vs `None`. **A test named for a property, one layer
away from where the property breaks**, is this project's most frequent defect.
Fixed by `store::next_entropy_draw_returns_for_test` and two tests that use it.

⚠ **A revert that does not COMPILE proves nothing** (`CLAIMS.md` E-108, twice) —
so this script distinguishes three outcomes and treats `no compile` as VOID, not
as success. It also refuses to run a revert whose pattern does not occur exactly
once, because a silently-applied-to-nothing patch is the same false pass.

⚠ **AND A NONZERO EXIT IS NOT "the test failed", which is what this script used
to accept.** `REVIEW-025`'s Codex leg: any runtime, harness, missing-fixture or
infrastructure failure also exits nonzero, and the script parsed the failing test
names and then never checked them. It now **requires at least one EXPECTED test
name to appear in the failure list**, and reports `WRONG-TEST` — not success —
when a mutation breaks something other than what it was aimed at. That is the
same false-pass shape the sweep exists to find, one level up.

⚠ It also used a fixed `/tmp` backup and had no `try`/`finally`, so an
interruption could leave the reviewed tree mutated. Both fixed.

⚠ **AND "an expected test failed" IS NOT "the mutation caused it" WITHOUT A
BASELINE**, which round two caught (`REVIEW-026`, Codex leg). If an expected test
were already failing — a stale fixture, a bad environment, a concurrent edit —
every mutation listing that test would be certified by a failure it did not
cause. The sweep now **runs the unmodified target first and requires ZERO
failures**, and then requires each mutation to produce a **NEWLY** failing
expected test.

⚠ **Four of the twelve were re-anchored on 2026-08-27 by B-21**, which wrapped
the signing helper's secret locals in `Zeroizing` and moved two `Sha512` updates
into one helper call. The mutations are unchanged; their anchor text moved. The
sweep reported **BAD PATTERN** for all four rather than quietly passing, which is
what `apply`'s exactly-once rule is for — a patch applied to nothing is the same
false pass as a nonzero exit taken for a failing test.

⚠ This is a sweep over a NAMED SET of **twelve** mutations — it said eleven while
listing twelve (`REVIEW-026`) — against **`cargo test --test hedged_signing`**,
which is one target and not the whole suite; it claimed the whole suite for one
commit. It says those twelve are caught. It does not say the construction has no
other failure mode.

Run from the repository root:  python3 tools/spike-b16-2026-08-27/revert-sweep.py
Exit 0 when every revert produced a failing test.
"""
import subprocess, sys, shutil, os, tempfile, atexit, signal
XRPL = 'signer/src/xrpl.rs'
STORE = 'signer/src/store.rs'
FILES = [XRPL, STORE]
# ⚠ A unique backup per run, not a fixed /tmp path two runs would share.
_bakdir = tempfile.mkdtemp(prefix='wconf-revert-sweep-')
_baks = {}
for _f in FILES:
    _b = os.path.join(_bakdir, os.path.basename(_f))
    shutil.copy(_f, _b)
    _baks[_f] = _b

def restore():
    for f, b in _baks.items():
        shutil.copy(b, f)

# ⚠ Restore on ANY exit — exception, Ctrl-C, SIGTERM. The previous version left
# the reviewed working tree mutated if it died mid-sweep.
atexit.register(restore)
for _sig in (signal.SIGINT, signal.SIGTERM):
    signal.signal(_sig, lambda *_: (restore(), sys.exit(130)))

def apply(old, new):
    """Apply to whichever tracked file holds the pattern exactly once."""
    hits = [(f, open(f).read()) for f in FILES]
    hits = [(f, t) for f, t in hits if t.count(old) == 1]
    if len(hits) != 1:
        counts = {f: open(f).read().count(old) for f in FILES}
        return f"BAD REVERT: pattern occurs {counts}; must be exactly once in exactly one file"
    f, t = hits[0]
    open(f, 'w').write(t.replace(old, new))
    return None

def run(expected, baseline=frozenset()):
    """Run the whole `hedged_signing` TARGET and require a NEWLY failing expected test.

    ⚠ The whole target, not a positional filter: a filter can silently match
    nothing, and then "nonzero exit" means "no tests ran", not "the test failed".
    Running the target also catches a mutation that breaks something the revert's
    author did not anticipate — which is information, not noise.

    ⚠ `baseline` is the set of tests already failing BEFORE any mutation. It must
    be empty for the sweep to mean anything, and `establish_baseline` enforces
    that — but it is threaded through here so the "newly failing" arithmetic is
    explicit rather than assumed.
    """
    r = subprocess.run(['cargo', 'test', '--test', 'hedged_signing'],
                       cwd='signer', capture_output=True, text=True)
    out = r.stdout + r.stderr
    if 'error[E' in out or 'error: could not compile' in out:
        return 'DID-NOT-COMPILE', [], out
    failed = sorted({l.split()[1] for l in out.splitlines()
                     if l.startswith('test ') and l.rstrip().endswith('FAILED')})
    if r.returncode == 0:
        return 'PASSED', failed, out
    if not failed:
        # Nonzero, but no named test failed: a harness or infrastructure error.
        return 'NO-TEST-FAILED', failed, out
    newly = set(failed) - set(baseline)
    if not (newly & set(expected)):
        return 'WRONG-TEST', failed, out
    return 'FAILED', failed, out


def establish_baseline():
    """⚠ Prove the UNMODIFIED target is green before believing any mutation.

    Without this the sweep certifies a mutation whenever an expected test is in
    the failure set — including when that test was already failing for a reason
    the mutation had nothing to do with. `REVIEW-026`, Codex leg: *"the script
    never first proves the unmodified target passes."*
    """
    restore()
    r = subprocess.run(['cargo', 'test', '--test', 'hedged_signing'],
                       cwd='signer', capture_output=True, text=True)
    out = r.stdout + r.stderr
    if 'error[E' in out or 'error: could not compile' in out:
        return None, 'the unmodified target does not COMPILE', out
    failed = sorted({l.split()[1] for l in out.splitlines()
                     if l.startswith('test ') and l.rstrip().endswith('FAILED')})
    if r.returncode != 0 or failed:
        return None, f'the unmodified target is NOT GREEN: {failed or "nonzero exit, no named failure"}', out
    return frozenset(), None, out

REVERTS = [
  ("1. The mask is never applied (pure RFC 8032 again)",
   "                if let Some(aux) = aux {",
   "                if let Some(aux) = aux.filter(|_| false) {",
   ["zero_aux_is_hedged_not_a_fallback", "two_fixed_aux_values_give_two_nonces",
    "the_default_ed25519_path_does_not_repeat_itself", "the_construction_matches_a_second_model"]),

  ("2. The mask lands on the SCALAR instead of the nonce prefix",
   "                    for (b, m) in esk.hash_prefix.iter_mut().zip(mask.iter()) {\n                        *b ^= *m;\n                    }",
   "                    let mut sb = esk.scalar.to_bytes();\n                    for (b, m) in sb.iter_mut().zip(mask.iter()) { *b ^= *m; }\n                    sb[31] &= 0x0f;\n                    esk.scalar = ed25519_dalek::hazmat::ExpandedSecretKey::from_slice(&[&sb[..], &sb[..], &[0u8;0][..]].concat()[..64]).unwrap().scalar;",
   ["both_modes_publish_and_verify_under_the_same_key", "every_signature_verifies_under_the_seed_derived_published_key"]),

  ("3. One byte of the DST changed",
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1\\0";',
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v2\\0";',
   ["the_construction_matches_a_second_model"]),

  ("4. The trailing NUL dropped from the DST",
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1\\0";',
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1 ";',
   ["the_construction_matches_a_second_model"]),

  # ⚠ Re-anchored 2026-08-27 by **B-21**, which replaced two `Sha512` updates
  # with one `sha512_zeroizing(&[DST, aux])` call. The mutation is unchanged —
  # DST and aux in the other order — but its anchor text moved, and the sweep
  # reported BAD PATTERN rather than passing, which is the whole point of
  # refusing a pattern that does not occur exactly once.
  ("5. DST and aux concatenated in the other order",
   "sha512_zeroizing(&[ED25519_NONCE_HEDGE_DST, &aux[..]])",
   "sha512_zeroizing(&[&aux[..], &ED25519_NONCE_HEDGE_DST[..]])",
   ["the_construction_matches_a_second_model"]),

  ("6. The mask taken from the SECOND half of the SHA-512 output",
   "                    for (b, m) in esk.hash_prefix.iter_mut().zip(mask.iter()) {",
   "                    for (b, m) in esk.hash_prefix.iter_mut().zip(mask[32..].iter()) {",
   ["the_construction_matches_a_second_model"]),

  ("7. A reported entropy failure masks with zeros instead of omitting the mask",
   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => Some(b),\n        Err(_) => None,\n    }",
   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => Some(b),\n        Err(_) => Some(Zeroizing::new([0u8; 32])),\n    }",
   ["ed25519_entropy_failure_degrades_to_rfc_8032", "entropy_failure_degrades_to_the_standard_construction"]),

  ("8. A successful ZERO draw treated as an omission (B-14's mirror error)",
   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => Some(b),\n        Err(_) => None,\n    }",
   "    match crate::store::getrandom(&mut b[..]) {\n        Ok(()) => if *b == [0u8; 32] { None } else { Some(b) },\n        Err(_) => None,\n    }",
   ["zero_aux_is_hedged_not_a_fallback", "a_successful_all_zero_draw_still_hedges",
    "a_successful_all_zero_draw_still_hedges_secp256k1"]),

  ("9. The message dropped from the nonce preimage (nonce reuse across messages)",
   "                Ok(raw_sign::<Sha512>(&esk, message, &vk).to_bytes().to_vec())",
   "                let fixed: &[u8] = b\"\";\n                let _ = message;\n                Ok(raw_sign::<Sha512>(&esk, fixed, &vk).to_bytes().to_vec())",
   ["one_aux_over_two_messages_does_not_reuse_the_nonce", "the_construction_matches_a_second_model"]),

  ("10. A caller-visible verifying key substituted (the hazmat attack shape)",
   "                let vk = VerifyingKey::from(&esk);",
   "                let vk = VerifyingKey::from(&ExpandedSecretKey::from_slice(&Sha512::digest([9u8; 32])).unwrap());",
   ["both_modes_publish_and_verify_under_the_same_key", "every_signature_verifies_under_the_seed_derived_published_key"]),

  ("12. The DST constant edited — the_dst_is_the_ruled_bytes must catch it ALONE",
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1\\0";',
   'pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v9\\0";',
   ["the_dst_is_the_ruled_bytes"]),

  # ⚠ Re-anchored 2026-08-27 by **B-21**. `h` is a `Zeroizing<[u8; 64]>` and
  # `from_slice` takes `&h[..]`; the mutation is the same stray flip.
  ("11. The unmasked arm no longer RFC 8032 (a stray mask on the no-mask path)",
   "                let mut esk = ExpandedSecretKey::from_slice(&h[..])",
   "                let mut h = h; h[63] ^= 1; let mut esk = ExpandedSecretKey::from_slice(&h[..])",
   ["the_unmasked_arm_is_byte_identical_to_the_crates_own_rfc_8032",
    "ed25519_entropy_failure_degrades_to_rfc_8032",
    "the_construction_matches_a_second_model"]),
]

print("baseline: running the unmodified target ...")
BASELINE, berr, bout = establish_baseline()
if berr is not None:
    print("  " + "\n  ".join(bout.splitlines()[-14:]))
    print(f"\nVOID, not passing: {berr}")
    print("  A sweep whose baseline is red certifies mutations by failures they did not")
    print("  cause. REVIEW-026, Codex leg. Fix the tree first; this run establishes nothing.")
    sys.exit(1)
print("  green, 0 failures. Every failure below is one the mutation CAUSED.\n")

print(f"{'#':<3} {'result':<16} revert")
print("-" * 100)
bad = 0
for name, old, new, tests in REVERTS:
    restore()
    err = apply(old, new)
    if err:
        print(f"    {'BAD PATTERN':<16} {name}\n      {err}")
        bad += 1
        continue
    verdict, failed, out = run(tests, BASELINE)
    mark = {
        'FAILED': 'test failed  OK',
        'PASSED': 'PASSED  <-- FINDING',
        'DID-NOT-COMPILE': 'no compile  VOID',
        'NO-TEST-FAILED': 'no test failed  VOID',
        'WRONG-TEST': 'WRONG TEST  <-- FINDING',
    }[verdict]
    print(f"    {mark:<24} {name}")
    print(f"      expected among: {', '.join(tests)}")
    print(f"      actually failed: {', '.join(failed) or '(none named)'}")
    if verdict != 'FAILED':
        bad += 1
        print("      " + "\n      ".join(out.splitlines()[-14:]))

restore()
print("-" * 100)
print(f"{len(REVERTS)} reverts, {len(REVERTS)-bad} made an EXPECTED test fail, {bad} did not.")
print("⚠ 'an expected test' — not merely a nonzero exit. A mutation that breaks")
print("  something other than what it was aimed at is reported WRONG TEST, and a")
print("  nonzero exit with no named failure is reported VOID. REVIEW-025, Codex leg.")
sys.exit(1 if bad else 0)
