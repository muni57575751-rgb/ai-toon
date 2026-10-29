import { Request, Response } from 'express';
import { memberService } from '../services/member.service.js';

export const login = (req: Request, res: Response): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: 'Email and password are required.',
      },
    });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1';
  const userAgent = (req.headers['user-agent'] as string) || 'Browser Client';
  let browser = 'Desktop Browser';
  if (/mobile/i.test(userAgent)) browser = 'Mobile Browser';
  else if (/tablet/i.test(userAgent)) browser = 'Tablet Browser';
  else if (/chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent)) browser = 'Safari';

  const result = memberService.authenticate(email, password, { ip, browser, userAgent });

  if (!result.success) {
    const statusCode =
      result.code === 'PENDING_APPROVAL' ||
      result.code === 'ACCOUNT_SUSPENDED' ||
      result.code === 'ACCOUNT_REJECTED'
        ? 403
        : 401;
    res.status(statusCode).json({
      success: false,
      error: {
        code: result.code || 'AUTH_ERROR',
        message: result.error || 'Authentication failed.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const member = result.member!;
  res.json({
    success: true,
    data: {
      user: {
        id: member.id,
        email: member.email,
        fullName: member.fullName,
        role: member.role,
        verificationStatus: member.verificationStatus,
        sessionStatus: member.sessionStatus,
      },
      profile: {
        id: member.id,
        email: member.email,
        fullName: member.fullName,
        role: member.role,
        verificationStatus: member.verificationStatus,
        sessionStatus: member.sessionStatus,
        createdAt: member.createdAt,
        lastLoginAt: member.lastLoginAt,
        lastActiveAt: member.lastActiveAt,
      },
    },
    meta: {
      message: 'Logged in successfully.',
      timestamp: new Date().toISOString(),
    },
  });
};

export const register = (req: Request, res: Response): void => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: 'Name, email, and password are required for registration.',
      },
    });
    return;
  }

  const result = memberService.register(name, email, password);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: result.error || 'Registration failed.',
      },
    });
    return;
  }

  const member = result.member!;
  const userPayload = {
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    role: member.role,
    verificationStatus: member.verificationStatus,
    sessionStatus: member.sessionStatus,
  };

  res.status(201).json({
    success: true,
    data: {
      user: userPayload,
      member: userPayload,
      pendingApproval: result.pendingApproval,
      notification: result.notification,
    },
    meta: {
      message: result.pendingApproval
        ? 'Account registered successfully. Notification dispatched to Administrator for approval.'
        : 'Account created and verified.',
      timestamp: new Date().toISOString(),
    },
  });
};

export const logout = (req: Request, res: Response): void => {
  const userId = (req.headers['x-user-id'] as string) || req.body?.userId;
  const userEmail = (req.headers['x-user-email'] as string) || req.body?.email;

  if (userId || userEmail) {
    const member =
      (userId ? memberService.getMemberById(userId) : undefined) ||
      (userEmail ? memberService.getMemberByEmail(userEmail) : undefined);
    if (member) {
      member.sessionStatus = 'logged_out';
      member.lastActiveAt = new Date().toISOString();
    }
  }

  res.json({
    success: true,
    meta: {
      message: 'Logged out successfully.',
      timestamp: new Date().toISOString(),
    },
  });
};
