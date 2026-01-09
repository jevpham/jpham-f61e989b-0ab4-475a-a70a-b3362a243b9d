import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TaskStatus, TaskPriority } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@Entity('tasks')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'assigneeId'])
@Index(['organizationId', 'position'])
@Index(['organizationId', 'status', 'position'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({ type: 'varchar', default: 'todo' })
  status!: TaskStatus;

  @Column({ type: 'varchar', default: 'medium' })
  priority!: TaskPriority;

  @Column({ nullable: true, type: 'timestamp' })
  dueDate!: Date | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column()
  organizationId!: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column()
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ nullable: true })
  assigneeId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee!: User | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
