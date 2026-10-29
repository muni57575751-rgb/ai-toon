import { Router } from 'express';
import { updateSession, getMyProfile } from '../controllers/member.controller.js';

const memberRouter = Router();

// Member session presence & profile sync endpoints
memberRouter.post('/session', updateSession);
memberRouter.get('/me', getMyProfile);

export default memberRouter;

