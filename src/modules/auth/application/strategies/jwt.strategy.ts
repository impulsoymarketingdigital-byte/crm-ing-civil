import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthUser } from '../../domain/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'fallback-secret',
    });
  }

  validate(payload: JwtPayload): AuthUser & { sub: string } {
    if (!payload?.sub || !payload?.tenantId) {
      throw new UnauthorizedException('Token inválido');
    }
    return {
      sub:          payload.sub,      // needed by auth.controller CurrentUserId
      userId:       payload.sub,
      email:        payload.email,
      tenantId:     payload.tenantId,
      permissions:  payload.permissions ?? [],
      isSuperAdmin: payload.isSuperAdmin ?? false,
    };
  }
}
