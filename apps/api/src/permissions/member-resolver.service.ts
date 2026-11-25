import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Redis } from "ioredis";
import { claimInvitesByEmail, Database, findMemberByUser } from "@wire/db";
import { claimRequiresVerifiedEmail, type ApiEnv } from "@wire/config";
import type { Member } from "@wire/types";
import { API_ENV } from "../config/env.provider.js";
import { REDIS, warnRedisFailure } from "../redis/redis.module.js";

export interface ResolvedMember {
  id: string;
  role: Member["role"];
  displayName: string;
}

interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

const POSITIVE_TTL_SECONDS = 60;
const NEGATIVE_TTL_SECONDS = 5;
const NONE = "none";

function cacheKey(workspaceId: string, userId: string): string {
  return `wire:member:${workspaceId}:${userId}`;
}

/**
 * Resolves the caller's membership in a workspace — consulted by the guard on
 * every workspace-scoped request, so it's cached in Redis (shared across
 * replicas) and invalidated by MembersService on any role/profile change. A
 * pending invite matching the user's email is claimed on first access.
 */
@Injectable()
export class MemberResolverService {
  private readonly logger = new Logger(MemberResolverService.name);
  private readonly requireVerifiedEmail: boolean;

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(API_ENV) env: ApiEnv,
  ) {
    this.requireVerifiedEmail = claimRequiresVerifiedEmail(env);
  }

  canClaim(user: SessionUser): boolean {
    return user.emailVerified || !this.requireVerifiedEmail;
  }

  async resolve(workspaceId: string, user: SessionUser): Promise<ResolvedMember | null> {
    const key = cacheKey(workspaceId, user.id);
    const cached = await this.redis.get(key).catch((err: Error) => {
      warnRedisFailure(this.redis, this.logger, "member cache read failed", err);
      return null;
    });
    if (cached === NONE) return null;
    if (cached) return JSON.parse(cached) as ResolvedMember;

    let member = await findMemberByUser(this.db, workspaceId, user.id);
    if (!member && this.canClaim(user)) {
      [member = null] = await claimInvitesByEmail(this.db, user.id, user.email, workspaceId);
    }

    const resolved = member
      ? { id: member.id, role: member.role, displayName: member.displayName }
      : null;
    await this.redis
      .set(
        key,
        resolved ? JSON.stringify(resolved) : NONE,
        "EX",
        resolved ? POSITIVE_TTL_SECONDS : NEGATIVE_TTL_SECONDS,
      )
      .catch((err: Error) =>
        warnRedisFailure(this.redis, this.logger, "member cache write failed", err),
      );
    return resolved;
  }

  async invalidate(workspaceId: string, userId: string | null): Promise<void> {
    if (!userId) return;
    await this.redis
      .del(cacheKey(workspaceId, userId))
      .catch((err: Error) =>
        warnRedisFailure(this.redis, this.logger, "member cache invalidate failed", err),
      );
  }
}
