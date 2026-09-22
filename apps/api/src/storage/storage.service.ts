import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { StorageProvider, StorageFile, SaveFileOptions, StoredFileResult } from './storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private provider: StorageProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly localStorageProvider: LocalStorageProvider,
  ) {
    const providerType = this.configService.get<string>('storageProvider') || 'local';

    if (providerType === 'local') {
      this.provider = this.localStorageProvider;
      this.logger.log('StorageService initialized with LocalStorageProvider');
    } else {
      this.logger.warn(
        `Storage provider "${providerType}" not implemented yet; falling back to LocalStorageProvider`,
      );
      this.provider = this.localStorageProvider;
    }
  }

  async saveFile(file: StorageFile, options?: SaveFileOptions): Promise<StoredFileResult> {
    return this.provider.save(file, options);
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
