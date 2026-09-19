import { Injectable, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { Student } from '@prisma/client';

export interface AdminLoginResult {
  accessToken: string;
  admin: {
    id: string;
    username: string;
    name: string;
  };
}

export interface AdminProfileResult {
  id: string;
  username: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticate administrator with username and password
   */
  async adminLogin(dto: AdminLoginDto): Promise<AdminLoginResult> {
    const admin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });

    if (!admin) {
      this.logger.warn(`Admin login attempt failed: username '${dto.username}' not found.`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Admin login attempt failed: invalid password for username '${dto.username}'.`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: admin.id,
      username: admin.username,
      role: 'ADMIN',
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Admin '${admin.username}' logged in successfully.`);

    return {
      accessToken,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    };
  }

  /**
   * Get authenticated admin profile details by ID
   */
  async getAdminProfile(adminId: string): Promise<AdminProfileResult> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Administrator account not found');
    }

    return admin;
  }

  /**
   * Student identity foundation method: Look up student by linked LINE User ID
   * For future LINE/LIFF authentication phase
   */
  async findStudentByLineUserId(lineUserId: string): Promise<Student | null> {
    if (!lineUserId) {
      return null;
    }

    return this.prisma.student.findUnique({
      where: { lineUserId },
    });
  }
}
