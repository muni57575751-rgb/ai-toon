import { Router } from 'express';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  getMembers,
  getStats,
  updateMemberRole,
  verifyMember,
  deleteMember,
} from '../controllers/admin.controller.js';

const adminRouter = Router();

// Apply requireAdmin middleware to ALL admin routes
adminRouter.use(requireAdmin);

// Admin member management endpoints
adminRouter.get('/members', getMembers);
adminRouter.get('/stats', getStats);
adminRouter.patch('/members/:id/role', updateMemberRole);
adminRouter.patch('/members/:id/verify', verifyMember);
adminRouter.delete('/members/:id', deleteMember);

export default adminRouter;

