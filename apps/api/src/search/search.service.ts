import { Injectable } from "@nestjs/common";
import type { SearchResult } from "@wire/types";
import { MessagesService } from "../messages/messages.service.js";

const EXCERPT_RADIUS = 40;

/**
 * Dummy/mock keyword search over the in-memory message store — case-insensitive
 * substring match, no ranking model. Real implementation (hybrid/semantic search,
 * embeddings, relevance scoring) per internal-docs/retrieval/retrieval.md.
 */
@Injectable()
export class SearchService {
  constructor(private readonly messages: MessagesService) {}

  search(query: string, page: number, perPage: number): { items: SearchResult[]; total: number } {
    const needle = query.toLowerCase();
    const matches = this.messages
      .findAll((m) => m.body.toLowerCase().includes(needle))
      .map((m): SearchResult => {
        const index = m.body.toLowerCase().indexOf(needle);
        const start = Math.max(0, index - EXCERPT_RADIUS);
        const end = Math.min(m.body.length, index + needle.length + EXCERPT_RADIUS);
        return {
          messageId: m.id,
          channelId: m.channelId,
          excerpt: m.body.slice(start, end),
          score: 1,
        };
      });

    const start = (page - 1) * perPage;
    return { items: matches.slice(start, start + perPage), total: matches.length };
  }
}
