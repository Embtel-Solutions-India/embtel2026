import mongoose, { model, models, Schema, type InferSchemaType } from 'mongoose';

// Port of blog-admin/server/models/Comment.js on the same `comments` collection. Read-only in the new
// admin (no public comments, spec non-goal).
const commentSchema = new Schema(
  {
    blog: { type: Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    content: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'spam'], default: 'pending', index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true, collection: 'comments' },
);

export type CommentDoc = InferSchemaType<typeof commentSchema>;
export const Comment = (models.Comment as mongoose.Model<CommentDoc>) ?? model<CommentDoc>('Comment', commentSchema);
