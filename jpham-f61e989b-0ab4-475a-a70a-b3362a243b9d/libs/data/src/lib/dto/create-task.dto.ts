import { IsString, IsOptional, IsIn, MinLength, MaxLength, IsNumber, IsUUID, IsDateString, Min, ValidateIf } from 'class-validator';
import { TaskStatus, TaskPriority } from '../enums/task-status.enum';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsIn(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: TaskPriority;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ValidateIf((o) => o.description !== null)
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string | null;

  @IsIn(['todo', 'in_progress', 'review', 'done'])
  @IsOptional()
  status?: TaskStatus;

  @IsIn(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: TaskPriority;

  @ValidateIf((o) => o.dueDate !== null)
  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @ValidateIf((o) => o.assigneeId !== null)
  @IsUUID()
  @IsOptional()
  assigneeId?: string | null;
}

export class ReorderTaskDto {
  @IsNumber()
  @Min(0)
  newPosition!: number;
}
