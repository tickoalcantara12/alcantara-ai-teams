---
name: pr-feedback
description: Implement review feedback on our own pull/merge request with the AI dev team (triage → Implementer → Reviewer → Security → QA) and draft replies to each comment.
argument-hint: <PR number or URL>
---
# Command: pr-feedback

Pull request: **$ARGUMENTS**

Create a work id `pr-<number>-feedback` and store artifacts in `.ai-team/<work-id>/`.

1. **Fetch feedback** – Detect the host from the git remote and use its CLI if available:
   - GitHub: `gh pr view <n> --json headRefName,reviews,comments` and `gh api repos/{owner}/{repo}/pulls/<n>/comments` for inline comments
   - GitLab: `glab mr view <n> --comments`
   If no CLI or access is available, ask the user to paste the comments. Never ask for or store access tokens.
2. **Prepare branch** – Make sure the PR head branch is checked out and up to date. If the working tree has uncommitted changes, stop and ask the user — never discard their work.
3. **Triage** (Architect, `system-design` light) – Write `feedback.md` listing every unresolved comment as `F<n>` with author, `file:line`, the request, and a decision:
   - **Accept** – will implement.
   - **Discuss** – disagree or unclear; draft a reasoned reply, do not implement.
   - **Out of scope** – propose a follow-up issue.
   If any comment requires a design or contract change, **pause for user confirmation** of the triage.
4. **Implementer** (`implement-task`) – Implement only the accepted items, referencing `F<n>` in `implementation-notes.md`. Run build/lint/tests.
5. **Reviewer** (`code-review`) – Verify each accepted item is fully addressed and nothing else changed. `CHANGES_REQUESTED` → step 4.
6. **Security** (`security-assessment`) – Run if any change touches auth, input handling, data access, crypto or external calls; otherwise record why it was skipped. `BLOCKED` → step 4.
7. **QA** (`test-verification`) – Add or update tests for the changed behavior and run the relevant suites. `FAIL` → step 4.
8. **Replies** – Write `pr-replies.md` with a reply per `F<n>`: what changed (commit/file), or the reasoning for Discuss/Out-of-scope items.
9. **Confirm before publishing** – Show the user the diff summary and replies. Commit, push and post replies (e.g. `gh pr comment`) **only after explicit user confirmation**. Never force-push, resolve threads or re-request review without being asked.

Loop limit: max 3 fix iterations per gate; then stop and escalate to the user.
