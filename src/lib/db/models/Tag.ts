import mongoose, { model, models, Schema, type InferSchemaType } from 'mongoose';

// Port of blog-admin/server/models/Tag.js on the same `tags` collection, plus an optional link to a
// service page (spec 6.4: related services on posts by tag→service mapping).
const tagSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    serviceSlug: { type: String, default: '' },
  },
  { timestamps: true, collection: 'tags' },
);

export type TagDoc = InferSchemaType<typeof tagSchema>;
export const Tag = (models.Tag as mongoose.Model<TagDoc>) ?? model<TagDoc>('Tag', tagSchema);
