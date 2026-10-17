---
name: implement-task
description: Step-by-step procedure for the Principal Software Engineer to implement tasks from tasks.md test-first (red, green, refactor) or fix findings from review, security or QA, with verification and implementation notes.
---
# Skill: Implement Task

## Steps
1. **Load context** – Read `constitution.md`, `spec.md`, `design.md`, the target task in `tasks.md`, and any open findings (`review.md`, `security-report.md`, `bugs/`).
2. **Inspect** – Open every file you will modify plus its callers and tests. Identify conventions (naming, error handling, logging, DI, test style).
3. **Plan** – List the exact edits per file. If the design is unworkable or the spec is wrong, stop and escalate to the architect; never silently deviate.
4. **Red** – Write the task's tests first, one per listed requirement. Run them and confirm they **fail for the right reason**.
5. **Green** – Implement the smallest change that makes them pass. Validate inputs, handle errors explicitly, no secrets in code, no unrelated edits.
6. **Refactor** – Clean up with tests green. Add unit tests for any edge cases found along the way.
7. **Verify** – Run the project's format/lint, type check, build and the full relevant tests. Fix failures you introduced. Record exact commands and outcomes.
8. **Self-review** – Read your own diff: dead code, debug prints, duplicated logic, missing error handling, constitution compliance.
9. **Notes** – Append to `implementation-notes.md`: task IDs completed (tick them in `tasks.md`), requirements satisfied, files changed, decisions, commands run + real results, finding IDs resolved.

## Parallel tasks
Tasks marked `[P]` may be done in any order. Do not touch files owned by another task.

## Fix-loop mode
- Address findings by ID; do not touch unrelated code.
- If you disagree with a finding, explain why in the notes instead of ignoring it.
- Track the iteration number; after iteration 3 fails, stop and escalate.
