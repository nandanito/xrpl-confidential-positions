**What this changes, and the evidence for it.**

- [ ] `make ci` passes.
- [ ] If this touches `signer/`: `cargo test` (run twice), `make check-test-support`
      and `make check-zeroize-bounds` pass locally, and I say so here, because CI
      cannot run them.
- [ ] Every new capability claim has a row in `CLAIMS.md`, and a test that fails
      if the claim is false.
- [ ] Nothing here submits to mainnet, or makes it possible to.
- [ ] No secret or personal path is added. If I hold a local secret store, I ran
      `make check-no-secrets`.
