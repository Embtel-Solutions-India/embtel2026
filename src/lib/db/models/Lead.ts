import mongoose, { model, models, Schema, type InferSchemaType } from 'mongoose';

// Contact-form leads (new collection). Stored here even when the Formspree forward fails, so none are lost.
// No IP address is stored (only used transiently for rate limiting).
const leadSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String, required: true },
    businessName: { type: String, default: '' },
    service: { type: String, default: '' },
    message: { type: String, required: true },
    smsConsent: { type: Boolean, required: true },
    smsConsentAt: { type: Date },
    smsConsentVersion: { type: String, default: '' },
    sourcePage: { type: String, default: '' },
    utm: { source: String, medium: String, campaign: String, term: String, content: String },
    gclid: { type: String, default: '' },
    forwardStatus: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending', index: true },
    forwardError: { type: String, default: '' },
    forwardedAt: { type: Date },
  },
  { timestamps: true, collection: 'leads' },
);
leadSchema.index({ createdAt: -1 });

export type LeadDoc = InferSchemaType<typeof leadSchema>;
export const Lead = (models.Lead as mongoose.Model<LeadDoc>) ?? model<LeadDoc>('Lead', leadSchema);
