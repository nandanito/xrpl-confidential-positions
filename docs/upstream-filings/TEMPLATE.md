TITLE: <one line: the defect, not the story>
REPO: XRPLF/<repo>

---

<!--
  ⚠ This template is also the gate's positive control. `make check-filing
  FILE=docs/upstream-filings/TEMPLATE.md` must PASS. If it starts failing, the
  gate has drifted and the failure is in the gate, not here.

  Shape: defect, evidence, fix. Prose is capped — `make check-filing` prints the
  limit it enforces, and this file deliberately does not repeat the number.
  Quoted source and code blocks do not count, so quote rather than paraphrase.
-->

The docs page for X says Y. The specification says the opposite in §N, and
rippled follows the specification. A reader will believe Z is true when it is
not.

**Where it says this**

`path/to/file.md` line 95:

> the exact quoted sentence, verbatim

**What the source says**

XLS-00NN §N.N:

> the exact quoted sentence, verbatim

Permalink to the implementation:
https://github.com/XRPLF/rippled/blob/<sha>/src/path/File.cpp#L100-L120

**What I ran**

I checked this against Devnet rather than inferring it. The observer recomputed
the value from public inputs and it matched.

`grep -n "SomeField" spec.md` returns 0 hits, so the field is not named anywhere
in the document.

**Suggested fix**

Change the sentence to say that the value is publicly recomputable. Happy to
open a pull request if that helps.

---

*Disclosure: prepared with AI assistance. Every citation was checked against the
primary source on <date> at <ref>. I found no stated policy on AI-assisted
contributions in `CONTRIBUTING.md`, so I am disclosing by default.*
