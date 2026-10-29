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

  const result = memberService.authenticate(email, password);

  if (!result.success) {
    const statusCode = result.code === 'PENDING_APPROVAL' ? 403 : 401;
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
        message: 'Name, email, and password are required.',
      },
    });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({
      success: false,
      error: {
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 6 characters.',
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

  res.status(201).json({
    success: true,
    data: {
      pendingApproval: true,
      member: {
        id: result.member?.id,
        email: result.member?.email,
        fullName: result.member?.fullName,
        role: result.member?.role,
        verificationStatus: result.member?.verificationStatus,
      },
      message:
        'Account created successfully! Your account is awaiting approval from the Administrator (muni57575751@gmail.com). A notification has been dispatched to the admin portal.',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

export const logout = (req: Request, res: Response): void => {
  const { userId, email } = req.body;

  if (userId || email) {
    memberService.updateSessionStatus(userId || '', email || '', undefined, 'logged_out');
  }

  res.json({
    success: true,
    meta: {
      message: 'Logged out successfully.',
      timestamp: new Date().toISOString(),
    },
  });
};
