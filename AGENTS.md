READ RULES.md FIRST. Its rules override everything else except the assessment brief.

## Development

You can assume that all servers are already running in correct ports via .tmuxp.yaml

## Agent workflow & tracking

### On session start
Read these files in order:
1. RULES.md
2. AGENTS.md (this file)
3. plans/00-master-plan.md
4. plans/10-dev-flow-and-timeline.md
5. plans/01-requirements-checklist.md
6. plans/08-codebase-map.md
7. The latest entries of logs/SESSION_LOG.md and plans/07-change-log.md
8. plans/03-decisions.md
9. Before UI work, also read plans/09-ui-skills.md and the skills it lists.

### During work
- Tick checklist items only when truly done and verified, never on "written but untested".
- After EVERY meaningful change (new file, new endpoint, migration, edited core file, new dependency), append an entry to plans/07-change-log.md in this format:
    ## [date time] [agent/tool] [short title]
    - What changed: (files created/edited, one line each)
    - Why: (which requirement or checklist item this serves)
    - How it works: (2-4 plain-language sentences a junior developer can follow)
    - Core file touched? yes/no (if yes, also logged in plans/03-decisions.md)
    - How to verify: (exact command or click path)
    - Commit: (hash or message)
- Whenever the folder structure changes, update plans/08-codebase-map.md in the same commit.

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
Also add the session's time to logs/HOURS.md.

### Decision logging
- Log every non-obvious decision in plans/03-decisions.md (decision, options, why, date).

### Lessons learned
- Whenever I correct an agent, add a rule to this "Lessons learned" section so no agent repeats the mistake.
- Session logs and running hours belong in `logs/` (e.g. `logs/SESSION_LOG.md`, `logs/HOURS.md`), keeping `plans/` focused strictly on architecture and specifications.

### Commit discipline
- Commit in small steps with clear messages; never leave the repo broken at session end.
- Never commit secrets. api/.env is git-ignored; api/.env.example gets an empty GOOGLE_API_KEY=.
