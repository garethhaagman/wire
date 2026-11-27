# @wire/ui Tailwind classes missing in web app, resolution

- **Date resolved:** 27 November 2026
- **Resolved by:** agent
- **Related bug:** bugs/27112026-ui-package-tailwind-not-scanned.md

## Root cause

No `@source` for `packages/ui/src` in `apps/web/src/styles/globals.css`, so utilities that only appear inside `@wire/ui` were omitted from the generated CSS.

## Fix

Added `@source "../../../../packages/ui/src"` to `globals.css`, and set explicit `size-4` on the Google mark / loader as a local guard.

## Verification

Generated CSS includes `.h-10` and `.[&_svg]:size-4`. Login Google button renders at normal icon size after refresh.
