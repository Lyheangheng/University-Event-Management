import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';

@Global()
@Module({
  providers: [LocalStorageProvider, S3StorageProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
