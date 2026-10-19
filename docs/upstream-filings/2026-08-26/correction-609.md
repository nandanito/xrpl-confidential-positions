A naming correction to my own report, from a review after filing.

I referred throughout to `tapFailHard`. That string appears **nowhere** in rippled — it is internal shorthand from my own project's notes that I failed to translate before filing. The two real names are:

- **`fail_hard`** — the JSON submission parameter, which is what a client author actually sets. `Submit.cpp:32-37` reads `jss::fail_hard`.
- **`TapFailHard`** — the internal apply flag, `ApplyView.h:32`, `TapFailHard = 0x10`, whose declaring comment is literally `// fail_hard flag set.`

This matters more than a typo would, because the report is aimed at client authors and anyone grepping for `tapFailHard` in rippled or in the API docs finds nothing. Read every occurrence in my report as `fail_hard` where it concerns what a submitter passes, and as `TapFailHard` where it concerns `Transactor.cpp:1645-1651`.

The substance is unaffected: `Transactor.cpp:1652-1656` still routes a `tec` through `processPersistentChanges` via `isTecClaimHardFail`, `tecBAD_PROOF = 199` still satisfies `isTecClaim` (`tecCLAIM = 100`), and the Devnet transaction cited still carries its ciphertexts on the validated ledger.

One thing I would add, having gone back to §13.1 for a separate reason: §13.1.2 lists *"Holder balances"* as hidden without qualification, which sits badly against §9.4's statement that a ciphertext matching the canonical `EncZero` is *"publicly known to be exactly 0."* If §13.1 is opened to add the `tec` note this issue asks for, that neighbouring sentence may be worth looking at in the same pass.
