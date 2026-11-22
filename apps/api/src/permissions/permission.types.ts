import type { MongoAbility } from "@casl/ability";

/**
 * CASL action/subject vocabulary for every resource in apps/api. One subject per
 * controller; "all" is CASL's special wildcard subject used only for the admin
 * role's manage-everything rule. See internal-docs/api/permissions.md.
 */
export type PermissionAction = "manage" | "create" | "read" | "update" | "delete";

export type PermissionSubject =
  | "all"
  | "Workspace"
  | "Member"
  | "Channel"
  | "Message"
  | "Thread"
  | "Reaction"
  | "Pin"
  | "Agent"
  | "File"
  | "Search"
  | "WebhookEndpoint"
  | "AuditEvent"
  | "UiConfig";

export type AppAbility = MongoAbility<[PermissionAction, PermissionSubject]>;

export type Role = "admin" | "member";
