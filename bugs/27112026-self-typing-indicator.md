# Own typing indicator shown and stuck

- **Date found:** 27 November 2026
- **Found by:** user (manual)
- **Area:** apps/web realtime typing / message list
- **Severity:** medium

## Summary

While composing, the UI showed “Dev User is typing…” for the signed-in user, and the line stayed visible while they kept typing.

## Expected behavior

Typing indicators only name other members. Your own keystrokes never appear as “you are typing.”

## Actual behavior

The current user’s display name appeared in the typing line. Continuous typing kept resetting a 5s expiry, so it looked stuck.

## Steps to reproduce

1. Open a channel as Dev User with at least one existing message.
2. Type in the composer.
3. Observe “Dev User is typing…” above the composer.

## Evidence

User screenshot of “Dev User is typing…” under their own messages.

## Suspected root cause (at time of discovery)

SSE typing fans out to every connection including the sender; the client never filtered `useMe().id`. Expiry only runs after the last throttled signal (~3s cadence), so active typing never clears.
