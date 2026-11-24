---
name: skill-creation
description: Use when adding a new skill to this repo, or renaming/moving/deleting an existing one. Covers where the real file lives and how to wire up symlinks so Claude Code, the .agents/ convention, and Cursor all see the same skill with zero content duplication.
version: "1.0.0"
---

# Creating a skill with cross-tool parity

This repo's AI agents aren't only Claude Code. A skill written once must be visible to all of them without a second copy of the content anyone can forget to update. **One real file, three ways in.**

## The rule

The real file is `.claude/skills/<name>/SKILL.md` (plus any `references/`, scripts, or other supporting files in that same directory). Every other location is a symlink to it, never a copy.

```
.claude/skills/<name>/SKILL.md          <- the one real file
.agents/skills/<name>/SKILL.md          -> symlink to the line above
.cursor/rules/<name>.mdc                -> symlink to the line above (best-effort, see "Cursor" below)
```

If the skill has supporting files (a `references/` directory, a script), symlink the whole directory's contents the same way, or symlink the directory itself if `.agents/skills/<name>/` doesn't need to exist as its own real directory for some other reason.

## Why symlinks, not copies

A duplicated `SKILL.md` drifts the moment one copy gets edited and the other doesn't — this repo had exactly that problem (`.agents/skills/react-doctor/SKILL.md` and `.claude/skills/react-doctor/SKILL.md` were separately maintained, byte-for-byte copies, with no mechanism keeping them in sync). A symlink makes drift structurally impossible: there is only ever one file on disk, so there is nothing to fall out of sync.

## Step by step

1. Write the real file: `.claude/skills/<name>/SKILL.md`, with frontmatter (`name`, `description`, `version`) matching the style of an existing skill (see `.claude/skills/api-design/SKILL.md` for the reference shape).
2. Symlink it into `.agents/skills/`:
   ```sh
   mkdir -p .agents/skills/<name>
   ln -s ../../../.claude/skills/<name>/SKILL.md .agents/skills/<name>/SKILL.md
   ```
3. Symlink it into Cursor's rules directory:
   ```sh
   mkdir -p .cursor/rules
   ln -s ../../.claude/skills/<name>/SKILL.md .cursor/rules/<name>.mdc
   ```
4. Verify every link resolves and nothing is a plain copy:
   ```sh
   find .claude/skills .agents/skills .cursor/rules -iname "*.md" -o -iname "*.mdc" | xargs -I{} sh -c 'test -L "{}" -o -f ".claude/skills/$(basename $(dirname {}))/SKILL.md" && echo "{}" "-> $(readlink {})"'
   ```
   Simpler check: `ls -la .agents/skills/<name>/ .cursor/rules/` and confirm both entries show `->` pointing back at `.claude/skills/<name>/SKILL.md`.

## Cursor's `.mdc` extension — a known limit, not a guess

Cursor's documented rule discovery only reads `.cursor/rules/*.mdc` (a plain `.md` in that directory is ignored) and does not document symlink support one way or the other. A symlink named `<name>.mdc` pointing at a `.md` target is the best available option (standard filesystem symlink-following should make this work; the extension check is on the symlink's own name, not the target's) but treat it as best-effort, not a verified guarantee for every Cursor build.

Cursor's own `.mdc` frontmatter schema (`description`, `globs`, `alwaysApply`) is different from this repo's `SKILL.md` frontmatter (`name`, `description`, `version`) — since the symlink points at the same file for every tool, Cursor sees the `SKILL.md` frontmatter, not its own. In practice Cursor should ignore the frontmatter keys it doesn't recognize and still index the body, but it will not get `globs`-scoped or `alwaysApply` behavior from a symlinked skill. That's an accepted tradeoff for having one real file; don't try to make the frontmatter satisfy both schemas at once (there's no field overlap that would let you).

If a skill ever needs confirmed Cursor support and the `.mdc` symlink turns out not to work, the documented-safe fallback is a short, real (non-symlinked) `AGENTS.md` pointer file:

```markdown
# <name>

Cross-agent entry point. The full procedure is in [SKILL.md](../../../.claude/skills/<name>/SKILL.md).
```

Cursor reads `AGENTS.md` natively, with no frontmatter and no extension requirement, at the project root or in any subdirectory. This is a last resort, not the default — prefer the symlink; only add a real `AGENTS.md` pointer alongside it if `.mdc` symlink support is confirmed broken for a tool you actually use.

## What NOT to do

- **Don't** write the full skill content into `.agents/skills/<name>/SKILL.md` and a second time into `.claude/skills/<name>/SKILL.md`. That's the exact drift this skill exists to prevent.
- **Don't** symlink in the wrong direction (`.claude/skills/<name>/SKILL.md -> .agents/skills/<name>/SKILL.md`). `.claude/skills/` is the canonical source; everything else points at it.
- **Don't** forget `version` in the frontmatter, and don't forget to bump it when the content changes — other skills (e.g. `api-design`) reference their own version in their changelog-style edits, and a symlinked file needs the same discipline since every consumer sees the same version string.
- **Don't** add a `.cursor/rules/*.mdc` entry for a skill whose `description` only makes sense in a Claude-Code-specific context (e.g. one that references Claude Code slash commands or tools that don't exist in Cursor) without checking the description still reads sensibly there — the content is shared, so write it to be true for every tool that will load it.

## Applying this to an existing skill

If you find a skill with a real, duplicated file in more than one location (check with `diff .claude/skills/<name>/SKILL.md .agents/skills/<name>/SKILL.md`):

1. Pick `.claude/skills/<name>/SKILL.md` as the surviving real file (diff the two first; if they've drifted, reconcile the content before deleting either).
2. Delete the duplicate(s).
3. Create the symlinks per the steps above.
