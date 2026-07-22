const express = require('express');
const { body } = require('express-validator');
const blogController = require('../controllers/blogController');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/blogs', blogController.getBlogs);
router.get('/blogs/trash', restrictTo('admin', 'editor'), blogController.getTrash);
router.post('/blogs/bulk', restrictTo('admin', 'editor'), blogController.bulkAction);
router.get('/blog/:id', blogController.getBlog);

router.post(
  '/blog',
  restrictTo('admin', 'editor'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('shortDescription').notEmpty().withMessage('Short description is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('category').notEmpty().withMessage('Category is required'),
  ],
  validate,
  blogController.createBlog
);

router.put('/blog/:id', restrictTo('admin', 'editor'), blogController.updateBlog);
router.delete('/blog/:id', restrictTo('admin', 'editor'), blogController.deleteBlog);
router.delete('/blog/:id/permanent', restrictTo('admin'), blogController.permanentlyDeleteBlog);
router.patch('/blog/:id/restore', restrictTo('admin', 'editor'), blogController.restoreBlog);
router.post('/blog/:id/duplicate', restrictTo('admin', 'editor'), blogController.duplicateBlog);
router.patch('/blog/:id/pin', restrictTo('admin', 'editor'), blogController.togglePin);

module.exports = router;
