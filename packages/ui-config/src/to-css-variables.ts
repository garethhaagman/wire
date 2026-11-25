import type { ColorRoles } from "./primitives.js";
import type { UiConfig } from "./schema.js";

/**
 * Projects the resolved theme into flat CSS custom property maps for light
 * and dark mode. Keys match the `--role-name` convention shadcn/Tailwind
 * expects (camelCase role -> kebab-case variable), so the web app's theme
 * provider can write these directly onto `:root`/`.dark` without any
 * per-component mapping.
 */
export function toCssVariables(config: UiConfig): {
  light: Record<string, string>;
  dark: Record<string, string>;
} {
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};

  for (const [role, pair] of Object.entries(config.theme.colors) as [
    keyof ColorRoles,
    ColorRoles[keyof ColorRoles],
  ][]) {
    const varName = colorRoleVarName(role);
    light[varName] = pair.light;
    dark[varName] = pair.dark ?? pair.light;
  }

  light["--radius"] = radiusToRem(config.theme.radius);
  dark["--radius"] = radiusToRem(config.theme.radius);

  return { light, dark };
}

/** `primaryForeground` -> `--primary-foreground`. Shared with toTailwindThemeCss so both sides name variables identically. */
export function colorRoleVarName(role: string): string {
  return `--${camelToKebab(role)}`;
}

function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function radiusToRem(radius: UiConfig["theme"]["radius"]): string {
  switch (radius) {
    case "none":
      return "0px";
    case "sm":
      return "0.25rem";
    case "md":
      return "0.5rem";
    case "lg":
      return "0.75rem";
    case "xl":
      return "1rem";
    case "full":
      return "9999px";
  }
}
