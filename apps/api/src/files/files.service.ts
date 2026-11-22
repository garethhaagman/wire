import { randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateFileRequest, WireFile } from "@wire/types";
import { InMemoryStore } from "../common/mock/in-memory-store.js";

/**
 * Dummy/mock service — metadata only, no blob storage, no actual virus scan.
 * Real implementation (upload URL, storage backend, scan pipeline, text
 * extraction) per internal-docs/product/02-core-concepts.md § File and
 * internal-docs/product/04-implementation-roadmap.md Phase 3.
 */
@Injectable()
export class FilesService {
  private readonly store = new InMemoryStore<WireFile>();

  getById(id: string): WireFile {
    const file = this.store.findById(id);
    if (!file) {
      throw new NotFoundException(`No file with id ${id}`);
    }
    return file;
  }

  create(uploadedBy: string, input: CreateFileRequest): WireFile {
    return this.store.insert({
      id: `file_${randomBytes(12).toString("hex")}`,
      channelId: input.channelId,
      uploadedBy,
      name: input.name,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      virusScanStatus: "pending",
      createdAt: new Date().toISOString(),
    });
  }
}
