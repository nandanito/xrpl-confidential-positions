# REVIEW-013a-gemini-option-2-and-amendments-2026-08-18

- **Leg:** Codex (codex exec --sandbox read-only)
- **Date:** 2026-08-18
- **Packet:** `docs/reviews/REVIEW-013-REQUEST-option-2-and-amendments-2026-08-18.md`
- **Verbatim.** Adjudicated in `REVIEW-013c`. Nothing below is edited.

---

# Question A — ruling

### Ruling: Option 3 (Local Holder-Side Signer) Confirmed

**Option 3 is confirmed.** The rejection of Option 2 stands on risk grounds alone, independent of the build-cost inversion.

#### Argument on Risk Alone
The decision to reject Option 2 (Browser WASM) does not require the retired build-cost argument. The risk argument is rooted in the structural security boundary of the execution environment:

1. **Failure Mode Permanence in XLS-0096:** In XLS-0096, cryptographic key compromise is catastrophic and irreversible. There is no key rotation (`tecDUPLICATE`), no key recovery (spec §A.6), and no account-level key revocation (`E-9, E-10, P-10`). A compromised key is permanently compromised; a lost key renders balances permanently unspendable.
2. **The Web Origin Threat Model:** In Option 2, secret material resides in the JavaScript execution context / linear WebAssembly memory of a web browser origin. A web origin is exposed to a wide, structurally porous attack surface:
   - Client-side dependency vulnerabilities (transitive npm supply chain compromises in frontend bundles),
   - Cross-Site Scripting (DOM, stored, or reflected XSS; CSP bypasses),
   - Malicious or compromised browser extensions with broad origin or DOM access,
   - Malicious Service Workers, CDN tampering, or DNS/BGP hijacks.
   
   In a browser environment, any script execution compromise allows an attacker to extract `sk_A` (and the XRPL transaction signing key) from memory or hook WebCrypto/WASM entry points.
3. **The Out-of-Band Physical Isolation of Option 3:** Under Option 3, secret material and proof generation are isolated in an independent native OS daemon. Following the issue #1 ruling (hostile same-host process in scope), Option 3 requires:
   - An independent per-transaction confirmation GUI owned and rendered by the signer daemon displaying parsed transaction fields directly from the binary's internal representation,
   - Short-lived, strictly scoped IPC authority,
   - No browser-persisted bearer secrets.
   
   Consequently, a total web origin compromise (e.g., complete DOM/XSS control of the web app) **cannot extract keys and cannot silently spend funds**. The web attacker is halted at the IPC boundary and cannot forge human approval in the signer's OS confirmation window. To compromise Option 3, an adversary must achieve local OS arbitrary code execution as the holder's user to read process memory or compromise OS-level windowing/input subsystems.

---

### Corrected Build-Cost Table

The build-cost column in ADR-0001 §(a) is factually inverted and must be replaced as follows:

| Option | Secret lives | Can spend | Can decrypt | Build cost | Notes |
|---|---|---|---|---|---|
| **1. Server-side proving** | Application server | Server | Issuer, auditor, server | **Low** | Traditional custodial backend; standard web architecture. |
| **2. Browser WASM** | Browser memory | Holder + anyone who compromises page/origin | Issuer, auditor | **Low** *(was High)* | Three published, unpatched npm packages (`@xrplf/mpt-crypto@0.1.0`, `ripple-binary-codec@2.9.0`, `ripple-keypairs`). Zero vendoring, zero native toolchains (`E-53`). |
| **3. Local holder-side signer** | Holder's machine (daemon) | Holder | Issuer, auditor | **High** *(was Medium)* | Requires custom Rust daemon, patched C fork (`wconf-nonces.patch`), FFI bindings handling crate drift (`F-18`), OS IPC/native messaging, and an out-of-band GUI confirmation window. |

---

### The Standalone-ElGamal-Seed Rescue Path (Change 3)

**Answer: It relocates the problem rather than rescuing Option 2, re-introduces catastrophic operational failure modes, and does not close the spending compromise.**

1. **Incomplete blast-radius reduction:** Even if `sk_A` is derived from an independent standalone seed, a web page compromise under Option 2 still leaks `sk_A`. Because XLS-0096 keys cannot be rotated (`tecDUPLICATE`), the holder's confidential transfer authority and balance privacy on that `MPToken` are permanently destroyed (`E-9, E-10`).
2. **Outer Transaction Signing Remains Exposed:** A browser executing Option 2 must sign the outer XRPL transaction. The browser must therefore hold either the XRPL master seed or a regular key in memory. Compromise of the page compromises the XRPL signing key, granting the attacker the ability to drain all public funds and issue transactions regardless of `sk_A` isolation.
3. **Reintroduction of Irrecoverable Loss:** Generalizing standalone seeds discards the primary benefit of §(e) (recoverability from the standard XRPL master seed backup) and forces the user to manage a separate, unrotatable secret. If lost, confidential balances are permanently burned with no recovery mechanism.

---

### Sizing of the Adversary-Capability Gap (A.4(i))

The gap between Option 2's and Option 3's adversary capabilities is substantial:

- **Option 2 Adversary (Web Origin Compromise):** Requires execution of arbitrary JavaScript within the origin context. This is achievable remotely without local host access via compromised npm dependencies, malicious browser extensions, CDN script modification, or XSS vulnerabilities. Exploit complexity is low-to-medium, remote, and highly scalable across users.
- **Option 3 Adversary (Local Process Execution / OS-Level Compromise):** Must achieve native code execution on the user's host OS as the holder's user ID, escape the browser sandbox, bypass OS memory protections (`ptrace`/debugging restrictions, macOS Hardened Runtime/SIP), or execute OS-level input injection/redressing over the independent confirmation window. Exploit complexity is high, requires local execution, and cannot be achieved purely through web-layer vulnerabilities.

The gap represents multiple privilege tiers and sandbox boundaries.

---

### Weighting of the Signer-Distribution Risk (A.4(ii))

**The signer-distribution risk is real, but it does not outweigh Option 2's architectural web vulnerabilities.**

1. **Inspection of Web Code is an Illusion:** While web assets are served as text/WASM, modern frontend bundles and WASM blobs are not auditable by users at runtime prior to execution. Furthermore, web delivery lacks immutability: a compromised web server or CDN can selectively serve malicious bundles to targeted users on demand.
2. **Native Binaries Provide Verifiable Integrity:** A distributed native binary can be pinned, independently verified via reproducible builds (e.g., deterministic Cargo builds), hash-checked against public releases, and signed with platform transparency mechanisms (macOS Notarization, Windows Authenticode).
3. **Existing Protocol Trust Baseline:** The holder already trusts the issuer for supply integrity, clawback execution, and mandatory decryption mirroring (`P-9, E-12, E-21`). Adding binary distribution trust is consistent with the protocol's trust model, whereas Option 2 exposes the holder to untrusted third-party web supply chains.

---

### Claims in the ADR about Option 2 that are No Longer True

1. **ADR-0001 §(a) Rev 3 Box — "no published package":** The claim that `"no published package" — still true. @xrplf/mpt-crypto returns Not found on npm as at 2026-08-16 (E-32)` is **false**. `@xrplf/mpt-crypto@0.1.0` was published to npm on 2026-08-16T15:26:21Z (`E-53`).
2. **ADR-0001 §(a) Table — Build Cost:** The claim that Option 2 has "High" build cost while Option 3 has "Medium" build cost is **false**. Option 2 is Low cost; Option 3 is High cost.
3. **ADR-0001 §(a) Decision item 2 — Toolchain Prerequisites:** The claim that Option 3 *"avoids making a WASM toolchain a prerequisite for milestone 1"* is **stale**. The WASM build is already maintained upstream (`E-31, E-53`), whereas the native build for Option 3 encountered build and FFI blockers (Conan remote breakage `F-9`, Rust FFI crate version drift `F-18`).
4. **ADR-0001 §(a) Accepted Cost — WASM Revisit Condition:** The statement *"Revisit if a maintained WASM build appears"* is **stale** because `@xrplf/mpt-crypto@0.1.0` has already appeared and was executed.

---

# Question B — findings

### Findings on Amendments A1–A3

#### Finding B.1: Monotonic Storage Growth vs. Pruning Contradiction
- **Severity:** HIGH
- **Sequence producing harm:**
  1. Amendment A1 states: *"Pruning bounds the window; it does not remove the property."*
  2. Amendment A2 mandates: *"promotes every pending entry older than a lease interval to committed — promotes, never deletes... Deleting could permit a reuse the store exists to prevent; promoting cannot."*
  3. Every transaction attempt (including aborted, canceled, or invalid attempts) writes entries that are eventually promoted to `committed`.
  4. If entries are never deleted, the randomness store grows monotonically ($O(N)$), causing unbounded memory and disk consumption. On a flat-file or unindexed store, verification during pre-sign checks degrades linearly ($O(N)$ scan time), eventually causing signing timeouts or disk exhaustion (Denial of Service).
  5. If an implementer attempts to resolve this by introducing naive sliding-window pruning of old `committed` entries, the exact $r$-reuse window the store was built to close is reopened for any repeated CSPRNG state against past transactions.
- **Correction:**
  - Strike the sentence *"Pruning bounds the window"* from A1.
  - Specify that the randomness store MUST be implemented as an indexed key-value database (e.g., embedded SQLite with WAL mode or RocksDB/LMDB) with a unique index on `entry_hmac`. Individual lookups must be $O(1)$.
  - Explicitly mandate that `committed` entries are permanent and MUST NOT be pruned for the lifetime of the account's key material. At 64 bytes per entry (32 bytes $r$, 32 bytes $\rho$), 100,000 transaction attempts require $\approx 6.4\text{ MB}$, which is negligible for an indexed local database.

---

#### Finding B.2: Absence of Store-Set Integrity Allows Silent Truncation and Rollback
- **Severity:** HIGH
- **Sequence producing harm:**
  1. Amendment A1 authenticates each entry individually: `r_entry = HMAC-SHA-256(k_local, "WCONF-RANDOM-SCALAR-v1/store/r" || compressed(r*G))`.
  2. There is no cryptographic binding or MAC over the *set* of entries, store length, or sequence history.
  3. A hostile same-host process (or an OS-level file rollback/VM snapshot restore) truncates the store file or replaces it with an earlier valid version.
  4. On subsequent signing attempts, the signer iterates through the truncated store. Every present entry passes HMAC validation.
  5. The signer perceives the store as completely valid and uncorrupted. Amendment A3's "corrupt or missing" detection is entirely bypassed.
  6. If the host CSPRNG repeats a state that existed in the deleted portion of the store, the signer derives a colliding scalar, fails to detect it, and executes a duplicate $r$ on-chain, exposing transaction amounts (`E-63`).
- **Correction:**
  - Implement a tamper-evident authenticated append-only log structure:
    - Maintain a store header containing: `header = { version: u32, generation_id: u32, entry_count: u64, rolling_hmac: [u8; 32] }`.
    - For each new entry $i$, compute:
      $$\text{rolling\_hmac}_i = \text{HMAC-SHA-256}(k_{\text{local}}, \text{rolling\_hmac}_{i-1} \parallel \text{entry\_hmac}_i \parallel \text{u64be}(i))$$
    - Update the header atomically on every commit.
    - On startup and before each pre-sign check, the signer must verify that the total count of valid entries matches `entry_count` and that the recomputed chain matches `rolling_hmac`. Any discrepancy indicates truncation/rollback and MUST trigger the A3 corruption path.

---

#### Finding B.3: A3 Store-Reset Human Acknowledgement is Underspecified and Vulnerable to Fatigue or IPC Forgery
- **Severity:** HIGH
- **Sequence producing harm:**
  1. Amendment A3 mandates: *"On a missing or corrupt store the signer must: refuse to sign until a human acknowledges it, then start a fresh store, and record the gap durably..."*
  2. The amendment does not specify the interface or authorization requirements for human acknowledgement.
  3. If acknowledgement is allowed via IPC/CLI flags (e.g., `{ "acknowledge_store_reset": true }`), a hostile same-host process can intentionally corrupt the store file and then immediately issue the acknowledgement over IPC, silently wiping the randomness ledger without human interaction.
  4. Even if rendered in a GUI, if the prompt is a simple "OK/Cancel" modal, repeated deliberate corruption by a local adversary will trigger user alert fatigue, inducing the user to click "OK" and degrade anti-reuse protections.
- **Correction:**
  - A3 MUST mandate that store-reset acknowledgement:
    1. Can **only** be accepted directly through the signer daemon's native out-of-band GUI window; any reset instruction received via IPC or CLI flags MUST be rejected.
    2. Requires high-friction user interaction: the user must be required to type an explicit confirmation string (e.g., `"RESET RANDOMNESS STORE"`) and re-enter their master passphrase.
    3. The durable gap record MUST record: `timestamp`, `generation_id` (incremented monotonically), `reason` (missing vs. checksum mismatch vs. truncation), and the last known valid `rolling_hmac`.
    4. Future signed transaction audit logs must record the current `generation_id`.

---

#### Finding B.4: Concurrency Race Condition Between Lease Expiration and GUI Confirmation
- **Severity:** MEDIUM
- **Sequence producing harm:**
  1. Step 6 of REVIEW-010 §7 reserves `r_commit` and `rho_commit` as `pending`.
  2. The signer presents the transaction confirmation dialog to the human user.
  3. The user delays clicking "Approve" (e.g., steps away from the machine for 10 minutes), exceeding the `pending` lease interval defined in A2.
  4. Concurrently, a second signer instance (or the same instance executing background tasks) starts up and runs A2 crash recovery, promoting the active session's `pending` entry to `committed`.
  5. The user finally approves the transaction in instance 1. Instance 1 attempts to transition the entry from `pending` to `committed` (or re-checks the store), sees the value already marked `committed`, and either crashes, panics, or falsely flags a duplicate collision.
- **Correction:**
  - The UI confirmation modal MUST enforce an active timeout that is strictly shorter than the `pending` lease duration (e.g., UI confirmation times out after 120 seconds; lease expiration interval is fixed at 600 seconds).
  - While the confirmation UI is active and awaiting user input, the daemon MUST maintain an active in-memory lease heartbeat, preventing startup sweeps from promoting entries that belong to a live PID/session.
  - Step 7 must be idempotent: transitioning an entry from `pending` to `committed` where the entry was already promoted by a startup sweep with an identical `(r_entry, rho_entry)` within the same generation MUST succeed without error.

---

#### Finding B.5: Silent Error Swallowing in Confirmation UI
- **Severity:** MEDIUM
- **Sequence producing harm:**
  1. A pre-sign randomness collision or store failure occurs (e.g., duplicate scalar generated, store lock acquisition timeout, or A3 corruption).
  2. Neither §7 nor A1–A3 defines how randomness store errors are rendered in the confirmation UI versus returned over IPC.
  3. If the daemon returns a generic error code (e.g., `tecSIGNING_FAILED`) across IPC, the web application will swallow the error or display a generic "Transaction failed, please retry" notification.
  4. The user retries repeatedly, unaware that a critical entropy failure or persistent store corruption has occurred.
- **Correction:**
  - The signer specification MUST mandate that any randomness ledger failure (duplicate scalar detected, lock failure, database I/O error, or A3 corruption) MUST render a dedicated, non-dismissible alert directly in the **signer daemon's own UI window** explaining the precise nature of the failure.
  - The daemon MUST NOT emit signed blobs or return generic retryable errors over IPC when a randomness ledger violation occurs.

---

#### Finding B.6: Conflict Between §7 Step 7 and Amendment A2 on Abort Handling
- **Severity:** LOW
- **Sequence producing harm:**
  1. REVIEW-010 §7 step 7 specifies: *"clear pending only on a hard local failure before emission."*
  2. Amendment A2 specifies: *"promotes every pending entry older than a lease interval to committed — promotes, never deletes... Deleting could permit a reuse the store exists to prevent; promoting cannot."*
  3. If a local failure occurs prior to emission (e.g., user cancels the confirmation dialog or proof generation aborts), the implementation faces contradictory instructions: §7 mandates clearing `pending`, while A2 prohibits deletion.
- **Correction:**
  - Formally amend §7 step 7 to align with A2: on a local user cancellation or proof failure, the signer MUST NOT delete the `pending` entry. It MUST immediately promote the `pending` entry to `committed` (burning the scalar permanently). Because scalars are derived from fresh 64-byte entropy per attempt, burning an unused scalar carries zero cost and guarantees no race condition can un-reserve the scalar.

---

### What the Amended Store Does NOT Protect Against

The amended randomness store does NOT protect against:

1. **Host Memory Extraction:** An adversary with arbitrary code execution or debugging access to the signer process memory can extract $sk_A$, $r$, $\rho$, $k_{\text{local}}$, and plaintext balances directly.
2. **Co-located Storage Compromise:** An adversary who reads both $k_{\text{local}}$ and the store database (e.g., from an unencrypted host backup, disk image, or directory copy) can compute HMACs over on-chain $C_1 = r \cdot G$ points and reconstruct the full linkability index of historical and unbroadcast transactions.
3. **Cross-Device/Multi-Signer Collisions:** The randomness store is strictly local to one host installation. It cannot detect or prevent $r$-reuse across multiple distinct signer devices operating on behalf of the same XRPL account.
4. **Attacker-Supplied / Controlled Entropy:** If the host OS CSPRNG is completely broken or maliciously subverted to produce attacker-known entropy that does not repeat locally, the store cannot detect the predictability of $r$ or $\rho$.
5. **Protocol Decryption Mirrors:** It does not prevent balance and amount decryption by the issuer or auditor, which is structurally mandated by XLS-0096 (`P-9`).
6. **Bulletproof Blinding Randomness:** It does not track or guard the internal blinding scalars of the aggregated Bulletproof, which remain library-owned within mpt-crypto (`E-64, E-65`).
7. **Ledger-Side Acceptance of Duplicate $r$:** It provides no on-ledger protection; rippled accepts transactions with duplicate $r$ values without error (`E-63`).

---

### Ruling on Implementation Readiness

**Ruling: The signer may NOT be built against A1–A3 as they stand.**

The state machine is currently blocked by:
1. The unresolved contradiction between A1's pruning and A2's infinite monotonic growth (Finding B.1),
2. The absence of set/header-level integrity checks against truncation and rollback attacks (Finding B.2),
3. The lack of strict UI isolation and high-friction authentication for A3 store resets (Finding B.3),
4. Contradictory error handling instructions between §7 step 7 and A2 (Finding B.6).

Implementation may proceed only after these corrections are formally integrated into the state-machine specification.

---

# Stale or wrong in the packet

1. **Packet §A.3 Change 1 & ADR-0001 §(a) Premise on Option 2 Spending Authority:**
   - *Claim:* Packet §A.3 Change 1 asserts: *"Before: the ElGamal key was an independent secret. A page compromise cost confidentiality of amounts. It did not touch spending authority."*
   - *Correction:* This is **factually false**. In Option 2, the browser was always responsible for creating, signing, and submitting the outer XRPL transaction to the network. To submit a `ConfidentialMPTSend` or `ConfidentialMPTConvert`, the browser must hold the XRPL master seed or regular key in memory. Therefore, a page compromise under Option 2 *always* compromised account spending authority, even when the ElGamal key was completely independent.
2. **ADR-0001 §(a) Rev 3 Box — Stale npm Package Status:**
   - *Claim:* ADR-0001 §(a) (Attachment 1) states: `"- "no published package" — still true. @xrplf/mpt-crypto returns Not found on npm as at 2026-08-16 (E-32)."`
   - *Correction:* This is **stale and superseded**. `@xrplf/mpt-crypto@0.1.0` was published on npm on 2026-08-16T15:26:21Z (`E-53`). The claim that no published package exists is false.
3. **REVIEW-012 Attachment 4 §3 Domain Separation Table Mismatch:**
   - *Claim:* Attachment 4 §3 lists the domain labels for $r$ and $\rho$ as `"the WCONF-R-* / WCONF-RHO-* family"`.
   - *Correction:* This is **wrong**. REVIEW-010 Deliverable A explicitly specifies `LABEL = "WCONF-RANDOM-SCALAR-v1"`, `SALT = "WCONF-RANDOM-SCALAR-v1/HKDF-Extract-salt"`, `EXPAND = "WCONF-RANDOM-SCALAR-v1/HKDF-Expand"`, and role labels `"elgamal-r"` and `"balance-rho"`. No `WCONF-R-*` label family exists in the ruled $r$/$\rho$ KDF.
4. **REVIEW-012 Attachment 4 §2.1 Keypair Derivation Call:**
   - *Claim:* Attachment 4 §2.1 defines: `account_id = decodeAccountID(deriveAddress(deriveKeypair(family_seed).publicKey))`.
   - *Correction:* In `ripple-keypairs`, `deriveKeypair(family_seed)` defaults to `secp256k1`. For an `ed25519` family seed (e.g., Vector 2 `sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n`), calling `deriveKeypair(family_seed)` without passing `{ algorithm: 'ed25519' }` generates an invalid `secp256k1` keypair or throws. The prose must explicitly pass `seed_type` into `deriveKeypair`.
5. **ADR-0001 §(a) "Decision" & "Accepted Cost" Residual Justifications:**
   - *Claim:* ADR-0001 §(a) Decision item 2 claims Option 3 *"avoids making a WASM toolchain a prerequisite for milestone 1"*, and Accepted Cost states *"Revisit if a maintained WASM build appears."*
   - *Correction:* These statements are **stale**. The WASM build is published and verified (`E-31, E-53`). The native toolchain for Option 3 is now the path with active upstream blockers (Conan remote breakage `F-9`, unmerged Rust FFI crate drift `F-18`).
6. **ADR-0001 Rev 5 Box vs. Prior Revision Boxes on Preconditions:**
   - *Claim:* In ADR-0001 §"Before this ADR can be accepted" (Attachment 1), the text retains an older un-updated block claiming: *"Precondition 2 is half met... the keygen half remains unruled and is now the single largest thing between this ADR and Accepted"*, immediately followed by the Rev 5 box stating: *"Precondition 2... met today, both halves."*
   - *Correction:* The earlier paragraph was not struck or updated when Rev 5 was added, creating an internal contradiction within ADR-0001 on whether keygen is ruled.
