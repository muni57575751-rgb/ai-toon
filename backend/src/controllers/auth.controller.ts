import { Request, Response } from 'express';
import { memberService, MASTER_ADMIN_EMAIL } from '../services/member.service.js';
import { signAuthToken, verifyAuthToken } from '../services/token.service.js';

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
      token,
      expiresAt,
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

  const { token, expiresAt } = signAuthToken({
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    role: member.role,
    verificationStatus: member.verificationStatus,
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      expiresAt,
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

export const refresh = (req: Request, res: Response): void => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.body?.token as string);

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Session token required for refresh.' },
    });
    return;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please sign in again.' },
    });
    return;
  }

  // Retrieve current live member record to sync any status changes
  const member = memberService.getMemberById(payload.id) || memberService.getMemberByEmail(payload.email);
  const currentRole = member ? member.role : payload.role;
  const currentStatus = member ? member.verificationStatus : payload.verificationStatus;
  const currentName = member ? member.fullName : payload.fullName;

  // If account has been suspended or rejected, block refresh
  if (currentStatus === 'suspended') {
    res.status(403).json({
      success: false,
      error: { code: 'ACCOUNT_SUSPENDED', message: 'Account has been suspended by an administrator.' },
    });
    return;
  }

  const newToken = signAuthToken({
    id: payload.id,
    email: payload.email,
    fullName: currentName,
    role: currentRole,
    verificationStatus: currentStatus,
  });

  res.json({
    success: true,
    data: {
      token: newToken.token,
      expiresAt: newToken.expiresAt,
      user: {
        id: payload.id,
        email: payload.email,
        fullName: currentName,
        role: currentRole,
        verificationStatus: currentStatus,
      },
    },
    meta: {
      message: 'Session refreshed successfully.',
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
