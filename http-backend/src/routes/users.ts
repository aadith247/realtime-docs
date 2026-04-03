import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getCurrentUser } from '../controllers/userController';

const router = Router();

router.use(authMiddleware);

router.get('/me', getCurrentUser);

export default router;
