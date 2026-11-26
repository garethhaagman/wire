---
name: change-log
description: Invoke after making a non-trivial code change in this repo — an architectural decision, a new feature, or anything with a real design trade-off — to write a permanent record under plans/. Also covers incidents, logged under incidents/ with a separate template. Do NOT use for routine bugfixes (see bugtracker skill) or trivial changes (typos, formatting, dependency bumps). Reading past records is non-mandatory — only load them when the user explicitly references one, or when diagnosing a tricky design question or a bug that looks architectural in origin.
version: "1.0.0"
---

# Change log

A permanent, append-only record of _why_, architectural decisions, feature trade-offs,
and incidents, kept separately from code comments and commit messages so the reasoning
survives even after the code around it changes. This skill is **write-biased**: creating
a record is proactive after a qualifying change; reading past records is not, only do
that when the user explicitly references one, or when diagnosing a tricky design
question or a bug whose cause looks architectural.

This is distinct from the `bugtracker` skill. Routine bugfixes go through `bugtracker`
into `bugs/` at repo root, don't duplicate those here. This skill covers everything
`bugtracker` doesn't: architectural decisions and features. Incidents get their own
template and location (below).

## When to write a record

Write one when a change involved a real decision, something a future reader could
reasonably ask "why was it done this way?" about. That includes:

- A new feature or capability, however small, if it involved choosing between
  approaches.
- An architectural decision, new module boundary, new dependency, changed data model,
  changed API contract shape.
- An incident, something broke in a way worth a permanent record (see Incidents below).

Don't write one for: routine bugfixes (use `bugtracker` instead), typos, formatting,
dependency version bumps with no behavior change, or any change where there was
genuinely no decision to record, only one obvious way to do it.

## Where files go

### Architectural decisions and features

```
plans/<git-username>/<ddmmyyyy>-<short-feature-name>/change.md
```

- `<git-username>`, output of `git config user.name`, as-is.
- `<ddmmyyyy>`, today's date, e.g. `26112026` for 26 Nov 2026. Date-first so entries
  sort chronologically within each person's folder.
- `<short-feature-name>`, kebab-case, a handful of words.
- Example: `plans/garethhaagman/26112026-agent-run-polling/change.md`.
- One folder per change. If a second unrelated change happens the same day with a
  similar name, disambiguate (`-2`) rather than overwrite.
- Create `plans/<git-username>/` if it doesn't exist yet. No index or README file,
  the directory listing is the index.

Use the template at `templates/change.md` in this skill's directory.

### Incidents

```
incidents/<ddmmyyyy>-<short-description>.md
```

Flat, at repo root, no per-user subfolder, incidents are shared, not personal.

- Example: `incidents/26112026-websocket-reconnect-storm.md`.
- Create `incidents/` at repo root if it doesn't exist yet.

Use the template at `templates/incident.md` in this skill's directory, it is
deliberately different from the change template (timeline, impact, severity, status
fields that a design-decision record doesn't need).

## Writing the change template

Fill in every section of `templates/change.md`:

- **Description of change**, plain language, simple-English style (same convention as
  this repo's PR descriptions: one idea per sentence, max ~20 words, active voice, no
  noun-stacking). Should read clearly to someone unfamiliar with the specific code.
  Keep it tight, a few sentences, not an essay.
- **Implementation details**, what was actually affected: files, modules, services,
  data model. Concrete, not a narrative of the debugging process.
- **Trade-offs**, why this approach over the alternatives. Name the alternative(s) and
  the specific reason each was rejected. If there was genuinely only one reasonable
  option, say so rather than inventing alternatives to reject.
- **User input**, either `"No user input, this decision was made autonomously based
  on <reason>."`, or a description of what the user specified, with direct, verbatim
  quotes where the exact wording matters (a stated requirement, a rejected approach, a
  stated priority). Never paraphrase a quote.

## Writing the incident template

Fill in every section of `templates/incident.md`, in particular:

- **Timeline**, chronological, even if approximate.
- **Root cause**, confirmed, not guessed. If still unknown, say so plainly rather than
  stating a guess as fact.
- **Follow-up / prevention**, concrete, or `"none identified"` if genuinely none. If
  the incident led to an architectural change, link to the corresponding `plans/` entry.

## After writing

Confirm the record was written with its path (e.g. "Logged to
`plans/garethhaagman/26112026-agent-run-polling/change.md`"), don't restate its full
contents back in chat. The file is the record.

## Reading past records

Non-mandatory. Load a `plans/` or `incidents/` entry only when:

- The user explicitly references it (by path, date, or feature name), or
- Diagnosing a tricky design question or a bug that looks architectural in origin, and
  understanding a past decision would materially help.

Don't grep or scan `plans/`/`incidents/` as a matter of course before routine changes.
