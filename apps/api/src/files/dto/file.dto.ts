import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Length, Max, Min } from "class-validator";
import type { CreateFileRequest, WireFile } from "@wire/types";

export class FileDto implements WireFile {
  @ApiProperty({ example: "file_01jd5x0k8f3v8q2m7n4r6t9w1y" })
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

  @ApiProperty({ enum: ["pending", "clean", "infected"] })
  virusScanStatus!: WireFile["virusScanStatus"];

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;
}

export class CreateFileRequestDto implements CreateFileRequest {
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

  @ApiProperty({ example: 2_458_112, maximum: 5 * 1024 ** 3, description: "Size in bytes" })
  @IsInt()
  @Min(0)
  @Max(5 * 1024 ** 3)
  sizeBytes!: number;
}
