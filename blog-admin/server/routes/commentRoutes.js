const express = require('express');
const commentController = require('../controllers/commentController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Public — visitors submit comments from the blog frontend.
router.post('/comments', commentController.createComment);

router.use(protect);

router.get('/comments', commentController.getComments);
router.patch('/comment/:id/approve', restrictTo('admin', 'editor'), commentController.approveComment);
router.patch('/comment/:id/reject', restrictTo('admin', 'editor'), commentController.rejectComment);
router.patch('/comment/:id/spam', restrictTo('admin', 'editor'), commentController.markAsSpam);
router.post('/comment/:id/reply', restrictTo('admin', 'editor'), commentController.replyToComment);
router.delete('/comment/:id', restrictTo('admin', 'editor'), commentController.deleteComment);

module.exports = router;
