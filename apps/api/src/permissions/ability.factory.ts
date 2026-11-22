import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { AppAbility, Role } from "./permission.types.js";

/**
 * Builds a CASL ability for a role. admin gets `manage all` (every action on every
 * subject); member gets a curated subset reflecting what a regular workspace
 * member should be able to do without admin privileges — see
 * internal-docs/api/permissions.md for the full rationale per subject.
 */
export function defineAbilityFor(role: Role): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role === "admin") {
    can("manage", "all");
    return build();
  }

  // member
  can("create", "Workspace");
  can("read", "Workspace");

  can("read", "Member");

  can("create", "Channel");
  can("read", "Channel");

  can("create", "Message");
  can("read", "Message");

  can("create", "Thread");
  can("read", "Thread");

  can("create", "Reaction");
  can("read", "Reaction");
  can("delete", "Reaction");

  can("create", "Pin");
  can("read", "Pin");
  can("delete", "Pin");

  can("create", "Agent");
  can("read", "Agent");

  can("create", "File");
  can("read", "File");

  can("read", "Search");

  // Per explicit product decision (see internal-docs/api/permissions.md): any
  // authenticated workspace member may read audit events, not just admins.
  can("read", "AuditEvent");

  // Webhook-endpoint configuration stays admin-only — a member has no
  // WebhookEndpoint permissions at all.

  // Every member can read the resolved UI config and update their own
  // personal layer. Only admin can write the org layer / locks — enforced in
  // UiConfigService, not by CASL, since CASL has no notion of "org layer vs
  // user layer" within one subject. See internal-docs/ui/config-schema.md.
  can("read", "UiConfig");
  can("update", "UiConfig");

  return build();
}
