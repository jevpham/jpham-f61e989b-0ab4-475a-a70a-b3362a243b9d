import {
  Controller,
  Post,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Body,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public, CurrentUser, JwtPayload } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';
import { IUser } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { LoginDto, RegisterDto } from '../common/dto/validation.dto';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import * as bcrypt from 'bcrypt';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Response types (refresh token not exposed to client)
interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: IUser;
}

interface RequestWithUser extends Request {
  user: User;
}

interface RequestWithRefreshPayload extends Request {
  user: JwtPayload & { refreshToken: string };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  private getClientInfo(req: Request): { ipAddress: string; userAgent: string } {
    return {
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const cookieOptions = this.authService.getRefreshTokenCookieOptions();
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login', description: 'Authenticate user and return JWT access token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful, returns access token (refresh token in httpOnly cookie)' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked' })
  async login(
    @Body() _dto: LoginDto,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result = await this.authService.login(req.user);
    const { ipAddress, userAgent } = this.getClientInfo(req);

    // Set refresh token in httpOnly cookie (not exposed to JavaScript)
    this.setRefreshTokenCookie(res, result.refreshToken);

    // Audit successful login (fire-and-forget)
    this.auditService.log({
      action: 'login',
      resource: 'auth',
      resourceId: req.user.id,
      userId: req.user.id,
      organizationId: req.user.organizationId,
      ipAddress,
      userAgent,
      metadata: { email: req.user.email },
    }).catch(() => { /* ignore audit failures */ });

    // Return access token only (refresh token is in cookie)
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user with organization', description: 'Create a new user account and organization' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User and organization created successfully' })
  @ApiResponse({ status: 409, description: 'Email or organization slug already registered' })
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<IUser> {
    // Check if email is already registered
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if organization slug is already taken
    const existingOrg = await this.organizationsService.findBySlug(dto.organizationSlug);
    if (existingOrg) {
      throw new ConflictException('Organization slug already exists');
    }

    // Use transaction to create organization, user, and membership atomically
    const user = await this.dataSource.transaction(async (manager) => {
      // Create organization
      const org = manager.create(Organization, {
        name: dto.organizationName,
        slug: dto.organizationSlug,
        description: dto.organizationDescription ?? null,
        parentId: null,
      });
      const savedOrg = await manager.save(org);

      // Create user with owner role
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const newUser = manager.create(User, {
        email: dto.email,
        password: hashedPassword,
        organizationId: savedOrg.id,
        role: 'owner',
      });
      const savedUser = await manager.save(newUser);

      // Create organization membership
      const membership = manager.create(OrganizationMembership, {
        userId: savedUser.id,
        organizationId: savedOrg.id,
        role: 'owner',
      });
      await manager.save(membership);

      return savedUser;
    });

    const { ipAddress, userAgent } = this.getClientInfo(req);

    // Audit successful registration (fire-and-forget)
    this.auditService.log({
      action: 'register',
      resource: 'auth',
      resourceId: user.id,
      userId: user.id,
      organizationId: user.organizationId,
      ipAddress,
      userAgent,
      metadata: { email: user.email, organizationName: dto.organizationName },
    }).catch(() => { /* ignore audit failures */ });

    return this.authService.toUserResponse(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'User logout', description: 'Invalidate user refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() user: IUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.id);

    // Clear the refresh token cookie
    this.clearRefreshTokenCookie(res);

    const { ipAddress, userAgent } = this.getClientInfo(req);

    // Audit logout (fire-and-forget)
    this.auditService.log({
      action: 'logout',
      resource: 'auth',
      resourceId: user.id,
      userId: user.id,
      organizationId: user.organizationId,
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    }).catch(() => { /* ignore audit failures */ });

    return { message: 'Logged out successfully' };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh tokens', description: 'Get new access token using refresh token from cookie' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: RequestWithRefreshPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const { sub, refreshToken } = req.user;
    const result = await this.authService.refreshTokens(sub, refreshToken);

    // Rotate refresh token in cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    // Return access token only
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }
}
