/**
 * Keyword search — internal-docs/product/05-feature-parity.md § Search and history.
 * Postgres full-text search over messages the caller can see; semantic/hybrid
 * search depends on the retrieval pipeline (internal-docs/retrieval/).
 */
export interface SearchResult {
  messageId: string;
  workspaceId: string;
  channelId: string;
  threadRootId: string | null;
  actorId: string;
  excerpt: string;
  score: number;
  createdAt: string;
}
