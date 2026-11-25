import type { UiConfig } from "@wire/ui-config";
import { toCssVariables } from "@wire/ui-config";

/**
 * Writes the resolved theme onto :root as CSS custom properties, and toggles
 * the `dark` class per `theme.mode` (OS preference only when "system"). This is the one place config
 * becomes actual pixels — see internal-docs/ui/theming-and-layout.md
 * "How resolution becomes pixels". Re-run whenever the resolved config
 * changes (new org policy, user picked a different theme, etc).
 */
export function applyTheme(config: UiConfig): void {
  const { light, dark } = toCssVariables(config);
  const root = document.documentElement;

  const { mode } = config.theme;
  const isDark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const vars = isDark ? dark : light;

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }

  const { typography } = config.theme;
  root.style.setProperty("--ui-base-size", `${typography.baseSizePx}px`);
  root.style.setProperty(
    "--font-sans",
    fontFamilyFor(typography.sans, SANS_STACK)
  );
  root.style.setProperty(
    "--font-mono",
    fontFamilyFor(typography.mono, MONO_STACK)
  );
  root.style.setProperty(
    "--ui-font-display",
    typography.display
      ? fontFamilyFor(typography.display, SERIF_STACK)
      : SERIF_STACK
  );
  for (const source of [typography.sans, typography.mono, typography.display]) {
    if (source) {
      loadFont(source);
    }
  }

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  applyMotionPreference(config);
}

type FontSource = UiConfig["theme"]["typography"]["sans"];

const SANS_STACK = "ui-sans-serif, system-ui, sans-serif";
const MONO_STACK = "ui-monospace, SFMono-Regular, Menlo, monospace";
const SERIF_STACK = "ui-serif, Georgia, Cambria, serif";

function fontFamilyFor(source: FontSource, fallback: string): string {
  return source.kind === "system"
    ? fallback
    : `"${source.family}", ${fallback}`;
}

const loadedFonts = new Set<string>();

/** Fetches non-system fonts once per page; until they arrive the fallback stack renders. */
function loadFont(source: FontSource): void {
  if (source.kind === "system" || loadedFonts.has(source.family)) {
    return;
  }
  loadedFonts.add(source.family);

  if (source.kind === "google") {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(source.family).replace(/%20/gu, "+")}&display=swap`;
    document.head.appendChild(link);
    return;
  }

  const face = new FontFace(
    source.family,
    `url(${JSON.stringify(source.url)})`,
    {
      display: "swap",
    }
  );
  document.fonts.add(face);
  face
    .load()
    .catch((err: unknown) =>
      console.warn(`Failed to load font "${source.family}"`, err)
    );
}

function applyMotionPreference(config: UiConfig): void {
  const osReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const reduced =
    config.motion.respectReducedMotion && osReducedMotion
      ? true
      : !config.motion.enabled;
  document.documentElement.dataset.motion = reduced
    ? "reduced"
    : config.motion.speed;
}
