import { Router } from 'express';
import { bookSession, completeSession, createSession, getAvailableSessions } from '../controllers/sessionsController';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();
router.post('/', asyncHandler(createSession));
router.get('/available', asyncHandler(getAvailableSessions));
router.post('/:id/book', asyncHandler(bookSession));
router.patch('/:id/complete', asyncHandler(completeSession));
export default router;
