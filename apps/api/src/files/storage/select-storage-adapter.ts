import type { ApiEnv } from "@wire/config";
import { LocalDiskAdapter } from "./local-disk-adapter.js";
import { S3Adapter } from "./s3-adapter.js";
import type { StorageAdapter } from "./storage-adapter.interface.js";

/**
 * Zero-config default: no S3_BUCKET means every upload still works end-to-end
 * (signed-URL issuance, PUT, confirm, download) against local disk instead of a
 * real object store. Set S3_BUCKET to switch to S3Adapter — same shape as
 * agents/model-selection.ts's selectModel().
 */
export function selectStorageAdapter(env: ApiEnv): StorageAdapter {
  if (env.S3_BUCKET) {
    return new S3Adapter(env);
  }
  return new LocalDiskAdapter(env);
}
