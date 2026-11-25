/**
 * Minimal blob-storage contract: get a URL to PUT bytes to, a URL to GET them
 * back from, and a way to verify an upload actually landed before trusting it.
 * LocalDiskAdapter and S3Adapter both implement this; selectStorageAdapter()
 * picks one from env, no DI provider-swapping needed (same shape as
 * agents/model-selection.ts's selectModel()).
 */
export interface StorageAdapter {
  /** Verifies the object exists post-upload and returns its actual size — never trust the client-claimed size. */
  confirmUpload: (input: {
    key: string;
  }) => Promise<{ exists: boolean; sizeBytes: number }>;

  createDownloadUrl: (input: {
    key: string;
  }) => Promise<{ downloadUrl: string }>;
  createUploadUrl: (input: {
    key: string;
    mime: string;
    sizeBytes: number;
  }) => Promise<{
    uploadUrl: string;
    method: "PUT";
    headers?: Record<string, string>;
  }>;
}
