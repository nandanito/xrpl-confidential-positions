# F-12 round two — the author's rulings (2026-10-18)

The round ran isolated, with network: the GitHub check printed 200, there were no DNS failures, and project paths appear only in the prompt. It accepted the round-one fixes and the one rejection, verified the prerequisites quotation, the four links and the corpus sentence, and judged the draft tight with no cuts needed.

| # | Finding | Ruling |
|---|---|---|
| P2 | *"the changelog describes the change for all platforms"* and the title's *"from 6.0.6 on"* go beyond what was tested | **Upheld.** The title now names the three versions that were tested to fail. The opening says only *"The changelog entry names no platform"*, which can be checked by reading emscripten `ChangeLog.md` lines 23-25 at the `6.0.6` tag |

**Stopping.** No third round. The single finding narrowed one sentence and the title to the evidence, and the narrowed sentence was checked against the source. `make check-filing` passes.
