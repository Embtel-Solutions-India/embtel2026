import mongoose, { model, models, Schema } from 'mongoose';

// Latest Search Console snapshot (new collection): one document, replaced by each daily sync.
// Rows are capped at 5 000 per period, which keeps the document far below Mongo's 16 MB limit.
const rowSchema = new Schema({ query: String, page: String, clicks: Number, impressions: Number, position: Number }, { _id: false });
const gscCacheSchema = new Schema(
  {
    key: { type: String, default: 'latest', unique: true },
    site: String,
    currentRange: { start: String, end: String },
    previousRange: { start: String, end: String },
    current: { type: [rowSchema], default: [] },
    previous: { type: [rowSchema], default: [] },
    syncedAt: Date,
  },
  { collection: 'gsccache' },
);

export type GscRow = { query: string; page: string; clicks: number; impressions: number; position: number };
export const GscCache = (models.GscCache as mongoose.Model<Record<string, unknown>>) ?? model('GscCache', gscCacheSchema);
