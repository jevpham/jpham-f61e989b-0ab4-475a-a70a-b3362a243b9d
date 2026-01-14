import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AuditService } from '../../audit/audit.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {
    super({ usernameField: 'email', passReqToCallback: true });
  }

  async validate(req: Request, email: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Audit failed login attempt (fire-and-forget)
      this.auditService.log({
        action: 'login_failed',
        resource: 'auth',
        resourceId: null,
        userId: null,
        organizationId: null,
        ipAddress,
        userAgent,
        metadata: { attemptedEmail: email },
      }).catch(() => { /* ignore audit failures */ });

      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
