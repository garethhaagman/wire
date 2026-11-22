import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Length, Max, Min } from "class-validator";
import type { CreateFileRequest, WireFile } from "@wire/types";

export class FileDto implements WireFile {
  @ApiProperty({ example: "file_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: WireFile["id"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  channelId!: string;

  @ApiProperty()
  uploadedBy!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  mime!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({ enum: ["pending", "clean", "infected"] })
  virusScanStatus!: WireFile["virusScanStatus"];

  @ApiProperty()
  createdAt!: string;
}

export class CreateFileRequestDto implements CreateFileRequest {
  @ApiProperty()
  @IsString()
  channelId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiProperty({ example: "image/png" })
  @IsString()
  @Length(1, 255)
  mime!: string;

  @ApiProperty({ maximum: 5 * 1024 ** 3 })
  @IsInt()
  @Min(0)
  @Max(5 * 1024 ** 3)
  sizeBytes!: number;
}
