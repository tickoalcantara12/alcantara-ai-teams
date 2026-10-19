---
name: fix-review
description: Fix findings and implement enhancements or missing tests from a previous review with the AI dev team (Triage & confirm → Implementer → QA tests → Reviewer & Security re-verify).
argument-hint: [review work-id, finding IDs (e.g. R1,S1), or target path — defaults to latest review-* in .ai-team/]
---
# Command: fix-review

Target: **$ARGUMENTS**

Locate the target review artifacts in `.ai-team/<work-id>/` (`review.md`, `security-report.md`, `test-report.md`). If no `<work-id>` was specified, use the most recent `review-*` (or active work item) in `.ai-team/`. If no prior review exists, run `/review` first.

1. **Triage Findings & Confirm Scope** (Architect / Lead) – Read `review.md`, `security-report.md`, and `test-report.md`. Present a concise checklist of open items grouped by category:
   - **Blocking / High-severity findings** (`R<n>`, `S<n>`)
   - **Non-blocking enhancements & refactors** (`R<n>`, `S<n>`)
   - **Missing test cases / test gaps** (`TC<n>` from `test-report.md`)
   If `$ARGUMENTS` did not already specify which items to fix (e.g. `all`, `blocking`, or specific IDs like `R1, S1, TC2`), **pause and ask the user** which group or IDs to implement.
2. **Architect – Light Design (only if needed)** (`system-design`, light) – If any selected enhancement changes an API contract, schema, or architecture, append a short resolution plan to `.ai-team/<work-id>/design.md`. Skip for straightforward code fixes.
3. **Implementer – Fix & Enhance** (`implement-task`, fix-loop mode) – For each selected code/security finding (`R<n>`, `S<n>`):
   - State a brief `Step → verify: [check]` plan.
   - Write or update a failing test first where applicable, then apply the minimal surgical fix.
   - Run build, linter, type check, and tests.
   - Record every resolved finding ID (`R<n>`, `S<n>`) and the exact files/commands in `.ai-team/<work-id>/implementation-notes.md`.
4. **QA – Close Test Gaps** (`test-verification`) – Implement any selected missing unit, integration, or E2E test cases from `test-report.md` and run the test suite.
5. **Re-Verify** (`Reviewer`, `Security`, `QA` **in parallel** when supported):
   - **Reviewer** (`code-review`): Confirm every selected `R<n>` is resolved with no unintended side effects; update `review.md` verdict to `APPROVED` (or `CHANGES_REQUESTED` → step 3).
   - **Security** (`security-assessment`): If any `S<n>` or security-sensitive code was touched, confirm remediation and update `security-report.md` to `CLEARED` (or `BLOCKED` → step 3).
   - **QA** (`test-verification`): Run the full relevant test suite and update `test-report.md` to `PASS` (or `FAIL` → step 3).
6. **Summary** – List all resolved finding IDs (`R*`, `S*`, `TC*`), files modified, verification commands run, and final verdicts.

Loop limit: max 3 fix iterations per gate; then stop and escalate to the user.
