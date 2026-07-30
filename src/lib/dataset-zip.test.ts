import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { extractDatasetZip, inspectCentralDirectory, type ZipLimits } from './dataset-zip';

const VALID_ZIP =
  'UEsDBBQAAAAIAFQA9FzHVHtqBQAAAAMAAAARAAAAZGF0YXNldC9kb2NzL2EubWRTVkgEAFBLAwQUAAAACABUAPRckAMYgwUAAAADAAAAFAAAAGRhdGFzZXQvaW1hZ2VzL2EucG5nK8hLBwBQSwMEFAAAAAgAVAD0XDUU8tcGAAAABAAAABEAAABkYXRhc2V0Ly5EU19TdG9yZctNLUkEAFBLAQIUABQAAAAIAFQA9FzHVHtqBQAAAAMAAAARAAAAAAAAAAAAAAAAAAAAAABkYXRhc2V0L2RvY3MvYS5tZFBLAQIUABQAAAAIAFQA9FyQAxiDBQAAAAMAAAAUAAAAAAAAAAAAAAAAADQAAABkYXRhc2V0L2ltYWdlcy9hLnBuZ1BLAQIUABQAAAAIAFQA9Fw1FPLXBgAAAAQAAAARAAAAAAAAAAAAAAAAAGsAAABkYXRhc2V0Ly5EU19TdG9yZVBLBQYAAAAAAwADAMAAAACgAAAAAAA=';

function zipBytes(base64 = VALID_ZIP) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function zipFile(base64: string) {
  const bytes = zipBytes(base64);
  return zipFileFromBytes(bytes);
}

function zipFileFromBytes(bytes: Uint8Array) {
  const file = new File([bytes], 'dataset.zip', { type: 'application/zip' });
  Object.defineProperty(file, 'size', { value: bytes.byteLength });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return file;
}

function clearUtf8Flags(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = bytes.byteLength - 22;
  while (view.getUint32(eocd, true) !== 0x06054b50) eocd -= 1;
  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  for (let index = 0; index < entryCount; index += 1) {
    view.setUint16(offset + 8, view.getUint16(offset + 8, true) & ~0x0800, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return bytes;
}

describe('dataset ZIP', () => {
  it('removes a common root and ignores macOS metadata', async () => {
    const file = zipFile(VALID_ZIP);
    const tree = await extractDatasetZip(file);

    expect(tree.map((entry) => entry.path)).toEqual(['docs/a.md', 'images/a.png']);
  });

  it('reads macOS UTF-8 filenames when the ZIP UTF-8 flag is missing', async () => {
    const bytes = clearUtf8Flags(
      zipSync({
        '资料/说明.md': new Uint8Array([104, 101, 108, 108, 111]),
        '资料/images/示例.png': new Uint8Array([1, 2, 3]),
      }),
    );

    const tree = await extractDatasetZip(zipFileFromBytes(bytes));

    expect(tree.map((entry) => entry.path)).toEqual(['说明.md', 'images/示例.png']);
    expect(tree[0].file.name).toBe('说明.md');
    expect(tree[0].file.size).toBe(5);
  });

  it('uses the original extraction key while normalizing entry paths', async () => {
    const tree = await extractDatasetZip(
      zipFileFromBytes(
        zipSync({
          [`root/cafe\u0301.md`]: new Uint8Array([1]),
          'root\\docs\\guide.md': new Uint8Array([2, 3]),
        }),
      ),
    );

    expect(tree.map((entry) => entry.path)).toEqual(['café.md', 'docs/guide.md']);
    expect(tree[1].file.size).toBe(2);
  });

  it('rejects traversal before returning any virtual files', async () => {
    const file = zipFile(
      'UEsDBBQAAAAIAFQA9Fz7OSuCBQAAAAMAAAANAAAALi4vb3V0c2lkZS5tZEtKTAEAUEsBAhQAFAAAAAgAVAD0XPs5K4IFAAAAAwAAAA0AAAAAAAAAAAAAAAAAAAAAAC4uL291dHNpZGUubWRQSwUGAAAAAAEAAQA7AAAAMAAAAAAA',
    );
    await expect(extractDatasetZip(file)).rejects.toThrow(/越界|非法路径/);
  });

  it('rejects encrypted and symbolic-link entries from central-directory metadata', () => {
    const encrypted = zipBytes();
    const encryptedView = new DataView(encrypted.buffer);
    const firstCentral = encrypted.findIndex((_, index) => encryptedView.getUint32(index, true) === 0x02014b50);
    encryptedView.setUint16(firstCentral + 8, 1, true);
    expect(() => inspectCentralDirectory(encrypted)).toThrow(/加密/);

    const symlink = zipBytes();
    const symlinkView = new DataView(symlink.buffer);
    const symlinkCentral = symlink.findIndex((_, index) => symlinkView.getUint32(index, true) === 0x02014b50);
    symlink[symlinkCentral + 5] = 3;
    symlinkView.setUint32(symlinkCentral + 38, 0xa0000000, true);
    expect(() => inspectCentralDirectory(symlink)).toThrow(/符号链接/);
  });

  it('rejects invalid UTF-8 names when the ZIP marks them as UTF-8', () => {
    const bytes = zipBytes();
    const view = new DataView(bytes.buffer);
    const firstCentral = bytes.findIndex((_, index) => view.getUint32(index, true) === 0x02014b50);
    view.setUint16(firstCentral + 8, view.getUint16(firstCentral + 8, true) | 0x0800, true);
    bytes[firstCentral + 46] = 0xff;

    expect(() => inspectCentralDirectory(bytes)).toThrow(/编码/);
  });

  it('enforces entry, depth, expanded-size and compression-ratio limits', () => {
    const base: ZipLimits = {
      maxCompressedBytes: 10_000,
      maxEntries: 5_000,
      maxExpandedBytes: 10_000,
      maxRatio: 100,
      maxDepth: 20,
    };
    expect(() => inspectCentralDirectory(zipBytes(), { ...base, maxEntries: 2 })).toThrow(/数量/);
    expect(() => inspectCentralDirectory(zipBytes(), { ...base, maxDepth: 2 })).toThrow(/层级/);
    expect(() => inspectCentralDirectory(zipBytes(), { ...base, maxExpandedBytes: 2 })).toThrow(/大小/);
    expect(() => inspectCentralDirectory(zipBytes(), { ...base, maxRatio: 0.1 })).toThrow(/压缩比/);
  });
});
