import { Router } from 'express';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  getMembers,
  getStats,
  updateMemberRole,
  verifyMember,
  deleteMember,
  getNotifications,
  approveNotification,
  rejectNotification,
  resetAllAccounts,
  suspendMember,
  reactivateMember,
  getLoginAudit,
  getAdminAudit,
  getSettings,
  updateSettings,
  exportReport,
  getAllLessons,
  getAllQuizzes,
} from '../controllers/admin.controller.js';

const adminRouter = Router();

// Apply requireAdmin middleware to ALL admin routes
adminRouter.use(requireAdmin);

// Member management endpoints
adminRouter.get('/members', getMembers);
adminRouter.get('/stats', getStats);
adminRouter.patch('/members/:id/role', updateMemberRole);
adminRouter.patch('/members/:id/verify', verifyMember);
adminRouter.post('/members/:id/suspend', suspendMember);
adminRouter.post('/members/:id/reactivate', reactivateMember);
adminRouter.delete('/members/:id', deleteMember);

// Notifications & approvals endpoints
adminRouter.get('/notifications', getNotifications);
adminRouter.post('/notifications/:id/approve', approveNotification);
adminRouter.post('/notifications/:id/reject', rejectNotification);

// Content & Learning Management
adminRouter.get('/lessons', getAllLessons);
adminRouter.get('/quizzes', getAllQuizzes);

// System Audit Trails
adminRouter.get('/audit/logins', getLoginAudit);
adminRouter.get('/audit/actions', getAdminAudit);

// System Settings & Reporting
adminRouter.get('/settings', getSettings);
adminRouter.patch('/settings', updateSettings);
adminRouter.get('/export', exportReport);

// Purge / Reset system accounts (except Master Admin)
adminRouter.post('/members/reset', resetAllAccounts);

export default adminRouter;
