---
name: bugtracker
description: Use immediately after diagnosing and fixing a real bug (not during investigation, not for style/lint issues) to write a permanent record under bugs/ at repo root. Never load or reference past bug reports unless the user explicitly asks to check history or look for recurrences.
version: "1.0.0"
---

# Bug tracker

A append-only log of bugs found and fixed in this repo, kept so recurring bugs can eventually be spotted. This skill is **write-only by default**: creating records is proactive (do it whenever a real bug is resolved), but reading past records is not — never grep or read `bugs/` unless the user specifically asks to check history, search for a recurrence, or review the log.

## When to write a record

Write one when all of the following are true:

- A concrete, incorrect behavior was identified (not a style nit, not a refactor, not a missing feature).
- A fix was applied and is believed to resolve it.

Don't write one for: lint/formatting fixes, typos with no behavioral effect, pure refactors, or speculative "this might be an issue" notes without a confirmed fix.

## Where files go

Two files per bug, both at repo root under `bugs/`, same base name, one folder:

```
bugs/ddmmyyyy-short-description.md           <- the bug report
bugs/ddmmyyyy-short-description.resolution.md <- the resolution
```

- `ddmmyyyy` is today's date (e.g. `26112026` for 26 Nov 2026).
- `short-description` is kebab-case, a handful of words, no issue numbers needed.
- Example pair: `bugs/26112026-stale-session-after-logout.md` and `bugs/26112026-stale-session-after-logout.resolution.md`.
- If a second, unrelated bug is logged the same day with a similar description, disambiguate the slug (e.g. `-2`) rather than overwriting.
- Create `bugs/` at repo root if it doesn't exist yet. Do not add a README or index file — the directory listing is the index.

Each file is capped at 500 lines. If a write would exceed that, cut detail (trim logs/stack traces to the relevant excerpt) rather than splitting into more files.

## Templates

### Bug report — `ddmmyyyy-short-description.md`

```markdown
# <Short title>

- **Date found:** <DD Month YYYY>
- **Found by:** <person/process, if known>
- **Area:** <package/app/module, e.g. apps/api/src/workspaces>
- **Severity:** <low | medium | high | critical>

## Summary

One or two sentences: what was wrong, in plain language.

## Expected behavior

What should have happened.

## Actual behavior

What actually happened.

## Steps to reproduce

1. ...
2. ...

## Evidence

Relevant logs, stack trace excerpts, or screenshots references. Trim to what's necessary — keep this section short.

## Suspected root cause (at time of discovery)

Best guess before/while fixing, if known. Can be "unknown — under investigation" if written before diagnosis completed.
```

### Resolution — `ddmmyyyy-short-description.resolution.md`

```markdown
# <Short title> — resolution

- **Date resolved:** <DD Month YYYY>
- **Resolved by:** <person/process, if known>
- **Related report:** ddmmyyyy-short-description.md

## Root cause

What was actually wrong, confirmed — not guessed.

## Fix

What changed, described concretely (files/functions/behavior), and why this fixes the root cause rather than papering over the symptom.

## Files changed

- `path/to/file.ts` — one-line description of the change

## Verification

How it was confirmed fixed (test added, manual repro steps re-run, etc.).

## Recurrence risk / notes

Anything that would help spot this again if it recurs elsewhere — e.g. "same pattern exists in X, not fixed there yet" or "none, this was a one-off typo." This is the field most useful for the eventual recurrence review, so don't skip it even if short.
```

## Writing the record

1. Determine today's date and the slug; create `bugs/` if needed.
2. Write the bug report file from the template, filling in what's known about the original symptom.
3. Write the resolution file from the template, filling in root cause, fix, files changed, and verification.
4. Do not announce or summarize the record's contents back to the user beyond confirming it was written (e.g. "Logged to `bugs/26112026-stale-session-after-logout.md`") — the files are the record, not the chat.
5. Do not add these files to any other index, README, or memory. Do not re-read them afterward unless explicitly asked.
