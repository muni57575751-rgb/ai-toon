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

/**
 * Notifications endpoints for Admin Portal
 */
export const getNotifications = (_req: AuthenticatedAdminRequest, res: Response): void => {
  const notifications = memberService.getNotifications();
  const stats = memberService.getStats();

  res.json({
    success: true,
    data: {
      notifications,
      stats,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

export const approveMember = (req: AuthenticatedAdminRequest, res: Response): void => {
  const id = getParamId(req.params.id);
  const { role } = req.body;

  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_ID', message: 'Target member ID or notification ID is required.' },
    });
    return;
  }

  const targetRole = role === 'admin' ? 'admin' : 'user';
  const result = memberService.approveMember(id, targetRole, req.adminMember?.email);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'APPROVAL_ERROR',
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
      notification: result.notification,
      stats: memberService.getStats(),
    },
    meta: {
      message: `Account approved as "${targetRole}".`,
      timestamp: new Date().toISOString(),
    },
  });
};

export const rejectMember = (req: AuthenticatedAdminRequest, res: Response): void => {
  const id = getParamId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_ID', message: 'Target member ID or notification ID is required.' },
    });
    return;
  }

  const result = memberService.rejectMember(id, req.adminMember?.email);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'REJECTION_ERROR',
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
      notification: result.notification,
      stats: memberService.getStats(),
    },
    meta: {
      message: 'Account registration rejected.',
      timestamp: new Date().toISOString(),
    },
  });
};

export const approveNotification = (req: AuthenticatedAdminRequest, res: Response): void => {
  return approveMember(req, res);
};

export const rejectNotification = (req: AuthenticatedAdminRequest, res: Response): void => {
  return rejectMember(req, res);
};

export const resetAllAccounts = (_req: AuthenticatedAdminRequest, res: Response): void => {
  memberService.resetAllExceptMasterAdmin();
  res.json({
    success: true,
    data: {
      members: memberService.getAllMembers(),
      stats: memberService.getStats(),
    },
    meta: {
      message: 'All accounts except the Master Admin have been cleared.',
      timestamp: new Date().toISOString(),
    },
  });
};

export const suspendMember = (req: AuthenticatedAdminRequest, res: Response): void => {
  const id = getParamId(req.params.id);
  const { reason } = req.body;
  const result = memberService.suspendMember(id, reason, req.adminMember?.email);

  if (!result.success) {
    res.status(400).json({ success: false, error: { code: 'SUSPEND_ERROR', message: result.error } });
    return;
  }

  res.json({
    success: true,
    data: { member: result.member, stats: memberService.getStats() },
    meta: { message: 'Member account suspended.', timestamp: new Date().toISOString() },
  });
};

export const reactivateMember = (req: AuthenticatedAdminRequest, res: Response): void => {
  const id = getParamId(req.params.id);
  const result = memberService.reactivateMember(id, req.adminMember?.email);

  if (!result.success) {
    res.status(400).json({ success: false, error: { code: 'REACTIVATE_ERROR', message: result.error } });
    return;
  }

  res.json({
    success: true,
    data: { member: result.member, stats: memberService.getStats() },
    meta: { message: 'Member account reactivated.', timestamp: new Date().toISOString() },
  });
};

export const getLoginAudit = (_req: AuthenticatedAdminRequest, res: Response): void => {
  const logs = memberService.getLoginAuditLogs(100);
  res.json({
    success: true,
    data: logs,
    meta: { total: logs.length, timestamp: new Date().toISOString() },
  });
};

export const getAdminAudit = (_req: AuthenticatedAdminRequest, res: Response): void => {
  const logs = memberService.getAdminAuditLogs(100);
  res.json({
    success: true,
    data: logs,
    meta: { total: logs.length, timestamp: new Date().toISOString() },
  });
};

export const getSettings = (_req: AuthenticatedAdminRequest, res: Response): void => {
  const settings = memberService.getSettings();
  res.json({
    success: true,
    data: settings,
    meta: { timestamp: new Date().toISOString() },
  });
};

export const updateSettings = (req: AuthenticatedAdminRequest, res: Response): void => {
  const updated = memberService.updateSettings(req.body, req.adminMember?.email);
  res.json({
    success: true,
    data: updated,
    meta: { message: 'System settings updated successfully.', timestamp: new Date().toISOString() },
  });
};

export const exportReport = (_req: AuthenticatedAdminRequest, res: Response): void => {
  const report = {
    generatedAt: new Date().toISOString(),
    stats: memberService.getStats(),
    members: memberService.getAllMembers(),
    recentLoginAudit: memberService.getLoginAuditLogs(50),
    recentAdminAudit: memberService.getAdminAuditLogs(50),
    settings: memberService.getSettings(),
  };

  res.json({
    success: true,
    data: report,
    meta: { timestamp: new Date().toISOString() },
  });
};


export const getAllLessons = (_req: AuthenticatedAdminRequest, res: Response): void => {
  const lessons = memberService.getAllUserStories();
  res.json({
    success: true,
    data: lessons,
    meta: {
      total: lessons.length,
      timestamp: new Date().toISOString(),
    },
  });
};

export const getAllQuizzes = (_req: AuthenticatedAdminRequest, res: Response): void => {
  const quizzes = memberService.getAllQuizAttempts();
  res.json({
    success: true,
    data: quizzes,
    meta: {
      total: quizzes.length,
      timestamp: new Date().toISOString(),
    },
  });
};
