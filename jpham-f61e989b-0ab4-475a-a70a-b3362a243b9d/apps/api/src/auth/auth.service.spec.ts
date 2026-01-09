import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    refreshTokenHash: null,
    organizationId: 'org-123',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as User;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateRefreshToken: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      lockAccount: jest.fn(),
      clearFailedAttempts: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'JWT_ACCESS_SECRET': 'test-access-secret-at-least-32-characters-long',
          'JWT_REFRESH_SECRET': 'test-refresh-secret-at-least-32-characters-long',
          'JWT_ACCESS_EXPIRES_IN': '15m',
          'JWT_REFRESH_EXPIRES_IN': '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Default config values
    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
    });

    it('should return null when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should always perform bcrypt compare to prevent timing attacks', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.validateUser('nonexistent@example.com', 'password123');

      // Should still call compare even when user not found (uses dummy hash)
      expect(bcrypt.compare).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should generate and return tokens on successful login', async () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';
      const hashedRefresh = '$2b$10$hashedrefresh';

      jwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedRefresh);
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(result).toEqual({
        accessToken,
        refreshToken,
        expiresIn: 900, // 15m = 900s
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          organizationId: mockUser.organizationId,
          role: mockUser.role,
        }),
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        hashedRefresh,
      );
    });

    it('should include correct payload in token (minimal for security)', async () => {
      jwtService.signAsync.mockResolvedValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      await service.login(mockUser);

      // JWT payload uses abbreviated keys and no PII (email removed for security)
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          oid: mockUser.organizationId, // Abbreviated
          r: mockUser.role,             // Abbreviated
        }),
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token on logout', async () => {
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      await service.logout('user-123');

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', null);
    });
  });

  describe('refreshTokens', () => {
    it('should generate new tokens when refresh token is valid', async () => {
      const userWithRefresh = {
        ...mockUser,
        refreshTokenHash: '$2b$10$validhash',
      };
      usersService.findById.mockResolvedValue(userWithRefresh as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.refreshTokens('user-123', 'valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
          organizationId: 'org-123',
          role: 'admin',
        }),
      });
    });

    it('should throw ForbiddenException when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.refreshTokens('nonexistent-user', 'token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no refresh token', async () => {
      const userNoRefresh = { ...mockUser, refreshTokenHash: null };
      usersService.findById.mockResolvedValue(userNoRefresh as User);

      await expect(
        service.refreshTokens('user-123', 'token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when refresh token is invalid', async () => {
      const userWithRefresh = {
        ...mockUser,
        refreshTokenHash: '$2b$10$validhash',
      };
      usersService.findById.mockResolvedValue(userWithRefresh as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-123', 'invalid-token'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('toUserResponse', () => {
    it('should return user data without sensitive fields', () => {
      const result = service.toUserResponse(mockUser);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        organizationId: mockUser.organizationId,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshTokenHash');
    });
  });

  describe('token expiration parsing', () => {
    it('should parse seconds correctly', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '30s';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '3600s';
        return 'test-secret';
      });
      jwtService.signAsync.mockResolvedValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(result.expiresIn).toBe(30);
    });

    it('should parse minutes correctly', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '30m';
        return 'test-secret';
      });
      jwtService.signAsync.mockResolvedValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(result.expiresIn).toBe(1800); // 30 * 60
    });

    it('should parse hours correctly', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '2h';
        return 'test-secret';
      });
      jwtService.signAsync.mockResolvedValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(result.expiresIn).toBe(7200); // 2 * 60 * 60
    });

    it('should parse days correctly', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '7d';
        return 'test-secret';
      });
      jwtService.signAsync.mockResolvedValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(result.expiresIn).toBe(604800); // 7 * 24 * 60 * 60
    });

    it('should default to 900 seconds for invalid format', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return 'invalid';
        return 'test-secret';
      });
      jwtService.signAsync.mockResolvedValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(result.expiresIn).toBe(900);
    });
  });
});
