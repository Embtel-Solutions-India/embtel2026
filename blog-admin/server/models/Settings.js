const mongoose = require('mongoose');

// Singleton document — always upserted/read via findOne({ key: 'site' }).
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'site', unique: true },
    siteName: { type: String, default: 'My Blog' },
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    googleAnalyticsId: { type: String, default: '' },
    googleSearchConsoleVerification: { type: String, default: '' },
    facebookPixelId: { type: String, default: '' },
    metaVerification: { type: String, default: '' },
    socialLinks: {
      facebook: { type: String, default: '' },
      twitter: { type: String, default: '' },
      instagram: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    footerText: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
