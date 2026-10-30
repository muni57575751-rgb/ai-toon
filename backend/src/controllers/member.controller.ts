import { Request, Response } from 'express';
import { memberService } from '../services/member.service.js';
import { MemberSessionStatus } from '@ai-toon/shared';
import { resolveUserFromRequest } from '../middleware/auth.middleware.js';
import { signAuthToken } from '../services/token.service.js';

export const updateSession = (req: Request, res: Response): void => {
  const { userId, email, fullName, status } = req.body;

  if (!userId || !email) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: 'userId and email are required to update session status.',
      },
    });
    return;
  }

  const sessionStatus: MemberSessionStatus = status === 'logged_out' ? 'logged_out' : 'logged_in';
  const member = memberService.updateSessionStatus(userId, email, fullName, sessionStatus);

  res.json({
    success: true,
    data: member,
    meta: {
      message: `Session status updated to "${sessionStatus}".`,
      timestamp: new Date().toISOString(),
    },
  });
};

export const getMyProfile = (req: Request, res: Response): void => {
  const resolved = resolveUserFromRequest(req);
  const userId = resolved?.member?.id || (req.headers['x-user-id'] as string) || '';
  const userEmail = resolved?.member?.email || (req.headers['x-user-email'] as string) || '';

  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Sign-in authentication headers required.',
      },
    });
    return;
  }

  const member =
    (userId ? memberService.getMemberById(userId) : undefined) ||
    (userEmail ? memberService.getMemberByEmail(userEmail) : undefined);

  if (!member) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Member record not found in system.',
      },
    });
    return;
  }

  // Issue fresh token reflecting latest authoritative status from database
  const { token, expiresAt } = signAuthToken({
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    role: member.role,
    verificationStatus: member.verificationStatus,
  });

  res.json({
    success: true,
    data: {
      ...member,
      user: member,
      profile: member,
      token,
      expiresAt,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

export const updateMyProfile = (req: Request, res: Response): void => {
  const userId = (req.headers['x-user-id'] as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || '';

  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
    return;
  }

  const member =
    (userId ? memberService.getMemberById(userId) : undefined) ||
    (userEmail ? memberService.getMemberByEmail(userEmail) : undefined);

  if (!member) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Member record not found.' },
    });
    return;
  }

  const { fullName } = req.body;
  if (fullName && typeof fullName === 'string' && fullName.trim().length >= 2) {
    member.fullName = fullName.trim();
    member.lastActiveAt = new Date().toISOString();
  }

  // Security enforcement: Users CANNOT change their own role, verificationStatus, or permissions
  res.json({
    success: true,
    data: member,
    meta: { message: 'Profile updated successfully.', timestamp: new Date().toISOString() },
  });
};

export const deleteMyAccount = (req: Request, res: Response): void => {
  const userId = (req.headers['x-user-id'] as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || '';

  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
    return;
  }

  const member =
    (userId ? memberService.getMemberById(userId) : undefined) ||
    (userEmail ? memberService.getMemberByEmail(userEmail) : undefined);

  if (!member) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Member record not found.' },
    });
    return;
  }

  const result = memberService.deleteMember(member.id);
  if (!result.success) {
    res.status(400).json({ success: false, error: { code: 'DELETE_ERROR', message: result.error } });
    return;
  }

  res.json({
    success: true,
    meta: { message: 'Account deleted successfully.', timestamp: new Date().toISOString() },
  });
};
