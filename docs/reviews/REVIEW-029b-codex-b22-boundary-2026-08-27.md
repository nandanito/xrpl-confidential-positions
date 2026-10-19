1. Sound. It identifies the owned seed-to-key path as the security unit; implementing that expansion without this ruling would be scope creep.

2. Yes—as a response to the consistency objection. B still narrows some windows, but cannot honestly claim a coherent residue boundary while upstream plaintext copies remain. F2 actually understates the file path: the intermediate `serde_json::Value` also owns a seed string.

3. C. Apply one wiping abstraction across all signer-owned secret-bearing buffers from profile ingestion through decoding and derivation, with the required falsifying gate. D is unsound: plaintext on disk is a disclosed residual, not a reason to retain avoidable memory residue; P-5 expressly permits narrowing one window without removing another channel.

4. F1 falsely classifies the `sha512half` call at `xrpl.rs:474` as secret-input hashing. Its preimage is `root_pub || 0 || i`; F6 correctly calls `root_pub` public. Thus the secrecy split has two secret callers (`:445`, `:463`), not three, and the corresponding intermediate scalar/candidates are publicly computable.
