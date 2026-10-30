import { Request, Response, NextFunction } from 'express';
import { memberService, MASTER_ADMIN_EMAIL } from '../services/member.service.js';
import { verifyAuthToken } from '../services/token.service.js';
import type { MemberRecord } from '@ai-toon/shared';
import { isAccountApproved } from '@ai-toon/shared';

export interface AuthenticatedUserRequest extends Request {
  user?: MemberRecord;
}

/**
 * Extracts and resolves the authenticated member from either:
 * 1. Authorization: Bearer <JWT>
 * 2. x-auth-token header
 * 3. x-user-id / x-user-email headers (fallback / compatibility)
 */
export function resolveUserFromRequest(req: Request): {
  member?: MemberRecord;
  error?: { code: string; message: string; statusCode: number };
} {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : ((req.headers['x-auth-token'] as string) || '').trim();

  // 1. Bearer Token Authentication
  if (token) {
    const payload = verifyAuthToken(token);
    if (!payload) {
      return {
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired or is invalid. Please sign in again.',
          statusCode: 401,
        },
      };
    }

    // Check database first to get authoritative live status instead of relying on token's potentially stale status
    const dbMember = memberService.getMemberById(payload.id) || memberService.getMemberByEmail(payload.email);
    if (dbMember) {
      return { member: dbMember };
    }

    // Hydrate / synchronize member in current serverless container
    const member = memberService.ensureMemberFromToken(payload);
    return { member };
  }

  // 2. Direct Header Authentication (Fallback)
  const userId = (req.headers['x-user-id'] as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || '';

  if (!userId && !userEmail) {
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in to access private educational features.',
        statusCode: 401,
      },
    };
  }

  const member =
    (userId ? memberService.getMemberById(userId) : undefined) ||
    (userEmail ? memberService.getMemberByEmail(userEmail) : undefined);

  if (!member) {
    return {
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Account not recognized. Please sign in or register to continue.',
        statusCode: 401,
      },
    };
  }

  return { member };
}

/**
 * Middleware that requires a valid authenticated user session.
 * Rejects unauthenticated requests with HTTP 401 Unauthorized.
 */
export const requireAuth = (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): void => {
  const resolved = resolveUserFromRequest(req);
  if (resolved.error) {
    res.status(resolved.error.statusCode).json({
      success: false,
      error: {
        code: resolved.error.code,
        message: resolved.error.message,
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  req.user = resolved.member;
  next();
};

/**
 * Middleware that strictly blocks pending, suspended, or rejected accounts.
 * Only verified/approved users and administrators are allowed to access protected features.
 */
export const requireApprovedUser = (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    const resolved = resolveUserFromRequest(req);
    if (resolved.error) {
      res.status(resolved.error.statusCode).json({
        success: false,
        error: {
          code: resolved.error.code,
          message: resolved.error.message,
        },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }
    req.user = resolved.member;
  }

  const user = req.user!;

  // Administrators always have full access
  if (user.role === 'admin' || user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    next();
    return;
  }

  // If approved or verified, grant access immediately
  if (isAccountApproved(user.verificationStatus)) {
    next();
    return;
  }

  // Check account verification and suspension status
  if (user.verificationStatus === 'pending') {
    res.status(403).json({
      success: false,
      error: {
        code: 'PENDING_APPROVAL',
        message:
          'Your account is currently awaiting approval from Administrator Muni (muni57575751@gmail.com). You cannot generate lessons or access interactive quizzes until approved.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  if (user.verificationStatus === 'suspended') {
    res.status(403).json({
      success: false,
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended by an administrator. Please contact support.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  if (user.verificationStatus === 'rejected') {
    res.status(403).json({
      success: false,
      error: {
        code: 'ACCOUNT_REJECTED',
        message: 'Your account registration was not approved by the administrator.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  next();
};
