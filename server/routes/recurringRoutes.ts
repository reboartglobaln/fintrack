import { Router } from 'express';
import {
  getRecurringRules,
  createRecurringRule,
  toggleRecurringRule,
  deleteRecurringRule,
  processDueRecurring,
} from '../controllers/recurringController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getRecurringRules);
router.post('/', createRecurringRule);
router.patch('/:id/toggle', toggleRecurringRule);
router.delete('/:id', deleteRecurringRule);
router.post('/process', processDueRecurring);

export default router;
