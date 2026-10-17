# Tasks: <title>

- **Work ID:** <work-id>
- **Spec:** `spec.md` · **Design:** `design.md`

Rules: tests come first. Each task lists the requirements it satisfies. `[P]` marks tasks that touch different files and have no dependency on each other, so they can run in parallel.

## Task list
### T1: <title>
- **Satisfies:** REQ-1, REQ-2
- **Depends on:** none
- **Parallel:** [P] | no
- **Files:** `path/...`
- **Test first:** the failing test(s) to write, per requirement (e.g. REQ-1 → "returns 404 when …")
- **Implement:** what to build, in terms of the design
- **Done when:**
  - [ ] Tests for the listed requirements fail before the change and pass after
  - [ ] Build, lint and type check pass
  - [ ] Code follows the constitution

## Coverage matrix
Every requirement must appear at least once. Every task must satisfy at least one requirement.

| Requirement | Task(s) | Planned test(s) |
|---|---|---|
| REQ-1 | T1 | |
