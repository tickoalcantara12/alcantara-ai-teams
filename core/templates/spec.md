# Spec: <title>

- **Work ID:** <work-id>
- **Status:** Draft | Approved
- **Constitution:** `.ai-team/constitution.md` (principles that apply to this spec)

> This document is technology-agnostic: it states **what** and **why**, never **how**. No frameworks, libraries, schemas or file names here.

## 1. Problem & Goal
Why this is needed and what success looks like.

## 2. Users & Scenarios
### US1: <story title> (P1)
As a <user>, I want <capability>, so that <benefit>.
- **Independent test:** how this story can be demonstrated on its own.

## 3. Requirements
Use EARS patterns. One testable behavior per requirement, each with a stable ID.

| Pattern | Template |
|---|---|
| Always | THE SYSTEM SHALL … |
| Event | WHEN <trigger> THE SYSTEM SHALL … |
| State | WHILE <state> THE SYSTEM SHALL … |
| Unwanted | IF <condition> THEN THE SYSTEM SHALL … |
| Optional | WHERE <feature is present> THE SYSTEM SHALL … |

| ID | Story | Requirement | Priority |
|---|---|---|---|
| REQ-1 | US1 | WHEN … THE SYSTEM SHALL … | Must |

## 4. Non-functional Requirements
Performance, security, accessibility, compliance, availability — each with a measurable target and an ID (`NFR-1`).

## 5. Edge Cases & Failure Modes
Empty/invalid input, limits, permissions, concurrency, partial failure. Each maps to a requirement (add one if missing).

## 6. Out of Scope

## 7. Assumptions

## 8. Open Questions
Every unresolved point is marked `[NEEDS CLARIFICATION: <question>]` inline in the document and listed here.
**Design must not start while any marker remains.**

## 9. Change Log
| Date | Change | Reason |
|---|---|---|
