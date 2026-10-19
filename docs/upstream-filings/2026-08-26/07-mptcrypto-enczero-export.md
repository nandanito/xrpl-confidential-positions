TITLE: generate_canonical_encrypted_zero is not exported to WASM or npm, so the one check an outside observer most needs is unreachable from the published packages
REPO: XRPLF/mpt-crypto

---

`generate_canonical_encrypted_zero` exists in the C library and is not carried across the WASM boundary. The result is that the single most useful thing an outside observer can compute about a confidential MPT balance cannot be computed from the published packages.

Small ask: add the symbol to the WASM export list and surface a thin wrapper.

### Why this particular function

XLS-0096 §9.4 makes the canonical encrypted zero a **deliberate, public** property, not an implementation detail:

> **Public zero visibility:** Because the canonical encrypted zero is fully deterministic, validators can compare any stored ciphertext against the known `EncZero` value for that account. If they match, the balance is publicly known to be exactly 0.

Everything that computation needs is public ledger data — the holder's encryption key, the account ID, the issuance ID. So recomputing `EncZero` and byte-comparing it against a stored ciphertext is exactly the check a block explorer, a compliance tool, or a wallet auditing its own exposure would want to run. It is the one confidentiality-relevant fact about a balance that an outsider is *entitled* to determine.

### Current state, checked today

- `.github/scripts/build-wasm.sh` at `main`: **0** occurrences of `canonical_encrypted_zero`.
- `@xrplf/mpt-crypto@0.1.1` (current `latest` on npm): unpacked the tarball and `grep -ril canonical` over it returns **nothing**.
- But the C library does have it: `include/secp256k1_mpt.h:132` at `main` declares `generate_canonical_encrypted_zero`.

So this is not a missing feature. It is a symbol that stops at the WASM boundary.

### What that cost, concretely

Building an observer harness required reimplementing it: SHA-256 over `"EncZero" ‖ accountID ‖ issuanceID` with rejection sampling, then `C1 = r·G`, `C2 = r·Q`. About fifteen lines, and it does work — I matched it byte-for-byte against live Devnet ledger state.

**That it is short is not really the point.** This is a deterministic computation that validators rely on to agree, and reimplementing it outside the library to check a documented public property is the wrong shape: my fifteen lines and yours have to stay identical forever, and nothing tells me when they stop being. A reimplementation that drifts fails *silently* — it reports "not canonical zero" for a balance that is one, which is the answer that looks unremarkable.

### The counter-argument, which I think is fair

The export list is visibly curated for the TypeScript wrapper's proof-generation use case, and an outside observer is not obviously your target consumer. Choosing not to widen the surface is a reasonable scope decision, and the `_mpt_generate_keypair` omission — which carries its rationale inline in the export list, and which I thought was a good piece of practice when I hit it — shows the list is maintained deliberately rather than by accretion.

So please read this as a request from the observability side rather than as a defect report. If the answer is "out of scope for this package", a line in the export list saying so would be worth as much to the next person as the export would, and would follow the pattern you already use.

---

*Disclosure: this report was prepared with AI assistance. The npm and repository checks above were run on 2026-08-26 against `main` and against the current published `0.1.1`; the Trail of Bits April 2026 review was checked first and contains nothing on this subject. XRPLF states no policy on AI-assisted contributions, so I am disclosing it by default.*
