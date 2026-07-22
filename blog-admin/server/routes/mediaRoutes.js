const express = require('express');
const mediaController = require('../controllers/mediaController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/media', mediaController.getMedia);
router.post('/media/upload', restrictTo('admin', 'editor'), upload.single('file'), mediaController.uploadMedia);
router.patch('/media/:id/rename', restrictTo('admin', 'editor'), mediaController.renameMedia);
router.delete('/media/:id', restrictTo('admin', 'editor'), mediaController.deleteMedia);

module.exports = router;
