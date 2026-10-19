# REVIEW-021f — Codex leg, ROUND TWO: the fixes

- **Date:** 2026-08-25
- **Tool:** `codex exec --sandbox read-only --skip-git-repo-check`, from the repository, pinned to `git show 4cc3ae1:<path>` throughout because the working tree had moved under it.
- **Verdict: not clean. Two MEDIUM, four LOW** — and it rated two of round one's own register rows **not supported as written**.

> ## What this leg did that is worth copying
>
> - **It refused to trust the commit it was reviewing.** *"During the review,
>   another process modified eight working-tree files… I made no changes and
>   pinned subsequent reads to `git show 4cc3ae1:<path>`."*
> - **It ran the regexes it was auditing against constructed inputs** rather than
>   reading them, and produced a table of five counterexamples. Four were real
>   gaps; the fifth — that the gate fires on its own prose — was the thread that
>   led to the masked exemption.
> - **It audited `CLAIMS.md` row by row** and marked **E-137 and E-140 not
>   supported**, which is a finding against the register rather than the code and
>   is the class this project has been worst at catching.
> - ⚠ **It declined to settle B-17 after searching for the rippled source and
>   failing to obtain it**: *"The exact rippled 3.3.0 source was unavailable in
>   this repository, so I did not substitute remembered or secondary
>   semantics."* That is `CLAUDE.md`'s rule, applied by a reviewer without being
>   asked.
>
> ⚠ **One claim is wrong and is recorded as wrong** — see `REVIEW-021g` §2. It
> says the exemption count is seven and treats `mptool.c` as a non-caller in one
> place while correctly calling it a caller in another. The number was eight
> before three harnesses were migrated and is **five** now.

**Dispositions are in `REVIEW-021g`.**

---

## Verbatim output

Verdict: **not clean**. The ConvertBack parser checks and disclosure fix are correct, and I found no regression test passing for the wrong reason it names. The new blinding-source gate, however, does not provide the exhaustive guarantee claimed for it: it misses common indirections, exempts the replacement implementation itself, and reports nine exemptions only by counting prose in its own source. More importantly, four executable network harnesses remain unnecessarily tied to the unruled generator. I rate those two issues **MEDIUM**; the remaining findings are false or overbroad sentences about the fixes. Nothing in `4cc3ae1` changes the wire format, so the absence of a new Devnet run is justified.

## Q1. Did any fix introduce a defect?

### Finding Q1-1 — MEDIUM: the new gate is not the falsifier it claims to be

**Defect:** `check-blinding-sources.ts` recognizes only four direct textual spellings, scans only selected extensions under `tools/`, and unconditionally exempts `wconf-randomness.ts`; ordinary aliases or a regression inside the replacement therefore pass.

**Primary source:** `4cc3ae1:tools/check-blinding-sources.ts:25,44-65,74-120,131-169`.

I evaluated the committed regexes directly:

```text
false  const f = mpt.generateBlindingFactor; f()
false  const f = mpt_generate_blinding_factor; f(out)
false  M["_mpt_generate_blinding_factor"](pR)
false  const cmd="blind"+"ing"; Bun.spawn([MPTOOL,cmd])
true   comment: mpt.generateBlindingFactor()
true   comment: tool("blinding")
```

The concrete failures are:

- `.mjs`, `.cjs`, `.tsx`, shell, and other source types are never walked.
- A property alias, C function pointer, bracket lookup, re-export, or dynamic argv construction is invisible.
- `signer/` is not scanned. I independently confirmed it currently only mentions the symbol in prose and does not bind it, but the gate does not enforce that state.
- `wconf-randomness.ts` is exempt and excluded from stale checking. If the replacement itself later called the upstream generator, the gate would explicitly accept it.
- The claimed “call, not prose” distinction is already false in the gate’s own output.

**Concrete break:** a new publishing harness can reintroduce the unruled source while the authoritative-looking check prints `PASS`.

**Remedy:** remove the `wconf-randomness.ts` exemption, exclude the checker from scanning/counting rather than exempting it, scan the relevant repository rather than only `tools/`, and add negative fixtures for aliases, property references, bracket access, dynamic argv, and every accepted source extension. Unless those routes are enforced structurally, narrow the guarantee to “known direct spellings.”

### Q1(b) — no parser defect found

The checks at `4cc3ae1:signer/src/txn.rs:725-769` agree with XLS-0096 §10.3 and the vendored primary headers:

- `BlindingFactor`: 32 bytes.
- `BalanceCommitment`: 33 bytes.
- `ZKProof`: 128 + 688 = 816 bytes.
- `MPTAmount`: required.

`d.u64(...).is_none()` correctly distinguishes absence from zero: `Some(0)` is not rejected by this §10.3 block. The normal builder separately rejects zero at `txn.rs:202-207`, matching §10.4.1 item 5. I found no transaction accepted by the supplied §10.3 rules that the new block would reject.

### Q1(c) — no disclosure defect found

`confirm.rs:133-135` now accurately states that Convert’s `MPTAmount` is in cleartext and that its blinding factor is public. It does not claim a field or action the transaction lacks.

## Q2. Do any new tests pass for the wrong reason?

No listed test appears to pass for the wrong reason named:

- Each missing-field case starts from a valid ConvertBack, removes one field, and requires that field’s specific error.
- The size cases require the specific expected size, not merely any refusal.
- The disclosure test drives all three transaction types and includes the necessary Send negative.
- The drift tests require `REFUSED_LEDGER_MOVED` and name the exact changed ledger field. The ciphertext mutation occurs only inside `MovesTheLedger::confirm`, so its specific detail demonstrates the intended race was entered even though that test omits the explicit `c.seen` assertion.
- The rebuild test’s field-set equality catches the original silent-drop defect.

### Finding Q2-1 — LOW: the rebuild test claims byte equality it does not test

**Defect:** `the_rebuild_helper_round_trips...` says the transaction is reproduced “exactly” and comments “And the BYTES,” but it compares only a subset of parsed values followed by the field-name set.

**Primary source:** `4cc3ae1:signer/tests/convert_back.rs:571-614`.

It does not compare `sequence`, `fee_drops`, `last_ledger_sequence`, `network_id`, flags, or `SigningPubKey` values. A helper regression that preserved all fields but changed one of those values could pass.

**Concrete break:** the test correctly falsifies silent field dropping, but it cannot support the broader byte-exact claim made about it.

**Remedy:** compare the raw value of every surviving decoded field, excluding only `TxnSignature`, and exercise every optional emission branch.

## Q3. Is any sentence written about a fix false?

Yes.

### Finding Q3-1 — LOW: “the typed builder cannot produce one” is false

**Primary source:** `WireFields::ConvertBack` exposes `proof: Vec<u8>` at `txn.rs:350-365`, while `builder` serializes that vector without validation at `txn.rs:455-472`. `build()` and `WireFields` are public.

A caller can obtain a valid `BuiltTransaction`, supply a 40-byte ConvertBack proof, and serialize it through the typed API. The normal prover path checks for 816 bytes at `prover.rs:857-865`, but that is narrower than “the typed builder.”

**Concrete break:** the prose and E-138 misclassify short-proof construction as impossible at the typed boundary. The new parser still catches it, so this is not a remaining parser vulnerability.

**Remedy:** use `[u8; 816]` or a validated proof newtype, or narrow the sentence to “the normal Session/prover path cannot produce one.”

### Finding Q3-2 — LOW: the exemption reasons were not corrected at their call sites

The gate says every exemption carries the same reason at its call site, and `CLAIMS.md` E-140 says the reasons were corrected there. Commit `4cc3ae1` changes none of the eight exempt source files.

The three disputed files still say:

- `reuse-r-setup.ts:77-84`: “Deriving these correctly would delete the finding.”
- `adj-c1-verify.ts:21-28`: the same.
- `adj-c1-shared-blinding.ts:25-34`: the same.

That is precisely the sentence E-140 calls false.

**Concrete break:** the evidence column says the fix landed in two places when it landed only in the gate; readers of the harnesses still receive the rejected justification.

### Finding Q3-3 — LOW: the repaired rebuild header contains a new false distance claim

`rebuild-env.sh:25` says the restore branch was “four lines below” the old sentence. The actual restore branch begins at line 158. The reconstruct/restore distinction itself is accurate; only the narrated proximity is false.

### CLAIMS audit

- **E-135:** core claim supported; its test prevents silent field loss. The separate “exact bytes” prose is overbroad as described in Q2.
- **E-136:** supported.
- **E-137:** not supported. The gate fires on prose, misses routine routes, does not check all source locations, and its corrected count is wrong.
- **E-138:** requiredness and size evidence is supported; “typed builder cannot produce” is false.
- **E-139:** core contradiction and reconstruct/restore distinction are supported; “four lines away” is false.
- **E-140:** not supported as written; call-site reasons were not changed, and the replacement “exact scalars” rationale is not true for reruns.
- **B-17:** appropriately recorded as a gap, with one qualification under Q5.

## Q4. Is nine correct, and is each reason true?

No. There are **eight actual source files** reaching the generator:

| File | Assessment |
|---|---|
| `reuse-r-setup.ts` | Exemption unnecessary; a ruled `r` can be derived once and deliberately reused. The generated scalar is fresh on every rerun, so retaining the source does not preserve “these exact scalars.” |
| `adj-c1-verify.ts` | Exemption unnecessary; transaction `r`/`rho` can be ruled and the deliberately mismatched `alt` can also be a separately derived ruled scalar. It needs to be unequal, not unruled. |
| `adj-c1-shared-blinding.ts` | Same defect as `adj-c1-verify.ts`. |
| `wasm-test.ts` | Sound: local-only and directly tests the WASM export. |
| `mptool.c` | Correctly belongs in the route inventory because it directly calls `mpt_generate_blinding_factor` at line 54. Its reason saying it “is not itself a caller” is false; describe it as the retained adapter. |
| `npm-package-test.ts` | Reasonable as a local package-surface/native cross-check; nothing is published, although its “package against itself” wording is imprecise because it explicitly compares against native code. |
| `nonce-crosscheck.ts` | Sound: no network path and the generator is incidental test material. |
| `npm-e2e-convert.ts` | Not a sufficient exemption: it submits `BlindingFactor: r` to Devnet. Historical E-53 evidence and git history survive changing the current runnable harness. |

The reported ninth exemption is `tools/check-blinding-sources.ts` itself. Its prose at lines 10 and 17 matches the supposed call-only regexes, so `exemptSeen` increments for the checker. `wconf-randomness.ts` is a second meta-exemption that has no hit and is silently excluded from stale checking.

### Finding Q4-1 — MEDIUM: the exemption policy leaves E-76 open for publishing harnesses

Four executable network harnesses—`reuse-r-setup.ts`, both `adj-c1-*` files, and `npm-e2e-convert.ts`—still use upstream randomness in transaction material. The first three do not require an unruled scalar to demonstrate reuse or mismatch, and the npm harness’s historical wording does not justify future permanent publications.

**Concrete break:** the stated principle “migrate what publishes” is not implemented, and rerunning these files creates new ledger evidence sourced outside the ruled construction. This does not imply weak randomness; it means the claimed single ruled source is false.

**Remedy:** derive transaction `r` and `rho` through `wconf-randomness.ts`; deliberately reuse the ruled value or introduce a separately derived mismatching value in the negative harnesses. Preserve E-53 as historical evidence, or split its package-generator check into a non-network harness.

## Q5. Was B-17 the right call?

Yes, recording the gap rather than implementing from recall was correct.

`terFROZEN` rather than `tecFROZEN` is sufficient to classify the known consequence as liveness/resource use rather than F-23-style confidentiality: no applied transaction means no ciphertext publication. It is not sufficient to decide whether preflight is worthwhile—the signer can still consume entropy, reserve identifiers, generate an expensive proof, and ask for human approval before receiving a predictable refusal.

The proposed source investigation is right, but “a fifth ledger call” is premature. `LedgerReader::read` already performs `server_info`, `account_info`, an MPToken `ledger_entry`, and an issuance `ledger_entry`; the exact rippled 3.3.0 code may show that the relevant flags are already present in those responses. The settling question should be: read `ConfidentialMPTConvertBack.cpp` and its freeze helpers, determine the exact flags and precedence, then determine whether existing responses suffice or another RPC is required.

The exact rippled 3.3.0 source was unavailable in this repository, so I did not substitute remembered or secondary semantics.

## Q6. Free hunt and execution record

No additional wire-format or parser behavior defect was found beyond the items above. A new Devnet execution is not required for `4cc3ae1`.

I ran, while the worktree still matched the commit:

- `bun tools/check-blinding-sources.ts` — `PASS`, but its output exposed the false ninth exemption by listing the checker itself.
- `bun tools/wconf-randomness.ts` — all nine vectors reproduced; abort path fired.
- `git show --check 4cc3ae1` / diff check — clean.

I did not claim an independent `cargo test` run. During the review, another process modified eight working-tree files, and read-only access prevented isolating `4cc3ae1` in a separate checkout. I made no changes and pinned subsequent reads to `git show 4cc3ae1:<path>`.

Files read directly included every non-review file changed by `4cc3ae1`, the relevant sections of `CLAIMS.md`, `CLAUDE.md`, `NEXT-SESSION-PROMPT.md`, the architecture and signer README, all eight exempt harnesses, and supporting `signer/src/{mpt,prover,ledger,session,lib}.rs`. Primary cryptographic sizes were checked against `/tmp/wconf/mpt-crypto/include/mpt_protocol.h`, `include/utility/mpt_utility.h`, and `src/utility/mpt_utility.cpp`.
