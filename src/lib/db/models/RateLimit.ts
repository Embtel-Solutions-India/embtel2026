import { type Model, Schema, model, models } from 'mongoose';

export interface IRateLimit {
  key: string;
  count: number;
  expiresAt: Date;
}

const schema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 }, // TTL: Mongo deletes expired windows
});

export const RateLimit: Model<IRateLimit> =
  (models.RateLimit as Model<IRateLimit> | undefined) ??
  model<IRateLimit>('RateLimit', schema, 'ratelimits');
