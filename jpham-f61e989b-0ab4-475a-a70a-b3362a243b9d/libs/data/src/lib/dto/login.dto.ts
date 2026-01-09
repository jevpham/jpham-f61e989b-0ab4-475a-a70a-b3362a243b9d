import { IsEmail, IsString, MinLength, IsOptional, MaxLength, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt only processes first 72 bytes - longer passwords waste CPU (DoS vector)
  password!: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt only processes first 72 bytes - longer passwords waste CPU (DoS vector)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
    { message: 'Password must contain uppercase, lowercase, number, and special character' }
  )
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  organizationName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Organization slug must be lowercase alphanumeric with hyphens' })
  organizationSlug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  organizationDescription?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
