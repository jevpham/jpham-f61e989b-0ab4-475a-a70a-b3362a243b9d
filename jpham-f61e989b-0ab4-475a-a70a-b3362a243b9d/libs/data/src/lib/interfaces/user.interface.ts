import { UserRole } from '../enums/role.enum';

export interface IUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
