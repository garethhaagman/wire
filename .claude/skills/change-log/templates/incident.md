<!--
Template for incidents/DDMMYYYY-short-description.md (repo root, flat — no per-user subfolder).
Delete this comment block before writing the file.
-->

# <Short title of the incident>

**Date:** <DD Month YYYY>
**Reported by:** <git username, or "unknown">
**Severity:** <low | medium | high | critical>
**Status:** <ongoing | resolved | monitoring>

## What happened

<1-3 sentences, plain language: what broke, what the user-visible or system-visible
impact was. State the impact before the mechanism.>

## Timeline

- <HH:MM or relative time>, <event>
- <HH:MM or relative time>, <event>

## Root cause

<What was actually wrong, confirmed, not guessed. If still under investigation, say
"unknown, under investigation" rather than a speculative guess stated as fact.>

## Impact

<Who/what was affected, for how long, and how severely, users, data, downstream
services.>

## Resolution

<What was done to stop the immediate impact and/or fix the underlying cause. If this
happened in two phases (mitigation vs. real fix), say so.>

## Trade-offs

<Why this fix/mitigation was chosen over alternatives, if there was a real choice to
make. "No alternative considered, this was the only viable fix" is fine if true.>

## User input

<One of:

- "No user input, this was handled autonomously."
- What the user specified, with direct quotes where exact wording matters.>

> "<exact user quote if applicable>"

## Follow-up / prevention

<Concrete follow-up items to prevent recurrence, or "none identified" if genuinely
none. Link to the plans/ entry if this incident led to an architectural change.>
