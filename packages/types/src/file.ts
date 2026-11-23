/**
 * Mirrors internal-docs/product/02-core-concepts.md § File. `storageKey` (the
 * blob's location in the configured StorageAdapter) is DB-only, deliberately not
 * exposed here — same precedent as WebhookEndpoint omitting secretCiphertext.
 */
export interface WireFile {
  id: `file_${string}`;
  workspaceId: string;
  channelId: string;
  uploadedBy: string;
  name: string;
  mime: string;
  sizeBytes: number;
  sizeConfirmed: boolean;
  virusScanStatus: "pending" | "clean" | "infected";
  createdAt: string;
}

export interface CreateFileRequest {
  channelId: string;
  name: string;
  mime: string;
  sizeBytes: number;
}

/** Starts an upload: creates the file row (sizeConfirmed: false) and returns where to PUT the bytes. */
export interface CreateUploadRequest {
  channelId: string;
  name: string;
  mime: string;
  sizeBytes: number;
}

export interface CreateUploadResponse {
  file: WireFile;
  uploadUrl: string;
  method: "PUT";
  headers?: Record<string, string>;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
}
