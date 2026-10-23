### 1. After the LinkedIn post only

* **Is confidential transfer possible on the XRP Ledger, and with what limits?**  
  Yes, but currently only on the Devnet test network under the proposed XLS-96 amendment, not on Mainnet or Testnet. It provides narrow privacy: it encrypts holder balances and peer-to-peer transfer amounts, but leaves counterparties, transaction timing, conversion amounts into/out of confidential form, certain zero balances, and total float completely public, while the issuer can always see every balance and no key recovery exists.
* **Would you click through, and why or why not?**  
  Yes. In commercial finance, confidentiality is a prerequisite for moving real-world assets onto public ledgers. The post is compelling because it avoids crypto marketing hype, immediately establishes strict limits on privacy, admits lack of audit/production readiness, and cites concrete upstream technical contributions.
* **What do you think the author is claiming to have done?**  
  The author claims to have implemented the core ledger logic of a receivables financing facility on Devnet using XLS-96, empirically tested what an external observer can and cannot see on-ledger, uncovered discrepancies between the specification/documentation and live network behavior, and submitted 11 bug reports and fixes upstream to XRPLF repositories.

---

### 2. After the blog post

* **What is hidden and what is public:**  
  *Hidden:* Individual account balances and the exact amounts transferred during a confidential `Send`. In the receivables facility, each supplier's credit limit, the size of individual drawdowns and repayments, and each supplier’s outstanding balance remain hidden.  
  *Public:* The transaction graph (sender, receiver, timestamp, and frequency), all amounts converted into or out of confidential form (`Convert` and `ConvertBack`), total token supply, total confidential pool size, specific zero balances (newly initialized accounts, freshly emptied inboxes, and clawed-back balances), the total facility float, and each tranche retirement amount.
* **Who can read a balance and who can spend it:**  
  *Read:* The balance holder, the token issuer (who holds an unavoidable ElGamal decryption copy for every account), and an optional single designated auditor if configured at token creation.  
  *Spend:* Exclusively the possessor of the holder’s encryption secret (required to construct the zero-knowledge proofs). The issuer cannot spend a holder's balance, but can destroy it via clawback or freeze it via ledger flags if permitted.
* **What happens if a key is lost:**  
  The funds are permanently lost and unspendable. XLS-96 lacks key rotation or recovery mechanisms, and the proposed XLS-99 standard is not yet supported on any live network. The only recourse is an issuer clawback, which permanently destroys the tokens without returning them.
* **What the receivables facility example shows and does not show:**  
  *Shows:* That the sequential lifecycle of an on-ledger confidential credit facility (float funding, supplier drawdowns, repayments, and tranche retirements) can be constructed and validated by `rippled` on Devnet, proving that macro cash flows can be published while hiding micro-level counterparty balances.  
  *Does not show:* How real-world key custody and multi-party separation would work (a single test script acted as bank and all suppliers holding all seeds), whether it runs against a private local node (it relied on a public Devnet cluster), or how to separate viewing rights from spending rights on the Dedicated Account.
* **What went upstream and what happened to it:**  
  The author submitted 11 issues across four XRPLF repositories:
  * 4 resolved in September (spec corrections incorporated into final XLS-96; English documentation corrected regarding zero-balance indistinguishability).
  * 1 build fix (`mpt-crypto` OpenSSL dependency pinning) merged to main on 2026-10-21, awaiting release.
  * 1 pull request approved to expose the zero-encryption calculation in JavaScript/WASM, awaiting merge.
  * 3 issues filed on 2026-10-18 against `mpt-crypto` (nonce scope ambiguity, toolchain build failure, proof size calculation discrepancy) awaiting responses.
  * 1 architectural question to XRPL-Standards regarding vault accounting, unanswered after 57 days.
  * 1 "positives-only" issue closed immediately by `rippled` maintainers for failing to use bug report templates.
* **What the three reviews of the code are:**  
  Here the post fails the reader through ambiguous phrasing. Under the heading *"What went upstream"*, the post states *"Three reviews of this code exist"*, referring to external audits of *upstream/XRPLF code*: (1) Trail of Bits' April 2026 report, (2) the Sherlock XRP Ledger Attackathon, and (3) a Zellic scan of `mpt-crypto`. Conversely, reviews of the author’s *own* project code were not traditional audits at all; they were automated review rounds conducted by other AI models (Codex, Gemini) and separate Claude sessions across 61 internal review records.

---

### 3. Where you got lost

* **Terms used before explained, or never explained:**
  * `"Multi-Purpose Tokens (MPTs, XLS-33) are one of its token types."`  
    *MPT* is never explained. A reader unfamiliar with XRPL does not know what an MPT is, what properties it has, or how it differs from standard issued currencies.
  * `"Each confidential balance is an ElGamal ciphertext."`  
    *ElGamal ciphertext* is introduced without explaining that ElGamal is an asymmetric encryption scheme that supports public-key encryption and dual-recipient encryption (which explains why the issuer can also decrypt it).
  * `"Tess Dore and Murat Cenk's compact sigma protocol"` / `"The compact sigma protocol behind its send proof..."`  
    *Sigma protocol* is never defined or explained as the underlying zero-knowledge proof technique.
  * `"- MergeInbox moves what a holder has received into the balance they can spend."`  
    The concept of an "inbox" is never introduced before this bullet. A reader does not know why incoming funds land in a distinct inbox rather than directly into the spendable balance, nor why a separate transaction is required to merge them.
  * `"If the token allows clawback, the issuer can destroy it..."`  
    *Clawback* is used without clarifying that it is an XRPL-specific token feature allowing issuers to unilaterally seize or revoke balances.
  * `"A Dedicated Account, an ordinary XRPL account, holds the float..."`  
    Capitalized as if *Dedicated Account* is an XRPL protocol primitive or smart contract type, rather than merely an operational convention chosen by the author.
  * `"A tec result is applied to the ledger. ... a plain Payment that fails with tecNO_AUTH:"`  
    *tec* and *tecNO_AUTH* are completely unexplained. A newcomer has no idea that `tec` represents an XRPL transaction engine error code that still consumes fees and mutates ledger state.
  * `"...whether a confidential balance is meant to stay invisible to vault accounting..."`  
    *Vault accounting* is introduced out of nowhere with zero context as to what vaults are on the XRPL.

* **Sentences read twice:**
  * `"Read on 2026-10-22 at 03:25 UTC, its amendment, ConfidentialTransfer, was enabled on Devnet, and supported but not enabled on Mainnet and Testnet."`  
    The opening participle "Read on..." reads awkwardly like an instruction or truncated sentence before you realize it means "As observed on...".
  * `"Three reviews of this code exist. Trail of Bits' April 2026 report is the one I could read and check my findings against; a later revision of it could not be obtained."`  
    The antecedent of "this code" is thoroughly confusing. Having just discussed the author's own project and upstream repositories, it sounds like Trail of Bits reviewed the author's project, when it actually reviewed upstream `mpt-crypto`.
  * `"One fails when an observation filed or graded for upstream says a source does not say something, without the search recorded beside it."`  
    The layered double-negatives and internal jargon ("graded for upstream", "says a source does not say something") require multiple passes to parse.

* **Anything in the wrong order:**
  * **Placement of upstream audit mentions:** The paragraph discussing the Trail of Bits, Sherlock, and Zellic reviews is buried at the end of *"What went upstream"*. It belongs either in an introductory background section on XLS-96 or clearly segregated from the section *"What the reviews caught"*, which discussed AI reviews of the author's code.
  * **Error handling / `tec` failure risks:** The critical privacy revelation—that failed `tec` transactions permanently publish ciphertexts encrypted to bad recipient keys on-ledger—is placed under *"Reading the specification, and running it"* rather than under *"What it hides, and what it does not"*.

---

### 4. Where it reads stronger than it should

* **Misleading impressions of security, audits, and privacy:**
  * *"Three reviews of this code exist. Trail of Bits' April 2026 report is the one I could read and check my findings against..."*  
    Calling upstream libraries *"this code"* strongly implies that the author's codebase has been audited by Trail of Bits, Sherlock, and Zellic.
  * *"Design decisions and fixes went through rounds of adversarial review."*  
    The term *"adversarial review"* strongly connotes formal third-party security audits, red-teaming, or penetration testing, rather than automated prompting across LLM sessions (Claude, Codex, Gemini).
  * *"It hides the shape of the book, not its size."*  
    In credit facilities, the "shape of the book" includes the network graph: who the borrower counterparties are, when they borrow, and borrowing frequency. Because all counterparties, transaction timestamps, and activity patterns are public, the facility only hides the *values/amounts*, not the structural shape of borrowing activity.

* **Direct contradictions:**
  * **Audited status:**  
    *Sentence 1:* `*Status, before anything else: this is a research project on the XRP Ledger's Devnet test network. It is not audited, not production-ready, and not safe to put value behind.*`  
    *Sentence 2:* `Three reviews of this code exist. Trail of Bits' April 2026 report is the one I could read and check my findings against; a later revision of it could not be obtained.`
  * **What "shape of the book" means:**  
    *Sentence 1:* `It hides the shape of the book, not its size.`  
    *Sentence 2:* `Which supplier drew, and when, is public.` (reinforced by: `They can see which suppliers enrolled, who drew and repaid, on which days, and how often.`)
  * **Web tier safety and keys:**  
    *Sentence 1:* `The demo is static pages built from one snapshot of Devnet. It signs nothing and holds no keys.`  
    *Sentence 2:* `I had written that a read-only web tier "moves no trust boundary". It added no signing authority. But it re-served, to any local user, data the project protects with file permissions (E-230).` (and: `A hostile process running as the same user can read the encryption secret out of memory.`)

---

### 5. What to cut

* **Paragraphs to cut or skim:**
  * **The CI / claims checking meta-tooling:** The entire section *"Checks that catch a false sentence"* (describing internal CI scripts that catch retracted phrases, check register indexes, or enforce recorded searches for negative assertions) is self-referential process overhead. It tells the reader about the author's personal workflow hygiene rather than the technology.
  * **The Content Security Policy anecdote:** Under *"What the reviews caught"*, the paragraph detailing how browser parsing invalidated inline script hashes for a Content Security Policy (`E-334`) is generic web front-end debugging completely irrelevant to confidential blockchain transactions.
  * **The "positives-only" bug report anecdote:** The anecdote about filing praise to `rippled` and having it closed without comment is GitHub social trivia that dilutes the technical findings.
  * **Translation lag:** The sentence noting that the Japanese documentation translation lags behind the English version is trivial.

* **What was missing:**
  * **A concrete transaction breakdown:** A side-by-side visual or field comparison showing what an observer actually sees in a raw XRPL transaction object (e.g., public metadata vs. ElGamal ciphertext fields).
  * **An explanation of the `MergeInbox` mechanism:** Why an inbox is necessary, why funds do not land directly into spendable balances, and what friction this imposes on holders.
  * **Explicit separation between AI reviews and security audits:** A clear sentence stating that the author's code has *never* been audited by humans, and that the cited Trail of Bits report evaluated Ripple's underlying cryptography library, not W-CONF.
  * **Performance and operational overhead:** Practical data on proof generation time, proof verification latency on Devnet nodes, and transaction fee costs relative to standard XRPL payments.

END OF LEG B REPORT
