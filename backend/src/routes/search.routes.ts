import { Router } from 'express';
import { webSearchController } from '../controllers/search.controller.js';

const searchRouter = Router();

// GET /api/search?q=...&page=1&limit=8
searchRouter.get('/', webSearchController);

export default searchRouter;

