# Self-review leg — written before seeing Codex or Gemini output

Branch `decision/threat-model-and-architecture`, 3 commits.

Standing caveat, from this project's own record: my self-review has previously
found mechanisms and missed instances — six claims outran their evidence in one
session and the external legs caught every one while my re-reading caught none.
So this leg is written first and fixed in place, and it should be weighted below
the external legs on *instances* even where it is useful on *mechanism*.

---

## SR-1 (MEDIUM) — the hedged default has never been executed on Devnet

`CLAIMS.md` E-60's accepted transaction
(`EFFBB35CA522DE5A3A4B8FF68FD411298CBB828E04F66B98A8A13F9D37574DD9`) was
produced by the **deterministic** build. `WCONF_HEDGE` was flipped to 1 in commit
`55d9b53`, on this branch, *after* that merge.

So the configuration that is now the default has:
- local verification (crosscheck 17/17, pristine upstream verifier accepts), and
- **no end-to-end ledger acceptance.**

The proof *should* be accepted — the pristine verifier is byte-identical to
rippled's, established separately — but "should" is not "was", and this project's
whole method is that executed beats argued. E-60 is not wrong; it is now
ambiguous, because a reader will reasonably assume the accepted transaction used
the current default.

**Cheap to fix:** one Send with the hedged build.

## SR-2 (MEDIUM) — the flip silently weakened T-9's discriminating power

Before the flip, T-9 asserted **zero** entropy draws per proof on the default
build. Upstream's `generate_deterministic_nonces` draws **one** (`RAND_bytes` for
its Extract salt, `src/mpt_internal.h:262` at `85dbac7`, verified). So "zero" was
a genuine discriminator: it could only be true if upstream's derivation had been
replaced.

After the flip the default draws **exactly one** — and so does upstream. **T-9 no
longer distinguishes our hedged build from upstream at all.**

Nothing was removed and no test started failing, which is exactly why this is
worth flagging: a property that *was* verified is now verified by nothing in
T-9. The discrimination now rests entirely on two other things —
`vendor-verify.sh`'s grep that no call site reaches the old function, and the
deterministic arm's reproducibility in `nonce-crosscheck.ts` §2.

That is probably still adequate, but it is a weaker basis than before and the
change was not noticed when the flip was made. The T-9 output should say what it
does and does not discriminate, rather than implying "1 draw" is evidence of
anything.

## SR-3 (LOW) — the architecture document contradicts itself in one table

`ARCHITECTURE-2026-08-18.md` §5 calls the keygen packet **"the last one before
`Accepted`"** — in a table whose very next rows list the Bulletproof ruling and
the Option 2 re-weigh as also outstanding. Either keygen is the last blocker or
it is not; the table says both.

## SR-4 — re-checked my own most conflicted finding, and it survives

I wrote the REVIEW-010 packet *and* adjudicated it, *and* rejected leg A largely
on a circularity finding I discovered myself. That is three conflicts stacked, so
I re-tested it against the most favourable reading of leg A:

- **Could leg A have meant only the r-independent part of the statement?** No.
  Its own words are *"including sender, destination, and issuer public keys **and
  commitment points**"*. The Send statement's commitment points are `C₁ = r·G`,
  `C₂,ᵢ`, `PC_m` — all functions of `r`. The circularity stands under the
  charitable reading.
- **Did I recompute its KAT against a strawman layout?** No. I reproduced leg A's
  stated field order exactly, and leg A's *own printed IKM hex block* matches my
  construction byte for byte. Only its stated total length and its hash outputs
  differ from what that construction actually produces.
- **New, and it strengthens the finding:** leg A's own printed IKM is **222
  bytes**, contradicting leg A's own stated 188. So the document is internally
  inconsistent independently of my recomputation.

**Not a finding. Recorded because a reviewer should be able to see that the most
conflicted claim was re-tested rather than assumed.**

## What I did NOT check, and should be honest about

- Whether the adopted ruling's **pre-sign detection rule** (durable randomness
  ledger with atomic reserve) creates a signer that cannot sign after losing that
  state. I read it; I did not reason it through.
- Whether the `t-r-and-rho-construction.ts` test has a false-pass mode. I ran it
  and it passed. Running is not reviewing — that is exactly the mistake round one
  of the last review made with `t-nbound.c`.
- Whether the architecture document's "falsified if" clauses are real falsifiers
  or decoration. I wrote them; I am the worst reader of them.
