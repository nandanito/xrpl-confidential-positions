### 1. After the LinkedIn post only

Confidential transfer is currently possible on the XRP Ledger only on its Devnet test network under standard XLS-96, and is not enabled on Mainnet or Testnet. It hides only account balances and transfer amounts between confidential accounts, while publicly exposing participant identities, transaction timing and frequency, all conversions into or out of confidential form, certain zero balances, and every balance to the token issuer without any key recovery or rotation. The author claims to have built and executed a prototype receivables financing facility on Devnet to test these privacy boundaries in practice, while submitting eleven technical issues back to upstream XRPLF repositories.

---

### 2. After the blog post

* **What is hidden and what is public:**
  * *Hidden:* Individual confidential balances and the specific transfer amounts during a confidential `Send`.
  * *Public:* The sender and receiver of every transfer, transaction timestamps and frequency, every amount converted into (`Convert`) or out of (`ConvertBack`) confidential status, total token supply, total supply held in confidential form, zero balances in three specific situations (new balance, freshly emptied inbox, or clawed-back position), and public mathematical bounds that constrain hidden balances when conversions in and out are observed.
* **Who can read a balance and who can spend it:**
  * *Read:* The holder, the token issuer (always, via a second ciphertext copy that cannot be turned off), and a single optional designated auditor.
  * *Spend:* Only the party holding the holder's encryption private secret (used to generate zero-knowledge proofs). The issuer cannot spend a holder's balance, but can freeze balances if locking is enabled, or permanently destroy balances via clawback.
* **What happens if a key is lost:**
  * The balance is permanently locked and unspendable; XLS-96 has no key rotation or recovery mechanisms (a draft standard, XLS-99, proposes them but is completely unsupported). The only available recourse is an issuer clawback, which destroys the balance entirely rather than restoring it.
* **What the receivables facility shows and does not show:**
  * *Shows:* The size of the initial float, which suppliers enrolled along with the public fees paid at enrolment, the dates and frequency of all drawdowns and repayments, and the exact plaintext amount of every capital retirement tranche.
  * *Does not show:* Each supplier's credit limit, the size of individual drawdowns or repayments, and what each supplier currently owes (though the issuing bank sees all of this).
* **What went upstream and what happened to it:**
  * Eleven issues were filed across four XRPLF repositories:
    * Four resolved in September 2026 (three standard text issues merged; English documentation corrected regarding indistinguishable zero ciphertexts, while the Japanese translation remains uncorrected).
    * One fixed in `mpt-crypto` on 2026-10-21 (OpenSSL dependency pin), not yet in a release.
    * One pull request approved but unmerged in `mpt-crypto` (exposing zero-ciphertext calculation in WASM/npm).
    * Three filed on 2026-10-18 against `mpt-crypto` with no reply (paper nonce coverage ambiguity, WASM toolchain build script failure, proof-size formula discrepancy).
    * One architectural question on XLS-65 vault accounting with no reply in 57 days.
    * One filing to `rippled` listing only positive feedback, closed without comment on day one for violating issue templates and repository rules.
* **What outside reviews exist and what they covered:**
  * None of the outside reviews evaluated this project; all three pertained to *upstream's code*:
    1. *Trail of Bits (April 2026):* Reviewed upstream's Confidential Transfer implementation (the only report the author actually obtained and inspected).
    2. *Sherlock Attackathon:* A security contest covering Confidential Transfers whose findings are private.
    3. *Zellic:* A scan of `mpt-crypto` known to the author only through three cited issue numbers.
* **What the project's own reviews were:**
  * Internal adversarial review rounds (61 records) where reviewers were given deliberately different review packets. Catches included an unwiped secret in memory misattributed to an external library, an unsound claim that a local viewer moved no trust boundary, a browser Content Security Policy failure caused by hashing raw bytes instead of parsed text, and five fixes that failed to resolve issues on re-test. The project operates under a claims register (`CLAIMS.md`), 12 negative prohibitions (P-1 to P-12), CI validation checks, and 8 formal retraction/correction records (R-1 to R-8).
* **Where my account is vague or the post failed me:**
  * The post does not explain who the "adversarial reviewers" in the project's own reviews were (colleagues, hired contractors, automated agents, or open-source contributors).
  * It asserts that the facility hides "each supplier's limit," but never explains how a credit limit is represented or enforced on-ledger if transfers only move arbitrary hidden amounts.
  * The description of `tec` failure codes and `fail_hard` leaves it vague whether a failed transaction risks permanently burning funds or merely burns sequence numbers and fees.

---

### 3. After the page section

* **Summary sentence:** The facility hides each supplier's credit limit, individual drawdown and repayment amounts, and outstanding loan balances from the public (while revealing them to the issuing bank), but publicly exposes the total float amount, supplier enrolment identities and fees, the dates and frequency of borrowing and repayment, and the exact size of every capital retirement tranche.
* **Match analysis:** The section's last sentence (*"In short, it hides how much each supplier draws and owes, not who borrows, when, or the size of the float."*) does **not** match the lists above it:
  1. *Omissions from what is hidden:* It omits "Each supplier's limit", and omits the critical qualification that "The bank, as issuer, sees all of it."
  2. *Omissions from what is public:* It mentions only "who borrows, when, or the size of the float", omitting supplier enrolment public amounts, supplier repayments (mentioning only borrowing), and the plaintext amounts of every retirement tranche.

---

### 4. Where it reads stronger than it should

* **Outside reviews overstated as three full reviews:**
  > LinkedIn: *"The write-up describes each one, and names the three outside reviews of upstream's code."*
  > Blog: *"A Zellic scan of mpt-crypto is known to me only through three identifiers an upstream issue cites. Of the three, only Trail of Bits' April report could be checked."*
  *Why it overstates:* Calling them "three outside reviews" implies three accessible, comprehensive independent audits. The blog reveals that one report's findings are completely secret (Sherlock) and another is known only as three bare issue identifiers from an automated or manual scan (Zellic).

* **Internal peer checks described with security-audit terminology:**
  > Blog: *"Design decisions and fixes went through rounds of adversarial review."*
  > Blog: *"These were the project's own review rounds, not outside audits."*
  *Why it overstates:* Phrasing internal self-checks as "rounds of adversarial review" makes it sound like an external third-party penetration test or professional red-team engagement, requiring an immediate deflationary disclaimer in the next sentence.

* **Absolute privacy claims contradicted by data leakage and bounding:**
  > Demo page: *"In short, it hides how much each supplier draws and owes, not who borrows, when, or the size of the float."*
  > Blog: *"The public numbers bound the hidden ones. If a holder converts in 500, receives nothing, and converts back 400, anyone can work out that the other 100 is either still held or has left by confidential Send."*
  *Why they contradict:* Saying it hides how much a supplier draws and owes is an overstatement when observing public conversions in and out allows an outside observer to deduce mathematical bounds or exact net balances.

* **Validity claim contradicted by fundamental security requirement bypass:**
  > Demo page: *"The run shows that these transactions are well formed and that rippled accepts them."*
  > Blog: *"The design requires a node on the same machine, and a local Devnet node never finished syncing on the hardware I had, so I accepted that as a named risk (E-148, E-151)."*
  *Why they contradict:* The test run is cited as evidence that the facility works, yet running against a public node directly violates the design's mandatory requirement needed to prevent untrusted nodes from serving dishonest destination keys and permanently exposing ciphertexts.

---

### 5. Where you got lost

* **Terms used before they were explained:**
  * **"amendment"**: Used in LinkedIn (*"its amendment, ConfidentialTransfer, was enabled on Devnet"*) and the blog without explaining that an amendment is an XRPL consensus feature flag enabled by validator voting.
  * **"receivables facility" / "float" / "drawdown" / "retirement tranche"**: Commercial finance jargon introduced in the LinkedIn post and early blog sections without a brief definition of invoice advancing.
  * **"XRPLF"**: Used in LinkedIn (*"Along the way I filed eleven issues with XRPLF repositories."*) without defining the XRP Ledger Foundation.
  * **"compact sigma protocol"**: Dropped at the end of the LinkedIn post (*"with Tess Dore and Murat Cenk's compact sigma protocol"*) without explaining what a sigma protocol or zero-knowledge proof is.
  * **"W-CONF"**: Introduced abruptly in the blog (*"The project is called W-CONF."*) without explaining what the acronym stands for.
  * **"ElGamal ciphertext"**: Dropped into the blog (*"Each confidential balance is an ElGamal ciphertext..."*) without foundational context for non-cryptographers.
  * **"inbox"**: Used in the blog (*"Convert moves tokens from a public balance into the holder's confidential inbox."*) before explaining why confidential MPTs require a separate holding area before merging.
  * **"tec result" / "fail_hard"**: Introduced abruptly in the blog (*"A `tec` result, one class of XRPL failure code, is still applied to the ledger..."*) without explaining XRPL node transaction evaluation mechanics.
  * **"XLS-65" / "vaults"**: Dropped into upstream filing descriptions (*"whether a confidential balance is meant to stay invisible to the accounting of the ledger's vaults (XLS-65)"*) without explaining what ledger vaults are.
  * **"publichidden from the publicthe issuer can read it"**: Rendered on the demo page as an unspaced, unpunctuated run-on string of UI legend labels.

* **Sentences that had to be read twice:**
  * `"Ids such as E-58 in this post are rows in the project's claims register, CLAIMS.md. Each row says what supports it. Where this post and a row disagree, the row wins."`
    *Reason:* Telling a reader of an explanatory post that the prose they are currently reading might be contradicted by an external register, and that the external register "wins", is jarring and undermines the text's direct authority.
  * `"A Zellic scan of mpt-crypto is known to me only through three identifiers an upstream issue cites. Of the three, only Trail of Bits' April report could be checked."`
    *Reason:* Grammatically, "Of the three" appears to refer to the "three identifiers" in the sentence immediately preceding it, rather than the "three outside reviews" mentioned two sentences earlier.
  * `"The last one, R-8, said every confidential transaction needs both of a holder's keys; a MergeInbox needs only the account key. It was on the public demo until a reviewer found it repeated in a diagram caption."`
    *Reason:* The phrasing conflates the erroneous belief, the correction record, and the UI diagram defect into a dense, confusing sentence.
  * `"publichidden from the publicthe issuer can read it"`
    *Reason:* The missing spaces and punctuation force the reader to pause and disentangle three separate label fragments (`public`, `hidden from the public`, `the issuer can read it`).
  * `"The Dedicated Account an ordinary XRPL account that holds the float, the money the facility advances to suppliers ↓one Convert: the whole float, amount public"`
    *Reason:* Diagram text extracted without diagram layout, resulting in fragmented clauses, unpunctuated sentences, and inline arrow characters.

END OF ROUND TWO LEG B REPORT
