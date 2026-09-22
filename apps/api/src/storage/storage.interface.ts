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

export interface StorageProvider {
  save(file: StorageFile, options?: SaveFileOptions): Promise<StoredFileResult>;
  getFilePath(filename: string, subfolder?: string): Promise<{ filePath: string; mimetype: string }>;
  delete(filename: string, subfolder?: string): Promise<boolean>;
  getPublicUrl(filename: string, subfolder?: string): string;
}
