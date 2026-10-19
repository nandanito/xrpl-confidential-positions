```text
GitHub: 200
Devnet: 400
pwd: $USER_TMP/T/review058r3.aoKi92/repo
HEAD: 29fc4ebacd24918e245e38f678dc3f621c054a69
```

**Verdict: the fixes are incomplete.** Six findings follow. HIGH grades reflect undischarged round-two obligations.

All mutations were restored; the working tree is clean. No private store was opened. One source excerpt displayed a public test-vector key at `facility/tests/facility.test.ts:204`, contrary to your transcript instruction.

Here, **ADR** means `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`; **R2-A** means `docs/reviews/REVIEW-058-packets/round-two-codex-output.md`; **058c/058d** mean the two adjudications.

**Seam 1: findings — discharge remains incomplete.**

I read all 33 changed files whole, checked the raw findings against the ruling table, and swept 379 tracked text files outside `docs/reviews/`, including whitespace-normalized searches and wallet-permanence paraphrases.

| 058d row | Verdict and evidence |
|---|---|
| R2-1 | Discharged: ADR:91–93 and :310–312 now qualify “server-side.” |
| R2-2 | Partial: the two matrix details are corrected; other permanence claims survive. R3-1. |
| R2-3 | Discharged as a design requirement: ADR:375–378 and architecture:269 require commit **and verdict**. |
| R2-4 | Partial: the reported malformed shapes are closed, but Rust parity remains overstated. R3-3. |
| R2-5 | Discharged: `loopback.test.ts:289–300`; removing only the issuance type check produces one failure. |
| R2-6 | Discharged: 058c:76 strikes the false gloss; ADR:325–332 explicitly describes cached observations. |
| R2-7 | Discharged: 058c:89 says five; the table contains five downgrades. |
| R2-8 | Discharged: `CLAIMS.md:387` records completed rounds one and two. |
| R2-9 | Discharged at design level: ADR:172 prices replacing runtime API dependencies and requires direct-load/navigation checks without an API. |
| R2-10 | Partial: the alternative trust-acceptance branch drops an unconditional credential restriction. R3-2. |
| R2-11 | Discharged for the reported plain-whitespace wraps. Additional rendered-copy bypasses remain: R3-5. |
| R2-12 | Partial: the second wallet pattern still has no wallet subject. R3-4. |
| H3 extras | Discharged as requirements: endpoint/acceptance allowlist, account-existence distinctions, and cadence or indefinite-snapshot acceptance are in ADR:172. |
| B2-1 | Discharged: the four missing identifiers now occur at corresponding requirements; 058c:102 retracts its blanket citation claim. |
| B2-2 | Discharged with R2-7. |
| B2-3 | Discharged: ADR:85, :94–99, :153, :172 and architecture:259 describe one build-wide snapshot. |
| B2-4 | Discharged for H3: ADR:194–215 distinguishes the fixed reading from current state and names limited history. |
| Q4 | Noted appropriately: ADR:180–185 does not depend on the claim that only these four accounts hold confidential balances. |
| T-1, T-2 | Covered by R2-4 and R2-7 respectively. |

**R3-1 | HIGH | The wallet-permanence correction still has active copies | Evidence:** `web/api/capability.ts:75–77` still says the three reasons “are structural and no wallet update can close them.” `docs/explainer/WEB-TIER-WALKTHROUGH-2026-08-28.md:39` still concludes that a browser-wallet operation cannot be assembled and “there is nothing to grant,” without the examined-wallet scope or internally proving wallet exception. These reproduce R2-A:19’s objection. **Discharge:** scope both passages to the examined APIs and carry the internally deriving/decrypting/proving wallet exception into both. Re-sweep for the permanence claim, including “structural,” “cannot be assembled,” and “nothing to grant.”

Other corrected phrases found by the sweep—uncached values, once-per-page reads, the unrun rotation, and the original wallet-release wording—survive as historical corrections or detector definitions, rather than active assertions.

**R3-2 | HIGH | R2-10’s deployment-token isolation was weakened into an option | Evidence:** R2-A:123 permits either isolation or explicit build-execution trust acceptance, then separately requires keeping deployment credentials out of dependency execution. ADR:119–121 instead says to isolate stores **and token**, bring the token only for upload, **“or accept the build machine’s trust by name.”** That alternative can waive token isolation too; D-H4:266 does not restore it. **Discharge:** require the deployment token to be unavailable during dependency installation and building under **both** branches. Limit the alternative acceptance to the remaining build-machine/filesystem trust, and correct 058d:54’s summary accordingly.

**Seam 2: findings — the ordinary response checks hold, but parity and scanner coverage remain incomplete.**

Reader probes used actual JSON responses through `LoopbackLedger` and `Snapshot`, on both positive and `entryNotFound` paths:

| Response shape | Result |
|---|---|
| Matching integer index, `validated: true` | Accepted |
| `validated: "true"` | Refused |
| Matching index, `validated` absent | Refused |
| `ledger_index: 4800000.0` | **Accepted** |
| `ledger_index: 4800000.0000000001` | **Accepted**, after rounding |
| `ledger_index: 4800000.5` | Refused |
| String, null, wrong index, or only `ledger_current_index` | Refused |
| `validated: false` | Refused |
| `objectNotFound` or `lgrNotFound` | Refused as ledger errors |

**R3-3 | HIGH | The reader still does not match Rust’s strict numeric contract | Evidence:** `facility/src/loopback.ts:265–267` checks the already-parsed JavaScript number. Both decimal wire forms above become `4800000`, including the mathematically different fractional value. Rust uses `Value::as_u64` plus checked `u32` conversion at `signer/src/ledger.rs:553–561,702–710`. The pinned [serde_json parser](https://raw.githubusercontent.com/serde-rs/json/v1.0.151/src/de.rs) classifies decimal forms as floats, and [`as_u64`](https://raw.githubusercontent.com/serde-rs/json/v1.0.151/src/number.rs) refuses floats. ADR:298–301, `CLAIMS.md:389`, and 058d:46 nevertheless claim parity. **Discharge:** either enforce Rust’s unsigned-32-bit JSON-integer representation before number coercion, with positive/negative decimal and range controls, **or explicitly document the weaker contract everywhere parity is claimed**, as R2-A:75 allowed.

Read-only public Devnet probes at **ledger 6,245,016**, network **2**, rippled **3.4.1**, accepted all four demo accounts, their MPToken entries, the issuance, and a legitimate absent-MPToken result. Present and absent responses carried numeric indices and `validated: true`; unavailable ledger 100 returned `lgrNotFound`. I found no honest pinned response used by these paths newly refused.

**R3-4 | HIGH | R2-12’s second pattern still rejects another subject’s true statement | Evidence:** `tools/check-disclosure-phrases.ts:75` now matches `are **structural** and cannot be closed by any wallet update`. It still contains no wallet-reasons subject. The real `scan()` rejected a true statement about protocol-mandated issuer mirrors using that wording. The control at :378–382 exercises a sentence lacking the newly required `are **structural**` substring, so it cannot protect this pattern. `CLAIMS.md:389` falsely reports that the wallet phrases are scoped to their subject. **Discharge:** scope **both** wallet patterns to their intended wallet-reasons statements; add other-subject true controls that retain each complete predicate, while retaining controls for the original false copies.

**R3-5 | MEDIUM | Rendered copies still bypass whitespace flattening | Evidence:** `flatten()` at `tools/check-disclosure-phrases.ts:225–244` removes whitespace only. These wrapped copies passed:

```md
> The issuer shows the same holder,
> decrypted.
```

```tsx
<li>Issuer view — the same holder,{" "}
 decrypted.</li>
```

The second was installed temporarily in the real `web/app/src/routes/index.tsx:51`: **gate exit 0**. The corresponding plain-newline copy produced **exit 1**, correctly naming line 51. **Discharge:** normalize these Markdown and JSX text boundaries before matching and add controls through the real detector for both forms. State the remaining markup/rendering limitations explicitly.

The baseline and revised detectors both report **zero hits on the unchanged tree**. The revised gate passes **20 phrases / 10 controls**. It newly rejects true wrapped prose such as “The local issuer tool can show the same holder,\n decrypted.” Its printed inability to judge truth remains accurate; “catches COPIES” needs qualification because rendered copies can remain invisible.

Verification: the three changed suites pass **52/52**. Six independent mutations—validation, string coercion, current-index fallback, negative-origin checking, and the two type-check call sites—each fail tests.

**Seam 3: findings — the parity and subject-scoping claims above are overstated, and one new adjudication sentence is false.**

**R3-6 | LOW | The adjudication overstates the evidence-coverage explanation | Evidence:** 058d:35–36 says, **“The split is not a disagreement about the same evidence.”** Its own :33 acknowledges that both legs received the whole ADR containing R2-1’s surviving sentence. Gemini’s `round-two-gemini-output.md:52–61` expressly rules B1-10 discharged and says it checked surviving wording; Codex’s R2-A:17 finds the surviving copy in that same ADR. **Discharge:** distinguish the two packet-coverage differences from R2-1: for R2-1, both legs had the evidence and one missed the copy.

Counts checked: **407 unique register rows**, all **407 index links** resolve to their named rows; changed topic counts agree with their row lists; revision history is **171 simplified / 212 full-history** commits; the transcript contains **34 shell invocations**. The web suite passes **129/129**. The facility suite contains **107** tests: **102 pass**, and five fail because the signer binary is absent. Those environment failures do not contradict the author’s recorded run.

**Single sentence most likely to be false:** “The split is not a disagreement about the same evidence.” — 058d:35–36.

**Files opened:** [complete file-by-file inventory — 389 repository files, plus scratch files and network sources](/private/tmp/review058r3-opened-files.txt).
