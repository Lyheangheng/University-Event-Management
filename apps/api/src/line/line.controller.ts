import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { LineService } from './line.service';
import { ConfigService } from '@nestjs/config';
import { LineVerifyTokenDto } from './dto/line-verify-token.dto';
import { LineLinkStudentDto } from './dto/line-link-student.dto';
import * as crypto from 'crypto';
import { Request } from 'express';

@Controller('line')
export class LineController {
  private readonly logger = new Logger(LineController.name);

  constructor(
    private readonly lineService: LineService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /api/line/verify-token
   * Accepts LIFF ID token and authoritatively verifies it against LINE OAuth2 platform.
   */
  @Post('verify-token')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Body() dto: LineVerifyTokenDto) {
    return this.lineService.authenticateOrCheckStatus(dto.idToken);
  }

  /**
   * POST /api/line/link-student
   * Accepts verified LINE ID token and student identifier to safely link accounts.
   */
  @Post('link-student')
  @HttpCode(HttpStatus.OK)
  async linkStudent(@Body() dto: LineLinkStudentDto) {
    return this.lineService.linkStudentAccount(dto.idToken, dto.studentId);
  }


  /**
   * POST /api/line/webhook
   * Receives LINE Official Account webhook events and verifies HMAC-SHA256 signature.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-line-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: any,
  ) {
    const channelSecret =
      this.configService.get<string>('line.channelSecret') ||
      process.env.LINE_CHANNEL_SECRET ||
      'dev_line_channel_secret_placeholder';

    // Verify HMAC-SHA256 signature
    if (channelSecret && channelSecret.trim()) {
      if (!signature) {
        this.logger.warn('Webhook request missing x-line-signature header');
        throw new UnauthorizedException('Missing x-line-signature header');
      }

      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('SHA256', channelSecret.trim())
        .update(rawBody)
        .digest('base64');

      if (signature !== expectedSignature) {
        this.logger.warn('Invalid LINE webhook signature detected');
        throw new UnauthorizedException('Invalid LINE webhook signature');
      }
    }

    const events = body?.events || [];
    this.logger.log(`Received LINE webhook with ${events.length} event(s).`);

    for (const event of events) {
      if (event.type === 'follow') {
        this.logger.log(`LINE User '${event.source?.userId}' followed Official Account.`);
      } else if (event.type === 'message') {
        this.logger.log(`Received message from LINE User '${event.source?.userId}'.`);
      }
    }

    return { success: true, message: 'Webhook processed successfully' };
  }
}
