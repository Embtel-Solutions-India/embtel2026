const express = require('express');
const publicController = require('../controllers/publicController');

const router = express.Router();

// Unauthenticated, read-only, published-only — safe for cross-origin fetch()
// from the embtel-final marketing site (or any other consumer).
router.get('/public/blogs', publicController.getPublicBlogs);
router.get('/public/blog/:slug', publicController.getPublicBlogBySlug);
router.get('/public/categories', publicController.getPublicCategories);

module.exports = router;
