import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Post, Put, UseGuards,
} from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../domain/dto/login.dto';
import { RegisterTenantDto } from '../domain/dto/register-tenant.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';

// Minimal decorator to pull sub from JWT (reuse existing tenant decorator pattern)
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string =>
  ctx.switchToHttp().getRequest().user?.sub,
);

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/v1/auth/register — create new company + admin user */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  /** POST /api/v1/auth/login — accepts slug or tenantId */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** GET /api/v1/auth/me — current user profile */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUserId() userId: string, @TenantId() tenantId: string) {
    return this.authService.getMe(userId, tenantId);
  }

  /** PUT /api/v1/auth/profile — update own name */
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  updateProfile(
    @CurrentUserId() userId: string,
    @TenantId() tenantId: string,
    @Body() body: { firstName: string; lastName: string },
  ) {
    return this.authService.updateProfile(userId, tenantId, body.firstName, body.lastName);
  }

  /** POST /api/v1/auth/change-password */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUserId() userId: string,
    @TenantId() tenantId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(userId, tenantId, body.currentPassword, body.newPassword);
  }
}
