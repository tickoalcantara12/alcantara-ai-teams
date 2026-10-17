# Event Contract

Agents report their progress by appending one JSON object per line to `.ai-team/<work-id>/events.jsonl`. The dashboard (and any other tool) reads this file. Validation lives in [src/events.mjs](../src/events.mjs).

## Fields
| Field | Required | Description |
|---|---|---|
| `ts` | yes | ISO 8601 timestamp (added automatically by the CLI) |
| `workId` | yes | Work item id, `^[a-z0-9][a-z0-9-]{0,63}$` (e.g. `feat-todo-api`) |
| `agent` | yes | `architect`, `implementer`, `reviewer`, `security`, `qa` |
| `event` | yes | See below |
| `stage` | no | Short slug: `spec`, `design`, `tasks`, `analysis`, `implement`, `review`, `security`, `qa`, `spec-sync`, … |
| `message` | no | What is happening, max 300 chars. **Never include secrets.** |
| `verdict` | for `verdict` | `APPROVED`, `CHANGES_REQUESTED`, `CLEARED`, `BLOCKED`, `PASS`, `FAIL`, `CONSISTENT`, `GAPS_FOUND` |
| `loop` | for `loop` | Fix iteration number, 1–99 |
| `to` | for `handoff` | Receiving agent |

## Event types
| Event | When the agent emits it |
|---|---|
| `started` | Begins a stage |
| `progress` | A meaningful milestone inside a stage (optional) |
| `handoff` | Passes work to the next role (`to` required) |
| `gate_waiting` | Needs the user: approval gate, clarification question, or waiver |
| `gate_approved` | The user answered and work continues |
| `verdict` | Issues a verdict (`verdict` required) |
| `loop` | Implementer starts fix iteration N (`loop` required) |
| `escalated` | Loop limit reached; the user must decide |
| `done` | The work item is finished |

## Writing an event
```bash
npx ai-dev-team event --work-id feat-todo-api --agent reviewer --event verdict \
  --stage review --verdict CHANGES_REQUESTED --message "2 blocking findings"
```
If the CLI is unavailable, append one line of JSON with the same fields (include `ts`) to the file instead:
```json
{"ts":"2026-10-16T05:00:00.000Z","workId":"feat-todo-api","agent":"reviewer","event":"verdict","stage":"review","verdict":"CHANGES_REQUESTED","message":"2 blocking findings"}
```

## Guarantees and limits
- Events are **self-reported by the agent**; a missing event means "no report", not "no work".
- Readers must skip invalid lines and treat all text as untrusted (render as plain text, never HTML).
