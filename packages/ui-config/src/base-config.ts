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
    colors: {
      background: { light: "#ffffff", dark: "#0b0c0e" },
      foreground: { light: "#0b0c0e", dark: "#e7e8ea" },
      primary: { light: "#4f46e5", dark: "#818cf8" },
      primaryForeground: { light: "#ffffff", dark: "#0b0c0e" },
      secondary: { light: "#f1f2f4", dark: "#1a1b1e" },
      secondaryForeground: { light: "#0b0c0e", dark: "#e7e8ea" },
      accent: { light: "#f1f2f4", dark: "#1a1b1e" },
      accentForeground: { light: "#0b0c0e", dark: "#e7e8ea" },
      muted: { light: "#f6f6f7", dark: "#151619" },
      mutedForeground: { light: "#6b7280", dark: "#9ca3af" },
      destructive: { light: "#dc2626", dark: "#f87171" },
      destructiveForeground: { light: "#ffffff", dark: "#0b0c0e" },
      border: { light: "#e5e7eb", dark: "#26272b" },
      ring: { light: "#4f46e5", dark: "#818cf8" },
      card: { light: "#ffffff", dark: "#111214" },
      cardForeground: { light: "#0b0c0e", dark: "#e7e8ea" },
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
