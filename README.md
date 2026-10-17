# ai-dev-team

A five-role AI development team you install into any project. It works with any tech stack and any LLM, in **Antigravity**, **Claude Code** and **Cursor**.

| Role | Agent | Skill |
|---|---|---|
| Architecture Specialist | `architect` | `system-design` |
| Principal Software Engineer | `implementer` | `implement-task` |
| Principal Engineering Team Lead (reviewer) | `reviewer` | `code-review` |
| Security Pentester | `security` | `security-assessment` |
| QA Engineer (can block release) | `qa` | `test-verification` |

It is a set of Markdown instructions (roles, skills, commands, templates) plus a small Node installer. Your AI coding tool's own model does the work, so there is nothing to host and no API key to configure.

## Requirements
- Node.js 18.3 or newer (only needed to install and to run the `event` and `dashboard` commands).
- One of: Antigravity, Claude Code or Cursor, opened on the project you want the team to work on.
- Optional: `gh` (GitHub) or `glab` (GitLab) for the PR commands.

## Install
The installer copies the team into **your project**. Run it once per project and per tool.

**Not on npm yet?** Point `npx` at this folder (replace the path with where you keep it):
```bash
cd /path/to/your-project
npx /path/to/ai-dev-team install --target claude-code
```
Without `npx`, `node /path/to/ai-dev-team/bin/cli.mjs install --target claude-code` does the same.

**Once published to npm:**
```bash
cd /path/to/your-project
npx ai-dev-team install --target claude-code      # or: antigravity | cursor
```

Options:
```bash
npx ai-dev-team install -t antigravity -t cursor     # several tools at once
npx ai-dev-team install -t claude-code --dir ../app  # install into another folder
npx ai-dev-team install -t claude-code --dry-run     # preview, write nothing
npx ai-dev-team install -t claude-code --force       # overwrite files that already exist
```
- Files that already exist are skipped unless you pass `--force`, so your own edits are not lost.
- `CLAUDE.md` and `.agents/AGENTS.md` get a block between `<!-- ai-dev-team:start -->` and `<!-- ai-dev-team:end -->`. The rest of the file is kept, and re-running only replaces that block.

What gets created in your project:

| Tool | Files |
|---|---|
| Claude Code | `.claude/agents/<role>.md`, `.claude/skills/<skill>/SKILL.md`, `.claude/commands/<command>.md`, `CLAUDE.md`, `.claude/ai-team/` (including `event.mjs`) |
| Antigravity | `.agents/skills/<role or skill>/SKILL.md`, `.agents/workflows/<command>.md`, `.agents/AGENTS.md`, `.agents/ai-team/` (including `event.mjs`) |
| Cursor | `.cursor/rules/ai-team-*.mdc`, `.cursor/commands/<command>.md`, `.cursor/ai-team/` (including `event.mjs`) |

After installing, restart or reload your tool if the new commands do not show up. Command and skill discovery depends on the tool and its version.

## Use
Type a command in your tool's agent chat, for example `/new-feature add a todo API` (in Claude Code, Antigravity and Cursor).

### A typical feature
1. **Spec.** `/spec "users can create, complete and delete todos"`. The Architect drafts `spec.md`, asks you questions about anything unclear, and stops for your approval (**Gate 1**). Nothing is designed or coded before this.
2. **Build.** `/new-feature <work-id>`, for example `/new-feature feat-todo-api`, picks up the approved spec. Or run `/new-feature "idea"` to do both steps in one go. Look in `.ai-team/` for the work id.
   - The Architect writes the design and the test-first task list, then checks that spec, design and tasks agree. You approve again (**Gate 2**; skipped for trivial changes).
   - The Implementer writes failing tests, then the code, task by task.
   - The Reviewer, the Security Pentester and QA then check the result. If any of them finds a problem, it goes back to the Implementer, up to **3 rounds** per gate. After that it stops and asks you.
3. **Result.** Every requirement in the spec is tied to a task and a passing test. The agents give you a summary with the commands they actually ran.

### Commands
| Command | What it does |
|---|---|
| `spec <idea>` | Write and clarify a spec, then stop for your approval. No design or code |
| `new-feature <idea or work id>` | The full spec-driven pipeline with two approval gates; reuses an approved spec if you give its work id |
| `bug-fix <description>` | Reproduce with a failing test, find the root cause, fix, review, security check, verify |
| `review [target]` | Report-only review of existing code or a diff: code review, security, test gaps. Changes nothing |
| `review-pr <PR>` | Review a pull request and draft comments. Posts only after you confirm |
| `pr-feedback <PR>` | Triage the comments on your PR, implement the accepted ones, draft replies. Pushes and posts only after you confirm |

The PR commands use `gh` or `glab` if installed. Otherwise they work from git branches, or from comments you paste. The agents never approve or merge a PR, and never ask for your tokens.

### Check status from the CLI
Inspect work items and each role's current state without opening the browser:
```bash
npx ai-dev-team status                          # list work items and summary status
npx ai-dev-team status --work-id feat-todo-api  # detailed per-role status for one work item
npx ai-dev-team status --dir ../app             # inspect another project folder
```

### Where the work is saved
Agents write to `.ai-team/` in your project:
```
.ai-team/constitution.md          project principles (created on first use, you confirm it)
.ai-team/<work-id>/spec.md        what and why, with REQ-1, REQ-2, ...
.ai-team/<work-id>/design.md      how
.ai-team/<work-id>/tasks.md       test-first tasks and the requirement coverage table
.ai-team/<work-id>/analysis.md    consistency check
.ai-team/<work-id>/review.md, security-report.md, test-plan.md, test-report.md, bugs/
.ai-team/<work-id>/events.jsonl   status events for the dashboard
```
Suggestion: commit the specs and designs, and add `.ai-team/**/events.jsonl` to `.gitignore`.

### Pipeline
`Spec → Clarify → [approve] → Design → Tasks → Consistency check → [approve] → Implement (tests first) → Review → Security → QA → Spec sync`. QA can block a release. See [core/workflow.md](core/workflow.md) for the rules.

## Dashboard (optional)
Agents report what they are doing by appending events to `.ai-team/<work-id>/events.jsonl`. The installed rules tell them when to do it: start, handoff, waiting for you, verdict, fix loop, done.

```bash
npx ai-dev-team dashboard                   # your project (run it in the project folder), port 4173
npx ai-dev-team dashboard --demo            # scripted run, no agent needed
npx ai-dev-team dashboard --dir ../app --port 5000 --no-open
```
It is read-only and listens on `127.0.0.1` only. Press Ctrl+C to stop.

Event format: [schema/events.md](schema/events.md). Each target installation bundles a zero-dependency `<pack-dir>/event.mjs` helper (`.claude/ai-team/event.mjs`, `.agents/ai-team/event.mjs`, or `.cursor/ai-team/event.mjs`) so agents can emit events locally without `npx` overhead, or you can use the CLI:
```bash
node <pack-dir>/event.mjs --work-id feat-todo-api --agent reviewer --event verdict \
  --stage review --verdict CHANGES_REQUESTED --message "2 blocking findings"
# or:
npx ai-dev-team event --work-id feat-todo-api --agent reviewer --event verdict \
  --stage review --verdict CHANGES_REQUESTED --message "2 blocking findings"
```

The server provides `GET /api/works`, `GET /api/state?work=<id>` (status, stage, task, verdict and loop for each of the five agents), `GET /api/events?work=<id>&limit=<n>` (recent raw events for the work item) and `GET /stream?work=<id>` (live updates). It only accepts GET, checks the `Host` header, ignores symlinked folders and sends a strict content security policy. Agents report themselves, so a missing event means "no report", not "no work". A working agent with no event for 5 minutes is marked stale.

The page shows a pixel-art office with one character per role. Each character shows its state: typing (working), raised hand and "?" (waiting for you), red outline and "!" (blocked), green check (done), dimmed (idle), "zzz" (no report for 5+ minutes), and an arrow bubble (handoff). Click a desk or name tag, or use ← →, to see a role's stage, current task, loop count, latest verdict and last update in the side panel, along with a live **activity log** fed by `/api/events` and the event stream. Use the dropdown in the header to switch work items.

## Customize
Edit the files in `core/`: `roles/`, `skills/`, `commands/`, `templates/`, `workflow.md` and `rules.md`. Then reinstall with `--force`. To add a role, add `core/roles/<name>.md` whose frontmatter `skill:` names an existing `core/skills/<skill>/SKILL.md`.

`--force` overwrites installed files. If you edited the installed files in a project directly, copy your changes first or skip `--force`.

## Update and uninstall
- **Update:** get the new version, then run the install again with `--force`.
- **Uninstall:** run the `uninstall` command to cleanly remove the installed files and the managed `ai-dev-team` block in `CLAUDE.md` or `.agents/AGENTS.md`:
  ```bash
  npx ai-dev-team uninstall --target claude-code      # or: antigravity | cursor
  npx ai-dev-team uninstall -t antigravity -t cursor  # several tools at once
  npx ai-dev-team uninstall -t claude-code --dry-run  # preview what would be removed
  ```
  Your `.ai-team/` work artifacts are preserved for you to keep or delete.

## Troubleshooting
| Problem | Fix |
|---|---|
| Commands do not appear in the tool | Restart or reload the tool, and check the files exist (see the table above) |
| `= <file> (exists, use --force to overwrite)` | The file was already there and was left alone. Use `--force` to replace it |
| `Unknown target` | Use one of `antigravity`, `claude-code`, `cursor` |
| `Port 4173 is already in use` | `dashboard --port <other>` |
| Agents did not write events | The tool may not have run the `event` command. Check `.ai-team/<work-id>/events.jsonl` |
| PR commands cannot fetch the PR | Install and sign in to `gh` or `glab`, or paste the diff or comments |

## Project layout
```
core/        roles, skills, commands, templates, workflow, rules (single source of truth)
src/         installer, uninstaller, status, event contract, per-tool adapters
bin/cli.mjs  install | uninstall | status | event | dashboard
dashboard/   read-only local server, state reducer, demo run, public/ page
schema/      event contract
test/        node:test suites
```

## Develop
Requires Node 18.3 or newer. There are no runtime dependencies.
```bash
npm test
```
