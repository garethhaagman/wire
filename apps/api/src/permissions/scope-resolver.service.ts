import { Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { Database, findChannelRecord, findFile, findMessage } from "@wire/db";
import { LruCache } from "../common/cache/lru-cache.js";
import type { WorkspaceScopeSource } from "./workspace-scope.decorator.js";

const CACHE_CAPACITY = 200_000;

function paramValue(req: Request, name: string): string | undefined {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Maps a request's channel/message/file id back to its workspace. A resource's
 * workspace never changes, so lookups are memoized in-process — after warm-up the
 * guard costs no extra queries for these routes.
 */
@Injectable()
export class ScopeResolverService {
  private readonly workspaceByResource = new LruCache<string, string>(CACHE_CAPACITY);

  constructor(@Inject(Database) private readonly db: Database) {}

  /** `undefined` = route isn't workspace-scoped; `null` = referenced resource doesn't exist. */
  async resolve(source: WorkspaceScopeSource, req: Request): Promise<string | null | undefined> {
    switch (source.from) {
      case "workspace":
        return paramValue(req, source.param) ?? null;
      case "optionalQueryWorkspace": {
        const value = req.query[source.key];
        return typeof value === "string" && value ? value : undefined;
      }
      case "channel":
        return this.cached(paramValue(req, source.param), async (id) => (await findChannelRecord(this.db, id))?.workspaceId);
      case "message":
        return this.cached(paramValue(req, source.param), async (id) => (await findMessage(this.db, id))?.workspaceId);
      case "file":
        return this.cached(paramValue(req, source.param), async (id) => (await findFile(this.db, id))?.workspaceId);
      case "bodyChannel": {
        const body = req.body as Record<string, unknown> | undefined;
        const value = body?.[source.field];
        return this.cached(typeof value === "string" ? value : undefined, async (id) =>
          (await findChannelRecord(this.db, id))?.workspaceId,
        );
      }
    }
  }

  private async cached(id: string | undefined, load: (id: string) => Promise<string | undefined>): Promise<string | null> {
    if (!id) return null;
    const hit = this.workspaceByResource.get(id);
    if (hit) return hit;
    const workspaceId = await load(id);
    if (!workspaceId) return null;
    this.workspaceByResource.set(id, workspaceId);
    return workspaceId;
  }
}
