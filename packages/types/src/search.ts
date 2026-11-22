/**
 * Keyword search only — internal-docs/product/05-feature-parity.md § Search and history.
 * Semantic/hybrid search depend on the retrieval pipeline (internal-docs/retrieval/) which
 * isn't implemented yet; this mock covers GET /v1/search?q= against mock message bodies.
 */
export interface SearchResult {
  messageId: string;
  channelId: string;
  excerpt: string;
  score: number;
}
