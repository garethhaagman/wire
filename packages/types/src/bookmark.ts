/** "Save for later" — product/05-feature-parity.md § Reactions, pins, bookmarks. Private to one member. */
export interface Bookmark {
  id: `bkm_${string}`;
  workspaceId: string;
  memberId: string;
  messageId: string;
  createdAt: string;
}

export interface CreateBookmarkRequest {
  messageId: string;
}
