import { toCssVariables, type UiConfig } from "@wire/ui-config";

/**
 * Writes the resolved theme onto :root as CSS custom properties, and toggles
 * the `dark` class based on OS preference. This is the one place config
 * becomes actual pixels — see internal-docs/ui/theming-and-layout.md
 * "How resolution becomes pixels". Re-run whenever the resolved config
 * changes (new org policy, user picked a different theme, etc).
 */
export function applyTheme(config: UiConfig): void {
  const { light, dark } = toCssVariables(config);
  const root = document.documentElement;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const vars = prefersDark ? dark : light;

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }

  root.style.setProperty("--ui-base-size", `${config.theme.typography.baseSizePx}px`);
  root.style.setProperty("--font-sans", fontFamilyFor(config.theme.typography.sans));
  root.style.setProperty("--font-mono", fontFamilyFor(config.theme.typography.mono));

  root.classList.toggle("dark", prefersDark);
  applyMotionPreference(config);
}

function fontFamilyFor(source: UiConfig["theme"]["typography"]["sans"]): string {
  switch (source.kind) {
    case "system":
      return "ui-sans-serif, system-ui, sans-serif";
    case "google":
    case "custom":
      return `"${source.family}", ui-sans-serif, system-ui, sans-serif`;
  }
}

function applyMotionPreference(config: UiConfig): void {
  const osReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reduced = config.motion.respectReducedMotion && osReducedMotion ? true : !config.motion.enabled;
  document.documentElement.dataset.motion = reduced ? "reduced" : config.motion.speed;
}
