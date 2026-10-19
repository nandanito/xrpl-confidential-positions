# REVIEW-057 — self notes, written BEFORE the leg ran (not committed until after)

Subject frozen at adee1f0.

S1. Steps 4-6 produce FOUR commits in the public repository (the export, the
    archive copy, the regenerated log, the README sentence), while the step 6
    sentence says "published as one commit". Either squash after step 6, or the
    sentence is false on day one. Pre-existing in the original request; carried
    by my renumbering without noticing.
S2. The pre-push guard is a guard against mistakes, not a control: `--no-verify`
    skips it, a fresh clone has no hooks, `core.hooksPath` can redirect it, and a
    `pushurl` / `url.<x>.insteadOf` rewrite may change what the hook sees. Check
    what URL `pre-push` receives ($2 is the URL as given, after insteadOf?).
S3. GitHub Discussions, if ever enabled, may share the issue/PR number counter.
    New repos have Discussions off; worth one line in step 9.
S4. D7 stub text — "where this repository cites issue #N, the outcome is in the
    document that cites it" — is not true of every citation.
S5. The NOTICE inventory covers the patch and .c/.h files only; web/app assets,
    copied TS, and upstream test vectors were not searched. The request says so,
    but the NOTICE itself does not say the list may be incomplete.
S6. Private vulnerability reporting and branch protection on a PRIVATE repo may
    need a paid plan; step 9 sets them after making it public, which avoids it.
S7. Step 7's gate runs on the public clone; the 13 issue bodies are swept in a
    scratch repo in step 9, but nothing pins that the stub/copy bodies posted are
    the ones swept.
