import { Inject, Injectable, Logger } from "@nestjs/common";
import { ZodError } from "zod";
import { Database, getOrgUiConfig, getUiConfigOverride, setOrgUiConfig, setUiConfigOverride } from "@wire/db";
import { resolveUiConfig, uiConfigOverrideSchema, lockSetSchema } from "@wire/ui-config";
import type { UiConfigResource } from "@wire/types";
import { ValidationException } from "../common/errors/api-exception.js";
import type { WorkspaceActor } from "../permissions/actor.js";

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

/**
 * Org layer lives on `workspaces.ui_config` / `ui_config_locks`, the user layer on
 * `members.ui_config_override` (internal-docs/ui/config-schema.md "Storage").
 * Layers are validated on write and re-validated on read, so a schema change can
 * never make a stored layer crash resolution — an invalid layer is skipped.
 */
@Injectable()
export class UiConfigService {
  private readonly logger = new Logger(UiConfigService.name);

  constructor(@Inject(Database) private readonly db: Database) {}

  async resolve(actor: WorkspaceActor): Promise<UiConfigResource> {
    const [org, user] = await Promise.all([
      getOrgUiConfig(this.db, actor.workspaceId),
      getUiConfigOverride(this.db, actor.member.id),
    ]);

    const { config, warnings } = resolveUiConfig({
      org: org ? this.stored(uiConfigOverrideSchema, org.override, "org override") : undefined,
      locks: org ? this.stored(lockSetSchema, org.locks, "org locks") : undefined,
      user: user === null ? undefined : this.stored(uiConfigOverrideSchema, user, "user override"),
    });

    return { workspaceId: actor.workspaceId, resolved: config, warnings };
  }

  /** Admin-only — see @RequirePermission("manage", "UiConfig") on the controller route. */
  async setOrgLayer(actor: WorkspaceActor, override: unknown, locks: unknown): Promise<void> {
    await setOrgUiConfig(this.db, actor.workspaceId, {
      override: parseOrThrow(uiConfigOverrideSchema, override),
      locks: parseOrThrow(lockSetSchema, locks),
    });
  }

  /** Always the caller's own member row — never a param. */
  async setUserLayer(actor: WorkspaceActor, override: unknown): Promise<void> {
    await setUiConfigOverride(this.db, actor.member.id, parseOrThrow(uiConfigOverrideSchema, override));
  }

  private stored<T>(schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false } }, value: unknown, label: string): T | undefined {
    const result = schema.safeParse(value);
    if (!result.success) {
      this.logger.warn(`ignoring invalid stored ui-config ${label}`);
      return undefined;
    }
    return result.data;
  }
}
