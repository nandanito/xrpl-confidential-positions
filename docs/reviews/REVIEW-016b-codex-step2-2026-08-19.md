**Findings**

CRITICAL: none.

HIGH: plaintext endpoint refusal is bypassable for non-loopback hosts.
`JsonRpcSource::new` treats any host starting with `127.` as loopback. Inputs like `http://127.attacker.example/` or authority tricks such as `http://127.0.0.1@attacker.example/` can be accepted as plaintext even though the connection is not to loopback. With F-23, plaintext non-loopback is not just transport hygiene: an on-path rewrite of `HolderEncryptionKey` can make the signer publish an amount encrypted to the attacker’s key. Primary support: the code’s `is_loopback_host` uses `h.starts_with("127.")`; URL hostnames are not IP addresses. Use URL parsing plus `IpAddr::is_loopback`, with exact `localhost` only if intentionally allowed.

HIGH: the Devnet guard can be bypassed by integer truncation.
`network_id` is read as `u64` and cast with `as u32`. A malformed or hostile `server_info` with `network_id = 4294967298` truncates to `2` and passes the “refuses any network_id but 2 before it reads anything else” guard. Similar truncation exists for ledger index, sequence, and balance version. Primary support: Rust `as u32` truncates; the code uses `as u32` before comparing to `DEVNET_NETWORK_ID`. Use `u32::try_from` and reject out-of-range values as malformed.

MEDIUM: the reader asks for a pinned ledger index but does not verify the response came from it.
`account_info` response `validated` / `ledger_index` is not checked at all. `ledger_entry` checks only `validated == true`, not that `ledger_index` equals the pinned index. The reader also does not validate returned `LedgerEntryType`, `Account`, or `MPTokenIssuanceID`. Concrete failure: a `LedgerSource` returns `server_info.seq = A`, but answers `account_info` or `ledger_entry` from B, or returns another account’s MPToken-shaped node; the snapshot is accepted and labelled as ledger A. Primary support: the fake responses include these identity/index fields, while `ledger.rs` ignores them; the module claim is “one pinned numeric ledger index.” Validate index, validated status where present, entry type, account, and issuance ID.

MEDIUM: “anything the transaction binds to moved” is overstated because `LastLedgerSequence` is ignored.
The transaction carries `LastLedgerSequence`, derived from the first snapshot’s ledger index. `binding_differs` deliberately ignores ledger index, and `recheck` does not reject if the confirmation lasted past `before.last_ledger_sequence()`. Concrete failure: build at ledger 100 with LLS 120, human waits until ledger 121, recheck sees no binding field changed, signer signs an already-expired transaction. That is probably liveness, not confidentiality, but it contradicts the prose claim. Primary support: `last_ledger_sequence()` is derived from snapshot state and passed into `SignerContext`; `binding_differs` ignores ledger index. Add an expiry check after re-read.

MEDIUM: Devnet execution claims cite evidence not present in the supplied register rows.
The prose repeatedly cites E-101 and specific Devnet transaction hashes as executed evidence, but the register rows supplied here include E-100, E-102, E-103, B-15, and F-23 only. I cannot verify E-101 from the provided text. Concrete failure: a reader of this review packet cannot audit the “built, proved, signed, submitted, `tesSUCCESS`” claim against the register evidence provided. Primary support: the supplied “register rows this change adds” omit E-101.

LOW: `REFUSED_LEDGER_UNAVAILABLE` says “Retryable” for errors that are not retryable as-is.
`prepare` maps any `refresh()` error to `LedgerUnavailable`, including permanent/configuration cases such as `NotDevnet` or malformed endpoint data. Retrying the same request against the same endpoint will not fix those. Primary support: `refresh().map_err(|e| Refusal::LedgerUnavailable { detail: e.to_string() })`; `Refusal::LedgerUnavailable::detail()` appends “Retryable.” Split transient transport/sync from permanent refusal, or make the message conditional.

LOW / named gap: I cannot verify from the supplied text that signer-list detection reads the real `account_info` shape.
The code reads `signer_lists` from `account_data.signer_lists`. The positive tests use the fake source, and the live Devnet test only covers an account with no signer list. If real `account_info` places signer lists elsewhere, issue #11’s “signer list is present” condition silently reads as zero. Primary support is missing here: no rippled source citation or live positive fixture is included for this response shape.

**Answers To The Four Questions**

1. F-23: able to answer from the supplied text. The chain is sound as a source-level risk for substituted destination keys, with the caveat already stated: it is not executed, and “published permanently” applies only if the signed blob is submitted without `tapFailHard` and lands as a `tec`. The broad phrase “wrong ledger read” should be read as “wrong key read,” not every stale field.

2. Staleness: able to answer. Destination key comparison at ledger B against the key used at A is the right pre-signing freshness comparison. `binding_differs` plus the separate destination-key check covers the proof/key/balance fields shown, but it misses the signed `LastLedgerSequence` expiry case.

3. Profile refusal list: able to answer. For the nine named moved fields, the refusal list is complete: `balance`, `balance_ciphertext`, `balance_version`, `holder_key_registered`, `issuer_encryption_key`, `auditor_encryption_key`, `sequence`, `last_ledger_sequence`, `destination_keys`. I do not see another one of those values still coming from the file. `network_id` still comes from the profile, but it was not one of the nine and is treated as a Devnet declaration.

4. Overclaiming: able to answer in part. The main overclaims are “refuses any network_id but 2” despite truncation, “TLS required for non-loopback” despite the host parsing bypass, “one pinned numeric ledger index” without response validation, “anything the transaction binds to moved” without `LastLedgerSequence`, “Retryable” for all ledger-unavailable cases, and Devnet E-101 execution claims whose register evidence is missing from this packet.
