# Security policy

## This is a research artifact, not production software

Nothing in this repository is audited, production-ready, or safe to put value
behind. It runs on the XRP Ledger **Devnet only**: the signer refuses every other
network (`signer/src/ledger.rs`), and the project's first rule is no mainnet
writes, at any phase, for any reason. There are no releases and no supported
versions.

`CLAIMS.md` sets out what the work does and does not establish. Its standing
prohibitions include calling any of it secure (P-5), and it records what the
protocol publishes whatever an application does: who transacts, when, and the
amount of every conversion into or out of confidential form (P-4, P-11). The
issuer can always decrypt every balance (P-9).

## Reporting a vulnerability in this repository

Use GitHub's private vulnerability reporting on this repository: the **Security**
tab, then **Report a vulnerability**. That keeps the report private until it is
fixed.

Because everything here runs on Devnet with throwaway accounts, a public issue is
also fine for most defects. Use the private channel when the defect would matter
to someone running the same code elsewhere. Examples are a way to make the signer
sign something other than what it showed for confirmation, a way to read a
secret out of the signer through its socket, or a way for the read-only web tier
to sign.

Please include what you ran, what you expected, and what happened. A failing
test or a command that reproduces it is the most useful form.

## Reporting a vulnerability in XLS-96, rippled or mpt-crypto

Report it to that project, through its own security policy, not here. This
repository builds on XLS-0096, `XRPLF/rippled` and `XRPLF/mpt-crypto`, and their
maintainers are the people who can fix them. If it concerns something this
repository found or relies on, a note here afterwards is welcome.
