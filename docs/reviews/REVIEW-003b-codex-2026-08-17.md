# REVIEW-003b — Codex leg, verbatim

- **Date:** 2026-08-17
- **Reviewer:** Codex CLI 0.135.0 via `/codex:adversarial-review`, run against `--base main`
- **Access:** full repository. Unlike the Gemini leg, this reviewer could read `ADR-0001`, `CLAIMS.md` and the unchanged files — which is why it found the nonce-derivation and signer-boundary items the Gemini leg could not see.
- **Focus given:** the packet's numbered questions, with the hybrid alternative, B-11, ADR-0001 §(d)/§(e)/nonce, and the 2-of-15 evidence base named as priority targets.

**Verbatim below. Not adjudicated. Not re-graded.**

---

- [critical] Nonce derivation is not implementable safely from the ADR as written (docs/decisions/ADR-0001-key-custody-and-proof-location.md:168-178)
  ADR-0001 turns the highest-severity signer failure into a one-line HKDF sketch, but does not specify HKDF salt/info, domain label, canonical encodings, length framing, fresh-entropy semantics, expansion into five scalar nonces, or scalar mapping. Because the same section says nonce reuse leaks sk_A while proofs still verify normally, this ambiguity is not cosmetic: two implementations, or one rushed Rust FFI wrapper, can accidentally reuse or collide nonce material and no observer harness will catch it. The proposed KAT language is also incomplete unless the entropy input is fixed and exact derived alpha values are asserted.
  Recommendation: Replace the sketch with a byte-exact construction: canonical encodings for every witness/statement field, fixed domain/version labels, explicit HKDF-Extract/Expand salt and info, fixed aux-randomness length and weak-RNG behavior, rejection sampling/mod-order handling, per-alpha labels or counters, and KATs asserting exact outputs plus no nonce reuse across distinct statements.
- [high] Hybrid rejection does not prove the decisive confidentiality failure (docs/decisions/ADR-0002-facility-as-application-logic.md:49-59)
  ADR-0002 rejects the strongest alternative because the float crosses a plaintext boundary when withdrawn from the vault before conversion. But the same paragraph admits the funding side is already public and valuable to model natively; a public aggregate hop is not by itself evidence that per-participant drawdowns or repayments lose the confidentiality property the project claims. Grounds 2 and 3 are explicitly weighable, so if ground 1 is not decisive the ADR has not justified dropping XLS-65 share accounting in favor of weaker application-side financing logic.
  Recommendation: Add an explicit hybrid flow/invariant table comparing app-only vs XLS-65 funding plus ordinary-account confidential float. Show exactly which values become public, whether they are aggregate or participant-specific, and why that violates the claim. If the violation is only operational complexity, downgrade the rejection from decisive to a risk tradeoff.
- [high] B-11 overstates 'cannot' from evidence that only supports 'not supported today' (CLAIMS.md:102)
  The register says encrypted loan accounting is structurally blocked by additive-only homomorphism, but the evidence column admits the key checks have not been done and that E-31 is only suggestive. The investigation also names a possible proof-per-LoanPay design, which would be new work but contradicts the stronger 'cannot' framing. The defensible claim is current XLS-96/XLS-66 do not provide encrypted amortising accounting, not that upstream could not add a new relation or proof system. This matters because ADR-0002 uses this inference to say a vault-share confidential flag would not reverse the decision.
  Recommendation: Downgrade B-11 to PENDING or reword it to 'not supported by current XLS-96/XLS-66.' Require the two listed checks plus author/API confirmation before using 'structural' or 'cannot' in ADR-0002.
- [high] The XLS-66 negative result is broader than the executed evidence (docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md:181-184)
  The investigation says LoanSet and LoanPay would succeed and that there is no diagnostic anywhere, but only VaultCreate and VaultDeposit were actually executed. A grep for 'confidential' across transactors does not rule out rejection in shared helpers or unusual authorization paths; the document itself later names VaultClawback and LoanBrokerCoverClawback as suspects. Publishing 'accepted with tesSUCCESS at every step' before GAP-8 is closed risks sending upstream a false or overstated interoperability finding.
  Recommendation: Until the full lifecycle is run, narrow the claim to the executed paths: VaultCreate and VaultDeposit accept a confidential-capable MPT and operate on public balances. Close GAP-8 before claiming every vault/lending path accepts the combination silently.
- [medium] The localhost signer boundary is not a hostile-local-process boundary (docs/decisions/ADR-0001-key-custody-and-proof-location.md:80-84)
  ADR-0001 names an origin allowlist and pasted session token, but those are browser-origin controls, not meaningful controls against arbitrary same-host clients. A local process can forge Origin headers, and the security of the signing oracle then depends entirely on unspecified bearer-token secrecy, storage, lifetime, and UI handling. Since the value-shaped interface accepts destination and amount and returns a complete signed blob, token exposure turns the daemon into a spend oracle even though key bytes never leave the process.
  Recommendation: Either state hostile same-user local processes are out of scope, or add a real local authorization boundary: per-transaction confirmation in the signer UI showing parsed transaction details, short-lived scoped tokens, no browser-persisted bearer secret, and preferably OS-mediated IPC/native messaging over generic localhost HTTP.

Next steps:
- Do not accept ADR-0002 until the hybrid alternative and B-11 are rewritten or backed by stronger evidence.
- Close GAP-8 before filing or publishing the XLS-66 non-composability claim as covering all vault/lending paths.
- Treat ADR-0001 nonce derivation as blocking cryptography work before any signer implementation.

