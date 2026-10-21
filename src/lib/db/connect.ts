import mongoose from 'mongoose';
import { env } from '@/lib/env';

const g = globalThis as typeof globalThis & { __mongoose?: Promise<typeof mongoose> };

// `uri` only applies to the first successful connect; later calls reuse the cached connection.
// Cached on globalThis so hot reload / warm serverless invocations reuse one connection.
export function connectDB(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (!g.__mongoose) {
    mongoose.set('strictQuery', true);
    g.__mongoose = mongoose.connect(uri).catch((e) => {
      g.__mongoose = undefined; // don't cache a rejection
      throw e;
    });
  }
  return g.__mongoose;
}
