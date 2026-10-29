import { Request, Response, NextFunction } from 'express';
import { memberService } from '../services/member.service.js';

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
  const userId = (req.headers['x-user-id'] as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || '';
  const claimedRole = (req.headers['x-user-role'] as string) || '';

  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required: You must be signed in to access admin resources.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Look up actual verified record in member service
  const member = (userId ? memberService.getMemberById(userId) : undefined) ||
                 (userEmail ? memberService.getMemberByEmail(userEmail) : undefined);

  if (!member) {
    // If account not found in members store, check if client is claiming admin without record
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_ADMIN_ONLY',
        message: 'Access denied: Member profile not found in system or not authorized as administrator.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Strict role check against verified record
  if (member.role !== 'admin' || (claimedRole && claimedRole !== 'admin')) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_ADMIN_ONLY',
        message: 'Access denied: Admin privileges required. Normal student/user accounts cannot access admin-only pages or APIs.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
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

