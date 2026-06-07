const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const auth = require('../middlewares/auth');

router.get('/', auth, categoryController.getCategories);
router.post('/', auth, categoryController.createCategory);
router.delete('/:id', auth, categoryController.deleteCategory);

module.exports = router;
