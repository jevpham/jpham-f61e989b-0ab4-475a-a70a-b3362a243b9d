import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AuditAction } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

@Entity('audit_logs')
@Index(['userId'])
@Index(['organizationId'])
@Index(['resource', 'resourceId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  action!: AuditAction;

  @Column()
  resource!: string;

  @Column({ nullable: true })
  resourceId!: string | null;

  @Column({ nullable: true })
  userId!: string | null;

  @Column({ nullable: true })
  organizationId!: string | null;

  @Column({ nullable: true })
  ipAddress!: string | null;

  @Column({ nullable: true })
  userAgent!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
