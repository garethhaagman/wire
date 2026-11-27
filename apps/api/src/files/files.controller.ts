import { createReadStream } from "node:fs";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { ApiEnv } from "@wire/config";
import type {
  CreateUploadResponse,
  DownloadUrlResponse,
  WireFile,
} from "@wire/types";
import type { Request, Response } from "express";
import { Public } from "../auth/public.decorator.js";
import { ExcludeFromMcp } from "../common/decorators/exclude-from-mcp.decorator.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { API_ENV } from "../config/env.provider.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";
import {
  CreateUploadRequestDto,
  CreateUploadResponseDto,
  DownloadUrlResponseDto,
  FileDto,
} from "./dto/file.dto.js";
import { FilesService } from "./files.service.js";
import { LocalDiskAdapter } from "./storage/local-disk-adapter.js";

/**
 * Signed-upload-URL flow (see files.service.ts). The `_local-upload` routes only
 * matter when LocalDiskAdapter is selected (no S3_BUCKET set): they're the
 * "signed URL" target for local disk, authorized by an HMAC token in the query
 * string rather than a session cookie, same trust model as a real presigned S3
 * URL. @Public() because the signed token IS the auth; LocalDiskAdapter itself
 * verifies it below.
 */
@ApiTags("Files")
@ApiCookieAuth()
@Controller("v1")
export class FilesController {
  private readonly localDisk: LocalDiskAdapter;

  constructor(
    private readonly files: FilesService,
    @Inject(API_ENV) env: ApiEnv
  ) {
    this.localDisk = new LocalDiskAdapter(env);
  }

  @Get("files/:id")
  @ApiOperation({ operationId: "get_file", summary: "Get one file's metadata" })
  @WorkspaceScope({ from: "file", param: "id" })
  @RequirePermission("read", "File")
  @ApiOkResponse({ type: FileDto })
  getById(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<WireFile> {
    return this.files.getById(actor, id);
  }

  @Post("files/upload-requests")
  @ApiOperation({
    operationId: "create_file_upload",
    summary: "Request a presigned URL to upload a file to a channel",
  })
  @ExcludeFromMcp()
  @WorkspaceScope({ from: "bodyChannel", field: "channelId" })
  @RequirePermission("create", "File")
  @ApiCreatedResponse({ type: CreateUploadResponseDto })
  createUploadRequest(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: CreateUploadRequestDto
  ): Promise<CreateUploadResponse> {
    return this.files.requestUpload(actor, body);
  }

  @Post("files/:id/confirm")
  @ApiOperation({
    operationId: "confirm_file_upload",
    summary: "Confirm that a file upload to its presigned URL has finished",
  })
  @ExcludeFromMcp()
  @WorkspaceScope({ from: "file", param: "id" })
  @RequirePermission("create", "File")
  @ApiOkResponse({ type: FileDto })
  createUploadConfirmation(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<WireFile> {
    return this.files.confirmUpload(actor, id);
  }

  @Get("files/:id/download-url")
  @ApiOperation({
    operationId: "get_file_download_url",
    summary: "Get a short-lived URL to download a file",
  })
  @WorkspaceScope({ from: "file", param: "id" })
  @RequirePermission("read", "File")
  @ApiOkResponse({ type: DownloadUrlResponseDto })
  getDownloadUrl(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<DownloadUrlResponse> {
    return this.files.getDownloadUrl(actor, id);
  }

  @Get("channels/:channelId/files")
  @ApiOperation({
    operationId: "list_channel_files",
    summary: "List the files shared in a channel",
  })
  @WorkspaceScope({ from: "channel", param: "channelId" })
  @RequirePermission("read", "File")
  @ApiOkResponse({ type: FileDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResult<WireFile>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.files.listForChannel(
      actor,
      channelId,
      page,
      perPage
    );
    return new PaginatedResult(
      items,
      buildPaginationMeta(page, perPage, total)
    );
  }

  @Put("files/_local-upload/:key")
  @ApiOperation({
    operationId: "put_local_file_upload",
    summary:
      "Receive file bytes for a presigned local-disk upload URL (dev storage only)",
  })
  @ExcludeFromMcp()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async setLocalUpload(
    @Param("key") key: string,
    @Query("token") token: string | undefined,
    @Req() req: Request
  ): Promise<null> {
    if (!this.localDisk.verifyToken(key, token)) {
      throw new NotFoundException("Invalid or expired upload URL.");
    }
    await this.localDisk.writeStream(key, req);
    return null;
  }

  /** Streams raw bytes: bypasses the JSON envelope by necessity, same as the SSE route in events.controller.ts. */
  @Get("files/_local-upload/:key")
  @ApiOperation({
    operationId: "get_local_file_download",
    summary:
      "Serve file bytes for a presigned local-disk download URL (dev storage only)",
  })
  @ExcludeFromMcp()
  @Public()
  @ApiOkResponse({ description: "application/octet-stream" })
  getLocalDownload(
    @Param("key") key: string,
    @Query("token") token: string | undefined,
    @Res() res: Response
  ): void {
    if (!this.localDisk.verifyToken(key, token)) {
      throw new NotFoundException("Invalid or expired download URL.");
    }
    const stream = createReadStream(this.localDisk.resolveKey(key));
    stream.on("error", () => res.status(404).end());
    stream.pipe(res);
  }
}
