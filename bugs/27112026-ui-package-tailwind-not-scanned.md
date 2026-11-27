# @wire/ui Tailwind classes missing in web app

- **Date found:** 27 November 2026
- **Found by:** user (manual)
- **Area:** apps/web Tailwind / packages/ui
- **Severity:** medium

## Summary

Login’s “Continue with Google” button showed a huge Google mark. Button SVG sizing from `@wire/ui` never entered the web app’s CSS.

## Expected behavior

Google mark is `size-4` beside the label, matching other button icons.

## Actual behavior

The SVG filled most of the button width; label sat under a giant “G”.

## Steps to reproduce

1. Open `/login`.
2. Look at “Continue with Google”.

## Evidence

User screenshot of oversized Google logo on the outline button.

## Suspected root cause (at time of discovery)

Tailwind v4 only scanned `apps/web` by default. `@wire/ui` ships source with classes like `[&_svg]:size-4` and `h-10`, which were never generated. Preflight `svg { display: block }` then stretched the undimensioned mark.
