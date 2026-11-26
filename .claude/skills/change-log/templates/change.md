<!--
Template for plans/<git-username>/<DDMMYYYY>-<feature-or-change-name>/change.md
Delete this comment block before writing the file.
-->

# <Title: short name of the change>

**Date:** <DD Month YYYY>
**Author:** <git username>
**Type:** <architectural-decision | bugfix | feature>

## Description of change

<1-3 sentences, simple-English rules (one idea per sentence, max ~20 words, active voice,
plain consistent vocabulary — same style as this repo's PR descriptions). State what
changed, in terms someone unfamiliar with this specific code can follow.>

## Implementation details

<What was actually affected: files, modules, services, data model, APIs. List the
concrete pieces that changed, not a narrative of the debugging process.>

- <file/module> — <what changed and why it needed to>
- <file/module> — <what changed and why it needed to>

## Trade-offs

<Why this approach was chosen over the alternatives. Name the alternative(s) considered
and the specific reason each was rejected — cost, time, complexity, consistency with
existing code, etc. If there was genuinely only one reasonable option, say so plainly
instead of inventing alternatives.>

- **Chosen:** <approach> — <why>
- **Rejected:** <alternative> — <why>

## User input

<One of:

- "No user input — this decision was made autonomously based on <brief reason>."
- A description of what the user specified or constrained, with direct quotes where the
  exact wording matters (e.g. a specific requirement, a rejected approach, a stated
  priority). Quote verbatim, don't paraphrase a quote.>

> "<exact user quote if applicable>"
