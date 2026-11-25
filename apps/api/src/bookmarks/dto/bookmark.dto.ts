import { ApiProperty } from "@nestjs/swagger";
import type { Bookmark, CreateBookmarkRequest } from "@wire/types";
import { IsString, Length } from "class-validator";

export class BookmarkDto implements Bookmark {
  @ApiProperty({ example: "bkm_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: Bookmark["id"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "mem_64d9dea525ae84ef6f7bd361" })
  memberId!: string;

  @ApiProperty({ example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  messageId!: string;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;
}

export class CreateBookmarkRequestDto implements CreateBookmarkRequest {
  @ApiProperty({ example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  @IsString()
  @Length(1, 64)
  messageId!: string;
}
