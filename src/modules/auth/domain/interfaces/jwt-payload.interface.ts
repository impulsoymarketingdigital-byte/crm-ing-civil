export interface JwtPayload {
  sub:          string;
  email:        string;
  tenantId:     string;
  /** Role permissions ∪ customPermissions merged. 'admin:*' = all. */
  permissions:  string[];
  isSuperAdmin: boolean;
}

/** Shape attached to request.user after JWT validation */
export interface AuthUser {
  userId:       string;
  email:        string;
  tenantId:     string;
  permissions:  string[];
  isSuperAdmin: boolean;
}
