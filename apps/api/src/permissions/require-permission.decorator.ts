import { Reflector } from "@nestjs/core";
import type {
  PermissionAction,
  PermissionSubject,
} from "./permission.types.js";

interface RequiredPermission {
  action: PermissionAction;
  subject: PermissionSubject;
}

/**
 * Reflectable decorator created via Reflector.createDecorator — PermissionsGuard
 * reads it with `reflector.get(PermissionMetadata, context.getHandler())`.
 * Exported so the guard and the require-permission lint rule both have a single
 * source of truth for the metadata key.
 */
export const PermissionMetadata =
  Reflector.createDecorator<RequiredPermission>();

/**
 * Declares the CASL permission a route requires — checked against the caller's
 * role-derived ability by PermissionsGuard. Every authenticated route must carry
 * exactly one of these; enforced by @wire/eslint-plugin-wire-api's
 * require-permission rule, not just convention.
 *
 * Usage: @RequirePermission("create", "Message")
 */
export function RequirePermission(
  action: PermissionAction,
  subject: PermissionSubject
) {
  return PermissionMetadata({ action, subject });
}
