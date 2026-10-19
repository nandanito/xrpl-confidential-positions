# REVIEW-057 round two — self notes, written BEFORE the leg ran

Subject frozen at 776ca25.

T1. The guard records the history's roots at install time. A root added later —
    an unrelated history merged in, or the history rewritten onto a new root —
    is unknown to it, and pushes of that history are unguarded until the
    installer is re-run. Nothing says so.
T2. The guard trusts `gh` to identify the destination. `GH_HOST` or an
    enterprise token in the environment would send the lookup elsewhere. And
    it is unverified whether `gh api repos/<old-name>` follows the redirect
    after the rename; if it does not, a push to the old URL is refused (the
    safe direction), but the plan does not say which.
T3. The inventory matches code line by line after collapsing whitespace. A
    quotation with line-number prefixes (`cat -n`, `nl`, `123:` from grep -n),
    or reflowed by a formatter, evades it. Review transcripts are full of
    `cat -n` and `grep -n` output. Likely false negatives in exactly the files
    that quote most.
T4. The inventory compares rippled at 3.3.0 and develop only; records also
    read 3.4.x and other tags, and mpt-crypto at 1.0.5. A quotation of code
    that exists only in another version is missed.
T5. An orphan commit made in a private clone from the private working tree is
    not "private history" by the guard's definition, so the guard allows
    pushing it anywhere, without the step 7 gate having run on it.
