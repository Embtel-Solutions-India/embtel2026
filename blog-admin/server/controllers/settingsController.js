const Settings = require('../models/Settings');
const catchAsync = require('../utils/catchAsync');

async function getOrCreateSettings() {
  let settings = await Settings.findOne({ key: 'site' });
  if (!settings) settings = await Settings.create({ key: 'site' });
  return settings;
}

// GET /api/settings
const getSettings = catchAsync(async (req, res) => {
  const settings = await getOrCreateSettings();
  res.status(200).json({ status: 'success', data: { settings } });
});

// PUT /api/settings
const updateSettings = catchAsync(async (req, res) => {
  const settings = await getOrCreateSettings();

  const fields = [
    'siteName',
    'logo',
    'favicon',
    'contactEmail',
    'googleAnalyticsId',
    'googleSearchConsoleVerification',
    'facebookPixelId',
    'metaVerification',
    'footerText',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) settings[f] = req.body[f];
  });

  if (req.body.socialLinks) {
    Object.assign(settings.socialLinks, req.body.socialLinks);
  }

  await settings.save();
  res.status(200).json({ status: 'success', data: { settings } });
});

module.exports = { getSettings, updateSettings, getOrCreateSettings };
