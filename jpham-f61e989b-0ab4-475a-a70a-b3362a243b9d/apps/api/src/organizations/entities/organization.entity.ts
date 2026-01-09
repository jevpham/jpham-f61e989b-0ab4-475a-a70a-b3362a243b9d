import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({ nullable: true })
  parentId!: string | null;

  @ManyToOne(() => Organization, (org) => org.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent!: Organization | null;

  @OneToMany(() => Organization, (org) => org.parent)
  children!: Organization[];

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
