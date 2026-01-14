import { UserRole, VALID_ROLES } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

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
// Throws error if required fields are missing to prevent unauthorized access
export function normalizeJwtPayload(payload: LegacyJwtPayload): JwtPayload {
  // Validate required user ID
  if (!payload.sub) {
    throw new Error('Invalid JWT: missing user ID (sub)');
  }

  // Validate organization ID
  const oid = payload.oid ?? payload.organizationId;
  if (!oid) {
    throw new Error('Invalid JWT: missing organization ID (oid)');
  }

  // Validate role
  const role = payload.r ?? payload.role;
  if (!role || !VALID_ROLES.includes(role)) {
    throw new Error('Invalid JWT: missing or invalid role');
  }

  return {
    sub: payload.sub,
    oid,
    r: role,
    iat: payload.iat,
    exp: payload.exp,
  };
}
