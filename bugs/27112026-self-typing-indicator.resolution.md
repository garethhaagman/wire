# Own typing indicator shown and stuck, resolution

- **Date resolved:** 27 November 2026
- **Resolved by:** agent
- **Related bug:** bugs/27112026-self-typing-indicator.md

## Root cause

`useTypingMembers` accepted every `memberId` from ephemeral `typing` events. The API does not exclude the sender. Combined with a 5s client timer that resets on each throttled signal, the typist saw themselves and the line did not clear while composing.

## Fix

- Filter out `useMe(workspaceId).id` in `useTypingMembers`.
- Reset typing state when channel/thread changes.
- Skip `sendTyping` when the composer body is empty/whitespace.

## Verification

Type as Dev User, no self typing line. A second member’s typing still appears and drops ~5s after they stop.
