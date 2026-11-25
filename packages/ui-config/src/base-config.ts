import type { UiConfig } from "./schema.js";
import { UI_CONFIG_SCHEMA_VERSION } from "./schema.js";

/**
 * The config every workspace starts from and every field falls back to when
 * an org/user override is absent, invalid, or stripped by a lock conflict.
 * This is not a "sensible preset" that happens to be first in a list — it is
 * the terminal fallback the resolver always has available, so it must be
 * valid on its own against `uiConfigSchema` (enforced by a test — see
 * base-config.test.ts) and must define every required slot.
 */
export const baseUiConfig: UiConfig = {
  schemaVersion: UI_CONFIG_SCHEMA_VERSION,
  theme: {
    mode: "light",
    colors: {
      background: { light: "#f2f1ed", dark: "#0d0d0c" },
      foreground: { light: "#151514", dark: "#ecebe8" },
      primary: { light: "#151514", dark: "#ecebe8" },
      primaryForeground: { light: "#ffffff", dark: "#151514" },
      secondary: { light: "#efeeea", dark: "#1c1c1a" },
      secondaryForeground: { light: "#151514", dark: "#ecebe8" },
      accent: { light: "#eceae5", dark: "#232320" },
      accentForeground: { light: "#151514", dark: "#ecebe8" },
      muted: { light: "#f7f6f3", dark: "#161614" },
      mutedForeground: { light: "#6c6b66", dark: "#9c9b96" },
      destructive: { light: "#c4322b", dark: "#f0786f" },
      destructiveForeground: { light: "#ffffff", dark: "#151514" },
      border: { light: "#e3e1db", dark: "#2a2a27" },
      ring: { light: "#151514", dark: "#ecebe8" },
      card: { light: "#ffffff", dark: "#131312" },
      cardForeground: { light: "#151514", dark: "#ecebe8" },
    },
    radius: "md",
    typography: {
      sans: { kind: "system" },
      mono: { kind: "system" },
      baseSizePx: 16,
      scale: "comfortable",
    },
    iconPack: { kind: "lucide" },
  },
  branding: {
    productName: "Wire",
    logo: {},
  },
  motion: {
    enabled: true,
    speed: "normal",
    respectReducedMotion: true,
  },
  layouts: [
    {
      id: "default",
      name: "Default",
      description: "Standard three-pane layout: nav rail, channel sidebar, main content.",
      slots: {
        "nav.primary": { placement: "sidebar-left", variant: "default", props: {} },
        "nav.workspaceSwitcher": { placement: "sidebar-left", variant: "default", props: {} },
        "sidebar.channelList": { placement: "sidebar-left", variant: "default", props: {} },
        topbar: { placement: "top", variant: "default", props: {} },
        composer: { placement: "bottom", variant: "default", props: {} },
        "thread.panel": { placement: "sidebar-right", variant: "default", props: {} },
        "search.trigger": { placement: "top", variant: "default", props: {} },
        "command.palette": { placement: "floating", variant: "default", props: {} },
      },
    },
  ],
  activeLayoutId: "default",
  extensions: {},
};
