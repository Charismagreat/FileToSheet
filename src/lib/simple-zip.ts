// c:\dev\FileToSheet\src\lib\simple-zip.ts
/**
 * 외부 의존성(npm 패키지) 없이 Node.js Buffer로 표준 ZIP 바이너리를 생성하는 초경량 유틸리티
 */
export interface ZipFileEntry {
  path: string;
  content: string | Buffer;
}

function crc32(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    for (let j = 0; j < 8; j++) {
      const bit = (byte ^ crc) & 1;
      crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
    }
  }
  return (~crc) >>> 0;
}

export function createZipBuffer(entries: ZipFileEntry[]): Buffer {
  const localFileParts: Buffer[] = [];
  const centralDirParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filenameBuf = Buffer.from(entry.path.replace(/\\/g, '/'), 'utf8');
    const contentBuf = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8');
    const fileCrc = crc32(contentBuf);
    const size = contentBuf.length;

    // 로컬 파일 헤더 (30 bytes + filename + data)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);         // Version needed
    localHeader.writeUInt16LE(0, 6);          // Flags
    localHeader.writeUInt16LE(0, 8);          // Compression (0 = store)
    localHeader.writeUInt16LE(0, 10);         // Mod time
    localHeader.writeUInt16LE(0, 12);         // Mod date
    localHeader.writeUInt32LE(fileCrc, 14);    // CRC-32
    localHeader.writeUInt32LE(size, 18);       // Compressed size
    localHeader.writeUInt32LE(size, 22);       // Uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28);         // Extra length

    localFileParts.push(localHeader, filenameBuf, contentBuf);

    // 중앙 디렉토리 헤더 (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4);          // Version made by
    centralHeader.writeUInt16LE(20, 6);          // Version needed
    centralHeader.writeUInt16LE(0, 8);           // Flags
    centralHeader.writeUInt16LE(0, 10);          // Compression
    centralHeader.writeUInt16LE(0, 12);          // Mod time
    centralHeader.writeUInt16LE(0, 14);          // Mod date
    centralHeader.writeUInt32LE(fileCrc, 16);     // CRC-32
    centralHeader.writeUInt32LE(size, 20);        // Compressed size
    centralHeader.writeUInt32LE(size, 24);        // Uncompressed size
    centralHeader.writeUInt16LE(filenameBuf.length, 28); // Filename length
    centralHeader.writeUInt16LE(0, 30);          // Extra field length
    centralHeader.writeUInt16LE(0, 32);          // File comment length
    centralHeader.writeUInt16LE(0, 34);          // Disk number
    centralHeader.writeUInt16LE(0, 36);          // Internal attributes
    centralHeader.writeUInt32LE(0, 38);          // External attributes
    centralHeader.writeUInt32LE(offset, 42);      // Relative offset of local header

    centralDirParts.push(centralHeader, filenameBuf);

    offset += localHeader.length + filenameBuf.length + contentBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralDirParts);
  const centralDirSize = centralDirBuf.length;
  const centralDirOffset = offset;

  // 중앙 디렉토리 종료 레코드 (22 bytes)
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // Signature
  endRecord.writeUInt16LE(0, 4);          // Disk number
  endRecord.writeUInt16LE(0, 6);          // Central dir disk
  endRecord.writeUInt16LE(entries.length, 8);  // Entries this disk
  endRecord.writeUInt16LE(entries.length, 10); // Total entries
  endRecord.writeUInt32LE(centralDirSize, 12); // Central dir size
  endRecord.writeUInt32LE(centralDirOffset, 16); // Central dir offset
  endRecord.writeUInt16LE(0, 20);         // Comment length

  return Buffer.concat([...localFileParts, centralDirBuf, endRecord]);
}
