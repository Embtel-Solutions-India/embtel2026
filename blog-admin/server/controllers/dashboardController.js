const catchAsync = require('../utils/catchAsync');
const blogService = require('../services/blogService');

// GET /api/dashboard/stats
const getStats = catchAsync(async (req, res) => {
  const stats = await blogService.getDashboardStats();
  res.status(200).json({ status: 'success', data: stats });
});

module.exports = { getStats };
