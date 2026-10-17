# Consistency Analysis: <work-id>

- **Verdict:** CONSISTENT | GAPS_FOUND
- Read-only check across `constitution.md`, `spec.md`, `design.md`, `tasks.md`. Resolve every Blocking item before implementation.

## Checks
| # | Check | Result |
|---|---|---|
| 1 | No `[NEEDS CLARIFICATION]` markers remain in the spec | Pass/Fail |
| 2 | Every requirement is testable and uses an EARS pattern | Pass/Fail |
| 3 | Every requirement (REQ/NFR) is covered by at least one task | Pass/Fail |
| 4 | Every task satisfies at least one requirement (no gold-plating) | Pass/Fail |
| 5 | Design addresses every requirement and contradicts none | Pass/Fail |
| 6 | Design and tasks comply with every constitution principle | Pass/Fail |
| 7 | Task dependencies are acyclic; `[P]` tasks do not share files | Pass/Fail |
| 8 | Every task names the failing test to write first | Pass/Fail |

## Findings
| ID | Severity | Where | Problem | Fix |
|---|---|---|---|---|
| A1 | Blocking | | | |
