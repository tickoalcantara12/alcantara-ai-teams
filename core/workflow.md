# AI Dev Team Workflow

## Team
| Role | Agent | Skill | Gate |
|---|---|---|---|
| Architecture Specialist | `architect` | `system-design` | Spec approved by user (Gate 1); design + tasks approved (Gate 2, skippable if trivial) |
| Principal Software Engineer | `implementer` | `implement-task` | Build + lint + existing tests pass |
| Principal Engineering Team Lead | `reviewer` | `code-review` | Verdict `APPROVED` |
| Security Pentester | `security` | `security-assessment` | No open Critical/High findings |
| QA Engineer | `qa` | `test-verification` | All acceptance criteria pass — **can block release** |

## Pipeline (spec-driven)
```
Spec → Clarify → [Gate 1] → Design → Tasks → Consistency check → [Gate 2]
  → Implement (tests first) → Reviewer → Security → QA → Spec sync → Done
          ↑                      │          │        │
          └──────────────────────┴──────────┴────────┘  (findings loop back)
```
Spec, Design, Tasks and the consistency check are all done by the Architect.

When the host tool supports parallel subagents:
- Independent tasks marked `[P]` in `tasks.md` that touch disjoint files can be implemented in parallel.
- Read-only verification stages (`Reviewer` and `Security`, plus `QA` test-gap analysis in review-only flows) can run in parallel to reduce latency.

## Artifacts
Project-level: `.ai-team/constitution.md` — non-negotiable principles every spec, design and task is checked against.

Per work item in `.ai-team/<work-id>/`:
`spec.md` (what/why, EARS requirements with `REQ-n` IDs), `design.md` (how), `tasks.md` (test-first tasks + coverage matrix), `analysis.md` (consistency check), `implementation-notes.md`, `review.md`, `security-report.md`, `test-plan.md`, `test-report.md`, `bugs/BUG-<n>.md`.
Templates are in the `templates/` section of this pack.

Traceability: requirement → task → test. Every requirement must have a task and a passing test; every task must satisfy a requirement.

## Rules
1. **Stack detection first.** Every role inspects manifest files (`package.json`, `pyproject.toml`, `go.mod`, `pom.xml`, `build.gradle`, `Cargo.toml`, `*.csproj`, `composer.json`, `Gemfile`, …) and uses the project's own build, lint and test commands. Never assume a stack.
2. **Loop limit.** Max **3** Implementer fix iterations per gate. On the 4th failure, stop and escalate to the user with a summary of the unresolved findings.
3. **Blocking.** Reviewer `CHANGES_REQUESTED`, Security Critical/High, or QA `FAIL` blocks completion. Only the user can waive a block, and the waiver must be recorded in the artifact.
4. **Single responsibility.** Roles do not do each other's work: Reviewer and Security report, they do not fix; QA writes tests, not production code.
5. **Honesty.** Never claim a command, build or test passed unless it was actually executed and its output observed.
6. **Scope.** No unrelated refactors, dependency upgrades or config changes without stating the reason.
7. **Spec is the source of truth.** Never design while `[NEEDS CLARIFICATION]` markers remain. If a later stage finds the spec wrong or incomplete, the Architect amends it (with change log) before code or tests diverge from it.
8. **Tests first.** New behavior starts with a failing test that traces to a requirement.
9. **Proportional ceremony (fast path).** For trivial changes (`<= 2` files, single small task, no schema/auth/API contract impact), Gate 2 may be skipped with stated justification and `design.md` / `analysis.md` kept concise.

## Report events
Every agent reports its status so the dashboard can show it. Append one event per moment below to `.ai-team/<work-id>/events.jsonl`, using `--agent <your role name>`. Prefer the bundled local zero-dependency runner when installed (`<pack-dir>` is `.claude/ai-team`, `.agents/ai-team`, or `.cursor/ai-team`), or fall back to the CLI:

```bash
node <pack-dir>/event.mjs --work-id <work-id> --agent <role> --event <type> [--stage <stage>] [--message "<short text>"] [--verdict <V>] [--loop <n>] [--to <role>]
# or via CLI:
npx ai-dev-team event --work-id <work-id> --agent <role> --event <type> [--stage <stage>] [--message "<short text>"] [--verdict <V>] [--loop <n>] [--to <role>]
```
If neither is available, append one JSON line with the same fields plus `ts` (ISO time) to that file.

| Event | Emit when |
|---|---|
| `started` | You begin a stage (`--stage spec`, `design`, `tasks`, `analysis`, `implement`, `review`, `security`, `qa`, `spec-sync`, …) |
| `progress` | You reach a meaningful milestone (optional) |
| `gate_waiting` | **Before** you ask the user for approval, clarification or a waiver |
| `gate_approved` | The user answered and you continue |
| `verdict` | You issue a verdict (`--verdict APPROVED`, `CHANGES_REQUESTED`, `CLEARED`, `BLOCKED`, `PASS`, `FAIL`, `CONSISTENT`, `GAPS_FOUND`) |
| `loop` | The implementer starts fix iteration N (`--loop N`) |
| `handoff` | You pass work to the next role (`--to <role>`) |
| `escalated` | The 3-loop limit is reached and the user must decide |
| `done` | The work item is finished (emitted by the last agent) |

Keep messages short and factual. **Never include secrets, tokens or personal data.** Full contract: `schema/events.md`.

## Commands
| Command | Flow |
|---|---|
| `spec` | Constitution → Spec → Clarify → Gate 1 approval. No design or code |
| `new-feature` | Spec (or reuse approved) → Gate 1 → Design → Tasks → Consistency check → Gate 2 → test-first Implement → Reviewer → Security → QA → Spec sync |
| `bug-fix` | QA (reproduce) → Architect (root cause, light) → Implementer → Reviewer → Security (if security-relevant) → QA (verify + regression test) |
| `review` | Reviewer + Security (+ QA test-gap analysis) on existing code/diff — report only, no changes |
| `review-pr` | Fetch PR → Reviewer + Security + QA test-gap → PR-ready comments; posts only after user confirmation |
| `pr-feedback` | Fetch PR comments → triage → Implementer → Reviewer → Security (if relevant) → QA → draft replies; pushes/posts only after user confirmation |
