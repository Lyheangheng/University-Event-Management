import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AttendanceSessionType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates or retrieves the active attendance session for an event.
   *
   * Windows:
   * - CHECK_IN: event.startTime <= now < event.startTime + 10 mins
   * - CHECK_OUT: event.endTime - 15 mins <= now < event.endTime
   *
   * Returns null if current server time is outside active attendance windows.
   */
  async getActiveSession(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    const serverNow = new Date();
    const eventStartTime = new Date(event.startTime);
    const eventEndTime = new Date(event.endTime);

    const checkInStart = eventStartTime;
    const checkInEnd = new Date(eventStartTime.getTime() + 10 * 60 * 1000);

    const checkOutStart = new Date(eventEndTime.getTime() - 15 * 60 * 1000);
    const checkOutEnd = eventEndTime;

    let activeType: AttendanceSessionType | null = null;
    let windowStart: Date;
    let windowEnd: Date;

    if (serverNow >= checkInStart && serverNow < checkInEnd) {
      activeType = AttendanceSessionType.CHECK_IN;
      windowStart = checkInStart;
      windowEnd = checkInEnd;
    } else if (serverNow >= checkOutStart && serverNow < checkOutEnd) {
      activeType = AttendanceSessionType.CHECK_OUT;
      windowStart = checkOutStart;
      windowEnd = checkOutEnd;
    } else {
      return null;
    }

    // Check for existing active session for this event & sessionType within window
    const existingSession = await this.prisma.attendanceSession.findFirst({
      where: {
        eventId,
        sessionType: activeType,
        startTime: { lte: serverNow },
        endTime: { gt: serverNow },
      },
    });

    if (existingSession) {
      return existingSession;
    }

    // Generate cryptographically secure random token (64 char hex)
    const token = crypto.randomBytes(32).toString('hex');

    // Create new attendance session record
    const newSession = await this.prisma.attendanceSession.create({
      data: {
        eventId,
        sessionType: activeType,
        token,
        startTime: windowStart,
        endTime: windowEnd,
      },
    });

    return newSession;
  }

  /**
   * Retrieves and validates an attendance session by token.
   * Ensures the session exists and current server time is within [startTime, endTime).
   */
  async getSessionByToken(token: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            targetGroup: true,
            date: true,
            startTime: true,
            endTime: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Attendance session not found or invalid token');
    }

    const serverNow = new Date();

    if (serverNow < session.startTime || serverNow >= session.endTime) {
      throw new BadRequestException('Attendance session has expired or is not yet active');
    }

    return {
      id: session.id,
      eventId: session.eventId,
      sessionType: session.sessionType,
      token: session.token,
      startTime: session.startTime,
      endTime: session.endTime,
      isValid: true,
      event: session.event,
    };
  }
}
