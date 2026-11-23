import { ApiProperty } from "@nestjs/swagger";
import type { SearchResult } from "@wire/types";

export class SearchResultDto implements SearchResult {
  @ApiProperty({ example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  messageId!: string;

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  channelId!: string;

  @ApiProperty({ nullable: true, type: String, example: "msg_01jd5wz2n0a1b2c3d4e5f6g7h8" })
  threadRootId!: string | null;

  @ApiProperty({ example: "mem_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  actorId!: string;

  @ApiProperty({
    description: "Matching snippet; hits wrapped in <mark></mark>",
    example: "...sent over the <mark>launch plan</mark> for next week...",
  })
  excerpt!: string;

  @ApiProperty({
    description: "Relevance (ts_rank_cd); only comparable within one response",
    example: 0.82,
  })
  score!: number;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;
}
