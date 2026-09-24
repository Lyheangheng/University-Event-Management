import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUserPayload } from '../decorators/current-user.decorator';
import { getRequiredJwtSecret } from '../../config/jwt-secret.helper';

export interface JwtPayload {
  sub: string;
  username?: string;
  studentId?: string;
  role: 'ADMIN' | 'STUDENT';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredJwtSecret(configService),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUserPayload> {
    if (!payload || !payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload structure');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      studentId: payload.studentId,
      role: payload.role,
    };
  }
}
