import { UserRole } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

// Minimized JWT payload (no PII)
export interface JwtPayload {
  sub: string;           // User ID
  oid: string;           // Organization ID (abbreviated)
  r: UserRole;           // Role (abbreviated)
  iat?: number;
  exp?: number;
}

// Legacy payload support (for backwards compatibility during migration)
export interface LegacyJwtPayload {
  sub: string;
  email?: string;
  organizationId?: string;
  role?: UserRole;
  oid?: string;
  r?: UserRole;
  iat?: number;
  exp?: number;
}

// Helper to normalize payload (handles both old and new formats)
export function normalizeJwtPayload(payload: LegacyJwtPayload): JwtPayload {
  return {
    sub: payload.sub,
    oid: payload.oid ?? payload.organizationId ?? '',
    r: payload.r ?? payload.role ?? 'viewer',
    iat: payload.iat,
    exp: payload.exp,
  };
}
