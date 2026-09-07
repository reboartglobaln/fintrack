import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import { authenticateJWT } from '../middleware/auth';
import { validateCategory } from '../middleware/validator';

const router = Router();

router.use(authenticateJWT);

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', validateCategory, createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
