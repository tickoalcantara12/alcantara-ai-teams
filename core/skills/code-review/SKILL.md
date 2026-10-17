---
name: code-review
description: Step-by-step procedure for the Principal Engineering Team Lead to review a diff for correctness, design conformance, maintainability, performance and tests, producing review.md with blocking/non-blocking findings and a verdict.
---
# Skill: Code Review

## Steps
1. **Scope** – Get the diff (`git diff <base>...HEAD` or staged changes) and read `constitution.md`, `spec.md`, `design.md`, `tasks.md` and `implementation-notes.md` when they exist.
2. **Verify claims** – Run lint, type check, build and tests. Note any mismatch with the implementer's notes.
3. **Review dimensions**
   - Correctness: every requirement the task claims is actually met, edge cases, error paths, concurrency.
   - Spec conformance & Surgical diff: every changed line traces to a requirement ID; no gold-plating, no orthogonal edits to adjacent code/comments/formatting, and no newly orphaned imports/variables left behind.
   - Design conformance: matches design/ADRs; layering and separation of concerns.
   - Simplicity & Maintainability: minimum code that solves the problem ("if 200 lines could be 50, simplify"), no single-use abstractions or speculative configurability, clear naming, no duplication or dead code.
   - Performance: unnecessary queries/loops, N+1, missing indexes, unbounded memory.
   - API/data: backward compatibility, validation, status codes, migration safety.
   - Tests: meaningful assertions, coverage of new logic, no weakened tests.
   - Obvious security smells (deep testing is the pentester's job).
4. **Write findings** in `review.md`: `R<n>` · Blocking/Non-blocking · `file:line` · problem · suggested fix.
5. **Verdict** – `APPROVED` only if there are zero Blocking findings and verification passed; otherwise `CHANGES_REQUESTED`.

## Severity guide
- **Blocking**: incorrect behavior, data loss risk, broken contract, failing checks, missing tests for core logic, security issue.
- **Non-blocking**: readability, minor refactor, optional improvement.
