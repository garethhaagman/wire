import { ApiProperty } from "@nestjs/swagger";
import type { SearchResult } from "@wire/types";

export class SearchResultDto implements SearchResult {
  @ApiProperty()
  messageId!: string;

  @ApiProperty()
  channelId!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty({ description: "Relevance score, 0-1. Mock implementation returns a constant." })
  score!: number;
}
