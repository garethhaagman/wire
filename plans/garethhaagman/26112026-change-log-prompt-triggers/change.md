# Change-log skill prompt triggers

**Date:** 26 November 2026
**Author:** garethhaagman
**Type:** architectural-decision

## Description of change

Rewrote the `change-log` skill so agents load it from the user's request.
They no longer wait until after a code change or commit. The write stays a
required closing step of the same task.

## Implementation details

- `.claude/skills/change-log/SKILL.md`, bumped to `1.1.0`. Description now
  matches user-intent phrases (`build` / `add` / `implement` / `create` /
  `design` a feature, architectural change, new module/service/dependency,
  data model or API contract change, incident). Added a required flow:
  load at start → do the work → write `plans/` or `incidents/` before
  finishing. Explicitly rejected "log after commit" as too frequent and
  often never reached in the same turn.
- `.agents/skills/change-log` unchanged as a symlink to the directory above.

## Trade-offs

- **Chosen:** trigger on prompt intent (like `api-design` / `design-system`),
  why: Cursor selects skills from the user prompt at the start of a turn.
  "Invoke after making a change" never matched mid-implementation, so the
  skill rarely loaded.
- **Rejected:** force a write after every git commit (hook or skill
  instruction), why: the user said that would be too frequent, and many
  feature turns never commit in-session.
- **Rejected:** keep post-hoc "after change" wording and only tighten the
  body, why: the description is what the agent sees for discovery; body
  text alone cannot fix selection.

## User input

User reported the skill was not being invoked when making code changes, and
rejected per-commit forcing:

> "for the changelog skill its not being invoked when actually making codechanges."

> "i thought about forcing it after each commit but that would be too frequent instead can we just mkae this better so its actually invoked when a user prompts to create a feature etc"
