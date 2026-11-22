import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { appendEvents, Database, findFile, insertFile, listChannelFiles } from "@wire/db";
import type { CreateFileRequest, WireFile } from "@wire/types";
import { ChannelAccessService } from "../channels/channel-access.service.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import type { WorkspaceActor } from "../permissions/actor.js";

/**
 * File metadata, persisted and ACL'd through the owning channel. Blob storage
 * (signed upload URLs to the S3-compatible object store), virus scanning and text
 * extraction are internal-docs/product/04-implementation-roadmap.md Phase 3 —
 * virusScanStatus stays "pending" until that pipeline exists.
 */
@Injectable()
export class FilesService {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly access: ChannelAccessService,
    private readonly relay: OutboxRelayService,
  ) {}

  async getById(actor: WorkspaceActor, id: string): Promise<WireFile> {
    const file = await findFile(this.db, id);
    if (!file || file.workspaceId !== actor.workspaceId) {
      throw new NotFoundException(`No file with id ${id}`);
    }
    await this.access.readable(actor, file.channelId);
    return file;
  }

  async listForChannel(
    actor: WorkspaceActor,
    channelId: string,
    page: number,
    perPage: number,
  ): Promise<{ items: WireFile[]; total: number }> {
    await this.access.readable(actor, channelId);
    return listChannelFiles(this.db, channelId, page, perPage);
  }

  async create(actor: WorkspaceActor, input: CreateFileRequest): Promise<WireFile> {
    await this.access.writable(actor, input.channelId);
    const file = await this.db.tx(async (tx) => {
      const created = await insertFile(tx, {
        workspaceId: actor.workspaceId,
        channelId: input.channelId,
        uploadedBy: actor.member.id,
        name: input.name,
        mime: input.mime,
        sizeBytes: input.sizeBytes,
      });
      await appendEvents(tx, [{ workspaceId: actor.workspaceId, type: "file.created", channelId: input.channelId, data: { file: created } }]);
      return created;
    });
    this.relay.kick();
    return file;
  }
}
