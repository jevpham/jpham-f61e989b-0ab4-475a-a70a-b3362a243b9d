import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserRole } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar' })
  password!: string;

  @Column({ type: 'varchar', default: 'viewer' })
  role!: UserRole;

  @Column({ type: 'varchar' })
  organizationId!: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash!: string | null;

  // Account lockout fields
  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'datetime', nullable: true })
  lockoutUntil!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
