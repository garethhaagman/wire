# Shaders & motion effects

## The one existing precedent: `AuthShader`

`apps/web/src/components/auth/auth-shader.tsx` is the only bespoke WebGL effect in the codebase — an animated halftone/bokeh background for the auth screen. It is **deliberately not** a `@wire/ui` primitive and not themed through `colorRolesSchema`: its uniforms (`uBg`, `uC1`, `uC2`, `uC3`, ...) are illustration colors, hardcoded on purpose, with a comment saying so explicitly in the source. This is the one place in the codebase a hardcoded color is correct rather than a bug — because it's decorative illustration, not UI chrome a user or org themes.

Rules it demonstrates, that any future shader/effect should also follow:

1. **Respect the motion contract.** `motion.enabled` (`UiConfig.motion`) and OS `prefers-reduced-motion` both have to allow animation before one frame renders — `AuthShader`'s `motionReduced()` checks `document.documentElement.dataset.motion === "reduced"` (the attribute `applyTheme()` sets) _and_ `window.matchMedia("(prefers-reduced-motion: reduce)")`, and simply never starts the render loop if either says no. `respectReducedMotion: true` (default, per `motionSchema`) means the OS preference always wins over an org/user's `motion.enabled: true` — never the reverse.
2. **Graceful no-WebGL fallback.** If `canvas.getContext("webgl")` fails, the component renders nothing extra — the CSS fallback background (`.auth-shader` in `globals.css`) carries it. A shader is progressive enhancement, never a hard dependency for the page to look acceptable.
3. **Pause when offscreen.** An `IntersectionObserver` stops the render loop when the canvas isn't visible — a decorative effect must not burn GPU/battery off-screen.
4. **Clean up GPU resources, keep the context.** On unmount: delete buffers/program/shaders, but don't lose the WebGL context itself, since a remount (HMR, StrictMode) would otherwise hit a dead canvas.

## Good usage

```tsx
// A new decorative effect, following the same shape:
// - motion.enabled / prefers-reduced-motion checked before animating
// - illustration colors deliberately not run through colorRolesSchema
// - IntersectionObserver-gated, WebGL-optional
```

Treat `AuthShader` as the template to copy the _structure_ of (motion gating, visibility gating, cleanup), not a component to parameterize and reuse — a second shader for a different screen is a new file, not a prop on this one.

## Bad usage

```tsx
// Animating unconditionally, ignoring the motion contract
useEffect(() => {
  requestAnimationFrame(loop); // never checks motion.enabled or prefers-reduced-motion
}, []);

// Theming a decorative shader's colors through colorRolesSchema
uBg: "var(--background)"; // wrong instinct — colorRolesSchema is for UI chrome,
// not for illustration; a shader's palette is its own
// deliberate design choice, documented inline like AuthShader's is
```

## When a shader/heavy effect is _not_ the right call

If the goal is a simple hover/transition/enter-exit animation, that's an ordinary CSS transition respecting `data-motion`/`motion.enabled` — not a canvas. Reach for WebGL only for genuinely generative/animated illustration (the auth background's category), not for interactive UI motion, which belongs in the component itself (see `component-usage.md`) using plain CSS transitions gated the same way.
