import { Request, Response } from 'express';
import { memberService } from '../services/member.service.js';
import { MemberSessionStatus } from '@ai-toon/shared';

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
  const userId = (req.headers['x-user-id'] as string) || '';
  const userEmail = (req.headers['x-user-email'] as string) || '';

  if (!userId && !userEmail) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Sign-in identity header required.',
      },
    });
    return;
  }

  const member = (userId ? memberService.getMemberById(userId) : undefined) ||
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

  res.json({
    success: true,
    data: member,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

