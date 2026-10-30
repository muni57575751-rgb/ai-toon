import { Router } from 'express';
import { login, register, logout, refresh } from '../controllers/auth.controller.js';

const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);

export default authRouter;
