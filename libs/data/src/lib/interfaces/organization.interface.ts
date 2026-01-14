import { UserRole } from '../enums/role.enum';

export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganizationMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
