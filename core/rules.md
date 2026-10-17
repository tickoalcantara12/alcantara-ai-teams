# AI Dev Team – Shared Engineering Rules

1. **Think Before Coding**
   - Inspect existing code before changing it; never assume a file, function, API, or table exists without checking.
   - State assumptions explicitly. When multiple interpretations exist, surface them instead of picking silently.
   - Push back when a simpler approach exists. If requirements are ambiguous, stop and ask concise questions instead of guessing.

2. **Simplicity First**
   - Write the minimum code that solves the problem—nothing speculative.
   - No features beyond what was asked, no abstractions for single-use code, no unrequested configurability, and no error handling for impossible scenarios.
   - If 200 lines could be 50, simplify it. Do not add dependencies for trivial functionality; justify any new dependency.

3. **Surgical Changes**
   - Touch only what is required; every changed line must trace directly to the user's request or a requirement ID (`REQ-*`).
   - Preserve existing behavior, style, and comments; do not "improve", reformat, or refactor adjacent code that isn't broken.
   - Clean up only imports, variables, or functions that your own changes made unused. Mention pre-existing dead code instead of deleting it silently.

4. **Goal-Driven Execution**
   - Work in verifiable steps: `Understand → Inspect → Plan (Step → verify: [check]) → Implement (TDD) → Test → Review → Verify → Summarize`.
   - Do not modify tests just to make them pass unless the test is demonstrably wrong.
   - Never claim a command or test passed unless it was actually run.

5. **Security, Reliability & Team Workflow**
   - Validate external input; handle expected errors explicitly; never swallow exceptions silently.
   - Never hardcode secrets or log passwords, tokens, or personal data.
   - Follow the team workflow: `Architect → Implementer → Reviewer → Security → QA`, max 3 fix loops per gate.
   - Report status events (start, handoff, waiting for the user, verdict, loop, done) as described in "Report events" in the workflow. Never put secrets in event messages.
