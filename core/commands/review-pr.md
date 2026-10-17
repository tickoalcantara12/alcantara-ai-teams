---
name: review-pr
description: Review a pull/merge request with the AI dev team (Reviewer + Security + QA test-gap analysis) and produce PR-ready review comments. Posts to the PR only after user confirmation.
argument-hint: <PR number or URL>
---
# Command: review-pr

Pull request: **$ARGUMENTS**

Create a work id `pr-<number>-review` and store artifacts in `.ai-team/<work-id>/`. **Do not modify code, push, approve or merge.**

1. **Fetch the PR** – Detect the host from the git remote and use its CLI if available:
   - GitHub: `gh pr view <n> --json title,body,baseRefName,headRefName,files,comments` and `gh pr diff <n>`
   - GitLab: `glab mr view <n>` and `glab mr diff <n>`
   - Otherwise: `git fetch origin <head-branch>` and `git diff origin/<base>...origin/<head>`.
   If no CLI or access is available, ask the user to provide the branch names or the diff. Never ask for or store access tokens.
2. **Understand intent** – Read the PR title/description, linked issue, and existing comments. Note anything the PR claims but does not do.
3. **Reviewer** (`code-review`) – Review only the PR's changes plus the code they directly affect. Write `review.md`. *(Steps 3–5 are read-only and independent: execute `Reviewer`, `Security`, and `QA – Test gap analysis` **in parallel** when the AI tool supports concurrent subagents, or sequentially otherwise, before consolidating into `pr-comments.md`.)*
4. **Security** (`security-assessment`, static + tooling only) – Run in parallel with steps 3 and 5 when supported; write `security-report.md`.
5. **QA – Test gap analysis** (`test-verification`) – Run in parallel with steps 3 and 4 when supported: check out the PR head locally if possible, run the relevant tests, and list missing test cases in `test-report.md`.
6. **PR comments** – Once steps 3–5 complete, consolidate findings into `pr-comments.md`: one entry per finding with `file:line`, severity (Blocking / Suggestion / Question / Security-<level>), and a concise, respectful comment with a suggested fix. Add an overall summary and a recommended verdict: `APPROVE`, `COMMENT` or `REQUEST_CHANGES`.
7. **Confirm before posting** – Show the summary to the user. Post to the PR (e.g. `gh pr review <n> --comment|--request-changes --body-file ...`) **only if the user explicitly confirms**. Never approve or merge on the user's behalf.
