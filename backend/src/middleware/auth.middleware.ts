import { Request, Response, NextFunction } from 'express';
import { memberService } from '../services/member.service.js';
import type { MemberRecord } from '@ai-toon/shared';

export interface AuthenticatedUserRequest extends Request {
  user?: MemberRecord;
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
  const userId = (req.headers['x-user-id'] as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || '';

  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in to access private educational features.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const member =
    (userId ? memberService.getMemberById(userId) : undefined) ||
    (userEmail ? memberService.getMemberByEmail(userEmail) : undefined);

  if (!member) {
    res.status(401).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Account not recognized. Please sign in or register to continue.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  req.user = member;
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
  // If requireAuth has not already run, run the check
  if (!req.user) {
    const userId = (req.headers['x-user-id'] as string) || '';
    const userEmail = (req.headers['x-user-email'] as string) || '';

    if (!userId && !userEmail) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in to access private educational features.',
        },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const member =
      (userId ? memberService.getMemberById(userId) : undefined) ||
      (userEmail ? memberService.getMemberByEmail(userEmail) : undefined);

    if (!member) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Account not recognized. Please sign in or register to continue.',
        },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    req.user = member;
  }

  const user = req.user;

  // Administrators always have full access
  if (user.role === 'admin') {
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
          'Your account is currently awaiting approval from the Administrator (muni57575751@gmail.com). You cannot access story generation, quizzes, or personal learning tools until your account is approved.',
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

