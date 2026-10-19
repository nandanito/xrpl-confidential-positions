# REVIEW-013b-codex-option-2-and-amendments-2026-08-18

- **Leg:** Codex (codex exec --sandbox read-only)
- **Date:** 2026-08-18
- **Packet:** `docs/reviews/REVIEW-013-REQUEST-option-2-and-amendments-2026-08-18.md`
- **Verbatim.** Adjudicated in `REVIEW-013c`. Nothing below is edited.

---

# Question A — ruling

**Ruling: Option 3.** Risk alone still selects the local holder-side signer. After REVIEW-012 §7 and §8, Option 2 is no longer “browser holds an independent ElGamal secret”; it is “browser handles material sufficient to derive or expose a permanent, unrotatable confidential spending/decryption key, and in the master-seed path the XRPL root credential.” A web-origin compromise is remote, repeatable, and scalable. Option 3 still fails under holder-machine code execution, but ADR-0001 §(a) and Architecture §3 are honest about that. The remaining claim is narrower and valid: Option 3 raises the compromise bar from page/origin control to user-level compromise of the holder machine, plus defeating the signer’s own confirmation UI.

Corrected build-cost table:

| | Secret lives | Can spend | Can decrypt | Build cost |
|---|---|---|---|---|
| **1. Server-side proving** | Application server | Server | Issuer, auditor, server | Low |
| **2. Browser WASM** | Browser memory | Holder + anyone who compromises the page/browser path | Issuer, auditor, and page compromiser for holder history if holder secret is exposed | Low |
| **3. Local holder-side signer** | Holder machine, signer process | Holder; same-user code execution can compromise it | Issuer, auditor; local machine compromise can read holder secrets | High |

The standalone-ElGamal-seed path **relocates the problem; it does not rescue Option 2**. It narrows the master-seed blast radius, but the browser still holds an unrotatable, unrecoverable confidential key. It also discards REVIEW-012 §7 condition 1’s main benefit: recoverability from the backup the holder already keeps. Worse, if Option 2 also signs XRPL transactions in-browser, the standalone ElGamal seed only removes one root-credential path while leaving browser signing authority in scope.

The adversary-capability gap is **large and decision-relevant**. Option 2’s adversary can be an XSS, malicious dependency, hostile service worker, compromised hosting/CDN, or browser extension. Those are commonly remote and can hit many holders at once. Option 3’s adversary needs same-user OS code execution or equivalent local compromise. That is not impossible, and Architecture §3 correctly says it reads `sk_A` from memory, but it is a materially higher bar.

The signer-distribution risk is real, but it does not overturn the ruling. If the issuer ships an opaque signer, the holder trusts issuer code. That weakens the slogan “operator cannot spend holder funds.” But Option 2 has the same or worse operator-code problem on every page load: a served page can change, dependencies can change, and WASM/minified bundles are not meaningfully “readable” to ordinary holders. This risk should force signed releases, source distribution, and reproducible-build work for Option 3; it is not a reason to put root or confidential key material in the page.

ADR-0001 §(a) claims about Option 2 that are no longer true: “highest cost,” “avoid making a WASM toolchain a prerequisite,” “Revisit if a maintained WASM build appears,” and the rev-3 box’s “no published package — still true.” CLAIMS.md E-53 says `@xrplf/mpt-crypto@0.1.0` exists and works for the scoped Convert path. The remaining Option 2 rejection must be written as a risk argument, not a cost argument.

# Question B — findings

**A1 — HIGH — keyed entries do not protect against the in-scope same-host adversary, and the set is not authenticated.**  
Sequence: attacker with same-user local read access obtains the store and `k_local`, because A1 stores `k_local` “with the signer’s other key material.” The attacker scans chain `C1` values, computes `HMAC(k_local, label || C1)`, and links store entries to on-chain sends, including failed or unbroadcast attempts. Separately, an attacker without `k_local` can truncate or roll back the store; each remaining entry is still well-formed because entries are individually HMACed but the set is not. Later, if a signer bug or bad entropy path repeats a prior scalar, the removed entry is not detected, and E-63’s public difference attack becomes possible.

Correction: state A1’s protection narrowly: it protects offline store copies that do not include `k_local`, not an in-scope same-host process and not backups that contain both. Implement the store as an authenticated append-only log: every record includes `version`, `install_id`, monotonically increasing `seq`, `status`, `created_at`, `entry_type`, `entry_hmac`, and `prev_record_mac`; `record_mac = HMAC-SHA-256(k_store_integrity, canonical_record_without_mac || prev_record_mac)`. Store the current tail MAC and sequence in a separately authenticated header; verify the full chain on startup. A missing, duplicated, reordered, or truncated record is corruption and enters A3.

**A2 — MEDIUM — “promote, never delete” conflicts with A1’s pruning claim.**  
Sequence: implementer follows A1’s “pruning bounds the window” language and deletes old committed entries. Months later a bad RNG, rollback, or KDF/context bug regenerates an old scalar. The old entry is gone, so the signer signs. The ledger accepts reused `r` as shown in E-63.

Correction: never prune entry identifiers while claiming lifetime reuse detection. Only timestamps and verbose metadata may be dropped or coarsened after promotion. The durable set of `r_entry` and `rho_entry` values is append-only for the installation lifetime. If any identifier is deleted, that deletion must be treated exactly like A3 store loss: human acknowledgement, durable audit gap, and no claim that reuse would have been detected across the gap.

**A3 — HIGH — the fresh-start path is underspecified and inducible.**  
Sequence: local malware, buggy sync, or backup restore repeatedly deletes or rolls back the randomness store. The signer shows a generic failure, the holder acknowledges, and a fresh store starts. If the gap record is stored only inside the reset store, the attacker can delete that too. The result is quiet degradation to “trust the CSPRNG,” with no reliable audit trail and no holder understanding that duplicate detection was lost.

Correction: acknowledgement must occur in the signer’s own UI, not the browser. It must show: reason detected, last verified store timestamp/sequence if known, whether rollback/truncation/missing file was detected, that old duplicate detection is unavailable, and that signing may expose amount differences if `r` repeats. Require a deliberate typed acknowledgement such as the account ID plus “RESET RANDOMNESS LEDGER”. Before fresh start, attempt restore from the latest authenticated backup. Record the gap in a separate append-only audit log using the same hash-chain format, and surface a distinct refusal/error code to the browser so the confirmation UI cannot swallow it as a generic signing failure.

The amended store does **not** protect against a malicious signer, code execution that reads signer memory, a same-host process that can read `k_local`, backups or sync snapshots containing both the store and `k_local`, an attacker-known entropy source that reports success, transaction-context bugs, KDF implementation bugs, Bulletproof blinding failures, ledger-side acceptance of reused `r`, or public metadata leakage of identities, counterparties, timing, and frequency. It also does not hide the approximate count and timing of signing attempts from a local reader unless metadata is separately minimized.

Ruling: **do not build the signer against A1-A3 as they stand.** The KDF in REVIEW-010 can stand, but the store state machine needs the corrections above before implementation. Non-cryptographic signer scaffolding can proceed only if it does not bake in the current store semantics.

# Stale or wrong in the packet

ADR-0001 attachment metadata is internally stale: the header says “Status: Proposed. Revision 4,” but the same attachment includes a Rev 5 history box and Rev 5 status. The status may be Proposed; the revision number is wrong.

ADR-0001 §(a)’s build-cost rationale is stale: Option 2 is not High on current packet evidence; Option 3 is not Medium after the issue #1 boundary ruling. The corrected ordering is Server Low, Browser WASM Low, Local Signer High.

ADR-0001 §(a) “Revisit if a maintained WASM build appears” is stale under CLAIMS.md E-53. A published WASM package exists, though only Convert is executed end-to-end through npm per E-53.

Architecture §6 step 5 says the ADR gate “requires the keygen ruling.” That is stale. REVIEW-012 exists and Architecture §5 already says the remaining ADR gate is the Option 2 re-weigh.

REVIEW-012 §3 says `r`/`ρ` use the `WCONF-R-*` / `WCONF-RHO-*` family. That is stale or wrong against REVIEW-010 §5 and Deliverable A, which use `WCONF-RANDOM-SCALAR-v1`.

A1’s statement that “pruning bounds the window” is wrong unless it is limited to timestamp/detail pruning. Pruning committed identifiers reopens the reuse-detection window.

A1’s same-host framing is overclaimed. With `k_local` stored beside signer key material, A1 is mainly an offline file-copy defence. It does not defend against the hostile same-host process invoked in the amendment text.

B.2’s “store is defence-in-depth against a CSPRNG that silently repeats” is overstated. REVIEW-010 Deliverable A binds `entropy64` to `TransactionContextID`; repeated entropy across different contexts should not repeat scalars. The store mainly catches exact-context repeats, rollback, and implementation failures.

I could not verify live npm or crates registry state from the local shell: `npm view` and `curl crates.io` failed with DNS `ENOTFOUND`. External indexed sources were inconsistent: npm search showed `ripple-keypairs` latest as 3.0.0 and npm search/Snyk showed `ripple-binary-codec` latest/dist-tag as 2.8.0, while the local lockfile contains `ripple-binary-codec@2.9.0` and `@xrplf/mpt-crypto@0.1.0`. Sources consulted: [npm ripple-keypairs](https://www.npmjs.com/package/ripple-keypairs), [npm search](https://www.npmjs.com/search?q=keywords%3Axrpl), [Snyk ripple-binary-codec](https://security.snyk.io/package/npm/ripple-binary-codec), [XRPLF xrpl-rust releases](https://github.com/XRPLF/xrpl-rust/releases).
