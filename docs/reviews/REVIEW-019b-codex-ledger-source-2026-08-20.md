**Ruling: corroboration is required for any signer/facility a user is meant to rely on.**

One endpoint is not an acceptable confidentiality source here unless it is explicitly treated as a fully trusted ledger oracle. The reason is not generic “more decentralization is better”; it is F-23: a wrong destination or issuer key can cause a failed but applied transaction that permanently publishes the amount encrypted to the attacker.

Corroboration should mean **independently operated ledger sources**, not merely two requests or two hostnames from the same public cluster. Two URLs behind the same Ripple-operated Devnet service may improve availability and catch some transient faults, but it does not materially answer the hostile-node case. If the signer cannot establish operator independence, it should say so and treat the result as weaker.

On disagreement, the signer should **refuse to sign**. “Refuse and warn” is the right behavior; warning without refusal is not enough because the damage is executed on-chain.

Acceptable source modes:

1. **Loopback self-run rippled**: acceptable as a single source, because the trust statement becomes “trust your own node/local machine.”
2. **Remote endpoint**: not acceptable as a sole confidentiality source unless documented as trusting that operator with amount confidentiality.
3. **Remote corroborated mode**: require matching Devnet `network_id`, pinned ledger/index handling, and byte/field equality for every transaction-bound ledger field across independently operated sources.
4. **Research-only insecure mode**: acceptable only if loudly labeled as such and excluded from claims about protecting amount confidentiality against a malicious ledger source.

A useful third option is **local pinning/TOFU for encryption keys**, especially destination `HolderEncryptionKey` and issuer `IssuerEncryptionKey`. It is not a full substitute for corroboration because first use can be poisoned and legitimate key rotation needs handling, but it would catch later substitution and is cheap. For recurring counterparties, TOFU plus corroboration is stronger than either alone.

If one endpoint remains supported, the project must say plainly near configuration, confirmation/signing docs, and `CLAIMS.md`:

> A single remote ledger endpoint is trusted for amount confidentiality. If it lies about the destination or issuer encryption key, the signer can create a transaction that fails but permanently publishes the amount encrypted to the attacker’s key.

Cost: corroboration adds configuration burden, Devnet operator scarcity, more RPC latency, more failure modes, and possible false stops when nodes are lagging or not retaining the same ledger. On Devnet, independent corroboration may be hard enough that it becomes partially theatrical unless users run one endpoint themselves or identify genuinely separate operators.

Scope: for the current Devnet research artifact, one endpoint can be allowed only as a named gap/risk acceptance. For “the facility” or anything user-facing, corroboration or loopback-only should be required.

Confidence: **high**. Judgment type: **security design risk ruling**.
