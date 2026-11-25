import { describe, expect, test } from "bun:test";
import { baseUiConfig } from "./base-config.js";
import { colorRolesSchema } from "./primitives.js";
import { resolveUiConfig } from "./resolve.js";
import { uiConfigSchema } from "./schema.js";
import { REQUIRED_SLOT_IDS } from "./slots.js";
import { colorRoleVarName, toCssVariables } from "./to-css-variables.js";
import { toTailwindThemeCss } from "./to-tailwind-theme.js";

const colorRoles = Object.keys(colorRolesSchema.shape);

describe("baseUiConfig", () => {
  test("is valid against its own schema", () => {
    expect(uiConfigSchema.safeParse(baseUiConfig).success).toBe(true);
  });

  test("activeLayoutId points at a shipped layout", () => {
    expect(baseUiConfig.layouts.map((l) => l.id)).toContain(
      baseUiConfig.activeLayoutId
    );
  });

  test.each(baseUiConfig.layouts.map((l) => [l.id, l] as const))(
    "layout %s mounts every required slot",
    (_id, layout) => {
      for (const slotId of REQUIRED_SLOT_IDS) {
        expect(layout.slots[slotId]).toBeDefined();
        expect(layout.slots[slotId]?.placement).not.toBe("hidden");
      }
    }
  );

  test("resolves to itself with no layers and no warnings", () => {
    const { config, warnings } = resolveUiConfig({});
    expect(warnings).toEqual([]);
    expect(config).toEqual(baseUiConfig);
  });
});

describe("CSS variable projection", () => {
  test("toCssVariables emits a light and dark variable for every color role", () => {
    const { light, dark } = toCssVariables(baseUiConfig);
    for (const role of colorRoles) {
      expect(light[colorRoleVarName(role)]).toBeString();
      expect(dark[colorRoleVarName(role)]).toBeString();
    }
  });

  test("toTailwindThemeCss maps every variable toCssVariables writes", () => {
    const css = toTailwindThemeCss();
    for (const role of colorRoles) {
      const name = colorRoleVarName(role).slice(2);
      expect(css).toContain(`--color-${name}: var(--${name});`);
    }
  });
});
