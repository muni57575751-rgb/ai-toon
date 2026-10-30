import { Request, Response, NextFunction } from 'express';
import { resolveUserFromRequest } from './auth.middleware.js';
import { MASTER_ADMIN_EMAIL } from '../services/member.service.js';

export interface AuthenticatedAdminRequest extends Request {
  adminMember?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

/**
 * Middleware that strictly protects admin-only endpoints.
 * Blocks unauthenticated users (401) and normal/non-admin users (403).
 */
export const requireAdmin = (req: AuthenticatedAdminRequest, res: Response, next: NextFunction): void => {
  const resolved = resolveUserFromRequest(req);

  if (resolved.error) {
    res.status(resolved.error.statusCode).json({
      success: false,
      error: {
        code: resolved.error.code,
        message: 'Authentication required: You must be signed in to access admin resources.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const member = resolved.member!;

  // Strict check: only verified admins or master admin
  const isMaster = member.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
  if (member.role !== 'admin' && !isMaster) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_ADMIN_ONLY',
        message: 'Access denied: Administrator privileges required to access this portal.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  req.adminMember = {
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    role: member.role,
  };

  next();
};
