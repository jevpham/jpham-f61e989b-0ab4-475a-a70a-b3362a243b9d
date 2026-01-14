import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload, LegacyJwtPayload, normalizeJwtPayload } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Custom extractor that reads from httpOnly cookie
function extractFromCookie(req: Request): string | null {
  if (req && req.cookies && req.cookies[REFRESH_TOKEN_COOKIE]) {
    return req.cookies[REFRESH_TOKEN_COOKIE];
  }
  return null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    const options: StrategyOptionsWithRequest = {
      // Try cookie first, then fall back to Authorization header (for backwards compatibility)
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: Request, payload: LegacyJwtPayload): JwtPayload & { refreshToken: string } {
    // Get refresh token from cookie or header
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ||
      req.get('Authorization')?.replace('Bearer ', '').trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Normalize payload to handle both old and new formats
    const normalizedPayload = normalizeJwtPayload(payload);

    return { ...normalizedPayload, refreshToken };
  }
}
