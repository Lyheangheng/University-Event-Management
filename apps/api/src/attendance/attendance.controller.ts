import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Req,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService, UploadedProofFile } from './attendance.service';
import { StorageService } from '../storage/storage.service';
import { AttendanceSessionType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Response, Request } from 'express';

function extractAuthHeaders(headers: Record<string, string>, req?: Request) {
  const authHeader =
    headers?.['authorization'] ||
    headers?.['Authorization'] ||
    (req as any)?.headers?.authorization ||
    (req as any)?.headers?.Authorization;

  const devStudentId =
    headers?.['x-dev-student-id'] ||
    headers?.['X-Dev-Student-Id'] ||
    (req as any)?.headers?.['x-dev-student-id'];

  return { authHeader, devStudentId };
}

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * GET /api/attendance/events/:eventId/projector/:type
   * Public endpoint used by projector display to obtain the persistent attendance session.
   */
  @Get('events/:eventId/projector/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getProjectorSession(
    @Param('eventId') eventId: string,
    @Param('type') typeString: string,
  ) {
    const type = typeString.toUpperCase() === 'CHECK_OUT' 
      ? AttendanceSessionType.CHECK_OUT 
      : AttendanceSessionType.CHECK_IN;
      
    const session = await this.attendanceService.getProjectorSession(eventId, type);
    if (!session) {
      return null;
    }

    const liffId = '2011689671-SKaMIQlb';
    const attendanceUrl = `https://liff.line.me/${liffId}?token=${session.token}`;

    return {
      id: session.id,
      eventId: session.eventId,
      sessionType: session.sessionType,
      token: session.token,
      startsAt: session.startTime,
      endsAt: session.endTime,
      startTime: session.startTime,
      endTime: session.endTime,
      attendanceUrl,
    };
  }

  /**
   * GET /api/attendance/sessions/:token
   * Public endpoint used by student scanner landing page to validate session token.
   */
  @Get('sessions/:token')
  async getSessionByToken(
    @Param('token') token: string,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    const { authHeader, devStudentId } = extractAuthHeaders(headers, req);
    const sessionData = await this.attendanceService.getSessionByToken(token, devStudentId, authHeader);
    const frontendBaseUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const attendanceUrl = `${frontendBaseUrl}/attendance/session/${sessionData.token}`;

    return {
      ...sessionData,
      startsAt: sessionData.startTime,
      endsAt: sessionData.endTime,
      attendanceUrl,
    };
  }

  /**
   * GET /api/attendance/me
   * Retrieve authenticated student profile for auto-filling the attendance form.
   */
  @Get('me')
  async getStudentProfile(
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    const { authHeader, devStudentId } = extractAuthHeaders(headers, req);
    return this.attendanceService.getStudentProfile(devStudentId, authHeader);
  }

  /**
   * POST /api/attendance/sessions/:token/submit
   * Submit student attendance with photo proof and optional recommendation/feedback.
   */
  @Post('sessions/:token/submit')
  @UseInterceptors(FileInterceptor('photo'))
  async submitAttendance(
    @Param('token') token: string,
    @UploadedFile() file: UploadedProofFile,
    @Body('feedback') feedback: string | undefined,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    const { authHeader, devStudentId } = extractAuthHeaders(headers, req);
    return this.attendanceService.submitAttendance(token, devStudentId, file, feedback, authHeader);
  }

  /**
   * GET /api/attendance/uploads/proofs/:filename
   * Stream stored proof photo securely for authenticated admin users.
   */
  @Get('uploads/proofs/:filename')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getProofImage(@Param('filename') filename: string, @Res() res: Response) {
    const { stream, mimetype, contentLength } = await this.storageService.getFileStream(
      filename,
      'proofs',
    );

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength.toString());
    }

    return stream.pipe(res);
  }

  /**
   * GET /api/attendance/uploads/banners/:filename
   * Stream stored public event banner image.
   */
  @Get('uploads/banners/:filename')
  async getBannerImage(@Param('filename') filename: string, @Res() res: Response) {
    const { stream, mimetype, contentLength } = await this.storageService.getFileStream(
      filename,
      'banners',
    );

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength.toString());
    }

    return stream.pipe(res);
  }
}

