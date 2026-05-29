export interface JwtPayload {
  /** User UUID */
  sub: string;
  email: string;
  tenantId: string;
  /** Flat permission strings, e.g. ["admin:*"] or ["account:read","journal:write"] */
  permissions: string[];
}

/** Shape attached to request.user after JWT validation */
export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  permissions: string[];
}
