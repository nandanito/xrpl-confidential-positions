# RULING — `CLAIMS.md` B-15: Ledger Read Endpoint Architecture

---

### **THE RULING**

> **ONE endpoint is ACCEPTABLE for the Devnet research artifact.** Multi-endpoint corroboration on Devnet is **REJECTED as security theatre**. 
>
> The read path must remain a single endpoint, the trust assumption must be stated in `CLAIMS.md` and in the CLI startup banner as an explicit security boundary axiom, and loopback must remain the privileged transport.

---

## 1. One Endpoint vs. Corroboration

**Ruling:** Corroboration is **not required and should not be built**.

### Why Corroboration is Theatre on Devnet:
1. **Lack of Independent Trust Roots:** Devnet infrastructure is operated almost entirely by Ripple (`s.devnet.rippletest.net`). Querying two distinct URLs or hitting round-robin nodes (e.g. `FUSS` vs `JUTE`) queries different frontend processes in the *same* trust domain. A compromised or hostile Devnet infrastructure compromises all Devnet endpoints simultaneously.
2. **Local Adversary Model:** The threat model assumes a local attacker capable of altering runtime environment / configuration. If an attacker can point `LEDGER_URL_1` to a rogue node, they will point `LEDGER_URL_2` to the same rogue node.
3. **No Cryptographic Grounding:** Without state tree inclusion proofs (Merkle/SHAMap paths signed by a UNL quorum), two endpoints returning matching data only proves that two nodes agree, not that the data is true.
4. **Operational Failure Modes:** Devnet nodes routinely experience ledger desync, gossip latency, or close ledgers at slightly different milliseconds. Corroborating across two remote nodes introduces transient disagreement aborts without buying cryptographic authenticity.

---

## 2. What Must Be Said Out Loud (And Where)

Because this project prohibits claiming more security than is delivered, the ledger read trust model must be declared as a **foundational trust assumption**.

### The Required Wording for `CLAIMS.md`:
> **B-15 (Ledger Source Trust Boundary):** The signer treats the chosen RPC endpoint as an authoritative, trusted source for public ledger state. Because rippled `ledger_entry` RPC does not return Merkle inclusion proofs against a validated UNL-signed ledger header, this signer **cannot cryptographically verify** the authenticity of the destination's `HolderEncryptionKey` or the issuer's `IssuerEncryptionKey`. 
>
> **Consequence (F-23):** A hostile or compromised RPC endpoint that supplies an adversarial public key for the destination or issuer will cause transaction failure with `tecBAD_PROOF`. Because `tec` transactions are permanently recorded on-ledger, **the transfer amount ciphertext encrypted under the adversary's key is permanently published on the ledger and decrypted by the adversary.**
>
> **Mitigation Boundary:** Non-loopback endpoints require TLS (channel integrity only). Absolute defense against adversarial ledger injection requires running a trusted `rippled` instance on loopback (`localhost` / `127.0.0.1`).

### Where It Must Appear:
1. **`CLAIMS.md`**: Under B-15 and linked from F-23.
2. **`ledger/mod.rs` (or `source.rs`)**: In the crate architecture documentation.
3. **Signer Startup / Confirmation Screen**: If the configured endpoint is non-loopback, a one-line notice must be displayed:
   `Ledger source is remote (TLS channel only; ledger integrity delegated to node operator).`

---

## 3. Third Options Evaluated

| Option | Mechanics | Cost / Trade-off | Verdict |
|---|---|---|---|
| **A. Trust-on-First-Use (TOFU) Pinning** | Local cache mapping `(AccountID, IssuanceID) -> HolderEncryptionKey`. Refuses if key changes without user override. | High state complexity. Protects repeat sends; **does zero for the initial send** (which is when the adversary strikes). Key rotations become breaking UX. | **Reject** (false security on first send). |
| **B. Human Key Fingerprint Confirmation** | Display truncated hash (e.g. SHA-256 `[4a7b:c89e]`) of destination key on confirmation UI alongside the amount. | Minimal code cost. Places verification burden on human operator via an out-of-band channel. On Devnet, humans will blind-approve. | **Optional / Informational only** (render in UI if space permits, do not rely on it as a gate). |
| **C. Loopback-Only by Default** | Signer refuses remote endpoints unless an explicit `--insecure-remote-node` CLI flag is passed. | Heavy friction for Devnet users who do not want to run a 20GB+ RAM local rippled Devnet node. | **Reject for Devnet research; Adopt for production.** |

---

## 4. Scoping: Research Artifact vs. Production Facility

| Dimension | Research Artifact (Devnet) | Production Facility (Future Mainnet/Enterprise) |
|---|---|---|
| **Topology** | Single endpoint (remote or local). | **Loopback rippled mandatory**, or verified hardware enclave with attested proxy. |
| **Integrity Model** | Channel TLS + local account anchor check (`HolderEncryptionKey` self-check). | Full node validation on-host (or cryptographic state-tree light-client proofs if added to rippled). |
| **Key Authentication** | Unauthenticated remote read for counterparty keys. | Local address book with pre-shared / signed counterparty key bindings. |
| **Submission Isolation** | External submitter (cannot enforce `tapFailHard`). | Integrated submission with mandatory `tapFailHard` so `tecBAD_PROOF` drops at broadcast rather than inclusion. |

---

## 5. Confidence & Named Judgement

* **Confidence Score:** **9.8 / 10**
* **The Named Judgement:** **"The Corroboration Fallacy on Centralized Testbeds."**
  * *Judgement:* In a network where RPC infrastructure lacks Byzantine diversity and the client protocol lacks Merkle inclusion proofs, adding a second RPC request adds latency and false aborts while providing zero game-theoretic security against an active adversary. 
  * Trusting the operator's chosen single node while loudly documenting the exact cryptographic and confidentiality cost of a lying node is the only honest architectural choice.
