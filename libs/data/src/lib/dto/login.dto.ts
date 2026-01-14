// Plain interfaces for frontend compatibility
// Backend validates via ValidationPipe with class-validator

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  organizationName: string;
  organizationSlug: string;
  organizationDescription?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
