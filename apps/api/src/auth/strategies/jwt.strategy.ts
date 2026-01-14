import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { LegacyJwtPayload, normalizeJwtPayload } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';
import { IUser } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: LegacyJwtPayload): Promise<IUser> {
    // Normalize payload to handle both old and new formats
    const normalizedPayload = normalizeJwtPayload(payload);

    const user = await this.usersService.findById(normalizedPayload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if account is locked
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new UnauthorizedException('Account is locked');
    }

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
