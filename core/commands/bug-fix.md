---
name: bug-fix
description: Fix a bug with the AI dev team (QA reproduce → Architect root cause → Implementer → Reviewer → Security → QA verify).
argument-hint: <bug description or issue link>
---
# Command: bug-fix

Bug report: **$ARGUMENTS**

Create a work id `bug-<short-slug>` and store all artifacts in `.ai-team/<work-id>/`.

1. **QA – Reproduce** (`test-verification`, bug-fix mode) – Reproduce the bug, write `bugs/BUG-1.md`, and add a **failing regression test**. If it cannot be reproduced, stop and ask the user for more details.
2. **Architect – Root cause** (`system-design`, light) – Identify the root cause (not just the symptom), affected areas and the minimal fix approach in a short `design.md`. Skip user approval unless the fix changes contracts, schema or behavior beyond the bug.
3. **Implementer** (`implement-task`) – Apply the minimal fix; make the regression test pass; run build/lint/tests.
4. **Reviewer** (`code-review`) – Review the fix. *(Steps 4 and 5, when security-relevant, are read-only and may run **in parallel** when the AI tool supports concurrent subagents before returning any blocking findings to step 3.)* `CHANGES_REQUESTED` → step 3.
5. **Security** (`security-assessment`) – Run (in parallel with step 4 when supported) if the bug or fix touches auth, input handling, data access, crypto, or external calls; otherwise record "not security-relevant" with justification. `BLOCKED` → step 3.
6. **QA – Verify** – Confirm the regression test passes and run the surrounding regression suite. `FAIL` → step 3.
7. **Summary** – Root cause, fix, files changed, tests added, real verification results.

Loop limit: max 3 fix iterations per gate; then stop and escalate to the user.
