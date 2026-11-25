/** "Save for later" — product/05-feature-parity.md § Reactions, pins, bookmarks. Private to one member. */
export interface Bookmark {
  createdAt: string;
  id: `bkm_${string}`;
  memberId: string;
  messageId: string;
  workspaceId: string;
}

export interface CreateBookmarkRequest {
  messageId: string;
}
