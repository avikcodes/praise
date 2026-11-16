import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getVaultKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "praise-credential-vault-fallback-secret-key-32";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts an object of sensitive credentials using AES-256-GCM.
 * Output format: "iv.authTag.ciphertext" (Base64URL encoded)
 */
export function encryptCredentials(data: Record<string, any>): string {
  const plaintext = JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getVaultKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

/**
 * Decrypts AES-256-GCM encrypted credentials string back into an object.
 */
export function decryptCredentials<T = Record<string, any>>(encryptedString: string): T {
  if (!encryptedString || !encryptedString.includes(".")) {
    throw new Error("Invalid encrypted credential format.");
  }

  const [ivB64, authTagB64, cipherB64] = encryptedString.split(".");
  if (!ivB64 || !authTagB64 || !cipherB64) {
    throw new Error("Malformed credential payload.");
  }

  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(authTagB64, "base64url");
  const ciphertext = Buffer.from(cipherB64, "base64url");
  const key = getVaultKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}

/**
 * Masks a secret string to safely display preview in UI without leaking raw tokens.
 * Example: "AIzaSyDa..." -> "AIzaSy...****...4B9Z"
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return "";
  const str = String(secret).trim();
  if (str.length <= 6) return "••••••";
  if (str.length <= 12) return `${str.slice(0, 2)}••••${str.slice(-2)}`;
  return `${str.slice(0, 6)}••••${str.slice(-4)}`;
}

/**
 * Returns a sanitized copy of a credentials dictionary with sensitive values masked.
 */
export function maskCredentials(credentials: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(credentials)) {
    if (typeof v === "string") {
      result[k] = maskSecret(v);
    } else {
      result[k] = "••••";
    }
  }
  return result;
}
