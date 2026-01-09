import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';

/**
 * CSRF Protection Guard
 *
 * Protects against Cross-Site Request Forgery by validating:
 * 1. Origin header matches expected frontend URL (required for state-changing requests)
 * 2. X-Requested-With header is present (ensures AJAX request)
 *
 * This is a double-submit pattern that works well with SPA applications.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    this.allowedOrigins = [frontendUrl];
  }

  canActivate(context: ExecutionContext): boolean {
    // Skip CSRF check for public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only check state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Validate Origin header (required for state-changing requests)
    const origin = request.get('Origin');
    const referer = request.get('Referer');

    // Origin is preferred, but fall back to Referer for some browsers
    const requestOrigin = origin || (referer ? new URL(referer).origin : null);

    if (!requestOrigin) {
      throw new ForbiddenException('Missing Origin header');
    }

    if (!this.allowedOrigins.includes(requestOrigin)) {
      throw new ForbiddenException('Invalid origin');
    }

    // Validate X-Requested-With header (ensures AJAX request)
    const xRequestedWith = request.get('X-Requested-With');
    if (!xRequestedWith || xRequestedWith !== 'XMLHttpRequest') {
      throw new ForbiddenException('Invalid request');
    }

    return true;
  }
}
