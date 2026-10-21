import mongoose, { model, models, Schema } from 'mongoose';

// Singleton { key: 'site' } on the legacy `settings` collection. Legacy fields (siteName, socialLinks,
// footerText, …) are kept as-is; the public site reads only the fields validated in lib/content/settings.ts.
const settingsSchema = new Schema(
  {
    key: { type: String, default: 'site', unique: true },
    organization: { type: Schema.Types.Mixed },
    logo: { type: String },
    headerNav: { type: Schema.Types.Mixed },
    headerCta: { type: Schema.Types.Mixed },
    footer: { type: Schema.Types.Mixed },
    social: { type: Schema.Types.Mixed },
    whatsapp: { type: Schema.Types.Mixed },
    integrations: { type: Schema.Types.Mixed },
    defaultOgImage: { type: String },
  },
  { timestamps: true, strict: false, collection: 'settings' },
);

export const Settings = (models.Settings as mongoose.Model<Record<string, unknown>>) ?? model('Settings', settingsSchema);
