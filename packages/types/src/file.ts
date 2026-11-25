/**
 * Mirrors internal-docs/product/02-core-concepts.md § File. `storageKey` (the
 * blob's location in the configured StorageAdapter) is DB-only, deliberately not
 * exposed here — same precedent as WebhookEndpoint omitting secretCiphertext.
 */
export interface WireFile {
  channelId: string;
  createdAt: string;
  id: `file_${string}`;
  mime: string;
  name: string;
  sizeBytes: number;
  sizeConfirmed: boolean;
  uploadedBy: string;
  virusScanStatus: "pending" | "clean" | "infected";
  workspaceId: string;
}

export interface CreateFileRequest {
  channelId: string;
  mime: string;
  name: string;
  sizeBytes: number;
}

/** Starts an upload: creates the file row (sizeConfirmed: false) and returns where to PUT the bytes. */
export interface CreateUploadRequest {
  channelId: string;
  mime: string;
  name: string;
  sizeBytes: number;
}

export interface CreateUploadResponse {
  file: WireFile;
  headers?: Record<string, string>;
  method: "PUT";
  uploadUrl: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
}
