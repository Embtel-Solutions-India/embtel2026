import mongoose, { model, models, Schema, type InferSchemaType } from 'mongoose';

// Port of blog-admin/server/models/Media.js on the same `media` collection; `alt` is new (additive).
// `filename` is the S3 object key (legacy convention).
const mediaSchema = new Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    folder: { type: String, default: 'general', trim: true },
    width: { type: Number },
    height: { type: Number },
    alt: { type: String, default: '' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'media' },
);

mediaSchema.index({ filename: 'text', originalName: 'text', folder: 'text' });

export type MediaDoc = InferSchemaType<typeof mediaSchema>;
export const Media = (models.Media as mongoose.Model<MediaDoc>) ?? model<MediaDoc>('Media', mediaSchema);
