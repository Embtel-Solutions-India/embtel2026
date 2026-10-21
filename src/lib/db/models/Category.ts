import mongoose, { model, models, Schema, type InferSchemaType } from 'mongoose';

// Port of blog-admin/server/models/Category.js on the same `categories` collection.
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    seo: { metaTitle: { type: String, default: '' }, metaDescription: { type: String, default: '' } },
  },
  { timestamps: true, collection: 'categories' },
);

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const Category = (models.Category as mongoose.Model<CategoryDoc>) ?? model<CategoryDoc>('Category', categorySchema);
