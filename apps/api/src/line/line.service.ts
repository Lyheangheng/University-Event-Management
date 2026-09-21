import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Student } from '@prisma/client';

export interface LineIdTokenClaims {
  sub: string;
  name?: string;
  picture?: string;
  email?: string;
  aud?: string;
  exp?: number;
}

export interface LineAuthResult {
  status: 'LINKED' | 'UNLINKED';
  lineUserId: string;
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
  student?: {
    id: string;
    studentId: string;
    fullName: string;
    faculty: string;
    major: string;
    year: number;
    lineUserId: string | null;
  } | null;
  accessToken?: string | null;
}

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Verifies LINE ID Token directly via LINE Platform OAuth2 verification API.
   * Does NOT trust unverified JWT payloads directly from client requests.
   */
  async verifyIdToken(idToken: string): Promise<LineIdTokenClaims> {
    if (!idToken || !idToken.trim()) {
      throw new UnauthorizedException('LINE ID Token is required');
    }

    const channelId = this.configService.get<string>('line.channelId');

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('id_token', idToken.trim());
      if (channelId) {
        bodyParams.append('client_id', channelId);
      }

      const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json || !json.sub) {
        const errorMsg = json?.error_description || json?.error || 'Invalid or expired LINE ID Token';
        this.logger.warn(`LINE ID token verification failed: ${errorMsg}`);
        throw new UnauthorizedException(`LINE token verification failed: ${errorMsg}`);
      }

      return {
        sub: json.sub,
        name: json.name,
        picture: json.picture,
        email: json.email,
        aud: json.aud,
        exp: json.exp,
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(`Error connecting to LINE token verification endpoint: ${err.message}`);
      throw new UnauthorizedException(`Unable to verify LINE token: ${err.message}`);
    }
  }

  /**
   * Authenticates or checks student status by verified LINE ID token.
   */
  async authenticateOrCheckStatus(idToken: string): Promise<LineAuthResult> {
    const claims = await this.verifyIdToken(idToken);
    const lineUserId = claims.sub;

    const student = await this.prisma.student.findUnique({
      where: { lineUserId },
    });

    if (student) {
      // Issue application JWT session token for authenticated student
      const accessToken = this.jwtService.sign({
        sub: student.id,
        studentId: student.studentId,
        lineUserId: student.lineUserId,
        role: 'STUDENT',
      });

      this.logger.log(`Authenticated linked LINE student '${student.studentId}' (${lineUserId}).`);

      return {
        status: 'LINKED',
        lineUserId,
        lineDisplayName: claims.name || student.lineDisplayName,
        linePictureUrl: claims.picture || student.linePictureUrl,
        student: {
          id: student.id,
          studentId: student.studentId,
          fullName: student.fullName,
          faculty: student.faculty,
          major: student.major,
          year: student.year,
          lineUserId: student.lineUserId,
        },
        accessToken,
      };
    }

    return {
      status: 'UNLINKED',
      lineUserId,
      lineDisplayName: claims.name || null,
      linePictureUrl: claims.picture || null,
      student: null,
      accessToken: null,
    };
  }

  /**
   * Links a verified LINE user account to an existing Student academic record.
   */
  async linkStudentAccount(idToken: string, studentIdOrId: string): Promise<LineAuthResult> {
    if (!studentIdOrId || !studentIdOrId.trim()) {
      throw new BadRequestException('Student ID or record identifier is required for linking');
    }

    const claims = await this.verifyIdToken(idToken);
    const lineUserId = claims.sub;

    // 1. Check if LINE account is already linked to a student
    const existingLineLink = await this.prisma.student.findUnique({
      where: { lineUserId },
    });

    if (existingLineLink) {
      if (existingLineLink.studentId === studentIdOrId || existingLineLink.id === studentIdOrId) {
        return this.authenticateOrCheckStatus(idToken);
      }
      throw new BadRequestException(
        `This LINE account is already linked to student ID '${existingLineLink.studentId}'`,
      );
    }

    // 2. Find target student record by studentId or UUID
    const targetStudent = await this.prisma.student.findFirst({
      where: {
        OR: [{ studentId: studentIdOrId.trim() }, { id: studentIdOrId.trim() }],
      },
    });

    if (!targetStudent) {
      throw new NotFoundException(`No student record found for '${studentIdOrId}'`);
    }

    if (targetStudent.lineUserId && targetStudent.lineUserId !== lineUserId) {
      throw new BadRequestException(
        `Student '${targetStudent.studentId}' is already linked to another LINE account.`,
      );
    }

    // 3. Update student with verified LINE details
    const updatedStudent = await this.prisma.student.update({
      where: { id: targetStudent.id },
      data: {
        lineUserId,
        lineDisplayName: claims.name || targetStudent.lineDisplayName,
        linePictureUrl: claims.picture || targetStudent.linePictureUrl,
      },
    });

    this.logger.log(
      `Successfully linked LINE account '${lineUserId}' to student '${updatedStudent.studentId}'.`,
    );

    const accessToken = this.jwtService.sign({
      sub: updatedStudent.id,
      studentId: updatedStudent.studentId,
      lineUserId: updatedStudent.lineUserId,
      role: 'STUDENT',
    });

    return {
      status: 'LINKED',
      lineUserId,
      lineDisplayName: updatedStudent.lineDisplayName,
      linePictureUrl: updatedStudent.linePictureUrl,
      student: {
        id: updatedStudent.id,
        studentId: updatedStudent.studentId,
        fullName: updatedStudent.fullName,
        faculty: updatedStudent.faculty,
        major: updatedStudent.major,
        year: updatedStudent.year,
        lineUserId: updatedStudent.lineUserId,
      },
      accessToken,
    };
  }
}
