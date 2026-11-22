/** Mirrors internal-docs/product/02-core-concepts.md § File */
export interface WireFile {
  id: `file_${string}`;
  workspaceId: string;
  channelId: string;
  uploadedBy: string;
  name: string;
  mime: string;
  sizeBytes: number;
  virusScanStatus: "pending" | "clean" | "infected";
  createdAt: string;
}

export interface CreateFileRequest {
  channelId: string;
  name: string;
  mime: string;
  sizeBytes: number;
}
