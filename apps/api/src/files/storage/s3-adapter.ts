import { InternalServerErrorException } from "@nestjs/common";
import {
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ApiEnv } from "@wire/config";
import type { StorageAdapter } from "./storage-adapter.interface.js";

const SIGNED_URL_TTL_SECONDS = 10 * 60;

/**
 * Real S3 by default. Setting S3_ENDPOINT (+ S3_FORCE_PATH_STYLE=true) points the
 * exact same client at a local Garage instance instead — Garage speaks the S3 API,
 * so no separate adapter is needed for local-vs-prod, only different env vars.
 */
export class S3Adapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(env: ApiEnv) {
    if (!env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new InternalServerErrorException(
        "S3Adapter requires S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
      );
    }
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      // The SDK defaults to attaching a CRC32 request checksum, baked into the
      // presigned URL's query string as a signed param — but a presigned PUT is
      // sent by an arbitrary HTTP client (browser fetch, curl) that doesn't know
      // to compute that checksum, so the upload is rejected by the server with a
      // checksum mismatch before any bytes are even read. Presigned requests must
      // not require anything the bearer of the URL alone can't satisfy.
      requestChecksumCalculation: "WHEN_REQUIRED",
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    });
  }

  async createUploadUrl(input: { key: string; mime: string; sizeBytes: number }): Promise<{
    uploadUrl: string;
    method: "PUT";
    headers?: Record<string, string>;
  }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.mime,
      ContentLength: input.sizeBytes,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
    return { uploadUrl, method: "PUT", headers: { "Content-Type": input.mime } };
  }

  async createDownloadUrl(input: { key: string }): Promise<{ downloadUrl: string }> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: input.key });
    const downloadUrl = await getSignedUrl(this.client, command, {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
    return { downloadUrl };
  }

  async confirmUpload(input: { key: string }): Promise<{ exists: boolean; sizeBytes: number }> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: input.key }),
      );
      return { exists: true, sizeBytes: head.ContentLength ?? 0 };
    } catch {
      return { exists: false, sizeBytes: 0 };
    }
  }
}
