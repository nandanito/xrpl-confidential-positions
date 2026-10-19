# F-12 round one — the author's rulings (2026-10-18)

The round ran isolated, with network: the GitHub check printed 200, there were no DNS failures, and the transcript mentions project paths only in the prompt. It did not read the author's build directory (`f12b.*`). **It re-ran the builds independently and confirmed the result**: 6.0.2 as shipped; 6.0.6 as shipped, with `em++` and with `-sDEFAULT_TO_CXX`; 6.0.10 as shipped and with `em++`; 6.0.12 as shipped and with `em++`. It also verified the changelog quotation, the CI pin and run, the state of `main`, and the Trail of Bits report.

| # | Finding | Ruling |
|---|---|---|
| P2 | *"The only match on these terms"* reads as if the org-wide searches returned one item | **Upheld as wording.** It now says that grepping those items for the WASM terms matched one item, this project's own #148 |
| P2 | State the tested platform | **Upheld.** The opening says macOS arm64, and that the changelog describes the change for all platforms |
| P2 | Mark the table cells the reviewer did not re-run | **Rejected.** The table reports the author's runs, all executed and logged in `docs/evidence/f12-emsdk-2026-10-18/`. The reviewer's coverage is recorded here, not in the filing |
| P3 | Collapse the four "At `3baaaac`" bullets | **Upheld.** One sentence keeps all four links |

Found by the author while fixing: the prerequisites quotation used an ellipsis, the shape F-13's round two rejected. It is now the exact text of `build-wasm.sh:19`, checked against the source.
