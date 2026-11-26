# Change-log skill

**Date:** 26 November 2026
**Author:** garethhaagman
**Type:** architectural-decision

## Description of change

Added a `change-log` skill. It writes a permanent record after a non-trivial code
change. Records cover architectural decisions and features. They explain why a
decision was made, not just what changed.

## Implementation details

- `.claude/skills/change-log/SKILL.md` — new skill. Defines when to write a record,
  file locations, and how to fill in each template.
- `.claude/skills/change-log/templates/change.md` — template for `plans/` entries:
  description, implementation details, trade-offs, user input (with verbatim quotes).
- `.claude/skills/change-log/templates/incident.md` — separate template for
  `incidents/` entries: timeline, root cause, impact, severity, status, follow-up.
- `.agents/skills/change-log` — symlink to the directory above, per this repo's
  cross-tool parity convention (`skill-creation` skill) so Cursor sees the same skill.
- `plans/<git-username>/<ddmmyyyy>-<feature-name>/change.md` — location for
  architecture/feature records, one folder per change, date-first so entries sort
  chronologically per user.
- `incidents/<ddmmyyyy>-<description>.md` — flat, repo-root location for incidents, no
  per-user folder since incidents are shared, not personal.

## Trade-offs

- **Chosen:** scope this skill to architecture/features only; leave routine bugfixes on
  the existing `bugtracker` skill and its `bugs/` folder — why: `bugtracker` already
  auto-fires after bugfixes and writes to a different location (`bugs/` at repo root,
  flat, report+resolution pair). A second skill also claiming bugfixes would double-write
  or race with it for the same event.
- **Rejected:** retire `bugtracker` and fold bugfixes into `change-log` under
  `plans/` — why: would have required changing an existing, working skill with its own
  established format (report + resolution pair) for no functional gain, and the user's
  request didn't ask for that.
- **Rejected:** keep both skills active for all changes, differentiated only by whether
  a change needs user-input tracking — why: ambiguous trigger condition in practice; a
  bugfix with a trade-off would be unclear which skill should fire. Clean split by change
  type (bug vs. architecture/feature) is unambiguous.
- **Chosen:** write-biased, read-non-mandatory — records are created proactively on a
  qualifying change, but only read back when explicitly referenced or when diagnosing a
  tricky design/architectural question — why: matches the user's explicit instruction
  that checking this history should be non-mandatory for ordinary changes.

## User input

User requested the skill directly, specifying folder structure, templates, and
triggering conditions. Direct quotes on points where exact wording mattered:

> "this should serve as a record of why an architectural decision / bugfix / incident was made."

> "this record should only be accessed when either specifically referenced or specifically when trying to diagnose what the current architecture is or why i want checking this to be non mandatory when making code changes only when there is a tricky design decision question or common bug question."

> "for incidents specficaillyl mark them under an incidents folder and have a separate tempalte for these they dont need to be under the usual structure"

The user's original request listed bugfixes as something this skill should cover, but
when the pre-existing `bugtracker` skill surfaced mid-build with clear overlap, the user
was asked and chose to keep bugfixes exclusively on `bugtracker` (see Trade-offs above).
