# REVIEW-039a — the fresh reader (no context, entry points only)

- **Rotation:** `REVIEW-039` — the publication rotation
- **Date:** 2026-09-04
- **Subject:** the repository as a PUBLIC artifact, at `7d7149c`
- **Access:** DOCUMENT TEXT ONLY — README, GETTING-STARTED, web/README, facility/README. No repository, no prior knowledge.
- **Packet:** `docs/reviews/REVIEW-039-packets/packet-a-fresh-reader.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-039d`.**

---

### 1. What has this project actually built? What runs today?

This project has built a research prototype and single-machine demonstration that exercises the proposed XRP Ledger confidential token standard (XLS-96) within a simulated receivables financing workflow. 

Specifically, what exists and runs today is:
* **A local signer binary written in Rust (`signer/`)**: It runs on the user’s machine, derives an ElGamal private key from an XRPL account master seed, generates zero-knowledge proofs (compact sigma proofs and Bulletproofs), signs confidential token transactions, and displays a local confirmation screen. It communicates with callers strictly over a Unix domain socket and refuses to connect to anything other than XRPL Devnet.
* **A facility test driver in TypeScript (`facility/` via Bun)**: A script (`run-facility.ts`) simulating a receivables financing facility (a bank, a dedicated holding account, and suppliers). It manages an off-ledger tracking book to predict balances, coordinates with the signer to obtain signed blobs, and submits transactions to Devnet.
* **A read-only local web dashboard (`web/`)**: An Elysia API server and a React/TanStack Start frontend displaying ledger status, observer views, and a snapshot of decrypted issuer balances.
* **Test suites and integrity check scripts (`tools/`)**: A collection of gates and tests asserting that read-only tiers do not sign, that endpoints are loopback, and that claims match documented findings.

**What actually runs today** is a local simulation on a single computer against public XRPL Devnet. It has successfully executed and validated 28 facility transactions (31 total) on Devnet. However, it runs as a single process/environment holding all parties' seeds simultaneously—it is an empirical test harness, not a distributed application.

---

### 2. What does it claim is hidden, and from whom?

The text is explicit that the protocol hides far less than the word "confidential" implies:

* **What is hidden:**
  * **Confidential transfer amounts**: The amount sent in a `ConfidentialMPTSend` is encrypted.
  * **Individual holder balances**: The spending balance and inbox balance of a holder on-ledger are ciphertexts.
  * **Bilateral terms between counterparties**: One supplier cannot see another supplier’s credit line, drawdown amount, or outstanding balance.
  * *Hidden from:* Outside public ledger observers and other counterparties/suppliers.

* **What is visible to the public (everyone):**
  * **All conversion amounts in plaintext**: `Convert` (entering confidential form) and `ConvertBack` (leaving confidential form) publish their exact figures in the clear. Every retirement tranche size is completely public.
  * **Transaction participants**: Who pays whom is never hidden.
  * **Timing and frequency**: The fact, exact timestamp, and frequency of every transaction are public, revealing trading patterns.
  * **Total balances**: Total supply and total confidential outstanding amount are public.
  * **Initial zero balances**: A freshly initialized account carries a canonical "encrypted zero" that anyone can recognize on sight, making initial enrollment publicly detectable (though balances spent down to zero become randomized ciphertexts).
  * **Arithmetic leakage**: Because entry and exit amounts are public in the clear, observers can deduce internal transfer volumes through simple arithmetic if conversions are tracked.

* **What is visible to the issuer (the bank) and auditor:**
  * **Everything**: Every confidential balance mandatory-mirrors its ciphertext under the issuer’s public key. The issuer can decrypt every participant's balance at all times. Privacy from the issuer does not exist. An auditor, if designated, can also decrypt all balances.

---

### 3. Would you describe this as secure? Why or why not — and what in the text led you there?

**No, I would not describe this as secure**, and the text itself explicitly states that calling it secure is forbidden (standing rule P-5). 

Several core points in the text led me to this conclusion:
* **The threat model assumes same-host isolation that does not exist:** The boundary between the browser/UI and the signer relies on Unix domain sockets, but the project’s threat model explicitly includes a hostile process running under the same user UID. The text admits that any such process can simply read the ElGamal secret key (`sk_A`) directly out of process memory, rendering the signer and its confirmation window useless.
* **The demonstration had to break its own primary safety rule:** The architecture established that ledger reads must come from a trusted local loopback node to prevent malicious remote nodes from substituting destination public keys (which causes funds to be encrypted to an attacker). However, the team could not get a local rippled node to sync on their machine, so every live run bypassed this check using an environment variable risk-acceptance override to talk to a remote public node.
* **Submission failure leaks ciphertexts permanently:** If a confidential transaction fails with an applied transaction code (`tec`), the transaction and its ciphertexts are permanently written to the public ledger. Preventing this depends on setting the `fail_hard` flag during submission, but the signer cannot enforce this—it depends entirely on whether the submitting client remembers to pass the flag.
* **Unauthenticated local data exposure:** The read-only web server was found to serve decrypted issuer balances and signer status unauthenticated over local HTTP, bypassing local filesystem file permissions.
* **Irreversible loss and clawback:** There is no key rotation or key recovery in XLS-96. If a user loses their key, the balance is permanently locked. Furthermore, the issuances created in this project explicitly enable clawback flags (`Flags=224`), meaning the issuer can unilaterally destroy any participant's balance at will.

---

### 4. Who has to be trusted for this to work? List every party.

1. **The Issuer (Bank)**: Must be trusted completely. The issuer can decrypt every holder's balance at all times, can unilaterally burn any holder's balance via clawback without consent, and controls permissioned settings.
2. **The Auditor (if named)**: Must be trusted with complete visibility, as they can also decrypt all balances.
3. **The Transaction Submitter**: Must be trusted to always apply `fail_hard` upon submission; otherwise, failing transactions will commit unverified or poisoned ciphertexts to the ledger.
4. **The Ledger Node / RPC Endpoint**: Must be trusted to return honest ledger data and true public keys. A lying node can provide a substituted destination key, causing the signer to generate proofs and ciphertexts encrypted to an attacker.
5. **The Local Host / Same-User Environment**: Must be trusted to be completely uncompromised, as any local process running under the same account can inspect process memory to extract `sk_A`, read unauthenticated loopback endpoints, or tamper with build artifacts in `/tmp/wconf`.
6. **The Facility Driver (in this test build)**: Must be trusted because it holds the private master seeds for the bank, the Dedicated Account, and every supplier simultaneously.
7. **The Upstream Cryptography & Spec Authors**: The authors of XLS-96, `mpt-crypto`, and the underlying Bulletproof/sigma protocols, as well as the authors' custom, non-standardized master-seed-to-ElGamal key derivation algorithm.

---

### 5. What is finished and what is not? If you were asked to summarise its maturity in one sentence to a colleague, what would you say?

* **What is finished:**
  * Proof-of-concept cryptographic pipeline linking Rust, C, and WebAssembly to generate and verify XLS-96 compact sigma proofs and Bulletproofs.
  * A working signer binary enforcing Devnet restrictions and local confirmation dialogs.
  * A fully simulated receivables lifecycle (enrolment, drawdown, repayment, tranches) executed and validated against XRPL Devnet across 28 transactions.
  * An off-ledger balance book that makes linear-search balance decryption practical.
  * A read-only web interface and observer dashboard.
  * Thorough documentation of XLS-96 protocol quirks, upstream bugs, and disclosure realities.

* **What is not finished:**
  * Distributed multi-party execution (there is no deployment across separate machines; one script runs all roles).
  * Real key management and custody (no hardware wallet or secure enclave integration).
  * Local loopback node operation (the team failed to run a synced node locally and had to bypass it).
  * Compliance and permissioning features (XLS-70 credentials and XLS-80 permissioned domains are completely omitted).
  * Standardized key derivation (the derivation of ElGamal keys from XRPL seeds is proprietary to this repo and locks users in).
  * Production security, audits, or mainnet readiness.

* **One-sentence summary for a colleague:**
  > "It is a meticulously self-critical research spike and Devnet test harness proving how XRPL's proposed confidential tokens work in practice, but it runs as a single-machine simulation and is nowhere near an audited, deployable system."

---

### 6. What did you find surprising, confusing, or contradictory? Anything you had to read twice.

1. **The "Confidentiality" Paradox at the Entry/Exit:** I had to re-read the disclosure section twice because it seemed contradictory to call a facility "confidential" when entering (`Convert`) and exiting (`ConvertBack`) publish every single amount in plaintext on the public ledger. Retiring the facility in tranches reveals the exact size of every tranche. The privacy only exists for transfers that occur strictly inside the confidential state.
2. **The "Canonical Zero" vs. "Randomized Zero" Asymmetry:** It was surprising that an account with zero balance has two completely different cryptographic appearances: a brand-new account holds a publicly recognizable "canonical zero" (revealing to everyone that an account just enrolled), whereas an account that spent its balance down to zero holds a randomized ciphertext that looks identical to an active balance.
3. **The Issuer Clawback Flag (`Flags=224`):** It was startling to read that while building a privacy-preserving financial facility, the code explicitly configures the token issuance with `tfMPTCanClawback`, leaving every supplier vulnerable to having their entire balance burned at the bank's unilateral whim.
4. **The Loopback Irony:** The documents spend significant time explaining why reading from a remote node is an existential security flaw (F-23), mandate a loopback node, and write gates to enforce it—only to reveal that they could never actually get a local node to sync on their hardware, meaning 100% of their live Devnet runs used an environment-variable bypass to hit a remote node anyway.
5. **Decryption by Brute Force Search:** Learning that decrypting an ElGamal balance requires solving a discrete logarithm via a linear search—and that without their off-ledger helper book, recovering a balance requires brute-forcing through a window of candidate values—was an unexpected protocol reality.
6. **Obsessive Meta-Auditing of Documentation:** I had to read several sections twice because the authors spend extraordinary effort correcting past minor phrasing errors, out-of-date gate counts (e.g., arguing whether there were five, six, or nine gates), and misattributed issue citations right in the middle of architectural explanations.

---

### The Three Most Influential Sentences

#### 1. On the true extent of confidentiality:
> *"The answer: it hides the amount of a confidential transfer, and balances — and nothing else. Converting in or out publishes the amount in plaintext, every time; only a Send hides one, so the figure entering confidential form and every figure leaving it are public forever."*
* **What I took it to mean:** The privacy promise of XLS-96 is narrow. It does not provide transaction anonymity, graph obfuscation, or private deposits/withdrawals. Anyone watching the public ledger can see who is transacting, when they transact, how often, and the exact sums entering and leaving the system.

#### 2. On the actual state of deployment and custody:
> *"One process plays the bank, the Dedicated Account and every supplier, and therefore holds every seed … every security property that depends on the separation is not demonstrated here."*
* **What I took it to mean:** Despite elaborate diagrams of independent signers, socket grants, and multi-tier architectures, the live system is currently just a monolithic test script playing all characters at once on one machine. Real-world custody, hostile counterparty boundaries, and decentralized operation have not been tested.

#### 3. On the reality of the security posture:
> *"A hostile same-host process is inside this project's threat model by ruling … It does not defeat an adversary who already has code execution — that adversary reads sk_A out of process memory. P-5 forbids calling any of this secure."*
* **What I took it to mean:** The local boundaries (like UDS and isolated confirmation screens) only defend against a very narrow class of browser-origin attacks; they provide zero defense against any other program or malware running under the same user account, because private keys are exposed in RAM. Under the project's own definitions, the software is fundamentally not secure.
