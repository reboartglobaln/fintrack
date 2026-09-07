import { Router } from 'express';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from '../controllers/budgetController';
import { authenticateJWT } from '../middleware/auth';
import { validateBudget } from '../middleware/validator';

const router = Router();

router.use(authenticateJWT);

router.get('/', getBudgets);
router.post('/', validateBudget, createBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
