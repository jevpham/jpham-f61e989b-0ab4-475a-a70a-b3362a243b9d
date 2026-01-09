import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TasksModule } from '../tasks/tasks.module';
import { AuditModule } from '../audit/audit.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Task } from '../tasks/entities/task.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import * as Joi from 'joi';

// Custom Joi validation for JWT secret entropy
const jwtSecretWithEntropy = Joi.string()
  .min(32)
  .required()
  .custom((value, helpers) => {
    const uniqueChars = new Set(value).size;
    if (uniqueChars < 10) {
      return helpers.error('string.lowEntropy', { limit: 10 });
    }
    return value;
  })
  .messages({
    'string.lowEntropy': '{{#label}} must have at least 10 unique characters for sufficient entropy',
  });

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validationSchema: Joi.object({
        DATABASE_HOST: Joi.string().default('localhost'),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_NAME: Joi.string().default('taskdb'),
        DATABASE_USER: Joi.string().default('postgres'),
        DATABASE_PASSWORD: Joi.string().required(),
        JWT_ACCESS_SECRET: jwtSecretWithEntropy,
        JWT_REFRESH_SECRET: jwtSecretWithEntropy,
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        PORT: Joi.number().default(3000),
        FRONTEND_URL: Joi.string().default('http://localhost:4200'),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
      validationOptions: {
        abortEarly: false,
      },
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [User, Organization, OrganizationMembership, Task, AuditLog],
        // SECURITY: Never use synchronize in production - always use migrations
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => [
        { name: 'short', ttl: 1000, limit: 10 },
        { name: 'medium', ttl: 10000, limit: 50 },
        { name: 'long', ttl: 60000, limit: 200 },
      ],
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    TasksModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
