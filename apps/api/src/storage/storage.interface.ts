import { Readable } from 'stream';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export interface StorageFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface SaveFileOptions {
  subfolder?: string;
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
}

export interface StoredFileResult {
  filename: string;
  url: string;
  path: string;
  mimetype: string;
  size: number;
}

export interface FileStreamResult {
  stream: Readable;
  mimetype: string;
  contentLength?: number;
}

export interface StorageProvider {
  save(file: StorageFile, options?: SaveFileOptions): Promise<StoredFileResult>;
  getFileStream(filenameOrUrl: string, subfolder?: string): Promise<FileStreamResult>;
  getFilePath(filename: string, subfolder?: string): Promise<{ filePath: string; mimetype: string }>;
  delete(filename: string, subfolder?: string): Promise<boolean>;
  getPublicUrl(filename: string, subfolder?: string): string;
}

/**
 * Safely extracts and validates a filename or object key from raw input,
 * rejecting path traversal attempts, encoded tricks, and invalid patterns.
 */
export function extractAndSanitizeFilename(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new BadRequestException('Invalid filename or path requested');
  }

  let cleaned = rawInput.trim();

  // If full URL, parse pathname
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const parsedUrl = new URL(cleaned);
      cleaned = parsedUrl.pathname;
    } catch {
      throw new BadRequestException('Invalid URL format in object key');
    }
  }

  // Reject raw or encoded path traversal patterns
  if (
    cleaned.includes('..') ||
    cleaned.includes('\\') ||
    cleaned.includes('%') ||
    cleaned.includes('\0')
  ) {
    throw new BadRequestException('Invalid filename or path traversal attempt rejected');
  }

  // Extract base filename
  const filename = path.basename(cleaned);

  // Validate filename against safe characters (letters, numbers, underscores, dashes, dots)
  if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    throw new BadRequestException('Invalid filename format');
  }

  return filename;
}


