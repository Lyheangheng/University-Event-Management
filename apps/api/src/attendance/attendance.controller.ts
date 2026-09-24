import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService, UploadedProofFile } from './attendance.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * GET /api/attendance/events/:eventId/session
   * Public endpoint used by projector display to obtain the active attendance session.
   */
  @Get('events/:eventId/session')
  async getActiveSession(@Param('eventId') eventId: string) {
    const session = await this.attendanceService.getActiveSession(eventId);
    if (!session) {
      return null;
    }

    const frontendBaseUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const attendanceUrl = `${frontendBaseUrl}/attendance/session/${session.token}`;

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
    @Headers('authorization') authHeader?: string,
    @Headers('x-dev-student-id') devStudentId?: string,
  ) {
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
    @Headers('authorization') authHeader?: string,
    @Headers('x-dev-student-id') devStudentId?: string,
  ) {
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
    @Body('feedback') feedback?: string,
    @Headers('authorization') authHeader?: string,
    @Headers('x-dev-student-id') devStudentId?: string,
  ) {
    return this.attendanceService.submitAttendance(token, devStudentId, file, feedback, authHeader);
  }

  /**
   * GET /api/attendance/uploads/proofs/:filename
   * Safely serve stored proof photos using storage abstraction.
   */
  @Get('uploads/proofs/:filename')
  async getProofImage(@Param('filename') filename: string, @Res() res: Response) {
    const { filePath, mimetype } = await this.storageService.getFilePath(filename, 'proofs');
    res.setHeader('Content-Type', mimetype);
    return res.sendFile(filePath);
  }
}
