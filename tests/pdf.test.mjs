import assert from 'node:assert/strict';
import { test } from 'node:test';
const { validPdfPath, validatePdf } = await import('../src/lib/pdf.ts');
test('PDF path must belong to current user and be a single UUID PDF', () => {
  assert.equal(typeof validPdfPath, 'function');
  assert.equal(validPdfPath('alice/12345678-1234-4234-8234-123456789abc.pdf', 'alice'), true);
  for (const path of ['bob/12345678-1234-4234-8234-123456789abc.pdf', 'alice/../bob.pdf', 'alice/a/b.pdf', '', null]) assert.equal(validPdfPath(path, 'alice'), false);
});
test('PDF validation checks size and real file signature', () => {
  assert.equal(typeof validatePdf, 'function');
  assert.doesNotThrow(() => validatePdf(Buffer.from('%PDF-1.7\n')));
  assert.throws(() => validatePdf(Buffer.from('not a PDF')));
  assert.throws(() => validatePdf(Buffer.alloc(15 * 1024 * 1024 + 1)));
});
test('exactly 15MB is accepted and empty files are rejected', () => {
  const bytes = Buffer.alloc(15 * 1024 * 1024);
  bytes.write('%PDF-1.7');
  assert.doesNotThrow(() => validatePdf(bytes));
  assert.throws(() => validatePdf(Buffer.alloc(0)));
});
test('path validation rejects URL, encoded traversal and suffix tricks', () => {
  for (const path of [
    'https://example.com/alice/12345678-1234-4234-8234-123456789abc.pdf',
    'alice/%2e%2e/bob.pdf',
    'alice/12345678-1234-4234-8234-123456789abc.pdf?x=1',
    'alice/12345678-1234-4234-8234-123456789abc.pdf/extra',
  ]) assert.equal(validPdfPath(path, 'alice'), false);
});
