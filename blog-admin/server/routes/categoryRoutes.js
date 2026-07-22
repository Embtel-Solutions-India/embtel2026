const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/categories', categoryController.getCategories);
router.get('/category/:id', categoryController.getCategory);
router.post('/category', restrictTo('admin', 'editor'), categoryController.createCategory);
router.put('/category/:id', restrictTo('admin', 'editor'), categoryController.updateCategory);
router.delete('/category/:id', restrictTo('admin'), categoryController.deleteCategory);

module.exports = router;
