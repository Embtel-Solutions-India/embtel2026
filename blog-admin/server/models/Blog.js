const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    shortDescription: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: String, required: true },

    featuredImage: { type: String, default: '' },
    imageAltText: { type: String, default: '' },
    imageCaption: { type: String, default: '' },
    galleryImages: { type: [gallerySchema], default: [] },

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    readingTime: { type: Number, default: 1 },
    featured: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled'],
      default: 'draft',
      index: true,
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },

    // SEO
    seo: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      keywords: { type: [String], default: [] },
      canonicalUrl: { type: String, default: '' },
      ogImage: { type: String, default: '' },
      schemaJson: { type: String, default: '' },
    },

    views: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

blogSchema.index({ title: 'text', shortDescription: 'text', content: 'text' });
blogSchema.index({ status: 1, isDeleted: 1, publishedAt: -1 });

// Excludes soft-deleted docs from normal find/findOne queries unless explicitly overridden
// with Blog.findWithDeleted() / Blog.find().where('isDeleted').equals(true).
blogSchema.pre(/^find/, function excludeSoftDeleted(next) {
  if (this.getOptions().includeDeleted) return next();
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

blogSchema.statics.findWithDeleted = function findWithDeleted(filter = {}) {
  return this.find(filter).setOptions({ includeDeleted: true });
};

module.exports = mongoose.model('Blog', blogSchema);
