---
name: create-pr
description: Use when creating a git commit or a GitHub pull request in this repo — commit message titles, PR titles, PR descriptions, and how to document a contract (API/type) change. Also use when asked about commit message conventions, PR description style, or how to document a breaking/non-breaking API change.
version: "1.0.0"
---

# Commits and pull requests

This repo's commit and PR titles use a type prefix. Commit bodies and PR descriptions are written in a restricted, simple-English style (adapted from ASD-STE100, the aerospace writing standard) so they stay readable under time pressure and translate cleanly to a changelog.

## Titles — commits and PRs alike

`<type>: <concise, specific summary>` — no scope, no parenthetical package name (checked against this repo's own history: it uses plain titles with no scope, and that is deliberate going forward).

| Type | Use for |
|------|---------|
| `feat` | A new capability a user or caller can now do |
| `fix` | A bug fix — behavior was wrong, now it is correct |
| `chore` | No behavior change — deps, config, generated files, docs |
| `refactor` | No behavior change — internal structure only |
| `test` | Test-only change |
| `perf` | A performance improvement with no behavior change |
| `revert` | Undoes an earlier commit |

**Good:**
- `feat: add agent run endpoint`
- `fix: correct presigned upload checksum mismatch`
- `chore: update stale internal docs`
- `refactor: extract StreamSink from RealtimeService`

**Bad, and why:**
- `fix: bug fixes` — not specific; a reader can't tell what changed from the title alone.
- `feat(api): add agent run endpoint` — this repo's convention has no scope; drop the parenthetical.
- `Update files` — no type prefix, and "files" names nothing.
- `WIP` / `more changes` / `asdf` — never commit a placeholder title, even on a draft PR.
- `feat: Add the new agent run endpoint that lets a caller trigger an agent and get back a run id they can poll` — too long for a title; this is a PR-description sentence wearing a title's clothes. Shorten it and move the detail to the body.

One sentence, imperative mood (`add`, `fix`, `remove`, not `added`/`fixes`/`adding`), lower-case after the colon, no trailing period.

## PR / commit-body descriptions — simple-English rules

Write the body as if explaining the change to someone who will act on it under time pressure, not someone who wants prose. Five rules, adapted from ASD-STE100:

1. **One idea per sentence, max ~20 words.** Split compound sentences at "and"/"which"/"that lets" into separate sentences.
2. **Active voice, explicit actor.** Say who or what does the thing, not that it "is done."
3. **Plain, consistent vocabulary.** Don't vary the word for the same concept across the description (pick one of "endpoint" or "route," one of "remove" or "delete," and keep using it).
4. **No noun-stacking.** More than two or three nouns in a row (`agent run step trace storage layer`) is hard to parse — add a preposition or split it (`the storage layer for agent run step traces`).
5. **Prefer a plain noun to an "-ing" word used as a noun.** Write "the fix" or "the retry," not "the fixing" or "the retrying" — `-ing` nouns read as ambiguous between an action-in-progress and a thing.

Technical terms (an actual field name, an endpoint path, a library name) are exempt from rule 3/4 — use the real name, don't paraphrase it into something softer.

**Good:**

> Member invites create a database row but never send an email. This adds an email step after the invite commits. The step is fire-and-forget: a failed send is logged, not retried, and never blocks the invite request.

**Bad, and why:**

> This PR introduces the implementation of an improvement whereby, upon the successful completion of a member invitation request, an outbound email notification is additionally dispatched to the invitee. — Passive throughout ("is dispatched," not "we send"), one 40-word sentence doing the job of three, and "implementation of an improvement whereby" says nothing a reader can act on.

> Fixed the thing with emails not sending and also cleaned up some other stuff in that file and the DTOs too. — Vague ("the thing," "some other stuff"), bundles unrelated changes into one sentence, gives a reviewer nothing to check against.

### Structure

```markdown
## Summary
<1-3 sentences, simple-English rules above, stating what changed and why>

## Contract changes
<omit this section entirely if there are none — see below>

## Test plan
- [ ] <specific, checkable step>
```

Don't add a "Test plan" checkbox you haven't actually verified — an unchecked box that should be checked is worse than no box.

## Contract changes — document as JSON, before and after

A "contract change" is any change to a request/response shape a caller depends on: a new/removed/renamed field, a changed type, a changed required-ness, a new enum member, a changed status code, a changed error code. If a PR touches any `@wire/types` interface, any DTO, or `internal-docs/api/openapi.yaml`, check whether the shape actually changed (not just its Swagger annotations) and document it.

Show the affected shape as JSON, **before** and **after**, side by side, trimmed to only the fields that changed (not the whole object) plus enough surrounding context to show where they sit:

**Good:**

```markdown
## Contract changes

`GET /v1/workspaces/:workspaceId/agents/:id/runs/:runId` is new — no prior shape to compare.

`AgentRun.status` gains one enum member:

Before:
\`\`\`json
{ "status": "queued" | "running" | "succeeded" | "failed" }
\`\`\`

After:
\`\`\`json
{ "status": "queued" | "running" | "succeeded" | "failed" | "cancelled" }
\`\`\`

Non-breaking: existing callers that switch on `status` keep working; `cancelled` is a new case to add, not a rename.
```

**Bad, and why:**

> Also changed some fields on AgentRun. — Names no field, shows no shape, and a reviewer has to go read the diff to find out if this breaks anyone. This is the one thing this section exists to avoid.

> Changed `AgentRun.output` from `string` to `string | null`. — Better than the line above (names the field, states old and new type) but still not the required format: use the before/after JSON blocks so the shape is visible at a glance, not described in prose the reader has to mentally reconstruct.

State plainly whether the change is breaking or non-breaking, and why, the way the good example's last line does — don't make the reviewer work that out themselves.

## Workflow

1. Check `git status` and `git diff` for what will actually be committed (don't write the title/description from memory of what you intended to do).
2. Stage only the files that belong to this change.
3. Commit with a title from the table above.
4. If opening a PR, use `gh pr create --title "..." --body "$(cat <<'EOF' ... EOF)"` with the structure above. Regenerate `internal-docs/api/openapi.yaml` first if a contract change touched it (see the api-design skill).
5. Never invent a "Test plan" step you did not run.
