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

Built-in engineering rules merge and deduplicate the **Karpathy Coding Guidelines** (*Think Before Coding*, *Simplicity First*, *Surgical Changes*, *Goal-Driven Execution*) directly into the shared rules and role checklists (`architect`, `implementer`, `reviewer`).

## Requirements
- Node.js 18.3 or newer (only needed to install and to run the `event` and `dashboard` commands).
- One of: Antigravity, Claude Code or Cursor, opened on the project you want the team to work on.
- Optional: `gh` (GitHub) or `glab` (GitLab) for the PR commands.

## Install
The installer copies the team into **your project**.

**Direct from GitHub (interactive one-command setup):**
```bash
cd /path/to/your-project
npx github:tickoalcantara12/alcantara-ai-teams init
```
When run in an interactive terminal, `init` inspects your repository (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.) to suggest smart defaults and walks you through a quick setup wizard:
1. **AI coding tool(s)**: `1) Antigravity (.agents)`, `2) Claude Code (.claude)`, `3) Cursor (.cursor)`, or `4) All`
2. **Project name & summary**
3. **Technology stack** (languages, frameworks, database)
4. **MCP servers / integrations** (e.g. `github`, `jira`, `gitlab`, `linear`, `postgres`, `sentry`)
5. **Additional project requirements / constraints** (e.g. auth, compliance, performance, architecture rules)
6. **Quality gate commands** (`Build`, `Lint / typecheck`, `Test`)

It then:
- Installs the 5 roles, skills, workflows/commands, and local event runner for your chosen tool(s)
- Generates `.ai-team/constitution.md` pre-populated with your project's stack, MCP integrations, quality gates, and requirements so all 5 agents have full context immediately
- Creates `.ai-team/.gitkeep` and adds `.ai-team/**/events.jsonl` to `.gitignore`

Skip prompts (use auto-detected defaults or flags) with `-y` / `--yes`:
```bash
npx github:tickoalcantara12/alcantara-ai-teams init --yes
npx github:tickoalcantara12/alcantara-ai-teams init -y -t antigravity --mcp "github, jira, postgres" --requirements "Strict RBAC"
```

Or install only the tool files without workspace scaffolding:
```bash
npx github:tickoalcantara12/alcantara-ai-teams install -t antigravity
npx github:tickoalcantara12/alcantara-ai-teams install --all
```

**From a local clone of this folder:**
```bash
cd /path/to/your-project
npx /path/to/ai-dev-team init
# or: node /path/to/ai-dev-team/bin/cli.mjs install --target claude-code
```

**Once published to npm:**
```bash
cd /path/to/your-project
npx ai-dev-team init
npx ai-dev-team install --target claude-code      # or: antigravity | cursor
```

Options:
```bash
npx ai-dev-team init                                 # interactive wizard (tools + project + stack + MCP + constitution)
npx ai-dev-team init --yes --all                     # non-interactive: all tools + auto-detected constitution
npx ai-dev-team install -t antigravity -t cursor     # several tools at once
npx ai-dev-team install --all                        # all three tools (-a)
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
| Antigravity | `.agents/rules/ai-dev-team.md`, `.agents/skills/<role or skill>/SKILL.md`, `.agents/workflows/<command>.md`, `.agents/AGENTS.md`, `.agents/ai-team/` (including `event.mjs`) |
| Cursor | `.cursor/rules/ai-team-*.mdc`, `.cursor/commands/<command>.md`, `.cursor/ai-team/` (including `event.mjs`) |
| Workspace (`init`) | `.ai-team/constitution.md` (project overview, tech stack, MCP servers, quality gates, rules), `.ai-team/.gitkeep`, `.gitignore` entry |

After installing, restart or reload your tool if the new commands do not show up. Command and skill discovery depends on the tool and its version.

---

## How to Use

### 1. Initialize in your project
From your project's root directory, run:
```bash
npx github:tickoalcantara12/alcantara-ai-teams init
```
Answer the interactive prompts (or press `Enter` to accept the auto-detected defaults for your AI coding tool, project summary, tech stack, MCP servers like `github`/`jira`/`postgres`, requirements, and build/lint/test commands). This installs the 5 roles, skills, workflows/commands, and writes `.ai-team/constitution.md`.

### 2. Run slash commands in your AI coding tool
Open your project in **Antigravity**, **Claude Code**, or **Cursor**, and type a slash command in the agent chat:

| Command | When to use | What it does |
|---|---|---|
| `/spec <idea>` | Starting a complex feature | Architect drafts `spec.md`, asks clarifying questions, and stops at **Gate 1** for your approval. No design or code yet. |
| `/new-feature <idea or work-id>` | Building a new feature end-to-end | Full spec-driven pipeline (`Spec → Gate 1 → Design & Tasks → Gate 2 → TDD Implementation → Review / Security / QA → Spec Sync`). Reuses an approved spec if given `<work-id>`. |
| `/bug-fix <description>` | Fixing a bug or regression | Reproduces the bug with a failing test first, fixes the root cause, and runs Review, Security, and QA verification. |
| `/review [path or diff]` | Auditing existing code | Read-only audit across Code Review, Security Assessment, and QA Test Coverage. Modifies no files. |
| `/review-pr <PR>` | Reviewing a teammate's PR | Reviews a pull request and drafts inline/summary comments. Posts to GitHub/GitLab only after you confirm. |
| `/pr-feedback <PR>` | Addressing review comments on your PR | Triages reviewer comments on your PR, implements accepted fixes with tests, and drafts replies. Pushes/posts only after you confirm. |

> **Tip for each tool:**
> - **Antigravity (`agy`)**: Type `/new-feature ...`, `/spec ...`, `/bug-fix ...` directly in chat (loaded from `.agents/workflows/`), or ask any role directly (e.g. *"Use `role-architect` to design..."*).
> - **Claude Code (`claude`)**: Type `/new-feature ...` or `/project:new-feature ...` in Claude Code chat. Claude Code automatically delegates to the subagents in `.claude/agents/`.
> - **Cursor**: Type `/new-feature ...` in Cursor Agent chat (from `.cursor/commands/`) or reference `@ai-team-role-architect`, `@ai-team-role-implementer`, etc.

### 3. CLI Reference
You can run CLI commands via `npx github:tickoalcantara12/alcantara-ai-teams <cmd>` (or `npx ai-dev-team <cmd>` if linked/installed):

```bash
# Initialize project (auto-detects tools + scaffolds .ai-team/ & .gitignore)
npx github:tickoalcantara12/alcantara-ai-teams init

# Check active work items and role statuses in the terminal
npx github:tickoalcantara12/alcantara-ai-teams status
npx github:tickoalcantara12/alcantara-ai-teams status --work-id feat-todo-api

# Launch the live pixel-art office dashboard on http://127.0.0.1:4173
npx github:tickoalcantara12/alcantara-ai-teams dashboard
npx github:tickoalcantara12/alcantara-ai-teams dashboard --demo
```

---

## Example Walkthroughs

### Example 1: Building a New Feature Step-by-Step (`/spec` → `/new-feature`)

Suppose you want to add **JWT refresh token rotation** to an existing Node/Express API.

#### Step 1 — Initialize the team & open the live dashboard (optional)
In your terminal:
```bash
cd ~/projects/my-api
npx github:tickoalcantara12/alcantara-ai-teams init
npx github:tickoalcantara12/alcantara-ai-teams dashboard
```

#### Step 2 — Draft and approve the specification (**Gate 1**)
In your AI coding tool's chat, run:
```text
/spec Add JWT refresh token rotation with reuse detection and revocation on logout
```
- **What happens:**
  1. On first run, the **Architect** inspects your repo (`package.json`, directory layout, test runner) and drafts `.ai-team/constitution.md` + `.ai-team/feat-jwt-refresh/spec.md` (`REQ-1`, `REQ-2`, acceptance criteria, edge cases).
  2. If anything is ambiguous (e.g., refresh token TTL or database vs. Redis storage), the Architect asks brief clarifying questions.
  3. The Architect pauses at **Gate 1 (`WAITING FOR APPROVAL`)**.
- **Your response in chat:**
  ```text
  Store refresh tokens in PostgreSQL with a 30-day TTL. Approved!
  ```

#### Step 3 — Design, task breakdown (**Gate 2**), implementation & verification
Continue in chat (or run `/new-feature feat-jwt-refresh`):
```text
/new-feature feat-jwt-refresh
```
- **What happens:**
  1. **Architect (`design` & `tasks`)**: Writes `.ai-team/feat-jwt-refresh/design.md`, `.ai-team/feat-jwt-refresh/tasks.md` (ordered test-first tasks, with independent tasks marked `[P]`), and `.ai-team/feat-jwt-refresh/analysis.md` (verifying every `REQ-*` is covered). Stops at **Gate 2**.
  2. **You approve Gate 2:**
     ```text
     Approved, proceed with implementation.
     ```
  3. **Implementer (`implement`)**: Works task-by-task using strict TDD—writes a failing test first, implements the minimal code to pass, and records test output. Independent `[P]` tasks can run in parallel subagents.
  4. **Reviewer, Security & QA (`review`, `security`, `qa`)**: Run in parallel to review code quality, check for OWASP/auth vulnerabilities, and execute the test suite against every `REQ-*` in `spec.md`.
     - If any gate finds an issue, it hands back to the **Implementer** (up to 3 fix loops) and re-verifies.
  5. **Completion**: You get a final report linking all artifacts and exact verification commands executed.

---

### Example 2: Fast Feature in One Command (`/new-feature`)

If you don't want to run `/spec` separately, pass your idea straight to `/new-feature`:

```text
/new-feature Add a GET /api/health endpoint that checks database connectivity and returns uptime
```
- For small, low-risk changes (1–2 files, no new dependencies or auth changes), the Architect applies **proportional ceremony**: keeps `design.md` and `tasks.md` concise and proceeds smoothly after your spec approval.

---

### Example 3: Fixing a Bug (`/bug-fix`)

When a user reports a bug or a test is failing in production:

```text
/bug-fix Pagination on GET /api/orders returns duplicate items when two orders share the same created_at timestamp
```
- **What happens:**
  1. **Implementer** locates the root cause in the query sorting logic and records `.ai-team/bug-orders-pagination/bug.md`.
  2. Writes a **failing test** that reproduces the duplicate items when timestamps collide.
  3. Fixes the query (e.g., adding a deterministic tie-breaker `ORDER BY created_at DESC, id DESC`) and confirms the test passes.
  4. **Reviewer**, **Security**, and **QA** verify the fix and ensure no regressions were introduced.

---

### Example 4: Auditing Code or Reviewing a Pull Request (`/review` & `/review-pr`)

- **Audit a local module or uncommitted diff (read-only):**
  ```text
  /review src/auth/
  ```
  Produces a consolidated report from the **Reviewer**, **Security Pentester**, and **QA Engineer** ranked by `BLOCKING`, `SHOULD_FIX`, and `NIT` without modifying your working tree.

- **Review a GitHub/GitLab Pull Request:**
  ```text
  /review-pr 42
  ```
  Fetches PR `#42` (via `gh` or `glab`), runs all three review roles in parallel, and presents draft review comments in chat. Nothing is posted to GitHub/GitLab unless you explicitly confirm.

- **Address feedback on your own PR:**
  ```text
  /pr-feedback 42
  ```
  Reads reviewer comments on PR `#42`, groups them into *accept / discuss / decline*, asks for your confirmation, implements accepted changes with tests, and drafts replies.

---

### Example 5: Checking Progress from the Terminal (`status`)

While agents work (or when resuming a project later), inspect progress from your terminal:

```bash
$ npx github:tickoalcantara12/alcantara-ai-teams status

Work items in .ai-team/:
  feat-jwt-refresh  stage: implement  active: implementer (working: "Task 3/5: token reuse detection")

$ npx github:tickoalcantara12/alcantara-ai-teams status --work-id feat-jwt-refresh

Work item: feat-jwt-refresh
  architect    done     stage: tasks      task: "Gate 2 approved"
  implementer  working  stage: implement  task: "Task 3/5: token reuse detection"  loop: 0
  reviewer     idle     stage: -          queued (next)
  security     idle     stage: -          queued
  qa           idle     stage: -          queued
```

---

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
Suggestion: commit the specs and designs, and keep `.ai-team/**/events.jsonl` in `.gitignore` (`init` adds this automatically).

### Pipeline
`Spec → Clarify → [approve] → Design → Tasks → Consistency check → [approve] → Implement (tests first) → Review → Security → QA → Spec sync`. QA can block a release. See [core/workflow.md](core/workflow.md) for the rules.

## Dashboard (optional)
Agents report what they are doing by appending events to `.ai-team/<work-id>/events.jsonl`. The installed rules tell them when to do it: start, handoff, waiting for you, verdict, fix loop, done.

```bash
npx github:tickoalcantara12/alcantara-ai-teams dashboard        # your project, port 4173
npx github:tickoalcantara12/alcantara-ai-teams dashboard --demo # scripted run, no agent needed
npx ai-dev-team dashboard --dir ../app --port 5000 --no-open
```
It is read-only and listens on `127.0.0.1` only. Press Ctrl+C to stop.

Event format: [schema/events.md](schema/events.md). Each target installation bundles a zero-dependency `<pack-dir>/event.mjs` helper (`.claude/ai-team/event.mjs`, `.agents/ai-team/event.mjs`, or `.cursor/ai-team/event.mjs`) so agents can emit events locally without `npx` overhead, or you can use the CLI:
```bash
node .agents/ai-team/event.mjs --work-id feat-todo-api --agent reviewer --event verdict \
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
- **Update:** re-run `init` or `install` with `--force`:
  ```bash
  npx github:tickoalcantara12/alcantara-ai-teams init --force
  ```
- **Uninstall:** run the `uninstall` command to cleanly remove the installed files and the managed `ai-dev-team` block in `CLAUDE.md` or `.agents/AGENTS.md`:
  ```bash
  npx github:tickoalcantara12/alcantara-ai-teams uninstall --all
  npx ai-dev-team uninstall --target claude-code      # or: antigravity | cursor
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
bin/cli.mjs  init | install | uninstall | status | event | dashboard
dashboard/   read-only local server, state reducer, demo run, public/ page
schema/      event contract
test/        node:test suites
```

## Develop
Requires Node 18.3 or newer. There are no runtime dependencies.
```bash
npm test
```
