const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { LocalStorageProvider } = require('./apps/api/dist/storage/local-storage.provider');
const { StorageService } = require('./apps/api/dist/storage/storage.service');

async function runStorageUnitTests() {
  console.log('====================================================');
  console.log('   PHASE 12: STORAGE ABSTRACTION UNIT & ISOLATED TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const localStorageProvider = new LocalStorageProvider();
  const mockConfigService = {
    get: (key) => (key === 'storageProvider' ? 'local' : null),
  };
  const storageService = new StorageService(mockConfigService, localStorageProvider);

  // Test A: Valid JPEG file save
  try {
    const jpegBuffer = Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x48\x00\x48\x00\x00\xFF\xDB');
    const jpegFile = {
      originalname: '../../malicious_path/my_photo.jpg',
      buffer: jpegBuffer,
      mimetype: 'image/jpeg',
      size: jpegBuffer.length,
    };
    const res = await storageService.saveFile(jpegFile, { subfolder: 'proofs' });
    assert(
      res.url.startsWith('/api/attendance/uploads/proofs/') && res.filename.endsWith('.jpg'),
      'A. Valid JPEG file saved safely with .jpg extension',
    );

    // Test F: Server-generated filename replaces client-supplied filename
    assert(
      !res.filename.includes('my_photo') && !res.filename.includes('malicious'),
      'F. Server-generated filename completely strips original filename and path traversal attempts',
    );

    // Test G: Safe file path retrieval & Content-Type detection
    const fileInfo = await storageService.getFilePath(res.filename, 'proofs');
    assert(
      fs.existsSync(fileInfo.filePath) && fileInfo.mimetype === 'image/jpeg',
      'G. Saved JPEG file path resolved with correct Content-Type (image/jpeg)',
    );

    // Clean up created test file
    await storageService.deleteFile(res.filename, 'proofs');
  } catch (err) {
    assert(false, `Test A/F/G failed: ${err.message}`);
  }

  // Test B: Valid PNG file save
  try {
    const pngBuffer = Buffer.from('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89');
    const pngFile = {
      originalname: 'sample.png',
      buffer: pngBuffer,
      mimetype: 'image/png',
      size: pngBuffer.length,
    };
    const res = await storageService.saveFile(pngFile, { subfolder: 'proofs' });
    assert(
      res.url.startsWith('/api/attendance/uploads/proofs/') && res.filename.endsWith('.png'),
      'B. Valid PNG file saved safely with .png extension',
    );
    await storageService.deleteFile(res.filename, 'proofs');
  } catch (err) {
    assert(false, `Test B failed: ${err.message}`);
  }

  // Test C: Valid WebP file save
  try {
    const webpBuffer = Buffer.from('RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00\x30\x01\x00\x9d\x01\x2a\x01\x00\x01\x00\x02');
    const webpFile = {
      originalname: 'photo.webp',
      buffer: webpBuffer,
      mimetype: 'image/webp',
      size: webpBuffer.length,
    };
    const res = await storageService.saveFile(webpFile, { subfolder: 'proofs' });
    assert(
      res.url.startsWith('/api/attendance/uploads/proofs/') && res.filename.endsWith('.webp'),
      'C. Valid WebP file saved safely with .webp extension',
    );
    await storageService.deleteFile(res.filename, 'proofs');
  } catch (err) {
    assert(false, `Test C failed: ${err.message}`);
  }

  // Test D: File larger than 5 MB is rejected
  try {
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 100);
    const oversizedFile = {
      originalname: 'large.jpg',
      buffer: oversizedBuffer,
      mimetype: 'image/jpeg',
      size: oversizedBuffer.length,
    };
    await storageService.saveFile(oversizedFile, { subfolder: 'proofs' });
    assert(false, 'D. Oversized file should have been rejected');
  } catch (err) {
    assert(
      err.message.includes('5MB maximum limit') || err.message.includes('exceeds'),
      'D. Oversized file (> 5 MB) safely rejected with error message',
    );
  }

  // Test E: Unsupported MIME type is rejected
  try {
    const txtBuffer = Buffer.from('Plain text file payload');
    const txtFile = {
      originalname: 'script.sh',
      buffer: txtBuffer,
      mimetype: 'text/plain',
      size: txtBuffer.length,
    };
    await storageService.saveFile(txtFile, { subfolder: 'proofs' });
    assert(false, 'E. Unsupported MIME type should have been rejected');
  } catch (err) {
    assert(
      err.message.includes('Invalid file type'),
      'E. Unsupported MIME type (text/plain) safely rejected with error message',
    );
  }

  // Test H: Path traversal attempt is rejected on retrieval
  try {
    await storageService.getFilePath('../../package.json', 'proofs');
    assert(false, 'H. Path traversal attempt should have been rejected');
  } catch (err) {
    assert(
      err.message.includes('Path traversal') || err.message.includes('Invalid filename'),
      'H. Path traversal attempt (../../package.json) safely rejected with security exception',
    );
  }

  // Test I: Missing proof returns 404/NotFoundException
  try {
    await storageService.getFilePath('non_existent_file_99999.jpg', 'proofs');
    assert(false, 'I. Non-existent file should have thrown NotFoundException');
  } catch (err) {
    assert(
      err.message.includes('not found') || err.name === 'NotFoundException',
      'I. Missing proof photo correctly throws NotFoundException',
    );
  }

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStorageUnitTests();
