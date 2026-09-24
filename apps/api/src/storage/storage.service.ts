import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import {
  StorageProvider,
  StorageFile,
  SaveFileOptions,
  StoredFileResult,
  FileStreamResult,
} from './storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private provider: StorageProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly localStorageProvider: LocalStorageProvider,
    private readonly s3StorageProvider: S3StorageProvider,
  ) {
    const providerType = (
      this.configService.get<string>('storageProvider') ||
      this.configService.get<string>('STORAGE_PROVIDER') ||
      'local'
    ).toLowerCase();

    if (providerType === 's3' || providerType === 'cloud' || providerType === 'aws') {
      this.provider = this.s3StorageProvider;
      this.logger.log('StorageService initialized with S3StorageProvider (Production Object Storage)');
    } else {
      this.provider = this.localStorageProvider;
      this.logger.log('StorageService initialized with LocalStorageProvider (Development Local Filesystem)');
    }
  }

  async saveFile(file: StorageFile, options?: SaveFileOptions): Promise<StoredFileResult> {
    return this.provider.save(file, options);
  }

  async getFileStream(filenameOrUrl: string, subfolder?: string): Promise<FileStreamResult> {
    return this.provider.getFileStream(filenameOrUrl, subfolder);
  }

  async getFilePath(filename: string, subfolder?: string): Promise<{ filePath: string; mimetype: string }> {
    return this.provider.getFilePath(filename, subfolder);
  }

  async deleteFile(filename: string, subfolder?: string): Promise<boolean> {
    return this.provider.delete(filename, subfolder);
  }

  getPublicUrl(filename: string, subfolder?: string): string {
    return this.provider.getPublicUrl(filename, subfolder);
  }
}

