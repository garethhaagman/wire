import { colorRolesSchema } from "./primitives.js";
import { colorRoleVarName } from "./to-css-variables.js";

/**
 * Renders the Tailwind `@theme inline` block that maps each color role to the
 * runtime custom property toCssVariables() writes (`--color-primary: var(--primary)`).
 * apps/web generates its theme.generated.css from this, so adding a role to
 * colorRolesSchema can't ship without its `bg-<role>` / `text-<role>` utilities.
 */
export function toTailwindThemeCss(): string {
  const lines = Object.keys(colorRolesSchema.shape).map((role) => {
    const name = colorRoleVarName(role).slice(2);
    return `  --color-${name}: var(--${name});`;
  });
  return `@theme inline {\n${lines.join("\n")}\n}\n`;
}
