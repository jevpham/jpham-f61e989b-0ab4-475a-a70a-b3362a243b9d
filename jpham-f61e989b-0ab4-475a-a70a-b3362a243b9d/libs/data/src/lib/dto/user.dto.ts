import { IsEmail, IsString, IsOptional, IsIn, MinLength, IsUUID } from 'class-validator';
import { UserRole } from '../enums/role.enum';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsUUID()
  organizationId!: string;

  @IsIn(['owner', 'admin', 'viewer'])
  @IsOptional()
  role?: UserRole;
}

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsIn(['owner', 'admin', 'viewer'])
  @IsOptional()
  role?: UserRole;
}
