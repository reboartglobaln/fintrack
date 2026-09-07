import { Router } from 'express';
import {
  getSummary,
  getTrend,
  getCategoryBreakdown,
  exportCSV,
} from '../controllers/reportController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/summary', getSummary);
router.get('/trend', getTrend);
router.get('/breakdown', getCategoryBreakdown);
router.get('/export/csv', exportCSV);

export default router;
