import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards } from '@nestjs/common';
import { AuthService, AdminLoginResult, AdminProfileResult } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser, AuthenticatedUserPayload } from './decorators/current-user.decorator';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @UseGuards(RateLimiterGuard)
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: AdminLoginDto): Promise<AdminLoginResult> {
    return this.authService.adminLogin(dto);
  }


  @Get('admin/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminMe(@CurrentUser() user: AuthenticatedUserPayload): Promise<AdminProfileResult> {
    return this.authService.getAdminProfile(user.userId);
  }
}
