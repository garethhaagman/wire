---
name: skill-creation
description: Use when adding a new skill to this repo, or renaming/moving/deleting an existing one. Covers where the real file lives and how to wire up symlinks so Claude Code and Cursor both see the same skill with zero content duplication.
version: "2.0.0"
---

# Creating a skill with cross-tool parity

This repo's AI agents aren't only Claude Code. A skill written once must be visible to all of them without a second copy of the content anyone can forget to update. **One real file, one symlinked directory.**

## The rule

The real file is `.claude/skills/<name>/SKILL.md` (plus any `references/`, scripts, or other supporting files in that same directory). `.agents/skills/<name>/` is a symlink to that whole directory, never a copy.

```
.claude/skills/<name>/SKILL.md          <- the one real file
.agents/skills/<name>                   -> symlink to the directory above
```

Cursor's [Agent Skills](https://cursor.com/docs/skills) feature discovers skills from `.agents/skills/` directly, and separately reads `.claude/skills/` as a legacy-compatible path — so this one symlink is enough for both Claude Code and Cursor to see the same skill. There is no `.cursor/rules/*.mdc` step; that was a workaround from before Cursor had native skill support and no longer applies.

## Why symlinks, not copies

A duplicated `SKILL.md` drifts the moment one copy gets edited and the other doesn't — this repo had exactly that problem (`.agents/skills/react-doctor/SKILL.md` and `.claude/skills/react-doctor/SKILL.md` were separately maintained, byte-for-byte copies, with no mechanism keeping them in sync). A symlink makes drift structurally impossible: there is only ever one file on disk, so there is nothing to fall out of sync.

## Step by step

1. Write the real file: `.claude/skills/<name>/SKILL.md`, with frontmatter (`name`, `description`, `version`) matching the style of an existing skill (see `.claude/skills/api-design/SKILL.md` for the reference shape).
2. Symlink the whole directory into `.agents/skills/`:

   ```sh
   ln -s ../../.claude/skills/<name> .agents/skills/<name>
   ```
3. Verify the link resolves and nothing is a plain copy:

   ```sh
   ls -la .agents/skills/<name>
   ```

   Confirm the entry shows `-> ../../.claude/skills/<name>`.

## What NOT to do

- **Don't** write the full skill content into `.agents/skills/<name>/SKILL.md` and a second time into `.claude/skills/<name>/SKILL.md`. That's the exact drift this skill exists to prevent.
- **Don't** symlink in the wrong direction (`.claude/skills/<name>` -> `.agents/skills/<name>`). `.claude/skills/` is the canonical source; `.agents/skills/` points at it.
- **Don't** symlink the individual `SKILL.md` file instead of the directory if the skill has supporting files (`references/`, scripts, `assets/`) — symlink the directory itself so those come along automatically.
- **Don't** forget `version` in the frontmatter, and don't forget to bump it when the content changes — other skills (e.g. `api-design`) reference their own version in their changelog-style edits.
- **Don't** re-add a `.cursor/rules/*.mdc` symlink for a skill. Cursor's native skills feature reads `.agents/skills/` and `.claude/skills/` directly; a `.mdc` rules-file entry would just be a second, redundant way in.

## Applying this to an existing skill

If you find a skill with a real, duplicated file in more than one location (check with `diff .claude/skills/<name>/SKILL.md .agents/skills/<name>/SKILL.md`):

1. Pick `.claude/skills/<name>/SKILL.md` as the surviving real file (diff the two first; if they've drifted, reconcile the content before deleting either).
2. Delete the duplicate(s).
3. Create the directory symlink per the steps above.
