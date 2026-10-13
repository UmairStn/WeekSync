READ RULES.md FIRST. Its rules override everything else except the assessment brief.

## Development

You can assume that all servers are already running in correct ports via .tmuxp.yaml

## Agent workflow & tracking

### On session start
Read these files in order:
1. RULES.md
2. AGENTS.md (this file)
3. plans/00-master-plan.md
4. docs/01-requirements-checklist.md
5. docs/02-data-model-and-tenancy.md
6. docs/03-decisions.md
7. docs/04-ai-design.md
8. docs/06-cut-list.md
9. The latest entry of logs/SESSION_LOG.md

### During work
- Tick checklist items in docs/01-requirements-checklist.md only when truly done and verified, never on "written but untested".
- Track operational progress and handoffs directly in logs/SESSION_LOG.md.

### On session end (or when I say stop)
Append an entry to logs/SESSION_LOG.md with:
- Date/time
- Which agent/tool
- Which build phase
- What was done
- What's in progress
- The exact next step
- Blockers
- Files touched
- Commands to verify

### Decision logging
- Log every non-obvious decision in docs/03-decisions.md (decision, options, why, date).

### Lessons learned
- Session logs belong in `logs/SESSION_LOG.md`, keeping `plans/` and `docs/` focused strictly on roadmap and architecture specifications.
- DO NOT automatically run git commit. The human lead reviews and controls commits; agents track all work in the `logs/` folder and wait for explicit commit instructions.
- DO NOT run tests or validation commands in the terminal. The human lead will verify, test, and validate manually.

### Commit discipline
- DO NOT automatically commit. Wait for the human lead's explicit approval or instructions before any git commit.
- Never commit secrets. api/.env is git-ignored; api/.env.example gets an empty GOOGLE_API_KEY=.
