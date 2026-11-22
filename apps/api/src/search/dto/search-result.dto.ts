import { ApiProperty } from "@nestjs/swagger";
import type { SearchResult } from "@wire/types";

export class SearchResultDto implements SearchResult {
  @ApiProperty()
  messageId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  channelId!: string;

  @ApiProperty({ nullable: true, type: String })
  threadRootId!: string | null;

  @ApiProperty()
  actorId!: string;

  @ApiProperty({ description: "Matching snippet; hits wrapped in <mark></mark>" })
  excerpt!: string;

  @ApiProperty({ description: "Relevance (ts_rank_cd); only comparable within one response" })
  score!: number;

  @ApiProperty()
  createdAt!: string;
}
