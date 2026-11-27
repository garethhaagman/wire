import { ApiProperty } from "@nestjs/swagger";
import type {
  CreateUploadRequest,
  CreateUploadResponse,
  DownloadUrlResponse,
  WireFile,
} from "@wire/types";
import { IsInt, IsString, Length, Max, Min } from "class-validator";

export class FileDto implements WireFile {
  @ApiProperty({ type: String, example: "file_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: WireFile["id"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  channelId!: string;

  @ApiProperty({ example: "mem_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  uploadedBy!: string;

  @ApiProperty({ example: "roadmap.pdf" })
  name!: string;

  @ApiProperty({ example: "application/pdf" })
  mime!: string;

  @ApiProperty({ example: 2_458_112, description: "Size in bytes" })
  sizeBytes!: number;

  @ApiProperty({
    example: true,
    description:
      "False until confirmUpload() verifies the blob actually landed in storage.",
  })
  sizeConfirmed!: boolean;

  @ApiProperty({ enum: ["pending", "clean", "infected"] })
  virusScanStatus!: WireFile["virusScanStatus"];

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;
}

export class CreateUploadRequestDto implements CreateUploadRequest {
  @ApiProperty({ example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  @IsString()
  channelId!: string;

  @ApiProperty({ example: "roadmap.pdf" })
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiProperty({ example: "image/png" })
  @IsString()
  @Length(1, 255)
  mime!: string;

  @ApiProperty({
    example: 2_458_112,
    maximum: 5 * 1024 ** 3,
    description: "Size in bytes",
  })
  @IsInt()
  @Min(0)
  @Max(5 * 1024 ** 3)
  sizeBytes!: number;
}

export class CreateUploadResponseDto implements CreateUploadResponse {
  @ApiProperty({ type: () => FileDto })
  file!: WireFile;

  @ApiProperty({
    example:
      "https://wire-files.s3.us-east-1.amazonaws.com/ws_64d9.../blob_01jd5x...?X-Amz-Signature=...",
  })
  uploadUrl!: string;

  @ApiProperty({ enum: ["PUT"] })
  method!: "PUT";

  @ApiProperty({
    required: false,
    type: Object,
    additionalProperties: { type: "string" },
    example: { "Content-Type": "image/png" },
  })
  headers?: Record<string, string>;
}

export class DownloadUrlResponseDto implements DownloadUrlResponse {
  @ApiProperty({
    example:
      "https://wire-files.s3.us-east-1.amazonaws.com/ws_64d9.../blob_01jd5x...?X-Amz-Signature=...",
  })
  downloadUrl!: string;
}
