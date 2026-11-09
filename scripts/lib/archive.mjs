/**
 * Pure Node.js POSIX USTAR Tar + Gzip Archive Manager.
 * Zero external dependencies. Fully compatible with GNU tar, BSD tar, 7-Zip, and macOS tar.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/**
 * Creates a standard 512-byte POSIX USTAR tar header block.
 */
export function createTarHeader(name, size, mode = 0o644, mtime = Math.floor(Date.now() / 1000), type = "0") {
  const buf = Buffer.alloc(512);

  // Normalize path separators to forward slashes
  const normalizedPath = name.replace(/\\/g, "/").replace(/^\/+/, "");
  let nameField = normalizedPath;
  let prefixField = "";

  if (Buffer.byteLength(normalizedPath, "utf8") > 100) {
    const lastSlash = normalizedPath.lastIndexOf("/", 155);
    if (lastSlash !== -1) {
      prefixField = normalizedPath.slice(0, lastSlash);
      nameField = normalizedPath.slice(lastSlash + 1);
    }
  }

  // File name (100 bytes)
  buf.write(nameField, 0, 100, "utf8");

  // File mode (8 bytes, octal)
  buf.write(mode.toString(8).padStart(7, "0") + "\0", 100, 8, "utf8");

  // Owner UID & GID (8 bytes each, octal)
  buf.write("0001000\0", 108, 8, "utf8");
  buf.write("0001000\0", 116, 8, "utf8");

  // File size in bytes (12 bytes, octal)
  buf.write(size.toString(8).padStart(11, "0") + "\0", 124, 12, "utf8");

  // Modification time (12 bytes, octal)
  buf.write(mtime.toString(8).padStart(11, "0") + "\0", 136, 12, "utf8");

  // Checksum field initially 8 spaces (0x20)
  buf.fill(0x20, 148, 156);

  // Type flag (1 byte: '0' for regular file, '5' for directory)
  buf.write(type, 156, 1, "utf8");

  // Magic & Version (6 bytes 'ustar\0', 2 bytes '00')
  buf.write("ustar\0", 257, 6, "utf8");
  buf.write("00", 263, 2, "utf8");

  // User and group names (32 bytes each)
  buf.write("praise", 265, 32, "utf8");
  buf.write("praise", 297, 32, "utf8");

  // Prefix (155 bytes)
  if (prefixField) {
    buf.write(prefixField, 345, 155, "utf8");
  }

  // Calculate unsigned header checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += buf[i];
  }

  // Write checksum: 6 octal digits + null + space
  buf.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "utf8");

  return buf;
}

/**
 * Packs a list of files or directory tree into a .tar.gz archive.
 * 
 * @param {Array<{ path: string, content: Buffer | string, mode?: number, mtime?: number }>} files
 * @param {string} outputPath
 */
export async function createTarGz(files, outputPath) {
  const parts = [];

  for (const file of files) {
    const rawContent = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, "utf8");

    const header = createTarHeader(
      file.path,
      rawContent.length,
      file.mode || 0o644,
      file.mtime || Math.floor(Date.now() / 1000),
      "0"
    );

    parts.push(header);
    parts.push(rawContent);

    // Tar requires each entry's data to be padded to a 512-byte block boundary
    const remainder = rawContent.length % 512;
    if (remainder > 0) {
      parts.push(Buffer.alloc(512 - remainder));
    }
  }

  // End of archive marker: at least two consecutive 512-byte zero blocks (1024 bytes)
  parts.push(Buffer.alloc(1024));

  const uncompressedTar = Buffer.concat(parts);
  const compressedGzip = zlib.gzipSync(uncompressedTar, { level: 9 });

  // Ensure output directory exists
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, compressedGzip);

  return {
    path: outputPath,
    uncompressedBytes: uncompressedTar.length,
    compressedBytes: compressedGzip.length,
    fileCount: files.length,
  };
}

/**
 * Parses an uncompressed tar buffer into discrete entries.
 * 
 * @param {Buffer} tarBuf
 * @returns {Array<{ path: string, size: number, type: 'file' | 'dir', mode: number, data?: Buffer }>}
 */
export function parseTar(tarBuf) {
  const entries = [];
  let offset = 0;

  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512);

    // End of archive is indicated by blocks filled with zero bytes
    let isZeroBlock = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        isZeroBlock = false;
        break;
      }
    }
    if (isZeroBlock) {
      break;
    }

    const nameRaw = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "").trim();
    const prefixRaw = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "").trim();
    const fullPath = prefixRaw ? `${prefixRaw}/${nameRaw}` : nameRaw;

    const sizeStr = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeStr, 8) || 0;

    const modeStr = header.subarray(100, 108).toString("utf8").replace(/\0.*$/, "").trim();
    const mode = parseInt(modeStr, 8) || 0o644;

    const typeFlag = String.fromCharCode(header[156]);

    offset += 512;

    if (typeFlag === "0" || typeFlag === "\0") {
      const data = tarBuf.subarray(offset, offset + size);
      entries.push({
        path: fullPath,
        size,
        mode,
        type: "file",
        data: Buffer.from(data), // Clone slice
      });
      offset += Math.ceil(size / 512) * 512;
    } else if (typeFlag === "5") {
      entries.push({
        path: fullPath,
        size: 0,
        mode,
        type: "dir",
      });
    } else {
      // Skip unknown or extended header blocks
      offset += Math.ceil(size / 512) * 512;
    }
  }

  return entries;
}

/**
 * Lists the entry headers of a .tar.gz archive without writing anything to disk.
 * 
 * @param {string} archivePath
 */
export async function listArchiveEntries(archivePath) {
  const compressed = await fs.promises.readFile(archivePath);
  const uncompressed = zlib.gunzipSync(compressed);
  const entries = parseTar(uncompressed);

  return entries.map((e) => ({
    path: e.path,
    size: e.size,
    type: e.type,
    mode: e.mode,
  }));
}

/**
 * Reads a single specific entry from a .tar.gz archive as a Buffer.
 * 
 * @param {string} archivePath
 * @param {string} targetPath
 * @returns {Promise<Buffer | null>}
 */
export async function readArchiveFile(archivePath, targetPath) {
  const compressed = await fs.promises.readFile(archivePath);
  const uncompressed = zlib.gunzipSync(compressed);
  const entries = parseTar(uncompressed);

  const normalizedTarget = targetPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const match = entries.find((e) => e.path.replace(/\\/g, "/").replace(/^\/+/, "") === normalizedTarget);

  return match && match.data ? match.data : null;
}

/**
 * Extracts all files from a .tar.gz archive into a designated destination directory.
 * Includes path traversal defenses (Zip Slip / Tar Slip mitigation).
 * 
 * @param {string} archivePath
 * @param {string} destinationDir
 */
export async function extractTarGz(archivePath, destinationDir) {
  const compressed = await fs.promises.readFile(archivePath);
  const uncompressed = zlib.gunzipSync(compressed);
  const entries = parseTar(uncompressed);

  const resolvedDest = path.resolve(destinationDir);
  await fs.promises.mkdir(resolvedDest, { recursive: true });

  const extractedFiles = [];

  for (const entry of entries) {
    // Defend against directory traversal attacks (e.g. "../../../etc/passwd")
    const targetPath = path.resolve(resolvedDest, entry.path);
    if (!targetPath.startsWith(resolvedDest + path.sep) && targetPath !== resolvedDest) {
      throw new Error(`Security Exception: Tar entry '${entry.path}' attempts path traversal outside destination directory.`);
    }

    if (entry.type === "dir") {
      await fs.promises.mkdir(targetPath, { recursive: true });
    } else if (entry.type === "file" && entry.data) {
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.writeFile(targetPath, entry.data);
      extractedFiles.push({
        path: entry.path,
        fullPath: targetPath,
        size: entry.size,
      });
    }
  }

  return extractedFiles;
}

