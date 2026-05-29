import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
/** Attach one or more required Permission strings to a route handler. */
export const RequirePermissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
