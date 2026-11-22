import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Min } from "class-validator";
import type { CreateFileRequest, WireFile } from "@wire/types";

export class FileDto implements WireFile {
  @ApiProperty({ example: "file_64d9dea525ae84ef6f7bd361" })
  id!: WireFile["id"];

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
  name!: string;

  @ApiProperty({ example: "image/png" })
  @IsString()
  mime!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sizeBytes!: number;
}
