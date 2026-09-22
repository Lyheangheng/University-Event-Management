import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageProvider, StorageFile, SaveFileOptions, StoredFileResult } from './storage.interface';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly baseUploadDir: string;

  constructor() {
    this.baseUploadDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Save uploaded file safely to local disk
   */
  async save(file: StorageFile, options?: SaveFileOptions): Promise<StoredFileResult> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Photo proof file is required');
    }

    const allowedMimeTypes = options?.allowedMimeTypes || ALLOWED_MIME_TYPES;
    const maxSizeBytes = options?.maxSizeBytes || DEFAULT_MAX_SIZE;

    // Validate MIME type
    if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype || 'unknown'}". Only JPEG, PNG, and WebP image files are allowed.`,
      );
    }

    // Validate file size
    if (file.size > maxSizeBytes || file.buffer.length > maxSizeBytes) {
      throw new BadRequestException('File size exceeds the 5MB maximum limit');
    }

    const subfolder = options?.subfolder || 'proofs';
    const uploadDir = path.join(this.baseUploadDir, subfolder);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate clean, secure random filename
    const ext = MIME_TO_EXT[file.mimetype.toLowerCase()] || path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const safeFilename = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${safeExt}`;
    const filePath = path.join(uploadDir, safeFilename);

    await fs.promises.writeFile(filePath, file.buffer);

    const publicUrl = `/api/attendance/uploads/${subfolder}/${safeFilename}`;

    return {
      filename: safeFilename,
      url: publicUrl,
      path: filePath,
      mimetype: file.mimetype,
      size: file.buffer.length,
    };
  }

  /**
   * Resolve safe file path and verified content type with strict path traversal prevention
   */
  async getFilePath(filename: string, subfolder = 'proofs'): Promise<{ filePath: string; mimetype: string }> {
    if (!filename || typeof filename !== 'string') {
      throw new BadRequestException('Invalid filename requested');
    }

    // Sanitize filename against path traversal
    const safeFilename = path.basename(filename);

    // Reject if raw filename contained directory separators or path traversal characters
    if (
      safeFilename !== filename ||
      filename.includes('/') ||
      filename.includes('\\') ||
      filename.includes('..') ||
      filename.includes('%')
    ) {
      throw new BadRequestException('Invalid filename or path traversal attempt rejected');
    }

    const targetDir = path.resolve(this.baseUploadDir, subfolder);
    const filePath = path.resolve(targetDir, safeFilename);

    // Verify target path is strictly contained inside allowed target directory
    if (!filePath.startsWith(targetDir)) {
      throw new BadRequestException('Access denied: File outside permitted directory');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Proof image not found');
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimetype = EXT_TO_MIME[ext] || 'image/jpeg';

    return { filePath, mimetype };
  }

  async delete(filename: string, subfolder = 'proofs'): Promise<boolean> {
    try {
      const { filePath } = await this.getFilePath(filename, subfolder);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
    } catch {
      // Ignore if file doesn't exist
    }
    return false;
  }

  getPublicUrl(filename: string, subfolder = 'proofs'): string {
    const safeFilename = path.basename(filename);
    return `/api/attendance/uploads/${subfolder}/${safeFilename}`;
  }
}
