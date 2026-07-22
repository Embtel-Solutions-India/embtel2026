const express = require('express');
const tagController = require('../controllers/tagController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/tags', tagController.getTags);
router.post('/tag', restrictTo('admin', 'editor'), tagController.createTag);
router.put('/tag/:id', restrictTo('admin', 'editor'), tagController.updateTag);
router.delete('/tag/:id', restrictTo('admin'), tagController.deleteTag);

module.exports = router;
