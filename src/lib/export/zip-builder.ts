import zlib from "zlib";

const makeCrcTable = () => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
};

const crcTable = makeCrcTable();

export function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(d: Date): { time: number; date: number } {
  const time =
    ((d.getHours() & 0x1f) << 11) |
    ((d.getMinutes() & 0x3f) << 5) |
    (Math.floor(d.getSeconds() / 2) & 0x1f);
  const date =
    (((d.getFullYear() - 1980) & 0x7f) << 9) |
    (((d.getMonth() + 1) & 0x0f) << 5) |
    (d.getDate() & 0x1f);
  return { time, date };
}

export type ZipFileEntry = {
  name: string;
  data: Buffer;
  date?: Date;
};

/**
 * Pure TypeScript ZIP archive generator conforming to the PKZIP specification.
 * Zero external dependencies. Fully compatible with Windows Explorer, macOS, and Linux unzip.
 */
export class SimpleZip {
  private entries: ZipFileEntry[] = [];

  addFile(name: string, content: Buffer | string, date: Date = new Date()) {
    const buf = typeof content === "string" ? Buffer.from(content, "utf8") : content;
    const cleanName = name.replace(/\\/g, "/").replace(/^\/+/, "");
    this.entries.push({ name: cleanName, data: buf, date });
  }

  generateBuffer(): Buffer {
    const localHeadersAndData: Buffer[] = [];
    const centralDirectoryHeaders: Buffer[] = [];
    let currentOffset = 0;

    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.name, "utf8");
      const uncompressedData = entry.data;
      const uncompressedSize = uncompressedData.length;
      const fileCrc = crc32(uncompressedData);
      const { time, date } = toDosDateTime(entry.date || new Date());

      // Try DEFLATE compression for text files; use STORE (method 0) for already-compressed media or if deflate is larger
      let compressionMethod = 0; // STORE
      let compressedData = uncompressedData;

      const isAlreadyCompressed = /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|zip|gz)$/i.test(
        entry.name
      );

      if (!isAlreadyCompressed && uncompressedSize > 64) {
        try {
          const deflated = zlib.deflateRawSync(uncompressedData, { level: 6 });
          if (deflated.length < uncompressedSize) {
            compressionMethod = 8; // DEFLATE
            compressedData = deflated;
          }
        } catch {
          // Fall back to STORE
        }
      }

      const compressedSize = compressedData.length;

      // 1. Local File Header (30 bytes + nameBuf.length)
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
      localHeader.writeUInt16LE(20, 4); // Version needed (2.0)
      localHeader.writeUInt16LE(0x0800, 6); // Flags: UTF-8 filename
      localHeader.writeUInt16LE(compressionMethod, 8); // Compression method
      localHeader.writeUInt16LE(time, 10); // Last mod time
      localHeader.writeUInt16LE(date, 12); // Last mod date
      localHeader.writeUInt32LE(fileCrc, 14); // CRC-32
      localHeader.writeUInt32LE(compressedSize, 18); // Compressed size
      localHeader.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
      localHeader.writeUInt16LE(nameBuf.length, 26); // File name length
      localHeader.writeUInt16LE(0, 28); // Extra field length

      const localEntry = Buffer.concat([localHeader, nameBuf, compressedData]);
      localHeadersAndData.push(localEntry);

      // 2. Central Directory Header (46 bytes + nameBuf.length)
      const cdHeader = Buffer.alloc(46);
      cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
      cdHeader.writeUInt16LE(20, 4); // Version made by
      cdHeader.writeUInt16LE(20, 6); // Version needed
      cdHeader.writeUInt16LE(0x0800, 8); // Flags: UTF-8 filename
      cdHeader.writeUInt16LE(compressionMethod, 10); // Compression method
      cdHeader.writeUInt16LE(time, 12); // Last mod time
      cdHeader.writeUInt16LE(date, 14); // Last mod date
      cdHeader.writeUInt32LE(fileCrc, 16); // CRC-32
      cdHeader.writeUInt32LE(compressedSize, 20); // Compressed size
      cdHeader.writeUInt32LE(uncompressedSize, 24); // Uncompressed size
      cdHeader.writeUInt16LE(nameBuf.length, 28); // File name length
      cdHeader.writeUInt16LE(0, 30); // Extra field length
      cdHeader.writeUInt16LE(0, 32); // File comment length
      cdHeader.writeUInt16LE(0, 34); // Disk number start
      cdHeader.writeUInt16LE(0, 36); // Internal file attributes
      cdHeader.writeUInt32LE(0, 38); // External file attributes
      cdHeader.writeUInt32LE(currentOffset, 42); // Relative offset of local header

      const cdEntry = Buffer.concat([cdHeader, nameBuf]);
      centralDirectoryHeaders.push(cdEntry);

      currentOffset += localEntry.length;
    }

    const allLocalData = Buffer.concat(localHeadersAndData);
    const allCdData = Buffer.concat(centralDirectoryHeaders);

    // 3. End of Central Directory Record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
    eocd.writeUInt16LE(0, 4); // Disk number
    eocd.writeUInt16LE(0, 6); // Disk where CD starts
    eocd.writeUInt16LE(this.entries.length, 8); // Number of CD records on disk
    eocd.writeUInt16LE(this.entries.length, 10); // Total number of CD records
    eocd.writeUInt32LE(allCdData.length, 12); // Size of CD
    eocd.writeUInt32LE(allLocalData.length, 16); // Offset of start of CD
    eocd.writeUInt16LE(0, 20); // Comment length

    return Buffer.concat([allLocalData, allCdData, eocd]);
  }
}

