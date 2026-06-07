const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middlewares/auth');

router.get('/summary', auth, analyticsController.getSummary);
router.get('/categories', auth, analyticsController.getExpensesByCategory);
router.get('/trend', auth, analyticsController.getMonthlyTrend);

module.exports = router;
