---
name: spec
description: Write and clarify a technology-agnostic specification (EARS requirements) for an idea using the Architect, then stop for user approval. Does not design or implement.
argument-hint: <idea or feature description>
---
# Command: spec

Idea: **$ARGUMENTS**

Create a work id `feat-<short-slug>` and store artifacts in `.ai-team/<work-id>/`. **Do not design or write code.**

1. **Constitution** – Run Phase 0 of the `system-design` skill: ensure `.ai-team/constitution.md` exists and is confirmed by the user.
2. **Spec** – Run Phase 1 of the `system-design` skill: write `spec.md` from the spec template (user stories, EARS requirements with IDs, edge cases, out of scope, assumptions).
3. **Clarify** – Ask the user concise questions for every `[NEEDS CLARIFICATION]`; update the spec and remove the markers. Repeat until none remain.
4. **Gate 1** – Present a short summary (stories, requirement count, key assumptions, out of scope) and ask the user to approve the spec. Set `Status: Approved` only after explicit approval.
5. **Next step** – Tell the user to run `new-feature` to continue from this approved spec.
