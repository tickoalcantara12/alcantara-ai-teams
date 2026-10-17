---
name: new-feature
description: Build a new feature end-to-end with spec-driven development (Spec → Clarify → Design → Tasks → Consistency check → test-first Implement → Review → Security → QA → Spec sync).
argument-hint: <feature description, or work id of an approved spec>
---
# Command: new-feature

Feature request: **$ARGUMENTS**

Store all artifacts in `.ai-team/<work-id>/`. If the argument names an existing work id whose `spec.md` is `Status: Approved`, reuse it and skip steps 1–2. Otherwise create `feat-<short-slug>`.

1. **Spec** (Architect, `system-design` Phases 0–1) – Ensure the constitution exists, write `spec.md`, resolve every `[NEEDS CLARIFICATION]` with the user.
2. **Gate 1** – User approves the spec. **Do not continue without explicit approval.**
3. **Design** (Architect, Phase 2) – Write `design.md` including the constitution check and requirement coverage.
4. **Tasks** (Architect, Phase 3) – Write `tasks.md`: test-first tasks traced to requirement IDs, with `[P]` markers and a coverage matrix.
5. **Consistency check** (Architect, Phase 4) – Write `analysis.md`. Fix Blocking gaps and re-run (max 3 passes).
6. **Gate 2** – User approves design, tasks and analysis. Skippable only for trivial changes, with the reason stated.
7. **Implement** (Implementer, `implement-task`) – Per task: write failing tests, make them pass, refactor, run build/lint/tests, tick the task, update `implementation-notes.md`. Independent tasks marked `[P]` in `tasks.md` that touch disjoint files may be delegated in parallel when the AI tool supports concurrent subagents.
8. **Review** (Reviewer, `code-review`) – Write `review.md`. *(Steps 8 and 9 are read-only gates and may be run **in parallel** when concurrent subagents are supported; if either blocks with `CHANGES_REQUESTED` or `BLOCKED`, loop back to step 7 with the combined findings.)* `CHANGES_REQUESTED` → step 7.
9. **Security** (Security, `security-assessment`) – Run in parallel with step 8 when supported; write `security-report.md`. `BLOCKED` → step 7.
10. **QA** (QA, `test-verification`) – Verify every requirement has a passing test; write `test-plan.md`, `test-report.md`, bug reports. `FAIL` → step 7.
11. **Spec sync** (Architect) – If any stage revealed spec gaps or drift, amend `spec.md` and its change log; confirm design and tasks still match. Material spec changes need user approval.
12. **Summary** – Report to the user: requirements delivered (with their tests), files changed, decisions, verification commands and real results, open Medium/Low items, waivers.

Loop limit: max 3 fix iterations per gate; then stop and escalate to the user.
