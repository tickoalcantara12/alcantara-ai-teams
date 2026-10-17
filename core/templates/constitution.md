# Project Constitution

Non-negotiable principles for this project. Every spec, design and task is checked against this file. Changing a principle needs explicit user approval and a version bump.

- **Version:** 1.0 · **Last amended:** <date>

## Principles
Draft defaults — adjust for this project. Each principle should be testable.

1. **Simplicity first.** Smallest change that solves the problem; no speculative abstraction.
2. **Follow existing conventions.** Reuse the project's patterns, utilities and structure.
3. **Test-first.** New behavior starts with a failing test; no merging with failing or weakened tests.
4. **Secure by default.** Validate external input, enforce authorization, never hardcode or log secrets.
5. **Explicit errors.** Handle expected errors explicitly; no silent failure.
6. **Backward compatible.** Breaking changes to APIs, data or behavior need explicit approval and a migration path.
7. **Dependencies are a cost.** Add one only with a stated reason.

## Project-specific principles
<!-- e.g. accessibility level, supported platforms, performance budgets, compliance rules, code ownership -->

## Quality gates
- Build: `<command>`
- Lint / types: `<command>`
- Tests: `<command>`
