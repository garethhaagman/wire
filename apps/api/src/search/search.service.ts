import { Inject, Injectable } from "@nestjs/common";
import {
  Database,
  listMembershipsForUser,
  type SearchScope,
  searchMessages,
} from "@wire/db";
import type { SearchResult } from "@wire/types";
import type { RequestActor } from "../permissions/actor.js";

interface SearchInput {
  channelId?: string | undefined;
  page: number;
  perPage: number;
  query: string;
  threadRootId?: string | undefined;
}

/**
 * Keyword search over Postgres full-text (GIN index on messages.search_vector),
 * served from the read replica when one is configured. The channel ACL is applied
 * inside the query. Hybrid/semantic search (embeddings, re-ranking) is the target
 * design in internal-docs/retrieval/retrieval.md.
 */
@Injectable()
export class SearchService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async search(
    actor: RequestActor,
    input: SearchInput
  ): Promise<{ items: SearchResult[]; total: number }> {
    const scope = await this.scopeFor(actor);
    if (scope.memberIds.length === 0) {
      return { items: [], total: 0 };
    }
    return searchMessages(this.db.reader, scope, {
      query: input.query,
      channelId: input.channelId,
      threadRootId: input.threadRootId,
      limit: input.perPage,
      offset: (input.page - 1) * input.perPage,
    });
  }

  /** One workspace when `workspace_id` scoped the request, otherwise every workspace the caller belongs to. */
  private async scopeFor(actor: RequestActor): Promise<SearchScope> {
    if (actor.workspaceId && actor.member) {
      return {
        memberIds: [actor.member.id],
        publicWorkspaceIds:
          actor.member.role === "guest" ? [] : [actor.workspaceId],
      };
    }
    const memberships = await listMembershipsForUser(this.db, actor.userId);
    return {
      memberIds: memberships.map((m) => m.memberId),
      publicWorkspaceIds: memberships
        .filter((m) => m.role !== "guest")
        .map((m) => m.workspaceId),
    };
  }
}
