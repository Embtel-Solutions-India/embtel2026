module.exports = function notFound(req, res) {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ status: 'fail', message: `Route not found: ${req.originalUrl}` });
  }
  return res.status(404).render('errors/404', { title: 'Page Not Found', layout: false });
};
