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

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'varchar', default: 'viewer' })
  role!: UserRole;

  @Column()
  organizationId!: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column({ nullable: true })
  refreshTokenHash!: string | null;

  // Account lockout fields
  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  lockoutUntil!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
