import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../domain/dto/login.dto';
import { RegisterTenantDto } from '../domain/dto/register-tenant.dto';
import { Public } from '../../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new Tenant and its first Admin user.
   * Returns a JWT for immediate use.
   *
   * POST /api/v1/auth/register
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  /**
   * Exchange credentials for a JWT.
   *
   * POST /api/v1/auth/login
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
