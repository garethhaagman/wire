import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Database, deleteBookmark, insertBookmark, listBookmarks } from "@wire/db";
import type { Bookmark } from "@wire/types";
import { ChannelAccessService } from "../channels/channel-access.service.js";
import { ResourceConflictException } from "../common/errors/api-exception.js";
import type { WorkspaceActor } from "../permissions/actor.js";

/** Bookmarks are private to their owner — every query is keyed by the caller's member id. */
@Injectable()
export class BookmarksService {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly access: ChannelAccessService,
  ) {}

  list(actor: WorkspaceActor, page: number, perPage: number): Promise<{ items: Bookmark[]; total: number }> {
    return listBookmarks(this.db, actor.member.id, page, perPage);
  }

  async add(actor: WorkspaceActor, messageId: string): Promise<Bookmark> {
    await this.access.readableMessage(actor, messageId);
    const bookmark = await insertBookmark(this.db, { workspaceId: actor.workspaceId, memberId: actor.member.id, messageId });
    if (!bookmark) {
      throw new ResourceConflictException(`Message ${messageId} is already bookmarked`);
    }
    return bookmark;
  }

  async remove(actor: WorkspaceActor, id: string): Promise<void> {
    if (!(await deleteBookmark(this.db, actor.member.id, id))) {
      throw new NotFoundException(`No bookmark with id ${id}`);
    }
  }
}
