# REVIEW-040c — the reader (Gemini via agy)

- **Rotation:** `REVIEW-040` — round one on `tools/claims-render-continuity`
- **Date:** 2026-09-06
- **Subject:** the branch at `cb72368`
- **Access:** DOCUMENT TEXT ONLY — the two navigation aids and two sample rows. No repository.
- **Packet:** `docs/reviews/REVIEW-040-packets/packet-c-reader.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-040d`.**

---

Here are the findings and answers based strictly on navigating the provided documents.

---

### 1. What has this project learned about "gates" — its automated checks?
**The gist:** 
The project learned that its automated checks, tests, and gates repeatedly **failed to fail** when they should have—reporting `PASS` while the underlying behavior was broken, disabled, or untested. Gates suffered from blind spots (e.g., inspecting literals instead of symbols, checking reachability instead of exposure/lifetime, or replaying the author's own flawed assumptions in their positive controls). Furthermore, fixing a gate often introduced new false passes (up to 7th, 8th, and 9th generations). The project's central takeaway is that **a test or gate is untrustworthy until it is verified by deliberately breaking or reverting the code and observing the gate fail** (a negative control / falsifier).

**Document used:** `docs/claims/by-topic/instruments-and-gates.md` (Document 2), corroborated by the topic summary in `docs/claims/by-topic/README.md` (Document 1).

---

### 2. The project says a certain mistake keeps recurring. Which one, and roughly how many times?
**The mistake:** 
**Restating a number in prose/headers instead of deriving it** (miscounting / stale counts). Document 1 explicitly names this *"the project's most persistent failure mode: a number restated instead of derived."*

**Count:** 
It recurred at least **16 times** (row `E-236` in Document 3 records the *"SIXTEENTH INSTANCE, INSIDE THE FIX FOR THE FIFTEENTH"* after `E-199` recorded the 9th and `E-229` recorded the 15th). 
*(Note: Gates false-passing also recurred at least 9 times as recorded in `E-237`).*

---

### 3. Find the row about a test that was "undefined behaviour". What is its id, and what happened?
* **Row ID:** `E-202` (found in `instruments-and-gates.md` and Document 5).
* **What happened:** A test named `dropping_a_scalar_overwrites_its_bytes` intended to prove memory zeroization on drop. It took a raw shared pointer (`*const u8`), called `ManuallyDrop::drop(&mut held)` which retagged the memory as `Unique`, and then read back through the now-invalidated shared pointer. While `ManuallyDrop` fixed a prior use-after-free, it introduced an aliasing violation (flagged by Miri Stacked/Tree Borrows), all while the test's own docstring stated *"a test that is undefined behaviour proves nothing"*. When fixing it, a sound candidate (`Zeroize::zeroize`) was tested and rejected because it still passed when `Drop::drop` was emptied; the final fix used tests that actually failed when the destructor was emptied.

---

### 4. How would you find out whether row `E-176` was executed or merely reasoned about? Walk me through the steps you actually took.
1. **Looked for `E-176` by ID:** Since I had a specific ID, I went straight to `docs/CLAIMS-INDEX.md` (Document 4).
2. **Checked index entry:** Located `[E-176](../CLAIMS.md#L236)`. The summary began with `"B-21's default signing path is EXECUTED on Devnet..."` and the grade column stated `A, executed (E-244)`.
3. **Verified full row details:** Inspected the full row for `E-176` (Document 5), which confirmed live on-chain execution by providing the validated Devnet transaction hash (`EF2018FA13AF7DCECD1D7562DE0BDF9A870688FAD6E4E564323B2AA1386FD336`), public key, and the run receipt at `docs/runs/b21-zeroized-default-path-devnet-2026-08-27.json`.

---

### 5. If you wanted to read everything this project knows about SECRETS — keys, seeds, wiping memory — where would you go, and how confident are you that you would get all of it?
* **Where to go:** Start at `docs/claims/by-topic/secret-handling.md` (28 rows), as directed by `docs/claims/by-topic/README.md`.
* **Confidence level:** **Low to Moderate (~60%)**.
* **Why:** Document 1 warns that topic assignment is strictly **lexical matching against headlines**, supplemented by a manual override list. If a secret-handling defect or insight is described using different vocabulary in its headline, or discussed exclusively within the 1,000-character row body, the topic filter misses it. For instance, key memory-wiping/drop claims like `E-202` appear under *Instruments and gates*, and cryptography/key topics spill heavily into *Protocol and cryptography* (139 rows). To be certain I got everything, I would have to bypass the topic files and search `CLAIMS.md` directly for keywords (`zeroize`, `wipe`, `seed`, `scalar`, `key`, `drop`).

---

### 6. Which of the two navigation aids did you actually reach for, and why?
* **By-Topic views (`docs/claims/by-topic/`):** Reached for when exploring **conceptual questions** (Questions 1 & 2: "What did we learn about gates?", "What mistake recurs?"). Grouping rows by domain was necessary to spot high-level patterns without reading 318 disconnected entries.
* **CLAIMS-INDEX (`docs/CLAIMS-INDEX.md`):** Reached for immediately when looking up a **known identifier** (Question 4: `E-176`). 
* **Assessment:** Neither was redundant—they serve completely different access modes (thematic synthesis vs. random-access ID lookup). However, both failed when trying to find concepts described in row bodies rather than headlines.

---

### 7. What confused you?
1. **Headline-only blindness:** Both tools only index headlines/truncated excerpts. For Question 3, `E-202` happened to put `UNDEFINED BEHAVIOUR` in its headline; if that phrase had been in the row body, both navigation aids would have been completely useless.
2. **Multiple concurrent counters:** Several headlines track recurring ordinal mistakes (`NINTH INSTANCE` in `E-199` for miscounts, `NINTH FALSE-PASSING GATE` in `E-237`, `SIXTEENTH INSTANCE` in `E-236`). Without careful reading, it is easy to confuse which counter belongs to which failure mode.
3. **Opaque Grade annotations:** The notation `A, executed (E-244)` in the index was confusing until reading that `E-244` was a fix related to table rendering issues that affected how grades parsed.
4. **Missing rows across topic boundaries:** `E-176` (Devnet execution) is not present in `instruments-and-gates.md`, even though it discusses verification mechanisms and test substitutions. Topic silos hide relevant entries if the lexical pattern filed them elsewhere.

---

### Explaining how to find something in this register to a colleague

> "Do not read `CLAIMS.md` linearly from top to bottom. If you have a specific claim ID (like `E-176`), open `docs/CLAIMS-INDEX.md` to get its line number and jump straight there. If you want to understand what the project learned about a broad theme (like secret handling or gate failures), browse the relevant markdown file under `docs/claims/by-topic/`. However, be aware that both navigation aids only index row **headlines** via regex patterns—if you are hunting for a specific technical term, code symbol, or nuance buried inside the evidence prose of a row, skip the navigation aids entirely and run a ripgrep/full-text search across `CLAIMS.md`."
