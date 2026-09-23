import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  StorageProvider,
  StorageFile,
  SaveFileOptions,
  StoredFileResult,
} from './storage.interface';
import * as path from 'path';
import * as crypto from 'crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly bucketName: string;
  private readonly region: string;
  private readonly publicBaseUrl: string;
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('S3_BUCKET') ||
      'university-event-proofs';

    this.region =
      this.configService.get<string>('S3_REGION') ||
      'ap-southeast-1';

    const endpoint = this.configService.get<string>('S3_ENDPOINT');

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId:
          this.configService.get<string>('S3_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('S3_SECRET_ACCESS_KEY') || '',
      },
    });

    // S3_ENDPOINT should be the account-level endpoint:
    // https://<account-id>.r2.cloudflarestorage.com
    //
    // The bucket name is appended here because R2 public/object URLs
    // are constructed as endpoint + bucket + object key.
    if (endpoint) {
      this.publicBaseUrl = `${endpoint.replace(/\/$/, '')}/${this.bucketName}`;
    } else {
      this.publicBaseUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;
    }
  }

  async save(
    file: StorageFile,
    options?: SaveFileOptions,
  ): Promise<StoredFileResult> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Photo proof file is required');
    }

    const allowedMimeTypes =
      options?.allowedMimeTypes || ALLOWED_MIME_TYPES;

    const maxSizeBytes =
      options?.maxSizeBytes || DEFAULT_MAX_SIZE;

    const mimetype = file.mimetype?.toLowerCase();

    if (!mimetype || !allowedMimeTypes.includes(mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype || 'unknown'}". Only JPEG, PNG, and WebP image files are allowed.`,
      );
    }

    if (
      file.size > maxSizeBytes ||
      file.buffer.length > maxSizeBytes
    ) {
      throw new BadRequestException(
        'File size exceeds the 5MB maximum limit',
      );
    }

    const subfolder = options?.subfolder || 'proofs';

    const ext =
      MIME_TO_EXT[mimetype] ||
      path.extname(file.originalname || '').toLowerCase() ||
      '.jpg';

    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
      ? ext
      : '.jpg';

    const safeFilename = `${Date.now()}-${crypto
      .randomBytes(16)
      .toString('hex')}${safeExt}`;

    const objectKey = `${subfolder}/${safeFilename}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: mimetype,
      }),
    );

    const publicUrl = `${this.publicBaseUrl}/${objectKey}`;

    this.logger.log(
      `[S3StorageProvider] Uploaded object '${objectKey}' to bucket '${this.bucketName}' (${file.buffer.length} bytes).`,
    );

    return {
      filename: safeFilename,
      url: publicUrl,
      path: objectKey,
      mimetype,
      size: file.buffer.length,
    };
  }

  async getFilePath(
    filename: string,
    subfolder = 'proofs',
  ): Promise<{ filePath: string; mimetype: string }> {
    if (!filename || typeof filename !== 'string') {
      throw new BadRequestException('Invalid filename requested');
    }

    const safeFilename = path.basename(filename);

    if (
      safeFilename !== filename ||
      filename.includes('/') ||
      filename.includes('\\') ||
      filename.includes('..') ||
      filename.includes('%')
    ) {
      throw new BadRequestException(
        'Invalid filename or path traversal attempt rejected',
      );
    }

    const objectKey = `${subfolder}/${safeFilename}`;

    const ext = path.extname(safeFilename).toLowerCase();

    const mimetype =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';

    return {
      filePath: objectKey,
      mimetype,
    };
  }

  async delete(
    filename: string,
    subfolder = 'proofs',
  ): Promise<boolean> {
    try {
      const { filePath: objectKey } =
        await this.getFilePath(filename, subfolder);

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
        }),
      );

      this.logger.log(
        `[S3StorageProvider] Deleted object '${objectKey}' from bucket '${this.bucketName}'.`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `[S3StorageProvider] Failed to delete object '${filename}'.`,
        error,
      );

      return false;
    }
  }

  getPublicUrl(
    filename: string,
    subfolder = 'proofs',
  ): string {
    const safeFilename = path.basename(filename);

    return `${this.publicBaseUrl}/${subfolder}/${safeFilename}`;
  }
}