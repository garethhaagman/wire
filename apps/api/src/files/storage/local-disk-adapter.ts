import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, open, stat } from "node:fs/promises";
import path from "node:path";
import { InternalServerErrorException } from "@nestjs/common";
import { type ApiEnv, resolveAppSecret } from "@wire/config";
import type { StorageAdapter } from "./storage-adapter.interface.js";

const TOKEN_TTL_MS = 10 * 60_000;

/**
 * Zero-config dev default: no S3_BUCKET means files land on local disk instead of
 * a real object store. There's no real "signed URL" concept for a filesystem, so
 * this signs a short-lived HMAC token (keyed off APP_SECRET) into the path
 * itself; FilesController's local-upload routes verify it instead of requiring a
 * session cookie, matching how a real S3 presigned URL authorizes the bearer,
 * not the cookie jar.
 */
export class LocalDiskAdapter implements StorageAdapter {
  private readonly dir: string;
  private readonly secret: string;
  private readonly baseUrl: string;

  constructor(env: ApiEnv) {
    this.dir = path.resolve(env.LOCAL_UPLOAD_DIR ?? "./.data/uploads");
    this.secret = resolveAppSecret(env);
    this.baseUrl = `http://localhost:${env.PORT}`;
  }

  createUploadUrl(input: {
    key: string;
    mime: string;
    sizeBytes: number;
  }): Promise<{
    uploadUrl: string;
    method: "PUT";
    headers?: Record<string, string>;
  }> {
    const token = this.sign(input.key, Date.now() + TOKEN_TTL_MS);
    return Promise.resolve({
      uploadUrl: `${this.baseUrl}/v1/files/_local-upload/${encodeURIComponent(input.key)}?token=${token}`,
      method: "PUT",
    });
  }

  createDownloadUrl(input: { key: string }): Promise<{ downloadUrl: string }> {
    const token = this.sign(input.key, Date.now() + TOKEN_TTL_MS);
    return Promise.resolve({
      downloadUrl: `${this.baseUrl}/v1/files/_local-upload/${encodeURIComponent(input.key)}?token=${token}`,
    });
  }

  async confirmUpload(input: {
    key: string;
  }): Promise<{ exists: boolean; sizeBytes: number }> {
    try {
      const info = await stat(this.resolveKey(input.key));
      return { exists: info.isFile(), sizeBytes: info.size };
    } catch {
      return { exists: false, sizeBytes: 0 };
    }
  }

  /** Verifies an incoming request's `?token=` query param. Format: `<expiresAtMs>.<hmacHex>`. */
  verifyToken(key: string, token: string | undefined): boolean {
    if (!token) {
      return false;
    }
    const [expiresAtRaw, mac] = token.split(".");
    const expiresAt = Number(expiresAtRaw);
    if (!(mac && Number.isFinite(expiresAt)) || expiresAt < Date.now()) {
      return false;
    }

    const expected = this.hmac(key, expiresAt);
    const expectedBuf = Buffer.from(expected, "hex");
    const macBuf = Buffer.from(mac, "hex");
    return (
      expectedBuf.length === macBuf.length &&
      timingSafeEqual(expectedBuf, macBuf)
    );
  }

  /** Streams a raw PUT body straight to disk. Caller (controller) owns the Express request stream. */
  async writeStream(key: string, body: NodeJS.ReadableStream): Promise<void> {
    const target = this.resolveKey(key);
    await mkdir(path.dirname(target), { recursive: true });
    const handle = await open(target, "w");
    try {
      const writeStream = handle.createWriteStream();
      await new Promise<void>((resolve, reject) => {
        body.pipe(writeStream);
        body.on("error", reject);
        writeStream.on("error", reject);
        writeStream.on("finish", resolve);
      });
    } finally {
      await handle.close().catch(() => undefined);
    }
  }

  resolveKey(key: string): string {
    const resolved = path.resolve(this.dir, key);
    if (!resolved.startsWith(this.dir + path.sep) && resolved !== this.dir) {
      throw new InternalServerErrorException(
        `Rejected storage key escaping upload dir: ${key}`
      );
    }
    return resolved;
  }

  private sign(key: string, expiresAt: number): string {
    return `${expiresAt}.${this.hmac(key, expiresAt)}`;
  }

  private hmac(key: string, expiresAt: number): string {
    return createHmac("sha256", this.secret)
      .update(`${key}:${expiresAt}`)
      .digest("hex");
  }
}
