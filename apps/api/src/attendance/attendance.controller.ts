import { Controller, Get, Param } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ConfigService } from '@nestjs/config';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly configService: ConfigService,
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
  async getSessionByToken(@Param('token') token: string) {
    const sessionData = await this.attendanceService.getSessionByToken(token);
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
}
