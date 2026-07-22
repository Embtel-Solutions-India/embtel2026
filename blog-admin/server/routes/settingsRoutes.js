const express = require('express');
const settingsController = require('../controllers/settingsController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/settings', settingsController.getSettings);
router.put('/settings', restrictTo('admin'), settingsController.updateSettings);

module.exports = router;
