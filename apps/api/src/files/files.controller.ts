import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { WireFile } from "@wire/types";
import type { AuthedRequest } from "../auth/session.guard.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { FilesService } from "./files.service.js";
import { CreateFileRequestDto, FileDto } from "./dto/file.dto.js";

/**
 * Metadata-only mock — no real upload/storage backend. A real implementation
 * needs a signed-upload-URL flow, not a single multipart POST; see
 * internal-docs/product/02-core-concepts.md § File.
 */
@ApiTags("Files")
@ApiCookieAuth()
@Controller("v1/files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get(":id")
  @RequirePermission("read", "File")
  @ApiOkResponse({ type: FileDto })
  getById(@Param("id") id: string): WireFile {
    return this.files.getById(id);
  }

  @Post()
  @RequirePermission("create", "File")
  @ApiCreatedResponse({ type: FileDto })
  create(@Req() req: AuthedRequest, @Body() body: CreateFileRequestDto): WireFile {
    const uploadedBy = req.session!.user.id;
    return this.files.create(uploadedBy, body);
  }
}
