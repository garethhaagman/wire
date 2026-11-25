/**
 * Keyword search — internal-docs/product/05-feature-parity.md § Search and history.
 * Postgres full-text search over messages the caller can see; semantic/hybrid
 * search depends on the retrieval pipeline (internal-docs/retrieval/).
 */
export interface SearchResult {
  actorId: string;
  channelId: string;
  createdAt: string;
  excerpt: string;
  messageId: string;
  score: number;
  threadRootId: string | null;
  workspaceId: string;
}
