---
name: change-log
description: >-
  Use when the user asks to build, add, implement, create, or design a feature;
  make an architectural change; introduce a new module, service, package, or
  dependency; change a data model or API contract; pick between approaches; or
  record a production incident/outage. Read this skill at the START of that work
  and write a plans/ (or incidents/) record as the closing step before finishing
  — do not wait for a commit or a later prompt. Do NOT use for routine bugfixes
  (see bugtracker) or trivial edits (typos, formatting, dependency bumps with no
  behavior change). Reading past records is optional — only when the user
  references one, or when diagnosing a tricky architectural question.
version: "1.1.0"
---

# Change log

A permanent, append-only record of _why_, architectural decisions, feature
trade-offs, and incidents, kept separately from code comments and commit
messages so the reasoning survives even after the code around it changes.

This is distinct from the `bugtracker` skill. Routine bugfixes go through
`bugtracker` into `bugs/` at repo root; don't duplicate those here. This skill
covers everything `bugtracker` doesn't: features and architecture. Incidents get
their own template and location (below).

## How to use this skill (required flow)

Agents select skills from the **user's prompt**, not from "work I already did."
If this skill matches the request, follow this order:

1. **Load at the start.** Read this skill (and the relevant template) when the
   user asks for a qualifying change, before or as you begin implementing.
2. **Do the work.** Implement the feature / architecture / incident response.
3. **Write the record before finishing.** Creating the `plans/` or `incidents/`
   file is part of completing the task. Do not wait for a commit, a PR, or a
   follow-up "please log this" prompt. A response that says the feature is done
   without a written record is incomplete.
4. **Confirm with the path only.** Tell the user where it was logged; don't paste
   the full contents back into chat.

Skipping step 3 because the change "felt obvious" is wrong when approaches were
chosen, rejected, or constrained by the user. Skipping it because "I'll log after
commit" is also wrong, commits are too frequent and often never happen in the
same turn.

## When this skill matches (prompt signals)

Treat the request as in-scope when the user (or the work they asked for) involves
any of:

- Building / adding / implementing / creating a **feature** or capability
- An **architectural** decision (module boundary, new service, new dependency,
  data model change, API contract shape)
- Choosing between **approaches** or discussing trade-offs
- A production **incident**, outage, or "something broke in prod" write-up

Don't match for: routine bugfixes (use `bugtracker`), typos, formatting,
dependency version bumps with no behavior change, or changes with genuinely only
one obvious path and no decision worth recording.

## Where files go

### Architectural decisions and features

```
plans/<git-username>/<ddmmyyyy>-<short-feature-name>/change.md
```

- `<git-username>`, output of `git config user.name`, as-is.
- `<ddmmyyyy>`, today's date, e.g. `26112026` for 26 Nov 2026. Date-first so
  entries sort chronologically within each person's folder.
- `<short-feature-name>`, kebab-case, a handful of words.
- Example: `plans/garethhaagman/26112026-agent-run-polling/change.md`.
- One folder per change. If a second unrelated change happens the same day with a
  similar name, disambiguate (`-2`) rather than overwrite.
- Create `plans/<git-username>/` if it doesn't exist yet. No index or README
  file, the directory listing is the index.

Use the template at `templates/change.md` in this skill's directory.

### Incidents

```
incidents/<ddmmyyyy>-<short-description>.md
```

Flat, at repo root, no per-user subfolder, incidents are shared, not personal.

- Example: `incidents/26112026-websocket-reconnect-storm.md`.
- Create `incidents/` at repo root if it doesn't exist yet.

Use the template at `templates/incident.md` in this skill's directory. It is
deliberately different from the change template (timeline, impact, severity,
status fields that a design-decision record doesn't need).

## Writing the change template

Fill in every section of `templates/change.md`:

- **Description of change**, plain language, simple-English style (same
  convention as this repo's PR descriptions: one idea per sentence, max ~20
  words, active voice, no noun-stacking). Should read clearly to someone
  unfamiliar with the specific code. Keep it tight, a few sentences, not an
  essay.
- **Implementation details**, what was actually affected: files, modules,
  services, data model. Concrete, not a narrative of the debugging process.
- **Trade-offs**, why this approach over the alternatives. Name the
  alternative(s) and the specific reason each was rejected. If there was
  genuinely only one reasonable option, say so rather than inventing
  alternatives to reject.
- **User input**, either `"No user input, this decision was made autonomously
  based on <reason>."`, or a description of what the user specified, with
  direct, verbatim quotes where the exact wording matters (a stated
  requirement, a rejected approach, a stated priority). Never paraphrase a
  quote.

## Writing the incident template

Fill in every section of `templates/incident.md`, in particular:

- **Timeline**, chronological, even if approximate.
- **Root cause**, confirmed, not guessed. If still unknown, say so plainly
  rather than stating a guess as fact.
- **Follow-up / prevention**, concrete, or `"none identified"` if genuinely
  none. If the incident led to an architectural change, link to the
  corresponding `plans/` entry.

## After writing

Confirm the record was written with its path (e.g. "Logged to
`plans/garethhaagman/26112026-agent-run-polling/change.md`"). Don't restate its
full contents back in chat. The file is the record.

## Reading past records

Non-mandatory. Load a `plans/` or `incidents/` entry only when:

- The user explicitly references it (by path, date, or feature name), or
- Diagnosing a tricky design question or a bug that looks architectural in
  origin, and understanding a past decision would materially help.

Don't grep or scan `plans/`/`incidents/` as a matter of course before routine
changes.
