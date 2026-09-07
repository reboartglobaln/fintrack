import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transactionController';
import { authenticateJWT } from '../middleware/auth';
import { validateTransaction } from '../middleware/validator';

const router = Router();

// All transaction routes are protected by JWT
router.use(authenticateJWT);

router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.post('/', validateTransaction, createTransaction);
router.put('/:id', validateTransaction, updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
