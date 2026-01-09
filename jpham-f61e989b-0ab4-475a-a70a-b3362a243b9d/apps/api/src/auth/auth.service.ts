import { Injectable, ForbiddenException, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { TokenResponse, IUser } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

const BCRYPT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private dummyHash: string = '';
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Validate JWT secrets at construction time - fail fast if misconfigured
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || accessSecret.length < 32) {
      throw new Error('JWT_ACCESS_SECRET must be configured with at least 32 characters');
    }
    if (!refreshSecret || refreshSecret.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be configured with at least 32 characters');
    }

    this.jwtAccessSecret = accessSecret;
    this.jwtRefreshSecret = refreshSecret;
  }

  async onModuleInit() {
    // Generate a valid bcrypt hash at startup for timing attack mitigation
    this.dummyHash = await bcrypt.hash('dummy_password_for_timing', BCRYPT_ROUNDS);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    // Check account lockout
    if (user && this.isAccountLocked(user)) {
      this.logger.warn(`Login attempt for locked account: ${email}`);
      throw new ForbiddenException('Account temporarily locked. Please try again later.');
    }

    // Always perform bcrypt compare to prevent timing attacks
    const passwordToCompare = user?.password ?? this.dummyHash;
    const isValid = await bcrypt.compare(password, passwordToCompare);

    if (!user || !isValid) {
      // Record failed attempt if user exists
      if (user) {
        await this.recordFailedAttempt(user);
      }
      return null;
    }

    // Clear failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await this.usersService.clearFailedAttempts(user.id);
    }

    return user;
  }

  private isAccountLocked(user: User): boolean {
    if (!user.lockoutUntil) return false;
    return user.lockoutUntil > new Date();
  }

  private async recordFailedAttempt(user: User): Promise<void> {
    const newFailedAttempts = (user.failedLoginAttempts ?? 0) + 1;

    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);

      await this.usersService.lockAccount(user.id, newFailedAttempts, lockoutUntil);
      this.logger.warn(`Account locked due to failed attempts: ${user.email}`);
    } else {
      await this.usersService.incrementFailedAttempts(user.id, newFailedAttempts);
    }
  }

  async login(user: User): Promise<TokenResponse & { user: IUser }> {
    const tokens = await this.generateTokens(user);
    await this.updateUserRefreshToken(user.id, tokens.refreshToken);

    // Return user info alongside tokens (don't embed in JWT)
    return {
      ...tokens,
      user: this.toUserResponse(user),
    };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokenResponse & { user: IUser }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      this.logger.warn(`Refresh token attempt for non-existent user: ${userId}`);
      throw new ForbiddenException('Access denied');
    }

    // Check account lockout - locked accounts cannot refresh tokens
    if (this.isAccountLocked(user)) {
      this.logger.warn(`Refresh token attempt for locked account: ${userId}`);
      throw new ForbiddenException('Account temporarily locked');
    }

    if (!user.refreshTokenHash) {
      this.logger.warn(`Refresh token attempt for user without refresh token: ${userId}`);
      throw new ForbiddenException('Access denied');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      this.logger.warn(`Invalid refresh token for user: ${userId}`);
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.generateTokens(user);
    await this.updateUserRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.toUserResponse(user),
    };
  }

  private async updateUserRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.usersService.updateRefreshToken(userId, hashedRefreshToken);
  }

  private async generateTokens(user: User): Promise<TokenResponse> {
    // Minimize JWT payload - no PII (email removed)
    const payload = {
      sub: user.id,
      oid: user.organizationId, // Abbreviated
      r: user.role,             // Abbreviated
    };

    const accessExpiresIn = this.parseExpiresIn(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    );
    const refreshExpiresIn = this.parseExpiresIn(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtAccessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.jwtRefreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      return parseInt(value, 10) || 900; // Default to 15 minutes
    }

    const num = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 60 * 60;
      case 'd':
        return num * 60 * 60 * 24;
      default:
        return num;
    }
  }

  toUserResponse(user: User): IUser {
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  getRefreshTokenCookieOptions() {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const refreshExpiresIn = this.parseExpiresIn(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    );
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');

    const options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'strict';
      maxAge: number;
      path: string;
      domain?: string;
    } = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: refreshExpiresIn * 1000, // Convert to milliseconds
      path: '/api/auth', // Only sent to auth endpoints
    };

    // Only set domain in production to allow subdomain sharing if configured
    if (isProduction && cookieDomain) {
      options.domain = cookieDomain;
    }

    return options;
  }
}
