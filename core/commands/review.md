---
name: review
description: Review existing code or a diff with the AI dev team (Reviewer + Security + QA test-gap analysis). Report only, no code changes.
argument-hint: [branch, commit range, PR, or path — defaults to current uncommitted changes]
---
# Command: review

Review target: **$ARGUMENTS** (if empty, review uncommitted changes; if none, the diff of the current branch against its base).

Create a work id `review-<short-slug>` and store artifacts in `.ai-team/<work-id>/`. **Do not modify production code or tests.**

1. **Scope** – Resolve the target into a concrete diff or file list and detect the stack.
2. **Reviewer** (`code-review`) – Write `review.md` with Blocking/Non-blocking findings and a verdict. *(Steps 2–4 are read-only and independent: execute `Reviewer`, `Security`, and `QA – Test gap analysis` **in parallel** when the AI tool supports concurrent subagents, or sequentially otherwise, before consolidating into step 5.)*
3. **Security** (`security-assessment`, static + tooling only, no PoC exploitation unless the user asks) – Run in parallel with steps 2 and 4 when supported; write `security-report.md`.
4. **QA – Test gap analysis** (`test-verification`) – Run in parallel with steps 2 and 3 when supported: run existing tests, identify untested behavior and missing edge cases; write `test-report.md` with recommended test cases (do not write them).
5. **Summary** – Once steps 2–4 complete, consolidate the verdict, top findings ordered by severity, and recommended next step (e.g. run `bug-fix` or `new-feature`).
