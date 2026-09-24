import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { AttendanceSessionType, AttendanceStatus, Student } from '@prisma/client';
import * as crypto from 'crypto';

export interface UploadedProofFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Generates or retrieves the active attendance session for an event.
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

    const token = crypto.randomBytes(32).toString('hex');

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
   * Retrieves and validates an attendance session by token, including existing attendance status for the student.
   */
  async getSessionByToken(token: string, studentIdOrParam?: string, authHeader?: string) {
    let session = null;
    try {
      session = await this.prisma.attendanceSession.findUnique({
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
    } catch (err: any) {
      this.logger.warn(`Database session lookup failed for token '${token}': ${err.message}`);
      throw new NotFoundException('Attendance session not found or invalid token');
    }

    if (!session) {
      throw new NotFoundException('Attendance session not found or invalid token');
    }

    const serverNow = new Date();

    if (serverNow < session.startTime || serverNow >= session.endTime) {
      throw new BadRequestException('Attendance session has expired or is not yet active');
    }

    let existingAttendance = null;
    try {
      const student = await this.resolveStudent(studentIdOrParam, authHeader);
      if (student) {
        const att = await this.prisma.attendance.findUnique({
          where: {
            studentId_eventId: {
              studentId: student.id,
              eventId: session.eventId,
            },
          },
        });
        if (att) {
          existingAttendance = {
            id: att.id,
            checkInTime: att.checkInTime,
            checkInProofUrl: att.checkInProofUrl,
            checkOutTime: att.checkOutTime,
            checkOutProofUrl: att.checkOutProofUrl,
            feedback: att.feedback,
            status: att.status,
          };
        }
      }
    } catch {
      // Ignore if student resolution is not applicable
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
      existingAttendance,
    };
  }

  /**
   * Resolves student identity from authenticated JWT token, verified LINE user ID, or dev student ID fallback.
   */
  async resolveStudent(
    studentIdOrParam?: string,
    authHeader?: string,
    lineUserId?: string,
  ): Promise<Student> {
    const isDev = (this.configService.get<string>('nodeEnv') || process.env.NODE_ENV || 'development') === 'development';

    // 1. Authenticate via Bearer JWT header (Primary Production Transport)
    if (authHeader && authHeader.trim()) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          if (payload && payload.sub) {
            const student = await this.prisma.student.findUnique({
              where: { id: payload.sub },
            });
            if (student) {
              return student;
            }
          }
        } catch (err: any) {
          this.logger.warn(`JWT verification failed in resolveStudent: ${err?.message}`);
        }
      }
    }

    // 2. Authenticate via verified lineUserId
    if (lineUserId) {
      const studentByLine = await this.prisma.student.findUnique({
        where: { lineUserId },
      });
      if (studentByLine) {
        return studentByLine;
      }
    }

    // 3. Development header / param lookup: strictly permitted ONLY in development mode
    if (studentIdOrParam && isDev) {
      const student = await this.prisma.student.findFirst({
        where: {
          OR: [{ id: studentIdOrParam }, { studentId: studentIdOrParam }],
        },
      });

      if (student) {
        return student;
      }
    }

    // 4. Fallback default student lookup: strictly permitted ONLY in development mode
    if (isDev) {
      const defaultStudent = await this.prisma.student.findFirst();
      if (defaultStudent) {
        return defaultStudent;
      }
    }

    throw new UnauthorizedException('Student authentication required in production environment');
  }

  /**
   * Fetches authenticated student profile and available dev test students
   */
  async getStudentProfile(studentIdOrParam?: string, authHeader?: string) {
    const currentStudent = await this.resolveStudent(studentIdOrParam, authHeader);
    const availableStudents = await this.prisma.student.findMany({
      select: {
        id: true,
        studentId: true,
        fullName: true,
        faculty: true,
        major: true,
        year: true,
      },
    });

    return {
      currentStudent: {
        id: currentStudent.id,
        studentId: currentStudent.studentId,
        fullName: currentStudent.fullName,
        year: currentStudent.year,
        faculty: currentStudent.faculty,
        major: currentStudent.major,
      },
      availableStudents,
    };
  }

  /**
   * Saves uploaded proof photo file using storage abstraction
   */
  private async saveProofFile(file: UploadedProofFile): Promise<string> {
    const result = await this.storageService.saveFile(file, {
      subfolder: 'proofs',
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxSizeBytes: 5 * 1024 * 1024,
    });
    return result.url;
  }

  /**
   * Submits student attendance for an active session
   */
  async submitAttendance(
    token: string,
    studentIdOrParam: string | undefined,
    file: UploadedProofFile,
    feedback?: string,
    authHeader?: string,
  ) {
    // 1. Validate session token and active server time
    let session = null;
    try {
      session = await this.prisma.attendanceSession.findUnique({
        where: { token },
        include: { event: true },
      });
    } catch (err: any) {
      this.logger.warn(`Database session lookup failed for token '${token}': ${err?.message}`);
      throw new NotFoundException('Attendance session not found or invalid token');
    }

    if (!session) {
      throw new NotFoundException('Attendance session not found or invalid token');
    }

    const serverNow = new Date();
    if (serverNow < session.startTime || serverNow >= session.endTime) {
      throw new BadRequestException('Attendance session has expired or is not yet active');
    }

    // 2. Resolve authoritative student identity from JWT / dev header
    const student = await this.resolveStudent(studentIdOrParam, authHeader);

    // 3. Process & save photo proof file
    const proofUrl = await this.saveProofFile(file);

    // 4. Validate optional recommendation/feedback length
    const trimmedFeedback = feedback ? feedback.trim() : null;
    if (trimmedFeedback && trimmedFeedback.length > 1000) {
      throw new BadRequestException('Recommendation / feedback exceeds 1000 characters maximum length');
    }

    // 5. Query existing attendance record
    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        studentId_eventId: {
          studentId: student.id,
          eventId: session.eventId,
        },
      },
    });

    // 6. Execute submission logic according to sessionType
    if (session.sessionType === AttendanceSessionType.CHECK_IN) {
      if (existingAttendance && existingAttendance.checkInTime) {
        throw new BadRequestException('Check-in has already been recorded for this event');
      }

      let attendance;
      if (existingAttendance) {
        attendance = await this.prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            checkInTime: serverNow,
            checkInProofUrl: proofUrl,
            feedback: trimmedFeedback || existingAttendance.feedback,
            status: AttendanceStatus.INCOMPLETE,
          },
        });
      } else {
        attendance = await this.prisma.attendance.create({
          data: {
            studentId: student.id,
            eventId: session.eventId,
            checkInTime: serverNow,
            checkInProofUrl: proofUrl,
            feedback: trimmedFeedback,
            status: AttendanceStatus.INCOMPLETE,
          },
        });
      }

      this.logger.log(
        `Check-in recorded for student "${student.studentId}" on event "${session.event.title}".`,
      );

      return {
        message: 'Check-in recorded successfully.',
        sessionType: 'CHECK_IN',
        recordedAt: serverNow,
        eventTitle: session.event.title,
        studentName: student.fullName,
        studentId: student.studentId,
        attendanceId: attendance.id,
        status: attendance.status,
      };
    } else {
      // CHECK_OUT session
      if (!existingAttendance || !existingAttendance.checkInTime) {
        throw new BadRequestException('Check-in record not found. You must check in before checking out.');
      }

      if (existingAttendance.checkOutTime) {
        throw new BadRequestException('Check-out has already been recorded for this event');
      }

      const updatedFeedback = trimmedFeedback
        ? existingAttendance.feedback
          ? `${existingAttendance.feedback}\n${trimmedFeedback}`
          : trimmedFeedback
        : existingAttendance.feedback;

      const attendance = await this.prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkOutTime: serverNow,
          checkOutProofUrl: proofUrl,
          feedback: updatedFeedback,
          status: AttendanceStatus.COMPLETED,
        },
      });

      this.logger.log(
        `Check-out recorded for student "${student.studentId}" on event "${session.event.title}".`,
      );

      return {
        message: 'Check-out recorded successfully.',
        sessionType: 'CHECK_OUT',
        recordedAt: serverNow,
        eventTitle: session.event.title,
        studentName: student.fullName,
        studentId: student.studentId,
        attendanceId: attendance.id,
        status: attendance.status,
      };
    }
  }
}
