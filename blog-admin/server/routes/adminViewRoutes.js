const express = require('express');
const viewController = require('../controllers/viewController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Public admin pages (no auth yet)
router.get('/login', viewController.renderLogin);
router.get('/forgot-password', viewController.renderForgotPassword);
router.get('/reset-password/:token', viewController.renderResetPassword);

// Everything below requires a logged-in session
router.use(protect);

router.get('/dashboard', viewController.renderDashboard);

router.get('/blogs', viewController.renderBlogList);
router.get('/blogs/trash', restrictTo('admin', 'editor'), viewController.renderTrash);
router.get('/blogs/new', restrictTo('admin', 'editor'), viewController.renderBlogForm);
router.get('/blogs/:id/edit', restrictTo('admin', 'editor'), viewController.renderBlogForm);

router.get('/categories', viewController.renderCategories);
router.get('/tags', viewController.renderTags);
router.get('/comments', viewController.renderComments);
router.get('/media', viewController.renderMedia);
router.get('/settings', restrictTo('admin'), viewController.renderSettings);
router.get('/profile', viewController.renderProfile);
router.get('/users', restrictTo('admin'), viewController.renderUsers);

router.get('/', (req, res) => res.redirect('/admin/dashboard'));

module.exports = router;
