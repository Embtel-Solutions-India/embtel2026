const express = require('express');

const router = express.Router();

router.use(require('./publicApiRoutes'));
router.use(require('./authRoutes'));
router.use(require('./blogRoutes'));
router.use(require('./categoryRoutes'));
router.use(require('./tagRoutes'));
router.use(require('./commentRoutes'));
router.use(require('./mediaRoutes'));
router.use(require('./settingsRoutes'));
router.use(require('./dashboardRoutes'));
router.use(require('./userRoutes'));

module.exports = router;
