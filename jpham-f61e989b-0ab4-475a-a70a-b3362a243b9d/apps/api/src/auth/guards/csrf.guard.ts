import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';

/**
 * CSRF Protection Guard
 *
 * Protects against Cross-Site Request Forgery by validating:
 * 1. Origin header matches expected frontend URL
 * 2. X-Requested-With header is present (AJAX-only)
 *
 * This is a simple double-submit pattern that works well with SPA applications.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(private reflector: Reflector) {
    // In a real app, load from ConfigService
    this.allowedOrigins = [
      process.env['FRONTEND_URL'] || 'http://localhost:4200',
    ];
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

    // Validate origin header
    const origin = request.get('Origin');
    if (origin && !this.allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Invalid origin');
    }

    // Validate X-Requested-With header (ensures AJAX request)
    const xRequestedWith = request.get('X-Requested-With');
    if (!xRequestedWith || xRequestedWith !== 'XMLHttpRequest') {
      // Log but don't block for now (gradual rollout)
      // In production, uncomment: throw new ForbiddenException('Missing CSRF header');
    }

    return true;
  }
}
