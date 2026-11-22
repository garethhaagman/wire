import type { UiConfig, UiConfigOverride, Lock } from "@wire/ui-config";

/**
 * Mirrors internal-docs/ui/config-schema.md. The deep, versioned shape lives
 * in @wire/ui-config (zod schema + resolver); this file only adds the thin
 * request/response wrappers the HTTP layer needs, following the same split
 * every other resource in this package uses between "domain shape" and
 * "API request/response shape".
 */
export interface UiConfigResource {
  workspaceId: string;
  /** Resolved config for the requesting session — base + org + user already merged, locks applied. */
  resolved: UiConfig;
  /** Non-fatal recovery notes from the resolver (invalid layer dropped, slot backfilled, etc). */
  warnings: string[];
}

export interface UpdateOrgUiConfigRequest {
  override: UiConfigOverride;
  locks: Lock[];
}

export interface UpdateUserUiConfigRequest {
  override: UiConfigOverride;
}
