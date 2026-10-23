import mongoose, { model, models, Schema } from 'mongoose';

// Blocks are validated by Zod (lib/content/blocks.ts) on write and again on read.
const pageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    type: { type: String, enum: ['standard', 'service', 'industry', 'landing', 'legal'], default: 'standard' },
    theme: { accent: { type: String, default: '#1A6BFF' } },
    blocks: { type: [Schema.Types.Mixed], default: [] },
    seo: {
      metaTitle: String,
      metaDescription: String,
      ogImage: String,
      noindex: { type: Boolean, default: false },
    },
    locked: { type: Boolean, default: false },
    publishedAt: Date,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'pages' },
);

export const PageModel = (models.Page as mongoose.Model<Record<string, unknown>>) ?? model('Page', pageSchema);
