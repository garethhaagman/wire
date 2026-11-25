import { HttpStatus, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  appendEvents,
  Database,
  findFile,
  findFileStorageKey,
  insertFile,
  listChannelFiles,
  markFileUploaded,
  newId,
  updateVirusScanStatus,
} from "@wire/db";
import type { ApiEnv } from "@wire/config";
import type {
  CreateUploadRequest,
  CreateUploadResponse,
  DownloadUrlResponse,
  WireFile,
} from "@wire/types";
import { ChannelAccessService } from "../channels/channel-access.service.js";
import { API_ENV } from "../config/env.provider.js";
import { ApiException } from "../common/errors/api-exception.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import type { WorkspaceActor } from "../permissions/actor.js";
import { NoopScanAdapter } from "./scan/noop-scan-adapter.js";
import type { ScanAdapter } from "./scan/scan-adapter.interface.js";
import { selectStorageAdapter } from "./storage/select-storage-adapter.js";
import type { StorageAdapter } from "./storage/storage-adapter.interface.js";

/**
 * File metadata, persisted and ACL'd through the owning channel, plus the
 * signed-upload-URL flow backed by a StorageAdapter (local disk by default, S3 —
 * real AWS or a local Garage instance — when S3_BUCKET is set; see
 * storage/select-storage-adapter.ts). requestUpload() creates the row before
 * bytes exist (sizeConfirmed: false, no file.created event yet); confirmUpload()
 * verifies the object actually landed before marking it ready and emitting the
 * event — a file is never reported as created until its bytes are confirmed
 * present. Scanning (ScanAdapter — NoopScanAdapter by default, marks every
 * upload "clean" immediately) runs right after confirmation so virusScanStatus
 * never gets stuck at "pending" forever; a real scanner can replace
 * NoopScanAdapter later without changing this call site.
 */
@Injectable()
export class FilesService {
  private readonly storage: StorageAdapter;
  private readonly scanner: ScanAdapter;

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(API_ENV) env: ApiEnv,
    private readonly access: ChannelAccessService,
    private readonly relay: OutboxRelayService,
  ) {
    this.storage = selectStorageAdapter(env);
    this.scanner = new NoopScanAdapter();
  }

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

  /** Creates the file row and issues a signed URL to PUT bytes to. No file.created event yet — the bytes don't exist. */
  async requestUpload(
    actor: WorkspaceActor,
    input: CreateUploadRequest,
  ): Promise<CreateUploadResponse> {
    await this.access.writable(actor, input.channelId);

    const storageKey = `${actor.workspaceId}/${newId("blob")}`;
    const file = await insertFile(this.db, {
      workspaceId: actor.workspaceId,
      channelId: input.channelId,
      uploadedBy: actor.member.id,
      name: input.name,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      storageKey,
    });

    const { uploadUrl, method, headers } = await this.storage.createUploadUrl({
      key: storageKey,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
    });

    return { file, uploadUrl, method, ...(headers ? { headers } : {}) };
  }

  /** Verifies the blob exists before trusting it; only then does the file become visible as "created". */
  async confirmUpload(actor: WorkspaceActor, fileId: string): Promise<WireFile> {
    const file = await this.getById(actor, fileId);
    const stored = await findFileStorageKey(this.db, fileId);
    if (!stored) {
      throw new NotFoundException(`No file with id ${fileId}`);
    }

    const { exists, sizeBytes } = await this.storage.confirmUpload({ key: stored.storageKey });
    if (!exists) {
      throw new ApiException(
        "RESOURCE_CONFLICT",
        `No upload found for file ${fileId}. PUT the bytes to the upload URL before confirming.`,
        HttpStatus.CONFLICT,
      );
    }

    const scanStatus = await this.scanner.scan({ key: stored.storageKey });

    const confirmed = await this.db.tx(async (tx) => {
      const updated = await markFileUploaded(tx, fileId, { sizeBytes });
      if (!updated) throw new NotFoundException(`No file with id ${fileId}`);
      const scanned = (await updateVirusScanStatus(tx, fileId, scanStatus)) ?? updated;
      await appendEvents(tx, [
        {
          workspaceId: actor.workspaceId,
          type: "file.created",
          channelId: file.channelId,
          data: { file: scanned },
        },
      ]);
      return scanned;
    });
    this.relay.kick();
    return confirmed;
  }

  async getDownloadUrl(actor: WorkspaceActor, fileId: string): Promise<DownloadUrlResponse> {
    await this.getById(actor, fileId);
    const stored = await findFileStorageKey(this.db, fileId);
    if (!stored) {
      throw new NotFoundException(`No file with id ${fileId}`);
    }
    return this.storage.createDownloadUrl({ key: stored.storageKey });
  }
}
