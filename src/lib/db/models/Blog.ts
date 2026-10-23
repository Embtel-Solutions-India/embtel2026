import mongoose, { model, models, Schema, type InferSchemaType } from 'mongoose';

// Port of blog-admin/server/models/Blog.js on the same `blogs` collection. Legacy fields and indexes
// are unchanged (the legacy admin keeps working until cutover); new fields are additive.
const gallerySchema = new Schema({ url: { type: String, required: true }, alt: { type: String, default: '' } }, { _id: false });

const blogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    shortDescription: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: String, required: true },

    featuredImage: { type: String, default: '' },
    imageAltText: { type: String, default: '' },
    imageCaption: { type: String, default: '' },
    galleryImages: { type: [gallerySchema], default: [] },

    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    // Optional now: imported posts have only a byline name (authorName).
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: '' },

    readingTime: { type: Number, default: 1 },
    featured: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },

    status: { type: String, enum: ['draft', 'published', 'scheduled'], default: 'draft', index: true },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    lastReviewedAt: { type: Date },

    // AEO / GEO
    faqs: { type: [new Schema({ q: { type: String, required: true }, a: { type: String, required: true } }, { _id: false })], default: [] },
    keyTakeaways: { type: [String], default: [] },
    focusKeyword: { type: String, default: '' },
    secondaryKeywords: { type: [String], default: [] },
    sources: { type: [new Schema({ title: { type: String, required: true }, url: { type: String, required: true } }, { _id: false })], default: [] },

    seo: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      keywords: { type: [String], default: [] },
      canonicalUrl: { type: String, default: '' },
      ogImage: { type: String, default: '' },
      schemaJson: { type: String, default: '' },
      noindex: { type: Boolean, default: false },
    },

    views: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true, collection: 'blogs' },
);

blogSchema.index({ title: 'text', shortDescription: 'text', content: 'text' });
blogSchema.index({ status: 1, isDeleted: 1, publishedAt: -1 });

// Legacy behaviour: soft-deleted posts are excluded unless a query asks for them explicitly.
blogSchema.pre(/^find/, function excludeSoftDeleted(this: mongoose.Query<unknown, unknown>, next) {
  if (this.getOptions().includeDeleted) return next();
  if (this.getQuery().isDeleted === undefined) this.where({ isDeleted: { $ne: true } });
  next();
});

export type BlogDoc = InferSchemaType<typeof blogSchema>;
export const Blog = (models.Blog as mongoose.Model<BlogDoc>) ?? model<BlogDoc>('Blog', blogSchema);
