import path from "path";
import crypto from "crypto";
import { MediaType } from "@/types/media";

// Default size limits (can be customized via environment variables)
export const MAX_IMAGE_SIZE_BYTES =
  Number(process.env.PRAISE_MAX_IMAGE_SIZE_BYTES) || 10 * 1024 * 1024; // 10 MB

export const MAX_VIDEO_SIZE_BYTES =
  Number(process.env.PRAISE_MAX_VIDEO_SIZE_BYTES) || 100 * 1024 * 1024; // 100 MB

export type DetectedFileType = {
  mediaType: MediaType;
  mimeType: string;
  extension: string;
};

/**
 * Validates actual binary file signatures (magic bytes) to prevent
 * executable masquerading, polyglots, and script uploads.
 */
export function detectFileSignature(buffer: Buffer): DetectedFileType | null {
  if (!buffer || buffer.length < 8) {
    return null;
  }

  // 1. Explicitly check and block known executable signatures
  // Windows PE (.exe, .dll, .scr) -> MZ
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return null;
  }
  // Linux ELF binary -> \x7fELF
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return null;
  }
  // Script execution header -> #!
  if (buffer[0] === 0x23 && buffer[1] === 0x21) {
    return null;
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      mediaType: "IMAGE",
      mimeType: "image/jpeg",
      extension: ".jpg",
    };
  }

  // 3. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      mediaType: "IMAGE",
      mimeType: "image/png",
      extension: ".png",
    };
  }

  // 4. GIF: GIF87a or GIF89a (47 49 46 38)
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return {
      mediaType: "IMAGE",
      mimeType: "image/gif",
      extension: ".gif",
    };
  }

  // 5. WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return {
      mediaType: "IMAGE",
      mimeType: "image/webp",
      extension: ".webp",
    };
  }

  // 6. WebM Video: EBML header 1A 45 DF A3
  if (
    buffer.length >= 16 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return {
      mediaType: "VIDEO",
      mimeType: "video/webm",
      extension: ".webm",
    };
  }

  // 7. MP4 / ISO Base Media / QuickTime: 'ftyp' at offset 4
  if (
    buffer.length >= 16 &&
    buffer[4] === 0x66 && // 'f'
    buffer[5] === 0x74 && // 't'
    buffer[6] === 0x79 && // 'y'
    buffer[7] === 0x70    // 'p'
  ) {
    const brand = buffer.toString("utf8", 8, 12).toLowerCase();
    if (brand.startsWith("qt")) {
      return {
        mediaType: "VIDEO",
        mimeType: "video/quicktime",
        extension: ".mov",
      };
    }
    return {
      mediaType: "VIDEO",
      mimeType: "video/mp4",
      extension: ".mp4",
    };
  }

  // Unknown or untrusted binary signature
  return null;
}

/**
 * Validates file buffer against size and type constraints.
 */
export function validateUploadBuffer(
  buffer: Buffer,
  allowedTypes: MediaType[] = ["IMAGE", "VIDEO"],
): { valid: boolean; error?: string; detected?: DetectedFileType } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "The submitted file is empty." };
  }

  const detected = detectFileSignature(buffer);
  if (!detected) {
    return {
      valid: false,
      error:
        "Invalid file format. Uploaded file does not match any accepted image or video signature.",
    };
  }

  if (!allowedTypes.includes(detected.mediaType)) {
    return {
      valid: false,
      error: `Files of type ${detected.mediaType.toLowerCase()} are not permitted for this upload.`,
    };
  }

  // Size limit validation
  const maxBytes =
    detected.mediaType === "IMAGE" ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
  const maxMb = Math.round(maxBytes / (1024 * 1024));

  if (buffer.length > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds the maximum allowed limit of ${maxMb} MB for ${detected.mediaType.toLowerCase()}s.`,
    };
  }

  return { valid: true, detected };
}

/**
 * Generates an unguessable safe filename using UUIDv4 and validated extension.
 * Eliminates path traversal attacks by discarding client-supplied filenames.
 */
export function generateSafeFilename(extension: string): string {
  const cleanExt = extension.startsWith(".") ? extension : `.${extension}`;
  const randomId = crypto.randomUUID().replace(/-/g, "");
  return `${randomId}${cleanExt}`;
}

/**
 * Validates and resolves a path strictly within the specified base directory,
 * preventing directory traversal attacks.
 */
export function assertSafePath(baseDir: string, ...segments: string[]): string {
  const normalizedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(normalizedBase, ...segments);

  // Must strictly reside inside normalizedBase
  if (
    !resolvedTarget.startsWith(normalizedBase + path.sep) &&
    resolvedTarget !== normalizedBase
  ) {
    throw new Error("Security exception: Illegal path traversal detected.");
  }

  return resolvedTarget;
}

