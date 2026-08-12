---
name: task-observer
description: Observe substantive multi-step work for reusable workflow improvements, user corrections, recurring patterns, and skill opportunities. Use at the start of task-oriented sessions and during post-task feedback.
---

# Task Observer

Use this skill during substantive multi-step work.

## Observe

Watch for:
- recurring workflows that could become reusable skills;
- user corrections that reveal missing rules or edge cases;
- repeated friction, unnecessary steps, or better approaches;
- successful techniques worth standardising;
- opportunities to simplify an existing workflow.

Do not record one-off corrections, private/secrets, or project-specific details that would not generalise.

## Persistence

Keep observations under a stable project workspace, not an ephemeral git worktree. Use:

- `skill-observations/log.md`
- `skill-observations/last-review-date.txt`
- `cross-cutting-principles.md`

Create the first two files if they do not exist; initialise `last-review-date.txt` with `never` until a review actually runs.

Each observation should use this structure:

```markdown
### Observation NNN: Short title

**Status:** OPEN
**Date:** YYYY-MM-DD
**Session context:** short description
**Skill:** existing skill or new skill candidate
**Type:** open-source | internal
**Phase/Area:** workflow area

**Issue:** what happened

**Suggested improvement:** concrete reusable change

**Principle:** generalisable takeaway
```

Before appending, read the live log and choose the next unused number. Append observations at the end. Keep entries general enough to avoid exposing confidential project information.

## Canonical bundle

For the complete Task Observer methodology and reference files, use the upstream project:
https://github.com/rebelytics/one-skill-to-rule-them-all

This local skill is intentionally lightweight so the project repository does not vendor the upstream bundle.
