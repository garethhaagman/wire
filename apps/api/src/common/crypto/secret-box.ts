import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class SecretBoxError extends Error {}

/**
 * AES-256-GCM for secrets Wire must be able to read back (webhook signing secrets,
 * unlike passwords they can't be hashed). The key is derived from APP_SECRET
 * (via resolveAppSecret) with HKDF under a purpose label, so a database dump
 * alone doesn't reveal them. Format: `v1.<iv>.<tag>.<ciphertext>`, base64url parts.
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(rootSecret: string, purpose: string) {
    this.key = Buffer.from(
      hkdfSync("sha256", rootSecret, "wire-secret-box", purpose, 32)
    );
  }

  seal(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return [VERSION, iv, cipher.getAuthTag(), ciphertext]
      .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
      .join(".");
  }

  open(sealed: string): string {
    const [version, iv, tag, ciphertext] = sealed.split(".");
    if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
      throw new SecretBoxError("Malformed sealed secret");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(iv, "base64url"),
      {
        authTagLength: TAG_BYTES,
      }
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
