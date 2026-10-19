---
name: e2e
description: Plan, write, and execute automated End-to-End (E2E) and integration tests for a user journey, API flow, or work item with the AI dev team (QA plan & automate → execute → optional Implementer fix loop).
argument-hint: <user journey, URL/endpoint, or existing work-id>
---
# Command: e2e

E2E target: **$ARGUMENTS**

If `$ARGUMENTS` is an existing `<work-id>` in `.ai-team/<work-id>/`, reuse that folder and its `spec.md`. Otherwise create a work id `e2e-<short-slug>` and store all artifacts in `.ai-team/<work-id>/`.

1. **QA – Detect E2E Stack & Scope** (`test-verification`, E2E mode) – Inspect `.ai-team/constitution.md` and the repository for existing E2E / integration test runners (e.g. **Playwright**, **Cypress**, **Supertest**, **Vitest/Jest**, **Pytest**, **Go httptest**, or browser MCP tools) and how the application or test server is started. If no E2E runner is configured yet, ask the user before adding any new dependency.
2. **QA – E2E Test Plan** – Write `.ai-team/<work-id>/test-plan.md` mapping the target user journey or API workflow into concrete E2E scenarios (`TC1`, `TC2`, …):
   - Happy-path end-to-end flow (entry point → state transitions → persistence / UI / response assertions).
   - Authentication, authorization, and permission boundaries.
   - Validation failures, error recovery, and edge/boundary inputs.
   - Clean test data setup and teardown (idempotent, isolated runs).
3. **QA – Automate E2E Suite** – Write or update automated E2E tests following the project's conventions, selectors, fixtures, and helpers. Do not modify production code.
4. **QA – Execute & Report** – Run the E2E suite (starting/verifying the local app or test environment as required) and record real command output, pass/fail counts, and timings in `.ai-team/<work-id>/test-report.md`.
   - If all E2E tests pass: issue verdict `PASS` and proceed to step 7.
   - If any E2E test fails due to an application bug: file `.ai-team/<work-id>/bugs/BUG-<n>.md` with reproduction steps, expected vs actual behavior, and logs/screenshots, issue verdict `FAIL`, and **ask the user** whether to hand off to `implementer` to fix the bug(s) now.
5. **Implementer – Fix Application Defects** (`implement-task`, only when user confirms) – Fix the root cause of each `BUG-<n>` with surgical changes, run build/lint/tests, and record notes in `implementation-notes.md`.
6. **Reviewer & QA Re-verify** – Reviewer (`code-review`) checks the fix diff and QA (`test-verification`) re-runs the full E2E suite. `CHANGES_REQUESTED` or `FAIL` → step 5 (max 3 fix loops, then escalate).
7. **Summary** – Report scenarios covered (`TC*`), E2E test files created/updated, exact commands executed, and final `PASS`/`FAIL` verdict.
