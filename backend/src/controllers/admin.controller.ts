import { Response } from 'express';
import { AuthenticatedAdminRequest } from '../middleware/admin.middleware.js';
import { memberService } from '../services/member.service.js';
import { MemberSessionStatus, UserRole, MemberVerificationStatus } from '@ai-toon/shared';

const getParamId = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

export const getMembers = (req: AuthenticatedAdminRequest, res: Response): void => {
  const { search, status, role, verificationStatus } = req.query;

  const members = memberService.getAllMembers({
    search: typeof search === 'string' ? search : undefined,
    status: typeof status === 'string' ? (status as MemberSessionStatus) : undefined,
    role: typeof role === 'string' ? (role as UserRole) : undefined,
    verificationStatus:
      typeof verificationStatus === 'string'
        ? (verificationStatus as MemberVerificationStatus)
        : undefined,
  });

  const stats = memberService.getStats();

  res.json({
    success: true,
    data: {
      members,
      stats,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

export const getStats = (_req: AuthenticatedAdminRequest, res: Response): void => {
  const stats = memberService.getStats();
  res.json({
    success: true,
    data: stats,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

export const updateMemberRole = (req: AuthenticatedAdminRequest, res: Response): void => {
  const id = getParamId(req.params.id);
  const { role } = req.body;

  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_ID', message: 'Target member ID is required.' },
    });
    return;
  }

  if (!role || (role !== 'user' && role !== 'admin')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ROLE',
        message: 'Invalid role provided. Role must be either "user" or "admin".',
      },
    });
    return;
  }

  const result = memberService.setMemberRole(id, role as UserRole, req.adminMember?.email);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'ADMIN_LIMIT_EXCEEDED',
        message: result.error,
      },
      meta: {
        stats: memberService.getStats(),
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      member: result.member,
      stats: memberService.getStats(),
    },
    meta: {
      message: `Member role updated to "${role}".`,
      timestamp: new Date().toISOString(),
    },
  });
};

export const verifyMember = (req: AuthenticatedAdminRequest, res: Response): void => {
  const id = getParamId(req.params.id);
  const { verificationStatus, role } = req.body;

  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_ID', message: 'Target member ID is required.' },
    });
    return;
  }

  if (
    !verificationStatus ||
    !['verified', 'pending', 'rejected'].includes(verificationStatus)
  ) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_VERIFICATION_STATUS',
        message:
          'Invalid verification status. Must be one of: "verified", "pending", "rejected".',
      },
    });
    return;
  }

  if (role && role !== 'user' && role !== 'admin') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ROLE',
        message: 'Invalid role. Must be either "user" or "admin".',
      },
    });
    return;
  }

  const result = memberService.verifyMember(
    id,
    verificationStatus as MemberVerificationStatus,
    role as UserRole | undefined,
    req.adminMember?.email
  );

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: result.error,
      },
      meta: {
        stats: memberService.getStats(),
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      member: result.member,
      stats: memberService.getStats(),
    },
    meta: {
      message: `Account status updated to "${verificationStatus}"${role ? ` with role "${role}"` : ''}.`,
      timestamp: new Date().toISOString(),
    },
  });
};

export const deleteMember = (req: AuthenticatedAdminRequest, res: Response): void => {
  const id = getParamId(req.params.id);
  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_ID', message: 'Target member ID is required.' },
    });
    return;
  }

  const result = memberService.deleteMember(id);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'CANNOT_DELETE_MEMBER',
        message: result.error,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id,
      stats: memberService.getStats(),
    },
    meta: {
      message: 'Member removed successfully.',
      timestamp: new Date().toISOString(),
    },
  });
};
