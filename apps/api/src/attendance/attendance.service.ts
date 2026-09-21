import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AttendanceSessionType, AttendanceStatus, Student } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

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
   * Retrieves and validates an attendance session by token.
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

  /**
   * Resolves student identity from authenticated request or dev student ID fallback
   */
  async resolveStudent(studentIdOrParam?: string): Promise<Student> {
    if (studentIdOrParam) {
      const student = await this.prisma.student.findFirst({
        where: {
          OR: [{ id: studentIdOrParam }, { studentId: studentIdOrParam }],
        },
      });

      if (student) {
        return student;
      }
    }

    // Fallback for development testing
    const defaultStudent = await this.prisma.student.findFirst();
    if (!defaultStudent) {
      throw new UnauthorizedException('No student profiles found in database');
    }

    return defaultStudent;
  }

  /**
   * Fetches authenticated student profile and available dev test students
   */
  async getStudentProfile(studentIdOrParam?: string) {
    const currentStudent = await this.resolveStudent(studentIdOrParam);
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
   * Saves uploaded proof photo file to local development storage directory safely
   */
  private async saveProofFile(file: UploadedProofFile): Promise<string> {
    if (!file) {
      throw new BadRequestException('Photo proof file is required');
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Invalid file type. Only image files (JPEG, PNG, WEBP) are allowed');
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds the 5MB maximum limit');
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'proofs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = path.extname(file.originalname) || '.jpg';
    const safeFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExt}`;
    const filePath = path.join(uploadDir, safeFilename);

    await fs.promises.writeFile(filePath, file.buffer);

    return `/api/attendance/uploads/proofs/${safeFilename}`;
  }

  /**
   * Submits student attendance for an active session
   */
  async submitAttendance(
    token: string,
    studentIdOrParam: string | undefined,
    file: UploadedProofFile,
    feedback?: string,
  ) {
    // 1. Validate session token and active server time
    const session = await this.prisma.attendanceSession.findUnique({
      where: { token },
      include: { event: true },
    });

    if (!session) {
      throw new NotFoundException('Attendance session not found or invalid token');
    }

    const serverNow = new Date();
    if (serverNow < session.startTime || serverNow >= session.endTime) {
      throw new BadRequestException('Attendance session has expired or is not yet active');
    }

    // 2. Resolve authoritative student identity
    const student = await this.resolveStudent(studentIdOrParam);

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
