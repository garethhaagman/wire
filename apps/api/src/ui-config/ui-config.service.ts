import { Injectable } from "@nestjs/common";
import { ZodError } from "zod";
import {
  resolveUiConfig,
  uiConfigOverrideSchema,
  lockSetSchema,
  type UiConfigOverride,
  type LockSet,
} from "@wire/ui-config";
import type { UiConfigResource } from "@wire/types";
import { ValidationException } from "../common/errors/api-exception.js";

function parseOrThrow<T>(schema: { parse: (input: unknown) => T }, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationException(
        err.issues.map((issue) => ({
          field: issue.path.join("."),
          code: issue.code.toUpperCase(),
          message: issue.message,
        })),
      );
    }
    throw err;
  }
}

interface OrgLayer {
  override: UiConfigOverride;
  locks: LockSet;
}

/**
 * Dummy/mock service — in-memory only, no persistence, same caveat as every
 * other mock service in this app (see members.service.ts). Real
 * implementation stores the org layer on `workspaces.ui_config` and the user
 * layer on `members.ui_config_override` per internal-docs/ui/config-schema.md
 * "Storage".
 */
@Injectable()
export class UiConfigService {
  private readonly orgLayers = new Map<string, OrgLayer>();
  private readonly userLayers = new Map<string, UiConfigOverride>();

  private userKey(workspaceId: string, userId: string): string {
    return `${workspaceId}:${userId}`;
  }

  resolve(workspaceId: string, userId: string): UiConfigResource {
    const org = this.orgLayers.get(workspaceId);
    const user = this.userLayers.get(this.userKey(workspaceId, userId));

    const { config, warnings } = resolveUiConfig({
      org: org?.override,
      user,
      locks: org?.locks,
    });

    return { workspaceId, resolved: config, warnings };
  }

  /** Admin-only — see @RequirePermission("manage", "UiConfig") on the controller route. */
  setOrgLayer(workspaceId: string, override: unknown, locks: unknown): void {
    const parsedOverride = parseOrThrow(uiConfigOverrideSchema, override);
    const parsedLocks = parseOrThrow(lockSetSchema, locks);
    this.orgLayers.set(workspaceId, { override: parsedOverride, locks: parsedLocks });
  }

  /** A member may only ever write their own layer — enforced by the controller passing the session's own userId, never a param. */
  setUserLayer(workspaceId: string, userId: string, override: unknown): void {
    const parsedOverride = parseOrThrow(uiConfigOverrideSchema, override);
    this.userLayers.set(this.userKey(workspaceId, userId), parsedOverride);
  }
}
