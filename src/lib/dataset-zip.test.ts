import { describe, expect, it } from 'vitest';
import { extractDatasetZip, inspectCentralDirectory, type ZipLimits } from './dataset-zip';

const VALID_ZIP =
  'UEsDBBQAAAAIAFQA9FzHVHtqBQAAAAMAAAARAAAAZGF0YXNldC9kb2NzL2EubWRTVkgEAFBLAwQUAAAACABUAPRckAMYgwUAAAADAAAAFAAAAGRhdGFzZXQvaW1hZ2VzL2EucG5nK8hLBwBQSwMEFAAAAAgAVAD0XDUU8tcGAAAABAAAABEAAABkYXRhc2V0Ly5EU19TdG9yZctNLUkEAFBLAQIUABQAAAAIAFQA9FzHVHtqBQAAAAMAAAARAAAAAAAAAAAAAAAAAAAAAABkYXRhc2V0L2RvY3MvYS5tZFBLAQIUABQAAAAIAFQA9FyQAxiDBQAAAAMAAAAUAAAAAAAAAAAAAAAAADQAAABkYXRhc2V0L2ltYWdlcy9hLnBuZ1BLAQIUABQAAAAIAFQA9Fw1FPLXBgAAAAQAAAARAAAAAAAAAAAAAAAAAGsAAABkYXRhc2V0Ly5EU19TdG9yZVBLBQYAAAAAAwADAMAAAACgAAAAAAA=';

function zipBytes(base64 = VALID_ZIP) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function zipFile(base64: string) {
  const bytes = zipBytes(base64);
  const file = new File([bytes], 'dataset.zip', { type: 'application/zip' });
  Object.defineProperty(file, 'size', { value: bytes.byteLength });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return file;
}

describe('dataset ZIP', () => {
  it('removes a common root and ignores macOS metadata', async () => {
    const file = zipFile(VALID_ZIP);
    const tree = await extractDatasetZip(file);

    expect(tree.map((entry) => entry.path)).toEqual(['docs/a.md', 'images/a.png']);
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
