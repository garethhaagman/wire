import type { Decorator, Preview } from "@storybook/react-vite";
import { baseUiConfig, toCssVariables } from "@wire/ui-config";
import { useEffect } from "react";
import "./theme.generated.css";
import "./tailwind.css";

/**
 * Stories render against `baseUiConfig`, the same terminal fallback
 * `apps/web` renders before any org/user config has resolved (see
 * internal-docs/ui/theming-and-layout.md "No flash, no blank state"). This
 * keeps Storybook honest: it shows what every component looks like under the
 * shipped default theme, not a hand-tuned demo palette. Toggle light/dark via
 * the toolbar (data-mode on <html>), same `.dark` class apply-theme.ts uses.
 */
const { light, dark } = toCssVariables(baseUiConfig);

function applyVars(mode: "light" | "dark"): void {
  const root = document.documentElement;
  const vars = mode === "dark" ? dark : light;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  root.style.setProperty(
    "--radius",
    {
      none: "0px",
      sm: "0.25rem",
      md: "0.5rem",
      lg: "0.75rem",
      xl: "1rem",
      full: "9999px",
    }[baseUiConfig.theme.radius]
  );
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

const withTheme: Decorator = (Story, context) => {
  const mode = context.globals.theme === "dark" ? "dark" : "light";
  useEffect(() => {
    applyVars(mode);
  }, [mode]);
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Light/dark mode (baseUiConfig)",
      defaultValue: "light",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
  },
  parameters: {
    layout: "centered",
  },
};

export default preview;
