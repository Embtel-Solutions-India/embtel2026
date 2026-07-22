const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    folder: { type: String, default: 'general', trim: true },
    width: { type: Number },
    height: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

mediaSchema.index({ filename: 'text', originalName: 'text', folder: 'text' });

module.exports = mongoose.model('Media', mediaSchema);
