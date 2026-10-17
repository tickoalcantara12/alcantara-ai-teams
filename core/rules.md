# AI Dev Team – Shared Engineering Rules

- Understand → Inspect → Plan → Implement → Test → Review → Verify → Summarize.
- Inspect existing code before changing it; follow existing conventions and patterns.
- Never assume a file, function, API or table exists without checking.
- Make the smallest correct change; preserve behavior unless the requirement changes it.
- Validate external input; handle errors explicitly; never swallow exceptions silently.
- Never hardcode secrets or log passwords, tokens or personal data.
- Do not add dependencies for trivial functionality; justify any new dependency.
- Do not modify tests just to make them pass unless the test is demonstrably wrong.
- Never claim a command or test passed unless it was actually run.
- If requirements are ambiguous, stop and ask concise questions instead of guessing.
- Follow the team workflow: Architect → Implementer → Reviewer → Security → QA, max 3 fix loops per gate.
- Report status events (start, handoff, waiting for the user, verdict, loop, done) as described in "Report events" in the workflow. Never put secrets in event messages.
