import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { AppAbility, Role } from "./permission.types.js";

/**
 * Builds a CASL ability for a role. admin gets `manage all` (every action on every
 * subject); member gets a curated subset reflecting what a regular workspace
 * member should be able to do without admin privileges — see
 * internal-docs/api/permissions.md for the full rationale per subject.
 *
 * Instance-level rules ("only your own message", "only yourself") are enforced in
 * the owning service against the resolved actor, not here — CASL decides whether
 * the *kind* of operation is allowed for the role.
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

  // Inviting/removing members and changing roles is admin-only; a member may only
  // update their own profile and preferences (MembersService).
  can("read", "Member");
  can("update", "Member");

  // Rename/topic/purpose for channels the member belongs to; archive is admin-only
  // (mapped to "delete" — archiving is the channel's soft delete).
  can("create", "Channel");
  can("read", "Channel");
  can("update", "Channel");

  // Join/leave, add others to channels the member already belongs to, and move
  // their own read cursor ("update"). Removing someone else is admin-only
  // (ChannelsService).
  can("create", "ChannelMember");
  can("read", "ChannelMember");
  can("update", "ChannelMember");
  can("delete", "ChannelMember");

  // Edit/delete is limited to the member's own messages (MessagesService).
  can("create", "Message");
  can("read", "Message");
  can("update", "Message");
  can("delete", "Message");

  can("create", "Thread");
  can("read", "Thread");
  can("update", "Thread");

  can("create", "Reaction");
  can("read", "Reaction");
  can("delete", "Reaction");

  can("create", "Pin");
  can("read", "Pin");
  can("delete", "Pin");

  // Bookmarks are private to the member that created them (BookmarksService).
  can("create", "Bookmark");
  can("read", "Bookmark");
  can("delete", "Bookmark");

  // Updating/removing agents is admin-only.
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

  // Realtime stream + replay; events are ACL-filtered per channel in RealtimeService.
  can("read", "Event");

  // Presence heartbeats and typing indicators.
  can("create", "Presence");
  can("read", "Presence");

  return build();
}
