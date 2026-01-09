import { IsString, IsOptional, MinLength, MaxLength, Matches, IsUUID } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class AddMemberDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @Matches(/^(owner|admin|viewer)$/, { message: 'Role must be owner, admin, or viewer' })
  role!: 'owner' | 'admin' | 'viewer';
}

export class UpdateMemberRoleDto {
  @IsString()
  @Matches(/^(owner|admin|viewer)$/, { message: 'Role must be owner, admin, or viewer' })
  role!: 'owner' | 'admin' | 'viewer';
}
