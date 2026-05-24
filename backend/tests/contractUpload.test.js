const path = require('path');
const {
  UPLOAD_DIR,
  isSafeStoredFilename,
  resolveUploadFilePath,
  safeUnlinkUpload,
} = require('../src/services/contractUpload');

describe('contractUpload path safety', () => {
  it('accepts multer-style filenames', () => {
    expect(isSafeStoredFilename('1710000000000-abc123def456.pdf')).toBe(true);
  });

  it('rejects path traversal in stored filenames', () => {
    expect(isSafeStoredFilename('../etc/passwd')).toBe(false);
    expect(isSafeStoredFilename('..\\windows\\system32')).toBe(false);
    expect(isSafeStoredFilename('foo/bar.pdf')).toBe(false);
  });

  it('resolves files only under UPLOAD_DIR', () => {
    const safeName = '1710000000000-deadbeefcafe.pdf';
    const resolved = resolveUploadFilePath(safeName);
    expect(resolved).toBe(path.resolve(UPLOAD_DIR, safeName));
    expect(resolveUploadFilePath('../secret.pdf')).toBeNull();
  });

  it('safeUnlinkUpload ignores paths outside UPLOAD_DIR', () => {
    expect(() => safeUnlinkUpload('/etc/passwd')).not.toThrow();
    expect(() => safeUnlinkUpload(path.join(UPLOAD_DIR, '..', 'outside.txt'))).not.toThrow();
  });
});
