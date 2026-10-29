import { Router } from 'express';
import {
  updateSession,
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
} from '../controllers/member.controller.js';

const memberRouter = Router();

// POST /api/members/session -> update session presence (logged_in / logged_out)
memberRouter.post('/session', updateSession);

// GET /api/members/profile and /api/members/me -> get authenticated member profile
memberRouter.get('/profile', getMyProfile);
memberRouter.get('/me', getMyProfile);

// PATCH /api/members/profile -> update personal profile
memberRouter.patch('/profile', updateMyProfile);

// POST /api/members/delete-account -> delete user's own account
memberRouter.post('/delete-account', deleteMyAccount);

export default memberRouter;
