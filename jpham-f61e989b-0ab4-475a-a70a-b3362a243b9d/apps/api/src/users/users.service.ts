import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      email: dto.email,
      password: hashedPassword,
      organizationId: dto.organizationId,
      role: dto.role || 'viewer',
    });
    return this.usersRepository.save(user);
  }

  async updateRefreshToken(userId: string, refreshTokenHash: string | null): Promise<void> {
    await this.usersRepository.update(userId, { refreshTokenHash });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  // Account lockout methods
  async incrementFailedAttempts(userId: string, attempts: number): Promise<void> {
    await this.usersRepository.update(userId, { failedLoginAttempts: attempts });
  }

  async lockAccount(userId: string, attempts: number, lockoutUntil: Date): Promise<void> {
    await this.usersRepository.update(userId, {
      failedLoginAttempts: attempts,
      lockoutUntil,
    });
  }

  async clearFailedAttempts(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });
  }
}
