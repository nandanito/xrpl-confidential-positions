### 1. After the front page only

This site is a read-only research demo displaying a live Devnet snapshot to show what confidential token balances on the XRP Ledger actually hide and what they expose. XLS-96 is a proposed protocol extension that lets token holders keep their account balances and transfer amounts encrypted on-ledger, while still exposing transaction participants, timing, and deposit/withdrawal figures to the public—and all balances to the issuer. I would click the link that says "Read how it works" (or the first navigation link, "How it works") next to understand the underlying mechanics before inspecting the raw ledger data.

---

### 2. After the explainer

* **What a confidential transfer is:** An encrypted transaction format for Multi-Purpose Tokens (MPTs) on the XRP Ledger that uses zero-knowledge proofs and public-key encryption so balances and transfer values remain hidden from public observers while validators can still mathematically verify that the sender has sufficient funds.
* **How tokens go in, move, and come out, and visible amounts:**
  * **In (`Convert`):** Moves tokens from an account's normal public balance into a confidential balance; the amount converted is completely public, and this first step permanently registers the holder's encryption key.
  * **Move (`Send`):** Transfers an encrypted amount from one confidential balance to another; the amount transferred is hidden, but the sender and receiver addresses are public. The tokens land in an "inbox" and require a `MergeInbox` step to become spendable.
  * **Out (`ConvertBack`):** Moves tokens out of the confidential pool back into a public balance; the amount converted back is completely public on every transaction.
  * **Amounts visible to anyone:** All deposit amounts (`Convert`), all withdrawal amounts (`ConvertBack`), the token's total supply, the total token balance held across the entire confidential pool, and whenever an account balance is exactly zero due to initialization, inbox merging, or clawback.
* **Who can read a balance:** The token holder (using their private key), the token issuer (always, via a mandatory secondary encrypted copy), and an optional single auditor designated by the issuer. (Only the holder can spend it).
* **What the receivables facility example shows:** A real-world commercial use case (early supplier invoice financing) demonstrating that confidential transfers protect business-sensitive operational figures—individual credit lines, invoice drawdown sizes, and outstanding debts—while leaving high-level systemic metrics (the total financing pool, participant identities, and transaction dates) visible on-chain ("hides the shape of the book, not its size").
* **What the four test accounts are:** They are four standalone Devnet test accounts created during software development to test distinct technical implementations (active position, key derived from master seed, ed25519 signing, and an early test run). They do not represent the receivables facility itself.

---

### 3. Where you got lost

* **Term used before explained:**
  * **Quote:** `What confidential MPT on the XRP Ledger hides, and what it does not.` (Front page subtitle)
  * **Problem:** "MPT" is introduced without definition. A reader must wait until the explainer page to discover it stands for "Multi-Purpose Tokens (MPTs, XLS-33)".
  * **Smallest fix:** On the front page, write: "What confidential Multi-Purpose Tokens (MPT) on the XRP Ledger hide..."
* **Term never properly explained:**
  * **Quote:** `It arrives in the receiver’s inbox, and a MergeInbox moves it into their spending balance.`
  * **Problem:** Introduces an "inbox" and a `MergeInbox` operation without explaining why incoming confidential funds require an extra operational step to become spendable.
  * **Smallest fix:** Change to: "It arrives in the receiver’s inbox, and a separate claim transaction (`MergeInbox`) merges it into their spendable balance."
* **Term used before explained:**
  * **Quote:** `That a balance is exactly zero, in three cases: when it is first set up, when a MergeInbox empties the inbox, and after a clawback.`
  * **Problem:** "Clawback" is introduced under "Public, always" without explanation; only at the end of the page under "Limits" does the reader learn it is an issuer's forced destruction of funds.
  * **Smallest fix:** Change to: "...and after an issuer clawback (forced token revocation)."
* **Term out of place:**
  * **Quote:** `Signing happens only in wconf-signer , a separate program on the holder’s own machine, never in a web page.`
  * **Problem:** Spurious internal tool name dropped into an overview with no setup (and has an errant space before the comma).
  * **Smallest fix:** Change to: "Signing happens only in a local command-line tool (`wconf-signer`), never in a web page."
* **Sentence read twice:**
  * **Quote:** `The copies are for the sender, the receiver, the issuer and any auditor.`
  * **Problem:** "The copies" refers back across a complex sentence describing zero-knowledge proofs and ciphertexts ("every encrypted copy of the amount is the same number"), making the reference ambiguous on first pass.
  * **Smallest fix:** Change to: "Separate encrypted copies of the transaction amount are created for the sender, the receiver, the issuer, and any auditor."
* **Jarring order / bait-and-switch:**
  * **Quote:** `These pages do not show the facility. They read four Devnet test accounts that hold one demo token, made by this project while it was being built...`
  * **Problem:** The reader spends several paragraphs understanding the receivables facility, assuming the site demonstrates it, only to be told at the very end of the section that the site shows something completely different.
  * **Smallest fix:** Move this disclaimer to the very top of the section: "The example below illustrates the concept using a simulated receivables facility recorded in the repository; the live pages on this site instead display four basic test accounts."

---

### 4. Misreadings

* **Stronger claim on privacy:**
  * **Quote:** `XLS-96, Confidential Transfers, lets a token holder keep their balance encrypted on the public XRP Ledger.` (Front page)
  * **First read:** Assumed this offered general, end-to-end cryptographic privacy (similar to privacy coins like Monero or Zcash).
  * **Correction:** The issuer can always see every balance, an auditor can see every balance, zero-balances leak publicly, and Convert/ConvertBack transactions allow observers to deduce or tightly bound hidden balances.
  * **Smallest fix:** Change to: "XLS-96, Confidential Transfers, lets a token holder keep their balance encrypted from the public on the XRP Ledger (while remaining visible to the issuer)."
* **Weaker claim on issuer visibility (Direct contradiction):**
  * **Quote:** `What the issuer sees: the issuer’s encrypted copy of each balance, without the figure.` (Front page, "Where to go")
  * **First read:** Read as: the issuer *cannot* see the actual balance figure ("without the figure"), contradicting the earlier statement `The issuer: Can always read every balance. No setting turns this off.`
  * **Correction:** The site meant that the on-ledger data stores an encrypted copy rather than plaintext, or that the web page UI displays raw ciphertext.
  * **Smallest fix:** Change to: "What the issuer sees: the on-ledger encrypted records that only the issuer has the keys to decrypt into plain figures."
* **Stronger claim on holder sovereignty:**
  * **Quote:** `Only the holder can spend. A Send’s proof cannot be made without the holder’s key.`
  * **First read:** The holder has uncompromised, unilateral custody and control of their tokens.
  * **Correction:** Later under "Limits", the page notes that issuers can unilaterally freeze accounts or initiate clawbacks that completely destroy the holder's balance without consent.
  * **Smallest fix:** Change to: "Only the holder can initiate a transfer (though the issuer may retain flags to freeze or destroy the balance)."
* **Stronger claim on zero-balance leakage:**
  * **Quote:** `Hidden: Each holder’s balance, though some zero balances are recognisable...` (Front page)
  * **First read:** Thought zero-balance recognition was an occasional edge-case or minor side-channel leak.
  * **Correction:** It is deterministic: *every* freshly created account, *every* account whose inbox is merged, and *every* clawed-back account visibly leaks that its balance is zero.
  * **Smallest fix:** Change to: "Hidden: Each holder’s balance (except newly created, emptied, or clawed-back balances, which are identifiably zero)."
* **Ambiguous claim on system safety / readiness:**
  * **Quote:** `Devnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)`
  * **First read:** Unclear whether XLS-96 itself is considered broken/insecure, or if the warning applies solely to this experimental demonstration UI and local signing script.
  * **Smallest fix:** Change to: "Experimental demonstration software: unaudited, not production-ready, and not safe for real financial value."

---

### 5. What is missing and what could be cut

* **What is missing:**
  * **Commercial rationale:** The front page jumps immediately into cryptographic mechanics without a single sentence explaining *why* an institution would want this (e.g., preventing competitors from spying on settlement volumes or trade pricing).
    * *Smallest fix:* Add to the top summary: "In enterprise blockchain settlement, organizations need to transact on a shared ledger without revealing proprietary commercial amounts to competitors or public observers."
  * **Explanation of "Dedicated Account":**
    * *Quote:* `A Dedicated Account, an ordinary XRPL account, converts the whole float into confidential form in one Convert.`
    * *Problem:* Capitalizing "Dedicated Account" implies it is an XRPL primitive or protocol type.
    * *Smallest fix:* Change to lowercase with context: "an operational treasury account (an ordinary XRPL account designated for the facility)..."
  * **Contextual bridge for the 4 test accounts:** The reader is told the site displays four test accounts, but never told what question those accounts answer or what to look for when viewing them.
    * *Smallest fix:* Add: "Use the navigation links above to inspect how these four test accounts appear to a public ledger observer versus the token issuer."
* **What could be cut without loss:**
  * **Gate verdict debug text:**
    * *Quote:* `Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.`
    * *Problem:* Pure internal build/test-pipeline diagnostic text that provides zero value to an external reader and clutters the page footer.
    * *Smallest fix:* Remove the entire "Gate verdict" paragraph.
  * **Unlinked claims register codes in the body:**
    * *Quote:* `Sources: E-1; tools/check-amendments.ts, run 2026-10-21` and `Sources: P-4, P-11, F-24, F-1, E-211, R-1`
    * *Problem:* Clutters every explanatory section with unexplained citations to internal files.
    * *Smallest fix:* Remove inline `Sources:` blocks and place a single note in the footer: "All cryptographic statements are verified against test cases in the project's CLAIMS register."
  * **Redundant build/run caveats on the front page:**
    * *Quote:* `The README’s “Run it” explains how to build it and run the local version of this site. It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs.`
    * *Problem:* Excessively specific about what documentation the repo is currently missing.
    * *Smallest fix:* Change to: "To run transactions locally, refer to the repository README."

---

### 6. The front page

* **Length:** It is sufficiently short, concise, and structured well enough to read without scrolling fatigue.
* **Navigation clarity:** It points to the explainer, but does so redundantly in two competing places: an inline text link (`New to this? Read how it works`) and immediately below as the first bullet under `Where to go` (`How it works: confidential transfers in plain words...`).
  * *Smallest fix:* Remove the separate `New to this?` text line and make the first bullet under "Where to go" visually distinct as the primary starting point.
* **"What it never claims" section (and P-4 style codes):**
  * The actual substance of this list is outstanding—it immediately dispels hype and clarifies the strict limits of the technology (identities are public, timing is public, issuer sees all, no key rotation).
  * However, the alphanumerical codes (`P-4`, `P-9`, `P-10`, `F-1`, `F-24`, `P-5`) and the citation to `CLAIMS.md` are distracting noise to a newcomer. They look like unresolved Jira tickets or internal requirements traceability tags.
  * *Smallest fix:* Delete the prefixes (`P-4`, `F-1`, etc.) and the footer reference `Each label is a row in the repository’s CLAIMS.md.`, presenting the items as clean bullet points under the heading "Explicit Non-Goals & Boundaries".

END OF LEG B REPORT
