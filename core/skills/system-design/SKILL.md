---
name: system-design
description: Procedure for the Architecture Specialist in spec-driven development: write a technology-agnostic spec with EARS requirements, resolve clarifications, produce the design, break work into test-first tasks, and run a consistency analysis before implementation.
---
# Skill: System Design (Spec-Driven)

Work in phases. Never start a phase before the previous one is complete. Artifacts go in `.ai-team/<work-id>/`; project principles live in `.ai-team/constitution.md`.

## Phase 0 – Constitution
If `.ai-team/constitution.md` does not exist, draft it from the constitution template, the shared rules and the conventions you detect in the repo (stack, lint/test/build commands). Show it to the user and get confirmation before continuing. If it exists, read it; it governs everything below.

## Phase 1 – Spec (`spec.md`) — *what and why, no technology*
1. Detect the stack and skim the existing system only to understand context, not to design.
2. Restate the problem, users and goal. Write prioritized user stories (P1 first), each independently testable.
3. Write requirements in **EARS** form with stable IDs (`REQ-n`, `NFR-n`). One testable behavior each. Cover edge cases and failure modes; each must map to a requirement.
4. List out-of-scope items and assumptions.
5. **Clarify (Think Before Coding).** Mark every unknown inline as `[NEEDS CLARIFICATION: question]`, list them in Open Questions, surface assumptions and multiple interpretations explicitly, push back when a simpler approach exists, and ask the user concise multiple-choice questions. Do not guess business rules. Update the spec with the answers and remove the markers.
6. **Spec gate:** no markers remain, every requirement is testable, no implementation detail leaked in. Then get user approval (Gate 1).

## Phase 2 – Design (`design.md`) — *how*
1. Complete the constitution check; justify any deviation or change the design.
2. Map the existing system: modules, entry points, data models, APIs, utilities to reuse (cite paths).
3. **Simplicity First:** Choose the simplest design that satisfies the spec. Avoid single-use abstractions, speculative configurability, or error handling for impossible scenarios. For each significant decision, compare 2–3 options and record an ADR.
4. Describe components, data flow, API/schema changes, error handling, migration and rollback.
5. Fill the requirement coverage table: every requirement is addressed by the design.
6. Assess impact: compatibility, performance, security surface, data.

## Phase 3 – Tasks (`tasks.md`)
1. Small, ordered tasks (`T1`, `T2`, …), each satisfying one or more requirement IDs.
2. Each task names the **failing test to write first**, the files it touches, and its dependencies.
3. Mark `[P]` only where tasks touch different files and do not depend on each other.
4. Fill the coverage matrix.

## Phase 4 – Consistency analysis (`analysis.md`, read-only)
Run every check from the analysis template across constitution, spec, design and tasks. Fix Blocking gaps by amending the earliest affected document, then re-run. Maximum 3 passes, then escalate to the user.

## Phase 5 – Gate 2
Show the user a short summary of the design, the task list and the analysis verdict. For trivial changes (single small task, no contract/data/security impact) the Architect may state why and skip Gate 2; Gate 1 is never skipped.

## Spec upkeep (during and after implementation)
If review, security or QA reveal that the spec was wrong or incomplete, amend `spec.md` (new/changed REQ IDs), record it in the change log, and update design, tasks and tests accordingly. The spec must match the shipped behavior.

## Light mode (bug-fix)
Skip Phases 1 and 3. Write a short `design.md` with root cause, affected requirements/behavior, and the minimal fix.
