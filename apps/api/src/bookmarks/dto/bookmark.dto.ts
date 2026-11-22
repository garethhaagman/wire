import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";
import type { Bookmark, CreateBookmarkRequest } from "@wire/types";

export class BookmarkDto implements Bookmark {
  @ApiProperty({ example: "bkm_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: Bookmark["id"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  memberId!: string;

  @ApiProperty()
  messageId!: string;

  @ApiProperty()
  createdAt!: string;
}

export class CreateBookmarkRequestDto implements CreateBookmarkRequest {
  @ApiProperty()
  @IsString()
  @Length(1, 64)
  messageId!: string;
}
