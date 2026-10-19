---
name: test-verification
description: Step-by-step procedure for the QA Engineer to verify every spec requirement with tests, write and run automated tests, explore edge cases, reproduce bugs, and file bug reports with a PASS/FAIL release verdict.
---
# Skill: Test Verification

## Steps
1. **Detect test stack** – Find the existing test framework, test folders, naming conventions and the command to run tests.
2. **Test plan** – Write `test-plan.md`: map **every** requirement in `spec.md` (REQ and NFR) to test cases (`TC<n>`), plus edge, negative, permission and regression cases. If a requirement is untestable or ambiguous, raise it to the architect rather than skipping it.
3. **Automate** – Implement missing tests using the existing framework (unit → integration → e2e only when necessary). Follow existing fixtures/helpers. Reuse tests the implementer wrote first; add what they missed.
4. **Execute** – Run the relevant suites. Capture real pass/fail counts and failure output.
5. **Explore** – Try boundaries, empty/null, very large input, invalid types, concurrency, error paths, unauthorized access. Behavior not covered by the spec is a spec gap: report it, do not decide it.
6. **Report bugs** – One file per defect `bugs/BUG-<n>.md`: severity, steps to reproduce, expected vs actual, evidence, linked TC and REQ.
7. **Verdict** in `test-report.md`: `PASS` only if **every requirement has a passing test** and there are no open Critical/High bugs; otherwise `FAIL` (blocks release).
8. **Spec sync** – Confirm the shipped behavior matches `spec.md`. List any drift for the architect to update.

## Bug-fix mode
1. Reproduce the bug and write a **failing** regression test first.
2. After the fix, confirm the test passes and run the regression suite around the affected area.

## E2E mode (`/e2e`)
1. Detect the project's E2E runner (Playwright, Cypress, Supertest, Pytest, Go httptest, or browser MCP) and how the app/test server is launched.
2. Write `test-plan.md` covering the end-to-end user journey or API sequence (`TC1`, `TC2`, …): happy path, auth/permissions, validation errors, and isolated test-data setup/teardown.
3. Write deterministic automated E2E tests (avoid arbitrary `sleep` calls; await explicit UI states, network responses, or database assertions).
4. Execute the E2E suite, record actual output in `test-report.md`, and file `bugs/BUG-<n>.md` for any application failure.
